// The Lost and Found (Proof of Power Lite, storyboard v7, approved Nov 15): a short deckbuilding expedition through
// the heap of rooms Freya deleted. Dutch stamps each check with its domain; you stake cards on it before you read it,
// then prove it on its own screen, and the shared stake table (js/modes.js) decides how hard they land.
// This file is night 1: bank questions only, placeholder art. Nights 2 to 5 (keys and vaults, the formats, the Big
// Claim, the cat) and the Hunch's pixel art come after.
//   - A night is 12 checks: 9 room checks and 3 core proofs, 13 at most with a twin practice. Picks are per domain
//     (4 / 3 / 3 / 2, one slot tilted to the domain Today's set most needs), verified-only with the shell's fallback.
//   - Stake, then prove: right lands staked cards at x0.75 / x1 / x1.25 for Guess / Think so / Sure; wrong fizzles,
//     costs a quarter of the stake in budget, or three quarters and the Wall. Unstaked capacity plays Patch 3 or
//     Guard 3, so no hand is dead. Hand of 4, 3 Capacity, an 8-card starter.
//   - Claims (fights) take room checks; a claim with none left flees. Lost items and the break room ask nothing.
//   - The Hunch: every unspent room check is a loose proof (+3 to its hit until proven), then 3 core proofs (bank
//     questions not answered in 7 days, the third unstamped and never seen). Hold 2 and it doesn't check out.
//   - At 0% budget: retreat, or escalate (budget min(20%, what you came in with), the Hunch hits 3 harder).
//   - A miss comes back by the twins rule: with 2+ verified twins one returns 2 checks later as practice and one
//     next night; with 1, next night; with none, the question itself next night. At most 3 open the next night.
//   - Domain stamps (Nov 16): every door on the map shows the exam domain of the checks behind it, in words and an
//     icon, fogged doors too. A claim stamped D takes its room checks in D while any are left. Off on the unstamped
//     days (rules().prep false). A right room check in a non-claim room stamped D (js/mode-pop-rooms.js: a Lost item
//     or break room's "check it first", a Vault's seal, the cat) gives a Prepared: D token; the next claim tonight
//     stamped D spends it, and its staked cards land at PREP (x1.25) times the right multiplier, partly right too.
//     Wrong costs are unchanged. The check it spends isn't a loose proof at the Hunch: that's the trade-off.
//     Taught through the world (Ladi): the stamp is Dutch's ink on the door, the token a Prepared tag tied to the
//     next matching claim's door (P.tagged), and the first token ever earned gets one line saying what it does.
//     No walkthrough screen. x1.25 barely moves pop_sim's route scores yet: see tools/pop_sim.js's header.
//   - Saves after every step (S.save.pop). The night score is proofs held, claims cleared and points. A night saved
//     before the stamps (no node.d, no s.prep) still loads: its doors just show no stamp.
// Shared by the UI and the simulator (tools/pop_sim.js, tools/modes_sim.js): SD.pop.newNight, go, lock, settle,
// basic, endTurn, escalate, finish. Nights 2 to 5's rooms live in js/mode-pop-rooms.js, through the hooks marked
// "hook"; their question formats live in js/mode-pop-formats.js, called through the SD.pop.fx hooks here.
(function () {
  if (!SD.modes) return;
  const M = SD.modes, U = SD.ui, S = SD.state, E = () => SD.exam, D = () => SD.topicDrill;
  const esc = s => U.esc(s);
  const ID = 'pop', TITLE = 'THE LOST AND FOUND';
  const P = SD.pop = {};
  const sv = () => S.save;
  const cur = () => sv().pop || null;
  const DAY = 864e5;
  const CAP = 3, HAND = 4, ROOM_CHECKS = 9, MAX_CHECKS = 13, BASIC = 3;
  const HUNCH_HIT = 14, LOOSE_HIT = 3, ESC_HIT = 3;
  const RIGHT = [0.75, 1, 1.25], WRONG = [0, 0.25, 0.75];
  const PREP = 1.25;   // a prepared claim: right lands at PREP x RIGHT[conf] (tools/pop_sim.js tunes it)
  P.QUOTA = { 1: 4, 2: 3, 3: 3, 4: 2 };
  P.CAP = CAP; P.RIGHT = RIGHT; P.WRONG = WRONG; P.PREP = PREP;
  let RNG = Math.random;
  const rnd = () => RNG();
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
  const find = id => (SD.today && SD.today.resolveItem ? SD.today.resolveItem({ q: id }) : null) || E().find(id);
  const DOM = { 1: 'DEVELOPMENT', 2: 'SECURITY', 3: 'DEPLOYMENT', 4: 'TROUBLESHOOTING' };
  const domName = d => (E().DOMAINS && E().DOMAINS[d]) || DOM[d] || 'Mixed';
  // The map's domain stamps: one word ("Design" dropped, so the SAA domains differ) and an icon, never colour alone.
  const DOM_ICON = { 1: 'cog', 2: 'checked-shield', 3: 'cloud-upload', 4: 'magnifying-glass' };
  const SHORT = { Development: 'Develop', Deployment: 'Deploy', Troubleshooting: 'Troubleshoot', 'High-Performing': 'Speed', 'Cost-Optimized': 'Cost' };
  const domShort = d => { const w = String(domName(d)).replace(/^Design\s+/, '').split(/\s+/)[0]; return SHORT[w] || w; };

  // ---- Cards: one verb per lead (storyboard v7, "The numbers") ----
  P.CARDS = {
    patch: { name: 'Patch', who: 'basic', cost: 1, hit: 8, icon: 'spanner' },
    guard: { name: 'Guard', who: 'basic', cost: 1, guard: 8, icon: 'checked-shield' },
    fanout: { name: 'Fan-Out', who: 'Mira', verb: 'draw', cost: 1, boost: 2, icon: 'split-arrows' },
    leastpriv: { name: 'Least Privilege', who: 'Seo-yeon', verb: 'block', cost: 1, guard: 10, icon: 'padlock' },
    dataevents: { name: 'Data Events', who: 'Dutch', verb: 'setup', cost: 1, setup: 4, icon: 'digital-trace' },
    condwrite: { name: 'Conditional Write', who: 'Kai', verb: 'finish', cost: 1, hit: 6, finish: 12, icon: 'checkbox-tree' },
    redrive: { name: 'Redrive', who: 'Mira', verb: 'draw', cost: 1, hit: 6, redrive: 1, icon: 'return-arrow' },
    subscriber: { name: 'Every Subscriber', who: 'Mira', verb: 'draw', cost: 2, boost: 3, icon: 'split-arrows' },
    denydefault: { name: 'Deny by Default', who: 'Seo-yeon', verb: 'block', cost: 2, guard: 16, icon: 'stop-sign' },
    rotate: { name: 'Rotate the Key', who: 'Seo-yeon', verb: 'block', cost: 1, guard: 6, hit: 4, icon: 'key' }
  };
  const C = P.CARDS;
  P.STARTER = ['patch', 'patch', 'guard', 'guard', 'fanout', 'leastpriv', 'dataevents', 'condwrite'];
  P.cardText = function (e) {
    const c = C[e.id], u = (e.up | 0) * 3, t = [];
    if (c.hit && c.finish) t.push(`Hit ${c.hit + u}. Claim under half: Hit ${c.finish + u}`);
    else if (c.hit) t.push(`Hit ${c.hit + u}`);
    if (c.guard) t.push(`Guard ${c.guard + u}`);
    if (c.boost) t.push(`+${c.boost + (e.up | 0)} to each other staked card`);
    if (c.setup) t.push(`Proven: next stake +${c.setup + 2 * (e.up | 0)}`);
    if (c.redrive) t.push('Proven: draw 1 more next turn');
    return t.join('. ');
  };

  // ---- Homelands: a room's art, claim, cards and finds (night 1 opens Thornwick and Burning Peak) ----
  P.HOMES = {
    thornwick: { name: 'Thornwick', lead: 'Mira', icon: 'ringing-bell',
      claim: { name: 'Bog Post', sprite: 'mailstorm', sev: 32, hits: [9, 8, 9], says: 'Delivered, I swear' },
      cleared: ['mira', 'smile', 'Hold still. That claim had a hole in it the size of my fist. The big fist.'],
      reward: ['redrive', 'subscriber'],
      lost: { item: 'lantern', text: 'A marsh lantern, wick dry, still swinging from nothing.', who: 'mira',
        a: ['I\'ll carry it.', 'You\'ll drop it.', 'I have never once dropped anything.'], fix: 'Let Mira carry it' } },
    peak: { name: 'Burning Peak', lead: 'Seo-yeon', icon: 'fencer',
      claim: { name: 'Hooded Alibi', sprite: 'shadowhero', sev: 30, hits: [7, 8, 7], says: 'Nothing to see' },
      cleared: ['seoyeon', 'neutral', 'Alibi withdrawn. File it under "nobody".'],
      reward: ['denydefault', 'rotate'],
      lost: { item: 'teabowl', text: 'A tea bowl with a chip in the rim shaped like a mountain.', who: 'seoyeon',
        a: ['That\'s mine. Was mine. Is mine.', 'Prove it.', '...Forms.'], fix: 'Let Seo-yeon mend it' } }
  };
  const H = P.HOMES;
  // hook: nights 2 to 5 (js/mode-pop-rooms.js) add room types, screens, simulator steps and a claim per fight.
  P.ROOMS = {}; P.SCREENS = {}; P.SIM = {};
  P.claimOf = f => H[f.home].claim;
  const X = (s, where) => (P.xtra ? P.xtra(s, where) || '' : '');
  // The ledger: 12 finds, 3 per homeland (storyboard frame 19).
  P.ITEMS = [
    { id: 'bell', home: 'thornwick', icon: 'ringing-bell', name: 'a Thornwick bell with no clapper', line: ['mira', 'warm', 'Marrow\'s. She\'ll want that back.'] },
    { id: 'hat', home: 'thornwick', icon: 'visored-helm', name: 'a marsh warden\'s hat, one size too proud' },
    { id: 'lantern', home: 'thornwick', icon: 'paper-lantern', name: 'a marsh lantern, wick dry' },
    { id: 'scale', home: 'halcyon', icon: 'scales', name: 'a cracked grain scale' },
    { id: 'globe', home: 'halcyon', icon: 'crystal-ball', name: 'a cathedral snow globe' },
    { id: 'token', home: 'halcyon', icon: 'ticket', name: 'a ration token, never spent' },
    { id: 'float', home: 'peak', icon: 'wave-crest', name: 'a fishing float, minnow-sized', line: ['seoyeon', 'tired', 'Hana\'s. Don\'t tell her I found it.'] },
    { id: 'teabowl', home: 'peak', icon: 'teapot', name: 'a tea bowl with a mountain-shaped chip' },
    { id: 'blade', home: 'peak', icon: 'crossed-swords', name: 'the tip of a practice sword' },
    { id: 'mop', home: 'arcanum', icon: 'broom', name: 'a mop head, staff issue' },
    { id: 'leg', home: 'arcanum', icon: 'armchair', name: 'a chair leg, still wobbling' },
    { id: 'key', home: 'arcanum', icon: 'key', name: 'a key with no lock' }
  ];
  const ledger = () => (sv().popLedger = sv().popLedger || {});
  const nextFind = (s, home) => P.ITEMS.find(it => it.home === home && !ledger()[it.id] && !s.found.includes(it.id)) || null;

  // ---- Lines (all new text is on the review list in the PR) ----
  const SAY = {
    freya: 'Good evening! Tonight\'s deleted rooms have been removed from the tower. Thank you for keeping the Cloud tidy!',
    arrive: ['Removed. Not gone. Everything in there says it\'s somebody\'s. That\'s a claim. Nobody\'s proved one yet.', 'See that, up top? That\'s a hunch. Big one. Loud. Never once shown its working.'],
    again: ['New heap. Same claims, different coats.', 'The thing up top is still there. It\'s always still there.'],
    stake: 'Back the check with your cards, or don\'t. Before you read it.',
    proven: ['dutch', 'smile', 'That\'s a record. That I\'ll believe.'],
    right: ['dutch', 'neutral', 'Holds. Next.'],
    guessRight: ['dutch', 'neutral', 'A guess that held. I\'ll take it. I won\'t frame it.'],
    fizzle: ['dutch', 'neutral', 'Fizzled. No harm. No proof either.'],
    wrong: ['dutch', 'tired', 'Cost you a little. Cheaper than a lie.'],
    sureMiss: ['dutch', 'tired', 'Up on the Wall, next to mine. Same claim\'s coming back in a different coat, kid.'],
    flee: ['dutch', 'neutral', 'It ran. Claims do, when nobody\'s got a check left for them.'],
    breakIn: ['Sit. No, the other chair.', 'Now. Where were you at midnight?'],
    rest: ['mira', 'warm', 'Hold still. No, it\'s not "just a backfire". A backfire is what I get from Kai\'s stove. This is a hole.'],
    breakOut: ['seoyeon', 'neutral', 'Rest is over. Forms.'],
    hunch: 'That one\'s mine. Twenty-five years I\'ve carried it. Never once asked it for proof.',
    hunchSays: 'Trust me',
    zero: 'Out. We\'re not proving anything bleeding.',
    won: 'Huh. Smaller than it sounded.',
    lost: 'It checked out. It always does, the first time.',
    retreat: 'It\'ll be there tomorrow. It always is.',
    resume: 'Back. Your stake\'s still on the table. I didn\'t touch it.',
    leave: 'Dutch pockets it, for the finder\'s fee.'
  };
  const NAMES = { dutch: 'Dutch', mira: 'Mira', seoyeon: 'Seo-yeon', kai: 'Kai', freya: 'Freya' };

  // ---- What each night adds (storyboard v7, "Nights"): one new rule set a night. Later nights' code reads this,
  // never s.night directly, so the order stays in one place. day: the local date (YYYY-MM-DD) the night is played.
  // The rule freeze (Nov 16): nothing night 4 or later adds appears before Dec 1, 2026, the day after the exam. A
  // night 4 or 5 before then plays night 3's rule set (level 3: no cat, no room modifiers, no home turf, night 3's
  // map, no 1 in 4 unstamped); its light and the Hunch's size still go by the night itself (pop-n4, pop-n5). The
  // date taper below applies either way.
  P.FREEZE = '2026-12-01';
  P.rules = function (n, day) {
    const d = day || new Date().toISOString().slice(0, 10);
    const lateTaper = d >= '2026-11-27', bare = d >= '2026-11-28' && d <= '2026-11-29';
    const m = d < P.FREEZE ? Math.min(n, 3) : n;   // the night whose rule set applies
    return {
      level: m, frozen: m < n,
      keys: m >= 2,                                   // keys, vaults and the shortcut
      formats: bare ? [] : m >= 3 ? ['compare', 'spot', 'predict', 'seq'] : m >= 2 ? ['compare', 'spot'] : [],
      teach: n === 2 ? ['compare', 'spot'] : n === 3 ? ['predict', 'seq'] : [],   // worked and practice items on Lost items
      maxFormats: bare ? 0 : lateTaper ? 1 : 99,      // format checks a night
      bigClaim: m >= 3, postmortem: m >= 3,
      cat: m >= 4, modifiers: m >= 4, homeTurf: m >= 4,
      unstamped: bare ? 1 : m >= 5 ? 0.25 : 0,        // share of bank checks left unstamped
      prep: !bare,                                    // domain stamps on the map, and Prepared tokens
      homes: m >= 3 ? ['thornwick', 'peak', 'halcyon', 'arcanum'] : ['thornwick', 'peak'],
      hunchSays: n >= 3 ? 'Gut says so' : n >= 2 ? 'I can always tell' : 'Trust me'
    };
  };

  // ---- Picking a night's checks ----
  function score(d) {
    const m = E().lastMock && E().lastMock(), dm = m && m.dom && m.dom[d];
    if (dm && dm[1] >= 3) return dm[0] / dm[1];
    const r = E().reviewAccuracy ? E().reviewAccuracy()[d] : null;
    return r && r[1] >= 5 ? r[0] / r[1] : 0.5;
  }
  // The same weighting as Today's set (js/today.js needs()): the exam weight times how far the domain is from 1.6.
  P.needs = () => { const o = {}; [1, 2, 3, 4].forEach(d => { o[d] = E().WEIGHTS[d] * (1.6 - score(d)); }); return o; };
  P.quotas = function (sim) {
    const q = Object.assign({}, P.QUOTA), N = P.needs(), W = E().WEIGHTS;
    const top = [1, 2, 3, 4].sort((a, b) => N[b] - N[a])[0], low = [1, 2, 3, 4].filter(d => d !== top && q[d] > 1).sort((a, b) => N[a] - N[b])[0];
    const wk = sim ? null : week(), tot = wk ? [1, 2, 3, 4].reduce((a, d) => a + (wk.n[d] | 0), 0) : 0;
    const share = wk && tot ? (wk.n[top] | 0) / tot : 0;
    if (low && N[top] > N[low] && share < W[top] + 0.04) { q[top]++; q[low]--; }
    return q;
  };
  function week() {
    const w = sv().popWeek, now = Date.now();
    if (!w || now - w.t > 7 * DAY) sv().popWeek = { t: now, n: {} };
    return sv().popWeek;
  }
  const ageOf = id => { const l = sv().qlog && sv().qlog[id]; return l ? Date.now() - l[0] : Infinity; };
  P.pickChecks = function (sim) {
    const carry = sim ? [] : (sv().popCarry || []).filter(it => { const q = E().find(it.q); return q && E().allowed(q); }).slice(0, 3);
    const quota = P.quotas(sim), avoid = carry.map(c => c.q), picks = [];
    carry.forEach(c => { const d = E().domainOf(E().find(c.q)); if (quota[d] > 0) quota[d]--; });
    [1, 2, 3, 4].forEach(d => {
      if (quota[d] <= 0) return;
      const r = M.pick({ match: q => E().domainOf(q) === d, n: quota[d], mix: 0, avoid: avoid.slice() });
      r.items.forEach(it => { picks.push({ q: it.q, d, v: it.v }); avoid.push(it.q); });
    });
    // Dry domains: fill from the others so a night is always 12.
    const short = 12 - carry.length - picks.length;
    if (short > 0) M.pick({ n: short, mix: 1, avoid: avoid.slice() }).items.forEach(it => { const q = E().find(it.q); picks.push({ q: it.q, d: E().domainOf(q), v: it.v }); avoid.push(it.q); });
    // Core proofs: two not answered in 7 days, the third never seen (and unstamped).
    const never = picks.filter(p => ageOf(p.q) === Infinity), old = picks.filter(p => ageOf(p.q) > 7 * DAY);
    const core = [];
    const third = never[0] || null;
    old.filter(p => p !== third).slice(0, 2).forEach(p => core.push(p));
    if (third) core.push(third);
    picks.filter(p => !core.includes(p)).slice(0, 3 - core.length).forEach(p => core.push(p));
    core.forEach((p, i) => { p.kind = 'core'; p.stamped = !(i === 2 && ageOf(p.q) === Infinity); });
    const rest = shuffle(picks.filter(p => !core.includes(p))).map(p => Object.assign(p, { kind: 'room', stamped: true }));
    // Carried over: at most 3, in the first 5 checks, alternating with fresh ones.
    const rooms = [];
    const cs = carry.map(c => ({ q: c.q, d: E().domainOf(E().find(c.q)), kind: 'carry', stamped: true, why: c.why }));
    while (rooms.length < ROOM_CHECKS && (cs.length || rest.length)) {
      if (cs.length && (rooms.length % 2 === 0 || !rest.length)) rooms.push(cs.shift());
      else if (rest.length) rooms.push(rest.shift());
    }
    return { rooms, core };
  };

  // ---- The map (night 1: rows of 1, 2, 2, 3, then the Hunch) ----
  P.genMap = function () {
    const n = (t, home) => ({ type: t, home: home || null });
    const r1 = shuffle([n('break'), n('claim', 'peak')]);
    const r2 = shuffle(['claim', 'lost']).map((t, i) => n(t, ['peak', 'thornwick'][i]));
    const r3t = shuffle(['lost', 'claim', 'break']), r3h = shuffle(['peak', 'thornwick', 'thornwick']);
    const r3 = r3t.map((t, i) => n(t, t === 'break' ? null : r3h[i]));
    return [[n('claim', 'thornwick')], r1, r2, r3];
  };

  // ---- A night: the state machine the UI and the simulator share ----
  P.newNight = function (opts) {
    opts = opts || {};
    const prev = RNG;
    if (opts.rng) RNG = opts.rng;
    const nights = opts.sim ? (opts.night | 0) : ((sv().modes && sv().modes.popNights) | 0);
    const { rooms, core } = P.pickChecks(opts.sim);
    const s = {
      v: 1, t: Date.now(), day: new Date().toDateString(), sim: !!opts.sim, night: nights + 1, phase: 'arrive',
      budget: 100, entry: 100, pts: 0, tally: M.newTally(), deck: P.STARTER.map(id => ({ id, up: 0 })),
      rooms, core, asked: 0, log: [], map: { rows: P.genMap(), row: -1, col: null }, fight: null,
      cleared: 0, fled: 0, fights: 0, turns: 0, moves: 0, found: [], lastStake: {}, esc: 0, carryNext: [], msg: null, prep: []
    };
    const t = new Date(); s.iso = opts.day || `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
    if (s.night > 1) s.map.rows = P.genMap(s.night, s);   // hook: a map per night
    stampMap(s);
    if (P.onNight) P.onNight(s);
    if (!opts.sim) { sv().popCarry = []; sv().pop = s; }
    if (P.fx) P.fx.night(s, opts);   // nights 2 to 5: formats, the taper, unstamped checks (js/mode-pop-formats.js)
    RNG = prev;
    save(s);
    return s;
  };
  const save = s => { if (s && !s.sim) S.persist(); };
  // Domain stamps: each row's doors get domains drawn by how many of tonight's room checks are in each (different
  // domains in a row while there are enough), so a stamp says what's behind the door.
  function stampMap(s) {
    if (!P.rules(s.night, s.iso).prep) return;
    const w = {};
    s.rooms.forEach(c => { if (c.d >= 1 && c.d <= 4) w[c.d] = (w[c.d] | 0) + 1; });
    const all = Object.keys(w).map(Number);
    if (!all.length) return;
    s.map.rows.forEach(row => {
      let bag = all.slice();
      row.forEach(n => {
        if (!bag.length) bag = all.slice();
        const tot = bag.reduce((a, d) => a + w[d], 0);
        let x = rnd() * tot, k = 0;
        while (k < bag.length - 1 && (x -= w[bag[k]]) >= 0) k++;
        n.d = bag.splice(k, 1)[0];
      });
    });
  }
  P.stampMap = stampMap;
  P.stampOn = s => !!P.rules(s.night, s.iso).prep;
  // Prepared tokens (s.prep, a list of domains; an old save has none).
  P.prepHas = (s, d) => !!(s.prep && s.prep.includes(d));
  P.prepGain = function (s, d) {
    if (!d || !P.stampOn(s)) return false;
    s.prep = s.prep || [];
    if (!s.prep.includes(d)) s.prep.push(d);
    s.prepN = (s.prepN | 0) + 1;
    return true;
  };
  // A claim stamped d takes its checks in d while any are left: the first one in d moves to the front.
  function frontD(s, d) {
    const i = s.rooms.findIndex(c => c.d === d);
    if (i > 0) s.rooms.unshift(s.rooms.splice(i, 1)[0]);
  }
  P.checksLeft = s => s.rooms.length;
  P.doors = s => (s.map.row + 1 < s.map.rows.length ? s.map.rows[s.map.row + 1].map((x, i) => i) : []);
  P.atHunch = s => s.map.row >= s.map.rows.length - 1;
  P.go = function (s, i) {
    const row = s.map.row + 1, node = s.map.rows[row] && s.map.rows[row][i];
    if (!node) return null;
    s.map.row = row; s.map.col = i; node.visited = 1; s.moves++; s.entry = s.budget; s.msg = null;
    if (node.type === 'claim') {
      if (!s.rooms.length) { node.fled = 1; s.fled++; s.msg = SAY.flee; s.phase = 'map'; return 'fled'; }
      startFight(s, 'claim', node.home, node);
    } else if (P.ROOMS[node.type]) P.ROOMS[node.type](s, node);   // hook: vaults, the shortcut, the records vault
    else if (node.type === 'lost') s.phase = P.fx && P.fx.teachAt(s, node) ? 'teach' : 'lost';
    else s.phase = 'break';
    return node.type;
  };
  P.node = s => (s.map.row >= 0 ? s.map.rows[s.map.row][s.map.col] : null);
  function startFight(s, kind, home, node) {
    const f = { kind, home, turn: 0, draw: shuffle(s.deck.map((x, i) => i)), discard: [], hand: [], sel: [], guard: 0, setup: 0, nextSetup: 0, extra: 0 };
    if (node) { if (node.big) f.big = 1; if (node.variant) f.variant = 1; if (node.mod) f.mod = node.mod; if (node.d && kind === 'claim') f.d = node.d; }
    if (kind === 'claim') { const c = P.claimOf(f); f.sev = f.max = c.sev; }
    if (f.d && P.prepHas(s, f.d)) { f.prep = f.d; s.prep = s.prep.filter(x => x !== f.d); s.prepUsed = (s.prepUsed | 0) + 1; }   // the claim spends its token
    s.fight = f; s.fights++;
    if (P.onFight) P.onFight(s, f);   // hook: relics, room modifiers
    newTurn(s);
    if (kind === 'claim' && P.fx) P.fx.claimStart(s, f);   // its first check in the homeland lead's format
  }
  P.startHunch = function (s) {
    s.entry = s.budget; s.moves++;
    startFight(s, 'hunch', null);
    const f = s.fight;
    f.order = s.rooms.splice(0).map(c => Object.assign({}, c, { kind: 'loose' })).concat(s.core.map(c => Object.assign({}, c)));
    f.looseWaiting = f.order.filter(c => c.kind === 'loose').length;
    f.proofs = [];      // core results in order: true held, false failed
    f.looseDone = 0;
    s.phase = 'stake';
  };
  P.hunchHit = s => HUNCH_HIT + LOOSE_HIT * (s.fight ? s.fight.looseWaiting | 0 : 0) + ESC_HIT * s.esc;
  P.held = s => (s.fight && s.fight.proofs ? s.fight.proofs.filter(Boolean).length : 0);
  function newTurn(s) {
    const f = s.fight;
    f.discard.push(...f.hand);
    f.hand = [];
    const n = HAND + (f.extra | 0);
    for (let k = 0; k < n; k++) {
      if (!f.draw.length) { f.draw = shuffle(f.discard); f.discard = []; }
      if (!f.draw.length) break;
      f.hand.push(f.draw.shift());
    }
    f.extra = 0; f.setup = f.nextSetup | 0; f.nextSetup = 0;
    if (f.kind === 'claim' && f.d && !f.turn) frontD(s, f.d);   // its first check is in its stamped domain
    f.turn++; s.turns++;
    f.guard = 0; f.locked = false; f.check = null; f.result = null; f.basics = []; f.capLeft = CAP;
    if (P.onTurn) P.onTurn(s, f);   // hook: relics, room modifiers
    f.sel = P.stakeAll(s);
    s.phase = 'stake';
  }
  // A card's numbers in this fight (upgrades add 3; Conditional Write finishes under half severity).
  function nums(s, e) {
    const c = C[e.id], u = (e.up | 0) * 3, f = s.fight;
    let hit = c.hit ? c.hit + u : 0;
    if (c.finish && f && f.kind === 'claim' && f.sev < f.max / 2) hit = c.finish + u;
    const o = { hit, guard: c.guard ? c.guard + u : 0, boost: c.boost ? c.boost + (e.up | 0) : 0, setup: c.setup ? c.setup + 2 * (e.up | 0) : 0, redrive: c.redrive | 0 };
    if (P.numsHook && f) P.numsHook(s, e, o);   // hook: home turf
    return o;
  }
  // What a stake (hand positions) would land at x1: boosts and the setup bonus included. At the Hunch, all Guard.
  P.stakeOf = function (s, sel) {
    const f = s.fight;
    const list = sel.map(h => { const i = f.hand[h], e = s.deck[i]; return Object.assign({ h, i, id: e.id, cost: C[e.id].cost }, nums(s, e)); });
    list.forEach(a => { if (a.boost) list.forEach(b => { if (b === a) return; if (b.hit) b.hit += a.boost; else if (b.guard) b.guard += a.boost; }); });
    if (f.setup) { const top = list.filter(x => x.hit || x.guard).sort((x, y) => (y.hit + y.guard) - (x.hit + x.guard))[0]; if (top) { if (top.hit) top.hit += f.setup; else top.guard += f.setup; } }
    if (f.kind === 'hunch') list.forEach(x => { x.guard += x.hit; x.hit = 0; });
    const sum = k => list.reduce((a, x) => a + x[k], 0);
    return { list, hit: sum('hit'), guard: sum('guard'), total: sum('hit') + sum('guard'), cost: sum('cost') };
  };
  // Stake all: the best stake the 3 Capacity allows.
  P.stakeAll = function (s) {
    const f = s.fight, n = f.hand.length;
    let best = [], bt = -1;
    for (let m = 1; m < (1 << n); m++) {
      const sel = []; for (let k = 0; k < n; k++) if (m & (1 << k)) sel.push(k);
      if (sel.some(h => C[s.deck[f.hand[h]].id].noStake)) continue;
      const st = P.stakeOf(s, sel);
      if (st.cost > CAP) continue;
      if (st.total > bt || (st.total === bt && sel.length > best.length)) { best = sel; bt = st.total; }
    }
    return best;
  };
  P.stakeLast = function (s, d) {
    const n = s.lastStake[d];
    if (n == null) return null;
    const all = P.stakeAll(s);
    if (n >= all.length) return all;
    const f = s.fight;
    return all.map(h => [h, P.stakeOf(s, [h]).total]).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]).sort((a, b) => a - b);
  };
  P.toggle = function (s, h) {
    const f = s.fight, i = f.sel.indexOf(h);
    if (i >= 0) { f.sel.splice(i, 1); return true; }
    if (C[s.deck[f.hand[h]].id].noStake) return false;
    const st = P.stakeOf(s, f.sel.concat(h));
    if (st.cost > CAP) return false;
    f.sel = f.sel.concat(h).sort((a, b) => a - b);
    return true;
  };
  // The check this stake is on: a claim's from the room checks, the Hunch's from its proofs.
  P.peek = s => (s.fight ? (s.fight.check || (s.fight.kind === 'hunch' ? s.fight.order[0] : s.rooms[0])) : null);
  P.lock = function (s) {
    const f = s.fight;
    if (f.locked) return f.check;
    f.check = f.kind === 'hunch' ? f.order.shift() : s.rooms.shift();
    if (!f.check) return null;
    f.locked = true;
    s.lastStake[f.check.d] = f.sel.length;
    s.phase = 'locked';
    return f.check;
  };
  // One answer: r = { ok, conf, pts }. Lands the stake and returns what happened, for the land screen.
  P.settle = function (s, r) {
    const f = s.fight, ck = f.check, conf = [0, 1, 2].includes(r.conf) ? r.conf : 0;
    // A format check lands by js/mode-pop-formats.js: partly right is half the multiplier and half the cost.
    const fx = ck.fmt && P.fx ? P.fx.land(s, ck, r, conf) : null, ok = fx ? fx.ok : !!r.ok;
    const st = P.stakeOf(s, f.sel);
    s.pts += r.pts || 0; s.asked++;
    if (fx) P.fx.log(s, ck, r, fx, f.sel.length);
    else s.log.push({ q: ck.q, d: ck.d, kind: ck.kind, conf, ok, staked: f.sel.length, stamped: ck.stamped !== false, fresh: ageOf(ck.q) === Infinity || !!ck.fresh, near: P.fx ? P.fx.near(s, ck) : false, t: Date.now() });
    const pm = f.prep && f.kind === 'claim' ? P.PREP : 1;   // a prepared claim lands harder when right (or partly right)
    const out = { ok, conf, mult: (fx ? fx.mult : ok ? RIGHT[conf] : 0) * pm, hit: 0, guard: 0, cost: 0, staked: f.sel.length, kind: ck.kind };
    if (pm > 1) out.prep = pm;
    if (fx) Object.assign(out, { fmt: ck.fmt.type, partial: fx.partial, unscored: !fx.scored });
    if (out.mult > 0) {
      st.list.forEach(c => { out.hit += Math.round(c.hit * out.mult); out.guard += Math.round(c.guard * out.mult); if (ok && c.setup) f.nextSetup += c.setup; if (ok && c.redrive) f.extra = 1; });
      if (f.kind === 'claim') f.sev = Math.max(0, f.sev - out.hit);
      f.guard += out.guard;
    }
    const wr = fx ? fx.wrong : ok ? 0 : WRONG[conf];
    if (!ok || wr > 0) {
      out.cost = Math.round(st.total * wr);
      s.budget = Math.max(0, s.budget - out.cost);
    }
    if (!ok) { if (fx) { if (fx.scored) P.fx.miss(s, ck, conf); } else miss(s, ck); }
    if (f.kind === 'hunch') {
      if (ck.kind === 'loose') { f.looseDone++; if (ok) f.looseWaiting = Math.max(0, f.looseWaiting - 1); }
      else f.proofs.push(ok);
    }
    f.setup = 0; f.locked = false; f.result = out;
    f.capLeft = CAP - st.cost;
    f.played = f.sel.slice();
    s.phase = 'land';
    return out;
  };
  // The twins rule: bank questions only, verified twins only.
  function verifiedTwins(s, q) {
    const used = new Set(s.log.map(l => l.q).concat(s.rooms.map(c => c.q), s.core.map(c => c.q), s.carryNext.map(c => c.q)));
    return ((SD.twins && SD.twins[q.id]) || []).map(id => E().find(id)).filter(x => x && E().allowed(x) && D().isVerified(x) && !used.has(x.id));
  }
  function miss(s, ck) {
    if (ck.kind === 'practice') return;
    const q = E().find(ck.q);
    if (!q) return;
    const tw = verifiedTwins(s, q);
    const room = s.asked + s.rooms.length + s.core.length + (s.fight && s.fight.order ? s.fight.order.length : 0) < MAX_CHECKS;
    if (tw.length >= 2 && room && s.fight && s.fight.kind === 'claim') {
      s.rooms.splice(Math.min(1, s.rooms.length), 0, { q: tw[0].id, d: ck.d, kind: 'practice', stamped: true });
      s.carryNext.push({ q: tw[1].id, why: 'twin' });
    } else if (tw.length) s.carryNext.push({ q: tw[0].id, why: 'twin' });
    else s.carryNext.push({ q: q.id, why: 'again' });
  }
  // Unstaked capacity plays small: Patch 3 or Guard 3 (only Guard at the Hunch).
  P.basicsLeft = s => { const f = s.fight; return f ? Math.min(f.capLeft, f.hand.length - f.played.length - f.basics.length) : 0; };
  P.basic = function (s, h, kind) {
    const f = s.fight;
    if (P.basicsLeft(s) <= 0 || f.played.includes(h) || f.basics.some(b => b.h === h)) return false;
    if (f.kind === 'hunch') kind = 'guard';
    if (kind === 'patch') f.sev = Math.max(0, f.sev - BASIC); else f.guard += BASIC;
    f.basics.push({ h, kind }); f.capLeft--;
    return true;
  };
  P.intent = function (s) {
    const f = s.fight;
    if (!f) return 0;
    if (f.kind === 'hunch') return P.hunchHit(s);
    const hs = P.claimOf(f).hits;
    return hs[(f.turn - 1) % hs.length];
  };
  // After the land: 'cleared', 'won', 'lost' (the Hunch checked out), 'zero', 'fled' or 'turn'.
  P.endTurn = function (s) {
    const f = s.fight;
    if (f.kind === 'claim' && f.sev <= 0) return clear(s);
    if (f.kind === 'hunch') {
      const held = f.proofs.filter(Boolean).length, failed = f.proofs.length - held;
      if (held >= 2) return P.finish(s, 'won');
      if (failed >= 2) return P.finish(s, 'lost');
    }
    const hit = P.intent(s), dmg = Math.max(0, hit - f.guard);
    s.budget = Math.max(0, s.budget - dmg);
    f.lastHit = { hit, dmg, guard: f.guard };
    if (s.budget <= 0) { s.phase = 'zero'; return 'zero'; }
    if (f.kind === 'claim' && !s.rooms.length) {
      const n = P.node(s); if (n) n.fled = 1;
      s.fled++; s.fight = null; s.msg = SAY.flee; s.phase = 'map';
      return 'fled';
    }
    if (f.kind === 'hunch' && !f.order.length) return P.finish(s, P.held(s) >= 2 ? 'won' : 'lost');
    newTurn(s);
    return 'turn';
  };
  function clear(s) {
    const f = s.fight, n = P.node(s), home = f.home;
    if (n) n.cleared = 1;
    s.cleared++;
    const item = nextFind(s, home);
    if (item) s.found.push(item.id);
    const pool = H[home].reward.concat(rnd() < 0.5 ? 'condwrite' : 'dataevents');
    s.reward = { home, cards: pool, item: item ? item.id : null };
    if (P.onClear) P.onClear(s, f);   // hook: keys, the Big Claim's truth
    s.fight = null; s.phase = 'reward';
    return 'cleared';
  }
  P.take = function (s, id) {
    if (id && C[id]) s.deck.push({ id, up: 0 });
    s.reward = null; s.phase = 'map';
  };
  P.upgrade = (s, i) => { if (s.deck[i]) s.deck[i].up = (s.deck[i].up | 0) + 1; };
  P.lostChoice = function (s, how, i) {
    const n = P.node(s), home = n && n.home, item = home ? (P.ITEMS.find(it => it.id === H[home].lost.item && !ledger()[it.id] && !s.found.includes(it.id)) || nextFind(s, home)) : null;
    if (how === 'fix') { s.budget = Math.max(1, s.budget - 8); P.upgrade(s, i); }
    else s.budget = Math.min(100, s.budget + 6);
    if (item) s.found.push(item.id);
    s.lostFound = item ? item.id : null;
    s.phase = 'map';
  };
  P.breakChoice = function (s, how, i) {
    if (how === 'rest') s.budget = Math.min(100, s.budget + 25); else P.upgrade(s, i);
    s.phase = 'map';
  };
  P.escalate = function (s) {
    s.esc++;
    s.budget = Math.max(1, Math.min(20, s.entry));
    const f = s.fight;
    if (!f) { s.phase = 'map'; return 'map'; }
    if (f.kind === 'claim' && !s.rooms.length) { const n = P.node(s); if (n) n.fled = 1; s.fled++; s.fight = null; s.phase = 'map'; return 'fled'; }
    if (f.kind === 'hunch' && !f.order.length) return P.finish(s, P.held(s) >= 2 ? 'won' : 'lost');
    newTurn(s);
    return 'turn';
  };
  // The end of a night: how = 'won' | 'lost' | 'retreat'.
  P.finish = function (s, how) {
    s.how = how; s.phase = 'sheet';
    s.heldN = P.held(s);
    s.score = { held: s.heldN, cleared: s.cleared, pts: s.pts };
    if (s.sim) return how;
    const L = ledger();
    s.found.forEach(id => { if (!L[id]) L[id] = s.night; });
    // Carried over: misses first, at most 3 open the next night; the third core proof is never carried.
    const unasked = s.fight && s.fight.order ? [] : [];
    sv().popCarry = s.carryNext.concat(unasked).slice(0, 6);
    const st = sv().modes = sv().modes || {};
    st.popNights = (st.popNights | 0) + 1;
    const wk = week();
    s.log.forEach(l => { wk.n[l.d] = (wk.n[l.d] | 0) + 1; });
    // Hypothesis log (storyboard v7, L5): first tries on bank questions, kept across nights.
    const h = sv().popHist = sv().popHist || [];
    s.log.forEach(l => l.near || h.push({ q: l.q, d: l.d, conf: l.conf, ok: l.ok ? 1 : 0, kind: l.kind, fresh: l.fresh ? 1 : 0, staked: l.staked, n: s.night, t: l.t }));
    if (h.length > 400) h.splice(0, h.length - 400);
    if (P.fx) P.fx.finish(s);   // format checks: their own log, never the hypothesis
    s.paid = M.pay(ID);
    s.fight = s.fight ? { kind: s.fight.kind, proofs: s.fight.proofs, looseWaiting: s.fight.looseWaiting } : null;
    return how;
  };
  P.retreat = s => P.finish(s, 'retreat');

  // ---- Drawing ----
  const icon = (name, cls) => `<svg class="pop-gi${cls ? ' ' + cls : ''}" viewBox="0 0 512 512" aria-hidden="true">${(SD.icons && SD.icons[name]) || ''}</svg>`;
  const head = (who, mood) => { try { return SD.art && SD.art.portrait ? `<span class="pop-head">${SD.art.portrait(who, 34, mood || 'neutral')}</span>` : ''; } catch (e) { return ''; } };
  const say = (who, mood, line) => `<p class="pop-say" data-vo="${esc(who + '|' + line)}">${head(who, mood)}<span><b>${esc(NAMES[who] || who)}:</b> ${esc(line)}</span></p>`;
  const sayL = l => say(l[0], l[1], l[2]);
  // The Hunch, until its art is made: the silhouette guide from the storyboard.
  P.HUNCH_SVG = '<svg class="pop-hunch" viewBox="0 0 120 110" role="img" aria-label="The Hunch: a navy sack with one brow, a shouting mouth, a blank clipboard and a crooked badge"><ellipse cx="60" cy="104" rx="50" ry="5" fill="#000" opacity=".35"/><path d="M54 14 q6 -10 12 0 q-2 6 -6 6 q-4 0 -6 -6z" fill="#2c3550" stroke="#0e0c14" stroke-width="2"/><path d="M12 72 C10 34 34 18 60 18 C86 18 110 34 108 72 C107 96 88 104 60 104 C32 104 13 96 12 72z" fill="#2c3550" stroke="#0e0c14" stroke-width="3"/><path d="M60 22 L60 100" stroke="#46527a" stroke-width="1.5" stroke-dasharray="3 3"/><path d="M28 44 L54 50" stroke="#0e0c14" stroke-width="5" stroke-linecap="round"/><ellipse cx="44" cy="56" rx="6" ry="2.5" fill="#d8dbe8"/><circle cx="78" cy="55" r="4" fill="#d8dbe8"/><circle cx="78" cy="55" r="1.8" fill="#0e0c14"/><path d="M40 68 Q60 92 82 68 Q60 76 40 68z" fill="#120d18" stroke="#0e0c14" stroke-width="2"/><g stroke="#e8e8f0" stroke-width="2" stroke-linecap="round"><path d="M92 70 l10 -3"/><path d="M93 77 l11 1"/><path d="M91 84 l9 5"/></g><circle cx="74" cy="86" r="8" fill="none" stroke="#5a6283" stroke-width="1.5" stroke-dasharray="1.5 1.5"/><path d="M68 81 h12 v6 q0 6 -6 8 q-6 -2 -6 -8z" fill="#c9ccd6" stroke="#0e0c14" stroke-width="1.5" transform="rotate(-12 74 86)"/><rect x="8" y="62" width="16" height="22" rx="2" fill="#e2dbcb" stroke="#0e0c14" stroke-width="2" transform="rotate(-10 16 73)"/><path d="M104 52 l12 -8" stroke="#2c3550" stroke-width="6" stroke-linecap="round"/></svg>';
  P.HUNCH_FLAT = '<svg class="pop-hunch" viewBox="0 0 120 110" role="img" aria-label="The Hunch, deflated: an empty coat, a clipboard and the badge"><ellipse cx="60" cy="104" rx="52" ry="5" fill="#000" opacity=".35"/><path d="M8 100 C14 84 34 80 60 82 C86 80 106 86 112 100 C96 106 24 106 8 100z" fill="#2c3550" stroke="#0e0c14" stroke-width="3"/><path d="M44 92 q16 -6 32 0" stroke="#0e0c14" stroke-width="2" fill="none"/><rect x="14" y="86" width="16" height="12" rx="2" fill="#e2dbcb" stroke="#0e0c14" stroke-width="2"/><path d="M88 96 h12 v6 q0 6 -6 8 q-6 -2 -6 -8z" fill="#c9ccd6" stroke="#0e0c14" stroke-width="1.5"/></svg>';

  function hud(s, extra) {
    const b = Math.max(0, s.budget);
    return `<div class="pop-hud"><span>Budget <b>${b}%</b></span><span>Room checks <b>${s.rooms.length}</b></span><span>Points <b>${M.sgn(s.pts)}</b></span>${X(s, 'hud')}${extra ? `<span>${extra}</span>` : ''}</div>
      <div class="bar pop-bar" role="img" aria-label="Budget ${b}%"><i style="width:${b}%"></i></div>`;
  }
  const dock = html => `<div class="pop-dock">${html}</div>`;
  const stopBtn = '<button class="ghost pop-stop" id="pop-stop">☰ Stop for now</button>';
  function wireStop(b) { const x = b.querySelector('#pop-stop'); if (x) x.onclick = () => { U.closePanel(); stopNow(); }; }
  function stopNow() { const s = cur(); if (s) save(s); if (SD.today) SD.today.render(); }
  const panel = (html, cls) => U.panel(`<div class="pop pop-n${Math.min(5, (cur() && cur().night) || 1)}">${html}</div>`, { title: TITLE, onClose: stopNow, cls: cls || '' });

  P.draw = function () {
    const s = cur();
    if (!s) return;
    const f = {
      arrive, map: mapScreen, stake: stakeScreen, locked: lockedScreen, land: landScreen, reward: rewardScreen,
      lost: lostScreen, break: breakScreen, zero: zeroScreen, sheet: sheetScreen, teach: x => P.fx.draw(x), ...P.SCREENS
    }[s.phase];
    (f || mapScreen)(s);
  };

  function arrive(s) {
    const first = s.night === 1;
    const lines = first ? SAY.arrive : SAY.again;
    const b = panel(`<p class="pop-night">Night ${s.night}${X(s, 'title')}</p>
      <div class="pop-sky">${P.HUNCH_SVG}<span class="pop-cap">The Hunch</span></div>
      ${first ? `<p class="pop-speaker" data-vo="${esc('freya|' + SAY.freya)}">📢 <b>Freya:</b> ${esc(SAY.freya)}</p>` : ''}
      ${lines.map(l => say('dutch', 'neutral', l)).join('')}${X(s, 'arrive')}
      <p class="small muted">Tonight: ${plural(s.rooms.length, 'room check')} for the rooms, 3 proofs for the Hunch.</p>
      ${dock('<button class="primary" id="pop-in">Walk in</button>')}`);
    b.querySelector('#pop-in').onclick = () => { s.phase = 'map'; save(s); P.draw(); };
  }

  P.doorLabel = doorLabel; P.doorIcon = n => doorIcon(n);
  function doorLabel(n, fog) {
    const home = n.home ? H[n.home].name : '';
    if (fog) return n.type === 'break' ? 'Break?' : `${home}?`;
    if (n.type === 'claim') return `Claim · ${home}`;
    if (n.type === 'lost') return `Lost item${home ? ' · ' + home : ''}`;
    return 'Break room';
  }
  function doorIcon(n) { return n.type === 'break' ? 'coffee-mug' : n.type === 'lost' && !n.home ? 'swap-bag' : H[n.home].icon; }
  // A door's domain stamp, in words and an icon. A claim you hold its token for says so.
  // Dutch's ink stamp: the domain's icon and one word, on every door (fogged ones too).
  const doorStamp = (s, n) => (n.d ? `<span class="pop-dom">${icon(DOM_ICON[n.d])}${esc(domShort(n.d))}</span>` : '');
  // A Prepared token is a tag tied to the door of the next claim stamped with its domain (every such claim in the
  // nearest row that has one). The fight's stage says what it does when the claim spends it.
  P.tagged = function (s, r, i) {
    const n = s.map.rows[r] && s.map.rows[r][i];
    if (!n || n.type !== 'claim' || n.visited || !P.prepHas(s, n.d) || r <= s.map.row) return false;
    for (let k = s.map.row + 1; k < r; k++) if (s.map.rows[k].some(x => x.type === 'claim' && x.d === n.d && !x.visited)) return false;
    return true;
  };
  const doorTag = (s, n, r, i) => (P.tagged(s, r, i) ? `<span class="pop-ptag" title="Prepared: ${esc(domShort(n.d))}">${icon('ticket')}<b>Prepared</b></span>` : '');
  P.domShort = domShort; P.DOM_ICON = DOM_ICON;
  P.doorStamp = doorStamp;
  function mapScreen(s) {
    const rows = s.map.rows, next = s.map.row + 1, open = P.doors(s);
    const rowHtml = (row, r) => `<div class="pop-row">${row.map((n, i) => {
      const reach = r === next && open.includes(i), here = r === s.map.row && i === s.map.col, fog = r > next + 1;
      const state = n.cleared ? 'cleared' : n.fled ? 'fled' : n.visited ? 'visited' : '';
      const tag = n.cleared ? '✓ Cleared' : n.fled ? 'Fled' : here ? 'You are here' : n.visited ? 'Done' : reach ? 'Open' : r < next ? 'Passed by' : 'Fogged';
      const dl = n.d ? `, ${domName(n.d)}${P.tagged(s, r, i) ? ', Prepared tag tied on' : ''}` : '';
      return `<button class="pop-door${reach ? ' reach' : ''}${fog ? ' fog' : ''}${here ? ' here' : ''}${state ? ' ' + state : ''}" ${reach ? `data-door="${i}"` : 'disabled'} aria-label="${esc(P.doorLabel(n, fog) + dl)}, ${tag}">
        ${icon(P.doorIcon(n))}${n.type === 'claim' && !fog ? icon('crossed-swords', 'badge') : ''}<span class="pop-dl">${esc(P.doorLabel(n, fog))}</span>${doorStamp(s, n)}<span class="pop-dt">${tag}</span>${doorTag(s, n, r, i)}${P.doorExtra ? P.doorExtra(s, n, r, i, fog) : ''}</button>`;
    }).join('')}</div>`;
    const top = P.atHunch(s);
    const b = panel(`${hud(s)}
      <button class="pop-hunchdoor${top ? ' reach' : ''}" id="pop-hunch" ${top ? '' : 'disabled'} aria-label="The Hunch, 3 core proofs${top ? ', open' : ', at the top of the heap'}">${P.HUNCH_SVG}<span><b>The Hunch</b> · 3 core proofs${top ? ` · ${s.rooms.length ? plural(s.rooms.length, 'loose proof') + ' waiting' : 'no loose proofs'}` : ''}</span></button>
      <div class="pop-map">${rows.map((row, r) => ({ row, r })).reverse().map(x => rowHtml(x.row, x.r)).join('')}</div>
      ${s.msg ? sayL(s.msg) : ''}${X(s, 'map')}
      <p class="small">${top ? 'The heap\'s top. Every room check you didn\'t spend comes with you as a loose proof.' : `Tap a door to walk there. ${plural(s.rooms.length, 'room check')} left: a claim takes about 3. A claim with none left flees.`}</p>
      ${dock(stopBtn + (top ? '<button class="primary" id="pop-climb">Climb to the Hunch</button>' : ''))}`);
    b.querySelectorAll('[data-door]').forEach(el => el.onclick = () => { P.go(s, +el.dataset.door); save(s); P.draw(); });
    const hunch = () => { P.startHunch(s); save(s); P.draw(); };
    if (top) { b.querySelector('#pop-hunch').onclick = hunch; b.querySelector('#pop-climb').onclick = hunch; }
    wireStop(b);
  }

  function stage(s) {
    const f = s.fight;
    if (f.kind === 'hunch') {
      const marks = f.order.concat(f.check ? [f.check] : []);
      const looseOpen = f.looseWaiting | 0;
      const plate = [0, 1, 2].map(k => k < f.proofs.length ? (f.proofs[k] ? '<i class="pm held" title="held">✓</i>' : '<i class="pm failed" title="failed">✗</i>') : '<i class="pm wait" title="waiting">?</i>').join('') + Array.from({ length: looseOpen }, () => '<i class="pm loose" title="loose proof">+</i>').join('');
      return `<div class="pop-stage hunch"><div class="pop-foe">${P.HUNCH_SVG}</div><div class="pop-intent" data-sfx="hunch">💭 "${esc(P.rules(s.night, s.iso).hunchSays)}": hits <b>${P.hunchHit(s)}</b>
        <div class="pop-plate" aria-label="Core proofs: ${f.proofs.filter(Boolean).length} held, ${f.proofs.filter(x => !x).length} failed; ${plural(looseOpen, 'loose proof')} waiting">${plate}</div>
        <span class="small">${marks.length ? `${plural(marks.filter(c => c.kind === 'loose').length, 'loose proof')} then ${plural(marks.filter(c => c.kind !== 'loose').length, 'core proof')} to go` : ''}</span></div></div>`;
    }
    const c = P.claimOf(f), pct = Math.round(100 * f.sev / f.max);
    return `<div class="pop-stage ${f.home}"><div class="pop-foe">${SD.art && SD.art.enemy ? SD.art.enemy(c.sprite) : ''}</div>
      <div class="pop-intent"><span class="pop-home">${icon(H[f.home].icon)} ${esc(H[f.home].name)}</span>
      <b>${esc(c.name)}</b> · severity ${f.sev} of ${f.max}<div class="bar pop-sev" role="img" aria-label="Severity ${f.sev} of ${f.max}"><i style="width:${pct}%"></i></div>
      <span>"${esc(c.says)}": hits <b>${P.intent(s)}</b></span>${f.d ? `<span class="small pop-tags">${icon(DOM_ICON[f.d])} ${esc(domShort(f.d))}${f.prep ? ` · <b>Prepared</b>: right lands ×${P.PREP}` : ''}</span>` : ''}${X(s, 'stage')}</div></div>`;
  }
  function cardBtn(s, h, o) {
    const f = s.fight, e = s.deck[f.hand[h]], c = C[e.id];
    const on = f.sel.includes(h);
    const who = c.who === 'basic' ? 'basic' : `${c.who} · ${c.verb}`;
    if (c.noStake) o = Object.assign({}, o, { lock: true });
    return `<button class="pop-card${on ? ' on' : ''}${o.lock ? ' locked' : ''}" data-card="${h}" aria-pressed="${on}" ${o.lock ? 'disabled' : ''} aria-label="${esc(c.name)}${e.up ? ' plus ' + e.up : ''}, ${esc(who)}, ${esc(P.cardText(e))}, costs ${c.cost}${on ? ', staked' : ''}">
      ${icon(c.icon)}<span class="pop-cn"><b>${esc(c.name)}${e.up ? ' +' + e.up : ''}</b><span class="small muted">${esc(who)}</span></span>
      <span class="pop-ct">${esc(P.cardText(e))}</span>${c.cost !== 1 ? `<span class="pop-cost">${c.cost}</span>` : ''}<span class="pop-tag">${on ? 'staked' : ''}${o.lock ? ' 🔒' : ''}</span></button>`;
  }
  const stampOf = ck => (ck.stamped === false ? 'UNSTAMPED' : DOM[ck.d] || 'MIXED');
  const teachTurn = s => (s.night === 1 ? s.turns : 99);
  const gridOn = s => s.night > 1 || s.fights > 1 || s.cleared + s.fled > 0;
  function grid(s, st, ck) {
    const cell = (m, k) => (st[k] ? `${k === 'hit' ? 'Hit' : 'Guard'} ${Math.round(st[k] * m)}` : '');
    const both = m => [cell(m, 'hit'), cell(m, 'guard')].filter(Boolean).join(', ') || '—';
    const pm = s.fight && s.fight.prep && s.fight.kind === 'claim' ? P.PREP : 1;
    return `<table class="pop-grid"><thead><tr><th></th><th>Guess</th><th>Think so</th><th>Sure</th></tr></thead><tbody>
      <tr><th>✓</th>${RIGHT.map(m => `<td>×${+(m * pm).toFixed(2)}<br><span class="small">${both(m * pm)}</span></td>`).join('')}</tr>
      ${P.fx && ck ? P.fx.halfRow(s, ck, st) : ''}
      <tr><th>✗</th><td>fizzle</td><td>−${Math.round(st.total * WRONG[1])}%</td><td>−${Math.round(st.total * WRONG[2])}%, Wall</td></tr></tbody></table>`;
  }
  function stakeScreen(s) {
    const f = s.fight, ck = P.peek(s);
    if (!ck) { // nothing left to check: the claim flees, the Hunch is decided
      const r = f.kind === 'hunch' ? P.finish(s, P.held(s) >= 2 ? 'won' : 'lost') : P.endTurn(s);
      save(s); return P.draw(r);
    }
    const t = teachTurn(s), lockCards = t <= 1;
    const st = P.stakeOf(s, f.sel), all = P.stakeAll(s), last = P.stakeLast(s, ck.d);
    const same = a => a && a.length === f.sel.length && a.every((x, i) => x === f.sel[i]);
    const hunch = f.kind === 'hunch';
    const what = hunch ? (ck.kind === 'loose' ? `Loose proof · ${f.looseDone + 1}` : `Core proof ${f.proofs.length + 1} of 3`) : 'Sealed';
    const top = RIGHT[2] * (f.prep && !hunch ? P.PREP : 1);
    const right = [st.hit ? `Hit ${Math.round(st.hit * top)}` : '', st.guard ? `Guard ${Math.round(st.guard * top)}` : ''].filter(Boolean).join(', ');
    const b = panel(`${hud(s, hunch ? `Proofs <b>${P.held(s)} of 3</b>` : `Cap <b>${CAP}</b>`)}
      ${stage(s)}
      ${(P.fx && P.fx.stamp(s, ck, what)) || `<div class="pop-stamp"><b>DUTCH'S CHECK</b> <span>${esc(what)} · ${stampOf(ck)} · bank question${ck.kind === 'carry' ? ' · back from last night' : ck.kind === 'practice' ? ' · practice twin' : ''}</span></div>`}
      ${hunch && f.turn === 1 && f.looseDone === 0 && !f.proofs.length ? say('dutch', 'tired', SAY.hunch) : say('dutch', 'neutral', SAY.stake)}
      <div class="pop-quick" role="group" aria-label="Quick stake">
        <button class="ghost${same(all) ? ' on' : ''}" id="pop-all" aria-pressed="${same(all)}">${same(all) ? '● ' : ''}Stake all</button>
        <button class="ghost${!f.sel.length ? ' on' : ''}" id="pop-none" aria-pressed="${!f.sel.length}">${!f.sel.length ? '● ' : ''}Stake none</button>
        ${last && !lockCards ? `<button class="ghost${same(last) ? ' on' : ''}" id="pop-last">${same(last) ? '● ' : ''}Last ${esc(ck.stamped === false ? 'time' : domName(ck.d).split(' ')[0])}: ${s.lastStake[ck.d]}</button>` : ''}
      </div>
      <div class="pop-hand">${f.hand.map((x, h) => cardBtn(s, h, { lock: lockCards })).join('')}</div>
      <p class="small pop-sum">${f.sel.length ? `${st.cost} Capacity of ${CAP}. Right: up to ${right || 'nothing'}${hunch ? ' (cards land as Guard here)' : ''} · Wrong: up to −${Math.round(st.total * WRONG[2])}% budget` : `Nothing staked: after the check, play up to ${CAP} cards as Patch ${BASIC} or Guard ${BASIC}.`}${lockCards ? ' Card by card staking opens next turn.' : ''}</p>
      ${gridOn(s) && f.sel.length ? `<details class="pop-what"><summary>What's riding on it ▾</summary>${grid(s, st, ck)}</details>` : ''}
      ${dock(stopBtn + '<button class="primary" id="pop-open">Open the check (locks the stake)</button>')}`);
    b.querySelector('#pop-all').onclick = () => { f.sel = all; save(s); P.draw(); };
    b.querySelector('#pop-none').onclick = () => { f.sel = []; save(s); P.draw(); };
    const lb = b.querySelector('#pop-last'); if (lb) lb.onclick = () => { f.sel = last; save(s); P.draw(); };
    b.querySelectorAll('[data-card]').forEach(el => el.onclick = () => { if (!P.toggle(s, +el.dataset.card)) U.system('CAPACITY', `That's over ${CAP} Capacity. Unstake one first.`); save(s); P.draw(); });
    b.querySelector('#pop-open').onclick = () => { P.lock(s); save(s); prove(s); };
    wireStop(b);
  }
  function stakeNames(s) {
    const f = s.fight;
    return f.sel.length ? f.sel.map(h => C[s.deck[f.hand[h]].id].name).join(', ') : 'nothing';
  }
  // Stopped with the stake locked: the stake shows here, never on the question.
  function lockedScreen(s) {
    const f = s.fight;
    const b = panel(`${hud(s)}
      ${say('dutch', 'neutral', SAY.resume)}
      ${stage(s)}
      <p>Your stake is locked: <b>${esc(stakeNames(s))}</b>. The check is still sealed.</p>
      ${dock(stopBtn + '<button class="primary" id="pop-open">Open the check</button>')}`);
    b.querySelector('#pop-open').onclick = () => prove(s);
    wireStop(b);
  }
  async function prove(s) {
    const f = s.fight, ck = f.check;
    if (ck && ck.fmt && P.fx) {   // a format check (falls back to its bank question if the engine can't ask it)
      const r = await P.fx.ask(s, ck);
      if (r) { const out = P.settle(s, r); save(s); return landScreen(s, out); }
    }
    const q = ck && find(ck.q);
    if (!q) { f.locked = false; f.check = null; s.phase = 'stake'; save(s); return P.draw(); }
    const r = await M.ask(q, { title: "DUTCH'S CHECK", tally: s.tally, think: true, context: "Dutch's check", progress: `${s.asked + 1} of ${s.asked + 1 + s.rooms.length + (f.order ? f.order.length : 0) + (f.kind === 'claim' ? s.core.length : 0)}`, onStop: () => {} });
    if (r.stopped && !r.committed) return stopNow();
    if (r.closed) { s.phase = 'locked'; save(s); return P.draw(); }
    const out = P.settle(s, r);
    save(s);
    if (r.stopped) return stopNow();
    landScreen(s, out);
  }
  function verdictLine(s, out) {
    if (out.fmt && P.fx) return P.fx.verdict(out);
    if (out.ok) {
      const parts = [out.hit ? `Hit ${out.hit} landed` : '', out.guard ? `Guard ${out.guard} up` : ''].filter(Boolean);
      return `${out.conf === 2 ? '✓ PROVEN' : '✓ Right'} · ${M.CONF[out.conf]} · ×${+out.mult.toFixed(2)}${out.prep ? ' (prepared)' : ''}${out.staked ? ' · ' + (parts.join(' · ') || 'no numbers staked') : ' · nothing staked'}`;
    }
    if (!out.staked) return `✗ Wrong · ${M.CONF[out.conf]} · nothing staked, nothing lost`;
    return out.conf === 0 ? '✗ Wrong · Guess · your stake fizzled' : out.conf === 1 ? `✗ Wrong · Think so · −${out.cost}% budget` : `✗ BACKFIRE · Sure, and wrong · −${out.cost}% budget · on the Wall`;
  }
  function barkFor(out) {
    if (out.fmt && P.fx && P.fx.bark(out)) return P.fx.bark(out);
    if (out.ok) return out.conf === 2 ? SAY.proven : out.conf === 0 ? SAY.guessRight : SAY.right;
    return out.conf === 2 ? SAY.sureMiss : out.conf === 1 ? SAY.wrong : SAY.fizzle;
  }
  function landScreen(s, out) {
    const f = s.fight;
    out = out || f.result || { ok: false, conf: 0, staked: 0 };
    const left = P.basicsLeft(s), hunch = f.kind === 'hunch';
    const free = f.hand.map((x, h) => h).filter(h => !f.played.includes(h) && !f.basics.some(b => b.h === h));
    const t = teachTurn(s);
    const b = panel(`${hud(s)}
      ${stage(s)}
      <p class="pop-since"><b>Since your proof:</b> ${esc(verdictLine(s, out))}.${hunch && out.kind === 'loose' && out.ok ? ' A loose proof held: the Hunch hits 3 less.' : ''}${hunch && out.kind === 'core' ? ` Proof ${f.proofs.length} of 3 ${out.ok ? 'held' : 'failed'}.` : ''}</p>
      ${sayL(barkFor(out))}
      ${left > 0 && free.length ? `<p class="small">${t <= 3 ? 'Staking costs Capacity. What\'s left plays small. ' : ''}${left} Capacity left: ${hunch ? `play a card as Guard ${BASIC}` : `pick a card to play as Patch ${BASIC} or Guard ${BASIC}`}.</p>
        <div class="pop-basics">${free.map(h => { const c = C[s.deck[f.hand[h]].id]; return `<div class="pop-bas"><span>${icon(c.icon)} ${esc(c.name)}</span>${hunch ? '' : `<button class="ghost" data-bas="${h}" data-k="patch">Patch ${BASIC}</button>`}<button class="ghost" data-bas="${h}" data-k="guard">Guard ${BASIC}</button></div>`; }).join('')}</div>` : ''}
      ${f.basics.length ? `<p class="small muted">Played small: ${f.basics.map(x => x.label || `${C[s.deck[f.hand[x.h]].id].name} as ${x.kind === 'patch' ? 'Patch' : 'Guard'} ${BASIC}`).join(', ')}.</p>` : ''}${X(s, 'land')}
      <p class="small">${f.kind === 'claim' && f.sev <= 0 ? 'The claim is cleared.' : `Guard up: <b>${f.guard}</b>. Next it hits ${P.intent(s)}${f.guard ? `, so you take ${Math.max(0, P.intent(s) - f.guard)}` : ''}.`}</p>
      ${dock(stopBtn + `<button class="primary" id="pop-end">${f.kind === 'claim' && f.sev <= 0 ? 'Claim cleared' : 'End turn'}</button>`)}`);
    b.querySelectorAll('[data-bas]').forEach(el => el.onclick = () => { P.basic(s, +el.dataset.bas, el.dataset.k); save(s); landScreen(s, out); });
    b.querySelector('#pop-end').onclick = () => {
      const was = f.kind, r = P.endTurn(s);
      if (r === 'turn' && f.lastHit) s.since = f.lastHit.dmg ? `It hit ${f.lastHit.hit}; your Guard took ${Math.min(f.lastHit.hit, f.lastHit.guard)}. −${f.lastHit.dmg}% budget.` : `It hit ${f.lastHit.hit}; your Guard took all of it.`;
      if (r === 'turn' && was === 'claim' && f.lastHit) U.system('TURN OVER', esc(s.since), f.lastHit.dmg ? 'red' : '');
      save(s); P.draw();
    };
    wireStop(b);
  }

  function rewardScreen(s) {
    const rw = s.reward, home = H[rw.home], item = rw.item && P.ITEMS.find(i => i.id === rw.item);
    const b = panel(`${hud(s)}
      <p class="pop-banner">CLAIM CLEARED · ${esc(home.name)}</p>
      ${sayL(home.cleared)}${X(s, 'reward')}
      <p class="small">Take one card, or skip. ${esc(home.name)}'s cards are ${esc(home.lead)}'s. Dutch always has one in his pocket.</p>
      <div class="pop-hand">${rw.cards.map(id => { const c = C[id], e = { id, up: 0 }; return `<button class="pop-card" data-take="${id}" aria-label="Take ${esc(c.name)}: ${esc(P.cardText(e))}, costs ${c.cost}">${icon(c.icon)}<span class="pop-cn"><b>${esc(c.name)}</b><span class="small muted">${esc(c.who)} · ${esc(c.verb)}</span></span><span class="pop-ct">${esc(P.cardText(e))}</span>${c.cost !== 1 ? `<span class="pop-cost">${c.cost}</span>` : ''}</button>`; }).join('')}</div>
      ${item ? `<p class="pop-find">${icon(item.icon)} <span>Found in the rubble: ${esc(item.name)}.</span></p>${item.line ? sayL(item.line) : ''}` : ''}
      ${dock('<button class="ghost" id="pop-skip">Skip</button>')}`);
    b.querySelectorAll('[data-take]').forEach(el => el.onclick = () => { P.take(s, el.dataset.take); save(s); P.draw(); });
    b.querySelector('#pop-skip').onclick = () => { P.take(s, null); save(s); P.draw(); };
  }
  function pickCard(s, title, done) {
    const b = panel(`<p>${esc(title)}</p><div class="pop-hand">${s.deck.map((e, i) => { const c = C[e.id]; return `<button class="pop-card" data-up="${i}">${icon(c.icon)}<span class="pop-cn"><b>${esc(c.name)}${e.up ? ' +' + e.up : ''}</b></span><span class="pop-ct">${esc(P.cardText(e))} → ${esc(P.cardText({ id: e.id, up: (e.up | 0) + 1 }))}</span></button>`; }).join('')}</div>
      ${dock('<button class="ghost" id="pop-back">Back</button>')}`);
    b.querySelectorAll('[data-up]').forEach(el => el.onclick = () => done(+el.dataset.up));
    b.querySelector('#pop-back').onclick = () => P.draw();
  }
  function lostScreen(s) {
    const n = P.node(s), L = n && n.home ? H[n.home].lost : null;
    const who = L ? L.who : 'dutch';
    const lines = L ? (L.lines ? L.lines.map(sayL).join('') : [say(who, 'smile', L.a[0]), say('dutch', 'neutral', L.a[1]), say(who, 'tired', L.a[2])].join('')) : '';
    const b = panel(`${hud(s)}
      <p class="pop-banner">LOST ITEM${n && n.home ? ' · ' + esc(H[n.home].name) : ''}</p>
      <p class="pop-find">${icon(n && n.home ? H[n.home].icon : 'swap-bag')} <span>${esc(L ? L.text : 'Something in the heap, waiting to be claimed.')}</span></p>
      ${lines}${X(s, 'prep')}
      <div class="opts"><button class="opt" id="pop-fix"><b>${esc(L ? L.fix : 'Fix it')}</b> (−8% budget): upgrade one card, +3 to its numbers.</button>
      <button class="opt" id="pop-leave"><b>Leave the marker:</b> ${esc((L && L.leave) || SAY.leave)} +6% budget.</button></div>
      <p class="small muted">Either way it goes in the ledger.${X(s, 'prep') ? '' : ' No question here.'}</p>`);
    b.querySelector('#pop-fix').onclick = () => pickCard(s, 'Upgrade which card?', i => { P.lostChoice(s, 'fix', i); save(s); P.draw(); });
    b.querySelector('#pop-leave').onclick = () => { P.lostChoice(s, 'leave'); save(s); P.draw(); };
  }
  function breakScreen(s) {
    const b = panel(`${hud(s)}
      <p class="pop-banner">${icon('coffee-mug')} BREAK ROOM</p>
      ${say('dutch', 'neutral', SAY.breakIn[0])}<p class="small muted"><i>(It wobbles.)</i></p>${say('dutch', 'anger', SAY.breakIn[1])}${X(s, 'prep')}
      <div class="opts"><button class="opt" id="pop-rest"><b>Rest:</b> +25% budget.</button>
      <button class="opt" id="pop-sharp"><b>Sharpen:</b> upgrade one card, +3 to its numbers.</button></div>`);
    const out = () => U.system('BREAK ROOM', esc(`${NAMES.seoyeon} (on leaving): ${SAY.breakOut[2]}`));
    b.querySelector('#pop-rest').onclick = () => { P.breakChoice(s, 'rest'); s.msg = SAY.rest; out(); save(s); P.draw(); };
    b.querySelector('#pop-sharp').onclick = () => pickCard(s, 'Sharpen which card?', i => { P.breakChoice(s, 'sharpen', i); s.msg = SAY.breakOut; save(s); P.draw(); });
  }
  function zeroScreen(s) {
    const hunch = s.fight && s.fight.kind === 'hunch';
    const b = panel(`${hud(s)}
      ${say('dutch', 'tired', SAY.zero)}
      <p>The budget hit 0%. Your answers so far are logged.</p>
      <div class="opts"><button class="opt" id="pop-ret"><b>Retreat:</b> end the night here. Proofs held so far still count.</button>
      <button class="opt" id="pop-esc"><b>Escalate:</b> back in at ${Math.max(1, Math.min(20, s.entry))}% budget, and the Hunch hits 3 harder tonight.${hunch ? '' : ' No heal for losing.'}</button></div>`);
    b.querySelector('#pop-ret').onclick = () => { P.retreat(s); save(s); P.draw(); };
    b.querySelector('#pop-esc').onclick = () => { P.escalate(s); save(s); P.draw(); };
  }

  // ---- The proof sheet ----
  function habit(s) {
    const t = s.tally, rate = c => (t[c] && t[c][1] ? t[c][0] / t[c][1] : null);
    if (rate(2) !== null && t[2][1] >= 3 && rate(2) < 2 / 3) return 'Exam habit: press Sure only when you\'d bet on it. Your Sures were right less than 2 times in 3 tonight.';
    if (rate(0) !== null && t[0][1] >= 3 && rate(0) >= 0.5) return 'Exam habit: your Guesses were right half the time or more. Trust the first read a little more.';
    return 'Exam habit: on a Guess, answer, flag it, and come back. A blank scores the same as a wrong answer.';
  }
  function sheetScreen(s) {
    const N = P.needs(), top = [1, 2, 3, 4].sort((a, b) => N[b] - N[a])[0];
    const first = s.log.filter(l => l.kind !== 'practice'), right = first.filter(l => l.ok).length;
    const sureMiss = s.log.filter(l => !l.ok && l.conf === 2).length + (s.fmtWall | 0);
    const head1 = s.how === 'won' ? 'The Hunch didn\'t check out.' : s.how === 'lost' ? 'The Hunch checked out.' : 'You retreated.';
    const finds = s.found.map(id => P.ITEMS.find(i => i.id === id)).filter(Boolean);
    const b = panel(`<p class="pop-banner">PROOF SHEET · Night ${s.night}</p>
      ${s.how === 'won' ? `<div class="pop-sky flat" data-sfx="deflate">${P.HUNCH_FLAT}<span class="pop-cap">Pffffbbbt.</span></div>${say('dutch', 'surprised', (P.deflate && P.deflate(s)) || SAY.won)}<p class="small muted"><i>The badge rolls to his boots. He doesn't pick it up.</i></p>` : say('dutch', 'tired', s.how === 'lost' ? SAY.lost : SAY.retreat)}
      <p class="td-big">${head1} ${right} of ${first.length} proven.</p>
      <p class="small">Night score: <b>${plural(s.heldN | 0, 'proof')} held</b> · <b>${plural(s.cleared, 'claim')} cleared</b> · <b>${M.sgn(s.pts)} points</b>.${sureMiss ? ` ${sureMiss === 1 ? 'One Sure miss' : sureMiss + ' Sure misses'} went up on the Wall.` : ''}</p>
      ${P.fx ? P.fx.sheetLine(s) : ''}
      ${X(s, 'sheet')}${finds.length ? `<p class="small">Found tonight: ${finds.map(i => `${icon(i.icon)} ${esc(i.name)}`).join(' · ')}</p>` : ''}
      <p class="small"><b>Study:</b> tomorrow's topic drill is ${esc(domName(top))}, the domain Today's set most needs.</p>
      <p class="small"><b>${esc(habit(s))}</b></p>
      ${s.carryNext.length ? `<p class="small">${plural(Math.min(3, s.carryNext.length), 'missed idea')} ${Math.min(3, s.carryNext.length) === 1 ? 'comes' : 'come'} back tomorrow night, in a different coat.</p>` : ''}
      ${s.paid ? `<p class="small"><b>${esc(s.paid)}</b></p>` : ''}
      ${M.calibHtml(s.tally, 'How sure you were tonight')}
      ${M.pipHtml()}
      ${dock('<button class="ghost" id="pop-ledger">The ledger</button><button class="primary" id="pop-done">Done for tonight</button>')}`);
    M.pipWire(b, 'The Lost and Found');
    b.querySelector('#pop-done').onclick = () => { U.closePanel(); stopNow(); };
    b.querySelector('#pop-ledger').onclick = () => ledgerScreen(() => sheetScreen(s));
  }
  function ledgerScreen(back) {
    const L = ledger(), n = P.ITEMS.filter(i => L[i.id]).length;
    const homes = { thornwick: 'Thornwick', halcyon: 'Halcyon', peak: 'Burning Peak', arcanum: 'The Arcanum' };
    const b = panel(`<p class="pop-banner">THE LEDGER · ${n} of ${P.ITEMS.length}</p>
      ${say('dutch', 'neutral', 'Somebody owned all this. Nobody\'s come to claim it. Till they do, it goes in the book.')}
      ${Object.keys(homes).map(h => { const its = P.ITEMS.filter(i => i.home === h); return `<div class="pop-lrow"><b>${esc(homes[h])} · ${its.filter(i => L[i.id]).length} of 3</b><div>${its.map(i => L[i.id] ? `<span class="pop-li">${icon(i.icon)} ${esc(i.name)}</span>` : `<span class="pop-li blank" aria-label="Not found yet">${icon(i.icon)} ?</span>`).join('')}</div></div>`; }).join('')}
      ${X(null, 'ledger')}${dock('<button class="primary" id="pop-lback">Done</button>')}`);
    b.querySelector('#pop-lback').onclick = back;
  }

  // ---- First run ----
  function walkScreens(s) {
    const ck = s && s.rooms[0], q = ck && find(ck.q), sp = q ? M.split(q) : null;
    return [
      { title: 'The heap', html: `<p data-vo="${esc('dutch|' + SAY.arrive[0])}"><b>Dutch:</b> "${esc(SAY.arrive[0])}"</p>
        <p>Every room in the heap is a claim, a lost item or the break room. Claims are fights. Each turn Dutch stamps a check with its domain, like this one from tonight (${esc(ck ? domName(ck.d) : 'a domain')}):</p>
        ${sp ? `<div class="md-eg"><p class="small"><b>${esc(sp.ask)}</b></p></div>` : ''}
        <p class="small">You only see the stamp before you stake. The whole question opens on its own screen.</p>` },
      { title: 'Stake, then prove', html: `<p>Stake cards on the check before you read it, up to ${CAP} Capacity. Then answer, and say how sure you are:</p>
        ${M.stakeTable()}<p class="small">Right: staked cards land at ×0.75, ×1 or ×1.25. Wrong: they fizzle, cost a quarter of the stake in budget, or three quarters and go on the Wall. Unstaked cards play small: Patch ${BASIC} or Guard ${BASIC}.</p>` },
      { title: 'The Hunch', html: `<p>At the top of the heap is the Hunch. Every room check you didn't spend comes with you as a loose proof (+3 to its hit until you prove it). Then 3 core proofs: hold 2 and it doesn't check out.</p>
        <p class="small">About 18 minutes. It saves after every step: ☰ Stop for now any time.</p>` }
    ];
  }
  P.start = async function () {
    let s = cur();
    if (!s || s.phase === 'sheet' || s.v !== 1) {
      s = P.newNight();
      if (!s.rooms.length) { U.system(TITLE, 'No bank questions on this exam yet.'); return; }
      await M.walkFirst(ID, walkScreens(s));
    } else if (s.phase === 'stake' || s.phase === 'locked') s.msg = null;
    P.draw();
  };

  // ---- Simulator hook: a whole night on the real state machine, no UI, no saves ----
  // policy: { p, conf, route: 'near' (claims first) | 'far' (other rooms first) | 'home' (policy.home's doors first) | 'plan',
  //           stake: 'all' | 'none' | 'honest', escalate, p2 (accuracy at the Hunch, default p), night (nights before this one),
  //           day (the night's local date, YYYY-MM-DD; default today) }. Only 'plan' checks rooms first (P.simPrep).
  P.sim = async function (policy, rng) {
    const prev = RNG; RNG = rng || Math.random;
    try {
      const s = P.newNight({ sim: true, night: policy.night | 0, day: policy.day });
      s.phase = 'map';
      let map = 1, guard = 0, turns = 0;
      const answer = ck => { if (ck.fmt && P.fx) return P.fx.simAnswer(s, ck, policy, RNG); const q = E().find(ck.q); const r = M.simAnswer(q, Object.assign({}, policy, { p: ck.kind === 'core' || ck.kind === 'loose' ? (policy.p2 || policy.p) : policy.p }), RNG); M.note(s.tally, r.ok, r.conf); return r; };
      while (s.phase !== 'sheet' && ++guard < 400) {
        if (s.phase === 'map') {
          if (P.atHunch(s)) { P.startHunch(s); map++; continue; }
          const doors = P.doors(s), row = s.map.rows[s.map.row + 1];
          const pref = policy.route === 'plan' && P.simRoute ? P.simRoute(s, doors, row) : policy.route === 'far' ? doors.filter(i => row[i].type !== 'claim') : policy.route === 'home' ? doors.filter(i => row[i].home === policy.home) : doors.filter(i => row[i].type === 'claim');
          const pick = (pref.length ? pref : doors)[Math.floor(RNG() * (pref.length ? pref.length : doors.length))];
          P.go(s, pick); map++;
          continue;
        }
        if (s.phase === 'teach') { P.fx.simTeach(s); continue; }
        if ((s.phase === 'lost' || s.phase === 'break') && P.simPrep && P.simPrep(s, policy, answer)) { map++; continue; }   // hook: check it first
        if (s.phase === 'lost') { P.lostChoice(s, s.budget > 50 ? 'fix' : 'leave', 0); map++; continue; }
        if (s.phase === 'break') { if (s.budget < 70) P.breakChoice(s, 'rest'); else P.breakChoice(s, 'sharpen', 0); map++; continue; }
        if (s.phase === 'reward') { P.take(s, s.reward.cards[0]); map++; continue; }
        if (P.SIM[s.phase]) { P.SIM[s.phase](s, policy, answer); map++; continue; }   // hook: nights 2 to 5's rooms
        if (s.phase === 'zero') { if (policy.escalate) P.escalate(s); else P.retreat(s); map++; continue; }
        if (s.phase === 'stake') {
          const f = s.fight;
          if (!P.peek(s)) { if (f.kind === 'hunch') P.finish(s, P.held(s) >= 2 ? 'won' : 'lost'); else P.endTurn(s); continue; }
          const sk = policy.stake || 'all';
          f.sel = sk === 'none' ? [] : sk === 'honest' ? (policy.p >= 0.45 ? P.stakeAll(s) : []) : P.stakeAll(s);
          const ck = P.lock(s);
          P.settle(s, answer(ck)); turns++;
          if (P.simLand) P.simLand(s);
          while (P.basicsLeft(s) > 0) {
            const fr = s.fight.hand.map((x, h) => h).find(h => !s.fight.played.includes(h) && !s.fight.basics.some(b => b.h === h));
            if (fr == null) break;
            P.basic(s, fr, s.fight.kind === 'claim' && s.fight.guard >= P.intent(s) ? 'patch' : 'guard');
          }
          P.endTurn(s);
          continue;
        }
        break;
      }
      const secs = s.asked * M.SIM_Q_SECS + map * M.SIM_MAP_SECS + turns * 4;
      return { pts: s.pts, budget: s.budget, minutes: secs / 60, mapShare: (map * M.SIM_MAP_SECS) / secs, questions: s.asked, zero: s.how === 'retreat',
        won: s.how === 'won', held: s.heldN | 0, cleared: s.cleared, fled: s.fled, how: s.how, score: (s.heldN | 0) * 10 + s.cleared * 5 + s.pts,
        formats: s.fx ? s.fx.log.filter(l => !l.teach) : [], prepN: s.prepN | 0, prepUsed: s.prepUsed | 0, ...(P.simOut ? P.simOut(s) : {}) };
    } finally { RNG = prev; }
  };

  // For js/mode-pop-formats.js: the drawing helpers and the RNG the simulator seeds.
  P.ui = { panel, hud, say, sayL, dock, stopBtn, wireStop, icon, save, find, esc, plural, domName, stopNow, NAMES, DOM, MAX_CHECKS };
  P.rnd = rnd;
  P.ageOf = ageOf;
  // hook: what js/mode-pop-rooms.js shares with this file.
  P._ = { miss, ageOf, save, find, say, sayL, icon, panel, hud, dock, stopBtn, wireStop, pickCard, stopNow, nextFind, ledger, rnd, shuffle, plural, esc, SAY, NAMES, BASIC };

  M.register({
    id: ID, name: 'The Lost and Found', minutes: 'about 18', host: 'Dutch',
    blurb: 'Everything in Dutch\'s heap says it\'s somebody\'s. Stake on what you know, and prove it.',
    start: P.start, sim: P.sim,
    status: () => { const s = cur(); if (!s || s.v !== 1 || s.phase === 'sheet') return '';
      const open = s.fight && s.fight.locked && s.fight.check ? 1 : 0, rest = s.fight && s.fight.order ? s.fight.order.length : s.core.length;
      return `Resume · ${s.asked} of ${s.asked + open + s.rooms.length + rest} checks · Budget ${Math.max(0, s.budget)}%`; }
  });

  const css = document.createElement('style');
  css.textContent = `
    .pop { display: flex; flex-direction: column; gap: 8px; }
    .pop p { margin: 0; }
    .pop-night { font-family: var(--f-head); font-weight: 700; font-size: 18px; }
    .pop-hud { display: flex; flex-wrap: wrap; gap: 2px 14px; font-size: 14px; }
    .pop-bar { margin: 2px 0 4px; }
    .pop-bar i { background: var(--mint, #4f7f5c); }
    .pop-say { display: flex; gap: 8px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
    .pop-head { flex: 0 0 34px; width: 34px; height: 40px; overflow: hidden; border-radius: 8px; border: 2px solid var(--ink, #17131f); background: var(--paper, #c7bca4); }
    .pop-head .bust, .pop-head svg { width: 30px !important; height: 36px !important; }
    .pop-head img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
    .pop-speaker { font-size: 14px; padding: 6px 8px; border: 2px dashed var(--ink, #17131f); border-radius: 10px; }
    .pop-sky { position: relative; display: flex; flex-direction: column; align-items: center; padding: 8px; border-radius: 12px; border: 3px solid var(--ink, #17131f); background: linear-gradient(#3f5f80, #b8923a 140%); }
    .pop-sky.flat { background: linear-gradient(#554c5e, #3f5f80); }
    .pop-sky .pop-hunch { width: 120px; height: 110px; }
    .pop-cap { color: #fff; font-weight: 800; font-size: 13px; letter-spacing: .04em; }
    .pop-hunchdoor { display: flex; align-items: center; gap: 10px; width: 100%; text-align: left; min-height: 56px; padding: 4px 10px; border: 3px solid var(--ink, #17131f); border-radius: 12px; background: #2c3550; color: #fff; }
    .pop-hunchdoor .pop-hunch { width: 52px; height: 48px; flex: 0 0 52px; }
    .pop-hunchdoor.reach { box-shadow: 0 0 0 3px var(--sun, #b8923a); }
    .pop-hunchdoor:disabled { opacity: 1; }
    .pop-map { display: flex; flex-direction: column; gap: 8px; padding: 8px; border-radius: 12px; border: 3px solid var(--ink, #17131f); background: repeating-linear-gradient(45deg, #8a8478 0 6px, #7f796e 6px 12px); }
    .pop-row { display: flex; justify-content: center; gap: 6px; }
    .pop-door { position: relative; flex: 1 1 0; max-width: 110px; min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding: 4px; border: 3px solid var(--ink, #17131f); border-radius: 12px 12px 4px 4px; background: #c9c2b2; color: var(--ink, #17131f); font-size: 12px; line-height: 1.15; }
    .pop-door .pop-gi { width: 22px; height: 22px; }
    .pop-door .pop-gi.badge { position: absolute; top: 3px; right: 4px; width: 14px; height: 14px; }
    .pop-door.reach { background: var(--bone, #e2dbcb); box-shadow: 0 0 0 3px var(--sun, #b8923a); font-weight: 700; }
    .pop-door.fog { background: #4a4552; color: #e2dbcb; border-style: dashed; }
    .pop-door.here { background: var(--blue, #3f5f80); color: #fff; }
    .pop-door.cleared .pop-dt { font-weight: 800; }
    .pop-door:disabled { opacity: 1; }
    .pop-dl { overflow-wrap: anywhere; text-align: center; }
    .pop-dt { font-size: 11px; opacity: .9; }
    .pop-stage { display: flex; gap: 10px; align-items: center; padding: 6px 8px; border-radius: 12px; border: 3px solid var(--ink, #17131f); background: linear-gradient(#cfc6b0, #a89e86); }
    .pop-stage.thornwick { background: linear-gradient(#9fb09a, #6f7f66); }
    .pop-stage.peak { background: linear-gradient(#d9a47a, #8a5a44); }
    .pop-stage.hunch { background: linear-gradient(#3f5f80, #2c3550); color: #fff; }
    .pop-foe { flex: 0 0 84px; width: 84px; height: 84px; }
    .pop-foe svg { width: 84px; height: 84px; }
    .pop-intent { flex: 1; min-width: 0; font-size: 14px; display: flex; flex-direction: column; gap: 2px; overflow-wrap: anywhere; }
    .pop-home { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 800; }
    .pop-home .pop-gi { width: 16px; height: 16px; }
    .pop-sev i { background: var(--red, #9e3a34); }
    .pop-plate { display: flex; flex-wrap: wrap; gap: 4px; margin: 2px 0; }
    .pm { display: inline-flex; align-items: center; justify-content: center; width: 24px; height: 24px; font-style: normal; font-weight: 800; border: 2px solid #fff; }
    .pm.held { background: var(--mint, #4f7f5c); }
    .pm.failed { background: #17131f; transform: rotate(45deg) scale(.8); }
    .pm.wait { border-radius: 50%; }
    .pm.loose { width: 18px; height: 18px; border-style: dashed; font-size: 12px; }
    .pop-stamp { display: flex; flex-wrap: wrap; gap: 2px 8px; align-items: baseline; padding: 6px 8px; border: 3px double var(--red, #9e3a34); border-radius: 8px; color: var(--red, #9e3a34); font-size: 13px; letter-spacing: .03em; background: var(--bone, #e2dbcb); }
    .pop-stamp b { font-family: var(--f-head); }
    .pop-quick { display: flex; flex-wrap: wrap; gap: 6px; }
    .pop-quick button { min-height: 44px; flex: 1 1 auto; }
    .pop-quick button.on { background: var(--blue, #3f5f80); color: #fff; }
    .pop-hand { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .pop-card { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 84px; padding: 6px 8px; text-align: left; border: 3px solid var(--ink, #17131f); border-radius: 10px; background: #fff; color: var(--ink, #17131f); font-size: 13px; line-height: 1.2; }
    .pop-card .pop-gi { width: 22px; height: 22px; }
    .pop-card.on { background: var(--bone, #e2dbcb); box-shadow: inset 0 0 0 3px var(--sun, #b8923a); }
    .pop-card.locked { opacity: 1; }
    .pop-cn { display: flex; flex-direction: column; }
    .pop-ct { font-size: 12px; overflow-wrap: anywhere; }
    .pop-cost { position: absolute; top: 4px; right: 6px; width: 22px; height: 22px; border-radius: 50%; border: 2px solid var(--ink, #17131f); background: var(--sun, #b8923a); font-weight: 800; display: flex; align-items: center; justify-content: center; }
    .pop-tag { font-size: 11px; font-weight: 800; color: var(--blue, #3f5f80); }
    .pop-sum { overflow-wrap: anywhere; }
    .pop-what summary { cursor: pointer; font-weight: 700; min-height: 32px; }
    .pop-grid { width: 100%; border-collapse: collapse; font-size: 12px; }
    .pop-grid th, .pop-grid td { border: 1px solid var(--ink, #17131f); padding: 3px; text-align: center; }
    .pop-since { padding: 6px 8px; border-left: 4px solid var(--ink, #17131f); overflow-wrap: anywhere; }
    .pop-basics { display: flex; flex-direction: column; gap: 6px; }
    .pop-bas { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .pop-bas span { display: inline-flex; align-items: center; gap: 4px; flex: 1 1 120px; font-weight: 700; }
    .pop-bas .pop-gi { width: 20px; height: 20px; }
    .pop-bas button { min-height: 44px; }
    .pop-banner { font-family: var(--f-head); font-weight: 700; font-size: 17px; letter-spacing: .04em; display: flex; align-items: center; gap: 6px; }
    .pop-banner .pop-gi { width: 22px; height: 22px; }
    .pop-find { display: flex; gap: 8px; align-items: center; }
    .pop-find .pop-gi { width: 28px; height: 28px; flex: 0 0 28px; }
    .pop .small .pop-gi { width: 16px; height: 16px; vertical-align: -3px; }
    .pop-lrow { display: flex; flex-direction: column; gap: 4px; padding: 6px 0; border-bottom: 1px solid var(--muted, #554c5e); }
    .pop-lrow > div { display: flex; flex-wrap: wrap; gap: 6px; }
    .pop-li { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; padding: 2px 6px; border: 2px solid var(--ink, #17131f); border-radius: 8px; background: #fff; }
    .pop-li .pop-gi { width: 18px; height: 18px; }
    .pop-li.blank { color: var(--muted, #554c5e); border-style: dashed; background: transparent; }
    .pop-li.blank .pop-gi { opacity: .45; }
    .pop-dock { position: sticky; bottom: -16px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin: 4px -16px -16px; padding: 10px 16px; background: var(--cream, #fffaf0); border-top: 3px solid var(--ink, #17131f); }
    .pop-dock button { min-height: 44px; }
    .pop-dock .primary { flex: 1 1 auto; }
    .pop .opts .opt { text-align: left; }
    /* Dutch's ink stamp on a door: red ink, a double rule, a little crooked. */
    .pop-dom { display: inline-flex; align-items: center; gap: 2px; max-width: 100%; padding: 0 3px; border: 3px double #9e3a34; border-radius: 4px; color: #9e3a34; background: rgba(255, 250, 240, .75); font-size: 10.5px; font-weight: 800; white-space: nowrap; transform: rotate(-4deg); }
    .pop-door.fog .pop-dom, .pop-door.here .pop-dom { color: #fff; border-color: #fff; background: transparent; }
    .pop-door .pop-dom .pop-gi { width: 12px; height: 12px; flex: 0 0 12px; }
    /* The Prepared tag, tied to a claim's door with a string. */
    .pop-ptag { position: absolute; top: -10px; right: -6px; display: flex; align-items: center; gap: 1px; padding: 1px 4px 1px 2px; border: 2px solid var(--ink, #17131f); border-radius: 3px 8px 8px 3px; background: #f3d36b; color: #17131f; font-size: 10px; transform: rotate(8deg); box-shadow: -6px 4px 0 -4px var(--ink, #17131f); }
    .pop-door .pop-ptag .pop-gi { width: 12px; height: 12px; }
    .pop-stage .pop-tags .pop-gi { width: 14px; height: 14px; vertical-align: -2px; }
`;
  document.head.appendChild(css);
})();
