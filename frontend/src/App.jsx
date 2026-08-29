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
const PUBLIC_SEPOLIA_RPC_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://1rpc.io/sepolia",
  "https://gateway.tenderly.co/public/sepolia",
  "https://rpc2.sepolia.org"
];
const OPERATOR_APPROVAL_SECONDS = 24 * 60 * 60;
let fheSdkInitPromise;
let fheInstancePromise;
let fheRpcIndex = 0;

function orderedFheRpcUrls() {
  const privateRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;
  const urls = [...PUBLIC_SEPOLIA_RPC_URLS];
  if (privateRpcUrl && !urls.includes(privateRpcUrl)) urls.push(privateRpcUrl);
  return urls;
}

function isRetryableRpcError(error) {
  const message = `${error?.shortMessage || ""} ${error?.message || ""} ${error?.details || ""}`.toLowerCase();
  return (
    message.includes("429") ||
    message.includes("rate limit") ||
    message.includes("too many requests") ||
    message.includes("timeout") ||
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("failed to fetch")
  );
}

async function getFheInstance() {
  const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
  fheSdkInitPromise ||= initSDK();
  await fheSdkInitPromise;
  const rpcUrls = orderedFheRpcUrls();

  if (fheInstancePromise) return fheInstancePromise;

  let lastError;
  for (let index = fheRpcIndex; index < rpcUrls.length; index += 1) {
    try {
      fheInstancePromise = createInstance({
        ...SepoliaConfig,
        network: rpcUrls[index]
      });
      const instance = await fheInstancePromise;
      fheRpcIndex = index;
      return instance;
    } catch (error) {
      fheInstancePromise = null;
      lastError = error;
      if (!isRetryableRpcError(error)) break;
    }
  }

  throw lastError || new Error("Unable to initialize Zama FHE SDK.");
}

async function withFheInstance(task) {
  try {
    return await task(await getFheInstance());
  } catch (error) {
    const rpcUrls = orderedFheRpcUrls();
    if (isRetryableRpcError(error) && fheRpcIndex + 1 < rpcUrls.length) {
      fheRpcIndex += 1;
      fheInstancePromise = null;
      return task(await getFheInstance());
    }
    throw error;
  }
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
  const encrypted = await withFheInstance((instance) =>
    instance.createEncryptedInput(contractAddress, userAddress).add64(amount).encrypt()
  );
  return {
    handle: toHex(encrypted.handles[0]),
    inputProof: toHex(encrypted.inputProof)
  };
}

