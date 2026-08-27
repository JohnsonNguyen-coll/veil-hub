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
const ZAMA_SEPOLIA_CUSDC_MOCK_WRAPPER = "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639";
const ZAMA_SEPOLIA_USDC_MOCK_UNDERLYING = "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF";

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

function upsertEnvValue(filePath, key, value) {
  const absolutePath = path.resolve(filePath);
  const line = `${key}=${value}`;
  let content = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, "utf8") : "";
  const pattern = new RegExp(`^${key}=.*$`, "m");

  if (pattern.test(content)) {
    content = content.replace(pattern, line);
  } else {
    content = `${content.trimEnd()}\n${line}\n`;
  }

  fs.writeFileSync(absolutePath, content);
}

function syncFrontendAbis(compileOutput) {
  const frontendContractsDir = path.resolve("..", "frontend", "src", "contracts");
  if (!fs.existsSync(frontendContractsDir)) return;

  fs.writeFileSync(
    path.join(frontendContractsDir, "VeilClubsABI.json"),
    JSON.stringify(compileOutput.contracts["contracts/VeilClubs.sol"].VeilClubs.abi, null, 2)
  );
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
  const clubsContract = compileOutput.contracts["contracts/VeilClubs.sol"].VeilClubs;
  syncFrontendAbis(compileOutput);
  const depositTokenAddress = process.env.DEPOSIT_TOKEN_ADDRESS || process.env.VEIL_TOKEN_ADDRESS || ZAMA_SEPOLIA_CUSDC_MOCK_WRAPPER;

  console.log("\n🔐 Deposit token:", depositTokenAddress);
  console.log("   Default is Zama official Sepolia cUSDCMock wrapper.");

  console.log("\n📦 Đang deploy VeilClubs (Main Pool & Draw Engine)...");
  const ClubsFactory = new ethers.ContractFactory(clubsContract.abi, clubsContract.evm.bytecode.object, wallet);
  const clubs = await ClubsFactory.deploy(depositTokenAddress, wallet.address);
  console.log("⏳ Chờ transaction được confirm trên Sepolia...");
  await clubs.waitForDeployment();
  const clubsAddress = await clubs.getAddress();
  console.log("✅ VeilClubs deployed at:", clubsAddress);

  console.log("\n==================================================");
  console.log("🎉 DEPLOY THÀNH CÔNG TRỌN VẸN TRÊN SEPOLIA!");
  console.log("==================================================");
  console.log(`VITE_VEIL_TOKEN_ADDRESS=${depositTokenAddress}`);
  console.log(`VITE_VEIL_UNDERLYING_TOKEN_ADDRESS=${ZAMA_SEPOLIA_USDC_MOCK_UNDERLYING}`);
  console.log(`VITE_VEIL_CLUBS_ADDRESS=${clubsAddress}`);
  console.log("==================================================");

  upsertEnvValue(path.resolve("..", "frontend", ".env"), "VITE_VEIL_TOKEN_ADDRESS", depositTokenAddress);
  upsertEnvValue(path.resolve("..", "frontend", ".env"), "VITE_VEIL_UNDERLYING_TOKEN_ADDRESS", ZAMA_SEPOLIA_USDC_MOCK_UNDERLYING);
  upsertEnvValue(path.resolve("..", "frontend", ".env"), "VITE_VEIL_CLUBS_ADDRESS", clubsAddress);
  upsertEnvValue(path.resolve("..", "backend", ".env"), "VEIL_TOKEN_ADDRESS", depositTokenAddress);
  upsertEnvValue(path.resolve("..", "backend", ".env"), "VEIL_UNDERLYING_TOKEN_ADDRESS", ZAMA_SEPOLIA_USDC_MOCK_UNDERLYING);
  upsertEnvValue(path.resolve("..", "backend", ".env"), "VEIL_CLUBS_ADDRESS", clubsAddress);
  console.log("✅ Đã cập nhật frontend/.env và backend/.env với địa chỉ mới.");
}

main().catch((error) => {
  console.error("\n❌ Deploy thất bại với lỗi:", error.shortMessage || error.message || error);
  process.exit(1);
});
