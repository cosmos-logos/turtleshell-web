import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Lock } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { agentDisplayName } from '@/lib/cosmos-logos/types';
import { ogRequest, getShellId } from '@/lib/api/olympus-grid-client';
import { plutusClient, type QuotaResponse } from '@/lib/api/plutus-client';

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

interface ProfileData {
  username?: string;
  displayName?: string;
  bio?: string;
  cause?: string;
  guideAgent?: string;
  shellBalance?: number;
  shellsGiven?: number;
  avatarUrl?: string;
  profilePublic?: boolean;
  tierId?: string;
  onboardingComplete?: boolean;
}

export function Profile() {
  const connectedAgents = useCosmosLogosStore(s => s.agents);
  const setActiveChatAgent = useCosmosLogosStore(s => s.setActiveChatAgent);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  // Live shell balance — pulled from Plutus quota (the source of truth)
  // rather than profile.shellBalance (which is set on signup, synced
  // async from Plutus, and not actually returned by the Apex GET today
  // for owner-or-public responses). Quota is always current.
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  // Save-in-flight flag for the public-profile toggle so we can disable
  // the switch while the PUT round-trips.
  const [savingPublic, setSavingPublic] = useState(false);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const username = localStorage.getItem('turtleshell_username');
        if (!username) { setLoading(false); return; }
        const data = await ogRequest('GET', `/turtleshell/profile/${username}`) as any;
        setProfile(data);
      } catch (e: any) {
        console.error('[Profile] fetch failed:', e);
      } finally {
        setLoading(false);
      }
    }
    async function fetchQuota() {
      try {
        const q = await plutusClient.getQuota(getShellId());
        setQuota(q);
      } catch (e) {
        console.error('[Profile] quota fetch failed:', e);
      }
    }
    fetchProfile();
    fetchQuota();
  }, []);

  async function toggleProfilePublic() {
    if (!profile?.username || savingPublic) return;
    const next = !profile.profilePublic;
    setSavingPublic(true);
    // Optimistic update — revert on failure.
    setProfile({ ...profile, profilePublic: next });
    try {
      await ogRequest('PUT', `/turtleshell/profile/${encodeURIComponent(profile.username)}`, {
        profilePublic: next,
      });
    } catch (e) {
      console.error('[Profile] toggle public failed:', e);
      setProfile({ ...profile, profilePublic: !next });
    } finally {
      setSavingPublic(false);
    }
  }

  const hasProfile = !!profile?.username;
  const cause = profile?.cause ? CAUSE_MAP[profile.cause] : null;
  const guide = profile?.guideAgent ? GUIDE_MAP[profile.guideAgent] : null;
  const email = localStorage.getItem('olympus_grid_email') || '';
  const displayName = profile?.displayName || localStorage.getItem('turtleshell_username') || email.split('@')[0] || '';
  const username = profile?.username || localStorage.getItem('turtleshell_username') || '';

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface-0 flex items-center justify-center">
        <div className="text-center">
          <span className="text-5xl block mb-4 animate-pulse">🐢</span>
          <p className="text-sm text-text-muted">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface-0">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

        {/* Avatar + name */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-3xl shrink-0">
              {guide?.emoji || '🐢'}
            </div>
            {hasProfile && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-shell-500 border-2 border-surface-0 flex items-center justify-center text-[9px] font-bold text-white">✓</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text-primary truncate">{displayName}</h1>
            {/* @username — clickable only when the profile is public.
                When public: acts as a link to /u/:username with an
                external-link glyph hint. When private: plain text with
                a lock glyph + muted colour so the user understands why
                it does not navigate. The backend `ApiRouteTurtleshellProfile.handleGet`
                already gates private-profile data for non-owners; this
                is the matching UI affordance. */}
            {username && (
              profile?.profilePublic ? (
                <Link
                  to={`/u/${username}`}
                  title="View your public profile"
                  className="inline-flex items-center gap-1 text-sm text-shell-400 font-medium no-underline hover:underline"
                >
                  <span>@{username}</span>
                  <ExternalLink size={12} className="opacity-70" />
                </Link>
              ) : (
                <span
                  title="Your profile is private. Toggle Make Profile Public below to share your link."
                  className="inline-flex items-center gap-1 text-sm text-text-muted font-medium cursor-not-allowed"
                >
                  <span>@{username}</span>
                  <Lock size={11} className="opacity-70" />
                </span>
              )
            )}
            {email && <p className="text-xs text-text-muted mt-0.5 truncate">{email}</p>}
          </div>
        </div>

        {/* Stats row */}
        {hasProfile && (
          <div className="grid grid-cols-3 divide-x divide-border-muted border border-border-muted rounded-xl bg-surface-1">
            {[
              { value: String(connectedAgents.length || '0'), label: 'Gods Online' },
              // Pull the live Sea Shell balance from Plutus quota — the
              // Apex GET does not return shellBalance to anyone today
              // (sensitive field, never put in the result map), so the
              // old `profile.shellBalance` read always resolved to
              // undefined and displayed as 0 even for a user with 9970
              // shells in Salesforce. Plutus quota is the canonical
              // runtime value.
              { value: (quota?.shells_remaining ?? profile?.shellBalance ?? 0).toLocaleString(), label: 'Sea Shells' },
              { value: (profile?.shellsGiven ?? 0).toLocaleString(), label: 'Shells Given' },
            ].map((s, i) => (
              <div key={i} className="py-4 text-center">
                <span className="text-lg font-bold text-text-primary block">{s.value}</span>
                <span className="text-[10px] tracking-widest uppercase text-text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Cause */}
        {cause && profile?.cause && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2 flex items-center gap-2">
              <span>My Cause</span>
            </h3>
            <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
              <span className="text-2xl">{cause.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-semibold text-shell-400">{profile.cause}</div>
                <div className="text-xs text-text-muted">Permanent · chosen at the beginning</div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-text-primary block">{profile?.shellsGiven ?? 0}</span>
                <span className="text-[10px] text-text-muted">given</span>
              </div>
            </div>
          </div>
        )}

        {/* Guide */}
        {guide && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">My Guide</h3>
            <div className="flex items-center gap-3 rounded-xl p-4 bg-surface-1 border border-border-muted">
              <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
                {guide.emoji}
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-shell-400">{guide.name}</div>
                <div className="text-[11px] uppercase tracking-wider text-text-muted">{guide.role}</div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-shell-400">
                <div className="w-1.5 h-1.5 rounded-full bg-shell-400 animate-pulse" />Active
              </div>
            </div>
          </div>
        )}

        {/* Connected gods */}
        {connectedAgents.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">Connected Gods</h3>
            <div className="flex flex-wrap gap-2">
              {connectedAgents.map((a, i) => (
                <button key={i} onClick={() => {
                  if (a.manifest.display?.app_url) {
                    navigate(`/app/agent/${a.id}`);
                  } else {
                    setActiveChatAgent(a.id);
                    navigate('/app/chat');
                  }
                }} className="text-xs rounded-full px-3 py-1.5 bg-surface-1 border border-border-muted text-text-secondary hover:text-shell-400 hover:border-shell-500/40 transition-colors cursor-pointer">
                  {agentDisplayName(a)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Make Profile Public toggle — owner-only UI, flips
            TurtleshellProfile__c.ProfilePublic__c via PUT. When false,
            the Apex GET /turtleshell/profile/:username returns only the
            thin public shell (username / displayName / avatar / cause)
            for non-owners; bio, guide, shellsGiven, tier, links are
            withheld. Owners always get the full record regardless. */}
        {hasProfile && (
          <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-surface-1 border border-border-muted">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-text-primary">Make Profile Public</div>
              <div className="text-2xs text-text-muted mt-0.5">
                {profile?.profilePublic
                  ? <>Your link-in-bio is live at <span className="font-mono text-shell-400">turtleshell.ai/u/{username}</span></>
                  : <>Your profile is private — the link above is hidden until you flip this.</>
                }
              </div>
            </div>
            <button
              type="button"
              onClick={toggleProfilePublic}
              disabled={savingPublic}
              aria-pressed={!!profile?.profilePublic}
              className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                profile?.profilePublic ? 'bg-shell-500' : 'bg-surface-3'
              } ${savingPublic ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                  profile?.profilePublic ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </div>
        )}

        {/* Actions — Change Guide is disabled ("Soon") because the
            guide switch flow has known bugs under a signed-in profile;
            ship it after we validate the onboarding-preservation path.
            Redo Onboarding and Settings removed (no user story). */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="block w-full text-center py-2.5 rounded-lg text-sm font-medium bg-surface-1 border border-border-muted text-text-muted/60 cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span>Change Guide</span>
            <span className="text-2xs uppercase tracking-[0.15em] text-amber-400/80 bg-amber-500/10 border border-amber-500/20 rounded px-1.5 py-0.5 font-semibold">
              Soon
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
