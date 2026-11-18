import { Input, BlobSource, ALL_FORMATS, AudioBufferSink, CanvasSink } from 'mediabunny';

export interface Probe { duration: number; width: number; height: number; hasAudio: boolean; canDecode: boolean }

export async function probe(file: Blob): Promise<Probe> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const v = await input.getPrimaryVideoTrack();
  const a = await input.getPrimaryAudioTrack();
  if (!v) throw new Error('No video track found in this file.');
  const duration = await input.computeDuration();
  return { duration, width: v.displayWidth, height: v.displayHeight, hasAudio: !!a, canDecode: await v.canDecode() };
}

/** Decode the whole audio track into one AudioBuffer (original rate, mono-or-stereo). */
export async function decodeAudio(file: Blob, onProgress?: (p: number) => void): Promise<AudioBuffer> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const track = await input.getPrimaryAudioTrack();
  if (!track) throw new Error('This video has no audio track.');
  const dur = await input.computeDuration();
  const sink = new AudioBufferSink(track);
  const chunks: AudioBuffer[] = [];
  let total = 0;
  for await (const { buffer } of sink.buffers()) {
    chunks.push(buffer);
    total += buffer.length;
    onProgress?.(Math.min(1, (total / buffer.sampleRate) / dur));
  }
  if (!chunks.length) throw new Error('Could not decode audio.');
  const sr = chunks[0].sampleRate;
  const ch = Math.min(2, chunks[0].numberOfChannels);
  const out = new AudioBuffer({ length: total, numberOfChannels: ch, sampleRate: sr });
  for (let c = 0; c < ch; c++) {
    const dst = out.getChannelData(c);
    let off = 0;
    for (const b of chunks) { dst.set(b.getChannelData(Math.min(c, b.numberOfChannels - 1)), off); off += b.length; }
  }
  return out;
}

export async function to16kMono(buf: AudioBuffer): Promise<Float32Array> {
  const len = Math.ceil(buf.duration * 16000);
  const oc = new OfflineAudioContext(1, len, 16000);
  const s = oc.createBufferSource();
  s.buffer = buf;
  s.connect(oc.destination);
  s.start();
  const r = await oc.startRendering();
  return r.getChannelData(0);
}

/** First frame thumbnail as a data URL. */
export async function thumbnail(file: Blob, at = 0.5, width = 270): Promise<string> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const v = await input.getPrimaryVideoTrack();
  if (!v) return '';
  const sink = new CanvasSink(v, { width, height: Math.round(width * v.displayHeight / v.displayWidth), fit: 'fill' });
  const fr = await sink.getCanvas(at);
  if (!fr) return '';
  const c = document.createElement('canvas');
  c.width = (fr.canvas as HTMLCanvasElement).width; c.height = (fr.canvas as HTMLCanvasElement).height;
  c.getContext('2d')!.drawImage(fr.canvas as CanvasImageSource, 0, 0);
  return c.toDataURL('image/jpeg', width > 300 ? 0.85 : 0.7);
}
