export const LAUREM_WORK_REGIONS = ['London', 'West Midlands', 'Manchester', 'Glasgow'] as const;
export type LauremWorkRegion = (typeof LAUREM_WORK_REGIONS)[number];

export const LAUREM_CARE_SETTINGS = [
  { key: 'care_home', label: 'Care home', detail: 'Residential care home shifts.' },
  { key: 'supported_living', label: 'Supported living / 1-to-1', detail: 'Supported living and one-to-one support.' },
  { key: 'live_in_care', label: 'Live-in care', detail: 'Care where you live with the service user.' },
  { key: 'shared_lives', label: 'Shared Lives / adult placement', detail: 'Longer-term home-based support arrangements.' },
  { key: 'home_care', label: 'Domiciliary / home care', detail: 'Visit a service user in their family or private home.' },
  { key: 'community_care_calls', label: 'Community care calls / double-up', detail: 'Multiple daily calls such as morning and afternoon visits, often as a two-person team.' },
] as const;

export const LAUREM_SHIFT_PREFERENCES = [
  { key: 'day', label: 'Day shifts' },
  { key: 'night', label: 'Night shifts' },
  { key: 'either', label: 'Day or night' },
] as const;

export function getEnhancedDbsFeePence(at: Date = new Date()) {
  const effective = new Date('2026-10-05T00:00:00Z');
  return at >= effective ? 4100 : 4950;
}

export function getDbsFeeLabel(at: Date = new Date()) {
  return at >= new Date('2026-10-05T00:00:00Z')
    ? 'Official Enhanced DBS fee: £41.00 from 5 October 2026.'
    : 'Official Enhanced DBS fee: £49.50 on applications made before 5 October 2026. The official fee reduces to £41.00 from 5 October 2026.';
}

export function getPvgOfficialFeePence(at: Date = new Date()) {
  const start = new Date('2026-08-01T00:00:00Z');
  const endExclusive = new Date('2027-08-01T00:00:00Z');
  return at >= start && at < endExclusive ? 0 : 5900;
}

export function getPvgFeeLabel(at: Date = new Date()) {
  const fee = getPvgOfficialFeePence(at);
  return fee === 0
    ? 'Official PVG application fee currently waived for eligible social-care workers in Scotland through 31 July 2027.'
    : 'Official PVG application fee is £59.00 unless a current waiver or other official exemption applies.';
}

export function regionSuggestsScotland(regions: readonly string[]) {
  return regions.some((value) => value.trim().toLowerCase() === 'glasgow');
}
