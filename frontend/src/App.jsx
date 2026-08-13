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

function LandingPage({ goApp, goGlobal }) {
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
            <StatBlock label="Total Value Locked" value="$142.5M" />
            <StatBlock label="Active Clubs" value="1,248" />
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
      </main>
      <Footer />
    </>
  );
}

function AppWorkspace({ activePage, navigatePage }) {
  return (
    <main className="flex-grow pt-32 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
      <section className="border-y border-veil-gray-light py-5 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-8">
            <StatBlock label="Network" value="Sepolia" status="FHEVM_TESTNET" />
            <StatBlock label="Protocol Mode" value="MVP" status="CONFIDENTIAL_POOL" />
            <StatBlock label="Privacy State" value="Encrypted" status="USER_DECRYPT_ONLY" />
          </div>
          <StatusDot label="App Online" />
        </div>
      </section>

      <section className="bg-veil-black">
        {activePage === "dashboard" ? <DashboardPage navigatePage={navigatePage} /> : null}
        {activePage === "global" ? <GlobalPoolPage /> : null}
        {activePage === "clubs" ? <PrivateClubsPage /> : null}
        {activePage === "draws" ? <DrawsPage /> : null}
        {activePage === "account" ? <AccountPage /> : null}
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

function DashboardPage({ navigatePage }) {
  return (
    <div>
      <PageHeader
        body="Track your encrypted principal, private winnings, active clubs, and the next no-loss draw without exposing sensitive financial data."
        kicker="Private Terminal"
        title="Your Confidential Position"
        action={<VeilButton onClick={() => navigatePage("global")}>Deposit</VeilButton>}
      />
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-veil-gray-light">
        <MetricCard label="Encrypted Principal" value="••••••" status="USER_DECRYPT_ONLY" />
        <MetricCard label="Claimable Winnings" value="••••••" status="EIP712_REQUIRED" />
        <MetricCard label="Active Pools" value="03" status="GLOBAL_PLUS_CLUBS" />
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

function GlobalPoolPage() {
  return (
    <div>
      <PageHeader
        body="The public entry pool for onboarding. Anyone can deposit encrypted test USDC, earn mock yield, and join weighted confidential prize draws."
        kicker="Public Pool"
        title="Global No-Loss Pool"
        action={<VeilButton>Deposit Encrypted</VeilButton>}
      />
      <section className="grid grid-cols-1 md:grid-cols-4 gap-0 border border-veil-gray-light mb-8">
        <MetricCard label="Encrypted TVL" value="0x8F2A...C19E" status="TOTAL_HIDDEN" />
        <MetricCard label="Members" value="1,248" status="PUBLIC_COUNT" />
        <MetricCard label="Yield Source" value="MOCK" status="SEPOLIA_STRATEGY" />
        <MetricCard label="Prize" value="••••••" status="WINNER_DECRYPTS" />
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Deposit Flow">
          <TransactionForm mode="global" />
        </Panel>
        <Panel title="Draw Engine">
          <DrawEngine />
        </Panel>
      </section>
    </div>
  );
}

function PrivateClubsPage() {
  const [selectedClub, setSelectedClub] = useState(pools[1]);

  return (
    <div>
      <PageHeader
        body="Create or join invitation-only prize pools. Each club has independent encrypted deposits, private odds, mock yield, and confidential prize claims."
        kicker="Social Yield"
        title="Private Clubs"
        action={<VeilButton>Create Club</VeilButton>}
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-6">
        <Panel title="Club Directory">
          <div className="flex flex-col border border-veil-gray-light">
            {pools
              .filter((pool) => pool.scope === "PRIVATE")
              .map((club) => (
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
          <ClubDetail club={selectedClub} />
        </Panel>
      </section>
      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
        <Panel title="Create Private Club">
          <ClubForm />
        </Panel>
        <Panel title="Join By Invite">
          <InviteForm />
        </Panel>
      </section>
    </div>
  );
}

function DrawsPage() {
  return (
    <div>
      <PageHeader
        body="Draws use encrypted balances as weights. The frontend only receives public events and ciphertext handles until the winner decrypts their prize."
        kicker="Prize Draw"
        title="Confidential Draw History"
        action={<VeilButton>Trigger Draw</VeilButton>}
      />
      <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <Panel title="Recent Draws">
          <DataTable
            columns={["draw", "pool", "winner", "prize handle", "status"]}
            rows={drawHistory}
          />
        </Panel>
        <Panel title="Privacy Surface">
          <PrivacyList />
        </Panel>
      </section>
    </div>
  );
}

function AccountPage() {
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
            <MetricCard label="Global Balance" value="••••••" status="DECRYPT" />
            <MetricCard label="Club Balance" value="••••••" status="DECRYPT" />
            <MetricCard label="Pending Prize" value="••••••" status="CLAIMABLE" />
            <MetricCard label="Odds" value="••••••" status="PRIVATE" />
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <VeilButton>Decrypt Balance</VeilButton>
            <VeilButton variant="secondary">Claim Prize</VeilButton>
            <VeilButton variant="secondary">Withdraw Principal</VeilButton>
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

function TransactionForm({ mode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-end">
      <LabelInput label="Amount" placeholder="100.00" />
      <LabelInput label="Token" placeholder="Mock USDC" />
      <VeilButton className="h-[50px]">Encrypt Deposit</VeilButton>
      <div className="md:col-span-3 border border-veil-gray-light bg-veil-gray-dark p-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">
          &gt; {mode === "global" ? "GLOBAL_POOL" : "PRIVATE_CLUB"} :: amount encrypted client-side, proof submitted onchain
        </span>
      </div>
    </div>
  );
}

function LabelInput({ label, placeholder }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-label-caps text-label-caps text-veil-white opacity-50 uppercase">{label}</span>
      <input
        className="bg-veil-gray-dark border border-veil-gray-light text-veil-white font-data-sm text-data-sm px-4 py-4 focus:border-veil-purple focus:ring-0"
        placeholder={placeholder}
      />
    </label>
  );
}

function DrawEngine() {
  const steps = [
    ["01", "Read encrypted balances", "euint weights stay private"],
    ["02", "Generate draw seed", "FHE randomness onchain"],
    ["03", "Select weighted winner", "no balance decrypt"],
    ["04", "Route prize handle", "winner decrypts only"]
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

function ClubDetail({ club }) {
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
        <VeilButton>Deposit</VeilButton>
        <VeilButton variant="secondary">Copy Invite</VeilButton>
        <VeilButton variant="secondary">Trigger Draw</VeilButton>
      </div>
    </div>
  );
}

function ClubForm() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <LabelInput label="Club Name" placeholder="Noir Syndicate" />
      <LabelInput label="Min Deposit" placeholder="25 USDC" />
      <LabelInput label="Draw Frequency" placeholder="Weekly" />
      <LabelInput label="Member Visibility" placeholder="Anonymous" />
      <div className="md:col-span-2">
        <VeilButton>Create Encrypted Club</VeilButton>
      </div>
    </div>
  );
}

function InviteForm() {
  return (
    <div className="flex flex-col gap-4">
      <LabelInput label="Invite Code" placeholder="VC-CLUB-01" />
      <div className="border border-veil-gray-light bg-veil-gray-dark p-4">
        <span className="font-data-sm text-data-sm text-veil-white opacity-70 uppercase">&gt; invite validates membership gate before encrypted deposit</span>
      </div>
      <VeilButton>Join Club</VeilButton>
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
        ["MVP limit", "50-100 member target with documented draw gas ceiling"]
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
  const { view, activePage } = route;

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
          let iteration = 0;

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
      {view === "landing" ? (
        <LandingHeader navigate={navigate} />
      ) : (
        <AppHeader activePage={activePage} navigate={navigate} navigatePage={navigatePage} />
      )}

      {view === "landing" ? (
        <LandingPage goApp={() => goApp("dashboard")} goGlobal={() => goApp("global")} />
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
          <span className="material-symbols-outlined text-veil-purple">lock</span>
          <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white tracking-tighter">Veil Clubs</span>
        </button>
        <div className="hidden md:flex gap-8">
          <button className="font-body-md text-body-md text-veil-white font-bold border-b-2 border-veil-purple pb-1" onClick={() => navigate("/")} type="button">
            Explore
          </button>
          <button className="font-body-md text-body-md text-veil-white opacity-70 hover:opacity-100 transition-opacity duration-300 pb-1" onClick={() => navigate(APP_ROUTES.dashboard)} type="button">
            Dashboard
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
            <span className="material-symbols-outlined text-veil-purple">lock</span>
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
              <span className="material-symbols-outlined text-veil-purple">lock</span>
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
