// The vector proof of concept's incidents and bosses: chapter 1's (drawn here instead of js/ch1-art.js's chibi ones
// and the generated sprites) and chapter 2's Sorting Floors, every one a way a message can fail. Each is the inside
// of a 120 x 120 viewBox, standing on y = 113 like the old ones, drawn in the cast's style (js/vec-cast.js) so a foe
// looks like it lives in the same world as the people fighting it:
//   ink      the cast's one outline colour, about 1.1 units here: the cast's 3.5 on a 400-wide figure, at a foe's size
//   shading  flat cel shading lit from the upper left, like the cast: a base, one darker shade tone on the side away
//            from the light, a thin rim of light on the lit edge (cel() below), then one light grade over the whole foe
//   palette  the cast's muted cloth, wood, brass and stone; colour is spent on the one thing the foe is about
//   people   human incidents are built from the cast's own parts (K.person), so their faces and proportions match
// Each keeps its idea readable at a glance: the AWS problem it stands for is in the picture, not just the name.
// Also: hit sparks and speech-bubble emotes drawn in code instead of Kenney's packs.
(function () {
  const K = SD.vec;
  const INK = K.INK;
  const { p, c, e } = K;

  // ---------- Pieces ----------
  let N = 0;
  const uid = () => 'vf' + (N++).toString(36);
  const W = 1.1;    // outline
  const WI = 0.7;   // inner lines
  const mono = 'ui-monospace, Menlo, monospace';
  // A solid piece, cel shaded: the shade tone shows on the lower right where the shape, nudged toward the light,
  // no longer covers it; the rim tone shows in a thin band on the upper left. o: k (shade depth), r (rim width), w.
  function cel(d, base, shade, rim, o) {
    o = o || {};
    const id = uid(), k = o.k != null ? o.k : 4, ky = o.ky != null ? o.ky : k * 0.5, r = o.r != null ? o.r : 1, w = o.w != null ? o.w : W;
    let s = `<clipPath id="${id}"><path d="${d}"/></clipPath><clipPath id="${id}t"><path d="${d}" transform="translate(${-k} ${-ky})"/></clipPath>`
      + `<g clip-path="url(#${id})"><path d="${d}" fill="${shade}"/><g clip-path="url(#${id}t)">`
      + (rim ? `<path d="${d}" fill="${rim}"/><path d="${d}" fill="${base}" transform="translate(${r} ${r})"/>` : `<path d="${d}" fill="${base}"/>`)
      + `</g>${o.inner || ''}</g>`;
    if (w) s += p(d, null, o.ink || INK, w);
    return s;
  }
  const at = (x, y, body, rot, sc) => `<g transform="translate(${x} ${y})${rot ? ` rotate(${rot})` : ''}${sc ? ` scale(${sc})` : ''}">${body}</g>`;
  const txt = (x, y, s, o) => K.t(x, y, K.esc(s), Object.assign({ font: mono, size: 6, weight: 700, fill: INK }, o));
  // A person from the cast's parts, standing in a box h tall with its top left at x, y (400 x 1000 scaled).
  const person = (L, face, x, y, h, flip) => {
    const s = h / 1000;
    return `<g transform="translate(${x} ${y}) scale(${flip ? -s : s} ${s})${flip ? ' translate(-400 0)' : ''}">${K.person(L, face, uid())}</g>`;
  };
  // One person alone stands 124 tall, feet on the box's floor, so a human incident is about two-thirds of the hero's
  // height on the stage instead of half (the box and its anchor are unchanged; the head reaches above it).
  const H = 124, HY = 113 - H, HX = 60 - H * 0.2;
  // A letter, in the cast's paper: w wide, centred on x, y.
  const PAPER = ['#e6dcc4', '#c2b597', '#f6f0e0'];
  const letter = (x, y, w, rot, o) => {
    o = o || {};
    const h = w * 0.64, col = o.col || PAPER;
    const d = `M${-w / 2} ${-h / 2} H${w / 2} V${h / 2} H${-w / 2}Z`;
    return at(x, y, cel(d, col[0], col[1], col[2], { k: w * 0.1, r: 0.6, w: o.w || 0.8 })
      + p(`M${-w / 2} ${-h / 2} L0 ${h * 0.1} L${w / 2} ${-h / 2}`, null, INK, o.w ? o.w * 0.8 : 0.65)
      + (o.seal ? c(0, h * 0.1, w * 0.1, o.seal, INK, 0.5) : '')
      + (o.n != null ? c(w * 0.42, h * 0.34, w * 0.27, '#2b2340', '#e8dcc0', 0.6) + txt(w * 0.42, h * 0.34 + w * 0.12, o.n, { size: w * 0.36, fill: '#f4ecd6', font: 'Cinzel, Georgia, serif' }) : ''), rot);
  };
  // A paper tag on a string, text in ink: centre x, y.
  const tag = (x, y, text, o) => {
    o = o || {};
    const size = o.size || 6.5, w = o.w || text.length * size * 0.62 + 7, h = size + 5;
    const d = `M${-w / 2 + 3} ${-h / 2} H${w / 2} V${h / 2} H${-w / 2 + 3} L${-w / 2} 0Z`;
    return at(x, y, cel(d, o.paper || '#e8dfc6', '#c4b796', '#faf5e8', { k: 2, r: 0.5, w: 0.7 }) + c(-w / 2 + 3.5, 0, 0.9, '#4a3e36')
      + txt(2, size * 0.36, text, { size, fill: o.ink || INK })
      + (o.strike ? p(`M${-w / 2 + 5} ${size * 0.05} H${w / 2 - 2}`, null, '#9a1f2e', 1.2) : ''), o.rot);
  };
  // Further back, so a little darker: for crowds.
  const back = (body, k) => { const id = uid(); k = k || 0.7; return `<filter id="${id}"><feColorMatrix type="matrix" values="${k} 0 0 0 0 0 ${k} 0 0 0 0 0 ${k} 0 0 0 0 0 1 0"/></filter><g filter="url(#${id})">${body}</g>`; };
  // Small pale eyes glinting in shadow, for the incidents that aren't people.
  const glint = (x, y, gap, col, r) => [x - gap / 2, x + gap / 2].map(ex => e(ex, y, (r || 1.6) * 2.2, (r || 1.6) * 1.4, col || '#e8e2c8', null, null, 0.18) + e(ex, y, r || 1.6, (r || 1.6) * 0.7, col || '#e8e2c8')).join('');

  // ---------- People ----------
  // Looks in the cast's palette (js/vec-cast.js's CAST), for incidents with a human shape.
  const CAP = (col, band, badge) => p('M146 136 C150 106 176 92 204 92 C232 92 256 106 260 136Z', col, INK, 3) + p('M136 136 L270 136 L280 150 L130 150Z', band, INK, 3) + (badge ? c(204, 114, 8, badge, INK, 2) : '');
  const LOOK = {
    // The Postmistress: a standard queue in a uniform.
    postmistress: { skin: '#ecd2c0', skinD: '#d2b09c', hair: '#4a3a44', hairD: '#2c2028', hairL: '#6a5664', eye: '#5a4a72', style: 'bob', coat: '#2e3b62', coatD: '#1c2644', under: '#cfc6b0', collar: 'high', robe: true, robeCol: '#26325a', robeD: '#18203c', boots: '#141826',
      top: () => CAP('#26325a', '#1a2240', '#d9b44a'),
      over: () => p('M120 330 L300 560', null, '#5a3e26', 9) + p('M250 540 L334 540 L330 612 L254 612Z', '#7a5432', INK, 3) + p('M250 560 h82', null, INK, 2) + [380, 440, 500].map(y => c(200, y, 6, '#d9b44a', INK, 2)).join('') },
    // The Town Crier: a bell, a tricorn and a voice that reaches everyone.
    crier: { skin: '#e2b48e', skinD: '#c99670', skinD2: '#a87a56', hair: '#5a3a26', hairD: '#3a2414', hairL: '#7a5a40', eye: '#4a3020', style: 'short', beard: true, coat: '#7a2a26', coatD: '#521a18', under: '#d8cdb4', collar: 'shirt', legs: '#2a2430', boots: '#1a1622', cuffs: '#c9a24a',
      faces: { cry: { eyes: 'open', brow: 'up', mouth: 'open' } },
      top: () => p('M118 132 Q200 60 282 132 Q240 118 200 122 Q160 118 118 132Z', '#24202e', INK, 3) + p('M150 116 Q200 56 250 116 Q200 104 150 116Z', '#2e2a3a', INK, 2.5) + p('M122 130 Q200 112 278 130', null, '#c9a24a', 4) },
    // The Empty Clerk: shirtsleeves, a waistcoat, and a long night of nothing.
    clerk: { skin: '#e8d0bc', skinD: '#ceb09a', hair: '#6a5a4a', hairD: '#4a3e32', hairL: '#8a7a68', eye: '#4a5a6a', style: 'slick', coat: '#5a5048', coatD: '#3e3630', sleeve: '#d8d0c0', under: '#ece6d8', collar: 'shirt', legs: '#3e3630', boots: '#1a1622', cuffs: '#bdb4a2',
      over: () => p('M150 320 L250 320 L258 470 L142 470Z', '#4a423a', INK, 2.5) + [360, 400, 440].map(y => c(200, y, 4, '#c9a24a', INK, 1.5)).join('') },
    // Twins: one delivery clerk, delivered twice.
    twin: { skin: '#f0d6c4', skinD: '#d8b8a2', hair: '#8a5a2a', hairD: '#6a3e1a', hairL: '#b07a44', eye: '#5a6a3a', style: 'bob', coat: '#5a5a48', coatD: '#3e3e30', under: '#d8cdb4', collar: 'shirt', legs: '#3e3e30', boots: '#2a2018',
      over: () => p('M140 420 L260 420 L270 760 L130 760Z', '#c9bea2', INK, 2.5) + p('M140 420 Q200 436 260 420', null, '#a89c80', 3) },
    // The Faithful: Brookfall's worshippers, hooded, with Uptima's gold ring on their robes.
    hood1: { skin: '#e2b896', skinD: '#c89c7a', hair: '#3a2e26', hairD: '#241c16', style: 'scarf', scarf: '#4a4258', eye: '#3a2e26', coat: '#5a5068', coatD: '#3e3650', under: '#cfc4ae', collar: 'v', robe: true,
      over: () => c(200, 430, 22, 'none', '#d9b44a', 7) },
    hood2: { skin: '#a8724f', skinD: '#8a5a3a', hair: '#1d1f2a', hairD: '#0e0f16', style: 'scarf', scarf: '#5a4a3a', eye: '#2a1a12', coat: '#6a5a46', coatD: '#4a3e30', under: '#cfc4ae', collar: 'v', robe: true,
      over: () => c(200, 430, 22, 'none', '#d9b44a', 7) },
    // The Session Warden: a jailer in a long grey coat, counting.
    warden: { skin: '#dcc4b2', skinD: '#bea492', skinD2: '#a08474', hair: '#3a3440', hairD: '#221e28', hairL: '#5a5464', eye: '#6a5a4a', style: 'slick', age: 1, coat: '#4a4a54', coatD: '#2e2e38', collar: 'high', robe: true, robeCol: '#3e3e48', robeD: '#26262e', cuffs: '#7a6a44', boots: '#141218',
      top: () => p('M150 130 C152 100 176 88 202 88 C228 88 252 100 254 130Z', '#2e2e38', INK, 3) + p('M140 130 L264 130 L276 144 L150 146Z', '#1e1e26', INK, 3) + p('M190 104 h24', null, '#a89060', 4),
      over: () => [0, 1, 2, 3].map(i => p(`M${118 + i * 7} 700 l-6 26 l8 0`, null, '#8a7a50', 4)).join('') + c(122, 690, 16, 'none', '#8a7a50', 4) },
    // The Two-Factor Sentinel: steel, a red plume, and the slit glowing.
    sentinel: { skin: '#7a8296', skinD: '#5a6276', hair: '#7a8296', style: 'none', coat: '#5a6274', coatD: '#3c4254', collar: 'high', legs: '#4a5062', boots: '#262a36', gloveL: '#4a5062', gloveR: '#4a5062',
      headOverride: () => p('M136 200 C136 120 166 92 200 92 C234 92 264 120 264 200 L262 266 L138 266Z', '#8a92a6', INK, 3.5) + p('M232 104 C254 124 262 160 262 200 L262 266 L236 266Z', '#626a80', null, null, 0.85)
        + p('M150 140 C160 110 180 100 200 100', null, '#c4cada', 4, 0.7)
        + K.r(150, 186, 100, 16, '#14101f', INK, 2.5, null, 4) + e(178, 194, 14, 4, '#e0403a') + e(222, 194, 14, 4, '#e0403a') + e(200, 194, 46, 10, '#ff5a40', null, null, 0.25)
        + p('M200 100 L200 180 M200 210 L200 260', null, '#626a80', 3) + [0, 1, 2, 3].map(i => c(170 + i * 20, 236, 3, '#14101f')).join(''),
      top: () => p('M190 92 C176 60 190 34 216 24 C208 46 216 70 210 92Z', '#8a2630', INK, 2.5) + p('M196 84 C190 64 198 44 212 34', null, '#b8404a', 3, 0.8),
      over: () => p('M150 380 h100 v40 h-100Z', '#3c4254', INK, 2.5) },
    // A clerk of the herd: four of these wake at once.
    herd1: { skin: '#e8ccb4', skinD: '#ceae96', hair: '#4a3a30', hairD: '#2e2420', hairL: '#6a5848', eye: '#4a3a2a', style: 'messy', coat: '#4e4a5a', coatD: '#34303e', under: '#d8d0c0', collar: 'shirt', legs: '#34303e' },
    herd2: { skin: '#9a6446', skinD: '#7e4f36', skinD2: '#5e3824', hair: '#1d1f2a', hairD: '#0e0f16', hairL: '#3e4256', eye: '#2a1a12', style: 'short', coat: '#5a4e40', coatD: '#3e3428', under: '#d8d0c0', collar: 'shirt', legs: '#3e3428' },
    herd3: { skin: '#f0d6c4', skinD: '#d8b8a2', hair: '#a87a44', hairD: '#7a5428', hairL: '#c89a60', eye: '#4a5a6a', style: 'bob', coat: '#3e4a5a', coatD: '#28323e', under: '#d8d0c0', collar: 'shirt', legs: '#28323e' },
    herd4: { skin: '#d8a888', skinD: '#c08e6e', hair: '#2a2420', hairD: '#140f0c', hairL: '#4a403a', eye: '#3a2a20', style: 'slick', coat: '#5a5048', coatD: '#3e3630', under: '#d8d0c0', collar: 'shirt', legs: '#3e3630' }
  };
  const herdFaces = { faces: { woke: { eyes: 'wide', brow: 'up', mouth: 'open' } } };
  ['herd1', 'herd2', 'herd3', 'herd4'].forEach(k => Object.assign(LOOK[k], herdFaces));

  const F = K.foes = {
    // ---------- Chapter 1 ----------
    // The Locked Cart: Freya's supply cart, iron-banded and padlocked. Nothing allows anything yet.
    c1door: () => {
      let s = '';
      // Wheels behind, then the box, the lid, the bands and the lock.
      [[30, 98], [92, 98]].forEach(([x, y]) => {
        s += cel(`M${x - 15} ${y} a15 15 0 1 0 30 0 a15 15 0 1 0 -30 0Z`, '#5a402a', '#3a281a', '#7a5a3e', { k: 3 });
        s += c(x, y, 10.5, 'none', '#3a281a', 1.6) + [0, 1, 2, 3, 4, 5].map(i => p(`M${x} ${y} l${(Math.cos(i * 1.047) * 10).toFixed(1)} ${(Math.sin(i * 1.047) * 10).toFixed(1)}`, null, '#2a1c12', 1.2)).join('') + c(x, y, 3, '#3a3640', INK, 0.8);
      });
      s += cel('M10 52 L110 52 L106 92 L14 92Z', '#7a5a3c', '#523a26', '#9a7a58', { k: 7, inner: [64, 76].map(y => p(`M10 ${y} H110`, null, '#3e2a1a', 0.9)).join('') + p('M20 56 l4 30 M44 58 l-2 28 M76 56 l3 30 M98 58 l-2 28', null, '#5a3e28', 0.6, 0.7) });
      s += cel('M6 42 Q60 26 114 42 L110 54 L10 54Z', '#6a4c32', '#46301e', '#8e6e4c', { k: 6 });
      s += [22, 98].map(x => cel(`M${x - 4} 30 L${x + 4} 30 L${x + 4} 92 L${x - 4} 92Z`, '#46424e', '#2a2832', '#6a6676', { k: 2, r: 0.6 }) + [40, 60, 80].map(y => c(x, y, 1, '#8a8696')).join('')).join('');
      // The padlock: heavy brass, shackle through the hasp.
      s += p('M51 58 V50 Q60 38 69 50 V58', null, '#3a3640', 4) + p('M51 58 V50 Q60 38 69 50 V58', null, '#8a8696', 1.6);
      s += cel('M46 58 H74 Q76 58 76 60 V78 Q76 82 72 82 H48 Q44 82 44 78 V60 Q44 58 46 58Z', '#c9a24a', '#8a6a2a', '#ecd28a', { k: 5 });
      s += p('M60 64 a3.2 3.2 0 1 0 0.1 0Z M58.6 69 L57.6 76 H62.4 L61.4 69', '#2a1c12');
      // The notice nailed to the lid: what every call returns.
      s += tag(60, 20, 'AccessDenied', { size: 8, rot: -4, ink: '#9a1f2e' });
      return s;
    },

    // Uptima's Faithful: Elder Wren and two of Brookfall's hooded faithful, the shrine's sealed bucket at their feet.
    c1faithful: () => back(person(LOOK.hood2, 'cold', -2, 0, 110) + person(LOOK.hood1, 'cold', 78, -2, 112, true))
      + person(K.cast.faithful, 'cold', 60 - 0.2 * 126, 113 - 126, 126)
      + cel('M14 96 L34 96 L32 113 L16 113Z', '#6a5a46', '#46392a', '#8a7a62', { k: 3 }) + p('M14 100 H34 M15 108 H33', null, '#3a3640', 1.2) + c(24, 104, 3.2, 'none', '#d9b44a', 1.4)
      + p('M14 96 Q24 88 34 96', null, '#3a3640', 1),

    // The Wrong Mask: an acolyte's robe with nobody in it, and the porcelain mask that fits anyone. Its tag names
    // the only role its trust policy lets in.
    c1mask: () => {
      let s = cel('M30 113 C28 80 30 54 38 40 C42 22 50 12 60 12 C70 12 78 22 82 40 C90 54 92 80 90 113Z', '#3a3248', '#241e30', '#564a6a', { k: 9 });
      s += p('M44 46 C44 30 50 22 60 22 C70 22 76 30 76 46 C76 60 70 70 60 72 C50 70 44 60 44 46Z', '#0c0912');
      s += p('M60 74 L60 112 M48 80 L44 112 M72 80 L76 112', null, '#1e1828', 0.9);
      // The mask, a little too pale, with a crack, gold leaf at the brow and violet ribbons.
      s += cel('M47 34 Q60 26 73 34 Q76 52 60 66 Q44 52 47 34Z', '#e6e0d4', '#b8b0a2', '#fbf8f2', { k: 4 });
      s += p('M47 34 Q60 26 73 34', null, '#c9a24a', 2) + p('M47 34 Q60 28 73 34', null, '#f0d88a', 0.6);
      s += p('M50.5 42 Q54.5 38.5 58 42 Q54.5 44.5 50.5 42Z M62 42 Q65.5 38.5 69.5 42 Q65.5 44.5 62 42Z', '#0c0912', INK, 0.5);
      s += p('M55 54 Q60 56 65 54', null, '#7a6a72', 0.8) + p('M66 31 L63 38 L66 43 L64 48', null, '#6a6058', 0.6);
      s += p('M73 36 C84 40 88 52 84 66 M47 36 C36 40 32 52 36 66', null, '#5a3e7a', 1.8) + p('M73 36 C84 40 88 52 84 66', null, '#7a5a9a', 0.6);
      // The tag on its string.
      s += p('M84 66 Q88 76 90 84', null, '#8a8070', 0.6) + tag(92, 90, 'role/acolyte', { size: 6, rot: 8 });
      return s;
    },

    // The Session Warden: a jailer holding the hour her session was given, almost run out.
    c1warden: () => {
      let s = person(LOOK.warden, 'cold', HX, HY, H);
      // The hourglass, held before her: brass ends, posts, and the last of the sand.
      const glass = 'M50 52 Q50 64 58 70 Q50 76 50 88 H70 Q70 76 62 70 Q70 64 70 52Z';
      s += p(glass, '#cfd6de', null, null, 0.5) + p('M50 52 Q50 64 58 70 L62 70 Q70 64 70 52Z', '#b8c4d0', null, null, 0.35);
      s += p('M57.5 66 Q60 67 62.5 66 L61 70 L59 70Z', '#d9b46a') + p('M60 70 V86', null, '#d9b46a', 0.7) + p('M52 88 Q60 78 68 88Z', '#d9b46a', null, null, 0.95);
      s += p(glass, null, INK, 0.8) + p('M52 55 Q52 64 57 68', null, '#fff', 0.7, 0.7);
      s += cel('M44 46 H76 V52 H44Z', '#a8843e', '#6e5422', '#d8b86a', { k: 2, r: 0.6 }) + cel('M44 88 H76 V94 H44Z', '#a8843e', '#6e5422', '#d8b86a', { k: 2, r: 0.6 });
      s += [47, 73].map(x => cel(`M${x - 1.4} 52 H${x + 1.4} V88 H${x - 1.4}Z`, '#6a4e2e', '#46321c', null, { k: 1, w: 0.6 })).join('');
      s += tag(92, 30, '3600s', { size: 7, rot: 6 }) + p('M76 46 Q84 38 86 34', null, '#8a8070', 0.6);
      return s;
    },

    // The Two-Factor Sentinel: a knight with two shields, one for each thing the vault asks for.
    c1sentinel: () => {
      let s = person(LOOK.sentinel, 'neutral', HX, HY, H);
      const shield = 'M0 0 Q14 -4 28 0 Q30 30 14 46 Q-2 30 0 0Z';
      // MFA: a code on a fob. HTTPS: a padlock.
      s += at(20, 50, cel(shield, '#3e5274', '#28364e', '#6a80a4', { k: 5 }) + p('M2 4 Q14 0 26 4', null, '#8a96b0', 0.8)
        + K.r(7, 12, 14, 18, '#1e2434', INK, 0.8, null, 2) + K.r(9, 14, 10, 6, '#7ad0a0', null, null, 0.85, 1) + txt(14, 18.6, '481', { size: 4.6, fill: '#10301e' }) + txt(14, 39, 'MFA', { size: 6, fill: '#e8e2d0', font: 'Cinzel, Georgia, serif' }), -6);
      s += at(72, 48, cel(shield, '#3e5a4a', '#283c30', '#6a8a74', { k: 5 }) + p('M2 4 Q14 0 26 4', null, '#8aa694', 0.8)
        + p('M10 18 V13 Q14 6 18 13 V18', null, '#d9b44a', 1.6) + cel('M8 18 H20 V28 H8Z', '#d9b44a', '#9a7a2a', '#f0d88a', { k: 2, r: 0.5, w: 0.7 }) + txt(14, 39, 'TLS', { size: 6, fill: '#e8e2d0', font: 'Cinzel, Georgia, serif' }), 6);
      return s;
    },

    // Kyu, the explicit Deny: Uptima's apprentice, in black, holding the one statement that beats every Allow.
    kyuboss: () => person(K.cast.kyu, 'cold', HX, HY, H)
      + at(60, 80, cel('M-46 -7 H46 Q48 -7 48 -5 V5 Q48 7 46 7 H-46 Q-48 7 -48 5 V-5 Q-48 -7 -46 -7Z', '#e8dcc0', '#c4b48e', '#f8f2e2', { k: 3, r: 0.6 })
        + p('M-48 -5 Q-52 0 -48 5 M48 -5 Q52 0 48 5', null, '#a89870', 1.2)
        + txt(0, 2.6, '"Effect": "Deny"', { size: 7.4, fill: '#9a1f2e' }) + c(40, 6, 3.4, '#8a1a26', INK, 0.6), -3),

    // Uptima before her throne, crowned, reading her logs (she reads them first; she is very proud of that).
    uptimaboss: () => {
      let s = cel('M20 113 V30 Q20 8 60 6 Q100 8 100 30 V113Z', '#4a3e66', '#2e2644', '#6a5a8a', { k: 9 });
      s += p('M20 30 Q20 8 60 6 Q100 8 100 30', null, '#c9a24a', 2) + p('M28 34 Q28 16 60 14 Q92 16 92 34 V113 H28Z', '#3a3054', null, null, 0.7);
      s += c(60, 12, 3, '#3b8bff', INK, 0.6) + [[22, 70], [98, 70]].map(([x, y]) => cel(`M${x - 4} ${y} H${x + 4} V113 H${x - 4}Z`, '#5a4e78', '#3a3054', '#7a6e9a', { k: 2, w: 0.8 }) + c(x, y - 2, 4, '#c9a24a', INK, 0.7)).join('');
      s += person(K.cast.uptima, 'smug', HX, HY, H);
      // The logs: a long scroll she has clearly read many times.
      s += at(92, 84, cel('M-9 -16 H9 V16 H-9Z', '#ece2c8', '#c8b994', '#fbf6e8', { k: 3, r: 0.5, w: 0.8 }) + p('M-6 -10 H6 M-6 -6 H6 M-6 -2 H4 M-6 2 H6 M-6 6 H3 M-6 10 H5', null, '#6a5a50', 0.6)
        + p('M-10 -16 H10 M-10 16 H10', null, '#8a6a3a', 2), 10);
      return s;
    },

    // ---------- Chapter 2, raid floor 1: Intake ----------
    // The Poison Pill: one letter nobody can deliver, stained and swollen, stamped RETURNED every time it comes back.
    poisonpill: () => {
      const d = 'M18 46 Q16 40 22 40 H98 Q104 40 102 46 L100 104 Q100 110 94 110 H26 Q20 110 20 104Z';
      let s = cel(d, '#cfc4a4', '#a39876', '#e6dcc0', { k: 8, inner: e(40, 92, 16, 9, '#6a7a3a', null, null, 0.35) + e(82, 60, 12, 7, '#6a7a3a', null, null, 0.3) + e(70, 100, 9, 5, '#4a5a2a', null, null, 0.35) });
      s += cel('M20 44 L60 78 L100 44 Q60 52 20 44Z', '#bdb292', '#968a6a', '#d8cfb2', { k: 3 });
      // In the shadow under the flap, something looks back.
      s += p('M30 54 L48 69 M90 54 L72 69', null, '#1a1612', 3.2, 0.85) + glint(60, 63, 42, '#c8e890', 1.4);
      // The seal: sickly green wax, still running.
      s += cel('M52 70 Q60 62 68 70 Q70 80 60 84 Q50 80 52 70Z', '#5a7a32', '#3a5420', '#8aa85a', { k: 3 });
      s += p('M56 82 Q55 92 57 98 Q59 94 58 84Z M63 83 Q65 88 64 92 Q62 90 62 84Z', '#4a6a28', INK, 0.5);
      s += at(38, 56, K.r(-14, -5, 28, 10, 'none', '#9a1f2e', 0.9, 0.7) + txt(0, 2.3, 'RETURNED', { size: 5.6, fill: '#9a1f2e', op: 0.75 }), -12);
      s += at(84, 92, K.r(-14, -5, 28, 10, 'none', '#9a1f2e', 0.9, 0.55) + txt(0, 2.3, 'RETURNED', { size: 5.6, fill: '#9a1f2e', op: 0.6 }), 9);
      s += tag(78, 26, 'received ×40', { size: 6.4, rot: 5 }) + p('M90 40 Q86 34 84 32', null, '#8a8070', 0.6);
      return s;
    },
    // The Visibility Ghost: a shrouded clerk who turns up twice, the second copy already there before the first is
    // finished, with the letter and the watch whose thirty seconds ran out mid-job.
    visghost: () => {
      const shroud = 'M20 112 C18 88 22 68 32 58 C36 54 38 50 38 44 C36 30 42 16 54 14 C66 16 72 30 70 44 C70 50 72 54 76 58 C86 68 90 88 88 112 L80 106 L72 113 L64 106 L56 113 L48 106 L40 113 L32 106 L26 113Z';
      let s = `<g opacity=".38" transform="translate(16 -4)">${cel(shroud, '#8a86a0', '#5e5a76', '#aaa6c0', { k: 8 })}${p('M42 34 Q46 31 50 34 Q50 43 46 46 Q42 43 42 34Z M58 34 Q62 31 66 34 Q66 43 62 46 Q58 43 58 34Z', '#120e1c')}</g>`;
      s += cel(shroud, '#9a96ae', '#686480', '#c4c0d6', { k: 10, inner: p('M40 50 C38 70 40 90 38 108 M62 52 C66 72 66 92 68 108', null, '#686480', 0.9, 0.8) + p('M30 34 C40 26 50 24 60 26', null, '#d8d4e6', 1, 0.5) });
      s += p('M42 34 Q46 31 50 34 Q50 43 46 46 Q42 43 42 34Z M58 34 Q62 31 66 34 Q66 43 62 46 Q58 43 58 34Z', '#120e1c') + p('M51.5 53 Q54 51.5 56.5 53 L55.6 64 Q54 66 52.4 64Z', '#120e1c', null, null, 0.8);
      // The letter, held in a fold of the shroud.
      s += letter(34, 70, 20, -8, { seal: '#8a1a26' }) + p('M24 66 Q30 76 42 74', null, INK, 0.9);
      // The watch: thirty seconds, and the job takes fifty.
      s += at(94, 80, cel('M-12 0 a12 12 0 1 0 24 0 a12 12 0 1 0 -24 0Z', '#b8944a', '#7a5e2a', '#e0c47a', { k: 3 }) + c(0, 0, 9, '#ece4d0', INK, 0.6)
        + p('M0 -9 A9 9 0 0 1 0 9', '#c0404a', null, null, 0.5) + p('M0 0 V-7 M0 0 L-1 7', null, INK, 0.9) + c(0, 0, 1, INK) + p('M-2 -12 V-15 H2 V-12', null, '#7a5e2a', 1.4) + txt(0, 21, '30s', { size: 6.5, fill: '#e8e2d0' }));
      return s;
    },
    // Twins: one order, delivered twice. Both hold parcel #4417; both insist they're the real one.
    twins2: () => [4, 66].map((x, i) => person(LOOK.twin, 'cold', x, 113 - 124, 124, i === 1)
      + at(x + 25, 78, cel('M-11 -9 H11 V9 H-11Z', '#a8845a', '#7a5a38', '#c8a478', { k: 3 }) + p('M0 -9 V9 M-11 0 H11', null, '#5a3e26', 0.8)
        + tag(0, 15, '#4417', { size: 6, w: 22 }), i ? 4 : -4)).join(''),
    // The Empty Clerk: at the counter all night, checking an empty tray. Every check is billed, and the spike of
    // receipts says so.
    emptyclerk: () => {
      let s = person(LOOK.clerk, 'tired', 60 - 0.2 * 134, -18, 134);
      s += cel('M6 70 H114 V113 H6Z', '#5a4030', '#3a281c', '#7a5a42', { k: 10, inner: p('M6 78 H114', null, '#2a1c12', 0.9) + p('M30 84 V113 M90 84 V113', null, '#3a281c', 0.7) });
      s += cel('M4 64 H116 V72 H4Z', '#6e5038', '#4a3424', '#94704e', { k: 3, r: 0.7 });
      // The tray: wire, empty.
      s += p('M70 58 L104 58 L100 66 L74 66Z', '#2a2430', null, null, 0.35) + p('M70 58 L104 58 L100 66 L74 66Z M76 58 L78 66 M84 58 L85 66 M92 58 L92 66 M98 58 L96 66', null, '#8a8696', 0.8);
      s += tag(98, 50, 'messages: 0', { size: 5.6, rot: 4, ink: '#9a1f2e' });
      // The spike: every empty receive, billed.
      s += p('M22 66 V42', null, '#3a3640', 1.2) + [0, 1, 2, 3, 4, 5].map(i => at(22, 62 - i * 3.4, cel('M-7 -1.6 H7 V1.6 H-7Z', i % 2 ? '#e6dcc4' : '#d8ceb4', '#b8ac90', null, { k: 1, w: 0.5 }), (i % 3 - 1) * 8)).join('');
      return s;
    },
    // The Backlog (elite): a heap of unsorted letters that has started to stand up. Her oldest is nine days old.
    backlog: () => {
      const heap = 'M4 113 C8 84 16 60 30 46 C38 30 50 18 62 18 C76 18 86 30 92 46 C104 60 112 84 116 113Z';
      let s = cel(heap, '#3e3634', '#26201e', '#5a504c', { k: 10 });
      const R = K.rng(11), tones = [PAPER, ['#d8ccae', '#b0a282', '#ece2c8'], ['#cfc8b8', '#a8a08e', '#e4dece']];
      const spots = [];
      for (let y = 104; y > 26; y -= 7) {
        const half = Math.min(54, (y - 14) * 0.62);
        for (let x = 60 - half + 6; x < 60 + half - 4; x += 13) spots.push([x + (R() - 0.5) * 6, y + (R() - 0.5) * 3, (R() - 0.5) * 50]);
      }
      spots.forEach(([x, y, r], i) => { if (!(y < 44 && Math.abs(x - 60) < 12)) s += letter(x, y, 13 + R() * 3, r, { col: tones[i % 3], w: 0.6 }); });
      // In the hollow at the top of the heap, two pale eyes.
      s += e(60, 36, 11, 7, '#120e14') + glint(60, 36, 10, '#e8dcb0', 1.3);
      s += tag(92, 12, 'oldest: 9d', { size: 6.4, rot: 6, ink: '#9a1f2e' }) + p('M82 18 Q80 26 82 32', null, '#8a8070', 0.6);
      return s;
    },
    // The Postmistress Without Post (floor boss): a standard queue in a uniform. Her letters arrive out of order, and
    // one arrives twice: 3, 1, 2, 2.
    postmistress: () => person(LOOK.postmistress, 'cold', HX, HY, H)
      + p('M30 30 Q40 22 50 28 M90 22 Q80 16 72 24 M26 66 Q36 72 44 66 M94 62 Q86 70 78 64', null, '#e8dcc0', 0.8, 0.5)
      + letter(16, 32, 24, -14, { n: '3' }) + letter(104, 24, 24, 12, { n: '1' }) + letter(14, 70, 24, 10, { n: '2' }) + letter(106, 64, 24, -8, { n: '2' }),

    // ---------- Chapter 2, raid floor 2: Fan-out ----------
    // The Town Crier: HEAR YE. His bell carries to every door at once, so every hit lands on everyone.
    towncrier: () => {
      let s = person(LOOK.crier, 'cry', HX, HY, H);
      s += at(77, 64, p('M-1 -12 V-8', null, '#5a3e26', 1.6) + cel('M-6 -8 Q0 -10 6 -8 Q8 2 10 6 H-10 Q-8 2 -6 -8Z', '#c9a24a', '#8a6a2a', '#ecd28a', { k: 3 }) + c(0, 8, 1.8, '#5a4a2a', INK, 0.5), -18);
      // The voice: rings that go to everyone, left and right.
      [[90, 52, 1], [30, 44, -1]].forEach(([x, y, d]) => {
        [8, 15, 22].forEach((r, i) => { s += p(`M${x + d * r * 0.5} ${y - r} A${r} ${r} 0 0 ${d > 0 ? 1 : 0} ${x + d * r * 0.5} ${y + r}`, null, '#e8d8a8', 1.4 - i * 0.3, 0.75 - i * 0.18); });
      });
      return s;
    },
    // The Bell With No Ringer: the rope is pulled, the bell is fine, nothing rings. Its rule's pattern says
    // "Order Placed"; every event says "OrderPlaced".
    bellnoringer: () => {
      let s = [18, 102].map(x => cel(`M${x - 4} 10 H${x + 4} V113 H${x - 4}Z`, '#5a402a', '#3a281a', '#7a5a3e', { k: 3 })).join('');
      s += cel('M8 8 H112 V16 H8Z', '#6a4c32', '#46301e', '#8e6e4c', { k: 3 });
      s += p('M60 16 V22', null, '#3a3640', 2.4);
      s += cel('M36 78 Q36 34 60 24 Q84 34 84 78 Q90 82 90 88 H30 Q30 82 36 78Z', '#9a7434', '#6a4c1e', '#d0a858', { k: 9 });
      s += p('M40 40 Q46 30 56 27', null, '#e8c880', 1, 0.7) + p('M38 70 H82', null, '#6a4c1e', 0.8);
      // The mouth of the bell: dark, and no clapper in it.
      s += e(60, 88, 30, 5, '#1a1410', INK, 0.8);
      // The rope, pulled, from the wheel at the yoke down to the floor.
      s += p('M80 30 C92 50 88 80 92 104 Q96 112 104 112', null, '#a89070', 1.8) + p('M80 30 C92 50 88 80 92 104 Q96 112 104 112', null, '#6a5a44', 0.6);
      s += tag(54, 104, '"Order Placed"', { size: 7.4, strike: true, rot: -3 });
      return s;
    },
    // The Millrace: a mill whose race is split into shards. Inside each, the sensor's letters keep perfect order;
    // across them, the readings come out 1, 2, 3, 4, 5, 6 in no order at all.
    millrace: () => {
      let s = cel('M58 36 a30 30 0 1 0 60 0 a30 30 0 1 0 -60 0Z', '#5a402a', '#3a281a', '#7a5a3e', { k: 6 });
      s += c(88, 36, 22, 'none', '#3a281a', 1.2);
      for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5; s += p(`M88 36 L${(88 + Math.cos(a) * 29).toFixed(1)} ${(36 + Math.sin(a) * 29).toFixed(1)}`, null, '#2a1c12', 1.4); }
      s += c(88, 36, 5, '#3a3640', INK, 0.8);
      // Two stone races, the shards, each with its own water and its own order.
      s += cel('M0 62 H120 V113 H0Z', '#5a5660', '#3a3640', '#7a7682', { k: 4, inner: p('M0 88 H120', null, '#2a2830', 1) });
      [[66, 87], [90, 111]].forEach(([y0, y1]) => { s += cel(`M2 ${y0} H118 V${y1 - 4} H2Z`, '#2e4a5e', '#1e3242', '#4a7088', { k: 3, r: 0.8, w: 0.7 }); s += p(`M6 ${(y0 + y1) / 2 - 3} q6 -2 12 0 t12 0 M44 ${(y0 + y1) / 2} q6 -2 12 0 t12 0`, null, '#8ab0c8', 0.6, 0.6); });
      [['1', 16, 75], ['4', 50, 75], ['5', 84, 75], ['2', 30, 99], ['3', 64, 99], ['6', 98, 99]].forEach(([n, x, y], i) => { s += letter(x, y, 22, (i % 2 ? 5 : -4), { n }); });
      return s;
    },
    // Thundering Herd (elite): one letter drops in the tray, and every clerk in the building wakes up for it at once.
    herd: () => {
      let s = c(60, -8, 18, '#ffe0a0', null, null, 0.14) + letter(60, -8, 24, 0, { seal: '#8a1a26' });
      s += p('M40 -14 L32 -18 M80 -14 L88 -18 M46 4 L40 10 M74 4 L80 10', null, '#e8d8a8', 0.9, 0.7);
      s += back(person(LOOK.herd1, 'woke', 12, 2, 104) + person(LOOK.herd4, 'woke', 66, 0, 106, true), 0.72);
      s += person(LOOK.herd2, 'woke', -8, 18, 96) + person(LOOK.herd3, 'woke', 90, 18, 96, true);
      return s;
    },
    // The Belfry (floor boss): a bell tower with something awake in it. One stroke of its bell, and the same blow
    // goes out to every subscriber at once: four copies of one letter.
    belfry: () => {
      let s = cel('M28 113 L32 20 H88 L92 113Z', '#6a6470', '#46424e', '#8a8494', { k: 10, inner: [32, 46, 60, 74, 88, 102].map((y, i) => p(`M20 ${y} H100 M${i % 2 ? 50 : 40} ${y - 14} V${y} M${i % 2 ? 72 : 64} ${y - 14} V${y}`, null, '#3a3640', 0.6, 0.6)).join('') });
      s += cel('M26 22 L60 -10 L94 22Z', '#3a3448', '#26202e', '#5a5268', { k: 6 }) + p('M60 -10 V-17 M56 -14.5 H64', null, '#46424e', 1.4) + cel('M24 18 H96 V24 H24Z', '#5a5464', '#3a3644', '#7a7486', { k: 2, r: 0.6 });
      s += p('M40 96 V52 Q40 32 60 30 Q80 32 80 52 V96Z', '#0e0b14', INK, 1) + p('M40 96 H80', null, '#46424e', 2);
      s += glint(60, 44, 16, '#f0e0a8', 1.7);
      s += cel('M45 88 Q45 62 60 56 Q75 62 75 88 Q79 90 79 94 H41 Q41 90 45 88Z', '#9a7434', '#6a4c1e', '#d0a858', { k: 6 });
      s += p('M60 30 V56', null, '#3a3640', 1.2);
      // Four copies of the same letter, one to each subscriber, every one of them a hit.
      [[10, 42, -16], [8, 78, 10], [110, 42, 16], [112, 78, -10]].forEach(([x, y, r]) => { s += p(`M${x < 60 ? 44 : 76} ${y < 60 ? 66 : 80} L${x < 60 ? x + 10 : x - 10} ${y}`, null, '#e8d8a8', 0.8, 0.5) + letter(x, y, 20, r, { seal: '#8a1a26' }); });
      s += tag(60, 106, 'fan-out ×4', { size: 7.4, paper: '#e0d6bc' });
      return s;
    }
  };
  // Anything else without art: a hooded figure with no face to speak of.
  F.generic = () => cel('M26 113 C24 80 28 50 38 36 C44 22 52 16 60 16 C68 16 76 22 82 36 C92 50 96 80 94 113Z', '#4a4458', '#2e2a3a', '#6a6478', { k: 9 })
    + p('M44 44 C44 30 50 24 60 24 C70 24 76 30 76 44 C76 58 70 66 60 68 C50 66 44 58 44 44Z', '#0c0912') + glint(60, 46, 10, '#d8d4e8', 1.4);

  // The whole foe, graded with one light like the cast: warm on the lit side, falling into shadow on the far one.
  function grade(body) {
    const id = uid();
    return `<g id="${id}">${body}</g>`
      + `<filter id="${id}w"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter>`
      + `<mask id="${id}m" maskUnits="userSpaceOnUse" x="-20" y="-20" width="160" height="160"><use href="#${id}" filter="url(#${id}w)"/></mask>`
      + K.lin(id + 'g', [[0, '#ffd8a0', 0.12], [0.45, '#ffd8a0', 0], [0.6, '#140f28', 0], [1, '#140f28', 0.38]], 0, 0.2, 1, 0.5)
      + `<rect x="-20" y="-20" width="160" height="160" fill="url(#${id}g)" mask="url(#${id}m)"/>`;
  }
  const memo = {};
  const art = id => () => memo[id] || (memo[id] = grade(F[id]()));

  // ---------- Hit sparks and emotes ----------
  const spark = {
    slash_02: K.uri(K.svg('0 0 100 100', '<path d="M10 82 Q50 60 92 14 Q60 58 14 90Z" fill="#fff" opacity=".95"/><path d="M18 80 Q52 58 86 22" fill="none" stroke="#fffbe0" stroke-width="3"/>')),
    spark_05: K.uri(K.svg('0 0 100 100', '<path d="M50 4 L58 42 L96 50 L58 58 L50 96 L42 58 L4 50 L42 42Z" fill="#fff"/>')),
    star_06: K.uri(K.svg('0 0 100 100', '<path d="M50 8 L61 38 L94 40 L68 60 L77 92 L50 74 L23 92 L32 60 L6 40 L39 38Z" fill="#fff"/>'))
  };
  K.spark = spark;
  function emote(ctx, name, px, py, S) {
    // A white bubble with a mark drawn in ink, sized like the sheet's emotes.
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - S * 0.62, py - S * 1.1, S * 1.24, S * 1.12, 6) : ctx.rect(px - S * 0.62, py - S * 1.1, S * 1.24, S * 1.12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px, py + 6); ctx.lineTo(px + 4, py); ctx.closePath(); ctx.fill();
    const cx = px, cy = py - S * 0.54, u = S / 16;
    ctx.fillStyle = INK; ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * u; ctx.lineCap = 'round';
    const mark = {
      alert: () => { ctx.fillRect(cx - u, cy - 6 * u, 2 * u, 8 * u); ctx.fillRect(cx - u, cy + 4 * u, 2 * u, 2 * u); },
      heart: () => { ctx.fillStyle = '#e04a6a'; ctx.beginPath(); ctx.moveTo(cx, cy + 5 * u); ctx.bezierCurveTo(cx - 9 * u, cy - 2 * u, cx - 4 * u, cy - 8 * u, cx, cy - 3 * u); ctx.bezierCurveTo(cx + 4 * u, cy - 8 * u, cx + 9 * u, cy - 2 * u, cx, cy + 5 * u); ctx.fill(); },
      dots: () => [-4, 0, 4].forEach(d => { ctx.beginPath(); ctx.arc(cx + d * u, cy, 1.4 * u, 0, 7); ctx.fill(); }),
      idea: () => { ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(cx, cy - u, 4.5 * u, 0, 7); ctx.fill(); ctx.stroke(); ctx.fillStyle = INK; ctx.fillRect(cx - 2 * u, cy + 4 * u, 4 * u, 2 * u); },
      music: () => { ctx.beginPath(); ctx.arc(cx - 2 * u, cy + 4 * u, 2 * u, 0, 7); ctx.fill(); ctx.fillRect(cx - 0.4 * u, cy - 6 * u, 1.4 * u, 10 * u); ctx.fillRect(cx, cy - 6 * u, 5 * u, 1.6 * u); },
      laugh: () => { ctx.beginPath(); ctx.arc(cx, cy, 5 * u, 0, Math.PI); ctx.fill(); },
      sleep: () => { ctx.font = `700 ${9 * u}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('z', cx, cy + 3 * u); },
      star: () => { ctx.fillStyle = '#ffd25a'; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 2.2 : 5.5) * u; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
    }[name];
    if (mark) mark();
    ctx.restore();
  }

  if (!K.on) return;
  // Colours (the severity bar's tint) and animations as before, so combat behaves the same; chapter 1's five vector
  // incidents are redrawn here only for the vector demo (the painted game keeps js/ch1-art.js's).
  const COL = { c1door: ['#ffcf33', 'shake'], c1faithful: ['#9fb2cf', 'float'], c1mask: ['#e0d4ff', 'float'], c1warden: ['#ffd76a', 'float'], c1sentinel: ['#b9c4d6', 'float'],
    kyuboss: ['#b9a3ff', 'float'], uptimaboss: ['#ffd9a0', 'float'], poisonpill: ['#9be07a', 'squish'], visghost: ['#efeaff', 'float'], twins2: ['#ffc070', 'shake'],
    emptyclerk: ['#c9b39a', 'float'], backlog: ['#e8d8b8', 'squish'], postmistress: ['#8fa0d8', 'float'], towncrier: ['#ff9a6b', 'shake'], bellnoringer: ['#e8c86a', 'float'],
    millrace: ['#6aaee0', 'float'], herd: ['#ffb27a', 'shake'], belfry: ['#c8a0e0', 'float'] };
  K.installs.push(() => {
    Object.keys(COL).forEach(id => SD.art.addFoe(id, { col: COL[id][0], anim: COL[id][1], svg: art(id) }));
    // Never fall back to a painted monster: an incident with no art of its own gets the plain one.
    const enemy = SD.art.enemy;
    SD.art.enemy = function (sprite, boss, hue) {
      if (!SD.art.hasFoe(sprite) || /<image /.test(enemy(sprite, boss, hue))) SD.art.addFoe(sprite, { col: '#c9c4d6', anim: 'float', svg: art('generic') });
      return enemy(sprite, boss, hue);
    };
    SD.ui.sparkArt = img => spark[img] || spark.spark_05;
    SD.scene.emoteArt = emote;
  });
})();
