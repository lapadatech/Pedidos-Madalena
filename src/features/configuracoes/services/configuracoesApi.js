import { handleApiError, supabase } from '@/shared/lib/apiBase';

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
  }
};

export const criarUsuario = async ({ nome, email, password, perfil_id, loja_ids }) => {
  try {
    const { data, error } = await supabase.functions.invoke('create-store-user', {
      body: {
        full_name: nome,
        email,
        password,
        role: perfil_id,
        store_ids: loja_ids,
      },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (error) {
    handleApiError(error, 'criar usuario via function');
  }
};

export const atualizarUsuario = async () => {
  throw new Error(
    'Atualização de usuários requer chave service role ou endpoint backend seguro. Configure o backend e atualize esta função.'
  );
};

export const deletarUsuario = async () => {
  throw new Error(
    'Exclusão de usuários requer chave service role ou endpoint backend seguro. Configure o backend e atualize esta função.'
  );
};

// Perfis
export const listarPerfis = async () => {
  try {
    const { data, error } = await supabase
      .from('store_roles')
      .select('id, name, permissions')
      .in('id', ['gerente', 'atendente'])
      .order('name');
    if (error) throw error;
    const origem =
      data && data.length > 0
        ? data
        : [
            { id: 'gerente', name: 'Gerente', permissions: { dashboard: '*', clientes: '*', produtos: '*', pedidos: '*', configuracoes: '*' } },
            {
              id: 'atendente',
              name: 'Atendente',
              permissions: {
                pedidos: { visualizar: true, editar: true },
                clientes: { visualizar: true, editar: true },
                produtos: { visualizar: true },
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
        permissoes: { dashboard: '*', clientes: '*', produtos: '*', pedidos: '*', configuracoes: '*' },
      },
      {
        id: 'atendente',
        nome: 'Atendente',
        permissoes: {
          pedidos: { visualizar: true, editar: true },
          clientes: { visualizar: true, editar: true },
          produtos: { visualizar: true },
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
    const { error } = await supabase.from('store_roles').update(payload).eq('id', id);
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
    const { data, error } = await supabase
      .from('user_store_access')
      .upsert(
        { user_id, store_id: loja_id, role: perfil_id },
        { onConflict: 'user_id,store_id' }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    handleApiError(error, 'vincular usuario a loja');
  }
};
