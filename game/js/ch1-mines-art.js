// The Deny Mines' enemies, drawn in code (120 x 120 SVG, as js/ch1-art.js draws chapter 1's): the Galleries on
// floor 1 and the Trust Vaults on floor 2. The enemies themselves are in js/ch1-mines.js.
(function () {
  const INK = '#2b2340';
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const eyes = (x1, x2, y, r) => `<circle cx="${x1}" cy="${y}" r="${r || 4}" fill="#fff" ${S}/><circle cx="${x2}" cy="${y}" r="${r || 4}" fill="#fff" ${S}/><circle cx="${x1 + 1}" cy="${y + 1}" r="1.8" fill="${INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="1.8" fill="${INK}"/>`;
  const tag = (x, y, w, t, col) => `<rect x="${x}" y="${y}" width="${w}" height="15" rx="4" fill="#fff8e0" stroke="${col || INK}" stroke-width="2"/><text x="${x + w / 2}" y="${y + 11}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${col || INK}">${t}</text>`;
  const add = (id, col, anim, svg) => SD.art.addFoe(id, { col, anim, svg });

  // ---------- Floor 1: the Galleries ----------
  add('m1bat', '#c9a0ff', 'float', `
    <g ${S}><path d="M60 50 Q30 22 8 40 Q22 46 20 60 Q34 54 42 66 Q50 56 60 64Z" fill="#8b6cc9"/>
    <path d="M60 50 Q90 22 112 40 Q98 46 100 60 Q86 54 78 66 Q70 56 60 64Z" fill="#8b6cc9"/>
    <ellipse cx="60" cy="62" rx="16" ry="18" fill="#6a4fa8"/><path d="M50 46 L48 36 L56 44 M70 46 L72 36 L64 44" fill="#6a4fa8"/></g>
    ${eyes(54, 66, 58, 3.5)}<path d="M54 70 L57 74 L60 70 L63 74 L66 70" fill="none" stroke="#fff" stroke-width="2"/>
    ${tag(36, 88, 48, 'no Allow', '#d63a3a')}`);
  add('m1slime', '#a6e070', 'squish', `
    <g ${S}><path d="M14 106 Q10 62 60 52 Q110 62 106 106Z" fill="#a6e070"/><path d="M30 60 Q26 44 36 40 M84 60 Q92 46 86 38" fill="none"/></g>
    ${eyes(46, 74, 78, 6)}<path d="M50 94 Q60 100 70 94" fill="none" stroke="${INK}" stroke-width="3"/>
    <text x="60" y="44" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="34" fill="#ffcf33" stroke="${INK}" stroke-width="2">*</text>`);
  add('m1mimic', '#c9a07a', 'shake', `
    <g ${S}><path d="M18 64 H102 V106 H18Z" fill="#b5824d"/><path d="M16 64 Q60 18 104 64" fill="#9a6a3a"/>
    <path d="M24 64 L30 74 L36 64 L42 74 L48 64 L54 74 L60 64 L66 74 L72 64 L78 74 L84 64 L90 74 L96 64" fill="#fff"/>
    <rect x="52" y="84" width="16" height="14" rx="3" fill="#ffcf33"/></g>
    ${eyes(42, 78, 48, 5)}${tag(22, 106, 76, 'bucket ≠ bucket/*')}`);
  add('m1goblin', '#a6e070', 'shake', `
    <g ${S}><path d="M36 112 L40 70 H80 L84 112Z" fill="#5a7ea6"/><circle cx="60" cy="54" r="22" fill="#8fd16a"/>
    <path d="M38 50 L18 38 L36 60 M82 50 L102 38 L84 60" fill="#8fd16a"/><path d="M84 80 L104 70" fill="none"/>
    <circle cx="106" cy="66" r="7" fill="#ffcf33"/><path d="M106 72 V84 M106 78 H112" fill="none"/></g>
    ${eyes(52, 68, 50)}<path d="M50 64 Q60 70 70 64" fill="none" stroke="${INK}" stroke-width="3"/>
    ${tag(18, 92, 84, 'AWS_ACCESS_KEY_ID=…')}`);
  add('m1wall', '#b9c4d6', 'float', `
    <g ${S}><path d="M12 30 H108 V108 H12Z" fill="#9aa6bd"/>
    <path d="M12 50 H108 M12 70 H108 M12 90 H108 M36 30 V50 M72 30 V50 M24 50 V70 M60 50 V70 M96 50 V70 M36 70 V90 M72 70 V90 M24 90 V108 M60 90 V108 M96 90 V108" fill="none" stroke-width="2"/>
    <path d="M8 30 L60 8 L112 30Z" fill="#c7d0e0"/></g>
    ${eyes(44, 76, 60, 6)}<path d="M44 82 H76" stroke="${INK}" stroke-width="3"/>
    ${tag(28, 14, 64, 'Boundary', '#2a62c9')}`);
  add('m1asterisk', '#ffcf33', 'float', `
    <g ${S} transform="translate(60 62)">${[0, 60, 120].map(a => `<rect x="-9" y="-50" width="18" height="100" rx="9" fill="#ffcf33" transform="rotate(${a})"/>`).join('')}
    <circle r="24" fill="#ffe27a"/></g>
    <g transform="translate(0 2)">${eyes(50, 70, 58, 6)}</g><path d="M48 74 Q60 82 72 74" fill="none" stroke="${INK}" stroke-width="3"/>
    <path d="M44 28 L48 14 L56 24 L60 10 L64 24 L72 14 L76 28Z" fill="#ff8f5a" ${S}/>
    ${tag(26, 102, 68, 'Allow * on *', '#d63a3a')}`);

  // ---------- Floor 2: the Trust Vaults ----------
  add('m2untrusted', '#e0d4ff', 'float', `
    <g ${S}><path d="M30 112 Q30 50 60 36 Q90 50 90 112Z" fill="#6a4fa8"/><path d="M40 60 Q60 40 80 60 Q80 86 60 92 Q40 86 40 60Z" fill="#fff"/>
    <path d="M90 72 L106 60 M106 60 L112 70" fill="none"/></g>
    <path d="M46 64 Q52 58 58 64 M62 64 Q68 58 74 64" fill="none" stroke="${INK}" stroke-width="3"/><path d="M52 80 Q60 76 68 80" fill="none" stroke="${INK}" stroke-width="2.5"/>
    ${tag(20, 18, 80, 'Principal: ?', '#d63a3a')}`);
  add('m2wraith', '#dff4ff', 'float', `
    <g ${S}><path d="M28 104 Q24 40 60 30 Q96 40 92 104 L82 94 L72 106 L60 94 L48 106 L38 94Z" fill="#dff4ff" opacity=".95"/></g>
    ${eyes(50, 70, 58, 5)}<ellipse cx="60" cy="76" rx="6" ry="8" fill="${INK}"/>
    <g ${S}><circle cx="96" cy="34" r="12" fill="#fff"/><path d="M96 34 V26 M96 34 L102 38" fill="none"/></g>
    ${tag(14, 8, 64, 'issued 08:30', '#8b6cff')}`);
  add('m2serpent', '#8fdcff', 'float', `
    <g ${S}>${[0, 1, 2, 3, 4].map(i => `<circle cx="${22 + i * 18}" cy="${96 - (i % 2) * 14}" r="11" fill="${i % 2 ? '#5fb8e0' : '#8fdcff'}"/>`).join('')}
    <path d="M94 78 Q100 44 82 36 Q64 32 66 52 Q70 66 92 64" fill="#8fdcff"/></g>
    ${eyes(74, 86, 46, 3.5)}<path d="M84 60 L92 66 L96 60" fill="none" stroke="#d63a3a" stroke-width="2.5"/>
    ${tag(8, 12, 72, 'env → file → ec2', INK)}`);
  add('m2troll', '#c9b39a', 'shake', `
    <g ${S}><path d="M26 112 Q20 66 60 56 Q100 66 94 112Z" fill="#9fb27a"/><circle cx="60" cy="48" r="24" fill="#b8c98f"/>
    <path d="M38 40 L30 24 L46 34 M82 40 L90 24 L74 34" fill="#e8dcc2"/>
    <path d="M14 80 L30 72 M106 80 L90 72" fill="none"/><circle cx="12" cy="82" r="7" fill="#ffcf33"/><circle cx="108" cy="82" r="7" fill="#ffcf33"/></g>
    ${eyes(50, 70, 46)}<path d="M50 62 L54 58 L58 62 L62 58 L66 62 L70 58" fill="none" stroke="${INK}" stroke-width="2.5"/>
    ${tag(30, 96, 60, 'both say yes')}`);
  add('m2sprite', '#ff8fb0', 'shake', `
    <g ${S}><path d="M60 22 L68 44 L92 44 L72 58 L80 82 L60 68 L40 82 L48 58 L28 44 L52 44Z" fill="#ff8fb0"/></g>
    ${eyes(53, 67, 54, 3.5)}<path d="M54 64 Q60 60 66 64" fill="none" stroke="${INK}" stroke-width="2.5"/>
    <rect x="12" y="90" width="96" height="20" rx="4" fill="#fff" stroke="#d63a3a" stroke-width="2"/>
    <text x="60" y="104" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7.5" font-weight="700" fill="#d63a3a">Encoded message: Rk9y…</text>`);
  add('m2keeper', '#ffd76a', 'float', `
    <g ${S}><path d="M24 112 Q24 54 60 44 Q96 54 96 112Z" fill="#5a4a7a"/><circle cx="60" cy="40" r="18" fill="#e9c6a6"/>
    <path d="M40 34 Q60 10 80 34" fill="#5a4a7a"/><circle cx="60" cy="86" r="15" fill="#ffd76a"/><path d="M60 80 V92 M56 86 H64" fill="none" stroke-width="2.5"/>
    <path d="M96 70 L108 58" fill="none"/><circle cx="110" cy="54" r="6" fill="none" stroke="#d9a740" stroke-width="3"/></g>
    <path d="M52 40 H56 M64 40 H68" stroke="${INK}" stroke-width="3"/>
    ${tag(26, 4, 68, 'key policy', '#7a5232')}`);
  add('m2deputy', '#ffb27a', 'float', `
    <g ${S}><path d="M28 112 Q26 62 60 54 Q94 62 92 112Z" fill="#a8724f"/><circle cx="60" cy="42" r="20" fill="#e9c6a6"/>
    <path d="M30 30 Q60 6 90 30 L84 34 Q60 22 36 34Z" fill="#7a5232"/><path d="M48 80 L60 70 L72 80 L66 94 H54Z" fill="#ffcf33"/></g>
    <circle cx="52" cy="42" r="2.2" fill="${INK}"/><circle cx="70" cy="40" r="3.2" fill="${INK}"/><path d="M52 52 Q60 56 68 50" fill="none" stroke="${INK}" stroke-width="2.5"/>
    <text x="96" y="30" font-family="Fredoka, sans-serif" font-weight="700" font-size="22" fill="#d63a3a">?</text>
    ${tag(24, 98, 72, 'acting for: ???', '#d63a3a')}`);
})();
