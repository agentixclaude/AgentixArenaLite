// Subject cut-out in the browser: MediaPipe selfie segmentation (multiclass model: hair, face,
// body, clothes vs background). Gives a soft person matte per frame, smoothed over time.
import type { ImageSegmenter } from '@mediapipe/tasks-vision';

const MODEL = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite';
const WASM = '/mp';

const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite';
type Fileset = Awaited<ReturnType<typeof import('@mediapipe/tasks-vision').FilesetResolver.forVisionTasks>>;
let filesP: Promise<Fileset> | null = null;
const fileset = () => (filesP ??= import('@mediapipe/tasks-vision').then((m) => m.FilesetResolver.forVisionTasks(WASM)));

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** Point between the eyes (0..1 of the frame) from MediaPipe's face detector, largest face wins. */
export async function findFace(src: string): Promise<{ x: number; y: number } | null> {
  try {
    const { FaceDetector } = await import('@mediapipe/tasks-vision');
    const det = await FaceDetector.createFromOptions(await fileset(), { baseOptions: { modelAssetPath: FACE_MODEL, delegate: 'CPU' }, runningMode: 'IMAGE', minDetectionConfidence: 0.4 });
    const img = await loadImg(src);
    const res = det.detect(img);
    det.close();
    const d = [...res.detections].sort((a, b) => (b.boundingBox?.width ?? 0) * (b.boundingBox?.height ?? 0) - (a.boundingBox?.width ?? 0) * (a.boundingBox?.height ?? 0))[0];
    if (!d) return null;
    const kp = d.keypoints;
    if (kp && kp.length >= 2) return { x: (kp[0].x + kp[1].x) / 2, y: (kp[0].y + kp[1].y) / 2 };
    const b = d.boundingBox;
    return b ? { x: (b.originX + b.width / 2) / img.naturalWidth, y: (b.originY + b.height * 0.42) / img.naturalHeight } : null;
  } catch (e) { console.warn('face detector unavailable', e); return null; }
}

let seg: ImageSegmenter | null = null;
let loading: Promise<boolean> | null = null;
export type SegState = 'idle' | 'loading' | 'ready' | 'failed';
let state: SegState = 'idle';
const listeners = new Set<(s: SegState) => void>();
const setState = (s: SegState) => { state = s; listeners.forEach((f) => f(s)); };
export const segState = () => state;
export const onSegState = (f: (s: SegState) => void) => { listeners.add(f); return () => { listeners.delete(f); }; };

export function loadSegmenter(): Promise<boolean> {
  if (loading) return loading;
  setState('loading');
  loading = (async () => {
    try {
      const { ImageSegmenter } = await import('@mediapipe/tasks-vision');
      const files = await fileset();
      const make = (delegate: 'GPU' | 'CPU') => ImageSegmenter.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL, delegate },
        runningMode: 'IMAGE', outputConfidenceMasks: true, outputCategoryMask: false,
      });
      try { seg = await make('GPU'); } catch { seg = await make('CPU'); }
      setState('ready');
      return true;
    } catch (e) {
      console.warn('Subject cut-out unavailable', e);
      setState('failed');
      return false;
    }
  })();
  return loading;
}

// Mask canvas (256x256, alpha = person) stretched over the source frame by the caller.
const S = 256;
let maskCanvas: HTMLCanvasElement | null = null;
let prev: Float32Array | null = null;
let prevKey = -1;

/** Person matte for a frame. `key` = source time; consecutive keys are blended to stop flicker. */
export function personMask(img: CanvasImageSource, key: number): HTMLCanvasElement | null {
  if (!seg) return null;
  if (key === prevKey && maskCanvas && prev) return maskCanvas;
  let res;
  try { res = seg.segment(img as never); } catch { return null; }
  const masks = res.confidenceMasks;
  if (!masks?.length) { res.close?.(); return null; }
  const bg = masks[0].getAsFloat32Array();
  const w = masks[0].width, h = masks[0].height;
  const cur = new Float32Array(w * h);
  for (let i = 0; i < cur.length; i++) cur[i] = 1 - bg[i];
  res.close?.();
  const near = prev && prev.length === cur.length && Math.abs(key - prevKey) < 0.12 && key !== prevKey;
  if (near) for (let i = 0; i < cur.length; i++) cur[i] = cur[i] * 0.6 + prev![i] * 0.4;
  if (key !== prevKey) { prev = cur; prevKey = key; }
  if (!maskCanvas) { maskCanvas = document.createElement('canvas'); }
  if (maskCanvas.width !== w || maskCanvas.height !== h) { maskCanvas.width = w; maskCanvas.height = h; }
  const g = maskCanvas.getContext('2d')!;
  const id = g.createImageData(w, h);
  for (let i = 0; i < cur.length; i++) {
    const v = cur[i];
    const a = v <= 0.32 ? 0 : v >= 0.68 ? 1 : (v - 0.32) / 0.36;
    id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = 255;
    id.data[i * 4 + 3] = Math.round(a * a * (3 - 2 * a) * 255);
  }
  g.putImageData(id, 0, 0);
  return maskCanvas;
}
export const MASK_SIZE = S;
export function resetMaskHistory() { prev = null; prevKey = -1; }
