import { handleApiError, supabase } from '@/shared/lib/apiBase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const decodeJwt = (token) => {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getAccessToken = async () => {
  let session = (await supabase.auth.getSession())?.data?.session || null;
  if (!session?.access_token) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed?.data?.session || null;
  }

  let token = session?.access_token;
  if (!token && typeof window !== 'undefined') {
    const projectRef = SUPABASE_URL?.replace('https://', '').split('.')[0];
    const raw = projectRef
      ? window.localStorage.getItem(`sb-${projectRef}-auth-token`)
      : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      token = parsed?.access_token || null;
    }
  }

  if (!token) {
    throw new Error('Sessao expirada. Faca login novamente.');
  }

  const payload = decodeJwt(token);
  if (!payload || payload.role !== 'authenticated' || !payload.sub) {
    throw new Error('Sessao invalida. Faca login novamente.');
  }

  return token;
};

const callAdminUsers = async (payload) => {
  const token = await getAccessToken();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/admin-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(json?.error || 'Erro na Edge Function.');
  }

  return json;
};

// Usuarios
export const listarUsuarios = async () => {
  try {
    const { data: profiles, error: profilesError } = await supabase
      .from('store_user_profiles')
      .select('user_id, full_name, email');
    if (profilesError) throw profilesError;

    const userIds = (profiles || []).map((p) => p.user_id).filter(Boolean);
    let accessByUser = {};
    let rolesById = {};

    if (userIds.length > 0) {
      const [{ data: accessRows, error: accessError }, { data: rolesRows, error: rolesError }] =
        await Promise.all([
          supabase.from('user_store_access').select('user_id, role').in('user_id', userIds),
          supabase.from('store_roles').select('id, name'),
        ]);
      if (accessError) throw accessError;
      if (rolesError) throw rolesError;

      accessByUser = (accessRows || []).reduce((acc, row) => {
        if (!acc[row.user_id]) acc[row.user_id] = [];
        acc[row.user_id].push(row.role);
        return acc;
      }, {});

      rolesById = (rolesRows || []).reduce((acc, row) => {
        acc[row.id] = row.name || row.id;
        return acc;
      }, {});
    }

    return (profiles || []).map((u) => {
      const roles = accessByUser[u.user_id] || [];
      const role = roles[0] || 'atendente';
      return {
        id: u.user_id,
        nome: u.full_name,
        email: u.email,
        perfil_id: role,
        perfil: { nome: rolesById[role] || role },
      };
    });
  } catch (error) {
    handleApiError(error, 'listar usuarios');
    return [];
  }
};

export const criarUsuario = async ({ nome, email, password, perfil_id, loja_ids }) => {
  try {
    const storeId = Array.isArray(loja_ids) ? loja_ids[0] : null;
    if (!storeId) {
      throw new Error('store_id obrigatorio para criar usuario');
    }

    const action = password ? 'create_user' : 'invite_user';
    return await callAdminUsers({
      action,
      full_name: nome,
      email,
      password: password || null,
      store_id: storeId,
      role_id: perfil_id,
    });
  } catch (error) {
    handleApiError(error, 'criar usuario via function');
  }
};

export const atualizarUsuario = async (userId, data = {}) => {
  try {
    if (!userId) throw new Error('user_id obrigatorio');
    if (!data.password) return true;

    return await callAdminUsers({
      action: 'reset_password',
      user_id: userId,
    });
  } catch (error) {
    handleApiError(error, 'resetar senha do usuario');
  }
};

export const deletarUsuario = async (userId) => {
  try {
    if (!userId) throw new Error('user_id obrigatorio');
    return await callAdminUsers({
      action: 'set_user_enabled',
      user_id: userId,
      enabled: false,
    });
  } catch (error) {
    handleApiError(error, 'desativar usuario');
  }
};

// Perfis
export const listarPerfis = async () => {
  try {
    const { data, error } = await supabase
      .from('store_roles')
      .select('id, name, permissions')
      .order('name');
    if (error) throw error;
    const origem =
      data && data.length > 0
        ? data
        : [
            {
              id: 'gerente',
              name: 'Gerente',
              permissions: {
                dashboard: { read: true },
                orders: {
                  read: true,
                  create: true,
                  update: true,
                  delete: true,
                  print: true,
                  status: true,
                },
                customers: { read: true, create: true, update: true, delete: true },
                products: { read: true, create: true, update: true, delete: true },
                settings: { read: true, update: true },
              },
            },
            {
              id: 'atendente',
              name: 'Atendente',
              permissions: {
                dashboard: { read: true },
                orders: {
                  read: true,
                  create: true,
                  update: true,
                  delete: false,
                  print: false,
                  status: true,
                },
                customers: { read: true, create: true, update: true, delete: false },
                products: { read: true, create: false, update: false, delete: false },
              },
            },
          ];

    return origem.map((role) => ({
      id: role.id,
      nome: role.name || role.id,
      permissoes: role.permissions || {},
    }));
  } catch (error) {
    // Se der erro (ex: RLS), devolve fallback padrao para nao quebrar tela.
    return [
      {
        id: 'gerente',
        nome: 'Gerente',
        permissoes: {
          dashboard: { read: true },
          orders: {
            read: true,
            create: true,
            update: true,
            delete: true,
            print: true,
            status: true,
          },
          customers: { read: true, create: true, update: true, delete: true },
          products: { read: true, create: true, update: true, delete: true },
          settings: { read: true, update: true },
        },
      },
      {
        id: 'atendente',
        nome: 'Atendente',
        permissoes: {
          dashboard: { read: true },
          orders: {
            read: true,
            create: true,
            update: true,
            delete: false,
            print: false,
            status: true,
          },
          customers: { read: true, create: true, update: true, delete: false },
          products: { read: true, create: false, update: false, delete: false },
        },
      },
    ];
  }
};

export const criarPerfil = async () => {
  throw new Error('Criação de perfis não suportada. Use os perfis existentes (atendente/gerente).');
};

export const atualizarPerfil = async (id, data) => {
  try {
    const payload = {
      name: data.nome,
      permissions: data.permissoes,
    };
    const { error } = await supabase.rpc('update_role', {
      p_role_id: id,
      p_name: payload.name,
      p_permissions: payload.permissions,
    });
    if (error) throw error;
    return true;
  } catch (error) {
    handleApiError(error, 'atualizar perfil (store_roles)');
  }
};

export const deletarPerfil = async () => {
  throw new Error('Exclusão de perfis não suportada. Use perfis existentes.');
};

// Usuarios por loja
export const vincularUsuarioLoja = async ({ user_id, loja_id, perfil_id }) => {
  try {
    const { data, error } = await supabase.rpc('grant_user_store_access', {
      p_user_id: user_id,
      p_store_id: loja_id,
      p_role_id: perfil_id,
    });
    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'vincular usuario a loja');
  }
};
