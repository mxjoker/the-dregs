// E2E test of the seed-profile match + canned-reply machinery against prod.
// Flow: sign in as a test user → like a seed profile via record_swipe →
// expect instant match → send a message → expect exactly one canned reply.
// Cleans up everything it created (and any prior state between the pair).
//
// Usage: node scripts/e2e-canned-reply.mjs [seed_email]
//   seed_email defaults to margot@dregs.test
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);
const client = createClient(url, env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

const TEST_EMAIL = 'test5@thedregs.app';
const TEST_PASSWORD = 'dregs2026!';
const SEED_EMAIL = process.argv[2] ?? 'margot@dregs.test';

let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function cleanup(matchPair) {
  const [a, b] = matchPair;
  const { data: match } = await service
    .from('matches')
    .select('id')
    .eq('user_a_id', a < b ? a : b)
    .eq('user_b_id', a < b ? b : a)
    .maybeSingle();
  if (match) {
    await service.from('messages').delete().eq('match_id', match.id);
    await service.from('matches').delete().eq('id', match.id);
  }
  await service.from('swipes').delete().or(
    `and(swiper_id.eq.${a},swiped_id.eq.${b}),and(swiper_id.eq.${b},swiped_id.eq.${a})`
  );
}

const { data: auth, error: authErr } = await client.auth.signInWithPassword({
  email: TEST_EMAIL,
  password: TEST_PASSWORD,
});
if (authErr) throw new Error(`sign-in failed: ${authErr.message}`);

const { data: meUser } = await service.from('users').select('id').eq('auth_id', auth.user.id).single();
const { data: meProfile } = await service.from('profiles').select('id').eq('user_id', meUser.id).single();

const { data: seedUser } = await service.from('users').select('id').eq('email', SEED_EMAIL).single();
const { data: seedProfile } = await service
  .from('profiles')
  .select('id, display_name')
  .eq('user_id', seedUser.id)
  .single();
const { data: seedRow } = await service
  .from('seed_profiles')
  .select('canned_reply')
  .eq('profile_id', seedProfile.id)
  .maybeSingle();
check('seed has canned_reply row', !!seedRow, seedProfile.display_name);

console.log(`testing: ${TEST_EMAIL} ↔ ${seedProfile.display_name} (${SEED_EMAIL})`);
await cleanup([meProfile.id, seedProfile.id]);

// 1. like the seed via the real edge function
const { data: swipeRes, error: swipeErr } = await client.functions.invoke('record_swipe', {
  body: { swiped_id: seedProfile.id, action: 'like' },
});
check('record_swipe succeeded', !swipeErr && swipeRes?.recorded === true, swipeErr?.message);
check('instant match created', swipeRes?.matched === true && !!swipeRes?.match_id);
const matchId = swipeRes?.match_id;

if (matchId) {
  // 2. reciprocal swipe row exists from the seed
  const { data: recip } = await service
    .from('swipes')
    .select('action')
    .eq('swiper_id', seedProfile.id)
    .eq('swiped_id', meProfile.id)
    .maybeSingle();
  check('seed auto-liked back', recip?.action === 'like');

  // 3. send a message as the human (same direct insert the app uses)
  const { error: msgErr } = await client
    .from('messages')
    .insert({ match_id: matchId, sender_id: meProfile.id, body: 'hi, this is an e2e test', message_type: 'text' });
  check('human message inserted', !msgErr, msgErr?.message);

  await new Promise(r => setTimeout(r, 1500));
  const { data: msgs } = await service
    .from('messages')
    .select('sender_id, body, sent_at')
    .eq('match_id', matchId)
    .order('sent_at');
  check('exactly 2 messages (msg + reply)', msgs?.length === 2, `got ${msgs?.length}`);
  const reply = msgs?.find(m => m.sender_id === seedProfile.id);
  check('reply is from seed with canned text', !!reply && reply.body === seedRow?.canned_reply, reply?.body?.slice(0, 60));
  check('reply ordered after human message', msgs?.[1]?.sender_id === seedProfile.id);

  // 4. last_message_at maintained
  const { data: m } = await service.from('matches').select('last_message_at').eq('id', matchId).single();
  check('matches.last_message_at set', !!m?.last_message_at);

  // 5. reply-once: second human message gets no second reply
  await client
    .from('messages')
    .insert({ match_id: matchId, sender_id: meProfile.id, body: 'second e2e message', message_type: 'text' });
  await new Promise(r => setTimeout(r, 1500));
  const { count } = await service
    .from('messages')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)
    .eq('sender_id', seedProfile.id);
  check('seed replied exactly once', count === 1, `seed messages: ${count}`);
}

await cleanup([meProfile.id, seedProfile.id]);
console.log('cleanup done');
console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
