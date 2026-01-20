import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO MANUAL (FALLBACK) ---
const FALLBACK_URL = "https://imgpdjyflxwwefrgjtuf.supabase.co";
const FALLBACK_KEY = "sb_publishable_geGSBug8uIrvL125I7P7Rg_ZnaIf7IF";

// 1. Tenta pegar do .env (Vite)
const env = (import.meta as any).env || {};
let supabaseUrl = env.VITE_SUPABASE_URL;
let supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

// Se as variáveis de ambiente estiverem vazias ou forem placeholders, usa o Fallback manual
if (!supabaseUrl || supabaseUrl.includes('sua_url')) {
  supabaseUrl = FALLBACK_URL;
}
if (!supabaseAnonKey || supabaseAnonKey.includes('sua_anon_key')) {
  supabaseAnonKey = FALLBACK_KEY;
}

// 2. LocalStorage (Opcional)
const localUrl = localStorage.getItem('gaimi_supabase_url');
const localKey = localStorage.getItem('gaimi_supabase_key');

if (localUrl && localKey && localUrl.length > 10) {
  supabaseUrl = localUrl;
  supabaseAnonKey = localKey;
}

// Como temos chaves hardcoded, assumimos que está sempre configurado
export const isConfigured = () => {
  return true; 
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (!url || !key) return;
  localStorage.setItem('gaimi_supabase_url', url.trim());
  localStorage.setItem('gaimi_supabase_key', key.trim());
  window.location.reload(); 
};

export const resetSupabaseConfig = () => {
  localStorage.removeItem('gaimi_supabase_url');
  localStorage.removeItem('gaimi_supabase_key');
  window.location.reload();
};

// Se por acaso as urls estiverem vazias, usa o fallback
const finalUrl = supabaseUrl || FALLBACK_URL;
const finalKey = supabaseAnonKey || FALLBACK_KEY;

export const supabase = createClient(finalUrl, finalKey);