import { handleApiError, safeTerm, supabase } from '@/shared/lib/apiBase';

export const listarPedidos = async (filtros = {}) => {
  try {
    const raw = filtros.busca?.trim() || '';
    const term = safeTerm(raw);
    const isNumber = /^\d+$/.test(term);

    let query = supabase.from('pedidos').select(
      `
                id,
                cliente_id,
                data_entrega,
                hora_entrega,
                tipo_entrega,
                status_pagamento,
                status_entrega,
                total,
                cliente:clientes!inner(id, nome)
            `,
      { count: 'exact' }
    );

    if (isNumber && term.length > 0) {
      query = query.eq('id', Number(term));
    }

    if (!isNumber && term.length > 0) {
      query = query.ilike('clientes.nome', `%${term}%`);
    }

    if (filtros.status_pagamento) query = query.eq('status_pagamento', filtros.status_pagamento);

    if (filtros.status_entrega) query = query.eq('status_entrega', filtros.status_entrega);

    if (filtros.status_geral === 'concluidos') {
      query = query.eq('status_entrega', 'Entregue').eq('status_pagamento', 'Pago');
    }

    if (filtros.status_geral === 'abertos') {
      query = query.or('status_pagamento.neq.Pago,status_entrega.neq.Entregue');
    }

    if (filtros.cliente_id) query = query.eq('cliente_id', filtros.cliente_id);

    if (filtros.data_entrega_gte) query = query.gte('data_entrega', filtros.data_entrega_gte);

    if (filtros.data_entrega_lte) query = query.lte('data_entrega', filtros.data_entrega_lte);

    if (filtros.specific_status_pagamento && filtros.specific_status_entrega_neq) {
      query = query
        .eq('status_pagamento', filtros.specific_status_pagamento)
        .neq('status_entrega', filtros.specific_status_entrega_neq);
    }

    const { data, error } = await query;

    if (error) throw error;

    const pedidosComCliente = data.map((p) => ({
      ...p,
      cliente_nome: p.cliente?.nome || 'Cliente nao encontrado',
    }));

    const pedidosIds = pedidosComCliente.map((p) => p.id);

    let pedidosComTags = pedidosComCliente;

    if (pedidosIds.length > 0) {
      const { data: pedidoTagsData, error: tagsError } = await supabase
        .from('pedido_tags')
        .select('pedido_id, tag_id, tags(id, nome, cor)')
        .in('pedido_id', pedidosIds);

      if (!tagsError && pedidoTagsData) {
        pedidosComTags = pedidosComCliente.map((pedido) => {
          const tagsRelacionadas = pedidoTagsData
            .filter((pt) => pt.pedido_id === pedido.id)
            .map((pt) => pt.tags)
            .filter(Boolean);

          return {
            ...pedido,
            tags: tagsRelacionadas,
            tag_ids: tagsRelacionadas.map((t) => t.id),
          };
        });
      }
    }

    let pedidosFiltrados = pedidosComTags;
    if (filtros.tag_ids && Array.isArray(filtros.tag_ids) && filtros.tag_ids.length > 0) {
      pedidosFiltrados = pedidosComTags.filter((pedido) => {
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

export const obterPedidoCompleto = async (id) => {
  try {
    const { data, error } = await supabase
      .from('pedidos')
      .select(
        '*, cliente:clientes(*), endereco_entrega:enderecos!endereco_entrega_id(*), itens:itens_pedido(*, produtos(nome))'
      )
      .eq('id', id)
      .single();

    if (error) throw error;

    const { data: pedidoTagsData } = await supabase
      .from('pedido_tags')
      .select('tag_id, tags(id, nome, cor)')
      .eq('pedido_id', id);

    const tags = (pedidoTagsData || []).map((pt) => pt.tags).filter(Boolean);

    return {
      ...data,
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

    const { data: novoPedido, error: pedidoError } = await supabase
      .from('pedidos')
      .insert({
        ...pedido,
        cliente_id: cliente.id,
      })
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    const itensComPedidoId = itens.map(({ id, produto_nome, valor_total, ...item }) => ({
      ...item,
      pedido_id: novoPedido.id,
    }));

    const { error: itensError } = await supabase.from('itens_pedido').insert(itensComPedidoId);

    if (itensError) throw itensError;

    return novoPedido;
  } catch (error) {
    handleApiError(error, 'criar pedido');
  }
};

export const atualizarPedido = async (pedidoId, data) => {
  try {
    const { data: result, error } = await supabase
      .from('pedidos')
      .update(data)
      .eq('id', pedidoId)
      .select()
      .single();

    if (error) throw error;
    return result;
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

    const pedidoParaSalvar = {
      ...dadosParaAtualizar,
      cliente_id: cliente?.id || pedidoInfo.cliente_id,
    };

    const { data: pedidoAtualizado, error: pedidoError } = await supabase
      .from('pedidos')
      .update(pedidoParaSalvar)
      .eq('id', pedidoId)
      .select()
      .single();

    if (pedidoError) throw pedidoError;

    await supabase.from('itens_pedido').delete().eq('pedido_id', pedidoId);

    const itensNormalizados = itens.map((item) => ({
      pedido_id: pedidoId,
      produto_id: item.produto_id,
      quantidade: item.quantidade,
      observacao: item.observacao,
      complementos: item.complementos,
      valor_unitario: item.valor_unitario,
    }));

    if (itensNormalizados.length > 0) {
      const { error: insertError } = await supabase.from('itens_pedido').insert(itensNormalizados);

      if (insertError) throw insertError;
    }

    return pedidoAtualizado;
  } catch (error) {
    handleApiError(error, 'atualizar pedido completo');
  }
};

export const deletarPedido = async (id) => {
  try {
    await supabase.from('pedido_tags').delete().eq('pedido_id', id);
    await supabase.from('itens_pedido').delete().eq('pedido_id', id);
    await supabase.from('pedidos').delete().eq('id', id);
  } catch (error) {
    handleApiError(error, 'deletar pedido');
  }
};

export const listarResumoPedidosPorClientes = async (clienteIds = []) => {
  if (!Array.isArray(clienteIds) || clienteIds.length === 0) {
    return {};
  }

  try {
    const { data: pedidosData, error } = await supabase
      .from('pedidos')
      .select('id, cliente_id, total, status_pagamento, status_entrega')
      .in('cliente_id', clienteIds);

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
