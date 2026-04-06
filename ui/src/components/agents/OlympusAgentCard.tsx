import type { OlympusAgent } from '@/lib/agents/olympus-data';

interface Props {
  agent: OlympusAgent;
  connected: boolean;
  onClick?: () => void;
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

export function OlympusAgentCard({ agent, connected, onClick }: Props) {
  const rgb = hexToRgb(agent.godColor);
  const accentRgb = hexToRgb(agent.accentColor);
  const isComingSoon = !agent.available;

  return (
    <button
      onClick={isComingSoon ? undefined : onClick}
      disabled={isComingSoon}
      className="relative overflow-hidden text-left w-full group transition-transform duration-300"
      style={{
        background: '#070d1c',
        borderRadius: 20,
        padding: '48px 36px 40px',
        border: `1px solid rgba(${rgb}, 0.1)`,
        cursor: isComingSoon ? 'default' : 'pointer',
        opacity: isComingSoon ? 0.35 : 1,
        animationName: 'ocean-fade-in',
        animationDuration: '0.6s',
        animationFillMode: 'both',
      }}
    >
      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(90deg, rgba(${rgb}, 0.02) 1px, transparent 1px), linear-gradient(0deg, rgba(${rgb}, 0.02) 1px, transparent 1px)`,
          backgroundSize: '32px 32px',
        }}
      />

      {/* Corner glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: -80, right: -80, width: 320, height: 320,
          background: `radial-gradient(circle, rgba(${rgb}, 0.08) 0%, transparent 70%)`,
        }}
      />

      {/* God ring */}
      <div
        className="mx-auto mb-7 flex items-center justify-center relative"
        style={{
          '--ocean-rgb': rgb,
          width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle at 40% 35%, rgba(${rgb}, 0.12), #0a0a1a)`,
          border: `1.5px solid rgba(${rgb}, 0.25)`,
          animationName: 'ocean-pulse', animationDuration: '4s',
          animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
        } as React.CSSProperties}
      >
        <span
          className="block text-6xl leading-none"
          style={{
            filter: `drop-shadow(0 0 14px rgba(${rgb}, 0.4))`,
            animationName: 'ocean-creature', animationDuration: '5s',
            animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          }}
        >
          {agent.godEmoji}
        </span>

        {connected && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2"
            style={{ background: '#22c55e', borderColor: '#070d1c' }}
          />
        )}
      </div>

      {/* Name */}
      <div className="text-center mb-1.5">
        <h3 className="font-cinzel text-[28px] font-bold" style={{ color: '#d0e8ff', letterSpacing: '0.05em' }}>
          {agent.name}
        </h3>
      </div>

      {/* Capability tags */}
      <div className="flex gap-1.5 justify-center flex-wrap mb-4">
        {agent.capabilities.map((cap: string) => (
          <span
            key={cap}
            className="text-[9px] tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full font-medium"
            style={{
              background: `rgba(${rgb}, 0.1)`,
              border: `1px solid rgba(${rgb}, 0.2)`,
              color: `rgba(${accentRgb}, 0.7)`,
            }}
          >
            {cap}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-center text-sm leading-7 mb-7 min-h-[84px]" style={{ color: '#5080b0', fontWeight: 300, whiteSpace: 'pre-line' }}>
        {agent.description}
      </p>

      {/* Divider */}
      <div className="h-px mb-6" style={{ background: `linear-gradient(90deg, transparent, rgba(${accentRgb}, 0.15), transparent)` }} />

      {/* Shell price + Greek name + tool count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: `rgba(${rgb}, 0.5)` }}>
          <span className="text-sm opacity-50">🐚</span>
          <span>{agent.shellPrice}</span>
        </div>
        <div className="flex items-center gap-3">
          {agent.toolCount && (
            <span className="text-[9px] tracking-[0.15em] uppercase font-mono" style={{ color: `rgba(${rgb}, 0.4)` }}>
              {agent.toolCount}
            </span>
          )}
          <span className="font-cinzel text-[11px] tracking-[0.15em]" style={{ color: `rgba(${rgb}, 0.3)` }}>
            {agent.greekName}
          </span>
        </div>
      </div>

      {/* Coming Soon overlay */}
      {isComingSoon && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ borderRadius: 20 }}>
          <span className="font-cinzel text-xs tracking-[0.3em] uppercase" style={{ color: `rgba(${rgb}, 0.5)` }}>
            Coming Soon
          </span>
        </div>
      )}
    </button>
  );
}
