import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

const DEFAULT_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://1rpc.io/sepolia",
  "https://gateway.tenderly.co/public/sepolia"
];

async function getWorkingProvider(customUrl) {
  const candidateUrls = customUrl ? [customUrl, ...DEFAULT_RPCS] : DEFAULT_RPCS;
  for (const url of candidateUrls) {
    try {
      const provider = new ethers.JsonRpcProvider(url, 11155111n, { staticNetwork: true });
      await provider.getBlockNumber();
      return { provider, url };
    } catch {
      // try next
    }
  }
  throw new Error("Không thể kết nối tới bất kỳ Sepolia RPC nào!");
}

async function main() {
  const customRpc = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!privateKey || privateKey.includes("your_private_key") || privateKey.length < 64) {
    console.error("❌ Error: Vui lòng điền PRIVATE_KEY hợp lệ trong file contracts/.env!");
    process.exit(1);
  }

  const formattedKey = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const { provider, url: activeRpcUrl } = await getWorkingProvider(customRpc);
  const wallet = new ethers.Wallet(formattedKey, provider);

  console.log("==================================================");
  console.log("🚀 Bắt đầu Deploy Smart Contracts lên Sepolia");
  console.log("📡 Active RPC:", activeRpcUrl);
  console.log("👤 Deployer Address:", wallet.address);

  const balance = await provider.getBalance(wallet.address);
  console.log("💰 Số dư ETH:", ethers.formatEther(balance), "Sepolia ETH");

  if (balance === 0n) {
    console.error("\n❌ Error: Ví deployer không có Sepolia ETH để trả phí gas!");
    console.error("👉 Vui lòng nhận test ETH miễn phí tại: https://cloud.google.com/application/web3/faucet/ethereum/sepolia");
    process.exit(1);
  }

  const artifactPath = path.resolve("artifacts-solc", "compile-output.json");
  if (!fs.existsSync(artifactPath)) {
    console.log("⚙️ Đang biên dịch contracts...");
    const { execSync } = await import("node:child_process");
    execSync("node scripts/compile-solc.js", { stdio: "inherit" });
  }

  const compileOutput = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const tokenContract = compileOutput.contracts["contracts/VeilConfidentialToken.sol"].VeilConfidentialToken;
  const clubsContract = compileOutput.contracts["contracts/VeilClubs.sol"].VeilClubs;

  console.log("\n📦 1. Đang deploy VeilConfidentialToken (cUSDC ERC-7984)...");
  const TokenFactory = new ethers.ContractFactory(tokenContract.abi, tokenContract.evm.bytecode.object, wallet);
  const token = await TokenFactory.deploy(wallet.address);
  console.log("⏳ Chờ transaction được confirm trên Sepolia...");
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ VeilConfidentialToken deployed at:", tokenAddress);

  console.log("\n📦 2. Đang deploy VeilClubs (Main Pool & Draw Engine)...");
  const ClubsFactory = new ethers.ContractFactory(clubsContract.abi, clubsContract.evm.bytecode.object, wallet);
  const clubs = await ClubsFactory.deploy(tokenAddress, wallet.address);
  console.log("⏳ Chờ transaction được confirm trên Sepolia...");
  await clubs.waitForDeployment();
  const clubsAddress = await clubs.getAddress();
  console.log("✅ VeilClubs deployed at:", clubsAddress);

  console.log("\n==================================================");
  console.log("🎉 DEPLOY THÀNH CÔNG TRỌN VẸN TRÊN SEPOLIA!");
  console.log("==================================================");
  console.log(`VITE_VEIL_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`VITE_VEIL_CLUBS_ADDRESS=${clubsAddress}`);
  console.log("==================================================");
  console.log("👉 Hãy copy 2 dòng trên dán vào file: frontend/.env");
}

main().catch((error) => {
  console.error("\n❌ Deploy thất bại với lỗi:", error.shortMessage || error.message || error);
  process.exit(1);
});
