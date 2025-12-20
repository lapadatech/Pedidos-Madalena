// ======================================================
// API CENTRAL DO SISTEMA — VERSÃO FINAL & COMPLETA
// ======================================================

import { supabase } from "@/lib/customSupabaseClient";
import { toast } from "@/components/ui/use-toast";

// Sanitiza termos de busca
const safeTerm = (term) => (term || "").trim().replace(/[%']/g, "");

// Handler global de erros
const handleApiError = (error, context = "operação") => {
    console.error(`Erro na ${context}:`, error);

    if (error?.message?.includes("Invalid Refresh Token")) {
        throw error;
    }

    const errorMessage = error.message?.includes("Function returned an error")
        ? JSON.parse(error.message.split(": ")[1]).error
        : error.message;

    toast({
        title: `Erro ao executar ${context}`,
        description: errorMessage || "Ocorreu um erro. Tente novamente.",
        variant: "destructive",
    });

    throw new Error(errorMessage);
};

// ======================================================
// CONTAR REGISTROS (genérico)
// ======================================================
export const contarRegistros = async (table, filters = []) => {
    try {
        let query = supabase
            .from(table)
            .select("*", { count: "exact", head: true });

        filters.forEach((filter) => {
            if (filter.column && filter.operator && filter.value !== undefined) {
                query = query[filter.operator](filter.column, filter.value);
            }
        });

        const { count, error } = await query;
        if (error) throw error;

        return count;
    } catch (error) {
        handleApiError(error, `contar registros em ${table}`);
    }
};

// ======================================================
// CRUD GENÉRICO
// ======================================================
const genericFetch = async (table, options = {}) => {
    const { method = "select", data = null, id = null, select = "*" } = options;
    let query = supabase.from(table);

    try {
        switch (method) {
            case "select":
                query = query.select(select, { count: "exact" });
                break;
            case "insert":
                query = query.insert(data).select(select);
                break;
            case "update":
                query = query.update(data).eq("id", id).select(select);
                break;
            case "delete":
                query = query.delete().eq("id", id);
                break;
            default:
                throw new Error(`Método inválido: ${method}`);
        }

        const { data: result, error, count } = await query;
        if (error) throw error;

        if (method === "select") return { data: result, count };
        return result;

    } catch (error) {
        handleApiError(error, `genericFetch ${method} em ${table}`);
    }
};

// ======================================================
// CLIENTES
// ======================================================
export const listarClientes = async (filtros = {}) => {
    try {
        let query = supabase
            .from("clientes")
            .select("id, nome, celular, email", { count: "exact" });

        if (filtros.busca) {
            const term = safeTerm(filtros.busca);
            query = query.or(`nome.ilike.%${term}%,celular.like.%${term}%`);
        }

        query = query.order("nome");

        const { data, error, count } = await query;
        if (error) throw error;

        return { data, count };
    } catch (error) {
        handleApiError(error, "listar clientes");
    }
};

export const obterCliente = async (id) => {
    try {
        const { data, error } = await supabase
            .from("clientes")
            .select("*, enderecos(*)")
            .eq("id", id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "obter cliente");
    }
};

export const criarCliente = (data) =>
    genericFetch("clientes", {
        method: "insert",
        data,
        select: "id, nome, celular",
    });

export const atualizarCliente = (id, data) =>
    genericFetch("clientes", {
        method: "update",
        data,
        id,
        select: "id, nome",
    });

export const deletarCliente = async (id) => {
    try {
        await supabase.from("enderecos").delete().eq("cliente_id", id);
        return await genericFetch("clientes", { method: "delete", id });
    } catch (error) {
        handleApiError(error, "deletar cliente");
    }
};

export const buscarClientePorCelular = async (celular) => {
    try {
        const term = safeTerm(celular).replace(/\D/g, "");

        const { data, error } = await supabase
            .from("clientes")
            .select()
            .eq("celular", term)
            .maybeSingle();

        if (error && error.code !== "PGRST116") throw error;
        return data;
    } catch (error) {
        handleApiError(error, "buscar cliente por celular");
    }
};

// ======================================================
// ENDEREÇOS
// ======================================================
export const listarEnderecos = async (clienteId) => {
    try {
        const { data, error } = await supabase
            .from("enderecos")
            .select("*")
            .eq("cliente_id", clienteId);

        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "listar endereços");
    }
};

export const criarEndereco = (data) =>
    genericFetch("enderecos", { method: "insert", data });

export const atualizarEndereco = (id, data) =>
    genericFetch("enderecos", { method: "update", data, id });

export const deletarEndereco = (id) =>
    genericFetch("enderecos", { method: "delete", id });

// ======================================================
// CATEGORIAS
// ======================================================
export const listarCategorias = async () => {
    try {
        const { data, error } = await supabase
            .from("categorias")
            .select("id, nome");

        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "listar categorias");
    }
};

