import { createPublicClient, createWalletClient, decodeEventLog, fallback, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { createInstance, SepoliaConfig } from "@zama-fhe/relayer-sdk/node";
import {
  KEEPER_ENABLED,
  KEEPER_INTERVAL_MS,
  KEEPER_PRIVATE_KEY,
  PUBLIC_DECRYPT_TIMEOUT_MS,
  PUBLIC_RPC_URLS,
  RPC_URL,
  SEPOLIA_CHAIN,
  VEIL_CLUBS_ADDRESS,
  VEIL_CLUBS_KEEPER_ABI,
  ZAMA_FHEVM_API_KEY,
  ZERO_BYTES32
} from "../config/constants.js";
import { readStore, updateStore } from "./storeService.js";

let keeperRunning = false;
let fheInstancePromise = null;
let fheRpcIndex = 0;

function sameAddress(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
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
    const club = store.clubs.find((item) => String(item.contractClubId ?? (item.id === "global" ? "0" : "")) === String(clubId));
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

      if (!clubView.exists) continue;
      if (!sameAddress(clients.account.address, clubView.keeper) && !sameAddress(clients.account.address, clubView.admin)) continue;
      if (Number(clubView.memberCount || 0) === 0) continue;
      if (Number(clubView.nextDrawAt || 0) > now) continue;

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

      const { totalPrincipal, decryptionProof } = await publicDecryptTotalPrincipal(totalPrincipalHandle);
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

      await syncKeeperDraw({ clubId, clubName, txHash, receipt, publicClient: clients.publicClient });
      console.log(`[keeper] triggerWeightedDraw(${clubId}) confirmed: ${txHash}`);
    }
  } catch (error) {
    console.warn(`[keeper] tick failed: ${error.shortMessage || error.message}`);
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
