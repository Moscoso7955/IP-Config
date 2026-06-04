import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Owner Vis is a single-user tool with no auth, so we don't need the SSR
 * cookie dance — a plain supabase-js client with the anon key is enough.
 * Permissive RLS (or no RLS) on the two tables means the anon key can read
 * and write directly. If you ever bolt auth on, swap to @supabase/ssr.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY env vars. See README.",
    );
  }
  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
