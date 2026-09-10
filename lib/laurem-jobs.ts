import type { Job } from '@/lib/recruitment-types';

export const LAUREM_JOBS: Job[] = [
  {
    id: 'registered-nurse-uk',
    title: 'Registered Nurse',
    category: 'Nursing',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk'],
    sponsorshipAvailable: false,
    visaSponsorship: 'none',
    active: true,
    summary: 'Join Laurem Caregroup as a Registered Nurse and deliver safe, person-centred care.',
    description: 'Registered nursing opportunities for applicants who already have the right to work in the UK.',
    essentialCriteria: ['Current professional nursing registration appropriate to the role', 'Relevant nursing experience', 'Strong communication and safeguarding awareness', 'Commitment to person-centred care'],
  },
  {
    id: 'registered-nurse-international',
    title: 'Registered Nurse - International Recruitment',
    category: 'Nursing',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['international'],
    sponsorshipAvailable: true,
    visaSponsorship: 'overseas-and-in-country',
    active: true,
    summary: 'International nurse recruitment with a structured UK sponsorship and relocation pathway.',
    description: 'Opportunities for qualified nurses applying from outside the UK. Sponsorship and relocation are subject to eligibility, verification and the applicable UK immigration requirements.',
    essentialCriteria: ['Recognised nursing qualification', 'Eligible professional registration pathway', 'Relevant clinical experience', 'English-language readiness where required', 'Willingness to relocate to the UK'],
  },
  {
    id: 'senior-support-worker',
    title: 'Senior Support Worker',
    category: 'Support',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk'],
    sponsorshipAvailable: true,
    visaSponsorship: 'in-country-switch-only',
    active: true,
    summary: 'Lead and support care delivery while promoting dignity, safety and independence.',
    description: 'Senior support work involving care delivery, oversight, safeguarding, medication support, record keeping and teamwork. Any visa sponsorship route is limited to eligible applicants already in the UK and applying to switch or extend in-country under the applicable immigration rules.',
    essentialCriteria: ['Relevant care experience', 'Safeguarding awareness', 'Good communication and organisation', 'Ability to work independently and as part of a team'],
  },
  {
    id: 'care-worker',
    title: 'Care Worker',
    category: 'Care',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk'],
    sponsorshipAvailable: true,
    visaSponsorship: 'in-country-switch-only',
    active: true,
    summary: 'Provide compassionate, person-centred support to people in the community and care settings.',
    description: 'Care work supporting personal care, wellbeing, nutrition, mobility, medication support where trained and safeguarding. Any visa sponsorship route is limited to eligible applicants already in the UK and applying to switch or extend in-country under the applicable immigration rules.',
    essentialCriteria: ['Compassionate approach', 'Good communication', 'Reliability and flexibility', 'Commitment to safeguarding and confidentiality'],
  },
];

export function getLauremJob(jobId: string): Job | undefined {
  return LAUREM_JOBS.find((job) => job.id === jobId);
}

export function getActiveLauremJobs(): Job[] {
  return LAUREM_JOBS.filter((job) => job.active);
}
