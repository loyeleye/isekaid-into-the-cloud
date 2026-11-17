// The Rush, claim 8: the Night Audit (the Watch Room). Rules only, with no drawing, so tools/rush_sim_audit.js can
// run them headless; js/rush.js draws them. rush-core.js hands a claim with engine 'audit' to init() and step() here.
// Design: project files game-modes/lost-and-found-real/real-game/v3/claims/claim-8/design.md (one continuous night
// with overlapping faults and porter triage, Ladi's call).
//
// The AWS behind each rule (DVA-C02 domain 4, troubleshooting and optimization), kept true to the docs:
//   - The tube runs Counter (API Gateway) -> Mira's desk (a Lambda function) -> out. Inside her work Mira calls the
//     Drawer (DynamoDB) and then the Engine (an app on a server), and waits for each. So her Duration counts the
//     time she waits on calls, and a failed call fails her invocation. The Counter gives up on a ticket after 8 s
//     (its integration timeout, scaled down); Mira's own function timeout is 6 s.
//     https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
//   - Built-in gauges are standard resolution: one data point a "minute" (6 game seconds), the average over it. AWS
//     service metrics are standard by default, so the 1-second dial only goes on a custom metric (the stamp's or a
//     tally's). Its alarm uses a 10-second period, one game second.
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/publishingMetrics.html
//   - The Engine isn't an AWS service: no built-in gauge and no log. The Drawer (DynamoDB) has metrics but writes no
//     log of your function's work. Mira's function and the Counter log for you.
//   - The EMF stamp writes Mira's call timings into her log lines in the embedded metric format, and CloudWatch
//     pulls the metrics out (no PutMetricData call, no cloudwatch:PutMetricData permission). A ticket cut off by
//     her timeout never flushes, so its numbers never arrive. A ticket-number dimension makes a metric per ticket.
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch_Embedded_Metric_Format_Specification.html
//   - The tally is PutMetricData from inside a cabinet: it works on the Engine too, and every call is billed
//     (upkeep). It publishes each finished job (Jobs, a heartbeat) and a 0 or 1 per job for failures (Failed, whose
//     Average is the failure rate). No finished jobs means no data points at all.
//   - Klaxons are metric alarms: OK, ALARM or INSUFFICIENT_DATA, M of N datapoints, and a missing-data treatment
//     (missing, notBreaching, breaching, ignore). Actions run only on a state change. A klaxon that acts rings the
//     bell (SNS), and the porter, who's subscribed, takes a job.
//     https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
//   - The tracer is X-Ray active tracing. The root (the Counter) makes the sampling decision and Mira follows the
//     trace header: by default the first request each "second" (a reservoir, here every 2.5 game s) plus 5%. A
//     trace has the Counter's segment, Lambda's two (AWS::Lambda and AWS::Lambda::Function), and subsegments for the
//     two calls; DynamoDB shows as an inferred node. Pins are annotations (indexed, searchable with
//     annotation[route] = "refund"); notes are metadata (free, not indexed). Filter expressions on service() and
//     responsetime work without annotations. The rule card is a sampling rule, and only works on the root.
//     https://docs.aws.amazon.com/xray/latest/devguide/xray-concepts.html
//   - The lens is a Logs Insights query: pay per query, it only sees log groups that exist (the Counter's and
//     Mira's), and lines written before the stamp went on have no stamp fields.
(function (root) {
  const SD = root.SD = root.SD || {};
  const T = {
    tubeIn: 0.5, pipe: 0.4, tubeOut: 0.6, counter: 0.4, deskPre: 0.4, deskPost: 0.4, drawer: 0.4, engine: 0.6,
    seats: 4, windows: 3, deadline: 8, fnTimeout: 6,
    // Fault strength: a slow station's extra seconds; how often an error fault fails a ticket; a burst's on and off.
    // A fault gets worse the longer it runs (a backlog builds, retries pile up): its strength starts at sev0 and
    // reaches full after ramp seconds. So a quick mend is cheap and a neglected fault floods the ink.
    slow: 5, errP: 0.25, burstOn: 2, burstOff: 14, transient: [6, 12], sev0: 0.25, ramp: 60, hang0: 0.1, hangRamp: 30, hangMax: 0.6,
    // The porter: the walk to any cabinet, then oiling, patching, or restarting a silent station.
    walk: 0.6, oil: 1.5, patch: 1.8, restart: 2.5, jobs: 3,
    // Gauges: the standard period (a "minute") and the 1-second dial's; the tracer's reservoir and its rate after.
    min: 6, sec: 1, reservoir: 2.5, sampleP: 0.05,
    // Alarm thresholds: average seconds per gauge, and a failure rate over 0.4.
    thr: { counter: 4.5, desk: 3, drawer: 1.5, drawerMs: 1.5, engineMs: 1.8 }, rateThr: 0.4,
    fee: 0, float: 0, bonusEvery: 12, perDim: 10, reviewGap: 2, internEvery: 9, internWrong: 0.25, tray: 3,
    logKeep: 60, traceKeep: 12, recKeep: 20
  };
  const STATIONS = ['counter', 'desk', 'drawer', 'engine'];
  const NAME = { counter: 'Counter', desk: 'Mira', drawer: 'Drawer', engine: 'Engine' };
  // Which stations each fault kind can hit. Silent is the Engine only: a self-run server can hang; DynamoDB doesn't.
  const WHERE = { slow: STATIONS, error: STATIONS, refund: ['engine', 'drawer', 'desk'], burst: ['drawer', 'counter'], silent: ['engine'] };
  const KINDS = ['slow', 'error', 'refund', 'burst', 'silent'];
  const COST = { tracer: 2, pins: 1, rule: 1, alarm: 1, stamp: 1, tally: 1, hires: 1, lens: 1, intern: 1 };
  const UPKEEP = { tracer: 1, rule: 0, tally: 0, hires: 1 };
  function rng(seed) {
    let a = seed >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  const ev = (S, type, data) => S.events.push(Object.assign({ type, t: S.time }, data || {}));
  const rid = id => ((Math.imul(id, 2654435761) >>> 0).toString(16) + '0000').slice(0, 4);
  const hourOf = (S, t) => Math.min(S.audit.night.hours - 1, Math.floor((t == null ? S.time : t) / S.audit.night.hourSecs));
  function clock(S, t) {
    const N = S.audit.night, m = Math.floor(((t == null ? S.time : t) / N.hourSecs) * 60), h = (N.start + Math.floor(m / 60)) % 24;
    return String(h).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }

  // ---- The fault schedule (section 7): fixed lessons first, then seeded gaps, favouring kinds not seen yet ----
  function faultPlan(rand, night) {
    const H = night.hourSecs, plan = [], seen = new Set();
    const pick = a => a[Math.floor(rand() * a.length)];
    const add = (at, station, kind, transient) => {
      const f = { at, station, kind, transient: !!transient && kind !== 'silent' };
      if (f.transient) f.len = T.transient[0] + rand() * (T.transient[1] - T.transient[0]);
      plan.push(f); seen.add(kind); return f;
    };
    // 22:20, always: Mira slow, the tutorial. 23:xx, always: the decoy, the Drawer or the Engine slow.
    add(H / 3, 'desk', 'slow', false);
    add(H + 3 + rand() * 6, rand() < 0.5 ? 'drawer' : 'engine', 'slow', false);
    let t = 2 * H + 2 + rand() * 4, transients = 0, decoys = 1;
    const last = (night.hours - 1) * H + H * 40 / 60;
    while (t <= last) {
      const h = Math.min(night.hours - 1, Math.floor(t / H));
      let kind;
      // Guarantees: the first refund-error in 00-01, the first burst in 02-03, the silent Engine 03:00 to 04:30,
      // a second decoy after 03:00.
      if (!seen.has('refund')) kind = 'refund';
      else if (h >= 4 && !seen.has('burst')) kind = 'burst';
      else if (h >= 5 && !plan.some(f => f.kind === 'silent')) kind = 'silent';
      else if (h >= 5 && decoys < 2) kind = 'decoy';
      else {
        // Unseen kinds first; then a mix (silent at most once more, late on).
        const fresh = KINDS.filter(k => !seen.has(k) && k !== 'silent');
        const pool = fresh.length ? fresh : ['slow', 'error', 'error', 'refund', 'burst', 'slow'].concat(h >= 6 && plan.filter(f => f.kind === 'silent').length < 2 ? ['silent'] : []);
        kind = pick(pool);
      }
      let station;
      if (kind === 'decoy') { kind = 'slow'; station = rand() < 0.5 ? 'drawer' : 'engine'; decoys++; }
      else station = pick(WHERE[kind]);
      // The first transient is guaranteed by 01:00-02:00; after that about 35%.
      const tr = kind !== 'silent' && ((h >= 3 && transients === 0) || rand() < night.transientP);
      if (tr) transients++;
      add(t, station, kind, tr);
      const g = night.gap[Math.max(2, h)];
      t += g[0] + rand() * (g[1] - g[0]);
    }
    // The silent Engine is guaranteed between 03:00 and 04:30: if the gaps skipped past it, put it in at 03:40.
    if (!plan.some(f => f.kind === 'silent' && f.at >= 5 * H && f.at <= 6.5 * H)) add(5 * H + 2 * H / 3, 'engine', 'silent', false);
    plan.sort((a, b) => a.at - b.at);
    plan.forEach((f, i) => { f.n = i; });
    return plan;
  }
  // Arrival times: a Poisson-ish stream at each hour's rate, with seeded jitter.
  function spawns(rand, night) {
    const out = [], end = night.hours * night.hourSecs - 4;
    let t = 0.6;
    while (t < end) {
      const h = Math.floor(t / night.hourSecs), r = night.rate[h];
      out.push({ t, hour: h, refund: rand() < night.refund });
      t += Math.min(3 / r, Math.max(0.25, -Math.log(1 - rand()) / r));
    }
    return out;
  }

  // ---- Gauges: built-in ones for the AWS stations, custom ones from the stamp and the tally ----
  const METRIC = {
    counter: [{ key: 'Latency', kind: 'time', thr: T.thr.counter }, { key: '5XXError', kind: 'rate' }],
    desk: [{ key: 'Duration', kind: 'time', thr: T.thr.desk }, { key: 'Errors', kind: 'rate' }],
    drawer: [{ key: 'SuccessfulRequestLatency', kind: 'time', thr: T.thr.drawer, okOnly: true }, { key: 'SystemErrors', kind: 'rate' }]
  };
  function gauge(S, station, src, metrics, rec) {
    const a = S.audit, g = { id: a.gaugeN++, station, src, metrics, rec, hires: false, last: Math.floor(S.time), vals: {}, at: null, needle: 0 };
    a.gauges.push(g); return g;
  }

  function init(S, C) {
    const N = C.night;
    S.cap = C.cap; S.close = N.hours * N.hourSecs; S.spawns = spawns(S.rand, N); S.handled = 0;
    // The night's float: Mira leaves a few coins in the till (on top of what's carried over). No hourly fee after.
    S.coins += T.float;
    // Default sampling pinned: no rule card on the belt (and the tracer's thread is free).
    S.belt = C.belt.concat(C.extras || []).filter(t => !(t === 'rule' && S.orders.has('sampling')));
    const a = S.audit = {
      night: N, hour: 0, plan: faultPlan(rng(((S.seed >>> 0) ^ 0x51ed27) >>> 0 || 7), N), planI: 0, live: {}, cleared: {}, history: [],
      seen: new Set(), firsts: new Set(), seenStation: { counter: true, desk: true, drawer: true, engine: false },
      queue: [], seatsBusy: 0, cq: [], windowsBusy: 0, rec: { counter: [], desk: [], drawer: [], engine: [], drawerMs: [], engineMs: [] },
      gauges: [], gaugeN: 1, alarms: [], alarmN: 1, bell: { op: 'or', state: 'OK' },
      tracer: false, pins: false, rule: null, sampleT: -99, traces: [], traceN: 0,
      stamp: null, stampAt: null, cardN: 0, tallies: [], logs: { counter: [], desk: [] },
      porter: { at: 'bench', phase: 'idle', job: null, t: 0, dur: 0 }, jobs: [], jobN: 1, dark: new Set(),
      down: false, bonusT: 0, mail: 0, queries: 0,
      cellar: { ready: 0, asked: 0, right: 0, wrong: 0, intern: false, tray: [], internT: 0, internI: 0, byIntern: 0, caught: 0, missed: 0, checked: 0 },
      stats: { faults: 0, mended: 0, cleared: 0, wrong: 0, wasted: 0, late: 0, failed: 0, silent: 0, downT: 0, upT: 0, upkeep: 0, darkHours: 0, fees: 0, bonus: 0, two: 0, three: 0, span: 0, jobsAlarm: 0, rings: 0 }
    };
    for (const st of ['counter', 'desk', 'drawer']) gauge(S, st, 'builtin', METRIC[st], st);
    return S;
  }

  // ---- Faults ----
  function liveCount(a) { return Object.keys(a.live).length; }
  function startDue(S) {
    const a = S.audit, h = hourOf(S);
    for (const f of a.plan) {
      if (f.started || f.at > S.time) continue;
      // A station already faulting, or this hour's cap reached: the fault waits for a slot.
      if (a.live[f.station] || liveCount(a) >= a.night.maxLive[h]) continue;
      f.started = S.time; a.stats.faults++;
      const live = { kind: f.kind, station: f.station, since: S.time, transient: f.transient, until: f.transient ? S.time + f.len : Infinity, n: f.n };
      a.live[f.station] = live; a.history.push(live);
      const first = !a.seen.has(f.kind); a.seen.add(f.kind);
      ev(S, 'faultStart', { station: f.station, kind: f.kind, first, transient: f.transient });
      if (f.kind === 'slow' && (f.station === 'drawer' || f.station === 'engine') && !a.firsts.has('decoy')) { a.firsts.add('decoy'); ev(S, 'decoy', { station: f.station }); }
      if (liveCount(a) >= 2 && !a.firsts.has('overlap')) { a.firsts.add('overlap'); ev(S, 'overlap', { n: liveCount(a) }); }
    }
  }
  function endFault(S, station, why) {
    const a = S.audit, f = a.live[station]; if (!f) return;
    delete a.live[station]; f.end = S.time; f.how = why;
    // A restarted Engine answers the calls still hanging on it: those tickets go on (if Mira's 6 s allow).
    if (f.kind === 'silent') for (const k of S.tickets) if (k.phase === 'desk' && k.silent) release(S, k);
    if (why === 'cleared') { a.cleared[station] = S.time; a.stats.cleared++; ev(S, 'faultClear', { station, kind: f.kind, transient: true }); }
  }
  // Does this station fail this ticket right now?
  const sev = (S, f) => Math.min(1, T.sev0 + (S.time - f.since) / T.ramp);
  function fails(S, station, k, at) {
    const f = S.audit.live[station]; if (!f) return false;
    if (f.kind === 'error') return S.rand() < T.errP * sev(S, f);
    if (f.kind === 'refund') return !!k.refund && S.rand() < 0.6 * sev(S, f);
    if (f.kind === 'burst') return ((at - f.since) % (T.burstOn + T.burstOff)) < T.burstOn;
    return false;
  }
  const slowAt = (S, st) => { const f = S.audit.live[st]; return f && f.kind === 'slow' ? T.slow * sev(S, f) : 0; };
  // A silent station hangs: at first some calls never come back, within seconds all of them.
  const hangs = (S, st) => { const f = S.audit.live[st]; return !!f && f.kind === 'silent' && S.rand() < Math.min(T.hangMax, T.hang0 + (S.time - f.since) / T.hangRamp); };

  // ---- Tickets (capsules) ----
  function release(S, k) {
    const seg = k.segs.find(x => x.pending); if (!seg) return;
    const now = S.time - k.td;
    seg.pending = false; seg.d = Math.max(0, now - seg.t0) + T.engine;
    const t = seg.t0 + seg.d + T.deskPost;
    k.segs.push({ who: 'desk', t0: seg.t0 + seg.d, d: T.deskPost, fail: false, pending: false });
    k.silent = false;
    if (t > T.fnTimeout) { k.timeout = true; k.dfail = 'timeout'; k.dur = T.fnTimeout; }
    else { k.timeout = false; k.dfail = null; k.dur = t; }
  }
  function go(k, phase, dur) { k.phase = phase; k.t = 0; k.dur = dur; }
  function lose(S, why) {
    S.spill++; S.lost = (S.lost || 0) + 1; ev(S, 'spill', { why });
    if (S.spill >= S.cap && !S.over) { S.over = 'lose'; ev(S, 'lose'); }
  }
  function pushLog(S, src, text, points, note) {
    const L = S.audit.logs[src]; L.push({ t: S.time, at: clock(S), text, points: points || null, note: note || '' });
    if (L.length > T.logKeep) L.shift();
  }
  function record(S, ch, v, fail) { const r = S.audit.rec[ch]; r.push({ t: S.time, v, fail: !!fail }); while (r.length && r[0].t < S.time - T.recKeep) r.shift(); }
  // The Counter answers the caller: its access log line, its metrics, and a spill if the answer is late or an error.
  function respond(S, k, status, integ) {
    if (k.responded) return; k.responded = true;
    const a = S.audit, lat = S.time - k.t0, own = lat - (integ || 0), path = k.refund ? '/refund' : '/ticket';
    record(S, 'counter', lat, status >= 500);
    if (a.tallies.includes('counter') && !a.dark.has('tally:counter')) record(S, 'tally:counter', lat, status >= 500);
    let pts = null, note = '';
    if (status === 500) pts = { station: 'counter', job: 'patch' }, note = 'The Counter failed it itself: it never called Mira (integ -).';
    else if (own > 1.5) pts = { station: 'counter', job: 'oil' }, note = 'Most of the time was spent at the Counter itself, not waiting on Mira.';
    else if (status === 504) note = 'The Counter gave up waiting. Something behind it is slow or stuck.';
    else if (status === 502) note = 'Mira sent back an error. The Counter just passes it on.';
    pushLog(S, 'counter', `POST ${path} ${status} resp=${Math.round(lat * 1000)}ms integ=${status === 500 ? '-' : Math.round((integ || 0) * 1000) + 'ms'}`, pts, note);
    if (status >= 500) {
      const why = k.silent ? 'silent' : status === 504 ? 'late' : 'failed';
      k.bad = status === 504 ? 'late' : 'failed';
      a.stats[why === 'silent' ? 'silent' : why]++;
      ev(S, status === 504 ? 'late' : 'failed', { id: k.id, station: k.failAt || null });
      lose(S, why);
    } else S.handled++;
  }
  function spawn(S, sp) {
    const k = { id: S.nextId++, refund: sp.refund, hour: sp.hour, phase: '', t: 0, dur: 0, rid: '' };
    k.rid = rid(k.id); go(k, 'in', T.tubeIn); S.tickets.push(k);
  }
  // Sampling at the root: the rule card's route at 100%, else the reservoir, then 5%.
  function sample(S, k) {
    const a = S.audit; if (!a.tracer || a.dark.has('tracer')) return false;
    if (a.rule && !a.dark.has('rule') && (a.rule === 'all' || k.refund)) return true;
    if (S.time - a.sampleT >= T.reservoir) { a.sampleT = S.time; return true; }
    return S.rand() < T.sampleP;
  }
  // The Counter has three windows: a slow Counter backs its callers up (the deadline counts from their arrival).
  function arriveCounter(S, k) { k.t0 = S.time; k.traced = sample(S, k); go(k, 'cqueue', 0); S.audit.cq.push(k); }
  function enterCounter(S, k) {
    S.audit.windowsBusy++; k.win = true;
    k.ct = T.counter + slowAt(S, 'counter'); k.cfail = fails(S, 'counter', k, S.time);
    go(k, 'counter', k.ct);
  }
  // Mira takes the ticket: her timeline is set now (her own work, the Drawer call, the Engine call, her own work).
  function enterDesk(S, k) {
    const a = S.audit; a.seatsBusy++; k.td = S.time; k.seat = true;
    const half = slowAt(S, 'desk') / 2, segs = [];
    let t = 0, fail = null;
    const push = (who, d, f, pend) => { segs.push({ who, t0: t, d, fail: !!f, pending: !!pend }); t += d; if (f) fail = who; };
    push('desk', T.deskPre + half, false);
    { const d = T.drawer + slowAt(S, 'drawer'); push('drawer', d, fails(S, 'drawer', k, S.time + t)); }
    if (!fail) {
      if (hangs(S, 'engine')) push('engine', Infinity, false, true);
      else { const d = T.engine + slowAt(S, 'engine'); push('engine', d, fails(S, 'engine', k, S.time + t)); }
    }
    if (!fail && isFinite(t)) push('desk', T.deskPost + half, fails(S, 'desk', k, S.time + t));
    let total = t, timeout = false;
    if (total > T.fnTimeout) { total = T.fnTimeout; timeout = true; fail = 'timeout'; }
    k.segs = segs; k.dfail = fail; k.timeout = timeout; k.silent = timeout && segs.some(s => s.pending);
    go(k, 'desk', total);
  }
  function endDesk(S, k) {
    const a = S.audit; a.seatsBusy--; k.seat = false;
    const dur = k.dur, segs = k.segs, ended = s => s.t0 + s.d <= dur + 1e-9;
    const dr = segs.find(s => s.who === 'drawer'), en = segs.find(s => s.who === 'engine');
    record(S, 'desk', dur, !!k.dfail);
    if (a.tallies.includes('desk') && !a.dark.has('tally:desk')) record(S, 'tally:desk', dur, !!k.dfail);
    if (dr && ended(dr)) { record(S, 'drawer', dr.d, dr.fail); if (a.tallies.includes('drawer') && !a.dark.has('tally:drawer')) record(S, 'tally:drawer', dr.d, dr.fail); }
    if (en && ended(en)) { record(S, 'engine', en.d, en.fail); if (a.tallies.includes('engine') && !a.dark.has('tally:engine')) record(S, 'tally:engine', en.d, en.fail); }
    // Mira's log: the stamp's EMF line (only if the invocation finished: a timeout never flushes), then any ERROR,
    // then REPORT.
    const id = k.rid, path = k.refund ? ' /refund' : '';
    if (a.stamp && !a.dark.has('stamp') && !k.timeout) {
      const dm = dr && ended(dr) && !dr.fail ? Math.round(dr.d * 1000) : null, em = en && ended(en) && !en.fail ? Math.round(en.d * 1000) : null;
      if (dm != null) record(S, 'drawerMs', dm / 1000);
      if (em != null) record(S, 'engineMs', em / 1000);
      const f = [a.stamp.dim === 'ticket' ? `"ticket":"${id}"` : null, dm != null ? `"drawerMs":${dm}` : null, em != null ? `"engineMs":${em}` : null].filter(Boolean).join(',');
      let pts = null, note = 'Both calls came back in good time.';
      if (dm != null && dm / 1000 > T.thr.drawerMs && !(em != null && em > dm)) pts = { station: 'drawer', job: 'oil' }, note = 'The Drawer call took most of her time.';
      else if (em != null && em / 1000 > T.thr.engineMs) pts = { station: 'engine', job: 'oil' }, note = 'The Engine call took most of her time.';
      pushLog(S, 'desk', `EMF ${a.stamp.dim === 'ticket' ? '' : id + ' '}{${f}}`, pts, note);
      if (a.stamp.dim === 'ticket') { a.cardN++; if (a.cardN % T.perDim === 0) ev(S, 'cardinality', { n: a.cardN }); }
    }
    if (k.timeout) pushLog(S, 'desk', `${id} Task timed out after ${T.fnTimeout.toFixed(2)} seconds`, null, 'She timed out waiting on something. This log doesn\'t say on what.');
    else if (k.dfail === 'drawer') pushLog(S, 'desk', `ERROR ${id} DynamoDB InternalServerError${path}`, { station: 'drawer', job: 'patch' }, 'The Drawer call failed: DynamoDB sent back a 500.');
    else if (k.dfail === 'engine') pushLog(S, 'desk', `ERROR ${id} Engine call: HTTP 500${path}`, { station: 'engine', job: 'patch' }, 'The Engine call failed with a 500.');
    else if (k.dfail === 'desk') pushLog(S, 'desk', `ERROR ${id} TypeError: slip is undefined${path}`, { station: 'desk', job: 'patch' }, 'Mira\'s own code threw. No call failed.');
    pushLog(S, 'desk', `REPORT ${id} Duration: ${Math.round(dur * 1000)} ms Mem: 88 MB`, dur > T.thr.desk ? { station: 'desk', job: 'oil' } : null,
      dur > T.thr.desk ? 'Her Duration is high. It counts her waits on calls too, so it can\'t say which part was slow.' : 'A normal run.');
    if (k.traced) trace(S, k);
    if (!k.responded) respond(S, k, k.dfail ? 502 : 200, S.time - k.t1);
    go(k, 'out', T.tubeOut);
  }
  // A trace: the Counter's segment, Lambda's two, and the two calls as subsegments (the Drawer an inferred node).
  // A fault shows red on every segment it passes back through (the Counter's too); own: the segment's own share.
  function trace(S, k) {
    const a = S.audit, rows = [];
    const row = (name, aws, station, d, fault, depth, extra) => rows.push(Object.assign({ name, aws, station, d, fault: !!fault, depth }, extra || {}));
    const total = S.time - k.t0;
    row('Counter', 'API Gateway', 'counter', total, k.cfail || !!k.dfail || k.bad === 'late', 0, { own: (k.t1 != null ? k.t1 : S.time) - k.t0, ownFault: !!k.cfail, t0: 0 });
    if (k.td != null) {
      const dur = S.time - k.td, off = k.td - k.t0;
      row('Mira', 'AWS::Lambda', null, dur, !!k.dfail, 0, { service: true, t0: off });
      row('Mira', 'AWS::Lambda::Function', 'desk', dur, !!k.dfail, 1, { t0: off, own: k.segs.filter(s => s.who === 'desk').reduce((x, s) => x + Math.min(s.d, Math.max(0, dur - s.t0)), 0), ownFault: k.dfail === 'desk' });
      for (const s of k.segs) if (s.who !== 'desk') row(NAME[s.who], s.who === 'drawer' ? 'DynamoDB' : 'HTTP', s.who, s.pending ? Math.max(0, dur - s.t0) : Math.min(s.d, Math.max(0, dur - s.t0)), s.fail, 2, { t0: off + s.t0, pending: s.pending, inferred: s.who === 'drawer', ownFault: s.fail });
    }
    const tr = { id: ++a.traceN, rid: k.rid, t: S.time, at: clock(S), refund: k.refund, ann: a.pins ? { route: k.refund ? 'refund' : 'ticket' } : null,
      meta: { ticket: k.rid, route: k.refund ? 'refund' : 'ticket', caller: 'c' + (k.id % 9) }, rows, resp: S.time - k.t0 };
    for (const r of tr.rows) r.points = rowPoints(r);
    a.traces.push(tr); if (a.traces.length > T.traceKeep) a.traces.shift();
    ev(S, 'trace', { id: tr.id });
  }
  // What a trace row says, read literally: a fault (or a call that never came back) means patch it; a long bar on a
  // station with its own threshold means oil it. The Function row's bar includes its subsegments.
  // Read the way X-Ray is read: the deepest red bar is where the fault is, and a long bar whose own share is short
  // spent its time waiting on the bars below it.
  function rowPoints(r) {
    if (r.service || !r.station) return null;
    if (r.ownFault || r.pending) return { station: r.station, job: 'patch' };
    if (r.fault) return null;
    const d = r.own != null ? r.own : r.d, lim = r.station === 'drawer' ? T.thr.drawer : r.station === 'engine' ? T.thr.engineMs : 1.5;
    return d > lim ? { station: r.station, job: 'oil' } : null;
  }
  function stepTickets(S, dt) {
    const a = S.audit;
    for (const k of S.tickets.slice()) {
      k.t += dt;
      // The Counter's deadline: past 8 s it answers 504 and the caller's gone, whatever Mira's still doing.
      if (k.t0 != null && !k.responded && S.time - k.t0 >= T.deadline) {
        respond(S, k, 504, S.time - (k.t1 || S.time));
        if (k.phase === 'queue' || k.phase === 'cqueue') {
          a.queue = a.queue.filter(x => x !== k); a.cq = a.cq.filter(x => x !== k);
          if (k.traced) trace(S, k); go(k, 'out', T.tubeOut);
        }
        if (S.over) return;
      }
      if (k.phase === 'queue' || k.phase === 'cqueue' || k.t < k.dur) continue;
      switch (k.phase) {
        case 'in': arriveCounter(S, k); break;
        case 'counter':
          a.windowsBusy--; k.win = false;
          if (k.responded) go(k, 'out', T.tubeOut);
          else if (k.cfail) { k.failAt = 'counter'; respond(S, k, 500, 0); if (k.traced) trace(S, k); go(k, 'out', T.tubeOut); }
          else { k.t1 = S.time; go(k, 'pipe', T.pipe); }
          break;
        case 'pipe': go(k, 'queue', 0); a.queue.push(k); break;
        case 'desk': k.failAt = k.dfail === 'timeout' ? 'engine' : k.dfail; endDesk(S, k); break;
        case 'out': S.tickets = S.tickets.filter(x => x !== k); ev(S, 'basket', { id: k.id, bad: k.bad || '', refund: k.refund, traced: !!k.traced }); break;
      }
      if (S.over) return;
    }
    while (a.cq.length && a.windowsBusy < T.windows) enterCounter(S, a.cq.shift());
    while (a.queue.length && a.seatsBusy < T.seats) enterDesk(S, a.queue.shift());
  }

  // ---- Gauges and klaxons ----
  function metricVal(S, g, m, from) {
    const r = S.audit.rec[m.ch || g.rec].filter(x => x.t > from);
    if (m.kind === 'beat') { const n = r.filter(x => !x.fail).length; return n ? n : null; }
    if (!r.length) return null;
    if (m.kind === 'rate') return r.filter(x => x.fail).length / r.length;
    const ok = m.okOnly ? r.filter(x => !x.fail) : r; if (!ok.length) return null;
    return ok.reduce((s, x) => s + x.v, 0) / ok.length;
  }
  const breach = (m, v) => v != null && (m.kind === 'time' ? v > m.thr : m.kind === 'rate' ? v > T.rateThr : false);
  function publish(S) {
    const a = S.audit;
    for (const g of a.gauges) {
      const hires = g.hires && !a.dark.has('hires:' + g.id), P = hires ? T.sec : T.min;
      if (S.time - g.last < P) continue;
      g.last = S.time;
      // A dark tally publishes nothing (no PutMetricData calls, so no data points).
      const dark = g.src === 'tally' && a.dark.has('tally:' + g.station) || g.src === 'stamp' && a.dark.has('stamp');
      for (const m of g.metrics) g.vals[m.key] = dark ? null : metricVal(S, g, m, S.time - P);
      g.at = S.time; ev(S, 'gauge', { id: g.id });
      for (const al of a.alarms) if (al.gauge === g.id) evalAlarm(S, al, g);
    }
  }
  function evalAlarm(S, al, g) {
    const m = g.metrics.find(x => x.key === al.metric), v = g.vals[al.metric];
    al.hist.push(v == null ? 'M' : breach(m, v) ? 'B' : 'O'); if (al.hist.length > al.n) al.hist.shift();
    const last = al.hist[al.hist.length - 1];
    let to = al.state;
    if (al.missing === 'ignore' && last === 'M') to = al.state === 'INSUFFICIENT_DATA' ? 'INSUFFICIENT_DATA' : al.state;
    else {
      const pts = al.hist.map(p => p !== 'M' ? p : al.missing === 'breaching' ? 'B' : al.missing === 'notBreaching' ? 'O' : null).filter(Boolean);
      if (!pts.length) to = al.missing === 'missing' ? 'INSUFFICIENT_DATA' : al.state;
      else to = pts.filter(p => p === 'B').length >= al.m ? 'ALARM' : 'OK';
    }
    if (to === al.state) return;
    const from = al.state; al.state = to;
    ev(S, 'alarm', { id: al.id, from, to, station: g.station, metric: al.metric });
    if (S.orders.has('composite')) { bellEval(S); return; }
    if (to === 'ALARM') ring(S, al, g);
  }
  // The bell (SNS): the porter's subscribed. A time metric gets an oiling; failures and a stopped heartbeat get a patch.
  function ring(S, al, g) {
    const a = S.audit; a.stats.rings++; ev(S, 'ring', { id: al.id, station: g.station });
    if (!al.act) return;
    const m = g.metrics.find(x => x.key === al.metric);
    if (queueJob(S, g.station, m.kind === 'time' ? 'oil' : 'patch', 'alarm') === '') a.stats.jobsAlarm++;
  }
  // One bell (composite alarm): the klaxons feed it, joined with AND or OR, and only it rings.
  function bellEval(S) {
    const a = S.audit, al = a.alarms; if (!al.length) return;
    const on = a.bell.op === 'and' ? al.every(x => x.state === 'ALARM') : al.some(x => x.state === 'ALARM');
    const to = on ? 'ALARM' : 'OK'; if (to === a.bell.state) return;
    a.bell.state = to; ev(S, 'bell', { to });
    if (to === 'ALARM') { const first = al.find(x => x.state === 'ALARM'); ring(S, first, a.gauges.find(g => g.id === first.gauge)); }
  }

  // ---- The porter ----
  function queueJob(S, station, job, from) {
    const a = S.audit;
    if (!STATIONS.includes(station) || !['oil', 'patch'].includes(job)) return 'bad';
    if (a.jobs.some(j => j.station === station && j.job === job) || (a.porter.job && a.porter.job.station === station && a.porter.job.job === job)) return 'dup';
    if (a.jobs.length >= T.jobs) { ev(S, 'jobsFull', { station, job, from }); return 'full'; }
    const j = { id: a.jobN++, station, job, from: from || 'player', at: S.time };
    a.jobs.push(j); ev(S, 'job', { station, job, from: j.from });
    return '';
  }
  function reorder(S, from, to) { const j = S.audit.jobs; if (from < 0 || from >= j.length || to < 0 || to >= j.length) return; j.splice(to, 0, j.splice(from, 1)[0]); }
  function cancel(S, i) { const j = S.audit.jobs; if (i >= 0 && i < j.length) { j.splice(i, 1); ev(S, 'cancel', { i }); } }
  function stepPorter(S, dt) {
    const a = S.audit, p = a.porter;
    p.t += dt;
    if ((p.phase === 'idle' || p.phase === 'back') && a.jobs.length) {
      p.job = a.jobs.shift(); p.from = p.at; p.phase = 'walk'; p.t = 0; p.dur = p.at === p.job.station ? 0.3 : T.walk;
      ev(S, 'porter', { phase: 'walk', station: p.job.station });
      return;
    }
    if (p.phase === 'back' && p.t >= p.dur) { p.phase = 'idle'; p.at = 'bench'; return; }
    if (p.phase === 'walk' && p.t >= p.dur) {
      p.at = p.job.station; p.phase = 'work'; p.t = 0;
      const f = a.live[p.at];
      p.dur = p.job.job === 'oil' ? T.oil : f && f.kind === 'silent' ? T.restart : T.patch;
      return;
    }
    if (p.phase === 'work' && p.t >= p.dur) {
      const j = p.job, f = a.live[j.station], match = f && (j.job === 'oil') === (f.kind === 'slow');
      if (match) { endFault(S, j.station, 'mended'); a.stats.mended++; ev(S, 'mend', { station: j.station, job: j.job, kind: f.kind, from: j.from }); }
      else if (!f && a.cleared[j.station] != null && a.cleared[j.station] >= j.at - 3) { a.stats.wasted++; ev(S, 'wasted', { station: j.station, job: j.job, from: j.from }); }
      else { a.stats.wrong++; const paid = S.coins > 0; if (paid) S.coins--; ev(S, 'mendWrong', { station: j.station, job: j.job, from: j.from, paid, kind: f ? f.kind : null }); }
      p.job = null; p.phase = 'back'; p.t = 0; p.dur = T.walk;
    }
  }

  // ---- The clock: the fee and upkeep on the hour ----
  function onHour(S) {
    const a = S.audit, h = a.hour;
    S.coins += T.fee; a.stats.fees += T.fee;
    const bill = [];
    if (a.tracer && !S.orders.has('sampling')) bill.push(['tracer', UPKEEP.tracer]);
    if (a.rule && UPKEEP.rule) bill.push(['rule', UPKEEP.rule]);
    if (UPKEEP.tally) for (const st of a.tallies) bill.push(['tally:' + st, UPKEEP.tally]);
    for (const g of a.gauges) if (g.hires && UPKEEP.hires) bill.push(['hires:' + g.id, UPKEEP.hires]);
    if (a.stamp && a.stamp.dim === 'ticket') { const n = Math.floor(a.cardN / T.perDim); if (n) bill.push(['stamp', n]); }
    let paid = 0; const dark = [];
    for (const [k, c] of bill) {
      if (S.coins >= c) { S.coins -= c; paid += c; a.dark.delete(k); }
      else { a.dark.add(k); dark.push(k); a.stats.darkHours++; }
    }
    a.stats.upkeep += paid;
    ev(S, 'hour', { hour: h, clock: clock(S), fee: T.fee, upkeep: paid, dark });
    if (dark.length) ev(S, 'dark', { tools: dark });
    // Letters (that Night Order) land in the cellar's mail slot on every second hour.
    if (S.orders.has('letters') && h % 2 === 0) { a.mail++; ev(S, 'mail', { n: a.mail }); }
  }

  // ---- Placing ----
  const custom = g => g && g.src !== 'builtin';
  function costOf(S, tool) { return tool === 'alarm' && S.orders.has('composite') ? 0 : COST[tool]; }
  function canPlace(S, tool, target, opts) {
    const a = S.audit;
    if (!COST[tool] && tool !== 'alarm') return 'unknown';
    if (tool !== 'intern' && !S.belt.includes(tool)) return 'locked';
    if (S.over) return 'over';
    if (['tracer', 'pins', 'rule', 'stamp'].includes(tool) && (tool === 'stamp' ? a.stamp : a[tool])) return 'placed';
    if ((tool === 'pins' || tool === 'rule') && !a.tracer) return 'needs';
    if (tool === 'rule' && target !== 'counter') return target === 'desk' ? 'ruleDesk' : 'where';
    if (tool === 'stamp' && target !== 'desk') return 'stampWhere';
    if (tool === 'tally') { if (!STATIONS.includes(target)) return 'where'; if (a.tallies.includes(target)) return 'placed'; }
    if (tool === 'alarm' || tool === 'hires') {
      const g = a.gauges.find(x => x.id === target); if (!g) return 'where';
      if (tool === 'hires') { if (!custom(g)) return 'hiresBuiltin'; if (g.hires) return 'placed'; }
      if (tool === 'alarm') { const m = (opts && opts.metric) || g.metrics[0].key; if (a.alarms.some(x => x.gauge === g.id && x.metric === m)) return 'placed'; }
    }
    if (tool === 'intern' && a.cellar.intern) return 'placed';
    if (S.coins < costOf(S, tool)) return 'coins';
    return '';
  }
  function place(S, tool, target, opts) {
    const why = canPlace(S, tool, target, opts); if (why) return why;
    const a = S.audit, o = opts || {};
    S.coins -= costOf(S, tool); S.placed.push(tool);
    if (tool === 'tracer') { a.tracer = true; a.seenStation.engine = true; }
    if (tool === 'pins') a.pins = true;
    if (tool === 'rule') a.rule = o.route === 'all' ? 'all' : 'refund';
    if (tool === 'stamp') {
      a.stamp = { dim: o.dim === 'ticket' ? 'ticket' : 'station' }; a.stampAt = S.time; a.seenStation.engine = true;
      gauge(S, 'drawer', 'stamp', [{ key: 'DrawerMs', kind: 'time', thr: T.thr.drawerMs, ch: 'drawerMs' }], 'drawerMs');
      gauge(S, 'engine', 'stamp', [{ key: 'EngineMs', kind: 'time', thr: T.thr.engineMs, ch: 'engineMs' }], 'engineMs');
    }
    if (tool === 'tally') {
      a.tallies.push(target); a.seenStation[target] = true;
      gauge(S, target, 'tally', [{ key: 'Jobs', kind: 'beat' }, { key: 'Failed', kind: 'rate' }], 'tally:' + target);
      a.rec['tally:' + target] = [];
    }
    if (tool === 'hires') a.gauges.find(x => x.id === target).hires = true;
    if (tool === 'alarm') {
      const g = a.gauges.find(x => x.id === target);
      a.alarms.push({ id: a.alarmN++, gauge: g.id, metric: o.metric || g.metrics[0].key, m: o.m || 2, n: o.n || 3, missing: o.missing || 'missing', act: o.act !== false, state: 'INSUFFICIENT_DATA', hist: [] });
    }
    if (tool === 'intern') { a.cellar.intern = true; a.cellar.internT = S.time; }
    ev(S, 'place', { tool, target });
    return '';
  }
  // Alarms can be edited after they're up (CloudWatch lets you): M of N, missing data, the action.
  function configAlarm(S, id, opts) {
    const al = S.audit.alarms.find(x => x.id === id); if (!al) return 'none';
    for (const k of ['m', 'n', 'missing', 'act']) if (opts[k] != null) al[k] = opts[k];
    if (al.m > al.n) al.m = al.n;
    al.hist = al.hist.slice(-al.n); ev(S, 'alarmEdit', { id }); return '';
  }
  function setBell(S, op) { S.audit.bell.op = op === 'and' ? 'and' : 'or'; bellEval(S); }

  // ---- Reading the evidence (the view's cards and the sim's player both use these) ----
  function logView(S, src, n) { return S.audit.logs[src].slice(-(n || 6)); }
  function search(S, expr) {
    const a = S.audit; if (!a.tracer) return null;
    if (expr === 'refund' && !a.pins) return null;
    return a.traces.filter(tr => expr === 'refund' ? tr.ann && tr.ann.route === 'refund'
      : expr === 'slow' ? tr.resp > 5 : tr.rows.some(r => r.station === expr && !r.service && (r.fault || r.pending))).slice().reverse();
  }
  // The trace map: each node's worst state over the last clock hour of traces (fault red, slow amber, ok green).
  function traceMap(S) {
    const a = S.audit, out = {}, from = S.time - a.night.hourSecs;
    for (const st of STATIONS) out[st] = 'none';
    for (const tr of a.traces) if (tr.t > from) for (const r of tr.rows) {
      if (!r.station || r.service) continue;
      const p = r.points, s = p ? (p.job === 'patch' ? 'fault' : 'slow') : 'ok', rank = { none: 0, ok: 1, slow: 2, fault: 3 };
      if (rank[s] > rank[out[r.station]]) out[r.station] = s;
    }
    return out;
  }
  // Logs Insights: a coin a query, over the last clock hour of every log group that exists.
  const QUERIES = {
    slowest: 'filter @type = "REPORT" | sort @duration desc | limit 5',
    errors: 'filter @message like /ERROR|5\\d\\d/ | stats count(*) by errorType',
    downstream: 'stats avg(drawerMs), avg(engineMs) by bin(6s)'
  };
  function query(S, card) {
    const a = S.audit;
    if (!QUERIES[card]) return { error: 'unknown' };
    if (card === 'downstream' && !a.stamp) return { error: 'nostamp' };
    if (S.coins < COST.lens) return { error: 'coins' };
    S.coins -= COST.lens; a.queries++;
    const from = S.time - a.night.hourSecs, desk = a.logs.desk.filter(l => l.t > from), counter = a.logs.counter.filter(l => l.t > from);
    let rows = [];
    if (card === 'slowest') {
      rows = desk.filter(l => /^REPORT/.test(l.text)).map(l => ({ v: +l.text.match(/Duration: (\d+)/)[1], l })).sort((x, y) => y.v - x.v).slice(0, 5)
        .map(({ v, l }) => ({ text: `${l.text.split(' ')[1]}  @duration ${v}`, points: v / 1000 > T.thr.desk ? { station: 'desk', job: 'oil' } : null, note: 'Duration is the whole invocation, waits on calls included.' }));
    } else if (card === 'errors') {
      const c = {};
      const add = (key, pts) => { c[key] = c[key] || { n: 0, pts }; c[key].n++; };
      for (const l of desk) {
        if (/DynamoDB/.test(l.text)) add('DrawerError (DynamoDB 500)', { station: 'drawer', job: 'patch' });
        else if (/Engine call/.test(l.text)) add('EngineError (HTTP 500)', { station: 'engine', job: 'patch' });
        else if (/TypeError/.test(l.text)) add('TypeError (Mira\'s code)', { station: 'desk', job: 'patch' });
        else if (/timed out/.test(l.text)) add('Task timed out', null);
      }
      for (const l of counter) if (/ 500 /.test(l.text)) add('Counter 500 (no integration)', { station: 'counter', job: 'patch' });
      rows = Object.keys(c).sort((x, y) => c[y].n - c[x].n).map(k => ({ text: `${k}  count ${c[k].n}`, points: c[k].pts, note: c[k].pts ? '' : 'Timed out, but the log doesn\'t say waiting on what.' }));
    } else {
      const since = Math.max(from, a.stampAt), bins = {};
      for (const l of desk) if (l.t > since && /^EMF/.test(l.text)) {
        const b = Math.floor(l.t / 6) * 6, d = l.text.match(/"drawerMs":(\d+)/), e = l.text.match(/"engineMs":(\d+)/);
        bins[b] = bins[b] || { d: [], e: [] }; if (d) bins[b].d.push(+d[1]); if (e) bins[b].e.push(+e[1]);
      }
      const avg = x => x.length ? Math.round(x.reduce((s, y) => s + y, 0) / x.length) : null;
      rows = Object.keys(bins).sort((x, y) => y - x).slice(0, 4).map(b => {
        const d = avg(bins[b].d), e = avg(bins[b].e);
        const pts = d != null && d / 1000 > T.thr.drawerMs && !(e != null && e > d) ? { station: 'drawer', job: 'oil' } : e != null && e / 1000 > T.thr.engineMs ? { station: 'engine', job: 'oil' } : null;
        return { text: `${clock(S, +b)}  drawerMs ${d == null ? '-' : d}  engineMs ${e == null ? '-' : e}`, points: pts, note: pts ? '' : 'Both calls in good time.' };
      });
    }
    ev(S, 'query', { card, n: rows.length });
    return { rows, q: QUERIES[card] };
  }

  // ---- The cellar (review room): questions for coins, letters in the slot, and the intern ----
  function reviewReady(S) { return !S.over && S.time >= S.audit.cellar.ready; }
  function reviewAnswer(S, qid, right) {
    const c = S.audit.cellar; if (!reviewReady(S)) return false;
    c.asked++; if (right) { c.right++; S.coins++; } else c.wrong++;
    c.ready = S.time + T.reviewGap;
    if (qid != null && SD.rushCore && SD.rushCore.answer) SD.rushCore.answer(S, qid, right, 'player');
    ev(S, 'reviewed', { right }); return true;
  }
  function mailAnswer(S, qid, right) {
    const a = S.audit; if (a.mail <= 0) return false;
    a.mail--; if (right) S.coins++;
    if (qid != null && SD.rushCore && SD.rushCore.answer) SD.rushCore.answer(S, qid, right, 'player');
    ev(S, 'letter', { right }); return true;
  }
  function internStep(S) {
    const c = S.audit.cellar; if (!c.intern || c.tray.length >= T.tray || S.time - c.internT < T.internEvery) return;
    const pool = SD.rushCore && SD.rushCore.solved ? SD.rushCore.solved(S) : [];
    if (!pool.length) return;
    c.internT = S.time;
    const q = pool[c.internI++ % pool.length], right = S.rand() >= T.internWrong;
    c.tray.push({ q, right, at: S.time }); c.byIntern++;
    ev(S, 'internAnswer', { right });
  }
  // Checking the intern: a right answer pays its coin; a wrong one caught is just set aside; waved through, it's a
  // lost request.
  function checkIntern(S, i, verdict) {
    const c = S.audit.cellar, r = c.tray[i]; if (!r || S.over) return '';
    c.tray.splice(i, 1); c.checked++;
    if (r.right) { S.coins++; ev(S, 'checked', { was: 'right' }); return 'right'; }
    if (verdict === 'wrong') { c.caught++; ev(S, 'caught', {}); return 'caught'; }
    c.missed++; ev(S, 'internMiss', {}); lose(S, 'intern'); return 'missed';
  }
  function setDown(S, down) { S.audit.down = !!down; }

  // ---- The night ----
  function step(S, dt) {
    const a = S.audit;
    S.time += dt;
    const h = hourOf(S);
    while (a.hour < h) { a.hour++; onHour(S); }
    while (S.spawns.length && S.spawns[0].t <= S.time) spawn(S, S.spawns.shift());
    startDue(S);
    for (const st of Object.keys(a.live)) if (a.live[st].until <= S.time) endFault(S, st, 'cleared');
    stepTickets(S, dt); if (S.over) return;
    publish(S);
    stepPorter(S, dt);
    // Overlap, for the night report and the sim: time with two and three faults live, 01:00 to 05:00.
    if (S.time >= 3 * a.night.hourSecs && S.time < 7 * a.night.hourSecs) { a.stats.span += dt; const n = liveCount(a); if (n >= 2) a.stats.two += dt; if (n >= 3) a.stats.three += dt; }
    if (a.down) {
      a.stats.downT += dt;
      // Trusting your alarms pays: from 00:00, a coin for every bonusEvery seconds downstairs with a klaxon up.
      if (h >= 2 && a.alarms.length) { a.bonusT += dt; if (a.bonusT >= T.bonusEvery) { a.bonusT -= T.bonusEvery; S.coins++; a.stats.bonus++; ev(S, 'bonus'); } }
    } else a.stats.upT += dt;
    internStep(S);
    if (S.time >= S.close) {
      // Dawn: whatever's still in the tube is fine; the intern's unchecked answers go back in the pile.
      a.cellar.tray = [];
      S.over = 'win'; ev(S, 'win');
    }
  }
  function live(S) { return Object.values(S.audit.live); }
  SD.rushAudit = { T, STATIONS, NAME, KINDS, WHERE, COST, UPKEEP, QUERIES, init, step, place, canPlace, costOf, configAlarm, setBell, queueJob, reorder, cancel,
    faultPlan, rng, clock, hourOf, logView, search, traceMap, query, reviewReady, reviewAnswer, mailAnswer, checkIntern, setDown, live, breach };
  if (typeof module !== 'undefined') module.exports = SD.rushAudit;
})(typeof window !== 'undefined' ? window : globalThis);
