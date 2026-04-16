import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle, Loader2, X, ChevronDown, ChevronRight } from 'lucide-react';
import { requestMagicLink, verifyCode, getServiceUrl } from '@/lib/api/olympus-grid-client';
import { useServiceStore } from '@/lib/store/service-store';
import { useEnvironmentStore } from '@/lib/store/environment-store';

type Step = 'email' | 'code' | 'success';

interface OlympusGridConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OlympusGridConnect({ open, onOpenChange }: OlympusGridConnectProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [devExpanded, setDevExpanded] = useState(false);
  const [serviceNameInput, setServiceNameInput] = useState('');

  const developerMode = useEnvironmentStore((s) => s.developerMode);

  // Sync override inputs from localStorage when modal opens
  useEffect(() => {
    if (open) {
      setServiceNameInput(localStorage.getItem('olympus_grid_service_name_override') || '');
    }
  }, [open]);

  const resetState = useCallback(() => {
    setTimeout(() => {
      setStep('email');
      setEmail('');
      setCode('');
      setRequestId('');
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

  const persistDevOverrides = () => {
    if (serviceNameInput.trim()) {
      localStorage.setItem('olympus_grid_service_name_override', serviceNameInput.trim());
    } else {
      localStorage.removeItem('olympus_grid_service_name_override');
    }
    console.log('[OG] Developer overrides saved — route:', getServiceUrl(), 'serviceName:', serviceNameInput.trim() || '(default)');
  };

  const handleSendCode = async () => {
    setError('');
    setLoading(true);
    if (developerMode) persistDevOverrides();
    console.log('[OG] requestMagicLink → email:', email, 'serviceUrl:', getServiceUrl());
    try {
      const result = await requestMagicLink(email);
      console.log('[OG] requestMagicLink ← requestId:', result.requestId, 'expiresIn:', result.expiresIn);
      setRequestId(result.requestId);
      setStep('code');
    } catch (e) {
      console.error('[OG] requestMagicLink ERROR:', e);
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    console.log('[OG] verifyCode → code:', code, 'requestId:', requestId);
    try {
      const result = await verifyCode(code, requestId);
      console.log('[OG] verifyCode ← user:', result.user, 'tokenType:', result.tokenType, 'expiresIn:', result.expiresIn);
      useServiceStore.getState().setOlympusGridConnected(result.user);
      setStep('success');
      // Server is the source of truth for onboardingComplete — Apex
      // reads TurtleshellProfile__c and returns it. localStorage gets
      // wiped on logout / doesn't exist on fresh devices.
      setTimeout(() => {
        handleOpenChange(false);
        if (!result.onboardingComplete) navigate('/onboarding');
      }, 1500);
    } catch (e) {
      console.error('[OG] verifyCode ERROR:', e);
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    console.log('[OG] resend → email:', email);
    try {
      const result = await requestMagicLink(email);
      console.log('[OG] resend ← requestId:', result.requestId);
      setRequestId(result.requestId);
    } catch (e) {
      console.error('[OG] resend ERROR:', e);
      setError(e instanceof Error ? e.message : 'Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-surface-1 border border-border-muted rounded-2xl p-6 z-50 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">
              Connect Olympus-Grid
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

          {step === 'email' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Enter your email to receive a sign-in code.
              </p>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && isEmailValid && !loading) handleSendCode();
                }}
                autoFocus
              />

              {/* Developer mode overrides */}
              {developerMode && (
                <div className="border border-border-muted rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDevExpanded(!devExpanded)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted hover:bg-surface-2 transition-colors"
                  >
                    {devExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    Developer Overrides
                  </button>
                  {devExpanded && (
                    <div className="px-3 pb-3 space-y-2">
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Service Name</label>
                        <input
                          type="text"
                          value={serviceNameInput}
                          onChange={(e) => setServiceNameInput(e.target.value)}
                          placeholder="Olympus-Grid"
                          className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-2xs text-text-muted block mb-1">Master Route</label>
                        <div className="w-full px-2.5 py-1.5 bg-surface-2 border border-border-muted rounded text-xs text-text-muted font-mono truncate">
                          {getServiceUrl()}
                        </div>
                      </div>
                      <p className="text-2xs text-text-muted leading-relaxed">
                        All requests route through Ares → Hermes → Olympus-Grid.
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleSendCode}
                disabled={!isEmailValid || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Send Code
              </button>
            </div>
          )}

          {step === 'code' && (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                Check your email at <strong className="text-text-primary">{email}</strong>
              </p>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData.getData('text').toUpperCase().replace(/\s/g, '');
                  setCode(pasted);
                }}
                placeholder="ENTER CODE"
                maxLength={8}
                className="w-full px-3 py-2.5 bg-surface-2 border border-border-muted rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-400 transition-colors font-mono tracking-widest text-center"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && code.length > 0 && !loading) handleVerify();
                }}
                autoFocus
              />
              <button
                onClick={handleVerify}
                disabled={code.length === 0 || loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-shell-500 text-white text-sm font-medium rounded-lg hover:bg-shell-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                Verify
              </button>
              <div className="flex items-center justify-between text-xs">
                <button
                  onClick={handleResend}
                  disabled={loading}
                  className="text-shell-400 hover:underline disabled:opacity-50"
                >
                  Resend Code
                </button>
                <button
                  onClick={() => {
                    setStep('email');
                    setCode('');
                    setError('');
                  }}
                  className="text-text-muted hover:text-text-secondary"
                >
                  Use different email
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-3">
              <CheckCircle size={40} className="mx-auto text-shell-400" />
              <p className="text-sm font-medium text-text-primary">Connected!</p>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
