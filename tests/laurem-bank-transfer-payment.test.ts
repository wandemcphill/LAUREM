import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (file: string) => readFileSync(resolve(process.cwd(), file), 'utf8');

describe('LAUREM bank transfer invoice payment flow', () => {
  it('uses the supplied bank details in the staff portal', () => {
    const source = read('app/staff/visa-sponsorship/page.tsx');

    for (const value of [
      'WEBGEEK TECHNOLOGIES LTD',
      '00008988',
      '040997',
      'CLRBGB22479',
      'GB62CLRB04099700008988',
      'United Kingdom',
      'CLEARBANK LIMITED',
      'The Broadgate Tower, 20 Primrose Street, London, EC2A 2EW',
    ]) {
      expect(source).toContain(value);
    }

    expect(source).toContain('payment_reference');
    expect(source).toContain('data.staff?.laurem_id');
    expect(source).not.toContain('paymentUrl');
    expect(source).not.toContain('payssion.com');
  });

  it('wires LAUREM ID into future invoice payment references', () => {
    const migration = read('supabase/migrations/20261007213000_laurem_bank_transfer_payment_details.sql');

    expect(migration).toContain('payment_reference');
    expect(migration).toContain('v_staff.laurem_id');
    expect(migration).toContain('STAFF_LAUREM_ID_MISSING');
    expect(migration).toContain('payment_url = null');
    expect(migration).not.toContain('payssion.com');
    expect(migration).not.toContain('buy.stripe.com');
  });
});
