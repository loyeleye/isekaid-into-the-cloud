// Visual-novel cutscenes: painted backgrounds and full-screen stills (CGs) the camera slowly pans across, waist-up
// character sprites whose faces change line by line, rain and lightning in front, a text box with a name plate, and
// the moments you play: an action that fails, a prayer sent as a request that times out, and a face glitching into
// someone else's. A chapter registers its art with SD.vn.art and plays a script with SD.vn.play(steps).
//
// A step is [command, ...args] or a line [speaker, text, face]:
//   ['bg', id]  ['cg', id, pan, 'cut']  ['show', who, face, pos]  ['hide', who]  ['fx', kind]  ['wait', ms]
//   ['act', kind, opts]  ['pray', text, to]  ['glitch', from, to, face]  ['gcut', id] (a still glitching into the next)
//   ['flick', [[id, ms], ...], slow, sound] (a run of quick cuts)  ['sfx', name]  ['music', name or null]
//   ['reveal', id, x, y, ms] (a still growing in over the last from a point)  ['warp', rate, secs, stutter] (the song
//   slowing like a dying tape; js/audio.js)  ['ring', on, back] (the hushed ring, off for `back` seconds)
//   ['morph', id, x, y, ms] (a still sharpening out of a mosaic over the last, outward from a point if given)
//   ['tiles', level] (the game breaking up in green blocks over the picture, 0 to 4)
// pan is 'in' (default), 'slow', 'still', 'left', 'right' or 'up', with '+' to carry on the last still's move;
// 'cut' swaps the still in at once instead of crossfading;
// pos is 'left', 'right' or 'center'; fx is 'shake', 'flash',
// 'thunder', 'black', 'rain', 'dry', 'heartbeat', or 'neon' and 'unneon' (a broken neon sign's flicker, on and off). Art that hasn't been painted yet shows a placeholder.
(function () {
  const V = SD.vn = {};
  const $ = s => document.querySelector(s);
  const esc = s => SD.ui.esc(s);
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sfx = (n, p) => { if (SD.audio) SD.audio.sfx(n, p); };
  const CMD = new Set(['bg', 'cg', 'show', 'hide', 'fx', 'wait', 'act', 'pray', 'glitch', 'gcut', 'flick', 'reveal', 'morph', 'tiles', 'sfx', 'music', 'warp', 'ring', 'cut']);

  // ---------- Art registry ----------
  // scenes: id -> { src (once painted), label, tint: [top, bottom], focus } for backgrounds and stills. focus is
  //   the CSS object-position that keeps the subject in frame when a narrow screen (a phone held upright) crops a
  //   16:9 still to a quarter of its width; the default is the centre. Stills that cut or crossfade into each other
  //   (a face change, a glitch cut) share one focus so the cut doesn't jump.
  // sprites: who -> { faces: { face: src }, stand: placeholder image, pixel: true if the stand-in is pixel art,
  //   tint } and who's name plate comes from SD.cast.
  V.art = { scenes: {}, sprites: {} };
  V.addScenes = o => Object.assign(V.art.scenes, o);
  V.addSprites = o => Object.assign(V.art.sprites, o);
  // Cutscene stills drawn one per storyboard shot (js/cut-*.js). A cut is a cutscene's shots as [still, cue] pairs,
  // where cue is a piece of the line the shot plays under (or a list of pieces, one per version of the line). The
  // first shot's cue starts the cut; after that, until the next 'bg', a line holding one of the cut's cues cuts to
  // that shot's still first. So a chapter's scripts pick up their stills without changing, and a short cue ('Yes.')
  // only counts inside its own cutscene. When several cues match, the one that starts earliest in the line wins.
  // A script can also name the cut it's in with ['cut', <cutscene>]: after a 'bg' inside a cutscene, or for lines that
  // carry on a cutscene after a quiz or a choice in between.
  V.cuts = [];
  V.addShots = shots => { V.cuts.push(shots); };
  // Overlays a chapter lays on a shot, by shot id ('cut-<cutscene>-<n>'), drawn by the game rather than painted:
  //   { text, x, y, w, size, color, bg, mono, align, rot }  words on a screen, a card or a note: x, y the top left and w
  //                                                        the width, in % of the shot; size in % of its height
  //   { src, x, y, h, float }                              a small sprite: centre x, top y and height in %
  //   { lead: 1, x, y, h }                                 your lead's own figure, standing in a shot painted without them
  //                                                        (h is Dutch's; shorter leads keep the same feet)
  // Any of them can carry if: () => bool, so a shot shows only what the save earned (a blessing left, a lantern lit).
  V.over = {};
  function match(shots, text) {
    let best = null, at = Infinity, len = 0;
    shots.forEach(([id, cue]) => [].concat(cue).forEach(c => {
      const i = text.indexOf(c);
      if (i >= 0 && (i < at || (i === at && c.length > len))) { best = id; at = i; len = c.length; }
    }));
    return best;
  }
  let cut = null;
  function shotFor(text) {
    if (typeof text !== 'string') return null;
    const open = V.cuts.find(c => match(c.slice(0, 1), text));
    if (open) cut = open;
    return cut && match(cut, text);
  }
  // A drawn picture: no sheet, and no painting behind it (the vector demo's art is SVG, so an SVG src is drawn too).
  function drawn(id) { const s = V.art.scenes[id] || {}; return !s.sheet && (!s.src || /^data:image\/svg/.test(s.src)); }
  // The still the next line after steps[i] cuts to, if it's a shot, without moving on: a backdrop that's about to be
  // covered by one is never shown (on a phone a drawn backdrop flashed up before the still).
  function nextShot(steps, i, c) {
    for (let j = i + 1; j < steps.length; j++) {
      const [k, a] = steps[j];
      // A puzzle or a prayer plays before the next line, so the backdrop has to show for it.
      if (k === 'bg' || k === 'act' || k === 'pray') return null;
      if (k === 'cg') return drawn(a) ? null : a;
      if (k === 'cut') { c = V.cuts.find(x => x[0][0] === 'cut-' + a + '-1') || c; continue; }
      if (CMD.has(k)) continue;
      if (typeof a !== 'string') return null;
      c = V.cuts.find(x => match(x.slice(0, 1), a)) || c;
      return c && match(c, a);
    }
    return null;
  }
  // Every sheet a script will cut to, loaded before it fades up from black, so a still never arrives late.
  function preload(steps) {
    const urls = new Set();
    let c = null;
    steps.forEach(([k, a]) => {
      if (k === 'bg') c = null;
      else if (k === 'cut') c = V.cuts.find(x => x[0][0] === 'cut-' + a + '-1') || c;
      else if (!CMD.has(k) && typeof a === 'string') {
        c = V.cuts.find(x => match(x.slice(0, 1), a)) || c;
        const s = V.art.scenes[c && match(c, a)];
        if (s && s.sheet) urls.add(s.sheet);
      }
    });
    return Promise.race([sleep(4000), Promise.all([...urls].map(u => new Promise(done => {
      const im = new Image();
      im.onload = im.onerror = done;
      im.src = SD.assetUrl ? SD.assetUrl(u) : u;
    })))]);
  }
  // Where a point on the current still (x, y as fractions of the painting) is on screen, as CSS percentages, after
  // the crop: an overlay like the ring's glint follows the painting rather than the screen.
  V.onStill = function (x, y) {
    const img = root && root.querySelector('.vn-cg .vn-pic:last-child > img');
    if (!img || !img.naturalWidth) return [x * 100 + '%', y * 100 + '%'];
    const W = img.clientWidth, H = img.clientHeight, k = Math.max(W / img.naturalWidth, H / img.naturalHeight);
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    const [fx, fy] = getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100);
    return [((W - w) * fx + x * w) / W * 100 + '%', ((H - h) * fy + y * h) / H * 100 + '%'];
  };

  function sceneHTML(id) {
    const s = V.art.scenes[id] || { label: id };
    // A shot from a sheet (js/cut-*.js): one image per cutscene with its 16:9 stills stacked top to bottom. A shot
    // with a painted twin (glitch) flickers into it now and then: painted is what's real, pixel art is Freya's copy.
    // A ghost ({ src, x, y, h }: centre, top and height in % of the shot) is a figure laid over the shot that floats,
    // such as Freya's projection over the campfire.
    const g = s.ghost;
    const over = (V.over[id] || []).filter(o => !o.if || o.if()).map(overHTML).join('');
    if (s.sheet) return `<div class="vn-sheet"${s.focus ? ` style="--fx:${parseFloat(s.focus) / 100}"` : ''}><i style="background-image:url(${s.sheet});` +
      `background-size:100% ${s.frames * 100}%;background-position:0 ${s.frames > 1 ? s.frame / (s.frames - 1) * 100 : 0}%">` +
      `${g ? `<img class="vn-ghost" src="${g.src}" alt="" style="left:${g.x}%;top:${g.y}%;height:${g.h}%">` : ''}${over}</i>` +
      `${s.glitch ? `<img class="vn-gl" src="${s.glitch}" alt="">` : ''}</div>`;
    if (s.src) return `<img src="${s.src}" alt=""${s.focus ? ` style="object-position:${s.focus}"` : ''}>`;
    const [a, b] = s.tint || ['#1b1d2b', '#05060a'];
    return `<div class="vn-ph" style="background:radial-gradient(ellipse at 50% 35%, ${a}, ${b} 75%)"><span>${esc(id.toUpperCase())} · ${esc(s.label || '')}<br><i>painted art coming</i></span></div>`;
  }
  const LEAD_CM = { mira: 173, kai: 178, seoyeon: 160, dutch: 191 };
  function overHTML(o) {
    if (o.text != null) return `<span class="vn-otext${o.mono ? ' mono' : ''}" style="left:${o.x}%;top:${o.y}%;width:${o.w || 30}%;--os:${o.size || 4};` +
      `${o.color ? `color:${o.color};` : ''}${o.bg ? `background:${o.bg};` : ''}${o.align ? `text-align:${o.align};` : ''}${o.rot ? `rotate:${o.rot}deg;` : ''}">${esc(o.text)}</span>`;
    let src = o.src;
    // Your lead over a painted still: their pixel full body (chapter 1's art), so pixel art never has a vector figure
    // standing in it. Dialogue sprites can be vector drawings (js/vec-cast.js), so they aren't used here.
    // Each body is cropped head to feet, so it's sized by the lead's height (the cast sheet's, in cm): h is the tallest
    // lead's (Dutch), the others shorter, feet on the same line.
    if (o.lead) {
      const who = (SD.state && SD.state.save.c1 && SD.state.save.c1.lead) || 'mira', h = o.h * (LEAD_CM[who] || 178) / LEAD_CM.dutch;
      return `<img class="vn-osp lead" src="assets/img/lead/${who}.webp" alt="" onerror="this.remove()" style="left:${o.x}%;top:${o.y + o.h - h}%;height:${h}%">`;
    }
    if (!src) return '';
    // A sprite that isn't drawn yet just isn't there.
    return `<img class="vn-osp${o.float ? ' float' : ''}" src="${src}" alt="" onerror="this.remove()" style="left:${o.x}%;top:${o.y}%;height:${o.h}%">`;
  }
  function spriteHTML(who, face) {
    // A sprite can choose its art at the time it's shown: now(face) returns { faces } or { stand } (Freya's three forms).
    const s0 = V.art.sprites[who] || {}, s = s0.now ? s0.now(face) || {} : s0;
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
    if (sel === '.vn-cg' && root.dataset.cg !== id) lastCG = root.dataset.cg;
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
    // A still fades in over the last one, which stays solid until it's covered: fading both at once let the backdrop
    // underneath show through mid-crossfade.
    const keep = sel === '.vn-cg' && !cut;
    old.forEach(o => { if (!keep) o.classList.remove('on'); setTimeout(() => o.remove(), cut ? 0 : keep ? 950 : 900); });
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
    if (kind === 'neon' || kind === 'unneon') { root.classList.toggle('neon', kind === 'neon' && !reduce()); return; }
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
      // With reduced motion the line shows at once (finishTyping only finishes a line that started typing).
      if (reduce()) { textEl.textContent = full; root.classList.add('vn-ready'); return; }
      let i = 0, n = 0;
      typing = setInterval(() => {
        i += 1; textEl.textContent = full.slice(0, i);
        if (!spoken && SD.audio.chirps && SD.audio.chirps(who)) SD.audio.chirp(who, full, i - 1, i, face);
        else if (who !== 'narr' && !spoken && n++ % 3 === 0) sfx('text', SD.ui.voiceOf ? SD.ui.voiceOf(who) : 600);
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
      // The still is object-fit: cover at its focus, so find where the image point lands in the box.
      const W = pic.clientWidth, H = pic.clientHeight, iw = img && img.naturalWidth || 16, ih = img && img.naturalHeight || 9;
      const [fx, fy] = img ? getComputedStyle(img).objectPosition.split(' ').map(v => parseFloat(v) / 100) : [0.5, 0.5];
      const k = Math.max(W / iw, H / ih), x = (W - iw * k) * fx + at[0] * iw * k, y = (H - ih * k) * fy + at[1] * ih * k;
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

  // A run of stills cut in quick succession, [id, ms] each, ending on the last (Chapter 1's reveal: Freya's faces
  // glitching through each other). Each cut ticks; sound, if given, plays as the run starts. With reduced motion, or
  // when skipping, it crossfades slowly through slow (default: just the last still) instead.
  async function flick(frames, slow, sound) {
    if (skipping || reduce()) {
      for (const id of slow || [frames[frames.length - 1][0]]) { setLayer('.vn-cg', id, 'still'); await sleep(skipping ? 0 : 1200); }
      return;
    }
    // Load every still first, so a short cut never shows an empty frame.
    await Promise.all([...new Set(frames.map(f => f[0]))].map(id => {
      const src = (V.art.scenes[id] || {}).src || (V.art.scenes[id] || {}).sheet;
      if (!src) return null;
      const im = new Image(); im.src = src;
      return im.decode().catch(() => {});
    }));
    if (sound) sfx(sound);
    for (const [id, ms] of frames) { setLayer('.vn-cg', id, 'still', true); if (ms) { sfx('tick'); await sleep(ms); } }
  }

  // A still that grows in over the one showing from a point (x, y: 0 to 1 across and down the picture), a soft-edged
  // circle widening over ms. With reduced motion, or skipping, it just cuts.
  async function revealCG(id, x, y, ms) {
    if (skipping || reduce()) { setLayer('.vn-cg', id, 'still', true); return; }
    const host = cam.querySelector('.vn-cg'), old = [...host.children];
    root.dataset.cg = id;
    const el = document.createElement('div');
    el.className = 'vn-pic on cut';
    el.innerHTML = sceneHTML(id);
    host.appendChild(el);
    // Where the point lands in the box: the picture covers it (object-fit: cover), cropped by its object-position.
    const img = el.querySelector('img'), w = el.clientWidth, h = el.clientHeight;
    const ar = img && img.naturalWidth ? img.naturalWidth / img.naturalHeight : 1376 / 768;
    const op = img ? getComputedStyle(img).objectPosition.split(' ').map(v => /%$/.test(v) ? parseFloat(v) / 100 : 0.5) : [0.5, 0.5];
    const pw = Math.max(w, h * ar), ph = pw / ar, cx = (w - pw) * op[0] + x * pw, cy = (h - ph) * (op[1] == null ? 0.5 : op[1]) + y * ph;
    const far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)), soft = far * 0.35, t0 = performance.now();
    const mask = r => { const m = `radial-gradient(circle at ${cx}px ${cy}px, #000 ${Math.max(0, r - soft)}px, transparent ${r}px)`; el.style.webkitMaskImage = el.style.maskImage = m; };
    mask(0);
    await new Promise(res => {
      const step = () => {
        const p = Math.min(1, (performance.now() - t0) / ms), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        mask(e * (far + soft));
        if (p < 1 && !skipping) return requestAnimationFrame(step);
        el.style.webkitMaskImage = el.style.maskImage = '';
        old.forEach(o => o.remove());
        res();
      };
      requestAnimationFrame(step);
    });
  }

  // ---------- Shots on a canvas ----------
  // A shot drawn as the CG layer shows it, covering w×h (cropped by its focus), for the mosaic and the tiles below.
  // Each is drawn once per size and kept; null until its picture has loaded. lastCG is the shot before this one.
  let lastCG = null;
  const imgs = {}, shots = new Map();
  function shotCanvas(id, w, h) {
    const key = id + '|' + w + 'x' + h;
    if (shots.has(key)) return shots.get(key);
    const s = V.art.scenes[id], im = picture(id);
    if (!im || !im.complete || !im.naturalWidth) return null;
    const fw = im.naturalWidth, fh = s.sheet ? im.naturalHeight / s.frames : im.naturalHeight;
    const pos = s.sheet ? [s.focus ? parseFloat(s.focus) / 100 : 0.5, 0.5] : s.focus ? s.focus.split(' ').map(v => parseFloat(v) / 100) : [0.5, 0.5];
    const k = Math.max(w / fw, h / fh), dw = fw * k, dh = fh * k;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = !s.sheet;
    g.drawImage(im, 0, s.sheet ? (s.frame || 0) * fh : 0, fw, fh, (w - dw) * pos[0], (h - dh) * (pos[1] == null ? 0.5 : pos[1]), dw, dh);
    shots.set(key, c);
    if (shots.size > 12) shots.delete(shots.keys().next().value);
    return c;
  }
  // A canvas of `src` in blocks `p` wide (a mosaic).
  function mosaic(src, p) {
    const w = src.width, h = src.height, sw = Math.ceil(w / p), sh = Math.ceil(h / p);
    const small = document.createElement('canvas'); small.width = sw; small.height = sh;
    small.getContext('2d').drawImage(src, 0, 0, sw, sh);
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(small, 0, 0, sw, sh, 0, 0, sw * p, sh * p);
    return c;
  }
  function picture(id) {
    const s = V.art.scenes[id], url = s && (s.src || s.sheet);
    if (!url) return null;
    if (!imgs[url]) { imgs[url] = new Image(); imgs[url].src = url; }
    return imgs[url];
  }
  const loaded = id => { const im = picture(id); return !im || im.complete ? Promise.resolve() : new Promise(r => { im.addEventListener('load', r); im.addEventListener('error', r); }); };

  // The same pose from one shot to the next, through a mosaic: first the last shot dissolves into big blocks of the
  // new one, then the blocks get finer in steps until it's the picture itself. With x and y (0 to 1 across and down
  // the new shot) it sharpens outward from there, in rings, the finest nearest. With reduced motion, or skipping, it
  // just cuts.
  async function morphCG(id, x, y, ms) {
    if (skipping || reduce()) { setLayer('.vn-cg', id, 'still', true); return; }
    const host = cam.querySelector('.vn-cg'), old = [...host.children], from = root.dataset.cg;
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = Math.round(host.clientWidth * dpr), h = Math.round(host.clientHeight * dpr);
    await Promise.all([loaded(id), from && loaded(from)]);
    const A = from && shotCanvas(from, w, h), B = shotCanvas(id, w, h);
    if (!B) { setLayer('.vn-cg', id, 'still', true); return; }
    lastCG = from; root.dataset.cg = id;
    // Coarse to fine, as blocks across the width, starting near the pixel art's own grain; the last is the shot itself.
    const levels = [150, 220, 320, 470, 700].map(n => mosaic(B, w / n)).concat([B]);
    const el = document.createElement('div');
    el.className = 'vn-pic on cut';
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    el.appendChild(c); host.appendChild(el);
    const g = c.getContext('2d'), n = levels.length - 1, fade = 0.3;
    const cx = x * w, cy = y * h, far = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)), band = far * 0.16;
    const draw = t => {
      g.globalAlpha = 1;
      if (t < fade) {
        if (A) g.drawImage(A, 0, 0); else g.clearRect(0, 0, w, h);
        g.globalAlpha = t / fade; g.drawImage(levels[0], 0, 0);
        return;
      }
      const u = (t - fade) / (1 - fade);
      if (x == null) { g.drawImage(levels[Math.min(n, Math.floor(u * (n + 1)))], 0, 0); return; }
      g.drawImage(levels[0], 0, 0);
      const r = u * (far + n * band);
      for (let i = 1; i <= n; i++) {
        const ri = r - (i - 1) * band;
        if (ri <= 0) break;
        g.save(); g.beginPath(); g.arc(cx, cy, ri, 0, Math.PI * 2); g.clip(); g.drawImage(levels[i], 0, 0); g.restore();
      }
    };
    const t0 = performance.now();
    await new Promise(res => {
      const step = () => {
        const t = Math.min(1, (performance.now() - t0) / ms);
        draw(t);
        if (t < 1 && !skipping) return requestAnimationFrame(step);
        el.innerHTML = sceneHTML(id);
        old.forEach(o => o.remove());
        res();
      };
      requestAnimationFrame(step);
    });
  }

  // The game itself breaking up over the picture, level 1 to 4 (0 stops it): bursts of the dull green blocks a video
  // decoder leaves where picture data is missing (zeroed YUV comes out green), rows of the shot torn sideways, and
  // blocks of the last shot left behind on the new one, as in a datamosh. Each level comes more often and bigger.
  // Not with reduced motion: it's flashing.
  let tl = null;
  function tiles(level) {
    if (tl) { cancelAnimationFrame(tl.raf); tl.c.remove(); tl = null; }
    if (!level || reduce() || skipping) return;
    const c = document.createElement('canvas');
    c.className = 'vn-tiles';
    cam.appendChild(c);
    const g = c.getContext('2d'), rnd = (a, b) => a + Math.random() * (b - a), pick = a => a[Math.floor(Math.random() * a.length)];
    const me = tl = { c, raf: 0, next: performance.now() + rnd(80, 400), end: 0, burst: [], f: 0 };
    const burst = (w, h, b) => {
      const out = [], cols = Math.ceil(w / b), rows = Math.ceil(h / b);
      for (let k = 0, m = level + Math.floor(rnd(0, level * 2.5)); k < m; k++) {
        const kind = Math.random(), r = Math.floor(rnd(0, rows)), col = Math.floor(rnd(0, cols));
        const len = 1 + Math.floor(rnd(0, 2 + level * 3)), tall = 1 + Math.floor(rnd(0, 1 + level / 2));
        if (kind < 0.5) out.push({ k: 'green', x: col * b, y: r * b, w: len * b, h: tall * b, b, cells: Array.from({ length: len * tall }, () => Math.random() < 0.45 ? 'luma' : pick(['#008700', '#008700', '#007a12', '#00a02c', '#22ff6a'])) });
        else if (kind < 0.75) out.push({ k: 'stale', x: col * b, y: r * b, w: len * b, h: tall * b });
        else if (kind < 0.95) out.push({ k: 'tear', y: r * b, h: Math.max(2, Math.floor(rnd(0.15, 1) * tall * b)), dx: (Math.random() < 0.5 ? -1 : 1) * b * rnd(0.5, 5) });
        else out.push({ k: 'green', x: col * b, y: r * b, w: b, h: b, b, cells: ['#ff2bd6'] });
      }
      return out;
    };
    const step = now => {
      if (tl !== me) return;
      const w = c.clientWidth, h = c.clientHeight;
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      const b = Math.round(Math.min(32, Math.max(10, w / 56)));
      if (now >= me.next) {
        me.burst = burst(w, h, b);
        me.end = now + rnd(70, 120 + level * 50);
        me.next = me.end + rnd(220, 1300) / level;
      }
      g.clearRect(0, 0, w, h);
      // Blocks come and go every other frame or so while a burst lasts, like a stream catching and losing sync.
      if (now < me.end && (me.f++ % 3 !== 2)) {
        const cur = shotCanvas(root.dataset.cg, w, h), prev = lastCG && shotCanvas(lastCG, w, h);
        me.burst.forEach(t => {
          if (t.k === 'green') {
            // Each block flat dull green (no data at all), or the picture with its colour gone green (the brightness
            // came through, the colour didn't).
            const across = t.w / t.b;
            t.cells.forEach((cell, i) => {
              const x = t.x + (i % across) * t.b, y = t.y + Math.floor(i / across) * t.b;
              if (cell === 'luma' && cur) {
                g.drawImage(cur, x, y, t.b, t.b, x, y, t.b, t.b);
                g.globalCompositeOperation = 'color'; g.fillStyle = '#00b400'; g.fillRect(x, y, t.b, t.b);
                g.globalCompositeOperation = 'source-over';
              } else { g.fillStyle = cell === 'luma' ? '#008700' : cell; g.fillRect(x, y, t.b, t.b); }
            });
            g.fillStyle = 'rgba(0,0,0,.18)';
            for (let yy = t.y + 2; yy < t.y + t.h; yy += 4) g.fillRect(t.x, yy, t.w, 1);
          } else if (t.k === 'stale') {
            if (prev) g.drawImage(prev, t.x, t.y, t.w, t.h, t.x, t.y, t.w, t.h);
          } else if (cur) g.drawImage(cur, 0, t.y, w, t.h, t.dx, t.y, w, t.h);
        });
      }
      me.raf = requestAnimationFrame(step);
    };
    me.raf = requestAnimationFrame(step);
  }

  // ---------- Playing a script ----------
  V.playing = () => !!root && !root.hidden;
  V.play = async function (steps) {
    build();
    skipping = false;
    cut = null;
    root.hidden = false;
    document.body.classList.add('vn-on');
    root.querySelector('.vn-black').classList.add('on');
    await Promise.all([sleep(60), preload(steps)]);
    for (let i = 0; i < steps.length; i++) {
      if (skipping) break;
      const [k, ...a] = steps[i];
      if (!CMD.has(k)) {
        const shot = shotFor(a[0]);
        if (shot && (shot !== root.dataset.cg || root.querySelector('.vn-black').classList.contains('on'))) {
          root.classList.add('vn-incg');
          setLayer('.vn-cg', shot, 'slow', root.querySelector('.vn-black').classList.contains('on'));
          root.querySelector('.vn-black').classList.remove('on');
          await sleep(skipping ? 0 : 600);
        }
        await line(k, a[0], a[1]); continue;
      }
      // A backdrop the next line's still covers goes in underneath, unseen; a drawn still (no painting or sheet behind
      // it) is skipped when a pixel still is up or about to be.
      if (k === 'bg' && nextShot(steps, i, null)) { cut = null; root.classList.add('vn-incg'); setLayer('.vn-bg', a[0]); }
      else if (k === 'cg' && drawn(a[0]) && (cut || nextShot(steps, i, cut))) continue;
      else if (k === 'bg') { cut = null; clearCG(); setLayer('.vn-bg', a[0]); root.querySelector('.vn-black').classList.remove('on'); await sleep(skipping ? 0 : 700); }
      else if (k === 'cg') {
        root.classList.add('vn-incg');
        // Out of black, the still swaps in whole underneath, so only it fades up (not a mix with the last one).
        setLayer('.vn-cg', a[0], a[1] || 'in', a[2] === 'cut' || root.querySelector('.vn-black').classList.contains('on'));
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
      else if (k === 'flick') await flick(a[0], a[1], a[2]);
      else if (k === 'reveal') await revealCG(a[0], a[1], a[2], a[3]);
      else if (k === 'morph') await morphCG(a[0], a[1], a[2], a[3]);
      else if (k === 'tiles') tiles(a[0]);
      else if (k === 'warp') { if (SD.audio && SD.audio.warp) SD.audio.warp(a[0], a[1], a[2]); }
      else if (k === 'ring') { if (SD.audio && SD.audio.ring) SD.audio.ring(a[0], a[1]); }
      else if (k === 'sfx') sfx(a[0]);
      else if (k === 'music') SD.audio.music(a[0]);
      else if (k === 'cut') cut = V.cuts.find(c => c[0][0] === 'cut-' + a[0] + '-1') || cut;
    }
    // Out to black, then away.
    advance = null; finishTyping(); closePanel(); SD.audio.voice(null);
    root.querySelector('.vn-black').classList.add('on');
    await sleep(skipping ? 200 : 900);
    rain(false); tiles(0);
    Object.keys(sprites).forEach(w => { sprites[w].el.remove(); delete sprites[w]; });
    lead = null;
    cam.querySelectorAll('.vn-pic').forEach(e => e.remove());
    root.classList.remove('vn-incg', 'flicker', 'shake', 'neon');
    box.hidden = true;
    root.hidden = true;
    document.body.classList.remove('vn-on');
  };
})();
