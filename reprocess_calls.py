from dotenv import load_dotenv
load_dotenv()

import os, json
from supabase import create_client
from openai import OpenAI

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
oai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

PROMPT = (
    'Analiza esta transcripcion de una llamada entre Koralia (asistente IA) y un abuelito.\n'
    'Extrae informacion relevante en estas categorias:\n'
    '- health: salud, dolores, medicamentos\n'
    '- food: que comio, habitos alimenticios\n'
    '- family: familiares mencionados\n'
    '- interests: hobbies, actividades\n'
    '- mood: estado de animo\n'
    '- routine: rutinas diarias\n\n'
    'Responde con un JSON object con key "entries" que sea un array.\n'
    'Ejemplo: {"entries": [{"category": "food", "content": "Hoy almorzó sopa"}]}\n'
    'Si no hay info en alguna categoria, no la incluyas. Content en español.\n\n'
    'Transcripcion:\n'
)

calls = sb.table("calls").select("id, abuelito_id, transcript").order("created_at").execute()

total_entries = 0
for call in calls.data:
    if not call["transcript"] or not call["abuelito_id"]:
        continue

    print(f"\nProcessing call {call['id'][:8]}...")

    resp = oai.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": PROMPT + call["transcript"]}],
        max_tokens=1000,
        response_format={"type": "json_object"},
    )

    data = json.loads(resp.choices[0].message.content)
    entries = data.get("entries", [])

    for entry in entries:
        embedding = oai.embeddings.create(
            model="text-embedding-3-small",
            input=entry["content"],
        ).data[0].embedding

        sb.table("knowledge_entries").insert({
            "abuelito_id": call["abuelito_id"],
            "source_call_id": call["id"],
            "category": entry["category"],
            "content": entry["content"],
            "embedding": embedding,
        }).execute()

    print(f"  Extracted {len(entries)} entries")
    total_entries += len(entries)

print(f"\nDone! Total: {total_entries} knowledge entries extracted from {len(calls.data)} calls")
