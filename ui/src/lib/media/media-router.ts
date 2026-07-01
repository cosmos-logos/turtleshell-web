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

// Ares + Athena both cap their JSON body at 25 MB. Base64 inflates raw bytes
// by 4/3, so the safe raw cap is 25 / 1.333 ≈ 18.75 MB. We cap at 18 MB to
// leave headroom for the JSON envelope overhead (~1 KB) so the gate is
// deterministic at stage time, not a 413 at submit.
export const MAX_FILE_BYTES = 18 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_TURN = 10;

export const FILE_PICKER_ACCEPT = ANALYZE_ALLOWED.join(',');

export type RouteOk = { ok: true; file: File; mediaType: AnalyzeMediaType };
export type RouteErr = { ok: false; reason: string };
export type RouteResult = RouteOk | RouteErr;

const HEIC_TYPES = new Set(['image/heic', 'image/heif']);

// Max dimension we'll downscale wide screenshots/photos to before encoding.
// 2048 keeps OCR + Vision quality high (Athena's downstream providers
// generally clamp to 2048 anyway) and reliably drops Retina-resolution
// screenshots from 30+ MB to under 2 MB as JPEG.
const DOWNSCALE_MAX_DIM = 2048;
const JPEG_QUALITY = 0.85;

export function routeForAnalyze(input: File): RouteResult {
  if (input.size === 0) {
    return { ok: false, reason: `${input.name}: file is empty` };
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

  // Images that exceed MAX_FILE_BYTES are recoverable via downscale (see
  // prepareForAnalyze below). PDFs and GIFs we can't safely transcode in the
  // browser, so we still reject them at the cap.
  const isTranscodableImage = (
    lowerType === 'image/jpeg' || lowerType === 'image/png' || lowerType === 'image/webp'
  );
  if (input.size > MAX_FILE_BYTES && !isTranscodableImage) {
    const mb = (input.size / 1024 / 1024).toFixed(1);
    return { ok: false, reason: `${input.name}: ${mb} MB exceeds the 18 MB upload cap (PDFs can't be auto-shrunk — please compress and retry)` };
  }

  return { ok: true, file: input, mediaType: lowerType as AnalyzeMediaType };
}

// Two-stage routing — stage 1 (routeForAnalyze) is sync and decides whether
// to accept the file. Stage 2 (prepareForAnalyze) is async and may rewrite
// the bytes (downscale, re-encode) so the eventual /analyze POST clears the
// 25 MB JSON cap. Callers should `await prepareForAnalyze` right before the
// base64 + POST so the work happens on submit, not on stage.
export async function prepareForAnalyze(routed: RouteOk): Promise<RouteResult> {
  // Anything already under the cap goes through untouched.
  if (routed.file.size <= MAX_FILE_BYTES) return routed;

  // PDFs and GIFs are caught at routeForAnalyze; only transcodable images
  // reach here. Downscale to MAX_DIM, re-encode JPEG. If the result still
  // exceeds the cap (huge resolution beyond canvas limits, etc.), reject
  // with a clear message instead of silently shipping a 413.
  try {
    const shrunk = await downscaleImageToJpeg(routed.file);
    if (shrunk.size > MAX_FILE_BYTES) {
      const mb = (shrunk.size / 1024 / 1024).toFixed(1);
      return {
        ok: false,
        reason: `${routed.file.name}: even at ${DOWNSCALE_MAX_DIM}px JPEG it's ${mb} MB — compress further and retry`,
      };
    }
    return { ok: true, file: shrunk, mediaType: 'image/jpeg' };
  } catch (e) {
    return { ok: false, reason: `${routed.file.name}: couldn't downscale (${(e as Error).message})` };
  }
}

async function downscaleImageToJpeg(input: File): Promise<File> {
  const url = URL.createObjectURL(input);
  try {
    const img = await loadImage(url);
    const { width, height } = scaledDims(img.naturalWidth, img.naturalHeight, DOWNSCALE_MAX_DIM);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(img, 0, 0, width, height);
    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob returned null'))), 'image/jpeg', JPEG_QUALITY);
    });
    const baseName = input.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image decode failed'));
    i.src = src;
  });
}

function scaledDims(w: number, h: number, max: number): { width: number; height: number } {
  if (w <= max && h <= max) return { width: w, height: h };
  const scale = w >= h ? max / w : max / h;
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
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

// 96px max-dim JPEG q=0.7 — used for chip previews + message-bubble thumbs.
// We persist this in chat-store/localStorage, so we MUST keep it small;
// the full-file data URL approach was multi-MB per image and blew the
// 5 MB localStorage cap when 3 images shipped in one user message.
// PDFs return undefined — the bubble renders a file icon instead.
export async function generateChipThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith('image/')) return undefined;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImageEl(url);
    const max = 96;
    const w0 = img.naturalWidth;
    const h0 = img.naturalHeight;
    if (!w0 || !h0) return undefined;
    const scale = (w0 >= h0 ? max / w0 : max / h0);
    const w = Math.max(1, Math.round(w0 * Math.min(scale, 1)));
    const h = Math.max(1, Math.round(h0 * Math.min(scale, 1)));
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.drawImage(img, 0, 0, w, h);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch {
    return undefined;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('image decode failed'));
    i.src = src;
  });
}
