import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Trash2, Check, X, ArrowLeft, Sparkles, Loader2 } from 'lucide-react';
import { ogRequest } from '@/lib/api/olympus-grid-client';
import { streamChat } from '@/lib/athena/chat-client';
import { useEnvironmentStore } from '@/lib/store/environment-store';

const CAUSE_MAP: Record<string, { emoji: string }> = {
  'Save the Oceans': { emoji: '🌊' },
  'Clean Water for All': { emoji: '💧' },
  'AI for Those in Need': { emoji: '🤝' },
};

const GUIDE_MAP: Record<string, { emoji: string; name: string; role: string }> = {
  athena: { emoji: '🐙', name: 'Athena', role: 'LLM Router · Old Night' },
  cosmos: { emoji: '🐟', name: 'Cosmos', role: 'The Ancient One · Navigator' },
  logos: { emoji: '🐢', name: 'Logos', role: 'The Word · Sovereign Vessel' },
  custom: { emoji: '✨', name: 'Make Your Own', role: 'Your Agent · Your Identity' },
};

interface ProfileLink {
  title: string;
  url: string;
  icon?: string;
}

interface PublicProfileData {
  username: string;
  displayName: string;
  avatarUrl?: string;
  cause?: string;
  profilePublic: boolean;
  bio?: string;
  guideAgent?: string;
  shellsGiven?: number;
  tierId?: string;
  onboardingComplete?: boolean;
  links?: ProfileLink[];
  // FE-owned blob (TurtleshellProfile__c.ProfileData__c). The avatar
  // emoji is surfaced publicly so non-owner viewers see the same
  // avatar the user picked in their internal profile. Other keys
  // (theme, prefs, etc.) are owner-only by convention — the FE is
  // responsible for gating them here.
  profileData?: Record<string, any>;
}

function EditableText({ value, onSave, placeholder, className, multiline }: {
  value: string; onSave: (v: string) => void; placeholder: string; className?: string; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <span onClick={() => { setDraft(value); setEditing(true); }}
        className={`cursor-text hover:bg-shell-500/5 rounded px-1 -mx-1 transition-colors ${className}`}
        title="Click to edit">
        {value || <span className="text-text-muted italic">{placeholder}</span>}
      </span>
    );
  }

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (multiline) {
    return (
      <div className="flex flex-col gap-1">
        <textarea value={draft} onChange={e => setDraft(e.target.value)} autoFocus rows={3}
          className="w-full px-2 py-1.5 rounded-lg text-sm bg-surface-1 border border-shell-500/40 text-text-primary focus:outline-none resize-none"
          onKeyDown={e => { if (e.key === 'Escape') cancel(); }} />
        <div className="flex gap-1 justify-end">
          <button onClick={cancel} className="p-1 rounded hover:bg-surface-2 text-text-muted"><X size={14} /></button>
          <button onClick={save} className="p-1 rounded hover:bg-shell-500/10 text-shell-400"><Check size={14} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input value={draft} onChange={e => setDraft(e.target.value)} autoFocus
        className={`flex-1 px-2 py-0.5 rounded-lg bg-surface-1 border border-shell-500/40 text-text-primary focus:outline-none ${className}`}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }} />
      <button onClick={cancel} className="p-1 rounded hover:bg-surface-2 text-text-muted"><X size={14} /></button>
      <button onClick={save} className="p-1 rounded hover:bg-shell-500/10 text-shell-400"><Check size={14} /></button>
    </div>
  );
}

