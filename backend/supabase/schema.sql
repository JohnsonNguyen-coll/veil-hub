create table if not exists public.veil_clubs (
  id text primary key,
  contract_club_id text unique,
  create_tx_hash text,
  name text not null,
  description text not null default '',
  scope text not null check (scope in ('PUBLIC', 'PRIVATE')),
  admin text not null,
  keeper text not null,
  invite_code text unique,
  min_deposit text not null default '1',
  draw_interval_ms bigint not null,
  next_draw_at timestamptz not null,
  anonymous_members boolean not null default false,
  member_count integer not null default 0,
  encrypted_tvl_handle text not null,
  encrypted_prize_handle text not null,
  status text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.veil_clubs add column if not exists contract_club_id text;
alter table public.veil_clubs add column if not exists create_tx_hash text;
alter table public.veil_clubs add column if not exists description text not null default '';
alter table public.veil_clubs add column if not exists admin text not null default 'protocol';
alter table public.veil_clubs add column if not exists keeper text not null default 'protocol';
alter table public.veil_clubs add column if not exists invite_code text;
alter table public.veil_clubs add column if not exists min_deposit text not null default '1';
alter table public.veil_clubs add column if not exists draw_interval_ms bigint not null default 86400000;
alter table public.veil_clubs add column if not exists next_draw_at timestamptz not null default now();
alter table public.veil_clubs add column if not exists anonymous_members boolean not null default false;
alter table public.veil_clubs add column if not exists member_count integer not null default 0;
alter table public.veil_clubs add column if not exists encrypted_tvl_handle text not null default 'encrypted';
alter table public.veil_clubs add column if not exists encrypted_prize_handle text not null default 'encrypted';
alter table public.veil_clubs add column if not exists status text not null default 'ACTIVE';
alter table public.veil_clubs add column if not exists updated_at timestamptz not null default now();

create table if not exists public.veil_draws (
  id text primary key,
  draw_number integer not null,
  club_id text not null references public.veil_clubs(id) on delete cascade,
  club_name text not null,
  winner text not null,
  prize_handle text not null,
  status text not null,
  tx_hash text,
  source text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.veil_faucet_claims (
  address text primary key,
  last_claim_at bigint not null,
  updated_at timestamptz not null default now()
);

alter table public.veil_clubs enable row level security;
alter table public.veil_draws enable row level security;
alter table public.veil_faucet_claims enable row level security;

drop policy if exists "Public can read clubs" on public.veil_clubs;
drop policy if exists "Public can read draws" on public.veil_draws;
drop policy if exists "Service role writes clubs" on public.veil_clubs;
drop policy if exists "Service role writes draws" on public.veil_draws;
drop policy if exists "Service role manages faucet claims" on public.veil_faucet_claims;

create policy "Public can read clubs"
on public.veil_clubs for select
to anon, authenticated
using (true);

create policy "Public can read draws"
on public.veil_draws for select
to anon, authenticated
using (true);

create policy "Service role writes clubs"
on public.veil_clubs for all
to service_role
using (true)
with check (true);

create policy "Service role writes draws"
on public.veil_draws for all
to service_role
using (true)
with check (true);

create policy "Service role manages faucet claims"
on public.veil_faucet_claims for all
to service_role
using (true)
with check (true);
