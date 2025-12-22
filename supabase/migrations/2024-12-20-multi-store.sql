-- Base tables
create extension if not exists "pgcrypto";
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.store_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_store_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null check (role in ('atendente','gerente')),
  created_at timestamptz not null default now(),
  unique (user_id, store_id)
);

-- Pedidos e itens com snapshots
create table if not exists public.pedidos (
  id bigserial primary key,
  store_id uuid not null references public.stores(id) on delete cascade,
  cliente_id uuid,
  data_entrega date,
  hora_entrega text,
  tipo_entrega text,
  status_pagamento text,
  status_entrega text,
  subtotal numeric,
  frete numeric,
  desconto numeric,
  total numeric,
  observacao_geral text,
  endereco_entrega_id uuid,
  criado_por text,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  delivery_address_snapshot jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.itens_pedido (
  id bigserial primary key,
  pedido_id bigint not null references public.pedidos(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  produto_id uuid,
  quantidade numeric,
  observacao text,
  complementos jsonb,
  valor_unitario numeric,
  product_name_snapshot text,
  unit_price_snapshot numeric,
  created_at timestamptz not null default now()
);

-- RLS
alter table public.stores enable row level security;
alter table public.store_user_profiles enable row level security;
alter table public.platform_admin_profiles enable row level security;
alter table public.user_store_access enable row level security;
alter table public.pedidos enable row level security;
alter table public.itens_pedido enable row level security;

create or replace function public.is_platform_admin() returns boolean as $$
  select exists(select 1 from public.platform_admin_profiles p where p.user_id = auth.uid());
$$ language sql stable;

create policy "admins read stores" on public.stores
  for select using (public.is_platform_admin());

create policy "store users read stores" on public.stores
  for select using (
    exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = id
    )
  );

create policy "admins manage stores" on public.stores
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "own profile" on public.store_user_profiles
  for select using (user_id = auth.uid());

create policy "admin manage profiles" on public.store_user_profiles
  for all using (public.is_platform_admin()) with check (true);

create policy "admin profiles visibility" on public.platform_admin_profiles
  for select using (public.is_platform_admin());

create policy "self admin visibility" on public.platform_admin_profiles
  for select using (user_id = auth.uid());

create policy "admin manage platform admins" on public.platform_admin_profiles
  for all using (public.is_platform_admin()) with check (true);

create policy "access by store" on public.user_store_access
  for select using (
    public.is_platform_admin() or user_id = auth.uid()
  );

create policy "manage access as admin" on public.user_store_access
  for all using (public.is_platform_admin()) with check (true);

-- Pedidos policies
create policy "select pedidos by store access" on public.pedidos
  for select using (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = pedidos.store_id
    )
  );

create policy "insert pedidos by store access" on public.pedidos
  for insert with check (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = pedidos.store_id
    )
  );

create policy "update pedidos by store access" on public.pedidos
  for update using (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = pedidos.store_id
    )
  ) with check (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = pedidos.store_id
    )
  );

-- Itens policies
create policy "select itens by store access" on public.itens_pedido
  for select using (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = itens_pedido.store_id
    )
  );

create policy "insert itens by store access" on public.itens_pedido
  for insert with check (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = itens_pedido.store_id
    )
  );

create policy "update itens by store access" on public.itens_pedido
  for update using (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = itens_pedido.store_id
    )
  ) with check (
    public.is_platform_admin() or exists(
      select 1 from public.user_store_access usa
      where usa.user_id = auth.uid() and usa.store_id = itens_pedido.store_id
    )
  );

-- Snapshot triggers
create or replace function public.trg_set_pedido_snapshots() returns trigger as $$
declare
  cliente_nome text;
  cliente_phone text;
  endereco_json jsonb;
begin
  if NEW.customer_name_snapshot is null then
    select c.nome, c.celular into cliente_nome, cliente_phone from public.clientes c where c.id = NEW.cliente_id;
    NEW.customer_name_snapshot := coalesce(cliente_nome, NEW.customer_name_snapshot);
    NEW.customer_phone_snapshot := coalesce(cliente_phone, NEW.customer_phone_snapshot);
  end if;

  if NEW.delivery_address_snapshot is null and NEW.endereco_entrega_id is not null then
    select to_jsonb(e.*) into endereco_json from public.enderecos e where e.id = NEW.endereco_entrega_id;
    NEW.delivery_address_snapshot := endereco_json;
  end if;

  if NEW.created_at is null then
    NEW.created_at := now();
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_pedidos_snapshot on public.pedidos;
create trigger trg_pedidos_snapshot
before insert on public.pedidos
for each row execute function public.trg_set_pedido_snapshots();

create or replace function public.trg_set_item_snapshots() returns trigger as $$
declare
  produto_nome text;
  produto_preco numeric;
  pedido_store uuid;
begin
  select p.store_id into pedido_store from public.pedidos p where p.id = NEW.pedido_id;
  NEW.store_id := coalesce(NEW.store_id, pedido_store);

  if NEW.product_name_snapshot is null or NEW.unit_price_snapshot is null then
    select pr.nome, pr.preco into produto_nome, produto_preco from public.produtos pr where pr.id = NEW.produto_id;
    NEW.product_name_snapshot := coalesce(NEW.product_name_snapshot, produto_nome);
    NEW.unit_price_snapshot := coalesce(NEW.unit_price_snapshot, produto_preco, NEW.valor_unitario);
  end if;

  if NEW.created_at is null then
    NEW.created_at := now();
  end if;

  return NEW;
end;
$$ language plpgsql;

drop trigger if exists trg_itens_pedido_snapshot on public.itens_pedido;
create trigger trg_itens_pedido_snapshot
before insert on public.itens_pedido
for each row execute function public.trg_set_item_snapshots();

-- Basic indexes
create index if not exists idx_pedidos_store_id on public.pedidos(store_id);
create index if not exists idx_itens_pedido_store_id on public.itens_pedido(store_id);
create index if not exists idx_user_store_access_user_store on public.user_store_access(user_id, store_id);
