import { createPublicClient, createWalletClient, decodeEventLog, fallback, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  KEEPER_ENABLED,
  KEEPER_INTERVAL_MS,
  KEEPER_PRIVATE_KEY,
  PUBLIC_RPC_URLS,
  RPC_URL,
  SEPOLIA_CHAIN,
  VEIL_CLUBS_ADDRESS,
  VEIL_CLUBS_KEEPER_ABI,
  ZERO_BYTES32
} from "../config/constants.js";
import { readStore, updateStore } from "./storeService.js";

let keeperRunning = false;

function sameAddress(left, right) {
  return String(left || "").toLowerCase() === String(right || "").toLowerCase();
}

export function getKeeperClients() {
  if (!VEIL_CLUBS_ADDRESS || !KEEPER_PRIVATE_KEY) {
    return null;
  }

  const account = privateKeyToAccount(KEEPER_PRIVATE_KEY);
  const rpcTransports = PUBLIC_RPC_URLS.map((url) => http(url));
  if (RPC_URL && !PUBLIC_RPC_URLS.includes(RPC_URL)) {
    rpcTransports.push(http(RPC_URL));
  }
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
  let drawLog = null;
  for (const log of receipt.logs || []) {
    try {
      const decoded = decodeEventLog({ abi: VEIL_CLUBS_KEEPER_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === "DrawExecuted") {
        drawLog = decoded;
        break;
      }
    } catch {
      // Ignore logs from other contracts touched by transaction.
    }
  }

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
        functionName: "triggerDraw",
        args: [BigInt(clubId), ZERO_BYTES32]
      });

      const txHash = await clients.walletClient.writeContract({
        address: VEIL_CLUBS_ADDRESS,
        abi: VEIL_CLUBS_KEEPER_ABI,
        functionName: "triggerDraw",
        args: [BigInt(clubId), ZERO_BYTES32]
      });
      console.log(`[keeper] triggerDraw(${clubId}) submitted: ${txHash}`);

      const receipt = await clients.publicClient.waitForTransactionReceipt({ hash: txHash });
      if (receipt.status !== "success") {
        console.warn(`[keeper] triggerDraw(${clubId}) reverted: ${txHash}`);
        continue;
      }

      await syncKeeperDraw({ clubId, clubName, txHash, receipt, publicClient: clients.publicClient });
      console.log(`[keeper] triggerDraw(${clubId}) confirmed: ${txHash}`);
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
