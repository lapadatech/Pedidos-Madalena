import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UppercaseInput } from '@/components/ui/UppercaseInput';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { listarUsuarios, criarUsuario, atualizarUsuario, deletarUsuario, listarPerfis } from '@/lib/api';
import { useAuth } from '@/contexts/SupabaseAuthContext';

function ConfigUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [perfis, setPerfis] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [alertAberto, setAlertAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    perfil_id: ''
  });
  const { toast } = useToast();
  const { user, usuario: usuarioLogado } = useAuth();
  
  const podeExcluir = usuarioLogado?.perfil?.nome === 'Gerente';

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    setCarregando(true);
    try {
        const [usuariosData, perfisData] = await Promise.all([
            listarUsuarios(),
            listarPerfis()
        ]);
        setUsuarios(usuariosData);
        setPerfis(perfisData);
    } catch (error) {
        toast({ title: "Erro ao carregar dados", description: error.message, variant: 'destructive' });
    } finally {
        setCarregando(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setCarregando(true);
    
    try {
      if (usuarioSelecionado) {
        const dadosAtualizacao = { nome: formData.nome, perfil_id: formData.perfil_id };
        if (formData.password) {
            dadosAtualizacao.password = formData.password;
        }
        await atualizarUsuario(usuarioSelecionado.id, dadosAtualizacao);
        toast({ title: "Usuário atualizado!" });
      } else {
        await criarUsuario(formData);
        toast({ title: "Usuário criado!", description: "O novo usuário foi cadastrado com sucesso." });
      }
      
      await carregarDados();
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
        setCarregando(false);
    }
  };

  const handleEditar = (usuario) => {
    setUsuarioSelecionado(usuario);
    setFormData({
      nome: usuario.nome,
      email: usuario.email,
      password: '',
      perfil_id: usuario.perfil_id
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
      toast({ title: "Usuário excluído com sucesso" });
      setUsuarios(prev => prev.filter(u => u.id !== usuarioSelecionado.id));
      setAlertAberto(false);
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message,
        variant: "destructive",
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
      perfil_id: ''
    });
    setUsuarioSelecionado(null);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Usuários</h3>
        <Dialog open={dialogAberto} onOpenChange={(open) => {
          setDialogAberto(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {usuarioSelecionado ? 'Editar Usuário' : 'Novo Usuário'}
              </DialogTitle>
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
                <Input
                  id="senha"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!usuarioSelecionado}
                  placeholder={usuarioSelecionado ? 'Deixe em branco para não alterar' : ''}
                />
              </div>
              <div>
                <Label htmlFor="perfil">Perfil *</Label>
                <Select
                  value={formData.perfil_id?.toString()}
                  onValueChange={(value) => setFormData({ ...formData, perfil_id: parseInt(value, 10) })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {perfis.map(perfil => (
                      <SelectItem key={perfil.id} value={perfil.id.toString()}>
                        {perfil.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Ações</th>
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditar(usuario)}
                        disabled={usuario.id === user.id}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {podeExcluir && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => abrirModalDelecao(usuario)}
                          disabled={usuario.id === user.id} // Cannot delete self
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
      </div>

      <AlertDialog open={alertAberto} onOpenChange={setAlertAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{usuarioSelecionado?.nome}</strong>? Essa ação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={carregando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletarConfirmado} disabled={carregando} className="bg-red-600 hover:bg-red-700">
              {carregando ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ConfigUsuarios;