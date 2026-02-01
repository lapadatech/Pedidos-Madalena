
-- Enterprise migration for Pedidos Madalena
-- Idempotent: safe to run on new or existing databases.

-- 1) Extensions
create extension if not exists "pgcrypto";

-- 2) Base tables (create if missing)
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_roles (
  id text primary key,
  name text not null,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.platform_admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_store_access (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  role text not null references public.store_roles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, store_id)
);

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  celular text not null,
  email text,
  created_store_id uuid references public.stores(id),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  unique (celular)
);

create table if not exists public.enderecos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  rua text,
  numero text,
  complemento text,
  bairro text,
  cidade text,
  estado text,
  cep text,
  principal boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.categorias (
  id bigserial primary key,
  nome text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.grupos_complementos (
  id bigserial primary key,
  nome text not null,
  obrigatorio boolean not null default false,
  opcoes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  preco numeric not null default 0,
  ativo boolean not null default true,
  categoria_id bigint references public.categorias(id),
  grupos_complementos bigint[] not null default '{}'::bigint[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cor text not null default '#FF9921',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.pedidos (
  id bigserial primary key,
  public_id uuid not null default gen_random_uuid(),
  order_number int,
  store_id uuid not null references public.stores(id) on delete cascade,
  cliente_id uuid references public.clientes(id),
  data_entrega date,
  hora_entrega time,
  tipo_entrega text,
  status_pagamento text,
  status_entrega text,
  subtotal numeric not null default 0,
  frete numeric not null default 0,
  desconto numeric not null default 0,
  total numeric not null default 0,
  observacao_geral text,
  endereco_entrega_id uuid references public.enderecos(id),
  criado_por text,
  customer_name_snapshot text,
  customer_phone_snapshot text,
  delivery_address_snapshot jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.itens_pedido (
  id bigserial primary key,
  pedido_id bigint not null references public.pedidos(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  produto_id uuid references public.produtos(id),
  quantidade integer,
  observacao text,
  complementos jsonb,
  valor_unitario numeric not null default 0,
  product_name_snapshot text,
  unit_price_snapshot numeric,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pedido_tags (
  pedido_id bigint not null references public.pedidos(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (pedido_id, tag_id)
);

create table if not exists public.store_order_counters (
  store_id uuid primary key references public.stores(id) on delete cascade,
  last_number int not null default 0,
  updated_at timestamptz not null default now()
);
-- 3) Schema fixes for existing databases (columns, defaults, backfills)
do $$
begin
  if to_regclass('public.pedidos') is not null then
    alter table public.pedidos add column if not exists public_id uuid;
    alter table public.pedidos add column if not exists order_number int;
    alter table public.pedidos add column if not exists created_by uuid;
    alter table public.pedidos add column if not exists updated_by uuid;
    alter table public.pedidos add column if not exists updated_at timestamptz;

    update public.pedidos
    set public_id = coalesce(public_id, gen_random_uuid());

    update public.pedidos
    set subtotal = coalesce(subtotal, 0),
        frete = coalesce(frete, 0),
        desconto = coalesce(desconto, 0),
        total = coalesce(total, 0),
        updated_at = coalesce(updated_at, now());

    alter table public.pedidos alter column public_id set default gen_random_uuid();
    alter table public.pedidos alter column public_id set not null;
    alter table public.pedidos alter column subtotal set default 0;
    alter table public.pedidos alter column subtotal set not null;
    alter table public.pedidos alter column frete set default 0;
    alter table public.pedidos alter column frete set not null;
    alter table public.pedidos alter column desconto set default 0;
    alter table public.pedidos alter column desconto set not null;
    alter table public.pedidos alter column total set default 0;
    alter table public.pedidos alter column total set not null;
    alter table public.pedidos alter column updated_at set default now();
    alter table public.pedidos alter column updated_at set not null;
  end if;

  if to_regclass('public.itens_pedido') is not null then
    alter table public.itens_pedido add column if not exists created_by uuid;
    alter table public.itens_pedido add column if not exists updated_by uuid;
    alter table public.itens_pedido add column if not exists updated_at timestamptz;

    update public.itens_pedido
    set valor_unitario = coalesce(valor_unitario, 0),
        updated_at = coalesce(updated_at, now());

    alter table public.itens_pedido alter column valor_unitario set default 0;
    alter table public.itens_pedido alter column valor_unitario set not null;
    alter table public.itens_pedido alter column updated_at set default now();
    alter table public.itens_pedido alter column updated_at set not null;
  end if;

  if to_regclass('public.clientes') is not null then
    alter table public.clientes add column if not exists created_store_id uuid references public.stores(id);
    alter table public.clientes add column if not exists created_by uuid references auth.users(id);
    alter table public.clientes add column if not exists updated_at timestamptz;
    alter table public.clientes add column if not exists updated_by uuid;

    update public.clientes
    set updated_at = coalesce(updated_at, now());

    alter table public.clientes alter column updated_at set default now();
    alter table public.clientes alter column updated_at set not null;
  end if;

  if to_regclass('public.produtos') is not null then
    alter table public.produtos add column if not exists updated_at timestamptz;
    alter table public.produtos add column if not exists updated_by uuid;

    update public.produtos
    set updated_at = coalesce(updated_at, now());

    alter table public.produtos alter column updated_at set default now();
    alter table public.produtos alter column updated_at set not null;

    alter table public.produtos
      alter column grupos_complementos type bigint[]
      using grupos_complementos::bigint[];
  end if;

  if to_regclass('public.categorias') is not null then
    alter table public.categorias add column if not exists active boolean;
    update public.categorias
    set active = coalesce(active, true);
    alter table public.categorias alter column active set default true;
    alter table public.categorias alter column active set not null;
  end if;
end $$;

-- 3.1) FK constraints for created_by/updated_by (only if data is clean)
do $$
begin
  if to_regclass('public.pedidos') is not null then
    if not exists (select 1 from pg_constraint where conname = 'pedidos_created_by_fkey') then
      if not exists (
        select 1 from public.pedidos p
        where p.created_by is not null
          and not exists (select 1 from auth.users u where u.id = p.created_by)
      ) then
        alter table public.pedidos
          add constraint pedidos_created_by_fkey foreign key (created_by) references auth.users(id);
      end if;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_updated_by_fkey') then
      if not exists (
        select 1 from public.pedidos p
        where p.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = p.updated_by)
      ) then
        alter table public.pedidos
          add constraint pedidos_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.itens_pedido') is not null then
    if not exists (select 1 from pg_constraint where conname = 'itens_pedido_created_by_fkey') then
      if not exists (
        select 1 from public.itens_pedido i
        where i.created_by is not null
          and not exists (select 1 from auth.users u where u.id = i.created_by)
      ) then
        alter table public.itens_pedido
          add constraint itens_pedido_created_by_fkey foreign key (created_by) references auth.users(id);
      end if;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'itens_pedido_updated_by_fkey') then
      if not exists (
        select 1 from public.itens_pedido i
        where i.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = i.updated_by)
      ) then
        alter table public.itens_pedido
          add constraint itens_pedido_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.clientes') is not null then
    if not exists (select 1 from pg_constraint where conname = 'clientes_created_by_fkey') then
      if not exists (
        select 1 from public.clientes c
        where c.created_by is not null
          and not exists (select 1 from auth.users u where u.id = c.created_by)
      ) then
        alter table public.clientes
          add constraint clientes_created_by_fkey foreign key (created_by) references auth.users(id);
      end if;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'clientes_updated_by_fkey') then
      if not exists (
        select 1 from public.clientes c
        where c.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = c.updated_by)
      ) then
        alter table public.clientes
          add constraint clientes_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.enderecos') is not null then
    if not exists (select 1 from pg_constraint where conname = 'enderecos_updated_by_fkey') then
      if not exists (
        select 1 from public.enderecos e
        where e.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = e.updated_by)
      ) then
        alter table public.enderecos
          add constraint enderecos_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.categorias') is not null then
    if not exists (select 1 from pg_constraint where conname = 'categorias_updated_by_fkey') then
      if not exists (
        select 1 from public.categorias c
        where c.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = c.updated_by)
      ) then
        alter table public.categorias
          add constraint categorias_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.grupos_complementos') is not null then
    if not exists (select 1 from pg_constraint where conname = 'grupos_complementos_updated_by_fkey') then
      if not exists (
        select 1 from public.grupos_complementos g
        where g.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = g.updated_by)
      ) then
        alter table public.grupos_complementos
          add constraint grupos_complementos_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.produtos') is not null then
    if not exists (select 1 from pg_constraint where conname = 'produtos_updated_by_fkey') then
      if not exists (
        select 1 from public.produtos p
        where p.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = p.updated_by)
      ) then
        alter table public.produtos
          add constraint produtos_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;

  if to_regclass('public.tags') is not null then
    if not exists (select 1 from pg_constraint where conname = 'tags_updated_by_fkey') then
      if not exists (
        select 1 from public.tags t
        where t.updated_by is not null
          and not exists (select 1 from auth.users u where u.id = t.updated_by)
      ) then
        alter table public.tags
          add constraint tags_updated_by_fkey foreign key (updated_by) references auth.users(id);
      end if;
    end if;
  end if;
end $$;

