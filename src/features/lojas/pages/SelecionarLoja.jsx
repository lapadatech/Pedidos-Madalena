import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Loader2, Store } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/shared/ui/button';

function SelecionarLoja() {
  const { lojas, loading } = useAuth();
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Selecionar Loja - Gestor de Pedidos</title>
        <meta name="description" content="Selecione a loja para acessar o sistema" />
      </Helmet>
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
        <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold text-gray-900">Selecionar Loja</h1>
          <p className="text-sm text-gray-500 mt-1">Escolha uma loja para entrar.</p>

          {loading ? (
            <div className="flex justify-center items-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : Array.isArray(lojas) && lojas.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {lojas.map((loja) => (
                <button
                  key={loja.id}
                  type="button"
                  onClick={() => navigate(`/${loja.slug}/dashboard`)}
                  className="border rounded-lg p-4 text-left hover:shadow-md transition-shadow bg-white"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                      <Store className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{loja.nome}</p>
                      <p className="text-xs text-gray-500">{loja.slug}</p>
                    </div>
                  </div>
                  {!loja.ativo && <p className="text-xs text-red-500 mt-3">Loja inativa</p>}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              <p>Nao ha lojas vinculadas a este usuario.</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/admin/login')}>
                Voltar ao login
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default SelecionarLoja;
