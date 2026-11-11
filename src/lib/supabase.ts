import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const rawSupabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
    rawSupabaseAnonKey &&
    !rawSupabaseUrl.includes('placeholder') &&
    !rawSupabaseAnonKey.includes('placeholder')
);

// Fallback to placeholder during build/static-generation if env vars are missing
const supabaseUrl = rawSupabaseUrl || 'https://placeholder.supabase.co';
const supabaseAnonKey = rawSupabaseAnonKey || 'placeholder-anon-key';

// Client using anon key (used in browser client & realtime subscriptions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Server client (used in Next.js server-side API routes).
// If SUPABASE_SERVICE_ROLE_KEY is provided in environment variables, it uses it to bypass
// Row Level Security (RLS) entirely. Otherwise, it falls back to the anon key.
export const supabaseServer = createClient(
  supabaseUrl,
  rawSupabaseServiceRoleKey || supabaseAnonKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export const REGISTRATION_CAP = Number(process.env.REGISTRATION_CAP) || 100;
export const SHORTLIST_COUNT = Number(process.env.SHORTLIST_CAP) || 40;
