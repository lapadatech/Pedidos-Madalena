import React from 'react';
import { supabase } from '@/shared/lib/customSupabaseClient';
import { toast } from '@/shared/ui/use-toast';
import { ToastAction } from '@/shared/ui/toast';

// Sanitizes search terms for ilike queries.
const safeTerm = (term) => (term || '').trim().replace(/[%']/g, '');

const handleApiError = (error, context = 'operacao') => {
  console.error(`Erro na ${context}:`, error);

  if (error?.message?.includes('Invalid Refresh Token')) {
    throw error;
  }

  const errorMessage = error.message?.includes('Function returned an error')
    ? JSON.parse(error.message.split(': ')[1]).error
    : error.message;

  const action = React.createElement(
    ToastAction,
    {
      altText: 'Recarregar',
      onClick: () => window.location.reload(),
    },
    'Recarregar'
  );

  toast({
    title: `Erro ao executar ${context}`,
    description: errorMessage || 'Ocorreu um erro. Tente novamente.',
    variant: 'destructive',
    action,
  });

  throw new Error(errorMessage);
};

const genericFetch = async (table, options = {}) => {
  const { method = 'select', data = null, id = null, select = '*' } = options;
  let query = supabase.from(table);

  try {
    switch (method) {
      case 'select':
        query = query.select(select, { count: 'exact' });
        break;
      case 'insert':
        query = query.insert(data).select(select);
        break;
      case 'update':
        query = query.update(data).eq('id', id).select(select);
        break;
      case 'delete':
        query = query.delete().eq('id', id);
        break;
      default:
        throw new Error(`Metodo invalido: ${method}`);
    }

    const { data: result, error, count } = await query;
    if (error) throw error;

    if (method === 'select') return { data: result, count };
    return result;
  } catch (error) {
    handleApiError(error, `genericFetch ${method} em ${table}`);
  }
};

export { safeTerm, handleApiError, genericFetch, supabase };
