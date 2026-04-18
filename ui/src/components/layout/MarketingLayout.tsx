import { useState, useCallback } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useThemeStore } from '@/lib/store/theme-store';

const scrollToTop = () => window.scrollTo(0, 0);

const navLinkClass = 'text-sm font-medium text-text-secondary hover:text-text-primary transition-colors';
const mobileLinkClass = 'block w-full px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors';
const footerLinkClass = 'text-xs text-text-muted hover:text-text-secondary transition-colors';

export function MarketingLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, setTheme } = useThemeStore();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const location = useLocation();

  const closeMenu = () => setMenuOpen(false);

  const scrollToHash = useCallback((hash: string) => {
    const id = hash.replace('#', '');
    if (location.pathname !== '/') {
      navigate('/', { replace: false });
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.pathname, navigate]);

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
            <span className="font-semibold text-lg tracking-tight text-text-primary">
              TurtleShell<span className="text-shell-400">.ai</span>
            </span>
          </Link>

          {/* Desktop nav — aligned with the new Landing narrative:
              Mission · Plans · Olympus-Grid · Off-Grid · Learn · Terms
              · Privacy · Security. Features + Services + Support were
              folded into the Olympus-Grid and Mission sections. */}
          <div className="hidden md:flex items-center gap-7">
            <button onClick={() => scrollToHash('mission')} className={navLinkClass}>Mission</button>
            <button onClick={() => scrollToHash('pricing')} className={navLinkClass}>Plans</button>
            <Link to="/causes" onClick={scrollToTop} className={navLinkClass}>Causes</Link>
            <button onClick={() => scrollToHash('olympus')} className={navLinkClass}>Olympus-Grid</button>
            <Link to="/offgrid" onClick={scrollToTop} className={navLinkClass}>Off-Grid</Link>
            <Link to="/learn" onClick={scrollToTop} className={navLinkClass}>Learn</Link>
            <Link to="/terms" onClick={scrollToTop} className={navLinkClass}>Terms</Link>
            <Link to="/privacy" onClick={scrollToTop} className={navLinkClass}>Privacy</Link>
            <Link to="/security" onClick={scrollToTop} className={navLinkClass}>Security</Link>
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-2 transition-colors"
              title={isDark ? 'Light mode' : 'Dark mode'}
            >
              {isDark ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              )}
            </button>
            <Link
              to="/app/chat"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-all hover:-translate-y-px hover:shadow-lg hover:shadow-shell-500/30"
            >
              Launch App →
            </Link>
          </div>

          {/* Mobile: Launch App + hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <Link
              to="/app/chat"
              className="inline-flex items-center px-3.5 py-2 rounded-lg text-xs font-semibold bg-shell-500 text-white hover:bg-shell-600 transition-colors"
            >
              Launch App →
            </Link>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 rounded-lg text-text-secondary hover:bg-surface-2 transition-colors"
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
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border-muted bg-surface-0/95 backdrop-blur-xl">
            <div className="py-2">
              <button onClick={() => { scrollToHash('mission'); closeMenu(); }} className={mobileLinkClass}>Mission</button>
              <button onClick={() => { scrollToHash('pricing'); closeMenu(); }} className={mobileLinkClass}>Plans</button>
              <Link to="/causes" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Causes</Link>
              <button onClick={() => { scrollToHash('olympus'); closeMenu(); }} className={mobileLinkClass}>Olympus-Grid</button>
              <Link to="/offgrid" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Off-Grid</Link>
              <Link to="/learn" onClick={() => { scrollToTop(); closeMenu(); }} className={mobileLinkClass}>Learn</Link>
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
            <button onClick={() => scrollToHash('mission')} className={footerLinkClass}>Mission</button>
            <button onClick={() => scrollToHash('pricing')} className={footerLinkClass}>Plans</button>
            <Link to="/causes" onClick={scrollToTop} className={footerLinkClass}>Causes</Link>
            <button onClick={() => scrollToHash('olympus')} className={footerLinkClass}>Olympus-Grid</button>
            <Link to="/offgrid" onClick={scrollToTop} className={footerLinkClass}>Off-Grid</Link>
            <Link to="/learn" onClick={scrollToTop} className={footerLinkClass}>Learn</Link>
            <Link to="/terms" onClick={scrollToTop} className={footerLinkClass}>Terms</Link>
            <Link to="/privacy" onClick={scrollToTop} className={footerLinkClass}>Privacy</Link>
            <Link to="/security" onClick={scrollToTop} className={footerLinkClass}>Security</Link>
            <a href="https://github.com/olympus-616/foundation" target="_blank" rel="noopener noreferrer" className={footerLinkClass}>Foundation</a>
            <a href="https://github.com/cosmos-logos" target="_blank" rel="noopener noreferrer" className={footerLinkClass}>Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
