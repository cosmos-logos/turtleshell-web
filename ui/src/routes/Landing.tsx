import { Link } from 'react-router-dom';
import { CountdownTimer } from '@/components/marketing/CountdownTimer';
import { TitheBand } from '@/components/marketing/TitheBand';
import { PricingGrid } from '@/components/marketing/PricingGrid';
import { OlympusGridBlock } from '@/components/marketing/OlympusGridBlock';
import { PillarsGrid } from '@/components/marketing/PillarsGrid';
import { OffGridDevices } from '@/components/marketing/OffGridDevices';
import { LAUNCH_DATE_DISPLAY } from '@/lib/launchDate';

/**
 * Public landing page.
 *
 * Narrative flow (top → bottom):
 *   1. Hero — thesis headline + countdown to Olympus-616 launch
 *   2. Mission — the thesis + hypothesis + manifesto quote
 *   3. Tithe — 7% band (dark surface)
 *   4. Pricing — 6-tier grid pulled from lib/tiers.ts
 *   5. Olympus-Grid — Salesforce AppExchange (dark surface)
 *   6. Pillars — 7 global-prosperity themes
 *   7. Off-Grid — Turtle Cave appliance family
 *   8. Final CTA — "The Kingdom Unburnable Rises"
 *
 * Styling:
 *   Content and emotional beats come from the PM's design doc
 *   (`turtleshell-landing.html`). Styling uses the app's existing
 *   Tailwind token system (shell-*, amber-*, surface-*, text-*) rather
 *   than the design's raw CSS variables — "wrong styling, right
 *   content" per product direction.
 *
 * Every CTA routes through /login (waitlist) with ?source=<slot>
 * attribution so we can measure which narrative beat converts.
 */
export function Landing() {
  return (
    <div className="relative">
      <Hero />
      <Mission />
      <TitheBand />
      <Pricing />
      <OlympusGridBlock />
      <PillarsGrid />
      <OffGridDevices />
      <FinalCTA />
    </div>
  );
}

/* ================================================================ */
/* HERO                                                              */
/* ================================================================ */
function Hero() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center text-center px-6 pt-16 pb-16">
      <div className="landing-fade landing-fade-1 flex flex-col items-center mb-8">
        <img src="/assets/turtleshell-logo.png" alt="TurtleShell" className="w-28 sm:w-36 mb-4" />
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary">
          TurtleShell<span className="text-shell-400">.ai</span><sup className="text-[0.5em] text-shell-400 align-super ml-0.5">™</sup>
        </h2>
        <p className="text-xs tracking-[0.3em] uppercase text-shell-400 mt-2">
          Sovereign AI
        </p>
      </div>

      <div className="landing-fade landing-fade-1 text-2xs tracking-[0.3em] uppercase text-shell-400 mb-7 flex items-center gap-4">
        <span className="w-12 h-px bg-shell-400/50" />
        Olympus-616 · Athena-717 · 7/17/2026
        <span className="w-12 h-px bg-shell-400/50" />
      </div>

      <h1 className="landing-fade landing-fade-2 font-semibold tracking-tight leading-[1.1] max-w-[900px] text-4xl sm:text-6xl md:text-7xl mb-6">
        <span className="text-shell-400">Free AI</span> to the World.
        <br />
        <span className="text-amber-400">Sovereign.</span> Off-Grid.
        <br />
        Powered by the Sun.
      </h1>

      <p className="landing-fade landing-fade-3 text-base sm:text-lg text-text-muted font-light max-w-[560px] mb-10 leading-relaxed">
        TurtleShell.ai is the globally sustainable, off-grid capable, enterprise-certified sovereign
        AI system. Your data. Your device. Your grid.
      </p>

      <div className="landing-fade landing-fade-4 flex gap-3 flex-wrap justify-center mb-14">
        <Link
          to="/login?source=hero"
          className="inline-block px-8 py-3.5 bg-shell-500 text-surface-0 text-sm font-semibold tracking-[0.08em] uppercase hover:opacity-90 hover:-translate-y-px transition-all rounded no-underline"
        >
          Join the Waitlist
        </Link>
        <a
          href="#mission"
          className="inline-block px-8 py-3.5 border border-border text-text-primary text-sm font-medium tracking-[0.08em] uppercase hover:border-shell-500 hover:text-shell-400 transition-colors rounded no-underline"
        >
          Read the Thesis
        </a>
      </div>

      <div className="landing-fade landing-fade-4 w-full">
        <CountdownTimer />
      </div>
      <p className="landing-fade landing-fade-4 text-xs text-text-muted tracking-[0.08em] mt-4">
        {LAUNCH_DATE_DISPLAY} · Select users go live ·{' '}
        <Link to="/login?source=hero_countdown" className="text-shell-400 hover:underline no-underline">
          Reserve your shell →
        </Link>
      </p>
    </section>
  );
}

