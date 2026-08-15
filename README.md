# Notare — Privacy-Focused Activity Tracker

A frictionless, offline-first PWA for tracking daily habits, wellness activities, and personal goals. Built with React, Dexie.js (IndexedDB), and Firebase for optional cloud sync.

## Features

- **Offline-first** — all data stored locally in IndexedDB via Dexie.js; works without internet
- **Cloud sync** — optional Firebase Auth + Firestore for multi-device sync
- **Goal tracking** — daily, weekly, and monthly goals with progress charts
- **Voice logging** — Web Speech API for hands-free entry notes
- **Community insights** — anonymized aggregate benchmarks (opt-in telemetry)
- **PWA / WebAPK** — installable on Android and iOS home screens
- **Dark mode** — auto, light, and dark themes with live OS-change detection
- **Accessibility** — high-contrast profile, scalable fonts, tap-target sizing
- **Data export** — full JSON backup and CSV export

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI | React 18, TypeScript, Tailwind CSS |
| Local DB | Dexie.js (IndexedDB) |
| Cloud | Firebase Auth, Firestore, Hosting |
| Build | Vite 6, GitHub Actions CI/CD |
| PWA | Custom service worker (network-first) |

## Getting Started

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/
│   ├── common/          # Header, ErrorBoundary, DemoBanner, icons
│   ├── dashboard/       # Goal charts, donut charts, trend section
│   ├── entry/           # CategoryPicker, EntryForm, OnboardingWizard
│   ├── goals/           # GoalEditorModal
│   ├── history/         # HistoryList, EditEntryModal
│   ├── insights/        # InsightsView, community benchmarks
│   └── settings/        # SettingsModal, DeviceMigrationModal
├── context/
│   └── AppContext.tsx    # Global state, settings, undo system
├── db/
│   ├── index.ts         # Dexie schema (v1 + v2 with migration guide)
│   ├── firestoreSync.ts # Auth, cloud push/pull, batch writes
│   ├── exportData.ts    # JSON full backup + CSV export
│   ├── firebaseConfig.ts
│   ├── communityTelemetry.ts
│   ├── dummyDataGenerator.ts
│   └── insightsEngine.ts
├── types.ts             # TypeScript interfaces
└── main.tsx             # App entry with ErrorBoundary
```

## Database Schema

Dexie.js v2 schema with indexed fields:

| Table | Indexed Fields |
|-------|---------------|
| `categories` | id, parent_id, name, pinned, sort_order, updated_at, deleted_at, is_demo |
| `entries` | id, subcategory_id, occurred_at, transcript_status, updated_at, deleted_at, is_demo |
| `goals` | id, subcategory_id, direction, target_type, frequency, updated_at, is_demo |
| `meta` | key |

See [src/db/index.ts](src/db/index.ts) for the migration guide.

## Firebase Setup

1. Create a Firebase project with Auth (Email/Password + Anonymous) and Firestore
2. Copy your config to `src/db/firebaseConfig.ts`
3. Deploy security rules: `firebase deploy --only firestore:rules`
4. Deploy hosting: `firebase deploy --only hosting`

## Security

- Firestore rules restrict all user data to authenticated owners
- `community_totals` writes require auth + validated schema fields
- Email verification sent on account registration
- Anonymous accounts upgrade to email via `linkWithCredential`
- No API keys exposed in client-side API calls

## Scripts

| Command | Description |
|---------|-----------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build locally |
| `npm test` | Run Vitest test suite |

## License

Private project.
