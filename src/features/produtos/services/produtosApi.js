import { handleApiError, safeTerm, genericFetch, supabase } from '@/shared/lib/apiBase';

export const listarCategorias = async () => {
  try {
    const { data, error } = await supabase.from('categorias').select('id, nome');

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar categorias');
  }
};

export const criarCategoria = (data) => genericFetch('categorias', { method: 'insert', data });

export const atualizarCategoria = (id, data) =>
  genericFetch('categorias', { method: 'update', data, id });

export const deletarCategoria = (id) => genericFetch('categorias', { method: 'delete', id });

export const listarProdutos = async (filtros = {}) => {
  try {
    let query = supabase
      .from('produtos')
      .select(
        'id, nome, preco, ativo, grupos_complementos, categoria_id, categoria:categorias(nome)',
        { count: 'exact' }
      );

    if (filtros.nome) query = query.ilike('nome', `%${safeTerm(filtros.nome)}%`);
    if (filtros.categoria_id) query = query.eq('categoria_id', filtros.categoria_id);
    if (filtros.ativo !== undefined) query = query.eq('ativo', filtros.ativo);

    query = query.order('nome', { ascending: true });

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count };
  } catch (error) {
    handleApiError(error, 'listar produtos');
  }
};

export const criarProduto = (data) => genericFetch('produtos', { method: 'insert', data });

export const atualizarProduto = (id, data) =>
  genericFetch('produtos', { method: 'update', data, id });

export const deletarProduto = (id) => genericFetch('produtos', { method: 'delete', id });

export const listarGruposComplementos = async () => {
  try {
    const { data, error } = await supabase.from('grupos_complementos').select('*');

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar grupos de complementos');
  }
};

export const criarGrupoComplemento = (data) =>
  genericFetch('grupos_complementos', {
    method: 'insert',
    data,
  });

export const atualizarGrupoComplemento = (id, data) =>
  genericFetch('grupos_complementos', {
    method: 'update',
    data,
    id,
  });

export const deletarGrupoComplemento = (id) =>
  genericFetch('grupos_complementos', {
    method: 'delete',
    id,
  });

export const listarGruposComplementosComOpcoes = async () => {
  try {
    const { data, error } = await supabase.from('grupos_complementos').select('*');

    if (error) throw error;

    const grupos = data || [];

    return grupos.map((g) => {
      const opcoes = Array.isArray(g?.opcoes) ? g.opcoes : [];

      const opcoesNormalizadas = opcoes.map((o, idx) => ({
        id: o?.id ?? idx,
        nome: typeof o?.nome === 'string' ? o.nome : String(o?.nome ?? ''),
        preco_adicional: Number(o?.preco_adicional ?? 0),
        grupo_id: g.id,
      }));

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
