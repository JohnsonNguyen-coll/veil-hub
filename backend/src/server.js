import "dotenv/config";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { getAddress, isAddress } from "viem";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");
const dataFile = path.join(dataDir, "veil-clubs.json");
const seedFile = path.join(dataDir, "veil-clubs.example.json");

const PORT = Number(process.env.PORT || 8787);
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5174";
const KEEPER_ENABLED = (process.env.KEEPER_ENABLED || "true") === "true";
const KEEPER_INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS || 30000);
const FAUCET_COOLDOWN_MS = Number(process.env.FAUCET_COOLDOWN_MS || 86400000);
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

let writeQueue = Promise.resolve();
let memoryStore = null;

const route = (method, pattern, handler) => ({ method, pattern, handler });

const routes = [
  route("GET", /^\/health$/, health),
  route("GET", /^\/api\/config$/, config),
  route("GET", /^\/api\/dashboard$/, dashboard),
  route("GET", /^\/api\/clubs$/, listClubs),
  route("POST", /^\/api\/clubs$/, createClub),
  route("GET", /^\/api\/clubs\/([^/]+)$/, getClub),
  route("POST", /^\/api\/clubs\/([^/]+)\/invites$/, createInvite),
  route("POST", /^\/api\/join$/, joinClub),
  route("GET", /^\/api\/draws$/, listDraws),
  route("POST", /^\/api\/draws\/trigger$/, triggerDraw),
  route("POST", /^\/api\/faucet\/request$/, requestFaucet)
];

