from dotenv import load_dotenv
load_dotenv()

import os, json
from supabase import create_client
from openai import OpenAI

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
oai = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

call = sb.table("calls").select("transcript").order("created_at", desc=True).limit(1).execute()
transcript = call.data[0]["transcript"]
print("Transcript length:", len(transcript))
print("First 300 chars:", transcript[:300])
print()

prompt = (
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
    'Si no hay info en alguna categoria, no la incluyas.\n\n'
    'Transcripcion:\n' + transcript
)

resp = oai.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": prompt}],
    max_tokens=1000,
    response_format={"type": "json_object"},
)

raw = resp.choices[0].message.content
print("Raw response:", raw[:500])
data = json.loads(raw)
print("Parsed type:", type(data))
if isinstance(data, dict):
    print("Keys:", list(data.keys()))
    entries = data.get("entries", [])
    print("Entries:", len(entries))
    for e in entries:
        print(" -", e.get("category"), ":", e.get("content", "")[:80])
