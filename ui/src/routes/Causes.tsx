import { Link } from 'react-router-dom';
import { CAUSES } from '@/lib/causes';
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate';

/**
 * Public "The Causes" page.
 *
 * Reimplementation of the PM's `turtleshell-causes.html` design brief,
 * rebuilt in our Tailwind token system (shell-* / amber-* / surface-* /
 * text-*) rather than the raw CSS variables in the brief. Same narrative
 * beats, same emotional arc — our styling system so the page lives and
 * evolves with the rest of the marketing surface.
 *
 * Route: /causes (public, no auth). Linked from:
 *   - Landing TitheBand "Read the full story"
 *   - Landing PillarsGrid "Read about the Seven Pillars"
 *   - Onboarding CauseScreen "Learn about the causes" (opens in new tab
 *     so the user doesn't lose their onboarding state)
 *   - iOS surfaces link here directly (see follow-up PR in
 *     cosmos-logos/turtleshell-ios)
 *
 * Content alignment with our current system:
 *   - Renders the full 7-cause catalog from lib/causes.ts — NOT the
 *     subset of 3 in the PM brief, which predated the 7-pillar thesis.
 *   - Partner-application form from the brief is replaced with a
 *     "Coming Soon" / expression-of-interest CTA because we don't have
 *     the backend to accept structured applications yet. Honesty over
 *     theatre.
 *   - Stats row reflects "7 Pillars" not "3 Causes to Choose".
 *   - Dev banner at the top is kept — it is the single most important
 *     beat of the page: we will not take a dollar until the Foundation
 *     is operationally ready.
 */
export function Causes() {
  return (
    <div className="relative">
      <Hero />
      <HowTheTitheWorks />
      <CausesGrid />
      <ShellFlow />
      <OlympusFoundation />
      <Transparency />
      <PartnersComingSoon />
      <FinalCTA />
    </div>
  );
}

/* ================================================================ */
/* HERO                                                              */
/* ================================================================ */
function Hero() {
  return (
    <section className="relative flex flex-col items-center justify-center text-center px-6 pt-24 md:pt-32 pb-16 min-h-[60vh]">
      <div className="text-2xs tracking-[0.3em] uppercase text-shell-400 mb-7 flex items-center gap-4">
        <span className="w-12 h-px bg-shell-400/50" />
        Olympus Foundation · The Tithe · 7% Always
        <span className="w-12 h-px bg-shell-400/50" />
      </div>

      <h1 className="font-semibold tracking-tight leading-[1.1] max-w-[900px] text-4xl sm:text-6xl md:text-7xl mb-6">
        Every Shell. Every Turn.
        <br />
        <span className="text-shell-400">For the World.</span>
      </h1>

      <p className="text-base sm:text-lg text-text-muted font-light max-w-[620px] mb-10 leading-relaxed">
        Before you ever see a price, you choose a cause. Seven percent of everything flows there —
        automatically, permanently, from the first dollar forward.
      </p>

      <DevelopmentBanner />
    </section>
  );
}

/**
 * The honesty beat. We are building this. We have not taken a dollar.
 * We will not take a dollar until every claim on this page is real.
 */
function DevelopmentBanner() {
  return (
    <aside className="max-w-[780px] mx-auto rounded-r-md border-l-[3px] border-amber-500 border-y border-r border-amber-500/20 bg-amber-500/[0.06] p-6 text-left flex items-start gap-4">
      <div className="text-2xs uppercase tracking-[0.2em] text-amber-400 font-semibold shrink-0 pt-0.5">
        ⧗ In Development
      </div>
      <p className="text-sm text-amber-300/85 font-light leading-loose">
        The Olympus Foundation and its tithe distribution program are{' '}
        <strong className="text-amber-400 font-medium">under active design and development</strong>.
        We will not accept a dollar from a user until the system is operationally ready and every
        commitment on this page is fully honored.{' '}
        <strong className="text-amber-400 font-medium">
          We ask for your faith and your grace
        </strong>{' '}
        as we build this the right way.
      </p>
    </aside>
  );
}

