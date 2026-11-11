import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
    rawSupabaseAnonKey &&
    !rawSupabaseUrl.includes('placeholder') &&
    !rawSupabaseAnonKey.includes('placeholder')
);

// Fallback to placeholder during build/static-generation if env vars are missing
const supabaseUrl = rawSupabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawSupabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const REGISTRATION_CAP = Number(process.env.REGISTRATION_CAP) || 100;
export const SHORTLIST_COUNT = Number(process.env.SHORTLIST_CAP) || 40;
