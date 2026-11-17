// The Proving Road (menu label "Exam Sprint"; design v6, Nov 16): a timed pacing run that plays like the exam.
// Ten patches of tall grass on a one-way road, 20:00 on the clock, Postmaster Coo flying the 1:45-a-patch pace.
// Every patch hides a daemon, and every daemon is a bank question shown in exam view: the whole stem, lettered
// options, no hints and no verdict. Commit with Guess, Think so or Sure, or mark it (3 markers) and walk back to it
// from Looking back before sunset. Lexi seals every jar, and nothing is judged until her Lamp House: the pace log,
// the jars (right, loose, empty, gold seal), the debrief with an if-then plan, and Today's road.
//   - Route 1 (Nov 24) has its aids: Coo's position at each seal, the status line, the 2:30 nudge, and the clock
//     paused for encounters and seals. Proctor's Pass (Nov 28) is exam conditions: none of those, and the clock never
//     stops. A practice patch (one Select TWO on a 3:00 clock) comes first.
//   - Patch time counts only while that patch's question is on screen. Dither is the time from first pick to commit or
//     mark, on every visit. More than 30 s away caps a patch at Guess (and on Route 1 pauses the clock after 30 s).
//   - Questions: js/sprint-data.js reserves each run's 10 plus 2 spares (held out everywhere else by js/exam.js until
//     the run is finished); after both runs a free road draws from the verified bank with the same rules.
//   - Scoring uses the shared stake table (js/modes.js) as calibration points; a marked or interrupted pick scores as a
//     Guess and counts as "marked" in calibration. XP and shards once a day. Answers go to spaced review at the Lamp
//     House, Sure misses go on the Wall, and the empty and loose jars' ideas lead the next day's set (SD.sprint.leadItems).
//   - Marks (Nov 16): the debrief scores the run's one decision. Marks well spent (marked, came back, changed, ended
//     right, and marks that turned a wrong first pick right: run.markPick keeps the pick a patch was marked with; older
//     saves fall back to the first change), misses you didn't mark (Guess ones called out: flag any question you'd
//     press Guess on), unused markers when there were misses, one if-then line offered to the plan (SP.marksPlan), and
//     the change since the last run's counts (each result keeps them as res.marks).
//   - Saves after every commit and marker; a reload returns to the same patch with the same clock.
(function () {
  if (!SD.modes || !SD.sprintData) return;
  const M = SD.modes, U = SD.ui, S = SD.state, D = SD.sprintData, E = () => SD.exam;
  const esc = s => U.esc(s);
  const SP = SD.sprint = {};
  const ID = 'sprint', TITLE = 'THE PROVING ROAD', CLS = 'sprint', HOUSE = 'THE LAMP HOUSE';
  const SEC = 1000, MIN = 60 * SEC;
  const LIMIT = 20 * MIN, PRACTICE_LIMIT = 3 * MIN;
  const PACE = 105 * SEC, OVER = 120 * SEC, LONG = 150 * SEC, AWAY = 30 * SEC, GUARD = 400;
  const PLAN = 'If I\'ve picked and catch myself rereading the options, I commit at Think so or mark it, and move on. Patch 4 by 14:00, patch 8 by 6:00.';
  SP.LIMIT = LIMIT; SP.PACE = PACE;
  const sv = () => S.save;
  const store = () => {
    const s = sv().sprint = sv().sprint || {};
    s.done = s.done || {}; s.results = s.results || []; s.fam = s.fam || {}; s.lead = s.lead || []; s.slip = s.slip || []; s.checks = s.checks || [];
    return s;
  };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const WORDS = ['No', 'One', 'Two', 'Three'];
  const mmss = ms => { const s = Math.max(0, Math.round(ms / SEC)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const clockText = ms => { const s = Math.max(0, Math.ceil(ms / SEC)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const sgnT = ms => (ms >= 0 ? '+' : '−') + mmss(Math.abs(ms));
  const find = id => E().find(id);
  const letter = i => String.fromCharCode(65 + i);

  // ---- Families (L6: the species comes from the question's topic, never a roll) ----
  const FAM = {};
  D.families.forEach(f => f.topics.forEach(t => { FAM[t] = f; }));
  const WILD = D.families.find(f => f.id === 'wild');
  SP.famOf = q => (q && FAM[q.topic]) || WILD;
  SP.famById = id => D.families.find(f => f.id === id) || WILD;

  // ---- Questions ----
  const need = q => (q.type === 'multi' ? q.items.filter(it => it.ok).length : 1);
  const optsOf = q => (q.type === 'multi' ? q.items.map(it => it.t) : q.opts);
  const stemOf = q => (q.type === 'multi' ? q.q.replace(/\s*\((select|choose)\s+\w+\.?\)\s*$/i, '') + ` (Select ${['', 'ONE', 'TWO', 'THREE'][need(q)] || need(q)}.)` : q.q);
  const firstLine = q => { const t = String(q.q); const m = t.match(/^.{0,90}?[.?!](\s|$)/); return m ? m[0].trim() : t.slice(0, 80) + '…'; };
  // The stem with each part of its deciding phrase ("…" joins two parts) marked in place. '' when a part isn't found.
  const markIn = (stem, dec) => {
    const parts = String(dec).split(/\s*…\s*/).filter(Boolean);
    let out = esc(stem), ok = true;
    parts.forEach(p => { const e = esc(p); if (out.includes(e)) out = out.replace(e, `<mark class="sp-dec">${e}</mark>`); else ok = false; });
    return ok ? out : '';
  };
  // A caught daemon's rule: the first sentence of its question's explanation, where the AWS term is.
  const ruleOf = q => { const w = String((q && q.why) || '').trim(), m = w.match(/^.+?[.!?](?=\s+[A-Z(`"]|$)/); return (m ? m[0] : w).slice(0, 240); };
  const isRight = (q, pick) => pick != null && E().correct(q, pick);
  const rightText = q => (q.type === 'mc' ? [q.opts[q.a]] : q.items.filter(it => it.ok).map(it => it.t));
  const whyNot = q => (q.type === 'mc' ? q.opts.map((o, i) => (i !== q.a && q.no && q.no[i] ? [o, q.no[i]] : null)).filter(Boolean)
    : q.items.filter(it => !it.ok && it.no).map(it => [it.t, it.no]));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const answered = (q, p) => (q.type === 'multi' ? Array.isArray(p) && p.length === need(q) : p != null);

  // The free road after both runs: the reserved runs' rules on the verified bank (never answered first).
  const MIX = [3, 3, 2, 2];
  SP.freeIds = function () {
    const Dr = SD.topicDrill, log = sv().qlog || {};
    const pool = Dr.base().filter(q => (q.type === 'mc' || q.type === 'multi') && E().isDva(q) && Dr.isVerified(q));
    const rank = q => (log[q.id] ? log[q.id][0] : 0) + Math.random() * 86400000;
    const out = [], fam = {};
    MIX.forEach((n, k) => {
      pool.filter(q => E().domainOf(q, 'DVA') === k + 1).sort((a, b) => rank(a) - rank(b)).forEach(q => {
        const f = SP.famOf(q).id;
        if (n > 0 && (fam[f] | 0) < 2) { out.push(q.id); fam[f] = (fam[f] | 0) + 1; n--; }
      });
    });
    return out;
  };
  // A run's 10 questions: reserved ones, any already answered swapped for a spare (same domain first).
  function idsFor(key) {
    if (key === 'free') return SP.freeIds();
    const R = D.runs[key], log = sv().qlog || {}, spares = R.spares.filter(id => !log[id] && find(id));
    return R.ids.map(id => {
      if (!log[id] && find(id)) return id;
      const d = E().domainOf(find(id) || {}, 'DVA'), k = spares.findIndex(s => E().domainOf(find(s), 'DVA') === d);
      return k >= 0 ? spares.splice(k, 1)[0] : spares.length ? spares.shift() : id;
    });
  }
  // Order: domains shuffled, the contrast pair never on adjacent patches.
  SP.order = function (ids, pair) {
    for (let t = 0; t < 200; t++) {
      const o = shuffle(ids);
      const a = pair ? o.indexOf(pair[0]) : -1, b = pair ? o.indexOf(pair[1]) : -1;
      if (a < 0 || b < 0 || Math.abs(a - b) > 2) return o;
    }
    return ids.slice();
  };

  // ---- A run: the state machine the UI and the simulator share ----
  SP.newRun = function (key, opts) {
    opts = opts || {};
    const practice = key === 'practice';
    const R = D.runs[key] || D.runs.r1;
    const ids = practice ? [D.practice] : opts.ids || SP.order(idsFor(key), R.pair);
    const n = ids.length;
    const arr = v => ids.map(() => (typeof v === 'function' ? v() : v));
    return {
      v: 1, key, practice, exam: !practice && !!(D.runs[key] && D.runs[key].exam), name: practice ? 'Practice patch' : key === 'free' ? 'The free road' : R.name,
      ids, ord: ids.map(id => shuffle(optsOf(find(id)).map((x, i) => i))), limit: practice ? PRACTICE_LIMIT : LIMIT,
      pick: arr(null), conf: arr(null), marked: arr(false), wasMarked: arr(false), reopened: arr(false), inter: arr(false), changed: arr(null), raised: arr(false),
      first: arr(0), reopen: arr(0), dither: arr(0), changes: arr(0), tfp: arr(null), nudged: arr(false), startLeft: arr(null), markPick: arr(null),
      markers: practice ? 1 : 3, at: 0, phase: 'gate', used: 0, between: 0, list: 0, seals: [], ann: {}, t: Date.now(), sim: !!opts.sim
    };
  };
  const left = run => run.limit - run.used;
  // Commit (conf 0 to 2) or mark (conf null) the pick on screen; returns the patch's new state.
  SP.commit = function (run, i, pick, conf, ms, ditherMs, reopen) {
    if (reopen) {
      const was = JSON.stringify(run.pick[i]);
      if (JSON.stringify(pick) !== was) run.changed[i] = { from: run.pick[i], to: pick };
      if (conf != null && conf > (run.conf[i] == null ? 0 : run.conf[i])) run.raised[i] = true;
      run.reopen[i] += ms; run.reopened[i] = true;
    } else run.first[i] += ms;
    run.dither[i] += ditherMs;
    run.pick[i] = pick;
    if (conf == null) {
      if (!run.marked[i] && !reopen) run.markers--;
      // The pick it was marked with (saves from before Nov 16 have no markPick; SP.marks falls back for those).
      if (!reopen) { run.markPick = run.markPick || run.ids.map(() => null); if (run.markPick[i] == null) run.markPick[i] = pick == null ? null : JSON.parse(JSON.stringify(pick)); }
      run.marked[i] = true; run.wasMarked[i] = true; run.conf[i] = null;
    } else {
      run.marked[i] = false;
      run.conf[i] = run.inter[i] ? 0 : conf;
    }
  };
  // The scored run: per patch and in total.
  SP.score = function (run) {
    const qs = run.ids.map(find);
    const rows = qs.map((q, i) => {
      const p = run.pick[i], ok = isRight(q, p), unans = p == null;
      const conf = run.conf[i], counted = conf != null && !run.inter[i];
      const pts = unans ? 0 : M.stake(ok, conf == null ? 0 : conf);
      const kind = !ok ? 'empty' : !counted || conf === 0 ? 'loose' : conf === 2 ? 'gold' : 'caught';
      return { i, q, id: q.id, ok, unans, conf, counted, pts, kind, fam: SP.famOf(q), dom: E().domainOf(q, 'DVA') };
    });
    const right = rows.filter(r => r.ok).length;
    const pts = rows.reduce((a, r) => a + r.pts, 0);
    const firsts = run.first.map((t, i) => (run.inter[i] ? Math.max(t, LONG) : t));
    const over = i => Math.max(0, firsts[i] - OVER);
    const tax = [0, 1, 2].reduce((a, i) => a + (i < firsts.length ? over(i) : 0), 0);
    const d13 = [0, 1, 2].reduce((a, i) => a + (run.dither[i] || 0), 0);
    const rest = run.dither.slice(3).slice().sort((a, b) => a - b);
    const med = rest.length ? rest[Math.floor((rest.length - 1) / 2)] : 0;
    const long = firsts.filter(t => t >= LONG).length;
    const reopenT = run.reopen.reduce((a, b) => a + b, 0), reopenN = run.reopen.filter(Boolean).length;
    const dom = {};
    rows.forEach(r => { dom[r.dom] = dom[r.dom] || [0, 0]; dom[r.dom][1]++; if (r.ok) dom[r.dom][0]++; });
    const tally = { 0: [0, 0], 1: [0, 0], 2: [0, 0], marked: [0, 0] };
    rows.forEach(r => { if (r.unans) return; const k = r.counted ? r.conf : 'marked'; tally[k][1]++; if (r.ok) tally[k][0]++; });
    return { rows, right, n: rows.length, pts, firsts, tax, d13, med, long, reopenT, reopenN, dom, tally };
  };
  // The Marks readout: was each marker well spent, and which misses went unmarked. Only committed picks count as
  // unmarked misses (a pick cut off by sunset or no answer isn't one); an interrupted patch was capped at Guess, so it
  // isn't called out as a Guess.
  SP.marks = function (run, sc) {
    sc = sc || SP.score(run);
    const mp = run.markPick || [];
    const out = { marked: 0, back: 0, changed: 0, right: 0, turned: 0, hurt: 0, missed: 0, guessMiss: 0, unused: Math.max(0, run.markers | 0), notBack: 0, missAt: [], guessAt: [] };
    sc.rows.forEach(r => {
      const i = r.i, p = run.pick[i];
      if (run.wasMarked[i]) {
        // First pick before marking: recorded since Nov 16; older saves use the first change's "from", else the pick.
        const was = mp[i] != null ? mp[i] : run.changed[i] ? run.changed[i].from : p;
        const ch = JSON.stringify(was) !== JSON.stringify(p), wasOk = isRight(r.q, was);
        out.marked++;
        if (run.reopened[i]) out.back++; else out.notBack++;
        if (ch) out.changed++;
        if (r.ok) out.right++;
        if (ch && !wasOk && r.ok) out.turned++;
        if (ch && wasOk && !r.ok) out.hurt++;
      } else if (!r.ok && !r.unans && run.conf[i] != null) {
        out.missed++; out.missAt.push(i + 1);
        if (run.conf[i] === 0 && !run.inter[i]) { out.guessMiss++; out.guessAt.push(i + 1); }
      }
    });
    return out;
  };
  // One if-then line for the plan, when the marks call for one (most pressing first).
  SP.marksPlan = function (m) {
    if (m.guessMiss) return 'If I\'d press Guess, then I flag it and move on.';
    if (m.notBack) return 'If I mark a patch, then I walk back to it before I finish.';
    if (m.hurt) return 'If I come back and find nothing new, then I keep my first pick.';
    if (m.missed && m.unused) return 'If I still have a marker and any doubt, then I flag it and move on.';
    return '';
  };

  // Coo's pattern over the seals (the ending's line).
  SP.pattern = function (run) {
    if (run.sunset) return 'out';
    const s = run.seals, on = x => x.diff <= 30 * SEC;
    if (!s.length) return 'steady';
    if (s.every(on)) return 'steady';
    const early = s.slice(0, 3), last = s[s.length - 1];
    if (early.some(x => !on(x)) && on(last)) return 'slow';
    if (early.every(on) && !on(last)) return 'fade';
    return 'late';
  };
  const COO_END = {
    slow: 'Coo-ah. Late out of the loft, on schedule from the fourth stop. Leave the loft on time and the whole round is on time.',
    steady: 'Coo. Every stop on schedule. That is how the post is run.',
    fade: 'Coo. A fine start. The round is judged at the last door, not the first.',
    late: 'Coo. Late at every stop. Late is still delivered. Leave earlier tomorrow.',
    out: "Coo. Some letters didn't go out before dark. Undelivered isn't lost. Someone meant them. Same road, next time."
  };
  SP.COO_END = COO_END;
  // The pacing check (Nov 28 against Nov 24): which parts held.
  SP.check = function (now, before) {
    const parts = [];
    const taxOk = before.tax < MIN ? now.tax < 30 * SEC : now.tax <= before.tax / 2;
    parts.push({ ok: taxOk, what: 'overthink tax on patches 1 to 3', line: `${sgnT(now.tax)} (Route 1: ${sgnT(before.tax)})` });
    parts.push({ ok: now.d13 <= before.d13 / 2, what: 'dither on patches 1 to 3', line: `${mmss(now.d13)} (Route 1: ${mmss(before.d13)})` });
    parts.push({ ok: now.long <= 1, what: 'patches reaching 2:30', line: `${now.long} (Route 1: ${before.long})` });
    parts.push({ ok: now.right >= before.right - 2, what: 'accuracy', line: `${now.right} of ${now.n} (Route 1: ${before.right} of ${before.n})` });
    return { held: parts.every(p => p.ok), parts };
  };

  // ---- Art: PixelLab sprites in assets/img/sprint (see CREDITS.md), drawn crisp; the sky bands and charts stay SVG ----
  const ART = 'assets/img/sprint/';
  const sprite = (f, size, cls) => `<img class="${cls}" src="${ART}${f}.webp" width="${size}" height="${size}" alt="" draggable="false">`;
  const INK = '#2b2340';
  const meter = n => `<svg class="sp-m" viewBox="0 0 18 18" width="18" height="18" aria-hidden="true">${[0, 1, 2].map(k => `<rect x="${1 + k * 6}" y="${12 - k * 5}" width="4" height="${5 + k * 5}" rx="1" fill="${k <= n ? INK : 'none'}" stroke="${INK}" stroke-width="1.6"/>`).join('')}</svg>`;
  SP.meter = meter;
  const shadow = size => sprite('shadow', size, 'sp-shadow');
  // The jar: sealed (plum wax), gold (gold wax), empty (open, seeds), full (open, daemon inside).
  const jar = (state, size) => {
    const h = size || 64, w = Math.round(h * 0.75);
    return `<img class="sp-jar ${state}" src="${ART}jar/${state}.webp" width="${w}" height="${h}" alt="" draggable="false">`;
  };
  SP.jar = jar;
  // The creature once caught; only its shadow while it's still in the grass (hid).
  const daemon = (f, size, loose, hid) => `<span class="sp-dae${loose ? ' loose' : ''}">${hid ? shadow(size || 64) : sprite('daemons/' + f.name.toLowerCase(), size || 64, 'sp-sprite')}<span class="sp-dn">${esc(f.name)}</span>${loose ? '<span class="sp-loose">loose</span>' : ''}</span>`;
  // The stage band (375×176): hard sky bands, one dithered row, the road to Lexi's lamp, the landmark, the shadow.
  const band = (run, i, opts) => {
    opts = opts || {};
    const R = D.runs[run.key] || D.runs.r1;
    const sky = (opts.step != null ? R.sky[opts.step] : R.sky[Math.min(9, i)]) || R.sky[0];
    const lamp = 2 + Math.min(3, Math.floor(i / 3));
    return `<svg class="sp-band" viewBox="0 0 375 176" preserveAspectRatio="xMidYMid slice" aria-hidden="true" shape-rendering="crispEdges">
      <defs><pattern id="sp-dith" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="4" fill="${sky[1]}"/><rect width="2" height="2" fill="${sky[0]}"/><rect x="2" y="2" width="2" height="2" fill="${sky[0]}"/></pattern></defs>
      <rect width="375" height="60" fill="${sky[0]}"/><rect y="60" width="375" height="4" fill="url(#sp-dith)"/><rect y="64" width="375" height="52" fill="${sky[1]}"/>
      <rect y="116" width="375" height="60" fill="${sky[2]}"/><rect y="114" width="375" height="3" fill="${INK}"/>
      <path d="M188 116L120 176h136z" fill="#e6cf98"/>
      <rect x="${188 - lamp}" y="${110 - lamp * 2}" width="${lamp * 2}" height="${lamp * 2 + 2}" fill="#ffd34d" stroke="${INK}" stroke-width="1"/>
      ${opts.noLand ? '' : `<g><image href="${ART}land/${run.key === 'r2' ? 'r2' : 'r1'}-${String(i % 10 + 1).padStart(2, '0')}.webp" x="4" y="28" width="96" height="96" style="image-rendering:pixelated"/></g>`}
      ${opts.shadow ? `<g><image href="${ART}shadow.webp" x="254" y="110" width="56" height="56" style="image-rendering:pixelated"/></g>` : ''}
    </svg>`;
  };
  const portrait = who => { try { return SD.art && SD.art.portrait ? SD.art.portrait(who, 56) : ''; } catch (e) { return ''; } };
  // Each line is HTML; its spoken part (the quotes, or the whole line when it has none) is the voice key (js/vo-modes.js).
  const unq = h => String(h).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const spoken = h => { const t = unq(h), q = t.match(/"[^"]+"/g); return q ? q.map(x => x.slice(1, -1)).join(' ') : t; };
  const host = (who, name, lines) => `<div class="sp-host">${portrait(who)}<div><b>${esc(name)}</b>${lines.map(l => `<p data-vo="${esc(who + '|' + spoken(l))}">${l}</p>`).join('')}</div></div>`;

  // ---- The UI ----
  let run = null, body = null, tick = null, hidAt = 0, stemAt = 0, pickAt = 0, temp = null, guardTo = 0, sealTo = null, note = '', filter = 'all', aside = '';
  const cur = () => store().cur || null;
  const persist = () => { if (run && !run.sim) { store().cur = run.phase === 'done' ? null : run; } S.persist(); };
  const running = () => !!run && !run.sim && (run.exam ? ['enc', 'q', 'seal', 'list', 're'].includes(run.phase) : ['q', 'list', 're'].includes(run.phase));
  let since = 0;
  function sync() {
    // Move elapsed clock time into run.used (and into the list or between lines).
    const now = Date.now();
    if (since && run) {
      const d = now - since;
      run.used += d;
      if (run.phase === 'list') run.list += d;
      else if (run.phase === 'enc' || run.phase === 'seal') run.between += d;
    }
    since = running() && !document.hidden ? now : (running() && run.exam ? now : 0);
  }
  function startTick() {
    if (tick) return;
    tick = setInterval(onTick, 250);
    document.addEventListener('visibilitychange', onVis);
  }
  function stopTick() { if (tick) clearInterval(tick); tick = null; document.removeEventListener('visibilitychange', onVis); since = 0; }
  function onTick() {
    if (!run || !body || !body.isConnected) { if (run) { sync(); persist(); } stopTick(); return; }
    sync();
    const l = left(run);
    const el = body.querySelector('#sp-clock');
    if (el) {
      let txt = clockText(l);
      [5, 1].forEach(m => { if (l <= m * MIN && l > m * MIN - 8 * SEC) { txt = `${clockText(l)} left`; if (!run.ann[m]) { run.ann[m] = 1; say(`${m}:00 left`); } } });
      el.textContent = txt;
    }
    if ((run.phase === 'q') && !run.exam && !run.nudged[run.at]) {
      const t = run.first[run.at] + (Date.now() - stemAt);
      if (t >= (run.practice ? MIN : LONG)) {
        run.nudged[run.at] = true;
        const r2 = body.querySelector('#sp-row2');
        if (r2) { r2.textContent = `⏱ ${run.practice ? '1:00' : '2:30'} here. Pick, mark and move on?`; r2.classList.add('nudge'); }
        say(r2 ? r2.textContent : '');
      }
    }
    if (l <= 0 && ['q', 're', 'list', 'enc', 'seal'].includes(run.phase)) sunset();
  }
  function say(t) { const a = body && body.querySelector('#sp-live'); if (a) a.textContent = t; }
  function onVis() {
    if (!run) return;
    if (document.hidden) { sync(); hidAt = Date.now(); persist(); return; }
    const h = hidAt ? Date.now() - hidAt : 0;
    hidAt = 0;
    // Route 1: the first 30 s away count, then the clock pauses. Proctor's Pass: the clock never stopped.
    if (!run.exam && running()) {
      run.used += Math.min(h, AWAY);
      if (run.phase === 'list') run.list += Math.min(h, AWAY);
      const skip = Math.max(0, h - AWAY);
      if (['q', 're'].includes(run.phase)) { stemAt += skip; if (pickAt) pickAt += skip; }
    }
    if (h > AWAY && ['q', 're'].includes(run.phase)) {
      run.inter[run.at] = true;
      aside = `You were away ${mmss(h)}. This patch is capped at Guess.`;
      drawQ(find(run.ids[run.at]), run.at, run.phase === 're');
    }
    sync();
    persist();
  }
  // Music (Mureka, made for this game; CREDITS.md): The Proving Road at the gate and the Lamp House, quiet on the
  // road itself, and whatever was playing before comes back on the way out. Tallgrass Meadow is held for drop 3.
  const AU = SD.audio;
  if (AU && AU.add) AU.add({ songs: { sprint: 'm-sprint-road', meadow: 'm-sprint-meadow' } });
  let prevSong = null, inMode = false;
  function tune() {
    if (!AU || !AU.music) return;
    if (!inMode) { inMode = true; prevSong = AU.loopName || null; }
    if (!run || run.phase === 'house') AU.music('sprint');
    else if (AU.loopName) AU.stop();
  }
  function draw(h, title) {
    tune();
    body = U.panel(h, { title: title || TITLE, cls: CLS, noClose: false, onClose: () => leave(), keepScroll: false });
    body.classList.add('sp-b');
    return body;
  }
  function leave() {
    sync(); persist(); stopTick();
    if (inMode && AU && AU.music) { inMode = false; if (prevSong) AU.music(prevSong); else AU.stop(); }
    if (SD.today && SD.today.render) SD.today.render();
  }
  function topBar(i, row2) {
    const n = run.ids.length;
    return `<div class="sp-top" role="group" aria-label="Road status">
      <div class="sp-r1"><span class="sp-n">${run.phase === 'list' || run.phase === 're' && i < 0 ? 'Looking back' : run.practice ? 'Practice patch' : `Patch ${i + 1} / ${n}`}</span>
        <span class="sp-mk">⚑ ${run.markers} left</span>
        <span class="sp-clock" id="sp-clock" role="timer" aria-label="Time left">${clockText(left(run))}</span></div>
      <div class="sp-r2" id="sp-row2">${row2 == null ? '' : esc(row2)}</div>
      <p class="sr" aria-live="polite" id="sp-live"></p></div>`;
  }
  function status(i) {
    if (run.exam || run.practice) return '';
    const d = run.used - i * PACE;
    return d < -30 * SEC ? 'ahead' : d <= 30 * SEC ? 'on pace' : d <= 2 * MIN ? 'a little behind' : 'behind';
  }

  // ---- The gate ----
  SP.open = function () {
    SP.settleChecks();
    const c = cur();
    if (c && c.ids && c.ids.every(find)) { run = c; return resumeCard(); }
    gate();
  };
  function nextKey() { const d = store().done; return !d.r1 ? 'r1' : !d.r2 ? 'r2' : 'free'; }
  function gate() {
    run = null;
    const key = nextKey(), R = D.runs[key] || D.runs.r1, exam = key !== 'free' && R.exam;
    const first = !store().practiced;
    const lexi = exam
      ? ['She lifts the eyepatch. "Exam conditions. This is an emergency."', '"No pace line, no nudges. The sun doesn\'t wait for anyone today."']
      : ['"By the Forbidden Index, I open the Proving Road. Every jar you fill takes my seal, and no seal breaks before the Lamp House."', '"Read the whole question. Shh. Go."'];
    const plan = store().plan;
    const b = draw(`<div class="sp-gate">
      ${band({ key: key === 'free' ? 'r1' : key }, 0, { noLand: false })}
      ${host('lexi', 'Lexi', lexi.map(esc))}
      <p class="sp-route"><b>${esc(key === 'free' ? 'The free road' : R.name)}</b>${key === 'free' ? ' · questions you haven\'t seen, the same rules' : exam ? ' · exam conditions' : ''}</p>
      <div class="sp-tiles"><span><b>10</b>daemons</span><span><b>20:00</b>clock</span><span><b>1:45</b>pace</span><span><b>⚑⚑⚑</b>markers</span></div>
      ${exam && plan ? `<div class="sp-plan"><p class="small"><b>Your plan from Route 1:</b> "${esc(plan)}"</p><button class="ghost" id="sp-myplan">That's my plan</button></div>` : ''}
      <details class="sp-how"${store().seen ? '' : ' open'}><summary>How the road works</summary>
        <ul class="small">
          <li>Pick, then commit: ${meter(0)} Guess +1 / 0 · ${meter(1)} Think so +2 / −1 · ${meter(2)} Sure +3 / −3 (a Sure miss goes on the Wall to win back). These are calibration points.</li>
          <li>⚑ Mark for review keeps your pick and moves on. Walk back to it before sunset.</li>
          <li>Nothing is judged on the road. Lexi opens every jar at the Lamp House.</li>
          <li>Exam day: 65 questions in 130 minutes, and 15 of them don't count. Aim for about 1:45 each: question 22 with at least 1 h 32 min left, question 44 with at least 53 min left, all 65 by about 114 minutes. That leaves 15 minutes for flags. On the exam the button is called Flag for Review, there are Previous and Next buttons, and online there are no breaks.</li>
          <li>Never seen it? Pick, mark, move.</li>
        </ul></details>
      <p class="sp-note small" id="sp-gnote" aria-live="polite"></p>
      ${procTable()}
      ${SP.rematches().length ? `<button class="ghost sp-wide sp-rmb" id="sp-rmlist">Rematches · ${SP.rematches().length} rustling in the grass</button>` : ''}
      <div class="sp-foot">
        ${first ? `<button class="ghost" id="sp-later">Not yet</button><button class="primary" id="sp-practice">Try the practice patch</button>
          <button class="ghost sp-wide" id="sp-go">Skip to the road</button>`
          : `<button class="ghost" id="sp-later">Not yet</button><button class="primary" id="sp-go">Start the road</button>`}
      </div></div>`);
    const go = (k) => { store().seen = 1; S.persist(); start(k); };
    b.querySelector('#sp-go').onclick = () => go(key);
    const rm = b.querySelector('#sp-rmlist'); if (rm) rm.onclick = () => rematchList();
    const pr = b.querySelector('#sp-practice'); if (pr) pr.onclick = () => go('practice');
    const mp = b.querySelector('#sp-myplan'); if (mp) mp.onclick = () => { store().planOk = Date.now(); S.persist(); mp.disabled = true; mp.textContent = 'Plan confirmed ✓'; };
    b.querySelector('#sp-later').onclick = () => { b.querySelector('#sp-gnote').textContent = 'The road will wait.'; setTimeout(() => { U.closePanel(); leave(); }, 700); };
    (pr || b.querySelector('#sp-go')).focus();
  }
  function procTable() {
    const f = store().fam, met = Object.keys(f);
    if (!met.length) return '';
    const caught = met.filter(id => f[id].caught > 0);
    // Next to find: unmet families with the most bank questions.
    const counts = {};
    (SD.bank || []).forEach(q => { if (E().isDva(q)) { const id = SP.famOf(q).id; counts[id] = (counts[id] | 0) + 1; } });
    const next = D.families.filter(x => !f[x.id] && x.id !== 'wild').sort((a, b) => (counts[b.id] | 0) - (counts[a.id] | 0)).slice(0, 3);
    return `<details class="sp-proc"><summary>Process Table · ${plural(met.length, 'family')} met · ${caught.length} caught</summary>
      <ul class="sp-procl">${met.map(id => { const x = SP.famById(id), r = f[id]; return `<li>${daemon(x, 40, r.caught === 0 ? false : r.loose && !r.settled, r.caught === 0)}<span class="small">${r.caught ? `caught ×${r.caught}${r.gold ? ' · ★' + r.gold : ''}` : 'slipped out'}${r.checked ? ' <span class="sp-stamp">CHECKED</span>' : ''}</span></li>`; }).join('')}</ul>
      ${next.length ? `<p class="small">Next to find: ${next.map(x => esc(x.name)).join(', ')}.</p>` : ''}</details>`;
  }
  function resumeCard() {
    const r = run;
    const b = draw(`<div class="sp-gate"><p><b>Back on the road.</b> ${esc(r.name)}, ${r.phase === 'list' || r.phase === 're' ? 'Looking back' : `patch ${r.at + 1}`}, ${clockText(left(r))} left${r.phase === 'house' ? '. The Lamp House is open.' : ', same question.'}</p>
      <div class="sp-foot"><button class="ghost" id="sp-drop">Abandon</button><button class="primary" id="sp-on">Carry on</button></div></div>`);
    b.querySelector('#sp-on').onclick = () => { startTick(); route(); };
    b.querySelector('#sp-drop').onclick = () => { store().cur = null; S.persist(); run = null; gate(); };
    b.querySelector('#sp-on').focus();
  }
  function route() {
    if (run.phase === 'house') return house(run.hstep || 0);
    if (run.phase === 'list') return list();
    if (run.phase === 're') return reopen(run.at);
    if (run.phase === 'seal') return nextPatch();
    return show();
  }
  function start(key) {
    run = SP.newRun(key);
    if (!run.ids.length || run.ids.some(id => !find(id))) { U.system('THE PROVING ROAD', 'Not enough questions for a road yet.', '', 3000); return; }
    startTick();
    encounter();
  }

  // ---- The road ----
  function encounter() {
    const i = run.at;
    run.phase = 'enc'; run.startLeft[i] = left(run);
    sync(); persist();
    const R = D.runs[run.key] || D.runs.r1, land = run.practice ? 'Practice grass' : (R.landmarks[i] || '');
    const last = !run.practice && i >= 7;
    const b = draw(`${topBar(i, status(i))}
      <button class="sp-stage" id="sp-skip" aria-label="Skip">${band(run, i, { shadow: true })}
        <span class="sp-tag">${last ? 'Last stretch: ' + (10 - i) + ' to the lamp · ' : ''}${esc(land)}</span></button>
      <div class="sp-card"><b>Something hops out${land ? ' by the ' + esc(land.replace(/^Lexi's /, '').toLowerCase()) : ''}.</b>
        <p class="small">You'll see who it was when its jar opens.</p></div>`);
    b.querySelector('.sp-stage').classList.add('sp-hop');
    const go = () => { clearTimeout(sealTo); sealTo = null; show(); };
    b.querySelector('#sp-skip').onclick = go;
    sealTo = setTimeout(go, run.exam ? 300 : 1000);
  }
  function show(keepTemp) {
    const i = run.at, q = find(run.ids[i]);
    run.phase = 'q';
    if (!keepTemp) { temp = run.pick[i] == null ? null : JSON.parse(JSON.stringify(run.pick[i])); stemAt = Date.now(); pickAt = 0; guardTo = Date.now() + GUARD; }
    sync(); persist();
    drawQ(q, i, false);
  }
  function optRows(q, i) {
    const multi = q.type === 'multi', opts = optsOf(q);
    return run.ord[i].map((k, pos) => {
      const on = multi ? Array.isArray(temp) && temp.includes(k) : temp === k;
      return `<button class="opt xh-opt sp-opt${on ? ' on' : ''}" data-k="${k}" role="${multi ? 'checkbox' : 'radio'}" aria-checked="${on}"><span class="xh-key sp-key${multi ? ' sq' : ''}" aria-hidden="true">${letter(pos)}</span><span>${esc(opts[k])}</span></button>`;
    }).join('');
  }
  const lettersOf = (i, p) => (p == null ? '' : [].concat(p).map(k => letter(run.ord[i].indexOf(k))).sort().join(' and '));
  function drawQ(q, i, re) {
    const multi = q.type === 'multi', ok = answered(q, temp), n = need(q), got = multi ? (temp || []).length : temp != null ? 1 : 0;
    const why = !ok ? (multi ? `Pick ${n} · ${got} picked` : 'Pick an answer first') : '';
    const capped = run.inter[i];
    const nudge = !run.exam && run.nudged[i] && !re ? `⏱ ${run.practice ? '1:00' : '2:30'} here. Pick, mark and move on?` : null;
    const row2 = re ? (run.exam ? '' : 'Reopened from Looking back') : nudge || status(i);
    const markBtn = re ? '<button class="ghost sp-mark" id="sp-back">Back to the list</button>'
      : `<button class="ghost sp-mark" id="sp-mark" ${!ok || run.markers <= 0 ? 'aria-disabled="true"' : ''}>⚑ Mark for review${ok ? ' · keeps ' + lettersOf(i, temp) : ''}</button>`;
    const b = draw(`${topBar(re ? -1 : i, row2)}
      <div class="sp-q">
        ${re ? `<p class="small sp-reh"><b>Patch ${i + 1}</b>${run.marked[i] ? ' · ⚑ marked' : ''}</p>` : ''}
        <p class="q-q xh-stem sp-stem">${esc(stemOf(q))}</p>
        <div class="opts xh-opts sp-opts" role="${multi ? 'group' : 'radiogroup'}" aria-label="Options">${optRows(q, i)}</div>
        ${aside ? `<p class="sp-aside small" role="status">${esc(aside)}</p>` : ''}
      </div>
      <div class="sp-tray">
        <p class="small sp-why" id="sp-why" aria-live="polite">${esc(note || why || (capped ? 'This patch is capped at Guess.' : ''))}</p>
        <div class="sp-commit">${M.CONF.map((c, k) => `<button class="ghost sp-c" data-c="${k}" ${!ok || (capped && k > 0) ? 'aria-disabled="true"' : ''}>${meter(k)} ${c}</button>`).join('')}</div>
        ${markBtn}
      </div>`);
    note = '';
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => choose(q, i, +el.dataset.k, re));
    b.querySelectorAll('[data-c]').forEach(el => el.onclick = () => {
      const k = +el.dataset.c;
      if (!answered(q, temp)) return refuse(multi ? `Pick ${n} · ${got} picked` : 'Pick an answer first');
      if (capped && k > 0) return refuse('This patch is capped at Guess.');
      commit(q, i, k, re);
    });
    const mk = b.querySelector('#sp-mark');
    if (mk) mk.onclick = () => {
      if (!answered(q, temp)) return refuse('Pick one, then mark');
      if (run.markers <= 0) return refuse('No markers left.');
      commit(q, i, null, re);
    };
    const bk = b.querySelector('#sp-back');
    if (bk) bk.onclick = () => { leaveStem(i, true); list(); };
  }
  function refuse(t) { const el = body && body.querySelector('#sp-why'); if (el) el.textContent = t; }
  function choose(q, i, k, re) {
    if (Date.now() < guardTo) return;
    const multi = q.type === 'multi';
    if (!pickAt) { pickAt = Date.now(); if (!re && run.tfp[i] == null) run.tfp[i] = run.first[i] + (pickAt - stemAt); }
    const before = JSON.stringify(temp);
    if (multi) {
      const set = new Set(temp || []);
      if (set.has(k)) set.delete(k);
      else if (set.size >= need(q)) { note = `Select ${need(q)}. Unselect one to change your pick.`; }
      else set.add(k);
      temp = set.size ? [...set].sort((a, b) => a - b) : null;
    } else temp = k;
    if (before !== 'null' && before !== JSON.stringify(temp)) run.changes[i]++;
    drawQ(q, i, re);
  }
  function leaveStem(i, re) {
    const ms = Date.now() - stemAt;
    if (re) run.reopen[i] += ms; else run.first[i] += ms;
    stemAt = Date.now();
  }
  function commit(q, i, conf, re) {
    sync();
    const now = Date.now(), ms = now - stemAt;
    // On a reopen with a pick already there, dither starts when the stem opens.
    const from = pickAt || (re || run.pick[i] != null ? stemAt : now);
    SP.commit(run, i, temp, conf, ms, now - from, re);
    aside = '';
    persist();
    if (re) return list();
    seal(i, conf);
  }
  function seal(i, conf) {
    run.phase = 'seal';
    const diff = run.used - (i + 1) * PACE;
    run.seals.push({ i, diff });
    sync(); persist();
    const owed = run.marked.filter(Boolean).length;
    const coo = diff > 30 * SEC ? `Coo. ${mmss(diff)} behind me.` : diff < -30 * SEC ? `Coo. ${mmss(-diff)} ahead of me.` : 'Coo. On schedule.';
    const line = run.practice ? 'Sealed. It opens at the Lamp House.' : `${coo}${owed ? ` ${WORDS[owed] || owed} marker${owed === 1 ? '' : 's'} owed.` : ''}`;
    const n = run.ids.length, cooAt = Math.min(n, run.used / PACE), youAt = i + 1;
    const b = draw(`${topBar(i, status(i + 1))}
      <button class="sp-stage" id="sp-skip" aria-label="Skip">${band(run, i, {})}${!run.practice && i >= 7 ? `<span class="sp-tag">Last stretch: ${9 - i} to the lamp</span>` : ''}</button>
      <div class="sp-card sp-sealc">${jar('sealed', 64)}<div><b>${conf == null ? '⚑ Marked' : meter(conf) + ' ' + M.CONF[conf]}</b><p class="small">Sealed. It opens at the Lamp House.</p></div></div>
      ${run.exam ? '' : `<div class="sp-track" aria-hidden="true"><i class="sp-tr-you" style="left:${youAt / n * 100}%">you</i><i class="sp-tr-coo" style="left:${Math.min(100, cooAt / n * 100)}%">Coo</i></div>
      <p class="sp-coo">${esc(line)}</p>`}`);
    b.querySelector('.sp-jar').classList.add('sp-wob');
    say(run.exam ? 'Sealed.' : line);
    const go = () => { clearTimeout(sealTo); sealTo = null; nextPatch(); };
    b.querySelector('#sp-skip').onclick = go;
    sealTo = setTimeout(go, run.exam ? 300 : 1800);
  }
  function nextPatch() {
    if (run.at < run.ids.length - 1 && run.phase === 'seal') { run.at++; return encounter(); }
    list();
  }

  // ---- Looking back ----
  function list() {
    run.phase = 'list';
    sync(); persist();
    const rows = run.ids.map((id, i) => {
      const q = find(id), p = run.pick[i], m = run.marked[i];
      if (filter === 'marked' && !m) return '';
      if (filter === 'unanswered' && p != null) return '';
      const pick = p == null ? 'unanswered' : lettersOf(i, p);
      const c = run.conf[i];
      const line = run.exam ? `Patch ${i + 1} · ${pick}${m ? ' · ⚑' : ''}`
        : `Patch ${i + 1} · ${pick} · ${m ? '⚑ marked' : c == null ? '' : M.CONF[c]} · ${mmss(run.first[i] + run.reopen[i])}`;
      return `<button class="sp-row${m ? ' marked' : ''}" data-i="${i}" aria-label="${esc(line)}, reopen">${m ? '<span aria-hidden="true">⚑ </span>' : ''}${esc(line.replace(/ · $/, ''))}</button>`;
    }).join('') || '<p class="muted small">Nothing here.</p>';
    const b = draw(`${topBar(-1, '')}
      ${run.practice ? '' : `<div class="sp-sun">${band(run, 9, { step: 10, noLand: true })}</div>`}
      <p class="sp-lb">The last of the sun. From the Lamp House steps you can see the whole road. Anything you want to walk back to before dark?</p>
      <div class="sp-filt" role="group" aria-label="Show">${[['all', `All (${run.ids.length})`], ['marked', `⚑ Marked (${run.marked.filter(Boolean).length})`], ['unanswered', `Unanswered (${run.pick.filter(p => p == null).length})`]].map(([k, t]) => `<button class="ghost${filter === k ? ' on' : ''}" data-f="${k}" aria-pressed="${filter === k}">${t}</button>`).join('')}</div>
      <p class="muted small">Only a patch cut off by sunset can be unanswered.</p>
      <div class="sp-rows">${rows}</div>
      <div class="sp-sheet" id="sp-sheet" hidden></div>
      <div class="sp-foot"><button class="ghost" id="sp-fin">Finish now</button>${run.marked.some((m, i) => m && !run.reopened[i]) ? `<button class="primary" id="sp-re1">Reopen patch ${run.marked.findIndex((m, i) => m && !run.reopened[i]) + 1}</button>` : ''}</div>`);
    b.querySelectorAll('[data-f]').forEach(el => el.onclick = () => { filter = el.dataset.f; list(); });
    b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => reopen(+el.dataset.i));
    const r1 = b.querySelector('#sp-re1'); if (r1) r1.onclick = () => reopen(run.marked.findIndex((m, i) => m && !run.reopened[i]));
    b.querySelector('#sp-fin').onclick = () => {
      const owe = run.marked.filter((m, i) => m && !run.reopened[i]).length;
      if (!owe) return finish();
      const sh = b.querySelector('#sp-sheet');
      sh.hidden = false;
      sh.innerHTML = `<p><b>${owe === 1 ? '1 marked patch' : owe + ' marked patches'} not reopened. Finish anyway?</b></p><div class="sp-foot"><button class="ghost" id="sp-gb">Go back</button><button class="primary" id="sp-fy">Finish</button></div>`;
      sh.querySelector('#sp-gb').onclick = () => { sh.hidden = true; };
      sh.querySelector('#sp-fy').onclick = finish;
      sh.querySelector('#sp-fy').focus();
    };
  }
  function reopen(i) {
    run.phase = 're'; run.at = i;
    temp = run.pick[i] == null ? null : JSON.parse(JSON.stringify(run.pick[i]));
    stemAt = Date.now(); pickAt = 0; guardTo = Date.now() + GUARD;
    sync(); persist();
    drawQ(find(run.ids[i]), i, true);
  }
  function sunset() {
    sync();
    if (run.phase === 'q' || run.phase === 're') {
      const i = run.at, re = run.phase === 're';
      leaveStem(i, re);
      // The open patch keeps a pick it had (scored as a Guess, counted as marked); else it's unanswered.
      if (!re && temp != null && answered(find(run.ids[i]), temp)) { run.pick[i] = temp; run.conf[i] = null; }
    }
    clearTimeout(sealTo); sealTo = null;
    run.sunset = true; run.used = run.limit;
    run.phase = 'house'; run.hstep = 0;
    persist();
    draw(`${topBar(-1, '')}<div class="sp-sun">${band(run, 9, { step: 11, noLand: true })}</div><p class="sp-lb"><b>The sun set.</b> Everything stands as it is.</p>`);
    setTimeout(() => house(0), 1200);
  }
  function finish() {
    sync();
    run.phase = 'house'; run.hstep = 0;
    persist();
    house(0);
  }

  // ---- The Lamp House ----
  function record() {
    if (run.recorded) return;
    run.recorded = true;
    const sc = SP.score(run), st = store(), now = Date.now();
    sc.rows.forEach(r => {
      if (r.unans) { E().noteAnswer(null, r.id, false); return; }
      const q = r.q, c = SD.today && SD.today.conceptOf ? SD.today.conceptOf(q) : null;
      if (c) S.recordAnswer(c, r.ok, r.conf == null ? 0 : r.conf, run.first[r.i] + run.reopen[r.i], r.id);
      else E().noteAnswer(null, r.id, r.ok);
      if (r.counted) M.note(null, r.ok, r.conf);
      if (!r.ok && r.counted && r.conf === 2) M.sureMiss(r.id);
      if (!run.practice) {
        const f = st.fam[r.fam.id] = st.fam[r.fam.id] || { caught: 0, gold: 0, slipped: 0 };
        if (r.ok) { f.caught++; if (r.kind === 'gold') f.gold++; if (r.kind === 'loose') f.loose = 1; else f.settled = 1; } else f.slipped++;
        if (!r.ok || r.kind === 'loose') st.lead.push({ q: r.id, day: new Date().toDateString(), t: now });
        if (!r.ok) st.slip.push({ q: r.id, fam: r.fam.id, t: now });
        else SP.addCheck(r.id, r.fam.id, now);
      }
    });
    st.lead = st.lead.slice(-20); st.slip = st.slip.slice(-30);
    if (run.practice) st.practiced = now;
    else if (run.key !== 'free') st.done[run.key] = now;
    const res = { key: run.key, t: now, right: sc.right, n: sc.n, pts: sc.pts, tax: sc.tax, d13: sc.d13, med: sc.med, long: sc.long, reopenT: sc.reopenT,
      first: run.first, reopen: run.reopen, dither: run.dither, changes: run.changes, tfp: run.tfp, inter: run.inter, marked: run.wasMarked, raised: run.raised,
      between: run.between, list: run.list, used: run.used, ids: run.ids, sunset: !!run.sunset, words: run.ids.map(id => String(find(id).q).split(/\s+/).length),
      marks: markStats(SP.marks(run, sc)) };
    if (!run.practice) st.results.push(res);
    st.results = st.results.slice(-12);
    run.res = res;
    run.payLine = run.practice ? '' : M.pay(ID);
    persist();
  }
  // The per-run mark counts kept in the save (a later run shows the change since this one).
  const MARK_KEYS = ['marked', 'back', 'changed', 'right', 'turned', 'hurt', 'missed', 'guessMiss', 'unused'];
  const markStats = m => Object.fromEntries(MARK_KEYS.map(k => [k, m[k]]));
  const pList = a => (a.length === 1 ? 'patch ' + a[0] : 'patches ' + a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1]);
  const trend = (a, b) => `${a} → ${b} (${b < a ? 'fewer' : b > a ? 'more' : 'same'})`;
  // The Marks card in the debrief: every state in words and an icon.
  function marksCard(sc, perPatch) {
    const m = SP.marks(run, sc), st = store();
    const misses = m.missed;
    const lines = [];
    if (m.marked) {
      lines.push(`<li><b>⚑ Marks well spent:</b> ${m.marked} marked · ↩ ${m.back} came back · ✎ ${m.changed} changed · ✓ ${m.right} ended right</li>`);
      if (m.turned) lines.push(`<li>✓ ${m.turned === 1 ? '1 mark' : m.turned + ' marks'} turned a wrong first pick into a right one.</li>`);
      if (m.hurt) lines.push(`<li>× ${m.hurt === 1 ? '1 change' : m.hurt + ' changes'} turned a right first pick wrong.</li>`);
      if (m.notBack) lines.push(`<li>↩ ${m.notBack} marked and not walked back to.</li>`);
    } else lines.push('<li>⚑ No marks this run.</li>');
    if (misses) {
      lines.push(`<li><b>× Misses you didn't mark:</b> ${misses} (${pList(m.missAt)}).${m.guessMiss ? ` ${m.guessMiss === 1 ? '1 was' : m.guessMiss + ' were'} committed as ${meter(0)} Guess (${pList(m.guessAt)}): you knew you were unsure.` : ''}</li>`);
      lines.push('<li class="muted">Rule of thumb: on the exam, flag any question you\'d press Guess on.</li>');
      if (m.unused) lines.push(`<li>⚑ ${m.unused === 1 ? '1 marker' : m.unused + ' markers'} unused, with ${misses === 1 ? '1 miss' : misses + ' misses'} unmarked.</li>`);
    } else lines.push('<li>✓ Every unmarked patch you committed ended right.</li>');
    const t = run.res ? run.res.t : Date.now();
    const prev = st.results.filter(r => r.marks && r.t < t).slice(-1)[0];
    if (prev) {
      const p = prev.marks, bits = [`unmarked misses ${trend(p.missed, m.missed)}`];
      if (p.guessMiss || m.guessMiss) bits.push(`unmarked Guess misses ${trend(p.guessMiss, m.guessMiss)}`);
      lines.push(`<li>Since last time: ${bits.join(' · ')}.</li>`);
    }
    return { m, html: `<div class="sp-dc sp-marks"><b>Marks</b><ul class="small">${lines.join('')}</ul>${perPatch ? `<p class="small sp-mkh">Each marked patch</p><ul class="small">${perPatch}</ul>` : ''}</div>` };
  }
  function house(step) {
    stopTick();
    run.phase = 'house'; run.hstep = step;
    record();
    persist();
    [pace, jars, debrief, ending][Math.min(3, step)]();
  }
  function hdraw(h) { return draw(`<img class="sp-lh" src="${ART}lamp-house.webp" width="256" height="192" alt="The Lamp House at dusk" draggable="false">` + h, HOUSE); }
  function pace() {
    const sc = SP.score(run), n = run.ids.length, W = 330, H = 190, top = 10, base = 160, max = 4 * MIN, bw = Math.floor((W - 40) / n) - 6;
    const y = t => base - Math.min(t, max) / max * (base - top);
    const bars = run.ids.map((id, i) => {
      const x = 34 + i * (bw + 6), f = sc.firsts[i], r = run.reopen[i];
      const over = f > OVER;
      return `<rect x="${x}" y="${y(f)}" width="${bw}" height="${base - y(f)}" fill="${over ? '#f08a3c' : '#4a7fd9'}" stroke="${INK}" stroke-width="1.5"/>
        ${r ? `<rect x="${x}" y="${y(f + r)}" width="${bw}" height="${y(f) - y(f + r)}" fill="url(#sp-hatch)" stroke="${INK}" stroke-width="1.5"/>` : ''}
        <text x="${x + bw / 2}" y="${base + 14}" text-anchor="middle" font-size="11">${i + 1}${over ? '▲' : ''}</text>`;
    }).join('');
    // Proctor's Pass: Route 1's first pass per patch as dashed outlines (the Nov 24 ghost).
    const ghostRes = run.exam ? store().results.filter(x => x.key === 'r1').slice(-1)[0] : null;
    const ghost = ghostRes ? ghostRes.first.map((f, i) => { const x = 34 + i * (bw + 6); return `<rect x="${x - 2}" y="${y(f)}" width="${bw + 4}" height="${base - y(f)}" fill="none" stroke="${INK}" stroke-width="1.2" stroke-dasharray="3 2"/>`; }).join('') : '';
    const line = (t, lab, dash) => `<line x1="30" x2="${W}" y1="${y(t)}" y2="${y(t)}" stroke="${INK}" stroke-width="1.5"${dash ? ' stroke-dasharray="4 3"' : ''}/><text x="${W}" y="${dash ? y(t) + 11 : y(t) - 3}" text-anchor="end" font-size="10" font-weight="700">${lab}</text>`;
    const s4 = run.startLeft[3], s8 = run.startLeft[7];
    const chk = run.practice ? '' : `<li>Checkpoints: patch 4 started with ${s4 == null ? '—' : clockText(s4)} left (mark 14:00) · patch 8 with ${s8 == null ? '—' : clockText(s8)} left (mark 6:00)</li>`;
    const t13 = run.practice ? `Time on the patch: ${mmss(sc.firsts[0])}, dither ${mmss(run.dither[0])}` : `Overthink tax: ${sgnT(sc.tax)} over 2:00 on patches 1 to 3 · dither ${mmss(sc.d13)}`;
    const b = hdraw(`<div class="sp-house">
      ${host('lexi', 'Lexi', ['"The Index records your footsteps before it records your answers."', run.sunset ? '"The sun beat you to the door. Sit anyway. The jars can wait a minute."' : '"You made it before dark. Sit. The jars can wait a minute."'])}
      <p class="td-head">1. The pace log</p>
      <svg class="sp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="First-pass time per patch against the 2:00 line and Coo's 1:45 line; table below">
        <defs><pattern id="sp-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#fff"/><rect width="2" height="5" fill="${INK}"/></pattern></defs>
        <line x1="30" x2="30" y1="${top}" y2="${base}" stroke="${INK}"/>
        ${[0, 1, 2, 3, 4].map(m => `<text x="26" y="${y(m * MIN) + 4}" text-anchor="end" font-size="10">${m}:00</text>`).join('')}
        ${bars}${ghost}${line(OVER, '2:00')}${run.practice ? '' : line(PACE, 'Coo 1:45', true)}
      </svg>
      <p class="small muted">▲ over 2:00 · hatched top = reopen time${ghost ? ' · dashed outline = Route 1 on Nov 24' : ''}</p>
      <ul class="sp-facts small">
        <li>${t13}</li>
        ${run.practice ? '' : `<li>Dither on patches 4 to 10: ${mmss(sc.med)} median · patches reaching 2:30: ${sc.long}</li>`}
        <li>Reopen time ${mmss(sc.reopenT)}${sc.reopenN ? ` on ${plural(sc.reopenN, 'patch')}` : ''}. Going back is the exam's own strategy, so it isn't judged.</li>
        ${chk}
        ${run.exam ? `<li>Between patches: ${mmss(run.between)} · on the list: ${mmss(run.list)}</li>` : `<li>On the list: ${mmss(run.list)}</li>`}
      </ul>
      <table class="sr"><caption>Pace per patch</caption><tr><th>Patch</th><th>First pass</th><th>Reopen</th><th>Dither</th></tr>
        ${run.ids.map((id, i) => `<tr><td>${i + 1}</td><td>${mmss(sc.firsts[i])}</td><td>${mmss(run.reopen[i])}</td><td>${mmss(run.dither[i])}</td></tr>`).join('')}</table>
      <div class="sp-foot"><button class="primary" id="sp-next">Open the jars</button></div></div>`);
    b.querySelector('#sp-next').onclick = () => house(1);
    b.querySelector('#sp-next').focus();
  }
  function jars() {
    const sc = SP.score(run), op = run.opened = run.opened || [];
    const R = D.runs[run.key], pair = R && run.key !== 'free' ? R.pair : null;
    const caught = sc.rows.filter(r => op.includes(r.i) && r.ok).length, empty = sc.rows.filter(r => op.includes(r.i) && !r.ok).length;
    const kindOf = r => (r.ok ? r.kind : 'empty');
    const cell = r => {
      const o = op.includes(r.i);
      const st = !o ? (r.counted && r.conf === 2 ? 'gold' : 'sealed') : r.ok ? 'full' : 'empty';
      const lab = `${r.i + 1}${run.wasMarked[r.i] ? ' ⚑' : ''}${o && r.kind === 'gold' && r.ok ? ' ★' : ''}`;
      return `<button class="sp-jarb${o ? ' open' : ''}${run.jarAt === r.i ? ' cur' : ''}" data-j="${r.i}" aria-label="Jar ${r.i + 1}${o ? ', ' + (r.ok ? 'caught' : 'empty') : ', sealed'}">${jar(st, 48)}<span class="small">${lab}</span>${o ? `<span class="sp-jn">${r.ok ? esc(r.fam.name) : '× empty'}</span>` : ''}</button>`;
    };
    const card = r => {
      if (!r) return '';
      const q = r.q, k = kindOf(r), dec = D.decide[q.id];
      const pick = r.unans ? 'No answer (sunset)' : [].concat(r.ok ? [] : r.q.type === 'mc' ? [q.opts[run.pick[r.i]]] : run.pick[r.i].map(x => q.items[x].t));
      const conf = r.conf == null ? '⚑ marked' : `${meter(r.conf)} ${M.CONF[r.conf]}`;
      let c = '';
      const firstEmpty = !store().emptySaid && k === 'empty';
      if (firstEmpty) { store().emptySaid = 1; }
      // With a deciding phrase, the whole stem shows with the phrase marked where it sits (Ladi, Nov 17: the term beside
      // its result, not quoted off on its own); without one, the stem's first line as before.
      const hl = dec ? markIn(String(q.q), dec) : '';
      const head = `<p class="sp-jh"><b>Jar ${r.i + 1}</b> · ${conf}${r.unans ? '' : k === 'gold' ? ' · ★ gold seal' : k === 'loose' ? ' · loose' : k === 'empty' ? ' · × empty' : ' · caught'}</p>${hl ? `<p class="small sp-stem">${hl}</p>` : `<p class="small muted">"${esc(firstLine(q))}"</p>`}`;
      const rule = r.ok ? ruleOf(q) : '';
      const who = r.ok ? daemon(r.fam, 64, k === 'loose') : `<span class="sp-peek">${daemon(r.fam, 48, false, true)}<span class="small">rustling in the grass</span></span>`;
      const sureMiss = !r.ok && r.counted && r.conf === 2;
      const whyBody = `<p>${esc(q.why || '')}</p>${whyNot(q).map(([o, n]) => `<p class="small"><b>Why not</b> "${esc(o)}": ${esc(n)}</p>`).join('')}
        ${SD.verified && SD.verified[q.id] && SD.verified[q.id].era ? `<p class="small sp-era">${esc(SD.verified[q.id].era)}</p>` : ''}
        <p class="small">${E().docs(q).map((u, n) => `<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">AWS docs${E().docs(q).length > 1 ? ' ' + (n + 1) : ''} ↗</a>`).join(' · ')}</p>`;
      if (k === 'gold') c = `<p>Sure and right.</p>`;
      else {
        c = `<ul class="sp-jl"><li>✓ ${rightText(q).map(esc).join(' <br>✓ ')}</li>
          ${r.ok ? '' : `<li>× ${[].concat(pick).map(esc).join(' <br>× ')}</li>`}
          ${dec ? `<li>Deciding phrase: ${hl ? 'marked in the question above' : `"${esc(dec)}"`}</li>` : ''}</ul>
          <details class="sp-whyd"${sureMiss ? ' open' : ''}><summary>Why</summary>${whyBody}</details>`;
      }
      // The contrast line on the pair's second jar in road order.
      let pairL = '';
      if (pair && pair.includes(q.id)) {
        const idx = pair.map(id => run.ids.indexOf(id));
        if (idx.every(x => x >= 0) && r.i === Math.max(...idx)) {
          const [a, bb] = idx.slice().sort((x, y) => x - y);
          pairL = `<p class="sp-pair">Patch ${a + 1} was ${esc(D.pairLine[run.ids[a]])}. Patch ${bb + 1} was ${esc(D.pairLine[run.ids[bb]])}.</p>`;
        }
      }
      return `<div class="sp-jc ${k}">${firstEmpty ? host('lexi', 'Lexi', ['"The lid didn\'t take. It slipped out somewhere on the road."']) : ''}${head}<div class="sp-jw">${who}</div>${rule ? `<p class="small sp-rule"><b>${esc(r.fam.name)}'s rule:</b> ${esc(rule)}</p>` : ''}${c}${pairL}</div>`;
    };
    const at = sc.rows.find(r => r.i === run.jarAt);
    const all = op.length >= sc.rows.length;
    const b = hdraw(`<div class="sp-house">
      ${!run.brokeSeal ? host('lexi', 'Lexi', ['"I now break the seal."']) : ''}
      <p class="td-head">2. The jars <span class="small">· ${caught} caught · ${empty} empty</span></p>
      <div class="sp-jars">${sc.rows.map(cell).join('')}</div>
      <p class="small muted">Plum wax: sealed · gold wax: Sure · ⚑ was marked</p>
      ${card(at)}
      <div class="sp-foot">${all ? '<button class="primary" id="sp-next">See the debrief</button>' : '<button class="primary" id="sp-rest">Open the rest</button>'}</div></div>`);
    b.querySelectorAll('[data-j]').forEach(el => el.onclick = () => openJar(+el.dataset.j));
    const nx = b.querySelector('#sp-next'); if (nx) nx.onclick = () => house(2);
    const rest = b.querySelector('#sp-rest');
    if (rest) rest.onclick = () => openRest();
    const cj = b.querySelector('.sp-jc');
    if (cj && run.jarAt != null) cj.scrollIntoView({ block: 'nearest' });
  }
  function openJar(i) {
    run.opened = run.opened || [];
    run.brokeSeal = true;
    if (!run.opened.includes(i)) run.opened.push(i);
    run.jarAt = i;
    persist();
    jars();
    const el = body.querySelector(`[data-j="${i}"] .sp-jar`); if (el) el.classList.add('sp-pop');
  }
  // Opens the remaining jars in road order, holding 700 ms on a jar with nothing to read and stopping at the next one
  // with feedback.
  function openRest() {
    const sc = SP.score(run);
    const next = sc.rows.find(r => !(run.opened || []).includes(r.i));
    if (!next) return jars();
    openJar(next.i);
    if (next.ok && next.kind === 'gold') setTimeout(() => { if (run && run.phase === 'house' && run.hstep === 1 && body && body.isConnected) openRest(); }, 700);
  }
  function debrief() {
    const sc = SP.score(run), st = store();
    const DOM = ['Development', 'Security', 'Deployment', 'Troubleshooting'];
    const marks = run.ids.map((id, i) => {
      if (!run.wasMarked[i]) return '';
      const ch = run.changed[i];
      const ok = sc.rows[i].ok;
      return `<li>Patch ${i + 1}: ${ch ? `changed ${lettersOf(i, ch.from) || 'nothing'} to ${lettersOf(i, ch.to)}` : run.reopened[i] ? `kept ${lettersOf(i, run.pick[i])}` : 'not reopened'}${run.raised[i] ? ', raised the stake' : ''}; ${ok ? 'right' : 'wrong'}.</li>`;
    }).join('');
    const t = sc.tally;
    const cnt = k => `${t[k][0]}/${t[k][1]}`;
    const before = st.results.filter(r => r.key === 'r1').slice(-1)[0];
    const check = run.exam && before ? SP.check(sc, Object.assign({ n: before.ids.length }, before)) : null;
    const pip = sc.rows.find(r => r.ok && r.counted && r.conf === 1);
    const plan = st.plan || PLAN;
    const mk = marksCard(sc, marks), add = SP.marksPlan(mk.m);
    // A run recorded before the Marks readout keeps its counts from here on.
    if (run.res && !run.res.marks) { run.res.marks = markStats(mk.m); const r = st.results.find(x => x.t === run.res.t); if (r) r.marks = run.res.marks; persist(); }
    const b = hdraw(`<div class="sp-house sp-deb">
      <p class="td-head">3. Debrief</p>
      <div class="sp-dc"><b>Pace</b><p class="small">${run.practice ? `The patch took ${mmss(sc.firsts[0])}, dither ${mmss(run.dither[0])}.` : `Patches 1 to 3: ${sgnT(sc.tax)} over 2:00, dither ${mmss(sc.d13)}. Patches 4 to 10: dither ${mmss(sc.med)} median.`}</p></div>
      ${check ? `<div class="sp-dc sp-check"><b>${check.held ? 'Pacing held' : 'Not yet'}</b><ul class="small">${check.parts.map(p => `<li>${p.ok ? '✓' : '·'} ${esc(p.what)}: ${esc(p.line)}${p.ok ? '' : ' (didn\'t hold)'}</li>`).join('')}</ul></div>` : ''}
      <div class="sp-dc"><b>By domain · ${sc.right} of ${sc.n}</b><p class="small">${[1, 2, 3, 4].filter(d => sc.dom[d]).map(d => `${DOM[d - 1]} ${sc.dom[d][0]}/${sc.dom[d][1]}`).join(' · ')}</p>
        <p class="small muted">These are exam-style questions, so a lower score than your drills is expected.</p></div>
      ${mk.html}
      <div class="sp-dc"><b>How sure you were (this run)</b><p class="small">${meter(0)} Guess ${cnt(0)} · ${meter(1)} Think so ${cnt(1)} · ${meter(2)} Sure ${cnt(2)} · ⚑ marked ${cnt('marked')}</p>
        <p class="small muted">Too few to read in one run. Advice comes from all your answers once a level has 20.</p>
        <p class="small">Calibration points: <b>${M.sgn(sc.pts)}</b></p>
        <details class="small"><summary>How points work</summary>${M.stakeTable()}<p>A marked pick scores as a Guess and isn't counted as one.</p></details></div>
      <div class="sp-dc"><b>Your plan${run.exam ? '' : ' for Proctor\'s Pass'}</b>
        <textarea id="sp-plan" rows="3" maxlength="300" aria-label="Your if-then plan">${esc(plan)}</textarea>
        ${add && !plan.includes(add) ? `<div class="sp-add"><p class="small">⚑ From your marks: "${esc(add)}"</p><button class="ghost" id="sp-addp">Add to my plan</button></div>` : ''}
        <p class="small muted">Try it on your next practice test too. Lexi shows it at the Nov 28 gate.</p></div>
      ${pip ? `<form class="sp-dc sp-pip"><label for="sp-pin"><b>Pip:</b> "Sorry to be a bother. Why did that work?"</label><p class="small muted">"${esc(firstLine(pip.q))}" · ${meter(1)} Think so, right</p>
        <input id="sp-pin" type="text" maxlength="200" autocomplete="off" placeholder="One sentence, in your words">
        <div class="sp-foot"><button class="primary" type="submit">Keep it</button><button class="ghost" type="button" id="sp-pskip">Skip</button></div><p class="small" id="sp-pok" hidden>Saved ✓</p></form>` : ''}
      <div class="sp-foot"><button class="primary" id="sp-next">See today's road</button></div></div>`);
    const ta = b.querySelector('#sp-plan');
    ta.onchange = () => { st.plan = ta.value.trim() || PLAN; S.persist(); };
    if (!st.plan) { st.plan = PLAN; S.persist(); }
    const ap = b.querySelector('#sp-addp');
    if (ap) ap.onclick = () => {
      const v = ta.value.trim(), nv = v.includes(add) ? v : (v ? v + ' ' : '') + add;
      if (nv.length > 300) { ap.previousElementSibling.textContent = 'Your plan is full (300 characters). Shorten it to make room.'; return; }
      ta.value = nv; st.plan = nv; S.persist();
      ap.disabled = true; ap.textContent = 'Added to your plan ✓';
    };
    const f = b.querySelector('.sp-pip');
    if (f) {
      f.onsubmit = e => {
        e.preventDefault();
        const v = f.querySelector('input').value.trim();
        if (!v) return;
        const l = sv().pipNotes = sv().pipNotes || [];
        l.push({ t: Date.now(), topic: pip.q.topic || '', text: v, q: pip.id });
        if (l.length > 60) l.shift();
        S.persist();
        f.querySelector('#sp-pok').hidden = false;
      };
      f.querySelector('#sp-pskip').onclick = () => { f.hidden = true; };
    }
    b.querySelector('#sp-next').onclick = () => { st.plan = ta.value.trim() || PLAN; S.persist(); house(3); };
  }
  function ending() {
    const sc = SP.score(run);
    const caught = sc.rows.filter(r => r.ok), slipped = sc.rows.filter(r => !r.ok);
    const pat = run.practice ? null : SP.pattern(run);
    const b = hdraw(`<div class="sp-house sp-end">
      <div class="sp-porch">
        <p class="sp-endh">Today's road</p><p class="small">${caught.length} caught · ${slipped.length} slipped out</p>
        ${caught.length ? `<div class="sp-parade">${caught.map(r => `<button class="sp-pet" data-p="${r.fam.id}" aria-label="Pet ${esc(r.fam.name)}">${daemon(r.fam, 64, r.kind === 'loose')}${r.kind === 'gold' ? '<span class="sp-gold" aria-label="gold seal">★</span>' : ''}</button>`).join('')}</div>` : ''}
        ${slipped.length ? `<div class="sp-grass">${slipped.map(r => daemon(r.fam, 48, false, true)).join('')}</div>` : ''}
      </div>
      <p class="sp-bub small" id="sp-bub" aria-live="polite"></p>
      ${slipped.length ? `<p class="small">Rustling in the meadow: ${slipped.map(r => esc(r.fam.name)).join(', ')}. Questions on their ideas lead tomorrow's set.</p>` : ''}
      ${pat ? host('coo', 'Coo', [esc(COO_END[pat])]) : ''}
      ${run.payLine ? `<p class="small">${esc(run.payLine)}</p>` : ''}
      <p class="small muted">${run.practice ? 'That was the practice patch. The road is ready when you are.' : 'That\'s the road for tonight.'}</p>
      <div class="sp-foot"><button class="primary" id="sp-done">Done for tonight</button></div></div>`);
    b.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
      const f = SP.famById(el.dataset.p);
      b.querySelector('#sp-bub').textContent = `${f.name}: ${f.pet}`;
      el.classList.remove('sp-hop1'); void el.offsetWidth; el.classList.add('sp-hop1');
    });
    b.querySelector('#sp-done').onclick = () => { run.phase = 'done'; persist(); run = null; U.closePanel(); leave(); };
    b.querySelector('#sp-done').focus();
  }

  // ---- Rematches (drop 2): a plain list of the daemons that slipped out ----
  // One question per daemon per day and one per idea per day, labelled "Twin" (its unseen twin) or "Same idea" (an
  // unseen question on the same exam task and topic), verified first; with neither, "No twin yet" and it waits.
  const DAY = 86400000;
  const today = () => new Date().toDateString();
  const conceptOf = q => (SD.today && SD.today.conceptOf ? SD.today.conceptOf(q) : null);
  SP.rematchQ = function (id, used) {
    const q = find(id);
    if (!q) return null;
    const avoid = [...(used || [])], Dr = SD.topicDrill, log = sv().qlog || {};
    const tw = SD.qtwin ? SD.qtwin(q, { avoid }) : null;
    if (tw) return { q: tw, label: 'Twin', ver: Dr.isVerified(tw) };
    const same = Dr.base().filter(x => x.id !== q.id && !avoid.includes(x.id) && !log[x.id] && x.topic === q.topic && E().taskOf(x) === E().taskOf(q) && (x.type === 'mc' || x.type === 'multi'));
    const pick = same.filter(Dr.isVerified)[0] || same[0];
    return pick ? { q: pick, label: 'Same idea', ver: Dr.isVerified(pick) } : null;
  };
  SP.rematches = () => store().slip.filter(x => !x.won);
  function rematchList(msg) {
    const st = store(), day = today();
    const ideas = new Set(st.slip.filter(x => x.day === day).map(x => x.c));
    const rows = SP.rematches().map((x, k) => {
      const f = SP.famById(x.fam);
      if (x.day === day) return `<li class="sp-rm">${daemon(f, 48, false, true)}<span class="small">Tried today. Back tomorrow.</span></li>`;
      const rq = SP.rematchQ(x.q);
      const c = rq && conceptOf(rq.q);
      if (!rq) return `<li class="sp-rm">${daemon(f, 48, false, true)}<span class="small">No twin yet. It waits in the grass.</span></li>`;
      if (c && ideas.has(c)) return `<li class="sp-rm">${daemon(f, 48, false, true)}<span class="small">One question on this idea a day. Back tomorrow.</span></li>`;
      return `<li class="sp-rm">${daemon(f, 48, false, true)}<span class="small">${rq.label}${rq.ver ? '' : ' · Not verified yet'}</span><button class="primary" data-rm="${st.slip.indexOf(x)}">Rematch</button></li>`;
    }).join('');
    const b = draw(`<div class="sp-gate">
      <p class="td-head">Rematches</p>
      ${msg ? `<p class="sp-card">${msg}</p>` : ''}
      <p class="small muted">Daemons that slipped out wait in the grass. One question each a day, untimed, with the answer right after.</p>
      ${rows ? `<ul class="sp-rml">${rows}</ul>` : '<p>Nothing is rustling in the grass.</p>'}
      <div class="sp-foot"><button class="ghost" id="sp-rback">Back to the road</button></div></div>`);
    b.querySelector('#sp-rback').onclick = () => gate();
    b.querySelectorAll('[data-rm]').forEach(el => el.onclick = () => rematch(st.slip[+el.dataset.rm]));
  }
  async function rematch(x) {
    const rq = SP.rematchQ(x.q);
    if (!rq) return rematchList();
    const q = Object.assign({}, rq.q, { c: conceptOf(rq.q) });
    x.day = today(); x.c = q.c; x.tries = (x.tries | 0) + 1;
    S.persist();
    const r = await M.ask(q, { noWall: false });
    const f = SP.famById(x.fam), st = store();
    if (r.closed || r.skipped || r.stopped) return rematchList();
    // Type it once (js/type-once.js): Rematches are untimed, so the first time this save meets the right answer's
    // term (an API, a setting, a condition key), you type it. Never on the road itself.
    if (SD.typeOnce) for (const line of rightText(rq.q)) { if (await SD.typeOnce.maybe(line, { who: 'Lexi', say: 'Before it goes in the jar: write the part that caught it.', title: 'THE REMATCH' })) break; }
    if (r.ok) {
      x.won = Date.now();
      const fr = st.fam[f.id] = st.fam[f.id] || { caught: 0, gold: 0, slipped: 0 };
      fr.caught++; fr.settled = 1;
      SP.addCheck(rq.q.id, f.id, x.won);
      S.persist();
      return rematchList(`Caught! ${esc(f.name)} hops into a jar. A check question on its idea comes in 2 or 3 days.`);
    }
    S.persist();
    rematchList(`${esc(f.name)} slipped away again. It'll be back in the grass tomorrow.`);
  }

  // ---- Spaced checks (drop 2): 2 or 3 days after a catch, one check question on the same idea in Today's set ----
  // Right with Think so or Sure gives the family a CHECKED stamp (evolution waits until after Nov 30).
  SP.addCheck = function (id, fam, t) {
    const st = store();
    st.checks.push({ q: id, fam, due: t + 2 * DAY });
    st.checks = st.checks.slice(-40);
  };
  SP.settleChecks = function () {
    const st = sv().sprint;
    if (!st || !st.checks) return;
    const log = sv().qlog || {}, day = today();
    st.checks.forEach(ch => {
      if (ch.done || !ch.pid) return;
      const l = log[ch.pid];
      if (l && l[0] >= ch.at) {
        ch.done = l[0];
        const c = conceptOf(find(ch.pid) || {}), hist = (c && sv().concepts[c] && sv().concepts[c].hist) || [];
        const h = hist.filter(x => Math.abs(x.t - l[0]) < 5000).slice(-1)[0];
        if (l[1] && h && h.conf >= 1) {
          ch.checked = 1;
          const f = st.fam[ch.fam] = st.fam[ch.fam] || { caught: 0, gold: 0, slipped: 0 };
          f.checked = (f.checked | 0) + 1;
        }
      } else if (ch.pickDay && ch.pickDay !== day) { delete ch.pid; delete ch.pickDay; }
    });
  };

  // ---- Tomorrow's set (js/today.js T.build): one question on the idea of each empty and loose jar ----
  // From the next day on, once each: its twin when it has one, else an unseen question on the same task and topic.
  SP.leadItems = function (used) {
    const st = sv().sprint;
    if (!st) return [];
    st.lead = st.lead || [];
    const day = new Date().toDateString(), out = [], log = sv().qlog || {};
    st.lead.forEach(l => {
      if (l.used || l.day === day || out.length >= 4) return;
      const q = find(l.q);
      if (!q) { l.used = day; return; }
      let pick = SD.qtwin ? SD.qtwin(q, { avoid: [...used] }) : null;
      if (!pick) {
        const same = SD.topicDrill.base().filter(x => x.id !== q.id && !used.has(x.id) && !log[x.id] && x.topic === q.topic && E().taskOf(x) === E().taskOf(q) && (x.type === 'mc' || x.type === 'multi'));
        pick = same.filter(SD.topicDrill.isVerified)[0] || same[0] || null;
      }
      l.used = day;
      if (!pick) return;
      const c = SD.today && SD.today.conceptOf ? SD.today.conceptOf(pick) : null;
      if (!c) return;
      used.add(pick.id);
      out.push({ c, q: pick.id, lead: 1 });
    });
    // Spaced checks that are due: up to 2 more.
    SP.settleChecks();
    let nc = 0;
    (st.checks || []).forEach(ch => {
      if (ch.done || ch.pid || ch.due > Date.now() || nc >= 2) return;
      const rq = SP.rematchQ(ch.q, used);
      const c = rq && conceptOf(rq.q);
      if (!rq || !c) return;
      used.add(rq.q.id);
      ch.pid = rq.q.id; ch.at = Date.now(); ch.pickDay = day;
      out.push({ c, q: rq.q.id, lead: 1, check: 1 });
      nc++;
    });
    if (out.length) S.persist();
    return out;
  };

  // ---- Simulator (tools/modes_sim.js): a whole run on the state machine, with no UI ----
  function sim(policy, rng) {
    const ids = D.runs.r1.ids.filter(find);
    const r = SP.newRun('r1', { sim: true, ids });
    ids.forEach((id, i) => {
      const a = M.simAnswer(find(id), policy, rng), q = find(id);
      const pick = a.ok ? (q.type === 'mc' ? q.a : q.items.map((it, k) => (it.ok ? k : -1)).filter(k => k >= 0)) : (q.type === 'mc' ? (q.a + 1) % q.opts.length : [0, 1, 2].filter(k => !q.items[k].ok).slice(0, need(q)));
      r.used += M.SIM_Q_SECS * SEC;
      SP.commit(r, i, pick, a.conf, M.SIM_Q_SECS * SEC, 20 * SEC, false);
    });
    const sc = SP.score(r);
    return { pts: sc.pts, minutes: r.used / MIN, mapShare: 0, questions: ids.length, zero: false };
  }

  M.register({
    id: ID, name: 'Exam Sprint: the Proving Road', blurb: 'Ten questions on a 20-minute clock, at exam pace. Nothing is judged until the Lamp House.',
    minutes: 26, host: 'Lexi',
    start: () => SP.open(),
    status: () => {
      const c = cur();
      if (c && c.ids) return c.phase === 'house' ? 'The Lamp House is open' : `On the road: ${c.name}`;
      const k = nextKey();
      return !store().practiced ? 'Practice patch first' : k === 'free' ? 'The free road' : `Next: ${D.runs[k].name}`;
    },
    sim
  });

  const css = document.createElement('style');
  css.textContent = `
    .win.sprint .sp-b, .win.sprint > .win-b { padding-top: 0; }
    .sp-top { position: sticky; top: 0; z-index: 2; margin: 0 -16px 10px; padding: 8px 16px 6px; background: var(--ink); color: #fff; }
    .sp-r1 { display: flex; align-items: center; gap: 10px; font-family: var(--f-head); font-weight: 700; }
    .sp-n { flex: 1; font-size: 15px; white-space: nowrap; }
    .sp-mk { font-size: 14px; white-space: nowrap; }
    .sp-clock { font: 700 20px var(--f-head); font-variant-numeric: tabular-nums; min-width: 4.2em; text-align: right; white-space: nowrap; }
    .sp-r2 { height: 20px; line-height: 20px; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sp-r2.nudge { color: var(--sun); }
    .sp-band { display: block; width: 100%; height: auto; aspect-ratio: 375 / 176; image-rendering: pixelated; }
    .sp-stage { display: block; position: relative; width: calc(100% + 32px); margin: -10px -16px 10px; padding: 0; border: 0; border-bottom: 3px solid var(--ink); border-radius: 0; background: none; box-shadow: none; }
    .sp-stage:active { transform: none; box-shadow: none; }
    .sp-tag { position: absolute; left: 10px; top: 10px; padding: 2px 8px; border: 2px solid var(--ink); border-radius: 8px; background: #fff; font-size: 13px; font-weight: 800; color: var(--ink); }
    .sp-card { margin: 8px 0; padding: 10px 12px; border: 3px solid var(--ink); border-radius: 12px; background: #fff; }
    .sp-card p { margin: 2px 0 0; }
    .sp-sealc { display: flex; gap: 12px; align-items: center; }
    .sp-track { position: relative; height: 22px; margin: 14px 8px 4px; border-top: 3px dotted var(--ink); }
    .sp-track i { position: absolute; top: -12px; transform: translateX(-50%); font-style: normal; font-size: 11px; font-weight: 800; padding: 0 4px; border: 2px solid var(--ink); border-radius: 6px; background: #fff; }
    .sp-tr-coo { top: 4px !important; background: var(--paper) !important; }
    .sp-coo { font-weight: 800; margin: 6px 0; }
    .sp-q { padding-bottom: 8px; }
    .sp-stem { font-size: 16px; line-height: 1.45; }
    .sp-opt { min-height: 52px; }
    .sp-key.sq { border-radius: 4px; }
    .xh-opt.on .sp-key, .xh-opt[role="checkbox"].on .sp-key { background: var(--ink); color: #fff; font-size: 12px; }
    .sp-tray { position: sticky; bottom: -16px; margin: 0 -16px -16px; padding: 8px 16px 12px; background: var(--cream); border-top: 3px solid var(--ink); }
    .sp-why { min-height: 1.2em; margin: 0 0 6px; }
    .sp-commit { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
    .sp-commit button { min-height: 48px; padding: 6px 4px; display: inline-flex; gap: 6px; align-items: center; justify-content: center; white-space: nowrap; }
    .sp-commit [aria-disabled="true"], .sp-mark[aria-disabled="true"] { opacity: .55; }
    .sp-mark { display: block; width: 100%; min-height: 48px; margin-top: 12px; border-style: solid; }
    .sp-aside { padding: 6px 10px; border: 2px solid var(--ink); border-radius: 8px; background: var(--paper); }
    .sp-m { vertical-align: -3px; flex: none; }
    .sp-host { display: flex; gap: 10px; align-items: flex-start; margin: 8px 0; padding: 8px 10px; border: 3px solid var(--ink); border-radius: 12px; background: #fff; }
    .sp-host p { margin: 2px 0; }
    .sp-host .bust { flex: none; }
    .sp-gate .sp-band { margin: 0 -16px; width: calc(100% + 32px); border-bottom: 3px solid var(--ink); }
    .sp-route { margin: 6px 0; }
    .sp-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin: 8px 0; }
    .sp-tiles span { display: flex; flex-direction: column; align-items: center; padding: 6px 2px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; font-size: 12px; }
    .sp-tiles b { font: 700 17px var(--f-head); }
    .sp-how ul { padding-left: 18px; margin: 6px 0; }
    .sp-how li { margin: 4px 0; }
    .sp-foot { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
    .sp-foot > button { flex: 1 1 0; min-height: 48px; }
    .sp-foot .sp-wide { flex-basis: 100%; }
    .win.sprint .primary { background: var(--blue-d); color: #fff; }
    .sp-lb { margin: 8px 0; }
    .sp-sun .sp-band { margin: -10px -16px 8px; width: calc(100% + 32px); max-height: 90px; object-fit: cover; }
    .sp-filt { display: flex; gap: 6px; margin: 6px 0; }
    .sp-filt button { flex: 1 1 0; min-height: 44px; padding: 4px; font-size: 13px; }
    .sp-filt .on { background: var(--ink); color: #fff; }
    .sp-rows { display: flex; flex-direction: column; gap: 6px; }
    .sp-row { min-height: 52px; text-align: left; padding: 8px 12px; font-weight: 700; font-size: 14px; background: #fff; color: var(--ink); text-transform: none; letter-spacing: 0; }
    .sp-row.marked { background: #fff3c4; }
    .sp-sheet { margin: 10px 0; padding: 10px 12px; border: 3px solid var(--ink); border-radius: 12px; background: #fff; }
    .sp-chart { width: 100%; height: auto; font-family: var(--f-body, system-ui); }
    .sp-facts { padding-left: 18px; }
    .sp-jars { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .sp-jarb { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 92px; padding: 4px 2px; }
    .sp-jarb.cur { outline: 3px solid var(--blue-d); outline-offset: 1px; }
    .sp-jn { font-size: 10px; font-weight: 800; line-height: 1.1; overflow-wrap: normal; word-break: keep-all; hyphens: none; }
    .sp-jc { margin: 10px 0; padding: 10px 12px; border: 3px solid var(--ink); border-radius: 12px; background: #fff; }
    .sp-jc.gold { background: #fff7d6; }
    .sp-jh { margin: 0; }
    .sp-jw { margin: 6px 0; }
    .sp-jl { padding-left: 0; list-style: none; margin: 6px 0; }
    .sp-jl li { margin: 4px 0; }
    .sp-whyd summary { min-height: 48px; display: flex; align-items: center; font-weight: 800; cursor: pointer; }
    .sp-pair { padding: 6px 10px; border-left: 5px solid var(--blue-d); background: #eef4ff; font-weight: 700; }
    .sp-stem { line-height: 1.45; } .sp-dec { background: #ffe58a; color: #1d1a12; border-radius: 3px; padding: 0 2px; font-weight: 700; box-shadow: inset 0 -2px 0 #d9a13a; }
    .sp-rule { margin: 4px 0; }
    .sp-era { color: #7a4a00; }
    .sp-dae { display: inline-flex; flex-direction: column; align-items: center; gap: 2px; position: relative; padding: 2px; }
    .sp-dae.loose { outline: 2px dotted var(--ink); outline-offset: 2px; border-radius: 8px; }
    .sp-dn { font-size: 12px; font-weight: 800; white-space: nowrap; }
    .sp-loose { font-size: 10px; font-weight: 800; }
    .sp-peek { display: inline-flex; align-items: center; gap: 8px; }
    .sp-dc { margin: 8px 0; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; }
    .sp-dc p { margin: 4px 0; }
    .sp-dc textarea { width: 100%; box-sizing: border-box; font-size: 16px; margin-top: 6px; }
    .sp-pip input { width: 100%; box-sizing: border-box; min-height: 44px; font-size: 16px; }
    .sp-marks ul { padding-left: 18px; margin: 4px 0; }
    .sp-marks li { margin: 3px 0; }
    .sp-mkh { margin: 6px 0 0; font-weight: 800; }
    .sp-add { margin-top: 6px; }
    .sp-add button { width: 100%; min-height: 44px; }
    .sp-check b { font-family: var(--f-head); font-size: 17px; }
    .sp-porch { margin: -10px -16px 8px; padding: 12px 16px; background: #262650; color: #fff; border-bottom: 3px solid var(--ink); text-align: center; }
    .sp-endh { margin: 0; font: 700 20px var(--f-head); }
    .sp-parade, .sp-grass { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 8px 0; }
    .sp-grass { padding: 6px; background: #33463c; border-radius: 10px; }
    .sp-pet { position: relative; padding: 2px; background: none; border: 0; box-shadow: none; color: #fff; min-width: 64px; }
    .sp-porch .sp-dn, .sp-porch .sp-loose { color: #fff; }
    .sp-porch .sp-dae.loose { outline-color: #fff; }
    .sp-gold { position: absolute; top: 0; right: 0; color: var(--sun); font-size: 18px; }
    .sp-bub { min-height: 1.3em; font-weight: 700; }
    .sp-rml { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
    .sp-rm { display: flex; align-items: center; gap: 10px; padding: 6px 10px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; }
    .sp-rm .small { flex: 1; }
    .sp-rm button { min-height: 44px; }
    .sp-rmb { width: 100%; min-height: 48px; margin: 6px 0; }
    .sp-stamp { display: inline-block; padding: 0 4px; border: 2px solid #7a1f1f; border-radius: 4px; color: #7a1f1f; font-size: 10px; font-weight: 800; transform: rotate(-4deg); }
    .sp-proc ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; }
    .sp-proc li { display: flex; flex-direction: column; align-items: center; }
    .sp-shadow, .sp-sprite, .sp-jar, .sp-lh { image-rendering: pixelated; }
    .sp-lh { display: block; width: calc(100% + 32px); height: auto; max-height: 150px; object-fit: cover; margin: -10px -16px 10px; border-bottom: 3px solid var(--ink); }
    .sp-proc .sp-shadow, .sp-proc .sp-sprite { width: 40px; height: 40px; }
    @media (prefers-reduced-motion: no-preference) {
      .sp-hop .sp-band g:last-of-type { animation: sp-hop .4s steps(4) .4s both; }
      .sp-wob { animation: sp-wob .5s steps(4) .2s both; }
      .sp-pop { animation: sp-pop .3s steps(3) both; }
      .sp-hop1 { animation: sp-hop1 .4s steps(4); }
    }
    @keyframes sp-hop { from { transform: translateY(28px); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes sp-wob { 0%, 100% { transform: rotate(0); } 25% { transform: rotate(-6deg); } 75% { transform: rotate(6deg); } }
    @keyframes sp-pop { from { transform: translateY(4px); } to { transform: none; } }
    @keyframes sp-hop1 { 50% { transform: translateY(-8px); } }
    @media (min-width: 900px) { .win.sprint { max-width: 760px; } }`;
  document.head.appendChild(css);

  // Desktop: 1 to 6 pick an option (no single-key commits).
  document.addEventListener('keydown', e => {
    if (!run || !body || !body.isConnected || !['q', 're'].includes(run.phase)) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    const n = +e.key;
    if (n >= 1 && n <= 6) { const el = body.querySelectorAll('.sp-opt')[n - 1]; if (el) { e.preventDefault(); el.click(); } }
  });
})();
