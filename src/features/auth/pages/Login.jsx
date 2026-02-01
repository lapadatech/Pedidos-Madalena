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

  const { storeSlug } = useParams();
  const [storeName, setStoreName] = useState(formatSlugToName(storeSlug || ''));
  const [loadingStore, setLoadingStore] = useState(false);
  const [storeSlugValido, setStoreSlugValido] = useState(true);
  const [storeErro, setStoreErro] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const baseTitle = useMemo(
    () => (storeSlug ? `Login ${storeSlug} - Gestor de Pedidos` : 'Login - Gestor de Pedidos'),
    [storeSlug]
  );

  useEffect(() => {
    const fetchStoreName = async () => {
      if (!storeSlug) return;
      try {
        setLoadingStore(true);
        setStoreSlugValido(true);
        setStoreErro('');
        const { data, error } = await supabase.rpc('get_store_by_slug', { p_slug: storeSlug });
        if (error) {
          console.error('Erro ao buscar loja:', error.message);
          setStoreName((prev) => prev || formatSlugToName(storeSlug));
          setStoreSlugValido(true);
          return;
        }
        const storeData = Array.isArray(data) ? data[0] : data;
        const lojaAtiva = storeData?.active !== false;
        if (storeData && lojaAtiva) {
          setStoreName(storeData.name || formatSlugToName(storeSlug));
          setStoreSlugValido(true);
          setStoreErro('');
          return;
        }
        setStoreSlugValido(false);
        setStoreErro('Não existe loja cadastrada com esse slug.');
      } finally {
        setLoadingStore(false);
      }
    };

    fetchStoreName();
  }, [storeSlug]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (storeSlug && !storeSlugValido) return;
    setCarregando(true);
    const { error } = await signIn(email, senha);

    if (!error) {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao sistema.',
        className: 'bg-white text-black font-bold',
      });
      if (storeSlug) {
        navigate(`/${storeSlug}/dashboard`);
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
            {!loadingStore && storeSlug && !storeSlugValido ? (
              <div className="text-center space-y-4">
                <img
                  src="https://horizons-cdn.hostinger.com/e36d36b8-0bd5-4763-9879-98322153d8ad/0e924da8366373d07b6cb40d5e5f3b9a.png"
                  alt="Madalena Brigadeiros"
                  className="h-16 mx-auto"
                />
                <p className="text-sm text-gray-600">{storeErro}</p>
              </div>
            ) : (
              <>
                <div className="text-center mb-8 flex flex-col items-center gap-2">
                  <img
                    src="https://horizons-cdn.hostinger.com/e36d36b8-0bd5-4763-9879-98322153d8ad/0e924da8366373d07b6cb40d5e5f3b9a.png"
                    alt="Madalena Brigadeiros"
                    className="h-16"
                  />
                  {storeSlug ? (
                    <p className="text-base font-semibold text-gray-600">
                      {loadingStore ? 'Carregando loja...' : storeName || formatSlugToName(storeSlug)}
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
              </>
            )}
          </div>
        </motion.div>
      </div>
    </>
  );
}
export default Login;
