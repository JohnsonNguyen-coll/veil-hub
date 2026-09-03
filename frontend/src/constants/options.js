export const defaultPools = [
  {
    id: "global",
    name: "Global Pool",
    scope: "PUBLIC",
    contractId: "0",
    tvl: "encrypted",
    members: "0",
    nextDrawAt: null,
    hasPrizeReserve: false,
    draw: "--",
    prize: "•••••• USDC",
    status: "ACTIVE"
  }
];

export const defaultDrawHistory = [];

export const DRAW_QUEUED_HINT =
  "Draw time reached. Waiting for the keeper to fund prize and execute the onchain weighted draw. This usually takes around 1-2 minutes.";

export const AWAITING_PRIZE_HINT =
  "Pool has members, but the keeper has not funded the encrypted prize reserve yet. This usually takes around 1-2 minutes.";

export const DRAW_FREQUENCY_OPTIONS = [
  { label: "Daily", seconds: 86_400, milliseconds: 86_400_000 },
  { label: "Weekly", seconds: 604_800, milliseconds: 604_800_000 },
  { label: "Monthly", seconds: 2_592_000, milliseconds: 2_592_000_000 }
];

export const DIRECTORY_VISIBILITY_OPTIONS = [
  { label: "Invite Only", anonymousMembers: true },
  { label: "Public Directory", anonymousMembers: false }
];

export const APP_ROUTES = {
  dashboard: "/app/dashboard",
  global: "/app/global-pool",
  clubs: "/app/clubs",
  draws: "/app/draws",
  account: "/app/account"
};

export const PATH_TO_PAGE = Object.fromEntries(Object.entries(APP_ROUTES).map(([page, path]) => [path, page]));
