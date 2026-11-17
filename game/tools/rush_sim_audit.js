// Headless balance check for claim 8 of the Rush, the Night Audit (js/rush-audit.js), against the targets in section
// 12 of the design (project files real-game/v3/claims/claim-8/design.md).
// node tools/rush_sim_audit.js [seeds] [table: main | checks | all] [build names, comma-separated]
// The simulated player has limited attention, as the design asks:
//   - It's in one room at a time. Upstairs it only knows what's placed and visible (gauges, logbooks, traces, the
//     basket), reading costs it time, and it reacts 1.5 to 3 s after it sees something.
//   - Downstairs it answers a review question every 8 s, right 80% of the time, and only a klaxon brings it back up.
// Coins carried in from claim 7: 1. No Night Orders unless the build says so.
const R = require('../js/rush-core.js');
const A = require('../js/rush-audit.js');
const N = +process.argv[2] || 40, TABLE = process.argv[3] || 'main', ONLY = (process.argv[4] || '').split(',').filter(Boolean);
const CARRY = 1;
function rng(seed) { return A.rng(seed); }

// ---- What the player sees: evidence, each pointing at a station and a job (oil or patch) ----
function gaugeEvidence(S) {
  const out = [];
  for (const g of S.audit.gauges) for (const m of g.metrics) {
    const v = g.vals[m.key]; if (g.at == null) continue;
    if (A.breach(m, v)) out.push({ station: g.station, job: m.kind === 'time' ? 'oil' : 'patch', t: g.at, src: 'gauge' });
  }
  return out;
}
function logEvidence(S, src) { return A.logView(S, src).filter(l => l.points).map(l => ({ station: l.points.station, job: l.points.job, t: l.t, src: 'log' })); }
function traceEvidence(trs) {
  const out = [];
  for (const tr of trs) for (const r of tr.rows) if (r.points) out.push({ station: r.points.station, job: r.points.job, t: tr.t, src: 'trace', silent: !!r.pending });
  return out;
}
function queryEvidence(S, res) { return res && res.rows ? res.rows.filter(r => r.points).map(r => ({ station: r.points.station, job: r.points.job, t: S.time, src: 'lens' })) : []; }

