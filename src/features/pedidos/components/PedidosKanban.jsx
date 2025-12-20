import React from 'react';
import { Badge } from '@/shared/ui/badge';
import { Loader2 } from 'lucide-react';
import TagChip from '@/shared/components/tags/TagChip';

const SkeletonCard = () => (
  <div
    className="rounded-lg animate-pulse p-4 space-y-3 border"
    style={{
      backgroundColor: '#E5E7EB',
      borderColor: '#D1D5DB',
    }}
  >
    <div style={{ height: '20px', width: '75%', background: '#D1D5DB', borderRadius: '4px' }}></div>
    <div style={{ height: '12px', width: '25%', background: '#D1D5DB', borderRadius: '4px' }}></div>

    <div className="pt-2 space-y-2">
      <div
        style={{ height: '16px', width: '50%', background: '#D1D5DB', borderRadius: '4px' }}
      ></div>
      <div
        style={{ height: '16px', width: '33%', background: '#D1D5DB', borderRadius: '4px' }}
      ></div>
      <div
        style={{ height: '20px', width: '25%', background: '#9CA3AF', borderRadius: '4px' }}
      ></div>
    </div>

    <div className="flex gap-2 pt-2">
      <div
        style={{ height: '20px', width: '64px', background: '#D1D5DB', borderRadius: '999px' }}
      ></div>
    </div>
  </div>
);

const getStatusPagamentoVariant = (status) => {
  return status === 'Não Pago' ? 'bg-[#FF5558] text-[#000000]' : 'bg-[#56FF65] text-[#000000]';
};

const getStatusEntregaVariant = (status) => {
  return status === 'Não Entregue' ? 'bg-[#FF5558] text-[#000000]' : 'bg-[#56FF65] text-[#000000]';
};

const formatDate = (dateString) => {
  if (!dateString) return 'Sem data';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

const formatTime = (timeString) => (timeString ? timeString.slice(0, 5) : '');

const formatCurrency = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);

const capitalizeFirstLetter = (string) =>
  string ? string.charAt(0).toUpperCase() + string.slice(1) : '';

