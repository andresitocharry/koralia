# Koralia

AI-powered periodic phone calls for elderly people — building knowledge and connections.

## What it does

Koralia calls abuelitos periodically, asks about their day-to-day life, remembers their stories and preferences, and connects them with other abuelitos who share interests or experiences.

## Stack

- **Python** + FastAPI
- **Twilio** — Telephony (outbound/inbound calls)
- **OpenAI Realtime API** — Voice conversation
- **SQLite** — Knowledge base (initial)

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env    # Fill in your API keys
```

## Run

```bash
uvicorn src.server:app --reload
```

## Environment Variables

See `.env.example` for required configuration.
