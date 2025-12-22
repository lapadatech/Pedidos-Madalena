import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isPlaceholder = (value) =>
  typeof value === 'string' &&
  (value.includes('your-project-url') || value.includes('your-anon-key'));

if (
  !supabaseUrl ||
  !supabaseAnonKey ||
  isPlaceholder(supabaseUrl) ||
  isPlaceholder(supabaseAnonKey)
) {
  // Fail fast to avoid silent misconfig when envs are missing or still using sample placeholders.
  throw new Error(
    'Supabase URL/Anon key not configured. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY com valores reais.'
  );
}

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { customSupabaseClient, customSupabaseClient as supabase };