-- Backfill order_number per store (idempotent)
with ranked as (
  select id,
         store_id,
         row_number() over (partition by store_id order by created_at, id) as rn
  from public.pedidos
)
update public.pedidos p
set order_number = r.rn
from ranked r
where p.id = r.id
  and p.order_number is null;

insert into public.store_order_counters (store_id, last_number)
select store_id, coalesce(max(order_number), 0)
from public.pedidos
group by store_id
on conflict (store_id) do update
set last_number = excluded.last_number,
    updated_at = now();

-- Enforce order_number not null if backfill is complete
do $$
begin
  if to_regclass('public.pedidos') is not null then
    if not exists (select 1 from public.pedidos where order_number is null) then
      alter table public.pedidos alter column order_number set not null;
    end if;
  end if;
end $$;

-- Normalize data types
alter table if exists public.pedidos
  alter column hora_entrega type time using nullif(hora_entrega::text, '')::time;

alter table if exists public.itens_pedido
  alter column quantidade type integer using nullif(quantidade::text, '')::integer;

-- 4) Indexes
create unique index if not exists pedidos_public_id_key on public.pedidos(public_id);
create unique index if not exists pedidos_store_order_number_key on public.pedidos(store_id, order_number);
create index if not exists idx_pedidos_store_created_at on public.pedidos(store_id, created_at desc);
create index if not exists idx_itens_pedido_pedido_id on public.itens_pedido(pedido_id);
create index if not exists idx_itens_pedido_store_id on public.itens_pedido(store_id);
create index if not exists idx_pedido_tags_pedido_id on public.pedido_tags(pedido_id);
create index if not exists idx_pedido_tags_tag_id on public.pedido_tags(tag_id);
create index if not exists idx_clientes_celular on public.clientes(celular);
create index if not exists idx_clientes_created_store_id on public.clientes(created_store_id);
create index if not exists idx_user_store_access_user_store on public.user_store_access(user_id, store_id);
create index if not exists idx_categorias_active on public.categorias(active);

-- 4.1) View: produtos disponiveis (ativos e com categoria ativa)
create or replace view public.v_produtos_disponiveis as
select p.*
from public.produtos p
left join public.categorias c on c.id = p.categoria_id
where p.ativo = true
  and (p.categoria_id is null or c.active = true);

-- 4.2) View: pedidos com _tag_ids (compatibilidade)
create or replace view public.v_pedidos as
select
  p.*,
  coalesce((
    select array_agg(pt.tag_id order by pt.tag_id)
    from public.pedido_tags pt
    where pt.pedido_id = p.id
  ), '{}'::uuid[]) as _tag_ids
from public.pedidos p;
-- 5) Utility functions (permissions)
create or replace function public.is_platform_admin()
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.platform_admin_profiles p
    where p.user_id = auth.uid()
  );
$$;

create or replace function public.has_store_access(p_store_id uuid)
returns boolean
language sql
stable
as $$
  select exists(
    select 1
    from public.user_store_access usa
    where usa.user_id = auth.uid()
      and usa.store_id = p_store_id
  );
$$;

create or replace function public.get_allowed_store_ids()
returns setof uuid
language sql
stable
as $$
  select usa.store_id
  from public.user_store_access usa
  where usa.user_id = auth.uid();
$$;

create or replace function public.normalize_permissions(p_permissions jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  v_result jsonb := '{}'::jsonb;
  v_module text;
  v_value jsonb;
  v_actions jsonb;
  v_read boolean;
  v_edit boolean;
  v_delete boolean;
  v_mapped text;
begin
  if p_permissions is null then
    return '{}'::jsonb;
  end if;

  for v_module, v_value in
    select key, value from jsonb_each(p_permissions)
  loop
    v_mapped := case v_module
      when 'pedidos' then 'orders'
      when 'clientes' then 'customers'
      when 'produtos' then 'products'
      when 'configuracoes' then 'settings'
      else v_module
    end;

    if v_value = '"*"'::jsonb then
      v_actions := jsonb_build_object(
        'read', true,
        'create', true,
        'update', true,
        'delete', true,
        'print', true,
        'status', true
      );
    elsif jsonb_typeof(v_value) = 'object' then
      if (v_value ? 'read') or (v_value ? 'create') or (v_value ? 'update') or (v_value ? 'delete')
        or (v_value ? 'print') or (v_value ? 'status') then
        v_actions := jsonb_build_object(
          'read', coalesce((v_value->>'read')::boolean, false),
          'create', coalesce((v_value->>'create')::boolean, false),
          'update', coalesce((v_value->>'update')::boolean, false),
          'delete', coalesce((v_value->>'delete')::boolean, false),
          'print', coalesce((v_value->>'print')::boolean, false),
          'status', coalesce((v_value->>'status')::boolean, false)
        );
      else
        v_read := coalesce((v_value->>'visualizar')::boolean, false)
          or coalesce((v_value->>'editar')::boolean, false)
          or coalesce((v_value->>'gerenciar')::boolean, false);
        v_edit := coalesce((v_value->>'editar')::boolean, false)
          or coalesce((v_value->>'gerenciar')::boolean, false);
        v_delete := coalesce((v_value->>'gerenciar')::boolean, false)
          or coalesce((v_value->>'excluir')::boolean, false);

        v_actions := jsonb_build_object(
          'read', v_read,
          'create', v_edit,
          'update', v_edit,
          'delete', v_delete,
          'print', v_read,
          'status', v_edit
        );
      end if;
    else
      v_actions := jsonb_build_object(
        'read', false,
        'create', false,
        'update', false,
        'delete', false,
        'print', false,
        'status', false
      );
    end if;

    v_result := v_result || jsonb_build_object(v_mapped, v_actions);
  end loop;

  return v_result;
end;
$$;

create or replace function public.can_store(p_store_id uuid, p_module text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select (sr.permissions -> p_module ->> p_action)::boolean
      from public.user_store_access usa
      join public.store_roles sr on sr.id = usa.role
      where usa.user_id = auth.uid()
        and usa.store_id = p_store_id
      limit 1
    ),
    false
  );
$$;

create or replace function public.can_any_store(p_module text, p_action text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.user_store_access usa
    join public.store_roles sr on sr.id = usa.role
    where usa.user_id = auth.uid()
      and coalesce((sr.permissions -> p_module ->> p_action)::boolean, false)
  );
$$;

-- Normalize permissions if needed
update public.store_roles
set permissions = public.normalize_permissions(permissions)
where permissions is not null
  and (
    permissions ? 'pedidos'
    or permissions ? 'clientes'
    or permissions ? 'produtos'
    or permissions ? 'configuracoes'
  );
-- 6) Triggers: snapshots, store_id enforcement, updated_at, totals
create or replace function public.trg_set_pedido_snapshots()
returns trigger
language plpgsql
as $$
declare
  cliente_nome text;
  cliente_phone text;
  endereco_json jsonb;
begin
  if new.customer_name_snapshot is null then
    select c.nome, c.celular into cliente_nome, cliente_phone
    from public.clientes c
    where c.id = new.cliente_id;
    new.customer_name_snapshot := coalesce(cliente_nome, new.customer_name_snapshot);
    new.customer_phone_snapshot := coalesce(cliente_phone, new.customer_phone_snapshot);
  end if;

  if new.delivery_address_snapshot is null and new.endereco_entrega_id is not null then
    select to_jsonb(e.*) into endereco_json
    from public.enderecos e
    where e.id = new.endereco_entrega_id;
    new.delivery_address_snapshot := endereco_json;
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  return new;
end;
$$;

create or replace function public.trg_set_item_snapshots()
returns trigger
language plpgsql
as $$
declare
  v_store_id uuid;
  v_prod_nome text;
  v_prod_preco numeric;
begin
  select p.store_id into v_store_id from public.pedidos p where p.id = new.pedido_id;
  new.store_id := v_store_id;

  if new.product_name_snapshot is null or new.unit_price_snapshot is null then
    select pr.nome, pr.preco into v_prod_nome, v_prod_preco
    from public.produtos pr
    where pr.id = new.produto_id;
    new.product_name_snapshot := coalesce(new.product_name_snapshot, v_prod_nome);
    new.unit_price_snapshot := coalesce(new.unit_price_snapshot, v_prod_preco, new.valor_unitario);
  end if;

  if new.created_at is null then
    new.created_at := now();
  end if;

  if new.created_by is null then
    new.created_by := auth.uid();
  end if;

  return new;
end;
$$;

create or replace function public.trg_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  if new.updated_by is null then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.recalc_order_totals(p_pedido_id bigint)
returns void
language plpgsql
as $$
declare
  v_subtotal numeric := 0;
  v_frete numeric := 0;
  v_desconto numeric := 0;
begin
  select coalesce(sum(coalesce(i.quantidade, 0) * coalesce(i.valor_unitario, 0)), 0)
  into v_subtotal
  from public.itens_pedido i
  where i.pedido_id = p_pedido_id;

  select coalesce(frete, 0), coalesce(desconto, 0)
  into v_frete, v_desconto
  from public.pedidos
  where id = p_pedido_id;

  update public.pedidos
  set subtotal = v_subtotal,
      total = v_subtotal + v_frete - v_desconto
  where id = p_pedido_id;
end;
$$;

