import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { verifyCode } from '@/lib/api/olympus-grid-client';
import { useServiceStore } from '@/lib/store/service-store';
import { restoreGuideAgentFromProfile } from '@/lib/apply-guide-agent';

type CallbackState = 'processing' | 'success' | 'error';

export function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('processing');
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    const requestId = searchParams.get('requestId');

    if (!code || !requestId) {
      navigate('/login', { replace: true });
      return;
    }

    verifyCode(code, requestId)
      .then((result) => {
        useServiceStore.getState().setOlympusGridConnected(result.user);
        setState('success');
        // Server-side truth — Apex reads TurtleshellProfile__c and sets
        // onboardingComplete in the response. localStorage was unreliable
        // across logout / new-device sign-ins.
        const dest = result.onboardingComplete ? '/app/chat' : '/onboarding';
        // Returning user: restore saved guide-agent visibility before
        // navigating. See lib/apply-guide-agent.ts for rationale.
        if (result.onboardingComplete && result.user?.email) {
          void restoreGuideAgentFromProfile(result.user.email);
        }
        const timer = setTimeout(() => navigate(dest, { replace: true }), 2000);
        return () => clearTimeout(timer);
      })
      .catch((e) => {
        setState('error');
        setError(e instanceof Error ? e.message : 'Verification failed');
      });
  }, [searchParams, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-surface-0">
      <div className="text-center space-y-4 p-8">
        {state === 'processing' && (
          <>
            <Loader2 size={32} className="mx-auto text-shell-400 animate-spin" />
            <p className="text-sm text-text-secondary">
              Verifying your identity...
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle size={32} className="mx-auto text-shell-400" />
            <p className="text-sm text-text-secondary">
              Successfully connected! Redirecting...
            </p>
          </>
        )}

        {state === 'error' && (
          <>
            <XCircle size={32} className="mx-auto text-red-400" />
            <p className="text-sm text-red-400">{error}</p>
            <Link
              to="/login"
              className="text-sm text-shell-400 hover:underline"
            >
              Return to Services
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
