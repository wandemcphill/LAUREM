export const LAUREM_WORK_REGIONS = ['London', 'West Midlands', 'Manchester', 'Glasgow'] as const;
export const LAUREM_TRAINING_LOCATIONS = ['Birmingham', 'London', 'Glasgow', 'Manchester'] as const;
export const LAUREM_CARE_SETTINGS = [
  { key: 'care_home', label: 'Care home' },
  { key: 'supported_living', label: 'Supported living / 1-to-1' },
  { key: 'live_in_care', label: 'Live-in care' },
  { key: 'shared_lives', label: 'Shared Lives / adult placement' },
  { key: 'home_care', label: 'Domiciliary / home care' },
  { key: 'community_care_calls', label: 'Community care calls / double-up' },
] as const;
export const LAUREM_SHIFT_PREFERENCES = [
  { key: 'day', label: 'Day shifts' },
  { key: 'night', label: 'Night shifts' },
  { key: 'either', label: 'Day or night' },
] as const;
export function getEnhancedDbsFeePence(at: Date = new Date()) { return at >= new Date('2026-10-05T00:00:00Z') ? 4100 : 4950; }
export function getDbsFeeLabel(at: Date = new Date()) { return at >= new Date('2026-10-05T00:00:00Z') ? 'Official Enhanced DBS fee: £41.00 from 5 October 2026.' : 'Official Enhanced DBS fee: £49.50 before 5 October 2026; it reduces to £41.00 from 5 October 2026.'; }
export function getPvgOfficialFeePence(at: Date = new Date()) { return at >= new Date('2026-08-01T00:00:00Z') && at < new Date('2027-08-01T00:00:00Z') ? 0 : 5900; }
export function getPvgFeeLabel(at: Date = new Date()) { return getPvgOfficialFeePence(at) === 0 ? 'Official PVG application fee currently waived for eligible social-care workers in Scotland through 31 July 2027.' : 'Official PVG application fee is £59.00 unless a current waiver or exemption applies.'; }
export function regionSuggestsScotland(regions: readonly string[]) { return regions.some((value) => value.trim().toLowerCase() === 'glasgow'); }


export function calculateThreeYearContractEndDate(startDate: string | null | undefined): string | null {
  if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return null;
  const [year, month, day] = startDate.split('-').map(Number);
  const targetYear = year + 3;
  const candidate = new Date(Date.UTC(targetYear, month - 1, day));
  if (candidate.getUTCMonth() !== month - 1) {
    return new Date(Date.UTC(targetYear, month, 0)).toISOString().slice(0, 10);
  }
  return candidate.toISOString().slice(0, 10);
}