/* ================================================================ */
/* MISSION (Thesis + Hypothesis + Manifesto)                         */
/* ================================================================ */
function Mission() {
  return (
    <section id="mission" className="max-w-[1200px] mx-auto px-6 md:px-16 pt-16 pb-24">
      <Divider />
      <div className="text-center max-w-[680px] mx-auto mb-16">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          The Thesis
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
          Free AI to the World.
          <br />
          In One Year or Less.
        </h2>
        <p className="text-base text-text-muted font-light">
          The hypothesis is simple. Technology is compacting. Power is expanding. We don't need
          data centers in space. We need everyone to go outside.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-amber-400 tracking-wide mb-2">
            The Hypothesis
          </h3>
          <p className="text-text-muted font-light leading-loose">
            As AI models compact into smaller and smaller solutions, and as hardware increases in
            exponential capability, we will arrive at a place where the most powerful AI in the
            universe runs from a device in your hand the size of an iPhone.
          </p>
          <p className="text-text-muted font-light leading-loose">
            We{' '}
            <strong className="text-text-primary font-medium">
              do not need data centers in space
            </strong>
            . We do not need data centers at all. We need everyone to step outside, deploy a
            TurtleShell device, and together build an AI on a global mesh — to make the world a
            better place, and to transform this Earth into the shared heaven we all deserve.
          </p>
          <p className="text-text-muted font-light leading-loose">
            Turtleshell.ai will prove that artificial intelligence is a{' '}
            <strong className="text-text-primary font-medium">commodity gift handed to us</strong>{' '}
            — not a toll to pay to those who would use debt, fear, and lack to contain our
            potential.
          </p>
        </div>

        <blockquote className="relative rounded-r-md border-l-[3px] border-amber-500 border-y border-r border-amber-500/20 bg-amber-500/[0.04] p-8">
          <p className="font-serif text-base sm:text-lg leading-loose text-text-primary/85 tracking-[0.02em]">
            "I will not stop until I have offered free, sustainable, safe, and virtuous Artificial
            Intelligence that runs from off-grid data centers powered by the sun.
            <br />
            <br />
            Turtleshell.ai's mission is simple: the globally sustainable, off-grid capable,
            enterprise-certified sovereign AI system that comes online to select users on{' '}
            {LAUNCH_DATE_DISPLAY}."
          </p>
        </blockquote>
      </div>
    </section>
  );
}

/* ================================================================ */
/* PRICING                                                            */
/* ================================================================ */
function Pricing() {
  return (
    <section id="pricing" className="max-w-[1200px] mx-auto px-6 md:px-16 py-24">
      <div className="text-center max-w-[680px] mx-auto mb-14">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          Plans &amp; Sea Shells
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight mb-4">
          A Free Gift to the World.
          <br />
          And a Very Cool Tool.
        </h2>
        <p className="text-base text-text-muted font-light">
          Every plan includes the 7% tithe to your chosen cause. Start free, forever. Scale when
          the ocean calls you deeper.
        </p>
      </div>
      <PricingGrid />
    </section>
  );
}

/* ================================================================ */
/* FINAL CTA                                                          */
/* ================================================================ */
function FinalCTA() {
  return (
    <section className="relative bg-surface-1 border-t border-border-muted">
      <div className="max-w-[1200px] mx-auto px-6 md:px-16 py-24 text-center">
        <div className="text-2xs uppercase tracking-[0.3em] text-shell-400 mb-3">
          7/17/2026
        </div>
        <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-tight mb-6">
          The Kingdom
          <br />
          <span className="text-shell-400">Unburnable</span> Rises.
        </h2>
        <p className="text-base text-text-muted font-light max-w-[500px] mx-auto mb-10 leading-loose">
          Select users go live {LAUNCH_DATE_DISPLAY}. Join the waitlist. Choose your cause. Take
          your place in the grid.
        </p>
        <div className="flex gap-3 justify-center flex-wrap mb-8">
          <Link
            to="/login?source=final_cta"
            className="inline-block px-8 py-3.5 bg-shell-500 text-surface-0 text-sm font-semibold tracking-[0.08em] uppercase hover:opacity-90 hover:-translate-y-px transition-all rounded no-underline"
          >
            Join the Waitlist
          </Link>
          <a
            href="#pricing"
            className="inline-block px-8 py-3.5 border border-border text-text-primary text-sm font-medium tracking-[0.08em] uppercase hover:border-shell-500 hover:text-shell-400 transition-colors rounded no-underline"
          >
            View Plans
          </a>
        </div>
        <CountdownTimer variant="compact" />
      </div>
    </section>
  );
}

/* ================================================================ */
/* Shared                                                             */
/* ================================================================ */
function Divider() {
  return (
    <div className="flex items-center gap-6 mb-12">
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border-muted to-transparent" />
      <span className="text-amber-400/70 text-base">⬡</span>
      <span className="flex-1 h-px bg-gradient-to-r from-transparent via-border-muted to-transparent" />
    </div>
  );
}
