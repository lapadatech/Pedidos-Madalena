import React, { useState } from 'react';
import { Search, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UppercaseInput } from '@/components/ui/UppercaseInput';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { buscarClientePorCelular } from '@/lib/api';
import { criarCliente } from '@/lib/api';

function CriarPedidoStep1({ onProximo, dadosIniciais }) {
  const [celular, setCelular] = useState(dadosIniciais.cliente?.celular || '');
  const [clienteEncontrado, setClienteEncontrado] = useState(dadosIniciais.cliente);
  const [mostrarCadastro, setMostrarCadastro] = useState(false);
  const [nomeCliente, setNomeCliente] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const formatarCelular = (valor) => {
    if (!valor) return ''; // Adiciona validação para valor undefined/null
    const digitos = valor.replace(/\D/g, '');
    let formatado = '';
    if (digitos.length > 0) {
      formatado = `(${digitos.substring(0, 2)}`;
    }
    if (digitos.length > 2) {
      formatado += `) ${digitos.substring(2, 7)}`;
    }
    if (digitos.length > 7) {
      formatado += `-${digitos.substring(7, 11)}`;
    }
    return formatado;
  };

  const handleCelularChange = (e) => {
    setCelular(formatarCelular(e.target.value));
  };

  const handleBuscar = async () => {
    if (celular.replace(/\D/g, '').length < 11) {
      toast({
        title: 'Celular inválido',
        description: 'Digite um número de celular com 11 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const cliente = await buscarClientePorCelular(celular);
      if (cliente) {
        setClienteEncontrado(cliente);
        setMostrarCadastro(false);
        toast({ title: 'Cliente encontrado!' });
      } else {
        setClienteEncontrado(null);
        setMostrarCadastro(true);
        toast({
          title: 'Cliente não encontrado',
          description: 'Cadastre um novo cliente abaixo.',
          variant: 'default',
        });
      }
    } catch (error) {
      toast({
        title: 'Erro ao buscar cliente',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCadastroRapido = async () => {
    if (!nomeCliente) {
      toast({ title: 'Digite o nome do cliente', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const [novoCliente] = await criarCliente({
        nome: nomeCliente,
        celular: celular.replace(/\D/g, ''),
      });
      setClienteEncontrado(novoCliente);
      setMostrarCadastro(false);
      toast({ title: 'Cliente cadastrado com sucesso!' });
    } catch (error) {
      toast({
        title: 'Erro ao cadastrar cliente',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleProximo = () => {
    if (!clienteEncontrado) {
      toast({ title: 'Selecione um cliente para continuar', variant: 'destructive' });
      return;
    }
    onProximo({ cliente: clienteEncontrado });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="celular">Celular do Cliente</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="celular"
            placeholder="(99) 99999-9999"
            value={celular}
            onChange={handleCelularChange}
            maxLength="15"
            disabled={loading}
          />
          <Button
            onClick={handleBuscar}
            disabled={loading}
            className="bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {clienteEncontrado && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <h3 className="font-semibold text-green-900">Cliente Selecionado</h3>
          <p className="text-sm text-green-700 mt-1">{clienteEncontrado.nome}</p>
          {/* A chamada para formatarCelular aqui já está protegida pelo clienteEncontrado && */}
          <p className="text-sm text-green-600">{formatarCelular(clienteEncontrado.celular)}</p>
        </div>
      )}

      {mostrarCadastro && (
        <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg space-y-4">
          <h3 className="font-semibold text-orange-900">Cadastro Rápido</h3>
          <div>
            <Label htmlFor="nome">Nome do Cliente</Label>
            <UppercaseInput
              id="nome"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              placeholder="Digite o nome completo"
              disabled={loading}
            />
          </div>
          <Button
            onClick={handleCadastroRapido}
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Cadastrar e Selecionar
          </Button>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <Button
          onClick={handleProximo}
          disabled={!clienteEncontrado || loading}
          className="bg-orange-500 hover:bg-orange-600"
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}

export default CriarPedidoStep1;
