import { handleApiError, supabase } from '@/shared/lib/apiBase';

export const contarRegistros = async (table, filters = []) => {
  try {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });

    filters.forEach((filter) => {
      if (filter.column && filter.operator && filter.value !== undefined) {
        query = query[filter.operator](filter.column, filter.value);
      }
    });

    const { count, error } = await query;
    if (error) throw error;

    return count;
  } catch (error) {
    handleApiError(error, `contar registros em ${table}`);
  }
};
