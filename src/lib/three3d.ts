// Real 3D in the browser with Three.js: the shot's Lucide icon turned into a lit 3D tube object.
// Pure function of time (no clock), so preview and export render the same frame.
import { ICONS } from './icons';
import { clamp01, springAt } from './ease';

type T3 = typeof import('three');
let THREE: T3 | null = null;
let SVGLoaderCls: (new () => { parse: (s: string) => { paths: { subPaths: { getPoints: (n?: number) => { x: number; y: number }[]; autoClose?: boolean }[] }[] } }) | null = null;
let loading: Promise<boolean> | null = null;

export function load3D(): Promise<boolean> {
  if (loading) return loading;
  loading = (async () => {
    try {
      THREE = await import('three');
      SVGLoaderCls = (await import('three/examples/jsm/loaders/SVGLoader.js')).SVGLoader as never;
      return true;
    } catch (e) { console.warn('3D unavailable', e); return false; }
  })();
  return loading;
}
export const ready3D = () => !!THREE;

interface Rig {
  renderer: import('three').WebGLRenderer; scene: import('three').Scene; camera: import('three').PerspectiveCamera;
  group: import('three').Group; mat: import('three').MeshPhysicalMaterial; size: number; icon: string;
}
const rigs = new Map<string, Rig>();

function buildIcon(T: T3, name: string, mat: import('three').Material) {
  const group = new T.Group();
  const d = ICONS[name] ?? ICONS.star;
  const data = new SVGLoaderCls!().parse(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="${d}"/></svg>`);
  const R = 1.05;
  for (const p of data.paths) for (const sp of p.subPaths) {
    const pts2 = sp.getPoints(24);
    const pts = pts2.filter((q, i) => i === 0 || Math.hypot(q.x - pts2[i - 1].x, q.y - pts2[i - 1].y) > 0.05).map((q) => new T.Vector3(q.x - 12, -(q.y - 12), 0));
    if (pts.length < 2) continue;
    const closed = pts.length > 3 && pts[0].distanceTo(pts[pts.length - 1]) < 0.1;
    if (closed) pts.pop();
    const curve = new T.CatmullRomCurve3(pts, closed, 'centripetal', 0.2);
    const geo = new T.TubeGeometry(curve, Math.max(24, pts.length * 10), R, 18, closed);
    group.add(new T.Mesh(geo, mat));
    if (!closed) for (const e of [pts[0], pts[pts.length - 1]]) {
      const cap = new T.Mesh(new T.SphereGeometry(R, 18, 12), mat);
      cap.position.copy(e);
      group.add(cap);
    }
  }
  return group;
}

function rig(key: string, size: number, icon: string, color: string): Rig | null {
  const T = THREE;
  if (!T || !SVGLoaderCls) return null;
  let r = rigs.get(key);
  if (r && (r.size !== size)) { r.renderer.dispose(); rigs.delete(key); r = undefined; }
  if (!r) {
    const canvas = document.createElement('canvas');
    let renderer: import('three').WebGLRenderer;
    try { renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true }); } catch { return null; }
    renderer.setPixelRatio(1);
    renderer.setSize(size, size, false);
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(30, 1, 0.1, 400);
    camera.position.set(0, 1.5, 64);
    camera.lookAt(0, 0, 0);
    scene.add(new T.HemisphereLight(0xffffff, 0x2a2622, 1.25));
    const key1 = new T.DirectionalLight(0xffffff, 2.6); key1.position.set(14, 18, 30); scene.add(key1);
    const rim = new T.DirectionalLight(0xffe2cc, 1.8); rim.position.set(-22, 10, -18); scene.add(rim);
    const fill = new T.DirectionalLight(0xbfd2ff, 0.5); fill.position.set(-10, -14, 20); scene.add(fill);
    const mat = new T.MeshPhysicalMaterial({ color, roughness: 0.3, metalness: 0.08, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    const group = buildIcon(T, icon, mat);
    scene.add(group);
    r = { renderer, scene, camera, group, mat, size, icon };
    rigs.set(key, r);
  }
  if (r.icon !== icon) {
    r.scene.remove(r.group);
    r.group.traverse((o) => { const m = o as import('three').Mesh; if (m.geometry) m.geometry.dispose(); });
    r.group = buildIcon(T, icon, r.mat);
    r.scene.add(r.group);
    r.icon = icon;
  }
  r.mat.color.set(color);
  return r;
}

/** Render the 3D icon at local time lt (seconds into the shot). Returns a transparent canvas. */
export function render3DIcon(key: string, icon: string, color: string, lt: number, size: number): HTMLCanvasElement | null {
  const r = rig(key, Math.round(size), icon, color);
  if (!r) return null;
  const enter = springAt(lt, { stiffness: 120, damping: 14 });
  const s = 0.35 + 0.65 * clamp01(enter) + (enter > 1 ? (enter - 1) * 0.5 : 0);
  r.group.scale.setScalar(s);
  r.group.rotation.set(0.12 + Math.sin(lt * 0.9) * 0.06, (1 - clamp01(enter)) * -1.4 + Math.sin(lt * 0.7) * 0.42, Math.sin(lt * 0.5) * 0.04);
  r.group.position.y = Math.sin(lt * 1.3) * 0.5;
  r.renderer.render(r.scene, r.camera);
  return r.renderer.domElement;
}
