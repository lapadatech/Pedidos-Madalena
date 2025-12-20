import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { Plus, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { listarPedidos } from '@/lib/api';
import { listarTags } from '@/lib/tagsApi';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import CriarPedidoStep1 from '@/components/pedidos/CriarPedidoStep1';
import CriarPedidoStep2 from '@/components/pedidos/CriarPedidoStep2';
import CriarPedidoStep3 from '@/components/pedidos/CriarPedidoStep3';
import PedidosKanban from '@/components/pedidos/PedidosKanban';
import PedidosTabela from '@/components/pedidos/PedidosTabela';
import PedidoDetalheDialog from '@/components/pedidos/PedidoDetalheDialog';
import { useToast } from '@/components/ui/use-toast';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import TagSelector from '@/components/tags/TagSelector';

const initialState = {
  cliente: null,
  data_entrega: '',
  hora_entrega: '',
  tipo_entrega: 'retirada',
  endereco_entrega_id: null,
  itens: [],
  frete: 0,
  desconto: 0,
  status_pagamento: 'Não Pago',
  status_entrega: 'Não Entregue',
  tag_ids: [],
};

const PAGE_SIZE = 50;

function Pedidos() {
  const location = useLocation();
  const dashboardFilters = location.state;

  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('kanban');
  const [wizardAberto, setWizardAberto] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [etapaAtual, setEtapaAtual] = useState(1);
  const [dadosPedido, setDadosPedido] = useState(initialState);
  const [detalheDialogAberto, setDetalheDialogAberto] = useState(false);
  const [pedidoSelecionadoId, setPedidoSelecionadoId] = useState(null);

  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('abertos');
  const [filtroPagamento, setFiltroPagamento] = useState(
    dashboardFilters?.filtroPagamento || 'todos'
  );
  const [filtroEntrega, setFiltroEntrega] = useState(dashboardFilters?.filtroEntrega || 'todos');
  const [filtroTagIds, setFiltroTagIds] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPedidos, setTotalPedidos] = useState(0);

  const { temPermissao } = useAuth();
  const { toast } = useToast();

  const carregarPedidos = useCallback(async () => {
    setLoading(true);
    try {
      let filters = {};
      if (activeTab === 'tabela') {
        filters = {
          busca,
          status_geral: filtroStatus,
          status_pagamento: filtroPagamento !== 'todos' ? filtroPagamento : undefined,
          status_entrega: filtroEntrega !== 'todos' ? filtroEntrega : undefined,
          tag_ids: filtroTagIds.length > 0 ? filtroTagIds : undefined,
          page: currentPage,
          pageSize: PAGE_SIZE,
        };
      } else {
        filters = {
          status_geral: 'abertos',
        };
      }

      const { data, count } = await listarPedidos(filters);
      setPedidos(data || []);
      setTotalPedidos(count || 0);
    } catch (error) {
      // Erro já tratado na API
    } finally {
      setLoading(false);
    }
  }, [activeTab, busca, filtroStatus, filtroPagamento, filtroEntrega, filtroTagIds, currentPage]);

  useEffect(() => {
    carregarPedidos();
  }, [carregarPedidos]);

  useEffect(() => {
    setCurrentPage(1);
  }, [busca, filtroStatus, filtroPagamento, filtroEntrega, filtroTagIds, activeTab]);

  const totalPages = Math.ceil(totalPedidos / PAGE_SIZE);

  const resetWizard = () => {
    setWizardAberto(false);
    setEtapaAtual(1);
    setDadosPedido(initialState);
    setEditMode(false);
  };

  const handleProximaEtapa = (dados) => {
    setDadosPedido((prev) => ({ ...prev, ...dados }));
    setEtapaAtual(etapaAtual + 1);
  };

  const handleVoltarEtapa = () => {
    setEtapaAtual(etapaAtual - 1);
  };

  const handleFinalizarPedido = async (novoPedido) => {
    resetWizard();
    await carregarPedidos();
    if (novoPedido && novoPedido.id) {
      handleAbrirDetalhe(novoPedido.id);
    }
  };

  const handleAbrirDetalhe = (id) => {
    setPedidoSelecionadoId(id);
    setDetalheDialogAberto(true);
  };

  const handleFecharDetalhe = () => {
    setPedidoSelecionadoId(null);
    setDetalheDialogAberto(false);
    carregarPedidos();
  };

  const handlePedidoDeletado = () => {
    setDetalheDialogAberto(false);
    setPedidoSelecionadoId(null);
    carregarPedidos();
  };

  const handleIniciarEdicao = (pedidoParaEditar) => {
    setDetalheDialogAberto(false);
    setEditMode(true);

    const itensFormatados = pedidoParaEditar.itens.map((item) => ({
      ...item,
      id: item.id || Date.now() + Math.random(),
      produto_nome: item.produtos.nome,
      valor_total: item.quantidade * item.valor_unitario,
    }));

    setDadosPedido({
      ...pedidoParaEditar,
      cliente: pedidoParaEditar.cliente,
      itens: itensFormatados,
      tag_ids: pedidoParaEditar.tag_ids || [],
    });
    setEtapaAtual(2);
    setWizardAberto(true);
  };

  const handleExportExcel = async () => {
    toast({ title: 'Exportando...', description: 'Preparando todos os pedidos para exportação.' });
    try {
      const { data: allPedidos } = await listarPedidos({
        busca,
        status_geral: filtroStatus,
        status_pagamento: filtroPagamento !== 'todos' ? filtroPagamento : undefined,
        status_entrega: filtroEntrega !== 'todos' ? filtroEntrega : undefined,
        tag_ids: filtroTagIds.length > 0 ? filtroTagIds : undefined,
      });

      const dataToExport = allPedidos.map((p) => ({
        'Nº Pedido': p.id,
        Cliente: p.cliente_nome,
        Data: p.data_entrega
          ? new Date(p.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')
          : '-',
        Hora: p.hora_entrega ? p.hora_entrega.slice(0, 5) : '-',
        Tipo: p.tipo_entrega,
        Total: p.total,
        'Status de Pagamento': p.status_pagamento,
        'Status de Entrega': p.status_entrega,
        Tags: p.tags ? p.tags.map((t) => t.nome).join(', ') : '-',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Pedidos');

      const today = new Date();
      const dateStr = `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`;

      XLSX.writeFile(workbook, `pedidos_${dateStr}.xlsx`);
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo Excel.',
        variant: 'destructive',
      });
    }
  };

  const podeCriar = temPermissao('pedidos', 'editar');

  return (
    <>
      <Helmet>
        <title>Pedidos - Gestor de Pedidos</title>
        <meta name="description" content="Gerenciamento de pedidos" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Pedidos</h2>
            <p className="text-gray-500 mt-1">Gerencie os pedidos da sua loja</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'tabela' && (
              <Button variant="outline" onClick={handleExportExcel}>
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            )}
            {podeCriar && (
              <Button
                className="bg-orange-500 hover:bg-orange-600"
                onClick={() => setWizardAberto(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Pedido
              </Button>
            )}
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex justify-between items-center border-b">
            <TabsList className="bg-transparent border-none p-0">
              <TabsTrigger
                value="kanban"
                className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-orange-500 rounded-none"
              >
                Kanban
              </TabsTrigger>
              <TabsTrigger
                value="tabela"
                className="data-[state=active]:shadow-none data-[state=active]:border-b-2 border-orange-500 rounded-none"
              >
                Tabela
              </TabsTrigger>
            </TabsList>
          </div>

          {activeTab === 'tabela' && (
            <div className="p-4 bg-white rounded-b-lg shadow flex flex-col sm:flex-row flex-wrap gap-4">
              <Input
                placeholder="Buscar por cliente ou nº do pedido..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="flex-grow"
              />
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="abertos">Abertos</SelectItem>
                    <SelectItem value="concluidos">Concluídos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Select value={filtroPagamento} onValueChange={setFiltroPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status Pagamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos Pagamentos</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Não Pago">Não Pago</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[180px]">
                <Select value={filtroEntrega} onValueChange={setFiltroEntrega}>
                  <SelectTrigger>
                    <SelectValue placeholder="Status Entrega" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas Entregas</SelectItem>
                    <SelectItem value="Entregue">Entregue</SelectItem>
                    <SelectItem value="Não Entregue">Não Entregue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-auto sm:min-w-[200px]">
                <TagSelector selectedTagIds={filtroTagIds} onChange={setFiltroTagIds} />
              </div>
            </div>
          )}

          <TabsContent value="kanban" className={activeTab === 'kanban' ? 'mt-4' : 'mt-0'}>
            <PedidosKanban
              pedidos={pedidos}
              onAbrirDetalhe={handleAbrirDetalhe}
              loading={loading}
            />
          </TabsContent>
          <TabsContent value="tabela" className="mt-0">
            <PedidosTabela
              pedidos={pedidos}
              onAbrirDetalhe={handleAbrirDetalhe}
              loading={loading}
            />
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-end space-x-2 py-4">
                <span className="text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Página Anterior</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Próxima Página</span>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog
          open={wizardAberto}
          onOpenChange={(open) => {
            if (!open) resetWizard();
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editMode ? 'Editar Pedido' : 'Novo Pedido'} - Etapa {etapaAtual} de 3
              </DialogTitle>
            </DialogHeader>
            {etapaAtual === 1 && (
              <CriarPedidoStep1 onProximo={handleProximaEtapa} dadosIniciais={dadosPedido} />
            )}
            {etapaAtual === 2 && (
              <CriarPedidoStep2
                onProximo={handleProximaEtapa}
                onVoltar={handleVoltarEtapa}
                dadosIniciais={dadosPedido}
              />
            )}
            {etapaAtual === 3 && (
              <CriarPedidoStep3
                onVoltar={handleVoltarEtapa}
                onFinalizar={handleFinalizarPedido}
                dadosIniciais={dadosPedido}
                editMode={editMode}
              />
            )}
          </DialogContent>
        </Dialog>

        {detalheDialogAberto && (
          <PedidoDetalheDialog
            pedidoId={pedidoSelecionadoId}
            open={detalheDialogAberto}
            onOpenChange={handleFecharDetalhe}
            onIniciarEdicao={handleIniciarEdicao}
            onPedidoDeletado={handlePedidoDeletado}
          />
        )}
      </div>
    </>
  );
}

export default Pedidos;
