import { createClient } from '@supabase/supabase-js';

let client: ReturnType<typeof createClient<any>> | null = null;

/**
 * Server-only Supabase client.
 *
 * The recruitment schema is maintained in repository migrations, so generated
 * Database types are intentionally not required at this stage. Keeping the
 * server client schema-agnostic lets migrations evolve without making the
 * application code depend on a stale generated type definition.
 */
export function db() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server environment is not configured.');
  client = createClient<any>(url, key, {
    auth: { persistSession: false },
  });
  return client;
}
