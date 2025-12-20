# Big Two Scorekeeper

Play and track family Big Two games with real-time scoring, persistent history, and an in-app rules refresher. Built with Next.js (App Router), Firebase Auth, and Firestore.

## Prerequisites

- Node.js 18+
- Firebase project with Firestore enabled (Native mode)
- Firebase Authentication (optional unless you want to test sign-in flows)

## Setup

1. Install dependencies
   ```bash
   npm install
   ```
2. Copy the Firebase client config into `.env.local` (use `.env.local.example` as a template). Values live in **Firebase Console → Project settings → Your apps → Web app → config**.
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   ```
3. (Optional) Enable Auth providers you want to exercise on `/firebase-sanity` — Email/Password and Google are supported out of the box.

## Local Development

```bash
npm run dev
```

- Visit `http://localhost:3000/` for the primary app experience (tabbed navigation: Home, History, Rules).
- Use `http://localhost:3000/game` once a game is active to enter scores round-by-round.
- `http://localhost:3000/firebase-sanity` offers a quick Firestore/Auth smoke test (write/read docs, sign-in flows).

## Core Flows

- **Start a game** from the Home tab (defaults to 10 rounds; adjustable). Only one active game is allowed at a time.
- **Enter scores** on the Game screen. Tap any cell to open the keypad, enter 0–13, and the UI advances clockwise. Totals update live.
- **Adjust settings** via the top-right menu during a game: change round count, hide/show scores, tag the session, or end/discard the game.
- **End game animation** appears after marking the game completed, ranking all four players with totals.
- **History tab** shows lifetime placements (pivot table) and a ledger of completed games (date, rounds, per-player scores, optional tags).
- **Rules tab** provides the five-card hand hierarchy and quick reminders.

## Deploying to Vercel

1. Set the same Firebase environment variables in Vercel (`NEXT_PUBLIC_FIREBASE_*`).
2. Redeploy (`git push` → Vercel build) once secrets are in place.
3. If you rely on authentication, ensure the production domain is added to Firebase Auth authorized domains.

## Troubleshooting

- `Firebase configuration is incomplete…`: verify every env var line is populated and restart `npm run dev`.
- `auth/configuration-not-found`: enable the corresponding provider in **Firebase Console → Authentication → Sign-in method**.
- History page empty? Ensure you end games via the menu so results are persisted.

Happy dealing! 🎴

