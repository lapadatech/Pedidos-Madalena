import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { Plus, Search, Edit, Trash2, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UppercaseInput } from '@/components/ui/UppercaseInput';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/components/ui/use-toast';
import { listarProdutos, criarProduto, atualizarProduto, deletarProduto, listarCategorias, listarGruposComplementos } from '@/lib/api';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const SkeletonProdutoCard = () => (
    <div className="bg-white border rounded-lg p-4 flex flex-col justify-between animate-pulse">
        <div>
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 pr-2 space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
            </div>
            <div className="mb-3 space-y-1">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="flex flex-wrap gap-1 mt-1">
                    <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
                    <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
                </div>
            </div>
        </div>
        <div className="flex items-center justify-between pt-2 border-t mt-auto">
            <div className="h-7 w-28 bg-gray-300 rounded"></div>
            <div className="flex gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
            </div>
        </div>
    </div>
  );

function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [gruposComplementos, setGruposComplementos] = useState([]);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('all');
  const [filtroStatus, setFiltroStatus] = useState('all');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { temPermissao } = useAuth();
  
  const [formData, setFormData] = useState({
    nome: '',
    preco: '',
    ativo: true,
    categoria_id: '',
    grupos_complementos: []
  });

  const carregarDados = async () => {
    setLoading(true);
    try {
      const [produtosResponse, categoriasData, gruposData] = await Promise.all([listarProdutos(), listarCategorias(), listarGruposComplementos()]);
      setProdutos(produtosResponse.data);
      setCategorias(categoriasData);
      setGruposComplementos(gruposData);
    } catch (error) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: 'destructive'
      });
    }
    setLoading(false);
  };
  
  useEffect(() => {
    carregarDados();
  }, []);

  const resetForm = () => {
    setFormData({
      nome: '',
      preco: '',
      ativo: true,
      categoria_id: '',
      grupos_complementos: []
    });
    setProdutoSelecionado(null);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const dados = {
        ...formData,
        preco: parseFloat(formData.preco),
        grupos_complementos: formData.grupos_complementos.filter(id => id)
      };
      if (produtoSelecionado) {
        await atualizarProduto(produtoSelecionado.id, dados);
        toast({
          title: "Produto atualizado!",
        });
      } else {
        await criarProduto(dados);
        toast({
          title: "Produto cadastrado!",
        });
      }
      await carregarDados();
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
        setIsSaving(false);
    }
  };

  const handleNovo = () => {
    resetForm();
    setDialogAberto(true);
  };

  const handleEditar = produto => {
    setProdutoSelecionado(produto);
    setFormData({
      nome: produto.nome,
      preco: produto.preco.toString(),
      ativo: produto.ativo,
      categoria_id: produto.categoria_id,
      grupos_complementos: produto.grupos_complementos || []
    });
    setDialogAberto(true);
  };

  const handleDeletar = async id => {
    if (window.confirm('Deseja realmente excluir este produto?')) {
      try {
        await deletarProduto(id);
        toast({
          title: "Produto excluído!",
        });
        await carregarDados();
      } catch (error) {
        toast({
          title: "Erro ao deletar",
          description: error.message,
          variant: 'destructive'
        });
      }
    }
  };

  const handleComplementoChange = (index, value) => {
    const novosGrupos = [...formData.grupos_complementos];
    novosGrupos[index] = parseInt(value);
    setFormData({
      ...formData,
      grupos_complementos: novosGrupos
    });
  };

  const adicionarGrupoComplemento = () => {
    setFormData(prev => ({
      ...prev,
      grupos_complementos: [...prev.grupos_complementos, '']
    }));
  };

  const removerGrupoComplemento = index => {
    setFormData(prev => ({
      ...prev,
      grupos_complementos: prev.grupos_complementos.filter((_, i) => i !== index)
    }));
  };

  const produtosFiltrados = (produtos || []).filter(p => {
    const matchNome = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = filtroCategoria === 'all' || p.categoria_id?.toString() === filtroCategoria;
    const matchStatus = filtroStatus === 'all' || (filtroStatus === 'ativo' ? p.ativo : !p.ativo);
    return matchNome && matchCategoria && matchStatus;
  });

  const podeEditar = temPermissao('produtos', 'editar');

  return <>
      <Helmet>
        <title>Produtos - Gestor de Pedidos</title>
        <meta name="description" content="Gerenciamento de produtos" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Produtos</h2>
            <p className="text-gray-500 mt-1"></p>
          </div>
          {podeEditar && <>
              <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleNovo}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
              <Dialog open={dialogAberto} onOpenChange={open => {
            if (!open) resetForm();
            setDialogAberto(open);
          }}>
                <DialogContent className="sm:max-w-[480px]">
                  <DialogHeader>
                    <DialogTitle>
                      {produtoSelecionado ? 'Editar Produto' : 'Novo Produto'}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="nome">Nome *</Label>
                      <UppercaseInput id="nome" value={formData.nome} onChange={e => setFormData({
                    ...formData,
                    nome: e.target.value
                  })} required disabled={isSaving} />
                    </div>
                    <div>
                      <Label htmlFor="preco">Preço *</Label>
                      <Input id="preco" type="number" step="0.01" placeholder="0.00" value={formData.preco} onChange={e => setFormData({
                    ...formData,
                    preco: e.target.value
                  })} required disabled={isSaving}/>
                    </div>
                    <div>
                      <Label htmlFor="categoria">Categoria *</Label>
                      <Select value={formData.categoria_id?.toString() ?? ''} onValueChange={value => setFormData({
                    ...formData,
                    categoria_id: parseInt(value)
                  })} disabled={isSaving}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {categorias.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>
                              {cat.nome}
                            </SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Grupos de Complementos</Label>
                      <div className="space-y-2 mt-1">
                        {formData.grupos_complementos.map((grupoId, index) => <div key={index} className="flex items-center gap-2">
                            <Select value={grupoId.toString()} onValueChange={value => handleComplementoChange(index, value)} disabled={isSaving}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um grupo..." />
                              </SelectTrigger>
                              <SelectContent>
                                {gruposComplementos.map(g => <SelectItem key={g.id} value={g.id.toString()}>
                                    {g.nome}
                                  </SelectItem>)}
                              </SelectContent>
                            </Select>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removerGrupoComplemento(index)} disabled={isSaving}>
                              <X className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>)}
                        <Button type="button" variant="outline" className="w-full" onClick={adicionarGrupoComplemento} disabled={isSaving}>
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Grupo
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch checked={formData.ativo} onCheckedChange={checked => setFormData({
                    ...formData,
                    ativo: checked
                  })} disabled={isSaving} />
                      <Label>Produto ativo</Label>
                    </div>
                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="flex-1" disabled={isSaving}>
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSaving} className="flex-1 bg-orange-500 hover:bg-orange-600">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </>}
        </div>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar produtos..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
            </div>
            <div className="flex gap-4">
              <Select value={filtroCategoria} onValueChange={setFiltroCategoria}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todas categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorias</SelectItem>
                  {categorias.map(cat => <SelectItem key={cat.id} value={cat.id.toString()}>
                      {cat.nome}
                    </SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Todos status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="ativo">Ativos</SelectItem>
                  <SelectItem value="inativo">Inativos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {loading ? (
                Array.from({ length: 6 }).map((_, index) => <SkeletonProdutoCard key={index} />)
            ) : (
                produtosFiltrados.map(produto => {
                const categoria = categorias.find(c => c.id === produto.categoria_id);
                const complementosProduto = produto.grupos_complementos?.map(gc_id => gruposComplementos.find(g => g.id === gc_id)?.nome).filter(Boolean);
                return <motion.div key={produto.id} initial={{
                opacity: 0,
                scale: 0.95
                }} animate={{
                opacity: 1,
                scale: 1
                }} className="bg-white border rounded-lg p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                        <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 pr-2">
                            <h3 className="font-semibold text-gray-900">{produto.nome}</h3>
                            <p className="text-sm text-gray-500">{categoria?.nome}</p>
                        </div>
                        <span className={`px-2 py-1 text-xs rounded-full whitespace-nowrap ${produto.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                            {produto.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                        </div>
                        {complementosProduto && complementosProduto.length > 0 && <div className="mb-3">
                                <p className="text-xs font-medium text-gray-600">Complementos:</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {complementosProduto.map((nome, index) => <span key={index} className="text-xs bg-gray-100 px-2 py-1 rounded-full">{nome}</span>)}
                                </div>
                            </div>}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t mt-auto">
                        <span className="text-lg font-bold text-orange-600">
                        R$ {Number(produto.preco).toFixed(2).replace('.', ',')}
                        </span>
                        {podeEditar && <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditar(produto)}>
                            <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeletar(produto.id)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                        </div>}
                    </div>
                    </motion.div>;
                })
            )}
          </div>
            {!loading && produtosFiltrados.length === 0 && (
                <div className="text-center py-12 text-gray-500 col-span-full">
                    Nenhum produto encontrado.
                </div>
            )}
        </div>
      </div>
    </>;
}
export default Produtos;