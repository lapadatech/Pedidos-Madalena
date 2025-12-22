import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { UppercaseInput } from '@/shared/ui/UppercaseInput';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Checkbox } from '@/shared/ui/checkbox';
import { useToast } from '@/shared/ui/use-toast';
import {
  listarUsuarios,
  listarPerfis,
  vincularUsuarioLoja,
  deletarUsuario,
  criarUsuario,
} from '@/features/configuracoes/services/configuracoesApi';
import {
  listarLojas,
  listarUsuariosLojas,
  removerUsuarioLoja,
} from '@/features/gestao/services/gestaoApi';
import { Eye, EyeOff } from 'lucide-react';

function GestaoUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [lojas, setLojas] = useState([]);
  const [vinculos, setVinculos] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [alertAberto, setAlertAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [lojasSelecionadas, setLojasSelecionadas] = useState([]);
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    perfil_id: 'atendente',
  });
  const { toast } = useToast();

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    try {
      const [usuariosData, perfisData, lojasData, vinculosData] = await Promise.all([
        listarUsuarios(),
        listarPerfis(),
        listarLojas(),
        listarUsuariosLojas(),
      ]);
      setUsuarios(usuariosData || []);
      setPerfis(perfisData || []);
      setLojas(lojasData || []);
      setVinculos(vinculosData || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar dados',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const perfisDisponiveis = useMemo(() => {
    if (perfis?.length) return perfis;
    // Fallback para evitar Select sem opcoes (Radix pode falhar se value nao existir).
    return [
      { id: 'gerente', nome: 'Gerente' },
      { id: 'atendente', nome: 'Atendente' },
    ];
  }, [perfis]);

  useEffect(() => {
    if (!perfisDisponiveis.find((p) => p.id === formData.perfil_id)) {
      setFormData((prev) => ({
        ...prev,
        perfil_id: perfisDisponiveis[0]?.id || 'atendente',
      }));
    }
  }, [perfisDisponiveis, formData.perfil_id]);

  const lojasOptions = useMemo(
    () => lojas.map((loja) => ({ value: loja.id, label: `${loja.nome} (${loja.slug})` })),
    [lojas]
  );

  const vinculosPorUsuario = useMemo(() => {
    const map = new Map();
    vinculos.forEach((v) => {
      if (!map.has(v.user_id)) map.set(v.user_id, []);
      map.get(v.user_id).push(v);
    });
    return map;
  }, [vinculos]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.perfil_id) {
      toast({ title: 'Selecione um perfil', variant: 'destructive' });
      return;
    }
    if (lojasSelecionadas.length === 0) {
      toast({ title: 'Selecione pelo menos uma loja', variant: 'destructive' });
      return;
    }
    setCarregando(true);

    try {
      let userId = usuarioSelecionado?.id;

      if (!userId) {
        const novo = await criarUsuario({
          nome: formData.nome,
          email: formData.email,
          password: formData.password,
          perfil_id: formData.perfil_id || 'atendente',
          loja_ids: lojasSelecionadas,
        });
        userId = novo?.user_id;
        if (!userId) throw new Error('Não foi possível obter o id do usuário criado.');
      }

      const existentes = vinculosPorUsuario.get(userId) || [];
      const selecionadasIds = new Set(lojasSelecionadas);
      const toRemove = existentes.filter((v) => !selecionadasIds.has(v.loja_id));

      await Promise.all(
        lojasSelecionadas.map((lojaId) =>
          vincularUsuarioLoja({
            user_id: userId,
            loja_id: lojaId,
            perfil_id: formData.perfil_id || 'atendente',
          })
        )
      );

      await Promise.all(toRemove.map((v) => removerUsuarioLoja(v.id)));

      toast({ title: 'Perfil e lojas atualizados para o usuário!' });
      await carregarDados();
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    } finally {
      setCarregando(false);
    }
  };

  const handleEditar = (usuario) => {
    setUsuarioSelecionado(usuario);
    const userLinks = vinculosPorUsuario.get(usuario.id) || [];
    setLojasSelecionadas(userLinks.map((v) => v.loja_id));
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      password: '',
      perfil_id: usuario.perfil_id || 'atendente',
    });
    setDialogAberto(true);
  };

  const abrirModalDelecao = (usuario) => {
    setUsuarioSelecionado(usuario);
    setAlertAberto(true);
  };

  const handleDeletarConfirmado = async () => {
    if (!usuarioSelecionado) return;
    setCarregando(true);
    try {
      await deletarUsuario(usuarioSelecionado.id);
      toast({ title: 'Usuario excluido com sucesso' });
      setUsuarios((prev) => prev.filter((u) => u.id !== usuarioSelecionado.id));
      setAlertAberto(false);
    } catch (error) {
      toast({
        title: 'Erro ao excluir usuario',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setCarregando(false);
      setUsuarioSelecionado(null);
    }
  };

  const resetForm = () => {
    setFormData({
      nome: '',
      email: '',
      password: '',
      perfil_id: 'atendente',
    });
    setLojasSelecionadas([]);
    setUsuarioSelecionado(null);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Usuarios</h2>
          <p className="text-sm text-gray-500 mt-1">Gerencie usuarios e acessos.</p>
        </div>
        <Dialog
          open={dialogAberto}
          onOpenChange={(open) => {
            setDialogAberto(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuario
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{usuarioSelecionado ? 'Editar Usuario' : 'Novo Usuario'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <UppercaseInput
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  disabled={!!usuarioSelecionado}
                />
              </div>
              <div>
                <Label htmlFor="senha">Senha {!usuarioSelecionado && '*'}</Label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!usuarioSelecionado}
                    placeholder={usuarioSelecionado ? 'Deixe em branco para nao alterar' : ''}
                    className="pr-12"
                  />
                  <button
                    type="button"
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    aria-pressed={mostrarSenha}
                    className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                    onClick={() => setMostrarSenha((prev) => !prev)}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="perfil">Perfil *</Label>
                <Select
                  value={formData.perfil_id}
                  onValueChange={(value) => setFormData({ ...formData, perfil_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {perfisDisponiveis.map((perfil) => (
                      <SelectItem key={perfil.id} value={perfil.id}>
                        {perfil.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lojas</Label>
                <div className="space-y-2 max-h-48 overflow-auto border rounded-md p-3">
                  {lojasOptions.map((opt) => {
                    const checked = lojasSelecionadas.includes(opt.value);
                    return (
                      <label key={opt.value} className="flex items-center gap-2 text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) => {
                            setLojasSelecionadas((prev) =>
                              v ? [...prev, opt.value] : prev.filter((id) => id !== opt.value)
                            );
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                  {lojasOptions.length === 0 && (
                    <p className="text-xs text-gray-500">Nenhuma loja cadastrada.</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogAberto(false)}
                  className="flex-1"
                  disabled={carregando}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={carregando}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="overflow-x-auto">
        {carregando && !usuarios.length ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Nome
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Perfil
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acoes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{usuario.nome}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{usuario.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{usuario.perfil?.nome}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => handleEditar(usuario)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => abrirModalDelecao(usuario)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-12 text-gray-500">
                    Nenhum usuario encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <AlertDialog open={alertAberto} onOpenChange={setAlertAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuario</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuario <strong>{usuarioSelecionado?.nome}</strong>?
              Essa acao nao podera ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletarConfirmado}
              disabled={carregando}
              className="bg-red-600 hover:bg-red-700"
            >
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default GestaoUsuarios;
