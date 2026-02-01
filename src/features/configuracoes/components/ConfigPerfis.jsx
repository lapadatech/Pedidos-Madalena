import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, ShieldCheck, ShieldOff, Shield } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { UppercaseInput } from '@/shared/ui/UppercaseInput';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { Checkbox } from '@/shared/ui/checkbox';
import { useToast } from '@/shared/ui/use-toast';
import {
  listarPerfis,
  criarPerfil,
  atualizarPerfil,
  deletarPerfil,
} from '@/features/configuracoes/services/configuracoesApi';

const modulosPermissao = [
  { id: 'dashboard', nome: 'Dashboard' },
  { id: 'orders', nome: 'Pedidos' },
  { id: 'customers', nome: 'Clientes' },
  { id: 'products', nome: 'Produtos' },
  { id: 'settings', nome: 'Configuracoes' },
];

const acoesPermissaoBase = [
  { id: 'read', nome: 'Ler' },
  { id: 'create', nome: 'Criar' },
  { id: 'update', nome: 'Editar' },
  { id: 'delete', nome: 'Excluir' },
];

const acoesExtrasPorModulo = {
  orders: [
    { id: 'status', nome: 'Status' },
    { id: 'print', nome: 'Imprimir' },
  ],
};

const MODULE_ALIASES = {
  pedidos: 'orders',
  clientes: 'customers',
  produtos: 'products',
  configuracoes: 'settings',
};

const normalizePermissoes = (raw = {}) => {
  const result = {};
  modulosPermissao.forEach((modulo) => {
    result[modulo.id] = {
      read: false,
      create: false,
      update: false,
      delete: false,
      status: false,
      print: false,
    };
  });

  Object.entries(raw || {}).forEach(([modulo, value]) => {
    const mappedModule = MODULE_ALIASES[modulo] || modulo;
    if (!result[mappedModule]) return;

    if (value === '*') {
      result[mappedModule] = {
        read: true,
        create: true,
        update: true,
        delete: true,
        status: true,
        print: true,
      };
      return;
    }

    if (value && typeof value === 'object') {
      const hasLegacy =
        'visualizar' in value || 'editar' in value || 'gerenciar' in value || 'excluir' in value;
      if (hasLegacy) {
        const visualizar = !!value.visualizar || !!value.editar || !!value.gerenciar;
        const editar = !!value.editar || !!value.gerenciar;
        const gerenciar = !!value.gerenciar || !!value.excluir;
        result[mappedModule] = {
          read: visualizar,
          create: editar,
          update: editar,
          delete: gerenciar,
          status: editar,
          print: visualizar,
        };
        return;
      }

      result[mappedModule] = {
        read: !!value.read,
        create: !!value.create,
        update: !!value.update,
        delete: !!value.delete,
        status: !!value.status,
        print: !!value.print,
      };
    }
  });

  return result;
};

const permissoesVazias = normalizePermissoes();
const perfisFallback = [
  {
    id: 'gerente',
    nome: 'Gerente',
    permissoes: {
      dashboard: { read: true },
      orders: { read: true, create: true, update: true, delete: true, status: true, print: true },
      customers: { read: true, create: true, update: true, delete: true },
      products: { read: true, create: true, update: true, delete: true },
      settings: { read: true, update: true },
    },
  },
  {
    id: 'atendente',
    nome: 'Atendente',
    permissoes: {
      dashboard: { read: true },
      orders: {
        read: true,
        create: true,
        update: true,
        delete: false,
        status: true,
        print: false,
      },
      customers: { read: true, create: true, update: true, delete: false },
      products: { read: true, create: false, update: false, delete: false },
    },
  },
];

