// The vector proof of concept's backgrounds and stills: the opening ("the files"), chapter 1's four prologues, and
// the battle backdrops. Every picture is a square 1200 x 1200 SVG built from the kit's pieces (js/vec-kit.js), with
// what matters inside the middle 600 x 760 so phones and wide screens both crop to it. Scenes are keyed by the ids
// the visual-novel scripts use, in K.scenes.
(function () {
  const K = SD.vec, INK = K.INK, N = K.NIGHT;
  const { p, c, e, r, t, g } = K;
  const S = K.scenes = K.scenes || {};

  // ---------- Pieces ----------
  const sky = (id, a, b, mid) => ({ defs: K.lin(id, mid ? [[0, a], [0.55, mid], [1, b]] : [[0, a], [1, b]]), body: r(0, 0, 1200, 1200, `url(#${id})`) });
  const shade = (a, col) => r(0, 0, 1200, 1200, col || '#05040a', null, null, a);
  const grade = (id, top, bottom, a1, a2) => ({ defs: K.lin(id, [[0, top, a1], [1, bottom, a2]]), body: r(0, 0, 1200, 1200, `url(#${id})`) });
  // The camp lantern: a brass base, a glass chimney and a flame. Drawn at its foot (x, y), s = scale.
  const lantern = (x, y, s) => g(
    p('M-34 0 L34 0 L28 -16 L-28 -16Z', '#8a6a2a', N, 3) + p('M-24 -16 C-34 -50 -34 -84 -20 -108 L20 -108 C34 -84 34 -50 24 -16Z', '#fff2c8', N, 3, 0.55)
    + p('M-6 -40 C-12 -56 -6 -72 0 -84 C6 -72 12 -56 6 -40 C4 -34 -4 -34 -6 -40Z', '#ffb238') + p('M-3 -44 C-6 -54 -2 -64 0 -70 C2 -64 6 -54 3 -44Z', '#fff6d0')
    + p('M-22 -108 L22 -108 L18 -122 L-18 -122Z', '#8a6a2a', N, 3) + p('M-10 -122 C-10 -150 10 -150 10 -122', null, '#8a6a2a', 4)
    + p('M-20 -100 C-28 -76 -28 -48 -20 -24', null, '#fff', 3, 0.6),
    `translate(${x} ${y}) scale(${s || 1})`);
  // A manila folder, closed, lying flat and seen from above at an angle: x, y its middle, w h its size, a rotation.
  const folder = (x, y, w, h, a, o) => {
    o = o || {};
    let s = p(`M${-w / 2} ${-h / 2 + 10} L${-w / 2 + w * 0.3} ${-h / 2 + 10} L${-w / 2 + w * 0.34} ${-h / 2 - 8} L${-w / 2 + w * 0.6} ${-h / 2 - 8} L${-w / 2 + w * 0.64} ${-h / 2 + 10} L${w / 2} ${-h / 2 + 10} L${w / 2} ${h / 2} L${-w / 2} ${h / 2}Z`, o.col || '#d9b878', N, 3)
      + p(`M${-w / 2} ${-h / 2 + 22} L${w / 2} ${-h / 2 + 22}`, null, '#b8955a', 2) + p(`M${w / 2 - 10} ${-h / 2 + 14} L${w / 2 - 10} ${h / 2 - 4}`, null, '#b8955a', 2, 0.6);
    if (o.stamp) s += g(r(-w * 0.34, -14, w * 0.68, 34, 'none', '#b3242e', 3, 0.85) + t(0, 9, 'FREE TIER · APPLICATION', { size: w * 0.055, fill: '#b3242e', font: 'ui-monospace, monospace', weight: 800, ls: 1 }), 'rotate(-6)', 0.9);
    if (o.tab) s += t(-w / 2 + w * 0.47, -h / 2 + 7, K.esc(o.tab), { size: 15, fill: N, font: 'ui-monospace, monospace', weight: 700 });
    return g(s, `translate(${x} ${y}) rotate(${a || 0})`);
  };
  // An open folder: the cover thrown back, a sheet with a photo square and typed lines.
  const openFolder = (x, y, w, h, a, o) => {
    o = o || {};
    let s = p(`M${-w} ${-h / 2} L0 ${-h / 2} L0 ${h / 2} L${-w} ${h / 2}Z`, '#cfae6e', N, 3) + p(`M0 ${-h / 2} L${w} ${-h / 2} L${w} ${h / 2} L0 ${h / 2}Z`, '#d9b878', N, 3)
      + p(`M${-w + 16} ${-h / 2 + 14} L-10 ${-h / 2 + 14} L-10 ${h / 2 - 14} L${-w + 16} ${h / 2 - 14}Z`, '#f3ead8', N, 2) + p(`M14 ${-h / 2 + 12} L${w - 14} ${-h / 2 + 12} L${w - 14} ${h / 2 - 12} L14 ${h / 2 - 12}Z`, '#f6efe0', N, 2)
      + r(28, -h / 2 + 28, w * 0.34, w * 0.42, o.photo || '#6a6580', N, 2);
    for (let i = 0; i < 6; i++) s += p(`M${40 + w * 0.36} ${-h / 2 + 40 + i * 16} h${w * 0.4 - i * 6}`, null, '#6a6378', 3, 0.7);
    for (let i = 0; i < 5; i++) s += p(`M28 ${h * 0.12 + i * 16} h${w * 0.8 - (i % 2) * 30}`, null, '#6a6378', 3, 0.6);
    if (o.stamp) s += g(r(-w * 0.82, -18, w * 0.7, 36, 'none', '#c0202e', 4) + t(-w * 0.47, 10, 'UNANSWERED', { size: w * 0.1, fill: '#c0202e', font: 'ui-monospace, monospace', weight: 800 }), 'rotate(-10)', 0.9);
    return g(s, `translate(${x} ${y}) rotate(${a || 0})`);
  };
  // His white-gloved left hand, seen from above, fingers toward -y; the snake ring over the glove when asked.
  const glove = (x, y, s, a, ring) => g(
    p('M-48 60 C-56 10 -50 -30 -40 -54 L-30 -110 C-28 -122 -14 -122 -12 -110 L-8 -62 L-4 -126 C-2 -140 14 -140 16 -126 L18 -60 L24 -118 C26 -132 42 -132 42 -118 L40 -54 L50 -96 C54 -108 68 -106 66 -92 L56 -30 C64 -2 60 40 52 70Z', '#ece8e0', N, 3)
    + p('M-30 -100 L-26 -60 M2 -118 L6 -62 M32 -110 L30 -58', null, '#b8b2a8', 2.5, 0.9) + p('M-40 20 C-20 30 20 30 46 18', null, '#b8b2a8', 3) + p('M20 -40 C40 -10 44 30 40 64', null, '#c8c2b8', 8, 0.6)
    + (ring ? g(e(0, 0, 16, 7, 'none', '#d8a83a', 6) + e(0, 0, 16, 7, 'none', '#fff0a8', 1.6) + e(0, -4, 8, 5, '#e8c050', N, 2) + c(-4, -6, 2.5, '#fffbe0'), 'translate(30 -86)') : '')
    + p('M-48 60 L52 70 L56 160 L-56 160Z', '#100d18', N, 3),
    `translate(${x} ${y}) rotate(${a || 0}) scale(${s || 1})`);
  // Freya's hand, from above, the rolled green sleeve at the wrist.
  const bare = (x, y, s, a) => g(
    p('M-46 60 C-54 10 -48 -26 -38 -50 L-30 -104 C-28 -116 -14 -116 -12 -104 L-8 -58 L-4 -120 C-2 -134 14 -134 16 -120 L18 -56 L24 -112 C26 -126 42 -126 42 -112 L40 -50 L50 -90 C54 -102 68 -100 66 -86 L56 -26 C62 2 58 40 50 70Z', '#f6dcc6', N, 3)
    + p('M30 -10 C40 10 44 40 42 66', null, '#e2bfa6', 6, 0.8) + p('M-30 -96 l2 6 M2 -112 l1 6 M32 -104 l0 6', null, '#e2bfa6', 3)
    + p('M-50 60 L54 70 L60 150 L-60 150Z', '#3c9a5a', N, 3) + p('M-52 70 L56 80 L58 104 L-54 94Z', '#2c8a4b', N, 3),
    `translate(${x} ${y}) rotate(${a || 0}) scale(${s || 1})`);
  // The ouroboros: a snake biting its own tail, as on the man's ring, drawn big for the close-up.
  const ouroboros = (x, y, rad, col) => g(
    c(0, 0, rad, 'none', col, rad * 0.22) + c(0, 0, rad, 'none', N, 2) + c(0, 0, rad * 0.78, 'none', N, 2) + c(0, 0, rad * 1.12, 'none', N, 2.5, 0.5)
    + Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2, x1 = Math.cos(a) * rad * 0.9, y1 = Math.sin(a) * rad * 0.9, x2 = Math.cos(a) * rad * 1.08, y2 = Math.sin(a) * rad * 1.08; return p(`M${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)}`, null, '#8a6a1a', 2); }).join('')
    + p(`M${rad * 0.7} ${-rad * 0.7} C${rad * 1.2} ${-rad * 0.9} ${rad * 1.3} ${-rad * 0.3} ${rad * 1.02} ${-rad * 0.1} L${rad * 0.86} ${-rad * 0.36}Z`, col, N, 2.5) + c(rad * 0.98, -rad * 0.55, rad * 0.06, N),
    `translate(${x} ${y})`);

  // ---------- The opening: Freya's pavilion at night ----------
  // Canvas walls in lamplight, rain at the open flap, the camp desk with the lamp and four folders.
  function pavilion(o) {
    o = o || {};
    const L = [];
    L.push(sky('pv0', '#1f1a14', '#0a0806'));
    // The open flap at the back, onto the rain and a few far lanterns in the camp.
    L.push({ defs: K.lin('pvn', [[0, '#0a1222'], [1, '#141c30']]), body: p('M470 300 L730 300 L760 760 L440 760Z', 'url(#pvn)') + K.rain(1200, 1200, 0, 1) });
    let rain = ''; const R = K.rng(11);
    for (let i = 0; i < 70; i++) { const x = 450 + R() * 300, y = 300 + R() * 460, l = 20 + R() * 30; rain += `M${x.toFixed(0)} ${y.toFixed(0)}l-5 ${l.toFixed(0)}`; }
    L.push(p(rain, null, '#9fb4dc', 1.6, 0.45));
    L.push(c(540, 640, 5, '#ffb45a', null, null, 0.8) + c(680, 610, 4, '#ffb45a', null, null, 0.6) + c(610, 660, 3, '#ffb45a', null, null, 0.5));
    L.push(p('M440 760 L760 760 L780 790 L420 790Z', '#1a1612'));
    // The canvas: walls, seams and the roof's folds, with the flap tied back on both sides.
    L.push(p('M0 120 L600 40 L1200 120 L1200 1200 L0 1200Z M470 300 L440 760 L760 760 L730 300Z', '#3a2f22', null, null, 1).replace('<path', '<path fill-rule="evenodd"'));
    L.push(p('M0 120 L600 40 L1200 120 L1200 260 C900 230 300 230 0 260Z', '#2e251a', N, 3));
    L.push(p('M150 100 C200 170 220 200 230 250 M380 70 C420 150 430 200 432 240 M820 70 C780 150 770 200 768 240 M1050 100 C1000 170 980 200 970 250', null, '#221b12', 4, 0.8));
    L.push(p('M200 260 L180 1200 M380 250 L370 1200 M820 250 L830 1200 M1000 260 L1020 1200', null, '#2a2219', 5, 0.8));
    L.push(p('M470 300 C430 420 400 600 380 790 L440 790 L470 300Z', '#4a3c2a', N, 3) + p('M730 300 C770 420 800 600 820 790 L760 790 L730 300Z', '#4a3c2a', N, 3));
    L.push(p('M410 560 C430 540 450 540 470 556 M790 560 C770 540 750 540 730 556', null, '#c9a86a', 5));
    // Poles.
    L.push(r(318, 40, 26, 1160, '#4a3420', N, 3) + r(856, 40, 26, 1160, '#4a3420', N, 3) + p('M326 60 L326 1200', null, '#6a4c30', 4, 0.6));
    // The rug and the desk, drawn a size up from the middle so they hold the frame.
    L.push(e(600, 1080, 520, 120, '#3a1c1c', N, 3) + e(600, 1080, 470, 96, 'none', '#7a3a2a', 4, 0.6));
    L.push('<g transform="translate(600 900) scale(1.35) translate(-600 -880)">');
    L.push(p('M300 830 L900 830 L940 880 L260 880Z', '#5a3c22', N, 3.5) + p('M260 880 L940 880 L940 904 L260 904Z', '#3e2814', N, 3));
    L.push(p('M300 904 L420 1150 M420 904 L300 1150 M780 904 L900 1150 M900 904 L780 1150', null, '#3e2814', 12) + p('M300 904 L420 1150 M420 904 L300 1150 M780 904 L900 1150 M900 904 L780 1150', null, N, 2, 0.6));
    // Chairs either side, half in the dark.
    L.push(p('M120 760 L120 1150 M250 760 L250 1150 M110 760 L260 760 L250 700 L120 700Z', '#2a1e14', N, 3, 0.9));
    L.push(p('M950 760 L950 1150 M1080 760 L1080 1150 M940 760 L1090 760 L1080 700 L950 700Z', '#16100c', N, 3, 0.9));
    // The four folders and the name plate.
    if (!o.noFolders) L.push(folder(520, 852, 150, 44, -4, { col: '#cfae6e' }) + folder(528, 842, 150, 44, 2, { col: '#d4b272' }) + folder(516, 832, 150, 44, -2, { col: '#d9b878' }) + folder(530, 822, 150, 44, 3, { col: '#dcbc7c' }));
    L.push(g(p('M-50 0 L50 0 L44 -26 L-44 -26Z', '#b8902a', N, 3) + t(0, -7, '???', { size: 18, fill: N }), 'translate(800 840)'));
    // The lamp and its light.
    L.push(lantern(660, 830, 1.1));
    L.push('</g>');
    L.push(K.glow('pvg', 690, 760, 560, '#ffb45a', 0.55));
    L.push(K.glow('pvg2', 690, 740, 170, '#fff0b0', 0.5));
    L.push(grade('pvgr', '#0a0814', '#140a04', 0.25, 0.1));
    L.push(K.vignette(1200, 1200, 0.85));
    return K.scene(L);
  }
  S['open-pav'] = pavilion();

  // P2: across the desk, Freya's hand pushing the first folder into the light; his gloved hand waits with the ring.
  function hands(o) {
    o = o || {};
    const L = [sky('hd0', '#2a1c10', '#0c0806')];
    L.push(r(0, 0, 1200, 1200, '#5a3c22') + p('M0 180 L1200 140 M0 420 L1200 400 M0 700 L1200 690 M0 980 L1200 990', null, '#4a3018', 5, 0.8));
    L.push(p('M80 300 C300 290 500 296 700 304 M60 560 C400 556 800 560 1140 548 M100 840 C400 836 800 846 1150 840', null, '#6a4a2c', 3, 0.6));
    L.push(g(lantern(0, 0, 2.2), 'translate(600 330)'));
    L.push(K.glow('hdg', 600, 230, 680, '#ffb45a', 0.6));
    if (o.lead) {
      // The other three files, closed again, and the chosen one under her flat hand.
      L.push(folder(260, 720, 300, 90, -14, { stamp: true }) + folder(940, 730, 300, 90, 12, { stamp: true }) + folder(330, 980, 300, 90, 6, { stamp: true }));
      L.push(folder(600, 720, 440, 150, -3, { stamp: true, tab: o.lead.toUpperCase() }));
      L.push(bare(700, 880, 1.25, 8));
    } else {
      L.push(folder(560, 700, 420, 140, -8, { stamp: true }));
      L.push(bare(450, 880, 1.9, -30));
      L.push(glove(900, 800, 1.9, 28, true));
      L.push(K.glow('rgl', 950, 640, 90, '#fff0a8', 0.7));
    }
    L.push(grade('hdgr', '#0a0814', '#0a0510', 0.1, 0.5));
    L.push(K.vignette(1200, 1200, 0.9));
    return K.scene(L);
  }
  S['open-hands'] = hands();
  ['mira', 'kai', 'seoyeon', 'dutch'].forEach(id => { S['open-hand-' + id] = hands({ lead: { mira: 'Holloway, M.', kai: 'Mercer, K.', seoyeon: 'Seo-yeon', dutch: 'Kane, D.' }[id] }); });

  // The ring catching the light: the glove and the ouroboros, close.
  S['open-ring'] = K.scene([
    sky('rg0', '#140e0a', '#050304'),
    K.glow('rgw', 620, 420, 700, '#ff9a3a', 0.35),
    g(glove(0, 0, 4.2, 18, true), 'translate(560 880)'),
    g(ouroboros(0, 0, 26, '#e8b84a'), 'translate(796 556) rotate(18) scale(1 0.7)'),
    K.glow('rgs', 790, 540, 110, '#fffbe0', 0.8),
    p('M790 440 L800 532 L890 542 L800 552 L790 640 L780 552 L690 542 L780 532Z', '#fffbe0', null, null, 0.9),
    K.vignette(1200, 1200, 0.9)
  ]);

  // The close: four folders lie open in the lamplight.
  S['open-files'] = K.scene([
    sky('fl0', '#3a2614', '#140a04'),
    r(0, 0, 1200, 1200, '#5a3c22', null, null, 0.9),
    p('M0 220 L1200 200 M0 520 L1200 510 M0 820 L1200 830', null, '#4a3018', 6, 0.7),
    openFolder(470, 420, 160, 200, -6, { stamp: true, photo: '#8a96a8' }),
    openFolder(830, 440, 160, 200, 5, { stamp: true, photo: '#6e4630' }),
    openFolder(480, 770, 160, 200, 4, { stamp: true, photo: '#16131d' }),
    openFolder(840, 790, 160, 200, -4, { stamp: true, photo: '#24345e' }),
    K.glow('flg', 640, 560, 640, '#ffb45a', 0.45),
    grade('flgr', '#0a0814', '#0a0510', 0.15, 0.4),
    K.vignette(1200, 1200, 0.9)
  ]);
  // Empty chair: the man has gone out into the rain.
  S['open-gone'] = pavilion({ noFolders: false });

  // ---------- Chapter 1's prologues ----------
  // Mira: the top of the Inquisition's tower stair at night, rain, torchlight and a door.
  const stairs = (x, y, n, w, h, col, colD) => Array.from({ length: n }, (_, i) => p(`M${x - w / 2 - i * 12} ${y + i * h} L${x + w / 2 + i * 12} ${y + i * h} L${x + w / 2 + i * 12} ${y + (i + 1) * h} L${x - w / 2 - i * 12} ${y + (i + 1) * h}Z`, i % 2 ? col : colD, N, 2.5)).join('');
  const torch = (x, y, id) => [g(p('M-8 0 L8 0 L4 60 L-4 60Z', '#4a3420', N, 2.5) + p('M-14 -6 C-18 -40 -4 -60 0 -78 C6 -60 18 -40 14 -6Z', '#ff8a2a', N, 2) + p('M-6 -8 C-8 -30 0 -44 0 -52 C4 -40 8 -28 6 -8Z', '#ffe08a'), `translate(${x} ${y})`), K.glow(id, x, y - 40, 300, '#ff8a3a', 0.45)];
  S.m1 = K.scene([
    sky('m10', '#0e0a14', '#1e0e0c'),
    r(0, 0, 1200, 1200, '#2a2026'),
    p('M0 0 L300 0 L300 1200 L0 1200Z M900 0 L1200 0 L1200 1200 L900 1200Z', '#1a1418', N, 3),
    p(Array.from({ length: 14 }, (_, i) => `M0 ${i * 90} h300 M900 ${i * 90 + 45} h300`).join(' '), null, '#120e12', 3),
    p('M480 160 L720 160 L720 520 L480 520Z', '#120c10', N, 4) + p('M480 160 C480 80 720 80 720 160Z', '#120c10', N, 4) + p('M600 100 L600 520', null, '#2a1e1e', 3) + c(660, 360, 8, '#8a6a2a', N, 2),
    stairs(600, 520, 9, 420, 76, '#3a2e30', '#2e2428'),
    ...torch(330, 330, 'mt1'), ...torch(870, 330, 'mt2'),
    p('M560 760 C590 740 630 750 660 770 C640 800 590 810 560 790Z M680 900 C720 890 760 900 780 920 C750 940 700 940 680 920Z', '#5a1018', null, null, 0.85),
    K.rain(1200, 1200, 160, 4, '#b9c8e6', 0.35),
    grade('m1g', '#0a0a20', '#200808', 0.3, 0.35),
    K.vignette(1200, 1200, 0.8)
  ]);
  // Mira holding Bram on the steps: two figures as one dark shape, her beast arm white in the torchlight.
  S.m2 = K.scene([
    sky('m20', '#1a0c0e', '#060304'),
    stairs(600, 640, 6, 900, 90, '#2e2428', '#241c20'),
    K.glow('m2g', 360, 300, 600, '#ff8a3a', 0.35),
    p('M420 760 C400 640 460 540 560 520 C640 504 700 540 720 600 C800 600 900 640 960 700 L980 820 L400 820Z', '#141016', N, 4),
    p('M560 520 C540 470 560 420 610 410 C660 404 690 440 680 490 C676 520 650 540 620 544Z', '#1e1a24', N, 3),
    p('M720 600 C780 620 860 660 900 720 C860 740 780 720 720 690Z', '#3a3036', N, 3),
    p('M470 600 C500 640 540 680 600 700 C640 712 680 704 700 690 L690 730 C640 760 560 750 500 710 C470 690 450 650 450 610Z', '#e3e5ec', N, 3),
    p('M640 700 l6 22 M660 696 l6 20 M680 690 l6 18', null, N, 3),
    p('M760 720 C800 740 820 780 840 820 M700 760 C720 790 740 810 760 830', null, '#5a1018', 8, 0.9),
    K.rain(1200, 1200, 140, 8, '#b9c8e6', 0.3),
    grade('m2gr', '#0a0820', '#300808', 0.2, 0.45),
    K.vignette(1200, 1200, 0.9)
  ]);
  // Her cottage on the night of the new moon: a door, a cold hearth, one candle.
  S.m3 = K.scene([
    sky('m30', '#1a2236', '#0a0c14'),
    r(0, 700, 1200, 500, '#2a2018'),
    p(Array.from({ length: 8 }, (_, i) => `M0 ${720 + i * 60} L1200 ${716 + i * 60}`).join(' '), null, '#1e1610', 3),
    r(140, 280, 260, 420, '#3a2a1c', N, 4) + r(170, 310, 200, 360, '#2a1c12', N, 3) + c(350, 500, 10, '#8a6a2a', N, 2),
    p('M760 360 L1060 360 L1060 700 L760 700Z', '#3a3230', N, 4) + p('M800 480 L1020 480 L1020 700 L800 700Z', '#141010', N, 3) + p('M840 640 L980 640', null, '#3a2a20', 10),
    p('M480 300 L700 300 L700 470 L480 470Z', '#0e1426', N, 4) + p('M590 300 L590 470 M480 385 L700 385', null, N, 4) + K.stars(1200, 1200, 0, 1),
    r(560, 640, 120, 30, '#5a3c22', N, 3) + r(608, 590, 16, 50, '#f2ead8', N, 2) + p('M616 586 C610 574 616 562 616 556 C620 566 624 576 616 586Z', '#ffb238'),
    K.glow('m3g', 616, 570, 380, '#ffb45a', 0.4),
    grade('m3gr', '#0a1030', '#0a0a14', 0.35, 0.3),
    K.vignette(1200, 1200, 0.85)
  ]);
  // Kai: Halcyon's cathedral, a wall of gold light.
  const arches = (y, n, col) => Array.from({ length: n }, (_, i) => { const x = 120 + i * (960 / (n - 1)); return p(`M${x - 50} 1200 L${x - 50} ${y} C${x - 50} ${y - 90} ${x + 50} ${y - 90} ${x + 50} ${y} L${x + 50} 1200`, col, N, 3); }).join('');
  S.k1 = K.scene([
    sky('k10', '#3a2a10', '#100c06'),
    arches(380, 5, '#2a2014'),
    p('M300 200 L900 200 L900 1100 L300 1100Z', '#ffd25a', null, null, 0.25),
    { defs: K.lin('k1b', [[0, '#fff6c8', 0.9], [0.5, '#ffd25a', 0.6], [1, '#c08a2a', 0.2]], 0, 0, 1, 0), body: p('M380 120 L820 120 L840 1200 L360 1200Z', 'url(#k1b)') },
    p(Array.from({ length: 12 }, (_, i) => `M${400 + i * 36} 120 L${396 + i * 37} 1200`).join(' '), null, '#fff6c8', 2, 0.5),
    K.glow('k1g', 600, 560, 700, '#ffd25a', 0.5),
    r(0, 1060, 1200, 140, '#1a140a'),
    K.vignette(1200, 1200, 0.7)
  ]);
  // His hand flat on the barrier; Hana a shape inside the gold.
  S.k2 = K.scene([
    sky('k20', '#c08a2a', '#4a3410'),
    { defs: K.radU('k2b', [[0, '#fffbe0', 1], [0.5, '#ffd25a', 0.8], [1, '#8a6020', 0.6]], 600, 500, 700), body: r(0, 0, 1200, 1200, 'url(#k2b)') },
    p('M520 360 C520 300 580 270 610 270 C650 270 690 300 690 360 C690 420 650 450 610 450 C570 450 520 420 520 360Z M480 470 C520 450 700 450 740 470 L780 900 L440 900Z', '#c89a3a', null, null, 0.55),
    p('M600 120 L560 400 L640 520 L580 760 M640 520 L760 600 M560 400 L420 470', null, '#fffbe0', 4, 0.8),
    g(p('M-120 300 C-130 120 -110 0 -80 -100 L-60 -260 C-56 -282 -26 -282 -22 -260 L-14 -120 L-4 -290 C0 -312 30 -312 32 -290 L36 -110 L52 -270 C56 -292 86 -292 86 -270 L80 -100 L104 -200 C110 -222 140 -218 136 -196 L112 -40 C126 40 120 200 110 300Z', '#6e4630', N, 4)
      + p('M-110 300 L120 300 L130 420 L-120 420Z', '#2a2a30', N, 4), 'translate(600 860)'),
    K.glow('k2g', 600, 700, 300, '#fffbe0', 0.5),
    K.vignette(1200, 1200, 0.6)
  ]);
  // The cathedral steps that night, rain on gold-lit stone.
  S.k3 = K.scene([
    sky('k30', '#0e0c10', '#1a1610'),
    p('M200 120 L1000 120 L1000 600 L200 600Z', '#1a1610', N, 4), arches(420, 4, '#14100c'),
    p('M440 600 L760 600 L760 380 C760 300 440 300 440 380Z', '#3a2a10', N, 4), K.glow('k3g', 600, 470, 420, '#ffd25a', 0.35),
    stairs(600, 600, 7, 760, 86, '#2a2420', '#221c18'),
    K.rain(1200, 1200, 180, 12, '#b9c8e6', 0.35),
    grade('k3gr', '#0a0a20', '#1a1408', 0.3, 0.2), K.vignette(1200, 1200, 0.8)
  ]);
  // Seo-yeon: the Murim Alliance's duel hall, red lacquer and paper lanterns.
  const lanterns = (n, y, seed) => { const R = K.rng(seed); let s = ''; for (let i = 0; i < n; i++) { const x = 140 + i * (920 / (n - 1)), yy = y + R() * 40; s += p(`M${x} 0 L${x} ${yy - 40}`, null, N, 2) + e(x, yy, 26, 36, '#c0302a', N, 3) + p(`M${x - 26} ${yy} h52`, null, '#7a1a16', 2); } return s; };
  S.s1 = K.scene([
    sky('s10', '#3a1614', '#0a0606'),
    r(0, 0, 1200, 700, '#4a1c18'), p(Array.from({ length: 7 }, (_, i) => `M${100 + i * 170} 0 L${100 + i * 170} 700`).join(' '), null, '#2a0e0c', 18),
    r(0, 700, 1200, 500, '#2a1a12'), p(Array.from({ length: 10 }, (_, i) => `M${-200 + i * 160} 1200 L${400 + i * 80} 700`).join(' '), null, '#1e120c', 3),
    e(600, 900, 420, 120, 'none', '#c0a050', 5, 0.6),
    lanterns(6, 160, 21), K.glow('s1g', 600, 300, 700, '#ff6a3a', 0.25),
    r(380, 300, 440, 120, '#1a0a08', '#c0a050', 4) + t(600, 380, '武林', { size: 72, fill: '#c0a050', font: 'serif' }),
    K.vignette(1200, 1200, 0.8)
  ]);
  // The one second: Jin's back, the knife in her sleeve, Namgung watching.
  S.s2 = K.scene([
    sky('s20', '#5a1020', '#140408'),
    p('M0 1200 L520 520 L680 520 L1200 1200Z', '#2a0a10'),
    p('M560 260 C540 260 528 280 530 300 C534 330 560 340 580 336 C600 332 612 310 606 290 C602 272 584 260 560 260Z M520 340 C560 330 620 330 650 350 L700 760 L460 760Z', '#0e0608', N, 3),
    p('M200 1200 L260 700 C300 640 360 620 420 640 L480 1200Z', '#140810', N, 3),
    g(p('M0 0 L180 -12 L184 -4 L4 8Z', '#e8eef4', N, 2) + p('M-40 -6 L0 -4 L0 6 L-40 6Z', '#3a3346', N, 2), 'translate(380 820) rotate(-20)'),
    K.glow('s2g', 520, 760, 120, '#ffffff', 0.6),
    p('M940 120 C900 120 880 150 884 180 C890 220 920 236 950 230 C980 224 996 196 990 166 C984 138 966 120 940 120Z', '#0a0406', '#c0303a', 3) + e(920, 176, 8, 3, '#c0303a') + e(958, 176, 8, 3, '#c0303a'),
    p(Array.from({ length: 30 }, (_, i) => `M${600 + Math.cos(i) * 900} ${600 + Math.sin(i) * 900} L${600 + Math.cos(i) * 500} ${600 + Math.sin(i) * 500}`).join(' '), null, '#ffffff', 2, 0.15),
    K.vignette(1200, 1200, 0.8)
  ]);
  // A training yard at dawn, in mist.
  S.s3 = K.scene([
    sky('s30', '#9aa0b4', '#e8d8d0', '#c8c4cc'),
    p('M0 640 C200 560 400 600 600 540 C800 480 1000 560 1200 520 L1200 1200 L0 1200Z', '#8a8ea4', null, null, 0.6),
    p('M100 400 L200 300 L300 400Z M900 380 L1020 260 L1140 380Z', '#6a6e84', null, null, 0.5),
    r(0, 760, 1200, 440, '#b8a890'), p(Array.from({ length: 6 }, (_, i) => `M0 ${800 + i * 70} L1200 ${790 + i * 70}`).join(' '), null, '#a89880', 3),
    p('M180 760 L180 520 M140 520 L220 520 M1000 760 L1000 520 M960 520 L1040 520', null, '#4a3a30', 14),
    r(0, 0, 1200, 1200, '#ffffff', null, null, 0.25),
    K.vignette(1200, 1200, 0.4)
  ]);
  // Dutch: a cell at night, one slit of moonlight.
  S.d1 = K.scene([
    sky('d10', '#0e121e', '#04050a'),
    r(0, 0, 1200, 1200, '#1a1e2a'), p(Array.from({ length: 16 }, (_, i) => `M0 ${i * 80} h1200`).join(' ') + ' ' + Array.from({ length: 30 }, (_, i) => `M${(i % 6) * 220 + (Math.floor(i / 6) % 2) * 110} ${Math.floor(i / 6) * 80 * 3} v80`).join(' '), null, '#12141e', 3),
    r(560, 160, 80, 220, '#2a3a5a', N, 4) + p('M580 160 v220 M600 160 v220 M620 160 v220', null, N, 6),
    { defs: K.lin('d1b', [[0, '#a8c2ff', 0.35], [1, '#a8c2ff', 0]]), body: p('M560 380 L640 380 L820 1100 L480 1100Z', 'url(#d1b)') },
    r(140, 760, 360, 80, '#2a2a36', N, 3) + r(160, 840, 20, 200, '#1a1a24') + r(460, 840, 20, 200, '#1a1a24'),
    r(0, 1060, 1200, 140, '#10121a'),
    K.vignette(1200, 1200, 0.85)
  ]);
  // His fist against the wall, Lina's diary open on the floor.
  S.d2 = K.scene([
    sky('d20', '#1e2234', '#0a0a12'),
    r(0, 0, 1200, 1200, '#262a3a'), p(Array.from({ length: 16 }, (_, i) => `M0 ${i * 80} h1200`).join(' '), null, '#1a1c28', 3),
    g(p('M-110 -60 C-120 -100 -80 -130 -40 -126 L60 -120 C100 -116 120 -90 116 -50 L110 40 C104 80 70 96 30 92 L-70 84 C-104 80 -116 50 -110 10Z', '#9a6446', N, 4) + p('M-60 -120 L-56 80 M0 -120 L4 88 M56 -116 L56 86', null, '#7e4f36', 4) + p('M-110 40 L-200 300 L40 320 L110 40Z', '#24345e', N, 4), 'translate(520 460) rotate(-8)'),
    p('M560 420 l40 -30 M600 470 l50 0 M580 520 l40 30', null, '#c8d0e8', 5),
    g(p('M-160 0 L0 -20 L160 0 L160 120 L0 100 L-160 120Z', '#e8e0cc', N, 3) + p('M0 -20 L0 100', null, N, 3) + p(Array.from({ length: 5 }, (_, i) => `M-140 ${10 + i * 20} L-20 ${-4 + i * 20} M20 ${-4 + i * 20} L140 ${10 + i * 20}`).join(' '), null, '#6a6a7a', 2.5), 'translate(700 920) rotate(-6)'),
    K.glow('d2g', 700, 900, 300, '#a8c2ff', 0.3),
    K.vignette(1200, 1200, 0.85)
  ]);
  // Flowers on an empty infirmary bed.
  S.d3 = K.scene([
    sky('d30', '#d8d4dc', '#8a8690'),
    r(0, 0, 1200, 760, '#c8c4cc'), r(0, 760, 1200, 440, '#8a8690'),
    r(780, 180, 220, 300, '#e8f0ff', N, 4) + p('M890 180 v300 M780 330 h220', null, N, 4),
    { defs: K.lin('d3b', [[0, '#ffffff', 0.5], [1, '#ffffff', 0]], 1, 0, 0, 1), body: p('M780 480 L1000 480 L700 1100 L360 1100Z', 'url(#d3b)') },
    p('M240 640 L900 640 L940 760 L200 760Z', '#f2f0f4', N, 4) + r(200, 760, 740, 60, '#d8d4dc', N, 3) + r(220, 820, 20, 200, '#8a8690') + r(900, 820, 20, 200, '#8a8690') + p('M260 600 C260 560 420 560 420 600 L420 650 L260 650Z', '#ffffff', N, 3),
    g(p('M0 0 L-40 -120 M0 0 L0 -140 M0 0 L40 -116 M0 0 L-20 -90', null, '#4a7a3a', 4) + c(-40, -126, 18, '#e8e0f4', N, 2) + c(0, -148, 20, '#ffffff', N, 2) + c(40, -122, 18, '#d8c8f0', N, 2) + c(-22, -96, 14, '#ffffff', N, 2) + p('M-24 0 L24 0 L16 40 L-16 40Z', '#c8b8a8', N, 2), 'translate(620 640) rotate(-70)'),
    K.vignette(1200, 1200, 0.4)
  ]);

  // ---------- Battle backdrops ----------
  // The temple of Uptime (chapter 1) and the Sorting Floors (chapter 2), wide, behind the fighters.
  K.stage = {
    1: K.scene([sky('b10', '#2a2046', '#0e0a18'), arches(520, 6, '#1e1830'), r(0, 900, 1200, 300, '#1a1428'), p(Array.from({ length: 8 }, (_, i) => `M${i * 170} 1200 L${200 + i * 110} 900`).join(' '), null, '#120e1e', 3), K.glow('b1g', 600, 400, 600, '#b9a3ff', 0.25), K.vignette(1200, 1200, 0.6)]),
    2: K.scene([sky('b20', '#2a2418', '#0e0c08'),
      p(Array.from({ length: 6 }, (_, i) => `M${i * 240 - 40} 200 L${i * 240 - 40} 900`).join(' '), null, '#3a3020', 30),
      r(0, 300, 1200, 30, '#5a4a30', N, 3) + r(0, 600, 1200, 30, '#5a4a30', N, 3),
      p(Array.from({ length: 24 }, (_, i) => `M${30 + (i % 12) * 100} ${i < 12 ? 230 : 530} h60 v60 h-60Z`).join(' '), '#d9c8a0', N, 2, 0.8),
      r(0, 900, 1200, 300, '#1e1a12'), K.glow('b2g', 600, 380, 600, '#ffcf7a', 0.25), K.vignette(1200, 1200, 0.6)])
  };
  K.lantern = lantern; K.folder = folder; K.openFolder = openFolder; K.stairs = stairs; K.torch = torch; K.skyL = sky; K.gradeL = grade; K.arches = arches;

  if (!K.on) return;
  K.installs.push(() => {
    // Chapter 1's prologues play their painted stills (js/ch1.js), like the opening; the drawn ones here are kept
    // for reference.
    SD.vn.addScenes(Object.fromEntries(Object.keys(S).filter(k => /^(open|c2)-/.test(k)).map(k => [k, { src: S[k], label: k }])));
    SD.run.stageArt = ch => K.stage[ch] || K.stage[1];
  });
})();
