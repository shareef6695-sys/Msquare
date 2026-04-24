create extension if not exists pgcrypto;

create table if not exists public.lc_requests (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  buyer_id text not null,
  merchant_id text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null default 'DRAFT',
  created_at timestamptz not null default now()
);

create table if not exists public.lc_documents (
  id uuid primary key default gen_random_uuid(),
  lc_request_id uuid not null references public.lc_requests(id) on delete cascade,
  name text not null,
  url text not null,
  uploaded_at timestamptz not null default now()
);

create table if not exists public.lc_status (
  id uuid primary key default gen_random_uuid(),
  lc_request_id uuid not null references public.lc_requests(id) on delete cascade,
  status text not null,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  reason text not null,
  description text not null,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

create table if not exists public.insurance_claims (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  claim_amount numeric(12,2) not null,
  description text,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);

alter table if exists public.orders
  add column if not exists payment_type text,
  add column if not exists trade_assurance boolean not null default false,
  add column if not exists insurance_enabled boolean not null default false,
  add column if not exists escrow_status text,
  add column if not exists payout_status text,
  add column if not exists lc_request_id uuid,
  add column if not exists lc_status text,
  add column if not exists dispute_status text,
  add column if not exists insurance_claim_status text;
