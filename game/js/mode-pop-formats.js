// The Lost and Found, nights 2 to 5: how each homeland asks (storyboard v7, "How each homeland asks", "New formats
// are taught off the fight", "Partly right", "No hint across formats", "Taper", "The numbers", "Nights").
// Loaded right after js/mode-pop.js, which calls these hooks through SD.pop.fx; what each night adds comes from
// SD.pop.rules(night, day), never from the night number directly.
//   - A claim's first check is in its homeland lead's format: Thornwick compare (Mira), Burning Peak spot the line
//     (Seo-yeon), Halcyon predict (Kai), the Arcanum sequence (Dutch). The item matches the stamped domain (the
//     item's exam task) and wasn't asked by any mode in the last 7 days (SD.modes.pickFormat). None fits: the bank
//     question stays, and the stamp says so. At most rules().maxFormats a night (1 from Nov 27, 0 on Nov 28 and 29).
//   - The stamp names the format and what it changes ("SPOT THE LINE · SECURITY · 2 steps · half if one's right").
//     You stake before the item opens, as for a bank question.
//   - Landing (SD.modes.askFormat's { ok, conf, pts, scored, partial }): spot and sequence can come back partly
//     right, which pays half the button's right multiplier and costs half its wrong cost, with no Wall. An unscored
//     round pays 0 and lands nothing. A Sure miss puts its bank question on the Wall.
//   - Teaching: a format's worked item, then its practice item (one hint), on its homeland's Lost item screen, never
//     in a fight. Each takes one of the night's room checks, so the 13-check cap holds. A format is used in fights
//     only after its practice item (kept in S.save.popFmtTaught across nights).
//   - No hint across formats: a bank check planned for tonight on a concept (topic and exam task) that a format item
//     tonight covers is swapped for another in its domain; one that can't be swapped, or was asked before the
//     format item, is tagged `near` and left out of the hypothesis log.
//   - A missed format item (wrong or partly right) brings a verified bank question on its topic next night.
//   - Unstamped bank checks: rules().unstamped of them (1 in 4 from night 5, all on Nov 28 and 29).
//   - Format checks are logged apart (s.fx.log, then S.save.popFmtHist): format, domain, stake, result, partial.
//     The proof sheet gets one line on them.
(function () {
  if (!window.SD || !SD.pop || !SD.modes) return;
  const P = SD.pop, M = SD.modes, S = SD.state, E = () => SD.exam, D = () => SD.topicDrill;
  const sv = () => S.save;
  const X = P.fx = {};
  const DAY = 864e5;
  const ui = () => P.ui;
  const esc = s => P.ui.esc(s);

  const HOME_FMT = { thornwick: 'compare', peak: 'spot', halcyon: 'predict', arcanum: 'seq' };
  const FMT_HOME = { compare: 'thornwick', spot: 'peak', predict: 'halcyon', seq: 'arcanum' };
  const LEAD = { thornwick: 'Mira', peak: 'Seo-yeon', halcyon: 'Kai', arcanum: 'Dutch' };
  const HOME_NAME = { thornwick: 'Thornwick', peak: 'Burning Peak', halcyon: 'Halcyon', arcanum: 'The Arcanum' };
  const HOME_ICON = { thornwick: 'ringing-bell', peak: 'fencer', halcyon: 'scales', arcanum: 'all-seeing-eye' };
  const NAME = { compare: 'Compare', spot: 'Spot the line', predict: 'Predict', seq: 'Sequence' };
  const SHORT = { compare: 'compare', spot: 'spot', predict: 'predict', seq: 'sequence' };
  const PARTIAL = { spot: 1, seq: 1 };   // the formats that can come back partly right (storyboard v7)
  X.HOME_FMT = HOME_FMT; X.PARTIAL = PARTIAL;

  // ---- Lines (new text, on the review list) ----
  const SAY = {
    teach: {
      compare: 'Mira doesn\'t argue. She lines three of them up and points at the row that settles it. Watch.',
      spot: 'Seo-yeon reads a policy like a confession. One line\'s lying. Find it, then say why.',
      predict: 'Kai\'s question: what does this do when it runs? Not what it\'s meant to do. What it does.',
      seq: 'My way. Records. What happened first, what happened next, and what never happened at all.'
    },
    practice: 'Your turn. One hint. Nothing staked, nothing scored.',
    partial: ['dutch', 'neutral', 'Half a proof. Half the payout. The claim keeps the rest.'],
    sureMiss: ['dutch', 'tired', 'Sure, and wrong. Up on the Wall, as a bank question. Its idea comes back tomorrow night too, exam-style.'],
    unscored: ['dutch', 'neutral', 'Practice. Nothing rides on it.']
  };

  // ---- The night's date and rules ----
  const localDay = (t) => { const d = new Date(t || Date.now()); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function taughtBefore(s) {
    if (!s.sim) return Object.assign({}, sv().popFmtTaught || {});
    // The simulator has no save: a night after the teaching nights has them taught.
    const o = {};
    for (let k = 1; k < s.night; k++) P.rules(k, '2026-11-01').teach.forEach(t => { o[t] = k; });
    return o;
  }
  function fx(s) {
    if (!s.fx) s.fx = { day: localDay(s.t), n: 0, log: [], covered: [], used: [], taught: taughtBefore(s), teach: null };
    return s.fx;
  }
  X.state = fx;
  const rules = s => P.rules(s.night, fx(s).day);
  X.rules = rules;
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(P.rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  X.night = function (s, opts) {
    s.fx = null;
    const x = fx(s);
    if (opts && opts.day) x.day = opts.day;
    const R = rules(s);
    // Unstamped bank checks: the night's share of them (the third core proof is already unstamped).
    if (R.unstamped > 0) {
      const bank = s.rooms.concat(s.core);
      const want = R.unstamped >= 1 ? bank.length : Math.round(bank.length * R.unstamped);
      let have = bank.filter(c => c.stamped === false).length;
      shuffle(bank.filter(c => c.stamped !== false)).forEach(c => { if (have < want) { c.stamped = false; have++; } });
    }
  };

  // ---- Items: on the exam's track, by domain, by concept ----
  const key = () => E().cfg().key;
  const fdom = it => { const k = it && it.task && it.task[key()]; return k ? +String(k)[0] : 0; };
  const ftask = it => String((it.task && it.task[key()]) || '');
  const onTrack = it => !!it && (it.tracks || []).includes(E().cfg().name) && fdom(it) > 0;
  const ALIAS = { secretsmanager: 'secrets', elasticbeanstalk: 'beanstalk', parameterstore: 'ssm', apigw: 'apigateway' };
  const norm = t => { const n = String(t || '').toLowerCase().replace(/[^a-z0-9]/g, ''); return ALIAS[n] || n; };
  // A concept here is a topic within one exam task: "s3|2.1" covers bucket-policy items and bank questions alike.
  const ckey = (topic, task) => norm(topic) + '|' + String(task || '');
  const bkey = q => (q ? ckey(q.topic, E().taskOf(q)) : '');
  const fkey = it => ckey(it.topic, ftask(it));
  X.fkey = fkey; X.bkey = bkey;
  const bq = id => E().find(id);
  const planned = s => s.rooms.concat(s.core, s.fight && s.fight.order ? s.fight.order : []);
  const allIds = s => new Set(s.log.map(l => l.q).concat(planned(s).map(c => c.q), planned(s).map(c => c.bq).filter(Boolean), s.carryNext.map(c => c.q)));

  // An item of this format (in domain d, any domain when d is 0) that no mode asked in the last 7 days.
  function pickItem(s, type, d) {
    const x = fx(s);
    const recent = SD.qf && SD.qf.recent ? SD.qf.recent(7) : new Set();
    const asked = new Set(s.log.map(l => bkey(bq(l.q))));
    const carry = new Set(planned(s).filter(c => c.kind === 'carry' && !c.fmt).map(c => bkey(bq(c.q))));
    const base = it => onTrack(it) && (!d || fdom(it) === d) && !recent.has(it.id) && !x.used.includes(it.id);
    // Prefer an item on a concept no bank check tonight has asked or carries; relax only if nothing else fits.
    const tiers = [it => !asked.has(fkey(it)) && !carry.has(fkey(it)), it => !asked.has(fkey(it)), () => true];
    for (const t of tiers) {
      const it = M.pickFormat({ types: [type], filter: it => base(it) && t(it), days: 7, rng: P.rnd });
      if (it) return it;
    }
    return null;
  }
  X.pickItem = pickItem;

  // A format item covers its concept for the night: bank checks on it are swapped, or tagged when they can't be.
  function replacement(s, c) {
    const x = fx(s), used = allIds(s), age = P.ageOf;
    const fits = q => E().domainOf(q) === c.d && !x.covered.includes(bkey(q)) &&
      (c.kind !== 'core' || (age(q.id) > 7 * DAY && (c.stamped !== false || age(q.id) === Infinity)));
    const r = M.pick({ match: fits, n: 1, mix: 0, avoid: [...used] });
    return r.items[0] ? bq(r.items[0].q) : null;
  }
  function cover(s, it) {
    const x = fx(s), k = fkey(it);
    if (!x.used.includes(it.id)) x.used.push(it.id);
    if (x.covered.includes(k)) return;
    x.covered.push(k);
    s.log.forEach(l => { if (bkey(bq(l.q)) === k) l.near = true; });
    [s.rooms, s.core, s.fight && s.fight.order].filter(Boolean).forEach(list => list.forEach((c, i) => {
      if (c.fmt || bkey(bq(c.q)) !== k) return;
      const r = c.kind === 'carry' ? null : replacement(s, c);
      if (r) list[i] = Object.assign({}, c, { q: r.id, swapped: c.q });
      else c.near = true;
    }));
  }
  X.cover = cover;
  // A bank check on a concept a format item covered tonight: kept out of the hypothesis.
  X.near = (s, ck) => !!ck.near || (!!s.fx && s.fx.covered.includes(bkey(bq(ck.q))));

  // ---- Fights: the claim's first check ----
  X.claimStart = function (s, f) {
    const x = fx(s), R = rules(s), type = HOME_FMT[f.home];
    if (!type || !R.formats.includes(type) || !x.taught[type] || x.n >= R.maxFormats) return;
    const idx = s.rooms.map((c, i) => [c, i]).filter(([c]) => c.kind === 'room' && !c.fmt);
    const pick = (idx.find(([c]) => c.stamped !== false) || idx[0]);
    if (!pick) return;
    const ck = pick[0];
    s.rooms.splice(pick[1], 1); s.rooms.unshift(ck);
    ck.stamped = true;
    const it = pickItem(s, type, ck.d);
    if (!it) { ck.fmtNone = type; return; }
    ck.bq = ck.q; ck.q = it.id; ck.fmt = { id: it.id, type, home: f.home };
    x.n++;
    cover(s, it);
  };

  function steps(t, it) {
    if (t === 'spot') return '2 steps · half if one\'s right';
    if (t === 'seq') return `${it && it.steps ? it.steps.length : 'a few'} steps · half if half are in place`;
    if (t === 'compare') return '2 steps · both must be right';
    return '1 step';
  }
  X.stamp = function (s, ck, what) {
    const U = ui(), dom = U.DOM[ck.d] || 'MIXED';
    if (ck.fmt) {
      const t = ck.fmt.type, home = ck.fmt.home, it = M.fmtItem(ck.fmt.id);
      return `<div class="pop-stamp pop-fstamp" data-fmt="${t}"><b>${esc(LEAD[home].toUpperCase())}'S CHECK</b> <span>${esc(NAME[t].toUpperCase())} · ${dom} · ${esc(steps(t, it))}</span></div>`;
    }
    if (ck.fmtNone) return `<div class="pop-stamp"><b>DUTCH'S CHECK</b> <span>${esc(what)} · ${dom} · bank question · no unasked ${esc(NAME[ck.fmtNone])} item fits ${esc(U.domName(ck.d))}</span></div>`;
    return null;
  };
  // The stake grid's half row, for the formats that can be partly right.
  X.halfRow = function (s, ck, st) {
    if (!ck.fmt || !PARTIAL[ck.fmt.type]) return '';
    const cell = (m, k) => (st[k] ? `${k === 'hit' ? 'Hit' : 'Guard'} ${Math.round(st[k] * m)}` : '');
    const both = m => [cell(m, 'hit'), cell(m, 'guard')].filter(Boolean).join(', ') || '—';
    return `<tr class="pop-half"><th>½</th>${[0, 1, 2].map(c => { const m = P.RIGHT[c] / 2, w = P.WRONG[c] / 2;
      return `<td>×${m}${w ? ` / −${Math.round(st.total * w)}%` : ''}<br><span class="small">${both(m)}</span></td>`; }).join('')}</tr>`;
  };

  X.ask = async function (s, ck) {
    const t = ck.fmt.type, home = ck.fmt.home, it = M.fmtItem(ck.fmt.id);
    const r = it ? await M.askFormat(it, { title: `${LEAD[home].toUpperCase()}'S CHECK`, context: `${NAME[t]} · ${ui().domName(ck.d)} · ${HOME_NAME[home]}`, mode: 'scored' }) : null;
    if (r) return r;
    // The engine couldn't ask it: the bank question it replaced, stamped as such.
    if (ck.bq) ck.q = ck.bq;
    delete ck.fmt; ck.fmtNone = t; fx(s).n = Math.max(0, fx(s).n - 1);
    return null;
  };

  // ---- Landing ----
  X.land = function (s, ck, r, conf) {
    const scored = r.scored !== false;
    if (!scored) return { ok: false, mult: 0, wrong: 0, partial: false, scored: false };
    if (r.ok) return { ok: true, mult: P.RIGHT[conf], wrong: 0, partial: false, scored };
    const part = !!PARTIAL[ck.fmt.type] && r.partial >= 0.5 && r.partial < 1;
    return part ? { ok: false, mult: P.RIGHT[conf] / 2, wrong: P.WRONG[conf] / 2, partial: true, scored }
      : { ok: false, mult: 0, wrong: P.WRONG[conf], partial: false, scored };
  };
  X.log = function (s, ck, r, fr, staked) {
    fx(s).log.push({ id: ck.fmt.id, format: ck.fmt.type, domain: ck.d, home: ck.fmt.home, stake: staked, conf: [0, 1, 2].includes(r.conf) ? r.conf : 0,
      result: !fr.scored ? 'unscored' : fr.ok ? 'right' : fr.partial ? 'partial' : 'wrong', partial: fr.partial, t: Date.now() });
  };
  // A missed format item: a verified bank question on its topic next night (verified, on track, not used tonight).
  X.miss = function (s, ck, conf) {
    const it = M.fmtItem(ck.fmt.id);
    if (!it) return;
    const topic = norm(it.topic), task = ftask(it), used = allIds(s), log = sv().qlog || {};
    const pool = (SD.bank || []).filter(q => q && q.id && norm(q.topic) === topic && ['mc', 'multi'].includes(q.type) &&
      E().allowed(q) && E().inTrack(q) && D().isVerified(q) && !used.has(q.id));
    if (!pool.length) return;
    const rank = q => (String(E().taskOf(q)) === task ? 0 : 1e15) + (log[q.id] ? log[q.id][0] : 0);
    const q = pool.slice().sort((a, b) => rank(a) - rank(b))[0];
    s.carryNext.push({ q: q.id, why: 'format', from: it.id });
    // Sure and wrong: its bank question goes up on the Wall, like a bank Sure miss (the Wall drills bank questions only).
    if (conf === 2 && !s.sim && SD.today && SD.today.wallAdd) { SD.today.wallAdd(q.id); s.fmtWall = (s.fmtWall | 0) + 1; }
  };
  X.verdict = function (out) {
    const C = M.CONF[out.conf];
    const parts = [out.hit ? `Hit ${out.hit} landed` : '', out.guard ? `Guard ${out.guard} up` : ''].filter(Boolean).join(' · ') || 'no numbers staked';
    if (out.unscored) return 'Practice round · not scored, so nothing lands and nothing is lost';
    if (out.ok) return `${out.conf === 2 ? '✓ PROVEN' : '✓ Right'} · ${C} · ×${out.mult}${out.staked ? ' · ' + parts : ' · nothing staked'}`;
    if (out.partial) return `½ Partly right · ${C} · ×${out.mult}${out.staked ? ' · ' + parts + (out.cost ? ` · −${out.cost}% budget` : '') : ' · nothing staked'} · not on the Wall`;
    if (!out.staked) return `✗ Wrong · ${C} · nothing staked, nothing lost`;
    return out.conf === 0 ? '✗ Wrong · Guess · your stake fizzled' : out.conf === 1 ? `✗ Wrong · Think so · −${out.cost}% budget` : `✗ BACKFIRE · Sure, and wrong · −${out.cost}% budget · its bank question goes on the Wall`;
  };
  X.bark = out => (out.unscored ? SAY.unscored : out.partial ? SAY.partial : !out.ok && out.conf === 2 ? SAY.sureMiss : null);

  // ---- Teaching on Lost item screens ----
  function pending(s) {
    const R = rules(s), x = fx(s);
    return R.teach.concat(R.formats.filter(t => !R.teach.includes(t))).filter(t => R.formats.includes(t) && !x.taught[t]);
  }
  X.pending = pending;
  X.teachAt = function (s, node) {
    const x = fx(s), pend = pending(s);
    if (!pend.length) return false;
    let list = pend.includes(HOME_FMT[node.home]) ? [HOME_FMT[node.home]] : [];
    if (!list.length) {   // another homeland's format, when that homeland has no Lost item left ahead tonight
      const ahead = s.map.rows.slice(s.map.row + 1).flat().filter(n => n.type === 'lost' && !n.visited);
      list = pend.filter(t => !ahead.some(n => HOME_FMT[n.home] === t)).slice(0, 1);
    }
    // Inside the cap: each item takes a room check, or room under 13 when none is left to take.
    const drop = s.rooms.filter(c => c.kind === 'room' && !c.fmt).length;
    const head = Math.max(0, ui().MAX_CHECKS - (s.asked + s.rooms.length + s.core.length));
    const out = [];
    list.forEach(t => {
      if ((out.length + 1) * 2 > drop + head) return;
      const w = pickItem(s, t, 0); if (!w) return;
      x.used.push(w.id);
      const p = pickItem(s, t, 0);
      x.used.splice(x.used.indexOf(w.id), 1);
      if (p) out.push({ type: t, worked: w.id, practice: p.id });
    });
    if (!out.length) return false;
    x.teach = { list: out, step: 0, home: node.home || null };
    return true;
  };
  // One teaching item done: it takes a room check, covers its concept, and the practice item teaches the format.
  function teachStep(s, cur, worked, it, r) {
    const x = fx(s);
    s.asked++;
    let i = -1;
    for (let k = s.rooms.length - 1; k >= 0; k--) if (s.rooms[k].kind === 'room' && !s.rooms[k].fmt) { i = k; break; }
    if (i >= 0) s.rooms.splice(i, 1);
    if (it) cover(s, it);
    x.log.push({ id: it ? it.id : null, format: cur.type, domain: it ? fdom(it) : 0, teach: worked ? 'worked' : 'practice', stake: 0,
      result: worked ? 'worked' : 'practice', partial: !!(r && r.partial != null && r.partial < 1 && r.partial >= 0.5 && !r.ok), t: Date.now() });
    x.teach.step++;
    if (!worked) {
      x.taught[cur.type] = s.night;
      if (!s.sim) { sv().popFmtTaught = Object.assign(sv().popFmtTaught || {}, { [cur.type]: s.night }); }
    }
  }
  X.simTeach = function (s) {
    const x = fx(s), T = x.teach;
    if (T) T.list.forEach(cur => { teachStep(s, cur, true, M.fmtItem(cur.worked), null); teachStep(s, cur, false, M.fmtItem(cur.practice), null); });
    x.teach = null;
    s.phase = 'lost';
  };
  X.draw = function (s) {
    const U = ui(), x = fx(s), T = x.teach;
    if (!T || T.step >= T.list.length * 2) { x.teach = null; s.phase = 'lost'; U.save(s); return P.draw(); }
    const cur = T.list[Math.floor(T.step / 2)], worked = T.step % 2 === 0, t = cur.type, fh = FMT_HOME[t];
    const home = T.home, n = T.list.length * 2;
    const b = U.panel(`${U.hud(s)}
      <p class="pop-banner">LOST ITEM${home ? ' · ' + esc(HOME_NAME[home]) : ''}</p>
      <p class="pop-find">${U.icon(HOME_ICON[fh])} <span>Before it goes in the ledger, ${esc(LEAD[fh])} wants it checked ${fh === 'arcanum' || fh === 'halcyon' ? 'his' : 'her'} way: <b>${esc(NAME[t])}</b>.</span></p>
      ${U.say('dutch', 'neutral', worked ? SAY.teach[t] : SAY.practice)}
      <ol class="pop-tsteps">
        <li class="${worked ? 'now' : 'done'}">${worked ? '' : '✓ '}Worked: Dutch walks you through one.</li>
        <li class="${worked ? '' : 'now'}">Practice: you try one, with one hint. Not scored.</li>
      </ol>
      <p class="small muted">Item ${T.step + 1} of ${n} here. Each counts as one of tonight's checks, and nothing is staked off the fight. After the practice one, ${esc(HOME_NAME[fh])} claims can open with ${esc(NAME[t])}, stamped before you stake.</p>
      ${U.dock(U.stopBtn + `<button class="primary" id="pop-teach">${worked ? 'Walk me through one' : 'Try the practice one'}</button>`)}`);
    b.querySelector('#pop-teach').onclick = async () => {
      const it = M.fmtItem(worked ? cur.worked : cur.practice);
      const r = it ? await M.askFormat(it, { title: `${LEAD[fh].toUpperCase()}'S WAY`, context: `${NAME[t]} · ${worked ? 'worked by Dutch' : 'practice, one hint'}`, mode: worked ? 'worked' : 'hint' }) : null;
      if (!r) { x.teach = null; s.phase = 'lost'; U.save(s); return P.draw(); }
      teachStep(s, cur, worked, it, r);
      U.save(s); P.draw();
    };
    U.wireStop(b);
  };

  // ---- The simulator: format checks draw their own accuracy (policy.pf, default p), partly right at x0.5 ----
  X.simAnswer = function (s, ck, policy, rng) {
    const p = policy.pf != null ? policy.pf : policy.p;
    const r = M.simAnswer(null, Object.assign({}, policy, { p }), rng);
    r.scored = true;
    r.partial = r.ok ? 1 : PARTIAL[ck.fmt.type] && rng() < (policy.partial != null ? policy.partial : 0.5) ? 0.5 : 0;
    return r;
  };

  // ---- The proof sheet and the night's end ----
  X.sheetLine = function (s) {
    const L = fx(s).log.filter(l => !l.teach && l.result !== 'unscored');
    if (!L.length) return '';
    const order = [], by = {};
    L.forEach(l => { if (!by[l.format]) { by[l.format] = { r: 0, n: 0, h: 0 }; order.push(l.format); } const o = by[l.format]; o.n++; if (l.result === 'right') o.r++; if (l.partial) o.h++; });
    return `<p class="small pop-fline"><b>Formats:</b> ${order.map(t => `${SHORT[t]} ${by[t].r} of ${by[t].n}${by[t].h ? ` (${by[t].h} partly right)` : ''}`).join(', ')}.</p>`;
  };
  X.finish = function (s) {
    const h = sv().popFmtHist = sv().popFmtHist || [];
    fx(s).log.forEach(l => h.push(Object.assign({ n: s.night }, l)));
    if (h.length > 300) h.splice(0, h.length - 300);
  };

  const css = document.createElement('style');
  css.textContent = `
    .pop-fstamp { border-style: solid; }
    .pop-tsteps { margin: 0; padding-left: 22px; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
    .pop-tsteps li.now { font-weight: 800; }
    .pop-tsteps li.done { color: var(--muted, #554c5e); }
    .pop-grid tr.pop-half td { background: var(--bone, #e2dbcb); }
    .pop-fline { overflow-wrap: anywhere; }`;
  document.head.appendChild(css);
})();
