import { serve } from 'https://deno.land/std/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.5';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { email, password, full_name, role, store_ids } = await req.json();

    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'email e password são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    const userId = userData.user?.id;
    if (!userId) throw new Error('User id não retornado pelo Supabase.');

    // perfil básico
    await supabaseAdmin.from('store_user_profiles').insert({
      user_id: userId,
      full_name: full_name || email.split('@')[0],
      email,
    });

    if (Array.isArray(store_ids) && store_ids.length > 0) {
      const rows = store_ids.map((store_id: string) => ({
        user_id: userId,
        store_id,
        role: role || 'atendente',
      }));
      await supabaseAdmin
        .from('user_store_access')
        .upsert(rows, { onConflict: 'user_id,store_id' });
    }

    return new Response(JSON.stringify({ user_id: userId }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    console.error('create-store-user error', err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});
