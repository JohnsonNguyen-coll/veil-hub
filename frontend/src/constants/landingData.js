export const landingAdvantages = [
  ["Private Capital", "Deposits and odds remain encrypted via FHEVM on-chain keys."],
  ["No-Loss Exit", "Withdraw 100% of your principal anytime. Yield funds the prize."],
  ["Social Pools", "Private Clubs enable group prize pools without bankroll exposure."],
  ["Onchain Flow", "Wallet actions are only acknowledged after Sepolia transaction receipts."]
];

export const landingPoolModes = [
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

export const landingDrawSteps = [
  ["01", "Deposit", "The user enters a pool with an encrypted amount, so the chain sees activity but not the plaintext balance."],
  ["02", "Yield", "Principal remains withdrawable while generated yield accumulates into the prize stream."],
  ["03", "Draw", "A scheduled draw selects a winner from confidential pool state and emits only the public event surface."],
  ["04", "Claim", "The winner decrypts their own prize and claims it, without revealing everyone else's position."]
];

export const landingPrivacyBlocks = [
  ["Hidden", "Balances, deposits, pool capital, personal odds, and prize amounts."],
  ["User Controlled", "Own balance, own winnings, and claimable prize after wallet-approved decrypt."],
  ["Public Surface", "Pool identity, draw timing, transactions, and optional winner address for transparency."]
];

export const landingBriefs = [
  {
    eyebrow: "01 / Product",
    title: "Global Pool + Private Clubs",
    body: "VeilHubs is a confidential no-loss prize pool. New users can enter the public Global Pool, while groups can create invitation-only clubs with independent deposits, yield, and draws.",
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

export const userFlow = [
  ["Connect", "Connect a Sepolia wallet and prepare encrypted transaction inputs."],
  ["Enter", "Join the Global Pool or create/join a Private Club by invite code."],
  ["Deposit", "Encrypt deposit amount client-side and submit proof to the pool contract."],
  ["Draw", "Keeper or admin triggers a scheduled prize draw using encrypted state."],
  ["Decrypt", "Winner decrypts claimable prize; users can decrypt their own balance."],
  ["Withdraw", "Principal remains no-loss and can be withdrawn when the user exits."]
];

export const privacyRows = [
  ["Hidden", "Individual balances, deposit amounts, winnings, odds, total private club capital"],
  ["User-only", "Own balance, own winnings, own claimable prize after wallet-authorized decryption"],
  ["Public", "Pool ids, draw timestamps, tx hashes, optional winner address, public metadata"],
  ["Backend", "Stores only metadata and event cache; never stores decrypted values"]
];
