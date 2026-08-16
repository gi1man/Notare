# Changelog

All notable changes to Notare are documented in this file.

## [2.2.0] — 2026-08-15

### Added
- **Share Card** — canvas-rendered branded goal summary card (1080×1350) with progress rings, goal bars, and Notare branding; shares via Web Share API on mobile, downloads PNG on desktop
- **Sign Out** — `signOutUser()` function and Sign Out button in Settings
- **Adaptive Account card** — Settings account section now shows different UI for signed-in vs anonymous users: signed-in users see their email, change password, and sign out; anonymous users see the registration/sign-in form

### Changed
- **Sync indicator simplified** — replaced 4 icons (spinner, check, wifi-off, cloud) with a single Cloud icon in 3 colors: green (online), blue pulsing (syncing), gray (offline)
- **Dashboard section titles renamed** — donut charts now "Goals Summary", bar charts now "Individual Goals"
- **Account section title** — renamed from "Multi-Device Sync & Account Backup" to "Account" with shorter description

### Removed
- **Goal Trend Section** — removed `GoalTrendSection` component render from dashboard
- **Past Week Activity Summaries** — removed weekly activity card grid from dashboard
- **Cloud Backup menu** — consolidated into Settings "Backup & Export" section
- **DeviceMigrationModal** — removed from Header; restore functionality moved inline to Settings

## [2.1.0] — 2026-08-15

### Security
- Locked Firestore `community_totals` rules to authenticated users with field validation
- Disabled client-side Gemini API call that exposed Firebase API key in bundle
- Added "Forgot Password?" reset flow in Onboarding and Settings
- Added email verification on account registration (`sendEmailVerification`)
- Anonymous accounts now upgrade via `linkWithCredential` instead of creating orphan UIDs

### Bug Fixes
- Fixed `handleClearLocalData` race condition — writes fresh default settings atomically
- Fixed `generateDummyData` deleting real user data — now only clears `is_demo` records
- History delete now syncs to Firestore cloud (`deleteEntryFromCloud`)
- History edit now syncs to Firestore cloud (`syncEntryToCloud`)
- Fixed zero-goals auto-reset — only triggers in demo mode, not for real users
- Fixed `updated_at` timestamp using user-selected date instead of current time
- Fixed undo toast crashing offline — cloud delete wrapped in try/catch
- Fixed voice transcript dropping earlier words — now accumulates all final + interim results

### Performance
- Wrapped chart goal computation in `useMemo` (O(N×M) on every render → memoized)
- Wrapped dashboard maps, counts, and filters in `useMemo`
- Added progressive rendering to History — 50 entries at a time with "Load More"
- Code-split 4 tab views via `React.lazy` + `Suspense` (~95 KB out of main bundle)
- Replaced sequential `setDoc` calls with Firestore `writeBatch` (450 ops/batch)
- JSON export now includes categories, goals, entries, and settings (was entries-only)

### Architecture
- Added React `ErrorBoundary` wrapping entire app — shows recovery screen instead of white page
- Deleted unused `GoalOverviewSection.tsx`
- Typed `currentUser` from `any` to `typeof auth.currentUser`
- Added Dexie schema migration guide + v2 schema with `is_demo` index
- Removed `as any` type casts for legacy field names in chart component

### UX
- Added two-tap delete confirmation in History (3-second timeout)
- Auto theme now live-updates when OS switches light/dark mode (`matchMedia` listener)
- Added animated skeleton loader on Dashboard while IndexedDB queries resolve
- Version stamp now uses build-time date instead of runtime date

## [2.0.0] — 2026-08-14

### Added
- Grouped Goal Performance Chart with weekly/monthly/daily breakdown
- Network-First service worker strategy with offline fallback
- Cache-Control headers for service worker and manifest
- Fixed Android WebAPK layout rendering issues

## [1.0.0] — 2026-07-24

### Added
- Initial release
- Category and subcategory system with icon picker
- Entry form with numeric, boolean, and dual-number value types
- Voice transcription via Web Speech API
- Goal editor with daily/weekly/monthly frequency
- Dashboard with donut charts and trend section
- History list with search and category filter
- Settings with theme, font scale, and accessibility options
- Community Insights with anonymized telemetry
- Demo mode with sample data
- Onboarding wizard
- Firebase Auth (email + anonymous) and Firestore sync
- PWA with installable manifest and service worker
- Data export (JSON + CSV)
