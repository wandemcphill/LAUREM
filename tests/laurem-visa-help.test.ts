import { describe, expect, it } from 'vitest';
import { buildVisaHelpDocumentChecklist, getVisaCostSummary, recommendVisaHelp } from '@/lib/laurem-visa-help';

describe('LAUREM Visa Help decision engine', () => {
  it('blocks an in-country Standard Visitor switch', () => {
    const result = recommendVisaHelp({
      role:'Registered Nurse',
      livingInUk:true,
      currentVisaType:'Standard Visitor visa',
      currentVisaEndDate:'2027-06-01',
      monthsWorkingForLaurem:0,
    });
    expect(result.route).toBe('not_switchable_from_current_permission');
    expect(result.decision).toBe('not_switchable');
  });

  it('requires Student visa switching conditions', () => {
    const result = recommendVisaHelp({
      role:'Registered Nurse',
      livingInUk:true,
      currentVisaType:'Student visa',
      currentVisaEndDate:'2027-06-01',
      monthsWorkingForLaurem:6,
      studentCourseFinished:false,
      jobStartsAfterCourse:false,
      phdStudy24Months:false,
    });
    expect(result.decision).toBe('requires_legal_review');
    expect(result.route).toBe('legal_review_required');
  });

  it('requires three months of sponsor work for an in-country Health and Care switch in covered care roles', () => {
    const result = recommendVisaHelp({
      role:'Healthcare Assistant',
      livingInUk:true,
      currentVisaType:'Graduate visa',
      currentVisaEndDate:'2027-06-01',
      monthsWorkingForLaurem:2,
    });
    expect(result.decision).toBe('requires_legal_review');
    expect(result.reason).toContain('3 months');
  });

  it('recognises an eligible nurse switch as provisional and keeps dependants generally permitted', () => {
    const result = recommendVisaHelp({
      role:'Registered Nurse',
      livingInUk:true,
      currentVisaType:'Graduate visa',
      currentVisaEndDate:'2027-06-01',
      monthsWorkingForLaurem:3,
      wantsDependants:true,
    });
    expect(result.route).toBe('health_and_care_worker');
    expect(result.decision).toBe('provisional');
    expect(result.dependantPosition).toBe('generally_permitted');
  });

  it('flags dependant restrictions for care-worker routes', () => {
    const result = recommendVisaHelp({
      role:'Support Worker',
      livingInUk:false,
      wantsDependants:true,
    });
    expect(result.route).toBe('health_and_care_worker');
    expect(result.dependantPosition).toBe('restricted');
  });

  it('builds a legal-support document checklist with dependant evidence', () => {
    const checklist = buildVisaHelpDocumentChecklist({
      role:'Registered Nurse',
      route:'health_and_care_worker',
      outsideUk:false,
      hasDependants:true,
    });
    const keys = checklist.map(item => item.key);
    expect(keys).toContain('passport');
    expect(keys).toContain('current_immigration_status');
    expect(keys).toContain('professional_registration');
    expect(keys).toContain('dependant_identity');
    expect(keys).toContain('relationship_evidence');
  });
});
