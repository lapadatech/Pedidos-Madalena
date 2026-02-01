import { handleApiError, supabase } from '@/shared/lib/apiBase';

export const listarLojas = async () => {
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('id, name, slug, active')
      .order('name');
    if (error) throw error;
    return (data || []).map((loja) => ({
      id: loja.id,
      nome: loja.name,
      slug: loja.slug,
      ativo: loja.active ?? true,
    }));
  } catch (error) {
    handleApiError(error, 'listar lojas');
  }
};

export const criarLoja = async (data) => {
  try {
    const payload = {
      name: data.name || data.nome,
      slug: data.slug,
      active: data.active ?? data.ativo ?? true,
    };
    const { data: storeId, error } = await supabase.rpc('create_store', {
      p_name: payload.name,
      p_slug: payload.slug,
    });
    if (error) throw error;
    if (payload.active === false) {
      const { error: toggleError } = await supabase.rpc('toggle_store_active', {
        p_store_id: storeId,
        p_active: false,
      });
      if (toggleError) throw toggleError;
    }
    return {
      id: storeId,
      nome: payload.name,
      slug: payload.slug,
      ativo: payload.active,
    };
  } catch (error) {
    handleApiError(error, 'criar loja');
  }
};

export const atualizarLoja = async (id, data) => {
  try {
    const payload = {
      name: data.name || data.nome,
      slug: data.slug,
      active: data.active ?? data.ativo,
    };
    const { error } = await supabase.rpc('update_store', {
      p_store_id: id,
      p_name: payload.name,
      p_slug: payload.slug,
    });
    if (error) throw error;

    if (payload.active !== undefined) {
      const { error: toggleError } = await supabase.rpc('toggle_store_active', {
        p_store_id: id,
        p_active: payload.active,
      });
      if (toggleError) throw toggleError;
    }
    return {
      id,
      nome: payload.name,
      slug: payload.slug,
      ativo: payload.active,
    };
  } catch (error) {
    handleApiError(error, 'atualizar loja');
  }
};

export const listarUsuariosLojas = async () => {
  try {
    const { data, error } = await supabase
      .from('user_store_access')
      .select(
        `
        id,
        user_id,
        store_id,
        role,
        stores (id, name, slug)
      `
      )
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map((row) => ({
      ...row,
      loja_id: row.store_id,
      lojas: row.stores
        ? { id: row.stores.id, nome: row.stores.name, slug: row.stores.slug }
        : null,
      perfis: { id: row.role, nome: row.role },
    }));
  } catch (error) {
    handleApiError(error, 'listar usuarios por loja');
  }
};

export const removerUsuarioLoja = async ({ user_id, store_id }) => {
  try {
    const { error } = await supabase.rpc('revoke_user_store_access', {
      p_user_id: user_id,
      p_store_id: store_id,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'remover usuario da loja');
  }
};
