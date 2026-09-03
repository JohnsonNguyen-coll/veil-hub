# Veil Clubs Backend

Backend for public metadata only. It does not store balances, odds,
private winnings, decrypted values, or anything that should remain confidential.

## Responsibilities

- expose app config and contract addresses,
- index public club/draw metadata,
- manage invite-code UX for private clubs,
- validate invite-code UX for private clubs,
- run the keeper loop for onchain weighted FHE draws.

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

If Railway logs show schema errors such as a missing or null `next_draw_at`, run the latest `backend/supabase/schema.sql` again so Supabase matches the current backend metadata model.

## Keeper

The keeper polls configured clubs, waits until `nextDrawAt`, prepares the encrypted aggregate principal for Zama public decryption, verifies the KMS proof onchain, then executes the weighted draw over encrypted member balances.

On Sepolia, the keeper can also auto-fund the encrypted prize reserve before a due draw. This is a mock yield source for demo reliability: the keeper transfers its own cUSDC into the contract through `accrueYield`; it does not generate real lending yield.

Set these on Railway when enabling automated draws:

```env
KEEPER_ENABLED=true
KEEPER_PRIVATE_KEY=0xyour_keeper_private_key
VEIL_CLUBS_ADDRESS=0xyour_deployed_veilclubs
VEIL_TOKEN_ADDRESS=0xyour_deployed_cusdc
KEEPER_AUTO_FUND_YIELD=true
KEEPER_YIELD_AMOUNT=10
KEEPER_YIELD_MIN_MEMBERS=1
KEEPER_OPERATOR_APPROVAL_SECONDS=604800
ZAMA_FHEVM_API_KEY=your_optional_zama_api_key
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
FRONTEND_ORIGIN=https://your-frontend.example
```

Public RPCs are tried first; `RPC_URL` is kept as the private fallback.

Before enabling auto-fund, keep the keeper wallet funded with Sepolia ETH for gas and enough cUSDC to cover `KEEPER_YIELD_AMOUNT` across scheduled draws.

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
- `POST /api/faucet/request`

Runtime data is stored in Supabase when configured. Fallback local data is ignored by git.
