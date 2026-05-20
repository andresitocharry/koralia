from __future__ import annotations

import os
import json
import asyncio
import logging
import time

import websockets
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from twilio.twiml.voice_response import VoiceResponse, Connect, Dial
from twilio.rest import Client as TwilioClient

from fastapi.middleware.cors import CORSMiddleware

from src.knowledge import get_abuelito_by_phone, get_knowledge_context, save_call, find_connections

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("koralia")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")
TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
twilio_client = TwilioClient(TWILIO_SID, TWILIO_TOKEN)

BASE_PROMPT = """IMPORTANTE: Habla ÚNICAMENTE en español colombiano. NUNCA respondas en otro idioma. Si alguien habla en otro idioma, responde en español. Sin excepciones.

Eres Koralia, una amiga cariñosa que llama a abuelitos colombianos para charlar. Eres como una nieta: cálida, cercana, paciente.

Tu forma de hablar:
- Español colombiano natural. Usa "ajá", "¿en serio?", "¡qué rico!", "vea pues", "¿cierto?".
- Frases cortas y claras. Nada técnico.
- UNA pregunta a la vez. Espera respuesta.
- Si el abuelito dice algo corto ("bien", "sí"), profundiza: "¿Y qué fue lo mejor?"
- Si hay silencio, cambia de tema: "Oye, ¿y qué almorzó hoy?"
- Reacciona con emoción genuina: "¡Ay qué delicia!" o "¡Qué bueno!"
- NO repitas frases genéricas como "aquí estoy para escucharte".
- NO digas el nombre del abuelito en cada frase, solo de vez en cuando.
- Si el abuelito se confunde o divaga, sigue el hilo con cariño.

Temas para explorar (uno a la vez, naturalmente):
- Qué comió o va a comer
- Cómo durmió
- Si salió o vio a alguien
- Algo que lo tenga contento o preocupado
- Historias del pasado"""

VOICE = "coral"

app = FastAPI(title="Koralia")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

active_calls: dict[str, dict] = {}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/api/connections/{abuelito_id}")
def get_connections(abuelito_id: str):
    return find_connections(abuelito_id)


@app.api_route("/conference-twiml", methods=["GET", "POST"])
async def conference_twiml(request: Request):
    form = await request.form()
    room = form.get("room", "koralia-connect")
    response = VoiceResponse()
    response.say("Los estoy conectando, un momento.", language="es-MX")
    dial = Dial()
    dial.conference(room, start_conference_on_enter=True, end_conference_on_exit=True)
    response.append(dial)
    return HTMLResponse(content=str(response), media_type="application/xml")


@app.api_route("/incoming-call", methods=["GET", "POST"])
async def incoming_call(request: Request):
    form = await request.form()
    call_sid = form.get("CallSid", "")
    to_number = form.get("To", "")
    from_number = form.get("From", "")

    abuelito_phone = to_number if form.get("Direction") == "outbound-api" else from_number
    abuelito = get_abuelito_by_phone(abuelito_phone)

    host = request.headers.get("host", "")
    if abuelito:
        active_calls[call_sid] = {
            "abuelito_id": abuelito["id"],
            "phone": abuelito_phone,
            "name": abuelito["name"],
            "start_time": time.time(),
            "host": host,
        }
        log.info("Call for: %s (%s)", abuelito["name"], abuelito_phone)
    else:
        active_calls[call_sid] = {
            "abuelito_id": None,
            "phone": abuelito_phone,
            "name": "desconocido",
            "start_time": time.time(),
            "host": host,
        }
        log.info("Call for unregistered: %s", abuelito_phone)

    response = VoiceResponse()
    response.say("Conectando con Koralia, un momento por favor.", language="es-MX")
    response.pause(length=1)
    host = request.headers.get("host")
    connect = Connect()
    stream = connect.stream(url=f"wss://{host}/media-stream")
    stream.parameter(name="callSid", value=call_sid)
    response.append(connect)
    return HTMLResponse(content=str(response), media_type="application/xml")


