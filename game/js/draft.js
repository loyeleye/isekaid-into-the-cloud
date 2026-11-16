// Architect's Draft (design doc, Build spec v4): an arena draft crossed with a town builder, for the exam's
// multiple-response questions ("Select TWO", "Select THREE"), with single-answer questions as one-slot jobs. It is set
// in Pingsby's Quarter (js/c2-world.js: the scrap field's north end, where Freya's delete markers stand over the old
// houses), on a screen of its own, not the walkable town. Ayo is the foreman (Coo runs the yard until Ayo is back,
// after chapter 5) and Sir Seymour Backups is the inspector.
//
// The loop: pick a client from three on the board (a client you pass on stays there, so you choose the order, never
// whether). Their scroll is the question's whole stem, free to read; its options are option cards, and you draft as
// many as it asks into the blueprint's slots. Seal it with Guess, Think so or Sure: the blueprint is judged as a whole,
// like the exam (every slot right, or it's wrong), with the shared stake table (right +1/+2/+3, wrong 0/−1/−3, as
// floors). No hint of any kind before the seal. After the verdict come the explanation and every card's "why not"
// line; a miss gets a free retry on its twin right away (Nov 16 review, Ladi's OK). Then the building's placement: you choose a plot
// (a ghost building under a delete marker) on the Quarter's own map, in at most four map actions, with a Map as list
// view one tap away. A blueprint with a wrong slot stands under scaffolding and its question goes on the Wall
// (js/today.js), so bringing that poster down (Monster Hunt or a Wall drill) finishes the building.
//
// Build orders (Nov 16 formats plan, Ladi's OK): every mode gets a way of asking of its own, so two of a session's
// six clients bring a build order instead of a scroll: a Sequence item from the formats engine (js/qformats.js, items
// in js/fmt-items-a.js), the steps to put in order with decoys mixed in. The other four are due bank questions, as
// slots. A build order is sealed with the same stakes and judged whole (every step in place). It isn't an exam
// question, so a miss doesn't go on the Wall: its building stands under scaffolding and the build order comes back
// first on a later night, and getting it right then takes the scaffolding off. The engine introduces the format the
// way it always does: the first build order is worked through and the second is practice, neither scored.
//
// Rules, one new one per night of play (v4: one new rule per night; scheduled play reaches nights 1 and 2 before
// Nov 30): night 1, clients, the draft, the seal and placement on six open plots. Night 2, materials: a building gets
// one for each neighbour of its own exam domain, and one buys a retry on an older scaffolded building's twin (two
// until Nov 16: the simulator found that made the riverside route best at every accuracy). Night 3,
// reputation: a standing building on a riverside plot earns it, and it brings a second tier of clients to the board. The travelling client
// and buying land wait until after the exam.
//
// The shared shell (js/modes.js) gives the mode picker, the stake table, question picking, calibration, the
// first-run walkthrough, pay, Pip's line and the simulator's answers. tools/modes_sim.js plays this mode's rules
// (SD.draft.sim) with fixed policies; tools/draft_check.js drives it at 375px.
//   SD.draft.open(preset)   the client board (preset: a topic-drill preset id, or none for every topic)
//   SD.draft.quarter()      Pingsby's Quarter, its map and its list
//   SD.draft.scaffoldFor(qid)  { client, building, floors } when that question's building is under scaffolding, else null
(function () {
  const DR = SD.draft = {};
  const S = SD.state, U = SD.ui, E = () => SD.exam, M = () => SD.modes || {};
  const esc = s => U.esc(s);
  const SESSION = 6, BOARD = 3, MAP_ACTIONS = 4, RETRY_COST = 1, TIER2_REP = 3, SEQ_PER = 2;
  const COLS = 5, ROWS = 6, RIVER = [2];   // the river runs below row 3, so row 3 is the riverside
  const CONF = ['Guess', 'Think so', 'Sure'];
  const today = () => new Date().toDateString();
  const sgn = n => (n > 0 ? '+' + n : n < 0 ? '−' + (-n) : '0');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  DR.SESSION = SESSION; DR.MAP_ACTIONS = MAP_ACTIONS; DR.RETRY_COST = RETRY_COST; DR.SEQ_PER = SEQ_PER;

  // ---- The cast ----
  // Ayo runs the yard once he's free (chapter 5 cleared); until then Coo does. Seymour inspects. Barks never state
  // a number or an AWS fact.
  const FOREMEN = {
    ayo: { name: 'Ayo', title: 'the foreman',
      intro: 'Pingsby\'s Quarter! Freya deleted it, so we build it back. Pick a client, read the whole scroll, build what it says. Not what they say. What it says. HA!',
      place: 'Where does it go? Put it with its own kind and they\'ll lend you materials.',
      river: 'By the river, the whole camp walks past it. Good for the name.',
      end: 'Good day\'s work. The forge stays lit.' },
    coo: { name: 'Postmaster Coo', title: 'running the yard',
      intro: 'Coo. Pingsby\'s Quarter, under delete markers, all of it. Clients are waiting. Read the whole scroll. Build what it says.',
      place: 'Coo. Every building needs an address. Pick one.',
      river: 'Coo. A riverside address. People will write.',
      end: 'Coo. Filed. Same again tomorrow.' }
  };
  DR.foremanId = () => (S.save && S.save.flags && S.save.flags.ch5 ? 'ayo' : 'coo');
  DR.foreman = () => FOREMEN[DR.foremanId()];
  const SEYMOUR = {
    name: 'Sir Seymour Backups',
    clean: 'HALT! ...I have checked it. And checked it again. It stands.',
    scaf: 'The scaffolding stays up. I don\'t sign for what I haven\'t seen hold on two different days.',
    retry: 'A second blueprint on the same rule? Bring it here. I\'ll inspect it. Thoroughly.',
    half: 'One signature on the permit. The other comes on another day. Those are the rules. I wrote them down. Twice.'
  };
  DR.SEYMOUR = SEYMOUR;
  // Clients. Tier 1 is on the board from the first night; tier 2 arrives with reputation (night 3). Coo joins tier 2
  // once Ayo has taken over the yard.
  DR.CLIENTS = {
    mira: { name: 'Mira', tier: 1, bld: 'infirmary', sign: 'WARD', roof: '#3a4157', wall: '#e8ebf0',
      arrive: 'Sit down. I\'ll tell you what I need, and then you\'ll build exactly that.',
      right: 'Good. Clean lines. Nothing I\'ll have to stitch later.',
      wrong: 'Hold still. That one\'s wrong, and I\'m going to show you where.',
      sure: 'You were sure. I hear that a lot from people on my table. Look again.' },
    seoyeon: { name: 'Seo-yeon', tier: 1, bld: 'gatehouse', sign: 'GATE', roof: '#8d1d29', wall: '#f2efe8',
      arrive: 'I would be honoured if you built this correctly. I mention it only once.',
      right: 'Acceptable. I will try not to look impressed.',
      wrong: 'How generous of you, leaving the door open. For everyone.',
      sure: 'Such certainty. It must be restful.' },
    dutch: { name: 'Dutch', tier: 1, bld: 'night office', sign: 'OFFICE', roof: '#24345e', wall: '#d8d4c8',
      arrive: 'Kid. One line in that scroll decides it. Find it before you build.',
      right: 'Huh. It holds. Don\'t let it go to your head.',
      wrong: 'Wrong door, kid. Read the scroll again. Slower.',
      sure: 'You went with your gut. I know how that ends. Sit down.' },
    kai: { name: 'Kai', tier: 1, bld: 'kitchen annex', sign: 'KITCHEN', roof: '#d84a3a', wall: '#f2efe6',
      arrive: 'I want it fast, I want it hot, and I wanted it yesterday. Yes, chef? Yes, chef.',
      right: 'Look at that. It doesn\'t even fall over when I lean on it.',
      wrong: 'That\'s not what I ordered. I\'ll fix it. ...No. You fix it.',
      sure: 'You plated that like it was perfect. It\'s raw in the middle.' },
    marrow: { name: 'Goodwife Marrow', tier: 2, bld: 'bell house', sign: 'BELL', roof: '#6a3a4a', wall: '#e8dcc4',
      arrive: 'I need a bell that rings for the right thing, and only the right thing.',
      right: 'That\'ll ring true. I can hear it already.',
      wrong: 'That would ring at the wrong hour. Half the camp would come running for nothing.',
      sure: 'Loud and wrong. That\'s the worst kind of bell.' },
    pip: { name: 'Pip', tier: 2, bld: 'lost and found', sign: 'FOUND', roof: '#3b8bff', wall: '#e6f4ff',
      arrive: 'Sorry to be a bother. Could it be a little building? For things that went missing?',
      right: 'Oh! It\'s just right. Why did that work?',
      wrong: 'Oh. I think something\'s missing. Sorry. I would know.',
      sure: 'You sounded so sure that I believed you too. Why didn\'t that work?' },
    coo: { name: 'Postmaster Coo', tier: 2, ayo: true, bld: 'post office', sign: 'POST', roof: '#c0503a', wall: '#efe2c6',
      arrive: 'Coo. Requirements, in writing. Delivered to you at least once.',
      right: 'Coo-ah. Every pigeonhole where I\'d have put it.',
      wrong: 'Coo. This goes back to the sender. That\'s you.',
      sure: 'You signed for that with great confidence. Coo. I keep the receipts.' }
  };
  const cl = id => DR.CLIENTS[id] || DR.CLIENTS.mira;
  const bldName = id => `${cl(id).name.replace(/^(Postmaster|Goodwife) /, '')}'s ${cl(id).bld}`;
  DR.buildingName = bldName;
  // The cast's PixelLab portraits (assets/img/portraits, credited in CREDITS.md), drawn straight from the files.
  const FACE = { mira: 'mira', seoyeon: 'seoyeon', dutch: 'dutch', kai: 'kai', marrow: 'marrow', pip: 'pip', coo: 'coo', ayo: 'ayo', seymour: 'seymour' };
  function portrait(who, size) {
    if (FACE[who] && !window.SD_VECTOR) return `<span class="bust dr-bust px" style="width:${size}px;height:${Math.round(size * 140 / 120)}px"><img src="assets/img/portraits/${FACE[who]}-neutral.webp" alt="" draggable="false"></span>`;
    try { return SD.art && SD.art.portrait ? SD.art.portrait(who, size) : ''; } catch (e) { return ''; }
  }
  // Exam domains on the map: a shape and a number, never colour alone.
  DR.SHAPE = { 1: '▲', 2: '■', 3: '●', 4: '◆' };
  const dom = d => `${DR.SHAPE[d] || '·'} D${d}`;
  const domName = d => (E().DOMAINS && E().DOMAINS[d]) || 'Domain ' + d;

  // ---- Save ----
  const sv = () => {
    const s = S.save;
    if (!s.draft || typeof s.draft !== 'object') s.draft = {};
    const d = s.draft;
    if (!d.town || typeof d.town !== 'object') d.town = {};
    if (!Array.isArray(d.nights)) d.nights = [];
    d.mat = d.mat | 0; d.rep = d.rep | 0;
    return d;
  };
  DR.save = sv;
  const persist = () => S.persist && S.persist();
  const find = id => E().find(id);

  // ---- Rules by night ----
  // Night n is the nth day a session was started. Each night opens at most one new rule.
  DR.level = () => Math.max(1, Math.min(3, sv().nights.length));
  DR.RULES = {
    2: { title: 'New tonight: materials', html: `<p class="small">A building now gets <b>🧱 materials</b> from its neighbours: one for each building of its own exam domain on a plot beside it (up, down, left or right).</p>
      <p class="small">Spend them on <b>retries</b> for older buildings still under scaffolding: from a building's plaque, ${plural(RETRY_COST, 'material')} ${RETRY_COST === 1 ? 'buys' : 'buy'} its twin question, a different scenario on the same rule. Get it right and it counts toward that poster. More land opens too.</p>` },
    3: { title: 'New tonight: reputation', html: `<p class="small">A building that stands on a riverside plot now earns <b>⭐ reputation</b>, because the whole camp walks past it. Scaffolding by the river earns none.</p>
      <p class="small">Reputation brings new clients: once you have enough, a second tier joins the board. The whole Quarter is open now.</p>` }
  };

  // ---- Questions ----
  const isMulti = q => q && q.type === 'multi' && Array.isArray(q.items);
  const isMc = q => q && q.type === 'mc' && Array.isArray(q.opts);
  DR.slotsOf = q => (isMulti(q) ? q.items.filter(i => i.ok).length : 1);
  DR.cards = q => (isMulti(q) ? q.items.map(i => i.t) : q.opts.slice());
  DR.cardOk = (q, i) => (isMulti(q) ? !!(q.items[i] && q.items[i].ok) : i === q.a);
  DR.cardNo = (q, i) => (isMulti(q) ? (q.items[i] && q.items[i].no) || '' : (Array.isArray(q.no) && q.no[i]) || '');
  const verified = q => !!(SD.topicDrill && SD.topicDrill.isVerified(q));
  // The Select hint shows beside the question, so the stem shows without it; nothing else is taken out.
  const HINT = /\s*\((?:Select|Choose) [A-Z]+\.?\)\s*$/i;
  DR.stem = q => ({ text: String(q.q).replace(HINT, ''), pick: (String(q.q).match(HINT) || [''])[0].trim().replace(/^\(|\)$/g, '') });
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

  // ---- Build orders: Sequence items from the formats engine ----
  DR.seqItems = () => (SD.fmtItems || []).filter(i => i && i.type === 'seq' && Array.isArray(i.steps) && i.steps.length > 1 && (i.tracks || []).includes('DVA-C02'));
  const seqFind = id => DR.seqItems().find(i => i.id === id) || null;
  DR.seqFind = seqFind;
  DR.canSeq = () => !!(SD.qf && SD.qf.ask && M().askFormat && DR.seqItems().length);
  DR.seqDom = i => Math.min(4, Math.max(1, parseInt(String((i && i.task && i.task.dva) || '3'), 10) || 3));
  const seqLog = () => { const d = sv(); if (!d.seq || typeof d.seq !== 'object') d.seq = {}; return d.seq; };
  DR.seqLog = seqLog;
  const norm = t => String(t || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  // A preset's build orders: those on its topics or its domain, else every one.
  function seqForPreset(preset) {
    const all = DR.seqItems(), p = preset && SD.topicDrill ? SD.topicDrill.preset(preset) : null;
    if (!p) return all;
    const tops = (p.topics || []).map(norm);
    const hit = all.filter(i => (tops.length && tops.some(t => norm(i.topic).startsWith(t) || t.startsWith(norm(i.topic)))) || (p.dom && DR.seqDom(i) === p.dom));
    return hit.length ? hit : all;
  }
  // Missed ones first (their buildings are under scaffolding), then never played, then the longest ago.
  DR.pickSeq = function (preset, n) {
    const log = seqLog(), rank = i => { const e = log[i.id]; return e && e.miss ? 0 : !e ? 1 : 2; };
    const pool = SD.quiz.shuffle(seqForPreset(preset));
    const missed = DR.seqItems().filter(i => log[i.id] && log[i.id].miss && !pool.includes(i));
    return missed.concat(pool).sort((a, b) => rank(a) - rank(b) || ((log[a.id] || {}).t | 0) - ((log[b.id] || {}).t | 0)).slice(0, n);
  };
  // Clients on the board tonight: tier 1, plus tier 2 once reputation is in play and earned.
  DR.clientsOpen = function () {
    const ayo = DR.foremanId() === 'ayo', t2 = DR.level() >= 3 && sv().rep >= TIER2_REP;
    return Object.keys(DR.CLIENTS).filter(id => { const c = DR.CLIENTS[id]; return (c.tier === 1 || t2) && (!c.ayo || ayo); });
  };
  // A session's contracts, from the shared picker (verified-only with the topic drill's fallback, due and
  // never-asked first, about one in four from other topics): multiple-response, plus one single-answer job, or more
  // when the preset has few multiple-response questions. Clients take turns, so the board never shows one twice
  // while there are three to show; a rebuilt question keeps its building's client.
  // Two of the six are build orders (when the formats engine and its items are loaded).
  DR.pickSession = function (preset, n) {
    n = n || SESSION;
    const seq = DR.canSeq() ? DR.pickSeq(preset, Math.min(SEQ_PER, n - 1)) : [];
    const nb = n - seq.length;
    const a = M().pick({ preset, n: nb - 1, filter: isMulti }).items;
    const b = M().pick({ preset, n: nb - a.length, filter: isMc, avoid: a.map(i => i.q) }).items;
    const open = SD.quiz.shuffle(DR.clientsOpen()), town = sv().town;
    let k = 0;
    const who = id => (town[id] ? town[id].client : open[k++ % open.length]);
    return SD.quiz.shuffle(a.concat(b).map(it => {
      const q = find(it.q); if (!q) return null;
      return { q: q.id, client: who(q.id), other: it.other || 0 };
    }).filter(Boolean).concat(seq.map(i => ({ q: i.id, seq: 1, client: who(i.id) }))));
  };
  const stake = (ok, conf) => M().stake(ok, conf);
  const stakes = () => M().STAKES;

  // ---- The map: plots, neighbours, the river ----
  const R = DR.rules = {
    COLS, ROWS, RIVER, N: COLS * ROWS,
    name: p => 'ABCDE'[p % COLS] + (Math.floor(p / COLS) + 1),
    riverside: p => RIVER.includes(Math.floor(p / COLS)),
    around: p => { const x = p % COLS, y = Math.floor(p / COLS), out = []; if (x > 0) out.push(p - 1); if (x < COLS - 1) out.push(p + 1); if (y > 0) out.push(p - COLS); if (y < ROWS - 1) out.push(p + COLS); return out; },
    // What building domain d on plot p earns, given grid (plot -> domain), tonight's rule level and whether it stands:
    // materials from same-domain neighbours; reputation from the riverside, only for a building that stands.
    gains(grid, p, d, level, stands) {
      const mat = level >= 2 ? R.around(p).filter(o => grid[o] === d).length : 0;
      const rep = level >= 3 && R.riverside(p) && stands !== false ? 1 : 0;
      return { mat, rep };
    }
  };
  // Buildings from before plots existed get the first free plots.
  function grid() {
    const town = sv().town, g = {}, list = Object.values(town).sort((a, b) => a.t - b.t);
    list.forEach(b => { if (b.plot != null && g[b.plot] == null) g[b.plot] = b; else b.plot = null; });
    return g;
  }
  DR.grid = grid;
  const domGrid = g => { const o = {}; Object.keys(g).forEach(p => { o[p] = g[p].d; }); return o; };
  // Open land by night: six plots round the river on night 1, rows 2 to 5 on night 2, all thirty from night 3.
  R.open = level => Array.from({ length: R.N }, (_, p) => p).filter(p => {
    const x = p % COLS, y = Math.floor(p / COLS);
    return level >= 3 || (level === 2 ? y >= 1 && y <= 4 : x >= 1 && x <= 3 && (y === 2 || y === 3));
  });
  DR.freePlots = () => { const g = grid(); return R.open(DR.level()).filter(p => !g[p]); };

  // ---- The Wall ----
  const wall = () => (Array.isArray(S.save.wall) ? S.save.wall : []);
  const twins = id => (SD.twins && SD.twins[id]) || [];
  DR.posterUp = function (qid) {
    const idea = [qid].concat(twins(qid));
    return wall().some(w => [w.id].concat(twins(w.id)).some(id => idea.includes(id)));
  };
  // Scaffolding comes down for good once the poster has: a later miss on the idea puts a new poster up, not new
  // scaffolding on the old building.
  function refresh() {
    const town = sv().town;
    const log = seqLog();
    Object.values(town).forEach(b => { if (b.scaf && !(b.seq ? !!(log[b.q] && log[b.q].miss) : DR.posterUp(b.q))) { b.scaf = false; b.done = Date.now(); b.fin = 1; } });
    return town;
  }
  DR.town = () => refresh();
  DR.scaffoldFor = function (qid) {
    const town = refresh(), idea = [qid].concat(twins(qid));
    const b = Object.values(town).find(x => x.scaf && [x.q].concat(twins(x.q)).some(id => idea.includes(id)));
    return b ? { client: cl(b.client).name, building: bldName(b.client), floors: b.floors } : null;
  };
  // A scaffolded building's twin, as a retry can ask it: a draftable question, never the building's own.
  DR.twinFor = function (qid) {
    const q = find(qid); if (!q || !SD.qtwin) return null;
    const avoid = [qid];
    for (let i = 0; i < 4; i++) {
      const t = SD.qtwin(q, { avoid });
      if (!t) return null;
      if (isMulti(t) || isMc(t)) return t;
      avoid.push(t.id);
    }
    return null;
  };
  DR.canRetry = qid => { const b = sv().town[qid]; return !!(b && b.scaf && DR.level() >= 2 && sv().mat >= RETRY_COST && DR.twinFor(qid)); };

  // ---- The run ----
  DR.run = () => { const r = sv().run; return r && Array.isArray(r.items) ? r : null; };
  DR.status = function () {
    const r = DR.run(), town = Object.values(refresh());
    if (r) { const done = r.items.filter(i => i.done).length; return `Resume · client ${Math.min(done + 1, r.items.length)} of ${r.items.length}`; }
    return town.length ? `${plural(town.filter(b => !b.scaf).length, 'building')} standing in Pingsby's Quarter` : null;
  };
  function newRun(preset) {
    const d = sv();
    if (d.nights[d.nights.length - 1] !== today()) d.nights.push(today());
    if (d.nights.length > 30) d.nights.splice(0, d.nights.length - 30);
    const items = DR.pickSession(preset);
    return (d.run = { preset: preset || null, items, tally: M().newTally(), floors: 0, misses: 0, sure: 0, mat: 0, rep: 0, t0: Date.now(), qMs: 0, mapMs: 0, open: null, since: '', level: DR.level() });
  }

  // Where to go: a retry or a placement in progress first, then the open contract, then the board.
  DR.open = async function (preset) {
    const d = sv();
    if (d.retry) return contract(d.retry, retryDone);
    let r = DR.run();
    if (d.placing && (find(d.placing.q) || seqFind(d.placing.q)) && d.town[d.placing.q]) return place(d.placing.q);
    if (r && preset !== undefined && preset !== null && r.preset !== preset && !r.items.some(i => i.done)) r = null;
    if (!r) {
      await walkthrough();
      const before = DR.level();
      r = newRun(preset);
      persist();
      if (DR.level() > before && DR.RULES[DR.level()]) await newRule(DR.level());
    }
    if (!r.items.length) return empty();
    if (r.open != null && r.items[r.open] && !r.items[r.open].done) return contract(r.items[r.open], sessionDone);
    board();
  };
  function newRule(n) {
    return new Promise(res => {
      const b = U.panel(`${portrait(DR.foremanId(), 56)}${DR.RULES[n].html}<button class="primary" id="dr-rule">Got it</button>`, { title: DR.RULES[n].title.toUpperCase(), cls: 'dr-win', noClose: true });
      b.querySelector('#dr-rule').onclick = res;
    });
  }
  function empty() {
    const b = U.panel(`<p>No clients have work for this topic yet. Try another preset, or every topic.</p><div class="row"><button class="primary" id="dr-any">Every topic</button><button class="ghost" id="dr-x">Close</button></div>`, { title: 'ARCHITECT\'S DRAFT' });
    sv().run = null; persist();
    b.querySelector('#dr-any').onclick = () => DR.open(null);
    b.querySelector('#dr-x').onclick = U.closePanel;
  }
  function presetName(r) {
    const p = r.preset && SD.topicDrill ? SD.topicDrill.preset(r.preset) : null;
    return p ? p.name : 'Every topic';
  }
  const resChips = () => {
    const d = sv(), lv = DR.level();
    return `${lv >= 2 ? `<span class="chip">🧱 Materials: ${d.mat}</span>` : ''}${lv >= 3 ? `<span class="chip">⭐ Reputation: ${d.rep}</span>` : ''}`;
  };

  // The client board: the first three unbuilt contracts, each a client. Pass on one and it stays.
  function board() {
    const r = DR.run();
    if (!r) return DR.quarter();
    const left = r.items.map((it, i) => [it, i]).filter(([it]) => !it.done);
    if (!left.length) return results();
    const done = r.items.length - left.length, F = DR.foreman();
    const cards = left.slice(0, BOARD).map(([it, i]) => {
      if (it.seq) return seqCard(it, i);
      const q = find(it.q); if (!q) return '';
      const c = cl(it.client), n = DR.slotsOf(q), d = E().domainOf(q) || 1;
      return `<button class="opt dr-contract" data-k="${i}">
        <span class="dr-who">${portrait(it.client, 44)}<span><b>${esc(c.name)}</b><br><span class="small muted">wants a ${esc(c.bld)}${sv().town[q.id] ? ' rebuilt' : ''}</span></span></span>
        <span class="small dr-bark">"${esc(c.arrive)}"</span>
        <span class="chips"><span class="chip">${esc(dom(d))} · ${esc(domName(d))}</span><span class="chip">${n === 1 ? 'one card' : `choose ${n}`}</span><span class="chip">${verified(q) ? '✓ Verified' : 'Not verified yet'}</span></span></button>`;
    }).join('');
    const waiting = left.length - Math.min(BOARD, left.length);
    const host = done ? '' : `<div class="dr-client">${portrait(DR.foremanId(), 44)}<p class="small" data-vo="${esc(DR.foremanId() + '|' + F.intro)}"><b>${esc(F.name)}:</b> "${esc(F.intro)}"</p></div>`;
    const b = U.panel(`${host}${r.since ? `<p class="small dr-since">${esc(r.since)}</p>` : ''}
      <div class="dr-head"><span class="chip">${esc(presetName(r))}</span><span class="chip">Client ${done + 1} of ${r.items.length}</span><span class="chip">🏗 Floors today: ${sgn(r.floors)}</span>${resChips()}</div>
      <p class="small muted">Pick a client. The ones you pass on stay on the board until you've built for them, so you choose the order, not whether.</p>
      <div class="opts">${cards}</div>
      ${waiting ? `<p class="small muted">${plural(waiting, 'more client')} waiting behind these.</p>` : ''}
      <div class="row"><button class="ghost" id="dr-quarter">🏘 Pingsby's Quarter</button><button class="ghost" id="dr-stop">Stop for now</button></div>`, { title: 'ARCHITECT\'S DRAFT', cls: 'dr-win' });
    b.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { r.open = +el.dataset.k; r.since = ''; persist(); contract(r.items[r.open], sessionDone); });
    b.querySelector('#dr-quarter').onclick = () => DR.quarter(board);
    b.querySelector('#dr-stop').onclick = stop;
  }
  function stop() { persist(); U.closePanel(); if (SD.today && SD.today.render) SD.today.render(); }

  // One contract: the client, the whole scroll, the slots, the cards and the seal. No hint before the seal.
  // it: { q, client, pick: [card indices], retry?: { poster } }. done(it, verdict) runs after the seal.
  function contract(it, done) {
    if (it.seq) return seqContract(it, done);
    const q = find(it.q), r = DR.run();
    if (!q) { it.done = 1; if (r) r.open = null; if (it.retry) sv().retry = null; persist(); return it.retry ? retryBack(it) : board(); }
    const c = cl(it.client), n = DR.slotsOf(q), cards = DR.cards(q), stem = DR.stem(q);
    it.pick = (it.pick || []).filter(i => i >= 0 && i < cards.length).slice(0, n);
    const t0 = Date.now();
    if (S.seeConcept && conceptOf(q)) S.seeConcept(conceptOf(q));
    function render() {
      const full = it.pick.length === n, st = stakes();
      const slotH = Array.from({ length: n }, (_, s) => {
        const ci = it.pick[s];
        return ci == null ? `<div class="dr-slot empty"><span class="q-ctx">Slot ${s + 1}</span><span class="small muted">Empty: tap a card below</span></div>`
          : `<button class="dr-slot" data-s="${s}" aria-label="Slot ${s + 1}: ${esc(cards[ci])}. Tap to take it back"><span class="q-ctx">Slot ${s + 1} · tap to take back</span><span class="small">${esc(cards[ci])}</span></button>`;
      }).join('');
      const cardH = cards.map((t, i) => {
        const at = it.pick.indexOf(i);
        return `<button class="opt dr-card${at >= 0 ? ' on' : ''}" data-i="${i}" aria-pressed="${at >= 0}">${at >= 0 ? `<span class="chip">In slot ${at + 1}</span> ` : ''}${esc(t)}</button>`;
      }).join('');
      const b = U.panel(`<p class="small dr-for"><b>${esc(c.name)}</b> <span class="muted">· ${esc(c.bld)} · ${esc(dom(E().domainOf(q) || 1))}${it.retry ? ' · retry on its twin' : ''}</span></p>
        <div class="q-ctx">The requirements scroll · ${n === 1 ? 'one card' : `choose ${n}`}</div>
        ${q.ev ? `<pre class="q-ev">${esc(q.ev)}</pre>` : ''}
        <p class="q-q dr-q">${esc(stem.text)}${stem.pick ? ` <span class="dr-pick">${esc(stem.pick)}</span>` : ''}</p>
        <div class="q-ctx">Blueprint</div><div class="dr-slots">${slotH}</div>
        <div class="q-ctx">Option cards</div><div class="opts dr-cards">${cardH}</div>
        <div class="conf"><span class="muted small">${full ? 'Seal the blueprint. How sure are you? It\'s judged as a whole: every slot right, or it\'s wrong.' : `Fill ${plural(n - it.pick.length, 'more slot')} to seal.`}</span><div class="conf-b">
          ${CONF.map((t, i) => `<button data-c="${i}" ${full ? '' : 'disabled'}>${t}<small class="stake"><span class="up">${sgn(st[i][0])}</span> / <span class="dn">${sgn(st[i][1])}</span></small></button>`).join('')}</div></div>
        <div class="row">${it.retry ? '' : '<button class="ghost" id="dr-back">Back to the board</button>'}<button class="ghost" id="dr-stop">Stop for now</button></div>`, { title: it.retry ? 'ARCHITECT\'S DRAFT · RETRY' : 'ARCHITECT\'S DRAFT · CONTRACT', cls: 'dr-win', noClose: true });
      b.querySelectorAll('[data-s]').forEach(el => el.onclick = () => { it.pick.splice(+el.dataset.s, 1); persist(); render(); });
      b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        const i = +el.dataset.i, at = it.pick.indexOf(i);
        if (at >= 0) it.pick.splice(at, 1);
        else if (it.pick.length < n) it.pick.push(i);
        else it.pick[n - 1] = i;   // all slots full: the new card swaps into the last slot
        persist(); render();
      });
      b.querySelectorAll('[data-c]').forEach(el => el.onclick = () => seal(+el.dataset.c));
      // Leaving the contract keeps it on the board, cards and all: nothing can be dodged.
      const bk = b.querySelector('#dr-back'); if (bk) bk.onclick = () => { r.open = null; persist(); board(); };
      b.querySelector('#dr-stop').onclick = stop;
    }
    function seal(conf) {
      const per = it.pick.map(i => ({ i, ok: DR.cardOk(q, i) }));
      const allOk = per.length === n && per.every(x => x.ok);
      const run = DR.run();
      // Judged as a whole, like the exam: one stake, one calibration entry, a question.
      const delta = stake(allOk, conf);
      if (run) M().note(run.tally, allOk, conf);
      const wrong = per.filter(x => !x.ok).length;
      const ms = Date.now() - t0;
      // The question as a whole is right only when every slot is, as on the exam.
      const cid = conceptOf(q);
      if (cid) S.recordAnswer(cid, allOk, conf, ms, q.id);
      const poster = it.retry ? it.retry.poster : null;
      // Every miss goes up, not only Sure ones: a building with a wrong slot stays under scaffolding until its poster
      // comes down. A retry counts toward the building's own poster and never puts up another.
      if (SD.today.wallSettle) SD.today.wallSettle(q.id, allOk, conf, poster, !!poster);
      if (!allOk && conf < 2 && !poster) M().sureMiss(q.id);
      const town = sv().town, key = poster || q.id, prev = town[key], d = prev ? prev.d : (E().domainOf(q) || 1);
      const floors = Math.max(0, (prev ? prev.floors : 0) + delta);
      const cracks = (prev ? prev.cracks | 0 : 0) + (conf === 2 && !allOk ? 1 : 0);
      const scaf = poster ? DR.posterUp(poster) : (!allOk || (prev && prev.scaf && DR.posterUp(q.id)) || false);
      town[key] = Object.assign({}, prev || {}, { q: key, d, client: prev ? prev.client : it.client, floors, cracks, scaf, t: prev ? prev.t : Date.now(), last: Date.now(), idea: prev && prev.idea ? prev.idea : DR.ideaOf(q), plot: prev ? prev.plot : null });
      if (!scaf && prev && prev.scaf) town[key].fin = 1;
      if (run) { run.floors += delta; run.qMs = (run.qMs | 0) + ms; if (!allOk && !poster) run.misses++; if (!allOk && conf === 2 && !poster) run.sure++; if (poster && !it.paid) run.retries = (run.retries | 0) + 1; }
      Object.assign(it, { done: 1, ok: allOk ? 1 : 0, conf, d: delta, slots: it.pick.slice(), wrong, ms });
      if (run && !poster) run.open = null;
      persist();
      inspect(q, it, per, conf, delta, town[key], () => done(it, town[key]));
    }
    render();
  }
  // ---- A build order: a Sequence item through the formats engine ----
  function seqCard(it, i) {
    const x = seqFind(it.q); if (!x) return '';
    const c = cl(it.client), d = DR.seqDom(x), log = seqLog()[x.id];
    return `<button class="opt dr-contract dr-seqc" data-k="${i}">
        <span class="dr-who">${portrait(it.client, 44)}<span><b>${esc(c.name)}</b><br><span class="small muted">wants a ${esc(c.bld)}${sv().town[x.id] ? ' rebuilt' : ''}</span></span></span>
        <span class="small dr-bark">"${esc(c.arrive)}"</span>
        <span class="chips"><span class="chip">${esc(dom(d))} · ${esc(domName(d))}</span><span class="chip">📐 build order · ${x.steps.length} steps</span>${log && log.miss ? '<span class="chip">🚧 back to finish</span>' : ''}</span></button>`;
  }
  // The engine draws the item, takes the confidence and shows the explanation and every decoy's "why not" line. Its
  // first two build orders are worked and practice (not scored); after that, each is scored like a blueprint.
  async function seqContract(it, done) {
    const x = seqFind(it.q), r = DR.run();
    const bail = () => { it.done = 1; it.practice = 1; if (r) r.open = null; persist(); board(); };
    if (!x || !DR.canSeq()) return bail();
    const c = cl(it.client), t0 = Date.now();
    // The shell's wrapper passes the stakes and notes a scored answer in the run's calibration tally.
    const res = await M().askFormat(x, { title: 'ARCHITECT\'S DRAFT · BUILD ORDER', context: `${c.name} · ${c.bld} · the build order`, tally: r ? r.tally : null });
    if (!res) return bail();
    const log = seqLog(), e = log[x.id] = Object.assign({ n: 0 }, log[x.id] || {});
    e.n++; e.t = Date.now();
    if (!res.scored) {
      Object.assign(it, { done: 1, practice: 1, ms: Date.now() - t0 });
      if (r) { r.open = null; r.since = `Since your last move: ${c.name}'s build order was ${res.mode === 'worked' ? 'worked through for you' : 'a practice round'}, not scored. Build orders count from the next one on.`; }
      persist();
      return board();
    }
    const ok = !!res.ok, conf = res.conf, delta = res.pts, ms = Date.now() - t0;
    e.miss = ok ? 0 : 1; e.ok = ok ? 1 : 0;
    const town = sv().town, prev = town[x.id];
    const floors = Math.max(0, (prev ? prev.floors : 0) + delta);
    const cracks = (prev ? prev.cracks | 0 : 0) + (conf === 2 && !ok ? 1 : 0);
    // Like a blueprint: a miss stands under scaffolding; a scaffolded one comes free when the build order holds.
    // A building already standing keeps standing after a later miss; the build order just comes back.
    const scaf = prev ? !!prev.scaf && !ok : !ok;
    town[x.id] = Object.assign({}, prev || {}, { q: x.id, seq: 1, d: prev ? prev.d : DR.seqDom(x), client: prev ? prev.client : it.client, floors, cracks, scaf, t: prev ? prev.t : Date.now(), last: Date.now(), idea: x.title || 'A build order', plot: prev ? prev.plot : null });
    if (!scaf && prev && prev.scaf) { town[x.id].fin = 1; town[x.id].done = Date.now(); }
    if (r) { r.floors += delta; r.qMs = (r.qMs | 0) + ms; if (!ok) r.seqMiss = (r.seqMiss | 0) + 1; if (!ok && conf === 2) r.sure++; r.open = null; }
    Object.assign(it, { done: 1, ok: ok ? 1 : 0, conf, d: delta, ms, partial: res.partial });
    persist();
    seqInspect(x, it, conf, delta, town[x.id], () => done(it, town[x.id]));
  }
  function seqInspect(x, it, conf, delta, bld, next) {
    const c = cl(it.client), ok = !!it.ok, n = x.steps.length;
    const inPlace = it.partial != null ? Math.round(it.partial * n) : ok ? n : 0;
    const line = ok ? c.right : conf === 2 ? c.sure : c.wrong;
    const sey = ok ? SEYMOUR.clean : SEYMOUR.scaf;
    const h = `<div class="verdict-row"><div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? '🏛 IT HOLDS' : '🚧 SCAFFOLDING'}</div><span class="chip">${CONF[conf]}</span><span class="chip">${sgn(delta)} floors</span></div>
      <div class="dr-result"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><div>
      <p class="small"><b>${esc(bldName(bld.client))}</b>: ${plural(bld.floors, 'floor')}${bld.scaf ? ', under scaffolding' : ', standing'}.</p>
      <p class="small" data-vo="${esc(it.client + '|' + line)}"><b>${esc(c.name)}:</b> "${esc(line)}"</p>
      <div class="dr-who">${portrait('seymour', 36)}<p class="small" data-vo="${esc('seymour|' + sey)}"><b>Seymour:</b> "${esc(sey)}"</p></div></div></div>
      <p class="small muted">A build order scores as a whole: ${ok ? 'every step in place' : `${inPlace} of ${n} steps in place, and with any step out of place it doesn't count`}${!ok && conf === 2 ? ', and a Sure miss cracks the wall' : ''}.</p>
      ${!ok ? `<p class="small dr-wallnote">📐 ${bld.scaf ? 'This build order comes back first on a later night. Get it right then and the scaffolding comes off.' : 'The building already stood, so it keeps standing. The build order comes back on a later night.'}</p>` : ''}
      <button class="primary" id="dr-next">${bld.plot == null ? 'Place the building' : 'Continue'}</button>`;
    const b = U.panel(h, { title: 'INSPECTION', cls: 'dr-win', noClose: true });
    const cv = b.querySelector('.dr-cv'); if (cv && SD.draftArt) SD.draftArt.building(cv, { client: c, floors: bld.floors, scaf: bld.scaf, cracks: bld.cracks });
    b.querySelector('#dr-next').onclick = next;
  }

  // After a session contract: a new building goes to placement; a rebuilt one is already on its plot.
  function sessionDone(it, bld) {
    const r = DR.run();
    if (bld.plot == null) sv().placing = { q: bld.q, sel: null, acts: 0, ms: 0 };
    persist();
    if (it.retryNow) return freeRetry(bld.q);
    if (bld.plot == null) return place(bld.q);
    if (r) r.since = `Since your last move: ${bldName(bld.client)} on ${R.name(bld.plot)} ${bld.scaf ? 'is under scaffolding' : 'stands'}, ${plural(bld.floors, 'floor')}.`;
    persist(); board();
  }
  // The free retry: right after a missed blueprint, its twin, every night. Then the building goes to placement.
  function freeRetry(qid) {
    const b = sv().town[qid], t = DR.twinFor(qid);
    if (!b || !t) return b && b.plot == null ? place(qid) : board();
    sv().retry = { q: t.id, client: b.client, pick: [], retry: { poster: qid }, back: 'place' };
    persist();
    contract(sv().retry, retryDone);
  }
  // A retry on an older scaffolded building's twin, from its plaque, paid for in materials. It stays open (and
  // saved) until it's sealed.
  DR.retry = function (qid, back) {
    const b = sv().town[qid];
    if (!DR.canRetry(qid)) return false;
    const t = DR.twinFor(qid);
    sv().mat -= RETRY_COST;
    sv().retry = { q: t.id, client: b.client, pick: [], retry: { poster: qid }, paid: 1, back: back === board ? 'board' : 'quarter' };
    persist();
    contract(sv().retry, retryDone);
    return true;
  };
  function retryDone(it, bld) {
    const r = DR.run();
    sv().retry = null;
    if (it.back === 'place' && sv().placing && sv().placing.q === bld.q) { persist(); return place(bld.q); }
    const line = !bld.scaf ? `Since your last move: the twin held and the poster came down, so ${bldName(bld.client)} stands.` : it.ok ? `Since your last move: the twin held. ${SEYMOUR.half}` : `Since your last move: the twin didn't hold. ${bldName(bld.client)} keeps its scaffolding.`;
    if (r) r.since = line;
    persist();
    retryBack(it, line);
  }
  function retryBack(it, line) { if (it.back === 'board' && DR.run()) return board(); DR.quarter(DR.run() ? board : null, line); }

  // Inspection: the verdict per slot, the client's and Seymour's word, the explanation, every card's "why not" line
  // and the question's sources (era notes included).
  function inspect(q, it, per, conf, delta, bld, next) {
    const c = cl(it.client), cards = DR.cards(q), allOk = !!it.ok;
    const line = allOk ? c.right : conf === 2 ? c.sure : c.wrong;
    const slotRows = per.map((x, s) => `<li class="${x.ok ? 'ok' : 'bad'}">${x.ok ? '✓ Right' : '✗ Wrong'} · slot ${s + 1}: <b>${esc(cards[x.i])}</b></li>`).join('');
    const right = cards.map((t, i) => i).filter(i => DR.cardOk(q, i));
    const mine = per.filter(x => !x.ok).map(x => x.i);
    const missed = right.filter(i => !it.slots.includes(i));
    const left = cards.map((t, i) => i).filter(i => !it.slots.includes(i) && !DR.cardOk(q, i));
    const notLi = i => `<li><b>${esc(cards[i])}</b><br>Not here, because ${esc(lower(DR.cardNo(q, i) || 'it doesn\'t meet the scroll.'))}</li>`;
    const sey = it.retry ? (allOk ? (bld.scaf ? SEYMOUR.half : SEYMOUR.clean) : SEYMOUR.scaf) : allOk ? SEYMOUR.clean : SEYMOUR.scaf;
    let h = `<div class="verdict-row"><div class="verdict ${allOk ? 'ok' : 'bad'}">${allOk ? '🏛 IT HOLDS' : '🚧 SCAFFOLDING'}</div><span class="chip">${CONF[conf]}</span><span class="chip">${sgn(delta)} floors</span></div>
      <div class="dr-result"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><div>
      <p class="small"><b>${esc(bldName(bld.client))}</b>: ${plural(bld.floors, 'floor')}${bld.scaf ? ', under scaffolding' : ', standing'}.</p>
      <p class="small" data-vo="${esc(it.client + '|' + line)}"><b>${esc(c.name)}:</b> "${esc(line)}"</p>
      <div class="dr-who">${portrait('seymour', 36)}<p class="small" data-vo="${esc('seymour|' + sey)}"><b>Seymour:</b> "${esc(sey)}"</p></div></div></div>
      <ul class="dr-slotres small">${slotRows}</ul>
      <p class="small muted">The blueprint scores as a whole, like the exam: ${allOk ? 'every slot right' : 'one wrong slot and it doesn\'t count'}${!allOk && conf === 2 ? ', and a Sure miss cracks the wall' : ''}.</p>`;
    if (!allOk) h += `<div class="q-ctx">The scroll needed</div><ul class="small dr-need">${right.map(i => `<li>${esc(cards[i])}</li>`).join('')}</ul>
      <p class="small dr-wallnote">📌 ${bld.scaf ? 'Its question is on the Wall. Bring that poster down (capture it in Monster Hunt, or in a Wall drill) and the scaffolding comes off.' : 'Its poster is already down, so the building still stands.'}</p>`;
    h += `<div class="why"><p>${esc(q.why || '')}</p></div>`;
    h += '<div class="nots">';
    if (mine.length) h += `<div class="mypick"><div class="q-ctx">Why your card doesn't fit</div>${mine.map(i => `<p><b>${esc(cards[i])}</b><br>${esc(DR.cardNo(q, i) || 'It doesn\'t meet the scroll.')}</p>`).join('')}</div>`;
    if (missed.length) h += `<div class="q-ctx">The card${missed.length > 1 ? 's' : ''} you left out</div><ul>${missed.map(i => `<li><b>${esc(cards[i])}</b></li>`).join('')}</ul>`;
    if (left.length) h += `<div class="q-ctx">Inspection: the cards left on the table</div><ul>${left.map(notLi).join('')}</ul>`;
    // A missed blueprint gets its twin, free, right away (when it has one).
    const twin = !allOk && !it.retry && DR.twinFor(bld.q);
    const nextLabel = it.retry ? (it.back === 'place' ? 'Place the building' : 'Continue') : bld.plot == null ? 'Place the building' : 'Continue';
    h += '</div>' + sourceBlock(q) + (twin ? `<div class="dr-retry"><p class="small"><b data-vo="${esc('seymour|' + SEYMOUR.retry)}">Seymour:</b> "${esc(SEYMOUR.retry)}" Its twin is a different scenario on the same rule, free.</p><div class="row"><button class="primary" id="dr-twin">Retry its twin now</button><button class="ghost" id="dr-next">${nextLabel}</button></div></div>` : `<button class="primary" id="dr-next">${nextLabel}</button>`);
    const b = U.panel(h, { title: 'INSPECTION', cls: 'dr-win', noClose: true });
    const cv = b.querySelector('.dr-cv'); if (cv && SD.draftArt) SD.draftArt.building(cv, { client: c, floors: bld.floors, scaf: bld.scaf, cracks: bld.cracks });
    b.querySelector('#dr-next').onclick = next;
    const tw = b.querySelector('#dr-twin'); if (tw) tw.onclick = () => { it.retryNow = 1; next(); };
  }
  const lower = s => String(s).replace(/^[A-Z](?=[a-z ])/, ch => ch.toLowerCase());
  // The question's AWS docs, its verified record and its era note (as js/quiz.js shows them for topic drills).
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

  // ---- Placement: the Quarter's map, on its own screen, never beside a question ----
  // Each tap on a plot is a map action and shows what that plot would earn; the build is the last one. At most
  // MAP_ACTIONS a building: after three looks, only the chosen plot can be built on. Saved after every action.
  function place(qid) {
    const d = sv(), P = d.placing, bld = d.town[qid], r = DR.run();
    if (!P || !bld) { d.placing = null; persist(); return board(); }
    const g = grid(), free = DR.freePlots(), lv = DR.level(), F = DR.foreman();
    const t0 = Date.now();
    if (!free.length) {
      // No land left: the building waits on the books (buying land comes after the exam).
      d.placing = null; if (r) r.since = `Since your last move: ${bldName(bld.client)} is on the books. Every plot is built on.`; persist();
      return board();
    }
    const gain = p => R.gains(domGrid(g), p, bld.d, lv, !bld.scaf);
    const gainTxt = p => {
      const x = gain(p), out = [];
      if (lv >= 2) out.push(`+${x.mat} 🧱`);
      if (lv >= 3) out.push(`+${x.rep} ⭐`);
      return out.join(' ');
    };
    // What tomorrow's rule would pay here, so a night-1 or night-2 placement points ahead.
    const ahead = p => {
      if (lv >= 3) return '';
      const x = R.gains(domGrid(g), p, bld.d, lv + 1, !bld.scaf), v = lv + 1 === 2 ? x.mat : x.rep;
      return ` · From tomorrow: +${v} ${lv + 1 === 2 ? '🧱' : '⭐'} here`;
    };
    const desc = p => {
      const nb = R.around(p).map(o => g[o]).filter(Boolean);
      const same = nb.filter(b => b.d === bld.d).length;
      return `${R.name(p)}${R.riverside(p) ? ' · by the river' : ''} · ${nb.length ? `next to ${plural(nb.length, 'building')}, ${same} of them ${dom(bld.d)}` : 'no neighbours yet'}${lv >= 2 ? ' · ' + gainTxt(p) : ''}${ahead(p)}`;
    };
    function render() {
      const list = !!P.list, sel = P.sel, locked = P.acts >= MAP_ACTIONS - 1;
      const pv = sel != null ? `<p class="small dr-preview" aria-live="polite"><b>Chosen:</b> ${esc(desc(sel))}</p>` : '<p class="small muted dr-preview">Tap a ghost building under a delete marker to see what that plot earns.</p>';
      let body;
      if (list) {
        body = `<ul class="dr-plist">${free.map(p => `<li><button class="dr-prow${p === sel ? ' on' : ''}" data-p="${p}" ${locked && p !== sel ? 'disabled' : ''} aria-pressed="${p === sel}">${esc(desc(p))}</button></li>`).join('')}</ul>
          <p class="small muted">${plural(Object.keys(g).length, 'plot')} built on${R.N - R.open(lv).length ? `, ${R.N - R.open(lv).length} open on later nights` : ''}.</p>`;
      } else body = mapHtml(g, { sel, locked, bld, open: R.open(lv) });
      const b = U.panel(`<div class="dr-client">${portrait(DR.foremanId(), 44)}<p class="small"><b>${esc(F.name)}:</b> "${esc(lv >= 3 ? F.river : F.place)}"</p></div>
        <div class="dr-head"><span class="chip">Placing: ${esc(bldName(bld.client))} · ${esc(dom(bld.d))}${bld.scaf ? ' · 🚧' : ''}</span><span class="chip">Map actions: ${P.acts} of ${MAP_ACTIONS}</span>${resChips()}</div>
        <div class="row dr-view"><button class="ghost${list ? '' : ' on'}" id="dr-vmap" aria-pressed="${!list}">Map</button><button class="ghost${list ? ' on' : ''}" id="dr-vlist" aria-pressed="${list}">Map as list</button></div>
        ${body}${pv}
        ${locked && sel != null ? `<p class="small muted">Seymour is tapping his clipboard. Build on ${esc(R.name(sel))}.</p>` : ''}
        <div class="row"><button class="primary" id="dr-build" ${sel == null ? 'disabled' : ''}>Build here</button><button class="ghost" id="dr-stop">Stop for now</button></div>`, { title: 'PINGSBY\'S QUARTER · PLACE IT', cls: 'dr-win', noClose: true });
      b.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const p = +el.dataset.p;
        if (p === sel || P.acts >= MAP_ACTIONS - 1 || g[p]) return;
        P.sel = p; P.acts++; tick(); persist(); render();
      });
      b.querySelector('#dr-vmap').onclick = () => { P.list = 0; persist(); render(); };
      b.querySelector('#dr-vlist').onclick = () => { P.list = 1; persist(); render(); };
      b.querySelector('#dr-build').onclick = build;
      b.querySelector('#dr-stop').onclick = () => { tick(); persist(); stop(); };
      drawMap(b, g, bld);
    }
    let last = t0;
    function tick() { const now = Date.now(); P.ms = (P.ms | 0) + (now - last); last = now; }
    function build() {
      const p = P.sel; if (p == null || g[p]) return;
      P.acts++; tick();
      const x = gain(p);
      bld.plot = p;
      d.mat += x.mat; d.rep += x.rep;
      const log = d.mapLog = Array.isArray(d.mapLog) ? d.mapLog : [];
      log.push({ q: qid, t: Date.now(), plot: p, acts: P.acts, ms: P.ms, mat: x.mat, rep: x.rep });
      if (log.length > 300) log.splice(0, log.length - 300);
      if (r) {
        r.mapMs = (r.mapMs | 0) + P.ms; r.mat += x.mat; r.rep += x.rep; (r.built = r.built || []).push(qid);
        const got = [x.mat ? `+${x.mat} 🧱` : '', x.rep ? `+${x.rep} ⭐` : ''].filter(Boolean).join(', ');
        r.since = `Since your last move: ${bldName(bld.client)} went up on ${R.name(p)}${R.riverside(p) ? ' by the river' : ''}${bld.scaf ? ', under scaffolding' : ''}${got ? ', ' + got : ''}.`;
      }
      d.placing = null;
      persist();
      board();
    }
    render();
  }
  // The map: five columns, six rows, the river between rows three and four. Built plots show their building, their
  // domain's shape and number, and a word for scaffolding; empty ones are ghost buildings under delete markers.
  function mapHtml(g, o) {
    o = o || {};
    let h = '<div class="dr-map" role="grid" aria-label="Pingsby\'s Quarter">';
    for (let y = 0; y < ROWS; y++) {
      if (y === RIVER[0] + 1) h += '<div class="dr-river" aria-hidden="true">〰 the river 〰</div>';
      h += '<div class="dr-mrow" role="row">';
      for (let x = 0; x < COLS; x++) {
        const p = y * COLS + x, b = g[p], name = R.name(p), riv = R.riverside(p);
        if (b) h += `<button class="dr-plot built${b.scaf ? ' scaf' : ''}${o.tonight && o.tonight.includes(b.q) ? ' tonight' : ''}" role="gridcell" data-bq="${esc(b.q)}" ${o.interactive ? '' : 'tabindex="-1"'} aria-label="${esc(name)}: ${esc(bldName(b.client))}, ${b.scaf ? 'under scaffolding' : 'standing'}, domain ${b.d}"><canvas class="dr-pcv" data-q="${esc(b.q)}" aria-hidden="true"></canvas><span class="dr-ptag">${o.tonight && o.tonight.includes(b.q) ? '✦ ' : ''}${esc(DR.SHAPE[b.d])}${b.d}${b.scaf ? ' 🚧' : ''}</span></button>`;
        else if (o.open && !o.open.includes(p)) h += `<div class="dr-plot lockd" role="gridcell" aria-label="${esc(name)}: opens on a later night"><span class="dr-lk" aria-hidden="true">🔒</span><span class="dr-ptag">${esc(name)}</span></div>`;
        else h += `<button class="dr-plot ghost${o.sel === p ? ' on' : ''}${riv ? ' riv' : ''}" role="gridcell" data-p="${p}" ${o.locked && o.sel !== p ? 'disabled' : ''} ${o.view ? 'tabindex="-1"' : ''} aria-label="${esc(name)}${riv ? ', by the river' : ''}: empty, a ghost under a delete marker" aria-pressed="${o.sel === p}"><canvas class="dr-pcv" data-ghost="1" aria-hidden="true"></canvas><span class="dr-ptag">${esc(name)}${o.sel === p ? ' ✓' : ''}</span></button>`;
      }
      h += '</div>';
    }
    return h + '</div>';
  }
  function drawMap(b, g) {
    if (!SD.draftArt) return;
    b.querySelectorAll('.dr-pcv').forEach(cv => {
      if (cv.dataset.ghost) return SD.draftArt.ghost(cv);
      const bl = sv().town[cv.dataset.q]; if (!bl) return;
      SD.draftArt.building(cv, { client: cl(bl.client), floors: bl.floors, scaf: bl.scaf, cracks: bl.cracks });
    });
  }

  // The results screen: right and wrong, floors, what the Quarter earned, sure misses added to the Wall,
  // calibration, the ideas touched, and Pip's question.
  function results() {
    const r = DR.run(), lv = DR.level();
    const n = r.items.filter(i => !i.practice).length, ok = r.items.filter(i => i.ok).length;
    const seqs = r.items.filter(i => i.seq && !i.practice), seqOk = seqs.filter(i => i.ok).length;
    const topics = [...new Set(r.items.map(i => (i.seq ? (seqFind(i.q) || {}).title : (find(i.q) ? DR.ideaOf(find(i.q)) : null))).filter(Boolean))];
    const paid = M().pay('draft');
    const g = grid();
    const b = U.panel(`<p class="small muted" data-vo="${esc(DR.foremanId() + '|' + DR.foreman().end)}">${esc(DR.foreman().end)}</p>
      <div class="q-ctx">Tonight in Pingsby's Quarter</div>${mapHtml(g, { view: true, tonight: r.built || [], open: R.open(lv) })}
      <p class="small muted">Tonight's buildings are outlined in gold and marked ✦.</p>
      <div class="dr-head"><span class="chip">🏛 Standing: ${ok}</span><span class="chip">🚧 Scaffolding: ${n - ok}</span><span class="chip">🏗 Floors: ${sgn(r.floors)}</span>${r.retries ? `<span class="chip">🔁 Twin retries: ${r.retries}</span>` : ''}${lv >= 2 ? `<span class="chip">🧱 Materials earned: ${r.mat}</span>` : ''}${lv >= 3 ? `<span class="chip">⭐ Reputation earned: ${r.rep}</span>` : ''}${seqs.length ? `<span class="chip">📐 Build orders: ${seqOk} of ${seqs.length}</span>` : ''}<span class="chip">📌 Misses to the Wall: ${r.misses}</span></div>
      ${paid ? `<p class="small">${esc(paid)}</p>` : ''}
      ${M().calibHtml(r.tally, 'How sure you were, blueprint by blueprint')}
      <div class="q-ctx">Ideas touched</div><ul class="small">${topics.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      ${M().pipHtml()}
      <div class="row"><button class="primary" id="dr-q">🏘 See Pingsby's Quarter</button><button class="ghost" id="dr-done">Done</button></div>`, { title: 'ARCHITECT\'S DRAFT · RESULTS', cls: 'dr-win' });
    M().pipWire(b, 'Architect\'s Draft');
    drawMap(b, g);
    b.querySelectorAll('.dr-plot').forEach(el => { el.disabled = true; el.tabIndex = -1; });
    const end = () => {
      const d = sv();
      d.last = { t: Date.now(), n, ok, floors: r.floors, qMs: r.qMs | 0, mapMs: r.mapMs | 0 };
      d.run = null; persist();
    };
    b.querySelector('#dr-q').onclick = () => { end(); DR.quarter(); };
    b.querySelector('#dr-done').onclick = () => { end(); U.closePanel(); if (SD.today && SD.today.render) SD.today.render(); };
  }

  // ---- Pingsby's Quarter: the map or its list, every building's plaque ----
  DR.quarter = function (back, note) {
    refresh();
    const d = sv(), g = grid(), town = Object.values(d.town), st = town.filter(b => !b.scaf).length, list = !!d.qList;
    const placed = Object.keys(g).map(Number).sort((a, b) => a - b);
    const books = town.filter(b => b.plot == null);
    const listH = `<ul class="dr-plist">${placed.map(p => { const b = g[p]; return `<li><button class="dr-prow" data-bq="${esc(b.q)}">${esc(R.name(p))}${R.riverside(p) ? ' · by the river' : ''} · ${esc(bldName(b.client))} · ${esc(dom(b.d))} · ${plural(b.floors, 'floor')} · ${b.scaf ? '🚧 Scaffolding' : '🏛 Standing'}</button></li>`; }).join('')}
      ${books.map(b => `<li><button class="dr-prow" data-bq="${esc(b.q)}">On the books · ${esc(bldName(b.client))} · ${esc(dom(b.d))} · ${b.scaf ? '🚧 Scaffolding' : '🏛 Standing'}</button></li>`).join('')}</ul>
      <p class="small muted">${plural(R.open(DR.level()).filter(p => !g[p]).length, 'empty plot')} under delete markers${R.N - R.open(DR.level()).length ? `, and ${R.N - R.open(DR.level()).length} more that open on later nights` : ''}.</p>`;
    let h = `${note ? `<p class="small dr-since">${esc(note)}</p>` : ''}<p class="small muted">Pingsby's Quarter, at the scrap field's north end. Every ghost under a delete marker is a plot; every building is a blueprint you sealed, marked with its exam domain.</p>
      <div class="dr-head"><span class="chip">🏛 Standing: ${st}</span><span class="chip">🚧 Scaffolding: ${town.length - st}</span>${resChips()}</div>
      <div class="row dr-view"><button class="ghost${list ? '' : ' on'}" id="dr-vmap" aria-pressed="${!list}">Map</button><button class="ghost${list ? ' on' : ''}" id="dr-vlist" aria-pressed="${list}">Map as list</button></div>
      ${list ? listH : mapHtml(g, { view: true, interactive: true, open: R.open(DR.level()) })}
      <p class="small muted">Tap a building for its plaque.</p>
      <div class="row">${typeof back === 'function' ? '<button class="ghost" id="dr-qb">Back to the board</button>' : ''}${DR.run() ? '' : '<button class="primary" id="dr-new">Take on clients</button>'}</div>`;
    const b = U.panel(h, { title: 'PINGSBY\'S QUARTER', cls: 'dr-win' });
    drawMap(b, g);
    b.querySelectorAll('[data-p]').forEach(el => { el.disabled = true; });
    b.querySelectorAll('[data-bq]').forEach(el => el.onclick = () => plaque(el.dataset.bq, back));
    b.querySelector('#dr-vmap').onclick = () => { d.qList = 0; persist(); DR.quarter(back); };
    b.querySelector('#dr-vlist').onclick = () => { d.qList = 1; persist(); DR.quarter(back); };
    const qb = b.querySelector('#dr-qb'); if (qb) qb.onclick = back;
    const nw = b.querySelector('#dr-new'); if (nw) nw.onclick = () => DR.open(null);
  };
  function plaque(qid, back) {
    const bl = sv().town[qid], q = bl && bl.seq ? seqFind(qid) : find(qid);
    if (!bl || !q) return DR.quarter(back);
    if (bl.seq) return seqPlaque(bl, q, back);
    const c = cl(bl.client), can = DR.canRetry(qid);
    const retryLine = bl.scaf && DR.level() >= 2 ? (can ? `<button class="primary" id="dr-rt">Retry its twin (🧱 ${RETRY_COST})</button>` : `<p class="small muted">${sv().mat < RETRY_COST ? `A retry on its twin takes ${plural(RETRY_COST, 'material')}; you have ${sv().mat}.` : 'This one has no twin to retry yet.'}</p>`) : '';
    const b = U.panel(`<div class="dr-result"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><div>
      <p><b>${esc(bldName(bl.client))}</b></p><p class="small">${bl.plot != null ? esc(R.name(bl.plot)) + (R.riverside(bl.plot) ? ' · by the river' : '') : 'On the books'} · ${esc(dom(bl.d))} · ${plural(bl.floors, 'floor')}${bl.cracks ? ` · ${plural(bl.cracks, 'crack')}` : ''}</p>
      <p class="small">${bl.scaf ? '🚧 Under scaffolding. Its question is on the Wall: bring that poster down (Monster Hunt or a Wall drill) to finish it.' : bl.fin ? '🏛 Standing. The scaffolding came off when its poster came down.' : '🏛 Standing.'}</p></div></div>
      <div class="dr-plaque"><div class="q-ctx">Plaque</div><p class="small"><b>${esc(bl.idea || DR.ideaOf(q))}</b></p><p class="small muted">Built for ${esc(c.name)}. ${esc(domName(bl.d))}.</p></div>
      ${retryLine}
      <div class="row"><button class="ghost" id="dr-pb">Back to the Quarter</button></div>`, { title: 'PINGSBY\'S QUARTER', cls: 'dr-win' });
    SD.draftArt.building(b.querySelector('.dr-cv'), { client: c, floors: bl.floors, scaf: bl.scaf, cracks: bl.cracks });
    b.querySelector('#dr-pb').onclick = () => DR.quarter(back);
    const rt = b.querySelector('#dr-rt'); if (rt) rt.onclick = () => DR.retry(qid, back);
  }

  function seqPlaque(bl, x, back) {
    const c = cl(bl.client);
    const b = U.panel(`<div class="dr-result"><canvas class="dr-cv" width="96" height="96" aria-hidden="true"></canvas><div>
      <p><b>${esc(bldName(bl.client))}</b></p><p class="small">${bl.plot != null ? esc(R.name(bl.plot)) + (R.riverside(bl.plot) ? ' · by the river' : '') : 'On the books'} · ${esc(dom(bl.d))} · ${plural(bl.floors, 'floor')}${bl.cracks ? ` · ${plural(bl.cracks, 'crack')}` : ''}</p>
      <p class="small">${bl.scaf ? '🚧 Under scaffolding. Its build order comes back first on a later night: get it right then to finish it.' : bl.fin ? '🏛 Standing. The scaffolding came off when its build order held.' : '🏛 Standing.'}</p></div></div>
      <div class="dr-plaque"><div class="q-ctx">Plaque · build order</div><p class="small"><b>${esc(x.title || bl.idea)}</b></p><p class="small muted">Built for ${esc(c.name)}. ${esc(domName(bl.d))}.</p></div>
      <div class="row"><button class="ghost" id="dr-pb">Back to the Quarter</button></div>`, { title: 'PINGSBY\'S QUARTER', cls: 'dr-win' });
    SD.draftArt.building(b.querySelector('.dr-cv'), { client: c, floors: bl.floors, scaf: bl.scaf, cracks: bl.cracks });
    b.querySelector('#dr-pb').onclick = () => DR.quarter(back);
  }

  // ---- First run: three screens on a real question ----
  function walkScreens() {
    const q = base().filter(isMulti).find(x => DR.slotsOf(x) === 2) || base()[0];
    const cards = q ? DR.cards(q) : [];
    const F = DR.foreman();
    const s1 = `<div class="dr-client">${portrait(DR.foremanId(), 44)}<p class="small" data-vo="${esc(DR.foremanId() + '|' + F.intro)}"><b>${esc(F.name)}</b>, ${esc(F.title)}: "${esc(F.intro)}"</p></div>
      ${q ? `<div class="q-ctx">A requirements scroll · choose ${DR.slotsOf(q)}</div><p class="small"><b>${esc(q.q)}</b></p>
      <p class="small muted">You always see the whole scroll. It has one slot per answer it needs, and the question's own options are your option cards:</p><ul class="small">${cards.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}`;
    return [
      { title: 'Pingsby\'s Quarter', html: s1 },
      { title: 'Draft, then seal', html: `<p class="small">Pick a client from the board. Tap a card to put it in the next empty slot, and tap a slot to take its card back. Then seal with how sure you are. The stakes, in floors:</p>
        <ul class="small"><li><b>Guess</b>: +1 floor if right, 0 if wrong.</li><li><b>Think so</b>: +2 if right, −1 if wrong.</li><li><b>Sure</b>: +3 if right, −3 and a crack if wrong.</li></ul>
        <p class="small muted">The blueprint is judged as a whole, like the exam: every slot right, or it's wrong. Honest confidence wins: Guess when you're under about half sure, Sure only above about two in three. There are no hints before you seal. Afterwards Seymour, the inspector, shows you why every card fits or doesn't, and a miss gets a free retry on its twin.</p>` },
      { title: 'Place it', html: `<p class="small">After the verdict, you place the building on one of the Quarter's plots: ghost buildings under Freya's delete markers. Six plots are open on the first night and more open later. You get ${MAP_ACTIONS} map actions to look and build, and a Map as list view is always one tap away.</p>
        <p class="small">A blueprint with every slot right stands. One wrong slot and it stands under scaffolding, and its question goes on the Wall: bring that poster down in Monster Hunt or a Wall drill to finish it.</p>
        <p class="small">Some clients bring a build order instead of a scroll: put the steps in the order they happen, and leave out the ones that don't belong. It's sealed with the same stakes and judged whole. The first one is worked through for you and the second is practice.</p>
        <p class="small muted">A session is ${SESSION} clients, about 15 minutes, and it saves after every move. New rules arrive one night at a time.</p>` }
    ];
  }
  const walkthrough = () => M().walkFirst('draft', walkScreens());
  DR.walk = () => M().walk('draft', walkScreens());

  // ---- Simulation (tools/modes_sim.js) ----
  // One session on this mode's rules, with every rule open (night 3), on a Quarter already a third built, without
  // touching the save. Answers come from the shell's SD.modes.simAnswer, one draw a blueprint (p is the chance of
  // getting the whole blueprint right), paying one stake. A miss gets its free twin retry; one material buys a retry on an older
  // scaffolded building. policy.route: 'near' builds beside its own domain (materials), 'far' by the river
  // (reputation). Points are floors plus what the Quarter earned (materials and reputation). Two of the six are
  // build orders (scored, as after the format's first two): one draw each, no twin retry, and a miss stays scaffolded.
  DR.sim = async function (policy, rng) {
    const P = M(), pool = base().filter(q => (E().domainOf(q) || 0) > 0);
    const g = {};
    for (let i = 0; i < R.N / 3; i++) { const p = Math.floor(rng() * R.N); if (g[p] == null) g[p] = 1 + Math.floor(rng() * 4); }
    let floors = 0, mat = 0, rep = 0, qs = 0, acts = 0, older = 3;   // a third-built Quarter has a few scaffolds left
    const ask = q => { qs++; const a = P.simAnswer(q, policy, rng); return { ok: a.ok, d: a.pts }; };
    const twinOf = (q, dm) => { const t = pool.filter(x => E().domainOf(x) === dm && x.id !== q.id); return t[Math.floor(rng() * t.length)] || q; };
    const seqs = DR.canSeq() ? DR.seqItems() : [], nSeq = seqs.length ? SEQ_PER : 0;
    for (let k = 0; k < SESSION; k++) {
      const isSeq = k < nSeq, sq = isSeq ? seqs[Math.floor(rng() * seqs.length)] : null;
      const q = isSeq ? sq : pool[Math.floor(rng() * pool.length)], dm = isSeq ? DR.seqDom(sq) : E().domainOf(q);
      let v = ask(q); floors += v.d;
      if (!v.ok && !isSeq) { const w = ask(twinOf(q, dm)); floors += w.d; }
      const free = R.open(3).filter(p => g[p] == null);
      if (!free.length) continue;
      const gain = p => R.gains(g, p, dm, 3, v.ok);
      const near = free.slice().sort((x, y) => gain(y).mat - gain(x).mat)[0];
      const far = free.find(R.riverside);
      const p = policy.route === 'far' && far != null ? far : near;
      acts += 2;   // one look, one build
      const x = gain(p); g[p] = dm; mat += x.mat; rep += x.rep;
      if (!v.ok && !isSeq) older++;
      while (mat >= RETRY_COST && older > 0) { mat -= RETRY_COST; older--; floors += ask(twinOf(q, dm)).d; }
    }
    const secs = qs * P.SIM_Q_SECS + acts * P.SIM_MAP_SECS;
    return { pts: floors + mat + rep, minutes: secs / 60, mapShare: acts * P.SIM_MAP_SECS / secs, questions: qs, zero: floors <= 0 };
  };

  // ---- Register with the mode picker ----
  function register() {
    if (!M().register || DR.registered) return;
    DR.registered = true;
    M().register({
      id: 'draft', name: 'Architect\'s Draft', minutes: 15, host: DR.foreman().name, icon: '🏛',
      blurb: 'Clients in Pingsby\'s Quarter bring requirement scrolls. Draft the right option cards into each slot, seal with how sure you are, then place the building. Built for Select TWO and Select THREE.',
      start: opts => DR.open(opts && opts.preset),
      status: DR.status,
      sim: DR.sim
    });
  }
  register();

  // ---- Styles (kept here so this mode's PR doesn't touch index.html's stylesheet) ----
  const css = `
.dr-head { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px; }
.dr-contract { display: flex; flex-direction: column; gap: 6px; }
.dr-who, .dr-client, .dr-pip { display: flex; gap: 10px; align-items: flex-start; }
.dr-who > :first-child, .dr-client > :first-child, .dr-pip > :first-child { flex: none; }
.dr-client p, .dr-who p { margin: 4px 0 0; }
.dr-q { font-size: 16px; }
.dr-pick { font-weight: 700; white-space: nowrap; }
.dr-win .win-b { overflow-wrap: anywhere; }
.dr-since { background: #eef6ff; border-left: 4px solid #3b8bff; border-radius: 0 8px 8px 0; padding: 6px 10px; }
.dr-slots { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; margin-bottom: 10px; }
.dr-slot { display: flex; flex-direction: column; gap: 2px; text-align: left; min-height: 64px; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 10px; background: #fff; overflow-wrap: anywhere; }
.dr-slot.empty { border-style: dashed; background: transparent; }
.dr-slot .q-ctx { margin: 0; }
.dr-cards { display: flex; flex-direction: column; }
.dr-cards .dr-card { width: 100%; overflow-wrap: anywhere; }
.dr-card .chip { margin-right: 4px; }
.dr-result { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 8px; }
.dr-result p { margin: 0 0 4px; }
.dr-cv { width: 96px; height: 96px; flex: none; display: block; }
.dr-slotres { padding-left: 18px; margin: 4px 0 8px; }
.dr-slotres li { margin: 3px 0; }
.dr-slotres li.ok { color: #17834f; } .dr-slotres li.bad { color: #b23b3b; }
.dr-wallnote { background: #fff1c9; border-radius: 8px; padding: 6px 8px; }
.dr-pip { margin: 10px 0; } .dr-pip label { flex: 1; min-width: 0; } .dr-pip input { display: block; width: 100%; box-sizing: border-box; margin-top: 4px; }
.dr-view button.on { background: var(--ink); color: #fff; }
.dr-map { display: flex; flex-direction: column; gap: 4px; margin: 6px 0; padding: 6px; border-radius: 12px; background: #c9c0a6; }
.dr-mrow { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; }
.dr-river { text-align: center; font-size: 12px; font-weight: 700; color: #fff; background: #5bb2e6; border-radius: 6px; padding: 3px 0; letter-spacing: 1px; }
.dr-plot { position: relative; display: flex; flex-direction: column; align-items: center; padding: 2px; min-width: 0; min-height: 64px; border: 2px solid var(--ink); border-radius: 8px; background: #f4ecd4; }
.dr-plot.ghost { border-style: dashed; background: #e6e0d0; }
.dr-plot.ghost.riv { box-shadow: inset 0 -4px 0 #5bb2e6; }
.dr-plot.ghost.on { border: 3px solid #e0a030; background: #fff1c9; }
.dr-plot:disabled { opacity: .55; }
.dr-plot.built.scaf { background: #fbe3c0; }
.dr-pcv { width: 100%; height: 44px; display: block; }
.dr-ptag { font-size: 11px; font-weight: 700; line-height: 1.1; }
.dr-preview { margin: 6px 0; }
.dr-plist { list-style: none; padding: 0; margin: 6px 0; display: flex; flex-direction: column; gap: 4px; }
.dr-prow { width: 100%; text-align: left; padding: 8px 10px; border: 2px solid var(--ink); border-radius: 8px; background: #fff; font-size: 13px; overflow-wrap: anywhere; }
.dr-prow.on { border-color: #e0a030; background: #fff1c9; }
.dr-bark { font-style: italic; overflow-wrap: anywhere; }
.dr-for { margin: 0 0 4px; }
.dr-retry { border: 2px solid var(--ink); border-radius: 10px; padding: 8px 10px; background: #eef6ff; margin: 8px 0; }
.dr-plot.lockd { justify-content: center; border-style: dotted; background: #b9b09a; opacity: .7; }
.dr-lk { font-size: 18px; line-height: 40px; }
.dr-plot.tonight { border: 3px solid #e0a030; box-shadow: 0 0 0 2px #fff1c9; }
.dr-plaque { border: 2px solid var(--ink); border-radius: 10px; padding: 8px 10px; background: #f6ecd2; margin: 8px 0; }
`;
  const st = document.createElement('style'); st.id = 'draft-css'; st.textContent = css; document.head.appendChild(st);
})();
