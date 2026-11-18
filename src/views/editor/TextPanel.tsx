import { useState } from 'react';
import type { CaptionStyleId, Pack } from '../../lib/packs';
import { FONT_FAMILIES, LAYERS, WEIGHT_NAMES, resolveText, type LayerId, type TextOverrides, type TextProps } from '../../lib/text';
import Icon from '../../components/Icon';
import Scrub from './Scrub';

interface Props {
  pack: Pack; W: number; H: number; capStyle: CaptionStyleId; text: TextOverrides; sel: LayerId | null;
  onSel: (l: LayerId) => void; onChange: (l: LayerId, patch: Partial<TextProps>) => void; onReset: (l: LayerId, keys?: (keyof TextProps)[]) => void;
}

const TEXT_KEYS: (keyof TextProps)[] = ['font', 'weight', 'italic', 'size', 'align', 'tracking', 'leading', 'textCase'];
const LOOK_KEYS: (keyof TextProps)[] = ['fill', 'accent', 'stroke', 'strokeColor', 'shadow', 'bg', 'bgColor', 'bgOpacity', 'fade'];
const XF_KEYS: (keyof TextProps)[] = ['x', 'y', 'scale', 'rotation', 'opacity'];

function Section({ title, onReset, children }: { title: string; onReset: () => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="tp-sec">
      <div className="tp-sh">
        <button className="tp-st" onClick={() => setOpen(!open)}><span className={'chev' + (open ? ' on' : '')}>›</span>{title}</button>
        <button className="ibtn" title="Reset" onClick={onReset}><Icon name="reset" size={15} /></button>
      </div>
      {open && <div className="tp-body">{children}</div>}
    </div>
  );
}

