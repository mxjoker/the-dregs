jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://test.supabase.co/storage/v1/object/public/${path}` },
        }),
      }),
    },
  },
}));

import {
  buildPhotoUrl,
  formatAge,
  formatDistance,
  getTopFlags,
  DISCARD_PILE_KEY,
} from '@/lib/discover';

describe('buildPhotoUrl', () => {
  it('returns null when storage_path is null', () => {
    expect(buildPhotoUrl(null)).toBeNull();
  });

  it('returns a string URL when given a storage path', () => {
    const url = buildPhotoUrl('profile-photos/abc/1.jpg');
    expect(typeof url).toBe('string');
    expect(url).toContain('profile-photos/abc/1.jpg');
  });
});

describe('formatAge', () => {
  it('computes age from date of birth string', () => {
    const dob = `${new Date().getFullYear() - 30}-01-15`;
    expect(formatAge(dob)).toBe(30);
  });

  it('subtracts 1 if birthday has not occurred yet this year', () => {
    const future = new Date();
    future.setMonth(future.getMonth() + 1);
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');
    const yyyy = String(future.getFullYear() - 25);
    expect(formatAge(`${yyyy}-${mm}-${dd}`)).toBe(24);
  });
});

describe('formatDistance', () => {
  it('returns "<1 km" for distances under 1000m', () => {
    expect(formatDistance(500)).toBe('<1 km');
  });

  it('rounds to nearest km', () => {
    expect(formatDistance(3600)).toBe('4 km');
    expect(formatDistance(3400)).toBe('3 km');
  });
});

describe('getTopFlags', () => {
  const flags = [
    { id: '1', label: 'has a podcast', ick_count: 50 },
    { id: '2', label: 'attachment issues', ick_count: 80 },
    { id: '3', label: 'sends voice notes', ick_count: 30 },
    { id: '4', label: 'will not DTR', ick_count: 60 },
  ];

  it('returns top N flags sorted by ick_count desc', () => {
    const top = getTopFlags(flags as any, 3);
    expect(top.map(f => f.id)).toEqual(['2', '4', '1']);
  });

  it('returns all flags when count < N', () => {
    expect(getTopFlags(flags as any, 10)).toHaveLength(4);
  });
});

describe('DISCARD_PILE_KEY', () => {
  it('is a non-empty string', () => {
    expect(typeof DISCARD_PILE_KEY).toBe('string');
    expect(DISCARD_PILE_KEY.length).toBeGreaterThan(0);
  });
});
