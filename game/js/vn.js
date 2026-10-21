// Visual-novel cutscenes: painted backgrounds and full-screen stills (CGs) the camera slowly pans across, waist-up
// character sprites whose faces change line by line, rain and lightning in front, a text box with a name plate, and
// the moments you play: an action that fails, a prayer sent as a request that times out, and a face glitching into
// someone else's. A chapter registers its art with SD.vn.art and plays a script with SD.vn.play(steps).
//
// A step is [command, ...args] or a line [speaker, text, face]:
//   ['bg', id]  ['cg', id, pan]  ['show', who, face, pos]  ['hide', who]  ['fx', kind]  ['wait', ms]
//   ['act', kind, opts]  ['pray', text, to]  ['glitch', from, to, face]  ['gcut', id] (a still glitching into the next)
// pan is 'in' (default), 'slow', 'still', 'left', 'right' or 'up', with '+' to carry on the last still's move;
// pos is 'left', 'right' or 'center'; fx is 'shake', 'flash',
// 'thunder', 'black', 'rain', 'dry' or 'heartbeat'. Art that hasn't been painted yet shows a placeholder.
(function () {
  const V = SD.vn = {};
  const $ = s => document.querySelector(s);
  const esc = s => SD.ui.esc(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sfx = (n, p) => { if (SD.audio) SD.audio.sfx(n, p); };
  const CMD = new Set(['bg', 'cg', 'show', 'hide', 'fx', 'wait', 'act', 'pray', 'glitch', 'gcut']);

  // ---------- Art registry ----------
  // scenes: id -> { src (once painted), label, tint: [top, bottom] } for backgrounds and stills.
  // sprites: who -> { faces: { face: src }, stand: placeholder image, pixel: true if the stand-in is pixel art,
  //   tint } and who's name plate comes from SD.cast.
  V.art = { scenes: {}, sprites: {} };
  V.addScenes = o => Object.assign(V.art.scenes, o);
  V.addSprites = o => Object.assign(V.art.sprites, o);

  function sceneHTML(id) {
    const s = V.art.scenes[id] || { label: id };
    if (s.src) return `<img src="${s.src}" alt="">`;
    const [a, b] = s.tint || ['#1b1d2b', '#05060a'];
    return `<div class="vn-ph" style="background:radial-gradient(ellipse at 50% 35%, ${a}, ${b} 75%)"><span>${esc(id.toUpperCase())} · ${esc(s.label || '')}<br><i>painted art coming</i></span></div>`;
  }
  function spriteHTML(who, face) {
    const s = V.art.sprites[who] || {};
    const src = s.faces && (s.faces[face] || s.faces[Object.keys(s.faces)[0]]);
    if (src) return `<img src="${src}" alt="">`;
    if (s.stand) return `<img class="${s.pixel ? 'px' : ''}" src="${s.stand}" alt="">`;
    const c = SD.cast[who];
    return `<div class="vn-sil" style="--t:${(s.tint || '#3a3f55')}"><span>${esc(c ? c.name : who)}</span></div>`;
  }
  const hasSprite = who => !!(V.art.sprites[who]);

  // ---------- The stage ----------
  let root, cam, castEl, actEl, box, nameEl, textEl, rainCv, rainOn = false, rainRaf = 0;
  let skipping = false, advance = null, typing = null, full = '';
  const sprites = {};  // who -> { el, face, pos }
  // On a phone (see #vn .vn-spr.lead in index.html) only one sprite shows: the one speaking, or while nobody with a
  // sprite speaks, whoever spoke or came on last. Desktop shows everyone and dims all but the speaker.
  let lead = null;
  function setLead(who) {
    if (who && !sprites[who]) who = null;
    if (!who) { const up = Object.keys(sprites); who = sprites[lead] ? lead : up[up.length - 1] || null; }
    lead = who;
    Object.keys(sprites).forEach(w => sprites[w].el.classList.toggle('lead', w === who));
  }
  function build() {
    if (root) return;
    root = document.createElement('div');
    root.id = 'vn'; root.hidden = true;
    root.innerHTML = `<div class="vn-cam"><div class="vn-layer vn-bg"></div><div class="vn-layer vn-cg"></div></div>
      <canvas class="vn-rain"></canvas><div class="vn-cast"></div><div class="vn-flash"></div><div class="vn-act"></div>
      <div class="vn-box" hidden><div class="vn-name"></div><div class="vn-text" aria-live="polite"></div>
        <div class="vn-foot"><span class="vn-more">▼</span><button class="vn-skip">Skip</button></div></div>
      <div class="vn-black"></div>`;
    document.body.appendChild(root);
    cam = root.querySelector('.vn-cam'); castEl = root.querySelector('.vn-cast'); actEl = root.querySelector('.vn-act');
    box = root.querySelector('.vn-box'); nameEl = root.querySelector('.vn-name'); textEl = root.querySelector('.vn-text');
    rainCv = root.querySelector('.vn-rain');
    box.addEventListener('click', tap);
    root.querySelector('.vn-skip').addEventListener('click', e => { e.stopPropagation(); skipping = true; finishTyping(); if (advance) advance(); });
    window.addEventListener('keydown', e => {
      if (root.hidden || box.hidden || actEl.childElementCount) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tap(); }
    });
  }
  function tap() {
    if (typing) { finishTyping(); return; }
    if (advance) { const a = advance; advance = null; root.classList.remove('vn-ready'); a(); }
  }
  function finishTyping() { if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; root.classList.add('vn-ready'); } }

  // Backgrounds and stills crossfade; a still pans slowly (Ken Burns) and hides the sprites.
  // A pan ending in '+' carries on from where the last still's pan had got to, so a cut between two stills of the
  // same framing (a face change) doesn't jump back to the start of the move.
  function setLayer(sel, id, pan, cut) {
    const host = cam.querySelector(sel);
    root.dataset[sel === '.vn-bg' ? 'bg' : 'cg'] = id;
    const old = [...host.children];
    const el = document.createElement('div');
    const cont = pan && pan.endsWith('+'), last = old[old.length - 1];
    if (cont) pan = pan.slice(0, -1);
    el.dataset.t0 = cont && last && last.dataset.t0 ? last.dataset.t0 : performance.now();
    el.style.setProperty('--kbd', (el.dataset.t0 - performance.now()) + 'ms');
    el.className = 'vn-pic' + (pan && !reduce() ? ' kb kb-' + pan : '') + (cut ? ' on cut' : '') + ((V.art.scenes[id] || {}).dream ? ' dream' : '');
    el.innerHTML = sceneHTML(id);
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add('on'));
    old.forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), cut ? 0 : 900); });
  }
  function clearCG() { [...cam.querySelector('.vn-cg').children].forEach(o => { o.classList.remove('on'); setTimeout(() => o.remove(), 900); }); root.classList.remove('vn-incg'); }

  function show(who, face, pos) {
    let s = sprites[who];
    const fresh = !s;
    if (!s) {
      const el = document.createElement('div');
      el.className = 'vn-spr'; el.dataset.who = who;
      castEl.appendChild(el);
      s = sprites[who] = { el, face: null, pos: null };
      requestAnimationFrame(() => el.classList.add('on'));
    }
    pos = pos || s.pos || (Object.keys(sprites).length > 1 ? 'right' : 'center');
    if (s.pos !== pos) { s.el.dataset.pos = pos; s.pos = pos; }
    face = face || s.face || 'neutral';
    if (s.face !== face) {
      s.face = face;
      s.el.innerHTML = spriteHTML(who, face);
      s.el.classList.remove('bump'); void s.el.offsetWidth; s.el.classList.add('bump');
    }
    // With two people up, the one who isn't speaking steps back to the side: the side the newcomer isn't on.
    const up = Object.keys(sprites), mine = s.pos;
    if (up.length > 1) up.forEach(w => { if (sprites[w].pos === 'center') { sprites[w].pos = w === who ? 'right' : mine === 'left' ? 'right' : 'left'; sprites[w].el.dataset.pos = sprites[w].pos; } });
    // Someone who has just come on is the one a phone shows, until somebody speaks.
    if (fresh) setLead(who);
  }
  function hide(who) {
    const s = sprites[who]; if (!s) return;
    delete sprites[who];
    s.el.classList.remove('on'); setTimeout(() => s.el.remove(), 600);
    const up = Object.keys(sprites);
    if (up.length === 1) { sprites[up[0]].pos = 'center'; sprites[up[0]].el.dataset.pos = 'center'; }
    if (lead === who) { lead = null; setLead(null); }
  }
  function focus(who) { Object.keys(sprites).forEach(w => sprites[w].el.classList.toggle('dim', w !== who)); if (sprites[who]) setLead(who); }

  // ---------- Rain ----------
  function rain(on) {
    rainOn = on;
    rainCv.classList.toggle('on', on);
    if (SD.audio) SD.audio.weather(on ? 'rain' : null);
    if (!on || rainRaf || reduce()) return;
    const ctx = rainCv.getContext('2d');
    const drops = Array.from({ length: 140 }, () => ({ x: Math.random(), y: Math.random(), v: 0.6 + Math.random() * 0.8, l: 0.02 + Math.random() * 0.03 }));
    let lastT = performance.now();
    const step = t => {
      const dt = Math.min(0.05, (t - lastT) / 1000); lastT = t;
      if (!rainOn || root.hidden) { ctx.clearRect(0, 0, rainCv.width, rainCv.height); rainRaf = 0; return; }
      const w = rainCv.width = rainCv.clientWidth, h = rainCv.height = rainCv.clientHeight;
      ctx.strokeStyle = 'rgba(190,205,230,.35)'; ctx.lineWidth = 1;
      ctx.beginPath();
      drops.forEach(d => {
        d.y += d.v * dt * 1.6; d.x -= d.v * dt * 0.25;
        if (d.y > 1) { d.y = -d.l; d.x = Math.random() * 1.2; }
        ctx.moveTo(d.x * w, d.y * h); ctx.lineTo((d.x - d.l * 0.25) * w, (d.y + d.l) * h);
      });
      ctx.stroke();
      rainRaf = requestAnimationFrame(step);
    };
    rainRaf = requestAnimationFrame(step);
  }

  async function fx(kind) {
    const fl = root.querySelector('.vn-flash'), bl = root.querySelector('.vn-black');
    if (kind === 'rain' || kind === 'dry') return rain(kind === 'rain');
    if (kind === 'black') { bl.classList.add('on'); await sleep(skipping ? 0 : 1100); return; }
    if (kind === 'unblack') { bl.classList.remove('on'); return; }
    if (kind === 'heartbeat') { sfx('hit', 0); root.classList.remove('beat'); void root.offsetWidth; root.classList.add('beat'); return; }
    if (kind === 'flash' || kind === 'thunder') {
      fl.classList.remove('go'); void fl.offsetWidth; fl.classList.add('go');
      if (kind === 'thunder') sfx('thunder');
    }
    if (kind === 'shake' || kind === 'thunder') {
      if (reduce()) return;
      root.classList.remove('shake'); void root.offsetWidth; root.classList.add('shake');
    }
  }

  // ---------- Lines ----------
  // A line with a recording (js/vo.js, keyed 'who|text', or 'pray|text' for a prayer) plays it as the text types.
  const voice = key => !skipping && !!SD.vo && SD.audio.voice(SD.vo[key]);
  function line(who, text, face) {
    const c = SD.cast[who];
    box.hidden = false;
    box.dataset.who = who;
    if (who !== 'narr' && hasSprite(who) && !root.classList.contains('vn-incg')) show(who, face);
    focus(who);
    nameEl.hidden = who === 'narr';
    nameEl.textContent = who === 'narr' ? '' : who === 'you' ? SD.state.save.name : (c ? c.name : who);
    root.classList.remove('vn-ready');
    full = text.replace(/\{name\}/g, SD.state.save.name);
    textEl.textContent = '';
    const spoken = voice(who + '|' + text);
    return new Promise(res => {
      advance = res;
      if (skipping) { res(); return; }
      if (reduce()) { finishTyping(); return; }
      let i = 0, n = 0;
      typing = setInterval(() => {
        i += 1; textEl.textContent = full.slice(0, i);
        if (who !== 'narr' && !spoken && n++ % 3 === 0) sfx('text', SD.ui.voiceOf ? SD.ui.voiceOf(who) : 600);
        if (i >= full.length) finishTyping();
      }, who === 'narr' ? 32 : 26);
    });
  }

  // ---------- The moments you play ----------
  function panel(html, cls) {
    actEl.innerHTML = `<div class="vn-panel ${cls || ''}">${html}</div>`;
    actEl.firstChild.addEventListener('click', e => e.stopPropagation());
    box.hidden = true;
    return actEl.firstChild;
  }
  const closePanel = () => { actEl.innerHTML = ''; };
  // A button you can hold down or tap; work(dt) gets the seconds held (taps count as a quarter second).
  function holdable(btn, work) {
    let held = false, raf = 0, last = 0;
    const loop = t => { if (!held) return; work((t - last) / 1000); last = t; raf = requestAnimationFrame(loop); };
    const down = e => { e.preventDefault(); if (held) return; held = true; last = performance.now(); work(0.25); raf = requestAnimationFrame(loop); };
    const up = () => { held = false; cancelAnimationFrame(raf); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('click', e => { if (e.detail === 0) work(0.25); });  // keyboard and scripted clicks
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(k => btn.addEventListener(k, up));
    return up;
  }

  // A pulsing glow on the still at [x, y] (fractions of the painted image), riding the still's slow push-in.
  // It brightens with --heal (0 to 1), beats faster while .held, and gutters out with .out.
  function handGlow(at) {
    const pic = [...cam.querySelector('.vn-cg').children].pop();
    if (!pic) return null;
    const img = pic.querySelector('img'), g = document.createElement('div');
    g.className = 'vn-heal'; g.innerHTML = '<i></i>';
    const place = () => {
      // The still is object-fit: cover, so find where the image point lands in the box.
      const W = pic.clientWidth, H = pic.clientHeight, iw = img && img.naturalWidth || 16, ih = img && img.naturalHeight || 9;
      const k = Math.max(W / iw, H / ih), x = (W - iw * k) / 2 + at[0] * iw * k, y = (H - ih * k) / 2 + at[1] * ih * k;
      g.style.setProperty('--hx', x + 'px'); g.style.setProperty('--hy', y + 'px'); g.style.setProperty('--hr', (0.2 * iw * k) + 'px');
    };
    place(); addEventListener('resize', place);
    const remove = g.remove.bind(g);
    g.remove = () => { removeEventListener('resize', place); remove(); };
    pic.appendChild(g);
    return g;
  }

  const ACTS = {
    // Hold to heal: the bar crawls toward full and never gets there.
    async heal(o) {
      const p = panel(`<div class="vn-meter"><b>${esc(o.target)}</b><div class="bar hp"><i style="width:0"></i></div><small>HP 0</small></div>
        <div class="vn-meter"><b>Heal</b><div class="bar mend"><i></i></div></div>
        <button class="vn-hold">Hold to heal</button><p class="vn-note"></p>`, 'heal');
      const bar = p.querySelector('.mend i'), btn = p.querySelector('.vn-hold'), note = p.querySelector('.vn-note');
      const glow = o.glow && handGlow(o.glow);
      if (glow) {
        ['pointerdown', 'pointerup', 'pointerleave', 'pointercancel'].forEach(k =>
          btn.addEventListener(k, () => glow.classList.toggle('held', k === 'pointerdown')));
      }
      let v = 0, effort = 0;
      await new Promise(done => {
        const stop = holdable(btn, dt => {
          effort += dt; v += (0.97 - v) * Math.min(1, dt * 1.4);
          bar.style.width = (v * 100).toFixed(1) + '%';
          if (glow) glow.style.setProperty('--heal', v.toFixed(2));
          if (Math.random() < dt * 4) sfx('heal');
          if (effort > 3.2) { stop(); btn.disabled = true; done(); }
        });
        setTimeout(() => { stop(); done(); }, 14000);
      });
      bar.parentElement.classList.add('fail'); bar.style.width = '0%';
      if (glow) glow.classList.add('out');
      note.textContent = o.fail; sfx('wrong');
      await sleep(skipping ? 0 : 2200);
      if (glow) glow.remove();
      closePanel();
    },
    // Hold to break the barrier; the face inside flickers harder, then the only button left is "Let go".
    async barrier(o) {
      const p = panel(`<div class="vn-meter"><b>${esc(o.label)}</b><div class="bar crack"><i style="width:0"></i></div></div>
        <button class="vn-hold">Hold to break it</button><p class="vn-note"></p>`, 'barrier');
      const bar = p.querySelector('.crack i'), btn = p.querySelector('.vn-hold'), note = p.querySelector('.vn-note');
      let v = 0;
      await new Promise(done => {
        const stop = holdable(btn, dt => {
          v = Math.min(0.72, v + dt * 0.22);
          bar.style.width = (v * 100).toFixed(1) + '%';
          root.style.setProperty('--flick', v.toFixed(2)); root.classList.add('flicker');
          if (Math.random() < dt * 3) sfx('resist');
          if (v >= 0.72) { stop(); done(); }
        });
        setTimeout(() => { stop(); done(); }, 15000);
      });
      note.textContent = o.warn; sfx('wrong');
      btn.textContent = 'Let go'; btn.classList.add('letgo');
      const fresh = btn.cloneNode(true); btn.replaceWith(fresh);
      await new Promise(done => { fresh.addEventListener('click', done); setTimeout(done, 20000); });
      root.classList.remove('flicker');
      closePanel();
    },
    // One second to choose. Your hand won't move, and the timer runs out.
    async choice(o) {
      const p = panel(`<p class="vn-q">${esc(o.q)}</p><div class="bar timer"><i></i></div>
        <div class="vn-opts">${o.opts.map(t => `<button>${esc(t)}</button>`).join('')}</div><p class="vn-note"></p>`, 'choice');
      const note = p.querySelector('.vn-note');
      p.querySelectorAll('.vn-opts button').forEach(b => b.addEventListener('click', () => {
        b.classList.remove('freeze'); void b.offsetWidth; b.classList.add('freeze'); note.textContent = o.frozen; sfx('resist');
      }));
      await sleep(80);
      p.querySelector('.timer i').classList.add('run');
      sfx('alarm');
      await sleep(skipping ? 0 : 1000);
      p.querySelectorAll('.vn-opts button').forEach(b => { b.disabled = true; });
      p.classList.add('out');
      note.innerHTML = `<b class="vn-stamp">${esc(o.stamp)}</b>`;
      sfx('wrong');
      await sleep(skipping ? 0 : 2400);
      closePanel();
    },
    // Knock a pattern on the wall and listen.
    async tap(o) {
      const n = o.pattern.reduce((a, b) => a + b, 0);
      const groups = o.pattern.map((k, g) => `<span class="grp">${Array.from({ length: k }, (_, i) => `<i data-k="${o.pattern.slice(0, g).reduce((a, b) => a + b, 0) + i}"></i>`).join('')}</span>`).join('');
      const p = panel(`<p class="vn-q">${esc(o.q)}</p><div class="vn-knocks">${groups}</div><button class="vn-hold">Knock</button><p class="vn-note"></p>`, 'tap');
      const btn = p.querySelector('.vn-hold'), note = p.querySelector('.vn-note');
      let k = 0;
      await new Promise(done => {
        const knock = () => {
          if (k >= n) return;
          const d = p.querySelector(`[data-k="${k++}"]`); if (d) d.className = 'on';
          sfx('door'); fx('shake');
          if (k >= n) { btn.disabled = true; done(); }
        };
        btn.addEventListener('click', knock);
        // Nobody knocking? The hands do it anyway.
        const t0 = Date.now();
        const auto = setInterval(() => { if (k >= n) clearInterval(auto); else if (Date.now() - t0 > 15000) knock(); }, 450);
      });
      note.textContent = 'Listening…';
      await sleep(skipping ? 0 : 3200);
      note.textContent = o.fail;
      await sleep(skipping ? 0 : 2200);
      closePanel();
    }
  };

  // Chapters can add moments of their own: V.acts.name = async (opts, tools) => {...}, played with ['act', name, opts].
  V.acts = ACTS;
  V.tools = { panel, closePanel, sleep: ms => sleep(skipping ? 0 : ms), skipping: () => skipping, sfx };

  // A prayer is a request to a goddess, and it times out.
  async function pray(text, to) {
    voice('pray|' + text);
    const p = panel(`<div class="vn-req"><div class="vn-req-h"><b>POST</b> /prayers <span class="muted">→ ${esc(to || 'Uptima')}</span></div>
      <p class="vn-req-b">"${esc(text)}"</p><div class="vn-req-s"><span class="spin"></span><span class="t">Waiting for a response… 0.0 s</span></div></div>`, 'pray');
    const t = p.querySelector('.t'), t0 = performance.now();
    const tick = setInterval(() => { t.textContent = `Waiting for a response… ${((performance.now() - t0) / 1000).toFixed(1)} s`; }, 100);
    await sleep(skipping ? 0 : 3600);
    clearInterval(tick);
    p.classList.add('dead');
    p.querySelector('.vn-req-s').innerHTML = '<span class="err">504 · No response</span>';
    sfx('wrong');
    await sleep(skipping ? 0 : 2400);
    closePanel();
  }

  // The loved one's face breaks up into Freya's.
  async function glitch(from, to, face) {
    const s = sprites[from];
    if (!s) { show(to, face); return; }
    sfx('drop');
    s.el.classList.add('glitch');
    if (!skipping) await sleep(650);
    s.el.innerHTML = spriteHTML(to, face);
    sprites[to] = s; delete sprites[from];
    s.el.dataset.who = to; s.face = face || 'neutral';
    if (lead === from) lead = to;
    if (!skipping) await sleep(650);
    s.el.classList.remove('glitch');
    // A last flicker of the face she borrowed.
    if (!skipping) {
      await sleep(300);
      s.el.innerHTML = spriteHTML(from); await sleep(90);
      s.el.innerHTML = spriteHTML(to, face);
    }
  }

  // A still that glitches into the next: the same framing with Freya where the borrowed face stood. The push-in
  // carries on across the cut, so only the person changes.
  async function gcut(id) {
    const host = cam.querySelector('.vn-cg'), pic = host.lastElementChild;
    const kb = pic && [...pic.classList].find(c => c.startsWith('kb-'));
    sfx('drop');
    if (pic && !skipping && !reduce()) { pic.classList.add('glitch'); await sleep(650); }
    setLayer('.vn-cg', id, kb ? kb.slice(3) + '+' : 'still', true);
    const now = host.lastElementChild;
    if (!skipping && !reduce()) { now.classList.add('glitch'); await sleep(450); now.classList.remove('glitch'); }
  }

  // ---------- Playing a script ----------
  V.playing = () => !!root && !root.hidden;
  V.play = async function (steps) {
    build();
    skipping = false;
    root.hidden = false;
    document.body.classList.add('vn-on');
    root.querySelector('.vn-black').classList.add('on');
    await sleep(60);
    for (const st of steps) {
      if (skipping) break;
      const [k, ...a] = st;
      if (!CMD.has(k)) { await line(k, a[0], a[1]); continue; }
      if (k === 'bg') { clearCG(); setLayer('.vn-bg', a[0]); root.querySelector('.vn-black').classList.remove('on'); await sleep(skipping ? 0 : 700); }
      else if (k === 'cg') {
        root.classList.add('vn-incg');
        // Out of black, the still swaps in whole underneath, so only it fades up (not a mix with the last one).
        setLayer('.vn-cg', a[0], a[1] || 'in', root.querySelector('.vn-black').classList.contains('on'));
        root.querySelector('.vn-black').classList.remove('on');
        await sleep(skipping ? 0 : 900);
      }
      else if (k === 'show') show(a[0], a[1], a[2]);
      else if (k === 'hide') hide(a[0]);
      else if (k === 'fx') await fx(a[0]);
      else if (k === 'wait') await sleep(skipping ? 0 : a[0]);
      else if (k === 'act') await ACTS[a[0]](a[1] || {}, V.tools);
      else if (k === 'pray') await pray(a[0], a[1]);
      else if (k === 'glitch') await glitch(a[0], a[1], a[2]);
      else if (k === 'gcut') await gcut(a[0]);
    }
    // Out to black, then away.
    advance = null; finishTyping(); closePanel(); SD.audio.voice(null);
    root.querySelector('.vn-black').classList.add('on');
    await sleep(skipping ? 200 : 900);
    rain(false);
    Object.keys(sprites).forEach(w => { sprites[w].el.remove(); delete sprites[w]; });
    lead = null;
    cam.querySelectorAll('.vn-pic').forEach(e => e.remove());
    root.classList.remove('vn-incg', 'flicker', 'shake');
    box.hidden = true;
    root.hidden = true;
    document.body.classList.remove('vn-on');
  };
})();
