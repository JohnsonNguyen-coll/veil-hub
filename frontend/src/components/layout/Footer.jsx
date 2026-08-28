import { LogoMark } from "../common/LogoMark.jsx";
import { StatusDot } from "../common/StatusDot.jsx";

export function FooterColumn({ title, links }) {
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

export function AppFooter() {
  return (
    <footer className="border-t border-veil-gray-light bg-veil-black">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto py-5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span className="font-data-sm text-data-sm text-veil-white opacity-50 uppercase">VeilHubs App</span>
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

export function Footer() {
  return (
    <footer className="bg-veil-black border-t border-veil-gray-light py-16 w-full mt-auto">
      <div className="px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <LogoMark />
              <span className="font-headline-lg-mobile text-headline-lg-mobile text-veil-white tracking-tighter">VeilHubs</span>
            </div>
            <p className="font-body-md text-body-md text-veil-white opacity-60">The Confidential Yield Layer.</p>
          </div>
          <FooterColumn title="Protocol" links={["Global Pool", "Private Clubs", "Yields", "Security"]} />
          <FooterColumn title="Governance" links={["DAO", "Docs", "Brand"]} />
          <FooterColumn title="Socials" links={["X", "Discord", "Telegram", "GitHub"]} />
        </div>
        <div className="pt-8 border-t border-veil-gray-light flex flex-col md:flex-row justify-between items-center gap-6">
          <span className="font-data-sm text-data-sm text-veil-white opacity-60 uppercase">© 2026 VeilHubs.</span>
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