function ConfigPerfis() {
  const [perfis, setPerfis] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [perfilSelecionado, setPerfilSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    permissoes: permissoesVazias,
  });
  const { toast } = useToast();

  const carregarPerfis = useCallback(async () => {
    try {
      const data = await listarPerfis();
      const origem = (data && data.length > 0 ? data : perfisFallback) || perfisFallback;
      const normalizados = origem.map((p) => ({
        ...p,
        permissoes: normalizePermissoes(p.permissoes),
      }));
      setPerfis(normalizados);
      if (!data || data.length === 0) {
        toast({
          title: 'Perfis padroes carregados',
          description: 'Nenhum perfil retornado do banco. Usando atendente/gerente padrao.',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao carregar perfis',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    carregarPerfis();
  }, [carregarPerfis]);

  const handlePermissaoChange = (modulo, acao, checked) => {
    setFormData((prev) => {
      const newPermissoes = { ...prev.permissoes };
      if (!newPermissoes[modulo]) {
        newPermissoes[modulo] = {
          read: false,
          create: false,
          update: false,
          delete: false,
          status: false,
          print: false,
        };
      }
      newPermissoes[modulo][acao] = !!checked;

      if ((acao === 'status' || acao === 'print') && checked) {
        newPermissoes[modulo].read = true;
      }
      if (acao === 'delete' && checked) {
        newPermissoes[modulo].update = true;
        newPermissoes[modulo].create = true;
        newPermissoes[modulo].read = true;
      }
      if (acao === 'update' && checked) {
        newPermissoes[modulo].create = true;
        newPermissoes[modulo].read = true;
      }
      if (acao === 'create' && checked) {
        newPermissoes[modulo].read = true;
      }
      if (acao === 'read' && !checked) {
        newPermissoes[modulo].create = false;
        newPermissoes[modulo].update = false;
        newPermissoes[modulo].delete = false;
        newPermissoes[modulo].status = false;
        newPermissoes[modulo].print = false;
      }
      if (acao === 'create' && !checked) {
        newPermissoes[modulo].update = false;
        newPermissoes[modulo].delete = false;
      }
      if (acao === 'update' && !checked) {
        newPermissoes[modulo].delete = false;
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
        toast({ title: 'Perfil atualizado!' });
      } else {
        await criarPerfil(formData);
        toast({ title: 'Perfil criado!' });
      }
      await carregarPerfis();
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  const handleEditar = (perfil) => {
    setPerfilSelecionado(perfil);
    setFormData({
      nome: perfil.nome,
      permissoes: normalizePermissoes(perfil.permissoes),
    });
    setDialogAberto(true);
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Deseja realmente excluir este perfil?')) {
      try {
        await deletarPerfil(id);
        toast({ title: 'Perfil excluído!' });
        await carregarPerfis();
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não é possível excluir um perfil que está em uso.',
          variant: 'destructive',
        });
      }
    }
  };

  const resetForm = () => {
    setFormData({ nome: '', permissoes: permissoesVazias });
    setPerfilSelecionado(null);
  };

  const getPermissaoStatus = (permissoes, modulo) => {
    if (!permissoes || !permissoes[modulo]) {
      return { icon: ShieldOff, text: 'Sem acesso', color: 'text-gray-400' };
    }

    if (permissoes[modulo].delete) {
      return { icon: ShieldCheck, text: 'Excluir', color: 'text-red-600' };
    }
    if (permissoes[modulo].update) {
      return { icon: ShieldCheck, text: 'Editar', color: 'text-green-600' };
    }
    if (permissoes[modulo].read) {
      return { icon: Shield, text: 'Ler', color: 'text-blue-500' };
    }

    return { icon: ShieldOff, text: 'Sem acesso', color: 'text-gray-400' };
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Perfis e Permissões</h3>
        <Dialog
          open={dialogAberto}
          onOpenChange={(open) => {
            setDialogAberto(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              disabled
              title="Criação de novos perfis não suportada; use atendente/gerente."
            >
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
                  {modulosPermissao.map((modulo) => (
                    <div key={modulo.id}>
                      <p className="font-medium text-sm mb-2">{modulo.nome}</p>
                      <div className="flex items-center gap-6">
                        {(acoesExtrasPorModulo[modulo.id]
                          ? [...acoesPermissaoBase, ...acoesExtrasPorModulo[modulo.id]]
                          : acoesPermissaoBase
                        ).map((acao) => (
                          <div key={acao.id} className="flex items-center gap-2">
                            <Checkbox
                              id={`${modulo.id}-${acao.id}`}
                              checked={!!formData.permissoes[modulo.id]?.[acao.id]}
                              onCheckedChange={(checked) =>
                                handlePermissaoChange(modulo.id, acao.id, checked)
                              }
                              disabled={
                                (acao.id === 'read' &&
                                  (formData.permissoes[modulo.id]?.create ||
                                    formData.permissoes[modulo.id]?.update ||
                                    formData.permissoes[modulo.id]?.delete)) ||
                                (acao.id === 'create' &&
                                  (formData.permissoes[modulo.id]?.update ||
                                    formData.permissoes[modulo.id]?.delete)) ||
                                (acao.id === 'update' && formData.permissoes[modulo.id]?.delete)
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
                Nome do Perfil
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Permissões
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {perfis.map((perfil) => (
              <tr key={perfil.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{perfil.nome}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  <div className="flex flex-wrap gap-2">
                    {modulosPermissao.map((m) => {
                      const status = getPermissaoStatus(perfil.permissoes, m.id);
                      if (status.text === 'Sem acesso') return null;

                      const StatusIcon = status.icon;
                      return (
                        <span
                          key={m.id}
                          className="flex items-center gap-1.5 text-xs bg-gray-100 px-2 py-1 rounded-full"
                        >
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
