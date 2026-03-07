type LogCategory =
  | 'init'
  | 'auth'
  | 'request'
  | 'response'
  | 'success'
  | 'error'
  | 'warning'
  | 'service'
  | 'delete'
  | 'store';

const CATEGORY_ICONS: Record<LogCategory, string> = {
  init: '🔧',
  auth: '🔑',
  request: '📤',
  response: '📥',
  success: '✅',
  error: '❌',
  warning: '⚠️',
  service: '⭐',
  delete: '🗑️',
  store: '🪙',
};

const PREFIX = '🐢 [TurtleShell.ai]';

export function log(category: LogCategory, message: string, data?: unknown) {
  const icon = CATEGORY_ICONS[category];
  if (data !== undefined) {
    console.log(`${PREFIX} ${icon} ${message}`, data);
  } else {
    console.log(`${PREFIX} ${icon} ${message}`);
  }
}

export function logError(message: string, error?: unknown) {
  console.error(`${PREFIX} ❌ ${message}`, error);
}
