import { useState, useCallback } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle, Loader2, X } from 'lucide-react';
import { requestMagicLink, verifyCode } from '@/lib/api/olympus-grid-client';
import { useServiceStore } from '@/lib/store/service-store';

type Step = 'email' | 'code' | 'success';

interface OlympusGridConnectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OlympusGridConnect({ open, onOpenChange }: OlympusGridConnectProps) {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [requestId, setRequestId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetState = useCallback(() => {
    setTimeout(() => {
      setStep('email');
      setEmail('');
      setCode('');
      setRequestId('');
      setLoading(false);
      setError('');
    }, 200);
  }, []);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      onOpenChange(nextOpen);
      if (!nextOpen) resetState();
    },
    [onOpenChange, resetState],
  );

  const handleSendCode = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await requestMagicLink(email);
      setRequestId(result.requestId);
      setStep('code');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    setLoading(true);
    try {
      const user = await verifyCode(code, requestId);
      useServiceStore.getState().setOlympusGridConnected(user);
      setStep('success');
      setTimeout(() => handleOpenChange(false), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setLoading(true);
    try {
      const result = await requestMagicLink(email);
      setRequestId(result.requestId);
    } catch (e) {
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
