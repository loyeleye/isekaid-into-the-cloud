// Weather and atmosphere for the overworlds drawn in code: wind-blown dust in parallax layers, tumbleweeds and paper
// scraps on the wind, cloud shadows and heavy cloud cover, rain with ripples where it lands, snow, embers and ash,
// leaves, motes and fog. Everything is drawn on the canvas, nothing is loaded.
//
// A map's grade calls these (js/scene.js paints def.grade over the ground and under the names, signs and HUD), so
// none of it covers a label or a dialog, and none of it takes a tap. Each frame the grade calls
//   SD.wx.at(ctx, t, vw, vh, cx, cy, ts, px, py)   the view this frame, and where the player stands (tiles)
// then the effects it wants, each with a strength k from 0 to 1; SD.wx.ease(key, target) fades one in and out as you
// cross from one zone to the next. What drifts past the player thins out round them, so nobody is ever hidden.
//
// Phones: every layer has a fixed number of particles (the most is the rain's 120 streaks), each layer is drawn as
// one path where it can be, nothing is drawn off the screen, and nothing is allocated per frame (the soft shapes are
// painted once into small canvases and stamped). Everything moves with one clock and a hash, so a frame is the same
// every time; only the tumbleweeds and the rain's ripples remember where they started.
// prefers-reduced-motion: reduce slows every layer to a tenth (the dust and clouds barely drift) and stops the
// tumbleweeds and the ripples.
(function () {
  const W = SD.wx = {};
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;
  const wrap = (v, s) => ((v % s) + s) % s;
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  W.still = !!(mq && mq.matches);
  if (mq && mq.addEventListener) mq.addEventListener('change', e => { W.still = e.matches; });
  // A table of n rows of four hashed fractions: [x, y, a, b], each 0 to 1.
  const table = (n, seed) => Array.from({ length: n }, (_, i) => { const h = hash(i * 31 + seed, i * 17 + seed * 7), g = hash(h & 1023, i + seed); return [(h % 1000) / 1000, ((h >> 10) % 1000) / 1000, (g % 1000) / 1000, ((g >> 10) % 1000) / 1000]; });

  // ---------- The view ----------
  // T is the weather's own clock (slowed under reduced motion), wind how far the wind has blown (it gusts, so it is
  // summed rather than multiplied), gust how hard it blows right now (0.24 to 1).
  let c = null, T = 0, DT = 0, last = -1, VW = 0, VH = 0, CX = 0, CY = 0, TS = 32, U = 1, PX = -1e4, PY = -1e4, wind = 0, gust = 0.6;
  W.at = function (ctx, t, vw, vh, cx, cy, ts, px, py) {
    DT = last < 0 || t < last ? 0 : Math.min(0.1, t - last); last = t;
    const s = W.still ? 0.1 : 1;
    T += DT * s;
    gust = 0.62 + 0.38 * (Math.sin(T * 0.31) * 0.6 + Math.sin(T * 0.77 + 1.7) * 0.4);
    wind += DT * s * (0.5 + gust);
    c = ctx; VW = vw; VH = vh; CX = cx; CY = cy; TS = ts; U = ts / 32;
    if (px != null) { PX = (px + 0.5) * ts - cx; PY = (py + 0.15) * ts - cy; } else PX = PY = -1e4;
  };
  W.gust = () => gust;
  // How much of something at (X, Y) on screen to draw: less the nearer it is to the player, so they stay clear.
  function clear(X, Y, r) {
    const R = TS * (r || 1.1), dx = X - PX, dy = (Y - PY) * 0.7, d2 = dx * dx + dy * dy;
    return d2 >= R * R ? 1 : 0.1 + 0.9 * d2 / (R * R);
  }
  // A value that eases towards its target, for fading an effect in and out at a zone's edge. The first frame starts
  // at the target, so a map loads with its weather already there.
  const E = {};
  W.ease = function (key, target, rate) {
    const v = E[key];
    return (E[key] = v === undefined ? target : v + (target - v) * Math.min(1, DT * (rate || 1.2)));
  };
  // A flat wash over the view: 'multiply' darkens, 'saturation' drains the colour, 'source-over' tints.
  W.wash = function (mode, rgb, a) {
    if (a <= 0.005) return;
    c.globalCompositeOperation = mode; c.fillStyle = rgb; c.globalAlpha = Math.min(1, a); c.fillRect(0, 0, VW, VH);
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  };

  // ---------- Soft shapes ----------
  // A lumpy cloud of soft circles in one colour, painted once into a 256 x 128 canvas and stamped wherever it's
  // needed, stretched: cloud shadows, cloud cover, dust haze and fog banks are all this shape.
  const LOBES = [[128, 66, 58], [78, 74, 44], [178, 72, 48], [104, 50, 40], [154, 48, 42], [52, 82, 30], [206, 82, 32]];
  const SPR = {};
  function puff(rgb) {
    if (SPR[rgb]) return SPR[rgb];
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128;
    const g = cv.getContext('2d');
    LOBES.forEach(([x, y, r]) => {
      const gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(${rgb},.62)`); gr.addColorStop(0.55, `rgba(${rgb},.32)`); gr.addColorStop(1, `rgba(${rgb},0)`);
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
    });
    return (SPR[rgb] = cv);
  }
  // Stamp a shape at (X, Y) (its top-left), w x h, wrapped every sx x sy pixels so it comes round again.
  function stamp(img, X, Y, w, h, sx, sy) {
    for (let x = X - sx; x < VW; x += sx) {
      if (x + w < 0) continue;
      for (let y = Y - sy; y < VH; y += sy) if (y + h > 0) c.drawImage(img, x, y, w, h);
    }
  }

  // ---------- Clouds ----------
  // Cloud shadows slide over the ground, east and a little south, tied to the ground (they scroll with the map).
  // size scales them, speed is tiles a second, dark how dark the darkest is.
  const SHADOW = table(10, 3);
  W.shadows = function (k, size, speed, dark) {
    if (k <= 0.01) return;
    const img = puff('22,20,40'), sx = 40 * TS, sy = 30 * TS, z = size || 1, v = speed || 0.35;
    for (let i = 0; i < SHADOW.length; i++) {
      const s = SHADOW[i], w = (5 + s[2] * 5) * TS * z, h = w * 0.55;
      c.globalAlpha = Math.min(1, k * (dark || 0.2) * (0.6 + s[3] * 0.6) * 2.2);
      stamp(img, wrap(s[0] * sx + T * v * TS - CX, sx) - w / 2, wrap(s[1] * sy + T * v * 0.3 * TS - CY, sy) - h / 2, w, h, sx, sy);
    }
    c.globalAlpha = 1;
  };
  // Heavy cloud: the light dimmed (one multiply: a 'saturation' wash costs a phone far more), and dim shadows
  // drifting slowly over everything.
  W.overcast = function (k) {
    if (k <= 0.01) return;
    W.wash('multiply', 'rgb(104,108,128)', 0.5 * k);
    W.shadows(k, 1.7, 0.14, 0.3);
  };
  // The clouds themselves, low, between you and the ground: grey banks nearer than the map (they slide past faster
  // than it scrolls), drifting slowly east. Thin round the player.
  const COVER = table(5, 11);
  W.cover = function (k) {
    if (k <= 0.01) return;
    const top = puff('206,208,222'), sx = VW + 16 * TS, sy = VH + 10 * TS;
    for (let i = 0; i < COVER.length; i++) {
      const s = COVER[i], w = (6 + s[2] * 5) * TS, h = w * 0.5;
      const X = wrap(s[0] * sx + T * (0.15 + s[3] * 0.15) * TS - CX * 1.3, sx) - 8 * TS, Y = wrap(s[1] * sy - CY * 1.3, sy) - 5 * TS;
      if (X > VW || Y > VH || X + w < 0 || Y + h < 0) continue;
      const dx = X + w / 2 - PX, dy = Y + h / 2 - PY, d = Math.sqrt(dx * dx + dy * dy) / (w * 0.5), a = k * (0.45 + 0.55 * Math.min(1, d));
      c.globalAlpha = 0.38 * a; c.drawImage(top, X, Y, w, h);
    }
    c.globalAlpha = 1;
  };

  // ---------- Dust ----------
  // Wind-blown dust in three layers: a far haze in long low banks that drifts slower than the ground, motes that
  // drift with it, and near grit, short fast streaks nearer than the ground that thicken in the gusts.
  const HAZE = table(6, 5), MOTE = table(40, 7), GRIT = table(28, 9);
  W.dust = function (k) {
    if (k <= 0.01) return;
    const m = 24 * U, ms = VW + 2 * m, msy = VH + 2 * m;
    W.wash('source-over', 'rgb(204,164,104)', 0.15 * k);
    const img = puff('228,186,122'), sx = VW + 20 * TS, sy = VH + 6 * TS;
    c.globalAlpha = Math.min(1, k * (0.7 + 0.3 * gust));
    for (let i = 0; i < HAZE.length; i++) {
      const s = HAZE[i], w = (7 + s[2] * 5) * TS, h = w * 0.34;
      const X = wrap(s[0] * sx + wind * (0.5 + s[3] * 0.4) * TS - CX * 0.6, sx) - 10 * TS, Y = wrap(s[1] * sy - CY * 0.6, sy) - 3 * TS;
      if (X < VW && Y < VH && X + w > 0 && Y + h > 0) c.drawImage(img, X, Y, w, h);
    }
    c.globalAlpha = k * 0.55; c.fillStyle = 'rgb(236,216,176)'; c.beginPath();
    for (let i = 0; i < MOTE.length; i++) {
      const s = MOTE[i], X = wrap(s[0] * ms + wind * (1 + s[2]) * TS - CX, ms) - m, Y = wrap(s[1] * msy + Math.sin(T * (0.8 + s[2]) + s[3] * 6) * 5 * U - CY, msy) - m;
      if (clear(X, Y) > 0.6) c.rect(X, Y, 1.7 * U, 1.7 * U);
    }
    c.fill();
    const n = Math.round(GRIT.length * (0.3 + 0.7 * gust));
    c.globalAlpha = k * 0.6; c.strokeStyle = 'rgb(228,204,158)'; c.lineWidth = 1.2 * U; c.beginPath();
    for (let i = 0; i < n; i++) {
      const s = GRIT[i], X = wrap(s[0] * ms + wind * (4 + s[2] * 3) * TS - CX * 1.5, ms) - m, Y = wrap(s[1] * msy + T * (8 + s[3] * 10) * U - CY * 1.5, msy) - m;
      if (clear(X, Y) < 0.6) continue;
      const L = (6 + s[3] * 10) * U * (0.6 + 0.8 * gust);
      c.moveTo(X, Y); c.lineTo(X - L, Y - L * 0.12);
    }
    c.stroke(); c.globalAlpha = 1;
  };

  // ---------- Tumbleweeds ----------
  // Now and then one rolls in from the west edge, bouncing, spinning and casting a shadow, and rolls off the east.
  // At most two at once, one every 4 to 11 seconds; they roll on the ground (they scroll with the map).
  const WEED = [[0.5, 0, 0.35, 0.3, 2.6], [-0.36, 0.18, 0.42, 2.2, 4.8], [0.05, -0.42, 0.3, 3.9, 6.1], [-0.12, 0.34, 0.5, 5.2, 7.6],
    [0.3, -0.12, 0.55, 1.4, 3.6], [-0.3, -0.25, 0.4, 4.6, 6.9], [0, 0.05, 0.62, 0.2, 1.9]];
  const TWIG = [[0.3, 1.25], [1.9, 1.3], [3.3, 1.2], [4.6, 1.35], [5.7, 1.2]];
  const weeds = Array.from({ length: 2 }, () => ({ on: false, x: 0, y: 0, r: 0, v: 0, hop: 0, rot: 0, h: 0, age: 0 }));
  let nextWeed = 2, nWeed = 0;
  W.tumbleweeds = function (k) {
    if (k > 0.5 && !W.still && T >= nextWeed) {
      const w = weeds.find(o => !o.on);
      const h = hash(nWeed * 13 + 1, 77); nWeed++;
      nextWeed = T + 4 + (h % 700) / 100;
      if (w) Object.assign(w, { on: true, r: (8 + (h >> 4) % 5) * U, x: (CX - 20 * U) / TS, y: (CY + VH * (0.3 + ((h >> 9) % 60) / 100)) / TS, v: 2.6 + ((h >> 3) % 15) / 10, hop: 0, rot: 0, h, age: 0 });
    }
    for (let i = 0; i < weeds.length; i++) {
      const w = weeds[i]; if (!w.on) continue;
      const sp = w.v * (0.7 + 0.5 * gust) * DT * (W.still ? 0.1 : 1);
      w.x += sp; w.hop += sp / 1.7; w.rot += sp * TS / w.r; w.age += DT;
      const X = w.x * TS - CX, Y = w.y * TS - CY;
      if (X > VW + 3 * w.r || X < -6 * TS || Y < -2 * TS || Y > VH + 2 * TS || w.age > 20) { w.on = false; continue; }
      // Each bounce a little lower or higher than the last.
      const b = Math.abs(Math.sin(w.hop * Math.PI)), up = b * TS * (0.25 + 0.2 * (hash(w.h, Math.floor(w.hop)) % 10) / 10);
      const a = k * clear(X, Y - up, 0.9);
      c.globalAlpha = a * (0.24 - 0.12 * b); c.fillStyle = 'rgb(40,28,16)';
      c.beginPath(); c.ellipse(X, Y + w.r * 0.9, w.r * (1.1 - 0.3 * b), w.r * 0.32, 0, 0, 7); c.fill();
      weed(X, Y - up, w.r, w.rot, a * 0.95);
    }
    c.globalAlpha = 1;
  };
  function weed(X, Y, r, rot, a) {
    c.save(); c.translate(X, Y); c.rotate(rot); c.globalAlpha = a;
    c.lineCap = 'round';
    c.fillStyle = 'rgba(150,112,60,.28)'; c.beginPath(); c.arc(0, 0, r * 0.95, 0, 7); c.fill();
    c.strokeStyle = '#6e5232'; c.lineWidth = 1.6 * U; c.beginPath();
    for (let i = 0; i < 3; i++) { const a0 = i * 2.1, a1 = a0 + 1.7; c.moveTo(Math.cos(a0) * r, Math.sin(a0) * r); c.arc(0, 0, r, a0, a1); }
    TWIG.forEach(([an, f]) => { c.moveTo(Math.cos(an) * r * 0.85, Math.sin(an) * r * 0.85); c.lineTo(Math.cos(an + 0.2) * r * f, Math.sin(an + 0.2) * r * f); });
    c.stroke();
    c.strokeStyle = '#b08a52'; c.lineWidth = 1.1 * U; c.beginPath();
    WEED.forEach(([ox, oy, rr, a0, a1]) => { const x = ox * r, y = oy * r, R = rr * r; c.moveTo(x + Math.cos(a0) * R, y + Math.sin(a0) * R); c.arc(x, y, R, a0, a1); });
    c.stroke();
    c.restore(); c.lineCap = 'butt';
  }

  // ---------- Paper scraps ----------
  // Torn pages from the heaps, fluttering past on the wind, turning over as they go. Nearer than the ground.
  const SCRAP = table(5, 13);
  W.scraps = function (k) {
    if (k <= 0.01) return;
    const m = 30 * U, ms = VW + 2 * m, msy = VH + 2 * m;
    for (let i = 0; i < SCRAP.length; i++) {
      const s = SCRAP[i];
      const X = wrap(s[0] * ms + wind * (2 + s[2] * 1.5) * TS - CX * 1.25, ms) - m, Y = wrap(s[1] * msy + Math.sin(T * 1.1 + s[3] * 6) * 16 * U + T * 5 * U - CY * 1.25, msy) - m;
      const a = k * 0.85 * clear(X, Y);
      if (a < 0.08) continue;
      c.save(); c.translate(X, Y); c.rotate(T * (1.2 + s[2]) + s[3] * 6); c.scale(1, Math.cos(T * (3 + s[2] * 3) + s[3] * 6) || 0.01);
      c.globalAlpha = a; c.fillStyle = '#efe7d0'; c.fillRect(-3.5 * U, -2.6 * U, 7 * U, 5.2 * U);
      c.strokeStyle = 'rgba(90,80,100,.6)'; c.lineWidth = 0.6 * U; c.beginPath(); c.moveTo(-2.4 * U, -1 * U); c.lineTo(2.4 * U, -1 * U); c.moveTo(-2.4 * U, 0.8 * U); c.lineTo(1.4 * U, 0.8 * U); c.stroke();
      c.restore();
    }
    c.globalAlpha = 1;
  };

  // ---------- Rain ----------
  // Streaks falling a little slantwise (at most 120, fewer on a small screen and in a drizzle), and ripples where
  // it lands: rings that open and fade on the ground. wet(x, y), if given, says which tiles can take a ripple.
  const DROP = table(120, 17), RIP = new Float32Array(14 * 3).fill(-1);
  W.rain = function (k, wet) {
    if (k <= 0.01) return;
    const n = Math.min(DROP.length, Math.round(VW * VH / 3000 * k)), sx = VW + 60, sy = VH + 60, fall = VH * 1.3;
    c.globalAlpha = 0.32 + 0.12 * k; c.strokeStyle = 'rgb(206,216,240)'; c.lineWidth = U; c.beginPath();
    for (let i = 0; i < n; i++) {
      const s = DROP[i], X = wrap(s[0] * sx - CX * 1.1 - T * 40 * U, sx) - 30, Y = wrap(s[1] * sy + T * fall * (0.8 + s[2] * 0.4) - CY * 1.1, sy) - 30;
      if (clear(X, Y, 0.8) < 0.5) continue;
      const L = (8 + s[3] * 6) * U;
      c.moveTo(X, Y); c.lineTo(X - L * 0.25, Y + L);
    }
    c.stroke();
    if (!W.still) {
      c.strokeStyle = 'rgb(220,230,250)'; c.lineWidth = 0.9 * U;
      const P = 1.1, nr = Math.round(14 * Math.min(1, k + 0.2));
      for (let i = 0; i < nr; i++) {
        const q = T / P + i / 14, cyc = Math.floor(q), f = q - cyc, j = i * 3;
        if (RIP[j + 2] !== cyc) {
          const h = hash(i * 31 + 7, cyc), x = (CX + (h % 1000) / 1000 * VW) / TS, y = (CY + ((h >> 10) % 1000) / 1000 * VH) / TS;
          RIP[j] = x; RIP[j + 1] = wet && !wet(Math.floor(x), Math.floor(y)) ? -1e4 : y; RIP[j + 2] = cyc;
        }
        if (RIP[j + 1] < -1e3) continue;
        const X = RIP[j] * TS - CX, Y = RIP[j + 1] * TS - CY, R = (1.5 + 7 * f) * U;
        if (X < -R || X > VW + R || Y < -R || Y > VH + R) continue;
        c.globalAlpha = (1 - f) * 0.55 * k; c.beginPath(); c.ellipse(X, Y, R, R * 0.42, 0, 0, 7); c.stroke();
      }
    }
    c.globalAlpha = 1;
  };

  // ---------- Snow ----------
  // Two layers: small flakes further off, drifting slower than the ground, and larger ones nearer, faster, swaying.
  const FLAKE = table(64, 19);
  W.snow = function (k) {
    if (k <= 0.01) return;
    const m = 20 * U, ms = VW + 2 * m, msy = VH + 2 * m;
    c.fillStyle = 'rgb(248,250,255)';
    for (let layer = 0; layer < 2; layer++) {
      const near = layer === 1, p = near ? 1.3 : 0.85, r = (near ? 1.6 : 0.9) * U;
      c.globalAlpha = k * (near ? 0.8 : 0.55); c.beginPath();
      for (let i = near ? 40 : 0; i < (near ? 64 : 40); i++) {
        const s = FLAKE[i], fall = near ? 34 + s[2] * 22 : 14 + s[2] * 10, sway = near ? 14 : 7;
        const X = wrap(s[0] * ms + wind * (near ? 1.2 : 0.5) * TS + Math.sin(T * (0.7 + s[3]) + s[3] * 6) * sway * U - CX * p, ms) - m;
        const Y = wrap(s[1] * msy + T * fall * U - CY * p, msy) - m;
        if (near && clear(X, Y) < 0.6) continue;
        c.moveTo(X + r, Y); c.arc(X, Y, r, 0, 7);
      }
      // The near flakes get a faint blue edge first, so they show over snow and ice too.
      if (near) { c.save(); c.globalAlpha = k * 0.35; c.strokeStyle = 'rgb(110,130,176)'; c.lineWidth = 0.8 * U; c.stroke(); c.restore(); }
      c.fill();
    }
    c.globalAlpha = 1;
  };

  // ---------- Fire ----------
  // Embers rising off a fire at (x, y) (tiles: the fire's base), up to 16, drifting with the wind.
  const EMBER = table(16, 23);
  W.embers = function (x, y, k, n) {
    if (k <= 0.01) return;
    const X0 = x * TS - CX, Y0 = y * TS - CY;
    if (X0 < -3 * TS || X0 > VW + 3 * TS || Y0 < -TS || Y0 > VH + 4 * TS) return;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgb(255,168,76)';
    for (let i = 0; i < Math.min(n || 12, EMBER.length); i++) {
      const s = EMBER[i], L = 1.3 + s[2] * 1.3, ph = wrap(T / L + s[0], 1);
      const X = X0 + (s[1] - 0.5) * 0.6 * TS + Math.sin(T * 2.3 + i) * 3 * U * ph + ph * gust * 0.7 * TS, Y = Y0 - ph * (1.6 + s[3]) * TS;
      const r = 1.7 * U * (1 - ph * 0.5);
      c.globalAlpha = k * (1 - ph) * (ph < 0.1 ? ph * 10 : 1) * 0.9; c.fillRect(X - r / 2, Y - r / 2, r, r);
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  };
  // A burnt place: grey ash drifting down all over, and sparks rising through it.
  const ASH = table(36, 29), SPARK = table(18, 31);
  W.ash = function (k) {
    if (k <= 0.01) return;
    const m = 20 * U, ms = VW + 2 * m, msy = VH + 2 * m;
    c.globalAlpha = k * 0.5; c.fillStyle = 'rgb(176,170,168)'; c.beginPath();
    for (let i = 0; i < ASH.length; i++) {
      const s = ASH[i], X = wrap(s[0] * ms + wind * 0.6 * TS + Math.sin(T * (0.6 + s[2]) + s[3] * 6) * 10 * U - CX * 1.1, ms) - m, Y = wrap(s[1] * msy + T * (8 + s[2] * 10) * U - CY * 1.1, msy) - m;
      if (clear(X, Y) > 0.6) c.rect(X, Y, (1.4 + s[3]) * U, (1.4 + s[3]) * U);
    }
    c.fill();
    c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgb(255,150,60)';
    for (let i = 0; i < SPARK.length; i++) {
      const s = SPARK[i], L = 3 + s[2] * 3, ph = wrap(T / L + s[0], 1);
      const X = wrap(s[1] * ms + Math.sin(T * 1.7 + i) * 8 * U + wind * 0.8 * TS - CX, ms) - m, Y = wrap(msy * (1 - ph) + s[3] * msy - CY, msy) - m;
      c.globalAlpha = k * 0.9 * Math.sin(ph * Math.PI); c.fillRect(X, Y, 2.2 * U, 2.2 * U);
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  };

  // ---------- Leaves, motes and fog ----------
  // Dead leaves blown across, tumbling end over end; cols is a list of colours to pick from.
  const LEAF = table(12, 37);
  W.leaves = function (k, cols, n) {
    if (k <= 0.01) return;
    const m = 30 * U, ms = VW + 2 * m, msy = VH + 2 * m;
    for (let i = 0; i < Math.min(n || 10, LEAF.length); i++) {
      const s = LEAF[i];
      const X = wrap(s[0] * ms + wind * (1.6 + s[2] * 1.2) * TS - CX * 1.2, ms) - m, Y = wrap(s[1] * msy + T * (6 + s[2] * 8) * U + Math.sin(T * 1.3 + s[3] * 6) * 10 * U - CY * 1.2, msy) - m;
      const a = k * 0.9 * clear(X, Y);
      if (a < 0.08) continue;
      c.save(); c.translate(X, Y); c.rotate(T * (1.5 + s[2] * 2) + s[3] * 6); c.scale(1, Math.cos(T * (2 + s[2] * 3) + s[3] * 6) || 0.01);
      c.globalAlpha = a; c.fillStyle = cols[i % cols.length];
      c.beginPath(); c.ellipse(0, 0, 4.4 * U, 2.1 * U, 0, 0, 7); c.fill();
      c.restore();
    }
    c.globalAlpha = 1;
  };
  // Motes hanging in the air, glinting: dust in lamplight, the barrier's gold, the Abyss's dark. Tied to the ground.
  const MOTE2 = table(26, 41);
  W.motes = function (k, rgb, n) {
    if (k <= 0.01) return;
    const m = 20 * U, ms = VW + 2 * m, msy = VH + 2 * m;
    c.globalCompositeOperation = 'lighter'; c.fillStyle = rgb || 'rgb(255,226,160)';
    for (let i = 0; i < Math.min(n || 26, MOTE2.length); i++) {
      const s = MOTE2[i];
      const X = wrap(s[0] * ms + Math.sin(T * 0.3 * (1 + s[2]) + s[3] * 6) * 24 * U - CX, ms) - m, Y = wrap(s[1] * msy - T * 3 * U * (1 + s[2]) + Math.cos(T * 0.4 + s[3] * 6) * 12 * U - CY, msy) - m;
      c.globalAlpha = k * (0.2 + 0.4 * (0.5 + 0.5 * Math.sin(T * 1.7 * (1 + s[2]) + s[3] * 30)));
      c.fillRect(X, Y, 1.8 * U, 1.8 * U);
    }
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  };
  // Fog in long banks, nearer than the ground, sliding slowly past.
  const BANK = table(7, 43);
  W.fog = function (k, rgb) {
    if (k <= 0.01) return;
    const img = puff(rgb || '236,240,252'), sx = VW + 20 * TS, sy = VH + 8 * TS;
    c.globalAlpha = 0.4 * k;
    for (let i = 0; i < BANK.length; i++) {
      const s = BANK[i], w = (7 + s[2] * 5) * TS, h = w * 0.3;
      const X = wrap(s[0] * sx + T * (0.2 + s[3] * 0.25) * TS - CX * 1.3, sx) - 10 * TS, Y = wrap(s[1] * sy - CY * 1.3, sy) - 4 * TS;
      if (X < VW && Y < VH && X + w > 0 && Y + h > 0) c.drawImage(img, X, Y, w, h);
    }
    c.globalAlpha = 1;
  };

  // For the checks and for screenshots: roll a tumbleweed in now, and look at the clock.
  W.debug = { tumble: () => { nextWeed = 0; }, weeds: () => weeds.filter(w => w.on).length, clock: () => ({ T, wind, gust }) };
})();
