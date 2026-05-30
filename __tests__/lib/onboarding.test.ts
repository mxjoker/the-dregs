import { validateDisplayName, validateYear } from '@/lib/onboarding';

describe('validateDisplayName', () => {
  it('returns error for empty string', () => {
    expect(validateDisplayName('')).toBe('display name is required');
  });

  it('returns error for whitespace only', () => {
    expect(validateDisplayName('   ')).toBe('display name is required');
  });

  it('returns null for valid name', () => {
    expect(validateDisplayName('chaos goblin')).toBeNull();
  });
});

describe('validateYear', () => {
  it('returns error for empty string', () => {
    expect(validateYear('')).toBe('enter a year');
  });

  it('returns error for non-numeric input', () => {
    expect(validateYear('abcd')).toBe('enter a year');
  });

  it('returns error for year before 1900', () => {
    expect(validateYear('1899')).toBe('enter a year');
  });

  it('returns error for year after current year', () => {
    const next = String(new Date().getFullYear() + 1);
    expect(validateYear(next)).toBe('enter a year');
  });

  it('returns null for valid year', () => {
    expect(validateYear('2019')).toBeNull();
  });
});
