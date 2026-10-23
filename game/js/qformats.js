// Question formats for the full game (docs/question-formats.md): compare, seq, predict, spot, recall and faded.
// SD.qf.has(type) says whether this engine plays a type; SD.qf.ask(item, opts) plays one item and resolves
// { ok, conf, ms, partial, mode, scored, recognition }, the way SD.quiz.ask does: answer first, then commit with
// Guess, Think so or Sure, then feedback with `why`, the "why not" lines, the AWS docs and ELI5.
// Every format has one state model, idle -> selected -> submitted -> feedback (data-qf-state on the .qf root):
// taps only select, Submit locks the answer (with "Change answer" to go back), and the confidence buttons commit it.
// Recall on a phone is a word bank, labelled Recognition: a pass there resolves partial <= 0.5 and recognition: true,
// and counts as partial (not right) for exposure. Typed recall on a desktop counts in full. An item with
// practice: true shows a Practice label and is never scored, like a hint round.
//
// Inert unless SD.profile === 'full' or the page sets window.SD_FMT_LAB (game/fmt-lab.html): has() is false and
// ask() resolves null. It changes no other file; it injects its own CSS on first use.
//
// How a format is introduced (per type, in SD.state.save.fg.fmt[type] when a save exists, else in memory):
// the first item is worked (answer shown, "Got it", unscored), the second is practice with one hint (unscored),
// the third on is scored. Two right in a row marks the format known, and a known format is always scored. A format
// that is not known yet and has two misses in a row gets one more practice round (with a hint) before scoring again.
// opts.mode ('worked' | 'hint' | 'scored') overrides the rule; opts.track === false leaves the exposure alone.
//
// opts: { title, context, mode, track, noRecord, fade (faded: 0 to 3), recall ('bank' | 'typed') }
(function () {
  window.SD = window.SD || {};
  SD.fmtItems = SD.fmtItems || [];
  const Q = SD.qf = {};
  const TYPES = ['compare', 'seq', 'predict', 'spot', 'recall', 'faded'];
  const NAMES = { compare: 'Compare', seq: 'Sequence', predict: 'Predict', spot: 'Spot the line', recall: 'Recall', faded: 'Faded example' };
  Q.TYPES = TYPES; Q.NAMES = NAMES;
  Q.enabled = () => SD.profile === 'full' || !!window.SD_FMT_LAB;
  Q.has = type => Q.enabled() && TYPES.includes(type);

  const esc = s => (SD.ui && SD.ui.esc ? SD.ui.esc(s == null ? '' : s) : String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const range = n => Array.from({ length: n }, (_, i) => i);
  const mq = q => !!(window.matchMedia && window.matchMedia(q).matches);
  const reduced = () => mq('(prefers-reduced-motion: reduce)');
  const isWide = () => mq('(min-width: 720px)');

  // ---- Exposure: worked, then practice, then scored ----
  const mem = {};
  function store() {
    const sv = SD.state && SD.state.save;
    if (!sv) return mem;
    sv.fg = sv.fg || {};
    sv.fg.fmt = sv.fg.fmt || {};
    return sv.fg.fmt;
  }
  Q.exposure = function (type) {
    const s = store();
    if (!s[type]) s[type] = { n: 0, last: [], known: false, lastMode: null };
    return s[type];
  };
  Q.modeFor = function (type) {
    const e = Q.exposure(type);
    if (e.known) return 'scored';
    if (e.n === 0) return 'worked';
    if (e.n === 1) return 'hint';
    if (e.lastMode !== 'hint' && e.last.length === 2 && e.last[0] === false && e.last[1] === false) return 'hint';
    return 'scored';
  };
  Q.resetExposure = function (type) {
    const s = store();
    for (const k of Object.keys(s)) if (!type || k === type) delete s[k];
    persist();
  };
  function persist() { if (SD.state && SD.state.save && typeof SD.state.persist === 'function') { try { SD.state.persist(); } catch (e) { /* storage blocked */ } } }
  function track(type, mode, ok) {
    const e = Q.exposure(type);
    e.n++;
    e.lastMode = mode;
    if (mode !== 'worked') {
      e.last = e.last.concat([ok === 'partial' ? 'partial' : !!ok]).slice(-2);
      if (e.last.length === 2 && e.last[0] === true && e.last[1] === true) e.known = true;
    }
    persist();
  }

  // ---- CSS ----
  let styled = false;
  function injectCss() {
    if (styled || !document.head) return;
    styled = true;
    const el = document.createElement('style');
    el.id = 'qf-css';
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ---- Panel: the game's (SD.ui.panel) when loaded, else a plain stand-in with the same markup ----
  function panel(html, opts) {
    if (SD.ui && SD.ui.panel) return SD.ui.panel(html, opts);
    let p = document.getElementById('panel');
    if (!p) { p = document.createElement('div'); p.id = 'panel'; document.body.appendChild(p); }
    p.innerHTML = `<div class="win ${opts.cls || ''}" role="dialog" aria-modal="true"><div class="win-h"><span>${esc(opts.title || 'QUESTION')}</span></div><div class="win-b">${html}</div></div>`;
    p.hidden = false;
    return p.querySelector('.win-b');
  }
  function closePanel() {
    if (SD.ui && SD.ui.closePanel) return SD.ui.closePanel();
    const p = document.getElementById('panel'); if (p) { p.hidden = true; p.innerHTML = ''; }
  }

  // ---- Shared bits of markup ----
  const mark = ok => `<span class="qf-m" aria-hidden="true">${ok ? '✓' : '✗'}</span>`;
  const chipBtn = (attr, text, on, extra) => `<button class="qf-chip${on ? ' on' : ''}${extra ? ' ' + extra : ''}" ${attr} aria-pressed="${!!on}" aria-label="${esc(text)}">${esc(text)}</button>`;
  function notsBlock(list) {
    if (!list.length) return '';
    const own = list.filter(n => n.mine), rest = list.filter(n => !n.mine);
    return `<div class="nots">${own.length ? `<div class="mypick"><div class="q-ctx">Why your pick doesn't fit</div>${own.map(n =>
      `<p><b>${esc(n.name)}</b><br>${esc(n.why)}</p>`).join('')}</div>` : ''}${rest.length
      ? `<details${own.length ? '' : ' open'}><summary class="q-ctx">Why not the others (${rest.length})</summary><ul>${rest.map(n => `<li><b>${esc(n.name)}</b><br>${esc(n.why)}</li>`).join('')}</ul></details>` : ''}</div>`;
  }
  function docsBlock(item) {
    const d = (item.doc || []).filter(Boolean);
    if (!d.length) return '';
    const label = u => u.replace(/^https:\/\/(docs\.)?aws\.amazon\.com\//, '').replace(/[?#].*$/, '').replace(/\.html$/, '').split('/').filter(Boolean).slice(-1)[0] || u;
    return `<div class="qf-docs"><div class="q-ctx">AWS docs</div><ul>${d.map(u =>
      `<li><a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(label(u).replace(/[-_]/g, ' '))}</a></li>`).join('')}</ul></div>`;
  }
  function confBlock(ready) {
    return `<div class="conf"><span class="muted small">Commit your answer. How sure are you?</span><div class="conf-b">
      <button data-c="0" ${ready ? '' : 'disabled'}>Guess</button><button data-c="1" ${ready ? '' : 'disabled'}>Think so</button><button data-c="2" ${ready ? '' : 'disabled'}>Sure</button></div></div>`;
  }

  // ---- Renderers, one per type ----
  // init(item, ctx) -> state; draw(st, item, ctx) -> answer markup; bind(root, st, item, ctx, redraw);
  // ready(st, item); grade(st, item) -> { ok, partial }; solve(st, item) fills in the right answer (worked mode);
  // review(st, item, ctx, res) -> answer markup with marks; answer(item) -> the right answer as text;
  // nots(st, item) -> [{ name, why, mine }]; hint(st, item) -> one line; after(root, st, item, ctx) after feedback.
  const R = {};

  // compare: three columns, the same rows for each. Pick the column, then the row that decided it.
  R.compare = {
    how: 'Read the three columns, pick the one that fits, then the row that decided it.',
    wide: ctx => ctx.wide,
    init: () => ({ col: null, row: null, view: 0 }),
    grid(st, it, ctx, review) {
      const n = it.cols.length;
      let h = `<div class="qf-cmp-grid" style="grid-template-columns: minmax(84px, .7fr) repeat(${n}, minmax(0, 1fr))"><div class="qf-cmp-corner"></div>`;
      h += it.cols.map((c, i) => {
        const cls = review ? (i === it.a ? ' right' : (it.alsoOk || []).includes(i) ? ' also' : st.col === i ? ' wrong' : '') : st.col === i ? ' on' : '';
        return review ? `<div class="qf-cmp-h${cls}">${i === it.a || st.col === i ? mark(i === it.a || (it.alsoOk || []).includes(i)) : ''}${esc(c)}</div>`
          : `<button class="qf-cmp-h${cls}" data-qf-col="${i}" aria-pressed="${st.col === i}" aria-label="Pick ${esc(c)}">${esc(c)}<span class="qf-sub">${st.col === i ? 'Picked' : 'Pick'}</span></button>`;
      }).join('');
      it.rows.forEach((r, ri) => {
        const key = review && ri === it.key;
        h += `<div class="qf-cmp-r${key ? ' qf-key' : ''}">${esc(r)}</div>`;
        h += it.cols.map((_, ci) => `<div class="qf-cmp-c${key ? ' qf-key' : ''}${(review ? ci === it.a : st.col === ci) ? ' on' : ''}">${esc(it.cells[ri][ci])}</div>`).join('');
      });
      return h + '</div>';
    },
    card(st, it, i, review) {
      const right = i === it.a, also = (it.alsoOk || []).includes(i);
      const cls = review ? (right ? ' right' : also ? ' also' : st.col === i ? ' wrong' : '') : st.col === i ? ' on' : '';
      return `<div class="qf-card${cls}" data-qf-card="${i}"><div class="qf-card-h">${review && (right || also || st.col === i) ? mark(right || also) : ''}${esc(it.cols[i])}${review && also ? ' <em class="qf-tag">also works</em>' : ''}${review && st.col === i ? ' <em class="qf-tag">your pick</em>' : ''}</div>
        <dl>${it.rows.map((r, ri) => `<div class="qf-kv${review && ri === it.key ? ' qf-key' : ''}"><dt>${esc(r)}</dt><dd>${esc(it.cells[ri][i])}</dd></div>`).join('')}</dl>
        ${review ? '' : `<button class="qf-pick${st.col === i ? ' on' : ''}" data-qf-col="${i}" aria-pressed="${st.col === i}">${st.col === i ? '✓ Picked' : 'Pick ' + esc(it.cols[i])}</button>`}</div>`;
    },
    draw(st, it, ctx) {
      const n = it.cols.length;
      let h = '';
      if (ctx.wide) h += this.grid(st, it, ctx, false);
      else {
        h += `<div class="qf-car" aria-live="polite">${this.card(st, it, st.view, false)}</div>
          <div class="qf-nav"><button class="qf-arrow" id="qf-prev" aria-label="Previous option">‹</button>
          <span class="qf-dots" aria-label="Option ${st.view + 1} of ${n}">${range(n).map(i => `<i class="${i === st.view ? 'on' : ''}${st.col === i ? ' picked' : ''}"></i>`).join('')}<b>${st.view + 1}/${n}</b></span>
          <button class="qf-arrow" id="qf-next" aria-label="Next option">›</button></div>`;
      }
      if (st.col != null) {
        h += `<div class="qf-step2"><div class="q-ctx">Which row decided it?</div><div class="qf-chips">${it.rows.map((r, i) => chipBtn(`data-qf-row="${i}"`, r, st.row === i)).join('')}</div></div>`;
      } else h += `<p class="muted small">${ctx.wide ? 'Pick a column.' : 'Swipe or use the arrows to see all three, then pick one.'}</p>`;
      return h;
    },
    bind(root, st, it, ctx, redraw) {
      const n = it.cols.length;
      root.querySelectorAll('[data-qf-col]').forEach(b => b.onclick = () => { const i = +b.dataset.qfCol; st.col = st.col === i ? null : i; if (st.col == null) st.row = null; redraw(); });
      root.querySelectorAll('[data-qf-row]').forEach(b => b.onclick = () => { st.row = +b.dataset.qfRow; redraw(); });
      const go = d => { st.view = (st.view + d + n) % n; redraw(); };
      const pv = root.querySelector('#qf-prev'), nx = root.querySelector('#qf-next');
      if (pv) pv.onclick = () => go(-1);
      if (nx) nx.onclick = () => go(1);
      const card = root.querySelector('.qf-car');
      if (card) {
        card.addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); go(e.key === 'ArrowRight' ? 1 : -1); const p = root.querySelector('.qf-car [data-qf-col]'); if (p) p.focus(); } });
        let x0 = null, y0 = null;
        card.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
        card.addEventListener('touchend', e => {
          if (x0 == null) return;
          const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0; x0 = null;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
        });
      }
    },
    ready: st => st.col != null && st.row != null,
    grade(st, it) {
      const colOk = st.col === it.a || (it.alsoOk || []).includes(st.col), rowOk = st.row === it.key;
      return { ok: colOk && rowOk, partial: (colOk ? 0.5 : 0) + (rowOk ? 0.5 : 0) };
    },
    solve(st, it) { st.col = it.a; st.row = it.key; st.view = it.a; },
    review(st, it, ctx) {
      const colOk = st.col === it.a || (it.alsoOk || []).includes(st.col);
      let h = `<p class="qf-pickline">Your pick: <b class="${colOk ? 'qf-ok' : 'qf-bad'}">${esc(it.cols[st.col])}</b>, decided by <b class="${st.row === it.key ? 'qf-ok' : 'qf-bad'}">${esc(it.rows[st.row])}</b></p>`;
      h += `<p class="qf-pickline">The deciding row: <b>${esc(it.rows[it.key])}</b></p>`;
      h += ctx.wide ? this.grid(st, it, ctx, true) : `<div class="qf-stack">${range(it.cols.length).map(i => this.card(st, it, i, true)).join('')}</div>`;
      return h;
    },
    answer: it => `${it.cols[it.a]}, decided by ${it.rows[it.key]}`,
    nots: (st, it) => it.cols.map((c, i) => ({ i, name: c + ((it.alsoOk || []).includes(i) ? ' (also works)' : ''), why: (it.no || [])[i], mine: st.col === i })).filter(n => n.i !== it.a && n.why),
    hint: (st, it) => `Compare the columns on "${it.rows[it.key]}".`
  };

  // seq: tap a step to put it in the next numbered slot, tap a slot to send it back. Decoys don't belong.
  R.seq = {
    how: 'Tap the steps in the order they happen. Some of them don\'t belong.',
    init(it) {
      return { placed: [], pool: shuffle(it.steps.map((t, i) => ({ k: 's' + i, t })).concat((it.decoys || []).map((d, i) => ({ k: 'd' + i, t: d.t })))) };
    },
    text: (st, k) => (st.pool.find(p => p.k === k) || {}).t,
    draw(st, it) {
      const n = it.steps.length, full = st.placed.length >= n;
      let h = `<ol class="qf-slots">${range(n).map(i => {
        const k = st.placed[i];
        return k ? `<li><button class="qf-slot full" data-qf-slot="${i}" aria-label="Step ${i + 1}: ${esc(this.text(st, k))}. Tap to send it back."><span class="qf-n">${i + 1}</span><span class="qf-st-t">${esc(this.text(st, k))}</span><span class="qf-x" aria-hidden="true">↩</span></button></li>`
          : `<li><div class="qf-slot${i === st.placed.length ? ' next' : ''}"><span class="qf-n">${i + 1}</span><span class="muted">${i === st.placed.length ? 'Next step goes here' : ''}</span></div></li>`;
      }).join('')}</ol>`;
      h += `<p class="muted small">Tap a step to place it. Tap a placed step to send it back. Some steps don't belong.</p>`;
      h += `<div class="qf-chips qf-pool">${st.pool.filter(p => !st.placed.includes(p.k)).map(p => `<button class="qf-chip" data-qf-pool="${p.k}" aria-label="Place: ${esc(p.t)}" ${full ? 'disabled' : ''}>${esc(p.t)}</button>`).join('')}</div>`;
      return h;
    },
    bind(root, st, it, ctx, redraw) {
      root.querySelectorAll('[data-qf-pool]').forEach(b => b.onclick = () => { if (st.placed.length < it.steps.length) { st.placed.push(b.dataset.qfPool); redraw(); } });
      root.querySelectorAll('[data-qf-slot]').forEach(b => b.onclick = () => { st.placed.splice(+b.dataset.qfSlot, 1); redraw(); });
    },
    ready: (st, it) => st.placed.length === it.steps.length,
    grade(st, it) { const right = st.placed.filter((k, i) => k === 's' + i).length; return { ok: right === it.steps.length, partial: right / it.steps.length }; },
    solve(st, it) { st.placed = it.steps.map((_, i) => 's' + i); },
    review(st, it, ctx) {
      const shake = !reduced();
      let h = `<ol class="qf-slots">${it.steps.map((t, i) => {
        const k = st.placed[i], ok = k === 's' + i;
        return `<li><div class="qf-slot ${ok ? 'right' : 'wrong' + (shake ? ' qf-shake' : '')}" data-qf-res="${ok ? 1 : 0}"><span class="qf-n">${i + 1}</span><span class="qf-st-t">${mark(ok)} ${esc(this.text(st, k))}${ok ? '' : `<br><em class="qf-tag">should be: ${esc(t)}</em>`}</span></div></li>`;
      }).join('')}</ol>`;
      return h;
    },
    answer: it => it.steps.join(' → '),
    nots: (st, it) => (it.decoys || []).map((d, i) => ({ name: d.t, why: d.no, mine: st.placed.includes('d' + i) })).filter(n => n.why),
    hint: (st, it) => `It starts with ${it.steps[0]}.`
  };

  // predict: read the setup, pick an outcome, then see what happens.
  const ANIMS = {
    // SQS visibility timeout: a worker takes the message, the timeout runs out while it's still busy, the message
    // shows up in the queue again and a second worker takes it too.
    visibility: () => `<div class="qf-anim qf-vis" role="img" aria-label="A worker receives the message, the visibility timeout runs out while it is still working, and the message appears in the queue again for a second worker.">
      <div class="qf-vis-lane"><div class="qf-vis-box">Queue</div><div class="qf-vis-box">Worker A</div><div class="qf-vis-box">Worker B</div></div>
      <i class="qf-vis-m m1">msg</i><i class="qf-vis-m m2">msg</i>
      <div class="qf-vis-busy">still working…</div>
      <div class="qf-vis-timer"><span>visibility timeout</span><b></b></div>
      <div class="qf-vis-cap"><span class="c1">Worker A receives the message. It's hidden from other consumers.</span><span class="c2">The timeout runs out. Worker A is still busy.</span><span class="c3">The message is visible again, and Worker B receives it too.</span></div></div>`
  };
  Q.ANIMS = ANIMS;
  R.predict = {
    how: 'Read the setup and predict what happens before the game shows you.',
    init(it, ctx) {
      const order = shuffle(range(it.opts.length));
      return { pick: null, order, struck: ctx.mode === 'hint' ? order.find(i => i !== it.a) : null };
    },
    draw(st, it) {
      return `<div class="qf-setup">${esc(it.setup)}</div><div class="q-ctx">Your prediction</div><div class="opts">${st.order.map(i =>
        `<button class="opt${st.pick === i ? ' on' : ''}${st.struck === i ? ' struck' : ''}" data-qf-opt="${i}" ${st.struck === i ? 'disabled' : ''} aria-pressed="${st.pick === i}" aria-label="Predict: ${esc(it.opts[i])}${st.struck === i ? ' (struck out)' : ''}">${esc(it.opts[i])}</button>`).join('')}</div>`;
    },
    bind(root, st, it, ctx, redraw) { root.querySelectorAll('[data-qf-opt]').forEach(b => b.onclick = () => { st.pick = +b.dataset.qfOpt; redraw(); }); },
    ready: st => st.pick != null,
    grade: (st, it) => ({ ok: st.pick === it.a }),
    solve(st, it) { st.pick = it.a; },
    review(st, it, ctx) {
      let h = `<div class="qf-setup">${esc(it.setup)}</div>`;
      if (it.anim && ANIMS[it.anim]) h += ANIMS[it.anim]();
      h += ctx.mode === 'worked' ? `<p class="qf-yp">What happens: <b>${esc(it.opts[it.a])}</b></p>`
        : `<p class="qf-yp">You predicted <b class="${st.pick === it.a ? 'qf-ok' : 'qf-bad'}">${esc(it.opts[st.pick])}</b> · What happened: <b>${esc(it.opts[it.a])}</b></p>`;
      h += `<div class="qf-reveal">${esc(it.reveal || '')}</div>`;
      return h;
    },
    after(root, st, it) {
      const a = root.querySelector('.qf-anim');
      if (!a) return;
      if (reduced()) a.classList.add('still');
      else requestAnimationFrame(() => a.classList.add('play'));
    },
    answer: it => it.opts[it.a],
    nots: (st, it) => st.order.filter(i => i !== it.a && (it.no || [])[i]).map(i => ({ name: it.opts[i], why: it.no[i], mine: st.pick === i })),
    hint: (st, it) => `One outcome is struck out: it can't happen here.`
  };

  // spot: tap the wrong line, then say why.
  R.spot = {
    how: 'One line is wrong. Tap it, then pick the reason.',
    init: it => ({ line: null, reason: null, order: shuffle(range(it.reasons.length)) }),
    code(st, it, review) {
      return `<div class="qf-code${review ? ' rev' : ''}" data-lang="${esc(it.lang || '')}"><div class="qf-code-in">${it.lines.map((l, i) => {
        const bad = review && i === it.bad, picked = st.line === i;
        const cls = review ? (bad ? ' bad' : picked ? ' picked' : '') : picked ? ' on' : '';
        const row = `<span class="qf-ln">${i + 1}</span><code>${esc(l) || ' '}</code>`;
        let h = review ? `<div class="qf-line${cls}">${row}${bad ? '<span class="qf-flag">✗</span>' : picked ? '<span class="qf-flag">your pick</span>' : ''}</div>`
          : `<button class="qf-line${cls}" data-qf-line="${i}" aria-pressed="${picked}" aria-label="Line ${i + 1}: ${esc(l.trim() || 'blank')}">${row}</button>`;
        if (bad && it.fix != null) h += `<div class="qf-line fix"><span class="qf-ln">fix</span><code>${esc(it.fix)}</code></div>`;
        return h;
      }).join('')}</div></div>`;
    },
    draw(st, it) {
      let h = this.code(st, it, false);
      if (st.line == null) h += '<p class="muted small">Tap the line that is wrong.</p>';
      else h += `<div class="q-ctx">Why is line ${st.line + 1} wrong?</div><div class="opts">${st.order.map(i =>
        `<button class="opt${st.reason === i ? ' on' : ''}" data-qf-reason="${i}" aria-pressed="${st.reason === i}" aria-label="Reason: ${esc(it.reasons[i])}">${esc(it.reasons[i])}</button>`).join('')}</div>`;
      return h;
    },
    bind(root, st, it, ctx, redraw) {
      root.querySelectorAll('[data-qf-line]').forEach(b => b.onclick = () => { st.line = +b.dataset.qfLine; redraw(); });
      root.querySelectorAll('[data-qf-reason]').forEach(b => b.onclick = () => { st.reason = +b.dataset.qfReason; redraw(); });
    },
    ready: st => st.line != null && st.reason != null,
    grade(st, it) { const l = st.line === it.bad, r = st.reason === it.a; return { ok: l && r, partial: l ? (r ? 1 : 0.5) : 0 }; },
    solve(st, it) { st.line = it.bad; st.reason = it.a; },
    review(st, it, ctx) {
      let h = ctx.mode === 'worked' ? '' : `<p class="qf-pickline">You tapped <b class="${st.line === it.bad ? 'qf-ok' : 'qf-bad'}">line ${st.line + 1}</b>: ${esc(it.reasons[st.reason])} ${mark(st.line === it.bad && st.reason === it.a)}</p>`;
      h += this.code(st, it, true);
      h += `<p class="qf-pickline">Line ${it.bad + 1} is wrong: <b>${esc(it.reasons[it.a])}</b></p>`;
      return h;
    },
    answer: it => `Line ${it.bad + 1}: ${it.reasons[it.a]}`,
    nots: (st, it) => st.order.filter(i => i !== it.a && (it.no || [])[i]).map(i => ({ name: it.reasons[i], why: it.no[i], mine: st.reason === i })),
    hint(st, it) { const lo = Math.max(0, it.bad - 1), hi = Math.min(it.lines.length - 1, it.bad + 1); return `Look at lines ${lo + 1} to ${hi + 1}.`; }
  };

  // recall: a word bank on a phone, typed entries on a desktop.
  const norm = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/^(amazon|aws) /, '');
  const sameKey = (e, k) => e === k || e.replace(/ /g, '') === k.replace(/ /g, '') || (k.length >= 4 && (' ' + e + ' ').includes(' ' + k + ' '));
  // Which answer each typed entry names: exact (normalized) names first, then on-device embeddings if js/embed.js is ready.
  Q.matchRecall = function (entries, answers) {
    const hit = answers.map(() => null), used = entries.map(() => false);
    const keys = answers.map(a => [a.t].concat(a.alt || []).map(norm));
    entries.forEach((en, ei) => {
      const e = norm(en);
      const ai = answers.findIndex((a, i) => hit[i] == null && keys[i].some(k => sameKey(e, k)));
      if (ai >= 0) { hit[ai] = ei; used[ei] = true; }
    });
    const E = SD.embed;
    if (E && E.ready && typeof E.vec === 'function' && typeof E.cos === 'function') {
      entries.forEach((en, ei) => {
        if (used[ei]) return;
        const v = E.vec(en); if (!v) return;
        let best = 0, bi = -1;
        answers.forEach((a, i) => { if (hit[i] != null) return; for (const k of [a.t].concat(a.alt || [])) { const kv = E.vec(k); if (kv) { const s = E.cos(v, kv); if (s > best) { best = s; bi = i; } } } });
        if (bi >= 0 && best >= 0.8) { hit[bi] = ei; used[ei] = true; }
      });
    }
    return { hit, used };
  };
  R.recall = {
    how: 'List what you remember. Each one you get ticks off.',
    init(it, ctx) {
      const typed = ctx.opts.recall ? ctx.opts.recall === 'typed' : ctx.wide;
      return { typed, sel: new Set(), entries: [], draft: '', bank: shuffle(it.answers.map((a, i) => ({ k: 'a' + i, t: a.t })).concat((it.decoys || []).map((d, i) => ({ k: 'd' + i, t: d.t })))) };
    },
    draw(st, it) {
      const need = `You need ${it.need} of ${it.answers.length}.`;
      if (!st.typed) return `<p class="muted small">Pick every one that belongs. Some don't. ${need}</p><div class="qf-chips qf-bank">${st.bank.map(b => chipBtn(`data-qf-word="${b.k}"`, b.t, st.sel.has(b.k))).join('')}</div>`;
      return `<p class="muted small">Type one at a time and press Enter. ${need}</p>
        <div class="qf-typed"><input id="qf-recall-in" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Type one" value="${esc(st.draft)}" aria-label="Your answer"><button class="ghost" id="qf-recall-add">Add</button></div>
        <div class="qf-chips qf-entries">${st.entries.map((e, i) => `<button class="qf-chip" data-qf-del="${i}" aria-label="Remove ${esc(e)}">${esc(e)} <span aria-hidden="true">×</span></button>`).join('') || '<span class="muted small">Nothing yet.</span>'}</div>`;
    },
    bind(root, st, it, ctx, redraw) {
      root.querySelectorAll('[data-qf-word]').forEach(b => b.onclick = () => { const k = b.dataset.qfWord; st.sel.has(k) ? st.sel.delete(k) : st.sel.add(k); redraw(); });
      root.querySelectorAll('[data-qf-del]').forEach(b => b.onclick = () => { st.entries.splice(+b.dataset.qfDel, 1); redraw(); });
      const inp = root.querySelector('#qf-recall-in');
      if (inp) {
        const add = () => { const v = inp.value.trim(); st.draft = ''; if (v && !st.entries.some(e => norm(e) === norm(v))) st.entries.push(v); st.focus = true; redraw(); };
        inp.oninput = () => { st.draft = inp.value; };
        inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); add(); } };
        root.querySelector('#qf-recall-add').onclick = add;
        if (st.focus || ctx.wide) setTimeout(() => { inp.focus(); }, 0);
      }
    },
    ready: st => st.typed ? st.entries.length > 0 : st.sel.size > 0,
    grade(st, it) {
      if (!st.typed) {
        const hits = it.answers.filter((_, i) => st.sel.has('a' + i)).length, wrong = (it.decoys || []).filter((_, i) => st.sel.has('d' + i)).length;
        st.score = hits - wrong;
        return { ok: hits - wrong >= it.need, partial: Math.max(0, hits - wrong) / it.answers.length };
      }
      st.match = Q.matchRecall(st.entries, it.answers);
      const hits = st.match.hit.filter(h => h != null).length;
      return { ok: hits >= it.need, partial: hits / it.answers.length };
    },
    solve(st, it) { it.answers.forEach((a, i) => st.sel.add('a' + i)); st.entries = it.answers.map(a => a.t); st.match = Q.matchRecall(st.entries, it.answers); },
    review(st, it, ctx) {
      const got = i => st.typed ? st.match.hit[i] != null : st.sel.has('a' + i);
      const n = it.answers.filter((_, i) => got(i)).length;
      let h = ctx.mode === 'worked' ? '' : `<p class="qf-pickline">You got <b class="${n >= it.need ? 'qf-ok' : 'qf-bad'}">${n} of ${it.answers.length}</b> (you needed ${it.need}).</p>`;
      h += `<ul class="qf-ans">${it.answers.map((a, i) => `<li class="${got(i) ? 'hit' : 'miss'}"><span class="qf-m" aria-hidden="true">${got(i) ? '✓' : '·'}</span><span>${esc(a.t)}${st.typed && got(i) && norm(st.entries[st.match.hit[i]]) !== norm(a.t) ? ` <em class="qf-tag">you wrote "${esc(st.entries[st.match.hit[i]])}"</em>` : ''}${!got(i) && ctx.mode !== 'worked' ? ' <em class="qf-tag">missed</em>' : ''}</span></li>`).join('')}</ul>`;
      if (st.typed) {
        const extra = st.entries.filter((_, ei) => !st.match.used[ei]);
        if (extra.length) h += `<p class="qf-pickline muted">Not on the list: ${extra.map(e => `<s>${esc(e)}</s>`).join(', ')}</p>`;
      } else {
        const wrong = (it.decoys || []).filter((_, i) => st.sel.has('d' + i));
        if (wrong.length) h += `<p class="qf-pickline">Picked but doesn't belong: ${wrong.map(d => `<b class="qf-bad">${esc(d.t)}</b>`).join(', ')}</p>`;
      }
      return h;
    },
    answer: it => it.answers.map(a => a.t).join(', '),
    nots: (st, it) => (it.decoys || []).map((d, i) => ({ name: d.t, why: d.no, mine: !st.typed && st.sel.has('d' + i) })).filter(n => n.why),
    hint: (st, it) => `One of them is ${it.answers[0].t}.`
  };

  // faded: a worked procedure with some steps left blank. Level 0 shows every step, 1 blanks the last, 2 the last
  // two, 3 every blankable step (a step with blankable: false always shows). Each blank is a tap-to-fill choice.
  R.faded = {
    how: 'A worked procedure with steps left blank. Fill each blank from its choices.',
    init(it, ctx) {
      let level = ctx.mode === 'worked' ? 0 : ctx.mode === 'hint' ? 1 : ctx.opts.fade != null ? ctx.opts.fade : it.fade != null ? it.fade : 2;
      level = Math.max(ctx.mode === 'worked' ? 0 : 1, Math.min(3, +level || 0));
      const can = it.steps.map((s, i) => i).filter(i => it.steps[i].blankable !== false);
      const blanks = level === 0 ? [] : level === 3 ? can : can.slice(-level);
      const order = {};
      blanks.forEach(i => { order[i] = shuffle(range(it.steps[i].opts.length)); });
      return { level, blanks, order, fill: {} };
    },
    draw(st, it) {
      return `<p class="muted small">Fill each blank. ${st.blanks.length === 1 ? 'One step is' : st.blanks.length + ' steps are'} missing.</p><ol class="qf-steps">${it.steps.map((s, i) => {
        if (!st.blanks.includes(i)) return `<li class="qf-st given"><span class="qf-n">${i + 1}</span><div><b>${esc(s.t)}</b>${s.why ? `<p class="qf-why">${esc(s.why)}</p>` : ''}</div></li>`;
        const f = st.fill[i];
        if (f != null) return `<li class="qf-st blank filled" data-qf-blank="${i}"><span class="qf-n">${i + 1}</span><div><button class="qf-chip on" data-qf-clear="${i}" aria-label="Change step ${i + 1}">${esc(s.opts[f])} <span aria-hidden="true">↩</span></button></div></li>`;
        return `<li class="qf-st blank" data-qf-blank="${i}"><span class="qf-n">${i + 1}</span><div><span class="qf-gap">Step ${i + 1}?</span><div class="qf-chips">${st.order[i].map(o =>
          `<button class="qf-chip" data-qf-fill="${i}:${o}" aria-label="Step ${i + 1}: ${esc(s.opts[o])}">${esc(s.opts[o])}</button>`).join('')}</div></div></li>`;
      }).join('')}</ol>`;
    },
    bind(root, st, it, ctx, redraw) {
      root.querySelectorAll('[data-qf-fill]').forEach(b => b.onclick = () => { const [i, o] = b.dataset.qfFill.split(':').map(Number); st.fill[i] = o; redraw(); });
      root.querySelectorAll('[data-qf-clear]').forEach(b => b.onclick = () => { delete st.fill[+b.dataset.qfClear]; redraw(); });
    },
    ready: st => st.blanks.every(i => st.fill[i] != null),
    grade(st, it) {
      const right = st.blanks.filter(i => it.steps[i].opts[st.fill[i]] === it.steps[i].t).length;
      return { ok: right === st.blanks.length, partial: st.blanks.length ? right / st.blanks.length : 1 };
    },
    solve(st, it) { st.blanks.forEach(i => { st.fill[i] = it.steps[i].opts.indexOf(it.steps[i].t); }); },
    review(st, it) {
      return `<ol class="qf-steps">${it.steps.map((s, i) => {
        const blank = st.blanks.includes(i), ok = blank && s.opts[st.fill[i]] === s.t;
        return `<li class="qf-st ${blank ? (ok ? 'right' : 'wrong') : 'given'}"><span class="qf-n">${i + 1}</span><div>${blank ? mark(ok) + ' ' : ''}<b>${esc(blank && !ok ? s.opts[st.fill[i]] : s.t)}</b>${blank && !ok ? `<br><em class="qf-tag">should be: ${esc(s.t)}</em>` : ''}${s.why ? `<p class="qf-why">${esc(s.why)}</p>` : ''}</div></li>`;
      }).join('')}</ol>`;
    },
    answer: it => it.steps.map(s => s.t).join(' → '),
    nots: () => [],
    hint(st, it) { const b = st.blanks[0]; return b == null ? '' : `Step ${b + 1}: ${it.steps[b].why || ''}`; }
  };

  // ---- The flow ----
  Q.ask = function (item, opts) {
    opts = opts || {};
    if (!Q.enabled() || !item || !R[item.type]) return Promise.resolve(null);
    injectCss();
    return new Promise(resolve => {
      const r = R[item.type], t0 = Date.now();
      const mode = ['worked', 'hint', 'scored'].includes(opts.mode) ? opts.mode : Q.modeFor(item.type);
      // Practice: a hint round, or an item the author flagged with practice: true. Neither is scored.
      const practice = mode === 'hint' || !!item.practice;
      const ctx = { opts, mode, wide: isWide() };
      const st = r.init(item, ctx);
      const title = opts.title || 'WHITEBOARD';
      const cls = 'quiz qf-win' + (item.type === 'compare' && ctx.wide ? ' wide' : '');
      const concept = SD.concepts && item.c ? SD.concepts[item.c] : null;
      const head = () => `<div class="q-ctx">${esc(opts.context || (concept ? concept.name : NAMES[item.type]))}</div>${item.title ? `<div class="qf-title">${esc(item.title)}</div>` : ''}<p class="q-q">${esc(item.q || '')}</p>`;
      if (mode === 'worked') r.solve(st, item);
      let root = null, locked = false;
      // One state model for every format: idle (nothing chosen) -> selected (an answer is ready) -> submitted (the
      // answer is locked and you rate your confidence) -> feedback. Nothing submits on a tap; Submit does.
      function draw() {
        if (mode === 'worked') return worked();
        const ready = r.ready(st, item), state = locked ? 'submitted' : ready ? 'selected' : 'idle';
        let h = head() + (practice ? `<div class="qf-hint"><span class="qf-practice">Practice</span> Not scored.${mode === 'hint' ? ` <span class="qf-hint-t">Hint: ${esc(r.hint(st, item))}</span>` : ''}</div>` : '');
        if (item.type === 'recall' && !st.typed) h += '<div class="qf-recog"><span class="qf-practice">Recognition</span> Word bank: picking from a list counts for less than typing from memory.</div>';
        h += r.draw(st, item, ctx);
        h += locked ? `<div class="qf-locked muted small">Answer locked in. <button class="ghost qf-change" id="qf-change">Change answer</button></div>` + confBlock(true)
          : `<div class="qf-submit-row"><button class="primary" id="qf-submit" ${ready ? '' : 'disabled'}>Submit</button></div>`;
        if (!root || !root.isConnected) {
          const b = panel(`<div class="qf qf-${item.type}" data-qf-type="${item.type}" data-qf-phase="answer"></div>`, { title, noClose: true, cls });
          root = b.querySelector('.qf');
        }
        root.dataset.qfState = state;
        root.innerHTML = h;
        if (locked) {
          root.querySelectorAll('button, input').forEach(el => { if (!el.matches('[data-c], #qf-change, .help-b')) el.disabled = true; });
          root.querySelector('#qf-change').onclick = () => { locked = false; draw(); };
          root.querySelectorAll('[data-c]').forEach(el => el.onclick = () => submit(+el.dataset.c));
          const first = root.querySelector('[data-c="1"]'); if (first) first.focus();
        } else {
          r.bind(root, st, item, ctx, draw);
          const sb = root.querySelector('#qf-submit');
          sb.onclick = () => { if (r.ready(st, item)) { locked = true; draw(); } };
        }
      }
      function worked() {
        let h = `<div class="qf qf-${item.type}" data-qf-type="${item.type}" data-qf-phase="worked">`;
        h += `<div class="qf-banner"><b>New format: ${esc(NAMES[item.type])}</b><br>${esc(r.how)} Here is one worked through.</div>`;
        h += head() + r.review(st, item, ctx, { ok: true });
        h += `<div class="why"><p class="why-a"><span class="q-ctx">Answer</span><b>${esc(r.answer(item))}</b></p><p>${esc(item.why || '')}</p></div>`;
        h += notsBlock(r.nots(st, item).map(n => Object.assign(n, { mine: false })));
        h += docsBlock(item) + helpRow() + `<div class="q-foot"><button class="primary" id="qf-got">Got it</button></div></div>`;
        const b = panel(h, { title, noClose: true, cls });
        bindHelp(b);
        if (r.after) r.after(b, st, item, ctx);
        const got = b.querySelector('#qf-got');
        got.onclick = () => {
          if (opts.track !== false) track(item.type, 'worked', null);
          closePanel();
          resolve({ ok: null, conf: null, ms: Date.now() - t0, mode, scored: false });
        };
        got.focus();
      }
      function submit(conf) {
        const ms = Date.now() - t0;
        const res = r.grade(st, item);
        const ok = !!res.ok;
        const scored = mode === 'scored' && !item.practice;
        // A word bank is recognition, not recall: a pass there counts as partial for exposure, never as a clean right.
        const recog = item.type === 'recall' && !st.typed;
        if (recog) { res.recognition = true; res.partial = Math.min(res.partial == null ? 1 : res.partial, 0.5); }
        if (scored && item.c && !opts.noRecord && SD.state && SD.state.recordAnswer && SD.concepts && SD.concepts[item.c]) {
          try { SD.state.recordAnswer(item.c, ok, conf, ms); } catch (e) { /* a concept the save doesn't know yet */ }
        }
        if (opts.track !== false) track(item.type, mode, recog && ok ? 'partial' : ok); else persist();
        feedback(ok, conf, ms, res, scored);
      }
      function helpRow() {
        const eli = item.eli5 || (SD.eli5 && item.id && SD.eli5[item.id]) || '';
        if (!eli) return '';
        return `<div class="help-row"><button class="ghost help-b" id="q-eli5" aria-expanded="false">ELI5 🎮</button></div><div class="helpbox" id="q-eli5-box" hidden><p>${esc(eli)}</p></div>`;
      }
      function bindHelp(b) {
        const btn = b.querySelector('#q-eli5'), box = b.querySelector('#q-eli5-box');
        if (btn && box) btn.onclick = () => { box.hidden = !box.hidden; btn.setAttribute('aria-expanded', String(!box.hidden)); if (!box.hidden && box.scrollIntoView) box.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); };
      }
      function feedback(ok, conf, ms, res, scored) {
        if (SD.audio && SD.audio.sfx) { try { SD.audio.sfx(ok ? 'right' : 'wrong'); } catch (e) { /* no audio */ } }
        let h = `<div class="qf qf-${item.type}" data-qf-type="${item.type}" data-qf-phase="feedback" data-qf-ok="${ok ? 1 : 0}">`;
        h += `<div class="verdict ${ok ? 'ok' : 'bad'}">${ok ? (conf === 0 ? 'CORRECT... BUT A GUESS' : 'CORRECT!') : res.partial >= 0.5 ? 'PARTLY RIGHT!' : 'NOT QUITE!'}</div>`;
        if (!scored) h += `<p class="muted small"><span class="qf-practice">Practice</span> This one isn't scored.</p>`;
        if (res.recognition) h += `<p class="muted small"><span class="qf-practice">Recognition</span> Picked from a word bank, so it counts as a partial result. Typing them from memory counts in full.</p>`;
        if (!ok && conf === 2) h += `<p class="warn small">You were sure and it was wrong. That gap is the most valuable thing you found today, so this comes back first.</p>`;
        if (ok && conf === 0) h += `<p class="muted small">A lucky guess is not knowledge yet. It will come back soon.</p>`;
        h += `<p class="q-q qf-q-small">${esc(item.q || '')}</p>`;
        h += r.review(st, item, ctx, res);
        h += `<div class="why">${!ok || conf === 0 ? `<p class="why-a"><span class="q-ctx">Answer</span><b>${esc(r.answer(item))}</b></p>` : ''}<p>${esc(item.why || '')}</p></div>`;
        h += notsBlock(r.nots(st, item));
        h += docsBlock(item) + helpRow();
        h += `<div class="q-foot"><button class="primary" id="q-next">Continue</button></div></div>`;
        const b = panel(h, { title, noClose: true, cls });
        bindHelp(b);
        if (r.after) r.after(b, st, item, ctx);
        const nx = b.querySelector('#q-next');
        nx.onclick = () => {
          closePanel();
          const out = { ok, conf, ms, mode, scored };
          if (res.partial != null) out.partial = res.partial;
          if (res.recognition) out.recognition = true;
          resolve(out);
        };
        nx.focus();
      }
      draw();
    });
  };

  const CSS = `
.qf { --qf-ink: var(--ink, #2b2340); --qf-blue: var(--blue, #3b8bff); --qf-blue-d: var(--blue-d, #2160d0); --qf-mint: var(--mint, #2fbf7f); --qf-red: var(--red, #ff5a5a); --qf-sun: var(--sun, #ffc93c); min-width: 0; }
.qf button { font: inherit; color: var(--qf-ink); cursor: pointer; touch-action: manipulation; }
.qf button:disabled { cursor: default; }
.qf .qf-title { font-family: var(--f-head, system-ui); font-weight: 600; font-size: 13px; color: var(--muted, #6f6787); margin: -2px 0 2px; }
.qf .qf-q-small { font-size: 15px; margin: 0 0 8px; }
.qf .conf-b button { min-height: 44px; }
.qf .qf-hint { margin: 0 0 10px; padding: 8px 10px; background: #fff7d6; border: 2px dashed var(--qf-ink); border-radius: 10px; font-size: 14px; }
.qf .qf-hint-t { display: block; margin-top: 2px; }
.qf .qf-practice { display: inline-block; margin-right: 4px; padding: 0 8px; border: 2px solid var(--qf-ink); border-radius: 10px; background: var(--qf-sun); font: 700 11px/18px var(--f-head, system-ui); text-transform: uppercase; letter-spacing: .05em; color: var(--qf-ink); }
.qf .qf-recog { margin: 0 0 8px; font-size: 13px; color: var(--muted, #6f6787); }
.qf .qf-submit-row { margin-top: 12px; border-top: 2px dashed var(--line, #e2d5bb); padding-top: 12px; }
.qf .qf-submit-row .primary { width: 100%; min-height: 44px; }
.qf .qf-locked { margin-top: 10px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.qf .qf-change { min-height: 44px; }
.qf[data-qf-state="submitted"] button:disabled:not([data-c]) { opacity: .7; }
.qf .qf-banner { margin: 0 0 10px; padding: 8px 10px; background: #eafaf2; border: 2px solid var(--qf-mint); border-radius: 10px; font-size: 14px; }
.qf .qf-m { display: inline-block; width: 1.1em; font-weight: 800; }
.qf .qf-ok { color: #1f8a5b; } .qf .qf-bad { color: #b23b3b; }
.qf .qf-tag { font-size: 12px; font-style: normal; font-weight: 700; color: var(--muted, #6f6787); }
.qf .qf-pickline { font-size: 14px; margin: 0 0 8px; }
.qf .qf-chips { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0 12px; }
.qf .qf-chip { min-height: 44px; padding: 8px 12px; background: #fff; border: 2px solid var(--qf-ink); border-radius: 22px; box-shadow: 0 3px 0 rgba(43,35,64,.85); line-height: 1.25; text-align: left; max-width: 100%; overflow-wrap: anywhere; }
.qf .qf-chip.on { background: #dcebff; border-color: var(--qf-blue-d); box-shadow: 0 3px 0 var(--qf-blue-d); }
.qf .qf-chip:disabled { opacity: .45; box-shadow: none; }
.qf .opt { min-height: 44px; overflow-wrap: anywhere; }
.qf .qf-docs { margin-top: 10px; font-size: 13px; }
.qf .qf-docs ul { margin: 2px 0 0; padding-left: 18px; }
.qf .qf-docs a { color: var(--qf-blue-d); overflow-wrap: anywhere; display: inline-block; min-height: 28px; padding: 3px 0; }
.qf .helpbox { margin-top: 8px; padding: 8px 10px; background: #fff; border: 2px solid var(--qf-ink); border-radius: 10px; }
.qf .helpbox p { margin: 0; }
/* compare */
.qf-cmp-grid { display: grid; gap: 0; margin: 10px 0; border: 2px solid var(--qf-ink); border-radius: 12px; overflow: hidden; background: #fff; font-size: 14px; }
.qf-cmp-grid > * { padding: 8px 10px; border-bottom: 1px solid rgba(43,35,64,.15); border-left: 1px solid rgba(43,35,64,.12); min-width: 0; overflow-wrap: anywhere; }
.qf-cmp-corner { background: #f6f1e6; }
.qf-cmp-h { font-family: var(--f-head, system-ui); font-weight: 700; background: #f3f8ff; text-align: left; border: 0; border-left: 1px solid rgba(43,35,64,.12); border-bottom: 2px solid var(--qf-ink); min-height: 44px; }
button.qf-cmp-h:hover { background: #e6f0ff; }
.qf-cmp-h .qf-sub { display: block; font-size: 12px; font-weight: 600; color: var(--qf-blue-d); }
.qf .qf-cmp-h.on, .qf .qf-cmp-c.on { background: #dcebff; }
.qf-cmp-h.right { background: #eafaf2; color: #1f6a47; } .qf-cmp-h.also { background: #f2fbf6; } .qf-cmp-h.wrong { background: #fff1f1; color: #8a2d2d; }
.qf-cmp-r { font-weight: 700; background: #faf6ee; }
.qf-cmp-grid .qf-key { background: #fff3c4 !important; box-shadow: inset 0 2px 0 var(--qf-sun), inset 0 -2px 0 var(--qf-sun); font-weight: 700; }
.qf-car { touch-action: pan-y; }
.qf-card { background: #fff; border: 2px solid var(--qf-ink); border-radius: 14px; padding: 10px 12px; box-shadow: 0 3px 0 rgba(43,35,64,.85); }
.qf-card.on { border-color: var(--qf-blue-d); box-shadow: 0 3px 0 var(--qf-blue-d); background: #f3f8ff; }
.qf-card.right { border-color: var(--qf-mint); background: #f2fbf6; } .qf-card.also { border-color: var(--qf-mint); border-style: dashed; } .qf-card.wrong { border-color: var(--qf-red); background: #fff6f6; }
.qf-card-h { font-family: var(--f-head, system-ui); font-weight: 700; font-size: 17px; margin-bottom: 6px; }
.qf-card dl { margin: 0 0 8px; }
.qf-kv { padding: 5px 6px; border-top: 1px dashed rgba(43,35,64,.18); border-radius: 6px; }
.qf-kv dt { font-size: 12px; font-weight: 700; color: var(--muted, #6f6787); text-transform: uppercase; letter-spacing: .04em; }
.qf-kv dd { margin: 0; font-size: 14px; }
.qf-kv.qf-key { background: #fff3c4; border-top-color: transparent; box-shadow: inset 3px 0 0 var(--qf-sun); }
.qf-pick { width: 100%; min-height: 44px; border: 2px solid var(--qf-ink); border-radius: 12px; background: #fff; font-weight: 700; box-shadow: 0 3px 0 rgba(43,35,64,.85); }
.qf .qf-pick.on { box-shadow: 0 3px 0 var(--qf-blue-d); background: var(--qf-blue); color: #fff !important; }
.qf-nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 0 4px; }
.qf-arrow { width: 52px; min-height: 44px; border: 2px solid var(--qf-ink); border-radius: 12px; background: #fff; font-size: 24px; line-height: 1; box-shadow: 0 3px 0 rgba(43,35,64,.85); }
.qf-dots { display: flex; align-items: center; gap: 6px; font-size: 13px; }
.qf-dots i { width: 10px; height: 10px; border-radius: 50%; border: 2px solid var(--qf-ink); background: #fff; }
.qf-dots i.on { background: var(--qf-blue); } .qf-dots i.picked { box-shadow: 0 0 0 2px var(--qf-sun); }
.qf-dots b { margin-left: 4px; }
.qf-stack { display: grid; gap: 8px; margin: 8px 0; }
.qf-stack .qf-card { padding: 8px 10px; box-shadow: none; }
.qf-stack .qf-kv:not(.qf-key) { display: none; }
.qf-stack .qf-card-h { font-size: 15px; margin: 0 0 2px; }
.qf-stack dl { margin: 0; }
/* seq */
.qf-slots { list-style: none; margin: 10px 0; padding: 0; display: grid; gap: 6px; }
.qf-slot { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 6px 10px; border: 2px dashed rgba(43,35,64,.35); border-radius: 12px; background: rgba(255,255,255,.6); text-align: left; box-sizing: border-box; }
.qf-slot.next { border-color: var(--qf-blue); background: #f3f8ff; }
.qf-slot.full { border: 2px solid var(--qf-ink); background: #fff; box-shadow: 0 3px 0 rgba(43,35,64,.85); }
.qf-slot.right { border: 2px solid var(--qf-mint); background: #eafaf2; }
.qf-slot.wrong { border: 2px solid var(--qf-red); background: #fff1f1; }
.qf-slot .qf-st-t { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.qf-slot .qf-x { color: var(--muted, #6f6787); }
.qf-n { flex: none; display: inline-grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; background: var(--qf-ink); color: #fff; font-weight: 800; font-size: 14px; }
.qf-shake { animation: qfShake .45s ease-in-out 2; }
@keyframes qfShake { 20% { transform: translateX(-6px); } 40% { transform: translateX(5px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
/* predict */
.qf-setup { padding: 8px 10px; background: #fff; border: 2px solid rgba(43,35,64,.25); border-left: 4px solid var(--qf-ink); border-radius: 0 10px 10px 0; margin: 0 0 10px; font-size: 14px; }
.qf-yp { font-size: 15px; margin: 8px 0; }
.qf-reveal { padding: 8px 10px; background: #fff7d6; border-radius: 10px; border: 2px solid var(--qf-sun); font-size: 14px; }
.qf-anim { position: relative; margin: 8px 0; padding: 10px 8px 8px; background: #fffdf6; border: 2px solid var(--qf-ink); border-radius: 12px; overflow: hidden; }
.qf-vis-lane { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
.qf-vis-box { height: 56px; display: grid; align-content: start; justify-items: center; padding-top: 4px; border: 2px solid var(--qf-ink); border-radius: 10px; background: #fff; font: 700 12px var(--f-head, system-ui); }
.qf-vis-m { position: absolute; top: 38px; left: calc(16.66% - 18px); width: 36px; height: 20px; display: grid; place-items: center; border-radius: 6px; border: 2px solid var(--qf-ink); background: var(--qf-sun); font: 700 10px var(--f-head, system-ui); font-style: normal; }
.qf-vis-m.m2 { opacity: 0; }
.qf-vis-busy { position: absolute; top: 64px; left: 33.33%; width: 33.33%; text-align: center; font-size: 10px; opacity: 0; }
.qf-vis-timer { margin-top: 8px; font-size: 11px; display: grid; gap: 2px; }
.qf-vis-timer b { display: block; height: 8px; border: 2px solid var(--qf-ink); border-radius: 6px; background: linear-gradient(90deg, var(--qf-red) 0 var(--p, 0%), #fff var(--p, 0%)); }
.qf-vis-cap { position: relative; min-height: 36px; margin-top: 6px; font-size: 13px; }
.qf-vis-cap span { position: absolute; inset: 0; opacity: 0; }
.qf-anim.play .m1 { animation: qfVisM1 5s ease-in-out forwards; }
.qf-anim.play .m2 { animation: qfVisM2 5s ease-in-out forwards; }
.qf-anim.play .qf-vis-busy { animation: qfVisBusy 5s linear forwards; }
.qf-anim.play .qf-vis-timer b { animation: qfVisT 5s linear forwards; }
.qf-anim.play .c1 { animation: qfCap1 5s linear forwards; } .qf-anim.play .c2 { animation: qfCap2 5s linear forwards; } .qf-anim.play .c3 { animation: qfCap3 5s linear forwards; }
@property --p { syntax: '<percentage>'; inherits: false; initial-value: 0%; }
@keyframes qfVisM1 { 0%, 10% { left: calc(16.66% - 18px); opacity: 1; } 25%, 100% { left: calc(50% - 18px); opacity: .55; } }
@keyframes qfVisM2 { 0%, 64% { left: calc(16.66% - 18px); opacity: 0; } 72% { left: calc(16.66% - 18px); opacity: 1; } 88%, 100% { left: calc(83.33% - 18px); opacity: 1; } }
@keyframes qfVisBusy { 0%, 25% { opacity: 0; } 30%, 100% { opacity: 1; } }
@keyframes qfVisT { 0%, 25% { --p: 0%; } 64%, 100% { --p: 100%; } }
@keyframes qfCap1 { 0%, 4% { opacity: 0; } 8%, 40% { opacity: 1; } 44%, 100% { opacity: 0; } }
@keyframes qfCap2 { 0%, 44% { opacity: 0; } 48%, 66% { opacity: 1; } 70%, 100% { opacity: 0; } }
@keyframes qfCap3 { 0%, 70% { opacity: 0; } 74%, 100% { opacity: 1; } }
.qf-anim.still .m1 { left: calc(50% - 18px); opacity: .55; }
.qf-anim.still .m2 { left: calc(83.33% - 18px); opacity: 1; }
.qf-anim.still .qf-vis-busy { opacity: 1; }
.qf-anim.still .qf-vis-timer b { --p: 100%; }
.qf-anim.still .c3 { opacity: 1; }
/* spot */
.qf-code { max-width: 100%; overflow-x: auto; margin: 10px 0; background: #1f1a2e; border: 2px solid var(--qf-ink); border-radius: 12px; -webkit-overflow-scrolling: touch; }
.qf-code-in { display: grid; width: max-content; min-width: 100%; padding: 4px 0; }
.qf-line { display: flex; align-items: center; gap: 10px; min-height: 34px; padding: 0 12px 0 0; margin: 0; border: 0; border-left: 4px solid transparent; background: transparent; color: #f3eefc !important; text-align: left; box-sizing: border-box; width: 100%; }
button.qf-line:hover { background: rgba(255,255,255,.08); }
.qf-line .qf-ln { flex: none; width: 2.6em; text-align: right; font: 700 15px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #9b91b8; }
.qf-line code { font: 14px/1.35 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; white-space: pre; color: inherit; background: none; padding: 0; }
.qf .qf-line.on { box-shadow: none; background: rgba(59,139,255,.35); border-left-color: var(--qf-blue); }
.qf-line.bad { background: rgba(255,90,90,.35); border-left-color: var(--qf-red); }
.qf-line.picked { background: rgba(255,201,60,.25); border-left-color: var(--qf-sun); }
.qf-line.fix { background: rgba(47,191,127,.3); border-left-color: var(--qf-mint); }
.qf-line.fix .qf-ln { color: #9ff0c8; font-size: 12px; }
.qf-line .qf-flag { margin-left: auto; padding-left: 10px; font-size: 12px; font-weight: 800; color: #ffd0d0; white-space: nowrap; }
/* recall */
.qf-typed { display: flex; gap: 8px; margin: 8px 0; }
.qf-typed input { flex: 1 1 auto; min-width: 0; min-height: 44px; box-sizing: border-box; padding: 8px 12px; border: 3px solid var(--qf-ink); border-radius: 12px; font: 600 16px var(--f-head, system-ui); background: #fff; color: var(--qf-ink); }
.qf-typed button { min-height: 44px; }
.qf-ans { list-style: none; margin: 8px 0; padding: 0; display: grid; gap: 6px; }
.qf-ans li { display: flex; gap: 8px; padding: 6px 10px; border-radius: 10px; border: 2px solid rgba(43,35,64,.15); font-size: 14px; }
.qf-ans li.hit { border-color: var(--qf-mint); background: #eafaf2; }
.qf-ans li.hit .qf-m { color: #1f8a5b; }
.qf-ans li.miss { opacity: .55; background: #f1eef5; }
/* faded */
.qf-steps { list-style: none; margin: 10px 0; padding: 0; display: grid; gap: 8px; }
.qf-st { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border: 2px solid rgba(43,35,64,.2); border-radius: 12px; background: #fff; }
.qf-st > div { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.qf-st.blank { border: 2px dashed var(--qf-blue); background: #f3f8ff; }
.qf-st.blank .qf-chips { margin: 6px 0 0; }
.qf-st.right { border-color: var(--qf-mint); background: #eafaf2; }
.qf-st.wrong { border-color: var(--qf-red); background: #fff1f1; }
.qf-st .qf-gap { font-weight: 700; color: var(--qf-blue-d); }
.qf-why { margin: 2px 0 0 !important; font-size: 13px; color: var(--muted, #6f6787); }
@media (max-width: 520px) {
  .qf-code { overflow-x: visible; }
  .qf-code-in { width: auto; }
  .qf-line { align-items: flex-start; padding-top: 10px; padding-bottom: 8px; }
  .qf-line code { white-space: pre-wrap; overflow-wrap: anywhere; min-width: 0; flex: 1; padding-left: 1.2em; text-indent: -1.2em; }
  .qf .qf-chip { flex: 1 1 100%; }
  .qf .qf-bank .qf-chip, .qf .qf-entries .qf-chip { flex: 0 1 auto; }
  .qf-line { min-height: 44px; }
  .qf-line .qf-ln { font-size: 16px; }
  .qf-slot { min-height: 52px; }
}
@media (prefers-reduced-motion: reduce) {
  .qf-shake { animation: none; }
  .qf-anim.play * { animation: none !important; }
}
`;
})();
