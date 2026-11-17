// The Rush: the template card. Contract: project files game-modes/lost-and-found-real/real-game/v3/claims/learn/contract.md.
// A paper sheet pinned in the room (a file name at the top, template.yaml and the like), and every piece the player
// places writes its real line(s) onto it, in real syntax, where they belong. The data is SD.rushLearn (js/rush-learn.js
// for claims 1 to 6, the end of js/rush-office.js, rush-audit.js and rush-yard.js for claims 7 to 9); this file only
// draws it and asks. Presentation only: it never calls a rule, never rolls a die, and never pauses or blocks a wave.
//
//   - Where it hangs: on a bare stretch of the painted wall (PIN, per backdrop, measured off the paintings), clear of
//     the props and labels. Rooms with no bare wall, and every phone, get a small paper tab instead; the tab opens the
//     card over the room only while building (before the lever), and it closes itself when the lever is pulled.
//   - The first time a piece with a `blank` is placed (ever: remembered for the run, and across runs where storage
//     works), its token on the sheet is a blank, and while building the player types it (desktop) or picks it from 3-4
//     choices (phone, or the desktop's "choices" button). A wrong answer shows the right one and moves on. A piece
//     placed while the night is running just writes its line. A room setting (claim 7's `setting: true` entries) asks
//     the first time it's changed while building, never when the claim opens (it's there before you've done anything).
//   - When a piece acts, the pop it makes gets the real term underneath (SD.rushLearn.pops, 'claim:event' first), and
//     the line it comes from lights up on the sheet (or the tab glows).
//
// Data extensions beyond the contract (all optional, so plain { at, lines } entries work as they are):
//   - lines (and the file's base) may be functions of the room's state; a block that returns [] is left out.
//   - blocks: [{ at | in, head, replace, lines }], or a function of the state returning them, for a piece that writes
//     in more than one place. in: a path of lines (each found inside the one before), the block goes at the end of the
//     last one's part; head: a key inside it the block goes under (written once, by whoever comes first). replace: the
//     `at` line (or that many lines from it) is replaced instead of followed.
//   - An `at` is looked up in the sheet as it stands (other pieces' lines too); not found, the block goes at the end.
//   - A pop may be { text, line }: line is a bit of the sheet to light up.
//   - usedOn: 'claim:event', for a piece that's never placed (claim 8's lens): its line goes on at that event.
// window.SD.rushSheet.attach() is called by js/rush.js with its hooks; tools/rush_check_sheet.js reads debug().
(function (root) {
  const SD = root.SD = root.SD || {};
  const LN = () => { const L = SD.rushLearn || {}; return { files: L.files || {}, tools: L.tools || {}, pops: L.pops || {} }; };
  const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
  const now = () => (root.performance ? root.performance.now() : Date.now());
  const ind = s => s.length - s.replace(/^ +/, '').length;
  let H = null;

  // ---- Seen: a term is typed once, in any mode. SD.typeOnce (js/type-once.js, the main game's helper, keyed by the
  // term lowercased) when it's on the page; rush.html has no game save, so otherwise a small stand-in with the same API
  // and keying, kept in localStorage 'sd.typed' (where storage works; else for this run only).
  const TYPED_KEY = 'sd.typed';
  const shim = (() => {
    let mem = {};
    try { const o = JSON.parse(root.localStorage.getItem(TYPED_KEY) || '{}'); if (o && typeof o === 'object') mem = o; } catch (e) { /* this run only */ }
    const k = term => String(term || '').trim().toLowerCase();
    const norm = s => String(s || '').trim().replace(/^['"`]+|['"`]+$/g, '').replace(/\s+/g, ' ').toLowerCase();
    return {
      learned: term => !!mem[k(term)], need: term => !mem[k(term)],
      mark(term) { mem[k(term)] = Date.now(); try { root.localStorage.setItem(TYPED_KEY, JSON.stringify(mem)); } catch (e) { /* this run only */ } },
      match: (typed, ans) => norm(typed) === norm(ans),
      forget() { mem = {}; try { root.localStorage.removeItem(TYPED_KEY); } catch (e) { /* fine */ } }
    };
  })();
  const TO = () => (SD.typeOnce && typeof SD.typeOnce.need === 'function' ? SD.typeOnce : shim);
  const termOf = t => { const d = LN().tools[t]; return d && d.blank; };
  // root.SD_SHEET_KNOWN = true plays as a returning player (every blank already typed): the older rush_check*.js
  // walkthroughs set it so they don't have to answer blanks they weren't written for.
  const known = t => root.SD_SHEET_KNOWN === true || !TO().need(termOf(t));
  function markSeen(t) { const term = termOf(t) || t; try { TO().mark(term); } catch (e) { shim.mark(term); } }
  const matches = (typed, ans) => { try { return TO().match(typed, ans); } catch (e) { return shim.match(typed, ans); } };

  // ---- Where the card hangs (stage pixels of each backdrop) ----
  // Pinned on the wall where the painting is bare: the cellar between its two lanterns, the dock's shutter, the vault's
  // riveted panels above the cabinets, the office's green wall right of the strongroom. The cellar as a review room
  // keeps its questions there, so its card is shorter. About 40 characters a row where the wall allows (the cellar's
  // card reaches just past the inner edges of its lanterns' frames); the office's is held by the strongroom's label.
  const PIN = {
    'room-wide': [588, 150, 282, 248], 'room-wide:review': [588, 150, 282, 150], 'dock-wide': [588, 148, 292, 248],
    'vault-wide': [640, 148, 300, 230], 'office-wide': [1126, 192, 214, 292]
  };
  // A tab where there's no bare wall: [x, y, w, h], and the card it opens. Phones: under the title row, right side.
  // The watch room's tab sits on the bare wall between the clock and the trace board, above the gauge row (klaxons and
  // tallies add gauges along it).
  const TAB = { 'watch-wide': [330, 196, 220, 40], 'watch-tall': [500, 210, 200, 80], 'yard-wide': [1120, 150, 200, 40] };
  function key(L) { return (L.bg || '') + (L.asks && !L.office ? ':review' : ''); }
  function beltTop(L) { try { return H.beltRect()[1]; } catch (e) { return L.H - 120; } }
  function geom() {
    const L = H.L, k = key(L), tall = L.W < L.H;
    if (!tall && PIN[k]) return { mode: 'pin', rect: PIN[k] };
    const tab = TAB[k] || (tall ? [L.W - 262, 144, 250, 48] : [L.W - 240, 150, 220, 40]);
    let x0 = 16;
    if (tall && L.lever && L.lever.x < L.W / 2) x0 = Math.min(L.W * .42, L.lever.x + L.lever.r + 4);
    const y0 = tall ? 340 : tab[1] + tab[3] + 8, y1 = beltTop(L) - 14;
    const open = tall ? [x0, y0, L.W - 12 - x0, y1 - y0] : [Math.min(tab[0], L.W - 460), y0, Math.max(tab[2], 440), Math.min(420, y1 - y0)];
    return { mode: 'tab', tab, open };
  }

  // ---- Per room: what's on its sheet, in the order it went on ----
  const rooms = new WeakMap();
  function rs(S) {
    let r = rooms.get(S);
    if (!r) { r = { n: 0, init: false, order: [], used: new Set(), sig: {}, born: {}, terms: [], cool: {}, lit: null, scroll: null, open: false, openBy: '', openAt: 0 }; rooms.set(S, r); }
    return r;
  }
  function fileOf(S) { const f = LN().files; return f[S.claim] || (/^review/.test(S.claim) ? f.review : null); }
  function applies(t, d, S) { return d.claims ? d.claims.includes(S.claim) : (S.belt || []).includes(t) || S[t] === true; }
  const building = () => !!(H && H.M && !H.M.started && !H.M.over);
  // New pieces since last look: S.placed grows with every place() in every engine. Settings: their lines changed.
  function sync(S) {
    const r = rs(S), T = LN().tools;
    if (!r.init) {
      r.init = true;
      for (const t of Object.keys(T)) { const d = T[t]; if (applies(t, d, S) && (d.setting || (S[t] === true && !(S.placed || []).includes(t)))) r.order.push(t); }
    }
    const P = S.placed || [];
    while (r.n < P.length) added(S, P[r.n++]);
    const res = resolve(S);
    for (const t of r.order) {
      const d = T[t]; if (!d || !d.setting) continue;
      const sig = res.per[t] || '';
      if (r.sig[t] != null && r.sig[t] !== sig) { r.born[t] = now(); if (building() && d.blank && !known(t)) ask(S, t); }
      r.sig[t] = sig;
    }
    return res;
  }
  function added(S, t) {
    const r = rs(S), d = LN().tools[t];
    if (!d || !applies(t, d, S)) return;
    if (!r.order.includes(t)) r.order.push(t);
    r.born[t] = now();
    if (building()) {
      if (d.blank && !known(t)) ask(S, t);
      if (geom().mode === 'tab' && !r.open) { r.open = true; r.openBy = 'auto'; }
      r.openAt = now();
    }
  }
  // A piece that's used rather than placed (claim 8's lens).
  function use(t, S) {
    S = S || (H && H.M); if (!S) return;
    const r = rs(S); sync(S);
    if (r.used.has(t)) return;
    r.used.add(t); if (!r.order.includes(t)) added(S, t);
  }

  // ---- The sheet's lines: the base, then each piece's blocks, where they go ----
  function present(t, d, S, r) { return !!d.setting || r.used.has(t) || (S.placed || []).includes(t) || S[t] === true; }
  function find(lines, text, lo, hi) {
    if (text == null) return -1;
    for (let k = lo; k <= hi && k < lines.length; k++) if (lines[k].t === text) return k;
    const tt = String(text).trim();
    for (let k = lo; k <= hi && k < lines.length; k++) if (lines[k].t.trim() === tt) return k;
    return -1;
  }
  // The last line of line i's part: deeper lines, and "- " items at its own depth under a key.
  function end(lines, i) {
    const n = ind(lines[i].t), key = /:\s*$/.test(lines[i].t) && !lines[i].t.trim().startsWith('#');
    let j = i;
    while (j + 1 < lines.length) {
      const s = lines[j + 1].t, d = ind(s);
      if (s.trim() === '' || d > n || (key && d === n && s.trimStart().startsWith('- '))) j++; else break;
    }
    return j;
  }
  function blocksOf(d, S) {
    if (d.blocks) return val(d.blocks, S) || [];
    return [{ at: d.at, lines: d.lines }];
  }
  function resolve(S) {
    const f = fileOf(S), r = rs(S), T = LN().tools;
    if (!f) return { lines: [], per: {}, name: '' };
    let base = [];
    try { base = val(f.base, S) || []; } catch (e) { base = []; }
    const lines = base.map(t => ({ t: String(t), tool: null }));
    const per = {};
    for (const t of r.order) {
      const d = T[t]; if (!d || !present(t, d, S, r)) continue;
      let bl = [];
      try { bl = blocksOf(d, S); } catch (e) { bl = []; }
      const mine = [];
      for (const b of bl) {
        let ls = [];
        try { ls = val(b.lines, S) || []; } catch (e) { ls = []; }
        if (!ls.length) continue;
        const add = ls.map(x => ({ t: String(x), tool: t }));
        mine.push(...ls);
        let at = lines.length;
        if (b.in) {
          let i = -1, ok = true;
          for (const p of [].concat(b.in)) { const k = find(lines, p, i + 1, i < 0 ? lines.length - 1 : end(lines, i)); if (k < 0) { ok = false; break; } i = k; }
          if (ok) {
            if (b.head) {
              const h = find(lines, b.head, i + 1, end(lines, i));
              if (h >= 0) at = end(lines, h) + 1; else { at = end(lines, i) + 1; add.unshift({ t: b.head, tool: t, head: true }); }
            } else at = end(lines, i) + 1;
          }
        } else if (b.at != null && b.at !== 'end') {
          const i = find(lines, b.at, 0, lines.length - 1);
          if (i >= 0) {
            if (b.replace) { lines.splice(i, b.replace === true ? 1 : +b.replace, ...add); continue; }
            let j = end(lines, i);
            while (j + 1 < lines.length && lines[j + 1].g === b.at) j = end(lines, j + 1);
            at = j + 1; add.forEach(x => { x.g = b.at; });
          }
        }
        // A resource at the end goes above the notes (# lines at the margin) that close the sheet.
        if (at === lines.length && !add[0].t.startsWith('#')) while (at > 0 && /^#/.test(lines[at - 1].t) && lines[at - 1].tool) at--;
        lines.splice(at, 0, ...add);
      }
      per[t] = mine.join('\n');
    }
    return { lines, per, name: f.name || 'template.yaml' };
  }

  // ---- The blank ----
  const queue = [];
  let cur = null; // { S, t, d, typed, state: 'ask' | 'right' | 'wrong', until, choices }
  function ask(S, t) { if (!queue.some(q => q.S === S && q.t === t) && !(cur && cur.S === S && cur.t === t)) queue.push({ S, t }); }
  function next() {
    cur = null;
    while (queue.length) {
      const q = queue.shift(), d = LN().tools[q.t];
      if (!d || !d.blank || known(q.t)) continue;
      const res = resolve(q.S);
      if (!res.lines.some(l => l.tool === q.t && l.t.includes(d.blank))) continue; // its token isn't on the sheet: skip
      const ch = (d.choices && d.choices.length ? d.choices.slice(0, 4) : [d.blank]);
      if (!ch.includes(d.blank)) ch[ch.length - 1] = d.blank;
      for (let i = ch.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ch[i], ch[j]] = [ch[j], ch[i]]; } // presentation only
      cur = { S: q.S, t: q.t, d, typed: '', state: 'ask', until: 0, choices: ch, mode: '' };
      const r = rs(q.S); if (geom().mode === 'tab') { r.open = true; r.openBy = r.openBy || 'auto'; }
      return;
    }
  }
  function answer(text, how) {
    if (!cur || cur.state !== 'ask') return;
    const ok = matches(text, cur.d.blank);
    // Typed: a miss gets another go; after two, the answer shows faintly (type-once's rule); a third moves on.
    if (!ok && how === 'typed' && (cur.miss || 0) < 2) { cur.miss = (cur.miss || 0) + 1; cur.faint = cur.miss >= 2; cur.typed = ''; ui.dirty = true; return; }
    cur.typed = String(text); cur.state = ok ? 'right' : 'wrong'; cur.how = how; cur.until = now() + (ok ? 900 : 1800);
    markSeen(cur.t);
    const r = rs(cur.S); r.born[cur.t] = now(); r.openAt = now();
    ui.dirty = true;
  }
  // The lever: an open blank just fills in (asked again next time it's placed while building).
  function drop() { queue.length = 0; cur = null; ui.dirty = true; }

  // ---- Drawing ----
  const MONO = 'ui-monospace, Menlo, Consolas, "DejaVu Sans Mono", "Liberation Mono", monospace';
  let lastM = null, last = { mode: '', card: null, tab: null, rows: [], first: 0, total: 0, font: 0 };
  function fontPx(L, scale) { return Math.max(11, 11 / Math.max(scale, .05)); }
  // Soft wrap: a line too long for the card carries on underneath, indented, never cut. The blank stays whole.
  function wrapRows(lines, maxCh, blank) {
    const rows = [];
    lines.forEach((l, li) => {
      let s = l.t, off = 0;
      const bt = blank && blank.li === li ? [blank.a, blank.a + blank.len] : null;
      const pad = Math.min(ind(l.t) + 2, Math.floor(maxCh / 3));
      // The key and its colon stay together on the first row ("ReservedConcurrentExecutions: 4" never puts ": 4"
      // alone underneath); a wrap breaks inside the value, at a space where there is one.
      const km = l.t.trimStart().startsWith('#') ? null : l.t.match(/^(\s*(?:- )?[^:#'"{}[\]\s][^:#'"{}[\]]*?:)(?=\s|$)/);
      const keyEnd = km ? km[1].length : 0;
      let first = true;
      while (s.length > maxCh) {
        const lo = first ? Math.max(ind(s) + 1, keyEnd) : pad + 1;
        let cut = s.lastIndexOf(' ', maxCh);
        if (cut <= lo) cut = first && keyEnd > maxCh ? keyEnd : maxCh;
        if (first && keyEnd && cut < keyEnd) cut = keyEnd;
        if (cut >= s.length) break;
        if (bt) { const a = bt[0] - off + (first ? 0 : pad), b = bt[1] - off + (first ? 0 : pad); if (cut > a && cut < b && a > (first ? ind(s) : pad) + 1) cut = a; }
        rows.push({ t: s.slice(0, cut), li, off, cont: !first, pad: first ? 0 : pad });
        const rest = s.slice(cut).replace(/^ /, ''), used = cut + (s[cut] === ' ' ? 1 : 0);
        off += used - (first ? 0 : pad);
        s = ' '.repeat(pad) + rest; first = false;
      }
      rows.push({ t: s, li, off, cont: !first, pad: first ? 0 : pad });
    });
    return rows;
  }
  function rr(cx, x, y, w, h, r) { cx.beginPath(); if (cx.roundRect) cx.roundRect(x, y, w, h, r); else cx.rect(x, y, w, h); }
  function paper(cx, x, y, w, h) {
    cx.save();
    cx.shadowColor = 'rgba(0,0,0,.45)'; cx.shadowBlur = 14; cx.shadowOffsetY = 5;
    const g = cx.createLinearGradient(x, y, x + w * .4, y + h);
    g.addColorStop(0, '#fbf2db'); g.addColorStop(.7, '#efdfb6'); g.addColorStop(1, '#e3cd98');
    rr(cx, x, y, w, h, 5); cx.fillStyle = g; cx.fill();
    cx.shadowColor = 'transparent'; cx.lineWidth = 2; cx.strokeStyle = '#6b4e24'; cx.stroke();
    cx.restore();
  }
  function pin(cx, x, y, s) {
    cx.save(); cx.beginPath(); cx.arc(x, y, 6 * s, 0, Math.PI * 2);
    const g = cx.createRadialGradient(x - 2 * s, y - 2 * s, 1, x, y, 6 * s); g.addColorStop(0, '#e8705f'); g.addColorStop(1, '#8e2a1f');
    cx.fillStyle = g; cx.fill(); cx.lineWidth = 1.2; cx.strokeStyle = '#3a0c08'; cx.stroke(); cx.restore();
  }
  const COL = { key: '#7a2e12', val: '#1d3f73', com: '#5d6b4a', plain: '#2a1d10' };
  function drawRow(cx, row, x, y, fp, cw, hl) {
    let s = row.t;
    const parts = [];
    const tr = s.trimStart();
    if (row.cont) parts.push([s, tr.startsWith('#') ? COL.com : COL.val]);
    else if (tr.startsWith('#')) parts.push([s, COL.com]);
    else {
      const m = s.match(/^(\s*(?:- )?)([^:#'"{}[\]\s][^:#'"{}[\]]*?:)(?=\s|$)(.*)$/);
      if (m) parts.push([m[1], COL.plain], [m[2], COL.key], [m[3], COL.val]); else parts.push([s, COL.val]);
    }
    let cx0 = x;
    for (const [t, c] of parts) { cx.fillStyle = c; cx.fillText(t, cx0, y); cx0 += t.length * cw; }
    if (hl) { // the blank, on this row: a box over its characters
      const [a, b, state, shown] = hl;
      const bx = x + a * cw - 2, bw = (b - a) * cw + 4, by = y - fp * .62, bh = fp * 1.24;
      cx.save(); rr(cx, bx, by, bw, bh, 3);
      cx.fillStyle = state === 'right' ? '#bfe8c4' : state === 'wrong' ? '#f6c9c0' : '#ffe08a'; cx.fill();
      cx.lineWidth = 1.5; cx.strokeStyle = state === 'right' ? '#1f8a55' : state === 'wrong' ? '#b23a2f' : '#8a5f1c'; cx.stroke();
      cx.fillStyle = '#2a1d10'; if (state === 'faint') cx.globalAlpha = .35; cx.fillText(shown, x + a * cw, y); cx.restore();
    }
  }
  function draw() {
    if (!H || !H.M) return;
    const cx = H.cx, L = H.L, S = H.S, xf = H.xf();
    if (H.M !== lastM) { lastM = H.M; drop(); }
    if (!S || !fileOf(S)) { last = { mode: '', card: null, tab: null, rows: [], first: 0, total: 0, font: 0 }; place(null); return; }
    const res = sync(S), r = rs(S), g = geom(), t = now();
    // The blank: next in line, then its result stays a moment.
    if (!building() && (cur || queue.length)) drop();
    if (cur && cur.state !== 'ask' && t > cur.until) { next(); ui.dirty = true; }
    if (!cur && queue.length && building()) { next(); ui.dirty = true; }
    if (g.mode === 'tab') {
      if (!building()) r.open = false;
      else if (r.open && r.openBy === 'auto' && !cur && t - r.openAt > 2600) r.open = false;
    }
    cx.save(); cx.setTransform(xf.scale * xf.dpr, 0, 0, xf.scale * xf.dpr, xf.ox * xf.dpr, xf.oy * xf.dpr);
    const fp = fontPx(L, xf.scale);
    cx.font = `600 ${fp}px ${MONO}`; const cw = cx.measureText('M').width;
    let card = null;
    if (g.mode === 'pin') card = g.rect; else if (r.open) card = g.open;
    last = { mode: g.mode, card, tab: g.mode === 'tab' ? g.tab : null, open: !!(g.mode === 'tab' && r.open), rows: [], first: 0, total: 0, font: fp * xf.scale, key: key(L), name: res.name, lines: res.lines.map(l => l.t) };
    if (g.mode === 'tab') drawTab(cx, g.tab, res, r, L, fp, t);
    if (card) drawCard(cx, card, res, r, S, fp, cw, t, g.mode === 'tab');
    drawTerms(cx, r, L, g, xf, t);
    cx.restore();
    frame.length = 0; // what the room drew; refilled by rec() until the next draw
    place(g);
  }
  function drawTab(cx, tb, res, r, L, fp, t) {
    const [x, y, w, h] = tb, glow = r.lit && t - r.lit.t0 < 1600 ? 1 - (t - r.lit.t0) / 1600 : 0;
    cx.save(); cx.translate(x + w / 2, y + h / 2); cx.rotate(-.025); cx.translate(-(x + w / 2), -(y + h / 2));
    if (glow) { cx.shadowColor = `rgba(255,214,102,${glow})`; cx.shadowBlur = 26; }
    paper(cx, x, y, w, h);
    cx.restore();
    pin(cx, x + 14, y + h / 2, Math.max(1, h / 40));
    cx.save(); cx.font = `700 ${fp}px ${MONO}`; cx.fillStyle = '#2a1d10'; cx.textBaseline = 'middle';
    let label = res.name; const room = w - 34 - fp;
    while (label.length > 4 && cx.measureText(label).width > room) label = label.slice(0, -1);
    cx.fillText(label, x + 28, y + h / 2 + 1);
    cx.fillStyle = '#8a5f1c'; cx.textAlign = 'right'; cx.fillText(r.open ? '▴' : '▾', x + w - 8, y + h / 2 + 1);
    cx.restore();
    if (api.spy) api.spy('sheet-tab', res.name, tb);
  }
  function drawCard(cx, card, res, r, S, fp, cw, t, over) {
    const [x, y, w, h] = card, lh = fp * 1.32, head = fp * 2.1, padX = Math.max(6, fp * .55);
    // An open card (phone) leaves room at the bottom for the blank's buttons.
    const panelH = over && cur && cur.S === S ? ui.panelH / H.xf().scale : 0;
    cx.save(); cx.translate(x + w / 2, y + h / 2); if (!over) cx.rotate(-.008); cx.translate(-(x + w / 2), -(y + h / 2));
    paper(cx, x, y, w, h);
    // Faint ruled lines, like Dutch's letters.
    cx.strokeStyle = 'rgba(107,78,36,.12)'; cx.lineWidth = 1;
    for (let yy = y + head + lh; yy < y + h - 6 - panelH; yy += lh) { cx.beginPath(); cx.moveTo(x + 6, yy + 2); cx.lineTo(x + w - 6, yy + 2); cx.stroke(); }
    cx.restore();
    cx.save(); cx.textBaseline = 'middle';
    cx.font = `700 ${fp * 1.08}px ${MONO}`; cx.fillStyle = '#8a5f1c'; cx.fillText(res.name, x + padX, y + head * .62);
    cx.strokeStyle = 'rgba(138,95,28,.5)'; cx.beginPath(); cx.moveTo(x + padX, y + head - 3); cx.lineTo(x + w - padX, y + head - 3); cx.stroke();
    cx.font = `600 ${fp}px ${MONO}`;
    const maxCh = Math.max(12, Math.floor((w - padX * 2 - cw * .4) / cw));
    // The blank's place on the sheet: the first of its piece's lines with the token.
    let blank = null;
    if (cur && cur.S === S) {
      const li = res.lines.findIndex(l => l.tool === cur.t && l.t.includes(cur.d.blank));
      if (li >= 0) {
        const lt = res.lines[li].t, a = lt.indexOf(cur.d.blank), len = cur.d.blank.length;
        const faint = cur.state === 'ask' && cur.faint && !cur.typed;
        // While it's asked, a blank on a line too long for the card is drawn shorter, so the rest of its line (": 4")
        // stays on its row; the answer then shows in full.
        const dl = cur.state === 'ask' && !faint && lt.length > maxCh ? Math.max(6, len - (lt.length - maxCh)) : len;
        const shown = cur.state === 'ask' && !faint ? (cur.typed ? cur.typed.slice(-dl).padEnd(dl, '_') : '_'.repeat(dl)) : cur.d.blank;
        res.lines[li] = Object.assign({}, res.lines[li], { t: lt.slice(0, a) + '_'.repeat(dl) + lt.slice(a + len) });
        blank = { li, a, len: dl, shown, state: faint ? 'faint' : cur.state };
      }
    }
    const rows = wrapRows(res.lines, maxCh, blank);
    const fit = Math.max(1, Math.floor((h - head - 8 - panelH) / lh));
    // Which rows show: the blank's, else what lit up last, else the newest piece's, else the top.
    let focus = -1;
    if (blank) focus = rows.findIndex(rw => rw.li === blank.li);
    if (focus < 0 && r.lit && t - r.lit.t0 < 2500) { const li = res.lines.findIndex(l => l.t.includes(r.lit.s)); if (li >= 0) focus = rows.findIndex(rw => rw.li === li); }
    if (focus < 0) { let bt = -1, bk = null; for (const k of Object.keys(r.born)) if (r.born[k] > bt && res.lines.some(l => l.tool === k)) { bt = r.born[k]; bk = k; } if (bk && t - bt < 4000) { const li = res.lines.findIndex(l => l.tool === bk); focus = rows.findIndex(rw => rw.li === li); } }
    let first = 0;
    if (rows.length > fit) {
      if (r.scroll != null && t - (r.scrollAt || 0) < 6000) first = r.scroll;
      else if (focus >= 0) first = focus - Math.floor(fit / 3);
      else first = r.keep || 0;
      first = Math.max(0, Math.min(rows.length - fit, first));
      r.keep = first;
    }
    const shownRows = rows.slice(first, first + fit);
    let blankAt = null;
    shownRows.forEach((rw, i) => {
      const yy = y + head + lh * (i + .55), l = res.lines[rw.li], age = l.tool && r.born[l.tool] ? t - r.born[l.tool] : 1e9;
      const lit = r.lit && t - r.lit.t0 < 1800 && l.t.includes(r.lit.s);
      // New lines glow for a moment; the lit one (a pop's) too.
      if (age < 2600 || lit) { cx.save(); cx.fillStyle = lit ? `rgba(255,190,70,${.55 * (1 - (t - r.lit.t0) / 1800)})` : `rgba(255,214,102,${.5 * (1 - age / 2600)})`; cx.fillRect(x + 4, yy - lh / 2, w - 8, lh); cx.restore(); }
      if (l.tool) { cx.save(); cx.fillStyle = age < 2600 ? '#c8902a' : 'rgba(138,95,28,.35)'; cx.fillRect(x + 4, yy - lh / 2 + 1, 3, lh - 2); cx.restore(); }
      if (rw.cont) { cx.save(); cx.fillStyle = 'rgba(138,95,28,.6)'; cx.fillText('↳', x + padX + (rw.pad - 2) * cw, yy); cx.restore(); }
      let hl = null;
      if (blank && rw.li === blank.li) {
        const a = blank.a - rw.off + rw.pad, b = a + blank.len, A = Math.max(a, rw.pad), B = Math.min(b, rw.t.length);
        if (B > A) hl = [A, B, blank.state, blank.shown.slice(A - a, B - a)];
      }
      drawRow(cx, rw, x + padX + cw * .4, yy, fp, cw, hl);
      if (hl && !blankAt) blankAt = [x + padX + cw * .4 + hl[0] * cw - 2, yy, (hl[1] - hl[0]) * cw + 4];
    });
    // Beside a pinned card, the blank's box gets a leader from the card's edge on the panel's side, so the eye goes from
    // the panel's arrow to where the word belongs.
    if (blankAt && !over && cur && cur.state === 'ask' && ui.side) {
      const edge = ui.side === 'left' ? x : x + w, to = ui.side === 'left' ? blankAt[0] - 2 : blankAt[0] + blankAt[2] + 2;
      cx.save(); cx.strokeStyle = '#b07a22'; cx.lineWidth = 2; cx.setLineDash([4, 3]);
      cx.beginPath(); cx.moveTo(edge, blankAt[1]); cx.lineTo(to, blankAt[1]); cx.stroke(); cx.restore();
    }
    // More above or below: a fold mark.
    const nLines = n => n + (n === 1 ? ' line ' : ' lines ');
    cx.fillStyle = 'rgba(107,78,36,.8)'; cx.font = `700 ${fp}px ${MONO}`; cx.textAlign = 'right';
    const up = first > 0 ? nLines(first) + '▲' : '', down = first + fit < rows.length ? nLines(rows.length - first - fit) + '▼' : '';
    // Over the room (phone), the close button sits at the header's right: the fold mark goes left of it.
    const rx = x + w - padX - (over ? 54 / H.xf().scale : 0);
    if (up) cx.fillText(up, rx, y + head * .62);
    if (down) { const dw = cx.measureText(down).width + 8, yy = y + head + lh * (fit - .5); cx.save(); cx.fillStyle = 'rgba(251,242,219,.92)'; cx.fillRect(x + w - padX - dw, yy - lh / 2, dw + 2, lh); cx.restore(); cx.fillText(down, x + w - padX, yy + 1); }
    cx.restore();
    // The pin: in the header's gap between the file name and the fold mark, else on the top edge.
    cx.save(); cx.font = `700 ${fp * 1.08}px ${MONO}`; const nameEnd = padX + cx.measureText(res.name).width; cx.font = `700 ${fp}px ${MONO}`;
    const foldAt = rx - x - (up ? cx.measureText(up).width : 0); cx.restore();
    const gapOk = foldAt - nameEnd > 18;
    pin(cx, x + (gapOk ? (nameEnd + foldAt) / 2 : w * .5), gapOk ? y + head * .55 : y + 2, Math.max(1, fp / 13));
    last.rows = shownRows.map(rw => rw.t); last.first = first; last.total = rows.length; last.fit = fit; last.maxCh = maxCh;
    last.blankRow = blank ? shownRows.findIndex(rw => rw.li === blank.li) : -1;
    last.blankShown = blank ? blank.shown : '';
    last.blankAt = blankAt;
    if (api.spy) api.spy(over ? 'sheet-open' : 'sheet', res.name, card);
  }
  // The real term beside the pop: a dark plaque in the sheet's own type. It goes in free space, as near its pop as it
  // can: clear of the room's plaques, the belt, the card, Dutch's bubble, the lever and the other terms (and of the
  // room's words where it can be), and on screen. Its place is chosen once, when it first shows, and kept.
  function obstacles(L, g) {
    const hard = [], soft = [];
    for (const o of frame) (o.kind === 'label' ? hard : soft).push(o.r);
    try { hard.push(H.beltRect()); } catch (e) { /* no belt */ }
    if (g.mode === 'pin') hard.push(g.rect); else { hard.push(g.tab); if (last.open && last.card) hard.push(last.card); }
    if (H.say) hard.push(H.say);
    if (L.inset && L.inset.r) hard.push(L.inset.r);
    if (L.lever) hard.push([L.lever.x - L.lever.r * .6, L.lever.y - L.lever.r * .8, L.lever.r * 1.2, L.lever.r * 1.6]);
    if (L.tank) hard.push([L.tank.x - 60, L.tank.y - L.tank.h, 120, L.tank.h + 40]); // and its foot
    if (L.desk && L.desk.h) hard.push([L.desk.x - L.desk.h * .7, L.desk.y - L.desk.h, L.desk.h * 1.4, L.desk.h]);
    for (const t of (H.S && H.S.belt) || []) { try { const r = H.spot(t); if (r) soft.push(r); } catch (e) { /* not drawn */ } }
    return { hard, soft };
  }
  function spotFor(p, w, h, L, g, taken) {
    const top = 64, bot = beltTop(L) - 8, pad = 6;
    const ok = (b, list) => b[0] >= pad && b[0] + b[2] <= L.W - pad && b[1] >= top && b[1] + b[3] <= bot && !list.some(o => hit(b, o));
    const { hard, soft } = obstacles(L, g); hard.push(...taken);
    const anchor = p.at ? [p.at[0], p.at[1]] : (g.mode === 'pin' ? [g.rect[0] + g.rect[2] / 2, g.rect[1] + g.rect[3]] : [g.tab[0] + g.tab[2] / 2, g.tab[1] + g.tab[3]]);
    const cands = [];
    const add = (cx0, cy0) => cands.push([Math.max(w / 2 + pad, Math.min(L.W - w / 2 - pad, cx0)) - w / 2, cy0 - h / 2, w, h]);
    if (p.at) { add(p.at[0], p.at[1] + p.at[2] * (L.fs || 1) * .55 + h / 2 + 6); add(p.at[0], p.at[1] - p.at[2] * (L.fs || 1) * .6 - 60 - h / 2); }
    if (g.mode === 'pin') add(g.rect[0] + g.rect[2] / 2, g.rect[1] + g.rect[3] + h / 2 + 8);
    for (let y = bot - h / 2 - 4; y - h / 2 >= top; y -= h / 2 + 4) for (let x = w / 2 + pad; x <= L.W - w / 2 - pad + 1; x += 40) add(x, y);
    const dist = b => Math.hypot(b[0] + b[2] / 2 - anchor[0], b[1] + b[3] / 2 - anchor[1]);
    const pick = list => { let best = null, bd = 1e9; cands.forEach((b, i) => { if (!ok(b, list)) return; const d = dist(b) + (i < 3 ? -200 : 0); if (d < bd) { bd = d; best = b; } }); return best; };
    return pick(hard.concat(soft)) || pick(hard) || cands[0];
  }
  function drawTerms(cx, r, L, g, xf, t) {
    r.terms = r.terms.filter(p => t - p.t0 < 3200);
    const fp = Math.max(14 * Math.min(L.fs || 1, 1.2), 12 / Math.max(xf.scale, .05));
    cx.save(); cx.font = `700 ${fp}px ${MONO}`; cx.textBaseline = 'middle'; cx.textAlign = 'center';
    const maxW = Math.min(L.W - 40, 480), taken = [];
    last.terms = [];
    for (const p of r.terms) {
      if (!p.lines) {
        const words = p.text.split(' '), lines = []; let cur2 = '';
        for (const wd of words) { const n = cur2 ? cur2 + ' ' + wd : wd; if (cx.measureText(n).width > maxW - 20 && cur2) { lines.push(cur2); cur2 = wd; } else cur2 = n; }
        if (cur2) lines.push(cur2);
        p.lines = lines;
      }
      const w = Math.max(...p.lines.map(l => cx.measureText(l).width)) + 20, h = p.lines.length * fp * 1.3 + 10;
      if (!p.box || p.box[2] !== w) p.box = spotFor(p, w, h, L, g, r.terms.filter(q => q !== p && q.box).map(q => q.box));
      const [bx, by] = p.box, u = (t - p.t0) / 1000, a = Math.min(1, u * 6, (3.2 - u) * 2.5);
      taken.push(p.box);
      cx.save(); cx.globalAlpha = Math.max(0, a);
      rr(cx, bx, by, w, h, 7); cx.fillStyle = 'rgba(24,18,12,.9)'; cx.fill(); cx.lineWidth = 1.5; cx.strokeStyle = 'rgba(214,178,84,.95)'; cx.stroke();
      cx.fillStyle = '#ffe6a8'; p.lines.forEach((l, i) => cx.fillText(l, bx + w / 2, by + 5 + fp * 1.3 * (i + .5)));
      cx.restore();
      last.terms.push({ text: p.text, r: p.box.slice() });
      if (api.spy) api.spy('term', p.text, p.box);
    }
    cx.restore();
  }
  const hit = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3];

  // ---- Events: the real term on the pop ----
  const USED_ON = { lens: 'audit:query' };
  function event(e, where, pops, n0) {
    if (!H || !e) return;
    const S = H.room(where); if (!S) return;
    const P = LN().pops, T = LN().tools, k1 = S.claim + ':' + e.type;
    for (const t of Object.keys(T)) { const on = T[t].usedOn || USED_ON[t]; if (on && (on === k1 || on === e.type) && applies(t, T[t], S)) use(t, S); }
    let p = P[k1] !== undefined ? P[k1] : P[e.type];
    if (p == null) return;
    try { p = val(p, e, S); } catch (err) { p = null; }
    if (!p) return;
    if (typeof p === 'string') p = { text: p };
    if (!p.text) return;
    const r = rs(S), t = now();
    if (r.cool[p.text] > t) return;
    r.cool[p.text] = t + 4000;
    const np = pops && pops.length > n0 ? pops[pops.length - 1] : null;
    r.terms.push({ text: p.text, at: np ? [np.x, np.y, np.size || 30] : null, t0: t });
    if (r.terms.length > 2) r.terms.shift();
    if (p.line) r.lit = { s: p.line, t0: t };
  }

  // ---- The DOM bits: the tab's button, the card's close, the blank's panel ----
  const ui = { el: null, tab: null, close: null, panel: null, panelH: 0, dirty: true, shownFor: null };
  const coarse = () => { try { return root.matchMedia && root.matchMedia('(pointer: coarse)').matches; } catch (e) { return false; } };
  function build() {
    if (ui.el || typeof document === 'undefined') return;
    const st = document.createElement('style');
    st.textContent = `#sheet-ui{position:fixed;inset:0;pointer-events:none;z-index:4}
#sheet-ui button,.bp-ask button{font:700 13px var(--f-body,system-ui,sans-serif);color:#2a1d10;cursor:pointer}
#sheet-ui .sh-hit{position:absolute;pointer-events:auto;background:transparent;border:0;padding:0;min-width:44px;min-height:44px}
#sheet-ui .sh-hit:focus-visible{outline:3px solid #f5c45a;border-radius:6px}
#sheet-ui .sh-close{position:absolute;pointer-events:auto;width:44px;height:44px;border-radius:50%;border:2px solid #6b4e24;background:#f3e3b8;font-size:20px;line-height:1}
:is(#sheet-ui,.bp-ask) .sh-panel{position:absolute;pointer-events:auto;box-sizing:border-box;padding:8px 10px;border-radius:8px;background:#fbf3e2;color:#2a1d10;border:2px solid #6b4e24;box-shadow:0 8px 20px rgba(0,0,0,.45);font:700 13px var(--f-body,system-ui,sans-serif)}
:is(#sheet-ui,.bp-ask) .sh-panel p{margin:0 0 6px;font-size:13px}
:is(#sheet-ui,.bp-ask) .sh-panel code{font:700 12px ${MONO};background:#efdfb6;padding:0 3px;border-radius:3px;word-break:break-all}
:is(#sheet-ui,.bp-ask) .sh-row{display:flex;gap:6px}
:is(#sheet-ui,.bp-ask) .sh-panel input{flex:1;min-width:0;min-height:36px;box-sizing:border-box;font:600 14px ${MONO};padding:4px 8px;border:2px solid #8a5f1c;border-radius:6px;background:#fff;color:#2a1d10}
:is(#sheet-ui,.bp-ask) .sh-panel .sh-more{min-height:36px;padding:0 10px;border:2px solid #6b4e24;border-radius:6px;background:#f3e3b8}
:is(#sheet-ui,.bp-ask) .sh-ch{display:grid;gap:6px}
:is(#sheet-ui,.bp-ask) .sh-ch button{min-height:44px;padding:4px 8px;text-align:left;font:700 11px ${MONO};border:2px solid #6b4e24;border-radius:8px;background:rgba(255,255,255,.7);overflow-wrap:anywhere}
:is(#sheet-ui,.bp-ask) .sh-ch button.right{background:#d9f5e4;border-color:#1f8a55}:is(#sheet-ui,.bp-ask) .sh-ch button.wrong{background:#fde0dc;border-color:#b23a2f}
:is(#sheet-ui,.bp-ask) .sh-ok{color:#1f7a4a}:is(#sheet-ui,.bp-ask) .sh-no{color:#9a2a20}:is(#sheet-ui,.bp-ask) .sh-panel a{color:#7a4a10;font-size:12px}
#sheet-ui .sh-panel.sh-to-r::after,#sheet-ui .sh-panel.sh-to-l::after{content:'';position:absolute;top:var(--ay,20px);transform:translateY(-50%);border:10px solid transparent}
#sheet-ui .sh-panel.sh-to-r::after{right:-17px;border-left:15px solid #6b4e24;border-right:0}
#sheet-ui .sh-panel.sh-to-l::after{left:-17px;border-right:15px solid #6b4e24;border-left:0}
.bp-ask{grid-column:1/-1}.bp-ask .sh-panel{position:static!important;box-shadow:none!important}`;
    document.head.appendChild(st);
    ui.el = document.createElement('div'); ui.el.id = 'sheet-ui';
    ui.tab = document.createElement('button'); ui.tab.type = 'button'; ui.tab.className = 'sh-hit'; ui.tab.setAttribute('aria-label', 'Open the template card');
    ui.tab.addEventListener('click', () => { const S = H && H.S; if (!S || !building()) return; const r = rs(S); r.open = !r.open; r.openBy = r.open ? 'hand' : ''; ui.dirty = true; });
    ui.close = document.createElement('button'); ui.close.type = 'button'; ui.close.className = 'sh-close'; ui.close.textContent = '×'; ui.close.setAttribute('aria-label', 'Close the template card');
    ui.close.addEventListener('click', () => { const S = H && H.S; if (S) { rs(S).open = false; rs(S).openBy = ''; } ui.dirty = true; });
    ui.panel = document.createElement('div'); ui.panel.className = 'sh-panel'; ui.panel.setAttribute('role', 'group'); ui.panel.setAttribute('aria-label', 'Fill in the blank');
    ui.el.append(ui.tab, ui.close, ui.panel); document.body.appendChild(ui.el);
    // Typing goes to the blank, not the room's keys (numbers place pieces, space pulls the lever).
    ui.panel.addEventListener('keydown', e => e.stopPropagation());
    if (H && H.cv) H.cv.addEventListener('wheel', e => {
      if (!last.card) return;
      const r0 = H.cv.getBoundingClientRect(), xf = H.xf(), p = [(e.clientX - r0.left - xf.ox) / xf.scale, (e.clientY - r0.top - xf.oy) / xf.scale];
      if (!hit([p[0], p[1], 0.1, 0.1], last.card) || last.total <= (last.fit || 0)) return;
      e.preventDefault(); const r = rs(H.S); r.scroll = Math.max(0, Math.min(last.total - last.fit, (r.keep || 0) + Math.sign(e.deltaY) * 2)); r.scrollAt = now();
    }, { passive: false });
  }
  // The blank's controls, into any element (the sheet's panel, or a row of claim 9's blueprint).
  function fill(el, c, typed, onDone) {
    const d = c.d, esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    if (c.state !== 'ask') {
      const ok = c.state === 'right';
      el.innerHTML = `<p class="${ok ? 'sh-ok' : 'sh-no'}">${ok ? 'Right:' : 'It\'s'} <code>${esc(d.blank)}</code></p>${d.doc ? `<a href="${esc(d.doc)}" target="_blank" rel="noopener">AWS docs</a>` : ''}`;
      return;
    }
    if (typed && c.mode !== 'choices') {
      const msg = !c.miss ? (c.line ? 'Type the missing word' : 'Type the missing word on the sheet') : c.miss === 1 ? 'Not quite. Once more:' : 'Here it is, faintly. Type it in:';
      el.innerHTML = `${c.line ? `<p><code>${esc(c.line)}</code></p>` : ''}<p>${msg}</p><div class="sh-row"><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="The missing word" maxlength="60"${c.faint ? ` placeholder="${esc(d.blank)}"` : ''}><button type="button" class="sh-more">Choices</button></div>`;
      const inp = el.querySelector('input');
      inp.addEventListener('input', () => { c.typed = inp.value; });
      inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); onDone(inp.value, 'typed'); } if (e.key === 'Escape') { e.preventDefault(); onDone('', 'skip'); } });
      el.querySelector('.sh-more').addEventListener('click', () => { c.mode = 'choices'; fill(el, c, typed, onDone); });
      setTimeout(() => { try { inp.focus({ preventScroll: true }); } catch (e) { /* fine */ } }, 0);
      return;
    }
    el.innerHTML = `${c.line ? `<p><code>${esc(c.line)}</code></p>` : ''}<p>Pick the missing word</p><div class="sh-ch">${c.choices.map((x, i) => `<button type="button" data-i="${i}">${esc(x)}</button>`).join('')}</div>`;
    el.querySelectorAll('.sh-ch button').forEach(b => b.addEventListener('click', () => onDone(c.choices[+b.dataset.i], 'choice')));
  }
  function place(g) {
    build(); if (!ui.el) return;
    const xf = H.xf(), toC = (x, y) => [xf.ox + x * xf.scale, xf.oy + y * xf.scale];
    const blocked = H.blocked && H.blocked();
    ui.el.style.display = !g || blocked ? 'none' : '';
    if (!g || blocked) return;
    const S = H.S, r = rs(S), b = building();
    // The tab's button (tab mode, while building).
    if (g.mode === 'tab' && b) { const [x, y] = toC(g.tab[0], g.tab[1]); Object.assign(ui.tab.style, { display: '', left: x + 'px', top: y + 'px', width: Math.max(44, g.tab[2] * xf.scale) + 'px', height: Math.max(44, g.tab[3] * xf.scale) + 'px' }); ui.tab.setAttribute('aria-expanded', r.open ? 'true' : 'false'); }
    else ui.tab.style.display = 'none';
    // Opened by itself to show a new line: look only, taps go through to the room (no close button over it).
    if (g.mode === 'tab' && r.open && b && !(r.openBy === 'auto' && !cur)) { const o = g.open, [x, y] = toC(o[0] + o[2], o[1]); Object.assign(ui.close.style, { display: '', left: (x - 50) + 'px', top: (y + 4) + 'px' }); }
    else ui.close.style.display = 'none';
    // The blank's panel.
    const show = cur && cur.S === S && b && last.card;
    if (!show) { ui.panel.style.display = 'none'; ui.shownFor = null; ui.panelH = 0; ui.side = ''; return; }
    const key2 = cur.t + ':' + cur.state + ':' + (cur.mode || '') + ':' + (cur.miss || 0);
    if (ui.shownFor !== key2 || ui.dirty) {
      ui.shownFor = key2; ui.dirty = false;
      const typed = !coarse() && H.L.W > H.L.H;
      fill(ui.panel, cur, typed, (text, how) => { answer(text, how); });
    }
    ui.panel.style.display = '';
    const c = last.card;
    if (g.mode === 'tab') {
      ui.side = ''; ui.panel.classList.remove('sh-to-r', 'sh-to-l');
      // Inside the open card, at its foot.
      const [x0, y0] = toC(c[0], c[1]), w = c[2] * xf.scale - 16, hh = ui.panel.offsetHeight || 200;
      ui.panelH = hh + 12;
      Object.assign(ui.panel.style, { left: (x0 + 8) + 'px', top: (y0 + c[3] * xf.scale - hh - 8) + 'px', width: w + 'px' });
    } else {
      // Beside the pinned card, on the side with more room, level with the blank.
      const [x0, y0] = toC(c[0], c[1]), cw = c[2] * xf.scale, w = 250, vw = root.innerWidth || 1000, vh = root.innerHeight || 700;
      const left = x0 - 16 - w, right = x0 + cw + 16;
      const x = (x0 > vw - (x0 + cw) && left > 4) || right + w > vw ? Math.max(4, left) : right;
      // Its input (or first choice) sits level with the blank's row, and an arrow on its edge points at the card.
      const hh = ui.panel.offsetHeight || 120, rowY = last.blankAt ? toC(0, last.blankAt[1])[1] : y0 + (2.1 + 1.32 * (Math.max(0, last.blankRow) + .55)) * last.font;
      const aim = ui.panel.querySelector('input, .sh-ch button, p'), ay = aim ? aim.offsetTop + aim.offsetHeight / 2 : 20;
      const top = Math.max(4, Math.min(vh - hh - 4, rowY - ay));
      ui.side = x < x0 ? 'left' : 'right';
      ui.panel.classList.toggle('sh-to-r', ui.side === 'left'); ui.panel.classList.toggle('sh-to-l', ui.side === 'right');
      Object.assign(ui.panel.style, { left: x + 'px', top: top + 'px', width: w + 'px' });
      ui.panel.style.setProperty('--ay', Math.max(12, Math.min(hh - 12, rowY - top)) + 'px');
      ui.panelH = 0;
    }
  }

  // ---- Claim 9's blueprint asks there, with the same memory ----
  function needs(t, S) { const d = LN().tools[t]; S = S || (H && H.M); return !!(d && d.blank && !known(t) && (!S || applies(t, d, S))); }
  // Puts the blank's controls in a new element after `after`; done() runs once it's answered (right or wrong).
  function askInto(after, t, done) {
    const d = LN().tools[t]; if (!d || !d.blank) { done(true); return null; }
    if (after.parentNode && after.parentNode.querySelector('.bp-ask')) after.parentNode.querySelector('.bp-ask').remove();
    const ch = (d.choices && d.choices.length ? d.choices.slice(0, 4) : [d.blank]); if (!ch.includes(d.blank)) ch[ch.length - 1] = d.blank;
    for (let i = ch.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ch[i], ch[j]] = [ch[j], ch[i]]; }
    // The line it goes on, with the blank, since the blueprint has no sheet beside it.
    let line = '';
    try { const S = H && H.M; for (const b of blocksOf(d, S)) { const l = (val(b.lines, S) || []).find(x => String(x).includes(d.blank)); if (l) { line = String(l).trim().replace(d.blank, '_'.repeat(d.blank.length)); break; } } } catch (e) { line = ''; }
    const c = { t, d, typed: '', state: 'ask', choices: ch, mode: '', line };
    const wrap = document.createElement('div'); wrap.className = 'bp-ask';
    const el = document.createElement('div'); el.className = 'sh-panel'; wrap.appendChild(el);
    el.addEventListener('keydown', e => e.stopPropagation());
    after.insertAdjacentElement('afterend', wrap);
    const typed = !coarse() && (root.innerWidth || 0) > (root.innerHeight || 0);
    const go = (text, how) => {
      const ok = matches(text, d.blank);
      if (!ok && how === 'typed' && (c.miss || 0) < 2) { c.miss = (c.miss || 0) + 1; c.faint = c.miss >= 2; fill(el, c, typed, go); return; }
      c.state = ok ? 'right' : 'wrong'; markSeen(t); fill(el, c, typed, go);
      setTimeout(() => { wrap.remove(); done(ok); }, ok ? 700 : 1600);
    };
    fill(el, c, typed, go);
    return wrap;
  }

  // ---- For js/rush.js and the check ----
  // What the room drew this frame (js/rush.js calls rec for its plaques and words), for placing the term plaques.
  const frame = [];
  function recAll(kind, t, r) { if (frame.length < 400) frame.push({ kind, t, r }); if (api.spy) api.spy(kind, t, r); }
  const api = SD.rushSheet = {
    attach(h) { H = h; build(); },
    draw() { try { draw(); } catch (e) { if (root.console) console.error('rush-sheet', e); } },
    event(e, where, pops, n0) { try { event(e, where, pops, n0); } catch (err) { if (root.console) console.error('rush-sheet', err); } },
    use, needs, askInto, seen: known, markSeen,
    rec: recAll, spy: null, // spy: tools/rush_check_sheet.js listens to everything drawn
    _h: () => H, // for tools/rush_check_sheet.js
    lines: S => resolve(S || H.S).lines.map(l => l.t),
    forget() { shim.forget(); }, // for the check (the stand-in's memory only)
    debug: () => {
      const xf = H.xf(), c = b => b && [xf.ox + b[0] * xf.scale, xf.oy + b[1] * xf.scale, b[2] * xf.scale, b[3] * xf.scale];
      return { mode: last.mode, key: last.key, blankShown: last.blankShown || '', open: !!last.open, card: c(last.card), tab: c(last.tab), rows: last.rows, blankRow: last.blankRow, total: last.total, first: last.first, font: last.font, lines: last.lines || [], maxCh: last.maxCh,
        terms: (last.terms || []).map(p => ({ text: p.text, r: c(p.r) })), blank: cur ? { t: cur.t, state: cur.state, token: cur.d.blank, choices: cur.choices.slice() } : null, queued: queue.map(q => q.t) };
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
