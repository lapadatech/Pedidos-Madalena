import { handleApiError, supabase } from '@/shared/lib/apiBase';

export const listarCategorias = async ({ includeInactive = true } = {}) => {
  try {
    let query = supabase.from('categorias').select('id, nome, active').order('nome', {
      ascending: true,
    });

    if (!includeInactive) {
      query = query.eq('active', true);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar categorias');
  }
};

export const criarCategoria = async (data) => {
  try {
    const { data: result, error } = await supabase.rpc('create_category', { p_payload: data });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'criar categoria');
  }
};

export const atualizarCategoria = async (id, data) => {
  try {
    const { data: result, error } = await supabase.rpc('update_category', {
      p_categoria_id: id,
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar categoria');
  }
};

export const deletarCategoria = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_category', { p_categoria_id: id });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deletar categoria');
  }
};

export const listarProdutos = async (filtros = {}) => {
  try {
    const status =
      filtros.status ??
      (filtros.ativo === false ? 'inativo' : filtros.ativo === true ? 'ativo' : 'ativo');
    const { data, error } = await supabase.rpc('get_products', {
      p_filters: {
        nome: filtros.nome || null,
        categoria_id: filtros.categoria_id || null,
        status,
      },
    });

    if (error) throw error;

    const produtos = data || [];

    return { data: produtos, count: produtos.length };
  } catch (error) {
    handleApiError(error, 'listar produtos');
  }
};

export const criarProduto = async (data) => {
  try {
    const { data: result, error } = await supabase.rpc('create_product', { p_payload: data });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'criar produto');
  }
};

export const atualizarProduto = async (id, data) => {
  try {
    const { data: result, error } = await supabase.rpc('update_product', {
      p_produto_id: id,
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar produto');
  }
};

export const deletarProduto = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_product', { p_produto_id: id });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deletar produto');
  }
};

export const listarGruposComplementos = async () => {
  try {
    const { data, error } = await supabase
      .from('grupos_complementos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar grupos de complementos');
  }
};

export const criarGrupoComplemento = async (data) => {
  try {
    const { data: result, error } = await supabase.rpc('create_grupo_complemento', {
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'criar grupo de complementos');
  }
};

export const atualizarGrupoComplemento = async (id, data) => {
  try {
    const { data: result, error } = await supabase.rpc('update_grupo_complemento', {
      p_grupo_id: id,
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar grupo de complementos');
  }
};

export const deletarGrupoComplemento = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_grupo_complemento', { p_grupo_id: id });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deletar grupo de complementos');
  }
};

export const listarGruposComplementosComOpcoes = async () => {
  try {
    const { data, error } = await supabase
      .from('grupos_complementos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) throw error;

    const grupos = data || [];

    return grupos.map((g) => {
      const opcoes = Array.isArray(g?.opcoes) ? g.opcoes : [];

      const opcoesNormalizadas = opcoes
        .map((o, idx) => ({
          id: o?.id ?? idx,
          nome: typeof o?.nome === 'string' ? o.nome : String(o?.nome ?? ''),
          preco_adicional: Number(o?.preco_adicional ?? 0),
          grupo_id: g.id,
        }))
        .sort((a, b) => a.nome.localeCompare(b.nome));

      return {
        ...g,
        obrigatorio: Boolean(g?.obrigatorio),
        opcoes: opcoesNormalizadas,
      };
    });
  } catch (error) {
    handleApiError(error, 'listar grupos com opcoes');
  }
};
