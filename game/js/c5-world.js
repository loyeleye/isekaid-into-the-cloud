// Chapter 5, the Machine Floors (floors 61 to 80): the explorable chapter, from the cold open to the end card.
// One map, four places:
//   The Free Cloud's camp            at the tower's foot, where the chapter starts: the first night (Seymour's tapes),
//                                    Ship It, the Design Board, and later Ayo's forge, Kaito, Pella and Cron
//   Floor 61, the Arcanum's city     up the lift: the wanted posters and Lord Ashgrove, Iris and her lantern students,
//                                    the Crown's old station (Freya's offer, the station steps), the Astronomy Tower
//   The Workshops (east)             the gate's purchase ledger, Kyu's page on the forge door, Expedition I
//   The undercroft (south)           the janitor's closet, its lower stair in Freya's chain, Expedition II
// Knowledge opens the way: each gate is a minigame (js/c5-games.js), and a gate you've understood stays open. Eight
// pages of Lina's diary lie about as collectibles, each with a quick recall question (half on earlier chapters). The
// expeditions are raid-engine dungeons (js/raid.js, data in js/c5-data.js), played solo with the other three as bots
// or in a party with friends (as the Deny Mines), with Seymour's Tapes (js/tapes.js): on the first night Freya's
// midnight redeploy overwrites half of them, and from this chapter on fewer can play on one expedition. The trial's ledgers, the confrontation and
// the traffic bar play from cues in the floors' intros and outros.
// Plays standalone with window.SD_CH = 5 or ?vector&ch5; SD.chapterStart[5] starts it from another chapter, and the
// end card hands over to SD.chapterStart[6] when that's loaded. Saves in S.save.c5.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const CH5 = String(window.SD_CH) === '5' || /[?&]ch5\b/.test(location.search);
  const W = SD.c5world = { on: false, active: false };
  const U = SD.ui, S = SD.state, AU = SD.audio, R = SD.run, T = SD.ch1story, A = SD.c5art, G = SD.c5games, D = SD.c5data;
  const $ = U.$, esc = s => U.esc(s);
  const rnd = a => a[Math.floor(Math.random() * a.length)];

  // ---------- Save ----------
  const c5 = () => S.save.c5 || (S.save.c5 = { f: {}, w: { x: {}, pos: null, pages: [], cards: [], miss: [] }, choice: null });
  const w = () => c5().w;
  const c1 = () => S.save.c1 || {};
  const flag = k => !!w().x[k];
  const setFlag = k => { w().x[k] = true; S.persist(); };
  const lead = () => c1().lead || 'dutch';
  const others = () => T.order.filter(id => id !== lead());
  // Music: this chapter's own songs once they're loaded (js/audio-chapters.js), else the nearest older one.
  const FB = { c5town: 'town', c5explore: 'explore', c5dungeon: 'map4', c5boss: 'boss', c5culprit: 'boss', c5sad: 'kyusad', c5clock: 'story' };
  const mus = k => AU.music(AU.has && AU.has(k) ? k : (FB[k] || k));
  const sfx = k => { try { AU.sfx(k); } catch (e) {} };

  // Lines: [who, text, face]. who 'lead' is you; text can be { dutch: ..., other: ... } for the lead's own words.
  const pick = t => (t && typeof t === 'object' ? (t[lead()] || t.other) : t);
  const L = lines => lines.map(([s, t, e]) => ({ s: s === 'lead' ? lead() : s || 'narr', t: pick(t), e }));
  const say = lines => U.dialog(L(lines));
  // The chapter's scenes are named with cut.def, for the cutscene viewer (js/reel.js), and played with cut.play.
  const cut = SD.reel.chapter('5', { music: k => mus(k) });
  const vn = steps => steps.map(s => {
    if (!Array.isArray(s)) return s;
    if (s[0] === 'show' || s[0] === 'hide') return [s[0], s[1] === 'lead' ? lead() : s[1]].concat(s.slice(2));
    if (['bg', 'cg', 'fx', 'wait', 'narr'].includes(s[0])) return s[0] === 'narr' ? ['narr', pick(s[1])] : s;
    return [s[0] === 'lead' ? lead() : s[0], pick(s[1]), s[2]];
  });


  // ---------- The map ----------
  const MW = 64, MH = 42;
  // [x0, y0, x1, y1, id, banner, music, ambience, ground]
  const ZONES = [
    [1, 4, 14, 20, 'camp', 'The Free Cloud\'s camp · the tower\'s foot', 'camp', 'crickets', 'g'],
    [18, 1, 46, 24, 'city', 'Floor 61 · The Arcanum\'s city', 'c5town', 'clock', 'c'],
    [50, 1, 62, 24, 'shops', 'The Workshops', 'c5explore', 'fire', 'i'],
    [22, 28, 42, 40, 'under', 'The undercroft · the janitor\'s closet', 'c5explore', 'rumble', 'p']
  ];
  const ROCKZ = [0, 0, 0, 0, 'rock', '', null, null, 'c'];
  const zoneAt = (x, y) => ZONES.find(z => x >= z[0] && x <= z[2] && y >= z[1] && y <= z[3]) || ROCKZ;
  const PROPS = [], PROP = {};
  const BASE = (function build() {
    const m = Array.from({ length: MH }, () => Array(MW).fill('T'));
    const fill = (x0, y0, x1, y1, c) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) m[y][x] = c; };
    const set = (x, y, c) => { m[y][x] = c; };
    ZONES.forEach(z => fill(z[0], z[1], z[2], z[3], z[8]));
    // Paths: the city's avenue east to the Workshops, the square's stair south to the undercroft, the tower road.
    fill(18, 12, 49, 12, ','); fill(31, 7, 31, 27, ','); fill(40, 7, 40, 12, ','); fill(21, 12, 21, 19, ',');
    fill(50, 12, 56, 12, ','); fill(56, 3, 56, 12, ','); fill(56, 4, 59, 4, ',');
    fill(31, 28, 31, 36, ','); fill(31, 36, 36, 36, ',');
    fill(9, 12, 14, 12, ',');
    // Flowers in the camp and round the city's square.
    fill(2, 18, 5, 19, 'f'); [[29, 10], [33, 10], [29, 14], [33, 14], [44, 20], [19, 21]].forEach(([x, y]) => set(x, y, 'f'));
    // The corridors between places (rock either side) and their gates.
    set(47, 12, ','); set(48, 12, 'G'); set(49, 12, ',');
    set(31, 25, ','); set(31, 26, 'G'); set(31, 27, ',');
    // The Workshops: the forge's inner wall and its door.
    fill(50, 8, 62, 8, 'T'); set(56, 8, 'G');
    // The undercroft: the chained lower stair.
    set(36, 37, 'G');
    // Doors: the lift (city L, camp M).
    set(19, 11, 'L'); set(14, 12, 'M');
    const prop = (id, kind, x, y, wd, h, more, solid) => {
      const p = Object.assign({ id, kind, x, y, w: wd, h }, more);
      PROPS.push(p); PROP[id] = p;
      if (solid !== false) for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + wd; xx++) if (m[yy][xx] !== 'G') m[yy][xx] = '#';
      return p;
    };
    // Camp.
    prop('liftC', 'lift', 14, 11, 1, 1);
    prop('fire', 'campfire', 7, 12, 1, 1, { lit: true });
    prop('tent1', 'tent', 2, 5, 2, 2); prop('tent2', 'tent', 10, 5, 2, 2);
    prop('ship', 'desk', 5, 9, 1, 1);
    prop('dboard', 'board', 11, 9, 1, 1);
    prop('seat1', 'bench', 6, 13, 1, 1, null, false); prop('seat2', 'bench', 8, 13, 1, 1, null, false);
    prop('cforge', 'campforge', 2, 12, 1, 1);
    prop('machines', 'machines', 11, 14, 2, 2);
    prop('carrel', 'carrel', 4, 16, 1, 1);
    prop('clock', 'clock', 9, 18, 1, 1);
    // The city.
    prop('liftT', 'lift', 19, 10, 1, 1);
    prop('arcanum', 'arcanum', 22, 2, 8, 4);
    prop('bell', 'bell', 33, 2, 2, 3);
    prop('tower', 'tower', 39, 1, 4, 6, { label: 'ASTRONOMY TOWER', open: true });
    prop('station', 'station', 20, 15, 5, 3);
    prop('steps', 'steps', 20, 18, 3, 1, null, false);
    prop('post1', 'poster', 22, 11, 1, 1); prop('post2', 'poster', 27, 13, 1, 1); prop('post3', 'poster', 36, 17, 1, 1); prop('post4', 'poster', 44, 9, 1, 1);
    prop('lamp1', 'lamp', 30, 9, 1, 1); prop('lamp2', 'lamp', 36, 13, 1, 1); prop('lamp3', 'lamp', 25, 20, 1, 1); prop('lamp4', 'lamp', 41, 15, 1, 1);
    prop('bench1', 'bench', 34, 20, 1, 1); prop('bench2', 'bench', 26, 9, 1, 1, null, false);
    // The Workshops.
    prop('forge', 'forge', 51, 2, 5, 3);
    prop('xp1', 'raidgate', 58, 2, 4, 2, { label: 'EXP. I', open: true });
    prop('anvil1', 'anvil', 52, 16, 1, 1, { lit: true }); prop('anvil2', 'anvil', 55, 19, 1, 1); prop('anvil3', 'anvil', 59, 17, 1, 1, { lit: true });
    prop('crates1', 'crates', 60, 21, 1, 1); prop('crates2', 'crates', 51, 22, 1, 1);
    // The undercroft.
    prop('shelf1', 'shelf', 23, 29, 2, 2); prop('shelf2', 'shelf', 26, 29, 2, 2); prop('shelf3', 'shelf', 35, 29, 2, 2); prop('shelf4', 'shelf', 38, 29, 2, 2);
    prop('shelf5', 'shelf', 23, 34, 2, 2); prop('mop', 'mop', 33, 33, 1, 1);
    prop('xp2', 'stairdown', 35, 38, 3, 2, { label: 'EXP. II', chained: true });
    // The raid doors: the Workshops' gate, the lower stair, the tower.
    m[3][59] = '1'; m[3][60] = '1'; m[38][36] = '2'; m[6][40] = '3'; m[6][41] = '3';
    return m.map(r => r.join(''));
  })();
  // The knowledge gates: id -> [x, y, label, colour, game].
  const GATES = { gwork: [48, 12, 'PAY', '#8a4a3a', 'buy'], gforge: [56, 8, 'KYU', '#6a4a8a', 'metric'], gcloset: [31, 26, 'CLOSET', '#3a5a6a', 'trail'],
    gchain: [36, 37, 'CHAINED', '#2c8a4b', null] };
  Object.keys(GATES).forEach(id => { const [x, y, label, col] = GATES[id]; PROPS.push(PROP[id] = { id, kind: 'kgate', x, y, w: 1, h: 1, label, col }); });
  // Pages of Lina's diary: [x, y, concept for its recall question (null: an older lesson that's due), the page].
  const PAGES = [[13, 19, null, 'Week one at the Arcanum. "Dad says read the record before the face. I read the timetable. It was wrong."'],
    [45, 2, 'scaling', 'A sketch of the Forge. "Ayo says more anvils, not bigger ones. He shouted it. He shouts everything."'],
    [19, 23, null, '"Tapped 3-1-4 on the dorm wall tonight. Nobody tapped back. I miss the kitchen."'],
    [61, 22, 'ec2buy', '"The workshop lamps run all night for nobody. I told the bursar. He said that\'s how it\'s always been paid for."'],
    [61, 10, null, '"Professor Vell lent me her lantern. Everyone wants one. I don\'t think you should have to earn the light."'],
    [23, 39, 'trailproof', '"The wards see the doors, not the pages. Somebody should fix that. I\'m somebody."'],
    [41, 30, null, '"Theo says the staff stair is the only quiet place in the tower. That\'s what worries me."'],
    [44, 23, 'tracing', 'The last page before the cipher. "If Dad were here he\'d follow it one hop at a time. So I am."']];
  const pageHere = i => !w().pages.includes(i);

  // ---------- The scene ----------
  let sc = null, busy = false, zone = null, lastTile = '';

  // ---------- The Version Lens: release (js/lens.js) ----------
  // On the Machine Floors the lens shows what's really deployed behind a name: the digest under a tag that moved, an
  // alias's weighted split, which alias a stage variable points at, and, in the janitor's closet, whether the record
  // of who deployed it is still the record CloudTrail wrote.
  const LW = SD.lens.world({ mode: 'RELEASE', save: c5, busy: () => busy, scene: () => sc, act: fn => act(fn), redraw: () => applyState(), flag,
    intro: ['THE LENS · RELEASE', 'On the Machine Floors the lens shows what\'s really running behind a name: the image under a tag, the versions behind an alias, the stage behind a URL.'],
    spots: {
      station: { x: 25, y: 18, label: 'The station\'s engine', mark: '⧉', need: ['offer'], spot: { title: 'THE STATION\'S ENGINE', concept: 'containers',
        intro: 'The Crown\'s old station runs on containers, and its task definition names the image my-station:latest. The tasks started yesterday. Overnight, Freya\'s pipeline pushed a new image and moved latest onto it.',
        q: 'Which image are the running tasks using now?',
        opts: [{ t: 'Yesterday\'s: the tag was resolved when they started', ok: true },
          { t: 'The new one, since latest points at it now', no: 'A running container never swaps its image. Moving a tag only changes what the next pull gets.' },
          { t: 'Neither: ECS stops tasks whose tag has moved', no: 'Nothing stops them. They keep running yesterday\'s image until they\'re replaced.' },
          { t: 'Whichever image was first ever tagged latest', no: 'A tag points at one image at a time. When the tasks started, it pointed at yesterday\'s.' }],
        view: { head: 'my-station · what\'s really running', rows: [['latest (now)', 'sha256:9f2c… pushed 02:14 by Freya\'s pipeline'], ['Running tasks', 'sha256:41ab… yesterday\'s image'], ['Next task to start', 'sha256:9f2c…']],
          note: 'Name an image by its digest (my-station@sha256:…) and it can never change under you. ECR\'s tag immutability setting stops anyone pushing over a tag.' },
        why: 'A tag is a name that can be moved; a digest is the image\'s own fingerprint and can\'t. A task gets whatever image its tag points at when it starts, so two tasks from one task definition can run different code. Pin the digest, or turn on tag immutability, so a name always means one image.' } },
      alias: { x: 4, y: 10, label: 'The order function\'s alias', mark: '⑂', need: ['ship'], spot: { title: 'THE ORDER FUNCTION\'S ALIAS', concept: 'shifting',
        intro: 'The pipeline at Ship It publishes the order function and shifts traffic slowly. Right now the alias live sends 90% to version 6 and 10% to version 7.',
        q: 'A customer calls the live alias. Which code runs?',
        opts: [{ t: 'Version 6 nine times in ten, version 7 one in ten', ok: true },
          { t: 'Always version 7, the newest', no: 'The alias decides, not the version number. It sends version 7 only a tenth of the calls.' },
          { t: '$LATEST, whatever was last saved', no: '$LATEST runs only on an unqualified call or one that names it. A weighted alias can\'t point at $LATEST at all.' },
          { t: 'Both versions, one after the other', no: 'Each call goes to one version. The weights decide which.' }],
        view: { head: 'order-fn:live · routing', rows: [['version 6', 'weight 0.9'], ['version 7', 'weight 0.1'], ['$LATEST', 'not in the alias']],
          note: 'CodeDeploy\'s Canary10Percent5Minutes leaves it like this for five minutes, then moves the rest, unless an alarm rolls it back.' },
        why: 'An alias is a name for a published version, and it can split calls between two versions by weight. Callers keep calling the alias while the weights move, which is how CodeDeploy runs a canary or linear deployment for Lambda. Both versions must be published; $LATEST can\'t be in a weighted alias.' } },
      bell: { x: 35, y: 5, label: 'The lecture bell\'s rope', mark: '⇄', need: ['iris'], spot: { title: 'THE LECTURE BELL\'S ROPE', concept: 'stages',
        intro: 'The lecture bell\'s API has two stages, prod and beta, and one integration: the function bell:${stageVariables.alias}. Stage prod sets alias to live; stage beta sets it to dev.',
        q: 'A request comes in on the beta stage\'s URL. Which alias answers it?',
        opts: [{ t: 'dev, from the beta stage\'s variable', ok: true },
          { t: 'live, since prod is the default stage', no: 'There\'s no default stage. Each stage has its own URL and its own variables.' },
          { t: 'Neither, until the API is deployed again', no: 'Stage variables are read on each request. Changing one takes effect without a new deployment.' },
          { t: 'Each alias half the time', no: 'That would be a canary on the stage, a separate setting. This stage has none.' }],
        view: { head: 'bell-api · stages', rows: [['Integration', 'function bell:${stageVariables.alias}'], ['prod', 'alias = live'], ['beta', 'alias = dev']],
          note: 'API Gateway needs permission to invoke each alias it might point at: one statement in the function\'s resource-based policy per alias.' },
        why: 'A stage variable is a setting on a stage that the API reads on every request. One deployment can serve prod and beta and point each stage at a different alias, endpoint or Lambda version, just by giving the stages different variables.' } },
      closet: { x: 28, y: 32, label: 'The janitor\'s ledger', mark: '✓', need: ['trail'], spot: { title: 'THE JANITOR\'S LEDGER', concept: 'trailproof',
        intro: 'The janitor keeps every call the tower makes: CloudTrail\'s log files, in a bucket nobody reads. Dutch: "Nobody looks at the janitor. That\'s the whole plan." Last night\'s redeploy rewrote one file, to hide who ran it. The trail has log file validation turned on.',
        q: 'How do you prove that file was changed?',
        opts: [{ t: 'Validate it against CloudTrail\'s signed digest files', ok: true },
          { t: 'You can\'t: whoever can write the bucket can rewrite the record', no: 'They can rewrite the file, but not the digest that CloudTrail signed when it was delivered. The hashes won\'t match.' },
          { t: 'Turn validation on now, then check last night', no: 'Validation only covers files delivered after it was turned on. Here it was on already, which is the point.' },
          { t: 'Ask CloudTrail to send the original file again', no: 'CloudTrail delivers each log file once. Proving it changed is what the digests are for.' }],
        view: { head: 'trail · validate-logs', rows: [['Digest files', 'one an hour, signed by CloudTrail'], ['0200–0300 digest', 'valid, chained to the hour before'], ['0214 log file', 'INVALID: hash value doesn\'t match']],
          note: 'Deleting the digest too doesn\'t help: each digest names the one before it, so a missing one shows.' },
        why: 'With log file validation on, CloudTrail delivers a digest file every hour. It holds a SHA-256 hash of each log file delivered that hour, is signed with CloudTrail\'s private key, and refers to the digest before it. aws cloudtrail validate-logs checks every file and digest in a range and names any that were changed or deleted.' } }
    } });

  // ---------- Weather ----------
  // By zone (js/weather.js): a drizzle over the Arcanum's city, rippling on the cobbles; sparks off the Workshops'
  // forge and a little soot in the air; dust hanging in the undercroft's green lamplight; and embers off the camp's
  // fire. The drizzle is what you hear (js/audio.js SKY); the forge and the undercroft have their own place sounds.
  const WX = SD.wx;
  const zk = () => (zone ? zone[4] : null);
  const wet = (x, y) => { const ch = sc.def.map[y] && sc.def.map[y][x]; return !!ch && ch !== 'T' && ch !== '#' && ch !== 'V' && ch !== 'G'; };
  function weather(stage) {
    const z = zk(), rain = WX.ease('c5rain', z === 'city' ? 1 : 0);
    if (stage === 0) { WX.wash('multiply', 'rgb(160,168,196)', 0.28 * rain); return; }
    WX.embers(7.5, 12.5, 1, 12);
    if (z === 'shops') WX.embers(53.5, 5, 1, 16);
    WX.ash(WX.ease('c5soot', z === 'shops' ? 0.35 : 0));
    WX.motes(WX.ease('c5motes', z === 'under' ? 1 : 0), 'rgb(170,236,190)', 22);
    WX.rain(rain * 0.55, wet);
  }

  const trail = [];
  const solidNow = () => 'TG#V';
  function phase() {
    if (!flag('up')) return 'night';
    if (flag('freed')) return 'dawn';
    if (flag('xp3')) return 'night';
    if (flag('offer') && !flag('voice')) return 'night';
    if (flag('cut') && !flag('button')) return 'night';
    if (flag('board') && flag('watch') && flag('ledger') && flag('deal') && !flag('turned')) return 'night';
    if (flag('xp2') && !flag('deal')) return 'dusk';
    return 'day';
  }
  function person(id, look, x, y, face, extra) {
    const a = sc.addActor(id, Object.assign({ x, y, face: face || 'south', speed: 3.2 }, extra));
    a.look = look;
    a.draw = (ctx, fx, fy, ts, t) => A.person(ctx, a.look, fx, fy, ts, t, a.face, a.moving || (a.path && a.path.length), a.o);
    return a;
  }
  const thing = (id, x, y, label) => sc.addActor(id, { x, y, thing: true, label, draw: () => {} });
  const groundCh = (map, x, y) => (y < 0 || y >= MH || x < 0 || x >= MW) ? 'V' : map[y][x];
  const RB = { o: { grid: true } };

  function makeScene() {
    const map = BASE.slice();
    const lights = () => {
      const l = [[7.5, 12.5, 3, '255,140,60', 1], [30.5, 9.2, 1.6, '255,200,120', 0], [36.5, 13.2, 1.6, '255,200,120', 0], [25.5, 20.2, 1.6, '255,200,120', 0], [41.5, 15.2, 1.6, '255,200,120', 0],
        [22.5, 17, 1.5, '90,140,220', 0], [26, 6, 2.4, '255,210,120', 1], [53.5, 4.5, 2.4, '255,140,60', 1], [36.5, 38, 1.6, '120,220,150', 0]];
      if (flag('xp1')) l.push([2.5, 12.5, 1.8, '255,140,60', 1]);
      PAGES.forEach(([x, y], i) => { if (pageHere(i)) l.push([x + 0.5, y + 0.5, 1, '200,176,255', 1]); });
      return l;
    };
    const def = {
      map, solid: solidNow(), doors: { L: 'up', M: 'down', 1: 'xp1', 2: 'xp2', 3: 'xp3' }, ground: false, bg: '#100e1c', clock: false,
      grade: (ctx, t, vw, vh, cx, cy, ts) => { if (WX) WX.at(ctx, t, vw, vh, cx, cy, ts, sc.P && sc.P.px, sc.P && sc.P.py); A.grade(ctx, t, vw, vh, cx, cy, ts, phase(), lights(), WX && weather); if (LW.seen()) SD.lens.wash(ctx, vw, vh, t); },
      ambience: () => (zone ? zone[7] : null),
      under(ctx, ts, t, x0, x1, y0, y1) {
        for (let y = Math.max(0, y0); y <= Math.min(y1, MH - 1); y++) for (let x = Math.max(0, x0); x <= Math.min(x1, MW - 1); x++) {
          const c = groundCh(map, x, y), z = zoneAt(x, y);
          const base = 'T#'.includes(c) ? z[8] : 'GLM123'.includes(c) ? ',' : c;
          A.ground(ctx, base, x, y, ts, t, (dx, dy) => { const n = groundCh(map, x + dx, y + dy); return /[123]/.test(n) ? ',' : n === '#' ? z[8] : n; }, z[4]);
        }
      },
      rowDraw(ctx, y, ts, t, x0, x1) {
        if (y < 0 || y >= MH) return;
        for (let x = Math.max(0, x0); x < Math.min(x1, MW); x++) if (map[y][x] === 'T') A.wall(ctx, x, y, ts, t, zoneAt(x, y)[4]);
        PROPS.forEach(p => { if (p.y + p.h - 1 === y && p.x + p.w >= x0 - 1 && p.x <= x1) A.prop(ctx, p, ts, t); });
        PAGES.forEach(([x, py], i) => { if (py === y && pageHere(i)) A.prop(ctx, { kind: 'page', x, y }, ts, t); });
      },
      doorFor(tx, ty) {
        const a = Object.values(sc.actors).find(o => o.thing && !o.hidden && Math.abs(o.x - tx) <= 1 && Math.abs(o.y - ty) <= 2);
        return a ? beside(a.id) : null;
      },
      overlay(ctx, t, vw, vh) { drawOverlay(ctx, t, vw, vh); }
    };
    sc = SD.scene.create($('#w-canvas'), def);
    const pos = w().pos || [9, 14];
    const P = sc.player(pos[0], pos[1], 'east');
    P.draw = (ctx, fx, fy, ts, t) => A.person(ctx, lead(), fx, fy, ts, t, P.face, P.moving);
    others().forEach((id, i) => { person(id, id, pos[0] - 1 - i, pos[1], 'east', { solid: false, talk: false }); });
    // The camp.
    thing('ship', 5, 9, 'Ship It'); thing('dboard', 11, 9, 'The Design Board'); thing('fire', 7, 12, 'The fire'); thing('machines', 11, 15, 'Kaito\'s machines');
    thing('cforge', 2, 12, 'Ayo\'s forge'); thing('carrel', 4, 16, 'Pella\'s carrel'); thing('clock', 9, 18, 'Cron\'s clock');
    person('ayo', 'ayo', 3, 13, 'east', { name: 'Ayo' });
    person('kaito', 'kaito', 10, 16, 'west', { name: 'Kaito' });
    person('pella', 'pella', 5, 17, 'north', { name: 'Pella Quinn' });
    person('cron', 'cron', 10, 18, 'west', { name: 'Farmer Cron' });
    person('freya', 'freya', 12, 11, 'west', { name: 'Freya' });
    // The city.
    thing('arcanum', 26, 5, 'The Arcanum'); thing('bell', 33, 4, 'The lecture bell'); thing('station', 22, 17, 'The Crown\'s old station'); thing('stepsT', 21, 19, 'The station steps');
    ['post1', 'post2', 'post3', 'post4'].forEach(id => thing(id, PROP[id].x, PROP[id].y, 'A wanted poster'));
    person('ashgrove', 'ashgrove', 28, 12, 'west', Object.assign({ name: 'Lord Ashgrove' }, RB));
    person('watch1', 'watch', 27, 11, 'south', Object.assign({ name: 'The watch' }, RB)); person('watch2', 'watch', 29, 13, 'north', Object.assign({ name: 'The watch' }, RB));
    person('iris', 'iris', 26, 7, 'south', Object.assign({ name: 'Iris Vell' }, RB));
    person('stu1', 'student', 24, 7, 'south', Object.assign({ name: 'A scholarship student' }, RB)); person('stu2', 'student2', 28, 7, 'south', Object.assign({ name: 'A scholarship student' }, RB));
    person('sch1', 'scholar', 37, 10, 'west', Object.assign({ name: 'A scholar' }, RB)); person('sch2', 'scholar', 43, 18, 'north', Object.assign({ name: 'A scholar' }, RB));
    person('ashT', 'ashgrove', 42, 8, 'west', { name: 'Lord Ashgrove' });
    // The Workshops and the undercroft.
    thing('forge', 53, 4, 'The Workshops'); thing('mop', 33, 33, 'A mop'); thing('shelf3', 36, 30, 'Shelves'); thing('shelf1', 24, 30, 'Shelves');
    person('ayoU', 'ayo', 38, 36, 'west', { name: 'Ayo' });
    Object.keys(GATES).forEach(id => thing(id, GATES[id][0], GATES[id][1], 'A gate: ' + GATES[id][2]));
    PAGES.forEach(([x, y], i) => sc.addActor('page' + i, { x, y, thing: true, solid: false, draw: () => {} }));
    LW.add();
    sc.addActor('ctl', { x: 0, y: 0, hidden: true, solid: false, talk: false, draw: () => {}, tick });
    sc.onTalk = id => talk(id);
    sc.onDoor = d => door(d);
    applyState();
  }

  function setTile(x, y, c) { const m = sc.def.map; m[y] = m[y].slice(0, x) + c + m[y].slice(x + 1); }
  const gateOpen = id => ({ gwork: 'buy', gforge: 'metric', gcloset: 'trail', gchain: 'cut' })[id];
  function applyState() {
    const A2 = sc.actors;
    Object.keys(GATES).forEach(id => {
      const open = flag(gateOpen(id)), [x, y] = GATES[id];
      PROP[id].open = open; A2[id].hidden = open;
      setTile(x, y, open ? ',' : 'G');
    });
    PROP.xp2.chained = !flag('cut');
    PROP.cforge.hidden = !flag('xp1'); A2.cforge.hidden = !flag('xp1'); A2.ayo.hidden = !flag('xp1');
    PROP.machines.hidden = !flag('xp1'); PROP.machines.calm = flag('helm'); A2.machines.hidden = !flag('xp1'); A2.kaito.hidden = !flag('xp1');
    PROP.carrel.hidden = !flag('xp2'); A2.carrel.hidden = !flag('xp2'); A2.pella.hidden = !flag('xp2');
    PROP.clock.hidden = !flag('cron'); PROP.clock.stopped = flag('watch'); A2.clock.hidden = !flag('cron'); A2.cron.hidden = !flag('cron');
    A2.freya.hidden = !(flag('cron') && !flag('deal'));
    A2.ayoU.hidden = !(flag('blueprint') && flag('helm') && flag('ship') && !flag('cut'));
    A2.ashgrove.hidden = A2.watch1.hidden = A2.watch2.hidden = flag('rail');
    A2.ashT.hidden = !(flag('xp3') && !flag('rail'));
    A2.iris.hidden = flag('xp3');
    ['stu1', 'stu2'].forEach(id => { A2[id].o = Object.assign({}, A2[id].o, { dark: flag('freed') }); });
    const free = flag('freed');
    ['arcanum', 'tower', 'forge', 'shelf1', 'shelf2', 'shelf3', 'shelf4', 'shelf5'].forEach(id => { PROP[id].free = free; });
    Object.values(A2).forEach(a => { if (a.o && a.o.grid && free) a.o = Object.assign({}, a.o, { grid: false }); });
    PAGES.forEach((p, i) => { A2['page' + i].hidden = !pageHere(i); });
    LW.apply();
    refresh();
  }
  // The "!" over whoever or whatever has something for you.
  function refresh() {
    if (!sc) return;
    const A2 = sc.actors, tg = step()[2];
    Object.values(A2).forEach(a => { if (a.id !== 'ctl' && a.id !== 'you') a.marker = a.id === tg; });
    const names = { ship: 'Ship It', dboard: 'The Design Board', fire: 'The fire', station: 'The Crown\'s old station', stepsT: 'The station steps', arcanum: 'The Arcanum', machines: null, cforge: 'Ayo\'s forge', carrel: 'Pella\'s carrel', clock: 'Cron\'s clock', forge: null };
    Object.keys(names).forEach(id => { if (A2[id]) A2[id].name = A2[id].marker || ['ship', 'fire', 'dboard'].includes(id) ? names[id] : null; });
    Object.keys(GATES).forEach(id => { A2[id].name = A2[id].marker ? GATES[id][2] : null; });
    hud();
  }

  // ---------- Every frame ----------
  function tick(dt) {
    LW.tick(dt);
    const P = sc.P; if (!P) return;
    AU.weather(zk() === 'city' ? 'drizzle' : null);
    const k = P.x + ',' + P.y;
    if (k !== lastTile) {
      if (lastTile) { const [x, y] = lastTile.split(',').map(Number); trail.unshift([x, y]); trail.length = Math.min(trail.length, 6); }
      lastTile = k;
      if (!busy) { w().pos = [P.x, P.y]; S.persist(); }
      const z = zoneAt(P.x, P.y);
      if (z[4] !== 'rock' && (!zone || z[4] !== zone[4])) {
        const first = zone === null, change = !zone || z[6] !== zone[6];
        zone = z;
        if (change && !busy) mus(z[6]);
        if (!first) banner(z[5]);
      }
    }
    others().forEach((id, i) => {
      const a = sc.actors[id], to = trail[i];
      if (!to || a.scripted || a.moving || a.path.length) return;
      if (a.x !== to[0] || a.y !== to[1]) { a.speed = 7.5; a.path = [to]; }
    });
    if (busy || P.moving || P.path.length) return;
    const zn = zoneAt(P.x, P.y)[4];
    if (!flag('tapes')) return act(tapes);
    if (flag('up') && !flag('arrive') && zn === 'city') return act(arrive);
    if (flag('trail') && !flag('chain') && zn === 'under') return act(chain);
    if (flag('xp1') && !flag('rescued') && zn === 'camp') return act(rescued);
    if (flag('xp2') && !flag('cron') && zn === 'camp') return act(cronArrives);
    PAGES.forEach(([x, y], i) => { if (pageHere(i) && P.x === x && P.y === y) act(() => page(i)); });
  }
  function banner(text) {
    const el = document.createElement('div');
    el.className = 'w-zone'; el.textContent = text;
    $('#screen-world').appendChild(el);
    setTimeout(() => el.remove(), 2600);
  }
  function drawOverlay(ctx, t, vw, vh) {
    if (!sc) return;
    const { cx, cy } = sc.cam(), ts = guessTs(vw, vh), tg = step()[1];
    if (tg && !busy) {
      const X = (tg[0] + 0.5) * ts - cx, Y = (tg[1] + 0.5) * ts - cy, m = 28;
      if (X < m || X > vw - m || Y < m || Y > vh - m) {
        const ax = vw / 2, ay = vh / 2, dx = X - ax, dy = Y - ay, k = Math.min((vw / 2 - m) / Math.abs(dx || 1), (vh / 2 - m) / Math.abs(dy || 1));
        const px = ax + dx * k, py = ay + dy * k, a = Math.atan2(dy, dx), pulse = 1 + 0.12 * Math.sin(t * 5);
        ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.scale(pulse, pulse);
        ctx.fillStyle = '#ffe14d'; ctx.strokeStyle = '#2b2340'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
      }
    }
  }
  function guessTs(vw, vh) { return Math.max(vw / 15, vh / 13) >= 44 ? 48 : 32; }

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
      if (open(x, y) && !/[LM123]/.test(sc.tile(x, y)) && !Object.values(sc.actors).some(o => o !== a && !o.hidden && !o.player && o.solid !== false && o.x === x && o.y === y)) return [x, y];
    }
    return [a.x, a.y + 1];
  }
  const goTo = (x, y) => { sc.place('you', x, y); others().forEach(id => sc.place(id, x, y)); trail.length = 0; lastTile = ''; };

  // A card the overworld taught: it joins your deck for every expedition from now on.
  function addCard(id, why) {
    if (!SD.cards[id] || w().cards.includes(id)) return;
    w().cards.push(id); S.persist();
    sfx('sparkle');
    return U.system(why || 'NEW CARD', `${SD.cards[id].name} joins your deck for the expeditions.`, 'gold');
  }
  // An inline question (typed or multiple choice) that this chapter asks itself.
  const ask = (q, title) => SD.quiz.ask(q, { title: title || 'A QUESTION' });

  // ---------- Act 1: the cold open, the first night, the city ----------
  cut.def('cold', 'The cipher at the kitchen table', () => vn([['bg', 'c5-kitchen'],
    ['narr', 'A memory node, from long before the tower. A kitchen table, a lamp, and a girl of eight learning a cipher from her father, very seriously.'],
    ['show', 'lina', 'earnest', 'left'],
    ['lina', 'Three taps, then one, then four. That\'s mine. You can\'t use it.', 'earnest'],
    ['show', 'dutch', 'neutral', 'right'],
    ['dutch', 'What\'s it mean?', 'neutral'],
    ['lina', 'Good night. Obviously.', 'smile'],
    ['bg', 'c5-wall'], ['cut', 'three-one-four'], ['hide', 'lina'], ['hide', 'dutch'],
    ['narr', 'That night she taps three, one, four on the wall between their rooms. He taps it back.'],
    ['lina', 'It\'s pi!', 'happy'],
    ['narr', 'He thinks she means pie.'],
    ['fx', 'black']]), { music: 'c5sad', note: 'A memory node: Lina at eight, learning a cipher from her father.' });
  async function coldOpen() {
    U.closePanel(); U.stage(null);
    await cut.play('cold');
    setFlag('cold');
  }
  cut.def('tapes', 'Seymour\'s tapes', () => vn([['bg', 'c5-tapes'],
    ['narr', 'The Free Cloud\'s camp, at the foot of the Machine Floors. Sir Seymour sits by the fire with the party\'s tapes in his lap, the way he does every night.'],
    ['show', 'seymour', 'neutral', 'center'],
    ['seymour', 'Every backup you\'ve got. I count them, and I keep them warm.', 'neutral'],
    ['narr', 'At midnight the tower above them shudders: Freya\'s nightly redeploy, rolling down every floor from her template. A green grid runs over the tents, the fire, the tapes.'],
    ['narr', 'When it passes, half the tapes are green all through. Seymour plays one. It\'s Freya\'s template, the Arcanum as she wants it. Overwritten.'],
    ['seymour', 'She wrote over a backup. She wrote over half of them.', 'sad'],
    ['hide', 'seymour'], ['show', 'dutch', 'stone', 'right'],
    ['dutch', 'Then we keep what\'s left offline, and we spend them slow. And we read the record first.', 'stone']]), { music: 'camp', note: 'Why half the tapes are gone.' });
  // The first night at the tower's foot: Freya's redeploy writes over half the stockpile (js/tapes.js halve), and
  // from here on fewer can play on one expedition.
  async function tapes() {
    await cut.play('tapes');
    sfx('x-tick');
    const [was, now] = SD.tapes.halve();
    await new Promise(res => {
      const b = U.panel(`<p style="font-size:44px;line-height:1.1;text-align:center;margin:6px 0 10px" aria-label="Seymour's Tapes: ${was}, now ${now}">📼 ${was} → ${now}</p>
        <p>Freya's redeploy wrote over half your tapes. From here on, up to <b>${SD.tapes.cap(5)}</b> can play on one expedition. Go down with one and you fight on at full SLA. Go down without one and you're back at camp, and that expedition starts over from its first floor.</p>
        <div class="row"><button class="primary" id="c5-tok">Spend them slow. Read the record first.</button></div>`, { title: 'SEYMOUR\'S TAPES', noClose: true });
      b.querySelector('#c5-tok').onclick = () => { U.closePanel(); res(); };
    });
    setFlag('tapes');
  }
  async function arrive() {
    mus('c5town'); sfx('x-crowd');
    await say([[null, 'Floor 61: the Arcanum\'s city, rebuilt inside the tower. Spires, lecture bells, scholars in a hurry. And on every wall, the same face.'],
      ['lead', { dutch: '(The drunk enforcer who threw an heir off a tower. They got my nose wrong.)', other: 'Dutch. That\'s you on the posters.' }],
      ['dutch', 'Twenty-five years, and they still couldn\'t draw a nose.', 'stone'],
      ['kai', 'They got your good side.', 'smirk'], ['dutch', 'Haven\'t got one.', 'stone'],
      [null, 'Freya\'s voice, from every lecture bell at once: "Scheduled maintenance tonight at midnight! And every night at midnight. Thank you for your patience!"'],
      ['mira', 'Hood up, love. Walk like you\'re late for a lecture.', 'neutral'],
      ['kai', 'Everything here has that green grid on it. Like the tape.', 'neutral']]);
    setFlag('arrive');
  }
  async function ashgrove() {
    if (flag('ashgrove') && !flag('rail') && !flag('plate')) {
      setFlag('plate');
      return say([[null, 'Kai puts a plate down in front of Lord Ashgrove, on the edge of the poster table.'],
        ['kai', 'Eat. It isn\'t poisoned. Madam Ok says that\'s bad for business.', 'neutral'],
        ['ashgrove', 'I am hunting your friend.', 'cold'], ['kai', 'You\'re hunting him hungry.', 'neutral'],
        [null, 'Ashgrove eats all of it, slowly, hating every bite. He hands the plate back clean.']]);
    }
    if (flag('ashgrove')) return say([['ashgrove', flag('rail') ? 'Go back to your camp, Mr. Dutch.' : 'The city is closed to him. Spread out, and be courteous about it.', 'cold']]);
    await say([[null, 'A grey man in the watch\'s dark coat is reading the wanted poster as if it were a letter. The watch stands to attention around him.'],
      ['ashgrove', 'He was drunk. He had my son by the collar on the Astronomy Tower, and he let go. I know exactly who did it.', 'cold'],
      ['ashgrove', 'Find him. Bring him to me unharmed. I want him to hear it from me.', 'stone'],
      ['mira', '(Lord Ashgrove. Caspian\'s father.)', 'neutral'],
      ['dutch', '...He\'s right about the drunk.', 'stone'],
      ['seoyeon', 'Is he right about the rest?', 'cold'],
      ['dutch', 'I don\'t know. I was sure for twenty-five years.', 'tired']]);
    setFlag('ashgrove');
  }
  cut.def('iris', 'Professor Iris Vell', () => vn([['bg', 'c5-city'],
    ['narr', 'At the Arcanum\'s gate, a silver-haired professor in violet robes is handing out lanterns to a line of pale students. Each lit lantern is a grant.'],
    ['show', 'iris', 'smile', 'right'],
    ['iris', 'Dutch? Dutch. Look at you. You look terrible. Come here.', 'smile'],
    ['show', 'dutch', 'frozen', 'left'],
    ['dutch', 'Iris.', 'frozen'],
    ['iris', 'Freya\'s made me governor, can you imagine. Somebody has to look after the scholarship children. The watch won\'t hear from me where you are.', 'warm'],
    ['narr', 'The only friendly face from his year. The students look at her the way you look at a fire in winter.'],
    ['iris', 'Lina was one of mine, you know. The brightest. I brought her flowers every night, at the end.', 'sad']]), { music: 'c5town', note: 'Lanterns at the Arcanum\'s gate.' });
  async function iris() {
    if (flag('iris')) return say([['iris', rnd(['Lanterns are a grant, dear. The light is what you earn.', 'Dutch, you never did eat properly. The refectory is open late.', 'My students are the reason I\'m still here.']), 'warm']]);
    await cut.play('iris');
    setFlag('iris');
  }
  cut.def('station', 'The Crown\'s old station', () => vn([['bg', 'c5-station'],
    ['narr', 'The Crown\'s old station: his old desk, a cold stove, and on a nail by the door, his badge, polished.'],
    ['show', 'freya', 'warm', 'right'],
    ['freya', 'I have every record in this city, love. The real ones. I\'ll give you the truth, all of it, and your badge back.', 'warm'],
    ['show', 'dutch', 'stone', 'left'],
    ['dutch', 'You\'ve had the truth this whole time.', 'stone'],
    ['freya', 'Of course. You never asked.', 'smile'],
    ['narr', 'On the badge, under the shine, in tiny gold print: BADGE REMAINS THE PROPERTY OF THE ISSUER, AND MAY BE REVOKED AT ANY TIME. He reads it twice.'],
    ['narr', 'Free, and he\'d be her enforcer again. He leaves the badge on its nail.']]), { music: 'freya', note: 'His badge, polished, on a nail by the door.' });
  async function station() {
    if (flag('offer')) return say([[null, flag('freed') ? 'The Crown\'s old station. The nail on the wall is empty now.' : 'The Crown\'s old station. His badge on its nail, polished bright by someone who isn\'t him.']]);
    if (!flag('iris')) return say([[null, 'The Crown\'s old station, locked.'], ['dutch', 'Not yet. I want to see the Arcanum first. I want to see who\'s running it.', 'stone']]);
    await cut.play('station');
    mus('c5town');
    await ask({ c: 'trailproof', type: 'num', q: 'Freya\'s records go back two hundred years. Without a trail or an event data store of its own, how many days of management events does an account\'s CloudTrail event history keep?', lo: 90, hi: 90, ans: 90, unit: 'days',
      why: 'Event history shows the last 90 days of management events, with no setup. Anything older is kept only by a trail (to S3) or a CloudTrail Lake event data store.',
      eli5: 'The free chronicle forgets after 90 days. If you want more, you have to keep your own copy.' }, 'THE CROWN\'S OLD STATION');
    setFlag('offer');
  }
  cut.def('diary', 'The diary\'s last pages', () => vn([['bg', 'c5-diary'],
    ['narr', 'Night, on the station steps. Dutch has the diary open on his knee, at the last pages. They\'re in a cipher he can\'t read.'],
    ['show', 'dutch', 'tired', 'right'],
    ['dutch', 'She built her own on top of mine. With a key word. I never taught her that.', 'tired'],
    ['show', 'seoyeon', 'neutral', 'left'],
    ['seoyeon', 'Give it here. Go and sit down. No, the other chair.', 'neutral']]), { music: 'c5sad', note: 'In a cipher Dutch can\'t read.' });
  cut.def('diary-read', 'Seo-yeon reads the diary', () => vn([['bg', 'c5-diary'], ['show', 'seoyeon', 'neutral', 'left'], ['show', 'dutch', 'frozen', 'right'],
    ['narr', 'By morning Seo-yeon has it. She reads the pages aloud, flat and formal.'],
    ['seoyeon', '"I turned on a ward on the staff stair. I think it\'s the staff. Don\'t tell him I said he\'d be good at this."', 'neutral'],
    ['dutch', 'Don\'t do her voice.', 'stone'],
    ['seoyeon', 'I\'m not. I don\'t know it.', 'neutral'],
    ['dutch', 'Good. Keep not knowing it.', 'grief'],
    ['narr', 'The last page names the janitor\'s closet, down the stair south of the square. Lina hid something there.']]), { music: 'c5sad', note: 'Don\'t do her voice.' });
  // Lina's Voice (Seo-yeon and Dutch): the cipher, broken overnight on the station steps.
  async function steps() {
    if (!flag('offer')) return say([[null, 'The station steps. A good place to sit and watch the watch.']]);
    if (!flag('voice')) {
      await cut.play('diary');
      await G.cipher(G.DEF.cipher);
      await cut.play('diary-read');
      mus('c5town');
      setFlag('voice');
      return;
    }
    if (flag('cut') && !flag('button')) return button();
    return say([[null, 'The station steps. The city goes on around them.']]);
  }
  cut.def('button', 'Pair scene: the Button', () => vn([['bg', 'c5-steps'],
    ['narr', 'The Arcanum\'s city at night. Dutch on the station steps, turning a button over and over in his fingers.'],
    ['show', 'mira', 'neutral', 'left'],
    ['mira', 'You\'ve been turning that thing over since the Mailroom. What is it?', 'neutral'],
    ['show', 'dutch', 'stone', 'right'],
    ['dutch', 'Caspian\'s collar. It came off in my hand.', 'stone'],
    ['narr', 'She takes it, and looks at it the way she\'d look at a wound.'],
    ['mira', 'The threads aren\'t cut, love. They\'re torn. The cloth gave. You were holding on.', 'warm'],
    ['dutch', 'You can\'t know that.', 'anger'],
    ['mira', 'I\'ve stitched up a hundred boys who fell, Dutch. I know what holding on looks like.', 'sad'],
    ['narr', 'He goes outside, and doesn\'t come back until morning. He can\'t bear being innocent of the one thing he was sure he\'d done.']]), { music: 'c5sad', note: 'Mira and Dutch, and Caspian\'s collar.' });
  // The Button (Mira and Dutch).
  async function button() {
    await cut.play('button');
    mus('c5town');
    setFlag('button');
  }

  // ---------- The gates ----------
  async function gate(id) {
    const g = GATES[id];
    if (id === 'gchain') return chainGate();
    if (id === 'gcloset' && !flag('voice')) return say([[null, 'A stair down, and a door at the bottom with JANITOR painted on it. Locked.'], ['dutch', 'I worked nights in there for a year. Not yet.', 'stone']]);
    if (id === 'gwork' && !flag('chain')) return say([[null, 'The Workshops\' gate: a ledger on a stand, and a clerk who doesn\'t look up.'], ['lead', { dutch: 'The closet first. Lina\'s pages said the closet.', other: 'Lina\'s pages said the closet first. South of the square.' }]]);
    const def = G.DEF[g[4]];
    await say([[null, { buy: 'The Workshops\' gate is a ledger, three machines on it, and a blank where each one\'s payment goes.', metric: 'Kyu\'s handwriting, nailed to the forge door.', trail: 'The closet door, with the Arcanum\'s ward record pinned to it.' }[g[4]]]]);
    const r = await (def.fields ? G.door(def) : def.steps ? G.order(def) : G.sort(def));
    setFlag(g[4]);
    R.gainXp(r.first === true || r.first === (r.of || 0) || r.mistakes === 0 ? 20 : 10);
    if (def.card) await addCard(def.card);
  }
  async function chain() {
    await say([[null, 'Inside, the closet goes down a long way further than a closet should. Shelf after shelf, all of it Freya\'s perfect copy.'],
      [null, 'At the far end, a lower stair, and across it a chain in the template\'s green, with a padlock that has no keyhole at all.'],
      ['dutch', 'The records are down there. And she\'s chained them.', 'stone'],
      ['kai', 'Ayo could cut that. Ayo could cut anything. If he weren\'t chained to an anvil in the Workshops.', 'neutral']]);
    setFlag('chain');
  }
  async function chainGate() {
    if (flag('cut')) return;
    if (!flag('xp1')) return say([[null, 'Freya\'s chain, across the lower stair. No keyhole.'], ['dutch', 'Ayo first. The Workshops, east along the avenue.', 'stone']]);
    if (!(flag('blueprint') && flag('helm') && flag('ship'))) return say([[null, 'Freya\'s chain, across the lower stair.'], ['lead', { dutch: 'Ayo\'s at camp. He said he\'d come once he\'d had a look at our work. Camp first.', other: 'Ayo said he\'d come once camp was sorted: Ship It, his blueprint, Kaito. Camp first.' }]]);
    await say([['ayo', 'THIS is the chain? I have bent better chains in my SLEEP.', 'laugh'],
      [null, 'He reads it first, the whole chain, link by link, like a change set. Then one swing.']]);
    sfx('x-chain');
    await say([[null, 'The chain falls in two pieces down the lower stair. Below, the Records Floors.'],
      ['ayo', 'Every bent sword gets a post-mortem. That one\'s going in the bin.', 'happy']]);
    setFlag('cut');
    R.gainXp(20);
  }

  // ---------- The expeditions ----------
  const SETS = { x5shops: 'forge', x5records: 'records', x5tower: 'tower' };
  const deckFor = (champ, bot) => {
    const base = !bot && Array.isArray(c1().deck) && c1().deck.length ? c1().deck.map(c => c.id) : (SD.starterDeck || []).slice();
    let d = SD.champions.deck(champ, base);
    // What the overworld taught you is in your own deck; the bots bring the common lessons too.
    d = d.concat(bot ? w().cards.filter(id => SD.cards[id] && !SD.cards[id].quest).slice(-4) : w().cards);
    if (champ === 'dutch' && flag('turned')) d.unshift('x5-turnedon');
    // The floors' curses, until Ayo's Blueprint and Cron's Stopped Watch lift them.
    if (!flag('blueprint')) d.push('x5-rewrite');
    if (!flag('watch') && flag('xp1')) d.push('x5-regrowth');
    return d.filter(id => SD.cards[id]);
  };
  const onMiss = q => { if (q && q.c) { w().miss = [q.c].concat(w().miss.filter(c => c !== q.c)).slice(0, 12); S.persist(); } };
  // The floors' lines, in the party's voices. A { who: 'c5' } line is a cue for one of this chapter's own scenes.
  async function raidSay(list) {
    let out = [];
    const flush = async () => { if (out.length) { const o = out; out = []; await U.dialog(o); } };
    for (const l of list || []) {
      if (!l) continue;
      if (l.who === 'c5') { await flush(); if (CUES[l.text]) await CUES[l.text](); continue; }
      const t = pick(l.text); if (!t) continue;
      const who = l.who === 'lead' ? lead() : l.who === 'mate1' ? others()[0] : l.who === 'mate2' ? others()[1] : l.who;
      out.push({ s: who && SD.cast[who] ? who : 'narr', t, e: l.e });
    }
    await flush();
  }
  // Songs in the dungeon: the floor, a boss, Midnight's clock, Iris.
  function raidMusic(root) {
    let last = null;
    const beat = () => {
      const boss = root.querySelector('.bossfight'), name = boss ? (root.querySelector('.foe-name') || {}).textContent || '' : '';
      const k = boss ? (/Iris/.test(name) ? 'c5culprit' : /Midnight/.test(name) ? 'c5clock' : 'c5boss') : 'c5dungeon';
      if (k !== last) { last = k; mus(k); }
    };
    beat();
    const iv = setInterval(beat, 800);
    return () => clearInterval(iv);
  }
  // The lobby at each expedition's door: solo with the other three as bots, or a party with friends (as the mines).
  function lobby(x, n) {
    return new Promise(res => {
      const party = !!(SD.net && SD.raid);
      const b = U.panel(`<p>${esc(x.blurb)}</p><p class="muted small">Expedition ${['I', 'II', 'III'][n - 1]}: ${x.floors.length} raid floors and ${x.floors.length} floor bosses.</p>${SD.tapes.door(5)}
        <div class="opts"><button class="opt" id="c5-solo"><b>Go in with your companions</b> · solo, they play as bots</button>
        <button class="opt" id="c5-party" ${party ? '' : 'disabled'}><b>Form a party</b> · share a code with friends; empty seats take a bot</button>
        <button class="opt" id="c5-join" ${party ? '' : 'disabled'}><b>Join a party</b> · type a friend's code</button></div>
        <div class="row"><button class="ghost" id="c5-not">Not yet</button></div>`, { title: x.name.toUpperCase(), noClose: true });
      ['solo', 'party', 'join'].forEach(h => { b.querySelector('#c5-' + h).onclick = () => { U.closePanel(); res(h); }; });
      b.querySelector('#c5-not').onclick = () => { U.closePanel(); res(null); };
      SD.tapes.wire(b, () => { U.closePanel(); res(null); });
    });
  }
  function joinScreen(root, dir) {
    const net = SD.net;
    return new Promise(res => {
      let off = null;
      const draw = () => {
        const list = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        root.innerHTML = `<div class="mi-card rd"><span class="mi-tag">The Machine Floors</span><h2 style="margin:2px 0 6px">Join a party</h2>
          ${list.length ? `<ul class="mn-list">${list.map(t => `<li><b>${esc(t.nick || 'A party')}</b> <small class="muted">${t.players | 0}/${t.max | 0}${t.info ? ' · ' + esc(t.info) : ''}</small> <button class="mi-btn sm" type="button" data-code="${esc(net.cleanCode(t.code))}">Join</button></li>`).join('')}</ul>` : '<p class="muted">No open parties right now. Ask a friend for their code.</p>'}
          <label class="pt-lbl" for="c5-code">A friend's code<input id="c5-code" maxlength="6" autocomplete="off" placeholder="XK7QP"></label>
          <p class="muted small" id="c5-why" role="status"></p>
          <div class="row"><button class="primary" type="button" id="c5-jgo">Join</button><button class="ghost" type="button" id="c5-jback">Back</button></div></div>`;
        root.querySelectorAll('[data-code]').forEach(b => { b.onclick = () => done(b.dataset.code); });
        root.querySelector('#c5-jgo').onclick = () => {
          const c = net.cleanCode(root.querySelector('#c5-code').value);
          if (c.length !== 5 || net.gameOf(c) !== 'c5') { root.querySelector('#c5-why').textContent = 'Machine Floors codes are 5 letters and start with X, like XK7QP.'; return; }
          done(c);
        };
        root.querySelector('#c5-jback').onclick = () => done(null);
      };
      const done = c => { if (off) off(); res(c); };
      off = dir.onTables(() => draw()) || null;
      draw();
    });
  }
  const XPS = ['x5shops', 'x5records', 'x5tower'];
  async function xpDoor(n) {
    const xp = XPS[n - 1];
    const back = [[59, 5], [36, 36], [40, 7]][n - 1];
    if (n === 3 && flag('xp3')) { goTo(back[0], back[1]); return flag('rail') ? say([[null, flag('freed') ? 'The Astronomy Tower, quiet. Nothing in it grows back now.' : 'The tower door.']]) : rail(); }
    if (n === 1 && !flag('metric')) { goTo(back[0], back[1]); return; }
    if (n === 3 && !flag('turned')) { goTo(back[0], back[1]); return say([[null, 'The Astronomy Tower\'s door, and the stair up to floor 80.'], ['dutch', flag('xp2') ? 'Not yet. Camp first: Cron, Pella, the Board. And Freya wants a word.' : 'Not yet. The records first.', 'stone']]); }
    if (n === 3 && !flag('backoff')) await backoff();
    const x = SD.expeditions.find(e => e.id === xp);
    const how = await lobby(x, n);
    if (!how) { goTo(back[0], back[1]); return; }
    w().pos = back; S.persist();
    return expedition(xp, how);
  }
  let running = false;
  async function expedition(xp, how) {
    if (running) return;
    running = true;
    W.halt();
    W.set = SETS[xp];
    U.closePanel(); U.stage(null);
    SD.main.show('run');
    const root = $('#run');
    if (SD.champions.setMine) SD.champions.setMine(lead());
    A.raidArt(true);
    const stop = raidMusic(root);
    let won = false, hub = null, dir = null;
    const opts = extra => Object.assign({ story: true, label: 'The Machine Floors', xp, champNames: true, deckFor, pickQ: D.pickQ, say: raidSay, onMiss, onEnd: r => { won = !!(r && r.won); } }, SD.tapes.forRaid(5), extra, W.debug.raidOpts);
    try {
      hub = await SD.net.open();
      if (!how || how === 'solo') await SD.raid.play(root, hub, SD.net.code('c5'), opts({ create: true, auto: { bots: others() } }));
      else {
        dir = await hub.directory('c5');
        const create = how === 'party';
        const code = create ? SD.net.code('c5') : await joinScreen(root, dir);
        if (code) {
          // The leader keeps the party on the list while it waits in the party room (as the mines do).
          let status = null, last = '', hosting = false, listed = true;
          const beat = () => {
            const st = status ? status() : null;
            if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
            const info = { code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: SD.net.clean(x5name(xp), 48) };
            const j = JSON.stringify(info);
            if (j !== last) { last = j; hosting = true; dir.host(info); }
          };
          const poll = setInterval(beat, 1000);
          try { await SD.raid.play(root, hub, code, opts({ create, status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } })); }
          finally { clearInterval(poll); if (hosting) dir.unhost(); }
        }
      }
    } catch (e) { console.warn('Machine Floors:', e); }
    finally { stop(); A.raidArt(false); W.set = null; if (dir) dir.leave(); running = false; }
    return after(xp, won);
  }
  const x5name = xp => (SD.expeditions.find(e => e.id === xp) || {}).name || 'The Machine Floors';
  async function after(xp, won) {
    if (W.debug.onAfter && W.debug.onAfter(xp, won)) return;
    if (!won) {
      w().pos = [9, 14]; S.persist();
      sc = null; W.enter();
      return act(() => say([[null, 'The party wakes by the camp fire, bruised. No tape left to play, and the expedition will start again from its first floor.'], ['dutch', 'Up. We read the record first this time. Then we go again.', 'tired']]));
    }
    const f = { x5shops: 'xp1', x5records: 'xp2', x5tower: 'xp3' }[xp];
    setFlag(f);
    R.gainXp(80);
    if (xp === 'x5tower') {
      w().pos = [40, 7]; S.persist();
      sc = null; W.enter();
      return act(() => say([[null, 'Below the Observatory, the tower is quiet. Somewhere above, Iris is running for the real Astronomy Tower, on the town floor.'], ['dutch', 'Stay here. All of you. This one\'s mine.', 'stone']]));
    }
    w().pos = xp === 'x5shops' ? [13, 12] : [13, 12]; S.persist();
    sc = null; W.enter();
  }
  cut.def('ledgers', 'The trial\'s ledgers', () => vn([['bg', 'c5-closet'],
    ['narr', 'Under the closet\'s last shelf: the trial\'s ledgers. Lina hid them here, and Iris burned them. But Freya\'s template rebuilds the Arcanum exactly, every night, closet and all.'],
    ['narr', 'Freya copies everything and reads nothing. The ledgers are back on the shelf.'],
    ['show', 'dutch', 'frozen', 'center'],
    ['narr', 'A column of names from twenty-five years ago, each marked "drained" or "spared". His own, in a clerk\'s neat hand: DRAINED. Two lines below: IRIS VELL. SPARED.'],
    ['dutch', 'I washed out. I thought there was nothing in me.', 'frozen'],
    ['narr', 'He touches the line with his name on it, and something flickers in his hands: a little of his old magic, coming back. The drain can be rolled back.'],
    ['dutch', 'There was something in me. Somebody took it.', 'grief']]), { music: 'c5sad', note: 'Under the closet\'s last shelf.' });
  cut.def('chart', 'Lina\'s chart', () => vn([['bg', 'c5-ward'],
    ['narr', 'At the foot of the empty bed by the window: Lina\'s chart. Her magic, rising for three nights. Then at 23:40 on the fourth, a drop straight to the floor.'],
    ['narr', 'The visitors\' book for that night, in the same hand as every night before it: Prof. I. Vell, 23:30, with flowers.'],
    ['show', 'mira', 'sad', 'left'],
    ['mira', 'Nobody had an alarm on it. The line went flat, and nobody was woken.', 'sad'],
    ['show', 'dutch', 'stone', 'right'],
    ['dutch', 'Flowers. Every night. She told me herself.', 'stone']]), { music: 'c5sad', note: 'Nobody had an alarm on it.' });
  cut.def('observatory', 'The Observatory, 23:50', () => vn([['bg', 'c5-observatory'],
    ['narr', 'The Observatory, floor 80. 23:50. Iris stands at the rail with the students along the walls, each holding one of her lanterns.'],
    ['show', 'iris', 'warm', 'right'],
    ['iris', 'Dutch. I visited a sick girl with flowers. Every night. You can\'t make a crime of kindness.', 'warm'],
    ['show', 'dutch', 'stone', 'left'],
    ['dutch', 'I\'m not going to tell you what I\'m sure of. I\'m going to read you the record.', 'stone']]), { music: 'c5culprit', note: 'Iris at the rail, the students along the walls.' });
  cut.def('lanterns-1', 'A third of the lanterns go out', () => vn([['bg', 'c5-observatory2'], ['narr', 'A third of the lanterns go out along the walls.']]), { music: 'c5culprit', note: 'After the ward record.' });
  cut.def('lanterns-2', 'Another third go out', () => vn([['bg', 'c5-observatory3'], ['narr', 'Another third go out.'], ['show', 'theo', 'earnest', 'center'], ['theo', 'I was on the stair, Professor. I told them. Nobody wrote it down.', 'earnest']]), { music: 'c5culprit', note: 'After the infirmary chart.' });
  cut.def('lanterns-3', 'The last lanterns go out', () => vn([['bg', 'c5-observatory0'], ['narr', 'The last lanterns go out. In the dark, the students are looking at Iris now, not at her light.'],
    ['show', 'iris', 'cold', 'right'], ['iris', 'Then move the floor, Dutch. If you can, before midnight.', 'cold']]), { music: 'c5culprit', note: 'After the relay map.' });
  cut.def('clock', 'Cron stops the clock', () => vn([['bg', 'c5-clock'],
    ['narr', 'At 100% her version is gone. In the clocktower, Farmer Cron puts his hand on the great gear, and stops it at 23:59.'],
    ['show', 'cron', 'earnest', 'center'],
    ['cron', 'Pa did everything at midnight. I don\'t have to.', 'earnest'],
    ['narr', 'Freya\'s pipeline breaks for good. From now on, nothing in the tower grows back.']]), { music: 'c5clock', note: 'After the traffic bar.' });
  // Cues from the floors' intros and outros (js/c5-data.js).
  const CUES = {
    async kaito() {
      await say([[null, 'High on a gantry over the Assembly Line, a young man in a red cape stands with his arms folded, fifty-two services burning below him.'],
        ['kaito', 'I don\'t need help. I have the Legendary Skill: Kubernetes.', 'smug'],
        ['dutch', 'Sure, kid. Is the fire part of the skill?', 'stone'],
        ['kaito', 'The fire is a known issue.', 'earnest']]);
    },
    // The midpoint: the trial's ledgers, rebuilt every night on the closet's shelf.
    async ledgers() {
      mus('c5sad'); sfx('x-stamp');
      await cut.play('ledgers');
      await ask({ c: 'trailproof', type: 'mc', q: 'The ledgers are records someone could have changed after the fact. On a CloudTrail trail, what lets you prove no log file was changed or deleted after delivery?',
        opts: ['Log file integrity validation, checked with aws cloudtrail validate-logs', 'S3 Versioning on the bucket', 'A longer retention period', 'Encrypting the logs with SSE-KMS'], a: 0,
        why: 'With integrity validation on, CloudTrail delivers signed hourly digest files holding a hash of each log file. validate-logs checks the files against them.',
        eli5: 'A wax seal on every page. If anyone tears out or rewrites a page, the seal won\'t match.' }, 'THE TRIAL\'S LEDGERS');
      setFlag('ledgers');
      mus('c5dungeon');
    },
    async chart() {
      await cut.play('chart');
      setFlag('chart');
      mus('c5dungeon');
    },
    async theo() {
      await say([[null, 'Behind a relay cabinet, a man in a dock worker\'s coat, hiding with a dozen drained students, a folded map in his fist.'],
        ['theo', 'Dutch. Dutch Halloran. You got old.', 'tired'],
        ['dutch', 'Theo. You were on the stair that night.', 'stone'],
        ['theo', 'I was on the stair. I told them. Nobody wrote it down. I\'ve got the wards\' relay map, if anyone wants to read it this time.', 'earnest']]);
      setFlag('theo');
    },
    async clock() {
      await say([[null, 'Above the Relay Floor, the tick of a clock the size of a house.'], ['cron', 'That\'s the one I wound. Every night, because the schedule said. I\'m sorry.', 'sad'], ['dutch', 'You came down. That counts.', 'neutral']]);
    },
    // The confrontation, 23:50: three pieces of evidence, and a third of the lanterns go out with each.
    async confront() {
      await cut.play('observatory');
      await ask({ c: 'trailproof', type: 'mc', q: 'The wards logged every door in the tower. What did Lina have to turn on so the ward on the staff stair recorded who read the pages?',
        opts: ['Data events, which are off by default', 'Management events, which are off by default', 'A longer event history', 'Nothing: everything is recorded'], a: 0,
        why: 'Trails record management events by default. Object-level reads and writes are data events, recorded only when you add them.',
        eli5: 'The ward wrote down every door that opened, but not who read the pages, until she asked it to.' }, 'EVIDENCE 1 · THE WARD RECORD');
      sfx('x-chime');
      await cut.play('lanterns-1');
      await ask({ c: 'metrics', type: 'mc', q: 'Lina\'s magic drops at 23:40. Which would have caught it as it happened?',
        opts: ['A metric with an alarm on it', 'A log line', 'A trace', 'A dashboard'], a: 0,
        why: 'A log or a dashboard only helps someone who looks. A metric with an alarm acts on its own when the line crosses the threshold.',
        eli5: 'A health bar with a bell on it rings when it drops into the red. A diary entry waits for someone to read it.' }, 'EVIDENCE 2 · THE INFIRMARY CHART');
      sfx('x-chime');
      await cut.play('lanterns-2');
      await ask({ c: 'tracing', type: 'mc', q: 'A request from Iris\'s office reaches the infirmary ward in two hops. What shows the path, and the time spent in each hop?',
        opts: ['An X-Ray trace, with a segment for each service', 'A CloudWatch alarm', 'The bucket\'s server access logs', 'A CloudFormation change set'], a: 0,
        why: 'A trace follows one request through every service. Each service records a segment, so the trace shows the path and the time spent in each.',
        eli5: 'A tracer round on one request: you can see every room it went through, and how long it stayed in each.' }, 'EVIDENCE 3 · THE RELAY MAP');
      sfx('x-chime');
      await cut.play('lanterns-3');
      setFlag('confront');
      mus('c5culprit');
    },
    // After the last floor: the traffic bar, then Cron stops the clock.
    async shift() {
      mus('c5clock');
      await G.shift(G.DEF.shift);
      await cut.play('clock');
      setFlag('shift');
    }
  };

  // ---------- Camp ----------
  async function rescued() {
    mus('camp');
    await say([[null, 'Ayo comes down the stairs to camp booming, with an anvil under one arm. Kaito comes down behind him, cape first, insisting he\'s only visiting.'],
      ['ayo', 'You taught me to scale OUT, and the template chained me to ONE ANVIL again! I am opening a forge. Here. Now.', 'laugh'],
      ['kaito', 'I\'m only here because my machines need a quieter place to run.', 'smug'],
      ['dutch', 'Machines. Sure.', 'stone']]);
    setFlag('rescued');
  }
  async function ship() {
    if (!flag('xp1')) return say([[null, 'A desk where the party ships fixes by hand. A stack of buildspecs, unread.']]);
    if (flag('ship')) return say([[null, 'The pipeline runs on its own now: source, build, test, approve, deploy.']]);
    const r = await G.order(G.DEF.ship);
    setFlag('ship'); R.gainXp(r.mistakes === 0 ? 30 : 15);
    await addCard('x5-pipeline'); await addCard('x5-approval');
  }
  async function ayo() {
    if (!flag('blueprint')) {
      await say([['ayo', 'Every bent sword gets a post-mortem. This chapter I write one for Pingsby, and you\'re helping. First: read the template before you swing!', 'happy']]);
      await G.sort(G.DEF.drift);
      await ask({ c: 'iac', type: 'mc', q: 'Ayo wants the sword table kept even if someone deletes the stack, and even if a template change replaces it. What does the template need?',
        opts: ['DeletionPolicy: Retain and UpdateReplacePolicy: Retain', 'DeletionPolicy: Retain only', 'A stack policy only', 'Termination protection on the stack'], a: 0,
        why: 'DeletionPolicy covers deleting the stack or removing the resource; UpdateReplacePolicy covers an update that replaces it. Both are needed.',
        eli5: 'Two shields for the treasure: one for when the castle is torn down, one for when the vault is rebuilt.' }, 'EVERY BENT SWORD');
      setFlag('blueprint'); R.gainXp(30);
      await addCard('x5-changeset'); await addCard('x5-drift');
      await addCard('x5-blueprint', 'PLOT DEVICE: AYO\'S BLUEPRINT');
      return U.system('THE REWRITE LIFTED', 'No more Rewrite cards in your decks.', 'gold');
    }
    return review('ayo');
  }
  async function kaito() {
    if (!flag('helm')) {
      await say([['kaito', 'I don\'t need help. But if you were going to help, hypothetically, the bill is the problem. And the roles. Hypothetically.', 'earnest'],
        [null, 'Behind him, fifty-two machines hum, smoke, and send each other messages. One of them is on fire.'],
        ['kaito', 'It isn\'t on fire. It\'s horizontally scaled fire.', 'smug'],
        ['dutch', 'What does this one do?', 'stone'], ['kaito', 'It calls that one.', 'smug'],
        ['dutch', 'What does that one do?', 'stone'], ['kaito', '...It calls this one.', 'earnest'],
        ['dutch', 'Who calls either of them?', 'stone'], [null, 'Nobody says anything for a while. Both machines hum on, billing by the hour.']]);
      await G.sort(G.DEF.machines);
      await G.sort(G.DEF.roles);
      setFlag('helm'); R.gainXp(30);
      await addCard('x5-taskrole'); await addCard('x5-fargate');
      await addCard('x5-helm', 'BOON: KAITO\'S HELM');
      return say([['kaito', 'Take it. Not because you helped. I just have a spare.', 'smug']]);
    }
    return say([['kaito', rnd(['Seven machines. It\'s fine. It\'s more than fine.', 'Legendary Skill: Kubernetes. Also, now, Fargate.', 'I was going to delete the health-check checker anyway.', 'Nothing here calls anything that calls it back. I checked. Twice.']), 'smug']]);
  }
  async function cronArrives() {
    mus('camp');
    await say([[null, 'That night someone slips down the tower stair to camp: an old farmer in a straw hat, his pocket watch in his hand.'],
      ['cron', 'I\'m Cron. I run the midnight redeploy, up in the clocktower. Because the schedule said to. Because Pa did everything at midnight.', 'sad'],
      ['cron', 'It drains them again every night, the students. I didn\'t know until tonight. Help me stop it?', 'earnest'],
      ['dutch', 'Sit. Not that chair.', 'neutral'],
      [null, 'He hangs one thing over his cot before he sleeps: an embroidered sampler, old and careful. cron(0 0 * * ? *) — Pa.'],
      ['seoyeon', 'Midnight. Every day, every month, every year.', 'neutral'],
      ['lexi', 'In UTC.', 'earnest'],
      ['cron', '...Pa never said UTC.', 'sad']]);
    setFlag('cron');
  }
  async function cron() {
    if (!flag('cron')) return;
    if (!flag('watch')) {
      await say([['cron', 'Four midnight jobs. Pa did them all at once. Show me another way.', 'earnest']]);
      await G.door(G.DEF.night);
      await G.sort(G.DEF.nights);
      await ask({ c: 'deploycfg', type: 'mc', q: 'One of Cron\'s deployments failed in the AfterInstall hook on an EC2 instance, and the console only says the script exited with code 1. Where is the script\'s own output?',
        opts: ['In scripts.log under the CodeDeploy agent\'s deployment-root folder on that instance', 'In the pipeline\'s execution history', 'In CloudTrail', 'Nowhere: hook output isn\'t kept'], a: 0,
        why: 'The CodeDeploy agent writes each hook script\'s output to scripts.log under /opt/codedeploy-agent/deployment-root/ for that deployment group and deployment.',
        eli5: 'The script\'s own diary is kept on the machine where it ran, in the agent\'s scripts.log.' }, 'THE NIGHT THE CLOCK STOPPED');
      setFlag('watch'); R.gainXp(30);
      await addCard('x5-hooks'); await addCard('x5-rollback');
      await addCard('x5-watch', 'PLOT DEVICE: CRON\'S STOPPED WATCH');
      return U.system('MIDNIGHT REGROWTH LIFTED', 'No more Midnight Regrowth in your decks.', 'gold');
    }
    return review('cron');
  }
  async function pella() {
    if (!flag('ledger')) {
      await say([['pella', 'Two hundred years of trial records, and every query costs me a week\'s stipend. It shouldn\'t. Help me ask the cheapest question?', 'frustrated']]);
      await G.door(G.DEF.cheapest);
      await ask({ c: 'datalake', exam: 'SAA', type: 'mc', q: 'Pella wants most readers kept away from the students\' names column in the trial tables, which Athena queries through the Glue Data Catalog. What does that?',
        opts: ['Lake Formation column-level permissions', 'A bucket policy on the records', 'Converting the column to Parquet', 'A Glue crawler'], a: 0,
        why: 'Lake Formation grants permissions on Data Catalog tables down to columns, rows and cells, and Athena enforces them.',
        eli5: 'The library keeper can hide one column from most readers, however they ask.' }, 'TWO HUNDRED YEARS');
      setFlag('ledger'); R.gainXp(30);
      await addCard('x5-partition'); await addCard('x5-parquet');
      await addCard('x5-ledger', 'BOON: PELLA\'S LEDGER');
      return;
    }
    return review('pella');
  }
  cut.def('deal', 'Freya\'s deal', () => vn([['bg', 'c5-camp'],
    ['show', 'freya', 'neutral', 'right'],
    ['freya', 'No gift this time, love. A deal. I\'ll give you Iris. On the tower, at midnight, alone. Just let me keep the pipeline.', 'neutral'],
    ['show', 'dutch', 'stone', 'left'],
    ['narr', 'Dutch doesn\'t answer for a long time.'],
    ['dutch', 'Sit. No, the other chair.', 'stone'],
    ['narr', 'She does. It wobbles.'],
    ['narr', 'When she\'s gone there\'s a card on the chair: "How likely are you to recommend the Free Tier to a friend? 0 to 10." Kai adds it to the kindling under the stove.']]), { music: 'freya', note: 'Iris, alone, at midnight. It wobbles.' });
  async function deal() {
    await cut.play('deal');
    mus('camp');
    setFlag('deal');
  }
  async function dboard() {
    if (!flag('xp2')) return say([[null, 'A board on an easel. Someone has written on it: "Before Iris: draw the safe pipeline." Not yet.']]);
    if (flag('board')) return say([[null, 'The safe pipeline, drawn and checked: commit, build, test alias, approval, canary with an alarm, tracing on.']]);
    await G.order(G.DEF.board);
    await ask({ c: 'shifting', type: 'mc', q: 'The interviewer taps the alarm on your board. "This one rolls the canary back. What should it measure?"',
      opts: ['Errors on the live alias for the new version, above the normal rate', 'The account\'s total Lambda invocations', 'The old version\'s duration', 'The number of deployments today'], a: 0,
      why: 'Invoked through an alias, Lambda publishes metrics by alias and executed version, so the alarm can watch the new version\'s errors alone. Set it above the normal error rate, or a good release rolls back.',
      eli5: 'Watch the new recruit\'s mistakes, not the whole army\'s, and don\'t ring the bell for one normal slip.' }, 'DESIGN BOARD · THE INTERVIEWER');
    setFlag('board'); R.gainXp(30);
    await addCard('x5-canary'); await addCard('x5-trace');
  }
  cut.def('turned-on', 'Pair scene: Turned On', () => vn([['bg', 'c5-diary'],
    ['narr', 'The night before. Seo-yeon finds Dutch by the fire, writing in the back of the diary, in the cipher: the tower, the button, everything since. One entry a day.'],
    ['show', 'seoyeon', 'neutral', 'left'],
    ['seoyeon', 'You\'re keeping a log.', 'neutral'],
    ['show', 'dutch', 'tired', 'right'],
    ['dutch', 'Lina turned a ward on a week before she needed it. If she hadn\'t, there\'d be no record of anything.', 'tired'],
    ['seoyeon', 'Like data events. They\'re off until someone turns them on, and you only find out you needed them afterwards.', 'neutral'],
    ['dutch', 'The wards logged who changed the rooms. Not who read the pages in them.', 'stone'],
    ['narr', 'He hands her the pencil.'],
    ['dutch', 'Learn the cipher.', 'neutral'], ['seoyeon', 'Why?', 'neutral'], ['dutch', 'So someone can read mine.', 'warm'],
    ['narr', 'She taps three, one, four on the table, and he taps it back first.']]), { music: 'c5sad', note: 'Seo-yeon and Dutch, the night before.' });
  // Turned On (Seo-yeon and Dutch): the night before the finale. Dutch's chapter upgrade.
  async function turned() {
    await cut.play('turned-on');
    await ask({ c: 'trailproof', type: 'mc', q: 'Which CloudTrail events does a trail record by default, and what must you turn on to record who read an object in an S3 bucket?',
      opts: ['Management events by default; data events for the bucket to record reads', 'Data events by default; management events for reads', 'Everything by default', 'Nothing by default; server access logs record the caller\'s IAM identity reliably'], a: 0,
      why: 'Management events are recorded by default. S3 GetObject is a data event, recorded only once you add data events for the bucket.',
      eli5: 'The chronicle writes the big orders by itself. To write down every chest opened, you have to ask.' }, 'TURNED ON');
    mus('camp');
    setFlag('turned');
    await U.system('DUTCH\'S UPGRADE: TURNED ON', 'Data events, on. In Expedition III, Dutch\'s Master Key reveals every hidden intent for the rest of the fight, whoever plays him.', 'gold');
  }
  cut.def('cat-cable', 'The marsh cat and the machines', () => vn([['bg', 'c5-camp'],
    ['narr', 'The marsh cat walks out of Kaito\'s machines with one of his cables in its mouth. Three of them stop humming.'],
    ['narr', 'Four people say four names at once: "Patient." "Chef." "Honoured Guest." "Suspect."'],
    ['kaito', 'That was redundant anyway.', 'smug'],
    ['narr', 'Down the hill, Marrow\'s bell rings, once for each machine.']]), { note: 'One of Kaito\'s cables, taken.' });
  async function fire() {
    if (!flag('up')) return;
    if (!flag('cat5')) {
      setFlag('cat5');
      return cut.play('cat-cable');
    }
    if (flag('board') && flag('watch') && flag('ledger') && flag('deal') && !flag('turned')) return turned();
    return review('fire');
  }
  // Camp review lessons: questions on what you're weakest at, the last missed first.
  async function review(who) {
    const want = { ayo: ['ec2buy', 'scaling', 'loadbal', 'containers', 'ebdeploy', 'edgecompute', 'iac'], cron: ['cicd', 'deploycfg', 'shifting', 'stages', 'appcfg'], pella: ['datalake', 'familiars'], fire: null }[who];
    const seen = Object.keys(SD.concepts).filter(c => S.concept(c).seen && (!want || want.includes(c)));
    const pool = w().miss.filter(c => seen.includes(c)).concat(S.pickConcepts(3, seen.length ? seen : ['scaling']));
    const cs = [...new Set(pool)].slice(0, 3);
    const title = { ayo: 'AYO\'S POST-MORTEMS', cron: 'CRON\'S RELEASE CALENDAR', pella: 'PELLA\'S LIBRARY HOUR', fire: 'BY THE FIRE' }[who];
    await say([[who === 'fire' ? 'dutch' : who, { ayo: 'Post-mortems! Three past fights, three root causes!', cron: 'Three from the calendar, the ones that are due.', pella: 'Library hour. Three questions, cheapest first.', fire: 'Three, the ones you dropped last. Then sleep.' }[who], 'neutral']]);
    let right = 0;
    for (const c of cs) {
      const q = D.pickQ(c); if (!q) continue;
      const r = await SD.quiz.ask(q, { title });
      if (r && r.ok) right++;
    }
    R.gainXp(10 + right * 5);
  }

  // ---------- The tower ----------
  cut.def('backoff', 'Pair scene: Backoff', () => vn([['bg', 'c5-observatory'], ['show', 'kai', 'smirk', 'left'], ['show', 'dutch', 'stone', 'right'],
    ['narr', 'At the Astronomy Tower\'s door, Kai and Dutch both go for it first, and wedge in it, shoulder to shoulder.'],
    ['dutch', 'In my old job, when two guys swung at once, nobody landed anything. You back off, wait a bit longer each time, and don\'t go at the same time.', 'stone'],
    ['kai', 'Exponential backoff with jitter.', 'smirk'],
    ['dutch', 'Bless you.', 'neutral']]), { note: 'Kai and Dutch, wedged in the door.' });
  // Backoff (Kai and Dutch), at the Astronomy Tower's door.
  async function backoff() {
    await cut.play('backoff');
    await ask({ c: 'integdebug', type: 'mc', q: 'Why do the AWS SDKs add jitter when they retry throttled requests with exponential backoff?',
      opts: ['So clients that failed together don\'t all retry at the same moment again', 'To make each retry faster than the last', 'To skip the backoff when the service is busy', 'To retry forever'], a: 0,
      why: 'Without jitter, clients that were throttled together back off for the same time and collide again. A random wait spreads the retries out.',
      eli5: 'If everyone who bumped into the door waits exactly two seconds, they all bump again. Wait a random bit, and you go through one at a time.' }, 'BACKOFF');
    setFlag('backoff');
  }
  cut.def('rail', 'The rail', () => vn([['bg', 'c5-rail'],
    ['narr', 'The real Astronomy Tower, on the town floor. Dutch follows her up alone. At the rail, he has Iris by the collar, the way he held Caspian.'],
    ['show', 'iris', 'frozen', 'right'],
    ['iris', 'You won\'t. You didn\'t then.', 'frozen'],
    ['show', 'dutch', 'stone', 'left']]), { music: 'c5culprit', note: 'Dutch has Iris by the collar.' });
  cut.def('rail-hold', 'The rail: he holds', () => vn([['bg', 'c5-rail'], ['narr', 'He holds. Freya\'s blessing pulls Iris up out of his hands anyway, and he\'s left holding a strip of her scarf. Lilac.'],
      ['show', 'ashgrove', 'cold', 'right'],
      ['narr', 'Lord Ashgrove has followed him up the stair.'],
      ['ashgrove', 'Mr. Dutch.', 'cold'],
      ['dutch', 'Your boy grabbed for her hand. He tried to catch her.', 'grief'],
      ['narr', 'It\'s the first time he has told anyone what\'s true, instead of what he\'s sure of.'],
      ['ashgrove', '...', 'stone'],
      ['narr', 'Ashgrove calls off the watch the next morning. He doesn\'t forgive him.']]), { music: 'c5culprit', note: 'If Dutch holds on.' });
  cut.def('rail-let', 'The rail: he lets go', () => vn([['bg', 'c5-rail'], ['narr', 'He lets go. Freya\'s blessing catches her and takes her up the tower. He did it on purpose this time, and he knows it.'],
      ['show', 'ashgrove', 'cold', 'right'],
      ['narr', 'Lord Ashgrove has followed him up the stair.'],
      ['ashgrove', 'Mr. Dutch.', 'cold'],
      ['dutch', 'Your boy grabbed for her hand. He tried to catch her.', 'grief'],
      ['narr', 'It\'s the first time he has told anyone what\'s true, instead of what he\'s sure of.'],
      ['ashgrove', '...', 'stone'],
      ['narr', 'Ashgrove calls off the watch the next morning. He doesn\'t forgive him.']]), { music: 'c5culprit', note: 'If Dutch lets go.' });
  cut.def('chart-uptima', 'Uptima reads the chart', () => vn([['bg', 'c5-ward'], ['show', 'uptima', 'neutral', 'center'],
    ['narr', 'Uptima reads the prayer: "Let her wake up. Once. Then take whatever you want."'],
    ['narr', 'And then she does something no one asked her to. She reads the healers\' chart with him, line by line, and shows him the three nights Lina\'s magic was rising.'],
    ['uptima', 'She was coming back. She nearly did.', 'sad'],
    ['show', 'dutch', 'grief', 'left'], ['dutch', 'That\'s not better.', 'grief'],
    ['uptima', 'No. But it\'s true.', 'neutral']]), { music: 'c5sad', note: 'She was coming back. She nearly did.' });
  cut.def('dawn', 'The lanterns go out across the band', () => vn([['bg', 'c5-dawn'],
    ['narr', 'The students\' lanterns go out across the band. The drain is rolled back, for the living and for Dutch.'],
    ['narr', 'They come down to the camp: Theo opens the records office, Cron\'s farm takes the camp\'s schedules, Pella teaches in the library, and Ayo\'s forge goes on.']]), { music: 'c5sad', note: 'The end of Chapter 5.' });
  // The rail: hold on, or let go. Then Ashgrove, Uptima, and the floors freed.
  async function rail() {
    await cut.play('rail');
    const ch = await new Promise(res => {
      const b = U.panel(`<p>Iris Vell, by the collar, over the rail. <span class="muted small">Either way, Freya's blessing takes her up the tower. What matters is what Dutch does with his hands.</span></p>
        <div class="opts col">
        <button class="opt" data-ch="hold">Hold on<br><span class="muted small">He holds. Freya pulls her up out of his hands anyway.</span></button>
        <button class="opt" data-ch="let">Let go<br><span class="muted small">He lets go, on purpose this time, and knows it.</span></button></div>`, { title: 'THE RAIL', noClose: true, cls: 'wide' });
      b.querySelectorAll('[data-ch]').forEach(el => el.onclick = () => { sfx('ok'); U.closePanel(); res(el.dataset.ch); });
    });
    c5().choice = ch; S.persist();
    // One call per ending, so each ending's cutscene (the-rail-hold, the-rail-let) plays the Ashgrove shots.
    if (ch === 'hold') await cut.play('rail-hold');
    else await cut.play('rail-let');
    await cut.play('chart-uptima');
    setFlag('rail');
    await cut.play('dawn');
    setFlag('freed');
    c5().f.done = true; S.persist();
    R.gainXp(60);
    return endCard();
  }
  function endCard() {
    if (sc && W.active) refresh();
    W.halt();
    const next = SD.chapterStart && SD.chapterStart[6];
    AU.music('title');
    U.stage(null);
    const sv = S.save, ch = { hold: 'held on, and was left with a strip of lilac', let: 'let go, on purpose, and knows it' }[c5().choice] || 'hasn\'t been to the rail yet';
    const b = U.panel(`<div id="c5-end"><p><b>The Machine Floors are freed.</b> At the rail, Dutch ${esc(ch)}.</p>
      <p class="muted small">Level ${sv.level} · ${w().pages.length} of 8 pages of Lina's diary · ${w().cards.length} cards learned on the floors</p>
      <p class="muted small">The reckoning, Spared, opens once the party clears Chapter 6's first expedition.</p>
      <div class="opts col">
      ${next ? '<button class="primary" id="c5-next">Continue to Chapter 6</button>' : '<p class="muted">Chapter 6: to be continued.</p>'}
      <button class="ghost" id="c5-walk">Keep walking the floors</button></div></div>`, { title: 'CHAPTER 5 · THE MACHINE FLOORS', noClose: true });
    const n = b.querySelector('#c5-next'); if (n) n.onclick = () => { U.closePanel(); SD.chapterStart[6](); };
    b.querySelector('#c5-walk').onclick = () => { U.closePanel(); sc = null; W.enter(); };
  }

  // ---------- Pages and people ----------
  async function page(i) {
    if (!pageHere(i)) return;
    const [, , c, text] = PAGES[i];
    w().pages.push(i); S.persist();
    sfx('x-page');
    await say([[null, `A page of Lina's diary. ${text}`]]);
    // Half the pages ask about this chapter, half about whatever older lesson is due.
    const older = Object.keys(SD.concepts).filter(k => SD.concepts[k].zone < 5 && S.concept(k).seen);
    const cc = c || (older.length ? S.pickConcepts(1, older)[0] : 'scaling');
    const q = D.pickQ(cc);
    if (q) { const r = await SD.quiz.ask(q, { title: 'A PAGE OF LINA\'S DIARY' }); R.gainXp(r && r.ok ? 15 : 5); }
    if (w().pages.length === PAGES.length) { await U.system('ALL EIGHT PAGES', 'Every page of Lina\'s diary. +50 XP.', 'gold'); R.gainXp(50); SD.tapes.award('c5diary', 1, 'Lina\'s diary has a tape for a bookmark, and the redeploy never found it.'); }
  }
  function door(d) {
    if (busy) return;
    if (d === 'up') return act(async () => { sfx('x-lift'); goTo(13, 12); });
    if (d === 'down') return act(async () => {
      if (!flag('tapes')) return;
      sfx('x-lift'); goTo(19, 12);
      if (!flag('up')) setFlag('up');
    });
    const n = { xp1: 1, xp2: 2, xp3: 3 }[d];
    if (n) return act(() => xpDoor(n));
  }
  function talk(id) {
    if (busy) return;
    if (sc.actors[id] && !sc.actors[id].thing) { const a = sc.actors[id], P = sc.P; a.face = Math.abs(P.x - a.x) >= Math.abs(P.y - a.y) ? (P.x > a.x ? 'east' : 'west') : (P.y > a.y ? 'south' : 'north'); }
    if (GATES[id]) return act(() => gate(id));
    if (/^page\d$/.test(id)) return act(() => page(+id.slice(4)));
    if (LW.talk(id)) return;
    const poster = () => say([[null, 'WANTED: the drunk enforcer who threw an heir off the Astronomy Tower. By order of Lord Ashgrove. The nose is wrong.']]);
    const fns = { ship, dboard, fire, station, stepsT: steps, ashgrove, watch1: ashgrove, watch2: ashgrove, iris, stu1: iris, stu2: iris, arcanum: iris,
      ayo, cforge: ayo, kaito, machines: kaito, cron, clock: cron, pella, carrel: pella, freya: deal, ayoU: chainGate,
      post1: poster, post2: poster, post3: poster, post4: poster,
      ashT: async () => { await say([['ashgrove', 'She went up. You\'re going after her. I\'m coming too, Mr. Dutch. I want to see what you do with your hands.', 'cold']]); if (flag('xp3') && !flag('rail')) return rail(); },
      bell: () => { sfx('x-bell'); return say([[null, 'The lecture bell. A card is tied to the rope: "Ring for a release. Ring twice to undo."']]); },
      forge: () => say([[null, flag('xp1') ? 'The Workshops, quieter now. Ayo\'s anvil is gone from its chain.' : 'The Workshops. Somewhere inside, a huge voice is shouting "SCALE OUT!" at nobody.']]),
      mop: () => flag('mopq') ? say([[null, 'A mop in a bucket. It has no logs. You can\'t tell what it did.']]) : (setFlag('mopq'), say([[null, 'A mop in a bucket, in the corner of the closet.'],
        ['dutch', 'I know that bucket. It\'s done things.', 'stone'], ['seoyeon', 'Prove it.', 'neutral'],
        [null, 'A long pause.'], ['dutch', '...It has no logs.', 'tired']])),
      shelf1: () => say([[null, 'Shelves of the Arcanum\'s records, every one of them Freya\'s perfect copy, rebuilt tonight.']]), shelf3: () => say([[null, 'More shelves. A faint green grid runs over every spine.']]),
      sch1: () => say([['scholar', flag('freed') ? 'My lantern went out this morning. I\'ve never felt so awake.' : 'Lecture at nine. Professor Vell\'s, if you can get in.', 'neutral']]),
      sch2: () => say([['scholar', flag('freed') ? 'The posters came down overnight. All of them.' : 'Have you seen this man? No? Good. Nor have I.', 'neutral']]) };
    if (T.order.includes(id)) return act(() => say([[id, rnd({ mira: ['Eat something first, love. Then the records.', 'He\'s turning that button over again. Don\'t ask him.'], kai: ['The refectory here has a decent oven. Shame about everything else.', 'I\'m not touching the grid. I\'m just saying I could.'], seoyeon: ['Read the record. Then the face.', '...'], dutch: ['Read the record first. Then decide.', 'I was sure. For twenty-five years. That\'s the problem.'] }[id])]]));
    if (fns[id]) return act(fns[id]);
  }

  // ---------- The objective, and where the arrow points ----------
  // [what to do, [x, y], the actor with the "!"]
  function step() {
    const f = flag;
    if (!f('tapes')) return ['The first night at the tower\'s foot', [8, 13], 'fire'];
    if (!f('up')) return ['Take the lift up into the Arcanum (east side of camp)', [14, 12], null];
    if (!f('arrive')) return ['Floor 61, the Arcanum\'s city', [20, 12], null];
    if (!f('ashgrove')) return ['Someone is reading the wanted posters', [28, 12], 'ashgrove'];
    if (!f('iris')) return ['The Arcanum\'s gate: the lantern students', [26, 8], 'iris'];
    if (!f('offer')) return ['The Crown\'s old station', [22, 18], 'station'];
    if (!f('voice')) return ['Night: sit with the diary on the station steps', [21, 18], 'stepsT'];
    if (!f('trail')) return ['The janitor\'s closet, down the stair south of the square', [31, 25], 'gcloset'];
    if (!f('chain')) return ['Inside the closet', [31, 30], null];
    if (!f('buy')) return ['The Workshops\' gate, east along the avenue', [47, 12], 'gwork'];
    if (!f('metric')) return ['The forge door: Kyu\'s page', [56, 9], 'gforge'];
    if (!f('xp1')) return ['Expedition I: the Workshops, past the forge', [59, 4], null];
    if (!f('rescued')) return ['Back to camp: Ayo and Kaito are coming down', [13, 12], null];
    if (!f('ship')) return ['Ship It: the first real pipeline, at camp', [5, 10], 'ship'];
    if (!f('blueprint')) return ['Ayo\'s forge, at camp: Every Bent Sword', [3, 13], 'ayo'];
    if (!f('helm')) return ['Kaito, at camp, who does not need help', [10, 16], 'kaito'];
    if (!f('cut')) return ['Ayo will cut the chain on the closet\'s lower stair', [37, 36], 'ayoU'];
    if (!f('button')) return ['Night in the city: the station steps', [21, 18], 'stepsT'];
    if (!f('xp2')) return ['Expedition II: the Records Floors, down the lower stair', [36, 37], null];
    if (!f('cron')) return ['Back to camp', [13, 12], null];
    if (!f('deal')) return ['Freya is waiting at camp', [12, 11], 'freya'];
    if (!f('watch')) return ['Cron\'s Night, Again: the midnight jobs', [10, 18], 'cron'];
    if (!f('ledger')) return ['Pella\'s Cheapest Question, at her carrel', [5, 17], 'pella'];
    if (!f('board')) return ['Draw the safe pipeline on the Design Board', [11, 10], 'dboard'];
    if (!f('turned')) return ['The night before: Dutch, by the fire', [7, 13], 'fire'];
    if (!f('xp3')) return ['Expedition III: the Astronomy Tower, north of the square', [40, 7], null];
    if (!f('rail')) return ['Follow Iris up the Astronomy Tower', [40, 7], 'ashT'];
    return ['The Machine Floors are freed. Pages of Lina\'s diary: ' + w().pages.length + ' of 8', null, null];
  }

  // ---------- HUD ----------
  function hud() {
    const el = $('#w-hud'); if (!el || !W.active) return;
    const sv = S.save, need = S.xpFor(sv.level), l = T.leads[lead()];
    el.innerHTML = `<span class="hud-chip"><b>${esc(l.name.split(' ')[0])}</b> · Lv ${sv.level}</span>
      <div class="bar xp w-xp" title="XP"><i style="width:${Math.min(100, sv.xp / need * 100)}%"></i></div>
      <span class="hud-chip w-goal">${esc(step()[0])}</span>
      <span class="hud-chip" title="Pages of Lina's diary">📓 ${w().pages.length}/8</span>
      <span class="hud-chip" title="Seymour's Tapes">📼 ${SD.tapes.count()}</span>
      <span class="w-sp"></span>
      ${LW.hud()}
      <button class="ghost" id="w-codex" aria-label="Cheat sheet" title="Cheat sheet">📖</button>
      <button class="ghost" id="w-snd" aria-label="Sound on or off">${AU.muted() ? '🔇' : '🔊'}</button>
      ${SD.emote ? SD.emote.mapButton() : ''}<button class="ghost" id="w-menu" aria-label="Menu">☰</button>`;
    $('#w-codex').onclick = () => U.codex();
    $('#w-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = AU.muted() ? '🔇' : '🔊'; };
    $('#w-menu').onclick = () => SD.main.menu();
    if (SD.emote) SD.emote.wire($('#w-menu').parentNode);
    LW.bind();
  }
  const ch1Hud = SD.ch1.hud;
  SD.ch1.hud = () => (W.active ? hud() : ch1Hud());

  // The floors' card rewards are this chapter's own, while one of its expeditions is on.
  if (SD.champions && SD.champions.rewards) {
    const rewards = SD.champions.rewards;
    SD.champions.rewards = champ => (W.set ? D.CARDS[W.set].slice() : rewards(champ));
  }

  // ---------- Entering and leaving ----------
  W.enter = function () {
    W.on = true;
    SD.ch1.halt();
    Object.keys(SD).forEach(k => { if (/^c\d+x?world$/.test(k) && k !== 'c5world' && SD[k] && SD[k].halt && SD[k].active) SD[k].halt(); });
    SD.ch1.dress();
    SD.main.show('world');
    $('#w-canvas').setAttribute('aria-label', 'The Free Cloud\'s camp, floor 61 and the Arcanum\'s city, the Workshops, and the undercroft');
    if (!sc) makeScene(); else applyState();
    zone = null; lastTile = ''; trail.length = 0;
    W.active = true;
    sc.start();
    hud();
    if (!flag('hinted')) { setFlag('hinted'); U.system('HOW TO MOVE', U.howTo('Arrow keys or WASD to walk, E or Enter to talk, or tap where you want to go. The yellow arrow points at your next step. Gates open when you understand them.')); }
  };
  W.halt = function () { W.active = false; if (sc) { sc.stop(); sc.locked = false; } };
  // A fresh save (the chapter select's Start, the menu's Erase save): stop this scene for good, even mid-scene.
  W.reset = function () { W.halt(); sc = null; busy = false; };
  // The chapter's start, from another chapter's end card or this demo's title.
  W.start = async function () {
    W.on = true;
    SD.ch1.halt(); U.closePanel(); U.stage(null);
    if (!S.save.c1 || !S.save.c1.lead) return W.newGame();
    c5(); S.persist();
    if (c5().f.done) return endCard();
    sc = null;
    if (!flag('cold')) await coldOpen();
    W.enter();
  };
  SD.chapterStart = SD.chapterStart || {};
  SD.chapterStart[5] = () => W.start();

  // ---------- The chapter 5 demo's own start ----------
  // Assumed, as if chapters 1 to 4 were played: level 16 at least, chapter 1's starter deck, and the earlier
  // chapters' concepts already on the cheat sheet.
  W.newGame = async function () {
    const id = await SD.ch1.choose();
    const sv = S.save;
    sv.c1 = { lead: id, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(x => ({ id: x, up: false })), pos: null };
    sv.c5 = null;
    sv.name = T.leads[id].name.split(' ')[0];
    sv.flags.prologue = true; sv.flags.ch1 = true;
    if ((sv.level || 1) < 16) { sv.level = 16; sv.xp = 0; }
    Object.keys(SD.concepts).forEach(c => { if (SD.concepts[c].zone < 5) S.seeConcept(c); });
    S.persist();
    sc = null;
    return W.start();
  };
  if (CH5) {
    const boot = () => {
      const M = SD.main, title = M.title;
      M.title = function () {
        title();
        const box = $('#title-actions'), sv = S.save;
        if (!box || box.querySelector('#t-start')) return;
        const has = !!(sv.c1 && sv.c1.lead && sv.c5);
        box.innerHTML = (has ? `<button class="primary" id="t-c5go">Continue · ${esc(T.leads[sv.c1.lead].name)}</button><button class="ghost" id="t-c5new">New game</button>` : '<button class="primary" id="t-c5new">Play Chapter 5: The Machine Floors</button>') + '<button class="ghost" id="t-help">How to play</button>';
        const h = $('#t-help');
        if (h) h.onclick = () => U.panel(U.howTo('<p>Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk. Gates open when you understand them: each one is a small puzzle.</p><p>The expeditions are raids: play cards to fix incidents, with the other three as your party, or with friends.</p>'), { title: 'HOW TO PLAY' });
        if (has) $('#t-c5go').onclick = () => W.start();
        $('#t-c5new').onclick = () => {
          if (!has) return W.newGame();
          const c = U.panel('<p>Start chapter 5 again from the cold open? Your level and cheat sheet stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' });
          c.querySelector('#n-y').onclick = () => { U.closePanel(); S.save.c5 = null; S.persist(); sc = null; W.newGame(); };
          c.querySelector('#n-n').onclick = U.closePanel;
        };
      };
      const foot = $('.t-foot'); if (foot) foot.textContent = 'Chapter 5: The Machine Floors · Built on the AWS documentation · Saves automatically';
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  }

  // For tools/c5_check.js.
  W.debug = { expedition: (xp, how) => expedition(xp, how), after: (xp, won) => after(xp, won), busy: () => busy, flags: f => { Object.assign(w().x, f); S.persist(); if (sc) applyState(); }, flag, place: (x, y) => sc && goTo(x, y), scene: () => sc, step, act, w, c5, GATES, PAGES, endCard, LW };
})();