export const criarCategoria = (data) =>
    genericFetch("categorias", { method: "insert", data });

export const atualizarCategoria = (id, data) =>
    genericFetch("categorias", { method: "update", data, id });

export const deletarCategoria = (id) =>
    genericFetch("categorias", { method: "delete", id });

// ======================================================
// PRODUTOS
// ======================================================
export const listarProdutos = async (filtros = {}) => {
    try {
        let query = supabase
            .from("produtos")
            .select(
                "id, nome, preco, ativo, grupos_complementos, categoria_id, categoria:categorias(nome)",
                { count: "exact" }
            );

        if (filtros.nome)
            query = query.ilike("nome", `%${safeTerm(filtros.nome)}%`);
        if (filtros.categoria_id)
            query = query.eq("categoria_id", filtros.categoria_id);
        if (filtros.ativo !== undefined)
            query = query.eq("ativo", filtros.ativo);

        query = query.order("nome", { ascending: true });

        const { data, error, count } = await query;
        if (error) throw error;

        return { data, count };
    } catch (error) {
        handleApiError(error, "listar produtos");
    }
};

export const criarProduto = (data) =>
    genericFetch("produtos", { method: "insert", data });

export const atualizarProduto = (id, data) =>
    genericFetch("produtos", { method: "update", data, id });

export const deletarProduto = (id) =>
    genericFetch("produtos", { method: "delete", id });

// ======================================================
// GRUPOS DE COMPLEMENTOS (COM OPÇÕES)
// ======================================================
export const listarGruposComplementos = async () => {
    try {
        const { data, error } = await supabase
            .from("grupos_complementos")
            .select("*");

        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "listar grupos de complementos");
    }
};

export const criarGrupoComplemento = (data) =>
    genericFetch("grupos_complementos", {
        method: "insert",
        data,
    });

export const atualizarGrupoComplemento = (id, data) =>
    genericFetch("grupos_complementos", {
        method: "update",
        data,
        id,
    });

export const deletarGrupoComplemento = (id) =>
    genericFetch("grupos_complementos", {
        method: "delete",
        id,
    });

