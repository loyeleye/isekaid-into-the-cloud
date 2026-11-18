// Mira's Kitchen (Ladi, Nov 18): Development's Lambda game, task 1.2. The rules are js/kitchen-core.js.
// Mira runs Thornwick's infirmary kitchen from Bram's old recipe book. The kitchen is one Lambda function: the recipe
// card on the bench is its code and configuration, and every order from the wards is a set of calls to it.
//   - The loop: an order comes in, you set the card on the bench (memory, timeout, where the pantry connection opens,
//     what the counter gets back, where failed photos go, which pantry, provisioned concurrency), fire the stove, and
//     every plate says what Lambda did: served, late, 502, timed out, wrong pantry, lost or kept, with its seconds and
//     whether it was a cold start. Up to 3 firings per order; the best one stands.
//   - The card shows as real code and configuration, and changes as you turn the knobs, so the setting you pick is the
//     line you'd write.
//   - The question is the debrief: after each order, one verified bank question on what that order taught (task 1.2
//     first, then any Development question on it), with the shared stake table (SD.modes.ask). A miss carries its
//     verified twin (or itself) to the next night's first debrief.
//   - Five orders a night, the dinner rush last, starting from a blank card. Saves after every step (S.save.kitchen).
(function () {
  if (!SD.modes || !SD.kitchen) return;
  const M = SD.modes, U = SD.ui, S = SD.state, K = SD.kitchen;
  const E = () => SD.exam, D = () => SD.topicDrill;
  const ID = 'kitchen', TITLE = "MIRA'S KITCHEN";
  const esc = s => U.esc(String(s == null ? '' : s));
  const sv = () => S.save;
  const cur = () => sv().kitchen || null;
  const keep = () => (sv().kitchenKeep = sv().kitchenKeep || { night: 0, taught: {}, carry: [], best: 0 });
  const save = s => { sv().kitchen = s; S.persist(); };
  const icon = (n, cls) => `<svg class="kt-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[n]) || ''}</svg>`;
  const head = mood => { try { return SD.art && SD.art.portrait ? `<span class="kt-head">${SD.art.portrait('mira', 40, mood || 'neutral')}</span>` : ''; } catch (e) { return ''; } };
  const say = (mood, line) => `<p class="kt-say" data-vo="${esc('mira|' + line)}">${head(mood)}<span><b>Mira:</b> ${esc(line)}</span></p>`;
  const plural = (n, a, b) => `${n} ${n === 1 ? a : (b || a + 's')}`;
  const panel = html => U.panel(`<div class="kt">${html}</div>`, { title: TITLE, onClose: stopNow, cls: 'kt-win' });
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today && SD.today.render) SD.today.render(); }

  function start() {
    let s = cur();
    if (!s || s.v !== 1 || s.phase === 'done') {
      const k = keep();
      s = K.newNight({ night: k.night + 1, taught: k.taught, carry: k.carry });
      s.tally = M.newTally();
      s.fresh = true;
    }
    save(s);
    draw(s);
  }
  function draw(s) { ({ bench: bench, plates: platesScreen, debrief: debrief, end: endScreen }[s.phase] || bench)(s); }

  const route = s => `<ol class="kt-route" aria-label="Tonight's orders">${K.ROUTE.map((id, i) => {
    const o = K.ORDERS[id], st = s.stars[id] | 0, here = i === s.step;
    return `<li class="${here ? 'here' : i < s.step ? 'done' : ''}${o.boss ? ' boss' : ''}">${icon(o.icon)}<span>${esc(o.name)}</span>${i < s.step || (here && s.fires.length) ? `<b aria-label="${st} of 3 stars">${'★'.repeat(st)}${'☆'.repeat(3 - st)}</b>` : ''}</li>`;
  }).join('')}</ol>`;

  // ---- The order ticket: who is coming, how they arrive and how long they wait ----
  const KIND = { api: ['The counter', 'coffee-cup', 'API Gateway, proxy integration: waits at the hatch'], s3: ['The photo pantry', 'film-strip', 'S3 bucket: asynchronous, nobody waits'] };
  function guestRow(g) {
    const [name, ic] = KIND[g.kind];
    const bits = [g.burst ? `${g.n} at once` : g.n === 1 ? '1 guest' : `${g.n}, one at a time`,
      g.stuck ? 'a corrupt file: it hangs the code' : g.kind === 'api' ? `waits ${g.patience} s` : `wanted within ${g.patience} s`,
      g.stage ? `${g.stage === 'prod' ? 'production' : 'test'} stage` : ''].filter(Boolean);
    return `<li>${icon(g.stuck ? 'spider-web' : ic)}<span><b>${esc(name)}</b> · ${esc(bits.join(' · '))}</span></li>`;
  }

  // ---- The recipe card: the knobs, and the code they write ----
  function codeHtml(id, c, hot) {
    const o = K.ORDERS[id], k = o.knobs, api = o.guests.some(g => g.kind === 'api'), s3 = o.guests.some(g => g.kind === 's3');
    const L = (key, t) => `<span class="kt-ln${hot === key ? ' hot' : ''}${k.includes(key) ? ' knob' : ''}">${t}</span>`;
    const pantry = c.env ? 'process.env.PANTRY_TABLE' : "'test-pantry'";
    const open = `const pantry = openPantry(${esc(pantry)});`;
    const lines = [];
    lines.push(`<span class="kt-c">// Bram's book, ${esc(o.name.toLowerCase())}</span>`);
    if (c.prep === 'outside') lines.push(L('prep', `${open} <span class="kt-c">// once per cook</span>`));
    lines.push('export const handler = async (event) =&gt; {');
    if (c.prep === 'inside') lines.push(L('prep', `  ${open} <span class="kt-c">// every call</span>`));
    lines.push('  const dish = await cook(pantry, event);');
    if (api) lines.push(L('ret', c.ret === 'proxy' ? '  return { statusCode: 200, body: JSON.stringify(dish) };' : '  return dish;'));
    else lines.push('  return dish;');
    lines.push('};');
    const pc = K.pcOf(c.pc);
    const conf = [L('mem', `MemorySize: ${c.mem}`), L('timeout', `Timeout: ${c.timeout}`)];
    if (k.includes('env') || c.env) conf.push(L('env', c.env ? 'Environment: PANTRY_TABLE: !Sub "${Stage}-pantry"' : '<span class="kt-c"># no environment variables</span>'));
    if (s3) conf.push(L('dest', c.dest ? 'EventInvokeConfig: OnFailure: spoiled-queue' : '<span class="kt-c"># no on-failure destination</span>'));
    if (k.includes('pc')) conf.push(L('pc', !pc[0] ? '<span class="kt-c"># no provisioned concurrency</span>' : pc[1] === 'latest' ? `ProvisionedConcurrency: ${pc[0]} on $LATEST` : `AutoPublishAlias: live · Provisioned: ${pc[0]}`));
    return `<pre class="kt-code" aria-label="The recipe as code">${lines.join('\n')}</pre><pre class="kt-code kt-conf" aria-label="The recipe's configuration">${conf.join('\n')}</pre>`;
  }
  function knobHtml(key, c) {
    const kn = K.KNOBS[key];
    const btns = kn.opts.map(v => `<button type="button" class="${c[key] === v ? 'on' : ''}" aria-pressed="${c[key] === v}" data-k="${key}" data-v="${esc(JSON.stringify(v))}">${esc(key === 'mem' || key === 'timeout' ? kn.say(v) : short(key, v))}</button>`).join('');
    return `<div class="kt-knob"><span class="kt-kn">${esc(kn.name)}</span><span class="kt-seg${kn.opts.length > 3 ? ' many' : ''}" role="group" aria-label="${esc(kn.name)}">${btns}</span><span class="small kt-kv">${esc(kn.say(c[key]))}</span></div>`;
  }
  const SHORT = { prep: { inside: 'Inside', outside: 'Outside' }, ret: { body: 'The dish', proxy: 'statusCode + body' }, dest: { false: 'Nowhere', true: 'Destination' },
    env: { false: 'In the code', true: 'Env variable' }, pc: { none: 'None', latest5: '5 · $LATEST', alias2: '2 · live', alias5: '5 · live', alias10: '10 · live' } };
  const short = (k, v) => (SHORT[k] && SHORT[k][String(v)]) || String(v);

  function bench(s, hot) {
    const id = K.order(s), o = K.ORDERS[id], c = s.cfg;
    const first = s.fresh && s.night === 1 && s.step === 0 && !s.fires.length;
    const left = K.firesLeft(s);
    const b = panel(`<p class="kt-night">Night ${s.night}</p>
      ${route(s)}
      ${first ? say('warm', 'This was Bram\'s kitchen. His book still works, mostly. Every order the wards send runs through one recipe card: set it, then fire the stove and see what comes back.') : ''}
      <div class="kt-order${o.boss ? ' boss' : ''}"><div class="kt-oh">${icon(o.icon)}<span><b>${esc(o.name)}</b><br><span class="small">${esc(o.ward)}: "${esc(o.says)}"</span></span></div>
        <p class="small">${esc(o.brief)}</p>
        <ul class="kt-guests">${o.guests.map(guestRow).join('')}</ul>
        <p class="small kt-ok">${o.lateOk ? `For 3 stars: nothing fails, at most ${o.lateOk} late, and a fair bill.` : 'For 3 stars: nothing fails, nothing late, and a fair bill.'}</p></div>
      <div class="kt-bench"><div class="kt-knobs">${o.knobs.map(k => knobHtml(k, c)).join('')}</div>
        <div class="kt-card">${codeHtml(id, c, hot)}</div></div>
      ${s.fires.length ? `<p class="small">Last firing: ${'★'.repeat(s.fires[s.fires.length - 1].stars)}${'☆'.repeat(3 - s.fires[s.fires.length - 1].stars)} · bill ${s.fires[s.fires.length - 1].bill} GB-s · best so far ${'★'.repeat(s.stars[id] | 0) || 'none'}</p>` : ''}
      <div class="kt-dock"><button class="ghost" id="kt-stop">☰ Stop for now</button>${s.fires.length ? '<button class="ghost" id="kt-serve">Serve the best one</button>' : ''}<button class="primary" id="kt-fire">${icon('campfire')}Fire the stove <span class="small">(${left} of ${K.FIRES} left)</span></button></div>`);
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
      s.cfg = Object.assign({}, s.cfg, { [el.dataset.k]: JSON.parse(el.dataset.v) });
      s.fresh = false; save(s); bench(s, el.dataset.k);
    });
    b.querySelector('#kt-fire').onclick = () => { s.fresh = false; s.last = { lines: K.fireNight(s, s.cfg).lines }; save(s); draw(s); };
    const sv2 = b.querySelector('#kt-serve');
    if (sv2) sv2.onclick = () => { K.serve(s); save(s); draw(s); };
    b.querySelector('#kt-stop').onclick = () => { U.closePanel(); stopNow(); };
  }

  // ---- The plates ----
  const OUT = {
    served: ['✓', 'Served', 'good'], late: ['⌛', 'Late', 'warn'], '502': ['502', 'Bad Gateway', 'bad'], timeout: ['⏱', 'Timed out', 'bad'],
    wrong: ['≠', 'Wrong pantry', 'bad'], lost: ['✗', 'Lost', 'bad'], kept: ['⇩', 'Kept', 'keep']
  };
  function plateHtml(p, i) {
    const [g, word, cls] = OUT[p.out];
    const note = [p.cold ? 'cold start' : 'warm', p.tries > 1 ? `${p.tries} tries` : ''].filter(Boolean).join(' · ');
    const label = `${word}${p.stuck ? ' (the corrupt file)' : ''}. ${p.d} seconds, ${note}.`;
    return `<li class="kt-plate ${cls}${p.stuck ? ' stuck' : ''}" style="--i:${i}" role="img" aria-label="${esc(label)}" title="${esc(label)}"><span class="kt-pg">${esc(g)}</span><span class="kt-pw">${esc(word)}</span><span class="kt-pd">${p.d} s${p.cold ? ' ❄' : ''}${p.tries > 1 ? ' ↻' + p.tries : ''}</span></li>`;
  }
  function platesScreen(s) {
    const id = K.order(s), o = K.ORDERS[id];
    const r = K.fire(id, s.cfg), st = K.stars(id, r), miss = K.short(id, r);
    const lines = (s.last && s.last.lines) || [];
    const left = K.firesLeft(s);
    const groups = o.guests.map((g, gi) => {
      const ps = r.plates.filter(p => p.g === gi);
      return `<div class="kt-row"><p class="small"><b>${esc(KIND[g.kind][0])}</b>${g.stage ? ` · ${g.stage === 'prod' ? 'production' : 'test'}` : ''}${g.stuck ? ' · the corrupt file' : ''}</p><ul class="kt-plates">${ps.map(plateHtml).join('')}</ul></div>`;
    }).join('');
    const counts = Object.keys(OUT).filter(k => r.counts[k]).map(k => `${r.counts[k]} ${OUT[k][1].toLowerCase()}`).join(' · ');
    const b = panel(`${route(s)}
      <p class="kt-claim">${esc(o.name)}: ${r.refused ? 'the stove won\'t light' : `${'★'.repeat(st)}${'☆'.repeat(3 - st)}`}</p>
      ${r.refused ? say('tired', K.TEACH.refused) : `<div class="kt-pass">${groups}</div>
      <p class="kt-sum">${esc(counts)}</p>
      <p class="small kt-bill">${icon('coins')}Bill <b>${r.bill} GB-s</b>${r.standing ? ` (${r.run} cooking, ${r.standing} for the provisioned cooks standing by)` : ''} · ❄ cold start · ↻ tries</p>`}
      ${lines.filter(e => e !== 'refused').map(e => say('neutral', K.TEACH[e])).join('')}
      ${!r.refused && st === 3 ? say('smile', s.fires.length === 1 ? 'First firing, every plate right. Bram would have written that one down.' : 'That\'s the one. Every plate right, and the bill is fair.') : ''}
      ${!r.refused && st === 2 && miss ? `<p class="kt-miss">For the third star: ${esc(miss)}.</p>` : ''}
      <div class="kt-dock">${left > 0 && st < 3 ? `<button class="ghost" id="kt-again">Change the card (${plural(left, 'firing')} left)</button>` : ''}<button class="primary" id="kt-serve">${left > 0 && st < 3 ? 'Serve the best one' : 'Serve it'}</button></div>`);
    const ag = b.querySelector('#kt-again');
    if (ag) ag.onclick = () => { K.again(s); save(s); draw(s); };
    b.querySelector('#kt-serve').onclick = () => { K.serve(s); save(s); draw(s); };
  }

  // ---- The debrief: one question on what the order taught ----
  const text = q => [q.q].concat(q.opts || [], (q.items || []).map(x => x.t)).join(' ');
  function debriefQuestion(s, id) {
    const k = keep();
    const used = new Set((s.debriefs || []).map(d => d.q));
    while (s.carry.length) {
      const qid = s.carry.shift(), q = E().find(qid);
      if (q && E().allowed(q) && !used.has(q.id)) { k.carry = s.carry.slice(); return q; }
    }
    const re = K.ORDERS[id].q, lam = q => q.topic === 'lambda' || /Lambda/.test(text(q));
    const base = { n: 1, verifiedOnly: true, mix: 0, avoid: Array.from(used) };
    let r = M.pick(Object.assign({}, base, { match: q => q.dva === '1.2' && lam(q) && re.test(text(q)) }));
    if (!r.items.length) r = M.pickDomain(1, Object.assign({}, base, { match: q => lam(q) && re.test(text(q)) }));
    const it = r.items[0];
    return it ? E().find(it.q) : null;
  }
  const verifiedTwins = (q, avoid) => ((SD.twins && SD.twins[q.id]) || []).map(x => E().find(x)).filter(x => x && E().allowed(x) && D().isVerified(x) && !avoid.has(x.id));
  function debrief(s) {
    const id = K.order(s), o = K.ORDERS[id], st = s.stars[id] | 0;
    const b = panel(`${route(s)}
      <p class="kt-claim">${esc(o.name)}: served ${'★'.repeat(st)}${'☆'.repeat(3 - st)}</p>
      ${say(st === 3 ? 'smile' : st ? 'neutral' : 'tired', st === 3 ? 'Clean plates. Now tell me why it worked.' : st ? 'They ate. Now the part Bram always made me say out loud.' : 'Rough night for that ward. Say it out loud anyway: it\'s how it sticks.')}
      <p>One question on what this order turned on. Say how sure you are.</p>
      <div class="kt-dock"><button class="primary" id="kt-ask">Answer it</button></div>`);
    b.querySelector('#kt-ask').onclick = async () => {
      const q = debriefQuestion(s, id);
      if (!q) { K.next(s); save(s); draw(s); return; }
      const r = await M.ask(q, { tally: s.tally, title: "MIRA'S QUESTION" });
      if (r.closed || r.skipped) { save(s); draw(s); return; }
      const avoid = new Set((s.debriefs || []).map(d => d.q).concat([q.id]));
      s.debriefs.push({ q: q.id, order: id, ok: !!r.ok, conf: r.conf, pts: r.pts });
      if (!r.ok) {
        const tw = verifiedTwins(q, avoid);
        keep().carry = (keep().carry || []).concat([tw.length ? tw[0].id : q.id]).slice(-3);
      }
      K.next(s); save(s); draw(s);
    };
  }

  // ---- The end: the night's stars, the proofs, then Pip ----
  function endScreen(s) {
    const k = keep(), total = K.total(s), proofs = s.debriefs.filter(d => d.ok).length;
    if (!s.paid) {
      s.paid = M.pay(ID) || ' ';
      k.night = s.night; k.taught = s.taught;
      k.best = Math.max(k.best | 0, total);
      if (SD.modeStage && SD.modeStage.sting) SD.modeStage.sting(ID, total >= 10 ? 'win' : 'lose');
    }
    const tile = (n, label, art) => `<div class="kt-tile">${art}<b>${n}</b><span>${label}</span></div>`;
    const b = panel(`<p class="kt-night">Night ${s.night}: the kitchen's closed</p>
      ${say(total >= 12 ? 'warm' : 'tired', total >= 12 ? 'Every ward fed. I\'m writing tonight\'s card into the book, next to his.' : 'Everyone ate something. Tomorrow we do it better.')}
      ${route(s)}
      <div class="kt-tiles">${tile(`${total}/15`, 'stars', icon('star-formation'))}${tile(`${proofs}/${s.debriefs.length}`, 'questions right', icon('checked-shield'))}${tile(k.best, 'best night', icon('open-book'))}</div>
      ${s.tally ? M.calibHtml(s.tally, 'How sure you were') : ''}
      ${s.paid && s.paid.trim() ? `<p class="small">${esc(s.paid)}</p>` : ''}
      ${M.pipHtml()}
      <div class="kt-dock"><button class="primary" id="kt-done">Done</button></div>`);
    M.pipWire(b, "Mira's Kitchen");
    b.querySelector('#kt-done').onclick = () => { s.phase = 'done'; save(s); U.closePanel(); stopNow(); };
    save(s);
  }

  M.register({
    id: ID, name: "Mira's Kitchen", minutes: 'about 15', host: 'Mira',
    blurb: 'The kitchen is one Lambda function. Set the recipe card, fire the stove, and read every plate.',
    start,
    status: () => { const s = cur(); if (!s || s.v !== 1 || s.phase === 'done') return '';
      return `Resume · Night ${s.night} · ${K.ORDERS[K.order(s)] ? K.ORDERS[K.order(s)].name : 'the end'}`; }
  });
  SD.kitchenUi = { draw: () => { const s = cur(); if (s) draw(s); }, start };

  const css = document.createElement('style');
  css.textContent = `
    .kt { display: flex; flex-direction: column; gap: 10px; }
    .kt p { margin: 0; }
    .kt-gi { width: 18px; height: 18px; vertical-align: -4px; flex: 0 0 auto; fill: currentColor; }
    .kt-night, .kt-claim { font-family: var(--f-head); font-weight: 700; font-size: 18px; }
    .kt-say { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
    .kt-head { flex: 0 0 40px; width: 40px; height: 46px; overflow: hidden; border-radius: 8px; border: 2px solid rgba(255, 230, 190, .5); background: #3a2a20; }
    .kt-head img, .kt-head svg { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .kt-route { list-style: none; margin: 0; padding: 0; display: flex; gap: 4px; flex-wrap: wrap; }
    .kt-route li { display: inline-flex; gap: 4px; align-items: center; padding: 3px 8px; border-radius: 999px; font-size: 12px; background: rgba(255, 255, 255, .06); opacity: .75; }
    .kt-route li.here { opacity: 1; box-shadow: inset 0 0 0 2px #e0a030; font-weight: 700; }
    .kt-route li.done { opacity: 1; }
    .kt-route li b { color: #f3c44e; letter-spacing: -1px; }
    .kt-route li.boss { background: rgba(160, 60, 40, .3); }
    .kt-route .kt-gi { width: 14px; height: 14px; }
    .kt-order { display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 12px; background: #efe3c8; color: #2a2018; border: 2px solid #8a6a40; box-shadow: 0 2px 0 #5a4024; }
    .kt-order.boss { border-color: #9e3a34; }
    .kt-oh { display: flex; gap: 8px; align-items: flex-start; } .kt-oh .kt-gi { width: 30px; height: 30px; }
    .kt-guests { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 4px; }
    .kt-guests li { display: flex; gap: 6px; align-items: flex-start; font-size: 14px; }
    .kt-how { opacity: .75; } .kt-ok { font-weight: 700; }
    .kt-bench { display: flex; flex-direction: column; gap: 10px; }
    .kt-knobs { display: flex; flex-direction: column; gap: 8px; }
    .kt-knob { display: flex; flex-direction: column; gap: 3px; }
    .kt-kn { font-weight: 700; font-size: 14px; }
    .kt-seg { display: flex; flex-wrap: wrap; gap: 4px; }
    .kt-seg button { flex: 1 1 0; min-width: 0; min-height: 40px; padding: 4px 6px; font-size: 13px; border-radius: 8px; }
    .kt-seg.many button { flex: 1 1 56px; }
    body #panel .win .kt .kt-seg button.on[aria-pressed="true"] { background: linear-gradient(#ffe58a, #e0a030); border-color: #5a3a12; color: #2a1a06; font-weight: 700; }
    .kt-kv { opacity: .8; }
    .kt-card { display: flex; flex-direction: column; gap: 6px; }
    .kt-code { margin: 0; padding: 8px 10px; border-radius: 8px; background: #1c1712; color: #f1e6d0; font: 12px/1.5 ui-monospace, SFMono-Regular, Menlo, monospace; white-space: pre-wrap; word-break: break-word; border-left: 4px solid #e0a030; }
    .kt-conf { border-left-color: #6a9ac0; }
    .kt-c { color: #a8977c; }
    .kt-ln.knob { text-decoration: underline dotted rgba(224, 160, 48, .6); text-underline-offset: 3px; }
    .kt-ln.hot { background: rgba(224, 160, 48, .3); border-radius: 3px; animation: ktHot 1s ease-out; }
    @keyframes ktHot { from { background: rgba(255, 220, 120, .8); } }
    .kt-pass { display: flex; flex-direction: column; gap: 8px; padding: 10px; border-radius: 12px; background: repeating-linear-gradient(90deg, #6b4a30 0 18px, #5f4129 18px 36px); }
    .kt-row p { color: #f6ead2; }
    .kt-plates { list-style: none; margin: 4px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .kt-plate { width: 64px; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 6px 2px; border-radius: 50% 50% 14px 14px; background: radial-gradient(circle at 50% 35%, #fffaf0, #e4dccb 70%); color: #2a2018; border: 2px solid #2a2018;
      animation: ktPlate .35s cubic-bezier(.2, 1.4, .4, 1) backwards; animation-delay: calc(min(var(--i), 8) * 70ms); }
    @keyframes ktPlate { from { transform: translateY(-14px) scale(.7); opacity: 0; } }
    .kt-pg { font-weight: 800; font-size: 18px; line-height: 1.1; }
    .kt-pw { font-size: 11px; font-weight: 700; text-align: center; line-height: 1.1; }
    .kt-pd { font-size: 11px; }
    .kt-plate.good .kt-pg { color: #2f7a3a; } .kt-plate.warn { background: radial-gradient(circle at 50% 35%, #fff4d6, #e9cf8f 70%); }
    .kt-plate.bad { background: radial-gradient(circle at 50% 35%, #ffe2dc, #d99a8e 70%); } .kt-plate.bad .kt-pg { color: #9e3a34; }
    .kt-plate.keep { background: radial-gradient(circle at 50% 35%, #e4eefa, #9fb8d6 70%); } .kt-plate.keep .kt-pg { color: #2a4360; }
    .kt-plate.stuck { border-style: dashed; }
    .kt-sum { font-weight: 700; }
    .kt-bill { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
    .kt-miss { padding: 6px 8px; border-left: 4px solid #e0a030; border-radius: 4px; background: rgba(224, 160, 48, .12); font-size: 14px; }
    .kt-dock { position: sticky; bottom: 0; display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; padding: 14px 0 6px; background: linear-gradient(rgba(10, 8, 14, 0), rgba(10, 8, 14, .92) 30%); }
    .kt-dock button { min-height: 44px; }
    .kt-dock .primary { display: inline-flex; gap: 6px; align-items: center; }
    .kt-tiles { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
    .kt-tile { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 8px 4px; border-radius: 12px; background: rgba(30, 24, 20, .6); text-align: center; }
    .kt-tile b { font-family: var(--f-head); font-size: 24px; line-height: 1; } .kt-tile span { font-size: 12px; opacity: .85; }
    .kt-tile .kt-gi { width: 28px; height: 28px; fill: #f3c44e; }
    @media (min-width: 900px) { .kt-bench { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); align-items: start; } }
    @media (prefers-reduced-motion: reduce) { .kt-plate, .kt-ln.hot { animation: none; } }`;
  document.head.appendChild(css);
})();
