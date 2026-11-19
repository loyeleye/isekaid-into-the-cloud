// The Night Watch, version 3: the walkable loop (storyboard "The Night Watch", Ladi Nov 17: "we're good to start
// building everything"). Days in the town, nights patrolling the castle, nine of each.
//   Morning: Mira's review (from day 2), then the day walk. Talk to people for gossip and quests; the clock stops
//            while you talk. The relationship engine (js/watch-bonds.js) sets how helpful people are on referrals.
//   Dusk:    you're put at Pell's gate on the West Road. Pell's briefing, then through the gate to the castle.
//   Night:   walk the four floors, find each breach marker and pick the narrow fix (one retry; a second miss locks
//            it until dawn). A bell every minute; when time runs out, dawn comes.
//   Dawn:    pay: base 30 (Ladi, Nov 19), +10 a fix, -10 a missed breach (night 1 has no fines).
// Content comes from window.WATCH_CONTENT (js/watch-content.js, the content thread); until it's there, the night's
// breaches come from the v2 locks in js/watch-data.js and three placeholder shortcut quests stand in.
//   Watchers: talk to one of the eight in the day to hire them (50, then 80). Ward level 0-4 = paid (up to 2) +
//            their quest's heart + trust in you of 60 or more. On the Long Night: 1 counts, 2 marks, 3 fixes one, 4 all.
//   Night 9: the Long Night. Every breach missed on nights 1-8 comes back first, new ones wait in town, the castle
//            gate stays open both ways, and unwarded breaches only show when you're close. Three endings; retry from
//            that dusk keeps silver, watchers and trust.
//   Shop:    at Kagemaru's stall: spare tools (an extra try), lantern posts (an area seen from afar on night 9), an outpost.
// Save: S.save.watch3 = { v: 3, day, silver, unlocks, quests: { id: { step, done } }, hearts, fixed, missed, bonds }.
(function () {
  const M = SD.modes, U = SD.ui, S = SD.state, W = SD.watchData, WW = SD.watchWorld, WV = SD.watchView, B = SD.watchBonds;
  if (!M || !U || !WW || !WV || !B) return;
  const SCH = SD.watchSchedule;
  const TOPIC_CAP = 2;
  // The AWS topic behind each DVA-C02 Domain 2 skill, shown on every fix screen with the breach's AWS-style evidence
  // (Ladi, Nov 18: when the story is a loose metaphor, say the service and topic outright).
  const TOPIC = { '2.1.1': 'Identity federation', '2.1.2': 'Bearer tokens (Cognito, JWT)', '2.1.3': 'IAM access keys', '2.1.4': 'Signing requests (SigV4)',
    '2.1.5': 'IAM roles and STS', '2.1.6': 'IAM policies and least privilege', '2.1.7': 'Fine-grained access (DynamoDB, Cognito groups)',
    '2.1.8': 'Service-to-service authorization', '2.2.1': 'Encryption at rest and in transit', '2.2.2': 'Certificates (ACM, AWS Private CA)',
    '2.2.3': 'Client-side vs server-side encryption', '2.2.4': 'KMS key policies', '2.2.5': 'Key pairs and self-signed certificates',
    '2.2.6': 'Cross-account KMS', '2.2.7': 'KMS key rotation', '2.3.1': 'Classifying sensitive data (PII, PHI)',
    '2.3.2': 'Encrypting environment variables', '2.3.3': 'Secrets Manager and Parameter Store', '2.3.4': 'Masking sensitive data in logs',
    '2.3.5': 'Sanitizing sensitive data', '2.3.6': 'Multi-tenant data access' };   // people a day who bring up the same running joke (Pell's height, Chad's other world)   // daily schedules (js/watch-schedule.js); without it people stand still
  const esc = s => U.esc(String(s == null ? '' : s));
  const content = () => window.WATCH_CONTENT || {};
  const PAY = { base: 30, fix: 10, miss: -10, review: 10, each: 3 };
  // Days are 6 minutes (Ladi, Nov 18), with each answered question costing a minute: measured so doing every
  // job takes about 130% of an average day. Day 1 is 6 minutes too (Ladi, Nov 18); its lessons cost no minute.
  const DAY_S = 360, JOB_S = 50, TAKE_S = 15, GD_EACH = 8, dayLen = () => DAY_S, nightS = n => (n === 9 ? 900 : 360);
  // Night fuses (Ladi, Nov 18): break-ins turn up across the night, not all at dusk, and each gets through if it isn't
  // fixed within its fuse (2:00; the fuse burns while you answer). They come in pairs, and in threes once a night has
  // six, so you can't always reach them all.
  const FUSE = n => (n === 1 ? 0 : n === 9 ? 240 : 120);
  // Arrivals are staggered (Ladi, Nov 18: "most of the chaos comes from staggered times"): uneven gaps, some close
  // together, so a new bell often rings while you're mid-fix. Seeded by the night, so each night plays the same way.
  const seeded = n => { let h = (n * 2654435761) >>> 0; return () => { h = (h ^ (h << 13)) >>> 0; h = (h ^ (h >>> 17)) >>> 0; h = (h ^ (h << 5)) >>> 0; return h / 4294967296; }; };
  function lightFuses(list, n) {
    if (n === 1) return list.forEach(x => { x.at = 0; x.fuse = 0; x.inAt = 0; });
    const rnd = seeded(n * 31 + list.length), span = n === 9 ? 600 : nightS(n) - FUSE(n) - 30;
    const gaps = list.slice(1).map(() => 0.25 + rnd() * 1.5), sum = gaps.reduce((a, b) => a + b, 0) || 1;
    const k = Math.min(span / sum, 100 * gaps.length / sum);   // fill the night, but never more than 100s apart on average
    let t = 15;
    list.forEach((x, i) => { if (i) t += gaps[i - 1] * k; x.at = Math.round(t); x.fuse = FUSE(n); x.inAt = 5 + Math.floor(rnd() * 6); });
  }
  const NAME = Object.assign({ seoyeon: 'Seo-yeon', kevin: 'Hooded Stranger', captain: 'The Captain' }, (W && W.WHO) || {});
  const nm = who => NAME[who] || who.charAt(0).toUpperCase() + who.slice(1);
  const PEOPLE = ['mira', 'coo', 'bru', 'kagemaru', 'lexi', 'kai', 'dutch', 'hobb', 'pell', 'wen', 'ayo', 'aigerim', 'doug', 'tess', 'hollis', 'odu', 'fennel', 'seymour', 'captain'];
  // Watchers (doc: The Long Night, "The map is eight areas"): one per area, hired in the day.
  const WATCHERS = { mira: 'main-street', coo: 'hill-road', kagemaru: 'far-lane', bru: 'west-road',
    lexi: 'castle:towers', kai: 'castle:upper', dutch: 'castle:ground', hobb: 'castle:cellars' };
  const HIRE = [50, 80], HIRE_DAY = 3;
  // The shop at Kagemaru's stall (doc: Economy, money out). Trust 60 takes 20% off (js/watch-bonds.js).
  const SHOP = [{ id: 'tools', name: 'Spare tools', cost: 10, what: 'one extra try on a fix tonight' },
    // Ladi, Nov 18: a one-off that removes an intruder but leaves its break-in open. Named for IAM's "revoke active
    // sessions": the stolen pass stops working, and the guards walk them out.
    { id: 'writ', name: 'Revoke active sessions', cost: 12, what: 'one use: walk up to an intruder and revoke their stolen pass. They\'re walked out. Their break-in stays open' },
    { id: 'post', name: 'Lantern post', cost: 15, what: 'one area glows on the Long Night: you see its breaches from afar' },
    { id: 'outpost', name: 'Outpost', cost: 60, what: 'a door from Main Street into the castle, kept all game' },
    { id: 'guard', name: 'GuardDuty bell', cost: 0, what: 'tonight only: rings with the floor of every break-in and shows each fuse, wherever you are' },
    { id: 'watch1', name: 'Pocket watch', cost: 20, what: '+25 seconds to think on every question before your clock runs' },
    { id: 'watch2', name: 'Fine pocket watch', cost: 40, what: '+35 more seconds to think, for a friend of the stall' }];
  // Questions past day 1 (Ladi, Nov 18): you get a grace of thinking time on each one, then it eats your day or night
  // clock. 90s, then Kagemaru's watches add 25s and 35s: 2:30, the pace for the longest exam security questions.
  const QBUF = 90, QUP = [25, 35];
  const qGrace = () => { const n = sv().watchUp || 0; return QBUF + (n >= 1 ? QUP[0] : 0) + (n >= 2 ? QUP[1] : 0); };
  const kageDone = () => quests().some(q => q.giver === 'kagemaru' && qstate(q.id).done);
  const qOpen = () => { const w = sv(); if (run && run.phase !== 'dusk' && w.day >= 2 && !run.q) { const g = run.half ? Math.round(qGrace() / 2) : qGrace(); run.half = 0; run.q = { left: g, of: g, first: !w.toldQ }; w.toldQ = 1; } };
  // Taking a job costs 15s (a small commitment: drop it and that's gone), and each question you finish, right or
  // wrong, 50s (Ladi, Nov 18). Both apart from the thinking time.
  const take = () => { if (run && run.phase === 'day' && sv().day >= 2) { clock = Math.max(0, clock - TAKE_S); toast('⏳ −0:15 to take the job.'); } };
  const qShut = () => { if (!run || !run.q) return; run.q = null;
    if (run.phase !== 'dusk' && sv().day >= 2) { clock = Math.max(0, clock - JOB_S); toast(`⏳ −0:50 on the ${run.phase} clock for that job.`); } };
  const qLine = () => run && run.q ? `<div class="ww-qbar" aria-hidden="true"><i></i></div><p class="ww-qt" role="timer"></p>${run.q.first ? `<p class="ww-meta">From today, every question gives you ${Math.floor(qGrace() / 60)}:${String(qGrace() % 60).padStart(2, '0')} to think. After that it uses your clock. Taking a job costs 15 seconds of your day, and each answer 50. Kagemaru sells pocket watches for longer thinking.</p>` : ''}` : '';
  const watcherOf = scene => Object.keys(WATCHERS).find(k => WATCHERS[k] === scene) || null;
  // Ward level 0-4: up to 2 paid, up to 2 from trust (their quest's heart, and trust in you of 60 or more).
  // Her party (Ladi, Nov 18) already trusts her and wouldn't take her silver. What stops them is the harvest-moon
  // feast on the ninth night: each has a job there. Find someone they trust to cover it (their 'duty' quest) for 2
  // levels; their two quests are the other 2. Until then they're at 0: busy elsewhere.
  const PARTY = ['mira', 'kai', 'dutch'];
  const questsDone = who => (sv().helped || {})[who] || 0;   // their quests finished (each one taught them a fix)
  const ward = who => { const w = sv();
    if (PARTY.includes(who)) return (w.freed || {})[who] ? 2 + Math.min(2, questsDone(who)) : 0;
    return Math.min(2, (w.hires || {})[who] || 0) + (w.hearts[who] ? 1 : 0) + (B.trust(w.bonds, who) >= 60 ? 1 : 0); };
  const OLD_ROOM = { tower: 'watchtower', bridge: 'bridge-tower', post: 'post-room', strong: 'strongroom' };
  const FIX_OF = { lock: 'door', key: 'badge-desk' };

  const sv = () => {
    const s = S.save;
    if (!(s.watch3 && s.watch3.v === 3)) s.watch3 = { v: 3, day: 1, silver: 0, unlocks: {}, quests: {}, hearts: {}, fixed: {}, missed: {}, bonds: B.create(1) };
    return s.watch3;
  };

  // ---- Breaches for a night ----
  function roomX(floor, room, salt) {
    const r = WW.CASTLE[floor] && WW.CASTLE[floor].rooms.find(x => x[0] === room);
    if (!r) return 800;
    if ((WW.CASTLE[floor].popup || []).includes(room)) { const d = (WW.CASTLE[floor].doors || {})[room]; return d != null ? d : (r[1] + r[2]) / 2; }   // an archway room: the break-in is at its doorway
    const span = r[2] - r[1];
    return Math.round(r[1] + span * (0.3 + 0.4 * ((salt * 37) % 10) / 10));
  }
  function fallbackBreaches(n) {
    const night = W && W.NIGHTS[n - 1];
    if (!night) return [];
    return night.set.map(([slot], i) => {
      const s = W.SLOTS[slot], room = OLD_ROOM[s.room] || s.room, floor = (W.ROOMS[s.room] || {}).floor || 'ground';
      return { id: 'v2-' + n + '-' + slot, night: n, skill: s.task, fix: FIX_OF[s.kind] || 'door', where: { floor, room },
        title: s.name, story: s.ask, raid: 'Thieves',
        choices: Object.keys(s.tiles).map(k => ({ text: s.tiles[k].label, best: s.tiles[k].res === 'ok', why: s.tiles[k].line })), _i: i };
    });
  }
  function fallbackNine() {   // the Long Night's new breaches, until content lands: the night-9 locks, one per town level
    return fallbackBreaches(9).map((b, i) => {
      const lvl = WW.LEVELS[i % 4], spot = WW.TOWN[lvl].spots.find(s => s.kind === 'fix') || WW.TOWN[lvl].spots[0];
      return Object.assign({}, b, { where: { level: lvl, x: spot.x } });
    });
  }
  const allFor = n => { const c = content().breaches; return c && c.length ? c.filter(b => b.night === n) : n === 9 ? fallbackNine() : fallbackBreaches(n); };
  const AREA = a => (WW.FLOORS.includes(a) ? 'castle:' + a : a);
  function breaches(n) {
    const w0 = sv(), sealed = w0.sealed || {};
    let list = allFor(n).filter(b => !(b.where && b.where.floor && n < 9 && (sealed[b.where.floor] === 'all' || sealed[b.where.floor] === n)));
    if (n === 9 && list.some(b => b.area)) {   // the night-9 pool: about one per area
      const seenA = {};
      list = list.filter(b => { const a = AREA(b.area || ''); if (seenA[a]) return false; seenA[a] = 1; return true; });
    }
    if (n === 9) {   // returning: every breach missed on nights 1-8, in the same place, first
      const w = sv(), back = [];
      for (let k = 1; k <= 8; k++) allFor(k).forEach(b => { if (w.missed[b.id]) back.push(b); });
      list = back.concat(list);
    }
    if (n === 1) list = list.slice(0, 1);   // night 1: one breach, on the ground floor (doc: Night 1)
    // Copycats (Ladi, Nov 18: nights were too easy): from night 3, break-ins you've seen before come back on another
    // floor, the ones you missed first. Spaced practice, and enough break-ins that a clean night needs about 130% of
    // the 6 minutes (about 85s each: walk, think, and the 50s a fix takes).
    const CC = { 3: 2, 4: 2, 5: 1, 6: 3, 7: 2, 8: 3 };
    if (CC[n]) {
      const pool = []; for (let k = 2; k < n; k++) allFor(k).forEach(b => pool.push(b));
      pool.sort((a, b) => (w0.missed[b.id] ? 1 : 0) - (w0.missed[a.id] ? 1 : 0) || ((a.id.length * 31 + n) % 17) - ((b.id.length * 31 + n) % 17));
      const open = WW.FLOORS.filter(f => !(sealed[f] === 'all' || sealed[f] === n));
      pool.slice(0, CC[n]).forEach((b, i) => {
        const from = b.where && b.where.floor, floors = open.filter(f => f !== from), f = floors[(n + i) % floors.length] || open[0];
        const rooms = WW.CASTLE[f].rooms, room = rooms[(n * 3 + i) % rooms.length][0];
        list.push(Object.assign({}, b, { id: `cc${n}-${b.id}`, orig: b.id, copy: true, where: { floor: f, room }, title: b.title + ' (again)' }));
      });
    }
    // The HD floors moved some rooms (the tavern is in the cellars now): follow the room to its floor.
    const floorOf = room => WW.FLOORS.find(f => WW.CASTLE[f].rooms.some(r => r[0] === room));
    list = list.map(b => b.where && b.where.room && b.where.floor && !WW.CASTLE[b.where.floor].rooms.some(r => r[0] === b.where.room) && floorOf(b.where.room)
      ? Object.assign({}, b, { where: Object.assign({}, b.where, { floor: floorOf(b.where.room) }) }) : b);
    return list.map((b, i) => {
      const scene = b.where && b.where.level ? b.where.level : 'castle:' + ((b.where && b.where.floor) || 'ground');
      const sc = WW.scene(scene);
      const sp = b.where && b.where.spot && WW.spot(b.where.level, b.where.spot);
      const x = b.where && b.where.x != null ? b.where.x : sp ? sp.x + 24 : b.where && b.where.room ? roomX(b.where.floor, b.where.room, (b.id.length + i) % 7 + 1)
        : Math.round(sc.from + 200 + ((b.id.length * 7919) % 1000) / 1000 * (sc.to - sc.from - 400));   // a sparkle somewhere on the level
      return Object.assign({ scene, x }, b);
    });
  }

  // ---- The castle plan at dusk (Ladi, Nov 19; backlog "Floor plan at dusk, light version") ----
  // Pell hands you the plan at the gate with one pin (two from night 5). Each pin sets one room's lock or a worker's
  // key from the old floor-plan tiles (js/watch-data.js W.SLOTS). Narrow (ok): one of tonight's break-ins in that
  // room never happens. Too wide (wide, leak): it comes 10s in on a 1:00 fuse. Too narrow (block): a worker is
  // turned away, a 5 silver fine. A room with no break-in tonight does nothing either way, so the day's word (Pell
  // names one room where trouble is talked about) is what makes a pin count. Nights 2 to 8 only.
  const PLAN_SLOT = { gate: 'gate', hall: 'pw', ledger: 'badge', wardrobe: 'cloak', 'bridge-tower': 'bkey', bridge: 'bsign',
    strongroom: 'drawer', 'post-room': 'letter', archive: 'vault', tavern: 'logs' };
  const PLAN_FINE = 5;
  const planPins = n => (n >= 5 ? 2 : 1);
  const slotRoom = id => Object.keys(PLAN_SLOT).find(r => PLAN_SLOT[r] === id);
  const roomNm = r => { for (const f of WW.FLOORS) { const x = WW.CASTLE[f].rooms.find(q => q[0] === r); if (x) return x[3]; } return r === 'bridge' ? 'Bridge' : r; };
  function planFor(n) {
    if (!W || !W.SLOTS || n < 2 || n > 8) return null;
    const list = breaches(n), targets = {};
    list.forEach(b => { const r = b.where && (b.where.room || (b.where.level === 'bridge' ? 'bridge' : null)), id = r && PLAN_SLOT[r]; if (id && W.SLOTS[id] && !targets[id]) targets[id] = b.id; });
    const real = Object.keys(targets), rnd = seeded(n * 97 + 11);
    const decoys = Object.keys(W.SLOTS).filter(id => !targets[id] && slotRoom(id)).sort(() => rnd() - 0.5);
    const opts = real.slice(0, 3).concat(decoys).slice(0, Math.max(4, Math.min(5, real.length + 2)));
    opts.sort(() => rnd() - 0.5);
    const hint = real.length ? real[Math.floor(rnd() * real.length)] : null;
    // Pell quotes the town (Ladi, Nov 19): a line you heard today about a room with a break-in, else one he overheard.
    const gh = sv().gheard || {}, talk = dayTalk(n).filter(g => !g.clue && real.some(id => (g.room || '') === slotRoom(id) || (ROOM_RX[slotRoom(id)] || /$^/).test(g.line)));
    const quote = talk.find(g => gh[g.id] === n) || talk[Math.floor(rnd() * talk.length)] || null;
    return { n, pins: planPins(n), opts, targets, hint, quote };
  }
  // At the gate, before the night: pick a room, then its setting. Calls go() when done (or skipped).
  function planCard(go) {
    const w = sv(), P = planFor(w.day);
    if (!P || (w.plan && w.plan.day === w.day)) return go();
    const plan = { day: w.day, pins: [] };
    const room = id => roomNm(slotRoom(id));
    const pick = () => {
      if (plan.pins.length >= P.pins) return finish();
      const left = P.opts.filter(id => !plan.pins.some(p => p.slot === id));
      const o = overlay(`<p class="ww-t">The castle plan</p>${plan.pins.length ? '' : line('pell', P.quote ? `${(sv().gheard || {})[P.quote.id] === w.day ? 'You heard' : 'I heard'} ${nm(P.quote.who)} today: "${P.quote.line}" Make of that what you will.` : P.hint ? `Word in town today was about the ${room(P.hint).toLowerCase()}. Make of that what you will.` : 'Quiet day in town. Pin what you like.')}
        ${line('pell', P.pins > 1 ? `Two pins tonight. ${plan.pins.length ? 'One left.' : 'Set a room the way it should be, and it holds.'}` : 'One pin. Set a room the way it should be, and it holds.')}
        <div class="ww-ch">${left.map(id => `<button data-s="${id}">${esc(room(id))} · ${esc(W.SLOTS[id].name)}</button>`).join('')}</div>
        <div class="row"><button class="ghost" data-a="x">No pin tonight</button></div>`);
      o.querySelectorAll('[data-s]').forEach(el => el.onclick = () => tiles(el.dataset.s));
      o.querySelector('[data-a=x]').onclick = finish;
    };
    const tiles = id => {
      const sl = W.SLOTS[id], keys = Object.keys(sl.tiles), rnd = seeded(w.day * 13 + id.length);
      keys.sort(() => rnd() - 0.5);
      const o = overlay(`<p class="ww-t">${esc(room(id))} · ${esc(sl.name)}</p><p>${esc(sl.ask)}</p>
        <div class="ww-ch">${keys.map(k => `<button data-k="${k}">${sl.tiles[k].icon || ''} ${esc(sl.tiles[k].label)}</button>`).join('')}</div>
        <div class="row"><button class="ghost" data-a="b">Back</button></div>`);
      o.querySelectorAll('[data-k]').forEach(el => el.onclick = () => {
        const t = sl.tiles[el.dataset.k];
        plan.pins.push({ slot: id, tile: el.dataset.k, res: t.res, target: P.targets[id] || null });
        if (t.res === 'block') w.silver = Math.max(0, w.silver - PLAN_FINE);   // charged now, so leaving and coming back can't repeat it
        pick();
      });
      o.querySelector('[data-a=b]').onclick = pick;
    };
    const finish = () => { w.plan = plan; S.persist(); close(); go(); };
    pick();
  }
  // Tonight's list with the plan applied: narrow pins cancel their break-in, wide ones bring it early on a short fuse.
  function applyPlan(list, n) {
    const w = sv(), plan = w.plan && w.plan.day === n ? w.plan : null, notes = [];
    if (!plan) return { list, notes, kept: [] };
    const kept = [];
    plan.pins.forEach(p => {
      const sl = W.SLOTS[p.slot], t = sl && sl.tiles[p.tile], rm = roomNm(slotRoom(p.slot)), x = p.target && list.find(b => b.id === p.target);
      if (!t) return;
      if (p.res === 'block') notes.push(`📌 ${rm}: a worker was turned away (${PLAN_FINE} silver fine). ${t.line}`);
      else if (!x) notes.push(`📌 ${rm}: quiet tonight. The pin made no difference.`);
      else if (p.res === 'ok') { kept.push(x); list = list.filter(b => b !== x); notes.push(`📌 ${rm}: the plan held. That break-in never happens. ${t.line}`); }
      else { x.at = Math.min(x.at || 0, 10); x.fuse = Math.min(x.fuse || 60, 60); notes.push(`📌 ${rm}: set too wide. Someone's already trying it, on a short fuse. ${t.line}`); }
    });
    return { list, notes, kept };
  }

  // ---- Quests ----
  const FALLBACK_QUESTS = [
    { id: 'dutch-own-pass', giver: 'dutch', kind: 'shortcut', opens: 2, closes: 4, skill: '2.1', reward: { silver: 20, heart: true, unlock: 'cellar-stair' },
      steps: [
        { at: { who: 'dutch' }, say: [['dutch', 'All four of my crews share one pass, and it opens every door in the cellars.'], ['seoyeon', 'Let me think about how it should work.']] },
        { at: { who: 'dutch' }, ask: { q: 'Four Lambda functions share one execution role that can read and write every table. What should change?',
          choices: ['A role per function, allowing only its own tables',
            'An IAM user\'s access keys in each function\'s env vars',
            'Keep the shared role, but add a permissions boundary'], answer: 0,
          why: 'An execution role per function keeps each one to least privilege. Lambda gets the role\'s temporary credentials for you, so long-term keys aren\'t needed, and a boundary on a shared role still lets every function reach every table.' } },
        { at: { who: 'dutch' }, say: [['dutch', 'Own passes all round. Here, the keys to the near stair down to the cellars and the ladder hatch.']] }
      ] },
    { id: 'kai-night-cloak', giver: 'kai', kind: 'shortcut', opens: 3, closes: 5, skill: '2.1', reward: { silver: 20, heart: true, unlock: 'back-stair' },
      steps: [
        { at: { who: 'kai' }, say: [['kai', 'The night clerk needs the ledger only during the shift. Right now they carry a copy of the key home.']] },
        { at: { who: 'hobb' }, say: [['hobb', 'Kai sent you? Then here is how cloaks work: you wear one for a while, then it goes back on the hook.']] },
        { at: { who: 'kai' }, ask: { q: 'A worker needs to read an S3 bucket only during the night shift. How should they get access?',
          choices: ['Assume a role at the start of each shift',
            'A long-term access key, deleted each morning', 'A bucket policy allowing their IP at night'], answer: 0,
          why: 'Assuming a role returns temporary security credentials from AWS STS that expire on their own. A long-term key lasts until someone deletes it, and an IP rule lets anyone on that network in.' } },
        { at: { who: 'kai' }, say: [['kai', 'A cloak on a hook. Take the keys to the east tower stair and the ladder hatch to the towers.']] }
      ] },
    { id: 'captain-hoist-key', giver: 'captain', kind: 'big', opens: 5, closes: 7, skill: '2.1', reward: { silver: 30, heart: false, unlock: 'hoist' },
      steps: [
        { at: { who: 'captain' }, say: [['captain', 'The ladder reaches every floor, so its key is the most dangerous one in the keep.']] },
        { at: { who: 'captain' }, ask: { q: 'One permission can reach every floor. What keeps it safest?',
          choices: ['A role the watch assumes only on patrol, logged',
            'An IAM user for the watch, with MFA on its sign-in', 'Attach it to every worker, with a permissions boundary'], answer: 0,
          why: 'Granting wide access through a role that is assumed only when needed limits how long anyone holds it, and CloudTrail records each AssumeRole call. A standing IAM user holds the access all the time, and a boundary on every worker still gives every worker the hoist.' } },
        { at: { who: 'captain' }, say: [['captain', 'Good. The ladder is yours, every hatch. Climb to the floor you want.']] }
      ] }
  ];
  const quests = () => (content().quests && content().quests.length ? content().quests : FALLBACK_QUESTS);
  const qstate = id => (sv().quests[id] = sv().quests[id] || { step: -1, done: false });
  const openOn = (q, d) => d >= q.opens && d <= q.closes;

  // ---- People in a scene ----
  function people(phase, day) {
    const out = {}, wx = WW.weather(day, phase === 'night' ? 'night' : 'day');
    const put = (scene, who, x) => { (out[scene] = out[scene] || []).push({ who, x }); };
    if (phase === 'day' || phase === 'dusk') {
      WW.LEVELS.forEach(l => WW.TOWN[l].spots.forEach(s => {
        if (!s.who) return;
        if (s.who === 'pell' && phase !== 'dusk') return;
        if (s.who === 'fennel' && wx === 'mist') return;                 // doc: day 7 mist, Fennel stays in
        if (s.who === 'kagemaru' && wx === 'rain') { put('main-street', 'kagemaru', 1960); return; }  // under the café awning
        if (!(s.who === 'mira' && run && run.escort && run.phase === phase)) put(l, s.who, s.x + 34);   // day 1: she's walking with you
        (s.also || []).forEach((w, i) => put(l, w, s.x - 40 - i * 40));
      }));
      if (phase === 'day' && SCH) Object.keys(content().schedule || {}).forEach(who => {   // people with a plan but no spot (Aigerim, Chad)
        if (Object.values(out).some(a => a.some(p => p.who === who))) return;
        const pl = SCH.planFor(content().schedule, who, day, wx), at = pl && SCH.resolve(WW, pl[0][1]);
        if (at) put(at.scene, who, at.x);
      });
      if (phase === 'day' && wx !== 'rain') WW.LEVELS.forEach((l, i) => [1, 2].forEach(k => {   // the background crowd
        const T = WW.TOWN[l]; (out[l] = out[l] || []).push({ who: 'townsfolk-' + ((i + k) % 3 + 1), x: T.from + (T.to - T.from) * (k / 3), walk: true, facing: k === 1 ? 1 : -1, crowd: true });
      }));
    } else {
      put('castle:towers', 'captain', 1150);
      if (day === 1) { WW.artSync(); put('castle:ground', 'pell', WW.ENTRY_X + 70); }
    }
    return out;
  }

  // The walk-in ends at the castle gate: Mira goes back to her fire, and the hint clears.
  function homeMira() {
    if (!run || !run.escort) return;
    run.escort = false; view.set('follow', null); view.set('hint', ''); view.set('guide', null); music(tune('day'));
    const home = { who: 'mira', scene: 'main-street', x: (WW.spot('main-street', 'base-camp') || { x: 560 }).x + 34, facing: -1, d: 0 };
    if (run.walkers) run.walkers.push(home); else (run.ppl['main-street'] = run.ppl['main-street'] || []).push(home);
    if (run.walkers) syncPeople();
  }

  // ---- Screens over the view ----
  let view = null, wrap = null, busy = false, clock = 0, run = null;
  function overlay(html) {
    busy = true;
    let o = wrap.querySelector('.ww-o');
    if (!o) { o = document.createElement('div'); o.className = 'ww-o'; wrap.appendChild(o); }
    o.innerHTML = `<div class="ww-card" role="dialog" aria-modal="true">${html}</div>`;
    o.hidden = false;
    const f = o.querySelector('button'); if (f) setTimeout(() => f.focus(), 0);
    return o;
  }
  // Enter, Space or E moves a message on or closes it (Ladi, Nov 18). Choice lists keep their buttons:
  // a focused choice still answers with Enter, and nothing is picked for you.
  document.addEventListener('keydown', e => {
    if (!busy || !wrap || !['Enter', ' ', 'e', 'E'].includes(e.key)) return;
    const o = wrap.querySelector('.ww-o:not([hidden])'); if (!o) return;
    const f = document.activeElement;
    if (f && o.contains(f) && f.tagName === 'BUTTON' && (e.key === 'Enter' || e.key === ' ')) return;   // the browser clicks it
    const b = o.querySelector('[data-a=n]') || o.querySelector('[data-a=d]') || o.querySelector('[data-a=x]');   // Next, OK, or Bye: never a purchase
    if (b) { e.preventDefault(); b.click(); }
  });
  window.addEventListener('pagehide', () => { if (run && run.keep) run.keep(); });   // closing the tab keeps the clock too
  function close() { const o = wrap && wrap.querySelector('.ww-o'); if (o) { o.hidden = true; o.innerHTML = ''; } setTimeout(() => { const o2 = wrap && wrap.querySelector('.ww-o'); if (!o2 || o2.hidden) busy = false; }, 80); }
  // Faces (Ladi, Nov 18: every dialog box shows the speaker's face). The painted portrait where the cast has one,
  // else the head cropped from their side-view sprite (js/watch-art.js), else their initial.
  // Painted busts for every speaker (Sogni, Nov 18) at assets/img/watch/portraits/<who>.webp; anyone else gets a crop of their sprite.
  const PORTRAIT = { seoyeon: 1, mira: 1, kai: 1, dutch: 1, coo: 1, bru: 1, kagemaru: 1, lexi: 1, wen: 1, ayo: 1, aigerim: 1, chad: 1, seymour: 1, hobb: 1, pell: 1, tess: 1, doug: 1, hollis: 1, odu: 1, fennel: 1, captain: 1, kevin: 1 };
  const crops = {};
  function cropHead(who) {
    if (who in crops) return crops[who];
    crops[who] = null;
    const a = window.WATCH_ART && WATCH_ART.people && WATCH_ART.people[who];
    if (!a) return null;
    const im = new Image();
    im.onload = () => {
      try {
        const cv = document.createElement('canvas'), n = 44; cv.width = n; cv.height = n;
        const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
        const top = Math.max(0, a.anchor[1] - 104);   // the head sits near the top of the 112-tall frame
        g.drawImage(im, a.anchor[0] - 22, top, 44, 44, 0, 0, n, n);
        crops[who] = cv.toDataURL();
        document.querySelectorAll('.ww-face[data-who="' + who + '"]').forEach(el => { el.innerHTML = `<img src="${crops[who]}" alt="">`; });
      } catch (e) { /* a tainted canvas or a missing sheet: the initial stays */ }
    };
    im.src = a.sheet;
    return null;
  }
  const face = who => {
    const src = PORTRAIT[who] ? `assets/img/watch/portraits/${who}.webp` : cropHead(who);
    return `<span class="ww-face${PORTRAIT[who] ? ' bust' : ''}" data-who="${who}" aria-hidden="true">${src ? `<img src="${src}" alt="">` : esc(nm(who).charAt(0))}</span>`;
  };
  const line = (who, text) => `<p class="ww-say">${face(who)}<span><b>${esc(nm(who))}:</b> ${esc(text)}</span></p>`;
  const bars = r => `<div class="ww-bars"><span>Trusts you <i style="--v:${r.you}"></i></span><span>Trusts the sender <i style="--v:${r.tie === 'cool' ? 0 : r.sender}"></i></span></div>`;
  function sayAll(lines, then) {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { close(); if (then) then(); return; }
      const [who, text] = lines[i++];
      const o = overlay(line(who, text) + '<div class="row"><button class="primary" data-a="n">Next</button></div>');
      o.querySelector('[data-a=n]').onclick = next;
    };
    next();
  }
  // A choice question: { q, choices, answer, why }. done(ok). tries: how many misses allowed before it locks.
  // Archway rooms (HD floors, Nov 19, Ladi: like Mira's Kitchen): walking in opens the room's painting with Seo-yeon
  // standing in it, and a break-in there is fixed in the same popup.
  const INT = () => (window.WATCH_ART_CASTLE && WATCH_ART_CASTLE.interiors) || {};
  function roomArt(room) {
    const r = room && INT()[room]; if (!r) return '';
    const me = window.WATCH_ART && WATCH_ART.people && WATCH_ART.people.seoyeon;
    const fx = r.focus ? r.focus[0] : r.w / 2, left = Math.max(4, Math.min(80, (fx / r.w) * 100 - 22)), pad = me && me.anchor ? (me.h - me.anchor[1]) / me.h * 46 : 0,
      bottom = ((r.h - Math.max(r.floorY || 0, r.h * 0.9)) / r.h) * 100 - pad;   // feet on the front of the floor, past the furniture (Ladi, Nov 19); 46: the sprite's height in % (CSS)
    if (me) setTimeout(() => { const cv = wrap && wrap.querySelector('.ww-room canvas'); if (!cv) return; const im = new Image();
      im.onload = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); g.drawImage(im, 0, 0, me.w, me.h, 0, 0, me.w, me.h); }; im.src = me.sheet; }, 0);
    return `<div class="ww-room" style="background-image:url('${r.img}')">${me ? `<canvas width="${me.w}" height="${me.h}" style="left:${left.toFixed(1)}%;bottom:${bottom.toFixed(1)}%" aria-hidden="true"></canvas>` : ''}</div>`;
  }
  function roomPop(spot) {
    if (!INT()[spot.room]) return;
    const out = spot.room === 'bridge-tower' && WW.scene(run ? run.st.scene : '').spots.find(v => v.id === 'bridge-exit');   // the bridge leaves from here (Ladi, Nov 19)
    const o = overlay(`${roomArt(spot.room)}<p class="ww-t">${esc(spot.label)}</p><p class="ww-q">Nothing out of place in here.</p><div class="row">${out ? '<button class="primary" data-a="b">Walk onto the bridge</button><button class="ghost" data-a="d">Step out</button>' : '<button class="primary" data-a="d">Step out</button>'}</div>`);
    o.querySelector('[data-a=d]').onclick = close;
    if (out) o.querySelector('[data-a=b]').onclick = () => { close(); run.st.x = out.x; WW.go(run.st, 'use'); };
  }
  const popRoom = x => { const f = /^castle:(\w+)$/.exec(x.scene || ''), room = x.where && x.where.room;
    return f && room && (WW.CASTLE[f[1]].popup || []).includes(room) ? room : null; };
  function choose(title, q, tries, done, who) {
    let miss = 0;
    // Shuffle the order each time a question opens, so where the right answer sits tells you nothing (Ladi, Nov 18).
    const order = q.choices.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
    qOpen();
    const draw = (msg) => {
      const o = overlay(`${roomArt(q.room)}${qLine()}${who ? `<p class="ww-say">${face(who)}<span class="ww-t">${esc(title)}</span></p>` : `<p class="ww-t">${esc(title)}</p>`}${q.topic ? `<p class="ww-topic">AWS · ${esc(q.topic)}</p>` : ''}<p class="ww-q">${esc(q.q)}</p>${q.ev ? `<pre class="ww-ev">${esc(q.ev)}</pre>` : ''}${msg || ''}
        <div class="ww-ch">${order.map(i => `<button data-i="${i}">${esc(q.choices[i])}</button>`).join('')}</div>`);
      o.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        if (i === q.answer || miss + 1 > tries) qShut();
        if (i === q.answer) {
          const o2 = overlay(`<p class="ww-ok">✓ ${esc(q.choices[i])}</p><p class="ww-why">${esc(q.why || '')}</p><div class="row"><button class="primary" data-a="d">Done</button></div>`);
          o2.querySelector('[data-a=d]').onclick = () => { close(); done(true, miss); };
        } else if (++miss > tries) {
          const o2 = overlay(`<p class="ww-no">✗ Not quite.</p><p class="ww-why">${esc(q.why || '')}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
          o2.querySelector('[data-a=d]').onclick = () => { close(); done(false, miss); };
        } else draw(`<p class="ww-no">✗ That isn't the narrow fix. One more try.</p>`);
      });
    };
    draw();
  }

  // ---- Talking ----
  // Today's gossip, theirs: the first line you haven't heard today, so talking again gets the next one (Ladi, Nov 19:
  // gossip should point at the break-ins often enough; second lines were never heard).
  function gossipFor(who, day, wx) {
    const gh = sv().gheard || {};
    const g = dayTalk(day).filter(x => x.who === who && (!x.weather || x.weather === wx));
    return g.find(x => gh[x.id] !== day) || g[0] || null;
  }
  // Rooms gossip can point at: a line names the room, or the trouble that lives there.
  const ROOM_RX = { gate: /castle gate|\bgate\b/i, ledger: /ledger|order clerk/i, lookout: /lookout/i, wardrobe: /wardrobe|cloak/i,
    bridge: /bridge|neighbour/i, hall: /great hall|\bhall\b/i, strongroom: /strongroom/i, barracks: /barracks/i, 'post-room': /post room|letters?\b/i,
    captain: /captain/i, archive: /archive/i, tavern: /tavern/i, watchtower: /watchtower/i, 'bridge-tower': /bridge/i };
  const roomOf = b => b && b.where && (b.where.room || (b.where.level === 'bridge' ? 'bridge' : null));
  // Copycats have no written gossip, so one person with nothing else to say that day mentions where each is headed.
  const CC_SAY = [r => `Someone was asking the way to the ${r} last night. Same questions as before.`,
    r => `Heard boots near the ${r}. Same trick as last time, if you ask me.`,
    r => `The ${r}'s got someone's interest. Tried it once already, didn't they?`];
  function dayTalk(day) {
    const base = (content().gossip || []).filter(x => x.day === day);
    if (day < 3 || day > 8) return base;
    const busy = new Set(base.map(x => x.who)), free = PEOPLE.filter(p => !busy.has(p) && !['pell', 'captain', 'seymour'].includes(p));   // Seymour only speaks in capitals
    const cc = breaches(day).filter(b => b.copy), out = base.slice();
    cc.forEach((b, i) => { const who = free[(day * 3 + i) % (free.length || 1)]; const r = roomNm(roomOf(b)) || 'castle';
      if (who) out.push({ id: `g-cc-${b.id}`, day, who, line: CC_SAY[(day + i) % CC_SAY.length](r.toLowerCase()), room: roomOf(b), copycat: true }); });
    return out;
  }
  function talk(who, aside) {
    const w = sv(), day = w.day, b = w.bonds, ties = content().ties || {};
    // One running-joke aside per chat at most, then the usual talk: Chad's "another world" story (from day 6 on), then a
    // line about Pell's height (after you've met him). Each person says each once.
    const ci = content().chadIsekai || {}, pq = (content().pellTall || {}).quips || {};
    // Running jokes are idle gossip (Ladi, Nov 18): never when someone has their own business for you, and at most
    // TOPIC_CAP people on the same topic a day, so the whole town never talks about one person at once.
    const idle = !aside && run && run.phase === 'day' && !workFor(who), said = (w.topicDay = w.topicDay || {});
    const room = k => !said[k] || said[k][0] !== day || said[k][1] < TOPIC_CAP;
    const note = k => { said[k] = said[k] && said[k][0] === day ? [day, said[k][1] + 1] : [day, 1]; };
    // A friend's secret (trust 40, from day 2): once each, before the usual talk.
    const sec = (content().secrets || {})[who];
    if (idle && sec && day >= 2 && B.trust(b, who) >= 40 && !(w.told = w.told || {})[who]) {
      w.told[who] = 1; S.persist();
      return sayAll([['seoyeon', `(${nm(who)} lowers their voice.)`]].concat(sec), () => setTimeout(() => talk(who, 1), 90));
    }
    if (idle && ci[who] && day >= ci[who][0] && !(w.chadq = w.chadq || {})[who] && room('chad')) {
      w.chadq[who] = 1; note('chad'); S.persist();
      return sayAll([[who, ci[who][1]]], () => setTimeout(() => talk(who, 1), 90));
    }
    if (idle && w.metPell && pq[who] && !(w.pellq = w.pellq || {})[who] && room('pell')) {
      w.pellq[who] = 1; note('pell'); w.pellReply = who; S.persist();
      return sayAll([[who, pq[who][0]]], () => setTimeout(() => talk(who, 1), 90));
    }
    gain(who, () => B.chat(b, who));
    // What you could do with this person: errands you're on that stop here, jobs they'd give you, a quick job. With two
    // or more, you pick (Ladi, Nov 18: Kai on day 3 has two).
    const opts = [];
    for (const q of quests()) {
      const s = qstate(q.id), st = s.step >= 0 && !s.done && q.steps[s.step];
      if (s.done) continue;
      if (st && st.at && st.at.who === who) opts.push({ label: `Carry on: ${jobName(q)}`, go: () => step(q) });
      else if (s.step < 0 && q.giver === who && openOn(q, day)) opts.push({ label: q.kind === 'capstone' ? 'The ninth night' : `New job: ${jobName(q)}`, go: () => offer(q) });
    }
    const mini = run && run.phase === 'day' ? miniFor(who) : null;
    if (mini) opts.push({ label: `${mini.teach ? 'Lesson' : 'Quick job'}: ${jobName(mini)}`, go: () => miniOffer(mini) });
    if (opts.length > 1) {
      const o = overlay(`${line(who, 'What can I do for you, warden?')}<div class="ww-ch">${opts.map((v, k) => `<button data-o="${k}">${esc(v.label)}</button>`).join('')}</div>
        <div class="row"><button class="ghost" data-a="x">Just saying hello</button></div>`);
      o.querySelector('[data-a=x]').onclick = close;
      o.querySelectorAll('[data-o]').forEach(el => el.onclick = () => { close(); setTimeout(opts[+el.dataset.o].go, 90); });
      return;
    }
    if (opts.length) return opts[0].go();
    const wx = WW.weather(day, run && run.phase === 'night' ? 'night' : 'day');
    const g = gossipFor(who, day, wx);
    if (g && g.tie) { B.shift(b, g.tie.a, g.tie.b, g.tie.to); (w.known = w.known || {})[pair(g.tie.a, g.tie.b)] = g.tie.to; }
    // What's pressing for them comes first (today's line). Once you've heard it, they idle: town news they've picked
    // up from whoever they met (Ladi, Nov 18: a real community), else their everyday line.
    const gh = (w.gheard = w.gheard || {});
    let said0 = g && gh[g.id] !== day ? g.line : null;
    if (g) gh[g.id] = day;
    if (!said0 && run && run.phase === 'day') said0 = newsFor(who);
    const shopOpen = who === 'kagemaru' && day >= 2;
    if ((WATCHERS[who] && day >= HIRE_DAY || shopOpen) && run && run.phase === 'day' && day <= 9) {
      const paid = (w.hires = w.hires || {})[who] || 0, cost = HIRE[paid], area = WW.scene(WATCHERS[who]).name;
      const hiring = WATCHERS[who] && day >= HIRE_DAY, lv = ward(who), friend = PARTY.includes(who);
      const o = overlay(`${line(who, said0 || everyday(who, day))}${hiring ? line(who, wardLine(who, area, lv, Math.min(2, paid))) : ''}
        <div class="row"><button class="ghost" data-a="x">Bye</button>${lessonBtn(who)}${shopOpen ? '<button class="ghost" data-a="s">Shop</button>' : ''}${hiring && cost && !friend ? `<button class="primary" data-a="h" ${w.silver < cost ? 'disabled' : ''}>Hire · ${cost} silver</button>` : ''}</div>`);
      o.querySelector('[data-a=x]').onclick = close;
      const sb = o.querySelector('[data-a=s]'); if (sb) sb.onclick = shop;
      const lb = o.querySelector('[data-a=l]'); if (lb) lb.onclick = () => { close(); setTimeout(() => lesson(who), 90); };
      const h = o.querySelector('[data-a=h]');
      if (h) h.onclick = () => { w.silver -= cost; w.hires[who] = paid + 1; S.persist(); close(); };
      return;
    }
    if (who === 'pell' || !run || run.phase !== 'day') return sayAll([[who, said0 || (who === 'pell' ? 'Mind the locks.' : everyday(who, day))]]);
    const o = overlay(`${line(who, said0 || everyday(who, day))}<div class="row"><button class="ghost" data-a="x">Bye</button>${lessonBtn(who)}</div>`);
    o.querySelector('[data-a=x]').onclick = close;
    const lb = o.querySelector('[data-a=l]'); if (lb) lb.onclick = () => { close(); setTimeout(() => lesson(who), 90); };
  }
  // A job's name for the picker: its AWS topic, from the first words of its question (Ladi: name the service outright).
  function jobName(q) {
    if (q.kind === 'duty') return 'the harvest feast';
    const a = q.q ? q : ((q.steps || []).find(v => v.ask) || {}).ask;
    return a && a.q ? a.q.split('. ')[0] : 'a favour';
  }
  function offer(q) {
    const w = sv(), who = q.giver, s = qstate(q.id);
    if (q.kind === 'capstone') {   // needs ward level 4
      const paid = Math.min(2, (w.hires || {})[who] || 0), trustLv = ward(who) - paid, L = q.lines || {};
      const party = PARTY.includes(who), lv = ward(who), set = party ? (!(w.freed || {})[who] ? L.duty : lv < 4 ? L.trust : L.yes)
        : trustLv < 2 ? L.trust : paid < 2 ? L.pay : L.yes;
      return sayAll((set || ['Not yet.']).map(t => [who, t]), () => { if (party ? lv >= 4 : trustLv >= 2 && paid >= 2) finish(q); });
    }
    const ask = (q.lines && q.lines.offer) || ['Have you got a minute? I could use the watch\'s help.'];
    const o = overlay(`${ask.map(t => line(who, t)).join('')}${q.reward.unlock ? line(who, 'Do this and I\'ll show you a shortcut nobody else uses.') : ''}
      <div class="row"><button class="ghost" data-a="no">Not now</button><button class="primary" data-a="yes">${q.reward.silver ? `Help · ${q.reward.silver} silver` : 'I\'ll help'}</button></div>`);
    o.querySelector('[data-a=no]').onclick = close;
    o.querySelector('[data-a=yes]').onclick = () => { s.step = 0; take(); close(); setTimeout(() => step(q), 90); };
  }
  function miniOffer(mini) {
    const who = mini.who, hello = (content().lessonHello || {})[who];
    // They already know Seo-yeon, just not well yet (Ladi, Nov 18): a plain hello, not "Mira says you're new".
    const intro = mini.teach ? hello || 'Morning, Seo-yeon. Got a minute? I could show you something.' : 'Quick one for the watch, if you\'ve a moment.';
    const o = overlay(`${line(who, intro)}<div class="row"><button class="ghost" data-a="x">Not now</button><button class="primary" data-a="y">${mini.teach ? 'Show me' : 'Help'} · ${COIN} ${mini.silver}</button></div>`);
    o.querySelector('[data-a=x]').onclick = close;
    o.querySelector('[data-a=y]').onclick = () => { if (!mini.teach) take(); close(); setTimeout(() => (mini.teach && mini.demo ? lesson(mini.demo, () => box(mini)) : box(mini)), 90); };
  }
  // Errand steps (Ladi, Nov 18: a cover wants something first). buy: pay for something at a stall. keys: hand out only
  // the keys a job needs, a least-privilege minigame with no wrong-answer penalty.
  function buyStep(who, st, go) {
    const w = sv(), b = st.buy;
    const o = overlay(`${(st.say || []).map(l => line(l[0], l[1])).join('')}<p class="ww-meta">${COIN} ${w.silver}</p>
      <div class="row"><button class="ghost" data-a="x">Not now</button><button class="primary" data-a="b" ${w.silver < b.cost ? 'disabled' : ''}>Buy ${esc(b.item)} · ${b.cost} silver</button></div>`);
    o.querySelector('[data-a=x]').onclick = close;
    o.querySelector('[data-a=b]').onclick = () => { w.silver -= b.cost; S.persist(); close(); toast(`🧺 ${b.item} bought.`); setTimeout(go, 90); };
  }
  function keysStep(who, st, go) {
    const rounds = st.keys; let r = 0, on = {};
    const draw = note => {
      const k = rounds[r];
      const o = overlay(`<p class="ww-t">🔑 ${esc(k.title)}</p>${line(who, k.say)}${note || ''}
        <div class="ww-ch">${k.items.map((it, i) => `<button data-k="${i}" class="${on[i] ? 'on' : ''}" aria-pressed="${!!on[i]}">${on[i] ? '🔑 ' : ''}${esc(it[0])}</button>`).join('')}</div>
        <div class="row"><span class="ww-meta">${r + 1} of ${rounds.length}</span><button class="primary" data-a="g">Hand them over</button></div>`);
      o.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { on[+el.dataset.k] = !on[+el.dataset.k]; draw(note); });
      o.querySelector('[data-a=g]').onclick = () => {
        const bad = k.items.map((it, i) => (!!on[i] !== !!it[1] ? i : -1)).filter(i => i >= 0);
        if (bad.length) return draw(`<p class="ww-no">✗ Not quite. ${bad.map(i => esc(k.items[i][2])).join(' ')}</p>`);
        r++; on = {};
        if (r < rounds.length) return draw(`<p class="ww-ok">✓ ${esc(k.ok || 'Just what the job needs.')}</p>`);
        close(); setTimeout(go, 90);
      };
    };
    draw();
  }
  // ---- The living town (Ladi, Nov 18): everyday lines, lessons, small jobs, trust steps, the Town book ----
  const pair = (a, b) => [a, b].sort().join('|');
  // ---- Town news (Ladi, Nov 18: simulate a real community) ----
  // Something happens (a night's break-ins, a job you finished) and the people who saw it know first. When two people
  // stand together during the day, news passes between them: nearly always between friends, sometimes between
  // acquaintances, rarely when they don't get on. So who's heard what depends on the day's schedules and on ties.
  // Each person tells you a piece of news once, and at most TOPIC_CAP people bring up the same news on one day.
  // w.news: [{ id, day, text, you, good }]; w.knows[id][who] = who told them ('' = saw it themselves).
  const PASS = { warm: 0.9, neutral: 0.45, cool: 0.12 };
  function addNews(id, day, text, you, good, origins) {
    const w = sv(); w.news = (w.news || []).filter(n => n.id !== id && n.day >= day - 3);   // old news fades
    w.news.push({ id, day, text, you, good: !!good });
    const k = (w.knows = w.knows || {}); k[id] = {}; origins.forEach(o => { k[id][o] = ''; });
    Object.keys(k).forEach(x => { if (!w.news.some(n => n.id === x)) delete k[x]; });
  }
  function spread(a, b2) {   // a and b2 stand together: each may pass on what the other hasn't heard
    const w = sv(), k = w.knows || {}, ties = content().ties || {};
    (w.news || []).forEach(n => {
      const m = k[n.id]; if (!m) return;
      [[a, b2], [b2, a]].forEach(([from, to]) => {
        if (!(from in m) || to in m) return;
        if (Math.random() < PASS[B.tie(w.bonds, ties, to, from)] || 0) m[to] = from;
      });
    });
  }
  function townTalk() {   // who's standing together right now (once per pair per day-part)
    const ws = run.walkers.filter(v => !v.ramp && !v.go), part = Math.floor(dayT() * 6);
    run.met = run.met || {};
    for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) {
      const a = ws[i], b2 = ws[j]; if (a.scene !== b2.scene || Math.abs(a.x - b2.x) > 150) continue;
      const key = pair(a.who, b2.who) + '@' + part; if (run.met[key]) continue;
      run.met[key] = 1; spread(a.who, b2.who);
    }
  }
  function newsFor(who) {
    const w = sv(), k = w.knows || {}, told = (w.newsTold = w.newsTold || {}), said = (w.topicDay = w.topicDay || {});
    const n = (w.news || []).slice().reverse().find(x => k[x.id] && who in k[x.id] && !told[x.id + '|' + who] &&
      (!said[x.id] || said[x.id][0] !== w.day || said[x.id][1] < TOPIC_CAP));
    if (!n) return null;
    told[n.id + '|' + who] = 1;
    said[n.id] = said[n.id] && said[n.id][0] === w.day ? [w.day, said[n.id][1] + 1] : [w.day, 1];
    if (n.good) gain(who, () => B.add(w.bonds, who, 2));   // good word about you travels, and so does their regard
    const src = k[n.id][who], lead = !src ? 'Did you hear?' : ['%s says', 'Heard it from %s:', '%s was telling me'][(who.length + n.day) % 3].replace('%s', nm(src));
    const body = n.you || n.text, cap = /[?:]$/.test(lead);
    return `${lead} ${cap ? body.charAt(0).toUpperCase() + body.slice(1) : body}.${n.good ? ' Well done.' : ''}`;
  }
  const everyday = (who, day) => { const L = (content().lines || {})[who]; return L && L.length ? L[(day - 1) % L.length] : 'Evening soon. Be careful up at the castle.'; };
  const lessonBtn = who => { const d = (content().demos || {})[who]; return d ? `<button class="ghost" data-a="l">💡 ${esc(d.title)}</button>` : ''; };
  function miniFor(who) {
    const w = sv(), done = w.minis || {};
    return (content().minis || []).find(m => m.who === who && w.day >= m.opens && w.day <= m.closes && !done[m.id]) || null;
  }
  // What's waiting at someone: a job (quest offer or step), a lesson or a quick job. Drives the markers over heads.
  function workFor(who) {
    const w = sv();
    for (const q of quests()) {
      const s = qstate(q.id); if (s.done) continue;
      if (s.step < 0 && q.giver === who && openOn(q, w.day) && q.kind !== 'capstone') return 'Job';
      if (s.step >= 0) { const t = q.steps[s.step]; if (t && t.at && t.at.who === who) return 'Job'; }
    }
    const m = miniFor(who);
    return m ? (m.teach ? 'Lesson' : 'Quick job') + ' · ' + m.silver + ' silver' : '';   // drawn on the canvas: words, not the coin
  }
  // Trust changes go through here, so crossing a step (friend, close friend...) is announced.
  function gain(who, f) {
    const b = sv().bonds, T = B.TIERS || [], i0 = T.findIndex(x => x[1] === B.tier(B.trust(b, who)));
    f();
    const i1 = T.findIndex(x => x[1] === B.tier(B.trust(b, who)));
    if (i1 > i0 && who !== 'kagemaru') toast(`${nm(who)} now counts you as a ${T[i1][1]}.${T[i1][0] === 40 ? ' They might tell you something tomorrow.' : ''}`);
  }
  // Silver, so a silver coin (Ladi, Nov 19: the gold 🪙 emoji read as gold).
  const COIN = '<span class="ww-coin" aria-hidden="true"></span>';
  function toast(text) {
    if (!wrap) return;
    wrap.querySelectorAll('.ww-toast').forEach(x => x.remove());   // one at a time
    const t = document.createElement('div'); t.className = 'ww-toast'; t.textContent = text; t.setAttribute('role', 'status');
    wrap.appendChild(t); setTimeout(() => t.remove(), 3600);
  }
  // A lesson: picture by picture (content().demos[who]). Seeing one the first time adds a little trust.
  function lesson(who, then) {
    const d = (content().demos || {})[who]; if (!d) { if (then) then(); return; }
    let i = 0;
    const draw = () => {
      const f = d.frames[i], last = i === d.frames.length - 1;
      const o = overlay(`<p class="ww-t">💡 ${esc(d.title)}</p>
        <div class="ww-stage" aria-label="Picture">${(f.tiles || []).map((t, k) => `<div class="ww-tile ${esc(t[2] || '')}" style="--k:${k}"><span class="ww-ti" aria-hidden="true">${esc(t[0])}</span><small>${esc(t[1])}</small></div>`).join('')}</div>
        ${line(f.say[0], f.say[1])}<div class="row"><span class="ww-meta">${i + 1} of ${d.frames.length}</span>${i ? '<button class="ghost" data-a="b">Back</button>' : ''}<button class="primary" data-a="n">${last ? 'Got it' : 'Next'}</button></div>`);
      o.querySelector('[data-a=n]').onclick = () => {
        if (!last) { i++; return draw(); }
        close();
        const w = sv(); w.lessons = w.lessons || {};
        if (!w.lessons[who]) { w.lessons[who] = w.day; gain(who, () => B.add(w.bonds, who, 'lesson')); S.persist(); }
        if (then) setTimeout(then, 90);
      };
      const bk = o.querySelector('[data-a=b]'); if (bk) bk.onclick = () => { i--; draw(); };
    };
    draw();
  }
  // The question box, Night Watch colours: who's asking, the question, shuffled choices, how sure you are, then why.
  // Day 1 (teach): a wrong pick explains itself and you try again. Later: one try.
  function box(m) {
    const order = m.opts.map((x, i) => i).sort(() => Math.random() - 0.5);
    let pick = null;
    qOpen();
    const draw = note => {
      const o = overlay(`${qLine()}<div class="ww-box"><p class="ww-ctx">${face(m.who)}<span>${esc(nm(m.who))}'s ${m.teach ? 'lesson' : 'question'} · ${COIN} ${m.silver}</span></p>
        <p class="ww-q">${esc(m.q)}</p>${note || ''}
        <div class="ww-ch">${order.map(i => `<button data-i="${i}" class="${pick === i ? 'on' : ''}" aria-pressed="${pick === i}">${pick === i ? '✓ ' : ''}${esc(m.opts[i])}</button>`).join('')}</div>
        <div class="ww-conf"><span>${m.teach ? 'Practice: no wrong answers today. How sure are you?' : 'One try. How sure are you?'}</span>
        <div>${['Guess', 'Think so', 'Sure'].map((t, k) => `<button data-c="${k}" ${pick == null ? 'disabled' : ''}>${t}</button>`).join('')}</div></div></div>`);
      o.querySelectorAll('[data-i]').forEach(el => el.onclick = () => { pick = +el.dataset.i; draw(note); });
      o.querySelectorAll('[data-c]').forEach(el => el.onclick = () => answer(+el.dataset.c));
    };
    const answer = conf => {
      const w = sv(), ok = pick === m.a;
      if (!ok && m.teach) { const was = pick; pick = null; return draw(`<p class="ww-no">✗ ${esc((m.no || [])[was] || 'Not quite.')} Try another.</p>`); }
      qShut();
      (w.minis = w.minis || {})[m.id] = ok ? 'ok' : 'miss';
      if (ok) { w.silver += m.silver; gain(m.who, () => B.add(w.bonds, m.who, 'mini')); }
      S.persist();
      const o = overlay(`<div class="ww-box"><p class="${ok ? 'ww-ok' : 'ww-no'}">${ok ? '✓ Right' : '✗ Not this time'}: ${esc(m.opts[m.a])}</p>
        ${!ok && (m.no || [])[pick] ? `<p class="ww-why"><b>Yours:</b> ${esc(m.no[pick])}</p>` : ''}<p class="ww-why">${esc(m.why)}</p>
        ${ok ? `<p class="ww-gold">${COIN} +${m.silver} silver${conf === 0 ? ' · a lucky guess still counts' : ''}</p>` : conf === 2 ? '<p class="ww-meta">You were sure. Worth another look.</p>' : ''}
        <div class="row"><button class="primary" data-a="d">Done</button></div></div>`);
      o.querySelector('[data-a=d]').onclick = () => { close(); if (view && run && run.phase === 'day') view.set('marks', dayMarks()); };
    };
    draw();
  }
  // The Town book: everyone you've met, how much they trust you, where they are now, and who likes whom (what you've
  // overheard or been told).
  function townBook() {
    const w = sv(), b = w.bonds, known = w.known || {};
    // Kagemaru isn't listed (Ladi, Nov 18: he's an odd one, not a neighbour you befriend).
    const HIDE = { kagemaru: 1 };
    const key = p => nm(p).replace(/^(Grandma|Old|The) /, '');
    const met = PEOPLE.filter(p => !HIDE[p] && (p !== 'captain' && p !== 'pell' || b.chatted[p])).concat(['chad']).filter((p, i, a) => a.indexOf(p) === i)
      .sort((x, y) => key(x).localeCompare(key(y)));   // alphabetical by name, so Grandma Wen sits under W (Ladi, Nov 18)
    const here = who => { const v = run && run.walkers && run.walkers.find(x => x.who === who); return v ? (v.ramp ? 'on the way to ' + WW.scene(v.ramp.to.scene).name : WW.scene(v.scene).name) : ''; };
    const ties = who => Object.keys(known).filter(k => k.split('|').includes(who) && !k.split('|').some(x => HIDE[x])).map(k => { const o = k.split('|').find(x => x !== who) || who; return `<span class="ww-tie ${known[k]}">${known[k] === 'warm' ? '♥' : known[k] === 'cool' ? '✗' : '·'} ${esc(nm(o))}</span>`; }).join(' ');
    const o = overlay(`<p class="ww-t">📖 Town book</p><p class="ww-meta">Trust grows when you chat, help and learn. At "friend" people share a secret. ♥ likes, ✗ won't help.</p>
      <div class="ww-book">${met.map(p => { const n = B.trust(b, p); return `<div class="ww-who">${face(p)}<div><b>${esc(nm(p))}</b> <small>${esc(B.tier(n))}${w.hearts[p] ? ' · ❤' : ''}${(w.lessons || {})[p] ? ' · 💡' : ''}${here(p) ? ' · ' + esc(here(p)) : ''}</small>
        <i class="ww-bar" style="--v:${n}"></i>${ties(p) ? `<div class="ww-ties">${ties(p)}</div>` : ''}</div></div>`; }).join('')}</div>
      <div class="row"><button class="primary" data-a="x">Close</button></div>`);
    o.querySelector('[data-a=x]').onclick = close;
  }
  // Walkers: everyone with a day plan moves through the day (js/watch-schedule.js).
  const dayT = () => (run && run.escort ? 0 : Math.max(0, Math.min(1, 1 - clock / dayLen(sv().day))));
  function moveWalkers(dt, snap) {
    const w = sv(), wx = WW.weather(w.day, 'day'), sch = content().schedule || {}, t = dayT();
    run.walkers.forEach(v => {
      const plan = SCH.planFor(sch, v.who, w.day, wx); if (!plan) return;
      const pl = SCH.placeAt(plan, t), to = SCH.resolve(WW, pl); if (!to) return;
      v.place = typeof pl === 'string' ? pl : pl.at;
      if (snap) { v.scene = to.scene; v.x = to.x; v.ramp = null; v.go = false; }
      else SCH.step(WW, v, to, dt, WV.rampPath);
    });
  }
  // Rain indoors (Ladi, Nov 19): on a rain or storm day, whoever has reached a building waits inside it, out of sight.
  // Knock at its door to see who's in and pick who to talk to. Seymour stays out in his armour; people walking between
  // places are still out on the road.
  const WET = { rain: 1, storm: 1 }, INDOOR_KINDS = { fix: 1, place: 1 };
  function indoors(v) {
    if (!WET[WW.weather(sv().day, 'day')] || v.who === 'seymour' || v.go || v.ramp || !v.place) return null;
    const sp = WW.spot(null, v.place);
    return sp && INDOOR_KINDS[sp.kind] && sp.level === v.scene ? v.place : null;
  }
  function knock(spot) {
    const who = (run.indoor || {})[spot.id] || [];
    const o = overlay(`<p class="ww-t">${esc(spot.label || 'Door')}</p><p class="ww-q">${(run.knocked || {})[spot.id] ? 'You\'re still dripping by the door.' : 'You knock, and someone lets you in out of the rain.'}${who.length > 1 ? ' Who do you want to talk to?' : ''}</p>
      <div class="ww-ch">${who.map(k => `<button data-w="${esc(k)}">${face(k)} ${esc(nm(k))}${workFor(k) ? ` · ${esc(workFor(k))}` : ''}</button>`).join('')}</div>
      <div class="row"><button class="ghost" data-a="x">Back out into the rain</button></div>`);
    o.querySelector('[data-a=x]').onclick = close;
    o.querySelectorAll('[data-w]').forEach(b => b.onclick = () => { close(); (run.knocked = run.knocked || {})[spot.id] = 1; talk(b.dataset.w); });
  }
  function syncPeople() {
    const ppl = {};
    Object.keys(run.crowd || {}).forEach(k => { ppl[k] = run.crowd[k].slice(); });
    run.indoor = {};
    run.walkers.forEach(v => { v.inside = indoors(v); if (v.inside) (run.indoor[v.inside] = run.indoor[v.inside] || []).push(v.who); else if (!v.ramp) (ppl[v.scene] = ppl[v.scene] || []).push(v); });
    run.ppl = ppl;
    if (view) { view.set('people', ppl); view.set('climbers', run.walkers.filter(v => v.ramp)); }
  }
  function dayMarks() {
    if (!run || !run.walkers) return [];
    // While Mira walks you in, a marker shows only once she's heading to that person's stop (Ladi, Nov 18: Coo's
    // marker appears as soon as the hint says she wants to show you the post office).
    const tut = content().tutorial || [], shown = {};
    if (run.escort) tut.slice(0, (run.tut || 0) + 1).forEach(t => { const sp = WW.spot(null, t.at); if (sp && sp.who) shown[sp.who] = 1; });
    const doors = Object.keys(run.indoor || {}).map(id => { const sp = WW.spot(null, id), ws = run.indoor[id];
      return sp && { scene: sp.level, x: sp.x, text: '🚪 ' + ws.map(nm).join(', ') + (ws.some(workFor) ? ' · Job' : ''), color: '#9bb7d4', h: 178 }; }).filter(Boolean);
    return doors.concat(run.walkers.filter(v => !v.ramp && !v.inside && (!run.escort || shown[v.who])).map(v => { const k = workFor(v.who); return k ? { scene: v.scene, x: v.x, text: k, color: '#e9c56d', h: 128 } : null; }).filter(Boolean));
  }
  // Meetups: two people together on your road, and you close by. You overhear them once; the Town book learns their tie.
  function meetups() {
    const w = sv(), st = run.st; w.heard = w.heard || {};
    for (const m of content().meetups || []) {
      const id = pair(m.a, m.b); if (w.heard[id]) continue;
      const a = run.walkers.find(v => v.who === m.a && !v.ramp && v.scene === st.scene), b2 = run.walkers.find(v => v.who === m.b && !v.ramp && v.scene === st.scene);
      if (!a || !b2 || a.go || b2.go || Math.abs(a.x - b2.x) > 150 || Math.abs((a.x + b2.x) / 2 - st.x) > 240) continue;
      w.heard[id] = 1; (w.known = w.known || {})[id] = m.tie || (B.tie(w.bonds, content().ties || {}, m.a, m.b));
      S.persist();
      return sayAll([['seoyeon', `(She overhears ${nm(m.a)} and ${nm(m.b)}.)`]].concat(m.lines));
    }
  }
  // What a watcher says about the ninth night, in their own words, instead of a ward-level readout (Ladi: keep tips as gossip).
  function wardLine(who, area, lv, paid) {
    if (PARTY.includes(who)) {   // friends: no silver. What's in the way is the feast, then how much they know of the castle.
      if (!(sv().freed || {})[who]) return `I'd watch the ${area} for you in a heartbeat. But I've a job at the harvest feast that night. Find someone to take it and I'm yours.`;
      return [, , `The ${area} on the ninth night is mine. I'll mark every break-in for you. Help me with what's bothering me and I'll do more.`,
        `I'll fix a break-in in the ${area} myself before you get there. One more thing sorted and I'll take it all.`,
        `The ${area} on the ninth night? Leave it to me. All of it.`][lv];
    }
    const say = [`On the ninth night? I could keep an eye on the ${area}, I suppose. Can't promise much. I hardly know you.`,
      `On the ninth night I'd watch the ${area} and tell you how many got in. That's about all.`,
      `On the ninth night I'd mark every break-in round the ${area} for you.`,
      `On the ninth night I'd fix a break-in in the ${area} myself before you got there.`,
      `The ${area} on the ninth night? Leave it to me. All of it.`][lv];
    const more = lv >= 4 ? '' : paid < 2 && B.trust(sv().bonds, who) < 60 ? ' Silver helps. A friend helps more.' : paid < 2 ? ' Silver would help.' : ' I\'d do more for a friend.';
    return say + more;
  }
  function step(q) {
    const w = sv(), s = qstate(q.id), st = q.steps[s.step], ties = content().ties || {};
    if (!st) return finish(q);
    const who = st.at && st.at.who;
    const go = () => {
      s.step++; S.persist();
      if (s.step >= q.steps.length) return finish(q);
      const n = q.steps[s.step];
      const here = st.at || {}, there = n.at || {};   // the same person, or the same spot, carries straight on
      if (who ? there.who === who : !there.who && ((here.spot && there.spot === here.spot) || (here.room && there.room === here.room && there.floor === here.floor))) step(q);
    };
    const body = () => {
      // Out of daylight between two questions (Ladi, Nov 18): keep your place in the job and head for dusk.
      if (st.ask && run && run.phase === 'day' && clock <= 0) {
        run.over = 1;
        return sayAll([['seoyeon', 'The light\'s going. I\'ll pick this up tomorrow, right where I left it.']], () => dusk());
      }
      if (st.buy) return buyStep(who, st, go);
      if (st.keys) return keysStep(who, st, go);
      if (st.ask) {
        const tries = B.trust(w.bonds, q.giver) >= 80 ? 1 : 0;   // trust 80 perk: a second try after the explanation
        choose(nm(q.giver) + '\'s question', st.ask, tries, ok => { if (ok) go(); else { B.add(w.bonds, q.giver, 'wrong'); S.persist(); } }, q.giver);
      } else sayAll(st.say || [], go);
    };
    if (who && who !== q.giver && !(s.met || {})[who]) {   // a referral: once per person per job, not every step
      const r = B.refer(w.bonds, ties, who, q.giver), help = st.help || {};
      if (r.band === 'deny') {
        const v = B.vouchers(w.bonds, ties, who, q.giver, PEOPLE);
        const o = overlay(`${line(who, help.deny || `${nm(q.giver)} sent you? Then no.`)}${bars(r)}${line('tess', `Psst! Once ${nm(who)} says no about ${nm(q.giver)}, being nice won't change it. Nothing will. ` + (v.length ? `But ${v.map(nm).join(' or ')} gets on with both of them. Get them to send you instead!` : 'Nobody can talk them round today. Try another day!'))}<div class="row"><button class="primary" data-a="d">OK</button></div>`);
        o.querySelector('[data-a=d]').onclick = close;
        return;
      }
      const first = !w.seenReferral; w.seenReferral = true;
      const o = overlay(`${line(who, r.band === 'high' ? `Anyone ${nm(q.giver)} sends is welcome. ${help.high || ''}` : r.band === 'low' && st.proof !== false ? 'I don\'t know you well. Prove you know your stuff first.' : `${nm(q.giver)} sent you? All right.`)}${bars(r)}
        ${first ? line('pell', 'Same as the castle locks: both doors have to open, and one bolt shuts it.') : ''}<div class="row"><button class="primary" data-a="d">Go on</button></div>`);
      const proof = () => {   // low band: one review question first (doc: Relationships)
        const pool = content().reviews || [], rv = pool.find(x => x.id === help.low) || pool.find(x => x.day <= w.day);
        if (r.band !== 'low' || !rv || st.proof === false) return body();
        choose(nm(who) + ' wants proof', rv, 0, ok => { if (ok) { B.add(w.bonds, who, 'chat'); setTimeout(body, 90); } }, who);
      };
      o.querySelector('[data-a=d]').onclick = () => { close(); (s.met = s.met || {})[who] = 1; S.persist(); setTimeout(proof, 90); };
      return;
    }
    body();
  }
  function shop() {
    // GuardDuty is priced like the real thing (Ladi, Nov 18): the first night is a free trial, then it costs by how much
    // it watches, 8 silver per break-in due tonight.
    const gdCost = () => (w.guardTrial ? GD_EACH * breaches(w.day).length : 0);
    const w = sv(), price = it => it.id === 'guard' ? (w.guardTrial ? B.price(w.bonds, 'kagemaru', gdCost()) : 0) : B.price(w.bonds, 'kagemaru', it.cost);
    const o = overlay(`${line('kagemaru', 'Take a look. Quality gear.')}<p class="ww-meta">${COIN} ${w.silver} · spare tools ${w.tools || 0} · revokes ${w.writs || 0}${w.unlocks.outpost ? ' · outpost built' : ''}</p>
      <div class="ww-ch">${SHOP.filter(it => it.id === 'tools' || it.id === 'writ' || it.id === 'guard' || it.id === 'watch1' || it.id === 'watch2' || w.toldHire)
        .filter(it => !(it.id === 'guard' && (w.day >= 9 || w.guard === w.day)))
        .filter(it => !(it.id === 'watch1' && (w.watchUp || 0) >= 1) && !(it.id === 'watch2' && ((w.watchUp || 0) < 1 || w.watchUp >= 2)))
        .map(it => { const lockd = it.id === 'watch2' && !kageDone();
          return `<button data-b="${it.id}" ${lockd || w.silver < price(it) || (it.id === 'outpost' && w.unlocks.outpost) ? 'disabled' : ''}><b>${esc(it.name)} · ${it.id === 'guard' && !w.guardTrial ? 'free trial tonight' : price(it)}</b><br><small>${esc(lockd ? 'Do a job for Kagemaru first' : it.id === 'guard' ? it.what + ` (${w.guardTrial ? `8 per break-in, ${breaches(w.day).length} due` : 'then 8 silver per break-in due'})` : it.what)}</small></button>`; }).join('')}</div>
      <div class="row"><button class="ghost" data-a="x">Done</button></div>`);
    o.querySelector('[data-a=x]').onclick = close;
    o.querySelectorAll('[data-b]').forEach(el => el.onclick = () => {
      const it = SHOP.find(v => v.id === el.dataset.b);
      if (it.id === 'post') {   // pick the area it lights
        const o2 = overlay(`<p class="ww-t">Where should the lantern post go?</p><div class="ww-ch">${Object.values(WATCHERS).filter(a => !(w.posts || {})[a]).map(a => `<button data-p="${a}">${esc(WW.scene(a).name)}</button>`).join('')}</div><div class="row"><button class="ghost" data-a="x">Back</button></div>`);
        o2.querySelector('[data-a=x]').onclick = shop;
        o2.querySelectorAll('[data-p]').forEach(b => b.onclick = () => { w.silver -= price(it); (w.posts = w.posts || {})[b.dataset.p] = 1; S.persist(); shop(); });
        return;
      }
      w.silver -= price(it);
      if (it.id === 'tools') w.tools = (w.tools || 0) + 1;
      if (it.id === 'writ') w.writs = (w.writs || 0) + 1;
      if (it.id === 'guard') { w.guard = w.day; w.guardTrial = 1; }   // good for tonight (Ladi, Nov 18: optional, every night but the last)
      if (it.id === 'watch1' || it.id === 'watch2') w.watchUp = (w.watchUp || 0) + 1;
      if (it.id === 'outpost') { w.unlocks.outpost = 1; if (run) run.st.unlocks.outpost = 1; }
      S.persist(); shop();
    });
  }
  function finish(q) {
    const w = sv(), s = qstate(q.id), r = q.reward || {};
    s.done = true;
    w.silver += r.silver || 0;
    if (r.heart) w.hearts[q.giver] = 1;
    if (r.heart) (w.helped = w.helped || {})[q.giver] = ((w.helped || {})[q.giver] || 0) + 1;
    if (r.free) (w.freed = w.freed || {})[q.giver] = 1;   // a cover found for their feast job
    if (r.writs) w.writs = (w.writs || 0) + r.writs;   // free Revoke active sessions (Kagemaru's price-list quest)
    if (r.unlock === 'seal-floor' && r.floor) (w.sealed = w.sealed || {})[r.floor] = r.permanent ? 'all' : w.day;   // no breaches there
    else if (r.unlock) { w.unlocks[r.unlock] = 1; if (run) run.st.unlocks[r.unlock] = 1; }
    gain(q.giver, () => B.add(w.bonds, q.giver, q.kind === 'small' ? 'small' : 'trust'));
    {   // word gets round: the giver tells their friends, who pass it on (the giver thanks you in person, so not again)
      const id = 'q-' + q.id;
      addNews(id, w.day, `the warden sorted out a problem for ${nm(q.giver)}`, `you sorted out a problem for ${nm(q.giver)}`, true, [q.giver]);
      (w.newsTold = w.newsTold || {})[id + '|' + q.giver] = 1;
      (((content().ties || {})[q.giver] || {}).warm || []).forEach(f => { if (f !== 'seoyeon') w.knows[id][f] = q.giver; });
    }
    S.persist();
    const o = overlay(`<p class="ww-ok">Quest done</p><p>${COIN} +${r.silver || 0} silver${r.heart ? ' · ❤ ' + esc(nm(q.giver)) + '\'s trust' : ''}${r.writs ? ' · 📜 ' + r.writs + ' free Revoke active sessions' : ''}${r.unlock === 'seal-floor' ? ' · the ' + esc(r.floor || '') + ' sealed ' + (r.permanent ? 'for good' : 'tonight') : r.unlock ? ' · new shortcut: ' + esc(r.unlock.replace('-', ' ')) : ''}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
    o.querySelector('[data-a=d]').onclick = close;
  }

  // ---- The day ----
  async function morning() {
    const w = sv();
    B.newDay(w.bonds, w.day);
    music('watchMorning');
    if (w.day >= 2 && w.reviewed !== w.day) { w.reviewed = w.day; S.persist(); await review(); }   // once a day: leaving and coming back doesn't ask again (Ladi, Nov 18)
    if (w.day >= HIRE_DAY && !w.toldHire) await tellHire();
    walk('day');
  }
  // Hiring stays hidden until Mira explains the ninth night (Ladi, Nov 18: day 1 had too much, too early).
  function tellHire() {
    const w = sv(); w.toldHire = 1; S.persist();
    return new Promise(res => {
      const b = U.panel(`<p class="ww-top">Day ${w.day} · Morning</p>
        ${line('mira', 'The Captain thinks all these break-ins are practice. On the ninth night, the full moon, the thief tries for everything at once.')}
        ${line('mira', 'You can\'t be everywhere that night. Ask people to keep watch over their own corner of town or the castle. Pay helps, but people work hardest for someone they trust.')}
        <div class="row"><button class="primary" id="ww-hn">Got it</button></div>`, { title: 'THE NIGHT WATCH' });
      b.querySelector('#ww-hn').onclick = res;
    });
  }
  async function review() {
    const w = sv(), pool = (content().reviews || []).filter(r => r.day <= w.day && !(w.asked || {})[r.id]);
    const n = w.day === 2 ? 1 : 2;
    let right = 0, asked = 0;
    if (pool.length) {
      for (const r of pool.slice(0, n)) {
        asked++; (w.asked = w.asked || {})[r.id] = 1;
        const ok = await new Promise(res => {
          const b = U.panel(`<p class="ww-top">Day ${w.day} · Mira's review</p>${line('mira', r.q)}<div class="ww-ch">${r.choices.map((c, i) => `<button data-i="${i}">${esc(c)}</button>`).join('')}</div>`, { title: 'THE NIGHT WATCH' });
          b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
            const good = +el.dataset.i === r.answer;
            const b2 = U.panel(`<p class="${good ? 'ww-ok' : 'ww-no'}">${good ? '✓ Right' : '✗ Not quite'}: ${esc(r.choices[r.answer])}</p><p class="ww-why">${esc(r.why)}</p><div class="row"><button class="primary" id="ww-n">Next</button></div>`, { title: 'THE NIGHT WATCH' });
            b2.querySelector('#ww-n').onclick = () => res(good);
          });
        });
        if (ok) right++;
      }
    } else {
      const r = M.pick({ match: q => SD.exam && SD.exam.domainOf(q) === 2, n, verifiedOnly: true, mix: 0 });
      for (const it of r.items || []) {
        const q = SD.exam.find(it.q); if (!q) continue;
        asked++;
        const a = await M.ask(q, { tally: M.newTally(), title: 'MIRA\'S REVIEW' });
        if (a && a.ok) right++;
      }
    }
    if (asked) w.silver += PAY.review + PAY.each * right;
    S.persist();
  }

  // ---- Walking (day, dusk and night share this) ----
  // ---- Music (Ladi's Mureka takes, Nov 17 and 19; CREDITS.md). Nights 1 to 8 play the night track and night 9 the
  // Long Night's own (Nov 19); storm days use the rain-day theme. Stings are the songs' own endings, so they resolve; a fix or a miss
  // plays the generic synth correct and wrong stings over the night track (Ladi, Nov 18). ----
  const AU = SD.audio;
  if (AU) AU.add({
    songs: { watchDay: 'm-watch-day', watchRain: 'm-watch-day-rain', watchWalkin: 'm-watch-walkin', watchDusk: 'm-watch-dusk', watchNight: 'm-watch-night', watchLongNight: 'm-watch-longnight', watchMorning: 'm-watch-morning' },
    jingles: { watchDawn: 'j-watch-dawn', watchEndLanterns: 'j-watch-end-lanterns', watchEndMorning: 'j-watch-end-morning', watchEndFall: 'j-watch-end-fall' }
  });
  const tune = phase => {
    const w = sv(), wx = WW.weather(w.day, 'day');
    return phase === 'night' ? (w.day === 9 ? 'watchLongNight' : 'watchNight') : phase === 'dusk' ? 'watchDusk'
      : run && run.escort ? 'watchWalkin' : wx === 'rain' || wx === 'storm' || wx === 'mist' ? 'watchRain' : 'watchDay';
  };
  const music = name => { if (AU) AU.music(name, true); };
  const jingle = (name, then) => { if (AU) AU.jingle(name, then); };

  function walk(phase, opts) {
    opts = opts || {};
    const w = sv();
    if (view) view.stop();
    busy = false;   // a new screen replaces any open talk
    const at0 = w.at && w.at.day === w.day && w.at.phase === phase ? w.at : null;   // coming back: where you stood
    if (at0 && opts.resume && at0.scene && WW.scene(at0.scene) && at0.x != null) opts = Object.assign({}, opts, { scene: at0.scene, x: at0.x });
    const st = WW.create({ scene: opts.scene || (phase === 'night' ? 'castle:ground' : phase === 'dusk' ? 'west-road' : 'main-street'),
      x: opts.x != null ? opts.x : phase === 'night' ? (WW.artSync(), WW.ENTRY_X) : phase === 'dusk' ? 3180 : 600, unlocks: w.unlocks, phase, night: w.day });
    run = { phase, st, list: phase === 'night' ? breaches(w.day) : [], tries: {}, locked: {}, fixed: {}, bell: 0, ward: {} };
    if (phase === 'night') { lightFuses(run.list, w.day); const pl = applyPlan(run.list, w.day); run.list = pl.list; run.planNotes = pl.notes; run.planKept = pl.kept; }
    // Where you left off (Ladi, Nov 18: leaving and coming back must not refill the clock). w.at holds the day, the
    // phase, the time left and the tutorial step; it only counts for the same day and phase.
    const at = w.at && w.at.day === w.day && w.at.phase === phase ? w.at : null;
    run.tut = at ? at.tut || 0 : 0;
    if (at && at.locked) run.locked = Object.assign({}, at.locked);
    run.escort = phase === 'day' && w.day === 1 && run.tut < (content().tutorial || []).length;   // Mira walks you in on day 1 (Ladi, Nov 18)
    music(tune(phase));
    if (phase === 'night' && w.day === 9) {   // ward levels act before you arrive (doc: Ward level)
      Object.keys(WATCHERS).forEach(k => {
        const lv = ward(k), mine = run.list.filter(x => x.scene === WATCHERS[k]);
        run.ward[WATCHERS[k]] = lv;
        if (lv >= 4) mine.forEach(x => { run.fixed[x.id] = 'ward'; });
        else if (lv >= 3 && mine[0]) run.fixed[mine[0].id] = 'ward';
      });
    }
    clock = phase === 'night' ? nightS(w.day) : phase === 'day' ? dayLen(w.day) : 0;
    if (at && at.left != null) clock = Math.max(0, Math.min(clock, at.left));
    run.list.forEach(x => { if (w.fixed[x.id] && !run.fixed[x.id]) run.fixed[x.id] = 1; });   // tonight's fixes so far
    w.at = { day: w.day, phase, left: clock, tut: run.tut, locked: run.locked, scene: st.scene, x: Math.round(st.x) };
    const keep = () => {
      if (run && run.st === st && w.at && w.at.phase === phase) {
        Object.assign(w.at, { left: Math.ceil(clock), tut: run.tut || 0, locked: run.locked, scene: st.scene, x: Math.round(st.x) });
      }
      S.persist();
    };
    run.keep = keep; S.persist();
    const b = U.panel(`<p class="ww-top" id="ww-top"></p><div class="ww-wrap"><div class="ww-view"></div></div>
      <div class="row"><button class="ghost" id="ww-quit">Save and leave</button><button class="ghost" id="ww-book">📖 Town</button><button class="ghost" id="ww-end">${phase === 'night' ? 'End the night' : phase === 'day' ? 'End the day' : ''}</button></div>`, { title: 'THE NIGHT WATCH', cls: 'ww-full' });
    wrap = b.querySelector('.ww-wrap');
    const top = b.querySelector('#ww-top'), endB = b.querySelector('#ww-end');
    if (phase === 'dusk') endB.hidden = true;
    b.querySelector('#ww-quit').onclick = () => { keep(); if (view) view.stop(); view = null; M.open && M.open(); };
    endB.onclick = () => (phase === 'night' ? dawn() : dusk());
    b.querySelector('#ww-book').onclick = () => { if (!busy) townBook(); };
    // Search (Ladi, Nov 18): every night, a break-in only shows when she's within 220px, so finding one takes walking.
    // On the Long Night a watcher at ward 2 or an outpost shows their whole area.
    // Search (Ladi, Nov 19: back to seeing them from anywhere on the floor): a break-in shows from across the floor,
    // except while a snuffer has her lantern out (90px). A forger's all-clear makes one look fixed till she's on it.
    const seen = x => (w.day === 9 && ((run.ward[x.scene] || 0) >= 2 || (w.posts || {})[x.scene])) || !(run.dark > 0) || Math.abs(x.x - st.x) < 90;
    const fooled = x => x.forged && Math.abs(x.x - st.x) >= 40;
    const gone = () => phase === 'night' ? nightS(w.day) - clock : 0;   // seconds into the night
    const up = x => !x.at || gone() >= x.at;                                 // has this break-in started yet?
    const fuseLeft = x => (x.fuse ? x.at + x.fuse - gone() : Infinity);
    const mm = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
    // Intruders (Ladi, Nov 18): 5 to 10 seconds after a lock gives, someone gets in. They don't start at their break-in
    // (that would give it away): they come down a stair on any floor, or in off the bridge, and move through the castle
    // as she does, by the stairs and the bridge door, until you close the hole they came through.
    //   Objective: each picks a room to rob and heads there. After 8s rummaging, their break-in's fuse loses 15s.
    //   Chase: one that sees her lit lantern on its floor runs at her. Standing still in a doorway hides her, and so does
    //   a doused lantern (but then she can't see break-ins either).
    //   Kinds, each with its own penalty (Ladi: "the extreme ones... slower walking, less aware"):
    //     pickpocket: quick, sharp-eyed. Snatches a spare tool, else 10 silver.
    //     snuffer: blows out her lantern: break-ins show only from 90px for 15s.
    //     spiller: never chases, shies away; leaves puddles of lamp oil that slow her to 40% for a moment.
    //     jailer (night 6 on): slow, short-sighted, sees only ahead. Locks her in a closet: the night ends there. On the
    //       Long Night, it costs 2 minutes instead. Easy to outwalk, unless a spiller's puddle slows her down.
    //     impersonator (night 5 on): dressed as feast staff. Real staff carry a tray or sack along their route; this
    //       one has empty hands and wanders where staff never go. It drops the act within 110px and grabs 15 silver
    //       (or a spare tool). Anyone can look right: check what they're doing.
    //   More kinds (Ladi, Nov 18: cover every section of the security domain, and mix them so no two nights match):
    //     replayer (2.1.4 SigV4): heads for the lock you just fixed. Gets there within 60s and the fix comes undone,
    //       the way a copied signed request works only while it's fresh.
    //     escalator (2.1.6, 2.1.8): starts slow and stuck on its floor. Each room it robs gives it more rights: the
    //       stairs, then speed, then it grabs like a pickpocket.
    //     eavesdropper (2.2.1, 2.2.3): lurks at a stair. Pass within earshot and it calls out where she is: every
    //       intruder makes for her for 15s.
    //     exfiltrator (2.3.1, 2.3.5): robs one room, then makes for the far end of the bridge. Out: 20 silver gone.
    //       Stand in its way and you catch it: the loot back and 10 silver.
    //     turncloak (2.1.5 roles and STS, 2.2.6 cross-account; Ladi wanted roles to feel unlike the impersonator):
    //       comes over the bridge from the neighbour's side, takes a watch cloak at the wardrobe (assumes a role) and
    //       robs rooms in it, twice as fast. The cloak is temporary credentials: for 45s its pass checks out and you
    //       can't stop it. When the session runs out it walks back to the wardrobe to renew, and on that walk (and
    //       the 4s at the rack) you can catch it. Revoke active sessions, the real IAM role button, works any time.
    //     rummager (2.1.7, 2.3.6): stays on its floor and opens every drawer, twice as fast, and every break-in on that
    //       floor burns 10s faster each time.
    //     forger (2.2.2, 2.2.5): hangs a forged all-clear seal on an open break-in: it reads "All clear" until she's within 40px.
    //     secret-hunter (2.3.2, 2.3.3): quick, sharp-eyed. Grabs her notes: her next question has half the thinking time.
    //   Long Night: each break-in's intruder is a coin flip, its section's kind or a random one.
    //   Not on night 1. All of them get a little faster each night.
    //   Not on night 1. All of them get a little faster each night.
    //   Busy map (Ladi, Nov 18: "not a lot of space to walk around"): at most 3 intruders inside at once, one new kind
    //   a night, at most 3 kinds a night, one jailer, and the kind's name shows only when it's close.
    // Feast staff (from night 1, Ladi: so the first impersonator isn't confusing; 2 from night 6): a cook on the ground floor (great hall to the cellar stair, for the tavern below) and a porter in the
    // cellars (barracks stores to the stair). Not security, so no help, and squeezing past one slows her a little.
    const KINDS = {
      pickpocket: { sp: 95, sight: 260, rush: 1.4, in: '👣 Light, quick footsteps. Someone\'s in, after your pockets.' },
      snuffer: { sp: 85, sight: 220, rush: 1.3, in: '👣 Footsteps, and a draught. Someone\'s in who hates a lantern.' },
      spiller: { sp: 70, sight: 0, rush: 1, in: '👣 Sloshing footsteps. Someone\'s in, and they\'re spilling something.' },
      jailer: { sp: 52, sight: 150, rush: 1.6, ahead: true, in: '👣 Heavy, slow footsteps, and keys jangling. Stay out of their way.' },
      impersonator: { sp: 62, sight: 110, rush: 2.2, in: '👣 Footsteps that sound like the kitchen staff. But the kitchen\'s short tonight.' },
      replayer: { sp: 90, sight: 0, rush: 1, tag: 'Replayer', in: '👣 Footsteps that sound like yours. Someone\'s copying your every move.' },
      escalator: { sp: 50, sight: 0, rush: 1.3, tag: 'Escalator', in: '👣 Shuffling footsteps. Someone small got in. For now.' },
      eavesdropper: { sp: 60, sight: 0, rush: 1, tag: 'Eavesdropper', in: '👣 Soft footsteps, then nothing. Someone\'s listening on a stair.' },
      exfiltrator: { sp: 75, sight: 0, rush: 1, tag: 'Exfiltrator', in: '👣 Footsteps and an empty sack. Someone\'s here to carry things off.' },
      rummager: { sp: 70, sight: 0, rush: 1, tag: 'Rummager', in: '👣 Drawers sliding open, one after another. Someone\'s rummaging.' },
      forger: { sp: 75, sight: 0, rush: 1, tag: 'Forger', in: '👣 Footsteps, and the smell of sealing wax.' },
      secrethunter: { sp: 88, sight: 220, rush: 1.4, tag: 'Secret-hunter', in: '👣 Quick footsteps, and paper rustling. Someone\'s after your notes.' },
      turncloak: { sp: 78, sight: 0, rush: 1, tag: 'Turncloak', in: '👣 Footsteps on the bridge, from the neighbour\'s side. Someone with their pass is coming for a cloak.' }
    };
    // Two new kinds a night from night 3, at most 3 kinds on any night (Ladi, Nov 18), and every kind before night 9.
    const ROSTER = { 2: ['pickpocket'], 3: ['spiller', 'rummager', 'pickpocket'], 4: ['snuffer', 'forger', 'spiller'],
      5: ['impersonator', 'exfiltrator', 'snuffer'], 6: ['eavesdropper', 'impersonator', 'jailer'], 7: ['escalator', 'secrethunter', 'forger'],
      8: ['replayer', 'turncloak', 'jailer'] };
    const SECTION = { '2.1.1': 'impersonator', '2.1.2': 'impersonator', '2.1.3': 'pickpocket', '2.1.4': 'replayer', '2.1.5': 'turncloak',
      '2.1.6': 'escalator', '2.1.7': 'rummager', '2.1.8': 'escalator', '2.2.1': 'eavesdropper', '2.2.2': 'forger', '2.2.3': 'eavesdropper',
      '2.2.4': 'jailer', '2.2.5': 'forger', '2.2.6': 'turncloak', '2.2.7': 'jailer', '2.3.1': 'exfiltrator', '2.3.2': 'secrethunter',
      '2.3.3': 'secrethunter', '2.3.4': 'snuffer', '2.3.5': 'exfiltrator', '2.3.6': 'rummager' };
    const MAX_IN = 3;
    const BOSS = ['jailer', 'turncloak'];   // the late heavy kinds: at most one each a night, two on the Long Night (Ladi, Nov 18)
    const kindFor = (x, i) => { const n = w.day;
      if (n === 9) {   // the Long Night: half the time the break-in's own section, half the time anyone
        const r = seeded(i * 13 + 9), tied = r() < 0.5, all = Object.keys(KINDS).filter(k => !BOSS.includes(k));
        const k = tied && SECTION[x.skill] ? SECTION[x.skill] : all[Math.floor(r() * all.length)];
        const had = run.list.slice(0, i).filter((v, j) => (v.kind || kindFor(v, j)) === k).length;
        return BOSS.includes(k) && had >= 2 ? 'pickpocket' : k; }
      const R = ROSTER[n] || ['pickpocket'], rest = R.filter(k => !BOSS.includes(k));
      if (R.includes('jailer') && i === 2) return 'jailer';   // one jailer a night
      if (R.includes('turncloak') && i === 4) return 'turncloak';   // and one turncloak
      return rest[(i + n) % rest.length]; };
    const PROWL = ['castle:towers', 'castle:upper', 'castle:ground', 'castle:cellars', 'bridge'];
    const crew = x => (x && x.raid ? x.raid : 'raiders').replace(/^The /, '');
    const exits = id => WW.scene(id).spots.filter(v => (v.kind === 'stair' && !v.needs) || v.id === 'bridge-exit' || v.id === 'bridge-door');
    const bounds = id => { const sc = WW.scene(id); return [sc.from + 30, sc.to - 30]; };
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const ROOMS = () => WW.FLOORS.flatMap(f => WW.CASTLE[f].rooms.map(r => ({ scene: 'castle:' + f, x: (r[1] + r[2]) / 2, name: r[3] })));
    const stuck = p => p.kind === 'rummager' || (p.kind === 'escalator' && p.lvl < 1);   // these keep to their floor
    const goal = p => { p.goal = pick(ROOMS().filter(r => !(p.goal && r.name === p.goal.name) && (!stuck(p) || r.scene === p.scene))) || { scene: p.scene, x: p.x, name: 'hall' }; p.state = 'go'; aim(p); };
    const lurk = p => { const f = pick(PROWL.filter(v => v !== 'bridge')), e = pick(exits(f).filter(v => v.kind === 'stair')) || { x: bounds(f)[0] };
      p.goal = { scene: f, x: e.x + 30, name: 'stair', lurk: 1 }; p.state = 'go'; p.lurkT = 30; aim(p); };
    const forge = p => { const open = run.list.filter(v => up(v) && !run.fixed[v.id] && !run.locked[v.id] && !v.forged && v.scene !== 'bridge' && /^castle:/.test(v.scene));
      const v = pick(open); if (!v) return goal(p); p.goal = { scene: v.scene, x: v.x, name: v.title, forge: v.id }; p.state = 'go'; aim(p); };
    const SESSION = 45, RENEW = 4;
    const cloak = p => { p.goal = { scene: 'castle:upper', x: roomX('castle:upper', 'wardrobe'), name: 'Wardrobe', renew: 1 }; p.state = 'go'; aim(p); };
    const cloakTag = p => p.sess > 0 ? `Turncloak · ⏳ ${Math.ceil(p.sess)}s` : 'Turncloak · session over';
    const movesAt = (scene, e) => WW.moves({ scene, x: e.x, unlocks: {}, phase: 'night' });
    const aim = p => {   // the next x to walk to: the goal room if it's on this floor, else the way out toward it
      if (p.goal.scene === p.scene) { p.tx = p.goal.x; p.exit = null; return; }
      const path = WW.route({ scene: p.scene }, p.goal.scene, {}, 'night'), next = path && path[1];
      const ex = exits(p.scene).filter(e => movesAt(p.scene, e).some(m => m.to.scene === next));
      p.exit = ex.sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0] || pick(exits(p.scene)) || null; p.next = next;
      p.tx = p.exit ? p.exit.x : p.x;
    };
    const syncProwlers = () => { Object.keys(run.ppl).forEach(k => { run.ppl[k] = run.ppl[k].filter(v => !v.night); });
      (run.prowl || []).concat(run.staff || []).forEach(p => (run.ppl[p.scene] = run.ppl[p.scene] || []).push(p)); view.set('people', run.ppl); view.set('puddles', run.puddles || []); };
    const intrude = x => {
      const kind = x.kind = x.kind || kindFor(x, run.list.indexOf(x)), K = KINDS[kind];
      const scene = kind === 'turncloak' ? 'bridge' : pick(PROWL), e = kind === 'turncloak' ? { x: WW.scene('bridge').to - 20 } : pick(exits(scene));
      const mask = kind === 'impersonator';
      const p = { night: 1, who: 'intruder-' + kind,   // the impersonator's sprite wears the cook's whites
        tag: mask ? '' : K.tag || kind.charAt(0).toUpperCase() + kind.slice(1), mask, kind, scene,
        x: e ? e.x : bounds(scene)[0], go: true, d: 0, drip: 0, facing: 1, of: x.id, cool: 3, lvl: 0, sp: K.sp * (1 + 0.04 * Math.min(w.day, 9)) };
      if (kind === 'turncloak') { p.sess = 0; p.who = 'intruder-turncloak-bare'; p.tag = cloakTag(p); }
      if (kind === 'eavesdropper') lurk(p); else if (kind === 'forger') forge(p); else if (kind === 'turncloak') cloak(p); else goal(p);
      run.inside[x.id] = p; (run.prowl = run.prowl || []).push(p); syncProwlers(); toast(K.in);
    };
    // The door queue (Ladi, Nov 18): when one leaves, the next waits 5s, and a backlog comes in one at a time, 5s apart.
    // After Revoke active sessions, nobody new for 10s.
    const QGAP = 5, WRIT_GAP = 10;
    const hold = s2 => { run.gate = Math.max(run.gate || 0, gone() + s2); };
    const leave = (p, line, gap) => { hold(gap || QGAP); run.prowl = (run.prowl || []).filter(v => v !== p);
      Object.keys(run.inside).forEach(k => { if (run.inside[k] === p) run.inside[k] = null; }); syncProwlers(); if (line) toast(line); };
    // Hiding (Ladi, Nov 18): at night, press up at a room's doorway to step into it. Prowlers walk straight past, but she
    // stays put and sees only from where she stands. Left, right or down brings her out.
    const hidden = () => !!st.tucked;
    const tuck = k => {
      if (phase !== 'night' || busy) return true;
      if (k === 'down' && st.tucked) { st.tucked = false; return false; }
      const sp = WW.near(st);
      if (k === 'up' && !st.tucked && sp && sp.kind === 'door') {
        st.tucked = true; st.x = sp.x; st.moving = false;
        if (!w.toldTuck) { w.toldTuck = 1; toast('🚪 Tucked into the doorway. Prowlers walk past you here. Step left or right to come out.'); }
        return false;
      }
      return true;
    };
    const hop = (p, e) => {   // take a stair or the bridge door, as she does
      const ms = movesAt(p.scene, e), m = ms.find(v => v.to.scene === p.next) || pick(ms);
      if (m) { p.scene = m.to.scene; p.x = m.to.x; }
      p.cool = Math.max(p.cool, 1.5); aim(p);
    };
    // Thieves never take her last 20 silver (Ladi, Nov 19: silver shouldn't hit 0 in the Night Watch).
    const PURSE = 20, canTake = n => Math.max(0, Math.min(n, (w.silver || 0) - PURSE));
    const caught = (p, x) => {
      const who = crew(x);
      if (AU) AU.sfx('incorrect');
      if (p.kind === 'jailer') {
        if (w.day === 9) { clock = Math.max(0, clock - 120); toast(`🔒 One of the ${who} shoves you in a closet and turns the key. Two minutes to pick your way out.`); }
        else { run.over = 1; leave(p); busy = true;
          sayAll([['seoyeon', 'They\'ve locked me in the linen closet.'], ['seoyeon', 'Nobody will hear me till the morning shift. That\'s the night gone.']], () => dawn()); return true; }
      } else if (p.kind === 'secrethunter') { run.half = 1; toast(`📜 One of the ${who} reads your notes and runs. Your next question gets half the thinking time.`); }
      else if (p.kind === 'snuffer') { run.dark = 15; toast(`💨 One of the ${who} blows out your lantern and runs. You can barely see.`); }
      else if (p.kind === 'impersonator' && canTake(15)) { const n = canTake(15); w.silver -= n; toast(`🫳 The fake cook lifts ${n} silver and runs.`); }
      else if ((w.tools || 0) > 0) { w.tools--; toast(`🫳 One of the ${who} snatches a spare tool and runs.`); }
      else if (canTake(10)) { const n = canTake(10); w.silver -= n; toast(`🫳 One of the ${who} lifts ${n} silver and runs.`); }
      else toast(`🫳 One of the ${who} finds only your last ${PURSE} silver, sewn in where nobody can reach, and runs.`);
      const ex = exits(p.scene).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));   // bolt for the nearest way out
      p.state = 'flee'; p.exit = ex[0] || null; p.next = null; p.tx = p.exit ? p.exit.x : bounds(p.scene)[p.x < st.x ? 0 : 1]; p.cool = 10; S.persist();
      return false;
    };
    const STAFF = [{ scene: 'castle:ground', a: 'hall', b: null, carry: 'tray' }, { scene: 'castle:cellars', a: 'barracks', b: null, carry: 'sack' }];
    const roomX = (scene, id) => { const r = WW.CASTLE[WW.scene(scene).floor].rooms.find(v => v[0] === id); return r ? (r[1] + r[2]) / 2 : null; };
    const hireStaff = () => {
      const n = w.day < 6 ? 1 : 2;   // from night 1, so you know the staff long before anyone dresses as one
      run.staff = STAFF.slice(0, n).map(d => { const a = roomX(d.scene, d.a), b = d.b ? roomX(d.scene, d.b) : (exits(d.scene).find(v => v.kind === 'stair') || {}).x;
        return { night: 1, who: d.carry === 'tray' ? 'staff-cook' : 'staff-porter', scene: d.scene, x: a, a, b, tx: b, go: true, d: 0, facing: 1, carry: d.carry, sp: 55, rest: 0 }; });
      syncProwlers();
    };
    // Walking up to someone at night. Staff show their kitchen pass. Asking a fake cook for theirs makes them bolt
    // (check who they are). Revoke active sessions removes an intruder for the night, but its break-in stays open.
    function nightMeet(p) {
      if (p.carry) return sayAll([['seoyeon', 'Kitchen pass?'], ['seoyeon', 'Stamped, signed and dated tonight. Mind the tray.']]);
      const x = run.list.find(v => v.id === p.of);
      if (p.mask) { p.mask = false; p.who = 'intruder-impersonator'; p.tag = 'Impersonator'; p.state = 'flee'; p.cool = 10;
        const ex = exits(p.scene).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)); p.exit = ex[0] || null; p.tx = p.exit ? p.exit.x : p.x; syncProwlers();
        return sayAll([['seoyeon', 'Kitchen pass?'], ['seoyeon', 'No pass, no tray, and now they\'re running. That was no cook.']]); }
      if (p.kind === 'turncloak' && p.sess > 0 && !((w.writs || 0) > 0))
        return sayAll([['seoyeon', 'Pass? A real watch cloak, and a real pass from the castle next door. It checks out, for now.'],
          ['seoyeon', 'Either I wait for the session to run out, or I revoke it. Kagemaru sells Revoke active sessions orders.']]);
      if ((w.writs || 0) > 0) { w.writs--; (run.out = run.out || {})[p.of] = 1; leave(p, '', WRIT_GAP); S.persist();
        return sayAll([['seoyeon', 'Revoking your active sessions. That pass is dead.'], ['seoyeon', `The guards will walk this one of the ${crew(x)} out. The lock they came through is still broken, though.`]]); }
      return sayAll([['seoyeon', 'I can\'t make them leave without a Revoke active sessions order. Kagemaru sells them.']]);
    }
    run.kindFor = kindFor; run.tie = SECTION;   // for the checks
    run.admit = x => { run.inside = run.inside || {}; if (!run.inside[x.id]) intrude(x); return run.inside[x.id]; };   // for the checks
    function prowl(dt) {
      if (!run.staff) hireStaff();
      if (run.dark > 0) run.dark -= dt;
      if (busy) { run.calm = 2; return; }
      if (run.calm > 0) run.calm -= dt;
      run.puddles = (run.puddles || []).filter(m => (m.life -= dt) > 0); view.set('puddles', run.puddles);
      const wet = run.puddles.some(m => m.scene === st.scene && Math.abs(m.x - st.x) < 36);
      if (wet) run.slow = 1.2; else if (run.slow > 0) run.slow -= dt;
      const squeeze = (run.staff || []).some(p => p.scene === st.scene && Math.abs(p.x - st.x) < 26);
      st.slow = run.slow > 0 ? 0.4 : squeeze ? 0.6 : 1;
      (run.staff || []).forEach(p => {   // staff walk their route, stopping a moment at each end
        if (p.rest > 0) { p.rest -= dt; return; }
        const step = Math.sign(p.tx - p.x) * Math.min(Math.abs(p.tx - p.x), p.sp * dt);
        p.x += step; p.d += Math.abs(step); if (step) p.facing = Math.sign(step);
        if (Math.abs(p.tx - p.x) < 2) { p.tx = p.tx === p.a ? p.b : p.a; p.rest = 2.5; }
      });
      let moved = false;
      for (const p of (run.prowl || []).slice()) {
        const K = KINDS[p.kind]; p.cool -= dt;
        const xo = run.list.find(v => v.id === p.of);
        const here = p.scene === st.scene, dx = st.x - p.x;
        if (p.kind === 'exfiltrator' && here && Math.abs(dx) < 40 && !(run.calm > 0)) {   // stand in its way and you catch it
          w.silver = (w.silver || 0) + 10; (run.out = run.out || {})[p.of] = 1; leave(p, '🪤 You catch the exfiltrator with the sack. Loot back, and 10 silver from the Captain.'); S.persist(); moved = true; continue; }
        if (p.kind === 'turncloak') {
          const was = p.sess > 0; if (was) p.sess -= dt;
          if (was && p.sess <= 0 && p.lame) { leave(p, '⌛ The turncloak\'s session ran out, and the rack won\'t give it another. It slinks back over the bridge.'); moved = true; continue; }
          if (was && p.sess <= 0) { p.sess = 0; p.who = 'intruder-turncloak-bare'; cloak(p);
            toast('⌛ The turncloak\'s session ran out. It\'s heading back to the wardrobe to renew. Catch it on the way.'); }
          const t = cloakTag(p); if (t !== p.tag) { p.tag = t; moved = true; }
          if (!(p.sess > 0) && here && Math.abs(dx) < 40 && !(run.calm > 0)) {
            w.silver = (w.silver || 0) + 10; (run.out = run.out || {})[p.of] = 1;
            leave(p, '🪤 You catch the turncloak between sessions, with no cloak and no pass. 10 silver from the Captain.'); S.persist(); moved = true; continue; }
          if (p.state === 'renew') { if ((p.loot -= dt) <= 0) { p.sess = SESSION; p.who = 'intruder-turncloak'; p.tag = cloakTag(p); moved = true;
            toast('🧥 Someone took a watch cloak off the wardrobe rack. For the next 45 seconds, their pass checks out.'); goal(p); } continue; }
        }
        if (p.kind === 'eavesdropper' && p.state === 'lurk') {
          if (here && Math.abs(dx) < 180 && !hidden() && !(p.cool > 0)) { p.cool = 20;
            (run.prowl || []).forEach(o => { if (o !== p && KINDS[o.kind].sight) { o.goal = { scene: st.scene, x: st.x, name: 'warden' }; o.state = 'go'; aim(o); } });
            toast('📢 "The warden\'s on the ' + WW.scene(st.scene).name.toLowerCase() + '!" Someone on the stair gave you away.'); }
          if ((p.lurkT -= dt) <= 0) lurk(p); continue; }
        const sight = p.kind === 'escalator' && p.lvl >= 3 ? 200 : K.sight;
        const ahead = !K.ahead || Math.sign(dx) === p.facing;
        const sees = here && sight && !(run.dark > 0) && Math.abs(dx) < sight && ahead && !hidden() && !(p.cool > 0) && p.state !== 'flee';
        if (p.mask && sees) { p.mask = false; p.who = 'intruder-impersonator'; p.tag = 'Impersonator'; moved = true; toast('🎭 That\'s no cook. Empty hands, and they\'re coming for you.'); }
        if (here && sight && !(run.calm > 0) && p.cool <= 0 && Math.abs(dx) < 50 && !hidden()) { if (caught(p, run.list.find(v => v.id === p.of))) return; continue; }
        if (p.kind === 'replayer' && run.lastFix && run.lastFix.id !== p.done && gone() - run.lastFix.t < 60 && !(p.goal && p.goal.replay === run.lastFix.id)) {
          const f = run.lastFix; p.goal = { scene: f.scene, x: f.x, name: 'fixed lock', replay: f.id }; p.state = 'go'; aim(p); }
        if (sees) { p.tx = st.x; p.state = 'chase'; }
        else if (p.state === 'chase') { p.state = 'go'; aim(p); }
        if (p.kind === 'spiller' && here && Math.abs(dx) < 200 && p.state === 'go' && Math.sign(p.tx - p.x) === Math.sign(dx)) { p.state = 'flee'; p.exit = null; p.tx = bounds(p.scene)[dx > 0 ? 0 : 1]; }   // shies away
        if (p.state === 'loot') { if ((p.loot -= dt) <= 0) {
          const x = xo;
          if (p.kind === 'rummager') { run.list.forEach(v => { if (v.scene === p.scene && v.fuse && !run.fixed[v.id]) v.fuse -= 10; });
            toast(`🗄 Every drawer in the ${p.goal.name.toLowerCase()} is open. Every lock on the ${WW.scene(p.scene).name.toLowerCase()} is giving faster.`); }
          else { if (x && x.fuse) x.fuse -= 15; toast(`💰 The ${crew(x)} cleaned out the ${p.goal.name.toLowerCase()}. Their lock is giving faster.`); }
          if (p.kind === 'escalator') { p.lvl++; if (p.lvl === 2) p.sp *= 1.5;
            toast(['', '⬆ The escalator picked up more rights: it can take the stairs now.', '⬆ The escalator picked up more rights: it moves faster now.', '⬆ The escalator has all the rights it wants. Now it comes for you.'][Math.min(3, p.lvl)]); }
          if (p.kind === 'exfiltrator') { p.goal = { scene: 'bridge', x: WW.scene('bridge').to - 20, name: 'bridge', away: 1 }; p.state = 'go'; aim(p); } else goal(p); } continue; }
        if (Math.abs(p.tx - p.x) < 4 && p.state !== 'chase') {
          if (p.exit) { const sc0 = p.scene; hop(p, p.exit); if (p.state === 'flee') { p.state = 'go'; aim(p); if (p.kind === 'impersonator') { p.mask = true; p.tag = ''; } } moved = moved || sc0 !== p.scene; continue; }
          if (p.state === 'flee') { p.state = 'go'; aim(p); continue; }
          if (p.state === 'go' && p.goal.scene === p.scene) {
            if (p.goal.lurk) { p.state = 'lurk'; continue; }
            if (p.goal.renew) { p.state = 'renew'; p.loot = RENEW; continue; }
            if (p.goal.away) { const pen = canTake(20); w.silver -= pen; (run.out = run.out || {})[p.of] = 1; leave(p, `🌉 The exfiltrator is over the bridge with a full sack.${pen ? ` ${pen} silver gone.` : ''}`); S.persist(); moved = true; continue; }
            if (p.goal.forge) { const v = run.list.find(u => u.id === p.goal.forge); if (v && !run.fixed[v.id]) { v.forged = 1; toast('🖋 Someone hung a forged all-clear on a broken lock. It looks fixed from a distance.'); } forge(p); continue; }
            if (p.goal.replay) { const v = run.list.find(u => u.id === p.goal.replay); p.done = p.goal.replay;
              if (v && run.fixed[v.id] && gone() - run.lastFix.t < 60) { delete run.fixed[v.id]; delete (w.fixed || {})[v.id]; v.at = gone(); v.fuse = 60; if (run.rung) delete run.rung[v.id];
                toast(`🔁 Someone replayed a copy of your fix. ${v.title} is open again.`); }
              goal(p); continue; }
            p.state = 'loot'; p.loot = p.kind === 'rummager' || p.kind === 'turncloak' ? 4 : 8; continue; }
          aim(p);
        }
        const step = Math.sign(p.tx - p.x) * Math.min(Math.abs(p.tx - p.x), p.sp * (sees ? K.rush : 1) * dt);
        p.x += step; p.d += Math.abs(step); if (step) p.facing = Math.sign(step);
        if (p.kind === 'spiller' && (p.drip += Math.abs(step)) > 150) { p.drip = 0; run.puddles.push({ scene: p.scene, x: p.x, life: 45 }); if (run.puddles.length > 8) run.puddles.shift(); moved = true; }
      }
      if (moved) syncProwlers();
    }
    const marks = () => run.list.filter(x => !run.fixed[x.id] && run.locked[x.id] !== 'gone' && up(x) && seen(x)).map(x => {
      const f = fuseLeft(x), lk = run.locked[x.id];
      if (fooled(x)) return { scene: x.scene, x: x.x, text: '✓ All clear', color: '#8a93b8' };   // the forged seal, from a distance
      return { scene: x.scene, x: x.x, sparkle: x.fix === 'hiding-spot', text: lk ? 'Locked till dawn' : f < Infinity ? `${x.title} · ⏳ ${mm(Math.max(0, f))}` : x.title,
        color: lk ? '#8a93b8' : f < 40 ? '#ff7b7b' : '#e9c56d' };
    });
    const wx = WW.weather(w.day, phase === 'night' ? 'night' : 'day');
    view = WV.mount(b.querySelector('.ww-view'), {
      paused: () => busy,
      st, onKey: k => tuck(k), people: (run.ppl = people(phase, w.day)), marks: marks(), weather: wx, follow: run.escort ? 'mira' : null,
      hint: phase === 'night' ? '' : phase === 'dusk' ? 'Walk to Pell at the gate' : '',
      onUse(spot) {
        if (busy) return;
        if (phase === 'night') {
          const x = run.list.find(v => !run.fixed[v.id] && run.locked[v.id] !== 'gone' && up(v) && v.scene === st.scene && Math.abs(v.x - st.x) <= WW.REACH);
          if (x) return fix(x, () => view.set('marks', marks()));
        }
        if (phase === 'night') {   // people in the castle at night: staff, intruders, an impersonator
          const n = (run.ppl[st.scene] || []).filter(v => v.night && Math.abs(v.x - st.x) <= WW.REACH + 20).sort((a, b) => Math.abs(a.x - st.x) - Math.abs(b.x - st.x))[0];
          if (n) return nightMeet(n);
        }
        const f = run.escort && view.follower;
        if (f && f.scene === st.scene && Math.abs(f.x - st.x) <= WW.REACH) return sayAll([['mira', 'Don\'t mind me. Pretend I\'m not here.']]);
        const p = (run.ppl[st.scene] || []).filter(v => !v.crowd && Math.abs(v.x - st.x) <= WW.REACH).sort((a, b) => Math.abs(a.x - st.x) - Math.abs(b.x - st.x))[0];
        if (p) return talk(p.who);
        const q = quests().find(q => { const s = qstate(q.id), t = q.steps[s.step]; return !s.done && s.step >= 0 && t && t.at && t.at.spot && spot && (WW.ALIAS[t.at.spot] || t.at.spot) === spot.id; });
        if (q) return step(q);
        if (phase === 'day' && spot && (run.indoor || {})[spot.id]) return knock(spot);
        if (spot && spot.popup) return roomPop(spot);
      },
      onMove(m) {
        if (busy) return false;
        if (phase === 'day' && m.via === 'pell-gate') { setTimeout(endEarly, 0); return false; }
        // Dusk is the walk to the gate, not more time in town (Ladi, Nov 18): the way down the hill is closed.
        if (phase === 'dusk' && !/^castle:/.test(m.to.scene)) { setTimeout(() => sayAll([['pell', 'Town\'s shutting up for the night, warden. The gate\'s this way.']]), 0); return false; }
        if (/^castle:/.test(m.to.scene) && phase !== 'night') { const go = () => walk('night', m.via === 'pell-gate' ? {} : { scene: m.to.scene, x: m.to.x });
          setTimeout(() => (phase === 'dusk' ? planCard(go) : go()), 0); return false; }   // the castle plan first, at dusk
        if (m.via === 'castle-exit' && phase === 'night' && w.day !== 9) return false;
        return true;
      },
      onLift(moves) {
        if (busy) return;
        const o = overlay(`<p class="ww-t">Ladder</p><div class="ww-ch">${moves.map(m => `<button data-k="${m.key}">${esc(m.label)}</button>`).join('')}</div><div class="row"><button class="ghost" data-a="x">Stay</button></div>`);
        o.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { WW.go(st, el.dataset.k); if (phase === 'night') clock -= 60; close(); });
        o.querySelector('[data-a=x]').onclick = close;
      },
      onTick(s, dt) {
        const tut = content().tutorial;
        if (phase === 'day' && w.day === 1 && tut && !busy && (run.tut || 0) < tut.length) {
          const t = tut[run.tut || 0], sp = WW.spot(null, t.at);
          if (!sp || (s.scene === sp.level && Math.abs(s.x - sp.x) < 120)) {
            run.tut = (run.tut || 0) + 1; keep();
            if (t.mark) view.set('marks', [{ scene: sp.level, x: sp.x + 34, text: t.mark, color: '#e9c56d' }]);   // Mira's example: a marker over Coo
            const last = run.tut === tut.length;
            sayAll(t.lines || [[t.who, t.line]], () => { if (t.mark) view.set('marks', run.walkers ? dayMarks() : marks()); if (last) homeMira(); });
          } else { view.set('hint', 'Mira wants to show you ' + sp.label); view.set('guide', guideTo(s, sp)); }
        }
        if (phase === 'night' && w.day === 1 && !busy && !run.rang && clock < nightS(1) / 2) {   // a humor beat: she can't help herself
          run.rang = 1;   // Coo flies a note up from Mira
          sayAll([['coo', 'Coo. Note from Mira. It says: "Are the doors locked?"'], ['seoyeon', 'Locking the doors is the whole job.'], ['coo', 'She sent three of these. Coo. I\'m only bringing one.']]);
        }
        if (phase === 'night' && ((run.tk = (run.tk || 0) + dt) > 0.25)) {
          run.tk = 0;
          run.list.forEach(x => {
            if (run.fixed[x.id] || run.locked[x.id] === 'gone') return;
            if (x.at && up(x) && !(run.rung = run.rung || {})[x.id]) { run.rung[x.id] = 1; if (gone() - x.at < 5) {
              // Where it is stays yours to find (Ladi, Nov 18). On the Long Night a watcher calls out their own area.
              const k = w.day === 9 && (run.ward[x.scene] || 0) >= 1 && watcherOf(x.scene);
              const gd = w.guard === w.day && w.day < 9;
              toast(gd ? `🔔 GuardDuty: ${x.title}, on the ${WW.scene(x.scene).name.toLowerCase()}.` : k ? `🔔 ${nm(k)}: "Trouble on the ${WW.scene(x.scene).name}!"` : `🔔 Somewhere in the ${w.day === 9 ? 'town' : 'castle'}, a lock gives.`);
            } }
            if (x.fuse && fuseLeft(x) <= 0 && !busy) {   // the fuse ran out: it got through
              run.locked[x.id] = 'gone'; toast(`💨 Too late: ${x.title} got through.`); if (AU) AU.sfx('incorrect');
            }
            if (x.inAt && up(x) && gone() >= x.at + x.inAt && !((run.inside = run.inside || {})[x.id]) && !(run.out || {})[x.id] && (run.prowl || []).length < MAX_IN && gone() >= (run.gate || 0)) { intrude(x); hold(QGAP); }
          });
          Object.keys(run.inside || {}).forEach(id => { const x = run.list.find(v => v.id === id), p = run.inside[id];
            if (p && p.kind === 'turncloak' && run.fixed[id] && p.sess > 0) {   // a fixed trust policy stops new sessions, not the live one
              if (!p.lame) { p.lame = 1; toast('🧥 Fixed. No more cloaks for the neighbour\'s side, but the one already out stays good till its session ends. Or revoke it now.'); } return; }
            if (p && (run.fixed[id] || run.locked[id] === 'gone')) leave(p, run.fixed[id] ? `🚪 The ${crew(x)} lookout slips back out the way they came.` : ''); });
          view.set('marks', marks());
          if (!busy && run.list.every(v => run.fixed[v.id] || run.locked[v.id]) && !run.over) { run.over = 1; sayAll([['seoyeon', 'That\'s everything for tonight. Time to report at dawn.']], () => dawn()); }
        }
        if ((run.sv = (run.sv || 0) + dt) > 3) { run.sv = 0; keep(); }
        if (phase === 'day' && run.walkers && !busy) {
          moveWalkers(dt); syncPeople();
          if ((run.mk = (run.mk || 0) + dt) > 0.3) { run.mk = 0; view.set('marks', dayMarks()); if (!run.escort) meetups(); townTalk(); }
        }
        if (phase === 'night') prowl(dt);
        if (run.q) {   // a question is open: thinking time first, then the clock runs
          if (run.q.left > 0) run.q.left -= dt;
          else if (clock > 0) clock = Math.max(0, clock - dt);
          const el = wrap && wrap.querySelector('.ww-qt'), mm = n => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
          if (el) { const t = run.q.left > 0 ? `⏳ ${mm(Math.ceil(run.q.left))} to think, then your clock runs` : `⏳ Your ${phase} clock is running · ${mm(clock)} left`;
            if (el.textContent !== t) { el.textContent = t; el.classList.toggle('on', run.q.left <= 0); } }
          const bar = wrap && wrap.querySelector('.ww-qbar');
          if (bar) { bar.classList.toggle('on', run.q.left <= 0); bar.firstChild.style.width = (run.q.left > 0 ? 100 * run.q.left / run.q.of : 100) + '%'; }
        }
        if (!busy && clock <= 0 && !run.over && phase !== 'dusk') { run.over = 1; setTimeout(() => (phase === 'night' ? dawn() : dusk()), 0); }
        if (!busy && clock > 0) {
          clock -= dt;
          if (phase === 'night') { const bell = Math.floor((nightS(w.day) - clock) / 60); if (bell > run.bell) { run.bell = bell; } }
          if (clock <= 0) { clock = 0; run.over = 1; setTimeout(() => (phase === 'night' ? dawn() : dusk()), 0); }
        }
        const open = run.list.filter(x => !run.fixed[x.id] && !run.locked[x.id]), lv = run.ward[st.scene];
        const left = open.filter(up).length, soon = open.length - left;
        const gd = phase === 'night' && w.guard === w.day && w.day < 9 ? open.filter(up).map(x => `${WW.scene(x.scene).name.replace(/ floor$/i, '')} ${mm(Math.max(0, fuseLeft(x)))}`) : [];
        const here = w.day === 9 && lv >= 1 ? ` · ${run.list.filter(x => x.scene === st.scene && !run.fixed[x.id]).length || 'all clear'} here (${nm(watcherOf(st.scene))})` : '';
        const t = phase === 'dusk' ? `Day ${w.day} · Dusk · ${COIN} ${w.silver}` : `${phase === 'night' ? 'Night' : 'Day'} ${w.day} · ${Math.floor(clock / 60)}:${String(Math.floor(clock % 60)).padStart(2, '0')}${busy && !(run.q && run.q.left <= 0) ? ' (paused)' : ''} · ${COIN} ${w.silver}${phase === 'night' ? (w.day === 9 ? here : ` · ${left ? `${left} breach${left === 1 ? '' : 'es'} now` : 'quiet'}${soon ? ' · more coming' : ''}${gd.length ? ' · 🔔 ' + gd.join(', ') : ''}`) + ` · 🔔 ${run.bell}` : ''}`;
        if (top.dataset.t !== t) { top.dataset.t = t; top.innerHTML = t; }   // holds the silver coin
      }
    });
    if (phase === 'day' && SCH && content().schedule) {   // the living town: everyone with a plan walks it
      run.walkers = []; run.crowd = run.ppl;
      Object.keys(run.crowd).forEach(k => { run.crowd[k] = run.crowd[k].filter(p => { if (p.crowd) return true; run.walkers.push(Object.assign(p, { scene: k, facing: p.facing || -1, d: 0 })); return false; }); });
      moveWalkers(0, true); syncPeople(); view.set('marks', dayMarks());
    }
    if (phase === 'dusk') {
      const d = (content().dusk || []).find(x => x.night === w.day), P = content().pellTall || {};
      const pre = [];   // the Pell running joke: meeting him, Chad's pitch on dusk 2, his answer to the latest quip
      if (!w.metPell && P.meet) { pre.push(...P.meet); w.metPell = 1; }
      if (w.day === 2 && P.chad && !w.chadPitched) { pre.push(...P.chad); w.chadPitched = 1; }
      if (w.pellReply && (P.quips || {})[w.pellReply]) { pre.push(['pell', P.quips[w.pellReply][1]]); w.pellReply = null; }
      S.persist();
      sayAll(pre.concat(d ? d.lines.map(l => [d.who || 'pell', l]) : [['pell', 'Night\'s coming. Walk with me to the gate, and keep your lantern low.']]));
    }
    if (phase === 'night' && w.day === 9) sayAll([['pell', 'The Long Night. Every lock you missed is open again, and there are new ones in town. The castle gate stays open tonight: the town is ours to search too.']]);
    if (phase === 'dusk' && w.day === 9 && !w.retry) w.retry = JSON.stringify(Object.assign({}, w, { retry: null }));
    if (phase === 'night' && w.day === 1) sayAll([['pell', 'One problem tonight, at the main gate. Walk to the glowing marker and press use.']]);
    if (phase === 'night' && run.planNotes && run.planNotes.length && !opts.resume) { const ns = run.planNotes; setTimeout(() => ns.forEach((t, i) => setTimeout(() => toast(t), i * 4200)), 600); }
  }
  function dusk() { walk('dusk'); }
  // The castle gate by day: head up early and the night starts sooner (Ladi, Nov 18). Asks first, so a stray press
  // doesn't throw the day away.
  function endEarly() {
    if (busy || !run || run.phase !== 'day') return;
    const m = Math.ceil(clock / 60);
    const o = overlay(`${line('seoyeon', `Head up to the castle now? There's about ${m} minute${m === 1 ? '' : 's'} of daylight left.`)}<div class="row"><button class="primary" data-a="y">End the day</button><button class="ghost" data-a="x">Not yet</button></div>`);
    o.querySelector('[data-a=y]').onclick = () => { close(); dusk(); };
    o.querySelector('[data-a=x]').onclick = close;
  }
  // The next step toward a spot: the spot itself on this road, else the fork that starts the way there.
  function guideTo(st, sp) {
    if (st.scene === sp.level) return { scene: sp.level, x: sp.x };
    const path = WW.route(st, sp.level, st.unlocks, 'day'), next = path && path[1];
    const forks = WW.scene(st.scene).spots.filter(v => v.kind === 'fork' && v.to && v.to.scene === next);
    const f = forks.sort((a, b) => Math.abs(a.x - st.x) - Math.abs(b.x - st.x))[0];
    return f ? { scene: st.scene, x: f.x, dir: f.dir } : null;
  }

  // ---- Fix screens ----
  function fix(x, after) {
    if (run.locked[x.id]) { sayAll([['seoyeon', 'I got this one wrong. It has to wait for morning.']]); return; }
    const best = x.choices.findIndex(c => c.best), q = { q: x.story, choices: x.choices.map(c => c.text), answer: best, why: x.choices[best].why, topic: TOPIC[x.skill] || '', ev: x.tell || '', room: popRoom(x) };
    const w = sv(), tools = w.day > 1 && (w.tools || 0) > 0;
    const tries = w.day === 1 ? 99 : tools ? 1 : 0;   // one try per fix (Ladi, Nov 18); spare tools buy a second
    choose(x.title, q, tries, (ok, miss) => {
      if (tools && miss >= 1) w.tools--;
      const keeper = watcherOf(x.scene);
      if (ok) { run.lastFix = { id: x.id, t: run.phase === 'night' ? nightS(w.day) - clock : 0, scene: x.scene, x: x.x }; run.fixed[x.id] = 1; sv().fixed[x.id] = 1; delete sv().missed[x.id]; if (x.orig) delete sv().missed[x.orig]; if (keeper) B.add(sv().bonds, keeper, 3); } else run.locked[x.id] = 1;
      if (AU) AU.sfx(ok ? 'correct' : 'incorrect');
      S.persist(); after();
    });
  }

  // ---- Dawn ----
  function dawn() {
    if (!run || run.phase !== 'night') return;
    const w = sv(), fixed = run.list.filter(x => run.fixed[x.id]), missed = run.list.filter(x => !run.fixed[x.id]);
    if (w.day === 9) return ending(missed, fixed);
    const planKept = run.planKept || [];
    const fines = w.day === 1 ? 0 : missed.length * PAY.miss;
    const pay = Math.max(0, PAY.base + fixed.length * PAY.fix + fines);   // fines never take more than the night's pay
    missed.forEach(x => { w.missed[x.orig || x.id] = x.raid || 'Thieves'; });   // a missed copycat brings its original back on night 9
    w.silver += pay;
    const night = w.day;
    {   // the night's news, known at first by those nearest the castle; tries growing night on night get noticed
      const tries = run.list.length, prev = (w.tries || {})[night - 1] || 0, more = night >= 2 && tries > prev ? ', and there are more every night' : '';
      (w.tries = w.tries || {})[night] = tries;
      const k = missed.length, num = n => ['no', 'one', 'two', 'three', 'four', 'five', 'six'][n] || String(n);
      if (night < 9) addNews('night-' + night, night + 1, k ? `${num(k)} break-in${k > 1 ? 's' : ''} got through at the castle last night${more}`
        : `someone tried the castle ${num(tries)} time${tries > 1 ? 's' : ''} last night${more}`,
        k ? null : `you stopped every break-in last night${more ? ' and there were more than ever' : ''}`, !k, ['dutch', 'mira', 'tess']);
    }
    w.day = Math.min(10, w.day + 1);
    w.bonds.day = w.day; w.at = null;
    const xp = M.pay('watch');
    S.persist();
    if (view) view.stop(); view = null; run = null;
    jingle('watchDawn', 'watchMorning');
    // Mira's whole morning song under the dawn report and her review (Ladi, Nov 18: it went quiet after the sting).
    setTimeout(() => { if (!run && AU && AU.loopName !== 'watchMorning') music('watchMorning'); }, 5600);
    const b = U.panel(`<p class="ww-top">Night ${night} · Dawn</p>
      <ul class="nw-rows">${planKept.map(x => `<li class="nw-r ok"><span class="nw-rr">📌</span><span>${esc(x.title)} · kept out by the plan</span></li>`).join('')}${fixed.map(x => `<li class="nw-r ok"><span class="nw-rr">✓</span><span>${esc(x.title)}</span></li>`).join('')}${missed.map(x => `<li class="nw-r leak"><span class="nw-rr">✗</span><span>${esc(x.title)}${night < 9 ? ' · comes back on the Long Night' : ''}</span></li>`).join('')}</ul>
      <p class="ww-pay">${COIN} Pay: ${PAY.base} base + ${fixed.length * PAY.fix} for fixes${fines ? ` ${fines} in fines` : ''} = ${pay} · ${w.silver} saved</p>
      ${xp ? `<p class="small muted">${esc(xp)}</p>` : ''}
      <div class="row"><button class="primary" id="ww-next">${w.day > 9 ? 'The end' : 'Day ' + w.day}</button></div>`, { title: 'THE NIGHT WATCH' });
    b.querySelector('#ww-next').onclick = () => (w.day > 9 ? ending() : morning());
  }
  // Endings (doc: The Long Night, Dawn): by how many got through. Retry from that morning keeps silver, watchers, trust.
  const ENDINGS = [
    { id: 'lanterns', name: 'Lanterns at Dawn', text: 'On the last chime the Stranger tries the main gate with a forged pass and walks straight into every watcher you earned. The hood comes off: it\'s Kevin, Doug\'s old bot, wearing a stolen badge. His signal leads to the café terrace, where Chad the Consultant is mid-pitch with a laptop open. The Captain hands Seo-yeon the captain\'s key, and the town walks the West Road with lanterns, up the hill to the castle gate.' },
    { id: 'morning', name: 'The Long Morning', text: 'The Stranger escapes over the rooftops with whatever the worst breach exposed. The Captain is hurt holding the stairs. By noon a wanted poster with the Stranger\'s mark is on Bru\'s bounty board, and Seo-yeon keeps her lantern on probation.' },
    { id: 'fall', name: 'The Fall of the Watch', text: 'The Stranger opens the main gate from inside. Every breach you missed lights up across the town one by one, the castle bell rings by itself, and the watch\'s banners come down. At Mira\'s fire Seo-yeon apologizes. Mira looks into the flames: "It\'s not over, Seo-yeon... This is only the beginning."' }
  ];
  const endingFor = got => ENDINGS[got === 0 ? 0 : got <= 3 ? 1 : 2];
  function ending(missed, fixed) {
    const w = sv();
    missed = missed || []; fixed = fixed || [];
    if (view) view.stop(); view = null; run = null;
    const e = endingFor(missed.length);
    w.ending = e.id; w.day = 10;
    // Each ending plays its whole song through once (Ladi, Nov 18), then quiet.
    jingle({ lanterns: 'watchEndLanterns', morning: 'watchEndMorning', fall: 'watchEndFall' }[e.id], null);
    const xp = M.pay('watch');
    S.persist();
    const b = U.panel(`<p class="ww-top">The Long Night · Dawn</p><h3 class="ww-end">${esc(e.name)}</h3><p>${esc(e.text)}</p>
      <p class="ww-pay">${fixed.length} fixed · ${missed.length} got through</p>
      ${missed.length ? `<ul class="nw-rows">${missed.map(x => `<li class="nw-r leak"><span class="nw-rr">✗</span><span>${esc(x.title)} · ${esc(x.raid || 'Thieves')} got in</span></li>`).join('')}</ul>` : ''}
      ${xp ? `<p class="small muted">${esc(xp)}</p>` : ''}
      <div class="row">${w.retry ? '<button class="ghost" id="ww-retry">Retry the Long Night</button>' : ''}<button class="primary" id="ww-new">New watch</button></div>`, { title: 'THE NIGHT WATCH' });
    const r = b.querySelector('#ww-retry');
    if (r) r.onclick = () => {   // the ones that got through come back first, in the same places
      const back = JSON.parse(w.retry), got = {};
      missed.forEach(x => { got[x.id] = 1; });
      S.save.watch3 = Object.assign(back, { retry: w.retry, missed: Object.assign({}, back.missed, got) });
      S.persist(); walk('dusk');
    };
    b.querySelector('#ww-new').onclick = () => { S.save.watch3 = null; S.persist(); morning(); };
  }

  M.register({
    id: 'watch-walk', name: 'The Night Watch (walkable preview)', host: 'Seo-yeon', minutes: 'about 20 a day and night',
    blurb: 'Walk the town by day for gossip and quests, then patrol the castle at night and fix each breach. Security only.',
    start: () => { const w = sv(); return w.at && w.at.day === w.day && w.day <= 9 ? walk(w.at.phase, { resume: true }) : morning(); },
    status: () => { const w = S.save && S.save.watch3; return w && w.v === 3 ? `Day ${Math.min(9, w.day)} of 9 · ${w.silver} silver` : ''; }
  });
  SD.watchWalk = { sv, breaches, planFor, dayTalk, qGrace, shopItems: () => SHOP.filter(it => !(it.id === 'guard' && (sv().day >= 9 || sv().guard === sv().day))), step: q => step(q), choose: (t, q, n, d) => choose(t, q, n, d || (() => {})), ward, WATCHERS, PARTY, ENDINGS, endingFor, quests, people, morning, walk, dawn, talk, fix: x => fix(x, () => {}), get run() { return run; }, get view() { return view; }, get busy() { return busy; },
    clock: n => { if (n != null) clock = n; return clock; }, addNews, newsFor, spread, snapTown: () => { if (run && run.walkers) { moveWalkers(0, true); syncPeople(); } }, workFor, townBook };

  const css = document.createElement('style');
  css.textContent = `
    .ww-wrap { position: relative; }
    .ww-coin { display: inline-block; width: .9em; height: .9em; border-radius: 50%; vertical-align: -.1em; background: radial-gradient(circle at 35% 30%, #ffffff 0 12%, #d9dde4 30%, #9aa1ad 70%, #6d7480 100%); box-shadow: inset 0 0 0 1.5px #5d636e; }
    /* Full window (Ladi, Nov 19): the walking screen fills the window; the view keeps 16:9 and grows to fit, and
       talk and question cards float over it at a readable width. */
    #panel:has(> .win.ww-full) { padding: 0; }
    #panel > .win.ww-full { width: 100%; height: 100%; max-height: none; border: 0; border-radius: 0; box-shadow: none; }
    .win.ww-full > .win-b { flex: 1; display: flex; flex-direction: column; gap: 6px; padding: 8px max(12px, env(safe-area-inset-left, 0px)) calc(8px + env(safe-area-inset-bottom, 0px)); }
    .win.ww-full .ww-top { margin: 0; }
    .win.ww-full .ww-wrap { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .win.ww-full .ww-view, .win.ww-full .wv { flex: 1; min-height: 0; display: flex; flex-direction: column; }
    .win.ww-full .wv-box { flex: 1 1 0; min-height: 0; container-type: size; }
    .win.ww-full .wv-c { width: min(100cqw, 100cqh * 16 / 9); }
    .win.ww-full .wv-pad { width: min(640px, 100%); margin: 0 auto; }
    .win.ww-full .ww-o { bottom: 0; overflow-y: auto; justify-items: center; }
    .win.ww-full .ww-card { max-width: 680px; }
    @media (max-aspect-ratio: 1 / 1) { .win.ww-full .ww-view, .win.ww-full .wv { flex: 0 0 auto; } .win.ww-full .wv-box { flex: 0 0 auto; container-type: normal; } .win.ww-full .wv-c { width: 100%; } }
    .win.ww-full > .win-b > .row { justify-content: center; }
    .ww-pay { font-weight: 700; color: #7a5410; }
    .ww-end { margin: 4px 0; color: #2c3566; }
    .ww-top { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #2c3566; }
    .ww-o { position: absolute; top: 0; left: 0; right: 0; min-height: 100%; display: grid; align-items: start; padding: 8px; background: rgba(4,6,20,.35); border-radius: 10px; }
    .ww-o[hidden] { display: none; }
    .ww-card { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 10px; background: rgba(14,20,56,.97); color: #eef1ff; border: 1px solid #e9c56d; font-size: 14px; }
    .ww-say { margin: 4px 0; line-height: 1.4; display: flex; gap: 10px; align-items: flex-start; }
    .ww-face { flex: none; width: 48px; height: 48px; border-radius: 10px; overflow: hidden; display: grid; place-items: center; background: #2a3466; border: 2px solid #e9c56d; color: #fff; font-weight: 700; }
    .ww-face img { width: 100%; height: 100%; object-fit: cover; object-position: top; image-rendering: pixelated; }
    .ww-face.bust img { image-rendering: auto; } .ww-meta { font-size: 12.5px; color: #c9d0ee; margin: 6px 0; }
    .ww-t { margin: 0 0 4px; font-weight: 700; color: #e9c56d; } .ww-q { margin: 0 0 8px; }
    .ww-ch { display: grid; gap: 6px; margin: 6px 0; }
    .ww-ch button { text-align: left; padding: 9px 10px; min-height: 44px; border-radius: 8px; border: 1px solid rgba(185,196,255,.4); background: rgba(255,255,255,.06); color: inherit; font: inherit; cursor: pointer; }
    .ww-ch button:has(.ww-face) { display: flex; align-items: center; gap: 10px; }
    /* On the cream panels (Mira's morning review): dark text. Inside the dark dialog cards: light text. (Ladi, Nov 18: contrast) */
    .ww-toast { position: absolute; left: 8px; right: 8px; bottom: 8px; padding: 8px 10px; border-radius: 8px; background: rgba(14,20,56,.95); color: #ffe9a8; border: 1px solid #e9c56d; font-size: 13px; font-weight: 600; text-align: center; animation: ww-in .3s ease-out; pointer-events: none; }
    @keyframes ww-in { from { opacity: 0; transform: translateY(8px); } }
    .ww-stage { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin: 8px 0 10px; padding: 10px 6px; border-radius: 8px; background: rgba(255,255,255,.05); border: 1px dashed rgba(233,197,109,.45); }
    .ww-tile { width: 84px; display: grid; justify-items: center; gap: 4px; padding: 8px 4px; border-radius: 8px; background: rgba(255,255,255,.08); border: 2px solid rgba(185,196,255,.35); text-align: center; animation: ww-in .35s ease-out both; animation-delay: calc(var(--k) * 90ms); }
    .ww-tile small { font-size: 11.5px; line-height: 1.25; color: #eef1ff; }
    .ww-ti { font-size: 28px; line-height: 1; font-weight: 700; color: #fff; }
    .ww-tile.ok { border-color: #6fcf8a; background: rgba(111,207,138,.16); } .ww-tile.no { border-color: #ff9a9a; background: rgba(255,154,154,.14); }
    .ww-tile.no small { text-decoration: line-through; } .ww-tile.dim { opacity: .45; }
    .ww-tile.new { border-color: #e9c56d; box-shadow: 0 0 0 3px rgba(233,197,109,.35); animation: ww-pop .5s ease-out both; }
    @keyframes ww-pop { 0% { transform: scale(.6); opacity: 0; } 70% { transform: scale(1.08); opacity: 1; } }
    .ww-box .ww-ctx { display: flex; align-items: center; gap: 8px; margin: 0 0 6px; font-size: 12.5px; font-weight: 700; color: #e9c56d; text-transform: uppercase; letter-spacing: .04em; }
    .ww-box .ww-ctx .ww-face { width: 36px; height: 36px; }
    .ww-ch button.on { border-color: #e9c56d; background: rgba(233,197,109,.18); }
    .ww-conf { display: grid; gap: 6px; margin-top: 8px; font-size: 12.5px; color: #c9d0ee; }
    .ww-conf div { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .ww-conf button { min-height: 44px; border-radius: 8px; border: 1px solid #e9c56d; background: rgba(233,197,109,.12); color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    .ww-conf button:disabled { opacity: .4; cursor: default; }
    .ww-gold { color: #ffd34d; font-weight: 700; margin: 6px 0; }
    .ww-book { display: grid; gap: 8px; max-height: 52vh; overflow-y: auto; margin: 6px 0; }
    .ww-who { display: flex; gap: 10px; align-items: flex-start; } .ww-who > div { flex: 1; min-width: 0; }
    .ww-who small { color: #c9d0ee; } .ww-bar { display: block; height: 6px; margin: 4px 0; border-radius: 3px; background: linear-gradient(90deg, #e9c56d calc(var(--v) * 1%), rgba(255,255,255,.12) 0); }
    .ww-ties { display: flex; flex-wrap: wrap; gap: 4px; } .ww-tie { font-size: 11.5px; padding: 1px 6px; border-radius: 10px; background: rgba(255,255,255,.08); color: #eef1ff; }
    .ww-tie.warm { color: #ffc0cf; } .ww-tie.cool { color: #a9b4d8; }
    .ww-qbar { height: 8px; border-radius: 4px; background: rgba(42,49,87,.15); overflow: hidden; margin: 0 0 4px; }
    .ww-qbar i { display: block; height: 100%; width: 100%; background: #e9c56d; border-radius: 4px; transition: width .25s linear; }
    .ww-qbar.on i { background: #d24c4c; animation: ww-qpulse 1s ease-in-out infinite; }
    @keyframes ww-qpulse { 50% { opacity: .45; } }
    @media (prefers-reduced-motion: reduce) { .ww-qbar i { transition: none; } .ww-qbar.on i { animation: none; } }
    .ww-qt { margin: 0 0 6px; font-size: 12px; font-weight: 700; color: #6a6f8a; }
    .ww-qt.on { color: #d24c4c; }
    .ww-card .ww-qt { color: #b9c4ff; } .ww-card .ww-qt.on { color: #ff9d9d; }
    .ww-topic { margin: 2px 0 4px; font-size: 12px; font-weight: 700; letter-spacing: .04em; color: #9fd0ff; text-transform: uppercase; }
    .ww-room { position: relative; margin: -4px 0 8px; aspect-ratio: 16 / 9; border-radius: 8px; background: #111 center / cover no-repeat; overflow: hidden; }
    .ww-room canvas { position: absolute; height: 46%; width: auto; image-rendering: auto; }
    .ww-ev { margin: 6px 0; padding: 6px 8px; border-radius: 6px; background: rgba(0,0,0,.35); color: #d8f5d0; font: 12px/1.4 ui-monospace, Menlo, monospace; white-space: pre-wrap; word-break: break-word; }
    .ww-ok { color: #1f6b35; font-weight: 700; } .ww-no { color: #a3261f; font-weight: 700; } .ww-why { font-size: 14px; color: #2a2f45; line-height: 1.45; }
    .ww-card .ww-ok { color: #6fcf8a; } .ww-card .ww-no { color: #ff9a9a; } .ww-card .ww-why { font-size: 13px; color: #e6e9f8; }
    .ww-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0; font-size: 12px; color: #c9d0ee; }
    .ww-bars i { display: block; height: 6px; margin-top: 3px; border-radius: 3px; background: linear-gradient(90deg, #e9c56d calc(var(--v) * 1%), rgba(255,255,255,.12) 0); }
  `;
  document.head.appendChild(css);
})();
