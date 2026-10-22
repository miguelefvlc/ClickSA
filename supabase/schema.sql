-- =========================================================================
-- ClickSA — Supabase Database Schema & Proteccions de Seguretat (RLS)
-- =========================================================================
-- Instruccions per activar el núvol a Supabase:
-- 1. Accedeix al tauler de Supabase (https://supabase.com/dashboard)
-- 2. Entra al teu projecte -> Menú lateral "SQL Editor" -> "New Query"
-- 3. Copia i apega tot aquest contingut i prem el botó "RUN"
-- =========================================================================

-- 1. TAULA PRINCIPAL: SITUACIONS D'APRENENTATGE
create table if not exists public.situacions_aprenentatge (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users (id) on delete cascade,
  sa_num       text not null default '',
  title        text not null default 'Sense títol',
  area         text not null default '',
  cicle        text not null default '',
  curs         text not null default '',
  trimestre    text not null default '',
  data         jsonb not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índex de consulta ràpida per usuari ordenat per data de modificació
create index if not exists sa_user_updated_idx
  on public.situacions_aprenentatge (user_id, updated_at desc);

-- 2. PROTECCIÓ DE MIDA (Fins a 1 MB per Situació d'Aprenentatge)
alter table public.situacions_aprenentatge
  drop constraint if exists sa_max_data_size,
  drop constraint if exists sa_max_title_len;

alter table public.situacions_aprenentatge
  add constraint sa_max_data_size check (pg_column_size(data) <= 1048576),
  add constraint sa_max_title_len check (length(title) <= 250);

-- 3. QUOTA MÀXIMA PER USUARI (Fins a 100 SA al núvol per compte)
create or replace function public.check_sa_quota()
returns trigger language plpgsql as $quota$
begin
  if (select count(*) from public.situacions_aprenentatge where user_id = new.user_id) >= 100 then
    raise exception 'Has assolit el límit màxim de 100 Situacions d''Aprenentatge al núvol. Elimina''n alguna per poder desar-ne una de nova.';
  end if;
  return new;
end;
$quota$;

drop trigger if exists sa_quota_trigger on public.situacions_aprenentatge;
create trigger sa_quota_trigger
  before insert on public.situacions_aprenentatge
  for each row execute function public.check_sa_quota();

-- 4. ACTUALITZACIÓ AUTOMÀTICA DE 'updated_at'
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $touch$
begin
  new.updated_at = now();
  return new;
end;
$touch$;

drop trigger if exists sa_touch on public.situacions_aprenentatge;
create trigger sa_touch
  before update on public.situacions_aprenentatge
  for each row execute function public.touch_updated_at();

-- 5. ROW LEVEL SECURITY (RLS) — AÏLLAMENT TOTAL DE LES DADES PER USUARI
alter table public.situacions_aprenentatge enable row level security;

drop policy if exists "Own SA: select" on public.situacions_aprenentatge;
drop policy if exists "Own SA: insert" on public.situacions_aprenentatge;
drop policy if exists "Own SA: update" on public.situacions_aprenentatge;
drop policy if exists "Own SA: delete" on public.situacions_aprenentatge;

create policy "Own SA: select" on public.situacions_aprenentatge
  for select to authenticated
  using (auth.uid() = user_id);

create policy "Own SA: insert" on public.situacions_aprenentatge
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Own SA: update" on public.situacions_aprenentatge
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Own SA: delete" on public.situacions_aprenentatge
  for delete to authenticated
  using (auth.uid() = user_id);
