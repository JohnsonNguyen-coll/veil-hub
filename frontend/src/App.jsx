import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { decodeEventLog, formatUnits, parseUnits, toHex } from "viem";
import * as THREE from "three";
import {
  VEIL_CLUBS_ADDRESS,
  VEIL_TOKEN_ADDRESS,
  VEIL_UNDERLYING_TOKEN_ADDRESS,
  VeilClubsABI,
  VeilTokenABI,
  IS_CONTRACT_CONFIGURED,
  IS_TOKEN_CONFIGURED,
  BACKEND_URL
} from "./contracts/config.js";

const defaultPools = [
  {
    id: "global",
    name: "Global Pool",
    scope: "PUBLIC",
    contractId: "0",
    tvl: "encrypted",
    members: "0",
    draw: "24H 00M",
    prize: "•••••• USDC",
    status: "ACTIVE"
  }
];

const defaultDrawHistory = [];

const APP_ROUTES = {
  dashboard: "/app/dashboard",
  global: "/app/global-pool",
  clubs: "/app/clubs",
  draws: "/app/draws",
  account: "/app/account"
};

const PATH_TO_PAGE = Object.fromEntries(Object.entries(APP_ROUTES).map(([page, path]) => [path, page]));

function getRouteState(pathname) {
  if (pathname === "/" || pathname === "") {
    return { view: "landing", activePage: "dashboard" };
  }

  if (pathname === "/docs") {
    return { view: "docs", activePage: "dashboard", docsSection: null };
  }

  if (pathname.startsWith("/docs/")) {
    const docsSection = pathname.replace("/docs/", "").split("/")[0];
    return { view: "docs", activePage: "dashboard", docsSection };
  }

  if (pathname === "/app") {
    return { view: "app", activePage: "dashboard" };
  }

  return { view: "app", activePage: PATH_TO_PAGE[pathname] || "dashboard" };
}