function LinkEditor({ links, onSave }: { links: ProfileLink[]; onSave: (links: ProfileLink[]) => void }) {
  const [items, setItems] = useState(links);
  const [adding, setAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newIcon, setNewIcon] = useState('🔗');

  const addLink = () => {
    if (!newTitle.trim() || !newUrl.trim()) return;
    const updated = [...items, { title: newTitle.trim(), url: newUrl.trim(), icon: newIcon || '🔗' }];
    setItems(updated);
    onSave(updated);
    setNewTitle(''); setNewUrl(''); setNewIcon('🔗'); setAdding(false);
  };

  const removeLink = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    onSave(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((link, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl p-3 bg-surface-1 border border-border-muted group">
          <span className="text-xl shrink-0">{link.icon || '🔗'}</span>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary truncate">{link.title}</div>
            <div className="text-xs text-text-muted truncate">{link.url}</div>
          </div>
          <button onClick={() => removeLink(i)}
            className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all">
            <Trash2 size={14} />
          </button>
        </div>
      ))}

      {adding ? (
        <div className="rounded-xl p-4 bg-surface-1 border border-shell-500/30 space-y-3">
          <div className="flex gap-2">
            <input value={newIcon} onChange={e => setNewIcon(e.target.value)} maxLength={2}
              className="w-10 text-center px-1 py-1.5 rounded-lg bg-surface-2 border border-border-muted text-lg focus:outline-none focus:border-shell-500/40" />
            <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Title"
              className="flex-1 px-3 py-1.5 rounded-lg text-sm bg-surface-2 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/40" />
          </div>
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://..."
            className="w-full px-3 py-1.5 rounded-lg text-sm bg-surface-2 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/40"
            onKeyDown={e => { if (e.key === 'Enter') addLink(); if (e.key === 'Escape') setAdding(false); }} />
          <div className="flex gap-2 justify-end">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 rounded-lg text-xs text-text-muted hover:bg-surface-2">Cancel</button>
            <button onClick={addLink} disabled={!newTitle.trim() || !newUrl.trim()}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-shell-500 text-white disabled:opacity-40">Add Link</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-border-muted text-sm text-text-muted hover:border-shell-500/40 hover:text-shell-400 transition-colors">
          <Plus size={16} /> Add Link
        </button>
      )}
    </div>
  );
}

/**
 * AskAthena — one-shot chat widget embedded in a user's public profile
 * when `ProfileData__c.guidePublic === true`. Streams tokens via the
 * shared Athena client, so it inherits auth behaviour from the rest of
 * the app: the visitor's `og_access_token` (if present) goes out as
 * `x-user-identity`, and shell accounting happens on the gateway side.
 *
 * Today shells are spent against the *visitor's* identity, not the
 * profile owner's — that shift is intentional future work (see the
 * Make-Athena-Public toggle copy on /app/profile). The MVP here is "see
 * Athena answering questions from a public page".
 *
 * Stateless by design: no conversationId, `memoryEnabled: false`,
 * `saveConversation: false`. We do not want visitor Q&A polluting the
 * owner's memory or leaving durable traces; each question is isolated.
 * The systemPrompt injects profile owner context so Athena can ground
 * answers in who the visitor is talking to (displayName + cause + bio).
 */
