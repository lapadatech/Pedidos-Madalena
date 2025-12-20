import React, { useState, useEffect } from 'react';
import { Plus, Minus, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, InputCurrency } from '@/components/ui/input';
import { UppercaseTextarea } from '@/components/ui/UppercaseTextarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import {
  listarProdutos,
  listarGruposComplementosComOpcoes,
  criarPedido,
  atualizarPedidoCompleto,
} from '@/lib/api';
import { vincularTagsPedido } from '@/lib/tagsApi';
import TagSelector from '@/components/tags/TagSelector';

function CriarPedidoStep3({ onVoltar, onFinalizar, dadosIniciais, editMode }) {
  const { usuario } = useAuth();
  const { toast } = useToast();

  // Estados para a seção de produtos
  const [produtos, setProdutos] = useState([]);
  const [grupos, setGrupos] = useState([]);
  const [loadingProdutos, setLoadingProdutos] = useState(true);
  const [itens, setItens] = useState(dadosIniciais.itens || []);
  const [produtoSelecionadoId, setProdutoSelecionadoId] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [observacao, setObservacao] = useState('');
  const [gruposDoProduto, setGruposDoProduto] = useState([]);
  const [complementosSelecionados, setComplementosSelecionados] = useState({});

  // Estados para a seção de resumo e pagamento
  const [frete, setFrete] = useState((dadosIniciais.frete || 0) * 100);
  const [desconto, setDesconto] = useState((dadosIniciais.desconto || 0) * 100);
  const [observacaoGeral, setObservacaoGeral] = useState(dadosIniciais.observacao_geral || '');
  const [statusPagamento, setStatusPagamento] = useState(
    dadosIniciais.status_pagamento || 'Não Pago'
  );
  const [statusEntrega, setStatusEntrega] = useState(
    dadosIniciais.status_entrega || 'Não Entregue'
  );
  const [isSaving, setIsSaving] = useState(false);

  // Novo estado para tags - garantindo array
  const [selectedTagIds, setSelectedTagIds] = useState(dadosIniciais._tag_ids || []);

  // Carregar dados de produtos e complementos
  useEffect(() => {
    const carregarDadosProdutos = async () => {
      setLoadingProdutos(true);
      try {
        const [produtosData, gruposData] = await Promise.all([
          listarProdutos({ ativo: true }),
          listarGruposComplementosComOpcoes(),
        ]);

        const sortedProdutos = (produtosData?.data || []).sort((a, b) =>
          a.nome.localeCompare(b.nome)
        );

        setProdutos(sortedProdutos);
        setGrupos(Array.isArray(gruposData) ? gruposData : []);
      } catch (error) {
        toast({
          title: 'Erro ao carregar dados de produtos',
          description: String(error?.message || error),
          variant: 'destructive',
        });
      } finally {
        setLoadingProdutos(false);
      }
    };
    carregarDadosProdutos();
  }, [toast]);

  const produtoSelecionado = produtos.find((p) => p?.id?.toString() === produtoSelecionadoId);

  const handleSelecionarProduto = (id) => {
    setProdutoSelecionadoId(id);
    const prod = produtos.find((p) => p?.id?.toString() === id);
    const grupoIds = Array.isArray(prod?.grupos_complementos) ? prod.grupos_complementos : [];

    if (!Array.isArray(grupos) || grupos.length === 0 || grupoIds.length === 0) {
      setGruposDoProduto([]);
      setComplementosSelecionados({});
      return;
    }
    const instancias = grupoIds
      .map((gid, idx) => {
        const base = grupos.find((g) => g?.id?.toString() === gid?.toString());
        return base ? { ...base, instanceId: `${gid}-${idx}` } : null;
      })
      .filter(Boolean)
      .map((g) => ({ ...g, opcoes: Array.isArray(g.opcoes) ? g.opcoes : [] }));

    setGruposDoProduto(instancias);
    setComplementosSelecionados((prev) => {
      const next = {};
      instancias.forEach((inst) => {
        next[inst.instanceId] = prev[inst.instanceId] ?? '';
      });
      return next;
    });
  };

  const handleSelecionarOpcao = (instanceId, opcaoId) => {
    setComplementosSelecionados((prev) => ({ ...prev, [instanceId]: opcaoId }));
  };

  const handleAdicionarItem = () => {
    if (!produtoSelecionado) {
      toast({ title: 'Selecione um produto', variant: 'destructive' });
      return;
    }
    for (const inst of gruposDoProduto) {
      if (inst.obrigatorio && !complementosSelecionados[inst.instanceId]) {
        toast({
          title: `Obrigatório: Selecione uma opção para "${inst.nome}"`,
          variant: 'destructive',
        });
        return;
      }
    }
    const complementosEscolhidos = gruposDoProduto
      .map((inst) => {
        const chosenId = complementosSelecionados[inst.instanceId];
        const opc = inst.opcoes?.find((o) => o?.id?.toString() === chosenId?.toString());
        return opc
          ? {
              id: opc.id,
              nome: opc.nome,
              preco_adicional: Number(opc.preco_adicional) || 0,
              grupo_id: inst.id,
              grupo_nome: inst.nome,
            }
          : null;
      })
      .filter(Boolean);

    const valorComplementos = complementosEscolhidos.reduce((sum, c) => sum + c.preco_adicional, 0);
    const valorUnitario = (Number(produtoSelecionado.preco) || 0) + valorComplementos;
    const valorTotal = valorUnitario * quantidade;

    const novoItem = {
      id: Date.now(),
      produto_id: produtoSelecionado.id,
      produto_nome: produtoSelecionado.nome,
      quantidade,
      observacao,
      complementos: complementosEscolhidos,
      valor_unitario: valorUnitario,
      valor_total: valorTotal,
    };

    setItens([...itens, novoItem]);
    setProdutoSelecionadoId('');
    setQuantidade(1);
    setObservacao('');
    setGruposDoProduto([]);
    setComplementosSelecionados({});
    toast({ title: 'Item adicionado!' });
  };

  const handleRemoverItem = (id) => {
    setItens(itens.filter((item) => item.id !== id));
  };

  // Lógica de finalização do pedido
  const subtotal = itens.reduce((sum, item) => sum + item.valor_total, 0);
  const freteFloat = frete / 100;
  const descontoFloat = desconto / 100;
  const total = subtotal + freteFloat - descontoFloat;

  const handleFinalizar = async () => {
    if (itens.length === 0) {
      toast({ title: 'Adicione pelo menos um item ao pedido.', variant: 'destructive' });
      return;
    }
    if (dadosIniciais.tipo_entrega === 'entrega' && frete <= 0) {
      toast({ title: 'Valor do frete é obrigatório para entrega.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    try {
      const pedidoParaSalvar = {
        ...dadosIniciais,
        subtotal,
        desconto: descontoFloat,
        frete: freteFloat,
        total,
        observacao_geral: observacaoGeral,
        status_pagamento: statusPagamento,
        status_entrega: statusEntrega,
        criado_por: editMode ? dadosIniciais.criado_por : usuario?.nome || '—',
        itens: itens.map(({ id, produto_nome, valor_total, ...item }) => item),
      };

      let pedidoResultante;
      if (editMode) {
        pedidoResultante = await atualizarPedidoCompleto(dadosIniciais.id, pedidoParaSalvar);
        // Atualizar tags do pedido
        await vincularTagsPedido(dadosIniciais.id, selectedTagIds);
        toast({ title: 'Pedido atualizado com sucesso!' });
      } else {
        pedidoResultante = await criarPedido(pedidoParaSalvar);
        // Vincular tags ao novo pedido
        await vincularTagsPedido(pedidoResultante.id, selectedTagIds);
        toast({ title: 'Pedido criado com sucesso!' });
      }
      onFinalizar(pedidoResultante);
    } catch (error) {
      toast({
        title: `Erro ao ${editMode ? 'atualizar' : 'criar'} pedido`,
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingProdutos) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Seção de Produtos */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg">Itens do Pedido</h3>
        <div>
          <Label>Produto</Label>
          <Select value={produtoSelecionadoId} onValueChange={handleSelecionarProduto}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um produto" />
            </SelectTrigger>
            <SelectContent>
              {produtos.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.nome} — R$ {Number(p.preco).toFixed(2).replace('.', ',')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {gruposDoProduto.length > 0 && (
          <div className="mt-4 space-y-3">
            <Label>Complementos deste produto</Label>
            <div className="grid gap-3">
              {gruposDoProduto.map((inst) => (
                <div key={inst.instanceId} className="border rounded p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-orange-500" />
                      <span className="font-medium">{inst.nome}</span>
                      {inst.obrigatorio ? (
                        <span className="text-xs px-2 py-0.5 rounded bg-orange-100 text-orange-700">
                          Obrigatório
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                          Opcional
                        </span>
                      )}
                    </div>
                  </div>
                  <Select
                    value={complementosSelecionados[inst.instanceId]?.toString() || ''}
                    onValueChange={(v) => handleSelecionarOpcao(inst.instanceId, v)}
                    disabled={!Array.isArray(inst.opcoes) || inst.opcoes.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          inst.obrigatorio ? 'Selecione uma opção' : 'Selecione (opcional)'
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {!inst.obrigatorio && <SelectItem value="none">— Sem opção —</SelectItem>}
                      {Array.isArray(inst.opcoes) &&
                        inst.opcoes.map((op) => (
                          <SelectItem key={`${inst.instanceId}__${op.id}`} value={op.id.toString()}>
                            {op.nome}{' '}
                            {Number(op.preco_adicional) > 0
                              ? `(+ R$ ${Number(op.preco_adicional).toFixed(2).replace('.', ',')})`
                              : ''}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center space-x-2 mt-4">
          <Button variant="outline" onClick={() => setQuantidade((q) => Math.max(1, q - 1))}>
            <Minus size={16} />
          </Button>
          <Input
            type="number"
            min="1"
            value={quantidade}
            onChange={(e) => setQuantidade(Number(e.target.value))}
            className="w-20 text-center"
          />
          <Button variant="outline" onClick={() => setQuantidade((q) => q + 1)}>
            <Plus size={16} />
          </Button>
        </div>
        <div className="mt-4">
          <Label>Observação do Item</Label>
          <UppercaseTextarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex: sem cebola, ponto da carne, etc."
          />
        </div>
        <Button
          className="mt-4 w-full bg-orange-500 hover:bg-orange-600"
          onClick={handleAdicionarItem}
        >
          Adicionar item
        </Button>
      </div>

      {/* Lista de Itens Adicionados */}
      <div className="p-4 bg-white rounded-lg shadow-sm">
        {itens.length === 0 ? (
          <p className="text-sm text-center text-gray-500 py-4">Nenhum item adicionado.</p>
        ) : (
          <div className="space-y-3">
            {itens.map((item) => (
              <div key={item.id} className="border border-gray-100 rounded p-3">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <p className="font-semibold text-sm">
                        {item.quantidade}x {item.produto_nome}
                      </p>
                      <p className="font-semibold text-sm whitespace-nowrap">
                        R$ {Number(item.valor_total).toFixed(2).replace('.', ',')}
                      </p>
                    </div>
                    {item.complementos?.length > 0 && (
                      <div className="ml-4 space-y-0.5 mt-2">
                        {item.complementos.map((c, idx) => (
                          <p key={idx} className="text-xs text-gray-600">
                            {c.grupo_nome}: {c.nome}
                          </p>
                        ))}
                      </div>
                    )}
                    {item.observacao && (
                      <p className="text-xs text-gray-500 ml-4 mt-2">Obs: {item.observacao}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoverItem(item.id)}
                    className="flex-shrink-0"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Seção Resumo e Pagamento */}
      <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold text-lg">Resumo & Pagamento</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {dadosIniciais.tipo_entrega === 'entrega' && (
            <div>
              <Label htmlFor="frete">Frete *</Label>
              <InputCurrency id="frete" value={frete} onValueChange={setFrete} />
            </div>
          )}
          <div className="col-span-1">
            <Label htmlFor="desconto">Desconto</Label>
            <InputCurrency id="desconto" value={desconto} onValueChange={setDesconto} />
          </div>
        </div>

        <div className="bg-orange-50 rounded-lg p-4 space-y-2 mt-4">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          {dadosIniciais.tipo_entrega === 'entrega' && (
            <div className="flex justify-between text-sm">
              <span>Frete</span>
              <span>R$ {freteFloat.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          {descontoFloat > 0 && (
            <div className="flex justify-between text-sm text-red-500">
              <span>Desconto</span>
              <span>- R$ {descontoFloat.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold border-t pt-2 mt-2">
            <span>Total</span>
            <span className="text-orange-600">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <div>
            <Label>Status do Pagamento</Label>
            <Select value={statusPagamento} onValueChange={setStatusPagamento} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não Pago">Não Pago</SelectItem>
                <SelectItem value="Pago">Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Status da Entrega</Label>
            <Select value={statusEntrega} onValueChange={setStatusEntrega} disabled={isSaving}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Não Entregue">Não Entregue</SelectItem>
                <SelectItem value="Entregue">Entregue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Seletor de Tags */}
        <div className="pt-4">
          <Label className="mb-2 block">Tags (opcional)</Label>
          <TagSelector
            selectedTagIds={selectedTagIds}
            onChange={setSelectedTagIds}
            className="w-full"
          />
        </div>

        <div className="pt-4">
          <Label>Observação do Pedido</Label>
          <UppercaseTextarea
            value={observacaoGeral}
            onChange={(e) => setObservacaoGeral(e.target.value)}
            placeholder="Adicione observações gerais para o pedido (opcional)"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onVoltar}
          className="flex-1"
          disabled={isSaving}
        >
          Voltar
        </Button>
        <Button
          onClick={handleFinalizar}
          disabled={isSaving}
          className="flex-1 bg-orange-500 hover:bg-orange-600"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          {isSaving ? 'Salvando...' : editMode ? 'Salvar Alterações' : 'Finalizar Pedido'}
        </Button>
      </div>
    </div>
  );
}

export default CriarPedidoStep3;
