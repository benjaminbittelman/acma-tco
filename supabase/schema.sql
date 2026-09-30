-- ACMA TCO · esquema centralizado
create extension if not exists pgcrypto;

create table if not exists public.tco_evaluations (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,
  public_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  event text,
  kam jsonb not null default '{}'::jsonb,
  lead jsonb not null default '{}'::jsonb,
  case_name text,
  payload jsonb not null,
  result jsonb not null default '{}'::jsonb,
  validation jsonb not null default '{}'::jsonb,
  follow jsonb not null default '{"interest":"Sin clasificar","next":"Por definir","notes":""}'::jsonb,
  send_status text not null default 'Guardada',
  pdf_path text,
  email_sent_at timestamptz
);

create index if not exists tco_eval_created_idx on public.tco_evaluations(created_at desc);
create index if not exists tco_eval_event_idx on public.tco_evaluations(event);
create index if not exists tco_eval_kam_email_idx on public.tco_evaluations((kam->>'m'));
create index if not exists tco_eval_company_idx on public.tco_evaluations((lead->>'company'));

alter table public.tco_evaluations enable row level security;

insert into storage.buckets (id, name, public)
values ('tco-pdfs', 'tco-pdfs', false)
on conflict (id) do update set public = false;
