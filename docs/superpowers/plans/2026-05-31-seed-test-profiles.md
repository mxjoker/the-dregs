# Seed Test Profiles — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 9 varied test profiles to the Supabase database so the discover stack has enough variety to test matching, shared red flags, and the match moment screen.

**Architecture:** Single SQL script (`supabase/seed_test_profiles.sql`) run in the Supabase SQL editor. No migrations, no app code changes. chaos_score auto-computed by trigger.

**Tech Stack:** Supabase SQL editor, Postgres DO block

---

## Profiles Summary

| Name   | Pronouns    | Gender      | Employment              | Looking for                      | Structure                          | Framing            |
|--------|-------------|-------------|-------------------------|----------------------------------|------------------------------------|--------------------|
| Margot | she/her     | woman       | funemployed             | emotional_damage                 | still_figuring_it_out              | work_history       |
| Theo   | they/them   | non_binary  | technically_consulting  | situationship_with_potential     | ethically_non_monogamous           | verified_purchases |
| Ravi   | he/him      | man         | in_a_band               | chaos_but_make_it_romantic       | its_complicated                    | work_history       |
| Jules  | she/they    | genderfluid | student_professionally  | someone_who_texts_back           | monogamous                         | verified_purchases |
| Sasha  | any_pronouns| agender     | freelance_everything    | something_undefined              | relationship_anarchist             | work_history       |
| Finn   | he/him      | man         | between_callings        | a_reason_to_stay_in_this_city    | open_relationship                  | work_history       |
| Priya  | she/her     | woman       | employed_unfortunately  | to_be_perceived                  | solo_poly                          | verified_purchases |
| Clem   | they/them   | non_binary  | working_on_something    | my_keys_and_also_love            | not_a_conversation_im_having_on_app| work_history       |
| Dex    | he/him      | man         | on_sabbatical_unplanned | someone_to_blame                 | polyamorous                        | verified_purchases |

---

## Task 1: Run the seed script

**Files:**
- Reference: `supabase/seed_test_profiles.sql` (already written)

- [ ] **Step 1.1 — Open the Supabase SQL editor**

Go to: Supabase dashboard → SQL editor (project `uhqulmxdcjkpxbxsatug`)

- [ ] **Step 1.2 — Paste and run the seed script**

Copy the full contents of `supabase/seed_test_profiles.sql` and run it.

Expected output: `DO` (no errors). The DO block will:
1. Insert 9 rows into `users`
2. Insert 9 rows into `profiles` (chaos_score auto-computed by trigger on INSERT)
3. Insert 27 rows into `profile_red_flags` (chaos_score re-computed per profile after each batch)
4. Insert 20 rows into `profile_prompts`

- [ ] **Step 1.3 — Verify the profiles appeared**

Run this verification query in the SQL editor:

```sql
SELECT
  p.display_name,
  p.pronouns,
  p.employment_status,
  p.looking_for,
  p.chaos_score,
  p.onboarding_step,
  p.vibe_check_passed,
  p.is_visible,
  COUNT(DISTINCT prf.red_flag_id) AS flag_count,
  COUNT(DISTINCT pp.prompt_id)    AS prompt_count
FROM profiles p
LEFT JOIN profile_red_flags prf ON prf.profile_id = p.id
LEFT JOIN profile_prompts pp ON pp.profile_id = p.id
WHERE p.display_name IN ('Margot','Theo','Ravi','Jules','Sasha','Finn','Priya','Clem','Dex')
GROUP BY p.id
ORDER BY p.display_name;
```

Expected: 9 rows, all with `onboarding_step = complete`, `vibe_check_passed = true`, `is_visible = true`, `flag_count = 3`, `prompt_count = 2 or 3`.

- [ ] **Step 1.4 — Verify profiles appear in assemble_stack**

In the app: sign in as a test user (e.g. the main test account), open Discover. The 9 new profiles should appear in the card stack.

If the stack is empty, check that:
- The signed-in user's profile also has `onboarding_step = 'complete'` and `vibe_check_passed = true`
- No previous swipes on these profiles exist (clear via SQL if needed: `DELETE FROM swipes WHERE swiper_id = '<your_profile_id>'`)
