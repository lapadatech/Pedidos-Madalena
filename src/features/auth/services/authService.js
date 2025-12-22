import { supabase } from '@/shared/lib/customSupabaseClient';

const buildPerfilFallback = (role) => {
  if (!role)
    return {
      nome: 'Atendente',
      permissoes: {
        pedidos: '*',
        clientes: { visualizar: true, editar: true },
        produtos: { visualizar: true },
      },
    };
  const normalized = role.toLowerCase();
  if (normalized === 'gerente') {
    return {
      nome: 'Gerente',
      permissoes: { pedidos: '*', clientes: '*', produtos: '*', configuracoes: '*' },
    };
  }
  return {
    nome: normalized.charAt(0).toUpperCase() + normalized.slice(1),
    permissoes: {
      pedidos: '*',
      clientes: { visualizar: true, editar: true },
      produtos: { visualizar: true },
    },
  };
};

const buildPerfil = (role, storeRoleRow) => {
  if (storeRoleRow?.permissions) {
    return {
      nome: storeRoleRow.name || role || 'Perfil',
      permissoes: storeRoleRow.permissions,
    };
  }
  return buildPerfilFallback(role);
};

const extractSlugFromLocation = () => {
  if (typeof window === 'undefined') return null;
  const segments = window.location.pathname.split('/').filter(Boolean);
  if (!segments.length) return null;
  if (segments[0] === 'admin') return null;
  return segments[0];
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
    try {
      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();
      if (authUserError || !authUser) {
        console.error('Error fetching auth user:', authUserError);
        return null;
      }

      const currentSlug = extractSlugFromLocation();

      // Preferir a Edge Function (service role) para evitar stack depth / RLS.
      // Se falhar (401/404/etc), seguimos para o fallback direto no banco.
      try {
        const { data: fnData, error: fnError } = await supabase.functions.invoke(
          'get-user-profile',
          {
            body: { storeSlug: currentSlug },
          }
        );
        if (fnError) {
          console.error('Error invoking get-user-profile function:', fnError);
        } else if (fnData) {
          const lojasFromFn = (fnData.stores || []).map((store) => {
            const roleId = store.role?.id || store.role?.name || store.role || 'atendente';
            const perfil = buildPerfil(roleId, store.role);
            return {
              id: store.id,
              nome: store.name,
              slug: store.slug,
              ativo: store.active ?? true,
              role: roleId,
              perfil,
            };
          });

          return {
            id: fnData.user_id || authUser.id,
            nome:
              fnData.profile?.full_name ||
              authUser.email?.split('@')[0]?.toUpperCase() ||
              'USUARIO',
            email: authUser.email,
            lojas: lojasFromFn,
            is_admin: !!fnData.is_admin,
          };
        }
      } catch (err) {
        console.error('Unexpected error calling get-user-profile function:', err);
        // continua para fallback
      }

      // Fallback direto no banco (pode ser bloqueado por RLS). Só use se realmente precisar.
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
