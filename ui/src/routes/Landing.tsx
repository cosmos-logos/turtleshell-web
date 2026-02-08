import { Link } from 'react-router-dom';

const features = [
  {
    icon: '💬',
    title: 'Streaming AI Chat',
    description:
      'Real-time conversation with Athena LLM. Server-sent events deliver token-by-token responses as they\'re generated.',
  },
  {
    icon: '🔗',
    title: 'Service Registry',
    description:
      'Connect Salesforce, GitHub, HubSpot, and more with OAuth PKCE. Manage all your enterprise service connections in one place.',
  },
  {
    icon: '🤖',
    title: 'Agent System',
    description:
      'Switch between specialized AI agents. Each agent has unique capabilities and access to different connected services.',
  },
  {
    icon: '🛡️',
    title: 'MCP Protocol',
    description:
      'Model Context Protocol enables Athena to securely interact with your connected services in real-time during conversations.',
  },
  {
    icon: '⚡',
    title: 'Multi-Environment',
    description:
      'Switch between Production, Off-Grid, and Custom endpoints. Development and production in one interface.',
  },
  {
    icon: '📖',
    title: 'Documentation Viewer',
    description:
      'Browse agent documentation, API references, and integration guides without leaving the app.',
  },
];

const services = [
  { icon: '☁️', name: 'Salesforce' },
  { icon: '🐙', name: 'GitHub' },
  { icon: '🟠', name: 'HubSpot' },
  { icon: '📅', name: 'Google Calendar' },
  { icon: '💼', name: 'Workday' },
  { icon: '💬', name: 'Slack' },
];

export function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-20 text-center">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-border rounded-full text-xs text-text-secondary mb-8">
            <div className="w-1.5 h-1.5 bg-shell-400 rounded-full animate-pulse-dot" />
            <span>Powered by Athena LLM on Olympus-Grid</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-none mb-6">
            Your{' '}
            <span className="bg-gradient-to-br from-shell-400 via-lime-400 to-shell-500 bg-clip-text text-transparent">
              sovereign AI
            </span>
            <br />
            assistant.
          </h1>

          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            One interface to chat with AI, manage enterprise services, and execute workflows.
            Salesforce, GitHub, Slack — all connected through the Model Context Protocol.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
            >
              Open TurtleShell →
            </Link>
            <a
              href="/download"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold border border-border text-text-secondary hover:bg-surface-2 hover:text-text-primary transition-all"
            >
              📱 iOS App
            </a>
          </div>

          {/* Terminal preview */}
          <div className="max-w-2xl mx-auto mt-16" style={{ perspective: '1000px' }}>
            <div
              className="bg-surface-1 border border-border rounded-xl overflow-hidden transition-transform duration-300 hover:[transform:rotateX(0deg)]"
              style={{ transform: 'rotateX(2deg)' }}
            >
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-2 border-b border-border-muted">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
              </div>
              <div className="p-5 font-mono text-xs sm:text-sm leading-loose text-text-secondary text-left min-h-[200px]">
                <div>
                  <span className="text-shell-400">athena &gt;</span>{' '}
                  <span className="text-text-primary">Show me the open support cases from Salesforce with priority P1</span>
                </div>
                <div className="pl-4 border-l-2 border-border-muted my-2">
                  <span className="text-text-muted">// Querying Salesforce via MCP...</span>
                  <br />
                  Found <strong className="text-shell-400">3 open P1 cases</strong>:
                  <br /><br />
                  <span className="text-text-primary">CASE-1042</span> — Payment gateway timeout (Acme Corp)
                  <br />
                  <span className="text-text-primary">CASE-1038</span> — SSO login failure (TechNova Inc)
                  <br />
                  <span className="text-text-primary">CASE-1035</span> — Data sync error (Global Systems)
                  <br /><br />
                  <span className="text-text-muted">Shall I draft responses for any of these?</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20">
        <div className="max-w-[1120px] mx-auto px-6">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-3">
            Built for the enterprise stack.
          </h2>
          <p className="text-base text-text-secondary text-center mb-14">
            Every feature from the iOS app, now in your browser.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-surface-1 border border-border-muted rounded-xl p-7 transition-all duration-200 hover:border-border hover:bg-surface-2 hover:-translate-y-0.5"
              >
                <div className="w-10 h-10 bg-surface-3 border border-border rounded-lg flex items-center justify-center text-lg mb-4">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold mb-2 tracking-tight">{f.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services strip */}
      <section id="services" className="py-16 border-t border-b border-border-muted">
        <div className="max-w-[1120px] mx-auto px-6">
          <h3 className="text-center text-xs uppercase tracking-widest font-medium text-text-muted mb-8">
            Connects to your tools
          </h3>
          <div className="flex items-center justify-center gap-12 flex-wrap">
            {services.map((s) => (
              <div
                key={s.name}
                className="flex items-center gap-2.5 text-text-muted text-sm font-medium hover:text-text-secondary transition-colors"
              >
                <div className="w-8 h-8 bg-surface-2 rounded-lg flex items-center justify-center text-base">
                  {s.icon}
                </div>
                {s.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-[1120px] mx-auto px-6">
          <div className="relative bg-gradient-to-br from-surface-1 to-surface-2 border border-border rounded-2xl px-10 py-16 text-center overflow-hidden">
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/5 h-px"
              style={{
                background: 'linear-gradient(90deg, transparent, var(--color-shell-500, #22c55e), transparent)',
              }}
            />
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              Ready to connect your stack?
            </h2>
            <p className="text-base text-text-secondary mb-8">
              TurtleShell.ai is free to get started. Connect your first service in under a minute.
            </p>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
            >
              Launch TurtleShell →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
