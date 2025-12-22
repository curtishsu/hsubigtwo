## Firebase Setup Checklist

Complete these steps to provision the Firestore backend that replaces the previous SQL database.

### 1. Project & Services

1. Create or open the Firebase project dedicated to the Big Two app.
2. Enable the following services in the Firebase console:
   - Firestore in Native mode
   - Authentication (Email/Password only if you need admin access; the app itself remains unauthenticated)
   - Cloud Functions (optional but recommended for enforcing invariants)

### 2. Firestore Data Model

Firestore is document-based. Use the following collections/subcollections.

#### players (collection)
- Document IDs: the player initials `A`, `Y`, `D`, `C`.
- Fields:
  - `displayName` (string, default equals the initial)
  - `photoUrl` (string, optional placeholder now)
  - `createdAt` (timestamp, `FieldValue.serverTimestamp()`)

Seed documents manually or via a one-time script:
```javascript
await setDoc(doc(db, 'players', 'A'), {
  displayName: 'A',
  photoUrl: null,
  createdAt: serverTimestamp(),
});
// Repeat for Y, D, C.
```

#### games (collection)
- Fields:
  - `startedAt` (timestamp, server timestamp)
  - `endedAt` (timestamp, nullable)
  - `status` (string: `active`, `completed`, `abandoned`)
  - `totalRounds` (number, > 0)
  - `roundsPlayed` (number, >= 0)
  - `hideScores` (boolean, default false)
  - `tag` (string, optional label like `"Christmas 2025"`)
  - `notes` (string, optional)

##### Subcollection: rounds (`games/{gameId}/rounds`)
- Document ID: zero-padded round number (e.g., `01`, `02`).
- Fields:
  - `roundNumber` (number, unique per game)
  - `locked` (boolean, default false)

###### Subcollection: scores (`games/{gameId}/rounds/{roundId}/scores`)
- Document ID: player initial.
- Fields:
  - `playerId` (string, reference to initials)
  - `points` (number, enforce 0–13 in the UI/Cloud Function)
  - `enteredAt` (timestamp, server timestamp)

##### Subcollection: results (`games/{gameId}/results`)
- Document ID: player initial.
- Fields:
  - `rank` (number, 1–4)
  - `totalPoints` (number, >= 0)
  - `roundsWon` (number, >= 0) — number of rounds won in the game (a round win is the player with `points == 0` for that round)

##### Subcollection: tags (`games/{gameId}/tags`)
- Document ID: auto-generated.
- Fields:
  - `label` (string)
  - `createdAt` (timestamp)

#### settings (collection)
- Single document `app`:
  - `defaultRounds` (number, default 10)
  - `hideScoresDefault` (boolean, default false)

### 3. Data Integrity

- Only one game should have `status == 'active'`. Implement a Cloud Function or security rule to reject creating a second active game:
  - Cloud Function trigger: onCreate + onUpdate of `games/{gameId}` to check for other active games.
  - Alternatively, use a scheduled function to reconcile if a device gets offline.
- Enforce the 0–13 score range in your client validators; add a Cloud Function if you need server-side guarantees.

### 4. Security Rules

Start with locked-down rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false; // Default deny
    }
  }
}
```

Then create an admin-only web app or service account to perform writes. When you’re ready for end-user access, loosen rules appropriately (e.g., read-only for unauthenticated clients, writes via Cloud Functions).

### 5. One-Time Seed Script (Optional)

Use the Firebase Admin SDK in a Node script:
```javascript
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

initializeApp({ credential: applicationDefault() });
const db = getFirestore();

const players = ['A', 'Y', 'D', 'C'];
await Promise.all(players.map(initial =>
  db.collection('players').doc(initial).set({
    displayName: initial,
    photoUrl: null,
    createdAt: new Date(),
  }, { merge: true })
));
```

### 6. Environment Configuration

- Store Firebase config and service-account credentials outside of version control.
- Provide `.env.local` or runtime configuration for the client app with the public Firebase keys.
- For Cloud Functions, keep secrets in Firebase environment config (`firebase functions:config:set ...`).

### 7. Migration Notes

- Remove any Supabase-specific tooling, environment variables, and SQL scripts.
- Update the deployment pipeline to include `firebase deploy --only firestore,functions` when applicable.
- Ensure analytics (e.g., BigQuery export) is re-configured if it previously depended on the SQL backend.



