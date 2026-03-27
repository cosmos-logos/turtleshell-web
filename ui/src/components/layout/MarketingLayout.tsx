import { useState } from 'react';
import { Outlet, Link } from 'react-router-dom';

const scrollToTop = () => window.scrollTo(0, 0);

const navLinkClass = 'text-sm font-medium text-text-secondary hover:text-text-primary transition-colors';
const mobileLinkClass = 'block w-full px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors';
const footerLinkClass = 'text-xs text-text-muted hover:text-text-secondary transition-colors';

export function MarketingLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

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
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border-muted bg-surface-0/80 backdrop-blur-xl">
        <div className="max-w-[1120px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 no-underline">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-shell-500 to-shell-400 flex items-center justify-center text-lg">
              🐢
            </div>
            <span className="font-semibold text-lg tracking-tight text-text-primary">
              TurtleShell<span className="text-shell-400">.ai</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="/#features" className={navLinkClass}>Features</a>
            <a href="/#services" className={navLinkClass}>Services</a>
            <a href="/#pricing" className={navLinkClass}>Pricing</a>
            <Link to="/offgrid" onClick={scrollToTop} className={navLinkClass}>Off-Grid</Link>
            <a href="/#support" className={navLinkClass}>Support</a>
            <Link to="/terms" onClick={scrollToTop} className={navLinkClass}>Terms</Link>
            <Link to="/privacy" onClick={scrollToTop} className={navLinkClass}>Privacy</Link>
            <Link to="/security" onClick={scrollToTop} className={navLinkClass}>Security</Link>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
            >
              Launch App →
            </Link>
          </div>

          {/* Hamburger button */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
            aria-label="Toggle menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="4" y1="4" x2="16" y2="16" />
                  <line x1="16" y1="4" x2="4" y2="16" />
                </>
              ) : (
                <>
                  <line x1="3" y1="5" x2="17" y2="5" />
                  <line x1="3" y1="10" x2="17" y2="10" />
                  <line x1="3" y1="15" x2="17" y2="15" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border-muted bg-surface-0/95 backdrop-blur-xl">
            <div className="py-2">
              <div className="px-4 pt-1 pb-3">
                <Link
                  to="/app/chat"
                  onClick={closeMenu}
                  className="block w-full text-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all"
                >
                  Launch App →
                </Link>
              </div>
              <a href="/#features" onClick={closeMenu} className={mobileLinkClass}>Features</a>
              <a href="/#services" onClick={closeMenu} className={mobileLinkClass}>Services</a>
              <a href="/#pricing" onClick={closeMenu} className={mobileLinkClass}>Pricing</a>
              <Link to="/offgrid" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Off-Grid</Link>
              <a href="/#support" onClick={closeMenu} className={mobileLinkClass}>Support</a>
              <Link to="/terms" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Terms</Link>
              <Link to="/privacy" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Privacy</Link>
              <Link to="/security" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Security</Link>
            </div>
          </div>
        )}
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
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-2">
            <a href="/#features" className={footerLinkClass}>Features</a>
            <a href="/#services" className={footerLinkClass}>Services</a>
            <a href="/#pricing" className={footerLinkClass}>Pricing</a>
            <Link to="/offgrid" onClick={scrollToTop} className={footerLinkClass}>Off-Grid</Link>
            <a href="/#support" className={footerLinkClass}>Support</a>
            <Link to="/terms" onClick={scrollToTop} className={footerLinkClass}>Terms</Link>
            <Link to="/privacy" onClick={scrollToTop} className={footerLinkClass}>Privacy</Link>
            <Link to="/security" onClick={scrollToTop} className={footerLinkClass}>Security</Link>
            <a href="https://github.com/olympus-616/foundation" target="_blank" rel="noopener noreferrer" className={footerLinkClass}>GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
