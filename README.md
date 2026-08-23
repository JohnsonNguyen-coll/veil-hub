# 🛡️ Veil Clubs (VeilFi)
> **Confidential No-Loss Prize Pools on Ethereum with Zama FHE & ERC-7984**  
> *Built for Zama Developer Program Mainnet Season 4 Bounty Challenge*

---

## 🌟 Overview

**Veil Clubs** is a confidential, production-ready version of **PoolTogether** powered by the **Zama Protocol (FHEVM)** and **ERC-7984 confidential tokens**.

Users deposit confidential assets (`cUSDC`) into a shared **Global Pool** or invitation-only **Private Clubs**. The principal capital always remains withdrawable with zero loss, while the generated yield accumulates into periodic prize draws.

### 🔒 Confidentiality & Fairness Guarantees
- **Encrypted Balances & Deposits**: All deposit amounts, user balances, and accumulated yield pools are represented as `euint64` FHE ciphertexts.
- **Onchain Verifiable FHE Draw Kernel**: Winner selection executes homomorphically over encrypted state (`FHE.randEuint64`, `FHE.eq`, `FHE.select`) without revealing anyone's financial position, odds, or account balance.
- **Winner-Only Decryption**: Access Control Lists (`FHE.allow`) ensure that **only the actual winner can decrypt their non-zero prize**, while everyone else decrypts 0 without leaking any public data.
- **No-Loss Principal**: Users can withdraw their full principal at any time via `withdrawPrincipal`.

---

## 🏗️ Architecture

```
                                    +------------------------------------------+
                                    |         User Wallet (RainbowKit)         |
                                    +------------------------------------------+
                                                         |
                                 1. Encrypted Deposit    |    4. EIP-712 User Decrypt
                                 (createEncryptedInput)  |    (Claim Winnings / Balance)
                                                         v
+-------------------------------------------------------------------------------------------------------+
|                                        Veil Clubs Protocol                                            |
|                                                                                                       |
|   +-----------------------------------------------------------------------------------------------+   |
|   |  VeilConfidentialToken (ERC-7984)                                                             |   |
|   |  Confidential transfer, mint, allowance, transient ACL                                         |   |
|   +-----------------------------------------------------------------------------------------------+   |
|                                                |                                                      |
|                                                v                                                      |
|   +-----------------------------------------------------------------------------------------------+   |
|   |  VeilClubs (FHEVM / ZamaEthereumConfig)                                                       |   |
|   |  - Global Pool (Public ID 0) & Private Clubs (Invite-Gated)                                   |   |
|   |  - Encrypted Accounting: `principal[user]`, `encryptedTotalPrincipal`, `encryptedYield`       |   |
|   |  - FHE Draw Kernel: `executeDraw()` using `FHE.randEuint64()` & homomorphic selector          |   |
|   |  - Prize Distribution: `claimPrize()` transfers encrypted prize to winner                      |   |
|   +-----------------------------------------------------------------------------------------------+   |
+-------------------------------------------------------------------------------------------------------+
                                                         ^
                                                         | 3. Periodic Trigger
                                    +------------------------------------------+
                                    |       Automated Keeper (Backend)         |
                                    +------------------------------------------+
```

---

## 📂 Repository Structure

- **[`contracts/`](file:///d:/PythonTool/VeilsFi/contracts)**:
  - [`VeilConfidentialToken.sol`](file:///d:/PythonTool/VeilsFi/contracts/contracts/VeilConfidentialToken.sol): Confidential ERC-7984 token for Sepolia testnet.
  - [`VeilClubs.sol`](file:///d:/PythonTool/VeilsFi/contracts/contracts/VeilClubs.sol): Core pool & private club contract with on-chain verifiable FHE draw engine.
  - [`scripts/compile-solc.js`](file:///d:/PythonTool/VeilsFi/contracts/scripts/compile-solc.js): Solc build script with Zama FHE compiler pipeline.
  - [`scripts/deploy.js`](file:///d:/PythonTool/VeilsFi/contracts/scripts/deploy.js): Deployment script targeting Sepolia.
- **[`frontend/`](file:///d:/PythonTool/VeilsFi/frontend)**:
  - Built with React, Vite, Tailwind CSS, Three.js (interactive 3D globe), Wagmi & RainbowKit.
  - Implements **Dark Tech-Minimalism** visual aesthetic according to [`DESIGN.md`](file:///d:/PythonTool/VeilsFi/frontend/DESIGN.md).
  - Complete dApp views: Dashboard, Global Pool, Private Clubs, Draws History, Account & Documentation.
- **[`backend/`](file:///d:/PythonTool/VeilsFi/backend)**:
  - Node.js keeper daemon, indexer, rate-limited faucet, and Supabase integration.

---

## ⚡ Quick Start

### 1. Smart Contracts
```bash
cd contracts
npm install
npm run build
```

To deploy to Sepolia:
```bash
cp .env.example .env
# Fill SEPOLIA_RPC_URL and PRIVATE_KEY
npm run deploy:sepolia
```

### 2. Frontend dApp
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Backend Keeper & Indexer
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

---

## 🏆 Bounty Evaluation Checklist

- [x] **Confidential PoolTogether Mechanism**: No-loss savings + prize pool powered by yield.
- [x] **Encrypted Balances & Yield**: All calculations done in `euint64` ciphertext handles.
- [x] **Verifiable FHE Winner Selection**: Homomorphic winner selection directly onchain via `FHE.randEuint64` and `FHE.select`.
- [x] **Winner-Only Decryption**: ACL guarantees only the winning address can decrypt the prize amount.
- [x] **Target Network**: Configured and ready for Ethereum Sepolia with Zama Coprocessor KMS.
- [x] **Production Standard**: Dark tech-minimalism UI, high performance, modular architecture.
