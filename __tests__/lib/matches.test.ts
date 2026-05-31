jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
    storage: {
      from: () => ({
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://cdn.example.com/${path}` },
        }),
      }),
    },
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchMatchMomentData } from '@/lib/matches';

const mockFrom = supabase.from as jest.Mock;

function makeChain(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(returnValue),
    then: undefined as any,
  };
  Object.defineProperty(chain, 'then', {
    get() {
      return (resolve: any) => resolve(returnValue);
    },
  });
  return chain;
}

const VIEWER_ID = 'profile-viewer';
const OTHER_ID = 'profile-other';
const MATCH_ID = 'match-123';

describe('fetchMatchMomentData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns otherProfileId, otherName, otherPhotoUrl, and sharedFlags', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { user_a_id: VIEWER_ID, user_b_id: OTHER_ID }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({
          data: {
            display_name: 'Alex',
            profile_photos: [{ storage_path: 'photos/alex.jpg', display_order: 0 }],
          },
          error: null,
        }),
      )
      .mockReturnValueOnce(
        makeChain({ data: { display_name: 'You' }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({
          data: [
            { profile_id: VIEWER_ID, red_flags: { id: 'flag-1', label: 'no curtains' } },
            { profile_id: VIEWER_ID, red_flags: { id: 'flag-2', label: 'has a podcast' } },
            { profile_id: OTHER_ID, red_flags: { id: 'flag-1', label: 'no curtains' } },
            { profile_id: OTHER_ID, red_flags: { id: 'flag-3', label: 'sends voice notes' } },
          ],
          error: null,
        }),
      );

    const result = await fetchMatchMomentData(MATCH_ID, VIEWER_ID);

    expect(result.matchId).toBe(MATCH_ID);
    expect(result.otherProfileId).toBe(OTHER_ID);
    expect(result.otherName).toBe('Alex');
    expect(result.otherPhotoUrl).toContain('photos/alex.jpg');
    expect(result.sharedFlags).toEqual([{ id: 'flag-1', label: 'no curtains' }]);
    expect(result.viewerName).toBeDefined();
  });

  it('returns otherProfileId correctly when viewer is user_b', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { user_a_id: OTHER_ID, user_b_id: VIEWER_ID }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({
          data: { display_name: 'Sam', profile_photos: [] },
          error: null,
        }),
      )
      .mockReturnValueOnce(
        makeChain({ data: { display_name: 'Me' }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({ data: [], error: null }),
      );

    const result = await fetchMatchMomentData(MATCH_ID, VIEWER_ID);
    expect(result.otherProfileId).toBe(OTHER_ID);
    expect(result.otherName).toBe('Sam');
    expect(result.otherPhotoUrl).toBeNull();
    expect(result.sharedFlags).toEqual([]);
  });

  it('returns empty sharedFlags when there is no overlap', async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { user_a_id: VIEWER_ID, user_b_id: OTHER_ID }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({ data: { display_name: 'Sam', profile_photos: [] }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({ data: { display_name: 'Me' }, error: null }),
      )
      .mockReturnValueOnce(
        makeChain({
          data: [
            { profile_id: VIEWER_ID, red_flags: { id: 'flag-1', label: 'no curtains' } },
            { profile_id: OTHER_ID, red_flags: { id: 'flag-2', label: 'has a podcast' } },
          ],
          error: null,
        }),
      );

    const result = await fetchMatchMomentData(MATCH_ID, VIEWER_ID);
    expect(result.sharedFlags).toEqual([]);
  });

  it('throws when the matches query returns an error', async () => {
    mockFrom.mockReturnValueOnce(
      makeChain({ data: null, error: new Error('db error') }),
    );
    await expect(fetchMatchMomentData(MATCH_ID, VIEWER_ID)).rejects.toThrow('db error');
  });
});
