import { BookOpen, ExternalLink } from 'lucide-react';

const DOC_SECTIONS = [
  {
    title: 'Getting Started',
    description: 'Learn the basics of TurtleShell.ai and set up your first service connection.',
    icon: '🚀',
    href: '#',
  },
  {
    title: 'Service Registry',
    description: 'How to connect, manage, and configure enterprise services.',
    icon: '🔗',
    href: '#',
  },
  {
    title: 'MCP Protocol',
    description: 'Understanding the Model Context Protocol and how Athena uses it.',
    icon: '🛡️',
    href: '#',
  },
  {
    title: 'Agent System',
    description: 'Creating and configuring specialized AI agents.',
    icon: '🤖',
    href: '#',
  },
  {
    title: 'OAuth & Security',
    description: 'Authentication flows, credential storage, and security architecture.',
    icon: '🔐',
    href: '#',
  },
  {
    title: 'API Reference',
    description: 'Athena LLM API endpoints, request/response formats, and SSE streaming.',
    icon: '📡',
    href: '#',
  },
];

export function Docs() {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documentation</h1>
          <p className="text-sm text-text-muted mt-1">
            Guides, references, and integration documentation.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DOC_SECTIONS.map((doc) => (
            <a
              key={doc.title}
              href={doc.href}
              className="p-5 bg-surface-1 border border-border-muted rounded-xl hover:border-border hover:bg-surface-2 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{doc.icon}</span>
                <ExternalLink
                  size={14}
                  className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity"
                />
              </div>
              <h3 className="text-sm font-semibold mb-1">{doc.title}</h3>
              <p className="text-2xs text-text-muted leading-relaxed">
                {doc.description}
              </p>
            </a>
          ))}
        </div>

        <div className="p-4 bg-surface-2 border border-border-muted rounded-xl text-center">
          <BookOpen size={20} className="mx-auto mb-2 text-text-muted" />
          <p className="text-sm text-text-muted">
            Full documentation is being built. Check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}
