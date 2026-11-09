// Shared UI: dialogue with typewriter voices, toasts, panels, the cheat sheet (codex).
(function () {
  const U = SD.ui = {};
  const $ = s => document.querySelector(s);
  U.$ = $;
  // On a phone or tablet (no hover, a finger to point with), the how-to-move lines lead with tapping: the keys they
  // name aren't there. Elsewhere the text is unchanged.
  U.touch = () => !!(window.matchMedia && matchMedia('(hover: none) and (pointer: coarse)').matches);
  const TAP = 'Tap where you want to go, and tap someone to talk to them.';
  U.howTo = text => !U.touch() ? text : text
    .replace(/Arrow keys or WASD to walk, E or Enter to talk(\. Or tap where you want to go, and tap someone to talk to them|, or tap where you want to go)\./, TAP)
    .replace('Walk with the arrow keys or WASD, or tap where you want to go. Tap someone, or press E, to talk.', TAP)
    .replace('Arrow keys or WASD to walk, E to talk, or tap.', 'Tap where you want to go, and tap someone to talk.')
    .replace('V mutes or unmutes the sound.', 'The 🔊 button turns the sound on or off.');
  U.esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ---- Dialogue with typewriter text ----
  let dq = [], dDone = null, typing = null, full = '';
  // Each speaker gets a typewriter blip pitch, the way classic JRPGs give characters a voice.
  const VOICE = { uptima: 900, pip: 1250, gary: 210, seymour: 480, mio: 1100, wen: 720, chad: 430, latency: 150, system: 620, you: 660, bru: 980, ayo: 260, coo: 1400, lexi: 820, cron: 330, kaito: 560, doug: 390, aigerim: 1050 };
  // Chapters give their own cast a voice (js/ch1.js).
  U.voice = (who, hz) => { VOICE[who] = hz; };
  U.voiceOf = who => VOICE[who] || 600;
  U.dialog = function (lines, done) {
    return new Promise(res => {
      dq = lines.slice(); dDone = () => { if (done) done(); res(); };
      $('#dialog').hidden = false;
      next();
    });
  };
  function fill(t) {
    const sv = SD.state.save;
    return t.replace(/\{name\}/g, sv.name).replace(/\{loop\}/g, sv.loop).replace(/\{incident\}/g, U.lastIncident || 'A cascade');
  }
  function next() {
    if (typing) { clearInterval(typing); typing = null; $('#dlg-text').textContent = full; return; }
    const l = dq.shift();
    if (!l) { $('#dialog').hidden = true; const d = dDone; dDone = null; if (d) d(); return; }
    const who = l.s, c = SD.cast[who];
    if (l.slide && U.slide) U.slide(l.slide);
    if (l.fx && U.onFx) U.onFx(l.fx);
    // A line can stage something as it appears (a step, a wince); it runs alongside the typing.
    if (typeof l.cue === 'function') l.cue();
    // During cutscenes the speaker stands centre stage, visual-novel style.
    const st = $('#stage');
    const mood = SD.art.mood(who, l.t, l.e);
    if (!st.hidden && !st.dataset.slide) {
      let a = st.querySelector('.actor');
      if (!a) { a = document.createElement('div'); a.className = 'actor'; st.appendChild(a); }
      if (who === 'narr' || who === 'system') { /* keep whoever is on stage */ }
      else if (who === 'you') a.hidden = true;
      else {
        const key = who + ':' + mood;
        if (a.dataset.who !== key) { a.dataset.who = key; a.innerHTML = SD.art.portrait(who, 280, mood); }
        a.hidden = false;
      }
    }
    const box = $('#dialog');
    box.dataset.who = who;
    box.classList.toggle('painted', SD.art.painted(who));
    $('#dlg-portrait').innerHTML = who === 'narr' ? '' : SD.art.portrait(who, SD.art.painted(who) ? 150 : 96, mood);
    $('#dlg-portrait').hidden = who === 'narr';
    $('#dlg-name').textContent = who === 'narr' ? '' : who === 'you' ? SD.state.save.name : c.name;
    $('#dlg-title').textContent = who === 'narr' ? '' : (c.title || '');
    full = fill(l.t); let i = 0;
    const el = $('#dlg-text'); el.textContent = '';
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = full; return; }
    // Lord Latency's lines arrive late. Of course they do.
    const slow = who === 'latency';
    let n = 0;
    typing = setInterval(() => {
      i += slow ? 1 : 2; el.textContent = full.slice(0, i);
      if (SD.audio && SD.audio.chirps && SD.audio.chirps(who)) SD.audio.chirp(who, full, i - (slow ? 1 : 2), i, mood);
      else if (who !== 'narr' && n++ % 3 === 0 && SD.audio) SD.audio.sfx('text', VOICE[who] || 600);
      if (i >= full.length) { clearInterval(typing); typing = null; }
    }, slow ? 70 : 18);
  }
  U.initDialog = function () {
    // Every button press clicks, like a menu cursor.
    document.addEventListener('click', e => {
      if (SD.audio && e.target.closest && e.target.closest('button, .opt, .node')) SD.audio.sfx('blip');
    });
    $('#dialog').addEventListener('click', next);
    $('#dlg-skip').addEventListener('click', e => { e.stopPropagation(); if (typing) { clearInterval(typing); typing = null; } dq = []; next(); });
    window.addEventListener('keydown', e => {
      if ($('#dialog').hidden) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); }
    });
  };

  // ---- Cutscene stage and flashes ----
  // A chapter can give a stage its own backdrop (js/ch1.js gives its scenes layers of storm cloud).
  U.stageDecor = {};
  U.stage = function (scene) {
    const st = $('#stage');
    document.body.classList.toggle('cut', !!scene);
    document.body.classList.remove('slides');
    delete st.dataset.slide; delete st.dataset.glow; delete st.dataset.crumbs;
    if (!scene) { st.hidden = true; st.innerHTML = ''; return; }
    st.dataset.scene = scene; st.hidden = false;
    st.innerHTML = U.stageDecor[scene] != null ? U.stageDecor[scene] : scene === 'office' ? '' : Array.from({ length: 5 }, (_, i) => `<div class="cloud" style="top:${8 + i * 14}%;animation-delay:${-i * 6}s;transform:scale(${0.6 + (i % 3) * 0.3})"></div>`).join('');
  };
  U.flash = function () {
    const f = document.createElement('div'); f.className = 'flash';
    document.body.appendChild(f); setTimeout(() => f.remove(), 650);
  };

  // ---- Toasts ----
  const sq = []; let showing = false;
  // ms: how long it stays up (default 3 seconds), for a longer one-time tip.
  U.system = function (title, body, kind, ms) {
    sq.push({ title, body, kind, ms }); if (!showing) pump();
    if (SD.audio) SD.audio.sfx(kind === 'gold' ? 'coin' : kind === 'red' ? 'wrong' : 'blip');
  };
  function pump() {
    const n = sq.shift(); if (!n) { showing = false; return; }
    showing = true;
    const el = document.createElement('div');
    el.className = 'sysnote ' + (n.kind || '');
    el.setAttribute('role', 'status');
    el.innerHTML = `<div class="sys-h"><span class="sys-i">!</span>${U.esc(n.title)}</div>${n.body ? `<div class="sys-b">${n.body}</div>` : ''}`;
    // Sit just below whatever header is showing, so a wrapped phone HUD never hides the toast.
    const bar = ['#hud', '.run-hud'].map(q => $(q)).find(h => h && h.offsetParent);
    $('#notes').style.top = (bar ? Math.max(12, bar.getBoundingClientRect().bottom + 8) : 12) + 'px';
    $('#notes').appendChild(el);
    const ms = n.ms || 3000;
    setTimeout(() => el.classList.add('out'), ms - 400);
    setTimeout(() => { el.remove(); pump(); }, ms);
  }

  // ---- Modal panels ----
  U.panel = function (html, opts) {
    opts = opts || {};
    const p = $('#panel');
    p.innerHTML = `<div class="win ${opts.cls || ''}" role="dialog" aria-modal="true">
      <div class="win-h"><span>${U.esc(opts.title || 'SYSTEM')}</span>${opts.noClose ? (U.quitGame ? '<button class="x quit" id="panel-quit" aria-label="Leave the mini-game">✕ Leave</button>' : '') : '<button class="x" id="panel-x" aria-label="Close">✕</button>'}</div>
      <div class="win-b">${html}</div></div>`;
    p.hidden = false;
    if (!opts.noClose) $('#panel-x').onclick = () => { U.closePanel(); if (opts.onClose) opts.onClose(); };
    else if (U.quitGame) $('#panel-quit').onclick = () => U.quitGame();
    return p.querySelector('.win-b');
  };
  U.closePanel = function () { $('#panel').hidden = true; $('#panel').innerHTML = ''; };

  // ---- Cards ----
  // c: a card id, { id, up } (a card in a deck), or a card definition itself.
  U.cardDef = function (c) { return c && typeof c === 'object' && c.text != null ? c : SD.cards[c.id || c]; };
  // The numbers a card's text shows, with its upgrades in. c.up: true for a refactored card, or its level (Expedition
  // Raid passes Refactor plus Temper). Each level adds 3 to Mitigate and Absorb and 2 to what infra absorbs each turn,
  // as both battle engines do (js/run.js playCard, js/raid.js fxApply). c.powUp: the levels that add to the hit, when
  // that differs (the raid engine adds 3 to a hit only for a Temper).
  U.cardNums = function (c) {
    const d = U.cardDef(c), lvl = c.up ? (+c.up || 1) : 0, up = 3 * lvl;
    const n = {};
    if (d.abs) for (const k in d.abs) n[k] = d.abs[k] + up;
    if (d.mit) n.mit = d.mit + up;
    if (d.each) for (const k in d.each) n['each.' + k] = d.each[k] + 2 * lvl;
    // pow: the hit a card lands on the incident, full if a tag is its weakness, half if neutral, none if resisted.
    if (d.pow) n.pow = d.pow + 3 * (c.powUp != null ? +c.powUp : lvl);
    return n;
  };
  // A card's text with its numbers filled in ({mit}, {any}, {each.any} and the like).
  U.cardText = function (c) {
    const d = U.cardDef(c), n = U.cardNums(c);
    return d.text.replace(/\{([\w.]+)\}/g, (_, k) => n[k] != null ? n[k] : '');
  };
  // What a ⚔ card's hit will do to an incident, from what the player has found out (has('w:tag'), 'r:tag', and
  // 'n:tag' for a tag that landed a partial hit), worked out the way both engines resolve it: a weakness first, then a
  // resistance, else half. Returns 'weak', 'resist', 'neutral', or null while it's still unknown.
  U.powMatch = function (d, e, has) {
    if (!d.pow || !e) return null;
    if (d.wild) return 'weak';
    const tags = d.tags || [];
    if (tags.some(t => has('w:' + t))) return 'weak';
    const allWeak = Object.keys(e.weak || {}).every(t => has('w:' + t)), allRes = Object.keys(e.resist || {}).every(t => has('r:' + t));
    // A tag nobody has tried could still be a weakness, unless every weakness is already known.
    const settled = t => has('r:' + t) || has('n:' + t) || allWeak;
    if (!tags.every(settled)) return null;
    if (tags.some(t => has('r:' + t))) return 'resist';
    return tags.every(t => has('n:' + t)) || allRes ? 'neutral' : null;
  };
  // The badge's number: the full hit, half, 0, or "≤N" (the most it can do) while the match is unknown.
  U.powShow = function (n, m) { return m === 'weak' ? '' + n : m === 'neutral' ? '' + Math.floor(n / 2) : m === 'resist' ? '0' : '≤' + n; };
  // The first ⚔ card you ever play: once, a line under the battle log that says how its hit works, with its numbers.
  // Returns the line, or '' after the first time.
  U.powTip = function (n) {
    const sv = SD.state && SD.state.save;
    if (!sv || !sv.flags || sv.flags.powTip) return '';
    sv.flags.powTip = true; SD.state.persist();
    return `⚔ ${n} hits the incident too: ${n} if it's weak to the card, ${Math.floor(n / 2)} if neutral, 0 if it resists. The badge shows the real number once you know. Mitigate in a card's text always lands in full.`;
  };
  // A small sword (game-icons' crossed swords), or the ⚔ character if the icon set isn't loaded.
  const sword = () => (SD.art && SD.art.icon && SD.art.icon('crossed-swords', 'currentColor')) || '⚔';
  U.cardHtml = function (c, opts) {
    opts = opts || {};
    const d = U.cardDef(c); const n = U.cardNums(c);
    const text = U.cardText(c);
    const tagHue = { cache: 190, replica: 160, cdn: 210, shard: 280, lb: 45, hscale: 45, stateless: 45, salting: 190, coalesce: 320, ttl: 320, invalidate: 0, cp: 0, ap: 120, idgen: 260, nosql: 280, sql: 30, '302': 210, vscale: 30 };
    const tag = (d.tags || [])[0];
    const hue = tag != null && tagHue[tag] != null ? tagHue[tag] : 220;
    const cost = d.xcost ? 'X' : opts.cost != null ? opts.cost : d.cost;
    // The ⚔ badge, on the art row: in a fight (opts.foe: { e, has }) it shows what the hit will do once the player
    // knows; otherwise, and until then, "≤N".
    const m = n.pow && opts.foe ? U.powMatch(d, opts.foe.e, opts.foe.has) : null;
    const powSay = !n.pow ? '' : m === 'weak' ? `Hits the incident for ${n.pow}: it's weak to this card.` : m === 'neutral' ? `Hits the incident for ${Math.floor(n.pow / 2)}, half of ${n.pow}: it isn't weak to this card.` : m === 'resist' ? `The incident resists this card: its hit of ${n.pow} does nothing.` : `Hits the incident for up to ${n.pow}: ${n.pow} if it's weak to this card, half if neutral, nothing if it resists.`;
    const pow = n.pow ? `<div class="c-pow${m ? ' ' + m : ''}" title="${U.esc(powSay)}" aria-hidden="true">${sword()}<b>${U.powShow(n.pow, m)}</b></div>` : '';
    return `<div class="card ${d.kind} r-${d.rarity}${n.pow ? ' has-pow' : ''}${opts.dim ? ' dim' : ''}" style="--h:${hue}" data-i="${opts.i != null ? opts.i : ''}" tabindex="0" role="button" aria-label="${U.esc(d.name)}, cost ${cost}.${n.pow ? ' ' + U.esc(powSay) : ''} ${U.esc(text)}">
      <div class="c-cost">${cost}</div>
      <div class="c-name">${U.esc(d.name)}${c.up && c.plus !== false ? '+' : ''}${c.replay ? ` <b title="Replay ${c.replay}">⟳${c.replay}</b>` : ''}</div>
      <div class="c-art">${SD.art.glyph(d.art, `hsl(${hue},70%,38%)`)}${pow}</div>
      <div class="c-kind">${d.kind === 'infra' ? 'INFRA' : 'ACTION'}${d.concept ? ' · ' + U.esc(SD.concepts[d.concept].name) : ''}</div>
      <div class="c-text">${U.esc(text)}</div></div>`;
  };

  // ---- Codex: Uptima's cheat sheet, restored page by page ----
  U.codex = function (tab) {
    tab = tab || 'concepts';
    const sv = SD.state.save;
    const tabs = [['concepts', 'Concepts'], ['map', 'Mind map'], ['questions', 'Open questions'], ['drawings', "Mio's drawings"]];
    let body = `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" class="tab${k === tab ? ' on' : ''}" data-tab="${k}" aria-selected="${k === tab}">${l}</button>`).join('')}</div>`;
    if (tab === 'concepts') {
      body += '<div class="cx-list">';
      for (const id in SD.concepts) {
        // Side quests' concepts (zone 98) join the cheat sheet once you've met them.
        if (SD.concepts[id].zone > (sv.chapter || 1) && !(SD.concepts[id].zone === 98 && (sv.concepts[id] || {}).seen)) continue;
        const c = SD.concepts[id], st = SD.state.concept(id), m = SD.state.mastery(id);
        const page = sv.pages.includes(id);
        const due = st.seen && st.due <= Date.now();
        body += `<div class="cx ${st.seen ? '' : 'locked'}">
          <div class="cx-h"><b>${st.seen ? U.esc(c.name) : '??? Unknown concept'}</b>${due ? '<span class="pill due">Review due</span>' : ''}<span class="pill s${m.stage}">${m.label}</span></div>
          ${st.seen ? `<div class="mbar">${[1, 2, 3, 4].map(i => `<i class="${m.stage >= i ? 'on' : ''}"></i>`).join('')}</div><p>${U.esc(c.gist)}</p>` : '<p class="muted">Meet it in Prod to record it.</p>'}
          ${page ? `<blockquote class="page">${U.esc(c.page)}</blockquote>` : st.seen ? '<p class="muted small">Notebook page: answer this concept right twice in a row to restore it.</p>' : ''}
        </div>`;
      }
      body += '</div>';
    } else if (tab === 'map') {
      body += U.mindMap();
      body += `<p class="muted small">Lines are connections you have reflected on in a Break Room. Relating ideas, not repeating them, is what makes them stick.</p>`;
      const known = SD.links.filter(l => sv.links.includes(l.id));
      body += known.length ? `<ul class="links">${known.map(l => `<li><b>${U.esc(SD.concepts[l.a].name)} ↔ ${U.esc(SD.concepts[l.b].name)}</b>: ${U.esc(l.text)}</li>`).join('')}</ul>` : '<p class="muted">No connections yet.</p>';
    } else if (tab === 'questions') {
      const qs = sv.openQs || [];
      body += `<p class="muted small">When something confused you, you turned it into a question. Bring these to your study session or a mock interview.</p>`;
      body += qs.length ? `<ul class="links">${qs.slice().reverse().map(q => `<li>${U.esc(q)}</li>`).join('')}</ul>` : '<p class="muted">None yet.</p>';
    } else {
      body += sv.drawings ? `<div class="drawings">${Array.from({ length: sv.drawings }, (_, i) => `<figure>${SD.art.drawing(i)}<figcaption>Loop ${i + 1}</figcaption></figure>`).join('')}</div>` : '<p class="muted">Visit Mio at her treehouse.</p>';
    }
    const b = U.panel(body, { title: "UPTIMA'S CHEAT SHEET", cls: 'wide' });
    b.querySelectorAll('.tab').forEach(t => t.onclick = () => U.codex(t.dataset.tab));
  };
  U.mindMap = function () {
    const sv = SD.state.save; const ids = Object.keys(SD.concepts).filter(id => SD.concepts[id].zone <= (sv.chapter || 1));
    const R = 130, cx = 170, cy = 160;
    const pos = {};
    ids.forEach((id, i) => { const a = i / ids.length * Math.PI * 2 - Math.PI / 2; pos[id] = [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
    let s = `<div class="mm"><svg viewBox="0 0 340 320" role="img" aria-label="Concept mind map">`;
    SD.links.filter(l => pos[l.a] && pos[l.b]).forEach(l => {
      const [x1, y1] = pos[l.a], [x2, y2] = pos[l.b]; const on = sv.links.includes(l.id);
      s += `<path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" fill="none" stroke="${on ? 'var(--blue)' : 'var(--line)'}" stroke-width="${on ? 2.5 : 1.2}" ${on ? '' : 'stroke-dasharray="3 4"'}/>`;
    });
    ids.forEach(id => {
      const [x, y] = pos[id]; const seen = SD.state.concept(id).seen; const m = SD.state.mastery(id).stage;
      s += `<circle cx="${x}" cy="${y}" r="${seen ? 6 + m * 1.5 : 4}" fill="${seen ? 'var(--blue)' : 'var(--line)'}" stroke="var(--ink)" stroke-width="1.5" opacity="${seen ? 0.5 + m * 0.12 : 0.7}"/>`;
      s += `<text x="${x}" y="${y + (y > cy ? 18 : -10)}" text-anchor="middle" font-size="9" font-weight="700" fill="${seen ? 'var(--ink)' : 'var(--muted)'}">${seen ? U.esc(SD.concepts[id].tag || SD.concepts[id].name.split(' ')[0]) : '?'}</text>`;
    });
    return s + '</svg></div>';
  };

  // Floating combat numbers
  // Hit sparks from Kenney's Particle Pack: a slash plus stars that fly out and fade.
  U.burst = function (el, big) {
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const parts = [['slash_02', 0]].concat(Array.from({ length: big ? 9 : 5 }, (_, i) => [i % 2 ? 'star_06' : 'spark_05', i]));
    parts.forEach(([img, i]) => {
      const p = document.createElement('img');
      p.src = U.sparkArt ? U.sparkArt(img) : 'assets/img/fx/' + img + '.webp'; p.alt = ''; p.className = 'spark' + (i === 0 && img === 'slash_02' ? ' slash' : '');
      const a = Math.random() * Math.PI * 2, d = (big ? 90 : 60) + Math.random() * 50;
      p.style.left = cx + 'px'; p.style.top = cy + 'px';
      p.style.setProperty('--dx', Math.cos(a) * d + 'px'); p.style.setProperty('--dy', Math.sin(a) * d + 'px');
      p.style.setProperty('--tint', ['#ffd23f', '#ffffff', '#ff6fa5', '#7fd1ff'][Math.floor(Math.random() * 4)]);
      document.body.appendChild(p); setTimeout(() => p.remove(), 750);
    });
  };
  U.float = function (el, text, cls) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    const f = document.createElement('div');
    f.className = 'floatnum ' + (cls || '');
    f.textContent = text;
    f.style.left = (r.left + r.width / 2 + (Math.random() * 30 - 15)) + 'px';
    f.style.top = (r.top + r.height / 3) + 'px';
    document.body.appendChild(f);
    setTimeout(() => f.remove(), 1100);
  };
  U.shake = function (sel) {
    const el = $(sel); if (!el) return;
    el.classList.remove('shake-x'); void el.offsetWidth; el.classList.add('shake-x');
  };
})();
