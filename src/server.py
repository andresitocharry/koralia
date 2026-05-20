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
from twilio.twiml.voice_response import VoiceResponse, Connect

from fastapi.middleware.cors import CORSMiddleware

from src.knowledge import get_abuelito_by_phone, get_knowledge_context, save_call, find_connections

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("koralia")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

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


@app.api_route("/incoming-call", methods=["GET", "POST"])
async def incoming_call(request: Request):
    form = await request.form()
    call_sid = form.get("CallSid", "")
    to_number = form.get("To", "")
    from_number = form.get("From", "")

    abuelito_phone = to_number if form.get("Direction") == "outbound-api" else from_number
    abuelito = get_abuelito_by_phone(abuelito_phone)

    if abuelito:
        active_calls[call_sid] = {
            "abuelito_id": abuelito["id"],
            "phone": abuelito_phone,
            "name": abuelito["name"],
            "start_time": time.time(),
        }
        log.info("Call for: %s (%s)", abuelito["name"], abuelito_phone)
    else:
        active_calls[call_sid] = {
            "abuelito_id": None,
            "phone": abuelito_phone,
            "name": "desconocido",
            "start_time": time.time(),
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
    if abuelito_id:
        knowledge = get_knowledge_context(abuelito_id)
        if knowledge:
            instructions += f"\n\n{knowledge}"
        if abuelito_name and abuelito_name != "desconocido":
            instructions += f"\n\nEl abuelito se llama {abuelito_name}. Llámalo por su nombre."

    await openai_ws.send(json.dumps({
        "type": "session.update",
        "session": {
            "type": "realtime",
            "instructions": instructions,
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
                        "interrupt_response": True,
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

    await openai_ws.send(json.dumps({
        "type": "response.create",
        "response": {"instructions": greeting},
    }))
    log.info("Sent initial greeting")

    # Step 4: Run forwarding loops
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
                elif event_type == "error":
                    log.error("OpenAI error: %s", json.dumps(data))
        except Exception as e:
            log.error("OpenAI->Twilio error: %s", e)

    try:
        await asyncio.gather(forward_twilio_to_openai(), forward_openai_to_twilio())
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
