import { describe, expect, it } from 'vitest';
import { lauremCompany } from '@/lib/laurem-company-config';
import { LAUREM_LETTERHEAD, renderLauremLetterhead, renderLauremLetterheadFooter } from '@/lib/laurem-letterhead';
import { renderLauremContract } from '@/lib/laurem-contract';
import { renderLauremInternationalNurseContract } from '@/lib/laurem-international-nurse-contract';
import fs from 'fs';
import path from 'path';

describe('Laurem Company Source of Truth & Anti-Drift Guards', () => {
  it('enforces lauremCompany as the canonical single source of truth', () => {
    expect(lauremCompany.legalName).toBe('Laurem Care Group Limited');
    expect(lauremCompany.tradingName).toBe('Laurem Caregroup');
    expect(lauremCompany.companyNumber).toBe('SC490520');
    expect(lauremCompany.registration).toBe('Registered in Scotland');
    expect(lauremCompany.registeredOffice).toBe('557 Parkhouse Road, Barrhead, Glasgow, Scotland, G78 1TE');
    expect(lauremCompany.website).toBe('https://lauremcare.com');
    expect(lauremCompany.publicEmails.recruitment).toBe('recruitment@lauremcare.com');
    expect(lauremCompany.documentIssuer.employer).toBe('Laurem Care Group Limited');
  });

  it('derives letterhead identity directly from lauremCompany', () => {
    expect(LAUREM_LETTERHEAD.legalName).toBe(lauremCompany.legalName);
    expect(LAUREM_LETTERHEAD.tradingName).toBe(lauremCompany.tradingName);
    expect(LAUREM_LETTERHEAD.companyNumber).toBe(lauremCompany.companyNumber);
    expect(LAUREM_LETTERHEAD.registration).toBe(lauremCompany.registration);
    expect(LAUREM_LETTERHEAD.registeredOffice).toBe(lauremCompany.registeredOffice);
    expect(LAUREM_LETTERHEAD.email).toBe(lauremCompany.publicEmails.recruitment);
    expect(LAUREM_LETTERHEAD.website).toBe('lauremcare.com');

    const headerHtml = renderLauremLetterhead({ title: 'Test Document' });
    const footerHtml = renderLauremLetterheadFooter();

    expect(headerHtml).toContain(lauremCompany.legalName);
    expect(headerHtml).toContain(lauremCompany.companyNumber);
    expect(headerHtml).toContain(lauremCompany.registeredOffice);
    expect(footerHtml).toContain(lauremCompany.legalName);
    expect(footerHtml).toContain(lauremCompany.companyNumber);
    expect(footerHtml).toContain(lauremCompany.registeredOffice);
  });

  it('generates standard and international nurse contracts using Laurem Care Group Limited without drift', () => {
    const stdContract = renderLauremContract({
      employeeName: 'Test Employee',
      jobTitle: 'Healthcare Assistant',
    });

    expect(stdContract).toContain('Employer: Laurem Care Group Limited');
    expect(stdContract).toContain('For and on behalf of Laurem Care Group Limited');
    expect(stdContract).not.toContain('Laurem Caregroup Ltd');

    const nurseContract = renderLauremInternationalNurseContract({
      employeeName: 'Nurse Candidate',
      jobTitle: 'Registered Nurse',
    });

    expect(nurseContract).toContain('Employer: Laurem Care Group Limited');
    expect(nurseContract).toContain('For and on behalf of Laurem Care Group Limited');
    expect(nurseContract).not.toContain('Laurem Caregroup Ltd');
  });

  it('verifies that no active application code contains "Laurem Caregroup Ltd"', () => {
    const rootDir = process.cwd();
    const directoriesToScan = ['lib', 'app', 'components', 'docs'];

    const scannedFiles: string[] = [];

    function scanDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (entry.isFile() && /\.(ts|tsx|js|jsx|md)$/.test(entry.name)) {
          scannedFiles.push(fullPath);
        }
      }
    }

    for (const d of directoriesToScan) {
      const full = path.join(rootDir, d);
      if (fs.existsSync(full)) scanDir(full);
    }

    const driftedFiles: string[] = [];
    for (const file of scannedFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (content.includes('Laurem Caregroup Ltd')) {
        driftedFiles.push(path.relative(rootDir, file));
      }
    }

    expect(driftedFiles).toEqual([]);
  });
});
