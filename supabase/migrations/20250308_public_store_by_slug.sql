create or replace function public.get_store_by_slug(p_slug text)
returns table (id uuid, name text, slug text, active boolean)
language sql
security definer
set search_path = public
as $$
  select id, name, slug, active
  from public.stores
  where slug = p_slug
  limit 1;
$$;

grant execute on function public.get_store_by_slug(text) to anon, authenticated;