async function userDecryptUint64({ handle, contractAddress, userAddress, walletClient }) {
  return withFheInstance(async (instance) => {
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
  });
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

function getDrawTimestampMs(value) {
  if (!value) return null;
  if (typeof value === "bigint") return Number(value) * 1000;
  if (typeof value === "number") return value > 10_000_000_000 ? value : value * 1000;
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric > 10_000_000_000 ? numeric : numeric * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCountdown(value, nowMs = Date.now()) {
  const timestampMs = getDrawTimestampMs(value);
  if (!timestampMs) return "--";
  const remaining = Math.max(0, Math.floor((timestampMs - nowMs) / 1000));
  if (remaining <= 0) return "READY";
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (days > 0) return `${days}D ${String(hours).padStart(2, "0")}H`;
  if (hours > 0) return `${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
  return `${String(minutes).padStart(2, "0")}M ${String(seconds).padStart(2, "0")}S`;
}

function poolFromClub(club) {
  return {
    id: club.id || `club-${club.contractClubId}`,
    name: club.name || "Global Pool",
    scope: club.scope || "PRIVATE",
    contractId: String(club.contractClubId ?? club.contractId ?? (club.id === "global" ? "0" : "")),
    tvl: encryptedLabel(club.encryptedTvlHandle || club.tvl),
    members: String(club.memberCount ?? club.members ?? 0),
    nextDrawAt: club.nextDrawAt || null,
    draw: "--",
    prize: club.encryptedPrizeHandle ? "•••••• USDC" : club.prize || "•••••• USDC",
    status: club.status || "ACTIVE",
    admin: club.admin,
    keeper: club.keeper,
    inviteCode: club.inviteCode,
    anonymousMembers: club.anonymousMembers
  };
}

function withOnchainClubView(pool, clubView) {
  if (!clubView?.exists) return pool;
  return {
    ...pool,
    admin: clubView.admin || pool.admin,
    keeper: clubView.keeper || pool.keeper,
    members: String(clubView.memberCount ?? pool.members ?? 0),
    nextDrawAt: clubView.nextDrawAt ? Number(clubView.nextDrawAt) * 1000 : pool.nextDrawAt,
    status: "ACTIVE"
  };
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
  const [pendingPrize, setPendingPrize] = useState(null);
  const [pendingPrizeDraw, setPendingPrizeDraw] = useState(null);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [nowMs, setNowMs] = useState(Date.now());

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

  const refreshPools = async () => {
    const backendPools = [];
    try {
      const res = await fetch(`${BACKEND_URL}/api/clubs`);
      if (res.ok) {
        const payload = await res.json();
        backendPools.push(...(payload.clubs || []));
      }
    } catch {
      // Backend metadata is optional; onchain global state is still readable.
    }

    const rawPools = backendPools.length ? backendPools : defaultPools;
    const nextPools = await Promise.all(
      rawPools.map(async (club) => {
        const pool = poolFromClub(club);
        if (!publicClient || !IS_CONTRACT_CONFIGURED || pool.contractId === "") return pool;
        try {
          const clubView = await publicClient.readContract({
            ...clubContract,
            functionName: "clubView",
            args: [BigInt(pool.contractId)]
          });
          return withOnchainClubView(pool, clubView);
        } catch {
          return pool;
        }
      })
    );

    setPoolsState(nextPools);
  };

  const refreshDraws = async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/draws`);
      if (!res.ok) return;
      const payload = await res.json();
      setDrawsState(payload.draws || []);
    } catch {
      // Draw metadata is refreshed opportunistically; onchain reads remain the source of truth.
    }
  };

  const getDecryptedTokenBalance = async () => {
    const tokenBalanceHandle = await publicClient.readContract({
      ...tokenContract,
      functionName: "confidentialBalanceOf",
      args: [address]
    });

    if (!tokenBalanceHandle || tokenBalanceHandle === ZERO_BYTES32) return 0n;
    return userDecryptUint64({
      handle: tokenBalanceHandle,
      contractAddress: VEIL_TOKEN_ADDRESS,
      userAddress: address,
      walletClient
    });
  };

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    refreshPools();
    refreshDraws();
    const timer = setInterval(() => {
      refreshPools();
      refreshDraws();
    }, 30000);
    return () => clearInterval(timer);
  }, [publicClient, clubContract]);

  const displayPools = useMemo(
    () =>
      poolsState.map((pool) => ({
        ...pool,
        draw: formatCountdown(pool.nextDrawAt, nowMs)
      })),
    [poolsState, nowMs]
  );

  const activePoolsCount = displayPools.filter((pool) => Number(pool.members || 0) > 0).length;
  const drawTimestamps = displayPools.map((pool) => getDrawTimestampMs(pool.nextDrawAt)).filter(Boolean);
  const hasReadyDraw = drawTimestamps.some((timestamp) => timestamp <= nowMs);
  const nextDrawAt = drawTimestamps
    .filter((timestamp) => timestamp >= nowMs)
    .sort((a, b) => a - b)[0];
  const dashboardNextDraw = hasReadyDraw ? "READY" : formatCountdown(nextDrawAt, nowMs);
  const recentDraws = useMemo(
    () =>
      drawsState
        .filter((draw) => draw?.clubId != null && draw?.drawNumber != null)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 10),
    [drawsState]
  );

  const isDrawOperatorForClub = (clubId) => {
    const pool = displayPools.find((item) => String(item.contractId) === String(clubId));
    return sameAddress(address, pool?.admin) || sameAddress(address, pool?.keeper);
  };

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
      let availableBalance = isDecrypted && walletBalance != null ? walletBalance : null;
      if (availableBalance == null) {
        showToast(
          "Balance Check Required",
          "Sign EIP-712 to decrypt your cUSDC balance locally before deposit validation."
        );
        availableBalance = await getDecryptedTokenBalance();
        setWalletBalance(availableBalance);
        setIsDecrypted(true);
      }

      if (availableBalance < parsedAmount) {
        showToast(
          "Insufficient Balance",
          `Wallet has ${formatUnits(availableBalance, TOKEN_DECIMALS)} cUSDC, but this deposit needs ${formatUnits(parsedAmount, TOKEN_DECIMALS)} cUSDC.`
        );
        return;
      }

      await ensureOperatorApproved(address);
      showToast("Encrypting Input", `Generating FHE proof for ${amountInput} cUSDC...`);
      const { handle, inputProof } = await encryptUint64Input(VEIL_CLUBS_ADDRESS, address, parsedAmount);

      showToast("Submitting Deposit", `Submitting encrypted deposit to ${poolName}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "deposit",
        args: [BigInt(clubId), handle, inputProof]
      });

      showToast("Transaction Sent", `Waiting for Sepolia confirmation...`, hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      if (receipt.status === "success") {
        await refreshPools();
        if (isDecrypted || availableBalance != null) {
          setWalletBalance(availableBalance - parsedAmount);
          setUserDeposit((current) => (current == null ? parsedAmount : current + parsedAmount));
          setIsDecrypted(true);
        }
        showToast("Deposit Confirmed", `Encrypted deposit of ${amountInput} cUSDC confirmed in ${poolName}.`, hash);
      } else {
        showToast("Deposit Reverted", "Transaction reverted on Sepolia.", hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Deposit Cancelled", "User rejected the wallet request.");
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
        functionName: "encryptedPrincipalOf",
        args: [0n, address]
      });

      let decryptedDeposit = 0n;
      let decryptedToken = await getDecryptedTokenBalance();
      let decryptedPrize = 0n;
      let decryptedPrizeDraw = null;

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

      for (const draw of recentDraws) {
        try {
          const claimed = await publicClient.readContract({
            ...clubContract,
            functionName: "isPrizeClaimed",
            args: [BigInt(draw.clubId), BigInt(draw.drawNumber), address]
          });
          if (claimed) continue;

          const prizeHandle = await publicClient.readContract({
            ...clubContract,
            functionName: "encryptedPrizeOf",
            args: [BigInt(draw.clubId), BigInt(draw.drawNumber), address]
          });
          if (prizeHandle && prizeHandle !== ZERO_BYTES32) {
            decryptedPrize = await userDecryptUint64({
              handle: prizeHandle,
              contractAddress: VEIL_CLUBS_ADDRESS,
              userAddress: address,
              walletClient
            });
            if (decryptedPrize > 0n) {
              decryptedPrizeDraw = draw;
              break;
            }
          }
        } catch {
          // No readable prize for this wallet/draw; try the next recent draw.
        }
      }

      setUserDeposit(decryptedDeposit);
      setWalletBalance(decryptedToken);
      setPendingPrize(decryptedPrize);
      setPendingPrizeDraw(decryptedPrizeDraw);
      setIsClaimed(false);
      setIsDecrypted(true);
      showToast(
        "Local Decrypt Complete",
        decryptedPrize > 0n
          ? `Your balance, principal, and draw #${decryptedPrizeDraw.drawNumber} prize were decrypted locally.`
          : "Your cUSDC balance and principal were decrypted locally for this wallet."
      );
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
    setPendingPrize(null);
    setPendingPrizeDraw(null);
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
        setUserDeposit(0n);
        setIsDecrypted(false);
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
    if (!pendingPrizeDraw || !pendingPrize || pendingPrize <= 0n) {
      showToast("Decrypt Prize First", "Decrypt your latest draw prize locally before claiming.");
      return;
    }

    try {
      showToast("Claiming Prize", `Submitting prize claim for draw #${pendingPrizeDraw.drawNumber}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "claimPrize",
        args: [BigInt(pendingPrizeDraw.clubId), BigInt(pendingPrizeDraw.drawNumber)]
      });
      showToast("Transaction Sent", "Waiting for claim confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        setIsClaimed(true);
        setPendingPrize(0n);
        setPendingPrizeDraw(null);
        showToast("Prize Claimed", "Encrypted prize handle claimed into your confidential token balance.", hash);
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

  const handleFundYield = async (amountInput = "10", poolName = "Global Pool", clubId = 0n) => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect a Sepolia wallet to fund encrypted yield.");
      return;
    }
    if (!isDrawOperatorForClub(clubId)) {
      showToast("Operator Required", "Only the pool admin or keeper can fund the encrypted prize reserve.");
      return;
    }

    try {
      const parsedAmount = parseTokenAmount(amountInput);
      let availableBalance = isDecrypted && walletBalance != null ? walletBalance : null;
      if (availableBalance == null) {
        showToast(
          "Balance Check Required",
          "Sign EIP-712 to decrypt your cUSDC balance locally before funding the prize reserve."
        );
        availableBalance = await getDecryptedTokenBalance();
        setWalletBalance(availableBalance);
        setIsDecrypted(true);
      }

      if (availableBalance < parsedAmount) {
        showToast(
          "Insufficient Balance",
          `Wallet has ${formatUnits(availableBalance, TOKEN_DECIMALS)} cUSDC, but yield funding needs ${formatUnits(parsedAmount, TOKEN_DECIMALS)} cUSDC.`
        );
        return;
      }

      await ensureOperatorApproved(address);
      showToast("Encrypting Yield", `Generating FHE proof for ${amountInput} cUSDC prize funding...`);
      const { handle, inputProof } = await encryptUint64Input(VEIL_CLUBS_ADDRESS, address, parsedAmount);

      showToast("Submitting Yield", `Funding encrypted prize reserve for ${poolName}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "accrueYield",
        args: [BigInt(clubId), handle, inputProof]
      });

      showToast("Transaction Sent", "Waiting for yield funding confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        if (isDecrypted || availableBalance != null) {
          setWalletBalance(availableBalance - parsedAmount);
          setIsDecrypted(true);
        }
        showToast("Yield Funded", `Encrypted prize reserve funded with ${amountInput} cUSDC.`, hash);
      } else {
        showToast("Yield Reverted", "Transaction reverted on Sepolia.", hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Yield Cancelled", "User rejected the wallet request.");
      } else {
        showToast("Yield Error", err.shortMessage || err.message || "Encrypted yield funding failed.");
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
      if (isDecrypted && walletBalance != null) {
        setWalletBalance(walletBalance + FAUCET_UNDERLYING_AMOUNT);
      }
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
          clubData.description || "Private confidential no-loss club",
          minDepositUnits,
          drawIntervalSec,
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

      if (IS_KEEPER_CONFIGURED && !sameAddress(keeperAddr, address)) {
        showToast("Setting Keeper", "Assigning the automated draw keeper for this club...");
        const keeperHash = await walletClient.writeContract({
          ...clubContract,
          functionName: "setKeeper",
          args: [BigInt(createdContractClubId), keeperAddr]
        });
        const keeperReceipt = await publicClient.waitForTransactionReceipt({ hash: keeperHash });
        if (keeperReceipt.status !== "success") {
          throw new Error("Club deployed, but keeper assignment reverted.");
        }
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
        await res.json();
        await refreshPools();
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
            activePoolsCount={activePoolsCount}
            nextDraw={dashboardNextDraw}
            pools={displayPools}
            userDeposit={getDisplayBalance(userDeposit)}
            walletBalance={getDisplayBalance(walletBalance)}
          />
        ) : null}
        {activePage === "global" ? (
          <GlobalPoolPage
            isDecrypted={isDecrypted}
            onDecrypt={handleDecrypt}
            onDeposit={handleDeposit}
            onFundYield={handleFundYield}
            onHideBalance={handleHideBalance}
            pool={displayPools.find((pool) => pool.id === "global" || String(pool.contractId) === "0") || defaultPools[0]}
            walletBalance={isDecrypted ? getDisplayBalance(walletBalance) : null}
          />
        ) : null}
        {activePage === "clubs" ? (
          <ClubsPage
            clubs={displayPools}
            isDecrypted={isDecrypted}
            onCreateClub={handleCreateClub}
            onDecrypt={handleDecrypt}
            onDeposit={handleDeposit}
            onFundYield={handleFundYield}
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
            pendingPrize={getDisplayBalance(pendingPrize)}
            pendingPrizeDraw={pendingPrizeDraw}
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
