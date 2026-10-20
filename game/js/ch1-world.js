// Chapter 1's overworld and its story: choosing your lead, the prologue, Freya's camp, the road east past the
// Crooked Mug and Kyu's bridge, Brookfall's shrine, the Temple of Uptime's gate, and the dungeon's hooks (Uptima's
// revoke, the Kyu night and the ending). The words are in js/ch1-story.js and the art in js/ch1-art.js.
// The map is drawn in code on js/scene.js: 66 x 18 tiles, the camp in the west and the temple in the east.
(function () {
  const W1 = SD.ch1 = {};
  const U = SD.ui, S = SD.state, Q = SD.quiz, AU = SD.audio, R = SD.run, T = SD.ch1story, ART = SD.c1art;
  const $ = U.$;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const rnd = a => a[Math.floor(Math.random() * a.length)];
  const CH = SD.chapters[1];

  // ---------- Save ----------
  // S.save.c1: { lead, f: story flags, deck: [{ id, up }], pos: [x, y] }
  function c1() {
    if (!S.save.c1) S.save.c1 = { lead: null, f: {}, deck: [], pos: null };
    return S.save.c1;
  }
  const flag = k => !!c1().f[k];
  const setFlag = k => { c1().f[k] = true; S.persist(); };
  const lead = () => c1().lead;
  const others = () => T.order.filter(id => id !== lead());

  // A scene's lines: 'lead' is whoever you play, and a text can change with the lead.
  function L(lines) {
    const me = lead();
    return lines.map(([s, t, e]) => ({ s: s === 'lead' ? me : s, t: typeof t === 'object' ? t[me] : t, e }));
  }
  const say = lines => U.dialog(L(lines));

  // ---------- The map ----------
  const MW = 66, MH = 18;
  const PROPS = [];
  const BASE = (function build() {
    const g = [];
    for (let y = 0; y < MH; y++) { const r = []; for (let x = 0; x < MW; x++) r.push(y < 2 || y > 15 || x === 0 || x === MW - 1 ? 'T' : '.'); g.push(r); }
    const set = (x, y, c) => { if (x >= 0 && x < MW && y >= 0 && y < MH) g[y][x] = c; };
    const row = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) set(x, y, c); };
    const col = (x, y0, y1, c) => { for (let y = y0; y <= y1; y++) set(x, y, c); };
    const prop = (kind, x, y, w, h, o) => {
      const p = Object.assign({ kind, x, y, w: w || 1, h: h || 1 }, o);
      PROPS.push(p);
      if (p.solid !== false) for (let j = 0; j < p.h; j++) for (let i = 0; i < p.w; i++) set(x + i, y + j, '#');
      return p;
    };
    // The camp's east edge is a line of trees, open where the road leaves.
    col(16, 2, 15, 'T');
    // Roads: the main road east at row 9, the camp's lane from Freya's pavilion down to the cart, the tavern path.
    row(1, 30, 9, ','); col(8, 5, 12, ','); col(25, 7, 8, ',');
    for (let y = 0; y < MH; y++) row(31, 33, y, 'w');
    row(31, 33, 9, '=');
    row(34, 46, 9, ',');
    row(47, 64, 9, 's'); row(52, 64, 8, 's'); row(52, 64, 10, 's'); row(57, 61, 8, 'S');
    // Flowers.
    [[4, 3], [5, 3], [3, 14], [4, 14], [11, 14], [12, 15], [14, 8], [15, 13], [19, 12], [20, 11], [22, 6], [27, 12], [28, 13],
      [35, 6], [36, 7], [44, 7], [45, 6], [38, 13], [41, 12], [48, 13], [49, 5], [53, 13], [56, 14], [62, 13], [63, 14]].forEach(([x, y]) => set(x, y, 'f'));
    // Freya's camp.
    prop('pavilion', 6, 2, 5, 3);
    prop('tent', 1, 4, 3, 2, { color: '#f4f1ea', dark: '#d9d2c4', flag: '#7fbf5a', mark: 'leaf' });
    prop('hospital', 1, 6, 2, 1);
    prop('kitchen', 12, 4, 3, 2);
    prop('watch', 2, 11, 2, 2); set(4, 12, '#');
    prop('crates', 12, 12, 2, 1);
    prop('campfire', 10, 11);
    W1.cart = prop('cart', 7, 13, 2, 1, { state: 'locked' });
    [[13, 2], [15, 3], [1, 2], [15, 15], [1, 15], [5, 15], [11, 2]].forEach(([x, y]) => prop('tree', x, y));
    [[5, 5], [10, 15], [14, 10]].forEach(([x, y]) => prop('bush', x, y));
    // The road.
    prop('board', 19, 7, 2, 1);
    prop('sign', 18, 10);
    prop('tavern', 23, 3, 5, 3); set(25, 6, 'D');
    [[18, 3], [21, 4], [20, 14], [23, 12], [26, 14], [28, 11], [29, 4], [17, 13], [22, 15], [29, 15], [19, 2], [27, 2], [24, 15], [30, 6]].forEach(([x, y]) => prop('tree', x, y));
    [[21, 11], [28, 7], [18, 6]].forEach(([x, y]) => prop('rock', x, y));
    [[22, 12], [26, 11], [30, 12]].forEach(([x, y]) => prop('bush', x, y));
    prop('rail', 31, 9, 3, 1, { solid: false });
    // Brookfall.
    prop('cottage', 35, 3, 3, 2, { color: '#7a9ad0' });
    prop('shrine', 39, 5, 3, 2);
    prop('cottage', 43, 3, 3, 2, { color: '#e9a0b0' });
    prop('cottage', 42, 12, 3, 2, { color: '#e8c46a' });
    prop('cottage', 36, 13, 3, 2, { color: '#9fc98a' });
    prop('fence', 34, 7, 2, 1); prop('fence', 45, 11, 2, 1);
    [[36, 8], [44, 8]].forEach(([x, y]) => prop('lamp', x, y));
    [[34, 2], [46, 3], [46, 14], [41, 15], [34, 15], [39, 2], [45, 15]].forEach(([x, y]) => prop('tree', x, y));
    // The Temple of Uptime.
    W1.temple = prop('temple', 54, 2, 11, 6, { door: 59, state: 'closed' });
    [[48, 7], [48, 11], [51, 7], [51, 11]].forEach(([x, y]) => prop('pillar', x, y));
    [[54, 11], [64, 11]].forEach(([x, y]) => prop('statue', x, y));
    [[56, 11], [62, 11]].forEach(([x, y]) => prop('lamp', x, y));
    [[47, 3], [50, 3], [49, 14], [52, 14], [58, 14], [61, 15], [64, 14], [47, 13], [52, 4]].forEach(([x, y]) => prop('tree', x, y));
    return g.map(r => r.join(''));
  })();
  // What's under a tile, for drawing the ground: buildings and trees stand on grass, doors on their paths.
  const groundCh = (map, x, y) => {
    if (y < 0 || y >= MH || x < 0 || x >= MW) return '.';
    const c = map[y][x];
    return c === 'T' || c === '#' ? '.' : c === 'D' ? ',' : c === 'G' ? 's' : c;
  };
  // Who stands where to begin with.
  const HOME = { mira: [3, 7, 'east'], kai: [13, 6, 'south'], seoyeon: [5, 11, 'south'], dutch: [14, 11, 'west'] };
  const ZONES = [[17, 'camp', 'town', 'FREYA\'S CAMP'], [31, 'road', 'journey', 'THE ROAD EAST'], [47, 'brookfall', 'explore', 'BROOKFALL'], [99, 'temple', 'quest', 'THE TEMPLE OF UPTIME']];
  const zoneAt = x => ZONES.find(z => x < z[0]);

  // ---------- The scene ----------
  let sc = null, busy = false, follow = false, zone = null, lastTile = '';
  const trail = [];
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => ART.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  function thing(id, x, y, name) { return sc.addActor(id, { x, y, thing: true, name: null, label: name, draw: () => {} }); }

  function makeScene() {
    const map = BASE.slice();
    const def = {
      map, solid: 'T#w', doors: { D: 'tavern', G: 'temple' }, ground: false, bg: '#7cc96a', clock: false,
      under(ctx, ts, t, x0, x1, y0, y1) {
        for (let y = y0; y <= Math.min(y1, MH - 1); y++) for (let x = x0; x <= Math.min(x1, MW - 1); x++)
          ART.ground(ctx, groundCh(map, x, y), x, y, ts, t, (dx, dy) => groundCh(map, x + dx, y + dy));
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = x0; x < x1; x++) if (map[y][x] === 'T') ART.prop(ctx, { kind: 'tree', x, y, w: 1, h: 1 }, ts, t);
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) ART.prop(ctx, p, ts, t); });
      },
      // Tapping a building or a prop walks you to whoever or whatever you'd talk to there.
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 2 && Math.abs(o.y - ty) <= 2);
        if (a) return [a.x, a.y + 1];
        if (map[ty] && map[ty][tx] === '#' && ty >= 3 && ty <= 5 && tx >= 23 && tx <= 27) return [25, 6];
        return null;
      },
      overlay(ctx, t, vw, vh) { if (W1.fade) { ctx.fillStyle = `rgba(14,10,40,${W1.fade})`; ctx.fillRect(0, 0, vw, vh); } }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    sc.addActor('pip', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {} });
    const me = lead(), pos = c1().pos || [9, 10];
    const P = sc.player(pos[0], pos[1], 'north');
    P.look = me;
    P.draw = (ctx, fx, fy, ts, t) => ART.person(ctx, me, fx, fy, ts, t, P.face, P.moving, null);
    // Freya, and the three you didn't pick.
    person('freya', 'freya', 9, 6, 'south', { name: 'Freya' });
    others().forEach(id => { const [x, y, f] = HOME[id]; person(id, id, x, y, f, { name: SD.cast[id].name }); });
    thing('cart', 8, 13, 'Supply cart');
    thing('board', 19, 7, 'Notice board');
    thing('sign', 18, 10, 'Signpost');
    thing('gate', 59, 7, 'Temple gate');
    sc.addActor('barricade', { x: 16, y: 9, thing: true, draw: (ctx, fx, fy, ts, t) => ART.prop(ctx, { kind: 'barricade', x: 16, y: 9, w: 1, h: 1 }, ts, t) });
    person('keeper', 'keeper', 27, 7, 'south', { name: 'Tavern keeper' });
    person('wren', 'wren', 40, 7, 'south', { name: 'Elder Wren' });
    person('f1', 'faithful', 38, 8, 'north'); person('f2', 'faithful2', 42, 8, 'north'); person('f3', 'faithful', 40, 10, 'north');
    person('kyu', 'kyu', 32, 9, 'west');
    // The controller: followers, zones and saving your place.
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  // Put the world in step with the story flags (after loading a save, or a scene).
  function applyState() {
    const f = c1().f, A = sc.actors;
    W1.cart.state = f.cart ? 'open' : 'locked';
    W1.temple.state = f.gate ? 'open' : 'closed';
    setTile(59, 7, f.gate ? 'G' : '#');
    A.gate.hidden = !!f.gate;
    A.barricade.hidden = !!f.brief;
    A.kyu.hidden = !!f.kyu;
    follow = !!f.brief;
    const party = others().concat('freya');
    party.forEach(id => { const a = A[id]; a.solid = !follow; a.talk = follow ? false : undefined; a.name = follow ? null : (id === 'freya' ? 'Freya' : SD.cast[id].name); });
    if (follow) {
      const P = sc.P;
      party.forEach(id => { if (Math.abs(A[id].x - P.x) + Math.abs(A[id].y - P.y) > 6) sc.place(id, P.x, P.y); });
    }
    refresh();
  }
  function setTile(x, y, c) { const m = sc.def.map; m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1); }

  // The "!" over whoever has something for you.
  function refresh() {
    if (!sc) return;
    const f = c1().f, A = sc.actors;
    const ready = f.cart && leadScenesDone();
    A.freya.marker = !f.brief && (!f.intro || ready);
    others().forEach(id => { A[id].marker = !f.brief && !!f.cart && !!nextScene(id); });
    A.cart.name = f.cart ? null : 'Supply cart'; A.cart.marker = !f.cart;
    A.board.name = f.brief && !f.board ? 'Notice board' : null; A.board.marker = f.brief && !f.board;
    A.gate.name = f.shrine && !f.gate ? 'Temple gate' : null; A.gate.marker = f.shrine && !f.gate;
    hud();
  }

  // ---------- Every frame: followers, zones, your place ----------
  function tick() {
    const P = sc.P; if (!P) return;
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { c1().pos = [P.x, P.y]; S.persist(); }
      const z = zoneAt(P.x);
      if (z !== zone) { const first = zone === null; zone = z; if (!busy || first) AU.music(z[2]); if (!first) banner(z[3]); }
    }
    if (follow) {
      const party = others().concat('freya');
      party.forEach((id, i) => {
        const a = sc.actors[id], to = trail[i];
        if (!to || a.scripted || a.moving || a.path.length) return;
        if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
      });
    }
    if (busy || P.moving || P.path.length) return;
    const f = c1().f;
    if (f.brief && !f.kyu && P.x >= 29) return act(kyuScene);
    if (f.kyu && !f.shrine && P.x >= 36) return act(wrenScene);
  }
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }

  // Run a scene with the controls locked.
  async function act(fn) {
    if (busy) return;
    busy = true; sc.locked = true; sc.pause();
    try { await fn(); } catch (e) { console.error(e); }
    finally { busy = false; if (sc) { sc.locked = false; c1().pos = [sc.P.x, sc.P.y]; } S.persist(); refresh(); }
  }
  // A path for someone in a scene, round buildings and water, ignoring people.
  const open = (x, y) => { const c = sc.tile(x, y); return !'T#w'.includes(c) && c !== 'D' && c !== 'G'; };
  function pathTo(sx, sy, tx, ty) {
    const key = (x, y) => x + ',' + y, prev = new Map([[key(sx, sy), null]]), q = [[sx, sy]];
    while (q.length) {
      const [x, y] = q.shift();
      if (x === tx && y === ty) {
        const out = []; let k = key(x, y);
        while (k !== key(sx, sy)) { out.unshift(k.split(',').map(Number)); k = prev.get(k); }
        return out;
      }
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = key(nx, ny);
        if (prev.has(k) || !open(nx, ny)) continue;
        prev.set(k, key(x, y)); q.push([nx, ny]);
      }
    }
    return null;
  }
  function walkTo(id, x, y, speed) {
    const a = sc.actors[id]; if (!a) return Promise.resolve();
    const p = pathTo(Math.round(a.x), Math.round(a.y), x, y) || [];
    a.scripted = true; a.speed = speed || 3.4;
    if (a.player) {
      a.path = p;
      return new Promise(res => { const chk = () => (!a.moving && a.x === x && a.y === y) || !p.length ? res() : setTimeout(chk, 60); chk(); }).then(() => { a.scripted = false; });
    }
    a.path = p;
    return new Promise(res => { a.arrive = res; if (!p.length) res(); }).then(() => { a.scripted = false; });
  }
  const faceTo = (a, b) => { const A = sc.actors[a], B = sc.actors[b]; if (!A || !B) return; const dx = B.x - A.x, dy = B.y - A.y; A.face = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); };
  // A free tile next to someone, for a walk-over.
  function beside(id) {
    const a = sc.actors[id];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1]]) {
      const x = a.x + dx, y = a.y + dy;
      if (open(x, y) && !(sc.P.x === x && sc.P.y === y) && !Object.values(sc.actors).some(o => o !== a && !o.hidden && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }

  // ---------- Talking ----------
  function talk(id) {
    if (busy) return;
    const f = c1().f;
    faceTo(id, 'you');
    if (id === 'freya') return act(freyaTalk);
    if (T.order.includes(id)) return act(() => companion(id));
    if (id === 'cart') return act(cart);
    if (id === 'board') return act(async () => { await say(f.board || !f.brief ? T.boardAgain : T.board); if (f.brief) setFlag('board'); });
    if (id === 'sign') return act(() => say(T.sign));
    if (id === 'barricade') return act(() => say(f.cart ? T.barricadeOpen : T.barricade));
    if (id === 'keeper') return act(() => say(T.keeper));
    if (id === 'wren') return act(() => say(T.wrenIdle));
    if (id === 'gate') return act(gate);
    if (/^f\d$/.test(id)) return act(() => say([['narr', 'Heads bowed, lips moving. Praying to someone who stopped listening a long time ago.']]));
  }
  async function door(d) {
    if (busy) return;
    if (d === 'tavern') return act(async () => {
      const f = c1().f;
      if (f.brief && !f.tavern) { await say(T.tavern); setFlag('tavern'); } else await say(f.tavern ? T.tavernAgain : [['narr', 'The Crooked Mug is shut. A note on the door: OPEN FOR FREYA\'S BRIGADE ONLY.']]);
      sc.place('you', 25, 7); sc.P.face = 'south';
    });
    if (d === 'temple') return act(enterTemple);
  }

  // ---------- The camp ----------
  const leadScenes = () => Object.keys(T.camp).filter(k => T.camp[k].who.includes(lead()));
  const leadScenesDone = () => leadScenes().every(k => flag('s_' + k));
  // A companion's next camp scene: one with you first.
  function nextScene(id) {
    const left = Object.keys(T.camp).filter(k => T.camp[k].who.includes(id) && !flag('s_' + k));
    return left.find(k => T.camp[k].who.includes(lead())) || left[0] || null;
  }
  async function companion(id) {
    const f = c1().f;
    if (!f.cart) return say([[id, rnd(T.idle[id])], ['narr', 'Breakfast is in the supply cart, by the fire.']]);
    const k = nextScene(id);
    if (!k || f.brief) return say([[id, rnd(T.idle[id].concat(f.brief ? T.idleAfter[id] : []))]]);
    const s = T.camp[k], partner = s.who.find(w => w !== id);
    let back = null;
    if (partner !== lead()) {
      const a = sc.actors[partner]; back = [a.x, a.y, a.face];
      const [x, y] = beside(id);
      await walkTo(partner, x, y);
      faceTo(partner, id); faceTo(id, partner);
    }
    AU.music('town');
    await say(s.lines);
    setFlag('s_' + k);
    U.system('[CAMP] ' + s.title.toUpperCase(), leadScenesDone() && !f.brief ? 'Freya is ready for you at her pavilion.' : 'A scene from their story.');
    if (back) { await walkTo(partner, back[0], back[1]); sc.actors[partner].face = back[2]; }
  }
  async function wake() {
    const P = sc.P;
    P.face = 'north';
    await wait(400);
    await walkTo('freya', P.x, P.y - 1, 3.6);
    faceTo('freya', 'you');
    AU.music('goddess');
    await say(T.wake);
    setFlag('intro');
    await walkTo('freya', 9, 6, 3.6);
    sc.actors.freya.face = 'south';
    AU.music('town');
  }
  async function freyaTalk() {
    const f = c1().f;
    if (!f.cart) return say(T.cartNag);
    if (!leadScenesDone()) return say(T.freyaWait);
    if (f.brief) return say([['freya', 'Off you go, sweetie. East!']]);
    AU.music('goddess');
    // Everyone gathers round.
    const spots = [[7, 7], [10, 7], [8, 8]];
    await Promise.all(others().map((id, i) => walkTo(id, spots[i][0], spots[i][1])));
    others().forEach(id => faceTo(id, 'freya'));
    await say(T.brief);
    const card = T.leads[lead()].card;
    c1().deck.push({ id: card, up: false });
    S.seeConcept('roles');
    const n = U.cardNums(card);
    U.system('NEW CARD: ' + SD.cards[card].name.toUpperCase(), U.esc(SD.cards[card].text.replace(/\{(\w+)\}/g, (_, k) => n[k] != null ? n[k] : '')), 'gold');
    await say(T.mission);
    setFlag('brief');
    AU.music('town');
    U.system('[QUEST] THE TEMPLE OF UPTIME', 'Take the road east, past Brookfall. Your party follows you.', 'gold');
    trail.length = 0;
    applyState();
  }
  async function cart() {
    const f = c1().f;
    if (f.cart) return say([['narr', 'The cart is open, and someone has restocked it already. There\'s a little card on top: "Help yourself! xx F."']]);
    await say(T.cartLocked);
    storyFight('lockeddoor', { single: true, log: 'Your kit is in the cart. Play a card to open it.' }, async () => {
      c1().deck.push({ id: 'blessing', up: false });
      setFlag('cart');
      applyState();
      const P = sc.P; await walkTo('freya', P.x + 1, P.y, 4); faceTo('freya', 'you'); faceTo('you', 'freya');
      AU.music('goddess');
      await say(T.cartWon);
      U.system('[CAMP] SAY GOOD MORNING', 'Everyone with a "!" has a scene with you. Then see Freya.');
      await walkTo('freya', 9, 6, 4); sc.actors.freya.face = 'south';
      AU.music('town');
    });
  }

  // ---------- The road ----------
  async function kyuScene() {
    const P = sc.P;
    await wait(300);
    AU.music('kyu');
    faceTo('you', 'kyu');
    await say(T.kyu);
    setFlag('kyu');
    await walkTo('kyu', 46, 9, 3);
    sc.actors.kyu.hidden = true;
    U.system('KYU\'S NOTE', U.esc(T.kyuNote));
    await say(T.kyuAfter);
    AU.music('journey');
    void P;
  }
  async function wrenScene() {
    AU.music('quest');
    await walkTo('wren', 38, 9, 3);
    faceTo('wren', 'you'); faceTo('you', 'wren');
    await say(T.wren);
    storyFight('faithful', { single: true, diagnose: true, back: [34, 9] }, async () => {
      setFlag('shrine');
      faceTo('wren', 'you');
      await say(T.wrenWon);
      await walkTo('wren', 40, 7, 3); sc.actors.wren.face = 'south';
      ['f1', 'f2', 'f3'].forEach(id => { sc.actors[id].face = 'south'; });
      W1.fade = 0.55; await wait(500);
      await say(T.guilty);
      setFlag('guilty');
      W1.fade = 0;
      U.system('[QUEST] THE TEMPLE GATE', 'East of Brookfall. Pick the right mask.', 'gold');
    });
  }
  async function gate() {
    const f = c1().f;
    if (f.gate) return;
    if (!f.shrine) return say([['narr', 'The gate is shut. Four masks hang beside it.']]);
    AU.music('goddess');
    await say(T.gate);
    const q = SD.questions.find(x => x.id === 'q-mask');
    S.seeConcept('roles');
    for (;;) {
      const r = await Q.ask(q, { title: 'THE TEMPLE GATE', context: 'Which mask opens it?' });
      if (r.ok) break;
      await say(T.gateWrong);
    }
    AU.sfx('door');
    setFlag('gate');
    applyState();
    await say(T.gateOpen);
    AU.music('quest');
  }
  function enterTemple() {
    return new Promise(res => {
      const b = U.panel(`<p>Go into the Temple of Uptime?</p><p class="muted small">This is chapter 1's dungeon: a few rooms of incidents, then Uptima's sanctum. Your deck has ${c1().deck.length} cards.</p>
        <div class="row"><button class="primary" id="tm-y">Go in</button><button class="ghost" id="tm-n">Not yet</button></div>`, { title: 'THE TEMPLE OF UPTIME', noClose: true });
      b.querySelector('#tm-n').onclick = () => { U.closePanel(); sc.place('you', 59, 8); sc.P.face = 'south'; res(); };
      b.querySelector('#tm-y').onclick = () => { U.closePanel(); c1().pos = [59, 8]; S.persist(); W1.halt(); R.start(1); res(); };
    });
  }

  // ---------- Story fights in the overworld ----------
  let after = null;
  function storyFight(eid, opts, onWin) {
    after = { eid, opts, onWin };
    W1.halt();
    R.storyFight(1, eid, opts, c1().deck, deck => {
      c1().deck = deck; S.persist(); after = null;
      W1.enter();
      act(onWin);
    });
    if (S.save.run) S.save.run.gary = true;
  }
  async function storyLost() {
    const back = after && after.opts.back;
    after = null;
    W1.enter();
    if (back) sc.place('you', back[0], back[1]);
    await act(() => say(T.lostStory));
  }

  // ---------- Choosing your lead, and the prologue ----------
  function choose() {
    return new Promise(res => {
      const b = U.panel(`<p class="small">Freya answered four prayers. Whose story do you want to start with? The other three are in her camp either way.</p>
        <div class="c1-leads">${T.order.map(id => { const l = T.leads[id]; return `<button class="c1-lead" data-lead="${id}"><img src="${l.img}" alt=""><span class="c1-txt"><b>${U.esc(l.name)}</b><span class="muted small">${U.esc(l.title)} · ${l.age}</span><span class="small">${U.esc(l.blurb)}</span><i class="small">Prayed: "${U.esc(l.prayer)}"</i></span></button>`; }).join('')}</div>`,
      { title: 'WHOSE PRAYER?', noClose: true, cls: 'wide' });
      b.querySelectorAll('[data-lead]').forEach(el => el.onclick = () => { AU.sfx('ok'); U.closePanel(); res(el.dataset.lead); });
    });
  }
  function begin(id) {
    S.save.c1 = { lead: id, f: {}, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: [9, 10] };
    S.save.name = T.leads[id].name.split(' ')[0];
    S.save.flags.prologue = true;
    S.persist();
    sc = null;
  }
  W1.newGame = async function () {
    begin(await choose());
    U.stage('dream');
    AU.music('story');
    await say(T.prologue[lead()]);
    U.stage(null);
    W1.enter();
    await act(wake);
  };
  W1.resume = function () {
    const sv = S.save;
    if (!sv.c1 || !sv.c1.lead) return W1.newGame();
    if (sv.run && !sv.run.story) { dress(); return R.resume(); }
    if (sv.run) { sv.run = null; S.persist(); }
    if (flag('done')) return endCard();
    W1.enter();
    if (!flag('intro')) act(wake);
  };

  // ---------- Entering and leaving the world screen ----------
  function dress() {
    const l = T.leads[lead()];
    document.body.dataset.lead = lead();
    document.body.style.setProperty('--lead-img', `url(${l.img})`);
  }
  W1.enter = function () {
    dress();
    SD.main.show('world');
    if (!sc) makeScene(); else applyState();
    zone = null; lastTile = '';
    sc.start();
    hint();
  };
  W1.halt = function () { if (sc) { sc.stop(); sc.locked = false; } };
  function hint() {
    if (flag('hinted')) return;
    setFlag('hinted');
    U.system('HOW TO MOVE', 'Arrow keys or WASD to walk, E or Enter to talk. Or tap where you want to go, and tap someone to talk to them.');
  }
  function objective() {
    const f = c1().f;
    if (!f.cart) return 'Open the supply cart by the fire';
    if (!f.brief && !leadScenesDone()) return 'Say good morning to everyone with a "!"';
    if (!f.brief) return 'See Freya at her pavilion';
    if (!f.kyu) return 'Take the road east';
    if (!f.shrine) return 'Go through Brookfall';
    if (!f.gate) return 'Open the temple gate';
    return 'Enter the Temple of Uptime';
  }
  function hud() {
    const el = $('#w-hud'); if (!el) return;
    const sv = S.save, need = S.xpFor(sv.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${U.esc(l.name.split(' ')[0])}</b> · Lv ${sv.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${U.esc(objective())}</span>
      <span class="w-sp"></span>
      <button class="ghost" id="w-deck">Deck (${c1().deck.length})</button>
      <button class="ghost" id="w-codex">Cheat sheet</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      <button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    $('#w-deck').onclick = () => U.panel(`<div class="cardgrid">${c1().deck.map(c => U.cardHtml(c)).join('')}</div>`, { title: 'YOUR DECK', cls: 'wide' });
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
  }
  W1.hud = hud;

  // ---------- The dungeon ----------
  CH.mercy = T.mercy;
  CH.gary = false;
  // Your share of the cost of a card (as the combat computes it), for handing it back.
  const costOf = (c, d) => d.cost - (c.up && d.cost > 1 && !d.abs && !d.mit ? 1 : 0);
  const KYU = ['finddeny', 'unmaking', 'deletestmt'];
  CH.hooks = {
    start(run) {
      run.deck = c1().deck.map(c => ({ id: c.id, up: !!c.up }));
      run.gary = true;
      const N = (id, f, lane, type, next, eid) => ({ id, f, lane, type, next, eid });
      run.map = { floors: [
        [N('0-0', 0, 0, 'fight', ['1-0', '1-2'], 'wrongmask'), N('0-2', 0, 2, 'fight', ['1-2'], 'warden')],
        [N('1-0', 1, 0, 'event', ['2-0']), N('1-2', 1, 2, 'fight', ['2-0', '2-2'], 'wrongmask')],
        [N('2-0', 2, 0, 'elite', ['3-1'], 'sentinel'), N('2-2', 2, 2, 'camp', ['3-1'])],
        [N('3-1', 3, 1, 'boss', [])]
      ] };
      dress();
    },
    hud() { return `<span class="hud-chip">${U.esc(T.leads[lead()].name)}</span>`; },
    node(n, done) {
      if (n.eid) { R.api.fight(n.eid, { diagnose: true, elite: n.type === 'elite' }, done); return true; }
      if (n.type === 'camp') { chapel(done); return true; }
      return false;
    },
    boss() { sanctum(); return true; },
    async play(C, c, d) {
      // The locked cart: nothing is allowed until Freya's blessing.
      if (C.eid === 'lockeddoor' && !C.granted) {
        if (c.id === 'blessing') { C.granted = true; C.log = 'Allow * on *. Everything you play works now.'; return false; }
        C.energy += costOf(c, d);
        C.log = `AccessDenied. No policy allows ${d.name} yet, and everything starts implicitly denied.`;
        AU.sfx('resist'); U.float($('.foe'), 'DENIED', 'res');
        if (!C.blessed) {
          C.blessed = true; C.busy = true;
          renderLater(C);
          await wait(500);
          await say(T.cartBless);
          C.hand.push({ id: 'blessing', up: false, uid: 998 });
          C.busy = false;
        }
        return true;
      }
      // Uptima: a new session is one her revoke can't touch.
      if (C.eid === 'uptimaboss' && (d.tags || []).some(t => t === 'fresh' || t === 'assume')) { C.fresh = true; return false; }
      // Kyu: an explicit Deny. Only finding it, unmaking her blessings and deleting the line get anywhere.
      if (C.eid === 'kyu') {
        const step = C.kstep || 0;
        if (c.id !== KYU[step]) { C.energy += costOf(c, d); C.log = rnd(T.kyuDeny); AU.sfx('resist'); U.float($('.foe'), 'DENIED', 'res'); return true; }
        if (step === 2) { C.busy = true; await say(T.kyuChoose); C.busy = false; C.kstep = 3; return false; }
        C.energy += costOf(c, d); C.busy = true;
        await say(step === 0 ? T.kyuFind : T.kyuUnmake);
        C.busy = false;
        if (step === 1) S.save.run.sla = Math.max(1, S.save.run.sla - 2);
        R.api.mitigate(15, step === 0 ? 'Found it: one statement, Sid "Kyu".' : 'Her blessings come apart in Kai\'s hand. He feels every one.', 'crit');
        C.kstep = step + 1;
        C.hand.push({ id: KYU[C.kstep], up: false, uid: 990 + C.kstep });
        return true;
      }
      return false;
    },
    intent(C, it) {
      if (it.t === 'no') return { dmg: 0, note: '"No." ' };
      if (it.t !== 'revoke') return null;
      if (C.fresh) { C.fresh = false; return { dmg: 0, note: 'She revokes every session issued before now. Yours is newer: nothing happens. ' }; }
      const lost = C.infra.length;
      C.disc.push(...C.infra); C.infra = [];
      const dmg = R.api.absorb(Math.round((it.n + C.rage) * C.mercyScale), [['any', 1], ['read', 1], ['write', 1]]);
      return { dmg, note: `She revokes your session. Every request signed with it fails${lost ? `, and ${lost} infra card${lost > 1 ? 's go' : ' goes'} dark` : ''}. ` };
    },
    combatWire(C, el, rerender) {
      if (C.eid !== 'kyu' || C.over || C.busy) return;
      C.deepAsked = true;
      const want = KYU[C.kstep || 0];
      if (!want || C.hand.some(h => h.id === want)) return;
      for (const pile of [C.draw, C.disc, C.exh]) { const i = pile.findIndex(h => h.id === want); if (i >= 0) { C.hand.push(pile.splice(i, 1)[0]); return rerender(); } }
      C.hand.push({ id: want, up: false, uid: 990 + (C.kstep || 0) });
      rerender();
    },
    end(won, incident, quit) {
      const run = S.save.run;
      S.save.run = null; S.persist();
      if (run && run.story) { storyLost(); return true; }
      if (won) { ending(); return true; }
      S.save.loop++; S.persist();
      W1.enter();
      sc.place('you', 59, 9); sc.P.face = 'north';
      act(() => say(quit ? [['freya', 'Back already, sweetie? The temple will keep.']] : T.lostRun));
      return true;
    }
  };
  const renderLater = C => setTimeout(() => { if (!C.over) R.api.renderCombat(); }, 0);

  // A side chapel instead of the first game's break room.
  function chapel(done) {
    const run = S.save.run, heal = Math.round(S.maxSla() * 0.3);
    const b = U.panel(`<p>A side chapel with a bench, and a sample tray on it with a card: "For my brigade! xx F." Everyone sits down at once.</p>
      <div class="opts"><button class="opt" id="ch-rest"><b>Rest</b> · Mira patches everyone up: recover ${heal} SLA</button>
      <button class="opt" id="ch-up"><b>Practise</b> · Seo-yeon runs forms: upgrade a card (+3 to its numbers)</button></div>`, { title: 'THE SIDE CHAPEL', noClose: true });
    b.querySelector('#ch-rest').onclick = () => { run.sla = Math.min(S.maxSla(), run.sla + heal); AU.sfx('heal'); S.persist(); U.closePanel(); done(); };
    b.querySelector('#ch-up').onclick = () => R.api.pickCard('Upgrade which card?', c => { c.up = true; S.persist(); U.closePanel(); U.system('CARD UPGRADED', U.esc(SD.cards[c.id].name) + '+'); done(); }, () => chapel(done), c => !c.up && SD.cards[c.id].rarity);
  }

  // Uptima's sanctum: her confession, Freya's three steps, then the fight.
  async function sanctum() {
    U.stage('sanctum');
    AU.music('boss');
    await say(T.sanctum);
    const d = SD.bossDesign.uptimaboss;
    d.concepts.forEach(c => S.seeConcept(c));
    const buffs = { sevScale: 1, bonusEnergy: 0, startCard: null };
    const r1 = await Q.ask(Object.assign({ type: 'multi', hint: 'Pick everything it takes. Leave out what doesn\'t belong.' }, d.req), { title: '[BOSS] REQUIREMENTS', context: 'Freya, in your ear · 1 of 3' });
    if (r1.ok) { buffs.sevScale = 0.85; U.system('SCOPE LOCKED!', 'Clear requirements: Uptima starts 15% weaker.', 'gold'); }
    const r2 = await Q.ask(Object.assign({ type: 'num' }, d.est), { title: '[BOSS] ESTIMATION', context: 'Freya, in your ear · 2 of 3' });
    if (r2.ok) { buffs.bonusEnergy = 1; U.system('NUMBERS IN HAND!', '+1 Capacity on turn 1.', 'gold'); }
    const r3 = await Q.ask(Object.assign({ type: 'mc' }, d.design), { title: '[BOSS] DESIGN', context: 'Freya, in your ear · 3 of 3' });
    if (r3.ok) { buffs.startCard = d.startCard; U.system('DESIGN READY!', 'Fresh Session starts in your hand.', 'gold'); }
    S.save.run.boss = { r1: r1.ok, r2: r2.ok, r3: r3.ok };
    S.persist();
    U.stage(null);
    U.system('[BOSS] UPTIMA', U.esc(T.uptimaFight), 'gold');
    R.api.fight('uptimaboss', { boss: true, reveal: r1.ok || r3.ok, sevScale: buffs.sevScale, bonusEnergy: buffs.bonusEnergy, startCard: buffs.startCard }, kyuNight);
  }
  async function kyuNight() {
    U.stage('sanctum');
    AU.music('kyu');
    await say(T.uptimaDown);
    U.stage(null);
    U.system('[BOSS] KYU', U.esc(T.kyuFight), 'gold');
    R.api.fight('kyu', { boss: true, single: true, reveal: true, startCard: 'finddeny' }, () => R.api.endRun(true));
    AU.music('kyuboss');
    const C = R.api.combat();
    C.kstep = 0; C.deepAsked = true;
  }

  // ---------- The ending ----------
  async function ending() {
    setFlag('done');
    S.save.flags.ch1 = true; S.save.stats.wins++; S.persist();
    U.stage('sanctum');
    AU.music('kyusad');
    await say(T.ending);
    U.system('[SYSTEM] ADMIN CHANGED', 'Root user: Freya.', 'red');
    await wait(900);
    U.system('[SYSTEM] BACKUPS DELETED', 'Every backup in the Cloud, from every Region. Retention: none.', 'red');
    await wait(1200);
    await say(T.wipe);
    await say(T.basket);
    U.stage('edge');
    AU.music('kyu');
    await say(T.edge);
    endCard();
  }
  function endCard() {
    if ($('#stage').hidden) U.stage('edge');
    // The card stands in front of an empty edge; whoever spoke last steps off.
    const a = $('#stage .actor'); if (a) a.hidden = true;
    const b = U.panel(`<div class="verdict ok">END OF CHAPTER 1</div>
      <p>Thanks for playing the demo. Chapter 2 opens here at the edge of the Cloud, on the night after the wipe.</p>
      <p class="muted small">You played ${U.esc(T.leads[lead()].name)}. The scenes change with your lead, and every kindness Freya does you quotes your prayer back.</p>
      <div class="row"><button class="primary" id="c1-again">Play again as someone else</button><button class="ghost" id="c1-title">Title</button></div>`, { title: 'DEMO COMPLETE', noClose: true });
    b.querySelector('#c1-again').onclick = () => { U.closePanel(); U.stage(null); S.save.c1 = null; S.persist(); W1.newGame(); };
    b.querySelector('#c1-title').onclick = () => { U.closePanel(); U.stage(null); SD.main.title(); };
  }

  // For tools/ch1_check.js: jump the story forward.
  W1.debug = { busy: () => busy, flags: f => { Object.assign(c1().f, f); S.persist(); if (sc) applyState(); }, place: (x, y) => sc && sc.place('you', x, y), scene: () => sc, act, say };
})();
