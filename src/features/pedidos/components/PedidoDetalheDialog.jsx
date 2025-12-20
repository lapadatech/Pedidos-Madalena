import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Loader2, Printer, Trash2, Edit, MessageCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { useToast } from '@/shared/ui/use-toast';
import { obterPedidoCompleto, atualizarPedido, deletarPedido } from '@/lib/api';
import { useAuth } from '@/contexts/SupabaseAuthContext';
import { maskCelular } from '@/lib/maskUtils';
import TagChip from '@/shared/components/tags/TagChip';

const formatarHora = (hora) => {
  if (!hora) return '';
  return hora.slice(0, 5);
};

const capitalizeFirstLetter = (string) => {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
};

const formatarEndereco = (end) => {
  if (!end) return '';
  const parts = [end.rua, end.numero, end.bairro, end.complemento];
  return parts.filter(Boolean).join(', ');
};

const InfoLine = ({ label, value, className = '' }) => (
  <div className={className}>
    <p className="text-xs text-gray-500">{label}</p>
    <p className="font-medium text-sm">{value || 'Não informado'}</p>
  </div>
);

const imprimirPedido = (pedido, toast) => {
  if (!pedido) return;

  const { cliente, itens, endereco_entrega } = pedido;
  const dataEntregaFormatada = new Date(pedido.data_entrega + 'T00:00:00').toLocaleDateString(
    'pt-BR'
  );
  const horaEntregaFormatada = formatarHora(pedido.hora_entrega);

  const clienteInfoHtml = `
        <div class="section">
            <div><strong>Cliente:</strong> ${cliente.nome}</div>
            <div><strong>Telefone:</strong> ${maskCelular(cliente.celular)}</div>
        </div>
        <div class="separator"></div>
    `;

  const pedidoInfoHtml = `
        <div class="separator"></div>
        <div class="section info-grid">
            <div><strong>Pedido:</strong> #${pedido.id}</div>
            <div><strong>Tipo:</strong> ${capitalizeFirstLetter(pedido.tipo_entrega)}</div>
            <div><strong>Data:</strong> ${dataEntregaFormatada}</div>
            <div><strong>Hora:</strong> ${horaEntregaFormatada}</div>
        </div>
        <div class="separator"></div>
    `;

  const itensHtml = `
        <div class="section items-section">
            ${itens
              .map(
                (item) => `
                <div class="item">
                    <div class="produto">
                        <span class="produto-quantidade">${item.quantidade}x</span> ${item.produtos.nome}
                    </div>
                    <div class="valor-item">
                        R$ ${(item.valor_unitario * item.quantidade).toFixed(2).replace('.', ',')}
                    </div>
                </div>
                ${
                  Array.isArray(item.complementos) && item.complementos.length > 0
                    ? `
                    <div class="complementos">
                        ${item.complementos.map((c) => `<div class="complemento">- ${c.grupo_nome}: ${c.nome}</div>`).join('')}
                    </div>
                `
                    : ''
                }
                ${item.observacao ? `<div class="obs">Obs: ${item.observacao}</div>` : ''}
            `
              )
              .join('')}
        </div>
        <div class="separator"></div>
    `;

  const criadoPorHtml = `
        <div class="section">
            <strong>Pedido realizado por:</strong> ${pedido.criado_por}
        </div>
        <div class="separator"></div>
    `;

  const obsGeralHtml = pedido.observacao_geral
    ? `
        <div class="section obs-geral-section">
            <strong>OBSERVAÇÃO GERAL:</strong>
            <p>${pedido.observacao_geral}</p>
        </div>
        <div class="separator"></div>
    `
    : '';

  const enderecoHtml =
    pedido.tipo_entrega === 'entrega' && endereco_entrega
      ? `
        <div class="section">
            <strong>ENDEREÇO:</strong>
            <p>${formatarEndereco(endereco_entrega)}</p>
            <p>${endereco_entrega.cidade} - ${endereco_entrega.estado}, ${endereco_entrega.cep}</p>
        </div>
        <div class="separator"></div>
    `
      : '';

  const totaisHtml = `
        <div class="section total-section">
            <div><span>Subtotal:</span><span>R$ ${Number(pedido.subtotal).toFixed(2).replace('.', ',')}</span></div>
            ${pedido.frete > 0 ? `<div><span>Frete:</span><span>R$ ${Number(pedido.frete).toFixed(2).replace('.', ',')}</span></div>` : ''}
            ${pedido.desconto > 0 ? `<div><span>Desconto:</span><span>- R$ ${Number(pedido.desconto).toFixed(2).replace('.', ',')}</span></div>` : ''}
            <div class="total-bold">
                <span>TOTAL:</span>
                <span>R$ ${Number(pedido.total).toFixed(2).replace('.', ',')}</span>
            </div>
        </div>
        <div class="separator"></div>
    `;

  const statusPagamentoHtml = `<div class="status-pagamento">${pedido.status_pagamento}</div>`;

  const viaAtendimentoContent = `
        ${clienteInfoHtml}
        ${pedidoInfoHtml}
        ${enderecoHtml}
        ${itensHtml}
        ${criadoPorHtml}
        ${obsGeralHtml}
        ${totaisHtml}
        ${statusPagamentoHtml}
    `;

  const viaProducaoContent = `
        ${clienteInfoHtml}
        ${pedidoInfoHtml}
        ${itensHtml}
        ${criadoPorHtml}
        ${obsGeralHtml}
    `;

  const fullHtml = `
        <div class="page">
            <h2 class="cabecalho-via">VIA DO ATENDIMENTO</h2>
            <div class="cupom-completo">${viaAtendimentoContent}</div>
        </div>
        <div class="page-break"></div>
        <div class="page">
            <h2 class="cabecalho-via">VIA DA PRODUÇÃO</h2>
            <div class="cupom-resumido">${viaProducaoContent}</div>
        </div>
    `;

  const printStyles = `
        <style>
            @page {
                size: 80mm auto;
                margin: 5mm;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            body {
                font-family: 'monospace', sans-serif;
                font-size: 13px;
                line-height: 1.4;
                color: #000;
                background: #fff;
                width: 74mm;
            }
            .page-break {
                page-break-before: always;
            }
            .cabecalho-via {
                text-align: center;
                font-weight: bold;
                text-transform: uppercase;
                border-bottom: 1px solid #000;
                padding-bottom: 4px;
                margin-bottom: 6px;
            }
            .section {
                margin-bottom: 10px;
                border-bottom: 1px dashed #000;
                padding-bottom: 5px;
            }
            .separator {
                border-top: 1px dashed #000;
                margin: 5px 0;
            }
            strong { font-weight: bold; }
            p { margin: 0; }
            .info-grid { display: grid; grid-template-columns: 1fr 1fr; }
            .items-section { text-align: left; }
            .item { display: flex; justify-content: space-between; align-items: flex-start; }
            .produto { font-size: 15px; font-weight: bold; }
            .produto-quantidade { font-size: 17px; font-weight: bold; margin-right: 4px; }
            .complementos { margin-top: 4px; }
            .complemento { margin-left: 8px; display: block; }
            .obs, .obs-geral-section p { margin-left: 8px; font-style: italic; }
            .total-section div { display: flex; justify-content: space-between; }
            .total-bold { font-weight: bold; font-size: 15px; }
            .status-pagamento {
              background-color: #000000 !important;
              color: #FFFFFF !important;
              font-weight: 800 !important;
              text-transform: uppercase;
              text-align: center;
              padding: 6px 0;
              margin-top: 6px;
              font-size: 19px;
            }
        </style>
    `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    toast({
      title: 'Erro de Impressão',
      description:
        'Não foi possível abrir a janela de impressão. Verifique se o seu navegador está bloqueando pop-ups.',
      variant: 'destructive',
    });
    return;
  }

  printWindow.document.write(`
      <html>
        <head>
          <title>Pedido #${pedido.id}</title>
          ${printStyles}
        </head>
        <body>
          ${fullHtml}
        </body>
      </html>
    `);

  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };
};

