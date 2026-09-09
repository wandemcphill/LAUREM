import type { SupabaseClient } from '@supabase/supabase-js';

export const REQUIRED_ENVIRONMENT = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ADMIN_SESSION_SECRET',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD',
] as const;

export const EXPECTED_PORTAL_TABLES = [
  'recruitment_invites',
  'recruitment_applications',
  'recruitment_interviews',
  'recruitment_second_interviews',
  'recruitment_status_history',
  'recruitment_document_requests',
  'recruitment_documents',
  'recruitment_contracts',
  'recruitment_contract_tokens',
  'recruitment_evidence_reviews',
  'recruitment_evidence_audit',
  'recruitment_admin_actions',
  'staff_profiles',
  'staff_portal_sessions',
  'staff_security_events',
  'staff_availability',
  'staff_assignments',
  'staff_timesheets',
  'notification_deliveries',
] as const;

export const REQUIRED_PRIVATE_BUCKET = 'laurem-private-documents';

export type ReleaseHealth = {
  ok: boolean;
  timestamp: string;
  release: { commit: string | null; environment: string };
  dependencies: {
    environment: { ok: boolean; missing: string[] };
    database: { ok: boolean; latencyMs: number; error: string | null };
    schema: { ok: boolean; missing: string[] };
    storage: { ok: boolean; bucketPresent: boolean; error: string | null };
  };
};

function releaseCommit() {
  return (
    process.env.RENDER_GIT_COMMIT
    || process.env.RENDER_GIT_COMMIT_SHA
    || process.env.VERCEL_GIT_COMMIT_SHA
    || process.env.GIT_COMMIT_SHA
    || null
  );
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown dependency error.';
}

export async function checkReleaseHealth(client: SupabaseClient): Promise<ReleaseHealth> {
  const timestamp = new Date().toISOString();
  const missingEnvironment = REQUIRED_ENVIRONMENT.filter((key) => !process.env[key]?.trim());

  const started = Date.now();
  const { error: databaseError } = await client.from('recruitment_applications').select('id', { head: true, count: 'exact' });
  const latencyMs = Date.now() - started;

  const schemaResults = await Promise.all(
    EXPECTED_PORTAL_TABLES.map(async (table) => {
      const { error } = await client.from(table).select('*', { head: true, count: 'exact' });
      return { table, error };
    }),
  );
  const missingTables = schemaResults.filter(({ error }) => Boolean(error)).map(({ table }) => table);

  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  const bucketPresent = Array.isArray(buckets) && buckets.some((bucket) => bucket.name === REQUIRED_PRIVATE_BUCKET);

  const databaseOk = !databaseError;
  const schemaOk = missingTables.length === 0;
  const storageOk = !bucketError && bucketPresent;
  const environmentOk = missingEnvironment.length === 0;

  return {
    ok: environmentOk && databaseOk && schemaOk && storageOk,
    timestamp,
    release: {
      commit: releaseCommit(),
      environment: process.env.NODE_ENV || 'unknown',
    },
    dependencies: {
      environment: { ok: environmentOk, missing: missingEnvironment },
      database: { ok: databaseOk, latencyMs, error: databaseError ? errorMessage(databaseError) : null },
      schema: { ok: schemaOk, missing: missingTables },
      storage: { ok: storageOk, bucketPresent, error: bucketError ? errorMessage(bucketError) : null },
    },
  };
}
