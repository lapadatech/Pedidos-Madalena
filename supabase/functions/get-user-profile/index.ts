import { serve } from 'https://deno.land/std@0.192.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // ajuste se quiser restringir
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SERVICE_ROLE key' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Usa service role para consultas (bypassa RLS) e um client com JWT para auth.getUser
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const supabaseAuth = createClient(supabaseUrl, anonKey || serviceRoleKey, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    });

    const { data: authUser, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !authUser?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = authUser.user.id;

    const { storeSlug } = await req.json().catch(() => ({}));

    const { data: adminProfile } = await supabaseAdmin
      .from('platform_admin_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();

    if (adminProfile) {
      // Admin não precisa de lojas específicas; retorna marcação de admin
      let stores: any[] = [];
      if (storeSlug) {
        const { data: store } = await supabaseAdmin
          .from('stores')
          .select('id, name, slug')
          .eq('slug', storeSlug)
          .maybeSingle();
        if (store) {
          stores = [{ ...store, role: { id: 'admin', name: 'Admin' } }];
        }
      }
      return new Response(
        JSON.stringify({
          user_id: userId,
          is_admin: true,
          stores,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: profile } = await supabaseAdmin
      .from('store_user_profiles')
      .select('id, full_name')
      .eq('user_id', userId)
      .maybeSingle();
    if (!profile) {
      return new Response(JSON.stringify({ error: 'Store user profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (storeSlug) {
      const { data: store, error: storeError } = await supabaseAdmin
        .from('stores')
        .select('id, name, slug')
        .eq('slug', storeSlug)
        .maybeSingle();
      if (storeError || !store) {
        return new Response(JSON.stringify({ error: 'Store not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: access, error: accessError } = await supabaseAdmin
        .from('user_store_access')
        .select('store_id, role')
        .eq('user_id', userId)
        .eq('store_id', store.id);

      if (accessError) {
        return new Response(JSON.stringify({ error: 'Failed to load store access' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!access || access.length === 0) {
        return new Response(JSON.stringify({ error: 'No access to this store' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const rolesIds = access.map((a) => a.role).filter(Boolean);
      let rolesById: Record<string, any> = {};
      if (rolesIds.length > 0) {
        const { data: rolesRows } = await supabaseAdmin
          .from('store_roles')
          .select('id, name, permissions')
          .in('id', rolesIds);
        rolesById = (rolesRows || []).reduce((acc: Record<string, any>, r) => {
          acc[r.id] = r;
          return acc;
        }, {});
      }

      const mappedStores = access.map((a) => {
        const roleObj = rolesById[a.role] ?? { id: a.role, name: a.role };
        return { ...store, role: roleObj };
      });

      return new Response(
        JSON.stringify({
          user_id: userId,
          is_admin: false,
          profile,
          stores: mappedStores,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sem slug: retorna todas as lojas do usuário
    const { data: accessRows, error: accessError } = await supabaseAdmin
      .from('user_store_access')
      .select('store_id, role, store:stores(id, name, slug)')
      .eq('user_id', userId);

    if (accessError) {
      return new Response(JSON.stringify({ error: 'Failed to load store access' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const rolesIds = (accessRows || []).map((r) => r.role).filter(Boolean);
    let rolesById: Record<string, any> = {};
    if (rolesIds.length > 0) {
      const { data: rolesRows } = await supabaseAdmin
        .from('store_roles')
        .select('id, name, permissions')
        .in('id', rolesIds);
      rolesById = (rolesRows || []).reduce((acc: Record<string, any>, r) => {
        acc[r.id] = r;
        return acc;
      }, {});
    }

    const mapped = (accessRows || [])
      .map((row) => {
        const roleObj = rolesById[row.role] ?? { id: row.role, name: row.role };
        return {
          id: row.store?.id || row.store_id,
          name: row.store?.name,
          slug: row.store?.slug,
          role: roleObj,
        };
      })
      .filter((s) => s.id && s.slug);

    return new Response(
      JSON.stringify({
        user_id: userId,
        is_admin: false,
        profile,
        stores: mapped,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Unexpected error', details: `${err}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
