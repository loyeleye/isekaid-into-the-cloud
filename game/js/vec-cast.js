// The vector proof of concept's cast: one figure drawn in code per character, in the kit's house style (js/vec-kit.js).
// A figure is full length in a 400 x 1000 box; the visual-novel sprite is its top 600 (waist up), the dialogue
// portrait its head and shoulders, and the title screen and battles use the whole body. Faces are data: each face
// names its eyes, brows and mouth, so a new expression is one line in FACES.
(function () {
  const K = SD.vec, INK = K.INK;
  const { p, c, e } = K;
  const CAST = K.cast = {};

  // ---------- Faces ----------
  // eyes: open half wide down closed happy side · brow: flat up knit sad arch · mouth: line soft smile smirk open frown grim sob grin
  const FACES = K.FACES = {
    neutral: { eyes: 'open', brow: 'flat', mouth: 'line' },
    smile: { eyes: 'happy', brow: 'up', mouth: 'smile', blush: 1 },
    warm: { eyes: 'half', brow: 'sad', mouth: 'soft', blush: 0.6 },
    earnest: { eyes: 'open', brow: 'up', mouth: 'line', lean: 1 },
    amused: { eyes: 'half', brow: 'arch', mouth: 'smirk' },
    sad: { eyes: 'down', brow: 'sad', mouth: 'frown' },
    frustrated: { eyes: 'half', brow: 'knit', mouth: 'grim' },
    unreadable: { eyes: 'half', brow: 'flat', mouth: 'line', shade: 0.35 },
    smirk: { eyes: 'half', brow: 'arch', mouth: 'smirk', blush: 0.3 },
    cold: { eyes: 'half', brow: 'flat', mouth: 'line', shade: 0.5 },
    grief: { eyes: 'down', brow: 'sad', mouth: 'sob', tears: 1 },
    anger: { eyes: 'open', brow: 'knit', mouth: 'grim' },
    stone: { eyes: 'half', brow: 'knit', mouth: 'line', shade: 0.25 },
    shock: { eyes: 'wide', brow: 'up', mouth: 'open' },
    desperate: { eyes: 'wide', brow: 'sad', mouth: 'open', tears: 1 },
    frozen: { eyes: 'wide', brow: 'flat', mouth: 'line', shade: 0.2 },
    tired: { eyes: 'half', brow: 'sad', mouth: 'line' },
    happy: { eyes: 'happy', brow: 'up', mouth: 'grin', blush: 0.7 },
    laugh: { eyes: 'happy', brow: 'up', mouth: 'open', blush: 0.5 },
    confused: { eyes: 'side', brow: 'arch', mouth: 'frown' },
    angry: { eyes: 'open', brow: 'knit', mouth: 'frown' },
    smug: { eyes: 'half', brow: 'arch', mouth: 'smirk' },
    blush: { eyes: 'down', brow: 'sad', mouth: 'soft', blush: 1 }
  };

  // ---------- The head ----------
  const FACE = 'M142 168 C142 205 152 238 200 268 C248 238 258 205 258 168 C258 118 232 98 200 98 C168 98 142 118 142 168Z';
  // One eye, drawn as the viewer's left eye (outer corner at -x). The right eye is its mirror.
  function eye(x, y, kind, col, lash, id) {
    const white = '#fbf7f2';
    if (kind === 'closed') return p(`M${x - 15} ${y + 2} Q${x} ${y + 9} ${x + 15} ${y + 1}`, null, lash, 4);
    if (kind === 'happy') return p(`M${x - 15} ${y + 4} Q${x} ${y - 9} ${x + 15} ${y + 3}`, null, lash, 4.5);
    const top = { open: -14, half: -5, wide: -17, down: -2, side: -12 }[kind] || -14;
    const shape = `M${x - 15} ${y - 2 + (kind === 'half' || kind === 'down' ? 3 : 0)} Q${x} ${y + top} ${x + 15} ${y - 3 + (kind === 'half' || kind === 'down' ? 3 : 0)} Q${x + 13} ${y + 12} ${x} ${y + 13} Q${x - 13} ${y + 12} ${x - 15} ${y - 2}Z`;
    const ix = x + (kind === 'side' ? 5 : 0), iy = y + (kind === 'down' ? 4 : 1), ir = kind === 'wide' ? 8 : 10;
    const iris = e(ix, iy, ir, ir * 1.25, col) + p(`M${ix - ir} ${iy - 2} Q${ix} ${iy - ir * 1.5} ${ix + ir} ${iy - 2} L${ix + ir} ${iy - 14} L${ix - ir} ${iy - 14}Z`, INK, null, null, 0.35)
      + e(ix, iy + 1, ir * 0.42, ir * 0.62, '#1a1426') + c(ix - ir * 0.35, iy - ir * 0.45, ir * 0.3, '#fff') + c(ix + ir * 0.4, iy + ir * 0.5, ir * 0.14, '#fff', null, null, 0.8);
    const lidY = { open: -1, half: 2, wide: -3, down: 3, side: -1 }[kind];
    return `<clipPath id="${id}"><path d="${shape}"/></clipPath>` + p(shape, white) + `<g clip-path="url(#${id})">${iris}</g>`
      + p(`M${x - 17} ${y + lidY} Q${x - 2} ${y + top - 2 + (kind === 'half' || kind === 'down' ? 3 : 0)} ${x + 16} ${y - 4 + lidY}`, null, lash, 4.5)
      + p(`M${x - 17} ${y + lidY} l-5 -4`, null, lash, 3)
      + p(`M${x - 8} ${y + 13} Q${x} ${y + 15} ${x + 8} ${y + 12}`, null, lash, 1.4, 0.55);
  }
  function brow(x, y, kind, col, right) {
    const d = {
      flat: `M${x - 16} ${y - 28} Q${x - 2} ${y - 33} ${x + 14} ${y - 30}`,
      up: `M${x - 16} ${y - 33} Q${x - 2} ${y - 41} ${x + 14} ${y - 37}`,
      knit: `M${x - 17} ${y - 34} Q${x - 2} ${y - 33} ${x + 14} ${y - 24}`,
      sad: `M${x - 16} ${y - 26} Q${x} ${y - 30} ${x + 14} ${y - 37}`
    };
    const k = kind === 'arch' ? (right ? 'up' : 'flat') : kind;
    return p(d[k] || d.flat, null, col, 4.5);
  }
  function mouth(kind) {
    const lip = '#7a2a34';
    switch (kind) {
      case 'soft': return p('M187 238 Q200 247 213 238', null, INK, 2.6);
      case 'smile': return p('M183 235 Q200 256 217 235 Q200 242 183 235Z', lip, INK, 2.4);
      case 'grin': return p('M181 234 Q200 258 219 234 Q200 240 181 234Z', lip, INK, 2.4) + p('M186 237 Q200 241 214 237 L212 241 Q200 244 188 241Z', '#fff');
      case 'smirk': return p('M188 242 Q204 244 215 233', null, INK, 2.6) + p('M213 231 l4 4', null, INK, 2);
      case 'open': return e(200, 245, 7, 9, lip, INK, 2.2);
      case 'frown': return p('M188 245 Q200 237 212 245', null, INK, 2.6);
      case 'grim': return p('M185 242 L215 242', null, INK, 3) + p('M185 242 l-3 3 M215 242 l3 3', null, INK, 2);
      case 'sob': return p('M187 247 Q193 236 200 240 Q207 236 213 247 Q200 251 187 247Z', lip, INK, 2.2);
      default: return p('M190 241 Q200 243 210 241', null, INK, 2.6);
    }
  }
  function face(L, F, uid) {
    const ex = 172, ey = 200, lash = L.lash || '#1f1828';
    let s = '';
    // Cheek shade on the side away from the light, and the hairline's shadow.
    s += p('M244 160 C254 196 248 228 214 258 C236 236 246 210 244 160Z', L.skinD, null, null, 0.7);
    s += p(L.nose || 'M202 213 Q206 222 199 226', null, L.skinD2 || L.skinD, 2.6);
    if (L.age) s += p('M156 228 Q162 238 168 240 M244 228 Q238 238 232 240 M178 252 Q200 262 222 252', null, L.skinD2 || L.skinD, 1.8, 0.8);
    if (L.stubble) s += p('M152 222 C160 246 180 262 200 266 C220 262 240 246 248 222 C238 250 220 258 200 258 C180 258 162 250 152 222Z', L.stubble, null, null, 0.55);
    if (F.blush || L.blush) s += e(162, 228, 14, 6, '#ff6f86', null, null, 0.28 * (F.blush || L.blush)) + e(238, 228, 14, 6, '#ff6f86', null, null, 0.28 * (F.blush || L.blush));
    if (L.eyes === 'glow') {
      s += e(ex, ey, 13, 5, L.eye) + e(400 - ex, ey, 13, 5, L.eye) + e(ex, ey, 22, 10, L.eye, null, null, 0.25) + e(400 - ex, ey, 22, 10, L.eye, null, null, 0.25);
    } else {
      s += eye(ex, ey, F.eyes, L.eye, lash, uid + 'eL');
      s += `<g transform="translate(400 0) scale(-1 1)">${eye(ex, ey, F.eyes === 'side' ? 'open' : F.eyes, L.eye, lash, uid + 'eR')}</g>`;
    }
    s += brow(ex, ey, F.brow, L.browCol || L.hairD, false);
    s += `<g transform="translate(400 0) scale(-1 1)">${brow(ex, ey, F.brow, L.browCol || L.hairD, true)}</g>`;
    s += L.mouth ? L.mouth(F) : mouth(F.mouth);
    if (F.tears) s += p('M162 214 C158 228 160 238 164 244 C168 238 168 228 162 214Z M238 214 C242 228 240 238 236 244 C232 238 232 228 238 214Z', '#bfe3ff', '#7fb0dc', 1.5, 0.9);
    if (F.shade) s += `<linearGradient id="${uid}sh" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14101f" stop-opacity="${F.shade}"/><stop offset=".55" stop-color="#14101f" stop-opacity="${F.shade * 0.8}"/><stop offset="1" stop-color="#14101f" stop-opacity="0"/></linearGradient>`
      + `<path d="M130 120 L270 120 L270 236 L130 236Z" fill="url(#${uid}sh)" clip-path="url(#${uid}face)"/>`;
    return s;
  }

  // ---------- Hair ----------
  // Each style gives what goes behind the head (back) and in front of it (front), in the figure's colours.
  const HAIR = {
    mira: L => ({
      back: p('M116 196 C106 112 150 62 200 60 C250 62 294 112 284 196 C292 256 304 300 318 338 L82 338 C96 300 108 256 116 196Z', L.hood, INK, 3)
        + p('M250 80 C280 110 290 160 284 220 C292 260 300 300 312 334 L268 334 C276 280 274 200 250 80Z', L.hoodD, null, null, 0.8),
      front: p('M148 150 C140 186 144 226 156 256 L166 250 C158 220 156 186 160 152Z', L.hair, INK, 2.5) + p('M252 150 C260 186 256 226 244 256 L234 250 C242 220 244 186 240 152Z', L.hair, INK, 2.5)
        + p('M136 176 C132 106 166 78 200 78 C234 78 268 106 264 176 L256 174 C256 118 232 92 200 92 C168 92 144 118 144 174Z', L.hood, INK, 3)
        + p('M146 134 Q200 112 254 134 L252 150 Q200 130 148 150Z', L.band, INK, 2.5) + p('M150 148 Q200 132 250 148 L250 154 Q200 140 150 154Z', L.hair, null, null, 0.9)
    }),
    locs: L => {
      let back = p('M128 186 C116 112 158 78 200 78 C242 78 284 112 272 186 L290 336 L110 336Z', L.hair, INK, 3);
      for (let i = 0; i < 7; i++) { const x = 126 + i * 25; back += p(`M${x} 200 C${x - 4} 250 ${x + 2} 300 ${x} 334`, null, L.hairD, 3, 0.8); }
      let front = p('M138 174 C132 110 166 84 200 84 C234 84 268 110 262 174 C252 138 232 120 200 118 C168 120 148 138 138 174Z', L.hair, INK, 3);
      [[140, 136], [154, 128], [246, 128], [260, 136]].forEach(([x, y], i) => {
        const dx = i < 2 ? -6 : 6;
        front += p(`M${x - 9} ${y} C${x - 10 + dx} ${y + 50} ${x - 8 + dx} ${y + 90} ${x - 6 + dx * 1.4} ${y + 130} L${x + 8 + dx * 1.4} ${y + 130} C${x + 8 + dx} ${y + 90} ${x + 8} ${y + 50} ${x + 9} ${y}Z`, L.hair, INK, 2.5);
        front += p(`M${x} ${y + 14} l0 6 M${x + dx * 0.4} ${y + 50} l0 6 M${x + dx * 0.8} ${y + 90} l0 6`, null, L.hairL, 2.5, 0.7);
      });
      return { back, front: front + p('M178 92 Q200 86 222 92', null, L.hairL, 4, 0.6) };
    },
    bob: L => ({
      back: p('M126 178 C120 106 160 78 200 78 C240 78 280 106 274 178 L280 266 C268 276 248 276 236 270 L164 270 C152 276 132 276 120 266Z', L.hair, INK, 3),
      front: p('M136 178 C130 108 166 82 200 82 C234 82 270 108 264 178 L252 160 L238 168 L224 156 L210 166 L196 156 L182 166 L168 156 L154 168Z', L.hair, INK, 3)
        + p('M140 160 L134 264 L156 270 L154 172Z', L.hair, INK, 2.5) + p('M260 160 L266 264 L244 270 L246 172Z', L.hair, INK, 2.5)
        + p('M170 98 Q196 90 222 96', null, L.hairL, 5, 0.55)
        + (L.ribbon ? p('M250 112 l20 -14 l2 22Z M250 112 l18 14 l-16 6Z', L.ribbon, INK, 2) + c(250, 112, 6, L.ribbon, INK, 2) : '')
    }),
    slick: L => ({
      back: c(200, 80, 24, L.hair, INK, 3) + p('M186 74 Q200 66 214 74', null, L.hairL, 3, 0.6),
      front: p('M140 172 C136 108 168 86 200 86 C232 86 264 108 260 172 C254 134 232 116 200 114 C168 116 146 134 140 172Z', L.hair, INK, 3)
        + p('M160 108 Q200 96 240 108 M152 124 Q200 108 248 124', null, L.hairL, 2.5, 0.6)
    }),
    freya: L => {
      let braid = '';
      for (let i = 0; i < 7; i++) { const y = 246 + i * 30, x = 146 - i * 4; braid += e(x, y, 15 - i * 0.6, 18, i % 2 ? L.hairD : L.hair, INK, 2.5); }
      return {
        back: p('M124 182 C118 104 158 74 200 74 C242 74 282 104 276 182 L280 262 C266 274 246 272 236 266 L164 266 C150 272 132 272 120 262Z', L.hair, INK, 3),
        front: braid + e(146, 470, 10, 8, L.tie || '#2c8a4b', INK, 2)
          + p('M134 178 C128 104 168 80 204 80 C240 80 272 106 266 176 C252 136 232 118 214 116 C196 132 170 150 150 158 C142 164 138 170 134 178Z', L.hair, INK, 3)
          + p('M262 160 L268 260 L246 268 L248 170Z', L.hair, INK, 2.5)
          + p('M176 96 Q206 86 236 98', null, L.hairL, 5, 0.6)
      };
    },
    long: L => ({
      back: p('M122 186 C114 104 158 74 200 74 C242 74 286 104 278 186 L292 540 C260 556 140 556 108 540Z', L.hair, INK, 3) + p('M250 120 C270 200 276 380 280 540 L250 548 C252 380 250 220 236 120Z', L.hairD, null, null, 0.7),
      front: p('M138 176 C132 108 166 82 200 82 C234 82 268 108 262 176 C254 138 230 116 205 110 L200 150 L195 110 C170 116 146 138 138 176Z', L.hair, INK, 3)
        + p('M140 162 C130 230 132 300 140 380 L158 380 C152 300 152 230 156 170Z', L.hair, INK, 2.5) + p('M260 162 C270 230 268 300 260 380 L242 380 C248 300 248 230 244 170Z', L.hair, INK, 2.5)
        + p('M168 96 Q190 88 206 92', null, L.hairL, 4, 0.5)
    }),
    uptima: L => ({
      back: p('M120 186 C112 100 158 70 200 70 C242 70 288 100 280 186 C296 300 300 420 290 520 L110 520 C100 420 104 300 120 186Z', L.hair, INK, 3),
      front: p('M136 178 C128 106 166 80 200 80 C234 80 272 106 264 178 C258 146 240 124 222 118 C214 132 196 140 176 136 C160 146 146 160 136 178Z', L.hair, INK, 3)
        + p('M138 160 C128 220 130 300 136 360 L156 360 C150 300 150 220 154 168Z', L.hair, INK, 2.5) + p('M262 160 C272 220 270 300 264 360 L244 360 C250 300 250 220 246 168Z', L.hair, INK, 2.5)
        + p('M156 78 L170 50 L186 70 L200 40 L214 70 L230 50 L244 78 Q200 66 156 78Z', '#ffd25a', INK, 2.5) + c(200, 62, 5, '#3b8bff', INK, 1.5)
    }),
    elder: L => ({
      back: c(200, 82, 20, L.hair, INK, 3),
      front: p('M142 168 C140 116 168 92 200 92 C232 92 260 116 258 168 C250 134 230 118 200 116 C170 118 150 134 142 168Z', L.hair, INK, 3)
        + p('M156 240 C160 290 180 318 200 322 C220 318 240 290 244 240 C232 262 214 270 200 270 C186 270 168 262 156 240Z', L.hair, INK, 2.5)
        + p('M176 248 Q200 240 224 248 Q212 256 200 252 Q188 256 176 248Z', L.hair, INK, 2)
    }),
    short: L => ({
      back: '',
      front: p('M138 176 C132 106 166 80 200 80 C234 80 268 106 262 176 L254 150 L240 140 L226 128 C206 138 176 136 160 128 L148 148Z', L.hair, INK, 3)
        + p('M170 98 Q196 88 224 96', null, L.hairL, 5, 0.5)
        + (L.topknot ? c(200, 70, 16, L.hair, INK, 3) + p('M190 82 L210 82 L206 92 L194 92Z', L.ribbon || '#b3242e', INK, 2) : '')
        + (L.beard ? p('M150 214 C152 262 180 290 200 292 C220 290 248 262 250 214 C240 246 222 256 200 256 C178 256 160 246 150 214Z', L.hair, INK, 2.5) : '')
    }),
    braids: L => ({
      back: p('M128 180 C122 108 160 80 200 80 C240 80 278 108 272 180 L270 230 L130 230Z', L.hair, INK, 3),
      front: [140, 260].map(x => [0, 1, 2, 3, 4].map(i => e(x + (x < 200 ? -4 : 4) * i, 250 + i * 26, 12, 15, i % 2 ? L.hairD : L.hair, INK, 2.2)).join('') + e(x + (x < 200 ? -18 : 18), 380, 8, 6, L.ribbon || '#7a6a9a', INK, 2)).join('')
        + p('M138 172 C132 108 166 84 200 84 C234 84 268 108 262 172 C246 140 226 126 200 128 C174 126 154 140 138 172Z', L.hair, INK, 3)
    }),
    saint: L => ({
      back: p('M110 200 C100 110 150 56 200 54 C250 56 300 110 290 200 L320 420 L80 420Z', L.veil, INK, 3) + p('M110 200 C100 110 150 56 200 54 C250 56 300 110 290 200 L320 420 L80 420Z', '#fff2b8', null, null, 0.25),
      front: p('M140 172 C134 110 166 86 200 86 C234 86 266 110 260 172 C246 140 226 128 200 128 C174 128 154 140 140 172Z', L.hair, INK, 3)
        + p('M130 176 C126 104 162 70 200 70 C238 70 274 104 270 176 L262 172 C262 116 234 84 200 84 C166 84 138 116 138 172Z', L.veil, INK, 2.5)
        + p('M176 74 L200 56 L224 74', null, '#ffd25a', 4)
    }),
    scarf: L => ({
      back: p('M118 200 C110 110 156 70 200 70 C244 70 290 110 282 200 L296 300 L104 300Z', L.scarf, INK, 3),
      front: p('M146 160 C150 140 170 130 200 130 C230 130 250 140 254 160 L254 150 C250 120 230 106 200 106 C170 106 150 120 146 150Z', L.hair, INK, 2.5)
        + p('M132 180 C128 108 164 80 200 80 C236 80 272 108 268 180 L258 176 C256 118 232 94 200 94 C168 94 144 118 142 176Z', L.scarf, INK, 3)
        + p('M150 262 Q200 300 250 262 L262 300 Q200 330 138 300Z', L.scarf, INK, 2.5)
    }),
    messy: L => ({
      back: p('M130 180 C122 110 162 82 200 82 C238 82 278 110 270 180 L276 240 L124 240Z', L.hair, INK, 3),
      front: p('M136 178 C128 104 168 78 204 80 C240 82 272 110 264 176 L254 150 L246 164 L236 140 L222 158 L212 132 L196 156 L184 134 L170 158 L160 140 L148 166Z', L.hair, INK, 3)
        + p('M176 96 Q200 90 226 98', null, L.hairL, 4, 0.5)
    })
  };

  // ---------- The body ----------
  const TORSO = 'M200 296 C170 298 140 304 120 316 C112 360 112 420 116 470 C114 560 108 680 104 780 L296 780 C292 680 286 560 284 470 C288 420 288 360 280 316 C260 304 230 298 200 296Z';
  const TORSO_SHADE = 'M244 302 C262 306 276 312 280 330 C286 380 286 430 284 470 C286 560 292 680 296 780 L258 780 C256 660 252 540 252 460 C254 400 252 340 244 302Z';
  const SLEEVE_L = 'M122 314 C98 324 86 350 82 392 L72 560 C70 590 72 620 76 646 L114 648 C114 614 118 584 122 560 L136 420 C138 380 136 340 122 314Z';
  const mirror = d => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (m, x, y) => `${400 - +x} ${y}`);
  const SLEEVE_R = mirror(SLEEVE_L);
  const hand = (x, y, col, s) => p(`M${x - 16} ${y - 10} C${x - 18} ${y + 10} ${x - 10} ${y + 24} ${x} ${y + 24} C${x + 10} ${y + 24} ${x + 18} ${y + 10} ${x + 16} ${y - 10}Z`, col, s || INK, 2.6);
  const COLLAR = {
    v: L => p('M174 300 L200 372 L226 300 Q200 312 174 300Z', L.under, INK, 2.5),
    cross: L => p('M172 300 L238 420 L254 408 L200 298Z', L.under, INK, 2.5) + p('M228 300 L190 370 L178 360 L206 298Z', L.under, INK, 2.5),
    chef: L => p('M174 294 Q200 308 226 294 L230 316 Q200 330 170 316Z', L.coat, INK, 2.5) + p('M168 330 L162 600 M232 330 L238 600', null, L.coatD, 2, 0.8)
      + [0, 1, 2, 3, 4].map(i => c(176 - i, 360 + i * 54, 5, '#e9e4dc', INK, 1.8) + c(224 + i, 360 + i * 54, 5, '#e9e4dc', INK, 1.8)).join(''),
    shirt: L => p('M176 300 L200 350 L224 300 Q200 310 176 300Z', L.under, INK, 2.5) + p('M176 300 L196 344 L170 336Z M224 300 L204 344 L230 336Z', L.collarCol || '#f2efe8', INK, 2),
    polo: L => p('M180 298 L200 334 L220 298 Q200 306 180 298Z', L.skin, INK, 2.2) + p('M178 296 L198 332 L168 330 L164 304Z M222 296 L202 332 L232 330 L236 304Z', L.coat, INK, 2.2) + p('M200 334 L200 380', null, INK, 2) + c(200, 352, 3, '#e9e4dc') + c(200, 370, 3, '#e9e4dc'),
    high: L => p('M168 286 Q200 300 232 286 L238 330 Q200 344 162 330Z', L.coat, INK, 2.5)
  };

  function figure(L, F, uid, o) {
    o = o || {};
    let s = '';
    const hair = HAIR[L.style] ? HAIR[L.style](L) : { back: '', front: '' };
    // The head is drawn a little larger than life, the way visual-novel sprites are.
    const HEAD = ' transform="translate(200 252) scale(1.2) translate(-200 -252)"';
    if (L.behind) s += L.behind(L, F);
    s += `<g${HEAD}>${hair.back}</g>`;
    // Below the waist, for the full-length figure.
    if (L.robe) s += p('M108 700 C100 800 92 900 84 990 L316 990 C308 900 300 800 292 700Z', L.robeCol || L.coat, INK, 3) + p('M250 700 C262 800 270 900 276 990 L316 990 C308 900 300 800 292 700Z', L.robeD || L.coatD, null, null, 0.8)
      + e(150, 990, 34, 10, L.boots || L.coatD, INK, 2.5) + e(250, 990, 34, 10, L.boots || L.coatD, INK, 2.5);
    else s += [148, 252].map(x => p(`M${x - 34} 700 L${x - 30} 940 L${x + 30} 940 L${x + 34} 700Z`, L.legs || L.coatD, INK, 3) + p(`M${x - 34} 930 Q${x - 38} 990 ${x - 30} 990 L${x + 44} 990 Q${x + 46} 950 ${x + 30} 930Z`, L.boots || '#1a1622', INK, 3)).join('');
    // Neck, torso, collar, sleeves and hands.
    s += p('M178 236 L176 302 Q200 318 224 302 L222 236Z', L.skin, INK, 3) + p('M178 250 Q200 278 222 250 L222 286 Q200 300 178 286Z', L.skinD, null, null, 0.8);
    const big = L.k ? ` transform="translate(200 310) scale(${L.k} 1) translate(-200 -310)"` : '';
    let body = p(L.torso || TORSO, L.coat, INK, 3.5) + p(TORSO_SHADE, L.coatD, null, null, 0.75);
    if (L.collar && COLLAR[L.collar]) body += COLLAR[L.collar](L);
    if (L.torsoExtra) body += L.torsoExtra(L, F);
    const sleeveL = L.beast ? beastArm(L) : p(SLEEVE_L, L.sleeve || L.coat, INK, 3.5) + p('M100 400 C94 470 88 560 86 640 L76 640 C74 560 80 460 90 400Z', L.coatD, null, null, 0.4) + (L.cuffs ? p('M84 520 L130 526 L126 556 L80 550Z', L.cuffs, INK, 2.5) : '');
    const sleeveR = p(SLEEVE_R, L.sleeve || L.coat, INK, 3.5) + p(mirror('M118 330 C104 340 98 360 96 392 L88 560 C86 590 88 620 90 646 L114 648 C114 614 118 584 122 560 L136 420 C138 380 132 344 118 330Z'), L.coatD, null, null, 0.7) + (L.cuffs ? p(mirror('M84 520 L130 526 L126 556 L80 550Z'), L.cuffs, INK, 2.5) : '');
    body += sleeveL + sleeveR;
    if (!L.beast) body += hand(96, 650, L.gloveL || L.skin);
    body += hand(304, 650, L.gloveR || L.skin);
    if (L.over) body += L.over(L, F);
    s += `<g${big}>${body}</g>`;
    // Head.
    let h = e(141, 198, 9, 15, L.skin, INK, 2.5) + e(259, 198, 9, 15, L.skin, INK, 2.5);
    h += `<clipPath id="${uid}face"><path d="${FACE}"/></clipPath>`;
    h += p(FACE, L.skin, INK, 3.5);
    if (L.headOverride) h += L.headOverride(L, F, uid);
    else h += face(L, F, uid);
    h += hair.front;
    if (L.top) h += L.top(L, F);
    if (L.halo) h += e(200, 58, 74, 15, 'none', '#ffd76a', 6) + e(200, 58, 74, 15, 'none', '#fff6c8', 2);
    return s + `<g${HEAD}>${h}</g>`;
  }
  function beastArm(L) {
    // Mira's right arm: the Church's beast, white fur to the shoulder and claws, with Bram's silver chain wound round it.
    let s = p('M124 312 C96 318 76 346 72 392 L56 470 L66 480 L58 540 L70 548 L58 610 L76 616 L70 660 C86 676 112 676 124 662 L128 600 L118 590 L132 540 L122 530 L138 420 C142 376 140 336 124 312Z', L.wolfCol, INK, 3.5);
    s += p('M90 380 l14 8 M80 450 l16 6 M76 520 l14 4 M78 590 l14 2', null, '#b9bccb', 2.5);
    s += [[70, 670], [86, 680], [104, 680], [120, 670]].map(([x, y]) => p(`M${x - 5} ${y - 6} L${x} ${y + 18} L${x + 5} ${y - 6}Z`, '#f2f2f6', INK, 2)).join('');
    for (let i = 0; i < 5; i++) s += e(98 + i * 4, 470 + i * 14, 18, 6, 'none', '#c7ccd8', 3.5);
    return s;
  }

  // Light the whole figure with one gradient, masked to its own silhouette.
  const LIGHT = {
    lamp: [['#ffb45a', 0.26], ['#1a1440', 0.5]],
    moon: [['#a8c2ff', 0.2], ['#0a0a24', 0.5]],
    dusk: [['#ff9a6a', 0.2], ['#1c1030', 0.4]],
    gold: [['#ffe08a', 0.3], ['#3a2a10', 0.3]]
  };
  function render(id, face, view, light) {
    const L = CAST[id]; if (!L) return null;
    const F = Object.assign({}, FACES.neutral, FACES[face] || {}, (L.faces && L.faces[face]) || {});
    const uid = id.replace(/\W/g, '') + face;
    const fig = figure(L, F, uid);
    let defs = '', body = `<g id="fig">${fig}</g>`;
    const lt = LIGHT[light || L.light];
    if (lt) {
      defs += `<filter id="wht"><feColorMatrix type="matrix" values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 1 0"/></filter><mask id="msk" maskUnits="userSpaceOnUse" x="0" y="0" width="400" height="1000"><use href="#fig" filter="url(#wht)"/></mask>`
        + K.lin('lit', [[0, lt[0][0], lt[0][1]], [0.45, lt[0][0], 0], [0.6, lt[1][0], 0], [1, lt[1][0], lt[1][1]]], 0, 0, 1, 0);
      body += `<rect x="0" y="0" width="400" height="1000" fill="url(#lit)" mask="url(#msk)"/>`;
    }
    if (L.post) body += L.post(F);
    const vb = view === 'bust' ? '0 0 400 620' : view === 'head' ? '80 0 240 280' : '0 0 400 1000';
    return K.uri(K.svg(vb, body, defs));
  }
  // The raw markup of a figure in its 400 x 1000 box, for a look that isn't in the cast: js/vec-foes.js builds its
  // human incidents from the same parts, so they stand in the same world as the people they fight.
  K.person = (L, face, uid) => figure(L, Object.assign({}, FACES.neutral, FACES[face] || {}, (L.faces && L.faces[face]) || {}), uid);
  const memo = {};
  K.fig = (id, face, view, light) => {
    const k = [id, face, view, light].join('|');
    return memo[k] || (memo[k] = render(id, face || 'neutral', view || 'bust', light));
  };

  // ---------- Who's who ----------
  // Colours from js/ch1-art.js's LOOK table, so each one matches their overworld self.
  Object.assign(CAST, {
    mira: { skin: '#efe6e2', skinD: '#d9c3c0', hair: '#3a4157', hairD: '#262b3b', hairL: '#5a6580', eye: '#8a96a8', style: 'mira', hood: '#2a2329', hoodD: '#17121a', band: '#e8ebf0',
      coat: '#2e2730', coatD: '#1b161d', under: '#e8ebf0', collar: 'v', beast: true, wolfCol: '#e3e5ec', robe: true, boots: '#17121a' },
    kai: { skin: '#6e4630', skinD: '#53321f', skinD2: '#3e2416', hair: '#3a2018', hairD: '#24120c', hairL: '#6b3d2a', eye: '#3a2216', browCol: '#1e100a', style: 'locs',
      coat: '#2a2a30', coatD: '#16161a', collar: 'chef', legs: '#24242a', boots: '#151518', gloveR: '#151518',
      over: L => p('M248 300 C270 304 284 318 288 350 L300 470 L278 476 L262 352 C256 330 250 316 236 304Z', '#ece8de', INK, 2.5) + p('M88 430 L134 436 L132 462 L84 456Z', '#f0d27a', INK, 2.5) },
    seoyeon: { skin: '#f3dcc9', skinD: '#dcbfa9', hair: '#16131d', hairD: '#06050a', hairL: '#3a3450', eye: '#7a1f26', style: 'bob', ribbon: '#b3242e',
      coat: '#211d28', coatD: '#121017', under: '#8d1d29', collar: 'cross', legs: '#211d28', boots: '#0f0d14',
      over: L => p('M118 560 Q200 590 282 560 L284 610 Q200 640 116 610Z', '#f2efe8', INK, 2.5) + p('M300 360 L330 120 L342 122 L314 364Z', '#3a3346', INK, 2.5) + p('M316 380 l-30 -6 l4 -16 l30 6Z', '#b3242e', INK, 2) },
    dutch: { skin: '#e2b496', skinD: '#c8957a', skinD2: '#a87660', hair: '#8e9399', hairD: '#5f646b', hairL: '#c6cacf', eye: '#3c4048', style: 'slick', k: 1.12, stubble: '#8a8580',
      coat: '#24345e', coatD: '#172342', under: '#7d8279', collar: 'shirt', collarCol: '#9aa09a', legs: '#7d8279', boots: '#4a3020',
      over: L => c(272, 600, 16, 'none', '#d7c27a', 4) + p('M266 612 l-6 26 M274 614 l2 28 M282 610 l8 22', null, '#d7c27a', 4) + p('M132 360 L170 360 L168 400 L134 400Z', '#e9e4dc', INK, 2) + p('M140 372 L162 372 M140 384 L156 384', null, INK, 1.5) },
    // Freya, the Free Tier's brand promoter: green blazer, gold shirt, lanyard and a halo she wears like a hat.
    freya: { skin: '#f6dcc6', skinD: '#e2bfa6', hair: '#e7b648', hairD: '#b7862a', hairL: '#fff0b0', eye: '#2fbf63', browCol: '#a8761e', style: 'freya', halo: true, blush: 0.25,
      coat: '#2c8a4b', coatD: '#1d6334', under: '#e2bd4f', collar: 'v', legs: '#1d6334', boots: '#3a2c1f',
      over: L => lanyard(), torsoExtra: L => p('M174 300 L150 470 L170 470 L200 372Z M226 300 L250 470 L230 470 L200 372Z', '#247a40', INK, 2.5) },
    // The opening's Freya, late at night: jacket off, sleeves rolled, the uniform shirt and the lanyard.
    freyan: { skin: '#f6dcc6', skinD: '#e2bfa6', hair: '#e7b648', hairD: '#b7862a', hairL: '#fff0b0', eye: '#2fbf63', browCol: '#a8761e', style: 'freya', halo: true, blush: 0.2, light: 'lamp',
      coat: '#3c9a5a', coatD: '#26703e', collar: 'polo', sleeve: '#3c9a5a', cuffs: '#2c8a4b', legs: '#1d6334', boots: '#3a2c1f',
      torso: 'M200 296 C170 298 140 304 120 316 C112 360 112 420 116 470 C114 560 108 680 104 780 L296 780 C292 680 286 560 284 470 C288 420 288 360 280 316 C260 304 230 298 200 296Z',
      over: L => lanyard() + p('M82 560 C80 590 82 620 86 646 L114 648 C114 614 116 586 120 562Z', '#f6dcc6', INK, 2.5) + p(mirror('M82 560 C80 590 82 620 86 646 L114 648 C114 614 116 586 120 562Z'), '#f6dcc6', INK, 2.5) },
    // After the briefing: the goddess of the Free Tier, in green robes with the braid down.
    freyag: { skin: '#f6dcc6', skinD: '#e2bfa6', hair: '#e7b648', hairD: '#b7862a', hairL: '#fff0b0', eye: '#2fbf63', browCol: '#a8761e', style: 'freya', halo: true, blush: 0.25,
      coat: '#2c8a4b', coatD: '#1d6334', under: '#e2bd4f', collar: 'cross', robe: true,
      over: L => p('M118 560 Q200 590 282 560 L284 600 Q200 628 116 600Z', '#e2bd4f', INK, 2.5) },
    freyav: { skin: '#f6dcc6', skinD: '#e2bfa6', hair: '#e7b648', hairD: '#b7862a', hairL: '#fff0b0', eye: '#3bd16f', browCol: '#a8761e', style: 'freya', halo: true, eyes: 'glow',
      coat: '#1f6a37', coatD: '#0f3d1e', under: '#3bd16f', collar: 'v', robe: true,
      post: () => Array.from({ length: 16 }, (_, i) => K.r(60 + (i * 53) % 280, 120 + (i * 97) % 600, 6 + (i % 3) * 8, 3, '#3bd16f', null, null, 0.7)).join('') },
    kyu: { skin: '#f0dad0', skinD: '#dcc0b4', hair: '#15111b', hairD: '#05040a', hairL: '#3a3350', eye: '#8a6cff', style: 'long', coat: '#1b1724', coatD: '#0d0b12', under: '#a3203a', collar: 'cross', robe: true },
    uptima: { skin: '#ffe3d0', skinD: '#f0c4aa', hair: '#ffc69a', hairD: '#e79a6a', hairL: '#fff0dc', eye: '#3b8bff', browCol: '#d0845a', style: 'uptima', coat: '#2b2340', coatD: '#1a1530', under: '#ffffff', collar: 'v', robe: true,
      over: L => p('M160 380 L240 380 L250 700 L150 700Z', '#ffffff', INK, 2.5) + p('M160 380 Q200 396 240 380', null, '#d8d4e4', 3) },
    faithful: { skin: '#e9c6a6', skinD: '#d2a888', skinD2: '#b88a6a', hair: '#dcd7e6', hairD: '#a9a3b8', hairL: '#ffffff', eye: '#4a3b6a', style: 'elder', age: 1, coat: '#5a7ea6', coatD: '#3f5c7e', under: '#e9e1c9', collar: 'cross', robe: true,
      over: L => p('M316 140 L322 980', null, '#7a5a3a', 9) + c(318, 136, 14, '#9fd0ff', INK, 2.5) },
    // The ones they lost, as Freya borrows them.
    bram: { skin: '#e2b48e', skinD: '#c99670', hair: '#6b4426', hairD: '#4a2c16', hairL: '#8a6040', eye: '#4a3020', style: 'short', beard: true, k: 1.14, coat: '#6a5a3e', coatD: '#4a3e2a', under: '#d8cdb4', collar: 'shirt', light: 'moon' },
    hana: { skin: '#f4d2bc', skinD: '#e0b49c', hair: '#3a2416', hairD: '#24140a', hairL: '#5a3a26', eye: '#5a3b2e', style: 'saint', veil: '#ffe9a8', coat: '#fff4d6', coatD: '#e8d29a', under: '#ffd25a', collar: 'v', light: 'gold', blush: 0.3 },
    jin: { skin: '#f0d0b4', skinD: '#d8b090', hair: '#1a1418', hairD: '#0a0608', hairL: '#3a3036', eye: '#3a2a20', style: 'short', topknot: true, coat: '#6a2a2a', coatD: '#4a1a1a', under: '#f2efe8', collar: 'cross' },
    lina: { skin: '#a8724f', skinD: '#8a5a3a', hair: '#1d1f2a', hairD: '#0e0f16', hairL: '#3e4256', eye: '#2a1a12', style: 'braids', ribbon: '#7a6a9a', coat: '#4a4a6a', coatD: '#30304a', under: '#f2efe8', collar: 'shirt', blush: 0.3 },
    // Chapter 2's people.
    tilly: { skin: '#f0d6c4', skinD: '#dcb8a4', hair: '#8a5a2a', hairD: '#6a3e1a', hairL: '#b07a44', eye: '#5a6a3a', style: 'messy', coat: '#8a8a92', coatD: '#626270', under: '#d8d8de', collar: 'high', blush: 0.4 },
    marrow: { skin: '#e8c4a8', skinD: '#d0a688', skinD2: '#b48a6a', hair: '#c8c2cc', hairD: '#9a94a0', hairL: '#ffffff', eye: '#4a3a2a', style: 'scarf', scarf: '#6a3a4a', age: 1, coat: '#5a4a3a', coatD: '#3e3226', under: '#e8dcc4', collar: 'v', robe: true },
    hale: { skin: '#f0d0b8', skinD: '#d8b098', hair: '#d8d4cc', hairD: '#a8a49c', hairL: '#ffffff', eye: '#4a6a9a', style: 'slick', coat: '#e8e4dc', coatD: '#b8b2a8', under: '#6a6a72', collar: 'high', robe: true, age: 1,
      over: L => p('M190 330 L210 330 L210 420 L190 420Z M170 360 L230 360 L230 378 L170 378Z', '#c8a24a', INK, 2) },
    anselm: { skin: '#d8a888', skinD: '#c08e6e', hair: '#5a4a3a', hairD: '#3a2e24', hairL: '#7a6a5a', eye: '#3a2a20', style: 'short', coat: '#5a5048', coatD: '#3e3630', under: '#8a8078', collar: 'high', robe: true }
  });
  function lanyard() {
    return p('M176 300 Q186 380 196 430 M224 300 Q214 380 204 430', null, '#e04a4a', 4) + K.r(178, 428, 44, 54, '#ffffff', INK, 2.5, null, 5) + K.r(184, 436, 32, 10, '#2c8a4b') + p('M186 456 h28 M186 466 h20', null, INK, 2);
  }

  // Non-human cast: their own heads on the shared body.
  Object.assign(CAST, {
    // The man in the pavilion: a coat, white gloves and the snake ring worn over the left one. No face, ever.
    man: { skin: '#0c0a12', skinD: '#0c0a12', hair: '#0c0a12', hairD: '#05040a', style: 'man', coat: '#100d18', coatD: '#07060c', collar: 'high', gloveL: '#ece8e0', gloveR: '#ece8e0', light: 'lamp',
      headOverride: () => p(FACE, '#0b0910') + p('M150 200 C150 150 170 120 200 118', null, '#ffb45a', 3, 0.35),
      top: () => p('M140 176 C132 104 166 80 200 80 C236 80 268 104 260 176 C254 132 232 112 200 110 C168 112 146 132 140 176Z', '#08070c', '#ffb45a', 2, 0.9),
      over: () => p('M120 316 C150 300 180 296 200 296 L200 780 L104 780Z', '#0b0910', null, null, 0.4)
        + `<g transform="translate(96 646)">${c(0, 6, 8, 'none', '#e0b44a', 4)}${c(-2, 2, 3, '#ffe9a0')}</g>`
    },
    // Postmaster Coo: a pigeon in a postman's cap, with a satchel.
    coo: { skin: '#a8b0c4', skinD: '#8a92a8', hair: '#a8b0c4', hairD: '#6a7088', style: 'none', coat: '#3a4a7a', coatD: '#26325a', collar: 'v', under: '#c8a0d8', gloveL: '#a8b0c4', gloveR: '#a8b0c4',
      headOverride: L => p('M140 210 C140 140 168 104 204 104 C240 104 262 140 262 200 C262 250 236 272 200 272 C164 272 140 250 140 210Z', '#a8b0c4', INK, 3.5)
        + p('M150 236 C170 268 230 268 252 236 C240 262 220 276 200 276 C180 276 160 262 150 236Z', '#7fa0a0', null, null, 0.9)
        + c(178, 192, 10, '#ffffff', INK, 2.5) + c(180, 192, 5, '#e06a2a') + c(180, 192, 2.4, INK) + c(226, 192, 10, '#ffffff', INK, 2.5) + c(224, 192, 5, '#e06a2a') + c(224, 192, 2.4, INK)
        + p('M188 214 L216 214 L202 238Z', '#e8b86a', INK, 2.5) + p('M192 212 Q202 206 212 212', null, '#ffffff', 3),
      top: () => p('M146 136 C150 106 176 92 204 92 C232 92 256 106 260 136Z', '#26325a', INK, 3) + p('M140 138 L272 138 L282 152 L134 152Z', '#1a2240', INK, 3) + c(204, 112, 8, '#ffd25a', INK, 2),
      over: () => p('M120 330 L300 560', null, '#7a5a3a', 8) + K.r(250, 540, 80, 66, '#a8743a', INK, 3, null, 6) + p('M250 560 h80', null, INK, 2) },
    // Pip: a small, polite packet who has never been answered.
    pip: { style: 'none', coat: 'none',
      render: face => {
        const F = Object.assign({}, FACES.neutral, FACES[face] || {});
        let s = p('M110 420 C100 300 150 230 200 228 C250 230 300 300 290 420 C290 470 250 490 200 490 C150 490 110 470 110 420Z', '#6fd6ff', INK, 4) + p('M240 250 C280 290 292 360 286 430 C270 470 250 484 226 488 C266 430 262 330 240 250Z', '#3aa8d8', null, null, 0.7);
        s += p('M200 232 Q206 190 230 176', null, INK, 4) + c(234, 172, 12, '#ffe14d', INK, 3);
        s += K.r(150, 420, 100, 60, '#fffdf6', INK, 3, null, 4) + p('M150 422 L200 456 L250 422', null, INK, 3);
        const ey = 340;
        s += F.eyes === 'happy' ? p(`M160 ${ey + 4} Q172 ${ey - 8} 184 ${ey + 4} M216 ${ey + 4} Q228 ${ey - 8} 240 ${ey + 4}`, null, INK, 5) : e(172, ey, 10, 13, INK) + e(228, ey, 10, 13, INK) + c(168, ey - 5, 4, '#fff') + c(224, ey - 5, 4, '#fff');
        s += F.mouth === 'open' || F.mouth === 'sob' ? e(200, 378, 8, 10, '#7a2a34', INK, 2.5) : p(F.mouth === 'frown' ? 'M188 384 Q200 374 212 384' : 'M188 376 Q200 388 212 376', null, INK, 3);
        s += e(152, 368, 14, 7, '#ff6f86', null, null, 0.35) + e(248, 368, 14, 7, '#ff6f86', null, null, 0.35);
        return s;
      } },
    // Sir Seymour Backups: a knight in a full helm, who hasn't opened his door since the coup.
    seymour: { skin: '#9aa3b5', skinD: '#6a7388', hair: '#9aa3b5', style: 'none', coat: '#7a8498', coatD: '#566074', collar: 'high', gloveL: '#6a7388', gloveR: '#6a7388',
      headOverride: () => p('M136 200 C136 120 166 92 200 92 C234 92 264 120 264 200 L262 266 L138 266Z', '#b8c0d0', INK, 3.5) + p('M232 104 C254 124 262 160 262 200 L262 266 L236 266Z', '#8a94a8', null, null, 0.8)
        + K.r(150, 186, 100, 16, '#14101f', INK, 2.5, null, 4) + p('M200 100 L200 180 M200 210 L200 260', null, '#8a94a8', 3) + [0, 1, 2, 3].map(i => c(170 + i * 20, 236, 3, '#14101f')).join(''),
      top: () => p('M190 92 C180 60 190 40 210 30 C206 50 214 70 210 92Z', '#d23a4a', INK, 2.5),
      over: () => p('M150 380 h100 v40 h-100Z', '#556070', INK, 2.5) + c(200, 400, 14, '#e8d27a', INK, 2) }
  });
  CAST.mira.faces = { stone: { eyes: 'half', brow: 'flat', mouth: 'line', shade: 0.25 } };

  // ---------- Plugging the cast into the game ----------
  if (!K.on) return;
  K.figure = render;
  // Pip has no human body: draw him on his own.
  const pipSVG = face => K.uri(K.svg('60 150 280 380', CAST.pip.render(face)));
  K.installs.push(() => {
    // Portraits in dialogue: the head-and-shoulders crop of the same figure, for everyone with one.
    const orig = SD.art.portrait;
    // Freya's three forms: the promoter before the briefing, the goddess after it, and the virus underneath.
    const morphed = () => { const c1 = SD.state.save.c1; return !!(c1 && c1.f && c1.f.morph); };
    SD.art.portrait = function (who, size, mood) {
      let id = who;
      if (who === 'freya') id = mood === 'virus' ? 'freyav' : mood === 'promoter' || !morphed() ? 'freya' : 'freyag';
      if (!CAST[id]) return orig(who, size, mood);
      const m = FACES[mood] ? mood : 'neutral';
      const src = id === 'pip' ? pipSVG(m) : K.fig(id, m, 'head');
      return `<span class="bust b-${who}" style="width:${size}px;height:${Math.round(size * 140 / 120)}px"><img src="${src}" alt="" draggable="false"></span>`;
    };
    // Faces in dialogue: the line's own face if it names one, otherwise a guess from the words.
    SD.art.mood = function (who, text, e) {
      if (e) return e;
      const t = text || '';
      if (/\?!|\bwhat\b|huh|wait\./i.test(t)) return 'confused';
      if (/\bugh\b|no!|stop|how dare/i.test(t)) return 'angry';
      if (/sorry|\bdied\b|\bdead\b|oh no|miss (him|her)/i.test(t)) return 'sad';
      if (/ha ha|ah ha|\blaugh/i.test(t)) return 'laugh';
      if (/!/.test(t) && who === 'freya') return 'smile';
      return 'neutral';
    };
    // Visual-novel sprites, waist up, with every face.
    const sprite = (id, faces, light) => ({ faces: Object.fromEntries(faces.map(f => [f, id === 'pip' ? pipSVG(f) : K.fig(id, f, 'bust', light)])) });
    SD.vn.addSprites({
      mira: sprite('mira', ['neutral', 'grief', 'cold', 'desperate', 'sad', 'anger', 'warm', 'tired', 'shock']),
      kai: sprite('kai', ['neutral', 'shock', 'grief', 'anger', 'smirk', 'sad']),
      seoyeon: sprite('seoyeon', ['neutral', 'frozen', 'grief', 'anger', 'sad']),
      dutch: sprite('dutch', ['neutral', 'stone', 'grief', 'anger', 'tired']),
      freya: sprite('freya', ['neutral', 'smile', 'cold', 'warm', 'smirk', 'amused', 'earnest']),
      bram: sprite('bram', ['neutral', 'smile', 'warm']), hana: sprite('hana', ['neutral']), jin: sprite('jin', ['neutral', 'smirk']), lina: sprite('lina', ['neutral', 'smile']),
      man: sprite('man', ['neutral']),
      coo: sprite('coo', ['neutral', 'smile', 'shock']), pip: sprite('pip', ['neutral', 'sad', 'happy', 'shock']),
      seymour: sprite('seymour', ['neutral']), faithful: sprite('faithful', ['neutral', 'sad', 'tired']), uptima: sprite('uptima', ['neutral', 'sad']),
      tilly: sprite('tilly', ['neutral', 'cold', 'anger']), marrow: sprite('marrow', ['neutral', 'sad']), hale: sprite('hale', ['smile', 'neutral'])
    });
    // Full-length leads: choosing a lead, the title screen, and your fighter in battle.
    const T = SD.ch1story;
    T.order.forEach(id => { T.leads[id].img = K.fig(id, 'neutral', 'full'); });
    document.querySelectorAll('.t-leads img').forEach(i => { i.src = K.fig(i.dataset.lead, 'neutral', 'full'); });
  });
  K.pipSVG = pipSVG;
})();