create or replace function public.trg_recalc_order_totals()
returns trigger
language plpgsql
as $$
begin
  if (tg_op = 'DELETE') then
    perform public.recalc_order_totals(old.pedido_id);
    return old;
  end if;

  if (tg_op = 'UPDATE' and old.pedido_id is distinct from new.pedido_id) then
    perform public.recalc_order_totals(old.pedido_id);
  end if;

  perform public.recalc_order_totals(new.pedido_id);
  return new;
end;
$$;

-- Apply triggers (drop + recreate idempotently)
drop trigger if exists trg_pedidos_snapshot on public.pedidos;
create trigger trg_pedidos_snapshot
before insert or update on public.pedidos
for each row execute function public.trg_set_pedido_snapshots();

drop trigger if exists trg_itens_pedido_snapshot on public.itens_pedido;
create trigger trg_itens_pedido_snapshot
before insert or update on public.itens_pedido
for each row execute function public.trg_set_item_snapshots();

drop trigger if exists trg_pedidos_updated_at on public.pedidos;
create trigger trg_pedidos_updated_at
before update on public.pedidos
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_itens_pedido_updated_at on public.itens_pedido;
create trigger trg_itens_pedido_updated_at
before update on public.itens_pedido
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_clientes_updated_at on public.clientes;
create trigger trg_clientes_updated_at
before update on public.clientes
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_produtos_updated_at on public.produtos;
create trigger trg_produtos_updated_at
before update on public.produtos
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_tags_updated_at on public.tags;
create trigger trg_tags_updated_at
before update on public.tags
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_categorias_updated_at on public.categorias;
create trigger trg_categorias_updated_at
before update on public.categorias
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_grupos_complementos_updated_at on public.grupos_complementos;
create trigger trg_grupos_complementos_updated_at
before update on public.grupos_complementos
for each row execute function public.trg_set_updated_at();