function PedidoDetalheDialog({ pedidoId, open, onOpenChange, onIniciarEdicao, onPedidoDeletado }) {
  const { toast } = useToast();
  const { temPermissao } = useAuth();
  const printableAreaRef = useRef(null);

  const [pedido, setPedido] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [statusPagamento, setStatusPagamento] = useState('');
  const [statusEntrega, setStatusEntrega] = useState('');

  const [confirmarExclusaoAberto, setConfirmarExclusaoAberto] = useState(false);

  const carregarPedido = useCallback(async () => {
    if (!pedidoId) return;
    setLoading(true);
    try {
      const dados = await obterPedidoCompleto(pedidoId);
      setPedido(dados);
      setStatusPagamento(dados.status_pagamento || 'Não Pago');
      setStatusEntrega(dados.status_entrega || 'Não Entregue');
    } catch (error) {
      toast({
        title: 'Erro ao carregar pedido',
        description: error.message,
        variant: 'destructive',
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }, [pedidoId, toast, onOpenChange]);

  useEffect(() => {
    if (open) {
      carregarPedido();
    }
  }, [open, carregarPedido]);

  const handleSalvarStatus = async () => {
    setSaving(true);
    try {
      await atualizarPedido(pedidoId, {
        status_pagamento: statusPagamento,
        status_entrega: statusEntrega,
      });
      toast({ title: 'Status atualizado com sucesso!' });
      onOpenChange(false);
    } catch (error) {
      toast({ title: 'Erro ao salvar status', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleExcluirPedido = async () => {
    setDeleting(true);
    try {
      await deletarPedido(pedidoId);
      toast({ title: 'Pedido excluído com sucesso!', variant: 'success' });
      setConfirmarExclusaoAberto(false);
      onPedidoDeletado();
    } catch (error) {
      toast({
        title: 'Erro ao excluir pedido',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const podeEditar = temPermissao('pedidos', 'editar');
  const podeExcluir = temPermissao('pedidos', 'gerenciar');

  const handleEditarClick = () => {
    if (!pedido) return;
    onIniciarEdicao(pedido);
  };

  const handleImprimir = () => {
    imprimirPedido(pedido, toast);
  };

  const handleCopiarMensagem = async () => {
    if (!pedido) return;

    const { cliente, itens, endereco_entrega } = pedido;
    const dataEntregaFormatada = new Date(pedido.data_entrega + 'T00:00:00').toLocaleDateString(
      'pt-BR'
    );
    const horaEntregaFormatada = formatarHora(pedido.hora_entrega);

    let message = `*Confirmação de Pedido*\n\n`;
    message += `Olá ${cliente.nome},\n`;
    message += `Seu pedido está confirmado para o dia ${dataEntregaFormatada} às ${horaEntregaFormatada}.\n\n`;

    message += `*Itens do Pedido:*\n`;
    itens.forEach((item) => {
      message += `- ${item.quantidade}x ${item.produtos.nome} (R$ ${(item.valor_unitario * item.quantidade).toFixed(2).replace('.', ',')})\n`;
      if (Array.isArray(item.complementos) && item.complementos.length > 0) {
        item.complementos.forEach((c) => {
          message += `  - ${c.grupo_nome}: ${c.nome} ${c.preco_adicional > 0 ? `(+R$ ${c.preco_adicional.toFixed(2).replace('.', ',')})` : ''}\n`;
        });
      }
      if (item.observacao) {
        message += `  Obs: ${item.observacao}\n`;
      }
    });
    message += `\n`;
    if (pedido.tipo_entrega === 'entrega' && endereco_entrega) {
      message += `*Endereço de Entrega:*\n`;
      message += `${formatarEndereco(endereco_entrega)}, ${endereco_entrega.cidade} - ${endereco_entrega.estado}, ${endereco_entrega.cep}\n\n`;
    } else {
      message += `*Tipo de Entrega:* Retirada\n\n`;
    }

    message += `*Valores:*\n`;
    message += `Subtotal: R$ ${Number(pedido.subtotal).toFixed(2).replace('.', ',')}\n`;
    if (pedido.frete > 0) {
      message += `Frete: R$ ${Number(pedido.frete).toFixed(2).replace('.', ',')}\n`;
    }
    if (pedido.desconto > 0) {
      message += `Desconto: - R$ ${Number(pedido.desconto).toFixed(2).replace('.', ',')}\n`;
    }
    message += `*Total: R$ ${Number(pedido.total).toFixed(2).replace('.', ',')}*\n\n`;
    message += `Status de Pagamento: *${pedido.status_pagamento}*\n`;
    message += `Agradecemos a preferência!`;

    try {
      await navigator.clipboard.writeText(message);
      toast({ title: 'Mensagem copiada!', description: 'Cole no WhatsApp do cliente.' });
    } catch (err) {
      console.error('Falha ao copiar mensagem: ', err);
      toast({
        title: 'Erro ao copiar mensagem',
        description: 'Por favor, copie manualmente.',
        variant: 'destructive',
      });
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex h-96 w-full items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      );
    }

    if (!pedido) {
      return <div className="text-center py-10">Pedido não encontrado.</div>;
    }

    const { cliente, itens, endereco_entrega } = pedido;

    return (
      <>
        <div ref={printableAreaRef}>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
              <h4 className="font-semibold text-gray-700">Informações do Cliente</h4>
              <InfoLine label="Nome" value={cliente.nome} />
              <InfoLine label="Telefone" value={maskCelular(cliente.celular)} />
              <InfoLine label="Email" value={cliente.email} />
            </div>

            {pedido.tipo_entrega === 'entrega' && endereco_entrega && (
              <div className="border rounded-lg p-4 space-y-3 bg-gray-50">
                <h4 className="font-semibold text-gray-700">Endereço de Entrega</h4>
                <InfoLine label="Endereço" value={formatarEndereco(endereco_entrega)} />
                <InfoLine
                  label="Cidade/UF"
                  value={`${endereco_entrega.cidade} - ${endereco_entrega.estado}`}
                />
                <InfoLine label="CEP" value={endereco_entrega.cep} />
              </div>
            )}

            <div className="border rounded-lg p-4 space-y-3 bg-gray-50 md:col-span-2">
              <h4 className="font-semibold text-gray-700">Informações do Pedido</h4>
              <div className="grid grid-cols-3 gap-4">
                <InfoLine
                  label="Data/Hora Entrega"
                  value={`${new Date(pedido.data_entrega + 'T00:00:00').toLocaleDateString('pt-BR')} às ${formatarHora(pedido.hora_entrega)}`}
                />
                <InfoLine
                  label="Tipo de Pedido"
                  value={capitalizeFirstLetter(pedido.tipo_entrega)}
                />
                <InfoLine label="Criado por" value={pedido.criado_por} />
              </div>
            </div>
          </div>

          {pedido.tags && pedido.tags.length > 0 && (
            <div className="mt-6 border rounded-lg p-4 bg-white">
              <h4 className="font-semibold text-gray-700 mb-3">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {pedido.tags.map((tag) => (
                  <TagChip key={tag.id} nome={tag.nome} cor={tag.cor} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border rounded-lg p-4 bg-white">
            <h4 className="font-semibold text-gray-700 mb-3">Itens do Pedido</h4>
            <div className="space-y-3">
              {itens.map((item) => (
                <div key={item.id} className="text-sm pb-2 border-b last:border-b-0">
                  <div className="flex justify-between font-medium">
                    <span>
                      {item.quantidade}x {item.produtos.nome}
                    </span>
                    <span>
                      R$ {(item.valor_unitario * item.quantidade).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  {Array.isArray(item.complementos) && item.complementos.length > 0 && (
                    <div className="pl-4 mt-1 text-xs text-gray-500">
                      {item.complementos.map((c, i) => (
                        <p key={i} className="leading-snug">
                          <span className="font-semibold">{c.grupo_nome || 'Complemento'}:</span>{' '}
                          {c.nome}{' '}
                          {c.preco_adicional > 0
                            ? `(+R$ ${c.preco_adicional.toFixed(2).replace('.', ',')})`
                            : ''}
                        </p>
                      ))}
                    </div>
                  )}
                  {item.observacao && (
                    <p className="text-xs text-gray-400 pl-4 mt-1">Obs: {item.observacao}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {pedido.observacao_geral && (
            <div className="mt-6 border rounded-lg p-4 bg-yellow-50">
              <h4 className="font-semibold text-gray-700 mb-2">Observação Geral do Pedido</h4>
              <p className="text-sm text-gray-600">{pedido.observacao_geral}</p>
            </div>
          )}

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div></div>
            <div className="bg-orange-50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R$ {Number(pedido.subtotal).toFixed(2).replace('.', ',')}</span>
              </div>
              {pedido.frete > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Frete</span>
                  <span>R$ {Number(pedido.frete).toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              {pedido.desconto > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Desconto</span>
                  <span>- R$ {Number(pedido.desconto).toFixed(2).replace('.', ',')}</span>
                </div>
              )}
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-orange-600">
                  R$ {Number(pedido.total).toFixed(2).replace('.', ',')}
                </span>
              </div>
            </div>
          </div>

          {podeEditar && (
            <div className="mt-8 border-t pt-6 space-y-4">
              <h4 className="font-semibold text-gray-700">Atualizar Status</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <Label>Status do Pagamento</Label>
                  <Select value={statusPagamento} onValueChange={setStatusPagamento}>
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
                  <Select value={statusEntrega} onValueChange={setStatusEntrega}>
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
            </div>
          )}

          <div className="flex justify-between items-center gap-4 pt-8 mt-4 border-t">
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleImprimir} className="flex-1 sm:flex-none">
                <Printer className="h-4 w-4 mr-2" /> Imprimir
              </Button>
              <Button
                variant="outline"
                onClick={handleCopiarMensagem}
                className="flex items-center justify-center p-2"
                title="Copiar mensagem para WhatsApp"
              >
                <MessageCircle className="h-4 w-4 text-green-500" />
              </Button>
              {podeEditar && (
                <Button
                  variant="outline"
                  onClick={handleEditarClick}
                  className="flex-1 sm:flex-none"
                >
                  <Edit className="h-4 w-4 mr-2" /> Editar Pedido
                </Button>
              )}
              {podeExcluir && (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmarExclusaoAberto(true)}
                  className="flex-1 sm:flex-none"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Excluir Pedido
                </Button>
              )}
            </div>
            {podeEditar && (
              <Button
                onClick={handleSalvarStatus}
                disabled={saving}
                className="flex-1 bg-orange-500 hover:bg-orange-600 max-w-xs ml-auto"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Status'}
              </Button>
            )}
          </div>
        </div>

        <AlertDialog open={confirmarExclusaoAberto} onOpenChange={setConfirmarExclusaoAberto}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza que deseja excluir este pedido?</AlertDialogTitle>
              <AlertDialogDescription>
                Essa ação não pode ser desfeita. O pedido #{pedidoId} será permanentemente removido
                do sistema.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleExcluirPedido}
                disabled={deleting}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    );
  };

  return (
    <>
      <Helmet>
        <title>{loading ? 'Carregando...' : `Pedido #${pedido?.id}`} - Gestor de Pedidos</title>
      </Helmet>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!deleting) onOpenChange(isOpen);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido #{pedidoId}</DialogTitle>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PedidoDetalheDialog;
