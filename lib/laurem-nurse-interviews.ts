export type InterviewQuestion = {
  id: string;
  category: string;
  text: string;
  guidance?: string;
};

export type NursePathway = 'uk' | 'international';

/**
 * Laurem nurse interview template.
 *
 * The interview is intentionally split into professional, safeguarding,
 * clinical-judgement and pathway sections so the same engine can support UK
 * nurses and nurses recruited internationally without duplicating the UI.
 */

export const LAUREM_NURSE_FIRST_COMMON_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_about_you',
    category: 'Introduction',
    text: 'Tell us about yourself and your nursing experience, including the clinical settings in which you have worked.',
  },
  {
    id: 'nurse_motivation',
    category: 'Motivation',
    text: 'Why do you want to work for Laurem Caregroup?',
  },
  {
    id: 'nurse_person_centred_care',
    category: 'Person-centred care',
    text: 'What does person-centred nursing care mean to you, and how do you protect a patient or service user’s dignity, privacy and choices?',
  },
  {
    id: 'nurse_communication',
    category: 'Communication',
    text: 'Describe a time when you had to communicate difficult or sensitive information to a patient, family member or colleague. How did you approach it?',
  },
  {
    id: 'nurse_teamwork',
    category: 'Teamwork',
    text: 'Give an example of effective multidisciplinary teamwork and explain your contribution.',
  },
  {
    id: 'nurse_raise_concern',
    category: 'Professional judgement',
    text: 'Tell us about a time you had to challenge a decision, raise a concern or speak up about a safety issue.',
  },
];

export const LAUREM_NURSE_CLINICAL_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_deteriorating_patient',
    category: 'Clinical judgement',
    text: 'You notice that a patient or service user is becoming acutely unwell. How would you assess the situation, escalate your concerns and keep the person safe?',
    guidance: 'Explain your priorities, observations, escalation route and documentation.',
  },
  {
    id: 'nurse_medication_safety',
    category: 'Medication safety',
    text: 'Describe the checks you make before administering medication and what you would do if you identified a discrepancy or possible medication error.',
  },
  {
    id: 'nurse_infection_control',
    category: 'Infection prevention',
    text: 'What are your responsibilities in preventing and controlling infection in a care environment?',
  },
  {
    id: 'nurse_safeguarding',
    category: 'Safeguarding',
    text: 'What would you do if you suspected that a patient or vulnerable adult was being abused or neglected?',
  },
  {
    id: 'nurse_capacity_consent',
    category: 'Consent and rights',
    text: 'How would you respond when a patient refuses care or treatment that you believe is important?',
    guidance: 'Cover communication, consent, capacity where relevant, least-restrictive practice, escalation and documentation.',
  },
  {
    id: 'nurse_documentation',
    category: 'Record keeping',
    text: 'What makes a nursing record clear, accurate and safe, and what would you do if you discovered an earlier documentation error?',
  },
  {
    id: 'nurse_scope_competence',
    category: 'Professional standards',
    text: 'What does working within your competence mean in day-to-day nursing practice?',
  },
  {
    id: 'nurse_delegation',
    category: 'Leadership and delegation',
    text: 'How do you decide what can be delegated to another member of the care team, and how do you make sure delegated work is completed safely?',
  },
];

export const LAUREM_NURSE_UK_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_uk_right_to_work',
    category: 'Right to work',
    text: 'Please describe your current right-to-work status in the UK and any restrictions or expiry dates that Laurem should be aware of.',
  },
  {
    id: 'nurse_uk_registration',
    category: 'Professional registration',
    text: 'What is your current NMC registration status, and is there anything affecting your ability to practise in the UK?',
  },
  {
    id: 'nurse_uk_availability',
    category: 'Availability',
    text: 'What shift patterns and locations are you able to work, including nights, weekends and travel between services where required?',
  },
];

