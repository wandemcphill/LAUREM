import type { Job } from '@/lib/recruitment-types';

export const LAUREM_JOBS: Job[] = [
  {
    id: 'healthcare-assistant',
    title: 'Healthcare Assistant',
    category: 'Care',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk'],
    sponsorshipAvailable: true,
    visaSponsorship: 'in-country-switch-only',
    active: true,
    summary: 'Provide compassionate, person-centred support that helps people live safely and independently.',
    description: 'Healthcare Assistant work supporting personal care, wellbeing, nutrition, mobility, medication support where trained, safeguarding and accurate record keeping. Any visa sponsorship route is limited to eligible applicants already in the UK and applying to switch or extend in-country under the applicable immigration rules.',
    essentialCriteria: ['Compassionate and respectful approach', 'Relevant care or support experience', 'Good communication and safeguarding awareness', 'Reliable and able to work as part of a care team'],
  },
  {
    id: 'support-worker',
    title: 'Support Worker',
    category: 'Support',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk'],
    sponsorshipAvailable: true,
    visaSponsorship: 'in-country-switch-only',
    active: true,
    summary: 'Support people with dignity, safety and independence across care and community settings.',
    description: 'Support Worker opportunities involving person-centred support, safeguarding, wellbeing, daily living, record keeping and teamwork. Any visa sponsorship route is limited to eligible applicants already in the UK and applying to switch or extend in-country under the applicable immigration rules.',
    essentialCriteria: ['Relevant care or support experience', 'Safeguarding awareness', 'Strong communication and reliability', 'Commitment to person-centred practice'],
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
    id: 'registered-nurse',
    title: 'Registered Nurse',
    category: 'Nursing',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk', 'international'],
    sponsorshipAvailable: true,
    visaSponsorship: 'overseas-and-in-country',
    active: true,
    summary: 'Join Laurem Caregroup as a Registered Nurse through the appropriate UK or international recruitment pathway.',
    description: 'Registered nursing opportunities for qualified nurses applying from the UK or through international recruitment. Sponsorship, professional registration and relocation are subject to individual eligibility and the applicable UK requirements.',
    essentialCriteria: ['Recognised nursing qualification', 'Relevant clinical or nursing experience', 'Appropriate professional registration pathway', 'Strong communication and safeguarding awareness', 'Commitment to person-centred care'],
  },
  {
    id: 'physiotherapist',
    title: 'Physiotherapist',
    category: 'Allied Health',
    locations: ['London', 'Glasgow', 'Manchester', 'West Midlands'],
    pathway: ['uk'],
    sponsorshipAvailable: false,
    visaSponsorship: 'none',
    active: true,
    summary: 'Deliver safe, evidence-informed physiotherapy that supports mobility, recovery and independence.',
    description: 'Physiotherapy opportunities focused on assessment, rehabilitation, mobility, treatment planning, safe documentation and multidisciplinary teamwork.',
    essentialCriteria: ['Recognised physiotherapy qualification', 'Appropriate professional registration', 'Relevant clinical experience', 'Strong communication and safeguarding awareness'],
  },
];

const LEGACY_JOB_ALIASES: Record<string, string> = {
  'registered-nurse-uk': 'registered-nurse',
  'registered-nurse-international': 'registered-nurse',
  'care-worker': 'healthcare-assistant',
};

export function getLauremJob(jobId: string): Job | undefined {
  const canonicalId = LEGACY_JOB_ALIASES[jobId] || jobId;
  return LAUREM_JOBS.find((job) => job.id === canonicalId);
}

export function getActiveLauremJobs(): Job[] {
  return LAUREM_JOBS.filter((job) => job.active);
}
