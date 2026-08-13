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
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("PRIVATE_KEY")]
    }
  }
};
