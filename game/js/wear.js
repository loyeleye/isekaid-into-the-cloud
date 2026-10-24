// Cosmetics (Ladi, 2026-10-24): outfit recolours, effects that follow your lead around, and portrait frames. Looks
// only, no power. Nothing is laid on the art: a recolour repaints the lead's own clothing (the masks in
// assets/img/wear/mask, tools/outfit_masks.py) on the dialogue faceset and the full body, and recolours the vector
// figure's clothes (js/vec-cast.js asks for them); effects and frames are drawn in code around the picture.
//
//   SD.wear.slot(id)        -> 'outfit', 'effect', 'frame' or null (not a cosmetic)
//   SD.wear.equip(id)       -> wears an owned item, replacing whatever was in its slot; false if it can't
//   SD.wear.unequip(slot)   -> takes off that slot's item
//   SD.wear.worn()          -> [ids] worn now, in slot order
//   SD.wear.owns(id)        -> every item while no shop is loaded; the shop (js/marks.js) replaces it
//   SD.wear.price           -> set by the shop: id -> a short price label for an item you don't own yet
//   SD.wear.open()          -> the Wardrobe panel
//
// What's worn is S.save.fg.wear = { outfit, effect, frame }. Buying is the shop's job; ITEMS' tiers are a guide for it.
(function () {
  const W = SD.wear = {};
  const S = SD.state;
  const SLOTS = W.SLOTS = ['outfit', 'effect', 'frame'];
  const LEADS = ['kai', 'mira', 'seoyeon', 'dutch'];
  const MASK = 'assets/img/wear/mask/';

  // Outfits: main recolours the lead's main clothing, trim the light part (Kai's towel, Mira's band and collar,
  // Seo-yeon's sash, Dutch's shirt); left out, that part stays as drawn. Tiers: common, rare, legendary.
  const ITEMS = W.ITEMS = {
    'outfit-ember': { slot: 'outfit', name: 'Ember red', tier: 'common', main: '#a8322e' },
    'outfit-forest': { slot: 'outfit', name: 'Forest green', tier: 'common', main: '#2f6b45' },
    'outfit-midnight': { slot: 'outfit', name: 'Midnight blue', tier: 'common', main: '#26336b' },
    'outfit-snow': { slot: 'outfit', name: 'Snow white', tier: 'common', main: '#dfe5ec', trim: '#9fb4c8' },
    'outfit-gilded': { slot: 'outfit', name: 'Gilded trim', tier: 'common', trim: '#e2b23a' },
    'outfit-harvest': { slot: 'outfit', name: 'Harvest', tier: 'rare', main: '#c4621c', trim: '#2b2230', holiday: 'Halloween and harvest' },
    'outfit-winterfest': { slot: 'outfit', name: 'Winterfest', tier: 'rare', main: '#b3202d', trim: '#f4f6f8', holiday: 'Winter holidays' },
    'outfit-lunar': { slot: 'outfit', name: 'Lunar New Year', tier: 'rare', main: '#c01c2a', trim: '#e9b53a', holiday: 'Lunar New Year' },
    'outfit-spring': { slot: 'outfit', name: 'Spring bloom', tier: 'rare', main: '#8ccbbd', trim: '#f4b9cc', holiday: 'Spring' },
    'fx-stardust': { slot: 'effect', name: 'Stardust', tier: 'rare' },
    'fx-snow': { slot: 'effect', name: 'Snowfall', tier: 'rare' },
    'fx-embers': { slot: 'effect', name: 'Embers', tier: 'rare' },
    'fx-soot': { slot: 'effect', name: 'Soot puffs', tier: 'legendary', note: 'For Explodia' },
    'fx-firework': { slot: 'effect', name: 'Victory fireworks', tier: 'legendary', note: 'A big burst when you win a fight' },
    'frame-cafe': { slot: 'frame', name: 'Café frame', tier: 'common' },
    'frame-pager': { slot: 'frame', name: '3 a.m. pager', tier: 'common' },
    'frame-temple': { slot: 'frame', name: 'Temple of Uptime', tier: 'common' },
    'frame-starlit': { slot: 'frame', name: 'Starlit', tier: 'common' }
  };
  // The vector figures' clothing colours (js/vec-cast.js CAST) that count as main and trim; ...D ones drawn darker.
  const VEC = {
    kai: { main: ['coat', 'coatD'] },
    mira: { main: ['coat', 'coatD', 'hood', 'hoodD'], trim: ['band', 'under'] },
    seoyeon: { main: ['coat', 'coatD', 'legs'] },
    dutch: { main: ['coat', 'coatD'], trim: ['under', 'collarCol'] }
  };
  const FACES = ['neutral', 'smile', 'sad', 'angry', 'surprised', 'tired'];
  // The faces that are copies of another, so share its mask (js/vec-cast.js FACESET).
  const SAME = { anger: 'angry', shock: 'surprised', grief: 'sad', warm: 'smile' };

  // ---- What's worn ---------------------------------------------------------------------------------------------------
  W.slot = id => (ITEMS[id] ? ITEMS[id].slot : null);
  W.owns = id => !!ITEMS[id];
  W.price = null;
  function save() {
    const sv = S && S.save;
    if (!sv) return {};
    sv.fg = sv.fg && typeof sv.fg === 'object' ? sv.fg : {};
    const w = sv.fg.wear = sv.fg.wear && typeof sv.fg.wear === 'object' ? sv.fg.wear : {};
    Object.keys(w).forEach(s => { if (!SLOTS.includes(s)) delete w[s]; });
    SLOTS.forEach(s => { if (!ITEMS[w[s]] || ITEMS[w[s]].slot !== s) w[s] = null; });
    return w;
  }
  W.worn = () => { const w = save(); return SLOTS.map(s => w[s]).filter(Boolean); };
  // Someone else's list (a party member's presence): only real items, at most one a slot, in slot order.
  W.clean = function (list) {
    const out = {};
    (Array.isArray(list) ? list : []).forEach(id => { if (typeof id === 'string' && ITEMS[id] && !out[ITEMS[id].slot]) out[ITEMS[id].slot] = id; });
    return SLOTS.map(s => out[s]).filter(Boolean);
  };
  const of = (list, slot) => list.find(id => ITEMS[id].slot === slot) || null;
  const listeners = [];
  W.onChange = fn => listeners.push(fn);
  function changed() {
    if (S.persist) S.persist();
    W.dress();
    listeners.forEach(fn => { try { fn(W.worn()); } catch (e) { /* a listener's own trouble */ } });
  }
  W.equip = function (id) {
    if (!ITEMS[id] || !W.owns(id)) return false;
    save()[ITEMS[id].slot] = id;
    changed();
    return true;
  };
  W.unequip = function (slot) {
    if (!SLOTS.includes(slot)) return false;
    save()[slot] = null;
    changed();
    return true;
  };
  // Your lead: the one dressed for this chapter, else the one you chose in chapter 1.
  W.lead = function () {
    const d = document.body && document.body.dataset.lead;
    if (LEADS.includes(d)) return d;
    const c1 = S && S.save && S.save.c1;
    return c1 && LEADS.includes(c1.lead) ? c1.lead : null;
  };
  const mine = (who, wear) => (wear ? W.clean(wear) : who === W.lead() ? W.worn() : []);

  // ---- Recolouring -----------------------------------------------------------------------------------------------------
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  function hsl(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    if (!d) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function rgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
    const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
    return [r + m, g + m, b + m];
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  // Paint the masked pixels (channel ch of the mask: 0 main, 1 trim) in the target colour, keeping the drawing's own
  // light and shade: each pixel's lightness keeps its step from the clothing's average, stretched for a light target
  // so the folds and outlines still read.
  function paint(data, mask, ch, target) {
    if (!target) return;
    let sum = 0, n = 0;
    for (let i = 0; i < data.length; i += 4) if (mask[i + ch] > 127 && data[i + 3] > 127) { sum += hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255)[2]; n++; }
    if (!n) return;
    const avg = sum / n, [th, ts, tl] = hsl.apply(null, hex(target)), k = 1 + Math.max(0, tl - avg) * 1.4;
    for (let i = 0; i < data.length; i += 4) {
      if (mask[i + ch] <= 127 || data[i + 3] <= 127) continue;
      const l = hsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255)[2];
      // Outlines stay dark whatever the colour, so a light outfit doesn't melt into its own folds.
      const c = rgb(th, ts, l < 0.09 ? Math.min(0.2, tl * 0.3) : clamp(tl + (l - avg) * k, 0.04, 0.97));
      data[i] = c[0] * 255; data[i + 1] = c[1] * 255; data[i + 2] = c[2] * 255;
    }
  }
  const made = {}, waiting = {};
  function load(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }
  // src in an outfit, as an object URL; null until it's ready (then cb runs with it). mask: its mask file.
  W.recolor = function (src, mask, outfit, cb) {
    const it = ITEMS[outfit];
    if (!it || it.slot !== 'outfit') return null;
    const key = src + '|' + outfit;
    if (made[key]) return made[key];
    const q = waiting[key] = waiting[key] || [];
    if (cb) q.push(cb);
    if (q.busy) return null;
    q.busy = true;
    Promise.all([load(src), load(mask)]).then(([im, mk]) => {
      const cv = document.createElement('canvas');
      cv.width = im.width; cv.height = im.height;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.imageSmoothingEnabled = false;
      g.drawImage(mk, 0, 0, im.width, im.height);
      const m = g.getImageData(0, 0, im.width, im.height).data;
      g.clearRect(0, 0, im.width, im.height);
      g.drawImage(im, 0, 0);
      const d = g.getImageData(0, 0, im.width, im.height);
      paint(d.data, m, 0, it.main);
      paint(d.data, m, 1, it.trim);
      g.putImageData(d, 0, 0);
      cv.toBlob(b => {
        made[key] = URL.createObjectURL(b);
        delete waiting[key];
        q.forEach(fn => fn(made[key]));
        // Faces already on screen catch up.
        document.querySelectorAll(`img[data-wear-src="${CSS.escape(key)}"]`).forEach(i => { i.src = made[key]; });
      });
    }).catch(() => { delete waiting[key]; });
    return null;
  };
  const faceSrc = (who, m) => `assets/img/portraits/${who}-${m}.webp`;
  const faceMask = (who, m) => `${MASK}${who}-${SAME[m] || m}.webp`;
  const standSrc = who => `assets/img/lead/${who}.webp`;
  const standMask = who => `${MASK}${who}-stand.webp`;
  // Get a lead's faces and full body ready before they're needed.
  W.prepare = function (who, outfit) {
    if (!LEADS.includes(who) || !outfit) return;
    FACES.forEach(m => W.recolor(faceSrc(who, m), faceMask(who, m), outfit));
    W.recolor(standSrc(who), standMask(who), outfit);
  };

  // ---- Effects -----------------------------------------------------------------------------------------------------------
  // An effect is a layer of little particles over the picture, animated by CSS (css() below). big: the battle fighter
  // and the party seat, which have room for a bigger show.
  const N = { 'fx-stardust': 10, 'fx-snow': 12, 'fx-embers': 10, 'fx-soot': 6, 'fx-firework': 12 };
  W.fx = function (id, big) {
    if (!ITEMS[id] || ITEMS[id].slot !== 'effect') return '';
    return `<span class="wfx ${id}${big ? ' wfx-big' : ''}" aria-hidden="true">${'<i></i>'.repeat(N[id])}</span>`;
  };
  // Your fighter in battle: js/run.js puts this inside the stage's .hero.
  W.heroFx = () => { const e = of(W.worn(), 'effect'); return e ? W.fx(e, true) : ''; };

  // ---- The faceset -----------------------------------------------------------------------------------------------------
  // Dress a dialogue bust's markup (js/art.js, js/vec-cast.js): the recoloured face, the frame and the effect. wear: a
  // list to show instead of yours; yours only go on your lead.
  W.dressBust = function (who, mood, html, wear) {
    const list = mine(who, wear);
    if (!list.length || !LEADS.includes(who)) return html;
    const outfit = of(list, 'outfit'), effect = of(list, 'effect'), frame = of(list, 'frame');
    if (outfit) {
      const src = faceSrc(who, mood), url = W.recolor(src, faceMask(who, mood), outfit);
      html = html.replace(`src="${src}"`, `src="${url || src}" data-wear-src="${src}|${outfit}"`);
    }
    if (frame) html = html.replace('class="bust ', `class="bust wf ${frame} `);
    if (effect) html = html.replace(/<\/span>$/, W.fx(effect) + '</span>');
    return html;
  };

  // ---- The full body ---------------------------------------------------------------------------------------------------
  // A champion sprite element (js/ch1-mines.js CH.sprite, js/vec-ch2.js's vector one) of `lead` in `wear`: the outfit
  // on the picture, the frame and the effect on its stage (the party seat).
  W.dressSprite = function (el, lead, wear, stage) {
    const list = W.clean(wear);
    if (!el || !list.length) return;
    const outfit = of(list, 'outfit'), effect = of(list, 'effect'), frame = of(list, 'frame');
    if (outfit && LEADS.includes(lead)) {
      if (/data:image\/svg/.test(el.style.backgroundImage) && SD.vec && SD.vec.fig) el.style.backgroundImage = `url("${SD.vec.fig(lead, 'neutral', 'full', null, [outfit])}")`;
      else {
        const put = u => { el.style.backgroundImage = `url(${u})`; };
        const u = W.recolor(standSrc(lead), standMask(lead), outfit, put);
        if (u) put(u);
      }
    }
    if (stage) {
      if (frame) stage.classList.add('wf', frame);
      if (effect) stage.insertAdjacentHTML('beforeend', W.fx(effect, true));
    }
  };

  // Your fighter in battle (index.html's body[data-lead] .stage .hero draws --lead-img), the leads' pictures, and your
  // lead's recoloured faces made ready.
  W.dress = function () {
    const lead = W.lead(), outfit = of(W.worn(), 'outfit');
    const T = SD.ch1story;
    if (lead) W.prepare(lead, outfit);
    if (window.SD_VECTOR && SD.vec && SD.vec.fig) {
      // K.fig dresses your lead in yours; the memo key changes with them, so ask again.
      if (T) T.order.forEach(id => { T.leads[id].img = SD.vec.fig(id, 'neutral', 'full'); });
      if (lead && document.body.dataset.lead === lead) document.body.style.setProperty('--lead-img', `url(${SD.vec.fig(lead, 'neutral', 'full')})`);
      return;
    }
    if (!lead || document.body.dataset.lead !== lead) return;
    if (!outfit) { document.body.style.setProperty('--lead-img', `url(${standSrc(lead)})`); return; }
    const put = u => { if (W.lead() === lead) document.body.style.setProperty('--lead-img', `url(${u})`); };
    const u = W.recolor(standSrc(lead), standMask(lead), outfit, put);
    if (u) put(u);
  };

  // ---- The vector figures (js/vec-cast.js) -----------------------------------------------------------------------------
  // For K.fig: { key, L } where L overrides the figure's clothing colours, from `wear` if given ([] for none), else
  // yours on your lead; null when nothing changes.
  W.vec = function (id, wear) {
    const outfit = of(mine(id, wear), 'outfit'), v = VEC[id];
    if (!outfit || !v) return null;
    const it = ITEMS[outfit], L = {};
    const dark = h => { const [a, b, c] = hsl.apply(null, hex(h)); return '#' + rgb(a, b, c * 0.7).map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
    ['main', 'trim'].forEach(k => { if (it[k] && v[k]) v[k].forEach(p => { L[p] = /D$/.test(p) ? dark(it[k]) : it[k]; }); });
    return { key: outfit, L };
  };

  // ---- Looks -----------------------------------------------------------------------------------------------------------
  function css() {
    if (document.getElementById('wear-css')) return;
    const st = document.createElement('style');
    st.id = 'wear-css';
    // Each particle (i) gets its own place and delay from its place in the list.
    const spots = Array.from({ length: 12 }, (_, k) => `.wfx i:nth-child(${k + 1}) { --x: ${(k * 37 + 11) % 92 + 4}%; --y: ${(k * 53 + 17) % 80 + 8}%; --d: ${((k * 0.71) % 3).toFixed(2)}s; --a: ${k * 30}deg; --c: ${['#ff6b8a', '#ffd34d', '#6fd6ff', '#7ef0a0'][k % 4]}; }`).join('\n');
    st.textContent = `
.wfx { position: absolute; inset: 0; pointer-events: none; z-index: 2; }
.wfx i { position: absolute; left: var(--x); top: var(--y); width: 5px; height: 5px; border-radius: 50%; opacity: 0; animation-delay: var(--d) !important; }
.wfx-big i { width: 7px; height: 7px; }
${spots}
.fx-stardust i { background: #fff6c8; box-shadow: 0 0 6px #ffe680, 0 0 2px #fff; animation: wfx-twinkle 2.4s ease-in-out infinite; }
@keyframes wfx-twinkle { 0%, 100% { opacity: 0; transform: scale(.4); } 50% { opacity: 1; transform: scale(1.2); } }
.fx-snow i { background: #fff; box-shadow: 0 0 2px #8fb4d8; animation: wfx-fall 4.2s linear infinite; }
@keyframes wfx-fall { 0% { opacity: 0; transform: translate(0, -60px); } 15% { opacity: .95; } 85% { opacity: .9; } 100% { opacity: 0; transform: translate(10px, 60px); } }
.fx-embers i { background: #ffb347; box-shadow: 0 0 6px #ff6a1a; top: calc(var(--y) / 2 + 45%); width: 4px; height: 4px; animation: wfx-rise 3s ease-out infinite; }
@keyframes wfx-rise { 0% { opacity: 0; transform: translate(0, 0); } 15% { opacity: 1; } 100% { opacity: 0; transform: translate(8px, -70px); } }
.fx-soot i { background: radial-gradient(circle, rgba(60,55,60,.85), rgba(40,36,40,0) 70%); width: 22px; height: 22px; top: calc(var(--y) / 3 + 60%); animation: wfx-soot 3.6s ease-out infinite; }
.wfx-big.fx-soot i { width: 30px; height: 30px; }
@keyframes wfx-soot { 0% { opacity: 0; transform: translate(0, 0) scale(.4); } 20% { opacity: .9; } 100% { opacity: 0; transform: translate(-6px, -60px) scale(1.8); } }
.fx-firework i { background: var(--c); box-shadow: 0 0 5px var(--c); left: 50%; top: 0; width: 4px; height: 4px; animation: wfx-burst 3.2s ease-out infinite; animation-delay: 1.2s !important; }
@keyframes wfx-burst { 0%, 55% { opacity: 0; transform: rotate(var(--a)) translateX(0); } 60% { opacity: 1; } 100% { opacity: 0; transform: rotate(var(--a)) translateX(40px); } }
.won .fx-firework i { animation: wfx-burst 1.4s ease-out 3; animation-delay: 0s !important; width: 7px; height: 7px; }
@media (prefers-reduced-motion: reduce) { .wfx i { animation: none !important; opacity: .7; } .fx-firework i, .fx-soot i { display: none; } }

.bust.wf::before { content: ''; position: absolute; inset: 6% 2% 0; border-radius: 14px 14px 6px 6px; background: var(--wf-bg); box-shadow: inset 0 0 0 4px var(--wf-line), var(--wf-glow, 0 0 0 transparent); }
.bust.wf > img { position: relative; }
.pt-stage.wf { background: var(--wf-bg) !important; box-shadow: inset 0 0 0 4px var(--wf-line), var(--wf-glow, 0 0 0 transparent); position: relative; }
.frame-cafe { --wf-bg: repeating-linear-gradient(90deg, #8a5a34 0 14px, #7a4e2c 14px 16px); --wf-line: #c99a3e; --wf-glow: inset 0 0 0 8px #5a3a22; }
.frame-pager { --wf-bg: repeating-linear-gradient(0deg, rgba(255,255,255,.05) 0 2px, transparent 2px 4px), radial-gradient(ellipse at 50% 30%, #3a1520, #140a12 70%); --wf-line: #e0393e; }
.bust.frame-pager::after, .pt-stage.frame-pager::after { content: '03:00'; position: absolute; top: 10%; right: 7%; font: 700 11px/1 ui-monospace, monospace; color: #ff5a5f; text-shadow: 0 0 6px #ff2a35; animation: wf-blink 1s steps(2) infinite; z-index: 1; }
@keyframes wf-blink { 50% { opacity: .2; } }
.frame-temple { --wf-bg: linear-gradient(180deg, #a9cbe8 0%, #e6f0f8 55%, #cfd6de 56%, #b9c1ca 100%); --wf-line: #8a8f99; --wf-glow: inset 0 0 0 7px #d8b85a; }
.frame-starlit { --wf-bg: radial-gradient(circle at 20% 25%, #fff 0 1px, transparent 2px), radial-gradient(circle at 70% 15%, #fff 0 1px, transparent 2px), radial-gradient(circle at 85% 60%, #fff6c8 0 1.5px, transparent 2.5px), radial-gradient(circle at 35% 70%, #fff 0 1px, transparent 2px), radial-gradient(circle at 55% 40%, #cfe2ff 0 1px, transparent 2px), radial-gradient(ellipse at 50% 0%, #2c3a7a, #0e1230 75%); --wf-line: #9fb4ff; }

.wd { display: grid; gap: 12px; }
.wd-top { display: flex; gap: 14px; align-items: flex-end; justify-content: center; flex-wrap: wrap; }
.wd-fig { position: relative; width: 84px; height: 150px; background: center bottom / contain no-repeat; image-rendering: pixelated; }
.wd-slot h3 { margin: 0 0 6px; font-size: 15px; }
.wd-items { display: flex; gap: 6px; flex-wrap: wrap; }
.wd-items button { display: grid; justify-items: center; gap: 2px; min-width: 84px; padding: 6px; font-size: 12px; }
.wd-sw { position: relative; display: block; width: 40px; height: 26px; border-radius: 6px; border: 2px solid var(--mi-ink, #2b2340); overflow: hidden; }
.wd-items button[aria-pressed="true"] { outline: 3px solid var(--mi-blue, #2a62c9); }
.wd-items button:disabled { opacity: .55; }
`;
    document.head.appendChild(st);
  }

  // ---- The Wardrobe ----------------------------------------------------------------------------------------------------
  const TITLE = { outfit: 'Outfits', effect: 'Effects', frame: 'Portrait frames' };
  // A swatch for an item's button: the outfit's colours, the effect running, the frame's backdrop.
  function swatch(id) {
    const it = ITEMS[id];
    if (it.slot === 'outfit') return `<span class="wd-sw" style="background:linear-gradient(135deg, ${it.main || '#3a3346'} 0 62%, ${it.trim || it.main || '#e8e4dc'} 62%)"></span>`;
    if (it.slot === 'effect') return `<span class="wd-sw" style="background:#2b2340">${W.fx(id)}</span>`;
    return `<span class="wd-sw ${id}" style="background:var(--wf-bg);box-shadow:inset 0 0 0 3px var(--wf-line)"></span>`;
  }
  W.open = function () {
    css();
    const U = SD.ui, esc = s => U.esc(s);
    const lead = W.lead() || 'kai';
    const draw = () => {
      const now = save(), worn = W.worn(), outfit = of(worn, 'outfit');
      const vec = window.SD_VECTOR && SD.vec && SD.vec.fig;
      const fig = vec ? SD.vec.fig(lead, 'neutral', 'full', null, worn) : (outfit && W.recolor(standSrc(lead), standMask(lead), outfit)) || standSrc(lead);
      const slot = s => `<div class="wd-slot"><h3>${TITLE[s]}</h3><div class="wd-items">
          <button type="button" class="ghost" data-off="${s}" aria-pressed="${!now[s]}"><span class="wd-sw" style="display:grid;place-items:center;font-size:11px">—</span><span>None</span></button>
          ${Object.keys(ITEMS).filter(id => ITEMS[id].slot === s).map(id => {
            const it = ITEMS[id], own = W.owns(id), price = W.price ? W.price(id) : '';
            return `<button type="button" class="ghost" data-wear="${id}" aria-pressed="${now[s] === id}"${own ? '' : ' disabled'} title="${esc(it.holiday || it.note || '')}">${swatch(id)}<span>${esc(it.name)}</span>${own ? '' : `<small>${esc(price || 'Not yet')}</small>`}</button>`;
          }).join('')}</div></div>`;
      // Your lead's preview wears yours, whoever's lead is set (the Debug menu can open this before a lead is chosen).
      const face = W.dressBust(lead, 'smile', SD.art.portrait(lead, 120, 'smile'), worn);
      const b = U.panel(`<div class="wd">
          <div class="wd-top">${W.lead() === lead ? SD.art.portrait(lead, 120, 'smile') : face}<div class="wd-fig" id="wd-fig" style="background-image:url(${fig})">${W.heroFx()}</div></div>
          <p class="small muted">Worn by ${esc(SD.ch1story && SD.ch1story.leads[lead] ? SD.ch1story.leads[lead].name : lead)} in dialogue, in battle and in the party room. Looks only, no power.</p>
          ${SLOTS.map(slot).join('')}</div>`, { title: 'WARDROBE' });
      if (!vec && outfit && fig === standSrc(lead)) W.recolor(standSrc(lead), standMask(lead), outfit, u => { const el = b.querySelector('#wd-fig'); if (el) el.style.backgroundImage = `url(${u})`; });
      b.querySelectorAll('[data-wear]').forEach(el => { el.onclick = () => { if (W.equip(el.dataset.wear)) draw(); }; });
      b.querySelectorAll('[data-off]').forEach(el => { el.onclick = () => { W.unequip(el.dataset.off); draw(); }; });
    };
    draw();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();
})();
