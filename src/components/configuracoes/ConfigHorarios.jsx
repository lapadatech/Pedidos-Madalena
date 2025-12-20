import React from 'react';
import { useToast } from '@/components/ui/use-toast';

function ConfigHorarios() {
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: '🚧 Funcionalidade em desenvolvimento',
      description: 'A gestão de horários estará disponível em breve!',
      className: 'bg-white text-black font-bold',
    });
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="font-semibold mb-4">Horários de Funcionamento</h3>
      <p className="text-gray-500">Em desenvolvimento...</p>
    </div>
  );
}

export default ConfigHorarios;
