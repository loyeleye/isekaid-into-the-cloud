// The Fire Drill (design: project files game-modes/multiplayer-real/design.md, approved by Ladi Nov 16 as its own mode;
// Multiplayer, js/raid.js, is unchanged). Uptima runs drills on a copy of the castle's order system, and four
// champions each own one station of it. Nobody says what's broken: the trace map, each station's CloudWatch metrics
// and the pager are the clues (L9: the state is on the board). The rules are js/drill-core.js on js/aws-sim-ops.js.
//   - You're the incident commander. Tap a station to see its metrics and its settings. The champions report on the
//     pager after every run, but they never pick a fix: you do, up to 3 changes a deploy and 3 deploys a drill.
//   - No walkthrough screens: the warm-up run shows the fault, and each rule's first appearance carries one line from
//     a champion (SD.drill.TEACH, once per save).
//   - The question is the debrief: after each drill, one bank question on its cause, verified only, on the plain exam
//     screen with the shared stake table (SD.modes.ask). A miss's twin opens next night's first debrief.
//   - Saves after every step (S.save.drill). Ends on the last boss, win or lose, then Pip's "why did that work?".
(function () {
  if (!SD.modes || !SD.drill || !SD.awsSim) return;
  const M = SD.modes, U = SD.ui, S = SD.state, D = SD.drill, C = D.CARDS;
  const E = () => SD.exam, TD = () => SD.topicDrill;
  const ID = 'drill', TITLE = 'THE FIRE DRILL';
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().drill || null;
  const keep = () => (sv().drillKeep = sv().drillKeep || { night: 0, taught: {}, carry: [], best: null, clean: {} });
  const save = s => { sv().drill = s; S.persist(); };
  const icon = (n, cls) => `<svg class="dr-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[n]) || ''}</svg>`;
  const head = (who, mood) => { try { return SD.art && SD.art.portrait ? `<span class="dr-head">${SD.art.portrait(who, 34, mood || 'neutral')}</span>` : ''; } catch (e) { return ''; } };
  const NAMES = Object.assign({ uptima: 'Uptima' }, D.NAMES);
  const say = (who, mood, line) => `<p class="dr-say" data-vo="${esc(who + '|' + line)}">${head(who, mood)}<span><b>${esc(NAMES[who] || who)}:</b> ${esc(line)}</span></p>`;
  const panel = html => U.panel(`<div class="dr">${html}</div>`, { title: TITLE, onClose: stopNow, cls: 'dr-win' });
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today && SD.today.render) SD.today.render(); }
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
  const NODE_ICON = { callers: 'conversation', gate: 'medieval-gate', queue: 'mailbox', fn: 'lightning-helix', store: 'database' };
  const STATUS = { ok: 'OK', error: 'Error 4xx', fault: 'Fault 5xx', throttle: 'Throttle 429', dark: 'Not traced', off: 'Not on this path' };
  const SAY = {
    arrive: 'Fire drill. I\'ve copied the order system and broken something in it. Your four leads each run one station. Find it, fix it, keep the error budget.',
    again: 'Another drill. Same system, different break.',
    won: 'Every drill closed. That\'s an on-call rotation I\'d sleep through.',
    zero: 'Budget\'s gone. In a real outage that\'s the moment you call everyone. We\'ll run it again tomorrow.'
  };

  function start() {
    let s = cur();
    if (!s || s.v !== 1 || s.phase === 'done') {
      const k = keep();
      s = D.newNight({ night: k.night + 1, taught: k.taught, carry: k.carry });
      s.tally = M.newTally();
      s.fresh = true;
      s.at = 'fn';
    }
    save(s);
    draw(s);
  }
  function draw(s) {
    ({ map: mapScreen, drill: drillScreen, debrief: debriefScreen, end: endScreen, zero: endScreen }[s.phase] || mapScreen)(s);
  }
  function budgetJar(s) {
    const b = Math.max(0, s.budget);
    return `<div class="dr-jar" role="img" aria-label="Error budget ${b}%"><span class="dr-jar-l">${icon('checked-shield')}Error budget</span><span class="dr-jar-b"><i style="width:${b}%"></i></span><b>${b}%</b></div>`;
  }

  // ---- The map: one row per drill, bosses marked. Night 1 is one path; later nights fork (L7). ----
  function mapScreen(s) {
    const rows = D.ROWS.map((r, i) => {
      const ch = D.choices(s.night, i);
      return `<div class="dr-row">${ch.map(id => {
        const d = D.DRILLS[id], here = i === s.row, done = s.done[i] && s.done[i].drill === id;
        const how = done ? (s.done[i].clean ? ' · clean fix' : s.done[i].state === 'contained' ? ' · contained' : ' · escalated') : '';
        return `<button class="dr-door${d.boss ? ' boss' : ''}${here ? ' reach' : ''}${done ? ' done' : ''}" data-drill="${id}" ${here ? '' : 'disabled'}>
          <span class="dr-dn">${d.boss ? icon('siren') : ''}${esc(d.name)}</span><span class="dr-dt">${d.path === 'async' ? 'With a queue' : 'Straight through'}${d.boss ? ' · two faults' : ''}${how}</span></button>`;
      }).join('')}</div>`;
    }).reverse().join('');
    const first = s.fresh && s.night === 1 && !s.done.length;
    const b = panel(`<p class="dr-night">Night ${s.night}</p>
      ${say('uptima', 'neutral', first ? SAY.arrive : s.done.length ? 'Next drill.' : SAY.again)}
      ${budgetJar(s)}
      <div class="dr-map">${rows}</div>
      <div class="dr-dock"><button class="ghost" id="dr-stop">☰ Stop for now</button></div>`);
    b.querySelectorAll('[data-drill]').forEach(el => el.onclick = () => {
      if (el.disabled) return;
      s.fresh = false;
      D.startDrill(s, el.dataset.drill, s.night * 7919 + s.row * 31);
      s.at = D.DRILLS[el.dataset.drill].path === 'async' ? 'queue' : 'gate';
      save(s); draw(s);
    });
    b.querySelector('#dr-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The drill ----
  function traceMap(f, e) {
    const d = D.DRILLS[f.drill];
    const order = ['callers'].concat(D.ORDER.filter(k => k !== 'queue' || d.path === 'async'));
    return `<div class="dr-trace" role="list" aria-label="Trace map">${order.map((k, i) => {
      const st = k === 'callers' ? 'ok' : e.nodes[k];
      const name = k === 'callers' ? 'Callers' : D.STATIONS[k].svc;
      const btn = k !== 'callers';
      const tag = btn ? 'button' : 'span';
      return `${i ? '<span class="dr-edge" aria-hidden="true"></span>' : ''}<${tag} role="listitem" class="dr-node st-${st}${btn && k === cur().at ? ' at' : ''}" ${btn ? `data-at="${k}"` : ''} aria-label="${esc(name)}: ${esc(STATUS[st])}">
        ${icon(NODE_ICON[k])}<b>${esc(name)}</b><span class="dr-st">${esc(k === 'callers' ? '' : STATUS[st])}</span></${tag}>`;
    }).join('')}</div>`;
  }
  function stationHtml(s, f, e) {
    const k = s.at, st = D.STATIONS[k], d = D.DRILLS[f.drill];
    if (k === 'queue' && d.path !== 'async') return `<div class="dr-station ms-lt"><p class="small muted">No queue on this path: the Gate calls the function directly.</p></div>`;
    const mt = D.metrics(f.drill, f.cfg, e.m)[k];
    const left = D.CHANGES - f.changes.length;
    const cards = D.HANDS[k].map(id => {
      const c = C[id], on = c.on(f.cfg), why = on ? '' : D.why(f, id);
      const placed = f.changes.includes(id);
      return `<button class="dr-card${on ? ' on' : ''}${why && !on ? ' no' : ''}${c.obs ? ' obs' : ''}" data-card="${id}" aria-pressed="${on}">
        <b>${c.obs ? icon('radar-sweep') : ''}${esc(c.name)}</b><span class="dr-ct">${esc(c.text)}</span>
        ${on ? `<span class="dr-tag">${placed ? 'Changed this deploy' : 'Set'}</span>` : why ? `<span class="dr-why">${esc(why)}</span>` : ''}</button>`;
    }).join('');
    return `<div class="dr-station ms-lt"><div class="dr-sh">${head(st.who)}<b>${esc(st.name)}</b><span class="small">${esc(NAMES[st.who])} · ${esc(st.svc)}</span></div>
      <div class="dr-metrics" aria-label="CloudWatch metrics, last run">${mt.map(([n, v]) => `<span class="dr-mt"><code>${esc(n)}</code><b>${esc(v)}</b></span>`).join('')}</div>
      <p class="small">${plural(left, 'change')} left for this deploy. Settings say what they set, never whether they help.</p>
      <div class="dr-hand">${cards}</div></div>`;
  }
  function drillScreen(s) {
    const f = s.drill, d = D.DRILLS[f.drill], e = f.log[f.log.length - 1];
    const over = f.state === 'contained' || f.state === 'escalated';
    const teach = e.teach || [];
    const head1 = e.warm ? 'Warm-up run, with the fault in place' : `Deploy ${f.deploys} of ${D.DEPLOYS}`;
    const verdict = e.warm ? `<p class="ms-lt dr-res">${icon('siren')} Something's wrong. Read the map, tap a station for its metrics, and check the pager.</p>`
      : e.ok ? `<p class="ms-lt dr-res good">${icon('checked-shield')} Contained${D.clean(f) ? ', first deploy: a clean fix' : ''}. ${e.cost ? `It cost ${e.cost}% on the way.` : 'Nothing spilled.'}</p>`
        : `<p class="ms-lt dr-res bad">Not contained. This run cost <b>${e.cost}%</b> of the budget.${f.state === 'escalated' ? ` It escalates: another ${D.ESCALATE}%.` : ''}</p>`;
    const reveal = f.state === 'escalated' ? `<div class="dr-reveal ms-lt">${icon('magnifying-glass')}<span><b>What was broken:</b> ${esc(d.hidden)}<br><span class="small">A fix: ${esc(d.fix[0].map(id => C[id].name).join(' + '))}.</span></span></div>` : '';
    const b = panel(`<div class="dr-top"><div><p class="dr-claim">${d.boss ? icon('siren') : ''}${esc(d.name)}</p><p class="small">"${esc(d.says)}"</p></div>
        <p class="dr-turn">${esc(head1)}</p></div>
      ${budgetJar(s)}
      ${traceMap(f, e)}
      ${verdict}${reveal}
      <div class="dr-pager" aria-live="polite"><p class="dr-ph">${icon('walkie-talkie')}<b>The pager</b></p>${e.lines.map(([w, t]) => `<p class="dr-pl" data-vo="${esc(w + '|' + t)}"><b>${esc(NAMES[w])}:</b> ${esc(t)}</p>`).join('')}</div>
      ${teach.map(t => say(...D.TEACH[t].slice(0, 1), 'neutral', D.TEACH[t][1])).join('')}
      ${over ? '' : stationHtml(s, f, e)}
      <div class="dr-dock"><button class="ghost" id="dr-stop">☰ Stop</button>${over ? '<button class="primary" id="dr-next">Debrief</button>' : `<button class="primary" id="dr-deploy">${icon('cloud-upload')}Deploy${f.changes.length ? ` (${plural(f.changes.length, 'change')})` : ''}</button>`}</div>`);
    b.querySelectorAll('[data-at]').forEach(el => el.onclick = () => { s.at = el.dataset.at; save(s); draw(s); });
    b.querySelectorAll('[data-card]').forEach(el => el.onclick = () => {
      const id = el.dataset.card, why = D.place(f, id);
      if (why) {
        if (/^Refused/.test(why) && !s.taught.refused) { s.taught.refused = 1; e.teach = (e.teach || []).concat('refused'); }
        if (U.float) U.float(el, why);
        save(s); if (/^Refused/.test(why)) draw(s);
        return;
      }
      save(s); draw(s);
    });
    b.querySelector('#dr-stop').onclick = () => { U.closePanel(); stopNow(); };
    const dep = b.querySelector('#dr-deploy');
    if (dep) dep.onclick = () => {
      const r = D.deploy(f);
      r.teach = D.teachFor(f, r, s.taught);
      r.teach.forEach(t => { s.taught[t] = 1; });
      keep().taught = s.taught;
      D.afterDeploy(s, r);
      if (s.phase === 'debrief') s.phase = 'drill';   // show the result first; Debrief moves on
      save(s); draw(s);
      const res = document.querySelector('.dr-res.good');
      if (res && U.burst) U.burst(res, D.clean(f));
    };
    const nx = b.querySelector('#dr-next');
    if (nx) nx.onclick = () => { s.phase = 'debrief'; save(s); draw(s); };
    // The warm-up's teach lines: the first time, say what grey means.
    if (e.warm && !e.teach) { e.teach = D.teachFor(f, e, s.taught); e.teach.forEach(t => { s.taught[t] = 1; }); keep().taught = s.taught; save(s); if (e.teach.length) draw(s); }
  }

  // ---- The debrief: "why did that work?" (or, after an escalation, "what was it?") ----
  function debriefQuestion(s) {
    const k = keep(), d = D.DRILLS[s.drill.drill];
    const used = new Set((s.debriefs || []).map(x => x.q));
    while (s.carry.length) {
      const id = s.carry.shift(), q = E().find(id);
      if (q && E().allowed(q) && !used.has(q.id)) { k.carry = s.carry.slice(); return q; }
    }
    const text = q => [q.q].concat(q.opts || []).join(' ');
    const r = M.pick({ match: q => d.q.test(text(q)), n: 1, verifiedOnly: true, mix: 0, avoid: Array.from(used) });
    return r.items[0] ? E().find(r.items[0].q) : null;
  }
  function debriefScreen(s) {
    const f = s.drill, d = D.DRILLS[f.drill], ok = f.state === 'contained';
    const lead = d.lead;
    const b = panel(`<p class="dr-claim">${esc(d.name)}: ${ok ? (D.clean(f) ? 'a clean fix' : 'contained') : 'escalated'}</p>
      ${budgetJar(s)}
      ${say(lead, ok ? 'smile' : 'tired', ok ? 'Held. Write it up before you forget why.' : 'We didn\'t find it in time. Now we know where to look.')}
      <div class="dr-reveal ms-lt">${icon('scroll-unfurled')}<span><b>The cause:</b> ${esc(d.hidden)}<br><span class="small">${esc(d.fix[0].map(id => C[id].back).join(' '))}</span></span></div>
      ${say('uptima', 'neutral', 'The postmortem question. One answer, and say how sure you are.')}
      <div class="dr-dock"><button class="primary" id="dr-ask">Answer the postmortem</button></div>`);
    b.querySelector('#dr-ask').onclick = async () => {
      const q = debriefQuestion(s);
      if (!q) { D.settle(s, false); save(s); draw(s); return; }
      const r = await M.ask(q, { tally: s.tally, title: 'THE POSTMORTEM' });
      if (r.closed || r.skipped) { save(s); draw(s); return; }
      s.debriefs.push({ q: q.id, ok: !!r.ok, conf: r.conf, pts: r.pts, drill: f.drill });
      if (!r.ok) {
        const tw = ((SD.twins && SD.twins[q.id]) || []).map(id => E().find(id)).filter(x => x && E().allowed(x) && TD().isVerified(x));
        keep().carry = (keep().carry || []).concat([tw.length ? tw[0].id : q.id]).slice(-3);
      }
      if (D.clean(f)) keep().clean[f.drill] = (keep().clean[f.drill] | 0) + 1;
      D.settle(s, !!r.ok);
      save(s); draw(s);
    };
  }

  // ---- The end: the last boss, win or lose (L1), then one line and Pip ----
  function endScreen(s) {
    const k = keep(), zero = s.phase === 'zero';
    if (!s.paid) {
      s.paid = M.pay(ID) || ' ';
      k.night = s.night; k.taught = s.taught;
      if (!k.best || s.budget > k.best) k.best = Math.max(0, s.budget);
    }
    const clean = s.done.filter(x => x.clean).length, held = s.done.filter(x => x.state === 'contained').length;
    const proofs = s.debriefs.filter(x => x.ok).length;
    const b = panel(`<p class="dr-night">Night ${s.night}: ${zero ? 'budget spent' : 'all drills closed'}</p>
      ${say('uptima', zero ? 'tired' : 'smile', zero ? SAY.zero : SAY.won)}
      ${budgetJar(s)}
      <p>Drills contained <b>${held} of ${s.done.length}</b> · Clean fixes <b>${clean}</b> · Postmortems right <b>${proofs} of ${s.debriefs.length}</b></p>
      ${s.tally ? M.calibHtml(s.tally, 'How sure you were in the postmortems') : ''}
      ${s.paid && s.paid.trim() ? `<p class="small">${esc(s.paid)}</p>` : ''}
      ${M.pipHtml()}
      <p class="small muted">That's the night. Stop here.</p>
      <div class="dr-dock"><button class="primary" id="dr-done">Done</button></div>`);
    M.pipWire(b, 'The Fire Drill');
    b.querySelector('#dr-done').onclick = () => { s.phase = 'done'; save(s); U.closePanel(); stopNow(); };
    save(s);
  }

  M.register({
    id: ID, name: 'The Fire Drill', minutes: 'about 20', host: 'Uptima',
    blurb: 'Something in the system is broken. Four leads, four stations, real metrics. Find it and fix it together.',
    start,
    status: () => { const s = cur(); if (!s || s.v !== 1 || s.phase === 'done') return '';
      return `Resume · Night ${s.night} · ${s.drill ? D.DRILLS[s.drill.drill].name + ' · ' : ''}Budget ${Math.max(0, s.budget)}%`; }
  });
  SD.drillUi = { draw: () => { const s = cur(); if (s) draw(s); }, start };

  const css = document.createElement('style');
  css.textContent = `
    .dr { display: flex; flex-direction: column; gap: 8px; }
    .dr p { margin: 0; }
    .dr-gi { width: 18px; height: 18px; vertical-align: -4px; flex: 0 0 auto; fill: currentColor; }
    .dr-night, .dr-claim { font-family: var(--f-head); font-weight: 700; font-size: 18px; display: flex; gap: 6px; align-items: center; }
    .dr-top { display: flex; justify-content: space-between; gap: 8px; align-items: flex-start; }
    .dr-turn { text-align: right; font-weight: 700; font-size: 13px; max-width: 45%; }
    .dr-say { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
    .dr-head { flex: 0 0 34px; width: 34px; height: 40px; overflow: hidden; border-radius: 8px; border: 2px solid var(--ink, #17131f); background: var(--paper, #c7bca4); display: inline-block; }
    .dr-head .bust, .dr-head svg { width: 30px !important; height: 36px !important; }
    .dr-head img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .dr-jar { display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .dr-jar-l { display: inline-flex; gap: 4px; align-items: center; font-weight: 700; }
    .dr-jar-b { flex: 1; height: 12px; border: 2px solid var(--ink, #17131f); border-radius: 6px; overflow: hidden; background: var(--bone, #e2dbcb); }
    .dr-jar-b i { display: block; height: 100%; background: var(--blue, #3f5f80); }
    .dr-map { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 12px; border: 3px solid var(--ink, #17131f); background: #23283a; }
    .dr-row { display: flex; gap: 6px; justify-content: center; }
    .dr-door { flex: 1 1 0; max-width: 170px; min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #c9c2b2; color: var(--ink, #17131f); font-size: 13px; }
    .dr-door:disabled { opacity: 1; }
    .dr-door.reach { background: var(--bone, #e2dbcb); box-shadow: 0 0 0 3px #e0823a; font-weight: 700; }
    .dr-door.done { background: #9fb09a; }
    .dr-door.boss { max-width: none; background: #5a2f2f; color: #fff; }
    .dr-door.boss.reach { background: #9e3a34; }
    .dr-door.boss.done { background: #4f6b52; }
    .dr-dn { font-weight: 800; display: inline-flex; gap: 4px; align-items: center; } .dr-dt { font-size: 11px; }
    .dr-trace { display: flex; align-items: stretch; gap: 0; padding: 8px 6px; border-radius: 10px; border: 3px solid var(--ink, #17131f); background: #1d2130; }
    .dr-edge { flex: 0 1 8px; min-width: 2px; align-self: center; height: 3px; background: #8d93a8; }
    .dr-node { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 4px 2px; border-radius: 10px; border: 3px solid #8d93a8; background: #2c3248; color: #fff; font-size: 11px; line-height: 1.1; text-align: center; }
    .dr-node b { font-size: 11px; overflow-wrap: anywhere; }
    .dr-node .dr-gi { width: 22px; height: 22px; }
    .dr-node.at { box-shadow: 0 0 0 3px #f3d36b; }
    .dr-st { font-size: 10px; font-weight: 700; }
    .dr-node.st-ok { border-color: #5fb36b; } .dr-node.st-ok .dr-st { color: #9be0a5; }
    .dr-node.st-error { border-color: #e0c341; } .dr-node.st-error .dr-st { color: #f1dc7a; }
    .dr-node.st-fault { border-color: #e0574b; } .dr-node.st-fault .dr-st { color: #ff9d93; }
    .dr-node.st-throttle { border-color: #a46be0; } .dr-node.st-throttle .dr-st { color: #d1b0ff; }
    .dr-node.st-dark { border-style: dashed; color: #b9bdc9; }
    .dr-node.st-off { opacity: .5; }
    .dr-res { padding: 6px 8px; border: 3px double var(--ink, #17131f); border-radius: 8px; background: #fff; color: #17131f; font-size: 14px; display: flex; gap: 6px; align-items: flex-start; }
    .dr-res.good { border-color: var(--mint, #4f7f5c); }
    .dr-res.bad { border-color: var(--red, #9e3a34); color: var(--red, #9e3a34); display: block; }
    .dr-reveal { display: flex; gap: 8px; align-items: flex-start; padding: 6px 8px; border-left: 4px solid var(--ink, #17131f); background: var(--bone, #e2dbcb); font-size: 14px; }
    .dr-reveal .dr-gi { width: 26px; height: 26px; }
    .dr-pager { border: 2px solid var(--ink, #17131f); border-radius: 10px; padding: 6px 8px; background: #20242f; color: #e8f0e0; font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 12.5px; display: flex; flex-direction: column; gap: 3px; }
    .dr-ph { display: flex; gap: 4px; align-items: center; color: #f3d36b; font-family: var(--f-body, inherit); }
    .dr-pl b { color: #f3d36b; }
    .dr-station .small { color: #2a2333; }
    .dr-station { border: 3px solid var(--ink, #17131f); border-radius: 10px; padding: 6px 8px; background: #c9b590; color: #17131f; display: flex; flex-direction: column; gap: 6px; }
    .dr-sh { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .dr-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
    .dr-mt { display: flex; flex-direction: column; padding: 3px 6px; border-radius: 6px; background: #fffaf0; color: #17131f; border: 2px solid var(--ink, #17131f); min-width: 0; }
    .dr-mt code { font-size: 10.5px; overflow-wrap: anywhere; color: #3a3346; background: none; padding: 0; }
    .dr-mt b { font-size: 15px; }
    .dr-hand { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .dr-card { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 76px; padding: 6px 8px; text-align: left; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #fff; color: var(--ink, #17131f); font-size: 13px; line-height: 1.2; }
    .dr-card b { display: inline-flex; gap: 4px; align-items: flex-start; }
    .dr-card.on { background: #dbe8f3; color: #17131f; box-shadow: inset 0 0 0 3px #3f5f80; opacity: 1; }
    .dr-card.no { background: #e6dfd0; color: #17131f; }
    .dr-card.obs { border-style: dashed; }
    .dr-ct { font-size: 12px; overflow-wrap: anywhere; }
    .dr-why { font-size: 11px; font-weight: 800; color: var(--red, #9e3a34); }
    .dr-tag { font-size: 11px; font-weight: 800; color: #2b4a6b; }
    body.in-mode #panel .win .dr-card.on[aria-pressed="true"] { background: #dbe8f3; border-color: #2a4360; color: #17131f; }
    .dr-dock { position: sticky; bottom: -16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin: 4px -16px -16px; padding: 10px 16px; background: var(--cream, #fffaf0); border-top: 3px solid var(--ink, #17131f); }
    .dr-dock button { min-height: 44px; display: inline-flex; gap: 6px; align-items: center; justify-content: center; }
    .dr-dock .primary { flex: 1 1 auto; }`;
  document.head.appendChild(css);
})();
