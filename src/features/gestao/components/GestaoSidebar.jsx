import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Users, ChevronLeft, ChevronRight, Loader2, Store, Shield } from 'lucide-react';
import { Button } from '@/shared/ui/button';

function GestaoSidebar({ collapsed, setCollapsed, loading }) {
  const menuItems = [
    { path: '/admin/lojas', icon: Store, label: 'Lojas' },
    { path: '/admin/usuarios', icon: Users, label: 'Usuarios' },
    { path: '/admin/perfis', icon: Shield, label: 'Perfis' },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? '5rem' : '16rem' }}
      className="bg-white border-r border-gray-200 flex flex-col transition-all duration-300"
    >
      <div className="p-4 flex items-center justify-center border-b border-gray-200 relative">
        {!collapsed && (
          <div className="flex flex-col items-center">
            <img
              src="https://horizons-cdn.hostinger.com/e36d36b8-0bd5-4763-9879-98322153d8ad/0e924da8366373d07b6cb40d5e5f3b9a.png"
              alt="Madalena Brigadeiros Logo"
              className="h-20"
            />
            <span className="font-semibold text-sm text-gray-600 mt-1">Gestao do Sistema</span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
          className={`absolute top-1/2 -translate-y-1/2 ${collapsed ? 'left-1/2 -translate-x-1/2' : 'right-2'}`}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-2 space-y-1 mt-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <Loader2 className="h-6 w-6 animate-spin mb-2" />
            {!collapsed && <span className="text-xs">Carregando menu...</span>}
          </div>
        ) : (
          menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group relative ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          ))
        )}
      </nav>
    </motion.aside>
  );
}

export default GestaoSidebar;
