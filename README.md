# Pedidos Madalena

## Setup Supabase (novo projeto)

Forma unica (um arquivo):

1. Abra o Supabase SQL Editor.
2. Rode `supabase/migrations/enterprise_migration.sql`.

Isso cria schema, funcoes, triggers, RLS, RPCs e grants de forma idempotente.

## Observacoes de regra (produtos disponiveis)

- Produto so aparece para selecao quando:
  - `produtos.ativo = true` e
  - `categoria_id IS NULL` ou `categorias.active = true`
- A view `public.v_produtos_disponiveis` e a RPC `get_products` seguem essa regra.
