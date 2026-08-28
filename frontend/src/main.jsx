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

const publicRpcUrls = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://sepolia.gateway.tenderly.co",
  "https://1rpc.io/sepolia",
  "https://gateway.tenderly.co/public/sepolia",
  "https://rpc2.sepolia.org"
];

const rpcUrls = [...publicRpcUrls, ...(customRpcUrl && !publicRpcUrls.includes(customRpcUrl) ? [customRpcUrl] : [])];
const rpcEndpoints = rpcUrls.map((url) => http(url));

const queryClient = new QueryClient();
const wagmiConfig = getDefaultConfig({
  appName: "VeilHubs",
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
