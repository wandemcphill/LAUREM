import fs from 'node:fs';
import path from 'node:path';
import { renderLauremJobDescription } from '@/lib/laurem-job-description';
import { lauremRoleSlug } from '@/lib/laurem-role-policy';

function readHandbook(relativePath: string) {
  return fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

const STANDARD_HANDBOOK = `# Laurem Caregroup
## Staff Handbook

**Audience:** Employees joining Laurem Caregroup Ltd.

This handbook complements your employment contract and sets out the core expectations for safe, respectful and professional work.

### Working safely
Follow care plans, safeguarding procedures, infection-control requirements, health and safety rules and all lawful instructions relevant to your role. Work only within your training, competence, registration and contractual scope.

### Person-centred care
Treat every service user with dignity, privacy, respect and compassion. Support choice, independence and lawful preferences.

### Safeguarding and concerns
Report safeguarding concerns, accidents, medication incidents, complaints and other serious risks promptly through the LAUREM escalation route. Do not investigate allegations yourself or promise secrecy.

### Attendance, rota and timesheets
Use the LAUREM workforce platform for rota information, attendance, assignments, timesheets and approved leave where instructed. Notify your designated LAUREM contact promptly if you cannot attend work.

### Confidentiality
Protect service-user, colleague and LAUREM information. Do not copy, publish or share confidential information through personal or public channels.

### Training and professional development
Complete mandatory induction, safeguarding, role-specific training and competency requirements within the required timescales.

### Equality, dignity and inclusion
LAUREM expects respectful treatment of colleagues and service users. Discrimination, harassment, bullying and exploitation are not acceptable.

### Support
Use your manager, LAUREM messages and the Staff Portal for operational support. Raise concerns early.

### Acknowledgement
I confirm that I have read this handbook, understand it, and agree to comply with the employment contract, LAUREM policies, safeguarding requirements and lawful role expectations.
`;

export function getLauremRecruitmentDocumentPack(input: {
  role: string;
  staffName: string;
  livingInUk?: string | null;
}) {
  const roleSlug = lauremRoleSlug(input.role);
  const jobDescription = renderLauremJobDescription(input.role, input.staffName);

  let handbookTitle = 'Laurem Staff Handbook';
  let handbookContent = STANDARD_HANDBOOK;

  if (roleSlug === 'healthcare-assistant' && input.livingInUk === 'No') {
    handbookTitle = 'Laurem Sponsored Healthcare Assistant Handbook';
    handbookContent = readHandbook('docs/handbooks/laurem-sponsored-hca-handbook.md');
  } else if (roleSlug === 'registered-nurse' && input.livingInUk === 'No') {
    handbookTitle = 'Laurem Overseas Registered Nurse Handbook';
    handbookContent = readHandbook('docs/handbooks/laurem-overseas-nurse-handbook.md');
  }

  return {
    jobDescriptionTitle: input.role.trim() + ' Job Description',
    jobDescription,
    handbookTitle,
    handbookContent,
  };
}

export const LAUREM_RECRUITMENT_DOCUMENT_ATTESTATION =
  'I confirm that I have read this document, understand it, and agree to sign it electronically.';
