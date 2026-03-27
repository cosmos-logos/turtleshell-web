import { useRef, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

/* ── Scroll fade-in ─────────────────────────────────── */

function useScrollFade() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return {
    ref,
    className: `transition-all duration-700 ease-out ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
    }`,
  };
}

function FadeSection({ children, className = '' }: { children: ReactNode; className?: string }) {
  const fade = useScrollFade();
  return (
    <div ref={fade.ref} className={`${fade.className} ${className}`}>
      {children}
    </div>
  );
}

/* ── Data ────────────────────────────────────────────── */

const isMac =
  typeof navigator !== 'undefined' &&
  (navigator.platform.toUpperCase().includes('MAC') ||
    navigator.userAgent.includes('Macintosh'));

const pillars = [
  {
    title: 'The Whole Fleet',
    body: '31 intelligent microservices wake up on your machine. Athena routes your AI across every frontier model. Mnemosyne remembers every conversation. Proteus stores your data in any database you choose. All of it. Yours. Local. Forever.',
  },
  {
    title: 'One Installer',
    body: 'Download the .pkg. Double-click. Three screens. Docker installs. Tailscale installs. The fleet wakes up. Your browser opens to your sovereign dashboard. No terminal. No configuration. No compromise.',
  },
  {
    title: 'Connect From Anywhere',
    body: 'Your iPhone connects to your node over Tailscale or ngrok. Your data never leaves your hardware unless you move it. The node registers its identity through Cosmos-Logos \u2014 cryptographically sovereign from day one.',
  },
];

const fleet = [
  { name: 'Athena', role: 'LLM Router' },
  { name: 'Mnemosyne', role: 'Memory' },
  { name: 'Proteus', role: 'Universal ORM' },
  { name: 'Ares', role: 'API Gateway' },
  { name: 'Hermes', role: 'CORS Proxy' },
  { name: 'Zeus', role: 'Fleet Controller' },
  { name: 'Plutus', role: 'Billing' },
  { name: 'TurtleShell', role: 'Web Dashboard' },
];

const providers = ['Anthropic', 'OpenAI', 'Grok', 'Gemini', 'Ollama'];

/* ── Page ────────────────────────────────────────────── */

