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
export const VEIL_TOKEN_ADDRESS = process.env.VEIL_TOKEN_ADDRESS || process.env.VITE_VEIL_TOKEN_ADDRESS || "";
export const VEIL_UNDERLYING_TOKEN_ADDRESS =
  process.env.VEIL_UNDERLYING_TOKEN_ADDRESS || process.env.VITE_VEIL_UNDERLYING_TOKEN_ADDRESS || "";
export const KEEPER_PRIVATE_KEY = process.env.KEEPER_PRIVATE_KEY || "";
export const KEEPER_AUTO_FUND_YIELD = (process.env.KEEPER_AUTO_FUND_YIELD || "false") === "true";
export const KEEPER_YIELD_AMOUNT = process.env.KEEPER_YIELD_AMOUNT || "10";
export const KEEPER_YIELD_MIN_MEMBERS = Number(process.env.KEEPER_YIELD_MIN_MEMBERS || 1);
export const KEEPER_OPERATOR_APPROVAL_SECONDS = Number(process.env.KEEPER_OPERATOR_APPROVAL_SECONDS || 604800);
export const KEEPER_RETRY_BACKOFF_MS = Number(process.env.KEEPER_RETRY_BACKOFF_MS || 300000);
export const KEEPER_FUND_GAS_LIMIT = BigInt(process.env.KEEPER_FUND_GAS_LIMIT || 8000000);
export const ZAMA_FHEVM_API_KEY = process.env.ZAMA_FHEVM_API_KEY || process.env.FHEVM_API_KEY || "";
export const PUBLIC_DECRYPT_TIMEOUT_MS = Number(process.env.PUBLIC_DECRYPT_TIMEOUT_MS || 120000);
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
export const TOKEN_DECIMALS = 6;
export const MAX_EUINT64 = (1n << 64n) - 1n;
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
          { name: "hasPrizeReserve", type: "bool" },
          { name: "anonymousMembers", type: "bool" },
          { name: "exists", type: "bool" }
        ]
      }
    ]
  },
  {
    type: "function",
    name: "accrueYield",
    stateMutability: "nonpayable",
    inputs: [
      { name: "clubId", type: "uint256" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "accrueYieldPublic",
    stateMutability: "nonpayable",
    inputs: [
      { name: "clubId", type: "uint256" },
      { name: "amount", type: "uint64" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "prepareWeightedDraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "clubId", type: "uint256" }],
    outputs: [{ name: "totalPrincipalHandle", type: "bytes32" }]
  },
  {
    type: "function",
    name: "triggerWeightedDraw",
    stateMutability: "nonpayable",
    inputs: [
      { name: "clubId", type: "uint256" },
      { name: "drawCommitment", type: "bytes32" },
      { name: "totalPrincipal", type: "uint64" },
      { name: "decryptionProof", type: "bytes" }
    ],
    outputs: [
      { name: "drawId", type: "uint256" },
      { name: "prize", type: "bytes32" }
    ]
  },
  {
    type: "event",
    name: "DrawTotalReadyForDecryption",
    inputs: [
      { name: "clubId", type: "uint256", indexed: true },
      { name: "totalPrincipalHandle", type: "bytes32", indexed: false }
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

export const VEIL_TOKEN_KEEPER_ABI = [
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "bytes32" }]
  },
  {
    type: "function",
    name: "isOperator",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "spender", type: "address" }
    ],
    outputs: [{ name: "allowed", type: "bool" }]
  },
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" }
    ],
    outputs: []
  }
];
