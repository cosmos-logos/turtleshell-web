// routes/tools/GoogleToolCallback.tsx
//
// Handles /oauth/tool-callback/google?code=...&state=... — trades the
// auth code for Google tokens, seals the result to the Google tool
// server's public key, and persists ONLY the sealed envelope. Plaintext
// lives in memory for ~20ms total. Analog to SalesforceToolCallback.

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { completeGoogleToolOAuth } from '@/lib/tools/google-tool-oauth';

type State =
  | { kind: 'processing' }
  | { kind: 'success'; toolDisplayName: string }
  | { kind: 'error'; message: string };

export function GoogleToolCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'processing' });
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const stateParam = params.get('state');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam) {
      setState({
        kind: 'error',
        message:
          errorParam === 'access_denied'
            ? 'You cancelled the Google sign-in.'
            : errorDescription || errorParam,
      });
      return;
    }
    if (!code || !stateParam) {
      setState({ kind: 'error', message: 'Google did not return a usable authorization response.' });
      return;
    }

    completeGoogleToolOAuth(code, stateParam)
      .then((result) => {
        setState({ kind: 'success', toolDisplayName: result.toolDisplayName });
        setTimeout(() => navigate('/app/tools'), 1500);
      })
      .catch((e: unknown) => {
        console.error('[Google tool] completion failed:', e);
        setState({
          kind: 'error',
          message: e instanceof Error ? e.message : 'Failed to complete the connection.',
        });
      });
  }, [params, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-surface-0">
      <div className="max-w-md w-full px-6 text-center">
        {state.kind === 'processing' && (
          <>
            <Loader2 size={32} className="mx-auto text-shell-400 animate-spin mb-4" />
            <p className="text-sm text-text-primary font-medium mb-1">Sealing your connection…</p>
            <p className="text-xs text-text-muted leading-relaxed">
              Your Google login is being encrypted right now. In a moment, it'll be
              unreadable to everyone — including us.
            </p>
          </>
        )}

        {state.kind === 'success' && (
          <>
            <CheckCircle size={36} className="mx-auto text-shell-400 mb-4" />
            <p className="text-base text-text-primary font-medium mb-1">
              {state.toolDisplayName} connected.
            </p>
            <p className="text-xs text-text-muted leading-relaxed">
              Your login is sealed. Ask about your calendar, your inbox, or your files.
            </p>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <XCircle size={36} className="mx-auto text-red-400 mb-4" />
            <p className="text-sm text-red-400 mb-4">{state.message}</p>
            <div className="text-xs text-text-muted mb-6 flex items-start gap-2 justify-center">
              <ShieldCheck size={14} className="mt-0.5 text-shell-400 flex-shrink-0" />
              <span>
                Nothing was saved. Your login stays with Google. Try again from the
                Tools page.
              </span>
            </div>
            <button
              onClick={() => navigate('/app/tools')}
              className="text-sm text-shell-400 hover:underline"
            >
              Back to Tools
            </button>
          </>
        )}
      </div>
    </div>
  );
}