/* ================================================================ */
/* HOW THE TITHE WORKS                                                */
/* ================================================================ */
function HowTheTitheWorks() {
  const steps = [
    {
      numeral: 'I',
      title: 'You Choose',
      body:
        'Before pricing, you select your cause. Your 7% flows there for as long as you use TurtleShell.ai. This choice lives on your identity forever.',
    },
    {
      numeral: 'II',
      title: 'You Use',
      body:
        'Every Sea Shell spent — every chat turn, every tool call, every creative act — accumulates giving. The meter runs with you.',
    },
    {
      numeral: 'III',
      title: '7% Flows',
      body:
        'Seven percent of every transaction routes automatically to the Olympus Foundation. No override. No opt-out. No exceptions.',
    },
    {
      numeral: 'IV',
      title: 'World Wins',
      body:
        'The Foundation distributes to verified 501(c) partners. As users scale, the multiplier reaches global impact — together.',
    },
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-16 pt-16 pb-20">
      <Divider />
      <SectionHeader
        eyebrow="The Mechanics"
        title="How the Tithe Works"
        sub="Transparent by design. Automatic by architecture. Permanent by intention."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mt-10">
        {steps.map((s) => (
          <div key={s.numeral} className="flex flex-col items-center text-center px-2">
            <div className="w-14 h-14 rounded-full border border-shell-400 bg-surface-0 flex items-center justify-center font-mono font-bold text-lg text-shell-400 mb-5">
              {s.numeral}
            </div>
            <div className="text-sm font-semibold uppercase tracking-[0.12em] text-text-primary mb-2">
              {s.title}
            </div>
            <p className="text-sm text-text-muted font-light leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center gap-10 md:gap-16 flex-wrap mt-14">
        <Stat big="7%" label="Permanent Tithe" />
        <Stat big="501(c)" label="Partners Only" amber />
        <Stat big="7" label="Pillars to Choose" />
        <Stat big="∞" label="Multiplier at Scale" amber />
      </div>
    </section>
  );
}

/* ================================================================ */
/* CAUSES GRID                                                        */
/* ================================================================ */
function CausesGrid() {
  return (
    <section className="bg-surface-1 border-y border-border-muted">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 py-20">
        <SectionHeader
          eyebrow="The Seven Causes"
          title={
            <>
              Choose Your Cause.
              <br />
              Change the World.
            </>
          }
          sub="At signup, before you see pricing, you pick one of seven. Your 7% flows there for as long as you use TurtleShell.ai."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {CAUSES.map((cause) => (
            <article
              key={cause.slug}
              className="group relative overflow-hidden rounded-xl border border-border-muted bg-surface-0/80 p-8 transition-all hover:-translate-y-1 hover:border-shell-500/40"
            >
              <div className="w-16 h-16 mx-auto mb-5 rounded-full border border-border-muted bg-surface-1 flex items-center justify-center text-2xl">
                {cause.emoji}
              </div>
              <h3 className="text-center text-sm font-semibold uppercase tracking-[0.1em] text-text-primary mb-3">
                {cause.name}
              </h3>
              <p className="text-sm text-text-muted font-light leading-loose text-center mb-5">
                {cause.landingDesc}
              </p>
              <div className="flex justify-center">
                <span className="inline-block text-2xs uppercase tracking-[0.15em] text-shell-400 bg-shell-500/[0.08] border border-shell-500/25 rounded px-3 py-1 font-medium">
                  {cause.pledge.replace(/^"|"$/g, '')}
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================ */
/* SHELL FLOW                                                         */
/* ================================================================ */
function ShellFlow() {
  const rows: Array<{ icon: string; name: string; sub: string; pct: string; amber?: boolean }> = [
    {
      icon: '🐚',
      name: 'You spend Sea Shells',
      sub: 'Every Athena turn, tool call, asset generated',
      pct: '100%',
    },
    {
      icon: '💎',
      name: 'Platform operations',
      sub: 'Infrastructure, compute, agents, support',
      pct: '93%',
    },
    {
      icon: '🏛',
      name: 'Olympus Foundation tithe',
      sub: 'Routed to your chosen 501(c) partner',
      pct: '7%',
      amber: true,
    },
    {
      icon: '🌍',
      name: 'Distributed to cause partners',
      sub: 'Verified impact, published transparently',
      pct: '∞',
    },
  ];

  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-16 py-20">
      <SectionHeader
        eyebrow="Sea Shells → Global Good"
        title={
          <>
            How Shells Flow
            <br />
            Into the World
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center mt-10">
        <div className="rounded-xl border border-border-muted bg-surface-1/80 p-6">
          {rows.map((r, i) => (
            <div key={r.name}>
              <div className="flex items-center gap-4 py-4 border-b border-border-muted/40 last:border-b-0">
                <div className="w-10 h-10 shrink-0 rounded-full border border-border-muted bg-surface-0 flex items-center justify-center text-base">
                  {r.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary">{r.name}</div>
                  <div className="text-2xs text-text-muted font-light mt-0.5">{r.sub}</div>
                </div>
                <div
                  className={`font-mono font-bold text-base shrink-0 ${
                    r.amber ? 'text-amber-400' : 'text-shell-400'
                  }`}
                >
                  {r.pct}
                </div>
              </div>
              {i < rows.length - 1 && (
                <div className="text-center text-shell-400/40 text-lg leading-none select-none">
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight mb-4">
            The Multiplier Effect
          </h3>
          <p className="text-text-muted font-light leading-loose mb-4">
            One user spending Sea Shells generates modest good. Ten thousand users spending Sea
            Shells generates a meaningful charitable fund. One million users{' '}
            <strong className="text-text-primary font-medium">
              changes the economics of global impact permanently
            </strong>
            .
          </p>
          <p className="text-text-muted font-light leading-loose mb-4">
            The more the platform grows, the faster{' '}
            <strong className="text-text-primary font-medium">
              Athena helps monetize toward global prosperity
            </strong>
            . This is not a donation program bolted on top of a product. The giving is{' '}
            <strong className="text-text-primary font-medium">
              baked into the architecture
            </strong>{' '}
            — at the ledger level, before profit.
          </p>
          <p className="text-text-muted font-light leading-loose mb-6">
            We will show you the impact. Projects funded. Wells drilled. Reefs restored. Devices
            deployed.{' '}
            <strong className="text-text-primary font-medium">
              Your ShellsGiven counter never resets.
            </strong>
          </p>
          <Link
            to="/login?source=causes_shell_flow"
            className="inline-block px-7 py-3 bg-shell-500 text-surface-0 text-sm font-semibold tracking-[0.08em] uppercase hover:opacity-90 hover:-translate-y-px transition-all rounded no-underline"
          >
            Join the Waitlist
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================================================================ */
/* OLYMPUS FOUNDATION                                                 */
/* ================================================================ */
function OlympusFoundation() {
  return (
    <section className="bg-surface-1 border-y border-border-muted">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 py-20">
        <SectionHeader
          eyebrow="Olympus Foundation"
          eyebrowColor="amber"
          title="The Steward of the Tithe"
          sub="The Olympus Foundation is the independent body responsible for managing, distributing, and publishing all tithe activity. Built on the same principles of sovereignty and transparency that define the platform."
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
          <FoundationCard title="What the Foundation Does">
            <p>
              The Olympus Foundation holds, manages, and distributes all tithe funds collected by
              TurtleShell.ai and Olympus-Grid. It operates independently, with full transparency
              requirements and published reporting.
            </p>
            <FoundationList
              items={[
                'Manages all tithe fund collection and custody',
                'Vets and certifies 501(c) charity partners',
                'Distributes funds to verified cause partners',
                'Publishes impact reports and fund flows publicly',
                'Manages the charity partner ecosystem and applications',
                'Integrates with Olympus-616 for real-time transparency',
              ]}
            />
          </FoundationCard>

          <FoundationCard title="Partner Standards">
            <p>
              <strong className="text-text-primary font-medium">
                All tithe recipients must be verified 501(c) organizations.
              </strong>{' '}
              The Foundation applies rigorous criteria before any charity joins the partner program.
            </p>
            <FoundationList
              items={[
                'Active 501(c) status — no exceptions',
                'Alignment with one of the seven core causes',
                'Impact reporting and fund-use transparency',
                'Ability to receive and account for distributed funds',
                'Commitment to co-publish impact data with the Foundation',
              ]}
            />
            <p className="mt-5">
              We are actively building the partner program.{' '}
              <strong className="text-text-primary font-medium">
                If your organization meets these standards
              </strong>
              , we want to hear from you. See below.
            </p>
          </FoundationCard>
        </div>
      </div>
    </section>
  );
}

function FoundationCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-amber-500/20 bg-surface-0/80 p-8">
      <h3 className="text-lg font-semibold text-amber-400 tracking-wide mb-4">{title}</h3>
      <div className="text-sm text-text-muted font-light leading-loose space-y-4">{children}</div>
    </div>
  );
}

function FoundationList({ items }: { items: string[] }) {
  return (
    <ul className="mt-2">
      {items.map((item) => (
        <li
          key={item}
          className="flex items-start gap-2 py-2 border-b border-border-muted/40 last:border-b-0 text-sm text-text-muted font-light"
        >
          <span className="text-amber-400 shrink-0 leading-6">—</span>
          <span className="leading-6">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ================================================================ */
/* TRANSPARENCY                                                       */
/* ================================================================ */
function Transparency() {
  return (
    <section className="max-w-[1200px] mx-auto px-6 md:px-16 py-20">
      <SectionHeader
        eyebrow="Full Transparency"
        title="You Will See Everything"
        sub="The tithe is not a marketing claim. It is a system. And systems can be audited."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
        <TransCard
          title="Your ShellsGiven Counter"
          body="Every user has a permanent, cumulative ShellsGiven counter. It shows every shell that has ever flowed toward your cause — from your first turn through your last."
        />
        <TransCard
          title="Foundation Reports"
          body="The Olympus Foundation publishes fund flow reports — total collected, total distributed, by cause, by partner, by period. No black boxes."
        />
        <TransCard
          title="Partner Impact Data"
          body="Charity partners co-publish impact data — wells drilled, reefs restored, devices deployed. We will show you what your shells built."
        />
      </div>

      <p className="text-center max-w-[620px] mx-auto mt-12 mb-6 text-text-muted font-light leading-loose text-sm">
        We encourage every user to join the Olympus Foundation community to help refine the
        program, the partner selection criteria, and the future of this ecosystem. This is being
        built with you, not for you.
      </p>
      <div className="flex justify-center">
        <Link
          to="/login?source=causes_community"
          className="inline-block px-7 py-3 border border-amber-500/30 text-amber-400 text-sm font-semibold tracking-[0.08em] uppercase hover:bg-amber-500/10 transition-colors rounded no-underline"
        >
          Join the Olympus Foundation Community
        </Link>
      </div>
    </section>
  );
}

function TransCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-border-muted bg-surface-1/70 p-6">
      <h4 className="text-sm font-semibold uppercase tracking-[0.12em] text-shell-400 mb-3">
        {title}
      </h4>
      <p className="text-sm text-text-muted font-light leading-loose">{body}</p>
    </div>
  );
}

/* ================================================================ */
/* PARTNERS — Coming Soon                                             */
/* ================================================================ */
/**
 * The PM brief had a full 501(c) partner application form here. We
 * don't have the backend to accept structured applications yet, so
 * rather than shipping a form that silently swallows submissions
 * (anti-honesty), this is a stated "Coming Soon" beat with an email
 * expression of interest. When the Foundation backend goes live, this
 * section becomes the real form.
 */
function PartnersComingSoon() {
  return (
    <section className="bg-surface-1 border-y border-border-muted">
      <div className="max-w-[900px] mx-auto px-6 md:px-16 py-20 text-center">
        <SectionHeader
          eyebrow="Charity Partners"
          eyebrowColor="amber"
          title="Become a Partner"
          sub="If your 501(c) organization aligns with one of our seven causes, we want to build with you. The formal partner application program opens closer to launch."
        />

        <div className="rounded-xl border border-amber-500/25 bg-surface-0/80 p-8 md:p-10 mt-8 text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-6">
            <div>
              <div className="text-2xs uppercase tracking-[0.2em] text-amber-400 mb-2 font-semibold">
                ⧗ Partner Applications · Coming Soon
              </div>
              <h3 className="text-xl font-semibold text-text-primary">
                Express your interest today
              </h3>
            </div>
            <a
              href="mailto:foundation@turtleshell.ai?subject=Olympus%20Foundation%20Partner%20Interest"
              className="shrink-0 inline-flex items-center justify-center px-6 py-3 bg-shell-500 text-surface-0 text-xs font-semibold tracking-[0.08em] uppercase hover:opacity-90 transition-opacity rounded no-underline"
            >
              Email the Foundation
            </a>
          </div>
          <p className="text-sm text-text-muted font-light leading-loose mb-4">
            We are building the partner intake system alongside the Foundation itself — structured
            applications, due diligence, onboarding, reporting. None of it exists yet. Rather than
            ship a form that pretends it does, we ask qualifying 501(c) organizations to reach out
            directly.
          </p>
          <p className="text-sm text-text-muted font-light leading-loose mb-4">
            Include your organization name, 501(c) type, the cause you align with, your website,
            and a short description of your work. We will respond personally and add your
            organization to the review queue for the formal program launch.
          </p>
          <p className="text-2xs text-amber-400/85 font-light leading-loose mt-5 pt-5 border-t border-border-muted/50">
            <strong className="text-amber-400 font-medium">Note:</strong> No funds are distributed
            until the Foundation is fully certified and live. Partner review happens in advance of{' '}
            {LAUNCH_DATE_DISPLAY} so selected partners are ready to receive on day one.
          </p>
        </div>
      </div>
    </section>
  );
}

/* ================================================================ */
/* FINAL CTA                                                          */
/* ================================================================ */
function FinalCTA() {
  return (
    <section className="relative">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 py-24 text-center">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          {LAUNCH_DATE_DISPLAY} · The Grid Comes Online
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight leading-tight mb-5">
          Be Here When
          <br />
          <span className="text-shell-400">It Matters Most.</span>
        </h2>
        <p className="text-base text-text-muted font-light max-w-[540px] mx-auto mb-10 leading-loose">
          The tithe only works at scale. The sooner you join, the sooner your shells start flowing
          toward something real. Every user is a multiplier.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            to="/login?source=causes_final"
            className="inline-block px-8 py-3.5 bg-shell-500 text-surface-0 text-sm font-semibold tracking-[0.08em] uppercase hover:opacity-90 hover:-translate-y-px transition-all rounded no-underline"
          >
            Join the Waitlist
          </Link>
          <Link
            to="/#pricing"
            className="inline-block px-8 py-3.5 border border-border text-text-primary text-sm font-medium tracking-[0.08em] uppercase hover:border-shell-500 hover:text-shell-400 transition-colors rounded no-underline"
          >
            View Plans
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ================================================================ */
/* Shared                                                             */
/* ================================================================ */
function SectionHeader({
  eyebrow,
  title,
  sub,
  eyebrowColor = 'shell',
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  eyebrowColor?: 'shell' | 'amber';
}) {
  return (
    <div className="text-center max-w-[680px] mx-auto">
      <div
        className={`text-2xs uppercase tracking-[0.3em] mb-3 ${
          eyebrowColor === 'amber' ? 'text-amber-400' : 'text-shell-400'
        }`}
      >
        {eyebrow}
      </div>
      <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
        {title}
      </h2>
      {sub && <p className="text-base text-text-muted font-light leading-loose">{sub}</p>}
    </div>
  );
}

function Stat({ big, label, amber = false }: { big: string; label: string; amber?: boolean }) {
  return (
    <div className="text-center">
      <div
        className={`font-mono font-bold text-4xl leading-none ${
          amber ? 'text-amber-400' : 'text-shell-400'
        }`}
      >
        {big}
      </div>
      <div className="text-2xs uppercase tracking-[0.15em] text-text-muted mt-2">{label}</div>
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-6 mb-12">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border-muted to-transparent" />
      <span className="text-amber-400/70 text-base">⬡</span>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border-muted to-transparent" />
    </div>
  );
}
