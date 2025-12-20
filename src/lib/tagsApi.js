import { supabase } from '@/lib/customSupabaseClient';

const handleApiError = (error, context = 'operação') => {
  console.error(`Erro na ${context}:`, error);
  const errorMessage = error.message || 'Ocorreu um erro. Tente novamente.';
  throw new Error(errorMessage);
};

// ======================================================
// TAGS
// ======================================================
export const listarTags = async () => {
  try {
    const { data, error } = await supabase.from('tags').select('*').order('nome');

    if (error) throw error;
    return data || [];
  } catch (error) {
    handleApiError(error, 'listar tags');
  }
};

export const criarTag = async (data) => {
  try {
    const { data: result, error } = await supabase.from('tags').insert(data).select().single();

    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'criar tag');
  }
};

export const atualizarTag = async (id, data) => {
  try {
    const { data: result, error } = await supabase
      .from('tags')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar tag');
  }
};

export const deletarTag = async (id) => {
  try {
    const { error } = await supabase.from('tags').delete().eq('id', id);

    if (error) throw error;
  } catch (error) {
    handleApiError(error, 'deletar tag');
  }
};

// ======================================================
// PEDIDO TAGS
// ======================================================
export const vincularTagsPedido = async (pedidoId, tagIds) => {
  try {
    // Remove tags antigas
    await supabase.from('pedido_tags').delete().eq('pedido_id', pedidoId);

    // Adiciona novas tags
    if (tagIds && tagIds.length > 0) {
      const inserts = tagIds.map((tagId) => ({
        pedido_id: pedidoId,
        tag_id: tagId,
      }));

      const { error } = await supabase.from('pedido_tags').insert(inserts);

      if (error) throw error;
    }
  } catch (error) {
    handleApiError(error, 'vincular tags ao pedido');
  }
};

export const obterTagsPedido = async (pedidoId) => {
  try {
    const { data, error } = await supabase
      .from('pedido_tags')
      .select('tag_id, tags(id, nome, cor)')
      .eq('pedido_id', pedidoId);

    if (error) throw error;
    return (data || []).map((pt) => pt.tags).filter(Boolean);
  } catch (error) {
    handleApiError(error, 'obter tags do pedido');
  }
};
