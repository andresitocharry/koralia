-- Call preferences per abuelito
alter table abuelitos add column call_frequency text default 'weekly' check (call_frequency in ('daily', 'every_other_day', 'weekly', 'biweekly'));
alter table abuelitos add column preferred_time text default 'morning' check (preferred_time in ('morning', 'afternoon', 'evening'));
alter table abuelitos add column tone text default 'warm' check (tone in ('warm', 'cheerful', 'calm', 'playful'));
alter table abuelitos add column topics text[] default '{}';
