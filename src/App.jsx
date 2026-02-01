import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import Login from '@/features/auth/pages/Login';
import Dashboard from '@/features/dashboard/pages/Dashboard';
import Clientes from '@/features/clientes/pages/Clientes';
import ClienteDetalhe from '@/features/clientes/pages/ClienteDetalhe';
import Produtos from '@/features/produtos/pages/Produtos';
import Pedidos from '@/features/pedidos/pages/Pedidos';
import Configuracoes from '@/features/configuracoes/pages/Configuracoes';
import ConfigCategorias from '@/features/configuracoes/components/ConfigCategorias';
import ConfigComplementos from '@/features/configuracoes/components/ConfigComplementos';
import ConfigTags from '@/features/configuracoes/components/ConfigTags';
import GestaoLayout from '@/features/gestao/pages/GestaoLayout';
import GestaoLogin from '@/features/gestao/pages/GestaoLogin';
import GestaoLojas from '@/features/gestao/pages/GestaoLojas';
import GestaoUsuarios from '@/features/gestao/pages/GestaoUsuarios';
import GestaoPerfis from '@/features/gestao/pages/GestaoPerfis';
import SelecionarLoja from '@/features/lojas/pages/SelecionarLoja';
import Layout from '@/shared/components/Layout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

const LoadingScreen = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-100">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      <p className="text-gray-600">Carregando...</p>
    </div>
  </div>
);

const getPrimeiraRotaPermitida = (storeSlug, temPermissao) => {
  if (!storeSlug) return '/lojas';

  const rotas = [
    { modulo: 'dashboard', path: `/${storeSlug}/dashboard` },
    { modulo: 'orders', path: `/${storeSlug}/pedidos` },
    { modulo: 'customers', path: `/${storeSlug}/clientes` },
    { modulo: 'products', path: `/${storeSlug}/produtos` },
  ];

  const rotaPermitida = rotas.find((rota) => temPermissao(rota.modulo, 'read'));
  return rotaPermitida ? rotaPermitida.path : `/${storeSlug}/login`;
};

function AdminGuard({ children }) {
  const { session, loading, isAdmin, signOut } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (!isAdmin) {
    signOut();
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}

function StoreGuard({ children }) {
  const { loading, session, selecionarLojaPorSlug, lojaAtual, isAdmin, signOut } = useAuth();
  const { storeSlug } = useParams();
  const navigate = useNavigate();
  const [validando, setValidando] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (isAdmin) {
      signOut();
      navigate('/admin/login', { replace: true });
      return;
    }
    if (!session) {
      if (storeSlug) {
        navigate(`/${storeSlug}/login`, { replace: true });
      } else {
        navigate('/admin/login', { replace: true });
      }
      return;
    }

    if (storeSlug) {
      const ok = selecionarLojaPorSlug(storeSlug);
      if (!ok) {
        navigate('/lojas', { replace: true });
        return;
      }
    }
    setValidando(false);
  }, [loading, session, selecionarLojaPorSlug, storeSlug, navigate, isAdmin, signOut]);

  if (loading || validando) {
    return <LoadingScreen />;
  }

  if (storeSlug && !lojaAtual) {
    return null;
  }

  return children;
}

function ProtectedRoute({ modulo, acao = 'read', children }) {
  const { loading, temPermissao } = useAuth();
  const { storeSlug } = useParams();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!temPermissao(modulo, acao)) {
    const fallback = getPrimeiraRotaPermitida(storeSlug, temPermissao);
    return <Navigate to={fallback} state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/admin/login" replace />} />
      <Route path="/admin/login" element={<GestaoLogin />} />
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <GestaoLayout />
          </AdminGuard>
        }
      >
        <Route index element={<Navigate to="lojas" replace />} />
        <Route path="lojas" element={<GestaoLojas />} />
        <Route path="usuarios" element={<GestaoUsuarios />} />
        <Route path="perfis" element={<GestaoPerfis />} />
      </Route>

      <Route path="/:storeSlug/login" element={<Login />} />
      <Route
        path="/lojas"
        element={
          <StoreGuard>
            <SelecionarLoja />
          </StoreGuard>
        }
      />
      <Route
        path="/:storeSlug"
        element={
          <StoreGuard>
            <Layout />
          </StoreGuard>
        }
      >
        <Route index element={<Navigate to="login" replace />} />
        <Route
          path="dashboard"
          element={
            <ProtectedRoute modulo="dashboard">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="clientes"
          element={
            <ProtectedRoute modulo="customers">
              <Clientes />
            </ProtectedRoute>
          }
        />
        <Route
          path="clientes/:id"
          element={
            <ProtectedRoute modulo="customers">
              <ClienteDetalhe />
            </ProtectedRoute>
          }
        />
        <Route
          path="produtos"
          element={
            <ProtectedRoute modulo="products">
              <Produtos />
            </ProtectedRoute>
          }
        />
        <Route
          path="pedidos"
          element={
            <ProtectedRoute modulo="orders">
              <Pedidos />
            </ProtectedRoute>
          }
        />
        <Route
          path="configuracoes"
          element={
            <ProtectedRoute modulo="settings">
              <Configuracoes />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="categorias" replace />} />
          <Route path="categorias" element={<ConfigCategorias />} />
          <Route path="complementos" element={<ConfigComplementos />} />
          <Route path="tags" element={<ConfigTags />} />
        </Route>
      </Route>
    </Routes>
  );
}

export default App;
