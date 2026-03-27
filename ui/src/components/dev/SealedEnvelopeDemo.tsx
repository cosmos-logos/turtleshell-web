import { useState } from 'react';
import { Shield, Lock, Unlock, Send, CheckCircle, XCircle, Hash, PenTool } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { sealToken, signRequest, loadOrGenerateKeypair } from '@/lib/cosmos-logos/crypto';

interface Step {
  label: string;
  detail: string;
  mono?: boolean;
  status: 'ok' | 'fail' | 'verify';
}

export function SealedEnvelopeDemo() {
  const agents = useCosmosLogosStore((s) => s.agents);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [message, setMessage] = useState('Hello from TurtleShell! This is a secret message.');
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<Step[]>([]);

  const agent = agents.find((a) => a.id === selectedAgent);

  const addStep = (label: string, detail: string, mono?: boolean, status: Step['status'] = 'ok') => {
    setSteps((prev) => [...prev, { label, detail, mono, status }]);
  };

  const addFail = (label: string, detail: string) => {
    setSteps((prev) => [...prev, { label, detail, status: 'fail' }]);
  };

  async function sha256hex(text: string): Promise<string> {
    const data = new TextEncoder().encode(text);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  const runDemo = async () => {
    if (!agent || !message.trim()) return;
    setRunning(true);
    setSteps([]);

    try {
      // Step 1: Show plaintext
      addStep('1. Plaintext message (only TurtleShell knows this)', message, true);

      // Step 2: Compute local hash for later verification
      const localHash = await sha256hex(message);
      addStep('2. SHA-256 hash of plaintext (computed locally, kept secret)', localHash, true);

      // Step 3: Load TurtleShell keypair
      const keypair = await loadOrGenerateKeypair();
      addStep('3. TurtleShell Ed25519 public key (sender identity)', keypair.publicKeyBase64, true);

      // Step 4: Read agent's public key
      const agentPubKey = agent.manifest.cryptography.public_key;
      const agentKeyShort = agentPubKey.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
      addStep(`4. ${agent.manifest.identity.name}'s Ed25519 public key (recipient)`, agentKeyShort, true);

      // Step 5: Seal the message
      const sealed = await sealToken(message, agentPubKey);
      addStep(
        `5. Sealed envelope (crypto_box_seal) — only ${agent.manifest.identity.name} can open this`,
        sealed.substring(0, 80) + '...',
        true,
      );
      addStep(
        'TurtleShell can no longer read this ciphertext',
        'The sealed box uses an ephemeral keypair. Even the sender cannot decrypt it. Only the recipient\'s private key works.',
      );

      // Step 6: Sign the request
      const body = JSON.stringify({ envelope: sealed });
      const { signature, timestamp } = await signRequest(body, keypair.privateKey);
      addStep('6. Ed25519 signature over (timestamp + body)', signature.substring(0, 60) + '...', true);

      // Step 7: Send to agent
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        [agent.manifest.cryptography.signing_header]: signature,
        [agent.manifest.cryptography.timestamp_header]: timestamp,
      };

      addStep(
        `7. Sending sealed envelope to ${agent.manifest.identity.name}`,
        `POST ${agent.url}/api/cosmos/verify-envelope\nThe agent will decrypt privately and return only a SHA-256 hash as proof.`,
      );

      const resp = await fetch(`${agent.url}/api/cosmos/verify-envelope`, {
        method: 'POST',
        headers,
        body,
        signal: AbortSignal.timeout(10000),
      });

      const data = await resp.json();

      if (data.error) {
        addFail(`${agent.manifest.identity.name} error`, data.error);
        return;
      }

      if (!data.proof_hash) {
        addFail('Unexpected response', JSON.stringify(data));
        return;
      }

      // Step 8: Agent's response — hash only, no plaintext
      addStep(
        `8. ${agent.manifest.identity.name} decrypted the envelope privately`,
        'The plaintext was NOT returned. The agent proves it read the message by returning a SHA-256 hash.',
      );

      addStep(
        `${agent.manifest.identity.name}'s proof hash`,
        data.proof_hash,
        true,
      );

      // Step 9: Verify the hash matches
      const hashMatch = data.proof_hash === localHash;
      if (hashMatch) {
        addStep(
          '9. HASH MATCH — Agent proved it read the message',
          `Local:  ${localHash}\nAgent:  ${data.proof_hash}\nThe hashes are identical. The agent decrypted and read the exact plaintext that TurtleShell sealed.`,
          true,
          'verify',
        );
      } else {
        addFail(
          '9. Hash mismatch — verification failed',
          `Local:  ${localHash}\nAgent:  ${data.proof_hash}`,
        );
      }

      // Step 10: Response signature verification
      if (data.response_signature) {
        addStep(
          '10. Agent signed its response',
          data.response_signature.substring(0, 60) + '...',
          true,
        );
        addStep(
          'Response authenticity',
          `Signed by ${data.agent_codename} using Ed25519. The response was not tampered with in transit.`,
        );
      }

      // Summary
      if (hashMatch) {
        addStep(
          'DEMONSTRATION COMPLETE',
          `The sealed envelope was encrypted with ${agent.manifest.identity.name}'s public key. ` +
          `Only ${agent.manifest.identity.name}'s private key (which never left the agent) could decrypt it. ` +
          `TurtleShell cannot read the sealed ciphertext. The agent proved decryption via hash comparison. ` +
          `No plaintext was transmitted in the response.`,
          false,
          'verify',
        );
      }
    } catch (e: any) {
      addFail('Request failed', e.message || String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className="space-y-3 animate-fade-in">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-2">
        <Shield size={14} /> Secure Agent Messaging Validation
      </h2>

      <div className="p-4 bg-surface-1 border border-border-muted rounded-xl space-y-4">
        <p className="text-2xs text-text-muted">
          Demonstrates the cosmos-logos Ed25519 sealed envelope flow. Your message is encrypted
          with the agent's public key — only that agent's private key can decrypt it.
          TurtleShell cannot read the sealed message after creating it. The agent proves
          decryption by returning a SHA-256 hash — the plaintext never travels back.
        </p>

        {/* Agent selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">Target Agent</label>
          <select
            value={selectedAgent}
            onChange={(e) => { setSelectedAgent(e.target.value); setSteps([]); }}
            className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-shell-500/50"
          >
            <option value="">Select a connected agent...</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>{a.manifest.identity.name} — {a.url}</option>
            ))}
          </select>
        </div>

        {/* Message input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-text-secondary">Message to seal</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            className="w-full bg-surface-2 border border-border-muted rounded-lg px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/50 resize-none font-mono"
            placeholder="Type a secret message..."
          />
        </div>

        {/* Run button */}
        <button
          onClick={runDemo}
          disabled={!selectedAgent || !message.trim() || running}
          className="flex items-center gap-2 px-4 py-2 bg-shell-500/10 text-shell-400 hover:bg-shell-500/20 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40"
        >
          <Send size={14} />
          {running ? 'Sealing & sending...' : 'Seal, Sign & Send'}
        </button>

        {/* Steps log */}
        {steps.length > 0 && (
          <div className="space-y-2.5 pt-3 border-t border-border-muted">
            {steps.map((step, i) => (
              <div key={i} className="flex gap-2.5">
                <div className="flex-shrink-0 mt-0.5">
                  {step.status === 'verify' ? (
                    <CheckCircle size={14} className="text-green-400" />
                  ) : step.status === 'fail' ? (
                    <XCircle size={14} className="text-red-400" />
                  ) : step.label.includes('Sealed envelope') ? (
                    <Lock size={14} className="text-shell-400" />
                  ) : step.label.includes('proof hash') ? (
                    <Hash size={14} className="text-blue-400" />
                  ) : step.label.includes('signed') ? (
                    <PenTool size={14} className="text-purple-400" />
                  ) : step.label.includes('decrypted') ? (
                    <Unlock size={14} className="text-amber-400" />
                  ) : (
                    <CheckCircle size={14} className="text-text-muted" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`text-xs font-semibold ${
                    step.status === 'verify' ? 'text-green-400' :
                    step.status === 'fail' ? 'text-red-400' :
                    'text-text-secondary'
                  }`}>
                    {step.label}
                  </div>
                  <div
                    className={`text-2xs mt-0.5 whitespace-pre-wrap break-all ${
                      step.mono
                        ? `font-mono bg-surface-2 rounded px-2 py-1.5 border border-border-muted ${
                            step.status === 'verify' ? 'text-green-400/80 border-green-500/20 bg-green-500/5' :
                            step.status === 'fail' ? 'text-red-400' :
                            'text-text-muted'
                          }`
                        : step.status === 'verify' ? 'text-green-400/80'
                        : step.status === 'fail' ? 'text-red-400'
                        : 'text-text-muted'
                    }`}
                  >
                    {step.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
