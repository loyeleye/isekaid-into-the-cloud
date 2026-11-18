// The Night Watch's side-view renderer and controls (doc "Look and feel"): one canvas, strict 2D side view, five
// parallax layers (sky 0, far 0.2, back 0.5, street 1, front 1.3), everyone standing on the ground line with a
// shadow under their feet, sun from the upper left by day and the moon upper right by night, weather overlays and
// the wildlife from js/watch-world.js. Art comes from window.WATCH_ART (js/watch-art.js, the art thread) when it's
// there; until then every layer and figure has a drawn placeholder in the same places and sizes.
// Controls: arrows or A/D walk, W/S or up/down take a fork or a stair, E, Enter or Space use; on touch, buttons.
(function () {
  if (!window.SD || !SD.watchWorld) return;
  const WW = SD.watchWorld, G = WW.GROUND, VW = 640, VH = WW.VIEW_H;
  const V = SD.watchView = {};
  V.TOWN_ZOOM = 0.85;   // town drawn at 85% so more of the road above and the backdrop fit (Ladi's pick, Nov 18)
  const art = () => window.WATCH_ART || null;
  const imgs = {};
  const img = src => {
    if (!src) return null;
    if (!imgs[src]) { const i = new Image(); i.src = src; imgs[src] = i; }
    return imgs[src].complete && imgs[src].naturalWidth ? imgs[src] : null;
  };
  const reduced = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const hash = s => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

  // Placeholder colours per person (until the side-view sprites land): coat, then hair.
  const LOOK = {
    seoyeon: ['#3b4a8f', '#1d1d2b'], mira: ['#8a4b3a', '#d9d0c4'], coo: ['#6d7d8c', '#9aa3ad'], bru: ['#6b5a3a', '#3a2a1c'],
    kagemaru: ['#2d3b33', '#141414'], lexi: ['#5c3f73', '#7a4a2a'], kai: ['#3a6a7a', '#1a1a1a'], dutch: ['#7a6a2a', '#b5762e'],
    hobb: ['#5a4a3a', '#cfcfcf'], pell: ['#4a5a3a', '#2a2a2a'], wen: ['#a05a6a', '#e0e0e0'], ayo: ['#8a3a2a', '#1a1a1a'],
    aigerim: ['#3a7a6a', '#2a1a1a'], doug: ['#6a6a7a', '#8a6a4a'], tess: ['#b08a3a', '#5a3a1a'], hollis: ['#5a3a2a', '#6a6a6a'],
    odu: ['#2a4a6a', '#1a1a1a'], fennel: ['#5a7a3a', '#c08040'], seymour: ['#4a4a4a', '#e0c040'], chad: ['#3a5aa0', '#e0b040'],
    kevin: ['#1a1a24', '#1a1a24'], captain: ['#6a2a2a', '#3a3a3a']
  };
  const tint = (phase) => phase === 'night' ? 'rgba(10,16,48,.55)' : phase === 'dusk' ? 'rgba(120,50,30,.22)' : phase === 'dawn' ? 'rgba(255,170,120,.12)' : null;

  // ---- Layers ----
  function sky(c, phase, sceneKind, hasLayers) {
    const a = art(), pic = a && a.skies && img(a.skies[phase === 'night' || phase === 'dusk' ? 'night' : 'day']);
    if (pic) c.drawImage(pic, 0, 0, VW, VH);
    else {
      const g = c.createLinearGradient(0, 0, 0, G);
      const top = { day: '#7fb4e6', dawn: '#e9b394', dusk: '#d27a5a', night: '#0c1430' }[phase] || '#7fb4e6';
      const low = { day: '#cfe5f5', dawn: '#f6dcc0', dusk: '#f0b080', night: '#24305a' }[phase] || '#cfe5f5';
      g.addColorStop(0, top); g.addColorStop(1, low); c.fillStyle = g; c.fillRect(0, 0, VW, VH);
      if (phase === 'night') {
        c.fillStyle = 'rgba(255,255,255,.8)';
        for (let i = 0; i < 40; i++) c.fillRect((i * 97) % VW, (i * 53) % 150, 1.5, 1.5);
        c.fillStyle = '#f2ecd0'; c.beginPath(); c.arc(VW - 80, 60, 18, 0, 7); c.fill();        // the moon, upper right
      } else if (phase === 'day') {
        c.fillStyle = 'rgba(255,240,180,.9)'; c.beginPath(); c.arc(70, 50, 22, 0, 7); c.fill();  // the sun, upper left
      }
    }
    if (sceneKind === 'castle' && !hasLayers) { c.fillStyle = 'rgba(30,26,22,.92)'; c.fillRect(0, 0, VW, VH); }   // art: windows show the sky
  }
  function layerImgs(sc) {
    const a = art(); if (!a) return null;
    const set = sc.kind === 'town' ? a.levels && a.levels[sc.id] : sc.kind === 'castle' ? a.floors && a.floors[sc.floor] : a.floors && a.floors.bridge;
    return set && set.layers ? set.layers : null;
  }
  // A drawn layer that repeats along the level: far hills (with the castle on its hill), back rooftops, posts.
  function farLayer(c, sc, cam) {
    const off = -cam * 0.2;
    if (sc.kind === 'castle') {
      // window and arrow-slit strip: the sky shows through
      c.fillStyle = 'rgba(70,64,56,1)'; c.fillRect(0, 40, VW, G - 40);
      for (let x = (off % 160) - 160; x < VW + 160; x += 160) { c.fillStyle = '#20283f'; c.fillRect(x + 60, 90, 22, 56); c.fillRect(x + 66, 70, 10, 20); }
      return;
    }
    c.fillStyle = sc.kind === 'bridge' ? '#5c6f80' : '#7d9a86';
    c.beginPath(); c.moveTo(0, G);
    for (let x = 0; x <= VW; x += 16) c.lineTo(x, G - 90 - 34 * Math.sin((x - off) / 140) - 18 * Math.sin((x - off) / 53));
    c.lineTo(VW, G); c.fill();
    if (sc.id === 'west-road' || sc.id === 'hill-road' || sc.id === 'main-street') {
      // the castle on its hill, far away to the east
      const cx = 3600 * 0.2 - cam * 0.2 + VW / 2 - 100;
      c.fillStyle = '#5d6f66'; c.fillRect(cx, G - 190, 70, 70); c.fillRect(cx - 8, G - 214, 18, 30); c.fillRect(cx + 60, G - 214, 18, 30);
    }
  }
  function backLayer(c, sc, cam) {
    if (sc.kind !== 'town') return;
    const off = -cam * 0.5;
    for (let i = -2; i < 40; i++) {
      const x = i * 130 + (off % 130), h = 60 + (hash(sc.id + i) % 50);
      c.fillStyle = 'rgba(90,80,90,.45)'; c.fillRect(x, G - h, 100, h);
      c.beginPath(); c.moveTo(x - 6, G - h); c.lineTo(x + 50, G - h - 26); c.lineTo(x + 106, G - h); c.fill();
    }
  }
  function frontLayer(c, sc, cam) {
    if (sc.kind !== 'town') return;
    const off = -cam * 1.3;
    c.fillStyle = 'rgba(40,30,22,.85)';
    for (let x = (off % 340) - 340; x < VW + 340; x += 340) { c.fillRect(x, G - 140, 7, 140 + 60); c.fillRect(x - 10, G - 146, 27, 8); }
  }

  // ---- The street: ground, buildings and spots ----
  function ground(c, sc) {
    c.fillStyle = sc.kind === 'castle' ? '#4b4038' : sc.kind === 'bridge' ? '#6b6258' : '#9b8a6a';
    c.fillRect(0, G, VW, VH - G);
    c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, G, VW, 3);
    if (sc.id === 'far-lane') { c.fillStyle = '#4f7da0'; c.fillRect(0, G + 30, VW, VH - G - 30); }
  }
  const PLACE_H = { place: 120, fix: 130, gate: 150, travel: 110, room: 0 };
  function building(c, s, sx, sc) {
    if (sc.kind === 'castle') {
      if (s.kind === 'door') { c.fillStyle = '#2a2018'; c.fillRect(sx - 4, G - 150, 8, 150); c.fillStyle = '#6a4a2a'; c.fillRect(sx - 14, G - 64, 28, 64); }
      if (s.kind === 'stair') { c.strokeStyle = s.needs ? 'rgba(233,197,109,.9)' : '#c9bfae'; c.lineWidth = 3; c.beginPath(); for (let k = 0; k < 6; k++) { c.moveTo(sx - 20 + k * 8, G - k * 22); c.lineTo(sx - 12 + k * 8, G - k * 22); } c.stroke(); }
      if (s.kind === 'lift') { c.strokeStyle = '#e9c56d'; c.lineWidth = 2; c.strokeRect(sx - 18, G - 120, 36, 120); c.beginPath(); c.moveTo(sx, 0); c.lineTo(sx, G - 120); c.stroke(); }
      return;
    }
    const h = PLACE_H[s.kind] || 0;
    if (s.kind === 'fork') { c.strokeStyle = '#7a6a4a'; c.lineWidth = 10; c.beginPath(); c.moveTo(sx, G); c.lineTo(sx + (s.dir === 'up' ? 40 : -40), s.dir === 'up' ? G - 60 : G + 40); c.stroke(); return; }
    if (!h) return;
    c.fillStyle = s.kind === 'gate' ? '#5a5048' : '#b8a488'; c.fillRect(sx - 60, G - h, 120, h);
    c.fillStyle = '#7a4a3a'; c.beginPath(); c.moveTo(sx - 70, G - h); c.lineTo(sx, G - h - 40); c.lineTo(sx + 70, G - h); c.fill();
    c.fillStyle = '#4a3020'; c.fillRect(sx - 13, G - 62, 26, 62);                       // a door sized to a person
    c.fillStyle = 'rgba(255,230,160,.7)'; c.fillRect(sx - 44, G - h + 24, 18, 16); c.fillRect(sx + 26, G - h + 24, 18, 16);
  }
  function label(c, text, sx, y, strong) {
    c.font = (strong ? '600 ' : '') + '12px system-ui, sans-serif';
    const w = c.measureText(text).width + 10;
    c.fillStyle = 'rgba(10,14,30,.66)'; c.fillRect(sx - w / 2, y - 13, w, 18);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(text, sx, y);
  }
  const STRIDE = 34, IDLE_FPS = 1.5;
  // ---- People: art sprite if there is one, else a side-view figure 64 tall, feet on the ground ----
  function person(c, who, sx, facing, moving, t, lit) {
    const a = art(), p = a && a.people && a.people[who], sheet = p && img(p.sheet);
    if (!sheet) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(sx, G + 2, 16, 4, 0, 0, 7); c.fill(); }   // art has its shadow baked in
    if (sheet) {
      const A = p.anims || {}, anim = (lit && (moving ? A.lanternWalk || A.lantern : A.lantern)) || (moving ? A.walk : A.idle) || [0];   // lit: Seo-yeon's lantern at night
      // Walking steps by distance, not time (Ladi, Nov 18: the walks looked frantic): one frame per STRIDE px, so the
      // feet keep pace with the ground at any speed. Standing still cycles slowly (breathing). t is px when moving.
      const f = anim[Math.floor(moving ? t / STRIDE : t * IDLE_FPS) % anim.length];
      const cols = Math.max(1, Math.floor(sheet.naturalWidth / p.w));
      const k = p.scale || 1;   // sheets are painted at 2x and carry scale 0.5
      c.save(); c.translate(sx, G); c.scale(facing * k, k);
      c.drawImage(sheet, (f % cols) * p.w, Math.floor(f / cols) * p.h, p.w, p.h, -p.anchor[0], -p.anchor[1], p.w, p.h);
      c.restore(); return;
    }
    const [coat, hair] = LOOK[who] || ['#555', '#222'], step = moving ? Math.sin(t * 12) * 6 : 0;
    c.save(); c.translate(sx, G); c.scale(facing, 1);
    c.strokeStyle = '#2a2a2a'; c.lineWidth = 4; c.lineCap = 'round';
    c.beginPath(); c.moveTo(-2, -24); c.lineTo(-2 + step, 0); c.moveTo(2, -24); c.lineTo(2 - step, 0); c.stroke();
    c.fillStyle = coat; c.fillRect(-9, -50, 18, 28);
    c.fillStyle = '#e8c4a0'; c.beginPath(); c.arc(1, -58, 8, 0, 7); c.fill();
    c.fillStyle = hair; c.beginPath(); c.arc(-1, -61, 8, Math.PI * 0.9, Math.PI * 2.05); c.fill();
    c.fillStyle = '#222'; c.fillRect(5, -60, 2, 2);                                         // the eye, facing forward
    c.restore();
  }
  function animal(c, a, sx, t) {
    const sk = art() && art().animals && art().animals[a.kind], sheet = sk && img(sk.sheet);
    const y = a.flier && (a.state === 'fly' || a.kind === 'bat' || a.kind === 'moth' || a.kind === 'firefly' || a.kind === 'bee') ? G - 60 - 30 * Math.sin(t * 2 + a.x / 50) : a.kind === 'duck' ? G + 34 : G;
    if (sheet) {
      const A = sk.anims || {}, anim = A[a.state] || (a.state === 'run' && A.walk) || A.idle || [0], onFoot = a.state === 'walk' || a.state === 'run';
      const f = anim[Math.floor(onFoot ? Math.abs(a.x) / Math.max(5, sk.w * (sk.scale || 1) * 0.3) : t * Math.min(sk.fps || 6, 6)) % anim.length];
      const cols = Math.max(1, Math.floor(sheet.naturalWidth / sk.w));
      // Birds on the ground hop as they walk (Ladi, Nov 18), so a walk never looks like a slide.
      const hop = a.flier && y === G && (a.state === 'walk' || a.state === 'run') ? -Math.abs(Math.sin(t * 10 + a.x * 0.1)) * 4 : 0;
      const k = sk.scale || 1; c.save(); c.translate(sx, y + hop); c.scale(a.facing * k, k);
      c.drawImage(sheet, (f % cols) * sk.w, Math.floor(f / cols) * sk.h, sk.w, sk.h, -sk.anchor[0], -sk.anchor[1], sk.w, sk.h); c.restore(); return;
    }
    const big = { horse: 46, goat: 22, dog: 18, fox: 16, cat: 12, heron: 26 }[a.kind] || 7;
    if (a.kind === 'firefly') { c.fillStyle = `rgba(230,255,120,${0.5 + 0.5 * Math.sin(t * 5 + a.x)})`; c.fillRect(sx, y, 3, 3); return; }
    c.fillStyle = { horse: '#6a4a2a', goat: '#ddd', dog: '#8a6a4a', fox: '#c0602a', cat: '#444', heron: '#aab', duck: '#6a7a3a', chicken: '#eee', rat: '#555', frog: '#4a7a3a' }[a.kind] || '#333';
    c.beginPath(); c.ellipse(sx, y - big / 2, big * 0.7, big / 2, 0, 0, 7); c.fill();
    c.beginPath(); c.arc(sx + a.facing * big * 0.75, y - big * 0.8, big * 0.28, 0, 7); c.fill();
  }
  // ---- Weather overlays ----
  function weather(c, kind, t) {
    const a = art(), pic = a && a.weather && img(a.weather[kind]);
    if (pic) { const off = (t * 120) % VW; c.drawImage(pic, -off, 0, VW, VH); c.drawImage(pic, VW - off, 0, VW, VH); return; }
    if (kind === 'rain' || kind === 'storm') {
      c.strokeStyle = 'rgba(200,220,255,.45)'; c.lineWidth = 1;
      c.beginPath(); for (let i = 0; i < 90; i++) { const x = (i * 53 + t * 300) % (VW + 40) - 20, y = (i * 97 + t * 700) % VH; c.moveTo(x, y); c.lineTo(x - 4, y + 12); } c.stroke();
      if (kind === 'storm' && (Math.floor(t * 10) % 70) === 0) { c.fillStyle = 'rgba(255,255,255,.5)'; c.fillRect(0, 0, VW, VH); }
    }
    if (kind === 'fog') { c.fillStyle = 'rgba(200,205,215,.45)'; c.fillRect(0, 0, VW, VH); }
    if (kind === 'mist') { const g = c.createLinearGradient(0, G - 90, 0, VH); g.addColorStop(0, 'rgba(230,235,240,0)'); g.addColorStop(1, 'rgba(230,235,240,.7)'); c.fillStyle = g; c.fillRect(0, G - 90, VW, VH); }
    if (kind === 'wind') { c.fillStyle = 'rgba(120,150,60,.8)'; for (let i = 0; i < 14; i++) { const x = (i * 131 + t * 260) % (VW + 20), y = 80 + (i * 37) % 200 + 10 * Math.sin(t * 3 + i); c.fillRect(x, y, 5, 3); } }
  }
  V.STORM_FLASH = s => (Math.floor(s * 10) % 70) === 0;

  // ---- The town as one stacked hillside (Ladi, Nov 18: walk a path between levels and see the road above) ----
  // Town pixels: x is the same as each level's x; each level's road sits at levelY. WATCH_ART.town (art thread)
  // brings the painted picture and the ramp paths; until then the same numbers with straight ramps.
  const TOWN_Y = { 'west-road': 300, 'hill-road': 580, 'main-street': 860, 'far-lane': 1140 };
  const townArt = () => (art() && art().town) || null;
  V.town = function () {
    const a = townArt() || {}, levelY = a.levelY || TOWN_Y;
    return { width: a.width || 4100, height: a.height || 1200, levelY, layers: a.layers || null, buildings: a.buildings || null, buildingsSoft: a.buildingsSoft || null, ramps: a.ramps || [], chute: a.chute || null, roofs: a.roofs || 0 };
  };
  // The path walked for a move between levels: a painted ramp if there is one (either direction), else a straight line.
  V.rampPath = function (fromScene, fromX, to) {
    const T = V.town(), Y = T.levelY;
    if (!(fromScene in Y) || !(to.scene in Y)) return null;
    const near = (a, b) => Math.abs(a - b) < 12;
    for (const r of T.ramps) {
      if (r.from[0] === fromScene && near(r.from[1], fromX) && r.to[0] === to.scene && near(r.to[1], to.x)) return r.path;
      if (r.to[0] === fromScene && near(r.to[1], fromX) && r.from[0] === to.scene && near(r.from[1], to.x)) return r.path.slice().reverse();
    }
    if (T.chute && fromScene === 'west-road' && to.scene === 'far-lane' && near(fromX, 1440)) return T.chute;
    return [[fromX, Y[fromScene]], [to.x, Y[to.scene]]];
  };
  const pathLen = p => p.reduce((n, q, i) => (i ? n + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
  const pathAt = (p, d) => {
    for (let i = 1; i < p.length; i++) {
      const l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= l || i === p.length - 1) { const f = l ? Math.min(1, d / l) : 1; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f]; }
      d -= l;
    }
    return p[p.length - 1];
  };

  // ---- Mount: canvas + touch controls + the loop ----
  // o: { st (from WW.create), people: { sceneId: [{ who, x }] }, marks: [{ scene, x, text }], weather, onUse(spot), onMove(move), hint }
  V.mount = function (host, o) {
    host.innerHTML = `<div class="wv"><canvas class="wv-c" width="${VW}" height="${VH}" aria-label="The town, side view"></canvas>
      <p class="wv-where" aria-live="polite"></p>
      <div class="wv-pad" role="group" aria-label="Controls">
        <button data-k="left" aria-label="Walk left">◀</button><button data-k="up" aria-label="Go up">▲</button>
        <button data-k="use" aria-label="Use">●</button><button data-k="down" aria-label="Go down">▼</button><button data-k="right" aria-label="Walk right">▶</button>
      </div></div>`;
    const cv = host.querySelector('.wv-c'), c = cv.getContext('2d'), where = host.querySelector('.wv-where');
    const input = { left: 0, right: 0 };
    let raf = 0, last = 0, t = 0, animals = null, animalsFor = '', running = true, ramp = null, camX = null, camY = null;
    const st = o.st;
    const press = k => {
      if (k === 'use') {
        const lift = WW.moves(st).filter(m => m.key.startsWith('floor:'));
        if (lift.length && o.onLift) return o.onLift(lift);
        const m = WW.moves(st).find(v => v.key === 'use');
        if (m && o.onMove && o.onMove(m) === false) return;
        if (m) { WW.go(st, 'use'); return; }
        if (o.onUse) o.onUse(WW.near(st));
        return;
      }
      if (k === 'up' || k === 'down') {
        const m = WW.moves(st).find(v => v.key === k);
        if (!m || ramp || (o.onMove && o.onMove(m) === false)) return;
        const from = WW.near(st), path = (from && (from.kind === 'fork' || from.id === 'lookout-ruin')) ? V.rampPath(st.scene, from.x, m.to) : null;
        if (path && stacked() && !reduced()) { ramp = { path, d: 0, len: pathLen(path), key: k }; return; }   // walk the path, then arrive
        WW.go(st, k);
      }
    };
    const KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', e: 'use', E: 'use', Enter: 'use', ' ': 'use' };
    // While a dialog is open (o.paused), its own keys apply and walking waits.
    const kd = e => { const k = KEYS[e.key]; if (!k || !running || (o.paused && o.paused())) return; e.preventDefault(); if (k === 'left' || k === 'right') input[k] = 1; else if (!e.repeat) press(k); };
    const ku = e => { const k = KEYS[e.key]; if (k === 'left' || k === 'right') input[k] = 0; };
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    host.querySelectorAll('.wv-pad button').forEach(b => {
      const k = b.dataset.k;
      if (k === 'left' || k === 'right') {
        b.addEventListener('pointerdown', e => { e.preventDefault(); input[k] = 1; });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, () => { input[k] = 0; }));
      } else b.addEventListener('click', () => press(k));
    });
    let dt0 = 0;
    // o.follow: someone who walks a step behind Seo-yeon (Mira on day 1, fussing). She trails her along ramps too.
    let fol = null;
    function follower() {
      if (!o.follow) return (fol = null);
      if (!fol || fol.who !== o.follow) fol = { who: o.follow, scene: st.scene, x: st.x - 60, d: 0, moving: false, facing: 1 };
      if (ramp) {   // on a ramp she faces the way the path runs at her spot, not the way she last walked
        fol.ramp = Math.max(0, ramp.d - 55); fol.moving = true; fol.d += WW.SPEED * dt0 * 0.8;
        const a = pathAt(ramp.path, Math.max(0, fol.ramp - 2)), b = pathAt(ramp.path, fol.ramp + 2); if (b[0] !== a[0]) fol.facing = Math.sign(b[0] - a[0]);
        return fol;
      }
      fol.ramp = null;
      if (fol.scene !== st.scene) { fol.scene = st.scene; fol.x = st.x - st.facing * 58; }
      const dx = st.x - st.facing * 58 - fol.x;
      if (Math.abs(dx) > 10) { const m = Math.sign(dx) * Math.min(Math.abs(dx) - 10, WW.SPEED * 1.1 * dt0); fol.x += m; fol.d += Math.abs(m); fol.moving = true; fol.facing = Math.sign(dx); }
      else { fol.moving = false; fol.facing = st.x >= fol.x ? 1 : -1; }
      return fol;
    }
    function draw() {
      if (stacked()) return drawTown();
      camX = camY = null;
      const sc = WW.scene(st.scene), phase = st.phase;
      const layers = layerImgs(sc);
      // With painted art, the camera stops at the ends of the main (speed 1) layer, so you never see past a wall.
      const main = layers && layers.find(l => l.speed === 1), mi = main && img(main.img), artW = mi && mi.naturalWidth * (VH / mi.naturalHeight);
      const cam = artW ? Math.max(0, Math.min(artW - VW, st.x - VW / 2)) : Math.max(sc.from - 80, Math.min(sc.to + 80 - VW, st.x - VW / 2));
      const X = x => x - cam;
      if (animalsFor !== st.scene + phase) { animals = WW.spawn(st.scene, phase, o.weather, hash(st.scene)); animalsFor = st.scene + phase; }
      sky(c, phase, sc.kind, !!layers);
      if (layers) layers.forEach(l => { const p = img(l.img); if (p) { const off = -cam * l.speed; c.drawImage(p, off, 0, p.naturalWidth * (VH / p.naturalHeight), VH); } });
      else { farLayer(c, sc, cam); backLayer(c, sc, cam); ground(c, sc); }
      if (sc.kind === 'castle') sc.spots.filter(s => s.kind === 'room').forEach(s => { label(c, s.label, X(s.x), 40); });
      if (!layers) sc.spots.forEach(s => { const sx = X(s.x); if (sx > -120 && sx < VW + 120) building(c, s, sx, sc); });   // painted layers hold the buildings
      if (layers && sc.kind === 'castle') {   // the hoist in its shaft: the platform, behind a gate until the Captain's quest
        const h = sc.spots.find(v => v.kind === 'lift'), P = art().props || {};
        if (h) { const pl = img(P['hoist-platform']), gt = img(P['hoist-door']), hx = X(h.x);
          if (pl) c.drawImage(pl, hx - pl.naturalWidth / 2, G - pl.naturalHeight, pl.naturalWidth, pl.naturalHeight);
          if (gt && h.needs && !st.unlocks[h.needs]) c.drawImage(gt, hx - gt.naturalWidth / 2, G - gt.naturalHeight, gt.naturalWidth, gt.naturalHeight); }
      }
      (o.people && o.people[st.scene] || []).forEach(p => {
        if (p.walk && !reduced()) {   // background walkers stroll and turn at the ends of the level
          p.facing = p.facing || 1; p.x += p.facing * 120 * dt0;
          if (p.x > sc.to - 40) p.facing = -1; if (p.x < sc.from + 40) p.facing = 1;
        } const sx = X(p.x); if (sx > -40 && sx < VW + 40) person(c, p.who, sx, p.facing || (p.x < st.x ? 1 : -1), !!p.walk, p.walk ? Math.abs(p.x) : t + p.x / 97); });
      animals.forEach(a => animal(c, a, X(a.x), t));
      (o.marks || []).filter(m => m.scene === st.scene).forEach(m => {
        const sx = X(m.x), sp = m.sparkle && art() && art().props && img(art().props.sparkle);
        if (sp) { const f = Math.floor(t * 8) % 4; c.drawImage(sp, f * 16, 0, 16, 16, sx - 16, G - 34, 32, 32); if (m.text) label(c, m.text, sx, G - 50); return; }
        c.fillStyle = m.color || '#e9c56d'; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
        c.beginPath(); c.arc(sx, G - 90, 8, 0, 7); c.fill(); c.globalAlpha = 1; if (m.text) label(c, m.text, sx, G - 108);
      });
      const f = follower(); if (f) person(c, f.who, X(f.x), f.facing, f.moving, f.moving ? f.d : t);
      person(c, 'seoyeon', X(st.x), st.facing, st.moving, st.moving ? st.walk * WW.SPEED : t, phase === 'night' || phase === 'dusk');
      if (!layers) frontLayer(c, sc, cam);
      const tn = tint(phase); if (tn) { c.fillStyle = tn; c.fillRect(0, 0, VW, VH); }   // day art, tinted for dusk, night and dawn
      if (phase === 'night' || phase === 'dusk') {   // Seo-yeon's lantern lights the ground around her, over the tint
        const gx = X(st.x), g = c.createRadialGradient(gx, G - 50, 10, gx, G - 50, 130);
        g.addColorStop(0, 'rgba(255,214,140,.32)'); g.addColorStop(1, 'rgba(255,214,140,0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(gx - 130, G - 180, 260, 260); c.restore();
      }
      if (o.weather && o.weather !== 'clear') weather(c, o.weather, t);
      const s = WW.near(st);
      if (s) {
        const ms = WW.moves(st);
        const hint = ms.length ? ms.map(m => (m.key === 'up' ? '▲ ' : m.key === 'down' ? '▼ ' : '● ') + m.label).filter((v, i, a) => a.indexOf(v) === i).join('   ') : s.label + (s.needs && !st.unlocks[s.needs] ? ' (locked)' : '');
        label(c, hint, X(s.x), G - 160, true);
      }
      const txt = `${sc.name}${o.hint ? ' · ' + o.hint : ''}`;
      if (where.textContent !== txt) where.textContent = txt;
    }
    // The stacked town needs the whole-town picture (or no art at all); with only per-level art, levels stay separate.
    const stacked = () => WW.scene(st.scene).kind === 'town' && (V.forceStacked || !!townArt() || !layerImgs(WW.scene(st.scene)));   // forceStacked: preview it with placeholders
    function drawTown() {
      // V.TOWN_ZOOM < 1 draws the town smaller, so the road above and the sky over it fit the view (Ladi, Nov 18).
      const Z = V.TOWN_ZOOM || 1, vw = VW / Z, vh = VH / Z;
      const T = V.town(), Y = T.levelY, phase = st.phase, sc = WW.scene(st.scene);
      const pos = ramp ? pathAt(ramp.path, ramp.d) : [st.x, Y[st.scene]];
      const tx = Math.max(0, Math.min(T.width - vw, pos[0] - vw / 2)), ty = Math.max(0, Math.min(T.height + 60 - vh, pos[1] - (vh - (VH - G))));
      if (camX == null) { camX = tx; camY = ty; }
      const k = Math.min(1, dt0 * 6); camX += (tx - camX) * k; camY += (ty - camY) * k;   // the camera eases after her
      if (animalsFor !== st.scene + phase) { animals = WW.spawn(st.scene, phase, o.weather, hash(st.scene)); animalsFor = st.scene + phase; }
      sky(c, phase, 'town', true);
      c.save(); c.scale(Z, Z);
      const SX = x => x - camX, SY = y => y - camY;
      const lvI = WW.LEVELS.indexOf(st.scene);
      const levels = WW.LEVELS.filter((l, i) => i >= lvI - (ramp && ramp.key === 'up' ? 2 : 1) && SY(Y[l]) > -60 && SY(Y[l]) - 260 < vh);
      // Only your road and the one above it are drawn; higher terraces drop away so the backdrop and sky show
      // (Ladi, Nov 18). `top` is where the level above's rooftops end.
      const li = WW.LEVELS.indexOf(st.scene), above = WW.LEVELS[Math.max(0, li - (ramp && ramp.key === 'up' ? 2 : 1))];   // mid-climb, keep the next road's own neighbour in view
      const above2 = WW.LEVELS[WW.LEVELS.indexOf(above) - 1];   // the road two up is cut away, even where roofs would reach it
      // With buildings on their own layers, the hillside stops at the road above's surface: one bank of earth, the
      // one you'd climb, and above it only that road's buildings against the backdrop (Ladi, Nov 18).
      const top = T.buildings ? SY(Y[above]) - 14 : Math.max(SY(Y[above]) - (T.roofs || 240), above2 && above !== st.scene ? SY(Y[above2]) + 40 : -1e9);
      if (T.layers) T.layers.forEach(l => { const p = img(l.img); if (!p) return;
        if (l.speed === 1) { c.save(); c.beginPath(); c.rect(0, top, vw, vh - top); c.clip(); c.drawImage(p, -camX, -camY); c.restore(); }
        else c.drawImage(p, -camX * l.speed, -camY * l.speed); });
      if (T.buildings) {   // each road's buildings, top road first: yours and the one above solid, roads below you
        // see-through and soft so they read as distant (Ladi, Nov 18); two or more roads up aren't drawn at all.
        const ai = WW.LEVELS.indexOf(above);
        WW.LEVELS.forEach((l, i) => {
          if (i < ai) return;
          const p = img((i > li && T.buildingsSoft && T.buildingsSoft[l]) || T.buildings[l]); if (!p) return;
          if (i === ai && above !== st.scene) { c.save(); c.beginPath(); c.rect(0, top, vw, vh - top); c.clip(); c.drawImage(p, -camX, -camY); c.restore(); }
          else c.drawImage(p, -camX, -camY);
        });
      }
      if (!T.layers) {
        farLayer(c, { kind: 'town', id: 'west-road' }, camX);
        WW.LEVELS.forEach(l => {   // each road and the hillside face below it, down to the next road
          const y = SY(Y[l]); if (y > vh || y + 300 < 0) return;
          c.fillStyle = '#8c7a5c'; c.fillRect(0, y, vw, 300);
          c.fillStyle = '#9b8a6a'; c.fillRect(0, y, vw, 16); c.fillStyle = 'rgba(0,0,0,.18)'; c.fillRect(0, y, vw, 3);
          if (l === 'far-lane') { c.fillStyle = '#4f7da0'; c.fillRect(0, y + 30, vw, 300); }
        });
        c.strokeStyle = '#a8966f'; c.lineWidth = 14; c.lineCap = 'round';   // ramps between the roads
        WW.LEVELS.forEach(l => WW.TOWN[l].spots.forEach(s => {
          if (s.kind !== 'fork' && s.id !== 'lookout-ruin') return;
          const p = V.rampPath(l, s.x, s.to); if (!p) return;
          c.globalAlpha = s.needs && !st.unlocks[s.needs] ? 0.35 : 1;
          c.beginPath(); p.forEach((q, i) => (i ? c.lineTo(SX(q[0]), SY(q[1])) : c.moveTo(SX(q[0]), SY(q[1])))); c.stroke(); c.globalAlpha = 1;
        }));
        levels.forEach(l => {
          c.save(); c.translate(0, SY(Y[l]) - G);
          WW.scene(l).spots.forEach(s => { const sx = SX(s.x); if (sx > -120 && sx < vw + 120 && s.kind !== 'fork') building(c, s, sx, WW.scene(l)); });
          c.restore();
        });
      }
      levels.forEach(l => {   // people and markers on every road in view, so the road above is alive too
        const lsc = WW.scene(l);
        c.save(); c.translate(0, SY(Y[l]) - G);
        (o.people && o.people[l] || []).forEach(p => {
          if (p.walk && !reduced()) { p.facing = p.facing || 1; p.x += p.facing * 120 * dt0; if (p.x > lsc.to - 40) p.facing = -1; if (p.x < lsc.from + 40) p.facing = 1; }
          const sx = SX(p.x); if (sx > -40 && sx < vw + 40) person(c, p.who, sx, p.facing || (p.x < st.x ? 1 : -1), !!p.walk, p.walk ? Math.abs(p.x) : t + p.x / 97);
        });
        if (l === st.scene && !ramp) animals.forEach(a => animal(c, a, SX(a.x), t));
        (o.marks || []).filter(m => m.scene === l).forEach(m => {
          const sx = SX(m.x), sp = m.sparkle && art() && art().props && img(art().props.sparkle);
          if (sp) { const f = Math.floor(t * 8) % 4; c.drawImage(sp, f * 16, 0, 16, 16, sx - 16, G - 34, 32, 32); if (m.text) label(c, m.text, sx, G - 50); return; }
          c.fillStyle = m.color || '#e9c56d'; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
          c.beginPath(); c.arc(sx, G - 90, 8, 0, 7); c.fill(); c.globalAlpha = 1; if (m.text) label(c, m.text, sx, G - 108);
        });
        c.restore();
      });
      const px = SX(pos[0]), py = SY(pos[1]), f = follower();
      if (f) {
        const fp = f.ramp != null ? pathAt(ramp.path, f.ramp) : [f.x, Y[f.scene]];
        c.save(); c.translate(0, SY(fp[1]) - G); person(c, f.who, SX(fp[0]), f.facing, f.moving, f.moving ? f.d : t); c.restore();
      }
      c.save(); c.translate(0, py - G); person(c, 'seoyeon', px, st.facing, st.moving, st.moving ? st.walk * WW.SPEED : t, phase === 'night' || phase === 'dusk'); c.restore();
      if (!T.layers) frontLayer(c, sc, camX);
      const tn = tint(phase); if (tn) { c.fillStyle = tn; c.fillRect(0, 0, vw, vh); }
      const hintAt = s0 => [SX(s0.x) * Z, (py - 160) * Z];
      if (phase === 'night' || phase === 'dusk') {
        const g = c.createRadialGradient(px, py - 50, 10, px, py - 50, 130);
        g.addColorStop(0, 'rgba(255,214,140,.32)'); g.addColorStop(1, 'rgba(255,214,140,0)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = g; c.fillRect(px - 130, py - 180, 260, 260); c.restore();
      }
      c.restore();
      if (o.weather && o.weather !== 'clear') weather(c, o.weather, t);
      const s = !ramp && WW.near(st);
      if (s) {
        const ms = WW.moves(st);
        const hint = ms.length ? ms.map(m => (m.key === 'up' ? '▲ ' : m.key === 'down' ? '▼ ' : '● ') + m.label).filter((v, i, a) => a.indexOf(v) === i).join('   ') : s.label + (s.needs && !st.unlocks[s.needs] ? ' (locked)' : '');
        const [hx, hy] = hintAt(s); label(c, hint, hx, hy, true);
      }
      const txt = `${sc.name}${o.hint ? ' · ' + o.hint : ''}`;
      if (where.textContent !== txt) where.textContent = txt;
    }
    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; t += dt;
      if (ramp) {   // walking a ramp between levels: input waits until she arrives
        ramp.d += WW.SPEED * dt * (ramp.key === 'down' && ramp.path === V.town().chute ? 2.2 : 0.8);
        const p0 = pathAt(ramp.path, ramp.d - 1), p1 = pathAt(ramp.path, ramp.d);
        if (p1[0] !== p0[0]) st.facing = p1[0] > p0[0] ? 1 : -1;
        st.moving = true; st.walk += dt;
        if (ramp.d >= ramp.len) { const k = ramp.key; ramp = null; WW.go(st, k); }
      } else WW.step(st, dt, input);
      dt0 = dt;
      if (animals && !reduced()) WW.animals(animals, dt, st.x);
      draw();
      if (o.onTick) o.onTick(st, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return {
      st, press, draw,
      get follower() { return fol; },
      get ramp() { return ramp; },
      stop() { running = false; cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); },
      set(k, v) { o[k] = v; if (k === 'weather') animalsFor = ''; }
    };
  };

  const css = document.createElement('style');
  css.textContent = `
    .wv { display: grid; gap: 6px; }
    .wv-c { width: 100%; height: auto; aspect-ratio: ${VW} / ${VH}; border-radius: 10px; background: #0c1430; image-rendering: auto; touch-action: none; }
    .wv-where { margin: 0; font-size: 13px; font-weight: 600; color: #3b4470; text-align: center; }
    .wv-pad { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
    .wv-pad button { min-height: 48px; border-radius: 10px; border: 1px solid rgba(185,196,255,.4); background: rgba(20,28,70,.7); color: #fff; font-size: 20px; touch-action: none; user-select: none; }
    .wv-pad button:active { background: rgba(233,197,109,.3); }
  `;
  document.head.appendChild(css);
})();
