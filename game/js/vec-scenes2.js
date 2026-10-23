// The vector proof of concept's chapter 2 pictures: Bram's wagon on a new moon, the edge of the Cloud, Freya's tower
// at dawn, the scrap field and Seymour's bunker, the first fire of the Free Cloud, Thornwick's town floor and its
// silent post box, and the camp's post office. Same kit and framing as js/vec-scenes.js.
(function () {
  const K = SD.vec, N = K.NIGHT;
  const { p, c, e, r, t, g } = K;
  const S = K.scenes;
  const sky = K.skyL, grade = K.gradeL;
  const hills = (y, col, seed, amp) => { const R = K.rng(seed); let d = `M0 1200 L0 ${y}`; for (let x = 0; x <= 1200; x += 100) d += ` Q${x + 50} ${y - R() * amp} ${x + 100} ${y + (R() - 0.5) * amp * 0.4}`; return p(d + ' L1200 1200Z', col); };
  const fire = (x, y, s, id) => [g(p('M-60 10 L60 -6 M-56 -6 L58 12', null, '#4a2c16', 14) + p('M-40 0 C-50 -50 -20 -80 0 -130 C10 -90 40 -70 40 0Z', '#ff8a2a', N, 3) + p('M-18 0 C-22 -30 -6 -50 0 -80 C8 -50 22 -30 18 0Z', '#ffe08a'), `translate(${x} ${y}) scale(${s})`), K.glow(id, x, y - 60 * s, 420 * s, '#ff9a3a', 0.5)];
  // Freya's tower: a stack of floors, the four homelands' lights in it.
  const tower = (x, base, top, w, lit) => { let s = p(`M${x - w / 2} ${base} L${x - w * 0.36} ${top} L${x + w * 0.36} ${top} L${x + w / 2} ${base}Z`, '#2a2a3e', N, 3); for (let y = top + 24; y < base; y += 22) { const k = (y - top) / (base - top); s += p(`M${x - w * (0.36 + 0.14 * k)} ${y} h${w * (0.72 + 0.28 * k)}`, null, '#1a1a28', 2); } if (lit) { const R = K.rng(5); for (let i = 0; i < 46; i++) { const y = top + 20 + R() * (base - top - 30), k = (y - top) / (base - top), hw = w * (0.36 + 0.14 * k); s += r(x - hw + 8 + R() * (hw * 2 - 20), y, 6, 8, ['#ffd25a', '#9be07a', '#ff8a6a', '#8ab8ff'][i % 4], null, null, 0.85); } } return s + e(x, top - 30, w * 0.5, 14, 'none', '#ffd76a', 5, 0.8); };

  // Cold open: Bram's wagon on the night of a new moon, a stew pot on the fire.
  S['c2-wagon'] = K.scene([
    sky('w0', '#0c1020', '#1a1a2a'), K.stars(1200, 700, 160, 9, 0.9),
    hills(720, '#141826', 3, 120), hills(820, '#1a1e2a', 6, 80),
    g(p('M-220 0 L220 0 L240 -40 L-240 -40Z', '#6a4a2c', N, 4) + p('M-230 -40 C-230 -220 230 -220 230 -40Z', '#d8cdb4', N, 4) + p('M-150 -40 C-150 -180 -60 -196 0 -200 M60 -196 C150 -180 150 -40 150 -40', null, '#b8ab90', 4) + c(-150, 30, 54, '#4a3420', N, 4) + c(150, 30, 54, '#4a3420', N, 4) + c(-150, 30, 10, N) + c(150, 30, 10, N) + p('M220 -30 L330 -60 L330 -80 L210 -50Z', '#5a3c22', N, 3), 'translate(470 800) scale(1.5)'),
    ...fire(860, 1000, 1.3, 'wf'),
    g(p('M-50 -60 L50 -60 L40 0 L-40 0Z', '#2a2a30', N, 3) + p('M-60 -60 L60 -60', null, N, 5) + p('M-20 -80 C-30 -110 -10 -120 -16 -150 M14 -80 C6 -110 26 -120 20 -150', null, '#e8e4dc', 4, 0.5), 'translate(860 950) scale(1.3)'),
    grade('wg', '#0a1030', '#100808', 0.2, 0.2), K.vignette(1200, 1200, 0.7)
  ]);
  // The wagon seat, close: the letter under it. The camera stays a beat too long.
  S['c2-seat'] = K.scene([
    sky('st0', '#2a1c12', '#0a0806'), r(0, 0, 1200, 1200, '#3a2818'),
    p('M100 360 L1100 300 L1100 560 L100 620Z', '#6a4a2c', N, 5) + p('M100 620 L1100 560 L1100 640 L100 700Z', '#4a3018', N, 5) + p('M200 380 L1000 330 M200 480 L1000 430', null, '#5a3c22', 4),
    p('M100 700 L1100 640 L1100 1200 L100 1200Z', '#120c08'),
    g(p('M-150 -50 L150 -60 L156 50 L-146 60Z', '#f2ead8', N, 3) + p('M-150 -50 L4 10 L150 -60', null, N, 3) + c(0, 6, 18, '#8a2a34', N, 2), 'translate(600 720) rotate(-4)'),
    K.glow('stg', 800, 900, 600, '#ff9a3a', 0.35), K.vignette(1200, 1200, 0.9)
  ]);
  // The edge of the Cloud, the night after the wipe: the floor stops, and below is nothing.
  S['c2-edge'] = K.scene([
    sky('ed0', '#0a0a18', '#2a2440'), K.stars(1200, 1200, 220, 13, 1),
    p('M0 720 C300 700 500 740 760 700 C900 680 1000 720 1200 700 L1200 1200 L0 1200Z', '#1a1828', N, 4),
    p('M0 800 C200 780 400 820 600 800 L640 1200 L0 1200Z', '#141220'),
    p(Array.from({ length: 20 }, (_, i) => `M${i * 60 + 10} ${712 + (i % 3) * 6} l14 30`).join(' '), null, '#2e2a44', 3),
    g(K.c(0, 0, 40, '#c8a46a', N, 3) + p('M-40 0 C-40 50 40 50 40 0', '#a8743a', N, 3) + p('M-30 -6 C-20 -40 20 -40 30 -6', null, '#a8743a', 5), 'translate(860 690)'),
    K.vignette(1200, 1200, 0.7)
  ]);
  // Dawn: Freya's tower on the horizon, a hundred floors over the capital.
  S['c2-tower'] = K.scene([
    sky('tw0', '#3a2a5a', '#ffb88a', '#c87aa0'), c(600, 760, 160, '#ffe0b0', null, null, 0.6),
    tower(600, 820, 120, 280, true),
    hills(780, '#5a3a5a', 8, 80), hills(860, '#3a2a40', 12, 60), hills(960, '#241a2a', 15, 50),
    p('M520 1200 C560 1080 580 980 600 900', null, '#c8a07a', 14, 0.6),
    K.vignette(1200, 1200, 0.5)
  ]);
  // The scrap field at the tower's foot: half-gone houses, people as outlines, Pingsby's signs.
  S['c2-scrap'] = K.scene([
    sky('sf0', '#6a6a7a', '#c8bca8'), tower(600, 560, -200, 520, false),
    r(0, 560, 1200, 640, '#7a6a5a'), hills(640, '#6a5a4a', 21, 50),
    g(p('M-90 0 L-90 -120 L0 -190 L90 -120 L90 0Z', '#a89a8a', N, 4) + r(-30, -70, 60, 70, '#5a4a3a', N, 3), 'translate(260 760)', 0.85),
    g(p('M-90 0 L-90 -120 L0 -190 L90 -120 L90 0Z', '#b8aa9a', N, 4, 0.5) + p('M-90 -60 L90 -100', null, N, 3, 0.5), 'translate(900 740)', 0.5),
    g(r(-110, -40, 220, 60, '#e8dcc0', N, 3) + t(0, 0, 'PINGSBY POST', { size: 28, fill: '#8a3a2a' }) + p('M-80 20 L-80 120 M80 20 L80 120', null, '#5a4a3a', 8), 'translate(620 880) rotate(-8)'),
    p('M420 960 C410 900 440 870 460 870 C480 870 500 900 490 960Z M700 1000 C690 940 720 910 740 910 C760 910 780 940 770 1000Z', 'none', '#e8e4f4', 3, 0.6),
    p('M380 1100 h80 M720 1060 h60', null, '#5a4a3a', 6),
    K.vignette(1200, 1200, 0.5)
  ]);
  // Seymour's bunker: no handle on the outside.
  S['c2-bunker'] = K.scene([
    sky('bk0', '#5a5a6a', '#a89a8a'), r(0, 700, 1200, 500, '#6a5a4a'),
    p('M220 760 C220 420 980 420 980 760Z', '#6a7080', N, 5) + p('M300 700 C300 480 900 480 900 700', null, '#565c6c', 6),
    r(500, 520, 200, 240, '#3a4050', N, 5) + p('M520 540 h160 v200 h-160Z', null, '#2a3040', 4) + r(560, 600, 80, 20, '#14101f', N, 3),
    g(r(-60, -24, 120, 48, '#e8dcc0', N, 3) + t(0, 8, 'NO VISITORS', { size: 16, fill: '#8a2a34', font: 'ui-monospace, monospace' }), 'translate(820 620) rotate(4)'),
    K.vignette(1200, 1200, 0.5)
  ]);
  // The first fire of the Free Cloud, at night in the scrap field: a PixelLab still (CREDITS.md), not drawn, since
  // it is a backdrop people see (the camp's stage after Expedition I, the lost-run screen, the chapter's end cards).
  S['c2-fire'] = 'assets/img/vn/c2-fire.webp';
  // Thornwick's square, as it was every morning: the bell tower, the post box, the posters.
  const poster = (x, y, rot, freya) => g(r(-70, -90, 140, 180, '#efe4c8', N, 3) + (freya
    ? c(0, -30, 34, '#f6dcc6', N, 3) + p('M-36 -40 C-36 -80 36 -80 36 -40 C30 -60 -30 -60 -36 -40Z', '#e7b648', N, 2) + e(0, -74, 30, 6, 'none', '#ffd76a', 3) + c(-12, -30, 4, '#2fbf63') + c(12, -30, 4, '#2fbf63') + p('M-10 -14 Q0 -6 10 -14', null, N, 2) + t(0, 40, 'EVERYTHING', { size: 16, fill: '#2c8a4b' }) + t(0, 62, 'FREE!', { size: 22, fill: '#2c8a4b' })
    : c(0, -34, 30, '#f0d0b8', N, 3) + p('M-30 -44 C-30 -76 30 -76 30 -44Z', '#d8d4cc', N, 2) + p('M-10 -22 Q0 -16 10 -22', null, N, 2) + t(0, 20, 'THE GRAND', { size: 13, fill: N }) + t(0, 38, 'INQUISITOR', { size: 13, fill: N }) + t(0, 58, 'PROTECTS YOU', { size: 11, fill: '#8a2a34' }) + t(0, 74, 'FROM BEASTS', { size: 11, fill: '#8a2a34' })), `translate(${x} ${y}) rotate(${rot})`);
  S['c2-square'] = K.scene([
    sky('sq0', '#9ab0c8', '#e8dcc8'),
    p('M480 160 L720 160 L720 760 L480 760Z', '#8a7a6a', N, 4) + p('M460 160 L600 60 L740 160Z', '#5a3a3a', N, 4) + p('M540 220 L660 220 L660 340 L540 340Z', '#2a2018', N, 3) + p('M560 250 C560 300 640 300 640 250 C640 230 560 230 560 250Z', '#c9a24a', N, 3) + p('M600 340 L600 700', null, '#7a5a3a', 4),
    p('M0 420 L300 380 L300 780 L0 780Z', '#b8a088', N, 4) + p('M900 380 L1200 420 L1200 780 L900 780Z', '#a89078', N, 4) + p('M0 420 L150 300 L300 380 M900 380 L1050 300 L1200 420', '#6a4a3a', N, 4),
    r(0, 760, 1200, 440, '#b8ab98'), p(Array.from({ length: 12 }, (_, i) => `M${i * 110} 760 L${i * 140 - 300} 1200`).join(' '), null, '#a89a88', 3),
    poster(170, 560, -4, false), poster(1030, 560, 5, false), poster(380, 600, 3, false),
    g(r(-40, -140, 80, 140, '#b8402a', N, 4) + r(-24, -110, 48, 10, N) + t(0, -40, 'POST', { size: 16, fill: '#ffd25a' }), 'translate(820 840)'),
    K.vignette(1200, 1200, 0.4)
  ]);
  // The silent post box, and Freya smiling on the poster above it.
  S['c2-postbox'] = K.scene([
    sky('pb0', '#a8b8c8', '#d8ccb8'), r(0, 0, 1200, 1200, '#b8a088'), p(Array.from({ length: 14 }, (_, i) => `M0 ${i * 90} h1200`).join(' '), null, '#a08a72', 3),
    g(poster(0, 0, 0, true), 'translate(600 400) scale(2.2)'),
    g(r(-110, -330, 220, 330, '#b8402a', N, 5) + r(-70, -270, 140, 22, N), 'translate(600 1100)'),
    K.vignette(1200, 1200, 0.4)
  ]);
  // The post office in camp: Coo's counter, the sorting desk, a lamp. A PixelLab still too: the camp hub's backdrop.
  S['c2-office'] = 'assets/img/vn/c2-office.webp';
  // The Sorting Floors: the halls where Thornwick's letters are processed and never come out.
  S['c2-floors'] = K.scene([
    sky('sr0', '#2a2418', '#0e0c08'),
    p(Array.from({ length: 6 }, (_, i) => `M${i * 240 - 40} 100 L${i * 240 - 40} 1000`).join(' '), null, '#3a3020', 34),
    r(0, 320, 1200, 26, '#5a4a30', N, 3) + r(0, 620, 1200, 26, '#5a4a30', N, 3),
    p(Array.from({ length: 30 }, (_, i) => `M${20 + (i % 15) * 80} ${i < 15 ? 250 : 550} h56 v60 h-56Z`).join(' '), '#d9c8a0', N, 2, 0.85),
    p('M0 900 C300 860 900 940 1200 880 L1200 1200 L0 1200Z', '#1e1a12'),
    p(Array.from({ length: 40 }, (_, i) => `M${(i * 131) % 1200} ${900 + (i * 37) % 260} l30 -8 l4 18 l-30 8Z`).join(' '), '#efe4c8', N, 1.5, 0.8),
    K.glow('srg', 600, 380, 700, '#ffcf7a', 0.25), K.vignette(1200, 1200, 0.7)
  ]);
})();
