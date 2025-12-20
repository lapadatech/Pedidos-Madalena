import React, { useEffect, useState, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Package,
  DollarSign,
  AlertCircle,
  Truck,
  AlertTriangle,
  PackageCheck,
  ListOrdered,
  Coins as HandCoins,
  CalendarDays,
  Calendar as CalendarIcon,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { listarPedidos, contarRegistros, obterTotalPedidosGeral } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
};

const getDateRange = (rangeType, customStart, customEnd) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  switch (rangeType) {
    case 'sempre':
      return { start: null, end: null };
    case 'hoje':
      return { start: todayStr, end: todayStr };
    case 'ontem':
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      return { start: yesterdayStr, end: yesterdayStr };
    case '7dias':
      const sevenDaysAgo = new Date(today);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
      return { start: sevenDaysAgoStr, end: todayStr };
    case 'mes':
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      return {
        start: firstDayOfMonth.toISOString().split('T')[0],
        end: lastDayOfMonth.toISOString().split('T')[0],
      };
    case 'personalizado':
      return { start: customStart, end: customEnd };
    default:
      return { start: null, end: null }; // No filter
  }
};

function Dashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();

  // Filtro de data
  const [dateFilter, setDateFilter] = useState('sempre'); // Padrão alterado para "Sempre"
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Initial stats state
  const [stats, setStats] = useState([
    {
      id: 'totalPedidos',
      title: 'Total de\nPedidos',
      value: '0',
      subtitle: 'R$ 0,00 total',
      icon: ListOrdered,
      color: 'bg-green-500',
      loading: true,
      bgColor: 'bg-green-50',
    },
    {
      id: 'naoPagos',
      title: 'Pedidos a\nReceber',
      value: '0',
      subtitle: 'R$ 0,00 pendentes',
      icon: DollarSign,
      color: 'bg-red-500',
      loading: true,
      bgColor: 'bg-red-50',
    },
    {
      id: 'naoEntregues',
      title: 'Pedidos Não\nEntregues',
      value: '0',
      subtitle: 'R$ 0,00 pendentes',
      icon: Truck,
      color: 'bg-yellow-500',
      loading: true,
      bgColor: 'bg-yellow-50',
    },
    {
      id: 'entreguesNaoPagos',
      title: 'Pedidos Entregues\ne Não Pagos',
      value: '0',
      subtitle: 'R$ 0,00 pendentes',
      icon: HandCoins,
      color: 'bg-purple-500',
      loading: true,
      bgColor: 'bg-purple-50',
    },
    {
      id: 'pagosNaoEntregues',
      title: 'Pedidos Pagos e\nNão Entregues',
      value: '0',
      subtitle: 'R$ 0,00 pendentes',
      icon: PackageCheck,
      color: 'bg-blue-600',
      loading: true,
      bgColor: 'bg-blue-50',
    },
    {
      id: 'atrasados',
      title: 'Pedidos\nAtrasados',
      value: '0',
      subtitle: 'R$ 0,00 atrasados',
      icon: AlertTriangle,
      color: 'bg-orange-600',
      loading: true,
      bgColor: 'bg-orange-50',
    },
    {
      id: 'clientes',
      title: 'Clientes\nCadastrados',
      value: '0',
      icon: Users,
      color: 'bg-blue-500',
      loading: true,
      bgColor: 'bg-white',
    },
    {
      id: 'produtos',
      title: 'Produtos\nAtivos',
      value: '0',
      icon: Package,
      color: 'bg-green-500',
      loading: true,
      bgColor: 'bg-white',
    },
  ]);

  const [clientesPendentes, setClientesPendentes] = useState([]);
  const [loadingClientes, setLoadingClientes] = useState(true);

  const carregarDados = useCallback(async () => {
    try {
      setStats((prev) => prev.map((s) => ({ ...s, loading: true })));
      setLoadingClientes(true);

      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { start, end } = getDateRange(dateFilter, customStartDate, customEndDate);

      const filtrosData = {};
      if (start) filtrosData.data_entrega_gte = start;
      if (end) filtrosData.data_entrega_lte = end;

      const [
        totalPedidosGeral,
        pedidosAbertosResult,
        totalClientes,
        totalProdutosAtivos,
        pedidosGeraisResult,
      ] = await Promise.all([
        obterTotalPedidosGeral(filtrosData),
        listarPedidos({ status_geral: 'abertos', ...filtrosData }),
        contarRegistros('clientes'), // Clientes sempre total geral
        contarRegistros('produtos', [{ column: 'ativo', operator: 'eq', value: true }]), // Produtos sempre total geral
        listarPedidos(filtrosData), // Fetch all orders in range to filter locally for correctness
      ]);

      const todosPedidosNoPeriodo = pedidosGeraisResult?.data || [];
      const todosPedidosAbertosNoPeriodo = pedidosAbertosResult?.data || [];

      // 1. Total de Pedidos (Global no período)
      const totalPedidosCount = totalPedidosGeral.count;
      const totalPedidosValue = totalPedidosGeral.totalValue;

      // 2. Pedidos a Receber (Status Pagamento != Pago)
      const pedidosNaoPagos = todosPedidosNoPeriodo.filter(
        (p) => p.status_pagamento === 'Não Pago'
      );
      const totalNaoPago = pedidosNaoPagos.reduce((acc, p) => acc + (p.total || 0), 0);

      // 3. Pedidos Não Entregues (Status Entrega != Entregue)
      const pedidosNaoEntregues = todosPedidosNoPeriodo.filter(
        (p) => p.status_entrega === 'Não Entregue'
      );
      const totalNaoEntregue = pedidosNaoEntregues.reduce((acc, p) => acc + (p.total || 0), 0);

      // 4. Pedidos Pagos E Não Entregues
      const pedidosPagosNaoEntregues = todosPedidosNoPeriodo.filter(
        (p) => p.status_pagamento === 'Pago' && p.status_entrega !== 'Entregue'
      );
      const totalPagosNaoEntregues = pedidosPagosNaoEntregues.reduce(
        (acc, p) => acc + (p.total || 0),
        0
      );

      // 5. Pedidos Entregues E Não Pagos
      const pedidosEntreguesNaoPagos = todosPedidosNoPeriodo.filter(
        (p) => p.status_pagamento !== 'Pago' && p.status_entrega === 'Entregue'
      );
      const totalEntreguesNaoPagos = pedidosEntreguesNaoPagos.reduce(
        (acc, p) => acc + (p.total || 0),
        0
      );

      // 6. Pedidos Atrasados (Data de entrega menor que hoje e não entregue)
      // Atrasados são sempre relativos a hoje, mas filtramos dentro do range selecionado para consistência visual
      const pedidosAtrasados = todosPedidosNoPeriodo.filter((p) => {
        const dataPedido = p.data_entrega ? new Date(p.data_entrega + 'T00:00:00') : null;
        return dataPedido && dataPedido < hoje && p.status_entrega !== 'Entregue';
      });
      const totalAtrasado = pedidosAtrasados.reduce((acc, p) => acc + (p.total || 0), 0);

      // 7. Clientes com pendências (Para a tabela - Baseado nos entregues e não pagos)
      const pendencias = pedidosEntreguesNaoPagos;

      const clientesMap = pendencias.reduce((acc, pedido) => {
        if (!pedido.cliente_id) return acc;

        if (!acc[pedido.cliente_id]) {
          acc[pedido.cliente_id] = {
            id: pedido.cliente_id,
            nome: pedido.cliente_nome || 'Cliente desconhecido',
            qtdePedidos: 0,
            valorTotal: 0,
            ultimoPedido: '1970-01-01',
          };
        }
        acc[pedido.cliente_id].qtdePedidos += 1;
        acc[pedido.cliente_id].valorTotal += pedido.total || 0;
        if (pedido.data_entrega > acc[pedido.cliente_id].ultimoPedido) {
          acc[pedido.cliente_id].ultimoPedido = pedido.data_entrega;
        }
        return acc;
      }, {});

      const clientesPendentesList = Object.values(clientesMap).sort(
        (a, b) => b.valorTotal - a.valorTotal
      );
      setClientesPendentes(clientesPendentesList);
      setLoadingClientes(false);

      setStats([
        {
          id: 'totalPedidos',
          title: 'Total de\nPedidos',
          value: totalPedidosCount,
          subtitle: `${formatCurrency(totalPedidosValue)} total`,
          icon: ListOrdered,
          color: 'bg-green-500',
          loading: false,
          bgColor: 'bg-green-50',
        },
        {
          id: 'naoPagos',
          title: 'Pedidos a\nReceber',
          value: pedidosNaoPagos.length,
          subtitle: `${formatCurrency(totalNaoPago)} pendentes`,
          icon: DollarSign,
          color: 'bg-red-500',
          loading: false,
          bgColor: 'bg-red-50',
        },
        {
          id: 'naoEntregues',
          title: 'Pedidos Não\nEntregues',
          value: pedidosNaoEntregues.length,
          subtitle: `${formatCurrency(totalNaoEntregue)} pendentes`,
          icon: Truck,
          color: 'bg-yellow-500',
          loading: false,
          bgColor: 'bg-yellow-50',
        },
        {
          id: 'entreguesNaoPagos',
          title: 'Pedidos Entregues\ne Não Pagos',
          value: pedidosEntreguesNaoPagos.length,
          subtitle: `${formatCurrency(totalEntreguesNaoPagos)} pendentes`,
          icon: HandCoins,
          color: 'bg-purple-500',
          loading: false,
          bgColor: 'bg-purple-50',
        },
        {
          id: 'pagosNaoEntregues',
          title: 'Pedidos Pagos e\nNão Entregues',
          value: pedidosPagosNaoEntregues.length,
          subtitle: `${formatCurrency(totalPagosNaoEntregues)} pendentes`,
          icon: PackageCheck,
          color: 'bg-blue-600',
          loading: false,
          bgColor: 'bg-blue-50',
        },
        {
          id: 'atrasados',
          title: 'Pedidos\nAtrasados',
          value: pedidosAtrasados.length,
          subtitle: `${formatCurrency(totalAtrasado)} atrasados`,
          icon: AlertTriangle,
          color: 'bg-orange-600',
          loading: false,
          bgColor: 'bg-orange-50',
        },
        {
          id: 'clientes',
          title: 'Clientes\nCadastrados',
          value: totalClientes,
          icon: Users,
          color: 'bg-blue-500',
          loading: false,
          bgColor: 'bg-white',
        }, // Total geral
        {
          id: 'produtos',
          title: 'Produtos\nAtivos',
          value: totalProdutosAtivos,
          icon: Package,
          color: 'bg-green-500',
          loading: false,
          bgColor: 'bg-white',
        }, // Total geral
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as informações do dashboard.',
        variant: 'destructive',
      });
      const errorState = {
        value: <AlertCircle className="h-6 w-6 text-red-500" />,
        isError: true,
        loading: false,
      };
      setStats((prevStats) => prevStats.map((s) => ({ ...s, ...errorState })));
      setLoadingClientes(false);
    }
  }, [toast, dateFilter, customStartDate, customEndDate]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const handleCardClick = (cardId) => {
    // Ao clicar, podemos passar os filtros de data também se desejar, mas por enquanto mantemos a lógica original
    // Adicionamos a lógica básica de navegação
    if (cardId === 'naoPagos') {
      navigate('/pedidos', { state: { filtroPagamento: 'Não Pago', filtroStatus: 'abertos' } });
    } else if (cardId === 'naoEntregues') {
      navigate('/pedidos', { state: { filtroEntrega: 'Não Entregue', filtroStatus: 'abertos' } });
    } else if (cardId === 'pagosNaoEntregues') {
      navigate('/pedidos', {
        state: { filtroPagamento: 'Pago', filtroEntrega: 'Não Entregue', filtroStatus: 'abertos' },
      });
    } else if (cardId === 'entreguesNaoPagos') {
      navigate('/pedidos', {
        state: { filtroPagamento: 'Não Pago', filtroEntrega: 'Entregue', filtroStatus: 'abertos' },
      });
    } else if (cardId === 'atrasados') {
      navigate('/pedidos', { state: { filtroStatus: 'abertos' } });
    } else if (cardId === 'totalPedidos') {
      navigate('/pedidos');
    }
  };

  const handleVerTodosPendentes = () => {
    navigate('/pedidos', { state: { filtroPagamento: 'Não Pago', filtroEntrega: 'Entregue' } });
  };

  const handleApplyCustomDate = () => {
    if (customStartDate && customEndDate) {
      setDateFilter('personalizado');
      setIsPopoverOpen(false);
    } else {
      toast({
        title: 'Datas inválidas',
        description: 'Selecione a data inicial e final.',
        variant: 'destructive',
      });
    }
  };

  const FilterButton = ({ filter, label }) => (
    <Button
      variant={dateFilter === filter ? 'default' : 'outline'}
      className={cn(
        'rounded-xl border',
        dateFilter === filter
          ? 'bg-primary hover:bg-primary/90 text-white border-transparent' // Laranja sólida para ativo
          : 'bg-transparent text-primary border-primary hover:bg-primary/10' // Borda laranja com fundo transparente para inativo
      )}
      onClick={() => setDateFilter(filter)}
    >
      {label}
    </Button>
  );

  return (
    <>
      <Helmet>
        <title>Dashboard - Gestor de Pedidos</title>
        <meta name="description" content="Painel de controle do sistema de gestão de pedidos" />
      </Helmet>
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-gray-500 mt-1">Visão geral do seu negócio em tempo real</p>
          </div>

          {/* Date Filters */}
          <div className="flex flex-wrap gap-2">
            <FilterButton filter="sempre" label="Sempre" />
            <FilterButton filter="hoje" label="Hoje" />
            <FilterButton filter="ontem" label="Ontem" />
            <FilterButton filter="7dias" label="Últimos 7 dias" />
            <FilterButton filter="mes" label="Mês atual" />

            <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={dateFilter === 'personalizado' ? 'default' : 'outline'}
                  className={cn(
                    'rounded-xl border gap-2',
                    dateFilter === 'personalizado'
                      ? 'bg-primary hover:bg-primary/90 text-white border-transparent'
                      : 'bg-transparent text-primary border-primary hover:bg-primary/10'
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  Personalizado
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="end">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium leading-none">Intervalo de datas</h4>
                    <p className="text-sm text-muted-foreground">Selecione o período desejado.</p>
                  </div>
                  <div className="grid gap-2">
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="start-date">Início</Label>
                      <Input
                        id="start-date"
                        type="date"
                        className="col-span-2 h-8"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-3 items-center gap-4">
                      <Label htmlFor="end-date">Fim</Label>
                      <Input
                        id="end-date"
                        type="date"
                        className="col-span-2 h-8"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                      />
                    </div>
                    <Button
                      className="w-full mt-2 bg-primary hover:bg-primary/90"
                      onClick={handleApplyCustomDate}
                    >
                      Aplicar Filtro
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Updated grid to accommodate 8 items nicely */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg shadow p-4 flex flex-col justify-between min-h-[140px] ${stat.bgColor || 'bg-white'} ${['totalPedidos', 'naoPagos', 'naoEntregues', 'pagosNaoEntregues', 'entreguesNaoPagos', 'atrasados'].includes(stat.id) ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}`}
              onClick={() => handleCardClick(stat.id)}
            >
              <div className="flex items-start justify-between">
                <p
                  className="text-sm text-gray-700 font-semibold whitespace-pre-line leading-tight"
                  title={stat.title.replace('\n', ' ')}
                >
                  {stat.title}
                </p>
                <div className={`${stat.color} p-2 rounded-lg flex-shrink-0 ml-2`}>
                  <stat.icon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-3xl font-bold text-gray-900">
                  {stat.loading ? (
                    <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                  ) : stat.isError ? (
                    stat.value
                  ) : (
                    <p>{stat.value}</p>
                  )}
                </div>
                {stat.subtitle && !stat.loading && (
                  <p className="text-xs text-gray-600 mt-1">{stat.subtitle}</p>
                )}
                {stat.loading && stat.subtitle && (
                  <div className="h-4 w-32 mt-1 bg-gray-200 rounded animate-pulse"></div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg shadow"
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Clientes com Pagamentos Pendentes
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Clientes que receberam pedidos no período selecionado, mas ainda não pagaram.
            </p>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6">Cliente</TableHead>
                  <TableHead className="text-center">Qtde Pedidos</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="text-right px-6">Último Pedido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingClientes ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell className="px-6">
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-10 mx-auto bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell>
                        <div className="h-5 w-20 ml-auto bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                      <TableCell className="px-6">
                        <div className="h-5 w-20 ml-auto bg-gray-200 rounded animate-pulse"></div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : clientesPendentes.length > 0 ? (
                  clientesPendentes.slice(0, 5).map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium px-6">{cliente.nome}</TableCell>
                      <TableCell className="text-center">{cliente.qtdePedidos}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(cliente.valorTotal)}
                      </TableCell>
                      <TableCell className="text-right px-6">
                        {formatDate(cliente.ultimoPedido)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      Nenhum cliente com pagamentos pendentes neste período.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          {clientesPendentes.length > 5 && (
            <div className="text-right p-4 border-t">
              <Button variant="link" onClick={handleVerTodosPendentes}>
                Ver todos ({clientesPendentes.length})
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}

export default Dashboard;
