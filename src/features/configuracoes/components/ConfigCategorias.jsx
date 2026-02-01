import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
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
import { Switch } from '@/shared/ui/switch';
import { useToast } from '@/shared/ui/use-toast';
import {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  deletarCategoria,
} from '@/features/produtos/services/produtosApi';
import { useAuth } from '@/contexts/SupabaseAuthContext';

function ConfigCategorias() {
  const [categorias, setCategorias] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [nome, setNome] = useState('');
  const [ativa, setAtiva] = useState(true);
  const { toast } = useToast();
  const { temPermissao } = useAuth();
  const podeCriar = temPermissao('settings', 'update');
  const podeEditar = temPermissao('settings', 'update');
  const podeExcluir = temPermissao('settings', 'update');

  const carregarCategorias = useCallback(async () => {
    try {
      const dados = await listarCategorias({ includeInactive: true });
      setCategorias(dados);
    } catch (error) {
      toast({
        title: 'Erro ao carregar categorias',
        description: error.message,
        variant: 'destructive',
      });
    }
  }, [toast]);

  useEffect(() => {
    carregarCategorias();
  }, [carregarCategorias]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (categoriaSelecionada) {
        await atualizarCategoria(categoriaSelecionada.id, { nome, active: ativa });
        toast({
          title: 'Categoria atualizada!',
          className: 'bg-white text-black font-bold',
        });
      } else {
        await criarCategoria({ nome, active: ativa });
        toast({
          title: 'Categoria criada!',
          className: 'bg-white text-black font-bold',
        });
      }

      await carregarCategorias();
      setDialogAberto(false);
      setNome('');
      setAtiva(true);
      setCategoriaSelecionada(null);
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditar = (categoria) => {
    setCategoriaSelecionada(categoria);
    setNome(categoria.nome);
    setAtiva(categoria.active !== false);
    setDialogAberto(true);
  };

  const handleToggleAtivo = async (categoria) => {
    if (!podeEditar) return;
    try {
      await atualizarCategoria(categoria.id, { active: categoria.active ? false : true });
      await carregarCategorias();
    } catch (error) {
      toast({
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Deseja realmente excluir esta categoria?')) {
      try {
        await deletarCategoria(id);
        toast({
          title: 'Categoria excluída!',
          className: 'bg-white text-black font-bold',
        });
        await carregarCategorias();
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não é possível excluir uma categoria que está em uso por produtos.',
          variant: 'destructive',
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Categorias</h3>
        <Dialog
          open={dialogAberto}
          onOpenChange={(open) => {
            setDialogAberto(open);
            if (!open) {
              setNome('');
              setAtiva(true);
              setCategoriaSelecionada(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button
              size="sm"
              className="bg-orange-500 hover:bg-orange-600"
              disabled={!podeCriar}
              title={podeCriar ? '' : 'Sem permissao para criar categorias'}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {categoriaSelecionada ? 'Editar Categoria' : 'Nova Categoria'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nome">Nome *</Label>
                <UppercaseInput
                  id="nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-between border rounded-md px-3 py-2">
                <Label htmlFor="categoria-ativa" className="text-sm">
                  Categoria ativa
                </Label>
                <Switch id="categoria-ativa" checked={ativa} onCheckedChange={setAtiva} />
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
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 space-y-2">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <div className="flex items-center gap-3">
              <span className="font-medium">{categoria.nome}</span>
              <span className="text-xs text-gray-500">
                {categoria.active ? 'Ativa' : 'Inativa'}
              </span>
            </div>
            {(podeEditar || podeExcluir) && (
              <div className="flex gap-2">
                {podeEditar && (
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={categoria.active !== false}
                      onCheckedChange={() => handleToggleAtivo(categoria)}
                    />
                  </div>
                )}
                {podeEditar && (
                  <Button variant="ghost" size="icon" onClick={() => handleEditar(categoria)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                )}
                {podeExcluir && (
                  <Button variant="ghost" size="icon" onClick={() => handleDeletar(categoria.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                )}
              </div>
            )}
          </div>
        ))}
        {categorias.length === 0 && (
          <p className="text-center text-gray-500 py-4">Nenhuma categoria cadastrada.</p>
        )}
      </div>
    </div>
  );
}

export default ConfigCategorias;
