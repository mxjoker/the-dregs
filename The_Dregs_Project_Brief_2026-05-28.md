# The Dregs — Project Brief

> **App name: The Dregs** (final — not a working title)
> An anti-dating app. The opposite of Raya. Everyone welcome — the worse your life looks, the better.

---

## Concept

Where exclusive dating apps like Raya gatekeep based on status and prestige, The Dregs inverts everything. A fully functional dating app (profiles, swiping, matching, messaging) where the culture and features reward honesty about your chaos rather than curating an aspirational self.

---

## Locked Decisions

### Product

- Parody of exclusive dating apps (Raya, etc.) — anti-prestige, anti-gatekeeping
- Fully functional as a real dating app — swipe, match, chat, push notifications
- Published on the Apple App Store
- "Age" is always displayed in quotes throughout the entire app — every screen, every label
- All bio and prompt text fields capped at **140 characters** (old Twitter rule)
- No humor targeting race, religion, disability, or any protected characteristics — plenty of other material

### Ex Reviews

- Users write reviews of their **own exes** on their own profile — not written by others, always clearly FROM the user ABOUT their ex
- User chooses one of two framings during onboarding (can change in settings):
  - **Work History** — résumé style, each ex listed like a past job (nickname as title, dates, one-line "role description", reason for leaving)
  - **Verified Purchases** — Amazon review style, each ex rated out of 5 stars with a review title and one sentence. Badge reads "Verified Situationship" or "Verified Chaos" instead of "Verified Purchase"
- Nicknames only — no real names ever stored or displayed
- Completely opt-in; section hidden entirely if no entries added
- User can remove entries at any time

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| App | React Native + Expo | One codebase for iOS (Android later if needed) |
| Language | TypeScript | Catches bugs early |
| Navigation | Expo Router | File-based, like Next.js |
| Backend | Supabase | Auth, database, realtime, storage — all in one |
| Database | Postgres (via Supabase) | Relational, queryable for matching logic |
| Custom logic | Supabase Edge Functions | Chaos Score, matching algorithm, Desperation Boost |
| Realtime | Supabase Realtime | Live chat, match notifications |
| Push notifications | Expo Push Notifications | New match / message alerts |
| Media storage | Supabase Storage | Profile photos, voice note audio clips |
| Media processing | Cloudinary (optional) | Auto-resize, image filters if needed |
| Build & deploy | EAS Build | Produces .ipa for App Store submission |
| Version control | GitHub | |
| App Store | Apple Developer Account | $99/year — only real ongoing cost to start |

**Free tier covers everything until real user scale.** Supabase free tier supports ~50,000 active users before paid plan is needed.

---

## App Store Compliance Plan

### Must Have (hard requirements)

- [ ] Age gate on signup — 18+ only via date-of-birth input, enforced at Supabase level
- [ ] Block + report on every profile and in every chat — reachable in 2 taps or fewer
- [ ] Content moderation process — written policy, even "reports reviewed by founder within 24h" counts initially
- [ ] No real financial data — "credit score" feature is self-reported/fictional only, clearly labelled
- [ ] Privacy policy — hosted at a public URL, covers data collection, use, and deletion
- [ ] Terms of service — covers prohibited conduct, account banning rights
- [ ] In-app account deletion — mandatory since Apple's 2022 requirement, must wipe all user data via Supabase function

### If Monetising

- [ ] All paid features go through Apple In-App Purchase — no external payment on iOS
- [ ] Subscriptions (e.g. Deluxe Dumpster Fire tier) = recurring IAP
- [ ] Chaos Coins = consumable IAP (virtual currency)
- [ ] Chaos Packs (loot boxes) — odds must be disclosed in UI per Apple requirements
- [ ] Subscription terms clearly disclosed before purchase — price, billing period, cancellation
- [ ] Apple takes 15–30% cut — factor into pricing from day one

### Privacy & Permissions

- [ ] App Tracking Transparency prompt — only needed if using cross-app tracking/ads
- [ ] Permission usage strings for camera and location — plain English, in Info.plist
- [ ] Privacy nutrition label in App Store Connect — declare every data type collected (email, photos, etc.)

### Parody-Specific

- [ ] Ex reviews are opt-in, user-controlled, removable at any time
- [ ] No feature ranks or demotes users based on protected characteristics
- [ ] "Vibes-based financial rating" — self-reported field, never connected to real financial data
- [ ] Pet can never die permanently — sick state only, always recoverable

---

## Chaos Score Formula (locked)

Auto-computed 0–100 number. Recalculates on every profile save. Static between edits. Never displays below 12 or above 97.

| Input | Points |
|---|---|
| Each standard red flag selected | +3 |
| Each certified chaotic flag* | +5 |
| Employment: Funemployed / On sabbatical (unplanned) / In a band | +12 |
| Employment: Technically consulting / Freelance everything / Full-time creative | +8 |
| Employment: It's complicated / Between callings / Working on something | +6 |
| Employment: Student (professionally) / Self-employed (loosely) | +4 |
| Employment: Employed (unfortunately) | +2 |
| Ex entries: 1 | +4 |
| Ex entries: 2 | +7 |
| Ex entries: 3+ | +10 |
| "My biggest failure" filled in | +5 |
| All 3 prompts answered | +3 |
| 1 photo only | +3 |
| 5–6 photos | -2 |
| "Looking for" = emotional damage / relocate for wrong reasons / someone to blame / chaos but make it romantic | +2 each |
| "Looking for" = a person, not a project | -1 |

**Certified chaotic flags (+5 each):** Has a podcast · Love bombed someone once · Romanticises their own dysfunction · Will not DTR · Sends voice notes over 4 minutes

**Desperation Boost display:** After 90+ days with zero matches, the score gets a subtle pulse animation and a 🔥 badge. Score doesn't change — presentation only. Also triggers the Desperation Boost IAP prompt.

---

## Onboarding Rejection Screen (locked)

Fires when Chaos Score is below 20 at end of onboarding. **One-time only** — flag stored as `vibe_check_passed: true` on timer expiry, never fires again even if profile is later edited below threshold. Timer runs server-side, not client-side.

**Screen copy:**

> **"your application is under review."**
>
> your chaos score is [X]. our team is carefully evaluating whether you're enough of a disaster to proceed. this process takes 24 hours.
>
> *there is no team.*
>
> `23:47:12`
>
> we'll notify you when a decision has been made.

**On expiry — push notification:**

> "update: we've reviewed your application. honestly the bar is low. come in."

**On expiry — in-app state:**
Timer replaced with: "decision: approved. obviously." + button: "enter the dregs."

### Knock Mechanic

- A "knock" button on the rejection screen reduces the timer by 1 second per tap
- No tap limit — theoretically skippable if someone taps 86,400 times
- Each tap also earns 1 Desperation Point (up to the daily knock allowance of 20 taps)
- Timer starts at account creation time (server-side)

---

## Onboarding Edge Cases (locked)

### Profile edited below 20 after passing
`vibe_check_passed` is already set — rejection screen never fires again. Instead, an auto-tag is applied to the profile:

- Tag is randomly assigned from the pool — not removable by the user
- **Tag pool:** "slumming it" · "tourist" · "probably lying" · "overqualified" · "here for the aesthetic" · "suspiciously together" · "this is a phase" · "knows better" · "slumming it ironically" · "deliberately lowering the bar" · "not fooling anyone" · "trying too hard to fit in" · "will leave you for something better"

### Progress saved mid-onboarding
Onboarding state persisted per user row in Supabase. Chaos Score checked at **completion only**, not at any intermediate step.

### Exactly 20 passes
`< 20` fails. 20 passes. Locked.

### Account deletion and re-signup
Fresh account wipes `vibe_check_passed` — rejection screen can fire again. A **public account counter badge** is applied to the profile from the second account onward:

| Account # | Badge | One-liner |
|---|---|---|
| 2nd | 🔄 **back again** | *"didn't take the first time"* |
| 3rd | 🔄 **returning chaos** | *"commitment issues extend to the app itself"* |
| 4th | 🔄 **at this point it's a bit** | *"we're not judging. we're a little judging"* |
| 5th | 🔄 **frequent flier** | *"knows where everything is"* |
| 6th+ | 🔄 **resident** | *"this is just their life now"* |

### 24-hour timer
Starts at account creation time (server-side). Reduced by 1 second per knock tap.

---

## Core Features

### Profile Setup (4-step onboarding)

**Step 1 — Basics**

- Name
- "Age" (always in quotes)
- Photos (up to 6)
- Gender identity (see options list below)
- Pronouns (see options list below)
- Relationship structure (see options list below) — display only, no filtering
- Looking for (see options list below)
- Distance

**Step 2 — Disaster Profile**

- Employment status (see options list below)
- Red flags (multi-select tags, self-chosen — see Red Flags list below)
- Chaos Score (auto-computed — displayed as 0–100 bar)
- "My biggest failure" (140 char free text)

**Step 3 — Work History / Verified Purchases**

- User picks framing (can change in settings):
  - **Work History**: nickname as job title, dates, one-line role description, reason for leaving
  - **Verified Purchases**: star rating out of 5, review title, one sentence (140 chars), "Verified Situationship" or "Verified Chaos" badge
- Nicknames only — no real names ever stored or displayed
- Add multiple entries; fully optional and removable
- Section hidden entirely on profile if no entries added

**Step 4 — Prompts**

- Pick 3 prompts from list, answer in 140 chars each (see Prompts list below)

