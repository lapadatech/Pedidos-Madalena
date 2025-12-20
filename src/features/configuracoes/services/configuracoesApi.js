import { handleApiError, genericFetch, supabase } from '@/shared/lib/apiBase';

// Usuarios
export const listarUsuarios = async () => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-list-users');
    if (error) throw new Error(error.message);
    return data;
  } catch (error) {
    handleApiError(error, 'listar usuarios');
  }
};

export const criarUsuario = async (data) => {
  try {
    const { nome, email, password, perfil_id } = data;

    const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
      body: { nome, email, password, perfil_id },
    });

    if (error) throw new Error(error.message);
    if (result.error) throw new Error(result.error);

    return result;
  } catch (error) {
    handleApiError(error, 'criar usuario');
  }
};

export const atualizarUsuario = async (userId, data) => {
  try {
    const { data: result, error } = await supabase.functions.invoke('admin-update-user', {
      body: { userId, ...data },
    });

    if (error) throw new Error(error.message);
    if (result.error) throw new Error(result.error);

    return result;
  } catch (error) {
    handleApiError(error, 'atualizar usuario');
  }
};

export const deletarUsuario = async (userId) => {
  try {
    const { data, error } = await supabase.functions.invoke('admin-delete-user', {
      body: { userId },
    });

    if (error) throw new Error(error.message);
    if (data.error) throw new Error(data.error);

    return data;
  } catch (error) {
    handleApiError(error, 'deletar usuario');
  }
};

// Perfis
export const listarPerfis = async () => {
  try {
    const { data, error } = await supabase.from('perfis').select('*');
    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'listar perfis');
  }
};

export const criarPerfil = (data) =>
  genericFetch('perfis', {
    method: 'insert',
    data,
  });

export const atualizarPerfil = (id, data) =>
  genericFetch('perfis', {
    method: 'update',
    data,
    id,
  });

export const deletarPerfil = (id) =>
  genericFetch('perfis', {
    method: 'delete',
    id,
  });
