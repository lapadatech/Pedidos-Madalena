import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Tag, Plus, Tags } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';

function Configuracoes() {
  const { temPermissao } = useAuth();

  const menuItems = [
    { path: 'categorias', icon: Tag, label: 'Categorias' },
    { path: 'complementos', icon: Plus, label: 'Complementos' },
    { path: 'tags', icon: Tags, label: 'Tags' },
  ];

  if (!temPermissao('settings', 'read')) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Configurações - Gestor de Pedidos</title>
        <meta name="description" content="Configurações do sistema" />
      </Helmet>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Configurações</h2>
          <p className="text-gray-500 mt-1"></p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-4">
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="lg:col-span-3">
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}

export default Configuracoes;