drop trigger if exists trg_itens_pedido_recalc on public.itens_pedido;
create trigger trg_itens_pedido_recalc
after insert or update or delete on public.itens_pedido
for each row execute function public.trg_recalc_order_totals();
-- 7) RPCs: admin (platform admin only)
create or replace function public.create_store(p_name text, p_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_id uuid;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.stores (name, slug)
  values (p_name, p_slug)
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.update_store(p_store_id uuid, p_name text, p_slug text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.stores
  set name = coalesce(p_name, name),
      slug = coalesce(p_slug, slug),
      updated_at = now()
  where id = p_store_id;
end;
$$;

create or replace function public.toggle_store_active(p_store_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.stores
  set active = p_active,
      updated_at = now()
  where id = p_store_id;
end;
$$;

create or replace function public.create_role(p_role_id text, p_name text, p_permissions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.store_roles (id, name, permissions)
  values (p_role_id, p_name, public.normalize_permissions(p_permissions))
  on conflict (id) do nothing;
end;
$$;

create or replace function public.update_role(p_role_id text, p_name text, p_permissions jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.store_roles
  set name = coalesce(p_name, name),
      permissions = case
        when p_permissions is null then permissions
        else public.normalize_permissions(p_permissions)
      end,
      updated_at = now()
  where id = p_role_id;
end;
$$;

create or replace function public.grant_user_store_access(p_user_id uuid, p_store_id uuid, p_role_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.user_store_access (user_id, store_id, role)
  values (p_user_id, p_store_id, p_role_id)
  on conflict (user_id, store_id) do update
  set role = excluded.role,
      updated_at = now();
end;
$$;

create or replace function public.revoke_user_store_access(p_user_id uuid, p_store_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;
  if not public.is_platform_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.user_store_access
  where user_id = p_user_id and store_id = p_store_id;
end;
$$;

-- 8) RPCs: orders (validations, snapshots, totals)
create or replace function public.create_order(p_store_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_cliente_id uuid;
  v_pedido_id bigint;
  v_public_id uuid;
  v_order_number int;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_frete numeric := coalesce(nullif(p_payload->>'frete','')::numeric, 0);
  v_desconto numeric := coalesce(nullif(p_payload->>'desconto','')::numeric, 0);
  v_status_pagamento text := coalesce(nullif(p_payload->>'status_pagamento',''), 'Nao Pago');
  v_status_entrega text := coalesce(nullif(p_payload->>'status_entrega',''), 'Nao Entregue');
  v_itens jsonb := coalesce(p_payload->'itens', '[]'::jsonb);
  v_item jsonb;
  v_unit numeric;
  v_qty integer;
  v_item_total numeric;
  v_produto_id uuid;
  v_prod_nome text;
  v_prod_preco numeric;
  v_prod_ativo boolean;
  v_cat_active boolean;
  v_celular text;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_store(p_store_id, 'orders', 'create') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_frete < 0 or v_desconto < 0 then
    raise exception 'frete/desconto invalid' using errcode = '22023';
  end if;

  v_cliente_id := nullif(p_payload->>'cliente_id','')::uuid;

  if v_cliente_id is null and (p_payload ? 'cliente') then
    if (p_payload->'cliente' ? 'id') then
      v_cliente_id := nullif(p_payload->'cliente'->>'id','')::uuid;
    end if;

    if v_cliente_id is null and (p_payload->'cliente' ? 'celular') then
      v_celular := nullif(p_payload->'cliente'->>'celular','');
      if v_celular is not null then
        select c.id into v_cliente_id
        from public.clientes c
        where c.celular = v_celular;

        if v_cliente_id is null then
          if not public.can_any_store('customers', 'create') then
            raise exception 'forbidden' using errcode = '42501';
          end if;

          insert into public.clientes (nome, celular, email, created_store_id, created_by)
          values (
            coalesce(nullif(p_payload->'cliente'->>'nome',''), 'CLIENTE'),
            v_celular,
            nullif(p_payload->'cliente'->>'email',''),
            p_store_id,
            v_user_id
          )
          returning id into v_cliente_id;
        end if;
      end if;
    end if;
  end if;

  -- Atomic order number per store
  insert into public.store_order_counters (store_id, last_number)
  values (p_store_id, 1)
  on conflict (store_id) do update
  set last_number = public.store_order_counters.last_number + 1,
      updated_at = now()
  returning last_number into v_order_number;

  insert into public.pedidos (
    store_id,
    cliente_id,
    data_entrega,
    hora_entrega,
    tipo_entrega,
    status_pagamento,
    status_entrega,
    frete,
    desconto,
    observacao_geral,
    endereco_entrega_id,
    criado_por,
    order_number,
    created_by,
    updated_by
  ) values (
    p_store_id,
    v_cliente_id,
    nullif(p_payload->>'data_entrega','')::date,
    nullif(p_payload->>'hora_entrega','')::time,
    nullif(p_payload->>'tipo_entrega',''),
    v_status_pagamento,
    v_status_entrega,
    v_frete,
    v_desconto,
    nullif(p_payload->>'observacao_geral',''),
    nullif(p_payload->>'endereco_entrega_id','')::uuid,
    nullif(p_payload->>'criado_por',''),
    v_order_number,
    v_user_id,
    v_user_id
  )
  returning id, public_id into v_pedido_id, v_public_id;

  for v_item in select * from jsonb_array_elements(v_itens)
  loop
    v_produto_id := nullif(v_item->>'produto_id','')::uuid;
    v_qty := nullif(v_item->>'quantidade','')::integer;
    v_unit := nullif(v_item->>'valor_unitario','')::numeric;

    if v_produto_id is null then
      raise exception 'produto_id obrigatorio' using errcode = '22023';
    end if;

    if v_qty is null or v_qty < 1 then
      raise exception 'quantidade invalida' using errcode = '22023';
    end if;

    if v_unit is not null and v_unit < 0 then
      raise exception 'valor_unitario invalido' using errcode = '22023';
    end if;

    select pr.nome, pr.preco, pr.ativo, c.active
    into v_prod_nome, v_prod_preco, v_prod_ativo, v_cat_active
    from public.produtos pr
    left join public.categorias c on c.id = pr.categoria_id
    where pr.id = v_produto_id;

    if v_prod_nome is null then
      raise exception 'produto nao encontrado' using errcode = 'P0002';
    end if;

    if v_prod_ativo is not null and v_prod_ativo = false then
      raise exception 'produto inativo' using errcode = '22023';
    end if;
    if v_cat_active = false then
      raise exception 'Produto indisponivel (categoria desativada)' using errcode = '22023';
    end if;

    if v_unit is null or v_unit = 0 then
      v_unit := coalesce(v_prod_preco, 0);
    end if;

    v_item_total := v_qty * v_unit;
    v_subtotal := v_subtotal + v_item_total;

    insert into public.itens_pedido (
      pedido_id,
      store_id,
      produto_id,
      quantidade,
      observacao,
      complementos,
      valor_unitario,
      product_name_snapshot,
      unit_price_snapshot,
      created_by,
      updated_by
    ) values (
      v_pedido_id,
      p_store_id,
      v_produto_id,
      v_qty,
      nullif(v_item->>'observacao',''),
      v_item->'complementos',
      v_unit,
      v_prod_nome,
      coalesce(v_prod_preco, v_unit),
      v_user_id,
      v_user_id
    );
  end loop;

  v_total := v_subtotal + v_frete - v_desconto;
  if v_total < 0 then
    raise exception 'total negativo' using errcode = '22023';
  end if;

  update public.pedidos
  set subtotal = v_subtotal,
      total = v_total,
      updated_by = v_user_id
  where id = v_pedido_id;

  if (p_payload ? 'tag_ids') then
    insert into public.pedido_tags (pedido_id, tag_id)
    select v_pedido_id, (value::text)::uuid
    from jsonb_array_elements_text(p_payload->'tag_ids')
    on conflict do nothing;
  end if;

  return jsonb_build_object(
    'ok', true,
    'pedido_id', v_pedido_id,
    'public_id', v_public_id,
    'order_number', v_order_number
  );
end;
$$;

create or replace function public.update_order(p_pedido_id bigint, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_store_id uuid;
  v_cliente_id uuid;
  v_subtotal numeric := 0;
  v_total numeric := 0;
  v_frete numeric := nullif(p_payload->>'frete','')::numeric;
  v_desconto numeric := nullif(p_payload->>'desconto','')::numeric;
  v_itens jsonb := p_payload->'itens';
  v_item jsonb;
  v_unit numeric;
  v_qty integer;
  v_item_total numeric;
  v_produto_id uuid;
  v_prod_nome text;
  v_prod_preco numeric;
  v_prod_ativo boolean;
  v_cat_active boolean;
  v_status_pagamento text := nullif(p_payload->>'status_pagamento','');
  v_status_entrega text := nullif(p_payload->>'status_entrega','');
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select store_id into v_store_id
  from public.pedidos
  where id = p_pedido_id;

  if v_store_id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if not public.can_store(v_store_id, 'orders', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if (p_payload ? 'status_pagamento') or (p_payload ? 'status_entrega') then
    if not public.can_store(v_store_id, 'orders', 'status') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  if v_frete is not null and v_frete < 0 then
    raise exception 'frete invalido' using errcode = '22023';
  end if;

  if v_desconto is not null and v_desconto < 0 then
    raise exception 'desconto invalido' using errcode = '22023';
  end if;

  if (p_payload ? 'cliente_id')
    or (p_payload ? 'cliente' and (p_payload->'cliente' ? 'id'))
    or (p_payload ? 'endereco_entrega_id')
  then
    if not public.can_any_store('customers', 'update') then
      raise exception 'forbidden' using errcode = '42501';
    end if;
  end if;

  v_cliente_id := nullif(p_payload->>'cliente_id','')::uuid;
  if v_cliente_id is null and (p_payload ? 'cliente') and (p_payload->'cliente' ? 'id') then
    v_cliente_id := nullif(p_payload->'cliente'->>'id','')::uuid;
  end if;

  update public.pedidos
  set cliente_id = coalesce(v_cliente_id, cliente_id),
      data_entrega = coalesce(nullif(p_payload->>'data_entrega','')::date, data_entrega),
      hora_entrega = coalesce(nullif(p_payload->>'hora_entrega','')::time, hora_entrega),
      tipo_entrega = coalesce(nullif(p_payload->>'tipo_entrega',''), tipo_entrega),
      status_pagamento = coalesce(v_status_pagamento, status_pagamento),
      status_entrega = coalesce(v_status_entrega, status_entrega),
      frete = coalesce(v_frete, frete),
      desconto = coalesce(v_desconto, desconto),
      observacao_geral = coalesce(nullif(p_payload->>'observacao_geral',''), observacao_geral),
      endereco_entrega_id = coalesce(nullif(p_payload->>'endereco_entrega_id','')::uuid, endereco_entrega_id),
      updated_by = v_user_id
  where id = p_pedido_id;

  if (p_payload ? 'itens') then
    delete from public.itens_pedido where pedido_id = p_pedido_id;

    for v_item in select * from jsonb_array_elements(coalesce(v_itens, '[]'::jsonb))
    loop
      v_produto_id := nullif(v_item->>'produto_id','')::uuid;
      v_qty := nullif(v_item->>'quantidade','')::integer;
      v_unit := nullif(v_item->>'valor_unitario','')::numeric;

      if v_produto_id is null then
        raise exception 'produto_id obrigatorio' using errcode = '22023';
      end if;

      if v_qty is null or v_qty < 1 then
        raise exception 'quantidade invalida' using errcode = '22023';
      end if;

      if v_unit is not null and v_unit < 0 then
        raise exception 'valor_unitario invalido' using errcode = '22023';
      end if;

      select pr.nome, pr.preco, pr.ativo, c.active
      into v_prod_nome, v_prod_preco, v_prod_ativo, v_cat_active
      from public.produtos pr
      left join public.categorias c on c.id = pr.categoria_id
      where pr.id = v_produto_id;

      if v_prod_nome is null then
        raise exception 'produto nao encontrado' using errcode = 'P0002';
      end if;

      if v_prod_ativo is not null and v_prod_ativo = false then
        raise exception 'produto inativo' using errcode = '22023';
      end if;
      if v_cat_active = false then
        raise exception 'Produto indisponivel (categoria desativada)' using errcode = '22023';
      end if;

      if v_unit is null or v_unit = 0 then
        v_unit := coalesce(v_prod_preco, 0);
      end if;

      v_item_total := v_qty * v_unit;
      v_subtotal := v_subtotal + v_item_total;

      insert into public.itens_pedido (
        pedido_id,
        store_id,
        produto_id,
        quantidade,
        observacao,
        complementos,
        valor_unitario,
        product_name_snapshot,
        unit_price_snapshot,
        created_by,
        updated_by
      ) values (
        p_pedido_id,
        v_store_id,
        v_produto_id,
        v_qty,
        nullif(v_item->>'observacao',''),
        v_item->'complementos',
        v_unit,
        v_prod_nome,
        coalesce(v_prod_preco, v_unit),
        v_user_id,
        v_user_id
      );
    end loop;
  else
    select subtotal into v_subtotal
    from public.pedidos
    where id = p_pedido_id;
  end if;

  select coalesce(frete, 0), coalesce(desconto, 0)
  into v_frete, v_desconto
  from public.pedidos
  where id = p_pedido_id;

  v_total := v_subtotal + v_frete - v_desconto;
  if v_total < 0 then
    raise exception 'total negativo' using errcode = '22023';
  end if;

  update public.pedidos
  set subtotal = v_subtotal,
      total = v_total,
      updated_by = v_user_id
  where id = p_pedido_id;

  if (p_payload ? 'tag_ids') then
    delete from public.pedido_tags where pedido_id = p_pedido_id;
    insert into public.pedido_tags (pedido_id, tag_id)
    select p_pedido_id, (value::text)::uuid
    from jsonb_array_elements_text(p_payload->'tag_ids')
    on conflict do nothing;
  end if;

  return jsonb_build_object('ok', true, 'pedido_id', p_pedido_id);
end;
$$;

create or replace function public.set_order_status(p_pedido_id bigint, p_status_pagamento text, p_status_entrega text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_status_pagamento text := nullif(p_status_pagamento,'');
  v_status_entrega text := nullif(p_status_entrega,'');
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select store_id into v_store_id
  from public.pedidos
  where id = p_pedido_id;

  if v_store_id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if not public.can_store(v_store_id, 'orders', 'status') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_status_pagamento is not null and v_status_pagamento not in ('Nao Pago', 'Pago') then
    raise exception 'status_pagamento invalido' using errcode = '22023';
  end if;

  if v_status_entrega is not null and v_status_entrega not in ('Nao Entregue', 'Entregue') then
    raise exception 'status_entrega invalido' using errcode = '22023';
  end if;

  update public.pedidos
  set status_pagamento = coalesce(v_status_pagamento, status_pagamento),
      status_entrega = coalesce(v_status_entrega, status_entrega),
      updated_by = auth.uid()
  where id = p_pedido_id;
end;
$$;

create or replace function public.set_payment_status(p_pedido_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_status text := nullif(p_status,'');
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select store_id into v_store_id
  from public.pedidos
  where id = p_pedido_id;

  if v_store_id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if not public.can_store(v_store_id, 'orders', 'status') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('Nao Pago', 'Pago') then
    raise exception 'status_pagamento invalido' using errcode = '22023';
  end if;

  update public.pedidos
  set status_pagamento = coalesce(v_status, status_pagamento),
      updated_by = auth.uid()
  where id = p_pedido_id;
end;
$$;

create or replace function public.set_delivery_status(p_pedido_id bigint, p_status text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
  v_status text := nullif(p_status,'');
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select store_id into v_store_id
  from public.pedidos
  where id = p_pedido_id;

  if v_store_id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if not public.can_store(v_store_id, 'orders', 'status') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if v_status is not null and v_status not in ('Nao Entregue', 'Entregue') then
    raise exception 'status_entrega invalido' using errcode = '22023';
  end if;

  update public.pedidos
  set status_entrega = coalesce(v_status, status_entrega),
      updated_by = auth.uid()
  where id = p_pedido_id;
end;
$$;

-- 9) RPCs: read helpers (orders with items/tags)
create or replace function public.get_orders(
  p_store_id uuid,
  p_filters jsonb default '{}'::jsonb,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status_pagamento text := nullif(p_filters->>'status_pagamento','');
  v_status_entrega text := nullif(p_filters->>'status_entrega','');
  v_tipo_entrega text := nullif(p_filters->>'tipo_entrega','');
  v_search text := nullif(p_filters->>'search','');
  v_from_date date := nullif(p_filters->>'from_date','')::date;
  v_to_date date := nullif(p_filters->>'to_date','')::date;
  v_orders jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_store(p_store_id, 'orders', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(order_row), '[]'::jsonb) into v_orders
  from (
    select jsonb_build_object(
      'id', p.id,
      'public_id', p.public_id,
      'order_number', p.order_number,
      'store_id', p.store_id,
      'cliente_id', p.cliente_id,
      'data_entrega', p.data_entrega,
      'hora_entrega', p.hora_entrega,
      'tipo_entrega', p.tipo_entrega,
      'status_pagamento', p.status_pagamento,
      'status_entrega', p.status_entrega,
      'subtotal', p.subtotal,
      'frete', p.frete,
      'desconto', p.desconto,
      'total', p.total,
      'observacao_geral', p.observacao_geral,
      'endereco_entrega_id', p.endereco_entrega_id,
      'customer_name_snapshot', p.customer_name_snapshot,
      'customer_phone_snapshot', p.customer_phone_snapshot,
      'delivery_address_snapshot', p.delivery_address_snapshot,
      'created_at', p.created_at,
      'updated_at', p.updated_at,
      'itens', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', i.id,
          'produto_id', i.produto_id,
          'quantidade', i.quantidade,
          'observacao', i.observacao,
          'complementos', i.complementos,
          'valor_unitario', i.valor_unitario,
          'product_name_snapshot', i.product_name_snapshot,
          'unit_price_snapshot', i.unit_price_snapshot
        ) order by i.id)
        from public.itens_pedido i
        where i.pedido_id = p.id
      ), '[]'::jsonb),
      'tags', coalesce((
        select jsonb_agg(jsonb_build_object(
          'id', t.id,
          'nome', t.nome,
          'cor', t.cor
        ) order by t.nome)
        from public.pedido_tags pt
        join public.tags t on t.id = pt.tag_id
        where pt.pedido_id = p.id
      ), '[]'::jsonb)
    ) as order_row
    from public.pedidos p
    where p.store_id = p_store_id
      and (v_status_pagamento is null or p.status_pagamento = v_status_pagamento)
      and (v_status_entrega is null or p.status_entrega = v_status_entrega)
      and (v_tipo_entrega is null or p.tipo_entrega = v_tipo_entrega)
      and (v_from_date is null or p.data_entrega >= v_from_date)
      and (v_to_date is null or p.data_entrega <= v_to_date)
      and (
        v_search is null
        or p.order_number::text = v_search
        or p.id::text = v_search
        or p.customer_name_snapshot ilike '%' || v_search || '%'
      )
    order by p.created_at desc
    limit greatest(p_limit, 1) offset greatest(p_offset, 0)
  ) s;

  return v_orders;
end;
$$;

create or replace function public.get_order_by_public_id(p_store_id uuid, p_public_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_store(p_store_id, 'orders', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'public_id', p.public_id,
    'order_number', p.order_number,
    'store_id', p.store_id,
    'cliente_id', p.cliente_id,
    'data_entrega', p.data_entrega,
    'hora_entrega', p.hora_entrega,
    'tipo_entrega', p.tipo_entrega,
    'status_pagamento', p.status_pagamento,
    'status_entrega', p.status_entrega,
    'subtotal', p.subtotal,
    'frete', p.frete,
    'desconto', p.desconto,
    'total', p.total,
    'observacao_geral', p.observacao_geral,
    'endereco_entrega_id', p.endereco_entrega_id,
    'customer_name_snapshot', p.customer_name_snapshot,
    'customer_phone_snapshot', p.customer_phone_snapshot,
    'delivery_address_snapshot', p.delivery_address_snapshot,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'produto_id', i.produto_id,
        'quantidade', i.quantidade,
        'observacao', i.observacao,
        'complementos', i.complementos,
        'valor_unitario', i.valor_unitario,
        'product_name_snapshot', i.product_name_snapshot,
        'unit_price_snapshot', i.unit_price_snapshot
      ) order by i.id)
      from public.itens_pedido i
      where i.pedido_id = p.id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'nome', t.nome,
        'cor', t.cor
      ) order by t.nome)
      from public.pedido_tags pt
      join public.tags t on t.id = pt.tag_id
      where pt.pedido_id = p.id
    ), '[]'::jsonb)
  ) into v_order
  from public.pedidos p
  where p.store_id = p_store_id
    and p.public_id = p_public_id;

  if v_order is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

create or replace function public.get_order_by_id(p_store_id uuid, p_pedido_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_store(p_store_id, 'orders', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'public_id', p.public_id,
    'order_number', p.order_number,
    'store_id', p.store_id,
    'cliente_id', p.cliente_id,
    'data_entrega', p.data_entrega,
    'hora_entrega', p.hora_entrega,
    'tipo_entrega', p.tipo_entrega,
    'status_pagamento', p.status_pagamento,
    'status_entrega', p.status_entrega,
    'subtotal', p.subtotal,
    'frete', p.frete,
    'desconto', p.desconto,
    'total', p.total,
    'observacao_geral', p.observacao_geral,
    'endereco_entrega_id', p.endereco_entrega_id,
    'customer_name_snapshot', p.customer_name_snapshot,
    'customer_phone_snapshot', p.customer_phone_snapshot,
    'delivery_address_snapshot', p.delivery_address_snapshot,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'produto_id', i.produto_id,
        'quantidade', i.quantidade,
        'observacao', i.observacao,
        'complementos', i.complementos,
        'valor_unitario', i.valor_unitario,
        'product_name_snapshot', i.product_name_snapshot,
        'unit_price_snapshot', i.unit_price_snapshot
      ) order by i.id)
      from public.itens_pedido i
      where i.pedido_id = p.id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'nome', t.nome,
        'cor', t.cor
      ) order by t.nome)
      from public.pedido_tags pt
      join public.tags t on t.id = pt.tag_id
      where pt.pedido_id = p.id
    ), '[]'::jsonb)
  ) into v_order
  from public.pedidos p
  where p.store_id = p_store_id
    and p.id = p_pedido_id;

  if v_order is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

