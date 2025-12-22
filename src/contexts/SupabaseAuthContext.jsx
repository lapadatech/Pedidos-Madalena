import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authService } from '@/features/auth/services/authService';
import { useToast } from '@/shared/ui/use-toast';

const AuthContext = createContext(undefined);

const ROLE_PERMISSIONS = {
  gerente: {
    pedidos: '*',
    clientes: '*',
    produtos: '*',
    configuracoes: '*',
  },
  atendente: {
    pedidos: '*',
    clientes: { visualizar: true, editar: true },
    produtos: { visualizar: true },
  },
  admin: {
    pedidos: '*',
    clientes: '*',
    produtos: '*',
    configuracoes: '*',
  },
};

const buildPerfil = (role) => {
  if (!role) return { nome: 'Atendente', permissoes: ROLE_PERMISSIONS.atendente };
  const normalized = role.toLowerCase();
  if (normalized === 'administrador' || normalized === 'admin') {
    return { nome: 'Admin', permissoes: ROLE_PERMISSIONS.admin };
  }
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

      setLojaAtual(lojaEncontrada);
      setPerfilAtual(perfil);
      setPermissoes(perfil?.permissoes || {});
      return true;
    },
    [lojas, isAdmin]
  );

  const temPermissao = useCallback(
    (modulo, acao) => {
      if (loading || !usuario) return false;

      if (isAdmin) return true;

      if (!permissoes || !permissoes[modulo]) return false;

      const permissoesModulo = permissoes[modulo];

      if (Array.isArray(permissoesModulo)) {
        return permissoesModulo.includes(acao) || permissoesModulo.includes('*');
      }

      if (typeof permissoesModulo === 'object') {
        if (acao === 'visualizar')
          return (
            !!permissoesModulo.visualizar ||
            !!permissoesModulo.editar ||
            !!permissoesModulo.gerenciar
          );
        if (acao === 'editar') return !!permissoesModulo.editar || !!permissoesModulo.gerenciar;
        return !!permissoesModulo[acao];
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
