// The five Pro steps, shown on top of every Pro page.
const STEPS = [
  { k: 'trainer', t: 'Style Trainer', d: '20 refs → style + scene library' },
  { k: 'plan', t: 'Plan Doc', d: 'A/B/C + text layer per beat' },
  { k: 'build', t: 'Build', d: 'Assets, scenes, low-res draft' },
  { k: 'patch', t: 'Patch', d: 'Timecoded fixes, changed parts only' },
  { k: 'qc', t: 'Sound + QC', d: 'Sound pass, −14 LUFS, QC report' },
];
export default function ProFlow({ on }: { on: string }) {
  return (
    <div className="flow" aria-label="Pro workflow">
      {STEPS.map((s, i) => (
        <div key={s.k} className={s.k === on ? 'on' : ''}><i>0{i + 1}</i><b>{s.t}</b>{s.d}</div>
      ))}
    </div>
  );
}
