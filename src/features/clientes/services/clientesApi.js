import { handleApiError, safeTerm, genericFetch, supabase } from '@/shared/lib/apiBase';

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

export const criarCliente = (data) =>
  genericFetch('clientes', {
    method: 'insert',
    data,
    select: 'id, nome, celular',
  });

export const atualizarCliente = (id, data) =>
  genericFetch('clientes', {
    method: 'update',
    data,
    id,
    select: 'id, nome',
  });

export const deletarCliente = async (id) => {
  try {
    await supabase.from('enderecos').delete().eq('cliente_id', id);
    return await genericFetch('clientes', { method: 'delete', id });
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

export const criarEndereco = (data) => genericFetch('enderecos', { method: 'insert', data });

export const atualizarEndereco = (id, data) =>
  genericFetch('enderecos', { method: 'update', data, id });

export const deletarEndereco = (id) => genericFetch('enderecos', { method: 'delete', id });

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