// ---- The builds ----
// buy: what to buy and when ({ at: game seconds, or hour: clock hour, after: 'tool' }), in order, as coins allow.
// read: what it reads upstairs. act: how it turns evidence into jobs. down: when it goes downstairs.
const KL = (gauge, metric, o) => Object.assign({ tool: 'alarm', gauge, metric, m: 2, n: 3, missing: 'missing', act: true }, o || {});
// The lesson build (section 12): tracer, an EMF stamp whose two gauges carry klaxons with actions (3 of 4, so a
// passing slowness doesn't send the porter), pins, an Engine tally heartbeat with missing data breaching, triage by
// impact, downstairs when calm, and trusting the klaxons: it comes up for a look every 16 s, not 12.
// No second tally and no 1-second dial: each tally costs a coin an hour, and the lesson can't carry two.
const LESSON = {
  buy: [{ tool: 'tracer' }, { tool: 'stamp', dim: 'station' }, KL('stamp:engine', 'EngineMs', { missing: 'notBreaching', m: 3, n: 4 }), KL('stamp:drawer', 'DrawerMs', { missing: 'notBreaching', m: 3, n: 4 }),
    { tool: 'tally', target: 'engine' }, KL('tally:engine', 'Jobs', { missing: 'breaching' }), { tool: 'pins', hour: 1 }],
  read: ['traces', 'deskLog'], wait: 1, triage: 'impact', down: 'calm', reserve: 1, peek: 16
};
// The first lesson draft: built-in gauges, no actions (kept as a comparison).
const LESSON_BUILTIN = {
  buy: [{ tool: 'tracer' }, KL('desk', 'Duration', { act: false, missing: 'notBreaching' }), KL('counter', '5XXError', { act: false, missing: 'notBreaching' }), { tool: 'pins', hour: 1 },
    { tool: 'tally', target: 'engine', hour: 2 }, KL('tally:engine', 'Jobs', { missing: 'breaching' })],
  read: ['traces', 'deskLog'], wait: 1, triage: 'impact', down: 'calm'
};
const B = {
  blind: { buy: [], read: [], act: 'random', down: 'never' },
  reader: { buy: [], read: ['gauges', 'logs'], wait: 0, triage: 'highest', down: 'never' },
  chaser: { buy: [{ tool: 'tracer' }, KL('desk', 'Errors', { m: 1, n: 1, missing: 'notBreaching' }), KL('desk', 'Duration', { m: 1, n: 1, missing: 'notBreaching' }), KL('drawer', 'SuccessfulRequestLatency', { m: 1, n: 1, missing: 'notBreaching' })],
    read: ['traces'], wait: 0, triage: 'impact', down: 'calm', chase: true },
  alarmsOnly: { buy: [KL('desk', 'Duration', { missing: 'notBreaching' }), KL('desk', 'Errors', { missing: 'notBreaching' }), KL('counter', '5XXError', { missing: 'notBreaching' })],
    read: ['gauges'], wait: 0, triage: 'impact', down: 'calm' },
  tracerOnly: { buy: [{ tool: 'tracer' }], read: ['traces'], wait: 6, triage: 'impact', down: 'never' },
  cheap: { buy: [{ tool: 'stamp', dim: 'station' }, KL('stamp:drawer', 'DrawerMs', { missing: 'notBreaching' }), KL('stamp:engine', 'EngineMs', { missing: 'notBreaching' }), KL('desk', 'Errors', { act: false, missing: 'notBreaching' }), { tool: 'hires', gauge: 'stamp:engine', hour: 4 }],
    read: ['logs', 'lens'], wait: 6, triage: 'impact', down: 'calm' },
  lesson: LESSON,
  everything: { buy: [{ tool: 'tracer' }, { tool: 'pins' }, { tool: 'stamp', dim: 'station' }, { tool: 'tally', target: 'engine' }, { tool: 'tally', target: 'drawer' }, { tool: 'tally', target: 'counter' }, { tool: 'tally', target: 'desk' },
    { tool: 'rule', target: 'counter' }, KL('tally:engine', 'Jobs', { missing: 'breaching' }), KL('desk', 'Errors', { act: false, missing: 'notBreaching' }), KL('desk', 'Duration', { act: false, missing: 'notBreaching' }),
    { tool: 'hires', gauge: 'tally:drawer' }, { tool: 'hires', gauge: 'tally:counter' }, { tool: 'hires', gauge: 'stamp:engine' }, KL('tally:drawer', 'Failed', { missing: 'notBreaching', m: 1, n: 1 })], read: ['traces'], wait: 6, triage: 'impact', down: 'calm', asap: true },
  lessonTicket: Object.assign({}, LESSON, { buy: [{ tool: 'stamp', dim: 'ticket' }].concat(LESSON.buy) }),
  lessonUp: Object.assign({}, LESSON, { down: 'never' }),
  lessonBuiltin: LESSON_BUILTIN
};
// The checks: the lesson build with one buy taken out, first-seen-first-fixed, chasing transients, and the orders.
const without = t => Object.assign({}, LESSON, { buy: LESSON.buy.filter(b => b.tool !== t && !((t === 'tally' || t === 'stamp') && b.gauge && b.gauge.startsWith(t + ':'))) });
const CHECKS = {
  'lesson -tracer': Object.assign(without('tracer'), { buy: without('tracer').buy.filter(b => b.tool !== 'pins'), read: ['gauges', 'logs'] }),
  'lesson -pins': without('pins'),
  'lesson -alarm': without('alarm'),
  'lesson -tally': without('tally'),
  'lesson -stamp': without('stamp'),
  // The 1-second dial isn't in the lesson: this adds a Drawer tally with a Failed klaxon and its 1-second dial.
  'lesson +hires': Object.assign({}, LESSON, { buy: LESSON.buy.concat([{ tool: 'tally', target: 'drawer', hour: 2 }, KL('tally:drawer', 'Failed', { missing: 'notBreaching' }), { tool: 'hires', gauge: 'tally:drawer', hour: 2 }]) }),
  'lesson fifo': Object.assign({}, LESSON, { triage: 'fifo' }),
  'lesson chase': Object.assign({}, LESSON, { wait: 0, chase: true, buy: LESSON.buy.map(b => b.tool === 'alarm' ? Object.assign({}, b, { m: 1, n: 1, act: true }) : b) }),
  'lesson sampling': Object.assign({}, LESSON, { orders: ['sampling'] }),
  'lesson composite OR': Object.assign({}, LESSON, { orders: ['composite'], bell: 'or' }),
  'lesson composite AND': Object.assign({}, LESSON, { orders: ['composite'], bell: 'and' })
};

