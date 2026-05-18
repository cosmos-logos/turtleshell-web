import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ExternalLink, Lock, Pencil, Check, X, Loader2, ShieldCheck } from 'lucide-react';
import { useCosmosLogosStore } from '@/lib/cosmos-logos/store';
import { agentDisplayName } from '@/lib/cosmos-logos/types';
import { ogRequest, getShellId } from '@/lib/api/olympus-grid-client';
import { plutusClient, type QuotaResponse } from '@/lib/api/plutus-client';
import { useEnvironmentStore } from '@/lib/store/environment-store';
import { useTestBetaEnabled } from '@/lib/beta';
import { useConfiguredGuidesStore } from '@/lib/store/configured-guides-store';
import { useAgentStore, hasUserApiKey } from '@/lib/store/agent-store';
import { useChatStore } from '@/lib/store/chat-store';
import { BYOK_GUIDES } from '@/routes/onboarding/OnboardingData';
import { isCosmosCodenameConfigured } from '@/lib/beta';

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

// Sea-creature avatars picked by the user. Default is the turtle — the
// canonical TurtleShell mark — and the rest are the "ocean friends" the
// user can swap to. Stored in TurtleshellProfile__c.ProfileData__c under
// the `avatar` key; the FE owns this schema (no dedicated column). If
// you add entries here, existing stored avatars still work — unknown
// emojis just render as the stored glyph.
const AVATAR_OPTIONS: string[] = ['', '🦈', '🐬', '🧜‍♀️', '🐠', '🦀', '🦞', '🐙'];

// Handle format — lowercase alphanumerics + `.` `_` `-`, 3–24 chars. Mirrors
// what the Apex PUT path ultimately stores (lowercase + trim); the server
// is the ground truth for uniqueness, this regex just gates the UI save
// button early so the user isn't round-tripping obvious garbage.
const HANDLE_REGEX = /^[a-z0-9._-]{3,24}$/;

type HandleCheckState = 'idle' | 'invalid' | 'checking' | 'available' | 'taken' | 'error';

// Render an endpoint URL as just its hostname for human display. We
// store full URLs in ProfileData.guideEndpoint so the backend can use
// them directly, but surfacing the whole URL in the UI is noisy.
function safeHostname(url: string): string {
  try { return new URL(url).host; } catch { return url; }
}

// ─── ApplicationProfile envelope adapter ────────────────────────────
// The new /v1/grid/master/app/profile/turtleshell-web endpoint returns
// the envelope { appKey, accountStatus, isOwner, profileData, createdAt,
// updatedAt }. All app-specific fields (username, displayName, cause,
// etc.) live inside profileData. The view code below expects the legacy
// flat shape, so this adapter unflattens profileData into the top-level
// keys the views consume. Also called on PUT responses since the spec
// §1.6 echo includes profileData.
function flattenProfileEnvelope(env: any): ProfileResponse | null {
  if (!env || typeof env !== 'object') return null;
  const pd = (env.profileData && typeof env.profileData === 'object') ? env.profileData : {};
  return {
    ...pd,                      // username, displayName, cause, guideAgent, profilePublic, bio, avatarUrl, etc.
    profileData: pd,            // raw blob preserved so saveAvatar/toggleGuidePublic can read prior values
    accountStatus: env.accountStatus,
    isOwner: env.isOwner,
    // shellBalance / shellsGiven aren't on ApplicationProfile (Plutus owns).
    // Views that need them must call plutusClient.getQuota separately.
  } as ProfileResponse;
}

interface ProfileResponse {
  username?: string;
  displayName?: string;
  bio?: string;
  cause?: string;
  guideAgent?: string;
  shellBalance?: number;
  shellsGiven?: number;
  avatarUrl?: string;
  accountStatus?: string;
  profilePublic?: boolean;
  tierId?: string;
  onboardingComplete?: boolean;
  // FE-owned JSON blob on TurtleshellProfile__c.ProfileData__c. The
  // Apex GET parses the Long Text Area column into JSON before
  // returning it, so we work with a plain object here. Shape is
  // whatever the FE writes; today: { avatar?: string, ... }.
  profileData?: Record<string, any>;
  isOwner?: boolean;
}

