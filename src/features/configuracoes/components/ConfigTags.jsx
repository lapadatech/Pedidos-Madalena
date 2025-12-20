import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { UppercaseInput } from '@/shared/ui/UppercaseInput';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog';
import { useToast } from '@/shared/ui/use-toast';
import { listarTags, criarTag, atualizarTag, deletarTag } from '@/lib/tagsApi';
import TagChip from '@/shared/components/tags/TagChip';

function ConfigTags() {
  const [tags, setTags] = useState([]);
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tagSelecionada, setTagSelecionada] = useState(null);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#FF9921');
  const { toast } = useToast();

  useEffect(() => {
    carregarTags();
  }, []);

  const carregarTags = async () => {
    try {
      const dados = await listarTags();
      setTags(dados);
    } catch (error) {
      toast({
        title: 'Erro ao carregar tags',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (tagSelecionada) {
        await atualizarTag(tagSelecionada.id, { nome, cor });
        toast({
          title: 'Tag atualizada!',
          className: 'bg-white text-black font-bold',
        });
      } else {
        await criarTag({ nome, cor });
        toast({
          title: 'Tag criada!',
          className: 'bg-white text-black font-bold',
        });
      }

      await carregarTags();
      setDialogAberto(false);
      setNome('');
      setCor('#FF9921');
      setTagSelecionada(null);
    } catch (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleEditar = (tag) => {
    setTagSelecionada(tag);
    setNome(tag.nome);
    setCor(tag.cor);
    setDialogAberto(true);
  };

  const handleDeletar = async (id) => {
    if (window.confirm('Deseja realmente excluir esta tag?')) {
      try {
        await deletarTag(id);
        toast({
          title: 'Tag excluída!',
          className: 'bg-white text-black font-bold',
        });
        await carregarTags();
      } catch (error) {
        toast({
          title: 'Erro ao excluir',
          description: 'Não é possível excluir uma tag que está em uso.',
          variant: 'destructive',
        });
      }
    }
  };

  const coresComuns = [
    '#FF9921', // Laranja Madalena
    '#E74C3C', // Vermelho
    '#3498DB', // Azul
    '#2ECC71', // Verde
    '#F39C12', // Amarelo
    '#9B59B6', // Roxo
    '#1ABC9C', // Turquesa
    '#E91E63', // Rosa
  ];

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex items-center justify-between">
        <h3 className="font-semibold">Tags</h3>
        <Dialog
          open={dialogAberto}
          onOpenChange={(open) => {
            setDialogAberto(open);
            if (!open) {
              setNome('');
              setCor('#FF9921');
              setTagSelecionada(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
              <Plus className="h-4 w-4 mr-2" />
              Nova Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{tagSelecionada ? 'Editar Tag' : 'Nova Tag'}</DialogTitle>
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
              <div>
                <Label htmlFor="cor">Cor *</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="cor"
                    type="color"
                    value={cor}
                    onChange={(e) => setCor(e.target.value)}
                    className="w-20 h-10 cursor-pointer"
                    required
                  />
                  <span className="text-sm text-gray-600">{cor}</span>
                </div>
                <div className="mt-3">
                  <Label className="text-xs text-gray-500">Cores sugeridas:</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {coresComuns.map((corSugerida) => (
                      <button
                        key={corSugerida}
                        type="button"
                        onClick={() => setCor(corSugerida)}
                        className="w-8 h-8 rounded border-2 border-gray-300 hover:border-gray-400 transition-colors"
                        style={{ backgroundColor: corSugerida }}
                        title={corSugerida}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-2">
                <Label className="text-xs text-gray-500">Pré-visualização:</Label>
                <div className="mt-2">
                  <TagChip nome={nome || 'NOME DA TAG'} cor={cor} />
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
                <Button type="submit" className="flex-1 bg-orange-500 hover:bg-orange-600">
                  Salvar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-4 space-y-2">
        {tags.map((tag) => (
          <div
            key={tag.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
          >
            <TagChip nome={tag.nome} cor={tag.cor} />
            <div className="flex gap-2">
              <Button variant="ghost" size="icon" onClick={() => handleEditar(tag)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={() => handleDeletar(tag.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          </div>
        ))}
        {tags.length === 0 && (
          <p className="text-center text-gray-500 py-4">Nenhuma tag cadastrada.</p>
        )}
      </div>
    </div>
  );
}

export default ConfigTags;
