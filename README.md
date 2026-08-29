# VeilHubs

Confidential no-loss prize savings on Sepolia, built for the Zama Developer Program Mainnet Season 4 bounty.

VeilHubs recreates the core PoolTogether mechanic with ERC-7984 confidential cUSDC: users deposit into a shared prize pool, keep principal withdrawable at any time, and participate in periodic prize draws where selection is weighted by encrypted deposit balances.

## Live Demo

- App URL: add the deployed frontend URL here
- Network: Ethereum Sepolia
- Token: Zama Sepolia cUSDC wrapper, `0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639`

## What Users Can Do

- Faucet: mint Sepolia test USDC, approve the wrapper, and wrap into cUSDC.
- Deposit: encrypt a cUSDC amount client-side and submit the encrypted input proof onchain.
- Decrypt locally: use EIP-712 user decryption to view only the connected wallet's balance, principal, and prize handles.
- Draw: a keeper automatically runs the draw when `nextDrawAt` is reached.
- Claim: winners decrypt their prize handle and claim the encrypted prize into their cUSDC balance.
- Withdraw: users can withdraw their full encrypted principal at any time.

## Confidentiality Design

Individual deposits, wallet balances, principal positions, prize amounts, and losing prize handles remain encrypted as `euint64` values. The frontend never stores decrypted balances onchain or in the backend; decrypted values live only in local UI state after the connected wallet signs an EIP-712 user-decryption request.

Winner selection is performed onchain over encrypted balances:

1. The keeper calls `prepareWeightedDraw(clubId)`.
2. The contract marks only the encrypted aggregate principal handle as publicly decryptable.
3. The keeper asks the Zama relayer/KMS to public-decrypt that aggregate total and receives a KMS proof.
4. The keeper calls `triggerWeightedDraw(clubId, commitment, totalPrincipal, proof)`.
5. The contract verifies the KMS proof with `FHE.checkSignatures`.
6. The contract generates FHE randomness, computes a random threshold modulo the verified aggregate total, walks encrypted cumulative principal buckets, and allocates the encrypted prize to the selected bucket with `FHE.select`.
7. Only each member can user-decrypt their own prize handle; the winner sees a non-zero prize.

### Documented Leakage

The aggregate pool principal is public-decrypted at draw time so randomness can be bounded by a verified total without revealing individual balances. Individual deposit amounts and per-wallet odds are not disclosed by the contract. Member count, pool ids, timestamps, draw ids, and transaction hashes are public metadata.

## Yield Source

Sepolia does not provide production yield for the demo token, so VeilHubs uses an admin/keeper-funded encrypted prize reserve:

- Admin or keeper gets cUSDC through the faucet.
- Admin or keeper clicks `Fund Prize` in the app.
- The app encrypts the funding amount and calls `accrueYield(clubId, encryptedAmount, inputProof)`.
- The next draw awards the encrypted reserve.

The backend keeper can also fund this reserve automatically before each due draw. This is still a mock yield source: it transfers cUSDC from the keeper wallet into the encrypted prize reserve; it does not mint tokens or generate real lending yield. Keep the keeper wallet funded with Sepolia ETH for gas and enough cUSDC for `KEEPER_YIELD_AMOUNT`.

A production integration would replace `accrueYield` funding with a yield adapter that deposits principal into a real strategy and periodically transfers the generated confidential yield into `encryptedYield`.

## Repository

- `contracts/`: Solidity contract and Sepolia deploy script.
- `frontend/`: React/Vite dApp with Wagmi, RainbowKit, and Zama Relayer SDK.
- `backend/`: public metadata API plus keeper loop for automated weighted draws.

## Deploy Contracts

```bash
cd contracts
npm install
cp .env.example .env
npm run build
npm run deploy:sepolia
```

Useful contract env:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xyour_deployer_private_key
KEEPER_ADDRESS=0xyour_keeper_wallet
GLOBAL_DRAW_INTERVAL_SECONDS=120
DEPOSIT_TOKEN_ADDRESS=0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639
```

Use `GLOBAL_DRAW_INTERVAL_SECONDS=120` for demo testing. Use a longer interval for production-like deployments.

## Deploy Backend Keeper

```bash
cd backend
npm install
npm run start
```

Railway env:

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

With `KEEPER_AUTO_FUND_YIELD=true`, the keeper checks due clubs, decrypts only its own cUSDC balance locally, approves `VeilClubs` as token operator if needed, encrypts `KEEPER_YIELD_AMOUNT`, calls `accrueYield`, then runs the weighted draw. If the keeper balance is too low, the draw is skipped and the backend logs the missing amount.

Public Sepolia RPCs are tried first. `RPC_URL` is used as the private fallback when public RPCs fail or rate-limit.

To pre-fund the keeper wallet with cUSDC before enabling auto-fund:

```bash
cd backend
npm run keeper:faucet -- 1000
```

The script uses `KEEPER_PRIVATE_KEY`, mints `1000` Sepolia test USDC to that wallet, approves the cUSDC wrapper, and wraps it into confidential cUSDC. The amount can also be set with `KEEPER_FAUCET_AMOUNT`.

## Deploy Frontend

```bash
cd frontend
npm install
npm run build
```

Frontend env:

```env
VITE_VEIL_CLUBS_ADDRESS=0xyour_deployed_veilclubs
VITE_VEIL_TOKEN_ADDRESS=0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639
VITE_VEIL_UNDERLYING_TOKEN_ADDRESS=0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF
VITE_KEEPER_ADDRESS=0xyour_keeper_wallet
VITE_BACKEND_URL=https://your-railway-backend.example
VITE_SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

## Bounty Checklist

- Web dApp with wallet connect and Sepolia flow.
- ERC-7984 confidential cUSDC deposit flow.
- Encrypted per-user balance and principal accounting.
- Onchain weighted draw over encrypted balances with FHE randomness.
- KMS-verified aggregate total used for bounded weighted selection.
- Winner-only user decryption and encrypted prize claim.
- No-loss principal withdrawal.
- Automated keeper flow plus documented admin-funded mock yield.
- Faucet flow and clear error handling for approval, balance, network, and wallet rejection.
