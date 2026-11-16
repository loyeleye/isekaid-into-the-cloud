// The Lost and Found, nights 2 to 5 (storyboard v7, frames 12, 14, 15 and 17, "The numbers" and "Nights"): the map
// and its rooms. js/mode-pop.js is night 1 and the state machine; this file plugs into its hooks (P.genMap per night,
// P.ROOMS, P.SCREENS, P.SIM, P.claimOf, P.onNight / onFight / onTurn / onClear, P.numsHook, P.xtra). What a night
// adds comes from SD.pop.rules(night, day), never from s.night directly. Bank questions only: format checks are
// another file's job.
//   - Night 2: keys drop from cleared claims (1, a Big Claim 2, a Loud room 1 more). The Vault takes 1 key: a relic,
//     sealed by one room check. The Shortcut takes 1 key: skip the next row, whose checks stay unspent and so come to
//     the Hunch as loose proofs. The Records vault (night 3+) takes 2 keys: the Blameless Postmortem.
//   - Night 3: Halcyon (Kai) and the Arcanum (Dutch) join, each claim may be its homeland's second claim, and the
//     last row holds a Big Claim (severity 48, hits 11): a false AWS statement whose truth shows on the clear screen.
//     The Blameless Postmortem is played, never staked: 3 Capacity, Guard 3 per first try proven tonight.
//   - Night 4: the marsh cat sits by a door with something in its mouth, and the map says where it goes next.
//     Catching it spends one room check: right, it drops a relic; wrong, only its silhouette goes in the ledger.
//     Room modifiers: Cramped (a hand of 3, severity -8) and Loud (hits +2, one more key). Home turf: in a claim
//     from a lead's homeland, that lead's cards get +2 (Fan-Out +1).
//   - Every night has its own light, and the Hunch is a little bigger each night.
(function () {
  if (!SD.pop || !SD.pop._) return;
  const P = SD.pop, M = SD.modes, U = SD.ui, S = SD.state, E = () => SD.exam;
  const _ = P._, H = P.HOMES, C = P.CARDS, esc = _.esc;
  const sv = () => S.save;
  const cur = () => sv().pop || null;
  const R = s => P.rules(s.night, s.iso);
  const pick = a => a[Math.floor(_.rnd() * a.length)];

  // ---- Existing art for the sprites the monster table doesn't list yet (assets/img/monsters/) ----
  if (SD.art && SD.art.addFoe && SD.art.hasFoe) {
    const cols = { mailstorm: '#9fd0ff', shadowhero: '#8f7fb0', mailleviathan: '#6fb6ff', hotshard: '#ff8a4d', vaultgolem: '#c9a07a', tilehoarder: '#d8c27a' };
    Object.keys(cols).forEach(k => { if (!SD.art.hasFoe(k)) SD.art.addFoe(k, { col: cols[k], anim: 'float', src: `assets/img/monsters/${k}.webp` }); });
  }

  // ---- Cards: Kai's and Dutch's homeland rewards, and the Records vault's Postmortem ----
  Object.assign(C, {
    ttl: { name: 'Time to Live', who: 'Kai', verb: 'finish', cost: 1, hit: 5, finish: 14, icon: 'hourglass' },
    batchwrite: { name: 'Batch Write', who: 'Kai', verb: 'finish', cost: 2, hit: 11, finish: 18, icon: 'stack' },
    trail: { name: 'Audit Trail', who: 'Dutch', verb: 'setup', cost: 1, guard: 5, setup: 3, icon: 'scroll-quill' },
    changeset: { name: 'Change Set', who: 'Dutch', verb: 'setup', cost: 2, hit: 6, setup: 8, icon: 'files' },
    postmortem: { name: 'Blameless Postmortem', who: 'Dutch', verb: 'played', cost: 3, noStake: true, pm: 1, icon: 'open-book' }
  });
  const baseText = P.cardText;
  P.cardText = e => (C[e.id] && C[e.id].pm ? 'Played, never staked. Guard 3 per first try proven tonight' : baseText(e));
  P.pmGuard = s => 3 * s.log.filter(l => l.ok && l.kind !== 'practice').length;

  // ---- Homelands: Halcyon and the Arcanum, and every homeland's second claim (night 3+) ----
  Object.assign(H, {
    halcyon: { name: 'Halcyon', lead: 'Kai', icon: 'scales',
      claim: { name: 'Spare Ration', sprite: 'glutton', sev: 30, hits: [8, 7, 9], says: 'That portion was always mine' },
      claim2: { name: 'Tile Hoarder', sprite: 'tilehoarder', sev: 32, hits: [8, 8, 9], says: 'Every tile, mine' },
      cleared: ['kai', 'smile', 'Off the pass. Next ticket.'],
      reward: ['ttl', 'batchwrite'],
      lost: { item: 'scale', text: 'A grain scale, cracked down the middle, still trying to weigh something.', who: 'kai',
        lines: [['kai', 'smile', 'I\'ll fix it.'], ['dutch', 'neutral', 'You won\'t.'], ['kai', 'tired', 'Yes, chef.']],
        fix: 'Let Kai fix it', leave: 'Dutch pockets the counterweight.' } },
    arcanum: { name: 'The Arcanum', lead: 'Dutch', icon: 'all-seeing-eye',
      claim: { name: 'Overdue Return', sprite: 'revenant', sev: 34, hits: [9, 8, 8], says: 'Returned it years ago' },
      claim2: { name: 'Stale Index', sprite: 'staleindex', sev: 30, hits: [8, 9, 7], says: 'It\'s in the catalogue' },
      cleared: ['dutch', 'neutral', 'Struck from the catalogue. Next.'],
      reward: ['trail', 'changeset'],
      lost: { item: 'mop', text: 'A mop head, staff issue, wrung out and hung up neat.', who: 'mira',
        lines: [['mira', 'smile', 'That\'s yours.'], ['dutch', 'neutral', 'It\'s staff issue.'], ['mira', 'warm', 'So it\'s yours.']],
        fix: 'Let Dutch wring it out', leave: 'Dutch hangs it back up. Neat.' } }
  });
  H.thornwick.claim2 = { name: 'Marsh Magistrate', sprite: 'judge', sev: 34, hits: [9, 9, 8], says: 'Ruled on, already' };
  H.peak.claim2 = { name: 'Sleeve Snatcher', sprite: 'snatcher', sev: 28, hits: [8, 7, 8], says: 'Never touched it' };
  const lineOf = { globe: ['kai', 'smile', 'Told you. Gift shop.'], leg: ['dutch', 'anger', 'That chair. I knew it.'] };
  P.ITEMS.forEach(it => { if (lineOf[it.id] && !it.line) it.line = lineOf[it.id]; });

  // The Big Claims (storyboard v7, "Big Claim truths"): a false AWS statement each, its truth on the clear screen.
  P.BIG = {
    thornwick: { name: 'The Once-Only Leviathan', sprite: 'mailleviathan', sev: 48, hits: [11, 11, 11], says: 'Standard queues deliver exactly once',
      truth: 'Standard queues deliver at least once; FIFO gives exactly-once processing within its 5-minute deduplication window.', doc: 'Amazon SQS Developer Guide' },
    halcyon: { name: 'The Hot Shard', sprite: 'hotshard', sev: 48, hits: [11, 11, 11], says: 'Spare capacity means no throttling',
      truth: 'A hot partition key can be throttled even with spare table capacity.', doc: 'Amazon DynamoDB Developer Guide' },
    peak: { name: 'The Vault Golem', sprite: 'vaultgolem', sev: 48, hits: [11, 11, 11], says: 'IAM alone decides who uses a KMS key',
      truth: 'Who can use a KMS key is set by its key policy, plus any IAM policies it allows and any grants.', doc: 'AWS KMS Developer Guide' },
    arcanum: { name: 'The Crystal Head', sprite: 'crystalhead', sev: 48, hits: [11, 11, 11], says: 'CloudTrail already logs every data event',
      truth: 'CloudTrail data events are off by default.', doc: 'AWS CloudTrail User Guide' }
  };
  const MODS = {
    cramped: { name: 'Cramped', text: 'a hand of 3, severity −8' },
    loud: { name: 'Loud', text: 'hits +2, and one more key when cleared' }
  };
  P.MODS = MODS;
  P.claimOf = function (f) {
    const h = H[f.home], c = f.big ? P.BIG[f.home] : f.variant && h.claim2 ? h.claim2 : h.claim;
    return f.mod === 'loud' ? Object.assign({}, c, { hits: c.hits.map(x => x + 2) }) : c;
  };

  // Relics: one night's help, from a Vault or the cat.
  P.RELICS = {
    coat: { name: 'an enforcer\'s spare coat, folded', icon: 'checked-shield', text: 'Guard 3 at the start of every turn tonight.' },
    satchel: { name: 'a courier\'s satchel', icon: 'swap-bag', text: 'Draw 1 more card on each fight\'s first turn tonight.' },
    ladle: { name: 'a cook\'s ladle, still warm', icon: 'full-wood-bucket', text: '+12% budget, now.' },
    whetstone: { name: 'a whetstone, worn to a curve', icon: 'spanner', text: 'Both Patches upgraded, +3 each.' }
  };
  function gainRelic(s) {
    const left = Object.keys(P.RELICS).filter(k => !s.relics.includes(k));
    if (!left.length) { s.budget = Math.min(100, s.budget + 10); return null; }
    const k = pick(left);
    s.relics.push(k);
    if (k === 'ladle') s.budget = Math.min(100, s.budget + 12);
    if (k === 'whetstone') s.deck.filter(e => e.id === 'patch').forEach(e => { e.up = (e.up | 0) + 1; });
    return k;
  }

  // ---- Lines (new text, on the review list) ----
  const SAY = {
    titles: { 1: 'Prove it', 2: 'I can always tell', 3: 'Gut says so' },
    keys: 'Arcanum lock. I kept the keys. Every one.',
    vaultHelp: 'Vault: a relic, sealed by one room check. Shortcut: skip a row; its checks become loose proofs.',
    recordsHelp: ' Records vault: the Blameless Postmortem.',
    night2: 'New tonight: keys. Cleared claims drop them; vaults and the shortcut take them.',
    night3: ['dutch', 'neutral', 'Something big moved into the heap. Says it\'s AWS. Says it loud.'],
    night3b: 'New tonight: Halcyon and the Arcanum, a Big Claim, and the records vault.',
    night4: ['dutch', 'anger', 'There\'s a cat in my heap.'],
    night4b: 'New tonight: the marsh cat, room modifiers and home turf.',
    deflate: { 2: '…It\'s been wrong before.', 3: 'Twenty-five years, and nobody ever made it show its working. Me included.', 4: 'Smaller every night. I could get used to that.' },
    locked: ['dutch', 'neutral', 'Locked. Keys come off cleared claims.'],
    vaultOpen: ['dutch', 'neutral', 'One key. One check. Then it\'s yours.'],
    vaultWon: ['dutch', 'smile', 'Seal\'s off. That\'s a record.'],
    vaultLost: ['dutch', 'tired', 'Seal held. The key stays in the lock. Happens.'],
    shortcut: ['dutch', 'neutral', 'Back stairs. Skips a row. The checks you\'d have spent come up with you.'],
    shortTaken: ['dutch', 'neutral', 'Up we go. Mind the third step.'],
    records: ['dutch', 'neutral', 'The records vault. Two keys. Nobody gets blamed in here. We just write down what happened.'],
    recordsOpen: ['dutch', 'smile', 'Blameless Postmortem. It pays for what you proved, not what you bet.'],
    pass: ['dutch', 'neutral', 'Suit yourself. It\'ll keep.'],
    catChorus: [['mira', 'warm', 'Patient.'], ['kai', 'smile', 'Chef.'], ['seoyeon', 'neutral', 'Honoured Guest.'], ['dutch', 'anger', 'Suspect.']],
    catIn: 'The marsh cat is sitting by this door with something in its mouth.',
    catWon: ['kai', 'warm', 'Come here, love.'],
    catWonB: 'Everyone flinches. The cat doesn\'t. It drops what it was carrying and leaves.',
    catLost: ['dutch', 'anger', 'Suspect fled the scene. Again.'],
    catLostB: 'It\'s gone over the heap. Only its silhouette goes in the ledger.',
    catGo: ['dutch', 'anger', 'Fine. Go. I\'ve got your description.']
  };
  P.deflate = s => (s.night >= 2 ? SAY.deflate[Math.min(4, s.night)] : null);

  // ---- The maps: wider after night 1 (five rows, three doors from the second row on: four doors don't fit labels at
  // 12px on a 375px phone). Rows, bottom first; the Hunch is above the last row. ----
  const SPEC = {
    2: [['claim'], ['claim', 'lost', 'break'], ['claim', 'vault', 'lost'], ['claim', 'shortcut', 'break'], ['claim', 'lost', 'claim']],
    3: [['claim'], ['claim', 'lost', 'break'], ['vault', 'claim', 'lost'], ['claim', 'shortcut', 'records'], ['big', 'vault', 'break']],
    4: [['claim'], ['claim', 'lost', 'break'], ['claim', 'vault', 'lost'], ['claim', 'shortcut', 'records'], ['big', 'vault', 'lost']]
  };
  P.SPEC = SPEC;
  const baseMap = P.genMap;
  P.genMap = function (n, s) {
    if (!n || n <= 1) return baseMap();
    const r = s ? R(s) : P.rules(n), spec = SPEC[Math.min(4, n)];
    let deal = [];
    const home = () => { if (!deal.length) deal = _.shuffle(r.homes); return deal.shift(); };
    const rows = spec.map((row, k) => (k ? _.shuffle(row) : row).map(t => {
      if (t === 'big') return { type: 'claim', big: 1, home: home() };
      if (t === 'claim') { const x = { type: 'claim', home: home() }; if (r.bigClaim && _.rnd() < 0.5) x.variant = 1; return x; }
      if (t === 'lost') return { type: 'lost', home: home() };
      if ((t === 'records' && !r.postmortem) || (!r.keys && /vault|shortcut|records/.test(t))) return { type: 'break', home: null };
      return { type: t, home: null };
    }));
    if (r.modifiers) {
      const claims = rows.slice(1).flat().filter(x => x.type === 'claim' && !x.big);
      _.shuffle(claims).slice(0, 2).forEach((x, i) => { x.mod = i ? 'loud' : 'cramped'; });
    }
    return rows;
  };

  // ---- Night state ----
  P.onNight = function (s) {
    s.keys = 0; s.relics = []; s.seal = null; s.cat = null;
    const r = R(s), rows = s.map.rows;
    if (r.cat && rows.length > 2) s.cat = { r: 1, c: Math.floor(_.rnd() * rows[1].length), nr: 2, nc: Math.floor(_.rnd() * rows[2].length), done: null, gone: 0 };
  };
  P.onFight = function (s, f) {
    if (f.kind === 'claim' && f.mod === 'cramped') f.sev = f.max = Math.max(10, f.sev - 8);
  };
  P.onTurn = function (s, f) {
    const rel = s.relics || [];
    if (f.mod === 'cramped') while (f.hand.length > 3) f.discard.push(f.hand.pop());
    if (rel.includes('satchel') && f.turn === 1) {
      if (!f.draw.length) { f.draw = _.shuffle(f.discard); f.discard = []; }
      if (f.draw.length) f.hand.push(f.draw.shift());
    }
    if (rel.includes('coat')) f.guard += 3;
  };
  P.homeTurf = s => { const f = s.fight; return !!(f && f.kind === 'claim' && R(s).homeTurf && H[f.home]); };
  P.numsHook = function (s, e, o) {
    if (!P.homeTurf(s) || C[e.id].who !== H[s.fight.home].lead) return;
    if (o.hit) o.hit += 2; if (o.guard) o.guard += 2; if (o.setup) o.setup += 2; if (o.boost) o.boost += 1;
  };
  P.onClear = function (s, f) {
    const k = R(s).keys ? (f.big ? 2 : 1) + (f.mod === 'loud' ? 1 : 0) : 0;
    s.keys = (s.keys | 0) + k;
    s.reward.key = k;
    if (f.big) s.reward.big = f.home;
  };

  // ---- Rooms ----
  P.ROOMS.vault = s => { s.phase = 'vault'; };
  P.ROOMS.shortcut = s => { s.phase = 'shortcut'; };
  P.ROOMS.records = s => { s.phase = 'records'; };
  P.leaveRoom = s => { s.phase = 'map'; };
  P.openVault = function (s) {
    if (s.keys < 1 || !s.rooms.length) return false;
    s.keys--; s.seal = { ck: s.rooms.shift(), why: 'vault' }; s.phase = 'seal';
    return true;
  };
  P.takeShortcut = function (s) {
    const next = s.map.rows[s.map.row + 1];
    if (s.keys < 1 || !next) return false;
    s.keys--;
    next.forEach(n => { n.skipped = 1; });
    s.map.row++; s.map.col = -1;
    s.msg = SAY.shortTaken; s.phase = 'map';
    moveCat(s);
    return true;
  };
  P.openRecords = function (s) {
    if (s.keys < 2 || !R(s).postmortem) return false;
    s.keys -= 2; s.deck.push({ id: 'postmortem', up: 0 }); s.msg = SAY.recordsOpen; s.phase = 'map';
    return true;
  };
  // A sealed check: one room check, no stake. r = { ok, conf, pts }, as SD.modes.ask returns it.
  P.sealDone = function (s, r) {
    const sl = s.seal, ck = sl.ck, conf = [0, 1, 2].includes(r.conf) ? r.conf : 0, ok = !!r.ok;
    s.pts += r.pts || 0; s.asked++;
    s.log.push({ q: ck.q, d: ck.d, kind: ck.kind === 'room' ? 'seal' : ck.kind, conf, ok, staked: 0, stamped: ck.stamped !== false, fresh: !!ck.fresh || _.ageOf(ck.q) === Infinity, t: Date.now() });
    if (!ok) _.miss(s, ck);
    sl.ok = ok; sl.conf = conf; sl.relic = ok ? gainRelic(s) : null;
    if (sl.why === 'cat') {
      s.cat.done = ok ? 'caught' : 'seen';
      if (!s.sim) sv().popCat = ok || sv().popCat === 'caught' ? 'caught' : 'seen';
    }
    s.phase = 'sealout';
    return ok;
  };
  P.sealOn = function (s) {
    const sl = s.seal; s.seal = null;
    if (sl && sl.why === 'cat') return walkOn(s, s.cat.at);
    s.phase = 'map';
    return 'map';
  };

  // ---- The marsh cat (night 4+): it sits by a door, and the map says where it goes next ----
  const roomRows = s => s.map.rows.length;
  function moveCat(s) {
    const c = s.cat;
    if (!c || c.done || c.gone) return;
    while (!c.gone && c.r <= s.map.row) {
      if (c.nr == null || c.nr >= roomRows(s)) { c.gone = 1; break; }
      c.r = c.nr; c.c = c.nc;
      c.nr = c.r + 1 < roomRows(s) ? c.r + 1 : null;
      c.nc = c.nr != null ? Math.floor(_.rnd() * s.map.rows[c.nr].length) : null;
    }
  }
  P.catHere = (s, r, i) => { const c = s.cat; return !!(c && !c.done && !c.gone && c.r === r && c.c === i); };
  const baseGo = P.go;
  function walkOn(s, i) { const r = baseGo(s, i); if (r) moveCat(s); return r; }
  P.go = function (s, i) {
    const row = s.map.row + 1, node = s.map.rows[row] && s.map.rows[row][i];
    if (!node) return null;
    if (P.catHere(s, row, i)) { s.cat.at = i; s.msg = null; s.phase = 'cat'; return 'cat'; }
    return walkOn(s, i);
  };
  P.catchCat = function (s) {
    if (!s.rooms.length || !s.cat) return false;
    s.seal = { ck: s.rooms.shift(), why: 'cat' }; s.phase = 'seal';
    return true;
  };
  P.letCatGo = s => walkOn(s, s.cat.at);

  // ---- Simulator steps for the new rooms ----
  P.SIM.vault = (s, pol, answer) => { if (s.keys >= 1 && s.rooms.length > 3 && P.openVault(s)) P.sealDone(s, answer(s.seal.ck)); else P.leaveRoom(s); };
  P.SIM.records = s => { if (!P.openRecords(s)) P.leaveRoom(s); };
  P.SIM.shortcut = s => { if (!(s.budget < 60 && P.takeShortcut(s))) P.leaveRoom(s); };
  P.SIM.cat = (s, pol, answer) => { if (s.rooms.length > 3 && P.catchCat(s)) P.sealDone(s, answer(s.seal.ck)); else P.letCatGo(s); };
  P.SIM.seal = (s, pol, answer) => P.sealDone(s, answer(s.seal.ck));
  P.SIM.sealout = s => P.sealOn(s);
  // The simulator's 'plan' route: what a player who reads the map does. Keys go to vaults, the cat gets caught, and
  // room checks are kept for a Big Claim still ahead.
  P.simRoute = function (s, doors, row) {
    const ahead = s.map.rows.slice(s.map.row + 2).flat(), bigAhead = ahead.some(n => n.big), recAhead = ahead.some(n => n.type === 'records');
    const score = i => {
      const n = row[i];
      if (P.catHere(s, s.map.row + 1, i) && s.rooms.length > 3) return 6;
      if (n.type === 'records') return s.keys >= 2 ? 5 : 0;
      if (n.type === 'vault') return s.keys >= (recAhead ? 3 : 1) && s.rooms.length > 3 ? 4 : 0;
      if (n.big) return s.rooms.length >= 3 ? 5 : 0;
      if (n.type === 'claim') return s.rooms.length - (bigAhead ? 5 : 0) >= 3 ? 3 : 0;
      return n.type === 'break' && s.budget < 60 ? 2 : 1;
    };
    const best = Math.max(...doors.map(score));
    return doors.filter(i => score(i) === best);
  };
  P.simOut = s => ({ relics: (s.relics || []).length, cat: s.cat ? s.cat.done || 'missed' : null, pm: s.deck.some(e => e.id === 'postmortem') ? 1 : 0,
    big: s.log.length && s.map.rows.flat().some(n => n.big && n.cleared) ? 1 : 0, skipped: s.map.rows.flat().some(n => n.skipped) ? 1 : 0 });
  P.playPm = function (s, h) {
    const f = s.fight, e = f && s.deck[f.hand[h]];
    if (!e || !C[e.id].pm || f.capLeft < 3 || f.played.includes(h) || f.basics.some(b => b.h === h)) return false;
    const g = P.pmGuard(s);
    f.guard += g; f.capLeft -= 3;
    f.basics.push({ h, kind: 'guard', label: `Blameless Postmortem: Guard ${g}` });
    return true;
  };
  P.simLand = function (s) {
    const f = s.fight;
    if (!f || f.capLeft < 3 || P.pmGuard(s) <= 9) return;
    const h = f.hand.findIndex((x, k) => C[s.deck[x].id].pm && !f.played.includes(k));
    if (h >= 0) P.playPm(s, h);
  };

  // ---- Drawing ----
  const { icon, say, sayL, panel, hud, dock, stopBtn, wireStop, plural } = _;
  const V = {
    vault: { label: 'Vault · 1 key', fog: 'Vault?', icon: 'padlock' },
    shortcut: { label: 'Shortcut · 1 key', fog: 'Shortcut?', icon: 'padlock' },
    records: { label: 'Records vault · 2 keys', fog: 'Records?', icon: 'all-seeing-eye' }
  };
  const baseLabel = P.doorLabel, baseIcon = P.doorIcon;
  P.doorLabel = (n, fog) => (V[n.type] ? (fog ? V[n.type].fog : V[n.type].label) : n.big && !fog ? `Big Claim · ${H[n.home].name}` : baseLabel(n, fog));
  P.doorIcon = n => (V[n.type] ? V[n.type].icon : baseIcon(n));
  P.doorExtra = function (s, n, r, i, fog) {
    const c = s.cat, bits = [];
    if (n.mod && !fog) bits.push(`<span class="pop-mod">${esc(MODS[n.mod].name)}</span>`);
    if (P.catHere(s, r, i)) bits.push(`<span class="pop-cat" title="The marsh cat">${icon('cat')}</span>`);
    else if (c && !c.done && !c.gone && c.nr === r && c.nc === i) bits.push(`<span class="pop-cat next" title="Where the cat goes next">${icon('cat')}</span>`);
    if (n.skipped) bits.push('<span class="pop-mod">Skipped</span>');
    return bits.join('');
  };
  const roomName = n => (n.type === 'break' ? 'Break room' : n.type === 'lost' ? 'Lost item room' : P.doorLabel(n, false));
  function catLine(s) {
    const c = s.cat;
    if (!c || c.done || c.gone) return '';
    const rows = s.map.rows, n = rows[c.r][c.c];
    const at = rows[c.r].length > 1 ? c.c / (rows[c.r].length - 1) : 0.5;
    let where = 'over the heap and away';
    if (c.nr != null) {
      const to = rows[c.nr].length > 1 ? c.nc / (rows[c.nr].length - 1) : 0.5;
      where = `${to < at - 0.1 ? '← ' : to > at + 0.1 ? '→ ' : '↑ '}the ${roomName(rows[c.nr][c.nc])}`;
    }
    return `<p class="small pop-catline">${icon('cat')} <span>The marsh cat is by the ${esc(roomName(n))}${c.r === s.map.row + 1 ? '' : ', further up'} with something in its mouth. Next it goes: ${esc(where)}.</span></p>`;
  }
  P.xtra = function (s, where) {
    if (where === 'ledger') {
      const k = sv().popCat;
      return k ? `<div class="pop-lrow"><b>The marsh cat</b><div><span class="pop-li${k === 'caught' ? '' : ' blank'}">${icon('cat', k === 'caught' ? '' : 'sil')} ${k === 'caught' ? 'caught, once. It left again.' : 'a silhouette'}</span></div></div>` : '';
    }
    if (!s) return '';
    const r = R(s), f = s.fight;
    if (where === 'title') return SAY.titles[s.night] ? ` · ${esc(SAY.titles[s.night])}` : '';
    if (where === 'hud') return r.keys ? `<span>Keys <b>${s.keys | 0}</b></span>` : '';
    if (where === 'arrive') {
      if (s.night === 2) return `<p class="small">${esc(SAY.night2)}</p>`;
      if (s.night === 3) return `${sayL(SAY.night3)}<p class="small">${esc(SAY.night3b)}</p>`;
      if (s.night === 4) return `${sayL(SAY.night4)}<p class="small">${esc(SAY.night4b)}</p>`;
      return '';
    }
    if (where === 'map') {
      const next = s.map.rows[s.map.row + 1] || [], ahead = s.map.rows.slice(s.map.row + 1).flat();
      const vaults = ahead.some(n => V[n.type] && !n.visited);
      return (next.some(n => V[n.type]) ? say('dutch', 'neutral', SAY.keys) : '') +
        (vaults ? `<p class="small">${esc(SAY.vaultHelp + (r.postmortem ? SAY.recordsHelp : ''))}</p>` : '') + catLine(s) +
        ((s.relics || []).length ? `<p class="small muted">Relics: ${s.relics.map(k => esc(P.RELICS[k].name)).join(' · ')}</p>` : '');
    }
    if (where === 'stage' && f) {
      const bits = [];
      if (f.big) bits.push('<b class="pop-bigtag">BIG CLAIM</b>');
      if (f.mod) bits.push(`${esc(MODS[f.mod].name)}: ${esc(MODS[f.mod].text)}`);
      if (P.homeTurf(s)) bits.push(`Home turf: ${esc(H[f.home].lead)}'s cards +2`);
      return bits.length ? `<span class="small pop-tags">${bits.join(' · ')}</span>` : '';
    }
    if (where === 'reward' && s.reward) {
      const rw = s.reward, b = rw.big && P.BIG[rw.big];
      return (b ? `<div class="pop-truth"><b>The claim was false. The truth:</b> ${esc(b.truth)}<span class="small">📄 ${esc(b.doc)} · ✓ Verified</span></div>` : '') +
        (rw.key ? `<p class="pop-find">${icon('key')} <span>${rw.key === 1 ? 'A key' : rw.key + ' keys'} in the rubble. Keys: ${s.keys}.</span></p>` : '');
    }
    if (where === 'land' && f) {
      const h = f.hand.findIndex((x, k) => C[s.deck[x].id].pm && !f.played.includes(k) && !f.basics.some(b => b.h === k));
      if (h < 0) return '';
      return f.capLeft >= 3 ? `<button class="ghost pop-pm" data-popx="pm" data-h="${h}">${icon('open-book')} Play Blameless Postmortem: Guard ${P.pmGuard(s)} (3 Capacity)</button>`
        : '<p class="small muted">The Blameless Postmortem takes all 3 Capacity: stake nothing to play it.</p>';
    }
    if (where === 'sheet') {
      const rel = (s.relics || []).map(k => `${icon(P.RELICS[k].icon)} ${esc(P.RELICS[k].name)}`);
      const cat = s.cat && s.cat.done ? (s.cat.done === 'caught' ? 'You caught the marsh cat.' : 'The marsh cat got away: its silhouette is in the ledger.') : '';
      return (rel.length ? `<p class="small">Relics tonight: ${rel.join(' · ')}</p>` : '') + (cat ? `<p class="small">${icon('cat')} ${cat}</p>` : '');
    }
    return '';
  };
  document.addEventListener('click', ev => {
    const t = ev.target.closest && ev.target.closest('[data-popx="pm"]');
    const s = cur();
    if (!t || !s || s.phase !== 'land') return;
    if (P.playPm(s, +t.dataset.h)) { _.save(s); P.draw(); }
  });

  function roomPanel(s, banner, ic, body, opts) {
    const b = panel(`${hud(s)}
      <p class="pop-banner">${icon(ic)} ${esc(banner)}</p>${body}
      <div class="opts">${opts.map(o => `<button class="opt" id="${o.id}"${o.off ? ' disabled' : ''}>${o.html}</button>`).join('')}</div>
      ${dock(stopBtn)}`);
    opts.forEach(o => { const el = b.querySelector('#' + o.id); if (el && !o.off) el.onclick = () => { o.go(); _.save(s); P.draw(); }; });
    wireStop(b);
    return b;
  }
  P.SCREENS.vault = s => roomPanel(s, 'VAULT · ARCANUM LOCK', 'padlock',
    `${sayL(s.keys >= 1 ? SAY.vaultOpen : SAY.locked)}<p class="small">Inside: a relic for tonight, sealed by one room check. No stake: right opens it, wrong leaves it shut and the key in the lock.</p>`,
    [{ id: 'pop-vopen', off: s.keys < 1 || !s.rooms.length, html: `<b>Open it</b> (1 key, 1 room check). Keys: ${s.keys}.`, go: () => P.openVault(s) },
      { id: 'pop-vpass', html: '<b>Walk on.</b>', go: () => { P.leaveRoom(s); s.msg = SAY.pass; } }]);
  P.SCREENS.shortcut = s => roomPanel(s, 'SHORTCUT', 'padlock',
    `${sayL(SAY.shortcut)}<p class="small">Skip the next row. Its room checks stay unspent, so they come to the Hunch as loose proofs.</p>`,
    [{ id: 'pop-stake', off: s.keys < 1, html: `<b>Take it</b> (1 key). Keys: ${s.keys}.`, go: () => P.takeShortcut(s) },
      { id: 'pop-spass', html: '<b>Walk on.</b>', go: () => P.leaveRoom(s) }]);
  P.SCREENS.records = s => roomPanel(s, 'RECORDS VAULT', 'all-seeing-eye',
    `${sayL(SAY.records)}<p class="small"><b>Blameless Postmortem</b> · Dutch · played, never staked. 3 Capacity: Guard 3 per first try proven tonight (${P.pmGuard(s)} now).</p>`,
    [{ id: 'pop-ropen', off: s.keys < 2, html: `<b>Open it</b> (2 keys): the Postmortem goes in your deck tonight. Keys: ${s.keys}.`, go: () => P.openRecords(s) },
      { id: 'pop-rpass', html: '<b>Walk on.</b>', go: () => { P.leaveRoom(s); s.msg = SAY.pass; } }]);
  P.SCREENS.cat = s => roomPanel(s, 'THE MARSH CAT', 'cat',
    `<div class="pop-catbig">${icon('cat')}</div><p>${esc(SAY.catIn)}</p><div class="pop-chorus">${SAY.catChorus.map(sayL).join('')}</div>
     <p class="small">Catching it spends one room check, no stake. Right: it drops a relic. Wrong: only its silhouette goes in the ledger.</p>`,
    [{ id: 'pop-catch', off: !s.rooms.length, html: `<b>Catch it</b> (1 room check; ${s.rooms.length} left).`, go: () => P.catchCat(s) },
      { id: 'pop-catgo', html: '<b>Let it go</b> and walk into the room.', go: () => { P.letCatGo(s); if (s.phase === 'map') s.msg = SAY.catGo; } }]);
  P.SCREENS.seal = function (s) {
    const sl = s.seal, ck = sl.ck;
    const b = panel(`${hud(s)}
      <div class="pop-stamp"><b>DUTCH'S CHECK</b> <span>${sl.why === 'cat' ? 'The cat' : 'The vault\'s seal'} · ${ck.stamped === false ? 'UNSTAMPED' : esc(String(E().DOMAINS && E().DOMAINS[ck.d] || 'MIXED').toUpperCase())} · bank question · no stake</span></div>
      ${sl.why === 'cat' ? `<div class="pop-catbig">${icon('cat')}</div>` : say('dutch', 'neutral', SAY.vaultOpen[2])}
      ${dock(stopBtn + '<button class="primary" id="pop-sopen">Open the check</button>')}`);
    b.querySelector('#pop-sopen').onclick = () => sealAsk(s);
    wireStop(b);
  };
  async function sealAsk(s) {
    const q = _.find(s.seal.ck.q);
    if (!q) { P.sealDone(s, { ok: false, conf: 0, pts: 0 }); _.save(s); return P.draw(); }
    const left = s.rooms.length + s.core.length;
    const r = await M.ask(q, { title: "DUTCH'S CHECK", tally: s.tally, think: true, context: "Dutch's check", progress: `${s.asked + 1} of ${s.asked + 1 + left}`, onStop: () => {} });
    if (r.stopped && !r.committed) return _.stopNow();
    if (r.closed) return P.draw();
    P.sealDone(s, r);
    _.save(s);
    if (r.stopped) return _.stopNow();
    P.draw();
  }
  P.SCREENS.sealout = function (s) {
    const sl = s.seal, rel = sl.relic && P.RELICS[sl.relic], cat = sl.why === 'cat';
    const body = sl.ok
      ? `${cat ? `${sayL(SAY.catWon)}<p class="small muted"><i>${esc(SAY.catWonB)}</i></p>` : sayL(SAY.vaultWon)}
         ${rel ? `<p class="pop-find">${icon(rel.icon)} <span><b>Relic:</b> ${esc(rel.name)}. ${esc(rel.text)}</span></p>` : '<p class="small">Nothing left to find in it but dust: +10% budget.</p>'}`
      : cat ? `${sayL(SAY.catLost)}<p class="pop-find">${icon('cat', 'sil')} <span>${esc(SAY.catLostB)}</span></p>` : sayL(SAY.vaultLost);
    const b = panel(`${hud(s)}
      <p class="pop-banner">${icon(cat ? 'cat' : 'padlock')} ${sl.ok ? (cat ? 'CAUGHT' : 'SEAL BROKEN') : (cat ? 'IT GOT AWAY' : 'SEAL HELD')}</p>
      <p class="pop-since">${sl.ok ? '✓ Right' : '✗ Wrong'} · ${M.CONF[sl.conf]} · ${M.sgn(M.stake(sl.ok, sl.conf))} points</p>
      ${body}
      ${dock(stopBtn + `<button class="primary" id="pop-son">${cat ? 'Into the room' : 'Back to the heap'}</button>`)}`);
    b.querySelector('#pop-son').onclick = () => { P.sealOn(s); _.save(s); P.draw(); };
    wireStop(b);
  };

  const css = document.createElement('style');
  css.textContent = `
    .pop-stage.halcyon { background: linear-gradient(#e8cf8a, #a8823f); }
    .pop-stage.arcanum { background: linear-gradient(#9b93c0, #4d4670); color: #fff; }
    .pop-stage:has(.pop-bigtag) .pop-foe, .pop-stage:has(.pop-bigtag) .pop-foe svg { flex-basis: 96px; width: 96px; height: 96px; }
    .pop-tags { display: block; margin-top: 2px; }
    .pop-bigtag { letter-spacing: .06em; }
    .pop-mod { position: absolute; bottom: -9px; left: 50%; transform: translateX(-50%); font-size: 11px; font-weight: 800; padding: 0 5px; border: 2px solid var(--ink, #17131f); border-radius: 6px; background: var(--sun, #b8923a); color: var(--ink, #17131f); white-space: nowrap; }
    .pop-cat { position: absolute; top: -12px; left: -8px; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; border-radius: 50%; background: #fffaf0; border: 2px solid var(--ink, #17131f); color: #17131f; }
    .pop-cat .pop-gi { width: 30px; height: 30px; }
    .pop-cat.next { background: transparent; border-style: dashed; color: #fffaf0; opacity: .8; }
    .pop-door .pop-cat .pop-gi { width: 30px; height: 30px; }
    .pop-catline { display: flex; gap: 6px; align-items: flex-start; }
    .pop-catline .pop-gi { width: 20px; height: 20px; flex: 0 0 20px; }
    .pop-catbig { display: flex; justify-content: center; }
    .pop-catbig .pop-gi { width: 64px; height: 64px; }
    .pop-chorus { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; }
    .pop-gi.sil { filter: brightness(0); opacity: .7; }
    .pop-truth { display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: var(--bone, #e2dbcb); font-size: 15px; }
    .pop-pm { display: flex; align-items: center; gap: 6px; min-height: 44px; text-align: left; }
    .pop-pm .pop-gi { width: 22px; height: 22px; flex: 0 0 22px; }
    /* A different light each night: dusk, blue with lantern pools, fog and moonlight, clear moonlight, before dawn. */
    .pop-n2 .pop-sky { background: linear-gradient(#1c2f4f, #3f5f80 130%); }
    .pop-n2 .pop-map { background: radial-gradient(circle at 18% 30%, rgba(255, 196, 102, .5) 0 30px, transparent 62px), radial-gradient(circle at 82% 72%, rgba(255, 196, 102, .45) 0 28px, transparent 58px), repeating-linear-gradient(45deg, #4f5f78 0 6px, #485770 6px 12px); }
    .pop-n3 .pop-sky { background: linear-gradient(#1f2740, #8d97ab 150%); }
    .pop-n3 .pop-map { background: linear-gradient(rgba(226, 232, 242, .42), rgba(226, 232, 242, .06) 70%), radial-gradient(circle at 86% 8%, rgba(244, 247, 255, .85) 0 16px, transparent 40px), repeating-linear-gradient(45deg, #5d6470 0 6px, #575e69 6px 12px); }
    .pop-n4 .pop-sky { background: radial-gradient(circle at 80% 18%, #f1f3fb 0 10px, transparent 24px), linear-gradient(#0f1830, #2c3550 140%); }
    .pop-n4 .pop-map { background: radial-gradient(circle at 80% 6%, rgba(240, 244, 255, .5) 0 20px, transparent 70px), repeating-linear-gradient(45deg, #3c4558 0 6px, #363e50 6px 12px); }
    .pop-n5 .pop-sky { background: linear-gradient(#2c3550, #b88a9a 150%); }
    .pop-n5 .pop-map { background: linear-gradient(rgba(214, 170, 180, .35), transparent 60%), repeating-linear-gradient(45deg, #5a5464 0 6px, #544e5e 6px 12px); }
    /* The Hunch, a little bigger each night. */
    .pop-n2 .pop-sky .pop-hunch { width: 130px; height: 119px; } .pop-n2 .pop-stage.hunch .pop-foe svg { transform: scale(1.06); }
    .pop-n3 .pop-sky .pop-hunch { width: 140px; height: 128px; } .pop-n3 .pop-stage.hunch .pop-foe svg { transform: scale(1.12); }
    .pop-n4 .pop-sky .pop-hunch { width: 150px; height: 137px; } .pop-n4 .pop-stage.hunch .pop-foe svg { transform: scale(1.18); }
    .pop-n5 .pop-sky .pop-hunch { width: 160px; height: 147px; } .pop-n5 .pop-stage.hunch .pop-foe svg { transform: scale(1.24); }
    .pop-n2 .pop-hunchdoor .pop-hunch { width: 56px; } .pop-n3 .pop-hunchdoor .pop-hunch { width: 60px; } .pop-n4 .pop-hunchdoor .pop-hunch, .pop-n5 .pop-hunchdoor .pop-hunch { width: 64px; }`;
  document.head.appendChild(css);
})();
