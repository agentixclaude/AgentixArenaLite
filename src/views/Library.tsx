import { useEffect, useRef, useState } from 'react';
import { PACKS, FONT_LOADS, CAPTION_STYLES, packById, type CaptionStyleId } from '../lib/packs';
import { renderDemo } from '../lib/render';
import { GROUPS, MOTIFS, type GroupId } from '../lib/looks';
import Icon from '../components/Icon';
import DeviceNote from '../components/DeviceNote';

type Demo = { el: HTMLCanvasElement; packId: string; cap?: CaptionStyleId; capOnly?: boolean };

/** Animates only the canvases on screen, at ~24 fps, to keep the page light. */
function useDemoLoop() {
  const demos = useRef(new Map<string, Demo>());
  const visible = useRef(new Set<string>());
  const io = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    Promise.all(FONT_LOADS.map((f) => document.fonts.load(f))).catch(() => {});
    io.current = new IntersectionObserver((es) => es.forEach((e) => { const k = (e.target as HTMLElement).dataset.k!; if (e.isIntersecting) visible.current.add(k); else visible.current.delete(k); }));
    demos.current.forEach((d) => io.current!.observe(d.el));
    let raf = 0, last = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (now - last < 40) return;
      last = now;
      const t = (now - t0) / 1000;
      let i = 0;
      demos.current.forEach((d, k) => {
        i++;
        if (!visible.current.has(k)) return;
        renderDemo(d.el.getContext('2d')!, d.el.width, d.el.height, packById(d.packId), t + i * 0.37, d.cap, d.capOnly);
      });
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); io.current?.disconnect(); };
  }, []);
  return (k: string, d: Omit<Demo, 'el'>) => (el: HTMLCanvasElement | null) => {
    if (!el) { demos.current.delete(k); return; }
    el.dataset.k = k;
    demos.current.set(k, { el, ...d });
    io.current?.observe(el);
  };
}

interface Props { current: string; currentCap: string; onPick: (id: string) => void; onPickCap: (id: string) => void; onUse: (id: string) => void }

export default function Library({ current, currentCap, onPick, onPickCap, onUse }: Props) {
  const reg = useDemoLoop();
  const [tab, setTab] = useState<'presets' | 'captions'>('presets');
  const [cat, setCat] = useState<'all' | GroupId>('all');
  const demoPack = current === 'auto' ? 'launch' : current;

  return (
    <div className="page">
      <div className="page-head">
        <h1 className="h1">Library</h1>
        <DeviceNote />
      </div>
      <p className="lede">Ready-made looks by subject, and caption templates you can mix with any of them.</p>
      <div className="seg" style={{ maxWidth: 360, marginBottom: 22 }}>
        <button className={tab === 'presets' ? 'on' : ''} onClick={() => setTab('presets')}>Presets · {PACKS.length}</button>
        <button className={tab === 'captions' ? 'on' : ''} onClick={() => setTab('captions')}>Captions · {CAPTION_STYLES.length}</button>
      </div>

      {tab === 'presets' ? (
        <>
          <div className={'lauto' + (current === 'auto' ? ' on' : '')}>
            <div className="auto-ic"><Icon name="wand" size={30} /></div>
            <div className="lauto-t">
              <b>Auto {current === 'auto' && <span className="tag-on">Default</span>}</b>
              <div>Reads what you say and picks the closest preset from all {PACKS.length}.</div>
            </div>
            <div className="grid2">
              <button className="btn btn-g btn-sm" onClick={() => onPick('auto')}>Set default</button>
              <button className="btn btn-o btn-sm" onClick={() => onUse('auto')}>Use now</button>
            </div>
          </div>
          <div className="cats" role="tablist" aria-label="Categories">
            <button className={cat === 'all' ? 'on' : ''} onClick={() => setCat('all')}>All <span>{PACKS.length}</span></button>
            {GROUPS.map((g) => (
              <button key={g.id} className={cat === g.id ? 'on' : ''} onClick={() => setCat(g.id)} title={g.note}>{g.name} <span>{PACKS.filter((p) => p.group === g.id).length}</span></button>
            ))}
          </div>
          {GROUPS.filter((g) => cat === 'all' || cat === g.id).map((g) => (
            <section key={g.id}>
              <div className="lgroup"><h2>{g.name}</h2><span>{g.note}</span></div>
              <div className="lgrid">
                {PACKS.filter((p) => p.group === g.id).map((p) => (
                  <div key={p.id} className={'lcard' + (current === p.id ? ' on' : '')}>
                    <div className="lprev"><canvas ref={reg('p-' + p.id, { packId: p.id })} width={270} height={480} /></div>
                    <div className="lbody">
                      <div className="lname"><span className="subj" style={{ background: p.bg, color: p.accent, borderColor: p.bg2 }}><Icon name={p.icon} size={17} /></span>{p.subject} {current === p.id && <span className="tag-on">Default</span>}</div>
                      <div className="ltheme">{p.name} · {MOTIFS.find((m) => m.id === p.motif)?.name} · {CAPTION_STYLES.find((c) => c.id === p.capStyle)?.name} captions</div>
                      <div className="palette">{[p.bg, p.bg2, p.ink, p.accent].map((c, i) => <i key={i} style={{ background: c }} />)}</div>
                      <div className="lblurb">{p.blurb}</div>
                      <div className="grid2" style={{ marginTop: 8 }}>
                        <button className="btn btn-g btn-sm" onClick={() => onPick(p.id)}>Set default</button>
                        <button className="btn btn-o btn-sm" onClick={() => onUse(p.id)}>Use now</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </>
      ) : (
        <div className="cgrid">
          <div className={'ccard' + (currentCap === 'auto' ? ' on' : '')}>
            <div className="cprev auto-card small"><div><div className="auto-ic"><Icon name="captions" size={30} /></div><div className="lblurb">Each preset uses its own caption template.</div></div></div>
            <div className="lbody">
              <div className="lname">Preset's own {currentCap === 'auto' && <span className="tag-on">Default</span>}</div>
              <button className="btn btn-g btn-sm" onClick={() => onPickCap('auto')}>Set default</button>
            </div>
          </div>
          {CAPTION_STYLES.map((c) => (
            <div key={c.id} className={'ccard' + (currentCap === c.id ? ' on' : '')}>
              <div className="cprev"><canvas ref={reg('c-' + c.id, { packId: demoPack, cap: c.id, capOnly: true })} width={360} height={360} /></div>
              <div className="lbody">
                <div className="lname">{c.name} {currentCap === c.id && <span className="tag-on">Default</span>}</div>
                <div className="lblurb">{c.note}</div>
                <button className="btn btn-g btn-sm" onClick={() => onPickCap(c.id)}>Set default</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
