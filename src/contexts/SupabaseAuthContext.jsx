import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authService } from '@/features/auth/services/authService';
import { useToast } from '@/shared/ui/use-toast';

const AuthContext = createContext(undefined);

const ROLE_PERMISSIONS = {
  gerente: {
    dashboard: { read: true },
    orders: { read: true, create: true, update: true, delete: true, print: true, status: true },
    customers: { read: true, create: true, update: true, delete: true },
    products: { read: true, create: true, update: true, delete: true },
    settings: { read: true, update: true },
  },
  atendente: {
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
    settings: { read: false, update: false },
  },
};

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

const buildPerfil = (role) => {
  if (!role) return { nome: 'Atendente', permissoes: ROLE_PERMISSIONS.atendente };
  const normalized = role.toLowerCase();
  if (ROLE_PERMISSIONS[normalized]) {
    const nome = normalized.charAt(0).toUpperCase() + normalized.slice(1);
    return { nome, permissoes: ROLE_PERMISSIONS[normalized] };
  }
  return { nome: role, permissoes: ROLE_PERMISSIONS.atendente };
};

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null); // Custom user profile from DB
  const [lojas, setLojas] = useState([]);
  const [lojaAtual, setLojaAtual] = useState(null);
  const [perfilAtual, setPerfilAtual] = useState(null);
  const [permissoes, setPermissoes] = useState({});
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setUsuario(null);
    setSession(null);
    setLojas([]);
    setLojaAtual(null);
    setPerfilAtual(null);
    setPermissoes({});
    setIsAdmin(false);
    setLoading(false);
  }, []);

  const initializeUser = useCallback(
    async (currentSession) => {
      try {
        setLoading(true);
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const profile = await authService.getUserProfile(currentSession.user.id);
          if (profile) {
            setUsuario(profile);
            setLojas(profile.lojas || []);
            setIsAdmin(!!profile.is_admin);
          } else {
            throw new Error('User profile not found.');
          }
        } else {
          clearSession();
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        await authService.signOut().catch(console.error);
        clearSession();
      } finally {
        setLoading(false);
      }
    },
    [clearSession]
  );

  useEffect(() => {
    const fetchInitialSession = async () => {
      const {
        data: { session: initialSession },
        error,
      } = await authService.getSession();
      if (error) {
        console.error('Error fetching initial session:', error);
        clearSession();
      } else {
        await initializeUser(initialSession);
      }
    };

    fetchInitialSession();

    const {
      data: { subscription },
    } = authService.onAuthStateChange(async (_event, newSession) => {
      await initializeUser(newSession);
    });

    return () => subscription.unsubscribe();
  }, [initializeUser, clearSession]);

  const signIn = useCallback(
    async (email, password) => {
      const { data, error } = await authService.signIn(email, password);
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Erro no Login',
          description: error.message,
        });
      }
      return { data, error };
    },
    [toast]
  );

  const signOut = useCallback(async () => {
    const { error } = await authService.signOut();
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao Sair',
        description: error.message,
      });
    } else {
      clearSession();
    }
    return { error };
  }, [toast, clearSession]);

  const selecionarLojaPorSlug = useCallback(
    (slug) => {
      if (!slug || !Array.isArray(lojas) || lojas.length === 0) {
        setLojaAtual(null);
        setPerfilAtual(null);
        setPermissoes({});
        return false;
      }

      if (isAdmin) {
        setLojaAtual(null);
        setPerfilAtual(null);
        setPermissoes({});
        return false;
      }

      const lojaEncontrada = lojas.find((loja) => loja.slug === slug);
      if (!lojaEncontrada) {
        setLojaAtual(null);
        setPerfilAtual(null);
        setPermissoes({});
        return false;
      }

      const perfil = lojaEncontrada.perfil || buildPerfil(lojaEncontrada.role);
      const permissoesNormalizadas = normalizePermissoes(perfil?.permissoes || {});

      setLojaAtual(lojaEncontrada);
      setPerfilAtual(perfil);
      setPermissoes(permissoesNormalizadas);
      return true;
    },
    [lojas, isAdmin]
  );

  const temPermissao = useCallback(
    (modulo, acao) => {
      if (loading || !usuario) return false;

      if (isAdmin) return false;

      const moduloNormalizado = MODULE_ALIASES[modulo] || modulo;
      if (!permissoes || !permissoes[moduloNormalizado]) return false;

      const permissoesModulo = permissoes[moduloNormalizado];

      if (Array.isArray(permissoesModulo)) {
        return permissoesModulo.includes(acao) || permissoesModulo.includes('*');
      }

      if (typeof permissoesModulo === 'object') {
        if (acao === 'read') return !!permissoesModulo.read;
        if (acao === 'create') return !!permissoesModulo.create;
        if (acao === 'update') return !!permissoesModulo.update;
        if (acao === 'delete') return !!permissoesModulo.delete;
        if (acao === 'print') return !!permissoesModulo.print;
        if (acao === 'status') return !!permissoesModulo.status;
        return false;
      }

      return permissoesModulo === '*' || permissoesModulo === acao;
    },
    [usuario, loading, permissoes, isAdmin]
  );

  const podeAcessarGestao = useMemo(() => {
    return isAdmin;
  }, [isAdmin]);

  const value = useMemo(
    () => ({
      user,
      session,
      usuario,
      lojas,
      lojaAtual,
      perfilAtual,
      isAdmin,
      loading,
      temPermissao,
      podeAcessarGestao,
      signIn,
      signOut,
      selecionarLojaPorSlug,
    }),
    [
      user,
      session,
      usuario,
      lojas,
      lojaAtual,
      perfilAtual,
      isAdmin,
      loading,
      temPermissao,
      podeAcessarGestao,
      signIn,
      signOut,
      selecionarLojaPorSlug,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an SupabaseAuthProvider');
  }
  return context;
};
