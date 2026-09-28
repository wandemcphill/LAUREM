import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('candidate contract decline lifecycle', () => {
  it('ends the application on Rejected and does not continue into Documents', () => {
    const route = readFileSync('app/api/contracts/accept/route.ts', 'utf8');
    const declineIndex = route.indexOf("if (action === 'decline')");
    const rejectionIndex = route.indexOf("p_to_status: 'Rejected'", declineIndex);
    const declineReturnIndex = route.indexOf("return NextResponse.json({ ok: true, status: 'declined' });", rejectionIndex);
    const documentsIndex = route.indexOf("p_to_status: 'Documents'", declineIndex);

    expect(declineIndex).toBeGreaterThan(-1);
    expect(rejectionIndex).toBeGreaterThan(declineIndex);
    expect(declineReturnIndex).toBeGreaterThan(rejectionIndex);
    expect(documentsIndex).toBeGreaterThan(-1);
    expect(documentsIndex).toBeGreaterThan(declineReturnIndex);
  });
});