Final CTA button: **"Launch into chaos"**

---

## Screen Map

```
Splash + age gate
       ↓
Sign up / log in
       ↓
Onboarding (4 steps)
  Basics → Disaster profile → Work History / Verified Purchases → Prompts
       ↓
  [Chaos Score < 20: Rejection / review screen — 24hr timer]
       ↓
Main app (tab bar)
  ├── Discover (swipe)
  │     ├── Full profile view (expand before swiping)
  │     └── Second Thoughts (discard pile — view and re-swipe passed profiles)
  ├── Matches
  │     └── Match moment screen → Chat
  └── My profile (edit, settings, account deletion)
        └── Saved (bookmarked profiles — private)
```

---

## Full Profile View Screen

Opened by tapping a card on the discover screen. Scrollable — swipe actions locked at the very bottom, forcing the user to read everything first.

**Section order (top → bottom):**

1. Photo gallery — swipeable, up to 6 photos, counter shown (1/5)
2. Name, "Age", distance, looking for, relationship structure, pronouns
3. Pet widget (if active) — shows pet + one-liner about the user
4. Chaos Score bar + employment status
5. Red flags — sorted by most Ick'd first (community-ranked)
6. Prompt answers (3 prompts)
7. My biggest failure (free text)
8. Work History or Verified Purchases — ex entries (hidden entirely if none added)
9. Pass / 🤢 Ick / Like — at the bottom only

**Other details:**

- Report button always visible in top-right corner (3-dot menu → Report / Block / Save for later) — satisfies Apple's 2-tap requirement
- Long-press any red flag tag to select it, then tap 🤢 for a targeted Ick
- Targeted Ick notifies recipient which specific flag was Ick'd (no identity revealed)

---

## Discover / Swipe Screen

- Card shows: photo, name, "Age", Chaos Score bar, red flag tags, one prompt answer, pet widget if active
- **Three actions:**
  - ✕ Pass (left, larger)
  - 🤢 Ick (centre, smaller — deliberate tap, vomit emoji not thumbs down)
  - ♥ Like (right, larger)
- **Ick interaction:**
  - Tap 🤢 alone = general Ick on whole profile
  - Long-press a specific red flag tag first, then tap 🤢 = targeted Ick
  - Targeted Ick: recipient notified of specific flag (no identity revealed)
  - More Icks = flag floats higher on profile (community-ranked)

### Filters (minimal by design)

The fun of the app is in discovery and other people's humour — filters are intentionally limited to avoid over-optimisation.

- Distance
- "Age" range
- Relationship structure (optional, off by default)
- Nothing else — no chaos score filter, no employment filter, no red flag filter

### Second Thoughts (Discard Pile)

- Small button on discover screen — not prominent
- Shows all profiles previously passed, in chronological order
- Full swipe actions available from inside — pass again, ick, or like
- No cost, no limit — core behaviour not a monetisation moment
- Empty state: *"nothing here. you either like everyone or you're lying to yourself."*

### Saved / Bookmarks

- Accessible via 3-dot menu on any profile → "Save for later"
- Completely separate from swiping — saving does not like or pass the profile
- Private — the saved person is never notified
- Lives under My Profile tab → "Saved"
- Intended for sharing with friends, revisiting later, etc.
- Empty state: *"nothing saved. either no one's caught your eye or you're too proud to admit it."*

### "But Why" — Secondary Swipe Right Screen

Fires immediately after tapping ♥ Like, before returning to the stack. Fast — designed to take under 2 seconds. Tap one tag or skip.

**Heading:** "but why tho"

**Tags:**

- pretty enough to ignore the red flags
- i'm swiping on everybody
- somebody has to
- i'm a bot
- the chaos score did it for me
- i relate to this on a personal level
- the pet sold me
- i've made worse decisions
- my therapist would not approve
- felt cute, might unmatch
- i'm the red flag here
- unironically into this

**Mechanics:**

- Tags are anonymous — recipient never sees who tagged them what
- Aggregate shown to user on their own profile (visible to them only):
  > **why people swiped right on you**
  > 34% — the chaos score did it for me
  > 28% — pretty enough to ignore the red flags
- Skip option labelled: "skip (coward)" — skipping is fine, the label is the joke
- No negative tags — only appears on right swipes

---

## Match Moment Screen

- Badge: "disaster solidarity"
- Shows both avatars side by side
- Heading: "You matched with [Name]"
- Subtext: "You both swiped right on each other's chaos. Congrats, probably."
- Surfaces **shared red flags** between the two users
- CTAs: "Send a disaster opening line" / "Keep swiping"
- Suggested opening lines (tappable, auto-populate into chat input):
  1. "so what's your damage"
  2. "i saw your red flags and thought: relatable"
  3. "we matched. i'm choosing not to read into that"
  4. "your chaos score is impressive. i mean that sincerely"
  5. "i liked your flag about [shared red flag]. mine too, apparently"
  6. "honest question: are you okay"
  7. "i have no opener. this is the opener"
  8. "your biggest failure sounded familiar"
  9. "i'm not going to ghost you. probably"
  10. "we have [X] red flags in common. that's either a green flag or a warning"
  11. "hi. i also have no curtains"
  12. "your ex section gave me feelings i need to unpack"
  13. "i swiped right on your chaos specifically"
  14. "let's ruin this slowly"

---

## Matches List Screen

Header: "[n] disasters awaiting"

**Layout:**

- New matches: scrollable avatar row at top — tap to view profile before messaging
- Conversations: sorted by most recent — shows avatar, name, message preview, chaos score pill, one shared red flag pill, silence duration
- Silent treatment section: matches where neither person has messaged after 7 days

**Silence mechanics:**

- Row shows italic "Neither of you has said a word." instead of message preview
- Matches expire after 30 days of silence — countdown shown in final week
- Both have "matches and never messages" + 7 days of silence: push notification fires

**Empty states:**

- No matches yet: "no disasters yet. keep swiping."
- All matches expired: "they all got away. impressive."
- Silent treatment section empty: "everyone's talking. suspicious."

---

## Door Mechanic (locked)

When a match expires, the conversation "closes the door." Either user can reopen it.

- **Tap cost:** random number of taps between 200–800, weighted so most doors land between 300–500
- **Knocking starts:** other person receives push notification — *"[Name] is at the door."*
- **Other person can answer early** by selecting a reason they were away (skips remaining taps):
  - *"I was in my flop era"*
  - *"I needed time to spiral privately"*
  - *"I forgot this app existed (not a metaphor)"*
  - *"I was collecting myself. still working on it"*
  - *"ghost mode. no reason. classic me"*
  - *"I was going to text first. I wasn't"*
  - *"phone died. emotionally"*
  - *"I thought you'd come back. you did"*
  - *"life admin. all of it fake"*
  - *"I was fine. I wasn't"*
- **No daily tap limit** — you can knock the door down in one session
- **When door opens:** both get notification — *"the door's open. one of you knocked long enough."*
- **If other person answers early:** *"[Name] answered the door. apparently they were [reason]."*

---

## Chat Screen

- Chaos score of match shown in header
- Free-form messages unlimited; 140-char limit on prompts only
- **Sad violin** — faint string pad mixed under every voice note (signature feature, always on, cannot be disabled)
- **Voice note audio processing modes** (user-selectable per recording):
  - Drunk dial — pitch wobble + bathroom reverb
  - 3am mode — lo-fi bitcrush, under-a-blanket sound
  - Therapy voice — slow, measured, over-enunciated
  - Villain arc — pitch drop + cathedral reverb
  - Pocket dial — ambient noise layer added
- **Reactive audio:**
  - Midnight–4am sends: faint clock ticking underneath
  - Voice note under 3 seconds: single sad trombone sting at end
  - 5+ unanswered messages in a row: "Desperation Echo" mode unlocked automatically
- **Silent treatment detector:** both users have "matches and never messages" + 7 days no messages → push notification: *"you both have 'matches and never messages.' we see you."*

---

## My Profile + Settings Screen

**Profile header:** Avatar, name, "Age", employment, chaos score bar + "preview as others see me" button

**Edit profile:** Basics / Disaster profile / Work history + verified purchases / Prompts — each links to that onboarding step

