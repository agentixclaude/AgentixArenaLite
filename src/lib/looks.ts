// Style groups: presets that share the common things — which layouts they use, how the hook
// moves, the kinetic font pair and the full-graphic set. A preset is then group + palette +
// background motif + caption template.
import type { LayoutKind, Pack } from './packs';
import type { CardKind } from './style';

export type GroupId = 'bold' | 'editorial' | 'clean' | 'tech' | 'news' | 'cinema' | 'playful' | 'minimal';
export type HookStyle = 'lockup' | 'lower';
export type MotifId =
  | 'broadcast' | 'ledger' | 'chart' | 'rays' | 'drafting' | 'waves' | 'speed' | 'picnic'
  | 'deco' | 'notebook' | 'orbits' | 'typewall' | 'contours' | 'soft' | 'code' | 'herringbone'
  | 'court' | 'pixels' | 'stripes' | 'pages' | 'arches' | 'blocks' | 'hex' | 'circuit' | 'wire' | 'stamp' | 'molecule' | 'columns'
  | 'filmstrip' | 'rain' | 'ridge' | 'viewfinder' | 'confetti' | 'paws' | 'stitch' | 'bubbles' | 'enso' | 'dotgrid' | 'rule' | 'quiet'
  | 'plain' | 'checker' | 'isometric' | 'bauhaus' | 'memphis' | 'halftone' | 'flow';

export type MotifCat = 'grid' | 'shapes' | 'abstract';
export const MOTIF_CATS: { id: MotifCat; name: string }[] = [{ id: 'grid', name: 'Grid' }, { id: 'shapes', name: 'Shapes' }, { id: 'abstract', name: 'Abstract' }];

/** Background designs (the layer over the last layer), by kind. 'plain' = no design. */
export const MOTIFS: { id: MotifId; name: string; cat: MotifCat | 'none' }[] = [
  { id: 'plain', name: 'None', cat: 'none' },
  // Grid
  { id: 'broadcast', name: 'Broadcast grid', cat: 'grid' }, { id: 'ledger', name: 'Ledger', cat: 'grid' }, { id: 'chart', name: 'Chart paper', cat: 'grid' },
  { id: 'drafting', name: 'Drafting', cat: 'grid' }, { id: 'notebook', name: 'Notebook', cat: 'grid' }, { id: 'dotgrid', name: 'Dot grid', cat: 'grid' },
  { id: 'checker', name: 'Checker', cat: 'grid' }, { id: 'isometric', name: 'Isometric', cat: 'grid' }, { id: 'picnic', name: 'Picnic', cat: 'grid' },
  { id: 'herringbone', name: 'Herringbone', cat: 'grid' }, { id: 'pixels', name: 'Pixels', cat: 'grid' }, { id: 'hex', name: 'Hex chain', cat: 'grid' },
  { id: 'columns', name: 'Newspaper', cat: 'grid' }, { id: 'pages', name: 'Book pages', cat: 'grid' }, { id: 'rule', name: 'Résumé rules', cat: 'grid' },
  { id: 'stitch', name: 'Stitch & tape', cat: 'grid' }, { id: 'court', name: 'Court lines', cat: 'grid' }, { id: 'viewfinder', name: 'Viewfinder', cat: 'grid' },
  // Shapes
  { id: 'bauhaus', name: 'Bauhaus', cat: 'shapes' }, { id: 'memphis', name: 'Memphis', cat: 'shapes' }, { id: 'soft', name: 'Soft circles', cat: 'shapes' },
  { id: 'rays', name: 'Sunburst', cat: 'shapes' }, { id: 'deco', name: 'Art deco', cat: 'shapes' }, { id: 'orbits', name: 'Orbits', cat: 'shapes' },
  { id: 'arches', name: 'Colonnade', cat: 'shapes' }, { id: 'blocks', name: 'Toy blocks', cat: 'shapes' }, { id: 'bubbles', name: 'Bubbles', cat: 'shapes' },
  { id: 'confetti', name: 'Confetti', cat: 'shapes' }, { id: 'paws', name: 'Paw trail', cat: 'shapes' }, { id: 'molecule', name: 'Molecules', cat: 'shapes' },
  { id: 'enso', name: 'Ensō', cat: 'shapes' }, { id: 'stamp', name: 'Archive stamp', cat: 'shapes' }, { id: 'quiet', name: 'Quiet frame', cat: 'shapes' },
  { id: 'filmstrip', name: 'Film strip', cat: 'shapes' },
  // Abstract
  { id: 'flow', name: 'Flow lines', cat: 'abstract' }, { id: 'halftone', name: 'Halftone', cat: 'abstract' }, { id: 'waves', name: 'Sound rings', cat: 'abstract' },
  { id: 'contours', name: 'Topo map', cat: 'abstract' }, { id: 'speed', name: 'Speed lines', cat: 'abstract' }, { id: 'stripes', name: 'Racing stripes', cat: 'abstract' },
  { id: 'ridge', name: 'Ridgelines', cat: 'abstract' }, { id: 'rain', name: 'Night rain', cat: 'abstract' }, { id: 'wire', name: 'Newswire globe', cat: 'abstract' },
  { id: 'circuit', name: 'Circuit board', cat: 'abstract' }, { id: 'code', name: 'Code rain', cat: 'abstract' }, { id: 'typewall', name: 'Type wall', cat: 'abstract' },
];

