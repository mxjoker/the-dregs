# Overnight Run — 2026-06-11

Self-contained state file. Any wake-up or context reset starts by reading this.

## Mission
Make The Dregs shareable: Joe sends a friend a link (Expo Go via EAS Update),
friend signs up, onboards, swipes a stack of ~25-30 funny fake profiles,
matches, chats, gets one canned in-character reply. Everything just works.

## Decisions made by Joe (2026-06-11, do not re-ask)
- Distribution: **Expo Go link via EAS Update** (EAS login confirmed: account `thedregs`)
- Fake chats: **one canned reply** per seed profile, in character
- Scope: core reliability first, then **door mechanic**, then **push notifications**, time permitting
- Priority: reliability > function > polish > security
- Authority: commit/push/deploy/migrate prod = yes; test records in prod = yes (clean up after)
- Max 3 parallel subagents per wave; check `npx -y ccusage@latest blocks --active --json`
  between waves; pause at ≥95% of 5h window, schedule wakeup, resume after reset
- Joe back ~morning; checking in until ~midnight 2026-06-11

## Fixed facts
- Rollback point: tag `rollback-overnight-2026-06-11` = commit 5b094f5 (pushed). Never force-push over it.
- Supabase project ref: uhqulmxdcjkpxbxsatug (CLI linked + logged in)
- gh CLI logged in (mxjoker); repo https://github.com/mxjoker/the-dregs
- Secrets in .env.local (gitignored): EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. Never print values.
- Generated credentials → MORNING_REPORT.md (gitignored), never in git.
- Schema source of truth: supabase/migrations/ (the docs/*.md files CLAUDE.md cites do not exist in repo — flag in morning report)
- Door mechanic spec: docs/superpowers/specs/2026-06-01-door-mechanic-design.md
- Test accounts: test@/test2@/test5@thedregs.app, password dregs2026! (test5 profile_id dff5e90b-c905-455a-9491-be6ca1d3e511)
- 9 seed profiles exist (Margot, Theo, Ravi, Jules, Sasha, Finn, Priya, Clem, Dex) with fake auth_ids
- Expo SDK 56; no expo-updates installed yet; no EAS projectId in app.json yet
- Pre-existing tsc errors: stale Supabase generated types (matches/messages → never) + Deno edge fn files swept into tsc

## Plan (status: ⬜ todo / 🔄 in progress / ✅ done)
1. ✅ Pre-flight: CLI logins verified, rollback tag pushed, WIP committed (fabc095)
2. ✅ Wave 1: tsc clean (types regenerated, commit 7c5e2fe); research done; 21 profiles in supabase/seed-data/fake_profiles.json
3. ✅ Design: migration 20260611000001 (seed_profiles table, auto-like trigger → record_swipe creates match in-request, canned-reply trigger, last_message_at trigger) — APPLIED TO PROD
4. ✅ Seeded: scripts/seed-fake-profiles.mjs run, seed_profiles = 30. E2E PASSED twice (scripts/e2e-canned-reply.mjs vs margot@dregs.test and dashiell@seed.thedregs.app): instant match, canned reply once, ordering, last_message_at
   - Joe decided (asked ~7:30pm): keep 24h vibe-check timer, skip button now visible in prod builds
5. 🔄 Deploy: expo-updates installed, EAS project bc1ebc13-50d8-4872-94dd-675ed4122da5, runtimeVersion sdkVersion policy. PUBLISHED to branch `production` (update group a84d67f6-92bc-4033-8bf7-81374df594a0, runtime exposdk:56.0.0). EXPO_PUBLIC_* env vars registered in EAS production environment. Friend link: exp://u.expo.dev/bc1ebc13-50d8-4872-94dd-675ed4122da5?channel-name=production&runtime-version=exposdk:56.0.0
   - NOW: verifying link loads in iOS simulator Expo Go; then full fresh-user UI flow
6. ✅ Door mechanic: record-door-knock + answer-door-early deployed (e2e: 16/16 checks
   vs prod, both participant roles, via ephemeral doortest-e2e account, cleaned up);
   client UI (knock screen, AnswerDoorSheet, matches-list door states) committed; in update v2
   (group 5643e0b6-f1e2-4a54-bffb-40b273888c05). Also fixed record_swipe daily-limit column
   (created_at→swiped_at), redeployed (v6), reran canned-reply e2e: passed.
7. ✅ Push notifications — DECISION (final): untestable in Expo Go iOS (no remote push support),
   documented as next step in MORNING_REPORT.md rather than shipping unverifiable code
8. ✅ UI verification COMPLETE (iPhone 17e; the 17 Pro device wedges on first boot, erased):
   published-bundle run as fresh user — signup, onboarding, vibe check (skip visible per Joe),
   discover stack with new seeds, like → but-why → match modal → chat → LIVE canned reply.
   Bugs found & fixed & republished (updates v3-v5): matches-screen safe area + session profileId
   + dev-button gating; chat OnboardingProvider crash (new useMyProfileId hook); match modal
   iOS double-Modal race (queue + dedup); realtime publication missing messages/matches
   (migration 20260611000002 — chat realtime had never actually worked).
   Test accounts friendtest-e2e@ and doortest-e2e@ fully deleted.
9. ✅ MORNING_REPORT.md written (gitignored). Memory updated. Run complete 2026-06-12 ~02:45 UTC.

## ⚠️ Incidents for morning report
- users row test2@thedregs.app has auth_id pointing at Joe's REAL auth account
  (mxjoker@yahoo.com); test@thedregs.app points at thedregs99@gmail.com. I reset
  mxjoker@yahoo.com's password to the shared test password before discovering this.
  JOE MUST CHANGE IT. Memory file updated; never touch those two accounts again.
8. ⬜ MORNING_REPORT.md (gitignored): ranked TODO for Joe first, then what changed, what was verified, uncertainties

## Wake-up instructions
On any resume: read this file, run `git log --oneline -5` and
`npx -y ccusage@latest blocks --active --json`. If usage <95% of window,
continue at the first non-✅ step. Update statuses here as steps complete.
