import { useEffect, useMemo, useRef, useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { decodeEventLog, formatUnits, parseUnits, toHex } from "viem";
import {
  VEIL_CLUBS_ADDRESS,
  KEEPER_ADDRESS,
  VEIL_TOKEN_ADDRESS,
  VEIL_UNDERLYING_TOKEN_ADDRESS,
  VeilClubsABI,
  VeilTokenABI,
  IS_CONTRACT_CONFIGURED,
  IS_KEEPER_CONFIGURED,
  IS_TOKEN_CONFIGURED,
  BACKEND_URL
} from "./contracts/config.js";
import { defaultPools, defaultDrawHistory, APP_ROUTES, PATH_TO_PAGE } from "./constants/options.js";
import { LandingHeader, AppHeader } from "./components/layout/Header.jsx";
import { AppFooter } from "./components/layout/Footer.jsx";
import { ToastNotification } from "./components/common/ToastNotification.jsx";
import { LandingPage } from "./pages/LandingPage.jsx";
import { DocsPage } from "./pages/DocsPage.jsx";
import { DashboardPage } from "./pages/DashboardPage.jsx";
import { GlobalPoolPage } from "./pages/GlobalPoolPage.jsx";
import { ClubsPage } from "./pages/ClubsPage.jsx";
import { DrawsPage } from "./pages/DrawsPage.jsx";
import { AccountPage } from "./pages/AccountPage.jsx";

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
const FAUCET_UNDERLYING_AMOUNT = 100_000_000n;
const TOKEN_DECIMALS = 6;
const MAX_EUINT64 = (1n << 64n) - 1n;
const DEFAULT_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const OPERATOR_APPROVAL_SECONDS = 24 * 60 * 60;
let fheSdkInitPromise;
let fheInstancePromise;

async function getFheInstance() {
  const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
  fheSdkInitPromise ||= initSDK();
  await fheSdkInitPromise;
  fheInstancePromise ||= createInstance({
    ...SepoliaConfig,
    network: import.meta.env.VITE_SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC
  });
  return fheInstancePromise;
}

function parseTokenAmount(amount) {
  const units = parseUnits(String(amount).trim(), TOKEN_DECIMALS);
  if (units <= 0n) throw new Error("Amount must be greater than 0.");
  if (units > MAX_EUINT64) throw new Error("Amount is too large for euint64.");
  return units;
}

function operatorApprovalExpiry() {
  return Math.floor(Date.now() / 1000) + OPERATOR_APPROVAL_SECONDS;
}

async function encryptUint64Input(contractAddress, userAddress, amount) {
  const instance = await getFheInstance();
  const encrypted = await instance.createEncryptedInput(contractAddress, userAddress).add64(amount).encrypt();
  return {
    handle: toHex(encrypted.handles[0]),
    inputProof: toHex(encrypted.inputProof)
  };
}

async function userDecryptUint64({ handle, contractAddress, userAddress, walletClient }) {
  const instance = await getFheInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const contractAddresses = [contractAddress];
  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
  const types = {
    UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification
  };
  const signature = await walletClient.signTypedData({
    account: userAddress,
    domain: eip712.domain,
    types,
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message
  });
  const result = await instance.userDecrypt(
    [{ handle, contractAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    userAddress,
    startTimestamp,
    durationDays
  );
  return BigInt(result[handle] ?? result[handle.toLowerCase()] ?? 0);
}

const TEST_ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];
const CONFIDENTIAL_WRAPPER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "wrap",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

function isUserRejectedRequest(error) {
  const seen = new Set();
  const stack = [error];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const code = current.code;
    const name = current.name;
    const msg = String(current.message || "");
    if (code === 4001 || name === "UserRejectedRequestError" || /user rejected|rejected the request|denied transaction/i.test(msg)) {
      return true;
    }
    if (current.cause) stack.push(current.cause);
  }
  return false;
}

function getRouteState(pathname) {
  if (pathname === "/" || pathname === "") {
    return { view: "landing", activePage: "dashboard" };
  }

  if (pathname === "/docs") {
    return { view: "docs", activePage: "dashboard", docsSection: null };
  }

  if (pathname.startsWith("/docs/")) {
    const docsSection = pathname.replace("/docs/", "").split("/")[0];
    return { view: "docs", activePage: "dashboard", docsSection };
  }

  if (pathname === "/app") {
    return { view: "app", activePage: "dashboard" };
  }

  return { view: "app", activePage: PATH_TO_PAGE[pathname] || "dashboard" };
}

function encryptedLabel(value) {
  if (!value || String(value).includes("ciphertext:empty")) return "encrypted";
  return "encrypted";
}

function formatDrawTime(timestamp) {
  const seconds = Number(timestamp || 0);
  if (!seconds) return "24H 00M";
  return new Date(seconds * 1000).toLocaleString();
}

function sameAddress(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function AppContent({ activePage, navigatePage }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [toast, setToast] = useState(null);
  const [poolsState, setPoolsState] = useState(defaultPools);
  const [drawsState, setDrawsState] = useState(defaultDrawHistory);
  const [walletBalance, setWalletBalance] = useState(null);
  const [userDeposit, setUserDeposit] = useState(null);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);

  const showToast = (title, message, txHash = null) => {
    setToast({ title, message, txHash });
  };

  const closeToast = () => {
    setToast(null);
  };

  const getDisplayBalance = (value) => {
    if (value == null) return "0.00";
    return formatUnits(value, TOKEN_DECIMALS);
  };

  const clubContract = useMemo(
    () => ({
      address: VEIL_CLUBS_ADDRESS,
      abi: VeilClubsABI
    }),
    []
  );

  const tokenContract = useMemo(
    () => ({
      address: VEIL_TOKEN_ADDRESS,
      abi: VeilTokenABI
    }),
    []
  );

  const ensureOperatorApproved = async (userAddress) => {
    if (!walletClient || !publicClient || !IS_TOKEN_CONFIGURED) return;
    const isApproved = await publicClient.readContract({
      ...tokenContract,
      functionName: "isOperator",
      args: [userAddress, VEIL_CLUBS_ADDRESS]
    });
    if (!isApproved) {
      showToast("Approve Operator", "Approving VeilClubs as cUSDC operator for encrypted deposits...");
      const hash = await walletClient.writeContract({
        ...tokenContract,
        functionName: "setOperator",
        args: [VEIL_CLUBS_ADDRESS, operatorApprovalExpiry()]
      });
      await publicClient.waitForTransactionReceipt({ hash });
      showToast("Operator Approved", "VeilClubs is authorized to handle encrypted deposits.", hash);
    }
  };

  const handleDeposit = async (amountInput, poolName = "Global Pool", clubId = 0n) => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect a Sepolia wallet to submit encrypted deposits.");
      return;
    }

    try {
      const parsedAmount = parseTokenAmount(amountInput);
      await ensureOperatorApproved(address);
      showToast("Encrypting Input", `Generating FHE proof for ${amountInput} cUSDC...`);
      const { handle, inputProof } = await encryptUint64Input(VEIL_CLUBS_ADDRESS, address, parsedAmount);

      showToast("Submitting Deposit", `Submitting encrypted deposit to ${poolName}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "depositToClub",
        args: [BigInt(clubId), handle, inputProof]
      });

      showToast("Transaction Sent", `Waiting for Sepolia confirmation...`, hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        showToast("Deposit Confirmed", `Successfully deposited ${amountInput} cUSDC into ${poolName}!`, hash);
        handleDecrypt();
      } else {
        showToast("Deposit Reverted", "Transaction reverted on Sepolia.", hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Deposit Cancelled", "User rejected the transaction in wallet.");
      } else {
        showToast("Deposit Error", err.shortMessage || err.message || "Encrypted deposit failed.");
      }
    }
  };

  const handleDecrypt = async () => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect wallet to request EIP-712 decryption.");
      return;
    }

    try {
      showToast("Decrypting Balance", "Requesting EIP-712 signature to decrypt positions...");
      const globalBalanceHandle = await publicClient.readContract({
        ...clubContract,
        functionName: "principal",
        args: [0n, address]
      });

      const tokenBalanceHandle = await publicClient.readContract({
        ...tokenContract,
        functionName: "confidentialBalanceOf",
        args: [address]
      });

      let decryptedDeposit = 0n;
      let decryptedToken = 0n;

      if (globalBalanceHandle && globalBalanceHandle !== ZERO_BYTES32) {
        try {
          decryptedDeposit = await userDecryptUint64({
            handle: globalBalanceHandle,
            contractAddress: VEIL_CLUBS_ADDRESS,
            userAddress: address,
            walletClient
          });
        } catch {
          // ignore handle decrypt failure if uninitialized
        }
      }

      if (tokenBalanceHandle && tokenBalanceHandle !== ZERO_BYTES32) {
        try {
          decryptedToken = await userDecryptUint64({
            handle: tokenBalanceHandle,
            contractAddress: VEIL_TOKEN_ADDRESS,
            userAddress: address,
            walletClient
          });
        } catch {
          // ignore handle decrypt failure if uninitialized
        }
      }

      setUserDeposit(decryptedDeposit);
      setWalletBalance(decryptedToken);
      setIsDecrypted(true);
      showToast("Decryption Complete", "Your wallet balance and principal positions are unlocked.");
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Decryption Cancelled", "User rejected EIP-712 decryption signature.");
      } else {
        showToast("Decrypt Error", err.shortMessage || err.message || "Failed to decrypt balances.");
      }
    }
  };

  const handleHideBalance = () => {
    setIsDecrypted(false);
    showToast("Balance Hidden", "Positions hidden in local component state.");
  };

  const handleWithdraw = async () => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect wallet to withdraw principal.");
      return;
    }

    try {
      showToast("Submitting Exit", "Withdrawing principal from Global Pool...");
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "withdrawPrincipal",
        args: [0n]
      });
      showToast("Transaction Sent", "Waiting for withdrawal confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        showToast("Withdrawal Confirmed", "Principal returned to your confidential token balance.", hash);
        handleDecrypt();
      } else {
        showToast("Withdrawal Reverted", "Transaction reverted on Sepolia.", hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Withdrawal Cancelled", "User rejected the transaction.");
      } else {
        showToast("Withdrawal Error", err.shortMessage || err.message || "Withdrawal failed.");
      }
    }
  };

  const handleClaim = async () => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect wallet to claim prize payouts.");
      return;
    }

    try {
      showToast("Claiming Prize", "Submitting prize claim transaction...");
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "claimPrize",
        args: [0n]
      });
      showToast("Transaction Sent", "Waiting for claim confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        setIsClaimed(true);
        showToast("Prize Claimed", "Encrypted prize handle claimed into your confidential token balance.", hash);
        handleDecrypt();
      } else {
        showToast("Claim Reverted", "No claimable prize found or transaction reverted.", hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Claim Cancelled", "User rejected the transaction.");
      } else {
        showToast("Claim Error", err.shortMessage || err.message || "Claim failed.");
      }
    }
  };

  const handleFaucet = async () => {
    if (!address || !walletClient || !publicClient) {
      showToast("Wallet Required", "Connect wallet to mint test tokens.");
      return;
    }

    try {
      showToast("Step 1/3 Mint USDC", "Minting 100 Sepolia test USDC...");
      const mintTx = await walletClient.writeContract({
        address: VEIL_UNDERLYING_TOKEN_ADDRESS,
        abi: TEST_ERC20_ABI,
        functionName: "mint",
        args: [address, FAUCET_UNDERLYING_AMOUNT]
      });
      await publicClient.waitForTransactionReceipt({ hash: mintTx });

      showToast("Step 2/3 Approve Wrapper", "Approving cUSDC wrapper contract...");
      const approveTx = await walletClient.writeContract({
        address: VEIL_UNDERLYING_TOKEN_ADDRESS,
        abi: TEST_ERC20_ABI,
        functionName: "approve",
        args: [VEIL_TOKEN_ADDRESS, FAUCET_UNDERLYING_AMOUNT]
      });
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      showToast("Step 3/3 Wrap cUSDC", "Wrapping 100 USDC into confidential cUSDC...");
      const wrapTx = await walletClient.writeContract({
        address: VEIL_TOKEN_ADDRESS,
        abi: CONFIDENTIAL_WRAPPER_ABI,
        functionName: "wrap",
        args: [address, FAUCET_UNDERLYING_AMOUNT]
      });
      await publicClient.waitForTransactionReceipt({ hash: wrapTx });

      showToast("Faucet Complete", "Received 100 cUSDC! Ready to test encrypted deposits.", wrapTx);
      handleDecrypt();
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Faucet Cancelled", "User rejected faucet transaction.");
      } else {
        showToast("Faucet Error", err.shortMessage || err.message || "Faucet mint failed.");
      }
    }
  };

  const handleCreateClub = async (clubData) => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect wallet to deploy a Private Club.");
      return;
    }

    try {
      const minDepositUnits = parseTokenAmount(clubData.minDeposit);
      const drawIntervalSec = BigInt(clubData.drawFrequency.seconds);
      const keeperAddr = IS_KEEPER_CONFIGURED ? KEEPER_ADDRESS : address;

      showToast("Creating Club", `Deploying ${clubData.name} onchain...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "createClub",
        args: [
          clubData.name,
          minDepositUnits,
          drawIntervalSec,
          keeperAddr,
          Boolean(clubData.directoryVisibility.anonymousMembers)
        ]
      });

      showToast("Transaction Sent", "Waiting for club deployment confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      let createdContractClubId = null;
      for (const log of receipt.logs || []) {
        try {
          const decoded = decodeEventLog({
            abi: VeilClubsABI,
            data: log.data,
            topics: log.topics
          });
          if (decoded.eventName === "ClubCreated") {
            createdContractClubId = decoded.args.clubId?.toString();
            break;
          }
        } catch {
          // ignore logs from other contracts
        }
      }

      if (!createdContractClubId) {
        throw new Error("Could not parse clubId from ClubCreated event.");
      }

      const res = await fetch(`${BACKEND_URL}/api/clubs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractClubId: createdContractClubId,
          txHash: hash,
          name: clubData.name,
          admin: address,
          keeper: keeperAddr,
          minDeposit: clubData.minDeposit,
          drawIntervalMs: clubData.drawFrequency.milliseconds,
          anonymousMembers: clubData.directoryVisibility.anonymousMembers
        })
      });

      if (res.ok) {
        const payload = await res.json();
        showToast("Club Created", `Private Club ${clubData.name} deployed at ID #${createdContractClubId}!`, hash);
      } else {
        showToast("Club Onchain OK", `Deployed onchain (#${createdContractClubId}), metadata sync warning.`, hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Create Cancelled", "User rejected club deployment.");
      } else {
        showToast("Create Error", err.shortMessage || err.message || "Failed to create club.");
      }
    }
  };

  const handleJoinClub = async (inviteCodeInput) => {
    const inviteCode = String(inviteCodeInput || "").trim().toUpperCase();
    if (!inviteCode) {
      showToast("Invite Code Required", "Enter a valid invite code to join a club.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode })
      });
      if (res.ok) {
        const data = await res.json();
        showToast("Joined Club", `Joined ${data.club.name} via invite ${inviteCode}.`);
        return;
      }
      showToast("Invite Invalid", "Invite code was not accepted by the backend.");
    } catch {
      showToast("Join Failed", "Could not validate invite code with the backend.");
    }
  };

  return (
    <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <ToastNotification onClose={closeToast} toast={toast} />

      <section className="bg-veil-black">
        {activePage === "dashboard" ? (
          <DashboardPage
            isClaimed={isClaimed}
            isDecrypted={isDecrypted}
            navigatePage={navigatePage}
            onDecrypt={handleDecrypt}
            onFaucet={handleFaucet}
            pools={poolsState}
            userDeposit={getDisplayBalance(userDeposit)}
            walletBalance={getDisplayBalance(walletBalance)}
          />
        ) : null}
        {activePage === "global" ? (
          <GlobalPoolPage
            isDecrypted={isDecrypted}
            onDecrypt={handleDecrypt}
            onDeposit={handleDeposit}
            onHideBalance={handleHideBalance}
            pool={poolsState.find((pool) => pool.id === "global" || String(pool.contractId) === "0") || defaultPools[0]}
            walletBalance={isDecrypted ? getDisplayBalance(walletBalance) : null}
          />
        ) : null}
        {activePage === "clubs" ? (
          <ClubsPage
            clubs={poolsState}
            isDecrypted={isDecrypted}
            onCreateClub={handleCreateClub}
            onDecrypt={handleDecrypt}
            onDeposit={handleDeposit}
            onHideBalance={handleHideBalance}
            onJoinClub={handleJoinClub}
            walletBalance={isDecrypted ? getDisplayBalance(walletBalance) : null}
          />
        ) : null}
        {activePage === "draws" ? (
          <DrawsPage draws={drawsState} />
        ) : null}
        {activePage === "account" ? (
          <AccountPage
            isClaimed={isClaimed}
            isDecrypted={isDecrypted}
            onClaim={handleClaim}
            onDecrypt={handleDecrypt}
            onFaucet={handleFaucet}
            onHideBalance={handleHideBalance}
            onWithdraw={handleWithdraw}
            userDeposit={getDisplayBalance(userDeposit)}
            walletBalance={getDisplayBalance(walletBalance)}
          />
        ) : null}
      </section>
    </main>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => getRouteState(window.location.pathname));
  const { view, activePage, docsSection } = route;

  useEffect(() => {
    const cleanChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const cards = document.querySelectorAll(".scramble-hover");
    const cleanup = [];

    cards.forEach((card) => {
      const targets = card.querySelectorAll(".scramble-target");
      let isScrambling = false;

      const handleEnter = () => {
        if (isScrambling) return;
        isScrambling = true;
        let iteration = 0;
        const interval = setInterval(() => {
          targets.forEach((target) => {
            const originalText = target.getAttribute("data-original") || target.innerText;
            if (!target.hasAttribute("data-original")) {
              target.setAttribute("data-original", originalText);
            }
            target.innerText = originalText
              .split("")
              .map((char, index) => {
                if (char === " ") return " ";
                if (index < iteration) return originalText[index];
                return cleanChars[Math.floor(Math.random() * cleanChars.length)];
              })
              .join("");
          });
          iteration += 1 / 3;
          if (iteration >= 20) {
            clearInterval(interval);
            isScrambling = false;
            targets.forEach((target) => {
              const originalText = target.getAttribute("data-original");
              if (originalText) target.innerText = originalText;
            });
          }
        }, 30);
      };

      card.addEventListener("mouseenter", handleEnter);
      cleanup.push(() => card.removeEventListener("mouseenter", handleEnter));
    });

    return () => cleanup.forEach((fn) => fn());
  }, [view, activePage, docsSection]);

  const navigate = (path, options = {}) => {
    const { scrollToTop = true } = options;
    window.history.pushState({}, "", path);
    setRoute(getRouteState(path));
    if (scrollToTop) window.scrollTo(0, 0);
  };

  const navigatePage = (page) => {
    const path = APP_ROUTES[page] || "/app/dashboard";
    navigate(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteState(window.location.pathname));
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  if (view === "landing") {
    return (
      <div className="min-h-screen bg-veil-black text-veil-white flex flex-col font-body-md selection:bg-veil-purple selection:text-veil-white">
        <LandingHeader navigate={navigate} view={view} />
        <LandingPage goApp={() => navigate("/app/dashboard")} goDocs={() => navigate("/docs")} goGlobal={() => navigate("/app/global-pool")} />
      </div>
    );
  }

  if (view === "docs") {
    return (
      <div className="min-h-screen bg-veil-black text-veil-white flex flex-col font-body-md selection:bg-veil-purple selection:text-veil-white">
        <LandingHeader navigate={navigate} view={view} />
        <DocsPage docsSection={docsSection} navigate={navigate} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-veil-black text-veil-white flex flex-col font-body-md selection:bg-veil-purple selection:text-veil-white">
      <AppHeader activePage={activePage} navigate={navigate} navigatePage={navigatePage} />
      <AppContent activePage={activePage} navigatePage={navigatePage} />
      <AppFooter />
    </div>
  );
}
