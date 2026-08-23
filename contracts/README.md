# 🛡️ Veil Clubs Smart Contracts

Smart contracts for **Veil Clubs** built with `@fhevm/solidity` and OpenZeppelin Confidential Contracts (`IERC7984`).

---

## 📜 Contracts

### 1. `VeilConfidentialToken.sol`
- Implements the **ERC-7984** standard for confidential tokens.
- Manages encrypted balances (`euint64`) with transient access control for zero-knowledge transfers and deposits.

### 2. `VeilClubs.sol`
- Inherits `ZamaEthereumConfig` and OpenZeppelin `Ownable`.
- Implements **Global Pool** (Pool ID `0`) and dynamically created **Private Clubs** with independent invite gating.
- **Accounting**:
  - `deposit(uint256 clubId, externalEuint64 encryptedAmount, bytes inputProof)`
  - `withdrawPrincipal(uint256 clubId)` (no-loss guarantee)
  - `accrueMockYield(uint256 clubId, externalEuint64 encryptedAmount, bytes inputProof)`
- **Verifiable FHE Draw Kernel**:
  - `executeDraw(uint256 clubId, bytes32 drawCommitment)`:
    1. Generates onchain encrypted entropy via `FHE.randEuint64(memberCount)`.
    2. Homomorphically allocates prize via `FHE.select(isWinner, prize, 0)`.
    3. Grants decryption access (`FHE.allow`) exclusively to the winner.
  - `claimPrize(uint256 clubId, uint256 drawId)`:
    Transfers the winner's encrypted prize handle directly to their confidential token balance.

---

## 🧪 Build & Test

```bash
npm install
npm run build
```

---

## 🚀 Sepolia Deployment

1. Copy environment template:
   ```bash
   cp .env.example .env
   ```
2. Configure RPC and Private Key:
   ```env
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your_key
   PRIVATE_KEY=0x...
   ```
3. Run deployment script:
   ```bash
   npm run deploy:sepolia
   ```
