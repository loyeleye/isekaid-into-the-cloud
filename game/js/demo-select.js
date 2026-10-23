// The combined demo's Debug menu (Chapters 1 to 6 in one page): for testing and reviewing, like the prequel's
// debug start (js/debug.js). Inert unless the page sets window.SD_DEMO (or the URL has ?demo). The demo page also sets
// window.SD_CH2, so chapter 2's explorable world is the one chapter 1's end card hands over to.
// The title screen gets Continue (the latest chapter with a save) and New game; a 🐞 Debug button, bottom left on every
// screen, opens the chapter select and the cutscenes to watch on their own. Starting a
// chapter there begins a fresh save at that chapter, with the level, deck and cheat sheet its own standalone demo
// assumes (each chapter's newGame); from then on the chapters hand over to each other through SD.chapterStart.
(function () {
  const on = !!window.SD_DEMO || /[?&]demo\b/.test(location.search);
  if (!on || !window.SD_VECTOR) return;
  const U = SD.ui, S = SD.state, $ = U.$, esc = s => U.esc(s);
  const T = () => SD.ch1story;

  // In story order. key: the chapter's save field; go: a fresh start; resume: carry on from its save.
  const CHAPTERS = [
    { n: '1', name: 'The Temple of Uptime', sub: 'The mountain trek and the Deny Mines', key: 'c1',
      go: () => SD.ch1 && SD.ch1.newGame(), resume: () => SD.ch1 && SD.ch1.resume() },
    { n: '2', name: 'The Mailroom', sub: 'The edge of the Cloud, Thornwick and the Sorting Floors', key: 'c2',
      go: () => SD.c2world && SD.c2world.newGame(), resume: () => SD.c2world && SD.c2world.resume() },
    { n: '2b', name: 'The Dead Letter Office', sub: 'Chapter 2, part 2: floors 7 to 20', key: 'c2x',
      go: () => SD.c2xworld && SD.c2xworld.newGame() },
    { n: '3', name: 'The Granaries', sub: 'Halcyon, the Cold Stores and the Abyss', key: 'c3',
      go: () => SD.c3world && SD.c3world.newGame(), resume: () => SD.c3world && SD.c3world.resume() },
    { n: '4', name: 'The Sealed Floors', sub: 'The Gate Passes and Burning Peak', key: 'c4',
      go: () => SD.c4world && SD.c4world.newGame() },
    { n: '5', name: 'The Machine Floors', sub: 'The Arcanum and the Astronomy Tower', key: 'c5',
      go: () => SD.c5world && SD.c5world.newGame() },
    { n: '6', name: 'The Mirror Floors', sub: 'Twinwater and the Keeper\'s Room', key: 'c6',
      go: () => SD.c6world && SD.c6world.newGame() }
  ];
  // A chapter is in this build when its start is registered (chapter 1's is always there in vector mode).
  const loaded = c => !!(SD.chapterStart && SD.chapterStart[c.n]);
  const saved = c => { const v = S.save[c.key]; return !!(v && (c.key === 'c1' ? v.lead : true)); };
  const done = c => { const v = S.save[c.key]; return !!(v && v.f && v.f.done); };
  const resume = c => (c.resume ? c.resume() : SD.chapterStart[c.n]());
  const latest = () => CHAPTERS.slice().reverse().find(c => loaded(c) && saved(c));
  const label = c => 'Chapter ' + (c.n === '2b' ? '2, part 2' : c.n) + ': ' + c.name;

  // A fresh save, then that chapter's own new game.
  function fresh(c) {
    SD.main.haltWorlds();
    S.reset();
    U.closePanel();
    c.go();
  }

  // The 🐞 Debug menu (bottom left, as in the prequel's js/debug.js): jump to any chapter, or watch a cutscene.
  function select() {
    const rows = CHAPTERS.filter(loaded).map(c => `<div class="ds-row">
        <div class="ds-txt"><b>${esc(label(c))}</b>${done(c) ? ' <span class="ds-done">✓ cleared</span>' : ''}<br><span class="muted small">${esc(c.sub)}</span></div>
        <div class="ds-btns">${saved(c) ? `<button class="ghost" type="button" data-go="${c.n}" data-how="resume">Continue</button>` : ''}<button class="primary" type="button" data-go="${c.n}" data-how="fresh">Start</button></div>
      </div>`).join('');
    const n = SD.reel ? SD.reel.list.length : 0;
    const b = U.panel(`<p class="muted small">Testing and reviewing only.</p>
      <h3 class="ds-h">Chapter select</h3>
      <p class="small"><b>Start</b> begins a fresh save at that chapter, with the level and deck its demo assumes, and replaces the save in this browser. From there each chapter's end card carries on into the next.</p>
      <div class="ds-list">${rows}</div>
      ${n ? `<h3 class="ds-h">Cutscenes</h3><div class="ds-list"><div class="ds-row">
        <div class="ds-txt"><b>Cutscene viewer</b><br><span class="muted small">All ${n} cutscenes, by chapter, as any lead. Your save isn't touched.</span></div>
        <div class="ds-btns"><button class="primary" type="button" id="ds-reel">Open</button></div>
      </div></div>` : ''}`, { title: 'DEBUG' });
    const open = b.querySelector('#ds-reel');
    if (open) open.onclick = () => viewer();
    b.querySelectorAll('[data-go]').forEach(el => {
      el.onclick = () => {
        const c = CHAPTERS.find(x => x.n === el.dataset.go);
        if (el.dataset.how === 'resume') { U.closePanel(); SD.main.haltWorlds(); return resume(c); }
        if (!latest()) return fresh(c);
        const k = U.panel(`<p>Start ${esc(label(c))} with a fresh save? The save in this browser is replaced.</p><div class="row"><button class="primary" id="ds-y">Start</button><button class="ghost" id="ds-n">Cancel</button></div>`, { title: 'START CHAPTER' });
        k.querySelector('#ds-y').onclick = () => fresh(c);
        k.querySelector('#ds-n').onclick = select;
      };
    });
  }
  // The reveal's versions to compare (js/cut-reveal.js): how the pixel virus becomes the real one, and the glitch tiles.
  function revealOpts() {
    const o = SD.cutReveal.opts;
    const now = SD.audio.freyaTheme && SD.audio.freyaTheme();
    const theme = (v, label) => `<button class="${now === v ? 'primary' : 'ghost'}" type="button" data-theme="${v}" aria-pressed="${now === v}">${label}</button>`;
    const btn = (k, v, label) => `<button class="${o[k] === v ? 'primary' : 'ghost'}" type="button" data-opt="${k}" data-val='${JSON.stringify(v)}' aria-pressed="${o[k] === v}">${label}</button>`;
    return `<div class="ds-row ds-watch">
        <div class="ds-txt"><b>Pixel to real</b><br><span class="muted small">The last cut, from the pixel virus to the real one.</span></div>
        <div class="ds-btns">${btn('morph', 'head', 'Sharpen from her head')}${btn('morph', 'mosaic', 'Sharpen all at once')}${btn('morph', 'fade', 'Fade from her head')}</div>
      </div>
      <div class="ds-row ds-watch">
        <div class="ds-txt"><b>Green glitch tiles</b><br><span class="muted small">The game breaking up over the glitches.</span></div>
        <div class="ds-btns">${btn('tiles', true, 'On')}${btn('tiles', false, 'Off')}</div>
      </div>
      <div class="ds-row ds-watch">
        <div class="ds-txt"><b>Freya's theme</b><br><span class="muted small">Her Chapter 1 music, which the reveal warps.</span></div>
        <div class="ds-btns">${theme('waltz', 'Music-box waltz')}${theme('tune', 'Carefree tune')}</div>
      </div>`;
  }
  function badge() {
    if ($('#ds-dbg')) return;
    const b = document.createElement('button');
    b.id = 'ds-dbg'; b.type = 'button'; b.textContent = '🐞 Debug';
    // Let go of focus, so Space and Enter go on to the scene and don't reopen the menu.
    b.onclick = () => { b.blur(); select(); };
    document.body.appendChild(b);
  }
  // New game: chapter 1 from the opening, asking first if it would replace a save.
  function newGame() {
    const c1 = CHAPTERS[0];
    if (!latest()) return fresh(c1);
    const k = U.panel('<p>Start a new game from the opening? The save in this browser is replaced.</p><div class="row"><button class="primary" id="ds-y">New game</button><button class="ghost" id="ds-n">Cancel</button></div>', { title: 'NEW GAME' });
    k.querySelector('#ds-y').onclick = () => fresh(c1);
    k.querySelector('#ds-n').onclick = U.closePanel;
  }

  // ---------- The cutscene viewer ----------
  // Every cutscene in SD.reel (js/reel.js), grouped by chapter in story order: pick who you're playing as, search by
  // title or line, and Play. A scene plays on a borrowed copy of the save that's thrown away after, so nothing it sets
  // sticks; then you're back here, where you were. New cutscenes show up on their own once a chapter names them.
  const LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
  const VKEY = 'sd-reel-view';
  const view = Object.assign({ lead: null, open: null, q: '', last: null }, (() => { try { return JSON.parse(localStorage.getItem(VKEY)) || {}; } catch (e) { return {}; } })());
  const keep = () => { try { localStorage.setItem(VKEY, JSON.stringify({ lead: view.lead, open: view.open })); } catch (e) { /* kept for this visit only */ } };
  const first = id => (T() && T().leads[id] ? T().leads[id].name.split(' ')[0] : id);
  const chLabel = ch => { const c = CHAPTERS.find(x => x.n === ch); return c ? label(c) : 'Chapter ' + ch; };
  const chOrder = ch => { const i = CHAPTERS.findIndex(x => x.n === ch); return i < 0 ? 99 : i; };

  // Runs fn on a copy of the save with lead as the lead (and a stand-in chapter 1 save where there's none), then puts
  // the real one back. Nothing is written to this browser in between.
  function borrow(lead, fn) {
    const snap = JSON.stringify(S.save), persist = S.persist;
    S.persist = () => {};
    S.save.c1 = Object.assign({ f: {}, deck: [] }, S.save.c1 || {}, { lead });
    const back = () => { S.save = JSON.parse(snap); S.persist = persist; };
    let out;
    try { out = fn(); } catch (e) { back(); throw e; }
    if (out && out.then) return out.finally(back);
    back();
    return out;
  }
  // What the viewer knows about a scene: whether it changes with the lead, and its words (for the search).
  function facts(e) {
    const built = {};
    LEADS.forEach(l => { try { built[l] = e.run ? null : JSON.stringify(borrow(l, () => SD.reel.steps(e, e.alts ? e.alts[0][1] : undefined))); } catch (x) { built[l] = null; } });
    const words = (built[view.lead] || '').replace(/\\'/g, '\'');
    return { perLead: !!e.leads || new Set(Object.values(built)).size > 1, words: (e.title + ' ' + (e.note || '') + ' ' + words).toLowerCase() };
  }

  function viewer() {
    if (!view.lead || !LEADS.includes(view.lead)) view.lead = (S.save.c1 && S.save.c1.lead) || 'mira';
    const all = SD.reel.list.map((e, i) => ({ e, i })).sort((a, b) => chOrder(a.e.ch) - chOrder(b.e.ch) || a.i - b.i).map(x => x.e);
    const info = new Map(all.map(e => [e, facts(e)]));
    const chapters = [...new Set(all.map(e => e.ch))];
    if (!view.open) view.open = [chapters[0]];
    const b = U.panel(`<div class="rv-top">
        <button class="ghost" type="button" id="rv-back">‹ Debug</button>
        <span class="muted small" id="rv-count" aria-live="polite"></span>
      </div>
      <fieldset class="rv-leads"><legend class="small"><b>Watch as</b> <span class="muted">(for scenes marked “per lead”)</span></legend>
        ${LEADS.map(l => `<button type="button" class="${l === view.lead ? 'primary' : 'ghost'}" data-lead="${l}" aria-pressed="${l === view.lead}">${esc(first(l))}</button>`).join('')}
      </fieldset>
      <label class="rv-search"><span class="sr">Search cutscenes</span><input type="search" id="rv-q" placeholder="Search titles and lines" autocomplete="off" value="${esc(view.q)}"></label>
      <div id="rv-list">${chapters.map(ch => {
        const list = all.filter(e => e.ch === ch);
        return `<details class="rv-ch" data-ch="${esc(ch)}"${view.open.includes(ch) ? ' open' : ''}>
          <summary><b>${esc(chLabel(ch))}</b> <span class="rv-n muted small"></span></summary>
          ${list.map((e, k) => `<div class="ds-row rv-row${e.alts ? ' rv-alts' : ''}${view.last === e.key ? ' rv-last' : ''}" data-key="${esc(e.key)}">
            <div class="ds-txt"><span class="rv-no muted small">${k + 1}</span><b>${esc(e.title)}</b>${info.get(e).perLead ? ' <span class="rv-tag">per lead</span>' : ''}${view.last === e.key ? ' <span class="ds-done">✓ just watched</span>' : ''}
              ${e.note ? `<br><span class="muted small">${esc(e.note)}</span>` : ''}</div>
            <div class="ds-btns">${(e.alts || [[null, undefined]]).map(([l, a], j) => `<button class="ghost" type="button" data-play="${esc(e.key)}" data-alt="${j}" aria-label="Play ${esc(e.title)}${l ? ', ' + esc(l) : ''}">▶ ${l ? esc(l) : 'Play'}</button>`).join('')}</div>
          </div>${e.key === '1/reveal' && SD.cutReveal ? `<details class="rv-opts"><summary class="small">The reveal's versions</summary>${revealOpts()}</details>` : ''}`).join('')}
        </details>`;
      }).join('')}<p class="muted small" id="rv-none" hidden>No cutscenes match.</p></div>`, { title: 'CUTSCENES', cls: 'wide' });

    // Search: titles, notes and the lines themselves (as the lead picked above). Matching chapters open.
    const filter = () => {
      const q = view.q.trim().toLowerCase();
      let shown = 0;
      b.querySelectorAll('.rv-ch').forEach(d => {
        let n = 0;
        d.querySelectorAll('.rv-row').forEach(r => { const hit = !q || info.get(SD.reel.get(r.dataset.key)).words.includes(q); r.hidden = !hit; n += hit; });
        d.hidden = !n;
        d.querySelector('.rv-n').textContent = q ? n + ' of ' + d.querySelectorAll('.rv-row').length : String(n);
        if (q && n) d.open = true;
        shown += n;
      });
      b.querySelector('#rv-none').hidden = !!shown;
      b.querySelector('#rv-count').textContent = q ? shown + ' of ' + all.length + ' cutscenes' : all.length + ' cutscenes';
    };
    const qIn = b.querySelector('#rv-q');
    qIn.oninput = () => { view.q = qIn.value; filter(); };
    filter();
    b.querySelectorAll('.rv-ch').forEach(d => d.addEventListener('toggle', () => {
      if (view.q.trim()) return;
      view.open = view.open.filter(c => c !== d.dataset.ch).concat(d.open ? [d.dataset.ch] : []);
      keep();
    }));
    b.querySelector('#rv-back').onclick = select;
    b.querySelectorAll('[data-lead]').forEach(el => { el.onclick = () => { view.lead = el.dataset.lead; keep(); viewer(); }; });
    b.querySelectorAll('[data-play]').forEach(el => {
      el.onclick = () => { const e = SD.reel.get(el.dataset.play); watch(e, e.alts ? e.alts[+el.dataset.alt][1] : undefined); };
    });
    b.querySelectorAll('[data-theme]').forEach(el => { el.onclick = () => { SD.audio.freyaTheme(el.dataset.theme); viewer(); }; });
    b.querySelectorAll('[data-opt]').forEach(el => { el.onclick = () => { SD.cutReveal.setOpt(el.dataset.opt, JSON.parse(el.dataset.val)); viewer(); }; });
    const last = view.last && b.querySelector(`.rv-row[data-key="${CSS.escape(view.last)}"]`);
    if (last && !last.hidden) { const d = last.closest('details'); d.open = true; last.scrollIntoView({ block: 'center' }); }
    else if (!view.q) qIn.blur();
  }

  // Plays one scene over a black cover (so the title doesn't show between its parts), then comes back to the viewer.
  async function watch(e, arg) {
    U.closePanel();
    SD.main.haltWorlds();
    const cover = document.createElement('div');
    cover.id = 'ds-cover';
    document.body.appendChild(cover);
    SD.demo.watching = true;
    view.last = e.key;
    try {
      await borrow(view.lead, () => SD.reel.play(e.key, arg));
    } catch (x) {
      console.error('[reel] ' + e.key + ': ' + (x && x.message));
    } finally {
      cover.remove(); SD.demo.watching = false;
      SD.audio.weather(null);
      SD.main.title();
      viewer();
    }
  }

  const css = document.createElement('style');
  css.textContent = `.ds-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .ds-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid rgba(0,0,0,.12); }
    .ds-txt { min-width: 0; }
    .ds-btns { display: flex; gap: 6px; flex-shrink: 0; }
    #panel .ds-btns button { min-height: 44px; }
    .ds-watch { flex-wrap: wrap; }
    .ds-watch .ds-btns { flex-wrap: wrap; }
    .ds-h { margin: 14px 0 0; font-size: 15px; }
    #ds-dbg { position: fixed; bottom: 6px; left: 6px; z-index: 9999; min-height: 44px; padding: 4px 12px; font: 600 13px Fredoka, sans-serif;
      border-radius: 12px; border: 2px solid #2b2340; background: #ffe14d; color: #2b2340; cursor: pointer; opacity: .9; }
    #ds-cover { position: fixed; inset: 0; z-index: 30; background: #000; }
    .ds-done { color: #2c7a3a; font-size: 12px; font-weight: 700; }
    .rv-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    #panel .rv-top button { min-height: 44px; }
    .rv-leads { border: 0; margin: 10px 0 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .rv-leads legend { padding: 0; margin-bottom: 6px; }
    #panel .rv-leads button { min-height: 44px; flex: 1 1 0; min-width: 0; padding: 4px 6px; font-size: 14px; white-space: nowrap; }
    .rv-search { display: block; margin: 10px 0 4px; }
    .rv-search input { width: 100%; box-sizing: border-box; min-height: 44px; padding: 8px 12px; font: 16px Nunito, sans-serif; border: 2px solid #2b2340; border-radius: 10px; background: #fff; color: #2b2340; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .rv-ch { border-top: 2px solid rgba(0,0,0,.15); padding: 4px 0; }
    .rv-ch > summary, .rv-opts > summary { cursor: pointer; min-height: 44px; display: flex; align-items: center; gap: 8px; list-style: none; }
    .rv-ch > summary { font-size: 15px; }
    .rv-ch > summary::-webkit-details-marker, .rv-opts > summary::-webkit-details-marker { display: none; }
    .rv-ch > summary::before, .rv-opts > summary::before { content: '▸'; display: inline-block; width: 1em; transition: transform .15s; }
    .rv-ch[open] > summary::before, .rv-opts[open] > summary::before { transform: rotate(90deg); }
    .rv-row .ds-btns { flex-wrap: wrap; justify-content: flex-end; max-width: 55%; }
    .rv-no { display: inline-block; min-width: 1.6em; }
    .rv-tag { font-size: 11px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: #e7e0f7; color: #4a3a7a; white-space: nowrap; }
    .rv-last { background: rgba(255, 225, 77, .25); border-radius: 8px; }
    .rv-opts { margin: 0 0 6px 1.6em; }
    @media (max-width: 480px) { .rv-alts { flex-wrap: wrap; } .rv-alts .ds-btns { max-width: none; width: 100%; justify-content: flex-start; } }`;
  document.head.appendChild(css);

  // Outermost of the title patches: each chapter's own patch runs inside it (their scripts load first), and this
  // replaces the buttons they leave, keeping How to play. The press-start screen (which unlocks sound) is left alone.
  const boot = () => {
    const M = SD.main, title = M.title;
    M.title = function () {
      title();
      const box = $('#title-actions');
      if (!box || box.querySelector('#t-start')) return;
      const c = latest(), help = box.querySelector('#t-help');
      box.innerHTML = (c ? `<button class="primary" id="ds-go">Continue · ${esc(label(c))}${S.save.c1 && S.save.c1.lead && T() ? ' · ' + esc(T().leads[S.save.c1.lead].name.split(' ')[0]) : ''}</button>` : '')
        + `<button class="${c ? 'ghost' : 'primary'}" id="ds-new">New game</button>`;
      if (help) box.appendChild(help);
      if (c) $('#ds-go').onclick = () => resume(c);
      $('#ds-new').onclick = newGame;
      badge();
      const foot = $('.t-foot');
      if (foot) foot.textContent = 'Demo: Chapters 1 to 6 · Built on the AWS documentation · Saves automatically';
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  else { boot(); SD.main.title(); }

  SD.demo = { chapters: CHAPTERS, select, viewer, watching: false, fresh: n => fresh(CHAPTERS.find(c => c.n === n)) };
})();
