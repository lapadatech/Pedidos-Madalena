import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Home, Loader2, Package } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { obterCliente, listarEnderecos } from '@/features/clientes/services/clientesApi';
import { listarPedidos } from '@/features/pedidos/services/pedidosApi';
import PedidoDetalheDialog from '@/features/pedidos/components/PedidoDetalheDialog';
import TagChip from '@/shared/components/tags/TagChip';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { useToast } from '@/shared/ui/use-toast';

const maskCelular = (value) => {
  if (!value) return '';
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
  value = value.replace(/(\d)(\d{4})$/, '$1-$2');
  return value;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const normalizeStatus = (status) =>
  (status || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

function ClienteDetalhe() {
  const { id } = useParams();
  const [cliente, setCliente] = useState(null);
  const [enderecos, setEnderecos] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState(null);
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
        setPedidos(pedidosData.data || []);
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
        <p>Cliente nao encontrado.</p>
        <Button asChild variant="link" className="text-orange-500">
          <Link to="/clientes">Voltar para a lista</Link>
        </Button>
      </div>
    );
  }

  const totalPedidos = pedidos.reduce((sum, pedido) => sum + (pedido.total || 0), 0);
  const ticketMedio = pedidos.length > 0 ? totalPedidos / pedidos.length : 0;

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
            <Home className="text-orange-500" /> Enderecos
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
            <p className="text-sm text-gray-500">Nenhum endereco cadastrado.</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-lg shadow space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Package className="text-orange-500" /> Historico de Pedidos
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Quantidade de pedidos</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">{pedidos.length}</p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Valor total</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(totalPedidos)}
              </p>
            </div>
            <div className="rounded-lg border bg-white p-4">
              <p className="text-sm text-gray-500">Ticket medio</p>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {formatCurrency(ticketMedio)}
              </p>
            </div>
          </div>
          {pedidos.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      N do Pedido
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
                      Pagamento
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Entrega
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Tags
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
                    <tr
                      key={pedido.id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setPedidoSelecionadoId(pedido.id)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{pedido.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(pedido.data_entrega)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Badge
                          className={
                            normalizeStatus(pedido.status_pagamento) === 'nao pago'
                              ? 'bg-[#FF5558] text-[#000000]'
                              : 'bg-[#56FF65] text-[#000000]'
                          }
                        >
                          {pedido.status_pagamento || '-'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Badge
                          className={
                            normalizeStatus(pedido.status_entrega) === 'nao entregue'
                              ? 'bg-[#FF5558] text-[#000000]'
                              : 'bg-[#56FF65] text-[#000000]'
                          }
                        >
                          {pedido.status_entrega || '-'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap gap-1">
                          {pedido.tags && pedido.tags.length > 0 ? (
                            pedido.tags.map((tag) => (
                              <TagChip
                                key={tag.id}
                                nome={tag.nome}
                                cor={tag.cor}
                                className="text-xs"
                              />
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatCurrency(pedido.total)}
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
      <PedidoDetalheDialog
        pedidoId={pedidoSelecionadoId}
        open={!!pedidoSelecionadoId}
        onOpenChange={(open) => {
          if (!open) setPedidoSelecionadoId(null);
        }}
      />
    </>
  );
}

export default ClienteDetalhe;