export function OffGrid() {
  return (
    <>
      {/* Hero */}
      <section className="pt-24 pb-20 text-center">
        <div className="max-w-[1120px] mx-auto px-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-surface-2 border border-border rounded-full text-xs text-text-secondary mb-8">
            <div className="w-1.5 h-1.5 bg-shell-400 rounded-full animate-pulse-dot" />
            <span>turtleshell.ai &mdash; Sovereign AI Infrastructure</span>
          </span>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter leading-none mb-6">
            <span className="bg-gradient-to-br from-shell-400 via-lime-400 to-shell-500 bg-clip-text text-transparent">
              TURTLESHELL
            </span>
            <br />
            OFF-GRID
          </h1>

          <p className="text-lg text-text-secondary max-w-xl mx-auto mb-10 leading-relaxed">
            Your AI fleet. Your hardware. Your rules.
            One installer. One double-click. Your sovereign AI node is live on your own machine.
            No cloud account required. No monthly platform bill. No permission needed from anyone.
          </p>

          {isMac ? (
            <div className="mb-10">
              <a
                href="/download/TurtleShell-1.7.0.pkg"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-base font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
              >
                &#11015; Download for Mac
              </a>
              <p className="text-xs text-text-muted mt-3">
                Version 1.7.0 &middot; macOS 13+ &middot; Apple Silicon &amp; Intel
              </p>
              <p className="text-xs text-text-muted">
                Free to install &middot; Bring your own API keys
              </p>
            </div>
          ) : (
            <div className="mb-10">
              <p className="text-sm text-text-secondary">
                Available for macOS now &middot; iOS &middot; Android &middot; Windows coming soon
              </p>
            </div>
          )}

          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-shell-400 hover:text-shell-300 transition-colors"
          >
            Learn about the full platform &rarr;
          </Link>
        </div>
      </section>

      {/* Three Pillars */}
      <FadeSection>
        <section className="py-20 border-t border-border-muted">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {pillars.map((p) => (
                <div
                  key={p.title}
                  className="bg-surface-1 border border-border-muted rounded-xl p-7 transition-all duration-200 hover:border-border hover:bg-surface-2 hover:-translate-y-0.5"
                >
                  <div className="w-10 h-10 bg-surface-3 border border-border rounded-lg flex items-center justify-center text-lg mb-4 text-shell-400">
                    &#x2B25;
                  </div>
                  <h3 className="text-base font-semibold mb-2 tracking-tight">{p.title}</h3>
                  <p className="text-sm text-text-muted leading-relaxed">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Quote */}
      <FadeSection>
        <section className="py-20 border-t border-border-muted">
          <div className="max-w-[1120px] mx-auto px-6 text-center">
            <blockquote className="max-w-2xl mx-auto">
              <p className="text-xl sm:text-2xl italic text-text-secondary leading-relaxed mb-6">
                &ldquo;Let the story be true.
                <br />
                Let the turtle do its work.
                <br />
                Do the work you had been assigned.&rdquo;
              </p>
              <cite className="text-sm text-shell-400 not-italic font-medium">
                &mdash; @alchemisthomer
              </cite>
            </blockquote>
          </div>
        </section>
      </FadeSection>

      {/* Requirements + What Gets Installed */}
      <FadeSection>
        <section className="py-20 border-t border-border-muted">
          <div className="max-w-[1120px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {/* Left — System Requirements */}
              <div>
                <h2 className="text-lg font-semibold mb-6 tracking-tight">System Requirements</h2>
                <ul className="space-y-2.5 text-sm text-text-secondary leading-relaxed">
                  <li>macOS 13 Ventura or later</li>
                  <li>Apple Silicon or Intel</li>
                  <li>8GB RAM minimum (16GB recommended)</li>
                  <li>20GB free disk space</li>
                  <li>Internet connection (for initial setup)</li>
                </ul>
                <div className="mt-6 pt-4 border-t border-border-muted">
                  <p className="text-xs text-text-muted font-medium mb-2">Installed automatically:</p>
                  <div className="flex gap-2">
                    <span className="px-3 py-1.5 bg-surface-2 border border-border-muted rounded-lg text-xs font-medium text-text-secondary">
                      Docker Desktop
                    </span>
                    <span className="px-3 py-1.5 bg-surface-2 border border-border-muted rounded-lg text-xs font-medium text-text-secondary">
                      Tailscale
                    </span>
                  </div>
                </div>
              </div>

              {/* Right — What Gets Installed */}
              <div>
                <h2 className="text-lg font-semibold mb-6 tracking-tight">What Gets Installed</h2>
                <div className="flex flex-wrap gap-2">
                  {fleet.map((s) => (
                    <div
                      key={s.name}
                      className="flex items-center gap-2 px-3 py-2 bg-surface-1 border border-border-muted rounded-lg"
                    >
                      <span className="text-sm font-medium text-text-primary">{s.name}</span>
                      <span className="text-2xs text-text-muted">{s.role}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* Bring Your Own Keys */}
      <FadeSection>
        <section className="py-20 border-t border-border-muted">
          <div className="max-w-[1120px] mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold tracking-tight mb-3">
              The installer builds the infrastructure.
              <br />
              You bring the intelligence.
            </h2>
            <p className="text-base text-text-secondary mb-8">
              Connect your API keys after install:
            </p>
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {providers.map((p) => (
                <span
                  key={p}
                  className="px-4 py-2 bg-surface-2 border border-border-muted rounded-lg text-sm font-medium text-text-secondary"
                >
                  {p}
                </span>
              ))}
            </div>
            <p className="text-sm text-text-muted">
              Ollama runs completely locally &mdash; no API key required.
              <br />
              Your data never leaves your machine.
            </p>
          </div>
        </section>
      </FadeSection>
    </>
  );
}
