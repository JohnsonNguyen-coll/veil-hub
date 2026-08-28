import { privacyRows, userFlow } from "./landingData.js";

export const docsTopics = [
  {
    slug: "overview",
    eyebrow: "01 / Overview",
    title: "What VeilHubs Is",
    summary: "A confidential no-loss prize pool with a public Global Pool and invite-only Private Clubs.",
    status: "PRODUCT_BRIEF",
    sections: [
      {
        title: "Core Idea",
        body: "VeilHubs is a social prize-savings product. Users deposit into a pool, keep the right to withdraw their principal, and compete for prizes funded by generated yield. The confidential layer changes what the public can see: deposits, balances, winnings, pool totals, and odds are treated as private financial state instead of public leaderboard data."
      },
      {
        title: "Why It Exists",
        body: "Traditional prize pools are easy to inspect but poor for privacy. Anyone can infer who is depositing, how much capital a user controls, and what their odds may be. VeilHubs keeps the social and game-like appeal while hiding sensitive financial information."
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

export const docsBySlug = Object.fromEntries(docsTopics.map((topic) => [topic.slug, topic]));