export const listarGruposComplementosComOpcoes = async () => {
    try {
        const { data, error } = await supabase
            .from("grupos_complementos")
            .select("*");

        if (error) throw error;

        const grupos = data || [];

        return grupos.map((g) => {
            const opcoes = Array.isArray(g?.opcoes) ? g.opcoes : [];

            const opcoesNormalizadas = opcoes.map((o, idx) => ({
                id: o?.id ?? idx,
                nome: typeof o?.nome === "string" ? o.nome : String(o?.nome ?? ""),
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
        handleApiError(error, "listar grupos com opções");
    }
};

// ======================================================
// PEDIDOS
// ======================================================
export const listarPedidos = async (filtros = {}) => {
    try {
        const raw = filtros.busca?.trim() || "";
        const term = safeTerm(raw);
        const isNumber = /^\d+$/.test(term);

        let query = supabase
            .from("pedidos")
            .select(`
                id,
                cliente_id,
                data_entrega,
                hora_entrega,
                tipo_entrega,
                status_pagamento,
                status_entrega,
                total,
                cliente:clientes!inner(id, nome)
            `, { count: "exact" });

        if (isNumber && term.length > 0) {
            query = query.eq("id", Number(term));
        }

        if (!isNumber && term.length > 0) {
            query = query.ilike("clientes.nome", `%${term}%`);
        }

        if (filtros.status_pagamento)
            query = query.eq("status_pagamento", filtros.status_pagamento);

        if (filtros.status_entrega)
            query = query.eq("status_entrega", filtros.status_entrega);

        if (filtros.status_geral === "concluidos") {
            query = query
                .eq("status_entrega", "Entregue")
                .eq("status_pagamento", "Pago");
        }

        if (filtros.status_geral === "abertos") {
            query = query.or(
                "status_pagamento.neq.Pago,status_entrega.neq.Entregue"
            );
        }

        // Filtros de Data
        if (filtros.data_entrega_gte)
            query = query.gte("data_entrega", filtros.data_entrega_gte);

        if (filtros.data_entrega_lte)
            query = query.lte("data_entrega", filtros.data_entrega_lte);
        
        // Filter for specific status_pagamento AND status_entrega
        if (filtros.specific_status_pagamento && filtros.specific_status_entrega_neq) {
            query = query
                .eq("status_pagamento", filtros.specific_status_pagamento)
                .neq("status_entrega", filtros.specific_status_entrega_neq);
        }

        const { data, error, count } = await query;

        if (error) throw error;

        const pedidosComCliente = data.map((p) => ({
            ...p,
            cliente_nome: p.cliente?.nome || "Cliente não encontrado",
        }));

        // Buscar tags para cada pedido
        const pedidosIds = pedidosComCliente.map(p => p.id);
        
        let pedidosComTags = pedidosComCliente;
        
        if (pedidosIds.length > 0) {
            const { data: pedidoTagsData, error: tagsError } = await supabase
                .from("pedido_tags")
                .select("pedido_id, tag_id, tags(id, nome, cor)")
                .in("pedido_id", pedidosIds);

            if (!tagsError && pedidoTagsData) {
                pedidosComTags = pedidosComCliente.map(pedido => {
                    const tagsRelacionadas = pedidoTagsData
                        .filter(pt => pt.pedido_id === pedido.id)
                        .map(pt => pt.tags)
                        .filter(Boolean);
                    
                    return {
                        ...pedido,
                        tags: tagsRelacionadas,
                        tag_ids: tagsRelacionadas.map(t => t.id)   // <-- ESSENCIAL
                    };

                });
            }
        }

        // Filtro de tags (se fornecido)
        let pedidosFiltrados = pedidosComTags;
        if (filtros.tag_ids && Array.isArray(filtros.tag_ids) && filtros.tag_ids.length > 0) {
            pedidosFiltrados = pedidosComTags.filter(pedido => {
                if (!pedido.tags || pedido.tags.length === 0) return false;
                return pedido.tags.some(tag => filtros.tag_ids.includes(tag.id));
            });
        }

        return {
            data: pedidosFiltrados,
            count: pedidosFiltrados.length,
        };

    } catch (error) {
        handleApiError(error, "listar pedidos");
    }
};

// ======================================================
// TOTAL DE PEDIDOS & VALOR (GLOBAL)
// ======================================================
export const obterTotalPedidosGeral = async (filtros = {}) => {
    try {
        let query = supabase
            .from("pedidos")
            .select("total", { count: "exact" });

        // Aplicar filtros de data se existirem
        if (filtros.data_entrega_gte)
            query = query.gte("data_entrega", filtros.data_entrega_gte);

        if (filtros.data_entrega_lte)
            query = query.lte("data_entrega", filtros.data_entrega_lte);

        const { count, data, error } = await query;

        if (error) throw error;

        const totalValue = (data || []).reduce((acc, pedido) => acc + (Number(pedido.total) || 0), 0);

        return { count, totalValue };
    } catch (error) {
        handleApiError(error, "obter total de pedidos geral");
    }
};


export const obterPedidoCompleto = async (id) => {
    try {
        const { data, error } = await supabase
            .from("pedidos")
            .select(
                "*, cliente:clientes(*), endereco_entrega:enderecos!endereco_entrega_id(*), itens:itens_pedido(*, produtos(nome))"
            )
            .eq("id", id)
            .single();

        if (error) throw error;

        // Buscar tags do pedido
        const { data: pedidoTagsData } = await supabase
            .from("pedido_tags")
            .select("tag_id, tags(id, nome, cor)")
            .eq("pedido_id", id);

        const tags = (pedidoTagsData || []).map(pt => pt.tags).filter(Boolean);

        // 🔥 SOLUÇÃO: NÃO RETORNAR tags NEM tag_ids para o Step3
        return {
            ...data,
            _tags: tags,       // <-- safe (Horizon ignora porque começa com "_")
            _tag_ids: tags.map(t => t.id) // <-- safe
        };

    } catch (error) {
        handleApiError(error, "obter pedido completo");
    }
};


export const criarPedido = async (pedidoData) => {
    try {
        const { itens, cliente, ...pedido } = pedidoData;

        // REMOVER CAMPOS QUE NÃO EXISTEM NA TABELA PEDIDOS
        delete pedidoInfo.tag_ids;
        delete pedidoInfo.tags;

        const { data: novoPedido, error: pedidoError } = await supabase
            .from("pedidos")
            .insert({
                ...pedido,
                cliente_id: cliente.id,
            })
            .select()
            .single();

        if (pedidoError) throw pedidoError;

        const itensComPedidoId = itens.map(
            ({ id, produto_nome, valor_total, ...item }) => ({
                ...item,
                pedido_id: novoPedido.id,
            })
        );

        const { error: itensError } = await supabase
            .from("itens_pedido")
            .insert(itensComPedidoId);

        if (itensError) throw itensError;

        return novoPedido;
    } catch (error) {
        handleApiError(error, "criar pedido");
    }
};

export const atualizarPedido = async (pedidoId, data) => {
    try {
        const { data: result, error } = await supabase
            .from("pedidos")
            .update(data)
            .eq("id", pedidoId)
            .select()
            .single();

        if (error) throw error;
        return result;
    } catch (error) {
        handleApiError(error, "atualizar pedido");
    }
};

export const atualizarPedidoCompleto = async (pedidoId, pedidoData) => {
    try {
        const { itens, cliente, endereco_entrega, ...pedidoInfo } = pedidoData;

        // REMOVER CAMPOS QUE NÃO PERTENCEM À TABELA PEDIDOS
        delete pedidoInfo.tag_ids;

        const { id, ...dadosParaAtualizar } = pedidoInfo;

        const pedidoParaSalvar = {
            ...dadosParaAtualizar,
            cliente_id: cliente?.id || pedidoInfo.cliente_id,
        };

        const { data: pedidoAtualizado, error: pedidoError } = await supabase
            .from("pedidos")
            .update(pedidoParaSalvar)
            .eq("id", pedidoId)
            .select()
            .single();

        if (pedidoError) throw pedidoError;

        await supabase.from("itens_pedido").delete().eq("pedido_id", pedidoId);

        const itensNormalizados = itens.map((item) => ({
            pedido_id: pedidoId,
            produto_id: item.produto_id,
            quantidade: item.quantidade,
            observacao: item.observacao,
            complementos: item.complementos,
            valor_unitario: item.valor_unitario,
        }));

        if (itensNormalizados.length > 0) {
            const { error: insertError } = await supabase
                .from("itens_pedido")
                .insert(itensNormalizados);

            if (insertError) throw insertError;
        }

        return pedidoAtualizado;
    } catch (error) {
        handleApiError(error, "atualizar pedido completo");
    }
};


export const deletarPedido = async (id) => {
    try {
        await supabase.from("pedido_tags").delete().eq("pedido_id", id);
        await supabase.from("itens_pedido").delete().eq("pedido_id", id);
        await supabase.from("pedidos").delete().eq("id", id);
    } catch (error) {
        handleApiError(error, "deletar pedido");
    }
};

// ======================================================
// USUÁRIOS
// ======================================================
export const listarUsuarios = async () => {
    try {
        const { data, error } = await supabase.functions.invoke(
            "admin-list-users"
        );
        if (error) throw new Error(error.message);
        return data;
    } catch (error) {
        handleApiError(error, "listar usuários");
    }
};

export const criarUsuario = async (data) => {
    try {
        const { nome, email, password, perfil_id } = data;

        const { data: result, error } = await supabase.functions.invoke(
            "admin-create-user",
            {
                body: { nome, email, password, perfil_id },
            }
        );

        if (error) throw new Error(error.message);
        if (result.error) throw new Error(result.error);

        return result;
    } catch (error) {
        handleApiError(error, "criar usuário");
    }
};

export const atualizarUsuario = async (userId, data) => {
    try {
        const { data: result, error } = await supabase.functions.invoke(
            "admin-update-user",
            {
                body: { userId, ...data },
            }
        );

        if (error) throw new Error(error.message);
        if (result.error) throw new Error(result.error);

        return result;
    } catch (error) {
        handleApiError(error, "atualizar usuário");
    }
};

export const deletarUsuario = async (userId) => {
    try {
        const { data, error } = await supabase.functions.invoke(
            "admin-delete-user",
            {
                body: { userId },
            }
        );

        if (error) throw new Error(error.message);
        if (data.error) throw new Error(data.error);

        return data;
    } catch (error) {
        handleApiError(error, "deletar usuário");
    }
};

// ======================================================
// PERFIS
// ======================================================
export const listarPerfis = async () => {
    try {
        const { data, error } = await supabase.from("perfis").select("*");
        if (error) throw error;
        return data;
    } catch (error) {
        handleApiError(error, "listar perfis");
    }
};

export const criarPerfil = (data) =>
    genericFetch("perfis", {
        method: "insert",
        data,
    });

export const atualizarPerfil = (id, data) =>
    genericFetch("perfis", {
        method: "update",
        data,
        id,
    });

export const deletarPerfil = (id) =>
    genericFetch("perfis", {
        method: "delete",
        id,
    });

// ======================================================
// CONSULTA CEP
// ======================================================
export const buscarCep = async (cep) => {
    try {
        const response = await fetch(
            `https://viacep.com.br/ws/${cep}/json/`
        );

        if (!response.ok) throw new Error("CEP inválido");

        const data = await response.json();
        return data.erro ? { erro: true } : data;
    } catch (error) {
        handleApiError(error, "buscar CEP");
        return { erro: true };
    }
};