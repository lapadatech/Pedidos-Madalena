import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Edit, Trash2, X, Star, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UppercaseInput } from '@/components/ui/UppercaseInput';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { listarClientes, criarCliente, atualizarCliente, deletarCliente, buscarCep, listarEnderecos, criarEndereco, atualizarEndereco, deletarEndereco, buscarClientePorCelular } from '@/lib/api';
import { useAuth } from '@/contexts/SupabaseAuthContext';

const maskCelular = value => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  if (value.length > 11) value = value.slice(0, 11);
  value = value.replace(/^(\d{2})(\d)/g, "($1) $2");
  value = value.replace(/(\d)(\d{4})$/, "$1-$2");
  return value;
};
const maskCep = value => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  if (value.length > 8) value = value.slice(0, 8);
  value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  return value;
};

const estadosBrasileiros = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

const initialState = {
  nome: '',
  celular: '',
  email: '',
  enderecos: []
};

const SkeletonClienteRow = () => (
    <tr className="animate-pulse">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          <div className="h-3 bg-gray-200 rounded w-2/5"></div>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex gap-1 justify-end">
          <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
          <div className="h-8 w-8 bg-gray-200 rounded-md"></div>
        </div>
      </td>
    </tr>
  );

function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [busca, setBusca] = useState('');
  const [dialogAberto, setDialogAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const {
    toast
  } = useToast();
  const {
    temPermissao
  } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialState);
  const [celularExistente, setCelularExistente] = useState(false);
  const debounceTimeout = useRef(null);

  const carregarClientes = useCallback(async termoBusca => {
    setLoading(true);
    try {
      const {
        data
      } = await listarClientes({
        busca: termoBusca
      });
      setClientes(data);
    } catch (error) {
      toast({
        title: "Erro ao carregar clientes",
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    carregarClientes(busca);
  }, [busca, carregarClientes]);

  const handleFormChange = e => {
    const {
      name,
      value
    } = e.target;
    if (name === 'celular') {
      setFormData({
        ...formData,
        celular: maskCelular(value)
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const checkCelular = useCallback(async celular => {
    const celularLimpo = celular.replace(/\D/g, '');
    if (celularLimpo.length < 10) {
      setCelularExistente(false);
      return;
    }
    if (clienteSelecionado && clienteSelecionado.celular === celularLimpo) {
      setCelularExistente(false);
      return;
    }
    try {
      const cliente = await buscarClientePorCelular(celularLimpo);
      setCelularExistente(!!cliente);
    } catch (error) {
      console.error("Erro ao verificar celular:", error);
      setCelularExistente(false);
    }
  }, [clienteSelecionado]);

  useEffect(() => {
    if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
    if (formData.celular) {
      debounceTimeout.current = setTimeout(() => {
        checkCelular(formData.celular);
      }, 500);
    } else {
      setCelularExistente(false);
    }
    return () => clearTimeout(debounceTimeout.current);
  }, [formData.celular, checkCelular]);

  const handleEnderecoChange = (index, e) => {
    const {
      name,
      value
    } = e.target;
    const novosEnderecos = [...formData.enderecos];
    let finalValue = value;
    if (name === 'cep') {
      finalValue = maskCep(value);
    }
    novosEnderecos[index][name] = finalValue;
    setFormData(prev => ({
      ...prev,
      enderecos: novosEnderecos
    }));
  };
  const handleEstadoChange = (index, value) => {
    const novosEnderecos = [...formData.enderecos];
    novosEnderecos[index]['estado'] = value;
    setFormData(prev => ({
      ...prev,
      enderecos: novosEnderecos
    }));
  };
  const handleBuscaCep = async index => {
    const cep = formData.enderecos[index].cep.replace(/\D/g, '');
    if (cep.length === 8) {
      setIsSaving(true);
      const dadosCep = await buscarCep(cep);
      setIsSaving(false);
      if (dadosCep && !dadosCep.erro) {
        const novosEnderecos = [...formData.enderecos];
        novosEnderecos[index] = {
          ...novosEnderecos[index],
          rua: dadosCep.logradouro || '',
          bairro: dadosCep.bairro || '',
          cidade: dadosCep.localidade || '',
          estado: dadosCep.uf || ''
        };
        setFormData(prev => ({
          ...prev,
          enderecos: novosEnderecos
        }));
        toast({
          title: "CEP encontrado!",
          description: "Endereço preenchido."
        });
      } else {
        toast({
          title: "CEP não encontrado",
          variant: "destructive"
        });
      }
    }
  };
  const adicionarEndereco = () => {
    const novoEndereco = {
      id: `new_${Date.now()}`,
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      principal: formData.enderecos.length === 0
    };
    setFormData(prev => ({
      ...prev,
      enderecos: [...prev.enderecos, novoEndereco]
    }));
  };
  const removerEndereco = index => {
    let novosEnderecos = formData.enderecos.filter((_, i) => i !== index);
    if (novosEnderecos.length > 0 && !novosEnderecos.some(e => e.principal)) {
      novosEnderecos[0].principal = true;
    }
    setFormData(prev => ({
      ...prev,
      enderecos: novosEnderecos
    }));
  };
  const setPrincipal = index => {
    const novosEnderecos = formData.enderecos.map((end, i) => ({
      ...end,
      principal: i === index
    }));
    setFormData(prev => ({
      ...prev,
      enderecos: novosEnderecos
    }));
  };
  const resetForm = () => {
    setFormData(initialState);
    setClienteSelecionado(null);
    setCelularExistente(false);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (celularExistente) {
      toast({
        title: "Celular já cadastrado",
        description: "Por favor, utilize outro número de celular.",
        variant: 'destructive'
      });
      return;
    }
    const celularLimpo = formData.celular.replace(/\D/g, '');
    if (celularLimpo.length < 10) {
      toast({
        title: "Celular inválido",
        description: "O celular deve ter pelo menos 10 dígitos.",
        variant: 'destructive'
      });
      return;
    }
    
    setIsSaving(true);
    const clienteData = {
      nome: formData.nome,
      celular: celularLimpo,
      email: formData.email
    };

    try {
      let clienteId;
      if (clienteSelecionado) {
        await atualizarCliente(clienteSelecionado.id, clienteData);
        clienteId = clienteSelecionado.id;
        toast({
          title: "Cliente atualizado!"
        });
      } else {
        const [novoCliente] = await criarCliente(clienteData);
        clienteId = novoCliente.id;
        toast({
          title: "Cliente cadastrado!"
        });
      }
      const enderecosExistentes = clienteSelecionado ? await listarEnderecos(clienteId) : [];
      const enderecosForm = formData.enderecos;
      for (const endForm of enderecosForm) {
        const dados = {
          ...endForm,
          cliente_id: clienteId,
          cep: endForm.cep.replace(/\D/g, '')
        };
        if (typeof endForm.id === 'string' && endForm.id.startsWith('new_')) {
          const {
            id,
            ...dadosCriacao
          } = dados;
          await criarEndereco(dadosCriacao);
        } else {
          const {
            id,
            ...dadosAtualizacao
          } = dados;
          await atualizarEndereco(id, dadosAtualizacao);
        }
      }
      for (const endExistente of enderecosExistentes) {
        if (!enderecosForm.some(ef => ef.id === endExistente.id)) {
          await deletarEndereco(endExistente.id);
        }
      }
      await carregarClientes(busca);
      setDialogAberto(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNovo = () => {
    resetForm();
    setDialogAberto(true);
  };
  const handleEditar = async (cliente, e) => {
    e.stopPropagation();
    resetForm();
    setClienteSelecionado(cliente);
    setIsSaving(true);
    setDialogAberto(true);
    try {
      const enderecos = await listarEnderecos(cliente.id);
      setFormData({
        nome: cliente.nome,
        celular: maskCelular(cliente.celular || ''),
        email: cliente.email || '',
        enderecos: enderecos.map(e => ({
          ...e,
          cep: maskCep(e.cep)
        }))
      });
    } catch (e) {
      toast({
        title: "Erro ao carregar endereços",
        description: e.message,
        variant: 'destructive'
      });
    }
    setIsSaving(false);
  };
  const handleDeletar = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Deseja realmente excluir este cliente?')) {
      try {
        await deletarCliente(id);
        toast({
          title: "Cliente excluído!"
        });
        await carregarClientes(busca);
      } catch (error) {
        toast({
          title: "Erro ao deletar",
          description: "Verifique se o cliente não possui pedidos associados.",
          variant: 'destructive'
        });
      }
    }
  };
  const podeEditar = temPermissao('clientes', 'editar');

  return <>
      <Helmet>
        <title>Clientes - Gestor de Pedidos</title>
        <meta name="description" content="Gerenciamento de clientes" />
      </Helmet>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Clientes</h2>
            <p className="text-gray-500 mt-1"></p>
          </div>
          {podeEditar && <Button className="bg-orange-500 hover:bg-orange-600" onClick={handleNovo}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente
            </Button>}
        </div>

        <Dialog open={dialogAberto} onOpenChange={open => {
        if (!open) resetForm();
        setDialogAberto(open);
      }}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{clienteSelecionado ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
              </DialogHeader>
              {isSaving && !formData.nome ? <div className="flex justify-center items-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                </div> : <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="relative">
                            <Label htmlFor="celular">Celular *</Label>
                            <Input id="celular" name="celular" value={formData.celular} onChange={handleFormChange} maxLength="15" placeholder="(XX) XXXXX-XXXX" required disabled={isSaving} />
                            {celularExistente && <div className="absolute top-full mt-1 flex items-center text-sm text-red-500">
                                    <AlertCircle className="h-4 w-4 mr-1" />
                                    Celular já cadastrado.
                                </div>}
                        </div>
                        <div>
                            <Label htmlFor="nome">Nome Completo *</Label>
                            <UppercaseInput id="nome" name="nome" value={formData.nome} onChange={handleFormChange} required disabled={isSaving} />
                        </div>
                        <div className="md:col-span-2">
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" name="email" type="email" value={formData.email} onChange={handleFormChange} disabled={isSaving} />
                        </div>
                    </div>
                    
                    <div className="space-y-4 border-t pt-4">
                        <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold">Endereços</h3>
                        <Button type="button" variant="outline" size="sm" onClick={adicionarEndereco} disabled={isSaving}><Plus className="h-4 w-4 mr-2" />Adicionar Endereço</Button>
                        </div>
                        
                        <div className="space-y-4">
                        {formData.enderecos.map((end, index) => <div key={end.id} className="p-4 border rounded-md relative space-y-4">
                            <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => removerEndereco(index)} disabled={isSaving}><X className="h-4 w-4" /></Button>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="md:col-span-1">
                                    <Label htmlFor={`cep-${index}`}>CEP</Label>
                                    <Input id={`cep-${index}`} name="cep" value={end.cep} onChange={e => handleEnderecoChange(index, e)} onBlur={() => handleBuscaCep(index)} maxLength="9" disabled={isSaving} />
                                </div>
                                <div className="md:col-span-3">
                                    <Label htmlFor={`rua-${index}`}>Rua</Label>
                                    <UppercaseInput id={`rua-${index}`} name="rua" value={end.rua} onChange={e => handleEnderecoChange(index, e)} disabled={isSaving}/>
                                </div>
                                <div className="md:col-span-1">
                                    <Label htmlFor={`numero-${index}`}>Número</Label>
                                    <Input id={`numero-${index}`} name="numero" value={end.numero} onChange={e => handleEnderecoChange(index, e)} disabled={isSaving}/>
                                </div>
                                <div className="md:col-span-1">
                                    <Label htmlFor={`complemento-${index}`}>Complemento</Label>
                                    <UppercaseInput id={`complemento-${index}`} name="complemento" value={end.complemento || ''} onChange={e => handleEnderecoChange(index, e)} disabled={isSaving}/>
                                </div>
                                <div className="md:col-span-2">
                                    <Label htmlFor={`bairro-${index}`}>Bairro</Label>
                                    <UppercaseInput id={`bairro-${index}`} name="bairro" value={end.bairro || ''} onChange={e => handleEnderecoChange(index, e)} disabled={isSaving}/>
                                </div>
                                <div className="md:col-span-3">
                                    <Label htmlFor={`cidade-${index}`}>Cidade</Label>
                                    <UppercaseInput id={`cidade-${index}`} name="cidade" value={end.cidade} onChange={e => handleEnderecoChange(index, e)} disabled={isSaving}/>
                                </div>
                                <div className="md:col-span-1">
                                    <Label htmlFor={`estado-${index}`}>Estado</Label>
                                    <Select value={end.estado} onValueChange={value => handleEstadoChange(index, value)} disabled={isSaving}>
                                    <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                                    <SelectContent>
                                        {estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}
                                    </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <Button type="button" variant={end.principal ? "default" : "outline"} size="sm" className="gap-2" onClick={() => setPrincipal(index)} disabled={isSaving}>
                                <Star className={`h-4 w-4 ${end.principal ? 'text-yellow-400 fill-yellow-400' : ''}`} /> {end.principal ? 'Endereço Principal' : 'Marcar como Principal'}
                            </Button>
                            </div>)}
                        </div>
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={() => setDialogAberto(false)} className="flex-1" disabled={isSaving}>
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving || celularExistente} className="flex-1 bg-orange-500 hover:bg-orange-600">
                        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2"/> : null}
                        {isSaving ? 'Salvando...' : clienteSelecionado ? 'Salvar Alterações' : 'Criar Cliente'}
                    </Button>
                    </div>
                </form>}
            </DialogContent>
          </Dialog>

        <div className="bg-white rounded-lg shadow">
          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Buscar por nome ou telefone..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-10" />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                        Array.from({ length: 5 }).map((_, index) => <SkeletonClienteRow key={index} />)
                    ) : clientes.length > 0 ? (
                        clientes.map(cliente => <tr key={cliente.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/clientes/${cliente.id}`)}>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{cliente.nome}</div>
                                <div className="text-sm text-gray-500">{maskCelular(cliente.celular)}</div>
                                <div className="text-sm text-gray-500">{cliente.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {podeEditar && <div className="flex gap-1 justify-end">
                                <Button variant="ghost" size="icon" onClick={e => handleEditar(cliente, e)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={e => handleDeletar(cliente.id, e)}>
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                                </div>}
                            </td>
                        </tr>)
                    ) : (
                         <tr>
                            <td colSpan="2" className="text-center py-12 text-gray-500">
                                Nenhum cliente encontrado.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </>;
}
export default Clientes;