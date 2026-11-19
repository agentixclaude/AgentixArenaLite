import { get, set, del, keys } from 'idb-keyval';
import type { Word } from './style';
import type { Aspect, Bg, CaptionStyleId } from './packs';
import type { KeySettings } from './keyer';
import type { TextOverrides } from './text';
import type { ShotEdit } from './style';
import type { BrollAsset } from './broll';
import type { SoundSettings } from './sound';
import type { GroupId, HookStyle, MotifId } from './looks';
import type { BaseBg } from './basebg';

export interface Project {
  id: string;
  name: string;
  created: number;
  updated: number;
  fileName: string;
  fileSize: number;
  file: Blob | null; // null = video removed to free space (re-attach to edit)
  thumb: string;
  srcDur: number;
  srcW: number;
  srcH: number;
  words: Word[];
  packId: string;
  autoPackId: string;
  capStyle: CaptionStyleId | 'auto';
  aspect: Aspect;
  seed: number;
  face: { x: number; y: number };
  captions: boolean;
  screen: { on: boolean; detected: boolean; key: KeySettings };
  bg: Bg;
  photo?: Blob | null;
  exported?: number;
  textProps?: TextOverrides;
  shotEdits?: Record<string, ShotEdit>;
  cutout?: boolean;
  brolls?: BrollAsset[];
  /** Look overrides on top of the preset ('auto' or missing = the preset's own). */
  group?: GroupId | 'auto';
  hookStyle?: HookStyle | 'auto';
  motif?: MotifId | 'auto';
  /** Last layer under the design (Look → Background); missing = the preset's own colour. */
  canvas?: BaseBg;
  /** Photo for that last layer, kept with the project. */
  canvasPhoto?: Blob | null;
  /** Music + effects settings; missing = defaults (Auto music, ducked, whoosh + click). */
  sound?: Partial<SoundSettings>;
  /** The user's own music track, kept with the project. */
  music?: { name: string; blob: Blob | null };
  /** Motion quality: 'basic' (default) or 'great' (strong easing, letter stagger, motion blur on export). */
  motion?: import('./motion').MotionQuality;
  /** Text layer: 'normal' (default), 'graphics', 'typo' or 'auto' (per scene). */
  textLayer?: import('./motion').TextLayer;
}

export type ProjectMeta = Omit<Project, 'file' | 'words' | 'photo' | 'canvasPhoto' | 'brolls' | 'music'> & { hasVideo: boolean };

const isQuota = (e: unknown) => e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);

async function writeRaw(p: Project) {
  await set('p:' + p.id, p);
  const { file, words: _w, photo: _p, canvasPhoto: _c, brolls: _b, music: _m, ...meta } = p;
  await set('m:' + p.id, { ...meta, hasVideo: !!file } as ProjectMeta);
}

/** Save; if the browser is out of space, drop saved videos from the oldest projects and retry. */
export async function saveProject(p: Project): Promise<{ freed: string[] }> {
  p.updated = Date.now();
  const freed: string[] = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    try { await writeRaw(p); return { freed }; } catch (e) {
      if (!isQuota(e)) throw e;
      const victim = (await listProjects()).filter((m) => m.id !== p.id && m.hasVideo).pop();
      if (!victim) {
        // nothing else to free: keep this project's edit but not its video
        if (p.file) { await writeRaw({ ...p, file: null }); freed.push(p.name); }
        return { freed };
      }
      await removeVideo(victim.id);
      freed.push(victim.name);
    }
  }
  return { freed };
}

export async function removeVideo(id: string) {
  const full = (await get('p:' + id)) as Project | undefined;
  if (!full) return;
  await writeRaw({ ...full, file: null, photo: null, canvasPhoto: null, brolls: full.brolls?.map((b) => ({ ...b, blob: null })), music: full.music ? { ...full.music, blob: null } : undefined });
}

export async function loadProject(id: string) {
  const p = (await get('p:' + id)) as Project | undefined;
  if (p) p.fileSize ??= (p.file?.size ?? 0);
  return p;
}
export async function deleteProject(id: string) { await del('p:' + id); await del('m:' + id); }
export async function listProjects(): Promise<ProjectMeta[]> {
  const ks = (await keys()).filter((k) => String(k).startsWith('m:'));
  const metas = await Promise.all(ks.map((k) => get(k)));
  return (metas.filter(Boolean) as ProjectMeta[]).map((m) => ({ ...m, hasVideo: m.hasVideo ?? true })).sort((a, b) => b.updated - a.updated);
}

export async function storageInfo(): Promise<{ used: number; quota: number } | null> {
  try { const e = await navigator.storage?.estimate(); return e ? { used: e.usage ?? 0, quota: e.quota ?? 0 } : null; } catch { return null; }
}
export async function askPersist() { try { await navigator.storage?.persist?.(); } catch { /* ignore */ } }
