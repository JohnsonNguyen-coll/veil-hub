import "dotenv/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import {configVariable} from "hardhat/config";

export default {
  plugins: [hardhatEthers],
  solidity: {
    version: "0.8.27",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    sepolia: {
      type: "http",
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : []
    }
  }
};
