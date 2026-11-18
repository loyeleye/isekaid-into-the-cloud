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
  // ---- People: art sprite if there is one, else a side-view figure 64 tall, feet on the ground ----
  function person(c, who, sx, facing, moving, t, lit) {
    const a = art(), p = a && a.people && a.people[who], sheet = p && img(p.sheet);
    if (!sheet) { c.fillStyle = 'rgba(0,0,0,.25)'; c.beginPath(); c.ellipse(sx, G + 2, 16, 4, 0, 0, 7); c.fill(); }   // art has its shadow baked in
    if (sheet) {
      const A = p.anims || {}, anim = (lit && (moving ? A.lanternWalk || A.lantern : A.lantern)) || (moving ? A.walk : A.idle) || [0];   // lit: Seo-yeon's lantern at night
      const f = anim[Math.floor(t * (p.fps || 8)) % anim.length];
      const cols = Math.max(1, Math.floor(sheet.naturalWidth / p.w));
      c.save(); c.translate(sx, G); c.scale(facing, 1);
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
      const anim = (sk.anims && (sk.anims[a.state] || sk.anims.idle)) || [0], f = anim[Math.floor(t * (sk.fps || 8)) % anim.length];
      const cols = Math.max(1, Math.floor(sheet.naturalWidth / sk.w));
      c.save(); c.translate(sx, y); c.scale(a.facing, 1);
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
    let raf = 0, last = 0, t = 0, animals = null, animalsFor = '', running = true;
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
        if (m && (!o.onMove || o.onMove(m) !== false)) WW.go(st, k);
      }
    };
    const KEYS = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ArrowUp: 'up', w: 'up', W: 'up', ArrowDown: 'down', s: 'down', S: 'down', e: 'use', E: 'use', Enter: 'use', ' ': 'use' };
    const kd = e => { const k = KEYS[e.key]; if (!k || !running) return; e.preventDefault(); if (k === 'left' || k === 'right') input[k] = 1; else if (!e.repeat) press(k); };
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
    function draw() {
      const sc = WW.scene(st.scene), phase = st.phase;
      const cam = Math.max(sc.from - 80, Math.min(sc.to + 80 - VW, st.x - VW / 2));
      const X = x => x - cam;
      if (animalsFor !== st.scene + phase) { animals = WW.spawn(st.scene, phase, o.weather, hash(st.scene)); animalsFor = st.scene + phase; }
      const layers = layerImgs(sc);
      sky(c, phase, sc.kind, !!layers);
      if (layers) layers.forEach(l => { const p = img(l.img); if (p) { const off = -cam * l.speed; c.drawImage(p, off, 0, p.naturalWidth * (VH / p.naturalHeight), VH); } });
      else { farLayer(c, sc, cam); backLayer(c, sc, cam); ground(c, sc); }
      if (sc.kind === 'castle') sc.spots.filter(s => s.kind === 'room').forEach(s => { label(c, s.label, X(s.x), 40); });
      if (!layers) sc.spots.forEach(s => { const sx = X(s.x); if (sx > -120 && sx < VW + 120) building(c, s, sx, sc); });   // painted layers hold the buildings
      (o.people && o.people[st.scene] || []).forEach(p => {
        if (p.walk && !reduced()) {   // background walkers stroll and turn at the ends of the level
          p.facing = p.facing || 1; p.x += p.facing * 40 * dt0;
          if (p.x > sc.to - 40) p.facing = -1; if (p.x < sc.from + 40) p.facing = 1;
        } const sx = X(p.x); if (sx > -40 && sx < VW + 40) person(c, p.who, sx, p.facing || (p.x < st.x ? 1 : -1), !!p.walk, t + p.x); });
      animals.forEach(a => animal(c, a, X(a.x), t));
      (o.marks || []).filter(m => m.scene === st.scene).forEach(m => {
        const sx = X(m.x), sp = m.sparkle && art() && art().props && img(art().props.sparkle);
        if (sp) { const f = Math.floor(t * 8) % 4; c.drawImage(sp, f * 16, 0, 16, 16, sx - 16, G - 34, 32, 32); if (m.text) label(c, m.text, sx, G - 50); return; }
        c.fillStyle = m.color || '#e9c56d'; c.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4);
        c.beginPath(); c.arc(sx, G - 90, 8, 0, 7); c.fill(); c.globalAlpha = 1; if (m.text) label(c, m.text, sx, G - 108);
      });
      person(c, 'seoyeon', X(st.x), st.facing, st.moving, st.walk, phase === 'night' || phase === 'dusk');
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
    function loop(now) {
      if (!running) return;
      const dt = Math.min(0.05, last ? (now - last) / 1000 : 0); last = now; t += dt;
      WW.step(st, dt, input); dt0 = dt;
      if (animals && !reduced()) WW.animals(animals, dt, st.x);
      draw();
      if (o.onTick) o.onTick(st, dt);
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return {
      st, press, draw,
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
