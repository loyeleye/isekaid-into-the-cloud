// The vector proof of concept's incidents and bosses: Kyu and Uptima for chapter 1 (drawn instead of the generated
// sprites), and chapter 2's Sorting Floors, every one a way a message can fail. Each is the inside of a 120 x 120
// viewBox in the battle style chapter 1's own vector incidents use (js/ch1-art.js): thick ink, flat bright fills.
// Also: hit sparks and speech-bubble emotes drawn in code instead of Kenney's packs.
(function () {
  const K = SD.vec;
  const INK = K.INK;
  const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
  const SW = w => S.replace('stroke-width="3"', `stroke-width="${w}"`);
  const eyes = (x1, x2, y, col) => `<circle cx="${x1}" cy="${y}" r="5" fill="#fff" ${SW(2)}/><circle cx="${x2}" cy="${y}" r="5" fill="#fff" ${SW(2)}/><circle cx="${x1 + 1}" cy="${y + 1}" r="2.2" fill="${col || INK}"/><circle cx="${x2 - 1}" cy="${y + 1}" r="2.2" fill="${col || INK}"/>`;
  const letter = (x, y, w, rot, col) => `<g transform="translate(${x} ${y}) rotate(${rot || 0})"><rect x="${-w / 2}" y="${-w * 0.33}" width="${w}" height="${w * 0.66}" rx="2" fill="${col || '#fff8e8'}" ${SW(2.4)}/><path d="M${-w / 2} ${-w * 0.33} L0 ${w * 0.08} L${w / 2} ${-w * 0.33}" fill="none" ${SW(2.4)}/></g>`;
  const label = (text, col) => `<g transform="rotate(-8 60 18)"><rect x="16" y="8" width="88" height="20" rx="4" fill="#fff" stroke="${col || '#d63a3a'}" stroke-width="3"/><text x="60" y="23" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="11" fill="${col || '#d63a3a'}">${text}</text></g>`;

  const F = K.foes = {
    // Kyu, the explicit Deny: a girl in a black robe behind one red line of policy.
    kyuboss: () => `<g ${S}><path d="M30 116 Q32 60 60 52 Q88 60 90 116Z" fill="#1b1724"/><path d="M40 60 Q36 20 60 16 Q84 20 80 60 L86 100 L34 100Z" fill="#15111b"/>
      <path d="M44 44 Q44 26 60 26 Q76 26 76 44 Q76 62 60 66 Q44 62 44 44Z" fill="#f0dad0"/><path d="M44 40 Q50 24 60 24 Q70 24 76 40 Q66 32 60 40 Q54 32 44 40Z" fill="#15111b"/>
      <path d="M50 70 L60 90 L70 70" fill="#a3203a"/></g>
      <ellipse cx="53" cy="46" rx="3" ry="3.6" fill="#8a6cff"/><ellipse cx="67" cy="46" rx="3" ry="3.6" fill="#8a6cff"/><path d="M55 56 H65" stroke="${INK}" stroke-width="2"/>
      <rect x="8" y="82" width="104" height="18" rx="3" fill="#fff" stroke="#d63a3a" stroke-width="3"/><text x="60" y="95" text-anchor="middle" font-family="ui-monospace, monospace" font-weight="700" font-size="10" fill="#d63a3a">"Effect": "Deny"</text>`,
    // Uptima on her throne: peach hair, crown, apron over the robe, and her logs.
    uptimaboss: () => `<g ${S}><path d="M14 116 V40 Q14 26 28 26 H92 Q106 26 106 40 V116Z" fill="#6a5a8a"/><path d="M28 116 Q30 66 60 58 Q90 66 92 116Z" fill="#2b2340"/>
      <path d="M48 70 H72 L76 116 H44Z" fill="#fff"/><path d="M36 60 Q32 20 60 18 Q88 20 84 60 L88 92 L32 92Z" fill="#ffc69a"/>
      <path d="M44 44 Q44 28 60 28 Q76 28 76 44 Q76 60 60 64 Q44 60 44 44Z" fill="#ffe3d0"/><path d="M44 18 L50 6 L56 14 L60 2 L64 14 L70 6 L76 18Z" fill="#ffd25a"/></g>
      <ellipse cx="53" cy="44" rx="3" ry="3.6" fill="#3b8bff"/><ellipse cx="67" cy="44" rx="3" ry="3.6" fill="#3b8bff"/><path d="M55 54 Q60 51 65 54" fill="none" stroke="${INK}" stroke-width="2"/>
      <g transform="translate(92 92) rotate(12)"><rect x="-12" y="-14" width="24" height="28" rx="2" fill="#fff8e0" ${SW(2)}/><path d="M-7 -6 H7 M-7 0 H7 M-7 6 H3" stroke="${INK}" stroke-width="1.6"/></g>`,

    // ---------- Chapter 2, raid floor 1: Intake ----------
    // The Poison Pill: one bad letter that fails every time and comes back every turn.
    poisonpill: () => `<g ${S}><path d="M20 64 Q20 34 60 34 Q100 34 100 64 V96 Q100 110 86 110 H34 Q20 110 20 96Z" fill="#9be07a"/><path d="M20 64 L60 86 L100 64" fill="none"/>
      <path d="M60 34 L60 18" /><circle cx="60" cy="14" r="5" fill="#e04a6a"/></g>${eyes(46, 74, 60, '#5a1a3a')}
      <path d="M48 76 Q54 70 60 76 Q66 82 72 76" fill="none" stroke="${INK}" stroke-width="2.5"/><text x="60" y="104" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="10" fill="#2a5a1a">receives: 7</text>`,
    // The Visibility Ghost: a letter that turns up twice because its timeout ran out mid-fight.
    visghost: () => `<g opacity=".45" transform="translate(16 -6)"><path d="M30 104 Q24 40 60 30 Q96 40 90 104 L80 96 L70 106 L60 96 L50 106 L40 96Z" fill="#dfe8ff" ${S}/></g>
      <g ${S}><path d="M22 110 Q16 44 52 34 Q88 44 82 110 L72 102 L62 112 L52 102 L42 112 L32 102Z" fill="#efeaff"/></g>${eyes(42, 62, 64)}
      <ellipse cx="52" cy="82" rx="6" ry="7" fill="${INK}"/>${letter(92, 40, 26, 14)}
      <circle cx="96" cy="78" r="13" fill="#fff" ${SW(2.4)}/><path d="M96 70 V78 L102 82" fill="none" ${SW(2.4)}/>`,
    // Twins: the same order, delivered twice.
    twins2: () => [24, 70].map((x, i) => `<g transform="translate(${x} 0)"><g ${S}><path d="M2 108 Q0 60 26 52 Q52 60 50 108Z" fill="${i ? '#ffd08f' : '#ffc070'}"/><circle cx="26" cy="42" r="16" fill="${i ? '#ffd08f' : '#ffc070'}"/></g>${eyes(20, 32, 40)}
      <path d="M20 50 Q26 54 32 50" fill="none" stroke="${INK}" stroke-width="2"/><rect x="10" y="70" width="32" height="22" rx="3" fill="#fff" ${SW(2)}/><text x="26" y="85" text-anchor="middle" font-family="ui-monospace, monospace" font-weight="700" font-size="9" fill="${INK}">#4417</text></g>`).join(''),
    // The Empty Clerk: polls an empty queue all day and eats bits doing it.
    emptyclerk: () => `<g ${S}><path d="M10 112 H110 V96 H10Z" fill="#8a6a4a"/><path d="M30 96 Q30 56 60 50 Q90 56 90 96Z" fill="#c9b39a"/><circle cx="60" cy="38" r="18" fill="#e9d6c0"/>
      <path d="M42 30 Q60 14 78 30" fill="#6a5a4a"/><rect x="78" y="70" width="30" height="24" rx="3" fill="#fff"/></g>
      <circle cx="53" cy="38" r="2.5" fill="${INK}"/><circle cx="67" cy="38" r="2.5" fill="${INK}"/><path d="M52 47 H68" stroke="${INK}" stroke-width="2"/>
      <text x="93" y="87" text-anchor="middle" font-family="ui-monospace, monospace" font-weight="700" font-size="11" fill="#d63a3a">0</text>
      <text x="22" y="62" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="12" fill="#fff" stroke="${INK}" stroke-width="0.8">?</text><text x="30" y="46" font-family="Fredoka, sans-serif" font-weight="700" font-size="9" fill="#fff" stroke="${INK}" stroke-width="0.6">?</text>`,
    // The Backlog (elite): a heap of letters that grows by the age of her oldest one.
    backlog: () => `<g ${S}><path d="M8 112 Q14 46 60 30 Q106 46 112 112Z" fill="#e8d8b8"/></g>
      ${letter(34, 92, 26, -12)}${letter(60, 98, 28, 6)}${letter(86, 90, 26, 14)}${letter(40, 74, 24, 8)}${letter(80, 72, 24, -10)}
      ${eyes(50, 70, 50, '#a3203a')}<path d="M52 62 Q60 57 68 62" fill="none" stroke="${INK}" stroke-width="2.5"/>
      <rect x="70" y="6" width="44" height="18" rx="4" fill="#fff" stroke="#d63a3a" stroke-width="2.5"/><text x="92" y="19" text-anchor="middle" font-family="ui-monospace, monospace" font-weight="700" font-size="9" fill="#d63a3a">age 9d</text>`,
    // The Postmistress Without Post (floor boss): a standard queue, every hit out of order and some twice.
    postmistress: () => `<g ${S}><path d="M24 116 Q26 62 60 54 Q94 62 96 116Z" fill="#3a4a7a"/><path d="M60 54 L50 116 M60 54 L70 116" fill="none" stroke-width="2"/>
      <path d="M40 46 Q38 16 60 14 Q82 16 80 46 Q80 64 60 68 Q40 64 40 46Z" fill="#f0d6c4"/><path d="M36 26 Q60 2 84 26 L88 30 L32 30Z" fill="#26325a"/><circle cx="60" cy="14" r="4" fill="#ffd25a"/>
      <path d="M8 76 L30 64 L36 100 L14 108Z" fill="#a8743a"/></g>${eyes(52, 68, 44)}<path d="M53 56 Q60 52 67 56" fill="none" stroke="${INK}" stroke-width="2"/>
      ${letter(98, 40, 18, 30)}${letter(104, 70, 18, -20)}${letter(92, 96, 18, 50)}
      <text x="98" y="58" font-family="ui-monospace, monospace" font-weight="700" font-size="8" fill="${INK}">3</text><text x="106" y="88" font-family="ui-monospace, monospace" font-weight="700" font-size="8" fill="${INK}">1</text><text x="84" y="112" font-family="ui-monospace, monospace" font-weight="700" font-size="8" fill="${INK}">2 2</text>`,

    // ---------- Chapter 2, raid floor 2: Fan-out ----------
    // The Town Crier: every hit lands on everyone, the way a topic delivers to every subscriber.
    towncrier: () => `<g ${S}><path d="M30 116 Q32 60 60 52 Q88 60 90 116Z" fill="#b8402a"/><circle cx="60" cy="38" r="17" fill="#e8b48e"/><path d="M40 28 L60 8 L80 28Z" fill="#26325a"/>
      <path d="M84 50 L112 34 V74 L84 60Z" fill="#ffd25a"/><path d="M10 76 Q20 70 22 82 Q16 90 10 84Z" fill="#c89a3a"/></g>
      <circle cx="54" cy="36" r="2.5" fill="${INK}"/><circle cx="66" cy="36" r="2.5" fill="${INK}"/><ellipse cx="60" cy="47" rx="5" ry="4" fill="${INK}"/>
      <path d="M114 40 L119 36 M115 54 H120 M114 68 L119 72" stroke="${INK}" stroke-width="2.5"/>`,
    // The Bell With No Ringer: a rule whose pattern matches nothing.
    bellnoringer: () => `<g ${S}><path d="M60 12 V22"/><path d="M30 92 Q32 34 60 24 Q88 34 90 92 Q96 96 96 102 H24 Q24 96 30 92Z" fill="#c9a24a"/><circle cx="60" cy="108" r="7" fill="#8a6a2a"/></g>
      ${eyes(48, 72, 60)}<path d="M52 76 H68" stroke="${INK}" stroke-width="2"/>
      <rect x="2" y="26" width="38" height="22" rx="3" fill="#fff" stroke="${INK}" stroke-width="2"/><text x="21" y="40" text-anchor="middle" font-family="ui-monospace, monospace" font-size="7" font-weight="700" fill="${INK}">"bel"</text>
      <path d="M8 28 L34 46" stroke="#d63a3a" stroke-width="2.5"/>`,
    // The Millrace: a stream that keeps order, but only within each shard.
    millrace: () => `<g ${S}><path d="M4 70 Q30 56 60 70 Q90 84 116 70 V112 H4Z" fill="#6aaee0"/><circle cx="84" cy="52" r="26" fill="#a8743a"/></g>
      ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M84 52 L${84 + Math.cos(i) * 26} ${52 + Math.sin(i) * 26}" stroke="${INK}" stroke-width="2.5"/>`).join('')}<circle cx="84" cy="52" r="6" fill="${INK}"/>
      <path d="M10 84 H110 M10 98 H110" stroke="#fff" stroke-width="2" stroke-dasharray="6 8"/>
      ${[[20, 84, '1'], [44, 84, '2'], [24, 98, 'a'], [52, 98, 'b']].map(([x, y, n]) => `<rect x="${x - 7}" y="${y - 6}" width="14" height="12" rx="2" fill="#fff8e8" stroke="${INK}" stroke-width="1.8"/><text x="${x}" y="${y + 3}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="8" font-weight="700" fill="${INK}">${n}</text>`).join('')}
      ${eyes(30, 48, 58)}`,
    // Thundering Herd (elite): every waiting consumer wakes at once for the same one letter.
    herd: () => [[16, 66], [42, 58], [70, 62], [96, 70]].map(([x, y], i) => `<g ${S}><path d="M${x - 14} ${y + 46} Q${x - 14} ${y} ${x} ${y - 4} Q${x + 14} ${y} ${x + 14} ${y + 46}Z" fill="${['#ffb27a', '#ffc68f', '#ffa86a', '#ffd0a0'][i]}"/></g>
      <circle cx="${x - 5}" cy="${y + 10}" r="3.2" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="${x + 5}" cy="${y + 10}" r="3.2" fill="#fff" stroke="${INK}" stroke-width="1.5"/><circle cx="${x - 5}" cy="${y + 11}" r="1.3" fill="${INK}"/><circle cx="${x + 5}" cy="${y + 11}" r="1.3" fill="${INK}"/>
      <ellipse cx="${x}" cy="${y + 22}" rx="3" ry="4" fill="${INK}"/>`).join('') + letter(60, 20, 26, 0) + `<path d="M40 30 L30 22 M80 30 L90 22 M60 4 V-2" stroke="#ffd25a" stroke-width="3"/>`,
    // The Belfry (floor boss): one attack copied to every subscriber, until filter policies address each copy.
    belfry: () => `<g ${S}><path d="M26 116 V46 L60 14 L94 46 V116Z" fill="#8a7a6a"/><path d="M38 116 V70 Q38 54 60 54 Q82 54 82 70 V116Z" fill="#2a2018"/>
      <path d="M44 96 Q46 66 60 62 Q74 66 76 96 Q80 98 80 102 H40 Q40 98 44 96Z" fill="#c9a24a"/><path d="M60 14 V2"/><path d="M18 46 H102" stroke-width="4"/></g>
      <circle cx="52" cy="82" r="3" fill="#ffd25a"/><circle cx="68" cy="82" r="3" fill="#ffd25a"/>
      ${[[8, 70], [8, 92], [112, 70], [112, 92]].map(([x, y]) => `<path d="M${x} ${y} l${x < 60 ? -6 : 6} -4 M${x} ${y + 6} h${x < 60 ? -8 : 8}" stroke="${INK}" stroke-width="2.5"/>`).join('')}
      ${label('fan-out ×4', '#8a4aa0')}`
  };
  // Anything else without art: a plain, worried incident.
  F.generic = () => `<g ${S}><path d="M18 108 Q14 50 60 40 Q106 50 102 108Z" fill="#c9c4d6"/></g>${eyes(48, 72, 70)}<path d="M50 88 Q60 82 70 88" fill="none" stroke="${INK}" stroke-width="2.5"/>`;

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
  const COL = { kyuboss: ['#b9a3ff', 'float'], uptimaboss: ['#ffd9a0', 'float'], poisonpill: ['#9be07a', 'squish'], visghost: ['#efeaff', 'float'], twins2: ['#ffc070', 'shake'],
    emptyclerk: ['#c9b39a', 'float'], backlog: ['#e8d8b8', 'squish'], postmistress: ['#8fa0d8', 'float'], towncrier: ['#ff9a6b', 'shake'], bellnoringer: ['#e8c86a', 'float'],
    millrace: ['#6aaee0', 'float'], herd: ['#ffb27a', 'shake'], belfry: ['#c8a0e0', 'float'] };
  K.installs.push(() => {
    Object.keys(COL).forEach(id => SD.art.addFoe(id, { col: COL[id][0], anim: COL[id][1], svg: F[id] }));
    // Never fall back to a painted monster: an incident with no art of its own gets the plain one.
    const enemy = SD.art.enemy;
    SD.art.enemy = function (sprite, boss, hue) {
      if (!SD.art.hasFoe(sprite) || /<image /.test(enemy(sprite, boss, hue))) SD.art.addFoe(sprite, { col: '#c9c4d6', anim: 'float', svg: F.generic });
      return enemy(sprite, boss, hue);
    };
    SD.ui.sparkArt = img => spark[img] || spark.spark_05;
    SD.scene.emoteArt = emote;
  });
})();
