# FocusTogether

A calm focus-timer web app for students. **Week 1 foundation:** sign in with Google, start a session in two taps, focus with a timer that stays accurate in the background, and review your history. No punishment mechanics anywhere — stopping early still counts.

> Not built yet (by design): rooms / friends, AI features, app blocking. The data model has placeholder fields (`roomId`, `friendsActiveCount`) ready for week 2.

## Stack

- React 19 + Vite + TypeScript
- Tailwind CSS v4 (class-based dark mode)
- Firebase: Auth (Google) + Firestore (offline persistence on)
- react-i18next — Thai (default) and English
- vite-plugin-pwa — installable, works offline for the app shell
- Deploy target: Vercel

## Quick start

```bash
npm install
cp .env.example .env      # then fill in the values (see below)
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). Until `.env` is filled in, the app shows a friendly "setup needed" screen instead of crashing.

Other scripts: `npm run build` (type-check + production build), `npm run preview`, `npm run typecheck`.

## Firebase setup

1. [Firebase console](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Sign-in method** → enable **Google**.
3. **Build → Firestore Database** → **Create database** (production mode is fine; the rules below lock it down).
4. **Project settings → Your apps → Web (`</>`)** → register an app and copy the config values into `.env`:

   ```
   VITE_FIREBASE_API_KEY=
   VITE_FIREBASE_AUTH_DOMAIN=
   VITE_FIREBASE_PROJECT_ID=
   VITE_FIREBASE_STORAGE_BUCKET=
   VITE_FIREBASE_MESSAGING_SENDER_ID=
   VITE_FIREBASE_APP_ID=
   ```

   (These identify your project; they aren't secrets. Access control lives in `firestore.rules`.)
5. **Authentication → Settings → Authorized domains** → add your Vercel domain(s) once you have them (`localhost` is there by default).
6. Deploy the security rules and the index:

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase use --add            # pick your project
   firebase deploy --only firestore
   ```

   This publishes `firestore.rules` and `firestore.indexes.json`. The History screen needs the composite index (`uid` ascending + `startedAt` descending). If you skip the deploy, the browser console shows a link that creates it in one click.

## Deploy to Vercel

1. Push the repo to GitHub and **Import** it in Vercel (framework preset: Vite — auto-detected).
2. **Settings → Environment Variables**: add the six `VITE_FIREBASE_*` values for Production (and Preview if you want).
3. Deploy. `vercel.json` already handles SPA routing (deep links like `/history` work) and keeps `sw.js` / the manifest from being cached stale.
4. Add the Vercel domain to Firebase **Authorized domains** (step 5 above), otherwise Google sign-in is rejected.

## How the timer stays accurate

The countdown is never "counted" by `setInterval`. When a session starts we store `startedAt` (plus `pausedAt` / `pausedTotalMs` for pauses) in `localStorage`, and every render computes:

```
remaining = planned − (now − startedAt − pausedTotal − currentPause)
```

The interval only triggers repaints (and an extra repaint fires on `visibilitychange` / `focus` / `pageshow`), so a throttled background tab can't drift. If the timer runs out while the tab is away, the session is recorded as completed with its true end time. Reloading the page mid-session resumes it. The remaining time also shows in the browser tab title.

Code: `src/lib/timer.ts` (pure math), `src/contexts/SessionContext.tsx` (lifecycle), `src/hooks/useNow.ts`.

## Calm design choices

These come from research on ADHD-friendly and focus-app UI (one clear action per screen, no time-pressure mechanics, muted color, soft signals instead of alarms).

- **Focus screen is chrome-free.** While a session runs, the header toggles, account menu and tab bar are hidden. The background gets a soft teal wash while focusing and a warm one while paused (`body[data-mode]` in `src/index.css`).
- **Shape first, numbers second.** Settings → *Timer look*: a thick **ring**, or a **disc** that shrinks like a Time Timer. *Hide the numbers* shows only the shape; during a session, tap the timer to show/hide the numbers.
- **Soft end signal.** A quiet two-note chime when time is up (`src/lib/alerts.ts`), never an alarm; stopping early is silent. It is scheduled on the Web Audio clock, so it fires on time even if the tab is in the background; the Focus screen's check is only a fallback. An optional browser notification (off by default, asks permission when you turn it on) shows only if the tab is hidden. Both are in Settings.
  - Browsers throttle timers in background tabs, so the *notification* can arrive up to about a minute late; the chime does not. On iOS Safari, notifications only work for the installed PWA.