function AskAthena({ displayName, username, cause, bio, guide, ownerEndpoint }: {
  displayName: string;
  username: string;
  cause?: string;
  bio?: string;
  guide: { emoji: string; name: string; role: string };
  // Athena URL captured at the moment the owner flipped guidePublic on.
  // Null when the profile was created before the guideEndpoint feature
  // (pre-2026-04-16 data); visitor's env is used as a graceful fallback.
  ownerEndpoint: string | null;
}) {
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Cancel any in-flight stream on unmount so abandoned requests don't
  // keep the shell counter ticking past navigation.
  useEffect(() => {
    return () => controllerRef.current?.abort();
  }, []);

  async function handleAsk() {
    const q = question.trim();
    if (!q || streaming) return;
    // Single-exchange model: each new question wipes the previous answer
    // so the card never accumulates a feed. The question itself is
    // moved to `lastQuestion` above the response so the user still sees
    // what they asked, then the input clears — ready for the next ask.
    setAnswer('');
    setError(null);
    setLastQuestion(q);
    setQuestion('');
    setStreaming(true);
    controllerRef.current?.abort();
    controllerRef.current = new AbortController();

    const ownerLabel = displayName || `@${username}`;
    const systemPrompt = [
      `You are Athena, the LLM Router of Old Night, greeting visitors on ${ownerLabel}'s public TurtleShell profile.`,
      cause ? `${ownerLabel} is a supporter of "${cause}".` : '',
      bio ? `Their bio: ${bio}` : '',
      `Answer any question the visitor asks. Be helpful, warm, and concise. Reference ${ownerLabel}'s cause or context only when it's genuinely relevant — don't force it.`,
    ].filter(Boolean).join('\n');

    // Endpoint precedence:
    //   1. Owner's captured `guideEndpoint` (set at toggle-on time on
    //      /app/profile). This is the contract: visitors route to the
    //      *owner's* Athena, not their own. AWS owner → AWS Athena,
    //      off-grid owner → Tailscale/local Athena.
    //   2. Visitor's env-store Athena URL — only used for pre-endpoint
    //      profiles (backwards compat).
    const endpoint = ownerEndpoint || useEnvironmentStore.getState().getAthenaUrl();

    try {
      const stream = streamChat(q, controllerRef.current.signal, null, {
        memoryEnabled: false,
        saveConversation: false,
        systemPrompt,
        agentId: 'athena',
        endpointOverride: endpoint,
      });
      let acc = '';
      for await (const token of stream) {
        if (typeof token === 'string') {
          acc += token;
          setAnswer(acc);
        }
      }
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      console.error('[AskAthena] stream failed:', e);
      const raw = String(e?.message || '');
      let friendly = 'Athena is between shifts. Try again in a moment.';
      if (raw.includes('TOKEN_INVALID') || raw.includes('401')) {
        friendly = 'Your session has ended. Reload this page or sign in to ask Athena.';
      } else if (raw.includes('shells_remaining') || raw.includes('QUOTA')) {
        friendly = "Out of Sea Shells. Athena can't respond right now.";
      }
      setError(friendly);
    } finally {
      setStreaming(false);
      controllerRef.current = null;
      // Return focus to the textarea so the visitor can immediately
      // type their next question without reaching for the mouse.
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }

  const hasExchange = !!(lastQuestion || answer || streaming || error);

  return (
    <div className="rounded-xl bg-surface-1 border border-border-muted p-4 space-y-3">
      {/* Guide identity header — same row whether the card is idle or
          mid-exchange. Keeps the page-owner's guide front-and-centre. */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
          {guide.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-shell-400">{guide.name}</div>
          <div className="text-[11px] uppercase tracking-wider text-text-muted">{guide.role}</div>
        </div>
        <div className="text-2xs uppercase tracking-[0.12em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 font-semibold">
          Public
        </div>
      </div>

      {/* Exchange area — lives ABOVE the input so after Athena answers,
          the visitor's eyes stay near the response and the composer is
          right below, ready for the next question. One Q, one A —
          asking again replaces what's here. */}
      {hasExchange ? (
        <div className="pt-1 space-y-2">
          {lastQuestion && (
            <div className="text-xs text-text-muted italic leading-relaxed">
              <span className="text-text-muted/60 not-italic">You asked:</span> {lastQuestion}
            </div>
          )}
          {answer && (
            <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
              {answer}
              {streaming && <span className="inline-block w-1.5 h-4 ml-1 bg-shell-400 align-middle animate-pulse" />}
            </div>
          )}
          {!answer && streaming && (
            <div className="text-sm text-text-muted flex items-center gap-2">
              <Loader2 size={14} className="animate-spin" /> {guide.name} is thinking…
            </div>
          )}
          {error && (
            <div className="text-xs text-red-400 leading-relaxed">
              {error}
            </div>
          )}
        </div>
      ) : (
        <div className="text-xs text-text-muted leading-relaxed pt-1">
          Ask {guide.name} anything on {ownerLabelFallback(displayName, username)}'s profile.
        </div>
      )}

      {/* Composer — always the bottom row of the card, so the input and
          Ask button sit right under the last exchange. */}
      <div className="pt-2 border-t border-border-muted space-y-2">
        <textarea
          ref={textareaRef}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder={hasExchange ? 'Ask another question…' : 'Ask Athena a question…'}
          disabled={streaming}
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm bg-surface-2 border border-border-muted text-text-primary placeholder:text-text-muted focus:outline-none focus:border-shell-500/40 resize-none"
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
          }}
        />
        <div className="flex items-center justify-between gap-2">
          <span className="text-2xs text-text-muted">Enter to send · Shift+Enter for newline</span>
          <button
            type="button"
            onClick={handleAsk}
            disabled={streaming || !question.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-shell-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {streaming ? <><Loader2 size={12} className="animate-spin" /> Thinking…</> : <><Sparkles size={12} /> Ask</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function ownerLabelFallback(displayName: string, username: string) {
  return displayName || `@${username}`;
}

export function PublicProfile() {
  const { username } = useParams<{ username: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!username) return;
    async function fetchProfile() {
      try {
        const data = await ogRequest('GET', `/turtleshell/profile/${username}`) as any;
        setProfile(data);
        setIsOwner(data.isOwner === true);
      } catch (e: any) {
        console.error('[PublicProfile] fetch failed:', e);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, [username]);

  const saveField = useCallback(async (field: string, value: any) => {
    if (!username || !isOwner) return;
    setSaving(true);
    try {
      const result = await ogRequest('PUT', `/turtleshell/profile/${username}`, { [field]: value }) as any;
      setProfile(prev => prev ? { ...prev, ...result } : prev);
    } catch (e) {
      console.error('[PublicProfile] save failed:', e);
    } finally {
      setSaving(false);
    }
  }, [username, isOwner]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="text-center">
          <span className="text-5xl block mb-4 animate-pulse">🐢</span>
          <p className="text-sm text-text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="text-center">
          <div className="text-5xl mb-4">🐢</div>
          <h1 className="text-xl font-bold text-text-primary mb-2">Profile not found</h1>
          <p className="text-sm text-text-muted">@{username} doesn't exist in the ocean yet.</p>
          <Link to="/" className="inline-block mt-6 px-6 py-2.5 rounded-lg text-sm font-medium no-underline bg-shell-500 text-white">
            Go to TurtleShell.ai
          </Link>
        </div>
      </div>
    );
  }

  const cause = profile.cause ? CAUSE_MAP[profile.cause] : null;
  const guide = profile.guideAgent ? GUIDE_MAP[profile.guideAgent] : null;
  const isPublic = profile.profilePublic;
  const links: ProfileLink[] = profile.links || [];

  return (
    <div className="min-h-screen bg-surface-0">
      <div className="max-w-[480px] mx-auto px-5 py-12">

        {/* Owner indicator + back link to the internal profile. The
            public profile is reachable from /app/profile (sidebar avatar,
            or the @username link once the profile is public), but there's
            no browser-chrome back button inside the TurtleShell shell —
            so owners land here and get stranded. Render the "← Back to
            TurtleShell" arrow only for owners; non-owners see the public
            view and should not be offered the internal route. */}
        {isOwner && (
          <div className="flex items-center justify-between gap-3 mb-6">
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-1.5 text-xs text-text-muted no-underline hover:text-shell-400 transition-colors"
              title="Back to your TurtleShell profile"
            >
              <ArrowLeft size={14} />
              <span>Back to TurtleShell</span>
            </Link>
            <div className="flex items-center gap-2 text-xs text-text-muted">
              <div className="w-1.5 h-1.5 rounded-full bg-shell-400" />
              Editing your public profile
              {saving && <span className="text-shell-400 ml-1">· Saving...</span>}
            </div>
          </div>
        )}

        {/* Avatar + name — renders the user-picked avatar from
            ProfileData__c.avatar. Falls back to the turtle default if
            the user hasn't chosen one yet. Read-only here (editing is
            on the internal /app/profile page). */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-surface-2 border-2 border-shell-500/30 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-shell-500/10">
            {(profile.profileData?.avatar && profile.profileData.avatar !== '🐢')
              ? profile.profileData.avatar
              : <img src="/assets/turtleshell-logo.png" alt="" className="w-12 h-12 object-contain" />}
          </div>

          {isOwner ? (
            <EditableText value={profile.displayName} placeholder="Display name"
              onSave={v => saveField('displayName', v)} className="text-2xl font-bold text-text-primary" />
          ) : (
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">{profile.displayName}</h1>
          )}
          <p className="text-sm text-shell-400 font-medium mt-0.5">@{profile.username}</p>

          {(isPublic || isOwner) && (
            isOwner ? (
              <div className="mt-3 w-full max-w-[340px]">
                <EditableText value={profile.bio || ''} placeholder="Add a bio..." multiline
                  onSave={v => saveField('bio', v)} className="text-sm text-text-muted leading-relaxed" />
              </div>
            ) : profile.bio ? (
              <p className="text-sm text-text-muted leading-relaxed mt-3 max-w-[340px] whitespace-pre-line">{profile.bio}</p>
            ) : null
          )}

          <div className="flex gap-2 flex-wrap justify-center mt-3">
            <span className="text-xs rounded-full px-3 py-1 bg-surface-1 border border-border-muted text-text-muted">🐢 TurtleShell.ai</span>
            {cause && profile.cause && (
              <span className="text-xs rounded-full px-3 py-1 bg-surface-1 border border-border-muted text-text-muted">{cause.emoji} {profile.cause}</span>
            )}
          </div>
        </div>

        {/* Content — visible if public or owner */}
        {(isPublic || isOwner) ? (
          <>
            {/* Cause */}
            {cause && profile.cause && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Cause</h3>
                <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
                  <span className="text-2xl">{cause.emoji}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-shell-400">{profile.cause}</div>
                    <div className="text-xs text-text-muted">Permanent · chosen at the beginning</div>
                  </div>
                  {profile.shellsGiven != null && (
                    <div className="text-right shrink-0">
                      <span className="text-lg font-bold text-text-primary block">{profile.shellsGiven}</span>
                      <span className="text-[10px] text-text-muted">given</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            {(links.length > 0 || isOwner) && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Links</h3>
                {isOwner ? (
                  <LinkEditor links={links} onSave={v => saveField('links', v)} />
                ) : (
                  <div className="space-y-2">
                    {links.map((link, i) => (
                      <a key={i} href={link.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted no-underline text-text-primary hover:border-shell-500/30 transition-colors group">
                        <span className="text-xl shrink-0">{link.icon || '🔗'}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{link.title}</div>
                          <div className="text-xs text-text-muted truncate">{link.url}</div>
                        </div>
                        <span className="text-text-muted group-hover:text-shell-400 transition-colors">›</span>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Guide — single card. If the owner has flipped
                `guidePublic` on AND Athena is the guide, the card
                upgrades to an Ask Athena widget (same header, with an
                input + response area appended). Otherwise it stays as
                a read-only identity card. Only one card renders either
                way; we never show the Guide and the Ask widget as
                separate siblings. */}
            {guide && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Guide</h3>
                {profile.profileData?.guidePublic === true && profile.guideAgent === 'athena' ? (
                  <AskAthena
                    displayName={profile.displayName}
                    username={profile.username}
                    cause={profile.cause}
                    bio={profile.bio}
                    guide={guide}
                    ownerEndpoint={profile.profileData?.guideEndpoint || null}
                  />
                ) : (
                  <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
                    <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
                      {guide.emoji}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold text-shell-400">{guide.name}</div>
                      <div className="text-[11px] uppercase tracking-wider text-text-muted">{guide.role}</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">This profile is private.</p>
          </div>
        )}

        {/* Visitor CTA — converts non-owner viewers into signups. Hidden
            for the owner (they already have an account, would be noise).
            Referral-code query param can be added later; for now the link
            just drops the visitor on /login. */}
        {!isOwner && (
          <div className="mt-8 rounded-xl bg-gradient-to-br from-shell-500/10 to-shell-500/5 border border-shell-500/30 p-5 text-center">
            <div className="text-2xl mb-1">🐢</div>
            <div className="text-sm font-semibold text-text-primary mb-1">Get your own TurtleShell</div>
            <div className="text-xs text-text-muted mb-3 leading-relaxed">
              Your own AI guide. Your own public page. Your own Sea Shells.
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold no-underline bg-shell-500 text-white hover:bg-shell-400 transition-colors"
            >
              Get your own →
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-8">
          <Link to="/" className="inline-flex items-center gap-2 text-xs text-text-muted no-underline hover:text-shell-400 transition-colors">
            🐢 Powered by <span className="font-medium text-shell-400">TurtleShell.ai</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
