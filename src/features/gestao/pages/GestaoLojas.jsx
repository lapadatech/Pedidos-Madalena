import React, { useCallback, useEffect, useState } from 'react';
import { Check, Edit, Loader2, Plus } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { useToast } from '@/shared/ui/use-toast';
import { criarLoja, listarLojas, atualizarLoja } from '@/features/gestao/services/gestaoApi';

const slugify = (value) => {
  return (value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

function GestaoLojas() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [lojas, setLojas] = useState([]);
  const [lojaForm, setLojaForm] = useState({ nome: '', slug: '', ativo: true });
  const [lojaSelecionada, setLojaSelecionada] = useState(null);
  const [salvandoLoja, setSalvandoLoja] = useState(false);
  const [dialogLojaAberto, setDialogLojaAberto] = useState(false);

  const carregarLojas = useCallback(async () => {
    setLoading(true);
    try {
      const lojasData = await listarLojas();
      setLojas(lojasData || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar lojas',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarLojas();
  }, [carregarLojas]);

  const resetLojaForm = () => {
    setLojaForm({ nome: '', slug: '', ativo: true });
    setLojaSelecionada(null);
  };

  const handleNovaLoja = () => {
    resetLojaForm();
    setDialogLojaAberto(true);
  };

  const handleEditarLoja = (loja) => {
    setLojaSelecionada(loja);
    setLojaForm({
      nome: loja.nome || '',
      slug: loja.slug || '',
      ativo: loja.ativo !== false,
    });
    setDialogLojaAberto(true);
  };

  const handleSalvarLoja = async (e) => {
    e.preventDefault();
    if (!lojaForm.nome || !lojaForm.slug) {
      toast({
        title: 'Dados obrigatorios',
        description: 'Informe nome e slug da loja.',
        variant: 'destructive',
      });
      return;
    }

    setSalvandoLoja(true);
    try {
      if (lojaSelecionada) {
        await atualizarLoja(lojaSelecionada.id, lojaForm);
        toast({ title: 'Loja atualizada com sucesso.' });
      } else {
        await criarLoja(lojaForm);
        toast({ title: 'Loja criada com sucesso.' });
      }
      await carregarLojas();
      resetLojaForm();
      setDialogLojaAberto(false);
    } catch (error) {
      toast({
        title: 'Erro ao salvar loja',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSalvandoLoja(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lojas</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie as lojas do sistema.</p>
        </div>
        <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleNovaLoja}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Loja
        </Button>
      </div>

      <Dialog
        open={dialogLojaAberto}
        onOpenChange={(open) => {
          setDialogLojaAberto(open);
          if (!open) resetLojaForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{lojaSelecionada ? 'Editar Loja' : 'Nova Loja'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSalvarLoja} className="space-y-4">
            <div>
              <Label htmlFor="nome-loja">Nome</Label>
              <Input
                id="nome-loja"
                value={lojaForm.nome}
                onChange={(e) => setLojaForm({ ...lojaForm, nome: e.target.value })}
                placeholder="Ex: Loja Centro"
                required
              />
            </div>
            <div>
              <Label htmlFor="slug-loja">Slug</Label>
              <Input
                id="slug-loja"
                value={lojaForm.slug}
                onChange={(e) => setLojaForm({ ...lojaForm, slug: slugify(e.target.value) })}
                placeholder="ex: loja-centro"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Usado na URL: /seu-slug/dashboard</p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setDialogLojaAberto(false)}
                disabled={salvandoLoja}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                disabled={salvandoLoja}
              >
                {salvandoLoja ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {lojaSelecionada ? 'Salvar alteracoes' : 'Criar loja'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <div className="bg-white rounded-lg shadow">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <tbody className="bg-white divide-y divide-gray-200">
                {lojas.map((loja) => (
                  <tr key={loja.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{loja.nome}</div>
                      <div className="text-xs text-gray-500">{loja.slug}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <div className="flex items-center justify-end gap-3">
                        {loja.ativo ? (
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <Check className="h-3 w-3" /> Ativa
                          </span>
                        ) : (
                          <span className="text-xs text-red-500">Inativa</span>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleEditarLoja(loja)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {lojas.length === 0 && (
                  <tr>
                    <td colSpan="2" className="text-center py-10 text-gray-500">
                      Nenhuma loja cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default GestaoLojas;
