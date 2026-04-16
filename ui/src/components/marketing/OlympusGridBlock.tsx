import { Link } from 'react-router-dom';

/**
 * "Enterprise-Grade Sovereign AI · Certified on Salesforce AppExchange"
 * Dark-band section with a pulsing 31-agent mesh diagram on the left
 * and prose + AppExchange badge on the right. The AppExchange link is
 * a placeholder (`#`) until the listing is live — update when ready.
 */
export function OlympusGridBlock() {
  return (
    <section
      id="olympus"
      className="relative bg-surface-1 border-y border-border-muted"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 py-24">
        <div className="text-center max-w-[700px] mx-auto mb-16">
          <div className="text-2xs uppercase tracking-[0.3em] text-amber-400 mb-3">
            Olympus-Grid
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
            Enterprise-Grade Sovereign AI.
            <br />
            <span className="text-amber-400">Certified on Salesforce AppExchange.</span>
          </h2>
          <p className="text-base text-text-muted font-light">
            Salesforce is the reliable infrastructure that maintains Grid SLA. Olympus-Grid brings
            sovereign AI into the enterprise — running within your own walls, on your own rules.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <MeshDiagram />
          <div>
            <h3 className="text-2xl font-semibold tracking-tight mb-4">The Grid SLA.</h3>
            <p className="text-text-muted font-light leading-loose mb-4">
              Olympus-Grid is a{' '}
              <strong className="text-text-primary font-medium">31-agent sovereign mesh</strong>{' '}
              named for the Greek pantheon — each agent a specialist, each conversation sovereign.
              Athena routes your prompt to the best available model. Poseidon connects your
              enterprise tools via MCP. Proteus bridges Salesforce to AWS. Iris surfaces the
              interface anywhere.
            </p>
            <p className="text-text-muted font-light leading-loose mb-6">
              The enterprise layer is{' '}
              <strong className="text-text-primary font-medium">
                live on the Salesforce AppExchange
              </strong>
              . Olympus-Grid delivers the reliability guarantees your enterprise requires — with the
              sovereignty your users deserve.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="https://appexchange.salesforce.com/appxListingDetail?listingId=aadbbe80-2d4e-42bc-84bd-348ade18a00a"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 border border-amber-500/30 rounded px-5 py-3 text-xs font-medium tracking-[0.08em] uppercase text-amber-400 hover:bg-amber-500/10 transition-colors no-underline"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                View on AppExchange
              </a>
              <Link
                to="/login?source=olympus_grid_enterprise"
                className="inline-flex items-center border border-border rounded px-5 py-3 text-xs font-medium tracking-[0.08em] uppercase text-text-secondary hover:border-shell-500 hover:text-shell-400 transition-colors no-underline"
              >
                Enterprise Inquiry
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MeshDiagram() {
  return (
    <div className="relative h-[360px]" aria-hidden>
      {/* Concentric pulse rings */}
      <Pulse delay={0} size={80} />
      <Pulse delay={1} size={160} />
      <Pulse delay={2} size={260} />
      {/* Core */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 border border-shell-500 bg-shell-500/10 rounded-sm px-5 py-3 text-center whitespace-nowrap"
      >
        <div className="text-xs font-semibold uppercase tracking-[0.15em] text-text-primary">
          Olympus-616
        </div>
        <div className="text-[0.6rem] tracking-[0.1em] text-shell-400/70 mt-0.5">
          31-Agent Mesh
        </div>
      </div>
      {/* Satellite nodes */}
      <Node className="top-[8%] left-[5%]">Athena · LLM Router</Node>
      <Node className="top-[8%] right-[5%]">Hermes · API Gateway</Node>
      <Node className="bottom-[8%] left-[5%]">Proteus · ORM</Node>
      <Node className="bottom-[8%] right-[5%]">Iris · Portal</Node>
      <Node gold className="top-1/2 left-0 -translate-y-1/2">
        Poseidon · MCP
      </Node>
      <Node gold className="top-1/2 right-0 -translate-y-1/2">
        Gate · Identity
      </Node>
    </div>
  );
}

function Pulse({ delay, size }: { delay: number; size: number }) {
  return (
    <div
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-shell-500/15"
      style={{
        width: size,
        height: size,
        animation: `olympus-pulse 3s ease-out ${delay}s infinite`,
      }}
    />
  );
}

function Node({
  children,
  className = '',
  gold = false,
}: {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}) {
  return (
    <div
      className={`absolute border rounded-sm px-3 py-1.5 whitespace-nowrap text-[0.68rem] tracking-[0.15em] uppercase ${
        gold
          ? 'border-amber-500/30 text-amber-400 bg-amber-500/[0.04]'
          : 'border-border-muted text-shell-400 bg-shell-500/[0.04]'
      } ${className}`}
    >
      {children}
    </div>
  );
}
