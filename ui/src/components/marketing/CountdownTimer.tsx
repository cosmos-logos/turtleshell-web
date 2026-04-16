import { useEffect, useRef, useState } from 'react';
import { LAUNCH_DATE, LAUNCH_DATE_DISPLAY } from '@/lib/launchDate';

/**
 * Millisecond-precision countdown to the Olympus-616 launch. Uses
 * `requestAnimationFrame` so the ms readout streams smoothly without
 * hogging CPU. `IntersectionObserver` pauses the loop when the widget
 * is off-screen (battery hygiene on mobile). After the launch date
 * passes, renders a "Live now" state.
 *
 * Variant:
 *   - `hero` (default): large numbers, unit labels under, bordered tile
 *   - `compact`: slimmer inline version (footer CTA reuse)
 */
export function CountdownTimer({
  variant = 'hero',
}: {
  variant?: 'hero' | 'compact';
}) {
  const [parts, setParts] = useState(() => diffParts(LAUNCH_DATE));
  const rafRef = useRef<number | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const runningRef = useRef(true);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    // Pause the rAF loop when the countdown is scrolled off-screen so
    // we're not redrawing dozens of frames/sec on a hidden element.
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          runningRef.current = e.isIntersecting;
          if (e.isIntersecting && rafRef.current == null) {
            rafRef.current = requestAnimationFrame(tick);
          }
        }
      },
      { threshold: 0.01 },
    );
    io.observe(el);

    function tick() {
      rafRef.current = null;
      setParts(diffParts(LAUNCH_DATE));
      if (runningRef.current) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      io.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const live = parts.totalMs <= 0;

  if (live) {
    return (
      <div
        ref={rootRef}
        className={
          variant === 'hero'
            ? 'w-full max-w-[700px] mx-auto rounded-lg border border-shell-500/30 bg-shell-500/5 px-8 py-8 text-center'
            : 'inline-flex items-center gap-2 rounded border border-shell-500/30 bg-shell-500/5 px-3 py-1.5 text-xs'
        }
      >
        <div className="text-2xs uppercase tracking-[0.3em] text-amber-400 mb-3">
          Olympus-616 Is Live
        </div>
        <div className="text-shell-400 font-semibold">The ocean is open. ∿∿∿</div>
      </div>
    );
  }

  const { days, hours, minutes, seconds, ms } = parts;

  if (variant === 'compact') {
    return (
      <div
        ref={rootRef}
        className="inline-flex items-baseline gap-2 text-xs text-text-muted font-mono tabular-nums"
      >
        <span className="text-shell-400 font-semibold">
          {pad(days, 3)}d {pad(hours, 2)}h {pad(minutes, 2)}m {pad(seconds, 2)}s
        </span>
        <span className="text-text-muted/60">· {pad(ms, 3)}ms</span>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className="w-full max-w-[700px] mx-auto rounded-lg border border-shell-500/20 bg-shell-500/[0.04] px-6 py-6 text-center"
    >
      <div className="text-2xs uppercase tracking-[0.3em] text-amber-400 mb-4">
        Olympus-616 Comes Online
      </div>
      <div className="flex items-end gap-2 justify-center flex-wrap">
        <Block value={pad(days, 3)} unit="Days" />
        <Sep />
        <Block value={pad(hours, 2)} unit="Hours" />
        <Sep />
        <Block value={pad(minutes, 2)} unit="Min" />
        <Sep />
        <Block value={pad(seconds, 2)} unit="Sec" />
        <SepSoft />
        <Block value={pad(ms, 3)} unit="ms" soft />
      </div>
      <p className="text-2xs text-text-muted tracking-wider mt-4">
        {LAUNCH_DATE_DISPLAY} · Select users go live
      </p>
    </div>
  );
}

function Block({ value, unit, soft = false }: { value: string; unit: string; soft?: boolean }) {
  return (
    <div className="flex flex-col items-center min-w-[60px]">
      <div
        className={`font-mono font-bold tabular-nums leading-none ${
          soft ? 'text-shell-400/50 text-lg sm:text-xl' : 'text-shell-400 text-2xl sm:text-4xl'
        }`}
      >
        {value}
      </div>
      <div className="text-[0.6rem] uppercase tracking-[0.18em] text-text-muted mt-1.5 font-medium">
        {unit}
      </div>
    </div>
  );
}

function Sep() {
  return <div className="text-xl sm:text-2xl text-border pb-1 leading-none">:</div>;
}

function SepSoft() {
  return <div className="text-xl sm:text-2xl text-border/40 pb-1 leading-none">·</div>;
}

function pad(n: number, len: number) {
  return String(n).padStart(len, '0');
}

function diffParts(target: Date) {
  const now = Date.now();
  const totalMs = target.getTime() - now;
  if (totalMs <= 0) {
    return { totalMs: 0, days: 0, hours: 0, minutes: 0, seconds: 0, ms: 0 };
  }
  const days = Math.floor(totalMs / 86_400_000);
  const hours = Math.floor((totalMs % 86_400_000) / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const ms = totalMs % 1_000;
  return { totalMs, days, hours, minutes, seconds, ms };
}
