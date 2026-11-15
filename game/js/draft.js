// Architect's Draft (Nov 15 design doc, Mode 5): an arena draft crossed with a town builder, for the exam's
// multiple-response questions ("Select TWO", "Select THREE"), with single-answer questions as one-slot jobs.
// A client brings a requirements scroll (the question's stem) with one slot per answer it needs; the question's own
// options are dealt face up as service cards. Draft a card into each slot, swap until you seal, then seal with Guess,
// Think so or Sure. Each slot is judged on its own with the shared stake table (Guess +1/0, Think so +2/-1,
// Sure +3/-3, as floors). A fully right blueprint stands in the Architects' Quarter; one with any wrong slot stands
// under scaffolding, and its question goes on the Wall (js/today.js), so bringing that poster down (Monster Hunt or
// a Wall drill) finishes the building. After sealing, every card left on the table flips to show its "why not" line.
//
// Rules from the design doc: bank questions only; verified-only with the topic drill's fallback (unchecked ones carry
// the "Not verified yet" mark, js/topic-drill.js); spacing picks the contracts and nothing can
// be dodged (you choose the order on the contract board, never whether); no clock; save after every contract.
// Inspector's tokens (2 a session) flip one card early, and a blueprint sealed after one pays at most Think so.
// Five standing buildings in a district unlock its landmark. Host: Elder Wren, the Quarter's inspector. Clients are
// the camp's people (Story Bible: camp-side, chapter 2 arrivals and the four), and their lines never state a number.
//
// The shared shell (js/modes.js, from the Incident Commander build) gives the Play button's mode picker, the stake
// table, question picking, calibration, the first-run walkthrough, pay and Pip's line.
//   SD.draft.open(preset)   the contract board (preset: a topic-drill preset id, or none for every topic)
//   SD.draft.quarter()      the Architects' Quarter
//   SD.draft.scaffoldFor(qid)  { client, building } when that question's building is under scaffolding, else null
(function () {
  const DR = SD.draft = {};
  const S = SD.state, U = SD.ui, E = () => SD.exam, M = () => SD.modes || {};
  const esc = s => U.esc(s);
  const SESSION = 7, BOARD = 3, TOKENS = 2, LANDMARK_AT = 5;
  const CONF = ['Guess', 'Think so', 'Sure'];
    const today = () => new Date().toDateString();
  const sgn = n => (n > 0 ? '+' + n : n < 0 ? '−' + (-n) : '0');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  // ---- The cast ----
  DR.HOST = { id: 'wren', name: 'Elder Wren' };
  const WREN = {
    intro: 'The Free Cloud needs a quarter. Everyone here wants something built, and nobody wants what they need. Build what the scroll says, not what they say.',
    token: 'Wren turns the card over and says nothing for a long time. Then he taps the back of it.',
    clean: 'Wren walks round it once and nods. That\'s all you get.',
    scaf: 'Wren raps the scaffolding with his staff. "It stays up until you\'ve earned it down."',
    landmark: 'Wren stands at the end of the street for a long time. "Now it\'s a street."',
    end: 'Wren banks the fire. "Same again tomorrow. Bring the scroll."'
  };
  // District d is exam domain d. Two clients per district; a question's client is fixed by its id.
  DR.CLIENTS = {
    coo: { name: 'Postmaster Coo', d: 1, bld: 'sorting office', sign: 'POST', roof: '#c0503a', wall: '#efe2c6',
      arrive: 'Coo. Requirements, in writing. Delivered to you at least once.',
      right: 'Coo-ah. Every pigeonhole where I\'d have put it.',
      wrong: 'Coo. This goes back to the sender. That\'s you.',
      sure: 'You signed for that with great confidence. Coo. I keep the receipts.' },
    mira: { name: 'Mira', d: 1, bld: 'infirmary', sign: 'WARD', roof: '#3a4157', wall: '#e8ebf0',
      arrive: 'Sit down. I\'ll tell you what I need, and then you\'ll build exactly that.',
      right: 'Good. Clean lines. Nothing I\'ll have to stitch later.',
      wrong: 'Hold still. That one\'s wrong, and I\'m going to show you where.',
      sure: 'You were sure. I hear that a lot from people on my table. Look again.' },
    seoyeon: { name: 'Seo-yeon', d: 2, bld: 'gatehouse', sign: 'GATE', roof: '#8d1d29', wall: '#f2efe8',
      arrive: 'I would be honoured if you built this correctly. I mention it only once.',
      right: 'Acceptable. I will try not to look impressed.',
      wrong: 'How generous of you, leaving the door open. For everyone.',
      sure: 'Such certainty. It must be restful.' },
    seymour: { name: 'Sir Seymour Backups', d: 2, bld: 'tape vault', sign: 'VAULT', roof: '#5a606c', wall: '#d8dce4',
      arrive: 'HALT! Before you draw a single line: I have a list. Three lists. Copies of each.',
      right: 'It stands. I shall check it. Then check it again. Then once more, for luck.',
      wrong: 'This is why I keep backups of my backups.',
      sure: 'Sure? Sure is how tapes go missing.' },
    dutch: { name: 'Dutch', d: 3, bld: 'night office', sign: 'OFFICE', roof: '#24345e', wall: '#d8d4c8',
      arrive: 'Kid. One line in that scroll decides it. Find it before you build.',
      right: 'Huh. It holds. Don\'t let it go to your head.',
      wrong: 'Wrong door, kid. Read the scroll again. Slower.',
      sure: 'You went with your gut. I know how that ends. Sit down.' },
    marrow: { name: 'Goodwife Marrow', d: 3, bld: 'bell house', sign: 'BELL', roof: '#6a3a4a', wall: '#e8dcc4',
      arrive: 'I need a bell that rings for the right thing, and only the right thing.',
      right: 'That\'ll ring true. I can hear it already.',
      wrong: 'That would ring at the wrong hour. Half the camp would come running for nothing.',
      sure: 'Loud and wrong. That\'s the worst kind of bell.' },
    kai: { name: 'Kai', d: 4, bld: 'kitchen annex', sign: 'KITCHEN', roof: '#d84a3a', wall: '#f2efe6',
      arrive: 'I want it fast, I want it hot, and I wanted it yesterday. Yes, chef? Yes, chef.',
      right: 'Look at that. It doesn\'t even fall over when I lean on it.',
      wrong: 'That\'s not what I ordered. I\'ll fix it. ...No. You fix it.',
      sure: 'You plated that like it was perfect. It\'s raw in the middle.' },
    pip: { name: 'Pip', d: 4, bld: 'lost and found', sign: 'FOUND', roof: '#3b8bff', wall: '#e6f4ff',
      arrive: 'Sorry to be a bother. Could it be a little building? For things that went missing?',
      right: 'Oh! It\'s just right. Why did that work?',
      wrong: 'Oh. I think something\'s missing. Sorry. I would know.',
      sure: 'You sounded so sure that I believed you too. Why didn\'t that work?' }
  };
  const BY_D = { 1: ['coo', 'mira'], 2: ['seoyeon', 'seymour'], 3: ['dutch', 'marrow'], 4: ['kai', 'pip'] };
  DR.STREETS = { 1: 'Dispatch Row', 2: 'Lockside', 3: 'Pipeline Lane', 4: 'Lantern Street' };
  const hashId = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
  DR.clientFor = function (q) {
    const d = E().domainOf(q) || 1, ids = BY_D[d] || BY_D[1];
    return ids[hashId(q.id) % ids.length];
  };
  const cl = id => DR.CLIENTS[id] || DR.CLIENTS.coo;
  const bldName = id => `${cl(id).name.split(' ').slice(-1)[0] === 'Backups' ? 'Seymour' : cl(id).name.replace(/^(Postmaster|Goodwife|Sir) /, '')}'s ${cl(id).bld}`;
  DR.buildingName = bldName;
  // The cast's PixelLab portraits (assets/img/portraits, credited in CREDITS.md). Elder Wren's is the faithful's
  // ("faithful is Elder Wren", js/vec-cast.js). Drawn straight from the files, so the mode doesn't depend on which
  // chapter has registered which faces.
  const FACE = { coo: 'coo', mira: 'mira', seoyeon: 'seoyeon', seymour: 'seymour', dutch: 'dutch', marrow: 'marrow', kai: 'kai', pip: 'pip', wren: 'faithful' };
  function portrait(who, size) {
    if (FACE[who] && !window.SD_VECTOR) return `<span class="bust dr-bust px" style="width:${size}px;height:${Math.round(size * 140 / 120)}px"><img src="assets/img/portraits/${FACE[who]}-neutral.webp" alt="" draggable="false"></span>`;
    try { return SD.art && SD.art.portrait ? SD.art.portrait(who, size) : ''; } catch (e) { return ''; }
  }

  // ---- Save ----
  const sv = () => {
    const s = S.save;
    if (!s.draft || typeof s.draft !== 'object') s.draft = {};
    if (!s.draft.town || typeof s.draft.town !== 'object') s.draft.town = {};
    return s.draft;
  };
  DR.save = sv;

  // ---- Questions ----
  const isMulti = q => q && q.type === 'multi' && Array.isArray(q.items);
  const isMc = q => q && q.type === 'mc' && Array.isArray(q.opts);
  DR.slotsOf = q => (isMulti(q) ? q.items.filter(i => i.ok).length : 1);
  DR.cards = q => (isMulti(q) ? q.items.map(i => i.t) : q.opts.slice());
  DR.cardOk = (q, i) => (isMulti(q) ? !!(q.items[i] && q.items[i].ok) : i === q.a);
  DR.cardNo = (q, i) => (isMulti(q) ? (q.items[i] && q.items[i].no) || '' : (Array.isArray(q.no) && q.no[i]) || '');
  const verified = q => !!(SD.topicDrill && SD.topicDrill.isVerified(q));
  function conceptOf(q) {
    if (q.c && SD.concepts[q.c]) return q.c;
    const t = E().taskOf(q);
    return t ? E().taskConcept(String(t)) : null;
  }
  DR.ideaOf = function (q) {
    const c = conceptOf(q), con = c && SD.concepts[c];
    return con ? con.name.replace(/^[A-Z]+ \d\.\d+: /, '') : (q.topic || 'An idea');
  };
  const base = () => SD.topicDrill.base().filter(q => isMulti(q) || isMc(q));
  // A session's contracts, from the shared picker (js/modes.js: verified-only with the topic drill's fallback, due and
  // never-asked first, about one in four from other topics): multiple-response, plus one single-answer job, or more
  // when the preset has few multiple-response questions.
  DR.pickSession = function (preset, n) {
    n = n || SESSION;
    const a = M().pick({ preset, n: n - 1, filter: isMulti }).items;
    const b = M().pick({ preset, n: n - a.length, filter: isMc, avoid: a.map(i => i.q) }).items;
    // A rebuilt question keeps its building's client; otherwise each street's two clients take turns.
    const turn = {}, town = sv().town;
    return SD.quiz.shuffle(a.concat(b)).map(it => {
      const q = find(it.q); if (!q) return null;
      const d = E().domainOf(q) || 1, ids = BY_D[d] || BY_D[1];
      turn[d] = turn[d] == null ? hashId(q.id) % ids.length : (turn[d] + 1) % ids.length;
      return { q: q.id, client: town[q.id] ? town[q.id].client : ids[turn[d]], other: it.other || 0 };
    }).filter(Boolean);
  };

  // ---- The shared shell (js/modes.js) ----
  const stake = (ok, conf) => M().stake(ok, conf);
  const stakes = () => M().STAKES;

  // ---- The Wall and the Quarter ----
  const wall = () => (Array.isArray(S.save.wall) ? S.save.wall : []);
  const twins = id => (SD.twins && SD.twins[id]) || [];
  // Is a poster up for this question's idea (the question itself or one of its twins)?
  DR.posterUp = function (qid) {
    const idea = [qid].concat(twins(qid));
    return wall().some(w => [w.id].concat(twins(w.id)).some(id => idea.includes(id)));
  };
  // Scaffolding comes down for good once the poster has: a later miss on the idea puts a new poster up, not new
  // scaffolding on the old building.
  function refresh() {
    const town = sv().town;
    Object.values(town).forEach(b => { if (b.scaf && !DR.posterUp(b.q)) { b.scaf = false; b.done = Date.now(); b.fin = 1; } });
    return town;
  }
  DR.town = () => refresh();
  DR.scaffoldFor = function (qid) {
    const town = refresh(), idea = [qid].concat(twins(qid));
    const b = Object.values(town).find(x => x.scaf && [x.q].concat(twins(x.q)).some(id => idea.includes(id)));
    return b ? { client: cl(b.client).name, building: bldName(b.client), floors: b.floors } : null;
  };
  DR.district = function (d) {
    const list = Object.values(refresh()).filter(b => b.d === d).sort((a, b) => a.t - b.t);
    return { list, standing: list.filter(b => !b.scaf).length, scaf: list.filter(b => b.scaf).length, landmark: list.filter(b => !b.scaf).length >= LANDMARK_AT };
  };
  DR.landmarks = () => [1, 2, 3, 4].filter(d => DR.district(d).landmark);

  // ---- The run ----
  DR.run = () => { const r = sv().run; return r && Array.isArray(r.items) ? r : null; };
  DR.status = function () {
    const r = DR.run(), town = Object.values(refresh());
    if (r) { const done = r.items.filter(i => i.done).length; return `Resume · contract ${Math.min(done + 1, r.items.length)} of ${r.items.length}`; }
    return town.length ? `${plural(town.filter(b => !b.scaf).length, 'building')} standing` : null;
  };
  function newRun(preset) {
    const items = DR.pickSession(preset);
    return (sv().run = { preset: preset || null, items, tokens: TOKENS, tally: M().newTally(), floors: 0, misses: 0, sure: 0, t0: Date.now(), open: null, slots: [], flips: [] });
  }
  const persist = () => S.persist && S.persist();
  const find = id => E().find(id);

  // The contract board: the first three unbuilt contracts. You choose the order, never whether.
  DR.open = async function (preset) {
    let r = DR.run();
    if (r && preset !== undefined && preset !== null && r.preset !== preset && !r.items.some(i => i.done)) r = null;
    if (!r) {
      await walkthrough();
      r = newRun(preset);
      persist();
    }
    if (!r.items.length) return empty();
    if (r.open != null && r.items[r.open] && !r.items[r.open].done) return contract(r.open);
    board();
  };
  function empty() {
    const b = U.panel(`<p>No contracts fit this topic yet. Try another preset, or every topic.</p><div class="row"><button class="primary" id="dr-any">Every topic</button><button class="ghost" id="dr-x">Close</button></div>`, { title: 'ARCHITECT\'S DRAFT' });
    sv().run = null; persist();
    b.querySelector('#dr-any').onclick = () => DR.open(null);
    b.querySelector('#dr-x').onclick = U.closePanel;
  }
  function presetName(r) {
    const p = r.preset && SD.topicDrill ? SD.topicDrill.preset(r.preset) : null;
    return p ? p.name : 'Every topic';
  }
  function board() {
    const r = DR.run();
    const left = r.items.map((it, i) => [it, i]).filter(([it]) => !it.done);
    if (!left.length) return results();
    const done = r.items.length - left.length;
    const cards = left.slice(0, BOARD).map(([it, i]) => {
      const q = find(it.q); if (!q) return '';
      const c = cl(it.client), n = DR.slotsOf(q), d = E().domainOf(q);
      const scroll = String(q.q).split(/(?<=[.?!])\s+/)[0];
      return `<button class="opt dr-contract" data-k="${i}">
        <span class="dr-who">${portrait(it.client, 44)}<span><b>${esc(c.name)}</b><br><span class="small muted">wants a ${esc(c.bld)} · ${esc(DR.STREETS[d] || '')}</span></span></span>
        <span class="small dr-scroll">"${esc(scroll.length > 140 ? scroll.slice(0, 137) + '…' : scroll)}"</span>
        <span class="chips"><span class="chip">${n === 1 ? '1 slot · one card' : `${n} slots · choose ${n}`}</span><span class="chip">${verified(q) ? '✓ Verified' : 'Not verified yet'}</span></span></button>`;
    }).join('');
    const waiting = left.length - Math.min(BOARD, left.length);
    const host = done ? '' : `<div class="dr-client">${portrait('wren', 44)}<p class="small"><b>Elder Wren:</b> "${esc(WREN.intro)}"</p></div>`;
    const b = U.panel(`${host}<div class="dr-head"><span class="chip">${esc(presetName(r))}</span><span class="chip">Contract ${done + 1} of ${r.items.length}</span><span class="chip">🔍 Tokens: ${r.tokens}</span><span class="chip">🏗 Floors today: ${r.floors}</span></div>
      <p class="small muted">Pick which contract to build next. Every contract stays on the board until it's built, so you choose the order, not whether.</p>
      <div class="opts">${cards}</div>
      ${waiting ? `<p class="small muted">${plural(waiting, 'more contract')} waiting behind these.</p>` : ''}
      <div class="row"><button class="ghost" id="dr-quarter">🏘 The Quarter</button><button class="ghost" id="dr-stop">Stop for now</button></div>`, { title: 'ARCHITECT\'S DRAFT', cls: 'dr-win' });
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { r.open = +el.dataset.k; r.slots = []; r.flips = []; r.tok = 0; persist(); contract(r.open); });
    b.querySelector('#dr-quarter').onclick = () => DR.quarter(board);
    b.querySelector('#dr-stop').onclick = stop;
  }
  function stop() { persist(); U.closePanel(); if (SD.today && SD.today.render) SD.today.render(); }

  // One contract: the scroll, its slots, the cards, an inspector's token and the seal.
  function contract(k) {
    const r = DR.run(), it = r.items[k], q = find(it.q);
    if (!q) { it.done = 1; r.open = null; persist(); return board(); }
    const c = cl(it.client), n = DR.slotsOf(q), cards = DR.cards(q);
    r.slots = (r.slots || []).filter(i => i >= 0 && i < cards.length).slice(0, n);
    r.flips = r.flips || [];
    let flipping = false;
    const t0 = Date.now();
    if (SD.state.seeConcept && conceptOf(q)) S.seeConcept(conceptOf(q));
    function render() {
      const full = r.slots.length === n, capped = !!r.tok;
      const slotH = Array.from({ length: n }, (_, s) => {
        const ci = r.slots[s];
        return ci == null ? `<div class="dr-slot empty"><span class="q-ctx">Slot ${s + 1}</span><span class="small muted">Empty: tap a card below</span></div>`
          : `<button class="dr-slot" data-s="${s}" aria-label="Slot ${s + 1}: ${esc(cards[ci])}. Tap to take it back"><span class="q-ctx">Slot ${s + 1} · tap to take back</span><span class="small">${esc(cards[ci])}</span></button>`;
      }).join('');
      const cardH = cards.map((t, i) => {
        const at = r.slots.indexOf(i), fl = r.flips.includes(i);
        const back = fl ? `<span class="dr-back small">${DR.cardOk(q, i) ? '🔍 Inspector: no objection to this one here.' : '🔍 Not here: ' + esc(DR.cardNo(q, i) || 'it doesn\'t meet the scroll.')}</span>` : '';
        return `<button class="opt dr-card${at >= 0 ? ' on' : ''}${flipping ? ' flip' : ''}" data-i="${i}" aria-pressed="${at >= 0}">${at >= 0 ? `<span class="chip">In slot ${at + 1}</span> ` : ''}${esc(t)}${back}</button>`;
      }).join('');
      const st = stakes();
      const b = U.panel(`<div class="dr-client">${portrait(it.client, 56)}<div><b>${esc(c.name)}</b> <span class="small muted">· ${esc(c.bld)} · ${esc(DR.STREETS[E().domainOf(q)] || '')}</span><p class="small">"${esc(c.arrive)}"</p></div></div>
        <div class="q-ctx">The requirements scroll · ${n === 1 ? 'one card' : `choose ${n}`}</div>
        ${q.ev ? `<pre class="q-ev">${esc(q.ev)}</pre>` : ''}<p class="q-q dr-q">${esc(q.q)}</p>
        <div class="q-ctx">Blueprint</div><div class="dr-slots">${slotH}</div>
        <div class="q-ctx">Service cards${flipping ? ' · tap one to flip it' : ''}</div><div class="opts dr-cards">${cardH}</div>
        <div class="row dr-tools">${r.tokens > 0 && !flipping ? `<button class="ghost" id="dr-tok">🔍 Inspector's token (${r.tokens} left)</button>` : ''}${flipping ? '<button class="ghost" id="dr-tok-x">Keep the token</button>' : ''}</div>
        ${capped ? '<p class="small dr-cap">🔍 Inspected: this blueprint pays at most Think so.</p>' : ''}
        <div class="conf"><span class="muted small">${full ? 'Seal the blueprint. How sure are you? Each slot is judged on its own.' : `Fill ${plural(n - r.slots.length, 'more slot')} to seal.`}</span><div class="conf-b">
          ${CONF.map((t, i) => `<button data-c="${i}" ${full && !(capped && i === 2) ? '' : 'disabled'}>${t}<small class="stake"><span class="up">${sgn(st[i][0])}</span> / <span class="dn">${sgn(st[i][1])}</span> a slot</small></button>`).join('')}</div></div>
        <div class="row"><button class="ghost" id="dr-back">Back to the board</button><button class="ghost" id="dr-stop">Stop for now</button></div>`, { title: 'ARCHITECT\'S DRAFT · CONTRACT', cls: 'dr-win', noClose: true });
      b.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { r.slots.splice(+el.dataset.s, 1); persist(); render(); });
      b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        const i = +el.dataset.i;
        if (flipping) {
          if (!r.flips.includes(i)) { r.flips.push(i); r.tokens--; r.tok = 1; }
          flipping = false; persist(); U.system('INSPECTOR', WREN.token, 'gold'); return render();
        }
        const at = r.slots.indexOf(i);
        if (at >= 0) r.slots.splice(at, 1);
        else if (r.slots.length < n) r.slots.push(i);
        else r.slots[n - 1] = i;   // all slots full: the new card swaps into the last slot
        persist(); render();
      });
      const tok = b.querySelector('#dr-tok'); if (tok) tok.onclick = () => { flipping = true; render(); };
      const tx = b.querySelector('#dr-tok-x'); if (tx) tx.onclick = () => { flipping = false; render(); };
      b.querySelectorAll('[data-c]').forEach(el => el.onclick = () => seal(+el.dataset.c));
      // Leaving the contract keeps it on the board (and its cards in their slots): nothing can be dodged.
      b.querySelector('#dr-back').onclick = () => { r.open = null; persist(); board(); };
      b.querySelector('#dr-stop').onclick = stop;
    }
    function seal(conf) {
      if (r.tok && conf > 1) conf = 1;
      const per = r.slots.map(i => ({ i, ok: DR.cardOk(q, i) }));
      const allOk = per.every(x => x.ok) && per.length === n;
      let delta = 0;
      per.forEach(x => { const s = stake(x.ok, conf); x.d = s; delta += s; M().note(r.tally, x.ok, conf); });
      const wrong = per.filter(x => !x.ok).length;
      // The question as a whole is right only when every slot is, as on the exam.
      const cid = conceptOf(q);
      if (cid) S.recordAnswer(cid, allOk, conf, Date.now() - t0, q.id);
      // Every miss goes up (not only Sure ones): a blueprint with a wrong slot stands under scaffolding until its poster
    // comes down. wallSettle counts a right answer toward its poster, and puts up a Sure miss.
    if (SD.today.wallSettle) SD.today.wallSettle(q.id, allOk, conf, null, false);
    if (!allOk && conf < 2) M().sureMiss(q.id);
      // The building: one per question, floors never below zero, scaffolding while its poster is up.
      const town = sv().town, d = E().domainOf(q) || 1;
      const prev = town[q.id];
      const floors = Math.max(0, (prev ? prev.floors : 0) + delta);
      const cracks = (prev ? prev.cracks | 0 : 0) + (conf === 2 ? wrong : 0);
      const lmBefore = DR.district(d).landmark;
      town[q.id] = { q: q.id, d, client: it.client, floors, cracks, scaf: !allOk || (prev && prev.scaf && DR.posterUp(q.id)) || false, t: prev ? prev.t : Date.now(), last: Date.now(), idea: DR.ideaOf(q) };
      if (allOk && prev && prev.scaf && !DR.posterUp(q.id)) town[q.id].fin = 1;
      r.floors += delta; if (!allOk) r.misses++; if (!allOk && conf === 2) r.sure++;
      it.done = 1; it.ok = allOk ? 1 : 0; it.conf = conf; it.d = delta; it.slots = r.slots.slice(); it.wrong = wrong;
      r.open = null; r.slots = []; r.flips = []; r.tok = 0;
      persist();
      const lm = !lmBefore && DR.district(d).landmark;
      inspect(q, it, per, conf, delta, town[q.id], lm);
    }
    render();
  }

  // Inspection: the verdict per slot, the client's word, then every card left on the table with its "why not" line.
  function inspect(q, it, per, conf, delta, bld, lm) {
    const c = cl(it.client), cards = DR.cards(q), allOk = !!it.ok;
    const line = allOk ? c.right : conf === 2 ? c.sure : c.wrong;
    const slotRows = per.map((x, s) => `<li class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓ Right' : '✗ Wrong'} · slot ${s + 1}: <b>${esc(cards[x.i])}</b> · ${sgn(x.d)} ${Math.abs(x.d) === 1 ? 'floor' : 'floors'}${!x.ok && conf === 2 ? ', a crack' : ''}</li>`).join('');
    const right = cards.map((t, i) => i).filter(i => DR.cardOk(q, i));
    const mine = per.filter(x => !x.ok).map(x => x.i);
    const missed = right.filter(i => !it.slots.includes(i));
    const left = cards.map((t, i) => i).filter(i => !it.slots.includes(i) && !DR.cardOk(q, i));
    const notLi = i => `<li><b>${esc(cards[i])}</b><br>Not here, because ${esc(lower(DR.cardNo(q, i) || 'it doesn\'t meet the scroll.'))}</li>`;
    let h = `<div class="verdict-row"><div class="verdict ${allOk ? 'ok' : 'bad'}">${allOk ? '🏛 IT STANDS' : '🚧 SCAFFOLDING'}</div><span class="chip">${CONF[conf]}</span><span class="chip">${sgn(delta)} floors</span></div>
      <div class="dr-result"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><div>
      <p class="small"><b>${esc(bldName(it.client))}</b>: ${plural(bld.floors, 'floor')}${bld.scaf ? ', under scaffolding' : ', standing'}.</p>
      <p class="small"><b>${esc(c.name)}:</b> "${esc(line)}"</p>
      <p class="small muted">${esc(allOk ? WREN.clean : WREN.scaf)}</p></div></div>
      <ul class="dr-slotres small">${slotRows}</ul>`;
    if (!allOk) h += `<div class="q-ctx">The scroll needed</div><ul class="small dr-need">${right.map(i => `<li>${esc(cards[i])}</li>`).join('')}</ul>
      <p class="small dr-wallnote">📌 It's on the Wall now. Bring that poster down (capture it in Monster Hunt, or in a Wall drill) and the scaffolding comes off.</p>`;
    if (lm) h += `<p class="small dr-lm">🏛 <b>${esc(SD.draftArt.LANDMARKS[bld.d])}</b> goes up on ${esc(DR.STREETS[bld.d])}. ${esc(WREN.landmark)}</p>`;
    h += `<div class="why"><p>${esc(q.why || '')}</p></div>`;
    h += '<div class="nots">';
    if (mine.length) h += `<div class="mypick"><div class="q-ctx">Why your card doesn't fit</div>${mine.map(i => `<p><b>${esc(cards[i])}</b><br>${esc(DR.cardNo(q, i) || 'It doesn\'t meet the scroll.')}</p>`).join('')}</div>`;
    if (missed.length) h += `<div class="q-ctx">The card${missed.length > 1 ? 's' : ''} you left out</div><ul>${missed.map(i => `<li><b>${esc(cards[i])}</b></li>`).join('')}</ul>`;
    if (left.length) h += `<div class="q-ctx">Inspection: the cards left on the table</div><ul>${left.map(notLi).join('')}</ul>`;
    h += '</div>' + sourceBlock(q) + `<button class="primary" id="dr-next">Continue</button>`;
    const b = U.panel(h, { title: 'INSPECTION', cls: 'dr-win', noClose: true });
    const cv = b.querySelector('.dr-cv'); if (cv && SD.draftArt) SD.draftArt.building(cv, { client: c, floors: bld.floors, scaf: bld.scaf, cracks: bld.cracks });
    b.querySelector('#dr-next').onclick = () => board();
  }
  const lower = s => String(s).replace(/^[A-Z](?=[a-z ])/, ch => ch.toLowerCase());
  // The question's AWS docs and its verified record (as js/quiz.js shows them for topic drills).
  function sourceBlock(q) {
    const D = SD.topicDrill; if (!D) return '';
    const rec = D.record(q), urls = D.docs(q);
    const fmt = iso => { const [y, m, d] = String(iso || '').split('-').map(Number); return y ? new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : ''; };
    const quotes = rec && Array.isArray(rec.src) ? rec.src.filter(x => x && x.quote) : [];
    let h = `<div class="q-src ${rec ? 'ok' : 'un'}">`;
    h += rec ? `<p class="small"><span class="src-badge ok">✓ Verified${rec.on ? ' ' + esc(fmt(rec.on)) : ''}</span> Checked against the current AWS docs.</p>`
      : '<p class="small"><span class="src-badge un">Not verified yet</span> Check any number, default or limit on the AWS docs page before you trust it.</p>';
    if (quotes.length) h += `<details class="src-q"><summary>What the docs say</summary>${quotes.map(x => `<blockquote>${esc(x.quote)}${x.url ? ` <a href="${esc(x.url)}" target="_blank" rel="noopener noreferrer">source ↗</a>` : ''}</blockquote>`).join('')}</details>`;
    if (rec && rec.era) h += `<p class="small src-era"><b>Heads up:</b> ${esc(rec.era)}</p>`;
    if (urls.length) h += `<div class="q-ctx">AWS docs</div><ul class="src-docs">${urls.map(u => `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(D.docLabel(u))} ↗</a></li>`).join('')}</ul>`;
    return h + '</div>';
  }

  // The results screen: right and wrong, floors, sure misses added to the Wall, topics, calibration, and Pip's question.
  function results() {
    const r = DR.run();
    const n = r.items.length, ok = r.items.filter(i => i.ok).length;
    const topics = [...new Set(r.items.map(i => find(i.q)).filter(Boolean).map(DR.ideaOf))];
    const paid = M().pay('draft');
    const b = U.panel(`<p class="small muted">${esc(WREN.end)}</p>
      <div class="dr-head"><span class="chip">🏛 Standing: ${ok}</span><span class="chip">🚧 Scaffolding: ${n - ok}</span><span class="chip">🏗 Floors: ${sgn(r.floors)}</span><span class="chip">📌 Sure misses to the Wall: ${r.sure}</span></div>
      ${paid ? `<p class="small">${esc(paid)}</p>` : ''}
      ${M().calibHtml(r.tally, 'How sure you were, slot by slot')}
      <div class="q-ctx">Ideas touched</div><ul class="small">${topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      ${M().pipHtml()}
      <div class="row"><button class="primary" id="dr-q">🏘 See the Quarter</button><button class="ghost" id="dr-done">Done</button></div>`, { title: 'ARCHITECT\'S DRAFT · RESULTS', cls: 'dr-win' });
    M().pipWire(b, 'Architect\'s Draft');
    const end = () => {
      const d = sv();
      d.last = { t: Date.now(), n, ok, floors: r.floors };
      d.run = null; persist();
    };
    b.querySelector('#dr-q').onclick = () => { end(); DR.quarter(); };
    b.querySelector('#dr-done').onclick = () => { end(); U.closePanel(); if (SD.today && SD.today.render) SD.today.render(); };
  }

  // ---- The Architects' Quarter ----
  DR.quarter = function (back) {
    const town = Object.values(refresh());
    const st = town.filter(b => !b.scaf).length;
    let h = `<p class="small muted">The camp's new quarter. Each building is a blueprint you sealed; each street is an exam domain. ${LANDMARK_AT} standing buildings on a street raise its landmark.</p>
      <div class="dr-head"><span class="chip">🏛 Standing: ${st}</span><span class="chip">🚧 Scaffolding: ${town.length - st}</span><span class="chip">Landmarks: ${DR.landmarks().length} of 4</span></div>`;
    [1, 2, 3, 4].forEach(d => {
      const D = DR.district(d);
      h += `<section class="dr-street"><div class="q-ctx">${esc(DR.STREETS[d])} · ${esc(E().DOMAINS[d] || 'Domain ' + d)}</div>
        <p class="small muted">${D.landmark ? `🏛 ${esc(SD.draftArt.LANDMARKS[d])} stands here.` : `${D.standing} of ${LANDMARK_AT} standing for ${esc(SD.draftArt.LANDMARKS[d])}.`}${D.list.length ? '' : ' An empty street: nothing built here yet.'}</p><div class="dr-lots">`;
      if (D.landmark) h += `<div class="dr-lot lm"><canvas class="dr-cv" data-lm="${d}" width="96" height="96" aria-hidden="true"></canvas><span class="small"><b>${esc(SD.draftArt.LANDMARKS[d])}</b><br>Landmark</span></div>`;
      D.list.forEach(b => {
        h += `<button class="dr-lot" data-q="${esc(b.q)}"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><span class="small"><b>${esc(bldName(b.client))}</b><br>${plural(b.floors, 'floor')} · ${b.scaf ? '🚧 Scaffolding' : '🏛 Standing'}</span></button>`;
      });
      for (let i = D.list.length; i < Math.min(LANDMARK_AT, D.list.length + 3) || i < 2; i++) h += `<div class="dr-lot empty"><canvas class="dr-cv" data-empty="1" width="96" height="96" aria-hidden="true"></canvas><span class="small muted">Empty lot</span></div>`;
      h += '</div></section>';
    });
    h += `<div class="row">${typeof back === 'function' ? '<button class="ghost" id="dr-qb">Back to the board</button>' : ''}${DR.run() ? '' : '<button class="primary" id="dr-new">Take on contracts</button>'}</div>`;
    const b = U.panel(h, { title: 'THE ARCHITECTS\' QUARTER', cls: 'dr-win' });
    b.querySelectorAll('.dr-cv').forEach(cv => {
      if (cv.dataset.lm) return SD.draftArt.landmark(cv, +cv.dataset.lm);
      if (cv.dataset.empty) return SD.draftArt.lot(cv);
      const q = cv.closest('[data-q]').dataset.q, bl = sv().town[q];
      SD.draftArt.building(cv, { client: cl(bl.client), floors: bl.floors, scaf: bl.scaf, cracks: bl.cracks });
    });
    b.querySelectorAll('[data-q]').forEach(el => el.onclick = () => plaque(el.dataset.q, back));
    const qb = b.querySelector('#dr-qb'); if (qb) qb.onclick = back;
    const nw = b.querySelector('#dr-new'); if (nw) nw.onclick = () => DR.open(null);
  };
  function plaque(qid, back) {
    const bl = sv().town[qid], q = find(qid);
    if (!bl || !q) return DR.quarter(back);
    const c = cl(bl.client);
    const b = U.panel(`<div class="dr-result"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><div>
      <p><b>${esc(bldName(bl.client))}</b></p><p class="small">${esc(DR.STREETS[bl.d])} · ${plural(bl.floors, 'floor')}${bl.cracks ? ` · ${plural(bl.cracks, 'crack')}` : ''}</p>
      <p class="small">${bl.scaf ? '🚧 Under scaffolding. Its question is on the Wall: bring that poster down (Monster Hunt or a Wall drill) to finish it.' : bl.fin ? '🏛 Standing. The scaffolding came off when its poster came down.' : '🏛 Standing.'}</p></div></div>
      <div class="dr-plaque"><div class="q-ctx">Plaque</div><p class="small"><b>${esc(bl.idea || DR.ideaOf(q))}</b></p><p class="small muted">Built for ${esc(c.name)}. ${esc(String(q.q).split(/(?<=[.?!])\s+/)[0])}</p></div>
      <div class="row"><button class="ghost" id="dr-pb">Back to the Quarter</button></div>`, { title: 'THE ARCHITECTS\' QUARTER', cls: 'dr-win' });
    SD.draftArt.building(b.querySelector('.dr-cv'), { client: c, floors: bl.floors, scaf: bl.scaf, cracks: bl.cracks });
    b.querySelector('#dr-pb').onclick = () => DR.quarter(back);
  }

  // ---- First run: three screens on a real question ----
  function walkScreens() {
    const q = base().filter(isMulti).find(x => DR.slotsOf(x) === 2) || base()[0];
    const cards = q ? DR.cards(q) : [];
    const s1 = q ? `<p class="small">${esc(WREN.intro)}</p><div class="q-ctx">A requirements scroll · choose ${DR.slotsOf(q)}</div><p class="small"><b>${esc(q.q)}</b></p>
      <p class="small muted">It has one slot per answer it needs. The question's own options are your service cards:</p><ul class="small">${cards.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : `<p class="small">${esc(WREN.intro)}</p>`;
    return [
      { title: 'A client brings a scroll', html: s1 },
      { title: 'Draft, then seal', html: `<p class="small">Tap a card to put it in the next empty slot, and tap a slot to take its card back. Swap as much as you like. Then seal with how sure you are. Each slot is judged on its own:</p>
        <ul class="small"><li><b>Guess</b>: +1 floor if right, 0 if wrong.</li><li><b>Think so</b>: +2 if right, −1 if wrong.</li><li><b>Sure</b>: +3 if right, −3 and a crack if wrong.</li></ul>
        <p class="small muted">Honest confidence wins: Guess when you're under about half sure, Sure only above about two in three. Twice a session an Inspector's token flips a card early, but that blueprint then pays at most Think so.</p>` },
      { title: 'The Quarter', html: `<p class="small">A blueprint with every slot right stands as a building on its domain's street. One wrong slot and it stands under scaffolding, and its question goes on the Wall: bring that poster down in Monster Hunt or a Wall drill to finish it.</p>
        <p class="small">After every seal, the cards left on the table flip to show why they don't fit. ${LANDMARK_AT} standing buildings on a street raise a landmark. A session is ${SESSION} contracts, about 15 minutes, and it saves after every one.</p>` }
    ];
  }
  const walkthrough = () => M().walkFirst('draft', walkScreens());
  DR.walk = () => M().walk('draft', walkScreens());

  // ---- Register with the mode picker ----
  function register() {
    if (!M().register || DR.registered) return;
    DR.registered = true;
    M().register({
      id: 'draft', name: 'Architect\'s Draft', minutes: 15, host: 'Elder Wren', icon: '🏛',
      blurb: 'Clients bring requirement scrolls. Draft the right service cards into each slot, seal with how sure you are, and raise the Architects\' Quarter. Built for Select TWO and Select THREE.',
      start: opts => DR.open(opts && opts.preset),
      status: DR.status
    });
  }
  register();

  // ---- Styles (kept here so this mode's PR doesn't touch index.html's stylesheet) ----
  const css = `
.dr-head { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.dr-contract { display: flex; flex-direction: column; gap: 6px; }
.dr-who, .dr-client, .dr-pip { display: flex; gap: 10px; align-items: flex-start; }
.dr-who > :first-child, .dr-client > :first-child, .dr-pip > :first-child { flex: none; }
.dr-client p { margin: 4px 0 0; }
.dr-scroll { font-style: italic; overflow-wrap: anywhere; }
.dr-q { font-size: 16px; }
.dr-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 10px; }
.dr-slot { display: flex; flex-direction: column; gap: 2px; text-align: left; min-height: 64px; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; overflow-wrap: anywhere; }
.dr-slot.empty { border-style: dashed; background: transparent; }
.dr-slot .q-ctx { margin: 0; }
.dr-card { overflow-wrap: anywhere; }
.dr-card.flip { border-style: dashed; }
.dr-card .chip { margin-right: 4px; }
.dr-back { display: block; margin-top: 6px; padding: 6px 8px; border-radius: 8px; background: #fff7d6; border: 1px dashed var(--ink); }
.dr-cap { color: #7a5200; }
.dr-result { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
.dr-result p { margin: 0 0 4px; }
.dr-cv { width: 96px; height: 96px; flex: none; display: block; }
.dr-slotres { padding-left: 18px; margin: 4px 0 8px; }
.dr-slotres li { margin: 3px 0; }
.dr-slotres li.ok { color: #17834f; } .dr-slotres li.bad { color: #b23b3b; }
.dr-wallnote, .dr-lm { background: #fff1c9; border-radius: 8px; padding: 6px 8px; }
.dr-calib ul { margin: 4px 0; padding-left: 18px; }
.dr-pip { margin: 10px 0; } .dr-pip label { flex: 1; min-width: 0; } .dr-pip input { display: block; width: 100%; box-sizing: border-box; margin-top: 4px; }
.dr-street { margin: 12px 0; }
.dr-lots { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 8px; }
.dr-lot { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; text-align: center; min-width: 0; overflow-wrap: anywhere; }
.dr-lot.empty { border-style: dashed; background: transparent; }
.dr-lot.lm { background: #fff1c9; }
.dr-plaque { border: 2px solid var(--ink); border-radius: 10px; padding: 8px 10px; background: #f6ecd2; margin: 8px 0; }
`;
  const st = document.createElement('style'); st.id = 'draft-css'; st.textContent = css; document.head.appendChild(st);
})();
