import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Home, Package, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { obterCliente, listarEnderecos, listarPedidos } from '@/lib/api';
import { Button } from '@/components/ui/button';

const maskCelular = (value) => {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
  value = value.replace(/(\d)(\d{4})$/, '$1-$2');
  return value;
};

function ClienteDetalhe() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [enderecos, setEnderecos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [clienteData, enderecosData, pedidosData] = await Promise.all([
          obterCliente(id),
          listarEnderecos(id),
          listarPedidos({ cliente_id: id }),
        ]);
        setCliente(clienteData);
        setEnderecos(enderecosData);
        setPedidos(pedidosData.data);
      } catch (error) {
        toast({
          title: 'Erro ao carregar dados do cliente',
          description: error.message,
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="text-center">
        <p>Cliente não encontrado.</p>
        <Button asChild variant="link" className="text-orange-500">
          <Link to="/clientes">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{`Detalhes de ${cliente.nome} - Gestor de Pedidos`}</title>
      </Helmet>
      <div className="space-y-6">
        <div>
          <Button asChild variant="ghost" className="mb-4">
            <Link to="/clientes">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar para Clientes
            </Link>
          </Button>
          <h1 className="text-3xl font-bold">{cliente.nome}</h1>
          <p className="text-lg text-gray-500">{maskCelular(cliente.celular)}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Home className="text-orange-500" /> Endereços
          </h2>
          {enderecos.length > 0 ? (
            <ul className="space-y-4">
              {enderecos.map((end) => (
                <li key={end.id} className="p-4 border rounded-md">
                  {end.principal && (
                    <span className="text-xs font-bold text-orange-500 uppercase">Principal</span>
                  )}
                  <p className="font-medium">
                    {end.rua}, {end.numero} {end.complemento && `- ${end.complemento}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {end.bairro} - {end.cidade}, {end.estado}
                  </p>
                  <p className="text-sm text-gray-500">CEP: {end.cep}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">Nenhum endereço cadastrado.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="text-orange-500" /> Histórico de Pedidos
          </h2>
          {pedidos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Nº do Pedido
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Data
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Valor Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pedidos.map((pedido) => (
                    <tr key={pedido.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{pedido.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(pedido.data_entrega).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        R$ {pedido.total.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum pedido encontrado para este cliente.</p>
          )}
        </div>
      </div>
    </>
  );
}

export default ClienteDetalhe;
