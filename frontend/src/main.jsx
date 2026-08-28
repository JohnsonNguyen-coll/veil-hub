import React from "react";
import ReactDOM from "react-dom/client";
import "@rainbow-me/rainbowkit/styles.css";
import { getDefaultConfig, RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { http, fallback } from "wagmi";
import App from "./App.jsx";
import "./styles.css";

const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "YOUR_PROJECT_ID";
const customRpcUrl = import.meta.env.VITE_SEPOLIA_RPC_URL;

const rpcEndpoints = [
  http("https://ethereum-sepolia-rpc.publicnode.com"),
  http("https://sepolia.gateway.tenderly.co"),
  http("https://1rpc.io/sepolia"),
  http("https://gateway.tenderly.co/public/sepolia"),
  http("https://rpc2.sepolia.org"),
  http()
];

if (customRpcUrl && !rpcEndpoints.some((r) => r.url === customRpcUrl)) {
  // Alchemy / Private RPC from .env is placed as the final high-reliability fallback
  rpcEndpoints.push(http(customRpcUrl));
}

const queryClient = new QueryClient();
const wagmiConfig = getDefaultConfig({
  appName: "Veil Clubs",
  projectId: walletConnectProjectId,
  chains: [sepolia],
  transports: {
    [sepolia.id]: fallback(rpcEndpoints, { rank: false })
  }
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact">
          <App />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
