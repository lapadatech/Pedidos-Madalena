import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import GestaoSidebar from '@/features/gestao/components/GestaoSidebar';
import GestaoHeader from '@/features/gestao/components/GestaoHeader';

function GestaoLayout() {
  const { loading } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <GestaoSidebar
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        loading={loading}
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        <GestaoHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default GestaoLayout;