const PedidoCard = ({ pedido, onAbrirDetalhe }) => {
  const isEntrega = pedido.tipo_entrega === 'entrega';

  const cardBackground = isEntrega ? '#FF9921' : '#E0E0E0';
  const textColor = isEntrega ? '#000000' : '#000000';
  const idText = isEntrega ? '#000000' : '#000000';
  const infoText = isEntrega ? '#000000' : '#000000';
  const totalColor = isEntrega ? '#000000' : '#000000';

  return (
    <div
      className="rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      style={{ border: '2px solid #000000' }}
      onClick={() => onAbrirDetalhe(pedido.id)}
    >
      {pedido.status_pagamento === 'Não Pago' && (
        <div
          style={{
            backgroundColor: '#FDE2E2',
            color: '#991B1B',
            textAlign: 'center',
            padding: '4px 0',
            fontWeight: 'bold',
            fontSize: '14px',
          }}
        >
          NÃO PAGO
        </div>
      )}

      <div className="p-4 space-y-1" style={{ backgroundColor: cardBackground, color: textColor }}>
        <h4 className="font-bold text-base truncate">{pedido.cliente_nome}</h4>

        <p className="text-xs font-bold" style={{ color: idText }}>
          Pedido #{pedido.id}
        </p>

        <div className="pt-2 space-y-1 text-sm font-bold">
          <p style={{ color: infoText }}>
            {formatDate(pedido.data_entrega)}
            {pedido.hora_entrega ? ` às ${formatTime(pedido.hora_entrega)}` : ''}
          </p>

          <p style={{ color: infoText }}>{capitalizeFirstLetter(pedido.tipo_entrega)}</p>

          <p className="text-base" style={{ color: totalColor }}>
            {formatCurrency(pedido.total)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 pt-2 text-xs font-bold">
          {pedido.status_pagamento !== 'Não Pago' && (
            <Badge className={getStatusPagamentoVariant(pedido.status_pagamento)}>
              {pedido.status_pagamento}
            </Badge>
          )}

          <Badge className={getStatusEntregaVariant(pedido.status_entrega)}>
            {pedido.status_entrega}
          </Badge>
        </div>

        {pedido.tags && pedido.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {pedido.tags.map((tag) => (
              <TagChip key={tag.id} nome={tag.nome} cor={tag.cor} className="text-xs" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const KanbanColumn = ({ title, pedidos, onAbrirDetalhe, loading, customBgColor }) => (
  <div
    className="rounded-lg p-2 flex-shrink-0 w-[270px]"
    style={{
      backgroundColor: customBgColor || '#F1F5F9B3',
    }}
  >
    <h3 className="font-semibold mb-4 px-1" style={{ color: '#374151' }}>
      {title} ({loading ? '...' : pedidos.length})
    </h3>

    <div className="space-y-3 h-[calc(100vh-18rem)] overflow-y-auto pr-1">
      {loading ? (
        <>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </>
      ) : pedidos.length > 0 ? (
        pedidos.map((pedido) => (
          <PedidoCard key={pedido.id} pedido={pedido} onAbrirDetalhe={onAbrirDetalhe} />
        ))
      ) : (
        <div className="text-center text-sm" style={{ color: '#6B7280' }}>
          Nenhum pedido aqui.
        </div>
      )}
    </div>
  </div>
);

function PedidosKanban({ pedidos, onAbrirDetalhe, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#EA580C' }} />
        <p className="ml-4" style={{ color: '#4B5563' }}>
          Carregando pedidos...
        </p>
      </div>
    );
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const hojeStr = hoje.toISOString().split('T')[0];

  const amanha = new Date(hoje);
  amanha.setDate(hoje.getDate() + 1);
  const amanhaStr = amanha.toISOString().split('T')[0];

  const seteDiasDepois = new Date(hoje);
  seteDiasDepois.setDate(hoje.getDate() + 7);

  const sortPedidos = (lista) =>
    lista.sort((a, b) => (a.hora_entrega || '23:59').localeCompare(b.hora_entrega || '23:59'));

  const pedidosNaoEntregues = pedidos.filter((p) => p.status_entrega !== 'Entregue');

  const pedidosEntreguesNaoPagos = pedidos.filter(
    (p) => p.status_entrega === 'Entregue' && p.status_pagamento === 'Não Pago'
  );

  const colunas = {
    hoje: sortPedidos(pedidosNaoEntregues.filter((p) => p.data_entrega === hojeStr)),
    amanha: sortPedidos(pedidosNaoEntregues.filter((p) => p.data_entrega === amanhaStr)),
    proximos7dias: sortPedidos(
      pedidosNaoEntregues.filter((p) => {
        if (!p.data_entrega || p.data_entrega === hojeStr || p.data_entrega === amanhaStr)
          return false;
        const dataPedido = new Date(p.data_entrega + 'T00:00:00');
        return dataPedido > amanha && dataPedido <= seteDiasDepois;
      })
    ),
    pedidosAtrasados: sortPedidos(
      pedidosNaoEntregues.filter((p) => {
        const dataPedido = p.data_entrega ? new Date(p.data_entrega + 'T00:00:00') : null;
        return (dataPedido && dataPedido < hoje) || !p.data_entrega;
      })
    ),
    pedidosNaoPagos: sortPedidos(pedidosEntreguesNaoPagos),
  };

  return (
    <div className="flex gap-2 overflow-x-auto pb-4">
      <KanbanColumn
        title="Hoje"
        pedidos={colunas.hoje}
        onAbrirDetalhe={onAbrirDetalhe}
        loading={loading}
      />
      <KanbanColumn
        title="Amanhã"
        pedidos={colunas.amanha}
        onAbrirDetalhe={onAbrirDetalhe}
        loading={loading}
      />
      <KanbanColumn
        title="Próximos 7 dias"
        pedidos={colunas.proximos7dias}
        onAbrirDetalhe={onAbrirDetalhe}
        loading={loading}
      />
      <KanbanColumn
        title="Pedidos Atrasados"
        pedidos={colunas.pedidosAtrasados}
        onAbrirDetalhe={onAbrirDetalhe}
        loading={loading}
        customBgColor="#FFFEB4"
      />
      <KanbanColumn
        title="Pedidos Não Pagos"
        pedidos={colunas.pedidosNaoPagos}
        onAbrirDetalhe={onAbrirDetalhe}
        loading={loading}
        customBgColor="#EB9090"
      />
    </div>
  );
}

export default PedidosKanban;
