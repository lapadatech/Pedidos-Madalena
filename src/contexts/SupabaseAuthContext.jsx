import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { authService } from '@/services/authService';
import { useToast } from '@/components/ui/use-toast';

const AuthContext = createContext(undefined);

export const SupabaseAuthProvider = ({ children }) => {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [usuario, setUsuario] = useState(null); // Custom user profile from DB
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setUsuario(null);
    setSession(null);
    setLoading(false);
    // No need to call signOut here, as this is usually a reaction to an auth error
  }, []);

  // Handle initializing user data from session
  const initializeUser = useCallback(
    async (currentSession) => {
      try {
        setLoading(true);
        if (currentSession?.user) {
          setSession(currentSession);
          setUser(currentSession.user);
          const userProfile = await authService.getUserProfile(currentSession.user.id);
          if (userProfile) {
            setUsuario(userProfile);
          } else {
            // Profile doesn't exist, session might be stale or user deleted
            throw new Error('User profile not found.');
          }
        } else {
          clearSession();
        }
      } catch (error) {
        console.error('Error initializing user:', error);
        // This catch block handles errors like "Invalid Refresh Token"
        await authService.signOut().catch(console.error); // Attempt to sign out cleanly
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
      // Auth state change will trigger user initialization
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

  const temPermissao = useCallback(
    (modulo, acao) => {
      if (loading || !usuario) return false;

      if (usuario.email === 'admin@madalena.com') return true;

      const permissoes = usuario.permissoes;
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
    [usuario, loading]
  );

  const value = useMemo(
    () => ({
      user,
      session,
      usuario,
      loading,
      temPermissao,
      signIn,
      signOut,
    }),
    [user, session, usuario, loading, temPermissao, signIn, signOut]
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
