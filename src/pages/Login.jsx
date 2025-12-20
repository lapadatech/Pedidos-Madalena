import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/SupabaseAuthContext'; // Corrigido para SupabaseAuthContext
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [carregando, setCarregando] = useState(false);
  const { signIn } = useAuth(); // Usando signIn do SupabaseAuthContext
  const navigate = useNavigate();
  const { toast } = useToast();
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    const { error } = await signIn(email, senha); // Usando signIn do Supabase

    if (!error) {
      toast({
        title: 'Login realizado com sucesso!',
        description: 'Bem-vindo ao sistema.',
        className: 'bg-white text-black font-bold',
      });
      navigate('/dashboard');
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
        <title>Login - Gestor de Pedidos</title>
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
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-orange-600 mb-2">Madalena Brigadeiros</h1>
              <p className="text-gray-600">Sistema de Gestão de Pedidos</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
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
                  placeholder="••••••••"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-orange-500 hover:bg-orange-600"
                disabled={carregando}
              >
                {carregando ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              <p></p>
              <p></p>
              <p></p>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
export default Login;
