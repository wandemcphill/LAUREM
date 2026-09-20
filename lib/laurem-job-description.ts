import { lauremCompany } from '@/lib/laurem-company-config';

export function renderLauremJobDescription(role: string, staffName: string) {
  const normal = role.trim().toLowerCase();
  let responsibilities = [
    'Provide safe, person-centred care within the agreed scope of the role and the employee’s competence.',
    'Follow care plans, safeguarding procedures, medication and infection-control requirements applicable to the assignment.',
    'Maintain accurate, timely and confidential records and report incidents, concerns or changes in need promptly.',
    'Work respectfully with service users, families, colleagues, managers and client teams.',
    'Attend required induction, mandatory training, supervision and competency reviews.',
    'Use the LAUREM workforce platform for shifts, attendance, timesheets, leave and internal communication.',
  ];
  let requirements = [
    'Right to work in the UK and successful completion of role-appropriate pre-employment checks.',
    'Good written and verbal communication and a reliable, professional approach.',
    'Commitment to safeguarding, confidentiality, equality, dignity and safe working practices.',
  ];

  if (normal.includes('registered nurse')) {
    responsibilities = [
      'Assess, plan, deliver and evaluate nursing care within professional competence and the applicable NMC standards.',
      'Administer medicines and undertake clinical interventions only where trained, competent and authorised.',
      'Recognise deterioration, escalate concerns and maintain accurate clinical documentation.',
      'Work collaboratively with multidisciplinary teams, service users and families.',
      'Maintain professional registration, mandatory training, safeguarding and continuing professional development requirements.',
      'Use the LAUREM workforce platform for rota, attendance, timesheets, leave and internal communication.',
    ];
    requirements = [
      'Current or approved pathway toward NMC registration appropriate to the role and lawful right to practise.',
      'Successful completion of identity, right-to-work, references, safeguarding, disclosure/PVG and occupational checks as applicable.',
      'Ability to communicate effectively, exercise professional judgement and work within scope of practice.',
    ];
  } else if (normal.includes('healthcare assistant')) {
    responsibilities = [
      'Support service users with personal care, daily living, mobility, nutrition and emotional wellbeing according to care plans.',
      'Observe and report changes in health or behaviour and escalate safeguarding or safety concerns promptly.',
      'Maintain dignity, privacy, infection-control standards and accurate care records.',
      'Work under agreed supervision and complete competency sign-offs before undertaking tasks that require them.',
      'Complete mandatory training and participate in supervision and performance reviews.',
      'Use the LAUREM workforce platform for rota, attendance, timesheets, leave and internal communication.',
    ];
    requirements = [
      'Lawful right to work and successful completion of identity, reference, safeguarding and disclosure/PVG checks as applicable.',
      'Respectful communication, reliability, patience and commitment to person-centred care.',
      'Willingness to complete mandatory training and role-specific competency assessment.',
    ];
  } else if (normal.includes('support worker')) {
    responsibilities = [
      'Support service users with daily living, independence, community participation and wellbeing in accordance with care plans.',
      'Follow safeguarding, positive-behaviour, health and safety and confidentiality requirements relevant to the placement.',
      'Record care and support delivered accurately and escalate concerns promptly.',
      'Work collaboratively with service users, families, colleagues and client teams.',
      'Complete mandatory training, supervision and competency requirements.',
      'Use the LAUREM workforce platform for rota, attendance, timesheets, leave and internal communication.',
    ];
    requirements = [
      'Lawful right to work and successful completion of role-appropriate pre-employment checks.',
      'Calm, respectful communication and a person-centred approach.',
      'Willingness to complete mandatory training and supervised competency development.',
    ];
  }

  return [
    lauremCompany.legalName.toUpperCase(),
    'JOB DESCRIPTION',
    '',
    'Employee: ' + staffName,
    'Role: ' + role,
    'Employment basis: As stated in the employment contract and approved offer.',
    '',
    'PURPOSE OF ROLE',
    'To provide safe, respectful and person-centred services on behalf of ' + lauremCompany.legalName + ', at LAUREM locations and/or approved client assignments.',
    '',
    'KEY RESPONSIBILITIES',
    ...responsibilities.map((item, index) => (index + 1) + '. ' + item),
    '',
    'ESSENTIAL REQUIREMENTS',
    ...requirements.map((item, index) => (index + 1) + '. ' + item),
    '',
    'REPORTING AND WORKING RELATIONSHIPS',
    'The employee reports to the designated LAUREM manager or shift/assignment lead and works as part of the relevant care, clinical or support team. Duties may reasonably evolve with service needs, provided they remain lawful and within the employee’s competence and contractual framework.',
    '',
    'DOCUMENT CONTROL',
    'Issued for ' + staffName + ' by ' + lauremCompany.documentIssuer.name + ', ' + lauremCompany.documentIssuer.title + ', for and on behalf of ' + lauremCompany.documentIssuer.employer + '.',
    'This job description should be read together with the employment contract, applicable policies, assignment instructions and mandatory training requirements.',
  ].join('\n');
}

export const LAUREM_DOCUMENT_SIGNATURE_ATTESTATION =
  'I confirm that I have read this document, understand it, and agree to sign it electronically.';