// Dev only (not loaded by the app). Paste into the console or inject with a <script> into a scratch copy, then e.g.
//   await probe("lead gen", () => document.getElementById("lg-on").click(), () => [...document.querySelectorAll("#form > *")])
// Needs a real viewport (a hidden 0-width pane gives nonsense) and timers, not requestAnimationFrame.
// jump detector (keyed): run a trigger, freeze the animations it started, sample watched elements every 10ms of the
// longest animation, compare with just before / just after. Elements are matched by a key (ids or class+text),
// so re-rendered DOM still lines up. Reports elements whose first/last step or a mid step is out of line.
const keyOf = e => e.dataset.tid ? 't' + e.dataset.tid : e.dataset.sub ? 's' + e.dataset.sub + e.className.split(' ')[0] : e.dataset.id ? 'c' + e.dataset.id + e.className.split(' ')[0] : e.dataset.fk || e.dataset.key || (e.id ? '#' + e.id : e.className + '|' + e.textContent.trim().slice(0, 30));
window.probe = async (name, trigger, watch, { settle = 60 } = {}) => {
  const els = () => (typeof watch === 'function' ? watch() : [...document.querySelectorAll(watch)]).filter(Boolean);
  const snap = () => new Map(els().map(e => { const r = e.getBoundingClientRect(); return [keyOf(e), [r.top, r.left, r.height, r.width]]; }));
  const before = snap();
  const old = new Set(document.getAnimations());
  trigger();
  await new Promise(r => setTimeout(r, 0));
  const anims = document.getAnimations().filter(a => !old.has(a));
  anims.forEach(a => a.pause());
  const end = Math.max(0, ...anims.map(a => { const t = a.effect.getComputedTiming(); return (t.delay || 0) + (t.activeDuration || 0); }));
  const frames = [before];
  for (let t = 0; t <= end; t += 10) { anims.forEach(a => { a.currentTime = Math.min(t, end - 0.01); }); frames.push(snap()); }
  anims.forEach(a => a.finish());
  await new Promise(r => setTimeout(r, settle));
  frames.push(snap());
  const keys = new Set(frames.flatMap(f => [...f.keys()]));
  const out = [];
  for (const k of keys) {
    const steps = [];
    for (let i = 1; i < frames.length; i++) {
      const a = frames[i - 1].get(k), b = frames[i].get(k);
      steps.push(a && b ? Math.max(...[0, 1, 2, 3].map(j => Math.abs(a[j] - b[j]))) : null);
    }
    const first = steps[0], last = steps[steps.length - 1], mid = steps.slice(1, -1).filter(x => x != null);
    const maxMid = Math.max(0, ...mid), avg = mid.reduce((a, b) => a + b, 0) / Math.max(1, mid.length);
    if ((first ?? 0) > 1 || (last ?? 0) > 1 || maxMid > Math.max(6, avg * 4)) out.push(`${k.slice(0, 24)}: f${first?.toFixed(1)} l${last?.toFixed(1)} m${maxMid.toFixed(1)}~${avg.toFixed(1)}`);
  }
  return { name, anims: anims.length, end: Math.round(end), jumps: out };
};