export function Profile() {
  // Raw cosmos-logos store contents includes athena/cosmos/logos (auto-
  // connected on boot) even when the user never configured them as guides.
  // Hide guide-family entries that aren't in the user's configured set so
  // the profile doesn't leak unrelated agents — same rule the sidebar and
  // picker use. Non-guide cosmos-logos agents (thoth, poseidon, etc.) are
  // connected via the agent-setup flow and pass through as before.
  const connectedAgentsRaw = useCosmosLogosStore(s => s.agents);
  const connectedAgents = connectedAgentsRaw.filter(a =>
    isCosmosCodenameConfigured(a.manifest.identity.codename),
  );
  const setActiveChatAgent = useCosmosLogosStore(s => s.setActiveChatAgent);
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  // Live shell balance — pulled from Plutus quota (the source of truth)
  // rather than profile.shellBalance (which is set on signup, synced
  // async from Plutus, and not actually returned by the Apex GET today
  // for owner-or-public responses). Quota is always current.
  const [quota, setQuota] = useState<QuotaResponse | null>(null);
  // Save-in-flight flag for the public-profile toggle so we can disable
  // the switch while the PUT round-trips.
  const [savingPublic, setSavingPublic] = useState(false);
  // Avatar picker — popover is anchored to the avatar circle, closes
  // on outside click or after an emoji is chosen.
  const [avatarPickerOpen, setAvatarPickerOpen] = useState(false);
  const [savingAvatar, setSavingAvatar] = useState(false);
  const avatarPickerRef = useRef<HTMLDivElement | null>(null);
  // Handle (username) editor. The @handle switches between a read-only
  // link/lock glyph and an inline text input when `editingHandle` is on.
  // `handleCheckState` is driven by a debounced availability probe — the
  // Save button is gated on `available` + valid format + changed-from-current.
  const [editingHandle, setEditingHandle] = useState(false);
  const [handleDraft, setHandleDraft] = useState('');
  const [handleCheckState, setHandleCheckState] = useState<HandleCheckState>('idle');
  const [savingHandle, setSavingHandle] = useState(false);
  // Make-Athena-Public toggle. Stored in ProfileData__c.guidePublic as a
  // boolean. No dedicated SObject field — this is an FE-owned flag.
  const [savingGuidePublic, setSavingGuidePublic] = useState(false);
  // Beta-features gate. The "Make Athena Public" and "Make Profile
  // Public" cards are hidden until the user opts into beta features in
  // Settings. Rationale:
  //   - Public profile exposes a durable /u/:username page; we don't
  //     want every new signup auto-creating a link-in-bio without an
  //     explicit opt-in.
  //   - "Make Athena Public" attribution is still on the visitor today
  //     (see BC-030 — delegated-spend not yet built), so keeping it
  //     beta-only prevents the misleading "uses your Sea Shells" copy
  //     from reaching non-beta users before the backend catches up.
  // Beta-on users (internal testers, early adopters) still see + use
  // both toggles. Existing profiles with ProfilePublic__c=true or
  // guidePublic=true stay as-is on the backend — we only hide the
  // *UI*, not force-revert backend state.
  const testBetaEnabled = useTestBetaEnabled();

  useEffect(() => {
    async function fetchProfile() {
      try {
        // Fall back to email-derived username when the cached handle is
        // missing (pre-onboarding-rewrite users, cleared storage, etc.).
        // Same normalization Sidebar / iOS use — lowercase, alphanumerics
        // + `_` `-`. Without this fallback Profile silently renders the
        // empty shell for anyone whose `turtleshell_username` key was
        // never written.
        let username = localStorage.getItem('turtleshell_username') || '';
        if (!username) {
          const emailRaw = localStorage.getItem('olympus_grid_email') || '';
          const local = emailRaw.split('@')[0] || '';
          username = local.toLowerCase().replace(/[^a-z0-9_-]/g, '');
          if (username) localStorage.setItem('turtleshell_username', username);
        }
        if (!username) { setLoading(false); return; }
        // Migrated 2026-05-18 to /v1/grid/master/app/profile/turtleshell-web/me.
        // Identity-scoped via JWT; the legacy /turtleshell/profile/{username}
        // path is gone. Username segment ignored — the JWT sub claim
        // determines whose ApplicationProfile gets returned.
        const env = await ogRequest('GET', `/app/profile/turtleshell-web/me`) as any;
        setProfile(flattenProfileEnvelope(env));
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

  // Close the avatar picker when the user clicks outside its popover
  // card. The outer avatar button has its own click handler that
  // toggles open/close, so this listener only fires for clicks that
  // miss both targets.
  useEffect(() => {
    if (!avatarPickerOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (avatarPickerRef.current && !avatarPickerRef.current.contains(e.target as Node)) {
        setAvatarPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [avatarPickerOpen]);

  async function saveAvatar(emoji: string) {
    if (!profile?.username || savingAvatar) return;
    // Merge into the existing blob so we don't clobber other FE-owned
    // keys that might have been written by a future feature. Apex
    // accepts whole-blob replacement on PUT, so the FE is responsible
    // for the merge.
    const prevBlob = profile.profileData || {};
    const nextBlob = { ...prevBlob, avatar: emoji };
    setProfile({ ...profile, profileData: nextBlob });
    setAvatarPickerOpen(false);
    localStorage.setItem('turtleshell_avatar', emoji);
    setSavingAvatar(true);
    try {
      // wrap-style body — spec §1.4 says nested profileData object
      // becomes the merge patch. RFC 7396 deep-merges into stored blob;
      // sibling keys (cause, guidePublic, etc.) preserved.
      await ogRequest('PUT', `/app/profile/turtleshell-web/me`, {
        profileData: nextBlob,
      });
    } catch (e) {
      console.error('[Profile] save avatar failed:', e);
      // Revert on failure so the UI doesn't silently drift from the
      // server state.
      setProfile({ ...profile, profileData: prevBlob });
    } finally {
      setSavingAvatar(false);
    }
  }

  // Client-side handle existence probe disabled 2026-05-18: the new
  // /v1/app/profile/turtleshell-web endpoint is identity-scoped (/me)
  // and doesn't expose username lookups — backend spec §5 marks
  // /u/{username} as a separate follow-up endpoint. Until that ships,
  // we surface the check state as 'available' for any well-formed
  // handle and let the PUT enforce uniqueness server-side (error
  // message bubbles up to the UI as 'taken' via the catch in saveHandle).
  useEffect(() => {
    if (!editingHandle) return;
    if (handleDraft === profile?.username) { setHandleCheckState('idle'); return; }
    if (!HANDLE_REGEX.test(handleDraft)) { setHandleCheckState('invalid'); return; }
    // TODO(backend): replace with /v1/app/profile/turtleshell-web/u/{username}
    // once that endpoint lands. For now, optimistically mark as available;
    // server is the authoritative uniqueness gate.
    setHandleCheckState('available');
  }, [handleDraft, editingHandle, profile?.username]);

  async function saveHandle() {
    if (!profile?.username || savingHandle) return;
    const normalized = handleDraft.toLowerCase().trim();
    if (!HANDLE_REGEX.test(normalized)) { setHandleCheckState('invalid'); return; }
    if (normalized === profile.username) { setEditingHandle(false); return; }
    setSavingHandle(true);
    try {
      // New endpoint: username lives INSIDE profileData. Send the rename
      // as a flat-style top-level patch — server deep-merges username
      // into the stored blob (RFC 7396). Backend enforces uniqueness;
      // on collision it throws which lands in the catch below.
      const result = await ogRequest('PUT', `/app/profile/turtleshell-web/me`, {
        username: normalized,
      }) as any;
      // Keep the localStorage cache in sync so later GETs (on reload,
      // subscribe flows, etc.) resolve under the new handle.
      localStorage.setItem('turtleshell_username', normalized);
      const flat = flattenProfileEnvelope(result);
      setProfile(prev => prev ? { ...prev, ...(flat || {}), username: flat?.username ?? normalized } : prev);
      setEditingHandle(false);
      setHandleCheckState('idle');
    } catch (e: any) {
      console.error('[Profile] rename failed:', e);
      // Most common cause is a race where someone grabbed the handle
      // between our debounced check and this PUT. Surface as `taken`.
      setHandleCheckState(e?.message?.toLowerCase?.().includes('taken') ? 'taken' : 'error');
    } finally {
      setSavingHandle(false);
    }
  }

  function startEditingHandle() {
    if (!profile?.username) return;
    setHandleDraft(profile.username);
    setHandleCheckState('idle');
    setEditingHandle(true);
  }

  function cancelEditingHandle() {
    setEditingHandle(false);
    setHandleDraft('');
    setHandleCheckState('idle');
  }

  async function toggleGuidePublic() {
    if (!profile?.username || savingGuidePublic) return;
    const next = profile.profileData?.guidePublic !== true;
    const prevBlob = profile.profileData || {};
    // Capture the owner's *current* Athena endpoint on toggle-on so
    // visitors to /u/:username connect to the same Athena instance the
    // owner is running. This is the "the user controls it" contract —
    // if the owner is on AWS, visitors hit AWS; if off-grid, visitors
    // hit the off-grid Athena (via Tailscale/local). On toggle-off we
    // leave the endpoint in place (harmless residue); on toggle-on we
    // always refresh from the current env so environment-switches pick
    // up the latest URL without needing a separate "sync" button.
    const nextBlob: Record<string, any> = { ...prevBlob, guidePublic: next };
    if (next) {
      nextBlob.guideEndpoint = useEnvironmentStore.getState().getAthenaUrl();
    }
    setSavingGuidePublic(true);
    setProfile({ ...profile, profileData: nextBlob });
    try {
      await ogRequest('PUT', `/app/profile/turtleshell-web/me`, {
        profileData: nextBlob,
      });
    } catch (e) {
      console.error('[Profile] toggle guide public failed:', e);
      setProfile({ ...profile, profileData: prevBlob });
    } finally {
      setSavingGuidePublic(false);
    }
  }

  async function toggleProfilePublic() {
    if (!profile?.username || savingPublic) return;
    const next = !profile.profilePublic;
    setSavingPublic(true);
    // Optimistic update — revert on failure.
    setProfile({ ...profile, profilePublic: next });
    try {
      // Flat-style patch — top-level keys become the merge patch and
      // profilePublic gets merged into the stored ProfileData blob.
      await ogRequest('PUT', `/app/profile/turtleshell-web/me`, {
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
  // `profile.guideAgent` is still the server-side single-guide source of
  // truth (drives the Athena public toggle below); the Active Agents
  // section uses the client-side configuredGuides set.
  const email = localStorage.getItem('olympus_grid_email') || '';
  const displayName = profile?.displayName || localStorage.getItem('turtleshell_username') || email.split('@')[0] || '';
  const username = profile?.username || localStorage.getItem('turtleshell_username') || '';
  const guidePublic = profile?.profileData?.guidePublic === true;
  const isAthenaGuide = profile?.guideAgent === 'athena';
  // Save button is gated on: format valid, server says available, and
  // the draft differs from the current handle. We purposely ignore
  // `checking` — the Save button stays disabled until the probe resolves.
  const canSaveHandle =
    editingHandle &&
    HANDLE_REGEX.test(handleDraft) &&
    handleDraft !== profile?.username &&
    handleCheckState === 'available' &&
    !savingHandle;

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

        {/* Avatar + name — avatar is owner-editable and stored in
            ProfileData__c under `avatar`. Default is the turtle emoji
            (🐢), picker offers ~8 sea-creature emojis. The guide emoji
            is no longer overloaded for this — the Guide card below is
            the canonical place for that signal. */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={() => hasProfile && setAvatarPickerOpen(o => !o)}
              disabled={!hasProfile || savingAvatar}
              aria-label="Change avatar"
              aria-expanded={avatarPickerOpen}
              className={`w-16 h-16 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-3xl shrink-0 transition-all ${
                hasProfile ? 'hover:border-shell-500/50 cursor-pointer' : 'cursor-default'
              } ${savingAvatar ? 'opacity-60' : ''}`}
            >
              {(profile?.profileData?.avatar && profile.profileData.avatar !== '🐢')
                ? profile.profileData.avatar
                : <img src="/assets/turtleshell-logo.png" alt="" className="w-10 h-10 object-contain" />}
            </button>
            {hasProfile && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-shell-500 border-2 border-surface-0 flex items-center justify-center text-[9px] font-bold text-white">✓</div>
            )}
            {avatarPickerOpen && (
              <div
                ref={avatarPickerRef}
                className="absolute top-full left-0 mt-2 z-20 p-2 rounded-xl bg-surface-1 border border-border-muted shadow-lg grid grid-cols-4 gap-1 min-w-[180px]"
              >
                {AVATAR_OPTIONS.map((emoji) => {
                  const currentAv = profile?.profileData?.avatar ?? '';
                  const active = emoji === '' ? (!currentAv || currentAv === '🐢') : currentAv === emoji;
                  return (
                    <button
                      key={emoji || 'logo'}
                      type="button"
                      onClick={() => saveAvatar(emoji)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-2xl transition-colors ${
                        active
                          ? 'bg-shell-500/20 ring-1 ring-shell-500/40'
                          : 'hover:bg-surface-2'
                      }`}
                      aria-label={emoji ? `Set avatar to ${emoji}` : 'Set avatar to TurtleShell logo'}
                    >
                      {emoji || <img src="/assets/turtleshell-logo.png" alt="" className="w-7 h-7 object-contain" />}
                    </button>
                  );
                })}
              </div>
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
            {/* @handle — three modes:
                1. Edit mode (editingHandle=true): inline text input with
                   live format + availability validation. Server enforces
                   uniqueness again on PUT so the race between the debounced
                   GET probe and the save is always safe.
                2. Public read mode: Link to /u/:username + pencil + external
                   glyph.
                3. Private read mode: plain span + pencil + lock glyph.
                The pencil toggles into edit mode in either read mode. */}
            {username && (
              editingHandle ? (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-sm text-shell-400 font-medium">@</span>
                  <input
                    value={handleDraft}
                    onChange={e => setHandleDraft(e.target.value.toLowerCase())}
                    autoFocus
                    disabled={savingHandle}
                    maxLength={24}
                    className="flex-1 min-w-0 px-2 py-0.5 rounded-md text-sm bg-surface-1 border border-shell-500/40 text-text-primary focus:outline-none focus:border-shell-500"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && canSaveHandle) saveHandle();
                      if (e.key === 'Escape') cancelEditingHandle();
                    }}
                    aria-label="Edit handle"
                  />
                  {handleCheckState === 'checking' && <Loader2 size={14} className="text-text-muted animate-spin shrink-0" />}
                  {handleCheckState === 'available' && <Check size={14} className="text-emerald-400 shrink-0" />}
                  {(handleCheckState === 'taken' || handleCheckState === 'invalid' || handleCheckState === 'error') && (
                    <X size={14} className="text-red-400 shrink-0" />
                  )}
                  <button
                    type="button"
                    onClick={cancelEditingHandle}
                    className="p-1 rounded hover:bg-surface-2 text-text-muted shrink-0"
                    aria-label="Cancel"
                  >
                    <X size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={saveHandle}
                    disabled={!canSaveHandle}
                    className="p-1 rounded hover:bg-shell-500/10 text-shell-400 disabled:text-text-muted/30 disabled:hover:bg-transparent disabled:cursor-not-allowed shrink-0"
                    aria-label="Save handle"
                  >
                    {savingHandle ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  </button>
                </div>
              ) : profile?.profilePublic ? (
                <span className="inline-flex items-center gap-1">
                  <Link
                    to={`/u/${username}`}
                    title="View your public profile"
                    className="inline-flex items-center gap-1 text-sm text-shell-400 font-medium no-underline hover:underline"
                  >
                    <span>@{username}</span>
                    <ExternalLink size={12} className="opacity-70" />
                  </Link>
                  <button
                    type="button"
                    onClick={startEditingHandle}
                    title="Change your handle"
                    aria-label="Change handle"
                    className="p-0.5 rounded hover:bg-shell-500/10 text-text-muted hover:text-shell-400 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  <span
                    title={testBetaEnabled
                      ? "Your profile is private. Toggle Make Profile Public below to share your link."
                      : "Your profile is private."}
                    className="inline-flex items-center gap-1 text-sm text-text-muted font-medium"
                  >
                    <span>@{username}</span>
                    <Lock size={11} className="opacity-70" />
                  </span>
                  <button
                    type="button"
                    onClick={startEditingHandle}
                    title="Change your handle"
                    aria-label="Change handle"
                    className="p-0.5 rounded hover:bg-shell-500/10 text-text-muted hover:text-shell-400 transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                </span>
              )
            )}
            {/* Handle editor hint row — only visible in edit mode. Shows
                the live validation state so the user understands *why*
                Save is disabled. */}
            {editingHandle && (
              <p className="text-2xs mt-1 text-text-muted leading-tight">
                {handleCheckState === 'invalid' && <span className="text-red-400">3–24 chars, lowercase letters, digits, . _ -</span>}
                {handleCheckState === 'taken' && <span className="text-red-400">@{handleDraft} is already taken</span>}
                {handleCheckState === 'available' && <span className="text-emerald-400">@{handleDraft} is available</span>}
                {handleCheckState === 'checking' && <span>Checking availability…</span>}
                {handleCheckState === 'error' && <span className="text-red-400">Couldn't save — try again</span>}
                {handleCheckState === 'idle' && <span>Your public link will be turtleshell.ai/u/{handleDraft || username}</span>}
              </p>
            )}
            {email && (
              <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1 min-w-0">
                <span className="truncate">{email}</span>
                <span
                  title="Private — Never Shared · Never Sold"
                  aria-label="Private — never shared, never sold"
                  className="shrink-0 inline-flex items-center text-text-muted/50 cursor-help"
                >
                  <Lock size={10} />
                </span>
              </p>
            )}
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

        {/* Active Agents — every guide the user has configured via onboarding
            or Settings → Change Guide. Clicking a card activates that agent
            and drops the user into its chat (chat-store preserves each
            agent's last conversationId + message thread, so it resumes
            rather than starting fresh). The currently-active one shows the
            pulsing dot; Athena retains its Public/Private badge since the
            public-profile flow is Athena-specific. */}
        <ActiveAgents
          currentGuideKey={profile?.guideAgent ?? null}
          isAthenaGuide={isAthenaGuide}
          guidePublic={guidePublic}
          onSelect={() => { /* navigation handled inside */ }}
        />

        {/* Make Athena Public — gated on Athena being the selected guide
            (only Athena is wired end-to-end for the Ask-on-public-page
            flow today; other guides will land later). Stored as an
            FE-owned `guidePublic` key inside ProfileData__c. The copy
            warns about shell consumption — today the visitor pays with
            their own shells, but the intent (and future backend work) is
            that queries routed through a user's public page spend the
            *owner's* shells, so the copy is written for that model. */}
        {hasProfile && isAthenaGuide && testBetaEnabled && (
          <div className="p-4 rounded-xl bg-surface-1 border border-border-muted">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-text-primary">Make Athena Public</div>
                <div className="text-2xs text-text-muted mt-0.5 leading-relaxed">
                  {guidePublic
                    ? <>Athena is live on <span className="font-mono text-shell-400">turtleshell.ai/u/{username}</span>. Anyone on the internet can ask her questions from your profile.</>
                    : <>Let anyone on the internet chat with Athena from your public profile page. She'll answer questions using your context (cause, bio, links).</>}
                </div>
              </div>
              <button
                type="button"
                onClick={toggleGuidePublic}
                disabled={savingGuidePublic}
                aria-pressed={guidePublic}
                aria-label="Make Athena public"
                className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
                  guidePublic ? 'bg-shell-500' : 'bg-surface-3'
                } ${savingGuidePublic ? 'opacity-60 cursor-wait' : 'cursor-pointer'}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow-sm ${
                    guidePublic ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
            {/* Reassurance note — Athena is only passed the public
                context the owner has explicitly shared (displayName,
                bio, cause). Private fields (shellBalance, email, raw
                profile internals) are gated server-side on the Apex
                GET owner-check. The /security page is the full write-up. */}
            <div className="text-2xs leading-relaxed mt-3 pt-3 border-t border-border-muted text-text-muted/80 flex items-start gap-2">
              <ShieldCheck size={12} className="shrink-0 mt-0.5 text-emerald-400/80" />
              <div>
                Don't worry — Athena only shares what you've made public on your profile (your name, bio, cause, links). Private fields never leave the backend. <Link to="/security" className="text-shell-400 hover:underline no-underline">Read our security approach →</Link>
              </div>
            </div>
            <div className="text-2xs leading-relaxed mt-3 pt-3 border-t border-border-muted text-text-muted/80">
              <span className="text-amber-400 font-medium">Heads up:</span> responses will use <span className="text-shell-400 font-medium">your Sea Shells</span>. Anyone can burn through your balance — turn this off if you need to protect your quota. Never share anything with Athena here that you wouldn't want a visitor to see.
            </div>
            {guidePublic && !profile?.profilePublic && (
              <div className="text-2xs text-amber-400/90 mt-2 leading-relaxed">
                ⚠ Your profile is private — visitors can't reach your page. Toggle <span className="font-semibold">Make Profile Public</span> below to unblock them.
              </div>
            )}
            {/* Endpoint transparency — shows the owner which Athena URL
                visitors will route to. Captured at toggle-on time from
                the owner's env store, stored in ProfileData.guideEndpoint.
                If they switch environments (AWS ↔ off-grid) they can
                toggle off → on to refresh the captured endpoint. */}
            {guidePublic && profile?.profileData?.guideEndpoint && (
              <div className="text-2xs text-text-muted/70 mt-2 leading-relaxed font-mono break-all">
                Connected via <span className="text-shell-400">{safeHostname(profile.profileData.guideEndpoint)}</span> — toggle off and on again to update if you've changed environments.
              </div>
            )}
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
                    // CRITICAL: switch the chat-store thread along with the
                    // cosmos-logos active agent. Without this, the header
                    // would render the new agent's identity while the chat
                    // panel still shows the previous agent's messages —
                    // breaking the "every agent has its own unbreakable
                    // consciousness" product promise. Each agent's thread
                    // is scoped by id in chat-store.threads.
                    setActiveChatAgent(a.id);
                    useChatStore.getState().switchAgent(a.id);
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
            withheld. Owners always get the full record regardless.
            Beta-gated — see testBetaEnabled comment where the state is
            declared. New profiles are private by default at onboarding
            time (see Onboarding.tsx POST /turtleshell/profile). */}
        {hasProfile && testBetaEnabled && (
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

        {/* Actions — Change Guide flow lives at /app/settings/change-guide
            and is additive: picking a new guide adds to the sidebar without
            hiding the previously configured ones. The Active Agents section
            above reflects every guide the user has set up so far. */}
        <div className="flex flex-col gap-2 pt-2">
          <Link
            to="/app/settings/change-guide"
            className="block w-full text-center py-2.5 rounded-lg text-sm font-medium bg-shell-500/10 border border-shell-500/30 text-shell-400 hover:bg-shell-500/15 transition-colors"
          >
            Change or Add a Guide
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Active Agents section ────────────────────────────
// Lists every guide the user has configured. Clicking a card activates it
// and navigates to chat; the chat-store's per-agent thread state means the
// user lands on that agent's most-recent conversation (or a blank canvas if
// they haven't chatted with it yet).
function ActiveAgents({
  currentGuideKey,
  isAthenaGuide,
  guidePublic,
}: {
  currentGuideKey: string | null;
  isAthenaGuide: boolean;
  guidePublic: boolean;
  onSelect: () => void;
}) {
  const navigate = useNavigate();
  const configuredList = useConfiguredGuidesStore((s) => s.configured);
  const cosmosAgents = useCosmosLogosStore((s) => s.agents);
  const builtinAgents = useAgentStore((s) => s.agents);
  const setActiveChatAgent = useCosmosLogosStore((s) => s.setActiveChatAgent);
  const setActiveAgent = useAgentStore((s) => s.setActiveAgent);
  const switchAgent = useChatStore((s) => s.switchAgent);
  const activeChatAgentId = useCosmosLogosStore((s) => s.activeChatAgentId);
  const builtinActive = useAgentStore((s) => s.activeAgent);

  if (configuredList.length === 0) return null;

  // Build the display list — preserves the order the user configured them.
  const items = configuredList.map((key) => {
    // Cosmos-logos bundled personas
    if (key === 'athena' || key === 'cosmos' || key === 'logos') {
      const info = (GUIDE_MAP as Record<string, { emoji: string; name: string; role: string }>)[key];
      if (!info) return null;
      const matchCodename = key === 'athena' ? 'athena-616' : key;
      const cosmos = cosmosAgents.find((a) => a.manifest.identity.codename === matchCodename);
      const activeCosmosCodename = activeChatAgentId
        ? cosmosAgents.find((a) => a.id === activeChatAgentId)?.manifest.identity.codename
        : null;
      const isActiveHere = !!activeCosmosCodename && (
        key === 'athena'
          ? activeCosmosCodename.startsWith('athena')
          : activeCosmosCodename === key
      );
      return {
        key,
        ...info,
        isActive: isActiveHere,
        onClick: () => {
          if (cosmos) {
            setActiveChatAgent(cosmos.id);
            switchAgent(cosmos.id);
            navigate('/app/chat');
          }
        },
      };
    }
    // BYOK — lives as builtin with a user-supplied key
    if (['openai', 'claude', 'grok', 'gemini'].includes(key)) {
      const info = BYOK_GUIDES[key as keyof typeof BYOK_GUIDES];
      if (!info || !hasUserApiKey(key)) return null;
      const builtin = builtinAgents.find((a) => a.id === key);
      const isActiveHere = !activeChatAgentId && builtinActive.id === key;
      return {
        key,
        emoji: info.emoji,
        name: info.name,
        role: info.role,
        isActive: isActiveHere,
        onClick: () => {
          setActiveChatAgent(null);
          if (builtin) setActiveAgent(builtin);
          switchAgent(key);
          navigate('/app/chat');
        },
      };
    }
    return null;
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  if (items.length === 0) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-2">
        Active Agents
      </h3>
      <div className="flex flex-col gap-2">
        {items.map((it) => {
          const showPublicBadge = it.key === 'athena' && currentGuideKey === 'athena' && isAthenaGuide;
          return (
            <button
              key={it.key}
              type="button"
              onClick={it.onClick}
              className={`flex items-center gap-3 rounded-xl p-4 bg-surface-1 border transition-all text-left w-full ${
                it.isActive
                  ? 'border-shell-500/40 bg-shell-500/5'
                  : 'border-border-muted hover:border-shell-500/30'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-surface-2 border border-border-muted flex items-center justify-center text-xl shrink-0">
                {it.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className={`text-sm font-semibold ${it.isActive ? 'text-shell-400' : 'text-text-primary'}`}>
                    {it.name}
                  </div>
                  {showPublicBadge && (
                    guidePublic ? (
                      <span className="text-2xs uppercase tracking-[0.12em] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded px-1.5 py-0.5 font-semibold">
                        Public
                      </span>
                    ) : (
                      <span className="text-2xs uppercase tracking-[0.12em] text-text-muted/70 bg-surface-2 border border-border-muted rounded px-1.5 py-0.5 font-semibold">
                        Private
                      </span>
                    )
                  )}
                </div>
                <div className="text-[11px] uppercase tracking-wider text-text-muted">{it.role}</div>
              </div>
              {it.isActive ? (
                <div className="flex items-center gap-1.5 text-xs text-shell-400 shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-shell-400 animate-pulse" />Active
                </div>
              ) : (
                <div className="text-xs text-text-muted shrink-0">Switch →</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
