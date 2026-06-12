// E2E test of the door mechanic against prod, playing both participants:
// test5 knocks on an expired match; test2 answers the door early.
// Creates/uses a match between the two test accounts and resets it after.
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);

const url = env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const service = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY);

const PASSWORD = 'dregs2026!';
let failures = 0;
function check(label, ok, detail = '') {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures++;
}

async function profileIdFor(email) {
  const { data: u } = await service.from('users').select('id').eq('email', email).single();
  const { data: p } = await service.from('profiles').select('id').eq('user_id', u.id).single();
  return p.id;
}

async function signIn(email) {
  const c = createClient(url, anonKey);
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw new Error(`sign-in ${email}: ${error.message}`);
  return { client: c, jwt: data.session.access_token };
}

// Raw call so we can assert HTTP status codes
async function callFn(name, jwt, body) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

// Ephemeral second participant (test2/test auth ids point at Joe's real
// accounts — do not touch those). Created here, deleted in cleanup.
const EPHEMERAL_EMAIL = 'doortest-e2e@thedregs.app';
async function createEphemeral() {
  const existing = await service.from('users').select('auth_id').eq('email', EPHEMERAL_EMAIL).maybeSingle();
  if (existing.data) await service.auth.admin.deleteUser(existing.data.auth_id).catch(() => {});
  await service.from('users').delete().eq('email', EPHEMERAL_EMAIL);
  const { data: created, error } = await service.auth.admin.createUser({
    email: EPHEMERAL_EMAIL, password: PASSWORD, email_confirm: true,
  });
  if (error) throw new Error(`createUser: ${error.message}`);
  const { data: uRow } = await service.from('users')
    .insert({ auth_id: created.user.id, email: EPHEMERAL_EMAIL, date_of_birth: '1990-01-01' })
    .select('id').single();
  await service.from('profiles').insert({
    user_id: uRow.id, display_name: 'Door Test (e2e)', onboarding_step: 'complete',
    vibe_check_passed: true, is_visible: false,
  });
  return created.user.id;
}
async function deleteEphemeral(authId) {
  await service.from('users').delete().eq('email', EPHEMERAL_EMAIL); // cascades profile/matches
  await service.auth.admin.deleteUser(authId).catch(() => {});
}

const ephemeralAuthId = await createEphemeral();
const p5 = await profileIdFor('test5@thedregs.app');
const p2 = await profileIdFor(EPHEMERAL_EMAIL);
const [a, b] = p5 < p2 ? [p5, p2] : [p2, p5];

// Ensure a match exists between test5 and test2, then force expired/closed state
let { data: match } = await service
  .from('matches').select('id').eq('user_a_id', a).eq('user_b_id', b).maybeSingle();
if (!match) {
  ({ data: match } = await service
    .from('matches').insert({ user_a_id: a, user_b_id: b }).select('id').single());
  console.log('created test match', match.id);
}
await service.from('matches').update({
  status: 'expired', door_status: 'closed', door_knocked_by: null,
  door_knock_count: 0, door_knock_target: null, door_opened_at: null,
  door_early_answer_reason: null,
}).eq('id', match.id);

const t5 = await signIn('test5@thedregs.app');
const t2 = await signIn(EPHEMERAL_EMAIL);

// 1. first knock batch starts knocking and sets a target
let r = await callFn('record-door-knock', t5.jwt, { match_id: match.id, tap_count: 50 });
check('first knock 200', r.status === 200, JSON.stringify(r.body).slice(0, 120));
check('door_status knocking', r.body.door_status === 'knocking');
check('target in [200,800]', r.body.knock_target >= 200 && r.body.knock_target <= 800, `target=${r.body.knock_target}`);
check('knock_count 50', r.body.knock_count === 50);
check('dp_awarded <= 20', r.body.dp_awarded >= 0 && r.body.dp_awarded <= 20, `dp=${r.body.dp_awarded}`);

// 2. second batch accumulates
r = await callFn('record-door-knock', t5.jwt, { match_id: match.id, tap_count: 25 });
check('second knock accumulates', r.status === 200 && r.body.knock_count === 75, `count=${r.body.knock_count}`);

// 3. knocker cannot answer own door
r = await callFn('answer-door-early', t5.jwt, { match_id: match.id, reason: "I was fine. I wasn't" });
check('knocker answer rejected 403', r.status === 403, `status=${r.status}`);

// 4. invalid reason rejected
r = await callFn('answer-door-early', t2.jwt, { match_id: match.id, reason: 'because reasons' });
check('invalid reason rejected 400', r.status === 400, `status=${r.status}`);

// 5. other participant answers with a locked reason
r = await callFn('answer-door-early', t2.jwt, { match_id: match.id, reason: 'I was in my flop era' });
check('answer-door-early 200', r.status === 200, JSON.stringify(r.body).slice(0, 120));
check('door_open true', r.body.door_open === true);

// 6. match row state
const { data: m } = await service.from('matches')
  .select('status, door_status, door_early_answer_reason, door_opened_at').eq('id', match.id).single();
check('match status door_open', m.status === 'door_open');
check('door_status open', m.door_status === 'open');
check('reason recorded', m.door_early_answer_reason === 'I was in my flop era');
check('door_opened_at set', !!m.door_opened_at);

// 7. system message inserted
const { data: sysMsgs } = await service.from('messages')
  .select('system_payload').eq('match_id', match.id).eq('message_type', 'system');
check('door_answered system message', (sysMsgs ?? []).some(x => x.system_payload?.type === 'door_answered'));

// 8. knocking an open door rejected
r = await callFn('record-door-knock', t5.jwt, { match_id: match.id, tap_count: 1 });
check('knock on open door rejected 400', r.status === 400, `status=${r.status}`);

// Cleanup: delete test system messages, reset match to active/closed
await service.from('messages').delete().eq('match_id', match.id).eq('message_type', 'system');
await service.from('matches').delete().eq('id', match.id);
await deleteEphemeral(ephemeralAuthId);
console.log('cleanup done (test match + ephemeral account deleted)');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
