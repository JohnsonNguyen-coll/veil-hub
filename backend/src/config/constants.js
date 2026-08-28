import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "..", "..");
export const dataDir = path.join(rootDir, "data");
export const dataFile = path.join(dataDir, "veil-clubs.json");
export const seedFile = path.join(dataDir, "veil-clubs.example.json");

export const PORT = Number(process.env.PORT || 8787);
export const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || "http://127.0.0.1:5174";
export const KEEPER_ENABLED = (process.env.KEEPER_ENABLED || "false") === "true";
export const KEEPER_INTERVAL_MS = Number(process.env.KEEPER_INTERVAL_MS || 30000);
export const CHAIN_ID = Number(process.env.CHAIN_ID || 11155111);
export const RPC_URL = process.env.RPC_URL || process.env.SEPOLIA_RPC_URL || "";
export const VEIL_CLUBS_ADDRESS = process.env.VEIL_CLUBS_ADDRESS || "";
export const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || "";
export const FAUCET_COOLDOWN_MS = Number(process.env.FAUCET_COOLDOWN_MS || 86400000);
export const SUPABASE_URL = process.env.SUPABASE_URL || "";
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      })
    : null;

export const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
export const PUBLIC_RPC_URLS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://1rpc.io/sepolia",
  "https://gateway.tenderly.co/public/sepolia",
  "https://rpc2.sepolia.org"
];

export const SEPOLIA_CHAIN = {
  id: CHAIN_ID,
  name: "Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: {
      http: [...PUBLIC_RPC_URLS, ...(RPC_URL && !PUBLIC_RPC_URLS.includes(RPC_URL) ? [RPC_URL] : [])]
    }
  }
};

export const VEIL_CLUBS_KEEPER_ABI = [
  {
    type: "function",
    name: "clubView",
    stateMutability: "view",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "name", type: "string" },
          { name: "description", type: "string" },
          { name: "admin", type: "address" },
          { name: "keeper", type: "address" },
          { name: "minDeposit", type: "uint64" },
          { name: "drawInterval", type: "uint64" },
          { name: "nextDrawAt", type: "uint64" },
          { name: "memberCount", type: "uint256" },
          { name: "drawCount", type: "uint256" },
          { name: "anonymousMembers", type: "bool" },
          { name: "exists", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "triggerDraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "clubId", type: "uint256" },
      { name: "drawCommitment", type: "bytes32" }
    ],
    outputs: [
      { name: "drawId", type: "uint256" },
      { name: "prize", type: "bytes32" }
    ]
  },
  {
    type: "event",
    name: "DrawExecuted",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "drawId", type: "uint256", indexed: true },
      { name: "prizeHandle", type: "bytes32", indexed: false },
      { name: "drawCommitment", type: "bytes32", indexed: false },
      { name: "memberCount", type: "uint256", indexed: false }
    ]
  }
];
