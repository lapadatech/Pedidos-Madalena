import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/ui/use-toast';
import { supabase } from '@/shared/lib/customSupabaseClient';

function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const formatSlugToName = (value) =>
    (value || '')
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');

  const [storeName, setStoreName] = useState(formatSlugToName(useParams().slug || ''));
  const [loadingStore, setLoadingStore] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { slug } = useParams();

  const baseTitle = useMemo(
    () => (slug ? `Login ${slug} - Gestor de Pedidos` : 'Login - Gestor de Pedidos'),
    [slug]
  );

  useEffect(() => {
    const fetchStoreName = async () => {
      if (!slug) return;
      try {
        setLoadingStore(true);
        const { data, error } = await supabase
          .from('stores')
          .select('name')
          .eq('slug', slug)
          .limit(1)
          .maybeSingle();
        if (error) {
          console.error('Erro ao buscar loja:', error.message);
          setStoreName((prev) => prev || formatSlugToName(slug));
          return;
        }
        if (data?.name) {
          setStoreName(data.name);
        } else {
          setStoreName(formatSlugToName(slug));
        }
      } finally {
        setLoadingStore(false);
      }
    };

    fetchStoreName();
  }, [slug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await signIn(email, senha);

    if (!error) {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao sistema.',
        className: 'bg-white text-black font-bold',
      });
      if (slug) {
        navigate(`/${slug}/dashboard`);
      } else {
        navigate('/lojas');
      }
    } else {
      toast({
        title: 'Erro ao fazer login',
        description: error.message || 'Email ou senha incorretos.',
        variant: 'destructive',
        className: 'bg-white text-black font-bold',
      });
    }
    setCarregando(false);
  };

  return (
    <>
      <Helmet>
        <title>{baseTitle}</title>
        <meta name="description" content="Faça login no sistema de gestão de pedidos" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8 flex flex-col items-center gap-2">
              <img
                src="https://horizons-cdn.hostinger.com/e36d36b8-0bd5-4763-9879-98322153d8ad/0e924da8366373d07b6cb40d5e5f3b9a.png"
                alt="Madalena Brigadeiros"
                className="h-16"
              />
              {slug ? (
                <p className="text-base font-semibold text-gray-600">
                  {loadingStore ? 'Carregando loja...' : storeName || formatSlugToName(slug)}
                </p>
              ) : (
                <p className="text-base font-semibold text-gray-600">Painel Administrativo</p>
              )}
            </div>

            {carregando ? (
              <div className="space-y-6 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-16 bg-gray-200 rounded"></div>
                  <div className="h-10 w-full bg-gray-200 rounded"></div>
                </div>
                <div className="h-10 w-full bg-gray-200 rounded"></div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="********"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="senha">Senha</Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="********"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600">
                  Entrar
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              <p />
              <p />
              <p />
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
export default Login;
