import { useState } from "react";
import { landingAdvantages, landingPoolModes } from "../constants/landingData.js";
import { Globe } from "../components/common/Globe.jsx";
import { StatBlock } from "../components/common/StatBlock.jsx";
import { StatusDot } from "../components/common/StatusDot.jsx";
import { FeatureCard } from "../components/common/FeatureCard.jsx";
import { VeilButton } from "../components/common/VeilButton.jsx";
import { Footer } from "../components/layout/Footer.jsx";

export function LandingPage({ goApp, goGlobal, goDocs }) {
  return (
    <>
      <main className="flex-grow pt-10 md:pt-14 pb-16 px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full flex flex-col gap-20 md:gap-24">
        <section className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12 min-h-[520px] relative">
          <div className="flex-1 flex flex-col gap-6 z-10 pt-4 md:pt-0">
            <h1 className="font-headline-xl text-[50px] sm:text-[64px] md:text-[82px] lg:text-[90px] leading-[0.98] text-veil-white font-bold uppercase max-w-5xl">
              Confidential
              <br />
              <span className="text-veil-purple">Prize Layer</span>
            </h1>
            <p className="font-body-md text-body-md text-veil-white opacity-80 max-w-xl text-lg md:text-xl leading-relaxed">
              No-loss prize pools with end-to-end FHE encryption, Sepolia mock prize funding, and 100% principal protection.
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
            <StatBlock label="Protocol Type" value="No-Loss" status="PRIZE_POOL" />
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
            description="Deposit cUSDC into encrypted pools. A keeper-funded Sepolia reserve is awarded securely to random winners."
            index="01"
            status="MOCK_RESERVE_ACTIVE"
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
            description="Form invite-only clubs to pool capital and participate in independent confidential prize draws."
            index="03"
            status="SYNDICATE_SYNC_ON"
            title="Private Clubs"
          />
        </section>

        <LandingSection
          eyebrow="Architecture Stream"
          title="End-to-End Confidential Flow"
          body="Visualized pipeline showing encrypted capital, testnet prize funding, and private settlement."
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
          body="Enter privately, fund prizes through the Sepolia mock reserve, run encrypted draws, and withdraw 100% principal anytime."
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
              Enter The Confidential Prize Layer
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

function LandingSection({ eyebrow, title, body, children, layout = "default" }) {
  if (layout === "split") {
    return (
      <section className="flex flex-col gap-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6 items-end pb-4 border-b border-veil-gray-light">
          <div>
            <span className="font-label-caps text-label-caps text-veil-purple uppercase">{eyebrow}</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white font-bold uppercase mt-2 tracking-tight">
              {title}
            </h2>
          </div>
          <p className="font-body-md text-body-md text-veil-white opacity-75 max-w-xl">{body}</p>
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <div className="max-w-3xl flex flex-col gap-3 pb-4 border-b border-veil-gray-light">
        <span className="font-label-caps text-label-caps text-veil-purple uppercase">{eyebrow}</span>
        <h2 className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white font-bold uppercase tracking-tight">
          {title}
        </h2>
        <p className="font-body-md text-body-md text-veil-white opacity-75">{body}</p>
      </div>
      {children}
    </section>
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
      id: "prize-funding",
      number: "03",
      title: "Prize Funding",
      subtitle: "Testnet Mock Reserve",
      desc: "On Sepolia, the keeper funds an encrypted prize reserve. On mainnet, this becomes real yield routing: a yield adapter routes strategy returns into the same confidential prize flow.",
      tag: "KEEPER_FUNDED_RESERVE",
      metric: "Mock Reserve Active",
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
      desc: "Winner claims the encrypted prize payout privately. All non-winning participants retain 100% of their initial principal.",
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-veil-gray-light">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-veil-purple animate-pulse" />
          <span className="font-label-caps text-label-caps text-veil-purple uppercase tracking-wider">Live Architecture Stream</span>
        </div>
        <div className="flex items-center gap-3 bg-veil-gray-dark px-4 py-2 border border-veil-gray-light font-data-sm text-data-sm text-veil-white opacity-80">
          <span>PROTOCOL STATE: FULLY ENCRYPTED</span>
        </div>
      </div>

      <div className="relative py-2 hidden lg:block">
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
      desc: "Sepolia uses a keeper-funded mock reserve; future mainnet yield routing can plug real strategy returns into the prize flow."
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