export const LAUREM_NURSE_INTERNATIONAL_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_intl_current_country',
    category: 'International pathway',
    text: 'Which country are you currently living and practising in, and what is your current nursing role?',
  },
  {
    id: 'nurse_intl_nmc_status',
    category: 'Professional registration',
    text: 'What stage are you currently at with your UK NMC registration process?',
    guidance: 'Include any completed or outstanding overseas registration steps, assessment or test requirements where applicable.',
  },
  {
    id: 'nurse_intl_english',
    category: 'Communication',
    text: 'How have you demonstrated the English-language competence required for UK nursing practice?',
  },
  {
    id: 'nurse_intl_relocation',
    category: 'Relocation',
    text: 'Why are you considering relocating to the UK, and what is your expected timeframe for relocation?',
  },
  {
    id: 'nurse_intl_dependants',
    category: 'Relocation',
    text: 'Do you expect to relocate alone or with dependants, and are there any relocation considerations Laurem should know about?',
  },
  {
    id: 'nurse_intl_adaptation',
    category: 'Adaptability',
    text: 'How would you adapt your nursing practice to a new healthcare system, workplace culture and UK professional expectations?',
  },
  {
    id: 'nurse_intl_sponsorship',
    category: 'Sponsorship',
    text: 'What is your understanding of the employer-sponsored work visa process, and what support would you expect from Laurem versus what would remain your responsibility?',
  },
];

export const LAUREM_NURSE_SECOND_COMMON_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_second_safeguarding',
    category: 'Safeguarding',
    text: 'During a shift you notice unexplained bruising and a change in behaviour in a vulnerable person. What would you do immediately, what would you record and who would you inform?',
  },
  {
    id: 'nurse_second_medication_error',
    category: 'Medication safety',
    text: 'You realise that a medication error has occurred. Talk us through your immediate actions, escalation, monitoring and documentation.',
  },
  {
    id: 'nurse_second_deterioration',
    category: 'Clinical escalation',
    text: 'A person who was stable earlier in the shift suddenly deteriorates. How would you prioritise your response?',
  },
  {
    id: 'nurse_second_conflict',
    category: 'Professionalism',
    text: 'A colleague strongly disagrees with your clinical decision in front of a patient. How do you handle the situation while keeping the patient safe and maintaining professionalism?',
  },
  {
    id: 'nurse_second_end_of_life',
    category: 'Compassionate care',
    text: 'How would you support a person and their family when care is focused on comfort and end-of-life needs?',
  },
];

export const LAUREM_NURSE_SECOND_UK_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_second_uk_local_practice',
    category: 'UK practice',
    text: 'Tell us about your experience working within UK healthcare or social care policy, documentation and multidisciplinary practice.',
  },
];

export const LAUREM_NURSE_SECOND_INTERNATIONAL_QUESTIONS: InterviewQuestion[] = [
  {
    id: 'nurse_second_intl_cultural_adaptation',
    category: 'International adaptation',
    text: 'What do you think will be the biggest adjustment when practising nursing in the UK, and how will you prepare for it?',
  },
  {
    id: 'nurse_second_intl_patient_safety',
    category: 'Patient safety',
    text: 'How would you respond if a UK policy or local procedure differed from the way you were previously taught to work?',
  },
];

export function getLauremNurseFirstInterviewQuestions(pathway: NursePathway): InterviewQuestion[] {
  return [
    ...LAUREM_NURSE_FIRST_COMMON_QUESTIONS,
    ...LAUREM_NURSE_CLINICAL_QUESTIONS,
    ...(pathway === 'international' ? LAUREM_NURSE_INTERNATIONAL_QUESTIONS : LAUREM_NURSE_UK_QUESTIONS),
  ];
}

export function getLauremNurseSecondInterviewQuestions(pathway: NursePathway): InterviewQuestion[] {
  return [
    ...LAUREM_NURSE_SECOND_COMMON_QUESTIONS,
    ...(pathway === 'international' ? LAUREM_NURSE_SECOND_INTERNATIONAL_QUESTIONS : LAUREM_NURSE_SECOND_UK_QUESTIONS),
  ];
}

export const LAUREM_NURSE_ALL_INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  ...LAUREM_NURSE_FIRST_COMMON_QUESTIONS,
  ...LAUREM_NURSE_CLINICAL_QUESTIONS,
  ...LAUREM_NURSE_UK_QUESTIONS,
  ...LAUREM_NURSE_INTERNATIONAL_QUESTIONS,
  ...LAUREM_NURSE_SECOND_COMMON_QUESTIONS,
  ...LAUREM_NURSE_SECOND_UK_QUESTIONS,
  ...LAUREM_NURSE_SECOND_INTERNATIONAL_QUESTIONS,
];
