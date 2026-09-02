import { randomBytes } from "node:crypto";
import { getAddress, isAddress } from "viem";
import { CHAIN_ID, FRONTEND_ORIGIN, KEEPER_ENABLED, supabase } from "../config/constants.js";
import { readStore, updateStore } from "../services/storeService.js";

export function json(res, status, body) {
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

export function notFound(res) {
  json(res, 404, { error: "NOT_FOUND" });
}

export function badRequest(res, message, details = {}) {
  json(res, 400, { error: "BAD_REQUEST", message, ...details });
}

export async function readBody(req) {
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

export function publicClub(club) {
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
    hasPrizeReserve: Boolean(club.hasPrizeReserve),
    contractClubId: club.contractClubId,
    createTxHash: club.createTxHash,
    status: club.status,
    createdAt: club.createdAt
  };

  if (club.scope === "PRIVATE") {
    base.inviteCode = club.inviteCode;
  }

  return base;
}

export function publicJoinedClub(club) {
  return { ...publicClub(club), joined: true };
}

export function createInviteCode() {
  return `VC-${randomBytes(3).toString("hex").toUpperCase()}`;
}

export function normalizeAddress(value) {
  if (!value || !isAddress(value)) return null;
  return getAddress(value);
}

export function health(_req, res) {
  json(res, 200, {
    ok: true,
    service: "veil-clubs-backend",
    privacy: "public metadata only"
  });
}

export function config(_req, res) {
  json(res, 200, {
    chainId: Number(process.env.CHAIN_ID || 11155111),
    chainName: process.env.CHAIN_NAME || "sepolia",
    contracts: {
      veilClubs: process.env.VEIL_CLUBS_ADDRESS || null,
      veilToken: process.env.VEIL_TOKEN_ADDRESS || null
    },
    features: {
      keeper: KEEPER_ENABLED,
      faucet: false,
      indexer: true,
      supabase: Boolean(supabase)
    },
    storage: supabase ? "supabase" : "fallback"
  });
}

export async function dashboard(_req, res) {
  const store = await readStore();
  const listedClubs = store.clubs.filter(isPubliclyListedClub);
  const activeClubs = listedClubs.length;
  const nextDraw = listedClubs
    .map((club) => new Date(club.nextDrawAt).getTime())
    .filter(Number.isFinite)
    .sort((a, b) => a - b)[0];

  json(res, 200, {
    encryptedPrincipal: "user-decrypt",
    claimableWinnings: "user-decrypt",
    activePools: activeClubs,
    nextDrawAt: nextDraw ? new Date(nextDraw).toISOString() : null,
    recentDraws: store.draws.slice(-5).reverse(),
    pools: listedClubs.map(publicClub)
  });
}

function isPubliclyListedClub(club) {
  return club.scope !== "PRIVATE" || !club.anonymousMembers;
}

function findClubByReference(store, clubId, contractClubId) {
  const id = String(clubId || "").trim();
  const contractId = String(contractClubId || "").trim();
  return store.clubs.find(
    (club) =>
      (id && (club.id === id || String(club.contractClubId) === id)) ||
      (contractId && (club.id === contractId || String(club.contractClubId) === contractId))
  );
}

function clubsJoinedByAddress(store, address) {
  const normalized = String(address || "").toLowerCase();
  const joinedKeys = new Set(
    (store.memberships || [])
      .filter((membership) => String(membership.address || "").toLowerCase() === normalized)
      .flatMap((membership) => [membership.clubId, membership.contractClubId].filter(Boolean).map(String))
  );

  return store.clubs
    .filter((club) => joinedKeys.has(String(club.id)) || joinedKeys.has(String(club.contractClubId)))
    .map(publicJoinedClub);
}

export async function listClubs(_req, res) {
  const store = await readStore();
  json(res, 200, { clubs: store.clubs.filter(isPubliclyListedClub).map(publicClub) });
}

export async function getClub(_req, res, [clubId]) {
  const store = await readStore();
  const club = store.clubs.find((item) => item.id === clubId);
  if (!club) return notFound(res);
  return json(res, 200, { club: publicClub(club) });
}

export async function createClub(req, res) {
  const body = await readBody(req);
  const name = String(body.name || "").trim();
  const description = String(body.description || "").trim();
  const txHash = String(body.txHash || "").trim();
  const contractClubId = String(body.contractClubId || "").trim();
  const admin = normalizeAddress(body.admin);
  const keeper = normalizeAddress(body.keeper || body.admin);

  if (!name) return badRequest(res, "Club name is required");
  if (!txHash || !/^0x[a-fA-F0-9]{64}$/.test(txHash)) return badRequest(res, "Confirmed onchain createClub txHash is required");
  if (!contractClubId || !/^\d+$/.test(contractClubId)) return badRequest(res, "Onchain contractClubId is required");
  if (!admin) return badRequest(res, "Valid admin wallet address is required");

  const club = await updateStore((store) => {
    const id = `club-${contractClubId}`;
    const createdAt = new Date().toISOString();
    const drawIntervalMs = Number(body.drawIntervalMs || 604800000);
    const existing = store.clubs.find((item) => item.contractClubId === contractClubId || item.id === id);
    if (existing) return publicClub(existing);

    const nextClub = {
      id,
      contractClubId,
      createTxHash: txHash,
      name,
      description,
      scope: "PRIVATE",
      admin,
      keeper: keeper || admin,
      inviteCode: createInviteCode(),
      minDeposit: String(body.minDeposit || "1"),
      drawIntervalMs,
      nextDrawAt: null,
      anonymousMembers: Boolean(body.anonymousMembers ?? true),
      memberCount: 0,
      encryptedTvlHandle: "encrypted",
      encryptedPrizeHandle: "encrypted",
      hasPrizeReserve: false,
      status: "CLUB_CREATED",
      createdAt
    };

    store.clubs.push(nextClub);
    return publicClub(nextClub);
  });

  json(res, 201, { club });
}

export async function createInvite(_req, res, [clubId]) {
  const invite = await updateStore((store) => {
    const club = store.clubs.find((item) => item.id === clubId);
    if (!club) return null;
    club.inviteCode = createInviteCode();
    return { clubId: club.id, inviteCode: club.inviteCode };
  });

  if (!invite) return notFound(res);
  return json(res, 201, invite);
}

export async function joinClub(req, res) {
  const body = await readBody(req);
  const inviteCode = String(body.inviteCode || "").trim().toUpperCase();

  if (!inviteCode) return badRequest(res, "Invite code is required");

  const club = await readStore().then((store) => {
    const match = store.clubs.find((item) => item.inviteCode === inviteCode);
    if (!match) return null;
    return publicClub(match);
  });

  if (!club) return notFound(res);
  return json(res, 200, {
    club,
    message: "Invite is valid. Membership is recorded onchain when the user submits an encrypted deposit."
  });
}

export async function listMemberships(_req, res, [addressParam]) {
  const address = normalizeAddress(addressParam);
  if (!address) return badRequest(res, "Valid wallet address is required");

  const store = await readStore();
  return json(res, 200, { clubs: clubsJoinedByAddress(store, address) });
}

export async function recordMembership(req, res) {
  const body = await readBody(req);
  const address = normalizeAddress(body.address);
  const source = String(body.source || "joined").trim() || "joined";

  if (!address) return badRequest(res, "Valid wallet address is required");

  const result = await updateStore((store) => {
    store.memberships ||= [];
    const club = findClubByReference(store, body.clubId, body.contractClubId);
    if (!club) return null;

    const normalizedAddress = address.toLowerCase();
    const existing = store.memberships.find(
      (membership) => membership.address === normalizedAddress && membership.clubId === club.id
    );
    const now = new Date().toISOString();

    if (existing) {
      existing.contractClubId = club.contractClubId || existing.contractClubId;
      existing.source = source;
      existing.updatedAt = now;
    } else {
      store.memberships.push({
        address: normalizedAddress,
        clubId: club.id,
        contractClubId: club.contractClubId || null,
        source,
        createdAt: now,
        updatedAt: now
      });
    }

    return {
      club: publicJoinedClub(club),
      clubs: clubsJoinedByAddress(store, address)
    };
  });

  if (!result) return notFound(res);
  return json(res, 200, result);
}

export async function listDraws(_req, res) {
  const store = await readStore();
  json(res, 200, { draws: store.draws.slice().reverse() });
}

export async function requestFaucet(req, res) {
  const body = await readBody(req);
  const address = normalizeAddress(body.address);

  if (!address) return badRequest(res, "Valid wallet address is required");
  json(res, 410, {
    allowed: false,
    message: "Faucet is handled onchain by the frontend through Zama's Sepolia test token mint, approve, and cUSDC wrap flow."
  });
}

export const route = (method, pattern, handler) => ({ method, pattern, handler });

export const routes = [
  route("GET", /^\/health$/, health),
  route("GET", /^\/api\/config$/, config),
  route("GET", /^\/api\/dashboard$/, dashboard),
  route("GET", /^\/api\/clubs$/, listClubs),
  route("POST", /^\/api\/clubs$/, createClub),
  route("GET", /^\/api\/clubs\/([^/]+)$/, getClub),
  route("POST", /^\/api\/clubs\/([^/]+)\/invites$/, createInvite),
  route("POST", /^\/api\/join$/, joinClub),
  route("GET", /^\/api\/memberships\/([^/]+)$/, listMemberships),
  route("POST", /^\/api\/memberships$/, recordMembership),
  route("GET", /^\/api\/draws$/, listDraws),
  route("POST", /^\/api\/faucet\/request$/, requestFaucet)
];