- **Contrast.** Text meets WCAG AA (4.5:1) and control outlines (inputs, preset chips, outline buttons) meet 3:1 in both light and dark. Tokens live in `src/index.css` (`--field` is the control border color).
- **Settings** are stored per device in `localStorage` (`ft-settings`), not in Firestore.

## Journeys (optional theme)

A light, optional theme: you can cross a region of Thailand on an *imagined* train line with your focus time. Nothing is ever started for you, and the plain timer works exactly the same without it.

- **You choose everything** (`/journey`): the region (North, Isan, Central, East, West, South), the direction (from the top or from the bottom), and the goal — presets of 2 / 5 / 10 hours or any number of minutes (30–6000). You can change journeys or leave one any time; a journey you change away from simply ends where the train is.
- **Speed comes from your goal:** route km ÷ goal minutes. E.g. a 600 km route with a 120-minute goal is 5 km per focus minute.
- **Every focused minute counts**, from any session. Stopping early only means the train is between two stations; it is never a failure.
- Where it shows: an optional card on Home, a calm line map under the timer while focusing (can be turned off in Settings), and what you passed (or your arrival) on the End screen.
- Stations and distances are a vibe, not a timetable: edit `src/lib/routes.ts` to change them.

## Focus music (optional)

For people who want music while focusing without a paid music subscription. In **Settings → Focus music** paste a YouTube video or playlist link; a small player then appears at the bottom of the Focus screen (`src/components/MusicPanel.tsx`).

- It never auto-starts (browsers and YouTube require a tap), and nothing is turned on by default.
- **Pop out** (desktop Chrome / Edge) uses the Document Picture-in-Picture API to move the player and the session timer, with a Pause/Resume button, into a small always-on-top window that stays visible over other apps and tabs. The window keeps its own clock, so it stays accurate while the main tab is in the background. Closing it (or pressing *Bring back*) returns the player to the panel. Browsers without the API (Firefox, Safari, most phones) simply don't show the button.
- The song restarts when the player moves between the panel and the floating window (it is a new embed). Leaving the Focus screen (e.g. when the session ends) stops the music and closes the window; closing the tab closes it too.
- The link is stored on the device only (`ft-settings` → `musicUrl`), not in Firestore.
- Only YouTube links are accepted (`src/lib/youtube.ts`), embedded via `youtube-nocookie.com`. Auto-generated YouTube Mix lists (`list=RD…`) can't be embedded, so only the single video is used.
- YouTube's rules require the player to stay visible, so "Smaller" shrinks it rather than hiding it. Ads depend on the viewer's YouTube account, it needs internet, and phones often pause video when the screen locks.

## Data model

**`users/{uid}`**

| field | type | notes |
| --- | --- | --- |
| `displayName` | string \| null | from Google |
| `photoURL` | string \| null | from Google |
| `createdAt` | timestamp | server time, immutable |
| `language` | `"th"` \| `"en"` | synced with the header toggle |

**`sessions/{id}`**

| field | type | notes |
| --- | --- | --- |
| `uid` | string | owner |
| `task` | string | may be empty (UI shows "Focus time") |
| `plannedMinutes` | int | 1–600 |
| `actualMinutes` | number | minutes really focused (excludes pauses); `plannedMinutes` when completed, 2-decimal precision when ended early |
| `startedAt` | timestamp | |
| `endedAt` | timestamp \| null | null while active |
| `status` | `"active"` \| `"completed"` \| `"ended_early"` | |
| `roomId` | string \| null | always `null` in week 1 |
| `friendsActiveCount` | int | always `0` in week 1 |
| `localDate` | string | extra: `"YYYY-MM-DD"` of `startedAt` in the user's local time, for per-day analytics |

**`trips/{id}`** (a journey; optional)

