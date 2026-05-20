# ADR-0001: MVP architecture: Supabase + pgvector knowledge base + Next.js dashboard

**Status:** Accepted
**Date:** 2026-05-20

## Context

Koralia has a working voice prototype (FastAPI server bridging Twilio and OpenAI Realtime API). The next step is building the product around it: a knowledge base that lets Koralia remember past conversations, and a dashboard for the paying customer (the grandchild, not the elderly person receiving calls).

Key constraints:
- Budget is minimal ($4 OpenAI credits, Twilio trial)
- Two user types: abuelitos (call recipients, no app) and nietos (paying customers who configure and monitor)
- Knowledge must persist across calls and be queryable by semantic similarity
- The system must work for Spanish-speaking elderly users in Latin America

Alternatives evaluated for the knowledge base:
- Dedicated vector DB (Pinecone, Weaviate): adds another service dependency and cost
- SQLite with embeddings: simple but no hosted option, no auth, no realtime
- Supabase with pgvector: PostgreSQL with vector search built in, plus auth, RLS, and a generous free tier

Alternatives evaluated for the dashboard:
- Python full-stack (FastAPI + templates/Streamlit): fewer languages but limited UI capabilities
- Next.js + Supabase: well-documented integration, SSR, rich UI, Supabase JS client with auth and realtime built in

## Decision

The MVP consists of three components on top of the existing voice server:

1. **Supabase (PostgreSQL + pgvector)** as the single data store:
   - Abuelito profiles, call transcripts, and knowledge entries with vector embeddings
   - Supabase Auth for nieto login
   - Row Level Security so each nieto only sees their abuelitos

2. **Knowledge pipeline (post-call):** After each call, the transcript is sent to GPT-4o-mini to extract structured knowledge entries (health, mood, food, interests, routines). Each entry is embedded and stored via pgvector.

3. **Next.js dashboard** for nietos:
   - Register, add abuelitos with phone numbers
   - View call history with summaries and insights
   - See what Koralia knows about each abuelito

Before each call, the voice server queries Supabase for relevant knowledge entries (by semantic similarity to the abuelito's profile) and injects them into the OpenAI session instructions.

Features explicitly deferred: connection engine between abuelitos, automated call scheduling, payment integration.

## Rationale

Supabase consolidates database, auth, vector search, and realtime into a single free-tier service — avoiding the cost and complexity of multiple providers. pgvector is sufficient for the expected scale (hundreds of knowledge entries per abuelito, not millions). Next.js is chosen because the Supabase integration is first-class and well-documented, and it handles SSR for fast initial loads.

The knowledge pipeline uses GPT-4o-mini (not GPT-4o) to minimize cost per call while maintaining extraction quality for structured data.

## Consequences

- All persistent state lives in Supabase — if Supabase goes down or changes pricing, the entire data layer is affected.
- pgvector embedding dimensions must be chosen upfront (1536 for text-embedding-3-small); changing embedding models later requires re-embedding all entries.
- The dashboard is a separate codebase (Next.js/TypeScript) from the voice server (Python/FastAPI), requiring two deployment pipelines.
- The nieto-pays-abuelito-uses model means the abuelito never interacts with the dashboard or creates an account — all abuelito records are created and managed by their nieto.
