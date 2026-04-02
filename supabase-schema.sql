-- SQL para criar a tabela de armazenamento de dados do Polaris no Supabase
-- Execute no SQL Editor do Supabase

create extension if not exists "pgcrypto";

create table if not exists polaris_storage (
  user_id uuid not null references auth.users(id) on delete cascade,
  key text not null,
  value text,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);
