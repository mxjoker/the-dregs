import {
  validateEmail,
  validatePassword,
  validateDateOfBirth,
  formatDateOfBirth,
} from '@/lib/auth';

describe('validateEmail', () => {
  it('returns error for empty string', () => {
    expect(validateEmail('')).toBe('email is required');
  });
  it('returns error for invalid format', () => {
    expect(validateEmail('notanemail')).toBe('enter a valid email address');
  });
  it('returns null for valid email', () => {
    expect(validateEmail('test@example.com')).toBeNull();
  });
  it('trims whitespace before validating', () => {
    expect(validateEmail('  test@example.com  ')).toBeNull();
  });
});

describe('validatePassword', () => {
  it('returns error for empty password', () => {
    expect(validatePassword('')).toBe('password is required');
  });
  it('returns error when shorter than 8 chars', () => {
    expect(validatePassword('abc123')).toBe('password must be at least 8 characters');
  });
  it('returns null for 8+ char password', () => {
    expect(validatePassword('abcdefgh')).toBeNull();
  });
});

describe('validateDateOfBirth', () => {
  it('returns error when fields are empty', () => {
    expect(validateDateOfBirth('', '', '')).toBe('date of birth is required');
  });
  it('returns error for invalid month', () => {
    expect(validateDateOfBirth('13', '01', '1990')).toBe('enter a valid date');
  });
  it('returns error for invalid day', () => {
    expect(validateDateOfBirth('02', '31', '1990')).toBe('enter a valid date');
  });
  it('returns error for 2-digit year', () => {
    expect(validateDateOfBirth('01', '01', '90')).toBe('enter a valid year');
  });
  it('returns error when user is under 18', () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = String(today.getFullYear() - 17);
    expect(validateDateOfBirth(mm, dd, yyyy)).toBe('must be 18 or older. we check.');
  });
  it('returns null for user exactly 18 years ago today', () => {
    const today = new Date();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const yyyy = String(today.getFullYear() - 18);
    expect(validateDateOfBirth(mm, dd, yyyy)).toBeNull();
  });
  it('returns null for clearly adult DOB', () => {
    expect(validateDateOfBirth('06', '15', '1990')).toBeNull();
  });
});

describe('formatDateOfBirth', () => {
  it('formats to YYYY-MM-DD with zero-padding', () => {
    expect(formatDateOfBirth('6', '5', '1990')).toBe('1990-06-05');
  });
  it('handles already-padded values', () => {
    expect(formatDateOfBirth('12', '31', '2000')).toBe('2000-12-31');
  });
});
