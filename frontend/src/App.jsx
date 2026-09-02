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

async function userDecryptUint64Batch({ items, userAddress, walletClient }) {
  const decryptItems = items.filter((item) => item?.handle && item.handle !== ZERO_BYTES32);
  if (!decryptItems.length) return {};

  return withFheInstance(async (instance) => {
    const keypair = instance.generateKeypair();
    const startTimestamp = Math.floor(Date.now() / 1000);
    const durationDays = 1;
    const contractAddresses = [...new Set(decryptItems.map((item) => item.contractAddress))];
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
      decryptItems.map(({ handle, contractAddress }) => ({ handle, contractAddress })),
      keypair.privateKey,
      keypair.publicKey,
      signature.replace("0x", ""),
      contractAddresses,
      userAddress,
      startTimestamp,
      durationDays
    );
    return Object.fromEntries(
      decryptItems.map((item) => [item.key, BigInt(result[item.handle] ?? result[item.handle.toLowerCase()] ?? 0)])
    );
  });
}

async function userDecryptUint64({ handle, contractAddress, userAddress, walletClient }) {
  const decrypted = await userDecryptUint64Batch({
    items: [{ key: "value", handle, contractAddress }],
    userAddress,
    walletClient
  });
  return decrypted.value ?? 0n;
}

async function publicDecryptUint64(handle) {
  return withFheInstance(async (instance) => {
    const result = await instance.publicDecrypt([handle]);
    const clearValue = result.clearValues[handle] ?? result.clearValues[handle.toLowerCase()] ?? 0;
    return {
      clearValue: BigInt(clearValue),
      decryptionProof: toHex(result.decryptionProof)
    };
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
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "receiver", type: "address" },
      { indexed: true, internalType: "bytes32", name: "unwrapRequestId", type: "bytes32" },
      { indexed: false, internalType: "euint64", name: "amount", type: "bytes32" }
    ],
    name: "UnwrapRequested",
    type: "event"
  },
  {
    inputs: [
      { internalType: "address", name: "from", type: "address" },
      { internalType: "address", name: "to", type: "address" },
      { internalType: "externalEuint64", name: "encryptedAmount", type: "bytes32" },
      { internalType: "bytes", name: "inputProof", type: "bytes" }
    ],
    name: "unwrap",
    outputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "bytes32", name: "unwrapRequestId", type: "bytes32" },
      { internalType: "uint64", name: "unwrapAmountCleartext", type: "uint64" },
      { internalType: "bytes", name: "decryptionProof", type: "bytes" }
    ],
    name: "finalizeUnwrap",
    outputs: [],
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
  const days = Math.floor(remaining / 86400);
  const hours = Math.floor((remaining % 86400) / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;
  if (days > 0) return `${days}D ${String(hours).padStart(2, "0")}H`;
  if (hours > 0) return `${String(hours).padStart(2, "0")}H ${String(minutes).padStart(2, "0")}M`;
  return `${String(minutes).padStart(2, "0")}M ${String(seconds).padStart(2, "0")}S`;
}

function hasMembers(memberCount) {
  return Number(memberCount || 0) > 0;
}

function hasPrizeReserve(pool) {
  return Boolean(pool?.hasPrizeReserve);
}

function formatDrawWindow(value, nowMs = Date.now(), memberCount = 0, prizeReady = false) {
  if (!hasMembers(memberCount)) return "AWAITING DEPOSIT";
  if (!prizeReady) return "AWAITING PRIZE";
  const timestampMs = getDrawTimestampMs(value);
  if (!timestampMs) return "--";
  return timestampMs <= nowMs ? "DRAW QUEUED" : formatCountdown(timestampMs, nowMs);
}

function isDrawDue(value, nowMs = Date.now(), memberCount = 0, prizeReady = false) {
  if (!hasMembers(memberCount)) return false;
  if (!prizeReady) return false;
  const timestampMs = getDrawTimestampMs(value);
  return Boolean(timestampMs && timestampMs <= nowMs);
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
    hasPrizeReserve: Boolean(club.hasPrizeReserve),
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
    hasPrizeReserve: Boolean(clubView.hasPrizeReserve),
    status: "ACTIVE"
  };
}

