import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dataDir, dataFile, seedFile, supabase } from "../config/constants.js";

let writeQueue = Promise.resolve();
let memoryStore = null;
let supabaseDisabled = false;

function isRecoverableSupabaseSchemaError(error) {
  const message = String(error?.message || "");
  return (
    message.includes("schema cache") ||
    message.includes("column") ||
    message.includes("relationship") ||
    message.includes("foreign key constraint")
  );
}

export async function ensureStore() {
  await mkdir(dataDir, { recursive: true });

  if (memoryStore || existsSync(dataFile)) {
    return;
  }

  const seed = JSON.parse(await readFile(seedFile, "utf8"));

  try {
    await writeFile(dataFile, JSON.stringify(seed, null, 2));
  } catch (error) {
    memoryStore = seed;
    console.warn(`[store] using in-memory storage: ${error.code || error.message}`);
  }
}

export async function readStore() {
  if (supabase && !supabaseDisabled) {
    try {
      return await readSupabaseStore();
    } catch (error) {
      console.warn(`[store] Supabase read failed; using fallback storage: ${error.message}`);
      if (isRecoverableSupabaseSchemaError(error)) supabaseDisabled = true;
    }
  }

  await ensureStore();

  if (memoryStore) {
    return structuredClone(memoryStore);
  }

  try {
    return JSON.parse(await readFile(dataFile, "utf8"));
  } catch (error) {
    const seed = JSON.parse(await readFile(seedFile, "utf8"));
    memoryStore = seed;
    console.warn(`[store] read failed; using in-memory storage: ${error.code || error.message}`);
    return structuredClone(memoryStore);
  }
}

export async function writeStore(nextStore) {
  if (supabase && !supabaseDisabled) {
    try {
      await writeSupabaseStore(nextStore);
      return;
    } catch (error) {
      console.warn(`[store] Supabase write failed; using fallback storage: ${error.message}`);
      if (isRecoverableSupabaseSchemaError(error)) {
        supabaseDisabled = true;
        console.warn("[store] Supabase disabled for this process; run backend/supabase/schema.sql to update the database schema.");
      }
    }
  }

  if (memoryStore) {
    memoryStore = structuredClone(nextStore);
    return;
  }

  writeQueue = writeQueue.then(async () => {
    try {
      await writeFile(dataFile, JSON.stringify(nextStore, null, 2));
    } catch (error) {
      memoryStore = structuredClone(nextStore);
      console.warn(`[store] write failed; switched to in-memory storage: ${error.code || error.message}`);
    }
  });

  return writeQueue;
}

export async function updateStore(mutator) {
  const store = await readStore();
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

export async function readSupabaseStore() {
  const [{ data: clubs, error: clubsError }, { data: draws, error: drawsError }, { data: claims, error: claimsError }] =
    await Promise.all([
      supabase.from("veil_clubs").select("*").order("created_at", { ascending: true }),
      supabase.from("veil_draws").select("*").order("created_at", { ascending: true }),
      supabase.from("veil_faucet_claims").select("*")
    ]);

  if (clubsError) throw clubsError;
  if (drawsError) throw drawsError;
  if (claimsError) throw claimsError;

  if (!clubs.length) {
    const seed = JSON.parse(await readFile(seedFile, "utf8"));
    await writeSupabaseStore(seed);
    return seed;
  }

  return {
    clubs: clubs.map(clubFromRow),
    draws: draws.map(drawFromRow),
    faucetClaims: Object.fromEntries(claims.map((claim) => [claim.address, Number(claim.last_claim_at)]))
  };
}

export async function writeSupabaseStore(store) {
  const clubRows = store.clubs.map(clubToRow);
  const drawRows = store.draws.map(drawToRow);
  const claimRows = Object.entries(store.faucetClaims || {}).map(([address, lastClaimAt]) => ({
    address,
    last_claim_at: Number(lastClaimAt),
    updated_at: new Date().toISOString()
  }));

  const { error: clubsError } = await supabase.from("veil_clubs").upsert(clubRows, { onConflict: "id" });
  if (clubsError) throw clubsError;

  if (drawRows.length) {
    const { error: drawsError } = await supabase.from("veil_draws").upsert(drawRows, { onConflict: "id" });
    if (drawsError) throw drawsError;
  }

  if (claimRows.length) {
    const { error: claimsError } = await supabase.from("veil_faucet_claims").upsert(claimRows, { onConflict: "address" });
    if (claimsError) throw claimsError;
  }
}

export function clubFromRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    scope: row.scope,
    admin: row.admin,
    keeper: row.keeper,
    inviteCode: row.invite_code,
    minDeposit: row.min_deposit,
    drawIntervalMs: Number(row.draw_interval_ms),
    nextDrawAt: row.next_draw_at,
    anonymousMembers: row.anonymous_members,
    memberCount: row.member_count,
    encryptedTvlHandle: row.encrypted_tvl_handle,
    encryptedPrizeHandle: row.encrypted_prize_handle,
    contractClubId: row.contract_club_id,
    createTxHash: row.create_tx_hash,
    status: row.status,
    createdAt: row.created_at
  };
}

export function clubToRow(club) {
  return {
    id: club.id,
    name: club.name,
    description: club.description || "",
    scope: club.scope,
    admin: club.admin,
    keeper: club.keeper,
    invite_code: club.inviteCode || null,
    min_deposit: club.minDeposit || "1",
    draw_interval_ms: Number(club.drawIntervalMs || 86400000),
    next_draw_at: club.nextDrawAt,
    anonymous_members: Boolean(club.anonymousMembers),
    member_count: Number(club.memberCount || 0),
    encrypted_tvl_handle: club.encryptedTvlHandle || "encrypted",
    encrypted_prize_handle: club.encryptedPrizeHandle || "encrypted",
    contract_club_id: club.contractClubId || null,
    create_tx_hash: club.createTxHash || null,
    status: club.status || "ACTIVE",
    created_at: club.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

export function drawFromRow(row) {
  return {
    id: row.id,
    drawNumber: row.draw_number,
    clubId: row.club_id,
    clubName: row.club_name,
    winner: row.winner,
    prizeHandle: row.prize_handle,
    status: row.status,
    txHash: row.tx_hash,
    source: row.source,
    createdAt: row.created_at
  };
}

export function drawToRow(draw) {
  return {
    id: draw.id,
    draw_number: Number(draw.drawNumber),
    club_id: draw.clubId,
    club_name: draw.clubName,
    winner: draw.winner,
    prize_handle: draw.prizeHandle,
    status: draw.status,
    tx_hash: draw.txHash,
    source: draw.source || "manual",
    created_at: draw.createdAt || new Date().toISOString()
  };
}