-- 9.1) RPCs: customers and addresses (global data, permissions enforced)
create or replace function public.create_customer(p_store_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.clientes%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('customers', 'create') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_store_id is not null and not public.has_store_access(p_store_id) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.clientes (nome, celular, email, created_store_id, created_by)
  values (
    coalesce(nullif(p_payload->>'nome',''), 'CLIENTE'),
    nullif(p_payload->>'celular',''),
    nullif(p_payload->>'email',''),
    p_store_id,
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_customer(p_cliente_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.clientes%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('customers', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.clientes
  set nome = coalesce(nullif(p_payload->>'nome',''), nome),
      celular = coalesce(nullif(p_payload->>'celular',''), celular),
      email = coalesce(nullif(p_payload->>'email',''), email),
      updated_by = v_user_id
  where id = p_cliente_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'customer not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_customer(p_cliente_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('customers', 'delete') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.enderecos where cliente_id = p_cliente_id;
  delete from public.clientes where id = p_cliente_id;
end;
$$;

create or replace function public.create_address(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.enderecos%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('customers', 'create') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if nullif(p_payload->>'cliente_id','') is null then
    raise exception 'cliente_id obrigatorio' using errcode = '22023';
  end if;

  insert into public.enderecos (
    cliente_id, rua, numero, complemento, bairro, cidade, estado, cep, principal
  ) values (
    nullif(p_payload->>'cliente_id','')::uuid,
    nullif(p_payload->>'rua',''),
    nullif(p_payload->>'numero',''),
    nullif(p_payload->>'complemento',''),
    nullif(p_payload->>'bairro',''),
    nullif(p_payload->>'cidade',''),
    nullif(p_payload->>'estado',''),
    nullif(p_payload->>'cep',''),
    coalesce(nullif(p_payload->>'principal','')::boolean, false)
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_address(p_endereco_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.enderecos%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('customers', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.enderecos
  set rua = coalesce(nullif(p_payload->>'rua',''), rua),
      numero = coalesce(nullif(p_payload->>'numero',''), numero),
      complemento = coalesce(nullif(p_payload->>'complemento',''), complemento),
      bairro = coalesce(nullif(p_payload->>'bairro',''), bairro),
      cidade = coalesce(nullif(p_payload->>'cidade',''), cidade),
      estado = coalesce(nullif(p_payload->>'estado',''), estado),
      cep = coalesce(nullif(p_payload->>'cep',''), cep),
      principal = coalesce(nullif(p_payload->>'principal','')::boolean, principal),
      updated_by = v_user_id
  where id = p_endereco_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'address not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_address(p_endereco_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('customers', 'delete') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.enderecos where id = p_endereco_id;
end;
$$;

-- 9.2) RPCs: products (global data, permissions enforced)
create or replace function public.create_product(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.produtos%rowtype;
  v_grupos bigint[];
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('products', 'create') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(array_agg(value::bigint), '{}'::bigint[])
  into v_grupos
  from jsonb_array_elements_text(coalesce(p_payload->'grupos_complementos','[]'::jsonb)) as value;

  insert into public.produtos (nome, preco, ativo, categoria_id, grupos_complementos, updated_by)
  values (
    nullif(p_payload->>'nome',''),
    coalesce(nullif(p_payload->>'preco','')::numeric, 0),
    coalesce(nullif(p_payload->>'ativo','')::boolean, true),
    nullif(p_payload->>'categoria_id','')::bigint,
    v_grupos,
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_product(p_produto_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.produtos%rowtype;
  v_grupos bigint[];
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('products', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(array_agg(value::bigint), '{}'::bigint[])
  into v_grupos
  from jsonb_array_elements_text(coalesce(p_payload->'grupos_complementos','[]'::jsonb)) as value;

  update public.produtos
  set nome = coalesce(nullif(p_payload->>'nome',''), nome),
      preco = coalesce(nullif(p_payload->>'preco','')::numeric, preco),
      ativo = coalesce(nullif(p_payload->>'ativo','')::boolean, ativo),
      categoria_id = coalesce(nullif(p_payload->>'categoria_id','')::bigint, categoria_id),
      grupos_complementos = coalesce(v_grupos, grupos_complementos),
      updated_by = v_user_id
  where id = p_produto_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'product not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_product(p_produto_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('products', 'delete') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.produtos where id = p_produto_id;
end;
$$;

create or replace function public.get_products(p_filters jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome text := nullif(p_filters->>'nome','');
  v_categoria_id bigint := nullif(p_filters->>'categoria_id','')::bigint;
  v_status text := coalesce(nullif(p_filters->>'status',''), 'ativo');
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('products', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(row_data), '[]'::jsonb)
  into v_rows
  from (
    select jsonb_build_object(
      'id', p.id,
      'nome', p.nome,
      'preco', p.preco,
      'ativo', p.ativo,
      'categoria_id', p.categoria_id,
      'grupos_complementos', p.grupos_complementos,
      'categoria_active', case
        when p.categoria_id is null then true
        else coalesce(c.active, true)
      end,
      'created_at', p.created_at,
      'updated_at', p.updated_at
    ) as row_data
    from public.produtos p
    left join public.categorias c on c.id = p.categoria_id
    where (v_nome is null or p.nome ilike '%' || v_nome || '%')
      and (v_categoria_id is null or p.categoria_id = v_categoria_id)
      and (
        v_status = 'all'
        or (v_status = 'ativo' and (p.ativo = true and (p.categoria_id is null or coalesce(c.active, true) = true)))
        or (v_status = 'inativo' and not (p.ativo = true and (p.categoria_id is null or coalesce(c.active, true) = true)))
      )
    order by p.nome asc
  ) s;

  return v_rows;
end;
$$;

-- 9.2.1) RPCs: settings read helpers
create or replace function public.get_tags()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.nome), '[]'::jsonb)
  into v_rows
  from public.tags t;

  return v_rows;
end;
$$;

create or replace function public.get_categories()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(c) order by c.nome), '[]'::jsonb)
  into v_rows
  from public.categorias c;

  return v_rows;
end;
$$;

create or replace function public.get_grupos_complementos()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'read') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(to_jsonb(g) order by g.nome), '[]'::jsonb)
  into v_rows
  from public.grupos_complementos g;

  return v_rows;
end;
$$;

-- 9.3) RPCs: settings (tags, categorias, grupos_complementos)
create or replace function public.create_category(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.categorias%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.categorias (nome, active, updated_by)
  values (
    nullif(p_payload->>'nome',''),
    coalesce(nullif(p_payload->>'active','')::boolean, true),
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_category(p_categoria_id bigint, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.categorias%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.categorias
  set nome = coalesce(nullif(p_payload->>'nome',''), nome),
      active = coalesce(nullif(p_payload->>'active','')::boolean, active),
      updated_by = v_user_id
  where id = p_categoria_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'category not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_category(p_categoria_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.categorias where id = p_categoria_id;
end;
$$;

create or replace function public.create_tag(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.tags%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.tags (nome, cor, updated_by)
  values (nullif(p_payload->>'nome',''), coalesce(nullif(p_payload->>'cor',''), '#FF9921'), v_user_id)
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_tag(p_tag_id uuid, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.tags%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.tags
  set nome = coalesce(nullif(p_payload->>'nome',''), nome),
      cor = coalesce(nullif(p_payload->>'cor',''), cor),
      updated_by = v_user_id
  where id = p_tag_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'tag not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_tag(p_tag_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.tags where id = p_tag_id;
end;
$$;

create or replace function public.create_grupo_complemento(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.grupos_complementos%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.grupos_complementos (nome, obrigatorio, opcoes, updated_by)
  values (
    nullif(p_payload->>'nome',''),
    coalesce(nullif(p_payload->>'obrigatorio','')::boolean, false),
    coalesce(p_payload->'opcoes', '[]'::jsonb),
    v_user_id
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.update_grupo_complemento(p_grupo_id bigint, p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_row public.grupos_complementos%rowtype;
begin
  if v_user_id is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.grupos_complementos
  set nome = coalesce(nullif(p_payload->>'nome',''), nome),
      obrigatorio = coalesce(nullif(p_payload->>'obrigatorio','')::boolean, obrigatorio),
      opcoes = coalesce(p_payload->'opcoes', opcoes),
      updated_by = v_user_id
  where id = p_grupo_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'grupo not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

create or replace function public.delete_grupo_complemento(p_grupo_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_any_store('settings', 'update') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.grupos_complementos where id = p_grupo_id;
end;
$$;

-- 9.4) RPCs: print (reserved for future endpoints)
create or replace function public.get_order_print(p_store_id uuid, p_pedido_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order jsonb;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  if not public.can_store(p_store_id, 'orders', 'print') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', p.id,
    'public_id', p.public_id,
    'order_number', p.order_number,
    'store_id', p.store_id,
    'cliente_id', p.cliente_id,
    'data_entrega', p.data_entrega,
    'hora_entrega', p.hora_entrega,
    'tipo_entrega', p.tipo_entrega,
    'status_pagamento', p.status_pagamento,
    'status_entrega', p.status_entrega,
    'subtotal', p.subtotal,
    'frete', p.frete,
    'desconto', p.desconto,
    'total', p.total,
    'observacao_geral', p.observacao_geral,
    'endereco_entrega_id', p.endereco_entrega_id,
    'customer_name_snapshot', p.customer_name_snapshot,
    'customer_phone_snapshot', p.customer_phone_snapshot,
    'delivery_address_snapshot', p.delivery_address_snapshot,
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'itens', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', i.id,
        'produto_id', i.produto_id,
        'quantidade', i.quantidade,
        'observacao', i.observacao,
        'complementos', i.complementos,
        'valor_unitario', i.valor_unitario,
        'product_name_snapshot', i.product_name_snapshot,
        'unit_price_snapshot', i.unit_price_snapshot
      ) order by i.id)
      from public.itens_pedido i
      where i.pedido_id = p.id
    ), '[]'::jsonb),
    'tags', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', t.id,
        'nome', t.nome,
        'cor', t.cor
      ) order by t.nome)
      from public.pedido_tags pt
      join public.tags t on t.id = pt.tag_id
      where pt.pedido_id = p.id
    ), '[]'::jsonb)
  ) into v_order
  from public.pedidos p
  where p.store_id = p_store_id
    and p.id = p_pedido_id;

  if v_order is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

-- 10) Constraints and checks (safety)
do $$
begin
  if to_regclass('public.pedidos') is not null then
    if not exists (select 1 from pg_constraint where conname = 'pedidos_subtotal_nonneg') then
      alter table public.pedidos
        add constraint pedidos_subtotal_nonneg check (subtotal >= 0);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_total_nonneg') then
      alter table public.pedidos
        add constraint pedidos_total_nonneg check (total >= 0);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_frete_nonneg') then
      alter table public.pedidos
        add constraint pedidos_frete_nonneg check (frete >= 0);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_desconto_nonneg') then
      alter table public.pedidos
        add constraint pedidos_desconto_nonneg check (desconto >= 0);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_tipo_entrega_check') then
      alter table public.pedidos
        add constraint pedidos_tipo_entrega_check check (
          tipo_entrega is null or tipo_entrega in ('retirada', 'entrega')
        );
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_status_pagamento_check') then
      alter table public.pedidos
        add constraint pedidos_status_pagamento_check check (
          status_pagamento is null or status_pagamento in ('Nao Pago', 'Pago')
        );
    end if;
    if not exists (select 1 from pg_constraint where conname = 'pedidos_status_entrega_check') then
      alter table public.pedidos
        add constraint pedidos_status_entrega_check check (
          status_entrega is null or status_entrega in ('Nao Entregue', 'Entregue')
        );
    end if;
  end if;

  if to_regclass('public.itens_pedido') is not null then
    if not exists (select 1 from pg_constraint where conname = 'itens_pedido_quantidade_check') then
      alter table public.itens_pedido
        add constraint itens_pedido_quantidade_check check (quantidade is null or quantidade >= 1);
    end if;
    if not exists (select 1 from pg_constraint where conname = 'itens_pedido_valor_unitario_check') then
      alter table public.itens_pedido
        add constraint itens_pedido_valor_unitario_check check (valor_unitario >= 0);
    end if;
  end if;
end $$;

-- 11) RLS enable + FORCE + policies (no recursion)
alter table if exists public.pedidos enable row level security;
alter table if exists public.pedidos force row level security;

alter table if exists public.itens_pedido enable row level security;
alter table if exists public.itens_pedido force row level security;

alter table if exists public.pedido_tags enable row level security;
alter table if exists public.pedido_tags force row level security;

alter table if exists public.clientes enable row level security;
alter table if exists public.clientes force row level security;

alter table if exists public.enderecos enable row level security;
alter table if exists public.enderecos force row level security;

alter table if exists public.produtos enable row level security;
alter table if exists public.produtos force row level security;

alter table if exists public.tags enable row level security;
alter table if exists public.tags force row level security;

alter table if exists public.categorias enable row level security;
alter table if exists public.categorias force row level security;

alter table if exists public.grupos_complementos enable row level security;
alter table if exists public.grupos_complementos force row level security;

alter table if exists public.user_store_access enable row level security;
alter table if exists public.user_store_access force row level security;

alter table if exists public.store_roles enable row level security;
alter table if exists public.store_roles force row level security;

alter table if exists public.stores enable row level security;
alter table if exists public.stores force row level security;

alter table if exists public.store_order_counters enable row level security;
alter table if exists public.store_order_counters force row level security;

alter table if exists public.platform_admin_profiles enable row level security;
alter table if exists public.platform_admin_profiles force row level security;

alter table if exists public.store_user_profiles enable row level security;
alter table if exists public.store_user_profiles force row level security;

-- Drop existing policies (idempotent cleanup)
drop policy if exists pedidos_select on public.pedidos;
drop policy if exists pedidos_insert on public.pedidos;
drop policy if exists pedidos_update on public.pedidos;
drop policy if exists pedidos_delete on public.pedidos;

drop policy if exists itens_pedido_select on public.itens_pedido;
drop policy if exists itens_pedido_insert on public.itens_pedido;
drop policy if exists itens_pedido_update on public.itens_pedido;
drop policy if exists itens_pedido_delete on public.itens_pedido;

drop policy if exists pedido_tags_select on public.pedido_tags;
drop policy if exists pedido_tags_insert on public.pedido_tags;
drop policy if exists pedido_tags_delete on public.pedido_tags;

drop policy if exists clientes_select on public.clientes;
drop policy if exists clientes_insert on public.clientes;
drop policy if exists clientes_update on public.clientes;
drop policy if exists clientes_delete on public.clientes;

drop policy if exists enderecos_select on public.enderecos;
drop policy if exists enderecos_insert on public.enderecos;
drop policy if exists enderecos_update on public.enderecos;
drop policy if exists enderecos_delete on public.enderecos;

drop policy if exists produtos_select on public.produtos;
drop policy if exists produtos_insert on public.produtos;
drop policy if exists produtos_update on public.produtos;
drop policy if exists produtos_delete on public.produtos;

drop policy if exists tags_select on public.tags;
drop policy if exists tags_insert on public.tags;
drop policy if exists tags_update on public.tags;
drop policy if exists tags_delete on public.tags;

drop policy if exists categorias_select on public.categorias;
drop policy if exists categorias_insert on public.categorias;
drop policy if exists categorias_update on public.categorias;
drop policy if exists categorias_delete on public.categorias;

drop policy if exists grupos_complementos_select on public.grupos_complementos;
drop policy if exists grupos_complementos_insert on public.grupos_complementos;
drop policy if exists grupos_complementos_update on public.grupos_complementos;
drop policy if exists grupos_complementos_delete on public.grupos_complementos;

drop policy if exists stores_select on public.stores;
drop policy if exists stores_insert on public.stores;
drop policy if exists stores_update on public.stores;
drop policy if exists stores_delete on public.stores;

drop policy if exists store_roles_select on public.store_roles;
drop policy if exists store_roles_insert on public.store_roles;
drop policy if exists store_roles_update on public.store_roles;
drop policy if exists store_roles_delete on public.store_roles;

drop policy if exists user_store_access_select on public.user_store_access;
drop policy if exists user_store_access_insert on public.user_store_access;
drop policy if exists user_store_access_update on public.user_store_access;
drop policy if exists user_store_access_delete on public.user_store_access;

drop policy if exists store_order_counters_select on public.store_order_counters;
drop policy if exists store_order_counters_insert on public.store_order_counters;
drop policy if exists store_order_counters_update on public.store_order_counters;

drop policy if exists platform_admin_profiles_select on public.platform_admin_profiles;
drop policy if exists platform_admin_profiles_insert on public.platform_admin_profiles;
drop policy if exists platform_admin_profiles_update on public.platform_admin_profiles;
drop policy if exists platform_admin_profiles_delete on public.platform_admin_profiles;

drop policy if exists store_user_profiles_select on public.store_user_profiles;
drop policy if exists store_user_profiles_insert on public.store_user_profiles;
drop policy if exists store_user_profiles_update on public.store_user_profiles;
drop policy if exists store_user_profiles_delete on public.store_user_profiles;

-- Pedidos policies
create policy pedidos_select on public.pedidos
for select
using (public.can_store(store_id, 'orders', 'read'));

create policy pedidos_insert on public.pedidos
for insert
with check (public.can_store(store_id, 'orders', 'create'));

create policy pedidos_update on public.pedidos
for update
using (
  public.can_store(store_id, 'orders', 'update')
  or public.can_store(store_id, 'orders', 'status')
)
with check (
  public.can_store(store_id, 'orders', 'update')
  or public.can_store(store_id, 'orders', 'status')
);

create policy pedidos_delete on public.pedidos
for delete
using (public.can_store(store_id, 'orders', 'delete'));

-- Itens pedido policies (via pedido store)
create policy itens_pedido_select on public.itens_pedido
for select
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = itens_pedido.pedido_id
      and public.can_store(p.store_id, 'orders', 'read')
  )
);

