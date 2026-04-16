import { Link } from 'react-router-dom';

/**
 * Turtle Cave (off-grid appliance family) section. Three device cards
 * + primary CTA. All CTAs route through the waitlist flow — no
 * e-commerce storefront on the public surface yet.
 */
export function OffGridDevices() {
  return (
    <section id="offgrid" className="max-w-[1200px] mx-auto px-6 md:px-16 py-24 text-center">
      <div className="max-w-[640px] mx-auto mb-12">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          Turtle Cave
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
          Step Outside.
          <br />
          Deploy Your Shell.
        </h2>
        <p className="text-base text-text-muted font-light">
          The off-grid appliance family. Solar-powered. BLE-discoverable from your iPhone.
          The product ladder that brings the sovereign grid to your backyard.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-5 mb-10">
        <Device icon="🐢" name="Turtle Cave Kit" desc="Mac Mini DIY kit. Yours to own and operate." />
        <Device icon="🥧" name="Turtle Cave Pi" desc="Raspberry Pi 5. Compact sovereign node." />
        <Device icon="🏛" name="Turtle Cave Appliance" desc="Custom ARM. Purpose-built for the grid." />
      </div>

      <Link
        to="/offgrid"
        className="inline-flex items-center border border-border rounded px-8 py-3 text-xs font-medium tracking-[0.08em] uppercase text-text-secondary hover:border-shell-500 hover:text-shell-400 transition-colors no-underline"
      >
        Reserve Your Cave →
      </Link>
    </section>
  );
}

function Device({ icon, name, desc }: { icon: string; name: string; desc: string }) {
  return (
    <div className="rounded-lg border border-border-muted bg-surface-1/70 px-6 py-8 min-w-[180px] max-w-[240px] text-center">
      <div className="text-4xl mb-4 leading-none">{icon}</div>
      <div className="text-xs uppercase tracking-[0.15em] text-text-primary font-semibold mb-2">
        {name}
      </div>
      <div className="text-xs text-text-muted font-light leading-relaxed">{desc}</div>
    </div>
  );
}
