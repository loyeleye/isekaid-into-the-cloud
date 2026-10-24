// Wearable cosmetics (Ladi, 2026-10-24): the Cache Café's hats and scarves, worn by your lead. No power, just looks.
// A worn item is a small PixelLab sprite (assets/img/wear, tools/wear_art.py) laid over the lead's dialogue faceset
// (assets/img/portraits) and full body (assets/img/lead: your fighter in battle and your seat in the party room), and
// a code-drawn shape on the vector figures (js/vec-cast.js asks K.wear for it).
//
//   SD.wear.slot(id)        -> 'hat', 'scarf' or null (not wearable)
//   SD.wear.equip(id)       -> wears an owned item, taking off whatever was in its slot; false if it can't
//   SD.wear.unequip(slot)   -> takes off the hat or scarf
//   SD.wear.worn()          -> [ids] worn now, hat first
//   SD.wear.owns(id)        -> owned: in the economy's E.state().cosmetics; every item while the economy isn't loaded
//   SD.wear.open()          -> the Wardrobe panel
//   SD.wear.price           -> set by the café: id -> a short price label for an item you don't own yet, in the
//                              raid currency the café sells cosmetics for (Ladi, 2026-10-24: not shards)
//
// What's worn is S.save.fg.wear = { hat, scarf }, next to economy.js's S.save.fg.econ. Buying is the café's job.
(function () {
  const W = SD.wear = {};
  const S = SD.state;
  const SLOTS = ['hat', 'scarf'];
  const LEADS = ['kai', 'mira', 'seoyeon', 'dutch'];
  const IMG = 'assets/img/wear/';

  // k: the item's width as a share of the slot's width in ANCHOR. sink: how far the hat comes down over the head, as a
  // share of its own height. dx: a nudge sideways, as a share of the slot's width.
  const ITEMS = W.ITEMS = {
    'hat-beanie': { slot: 'hat', name: 'Teal beanie', k: 0.9, sink: 0.12 },
    'hat-crown': { slot: 'hat', name: 'Little crown', k: 0.66, sink: 0.12 },
    'hat-party': { slot: 'hat', name: 'Party hat', k: 0.6, sink: 0.08 },
    'hat-wizard': { slot: 'hat', name: 'Wizard hat', k: 1.15, sink: 0.14 },
    'hat-cloud': { slot: 'hat', name: 'Cloud hat', k: 0.95, sink: 0.22 },
    'hat-golden': { slot: 'hat', name: 'Golden top hat', k: 0.82, sink: 0.12 },
    'scarf-red': { slot: 'scarf', name: 'Red scarf', k: 1 },
    'scarf-knit': { slot: 'scarf', name: 'Striped knit scarf', k: 1 },
    'scarf-cloud': { slot: 'scarf', name: 'Cloud scarf', k: 1 },
    'scarf-golden': { slot: 'scarf', name: 'Golden silk scarf', k: 1 }
  };

  // Where each slot sits, in the picture's own pixels: [x, y, width]. A hat's bottom edge sits on y (then sinks), a
  // scarf's top edge does; both are centred on x. bust: the 1x faceset (114 x 132, shown 3x). stand: the full body.
  // moods: a face whose head sits elsewhere, as [dx, dy] from the neutral one.
  const ANCHOR = W.ANCHOR = {
    bust: {
      size: [114, 132],
      kai: { hat: [61, 26, 64], scarf: [58, 66, 54] },
      mira: { hat: [50, 17, 64], scarf: [50, 68, 46] },
      seoyeon: { hat: [60, 24, 66], scarf: [62, 82, 44] },
      dutch: { hat: [60, 26, 60], scarf: [62, 88, 56] },
      moods: { dutch: { sad: [0, 1], grief: [0, 1], surprised: [0, 1], shock: [0, 1] } }
    },
    stand: {
      kai: { hat: [43, 15, 34], scarf: [42, 39, 26] },
      mira: { hat: [57, 10, 34], scarf: [56, 39, 22] },
      seoyeon: { hat: [53, 15, 36], scarf: [53, 38, 22] },
      dutch: { hat: [61, 12, 34], scarf: [62, 36, 24] }
    }
  };

  // ---- What's worn ---------------------------------------------------------------------------------------------------
  W.slot = id => (ITEMS[id] ? ITEMS[id].slot : null);
  W.owns = function (id) {
    if (!ITEMS[id]) return false;
    const E = SD.econ, st = E && E.state && E.state();
    return st ? st.cosmetics.includes(id) : true;
  };
  function save() {
    const sv = S && S.save;
    if (!sv) return { hat: null, scarf: null };
    sv.fg = sv.fg && typeof sv.fg === 'object' ? sv.fg : {};
    const w = sv.fg.wear = sv.fg.wear && typeof sv.fg.wear === 'object' ? sv.fg.wear : {};
    SLOTS.forEach(s => { if (!ITEMS[w[s]] || ITEMS[w[s]].slot !== s) w[s] = null; });
    return w;
  }
  W.worn = () => { const w = save(); return SLOTS.map(s => w[s]).filter(Boolean); };
  // Someone else's list (a party member's presence): only real items, at most one a slot, hat first.
  W.clean = function (list) {
    const out = {};
    (Array.isArray(list) ? list : []).forEach(id => { if (typeof id === 'string' && ITEMS[id] && !out[ITEMS[id].slot]) out[ITEMS[id].slot] = id; });
    return SLOTS.map(s => out[s]).filter(Boolean);
  };
  const listeners = [];
  W.onChange = fn => listeners.push(fn);
  function changed() {
    if (S.persist) S.persist();
    W.dress();
    listeners.forEach(fn => { try { fn(W.worn()); } catch (e) { /* a listener's own trouble */ } });
  }
  W.equip = function (id) {
    if (!W.owns(id)) return false;
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

  // ---- The faceset -----------------------------------------------------------------------------------------------------
  // Overlays for a dialogue bust of `who` in `mood`, placed in the .bust box (120 x 140) the faceset is contained in,
  // bottom-centred. wear: a list to show instead of yours (the Wardrobe's preview); yours only go on your lead.
  W.bust = function (who, mood, wear) {
    const A = ANCHOR.bust, at = A[who];
    if (!at) return '';
    const list = wear ? W.clean(wear) : who === W.lead() ? W.worn() : [];
    if (!list.length) return '';
    const [iw, ih] = A.size, box = 120 / 140;
    // The image fills the box's width when it's wider than the box, else its height; xs/ys turn image pixels to %.
    const fw = iw / ih >= box ? 1 : (iw / ih) / box, fh = iw / ih >= box ? box / (iw / ih) : 1;
    const x0 = (1 - fw) / 2 * 100, y0 = (1 - fh) * 100, xs = fw * 100 / iw, ys = fh * 100 / ih;
    const m = (A.moods[who] && A.moods[who][mood]) || [0, 0];
    return list.map(id => {
      const it = ITEMS[id], [x, y, w] = at[it.slot], ww = w * it.k;
      const left = x0 + (x + m[0] + (it.dx || 0) * w - ww / 2) * xs, width = ww * xs;
      const pos = it.slot === 'hat'
        ? `bottom:${(100 - y0 - (y + m[1]) * ys).toFixed(2)}%;transform:translateY(${((it.sink || 0) * 100).toFixed(0)}%)`
        : `top:${(y0 + (y + m[1]) * ys).toFixed(2)}%`;
      return `<img class="wear w-${it.slot}" src="${IMG}${id}.webp" alt="" draggable="false" style="left:${left.toFixed(2)}%;width:${width.toFixed(2)}%;${pos}">`;
    }).join('');
  };

  // ---- The full body ---------------------------------------------------------------------------------------------------
  // The lead's full-body art with the items drawn on, as an object URL: { url, w, h, top } where top is the rows added
  // above the head for a tall hat. Cached; null until it's ready (then cb runs).
  const made = {}, waiting = {};
  function load(src) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
  }
  W.stand = function (lead, src, wear, cb) {
    const list = W.clean(wear), key = [lead, src, list.join('+')].join('|');
    if (!list.length || !ANCHOR.stand[lead]) return null;
    if (made[key]) return made[key];
    if (cb) (waiting[key] = waiting[key] || []).push(cb);
    if (waiting[key] && waiting[key].busy) return null;
    (waiting[key] = waiting[key] || []).busy = true;
    Promise.all([load(src)].concat(list.map(id => load(IMG + id + '-s.webp')))).then(([base, ...ims]) => {
      const at = ANCHOR.stand[lead];
      const parts = list.map((id, i) => {
        const it = ITEMS[id], [x, y, w] = at[it.slot], ww = Math.round(w * it.k), hh = Math.round(ims[i].height * ww / ims[i].width);
        const top = it.slot === 'hat' ? Math.round(y - hh + (it.sink || 0) * hh) : y;
        return { im: ims[i], x: Math.round(x + (it.dx || 0) * w - ww / 2), y: top, w: ww, h: hh };
      });
      const pad = Math.max(0, -Math.min.apply(null, parts.map(p => p.y)));
      const cv = document.createElement('canvas');
      cv.width = base.width; cv.height = base.height + pad;
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(base, 0, pad);
      // Scarf first, so a hat brim never hides under it.
      parts.slice().reverse().forEach(p => g.drawImage(p.im, p.x, p.y + pad, p.w, p.h));
      cv.toBlob(b => {
        made[key] = { url: URL.createObjectURL(b), w: cv.width, h: cv.height, top: pad };
        const q = waiting[key] || []; delete waiting[key];
        q.forEach(fn => fn(made[key]));
      });
    }).catch(() => { delete waiting[key]; });
    return null;
  };
  // Dress a champion sprite element (js/ch1-mines.js CH.sprite, js/vec-ch2.js's vector one) of `lead` in `wear`.
  W.dressSprite = function (el, lead, wear) {
    const list = W.clean(wear);
    if (!el || !list.length) return;
    // A vector figure (an SVG data URL) gets the code-drawn items, and room on top for a hat.
    if (/data:image\/svg/.test(el.style.backgroundImage) && SD.vec && SD.vec.fig) {
      el.style.backgroundImage = `url("${SD.vec.fig(lead, 'neutral', 'full', null, list)}")`;
      const h = parseFloat(el.style.height) || 0, w = parseFloat(el.style.width) || 0;
      if (h && list.some(id => ITEMS[id].slot === 'hat')) { el.style.height = (h * 1.06).toFixed(1) + 'px'; el.style.width = (w * 1.06).toFixed(1) + 'px'; }
      return;
    }
    const src = `assets/img/lead/${lead}.webp`;
    const put = m => {
      const h = parseFloat(el.style.height) || 0;
      el.style.backgroundImage = `url(${m.url})`;
      if (h && m.top) { el.style.height = (h * m.h / (m.h - m.top)).toFixed(1) + 'px'; }
    };
    const m = W.stand(lead, src, list, put);
    if (m) put(m);
  };

  // Your fighter in battle (index.html's body[data-lead] .stage .hero draws --lead-img) and the leads' pictures.
  W.dress = function () {
    const lead = W.lead(), list = W.worn();
    const T = SD.ch1story;
    if (window.SD_VECTOR && SD.vec && SD.vec.fig) {
      // vec-cast's K.wear puts yours on your lead; the memo key changes with them, so ask again.
      if (T) T.order.forEach(id => { T.leads[id].img = SD.vec.fig(id, 'neutral', 'full'); });
      if (lead && document.body.dataset.lead === lead) document.body.style.setProperty('--lead-img', `url(${SD.vec.fig(lead, 'neutral', 'full')})`);
      return;
    }
    if (!lead || document.body.dataset.lead !== lead) return;
    const src = `assets/img/lead/${lead}.webp`;
    if (!list.length) { document.body.style.setProperty('--lead-img', `url(${src})`); return; }
    const put = m => { if (W.lead() === lead) document.body.style.setProperty('--lead-img', `url(${m.url})`); };
    const m = W.stand(lead, src, list, put);
    if (m) put(m);
  };

  // ---- The vector figures (js/vec-cast.js) -----------------------------------------------------------------------------
  // Each item's shape in the figure's 400 x 1000 box: hats in the head's own frame (scaled 1.2 about 200,252), brim
  // near y 104, from about x 124 to 276; scarves on the neck (y 240 to 300) and chest. dy per lead: hair that sits
  // higher or lower.
  const VEC_DY = { kai: 14, mira: 10, seoyeon: 18, dutch: 22 };
  const VEC = {
    'hat-beanie': (p, c, e) => p('M126 112 C120 14 280 14 274 112Z', '#1f8a8a', '#2b2340', 3) + p('M150 60 Q200 44 252 62', null, '#46b3ad', 4, 0.7)
      + p('M118 98 L282 98 L284 126 L116 126Z', '#176b6b', '#2b2340', 3) + [0, 1, 2, 3, 4, 5, 6, 7].map(i => p(`M${132 + i * 20} 102 L${132 + i * 20} 122`, null, '#0f4f4f', 2.5)).join('')
      + c(200, 24, 18, '#efe2c4', '#2b2340', 3),
    'hat-crown': (p, c) => p('M144 108 L140 54 L170 80 L200 40 L230 80 L260 54 L256 108Z', '#f2c230', '#2b2340', 3) + p('M144 108 L256 108 L256 92 L144 92Z', '#d9a21e', '#2b2340', 2.5)
      + c(200, 98, 6, '#d23a4a', '#2b2340', 2) + c(170, 98, 5, '#3b7bff', '#2b2340', 2) + c(230, 98, 5, '#3b7bff', '#2b2340', 2) + c(200, 40, 5, '#fff6c8', '#2b2340', 2),
    'hat-party': (p, c) => p('M158 108 L214 6 L246 108Z', '#ff86b8', '#2b2340', 3) + p('M176 76 L232 64 M188 46 L224 38', null, '#ffe14d', 9)
      + p('M158 108 L214 6 L246 108Z', 'none', '#2b2340', 3) + c(214, 6, 14, '#ffe14d', '#2b2340', 3),
    'hat-wizard': (p, c) => p('M110 112 Q200 84 290 112 Q200 132 110 112Z', '#5b3a9a', '#2b2340', 3) + p('M150 104 C160 60 176 20 210 -6 C226 -16 250 -10 262 4 C240 0 226 14 222 40 L248 104Z', '#6d48b5', '#2b2340', 3)
      + p('M176 70 l4 -10 l4 10 l10 2 l-8 6 l2 10 l-8 -6 l-8 6 l2 -10 l-8 -6Z M222 44 l3 -7 l3 7 l7 1 l-5 4 l1 7 l-6 -4 l-6 4 l1 -7 l-5 -4Z', '#ffd257', '#2b2340', 1.5),
    'hat-cloud': (p, c) => c(150, 96, 30, '#ffffff', '#2b2340', 3) + c(250, 96, 30, '#ffffff', '#2b2340', 3) + c(200, 70, 40, '#ffffff', '#2b2340', 3) + c(172, 82, 28, '#ffffff', '#2b2340', 3) + c(230, 82, 28, '#ffffff', '#2b2340', 3)
      + p('M124 110 Q200 126 276 110 L276 100 L124 100Z', '#ffffff', null) + p('M128 112 Q200 128 272 112', null, '#9cc8ee', 5, 0.8),
    'hat-golden': (p, c) => p('M112 112 Q200 92 288 112 Q200 130 112 112Z', '#d9a21e', '#2b2340', 3) + p('M146 106 L152 24 Q200 14 248 24 L254 106 Q200 116 146 106Z', '#f2c230', '#2b2340', 3)
      + p('M150 84 Q200 94 250 84 L252 100 Q200 110 148 100Z', '#2b2340', '#2b2340', 2) + p('M170 34 L172 76', null, '#fff6c8', 6, 0.7),
    'scarf-red': (p) => p('M160 262 Q200 292 240 262 L250 304 Q200 336 150 304Z', '#c8323c', '#2b2340', 3) + p('M206 300 L234 296 L244 432 L214 436Z', '#c8323c', '#2b2340', 3)
      + p('M216 436 L216 450 M226 434 L226 448 M236 432 L236 446', null, '#c8323c', 4),
    'scarf-knit': (p) => p('M158 262 Q200 294 242 262 L252 306 Q200 340 148 306Z', '#efe2c4', '#2b2340', 3) + p('M156 280 Q200 310 244 280 M152 296 Q200 326 248 296', null, '#2f6b45', 7)
      + p('M204 302 L236 298 L240 450 L208 452Z', '#efe2c4', '#2b2340', 3) + p('M206 340 L238 338 M207 380 L239 378 M208 420 L240 418', null, '#2f6b45', 9),
    'scarf-cloud': (p, c) => p('M160 262 Q200 292 240 262 L250 304 Q200 336 150 304Z', '#8fc8f2', '#2b2340', 3) + p('M206 300 L234 296 L242 436 L212 438Z', '#8fc8f2', '#2b2340', 3)
      + c(178, 300, 7, '#ffffff') + c(186, 296, 6, '#ffffff') + c(222, 360, 7, '#ffffff') + c(230, 356, 6, '#ffffff') + c(220, 410, 6, '#ffffff'),
    'scarf-golden': (p) => p('M160 262 Q200 292 240 262 L250 304 Q200 336 150 304Z', '#f2c230', '#2b2340', 3) + p('M206 300 L234 296 L246 430 L214 434Z', '#e8b322', '#2b2340', 3)
      + p('M172 290 Q200 306 228 290', null, '#fff6c8', 4, 0.8) + p('M216 434 L214 452 M224 433 L223 451 M232 432 L232 450 M240 431 L241 449', null, '#d9a21e', 3)
  };
  // For vec-cast: { hat, scarf } markup for `id`, from `wear` if given (null for none), else yours on your lead.
  W.vec = function (id, wear) {
    const list = wear ? W.clean(wear) : id === W.lead() ? W.worn() : [];
    if (!list.length || !LEADS.includes(id)) return null;
    const K = SD.vec, out = { key: list.join('+'), hat: '', scarf: '' };
    list.forEach(w => {
      const s = VEC[w](K.p, K.c, K.e);
      out[ITEMS[w].slot] = ITEMS[w].slot === 'hat' ? `<g transform="translate(0 ${VEC_DY[id] || 0})">${s}</g>` : s;
    });
    return out;
  };

  // ---- The Wardrobe ----------------------------------------------------------------------------------------------------
  function css() {
    if (document.getElementById('wear-css')) return;
    const st = document.createElement('style');
    st.id = 'wear-css';
    st.textContent = `
.bust img.wear { position: absolute; width: auto; height: auto; object-fit: fill; image-rendering: pixelated; pointer-events: none; }
.wd { display: grid; gap: 12px; }
.wd-top { display: flex; gap: 14px; align-items: flex-end; justify-content: center; flex-wrap: wrap; }
.wd-fig { width: 84px; height: 150px; background: center bottom / contain no-repeat; image-rendering: pixelated; }
.wd-slot h3 { margin: 0 0 6px; font-size: 15px; }
.wd-items { display: flex; gap: 6px; flex-wrap: wrap; }
.wd-items button { display: grid; justify-items: center; gap: 2px; min-width: 76px; padding: 6px; font-size: 12px; }
.wd-items button img { width: 44px; height: 32px; object-fit: contain; image-rendering: pixelated; }
.wd-items button[aria-pressed="true"] { outline: 3px solid var(--mi-blue, #2a62c9); }
.wd-items button:disabled { opacity: .5; }
`;
    document.head.appendChild(st);
  }
  W.css = css;
  W.open = function () {
    css();
    const U = SD.ui, esc = s => U.esc(s);
    const lead = W.lead() || 'kai';
    const draw = () => {
      const now = save();
      const fig = window.SD_VECTOR && SD.vec && SD.vec.fig ? SD.vec.fig(lead, 'neutral', 'full', null, W.worn()) : `assets/img/lead/${lead}.webp`;
      const slot = s => `<div class="wd-slot"><h3>${s === 'hat' ? 'Hats' : 'Scarves'}</h3><div class="wd-items">
          <button type="button" class="ghost" data-off="${s}" aria-pressed="${!now[s]}"><span style="height:32px;display:grid;place-items:center">None</span></button>
          ${Object.keys(ITEMS).filter(id => ITEMS[id].slot === s).map(id => {
            const own = W.owns(id), price = W.price ? W.price(id) : '';
            return `<button type="button" class="ghost" data-wear="${id}" aria-pressed="${now[s] === id}"${own ? '' : ' disabled'}><img src="${IMG}${id}.webp" alt=""><span>${esc(ITEMS[id].name)}</span>${own ? '' : `<small>${esc(price || 'At the Cache Café')}</small>`}</button>`;
          }).join('')}</div></div>`;
      const b = U.panel(`<div class="wd">
          <div class="wd-top">${SD.art.portrait(lead, 120, 'smile')}<div class="wd-fig" id="wd-fig" style="background-image:url(${fig})"></div></div>
          <p class="small muted">Worn by ${esc(SD.ch1story && SD.ch1story.leads[lead] ? SD.ch1story.leads[lead].name : lead)} in dialogue, in battle and in the party room. Looks only, no power.</p>
          ${slot('hat')}${slot('scarf')}</div>`, { title: 'WARDROBE' });
      if (!window.SD_VECTOR) {
        const el = b.querySelector('#wd-fig');
        const m = W.stand(lead, `assets/img/lead/${lead}.webp`, W.worn(), r => { el.style.backgroundImage = `url(${r.url})`; });
        if (m) el.style.backgroundImage = `url(${m.url})`;
      }
      b.querySelectorAll('[data-wear]').forEach(el => { el.onclick = () => { if (W.equip(el.dataset.wear)) draw(); }; });
      b.querySelectorAll('[data-off]').forEach(el => { el.onclick = () => { W.unequip(el.dataset.off); draw(); }; });
    };
    draw();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', css); else css();
})();
