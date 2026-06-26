// MediaRouter — one rule today (validate against Athena's analyze allowlist
// + reject HEIC since browsers can't decode it without a wasm dep), structured
// as a router so future per-product-line rules (in-browser HEIC transcode,
// max-dimension downscale, EXIF strip, etc.) drop in without caller changes.
//
// iOS has its own MediaRouter that does a real HEIC → JPEG transform via
// UIImage; the two routers share the AnalyzeMediaType vocabulary so the
// downstream /analyze payload is identical across surfaces.

export type AnalyzeMediaType =
  | 'image/jpeg'
  | 'image/png'
  | 'image/webp'
  | 'image/gif'
  | 'application/pdf';

export const ANALYZE_ALLOWED: readonly AnalyzeMediaType[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];

// 25 MB is Athena's body cap (spec §2); base64 inflates by ~33%, so 18 MB of
// source bytes lands just under. 20 MB raw lets us reject before encode.
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TURN = 10;

export const FILE_PICKER_ACCEPT = ANALYZE_ALLOWED.join(',');

export type RouteOk = { ok: true; file: File; mediaType: AnalyzeMediaType };
export type RouteErr = { ok: false; reason: string };
export type RouteResult = RouteOk | RouteErr;

const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

export function routeForAnalyze(input: File): RouteResult {
  if (input.size === 0) {
    return { ok: false, reason: `${input.name}: file is empty` };
  }
  if (input.size > MAX_FILE_BYTES) {
    const mb = (input.size / 1024 / 1024).toFixed(1);
    return { ok: false, reason: `${input.name}: ${mb} MB exceeds the 20 MB upload cap` };
  }

  const lowerType = (input.type || '').toLowerCase();

  if (HEIC_TYPES.has(lowerType)) {
    return { ok: false, reason: `${input.name}: HEIC isn't supported here yet — re-export as JPEG or PNG` };
  }

  if (!ANALYZE_ALLOWED.includes(lowerType as AnalyzeMediaType)) {
    return {
      ok: false,
      reason: `${input.name}: ${input.type || 'unknown type'} isn't supported (JPEG, PNG, WebP, GIF, or PDF)`,
    };
  }

  return { ok: true, file: input, mediaType: lowerType as AnalyzeMediaType };
}

// Base64-encode a File's bytes, no `data:` prefix. Chunks the byte loop to
// keep String.fromCharCode.apply within argument-count limits for large blobs.
export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    binary += String.fromCharCode.apply(null, Array.from(slice) as number[]);
  }
  return btoa(binary);
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
