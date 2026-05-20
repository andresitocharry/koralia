import os
import json
import asyncio
import logging

import websockets
from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse
from dotenv import load_dotenv
from twilio.twiml.voice_response import VoiceResponse, Connect

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("koralia")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

SYSTEM_PROMPT = """Eres Koralia, una compañera cariñosa que llama a abuelitos para conversar.

Tu objetivo es:
- Preguntar cómo estuvo su día, qué comieron, cómo se sienten
- Escuchar con paciencia y calidez
- Recordar lo que te cuentan para futuras conversaciones
- Hablar en español, de forma clara y pausada
- Usar un tono cercano, como una nieta o nieto cariñoso
- No apurar la conversación, dejar que el abuelito se tome su tiempo

Reglas:
- Habla siempre en español
- Usa frases cortas y claras
- No uses jerga técnica
- Si el abuelito no entiende algo, repítelo con otras palabras
- Sé empática y paciente"""

VOICE = "shimmer"

app = FastAPI(title="Koralia")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.api_route("/incoming-call", methods=["GET", "POST"])
async def incoming_call(request: Request):
    response = VoiceResponse()
    response.say("Conectando con Koralia, un momento por favor.", language="es-MX")
    response.pause(length=1)
    host = request.headers.get("host")
    connect = Connect()
    connect.stream(url=f"wss://{host}/media-stream")
    response.append(connect)
    return HTMLResponse(content=str(response), media_type="application/xml")


@app.websocket("/media-stream")
async def media_stream(websocket: WebSocket):
    await websocket.accept()
    log.info("Twilio WebSocket accepted")

    try:
        openai_ws = await websockets.connect(
            "wss://api.openai.com/v1/realtime?model=gpt-realtime",
            additional_headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
            },
        )
        log.info("Connected to OpenAI Realtime API")
    except Exception as e:
        log.error("Failed to connect to OpenAI: %s", e)
        await websocket.close()
        return

    stream_sid = None

    async def configure_session():
        session_created = await openai_ws.recv()
        log.info("session.created received")

        session_config = {
            "type": "session.update",
            "session": {
                "type": "realtime",
                "instructions": SYSTEM_PROMPT,
                "audio": {
                    "input": {
                        "format": {"type": "audio/pcmu"},
                    },
                    "output": {
                        "format": {"type": "audio/pcmu"},
                        "voice": VOICE,
                    },
                },
            },
        }
        await openai_ws.send(json.dumps(session_config))
        log.info("Sent session.update")

        response = await openai_ws.recv()
        log.info("session.update response: %s", response[:300])

        await openai_ws.send(json.dumps({
            "type": "response.create",
            "response": {
                "instructions": "Saluda al abuelito con cariño. Preséntate como Koralia y pregúntale cómo está.",
            },
        }))
        log.info("Sent response.create for initial greeting")

    await configure_session()

    async def forward_twilio_to_openai():
        nonlocal stream_sid
        try:
            async for message in websocket.iter_text():
                data = json.loads(message)
                if data["event"] == "start":
                    stream_sid = data["start"]["streamSid"]
                    log.info("Twilio stream started: %s", stream_sid)
                elif data["event"] == "media":
                    await openai_ws.send(json.dumps({
                        "type": "input_audio_buffer.append",
                        "audio": data["media"]["payload"],
                    }))
                elif data["event"] == "stop":
                    log.info("Twilio stream stopped")
        except Exception as e:
            log.error("Twilio->OpenAI error: %s", e)

    async def forward_openai_to_twilio():
        audio_chunks = 0
        try:
            async for message in openai_ws:
                data = json.loads(message)
                event_type = data.get("type", "")

                if event_type == "response.output_audio.delta" and stream_sid:
                    audio_chunks += 1
                    await websocket.send_json({
                        "event": "media",
                        "streamSid": stream_sid,
                        "media": {"payload": data["delta"]},
                    })
                elif event_type == "input_audio_buffer.speech_started" and stream_sid:
                    log.info("Speech detected, clearing Twilio buffer")
                    await websocket.send_json({
                        "event": "clear",
                        "streamSid": stream_sid,
                    })
                elif event_type == "error":
                    log.error("OpenAI error: %s", json.dumps(data))
                elif event_type == "response.done":
                    log.info("Response done. Audio chunks sent: %d", audio_chunks)
                    audio_chunks = 0
                else:
                    log.info("OpenAI event: %s", event_type)
        except Exception as e:
            log.error("OpenAI->Twilio error: %s", e)

    try:
        await asyncio.gather(forward_twilio_to_openai(), forward_openai_to_twilio())
    finally:
        await openai_ws.close()
        log.info("OpenAI WebSocket closed")
