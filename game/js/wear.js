// Cosmetics (Ladi, 2026-10-24): outfit recolours, effects that follow your lead around, portrait frames, and looks
// (reskins of the full body). Looks only, no power. Nothing is laid on the art: a recolour repaints the lead's own clothing (the masks in
// assets/img/wear/mask, tools/outfit_masks.py) on the dialogue faceset and the full body, and recolours the vector
// figure's clothes (js/vec-cast.js asks for them); effects and frames are drawn in code around the picture. A look
// swaps the full body only, never the dialogue portrait (Ladi, 2026-10-24): PixelLab's standing sprites in
// assets/img/wear/look (tools/look_art.py) for the painted game, and clothes drawn here for the vector figures (LOOKS).
// While a look is on, it is the body's clothes and the outfit recolours only the portrait.
//
//   SD.wear.slot(id)        -> 'outfit', 'effect', 'frame', 'look' or null (not a cosmetic)
//   SD.wear.equip(id)       -> wears an owned item, replacing whatever was in its slot; false if it can't
//   SD.wear.unequip(slot)   -> takes off that slot's item
//   SD.wear.worn()          -> [ids] worn now, in slot order
//   SD.wear.owns(id)        -> every item while no shop is loaded; the shop (js/marks.js) replaces it
//   SD.wear.trophy(id)      -> true for a trophy you've earned (ITEMS[id].trophy: Restored, for beating Freya), shop or not
//   SD.wear.price           -> set by the shop: id -> a short price label for an item you don't own yet
//   SD.wear.open()          -> the Wardrobe panel
//
// What's worn is S.save.fg.wear = { outfit, effect, frame, look }. Buying is the shop's job; ITEMS' tiers are a guide for it.
(function () {
  const W = SD.wear = {};
  const S = SD.state;
  const SLOTS = W.SLOTS = ['outfit', 'effect', 'frame', 'look'];
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
    'frame-starlit': { slot: 'frame', name: 'Starlit', tier: 'common' },
    // Looks (Ladi, 2026-10-24): seasonal, cloud and story reskins. Restored is the angel-like one, and because wings and a
    // halo are Freya's, it's earned by beating her (chapter 7), never sold.
    'look-zombie': { slot: 'look', name: 'Zombie Process', tier: 'mythic', holiday: 'Halloween', note: 'The process that won\'t die' },
    'look-santa': { slot: 'look', name: 'Winterfest Santa', tier: 'mythic', holiday: 'Winter holidays' },
    'look-lantern': { slot: 'look', name: 'Lantern-bearer', tier: 'mythic', holiday: 'Lunar New Year' },
    'look-blossom': { slot: 'look', name: 'Spring Blossom', tier: 'mythic', holiday: 'Spring' },
    'look-glacier': { slot: 'look', name: 'Glacier', tier: 'mythic', note: 'Deep Archive chic' },
    'look-spot': { slot: 'look', name: 'Spot Instance', tier: 'mythic', note: 'Might be reclaimed at any moment' },
    'look-lambda': { slot: 'look', name: 'Lambda', tier: 'mythic', note: 'Here for fifteen minutes at most' },
    'look-veteran': { slot: 'look', name: 'us-east-1 Veteran', tier: 'mythic', note: 'Survived every outage' },
    'look-guild': { slot: 'look', name: 'Guild armour', tier: 'mythic' },
    'look-acolyte': { slot: 'look', name: 'Temple acolyte', tier: 'mythic' },
    'look-tavern': { slot: 'look', name: 'Tavern keeper', tier: 'mythic' },
    'look-restored': { slot: 'look', name: 'Restored', tier: 'trophy', trophy: true, note: 'Beat Freya to earn it' }
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
  // Trophies are earned in the story: Restored once chapter 7 (Freya's finale) is done.
  W.trophy = id => !!(ITEMS[id] && ITEMS[id].trophy && S && S.save && S.save.c7 && S.save.c7.f && S.save.c7.f.done);
  const has = id => W.owns(id) || W.trophy(id);
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
    if (!ITEMS[id] || !has(id)) return false;
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
  const lookSrc = W.lookSrc = (who, look) => `assets/img/wear/look/${look}-${who}.webp`;
  // The look your lead wears, for a lead's pixel full body anywhere else (js/vn.js's cutscenes); null on anyone else.
  W.look = who => (who && who === W.lead() ? of(W.worn(), 'look') : null) || null;
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
    const outfit = of(list, 'outfit'), effect = of(list, 'effect'), frame = of(list, 'frame'), look = of(list, 'look');
    if ((outfit || look) && LEADS.includes(lead)) {
      if (/data:image\/svg/.test(el.style.backgroundImage) && SD.vec && SD.vec.fig) el.style.backgroundImage = `url("${SD.vec.fig(lead, 'neutral', 'full', null, list)}")`;
      else if (look) {
        // A look can be wider than the lead (Restored's wings): the sprite widens to keep its shape.
        const src = lookSrc(lead, look), im = new Image();
        el.style.backgroundImage = `url(${src})`;
        im.onload = () => { const h = parseFloat(el.style.height); if (h && im.width && im.height) el.style.width = (h * im.width / im.height).toFixed(1) + 'px'; };
        im.src = src;
      }
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
    const lead = W.lead(), outfit = of(W.worn(), 'outfit'), look = of(W.worn(), 'look');
    const T = SD.ch1story;
    if (lead) W.prepare(lead, outfit);
    if (window.SD_VECTOR && SD.vec && SD.vec.fig) {
      // K.fig dresses your lead in yours; the memo key changes with them, so ask again.
      if (T) T.order.forEach(id => { T.leads[id].img = SD.vec.fig(id, 'neutral', 'full'); });
      if (lead && document.body.dataset.lead === lead) document.body.style.setProperty('--lead-img', `url(${SD.vec.fig(lead, 'neutral', 'full')})`);
      return;
    }
    if (!lead || document.body.dataset.lead !== lead) return;
    if (look) { document.body.style.setProperty('--lead-img', `url(${lookSrc(lead, look)})`); return; }
    if (!outfit) { document.body.style.setProperty('--lead-img', `url(${standSrc(lead)})`); return; }
    const put = u => { if (W.lead() === lead) document.body.style.setProperty('--lead-img', `url(${u})`); };
    const u = W.recolor(standSrc(lead), standMask(lead), outfit, put);
    if (u) put(u);
  };

  // ---- The vector figures (js/vec-cast.js) -----------------------------------------------------------------------------
  // For K.fig: { key, L } where L overrides the figure's clothing colours, from `wear` if given ([] for none), else
  // yours on your lead; null when nothing changes. A look dresses the full figure (view 'full') only.
  W.vec = function (id, wear, view) {
    const list = mine(id, wear), look = view === 'full' ? of(list, 'look') : null;
    if (look && VEC[id] && LOOKS[look]) return { key: look, L: LOOKS[look](K(), id, CAST()[id]) };
    const outfit = of(list, 'outfit'), v = VEC[id];
    if (!outfit || !v) return null;
    const it = ITEMS[outfit], L = {};
    const dark = h => { const [a, b, c] = hsl.apply(null, hex(h)); return '#' + rgb(a, b, c * 0.7).map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); };
    ['main', 'trim'].forEach(k => { if (it[k] && v[k]) v[k].forEach(p => { L[p] = /D$/.test(p) ? dark(it[k]) : it[k]; }); });
    return { key: outfit, L };
  };

  // ---- Looks for the vector figures ----------------------------------------------------------------------------------
  // Each is (kit, lead id, the lead's own figure) -> what to change on the figure (js/vec-cast.js figure(): colours,
  // and layers drawn behind it, over the body or on the head). The lead's own extras (Kai's towel, Dutch's keys,
  // Seo-yeon's sword) stay on top of the new clothes, so they're still themselves. Head layers sit in the head's box:
  // the face spans about x 142 to 258, the top of the hair is near y 78.
  const K = () => SD.vec, CAST = () => SD.vec.cast;
  const INK = '#2b2340';
  const plus = (base, more) => (L, F) => (base ? base(L, F) : '') + more(L, F);
  const hat = (k, id, d) => (id === 'mira' ? {} : { top: d });
  const LOOKS = {
    'look-zombie': (k, id, B) => ({ skin: '#93ab86', skinD: '#7a9170', skinD2: '#5f7456', eye: '#c9d86a', coatD: B.coatD,
      over: plus(B.over, () => k.p('M130 420 l22 6 l-6 18 l-20 -6Z M250 560 l26 -4 l2 22 l-24 4Z', '#5a5048', INK, 2)
        + k.p('M134 428 l14 4 M138 436 l10 3 M254 566 l18 -3 M256 574 l16 -2', null, '#e8dcc4', 1.6)
        + k.p('M112 760 l14 22 l10 -18 l12 20 l10 -20 l12 22 l12 -24', null, INK, 2.5) + k.p('M252 300 l-10 40 l10 14', null, INK, 2)),
      top: L => k.p('M168 150 l16 4 M174 144 l2 14 M180 146 l2 14', null, INK, 1.8) }),
    'look-santa': (k, id, B) => Object.assign({ coat: '#c0202c', coatD: '#8a1520', sleeve: '#c0202c', cuffs: '#f6f4ee', legs: id === 'mira' ? B.legs : '#c0202c', boots: '#1a1418',
      robeCol: '#c0202c', robeD: '#8a1520', hood: '#c0202c', hoodD: '#8a1520', band: '#f6f4ee', under: '#f6f4ee', collarCol: '#f6f4ee',
      over: plus(B.over, () => k.r(112, 552, 176, 26, '#1a1418', INK, 2.5) + k.r(186, 548, 30, 34, '#e8b83a', INK, 2.5, null, 4) + k.p('M196 300 L194 780 L206 780 L204 300Z', '#f6f4ee', INK, 2) + k.r(104, 760, 192, 22, '#f6f4ee', INK, 2.5, null, 10)) },
      hat(k, id, L => k.p('M138 112 C150 60 210 38 262 58 C292 70 304 96 300 124 C276 94 248 86 230 96 C200 92 160 100 138 112Z', '#c0202c', INK, 3)
        + k.r(130, 98, 140, 26, '#f6f4ee', INK, 3, null, 13) + k.c(302, 130, 14, '#f6f4ee', INK, 2.5))),
    'look-lantern': (k, id, B) => ({ coat: '#c01c2a', coatD: '#8a1220', sleeve: '#c01c2a', cuffs: '#e9b53a', under: '#e9b53a', collarCol: '#e9b53a', legs: '#2a1a1a', robeCol: '#c01c2a', robeD: '#8a1220', hood: '#8a1220', hoodD: '#5a0c16', band: '#e9b53a',
      over: plus(B.over, () => k.p('M150 360 Q200 400 250 360 M150 470 Q200 510 250 470', null, '#e9b53a', 4) + k.c(200, 430, 16, 'none', '#e9b53a', 3)
        + k.p('M304 672 L304 700', null, INK, 2.5) + k.r(288, 698, 32, 8, '#e9b53a', INK, 2, null, 2) + k.e(304, 732, 24, 28, '#e0402a', INK, 2.5) + k.p('M304 706 L304 758 M292 710 Q286 732 292 754 M316 710 Q322 732 316 754', null, '#ffd25a', 1.6) + k.e(304, 732, 32, 36, '#ffb45a', null, null, 0.25) + k.p('M304 760 L304 780', null, '#e9b53a', 2.5)) }),
    'look-blossom': (k, id, B) => ({ coat: '#8ccbbd', coatD: '#5fa294', sleeve: '#8ccbbd', under: '#f4b9cc', collarCol: '#f4b9cc', legs: '#5fa294', robeCol: '#8ccbbd', robeD: '#5fa294', hood: '#8ccbbd', hoodD: '#5fa294', band: '#f4b9cc',
      over: plus(B.over, () => [[132, 330], [268, 330], [150, 600], [252, 640]].map(([x, y]) => [0, 72, 144, 216, 288].map(a => k.e(x, y - 9, 6, 9, '#ffb3cf', INK, 1.5).replace('/>', ` transform="rotate(${a} ${x} ${y})"/>`)).join('') + k.c(x, y, 4, '#ffd25a', INK, 1.5)).join('')),
      top: () => [146, 170, 200, 230, 254].map((x, i) => k.c(x, i === 2 ? 94 : i % 2 ? 98 : 108, 9, i % 2 ? '#ffffff' : '#ffb3cf', INK, 2) + k.c(x, i === 2 ? 94 : i % 2 ? 98 : 108, 3, '#ffd25a')).join('') }),
    'look-glacier': (k, id, B) => ({ coat: '#bfe3f5', coatD: '#86bcd8', sleeve: '#cdeafa', cuffs: '#eef9ff', under: '#eef9ff', collarCol: '#eef9ff', legs: '#9cc8e0', boots: '#5f92b4', robeCol: '#bfe3f5', robeD: '#86bcd8', hood: '#9cc8e0', hoodD: '#6a9ec0', band: '#eef9ff',
      over: plus(B.over, () => k.p('M118 318 L132 270 L146 320Z M254 320 L268 266 L282 318Z M130 330 L112 300 L122 340Z', '#eef9ff', '#5f92b4', 2.5)
        + k.p('M150 400 L180 470 L160 520 M250 420 L226 500', null, '#ffffff', 3, 0.8) + k.p('M130 760 l12 -30 l12 30 M240 760 l14 -36 l14 36', '#eef9ff', '#5f92b4', 2)) }),
    'look-spot': (k, id, B) => ({ coat: '#8a8f99', coatD: '#62666e', sleeve: '#8a8f99', legs: '#6a6e76', boots: '#2e3038', under: '#b8bcc4', collarCol: '#b8bcc4', robeCol: '#8a8f99', robeD: '#62666e', hood: '#8a8f99', hoodD: '#62666e', band: '#3ee0e8',
      over: plus(B.over, () => [[120, 400, 60], [236, 452, 50], [108, 520, 40], [212, 610, 70], [140, 690, 46]].map(([x, y, w]) => k.r(x, y, w, 8, '#3ee0e8', null, null, 0.85) + k.r(x + w * 0.3, y + 12, w * 0.4, 4, '#ff5ad8', null, null, 0.7)).join('')
        + k.r(86, 600, 22, 10, '#3ee0e8', null, null, 0.8) + k.r(290, 520, 18, 8, '#3ee0e8', null, null, 0.8)) }),
    'look-lambda': (k, id, B) => ({ coat: '#f4f1ea', coatD: '#d8cfbe', sleeve: '#f4f1ea', cuffs: '#f08a24', under: '#f08a24', collarCol: '#f08a24', robe: true, robeCol: '#f4f1ea', robeD: '#d8cfbe', hood: '#f4f1ea', hoodD: '#d8cfbe', band: '#f08a24', boots: '#d8cfbe',
      over: plus(B.over, () => k.p('M120 330 L280 560 L266 578 L108 350Z', '#f08a24', INK, 2.5) + k.p('M176 420 L200 420 L232 500 M206 446 L180 500', null, '#f08a24', 7)) }),
    'look-veteran': (k, id, B) => ({ coat: '#7a8090', coatD: '#555a66', sleeve: '#6a6f7c', cuffs: '#8a6a3a', under: '#8a6a3a', collarCol: '#8a6a3a', legs: '#5a4a3a', boots: '#3a2a1a', robeCol: '#7a8090', robeD: '#555a66', hood: '#5a5f6c', hoodD: '#3e424c', band: '#d8742a',
      over: plus(B.over, () => k.p('M118 330 L282 590 L266 610 L104 352Z', '#d8742a', INK, 2.5) + k.p('M128 360 l18 0 l0 20 l-18 0Z M236 470 l22 4 l-2 20 l-22 -4Z', '#a8875a', INK, 2)
        + [[150, 330], [250, 330], [140, 470], [260, 470], [150, 700], [250, 700]].map(([x, y]) => k.c(x, y, 3.5, '#c8ccd4', INK, 1.4)).join('') + k.p('M170 520 l40 30 M180 516 l-6 10 M196 528 l-6 10', null, '#3a3e48', 2.5)) }),
    'look-guild': (k, id, B) => ({ coat: '#9aa2b0', coatD: '#6e7686', sleeve: '#9aa2b0', cuffs: '#5a4030', under: '#2a5aa8', collarCol: '#2a5aa8', legs: '#5a4030', boots: '#3a2414', robeCol: '#2a5aa8', robeD: '#1c3e78', hood: '#2a5aa8', hoodD: '#1c3e78', band: '#e2b23a',
      over: plus(B.over, () => k.p('M150 330 L250 330 L258 760 L142 760Z', '#2a5aa8', INK, 3) + k.p('M224 330 L234 760 L258 760 L250 330Z', '#1c3e78', null, null, 0.8)
        + k.p('M200 400 L226 412 L222 450 Q214 472 200 480 Q186 472 178 450 L174 412Z', '#e2b23a', INK, 2.5) + k.p('M200 418 L200 462 M186 436 L214 436', null, '#8a6a1a', 3) + k.r(140, 560, 120, 14, '#5a4030', INK, 2)) }),
    'look-acolyte': (k, id, B) => ({ coat: '#f4efe2', coatD: '#d8ccb0', sleeve: '#f4efe2', cuffs: '#d8b85a', under: '#d8b85a', collarCol: '#d8b85a', robe: true, robeCol: '#f4efe2', robeD: '#d8ccb0', boots: '#c8b890', hood: '#f4efe2', hoodD: '#d8ccb0', band: '#7ec0ee',
      over: plus(B.over, () => k.p('M160 300 L150 780 L178 780 L184 304Z M240 300 L250 780 L222 780 L216 304Z', '#7ec0ee', INK, 2.5) + k.p('M150 740 L178 740 M222 740 L250 740', null, '#d8b85a', 4) + k.r(120, 560, 160, 12, '#d8b85a', INK, 2)) }),
    'look-tavern': (k, id, B) => ({ coat: '#efe6d0', coatD: '#cfc2a4', sleeve: '#efe6d0', under: '#efe6d0', collarCol: '#e4d8bc', legs: '#5a4030', boots: '#3a2414', robeCol: '#5a4030', robeD: '#3e2c20', hood: '#7a5a3a', hoodD: '#5a4030', band: '#efe6d0',
      over: plus(B.over, () => k.p('M140 420 Q200 400 260 420 L270 780 L130 780Z', '#8a5a34', INK, 3) + k.p('M140 420 L150 300 M260 420 L250 300', null, '#6a4226', 5) + k.r(176, 470, 48, 40, '#7a4e2c', INK, 2, null, 4)
        + k.p('M86 560 C84 590 84 620 88 646 L112 648 C112 616 114 588 118 564Z', id === 'mira' ? B.wolfCol : B.skin, INK, 2.5).repeat(id === 'mira' ? 0 : 1) + k.p(`M${400 - 86} 560 C${400 - 84} 590 ${400 - 84} 620 ${400 - 88} 646 L${400 - 112} 648 C${400 - 112} 616 ${400 - 114} 588 ${400 - 118} 564Z`, B.skin, INK, 2.5)
        + k.p('M240 300 L290 330 L284 400 L260 392 L266 340Z', '#f6f4ee', INK, 2)) }),
    'look-restored': (k, id, B) => ({ coat: '#cfe2ff', coatD: '#9fb8e0', sleeve: '#d8e8ff', cuffs: '#ffffff', under: '#ffffff', collarCol: '#ffffff', legs: '#b8ccf0', boots: '#8aa4d4', robeCol: '#cfe2ff', robeD: '#9fb8e0', hood: '#b8ccf0', hoodD: '#8aa4d4', band: '#ffffff', halo: true,
      // Wings of light: four feathered layers a side, longest at the back.
      behind: plus(B.behind, () => [-1, 1].map(sg => [3, 2, 1, 0].map(i => k.p(`M200 380 C${200 + sg * (90 + i * 30)} ${250 - i * 30} ${200 + sg * (170 + i * 18)} ${180 + i * 10} ${200 + sg * (186 + i * 4)} ${240 + i * 70} C${200 + sg * (170 + i * 6)} ${330 + i * 70} ${200 + sg * (130 + i * 10)} ${420 + i * 60} ${200 + sg * 60} ${470 + i * 40}Z`,
        ['#ffffff', '#eef5ff', '#dcebff', '#c6dcfb'][i], '#7f9ccc', 2.5, 0.95)).join('')).join('')),
      post: () => k.e(200, 500, 190, 470, '#cfe2ff', null, null, 0.12) })
  };

  // ---- Looks on the story map ----------------------------------------------------------------------------------------
  // The chibi walker you play in the story (js/ch1-art.js person(), drawn in code at the map's size): the look's
  // colours and its one telling detail, so it reads at a few dozen pixels. Only your own lead wears it.
  const MAP = {
    'look-zombie': { skin: '#93ab86', eye: '#c9d86a', stitch: true },
    'look-santa': { coat: '#c0202c', coatD: '#8a1520', under: '#f6f4ee', legs: '#c0202c', boots: '#1a1418', hood: '#c0202c', band: '#f6f4ee', hat: 'santa' },
    'look-lantern': { coat: '#c01c2a', coatD: '#8a1220', under: '#e9b53a', legs: '#2a1a1a', hood: '#8a1220', band: '#e9b53a', lantern: true },
    'look-blossom': { coat: '#8ccbbd', coatD: '#5fa294', under: '#f4b9cc', legs: '#5fa294', hood: '#8ccbbd', band: '#f4b9cc', hat: 'flowers' },
    'look-glacier': { coat: '#bfe3f5', coatD: '#86bcd8', under: '#eef9ff', legs: '#9cc8e0', boots: '#5f92b4', hood: '#9cc8e0', band: '#eef9ff', hat: 'frost' },
    'look-spot': { coat: '#8a8f99', coatD: '#62666e', under: '#b8bcc4', legs: '#6a6e76', boots: '#2e3038', hood: '#8a8f99', band: '#3ee0e8', stripes: '#3ee0e8' },
    'look-lambda': { coat: '#f4f1ea', coatD: '#d8cfbe', under: '#f08a24', legs: '#d8cfbe', boots: '#d8cfbe', hood: '#f4f1ea', band: '#f08a24', sash: '#f08a24' },
    'look-veteran': { coat: '#7a8090', coatD: '#555a66', under: '#8a6a3a', legs: '#5a4a3a', boots: '#3a2a1a', hood: '#5a5f6c', band: '#d8742a', sash: '#d8742a' },
    'look-guild': { coat: '#9aa2b0', coatD: '#6e7686', under: '#2a5aa8', legs: '#5a4030', boots: '#3a2414', hood: '#2a5aa8', band: '#e2b23a', tabard: '#2a5aa8', crest: '#e2b23a' },
    'look-acolyte': { coat: '#f4efe2', coatD: '#d8ccb0', under: '#7ec0ee', legs: '#d8ccb0', boots: '#c8b890', hood: '#f4efe2', band: '#7ec0ee', tabard: '#7ec0ee', crest: '#d8b85a' },
    'look-tavern': { coat: '#efe6d0', coatD: '#cfc2a4', under: '#efe6d0', legs: '#5a4030', boots: '#3a2414', hood: '#7a5a3a', band: '#efe6d0', bib: '#8a5a34' },
    'look-restored': { coat: '#cfe2ff', coatD: '#9fb8e0', under: '#ffffff', legs: '#b8ccf0', boots: '#8aa4d4', hood: '#b8ccf0', band: '#ffffff', ring: true, wings: true }
  };
  W.mapLook = function (id) {
    if (!LEADS.includes(id) || id !== W.lead()) return null;
    const look = of(W.worn(), 'look');
    return look ? MAP[look] || null : null;
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
.wd-sw.wd-look { width: 40px; height: 64px; background: #e8f0f8 center bottom / contain no-repeat; image-rendering: pixelated; }
.wd-items button[aria-pressed="true"] { outline: 3px solid var(--mi-blue, #2a62c9); }
.wd-items button:disabled { opacity: .55; }
`;
    document.head.appendChild(st);
  }

  // ---- The Wardrobe ----------------------------------------------------------------------------------------------------
  const TITLE = { outfit: 'Outfits', effect: 'Effects', frame: 'Portrait frames', look: 'Looks' };
  // A swatch for an item's button: the outfit's colours, the effect running, the frame's backdrop.
  function swatch(id, lead) {
    const it = ITEMS[id];
    if (it.slot === 'look') return `<span class="wd-sw wd-look" style="background-image:url(${window.SD_VECTOR && SD.vec && SD.vec.fig ? SD.vec.fig(lead, 'neutral', 'full', null, [id]) : lookSrc(lead, id)})"></span>`;
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
      const look = of(worn, 'look');
      const fig = vec ? SD.vec.fig(lead, 'neutral', 'full', null, worn) : look ? lookSrc(lead, look) : (outfit && W.recolor(standSrc(lead), standMask(lead), outfit)) || standSrc(lead);
      const slot = s => `<div class="wd-slot"><h3>${TITLE[s]}</h3><div class="wd-items">
          <button type="button" class="ghost" data-off="${s}" aria-pressed="${!now[s]}"><span class="wd-sw" style="display:grid;place-items:center;font-size:11px">—</span><span>None</span></button>
          ${Object.keys(ITEMS).filter(id => ITEMS[id].slot === s).map(id => {
            const it = ITEMS[id], own = has(id), price = it.trophy ? it.note : W.price ? W.price(id) : '';
            return `<button type="button" class="ghost" data-wear="${id}" aria-pressed="${now[s] === id}"${own ? '' : ' disabled'} title="${esc(it.holiday || it.note || '')}">${swatch(id, lead)}<span>${esc(it.name)}</span>${own ? '' : `<small>${esc(price || 'Not yet')}</small>`}</button>`;
          }).join('')}</div></div>`;
      // Your lead's preview wears yours, whoever's lead is set (the Debug menu can open this before a lead is chosen).
      const face = W.dressBust(lead, 'smile', SD.art.portrait(lead, 120, 'smile'), worn);
      const b = U.panel(`<div class="wd">
          <div class="wd-top">${W.lead() === lead ? SD.art.portrait(lead, 120, 'smile') : face}<div class="wd-fig" id="wd-fig" style="background-image:url(${fig})">${W.heroFx()}</div></div>
          <p class="small muted">Worn by ${esc(SD.ch1story && SD.ch1story.leads[lead] ? SD.ch1story.leads[lead].name : lead)} in dialogue, in battle and in the party room. Looks only, no power.</p>
          ${SLOTS.map(slot).join('')}</div>`, { title: 'WARDROBE' });
      if (!vec && outfit && !look && fig === standSrc(lead)) W.recolor(standSrc(lead), standMask(lead), outfit, u => { const el = b.querySelector('#wd-fig'); if (el) el.style.backgroundImage = `url(${u})`; });
      b.querySelectorAll('[data-wear]').forEach(el => { el.onclick = () => { if (W.equip(el.dataset.wear)) draw(); }; });
      b.querySelectorAll('[data-off]').forEach(el => { el.onclick = () => { W.unequip(el.dataset.off); draw(); }; });
    };
    draw();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();
})();
