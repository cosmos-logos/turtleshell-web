import { useState } from 'react';
import { Plug, ExternalLink, Trash2, Plus } from 'lucide-react';
import { useServiceStore } from '@/lib/store/service-store';
import { SERVICE_CATALOG } from '@/types/service';
import { OlympusGridConnect } from '@/components/services/OlympusGridConnect';

export function Services() {
  const { services, remove } = useServiceStore();
  const connectedServices = Object.values(services);
  const connectedProviders = new Set(connectedServices.map((s) => s.provider));
  const [olympusGridModalOpen, setOlympusGridModalOpen] = useState(false);
  const catalogServices = SERVICE_CATALOG.filter((s) => !connectedProviders.has(s.provider));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Services</h1>
          <p className="text-sm text-text-muted mt-1">
            Connect enterprise services to enable MCP-powered AI workflows.
          </p>
        </div>

        {/* Connected Services */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Connected
          </h2>

          {connectedServices.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-8 text-center">
              <Plug size={24} className="mx-auto mb-3 text-text-muted" />
              <p className="text-sm text-text-muted">
                No services connected yet. Add one below to get started.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {connectedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-border transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-lg">
                      {SERVICE_CATALOG.find((s) => s.provider === service.provider)?.icon ?? '🔗'}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">
                        {service.displayName}
                      </div>
                      <div className="text-2xs text-text-muted">
                        {service.provider} · {service.category}
                        {service.environment && ` · ${service.environment}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-shell-500/10 rounded-full">
                      <div className="w-1.5 h-1.5 rounded-full bg-shell-400" />
                      <span className="text-2xs font-medium text-shell-400">Active</span>
                    </div>
                    <button
                      onClick={() => remove(service.id)}
                      className="p-1.5 rounded-md hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Service Catalog */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
            Available Services
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {catalogServices.map((service) => (
              <div
                key={`${service.category}-${service.provider}`}
                className="p-4 bg-surface-1 border border-border-muted rounded-xl hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-surface-3 rounded-lg flex items-center justify-center text-lg">
                    {service.icon}
                  </div>
                  {service.status === 'coming_soon' && (
                    <span className="text-2xs font-medium px-2 py-0.5 bg-surface-3 text-text-muted rounded-full">
                      Coming Soon
                    </span>
                  )}
                </div>
                <h3 className="text-sm font-semibold mb-1">{service.label}</h3>
                <p className="text-2xs text-text-muted mb-3 leading-relaxed">
                  {service.description}
                </p>
                <button
                  disabled={service.status !== 'available'}
                  onClick={() => {
                    if (service.provider === 'olympus-grid') {
                      setOlympusGridModalOpen(true);
                    }
                  }}
                  className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    service.status === 'available'
                      ? 'bg-shell-500/10 text-shell-400 hover:bg-shell-500/20'
                      : 'bg-surface-3 text-text-muted cursor-not-allowed'
                  }`}
                >
                  {service.status === 'available' ? (
                    <>
                      <Plus size={14} /> Connect
                    </>
                  ) : (
                    <>
                      <ExternalLink size={14} /> Notify Me
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <OlympusGridConnect
        open={olympusGridModalOpen}
        onOpenChange={setOlympusGridModalOpen}
      />
    </div>
  );
}