function sameAddress(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function clubRecordKey(club) {
  return String(club?.contractClubId ?? club?.contractId ?? club?.id ?? "");
}

function membershipSourceRank(source) {
  return { created: 3, deposit: 2, invite: 1, joined: 0 }[source] ?? 0;
}

function strongestMembershipSource(left, right) {
  return membershipSourceRank(right) > membershipSourceRank(left) ? right : left;
}

function mergeClubRecords(...groups) {
  const merged = new Map();
  for (const group of groups) {
    for (const club of group || []) {
      const key = clubRecordKey(club);
      if (!key) continue;
      const previous = merged.get(key) || {};
      merged.set(key, {
        ...previous,
        ...club,
        membershipSource: strongestMembershipSource(previous.membershipSource, club.membershipSource)
      });
    }
  }
  return [...merged.values()];
}

function AppContent({ activePage, navigatePage }) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const [toast, setToast] = useState(null);
  const [poolsState, setPoolsState] = useState(defaultPools);
  const [sessionJoinedClubs, setSessionJoinedClubs] = useState([]);
  const [drawsState, setDrawsState] = useState(defaultDrawHistory);
  const [walletBalance, setWalletBalance] = useState(null);
  const [userDeposit, setUserDeposit] = useState(null);
  const [clubDeposit, setClubDeposit] = useState(null);
  const [pendingPrize, setPendingPrize] = useState(null);
  const [pendingPrizes, setPendingPrizes] = useState([]);
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

  const fetchJoinedClubs = async () => {
    if (!address) return [];
    try {
      const res = await fetch(`${BACKEND_URL}/api/memberships/${address}`);
      if (!res.ok) return [];
      const payload = await res.json();
      return Array.isArray(payload.clubs) ? payload.clubs : [];
    } catch {
      return [];
    }
  };

  const rememberJoinedClub = async (club, source = "joined") => {
    if (!address || !club) return;
    const contractClubId = String(club.contractClubId ?? club.contractId ?? "");
    const clubId = String(club.id ?? (contractClubId ? `club-${contractClubId}` : ""));
    if (!clubId && !contractClubId) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, clubId, contractClubId, source })
      });
      if (res.ok) {
        const payload = await res.json();
        const nextJoined = Array.isArray(payload.clubs) ? payload.clubs : payload.club ? [payload.club] : [];
        setSessionJoinedClubs((current) => mergeClubRecords(current, nextJoined));
        setPoolsState((current) => mergeClubRecords(current, nextJoined));
        return;
      }
    } catch {
      // Keep the current session responsive if backend membership sync is temporarily unavailable.
    }

    const localJoined = [{ ...club, joined: true, membershipSource: source }];
    setSessionJoinedClubs((current) => mergeClubRecords(current, localJoined));
    setPoolsState((current) => mergeClubRecords(current, localJoined));
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

    const storedJoinedClubs = await fetchJoinedClubs();
    const rawPools = mergeClubRecords(backendPools.length ? backendPools : defaultPools, storedJoinedClubs, sessionJoinedClubs);
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
    let isMounted = true;
    setSessionJoinedClubs([]);
    fetchJoinedClubs().then((clubs) => {
      if (isMounted) {
        setSessionJoinedClubs(clubs);
        setPoolsState((current) => mergeClubRecords(current, clubs));
      }
    });
    return () => {
      isMounted = false;
    };
  }, [address]);

  useEffect(() => {
    refreshPools();
    refreshDraws();
    const timer = setInterval(() => {
      refreshPools();
      refreshDraws();
    }, 30000);
    return () => clearInterval(timer);
  }, [publicClient, clubContract, address, sessionJoinedClubs]);

  const displayPools = useMemo(
    () =>
      poolsState.map((pool) => ({
        ...pool,
        draw: formatDrawWindow(pool.nextDrawAt, nowMs, pool.members, hasPrizeReserve(pool)),
        drawDue: isDrawDue(pool.nextDrawAt, nowMs, pool.members, hasPrizeReserve(pool)),
        drawStatus: !hasMembers(pool.members)
          ? "NO_ONCHAIN_MEMBERS"
          : !hasPrizeReserve(pool)
            ? "KEEPER_FUNDING"
            : isDrawDue(pool.nextDrawAt, nowMs, pool.members, hasPrizeReserve(pool))
              ? "AWAITING_KEEPER"
              : "KEEPER_WINDOW"
      })),
    [poolsState, nowMs]
  );

  const activePoolsCount = displayPools.filter((pool) => Number(pool.members || 0) > 0).length;
  const drawTimestamps = displayPools
    .filter((pool) => hasMembers(pool.members) && hasPrizeReserve(pool))
    .map((pool) => getDrawTimestampMs(pool.nextDrawAt))
    .filter(Boolean);
  const hasPoolsAwaitingPrize = displayPools.some((pool) => hasMembers(pool.members) && !hasPrizeReserve(pool));
  const hasDueDraw = drawTimestamps.some((timestamp) => timestamp <= nowMs);
  const nextDrawAt = drawTimestamps
    .filter((timestamp) => timestamp >= nowMs)
    .sort((a, b) => a - b)[0];
  const dashboardNextDraw =
    activePoolsCount === 0 ? "AWAITING DEPOSIT" : hasDueDraw ? "DRAW QUEUED" : nextDrawAt ? formatCountdown(nextDrawAt, nowMs) : "AWAITING PRIZE";
  const dashboardNextDrawStatus =
    activePoolsCount === 0 ? "NO_ONCHAIN_MEMBERS" : hasDueDraw ? "KEEPER_DUE" : hasPoolsAwaitingPrize ? "KEEPER_FUNDING" : "KEEPER_WINDOW";
  const recentDraws = useMemo(
    () =>
      drawsState
        .filter((draw) => draw?.clubId != null && draw?.drawNumber != null)
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()),
    [drawsState]
  );
  const displayPendingPrizes = useMemo(
    () =>
      pendingPrizes.map((prize) => ({
        ...prize,
        displayAmount: getDisplayBalance(prize.amount)
      })),
    [pendingPrizes]
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
        if (BigInt(clubId) !== 0n) {
          const joinedPool = displayPools.find((pool) => String(pool.contractId) === String(clubId));
          if (joinedPool) await rememberJoinedClub(joinedPool, "deposit");
        }
        if (isDecrypted || availableBalance != null) {
          setWalletBalance(availableBalance - parsedAmount);
          if (BigInt(clubId) === 0n) {
            setUserDeposit((current) => (current == null ? parsedAmount : current + parsedAmount));
          } else {
            setClubDeposit((current) => (current == null ? parsedAmount : current + parsedAmount));
          }
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
      const tokenBalanceHandle = await publicClient.readContract({
        ...tokenContract,
        functionName: "confidentialBalanceOf",
        args: [address]
      });

      let decryptedDeposit = 0n;
      let decryptedClubDeposit = 0n;
      let decryptedToken = 0n;
      let decryptedPendingWinnings = 0n;
      const decryptedPrizes = [];
      const prizeHandleItems = [];
      const clubPrincipalItems = [];
      const decryptItems = [
        { key: "wallet", handle: tokenBalanceHandle, contractAddress: VEIL_TOKEN_ADDRESS },
        { key: "globalPrincipal", handle: globalBalanceHandle, contractAddress: VEIL_CLUBS_ADDRESS }
      ];

      for (const pool of displayPools) {
        const contractId = String(pool.contractId ?? "");
        if (!contractId || contractId === "0") continue;
        try {
          const clubPrincipalHandle = await publicClient.readContract({
            ...clubContract,
            functionName: "encryptedPrincipalOf",
            args: [BigInt(contractId), address]
          });
          const key = `clubPrincipal:${contractId}`;
          clubPrincipalItems.push(key);
          decryptItems.push({
            key,
            handle: clubPrincipalHandle,
            contractAddress: VEIL_CLUBS_ADDRESS
          });
        } catch {
          // Some backend club metadata can outlive an older deployment; skip unreadable club balances.
        }
      }

      try {
        const pendingWinningsHandle = await publicClient.readContract({
          ...clubContract,
          functionName: "encryptedPendingWinningsOf",
          args: [address]
        });
        decryptItems.push({
          key: "pendingWinnings",
          handle: pendingWinningsHandle,
          contractAddress: VEIL_CLUBS_ADDRESS
        });
      } catch {
        // Per-draw prize handles below still provide a fallback for older deployments.
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
            const key = `prize:${draw.clubId}:${draw.drawNumber}`;
            const item = {
              key,
              handle: prizeHandle,
              contractAddress: VEIL_CLUBS_ADDRESS
            };
            prizeHandleItems.push({ draw, key });
            decryptItems.push(item);
          }
        } catch {
          // No readable prize for this wallet/draw; try the next recent draw.
        }
      }

      const decryptedValues = await userDecryptUint64Batch({
        items: decryptItems,
        userAddress: address,
        walletClient
      });
      decryptedDeposit = decryptedValues.globalPrincipal ?? 0n;
      decryptedClubDeposit = clubPrincipalItems.reduce((total, key) => total + (decryptedValues[key] ?? 0n), 0n);
      decryptedToken = decryptedValues.wallet ?? 0n;
      decryptedPendingWinnings = decryptedValues.pendingWinnings ?? 0n;
      for (const { draw, key } of prizeHandleItems) {
        const decryptedPrize = decryptedValues[key] ?? 0n;
        if (decryptedPrize > 0n) {
          decryptedPrizes.push({ ...draw, amount: decryptedPrize });
        }
      }

      const decryptedDrawPrizeTotal = decryptedPrizes.reduce((total, prize) => total + prize.amount, 0n);
      const decryptedPrizeTotal = decryptedPendingWinnings > 0n ? decryptedPendingWinnings : decryptedDrawPrizeTotal;
      setUserDeposit(decryptedDeposit);
      setClubDeposit(decryptedClubDeposit);
      setWalletBalance(decryptedToken);
      setPendingPrize(decryptedPrizeTotal);
      setPendingPrizes(decryptedPrizes);
      setPendingPrizeDraw(decryptedPrizes[0] || null);
      setIsClaimed(decryptedPrizes.length === 0);
      setIsDecrypted(true);
      showToast(
        "Local Decrypt Complete",
        decryptedPrizeTotal > 0n
          ? `${decryptedPrizes.length} pending prize${decryptedPrizes.length === 1 ? "" : "s"} decrypted locally.`
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
    setPendingPrizes([]);
    setPendingPrizeDraw(null);
    setClubDeposit(null);
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

  const handleUnwrap = async (amountInput) => {
    if (!address || !walletClient || !publicClient || !IS_TOKEN_CONFIGURED) {
      showToast("Wallet Required", "Connect a Sepolia wallet to unwrap cUSDC.");
      return;
    }

    try {
      const parsedAmount = parseTokenAmount(amountInput);
      let availableBalance = isDecrypted && walletBalance != null ? walletBalance : null;
      if (availableBalance == null) {
        showToast("Balance Check Required", "Sign EIP-712 to decrypt your cUSDC balance locally before unwrap validation.");
        availableBalance = await getDecryptedTokenBalance();
        setWalletBalance(availableBalance);
        setIsDecrypted(true);
      }

      if (availableBalance < parsedAmount) {
        showToast(
          "Insufficient Balance",
          `Wallet has ${formatUnits(availableBalance, TOKEN_DECIMALS)} cUSDC, but unwrap needs ${formatUnits(parsedAmount, TOKEN_DECIMALS)} cUSDC.`
        );
        return;
      }

      showToast("Encrypting Unwrap", `Generating FHE proof for ${amountInput} cUSDC unwrap...`);
      const { handle, inputProof } = await encryptUint64Input(VEIL_TOKEN_ADDRESS, address, parsedAmount);

      showToast("Requesting Unwrap", "Burning cUSDC and opening a public decrypt request...");
      const unwrapHash = await walletClient.writeContract({
        address: VEIL_TOKEN_ADDRESS,
        abi: CONFIDENTIAL_WRAPPER_ABI,
        functionName: "unwrap",
        args: [address, address, handle, inputProof]
      });
      showToast("Unwrap Requested", "Waiting for unwrap request confirmation...", unwrapHash);
      const unwrapReceipt = await publicClient.waitForTransactionReceipt({ hash: unwrapHash });
      if (unwrapReceipt.status !== "success") {
        showToast("Unwrap Reverted", "The unwrap request reverted on Sepolia.", unwrapHash);
        return;
      }

      let unwrapRequestId = null;
      for (const log of unwrapReceipt.logs || []) {
        try {
          const decoded = decodeEventLog({ abi: CONFIDENTIAL_WRAPPER_ABI, data: log.data, topics: log.topics });
          if (decoded.eventName === "UnwrapRequested") {
            unwrapRequestId = decoded.args.unwrapRequestId;
            break;
          }
        } catch {
          // Ignore logs emitted by other contracts touched by the unwrap transaction.
        }
      }

      if (!unwrapRequestId) {
        showToast("Unwrap Pending", "Unwrap request confirmed, but the request id was not found in logs.", unwrapHash);
        return;
      }

      showToast("Finalizing Unwrap", "Waiting for Zama public decrypt proof, then releasing USDC...");
      const { clearValue, decryptionProof } = await publicDecryptUint64(unwrapRequestId);
      const finalizeHash = await walletClient.writeContract({
        address: VEIL_TOKEN_ADDRESS,
        abi: CONFIDENTIAL_WRAPPER_ABI,
        functionName: "finalizeUnwrap",
        args: [unwrapRequestId, clearValue, decryptionProof]
      });
      showToast("Finalize Sent", "Waiting for USDC transfer confirmation...", finalizeHash);
      const finalizeReceipt = await publicClient.waitForTransactionReceipt({ hash: finalizeHash });
      if (finalizeReceipt.status === "success") {
        if (availableBalance != null) {
          setWalletBalance(availableBalance - parsedAmount);
          setIsDecrypted(true);
        }
        showToast("Unwrap Complete", `${formatUnits(clearValue, TOKEN_DECIMALS)} cUSDC unwrapped to USDC.`, finalizeHash);
      } else {
        showToast("Finalize Reverted", "USDC release transaction reverted on Sepolia.", finalizeHash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Unwrap Cancelled", "User rejected the wallet request.");
      } else {
        showToast("Unwrap Error", err.shortMessage || err.message || "cUSDC unwrap failed.");
      }
    }
  };

  const removePendingPrize = (claimedPrize) => {
    const nextPendingPrizes = pendingPrizes.filter(
      (prize) =>
        String(prize.clubId) !== String(claimedPrize.clubId) ||
        String(prize.drawNumber) !== String(claimedPrize.drawNumber)
    );
    setPendingPrizes(nextPendingPrizes);
    setPendingPrize(nextPendingPrizes.reduce((total, prize) => total + prize.amount, 0n));
    setPendingPrizeDraw(nextPendingPrizes[0] || null);
    setIsClaimed(nextPendingPrizes.length === 0);
  };

  const handleClaim = async (selectedPrize = null) => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect wallet to claim prize payouts.");
      return;
    }
    const claimTarget = selectedPrize || pendingPrizes[0] || pendingPrizeDraw;
    if (!claimTarget || !pendingPrize || pendingPrize <= 0n) {
      showToast("Decrypt Prize First", "Decrypt your pending prizes locally before claiming.");
      return;
    }

    try {
      showToast("Claiming Prize", `Submitting prize claim for draw #${claimTarget.drawNumber}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "claimPrize",
        args: [BigInt(claimTarget.clubId), BigInt(claimTarget.drawNumber)]
      });
      showToast("Transaction Sent", "Waiting for claim confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        removePendingPrize(claimTarget);
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

  const handleClaimAll = async () => {
    if (!address || !walletClient || !publicClient || !IS_CONTRACT_CONFIGURED) {
      showToast("Wallet Required", "Connect wallet to claim prize payouts.");
      return;
    }
    if (!pendingPrizes.length) {
      showToast("No Prize To Claim", "Decrypt your pending prizes locally before claiming.");
      return;
    }

    try {
      const clubIds = pendingPrizes.map((prize) => BigInt(prize.clubId));
      const drawIds = pendingPrizes.map((prize) => BigInt(prize.drawNumber));
      showToast("Claiming Prizes", `Submitting ${pendingPrizes.length} pending prize claim${pendingPrizes.length === 1 ? "" : "s"}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "claimPrizes",
        args: [clubIds, drawIds]
      });
      showToast("Transaction Sent", "Waiting for claim-all confirmation...", hash);
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        setIsClaimed(true);
        setPendingPrize(0n);
        setPendingPrizes([]);
        setPendingPrizeDraw(null);
        showToast("Prizes Claimed", "All pending encrypted prizes were claimed into your confidential token balance.", hash);
      } else {
        showToast("Claim Reverted", "One or more pending prizes could not be claimed.", hash);
      }
    } catch (err) {
      if (isUserRejectedRequest(err)) {
        showToast("Claim Cancelled", "User rejected the transaction.");
      } else {
        showToast("Claim Error", err.shortMessage || err.message || "Claim all failed.");
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

      showToast("Submitting Yield", `Funding encrypted prize reserve for ${poolName}...`);
      const hash = await walletClient.writeContract({
        ...clubContract,
        functionName: "accrueYieldPublic",
        args: [BigInt(clubId), parsedAmount]
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
        const data = await res.json();
        await rememberJoinedClub(data.club, "created");
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
        await rememberJoinedClub(data.club, "invite");
        await refreshPools();
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
            nextDrawStatus={dashboardNextDrawStatus}
            pools={displayPools}
            pendingPrize={getDisplayBalance(pendingPrize)}
            pendingPrizeDraw={pendingPrizeDraw}
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
            onClaimAll={handleClaimAll}
            onDecrypt={handleDecrypt}
            onFaucet={handleFaucet}
            onHideBalance={handleHideBalance}
            onUnwrap={handleUnwrap}
            onWithdraw={handleWithdraw}
            pendingPrize={getDisplayBalance(pendingPrize)}
            pendingPrizeDraw={pendingPrizeDraw}
            pendingPrizes={displayPendingPrizes}
            clubDeposit={getDisplayBalance(clubDeposit)}
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
