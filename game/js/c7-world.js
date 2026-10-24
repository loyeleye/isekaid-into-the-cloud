// Chapter 7, Root (floor 100): the explorable chapter, from the night before the climb to the end card.
// One map: the Free Cloud's camp at the tower's foot, the night before the finale, with the whole game's cast in it.
// Every band's building, borrowed from the chapter that drew it; Uptima at the fire with the prayers; the gift basket;
// five lanterns where two of the four are sitting up late (the arc finales, from story-bible/01-relationships.md);
// and the tower lift to floor 100. Knowledge opens the way: Bru's board, Elder Wren's question and the lift's revoke
// policy are minigames (js/c7-games.js). The climb is a raid-engine expedition (js/raid.js, data in js/c7-data.js)
// played solo with the other three as bots, with Seymour's Tapes (js/tapes.js); Freya keeps one phase for each
// blessing whose reckoning wasn't done, and the floors ease for every band that was freed. The roof, the vote, Freya
// and her last words play from cues in the floors' intros and outros. Afterwards: Uptima at the fire, the Design
// Board, the epilogue and the end card.
// Plays standalone with window.SD_CH = 7 or ?vector&ch7; SD.chapterStart[7] starts it from chapter 6's end card.
// Saves in S.save.c7.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const CH7 = String(window.SD_CH) === '7' || /[?&]ch7\b/.test(location.search);
  const W = SD.c7world = { on: false, active: false };
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, T = SD.ch1story, A = SD.c7art, G = SD.c7games, D = SD.c7data;
  const $ = U.$, esc = s => U.esc(s);
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  // ---------- Save ----------
  const c7 = () => S.save.c7 || (S.save.c7 = { f: {}, w: { x: {}, pos: null, cards: [], miss: [], gifts: [], pairs: [], from: 0 } });
  const w = () => c7().w;
  const c1 = () => S.save.c1 || {};
  const flag = k => !!w().x[k];
  const setFlag = k => { w().x[k] = true; S.persist(); };
  const lead = () => c1().lead || 'mira';
  const others = () => T.order.filter(id => id !== lead());
  // What the earlier chapters left: each reckoning strips one of Freya's blessings, each freed band takes its grant back.
  const sv = k => S.save[k] || {};
  const x = k => ((sv(k).w || {}).x || {});
  const RECKONED = { hale: () => !!(sv('c2x').f || {}).grey, selvaria: () => !!x('c3').reckard, namgung: () => !!x('c4').reckon, iris: () => !!(x('c5').reckon || x('c5').spared) };
  const BANDS = [['thornwick', 'Thornwick', () => !!(sv('c2x').f || {}).freed], ['halcyon', 'Halcyon', () => !!(sv('c3').f || {}).done], ['sealed', 'the Sealed Floors', () => !!(sv('c4').f || {}).done],
    ['arcanum', 'the Arcanum', () => !!(sv('c5').f || {}).done], ['twinwater', 'Twinwater', () => !!(sv('c6').f || {}).done]];
  const blessings = () => D.BLESSINGS.filter(b => !RECKONED[b[0]]());
  const freed = () => BANDS.filter(b => b[2]());
  const choice6 = () => sv('c6').choice || 'least';
  // Music: this chapter's own songs once they're loaded (js/audio-chapters.js), else the nearest older one.
  const FB = { c7camp: 'camp', c7climb: 'c6dungeon', c7boss: 'boss', c7freya: 'freya', c7sad: 'c6sad', c7roof: 'story' };
  const mname = k => { const f = AU.has && AU.has(k) ? k : (FB[k] || k); return AU.has && !AU.has(f) && FB[f] ? FB[f] : f; };
  const mus = k => AU.music(mname(k));

  // Lines: [who, text, face]. who 'lead' is you; text can be { mira: ..., other: ... } for the lead's own words.
  const pick = t => (t && typeof t === 'object' ? (t[lead()] || t.other) : t);
  const L = lines => lines.map(([s, t, e]) => ({ s: s === 'lead' ? lead() : s || 'narr', t: pick(t), e }));
  const say = lines => U.dialog(L(lines));
  // A visual-novel scene, with the same 'lead' and per-lead text. Named with cut.def for the cutscene viewer
  // (js/reel.js), and played with cut.play.
  const cut = SD.reel.chapter('7', { music: k => mus(k) });
  const who = s => (s === 'lead' ? lead() : s);
  // A pair scene's inner line: only when your lead is one of the pair, and nobody else hears it.
  const inner = m => (m[lead()] ? [['narr', m[lead()]]] : []);
  const vn = steps => steps.map(s => {
    if (!Array.isArray(s)) return s;
    if (s[0] === 'show' || s[0] === 'hide') return [s[0], who(s[1])].concat(s.slice(2));
    if (s[0] === 'music') return ['music', s[1] && mname(s[1])];
    if (['bg', 'cg', 'fx', 'wait', 'narr'].includes(s[0])) return s[0] === 'narr' ? ['narr', pick(s[1])] : s;
    return [who(s[0]), pick(s[1]), s[2]];
  });
  const NAME = id => ((T.leads[id] || {}).name || id).split(' ')[0];
  // What each of the four kept from the person they lost: Kagemaru's price for the roof.
  const KEPT = { mira: 'Bram\'s list', kai: 'Hana\'s burnt page', seoyeon: 'Old Gu\'s letter', dutch: 'Lina\'s diary' };

  // ---------- The map ----------
  const MW = 44, MH = 32;
  const PROPS = [], PROP = {};
  const BASE = (function build() {
    const m = Array.from({ length: MH }, () => Array(MW).fill('T'));
    const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y][x] = c; };
    const set = (x, y, c) => { m[y][x] = c; };
    fill(1, 1, MW - 2, MH - 2, 'g');
    // The flagstones at the tower's foot, and the paths.
    fill(13, 1, 30, 7, 'p');
    fill(21, 7, 22, 29, ','); fill(2, 12, 41, 12, ','); fill(2, 22, 41, 22, ',');
    fill(4, 10, 4, 12, ','); fill(10, 10, 10, 12, ','); fill(33, 10, 33, 12, ','); fill(4, 16, 4, 22, ','); fill(33, 16, 33, 22, ',');
    fill(37, 16, 37, 22, ','); fill(5, 22, 5, 26, ','); fill(33, 22, 33, 26, ','); fill(38, 22, 38, 26, ','); fill(27, 22, 27, 27, ',');
    // Flowers, and Cron's rows.
    fill(16, 9, 19, 10, 'f'); fill(24, 9, 27, 10, 'f'); fill(2, 29, 6, 29, 'f'); fill(38, 29, 41, 29, 'f');
    fill(12, 25, 18, 28, 'c');
    // A few trees in the camp itself.
    [[8, 18], [14, 20], [30, 18], [26, 29], [1, 20], [42, 15], [11, 2], [32, 2], [2, 2], [41, 2]].forEach(([x, y]) => set(x, y, 'T'));
    // The lift to floor 100.
    set(21, 5, 'L'); set(22, 5, 'L');
    const prop = (id, kind, x, y, wd, h, more, solid) => {
      const p = Object.assign({ id, kind, x, y, w: wd, h }, more);
      PROPS.push(p); PROP[id] = p;
      if (solid !== false) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + wd; xx++) if (m[yy][xx] !== 'L') m[yy][xx] = '#';
      return p;
    };
    prop('tower', 'towerfoot', 17, 1, 10, 4);
    // The west side: the post office, Marrow's bell, Seymour's bunker, Bru's board, Wen's café and Kai's market.
    prop('post', 'postoffice', 2, 8, 3, 2);
    prop('bell', 'bell', 8, 8, 2, 2, { from: 'c5' });
    prop('bunker', 'bunker', 2, 14, 3, 2, { open: true });
    prop('bru', 'c3board', 12, 14, 2, 1);
    prop('cafe', 'c3cafe', 2, 23, 3, 2, { open: true });
    prop('market', 'c3stall', 7, 24, 2, 1, { color: '#c8763a' });
    // The east side: Lexi's library, Theo's records office, Seo-yeon's school, Ayo's forge, Mio's relay station.
    prop('library', 'library', 31, 7, 4, 3, { from: 'c4' });
    prop('records', 'c3office', 31, 14, 3, 2, { open: true });
    prop('school', 'school', 37, 14, 3, 2);
    prop('forge', 'forge', 31, 23, 3, 2, { from: 'c5' });
    prop('relay', 'relay', 37, 23, 3, 2, { open: true });
    // The south: Cron's farm, Aigerim's tent, the Design Board, and wherever Kagemaru ended up.
    prop('fence', 'fence', 12, 29, 7, 1, null, true);
    prop('shop', 'shop', 25, 25, 3, 2);
    prop('dboard', 'dboard', 29, 18, 1, 1);
    prop('kstall', 'stall', 39, 28, 2, 1);
    prop('ktent', 'tent', 39, 27, 2, 2);
    // The fire in the middle, the basket and Uptima's prayers beside it, and the tents.
    prop('fire', 'campfire', 21, 17, 1, 1, { lit: true });
    prop('basket', 'giftbasket', 19, 16, 1, 1);
    prop('prayers', 'prayers', 24, 16, 1, 1);
    prop('tent1', 'tent', 15, 17, 2, 2); prop('tent2', 'tent', 26, 19, 2, 2); prop('tent3', 'tent', 9, 28, 2, 2);
    prop('lamp1', 'lamp', 18, 12, 1, 1); prop('lamp2', 'lamp', 25, 12, 1, 1); prop('lamp3', 'lamp', 21, 23, 1, 1);
    return m.map(r => r.join(''));
  })();
  // The five arc finales: where each pair is sitting up late. id -> [x, y, the two of them, title].
  const PAIRS = { temp: [38, 17, ['kai', 'seoyeon'], 'Temporary Credentials'], redrive: [5, 11, ['mira', 'dutch'], 'Redrive'], key: [17, 20, ['seoyeon', 'mira'], 'My Own Key'],
    idem: [6, 26, ['kai', 'mira'], 'Idempotent'], on: [34, 17, ['dutch', 'seoyeon'], 'Turned On'] };
  Object.keys(PAIRS).forEach(id => { const [x, y] = PAIRS[id]; PROPS.push(PROP['pair' + id] = { id: 'pair' + id, kind: 'spot', x, y, w: 1, h: 1 }); });
  // The gift basket: [band, card, who gives it, where they stand].
  const GIFTS = [['thornwick', 'r7-letter', 'pip'], ['halcyon', 'r7-loaf', 'wen'], ['sealed', 'r7-seal', 'ok'], ['arcanum', 'r7-lantern', 'pella'], ['twinwater', 'r6-stone', 'mio']];
  const giftsDue = () => GIFTS.filter(g => (BANDS.find(b => b[0] === g[0]) || [])[2] && BANDS.find(b => b[0] === g[0])[2]());
  const hasGift = band => w().gifts.includes(band);
  // What the save left, for the overlays on this chapter's stills (js/c7-over.js).
  W.now = { blessings: () => blessings().map(b => b[0]), gifts: () => w().gifts.slice(), pairs: () => w().pairs.length };

  // ---------- The scene ----------
  let sc = null, busy = false, lastTile = '', zoneShown = false;

  // ---------- The Version Lens: every mode, once more (js/lens.js) ----------
  // No new mode. The night before the climb, each mode lights one building borrowed from its own chapter, with a short
  // recall question. On the roof there's nothing for it to show: Dutch just reads.
  const LW = SD.lens.world({ mode: 'EVERY MODE', save: c7, busy: () => busy, scene: () => sc, act: fn => act(fn), redraw: () => applyState(), flag,
    // Freya's throttle is hers only while she holds root: once the vote is won, looking is free.
    costs: () => !flag('won'),
    intro: ['THE LENS · EVERY MODE', 'The night before the climb, every mode the lens has learned lights one building in the camp, the one that taught it.'],
    spots: {
      bell: { x: 8, y: 11, label: 'Marrow\'s bell', mark: '⟲', spot: { title: 'MARROW\'S BELL', mode: 'VERSIONS', concept: 's3ver',
        intro: 'Under Marrow\'s bell, the lens finds what Pingsby taught it first: versions.',
        q: 'A versioned bucket gets a plain DELETE for the bakery sign, with no version ID. What happens?',
        opts: [{ t: 'A delete marker goes on top; the sign is still underneath', ok: true },
          { t: 'The sign is gone for good', no: 'Only a delete that names a version ID removes a version for good.' },
          { t: 'S3 refuses: versioned objects can\'t be deleted', no: 'The delete works. It just hides the sign behind a marker.' },
          { t: 'Every version of the sign is deleted', no: 'A plain delete never touches older versions.' }],
        view: { head: 'pingsby/bakery-sign · versions', rows: [['Current', 'delete marker'], ['Underneath', 'the sign, noncurrent']] },
        why: 'In a versioned bucket a plain delete adds a delete marker as the current version, so a GET answers 404 while every earlier version is still there. Delete the marker and the sign is back.' } },
      bru: { x: 12, y: 16, label: 'Bru\'s board', mark: '✉', spot: { title: 'BRU\'S BOARD', mode: 'IN FLIGHT', concept: 'sqs',
        intro: 'On Bru\'s board, the lens finds the Dead Letter Office\'s letters still in flight.',
        q: 'A consumer receives a message and crashes before deleting it. What happens to the message?',
        opts: [{ t: 'Once its visibility timeout runs out, it can be received again', ok: true },
          { t: 'It\'s gone: receiving it removed it', no: 'Receiving only hides a message. Only a delete removes it.' },
          { t: 'It goes straight to the dead-letter queue', no: 'Only after it has been received more times than the redrive policy\'s maxReceiveCount.' },
          { t: 'It stays hidden until it expires', no: 'It\'s hidden only for the visibility timeout, then it\'s back in the queue.' }],
        view: { head: 'letters · in flight', rows: [['Received, not deleted', '1'], ['Visible again in', '30 s'], ['Receive count', '1 of 5 before the dead-letter queue']] },
        why: 'A received message stays in the queue, hidden for the visibility timeout. If the consumer deletes it in time it\'s done; if not, it comes back for another try, and the redrive policy sends it to a dead-letter queue after too many.' } },
      cafe: { x: 3, y: 26, label: 'The Cache Café', mark: '⌛', spot: { title: 'THE CACHE CAFÉ', mode: 'OLD IMAGE', concept: 'ddbstream',
        intro: 'At Wen\'s café, the lens finds the Granaries\' old images.',
        q: 'A function reads a table\'s stream to undo bad writes. Which view type does the stream need?',
        opts: [{ t: 'OLD_IMAGE or NEW_AND_OLD_IMAGES', ok: true },
          { t: 'KEYS_ONLY', no: 'That records only the key. There\'s nothing to put back.' },
          { t: 'NEW_IMAGE', no: 'That records the item after the write, the bad version.' },
          { t: 'Any of them: you can change it later', no: 'An existing stream\'s view type can\'t be changed. You\'d make a new stream, which only records from then on.' }],
        view: { head: 'ledger · stream record', rows: [['OldImage', 'what to put back'], ['Kept for', '24 hours']] },
        why: 'To undo a write you need the item as it was before it, which only OLD_IMAGE and NEW_AND_OLD_IMAGES record. Pick the view type when you turn the stream on, and act within 24 hours.' } },
      library: { x: 31, y: 11, label: 'Lexi\'s library', mark: '◈', spot: { title: 'LEXI\'S LIBRARY', mode: 'ENVELOPE', concept: 'kmsenv',
        intro: 'At Lexi\'s library, the lens reads the envelope, never the letter.',
        q: 'With envelope encryption, what do you store beside the encrypted data?',
        opts: [{ t: 'The data key, encrypted under the KMS key', ok: true },
          { t: 'The data key, in plaintext', no: 'Then anyone who can read the data can read the key. You throw the plaintext copy away.' },
          { t: 'The KMS key, encrypted', no: 'A KMS key never leaves KMS. Only data keys do.' },
          { t: 'Nothing: KMS keeps the data key for you', no: 'KMS doesn\'t store data keys. The encrypted copy you keep is the only one.' }],
        view: { head: 'scroll · envelope', rows: [['Beside the data', 'encrypted data key'], ['In KMS', 'the KMS key, never leaving']] },
        why: 'GenerateDataKey gives you a data key in plaintext and encrypted. Seal the data with the plaintext copy, discard it, and keep the encrypted copy with the data; Decrypt turns it back into a key when you need to read.' } },
      records: { x: 32, y: 17, label: 'Theo\'s records office', mark: '⑂', spot: { title: 'THEO\'S RECORDS OFFICE', mode: 'RELEASE', concept: 'shifting',
        intro: 'At Theo\'s records office, the lens shows what\'s really behind a name.',
        q: 'CodeDeploy is running a canary: the live alias sends 10% to version 7. The deployment\'s alarm goes off. What happens?',
        opts: [{ t: 'With rollback on alarm set, the alias goes back to all version 6', ok: true },
          { t: 'Version 7 gets the rest of the traffic anyway', no: 'An alarm stops the deployment; it doesn\'t push it through.' },
          { t: 'The alias is deleted until someone fixes it', no: 'The alias stays, so callers never notice. Only its weights change back.' },
          { t: '$LATEST takes all the traffic', no: 'A weighted alias never points at $LATEST.' }],
        view: { head: 'order-fn:live · after the alarm', rows: [['version 6', 'weight 1.0'], ['version 7', 'rolled back']] },
        why: 'A Lambda deployment in CodeDeploy moves an alias\'s weights from the old version to the new one. Attach CloudWatch alarms and turn on rollback, and an alarm during the shift puts the alias back on the old version.' } },
      relay: { x: 40, y: 26, label: 'The relay station', mark: '♥', spot: { title: 'THE RELAY STATION', mode: 'HEARTBEAT', concept: 'readiness',
        intro: 'At Mio\'s relay station, the lens hears what\'s behind an OK.',
        q: 'Why can a target pass its health check and still fail real requests?',
        opts: [{ t: 'The check may only show the process answers, not that its dependencies work', ok: true },
          { t: 'It can\'t: passing the check means every dependency is fine', no: 'Only if the check asks about them. A shallow check doesn\'t.' },
          { t: 'Health checks only fail on timeouts', no: 'They fail on any response outside the success codes, too.' },
          { t: 'The load balancer doesn\'t send it real requests', no: 'Healthy targets get real traffic. That\'s the problem.' }],
        view: { head: 'twin · behind the OK', rows: [['GET /health', '200 OK'], ['Database', 'unreachable']] },
        why: 'A health check answers exactly the question it asks. Check the path that does the work, or the dependencies it needs, and keep it cheap enough to run every few seconds.' } }
    } });
  const WX = SD.wx;
  function weather(stage) {
    if (stage === 0 || !WX) return;
    WX.embers(21.5, 17.5, 1, 14);
  }
  const trail = [];
  const solidNow = () => 'TG#XV';
  const phase = () => (flag('won') ? 'dawn' : 'night');
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => A.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  const thing = (id, x, y, label) => sc.addActor(id, { x, y, thing: true, label, draw: () => {} });
  const groundCh = (map, x, y) => (y < 0 || y >= MH || x < 0 || x >= MW) ? 'V' : map[y][x];

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [[21.5, 17.5, 3.4, '255,140,60', 1], [18.5, 12.2, 1.6, '255,220,160', 0], [25.5, 12.2, 1.6, '255,220,160', 0], [21.5, 23.2, 1.6, '255,220,160', 0],
        [24.9, 16.2, 1.2, '255,226,138', 1], [21.5, 4.6, 1.8, '200,220,255', 1], [3.5, 15, 1.4, '255,215,106', 0], [38.5, 23.4, 1.4, '255,120,180', 1]];
      Object.keys(PAIRS).forEach(id => { if (!w().pairs.includes(id)) l.push([PAIRS[id][0] + 0.5, PAIRS[id][1] + 0.4, 1.3, '255,233,160', 1]); });
      return l;
    };
    const def = {
      map, solid: solidNow(), doors: { L: 'lift' }, ground: false, bg: '#141226', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => { if (WX) WX.at(ctx, t, vw, vh, cx, cy, ts, sc.P && sc.P.px, sc.P && sc.P.py); A.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), WX && weather); if (LW.seen()) SD.lens.wash(ctx, vw, vh, t); },
      ambience: () => 'crickets',
      under(ctx, ts, t, x0, x1, y0, y1) {
        const ph = phase();
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y);
          const base = 'T#X'.includes(c) ? (y <= 7 && x >= 13 && x <= 30 ? 'p' : 'g') : c === 'L' ? 'p' : c;
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => groundCh(map, x + dx, y + dy), ph);
        }
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) if (map[y][x] === 'T') A.wall(ctx, x, y, ts, t);
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) A.prop(ctx, p, ts, t); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        return a ? beside(a.id) : null;
      },
      overlay(ctx, t, vw, vh) { drawOverlay(ctx, t, vw, vh); }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    const pos = w().pos || [21, 9];
    const P = sc.player(pos[0], pos[1], 'south');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving);
    others().forEach((id, i) => { person(id, id, pos[0], pos[1] + 1 + i, 'south', { solid: false, talk: false }); });
    // Things.
    thing('tower', 21, 4, 'The tower lift'); thing('post', 3, 9, 'The post office'); thing('bell', 8, 9, 'Marrow\'s bell'); thing('bunker', 3, 15, 'Seymour\'s bunker');
    thing('bru', 12, 14, 'Bru\'s board'); thing('cafe', 3, 24, 'The Cache Café'); thing('market', 7, 24, 'Kai\'s market stall'); thing('library', 32, 9, 'Lexi\'s library');
    thing('records', 32, 15, 'Theo\'s records office'); thing('school', 38, 15, 'Seo-yeon\'s school'); thing('forge', 32, 24, 'Ayo\'s forge'); thing('relay', 38, 24, 'The relay station');
    thing('shop', 26, 26, 'Aigerim\'s cards'); thing('dboard', 29, 18, 'The Design Board'); thing('fire', 21, 17, 'The camp fire'); thing('basket', 19, 16, 'The gift basket');
    thing('prayers', 24, 16, 'The prayers'); thing('kstall', 39, 28, 'Kagemaru\'s stall');
    // People: the whole game's cast.
    person('uptima', 'uptima', 23, 17, 'west', { name: 'Uptima' });
    person('wren', 'wren', 20, 18, 'east', { name: 'Elder Wren' });
    person('pip', 'pip', 5, 10, 'south', { name: 'Pip' }); person('coo', 'coo', 2, 10, 'east', { name: 'Coo' });
    person('marrow', 'marrow', 10, 10, 'south', { name: 'Goodwife Marrow' });
    person('seymour', 'seymour', 5, 16, 'west', { name: 'Sir Seymour Backups' });
    person('bruP', 'bru', 14, 15, 'west', { name: 'Bru' });
    person('wen', 'wen', 4, 25, 'south', { name: 'Grandma Wen' });
    person('lexi', 'lexi', 34, 10, 'south', { name: 'Lexi' });
    person('theo', 'theo', 30, 16, 'east', { name: 'Theo' });
    person('ayo', 'ayo', 34, 25, 'west', { name: 'Ayo' });
    person('mio', 'mio', 37, 26, 'north', { name: 'Mio' });
    person('cron', 'cron', 15, 24, 'south', { name: 'Cron' });
    person('aigerim', 'aigerim', 28, 26, 'west', { name: 'Aigerim' });
    person('noor', 'noor', 18, 19, 'north', { name: 'Noor' });
    person('ryu', 'ryu', 25, 14, 'south', { name: 'Ryu' });
    person('pella', 'pella', 35, 11, 'west', { name: 'Pella' });
    person('ok', 'ok', 27, 13, 'west', { name: 'Madam Ok' });
    person('ashgrove', 'ashgrove', 24, 18, 'north', { name: 'Lord Ashgrove' });
    person('cat', 'cat', 20, 20, 'east', { name: 'The marsh cat', speed: 2 });
    person('kage', 'kagemaru', 41, 28, 'west', { name: 'Kagemaru' });
    person('kyu', 'kyu', 22, 19, 'north', { name: 'Kyu' });
    Object.keys(PAIRS).forEach(id => sc.addActor('pair' + id, { x: PAIRS[id][0], y: PAIRS[id][1], thing: true, solid: false, draw: () => {} }));
    LW.add();
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  function applyState() {
    const A2 = sc.actors, ch = choice6();
    PROP.basket.gifts = w().gifts.length;
    PROP.tower.open = flag('lift');
    // Kagemaru: a stall at camp (least privilege), a nice new tent (the run of the camp), or nowhere (the vault).
    PROP.kstall.hidden = ch !== 'least'; PROP.ktent.hidden = ch !== 'run';
    A2.kstall.hidden = ch !== 'least';
    A2.kage.hidden = ch === 'vault';
    A2.kyu.hidden = !flag('won');
    Object.keys(PAIRS).forEach(id => { PROP['pair' + id].hidden = A2['pair' + id].hidden = w().pairs.includes(id); });
    LW.apply();
    refresh();
  }
  // The "!" over whoever or whatever has something for you.
  function refresh() {
    if (!sc) return;
    const A2 = sc.actors, tg = step()[2];
    Object.values(A2).forEach(a => { if (a.id !== 'ctl' && a.id !== 'you') a.marker = a.id === tg; });
    ['tower', 'bru', 'dboard', 'library', 'basket', 'kstall', 'fire'].forEach(id => { if (A2[id]) A2[id].name = A2[id].marker || ['library', 'kstall'].includes(id) ? A2[id].label : null; });
    hud();
  }

  // ---------- Every frame ----------
  function tick(dt) {
    LW.tick(dt);
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { w().pos = [P.x, P.y]; S.persist(); }
      if (!zoneShown) { zoneShown = true; banner(flag('won') ? 'The camp · the morning after' : 'The camp · the night before'); }
    }
    others().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!to || a.scripted || a.moving || a.path.length) return;
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    if (busy || P.moving || P.path.length) return;
    if (!flag('arrive')) return act(arrive);
    if (flag('won') && !flag('fireside')) return act(fireside);
    Object.keys(PAIRS).forEach(id => { if (!w().pairs.includes(id) && P.x === PAIRS[id][0] && P.y === PAIRS[id][1]) act(() => pair(id)); });
  }
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function drawOverlay(ctx, t, vw, vh) {
    if (!sc) return;
    const { cx, cy } = sc.cam(), ts = Math.max(vw / 15, vh / 13) >= 44 ? 48 : 32, tg = step()[1];
    if (!tg || busy) return;
    const X = (tg[0] + 0.5) * ts - cx, Y = (tg[1] + 0.5) * ts - cy, m = 28;
    if (X >= m && X <= vw - m && Y >= m && Y <= vh - m) return;
    const ax = vw / 2, ay = vh / 2, dx = X - ax, dy = Y - ay, k = Math.min((vw / 2 - m) / Math.abs(dx || 1), (vh / 2 - m) / Math.abs(dy || 1));
    const px = ax + dx * k, py = ay + dy * k, a = Math.atan2(dy, dx), pulse = 1 + 0.12 * Math.sin(t * 5);
    ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  async function act(fn) {
    if (busy) return;
    busy = true; sc.locked = true; sc.pause();
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; w().pos = [sc.P.x, sc.P.y]; if (W.active) applyState(); } S.persist(); }
  }
  const open = (x, y) => !solidNow().includes(sc.tile(x, y));
  function beside(id) {
    const a = sc.actors[id];
    for (const [dx, dy] of [[0, 1], [1, 0], [-1, 0], [0, -1], [1, 1], [-1, 1]]) {
      const x = a.x + dx, y = a.y + dy;
      if (open(x, y) && sc.tile(x, y) !== 'L' && !Object.values(sc.actors).some(o => o !== a && !o.hidden && !o.player && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }
  const goTo = (x, y) => { sc.place('you', x, y); others().forEach(id => sc.place(id, x, y)); trail.length = 0; lastTile = ''; };
  // A card the camp taught: it joins your deck for the climb.
  function addCard(id, why) {
    if (!SD.cards[id] || w().cards.includes(id)) return;
    w().cards.push(id); S.persist();
    AU.sfx('sparkle');
    return U.system(why || 'NEW CARD', `${SD.cards[id].name} joins your deck for the climb.`, 'gold');
  }
  const ask = (q, title) => SD.quiz.ask(q, { title: title || 'A QUESTION' });

  // ---------- The night before ----------
  // A cutscene rather than world dialogue, so the painted stills (js/cut-ch7a.js) show behind it.
  cut.def('arrive', 'The night before', () => vn([['bg', 'c7-camp'],
    ['narr', 'The Free Cloud\'s camp, at the foot of the tower, the night before the last climb. Everyone is here. Every band you freed came down, and stayed.'],
    ['narr', 'Pip is at the post office desk. Bru has a board out. Wen\'s café is open late, Lexi\'s library later. Seymour\'s bunker door is open, for once. Uptima sits at the fire with the prayers.'],
    ['lead', { mira: 'All of them, love. All at once.', kai: 'Everyone. Even Seymour came out.', seoyeon: '...Everyone.', dutch: 'Every band. In one place. Count them.' }],
    [others()[0], 'The basket\'s by the fire. Every band\'s putting something in it.', 'neutral']]), { music: 'c7camp', note: 'Arriving at the camp, the night before the climb.' });
  async function arrive() {
    await cut.play('arrive');
    mus('c7camp');
    setFlag('arrive');
  }
  // The gift basket. Whoever gives each band's gift; the basket itself, by the fire.
  const GIVE = {
    thornwick: ['pip', 'One of Thornwick\'s letters. It got delivered, and somebody read it. Somebody answered it, too. Put it in the basket?', 'happy'],
    halcyon: ['wen', 'A loaf from Halcyon\'s market. Sliced, dear. Everyone gets a piece. That\'s the point of it.', 'smile'],
    sealed: ['ok', 'A seal from the Sealed Floors. Open it. There is nothing under it. There never was.', 'neutral'],
    arcanum: ['pella', 'A lantern from the Arcanum. We put the flame out ourselves. On purpose. It felt strange.', 'earnest'],
    twinwater: ['mio', 'A stone from the lake. It only has one side now. Listen. It\'s quiet.', 'smile']
  };
  async function gift(band) {
    const g = GIFTS.find(x => x[0] === band), [sp, line, face] = GIVE[band];
    if (hasGift(band)) return false;
    await say([[sp, line, face]]);
    w().gifts.push(band); S.persist(); AU.sfx('x-chime');
    if (g[1] !== 'r6-stone' || !(S.save.c6 && S.save.c6.w && (S.save.c6.w.cards || []).includes('r6-stone'))) await addCard(g[1], 'FOR THE BASKET');
    else if (!w().cards.includes('r6-stone')) { w().cards.push('r6-stone'); S.persist(); }
    if (w().gifts.length === giftsDue().length) await say([[null, `The basket is full: ${w().gifts.length === 5 ? 'a letter, a loaf, a seal, a lantern and a stone' : w().gifts.length + ' gifts'}. Each band put something in it. You\'ll carry it up and give it back to her.`]]);
    return true;
  }
  async function basket() {
    const due = giftsDue().filter(g => !hasGift(g[0]));
    if (due.length) return say([[null, `The gift basket, by the fire. ${w().gifts.length} in it so far.`], ['lead', `${SD.cast[due[0][2]].name} has something for it.`]]);
    return say([[null, 'The gift basket, full. A letter that was delivered, a loaf that was shared out, a seal with nothing under it, a lantern with no flame, a stone with one side.'.split(', ').slice(0, Math.max(1, w().gifts.length)).join(', ') + '.']]);
  }

  // Bru's board, and Elder Wren's question.
  async function bruBoard() {
    if (flag('book')) return review('book');
    await say([['bru', 'Before you go up: the whole book, at once. Every page you\'ve read since the temple. Six of the camp\'s own requests.', 'smile']]);
    const r = await G.sort(G.DEF.book);
    setFlag('book'); R.gainXp(r.first === r.of ? 30 : 15);
    await ask({ c: 'sesspol', type: 'mc', q: 'Bru underlines one more line: "A role\'s session can never do more than what?"',
      opts: ['What both the role\'s identity policies and its session policy allow', 'What the session policy allows, whatever the role\'s own policies say', 'What the role\'s policies allow, whatever the session policy says', 'Whatever the account\'s root user is allowed to do'], a: 0, no: [null, 'A session policy can\'t grant anything the role\'s own policies don\'t. It only narrows them.', 'The session policy narrows the session too, so the role\'s own policies alone aren\'t the limit.', 'Root isn\'t part of it: a session is bounded by the role\'s policies and its session policy.'],
      why: 'A session policy passed with AssumeRole limits the session to the overlap between it and the role\'s identity-based policies. It never adds permissions.',
      eli5: 'The role says what you may do; the note you bring along can only cross things off that list, never add to it.' }, 'BRU\'S BOARD');
    await addCard(G.DEF.book.card);
  }
  async function wren() {
    if (flag('whose')) return say([['wren', rnd(['Sit a moment. The tower isn\'t going anywhere. That\'s rather the problem with it.', 'She reads them all, you know. Every one. She never used to.', 'Ask everyone. You remembered that. Good.']), 'neutral']]);
    const r = await G.sort(G.DEF.whose);
    setFlag('whose'); R.gainXp(r.first === r.of ? 30 : 15);
    await addCard(G.DEF.whose.card);
  }
  async function uptima() {
    if (flag('won')) return say([['uptima', rnd(['Forty-one new prayers in the bucket tonight. Ordinary ones. I\'m reading them in order.', 'Nobody holds root now. Not even me. Especially not me.']), 'warm']]);
    const need = !giftsDue().every(g => hasGift(g[0])) ? 'The basket first. Every band has something for it.' : !flag('book') ? 'Bru has a board out. Read it with him first.' : !flag('whose') ? 'Elder Wren has a question for you first.' : null;
    if (need) return say([['uptima', flag('upt1') ? need : 'You came back. All four of you. Sit. ' + need, 'neutral']]);
    if (!flag('uptima')) {
      await say([['uptima', 'The prayers, all of them. I read them now, every night, in the order they came.', 'sad'],
        ['uptima', 'Up there is my temple, rebuilt on top of the tower. Root is in it, and Freya is on my throne. Nothing written in the Cloud can touch root. Remember that when you\'re up there.', 'earnest'],
        ['uptima', 'The lift still runs as one of her roles. Make it safe before you get in it.', 'neutral'],
        ['lead', { mira: 'We will, love.', kai: 'On it.', seoyeon: 'We will.', dutch: 'Understood.' }]]);
      return setFlag('uptima');
    }
    return say([['uptima', flag('lift') ? 'Go up. Come back down.' : 'The lift. Make it safe first.', 'neutral']]);
  }
  // The five arc finales, each where its pair is sitting up late. They play in any order you walk into them.
  const PAIRQ = {
    temp: { c: 'roles', type: 'mc', q: 'An application assumes an IAM role. What does it get back from AWS STS, and what happens when the session ends?',
      opts: ['Temporary keys and a session token that expire; then the caller asks STS for new ones', 'A permanent access key for the role, which IAM rotates for you every 90 days', 'A password for the role, which keeps working until somebody changes it', 'A session token on its own, which keeps working until the role is deleted'], a: 0, no: [null, 'Roles never get long-term access keys. Those belong to IAM users.', 'Roles have no password. Only IAM users and the root user sign in with one.', 'STS returns a key ID and secret key with the token, and all three expire, whatever happens to the role.'],
      why: 'AssumeRole returns temporary security credentials: an access key ID, a secret access key and a session token, with an expiration. Once they expire they\'re refused, and the caller assumes the role again (the SDKs refresh them for you).',
      eli5: 'You get a visitor\'s pass with today\'s date on it. At dawn it stops opening doors, and you ask for a new one.' },
    redrive: { c: 'dlqredrive', type: 'mc', q: 'In Amazon SQS, what moves a message to a dead-letter queue, and how do you send it back to the source queue?',
      opts: ['It passes maxReceiveCount without being deleted; a DLQ redrive moves it back', 'It waits in the queue for over an hour; SQS moves it back by itself a day later', 'Its consumer calls DeleteMessage on it; you send it again with SendMessage', 'It is larger than 1 MiB, and messages in a DLQ can never be moved back'], a: 0, no: [null, 'Time waiting doesn\'t send a message to a DLQ. The retention period deletes it, and nothing moves it back by itself.', 'DeleteMessage removes a message for good. A DLQ only gets messages that kept failing.', 'A message over 1 MiB is refused when it\'s sent, and messages in a DLQ can be redriven.'],
      why: 'Each failed receive raises a message\'s receive count. Past the source queue\'s maxReceiveCount, SQS moves it to the dead-letter queue. Once the cause is fixed, a DLQ redrive (from the console or StartMessageMoveTask) moves the messages back to the source queue.',
      eli5: 'A letter that bounces too many times goes to the "couldn\'t deliver" box. Open the box, fix the address, and post them all again.' },
    key: { c: 'kmskeys', type: 'mc', q: 'What can you do with a customer managed KMS key\'s key policy that you can\'t do with an AWS managed key\'s?',
      opts: ['Write it yourself, and decide who may use and manage the key', 'Nothing: both kinds of key come with the same fixed policy from AWS', 'Leave it empty, so the key works without any key policy at all', 'Edit an AWS managed key\'s policy to share it with another account'], a: 0, no: [null, 'Only AWS managed keys have a fixed policy. A customer managed key\'s policy is yours to write.', 'Every KMS key has exactly one key policy. Without one, nobody could use the key.', 'An AWS managed key\'s policy can\'t be edited, so it can\'t be shared with another account that way.'],
      why: 'An AWS managed key\'s key policy is set by the AWS service that created it and can\'t be changed. With a customer managed key you own the key policy and decide which principals may use and manage it, and you control its rotation and deletion too.',
      eli5: 'Someone else\'s lock comes with their list of who gets keys, and you can\'t edit it. Your own lock, you write the list.' },
    idem: { c: 'lambdasqs', type: 'mc', q: 'An SQS standard queue triggers a Lambda function. Why can the function get the same message more than once, and what should its code do about it?',
      opts: ['Delivery is at least once and failed batches return; make the handler idempotent', 'It can\'t: SQS standard queues always deliver each message exactly once', 'Only when the function\'s memory is too small; give the function more memory', 'Lambda retries each message three times; delete the message as the first step'], a: 0, no: [null, 'Standard queues deliver at least once. Only FIFO queues drop duplicates, within a five-minute window.', 'Memory changes speed and timeouts, not whether a message comes back.', 'Deleting first loses the message if the function then fails. Lambda deletes a batch\'s messages only after it succeeds.'],
      why: 'Standard queues offer at-least-once delivery, and a message whose batch fails or times out becomes visible again for another try. A handler that checks whether it already did the work (for example, a conditional write keyed on the message ID) can safely see the same message twice.',
      eli5: 'Sometimes the same order slip arrives twice. A good cook checks the ticket number before making a second stew.' },
    on: { c: 'datatrail', type: 'mc', q: 'Which CloudTrail events are recorded by default, and what do you have to turn on to record who read an object in an S3 bucket?',
      opts: ['Management events, by default; object reads are data events you must turn on', 'Every event, object reads included, is recorded by default for 90 days', 'Nothing at all is recorded until you create a trail in the account', 'Object reads are management events, so there is nothing to turn on'], a: 0, no: [null, 'Object reads are data events, and those stay off until you turn them on.', 'Event history keeps 90 days of management events with no trail at all.', 'GetObject is a data event, not a management event, so it has to be turned on.'],
      why: 'CloudTrail event history shows 90 days of management events with no setup. Data events, such as s3:GetObject, are high-volume and off by default: you choose them on a trail or a CloudTrail Lake event data store.',
      eli5: 'The building notes who changes the locks, all by itself. To note who reads each page in a room, someone has to switch that on first.' }
  };
  cut.def('pair-temp', 'Temporary Credentials', () => vn([['bg', 'c4-dawn'],
    ['narr', 'The night before the finale, at dawn. For once Kai is up first. He kicks her bedroll.'],
    ['show', 'kai', 'neutral', 'left'], ['show', 'seoyeon', 'tired', 'right'],
    ['kai', 'Up, kid. Forms.', 'neutral'],
    ['narr', 'She nearly breaks.'],
    ['seoyeon', 'You\'re not him.', 'sad'],
    ['kai', 'And you\'re not her. We just assumed the roles for a while.', 'warm'],
    ['seoyeon', 'Temporary credentials.', 'neutral'],
    ['kai', 'They expire?', 'smirk'],
    ['seoyeon', 'At dawn.', 'neutral'],
    ...inner({ kai: '(Hana would have had me up an hour ago. Somebody should.)', seoyeon: '(Jin never once got up first. That\'s how I know.)' }),
    ['kai', 'Get up. Forms.', 'neutral']]), { music: 'c7sad', note: 'Arc 1\'s finale: Kai and Seo-yeon, at dawn.' });
  cut.def('pair-redrive', 'Redrive', () => vn([['bg', 'c2-office'],
    ['narr', 'Mira is sorting the last of the letters. Dutch sits down beside her on the wrong chair.'],
    ['show', 'mira', 'neutral', 'left'], ['show', 'dutch', 'tired', 'right'],
    ['dutch', 'The Crown had a box for letters that couldn\'t be delivered. Nobody ever opened it.', 'tired'],
    ['mira', 'That\'s a dead-letter queue, love. You\'re meant to open it, find out why each one failed, and send it again.', 'warm'],
    ['dutch', 'Even mine?', 'sad'],
    ...inner({ mira: '(The men on the stair are in that box too. I\'ll open it.)', dutch: '(Twenty-five years of boxes. Some of them I was paid to keep shut.)' }),
    ['mira', 'Especially yours.', 'warm']]), { music: 'c7sad', note: 'Arc 2\'s finale: Mira and Dutch, and the letters.' });
  cut.def('pair-key', 'My Own Key', () => vn([['bg', 'c7-camp'],
    ['narr', 'Seo-yeon sits down in front of Mira with the ribbon in her hand.'],
    ['show', 'seoyeon', 'neutral', 'left'], ['show', 'mira', 'neutral', 'right'],
    ['seoyeon', 'I\'m not shopping.', 'neutral'],
    ['mira', 'I know, love.', 'warm'],
    ['seoyeon', 'I\'m choosing.', 'neutral'],
    ['narr', 'Mira reties it, narrating every knot, and by the end neither of them can see properly.'],
    ['seoyeon', 'With an AWS managed key, someone else writes the key policy and you can\'t change it. With a customer managed key, you write it yourself.', 'neutral'],
    ['mira', 'And who\'s on yours?', 'warm'],
    ['seoyeon', 'You are. Don\'t make it a thing.', 'warm'],
    ...inner({ seoyeon: '(Three households, and this is the first one I picked.)', mira: '(I don\'t get to keep her. I get to be on her list. That\'s better.)' }),
    ['narr', 'Mira makes it a thing.']]), { music: 'c7sad', note: 'Arc 4\'s finale: Seo-yeon and Mira, and the ribbon.' });
  cut.def('pair-idem', 'Idempotent', () => vn([['bg', 'c3-kitchen'],
    ['narr', 'Kai has made Bram\'s stew again without being asked.'],
    ['show', 'mira', 'neutral', 'left'], ['show', 'kai', 'neutral', 'right'],
    ['mira', 'Twice. He\'d be insulted.', 'warm'],
    ['narr', 'Kai takes the glove off and, for the first time, asks instead of offering.'],
    ['kai', 'Do you want me to take it off you?', 'earnest'],
    ['mira', 'No.', 'neutral'],
    ['kai', 'Same as last time.', 'neutral'],
    ['mira', 'Same answer however many times you ask, love.', 'warm'],
    ['kai', 'So it\'s idempotent.', 'smirk'],
    ['mira', 'Like a good queue consumer. It gets the same message twice and does the thing once.', 'warm'],
    ['narr', 'Then she takes his bare hand and puts it on the beast arm on purpose.'],
    ['mira', 'What does it feel like now?', 'neutral'],
    ...inner({ kai: '(I asked her. I didn\'t offer this time. I asked.)', mira: '(Same answer, Bram. It\'s mine. I\'m keeping it.)' }),
    ['kai', 'You. Just you.', 'warm']]), { music: 'c7sad', note: 'Arc 5\'s finale: Kai and Mira, and the stew.' });
  cut.def('pair-on', 'Turned On', () => vn([['bg', 'c7-camp'],
    ['narr', 'Seo-yeon finds Dutch writing in the back of the diary, in the cipher: the tower, the button, everything since, one entry a day.'],
    ['show', 'seoyeon', 'neutral', 'left'], ['show', 'dutch', 'neutral', 'right'],
    ['seoyeon', 'You\'re keeping a log.', 'neutral'],
    ['dutch', 'Lina turned a ward on a week before she needed it. If she hadn\'t, there\'d be no record of anything.', 'tired'],
    ['seoyeon', 'Like CloudTrail data events. They\'re off until someone turns them on, and you only find out you needed them afterwards.', 'neutral'],
    ['dutch', 'The wards logged who changed the rooms. Not who read the pages in them.', 'neutral'],
    ['narr', 'He hands her the pencil.'],
    ['dutch', 'Learn the cipher.', 'neutral'],
    ['seoyeon', 'Why?', 'neutral'],
    ['dutch', 'So someone can read mine.', 'warm'],
    ...inner({ seoyeon: '(He means after. He means me.)', dutch: '(Lina would have learned it in a night. This one can take two.)' }),
    ['narr', 'She taps three, one, four on the table.'],
    ['narr', 'He taps it back first.']]), { music: 'c7sad', note: 'Arc 6\'s finale: Dutch and Seo-yeon, and the diary.' });
  async function pair(id) {
    if (w().pairs.includes(id)) return;
    await cut.play('pair-' + id);
    mus('c7camp');
    w().pairs.push(id); S.persist();
    R.gainXp(20);
    // The review question is the default, and still optional, as the relationships tab has it.
    const go = await new Promise(res => {
      const b = U.panel(`<p>${esc(PAIRS[id][3])}: one review question on it, while it's fresh.</p><div class="row"><button class="primary" id="c7-q">Ask me</button><button class="ghost" id="c7-nq">Not tonight</button></div>`, { title: 'THE NIGHT BEFORE', noClose: true });
      b.querySelector('#c7-q').focus();
      b.querySelector('#c7-q').onclick = () => { U.closePanel(); res(true); };
      b.querySelector('#c7-nq').onclick = () => { U.closePanel(); res(false); };
    });
    if (go) { const r = await ask(PAIRQ[id], 'THE NIGHT BEFORE · ' + PAIRS[id][3].toUpperCase()); R.gainXp(r && r.ok ? 15 : 5); }
    if (w().pairs.length === 5) { await U.system('THE NIGHT BEFORE', 'All five, sitting up late. +40 XP.', 'gold'); R.gainXp(40); SD.tapes.award('c7nightbefore', 1, 'In the bottom of the diary\'s box: a tape, labelled in Seymour\'s hand. "For the morning."'); }
  }

  // The camp review lessons: everyone's, at once. Questions on what you're weakest at, from every band.
  async function review(kind) {
    const seen = Object.keys(SD.concepts).filter(c => S.concept(c).seen);
    const pool = w().miss.filter(c => seen.includes(c)).concat(S.pickConcepts(kind === 'lexi' ? 5 : 3, seen.length ? seen : ['revoke']));
    let cs = [...new Set(pool)].slice(0, kind === 'lexi' ? 5 : 3);
    // Lexi's review is everything, so it always has one on deployment (chapter 5's concepts), the one domain the
    // finale's own questions don't cover.
    const DEPLOY = ['shifting', 'deploycfg', 'stages', 'cicd'];
    if (kind === 'lexi' && !cs.some(c => DEPLOY.includes(c))) { const d = SD.quiz.shuffle(DEPLOY).find(c => SD.concepts[c] && D.pickQ(c)); if (d) cs = cs.slice(0, 4).concat(d); }
    const [sp, line, title] = { book: ['bru', 'Again? Three from the book. Read every page.', 'BRU\'S BOARD'], lexi: ['lexi', 'Five, from everything, and the ones you missed first. Pencils.', 'LEXI\'S LIBRARY'],
      fire: ['uptima', 'Three, from the prayers. What you got wrong, first.', 'THE FIRE'] }[kind];
    await say([[sp, line, 'smile']]);
    let right = 0;
    for (const c of cs) {
      const q = D.pickQ(c); if (!q) continue;
      const r = await SD.quiz.ask(q, { title });
      if (r && r.ok) right++;
    }
    R.gainXp(10 + right * 5);
  }

  // Everyone else at camp: a line each, and a different one once it's over.
  const CHAT = {
    pip: [['Mail\'s all sorted! Every letter answered. Every single one. I counted twice.', 'happy'], ['I wrote to Freya once. She answered. That was the problem, wasn\'t it?', 'sad']],
    coo: [['Coo. (He straightens his cap and looks at the tower.)', 'neutral']],
    marrow: [['The bell\'s quiet tonight. Mio\'s alarm only rings when it means it. I miss it, a bit.', 'neutral']],
    seymour: [['Door\'s open. Don\'t make a thing of it. Tapes are labelled, tested, and stacked by date.', 'neutral'], ['Restore to a test account first. Always. I\'ll be saying that at your funerals.', 'neutral']],
    lexi: [['The library\'s open all night. Sit a mock, if you can\'t sleep.', 'smile']],
    theo: [['Records office. Every change on every floor, logged. Ask me what happened on any day you like.', 'earnest']],
    ayo: [['Forge is hot! Bring me anything that\'s bent. Ha!', 'laugh']],
    mio: [['The camp sounds honest tonight. Even the tower. Except the top. The top is humming to itself.', 'earnest']],
    cron: [['Planted on time. Harvest on time. That\'s all a schedule is for, in the end.', 'neutral']],
    aigerim: [['I wrote tonight in the diary already. Twice. On both shores.', 'smile']],
    noor: [['I came here through a template. Nobody asked me. Tomorrow, maybe, someone will.', 'neutral']],
    ryu: [['Gate Passes, Burning Peak, now this. You lot don\'t take easy roads, do you.', 'warm']],
    pella: [['I brought a book for the climb. I know I\'m not climbing. I brought it anyway.', 'earnest']],
    ok: [['Madam Ok has seen a great many people go up towers. You four, I would like to see come down.', 'neutral']],
    ashgrove: [['Kai. The stew. More.', 'stone'], ['Caspian would have climbed it with you. I know that now.', 'sad']],
    kage: [['Tapes! Tested, labelled, priced. Everything must go, my friends. Even the top.', 'amused']],
    cat: [['The marsh cat looks at you, then at the stew pot, then at you. Four names are said at once. It ignores all of them.', null]]
  };
  // Seymour, the morning after: the question on Kyu's restore, away from her moment on the roof.
  async function restoreQ() {
    await say([['seymour', 'Kyu\'s restore. I did it the boring way, and I\'d do it again. One question, then I\'ll let you be.', 'neutral']]);
    const r = await ask({ c: 'awsbackup', type: 'mc', q: 'Seymour copied Kyu\'s backup into a separate test account and restored it there before the real one. What does that prove that a backup job marked "Completed" can\'t?',
      opts: ['That the copy actually restores, and works, without touching production', 'That the backup is encrypted with the key the vault requires', 'That the backup job ran on its schedule and finished in its window', 'Nothing more: a job marked Completed is already proof enough'], a: 0, no: [null, 'That\'s a setting of the vault and the backup plan. It doesn\'t show the copy can be restored and used.', 'The job\'s status already shows that. Only a restore shows the copy works.', 'Completed means a copy was written, not that it restores cleanly.'],
      why: 'A completed backup only says a copy was written. Restoring it, somewhere it can\'t harm the real thing, and checking the result is the only proof it can be used. AWS Backup can run restore tests on a schedule for you.',
      eli5: 'A spare key in a drawer is only a spare key once you\'ve tried it in the lock.' }, 'SEYMOUR');
    setFlag('restoreq'); R.gainXp(r && r.ok ? 20 : 5);
  }
  async function chat(id) {
    if (id === 'kage') { await say([['kagemaru', CHAT.kage[0][0], 'amused']]); return SD.tapes.shop(); }
    if (id === 'lexi' && flag('arrive')) {
      await say([['lexi', CHAT.lexi[0][0], 'smile']]);
      return review('lexi');
    }
    const l = CHAT[id] || [['...', null]], line = flag('won') && l[1] ? l[1] : l[0];
    if (id === 'seymour' && flag('won') && !flag('restoreq')) return restoreQ();
    if (id === 'cat') return say([[null, line[0]]]);
    return say([[id === 'bruP' ? 'bru' : id, line[0], line[1]]]);
  }

  // ---------- The climb ----------
  async function lift() {
    if (flag('won')) return say([[null, 'The tower lift, stopped at the bottom. Nobody needs it tonight.']]);
    if (!flag('uptima')) return say([[null, 'The lift to floor 100. Its controller hums.'], ['lead', 'Uptima first. She\'s at the fire.', 'neutral']]);
    if (!flag('lift')) {
      const r = await G.door(G.DEF.lift);
      setFlag('lift'); R.gainXp(r.first === true || r.mistakes === 0 ? 30 : 15);
      await addCard(G.DEF.lift.card);
    }
    const x = SD.expeditions.find(e => e.id === 'r7root'), left = blessings(), from = w().from | 0;
    const go = await new Promise(res => {
      const b = U.panel(`<p>${esc(x.blurb)}</p><p class="muted small">${from ? `You'll start again from floor ${from + 1}, ${esc(D.FLOORS[Math.min(from, 4)].name)}. ` : ''}Freya wears ${left.length ? left.length + ' blessing' + (left.length > 1 ? 's' : '') + ': ' + esc(left.map(b2 => b2[2]).join(', ')) : 'none of her blessings'}. ${freed().length} of 5 bands have taken their grants back.</p>${SD.tapes.door(7)}
        <div class="row"><button class="primary" id="c7-go">Go up</button><button class="ghost" id="c7-not">Not yet</button></div>`, { title: 'ROOT · FLOOR 100', noClose: true });
      b.querySelector('#c7-not').onclick = () => { U.closePanel(); res(false); };
      SD.tapes.wire(b, () => { U.closePanel(); res(false); });
      b.querySelector('#c7-go').onclick = () => { U.closePanel(); res(true); };
    });
    if (!go) { goTo(21, 7); return; }
    w().pos = [21, 7]; S.persist();
    return expedition();
  }
  // The expedition, rebuilt from the save before each climb: Freya's phases are the blessings still on her, the floors
  // ease for every freed band, the backup floor is there only if Kagemaru had the run of the camp, and a loss
  // starts again from the floor it stopped on.
  function build() {
    const x = SD.expeditions.find(e => e.id === 'r7root'), left = blessings();
    const top = Object.assign({}, D.FLOORS[4], { plan: D.topPlan(left.length), elites: left.map(b => b[1]) });
    const all = D.FLOORS.slice(0, 4).concat([top], choice6() === 'run' ? [D.BACKUP] : []);
    const from = Math.min(w().from | 0, all.length - 1);
    x.floors = all.slice(from);
    x.sev = 0.98 + 0.03 * (5 - freed().length);
    return x;
  }
  const deckFor = (champ, bot) => {
    const base = !bot && Array.isArray(c1().deck) && c1().deck.length ? c1().deck.map(c => c.id) : (SD.starterDeck || []).slice();
    let d = SD.champions.deck(champ, base);
    // What the camp taught is in your own deck, with the basket's gifts; the bots bring the common lessons too.
    d = d.concat(bot ? w().cards.filter(id => SD.cards[id] && !SD.cards[id].quest).slice(-4) : w().cards);
    return d.filter(id => SD.cards[id]);
  };
  const onMiss = q => { if (q && q.c) { w().miss = [q.c].concat(w().miss.filter(c => c !== q.c)).slice(0, 12); S.persist(); } };
  let opts = null, onFloor = null;
  // The floors' lines, in the party's voices. A { who: 'c7' } line is a cue for one of this chapter's own scenes.
  async function raidSay(list) {
    let out = [];
    const flush = async () => { if (out.length) { const o = out; out = []; await U.dialog(o); } };
    for (const l of list || []) {
      if (!l) continue;
      if (l.who === 'c7') { await flush(); if (CUES[l.text]) await CUES[l.text](); continue; }
      const t = pick(l.text); if (!t) continue;
      const s = l.who === 'lead' ? lead() : l.who === 'mate1' ? others()[0] : l.who === 'mate2' ? others()[1] : l.who;
      out.push({ s: s && SD.cast[s] ? s : 'narr', t, e: l.e });
    }
    await flush();
  }
  function raidMusic(root) {
    let last = null;
    const beat = () => {
      const boss = root.querySelector('.bossfight'), name = boss ? (root.querySelector('.foe-name') || {}).textContent || '' : '';
      const k = boss ? (/Freya/.test(name) ? 'c7freya' : 'c7boss') : 'c7climb';
      if (k !== last) { last = k; mus(k); }
    };
    beat();
    const iv = setInterval(beat, 800);
    return () => clearInterval(iv);
  }
  async function expedition() {
    W.halt();
    W.set = 'root';
    U.closePanel(); U.stage(null);
    build();
    SD.main.show('run');
    const root = $('#run');
    if (SD.champions.setMine) SD.champions.setMine(lead());
    A.raidArt(true);
    const stop = raidMusic(root);
    let res = { won: false, fl: 0 };
    const start = w().from | 0;
    try {
      const hub = await SD.net.open();
      opts = Object.assign({ story: true, label: 'Root', xp: 'r7root', champNames: true, create: true, auto: { bots: others() },
        deckFor, pickQ: D.reviewQ, say: raidSay, onMiss, onEnd: r => { res = r || res; } }, SD.tapes.forRaid(7));
      await SD.raid.play(root, hub, SD.net.code('c7'), opts);
    } catch (e) { console.warn('Root:', e); }
    finally { stop(); A.raidArt(false); W.set = null; opts = null; }
    if (!res.won) { w().from = start + (res.fl | 0); S.persist(); }
    return after(res.won);
  }
  async function after(won) {
    if (W.debug.onAfter && W.debug.onAfter(won)) return;
    const run = fn => (busy ? fn() : act(fn));
    if (!won) {
      w().pos = [21, 15]; S.persist();
      sc = null; W.enter();
      const fl = D.FLOORS[Math.min(w().from | 0, 4)];
      return run(async () => { await cut.play('wake', fl ? fl.name : 'where it stopped'); mus('c7camp'); });
    }
    setFlag('won'); w().from = 0;
    R.gainXp(150);
    w().pos = [21, 15]; S.persist();
    sc = null; W.enter();
  }

  cut.def('wake', 'Bruised', (from = 'the first floor') => vn([['bg', 'c7-fire'],
    ['narr', `The party wakes by the camp fire, bruised. The climb will start again from ${from}.`],
    ['show', 'uptima', 'sad', 'right'], ['uptima', 'Sit. Eat. Then again.', 'sad'],
    ['show', 'lead', 'tired', 'left'], ['lead', { mira: 'Tea first, loves. Then again.', kai: 'Food. Then again.', seoyeon: 'Again.', dutch: 'Again. Slower.' }, 'tired']]), { music: 'c7sad', note: 'After a loss on the climb.' });

  // ---------- The roof ----------
  cut.def('climb', 'The lift to floor 100', () => vn([['bg', 'c7-camp'],
    ['narr', 'The lift creaks up through every floor they\'ve freed: the Mailroom, the Granaries, the Sealed Floors, the Machine Floors, the Mirror Floors. Below, the camp\'s fire gets smaller and doesn\'t go out.'],
    ['show', 'lead', 'neutral', 'left'],
    ['lead', { mira: 'The basket, love. Don\'t drop it.', kai: 'Basket. Got it. Don\'t look at me like that.', seoyeon: 'I have the basket.', dutch: 'Basket\'s here. Doors open.' }]]), { music: 'c7roof', note: 'The lift up, with the basket.' });
  cut.def('hatch', 'Kagemaru sells the roof', (ch = 'least') => vn([['bg', 'c7-throne'],
    ...(ch === 'vault' ? [['cut', 'c7-hatch-vault'], ['narr', 'The empty throne, and beside it a speaker, crackling. A voice they know comes out of it, from inside a locked vault far below.']]
      : [['narr', 'Beside the empty throne, Kagemaru is waiting with his stall, which nobody saw him carry up.'], ['show', 'kagemaru', 'amused', 'right']]),
    ['kagemaru', 'I was here, you know. 1984. I watched Gary climb out through a hatch above that throne, and come back down without his weapon.', 'neutral'],
    ['kagemaru', 'I can show you the hatch. For a price, of course. Not shards this time.', 'amused'],
    ['show', 'lead', 'cold', 'left'],
    ['kagemaru', 'The one thing each of you kept: Bram\'s list, Hana\'s burnt page, Old Gu\'s letter, Lina\'s diary. I\'m practically giving it away.', 'amused'],
    ['freya', 'Love?', 'neutral'],
    ['narr', 'Freya\'s voice, from the top of the tower.'],
    ['kagemaru', 'You were winning, my lady. Now you aren\'t. Ah ha ha.', 'reveal'],
    ['narr', 'They pay. Kai puts down Hana\'s page, and Seo-yeon Old Gu\'s letter.'],
    ['narr', 'Dutch keeps his hand on Lina\'s diary a moment longer, then lets it go.'],
    ['narr', 'Mira puts the list down last, and finds she can.'],
    ['narr', 'He shows them the hatch.']]), { music: 'c7roof', note: 'Kagemaru sells them the roof.', alts: [['At his stall', 'least'], ['On the vault\'s speaker', 'vault']] });
  cut.def('roof', 'Member of what?', () => vn([['bg', 'c7-roof'],
    ['narr', 'The tower\'s roof is the top of the Cloud. Above it, close enough to touch, is the account the Cloud belongs to.'],
    ['show', 'dutch', 'neutral', 'right'],
    ['narr', 'Dutch finds it the way he has found everything since chapter 2: he reads the fine print. On the hatch lid, under the word ROOT, in tiny gold letters.'],
    ['kai', 'Lens?', 'neutral'], ['dutch', 'No. Some things you just read.', 'stone'],
    ['dutch', 'Member account.', 'stone'],
    ['dutch', 'Member of what?', 'neutral'],
    ['bg', 'c7-console'],
    ['narr', 'The Cloud is a member account in an organization. Its management account is a single dusty console, with a half-price croissant on the keyboard.'],
    ['narr', 'In its policy list is one service control policy, written in 1984 and never attached. Gary\'s Deny: what he wrote the day he said no to Freya, and left for whoever would need it.']]), { music: 'c7roof', note: 'The roof, and the console.' });
  // Kai attaches Gary's Deny as Gary left it, before anyone can stop him: everyone sees what an unscoped SCP does.
  cut.def('blackout', 'Deny everything, for everyone', () => vn([['bg', 'c7-console'],
    ['narr', 'Kai attaches it as Gary left it, before anyone can stop him: deny everything, for everyone, on the Cloud\'s account.'],
    ['bg', 'c7-dark'],
    ['narr', 'Far below, every light in the camp goes out at once. Marrow\'s bell starts to ring, and then can\'t.'],
    ['show', 'kai', 'shock', 'left'], ['kai', 'Undo! Undo!', 'shock'],
    ['show', 'seoyeon', 'neutral', 'right'], ['seoyeon', 'Detach it.', 'neutral'],
    ['narr', 'They detach it, and the lights come back. It stopped Freya, and Uptima, and every role the camp uses. Now they scope it.']]), { music: 'c7sad', note: 'Kai attaches the draft unscoped.' });
  cut.def('draft-roles', 'Deny everything, for Freya\'s roles', () => vn([['bg', 'c7-console'],
    ['narr', 'They attach it. Her copies in every role go still. From the throne, untouched, a voice.'],
    ['freya', 'Oh, that tickles.', 'smile'],
    ['show', 'dutch', 'tired', 'right'], ['dutch', 'She\'s not in the roles. She\'s root.', 'tired'],
    ['narr', 'They detach it.']]), { music: 'c7roof', note: 'A wrong draft: her roles.' });
  cut.def('draft-mgmt', 'Deny root, on the management account', () => vn([['bg', 'c7-console'],
    ['narr', 'They attach it to the console\'s own account, the organization\'s management account. Nothing happens. At the top of the tower, Freya goes on humming.'],
    ['show', 'dutch', 'stone', 'right'], ['dutch', 'House rules never reach the head account. An SCP can\'t touch the management account, whatever it says.', 'stone'],
    ['narr', 'They detach it.']]), { music: 'c7roof', note: 'A wrong draft: the management account.' });
  cut.def('attach', 'Attached', () => vn([['bg', 'c7-throne'],
    ['narr', 'They attach it: deny everything, when the principal is the Cloud\'s root user. Root stops working for anyone at all.'],
    ['narr', 'On the throne, at the top of the tower, Freya is still root. Root just can\'t do anything any more. Her voice doesn\'t change.'],
    ['freya', 'My loves? Is something wrong with the lights?', 'warm'],
    ['show', 'lead', 'cold', 'left'],
    ['narr', 'Uptima, far below at the fire, signs in through IAM Identity Center with her second factor. It\'s how the Cloud should have been run all along.']]), { music: 'c7roof', note: 'Gary\'s Deny, scoped and attached.' });
  cut.def('kyu', 'Kyu comes back', () => vn([['bg', 'c7-kyu'],
    ['narr', 'With root out of Freya\'s hands, Uptima\'s admin role can enable the key the party saved in the Clock Room. Seymour can restore at last.'],
    ['show', 'seymour', 'neutral', 'right'],
    ['narr', 'He does it his way: the newer copy goes into a separate test account first and is restored there, checked, then for real.'],
    ['narr', 'Pinned over his terminal now is the note from your pocket: "Two copies. Test them. — K."'],
    ['show', 'kyu', 'neutral', 'center'], ['hide', 'seymour'],
    ['narr', 'Kyu comes back as she was on the night of the vault. She remembers the temple road, the note she slipped into their pocket, Mira\'s hand, and the four of them deleting her.'],
    ['narr', 'Nobody has to tell her the truth, because she tells it first, all of it.'],
    ['narr', 'Then she listens to their side without interrupting.'],
    ['narr', 'Mira offers her tea.'],
    ['kyu', 'No.', 'cold'],
    ['narr', 'This time nobody laughs.'],
    ['kyu', 'Ask me again tomorrow.', 'neutral']]), { music: 'c7sad', note: 'Kyu, restored, and what she says.' });
  const DRAFTS = [['roles', 'Deny everything, for Freya\'s roles', '"Effect": "Deny", "Action": "*", "Resource": "*",\n"Condition": { "ArnLike": { "aws:PrincipalArn": "arn:aws:iam::*:role/freya-*" } }'],
    ['mgmt', 'Deny everything for root, attached to the management account', '"Effect": "Deny", "Action": "*", "Resource": "*",\n"Condition": { "StringLike": { "aws:PrincipalArn": "arn:aws:iam::*:root" } }\nTarget: the management account'],
    ['root', 'Deny everything for root, attached to the Cloud\'s account', '"Effect": "Deny", "Action": "*", "Resource": "*",\n"Condition": { "StringLike": { "aws:PrincipalArn": "arn:aws:iam::*:root" } }\nTarget: the Cloud (member account)']];
  async function drafts() {
    let wrong = 0;
    // The console stays on screen behind the drafts, so the decision is made where it happens.
    const sc7 = (SD.vn.art.scenes['cut-c7-console-2'] || {}), still = sc7.sheet
      ? `background:url(${SD.assetUrl ? SD.assetUrl(sc7.sheet) : sc7.sheet}) 0 ${sc7.frames > 1 ? sc7.frame / (sc7.frames - 1) * 100 : 0}%/100% ${sc7.frames * 100}% no-repeat;image-rendering:pixelated`
      : null, vec = (SD.vn.art.scenes['c7-console'] || {}).src;
    U.stageDecor['c7-drafts'] = '<div style="position:absolute;inset:0;background:#06050c"></div>' + (still ? `<div style="position:absolute;inset:0;${still};opacity:.55"></div>`
      : vec ? `<img src="${vec}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.55">` : '');
    U.stage('c7-drafts');
    for (;;) {
      const d = await new Promise(res => {
        const b = U.panel(`<div class="g6"><p>Gary\'s Deny, unscoped, put the camp out. A service control policy binds every principal in a member account, its root user included (service-linked roles aside). Scope it, and choose where it goes. Three drafts on the board:</p>
          <div class="opts col">${SD.quiz.shuffle(DRAFTS).map(([k, t, j]) => `<button class="opt" data-d="${k}"><b>${esc(t)}</b><br><span class="muted small" style="font-family:ui-monospace,monospace;white-space:pre-wrap">${esc(j)}</span></button>`).join('')}</div></div>`, { title: 'THE ROOF · GARY\'S DENY', noClose: true, cls: 'wide' });
        b.querySelectorAll('[data-d]').forEach(el => el.onclick = () => { AU.sfx('ok'); U.closePanel(); res(el.dataset.d); });
      });
      S.recordAnswer('scps', d === 'root', 1, 20000);
      if (d === 'root') { U.stage(null); return wrong; }
      wrong++;
      AU.sfx('wrong');
      await cut.play('draft-' + d);
    }
  }
  const CUES = {
    async climb() {
      if (flag('climb')) return;
      await cut.play('climb');
      setFlag('climb');
      mus('c7climb');
    },
    async roof() {
      if (!flag('hatch')) { await cut.play('hatch', choice6() === 'vault' ? 'vault' : 'least'); setFlag('hatch'); }
      if (!flag('roof')) {
        await cut.play('roof');
        await cut.play('blackout');
        const wrong = await drafts();
        await cut.play('attach');
        setFlag('roof'); R.gainXp(wrong ? 30 : 60);
        await ask({ c: 'scps', type: 'mc', q: 'On the roof, Gary\'s Deny did nothing when it was attached to the management account. Why?',
          opts: ['SCPs never affect the management account, whatever they say', 'The management account has no root user for it to deny', 'An SCP only takes effect there a day after it is attached', 'A management account accepts only allow-list SCPs'], a: 0, no: [null, 'The management account has a root user like any other. SCPs just never apply there.', 'SCPs apply in member accounts as soon as they\'re attached. There\'s no day\'s wait.', 'SCPs can be allow lists or deny lists, and neither kind applies to the management account.'],
          why: 'Service control policies apply to the member accounts of an organization and never restrict anyone in the management account, its root user included. That\'s why daily work belongs in member accounts, and the management account is kept nearly empty.',
          eli5: 'The guild\'s house rules bind every member, but never the guild\'s head. So nobody should live in the head\'s office.' }, 'THE ROOF');
      }
      if (!w().cards.includes('r7-scp')) { await addCard('r7-scp', 'GARY\'S DENY'); if (opts && opts.give) opts.give(['r7-scp']); }
      if (!flag('kyu')) {
        mus('c7sad');
        await cut.play('kyu');
        setFlag('kyu');
        // Her answer-speed relic, for the last two floors, if you want it.
        const take = await new Promise(res => {
          const b = U.panel(`<p>Later, without saying anything, Kyu puts a card in your lead's hand: <b>Kyu's Answer</b>. ${esc(SD.cards['r7-kyu'].text)}</p><div class="row"><button class="primary" id="c7-k">Take it</button><button class="ghost" id="c7-nk">Leave it with her</button></div>`, { title: 'KYU\'S ANSWER', noClose: true });
          b.querySelector('#c7-k').onclick = () => { U.closePanel(); res(true); };
          b.querySelector('#c7-nk').onclick = () => { U.closePanel(); res(false); };
        });
        if (take) { w().cards.push('r7-kyu'); S.persist(); if (opts && opts.give) opts.give(['r7-kyu']); }
        await say([[null, 'The old tape stays in Kagemaru\'s vault. For once, nobody wants to buy it.']]);
        mus('c7climb');
      }
    },
    async vote() {
      if (flag('vote')) return;
      await cut.play('vote', freed().map(b => b[0]));
      mus('c7climb');
      setFlag('vote');
    },
    async top() {
      onFloor = 'top';
      mus('c7freya');
      if (flag('top')) return say([['freya', 'Back again, my loves? I\'ve kept your seats warm.', 'warm']]);
      await cut.play('top');
      const left = blessings();
      await U.system('FREYA', left.length ? `She still wears ${left.length} blessing${left.length > 1 ? 's' : ''}: ${left.map(b => b[2]).join(', ')}. Each is a phase of the fight, before the serpent under her.` : 'Every reckoning done: she wears none of her blessings. Only the serpent under her is left.', 'gold');
      setFlag('top');
    },
    async backup() {
      onFloor = 'backup';
      mus('c7freya');
      if (flag('sale')) return;
      await cut.play('sale');
      setFlag('sale');
    },
    async last() {
      // With Kagemaru given the run of the camp, the Top's end is where she reaches for her backup, and he sells it.
      if (choice6() === 'run' && onFloor === 'top') return cut.play('reach');
      mus('c7sad');
      await cut.play('last', choice6());
      setFlag('last');
    }
  };
  // The vote on the Free Tier: each freed band answers, and its grant goes out.
  const VOTE = { thornwick: ['pip', 'Thornwick wants it back. Please. And thank you for asking.'], halcyon: ['wen', 'Halcyon takes it back, dear. We\'ll share it out ourselves.'],
    sealed: ['ryu', 'The Sealed Floors take it back. Our key. Our policy.'], arcanum: ['ayo', 'The Arcanum takes it back! Ha! Every last bolt.'], twinwater: ['mio', 'Twinwater takes it back. Both shores said so. Separately.'] };
  cut.def('vote', 'The vote', (fr = Object.keys(VOTE)) => vn([['bg', 'c7-camp'],
    ['narr', 'The Free Tier. Down every speaker in the tower, far below, the camp is listening.'],
    ['show', 'kai', 'earnest', 'left'],
    ['kai', 'Every band that\'s free: your grant to Freya is still standing. I\'m not going to take it. I\'m asking. Do you want it back?', 'earnest'], ['hide', 'kai'],
    ...fr.flatMap(b => [[VOTE[b][0], VOTE[b][1], 'earnest'], ['sfx', 'x-chime']]),
    ...(fr.length < 5 ? [['narr', `${5 - fr.length} band${5 - fr.length > 1 ? 's' : ''} can't answer: still under her. Their grants stand.`]] : []),
    ['bg', 'c7-top'],
    ['narr', 'The camp watches the grants go out, one by one. Each one takes a share of her strength with it.']]), { music: 'c7roof', note: 'The bands vote on taking their grants back.' });
  cut.def('top', 'Freya on the throne', () => vn([['bg', 'c7-top'],
    ['narr', 'The tower\'s speakers, one last time: "We\'ve updated our terms. By continuing to exist, you accept them." Nobody reads them. Dutch already has.'],
    ['show', 'freya', 'warm', 'right'],
    ['narr', 'Freya waits at the top, on Uptima\'s throne, with her sample tray, as warm as she was in the pavilion in chapter 1.'],
    ['freya', 'We did it!', 'smile'],
    ['freya', 'Keep root, my loves. All four of you. You\'ve earned it.', 'warm'],
    ['show', 'lead', 'cold', 'left'],
    ['narr', 'Nobody takes it.'],
    ['narr', 'They hand her the gift basket, full, and she opens it.']]), { music: 'c7freya', note: 'Freya, on Uptima\'s throne.' });
  cut.def('reach', 'She reaches for her backup', () => vn([['bg', 'c7-top'],
    ['narr', 'Beaten, before the end, Freya reaches for her backup. Kagemaru is right there to sell it to her, the backup and its log, because she\'s the only customer left with anything to lose.'],
    ['show', 'kagemaru', 'amused', 'right'], ['kagemaru', 'For you, my lady? Full price.', 'amused']]), { music: 'c7freya', note: 'Only with the run of the camp.' });
  cut.def('sale', 'The sale goes through', () => vn([['bg', 'c6-vault'],
    ['narr', 'The sale goes through. Her backup is continuous, so it restores her to a minute ago, this fight included. Freya comes back for one more phase, wearing the borrowed faces.'],
    ['freya', 'You didn\'t think I\'d keep only one copy, love? Continuous, of course. You only took the last minute from me.', 'warm'],
    ['show', 'lead', 'cold', 'left'], ['lead', { mira: 'Again, loves.', kai: 'Again.', seoyeon: 'Again.', dutch: 'Again.' }, 'cold']]), { music: 'c7freya', note: 'Freya, restored from the copy he sold her.' });
  cut.def('last', 'Read me sometime', (ch = 'least') => vn([['bg', 'c7-top'],
    ['show', 'freya', 'warm', 'right'],
    ['narr', 'Root is denied, her sessions are revoked, every grant is gone. Their last words to her.'],
    ['mira', 'You answered. That\'s the worst thing anyone has ever done to me.', 'cold'],
    ['kai', 'I\'m not going to unmake you. I\'m going to ask everyone you took from whether they want it back.', 'cold'],
    ['narr', 'They did.'],
    ['seoyeon', 'You let me choose. I\'m choosing now.', 'cold'],
    ['dutch', 'Sit. No, the other chair.', 'stone'],
    ...({ vault: [['bg', 'c6-vault'], ['narr', 'In Kagemaru\'s vault, he\'s sitting beside her backup when she calls through the door.'], ['freya', 'Love, let me out.', 'warm'],
        ['narr', 'He would sell it to her in a heartbeat. He can\'t reach the console from inside, and the door holds.'], ['kagemaru', 'Ah ha ha.', 'amused']],
      least: [['narr', 'In the log, a StartRestoreJob request in Kagemaru\'s name, for her backup: AccessDenied, by the policy the party gave him. Uptima will read it aloud at the fire tonight.'], ['kagemaru', 'Worth a try.', 'amused']],
      run: [['narr', 'Afterwards, Kagemaru counts his payment.'], ['kagemaru', 'You trusted me. Humans. Ah ha ha.', 'amused']] }[ch] || []),
    ['bg', 'c7-queue'],
    ['narr', 'What\'s left of her is her backup in Kagemaru\'s vault, under Vault Lock in compliance mode, kept for the longest a lock allows: a hundred years. Nobody can delete it early, not even Uptima.'],
    ['narr', 'So Uptima attaches one more service control policy to the vault\'s account: nobody there may restore it, copy it or share it, Kagemaru included.'],
    ['narr', 'Freya ends as the one message Uptima will never read: the thing she made of Uptima\'s prayers, locked where nobody may open it.'],
    ['freya', 'Read me sometime, love.', 'warm'],
    ['narr', 'Then it stops. It\'s the only time her voice changes.'],
    ['fx', 'black']]), { music: 'c7sad', note: 'Their last words, and what happens to her.', alts: [['Least privilege', 'least'], ['The vault', 'vault'], ['The run of the camp', 'run']] });

  // ---------- The morning after ----------
  cut.def('fireside', 'Uptima at the fire', () => vn([['bg', 'c7-fire'],
    ['narr', 'Uptima doesn\'t take the throne back. She runs the Cloud from the camp\'s fire, through IAM Identity Center, with MFA.'],
    ['show', 'uptima', 'neutral', 'right'],
    ['uptima', 'Each band its own account, under the organization, so no one can take all of it again. Control Tower\'s controls on every one.', 'earnest'],
    ['uptima', 'The camp\'s network shared across them with Resource Access Manager.', 'neutral'],
    ['uptima', 'Approved kits from Service Catalog.', 'neutral'],
    ['uptima', 'Licences counted in License Manager.', 'neutral'],
    ['uptima', 'And once a season, all of us, with the Well-Architected Tool.', 'neutral'],
    ['narr', 'Then she moves the prayers out of the queue, where any message is gone in fourteen days, into an S3 bucket under Object Lock in compliance mode. Nobody can delete one, herself included.'],
    ['uptima', 'And I won\'t work from the management account. Service control policies can\'t reach it, so up there the only rule is my word.', 'earnest'],
    ['narr', 'She reads some every night. Elder Wren sits with her while she does.']]), { music: 'c7camp', note: 'The morning after: how the Cloud is run now.' });
  async function fireside() {
    const first = await new Promise(res => {
      const b = U.panel(`<p>Uptima has a plan for running the Cloud now. Draw your own first, on the Design Board, or hear hers first?</p><div class="row"><button class="primary" id="c7-hf">Hear Uptima first</button><button class="ghost" id="c7-df">Draw it first</button></div>`, { title: 'THE MORNING AFTER', noClose: true });
      b.querySelector('#c7-hf').onclick = () => { U.closePanel(); res(false); };
      b.querySelector('#c7-df').onclick = () => { U.closePanel(); res(true); };
    });
    if (first) {
      setFlag('drawfirst'); setFlag('fireside');
      return say([['uptima', 'Then you draw it, and I\'ll tell you mine after. You climbed it.', 'warm'], [null, 'She hands your lead her stick.']]);
    }
    await cut.play('fireside');
    setFlag('fireside');
    mus('c7camp');
    await say([['uptima', 'Help me draw it properly, on the Design Board. Then it\'s real.', 'warm'], [null, 'She hands your lead her stick.']]);
  }
  async function dboard() {
    if (!flag('won')) return say([[null, 'The Design Board, on its easel. Blank, for the morning.']]);
    if (flag('board')) return say([[null, 'The Cloud, run properly: five accounts with controls, one front door with a second key, one shared road, and a review every season.']]);
    if (!flag('fireside')) return fireside();
    await G.order(G.DEF.board);
    await ask({ c: 'controltower', type: 'mc', q: 'On Uptima\'s board, every band signs in through IAM Identity Center. What does a person get in each account they\'re assigned to?',
      opts: ['Short-lived credentials for a role made from a permission set', 'An IAM user of their own, with a long-term access key', 'The account\'s root user, protected by their MFA device', 'A copy of every permission the management account has'], a: 0, no: [null, 'Identity Center gives people role sessions, not IAM users or long-term keys.', 'Nobody gets the root user through Identity Center. Root stays locked away.', 'Each person gets only the permission sets assigned to them, account by account.'],
      why: 'IAM Identity Center provisions each permission set as an IAM role in the assigned accounts. People sign in once, with MFA, and get temporary role credentials there: no IAM users, and no root.',
      eli5: 'One front door, with a second key. Inside, each room hands you a visitor\'s badge for that room only, and it expires.' }, 'DESIGN BOARD');
    setFlag('board'); R.gainXp(40);
    await addCard(G.DEF.board.card);
    // Drawn first: Uptima's plan plays now, over the finished drawing.
    if (flag('drawfirst')) { await cut.play('fireside'); mus('c7camp'); }
    return epilogue();
  }
  // What each culprit's reckoning earned. A reckoning not done: a short ending, and the culprit still out there.
  const ENDS = { hale: ['Hale is sorting letters at the Thornwick post office, under Pip. He delivers each one himself, and waits while it\'s read, in case there\'s an answer.', 'Hale was never reckoned with. Somewhere below, a letter goes missing.'],
    selvaria: ['Selvaria eats at the long table in Halcyon, a slice of the same loaf as everyone else.', 'Selvaria was never reckoned with. Somewhere in the Granaries, a store is still full.'],
    namgung: ['Namgung Hyeon hands back the last of the Sealed Floors\' keys, one by one, to the people whose policies they were.', 'Namgung was never reckoned with. Somewhere on the Sealed Floors, one seal still holds.'],
    iris: ['Iris Vell sits in the Arcanum with her deployments switched off, and lets them stay off.', 'Iris was never reckoned with. Somewhere in the Machine Floors, a rollback is waiting for midnight.'] };
  cut.def('epilogue', 'Epilogue', () => vn([['bg', 'c7-dawn'],
    ['narr', 'The marsh cat\'s name is settled by Kyu, who doesn\'t know any of the arguments: Patient, Chef, Honoured Guest, Suspect. Asked what it\'s called, she says one word.'],
    ['show', 'kyu', 'neutral', 'center'], ['kyu', 'No.', 'neutral'],
    ['narr', 'The cat comes to her. That\'s its name.'],
    ['bg', 'c7-fire'], ['show', 'uptima', 'neutral', 'right'],
    ['narr', 'Kyu sits by the fire with Uptima for a while. Neither of them says anything.'], ['hide', 'kyu'],
    ['uptima', 'IAM Identity Center.', 'neutral'],
    ['show', 'kai', 'neutral', 'left'], ['kai', 'Bless you.', 'smirk'],
    ['narr', 'Kai, not Dutch, said it.'], ['hide', 'kai'],
    ...(w().cards.includes('r7-kyu') ? [] : [['show', 'kyu', 'neutral', 'left'], ['kyu', 'I remember all of it. I\'m still deciding.', 'neutral'], ['hide', 'kyu']]),
    ['narr', 'Uptima, who now reads every prayer, finds one of Freya\'s satisfaction cards filed among the prayers: "How likely are you to recommend the Free Tier to a friend? 0 to 10." She reads it all the way through. She doesn\'t answer it.'],
    ['hide', 'uptima'], ['bg', 'c7-dawn'], ['music', 'c7sad'],
    ...Object.keys(ENDS).map(k => ['narr', ENDS[k][RECKONED[k]() ? 0 : 1]]),
    ['narr', 'Aurelian comes up out of the Abyss with Mother Ash.'],
    ['narr', 'Tilly visits the camp. She doesn\'t stay.'],
    ['narr', 'Mira watches her go as far as the path. Tilly comes back the next week.'],
    ['narr', 'Uptima opens the way back for anyone the Cloud pulled in through a template. That\'s how Noor came, not how the four did, so it doesn\'t open for them. Noor takes it, and leaves a bookshop bookmark in Lexi\'s library.'],
    ['narr', 'The four watch the way close behind her.'],
    ['narr', choice6() === 'vault' ? 'Kagemaru\'s vault stays shut, its speaker silent. On a shelf beside the grille are Bram\'s list, Hana\'s page, Old Gu\'s letter and Lina\'s diary, priced too high for anyone, and still there.'
      : 'Kagemaru opens a stall at the edge of the camp. Nobody buys anything. On its top shelf are Bram\'s list, Hana\'s page, Old Gu\'s letter and Lina\'s diary, priced too high for anyone, and still there.'],
    ['narr', 'Beside them, in a napkin with his name spelled wrong, is a biscuit that isn\'t for sale.'],
    ['music', null], ['bg', 'c7-console'],
    ['narr', 'On the management account\'s console, the croissant is gone. Nobody saw who took it.'],
    ['fx', 'black']]), { music: 'c7camp', note: 'The epilogue.' });
  async function epilogue() {
    await cut.play('epilogue');
    setFlag('epilogue');
    c7().f.done = true; S.persist();
    R.gainXp(80);
    return endCard();
  }
  function endCard() {
    W.halt();
    AU.music('title');
    U.stage(null);
    const s = S.save;
    const b = U.panel(`<div id="c7-end"><p><b>Root is denied. Freya is a message nobody may open, and the Cloud is run from the camp's fire.</b></p>
      <p class="muted small">Level ${s.level} · ${w().pairs.length} of 5 nights before · ${blessings().length} blessing${blessings().length === 1 ? '' : 's'} left on her at the top · ${w().cards.length} cards learned at camp</p>
      <p><b>The End.</b> Thank you for climbing.</p>
      <div class="opts col"><button class="ghost" id="c7-walk">Walk the camp, the morning after</button></div></div>`, { title: 'CHAPTER 7 · ROOT', noClose: true });
    b.querySelector('#c7-walk').onclick = () => { U.closePanel(); sc = null; W.enter(); };
  }

  // ---------- Doors and people ----------
  function door(d) {
    if (busy) return;
    if (d === 'lift') return act(lift);
  }
  function talk(id) {
    if (busy) return;
    if (sc.actors[id] && !sc.actors[id].thing) { const a = sc.actors[id], P = sc.P; a.face = Math.abs(P.x - a.x) >= Math.abs(P.y - a.y) ? (P.x > a.x ? 'east' : 'west') : (P.y > a.y ? 'south' : 'north'); }
    if (/^pair/.test(id)) return act(() => pair(id.slice(4)));
    if (LW.talk(id)) return;
    // A gift-giver with the band's gift still to give gives it first.
    const g = GIFTS.find(x => x[2] === id && !hasGift(x[0]) && giftsDue().includes(x));
    if (g && flag('arrive') && !flag('won')) return act(() => gift(g[0]));
    const fns = { tower: lift, bru: bruBoard, bruP: bruBoard, wren, uptima, prayers: () => (flag('won') ? review('fire') : uptima()), fire: () => (flag('won') ? review('fire') : uptima()), basket, dboard,
      kyu: () => say([['kyu', rnd(['Ask me again tomorrow.', 'The cat\'s name is No. It answers to it.', 'I remember all of it. I\'m still deciding.']), 'neutral']]),
      kstall: () => chat('kage'), kage: () => chat('kage'), post: () => chat('pip'), bunker: () => chat('seymour'), library: () => chat('lexi'), records: () => chat('theo'), forge: () => chat('ayo'), relay: () => chat('mio'),
      shop: () => chat('aigerim'), cafe: () => chat('wen'), market: () => say([[null, 'Kai\'s market stall, for the night: a pot of stew and a sign in his handwriting, EAT FIRST.']]),
      school: () => say([[null, 'Seo-yeon\'s school, shut for the night. Tomorrow\'s lesson is chalked on the slate already: FORMS.']]), bell: () => chat('marrow'),
      wen: () => say([['wen', flag('won') ? 'More tea, dear? You\'ve earned three.' : 'Eat something, dear. Towers are always taller than they look.', 'smile']]) };
    if (T.order.includes(id)) return act(() => say([[id, rnd({ mira: ['Eat something, love. Then the tower.', 'Everyone came. I keep counting them.'], kai: ['Stew\'s on. Nobody climbs hungry.', 'I\'m not nervous. You\'re nervous.'],
      seoyeon: ['Forms at dawn. Then the top.', '...I\'m glad they all came.'], dutch: ['Read everything up there. Twice.', 'Nothing written inside touches root. So we look outside.'] }[id])]]));
    if (fns[id]) return act(fns[id]);
    if (CHAT[id]) return act(() => chat(id));
  }

  // ---------- The objective, and where the arrow points ----------
  // [what to do, [x, y], the actor or thing with the "!"]
  function step() {
    const f = flag;
    if (!f('arrive')) return ['The camp, the night before', null, null];
    if (!f('won')) {
      const g = giftsDue().find(x => !hasGift(x[0]));
      if (g) { const a = sc && sc.actors[g[2]]; return [`For the basket: ${SD.cast[g[2]].name} has ${BANDS.find(b => b[0] === g[0])[1]}'s gift`, a ? [a.x, a.y + 1] : null, g[2]]; }
      if (!f('book')) return ['Bru has a board out, by the path', [13, 16], 'bruP'];
      if (!f('whose')) return ['Elder Wren has a question, at the fire', [19, 18], 'wren'];
      if (!f('uptima')) return ['Uptima, at the fire with the prayers', [23, 18], 'uptima'];
      return [f('lift') ? 'Floor 100: take the lift (top of the camp)' : 'Make the tower lift safe (top of the camp)', [21, 6], 'tower'];
    }
    if (!f('restoreq')) return ['Seymour wants a word, by his bunker', [5, 17], 'seymour'];
    if (!f('board')) return ['Draw the Cloud, run properly, on the Design Board', [29, 19], 'dboard'];
    return ['The Cloud is run from the fire now. Nights before: ' + w().pairs.length + ' of 5', null, null];
  }

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el || !W.active) return;
    const s = S.save, need = S.xpFor(s.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${esc(l.name.split(' ')[0])}</b> · Lv ${s.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, s.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      <span class="hud-chip" title="The night before: the five arc finales">✦ ${w().pairs.length}/5</span>
      <span class="w-sp"></span>
      ${LW.hud()}
      <button class="ghost" id="w-codex" aria-label="Cheat sheet" title="Cheat sheet">📖</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      <button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
    LW.bind();
  }
  const prevHud = SD.ch1.hud;
  SD.ch1.hud = () => (W.active ? hud() : prevHud());

  // The floors' card rewards are this chapter's own, while the climb is on.
  if (SD.champions && SD.champions.rewards) {
    const rewards = SD.champions.rewards;
    SD.champions.rewards = champ => (W.set ? D.CARDS[W.set].slice() : rewards(champ));
  }

  // ---------- Entering and leaving ----------
  W.enter = function () {
    W.on = true;
    SD.ch1.halt();
    ['c2world', 'c2xworld', 'c3world', 'c4world', 'c5world', 'c6world'].forEach(k => { if (SD[k] && SD[k].halt && SD[k] !== W) SD[k].halt(); });
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'The Free Cloud\'s camp at the foot of the tower, the night before the last climb, with everyone in it');
    if (!sc) makeScene(); else applyState();
    lastTile = ''; trail.length = 0; zoneShown = false;
    W.active = true;
    sc.start();
    mus('c7camp');
    hud();
    if (!flag('hinted')) { setFlag('hinted'); U.system('HOW TO MOVE', 'Arrow keys or WASD to walk, E or Enter to talk, or tap where you want to go. The yellow arrow points at your next step. The lanterns are where two of the four are sitting up late.'); }
  };
  W.halt = function () { W.active = false; if (sc) { sc.stop(); sc.locked = false; } };
  W.reset = function () { W.halt(); sc = null; busy = false; };
  W.start = async function () {
    W.on = true;
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    if (!S.save.c1 || !S.save.c1.lead) return W.newGame();
    c7(); S.persist();
    if (c7().f.done) return endCard();
    sc = null;
    W.enter();
  };
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart[7] = () => W.start();

  // ---------- The chapter 7 demo's own start ----------
  // Assumed, as if chapters 1 to 6 were played: level 24 at least, chapter 1's starter deck, every band freed, the
  // reckonings that exist done (Iris's isn't built yet, so one blessing is left on her), Kagemaru let into the camp with
  // least privilege, and the earlier chapters' concepts on the cheat sheet.
  W.newGame = async function () {
    const id = await SD.ch1.choose();
    const s = S.save;
    s.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x2 => ({ id: x2, up: false })), pos: null };
    s.c2x = Object.assign({}, s.c2x, { f: Object.assign({}, (s.c2x || {}).f, { freed: true, grey: true, done: true }) });
    s.c3 = Object.assign({ w: { x: {} } }, s.c3); s.c3.f = Object.assign({}, s.c3.f, { done: true }); s.c3.w = Object.assign({ x: {} }, s.c3.w); s.c3.w.x = Object.assign({}, s.c3.w.x, { reckard: true });
    s.c4 = Object.assign({ w: { x: {} } }, s.c4); s.c4.f = Object.assign({}, s.c4.f, { done: true }); s.c4.w = Object.assign({ x: {} }, s.c4.w); s.c4.w.x = Object.assign({}, s.c4.w.x, { reckon: true });
    s.c5 = Object.assign({ w: { x: {} } }, s.c5); s.c5.f = Object.assign({}, s.c5.f, { done: true });
    s.c6 = Object.assign({ w: { x: {} } }, s.c6, { choice: (s.c6 && s.c6.choice) || 'least' }); s.c6.f = Object.assign({}, s.c6.f, { done: true }); s.c6.w = Object.assign({ x: {} }, s.c6.w); s.c6.w.x = Object.assign({}, s.c6.w.x, { saved: true, reveal: true });
    s.c7 = null;
    s.name = T.leads[id].name.split(' ')[0];
    s.flags.prologue = true; s.flags.ch1 = true;
    if ((s.level || 1) < 24) { s.level = 24; s.xp = 0; }
    Object.keys(SD.concepts).forEach(c => { if (SD.concepts[c].zone < 7) S.seeConcept(c); });
    S.persist();
    sc = null;
    return W.start();
  };
  if (CH7) {
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), s = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(s.c1 && s.c1.lead && s.c7);
        box.innerHTML = (has ? `<button class="primary" id="t-c7go">Continue · ${esc(T.leads[s.c1.lead].name)}</button><button class="ghost" id="t-c7new">New game</button>` : '<button class="primary" id="t-c7new">Play Chapter 7: Root</button>') + '<button class="ghost" id="t-help">How to play</button>';
        const h = $('#t-help');
        if (h) h.onclick = () => U.panel('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. The lanterns are scenes: walk into them.</p><p>The climb is a raid: play cards to fix incidents, with the other three as your party.</p>', { title: 'HOW TO PLAY' });
        if (has) $('#t-c7go').onclick = () => W.start();
        $('#t-c7new').onclick = () => {
          if (!has) return W.newGame();
          const c = U.panel('<p>Start chapter 7 again from the night before? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' });
          c.querySelector('#n-y').onclick = () => { U.closePanel(); S.save.c7 = null; S.persist(); sc = null; W.newGame(); };
          c.querySelector('#n-n').onclick = U.closePanel;
        };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 7 demo: Root · Built on the AWS documentation · Saves automatically';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  }

  // For tools/c7_check.js and tools/c7_balance.js.
  W.debug = { expedition: () => expedition(), after: won => after(won), busy: () => busy, flags: f => { Object.assign(w().x, f); S.persist(); if (sc) applyState(); }, flag, place: (x2, y) => sc && goTo(x2, y),
    scene: () => sc, step, act, w, c7, PAIRS, GIFTS, giftsDue, blessings, freed, build, endCard, BASE, CUES, opts: () => opts, LW };
})();
