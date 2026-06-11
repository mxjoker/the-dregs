/**
 * seed-fake-profiles.mjs
 *
 * Seeds fake dating profiles from supabase/seed-data/fake_profiles.json
 * into the production Supabase DB.
 *
 * Usage:
 *   node scripts/seed-fake-profiles.mjs             # write mode
 *   node scripts/seed-fake-profiles.mjs --dry-run   # read-only validation + plan
 *
 * Reads EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local
 * (no dotenv dependency — parsed manually).
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// ─── Arg parsing ─────────────────────────────────────────────────────────────
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Paths ───────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(REPO_ROOT, '.env.local');
const PROFILES_PATH = resolve(REPO_ROOT, 'supabase', 'seed-data', 'fake_profiles.json');

// ─── Parse .env.local ────────────────────────────────────────────────────────
function parseEnvFile(filePath) {
  let raw;
  try {
    raw = readFileSync(filePath, 'utf8');
  } catch {
    console.error(`STOP: cannot read ${filePath}`);
    process.exit(1);
  }
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    env[key] = value;
  }
  return env;
}

const env = parseEnvFile(ENV_PATH);
const SUPABASE_URL = env['EXPO_PUBLIC_SUPABASE_URL'];
const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!SUPABASE_URL) {
  console.error('STOP: EXPO_PUBLIC_SUPABASE_URL not found in .env.local');
  process.exit(1);
}
if (!SERVICE_ROLE_KEY) {
  console.error('STOP: SUPABASE_SERVICE_ROLE_KEY not found in .env.local');
  process.exit(1);
}

// ─── Supabase client (service role — bypasses RLS) ───────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Load JSON profiles ───────────────────────────────────────────────────────
let fakeProfiles;
try {
  fakeProfiles = JSON.parse(readFileSync(PROFILES_PATH, 'utf8'));
} catch (e) {
  console.error(`STOP: cannot parse ${PROFILES_PATH}: ${e.message}`);
  process.exit(1);
}

// ─── Legacy canned replies ────────────────────────────────────────────────────
const LEGACY_CANNED_REPLIES = {
  Margot: "i can't believe this worked. nobody messages first here. anyway i have 40 unsold candles and exactly one shelf left. choose your words carefully",
  Theo:   "good message. wrong font, but good message",
  Ravi:   "the Vibs have a gig 'soon' and you're now on the list. it's a google doc. welcome",
  Jules:  "i've read this message more times than i read anything in either of my degrees. give me six years to draft a response",
  Sasha:  "i'll respond properly once i finish the three other conversations i'm having in the wrong currency. hi though",
  Finn:   "huh. you messaging first is the strongest sense of purpose anyone in this conversation has had in two years",
  Priya:  "your message has been received and escalated to senior management (also me). expect a response i will regret professionally",
  Clem:   "i drafted a reply. it's almost done. it's been almost done since you sent this. here's the working version: hi",
  Dex:    "i'd love to tell you about my travels. i'm currently abroad (20 minutes from my old apartment). ask me anything",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function checkLen(value, limit, label) {
  if (typeof value === 'string' && value.length > limit) {
    return `${label} exceeds ${limit} chars (${value.length})`;
  }
  return null;
}

// Abort on write error
function failOnError(error, context) {
  if (error) {
    console.error(`\nFAIL [${context}]: ${error.message ?? JSON.stringify(error)}`);
    process.exit(1);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`seed-fake-profiles.mjs  |  mode: ${DRY_RUN ? 'DRY-RUN (read-only)' : 'WRITE'}`);
  console.log(`${'='.repeat(60)}\n`);

  // ── 1. Resolve all red-flag slugs upfront ────────────────────────────────
  const { data: redFlagRows, error: rfErr } = await supabase
    .from('red_flags')
    .select('id, slug');
  if (rfErr) {
    console.error('STOP: could not query red_flags:', rfErr.message);
    process.exit(1);
  }
  const redFlagMap = Object.fromEntries(redFlagRows.map(r => [r.slug, r.id]));

  // ── 2. Resolve all prompt slugs upfront ──────────────────────────────────
  const { data: promptRows, error: prErr } = await supabase
    .from('prompts')
    .select('id, slug');
  if (prErr) {
    console.error('STOP: could not query prompts:', prErr.message);
    process.exit(1);
  }
  const promptMap = Object.fromEntries(promptRows.map(r => [r.slug, r.id]));

  // ── 3. Collect all emails from JSON, check for existing rows ────────────
  const jsonEmails = fakeProfiles.map(p => p.email);
  const { data: existingUsers, error: euErr } = await supabase
    .from('users')
    .select('email')
    .in('email', jsonEmails);
  if (euErr) {
    console.error('STOP: could not query existing users:', euErr.message);
    process.exit(1);
  }
  const existingEmailSet = new Set(existingUsers.map(u => u.email));

  // ── 4. Lookup legacy (dregs.test) profiles ────────────────────────────────
  const { data: legacyUsers, error: luErr } = await supabase
    .from('users')
    .select('id, email')
    .like('email', '%@dregs.test');
  if (luErr) {
    console.error('STOP: could not query legacy users:', luErr.message);
    process.exit(1);
  }

  let legacyProfileMap = {}; // display_name -> profile_id
  if (legacyUsers && legacyUsers.length > 0) {
    const legacyUserIds = legacyUsers.map(u => u.id);
    const { data: legacyProfiles, error: lpErr } = await supabase
      .from('profiles')
      .select('id, display_name, user_id')
      .in('user_id', legacyUserIds);
    if (lpErr) {
      console.error('STOP: could not query legacy profiles:', lpErr.message);
      process.exit(1);
    }
    for (const lp of (legacyProfiles ?? [])) {
      legacyProfileMap[lp.display_name] = lp.id;
    }
  }

  const legacyNames = Object.keys(LEGACY_CANNED_REPLIES);
  const foundLegacyNames = legacyNames.filter(n => legacyProfileMap[n]);
  const missingLegacyNames = legacyNames.filter(n => !legacyProfileMap[n]);

  console.log(`── Legacy profile lookup ──────────────────────────────────`);
  for (const name of legacyNames) {
    const found = !!legacyProfileMap[name];
    console.log(`  ${found ? '✓' : '✗ MISSING'} ${name}`);
  }
  console.log(`  Found ${foundLegacyNames.length}/9\n`);

  if (foundLegacyNames.length < 7) {
    console.error(`STOP: only ${foundLegacyNames.length}/9 legacy names found (threshold: 7). Aborting.`);
    process.exit(1);
  }

  // ── 5. Validate all JSON profiles ────────────────────────────────────────
  console.log(`── Validation ─────────────────────────────────────────────`);
  let allValid = true;
  const validationErrors = [];

  // Collect all slugs used
  const usedRedFlagSlugs = new Set();
  const usedPromptSlugs = new Set();

  for (const p of fakeProfiles) {
    const errs = [];

    // char limits
    const bfErr = checkLen(p.biggest_failure, 140, 'biggest_failure');
    if (bfErr) errs.push(bfErr);

    const crErr = checkLen(p.canned_reply, 200, 'canned_reply');
    if (crErr) errs.push(crErr);

    for (const prompt of (p.prompts ?? [])) {
      const aErr = checkLen(prompt.answer, 140, `prompt[${prompt.slug}].answer`);
      if (aErr) errs.push(aErr);
      usedPromptSlugs.add(prompt.slug);
      if (!promptMap[prompt.slug]) {
        errs.push(`prompt slug not found in DB: "${prompt.slug}"`);
      }
    }

    for (const slug of (p.red_flags ?? [])) {
      usedRedFlagSlugs.add(slug);
      if (!redFlagMap[slug]) {
        errs.push(`red_flag slug not found in DB: "${slug}"`);
      }
    }

    for (const ex of (p.ex_entries ?? [])) {
      if (ex.framing === 'work_history') {
        const e1 = checkLen(ex.wh_job_title, 140, `ex[${ex.nickname}].wh_job_title`);
        const e2 = checkLen(ex.wh_role_description, 140, `ex[${ex.nickname}].wh_role_description`);
        const e3 = checkLen(ex.wh_reason_for_leaving, 140, `ex[${ex.nickname}].wh_reason_for_leaving`);
        if (e1) errs.push(e1);
        if (e2) errs.push(e2);
        if (e3) errs.push(e3);
      } else if (ex.framing === 'verified_purchases') {
        const e1 = checkLen(ex.vp_review_title, 140, `ex[${ex.nickname}].vp_review_title`);
        const e2 = checkLen(ex.vp_review_body, 140, `ex[${ex.nickname}].vp_review_body`);
        if (e1) errs.push(e1);
        if (e2) errs.push(e2);
      }
    }

    if (errs.length > 0) {
      validationErrors.push({ name: p.first_name, errors: errs });
      allValid = false;
    }
  }

  // Report slug coverage
  const unresolvedRedFlags = [...usedRedFlagSlugs].filter(s => !redFlagMap[s]);
  const unresolvedPrompts = [...usedPromptSlugs].filter(s => !promptMap[s]);

  console.log(`  Red-flag slugs used in JSON: ${usedRedFlagSlugs.size}`);
  if (unresolvedRedFlags.length > 0) {
    console.log(`  UNRESOLVED red-flag slugs: ${unresolvedRedFlags.join(', ')}`);
    allValid = false;
  } else {
    console.log(`  All red-flag slugs resolve OK`);
  }

  console.log(`  Prompt slugs used in JSON: ${usedPromptSlugs.size}`);
  if (unresolvedPrompts.length > 0) {
    console.log(`  UNRESOLVED prompt slugs: ${unresolvedPrompts.join(', ')}`);
    allValid = false;
  } else {
    console.log(`  All prompt slugs resolve OK`);
  }

  // Report email collisions
  const collisions = jsonEmails.filter(e => existingEmailSet.has(e));
  console.log(`\n  Email collisions (will skip): ${collisions.length}`);
  for (const c of collisions) {
    const name = fakeProfiles.find(p => p.email === c)?.first_name ?? '?';
    console.log(`    skip (exists): ${name} <${c}>`);
  }

  if (validationErrors.length > 0) {
    console.log(`\n  Validation errors:`);
    for (const ve of validationErrors) {
      console.log(`    ${ve.name}:`);
      for (const e of ve.errors) {
        console.log(`      - ${e}`);
      }
    }
  }

  if (!allValid) {
    console.error('\nSTOP: validation failed. Fix errors before running in write mode.');
    process.exit(1);
  }

  console.log(`\n  All ${fakeProfiles.length} profiles pass validation.\n`);

  // ── 6. Print full plan ────────────────────────────────────────────────────
  console.log(`── Plan ───────────────────────────────────────────────────`);
  for (const p of fakeProfiles) {
    const skip = existingEmailSet.has(p.email);
    const profileFraming = p.ex_entries?.[0]?.framing ?? 'work_history';
    const skippedExEntries = (p.ex_entries ?? []).filter(ex => ex.framing !== profileFraming);
    const keptExEntries = (p.ex_entries ?? []).filter(ex => ex.framing === profileFraming);

    console.log(`  ${skip ? '[SKIP exists]' : '[INSERT]'} ${p.first_name} <${p.email}>`);
    if (!skip) {
      console.log(`    framing: ${profileFraming}`);
      console.log(`    prompts: ${(p.prompts ?? []).length}`);
      console.log(`    red_flags: ${(p.red_flags ?? []).length}`);
      console.log(`    ex_entries: ${keptExEntries.length} kept`);
      for (const ex of skippedExEntries) {
        console.log(`    SKIPPED (framing mismatch): ${p.first_name} / ${ex.nickname}`);
      }
    }
  }
  console.log();

  // ── 7. Legacy seed_profiles upsert plan ─────────────────────────────────
  console.log(`── Legacy seed_profiles upsert plan ───────────────────────`);
  for (const name of legacyNames) {
    const profileId = legacyProfileMap[name];
    if (profileId) {
      console.log(`  ${DRY_RUN ? '[DRY-RUN upsert]' : '[upsert]'} seed_profiles: ${name}`);
    } else {
      console.log(`  WARNING: ${name} not found — skipping`);
    }
  }
  console.log();

  if (DRY_RUN) {
    console.log('DRY-RUN complete — no writes performed.\n');
    return;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // WRITE MODE
  // ─────────────────────────────────────────────────────────────────────────

  let createdCount = 0;
  let skippedCount = 0;
  const newProfileIds = []; // for verification table

  // ── 8. Upsert legacy seed_profiles ───────────────────────────────────────
  console.log(`── Upserting legacy seed_profiles ─────────────────────────`);
  for (const name of legacyNames) {
    const profileId = legacyProfileMap[name];
    if (!profileId) {
      console.log(`  WARNING: ${name} not found in DB — skipping`);
      continue;
    }
    const { error } = await supabase
      .from('seed_profiles')
      .upsert(
        { profile_id: profileId, canned_reply: LEGACY_CANNED_REPLIES[name] },
        { onConflict: 'profile_id' }
      );
    if (error) {
      console.error(`  FAIL upsert seed_profiles for ${name}: ${error.message}`);
      process.exit(1);
    }
    console.log(`  upserted: ${name}`);
  }
  console.log();

  // ── 9. Insert new profiles ────────────────────────────────────────────────
  console.log(`── Inserting new profiles ──────────────────────────────────`);

  for (const p of fakeProfiles) {
    // Idempotency: skip if email already exists
    if (existingEmailSet.has(p.email)) {
      console.log(`  skip (exists): ${p.first_name}`);
      skippedCount++;

      // Still ensure seed_profiles row exists for skipped profiles
      // (find profile_id via user lookup)
      const { data: existUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', p.email)
        .single();
      if (existUser) {
        const { data: existProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('user_id', existUser.id)
          .single();
        if (existProfile) {
          const { error: spErr } = await supabase
            .from('seed_profiles')
            .upsert(
              { profile_id: existProfile.id, canned_reply: p.canned_reply },
              { onConflict: 'profile_id' }
            );
          failOnError(spErr, `seed_profiles upsert for existing ${p.first_name}`);
        }
      }
      continue;
    }

    // ── Insert user ─────────────────────────────────────────────────────────
    const { data: newUser, error: userErr } = await supabase
      .from('users')
      .insert({
        auth_id: randomUUID(),
        email: p.email,
        date_of_birth: p.date_of_birth,
      })
      .select('id')
      .single();
    failOnError(userErr, `users insert for ${p.first_name}`);

    const userId = newUser.id;

    // Determine profile framing from first ex_entry
    const profileFraming = p.ex_entries?.[0]?.framing ?? 'work_history';

    // ── Insert profile ──────────────────────────────────────────────────────
    const { data: newProfile, error: profileErr } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        display_name: p.first_name,
        gender_identity: p.gender_identity,
        pronouns: p.pronouns,
        employment_status: p.employment_status,
        looking_for: p.looking_for,
        relationship_structure: p.relationship_structure,
        biggest_failure: p.biggest_failure,
        ex_review_framing: profileFraming,
        onboarding_step: 'complete',
        vibe_check_passed: true,
        vibe_check_passed_at: new Date().toISOString(),
        onboarding_completed_at: new Date().toISOString(),
        is_visible: true,
      })
      .select('id')
      .single();
    failOnError(profileErr, `profiles insert for ${p.first_name}`);

    const profileId = newProfile.id;
    newProfileIds.push({ name: p.first_name, profileId });

    // ── Insert red flags ────────────────────────────────────────────────────
    if (p.red_flags && p.red_flags.length > 0) {
      const rfRows = p.red_flags.map(slug => ({
        profile_id: profileId,
        red_flag_id: redFlagMap[slug],
      }));
      const { error: rfInsertErr } = await supabase
        .from('profile_red_flags')
        .insert(rfRows);
      failOnError(rfInsertErr, `profile_red_flags insert for ${p.first_name}`);
    }

    // ── Insert prompts ──────────────────────────────────────────────────────
    if (p.prompts && p.prompts.length > 0) {
      const promptRows = p.prompts.map((prompt, idx) => ({
        profile_id: profileId,
        prompt_id: promptMap[prompt.slug],
        answer: prompt.answer,
        display_order: idx + 1,
      }));
      const { error: promptInsertErr } = await supabase
        .from('profile_prompts')
        .insert(promptRows);
      failOnError(promptInsertErr, `profile_prompts insert for ${p.first_name}`);
    }

    // ── Insert ex entries (framing-filtered) ────────────────────────────────
    let exOrder = 1;
    for (const ex of (p.ex_entries ?? [])) {
      if (ex.framing !== profileFraming) {
        console.log(`  SKIPPED (framing mismatch): ${p.first_name} / ${ex.nickname}`);
        continue;
      }

      const exRow = {
        profile_id: profileId,
        display_order: exOrder++,
        nickname: ex.nickname,
      };

      if (ex.framing === 'work_history') {
        exRow.wh_job_title = ex.wh_job_title ?? null;
        exRow.wh_start_date = ex.wh_start_date ?? null;
        exRow.wh_end_date = ex.wh_end_date ?? null;
        exRow.wh_role_description = ex.wh_role_description ?? null;
        exRow.wh_reason_for_leaving = ex.wh_reason_for_leaving ?? null;
      } else {
        exRow.vp_star_rating = ex.vp_star_rating ?? null;
        exRow.vp_review_title = ex.vp_review_title ?? null;
        exRow.vp_review_body = ex.vp_review_body ?? null;
        exRow.vp_badge = ex.vp_badge ?? null;
      }

      const { error: exErr } = await supabase
        .from('ex_entries')
        .insert(exRow);
      failOnError(exErr, `ex_entries insert for ${p.first_name} / ${ex.nickname}`);
    }

    // ── Insert seed_profiles ─────────────────────────────────────────────────
    const { error: spErr } = await supabase
      .from('seed_profiles')
      .upsert(
        { profile_id: profileId, canned_reply: p.canned_reply },
        { onConflict: 'profile_id' }
      );
    failOnError(spErr, `seed_profiles insert for ${p.first_name}`);

    createdCount++;
    console.log(`  created: ${p.first_name}`);
  }

  console.log();

  // ── 10. Summary ─────────────────────────────────────────────────────────
  console.log(`── Summary ─────────────────────────────────────────────────`);
  console.log(`  Created: ${createdCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log();

  // ── 11. Verification reads ───────────────────────────────────────────────
  console.log(`── Verification ────────────────────────────────────────────`);

  // Total seed_profiles rows
  const { count: seedCount, error: scErr } = await supabase
    .from('seed_profiles')
    .select('*', { count: 'exact', head: true });
  if (scErr) {
    console.error('  WARNING: could not count seed_profiles:', scErr.message);
  } else {
    const expect = 30;
    console.log(`  seed_profiles total: ${seedCount} (expect ${expect})${seedCount === expect ? ' ✓' : ' ✗ unexpected'}`);
  }

  // Per-profile verification for newly created profiles
  if (newProfileIds.length > 0) {
    console.log();
    console.log(`  New profiles detail:`);
    console.log(`  ${'display_name'.padEnd(14)} | ${'chaos_score'.padEnd(11)} | ${'prompts'.padEnd(7)} | ${'flags'.padEnd(5)} | ex_entries`);
    console.log(`  ${'-'.repeat(62)}`);

    for (const { name, profileId } of newProfileIds) {
      // Fetch chaos_score
      const { data: pData } = await supabase
        .from('profiles')
        .select('chaos_score')
        .eq('id', profileId)
        .single();

      const { count: promptCount } = await supabase
        .from('profile_prompts')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      const { count: flagCount } = await supabase
        .from('profile_red_flags')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId);

      const { count: exCount } = await supabase
        .from('ex_entries')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', profileId)
        .is('deleted_at', null);

      console.log(
        `  ${name.padEnd(14)} | ${String(pData?.chaos_score ?? '?').padEnd(11)} | ${String(promptCount ?? '?').padEnd(7)} | ${String(flagCount ?? '?').padEnd(5)} | ${exCount ?? '?'}`
      );
    }
  }

  console.log('\nDone.\n');
}

main().catch(err => {
  console.error('\nUnhandled error:', err);
  process.exit(1);
});
