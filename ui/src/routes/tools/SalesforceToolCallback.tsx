// routes/tools/SalesforceToolCallback.tsx
//
// Handles /oauth/tool-callback/salesforce?code=... returned by SF after
// the user approves the connected app. Completes the token exchange,
// seals the result against the tool server's public key, and persists
// ONLY the sealed envelope. Plaintext lives in memory for ~20ms total.
//
// Distinct from the legacy /oauth/callback/:provider route because
// that one stores plaintext in localStorage and lives under the
// Services flow — we absolutely do NOT want to touch that path.

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, ShieldCheck } from 'lucide-react';
import { completeSalesforceToolOAuth } from '@/lib/tools/salesforce-tool-oauth';

type State =
  | { kind: 'processing' }
  | { kind: 'success'; toolDisplayName: string }
  | { kind: 'error'; message: string };

export function SalesforceToolCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<State>({ kind: 'processing' });
  // React 18 StrictMode double-fires effects in development; guarding
  // with a ref so we don't run the token exchange twice (SF will
  // reject the second attempt with "invalid_grant", which looks like
  // a failure to the user even though the first attempt succeeded).
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get('code');
    const errorParam = params.get('error');
    const errorDescription = params.get('error_description');

    if (errorParam) {
      setState({
        kind: 'error',
        message:
          errorParam === 'access_denied'
            ? 'You cancelled the Salesforce sign-in.'
            : errorDescription || errorParam,
      });
      return;
    }
    if (!code) {
      setState({ kind: 'error', message: 'Salesforce did not return an authorization code.' });
      return;
    }

    completeSalesforceToolOAuth(code)
      .then((result) => {
        setState({ kind: 'success', toolDisplayName: result.toolDisplayName });
        // Short dwell on the success screen so the user sees the
        // confirmation, then back to Tools where the new binding is
        // visible in the list.
        setTimeout(() => navigate('/app/tools'), 1500);
      })
      .catch((e: unknown) => {
        console.error('[SF tool] completion failed:', e);
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
              Your Salesforce login is being encrypted right now. In a moment, it'll be
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
              Your login is sealed. Try asking about your accounts or opportunities.
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
                Nothing was saved. Your login stays with Salesforce. Try again from the
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