// ---- One night ----
function gaugeId(S, ref) {
  const [src, st] = ref.includes(':') ? ref.split(':') : ['builtin', ref];
  const g = S.audit.gauges.find(x => x.station === st && x.src === src); return g && g.id;
}
function night(seed, b) {
  const S = R.create(seed, 'audit', b.orders || [], CARRY), a = S.audit, r = rng(seed * 7919 + 13);
  if (process.env.SIM_CAP) S.cap = +process.env.SIM_CAP;
  if (b.bell) A.setBell(S, b.bell);
  const me = { look: 0, room: 'up', free: 0, delay: 1.5 + r() * 1.5, cand: new Map(), done: {}, lastBad: -99, nextQ: 0, buyI: 0, readI: 0, rings: 0, called: false };
  const buys = b.buy.map(x => Object.assign({}, x));
  const tryBuy = () => {
    // In order: each waits for the one before it (and its hour), unless the build buys as soon as it can.
    for (let i = 0; i < buys.length; i++) {
      const x = buys[i]; if (x.done) continue;
      if (x.hour != null && A.hourOf(S) < x.hour) { if (b.asap) continue; return; }
      let target = x.target, opts = { dim: x.dim, metric: x.metric, m: x.m, n: x.n, missing: x.missing, act: x.act };
      if (x.tool === 'alarm' || x.tool === 'hires') target = gaugeId(S, x.gauge);
      if (x.tool === 'stamp') target = 'desk';
      if ((x.tool === 'alarm' || x.tool === 'hires') && target == null) { if (b.asap) continue; return; }
      // A careful build keeps a coin back for the hour's upkeep (once the first buy is in).
      if (b.reserve && i > 0) {
        const U = A.UPKEEP, bill = (a.tracer ? U.tracer : 0) + a.tallies.length * (U.tally || 0) + a.gauges.filter(g => g.hires).length * (U.hires || 0),
          more = x.tool === 'tracer' ? U.tracer : x.tool === 'tally' ? U.tally || 0 : x.tool === 'hires' ? U.hires || 0 : 0;
        if (S.coins - A.costOf(S, x.tool, target, opts) < bill + more + b.reserve - 1) return;
      }
      const why = R.place(S, x.tool, target, opts);
      if (why === '' || why === 'placed') { x.done = true; continue; }
      if (!b.asap) return;
    }
  };
  // Read one source: returns its evidence and what it cost in attention.
  const read = src => {
    if (src === 'gauges') return [gaugeEvidence(S), 0.6];
    if (src === 'logs') { me.readI++; return [logEvidence(S, me.readI % 2 ? 'desk' : 'counter'), 1.5]; }
    // A careful reader trusts Mira's ERROR lines (they name the failing call), not her Duration (it counts the waits).
    if (src === 'deskLog') return [logEvidence(S, 'desk').filter(e => e.job === 'patch'), 1.2];
    if (src === 'traces') {
      if (!a.tracer || a.dark.has('tracer')) return [gaugeEvidence(S), 0.6];
      // With pins, one search finds the refunds and the faults (plus a glance at the latest two); without, open the
      // latest cards one by one.
      if (a.pins) { const seen = new Set(), trs = a.traces.slice(-2); trs.forEach(tr => seen.add(tr.id)); for (const e of ['refund', 'engine', 'drawer', 'counter', 'desk', 'slow']) for (const tr of (A.search(S, e) || []).slice(0, 3)) if (!seen.has(tr.id)) { seen.add(tr.id); trs.push(tr); } return [traceEvidence(trs.filter(tr => tr.t > S.time - 6)), 1.2]; }
      return [traceEvidence(a.traces.slice(-2).filter(tr => tr.t > S.time - 6)), 2.4];
    }
    if (src === 'lens') {
      // A query only when the basket says something's wrong, and there's a coin spare.
      if (S.time - me.lastBad > 3 || S.coins < 3) return [logEvidence(S, 'desk'), 1.5];
      const res = A.query(S, a.stamp && me.readI++ % 2 ? 'downstream' : 'errors');
      return [queryEvidence(S, res).concat(logEvidence(S, 'desk')), 2];
    }
    return [[], 0];
  };
  const prio = c => b.triage === 'fifo' ? -c.first : (c.silent ? 3 : c.job === 'patch' ? 2 : 1) * 1000 - c.first;
  const evs = { faults: 0 };
  R.start(S);
  while (!S.over) {
    R.step(S, 1 / 30);
    for (const e of R.drain(S)) {
      if (e.type === 'basket' && e.bad) me.lastBad = S.time;
      if (['mend', 'mendWrong', 'wasted'].includes(e.type)) me.done[e.station] = S.time;
      // Downstairs, only a klaxon reaches you (with One bell, only the bell).
      if (e.type === 'ring') { me.rings++; if (me.room === 'down') { me.room = 'up'; A.setDown(S, false); me.free = S.time + 1; } }
    }
    if (S.over) break;
    tryBuy();
    if (S.time < me.free) continue;
    if (me.room === 'down') {
      if (S.time >= me.nextQ) { A.reviewAnswer(S, null, r() < 0.8); me.nextQ = S.time + 8; }
      // It also comes back up for a look every 12 s.
      if (S.time - me.downAt > (b.peek || 12)) { me.room = 'up'; A.setDown(S, false); me.free = S.time + 1; }
      continue;
    }
    // Upstairs.
    if (b.act === 'random') {
      if (S.time - me.lastBad < 0.2 && a.jobs.length < 1 && a.porter.phase !== 'walk' && a.porter.phase !== 'work') {
        const st = A.STATIONS[Math.floor(r() * 4)]; A.queueJob(S, st, r() < 0.5 ? 'oil' : 'patch'); me.free = S.time + me.delay;
      }
      continue;
    }
    // One source a look, in turn (attention is the budget).
    let cost = 0, ev = [];
    if (b.read.length) { const [e, c] = read(b.read[me.look++ % b.read.length]); ev = e; cost = c; }
    // A klaxon in ALARM (or its lamp) is evidence too: its gauge's station.
    for (const al of a.alarms) if (al.state === 'ALARM') {
      const g = a.gauges.find(x => x.id === al.gauge), m = g.metrics.find(x => x.key === al.metric);
      // A klaxon on a dark tally rings for the unpaid bill, not the station: a careful player sees the lamp out.
      if (g.src === 'tally' && a.dark.has('tally:' + g.station)) continue;
      if (b.chase || g.src !== 'builtin') ev.push({ station: g.station, job: m.kind === 'time' ? 'oil' : 'patch', t: g.at, src: 'klaxon', silent: m.kind === 'beat' });
    }
    // Evidence older than the porter's last visit to that station is stale.
    for (const e of ev) {
      // (Tickets already inside when the porter finished still carry the old fault: give it a few seconds.)
      if (e.t <= (me.done[e.station] || -99) + 5 || e.t < S.time - 8) continue;
      const k = e.station + '|' + e.job, c = me.cand.get(k);
      if (c) { c.last = S.time; c.silent = c.silent || e.silent; } else me.cand.set(k, { station: e.station, job: e.job, first: S.time, last: S.time, silent: !!e.silent });
    }
    for (const [k, c] of me.cand) if (c.last < S.time - 10 || (me.done[c.station] || -1) > c.first) me.cand.delete(k);
    // Act: the most urgent first, after the reaction delay, and (with a wait) only once it has lasted.
    const ready = [...me.cand.values()].filter(c => S.time - c.first >= me.delay && (c.silent || S.time - c.first >= (b.wait || 0) + me.delay))
      .sort((x, y) => b.triage === 'highest' ? y.last - x.last : prio(y) - prio(x));
    for (const c of ready) {
      if (a.jobs.length >= A.T.jobs) break;
      if (A.queueJob(S, c.station, c.job) === '') me.cand.delete(c.station + '|' + c.job);
    }
    // Downstairs when nothing's red: no klaxon in ALARM, nothing waiting to be acted on, nothing bad in the basket lately.
    const red = a.alarms.some(al => al.state === 'ALARM') || me.cand.size || S.time - me.lastBad < 3;
    if (red) me.redAt = S.time;
    if (b.down === 'calm' && !red && S.time - (me.redAt || 0) > 5) { me.room = 'down'; me.downAt = S.time; A.setDown(S, true); me.free = S.time + 1; continue; }
    me.free = S.time + Math.max(0.4, cost);
  }
  return { S, me };
}

