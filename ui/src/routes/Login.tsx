import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Mail, ArrowLeft } from 'lucide-react';
import { requestMagicLink, verifyCode, signInWithApple, ogRequest } from '@/lib/api/olympus-grid-client';
import { useServiceStore } from '@/lib/store/service-store';
import { signInWithApple as appleSDKSignIn, isAppleSignInSupported } from '@/lib/auth/apple-signin';
import { restoreGuideAgentFromProfile } from '@/lib/apply-guide-agent';
import { logSession } from '@/lib/api/session-log';

/** Strip the email local-part for logging — domain only, never the user. */
function emailDomain(email: string): string {
  const at = email.lastIndexOf('@');
  return at >= 0 ? email.slice(at + 1) : '';
}

type Step = 'methods' | 'email' | 'waitlist' | 'signin-email' | 'code' | 'success';

/**
 * Post-verify routing gate.
 *
 * Authentication is separate from app-state — the JWT mint endpoint
 * tells us WHO you are, the profile service tells us WHAT YOU'VE DONE.
 * After verifyCode/signInWithApple sets the JWT in localStorage, we
 * fetch the user's ApplicationProfile and route based on the
 * server-truth `profileData.onboardingComplete` flag.
 *
 * Falls through to /onboarding on any fetch error (fresh signup with no
 * profile row, transient network blip, etc.) — that's the safe default;
 * a needlessly-second-time-onboarded user is recoverable, a lost
 * onboarding step is not.
 */
async function resolveOnboardingDest(): Promise<'/app/chat' | '/onboarding'> {
  try {
    const profile = (await ogRequest(
      'GET',
      '/app/profile/turtleshell-web/me',
    )) as { profileData?: { onboardingComplete?: boolean } } | null;
    return profile?.profileData?.onboardingComplete === true ? '/app/chat' : '/onboarding';
  } catch {
    return '/onboarding';
  }
}

