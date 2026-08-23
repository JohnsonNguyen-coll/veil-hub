import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import * as THREE from "three";

const pools = [
  {
    id: "global",
    name: "Global Pool",
    scope: "PUBLIC",
    tvl: "0x8F2A...C19E",
    members: "1,248",
    draw: "06H 14M",
    prize: "•••••• USDC",
    status: "DRAW_READY"
  },
  {
    id: "club-01",
    name: "Cipher Table",
    scope: "PRIVATE",
    tvl: "0x40B1...8D22",
    members: "24",
    draw: "18H 02M",
    prize: "•••••• USDC",
    status: "KEEPER_ARMED"
  },
  {
    id: "club-02",
    name: "Noir Syndicate",
    scope: "PRIVATE",
    tvl: "0xA771...3F90",
    members: "12",
    draw: "02D 09H",
    prize: "•••••• USDC",
    status: "YIELD_ACCRUING"
  }
];

const drawHistory = [
  ["#0042", "Global Pool", "0x91b4...E2A8", "0xPRIZE...7D31", "SETTLED"],
  ["#0041", "Cipher Table", "Anonymous member", "0xPRIZE...19F0", "CLAIMABLE"],
  ["#0040", "Global Pool", "0x62f0...88B1", "0xPRIZE...AA08", "SETTLED"],
  ["#0039", "Noir Syndicate", "Hidden winner", "0xPRIZE...D3C2", "ENCRYPTED"]
];

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
      className={`${variantClass} font-label-caps text-label-caps px-6 py-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
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
    camera.position.z = 2.8;

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
      className="flex-1 relative w-full h-[600px] lg:h-[800px] flex items-center justify-center pointer-events-auto"
      ref={containerRef}
    />
  );
}

function FeatureCard({ index, title, description, status, borderClass = "" }) {
  return (
    <div className={`bg-veil-gray-dark p-8 ${borderClass} border-veil-gray-light flex flex-col gap-6 relative min-h-[300px] scramble-hover transition-all duration-300 border border-transparent`}>
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-6 right-6">{index}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white font-bold uppercase mt-8 tracking-tight scramble-target" data-original={title}>
        {title}
      </h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 scramble-target" data-original={description}>
        {description}
      </p>
      <div className="mt-auto pt-4 border-t border-veil-gray-light">
        <span className="font-data-sm text-data-sm text-veil-white opacity-80 uppercase">&gt; {status}</span>
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
  ["Private Capital", "Deposits, pool totals, odds, and winnings stay encrypted until the right user decrypts them."],
  ["No-Loss Exit", "Members can withdraw principal when they leave, while yield powers the prize layer."],
  ["Social Pools", "Private Clubs make prize saving feel like a group game without exposing member bankrolls."],
  ["Demo-Ready Flow", "A focused path from wallet connect to deposit, draw, decrypt, claim, and withdraw."]
];

const landingPoolModes = [
  {
    label: "Global Pool",
    title: "Open Pool For First-Time Users",
    body: "A public pool that keeps onboarding simple. Anyone can enter, deposit privately, watch the next draw, and test the no-loss loop without needing an invite.",
    points: ["Open access", "Shared public draw history", "Encrypted user balances", "Fast judge-friendly demo"]
  },
  {
    label: "Private Clubs",
    title: "Invite-Only Prize Pools",
    body: "A club creator opens a private pool with its own members, draw rhythm, and prize stream. Members get the social upside while sensitive financial state stays hidden.",
    points: ["Invite code entry", "Optional anonymous members", "Independent club draws", "Admin or keeper trigger"]
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
    bullets: ["Public onboarding pool", "Invite-based private clubs", "No-loss principal withdrawals", "Mock yield prize source"]
  },
  {
    eyebrow: "02 / Privacy",
    title: "Encrypted Financial State",
    body: "Balances, deposits, winnings, total club capital, and odds are represented as ciphertext handles. Users decrypt only their own eligible values through wallet-signed user decryption.",
    bullets: ["Private balances", "Private prize amounts", "Private odds", "Public events only where needed"]
  },
  {
    eyebrow: "03 / Draws",
    title: "Confidential Weighted Prize Draws",
    body: "The target draw design selects winners from encrypted balances without decrypting member deposits. The MVP documents public leakage and separates demo hooks from the final FHE selector.",
    bullets: ["Weighted by encrypted principal", "No plaintext balance selection", "Keeper/admin trigger path", "Gas limits documented"]
  },
  {
    eyebrow: "04 / Stack",
    title: "Privacy-First Infrastructure",
    body: "The system is split so sensitive financial state stays encrypted while the interface remains fast, readable, and easy to demo. Public metadata is separated from confidential pool state.",
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
        body: "The product intentionally has two surfaces: a Global Pool for public onboarding and Private Clubs for small social groups. This keeps the MVP focused, demoable, and easier to reason about under confidential-computation constraints."
      }
    ],
    rows: [
      ["Primary user", "People who want no-loss prize exposure without public balance disclosure"],
      ["Primary demo", "Join Global Pool, deposit encrypted amount, view private position, trigger draw"],
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
    status: "DEMO_PATH",
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
        body: "At the scheduled time, a keeper or admin triggers a draw. The target design selects winners with encrypted weights. Prize amount remains confidential. The winner can decrypt their own claimable prize and claim it without exposing private balances."
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
    summary: "The hardest technical part: fair weighted selection using encrypted balances.",
    status: "CORE_MECHANISM",
    sections: [
      {
        title: "Goal",
        body: "The draw should select a winner with probability proportional to their encrypted principal, without decrypting individual balances or revealing odds. This is the core technical claim of Veil Clubs and should be implemented and documented carefully."
      },
      {
        title: "MVP Path",
        body: "The MVP can expose the draw lifecycle and encrypted prize transfer while marking any demo finalization hook as non-final. This is better than pretending a shortcut is already the confidential weighted selector."
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
      ["Weight", "Encrypted user principal"],
      ["Randomness", "Onchain confidential randomness target"],
      ["Output", "Winner event plus encrypted prize handle"],
      ["Limit", "Gas-profile before scaling beyond MVP member cap"]
    ]
  },
  {
    slug: "mvp-boundaries",
    eyebrow: "06 / Limits",
    title: "MVP Boundaries",
    summary: "What is demo-ready now and what must be hardened before production claims.",
    status: "HONEST_LIMITS",
    sections: [
      {
        title: "Demo-Ready",
        body: "The current product can demonstrate the landing page, app routes, Global Pool, Private Clubs, draw history, account dashboard, backend metadata, invite code flow, and initial confidential contract structure."
      },
      {
        title: "Must Be Hardened",
        body: "The fully weighted FHE draw kernel, production yield adapter, event indexer, keeper reliability, and contract tests need more work before this can be presented as production-ready."
      },
      {
        title: "Judging Strategy",
        body: "The best judging position is to be precise: show the product, explain the intended confidential draw design, demonstrate the parts that work, and clearly mark the remaining engineering work."
      }
    ],
    rows: [
      ["Ready", "UI, routes, metadata API, club UX, contract scaffold"],
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
      <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-24">
        <section className="flex flex-col lg:flex-row items-center gap-12 min-h-[716px] relative">
          <div className="flex-1 flex flex-col gap-6 z-10">
            <h1 className="font-headline-xl text-[48px] md:text-[72px] leading-tight text-veil-white font-bold tracking-tighter uppercase">
              The Confidential
              <br />
              <span className="text-veil-purple">Yield Layer</span>
            </h1>
            <p className="font-body-md text-body-md text-veil-white opacity-80 max-w-xl text-lg">
              No-loss prize pools with end-to-end encryption. Earn yield and win big without ever losing your principal. Designed for elite capital.
            </p>
            <div className="flex flex-wrap gap-4 mt-8">
              <VeilButton className="px-8 py-4" onClick={goApp}>
                Launch App
              </VeilButton>
              <VeilButton className="px-8 py-4" onClick={goGlobal} variant="secondary">
                Explore Global Pool
              </VeilButton>
            </div>
          </div>
          <Globe />
        </section>

        <section className="border-y border-veil-gray-light py-8">
          <div className="flex flex-wrap justify-between items-center gap-8 px-4">
            <StatBlock label="Protocol Type" value="No-Loss" status="POOLTOGETHER_STYLE" />
            <StatBlock label="Privacy Layer" value="FHEVM" status="ZAMA_PROTOCOL" />
            <StatBlock label="Token Standard" value="ERC-7984" status="CONFIDENTIAL_ASSET" />
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
          eyebrow="Why Veil Clubs"
          title="Prize Saving Without Public Balance Theater"
          body="Veil Clubs keeps the emotional hook of PoolTogether, then removes the part that makes social DeFi uncomfortable: public financial exposure."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border border-veil-gray-light">
            {landingAdvantages.map(([title, body], index) => (
              <LandingMiniCard body={body} index={String(index + 1).padStart(2, "0")} key={title} title={title} />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          eyebrow="Pool Modes"
          title="One Public Door, Infinite Private Tables"
          body="The product has only two pool surfaces, so the demo stays focused while still showing a real social use case."
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 border border-veil-gray-light">
            {landingPoolModes.map((mode) => (
              <LandingPoolMode key={mode.label} mode={mode} />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          eyebrow="Prize Cycle"
          title="The No-Loss Loop"
          body="Every screen in the app points back to a simple cycle: enter privately, let yield accumulate, run the draw, claim privately, and leave whenever you want."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-0 border border-veil-gray-light">
            {landingDrawSteps.map(([number, title, body]) => (
              <LandingStep number={number} title={title} body={body} key={number} />
            ))}
          </div>
        </LandingSection>

        <LandingSection
          eyebrow="Privacy Surface"
          title="Clear Claims, Clean Demo"
          body="The landing page explains the promise without drowning users in implementation notes. The technical breakdown lives in the docs."
        >
          <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-0 border border-veil-gray-light">
            <div className="p-8 md:p-10 bg-veil-gray-dark border-b lg:border-b-0 lg:border-r border-veil-gray-light scramble-hover transition-all duration-300">
              <span className="font-label-caps text-label-caps text-veil-purple uppercase">Confidential By Default</span>
              <h3 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white uppercase mt-5">
                Financial state stays behind the veil until the owner asks to see it.
              </h3>
              <p className="font-body-md text-body-md text-veil-white opacity-70 mt-5 max-w-2xl">
                Users can participate in prize pools without broadcasting their capital, odds, or winnings to every observer. Public events still keep the product legible, but sensitive values remain private.
              </p>
            </div>
            <div className="flex flex-col">
              {landingPrivacyBlocks.map(([label, body]) => (
                <div className="p-6 border-b last:border-b-0 border-veil-gray-light bg-veil-black hover:bg-veil-gray-dark transition-colors duration-300" key={label}>
                  <span className="font-label-caps text-label-caps text-veil-purple uppercase">{label}</span>
                  <p className="font-body-md text-body-md text-veil-white opacity-70 mt-3">{body}</p>
                </div>
              ))}
            </div>
          </div>
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
    <div className="bg-veil-gray-dark p-8 border-r border-b border-veil-gray-light min-h-[260px] flex flex-col gap-5 relative scramble-hover transition-all duration-300">
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-6 right-6">{index}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white font-bold uppercase mt-8 tracking-tight scramble-target" data-original={title}>{title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 scramble-target" data-original={body}>{body}</p>
    </div>
  );
}

function LandingPoolMode({ mode }) {
  return (
    <article className="bg-veil-black p-8 md:p-10 border-r border-b lg:border-b-0 border-veil-gray-light min-h-[360px] flex flex-col scramble-hover transition-all duration-300">
      <span className="font-label-caps text-label-caps text-veil-purple uppercase">{mode.label}</span>
      <h3 className="font-headline-lg-mobile md:font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white uppercase mt-5 scramble-target" data-original={mode.title}>{mode.title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 mt-5 scramble-target" data-original={mode.body}>{mode.body}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border border-veil-gray-light mt-auto pt-8 border-x-0 border-b-0">
        {mode.points.map((point) => (
          <div className="p-4 border-r border-b border-veil-gray-light bg-veil-gray-dark" key={point}>
            <span className="font-data-sm text-data-sm text-veil-white uppercase">&gt; {point}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function LandingStep({ body, number, title }) {
  return (
    <div className="p-8 border-r border-b border-veil-gray-light min-h-[260px] bg-veil-black flex flex-col gap-5 relative scramble-hover transition-all duration-300">
      <span className="font-data-sm text-data-sm text-veil-white opacity-40 absolute top-6 right-6">{number}</span>
      <h3 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white font-bold uppercase mt-8 tracking-tight scramble-target" data-original={title}>{title}</h3>
      <p className="font-body-md text-body-md text-veil-white opacity-70 scramble-target" data-original={body}>{body}</p>
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
            Choose a topic to inspect the product, privacy model, draw mechanism, and MVP boundaries in detail.
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
          body="Start with the product overview, then inspect product surfaces, privacy model, and prize draw mechanics before reviewing MVP boundaries."
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
                <span className="material-symbols-outlined text-veil-white opacity-60">arrow_forward</span>
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
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; {item.status}</span>
        <span className="material-symbols-outlined text-veil-white opacity-60">arrow_forward</span>
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
                onClick={() => navigate(`/docs/${item.slug}`)}
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

function LandingSection({ body, children, eyebrow, title }) {
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
      </div>
      <button className="font-data-sm text-data-sm text-veil-white opacity-40 hover:opacity-100" onClick={onClose} type="button">
        ✕
      </button>
    </div>
  );
}

function AppWorkspace({ activePage, navigatePage }) {
  const [toast, setToast] = useState(null);
  const [poolsState, setPoolsState] = useState(pools);
  const [drawsState, setDrawsState] = useState(drawHistory);
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [isClaimed, setIsClaimed] = useState(false);
  const [userDeposit, setUserDeposit] = useState(250);

  const showToast = (title, message) => {
    setToast({ title, message });
    window.setTimeout(() => setToast(null), 4500);
  };

  const handleDeposit = (amount, poolName = "Global Pool") => {
    const num = parseFloat(amount) || 100;
    setUserDeposit((prev) => prev + num);
    showToast(
      "Deposit Confirmed",
      `Encrypted ${num} USDC via FHE input proof. Deposited into ${poolName} anonymously.`
    );
  };

  const handleTriggerDraw = (poolName = "Global Pool") => {
    const nextDrawNum = `#00${drawsState.length + 40}`;
    const newDraw = [nextDrawNum, poolName, "Verifiable Encrypted Winner", "0xPRIZE..." + Math.random().toString(16).substring(2, 6).toUpperCase(), "CLAIMABLE"];
    setDrawsState([newDraw, ...drawsState]);
    showToast(
      "FHE Draw Executed",
      `Onchain verifiable draw ${nextDrawNum} executed for ${poolName}. Winner selected homomorphically.`
    );
  };

  const handleDecrypt = () => {
    showToast("EIP-712 KMS Decrypt", "Decryption request signed. Retrieving private balance handles from Zama KMS...");
    window.setTimeout(() => {
      setIsDecrypted(true);
      showToast("Decrypted Successfully", `Principal: ${userDeposit}.00 USDC | Claimable: ${isClaimed ? "0.00" : "45.20"} USDC`);
    }, 600);
  };

  const handleClaim = () => {
    if (isClaimed) {
      showToast("Already Claimed", "You have already claimed all pending prizes for this draw.");
      return;
    }
    setIsClaimed(true);
    showToast("Prize Claimed", "Transferred 45.20 cUSDC prize into your confidential token wallet!");
  };

  const handleWithdraw = () => {
    if (userDeposit <= 0) {
      showToast("No Principal", "Current confidential principal balance is 0.");
      return;
    }
    const amt = userDeposit;
    setUserDeposit(0);
    showToast("Principal Withdrawn", `Withdrew ${amt}.00 USDC principal without loss to your wallet.`);
  };

  const handleCreateClub = (name) => {
    const newClub = {
      id: `club-0${poolsState.length}`,
      name: name || "Encrypted Club",
      scope: "PRIVATE",
      tvl: "0x" + Math.random().toString(16).substring(2, 6).toUpperCase() + "...HIDDEN",
      members: "1",
      draw: "07D 00H",
      prize: "•••••• USDC",
      status: "YIELD_ACCRUING"
    };
    setPoolsState([...poolsState, newClub]);
    showToast("Private Club Created", `Created "${newClub.name}" with independent FHE draw lifecycle.`);
  };

  const handleJoinClub = (inviteCode) => {
    showToast("Joined Club", `Validated invite ${inviteCode || "VC-SYNDICATE"}. Added to private membership roster.`);
  };

  return (
    <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <ToastNotification onClose={() => setToast(null)} toast={toast} />
      <section className="border-y border-veil-gray-light py-5 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-8">
            <StatBlock label="Network" value="Sepolia" status="FHEVM_TESTNET" />
            <StatBlock label="Protocol Mode" value="ERC-7984" status="CONFIDENTIAL_POOL" />
            <StatBlock label="Privacy State" value="Encrypted" status="USER_DECRYPT_ONLY" />
          </div>
          <StatusDot label="App Online" />
        </div>
      </section>

      <section className="bg-veil-black">
        {activePage === "dashboard" ? (
          <DashboardPage
            isClaimed={isClaimed}
            isDecrypted={isDecrypted}
            navigatePage={navigatePage}
            onDecrypt={handleDecrypt}
            pools={poolsState}
            userDeposit={userDeposit}
          />
        ) : null}
        {activePage === "global" ? (
          <GlobalPoolPage onDeposit={handleDeposit} onTriggerDraw={() => handleTriggerDraw("Global Pool")} />
        ) : null}
        {activePage === "clubs" ? (
          <PrivateClubsPage
            clubs={poolsState}
            onCreateClub={handleCreateClub}
            onDeposit={handleDeposit}
            onJoinClub={handleJoinClub}
            onTriggerDraw={handleTriggerDraw}
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
            onWithdraw={handleWithdraw}
            userDeposit={userDeposit}
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

function DashboardPage({ navigatePage, pools, isDecrypted, isClaimed, userDeposit, onDecrypt }) {
  return (
    <div>
      <PageHeader
        body="Track your encrypted principal, private winnings, active clubs, and the next no-loss draw without exposing sensitive financial data."
        kicker="Private Terminal"
        title="Your Confidential Position"
        action={
          <div className="flex gap-3">
            <VeilButton onClick={onDecrypt} variant="secondary">
              {isDecrypted ? "Refresh Decrypt" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton onClick={() => navigatePage("global")}>Deposit</VeilButton>
          </div>
        }
      />
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-veil-gray-light">
        <MetricCard
          label="Encrypted Principal"
          value={isDecrypted ? `${userDeposit}.00 USDC` : "••••••"}
          status={isDecrypted ? "DECRYPTED_OK" : "USER_DECRYPT_ONLY"}
        />
        <MetricCard
          label="Claimable Winnings"
          value={isDecrypted ? (isClaimed ? "0.00 USDC" : "45.20 USDC") : "••••••"}
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

function GlobalPoolPage({ onDeposit, onTriggerDraw }) {
  return (
    <div>
      <PageHeader
        body="The public entry pool for onboarding. Anyone can deposit encrypted test USDC, earn mock yield, and join weighted confidential prize draws."
        kicker="Public Pool"
        title="Global No-Loss Pool"
        action={
          <div className="flex gap-3">
            <VeilButton onClick={onTriggerDraw} variant="secondary">
              Trigger FHE Draw
            </VeilButton>
            <VeilButton onClick={() => onDeposit(100, "Global Pool")}>Quick Deposit 100 USDC</VeilButton>
          </div>
        }
      />
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-veil-gray-light mb-8">
        <MetricCard label="Encrypted TVL" value="0x8F2A...C19E" status="TOTAL_HIDDEN" />
        <MetricCard label="Members" value="1,248" status="PUBLIC_COUNT" />
        <MetricCard label="Yield Source" value="MOCK" status="SEPOLIA_STRATEGY" />
        <MetricCard label="Prize" value="••••••" status="WINNER_DECRYPTS" />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Deposit Flow">
          <TransactionForm mode="global" onDeposit={onDeposit} />
        </Panel>
        <Panel title="Draw Engine">
          <DrawEngine />
        </Panel>
      </section>
    </div>
  );
}

function PrivateClubsPage({ clubs, onCreateClub, onJoinClub, onDeposit, onTriggerDraw }) {
  const privateClubs = clubs.filter((pool) => pool.scope === "PRIVATE");
  const [selectedClub, setSelectedClub] = useState(privateClubs[0] || clubs[0]);

  return (
    <div>
      <PageHeader
        body="Create or join invitation-only prize pools. Each club has independent encrypted deposits, private odds, mock yield, and confidential prize claims."
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
                  selectedClub.id === club.id ? "bg-veil-gray-dark" : ""
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
            onDeposit={(amt) => onDeposit(amt, selectedClub.name)}
            onTriggerDraw={() => onTriggerDraw(selectedClub.name)}
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
        body="Draws use encrypted balances as weights. The frontend only receives public events and ciphertext handles until the winner decrypts their prize."
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

function AccountPage({ isDecrypted, isClaimed, userDeposit, onDecrypt, onClaim, onWithdraw }) {
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
              label="Global Balance"
              value={isDecrypted ? `${userDeposit}.00 USDC` : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Club Balance"
              value={isDecrypted ? "50.00 USDC" : "••••••"}
              status={isDecrypted ? "DECRYPTED" : "CLICK_DECRYPT"}
            />
            <MetricCard
              label="Pending Prize"
              value={isDecrypted ? (isClaimed ? "0.00 USDC" : "45.20 USDC") : "••••••"}
              status={isClaimed ? "CLAIMED" : "CLAIMABLE"}
            />
            <MetricCard
              label="Odds"
              value={isDecrypted ? "12.4%" : "••••••"}
              status="CONFIDENTIAL"
            />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <VeilButton onClick={onDecrypt}>
              {isDecrypted ? "Re-decrypt Balance" : "Decrypt Balance"}
            </VeilButton>
            <VeilButton disabled={isClaimed} onClick={onClaim} variant="secondary">
              {isClaimed ? "Prize Claimed" : "Claim Prize (45.20 USDC)"}
            </VeilButton>
            <VeilButton onClick={onWithdraw} variant="secondary">
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

function TransactionForm({ mode, onDeposit }) {
  const [amount, setAmount] = useState("100.00");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
      <LabelInput label="Amount" onChange={(e) => setAmount(e.target.value)} placeholder="100.00" value={amount} />
      <LabelInput label="Token" placeholder="Mock USDC" value="cUSDC (ERC-7984)" />
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

function ClubDetail({ club, onDeposit, onTriggerDraw }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white uppercase">{club.name}</h2>
        <p className="font-data-sm text-data-sm text-veil-white opacity-50 mt-2">admin: 0x7C21...BEEF</p>
      </div>
      <div className="grid grid-cols-2 gap-0 border border-veil-gray-light">
        <MetricCard label="Encrypted TVL" value={club.tvl} status="HIDDEN" />
        <MetricCard label="Members" value={club.members} status="MAY_HIDE" />
        <MetricCard label="Next Draw" value={club.draw} status="ADMIN_OR_KEEPER" />
        <MetricCard label="Prize" value={club.prize} status="PRIVATE" />
      </div>
      <div className="flex flex-wrap gap-3">
        <VeilButton onClick={() => onDeposit(50)}>Quick Deposit 50</VeilButton>
        <VeilButton onClick={() => navigator.clipboard && navigator.clipboard.writeText(`VC-${club.id.toUpperCase()}`)} variant="secondary">
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
          <span className="font-data-sm text-data-sm text-veil-white uppercase">&gt; {action}</span>
          <span className="material-symbols-outlined text-veil-white opacity-60 text-[18px]">arrow_forward</span>
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
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
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
          const originalHeight = target.offsetHeight;
          let iteration = 0;

          target.style.height = `${originalHeight}px`;
          target.style.overflow = "hidden";

          const interval = window.setInterval(() => {
            target.innerText = originalText
              .split("")
              .map((letter, index) => {
                if (index < iteration || letter === " ") return originalText[index];
                return chars[Math.floor(Math.random() * chars.length)];
              })
              .join("");

            if (iteration >= originalText.length) {
              window.clearInterval(interval);
              target.innerText = originalText;
              target.style.height = "";
              target.style.overflow = "";
            }

            iteration += originalText.length / 10;
          }, 30);
        });

        window.setTimeout(() => {
          isScrambling = false;
        }, 500);
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

  const navigate = (path) => {
    const nextRoute = getRouteState(path);
    window.history.pushState({}, "", path);
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: "smooth" });
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
        <LandingHeader navigate={navigate} />
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

function LandingHeader({ navigate }) {
  return (
    <nav className="fixed top-0 w-full z-50 bg-veil-black border-b border-veil-gray-light">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full max-w-container-max mx-auto">
        <button className="flex items-center gap-2" onClick={() => navigate("/")} type="button">
          <LogoMark className="w-12 h-12" />
          <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white tracking-tighter">Veil Clubs</span>
        </button>
        <div className="hidden md:flex gap-8">
          <button className="font-body-md text-body-md text-veil-white font-bold border-b-2 border-veil-purple pb-1" onClick={() => navigate("/")} type="button">
            Explore
          </button>
          <button className="font-body-md text-body-md text-veil-white opacity-70 hover:opacity-100 transition-opacity duration-300 pb-1" onClick={() => navigate(APP_ROUTES.dashboard)} type="button">
            Dashboard
          </button>
          <button className="font-body-md text-body-md text-veil-white opacity-70 hover:opacity-100 transition-opacity duration-300 pb-1" onClick={() => navigate("/docs")} type="button">
            Docs
          </button>
        </div>
        <ConnectWalletButton />
      </div>
    </nav>
  );
}

function AppHeader({ activePage, navigate, navigatePage }) {
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
          <ConnectWalletButton />
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
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">v0.1 MVP</span>
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
