import { handleApiError, supabase } from '@/shared/lib/apiBase';

export const listarTags = async () => {
  try {
    const { data, error } = await supabase.from('tags').select('*').order('nome');
    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar tags');
  }
};

export const criarTag = async (data) => {
  try {
    const { data: result, error } = await supabase.rpc('create_tag', { p_payload: data });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'criar tag');
  }
};

export const atualizarTag = async (id, data) => {
  try {
    const { data: result, error } = await supabase.rpc('update_tag', {
      p_tag_id: id,
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar tag');
  }
};

export const deletarTag = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_tag', { p_tag_id: id });
    if (error) throw error;
  } catch (error) {
    handleApiError(error, 'deletar tag');
  }
};

export const vincularTagsPedido = async (pedidoId, tagIds = []) => {
  try {
    const { error } = await supabase.rpc('update_order', {
      p_pedido_id: pedidoId,
      p_payload: { tag_ids: tagIds },
    });

    if (error) throw error;

    if (!tagIds.length) return [];

    const { data, error: fetchError } = await supabase
      .from('pedido_tags')
      .select('tag_id, tags(id, nome, cor)')
      .eq('pedido_id', pedidoId);

    if (fetchError) throw fetchError;

    return data.map((item) => item.tags).filter(Boolean);
  } catch (error) {
    handleApiError(error, 'vincular tags ao pedido');
  }
};
