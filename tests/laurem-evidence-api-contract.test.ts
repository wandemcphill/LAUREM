import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('LAUREM evidence API contract', () => {
  const route = readFileSync(resolve(process.cwd(), 'app/api/admin/evidence/route.ts'), 'utf8');
  const migration = readFileSync(resolve(process.cwd(), 'supabase/migrations/20260909_evidence_lifecycle.sql'), 'utf8');

  it('calls the deployed evidence RPC with its actual seven-argument signature', () => {
    expect(route).toContain('p_application_id: applicationId');
    expect(route).toContain('p_evidence_type: evidenceType');
    expect(route).toContain('p_document_id: documentId');
    expect(route).toContain('p_status: status');
    expect(route).toContain('p_actor: session.email');
    expect(route).toContain('p_note: note || null');
    expect(route).toContain('p_metadata: typeof body?.metadata === \'object\' && body.metadata !== null ? body.metadata : {}');
    expect(route).not.toContain('p_readiness_item_key');
    expect(route).not.toContain('p_expires_at');
  });

  it('does not request an evidence-review expiry column that the schema lacks', () => {
    expect(route).not.toContain('metadata,expires_at,created_at,updated_at');
    expect(migration).not.toContain('expires_at timestamptz');
  });
});
