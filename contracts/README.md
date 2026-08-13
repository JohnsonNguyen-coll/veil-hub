# Veil Clubs Contracts

Smart contracts for the Veil Clubs MVP.

## Contracts

- `VeilConfidentialToken.sol`: ERC-7984 confidential mock USDC for Sepolia demos.
- `VeilClubs.sol`: Global Pool + Private Clubs, encrypted deposits, no-loss principal withdrawals, mock yield accounting, draw lifecycle events.

## Current Draw Status

The contract intentionally separates draw triggering from winner finalization.

- Implemented now: encrypted deposits, encrypted principal, encrypted yield prize handles, club creation, keeper/admin draw trigger, encrypted prize transfer.
- Still to harden: fully weighted FHE winner selection across 50-100 members with gas profiling on Sepolia.

The final draw kernel should avoid decrypting balances and should document exactly which data is public. Until that kernel is implemented, `preparePrizeClaim` is an MVP/demo hook and must not be presented as the final fair weighted selector.

## Install

```bash
npm install
npm run build
```

## Sepolia Deploy

```bash
cp .env.example .env
npm run deploy:sepolia
```
