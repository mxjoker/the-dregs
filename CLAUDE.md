# The Dregs — Claude Code Context

## What this project is
An anti-dating app (iOS, React Native + Expo + TypeScript + Supabase).
Full product brief and all planning documents are in /docs.

## Source of truth
- Product decisions: docs/The_Dregs_Project_Brief_2026-05-28.md
- Database schema: docs/The_Dregs_Schema_2026-05-28.sql
- Matching algorithm: docs/The_Dregs_Algorithm_2026-05-28.md
- Edge Functions spec: docs/The_Dregs_EdgeFunctions_2026-05-28.md
- DP spend rates: docs/The_Dregs_DP_SpendRates_2026-05-28.md

## Rules
- Read the brief before making any product decision
- "Age" is always in quotes in all user-facing copy
- All bio/prompt text fields are capped at 140 characters in both UI and DB
- No humor targeting protected characteristics
- Safety features (report, block, delete) use plain copy — no jokes
- Schema decisions are locked — don't modify tables without checking the schema doc first

## Tech stack
React Native, Expo, Expo Router, TypeScript, Supabase (auth + db + storage + realtime),
Supabase Edge Functions (Deno/TypeScript), EAS Build, Expo Push Notifications

## Current status
Planning complete. Next: Expo scaffold + Supabase project init + apply schema.