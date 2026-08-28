import { LogoMark } from "../common/LogoMark.jsx";
import { VeilButton, ConnectWalletButton } from "../common/VeilButton.jsx";

export function LandingHeader({ navigate, view }) {
  const isDocs = view === "docs";

  return (
    <nav className="fixed top-0 w-full z-50 bg-veil-black border-b border-veil-gray-light">
      <div className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full max-w-container-max mx-auto">
        <button className="flex items-center gap-2" onClick={() => navigate("/")} type="button">
          <LogoMark className="w-12 h-12" />
          <span className="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-veil-white tracking-tighter">VeilHubs</span>
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

export function AppHeader({ activePage, navigate, navigatePage, onFaucet }) {
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
            <span className="font-headline-lg-mobile text-headline-lg-mobile md:text-headline-lg text-veil-white tracking-tighter">VeilHubs</span>
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
