import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/Icon';
import {
  MUSIC_CATS, TRACKS, SFX, autoTrack, renderLoop, renderSfx, playPreview, stopPreview, trackById,
  type SoundSettings, type SfxId, type MusicCat,
} from '../../lib/sound';

interface Props {
  s: SoundSettings;
  set: (p: Partial<SoundSettings>) => void;
  group: string;
  groupName: string;
  events: number;
  upload: { name: string } | null;
  onUpload: (f: File) => void;
  onClearUpload: () => void;
  status: string;
}

type Cat = MusicCat | 'auto' | 'upload';

export default function SoundPanel({ s, set, group, groupName, events, upload, onUpload, onClearUpload, status }: Props) {
  const auto = autoTrack(group);
  const on = s.music !== 'off';
  const initial: Cat = s.music === 'upload' ? 'upload' : s.music === 'auto' || s.music === 'off' ? 'auto' : trackById(s.music).cat;
  const [cat, setCat] = useState<Cat>(initial);
  const [playing, setPlaying] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => () => stopPreview(), []);

  const audition = async (key: string, make: () => Promise<{ buf: AudioBuffer; secs: number; level: number }>) => {
    if (playing === key) { stopPreview(); setPlaying(null); return; }
    stopPreview();
    setLoading(key);
    try {
      const { buf, secs, level } = await make();
      setLoading(null);
      setPlaying(key);
      await playPreview(buf, secs, level, () => setPlaying((p) => (p === key ? null : p)));
    } catch { setLoading(null); setPlaying(null); }
  };
  const playTrack = (id: string) => audition(id, async () => ({ buf: (await renderLoop(trackById(id), 48000)).buf, secs: 15, level: 1.7 }));
  const playFx = (id: SfxId) => audition('fx:' + id, async () => ({ buf: (await renderSfx(id, 48000)).buf, secs: 1.2, level: 1.4 }));

  const list = cat === 'auto' ? [auto] : cat === 'upload' ? [] : TRACKS.filter((t) => t.cat === cat);
  const selected = (id: string) => (cat === 'auto' ? s.music === 'auto' : s.music === id);
  const toggleFx = (id: SfxId) => set({ sfx: s.sfx.includes(id) ? s.sfx.filter((x) => x !== id) : [...s.sfx, id] });
  const btn = (key: string) => (loading === key ? <span className="spin sm" /> : <Icon name={playing === key ? 'pause' : 'playTri'} size={13} />);

  return (
    <>
      <div className="card">
        <div className="card-h">
          <div className="card-t row"><Icon name="music" size={16} /> Music</div>
          <button className={'toggle' + (on ? ' on' : '')} onClick={() => set({ music: on ? 'off' : 'auto' })} aria-label="Music" />
        </div>
        {on ? (
          <>
            <div className="seg small wrap">
              <button className={cat === 'auto' ? 'on' : ''} onClick={() => { setCat('auto'); set({ music: 'auto' }); }} title={`Picked for the ${groupName} style`}>Auto</button>
              {MUSIC_CATS.map((c) => <button key={c.id} className={cat === c.id ? 'on' : ''} onClick={() => setCat(c.id)}>{c.name}</button>)}
              <button className={cat === 'upload' ? 'on' : ''} onClick={() => setCat('upload')}>Your music</button>
            </div>
            {cat === 'upload' ? (
              upload ? (
                <div className={'trk' + (s.music === 'upload' ? ' on' : '')} onClick={() => set({ music: 'upload' })}>
                  <span className="trk-p static"><Icon name="music" size={13} /></span>
                  <div className="trk-b"><b>{upload.name}</b><span>{s.music === 'upload' ? 'In use · loops to fit, ducked like the built-in tracks' : 'Tap to use this track'}</span></div>
                  <button className="trk-x" onClick={(e) => { e.stopPropagation(); onClearUpload(); }} aria-label="Remove uploaded music"><Icon name="trash" size={14} /></button>
                </div>
              ) : (
                <button className="trk add" onClick={() => fileRef.current?.click()}>
                  <span className="trk-p static"><Icon name="upload" size={13} /></span>
                  <div className="trk-b"><b>Upload a track</b><span>MP3, M4A or WAV. Use music you have the rights to.</span></div>
                </button>
              )
            ) : (
              <div className="trks">
                {list.map((t) => (
                  <div key={t.id} className={'trk' + (selected(t.id) ? ' on' : '')} onClick={() => set({ music: cat === 'auto' ? 'auto' : t.id })} role="button" tabIndex={0}>
                    <button className="trk-p" onClick={(e) => { e.stopPropagation(); playTrack(t.id); }} aria-label={`Preview ${t.name}`}>{btn(t.id)}</button>
                    <div className="trk-b"><b>{cat === 'auto' ? `${t.name} · for ${groupName}` : t.name}</b><span>{t.note}</span></div>
                    <span className="trk-m">{t.bpm} BPM</span>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }} />
            <label className="slider" style={{ marginTop: 14 }}>Music level<input type="range" min={0.1} max={1} step={0.05} value={s.musicVol} onChange={(e) => set({ musicVol: +e.target.value })} /></label>
            <div className="opt-row">
              <div><b>Duck under voice</b><span>{s.duck ? 'Dips while you talk, rises in gaps and at the end' : 'Stays at one level under the voice'}</span></div>
              <button className={'toggle' + (s.duck ? ' on' : '')} onClick={() => set({ duck: !s.duck })} aria-label="Duck under voice" />
            </div>
          </>
        ) : (
          <div className="hint">Off. Turn on for a soft music bed under your voice.</div>
        )}
      </div>

      <div className="card">
        <div className="card-h">
          <div className="card-t row"><Icon name="wave" size={16} /> Sound effects</div>
          <div className="card-n">{s.sfx.length ? `${events} in this video` : 'Off'}</div>
        </div>
        <div className="sfx">
          {SFX.map((x) => (
            <div key={x.id} className={'sfx-c' + (s.sfx.includes(x.id) ? ' on' : '')}>
              <button className="sfx-t" onClick={() => toggleFx(x.id)} aria-pressed={s.sfx.includes(x.id)}>
                <span className="sfx-k">{s.sfx.includes(x.id) && <Icon name="checkMark" size={12} />}</span>
                <span><b>{x.name}</b><span>{x.note}</span></span>
              </button>
              <button className="trk-p" onClick={() => playFx(x.id)} aria-label={`Preview ${x.name}`}>{btn('fx:' + x.id)}</button>
            </div>
          ))}
        </div>
        <label className="slider" style={{ marginTop: 12 }}>Effects level<input type="range" min={0.1} max={1} step={0.05} value={s.sfxVol} onChange={(e) => set({ sfxVol: +e.target.value })} /></label>
        <div className="hint">Pick one or two. They land on layout changes and titles, never more than one of a kind every 2 s.</div>
      </div>
      <div className="note-sm">{status || 'All music and effects are made on your device, so they are free to use anywhere.'}</div>
    </>
  );
}
