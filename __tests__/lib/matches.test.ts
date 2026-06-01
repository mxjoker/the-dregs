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
import { fetchMatchMomentData, fetchMatches, fetchMessages, sendMessage } from '@/lib/matches';

const mockFrom = supabase.from as jest.Mock;

function makeChain(returnValue: { data: unknown; error: unknown }) {
  const chain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
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

describe('fetchMatches', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns MatchListItem array with viewer as user_a, lastMessageBody null when no messages', async () => {
    const matchRows = [
      {
        id: 'match-1',
        user_a_id: VIEWER_ID,
        user_b_id: OTHER_ID,
        user_a_name: 'ViewerName',
        user_b_name: 'OtherName',
        matched_at: '2026-01-01T00:00:00Z',
        last_message_at: null,
      },
    ];

    // First call: matches_with_context
    mockFrom
      .mockReturnValueOnce(makeChain({ data: matchRows, error: null }))
      // Second call: messages
      .mockReturnValueOnce(makeChain({ data: [], error: null }));

    const result = await fetchMatches(VIEWER_ID);

    expect(result).toHaveLength(1);
    expect(result[0].matchId).toBe('match-1');
    expect(result[0].otherProfileId).toBe(OTHER_ID);
    expect(result[0].otherName).toBe('OtherName');
    expect(result[0].matchedAt).toBe('2026-01-01T00:00:00Z');
    expect(result[0].lastMessageBody).toBeNull();
    expect(result[0].lastMessageAt).toBeNull();
  });
});

describe('fetchMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns messages mapped to camelCase, ordered newest first', async () => {
    const rows = [
      { id: 'msg-2', match_id: MATCH_ID, sender_id: OTHER_ID, body: 'hi', message_type: 'text', sent_at: '2026-01-02T00:00:00Z' },
      { id: 'msg-1', match_id: MATCH_ID, sender_id: VIEWER_ID, body: 'hello', message_type: 'text', sent_at: '2026-01-01T00:00:00Z' },
    ];
    mockFrom.mockReturnValueOnce(makeChain({ data: rows, error: null }));

    const result = await fetchMessages(MATCH_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('msg-2');
    expect(result[0].matchId).toBe(MATCH_ID);
    expect(result[0].senderId).toBe(OTHER_ID);
    expect(result[0].body).toBe('hi');
    expect(result[0].messageType).toBe('text');
    expect(result[0].sentAt).toBe('2026-01-02T00:00:00Z');
  });
});

describe('sendMessage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the created Message on success', async () => {
    const row = { id: 'msg-new', match_id: MATCH_ID, sender_id: VIEWER_ID, body: 'hey!', message_type: 'text', sent_at: '2026-01-03T00:00:00Z' };
    mockFrom.mockReturnValueOnce(makeChain({ data: row, error: null }));

    const result = await sendMessage({ matchId: MATCH_ID, senderId: VIEWER_ID, body: 'hey!' });

    expect(result.id).toBe('msg-new');
    expect(result.matchId).toBe(MATCH_ID);
    expect(result.senderId).toBe(VIEWER_ID);
    expect(result.body).toBe('hey!');
    expect(result.sentAt).toBe('2026-01-03T00:00:00Z');
  });

  it('throws on insert error', async () => {
    mockFrom.mockReturnValueOnce(makeChain({ data: null, error: new Error('insert failed') }));
    await expect(sendMessage({ matchId: MATCH_ID, senderId: VIEWER_ID, body: 'hey' })).rejects.toThrow('insert failed');
  });
});
