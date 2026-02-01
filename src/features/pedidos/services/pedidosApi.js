import { handleApiError, safeTerm, supabase } from '@/shared/lib/apiBase';

const normalizeStatusValue = (status) =>
  typeof status === 'string'
    ? status.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    : status;

const toDisplayStatus = (status) => {
  if (status === 'Nao Pago') return 'Não Pago';
  if (status === 'Nao Entregue') return 'Não Entregue';
  return status;
};

export const listarPedidos = async (filtros = {}) => {
  try {
    const raw = filtros.busca?.trim() || '';
    const term = safeTerm(raw);
    if (!filtros.store_id) {
      throw new Error('store_id obrigatorio para listar pedidos');
    }

    const payload = {
      status_pagamento: normalizeStatusValue(filtros.status_pagamento) || null,
      status_entrega: normalizeStatusValue(filtros.status_entrega) || null,
      tipo_entrega: filtros.tipo_entrega || null,
      search: term || null,
      from_date: filtros.data_entrega_gte || null,
      to_date: filtros.data_entrega_lte || null,
    };

    if (filtros.status_geral === 'concluidos') {
      payload.status_pagamento = 'Pago';
      payload.status_entrega = 'Entregue';
    }

    const { data, error } = await supabase.rpc('get_orders', {
      p_store_id: filtros.store_id,
      p_filters: payload,
      p_limit: filtros.limit || 100,
      p_offset: filtros.offset || 0,
    });

    if (error) throw error;

    const pedidosComCliente = (data || []).map((p) => ({
      ...p,
      status_pagamento: toDisplayStatus(p.status_pagamento),
      status_entrega: toDisplayStatus(p.status_entrega),
      cliente_nome: p.customer_name_snapshot || 'Cliente nao encontrado',
      tags: p.tags || [],
      tag_ids: (p.tags || []).map((t) => t.id),
    }));

    let pedidosFiltrados = pedidosComCliente;
    if (filtros.status_geral === 'abertos') {
      pedidosFiltrados = pedidosFiltrados.filter(
        (pedido) => pedido.status_pagamento !== 'Pago' || pedido.status_entrega !== 'Entregue'
      );
    }

    if (filtros.specific_status_pagamento && filtros.specific_status_entrega_neq) {
      pedidosFiltrados = pedidosFiltrados.filter(
        (pedido) =>
          pedido.status_pagamento === filtros.specific_status_pagamento &&
          pedido.status_entrega !== filtros.specific_status_entrega_neq
      );
    }

    if (filtros.cliente_id) {
      pedidosFiltrados = pedidosFiltrados.filter(
        (pedido) => pedido.cliente_id === filtros.cliente_id
      );
    }

    if (filtros.tag_ids && Array.isArray(filtros.tag_ids) && filtros.tag_ids.length > 0) {
      pedidosFiltrados = pedidosFiltrados.filter((pedido) => {
        if (!pedido.tags || pedido.tags.length === 0) return false;
        return pedido.tags.some((tag) => filtros.tag_ids.includes(tag.id));
      });
    }

    return {
      data: pedidosFiltrados,
      count: pedidosFiltrados.length,
    };
  } catch (error) {
    handleApiError(error, 'listar pedidos');
  }
};

export const obterTotalPedidosGeral = async (filtros = {}) => {
  try {
    let query = supabase.from('pedidos').select('total', { count: 'exact' });

    if (filtros.store_id) query = query.eq('store_id', filtros.store_id);

    if (filtros.data_entrega_gte) query = query.gte('data_entrega', filtros.data_entrega_gte);

    if (filtros.data_entrega_lte) query = query.lte('data_entrega', filtros.data_entrega_lte);

    const { count, data, error } = await query;

    if (error) throw error;

    const totalValue = (data || []).reduce((acc, pedido) => acc + (Number(pedido.total) || 0), 0);

    return { count, totalValue };
  } catch (error) {
    handleApiError(error, 'obter total de pedidos geral');
  }
};

export const obterPedidoCompleto = async (id, storeId) => {
  try {
    if (!storeId) {
      throw new Error('store_id obrigatorio para obter pedido completo');
    }

    const { data, error } = await supabase.rpc('get_order_by_id', {
      p_store_id: storeId,
      p_pedido_id: id,
    });

    if (error) throw error;

    const tags = data?.tags || [];
    const itens = (data?.itens || []).map((item) => ({
      ...item,
      produtos: item.produtos || { nome: item.product_name_snapshot || 'Produto' },
    }));

    const cliente = {
      id: data?.cliente_id,
      nome: data?.customer_name_snapshot || 'Cliente',
      celular: data?.customer_phone_snapshot || '',
      email: '',
    };

    const endereco_entrega = data?.delivery_address_snapshot || null;

    return {
      ...data,
      status_pagamento: toDisplayStatus(data?.status_pagamento),
      status_entrega: toDisplayStatus(data?.status_entrega),
      itens,
      cliente,
      endereco_entrega,
      _tags: tags,
      _tag_ids: tags.map((t) => t.id),
    };
  } catch (error) {
    handleApiError(error, 'obter pedido completo');
  }
};

