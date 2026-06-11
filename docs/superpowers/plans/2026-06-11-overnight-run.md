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
2. 🔄 Wave 1 (3 subagents):
   a. Reliability: fix tsc noise (exclude supabase/functions, regen DB types), report real errors
   b. Research: how seeding/photos/discover-distance work today; what could empty a friend's stack
   c. Content: draft 25-30 fake profiles + canned replies as structured data (constraints: 140-char caps, no protected-class humor, schema enums)
3. ⬜ Fable: review Wave 1, design seed script + canned-reply mechanism (likely: seed_replies table + trigger on messages insert when other participant is a seed profile)
4. ⬜ Wave 2: implement seed script + reply migration; apply to prod; verify via SQL + app
5. ⬜ Deploy: install expo-updates, eas init/update:configure, publish, verify link opens in Expo Go (iOS simulator), full E2E as fresh user
6. ⬜ Door mechanic (per spec) — only after 5 is solid
7. ⬜ Push notifications — note: does NOT work in Expo Go iOS; implement guarded registration only, lowest priority
8. ⬜ MORNING_REPORT.md (gitignored): ranked TODO for Joe first, then what changed, what was verified, uncertainties

## Wake-up instructions
On any resume: read this file, run `git log --oneline -5` and
`npx -y ccusage@latest blocks --active --json`. If usage <95% of window,
continue at the first non-✅ step. Update statuses here as steps complete.
