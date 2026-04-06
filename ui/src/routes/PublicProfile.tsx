import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Trash2, GripVertical, Check, X } from 'lucide-react';
import { ogRequest } from '@/lib/api/olympus-grid-client';

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

        {/* Owner indicator */}
        {isOwner && (
          <div className="flex items-center justify-center gap-2 mb-6 text-xs text-text-muted">
            <div className="w-1.5 h-1.5 rounded-full bg-shell-400" />
            Editing your public profile
            {saving && <span className="text-shell-400 ml-1">· Saving...</span>}
          </div>
        )}

        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-24 h-24 rounded-full bg-surface-2 border-2 border-shell-500/30 flex items-center justify-center text-4xl mb-4 shadow-lg shadow-shell-500/10">
            {guide?.emoji || '🐢'}
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

            {/* Guide */}
            {guide && (
              <div className="mb-5">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Guide</h3>
                <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
                  <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
                    {guide.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-shell-400">{guide.name}</div>
                    <div className="text-[11px] uppercase tracking-wider text-text-muted">{guide.role}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-text-muted">This profile is private.</p>
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
