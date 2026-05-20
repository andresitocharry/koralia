from __future__ import annotations

import os
import json
import logging

from dotenv import load_dotenv
from openai import OpenAI
from supabase import create_client

load_dotenv()

log = logging.getLogger("koralia.knowledge")

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY"),
)
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

EXTRACTION_PROMPT = """Analiza esta transcripción de una llamada telefónica entre Koralia (asistente IA) y un abuelito.

Extrae información relevante sobre el abuelito en estas categorías:
- health: salud física, dolores, medicamentos, citas médicas
- food: qué comió, hábitos alimenticios, preferencias
- family: familiares mencionados, relaciones, eventos familiares
- interests: hobbies, actividades, cosas que disfruta
- mood: estado de ánimo, emociones expresadas
- routine: rutinas diarias, horarios, hábitos

Responde SOLO con un JSON array. Cada entrada tiene "category" y "content" (en español).
Si no hay información relevante en alguna categoría, no la incluyas.
Ejemplo: [{"category": "food", "content": "Hoy almorzó sopa de pollo con arroz"}, {"category": "mood", "content": "Se siente contento porque lo visitó su nieta"}]

Transcripción:
"""


def save_call(abuelito_id: str, transcript: list[dict], duration_seconds: int) -> str:
    transcript_text = "\n".join(
        f"{'Koralia' if t['role'] == 'assistant' else 'Abuelito'}: {t['text']}"
        for t in transcript
        if t.get("text")
    )

    summary = _summarize(transcript_text)

    result = supabase.table("calls").insert({
        "abuelito_id": abuelito_id,
        "duration_seconds": duration_seconds,
        "transcript": transcript_text,
        "summary": summary,
    }).execute()

    call_id = result.data[0]["id"]
    log.info("Saved call %s for abuelito %s", call_id, abuelito_id)

    entries = _extract_knowledge(transcript_text)
    for entry in entries:
        embedding = _embed(entry["content"])
        supabase.table("knowledge_entries").insert({
            "abuelito_id": abuelito_id,
            "source_call_id": call_id,
            "category": entry["category"],
            "content": entry["content"],
            "embedding": embedding,
        }).execute()

    log.info("Extracted %d knowledge entries from call %s", len(entries), call_id)
    return call_id


def get_abuelito_by_phone(phone: str) -> dict | None:
    result = supabase.table("abuelitos").select("*").eq("phone", phone).limit(1).execute()
    return result.data[0] if result.data else None


def get_knowledge_context(abuelito_id: str, limit: int = 20) -> str:
    result = (
        supabase.table("knowledge_entries")
        .select("category, content, created_at")
        .eq("abuelito_id", abuelito_id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    if not result.data:
        return ""

    lines = []
    for entry in result.data:
        lines.append(f"- [{entry['category']}] {entry['content']}")

    return "Lo que ya sabes sobre este abuelito:\n" + "\n".join(lines)


def _summarize(transcript: str) -> str:
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Resume esta llamada en 2-3 oraciones en español. Enfócate en cómo está el abuelito y qué contó."},
            {"role": "user", "content": transcript},
        ],
        max_tokens=200,
    )
    return response.choices[0].message.content


def _extract_knowledge(transcript: str) -> list[dict]:
    response = openai_client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "user", "content": EXTRACTION_PROMPT + transcript},
        ],
        max_tokens=1000,
        response_format={"type": "json_object"},
    )

    try:
        data = json.loads(response.choices[0].message.content)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "entries" in data:
            return data["entries"]
        return []
    except (json.JSONDecodeError, KeyError):
        log.error("Failed to parse knowledge extraction response")
        return []


def _embed(text: str) -> list[float]:
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding
