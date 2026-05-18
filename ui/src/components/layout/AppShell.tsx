import { Outlet, useNavigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useEffect, useState } from 'react';
import { useApolloStore } from '@/lib/store/apollo-store';
import * as audioManager from '@/lib/audio/audio-manager';
import { AudioPlayerBar } from '@/components/audio/AudioPlayerBar';
import { clearAllUserSessionState, ogRequest, serverLogout } from '@/lib/api/olympus-grid-client';
import { useServiceStore } from '@/lib/store/service-store';

export function AppShell() {
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Server-truth onboarding gate. An authed user who abandons the
  // onboarding flow (closes the tab at the cause/tier/guide step, Stripe
  // redirect fails, etc.) keeps a valid JWT but has `OnboardingComplete__c`
  // still false on TurtleshellProfile__c. Without this check they land in
  // /app/* with broken chat (no guide, no tier, no shell grant) and no
  // surfaced path back to onboarding. `null` = loading, `true` = full
  // shell, `false` = render the resume card as the only affordance.
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    async function checkOnboarding() {
      try {
        // Same username-fallback logic the dev-mode gate + Profile use —
        // don't re-bail on a missing `turtleshell_username` cache for
        // pre-onboarding-rewrite users.
        let username = localStorage.getItem('turtleshell_username') || '';
        if (!username) {
          const email = localStorage.getItem('olympus_grid_email') || '';
          const local = email.split('@')[0] || '';
          username = local.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        }
        if (!username) {
          // No identity to check against — treat as not-onboarded so the
          // user is pushed back through the flow rather than trapped in
          // an app that can't function.
          if (!cancelled) setOnboardingComplete(false);
          return;
        }
        // Migrated 2026-05-18 to /v1/grid/master/app/profile/turtleshell-web/me.
        // Identity-scoped via JWT; onboardingComplete / avatar / username
        // now live inside profileData (the ApplicationProfile blob).
        const env = (await ogRequest(
          'GET',
          `/app/profile/turtleshell-web/me`,
        )) as { profileData?: { onboardingComplete?: boolean; avatar?: string; username?: string }; accountStatus?: string };
        if (cancelled) return;
        const pd = env?.profileData ?? {};
        setOnboardingComplete(pd.onboardingComplete === true);
        // Cache avatar + resolved username so Sidebar UserFooter can
        // display them without a separate profile fetch.
        if (pd.avatar) localStorage.setItem('turtleshell_avatar', pd.avatar);
        if (pd.username) localStorage.setItem('turtleshell_username', pd.username);
      } catch {
        // Profile fetch failure: fail-safe to true so a transient network
        // blip doesn't kick an already-onboarded user back to the flow.
        // If they genuinely aren't onboarded the next profile-dependent
        // call inside the shell (quota, shell balance, etc.) will surface
        // the error.
        if (!cancelled) setOnboardingComplete(true);
      }
    }
    checkOnboarding();
    return () => { cancelled = true; };
  }, []);

  const { _isPlaying: isPlaying, _isPaused: isPaused, _isBuffering: isBuffering, _currentTime: currentTime, _duration: duration, _speed: speed } = useApolloStore();

  // Loading gate — hold for the one profile round-trip before we decide
  // between shell and resume card. Brief splash avoids flashing the shell
  // to a user who's about to be kicked back to /onboarding.
  if (onboardingComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="text-text-muted text-sm tracking-[0.2em] uppercase">Loading…</div>
      </div>
    );
  }

  if (onboardingComplete === false) {
    const handleLogout = () => {
      serverLogout().finally(() => {
        // Full wipe — same rationale as Sidebar's logout flow. See the
        // clearAllUserSessionState docblock.
        clearAllUserSessionState();
        useServiceStore.getState().disconnectOlympusGrid();
        navigate('/login', { replace: true });
      });
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="text-6xl">🐚</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-text-primary">Finish your onboarding</h1>
            <p className="text-sm text-text-muted leading-relaxed">
              Your account is signed in, but you haven't picked a cause, guide, or tier yet.
              TurtleShell needs those before the chat can work.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/onboarding')}
            className="w-full rounded-xl bg-shell-500 hover:bg-shell-400 text-white font-semibold py-3 px-5 transition-colors"
          >
            Continue Onboarding
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="text-xs text-text-muted hover:text-text-primary underline underline-offset-2"
          >
            Or sign out and start over
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* Mobile overlay backdrop */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Desktop sidebar — LEFT, inline */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          open={desktopSidebarOpen}
          onToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          onClose={() => setDesktopSidebarOpen(false)}
          position="left"
        />
      </div>

      {/* Main content */}
      <div className="main-content">
        <Header
          desktopSidebarOpen={desktopSidebarOpen}
          onDesktopSidebarToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <Outlet />
        <AudioPlayerBar
          isPlaying={isPlaying}
          isPaused={isPaused}
          isBuffering={isBuffering}
          currentTime={currentTime}
          duration={duration}
          speed={speed}
          onPause={audioManager.pause}
          onResume={audioManager.resume}
          onCancel={audioManager.cancel}
          onSeekBackward={audioManager.seekBackward}
          onSeekForward={audioManager.seekForward}
          onSetSpeed={audioManager.setSpeed}
        />
      </div>

      {/* Mobile sidebar — RIGHT, overlay */}
      <div className="md:hidden">
        <Sidebar
          open={mobileSidebarOpen}
          onToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)}
          onClose={() => setMobileSidebarOpen(false)}
          position="right"
        />
      </div>
    </div>
  );
}