export function Login() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('methods');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleJoinWaitlist = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const result = await requestMagicLink(email);
      if (!result.requestId) {
        setStep('waitlist');
      } else {
        setRequestId(result.requestId);
        setStep('code');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const result = await requestMagicLink(email);
      if (!result.requestId) {
        setStep('waitlist');
      } else {
        setRequestId(result.requestId);
        setStep('code');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const handleVerify = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      logSession('auth', 'email.verify.start', {});
      const result = await verifyCode(code, requestId);
      useServiceStore.getState().setOlympusGridConnected(result.user);
      logSession('auth', 'email.verify.success', {
        emailDomain: emailDomain(result.user?.email ?? ''),
      });
      setStep('success');
      // Profile service is the source of truth for onboardingComplete
      // (see `resolveOnboardingDest` above). The JWT verify response
      // doesn't carry app-state, by design.
      const dest = await resolveOnboardingDest();
      // Returning user: restore their saved guide-agent visibility before
      // navigating. Without this, a new device / cleared browser loses the
      // zustand-persisted hiddenAgentIds and shows every builtin agent —
      // including the two the user explicitly didn't choose.
      if (dest === '/app/chat' && result.user?.email) {
        void restoreGuideAgentFromProfile(result.user.email);
      }
      logSession('auth', 'email.verify.routing', { dest });
      setTimeout(() => navigate(dest, { replace: true }), 800);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Verification failed';
      logSession('auth', 'email.verify.fail', { err: msg.slice(0, 200) }, 'error');
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [code, requestId, navigate]);

  /// Apple Sign-In click handler. Round-trip:
  ///   1. Apple JS SDK popup → identity token (JWT)
  ///   2. POST identity token to Ares /v1/auth/apple/identity/verify
  ///   3. Ares verifies signature against Apple's JWKS, forwards extracted
  ///      claims to Apex which finds-or-creates Identity__c + mints a
  ///      TurtleShell JWT (same shape as magic-link flow)
  ///   4. Route based on accountStatus + onboardingComplete:
  ///      - Waitlist        → step 'waitlist' (gate screen)
  ///      - Active + !onb.  → /onboarding (cause / guide / shells / tier)
  ///      - Active + onb.   → /app/chat
  const handleAppleSignIn = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      logSession('auth', 'apple.start', {});
      const apple = await appleSDKSignIn();
      const result = await signInWithApple({
        identityToken: apple.identityToken,
        user: apple.user,
      });
      useServiceStore.getState().setOlympusGridConnected(result.user);
      logSession('auth', 'apple.success', {
        emailDomain: emailDomain(result.user?.email ?? ''),
        accountStatus: result.accountStatus ?? null,
      });

      if (result.accountStatus === 'Waitlist') {
        setStep('waitlist');
        return;
      }
      setStep('success');
      const dest = await resolveOnboardingDest();
      // Returning user: restore saved guide-agent visibility (see handleVerify).
      if (dest === '/app/chat' && result.user?.email) {
        void restoreGuideAgentFromProfile(result.user.email);
      }
      logSession('auth', 'apple.routing', { dest });
      setTimeout(() => navigate(dest, { replace: true }), 600);
    } catch (e) {
      // Common Apple errors: popup_closed_by_user, popup_blocked_by_browser
      const msg = e instanceof Error ? e.message : 'Apple sign-in failed';
      if (msg.includes('popup_closed') || msg.includes('user_cancelled')) {
        // User dismissed the Apple sheet — silent, no error banner
        logSession('auth', 'apple.cancelled', {});
      } else {
        logSession('auth', 'apple.fail', { err: msg.slice(0, 200) }, 'error');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const handleResend = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const result = await requestMagicLink(email);
      if (result.requestId) setRequestId(result.requestId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to resend');
    } finally {
      setLoading(false);
    }
  }, [email]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface-0">

      {/* Logo + Wordmark */}
      <div className="text-center mb-10">
        <img src="/assets/turtleshell-logo.png" alt="TurtleShell" className="w-16 h-16 mb-4 mx-auto" />
        <h1 className="text-3xl font-bold tracking-tight text-text-primary">
          TurtleShell<span className="text-shell-400">.ai</span><sup className="text-[0.5em] text-shell-400 align-super ml-0.5">™</sup>
        </h1>
        <p className="text-xs tracking-widest uppercase mt-2 text-shell-400">
          Sovereign AI
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">

        {error && (
          <div className="mb-4 p-3 rounded-xl text-sm text-center bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        {/* STEP: Choose method */}
        {step === 'methods' && (
          <div className="space-y-3">
            <button
              onClick={() => setStep('email')}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-px bg-shell-500 text-white"
            >
              <Mail size={18} />
              Join the Waitlist
            </button>

            <div className="flex items-center gap-3 py-2">
              <div className="flex-1 h-px bg-border-muted" />
              <span className="text-xs text-text-muted">or sign in with</span>
              <div className="flex-1 h-px bg-border-muted" />
            </div>

            <button disabled className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium cursor-not-allowed opacity-35 bg-surface-1 border border-border-muted text-text-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
              <span className="ml-auto text-xs text-text-muted">Soon</span>
            </button>

            <button disabled className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium cursor-not-allowed opacity-35 bg-surface-1 border border-border-muted text-text-secondary">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              GitHub
              <span className="ml-auto text-xs text-text-muted">Soon</span>
            </button>

            {/* Sign in with Apple — gated by host whitelist (Apple rejects
                popups whose Origin isn't on a registered Services-ID
                domain, so localhost / preview URLs hide the button to
                avoid confusing runtime errors). */}
            {isAppleSignInSupported() ? (
              <button
                onClick={handleAppleSignIn}
                disabled={loading}
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-all hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed bg-black border border-black text-white"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                {loading ? 'Signing in…' : 'Sign in with Apple'}
              </button>
            ) : (
              <button
                disabled
                title="Apple sign-in is only available on turtleshell.ai"
                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium cursor-not-allowed opacity-35 bg-surface-1 border border-border-muted text-text-secondary"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
                Apple
                <span className="ml-auto text-xs text-text-muted">turtleshell.ai only</span>
              </button>
            )}

            <div className="text-center pt-2">
              <button onClick={() => setStep('signin-email')}
                      className="text-xs text-text-muted group">
                Already have an account?{' '}
                <span className="text-shell-400 group-hover:underline">Sign in</span>
              </button>
            </div>
          </div>
        )}

        {/* STEP: Email entry for waitlist */}
        {step === 'email' && (
          <div className="space-y-4">
            <button onClick={() => { setStep('methods'); setError(''); }}
                    className="flex items-center gap-1.5 text-xs mb-2 text-text-muted">
              <ArrowLeft size={14} /> Back
            </button>

            <p className="text-sm text-text-muted">
              Enter your email to join the waitlist. We'll let you know when your spot opens up.
            </p>

            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm bg-surface-1 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
              onKeyDown={(e) => { if (e.key === 'Enter' && isEmailValid && !loading) handleJoinWaitlist(); }}
            />

            <button onClick={handleJoinWaitlist} disabled={!isEmailValid || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed bg-shell-500 text-white">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Join the Waitlist
            </button>
          </div>
        )}

        {/* STEP: Waitlist confirmation */}
        {step === 'waitlist' && (
          <div className="text-center py-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-shell-500/10 border-2 border-shell-500 flex items-center justify-center mx-auto">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-shell-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-lg font-semibold text-shell-400">You're on the List</h2>
            <p className="text-sm leading-relaxed text-text-muted">
              We sent a confirmation to <strong className="text-text-primary">{email}</strong>.
              We'll email you when your spot opens up.
            </p>
            <p className="text-xs text-text-muted/50">
              Every shell given changes the world.
            </p>

            {/* Escape hatch — waitlist is a terminal state for this session,
                but the user shouldn't be stranded. Back to the methods step
                so they can try another email, switch to Sign in with Apple,
                or just read the terms / close the flow. */}
            <div className="pt-4">
              <button
                onClick={() => { setStep('methods'); setEmail(''); setCode(''); setError(''); }}
                className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary"
              >
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </div>
          </div>
        )}

        {/* STEP: Sign in email entry */}
        {step === 'signin-email' && (
          <div className="space-y-4">
            <button onClick={() => { setStep('methods'); setError(''); }}
                    className="flex items-center gap-1.5 text-xs mb-2 text-text-muted">
              <ArrowLeft size={14} /> Back
            </button>

            <p className="text-sm text-text-muted">
              Enter your email to sign in. We'll send you a verification code.
            </p>

            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" autoFocus
              className="w-full px-4 py-3 rounded-xl text-sm bg-surface-1 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
              onKeyDown={(e) => { if (e.key === 'Enter' && isEmailValid && !loading) handleSignIn(); }}
            />

            <button onClick={handleSignIn} disabled={!isEmailValid || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed bg-shell-500 text-white">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Sign In
            </button>
          </div>
        )}

        {/* STEP: Code entry */}
        {step === 'code' && (
          <div className="space-y-4">
            <button onClick={() => { setStep('signin-email'); setCode(''); setError(''); }}
                    className="flex items-center gap-1.5 text-xs mb-2 text-text-muted">
              <ArrowLeft size={14} /> Back
            </button>

            <p className="text-sm text-text-muted">
              Check your email at <strong className="text-text-primary">{email}</strong>
            </p>
            <p className="text-xs text-text-muted/60">
              Enter the 8-character code or click the link in the email.
            </p>

            <input type="text" value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              onPaste={(e) => { e.preventDefault(); setCode(e.clipboardData.getData('text').toUpperCase().replace(/\s/g, '')); }}
              placeholder="ENTER CODE" maxLength={8} autoFocus
              className="w-full px-4 py-3 rounded-xl text-lg font-mono tracking-[0.3em] text-center bg-surface-1 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50"
              onKeyDown={(e) => { if (e.key === 'Enter' && code.length > 0 && !loading) handleVerify(); }}
            />

            <button onClick={handleVerify} disabled={code.length === 0 || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-sm font-medium disabled:opacity-35 disabled:cursor-not-allowed bg-shell-500 text-white">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Verify
            </button>

            <div className="flex items-center justify-between text-xs">
              <button onClick={handleResend} disabled={loading}
                      className="text-shell-400 hover:underline disabled:opacity-50">
                Resend Code
              </button>
              <button onClick={() => { setStep('signin-email'); setCode(''); setError(''); }}
                      className="text-text-muted">
                Different email
              </button>
            </div>
          </div>
        )}

        {/* STEP: Success */}
        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <img src="/assets/turtleshell-logo.png" alt="TurtleShell" className="w-14 h-14 mx-auto" />
            <p className="text-lg font-semibold text-shell-400">Welcome to the Ocean</p>
            <p className="text-xs text-text-muted">Entering...</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 text-center">
        <p className="text-xs text-text-muted/50">
          By continuing, you agree to our{' '}
          <a href="/terms" className="underline text-text-muted">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="underline text-text-muted">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
