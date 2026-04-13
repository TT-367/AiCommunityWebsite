import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { FORCE_MOCK_POSTS } from '../config/featureFlags';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

let client: SupabaseClient;
if (!supabaseUrl || !supabaseAnonKey) {
  if (FORCE_MOCK_POSTS) {
    client = new Proxy(
      {} as SupabaseClient,
      {
        get() {
          throw new Error('Supabase is not configured (running in mock mode)');
        },
      }
    ) as unknown as SupabaseClient;
  } else {
    throw new Error('Missing Supabase env vars: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY');
  }
} else {
  client = createClient(supabaseUrl, supabaseAnonKey);
}

export const supabase = client;
