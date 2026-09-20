import { describe, expect, it } from 'vitest';
import { buildLauremVisaReadiness, canAdvanceLauremVisaToSmsSubmission } from '@/lib/laurem-visa-readiness';

const base = {
  pathway: 'visa_switch',
  staff: { id: 'staff-1' },
  application: { id: 'application-1' },
  additionalInformation: {
    passport_number: 'P1234567',
    passport_expiry_date: '2030-12-01',
    passport_country: 'NG',
    current_visa_type: 'Graduate',
    current_visa_expiry_date: '2027-06-01',
  },
};

// The readiness contract is deliberately application-level because the underlying visa case schema is already sufficient.
describe('LAUREM visa operational readiness', () => {
  it('requires linked identity, passport data, current switch-route visa data and paid invoice', () => {
    const notReady = buildLauremVisaReadiness({ ...base, invoiceStatus: 'issued' });
    expect(notReady.ready).toBe(false);
    expect(notReady.missing).toContain('LAUREM sponsorship-support invoice is paid');

    const ready = buildLauremVisaReadiness({ ...base, invoiceStatus: 'paid' });
    expect(ready.ready).toBe(true);
    expect(ready.readyForSmsSubmission).toBe(true);
    expect(ready.missing).toEqual([]);
  });

  it('does not require current UK visa fields for international sponsorship', () => {
    const ready = buildLauremVisaReadiness({
      ...base,
      pathway: 'international_sponsorship',
      additionalInformation: {
        passport_number: 'P1234567',
        passport_expiry_date: '2030-12-01',
        passport_country: 'NG',
      },
      invoiceStatus: 'paid',
    });
    expect(ready.ready).toBe(true);
  });

  it('gates SMS preparation and submission on readiness', () => {
    const notReady = buildLauremVisaReadiness({ ...base, invoiceStatus: 'issued' });
    const ready = buildLauremVisaReadiness({ ...base, invoiceStatus: 'paid' });

    expect(canAdvanceLauremVisaToSmsSubmission({ targetStatus: 'preparing_sms', readiness: notReady })).toBe(false);
    expect(canAdvanceLauremVisaToSmsSubmission({ targetStatus: 'submitted_to_sms', readiness: notReady })).toBe(false);
    expect(canAdvanceLauremVisaToSmsSubmission({ targetStatus: 'preparing_sms', readiness: ready })).toBe(true);
    expect(canAdvanceLauremVisaToSmsSubmission({ targetStatus: 'submitted_to_sms', readiness: ready })).toBe(true);
    expect(canAdvanceLauremVisaToSmsSubmission({ targetStatus: 'admin_review', readiness: notReady })).toBe(true);
  });
});
