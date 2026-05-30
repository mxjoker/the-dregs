export function validateDisplayName(name: string): string | null {
  if (!name.trim()) return 'display name is required';
  return null;
}

export function validateYear(year: string): string | null {
  const n = parseInt(year, 10);
  if (!year || isNaN(n) || n < 1900 || n > new Date().getFullYear()) {
    return 'enter a year';
  }
  return null;
}
