/// <reference lib="webworker" />
import { pipeline, env } from '@huggingface/transformers';

env.allowLocalModels = false;

type Msg = { type: 'run'; audio: Float32Array; model: 'fast' | 'accurate'; language: string; device?: 'auto' | 'wasm' };

// Real GPU only — software WebGPU (SwiftShader / fallback adapters) is far slower than CPU WASM.
async function realGPU(): Promise<boolean> {
  const gpu = (self.navigator as any).gpu;
  if (!gpu) return false;
  try {
    const a = await gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!a || a.isFallbackAdapter || a.info?.isFallbackAdapter) return false;
    const desc = `${a.info?.vendor ?? ''} ${a.info?.architecture ?? ''} ${a.info?.description ?? ''}`.toLowerCase();
    if (/swiftshader|llvmpipe|software|basic render/.test(desc)) return false;
    return true;
  } catch { return false; }
}
let forceWasm = false;

let asr: any = null;
let loaded = '';

async function getAsr(model: 'fast' | 'accurate') {
  if (asr && loaded === model) return asr;
  const id = model === 'fast' ? 'onnx-community/whisper-tiny_timestamped' : 'onnx-community/whisper-base_timestamped';
  const hasGPU = !forceWasm && (await realGPU());
  const device = hasGPU ? 'webgpu' : 'wasm';
  const dtype = hasGPU ? { encoder_model: 'fp32', decoder_model_merged: 'q4' } : { encoder_model: 'q8', decoder_model_merged: 'q8' };
  const files = new Map<string, { loaded: number; total: number }>();
  asr = await pipeline('automatic-speech-recognition', id, {
    device,
    dtype: dtype as any,
    progress_callback: (p: any) => {
      if (p.status === 'progress' && p.file) {
        files.set(p.file, { loaded: p.loaded, total: p.total });
        let l = 0, t = 0;
        files.forEach((f) => { l += f.loaded; t += f.total; });
        postMessage({ type: 'download', loaded: l, total: t });
      }
    },
  });
  loaded = model;
  postMessage({ type: 'ready', device });
  return asr;
}

self.onmessage = async (e: MessageEvent<Msg>) => {
  const m = e.data;
  if (m.type !== 'run') return;
  try {
    forceWasm = m.device === 'wasm';
    const run = await getAsr(m.model);
    postMessage({ type: 'transcribing' });
    // process in 30s windows ourselves so we can report progress
    const SR = 16000, WIN = 30 * SR;
    const words: { w: string; s: number; e: number }[] = [];
    let text = '';
    // split at the quietest 20ms point between 24s and 29.5s so words aren't cut in half
    const quietEnd = (off: number) => {
      if (off + WIN >= m.audio.length) return m.audio.length;
      const fr = 320; let best = off + WIN - SR / 2, bestE = Infinity;
      for (let p = off + 24 * SR; p + fr < off + WIN - SR / 2; p += fr) {
        let e2 = 0; for (let i = p; i < p + fr; i++) e2 += m.audio[i] * m.audio[i];
        if (e2 < bestE) { bestE = e2; best = p + fr / 2; }
      }
      return Math.floor(best);
    };
    for (let off = 0, end = quietEnd(0); off < m.audio.length; off = end, end = quietEnd(off)) {
      const slice = m.audio.subarray(off, end);
      if (slice.length < SR * 0.3) break;
      const res: any = await run(slice, {
        return_timestamps: 'word',
        language: m.language || 'en',
        task: 'transcribe',
      });
      const base = off / SR;
      for (const c of res.chunks ?? []) {
        const [s, e] = c.timestamp;
        const w = String(c.text).trim();
        if (!w) continue;
        words.push({ w, s: base + (s ?? 0), e: base + (e ?? s ?? 0) });
      }
      text += ' ' + (res.text ?? '');
      postMessage({ type: 'progress', p: Math.min(1, end / m.audio.length) });
      if (end >= m.audio.length) break;
    }
    postMessage({ type: 'done', words, text: text.trim() });
  } catch (err: any) {
    postMessage({ type: 'error', message: err?.message ?? String(err) });
  }
};