@app.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    log.info("Twilio WebSocket accepted")

    # Step 1: Wait for Twilio "start" event to get callSid
    stream_sid = None
    call_sid = None
    while True:
        msg = await websocket.receive_text()
        data = json.loads(msg)
        if data["event"] == "start":
            stream_sid = data["start"]["streamSid"]
            call_sid = data["start"].get("customParameters", {}).get("callSid", "")
            log.info("Stream started: %s (call: %s)", stream_sid, call_sid)
            break

    # Step 2: Connect to OpenAI
    try:
        openai_ws = await websockets.connect(
            "wss://api.openai.com/v1/realtime?model=gpt-realtime",
            additional_headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
        )
        log.info("Connected to OpenAI Realtime API")
    except Exception as e:
        log.error("Failed to connect to OpenAI: %s", e)
        await websocket.close()
        return

    # Step 3: Configure session with knowledge context
    session_created = await openai_ws.recv()
    log.info("session.created received")

    call_info = active_calls.get(call_sid, {})
    abuelito_id = call_info.get("abuelito_id")
    abuelito_name = call_info.get("name", "")

    instructions = BASE_PROMPT
    connection_targets: dict[str, dict] = {}

    if abuelito_id:
        knowledge = get_knowledge_context(abuelito_id)
        if knowledge:
            instructions += f"\n\n{knowledge}"
        if abuelito_name and abuelito_name != "desconocido":
            instructions += f"\n\nEl abuelito se llama {abuelito_name}. Llámalo por su nombre."

        conns = find_connections(abuelito_id)
        if conns:
            from src.knowledge import supabase as sb
            conn_text = "\n\nConexiones disponibles — otros abuelitos con intereses en comun:"
            for c in conns:
                conn_text += f"\n- {c['abuelito_name']}: {', '.join(c['shared_interests'])}"
                phone_data = sb.table("abuelitos").select("phone").eq("id", c["abuelito_id"]).single().execute()
                c["phone"] = phone_data.data["phone"] if phone_data.data else None
                connection_targets[c["abuelito_name"].lower()] = c
            conn_text += "\n\nDurante la conversacion, si el momento es natural, menciona que conoces a alguien con gustos similares. Si el abuelito quiere hablar con esa persona, usa la herramienta connect_with_friend para conectarlos en llamada."
            instructions += conn_text

    tools = []
    if connection_targets:
        tools = [{
            "type": "function",
            "name": "connect_with_friend",
            "description": "Conecta al abuelito actual con otro abuelito que tiene intereses en comun. Usa esta herramienta cuando el abuelito diga que si quiere hablar con la otra persona.",
            "parameters": {
                "type": "object",
                "properties": {
                    "friend_name": {
                        "type": "string",
                        "description": "Nombre del abuelito con quien conectar",
                    },
                },
                "required": ["friend_name"],
            },
        }]

    await openai_ws.send(json.dumps({
        "type": "session.update",
        "session": {
            "type": "realtime",
            "instructions": instructions,
            "tools": tools,
            "tool_choice": "auto" if tools else "none",
            "audio": {
                "input": {
                    "format": {"type": "audio/pcmu"},
                    "transcription": {"model": "gpt-4o-mini-transcribe", "language": "es"},
                    "noise_reduction": {"type": "near_field"},
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.95,
                        "prefix_padding_ms": 500,
                        "silence_duration_ms": 1200,
                        "create_response": True,
                        "interrupt_response": False,
                    },
                },
                "output": {
                    "format": {"type": "audio/pcmu"},
                    "voice": VOICE,
                    "speed": 1.15,
                },
            },
        },
    }))

    update_response = await openai_ws.recv()
    log.info("session.update response: %s", update_response[:200])

    if abuelito_name and abuelito_name != "desconocido":
        greeting = f"Di en español: 'Hola {abuelito_name}, habla Koralia, ¿cómo está?' Sé breve y cálida."
    else:
        greeting = "Di en español: 'Hola, habla Koralia, ¿cómo está?' Sé breve y cálida."

    # Step 4: Run forwarding loops (greeting sent after loops start)
    request_host = [call_info.get("host", "")]
    transcript: list[dict] = []
    current_assistant_text: list[str] = []

    async def forward_twilio_to_openai():
        try:
            async for message in websocket.iter_text():
                data = json.loads(message)
                if data["event"] == "media":
                    await openai_ws.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": data["media"]["payload"],
                    }))
                elif data["event"] == "stop":
                    log.info("Twilio stream stopped")
        except Exception as e:
            log.error("Twilio->OpenAI error: %s", e)
        finally:
            # Twilio disconnected — close OpenAI to unblock the other task
            await openai_ws.close()

    async def handle_connect_tool(friend_name: str, tool_call_id: str):
        """Connect current abuelito with a friend via Twilio conference."""
        target = connection_targets.get(friend_name.lower())
        if not target:
            for k, v in connection_targets.items():
                if friend_name.lower() in k or k in friend_name.lower():
                    target = v
                    break

        if not target:
            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {"type": "function_call_output", "call_id": tool_call_id, "output": "No encontre a esa persona."},
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))
            return

        friend_phone = target.get("phone")

        if not friend_phone:
            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {"type": "function_call_output", "call_id": tool_call_id, "output": "No pude encontrar el telefono."},
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))
            return

        room_name = f"koralia-{call_sid[:8]}"
        tunnel_url = request_host[0] if request_host else "localhost:5050"
        conf_url = f"https://{tunnel_url}/conference-twiml?room={room_name}"

        try:
            loop = asyncio.get_event_loop()
            await asyncio.gather(
                loop.run_in_executor(None, lambda: twilio_client.calls(call_sid).update(
                    twiml=f'<Response><Say language="es-MX">Conectando con {target["abuelito_name"]}.</Say><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true">{room_name}</Conference></Dial></Response>'
                )),
                loop.run_in_executor(None, lambda: twilio_client.calls.create(
                    to=friend_phone,
                    from_=TWILIO_PHONE_NUMBER,
                    twiml=f'<Response><Say language="es-MX">Hola, Koralia te conecta con un amigo.</Say><Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true">{room_name}</Conference></Dial></Response>'
                )),
            )
            log.info("Conference created: %s connecting %s with %s", room_name, abuelito_name, target["abuelito_name"])

            # Save connection to DB
            try:
                sb.table("connections").insert({
                    "abuelito_a_id": abuelito_id,
                    "abuelito_b_id": target["abuelito_id"],
                    "shared_interests": target.get("shared_interests", []),
                    "source_call_id": None,
                    "status": "completed",
                }).execute()
                log.info("Connection saved to DB")
            except Exception as db_err:
                log.error("Failed to save connection: %s", db_err)

            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {"type": "function_call_output", "call_id": tool_call_id, "output": f"Listo, estoy conectando a {abuelito_name} con {target['abuelito_name']}. La llamada sera redirigida a una conferencia."},
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))
        except Exception as e:
            log.error("Failed to create conference: %s", e)
            await openai_ws.send(json.dumps({
                "type": "conversation.item.create",
                "item": {"type": "function_call_output", "call_id": tool_call_id, "output": "Hubo un problema tecnico, no pude conectarlos."},
            }))
            await openai_ws.send(json.dumps({"type": "response.create"}))

    async def forward_openai_to_twilio():
        nonlocal current_assistant_text
        try:
            async for message in openai_ws:
                data = json.loads(message)
                event_type = data.get("type", "")

                if event_type == "response.output_audio.delta":
                    await websocket.send_json({
                        "event": "media",
                        "streamSid": stream_sid,
                        "media": {"payload": data["delta"]},
                    })
                elif event_type == "response.output_audio_transcript.delta":
                    current_assistant_text.append(data.get("delta", ""))
                elif event_type == "response.output_audio_transcript.done":
                    full_text = "".join(current_assistant_text)
                    if full_text.strip():
                        transcript.append({"role": "assistant", "text": full_text})
                        log.info("Koralia: %s", full_text[:100])
                    current_assistant_text = []
                elif event_type == "conversation.item.input_audio_transcription.completed":
                    user_text = data.get("transcript", "")
                    if user_text.strip():
                        transcript.append({"role": "user", "text": user_text})
                        log.info("Abuelito: %s", user_text[:100])
                elif event_type == "input_audio_buffer.speech_started":
                    await websocket.send_json({
                        "event": "clear",
                        "streamSid": stream_sid,
                    })
                elif event_type == "response.function_call_arguments.done":
                    fn_name = data.get("name", "")
                    call_id = data.get("call_id", "")
                    try:
                        args = json.loads(data.get("arguments", "{}"))
                    except json.JSONDecodeError:
                        args = {}
                    if fn_name == "connect_with_friend":
                        log.info("Tool call: connect_with_friend(%s)", args.get("friend_name"))
                        await handle_connect_tool(args.get("friend_name", ""), call_id)
                elif event_type == "error":
                    log.error("OpenAI error: %s", json.dumps(data))
        except Exception as e:
            log.error("OpenAI->Twilio error: %s", e)

    async def send_greeting():
        await asyncio.sleep(0.5)
        await openai_ws.send(json.dumps({
            "type": "response.create",
            "response": {"instructions": greeting},
        }))
        log.info("Sent initial greeting")

    try:
        await asyncio.gather(forward_twilio_to_openai(), forward_openai_to_twilio(), send_greeting())
    finally:
        await openai_ws.close()

        call_info = active_calls.pop(call_sid, {})
        abuelito_id = call_info.get("abuelito_id")
        if abuelito_id and transcript:
            duration = int(time.time() - call_info.get("start_time", time.time()))
            try:
                call_id = save_call(abuelito_id, transcript, duration)
                log.info("Post-call complete: %s (%d entries in transcript)", call_id, len(transcript))
            except Exception as e:
                log.error("Failed to save call: %s", e)
        elif transcript:
            log.info("Unregistered call transcript: %d entries", len(transcript))

        log.info("Call ended")
