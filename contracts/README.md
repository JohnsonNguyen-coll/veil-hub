# VeilHubs Smart Contracts

Smart contracts for confidential no-loss prize savings with Zama FHEVM and ERC-7984 confidential tokens.

## Core Contract

`contracts/VeilClubs.sol` implements:

- Global Pool at club id `0`.
- Private Clubs with independent admin, keeper, draw interval, and encrypted accounting.
- Encrypted deposits through `deposit(uint256 clubId, externalEuint64 encryptedAmount, bytes inputProof)`.
- No-loss withdrawals through `withdrawPrincipal(uint256 clubId)`.
- Admin/keeper-funded encrypted prize reserve through `accrueYield(uint256 clubId, externalEuint64 encryptedAmount, bytes inputProof)`.
- Cumulative pending prize claims through `claimPendingWinnings()`.

The legacy per-draw claim entrypoints `claimPrize(uint256,uint256)` and `claimPrizes(uint256[],uint256[])` are disabled. Prize accounting is handled through encrypted cumulative pending winnings per wallet, which prevents double-claiming after aggregate pending accounting.

`accrueYield` is the Sepolia mock-yield hook. Admins or keepers fund the encrypted prize reserve with their own cUSDC, manually from the frontend or automatically from the backend keeper. A production version would replace this with a real yield adapter that moves generated yield into `encryptedYield`.

## Weighted Draw Flow

The legacy equal-member draw entrypoints are disabled. Use the weighted flow:

1. `prepareWeightedDraw(uint256 clubId)`
   - Checks caller is admin, keeper, or owner.
   - Checks `nextDrawAt` has arrived.
   - Checks the club has at least one member.
   - Marks only `encryptedTotalPrincipal` as publicly decryptable.

2. Keeper public-decrypts the emitted aggregate total handle through Zama relayer/KMS.

3. `triggerWeightedDraw(uint256 clubId, bytes32 drawCommitment, uint64 totalPrincipal, bytes decryptionProof)`
   - Verifies the aggregate total with `FHE.checkSignatures`.
   - Generates FHE randomness with `FHE.randEuint64()`.
   - Computes a threshold with `FHE.rem(random, totalPrincipal)`.
   - Walks encrypted cumulative member principal buckets.
   - Allocates the encrypted prize with `FHE.select`.
   - Adds the selected encrypted prize to the winner's cumulative pending winnings.
   - Grants each member access only to their own encrypted pending-winnings handle.

This keeps individual deposits, balances, prize allocations, and cumulative pending winnings encrypted. The aggregate pool total is intentionally public-decrypted at draw time and should be documented as protocol leakage.

## Claim Flow

Winners claim through `claimPendingWinnings()`. The function transfers the caller's encrypted cumulative pending winnings into their confidential cUSDC balance and then resets their pending amount to encrypted zero. The frontend uses EIP-712 user decryption only to show the connected wallet's local pending amount; claimability does not require scanning every historical draw.

## Build

```bash
npm install
npm run build
```

## Sepolia Deploy

```bash
cp .env.example .env
npm run deploy:sepolia
```

Example env:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
PRIVATE_KEY=0xyour_deployer_private_key
KEEPER_ADDRESS=0xyour_keeper_wallet
GLOBAL_DRAW_INTERVAL_SECONDS=86400
DEPOSIT_TOKEN_ADDRESS=0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639
```
