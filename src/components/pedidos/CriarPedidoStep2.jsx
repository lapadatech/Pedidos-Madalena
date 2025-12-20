import React, { useState, useEffect } from 'react';
import { Plus, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UppercaseInput } from '@/components/ui/UppercaseInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { criarEndereco, buscarCep, listarEnderecos } from '@/lib/api';

const maskCep = (value) => {
  if (!value) return "";
  value = value.replace(/\D/g, '');
  if (value.length > 8) value = value.slice(0, 8);
  value = value.replace(/^(\d{5})(\d)/, '$1-$2');
  return value;
};

const estadosBrasileiros = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

function CriarPedidoStep2({ onProximo, onVoltar, dadosIniciais }) {
  const [tipoEntrega, setTipoEntrega] = useState(dadosIniciais.tipo_entrega || 'retirada');
  const [dataEntrega, setDataEntrega] = useState(dadosIniciais.data_entrega || '');
  const [horaEntrega, setHoraEntrega] = useState(dadosIniciais.hora_entrega || '');
  const [enderecoSelecionado, setEnderecoSelecionado] = useState(dadosIniciais.endereco_entrega_id);
  const [enderecosCliente, setEnderecosCliente] = useState(dadosIniciais.cliente?.enderecos || []);
  
  const [mostrarNovoEndereco, setMostrarNovoEndereco] = useState(false);
  const [novoEndereco, setNovoEndereco] = useState({
    rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingEnderecos, setLoadingEnderecos] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const carregarEnderecos = async () => {
      if (dadosIniciais.cliente?.id && (!enderecosCliente || enderecosCliente.length === 0)) {
        setLoadingEnderecos(true);
        try {
          const enderecos = await listarEnderecos(dadosIniciais.cliente.id);
          setEnderecosCliente(enderecos || []);
          if (!enderecoSelecionado && enderecos.length > 0) {
            const principal = enderecos.find(e => e.principal);
            if (principal) {
              setEnderecoSelecionado(principal.id);
            }
          }
        } catch (error) {
          toast({
            title: "Erro ao buscar endereços",
            description: "Não foi possível carregar os endereços do cliente.",
            variant: "destructive"
          });
        } finally {
          setLoadingEnderecos(false);
        }
      }
    };
    carregarEnderecos();
  }, [dadosIniciais.cliente?.id, toast]);

  const handleNovoEnderecoChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (name === 'cep') {
      finalValue = maskCep(value);
    }
    setNovoEndereco(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleEstadoChange = (value) => {
    setNovoEndereco(prev => ({...prev, estado: value}));
  };

  const handleBuscaCep = async () => {
    const cep = novoEndereco.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      setLoading(true);
      const dadosCep = await buscarCep(cep);
      setLoading(false);
      if (dadosCep && !dadosCep.erro) {
        setNovoEndereco(prev => ({
          ...prev,
          rua: dadosCep.logradouro || '',
          bairro: dadosCep.bairro || '',
          cidade: dadosCep.localidade || '',
          estado: dadosCep.uf || '',
        }));
        toast({ title: "CEP encontrado!", description: "Endereço preenchido." });
      } else {
        toast({ title: "CEP não encontrado", variant: "destructive" });
      }
    }
  };

  const handleAdicionarEndereco = async () => {
    if (!novoEndereco.rua || !novoEndereco.numero || !novoEndereco.cidade || !novoEndereco.estado) {
      toast({ title: "Preencha todos os campos do endereço", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const dadosParaSalvar = {
        ...novoEndereco,
        cliente_id: dadosIniciais.cliente.id,
        principal: enderecosCliente.length === 0,
        cep: novoEndereco.cep.replace(/\D/g, ''),
      };
      
      const [enderecoSalvo] = await criarEndereco(dadosParaSalvar);
      
      setEnderecosCliente([...enderecosCliente, enderecoSalvo]);
      setEnderecoSelecionado(enderecoSalvo.id);
      setMostrarNovoEndereco(false);
      setNovoEndereco({ rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', cep: '' });
      toast({ title: "Endereço adicionado!" });
    } catch (error) {
      toast({ title: "Erro ao adicionar endereço", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleProximo = () => {
    if (!dataEntrega || !horaEntrega) {
      toast({ title: "Preencha data e hora da entrega", variant: "destructive" });
      return;
    }
    if (tipoEntrega === 'entrega' && !enderecoSelecionado) {
      toast({ title: "Selecione um endereço para entrega", variant: "destructive" });
      return;
    }
    const clienteComEnderecos = {
      ...dadosIniciais.cliente,
      enderecos: enderecosCliente
    };

    onProximo({
      tipo_entrega: tipoEntrega,
      data_entrega: dataEntrega,
      hora_entrega: horaEntrega,
      endereco_entrega_id: tipoEntrega === 'entrega' ? enderecoSelecionado : null,
      cliente: clienteComEnderecos
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="data">Data de Entrega *</Label>
          <Input id="data" type="date" value={dataEntrega} onChange={(e) => setDataEntrega(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="hora">Hora de Entrega *</Label>
          <Input id="hora" type="time" value={horaEntrega} onChange={(e) => setHoraEntrega(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Tipo de Entrega</Label>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <Button type="button" variant={tipoEntrega === 'retirada' ? 'default' : 'outline'} onClick={() => setTipoEntrega('retirada')} className={tipoEntrega === 'retirada' ? 'bg-orange-500 hover:bg-orange-600' : ''}>Retirada</Button>
          <Button type="button" variant={tipoEntrega === 'entrega' ? 'default' : 'outline'} onClick={() => setTipoEntrega('entrega')} className={tipoEntrega === 'entrega' ? 'bg-orange-500 hover:bg-orange-600' : ''}>Entrega</Button>
        </div>
      </div>
      {tipoEntrega === 'entrega' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Endereço de Entrega *</Label>
            <Button type="button" variant="outline" size="sm" onClick={() => setMostrarNovoEndereco(!mostrarNovoEndereco)}><Plus className="h-4 w-4 mr-2" />Novo Endereço</Button>
          </div>
          {mostrarNovoEndereco && (
            <div className="p-4 bg-gray-50 rounded-lg space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" name="cep" value={novoEndereco.cep} onChange={handleNovoEnderecoChange} onBlur={handleBuscaCep} maxLength="9" />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="rua">Rua</Label>
                  <UppercaseInput id="rua" name="rua" value={novoEndereco.rua} onChange={handleNovoEnderecoChange} />
                </div>
                <div className="md:col-span-1"><Label htmlFor="numero">Número</Label><Input id="numero" name="numero" value={novoEndereco.numero} onChange={handleNovoEnderecoChange} /></div>
                <div className="md:col-span-1"><Label htmlFor="complemento">Complemento</Label><UppercaseInput id="complemento" name="complemento" value={novoEndereco.complemento} onChange={handleNovoEnderecoChange} /></div>
                <div className="md:col-span-2"><Label htmlFor="bairro">Bairro</Label><UppercaseInput id="bairro" name="bairro" value={novoEndereco.bairro} onChange={handleNovoEnderecoChange} /></div>
                <div className="md:col-span-3"><Label htmlFor="cidade">Cidade</Label><UppercaseInput id="cidade" name="cidade" value={novoEndereco.cidade} onChange={handleNovoEnderecoChange} /></div>
                <div className="md:col-span-1">
                  <Label htmlFor="estado">Estado</Label>
                  <Select value={novoEndereco.estado} onValueChange={handleEstadoChange}>
                    <SelectTrigger><SelectValue placeholder="UF"/></SelectTrigger>
                    <SelectContent>{estadosBrasileiros.map(uf => <SelectItem key={uf} value={uf}>{uf}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" onClick={handleAdicionarEndereco} disabled={loading} className="w-full bg-orange-500 hover:bg-orange-600">
                {loading ? <Loader2 className="h-4 w-4 animate-spin"/> : 'Adicionar Endereço'}
              </Button>
            </div>
          )}
          {loadingEnderecos ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="space-y-2">
              {enderecosCliente.map((endereco) => (
                <div key={endereco.id} onClick={() => setEnderecoSelecionado(endereco.id)} className={`p-3 border rounded-lg cursor-pointer transition-all ${enderecoSelecionado === endereco.id ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'}`}>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-gray-500" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{endereco.rua}, {endereco.numero} {endereco.complemento && `- ${endereco.complemento}`}</p>
                      <p className="text-xs text-gray-500">{endereco.bairro} - {endereco.cidade}, {endereco.estado}</p>
                    </div>
                    {enderecoSelecionado === endereco.id && <CheckCircle className="h-5 w-5 text-orange-500" />}
                  </div>
                </div>
              ))}
              {enderecosCliente.length === 0 && !mostrarNovoEndereco && (
                  <p className="text-sm text-center text-gray-500 p-4 bg-gray-50 rounded-lg">Nenhum endereço cadastrado. Clique em "Novo Endereço" para adicionar.</p>
              )}
            </div>
          )}
        </div>
      )}
      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onVoltar} className="flex-1">Voltar</Button>
        <Button onClick={handleProximo} className="flex-1 bg-orange-500 hover:bg-orange-600">Próximo</Button>
      </div>
    </div>
  );
}

export default CriarPedidoStep2;