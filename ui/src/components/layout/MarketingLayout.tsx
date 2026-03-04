import { Outlet, Link, useLocation } from 'react-router-dom';

export function MarketingLayout() {
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  return (
    <div className="min-h-screen bg-surface-0 text-text-primary">
      {/* Grid background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(34,197,94,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,197,94,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(34,197,94,0.06) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Fixed top nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-16 border-b border-border-muted bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-[1120px] mx-auto px-6 h-full flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-lg">
              🐢
            </div>
            <span className="font-semibold text-lg tracking-tight text-text-primary">
              TurtleShell<span className="text-shell-400">.ai</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {isLanding && (
              <>
                <a href="#features" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                  Features
                </a>
                <a href="#services" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
                  Services
                </a>
              </>
            )}
            <Link to="/terms" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Terms
            </Link>
            <Link to="/security" className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors">
              Security
            </Link>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
            >
              Launch App →
            </Link>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border-muted">
        <div className="max-w-[1120px] mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-text-muted">
            &copy; 2026 CloudPremise LLC. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link to="/privacy" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Privacy Policy
            </Link>
            <Link to="/security" className="text-xs text-text-muted hover:text-text-secondary transition-colors">
              Security
            </Link>
            <a
              href="https://github.com/cosmos-logos/turtleshell-web"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