function VeilButton({ children, disabled = false, onClick, variant = "primary", className = "" }) {
  const variantClass =
    variant === "secondary"
      ? "bg-transparent text-veil-white border border-veil-gray-light hover:bg-veil-gray-dark"
      : "bg-veil-purple text-veil-white border border-veil-purple hover:bg-opacity-90";

  return (
    <button
      className={`${variantClass} font-data-sm text-[13px] md:text-[14px] font-bold tracking-wider px-6 md:px-7 py-3 md:py-3.5 uppercase transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function ConnectWalletButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openAccountModal, openChainModal, openConnectModal }) => {
        const connected = mounted && account && chain;

        if (!connected) {
          return <VeilButton onClick={openConnectModal}>Connect Wallet</VeilButton>;
        }

        if (chain.unsupported) {
          return <VeilButton onClick={openChainModal}>Wrong Network</VeilButton>;
        }

        return <VeilButton onClick={openAccountModal}>{account.displayName}</VeilButton>;
      }}
    </ConnectButton.Custom>
  );
}

function Globe() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const devicePixelRatio = window.devicePixelRatio || 1;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 2.05;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(devicePixelRatio);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0xbd00ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8,
      emissive: 0xbd00ff,
      emissiveIntensity: 0.5
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    const coreGeometry = new THREE.SphereGeometry(0.98, 32, 32);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.3
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(core);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    let targetRotationX = 0;
    let targetRotationY = 0;
    let animationFrame = 0;

    const handleMouseMove = (event) => {
      const rect = container.getBoundingClientRect();
      const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const mouseY = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

      targetRotationY = mouseX * Math.PI * 0.4;
      targetRotationX = -mouseY * Math.PI * 0.4;
    };

    const handleResize = () => {
      const newWidth = container.clientWidth || window.innerWidth;
      const newHeight = container.clientHeight || window.innerHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      globe.rotation.y += (targetRotationY - globe.rotation.y) * 0.05;
      globe.rotation.x += (targetRotationX - globe.rotation.x) * 0.05;
      globe.rotation.y += 0.003;
      renderer.render(scene, camera);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      geometry.dispose();
      material.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      className="flex-1 relative w-full h-[550px] sm:h-[650px] lg:h-[750px] flex items-center justify-center pointer-events-auto"
      ref={containerRef}
    />
  );
}

function FeatureCard({ index, title, description, status, borderClass = "" }) {
  return (
    <div className={`bg-veil-gray-dark p-8 ${borderClass} border-veil-gray-light flex flex-col gap-6 relative min-h-[300px] scramble-hover transition-colors duration-150 border border-transparent hover:border-veil-purple`}>
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-6 right-6">{index}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white font-bold uppercase mt-8 tracking-tight scramble-target" data-original={title}>
        {title}
      </h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70">
        {description}
      </p>
      <div className="mt-auto pt-4 border-t border-veil-gray-light">
        <span className="font-data-sm text-data-sm text-veil-white opacity-80 uppercase">{status}</span>
      </div>
    </div>
  );
}

function StatBlock({ label, value, status }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{label}</span>
      <span className="font-data-display text-data-display text-veil-white font-bold">{value}</span>
      {status ? <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">&gt; {status}</span> : null}
    </div>
  );
}

function StatusDot({ label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-2 h-2 bg-green-500 rounded-full pulse-green"></span>
      <span className="font-data-sm text-data-sm text-veil-white font-bold uppercase">{label}</span>
    </div>
  );
}

function LogoMark({ className = "w-11 h-11" }) {
  return <img alt="Veil Clubs" className={`${className} object-contain shrink-0`} src="/assets/veil_club_mark.png" />;
}

const landingAdvantages = [
  ["Private Capital", "Deposits and odds remain encrypted via FHEVM on-chain keys."],
  ["No-Loss Exit", "Withdraw 100% of your principal anytime. Yield funds the prize."],
  ["Social Pools", "Private Clubs enable group prize pools without bankroll exposure."],
  ["Onchain Flow", "Wallet actions are only acknowledged after Sepolia transaction receipts."]
];

const landingPoolModes = [
  {
    label: "GLOBAL POOL",
    title: "OPEN POOL FOR FIRST-TIME USERS",
    body: "A public pool that keeps onboarding simple. Anyone can enter, deposit privately, watch the next draw, and use the no-loss loop without needing an invite.",
    points: [
      "OPEN ACCESS",
      "SHARED PUBLIC DRAW HISTORY",
      "ENCRYPTED USER BALANCES",
      "ONCHAIN ENTRY FLOW"
    ]
  },
  {
    label: "PRIVATE CLUBS",
    title: "INVITE-ONLY PRIZE POOLS",
    body: "A club creator opens a private pool with its own members, draw rhythm, and prize stream. Members get the social upside while sensitive financial state stays hidden.",
    points: [
      "INVITE CODE ENTRY",
      "OPTIONAL ANONYMOUS MEMBERS",
      "INDEPENDENT CLUB DRAWS",
      "ADMIN OR KEEPER TRIGGER"
    ]
  }
];

const landingDrawSteps = [
  ["01", "Deposit", "The user enters a pool with an encrypted amount, so the chain sees activity but not the plaintext balance."],
  ["02", "Yield", "Principal remains withdrawable while generated yield accumulates into the prize stream."],
  ["03", "Draw", "A scheduled draw selects a winner from confidential pool state and emits only the public event surface."],
  ["04", "Claim", "The winner decrypts their own prize and claims it, without revealing everyone else's position."]
];

const landingPrivacyBlocks = [
  ["Hidden", "Balances, deposits, pool capital, personal odds, and prize amounts."],
  ["User Controlled", "Own balance, own winnings, and claimable prize after wallet-approved decrypt."],
  ["Public Surface", "Pool identity, draw timing, transactions, and optional winner address for transparency."]
];

const landingBriefs = [
  {
    eyebrow: "01 / Product",
    title: "Global Pool + Private Clubs",
    body: "Veil Clubs is a confidential no-loss prize pool. New users can enter the public Global Pool, while groups can create invitation-only clubs with independent deposits, yield, and draws.",
    bullets: ["Public onboarding pool", "Invite-based private clubs", "No-loss principal withdrawals", "Encrypted prize source"]
  },
  {
    eyebrow: "02 / Privacy",
    title: "Encrypted Financial State",
    body: "Balances, deposits, winnings, total club capital, and odds are represented as ciphertext handles. Users decrypt only their own eligible values through wallet-signed user decryption.",
    bullets: ["Private balances", "Private prize amounts", "Private odds", "Public events only where needed"]
  },
  {
    eyebrow: "03 / Draws",
    title: "Confidential Prize Draws",
    body: "The draw executes onchain over confidential pool state and allocates encrypted prizes without exposing plaintext member balances.",
    bullets: ["Encrypted prize allocation", "No plaintext balance selection", "Keeper/admin trigger path", "Gas limits documented"]
  },
  {
    eyebrow: "04 / Stack",
    title: "Privacy-First Infrastructure",
    body: "The system is split so sensitive financial state stays encrypted while the interface remains fast, readable, and transaction-honest. Public metadata is separated from confidential pool state.",
    bullets: ["Encrypted pool accounting", "Wallet-based access", "Public event history", "Keeper-ready draw flow"]
  }
];

const userFlow = [
  ["Connect", "Connect a Sepolia wallet and prepare encrypted transaction inputs."],
  ["Enter", "Join the Global Pool or create/join a Private Club by invite code."],
  ["Deposit", "Encrypt deposit amount client-side and submit proof to the pool contract."],
  ["Draw", "Keeper or admin triggers a scheduled prize draw using encrypted state."],
  ["Decrypt", "Winner decrypts claimable prize; users can decrypt their own balance."],
  ["Withdraw", "Principal remains no-loss and can be withdrawn when the user exits."]
];

const privacyRows = [
  ["Hidden", "Individual balances, deposit amounts, winnings, odds, total private club capital"],
  ["User-only", "Own balance, own winnings, own claimable prize after wallet-authorized decryption"],
  ["Public", "Pool ids, draw timestamps, tx hashes, optional winner address, public metadata"],
  ["Backend", "Stores only metadata and event cache; never stores decrypted values"]
];

const docsTopics = [
  {
    slug: "overview",
    eyebrow: "01 / Overview",
    title: "What Veil Clubs Is",
    summary: "A confidential no-loss prize pool with a public Global Pool and invite-only Private Clubs.",
    status: "PRODUCT_BRIEF",
    sections: [
      {
        title: "Core Idea",
        body: "Veil Clubs is a social prize-savings product. Users deposit into a pool, keep the right to withdraw their principal, and compete for prizes funded by generated yield. The confidential layer changes what the public can see: deposits, balances, winnings, pool totals, and odds are treated as private financial state instead of public leaderboard data."
      },
      {
        title: "Why It Exists",
        body: "Traditional prize pools are easy to inspect but poor for privacy. Anyone can infer who is depositing, how much capital a user controls, and what their odds may be. Veil Clubs keeps the social and game-like appeal while hiding sensitive financial information."
      },
      {
        title: "Product Shape",
        body: "The product intentionally has two surfaces: a Global Pool for public onboarding and Private Clubs for small social groups. This keeps the app focused and easier to reason about under confidential-computation constraints."
      }
    ],
    rows: [
      ["Primary user", "People who want no-loss prize exposure without public balance disclosure"],
      ["Primary flow", "Join Global Pool, deposit encrypted amount, view private position, trigger draw"],
      ["Social layer", "Create a club, share invite, run independent club draws"],
      ["No-loss rule", "Principal can be withdrawn; prizes are funded from yield"]
    ]
  },
  {
    slug: "product-surfaces",
    eyebrow: "02 / Product",
    title: "Global Pool And Private Clubs",
    summary: "The two pool types share the same confidential core but serve different user journeys.",
    status: "SURFACES",
    sections: [
      {
        title: "Global Pool",
        body: "The Global Pool is the public entry point. It is designed for first-time users and judges because the path is short: connect wallet, deposit test token, observe countdown, trigger or watch draw events, and decrypt the user's own balance or winnings."
      },
      {
        title: "Private Clubs",
        body: "A Private Club is a smaller independent prize pool. A creator sets a name, description, minimum deposit, and draw frequency. Members join by invite code. The club can hide member identity in the interface while still preserving encrypted financial state onchain."
      },
      {
        title: "Shared Behavior",
        body: "Both surfaces use encrypted deposits, encrypted balances, confidential prize amounts, no-loss principal withdrawal, draw history, and wallet-authorized user decryption."
      }
    ],
    rows: [
      ["Global access", "Open to any wallet"],
      ["Club access", "Invite-based membership"],
      ["Admin role", "Club creator can trigger draws or configure keeper"],
      ["Data model", "Public metadata plus encrypted financial handles"]
    ]
  },
  {
    slug: "user-flow",
    eyebrow: "03 / Flow",
    title: "User Journey",
    summary: "A complete route from wallet connection to deposit, draw, decrypt, claim, and withdraw.",
    status: "ONCHAIN_PATH",
    sections: [
      {
        title: "Connect And Choose Pool",
        body: "A user connects a Sepolia wallet and chooses either the Global Pool or a Private Club. The app should make the Global Pool feel immediate and make club entry feel private, deliberate, and invite-driven."
      },
      {
        title: "Encrypted Deposit",
        body: "The user enters an amount and the client prepares encrypted input. The transaction submits the encrypted amount and proof to the pool contract. The public sees a transaction occurred, but not the plaintext deposit amount."
      },
      {
        title: "Draw And Claim",
        body: "At the scheduled time, a keeper or admin triggers a draw. Prize amount remains confidential. The winner can decrypt their own claimable prize and claim it without exposing private balances."
      },
      {
        title: "Exit",
        body: "The no-loss promise is preserved by allowing principal withdrawal. Leaving a pool should not reveal a user's full historical position or exact odds."
      }
    ],
    rows: userFlow.map(([label, value]) => [label, value])
  },
  {
    slug: "privacy-model",
    eyebrow: "04 / Privacy",
    title: "Privacy Model",
    summary: "Exactly what should remain hidden, what the user can decrypt, and what remains public.",
    status: "DISCLOSURE_MAP",
    sections: [
      {
        title: "Hidden State",
        body: "Individual deposits, individual balances, private club totals, odds, prize amounts, and yield performance are sensitive. The interface should never display these values until the authorized user performs decryption for their own data."
      },
      {
        title: "Public State",
        body: "A confidential app still emits public structure. Pool ids, timestamps, transaction hashes, draw ids, and sometimes winner addresses may be public. The docs should be honest about this so privacy claims are precise."
      },
      {
        title: "User-Only Decryption",
        body: "A user can request wallet-authorized decryption for their own balance, winnings, and claimable amounts. The app should make this feel intentional: decrypted values are not ambient dashboard data."
      }
    ],
    rows: privacyRows
  },
  {
    slug: "prize-draw",
    eyebrow: "05 / Draws",
    title: "Confidential Prize Draw",
    summary: "The hardest technical part: fair selection while sensitive balances stay encrypted.",
    status: "CORE_MECHANISM",
    sections: [
      {
        title: "Goal",
        body: "The draw should select winners without decrypting individual balances or revealing odds. Any weighted-by-principal claim must remain out of the product until the encrypted weighted selector is implemented and gas-profiled."
      },
      {
        title: "Current Path",
        body: "The current contract exposes the draw lifecycle and encrypted prize transfer without a manual prize hook or synthetic finalization path."
      },
      {
        title: "Scalability Plan",
        body: "For 50-100 members, the draw logic needs gas profiling. A direct cumulative scan over encrypted values may be expensive. A practical path is batching or grouping participants, then selecting within a smaller encrypted subset."
      },
      {
        title: "Fairness Documentation",
        body: "Docs should state the randomness source, how weights are computed, what is public, what remains encrypted, who can trigger a draw, and how the system prevents admin discretion from changing the winner."
      }
    ],
    rows: [
      ["Selection", "Onchain confidential draw"],
      ["Randomness", "Onchain confidential randomness target"],
      ["Output", "Winner event plus encrypted prize handle"],
      ["Limit", "Gas-profile before scaling beyond member cap"]
    ]
  },
  {
    slug: "production-boundaries",
    eyebrow: "06 / Limits",
    title: "Production Boundaries",
    summary: "What is live onchain now and what must be hardened before production claims.",
    status: "HONEST_LIMITS",
    sections: [
      {
        title: "Onchain-Ready",
        body: "The current product sends wallet-confirmed Sepolia transactions and uses Zama encrypted inputs for confidential deposits."
      },
      {
        title: "Must Be Hardened",
        body: "A production yield adapter, event indexer, keeper reliability, weighted confidential selection, and broader contract tests need more work before this can be presented as production-ready."
      },
      {
        title: "Judging Strategy",
        body: "The best judging position is to be precise: show the product, explain the confidential draw design, and clearly mark remaining engineering work without synthetic success paths."
      }
    ],
    rows: [
      ["Ready", "UI, routes, metadata API, club UX, encrypted deposit flow"],
      ["Risk", "Weighted encrypted winner selection cost"],
      ["Next", "Gas profiling, tests, event sync, audited yield adapter"],
      ["Messaging", "Do not overclaim final draw fairness until kernel is complete"]
    ]
  }
];

const docsBySlug = Object.fromEntries(docsTopics.map((topic) => [topic.slug, topic]));

function LandingPage({ goApp, goGlobal, goDocs }) {
  return (
    <>
      <main className="flex-grow pt-24 md:pt-28 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-20 md:gap-24">
        <section className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 min-h-[540px] relative">
          <div className="flex-1 flex flex-col gap-6 z-10">
            <h1 className="font-headline-xl text-[54px] sm:text-[70px] md:text-[88px] lg:text-[98px] leading-[1.0] text-veil-white font-bold tracking-tighter uppercase">
              The Confidential
              <br />
              <span className="text-veil-purple">Yield Layer</span>
            </h1>
            <p className="font-body-md text-body-md text-veil-white opacity-80 max-w-xl text-lg md:text-xl leading-relaxed">
              No-loss prize pools with end-to-end FHE encryption. Earn yield with 100% principal protection.
            </p>
            <div className="flex flex-wrap gap-4 mt-6">
              <VeilButton className="px-8 py-4 text-[15px]" onClick={goApp}>
                Launch App
              </VeilButton>
              <VeilButton className="px-8 py-4 text-[15px]" onClick={goGlobal} variant="secondary">
                Explore Global Pool
              </VeilButton>
            </div>
          </div>
          <Globe />
        </section>

        <section className="border-y border-veil-gray-light py-8">
          <div className="flex flex-wrap justify-between items-center gap-8 px-4">
            <StatBlock label="Protocol Type" value="No-Loss" status="YIELD_POOL" />
            <StatBlock label="Privacy Layer" value="FHEVM" status="ZAMA_FHE" />
            <StatBlock label="Token Standard" value="ERC-7984" status="CONFIDENTIAL" />
            <div className="flex flex-col gap-2">
              <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">Network Status</span>
              <StatusDot label="Encrypted" />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-0 border border-veil-gray-light">
          <FeatureCard
            borderClass="border-r border-b md:border-b-0"
            description="Deposit stablecoins into encrypted vaults. Interest generated is pooled and awarded securely to random winners."
            index="01"
            status="YIELD_GENERATION_ACTIVE"
            title="No-Loss Pools"
          />
          <FeatureCard
            borderClass="border-r border-b md:border-b-0"
            description="FHE keeps balances, deposits, odds, pool totals, and winnings confidential from public ledgers."
            index="02"
            status="FHE_HANDLES_VERIFIED"
            title="Complete Privacy"
          />
          <FeatureCard
            description="Form private clubs to pool capital and increase winning odds collaboratively, maintaining strict group anonymity."
            index="03"
            status="SYNDICATE_SYNC_ON"
            title="Social Yield"
          />
        </section>

        <LandingSection
          eyebrow="Architecture Stream"
          title="End-to-End Confidential Flow"
          body="Visualized pipeline showing capital encryption, yield stream, and private settlement."
        >
          <ConfidentialFlowDiagram />
        </LandingSection>

        <LandingSection
          eyebrow="Why Veil Clubs"
          title="Prize Saving Without Balance Doxxing"
          body="Social DeFi savings with total privacy: no public financial exposure."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border border-veil-gray-light">
            {landingAdvantages.map(([title, body], index) => (
              <LandingMiniCard body={body} index={String(index + 1).padStart(2, "0")} key={title} title={title} />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          body="The product has only two pool surfaces, keeping the app focused while still showing a real social use case."
          eyebrow="Pool Modes"
          layout="split"
          title="ONE PUBLIC DOOR, INFINITE PRIVATE TABLES"
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-veil-gray-light">
            {landingPoolModes.map((mode) => (
              <LandingPoolMode key={mode.label} mode={mode} />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          body="Enter privately, earn yield, run encrypted draws, and withdraw 100% principal anytime."
          eyebrow="Prize Cycle"
          layout="split"
          title="THE NO-LOSS LOOP"
        >
          <PrizeCycleDiagram />
        </LandingSection>

        <LandingSection
          eyebrow="Privacy Surface"
          title="Clear Claims, Interactive Simulation"
          body="Simulate public blockchain exposure vs. Veil FHE encryption in real-time. Toggle modes to see how sensitive financial state stays confidential."
        >
          <PrivacySimulationWidget />
        </LandingSection>

        <section className="border border-veil-gray-light bg-veil-gray-dark p-8 md:p-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-center">
          <div>
            <span className="font-label-caps text-label-caps text-veil-purple uppercase">Ready</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white uppercase mt-4">
              Enter The Confidential Yield Layer
            </h2>
            <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4 max-w-2xl">
              Launch the app for the live product flow, or read the docs for the deeper breakdown of pools, privacy, and prize draws.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <VeilButton onClick={goApp}>Launch App</VeilButton>
            <VeilButton onClick={goDocs} variant="secondary">Read Docs</VeilButton>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function LandingMiniCard({ body, index, title }) {
  return (
    <div className="bg-veil-gray-dark p-5 md:p-6 border-r border-b border-veil-gray-light flex flex-col gap-3 relative scramble-hover transition-colors duration-150">
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-5 right-5">{index}</span>
      <h3 className="font-headline-lg-mobile text-base md:text-lg text-veil-white font-bold uppercase mt-4 tracking-tight scramble-target" data-original={title}>
        {title}
      </h3>
      <p className="font-body-md text-veil-white/70 text-xs md:text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function ConfidentialFlowDiagram() {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      id: "deposit",
      number: "01",
      title: "Encrypted Deposit",
      subtitle: "FHEVM Encryption",
      desc: "User deposits cUSDC stablecoins. Balances & deposit amounts are encrypted on-chain using FHEVM keys.",
      tag: "USER_INPUT_ENCRYPTED",
      metric: "100.00 cUSDC",
      icon: "lock"
    },
    {
      id: "vault",
      number: "02",
      title: "Confidential Vault",
      subtitle: "Zero-Knowledge Pool",
      desc: "Vault pools user capital while hiding individual stakes, total pool value, and player winning odds from public ledgers.",
      tag: "ZK_STAKE_MASKED",
      metric: "Encrypted TVL",
      icon: "shield"
    },
    {
      id: "yield",
      number: "03",
      title: "Yield Engine",
      subtitle: "Aave / Compound Strategy",
      desc: "Vault principal generates interest continuously in decentralized lending markets to fund the prize pool.",
      tag: "YIELD_AUTO_COMPOUND",
      metric: "+8.4% APY Stream",
      icon: "trending_up"
    },
    {
      id: "draw",
      number: "04",
      title: "FHE Random Draw",
      subtitle: "Confidential Selection",
      desc: "Keeper triggers winner selection using FHE random draw algorithm without decrypting individual balances or odds.",
      tag: "KEEPER_TRIGGERED",
      metric: "Random Winner Selected",
      icon: "casino"
    },
    {
      id: "claim",
      number: "05",
      title: "Private Claim",
      subtitle: "No-Loss Settlement",
      desc: "Winner claims encrypted yield payout anonymously. All non-winning participants retain 100% of their initial principal.",
      tag: "SETTLEMENT_COMPLETE",
      metric: "100% Principal Retained",
      icon: "verified"
    }
  ];

  return (
    <div className="flex flex-col gap-6 relative overflow-hidden">
      <style>{`
        @keyframes borderThreadDash {
          0% { stroke-dashoffset: 40; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-border-thread-dash {
          stroke-dasharray: 12 8;
          animation: borderThreadDash 1s linear infinite;
        }
      `}</style>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-veil-gray-light">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-veil-purple animate-pulse" />
          <span className="font-label-caps text-label-caps text-veil-purple uppercase tracking-wider">Live Architecture Stream</span>
        </div>
        <div className="flex items-center gap-3 bg-veil-gray-dark px-4 py-2 border border-veil-gray-light font-data-sm text-data-sm text-veil-white opacity-80">
          <span>PROTOCOL STATE: FULLY ENCRYPTED</span>
        </div>
      </div>

      {/* Interactive Desktop Flow Diagram */}
      <div className="relative py-2 hidden lg:block">
        {/* Node Cards Grid */}
        <div className="grid grid-cols-5 gap-4 relative z-10">
          {steps.map((step, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                className={`flex flex-col justify-between p-5 text-left transition-all duration-300 relative h-[175px] ${
                  isActive
                    ? "bg-[#181224] shadow-[0_0_25px_rgba(168,85,247,0.45)] -translate-y-1"
                    : "bg-veil-gray-dark hover:bg-[#141419]"
                }`}
                key={step.id}
                onClick={() => setActiveStep(idx)}
                type="button"
              >
                {/* Perfect Fit SVG Border Thread Overlay */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none">
                  <rect
                    className={isActive ? "animate-border-thread-dash" : ""}
                    fill="none"
                    height="100%"
                    rx="0"
                    stroke={isActive ? "#c084fc" : "#27272a"}
                    strokeWidth={isActive ? "2.5" : "1"}
                    width="100%"
                    x="0"
                    y="0"
                  />
                </svg>

                <div className="flex flex-col gap-2 relative z-10">
                  <span className={`font-data-sm text-data-sm ${isActive ? "text-veil-purple font-bold" : "text-veil-white opacity-40"}`}>
                    {step.number}
                  </span>
                  <h4 className="font-headline-lg-mobile text-sm text-veil-white font-bold uppercase tracking-tight leading-snug min-h-[38px] flex items-center">
                    {step.title}
                  </h4>
                  <span className="font-label-caps text-[10px] text-veil-purple uppercase opacity-80 line-clamp-1">
                    {step.subtitle}
                  </span>
                </div>

                <div className={`pt-2 border-t text-[11px] font-mono relative z-10 ${isActive ? "border-veil-purple/40 text-veil-purple" : "border-veil-gray-light text-veil-white/60"}`}>
                  {step.metric}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mobile Vertical Flow */}
      <div className="flex flex-col gap-3 lg:hidden">
        {steps.map((step, idx) => (
          <button
            className={`p-4 border text-left flex items-center justify-between gap-4 transition-all ${
              activeStep === idx
                ? "bg-[#181224] border-veil-purple"
                : "bg-veil-gray-dark border-veil-gray-light"
            }`}
            key={step.id}
            onClick={() => setActiveStep(idx)}
            type="button"
          >
            <div className="flex items-center gap-3">
              <span className="font-data-sm text-veil-purple font-bold">{step.number}</span>
              <div>
                <h4 className="font-body-md text-veil-white font-bold text-sm uppercase">{step.title}</h4>
                <span className="font-label-caps text-xs text-veil-purple">{step.subtitle}</span>
              </div>
            </div>
            <span className="font-mono text-xs text-veil-white/70">{step.metric}</span>
          </button>
        ))}
      </div>

      {/* Active Node Detail Card */}
      <div className="bg-[#120d1c] border border-veil-purple/50 p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative h-[220px] md:h-[190px] overflow-hidden">
        <div className="flex flex-col justify-between h-full max-w-2xl flex-1">
          <div className="flex flex-col gap-1">
            <span className="font-data-sm text-xs text-veil-purple font-bold">
              NODE [{steps[activeStep].number}] : {steps[activeStep].tag}
            </span>
            <div className="flex flex-wrap items-baseline gap-3">
              <h4 className="font-headline-lg text-xl md:text-2xl text-veil-white font-bold uppercase tracking-tight">
                {steps[activeStep].title}
              </h4>
              <span className="font-mono text-xs md:text-sm text-veil-purple font-semibold uppercase">
                // {steps[activeStep].subtitle}
              </span>
            </div>
          </div>

          <p className="font-body-md text-veil-white/80 text-sm md:text-base leading-relaxed line-clamp-2">
            {steps[activeStep].desc}
          </p>
        </div>

        <div className="flex flex-col items-start md:items-end justify-center gap-2 shrink-0 border-t md:border-t-0 md:border-l border-veil-purple/30 pt-4 md:pt-0 md:pl-8 w-full md:w-auto h-full">
          <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">Current State Metric</span>
          <span className="font-mono text-xl font-bold text-veil-purple bg-veil-purple/10 px-4 py-2 border border-veil-purple/40">
            {steps[activeStep].metric}
          </span>
        </div>
      </div>
    </div>
  );
}

function PrizeCycleDiagram() {
  const steps = [
    {
      num: "01",
      title: "DEPOSIT",
      desc: "Enter pool with encrypted deposit. Chain sees activity, not balance."
    },
    {
      num: "02",
      title: "YIELD",
      desc: "Principal generates lending yield continuously into prize pool."
    },
    {
      num: "03",
      title: "DRAW",
      desc: "Scheduled FHE draw selects winner confidentially on-chain."
    },
    {
      num: "04",
      title: "CLAIM",
      desc: "Winner claims payout privately. Principal is 100% retained."
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 border border-veil-gray-light">
      {steps.map((step) => (
        <div
          className="p-5 md:p-6 bg-veil-black border-r border-b lg:border-b-0 last:border-r-0 border-veil-gray-light flex flex-col justify-start hover:bg-veil-gray-dark transition-colors duration-150"
          key={step.num}
        >
          <span className="font-data-sm text-data-sm text-veil-white opacity-40 text-right block mb-3">
            {step.num}
          </span>
          <h3 className="font-headline-lg text-lg md:text-xl text-veil-white font-bold uppercase mb-3 tracking-tight">
            {step.title}
          </h3>
          <p className="font-body-md text-veil-white/70 text-xs md:text-sm leading-relaxed">
            {step.desc}
          </p>
        </div>
      ))}
    </div>
  );
}

function PrivacySimulationWidget() {
  const [mode, setMode] = useState("veil");
  const [isDecrypted, setIsDecrypted] = useState(false);

  return (
    <div className="flex flex-col gap-6">
      {/* Mode Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-veil-gray-light">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-veil-purple animate-pulse" />
          <span className="font-label-caps text-label-caps text-veil-purple uppercase tracking-wider">Live Simulation Engine</span>
        </div>

        <div className="flex items-center bg-veil-gray-dark border border-veil-gray-light p-1">
          <button
            className={`px-4 py-2 text-xs font-mono transition-all ${
              mode === "public"
                ? "bg-red-950/80 text-red-400 border border-red-500/50 font-bold shadow-[0_0_15px_rgba(239,68,68,0.3)]"
                : "text-veil-white/60 hover:text-veil-white"
            }`}
            onClick={() => {
              setMode("public");
              setIsDecrypted(false);
            }}
            type="button"
          >
            PUBLIC LEDGER
          </button>
          <button
            className={`px-4 py-2 text-xs font-mono transition-all ${
              mode === "veil"
                ? "bg-veil-purple/20 text-veil-purple border border-veil-purple font-bold shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                : "text-veil-white/60 hover:text-veil-white"
            }`}
            onClick={() => setMode("veil")}
            type="button"
          >
            VEIL FHE PRIVACY
          </button>
        </div>
      </div>

      {/* Main Simulation Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <div className="flex flex-col gap-4">
          <div className="flex justify-between items-center bg-veil-gray-dark p-4 border border-veil-gray-light">
            <span className="font-data-sm text-xs text-veil-white/60 uppercase">SIMULATED DEPOSITOR</span>
            <span className="font-mono text-xs text-veil-white">VIP Club Vault Participant</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`p-5 border transition-all ${
                mode === "public"
                  ? "bg-red-950/20 border-red-500/40"
                  : "bg-[#140f1d] border-veil-purple/50"
              }`}
            >
              <span className="font-label-caps text-[10px] text-veil-white/50 uppercase block mb-1">
                DEPOSIT STAKE
              </span>
              <span
                className={`font-mono text-lg font-bold ${
                  mode === "public"
                    ? "text-red-400"
                    : isDecrypted
                    ? "text-green-400"
                    : "text-veil-purple tracking-widest"
                }`}
              >
                {mode === "public"
                  ? "$250,000.00 USDC"
                  : isDecrypted
                  ? "$250,000.00 (Owner Decrypted)"
                  : "0x8F2A...C19E"}
              </span>
              <span className="text-[11px] block opacity-60 mt-1">
                {mode === "public" ? "Public to all observers" : "Encrypted Ciphertext"}
              </span>
            </div>

            <div
              className={`p-5 border transition-all ${
                mode === "public"
                  ? "bg-red-950/20 border-red-500/40"
                  : "bg-[#140f1d] border-veil-purple/50"
              }`}
            >
              <span className="font-label-caps text-[10px] text-veil-white/50 uppercase block mb-1">
                WINNING ODDS
              </span>
              <span
                className={`font-mono text-lg font-bold ${
                  mode === "public"
                    ? "text-red-400"
                    : isDecrypted
                    ? "text-green-400"
                    : "text-veil-purple tracking-widest"
                }`}
              >
                {mode === "public"
                  ? "1 in 4.2 (23.8% Share)"
                  : isDecrypted
                  ? "1 in 4.2 (Owner Decrypted)"
                  : "encrypted"}
              </span>
              <span className="text-[11px] block opacity-60 mt-1">
                {mode === "public" ? "Calculated by public bots" : "Zero-Knowledge Masked"}
              </span>
            </div>
          </div>

          <div
            className={`p-5 border transition-all flex justify-between items-center ${
              mode === "public"
                ? "bg-red-950/20 border-red-500/40"
                : "bg-[#140f1d] border-veil-purple/50"
            }`}
          >
            <div>
              <span className="font-label-caps text-[10px] text-veil-white/50 uppercase block mb-1">
                PUBLIC ACCOUNT ADDRESS
              </span>
              <span className={`font-mono text-sm font-bold ${mode === "public" ? "text-red-400" : "text-veil-purple"}`}>
                {mode === "public" ? "0x7C21...BEEF (Doxxed Stake)" : "Anonymous Syndicate Member"}
              </span>
            </div>
            {mode === "veil" && (
              <button
                className="px-3 py-1.5 text-xs font-mono bg-veil-purple/20 text-veil-purple border border-veil-purple/50 hover:bg-veil-purple hover:text-white transition-colors"
                onClick={() => setIsDecrypted(!isDecrypted)}
                type="button"
              >
                {isDecrypted ? "Lock View" : "Permit Decrypt"}
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#0b0b0e] border border-veil-gray-light p-6 flex flex-col justify-between gap-4 font-mono text-xs">
          <div>
            <div className="flex justify-between items-center border-b border-veil-gray-light/60 pb-3 mb-4">
              <span className="text-veil-white/60 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${mode === "public" ? "bg-red-500 animate-ping" : "bg-green-400 animate-pulse"}`} />
                NETWORK OBSERVABILITY CONSOLE
              </span>
              <span className="text-veil-white/40">SIMULATION ENGINE</span>
            </div>

            {mode === "public" ? (
              <div className="flex flex-col gap-3 text-red-400/90 leading-relaxed">
                <p>[ALERT] Public ledger state detected.</p>
                <p>• MEV Bot Indexer: Account 0x7C21...BEEF logged with $250,000.00 stake.</p>
                <p>• Analytics Crawler: User financial odds exposed (23.8% pool share).</p>
                <p>• Security Risk: Public balance target for sandwiching and wallet profiling.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 text-veil-purple leading-relaxed">
                <p>[PROTECTED] FHEVM Confidential Layer Active.</p>
                <p>• MEV Bot Scan: Ciphertext handles 0x8F2A... returned. Balance unreadable.</p>
                <p>• Analytics Crawler: Winning odds hidden behind zero-knowledge encryption.</p>
                <p>• Security Status: Financial privacy preserved. Only wallet permit can decrypt.</p>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-veil-gray-light/60 flex justify-between items-center text-[11px] text-veil-white/50">
            <span>PROTOCOL: FHEVM ERC-7984</span>
            <span className={mode === "public" ? "text-red-400" : "text-green-400"}>
              {mode === "public" ? "STATUS: EXPOSED" : "STATUS: ENCRYPTED"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function LandingPoolMode({ mode }) {
  return (
    <article className="bg-veil-black p-8 md:p-10 border-r border-b lg:border-b-0 border-veil-gray-light min-h-[420px] flex flex-col justify-between scramble-hover transition-colors duration-150">
      <div>
        <span className="font-label-caps text-label-caps text-veil-purple uppercase">{mode.label}</span>
        <h3 className="font-headline-lg-mobile md:font-headline-lg text-2xl md:text-3xl text-veil-white font-bold uppercase mt-5 tracking-tight scramble-target" data-original={mode.title}>
          {mode.title}
        </h3>
        <p className="font-body-md text-veil-white/70 mt-5 text-sm md:text-base leading-relaxed">
          {mode.body}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-0 border border-veil-gray-light bg-[#141419] mt-8">
        {mode.points.map((point, idx) => (
          <div
            className={`p-4 font-data-sm text-[11px] leading-tight text-veil-white/90 uppercase flex items-center ${
              idx % 2 === 0 ? "border-r" : ""
            } ${idx < 2 ? "border-b" : ""} border-veil-gray-light`}
            key={point}
          >
            <span>&gt; {point}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function LandingStep({ body, number, title }) {
  return (
    <div className="p-8 border-r border-b border-veil-gray-light min-h-[260px] bg-veil-black flex flex-col gap-5 relative scramble-hover transition-colors duration-150">
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-6 right-6">{number}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white font-bold uppercase mt-8 tracking-tight scramble-target" data-original={title}>{title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70">{body}</p>
    </div>
  );
}

function DocsPage({ docsSection, navigate }) {
  const topic = docsBySlug[docsSection];

  if (topic) {
    return <DocsDetailPage navigate={navigate} topic={topic} />;
  }

  return (
    <>
      <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-16">
        <section className="border-y border-veil-gray-light py-12">
          <span className="font-label-caps text-label-caps text-veil-purple uppercase">Protocol Docs</span>
          <h1 className="font-headline-xl text-[44px] md:text-[64px] leading-tight text-veil-white font-bold tracking-tighter uppercase mt-4">
            Veil Clubs
            <br />
            Product Notes
          </h1>
          <p className="font-body-md text-body-md text-veil-white opacity-75 max-w-3xl text-lg mt-5">
            Choose a topic to inspect the product, privacy model, draw mechanism, and production boundaries in detail.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-0 border border-veil-gray-light">
          {docsTopics.map((item) => (
            <DocsTopicCard item={item} key={item.slug} navigate={navigate} />
          ))}
        </section>

        <LandingSection
          eyebrow="Reading Order"
          title="Recommended Path"
          body="Start with the product overview, then inspect product surfaces, privacy model, and prize draw mechanics before reviewing production boundaries."
        >
          <div className="border border-veil-gray-light">
            {docsTopics.map((item, index) => (
              <button
                className="grid grid-cols-[64px_1fr_auto] gap-4 w-full text-left p-5 border-b last:border-b-0 border-veil-gray-light hover:bg-veil-gray-dark transition-colors"
                key={item.slug}
                onClick={() => navigate(`/docs/${item.slug}`)}
                type="button"
              >
                <span className="font-data-sm text-data-sm text-veil-purple">{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className="font-data-sm text-data-sm text-veil-white uppercase">{item.title}</span>
                  <span className="block font-body-md text-body-md text-veil-white opacity-60 mt-1">{item.summary}</span>
                </span>
                <svg className="w-5 h-5 text-veil-white opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            ))}
          </div>
        </LandingSection>
      </main>
      <Footer />
    </>
  );
}

function DocsTopicCard({ item, navigate }) {
  return (
    <button
      className="bg-veil-gray-dark p-6 border-r border-b border-veil-gray-light min-h-[300px] text-left hover:bg-[#242424] scramble-hover transition-all duration-300"
      onClick={() => navigate(`/docs/${item.slug}`)}
      type="button"
    >
      <span className="font-label-caps text-label-caps text-veil-purple uppercase">{item.eyebrow}</span>
      <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase mt-5">{item.title}</h2>
      <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4">{item.summary}</p>
      <div className="mt-8 pt-4 border-t border-veil-gray-light flex items-center justify-between gap-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">{item.status}</span>
        <svg className="w-5 h-5 text-veil-white opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </button>
  );
}

function DocsDetailPage({ navigate, topic }) {
  return (
    <>
      <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-12">
        <section className="border-y border-veil-gray-light py-10">
          <button className="font-data-sm text-data-sm text-veil-white opacity-60 hover:opacity-100 uppercase mb-8" onClick={() => navigate("/docs")} type="button">
            &lt; Back to docs
          </button>
          <span className="block font-label-caps text-label-caps text-veil-purple uppercase">{topic.eyebrow}</span>
          <h1 className="font-headline-xl text-[44px] md:text-[64px] leading-tight text-veil-white font-bold tracking-tighter uppercase mt-4">
            {topic.title}
          </h1>
          <p className="font-body-md text-body-md text-veil-white opacity-75 max-w-3xl text-lg mt-5">{topic.summary}</p>
          <div className="mt-8">
            <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; {topic.status}</span>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-10">
          <aside className="lg:sticky lg:top-28 h-fit border border-veil-gray-light">
            <div className="px-5 py-4 border-b border-veil-gray-light">
              <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">Docs Index</span>
            </div>
            {docsTopics.map((item) => (
              <button
                className={`w-full text-left px-5 py-4 border-b last:border-b-0 border-veil-gray-light transition-colors ${
                  item.slug === topic.slug ? "bg-veil-purple text-veil-white" : "text-veil-white opacity-70 hover:opacity-100 hover:bg-veil-gray-dark"
                }`}
                key={item.slug}
                onClick={() => navigate(`/docs/${item.slug}`, { scrollToTop: false })}
                type="button"
              >
                <span className="font-label-caps text-label-caps uppercase">{item.title}</span>
              </button>
            ))}
          </aside>

          <article className="flex flex-col gap-8">
            {topic.sections.map((section, index) => (
              <section className="border border-veil-gray-light bg-veil-black" key={section.title}>
                <div className="grid grid-cols-1 md:grid-cols-[96px_1fr] border-b border-veil-gray-light">
                  <div className="bg-veil-gray-dark p-5">
                    <span className="font-data-sm text-data-sm text-veil-purple">{String(index + 1).padStart(2, "0")}</span>
                  </div>
                  <div className="p-5">
                    <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{section.title}</h2>
                  </div>
                </div>
                <div className="p-6 md:p-8">
                  <p className="font-body-md text-body-md text-veil-white opacity-75 text-lg leading-8">{section.body}</p>
                </div>
              </section>
            ))}

            <SpecPanel rows={topic.rows} title="Reference Notes" />

            <section className="border border-veil-gray-light bg-veil-gray-dark p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="font-label-caps text-label-caps text-veil-purple uppercase">Next Step</span>
                <p className="font-body-md text-body-md text-veil-white opacity-75 mt-2">Continue reading another section or launch the application workspace.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <VeilButton onClick={() => navigate("/docs")} variant="secondary">Docs Index</VeilButton>
                <VeilButton onClick={() => navigate(APP_ROUTES.dashboard)}>Launch App</VeilButton>
              </div>
            </section>
          </article>
        </section>
      </main>
      <Footer />
    </>
  );
}

function LandingBriefCard({ item }) {
  return (
    <article className="bg-veil-gray-dark p-6 border-r border-b border-veil-gray-light min-h-[320px]">
      <span className="font-label-caps text-label-caps text-veil-purple uppercase">{item.eyebrow}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase mt-4">{item.title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4">{item.body}</p>
      <div className="mt-6 flex flex-col gap-2">
        {item.bullets.map((bullet) => (
          <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase" key={bullet}>
            &gt; {bullet}
          </span>
        ))}
      </div>
    </article>
  );
}

function LandingSection({ body, children, eyebrow, title, layout = "banner" }) {
  if (layout === "split") {
    return (
      <section className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10 border-t border-veil-gray-light pt-12">
        <div>
          <span className="font-label-caps text-label-caps text-veil-purple uppercase">{eyebrow}</span>
          <h2 className="font-headline-lg text-headline-lg text-veil-white uppercase mt-4">{title}</h2>
          <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4">{body}</p>
        </div>
        <div>{children}</div>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8 border-t border-veil-gray-light pt-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-veil-gray-light/60 pb-6">
        <div className="max-w-xl">
          <span className="font-label-caps text-label-caps text-veil-purple uppercase tracking-wider">{eyebrow}</span>
          <h2 className="font-headline-lg text-headline-lg text-veil-white uppercase mt-2">{title}</h2>
        </div>
        {body && (
          <p className="font-body-md text-body-md text-veil-white opacity-70 max-w-xl text-base leading-relaxed">
            {body}
          </p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function SpecPanel({ rows, title }) {
  return (
    <div className="border border-veil-gray-light bg-veil-black">
      <div className="px-5 py-4 border-b border-veil-gray-light">
        <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{title}</span>
      </div>
      <div>
        {rows.map(([label, value]) => (
          <div className="grid grid-cols-[120px_1fr] gap-4 p-5 border-b last:border-b-0 border-veil-gray-light" key={label}>
            <span className="font-label-caps text-label-caps text-veil-purple uppercase">{label}</span>
            <span className="font-body-md text-body-md text-veil-white opacity-75">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessCard({ body, index, title }) {
  return (
    <div className="bg-veil-gray-dark p-6 border-r border-b border-veil-gray-light min-h-[220px]">
      <span className="font-data-sm text-data-sm text-veil-white opacity-40">{index}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase mt-6">{title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4">{body}</p>
    </div>
  );
}

function ArchitectureCard({ body, status, title }) {
  return (
    <div className="bg-veil-gray-dark p-6 border-r border-b lg:border-b-0 border-veil-gray-light min-h-[260px]">
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 mt-4">{body}</p>
      <div className="mt-8 pt-4 border-t border-veil-gray-light">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; {status}</span>
      </div>
    </div>
  );
}

function ToastNotification({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md bg-veil-black border border-veil-purple p-4 shadow-2xl animate-fade-in flex items-start gap-4">
      <div className="w-2 h-2 rounded-full bg-veil-purple mt-2 shrink-0 animate-pulse" />
      <div className="flex-1">
        <span className="font-label-caps text-label-caps text-veil-purple uppercase">{toast.title || "Protocol Event"}</span>
        <p className="font-data-sm text-data-sm text-veil-white mt-1 opacity-90">{toast.message}</p>
        {toast.txHash && (
          <a
            className="inline-flex items-center gap-1 mt-2 font-mono text-xs text-veil-purple underline hover:text-white"
            href={`https://sepolia.etherscan.io/tx/${toast.txHash}`}
            rel="noreferrer"
            target="_blank"
          >
            ↗ View Tx on Sepolia Etherscan ({toast.txHash.slice(0, 10)}...{toast.txHash.slice(-6)})
          </a>
        )}
      </div>
      <button className="font-data-sm text-data-sm text-veil-white opacity-40 hover:opacity-100" onClick={onClose} type="button">
        ✕
      </button>
    </div>
  );
}

const ZERO_BYTES32 = `0x${"0".repeat(64)}`;
const FAUCET_UNDERLYING_AMOUNT = 100_000_000n;
const TOKEN_DECIMALS = 6;
const MAX_EUINT64 = (1n << 64n) - 1n;
const DEFAULT_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const OPERATOR_APPROVAL_SECONDS = 24 * 60 * 60;
let fheSdkInitPromise;
let fheInstancePromise;

async function getFheInstance() {
  const { initSDK, createInstance, SepoliaConfig } = await import("@zama-fhe/relayer-sdk/web");
  fheSdkInitPromise ||= initSDK();
  await fheSdkInitPromise;
  fheInstancePromise ||= createInstance({
    ...SepoliaConfig,
    network: import.meta.env.VITE_SEPOLIA_RPC_URL || DEFAULT_SEPOLIA_RPC
  });
  return fheInstancePromise;
}

function parseTokenAmount(amount) {
  const units = parseUnits(String(amount).trim(), TOKEN_DECIMALS);
  if (units <= 0n) throw new Error("Amount must be greater than 0.");
  if (units > MAX_EUINT64) throw new Error("Amount is too large for euint64.");
  return units;
}

function operatorApprovalExpiry() {
  return Math.floor(Date.now() / 1000) + OPERATOR_APPROVAL_SECONDS;
}

async function encryptUint64Input(contractAddress, userAddress, amount) {
  const instance = await getFheInstance();
  const encrypted = await instance.createEncryptedInput(contractAddress, userAddress).add64(amount).encrypt();
  return {
    handle: toHex(encrypted.handles[0]),
    inputProof: toHex(encrypted.inputProof)
  };
}

async function userDecryptUint64({ handle, contractAddress, userAddress, walletClient }) {
  const instance = await getFheInstance();
  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const contractAddresses = [contractAddress];
  const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
  const types = {
    UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification
  };
  const signature = await walletClient.signTypedData({
    account: userAddress,
    domain: eip712.domain,
    types,
    primaryType: "UserDecryptRequestVerification",
    message: eip712.message
  });
  const result = await instance.userDecrypt(
    [{ handle, contractAddress }],
    keypair.privateKey,
    keypair.publicKey,
    signature.replace("0x", ""),
    contractAddresses,
    userAddress,
    startTimestamp,
    durationDays
  );
  return BigInt(result[handle] ?? result[handle.toLowerCase()] ?? 0);
}

const TEST_ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];
const CONFIDENTIAL_WRAPPER_ABI = [
  {
    inputs: [
      { internalType: "address", name: "to", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" }
    ],
    name: "wrap",
    outputs: [{ internalType: "euint64", name: "", type: "bytes32" }],
    stateMutability: "nonpayable",
    type: "function"
  }
];

function isUserRejectedRequest(error) {
  const seen = new Set();
  const stack = [error];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || seen.has(current)) continue;
    seen.add(current);

    const code = current.code;
    const message = `${current.shortMessage || ""} ${current.message || ""}`.toLowerCase();
    if (
      code === 4001 ||
      code === "ACTION_REJECTED" ||
      message.includes("user rejected") ||
      message.includes("user denied") ||
      message.includes("rejected the request") ||
      message.includes("rejected request") ||
      message.includes("request rejected") ||
      message.includes("user cancelled") ||
      message.includes("user canceled")
    ) {
      return true;
    }

    stack.push(current.cause);
    if (Array.isArray(current.details)) {
      stack.push(...current.details);
    }
  }

  return false;
}

function txErrorMessage(error, fallback = "Transaction failed. Please try again.") {
  if (isUserRejectedRequest(error)) {
    return "Bạn đã hủy giao dịch trong ví. Chưa có thao tác nào được thực hiện.";
  }
  return error?.shortMessage || error?.message || fallback;
}

function AppWorkspace({ activePage, navigatePage, onFaucet }) {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [toast, setToast] = useState(null);
  const [poolsState, setPoolsState] = useState(defaultPools);
  const [drawsState, setDrawsState] = useState(defaultDrawHistory);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [userDeposit, setUserDeposit] = useState(0);
  const [walletBalance, setWalletBalance] = useState(0);
  const toastTimerRef = useRef(null);

  const closeToast = () => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  };

  const showToast = (title, message, txHash = null, options = {}) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }

    setToast({ title, message, txHash });
    const duration = options.duration ?? (txHash ? 60000 : 15000);
    if (duration) {
      toastTimerRef.current = window.setTimeout(() => {
        toastTimerRef.current = null;
        setToast(null);
      }, duration);
    }
  };

  const getDisplayBalance = (value) => Number(value || 0).toLocaleString(undefined, {
    maximumFractionDigits: 6
  });

  const submitContractTx = async ({ signingTitle, signingMessage, confirmedTitle, confirmedMessage, ...request }) => {
    if (!walletClient) {
      throw new Error("Wallet client is not ready. Reconnect your wallet and try again.");
    }

    showToast(signingTitle, signingMessage, null, { duration: null });
    const txHash = await walletClient.writeContract({
      account: address,
      ...request
    });

    if (!txHash) {
      throw new Error("Wallet did not return a transaction hash.");
    }

    showToast("Transaction Submitted", "Waiting for Sepolia confirmation...", txHash);

    if (!publicClient) {
      return { txHash, receipt: null };
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    if (receipt.status !== "success") {
      throw new Error("Transaction reverted onchain.");
    }

    showToast(confirmedTitle, confirmedMessage, txHash);
    return { txHash, receipt };
  };

  const handleFaucet = async () => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before requesting cUSDC.");
      return;
    }

    if (!IS_TOKEN_CONFIGURED) {
      showToast("Faucet Not Configured", "Missing VITE_VEIL_TOKEN_ADDRESS. Faucet cannot mint onchain cUSDC yet.");
      return;
    }

    try {
      await submitContractTx({
        signingTitle: "Faucet Step 1/3",
        signingMessage: "Mint 100 Sepolia USDC test tokens from Zama's official underlying token.",
        confirmedTitle: "Underlying Minted",
        confirmedMessage: "Minted 100 Sepolia USDC. Next: approve the confidential wrapper.",
        address: VEIL_UNDERLYING_TOKEN_ADDRESS,
        abi: TEST_ERC20_ABI,
        functionName: "mint",
        args: [address, FAUCET_UNDERLYING_AMOUNT]
      });
      await submitContractTx({
        signingTitle: "Faucet Step 2/3",
        signingMessage: "Approve Zama's cUSDC wrapper to wrap your 100 USDC.",
        confirmedTitle: "Wrapper Approved",
        confirmedMessage: "Approved wrapper. Next: wrap into confidential cUSDC.",
        address: VEIL_UNDERLYING_TOKEN_ADDRESS,
        abi: TEST_ERC20_ABI,
        functionName: "approve",
        args: [VEIL_TOKEN_ADDRESS, FAUCET_UNDERLYING_AMOUNT]
      });
      await submitContractTx({
        signingTitle: "Faucet Step 3/3",
        signingMessage: "Wrap 100 USDC into official Zama cUSDC.",
        confirmedTitle: "Faucet Confirmed",
        confirmedMessage: "Wrapped 100 USDC into confidential cUSDC on Sepolia.",
        address: VEIL_TOKEN_ADDRESS,
        abi: CONFIDENTIAL_WRAPPER_ABI,
        functionName: "wrap",
        args: [address, FAUCET_UNDERLYING_AMOUNT]
      });
      setIsDecrypted(false);
    } catch (err) {
      console.warn("Onchain faucet failed:", err);
      showToast(isUserRejectedRequest(err) ? "Faucet Cancelled" : "Faucet Failed", txErrorMessage(err, "Failed to mint faucet tokens."));
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [clubsRes, drawsRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/clubs`),
          fetch(`${BACKEND_URL}/api/draws`)
        ]);
        if (clubsRes.ok) {
          const clubsData = await clubsRes.json();
          if (isMounted && Array.isArray(clubsData.clubs) && clubsData.clubs.length > 0) {
            setPoolsState(
              clubsData.clubs.map((c) => ({
                id: c.id,
                name: c.name,
                scope: c.scope,
                contractId: c.contractClubId ?? c.contractId ?? (c.id === "global" ? "0" : null),
                tvl: c.encryptedTvlHandle || "encrypted",
                members: String(c.memberCount ?? 0),
                draw: c.nextDrawAt ? new Date(c.nextDrawAt).toLocaleString() : "24H 00M",
                prize: "•••••• USDC",
                status: c.status || "ACTIVE"
              }))
            );
          }
        }
        if (drawsRes.ok) {
          const drawsData = await drawsRes.json();
          if (isMounted && Array.isArray(drawsData.draws)) {
            setDrawsState(
              drawsData.draws.map((d) => [
                `#${String(d.drawNumber || d.id).padStart(4, "0")}`,
                d.clubName || "Global Pool",
                d.winner || "Hidden winner",
                d.prizeHandle || "encrypted",
                d.status || "SETTLED"
              ])
            );
          }
        }
      } catch (err) {
        console.warn("Backend sync fallback:", err);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleDeposit = async (amount, poolName = "Global Pool", clubId = 0n) => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before depositing.");
      return;
    }

    if (!IS_CONTRACT_CONFIGURED) {
      showToast("Deposit Not Configured", "Missing VITE_VEIL_CLUBS_ADDRESS. Deploy VeilClubs before depositing.");
      return;
    }

    if (!publicClient) {
      showToast("RPC Not Ready", "Sepolia RPC client is not ready yet. Please try again in a moment.");
      return;
    }

    try {
      const units = parseTokenAmount(amount || "100");
      const poolIsOperator = await publicClient.readContract({
        address: VEIL_TOKEN_ADDRESS,
        abi: VeilTokenABI,
        functionName: "isOperator",
        args: [address, VEIL_CLUBS_ADDRESS]
      });

      if (!poolIsOperator) {
        await submitContractTx({
          signingTitle: "Authorizing Pool",
          signingMessage: "Confirm 24-hour cUSDC operator access so VeilClubs can move your encrypted deposit.",
          confirmedTitle: "Pool Authorized",
          confirmedMessage: "VeilClubs is authorized to submit your encrypted cUSDC deposit.",
          address: VEIL_TOKEN_ADDRESS,
          abi: VeilTokenABI,
          functionName: "setOperator",
          args: [VEIL_CLUBS_ADDRESS, operatorApprovalExpiry()]
        });
      }

      showToast("Encrypting Deposit", `Creating a real Zama encrypted input proof for ${poolName}.`);
      const encrypted = await encryptUint64Input(VEIL_CLUBS_ADDRESS, address, units);
      await submitContractTx({
        signingTitle: "Depositing",
        signingMessage: "Confirm the encrypted cUSDC deposit transaction in your wallet.",
        confirmedTitle: "Deposit Confirmed",
        confirmedMessage: `Encrypted cUSDC deposit confirmed for ${poolName}.`,
        address: VEIL_CLUBS_ADDRESS,
        abi: VeilClubsABI,
        functionName: "deposit",
        args: [BigInt(clubId), encrypted.handle, encrypted.inputProof]
      });
      setUserDeposit((prev) => prev + Number(formatUnits(units, TOKEN_DECIMALS)));
      setIsDecrypted(false);
    } catch (err) {
      console.warn("Encrypted deposit failed:", err);
      showToast(isUserRejectedRequest(err) ? "Deposit Cancelled" : "Deposit Failed", txErrorMessage(err, "Failed to submit encrypted deposit."));
    }
  };

  const handleTriggerDraw = async (poolName = "Global Pool") => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before triggering a draw.");
      return;
    }

    if (!IS_CONTRACT_CONFIGURED) {
      showToast("Draw Not Configured", "Missing VITE_VEIL_CLUBS_ADDRESS. Deploy VeilClubs before triggering draws.");
      return;
    }

    if (isConnected && IS_CONTRACT_CONFIGURED) {
      try {
        await submitContractTx({
          signingTitle: "Triggering Draw",
          signingMessage: "Confirm the FHE draw transaction in your wallet.",
          confirmedTitle: "Draw Confirmed",
          confirmedMessage: `FHE draw transaction confirmed for ${poolName}.`,
          address: VEIL_CLUBS_ADDRESS,
          abi: VeilClubsABI,
          functionName: "triggerDraw",
          args: [0n, ZERO_BYTES32]
        });
      } catch (err) {
        showToast(isUserRejectedRequest(err) ? "Draw Cancelled" : "Draw Error", txErrorMessage(err, "Failed to trigger draw."));
      }
      return;
    }
  };

  const handleDecrypt = async () => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before decrypting balances.");
      return;
    }

    if (!walletClient || !publicClient) {
      showToast("Wallet Not Ready", "Wallet client is not ready for EIP-712 user decryption.");
      return;
    }

    try {
      showToast("Reading Handles", "Reading confidential balance handles from Sepolia.");
      const walletHandle = await publicClient.readContract({
        address: VEIL_TOKEN_ADDRESS,
        abi: VeilTokenABI,
        functionName: "confidentialBalanceOf",
        args: [address],
        account: address
      });
      const principalHandle = IS_CONTRACT_CONFIGURED
        ? await publicClient.readContract({
            address: VEIL_CLUBS_ADDRESS,
            abi: VeilClubsABI,
            functionName: "encryptedPrincipalOf",
            args: [0n, address],
            account: address
          })
        : null;

      showToast("Decrypt Request", "Sign the EIP-712 request to decrypt only your own allowed handles.");
      const decryptedWallet = await userDecryptUint64({
        handle: walletHandle,
        contractAddress: VEIL_TOKEN_ADDRESS,
        userAddress: address,
        walletClient
      });
      const decryptedPrincipal = principalHandle
        ? await userDecryptUint64({
            handle: principalHandle,
            contractAddress: VEIL_CLUBS_ADDRESS,
            userAddress: address,
            walletClient
          })
        : 0n;

      setWalletBalance(Number(formatUnits(decryptedWallet, TOKEN_DECIMALS)));
      setUserDeposit(Number(formatUnits(decryptedPrincipal, TOKEN_DECIMALS)));
      setIsDecrypted(true);
      showToast(
        "Decrypted",
        `Wallet: ${formatUnits(decryptedWallet, TOKEN_DECIMALS)} cUSDC | Principal: ${formatUnits(decryptedPrincipal, TOKEN_DECIMALS)} cUSDC`
      );
    } catch (err) {
      console.warn("User decrypt failed:", err);
      showToast(isUserRejectedRequest(err) ? "Decrypt Cancelled" : "Decrypt Failed", txErrorMessage(err, "Failed to decrypt your confidential balances."));
    }
  };

  const handleClaim = async () => {
    if (isClaimed) {
      showToast("Already Claimed", "You have already claimed all pending prizes for this draw.");
      return;
    }
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before claiming prizes.");
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      showToast("Claim Not Configured", "Missing VITE_VEIL_CLUBS_ADDRESS. Deploy VeilClubs before claiming.");
      return;
    }
    if (isConnected && IS_CONTRACT_CONFIGURED) {
      try {
        await submitContractTx({
          signingTitle: "Claiming Prize",
          signingMessage: "Confirm the prize claim transaction in your wallet.",
          confirmedTitle: "Prize Claimed",
          confirmedMessage: "Prize claim confirmed on Sepolia.",
          address: VEIL_CLUBS_ADDRESS,
          abi: VeilClubsABI,
          functionName: "claimPrize",
          args: [0n, 1n]
        });
        setIsClaimed(true);
      } catch (err) {
        showToast(isUserRejectedRequest(err) ? "Claim Cancelled" : "Claim Error", txErrorMessage(err, "Failed to claim prize."));
      }
    }
  };

  const handleWithdraw = async () => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before withdrawing.");
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      showToast("Withdraw Not Configured", "Missing VITE_VEIL_CLUBS_ADDRESS. Deploy VeilClubs before withdrawing.");
      return;
    }
    if (isConnected && IS_CONTRACT_CONFIGURED) {
      try {
        await submitContractTx({
          signingTitle: "Withdrawing",
          signingMessage: "Confirm the principal withdrawal transaction in your wallet.",
          confirmedTitle: "Withdrawal Confirmed",
          confirmedMessage: "Principal withdrawal confirmed on Sepolia.",
          address: VEIL_CLUBS_ADDRESS,
          abi: VeilClubsABI,
          functionName: "withdrawPrincipal",
          args: [0n]
        });
        setUserDeposit(0);
        setIsDecrypted(false);
      } catch (err) {
        showToast(isUserRejectedRequest(err) ? "Withdraw Cancelled" : "Withdraw Error", txErrorMessage(err, "Failed to withdraw."));
      }
    }
  };

  const handleCreateClub = async (name) => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before creating a club.");
      return;
    }
    if (!IS_CONTRACT_CONFIGURED) {
      showToast("Create Not Configured", "Missing VITE_VEIL_CLUBS_ADDRESS. Deploy VeilClubs before creating clubs.");
      return;
    }

    if (isConnected && IS_CONTRACT_CONFIGURED) {
      try {
        const { txHash, receipt } = await submitContractTx({
          signingTitle: "Creating Club",
          signingMessage: "Confirm the private club creation transaction in your wallet.",
          confirmedTitle: "Club Created Onchain",
          confirmedMessage: "Private club creation confirmed on Sepolia.",
          address: VEIL_CLUBS_ADDRESS,
          abi: VeilClubsABI,
          functionName: "createClub",
          args: [name || "Private Club", "Confidential Club", 25n, 604800n, true]
        });
        const clubCreatedLog = receipt?.logs
          ?.map((log) => {
            try {
              return decodeEventLog({ abi: VeilClubsABI, data: log.data, topics: log.topics });
            } catch {
              return null;
            }
          })
          .find((log) => log?.eventName === "ClubCreated");
        const contractClubId = clubCreatedLog?.args?.clubId?.toString();
        if (!contractClubId) {
          showToast("Club Created Onchain", "Club tx confirmed, but the ClubCreated event was not found. Refresh the indexer before adding metadata.");
          return;
        }

        const res = await fetch(`${BACKEND_URL}/api/clubs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name || "Encrypted Club",
            scope: "PRIVATE",
            admin: address,
            keeper: address,
            txHash,
            contractClubId
          })
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || "Backend rejected club metadata.");
        }
        const data = await res.json();
        const created = data.club;
        const newClub = {
          id: created.id,
          contractId: created.contractClubId,
          name: created.name,
          scope: created.scope,
          tvl: created.encryptedTvlHandle || "encrypted",
          members: String(created.memberCount || 1),
          draw: "07D 00H",
          prize: "•••••• USDC",
          status: created.status || "ACTIVE"
        };
        setPoolsState((prev) => [...prev, newClub]);
        showToast("Private Club Synced", `Created "${newClub.name}" onchain and synced public metadata.`, txHash);
        return;
      } catch (err) {
        showToast(isUserRejectedRequest(err) ? "Create Cancelled" : "Create Failed", txErrorMessage(err, "Failed to create club."));
        return;
      }
    }
  };

  const handleJoinClub = async (inviteCode) => {
    if (!isConnected || !address) {
      showToast("Wallet Required", "Connect your Sepolia wallet before joining a club.");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode })
      });
      if (res.ok) {
        const data = await res.json();
        showToast("Joined Club", `Joined ${data.club.name} via invite ${inviteCode}.`);
        return;
      }
      showToast("Invite Invalid", "Invite code was not accepted by the backend.");
    } catch (e) {
      showToast("Join Failed", "Could not validate invite code with the backend.");
    }
  };

  return (
    <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <ToastNotification onClose={closeToast} toast={toast} />

      <section className="bg-veil-black">
        {activePage === "dashboard" ? (
          <DashboardPage
            isClaimed={isClaimed}
            isDecrypted={isDecrypted}
            navigatePage={navigatePage}
            onDecrypt={handleDecrypt}
            onFaucet={handleFaucet}
            pools={poolsState}
            userDeposit={getDisplayBalance(userDeposit)}
            walletBalance={getDisplayBalance(walletBalance)}
          />
        ) : null}
        {activePage === "global" ? (
          <GlobalPoolPage
            isDecrypted={isDecrypted}
            onDecrypt={handleDecrypt}
            onDeposit={handleDeposit}
            onTriggerDraw={() => handleTriggerDraw("Global Pool")}
            walletBalance={isDecrypted ? getDisplayBalance(walletBalance) : null}
          />
        ) : null}
        {activePage === "clubs" ? (
          <PrivateClubsPage
            clubs={poolsState}
            isDecrypted={isDecrypted}
            onCreateClub={handleCreateClub}
            onDecrypt={handleDecrypt}
            onDeposit={handleDeposit}
            onJoinClub={handleJoinClub}
            onTriggerDraw={handleTriggerDraw}
            walletBalance={isDecrypted ? getDisplayBalance(walletBalance) : null}
          />
        ) : null}
        {activePage === "draws" ? (
          <DrawsPage draws={drawsState} onTriggerDraw={() => handleTriggerDraw("Global Pool")} />
        ) : null}
        {activePage === "account" ? (
          <AccountPage
            isClaimed={isClaimed}
            isDecrypted={isDecrypted}
            onClaim={handleClaim}
            onDecrypt={handleDecrypt}
            onFaucet={handleFaucet}
            onWithdraw={handleWithdraw}
            userDeposit={getDisplayBalance(userDeposit)}
            walletBalance={getDisplayBalance(walletBalance)}
          />
        ) : null}
      </section>
    </main>
  );
}

function PageHeader({ kicker, title, body, action }) {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
      <div className="max-w-3xl">
        <span className="font-label-caps text-label-caps text-veil-purple uppercase">{kicker}</span>
        <h1 className="font-headline-lg text-headline-lg text-veil-white uppercase mt-3">{title}</h1>
        <p className="font-body-md text-body-md text-veil-white opacity-70 mt-3">{body}</p>
      </div>
      {action}
    </div>
  );
}

function DashboardPage({ navigatePage, pools, isDecrypted, isClaimed, userDeposit, onDecrypt, onFaucet, walletBalance }) {
  return (
    <div>
      <PageHeader
        body="Track your encrypted principal, private winnings, active clubs, and the next no-loss draw without exposing sensitive financial data."
        kicker="Private Terminal"
        title="Your Confidential Position"
        action={
          <div className="flex flex-wrap gap-3">
            <VeilButton onClick={onFaucet} variant="secondary">
              Get Faucet
            </VeilButton>
            <VeilButton onClick={onDecrypt} variant="secondary">
              {isDecrypted ? "Refresh Decrypt" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton onClick={() => navigatePage("global")}>Deposit</VeilButton>
          </div>
        }
      />
      <section className="grid grid-cols-1 md:grid-cols-5 gap-0 border border-veil-gray-light">
        <MetricCard
          label="Wallet cUSDC"
          value={isDecrypted ? `${walletBalance} cUSDC` : "••••••"}
          status={isDecrypted ? "USER_DECRYPTED" : "USER_DECRYPT_ONLY"}
        />
        <MetricCard
          label="Encrypted Principal"
          value={isDecrypted ? `${userDeposit} USDC` : "••••••"}
          status={isDecrypted ? "DECRYPTED_OK" : "USER_DECRYPT_ONLY"}
        />
        <MetricCard
          label="Claimable Winnings"
          value={isDecrypted ? (isClaimed ? "0.00 USDC" : "0.00 USDC") : "••••••"}
          status={isDecrypted ? (isClaimed ? "CLAIMED" : "READY_TO_CLAIM") : "EIP712_REQUIRED"}
        />
        <MetricCard label="Active Pools" value={`0${pools.length}`} status="GLOBAL_PLUS_CLUBS" />
        <MetricCard label="Next Draw" value="06H 14M" status="KEEPER_WINDOW" />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-8">
        <Panel title="Active Positions">
          <PoolTable rows={pools} />
        </Panel>
        <Panel title="Encrypted Actions">
          <ActionStack />
        </Panel>
      </section>
    </div>
  );
}

function GlobalPoolPage({ isDecrypted, onDecrypt, onDeposit, onTriggerDraw, walletBalance }) {
  return (
    <div>
      <PageHeader
        body="The public entry pool for onboarding. Anyone can deposit encrypted cUSDC and join confidential prize draws without exposing balances."
        kicker="Public Pool"
        title="Global No-Loss Pool"
        action={
          <div className="flex flex-wrap gap-3">
            <VeilButton onClick={onTriggerDraw} variant="secondary">
              Trigger FHE Draw
            </VeilButton>
            <VeilButton onClick={() => onDeposit(100, "Global Pool")}>Quick Deposit 100 USDC</VeilButton>
          </div>
        }
      />
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-veil-gray-light mb-8">
        <MetricCard label="Encrypted TVL" value="encrypted" status="TOTAL_HIDDEN" />
        <MetricCard label="Members" value="0" status="PUBLIC_COUNT" />
        <MetricCard label="Yield Strategy" value="ONCHAIN" status="CONFIG_REQUIRED" />
        <MetricCard label="Prize" value="••••••" status="WINNER_DECRYPTS" />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Deposit Flow">
          <TransactionForm isDecrypted={isDecrypted} mode="global" onDecrypt={onDecrypt} onDeposit={onDeposit} walletBalance={walletBalance} />
        </Panel>
        <Panel title="Draw Engine">
          <DrawEngine />
        </Panel>
      </section>
    </div>
  );
}

function PrivateClubsPage({ clubs, isDecrypted, onCreateClub, onDecrypt, onJoinClub, onDeposit, onTriggerDraw, walletBalance }) {
  const privateClubs = clubs.filter((pool) => pool.scope === "PRIVATE");
  const [selectedClub, setSelectedClub] = useState(privateClubs[0] || clubs[0]);

  return (
    <div>
      <PageHeader
        body="Create or join invitation-only prize pools. Each club has independent encrypted deposits, private odds, yield routing, and confidential prize claims."
        kicker="Social Yield"
        title="Private Clubs"
        action={<VeilButton onClick={() => onCreateClub("Sovereign Alpha")}>+ Quick New Club</VeilButton>}
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Club Directory">
          <div className="flex flex-col border border-veil-gray-light">
            {privateClubs.map((club) => (
              <button
                className={`grid grid-cols-2 md:grid-cols-[1fr_120px_120px] gap-4 text-left p-5 border-b last:border-b-0 border-veil-gray-light hover:bg-veil-gray-dark transition-colors ${
                  selectedClub?.id === club.id ? "bg-veil-gray-dark" : ""
                }`}
                key={club.id}
                onClick={() => setSelectedClub(club)}
                type="button"
              >
                <div>
                  <span className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{club.name}</span>
                  <p className="font-data-sm text-data-sm text-veil-white opacity-50 mt-2">invite: VC-{club.id.toUpperCase()}</p>
                </div>
                <DataCell label="members" value={club.members} />
                <DataCell label="draw" value={club.draw} />
              </button>
            ))}
          </div>
        </Panel>
        <Panel title="Selected Club">
          <ClubDetail
            club={selectedClub}
            isDecrypted={isDecrypted}
            onDecrypt={onDecrypt}
            onDeposit={(amt) => onDeposit(amt, selectedClub?.name || "Private Club", selectedClub?.contractId || 0n)}
            onTriggerDraw={() => onTriggerDraw(selectedClub?.name || "Private Club")}
            walletBalance={walletBalance}
          />
        </Panel>
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Panel title="Create Private Club">
          <ClubForm onCreate={onCreateClub} />
        </Panel>
        <Panel title="Join By Invite">
          <InviteForm onJoin={onJoinClub} />
        </Panel>
      </section>
    </div>
  );
}

function DrawsPage({ draws, onTriggerDraw }) {
  return (
    <div>
      <PageHeader
        body="Draws execute onchain over confidential pool state. The frontend only receives public events and ciphertext handles until an authorized user decrypts."
        kicker="Prize Draw"
        title="Confidential Draw History"
        action={<VeilButton onClick={onTriggerDraw}>Trigger FHE Draw</VeilButton>}
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <Panel title="Recent Draws">
          <DataTable
            columns={["draw", "pool", "winner", "prize handle", "status"]}
            rows={draws}
          />
        </Panel>
        <Panel title="Privacy Surface">
          <PrivacyList />
        </Panel>
      </section>
    </div>
  );
}

function AccountPage({ isDecrypted, isClaimed, userDeposit, onDecrypt, onClaim, onFaucet, onWithdraw, walletBalance }) {
  return (
    <div>
      <PageHeader
        body="Your wallet controls decryption. Balances, winnings, and odds remain ciphertext until you request an EIP-712 user decrypt."
        kicker="Wallet Console"
        title="Account And Claims"
        action={<ConnectWalletButton />}
      />
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Decrypt Center">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-veil-gray-light">
            <MetricCard
              label="Wallet cUSDC"
              value={`${walletBalance}.00`}
              status="AVAILABLE_BALANCE"
            />
            <MetricCard
              label="Global Balance"
              value={isDecrypted ? `${userDeposit}.00 USDC` : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Club Balance"
              value={isDecrypted ? "0.00 USDC" : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Pending Prize"
              value={isDecrypted ? (isClaimed ? "0.00 USDC" : "0.00 USDC") : "••••••"}
              status={isClaimed ? "CLAIMED" : "NO_PENDING_PRIZE"}
            />
            <MetricCard
              label="Odds"
              value={isDecrypted ? "0.0%" : "••••••"}
              status="CONFIDENTIAL"
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <VeilButton onClick={onFaucet} variant="secondary">
              Get Faucet 100 cUSDC
            </VeilButton>
            <VeilButton onClick={onDecrypt}>
              {isDecrypted ? "Re-decrypt Balance" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton disabled={isClaimed} onClick={onClaim} variant="secondary">
              {isClaimed ? "Prize Claimed" : "Claim Prize"}
            </VeilButton>
            <VeilButton disabled={userDeposit <= 0} onClick={onWithdraw} variant="secondary">
              Withdraw Principal
            </VeilButton>
          </div>
        </Panel>
        <Panel title="Transaction Queue">
          <ActionStack />
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({ label, value, status }) {
  return (
    <div className="bg-veil-gray-dark p-6 border-r border-b last:border-r-0 border-veil-gray-light min-h-[132px]">
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <div className="font-data-display text-data-display text-veil-white font-bold mt-4">{value}</div>
      <div className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase mt-2">&gt; {status}</div>
    </div>
  );
}

function Panel({ children, title }) {
  return (
    <section className="bg-veil-black border border-veil-gray-light">
      <div className="px-5 py-4 border-b border-veil-gray-light">
        <span className="font-label-caps text-label-caps text-veil-white opacity-60 uppercase">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function PoolTable({ rows }) {
  return (
    <div className="overflow-x-auto border border-veil-gray-light">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="bg-veil-gray-dark">
            {["pool", "scope", "encrypted tvl", "members", "next draw", "status"].map((column) => (
              <th className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase text-left p-4 border-b border-veil-gray-light" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="hover:bg-veil-gray-dark transition-colors" key={row.id}>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light uppercase">{row.name}</td>
              <td className="font-data-sm text-data-sm text-veil-white opacity-70 p-4 border-b border-veil-gray-light">{row.scope}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">{row.tvl}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">{row.members}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">{row.draw}</td>
              <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light">&gt; {row.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto border border-veil-gray-light">
      <table className="w-full min-w-[760px] border-collapse">
        <thead>
          <tr className="bg-veil-gray-dark">
            {columns.map((column) => (
              <th className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase text-left p-4 border-b border-veil-gray-light" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr className="hover:bg-veil-gray-dark transition-colors" key={row[0]}>
              {row.map((cell) => (
                <td className="font-data-sm text-data-sm text-veil-white p-4 border-b border-veil-gray-light" key={cell}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TransactionForm({ isDecrypted, mode, onDecrypt, onDeposit, walletBalance }) {
  const [amount, setAmount] = useState("100.00");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
      <div>
        <LabelInput label="Amount" onChange={(e) => setAmount(e.target.value)} placeholder="100.00" value={amount} />
        <div className="flex flex-wrap items-center gap-2 mt-2 ml-1">
          <p className="font-data-sm text-data-sm text-veil-purple">
            Balance: {isDecrypted && walletBalance != null ? `${walletBalance} cUSDC` : "hidden"}
          </p>
          {!isDecrypted && (
            <button className="font-data-sm text-data-sm text-veil-white underline opacity-70 hover:opacity-100" onClick={onDecrypt} type="button">
              Decrypt Balance
            </button>
          )}
        </div>
      </div>
      <LabelInput label="Token" placeholder="cUSDC" value="cUSDC (ERC-7984)" />
      <VeilButton className="h-[50px]" onClick={() => onDeposit && onDeposit(amount, mode === "global" ? "Global Pool" : "Private Club")}>
        Encrypt Deposit
      </VeilButton>
      <div className="md:col-span-3 border border-veil-gray-light bg-veil-gray-dark p-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">
          &gt; {mode === "global" ? "GLOBAL_POOL" : "PRIVATE_CLUB"} :: amount encrypted client-side, proof submitted onchain
        </span>
      </div>
    </div>
  );
}

function LabelInput({ label, placeholder, value, onChange }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <input
        className="bg-veil-gray-dark border border-veil-gray-light text-veil-white font-data-sm text-data-sm px-4 py-4 focus:border-veil-purple focus:ring-0"
        onChange={onChange}
        placeholder={placeholder}
        value={value}
      />
    </label>
  );
}

function DrawEngine() {
  const steps = [
    ["01", "Read encrypted balances", "euint64 weights stay confidential onchain"],
    ["02", "Generate FHE randomness", "FHE.randEuint64 bounded entropy on Sepolia"],
    ["03", "Homomorphic selection", "FHE.select multiplexer selects winner in ciphertext"],
    ["04", "Grant ACL decryption", "FHE.allow grants decryption ONLY to winner"]
  ];

  return (
    <div className="flex flex-col border border-veil-gray-light">
      {steps.map(([number, title, body]) => (
        <div className="grid grid-cols-[56px_1fr] gap-4 p-4 border-b last:border-b-0 border-veil-gray-light" key={number}>
          <span className="font-data-sm text-data-sm text-veil-purple">{number}</span>
          <div>
            <p className="font-data-sm text-data-sm text-veil-white uppercase">{title}</p>
            <p className="font-body-md text-body-md text-veil-white opacity-60 mt-1">{body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function ClubDetail({ club, isDecrypted, onDecrypt, onDeposit, onTriggerDraw, walletBalance }) {
  if (!club) {
    return (
      <div className="p-6 border border-veil-gray-light bg-veil-gray-dark text-veil-white opacity-70 font-data-sm">
        No private club selected. Create or join a club below.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{club.name}</h2>
        <p className="font-data-sm text-data-sm text-veil-white opacity-50 mt-2">admin: {club.admin || "protocol"}</p>
      </div>
      <div className="grid grid-cols-2 gap-0 border border-veil-gray-light">
        <MetricCard label="Encrypted TVL" value={club.tvl || "encrypted"} status="HIDDEN" />
        <MetricCard label="Members" value={club.members || "0"} status="MAY_HIDE" />
        <MetricCard label="Next Draw" value={club.draw || "24H 00M"} status="ADMIN_OR_KEEPER" />
        <MetricCard label="Prize" value={club.prize || "•••••• USDC"} status="PRIVATE" />
      </div>
      <div className="flex flex-wrap gap-3">
        <VeilButton onClick={() => onDeposit(50)}>Quick Deposit 50</VeilButton>
        <VeilButton onClick={onDecrypt} variant="secondary">
          {isDecrypted ? `Balance ${walletBalance} cUSDC` : "Decrypt Balance"}
        </VeilButton>
        <VeilButton onClick={() => navigator.clipboard && navigator.clipboard.writeText(`VC-${(club.id || "").toUpperCase()}`)} variant="secondary">
          Copy Invite
        </VeilButton>
        <VeilButton onClick={onTriggerDraw} variant="secondary">
          Trigger FHE Draw
        </VeilButton>
      </div>
    </div>
  );
}

function ClubForm({ onCreate }) {
  const [name, setName] = useState("");
  const [minDeposit, setMinDeposit] = useState("25");

  const handleSubmit = () => {
    if (onCreate) {
      onCreate(name || "Secret Vault Club");
      setName("");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LabelInput label="Club Name" onChange={(e) => setName(e.target.value)} placeholder="Noir Syndicate" value={name} />
      <LabelInput label="Min Deposit" onChange={(e) => setMinDeposit(e.target.value)} placeholder="25 USDC" value={minDeposit} />
      <LabelInput label="Draw Frequency" placeholder="Weekly" value="Weekly" />
      <LabelInput label="Member Visibility" placeholder="Anonymous" value="Anonymous" />
      <div className="md:col-span-2">
        <VeilButton onClick={handleSubmit}>Create Encrypted Club</VeilButton>
      </div>
    </div>
  );
}

function InviteForm({ onJoin }) {
  const [code, setCode] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <LabelInput label="Invite Code" onChange={(e) => setCode(e.target.value)} placeholder="VC-CLUB-01" value={code} />
      <div className="border border-veil-gray-light bg-veil-gray-dark p-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; invite validates membership gate before encrypted deposit</span>
      </div>
      <VeilButton onClick={() => onJoin && onJoin(code)}>Join Club</VeilButton>
    </div>
  );
}

function DataCell({ label, value }) {
  return (
    <div>
      <span className="font-label-caps text-label-caps text-veil-white opacity-40 uppercase">{label}</span>
      <p className="font-data-sm text-data-sm text-veil-white mt-2">{value}</p>
    </div>
  );
}

function ActionStack() {
  const actions = ["FAUCET_READY", "ENCRYPT_INPUT_PENDING", "USER_DECRYPT_AVAILABLE", "NO_LOSS_WITHDRAW_ENABLED"];

  return (
    <div className="flex flex-col border border-veil-gray-light">
      {actions.map((action) => (
        <div className="flex items-center justify-between gap-4 p-4 border-b last:border-b-0 border-veil-gray-light" key={action}>
          <span className="font-data-sm text-data-sm text-veil-white uppercase">• {action}</span>
          <svg className="w-4 h-4 text-veil-white opacity-60" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      ))}
    </div>
  );
}

function PrivacyList() {
  return (
    <div className="flex flex-col gap-4">
      {[
        ["Hidden", "Member balances, total club capital, odds, and prize amounts"],
        ["Public", "Draw events, pool address, optional winner address, timestamps"],
        ["User-only", "Own balance and winnings after EIP-712 user decrypt"],
        ["FHE Kernel", "Onchain verifiable random winner selection in ciphertext"]
      ].map(([label, body]) => (
        <div className="border border-veil-gray-light bg-veil-gray-dark p-4" key={label}>
          <span className="font-label-caps text-label-caps text-veil-purple uppercase">{label}</span>
          <p className="font-body-md text-body-md text-veil-white opacity-70 mt-2">{body}</p>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(() => getRouteState(window.location.pathname));
  const { view, activePage, docsSection } = route;

  useEffect(() => {
    const cleanChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const cards = document.querySelectorAll(".scramble-hover");
    const cleanup = [];

    cards.forEach((card) => {
      const targets = card.querySelectorAll(".scramble-target");
      let isScrambling = false;

      const handleEnter = () => {
        if (isScrambling) return;
        isScrambling = true;

        targets.forEach((target) => {
          const originalText = target.dataset.original;
          if (!originalText) return;

          // Lock element dimensions so text stays strictly inside its boundary
          const rect = target.getBoundingClientRect();
          target.style.display = "inline-block";
          target.style.width = `${Math.ceil(rect.width)}px`;
          target.style.height = `${Math.ceil(rect.height)}px`;
          target.style.whiteSpace = "nowrap";
          target.style.overflow = "hidden";

          let iteration = 0;
          const step = Math.max(2, Math.ceil(originalText.length / 5));

          const interval = window.setInterval(() => {
            target.innerText = originalText
              .split("")
              .map((letter, index) => {
                if (index < iteration || letter === " ") return originalText[index];
                return cleanChars[Math.floor(Math.random() * cleanChars.length)];
              })
              .join("");

            if (iteration >= originalText.length) {
              window.clearInterval(interval);
              target.innerText = originalText;
              target.style.width = "";
              target.style.height = "";
              target.style.display = "";
              target.style.whiteSpace = "";
              target.style.overflow = "";
            }

            iteration += step;
          }, 15);
        });

        window.setTimeout(() => {
          isScrambling = false;
        }, 150);
      };

      card.addEventListener("mouseenter", handleEnter);
      cleanup.push(() => card.removeEventListener("mouseenter", handleEnter));
    });

    return () => cleanup.forEach((removeListener) => removeListener());
  }, [view]);

  useEffect(() => {
    const handlePopState = () => {
      setRoute(getRouteState(window.location.pathname));
      window.scrollTo({ top: 0 });
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = (path, options = {}) => {
    const { scrollToTop = true } = typeof options === "boolean" ? { scrollToTop: options } : options;
    const nextRoute = getRouteState(path);
    window.history.pushState({}, "", path);
    setRoute(nextRoute);
    if (scrollToTop) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const navigatePage = (page) => {
    navigate(APP_ROUTES[page] || APP_ROUTES.dashboard);
  };

  const goApp = (page = "dashboard") => {
    navigatePage(page);
  };

  return (
    <div className="text-on-background min-h-screen flex flex-col relative overflow-x-hidden bg-veil-black">
      {view === "landing" || view === "docs" ? (
        <LandingHeader navigate={navigate} view={view} />
      ) : (
        <AppHeader activePage={activePage} navigate={navigate} navigatePage={navigatePage} />
      )}

      {view === "landing" ? (
        <LandingPage goApp={() => goApp("dashboard")} goGlobal={() => goApp("global")} goDocs={() => navigate("/docs")} />
      ) : view === "docs" ? (
        <DocsPage docsSection={docsSection} navigate={navigate} />
      ) : (
        <>
          <AppWorkspace activePage={activePage} navigatePage={navigatePage} />
          <AppFooter />
        </>
      )}
    </div>
  );
}

function LandingHeader({ navigate, view }) {
  const isDocs = view === "docs";

  return (
    <nav className="fixed top-0 w-full z-50 bg-veil-black border-b border-veil-gray-light">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full max-w-container-max mx-auto">
        <button className="flex items-center gap-2" onClick={() => navigate("/")} type="button">
          <LogoMark className="w-12 h-12" />
          <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white tracking-tighter">Veil Clubs</span>
        </button>
        <div className="hidden md:flex gap-8">
          <button
            className={`font-body-md text-body-md text-veil-white pb-1 transition-all duration-300 ${
              !isDocs ? "font-bold border-b-2 border-veil-purple opacity-100" : "opacity-70 hover:opacity-100"
            }`}
            onClick={() => navigate("/")}
            type="button"
          >
            Explore
          </button>
          <button
            className={`font-body-md text-body-md text-veil-white pb-1 transition-all duration-300 ${
              isDocs ? "font-bold border-b-2 border-veil-purple opacity-100" : "opacity-70 hover:opacity-100"
            }`}
            onClick={() => navigate("/docs")}
            type="button"
          >
            Docs
          </button>
        </div>
        <ConnectWalletButton />
      </div>
    </nav>
  );
}

function AppHeader({ activePage, navigate, navigatePage, onFaucet }) {
  const links = [
    ["dashboard", "Dashboard"],
    ["global", "Global Pool"],
    ["clubs", "Clubs"],
    ["draws", "Draws"],
    ["account", "Account"]
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-veil-black border-b border-veil-gray-light">
      <div className="px-margin-mobile md:px-margin-desktop w-full max-w-container-max mx-auto">
        <div className="flex items-center justify-between gap-6 py-4">
          <button className="flex items-center gap-2 shrink-0" onClick={() => navigate("/")} type="button">
            <LogoMark />
            <span className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg text-veil-white tracking-tighter">Veil Clubs</span>
            <span className="hidden lg:inline font-label-caps text-label-caps text-veil-white opacity-40 uppercase border-l border-veil-gray-light pl-4 ml-2">
              App
            </span>
          </button>
          <nav className="hidden lg:flex items-center gap-2 border border-veil-gray-light p-1">
            {links.map(([id, label]) => (
              <button
                className={`font-label-caps text-label-caps px-4 py-3 uppercase transition-colors ${
                  activePage === id ? "bg-veil-purple text-veil-white" : "text-veil-white opacity-70 hover:opacity-100 hover:bg-veil-gray-dark"
                }`}
                key={id}
                onClick={() => navigatePage(id)}
                type="button"
              >
                {label}
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {onFaucet && (
              <VeilButton className="hidden sm:inline-block py-2.5 px-4 text-xs" onClick={onFaucet} variant="secondary">
                Faucet 100 cUSDC
              </VeilButton>
            )}
            <ConnectWalletButton />
          </div>
        </div>
        <nav className="lg:hidden flex gap-2 overflow-x-auto pb-3">
          {links.map(([id, label]) => (
            <button
              className={`font-label-caps text-label-caps px-4 py-3 uppercase whitespace-nowrap transition-colors ${
                activePage === id ? "bg-veil-purple text-veil-white" : "text-veil-white opacity-70 border border-veil-gray-light"
              }`}
              key={id}
              onClick={() => navigatePage(id)}
              type="button"
            >
              {label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

function AppFooter() {
  return (
    <footer className="border-t border-veil-gray-light bg-veil-black">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">Veil Clubs App</span>
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">Sepolia</span>
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">ERC-7984</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">&gt; FHE Handles Active</span>
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">Sepolia App</span>
        </div>
      </div>
    </footer>
  );
}

function Footer() {
  return (
    <footer className="bg-veil-black border-t border-veil-gray-light py-16 w-full mt-auto">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <LogoMark />
              <span className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white tracking-tighter">Veil Clubs</span>
            </div>
            <p className="font-body-md text-body-md text-veil-white opacity-60">The Confidential Yield Layer.</p>
          </div>
          <FooterColumn title="Protocol" links={["Global Pool", "Private Clubs", "Yields", "Security"]} />
          <FooterColumn title="Governance" links={["DAO", "Docs", "Brand"]} />
          <FooterColumn title="Socials" links={["X", "Discord", "Telegram", "GitHub"]} />
        </div>
        <div className="pt-8 border-t border-veil-gray-light flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-data-sm text-data-sm text-veil-white opacity-60 uppercase">© 2024 Veil Clubs.</span>
          <div className="flex gap-6">
            <a className="font-data-sm text-data-sm text-veil-white opacity-60 hover:opacity-100 transition-opacity uppercase" href="#">
              Privacy Protocol
            </a>
            <a className="font-data-sm text-data-sm text-veil-white opacity-60 hover:opacity-100 transition-opacity uppercase" href="#">
              Terms of Access
            </a>
          </div>
          <StatusDot label="Status: Fully Encrypted" />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }) {
  return (
    <div className="flex flex-col gap-4">
      <span className="font-label-caps text-label-caps text-veil-white opacity-40 uppercase">{title}</span>
      {links.map((link) => (
        <a className="font-data-sm text-data-sm text-veil-white opacity-80 hover:text-veil-purple transition-colors" href="#" key={link}>
          {link}
        </a>
      ))}
    </div>
  );
}