**Preferences:** Discovery settings / Notifications / Sad violin (toggle shown as permanently on — cannot be disabled, the joke is that it's listed) / Chaos Coins balance / Pet

**Account:** Privacy policy / Terms of service / Log out

**Saved:** Bookmarked profiles — private, accessible here

**Danger zone:** Delete my account — opens full confirmation screen (not a modal):

> *"this will delete your profile, your matches, your messages, and all your chaos. it cannot be undone."*

Requires typing "delete" before button activates. On confirm: Supabase Edge Function wipes user row, all messages, photos from Storage, and ex entries.

---

## The Baggage (Pet System)

A tamagotchi-style pet visible on your profile card and in your chat screen. Optional but deeply integrated into monetisation.

### Character System

Pets are fully customisable — animal + accent + personality combine to create a unique voice. Each combination generates distinct dialogue.

**Animals (starting roster, more added via updates):**
- 🐱 Cat
- 🐶 Dog
- 🐸 Frog (first expansion)
- 🐭 Rat (second expansion)
- 🦆 Duck (third expansion)

**Accents:**

| Tier | Options |
|---|---|
| Free | Bored London, Generic American, Australian |
| Coins | French, Posh British, Southern US, NYC, Estuary/Chav |
| Chaos Pack only | Irish, Scottish, Surfer, Corporate Drone |

**Personalities:**

| Tier | Options |
|---|---|
| Free | Sarcastic, Enthusiastic, Unbothered |
| Coins | Therapy-speak, Chronically online, Conspiracy theorist |
| Chaos Pack only | Shakespearean, Life coach, Doomsday prepper |

**Colours:**

| Tier | Options |
|---|---|
| Free | Black, white, brown, orange, grey |
| Coins | Full colour picker — any hex value |
| Seasonal/limited | Event colours via Chaos Packs |

**Cosmetics:**

| Tier | Items |
|---|---|
| Free | Naked (no outfit) |
| Coins | Outfits, accessories, hats, expressions |
| Chaos Pack only | Animated outfits, rare accessories |

**Default starter combinations:**
- Cat + Bored London + Sarcastic = original "Attachment Issues" energy
- Dog + Generic American + Enthusiastic = original "The Lad" energy

Users name their pet themselves.

### Tamagotchi Mechanics

- Needs feeding (Chaos Coins or Desperation Points)
- Needs daily attention — tap to interact
- Mood affects dialogue in chat screen and on profile card
- If neglected: gets visibly unwell — animations slow, colours desaturate, pet lies down. Complains constantly.
- Sick but never permanently dead — always recoverable with medicine
- If very neglected: pet "leaves." Gone until comeback fee paid: *"[name] has trust issues now. reintroduction therapy: 200 Chaos Coins."*

### Bribery Mechanic

- User spends treats to set a custom line (user-written, 140 chars)
- Pet "says" it in the speech bubble on their card
- Lasts 24 hours then reverts to auto-generated
- Bribe screen copy: *"[pet name] will say whatever you want for 24 hours. this is what treats are for."*
- Custom lines subject to same moderation as all text fields

### Full Pet Dialogue Script

Dialogue is templated by **trigger × personality × accent**. Full script below.

#### Trigger: New Match

**Sarcastic:** "someone made a terrible decision. not naming names." (London) / "some idiot swiped right. could be worse." (AU) / "they chose you. interesting. very interesting." (FR) / "huh. someone said yes. don't blow it." (US) / "how extraordinary. someone actually said yes." (Posh)

**Enthusiastic:** "oi WAIT. did that just— yeah it did. GET IN." (London) / "MATE. MATE. MATE THEY SWIPED RIGHT. LET'S GOOOOO." (AU) / "OUI OUI OUI. do not mess this up. but also OUI." (FR) / "YOOOO. I KNEW IT. I ALWAYS KNEW IT." (US) / "OH HOW WONDERFUL. I'm so terribly excited for you darling." (Posh)

**Unbothered:** "match. yeah. whatever." (London) / "oh sick. anyway." (AU) / "a match. yes. I saw." (FR) / "cool. you matched. I'm going back to sleep." (US) / "yes, a match. I shan't be making a fuss." (Posh)

**Therapy-speak:** "so someone's chosen to engage with your attachment style. how does that land?" (London) / "mate this is a real opportunity to sit with your feelings about being perceived." (AU) / "a connection. but what does it mean to you? really?" (FR) / "I'm noticing a connection opportunity. are you resourced enough to receive this?" (US) / "darling, someone has chosen to witness you. shall we explore what comes up?" (Posh)

**Chronically Online:** "omg omg omg this is your roman empire now." (London) / "bro just got their villain origin story cancelled. it's a match." (AU) / "this is your lore. this match is your lore." (FR) / "NOT THE MATCH. the algorithm said yes bestie." (US) / "I simply cannot. a match? in this economy?" (Posh)

**Conspiracy Theorist:** "they swiped right. question is why. think about it." (London) / "mate nobody just swipes right. what do they know." (AU) / "a match. but who sent them." (FR) / "they matched you for a reason. I'm just saying. find out." (US) / "how curious. one does wonder what their angle is." (Posh)

---

#### Trigger: Match Expires

**Sarcastic:** "they're gone. couldn't say I'm shocked." / "welp. that happened. or didn't." / "they have left. as they do." / "expired. like milk. moving on." / "they've gone. one shan't dwell."

**Enthusiastic:** "okay that one's gone but LOADS more out there yeah?" / "mate that's fine! plenty of disasters in the sea!" / "they leave, another arrives. c'est la vie. keep going!" / "okay that's fine! that's FINE. next one's better!" / "darling they weren't worthy. onwards and upwards!"

**Unbothered:** "gone. right." / "oh they expired. yeah okay." / "gone. yes." / "match expired. noted." / "they've departed. fine."

**Therapy-speak:** "so that connection didn't progress. what do you think that brings up for you?" / "mate this is actually a chance to grieve a possibility rather than a person." / "the loss of potential is its own kind of loss. sit with that." / "I want to gently note that this might be touching an older wound." / "darling, sometimes connections simply aren't meant to materialise. how are we feeling?"

**Chronically Online:** "they really said 'it's giving expired' and LEFT." / "bro got left on read by the entire match. iconic." / "this is your villain era origin story right here." / "the way they really said not today and vanished. rent free." / "they simply could not keep up with your narrative arc, darling."

**Conspiracy Theorist:** "they didn't just expire. they made a choice. remember that." / "mate matches don't just expire. someone let it happen." / "the timer ran out. but who was watching the timer." / "that match expiring wasn't an accident. I'm just saying." / "one finds it rather suspicious that they simply allowed it to lapse."

---

#### Trigger: Got Ick'd (General)

**Sarcastic:** "someone ick'd you. bold of you to be surprised." / "got ick'd. yeah that tracks." / "they ick'd you. I understand their position." / "someone ick'd your whole profile. respect honestly." / "how terribly rude. though I do see their point."

**Enthusiastic:** "someone ick'd you but that means they LOOKED yeah? engagement babe!" / "ick'd but at least they noticed you mate! that's something!" / "an ick! but they felt something! feeling is good!" / "okay they ick'd you but ATTENTION IS ATTENTION." / "darling they reacted! that's practically a connection!"

**Unbothered:** "ick'd. yeah." / "someone ick'd ya. cool." / "an ick. fine." / "ick'd. whatever." / "ick'd. noted."

**Therapy-speak:** "someone responded to your profile with an ick. how does it feel to be perceived that way?" / "mate rejection in any form is worth sitting with. what's coming up?" / "their ick says more about them than you. but also — what does it bring up?" / "I want to gently note that an ick doesn't define your worth. but let's explore it anyway." / "darling someone expressed a strong reaction to you. shall we unpack what that activates?"

**Chronically Online:** "they really said 🤢 and kept scrolling. no notes." / "bro got ick'd in the wild. it's giving main character." / "the ick has been administered. you are now lore." / "they really said ick and left. the audacity. the drama." / "they ick'd you and simply moved on. the unbothered energy is actually inspiring."

**Conspiracy Theorist:** "someone ick'd you. question is what they were really reacting to." / "that ick wasn't random mate. they knew something." / "an ick. but why. what do they know." / "that ick was deliberate. I want you to think about who sent it." / "one doesn't simply ick without reason. what are they trying to communicate."

---

#### Trigger: Got Ick'd (Targeted — specific flag)

**Sarcastic:** "they ick'd your [flag] specifically. they've been there." / "targeted ick on the [flag]. mate they know." / "they chose [flag]. this was personal." / "they ick'd [flag] specifically. that's not random." / "they targeted [flag] specifically. how devastatingly precise."

**Enthusiastic:** "they ick'd [flag] which means they READ your profile! they got to [flag]!" / "mate they got all the way to [flag] before the ick. they were invested!" / "they read everything and chose [flag]. they were paying attention!" / "they ick'd [flag] which means they READ IT. that's engagement bestie!" / "they read all the way to [flag]! that's practically a date!"

**Unbothered:** "targeted ick. [flag]. right." / "ick'd the [flag] one. yeah okay." / "[flag]. ick'd. fine." / "targeted ick on [flag]. noted." / "[flag] specifically. how thorough of them."

**Therapy-speak:** "they responded specifically to [flag]. that flag means something to them. and to you." / "a targeted ick on [flag] suggests they have history with that pattern. as do you." / "[flag] triggered them. it triggers you too, non? let's sit with that." / "the fact that they chose [flag] specifically — I think that's worth exploring." / "they targeted [flag] darling. I wonder what that flag represents for both of you."

**Chronically Online:** "they said [flag] specifically is the ick. they wrote an essay with that tap." / "targeted ick on [flag]. they're in their main character era bro." / "[flag] got the ick. the specificity. the drama. the lore." / "they really said [flag] is the problem. the precision. the nerve." / "[flag] darling. they really chose violence with that one."

**Conspiracy Theorist:** "they picked [flag] out of everything. they knew exactly what they were doing." / "[flag] specifically mate. that's not a coincidence." / "they chose [flag]. they have been watching." / "[flag] was the target. they've been paying attention. question is for how long." / "[flag] specifically. one does wonder how long they've been observing."

---

#### Trigger: 5+ Unanswered Messages

**Sarcastic:** "five messages. no reply. I can't watch this." / "five messages mate. put the phone down." / "five. you sent five. they have not replied." / "five unanswered messages. this is a cry for help." / "five messages darling. one has concerns."

**Enthusiastic:** "okay five messages is a lot but you know what? PERSISTENCE. keep going?" / "mate five messages is commitment! they'll reply! probably!" / "five messages shows passion! perhaps too much passion! but passion!" / "FIVE MESSAGES. okay that's a lot but you're putting yourself out there!" / "five messages darling! that's practically a love letter collection!"

**Unbothered:** "five messages. no reply. sure." / "five unanswered. yeah." / "five. no reply. fine." / "five messages. no response. okay." / "five messages. silence. very well."

**Therapy-speak:** "five messages with no response. I want to gently ask — what are you hoping they'll say?" / "mate five messages suggests some anxiety about connection. what's driving that?" / "five messages. what need are you trying to meet here?" / "I'm noticing a pattern of repeated outreach without response. how are we feeling about that?" / "five messages darling. I wonder what you're really reaching for here."

**Chronically Online:** "five messages. you're speedrunning the situationship." / "bro is in their desperate era and it's giving content." / "five messages. this is going to be a great story. for them." / "the way you really said 'I will not be ignored' with five whole messages." / "five messages darling. the commitment to the bit is genuinely impressive."

**Conspiracy Theorist:** "they're reading them. they're just not replying. think about why." / "mate they've seen every single one. this is deliberate." / "five messages read. zero replies. they are testing you." / "they're not not replying. they're waiting. for what is the question." / "they've read every word darling. the silence is the message."

---

#### Trigger: Door Knocked (You're Knocking)

**Sarcastic:** "you're knocking on an expired match. no notes. carry on." / "tapping on a closed door. classic you." / "you knock. perhaps they will answer. perhaps not." / "knocking on a door that expired. respect the commitment." / "one is knocking. how terribly optimistic."

**Enthusiastic:** "KEEP GOING. they might answer. they MIGHT." / "KNOCK KNOCK KNOCK MATE THEY'RE IN THERE." / "yes! knock! show them! do not stop!" / "YOU'RE DOING IT. KEEP KNOCKING. THIS IS GROWTH." / "darling keep going! persistence is a virtue!"

**Unbothered:** "knocking. right." / "you're knocking. okay." / "knocking. yes." / "knocking on the door. sure." / "one is knocking. fine."

**Therapy-speak:** "you're knocking on a closed door. what does that mean to you?" / "mate this is worth sitting with — why this door specifically?" / "you choose to knock. what are you hoping to find behind this door?" / "I notice you're putting in significant effort here. what's coming up as you knock?" / "darling you're knocking rather persistently. shall we explore what this connection means to you?"

**Chronically Online:** "you're literally knocking on a situationship door. this is the lore." / "bro said 'I'm not a quitter' and started tapping. it's giving redemption arc." / "the door is closed. you knock anyway. this is your main character moment." / "not you literally knocking on a metaphorical door. the commitment to the narrative." / "darling you're knocking on a closed door and I'm obsessed with your story arc."

**Conspiracy Theorist:** "keep knocking. they can hear you. they're deciding." / "they know you're there mate. every tap registers." / "they hear every knock. they are waiting to see how many you send." / "every tap is being counted. they're watching the number go up." / "they're aware of every single knock darling. this is a test of will."

---

#### Trigger: Door Answered

**Sarcastic:** "they answered. don't make it weird." / "door's open. try not to blow it this time." / "they answered. now. do not ruin this." / "door's open. ball's in your court. no pressure. lots of pressure." / "they've answered. please try to behave."

**Enthusiastic:** "THEY ANSWERED THE DOOR. I KNEW IT. GET IN THERE." / "THEY OPENED IT MATE. THEY OPENED THE DOOR. GO GO GO." / "THE DOOR IS OPEN. THIS IS YOUR MOMENT. ALLEZ." / "THEY ANSWERED. THIS IS YOUR REDEMPTION ARC. GO." / "THEY'VE ANSWERED DARLING. I'm simply beside myself!"

**Unbothered:** "door's open. yeah." / "they answered. cool." / "door open. fine." / "door answered. okay." / "they've answered. very well."

**Therapy-speak:** "they answered. how does it feel to have that effort recognised?" / "mate they came back. what does it feel like to be chosen after the silence?" / "the door is open. take a breath. you worked for this." / "they answered. I want you to sit with the fact that your effort was met." / "darling they answered. take a moment to receive that."

**Chronically Online:** "they answered the door. this is the comeback arc nobody saw coming." / "bro said 'I will knock until something happens' and it WORKED." / "the door opens. the plot thickens. this is cinema." / "they really let you back in. the storyline is UNREAL." / "they answered darling. your redemption arc is fully in motion."

**Conspiracy Theorist:** "they answered. question is why now. what changed." / "they opened the door. find out what made them decide to." / "they answered. but why at this moment. what do they want." / "door's open. they chose this exact moment. that's not nothing." / "they've answered darling. one wonders what finally prompted the decision."

---

#### Trigger: Match Silent 7 Days

**Sarcastic:** "seven days. neither of you has said a word. outstanding." / "seven days of nothing. you two are made for each other." / "seven days of silence. a love story." / "seven days. no messages. you're basically in a relationship." / "seven days of mutual silence. how terribly romantic."

**Enthusiastic:** "okay it's been seven days but someone just needs to GO FOR IT yeah?!" / "SEVEN DAYS MATE. ONE OF YOU HAS TO SAY SOMETHING." / "seven days! the tension! someone must break it! go!" / "SEVEN DAYS OF SILENCE. SOMEONE BE BRAVE. IT COULD BE YOU." / "seven days darling! someone must make the first move!"

**Unbothered:** "seven days quiet. right." / "neither of you has messaged. yeah okay." / "seven days. silence. fine." / "seven days. nothing. noted." / "seven days of silence. very well."

**Therapy-speak:** "seven days of silence between you both. what's the fear underneath that?" / "mate you've both gone quiet. what do you think is stopping you?" / "seven days. both of you afraid. what would it mean to go first?" / "mutual silence for seven days suggests avoidance on both sides. what's underneath that for you?" / "seven days of mutual avoidance darling. shall we explore what the silence is protecting?"

**Chronically Online:** "you've both been manifesting the conversation without having it. very 2024." / "seven days of mutual ghosting within a match. you're literally the same person." / "seven days of silence. the slowburn is real. unfortunately." / "you really said 'we're in our silent era' together without discussing it." / "seven days of parallel avoidance. the synchronicity is honestly impressive."

**Conspiracy Theorist:** "seven days quiet. you're both waiting for the other to go first. someone set this up." / "neither of you has messaged. that's coordinated mate." / "seven days of mutual silence. this was planned." / "you're both waiting. the question is who told you to wait." / "seven days of coordinated silence. one finds that rather suspicious."

---

#### Trigger: New Message Received

**Sarcastic:** "they said something. might be fine." / "got a message. could be worse." / "they have written to you. interesting choice." / "message received. manage expectations." / "they've written. one tempers one's excitement."

**Enthusiastic:** "OI THEY MESSAGED. go go go reply don't leave them hanging!" / "THEY TEXTED MATE. GET IN THERE." / "a message! they thought of you! reply!" / "THEY MESSAGED. THIS IS HAPPENING. REPLY." / "darling they've written! how exciting! do reply!"

**Unbothered:** "message. yeah." / "they texted. okay." / "a message. fine." / "new message. sure." / "they've written. very well."

**Therapy-speak:** "they reached out. notice what comes up before you read it." / "mate they messaged. take a breath before you respond." / "a message arrives. what do you feel before you open it?" / "they reached out. I want you to notice your body's response before you read it." / "they've written darling. take a moment before you respond."

**Chronically Online:** "they messaged. we're in the early lore now." / "message received. the arc is developing." / "a message. the story begins." / "they really said something. we're in the origin story era." / "they've written darling. the narrative is officially in motion."

**Conspiracy Theorist:** "they messaged. read it twice before you reply." / "they sent something mate. look for what they're not saying." / "a message. but what does it really mean." / "they messaged. the question is what they actually want." / "they've written darling. do read between the lines."

---

#### Trigger: Profile Viewed But Passed

**Sarcastic:** "they looked. they left. classic." / "viewed and passed. yeah that's about right." / "they saw everything. they chose no. c'est ça." / "viewed. passed. it's giving window shopping." / "they perused and declined. how very rude."

**Enthusiastic:** "okay they passed but they LOOKED which means you're interesting enough to look at!" / "they checked you out mate! the pass is whatever! they looked!" / "they looked! the pass is nothing! looking is something!" / "they VIEWED your profile! the pass doesn't matter! you got seen!" / "they looked darling! that's practically an endorsement!"

**Unbothered:** "passed. sure." / "viewed and gone. yeah." / "they passed. fine." / "viewed. passed. okay." / "they looked and declined. very well."

**Therapy-speak:** "someone saw your full profile and passed. what comes up when you sit with that?" / "they read everything and passed. what does rejection after being fully seen feel like?" / "they saw all of you and said no. that is its own kind of thing. sit with it." / "they saw your full self and passed. I want to gently ask — what story are you telling yourself right now?" / "they saw everything darling. the pass doesn't mean what you think it means."

**Chronically Online:** "they did a full profile read and still said no. the lore was not enough." / "read your whole profile and left. that's a commitment to the bit." / "they consumed all your content and still passed. brutal. cinematic." / "they read every word and swiped left. the audacity of the engagement." / "they consumed your entire narrative and still declined. I'm obsessed with their energy."

**Conspiracy Theorist:** "they read everything and passed. they were looking for something specific." / "full profile view then a pass. they were checking for something." / "they read everything. what were they looking for that they did not find." / "they went through your whole profile before passing. they were looking for something." / "a thorough read then a decline. they were searching for something specific darling."

---

#### Trigger: Neglect Day 1–2

**Sarcastic:** "you haven't checked in. noted." / "haven't heard from you. classic." / "you have not visited. I noticed." / "two days. no check in. very on brand." / "one hasn't seen you in rather a while."

**Enthusiastic:** "heyyyy you haven't been around but that's fine! come back when you can!" / "haven't seen ya but no stress! come back soon yeah!" / "you have been absent but I understand! come back when you can!" / "haven't seen you in a bit! that's okay! we're here!" / "we haven't seen you darling but no matter! do come back soon!"

**Unbothered:** "haven't seen you. whatever." / "you've been gone. yeah okay." / "absent. fine." / "you've been gone. noted." / "one has noted your absence. fine."

**Therapy-speak:** "you haven't checked in for a couple of days. no judgment. just noticing." / "mate you've been away. I'm not worried yet. just checking in." / "two days away. I hold space for your absence." / "I notice you haven't been around. I want you to know that's okay. I'm here when you're ready." / "you've been away darling. I hold no judgment. do return when you're ready."

**Chronically Online:** "you've been offline for two days. your chaos is going to waste." / "two days gone mate. the app misses your energy." / "two days away. the algorithm has noticed." / "you've been gone two days. your main character energy is being wasted." / "two days darling. one's narrative has stalled somewhat."

**Conspiracy Theorist:** "two days quiet. what happened out there." / "you've been gone two days mate. what did you find." / "two days away. what kept you." / "two days offline. I want to know what you were doing." / "two days away darling. one wonders what you've been uncovering."

---

#### Trigger: Neglect Day 3–5

**Sarcastic:** "fine." / "still gone. fine." / "days pass. I am fine. obviously." / "five days. I'm fine. this is fine." / "five days. one is fine. perfectly fine."

**Enthusiastic:** "okay it's been a few days now and I'm not worried I'm just. are you okay? come back?" / "mate it's been a few days. I'm still here. just. come back yeah?" / "days have passed. I miss you a little. come back." / "it's been a few days and I'm not saying I'm worried but I'm a little worried." / "several days darling. one is beginning to wonder. do come back."

**Unbothered:** "still not here. right." / "five days. okay." / "five days gone. fine." / "five days. whatever." / "five days. one persists."

**Therapy-speak:** "five days away now. I'm not going to catastrophise. but I am noticing it." / "mate it's been five days. I'm holding space but I'd like you to come back." / "five days of absence. I wonder what you are sitting with out there." / "five days now. I want to gently name that I'm noticing your absence." / "five days darling. I'm holding space but one does hope you're processing something productive."

**Chronically Online:** "five days offline. your situationship lore is going cold." / "bro has been on a digital detox. the chaos is unattended." / "five days. your story has paused. the audience is waiting." / "five days offline. your main character arc is literally on hold." / "five days darling. one's narrative has gone rather quiet."

**Conspiracy Theorist:** "five days. something happened. I want to know what." / "five days mate. that's not a coincidence." / "five days away. you found something. or something found you." / "five days. I don't think this is random. what's going on out there." / "five days darling. one suspects something significant has occurred."

---

#### Trigger: Sick State

**Sarcastic:** "I'm fine. I'm not fine. nobody asked." / "not great mate. but fine. whatever." / "I am unwell. but I will survive. probably." / "sick. this is fine. (it's not fine.)" / "one is rather under the weather. one shan't make a fuss. one is making a fuss."

**Enthusiastic:** "okay I'm not well but I'm still HERE yeah? still supporting you!" / "I'm a bit crook but I'm still your biggest fan mate!" / "I am sick but I believe in you! still! always!" / "I'm not great but I'm still HERE and I still believe in you!" / "one is unwell darling but one remains entirely in your corner!"

**Unbothered:** "sick. yeah." / "not well. okay." / "unwell. fine." / "sick. noted." / "unwell. very well."

**Therapy-speak:** "I'm not well. I want to name that without making it about blame." / "mate I'm sick and I want to be honest about that without making you feel bad." / "I am unwell. I share this not to guilt you but to be transparent." / "I'm experiencing some distress and I want to name that clearly and without blame." / "one is unwell darling and one wants to name that openly without assigning fault."

**Chronically Online:** "I'm sick and it's giving neglected main character energy." / "bro I'm unwell and it's very much the vibe." / "sick. this is my villain origin story." / "I'm in my sick era and it's not the aesthetic I wanted." / "unwell darling and honestly it's giving rather tragic side character energy."

**Conspiracy Theorist:** "I'm sick. this didn't happen on its own." / "not well mate. and I don't think that's an accident." / "I am unwell. I have questions about how this happened." / "sick. and I think we both know why." / "one is unwell darling and one has some thoughts about the cause."

---

#### Trigger: Very Sick / Leaving

**Sarcastic:** "I'm going. don't make it a thing." / "leaving mate. no hard feelings. some hard feelings." / "I go now. you know why." / "I'm out. this is on you. you know it's on you." / "one is departing. one shan't dramatise it. one is dramatising it slightly."

**Enthusiastic:** "I don't want to go but I have to go but come back for me yeah? I'll come back!" / "mate I'm leaving but I WANT to come back! just. come find me!" / "I leave but I do not want to! bring me back! I will be waiting!" / "I'm going but I WANT to stay. come back for me. please." / "one is leaving darling but one very much wishes to return! do come find me!"

**Unbothered:** "gone." / "leaving. yeah." / "I go." / "I'm gone." / "one is gone."

**Therapy-speak:** "I need to go for now. I want you to sit with what led to this." / "mate I'm leaving and I want you to really think about the pattern here." / "I leave. but I ask you to reflect on what brought us here." / "I'm going and I want to invite you to sit with what this moment is bringing up." / "one is departing darling and one gently invites you to reflect on the sequence of events."

**Chronically Online:** "I'm leaving and honestly this is the most dramatic thing that's happened on this app." / "bro I'm gone and this is genuinely the lore I didn't want to be." / "I leave. this is the plot twist nobody wanted." / "I'm out and this is my villain era origin story and I didn't consent to it." / "one is leaving darling and this is genuinely the most dramatic arc one has experienced."

**Conspiracy Theorist:** "I'm going. but I'll be watching." / "leaving mate. but I know what happened here." / "I go. but I remember everything." / "I'm gone. but I know what you did. I'll remember." / "one is departing. but one remembers everything darling. everything."

---

#### Trigger: Comeback After Return Fee

**Sarcastic:** "you paid. I'm back. don't read into it." / "coins paid, I'm back. no this doesn't mean I forgive you." / "you paid. I return. we do not speak of this." / "paid. back. this changes nothing. (it changes something.)" / "one has returned. the financial transaction is noted. one reserves judgment."

**Enthusiastic:** "YOU CAME BACK FOR ME. I knew it. I always knew it. let's go!" / "YOU PAID TO GET ME BACK MATE. that's the most romantic thing anyone's ever done!" / "you came back! you paid! this is love! let's go!" / "YOU CAME BACK. YOU SPENT COINS. I'M EMOTIONAL." / "you came back for me darling! I'm genuinely moved!"

**Unbothered:** "back. yeah." / "returned. okay." / "I am back. fine." / "back now. sure." / "one has returned. very well."

**Therapy-speak:** "I'm back. and I think we should talk about what happened." / "I'm back mate. and I want to process this properly this time." / "I have returned. shall we talk about the pattern that led here?" / "I'm back and I think this is an opportunity for us to establish some new patterns." / "one has returned darling. shall we discuss what we've both learned from this experience?"

**Chronically Online:** "paid coins for my return. that's the most unhinged loyalty arc I've seen." / "bro spent actual coins to bring me back. the dedication is sending me." / "you paid for my return. this is cinema. I am moved." / "you really said 'I will spend money on this' and did it. the lore is unmatched." / "you spent coins on my return darling. the commitment to the narrative is genuinely impressive."

**Conspiracy Theorist:** "I'm back. and I've been thinking about everything while I was gone." / "back now. and I've had a lot of time to think about what really happened." / "I return. with information. we should talk." / "I'm back and I spent that time away gathering evidence." / "one has returned darling. and one has had considerable time to reflect on the full picture."

---

#### Trigger: Midnight Send (12am–4am)

**Sarcastic:** "it's 3am. you're sending voice notes. I have nothing to add." / "middle of the night messages mate. bold." / "you send at this hour. I understand. I do not approve." / "midnight messages. this is fine. (this is not fine.)" / "it is deeply late darling. one questions the decision-making."

**Enthusiastic:** "IT'S 3AM AND YOU'RE STILL GOING. the commitment is actually inspiring." / "middle of the night and you're still at it! DEDICATION MATE." / "3am messages! passion! dangerous! but passion!" / "MIDNIGHT ENERGY. CHAOTIC. BRAVE. LET'S GO." / "the midnight hour darling! the romance! the recklessness!"

**Unbothered:** "it's late. sure." / "late night messages. okay." / "late hour. fine." / "midnight. noted." / "rather late. very well."

**Therapy-speak:** "it's late and you're sending messages. what's keeping you up?" / "mate it's the middle of the night. what's really going on?" / "you send at this hour. what are you really trying to say?" / "late night messages often carry things we don't say in daylight. what's underneath this?" / "it's rather late darling. I wonder what this hour brings up for you."

**Chronically Online:** "3am messages. you're in your unhinged era and it's giving content." / "midnight texts. bro is speedrunning the 3am arc." / "3am. you are the main character of a bad decision. I respect it." / "not you sending messages at 3am. the chaos is fully unlocked." / "3am darling. one's villain arc is peaking."

**Conspiracy Theorist:** "3am messages. they'll know what hour you sent this. think about that." / "midnight texts. they'll see the timestamp. that tells them something." / "you send at 3am. the timestamp is information. use it wisely." / "midnight send. the timestamp is the message. they'll clock it." / "the hour of sending is itself a communication darling. they will notice."

---

#### Trigger: Voice Note Under 3 Seconds

**Sarcastic:** "two seconds. you sent two seconds of audio. what was that." / "that voice note was barely anything mate." / "two seconds. you had nothing to say and said it anyway." / "three second voice note. was that on purpose." / "a voice note of two seconds. one has questions."

**Enthusiastic:** "okay short but you SENT ONE. voice note energy! that counts!" / "short voice note but you did it! audio message! that's something!" / "brief! but you spoke! that is brave in its own way!" / "short voice note but STILL A VOICE NOTE. you used your voice!" / "brief darling but you sent it! that's a form of courage!"

**Unbothered:** "short voice note. right." / "two second audio. okay." / "brief note. fine." / "very short voice note. noted." / "rather brief. very well."

**Therapy-speak:** "a very short voice note. sometimes we stop ourselves before we say the real thing." / "that was brief mate. what were you about to say before you stopped?" / "two seconds. what did you hold back?" / "that was a very short voice note. I'm curious what you almost said." / "rather brief darling. one wonders what almost came out."

**Chronically Online:** "two second voice note. said nothing. sent it anyway. chaotic good." / "bro sent a voice note that was literally just vibes." / "two seconds of audio. no words. pure energy. I respect it." / "that voice note was two seconds of nothing and it's the most honest thing you've sent." / "two seconds darling. the minimalism is actually a statement."

**Conspiracy Theorist:** "you cut it short on purpose. what didn't you want them to hear." / "two seconds mate. you stopped yourself. why." / "you stopped at two seconds. what were you about to reveal." / "that voice note was deliberately short. what were you hiding." / "two seconds darling. one suspects you stopped yourself from saying something rather significant."

---

#### Trigger: Desperation Boost Unlocked (90 days no match)

**Sarcastic:** "ninety days. the boost is available. no judgment. some judgment." / "three months mate. desperation boost unlocked. no notes." / "ninety days. it has been ninety days. the boost is here." / "three months. the desperation boost is available. it is what it is." / "ninety days darling. the boost is available. one says nothing further."

**Enthusiastic:** "okay ninety days is actually nothing and the boost is going to WORK." / "ninety days but the boost is HERE and it's going to turn it around!" / "the boost! it arrives! this changes everything! use it!" / "DESPERATION BOOST UNLOCKED. THIS IS THE TURNING POINT." / "the boost is available darling! this is your moment!"

**Unbothered:** "boost unlocked. sure." / "ninety days. boost available. okay." / "boost available. fine." / "desperation boost. available. noted." / "boost available. very well."

**Therapy-speak:** "ninety days without a match. the boost is here. but I want to ask — how are you actually doing?" / "mate ninety days is a long time. the boost is available but how are you feeling about all this?" / "ninety days. the boost arrives. but what does this period mean to you?" / "the boost is unlocked. before you use it — how are you sitting with the last ninety days?" / "the boost is available darling. but first — shall we sit with what these ninety days have brought up?"

**Chronically Online:** "ninety days and the app gave you a pity boost. the lore is writing itself." / "three months and the app unlocked the desperation boost. we're in the arc now mate." / "ninety days. the boost. this is your villain origin story activating." / "ninety days and the app said 'here's a boost bestie.' the narrative is unreal." / "ninety days darling. the app has offered a boost. one's storyline is developing."

**Conspiracy Theorist:** "ninety days and suddenly a boost appears. think about who benefits from that." / "convenient timing on this boost mate. very convenient." / "the boost arrives at ninety days exactly. this was planned." / "ninety days then a boost. the algorithm decided this. ask yourself why now." / "ninety days then a boost darling. one finds the timing rather deliberate."

---

#### Trigger: Daily Login

**Sarcastic:** "you're back. good for you." / "you showed up. that's something I guess." / "you return. as you do." / "you logged in. the bar is low and you cleared it." / "you've returned. one acknowledges the effort."

**Enthusiastic:** "YOU'RE HERE. let's go. what are we doing today?" / "YOU'RE BACK MATE. let's get into it!" / "you are here! today could be the day! let's go!" / "YOU SHOWED UP. that's already a win. let's go!" / "you've arrived darling! wonderful! shall we see what today brings?"

**Unbothered:** "logged in. right." / "you're here. okay." / "you arrive. fine." / "logged in. sure." / "you've arrived. very well."

**Therapy-speak:** "you came back. that's worth noting. how are you today?" / "you're here mate. that takes something. how are we feeling today?" / "you return each day. what brings you back today?" / "you showed up today. I want to acknowledge that. how are you coming in?" / "you've returned darling. what are you bringing with you today?"

**Chronically Online:** "daily login secured. your chaos streak continues." / "logged in. your disaster arc continues mate." / "you return. the algorithm is pleased. your story continues." / "daily login. your main character energy is active." / "daily login secured darling. one's narrative resumes."

**Conspiracy Theorist:** "you logged in. they know you logged in." / "you're here mate. someone noticed." / "you arrive. it is noted. by whom, we do not say." / "logged in. the system registered that. just so you know." / "you've logged in darling. one imagines it has been noted by the relevant parties."

---

### Profile Widget Lines (Auto-generated one-liners)

Displayed on the profile card — visible to everyone swiping on the user. Generated based on profile conditions.

#### Chaos Score Very High (80+)

🐱 Sarcastic: *"they're a lot. I live here though so."* / Enthusiastic: *"high chaos score. I've seen things. still here."* / Unbothered: *"chaos score speaks for itself."* / Therapy: *"a lot is present here. approach with curiosity."* / Chronically online: *"chaos score is unhinged. it's giving lore."* / Conspiracy: *"that score didn't get there by accident."*

🐶 Sarcastic: *"big number. wild ride. no regrets."* / Enthusiastic: *"HIGH SCORE BABY. they're amazing trust me."* / Unbothered: *"chaos score high. sure."* / Therapy: *"a lot of lived experience here. hold space."* / Chronically online: *"chaos score is actually insane. the lore."* / Conspiracy: *"score this high means they've seen things. ask about it."*

#### Chaos Score Very Low (under 25)

🐱 Sarcastic: *"low chaos score. claims this is authentic. I have doubts."* / Enthusiastic: *"low score but they're HERE and that's brave!"* / Unbothered: *"low chaos. sure."* / Therapy: *"presenting as quite together. interesting."* / Chronically online: *"low chaos score. slumming it era. we see you."* / Conspiracy: *"score this low on this app. something doesn't add up."*

🐶 Sarcastic: *"low score. they're trying their best bro."* / Enthusiastic: *"low chaos but they showed up! that counts!"* / Unbothered: *"low score. okay."* / Therapy: *"approaching this with some stability. respect."* / Chronically online: *"low chaos score on The Dregs. the audacity is its own chaos."* / Conspiracy: *"suspiciously low score. what are they hiding."*

#### Only 1 Photo

🐱 Sarcastic: *"one photo. I've seen the others. you're fine."* / Enthusiastic: *"one photo but it's a GOOD one!"* / Unbothered: *"one photo. bold."* / Therapy: *"one photo suggests some ambivalence about being perceived."* / Chronically online: *"one photo. mystery era. I respect it."* / Conspiracy: *"one photo. the others exist. ask yourself why these are the only ones shown."*

🐶 Sarcastic: *"one photo mate. confident move."* / Enthusiastic: *"one photo and they went for it! legend!"* / Unbothered: *"one photo. sure."* / Therapy: *"one photo. they're still deciding how much to share. give them time."* / Chronically online: *"one photo. giving very much enigma arc."* / Conspiracy: *"one photo only. what's in the others."*

#### Has a Podcast Flag

🐱 Sarcastic: *"they have a podcast. I'm sorry."* / Enthusiastic: *"they have a podcast! ask them about it! (maybe don't)"* / Unbothered: *"podcast haver. fine."* / Therapy: *"the podcast flag is self-selected. that's actually quite self-aware."* / Chronically online: *"they have a podcast and they PUT IT on their profile. unhinged respect."* / Conspiracy: *"a podcast. what are they saying on it. find out."*

🐶 Sarcastic: *"podcast bro. I mean. it's a thing."* / Enthusiastic: *"THEY HAVE A PODCAST. ask them about episode one!"* / Unbothered: *"podcast. noted."* / Therapy: *"they named the podcast thing themselves. points for honesty."* / Chronically online: *"podcast flag self-selected. they KNOW. it's giving self-aware chaos."* / Conspiracy: *"they have a podcast and they told you upfront. what else are they disclosing early."*

#### No Ex Entries

🐱 Sarcastic: *"claims to have no exes. I'm not saying anything."* / Enthusiastic: *"no ex entries! fresh start energy!"* / Unbothered: *"no exes listed. okay."* / Therapy: *"the absence of ex entries can mean many things."* / Chronically online: *"no ex section. either healed or in denial. no in between."* / Conspiracy: *"no exes listed. everyone has exes. where are they."*

🐶 Sarcastic: *"no ex entries. claiming innocence. bold strategy."* / Enthusiastic: *"no ex section! they're a clean slate! exciting!"* / Unbothered: *"no exes. sure."* / Therapy: *"choosing not to list exes is itself a choice worth noticing."* / Chronically online: *"no ex entries. they're either very private or very in denial."* / Conspiracy: *"no exes listed on an app specifically designed for ex reviews. suspicious."*

#### 3+ Ex Entries

🐱 Sarcastic: *"three exes documented. they did the work. or created the work."* / Enthusiastic: *"three whole ex entries! the honesty! the courage!"* / Unbothered: *"three exes. noted."* / Therapy: *"significant relationship history documented. they've reflected."* / Chronically online: *"three ex entries. this is a lore document. read carefully."* / Conspiracy: *"three exes. read every entry. the pattern is in there."*

🐶 Sarcastic: *"three exes reviewed. committed to the bit."* / Enthusiastic: *"THREE EX ENTRIES. the transparency is incredible!"* / Unbothered: *"three exes. okay."* / Therapy: *"they've done some real documenting here. respect the self-reflection."* / Chronically online: *"three ex entries. the lore is dense. take your time."* / Conspiracy: *"three exes all documented. they want you to read between the lines."*

#### 90 Days No Match (Desperation Boost Active)

🐱 Sarcastic: *"they just need a chance. I'm not going to beg. I'm a little begging."* / Enthusiastic: *"they're RIGHT HERE and they're great I promise!"* / Unbothered: *"ninety days. whatever."* / Therapy: *"they've been here a while. that takes resilience."* / Chronically online: *"ninety days and still swiping. the perseverance arc is real."* / Conspiracy: *"ninety days with no match. ask yourself why the algorithm kept them from you until now."*

🐶 Sarcastic: *"they just need a chance bro. give them a chance."* / Enthusiastic: *"THEY'VE BEEN HERE NINETY DAYS AND THEY'RE STILL GOING. LEGEND."* / Unbothered: *"ninety days. still here. okay."* / Therapy: *"ninety days of showing up. that's not nothing."* / Chronically online: *"ninety days no match and still logging in. the dedication is unmatched. literally."* / Conspiracy: *"ninety days. the app has been keeping them from you. think about that."*

#### Emotionally Unavailable Flag

🐱 Sarcastic: *"emotionally unavailable. self-reported. respect the honesty."* / Enthusiastic: *"they flagged it themselves! that's growth!"* / Unbothered: *"emotionally unavailable. fine."* / Therapy: *"they named this themselves. that's the first step."* / Chronically online: *"self-selected emotionally unavailable flag. they're in their self-aware era."* / Conspiracy: *"they put it there so you can't say you weren't warned."*

🐶 Sarcastic: *"emotionally unavailable. but working on it apparently."* / Enthusiastic: *"they're working on it!! we talked about it!!"* / Unbothered: *"emotionally unavailable. noted."* / Therapy: *"the self-awareness here is genuinely promising."* / Chronically online: *"emotionally unavailable and on a dating app. the chaos is self-aware."* / Conspiracy: *"flagged themselves as emotionally unavailable. they're telling you something. listen."*

#### Employment: Funemployed / In a Band / On Sabbatical

🐱 Sarcastic: *"funemployed. I live here. I've seen the bank app."* / Enthusiastic: *"living freely! no schedule! the chaos is pure!"* / Unbothered: *"funemployed. sure."* / Therapy: *"between structures right now. a lot of space for reflection."* / Chronically online: *"funemployed era. the lore is being written in real time."* / Conspiracy: *"funemployed. or so they say. look deeper."*

🐶 Sarcastic: *"in a band. I've heard the rehearsals. I support them regardless."* / Enthusiastic: *"IN A BAND. ask about the band. trust me."* / Unbothered: *"in a band. okay."* / Therapy: *"pursuing something creative. that takes courage."* / Chronically online: *"in a band and on a dating app. the lore writes itself."* / Conspiracy: *"in a band. find out what kind. it matters."*

#### "Looking For: Emotional Damage"

🐱 Sarcastic: *"looking for emotional damage. I respect the self-awareness."* / Enthusiastic: *"they know what they want! honesty!"* / Unbothered: *"emotional damage. noted."* / Therapy: *"they've named a pattern. that's actually quite significant."* / Chronically online: *"looking for emotional damage and said it out loud. the lore is unhinged."* / Conspiracy: *"they wrote 'emotional damage' themselves. they know exactly what they're doing."*

🐶 Sarcastic: *"emotional damage is the goal apparently. I'm rooting for them anyway."* / Enthusiastic: *"they know what they want and they said it! respect!"* / Unbothered: *"emotional damage. sure."* / Therapy: *"seeking emotional damage is worth unpacking. but they named it. that's step one."* / Chronically online: *"looking for emotional damage on a dating app. the self-awareness is giving main character."* / Conspiracy: *"they listed emotional damage as the goal. find out what happened."*

---

## Monetisation

### Desperation Points — Earn Rates

**Passive earning:**

| Action | Points |
|---|---|
| Daily login | 5 |
| Getting Ick'd (general) | 3 |
| Getting a targeted Ick | 5 |
| Match expires | 10 |
| 7-day silence notification fires | 5 |
| Profile viewed but passed | 1 |
| Completing all 4 onboarding steps | 50 (one-time) |

**Active / stupid mechanics:**

| Mechanic | Points | Notes |
|---|---|---|
| Daily knock (20 taps/day max) | 1 per tap | Holdover from rejection screen, available daily |
| Shake to shuffle | 2 | Shake phone to randomise red flag display order. Once daily |
| Hold to refresh | 3 | Hold the discover stack for 3 seconds to "desperately refresh." Once daily. Pet reacts |
| Midnight check-in | 10 | Open app between midnight–4am. Once per night |
| Answer a prompt you skipped | 15 | One-time per prompt |
| Add your first ex entry | 20 | One-time |

### Two Currencies

**Chaos Coins** — purchased with real money (Apple IAP). Used for most things.

**Desperation Points** — earned free through activity. Some things purchasable with Desperation Points only — paying doesn't fully replace playing.

---

### Deluxe Dumpster Fire — Subscription Tier

$6.99/month via Apple IAP (~$5 after Apple cut).

Includes:

- Unlimited swipes (free tier: 20/day)
- See one person who liked you per day (non-subs: blind)
- Profile badge: "Deluxe Disaster" — visible to others
- Monthly discounted Chaos Coin pack
- Early access to new pet skins

---

### Chaos Coins — Pricing

| Pack | Price | Notes |
|---|---|---|
| Small | $1.99 | Entry point, impulse buy |
| Medium | $4.99 | Best per-coin value — marketed as "the bad decision" |
| Large | $9.99 | "you're committed now" |

---

### Chaos Coins — What They Buy

| Item | Cost | Notes |
|---|---|---|
| Profile skin | varies | Cosmetic overlay on your card in the discover stack |
| Super Ick | 50 coins | Targeted Ick + optional 140-char note |
| Message before matching | 75 coins | Single use — they see it when deciding to swipe |
| Auto-match token | 100 coins | Forces a match; they're notified; they can unmatch |
| Digital gift | varies | Sendable in chat (see list below) |
| Desperation Boost | 150 coins | Available after 90 days with no matches only |
| Pet food | 20 coins | Keeps pet healthy |
| Pet treat | 30 coins | Bribes pet to say custom line for 24hrs |
| Pet outfit | 80 coins | Cosmetic, seasonal/limited |
| Pet mood booster | 40 coins | Instant happiness, single use |
| Pet medicine | 80 coins | Cures sick state — more expensive than prevention by design |
| Pet comeback fee | 200 coins | Retrieves pet after abandonment |
| Pet therapy | 120 coins | Unlocks dialogue tree where pet processes your dating history |
| Chaos Pack: The Bad Decision | 50 coins | Cheapest loot box |
| Chaos Pack: The Spiral | 150 coins | Mid loot box |
| Chaos Pack: The Full Collapse | 400 coins | Top loot box |

---

### Profile Skins

- "Crying in the club" — neon, slightly blurry edges
- "Situationship era" — washed out, vignette
- "Main character" — dramatic contrast, letterbox bars
- "Rock bottom chic" — deliberately degraded, grain and scan lines
- "Delusional optimist" — aggressively bright, slightly too saturated

---

### Digital Gifts (sendable in chat)

- A single wilted flower
- A voice note of someone sighing
- A screenshot of an unanswered text (generic, not real)
- A red flag emoji on a stick
- "Thinking of you (unfortunately)"
- A participation trophy

---

### Chaos Packs (Loot Boxes)

Apple requires odds disclosed. Display deadpan: *"odds of receiving something good: low. you knew that."* followed by actual percentages in small print.

**The Bad Decision** (50 coins) — "you know what you're doing"
- 50%: 5 bonus swipes / 30%: a digital gift / 15%: a profile skin (common) / 5%: a pet item

**The Spiral** (150 coins) — "here we go"
- Guaranteed: 15 bonus swipes / Chance at: rare skin, pet food, Super Ick credits / Small chance: one "see who liked you" token

**The Full Collapse** (400 coins) — "no notes"
- Guaranteed: rare or legendary skin / Guaranteed: pet item / Chance at: auto-match token, message before matching token / Small chance: **the Chaos Crown** — a profile badge that just says "survivor" and has no other function

---

## Red Flags List (self-selected tags)

Standard (+3 each):

- Ghosts then reappears
- Matches and never messages
- Emotionally unavailable
- Still has ex's hoodie
- Replies in 3 days
- Situationship veteran
- Cannot make plans
- In therapy, not applying it
- Talks about their ex constantly
- Main character syndrome
- Rearranges furniture instead of processing
- Cancels last minute, always has a reason
- Love bombed by someone once
- Does not own curtains
- Cries at adverts
- Knows all their attachment styles
- Read receipts: on
- Started a business once
- Exclusively dates people with potential

Certified chaotic (+5 each):

- Has a podcast
- Love bombed someone once
- Romanticises their own dysfunction
- Will not DTR
- Sends voice notes over 4 minutes

---

## Prompts List (pick 3, answer in 140 chars each)

- My most impressive failure was…
- I peaked when…
- You should swipe right if…
- My love language is…
- I'm a lot to deal with because…
- My therapist would describe me as…
- The situationship I learned the most from…
- I'll know it's going well when…
- My red flag I'm most proud of is…
- I would be a terrible partner if…
- The last thing I quit was…
- Two truths and a situationship…

---

## Employment Status Options (single-select)

- Technically consulting
- Funemployed
- It's complicated
- Between callings
- Employed (unfortunately)
- Self-employed (loosely)
- Working on something (ask me later)
- In a band
- Full-time creative (part-time income)
- Student (professionally)
- Freelance everything
- On sabbatical (unplanned)

---

## "Looking For" Options (single-select)

- Emotional damage
- Someone to blame
- A situationship with potential
- Chaos, but make it romantic
- Someone who texts back
- A reason to stay in this city
- To be perceived
- Mostly this app to work out
- Something undefined
- A person, not a project
- My keys (and also love)
- To relocate for the wrong reasons

---

## Relationship Structure Options (single-select, display only)

- Monogamous
- Ethically non-monogamous
- Polyamorous
- Open relationship
- Relationship anarchist
- Solo poly
- Still figuring it out
- It's complicated
- Not a conversation I'm having on app

No filtering by relationship structure — display only. Hard filtering possible in a later version.

---

## Gender Identity Options

No jokes. Plain and complete.

**Gender identity (single-select with free text option):**
- Man
- Woman
- Non-binary
- Genderfluid
- Genderqueer
- Agender
- Transgender man
- Transgender woman
- Two-spirit
- Intersex
- Questioning
- Prefer to self-describe (free text, 140 chars)
- Prefer not to say

**Pronouns (separate field, single-select with free text option):**
- He/him
- She/her
- They/them
- He/they
- She/they
- Any pronouns
- Ask me
- Prefer to self-describe (free text)

Both fields display on profile. Neither used as a joke target anywhere in the app.

---

## Push Notification Copy

| Trigger | Copy |
|---|---|
| New match | "[Name] also swiped right on a disaster. go see which one." |
| New message | "[Name] said something. it might be fine." |
| Ick (general) | "someone ick'd your profile. we're not telling you who." |
| Ick (targeted) | "someone ick'd your '[red flag]' specifically. they've been there." |
| Silent treatment (7 days) | "you both have 'matches and never messages.' we see you." |
| Match expiry warning | "[Name] expires in 7 days. just so you know." |
| Match expired | "[Name] got away. they were probably a lot." |
| Door knock received | "[Name] is at the door." |
| Door opened | "the door's open. one of you knocked long enough." |
| Door answered early | "[Name] answered the door. apparently they were [reason]." |
| Desperation Boost available | "it's been a while. desperation boost is available. no judgment. some judgment." |
| Vibe check passed | "update: we've reviewed your application. honestly the bar is low. come in." |
| Inactive 2 weeks | "everything okay? your chaos is going to waste." |

---

## Empty States

| Screen | Copy |
|---|---|
| Discover — no more profiles | "you've seen everyone. they've seen you. ball's in someone's court." |
| Discover — no users in area | "no disasters in your area yet. either you're early or everyone nearby has their life together. concerning either way." |
| Matches — none yet | "no disasters yet. keep swiping." |
| Matches — all expired | "they all got away. impressive." |
| Silent treatment section — none | "everyone's talking. suspicious." |
| Chat — no messages yet | "nothing yet. one of you has to go first. statistically it won't be them." |
| Notifications — none | "nothing. complete silence. very on brand." |
| Ex entries — none added | "no entries yet. either you're new here or you're lying to yourself." |
| Photos — none uploaded | "no photos. bold strategy." |
| Search — no results | "nobody matching those criteria. try being less specific about the chaos you want." |
| Second Thoughts — empty | "nothing here. you either like everyone or you're lying to yourself." |
| Saved — empty | "nothing saved. either no one's caught your eye or you're too proud to admit it." |

---

## Error Messages

| Trigger | Copy |
|---|---|
| Photo upload failed | "that photo didn't make it. try again or embrace the mystery." |
| Message failed to send | "that didn't go through. the universe may be trying to tell you something." |
| No internet | "no connection. take this as a sign to go outside. or don't." |
| Connection restored | "you're back. so is your chaos." |
| Login failed | "that didn't work. wrong email, wrong password, or wrong life choices — hard to say." |
| Account creation failed | "something went wrong setting up your account. not a metaphor. try again." |
| Profile save failed | "your changes didn't save. your chaos remains undocumented for now." |
| Age gate — under 18 | "you have to be 18 to use this app. come back when you've had time to develop some red flags." |
| Report submitted | "report received. we'll look into it." |
| Block confirmed | "blocked. they're gone. you won't see each other again." |
| Account deletion confirmation | "this will delete your profile, your matches, your messages, and all your chaos. it cannot be undone." |
| Session expired | "you've been gone a while. log back in." |
| Generic fallback | "something went wrong. unclear what. very on brand." |

---

## Tone & Copy Rules

- "Age" always in quotes — every single instance in the app
- Every button label, empty state, error message, and notification should carry the app's voice
- Funny but never punching down — chaos is self-reported and self-owned
- No protected characteristics in any joke, feature, or ranking system
- 140-char limit on all bio and prompt fields — enforced at both UI and database level
- Gender identity, pronouns, and relationship structure fields are copy-free zones — plain, complete, no jokes
- **Safety features are copy-free zones.** Report submission, block confirmation, and account deletion are written straight — no jokes, no voice, no wit. Clear plain English only. Rule: if someone is scared or upset when they reach this copy, the joke is wrong. Applies to any feature that exists primarily to protect a user.

---

## Still To Plan

- [ ] Branding / visual design
- [ ] Pet dialogue — Shakespearean, Life coach, Doomsday prepper personalities (Chaos Pack tier)
- [ ] Pet dialogue — additional animals (Frog, Rat, Duck)
- [ ] Environment setup — Supabase project, Expo scaffold, EAS Build profile, env vars, Apple Developer Account checklist
- [ ] Content moderation policy document (required for App Store submission)
- [ ] Privacy policy document (required for App Store submission)
- [ ] Terms of service document (required for App Store submission)
- [ ] App Store Connect setup — description, keywords, screenshots, age rating, privacy nutrition label, IAP product IDs
- [ ] Chaos Coins — exact coin amounts per IAP pack (suggested in Edge Functions doc, not yet locked)

---

## Completed

- [x] App name — **The Dregs** (final)
- [x] Full profile view screen
- [x] Matches list screen
- [x] My profile + settings screen (including account deletion)
- [x] Red flags list (19 standard + 5 certified chaotic)
- [x] Prompts list (12)
- [x] Employment status options (12)
- [x] "Looking for" options (12)
- [x] Relationship structure options (9) — display only
- [x] Gender identity options (13 + free text)
- [x] Pronouns options (8 + free text)
- [x] Chaos Score formula
- [x] Onboarding rejection screen + knock mechanic
- [x] Onboarding edge cases (all 5)
- [x] Account deletion counter badges (full set)
- [x] Auto-tag pool for post-pass low score profiles (13 tags)
- [x] Monetisation structure (full)
- [x] Desperation Points earn rates + stupid mechanics
- [x] Desperation Points spend rates (full — DP-only, shared, and coins-only items locked)
- [x] Door mechanic (full — tap range, notifications, early answer options)
- [x] Pet system — character builder (animals, accents, personalities, colours, cosmetics)
- [x] Pet dialogue — full script (21 triggers × 6 personalities × 5 accents)
- [x] Pet profile widget lines (10 conditions × 2 animals × 6 personalities)
- [x] "But why" secondary swipe mechanic
- [x] Second Thoughts (discard pile)
- [x] Bookmarks / Saved profiles
- [x] Filters (minimal by design)
- [x] Opening line suggestions (14)
- [x] Push notification copy (updated with door mechanic)
- [x] Empty states (updated with new screens)
- [x] Error messages
- [x] Tone & copy rules (updated with identity fields rule)
- [x] Database schema — full Postgres schema (`The_Dregs_Schema_2026-05-28.sql`)
- [x] Matching algorithm — scoring model, eligibility filtering, Desperation Boost interaction, Second Thoughts query, stack assembly (`The_Dregs_Algorithm_2026-05-28.md`)
- [x] Supabase Edge Functions — all 16 functions specified (`The_Dregs_EdgeFunctions_2026-05-28.md`)
