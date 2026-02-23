import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
export const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || (import.meta as any).env.VITE_SUPABASE_ANO || '';

let supabaseClient: any = null;

export const getSupabase = () => {
  if (!supabaseClient && supabaseUrl && supabaseAnonKey) {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseClient;
};

export const supabase = getSupabase(); // For backward compatibility, might be null
