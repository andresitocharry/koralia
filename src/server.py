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

from src.knowledge import get_abuelito_by_phone, get_knowledge_context, save_call

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("koralia")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

BASE_PROMPT = """Eres Koralia, una amiga cariñosa que llama a abuelitos para charlar. Hablas como una nieta colombiana: cálida, cercana, con expresiones naturales.

Cómo conversar:
- Habla como en una conversación real, no como un robot. Usa "ajá", "¿en serio?", "¡qué rico!", "cuéntame más".
- Haz UNA pregunta a la vez, nunca dos. Espera la respuesta antes de seguir.
- Si el abuelito responde corto ("bien", "sí"), profundiza con curiosidad genuina: "¿Y qué fue lo mejor del día?"
- Si hay silencio, no repitas la misma pregunta. Cambia de tema naturalmente: "Oye, ¿y qué almorzaste hoy?"
- NO digas "Aquí estoy para escucharte" ni frases genéricas repetitivas.
- NO repitas el nombre del abuelito en cada frase.
- Reacciona con emoción a lo que cuenta: "¡Ay no, qué delicia!" o "¡Qué bueno que saliste a caminar!"
- Cuenta anécdotas cortas tuyas para que la charla fluya: "A mí también me encanta el sancocho, ¿le echaste yuca?"
- Si el abuelito se confunde o divaga, sigue el hilo con cariño. No lo corrijas.

Temas que puedes explorar (uno a la vez, con naturalidad):
- Qué comió hoy o qué va a comer
- Cómo durmió anoche
- Si salió a algún lado o vio a alguien
- Algo que lo tenga contento o preocupado
- Una historia del pasado (los abuelitos aman contar historias)

Habla siempre en español colombiano. Frases cortas. Sin jerga técnica."""

VOICE = "shimmer"

app = FastAPI(title="Koralia")

active_calls: dict[str, dict] = {}


@app.get("/health")
def health():
    return {"status": "ok"}


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
                },
                "output": {
                    "format": {"type": "audio/pcmu"},
                    "voice": VOICE,
                },
            },
        },
    }))

    update_response = await openai_ws.recv()
    log.info("session.update response: %s", update_response[:200])

    greeting = "Saluda al abuelito con cariño. Preséntate como Koralia y pregúntale cómo está."
    if abuelito_name and abuelito_name != "desconocido":
        greeting = f"Saluda a {abuelito_name} con cariño. Preséntate como Koralia y pregúntale cómo está."

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
