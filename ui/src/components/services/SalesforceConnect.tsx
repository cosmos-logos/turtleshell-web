import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { getSalesforceLoginUrl } from '@/lib/api/salesforce-client';
import { useEnvironmentStore } from '@/lib/store/environment-store';

interface SalesforceConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SF_CLIENT_ID_DEFAULT =
  import.meta.env.VITE_SF_CLIENT_ID ||
  '3MVG9nSH73I5aFNiVgku4fbvk1TBGkXFlEAB7fE7tLMNYPvE5CGkOv5HQGsRCWSwbhpgZYvy5z1xV_GjoeuGd';
const SF_CALLBACK_URL =
  import.meta.env.VITE_SF_CALLBACK_URL ||
  `${window.location.origin}/oauth/callback/salesforce`;

export function SalesforceConnect({ open, onOpenChange }: SalesforceConnectProps) {
  const [instanceUrl, setInstanceUrl] = useState('https://olympus-grid-alpha-1.my.salesforce.com');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devExpanded, setDevExpanded] = useState(false);
  const [clientId, setClientId] = useState(() => localStorage.getItem('sf_client_id_override') || SF_CLIENT_ID_DEFAULT);

  const developerMode = useEnvironmentStore((s) => s.developerMode);

  const resetState = useCallback(() => {
    setTimeout(() => {
      setInstanceUrl('https://test.salesforce.com');
      setLoading(false);
      setError('');
      setDevExpanded(false);
    }, 200);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) resetState();
    },
    [onOpenChange, resetState],
  );

  const handleConnect = async () => {
    setError('');
    setLoading(true);
    try {
      const url = await getSalesforceLoginUrl(instanceUrl.replace(/\/+$/, ''));
      console.log('[SF] Redirecting to Salesforce login...');
      window.location.href = url;
    } catch (e) {
      console.error('[SF] Login URL generation failed:', e);
      setError(e instanceof Error ? e.message : 'Failed to start OAuth flow');
      setLoading(false);
    }
  };

  const isUrlValid = /^https:\/\/.+/.test(instanceUrl.trim());

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-1 border border-border-muted rounded-2xl p-6 z-50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">
              Connect Salesforce
            </Dialog.Title>
            <Dialog.Close className="p-1.5 rounded-md hover:bg-surface-3 text-text-muted transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <p className="text-sm text-text-secondary">
              Enter your Salesforce instance URL to connect via OAuth.
            </p>

            <div>
              <label className="text-xs text-text-muted block mb-1.5">Instance URL</label>
              <input
                type="url"
                value={instanceUrl}
                onChange={(e) => setInstanceUrl(e.target.value)}
                placeholder="https://myorg.my.salesforce.com"
                className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isUrlValid && !loading) handleConnect();
                }}
                autoFocus
              />
              <p className="text-2xs text-text-muted mt-1.5">
                Use your org's My Domain URL or login server (e.g. <code className="text-text-secondary">https://test.salesforce.com</code>).
              </p>
            </div>

            {/* Developer mode info */}
            {developerMode && (
              <div className="border border-border-muted rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDevExpanded(!devExpanded)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted hover:bg-surface-2 transition-colors"
                >
                  {devExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                  Developer Info
                </button>
                {devExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    <div>
                      <label className="text-2xs text-text-muted block mb-1">Consumer Key</label>
                      <input
                        type="text"
                        value={clientId}
                        onChange={(e) => {
                          // Legacy Services page — in-memory only.
                          // Tool flow owns Consumer-Key persistence via
                          // its wizard + sessionStorage context; we no
                          // longer write `sf_client_id_override` to
                          // localStorage anywhere in the app.
                          setClientId(e.target.value);
                        }}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-primary font-mono focus:outline-none focus:border-shell-400 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-2xs text-text-muted block mb-1">Callback URL</label>
                      <input
                        type="text"
                        readOnly
                        value={SF_CALLBACK_URL}
                        className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-2xs text-text-muted font-mono select-all"
                      />
                    </div>
                    <p className="text-2xs text-text-muted leading-relaxed">
                      PKCE flow — no client_secret in browser. Check console for [SF] logs.
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleConnect}
              disabled={!isUrlValid || loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              Connect with Salesforce
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
