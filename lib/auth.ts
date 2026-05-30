/**
 * Pure auth validation utilities — no side effects, fully testable.
 */

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return 'enter a valid email address';
  }
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'password is required';
  if (password.length < 8) return 'password must be at least 8 characters';
  return null;
}

export function validateDateOfBirth(
  mm: string,
  dd: string,
  yyyy: string,
): string | null {
  if (!mm || !dd || !yyyy) return 'date of birth is required';

  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  const year = parseInt(yyyy, 10);

  if (yyyy.length !== 4 || year < 1900) return 'enter a valid year';
  if (isNaN(month) || month < 1 || month > 12) return 'enter a valid date';
  if (isNaN(day) || day < 1 || day > 31) return 'enter a valid date';

  // Catch impossible dates (e.g. Feb 31 — JS rolls over the month)
  const dob = new Date(year, month - 1, day);
  if (dob.getMonth() !== month - 1 || dob.getDate() !== day) {
    return 'enter a valid date';
  }

  const today = new Date();
  const eighteenYearsAgo = new Date(
    today.getFullYear() - 18,
    today.getMonth(),
    today.getDate(),
  );
  if (dob > eighteenYearsAgo) return 'must be 18 or older. we check.';

  return null;
}

/** Returns ISO date string YYYY-MM-DD for Supabase date columns. */
export function formatDateOfBirth(
  mm: string,
  dd: string,
  yyyy: string,
): string {
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}
