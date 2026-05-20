create table connections (
    id uuid primary key default gen_random_uuid(),
    abuelito_a_id uuid not null references abuelitos(id) on delete cascade,
    abuelito_b_id uuid not null references abuelitos(id) on delete cascade,
    shared_interests text[] not null default '{}',
    source_call_id uuid references calls(id) on delete set null,
    status text not null default 'completed' check (status in ('completed', 'missed')),
    created_at timestamptz not null default now()
);

alter table connections enable row level security;

create policy "Nietos see own connections"
    on connections for all
    using (
        abuelito_a_id in (select id from abuelitos where nieto_id = auth.uid())
        or abuelito_b_id in (select id from abuelitos where nieto_id = auth.uid())
    );
