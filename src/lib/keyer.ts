// Green-screen keyer (WebGL, runs on the GPU every frame) + auto detection helpers.

export interface KeySettings { color: [number, number, number]; similarity: number; smoothness: number; spill: number }
export const DEFAULT_KEY: KeySettings = { color: [0.1, 0.65, 0.25], similarity: 0.4, smoothness: 0.12, spill: 0.1 };

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = vec2(p.x*0.5+0.5, 0.5-p.y*0.5); gl_Position = vec4(p,0.,1.); }`;
const FS = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
uniform sampler2D tex; uniform vec3 key; uniform float sim, smo, spill; uniform int blue;
// colour-difference keyer: how much the screen colour dominates, relative to the pixel's own brightness
float dom(vec3 c){ float m = blue == 1 ? c.b : c.g; float other = blue == 1 ? max(c.r, c.g) : max(c.r, c.b); return (m - other) / max(m, 0.04) * smoothstep(0.03, 0.12, m); }
void main(){
  vec4 c = texture(tex, uv);
  float kd = max(dom(key), 0.08);
  float ratio = dom(c.rgb) / kd;
  float hi = 1.0 - sim;
  float lo = hi - smo * 3.0;
  float a = 1.0 - smoothstep(lo, hi, ratio);
  vec3 rgb = c.rgb;
  // despill: never let the screen channel exceed the other two
  if (blue == 1) rgb.b = min(rgb.b, max(rgb.r, rgb.g) + spill * 0.2); else rgb.g = min(rgb.g, max(rgb.r, rgb.b) + spill * 0.2);
  o = vec4(rgb * a, a);
}`;

export class Keyer {
  canvas: HTMLCanvasElement;
  private gl: WebGL2RenderingContext;
  private tex: WebGLTexture;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private maxSide: number;

  constructor(maxSide = 1920) {
    this.maxSide = maxSide;
    this.canvas = document.createElement('canvas');
    const gl = this.canvas.getContext('webgl2', { premultipliedAlpha: true, preserveDrawingBuffer: true, alpha: true });
    if (!gl) throw new Error('WebGL2 not available');
    this.gl = gl;
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader'); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['tex', 'key', 'sim', 'smo', 'spill', 'blue']) this.u[n] = gl.getUniformLocation(prog, n);
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u.tex, 0);
  }

  process(img: TexImageSource, w: number, h: number, k: KeySettings): HTMLCanvasElement {
    const s = Math.min(1, this.maxSide / Math.max(w, h));
    const cw = Math.round(w * s), ch = Math.round(h * s);
    if (this.canvas.width !== cw || this.canvas.height !== ch) { this.canvas.width = cw; this.canvas.height = ch; }
    const gl = this.gl;
    gl.viewport(0, 0, cw, ch);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.uniform3f(this.u.key, k.color[0], k.color[1], k.color[2]);
    gl.uniform1f(this.u.sim, k.similarity);
    gl.uniform1i(this.u.blue, k.color[2] > k.color[1] ? 1 : 0);
    gl.uniform1f(this.u.smo, k.smoothness);
    gl.uniform1f(this.u.spill, k.spill);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    return this.canvas;
  }
}

let shared: Keyer | null = null;
export const sharedKeyer = () => { try { return (shared ??= new Keyer(1920)); } catch { return null; } };

const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

/** Look at the frame border: if it is mostly one saturated green (or blue), it's a chroma screen. */
export async function detectScreen(thumbUrl: string): Promise<{ isScreen: boolean; color: [number, number, number] }> {
  const img = await loadImg(thumbUrl);
  const c = document.createElement('canvas');
  c.width = 96; c.height = Math.round(96 * img.height / img.width);
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, c.width, c.height);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const px: [number, number, number][] = [];
  const bw = Math.max(2, Math.round(c.width * 0.12));
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    if (x >= bw && x < c.width - bw && y >= bw) continue; // left, right, top bands
    const i = (y * c.width + x) * 4;
    px.push([d[i], d[i + 1], d[i + 2]]);
  }
  const greens = px.filter(([r, gg, b]) => gg > 60 && gg > r * 1.25 && gg > b * 1.15);
  const blues = px.filter(([r, gg, b]) => b > 60 && b > r * 1.4 && b > gg * 1.1);
  const pick = greens.length >= blues.length ? greens : blues;
  const share = pick.length / px.length;
  if (share < 0.55) return { isScreen: false, color: DEFAULT_KEY.color };
  const med = (k: number) => { const a = pick.map((p) => p[k]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)] / 255; };
  return { isScreen: true, color: [med(0), med(1), med(2)] };
}

/** Estimate the face position from the keyed silhouette (top of the head + head width). */
export async function faceFromScreen(thumbUrl: string, color: [number, number, number]): Promise<{ x: number; y: number } | null> {
  const img = await loadImg(thumbUrl);
  const W = 160, H = Math.round(160 * img.height / img.width);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d', { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, W, H);
  const d = g.getImageData(0, 0, W, H).data;
  const kc = [color[0] * 255, color[1] * 255, color[2] * 255];
  const fg = (x: number, y: number) => { const i = (y * W + x) * 4; const dr = d[i] - kc[0], dg = d[i + 1] - kc[1], db = d[i + 2] - kc[2]; return dr * dr + dg * dg + db * db > 70 * 70; };
  const rowSpan = (y: number) => { let a = -1, b = -1, n = 0; for (let x = Math.round(W * 0.08); x < W * 0.92; x++) if (fg(x, y)) { if (a < 0) a = x; b = x; n++; } return n > 2 ? { a, b, n } : null; };
  let top = -1;
  for (let y = 0; y < H; y++) { const r = rowSpan(y); if (r && r.n > W * 0.025) { top = y; break; } }
  if (top < 0) return null;
  let sx = 0, sw = 0, cnt = 0;
  const probe = Math.min(H - 1, top + Math.round(H * 0.08));
  for (let y = top; y <= probe; y++) { const r = rowSpan(y); if (r) { sx += (r.a + r.b) / 2; sw += r.b - r.a; cnt++; } }
  if (!cnt) return null;
  const cx = sx / cnt, headW = sw / cnt;
  const fy = top + Math.max(headW * 0.75, H * 0.06);
  return { x: Math.min(0.95, Math.max(0.05, cx / W)), y: Math.min(0.9, Math.max(0.05, fy / H)) };
}

/** Browser face detector where available (Chrome with Shape Detection). */
export async function faceFromDetector(thumbUrl: string): Promise<{ x: number; y: number } | null> {
  const FD = (window as any).FaceDetector;
  if (!FD) return null;
  try {
    const img = await loadImg(thumbUrl);
    const faces = await new FD({ fastMode: true, maxDetectedFaces: 1 }).detect(img);
    const b = faces?.[0]?.boundingBox;
    if (!b) return null;
    return { x: (b.x + b.width / 2) / img.width, y: (b.y + b.height / 2) / img.height };
  } catch { return null; }
}
