import type { CosmosLogosManifest } from '@/lib/cosmos-logos/types';
import cosmos from './cosmos.json';
import logos from './logos.json';
import openai from './openai.json';
import claude from './claude.json';
import grok from './grok.json';
import gemini from './gemini.json';

export const BUNDLED_MANIFESTS = {
  cosmos: cosmos as CosmosLogosManifest,
  logos: logos as CosmosLogosManifest,
  openai: openai as CosmosLogosManifest,
  claude: claude as CosmosLogosManifest,
  grok: grok as CosmosLogosManifest,
  gemini: gemini as CosmosLogosManifest,
} as const;

export type BundledManifestKey = keyof typeof BUNDLED_MANIFESTS;

export function getManifest(key: BundledManifestKey): CosmosLogosManifest {
  return BUNDLED_MANIFESTS[key];
}