const Swatch = ({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) => (
  <label className="tp-sw" title={label}>
    <i style={{ background: value }} />
    <input type="color" value={/^#[0-9a-f]{6}$/i.test(value) ? value : '#ffffff'} onChange={(e) => onChange(e.target.value.toUpperCase())} />
    <span>{value.toUpperCase()}</span>
  </label>
);

export default function TextPanel({ pack, W, H, capStyle, text, sel, onSel, onChange, onReset }: Props) {
  const id = sel ?? 'hook';
  const p = resolveText(id, pack, W, H, capStyle, text);
  const meta = LAYERS.find((l) => l.id === id)!;
  const set = (patch: Partial<TextProps>) => onChange(id, patch);
  const fam = FONT_FAMILIES.find((f) => f.name === p.font);
  const weights = fam?.weights ?? [400, 500, 600, 700, 800, 900];
  const pct = id === 'headline' || id === 'body';
  const [custom, setCustom] = useState('');

  return (
    <div className="tp">
      <div className="tp-layers">
        {LAYERS.map((l) => {
          const v = resolveText(l.id, pack, W, H, capStyle, text).visible;
          return (
            <div key={l.id} className={'tp-layer' + (id === l.id ? ' on' : '')} onClick={() => onSel(l.id)}>
              {l.placed ? <button className="ibtn" title={v ? 'Hide' : 'Show'} onClick={(e) => { e.stopPropagation(); onChange(l.id, { visible: !v }); }}><Icon name={v ? 'eye' : 'eyeOff'} size={15} /></button> : <span className="ibtn ghost" />}
              <Icon name="type" size={16} />
              <span className="tp-ln">{l.name}</span>
              {!l.placed && <span className="tp-tag">all graphics</span>}
            </div>
          );
        })}
      </div>
      <div className="note" style={{ margin: '2px 2px 10px' }}>{meta.hint}{meta.placed ? ' · drag it on the video to move it.' : '.'}</div>

      <Section title="Text" onReset={() => onReset(id, TEXT_KEYS)}>
        <select className="sel" value={fam ? p.font : '__custom'} onChange={(e) => { if (e.target.value !== '__custom') set({ font: e.target.value, weight: (FONT_FAMILIES.find((f) => f.name === e.target.value)?.weights.includes(p.weight) ? p.weight : FONT_FAMILIES.find((f) => f.name === e.target.value)?.weights.slice(-1)[0]) ?? 400 }); }} style={{ fontFamily: p.font }}>
          {FONT_FAMILIES.map((f) => <option key={f.name} value={f.name} style={{ fontFamily: f.name }}>{f.name}</option>)}
          {!fam && <option value="__custom">{p.font} (installed)</option>}
        </select>
        <div className="row" style={{ marginTop: 6 }}>
          <input className="tp-in" placeholder="Installed font, e.g. Monaco" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && custom.trim()) { set({ font: custom.trim() }); setCustom(''); } }} />
          <button className="btn btn-g btn-sm" disabled={!custom.trim()} onClick={() => { set({ font: custom.trim() }); setCustom(''); }}>Use</button>
        </div>
        <div className="row" style={{ marginTop: 8 }}>
          <select className="sel" value={p.weight} onChange={(e) => set({ weight: +e.target.value })}>
            {weights.map((w) => <option key={w} value={w}>{WEIGHT_NAMES[w] ?? w}</option>)}
          </select>
          <button className={'ibtn sq' + (p.italic ? ' on' : '')} title="Italic" onClick={() => set({ italic: !p.italic })}><Icon name="italic" size={16} /></button>
        </div>
        <div className="tp-row">
          <span className="tp-l">{pct ? 'Size %' : 'Font Size'}</span>
          <input type="range" min={pct ? 50 : 16} max={pct ? 160 : id === 'behind' ? 600 : 220} value={p.size} onChange={(e) => set({ size: +e.target.value })} />
          <Scrub value={p.size} min={pct ? 30 : 8} max={pct ? 250 : 800} onChange={(v) => set({ size: v })} />
        </div>
        <div className="tp-btnrow">
          {(['left', 'center', 'right'] as const).map((a) => <button key={a} className={'ibtn sq' + (p.align === a ? ' on' : '')} title={`Align ${a}`} onClick={() => set({ align: a })}><Icon name={a === 'left' ? 'alignL' : a === 'center' ? 'alignC' : 'alignR'} size={16} /></button>)}
          <span className="tp-div" />
          {([['as-is', 'Aa', 'As typed'], ['upper', 'AA', 'All caps'], ['lower', 'aa', 'Lowercase'], ['title', 'Ab', 'Title Case']] as const).map(([c, lb, t]) => (
            <button key={c} className={'ibtn sq txt' + (p.textCase === c ? ' on' : '')} title={t} onClick={() => set({ textCase: c })}>{lb}</button>
          ))}
        </div>
        <div className="tp-grid">
          <span className="tp-k" title="Tracking (letter spacing, 1/1000 em)"><b>VA</b> Tracking <Scrub value={p.tracking} min={-200} max={800} step={5} onChange={(v) => set({ tracking: v })} /></span>
          <span className="tp-k" title="Leading (line height)"><Icon name="size" size={15} /> Leading <Scrub value={p.leading} min={60} max={200} onChange={(v) => set({ leading: v })} suffix="%" /></span>
        </div>
      </Section>

      <Section title="Appearance" onReset={() => onReset(id, LOOK_KEYS)}>
        <div className="tp-row"><span className="tp-l">Fill</span><Swatch value={p.fill} onChange={(v) => set({ fill: v })} label="Fill" /></div>
        {id !== 'behind' && id !== 'body' && <div className="tp-row"><span className="tp-l">Highlight</span><Swatch value={p.accent} onChange={(v) => set({ accent: v })} label="Highlight word colour" /></div>}
        {id !== 'headline' && id !== 'body' && (
          <>
            <div className="tp-row">
              <span className="tp-l"><input type="checkbox" checked={p.stroke > 0} onChange={(e) => set({ stroke: e.target.checked ? 4 : 0 })} /> Stroke</span>
              {p.stroke > 0 && <><Scrub value={p.stroke} min={1} max={30} onChange={(v) => set({ stroke: v })} suffix="px" /><Swatch value={p.strokeColor} onChange={(v) => set({ strokeColor: v })} label="Stroke colour" /></>}
            </div>
            <div className="tp-row">
              <span className="tp-l"><input type="checkbox" checked={p.shadow > 0} onChange={(e) => set({ shadow: e.target.checked ? 14 : 0 })} /> Shadow</span>
              {p.shadow > 0 && <Scrub value={p.shadow} min={1} max={60} onChange={(v) => set({ shadow: v })} suffix="px" />}
            </div>
          </>
        )}
        {(id === 'hook' || id === 'caption') && (
          <div className="tp-row">
            <span className="tp-l"><input type="checkbox" checked={p.bg} onChange={(e) => set({ bg: e.target.checked })} /> Background</span>
            {p.bg && <><Swatch value={p.bgColor} onChange={(v) => set({ bgColor: v })} label="Background colour" /><Scrub value={p.bgOpacity} min={0} max={100} onChange={(v) => set({ bgOpacity: v })} suffix="%" /></>}
          </div>
        )}
        {id === 'hook' && (
          <div className="tp-row">
            <span className="tp-l">Fade</span>
            <div className="seg small" style={{ flex: 1 }}>{(['auto', 'bottom', 'top', 'none'] as const).map((f) => <button key={f} className={p.fade === f ? 'on' : ''} onClick={() => set({ fade: f })}>{f[0].toUpperCase() + f.slice(1)}</button>)}</div>
          </div>
        )}
      </Section>

      {meta.placed && (
        <Section title="Align and Transform" onReset={() => onReset(id, XF_KEYS)}>
          <div className="tp-btnrow">
            <button className="ibtn sq" title="Left" onClick={() => set({ x: 0.07, align: 'left' })}><Icon name="hStart" size={16} /></button>
            <button className="ibtn sq" title="Centre" onClick={() => set({ x: 0.5, align: 'center' })}><Icon name="hCenter" size={16} /></button>
            <button className="ibtn sq" title="Right" onClick={() => set({ x: 0.93, align: 'right' })}><Icon name="hEnd" size={16} /></button>
            <span className="tp-div" />
            <button className="ibtn sq" title="Top" onClick={() => set({ y: id === 'behind' ? 0.2 : 0.14 })}><Icon name="vStart" size={16} /></button>
            <button className="ibtn sq" title="Middle" onClick={() => set({ y: 0.5 })}><Icon name="vCenter" size={16} /></button>
            <button className="ibtn sq" title="Bottom" onClick={() => set({ y: id === 'hook' ? 0.8 : 0.78 })}><Icon name="vEnd" size={16} /></button>
          </div>
          <div className="tp-row">
            <span className="tp-l">Position</span>
            <span className="tp-xy"><Scrub value={Math.round(p.x * W)} min={0} max={W} onChange={(v) => set({ x: v / W })} /> X</span>
            {p.y < 0
              ? <span className="tp-xy"><button className="linkbtn" onClick={() => set({ y: 0.3 })}>Auto</button> Y</span>
              : <span className="tp-xy"><Scrub value={Math.round(p.y * H)} min={0} max={H} onChange={(v) => set({ y: v / H })} /> Y</span>}
          </div>
          {id === 'behind' && p.y >= 0 && <div className="note" style={{ marginBottom: 6 }}><button className="linkbtn" onClick={() => set({ y: -1 })}>Back to auto</button> — sits just above the head.</div>}
          <div className="tp-row"><span className="tp-l">Scale</span><Scrub value={p.scale} min={10} max={400} onChange={(v) => set({ scale: v })} suffix="%" /></div>
          <div className="tp-row"><span className="tp-l">Rotation</span><Scrub value={p.rotation} min={-180} max={180} onChange={(v) => set({ rotation: v })} suffix="°" /></div>
          <div className="tp-row"><span className="tp-l">Opacity</span><Scrub value={p.opacity} min={0} max={100} onChange={(v) => set({ opacity: v })} suffix="%" /></div>
        </Section>
      )}
    </div>
  );
}