create policy itens_pedido_insert on public.itens_pedido
for insert
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = itens_pedido.pedido_id
      and public.can_store(p.store_id, 'orders', 'update')
  )
);

create policy itens_pedido_update on public.itens_pedido
for update
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = itens_pedido.pedido_id
      and public.can_store(p.store_id, 'orders', 'update')
  )
)
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = itens_pedido.pedido_id
      and public.can_store(p.store_id, 'orders', 'update')
  )
);

create policy itens_pedido_delete on public.itens_pedido
for delete
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = itens_pedido.pedido_id
      and public.can_store(p.store_id, 'orders', 'delete')
  )
);

-- Pedido tags policies (use orders.update for changes)
create policy pedido_tags_select on public.pedido_tags
for select
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_tags.pedido_id
      and public.can_store(p.store_id, 'orders', 'read')
  )
);

create policy pedido_tags_insert on public.pedido_tags
for insert
with check (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_tags.pedido_id
      and public.can_store(p.store_id, 'orders', 'update')
  )
);

create policy pedido_tags_delete on public.pedido_tags
for delete
using (
  exists (
    select 1
    from public.pedidos p
    where p.id = pedido_tags.pedido_id
      and (
        public.can_store(p.store_id, 'orders', 'update')
        or public.can_store(p.store_id, 'orders', 'delete')
      )
  )
);

