// How long would "doing everything" take each day? Walking time for a tour of every job, plus question count.
// Run from game/: node tools/watch_day_budget.js .   (Ladi, Nov 18: sizes the day clock and the per-job minute)
const G = require('path').resolve(process.argv[2] || '.');
global.window = {};
require(G + '/js/watch-art.js'); const WW = require(G + '/js/watch-world.js'); window.SD = window.SD || {}; window.SD.watchWorld = WW;
require(G + '/js/watch-content.js'); require(G + '/js/watch-town.js');
const SCH = require(G + '/js/watch-schedule.js');
const C = window.WATCH_CONTENT, A = window.WATCH_ART, SPEED = WW.SPEED;
// graph nodes: forks (each side). edges: same-scene walking between nodes, ramps between scenes
const Y = A.town.levelY, ramps = A.town.ramps;
const forks = []; WW.LEVELS.forEach(l => WW.scene(l).spots.filter(s => s.kind === 'fork' && s.to && WW.LEVELS.includes(s.to.scene)).forEach(s => forks.push({ scene: l, x: s.x, to: s.to })));
const rampT = f => { const r = ramps.find(r => (r.from[0] === f.scene && Math.abs(r.from[1] - f.x) < 12) || (r.to[0] === f.scene && Math.abs(r.to[1] - f.x) < 12));
  const p = r ? r.path : [[f.x, Y[f.scene]], [f.to.x, Y[f.to.scene]]]; let n = 0; for (let i = 1; i < p.length; i++) n += Math.hypot(p[i][0] - p[i-1][0], p[i][1] - p[i-1][1]); return n / (SPEED * 0.8); };
function dist(a, b) {   // seconds, Dijkstra over points
  const nodes = [a, b].concat(forks.map(f => ({ scene: f.scene, x: f.x, f })));
  const d = nodes.map(() => Infinity), done = nodes.map(() => false); d[0] = 0;
  for (;;) { let u = -1; for (let i = 0; i < nodes.length; i++) if (!done[i] && d[i] < Infinity && (u < 0 || d[i] < d[u])) u = i; if (u < 0 || u === 1) break; done[u] = true;
    const n = nodes[u];
    nodes.forEach((m, j) => { if (m.scene === n.scene) { const c = Math.abs(m.x - n.x) / SPEED; if (d[u] + c < d[j]) d[j] = d[u] + c; } });
    if (n.f) nodes.forEach((m, j) => { if (m.scene === n.f.to.scene && Math.abs(m.x - n.f.to.x) < 2) { const c = rampT(n.f); if (d[u] + c < d[j]) d[j] = d[u] + c; } }); }
  return d[1];
}
const sp = id => { const s = WW.spot(null, id); return s && { scene: s.level, x: s.x + 34 }; };
function whereIs(who, day) {
  const pl = SCH.planFor(C.schedule, who, day, 'clear'); if (pl) return SCH.resolve(WW, SCH.placeAt(pl, 0.4));
  for (const l of WW.LEVELS) { const s = WW.scene(l).spots.find(s => s.who === who || (s.also || []).includes(who)); if (s) return { scene: l, x: s.x + 34 }; }
  return null;
}
const stepAt = (st, giver, day) => st.at && st.at.who ? whereIs(st.at.who, day) : st.at && st.at.spot ? sp(st.at.spot) : whereIs(giver, day);
const done = {}, out = [];
for (let day = 2; day <= 9; day++) {
  const stops = [], miss = [];
  let qs = 0, jobs = 0;
  (C.minis || []).filter(m => !m.teach && !done[m.id] && m.opens <= day && m.closes >= day).forEach(m => { done[m.id] = 1; const p = whereIs(m.who, day); if (p) stops.push(p); else miss.push(m.who); qs++; jobs++; });
  (C.quests || []).filter(q => !done[q.id] && q.opens <= day && q.closes >= day).forEach(q => {
    done[q.id] = 1; jobs++;
    if (q.kind === 'capstone') { const p = whereIs(q.giver, day); if (p) stops.push(p); return; }
    q.steps.forEach(st => { const p = stepAt(st, q.giver, day); if (p) stops.push(p); else miss.push(q.id); if (st.ask) qs++; });
  });
  // tour: start at base camp, nearest neighbour, end at Pell's gate. Consecutive stops at the same place cost nothing.
  let at = sp('base-camp'), left = stops.slice(), walk = 0;
  while (left.length) { let bi = 0, bd = Infinity; left.forEach((p, i) => { const t = dist(at, p); if (t < bd) { bd = t; bi = i; } }); walk += bd; at = left.splice(bi, 1)[0]; }
  walk += dist(at, sp('pell-gate'));
  out.push({ day, jobs, questions: qs, stops: stops.length, walk: Math.round(walk), miss: [...new Set(miss)].join(',') });
}
console.table(out);
const avgW = out.reduce((n, o) => n + o.walk, 0) / out.length, avgQ = out.reduce((n, o) => n + o.questions, 0) / out.length, avgJ = out.reduce((n, o) => n + o.jobs, 0) / out.length;
console.log({ avgWalk: Math.round(avgW), avgQuestions: avgQ.toFixed(1), avgJobs: avgJ.toFixed(1), townEndToEnd: Math.round(dist(sp('base-camp'), sp('pell-gate'))) });
