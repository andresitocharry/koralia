-- Enable pgvector extension
create extension if not exists vector with schema extensions;

-- Abuelitos: registered by their nieto
create table abuelitos (
    id uuid primary key default gen_random_uuid(),
    nieto_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    phone text not null,
    personality_notes text,
    created_at timestamptz not null default now()
);

-- Calls: each phone call Koralia makes
create table calls (
    id uuid primary key default gen_random_uuid(),
    abuelito_id uuid not null references abuelitos(id) on delete cascade,
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    duration_seconds integer,
    transcript text,
    summary text,
    mood text,
    created_at timestamptz not null default now()
);

-- Knowledge entries: extracted from call transcripts
create table knowledge_entries (
    id uuid primary key default gen_random_uuid(),
    abuelito_id uuid not null references abuelitos(id) on delete cascade,
    source_call_id uuid references calls(id) on delete set null,
    category text not null check (category in ('health', 'food', 'family', 'interests', 'mood', 'routine', 'other')),
    content text not null,
    embedding vector(1536),
    created_at timestamptz not null default now()
);

-- Index for vector similarity search
create index on knowledge_entries using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Row Level Security: nietos only see their own abuelitos' data
alter table abuelitos enable row level security;
alter table calls enable row level security;
alter table knowledge_entries enable row level security;

create policy "Nietos see own abuelitos"
    on abuelitos for all
    using (nieto_id = auth.uid());

create policy "Nietos see own calls"
    on calls for all
    using (abuelito_id in (select id from abuelitos where nieto_id = auth.uid()));

create policy "Nietos see own knowledge"
    on knowledge_entries for all
    using (abuelito_id in (select id from abuelitos where nieto_id = auth.uid()));
