import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { exchangeCodeForTokens } from '@/lib/api/salesforce-client';
import { exchangeCodeForTokens as exchangeGoogleCode } from '@/lib/api/google-client';
import { useServiceStore } from '@/lib/store/service-store';
import { logSession } from '@/lib/api/session-log';

type CallbackState = 'processing' | 'success' | 'error';

export function OAuthCallback() {
  const { provider } = useParams<{ provider: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [state, setState] = useState<CallbackState>('processing');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const code = searchParams.get('code');
    const errorParam = searchParams.get('error');

    logSession('oauth.callback', 'start', { provider });

    if (errorParam) {
      logSession('oauth.callback', 'provider_error', { provider, err: errorParam }, 'error');
      setState('error');
      setError(errorParam === 'access_denied' ? 'Authorization cancelled' : errorParam);
      return;
    }

    if (!code) {
      logSession('oauth.callback', 'no_code', { provider }, 'error');
      setState('error');
      setError('No authorization code received');
      return;
    }

    if (provider === 'salesforce') {
      exchangeCodeForTokens(code)
        .then(() => {
          const instanceUrl = localStorage.getItem('sf_instance_url') || '';
          useServiceStore.getState().setSalesforceConnected(instanceUrl);
          logSession('oauth.callback', 'success', { provider });
          setState('success');
          setTimeout(() => navigate('/app/services'), 1500);
        })
        .catch((e) => {
          console.error('[SF] Token exchange error:', e);
          logSession(
            'oauth.callback',
            'fail',
            { provider, err: (e instanceof Error ? e.message : String(e)).slice(0, 200) },
            'error',
          );
          setState('error');
          setError(e instanceof Error ? e.message : 'Token exchange failed');
        });
      return;
    }

    if (provider === 'google') {
      const stateParam = searchParams.get('state') || '';
      exchangeGoogleCode(code, stateParam)
        .then((user) => {
          useServiceStore.getState().setGoogleConnected(user.email);
          logSession('oauth.callback', 'success', { provider });
          setState('success');
          setTimeout(() => navigate('/app/services'), 1500);
        })
        .catch((e) => {
          console.error('[GOOGLE] Token exchange error:', e);
          logSession(
            'oauth.callback',
            'fail',
            { provider, err: (e instanceof Error ? e.message : String(e)).slice(0, 200) },
            'error',
          );
          setState('error');
          setError(e instanceof Error ? e.message : 'Token exchange failed');
        });
      return;
    }

    // Unsupported provider fallback
    console.log(`OAuth callback for ${provider} with code: ${code.substring(0, 8)}...`);
    setState('success');
    const timer = setTimeout(() => navigate('/app/services'), 2000);
    return () => clearTimeout(timer);
  }, [provider, searchParams, navigate]);

  return (
    <div className="h-screen flex items-center justify-center bg-surface-0">
      <div className="text-center space-y-4 p-8">
        {state === 'processing' && (
          <>
            <Loader2 size={32} className="mx-auto text-shell-400 animate-spin" />
            <p className="text-sm text-text-secondary">
              Connecting to {provider}...
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
            <button
              onClick={() => navigate('/app/services')}
              className="text-sm text-shell-400 hover:underline"
            >
              Return to Services
            </button>
          </>
        )}
      </div>
    </div>
  );
}
