import { createClient } from '@supabase/supabase-js';

// Safely access env vars. Cast import.meta to any to avoid TS errors if vite types are missing.
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Fallback to avoid crashes if env vars are missing, but features won't work
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);