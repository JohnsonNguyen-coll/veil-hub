import { createPublicClient, createWalletClient, decodeEventLog, fallback, formatUnits, http, parseUnits, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import {
  KEEPER_AUTO_FUND_YIELD,
  KEEPER_ENABLED,
  KEEPER_INTERVAL_MS,
  KEEPER_OPERATOR_APPROVAL_SECONDS,
  KEEPER_PRIVATE_KEY,
  KEEPER_RETRY_BACKOFF_MS,
  KEEPER_YIELD_AMOUNT,
  KEEPER_YIELD_MIN_MEMBERS,
  MAX_EUINT64,
  PUBLIC_DECRYPT_TIMEOUT_MS,
  PUBLIC_RPC_URLS,
  RPC_URL,
  SEPOLIA_CHAIN,
  TOKEN_DECIMALS,
  VEIL_CLUBS_ADDRESS,
  VEIL_CLUBS_KEEPER_ABI,
  VEIL_TOKEN_ADDRESS,
  VEIL_TOKEN_KEEPER_ABI,
  ZAMA_FHEVM_API_KEY,
  ZERO_BYTES32
} from "../config/constants.js";
import { readStore, updateStore } from "./storeService.js";

let keeperRunning = false;
let fheInstancePromise = null;
let fheRpcIndex = 0;
const localDrawCooldownUntil = new Map();

function backoffSeconds() {
  return Math.max(1, Math.ceil(KEEPER_RETRY_BACKOFF_MS / 1000));
}

function setKeeperBackoff(clubId, now) {
  localDrawCooldownUntil.set(String(clubId), now + backoffSeconds());
}

function sameAddress(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

function asHex(value) {
  if (typeof value === "string") return value.startsWith("0x") ? value : `0x${value}`;
  return toHex(value);
}

function orderedRpcUrls() {
  return [...PUBLIC_RPC_URLS, ...(RPC_URL && !PUBLIC_RPC_URLS.includes(RPC_URL) ? [RPC_URL] : [])];
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

function errorMessage(error) {
  const details = [
    error?.shortMessage,
    error?.cause?.shortMessage,
    error?.details,
    error?.cause?.details,
    error?.message,
    error?.cause?.message
  ]
    .filter(Boolean)
    .join(" | ");
  const signature = error?.data?.errorName || error?.data?.signature || error?.cause?.data?.signature;
  return signature ? `${details} | selector=${signature}` : details;
}

async function getFheInstance() {
  if (fheInstancePromise) return fheInstancePromise;

  const rpcUrls = orderedRpcUrls();
  let lastError;
  for (let index = fheRpcIndex; index < rpcUrls.length; index += 1) {
    try {
      fheInstancePromise = createInstance({
        ...SepoliaConfig,
        network: rpcUrls[index],
        ...(ZAMA_FHEVM_API_KEY ? { auth: { __type: "ApiKeyHeader", value: ZAMA_FHEVM_API_KEY } } : {})
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

async function publicDecryptTotalPrincipal(totalPrincipalHandle) {
  try {
    const instance = await getFheInstance();
    const result = await instance.publicDecrypt([totalPrincipalHandle], {
      timeout: PUBLIC_DECRYPT_TIMEOUT_MS,
      ...(ZAMA_FHEVM_API_KEY ? { auth: { __type: "ApiKeyHeader", value: ZAMA_FHEVM_API_KEY } } : {})
    });
    const clearValue = result.clearValues[totalPrincipalHandle] || result.clearValues[totalPrincipalHandle.toLowerCase()];
    return {
      totalPrincipal: BigInt(clearValue || 0),
      decryptionProof: result.decryptionProof
    };
  } catch (error) {
    const rpcUrls = orderedRpcUrls();
    if (isRetryableRpcError(error) && fheRpcIndex + 1 < rpcUrls.length) {
      fheRpcIndex += 1;
      fheInstancePromise = null;
      return publicDecryptTotalPrincipal(totalPrincipalHandle);
    }
    throw error;
  }
}

async function userDecryptUint64({ handle, contractAddress, clients }) {
  const instance = await getFheInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const contractAddresses = [contractAddress];
  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
  const signature = await clients.walletClient.signTypedData({
    account: clients.account,
    domain: eip712.domain,
    types: {
      UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification
    },
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message
  });

  const result = await instance.userDecrypt(
    [{ handle, contractAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature.replace(/^0x/, ""),
    contractAddresses,
    clients.account.address,
    startTimestamp,
    durationDays
  );
  return BigInt(result[handle] ?? result[handle.toLowerCase()] ?? 0);
}

async function readKeeperTokenBalance(clients) {
  const handle = await clients.publicClient.readContract({
    address: VEIL_TOKEN_ADDRESS,
    abi: VEIL_TOKEN_KEEPER_ABI,
    functionName: "confidentialBalanceOf",
    args: [clients.account.address]
  });
  if (!handle || handle === ZERO_BYTES32) return 0n;
  return userDecryptUint64({ handle, contractAddress: VEIL_TOKEN_ADDRESS, clients });
}

async function ensureKeeperTokenOperator(clients) {
  const isOperator = await clients.publicClient.readContract({
    address: VEIL_TOKEN_ADDRESS,
    abi: VEIL_TOKEN_KEEPER_ABI,
    functionName: "isOperator",
    args: [clients.account.address, VEIL_CLUBS_ADDRESS]
  });
  if (isOperator) return;

  const until = Math.floor(Date.now() / 1000) + KEEPER_OPERATOR_APPROVAL_SECONDS;
  await clients.publicClient.simulateContract({
    account: clients.account,
    address: VEIL_TOKEN_ADDRESS,
    abi: VEIL_TOKEN_KEEPER_ABI,
    functionName: "setOperator",
    args: [VEIL_CLUBS_ADDRESS, until]
  });
  const hash = await clients.walletClient.writeContract({
    address: VEIL_TOKEN_ADDRESS,
    abi: VEIL_TOKEN_KEEPER_ABI,
    functionName: "setOperator",
    args: [VEIL_CLUBS_ADDRESS, until]
  });
  console.log(`[keeper] setOperator(${VEIL_CLUBS_ADDRESS}) submitted: ${hash}`);
  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`setOperator reverted: ${hash}`);
}

async function encryptYieldAmount({ amount, clients }) {
  const instance = await getFheInstance();
  const encryptedInput = await instance
    .createEncryptedInput(VEIL_CLUBS_ADDRESS, clients.account.address)
    .add64(amount)
    .encrypt();

  return {
    encryptedAmount: asHex(encryptedInput.handles[0]),
    inputProof: asHex(encryptedInput.inputProof)
  };
}

async function fundPrizeReserve({ clients, clubId, clubName }) {
  if (!KEEPER_AUTO_FUND_YIELD) return true;
  if (!VEIL_TOKEN_ADDRESS) {
    console.warn("[keeper] auto-fund skipped: set VEIL_TOKEN_ADDRESS to fund encrypted prize reserves.");
    return false;
  }

  const amount = parseUnits(KEEPER_YIELD_AMOUNT, TOKEN_DECIMALS);
  if (amount <= 0n) {
    console.warn("[keeper] auto-fund skipped: KEEPER_YIELD_AMOUNT must be greater than zero.");
    return false;
  }
  if (amount > MAX_EUINT64) {
    console.warn("[keeper] auto-fund skipped: KEEPER_YIELD_AMOUNT exceeds euint64 capacity.");
    return false;
  }

  const balance = await readKeeperTokenBalance(clients);
  if (balance < amount) {
    console.warn(
      `[keeper] auto-fund skipped for ${clubName}: keeper has ${formatUnits(balance, TOKEN_DECIMALS)} cUSDC, needs ${KEEPER_YIELD_AMOUNT} cUSDC.`
    );
    return false;
  }

  await ensureKeeperTokenOperator(clients);

  const { encryptedAmount, inputProof } = await encryptYieldAmount({ amount, clients });

  await clients.publicClient.simulateContract({
    account: clients.account,
    address: VEIL_CLUBS_ADDRESS,
    abi: VEIL_CLUBS_KEEPER_ABI,
    functionName: "accrueYield",
    args: [BigInt(clubId), encryptedAmount, inputProof]
  });

  const hash = await clients.walletClient.writeContract({
    address: VEIL_CLUBS_ADDRESS,
    abi: VEIL_CLUBS_KEEPER_ABI,
    functionName: "accrueYield",
    args: [BigInt(clubId), encryptedAmount, inputProof]
  });
  console.log(`[keeper] accrueYield(${clubId}, ${KEEPER_YIELD_AMOUNT} cUSDC) submitted: ${hash}`);

  const receipt = await clients.publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") {
    console.warn(`[keeper] accrueYield(${clubId}) reverted: ${hash}`);
    return false;
  }
  console.log(`[keeper] funded ${KEEPER_YIELD_AMOUNT} cUSDC prize reserve for ${clubName}: ${hash}`);
  return true;
}

function findDecodedEvent(receipt, eventName) {
  for (const log of receipt.logs || []) {
    try {
      const decoded = decodeEventLog({ abi: VEIL_CLUBS_KEEPER_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === eventName) return decoded;
    } catch {
      // Ignore logs from other contracts touched by transaction.
    }
  }
  return null;
}

export function getKeeperClients() {
  if (!VEIL_CLUBS_ADDRESS || !KEEPER_PRIVATE_KEY) {
    return null;
  }

  const account = privateKeyToAccount(KEEPER_PRIVATE_KEY);
  const rpcTransports = orderedRpcUrls().map((url) => http(url));
  const transport = fallback(rpcTransports, { rank: false });

  return {
    account,
    publicClient: createPublicClient({ chain: SEPOLIA_CHAIN, transport }),
    walletClient: createWalletClient({ account, chain: SEPOLIA_CHAIN, transport })
  };
}

export function trackedContractClubIds(store) {
  const ids = new Set(["0"]);
  for (const club of store.clubs || []) {
    if (club.contractClubId != null) ids.add(String(club.contractClubId));
  }
  return [...ids];
}

export async function syncKeeperDraw({ clubId, clubName, txHash, receipt, publicClient }) {
  const drawLog = findDecodedEvent(receipt, "DrawExecuted");

  const drawId = drawLog?.args?.drawId?.toString();
  const prizeHandle = drawLog?.args?.prizeHandle || "encrypted";
  const memberCount = Number(drawLog?.args?.memberCount || 0);
  const clubView = await publicClient.readContract({
    address: VEIL_CLUBS_ADDRESS,
    abi: VEIL_CLUBS_KEEPER_ABI,
    functionName: "clubView",
    args: [BigInt(clubId)]
  });

  await updateStore((store) => {
    let club = store.clubs.find((item) => String(item.contractClubId ?? (item.id === "global" ? "0" : "")) === String(clubId));
    if (!club && String(clubId) === "0") {
      club = {
        id: "global",
        contractClubId: "0",
        name: "Global Pool",
        description: "Public confidential no-loss prize pool.",
        scope: "PUBLIC",
        admin: clubView.admin || "protocol",
        keeper: clubView.keeper || "protocol",
        inviteCode: null,
        minDeposit: String(clubView.minDeposit || 1),
        drawIntervalMs: Number(clubView.drawInterval || 86400) * 1000,
        nextDrawAt: new Date(Number(clubView.nextDrawAt || 0) * 1000).toISOString(),
        anonymousMembers: Boolean(clubView.anonymousMembers),
        memberCount: Number(clubView.memberCount || memberCount || 0),
        encryptedTvlHandle: "encrypted",
        encryptedPrizeHandle: "encrypted",
        status: "ACTIVE",
        createdAt: new Date().toISOString()
      };
      store.clubs.push(club);
    }
    if (club) {
      club.memberCount = Number(clubView.memberCount || memberCount || club.memberCount || 0);
      club.nextDrawAt = new Date(Number(clubView.nextDrawAt || 0) * 1000).toISOString();
      club.encryptedPrizeHandle = "encrypted";
      club.status = "ACTIVE";
    }

    if (drawId && !store.draws.some((draw) => String(draw.clubId) === String(clubId) && String(draw.drawNumber) === drawId)) {
      store.draws.push({
        id: `draw-${clubId}-${drawId}`,
        drawNumber: Number(drawId),
        clubId: String(clubId),
        clubName,
        winner: "winner-decrypts",
        prizeHandle,
        status: "EXECUTED_ONCHAIN",
        txHash,
        source: "keeper",
        createdAt: new Date().toISOString()
      });
    }
  });
}

export async function runKeeperTick(clients) {
  if (keeperRunning) return;
  keeperRunning = true;

  try {
    const store = await readStore();
    const ids = trackedContractClubIds(store);
    const now = Math.floor(Date.now() / 1000);

    for (const clubId of ids) {
      const club = store.clubs.find((item) => String(item.contractClubId ?? (item.id === "global" ? "0" : "")) === String(clubId));
      const clubName = club?.name || (clubId === "0" ? "Global Pool" : `Club ${clubId}`);
      const clubView = await clients.publicClient.readContract({
        address: VEIL_CLUBS_ADDRESS,
        abi: VEIL_CLUBS_KEEPER_ABI,
        functionName: "clubView",
        args: [BigInt(clubId)]
      });

      const memberCount = Number(clubView.memberCount || 0);
      const localCooldown = localDrawCooldownUntil.get(String(clubId)) || 0;
      if (!clubView.exists) continue;
      if (!sameAddress(clients.account.address, clubView.keeper) && !sameAddress(clients.account.address, clubView.admin)) continue;
      if (memberCount === 0) continue;
      if (localCooldown > now) continue;
      if (Number(clubView.nextDrawAt || 0) > now) continue;
      if (KEEPER_AUTO_FUND_YIELD && memberCount < KEEPER_YIELD_MIN_MEMBERS) continue;

      let funded = false;
      try {
        funded = await fundPrizeReserve({ clients, clubId, clubName });
      } catch (error) {
        setKeeperBackoff(clubId, now);
        console.warn(
          `[keeper] auto-fund failed for ${clubName}; backing off ${backoffSeconds()}s: ${errorMessage(error) || "unknown error"}`
        );
        continue;
      }
      if (!funded) {
        setKeeperBackoff(clubId, now);
        continue;
      }

      await clients.publicClient.simulateContract({
        account: clients.account,
        address: VEIL_CLUBS_ADDRESS,
        abi: VEIL_CLUBS_KEEPER_ABI,
        functionName: "prepareWeightedDraw",
        args: [BigInt(clubId)]
      });

      const prepareHash = await clients.walletClient.writeContract({
        address: VEIL_CLUBS_ADDRESS,
        abi: VEIL_CLUBS_KEEPER_ABI,
        functionName: "prepareWeightedDraw",
        args: [BigInt(clubId)]
      });
      console.log(`[keeper] prepareWeightedDraw(${clubId}) submitted: ${prepareHash}`);

      const prepareReceipt = await clients.publicClient.waitForTransactionReceipt({ hash: prepareHash });
      if (prepareReceipt.status !== "success") {
        console.warn(`[keeper] prepareWeightedDraw(${clubId}) reverted: ${prepareHash}`);
        continue;
      }

      const totalLog = findDecodedEvent(prepareReceipt, "DrawTotalReadyForDecryption");
      const totalPrincipalHandle = totalLog?.args?.totalPrincipalHandle;
      if (!totalPrincipalHandle) {
        console.warn(`[keeper] prepareWeightedDraw(${clubId}) confirmed but total handle was not emitted: ${prepareHash}`);
        continue;
      }

      let totalPrincipal;
      let decryptionProof;
      try {
        const result = await publicDecryptTotalPrincipal(totalPrincipalHandle);
        totalPrincipal = result.totalPrincipal;
        decryptionProof = result.decryptionProof;
      } catch (error) {
        setKeeperBackoff(clubId, now);
        console.warn(
          `[keeper] public decrypt failed for ${clubName}; backing off ${backoffSeconds()}s: ${
            errorMessage(error) || "unknown error"
          }`
        );
        continue;
      }
      if (totalPrincipal === 0n) {
        console.warn(`[keeper] weighted draw skipped for ${clubId}: decrypted total principal is zero`);
        continue;
      }

      await clients.publicClient.simulateContract({
        account: clients.account,
        address: VEIL_CLUBS_ADDRESS,
        abi: VEIL_CLUBS_KEEPER_ABI,
        functionName: "triggerWeightedDraw",
        args: [BigInt(clubId), ZERO_BYTES32, totalPrincipal, decryptionProof]
      });

      const txHash = await clients.walletClient.writeContract({
        address: VEIL_CLUBS_ADDRESS,
        abi: VEIL_CLUBS_KEEPER_ABI,
        functionName: "triggerWeightedDraw",
        args: [BigInt(clubId), ZERO_BYTES32, totalPrincipal, decryptionProof]
      });
      console.log(`[keeper] triggerWeightedDraw(${clubId}) submitted: ${txHash}`);

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        console.warn(`[keeper] triggerWeightedDraw(${clubId}) reverted: ${txHash}`);
        continue;
      }

      localDrawCooldownUntil.set(String(clubId), now + Number(clubView.drawInterval || 0));
      try {
        await syncKeeperDraw({ clubId, clubName, txHash, receipt, publicClient: clients.publicClient });
      } catch (error) {
        console.warn(`[keeper] draw synced onchain but local store sync failed: ${errorMessage(error) || "unknown error"}`);
      }
      console.log(`[keeper] triggerWeightedDraw(${clubId}) confirmed: ${txHash}`);
    }
  } catch (error) {
    console.warn(`[keeper] tick failed: ${errorMessage(error) || "unknown error"}`);
  } finally {
    keeperRunning = false;
  }
}

export async function runKeeper() {
  if (!KEEPER_ENABLED) return;

  let clients;
  try {
    clients = getKeeperClients();
  } catch (error) {
    console.warn(`[keeper] disabled: invalid keeper configuration (${error.shortMessage || error.message}).`);
    return;
  }
  if (!clients) {
    console.warn("[keeper] disabled: set VEIL_CLUBS_ADDRESS and KEEPER_PRIVATE_KEY to enable onchain draws.");
    return;
  }

  console.log(`[keeper] enabled for ${clients.account.address}; polling every ${KEEPER_INTERVAL_MS}ms`);
  await runKeeperTick(clients);
  setInterval(() => {
    runKeeperTick(clients);
  }, KEEPER_INTERVAL_MS);
}