function run(name, b) {
  const t = { win: 0, lost: 0, wrong: 0, wasted: 0, down: 0, coins: 0, dark: 0, darkRuns: 0, reviews: 0, two: 0, three: 0, faults: 0, mended: 0, cleared: 0, rings: 0, lostWins: [], spillWin: 0 };
  const perSeed = [];
  for (let s = 1; s <= N; s++) {
    const { S } = night(s, b), a = S.audit, st = a.stats;
    const won = S.over === 'win'; perSeed.push(won);
    t.win += won; t.lost += S.spill; t.wrong += st.wrong; t.wasted += st.wasted; t.down += st.downT / Math.max(1, st.downT + st.upT);
    t.coins += S.coins; t.dark += st.darkHours; t.darkRuns += st.darkHours > 0; t.reviews += a.cellar.right; t.faults += st.faults; t.mended += st.mended; t.cleared += st.cleared; t.rings += st.rings;
    if (st.span) { t.two += st.two / st.span; t.three += st.three / st.span; }
  }
  const f = x => (x / N).toFixed(1);
  return { build: name, win: Math.round(100 * t.win / N) + '%', lost: f(t.lost), wrong: f(t.wrong), wasted: f(t.wasted), down: Math.round(100 * t.down / N) + '%', coinsEnd: f(t.coins), darkRuns: Math.round(100 * t.darkRuns / N) + '%',
    reviews: f(t.reviews), faults: f(t.faults), mended: f(t.mended), cleared: f(t.cleared), two: Math.round(100 * t.two / N) + '%', three: Math.round(100 * t.three / N) + '%', perSeed };
}
module.exports = { night, run, B, CHECKS, LESSON };
if (require.main === module) {
const rows = [];
const sets = TABLE === 'checks' ? CHECKS : TABLE === 'all' ? Object.assign({}, B, CHECKS) : B;
for (const [name, b] of Object.entries(sets)) if (!ONLY.length || ONLY.includes(name)) rows.push(run(name, b));
console.table(rows.map(r => { const o = Object.assign({}, r); delete o.perSeed; return o; }));
// The worst 5% of seeds for the lesson build: the seeds where the other builds lose most, and the lesson's record on them.
const lesson = rows.find(r => r.build === 'lesson');
if (lesson && rows.length > 2) {
  const hard = Array.from({ length: N }, (_, i) => i).map(i => ({ i, n: rows.filter(r => !r.perSeed[i]).length })).sort((x, y) => y.n - x.n).slice(0, Math.max(2, Math.ceil(N * 0.05)));
  console.log('lesson on the hardest seeds:', hard.filter(h => lesson.perSeed[h.i]).length + '/' + hard.length);
}
}
