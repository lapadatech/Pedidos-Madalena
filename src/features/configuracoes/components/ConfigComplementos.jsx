import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { UppercaseInput } from '@/shared/ui/UppercaseInput';
import { Label } from '@/shared/ui/label';
import { Switch } from '@/shared/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { useToast } from '@/shared/ui/use-toast';
import {
  listarGruposComplementos,
  criarGrupoComplemento,
  atualizarGrupoComplemento,
  deletarGrupoComplemento,
} from '@/features/produtos/services/produtosApi';

const formatCurrency = (value) => {
  if (typeof value !== 'number') return 'R$ 0,00';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

function ConfigComplementos() {
  const [grupos, setGrupos] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [grupoSelecionado, setGrupoSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    obrigatorio: false,
    opcoes: [{ nome: '', preco_adicional: 0 }],
  });
  const { toast } = useToast();

  const carregarGrupos = useCallback(async () => {
    try {
      const data = await listarGruposComplementos();
      setGrupos(data);
    } catch (error) {
      toast({
        title: 'Erro ao carregar grupos',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    carregarGrupos();
  }, [carregarGrupos]);

  const handleOpcaoChange = (index, field, value) => {
    const novasOpcoes = [...formData.opcoes];
    if (field === 'preco_adicional') {
      const parsedValue = parseFloat(value);
      novasOpcoes[index][field] = isNaN(parsedValue) ? 0 : parsedValue;
    } else {
      novasOpcoes[index][field] = value;
    }
    setFormData({ ...formData, opcoes: novasOpcoes });
  };

  const adicionarOpcao = () => {
    setFormData({ ...formData, opcoes: [...formData.opcoes, { nome: '', preco_adicional: 0 }] });
  };

  const removerOpcao = (index) => {
    const novasOpcoes = formData.opcoes.filter((_, i) => i !== index);
    setFormData({ ...formData, opcoes: novasOpcoes });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      const dataToSave = {
        ...formData,
        opcoes: formData.opcoes.filter((op) => op.nome.trim() !== ''),
      };

      if (grupoSelecionado) {
        await atualizarGrupoComplemento(grupoSelecionado.id, dataToSave);
        toast({ title: 'Grupo atualizado!' });
      } else {
        await criarGrupoComplemento(dataToSave);
        toast({ title: 'Grupo criado!' });
      }
      await carregarGrupos();
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', obrigatorio: false, opcoes: [{ nome: '', preco_adicional: 0 }] });
    setGrupoSelecionado(null);
  };

  const handleNovo = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleEditar = (grupo) => {
    setGrupoSelecionado(grupo);
    setFormData({
      nome: grupo.nome,
      obrigatorio: grupo.obrigatorio || false,
      opcoes:
        grupo.opcoes && grupo.opcoes.length > 0 ? grupo.opcoes : [{ nome: '', preco_adicional: 0 }],
    });
    setDialogAberto(true);
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Deseja realmente excluir este grupo?')) {
      try {
        await deletarGrupoComplemento(id);
        toast({ title: 'Grupo excluído!' });
        await carregarGrupos();
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Verifique se o grupo não está associado a um produto.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Grupos de Complementos</h3>
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={handleNovo}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Grupo
        </Button>
        <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{grupoSelecionado ? 'Editar Grupo' : 'Novo Grupo'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome">Nome do Grupo *</Label>
                  <UppercaseInput
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="obrigatorio"
                      checked={formData.obrigatorio}
                      onCheckedChange={(checked) =>
                        setFormData({ ...formData, obrigatorio: checked })
                      }
                    />
                    <Label htmlFor="obrigatorio">Obrigatório</Label>
                  </div>
                </div>
              </div>
              <div>
                <Label>Opções do Grupo</Label>
                <div className="space-y-3 mt-2">
                  {formData.opcoes.map((opcao, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <UppercaseInput
                        placeholder="Nome da opção"
                        value={opcao.nome}
                        onChange={(e) => handleOpcaoChange(index, 'nome', e.target.value)}
                      />
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Preço Adicional"
                        value={opcao.preco_adicional}
                        onChange={(e) =>
                          handleOpcaoChange(index, 'preco_adicional', e.target.value)
                        }
                        className="w-40"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removerOpcao(index)}
                        disabled={formData.opcoes.length <= 1}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={adicionarOpcao}>
                    <Plus className="h-4 w-4 mr-2" /> Adicionar Opção
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogAberto(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {carregando ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Nome do Grupo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Opções
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                Obrigatório
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {grupos.map((grupo) => (
              <tr key={grupo.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{grupo.nome}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-1">
                    {grupo.opcoes?.map((opt, i) => (
                      <span key={i} className="text-xs bg-gray-100 px-2 py-1 rounded-full">
                        {opt.nome} ({formatCurrency(opt.preco_adicional)})
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-center text-sm">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${grupo.obrigatorio ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                  >
                    {grupo.obrigatorio ? 'Sim' : 'Não'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditar(grupo)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletar(grupo.id)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ConfigComplementos;
