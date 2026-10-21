// Chapter 2, part 2's pictures, all drawn in code: the Dead Letter Office's and the Inquisition's Tower's enemies
// (120 x 120 SVG, as js/ch1-mines-art.js draws the Deny Mines'), the cutscene backdrops (the kit and framing of
// js/vec-scenes2.js), Bru and Brother Anselm for the visual novel, and the overworld's ground and props for
// js/c2x-world.js in the style of js/c2-art.js (32 units to a tile, standing on the bottom edge of their footprint).
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const XA = SD.c2xart = {};
  const INK = '#2b2340';
  const hash = (x, y) => ((x * 73856093) ^ (y * 19349663)) >>> 0;

  // ---------- Enemies ----------
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r, col) => `<circle cx="${x1}" cy="${y}" r="${r || 4}" fill="${col || '#fff'}" ${S}/><circle cx="${x2}" cy="${y}" r="${r || 4}" fill="${col || '#fff'}" ${S}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>`;
  const glow = (x1, x2, y, col) => `<circle cx="${x1}" cy="${y}" r="3.4" fill="${col}"/><circle cx="${x2}" cy="${y}" r="3.4" fill="${col}"/>`;
  const tag = (x, y, w, t, col) => `<rect x="${x}" y="${y}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="${x + w / 2}" y="${y + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${t}</text>`;
  const txt = (x, y, s, size, col) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="${size}" fill="${col || INK}">${s}</text>`;
  const add = (id, col, anim, svg) => SD.art.addFoe(id, { col, anim, svg });
  // A clerk: a Lambda function in a visor, the λ on his chest.
  const clerk = (coat, visor, extra, face) => `<g ${S}><path d="M28 112 Q26 64 60 58 Q94 64 92 112Z" fill="${coat}"/><circle cx="60" cy="40" r="19" fill="#e9c6a6"/>
    <path d="M38 32 Q60 16 82 32 L86 38 L34 38Z" fill="${visor}"/></g>${face || eyes(53, 67, 44, 3)}${txt(60, 98, 'λ', 22, '#ffcf33')}${extra || ''}`;
  // A letter with ideas of its own.
  const envelope = (col, extra, x, y, s) => `<g transform="translate(${x || 0} ${y || 0}) scale(${s || 1})"><g ${S}><path d="M16 50 H104 V106 H16Z" fill="${col}"/><path d="M16 50 L60 82 L104 50" fill="none"/></g>${eyes(48, 72, 66, 4)}${extra || ''}</g>`;
  // An inquisitor in Inquisition grey, a hood and nothing much inside it but two lights.
  const inq = (col, eye, extra, tf) => `<g${tf ? ` transform="${tf}"` : ''}><g ${S}><path d="M26 114 Q24 50 60 22 Q96 50 94 114Z" fill="${col}"/><path d="M44 52 Q60 34 76 52 Q76 72 60 76 Q44 72 44 52Z" fill="#1a1626"/></g>${glow(53, 67, 58, eye || '#ffd76a')}${extra || ''}</g>`;
  const wave = (col, top) => `<path d="M8 ${top} Q28 ${top - 26} 48 ${top - 6} T88 ${top - 10} T112 ${top - 16} V112 H8Z" fill="${col}" ${S}/>`;

  // Floor 1, the Clerks
  add('x-cold', '#9fd0ff', 'float', clerk('#5a7ea6', '#2a3a5a', `<path d="M20 30 l8 6 M100 30 l-8 6 M14 54 h10 M96 54 h10" stroke="#bfe6ff" stroke-width="3"/>${tag(34, 4, 52, 'Init 4.0 s', '#3a6ab0')}`));
  add('x-reaper', '#c9c4d6', 'shake', inq('#3a3448', '#ff6a5a', `<g ${S}><path d="M92 20 Q118 30 112 60" fill="none"/><path d="M92 20 L100 112" fill="none"/></g>${tag(26, 98, 68, 'timed out 3.00s', '#d63a3a')}`));
  add('x-starved', '#e8c46a', 'squish', clerk('#8a7a5a', '#5a4a2a', `<path d="M40 70 Q60 80 80 70" fill="none" stroke="${INK}" stroke-width="2"/><rect x="30" y="4" width="60" height="12" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><rect x="31.5" y="5.5" width="6" height="9" fill="#d63a3a"/>${txt(60, 30 - 16, '', 8)}`, eyes(53, 67, 44, 2.6)) + tag(30, 104, 60, '128 MB', '#7a5232'));
  add('x-cap', '#ffb27a', 'shake', `<g ${S}><path d="M14 112 V60 H106 V112Z" fill="#c9a07a"/><path d="M8 60 H112 L100 40 H20Z" fill="#a8743a"/></g>${eyes(44, 76, 82, 5)}${txt(60, 54, '10/10', 14, '#fff8e0')}${tag(28, 4, 64, '429 · 429 · 429', '#d63a3a')}`);
  add('x-retrier', '#ff8a8a', 'float', envelope('#f2ead8', `<path d="M8 30 Q20 10 34 26 M112 30 Q100 10 86 26" fill="none" stroke="${INK}" stroke-width="3"/>${txt(60, 30, '↻ ↻ ↻', 16, '#d63a3a')}`) + tag(26, 106, 68, 'no destination', '#d63a3a'));
  add('x-nightshift', '#6a8ae0', 'float', `${clerk('#2a3a6a', '#141a3a', `<circle cx="96" cy="26" r="16" fill="#fff8e0" ${S}/><path d="M96 16 V26 L104 30" fill="none" stroke="${INK}" stroke-width="3"/><path d="M8 80 H24 V112 H8Z M10 74 h12" fill="#efe4c8" ${S}/>`, eyes(53, 67, 44, 3.2))}${tag(18, 2, 60, '3 s · 128 MB', '#3a6ab0')}`);
  // Floor 2, the Stream Room
  add('x-age', '#7ad0c0', 'float', `${wave('#4aa0a0', 84)}<g ${S}><circle cx="60" cy="46" r="24" fill="#fff8e0"/><path d="M60 30 V46 L72 54" fill="none"/></g>${tag(30, 96, 60, 'age: 11 h', '#2a7a7a')}`);
  add('x-poison', '#a6e070', 'squish', `${wave('#4a8aa0', 96)}${envelope('#a6e070', `${txt(60, 44, '☠', 18, INK)}`, 10, -6, 0.84)}${tag(28, 100, 64, 'shard stuck', '#2a7a2a')}`);
  add('x-gatekeeper', '#ffd76a', 'shake', `<g ${S}><path d="M16 112 V44 Q60 14 104 44 V112Z" fill="#8a7a6a"/><path d="M40 112 V64 Q60 52 80 64 V112Z" fill="#2a2018"/></g>${eyes(50, 70, 46, 4.5)}${tag(10, 2, 46, '400', '#d63a3a')}${tag(64, 2, 46, '429', '#d63a3a')}`);
  add('x-inquiry', '#c9a0ff', 'float', `${clerk('#6a4fa8', '#3a2a6a', '', eyes(53, 67, 44, 2.6))}<g ${S}><path d="M4 60 h18 M98 60 h18" fill="none"/></g>${tag(20, 104, 80, 'waiting… waiting…', '#6a4fa8')}`);
  add('x-votes', '#ffcf7a', 'float', `${[0, 1, 2, 3, 4, 5, 6].map(i => `<g ${S}><rect x="${6 + i * 16}" y="${62 - (i % 2) * 8}" width="14" height="30" rx="3" fill="${i === 2 || i === 5 ? '#d65a4a' : '#c9a07a'}"/></g>`).join('')}${inq('#8a8a92', '#ffd76a', '', 'translate(30 -14) scale(0.5)')}${tag(26, 98, 68, 'step 3 failed', '#d63a3a')}`);
  // Floor 3, the Prayer Vault
  add('x-unanswered', '#e8dcc0', 'float', `${[[20, 70], [44, 60], [68, 72], [52, 86], [28, 92]].map(([x, y]) => `<rect x="${x}" y="${y}" width="34" height="22" fill="#efe4c8" ${S}/>`).join('')}${eyes(50, 70, 44, 5)}${tag(24, 4, 72, 'visible: 9,999+', '#7a5232')}`);
  add('x-unread', '#d8c8f0', 'float', `<g ${S}><path d="M6 114 Q20 40 60 20 Q100 40 114 114Z" fill="#c9bce0"/></g>${Array.from({ length: 14 }, (_, i) => `<rect x="${14 + (i * 23) % 84}" y="${44 + (i * 17) % 60}" width="16" height="11" fill="#fff8e0" stroke="${INK}" stroke-width="1.5" transform="rotate(${(i * 37) % 40 - 20} ${22 + (i * 23) % 84} ${50 + (i * 17) % 60})"/>`).join('')}${glow(48, 72, 38, '#8a6cff')}${tag(30, 2, 60, 'unread', '#6a4fa8')}`);
  // Expedition III, floor 1, the Square
  add('x-coupled', '#c9c4d6', 'shake', `${inq('#8a8a92', '#ffd76a', '', 'translate(-14 10) scale(0.8)')}${inq('#7a7a84', '#ffd76a', '', 'translate(38 10) scale(0.8)')}<path d="M44 80 Q60 92 76 80" fill="none" stroke="#c8a24a" stroke-width="4"/>${tag(26, 2, 68, 'calls · waits', '#7a5232')}`);
  add('x-storm', '#9fb2cf', 'shake', `${[0, 1, 2].map(i => inq('#8a8a92', '#ffd76a', '', `translate(${-18 + i * 30} ${16 - (i % 2) * 8}) scale(0.62)`)).join('')}${txt(60, 20, '503! 503! 503!', 12, '#d63a3a')}`);
  add('x-sticky', '#e8c46a', 'squish', `${inq('#8a8a92', '#ffd76a', `<path d="M78 92 Q100 84 104 102" fill="none" stroke="#e8c46a" stroke-width="5"/><circle cx="104" cy="104" r="7" fill="#e8c46a" ${S}/>`)}${tag(16, 4, 54, 'session', '#7a5232')}`);
  add('x-qgate', '#ffd76a', 'shake', `<g ${S}><path d="M14 112 V40 Q60 4 106 40 V112Z" fill="#6a6a72"/><path d="M38 112 V62 Q60 46 82 62 V112Z" fill="#14101f"/></g>${glow(48, 72, 36, '#ffd76a')}${tag(30, 74, 60, '#set($v=...)', '#3a6ab0')}${tag(36, 94, 48, '200 OK', '#2a7a2a')}`);
  add('x-square', '#c8b4a0', 'float', `${Array.from({ length: 9 }, (_, i) => `<g ${S}><circle cx="${14 + (i % 5) * 23}" cy="${54 + Math.floor(i / 5) * 26}" r="11" fill="${['#e9c6a6', '#c99670', '#f0d0b4', '#a8724f'][i % 4]}"/><path d="M${4 + (i % 5) * 23} ${78 + Math.floor(i / 5) * 26} Q${14 + (i % 5) * 23} ${62 + Math.floor(i / 5) * 26} ${24 + (i % 5) * 23} ${78 + Math.floor(i / 5) * 26}" fill="${['#7a6a8a', '#6a8a7a', '#9a6a4a', '#8a7a9a'][i % 4]}"/></g>`).join('')}${txt(60, 30, '!!!', 22, '#d63a3a')}`);
  // Floor 2, the River Gate
  add('x-ferry', '#7aa0d0', 'float', `${wave('#2a4a7a', 98)}<g ${S}><path d="M14 80 H106 L94 98 H26Z" fill="#7a5232"/><path d="M60 80 V30 L88 64 H60" fill="#efe4c8"/></g>${inq('#5a5048', '#ffd76a', '', 'translate(16 30) scale(0.42)')}${tag(70, 4, 44, 'SFTP?', '#3a6ab0')}`);
  add('x-order', '#9fd0ff', 'shake', `${[[18, 40, 3], [50, 70, 1], [80, 44, 2]].map(([x, y, n]) => envelope('#f2ead8', txt(60, 100, String(n), 22, '#d63a3a'), x - 30, y - 50, 0.55)).join('')}${tag(26, 104, 68, 'standard queue', '#3a6ab0')}`);
  add('x-twice', '#ffe0a0', 'squish', `${envelope('#f2ead8', '', -10, 0, 0.7)}${envelope('#f2ead8', '', 34, 0, 0.7)}${tag(30, 92, 60, 'sent twice', '#d63a3a')}`);
  add('x-choreo', '#ffb2d0', 'float', `${inq('#a87aa8', '#ffd76a', '<path d="M30 40 Q14 20 24 10" fill="none" stroke="#2b2340" stroke-width="3"/>', 'translate(-12 14) scale(0.72)')}${inq('#5a5a7a', '#ffd76a', '<path d="M96 40 L112 18" fill="none" stroke="#2b2340" stroke-width="3"/>', 'translate(42 14) scale(0.72)')}${txt(60, 20, '♪ vs ♩', 14, INK)}`);
  add('x-gatehouse', '#7ad0ff', 'float', `${wave('#2a4a7a', 104)}<g ${S}><path d="M6 100 V30 H114 V100 H84 V60 Q60 42 36 60 V100Z" fill="#6a6a72"/><path d="M6 30 L16 16 H104 L114 30Z" fill="#4a4a52"/></g>${glow(44, 76, 44, '#ffd76a')}${tag(30, 2, 60, '02:00 · out', '#3a6ab0')}`);
  // Floor 3, the Stair
  add('x-watch', '#ffd76a', 'float', `${inq('#8a8a92', '#3a3a3a', `<circle cx="92" cy="30" r="14" fill="#2fbf63" ${S}/>${txt(92, 35, 'OK', 11, '#fff')}`)}${tag(16, 100, 88, 'watching: CPU 0%', '#2a7a2a')}`);
  add('x-seven', '#c9c4d6', 'float', `${Array.from({ length: 7 }, (_, i) => inq(i === 3 ? '#9a9aa2' : '#7a7a84', '#ffd76a', '', `translate(${-16 + (i % 4) * 28 + (i >= 4 ? 14 : 0)} ${(i >= 4 ? 30 : 0)}) scale(0.46)`)).join('')}${tag(28, 102, 64, 'sent 02:30', '#d63a3a')}`);
  // Floor 4, the Top of the Stair: Grand Inquisitor Hale, white robe, gold cross, a plague doctor's mask in his hand.
  const haleFig = (extra) => `<g ${S}><path d="M28 116 Q26 58 60 50 Q94 58 92 116Z" fill="#e8e4dc"/><circle cx="60" cy="34" r="18" fill="#f0d0b8"/><path d="M42 28 Q60 8 78 28 Q72 20 60 20 Q48 20 42 28Z" fill="#d8d4cc"/>
    <path d="M56 64 H64 V96 H56Z M48 72 H72 V80 H48Z" fill="#c8a24a"/><path d="M92 76 Q112 70 108 88 Q102 96 94 90Z" fill="#3a3448"/><path d="M106 82 L118 86" fill="none"/></g>
    <circle cx="53" cy="34" r="2.2" fill="${INK}"/><circle cx="67" cy="34" r="2.2" fill="${INK}"/><path d="M52 43 Q60 48 68 43" fill="none" stroke="${INK}" stroke-width="2.5"/>${extra || ''}`;
  add('x-hale', '#f0e8d0', 'float', haleFig(`${[[10, 30], [100, 20], [14, 70]].map(([x, y]) => `<rect x="${x}" y="${y}" width="16" height="11" fill="#fff8e0" stroke="#d63a3a" stroke-width="2"/>`).join('')}${tag(26, 2, 68, 'GUILTY ×∞', '#d63a3a')}`));
  add('x-guard', '#c9c4d6', 'shake', `${[0, 1, 2, 3].map(i => inq('#6a6a72', '#ff9a5a', '', `translate(${-14 + i * 24} ${i % 2 ? 22 : 8}) scale(0.58)`)).join('')}${tag(30, 100, 60, 'last guard', '#7a5232')}`);
  add('x-halebell', '#ffcf7a', 'shake', `<g ${S}><path d="M34 40 Q34 8 60 8 Q86 8 86 40 L94 60 H26Z" fill="#c9a24a"/></g>${haleFig('').replace(/<g /, '<g transform="translate(0 6) scale(0.92)" ')}${tag(26, 104, 68, 'ring · ring · ring', '#7a5232')}`);

  // ---------- People: the overworld's chibi kit and the visual novel ----------
  const ART = SD.c1art;
  if (ART && ART.LOOK) Object.assign(ART.LOOK, {
    hale: { skin: '#f0d0b8', hair: '#d8d4cc', hairD: '#a8a49c', style: 'short', coat: '#e8e4dc', coatD: '#b8b2a8', under: '#c8a24a', eye: '#4a6a9a', robe: true, mouth: 'flat', brow: 'flat' },
    anselm: { skin: '#d8a888', hair: '#5a4a3a', hairD: '#3a2e24', style: 'short', coat: '#5a5048', coatD: '#3e3630', under: '#8a8078', eye: '#3a2a20', robe: true, mouth: 'flat', brow: 'sad' },
    bru: { skin: '#e8c4a8', hair: '#c0603a', hairD: '#8a3e22', style: 'bob', coat: '#3a5a8a', coatD: '#26406a', under: '#f2efe8', legs: '#26406a', boots: '#2e2218', eye: '#3a2a20', mouth: 'flat', brow: 'flat', glasses: true },
    inquisitor: { skin: '#e8c4a8', hair: '#6a6a72', style: 'hood', hood: '#7a7a84', coat: '#7a7a84', coatD: '#5a5a62', under: '#d8d8de', eye: '#3a2a20', robe: true, mouth: 'flat', brow: 'flat' }
  });
  K.cast.bru = Object.assign({}, K.cast.lina || {}, { skin: '#e8c4a8', skinD: '#d0a688', hair: '#c0603a', hairD: '#8a3e22', hairL: '#e08a5a', eye: '#3a2a20', style: 'bob', coat: '#3a5a8a', coatD: '#26406a', under: '#f2efe8', collar: 'shirt', blush: 0.3 });
  if (SD.vn && SD.vn.addSprites && K.fig) {
    const sprite = (id, faces) => ({ faces: Object.fromEntries(faces.map(f => [f, K.fig(id, f, 'bust')])) });
    SD.vn.addSprites({ anselm: sprite('anselm', ['neutral', 'sad', 'tired']), bru: sprite('bru', ['neutral', 'smile', 'tired']) });
  }

  // ---------- Cutscene backdrops ----------
  const { p, c, r, t, g } = K, N = K.NIGHT, sc = K.scenes;
  // Floor 7: the Dead Letter Office, desks to the horizon.
  sc['c2x-office'] = K.scene([
    K.skyL('xo0', '#3a2c20', '#120c08'), r(0, 0, 1200, 1200, '#2a2018'),
    p(Array.from({ length: 7 }, (_, j) => Array.from({ length: 12 }, (_, i) => `M${i * 100 + 4} ${120 + j * 64} h88 v54 h-88Z`).join(' ')).join(' '), '#3a2c1e', '#1a120c', 3),
    p(Array.from({ length: 40 }, (_, i) => `M${18 + (i * 97) % 1150} ${132 + (i * 61) % 420} h40 v24 h-40Z`).join(' '), '#efe4c8', N, 2, 0.9),
    ...[0, 1, 2, 3].map(i => g(r(-90, -40, 180, 40, '#6a4a2c', N, 4) + c(0, -76, 26, '#e9c6a6', N, 3) + p('M-26 -84 Q0 -112 26 -84Z', '#2a3a5a', N, 3), `translate(${180 + i * 280} ${840 + (i % 2) * 60}) scale(${0.9 + (i % 2) * 0.2})`)),
    K.glow('xog', 600, 300, 700, '#ffcf7a', 0.22), K.vignette(1200, 1200, 0.75)
  ]);
  // The Prayer Vault: shelves of sealed prayers into the dark, and Uptima in chains at the bottom.
  sc['c2x-vault'] = K.scene([
    K.skyL('xv0', '#1a1430', '#05040a'), r(0, 0, 1200, 1200, '#120e1e'),
    p(Array.from({ length: 10 }, (_, i) => `M${i * 130 - 20} 0 L${i * 130 + 30} 1200`).join(' '), null, '#241c38', 30),
    p(Array.from({ length: 90 }, (_, i) => `M${(i * 131) % 1200} ${(i * 211) % 900} l26 -6 l4 16 l-26 6Z`).join(' '), '#efe4c8', N, 1.5, 0.75),
    p('M300 1200 C380 980 820 980 900 1200Z', '#e8dcc0', N, 4, 0.9),
    g(c(0, -150, 46, '#ffe3d0', N, 3) + p('M-50 -170 C-60 -240 60 -240 50 -170 C40 -200 -40 -200 -50 -170Z', '#ffc69a', N, 3) + p('M-70 -100 C-80 0 80 0 70 -100 C40 -120 -40 -120 -70 -100Z', '#2b2340', N, 3) + p('M-90 -60 L-150 0 M90 -60 L150 0', null, '#8a8aa0', 8), 'translate(600 1080)'),
    K.glow('xvg', 600, 900, 500, '#ffcf7a', 0.3), K.vignette(1200, 1200, 0.85)
  ]);
  // The Inquisition's Tower: the stair, and Hale at the top of it with Tilly beside him.
  sc['c2x-stair'] = K.scene([
    K.skyL('xs0', '#3a3a50', '#0c0a14'), r(0, 0, 1200, 1200, '#1e1a26'),
    p(Array.from({ length: 12 }, (_, i) => `M${200 + i * 50} ${1100 - i * 70} h${400 - i * 18} v70 h-${400 - i * 18}Z`).join(' '), '#5a5462', N, 3),
    p('M880 160 L1080 160 L1080 520 L880 520Z', '#9ab0c8', N, 4, 0.6),
    g(p('M-40 0 C-44 -110 44 -110 40 0Z', '#e8e4dc', N, 3) + c(0, -128, 22, '#f0d0b8', N, 3) + p('M-8 -70 H8 V-30 H-8Z M-20 -58 H20 V-48 H-20Z', '#c8a24a', N, 2), 'translate(640 300)'),
    g(p('M-30 0 C-32 -80 32 -80 30 0Z', '#8a8a92', N, 3) + c(0, -96, 17, '#f0d6c4', N, 3) + p('M-18 -108 Q0 -126 18 -108Z', '#8a5a2a', N, 2), 'translate(740 310)'),
    K.vignette(1200, 1200, 0.75)
  ]);
  // The Inquisition's event archive on floor 13: drawers of evenings, each labelled with a date.
  sc['c2x-archive'] = K.scene([
    K.skyL('xa0', '#2a2a3a', '#0c0c14'), r(0, 0, 1200, 1200, '#22222e'),
    p(Array.from({ length: 6 }, (_, j) => Array.from({ length: 8 }, (_, i) => `M${120 + i * 124} ${140 + j * 130} h108 v110 h-108Z`).join(' ')).join(' '), '#4a4a5a', N, 3),
    p(Array.from({ length: 48 }, (_, i) => `M${150 + (i % 8) * 124} ${190 + Math.floor(i / 8) * 130} h48`).join(' '), null, '#c8a24a', 6),
    K.glow('xag', 600, 500, 600, '#9ab0ff', 0.2), K.vignette(1200, 1200, 0.7)
  ]);
  if (SD.vn && SD.vn.addScenes) SD.vn.addScenes(Object.fromEntries(['c2x-office', 'c2x-vault', 'c2x-stair', 'c2x-archive'].map(k => [k, { src: sc[k], label: k }])));
  const U = SD.ui;
  if (U && U.stageDecor) {
    const art = id => `<img class="vstage" src="${K.scenes[id]}" alt="">`;
    U.stageDecor.c2xoffice = art('c2x-office');
    U.stageDecor.c2xvault = art('c2x-vault');
    U.stageDecor.c2xstair = art('c2x-stair');
    U.stageDecor.c2xarchive = art('c2x-archive');
    U.stageDecor.c2xfire = art('c2-fire');
    U.stageDecor.c2xsquare = art('c2-square');
  }

  // ---------- The overworld ----------
  // Ground: w the Dead Letter Office's boards, ~ the river, L the tower's lift, X Y Z doors, H a hidden way (a wall
  // until Bru's Compass shows Hale's footprints through it). Everything else is js/c2-art.js's ground.
  XA.ground = function (ctx, ch, x, y, ts, t, compass) {
    const X = x * ts, Y = y * ts, h = hash(x, y), u = ts / 32;
    if (ch === 'w') {
      ctx.fillStyle = h % 2 ? '#8a6a48' : '#83643f'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = 'rgba(43,35,64,.22)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(X, Y + i * ts / 3 + 0.5); ctx.lineTo(X + ts, Y + i * ts / 3 + 0.5); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(X + ((y * 7) % 3) * ts / 3, Y); ctx.lineTo(X + ((y * 7) % 3) * ts / 3, Y + ts / 3); ctx.stroke();
      if (h % 13 === 0) { ctx.fillStyle = 'rgba(239,228,200,.85)'; ctx.fillRect(X + (h % 17) / 17 * ts * 0.7, Y + (h % 11) / 11 * ts * 0.7, 7 * u, 5 * u); }
      return true;
    }
    if (ch === '~') {
      ctx.fillStyle = '#1e3a5a'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.strokeStyle = `rgba(150,200,240,${0.35 + 0.15 * Math.sin(t * 2 + x)})`; ctx.lineWidth = 1.2 * u;
      for (let i = 0; i < 2; i++) { const yy = Y + ts * (0.3 + i * 0.4) + Math.sin(t * 1.6 + x + i) * 2 * u; ctx.beginPath(); ctx.moveTo(X + 4 * u, yy); ctx.quadraticCurveTo(X + ts / 2, yy - 4 * u, X + ts - 4 * u, yy); ctx.stroke(); }
      return true;
    }
    if (ch === 'H') {
      ctx.fillStyle = '#8a8478'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      if (compass) {
        ctx.fillStyle = `rgba(255,215,106,${0.5 + 0.3 * Math.sin(t * 3 + y)})`;
        for (let i = 0; i < 2; i++) { ctx.beginPath(); ctx.ellipse(X + ts * (0.35 + i * 0.3), Y + ts * (0.3 + i * 0.4), 3 * u, 5 * u, 0, 0, 7); ctx.fill(); }
      }
      return true;
    }
    if (ch === 'L' || ch === 'X' || ch === 'Y' || ch === 'Z') {
      ctx.fillStyle = ch === 'L' ? '#3a3448' : '#2a2018'; ctx.fillRect(X, Y, ts + 1, ts + 1);
      ctx.fillStyle = ch === 'L' ? '#c8a24a' : '#5a3a22'; ctx.fillRect(X + 3 * u, Y + 2 * u, ts - 6 * u, ts - 4 * u);
      ctx.fillStyle = ch === 'L' ? '#e8d48a' : '#7a5232'; ctx.fillRect(X + ts / 2 - u, Y + 2 * u, 2 * u, ts - 4 * u);
      if (ch === 'L') { ctx.fillStyle = '#2b2340'; ctx.font = `700 ${9 * u}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.fillText('LIFT', X + ts / 2, Y + ts * 0.62); }
      return true;
    }
    return false;
  };
  // A 'T' in the office is a wall of pigeonholes; in the tower and Thornwick it's stone.
  XA.wall = function (ctx, x, y, ts, t, zone) {
    if (zone !== 'office') return false;
    const X = x * ts, Y = y * ts, h = hash(x, y);
    ctx.fillStyle = '#4a3424'; ctx.fillRect(X, Y - ts * 0.5, ts + 1, ts * 1.5);
    ctx.strokeStyle = '#2a1c12'; ctx.lineWidth = 1.2;
    for (let j = 0; j < 3; j++) for (let i = 0; i < 2; i++) {
      ctx.strokeRect(X + i * ts / 2 + 1.5, Y - ts * 0.5 + j * ts / 2 + 1.5, ts / 2 - 3, ts / 2 - 3);
      if ((h >> (i + j * 2)) & 1) { ctx.fillStyle = '#efe4c8'; ctx.fillRect(X + i * ts / 2 + 4, Y - ts * 0.5 + j * ts / 2 + 5, ts / 2 - 8, ts / 4 - 3); }
    }
    return true;
  };
  // Props, painted through js/c2-art.js's A.prop (its ghosts and footprints), under keys of our own.
  const PR = SD.c2art && SD.c2art.PROPS;
  if (PR) Object.assign(PR, {
    xlift: (g2, p2, t2) => {
      g2.rect(2, -60, 60, 60, 2).fill('#3a3448');
      g2.rect(8, -54, 48, 54, 1).fill('#c8a24a', 1);
      g2.line(32, -54, 32, 0).stroke('#8a6a2a', 2);
      g2.rect(20, -70, 24, 10, 2).fill('#2b2340'); g2.text(p2.floor || '7', 32, -62, 8, '#ffd76a');
      g2.circle(52, -30, 2.6).fill(Math.sin(t2 * 3) > 0 ? '#ff6a5a' : '#ffd76a', 0.6);
    },
    xcounter: (g2, p2) => {
      const W = (p2.w || 3) * 32;
      g2.rect(0, -26, W, 26, 2).fill('#6a4a2c');
      g2.rect(-2, -30, W + 4, 6, 2).fill('#8a6a48');
      for (let i = 0; i < W / 32; i++) { g2.rect(i * 32 + 8, -38, 14, 9, 1).fill('#efe4c8', 0.8); }
    },
    xbench: (g2, p2, t2) => {
      g2.rect(0, -22, 64, 22, 2).fill('#7a5a3a');
      g2.rect(6, -40, 22, 18, 2).fill('#2a3a5a'); g2.text('λ', 17, -27, 12, '#ffcf33');
      g2.rect(34, -36, 24, 14, 2).fill('#1a1a24'); g2.rect(36, -34, 20 * (0.5 + 0.5 * Math.sin(t2 * 2)), 3, 1).fill('#2fbf63', false);
      g2.text('MB', 46, -26, 6, '#ffd76a');
    },
    xpage: (g2, p2, t2) => {
      g2.ell(16, -2, 8, 2).fill('rgba(43,35,64,.2)', false);
      g2.poly(6, -6, 24, -10, 26, -2, 8, 2).fill('#f2ead8', 0.8);
      g2.line(10, -5, 22, -8).stroke('#3a3448', 0.6); g2.line(10, -2, 20, -5).stroke('#3a3448', 0.6);
      g2.circle(16, -16 - Math.sin(t2 * 3) * 2, 2).fill('rgba(255,230,150,.9)', false);
    },
    xchute: (g2, p2, t2) => {
      g2.rect(4, -72, 56, 72, 3).fill('#2a2438');
      g2.rect(12, -64, 40, 50, 2).fill('#0e0a18');
      for (let i = 0; i < 4; i++) { const yy = -64 + ((t2 * 30 + i * 13) % 50); g2.rect(18 + (i * 9) % 26, yy, 10, 6, 1).fill('#efe4c8', 0.5); }
      g2.text(p2.label || 'PRAYERS ↓', 32, -4, 7, '#ffd76a');
    },
    xarchive: (g2, p2) => {
      const W = (p2.w || 4) * 32;
      g2.rect(0, -70, W, 70, 2).fill('#5a5a6a');
      g2.poly(-6, -70, W / 2, -96, W + 6, -70).fill('#3a3a4a');
      for (let i = 0; i < 3; i++) g2.rect(10 + i * (W - 20) / 3, -56, (W - 20) / 3 - 8, 30, 1).fill('#2a2a36');
      g2.rect(W / 2 - 12, -26, 24, 26, 1).fill(p2.open ? '#ffd76a' : '#1a1622');
      g2.text('ARCHIVE', W / 2, -78, 9, '#e8d48a');
    },
    xledger: (g2, p2) => {
      g2.rect(10, -24, 44, 24, 2).fill('#5a4030');
      g2.poly(4, -24, 60, -24, 54, -40, 10, -40).fill('#efe4c8');
      for (let i = 0; i < 4; i++) g2.line(14, -36 + i * 3.5, 50, -36 + i * 3.5).stroke('#5a5a6a', 0.6);
      g2.line(32, -40, 32, -24).stroke('#8a6a48', 1);
    },
    xferry: (g2, p2, t2) => {
      const bob = Math.sin(t2 * 1.6) * 1.5;
      g2.poly(0, -14 + bob, 96, -14 + bob, 84, 0 + bob, 12, 0 + bob).fill('#7a5232');
      g2.line(48, -14 + bob, 48, -54 + bob).stroke('#5a3a22', 2);
      g2.poly(48, -52 + bob, 76, -22 + bob, 48, -22 + bob).fill('#efe4c8');
    },
    xdesk: (g2, p2) => {
      g2.rect(4, -24, 56, 24, 2).fill('#4a3424');
      g2.rect(10, -34, 20, 12, 1).fill('#f2ead8', 0.8); g2.circle(40, -30, 4).fill('#8a2a34', 0.8);
      g2.text('H', 20, -25, 7, '#8a2a34');
    },
    xboard: (g2, p2) => {
      g2.line(8, 0, 8, -50).stroke('#5a3a22', 3); g2.line(56, 0, 56, -50).stroke('#5a3a22', 3);
      g2.rect(2, -58, 60, 36, 2).fill('#8a6a48');
      [[8, -54, '#f2ead8'], [28, -52, '#ffe08a'], [44, -55, '#c9e0ff'], [12, -40, '#ffd0d0'], [34, -38, '#f2ead8']].forEach(([x, y, col]) => g2.rect(x, y, 14, 11, 1).fill(col, 0.6));
      g2.text(p2.label || 'QUESTS', 32, -16, 7, '#2b2340');
    },
    xkitchen: (g2, p2, t2) => {
      g2.rect(0, -30, 64, 30, 2).fill('#6a5a4a');
      g2.ell(20, -32, 12, 5).fill('#3a3a42'); g2.rect(8, -46, 24, 14, 3).fill('#4a4a52');
      for (let i = 0; i < 3; i++) g2.circle(14 + i * 6, -52 - ((t2 * 10 + i * 5) % 14), 2 + i * 0.4).fill('rgba(220,220,230,.5)', false);
      g2.rect(42, -40, 16, 10, 1).fill('#efe4c8', 0.6);
    },
    xdesign: (g2, p2, t2) => {
      g2.rect(0, -20, 64, 20, 2).fill('#5a4a3a');
      g2.rect(2, -56, 60, 34, 2).fill('#e8ecf0');
      g2.circle(12, -44, 4).fill('#ff9a3a', 0.6); g2.rect(26, -48, 10, 8, 1).fill('#7aa0d0', 0.6); g2.rect(46, -48, 10, 8, 1).fill('#d65a4a', 0.6);
      g2.line(16, -44, 26, -44).stroke('#2b2340', 0.8); g2.line(36, -44, 46, -44).stroke('#2b2340', 0.8);
      g2.circle(51, -32, 3).fill(Math.sin(t2 * 4) > 0 ? '#ffd76a' : '#c8a24a', 0.6);
    },
    xhalepost: (g2) => {
      g2.rect(4, -40, 24, 30, 1).fill('#efe4c8', 0.8);
      g2.circle(16, -30, 6).fill('#f0d0b8', 0.6); g2.ell(16, -35, 6, 2.4).fill('#d8d4cc', 0.5);
      g2.text('HE', 16, -18, 4.4, '#2b2340'); g2.text('PROTECTS', 16, -13, 4.4, '#2b2340');
    }
  });
})();
