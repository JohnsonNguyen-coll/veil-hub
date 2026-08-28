export const defaultPools = [
  {
    id: "global",
    name: "Global Pool",
    scope: "PUBLIC",
    contractId: "0",
    tvl: "encrypted",
    members: "0",
    nextDrawAt: null,
    draw: "--",
    prize: "•••••• USDC",
    status: "ACTIVE"
  }
];

export const defaultDrawHistory = [];

export const DRAW_FREQUENCY_OPTIONS = [
  { label: "2 minutes (test)", seconds: 120, milliseconds: 120_000 },
  { label: "Daily", seconds: 86_400, milliseconds: 86_400_000 },
  { label: "Weekly", seconds: 604_800, milliseconds: 604_800_000 },
  { label: "Monthly", seconds: 2_592_000, milliseconds: 2_592_000_000 }
];

export const DIRECTORY_VISIBILITY_OPTIONS = [
  { label: "Anonymous UI", anonymousMembers: true },
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
