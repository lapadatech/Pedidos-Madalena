import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Clientes from '@/pages/Clientes';
import ClienteDetalhe from '@/pages/ClienteDetalhe';
import Produtos from '@/pages/Produtos';
import Pedidos from '@/pages/Pedidos';
import Configuracoes from '@/pages/Configuracoes';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Loader2 } from 'lucide-react';

function PrivateRoute({ children }) {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="clientes" element={<Clientes />} />
        <Route path="clientes/:id" element={<ClienteDetalhe />} />
        <Route path="produtos" element={<Produtos />} />
        <Route path="pedidos" element={<Pedidos />} />
        <Route path="configuracoes/*" element={<Configuracoes />} />
      </Route>
    </Routes>
  );
}

export default App;
