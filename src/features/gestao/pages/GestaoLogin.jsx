import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { useToast } from '@/shared/ui/use-toast';

function GestaoLogin() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { signIn, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (isAdmin) {
      const destino = location.state?.from?.pathname || '/admin/lojas';
      navigate(destino, { replace: true });
    }
  }, [isAdmin, location.state, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await signIn(email, senha);

    if (!error) {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo a gestao do sistema.',
        className: 'bg-white text-black font-bold',
      });
      navigate('/admin/lojas');
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
        <title>Login Admin - Gestor de Pedidos</title>
        <meta name="description" content="Acesso do admin da plataforma" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-orange-100 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-orange-600 mb-2">Gestao do Sistema</h1>
              <p className="text-gray-600">Madalena Brigadeiros</p>
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
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default GestaoLogin;
