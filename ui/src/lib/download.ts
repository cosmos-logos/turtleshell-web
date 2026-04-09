export const DOWNLOAD = {
  version: '1.7.4',
  url: 'https://github.com/cosmos-logos/turtleshell-offgrid/releases/latest/download/TurtleShell.pkg',
  filename: 'TurtleShell.pkg',
  platform: 'macOS',
  requirements: 'macOS 13+ · Apple Silicon & Intel',
  tagline: 'Free to install · Bring your own API keys',
  checksumUrl: 'https://github.com/cosmos-logos/turtleshell-offgrid/releases/latest/download/TurtleShell.pkg.sha256',
  releasesUrl: 'https://github.com/cosmos-logos/turtleshell-offgrid/releases',
} as const

export function isMac(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    navigator.platform.toUpperCase().includes('MAC') ||
    navigator.userAgent.includes('Macintosh')
  )
}
