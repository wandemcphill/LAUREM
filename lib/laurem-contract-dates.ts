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

export function formatContractDate(value: string | null | undefined): string {
  if (!value) return 'Not set';
  const d = new Date(value + 'T00:00:00Z');
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { dateStyle: 'long', timeZone: 'UTC' });
}
