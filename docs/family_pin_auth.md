# Family PIN authentication (4 digits)

This repo can be protected behind a **4-digit family PIN**.

- Users unlock once on a device
- The device is remembered with an **HttpOnly cookie** (default: ~180 days)
- All routes are gated by `middleware.ts` (redirects to `/unlock` if locked)

## Environment variables

Add these to `.env.local` (and to Vercel in production):

```
FAMILY_PIN_HASH=...        # sha256 hex of `${PIN}:${FAMILY_PIN_PEPPER}`
FAMILY_PIN_PEPPER=...      # random string
FAMILY_COOKIE_SECRET=...   # random string used to sign the cookie token
```

## Generate values

Pick your 4-digit PIN and run:

```bash
PIN=1234
PEPPER="some-long-random-string"
node -e "const crypto=require('crypto'); const pin=process.env.PIN; const pepper=process.env.PEPPER; const hash=crypto.createHash('sha256').update(`${pin}:${pepper}`).digest('hex'); console.log('FAMILY_PIN_HASH='+hash);"
```

Then set:

- `FAMILY_PIN_PEPPER` to the same pepper you used
- `FAMILY_COOKIE_SECRET` to another random string (example: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

## Where it lives

- `middleware.ts`: checks the cookie and redirects to `/unlock`
- `app/unlock/page.tsx`: PIN entry screen
- `app/api/unlock/route.ts`: verifies PIN and sets the cookie
- `lib/family-auth.ts`: hashing + signed token helpers (Edge-safe)


