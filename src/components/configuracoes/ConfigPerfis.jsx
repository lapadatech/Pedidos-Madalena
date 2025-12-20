import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, ShieldCheck, ShieldOff, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UppercaseInput } from '@/components/ui/UppercaseInput';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/components/ui/use-toast';
import { listarPerfis, criarPerfil, atualizarPerfil, deletarPerfil } from '@/lib/api';

const modulosPermissao = [
  { id: 'dashboard', nome: 'Dashboard' },
  { id: 'clientes', nome: 'Clientes' },
  { id: 'produtos', nome: 'Produtos' },
  { id: 'pedidos', nome: 'Pedidos' },
  { id: 'configuracoes', nome: 'Configurações' },
];

const acoesPermissao = [
  { id: 'visualizar', nome: 'Visualizar' },
  { id: 'editar', nome: 'Criar/Editar' },
  { id: 'gerenciar', nome: 'Gerenciar' }, // Gerenciar inclui 'excluir'
];

function ConfigPerfis() {
  const [perfis, setPerfis] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    permissoes: {}
  });
  const { toast } = useToast();

  useEffect(() => {
    carregarPerfis();
  }, []);

  const carregarPerfis = async () => {
    try {
      const data = await listarPerfis();
      setPerfis(data);
    } catch (error) {
      toast({ title: "Erro ao carregar perfis", description: error.message, variant: 'destructive' });
    }
  };

  const handlePermissaoChange = (modulo, acao, checked) => {
    setFormData(prev => {
      const newPermissoes = { ...prev.permissoes };
      if (!newPermissoes[modulo]) {
        newPermissoes[modulo] = {};
      }
      newPermissoes[modulo][acao] = checked;

      // Se 'gerenciar' for marcado, marcar 'editar' e 'visualizar'
      if (acao === 'gerenciar' && checked) {
        newPermissoes[modulo]['editar'] = true;
        newPermissoes[modulo]['visualizar'] = true;
      }
      // Se 'editar' for marcado, marcar 'visualizar'
      if (acao === 'editar' && checked) {
        newPermissoes[modulo]['visualizar'] = true;
      }
      // Se 'visualizar' for desmarcado, desmarcar 'editar' e 'gerenciar'
      if (acao === 'visualizar' && !checked) {
        newPermissoes[modulo]['editar'] = false;
        newPermissoes[modulo]['gerenciar'] = false;
      }
      // Se 'editar' for desmarcado, desmarcar 'gerenciar'
      if (acao === 'editar' && !checked) {
        newPermissoes[modulo]['gerenciar'] = false;
      }

      return { ...prev, permissoes: newPermissoes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    try {
      if (perfilSelecionado) {
        await atualizarPerfil(perfilSelecionado.id, formData);
        toast({ title: "Perfil atualizado!" });
      } else {
        await criarPerfil(formData);
        toast({ title: "Perfil criado!" });
      }
      await carregarPerfis();
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  const handleEditar = (perfil) => {
    setPerfilSelecionado(perfil);
    setFormData({
      nome: perfil.nome,
      permissoes: perfil.permissoes || {}
    });
    setDialogAberto(true);
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Deseja realmente excluir este perfil?')) {
      try {
        await deletarPerfil(id);
        toast({ title: "Perfil excluído!" });
        await carregarPerfis();
      } catch (error) {
        toast({ title: "Erro ao excluir", description: "Não é possível excluir um perfil que está em uso.", variant: 'destructive' });
      }
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', permissoes: {} });
    setPerfilSelecionado(null);
  };
  
  const getPermissaoStatus = (permissoes, modulo) => {
    if (!permissoes || !permissoes[modulo]) return { icon: ShieldOff, text: 'Sem acesso', color: 'text-gray-400' };

    if (permissoes[modulo].gerenciar) return { icon: ShieldCheck, text: 'Gerenciar', color: 'text-red-600' };
    if (permissoes[modulo].editar) return { icon: ShieldCheck, text: 'Editar', color: 'text-green-600' };
    if (permissoes[modulo].visualizar) return { icon: Shield, text: 'Visualizar', color: 'text-blue-500' };
    
    return { icon: ShieldOff, text: 'Sem acesso', color: 'text-gray-400' };
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Perfis e Permissões</h3>
        <Dialog open={dialogAberto} onOpenChange={(open) => {
          setDialogAberto(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Novo Perfil
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{perfilSelecionado ? 'Editar Perfil' : 'Novo Perfil'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label htmlFor="nome">Nome do Perfil *</Label>
                <UppercaseInput
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>Permissões</Label>
                <div className="space-y-4 mt-2 p-4 border rounded-lg">
                  {modulosPermissao.map(modulo => (
                    <div key={modulo.id}>
                      <p className="font-medium text-sm mb-2">{modulo.nome}</p>
                      <div className="flex items-center gap-6">
                        {acoesPermissao.map(acao => (
                          <div key={acao.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`${modulo.id}-${acao.id}`}
                              checked={!!formData.permissoes[modulo.id]?.[acao.id]}
                              onCheckedChange={(checked) => handlePermissaoChange(modulo.id, acao.id, checked)}
                              disabled={
                                (acao.id === 'visualizar' && (formData.permissoes[modulo.id]?.editar || formData.permissoes[modulo.id]?.gerenciar)) ||
                                (acao.id === 'editar' && formData.permissoes[modulo.id]?.gerenciar)
                              }
                            />
                            <Label htmlFor={`${modulo.id}-${acao.id}`}>{acao.nome}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={carregando} className="flex-1 bg-orange-500 hover:bg-orange-600">
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome do Perfil</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Permissões</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {perfis.map((perfil) => (
              <tr key={perfil.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{perfil.nome}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-2">
                    {modulosPermissao.map(m => {
                       const status = getPermissaoStatus(perfil.permissoes, m.id);
                       if (status.text === 'Sem acesso') return null;
                       
                       const StatusIcon = status.icon;
                       return (
                          <span key={m.id} className="flex items-center gap-1.5 text-xs bg-gray-100 px-2 py-1 rounded-full">
                            <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                            {m.nome}: {status.text}
                          </span>
                       );
                    })}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEditar(perfil)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDeletar(perfil.id)}>
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

export default ConfigPerfis;