-- Clientes (global) policies
create policy clientes_select on public.clientes
for select
using (public.can_any_store('customers', 'read'));

create policy clientes_insert on public.clientes
for insert
with check (public.can_any_store('customers', 'create'));

create policy clientes_update on public.clientes
for update
using (public.can_any_store('customers', 'update'))
with check (public.can_any_store('customers', 'update'));

create policy clientes_delete on public.clientes
for delete
using (public.can_any_store('customers', 'delete'));

-- Enderecos (global) policies
create policy enderecos_select on public.enderecos
for select
using (public.can_any_store('customers', 'read'));

create policy enderecos_insert on public.enderecos
for insert
with check (public.can_any_store('customers', 'create'));

create policy enderecos_update on public.enderecos
for update
using (public.can_any_store('customers', 'update'))
with check (public.can_any_store('customers', 'update'));

create policy enderecos_delete on public.enderecos
for delete
using (public.can_any_store('customers', 'delete'));

-- Produtos (global) policies
create policy produtos_select on public.produtos
for select
using (public.can_any_store('products', 'read'));

create policy produtos_insert on public.produtos
for insert
with check (public.can_any_store('products', 'create'));

create policy produtos_update on public.produtos
for update
using (public.can_any_store('products', 'update'))
with check (public.can_any_store('products', 'update'));

create policy produtos_delete on public.produtos
for delete
using (public.can_any_store('products', 'delete'));

-- Tags (global) policies
create policy tags_select on public.tags
for select
using (public.can_any_store('settings', 'read'));

create policy tags_insert on public.tags
for insert
with check (public.can_any_store('settings', 'update'));

create policy tags_update on public.tags
for update
using (public.can_any_store('settings', 'update'))
with check (public.can_any_store('settings', 'update'));

create policy tags_delete on public.tags
for delete
using (public.can_any_store('settings', 'update'));

-- Categorias (global) policies
create policy categorias_select on public.categorias
for select
using (
  public.can_any_store('settings', 'read')
  or public.can_any_store('products', 'read')
);

create policy categorias_insert on public.categorias
for insert
with check (public.can_any_store('settings', 'update'));

create policy categorias_update on public.categorias
for update
using (public.can_any_store('settings', 'update'))
with check (public.can_any_store('settings', 'update'));

create policy categorias_delete on public.categorias
for delete
using (public.can_any_store('settings', 'update'));

-- Grupos complementos (global) policies
create policy grupos_complementos_select on public.grupos_complementos
for select
using (public.can_any_store('settings', 'read'));

