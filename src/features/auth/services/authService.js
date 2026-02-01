import { supabase } from '@/shared/lib/customSupabaseClient';

const MODULE_ALIASES = {
  pedidos: 'orders',
  clientes: 'customers',
  produtos: 'products',
  configuracoes: 'settings',
};

const normalizePermissoes = (raw = {}) => {
  const normalized = {};

  Object.entries(raw || {}).forEach(([modulo, value]) => {
    const mappedModule = MODULE_ALIASES[modulo] || modulo;
    if (value === '*') {
      normalized[mappedModule] = {
        read: true,
        create: true,
        update: true,
        delete: true,
        print: true,
        status: true,
      };
      return;
    }

    if (Array.isArray(value)) {
      const has = (acao) => value.includes(acao) || value.includes('*');
      normalized[mappedModule] = {
        read: has('read') || has('visualizar'),
        create: has('create') || has('criar') || has('editar'),
        update: has('update') || has('editar'),
        delete: has('delete') || has('gerenciar'),
        print: has('print') || has('imprimir'),
        status: has('status'),
      };
      return;
    }

    if (value && typeof value === 'object') {
      const hasLegacy =
        'visualizar' in value || 'editar' in value || 'gerenciar' in value || 'excluir' in value;
      if (hasLegacy) {
        const visualizar = !!value.visualizar || !!value.editar || !!value.gerenciar;
        const editar = !!value.editar || !!value.gerenciar;
        const gerenciar = !!value.gerenciar || !!value.excluir;
        normalized[mappedModule] = {
          read: visualizar,
          create: editar,
          update: editar,
          delete: gerenciar,
          print: visualizar,
          status: editar,
        };
        return;
      }

      normalized[mappedModule] = {
        read: !!value.read,
        create: !!value.create,
        update: !!value.update,
        delete: !!value.delete,
        print: !!value.print,
        status: !!value.status,
      };
      return;
    }

    normalized[mappedModule] = {
      read: false,
      create: false,
      update: false,
      delete: false,
      print: false,
      status: false,
    };
  });

  return normalized;
};

const buildPerfilFallback = (role) => {
  if (!role)
    return {
      nome: 'Atendente',
      permissoes: normalizePermissoes({
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
        products: { read: true },
      }),
    };
  const normalized = role.toLowerCase();
  if (normalized === 'gerente') {
    return {
      nome: 'Gerente',
      permissoes: normalizePermissoes({
        dashboard: { read: true },
        orders: '*',
        customers: '*',
        products: '*',
        settings: { read: true, update: true },
      }),
    };
  }
  return {
    nome: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    permissoes: normalizePermissoes({
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
      products: { read: true },
    }),
  };
};

const buildPerfil = (role, storeRoleRow) => {
  if (storeRoleRow?.permissions) {
    return {
      nome: storeRoleRow.name || role || 'Perfil',
      permissoes: normalizePermissoes(storeRoleRow.permissions),
    };
  }
  return buildPerfilFallback(role);
};

export const authService = {
  async getSession() {
    return supabase.auth.getSession();
  },

  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  async getUserProfile(userId) {
    if (!userId) return null;

    // Fallback direto no banco (pode ser bloqueado por RLS). So use se realmente precisar.
    try {
      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();
      if (authUserError || !authUser) {
        console.error('Error fetching auth user:', authUserError);
        return null;
      }

      // Fallback direto no banco (pode ser bloqueado por RLS). So use se realmente precisar.
      const { data: adminRow } = await supabase
        .from('platform_admin_profiles')
        .select('id, user_id, full_name')
        .eq('user_id', userId)
        .maybeSingle();
      const isPlatformAdmin = !!adminRow;

      const { data: storeProfile } = await supabase
        .from('store_user_profiles')
        .select('id, user_id, full_name')
        .eq('user_id', userId)
        .maybeSingle();

      let lojas = [];
      if (!isPlatformAdmin) {
        const { data: accessRows, error: accessError } = await supabase
          .from('user_store_access')
          .select('store_id, role')
          .eq('user_id', userId);

        if (accessError) {
          console.error('Error fetching user stores:', accessError.message);
          lojas = [];
        } else {
          const storeIds = (accessRows || []).map((r) => r.store_id).filter(Boolean);
          const rolesIds = (accessRows || []).map((r) => r.role).filter(Boolean);

          let storesById = {};
          if (storeIds.length > 0) {
            const { data: storesRows, error: storesError } = await supabase
              .from('stores')
              .select('id, name, slug, active')
              .in('id', storeIds);
            if (storesError) {
              console.error('Error fetching stores for user:', storesError.message);
            } else {
              storesById = (storesRows || []).reduce((acc, s) => {
                acc[s.id] = s;
                return acc;
              }, {});
            }
          }

          let rolesById = {};
          if (rolesIds.length > 0) {
            const { data: rolesRows, error: rolesError } = await supabase
              .from('store_roles')
              .select('id, name, permissions')
              .in('id', rolesIds);
            if (rolesError) {
              console.error('Error fetching store roles:', rolesError.message);
            } else {
              rolesById = (rolesRows || []).reduce((acc, r) => {
                acc[r.id] = r;
                return acc;
              }, {});
            }
          }

          lojas = (accessRows || [])
            .map((row) => {
              const store = storesById[row.store_id];
              const roleRow = rolesById[row.role];
              return {
                id: store?.id || row.store_id,
                nome: store?.name,
                slug: store?.slug,
                ativo: store?.active ?? true,
                role: row.role,
                perfil: buildPerfil(row.role, roleRow),
              };
            })
            .filter((loja) => loja.id && loja.slug);
        }
      }

      return {
        id: authUser.id,
        nome:
          adminRow?.full_name ||
          storeProfile?.full_name ||
          authUser.email?.split('@')[0]?.toUpperCase() ||
          'USUARIO',
        email: authUser.email,
        lojas,
        is_admin: isPlatformAdmin,
      };
    } catch (err) {
      console.error('Unexpected error in getUserProfile:', err);
      return {
        id: userId,
        nome: 'USUARIO',
        email: null,
        lojas: [],
        is_admin: false,
      };
    }
  },

  async signIn(email, password) {
    return supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  async signOut() {
    return supabase.auth.signOut();
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