/** The two-font kinetic lockup: one big display face, one short accent line. */
export interface LockupFonts {
  big: { font: string; weight: number; upper: boolean };
  /** scale: small line size as a share of the big line (default 0.42 italic, 0.3 otherwise). */
  small: { font: string; weight: number; italic: boolean; upper: boolean; tracking: number; scale?: number };
}

export interface StyleGroup {
  id: GroupId;
  name: string;
  note: string;
  layouts: Partial<Record<LayoutKind, number>>;
  hook: HookStyle;
  /** Chance that a plain talking-head beat gets a kinetic main-word lockup. */
  words: number;
  cards: CardKind[];
  lockup: (p: Pack) => LockupFonts;
}

const serif = (f: string) => /Serif|Fraunces|Cormorant/.test(f);

export const GROUPS: StyleGroup[] = [
  {
    id: 'bold', name: 'Bold', note: 'Poster type, cinema bands, duotone and sticker cut-outs',
    layouts: { full: 2, punch: 4, split: 2, card: 2, band: 3, duotone: 2, sticker: 2, polaroid: 1 },
    hook: 'lockup', words: 0.5, cards: ['stack', 'lockup', 'data'],
    lockup: () => ({ big: { font: 'Anton', weight: 400, upper: true }, small: { font: 'Instrument Serif', weight: 400, italic: true, upper: false, tracking: 0 } }),
  },
  {
    id: 'editorial', name: 'Editorial', note: 'Serif lockups, arch windows, frames and polaroids',
    layouts: { full: 3, punch: 2, split: 2, circle: 1, card: 2, arch: 3, polaroid: 2, frame: 2 },
    hook: 'lockup', words: 0.35, cards: ['editorial', 'lockup', 'object3d'],
    lockup: (p) => ({ big: { font: p.display, weight: p.displayWeight, upper: false }, small: { font: p.body, weight: 700, italic: false, upper: true, tracking: 220 } }),
  },
  {
    id: 'clean', name: 'Clean', note: 'Calm explainers: splits, circles, polaroids and stickers',
    layouts: { full: 2, punch: 2, split: 3, circle: 2, card: 2, polaroid: 2, arch: 1, sticker: 1 },
    hook: 'lower', words: 0.3, cards: ['editorial', 'index', 'lockup'],
    lockup: (p) => ({
      big: { font: p.display, weight: p.displayWeight, upper: false },
      small: serif(p.display) ? { font: p.body, weight: 700, italic: false, upper: true, tracking: 200 } : { font: 'Instrument Serif', weight: 400, italic: true, upper: false, tracking: 0 },
    }),
  },
  {
    id: 'tech', name: 'Tech', note: 'Hard cuts, cinema bands, frame breaks and data',
    layouts: { full: 2, punch: 3, split: 3, card: 2, band: 3, duotone: 1, frame: 2, circle: 1 },
    hook: 'lockup', words: 0.4, cards: ['data', 'editorial', 'object3d'],
    lockup: (p) => p.display === 'JetBrains Mono'
      ? { big: { font: 'JetBrains Mono', weight: 800, upper: true }, small: { font: 'Space Grotesk', weight: 600, italic: false, upper: true, tracking: 160 } }
      : { big: { font: p.display, weight: p.display === 'Archivo' ? 900 : 800, upper: true }, small: { font: 'JetBrains Mono', weight: 600, italic: false, upper: true, tracking: 120 } },
  },
  {
    id: 'news', name: 'News', note: 'Broadcast bands, tickers and hard facts',
    layouts: { full: 2, punch: 3, split: 3, band: 3, card: 2, frame: 1, duotone: 1 },
    hook: 'lockup', words: 0.3, cards: ['data', 'editorial', 'stack'],
    lockup: (p) => ({ big: { font: p.display, weight: p.displayWeight, upper: p.displayCase === 'upper' }, small: { font: 'JetBrains Mono', weight: 600, italic: false, upper: true, tracking: 160 } }),
  },
  {
    id: 'cinema', name: 'Cinematic', note: 'Letterbox bands, duotone frames and slow titles',
    layouts: { full: 3, band: 4, duotone: 2, arch: 2, frame: 2, punch: 1, split: 1 },
    hook: 'lockup', words: 0.3, cards: ['editorial', 'lockup', 'object3d'],
    lockup: (p) => ({ big: { font: p.display, weight: p.displayWeight, upper: p.displayCase === 'upper' }, small: { font: p.body, weight: 600, italic: false, upper: true, tracking: 320 } }),
  },
  {
    id: 'playful', name: 'Playful', note: 'Stickers, polaroids and rounded, bouncy type',
    layouts: { full: 2, punch: 2, sticker: 3, polaroid: 3, circle: 2, card: 2, split: 1 },
    hook: 'lockup', words: 0.45, cards: ['stack', 'lockup', 'editorial'],
    lockup: (p) => ({ big: { font: p.display, weight: p.displayWeight, upper: false }, small: { font: 'Caveat', weight: 700, italic: false, upper: false, tracking: 0, scale: 0.5 } }),
  },
  {
    id: 'minimal', name: 'Minimal', note: 'Quiet layouts, thin rules and open space',
    layouts: { full: 4, split: 2, circle: 2, frame: 2, card: 1, arch: 1 },
    hook: 'lower', words: 0.2, cards: ['editorial', 'lockup'],
    lockup: (p) => ({ big: { font: p.display, weight: p.displayWeight, upper: false }, small: { font: 'Geist', weight: 500, italic: false, upper: true, tracking: 260 } }),
  },
];

export const groupById = (id?: string | null) => GROUPS.find((g) => g.id === id) ?? GROUPS[0];