| field | type | notes |
| --- | --- | --- |
| `uid` | string | owner |
| `regionId` | `"north"` \| `"northeast"` \| `"central"` \| `"east"` \| `"west"` \| `"south"` | |
| `goalMinutes` | int | 30–6000 focus minutes to cross the region (sets the speed) |
| `reversed` | bool | false = first stop → last stop |
| `focusedMinutes` | number | focus minutes put in so far, added to when a session finishes |
| `startedAt` / `endedAt` | timestamp / timestamp \| null | |
| `status` | `"active"` \| `"arrived"` \| `"ended"` | `ended` = you changed or left the journey |

Sessions have an extra optional `tripId` (string \| null): the journey that session moved forward. At most one trip is `active` per user (starting a new one ends the old one in the same batch).

Notes:
- Starting a session writes the doc with `status: "active"` (without waiting for the network); finishing updates it in place. Stopping early is just `status: "ended_early"` with the minutes so far — never a failure state.
- A session left `active` by a lost tab / cleared storage is closed automatically on a later visit (once it is well past its planned end) as `ended_early` with `0` minutes, so it doesn't linger. Such sessions have `actualMinutes = 0`; exclude `actualMinutes < 1` if you want to ignore them in averages.

### Security rules (`firestore.rules`)

- Users can read/write only `users/{their uid}`, and only sessions and trips whose `uid` is theirs.
- Documents are schema-validated (allowed fields, types, ranges, status/`endedAt` consistency).
- A trip can only be updated while `active` (route, goal, direction and start are locked, focused minutes can only go up). A session can only be updated while still `active`, and `uid`, `task`, `plannedMinutes`, `startedAt` and `localDate` can't change.
- Everything else is denied.

> In week 2 (rooms) the rules will need to let room members read each other's *active* sessions (or a derived presence doc) — that's intentionally not allowed yet.

## Analytics-friendly structure

- Average session length and completion rate come straight from `sessions` docs: `src/lib/stats.ts` has `summarize()` (count, completed, ended early, total minutes, `avgSessionMinutes`, `completionRate`), `startOfWeek()` and `groupByDay()` — pure functions over plain objects, reusable for a backend export later.
  - completion rate = `completed / (completed + ended_early)`; average length = mean `actualMinutes` over finished sessions.
- Every document has stable, flat, typed fields, and a `localDate` for grouping — which also makes the collection easy to export to BigQuery (Firebase extension "Stream Firestore to BigQuery").
- `src/lib/analytics.ts` exposes one `trackEvent()` (currently a no-op that logs in dev) called for `session_start`, `session_complete`, `session_end_early`, `language_change`, `theme_change`. Plug GA4 / PostHog in there later.
- The UI deliberately shows only encouraging numbers (this week's focused time + session count); completion rate is for product analysis, not for users.

## Internationalization

- All UI strings live in `src/locales/th.json` and `src/locales/en.json`; components use `useTranslation()` / `t('key')`.
- Thai is the default. The header toggle persists the choice in `localStorage` (`ft-lang`) and on the user doc; a choice made on a device wins, otherwise the account's saved language is applied after sign-in.
- Add a string: add the key to **both** files. Add a language: create `src/locales/xx.json`, register it in `src/lib/i18n.ts`, and add a button in `LanguageToggle.tsx`.
- Plurals use i18next suffixes (`_one` / `_other`); Thai only needs `_other`.

## PWA

`vite-plugin-pwa` generates the manifest and a service worker (auto-updating). Icons are in `public/`; regenerate them with `python3 scripts/generate-icons.py` (needs Pillow). The service worker only works on the production build (`npm run build && npm run preview`) or over HTTPS.

## Project structure

```
src/
  components/    Header, LanguageToggle, TabBar, TimerFace (ring/disc), ToggleRow, MusicPanel, JourneyStrip, JourneyCard, JourneyOutcome, Layout, RequireAuth, icons
  contexts/      AuthContext, ThemeContext, TripContext (journey), SessionContext (timer lifecycle)
  hooks/         useNow
  lib/           firebase, i18n, timer, sessions (Firestore), stats, format, analytics, user, types, settings, alerts, routes, trips, youtube
  locales/       th.json, en.json
  pages/         Login, Home, Focus, End, History, Journey, Settings, SetupNeeded
firestore.rules / firestore.indexes.json / firebase.json
vercel.json
scripts/generate-icons.py
```

## Roadmap (not in week 1)

Rooms and friends body-doubling (`roomId`, `friendsActiveCount`), AI features, app blocking.
