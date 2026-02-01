import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import TagChip from '@/shared/components/tags/TagChip';

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

const formatTime = (timeString) => {
  if (!timeString) return '-';
  return timeString.slice(0, 5);
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const getStatusGeralVariant = (isConcluido) => {
  return isConcluido ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800';
};

const getStatusPagamentoVariant = (status) => {
  return status === 'Não Pago' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800';
};

const getStatusEntregaVariant = (status) => {
  return status === 'Entregue' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800';
};

const SkeletonRow = () => (
  <TableRow>
    <TableCell>
      <div className="h-6 w-20 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-16 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-40 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-24 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-16 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-20 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-5 w-24 rounded bg-gray-200 animate-pulse ml-auto"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 w-20 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 w-24 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
    <TableCell>
      <div className="h-6 w-32 rounded bg-gray-200 animate-pulse"></div>
    </TableCell>
  </TableRow>
);

function PedidosTabela({ pedidos, onAbrirDetalhe, loading }) {
  return (
    <div className="bg-white rounded-lg -mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Status</TableHead>
            <TableHead>Pedido</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Hora</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Pagamento</TableHead>
            <TableHead>Entrega</TableHead>
            <TableHead>Tags</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            Array.from({ length: 10 }).map((_, index) => <SkeletonRow key={index} />)
          ) : pedidos.length > 0 ? (
            pedidos.map((pedido) => {
              const isConcluido =
                pedido.status_entrega === 'Entregue' && pedido.status_pagamento === 'Pago';
              return (
                <TableRow
                  key={pedido.id}
                  onClick={() => onAbrirDetalhe(pedido.id)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <TableCell>
                    <Badge className={getStatusGeralVariant(isConcluido)}>
                      {isConcluido ? 'Concluído' : 'Aberto'}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">#{pedido.order_number ?? pedido.id}</TableCell>
                  <TableCell>{pedido.cliente_nome}</TableCell>
                  <TableCell>{formatDate(pedido.data_entrega)}</TableCell>
                  <TableCell>{formatTime(pedido.hora_entrega)}</TableCell>
                  <TableCell>{pedido.tipo_entrega}</TableCell>
                  <TableCell className="text-right">{formatCurrency(pedido.total)}</TableCell>
                  <TableCell>
                    <Badge className={getStatusPagamentoVariant(pedido.status_pagamento)}>
                      {pedido.status_pagamento}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusEntregaVariant(pedido.status_entrega)}>
                      {pedido.status_entrega}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {pedido.tags && pedido.tags.length > 0 ? (
                        pedido.tags.map((tag) => (
                          <TagChip key={tag.id} nome={tag.nome} cor={tag.cor} className="text-xs" />
                        ))
                      ) : (
                        <span className="text-xs text-gray-400">-</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="h-24 text-center">
                Nenhum pedido encontrado.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

export default PedidosTabela;
