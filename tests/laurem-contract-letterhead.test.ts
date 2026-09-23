import { describe, expect, it } from 'vitest';
import { renderLauremContractDocument, renderLauremPrintableContractHtml } from '@/lib/laurem-contract-document-renderer';

const standard = `CONTRACT OF EMPLOYMENT (GUARANTEED MINIMUM HOURS)

Employer: Laurem Caregroup Ltd
Employee: Alul Dominic
Job title: Healthcare Assistant

1. COMMENCEMENT OF EMPLOYMENT
Employment begins on 1 January 2027.

2. JOB TITLE AND DESCRIPTION OF WORK
Your job title is Healthcare Assistant.

EMPLOYER AUTHORITY
For and on behalf of Laurem Caregroup Ltd
Name: Dezou Maurice
Title: Manager

EMPLOYEE ACCEPTANCE
Employee name: Alul Dominic
Employee acceptance: To be completed electronically
`;

describe('LAUREM employment contract letterhead', () => {
  it('renders a formal UK company letterhead and preserves contract clauses', () => {
    const html = renderLauremContractDocument({
      content: standard,
      employeeName: 'Alul Dominic',
      jobTitle: 'Healthcare Assistant',
      status: 'issued',
      version: 1,
    });

    expect(html).toContain('LAUREM CAREGROUP');
    expect(html).toContain('LAUREM CARE GROUP LIMITED');
    expect(html).toContain('Company No. SC490520');
    expect(html).toContain('557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE');
    expect(html).toContain('<span class="laurem-contract-number">1</span>'); 
    expect(html).toContain('COMMENCEMENT OF EMPLOYMENT');
    expect(html).not.toContain('<pre>');
    expect(html).toContain('</div></section>');
  });

  it('renders an electronic signature record for an accepted contract', () => {
    const html = renderLauremContractDocument({
      content: standard,
      employeeName: 'Alul Dominic',
      jobTitle: 'Healthcare Assistant',
      status: 'accepted',
      acceptedByName: 'Alul Dominic',
      acceptedAt: '2026-09-23T21:00:00.000Z',
    });

    expect(html).toContain('ELECTRONIC SIGNATURE RECORD');
    expect(html).toContain('Contract accepted electronically');
    expect(html).toContain('Alul Dominic');
  });

  it('provides print-ready HTML', () => {
    const html = renderLauremPrintableContractHtml({
      content: standard,
      employeeName: 'Alul Dominic',
      jobTitle: 'Healthcare Assistant',
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('@page{size:A4');
  });
});
