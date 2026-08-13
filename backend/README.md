# Veil Clubs Backend

Small MVP backend for public metadata only. It does not store balances, odds,
private winnings, decrypted values, or anything that should remain confidential.

## Responsibilities

- expose app config and contract addresses,
- index public club/draw metadata,
- manage invite-code UX for private clubs,
- rate-limit a mock faucet,
- run a lightweight keeper loop for due draws.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Default server: `http://127.0.0.1:8787`

## Supabase

Create a Supabase project, open the SQL editor, and run:

```sql
-- backend/supabase/schema.sql
```

Then set:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

Use the service role key only on the backend. Never expose it to the frontend.
If Supabase env vars are missing, the server falls back to in-memory/dev storage.

## API

- `GET /health`
- `GET /api/config`
- `GET /api/dashboard`
- `GET /api/clubs`
- `POST /api/clubs`
- `GET /api/clubs/:clubId`
- `POST /api/clubs/:clubId/invites`
- `POST /api/join`
- `GET /api/draws`
- `POST /api/draws/trigger`
- `POST /api/faucet/request`

Runtime data is stored in Supabase when configured. Fallback local data is ignored by git.
