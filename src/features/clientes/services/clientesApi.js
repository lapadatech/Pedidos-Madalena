import { handleApiError, safeTerm, supabase } from '@/shared/lib/apiBase';

export const listarClientes = async (filtros = {}) => {
  try {
    let query = supabase.from('clientes').select('id, nome, celular, email', { count: 'exact' });

    if (filtros.busca) {
      const term = safeTerm(filtros.busca);
      query = query.or(`nome.ilike.%${term}%,celular.like.%${term}%`);
    }

    query = query.order('nome');

    const { data, error, count } = await query;
    if (error) throw error;

    return { data, count };
  } catch (error) {
    handleApiError(error, 'listar clientes');
  }
};

export const obterCliente = async (id) => {
  try {
    const { data, error } = await supabase
      .from('clientes')
      .select('*, enderecos(*)')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'obter cliente');
  }
};

export const criarCliente = async (data, storeId) => {
  try {
    const { data: result, error } = await supabase.rpc('create_customer', {
      p_store_id: storeId || null,
      p_payload: data,
    });
    if (error) throw error;
    return result ? [result] : [];
  } catch (error) {
    handleApiError(error, 'criar cliente');
  }
};

export const atualizarCliente = async (id, data) => {
  try {
    const { data: result, error } = await supabase.rpc('update_customer', {
      p_cliente_id: id,
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar cliente');
  }
};

export const deletarCliente = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_customer', { p_cliente_id: id });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deletar cliente');
  }
};

export const buscarClientePorCelular = async (celular) => {
  try {
    const term = safeTerm(celular).replace(/\D/g, '');

    const { data, error } = await supabase
      .from('clientes')
      .select()
      .eq('celular', term)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'buscar cliente por celular');
  }
};

export const listarEnderecos = async (clienteId) => {
  try {
    const { data, error } = await supabase
      .from('enderecos')
      .select('*')
      .eq('cliente_id', clienteId);

    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar enderecos');
  }
};

export const criarEndereco = async (data) => {
  try {
    const { data: result, error } = await supabase.rpc('create_address', {
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'criar endereco');
  }
};

export const atualizarEndereco = async (id, data) => {
  try {
    const { data: result, error } = await supabase.rpc('update_address', {
      p_endereco_id: id,
      p_payload: data,
    });
    if (error) throw error;
    return result;
  } catch (error) {
    handleApiError(error, 'atualizar endereco');
  }
};

export const deletarEndereco = async (id) => {
  try {
    const { error } = await supabase.rpc('delete_address', { p_endereco_id: id });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'deletar endereco');
  }
};

export const buscarCep = async (cep) => {
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);

    if (!response.ok) throw new Error('CEP invalido');

    const data = await response.json();
    return data.erro ? { erro: true } : data;
  } catch (error) {
    handleApiError(error, 'buscar CEP');
    return { erro: true };
  }
};