create policy grupos_complementos_insert on public.grupos_complementos
for insert
with check (public.can_any_store('settings', 'update'));

create policy grupos_complementos_update on public.grupos_complementos
for update
using (public.can_any_store('settings', 'update'))
with check (public.can_any_store('settings', 'update'));

create policy grupos_complementos_delete on public.grupos_complementos
for delete
using (public.can_any_store('settings', 'update'));

-- Stores (platform admin only for write)
create policy stores_select on public.stores
for select
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.user_store_access usa
    where usa.user_id = auth.uid() and usa.store_id = stores.id
  )
);

create policy stores_insert on public.stores
for insert
with check (public.is_platform_admin());

create policy stores_update on public.stores
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy stores_delete on public.stores
for delete
using (public.is_platform_admin());

-- Store roles (read for users with any store, write for platform admin)
create policy store_roles_select on public.store_roles
for select
using (
  public.is_platform_admin()
  or exists (
    select 1 from public.user_store_access usa
    where usa.user_id = auth.uid()
  )
);

create policy store_roles_insert on public.store_roles
for insert
with check (public.is_platform_admin());

create policy store_roles_update on public.store_roles
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy store_roles_delete on public.store_roles
for delete
using (public.is_platform_admin());

-- User store access (self-read, platform admin write)
create policy user_store_access_select on public.user_store_access
for select
using (
  public.is_platform_admin()
  or user_id = auth.uid()
);

create policy user_store_access_insert on public.user_store_access
for insert
with check (public.is_platform_admin());

create policy user_store_access_update on public.user_store_access
for update
using (public.is_platform_admin())
with check (public.is_platform_admin());

create policy user_store_access_delete on public.user_store_access
for delete
using (public.is_platform_admin());

-- Store order counters (orders.create only)
create policy store_order_counters_select on public.store_order_counters
for select
using (public.can_store(store_id, 'orders', 'create'));

create policy store_order_counters_insert on public.store_order_counters
for insert
with check (public.can_store(store_id, 'orders', 'create'));

create policy store_order_counters_update on public.store_order_counters
for update
using (public.can_store(store_id, 'orders', 'create'))
with check (public.can_store(store_id, 'orders', 'create'));

-- Platform admin profiles (self-only, no is_platform_admin)
create policy platform_admin_profiles_select on public.platform_admin_profiles
for select
using (user_id = auth.uid());

create policy platform_admin_profiles_insert on public.platform_admin_profiles
for insert
with check (user_id = auth.uid());

create policy platform_admin_profiles_update on public.platform_admin_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy platform_admin_profiles_delete on public.platform_admin_profiles
for delete
using (user_id = auth.uid());

-- Store user profiles (self-only)
create policy store_user_profiles_select on public.store_user_profiles
for select
using (user_id = auth.uid());

create policy store_user_profiles_insert on public.store_user_profiles
for insert
with check (user_id = auth.uid());

create policy store_user_profiles_update on public.store_user_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy store_user_profiles_delete on public.store_user_profiles
for delete
using (user_id = auth.uid());

-- 12) Updated_at trigger for enderecos
drop trigger if exists trg_enderecos_updated_at on public.enderecos;
create trigger trg_enderecos_updated_at
before update on public.enderecos
for each row execute function public.trg_set_updated_at();

-- 13) Revoke direct DML and grant RPCs
revoke insert, update, delete on
  public.pedidos,
  public.itens_pedido,
  public.pedido_tags,
  public.clientes,
  public.enderecos,
  public.produtos,
  public.tags,
  public.categorias,
  public.grupos_complementos,
  public.store_order_counters
from authenticated, anon;

revoke insert, update, delete on
  public.user_store_access,
  public.store_roles,
  public.stores
from authenticated, anon;

-- Allow RPC execution for authenticated users
grant execute on function public.create_order(uuid, jsonb) to authenticated;
grant execute on function public.update_order(bigint, jsonb) to authenticated;
grant execute on function public.set_order_status(bigint, text, text) to authenticated;
grant execute on function public.set_payment_status(bigint, text) to authenticated;
grant execute on function public.set_delivery_status(bigint, text) to authenticated;
grant execute on function public.get_orders(uuid, jsonb, int, int) to authenticated;
grant execute on function public.get_order_by_public_id(uuid, uuid) to authenticated;
grant execute on function public.get_order_by_id(uuid, bigint) to authenticated;
grant execute on function public.get_order_print(uuid, bigint) to authenticated;
grant execute on function public.get_products(jsonb) to authenticated;
grant execute on function public.get_tags() to authenticated;
grant execute on function public.get_categories() to authenticated;
grant execute on function public.get_grupos_complementos() to authenticated;

grant execute on function public.create_store(text, text) to authenticated;
grant execute on function public.update_store(uuid, text, text) to authenticated;
grant execute on function public.toggle_store_active(uuid, boolean) to authenticated;
grant execute on function public.create_role(text, text, jsonb) to authenticated;
grant execute on function public.update_role(text, text, jsonb) to authenticated;
grant execute on function public.grant_user_store_access(uuid, uuid, text) to authenticated;
grant execute on function public.revoke_user_store_access(uuid, uuid) to authenticated;

create or replace function public.delete_order(p_pedido_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store_id uuid;
begin
  if auth.uid() is null then
    raise exception 'unauthorized' using errcode = '42501';
  end if;

  select store_id into v_store_id
  from public.pedidos
  where id = p_pedido_id;

  if v_store_id is null then
    raise exception 'order not found' using errcode = 'P0002';
  end if;

  if not public.can_store(v_store_id, 'orders', 'delete') then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  delete from public.pedido_tags where pedido_id = p_pedido_id;
  delete from public.itens_pedido where pedido_id = p_pedido_id;
  delete from public.pedidos where id = p_pedido_id;
end;
$$;

grant execute on function public.delete_order(bigint) to authenticated;
grant execute on function public.create_customer(uuid, jsonb) to authenticated;
grant execute on function public.update_customer(uuid, jsonb) to authenticated;
grant execute on function public.delete_customer(uuid) to authenticated;
grant execute on function public.create_address(jsonb) to authenticated;
grant execute on function public.update_address(uuid, jsonb) to authenticated;
grant execute on function public.delete_address(uuid) to authenticated;
grant execute on function public.create_product(jsonb) to authenticated;
grant execute on function public.update_product(uuid, jsonb) to authenticated;
grant execute on function public.delete_product(uuid) to authenticated;
grant execute on function public.create_category(jsonb) to authenticated;
grant execute on function public.update_category(bigint, jsonb) to authenticated;
grant execute on function public.delete_category(bigint) to authenticated;
grant execute on function public.create_tag(jsonb) to authenticated;
grant execute on function public.update_tag(uuid, jsonb) to authenticated;
grant execute on function public.delete_tag(uuid) to authenticated;
grant execute on function public.create_grupo_complemento(jsonb) to authenticated;
grant execute on function public.update_grupo_complemento(bigint, jsonb) to authenticated;
grant execute on function public.delete_grupo_complemento(bigint) to authenticated;

grant select on public.v_produtos_disponiveis to authenticated;
grant select on public.v_pedidos to authenticated;


-- Fix Supabase lint: function_search_path_mutable
do $$
begin
  if to_regprocedure('public.is_platform_admin()') is not null then
    execute 'alter function public.is_platform_admin() set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.has_store_access(uuid)') is not null then
    execute 'alter function public.has_store_access(uuid) set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.get_allowed_store_ids()') is not null then
    execute 'alter function public.get_allowed_store_ids() set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.normalize_permissions(jsonb)') is not null then
    execute 'alter function public.normalize_permissions(jsonb) set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.trg_set_pedido_snapshots()') is not null then
    execute 'alter function public.trg_set_pedido_snapshots() set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.trg_set_item_snapshots()') is not null then
    execute 'alter function public.trg_set_item_snapshots() set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.trg_set_updated_at()') is not null then
    execute 'alter function public.trg_set_updated_at() set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.recalc_order_totals(bigint)') is not null then
    execute 'alter function public.recalc_order_totals(bigint) set search_path = public, pg_catalog';
  end if;

  if to_regprocedure('public.trg_recalc_order_totals()') is not null then
    execute 'alter function public.trg_recalc_order_totals() set search_path = public, pg_catalog';
  end if;
end $$;


-- Fix lint: security_definer_view  (make views SECURITY INVOKER)

-- v_produtos_disponiveis (recria como security_invoker)
create or replace view public.v_produtos_disponiveis
with (security_invoker = true)
as
select p.*
from public.produtos p
left join public.categorias c on c.id = p.categoria_id
where p.ativo = true
  and (p.categoria_id is null or c.active = true);

-- v_pedidos (recria como security_invoker e mantém _tag_ids)
-- Ajuste o SELECT abaixo caso sua v_pedidos tenha mais colunas calculadas.
create or replace view public.v_pedidos
with (security_invoker = true)
as
select
  p.*,
  coalesce(
    (select array_agg(pt.tag_id order by pt.tag_id)
     from public.pedido_tags pt
     where pt.pedido_id = p.id),
    '{}'::uuid[]
  ) as _tag_ids
from public.pedidos p;

-- (opcional, mas seguro) garantir grants
grant select on public.v_produtos_disponiveis to authenticated;
grant select on public.v_pedidos to authenticated;