async function ensureStore() {
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

async function readStore() {
  if (supabase) {
    try {
      return await readSupabaseStore();
    } catch (error) {
      console.warn(`[store] Supabase read failed; using fallback storage: ${error.message}`);
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

async function writeStore(nextStore) {
  if (supabase) {
    try {
      await writeSupabaseStore(nextStore);
      return;
    } catch (error) {
      console.warn(`[store] Supabase write failed; using fallback storage: ${error.message}`);
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

async function updateStore(mutator) {
  const store = await readStore();
  const result = await mutator(store);
  await writeStore(store);
  return result;
}

async function readSupabaseStore() {
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

async function writeSupabaseStore(store) {
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

function clubFromRow(row) {
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
    status: row.status,
    createdAt: row.created_at
  };
}

function clubToRow(club) {
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
    encrypted_tvl_handle: club.encryptedTvlHandle || "ciphertext:empty-total",
    encrypted_prize_handle: club.encryptedPrizeHandle || "ciphertext:empty-prize",
    status: club.status || "ACTIVE",
    created_at: club.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function drawFromRow(row) {
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

function drawToRow(draw) {
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

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
    "access-control-allow-origin": FRONTEND_ORIGIN,
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(payload);
}

function notFound(res) {
  json(res, 404, { error: "NOT_FOUND" });
}

function badRequest(res, message, details = {}) {
  json(res, 400, { error: "BAD_REQUEST", message, ...details });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    const error = new Error("Invalid JSON body");
    error.status = 400;
    throw error;
  }
}

function publicClub(club) {
  const base = {
    id: club.id,
    name: club.name,
    description: club.description,
    scope: club.scope,
    admin: club.admin,
    keeper: club.keeper,
    minDeposit: club.minDeposit,
    drawIntervalMs: club.drawIntervalMs,
    nextDrawAt: club.nextDrawAt,
    anonymousMembers: club.anonymousMembers,
    memberCount: club.memberCount,
    encryptedTvlHandle: club.encryptedTvlHandle,
    encryptedPrizeHandle: club.encryptedPrizeHandle,
    status: club.status,
    createdAt: club.createdAt
  };

  if (club.scope === "PRIVATE") {
    base.inviteCode = club.inviteCode;
  }

  return base;
}

function health(_req, res) {
  json(res, 200, {
    ok: true,
    service: "veil-clubs-backend",
    privacy: "public metadata only"
  });
}

function config(_req, res) {
  json(res, 200, {
    chainId: Number(process.env.CHAIN_ID || 11155111),
    chainName: process.env.CHAIN_NAME || "sepolia",
    contracts: {
      veilClubs: process.env.VEIL_CLUBS_ADDRESS || null,
      veilToken: process.env.VEIL_TOKEN_ADDRESS || null
    },
    features: {
      keeper: KEEPER_ENABLED,
      faucet: true,
      indexer: true,
      supabase: Boolean(supabase)
    },
    storage: supabase ? "supabase" : "fallback"
  });
}

async function dashboard(_req, res) {
  const store = await readStore();
  const activeClubs = store.clubs.length;
  const nextDraw = store.clubs
    .map((club) => new Date(club.nextDrawAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];

  json(res, 200, {
    encryptedPrincipal: "ciphertext:user-decrypt",
    claimableWinnings: "ciphertext:user-decrypt",
    activePools: activeClubs,
    nextDrawAt: nextDraw ? new Date(nextDraw).toISOString() : null,
    recentDraws: store.draws.slice(-5).reverse(),
    pools: store.clubs.map(publicClub)
  });
}

async function listClubs(_req, res) {
  const store = await readStore();
  json(res, 200, { clubs: store.clubs.map(publicClub) });
}

async function getClub(_req, res, [clubId]) {
  const store = await readStore();
  const club = store.clubs.find((item) => item.id === clubId);
  if (!club) return notFound(res);
  return json(res, 200, { club: publicClub(club) });
}

async function createClub(req, res) {
  const body = await readBody(req);
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();

  if (!name) return badRequest(res, "Club name is required");

  const club = await updateStore((store) => {
    const id = `club-${String(store.clubs.length).padStart(2, "0")}-${randomBytes(2).toString("hex")}`;
    const createdAt = new Date().toISOString();
    const drawIntervalMs = Number(body.drawIntervalMs || 604800000);
    const nextDrawAt = new Date(Date.now() + drawIntervalMs).toISOString();

    const nextClub = {
      id,
      name,
      description,
      scope: "PRIVATE",
      admin: body.admin || "pending-wallet",
      keeper: body.keeper || body.admin || "pending-wallet",
      inviteCode: createInviteCode(),
      minDeposit: String(body.minDeposit || "1"),
      drawIntervalMs,
      nextDrawAt,
      anonymousMembers: Boolean(body.anonymousMembers ?? true),
      memberCount: 1,
      encryptedTvlHandle: "ciphertext:empty-total",
      encryptedPrizeHandle: "ciphertext:empty-prize",
      status: "CLUB_CREATED",
      createdAt
    };

    store.clubs.push(nextClub);
    return publicClub(nextClub);
  });

  json(res, 201, { club });
}

async function createInvite(_req, res, [clubId]) {
  const invite = await updateStore((store) => {
    const club = store.clubs.find((item) => item.id === clubId);
    if (!club) return null;
    club.inviteCode = createInviteCode();
    return { clubId: club.id, inviteCode: club.inviteCode };
  });

  if (!invite) return notFound(res);
  return json(res, 201, invite);
}

async function joinClub(req, res) {
  const body = await readBody(req);
  const inviteCode = String(body.inviteCode || "").trim().toUpperCase();

  if (!inviteCode) return badRequest(res, "Invite code is required");

  const club = await updateStore((store) => {
    const match = store.clubs.find((item) => item.inviteCode === inviteCode);
    if (!match) return null;
    match.memberCount += 1;
    match.status = "MEMBER_JOINED";
    return publicClub(match);
  });

  if (!club) return notFound(res);
  return json(res, 200, { club });
}

async function listDraws(_req, res) {
  const store = await readStore();
  json(res, 200, { draws: store.draws.slice().reverse() });
}

async function triggerDraw(req, res) {
  const body = await readBody(req);
  const clubId = String(body.clubId || "global");

  const draw = await updateStore((store) => {
    const club = store.clubs.find((item) => item.id === clubId);
    if (!club) return null;
    return createDrawForClub(store, club, body.caller || "manual");
  });

  if (!draw) return notFound(res);
  return json(res, 201, { draw });
}

async function requestFaucet(req, res) {
  const body = await readBody(req);
  const address = normalizeAddress(body.address);

  if (!address) return badRequest(res, "Valid wallet address is required");

  const result = await updateStore((store) => {
    const now = Date.now();
    const lastClaim = store.faucetClaims[address] || 0;
    const nextClaimAt = lastClaim + FAUCET_COOLDOWN_MS;

    if (lastClaim && now < nextClaimAt) {
      return {
        allowed: false,
        nextClaimAt: new Date(nextClaimAt).toISOString()
      };
    }

    store.faucetClaims[address] = now;
    return {
      allowed: true,
      txHash: `0x${randomBytes(32).toString("hex")}`,
      amount: "100",
      token: "vcUSDC"
    };
  });

  json(res, result.allowed ? 201 : 429, result);
}

function createDrawForClub(store, club, source) {
  const drawNumber = store.draws.length + 1;
  const createdAt = new Date().toISOString();
  const draw = {
    id: `draw-${String(drawNumber).padStart(4, "0")}`,
    drawNumber,
    clubId: club.id,
    clubName: club.name,
    winner: club.anonymousMembers ? "Hidden winner" : "0xPENDING...WIN",
    prizeHandle: club.encryptedPrizeHandle || `0xPRIZE...${randomBytes(2).toString("hex").toUpperCase()}`,
    status: "TRIGGERED",
    txHash: `0x${randomBytes(32).toString("hex")}`,
    source,
    createdAt
  };

  store.draws.push(draw);
  club.status = "DRAW_TRIGGERED";
  club.nextDrawAt = new Date(Date.now() + Number(club.drawIntervalMs || 86400000)).toISOString();
  return draw;
}

function createInviteCode() {
  return `VC-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function normalizeAddress(value) {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

async function runKeeper() {
  if (!KEEPER_ENABLED) return;

  setInterval(async () => {
    try {
      const triggered = await updateStore((store) => {
        const now = Date.now();
        const dueClub = store.clubs.find((club) => new Date(club.nextDrawAt).getTime() <= now);
        if (!dueClub) return null;
        return createDrawForClub(store, dueClub, "keeper");
      });

      if (triggered) {
        console.log(`[keeper] triggered ${triggered.id} for ${triggered.clubId}`);
      }
    } catch (error) {
      console.error("[keeper] failed", error);
    }
  }, KEEPER_INTERVAL_MS);
}

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    return json(res, 204, {});
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const match = routes.find((item) => item.method === req.method && item.pattern.test(url.pathname));

  if (!match) return notFound(res);

  try {
    const params = url.pathname.match(match.pattern).slice(1).map(decodeURIComponent);
    return await match.handler(req, res, params);
  } catch (error) {
    const status = error.status || 500;
    return json(res, status, {
      error: status === 500 ? "INTERNAL_ERROR" : "REQUEST_ERROR",
      message: error.message
    });
  }
});

await ensureStore();
await runKeeper();

server.listen(PORT, () => {
  console.log(`Veil Clubs backend listening on http://127.0.0.1:${PORT}`);
});
