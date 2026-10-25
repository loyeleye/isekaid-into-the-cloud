// The vector proof of concept (index.html?vector, or vector.html): every picture in the game drawn in code as SVG,
// so nothing painted or generated is ever loaded. This file is the style kit the other js/vec-*.js files draw with,
// and it plugs their art into the engine. Everything here is inert unless window.SD_VECTOR is set (index.html's head).
//
// The house style, so every picture reads as one game:
//   ink      one outline colour, #2b2340 by day and #120f1c at night, round joins, 3 units on a 400-wide figure
//   shading  flat cel shading: a base, one shade tone (no outline) and one small highlight, lit from the scene's key
//            light; the whole scene is then graded with one light overlay (lamp amber, moonlight blue, dawn rose)
//   palette  the cast's colours from js/ch1-art.js's overworld, so a character looks the same walking and talking
//   framing  backgrounds are square (1200 x 1200) with what matters in the middle 600 x 760, so a phone in portrait
//            and a wide screen both crop to something that reads
(function () {
  const K = SD.vec = { on: !!window.SD_VECTOR };
  K.INK = '#2b2340';
  K.NIGHT = '#120f1c';

  // ---------- SVG plumbing ----------
  // A data URI that is also safe unquoted inside CSS url(): encodeURIComponent leaves ( ) ' alone, so escape them too.
  K.uri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg).replace(/[()']/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
  K.svg = (vb, body, defs) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;
  // Gradients: stops are [offset, colour, opacity?].
  const stops = s => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null ? ` stop-opacity="${a}"` : ''}/>`).join('');
  K.lin = (id, s, x1 = 0, y1 = 0, x2 = 0, y2 = 1) => `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops(s)}</linearGradient>`;
  K.rad = (id, s, cx = 0.5, cy = 0.5, r = 0.5) => `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`;
  K.radU = (id, s, cx, cy, r) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${r}">${stops(s)}</radialGradient>`;
  K.blur = (id, sd) => `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
  // Shapes. o: { s: stroke, w: width, o: opacity, f: fill }.
  const st = (s, w) => s ? ` stroke="${s}" stroke-width="${w || 3}" stroke-linejoin="round" stroke-linecap="round"` : '';
  K.p = (d, f, s, w, o) => `<path d="${d}" fill="${f || 'none'}"${st(s, w)}${o != null ? ` opacity="${o}"` : ''}/>`;
  K.c = (cx, cy, r, f, s, w, o) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${f || 'none'}"${st(s, w)}${o != null ? ` opacity="${o}"` : ''}/>`;
  K.e = (cx, cy, rx, ry, f, s, w, o) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f || 'none'}"${st(s, w)}${o != null ? ` opacity="${o}"` : ''}/>`;
  K.r = (x, y, w, h, f, s, sw, o, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}"${rx ? ` rx="${rx}"` : ''} fill="${f || 'none'}"${st(s, sw)}${o != null ? ` opacity="${o}"` : ''}/>`;
  K.t = (x, y, text, o) => `<text x="${x}" y="${y}" font-family="${o.font || 'Cinzel, Georgia, serif'}" font-size="${o.size || 20}" font-weight="${o.weight || 700}" fill="${o.fill || K.INK}" text-anchor="${o.anchor || 'middle'}"${o.ls ? ` letter-spacing="${o.ls}"` : ''}${o.rot ? ` transform="rotate(${o.rot} ${x} ${y})"` : ''}${o.op != null ? ` opacity="${o.op}"` : ''}>${text}</text>`;
  K.g = (body, tf, o) => `<g${tf ? ` transform="${tf}"` : ''}${o != null ? ` opacity="${o}"` : ''}>${body}</g>`;

  // ---------- Small deterministic randomness, so a picture is the same every time ----------
  K.rng = seed => { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  // ---------- Pieces every scene shares ----------
  // Rain frozen in a still: thin slanted streaks.
  K.rain = (W, H, n, seed, col, op) => {
    const R = K.rng(seed || 7); let d = '';
    for (let i = 0; i < n; i++) { const x = R() * (W + 200) - 100, y = R() * H, l = 30 + R() * 50; d += `M${x.toFixed(0)} ${y.toFixed(0)}l${(-l * 0.22).toFixed(0)} ${l.toFixed(0)}`; }
    return K.p(d, null, col || '#b9c8e6', 1.6, op != null ? op : 0.35);
  };
  K.stars = (W, H, n, seed, op) => {
    const R = K.rng(seed || 3); let s = '';
    for (let i = 0; i < n; i++) s += K.c((R() * W).toFixed(0), (R() * H).toFixed(0), (0.6 + R() * 1.6).toFixed(1), '#f4f0ff', null, null, ((op || 0.8) * (0.3 + R() * 0.7)).toFixed(2));
    return s;
  };
  // A soft pool of light: a radial gradient that fades to nothing.
  K.glow = (id, cx, cy, r, col, a) => ({ defs: K.radU(id, [[0, col, a], [0.45, col, a * 0.45], [1, col, 0]], cx, cy, r), body: `<circle cx="${cx}" cy="${cy}" r="${r}" fill="url(#${id})"/>` });
  K.vignette = (W, H, a) => ({ defs: K.rad('vig', [[0.55, '#000', 0], [1, '#000', a || 0.7]], 0.5, 0.5, 0.75), body: K.r(0, 0, W, H, 'url(#vig)') });
  // A whole scene: layers is a list of strings or { defs, body } pieces.
  K.scene = (layers, W, H) => {
    W = W || 1200; H = H || 1200;
    let defs = '', body = '';
    layers.forEach(l => { if (!l) return; if (typeof l === 'string') body += l; else { defs += l.defs || ''; body += l.body || ''; } });
    return K.uri(K.svg(`0 0 ${W} ${H}`, body, defs));
  };

  // Text that goes inside SVG.
  K.esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  if (!K.on) return;

  // ---------- Plugging the art into the engine ----------
  // Things drawn by later files register here; install() runs once everything has loaded (from js/vec-ch2.js).
  K.installs = [];
  K.install = () => K.installs.forEach(f => f());

  // CSS for vector mode: smooth (not pixelated) art, and the panels the proof of concept adds.
  const css = document.createElement('style');
  css.textContent = `
html.vector .c1-lead img, html.vector .spark, html.vector #vn .vn-spr > img { image-rendering: auto; }
html.vector .c1-lead img { width: 64px; height: 120px; }
html.vector #stage .fall .faller { background: none; }
html.vector body[data-lead] .stage .hero { width: 24% !important; height: 88% !important; bottom: 2%; }
html.vector .stage { background-size: cover; background-position: center; }
html.vector #run .map { background: radial-gradient(ellipse at 50% 30%, #2d2a44, #12101c 80%); }
html.vector #run .node .node-art { display: none; }
`;
  document.head.appendChild(css);
})();
