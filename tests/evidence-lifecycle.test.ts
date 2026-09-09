import { describe, expect, it } from 'vitest';

function readinessKeyForEvidenceType(evidenceType: string) {
  const key = evidenceType.trim().toLowerCase().replace(/\s+/g, '_');
  const aliases: Record<string, string> = {
    identity: 'identity_verified',
    identity_document: 'identity_verified',
    passport: 'identity_verified',
    qualification: 'qualification_evidence_verified',
    qualification_evidence: 'qualification_evidence_verified',
    training: 'qualification_evidence_verified',
    reference: 'references_verified',
    references: 'references_verified',
    right_to_work: 'right_to_work_verified',
    work_permission: 'international_work_permission_verified',
    international_work_permission: 'international_work_permission_verified',
    nmc_registration: 'professional_registration_verified',
    professional_registration: 'professional_registration_verified',
  };
  return aliases[key] || null;
}

describe('recruitment evidence lifecycle mapping', () => {
  it('maps identity evidence to the identity readiness gate', () => {
    expect(readinessKeyForEvidenceType('Passport')).toBe('identity_verified');
  });

  it('maps registration evidence to the professional registration gate', () => {
    expect(readinessKeyForEvidenceType('NMC Registration')).toBe('professional_registration_verified');
  });

  it('maps international work permission independently from general right to work', () => {
    expect(readinessKeyForEvidenceType('International Work Permission')).toBe('international_work_permission_verified');
  });

  it('does not invent a readiness gate for unknown evidence', () => {
    expect(readinessKeyForEvidenceType('Reference Letter')).toBeNull();
  });
});
