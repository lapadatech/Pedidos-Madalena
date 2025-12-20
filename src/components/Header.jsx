import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Key } from 'lucide-react';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import AlterarSenhaDialog from '@/components/AlterarSenhaDialog';

function Header() {
  const { usuario, signOut } = useAuth();
  const navigate = useNavigate();
  const [dialogSenhaAberto, setDialogSenhaAberto] = useState(false);
  
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const iniciais = usuario?.nome?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';

  return (
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestor de Pedidos</h1>
            <p className="text-sm text-gray-500"></p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">{usuario?.nome}</p>
              <p className="text-xs text-gray-500">{usuario?.perfil?.nome}</p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar>
                    <AvatarFallback className="bg-orange-500 text-white">
                      {iniciais}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setDialogSenhaAberto(true)}>
                  <Key className="mr-2 h-4 w-4" />
                  Trocar Senha
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <AlterarSenhaDialog open={dialogSenhaAberto} onOpenChange={setDialogSenhaAberto} />
    </>
  );
}

export default Header;