export const criarPedido = async (pedidoData) => {
  try {
    const { itens, cliente, ...pedido } = pedidoData;

    delete pedido.tag_ids;
    delete pedido.tags;
    delete pedido._tag_ids;
    delete pedido._tags;

    const payload = {
      ...pedido,
      status_pagamento: normalizeStatusValue(pedido.status_pagamento),
      status_entrega: normalizeStatusValue(pedido.status_entrega),
      cliente_id: cliente?.id,
      cliente,
      itens,
      tag_ids: pedidoData.tag_ids || pedidoData._tag_ids || [],
    };

    const { data: result, error } = await supabase.rpc('create_order', {
      p_store_id: pedido.store_id,
      p_payload: payload,
    });

    if (error) throw error;

    return {
      id: result?.pedido_id,
      public_id: result?.public_id,
      order_number: result?.order_number,
    };
  } catch (error) {
    handleApiError(error, 'criar pedido');
  }
};

export const atualizarPedido = async (pedidoId, data) => {
  try {
    const { error } = await supabase.rpc('set_order_status', {
      p_pedido_id: pedidoId,
      p_status_pagamento: normalizeStatusValue(data.status_pagamento) ?? null,
      p_status_entrega: normalizeStatusValue(data.status_entrega) ?? null,
    });

    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'atualizar pedido');
  }
};

export const atualizarPedidoCompleto = async (pedidoId, pedidoData) => {
  try {
    const { itens, cliente, endereco_entrega, ...pedidoInfo } = pedidoData;

    delete pedidoInfo.tag_ids;
    delete pedidoInfo.tags;
    delete pedidoInfo._tag_ids;
    delete pedidoInfo._tags;

    const { id, ...dadosParaAtualizar } = pedidoInfo;

    const payload = {
      ...dadosParaAtualizar,
      status_pagamento: normalizeStatusValue(dadosParaAtualizar.status_pagamento),
      status_entrega: normalizeStatusValue(dadosParaAtualizar.status_entrega),
      cliente_id: cliente?.id || pedidoInfo.cliente_id,
      cliente,
      endereco_entrega,
      itens,
      tag_ids: pedidoData.tag_ids || pedidoData._tag_ids || [],
    };

    const { data: result, error } = await supabase.rpc('update_order', {
      p_pedido_id: pedidoId,
      p_payload: payload,
    });

    if (error) throw error;

    return {
      id: pedidoId,
      ok: result?.ok ?? true,
    };
  } catch (error) {
    handleApiError(error, 'atualizar pedido completo');
  }
};

export const deletarPedido = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_order', { p_pedido_id: id });
    if (error) throw error;
  } catch (error) {
    handleApiError(error, 'deletar pedido');
  }
};

export const listarResumoPedidosPorClientes = async (clienteIds = [], lojaId) => {
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
    return {};
  }

  try {
    let query = supabase
      .from('pedidos')
      .select('id, cliente_id, total, status_pagamento, status_entrega')
      .in('cliente_id', clienteIds);

    if (lojaId) query = query.eq('store_id', lojaId);

    const { data: pedidosData, error } = await query;

    if (error) throw error;

    const pedidos = pedidosData || [];
    const pedidoIds = pedidos.map((pedido) => pedido.id);

    let tagsPorPedido = {};
    if (pedidoIds.length > 0) {
      const { data: pedidoTagsData, error: tagsError } = await supabase
        .from('pedido_tags')
        .select('pedido_id, tags(id, nome, cor)')
        .in('pedido_id', pedidoIds);

      if (tagsError) throw tagsError;

      tagsPorPedido = (pedidoTagsData || []).reduce((acc, row) => {
        if (!row.tags) return acc;
        if (!acc[row.pedido_id]) acc[row.pedido_id] = [];
        acc[row.pedido_id].push(row.tags);
        return acc;
      }, {});
    }

    return pedidos.reduce((acc, pedido) => {
      const clienteId = pedido.cliente_id;
      if (!acc[clienteId]) {
        acc[clienteId] = {
          count: 0,
          total: 0,
          ticket: 0,
          tags: [],
        };
      }

      acc[clienteId].count += 1;
      acc[clienteId].total += pedido.total || 0;

      const tags = tagsPorPedido[pedido.id] || [];
      tags.forEach((tag) => {
        if (!acc[clienteId].tags.some((t) => t.id === tag.id)) {
          acc[clienteId].tags.push(tag);
        }
      });

      return acc;
    }, {});
  } catch (error) {
    handleApiError(error, 'listar resumo de pedidos por clientes');
  }
};
