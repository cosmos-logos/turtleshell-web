import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';

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

    if (errorParam) {
      setState('error');
      setError(errorParam === 'access_denied' ? 'Authorization cancelled' : errorParam);
      return;
    }

    if (!code) {
      setState('error');
      setError('No authorization code received');
      return;
    }

    // TODO: Exchange code for tokens via PKCE
    // This will be implemented per provider in Phase 4
    console.log(`OAuth callback for ${provider} with code: ${code.substring(0, 8)}...`);
    setState('success');

    // Redirect to services after brief delay
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
