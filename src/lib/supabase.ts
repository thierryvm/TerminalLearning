import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../app/types/database';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase client — null when env vars are not configured.
 * App falls back to localStorage-only mode in that case.
 */
export const supabase: SupabaseClient<Database> | null =
  url && key ? createClient<Database>(url, key) : null;
