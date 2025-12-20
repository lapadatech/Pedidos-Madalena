import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fuxrcfneytzxephieutp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ1eHJjZm5leXR6eGVwaGlldXRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4OTQ4NTMsImV4cCI6MjA3ODQ3MDg1M30.3K4wB_n8d7ObScOZ1q2ixKMwU7ifETxKib6G7oqYxCU';

const customSupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export default customSupabaseClient;

export { 
    customSupabaseClient,
    customSupabaseClient as supabase,
};
