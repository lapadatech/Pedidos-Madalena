import { supabase } from '@/lib/customSupabaseClient';

export const authService = {
  /**
   * Get the current session from Supabase.
   * This method might try to refresh the token, which can lead to "Invalid Refresh Token" errors.
   */
  async getSession() {
    return supabase.auth.getSession();
  },

  /**
   * Get the current user details from the auth session.
   */
  async getUser() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    return data.user;
  },

  /**
   * Fetch user profile and permissions from the database.
   * It joins 'usuarios' with 'perfis' to get permissions.
   */
  async getUserProfile(userId) {
    if (!userId) return null;
    try {
      // First, get the user from the auth schema to ensure we have the email
      const {
        data: { user: authUser },
        error: authUserError,
      } = await supabase.auth.getUser();
      if (authUserError || !authUser) {
        console.error('Error fetching auth user:', authUserError);
        return null;
      }

      // Then, get the profile from the public schema
      const { data, error } = await supabase
        .from('usuarios')
        .select(
          `
          id,
          nome,
          perfis (
            id,
            nome,
            permissoes
          )
        `
        )
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile from public.usuarios:', error.message);
        // This can happen if the user exists in auth.users but not in public.usuarios.
        // We should treat this as a failed login.
        return null;
      }

      return {
        id: data.id,
        nome: data.nome,
        email: authUser.email, // Use the email from the auth user
        perfil: data.perfis,
        permissoes: data.perfis?.permissoes || {},
      };
    } catch (err) {
      console.error('Unexpected error in getUserProfile:', err);
      return null;
    }
  },

  /**
   * Sign in with email and password.
   */
  async signIn(email, password) {
    return await supabase.auth.signInWithPassword({
      email,
      password,
    });
  },

  /**
   * Sign out the current user.
   * This invalidates the session and refresh token.
   */
  async signOut() {
    return await supabase.auth.signOut();
  },

  /**
   * Subscribe to auth state changes (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.).
   */
  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
