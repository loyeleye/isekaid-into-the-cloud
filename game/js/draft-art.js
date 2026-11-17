// Architect's Draft (js/draft.js): Pingsby's Quarter's buildings, drawn in code in chapter 1's overworld style
// (js/ch1-art.js), so no PixelLab generations are spent on them. One building per contract: its storeys stack as it
// earns floors, its roof and sign are its client's, and a blueprint with a wrong slot stands under scaffolding until
// its Wall poster comes down. Each district's landmark is a set piece of its own.
//   SD.draftArt.building(canvas, { client, floors, scaf, cracks })     SD.draftArt.landmark(canvas, d)
//   SD.draftArt.lot(canvas)  an empty lot
// Painted Sogni pieces replace the code drawings one by one as they land (A.PAINTED below).
(function () {
  const A = SD.draftArt = {};
  const INK = '#2b2340';

  // Unit coordinates: the canvas is 64 units wide, the ground line at y = 0, up is negative.
  function setup(cv) {
    const r = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    const w = cv.clientWidth || +cv.getAttribute('width') || 96, h = cv.clientHeight || +cv.getAttribute('height') || 96;
    cv.width = Math.round(w * r); cv.height = Math.round(h * r);
    const ctx = cv.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    const u = cv.width / 64;
    ctx.translate(0, cv.height - u * 6); ctx.scale(u, u);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    return { ctx, H: (cv.height / u) - 6 };
  }
  function G(ctx) {
    const g = {
      ctx,
      fill(c, line) { ctx.fillStyle = c; ctx.fill(); if (line !== false) { ctx.strokeStyle = INK; ctx.lineWidth = line || 0.9; ctx.stroke(); } return g; },
      stroke(c, w) { ctx.strokeStyle = c || INK; ctx.lineWidth = w || 0.9; ctx.stroke(); return g; },
      poly(...p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); return g; },
      line(...p) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); return g; },
      rect(x, y, w, h, r) { ctx.beginPath(); if (r && ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); return g; },
      circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); return g; },
      ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); return g; },
      text(s, x, y, size, col) { ctx.fillStyle = col || INK; ctx.font = `700 ${size}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText(s, x, y); return g; }
    };
    return g;
  }
  function ground(g) {
    g.rect(-2, 0, 68, 8).fill('#7cc96a', false);
    g.rect(-2, 0, 68, 1.4).fill('#5aa64c', false);
    g.ell(32, 0.5, 24, 2.4).fill('rgba(43,35,64,.18)', false);
  }

  // Storeys shown: one per floor up to a cap, so a tall building still fits its tile; the label says the real count.
  const MAX_STOREYS = 6;
  A.storeys = f => Math.max(1, Math.min(MAX_STOREYS, f | 0));

  A.lot = function (cv) {
    const { ctx } = setup(cv), g = G(ctx);
    ground(g);
    ctx.setLineDash([2, 2]);
    g.rect(12, -14, 40, 14, 1).stroke('rgba(43,35,64,.45)', 0.8);
    ctx.setLineDash([]);
    g.line(14, -3, 14, -12).stroke('#9a7a50', 0.9); g.rect(9, -16, 10, 5, 0.6).fill('#f4ecd4', 0.6);
    g.text('LOT', 14, -12.4, 3.2, '#7a6a50');
  };

  // An empty plot in Pingsby's Quarter: a ghost of the old house, faint, with Freya's delete marker hung on it.
  A.ghost = function (cv) {
    const ghostOf = [...A.PAINTED].find(n => n.endsWith('-small')) || [...A.PAINTED].find(n => n.endsWith('-mid'));
    if (ghostOf && A.PAINTED.has('delete-marker')) {
      Promise.all([pic(ghostOf), pic('delete-marker')]).then(([im, mk]) => {
        if (!cv.isConnected) return;
        const { ctx, H } = setup(cv), g = G(ctx);
        if (!A.PAINTED.has('lot')) ground(g);
        ctx.save(); ctx.filter = 'grayscale(1)'; stand(ctx, im, (H - 2) * HEIGHT.small, 40, 0.3); ctx.restore();
        const m = stand(ctx, mk, (H - 2) * 0.75, 30);
        g.text('DELETE', 32, -m.h * 0.78, 4.6, '#fff');
      }).catch(() => {});
    }
    const { ctx, H } = setup(cv), g = G(ctx);
    ground(g);
    const top = -Math.min(H - 6, 24);
    ctx.globalAlpha = 0.35;
    g.rect(16, top + 8, 32, -top - 8).fill('#d8d4e4', 0.7);
    g.poly(12, top + 9, 32, top - 2, 52, top + 9).fill('#a8a0bc', 0.7);
    g.rect(28, -8, 8, 8, 0.6).fill('#a8a0bc', 0.6);
    ctx.globalAlpha = 1;
    ctx.setLineDash([2, 2]); g.rect(16, top + 8, 32, -top - 8).stroke('rgba(43,35,64,.5)', 0.7); ctx.setLineDash([]);
    g.rect(14, top + 12, 36, 8, 1).fill('#c0503a', 0.6);
    g.text('DELETE', 32, top + 18, 5.6, '#fff');
  };

  // The painted Quarter (Sogni renders in assets/img/draft/quarter, credited in CREDITS.md): a name is listed here once
  // its file is in, and until then that piece keeps its code drawing, so the art can land a few files at a time.
  // Buildings are '<client>-small|mid|tall' (1-2, 3-4 and 5-6 storeys); also 'scaffold' and 'delete-marker'.
  A.PAINTED = new Set(['mira-mid', 'seoyeon-mid', 'dutch-mid', 'kai-mid', 'marrow-mid', 'pip-mid', 'coo-mid',
    'mira-tall', 'seoyeon-tall', 'dutch-tall', 'kai-tall', 'marrow-tall', 'pip-tall', 'coo-tall',
    'mira-small', 'seoyeon-small', 'dutch-small', 'kai-small', 'marrow-small', 'pip-small', 'coo-small',
    'scaffold', 'delete-marker', 'lot', 'river', 'landmark-fountain', 'landmark-arch', 'landmark-clock', 'landmark-lantern']);
  A.URL = n => `assets/img/draft/quarter/${n}.webp`;
  const PIC = {};
  const pic = n => PIC[n] || (PIC[n] = new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = A.URL(n); }));
  A.size = f => { const n = A.storeys(f); return n <= 2 ? 'small' : n <= 4 ? 'mid' : 'tall'; };
  // Draws a picture standing on the ground line, centred, at most hMax units tall and wMax wide.
  function stand(ctx, im, hMax, wMax, alpha) {
    const k = Math.min(hMax / im.naturalHeight, wMax / im.naturalWidth), w = im.naturalWidth * k, h = im.naturalHeight * k;
    ctx.save(); if (alpha != null) ctx.globalAlpha = alpha; ctx.drawImage(im, 32 - w / 2, -h, w, h); ctx.restore();
    return { w, h };
  }
  const HEIGHT = { small: 0.6, mid: 0.8, tall: 1 };
  function painted(cv, o) {
    const want = A.size(o.floors), sz = [want, 'mid', 'small', 'tall'].find(z => A.PAINTED.has(`${o.id}-${z}`));
    if (!o.id || !sz) return false;
    const name = `${o.id}-${sz}`;
    const scaf = o.scaf && A.PAINTED.has('scaffold');
    Promise.all([pic(name), scaf ? pic('scaffold') : null]).then(([im, sc]) => {
      if (!cv.isConnected) return;
      const { ctx, H } = setup(cv), g = G(ctx);
      if (!A.PAINTED.has('lot')) ground(g);
      const box = stand(ctx, im, (H - 2) * HEIGHT[A.size(o.floors)], 52);
      for (let k = 0; k < Math.min(3, o.cracks | 0); k++) {
        const cx = 32 - box.w / 4 + k * box.w / 5, cy = -box.h * (0.25 + 0.2 * k);
        g.line(cx, cy, cx + 2, cy + 3, cx - 1, cy + 5, cx + 1.5, cy + 8).stroke('#3a2a20', 0.8);
      }
      if (o.scaf) { if (sc) stand(ctx, sc, box.h + 4, box.w + 10); else scaffold(g, 32 - box.w / 2, box.w, -box.h); }
    }).catch(() => {});
    return true;
  }

  // A building: base, storeys, roof, the client's sign. o: { client: { roof, wall, sign, trim }, id, floors, scaf, cracks }
  A.building = function (cv, o) {
    const { ctx, H } = setup(cv), g = G(ctx);
    if (painted(cv, o)) { setup(cv); return; }
    const c = o.client || {}, roof = c.roof || '#5a7ea6', wall = c.wall || '#efe2c6', trim = c.trim || '#6a4a2a';
    const n = A.storeys(o.floors), sh = Math.min(10, (H - 22) / n), x0 = 14, w = 36;
    ground(g);
    // Storeys, bottom up: the ground floor has the door.
    for (let i = 0; i < n; i++) {
      const y = -(i + 1) * sh;
      g.rect(x0, y, w, sh).fill(wall, 0.8);
      if (i === 0) g.rect(x0 + w / 2 - 4, y + sh - Math.min(8, sh - 1), 8, Math.min(8, sh - 1), 0.6).fill(trim, 0.7);
      const wy = y + sh * 0.25, wh = Math.max(2, sh * 0.45);
      [x0 + 4, x0 + w - 10].forEach(wx => { if (i > 0 || wx < x0 + w / 2 - 6 || wx > x0 + w / 2 + 4) g.rect(wx, wy, 6, wh, 0.5).fill('#bfe3ff', 0.6); });
      if (i > 0) g.line(x0, y + sh, x0 + w, y + sh).stroke('rgba(43,35,64,.35)', 0.5);
    }
    const top = -n * sh;
    g.poly(x0 - 4, top + 1, x0 + w / 2, top - 12, x0 + w + 4, top + 1).fill(roof, 0.9);
    if (c.sign) { g.rect(x0 + w / 2 - 11, top - 4.5, 22, 6, 1).fill('#fff8e0', 0.6); g.text(c.sign, x0 + w / 2, top - 0.2, 3.6, INK); }
    // A Sure miss on a slot cracks the wall: one jagged line per crack, up to three.
    for (let k = 0; k < Math.min(3, o.cracks | 0); k++) {
      const cx = x0 + 8 + k * 10, cy = -sh * Math.min(n, 1 + k) + 2;
      g.line(cx, cy, cx + 2, cy + 3, cx - 1, cy + 5, cx + 1.5, cy + 8).stroke('#3a2a20', 0.8);
    }
    if (o.scaf) scaffold(g, x0, w, top);
  };
  function scaffold(g, x0, w, top) {
    const wood = '#b07a3a', t = top - 6;
    [x0 - 3, x0 + w + 3].forEach(x => g.line(x, 0, x, t).stroke(wood, 1.4));
    for (let y = -6; y > t; y -= 8) {
      g.line(x0 - 5, y, x0 + w + 5, y).stroke(wood, 1.2);
      g.rect(x0 - 5, y - 1, w + 10, 1.4).fill('#d9a86a', false);
    }
    g.line(x0 - 3, -2, x0 + w + 3, t + 2).stroke('rgba(176,122,58,.7)', 0.8);
    // A tarp on the top storey and a striped sign at the bottom, so it reads without colour too.
    g.rect(x0 + 2, top - 1, w - 4, 6, 0.6).fill('rgba(120,140,170,.55)', false);
    g.rect(x0 + w / 2 - 9, -8, 18, 5, 0.6).fill('#ffd24a', 0.6);
    for (let i = 0; i < 4; i++) g.poly(x0 + w / 2 - 8 + i * 4.5, -3, x0 + w / 2 - 6 + i * 4.5, -3, x0 + w / 2 - 3 + i * 4.5, -8, x0 + w / 2 - 5 + i * 4.5, -8).fill(INK, false);
  }

  // A lifecycle build order's elevation (SD.draft.storeys): a blueprint of the building, one storey per lifecycle
  // event from the ground up, each with its event's name on it. With land, the storeys drop in one at a time (CSS in
  // js/draft.js; none under prefers-reduced-motion). An event you can't script is a hatched storey with a dashed edge
  // and says who runs it, so it reads without colour. Returns HTML; the list is in run order for screen readers.
  //   SD.draftArt.elevation({ life, storeys: [{ hook, step, by }] }, { land })
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  A.elevation = function (L, o) {
    if (!L || !L.storeys || !L.storeys.length) return '';
    o = o || {};
    const n = L.storeys.length;
    const rows = L.storeys.map((s, i) => {
      const sub = s.step && s.step !== s.hook ? s.step : '';
      const tag = s.by ? `run by ${s.by}${s.step == null ? ', not in the order' : ''}` : '';
      return `<li class="dr-st${s.by ? ' auto' : ''}" style="--i:${i}" data-hook="${escH(s.hook)}" aria-label="Storey ${i + 1}: ${escH(s.hook)}${sub ? ', ' + escH(sub) : ''}${tag ? ', ' + escH(tag) : ''}">
        <span class="dr-st-n" aria-hidden="true">${i + 1}</span><span class="dr-st-t"><b class="dr-st-h">${escH(s.hook)}</b>${sub ? `<span class="dr-st-s">${escH(sub)}</span>` : ''}${tag ? `<span class="dr-st-by" aria-hidden="true">${escH(tag)}</span>` : ''}</span></li>`;
    }).join('');
    return `<figure class="dr-elev${o.land ? ' land' : ''}" style="--n:${n}" data-life="${escH(L.life)}">
      <figcaption class="dr-elev-cap"><span>Elevation</span> ${escH(L.life)}</figcaption>
      <svg class="dr-elev-roof" viewBox="0 0 100 16" preserveAspectRatio="none" aria-hidden="true"><path d="M2 15 L50 1 L98 15 Z"/><path d="M50 1 V15" class="th"/></svg>
      <ol class="dr-elev-st">${rows}</ol>
      <div class="dr-elev-gnd" aria-hidden="true"><span>ground floor: the first event</span></div>
      ${L.storeys.some(s => s.by) ? `<p class="dr-elev-key">Hatched storeys can't be scripted: ${L.storeys.some(s => s.by === 'the agent') ? 'CodeDeploy or its agent runs them' : 'CodeDeploy runs them'}.</p>` : ''}
    </figure>`;
  };

  // Landmarks, one per district, unlocked at five standing buildings. Purely cosmetic.
  A.LANDMARKS = {
    1: 'The Sorting Fountain', 2: 'The Keystone Arch', 3: 'The Clock Tower', 4: 'The Lantern Tower'
  };
  A.landmark = function (cv, d) {
    const { ctx, H } = setup(cv), g = G(ctx);
    ground(g);
    if (d === 1) {
      g.ell(32, -3, 22, 5).fill('#a7a3a0'); g.ell(32, -5, 18, 3.6).fill('#5bb2e6', 0.7);
      g.rect(29, -26, 6, 22, 1).fill('#c9c3b6'); g.ell(32, -26, 9, 2.6).fill('#c9c3b6');
      g.ell(32, -27, 7, 1.8).fill('#5bb2e6', 0.6);
      [[-1, 20], [1, 44]].forEach(([s, x]) => g.line(32, -30, 32 + s * 6, -36, x, -6).stroke('rgba(91,178,230,.9)', 1.2));
      g.line(32, -27, 32, -38).stroke('rgba(91,178,230,.9)', 1.2);
    } else if (d === 2) {
      g.rect(10, -30, 10, 30).fill('#c9c3b6'); g.rect(44, -30, 10, 30).fill('#c9c3b6');
      g.ctx.beginPath(); g.ctx.moveTo(10, -30); g.ctx.quadraticCurveTo(32, -54, 54, -30); g.ctx.lineTo(44, -30); g.ctx.quadraticCurveTo(32, -42, 20, -30); g.ctx.closePath(); g.fill('#d8d2c4');
      g.poly(28, -45, 36, -45, 34, -37, 30, -37).fill('#e2bd4f');
      g.circle(32, -43, 1.4).fill(INK, false); g.rect(31.4, -43, 1.2, 3).fill(INK, false);
    } else if (d === 3) {
      const top = -Math.min(H - 4, 52);
      g.rect(24, top + 10, 16, -top - 10).fill('#e2d8c4');
      g.poly(21, top + 11, 32, top, 43, top + 11).fill('#5a7ea6');
      g.circle(32, top + 20, 6).fill('#fff8e0'); g.line(32, top + 20, 32, top + 16).stroke(INK, 0.9); g.line(32, top + 20, 35, top + 21).stroke(INK, 0.9);
      g.rect(29, -8, 6, 8, 0.6).fill('#6a4a2a', 0.7);
    } else {
      const top = -Math.min(H - 4, 52);
      g.poly(26, 0, 28, top + 12, 36, top + 12, 38, 0).fill('#e8e4dc');
      for (let y = -8; y > top + 12; y -= 10) g.rect(27, y - 3, 10, 3).fill('#c0503a', false);
      g.rect(26, top + 4, 12, 8, 1).fill('#ffe28a'); g.circle(32, top + 8, 2.4).fill('#ffb400', false);
      g.poly(25, top + 4, 32, top - 3, 39, top + 4).fill('#2b2340');
      [-1, 1].forEach(s => g.poly(32, top + 8, 32 + s * 22, top + 2, 32 + s * 22, top + 14).fill('rgba(255,226,138,.35)', false));
    }
  };
})();
