import { createPublicClient, createWalletClient, fallback, formatUnits, http, parseUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  KEEPER_PRIVATE_KEY,
  PUBLIC_RPC_URLS,
  RPC_URL,
  SEPOLIA_CHAIN,
  TOKEN_DECIMALS,
  VEIL_TOKEN_ADDRESS,
  VEIL_UNDERLYING_TOKEN_ADDRESS
} from "../config/constants.js";

const TEST_ERC20_ABI = [
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "balance", type: "uint256" }]
  }
];

const CONFIDENTIAL_WRAPPER_ABI = [
  {
    type: "function",
    name: "wrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  }
];

function orderedRpcUrls() {
  return [...PUBLIC_RPC_URLS, ...(RPC_URL && !PUBLIC_RPC_URLS.includes(RPC_URL) ? [RPC_URL] : [])];
}

function requireEnv() {
  const missing = [];
  if (!KEEPER_PRIVATE_KEY) missing.push("KEEPER_PRIVATE_KEY");
  if (!VEIL_TOKEN_ADDRESS) missing.push("VEIL_TOKEN_ADDRESS");
  if (!VEIL_UNDERLYING_TOKEN_ADDRESS) missing.push("VEIL_UNDERLYING_TOKEN_ADDRESS");
  if (missing.length > 0) throw new Error(`Missing env: ${missing.join(", ")}`);
}

function parseAmount() {
  const amountInput = process.argv[2] || process.env.KEEPER_FAUCET_AMOUNT || "1000";
  const amount = parseUnits(amountInput, TOKEN_DECIMALS);
  if (amount <= 0n) throw new Error("Amount must be greater than zero.");
  return { amountInput, amount };
}

async function waitForSuccess(publicClient, hash, label) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} reverted: ${hash}`);
  return receipt;
}

async function main() {
  requireEnv();
  const { amountInput, amount } = parseAmount();
  const account = privateKeyToAccount(KEEPER_PRIVATE_KEY);
  const transport = fallback(orderedRpcUrls().map((url) => http(url)), { rank: false });
  const publicClient = createPublicClient({ chain: SEPOLIA_CHAIN, transport });
  const walletClient = createWalletClient({ account, chain: SEPOLIA_CHAIN, transport });

  console.log(`[keeper:faucet] wallet: ${account.address}`);
  console.log(`[keeper:faucet] amount: ${amountInput} USDC -> cUSDC`);

  const beforeUnderlying = await publicClient.readContract({
    address: VEIL_UNDERLYING_TOKEN_ADDRESS,
    abi: TEST_ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address]
  });
  console.log(`[keeper:faucet] underlying before: ${formatUnits(beforeUnderlying, TOKEN_DECIMALS)} USDC`);

  const mintHash = await walletClient.writeContract({
    address: VEIL_UNDERLYING_TOKEN_ADDRESS,
    abi: TEST_ERC20_ABI,
    functionName: "mint",
    args: [account.address, amount]
  });
  console.log(`[keeper:faucet] mint submitted: ${mintHash}`);
  await waitForSuccess(publicClient, mintHash, "mint");

  const approveHash = await walletClient.writeContract({
    address: VEIL_UNDERLYING_TOKEN_ADDRESS,
    abi: TEST_ERC20_ABI,
    functionName: "approve",
    args: [VEIL_TOKEN_ADDRESS, amount]
  });
  console.log(`[keeper:faucet] approve wrapper submitted: ${approveHash}`);
  await waitForSuccess(publicClient, approveHash, "approve");

  const wrapHash = await walletClient.writeContract({
    address: VEIL_TOKEN_ADDRESS,
    abi: CONFIDENTIAL_WRAPPER_ABI,
    functionName: "wrap",
    args: [account.address, amount]
  });
  console.log(`[keeper:faucet] wrap submitted: ${wrapHash}`);
  await waitForSuccess(publicClient, wrapHash, "wrap");

  const afterUnderlying = await publicClient.readContract({
    address: VEIL_UNDERLYING_TOKEN_ADDRESS,
    abi: TEST_ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address]
  });
  console.log(`[keeper:faucet] underlying after: ${formatUnits(afterUnderlying, TOKEN_DECIMALS)} USDC`);
  console.log("[keeper:faucet] done. cUSDC balance is confidential; keeper can decrypt it during auto-fund validation.");
}

main().catch((error) => {
  console.error(`[keeper:faucet] failed: ${error.shortMessage || error.message}`);
  process.exitCode = 1;
});
