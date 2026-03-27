export const DOWNLOAD = {
  version: '1.7.0',
  url: '/download/TurtleShell-1.7.0.pkg',
  filename: 'TurtleShell-1.7.0.pkg',
  platform: 'macOS',
  requirements: 'macOS 13+ · Apple Silicon & Intel',
  tagline: 'Free to install · Bring your own API keys',
  checksumUrl: '/download/TurtleShell-1.7.0.pkg.sha256',
} as const

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    navigator.platform.toUpperCase().includes('MAC') ||
    navigator.userAgent.includes('Macintosh')
  )
}
