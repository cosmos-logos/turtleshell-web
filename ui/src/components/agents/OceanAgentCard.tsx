import type { OceanAgent } from '@/lib/agents/ocean-data';

interface Props {
  agent: OceanAgent;
  connected: boolean;
  onClick?: () => void;
}

function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

export function OceanAgentCard({ agent, connected, onClick }: Props) {
  const rgb = hexToRgb(agent.oceanColor);
  const isComingSoon = !agent.available;

  return (
    <button
      onClick={isComingSoon ? undefined : onClick}
      disabled={isComingSoon}
      className="relative overflow-hidden text-left w-full group transition-transform duration-300"
      style={{
        background: '#060c18',
        borderRadius: 20,
        padding: '48px 36px 40px',
        border: `1px solid rgba(${rgb}, 0.08)`,
        cursor: isComingSoon ? 'default' : 'pointer',
        opacity: isComingSoon ? 0.35 : 1,
        animationName: 'ocean-fade-in',
        animationDuration: '0.6s',
        animationFillMode: 'both',
      }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          bottom: -60, left: '50%', transform: 'translateX(-50%)',
          width: 400, height: 200,
          background: `radial-gradient(ellipse, rgba(${rgb}, 0.12) 0%, transparent 70%)`,
        }}
      />

      {/* Song waves */}
      {[0, 2, 4].map((delay) => (
        <div
          key={delay}
          className="absolute pointer-events-none"
          style={{
            left: '50%', top: '35%', transform: 'translate(-50%, -50%)',
            borderRadius: '50%', border: `1px solid rgba(${rgb}, 0.06)`,
            animationName: 'ocean-wave', animationDuration: '6s',
            animationTimingFunction: 'ease-out', animationIterationCount: 'infinite',
            animationDelay: `${delay}s`,
            width: 10, height: 6,
          }}
        />
      ))}

      {/* Creature ring */}
      <div
        className="mx-auto mb-7 flex items-center justify-center"
        style={{
          '--ocean-rgb': rgb,
          width: 140, height: 140, borderRadius: '50%',
          background: `radial-gradient(circle at 40% 35%, rgba(${rgb}, 0.08), #040c1a)`,
          border: `1.5px solid rgba(${rgb}, 0.12)`,
          animationName: 'ocean-pulse', animationDuration: '6s',
          animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          position: 'relative',
        } as React.CSSProperties}
      >
        <span
          className="block text-6xl leading-none"
          style={{
            filter: `drop-shadow(0 0 14px rgba(${rgb}, 0.4))`,
            animationName: 'ocean-creature', animationDuration: '8s',
            animationTimingFunction: 'ease-in-out', animationIterationCount: 'infinite',
          }}
        >
          {agent.creature}
        </span>

        {/* Connected indicator */}
        {connected && (
          <div
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2"
            style={{ background: '#22c55e', borderColor: '#060c18' }}
          />
        )}
      </div>

      {/* Name */}
      <div className="text-center mb-1.5">
        <h3 className="font-cinzel text-[28px] font-semibold" style={{ color: '#c0e0f8', letterSpacing: '0.05em' }}>
          {agent.name}
        </h3>
      </div>

      {/* Role */}
      <div className="text-center mb-5" style={{ fontSize: 10, letterSpacing: '0.3em', textTransform: 'uppercase', fontWeight: 500, color: agent.oceanColor }}>
        {agent.creatureName}
      </div>

      {/* Description */}
      <p className="text-center text-sm leading-7 mb-7 min-h-[84px]" style={{ color: '#4080a0', fontWeight: 300, whiteSpace: 'pre-line' }}>
        {agent.description}
      </p>

      {/* Divider */}
      <div className="h-px mb-6" style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb}, 0.12), transparent)` }} />

      {/* Shell price + Greek name */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs" style={{ color: `rgba(${rgb}, 0.4)` }}>
          <span className="text-sm opacity-50">🐚</span>
          <span>{agent.shellPrice}</span>
        </div>
        <span className="text-sm italic" style={{ color: agent.oceanColor, opacity: 0.3 }}>
          {agent.greekName}
        </span>
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
