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
    const cuts = SD.cutReveal && T() ? `<div class="ds-row ds-watch">
        <div class="ds-txt"><b>Chapter 1: the reveal</b><br><span class="muted small">As each lead sees it. Your save isn't touched.</span></div>
        <div class="ds-btns">${T().order.map(id => `<button class="ghost" type="button" data-watch="${id}">${esc(T().leads[id].name.split(' ')[0])}</button>`).join('')}</div>
      </div>` : '';
    const b = U.panel(`<p class="muted small">Testing and reviewing only.</p>
      <h3 class="ds-h">Chapter select</h3>
      <p class="small"><b>Start</b> begins a fresh save at that chapter, with the level and deck its demo assumes, and replaces the save in this browser. From there each chapter's end card carries on into the next.</p>
      <div class="ds-list">${rows}</div>
      ${cuts ? `<h3 class="ds-h">Cutscenes</h3><div class="ds-list">${cuts}</div>` : ''}`, { title: 'DEBUG' });
    b.querySelectorAll('[data-watch]').forEach(el => { el.onclick = () => watchReveal(el.dataset.watch); });
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

  // The Chapter 1 reveal (js/cut-reveal.js) without playing up to it, with the system messages it has in the story
  // (js/ch1-world.js). The lead is lent to the save for the length of the scene, then the save is put back as it was
  // and you're back at the title (Continue picks up where you were).
  async function watchReveal(lead) {
    U.closePanel();
    SD.main.haltWorlds();
    const sv = S.save, old = sv.c1, wait = ms => new Promise(r => setTimeout(r, ms));
    // Black behind the scene (above the title, below the VN and the system messages), so the title doesn't show
    // through in the pause between the cutscene's two halves.
    const cover = document.createElement('div');
    cover.id = 'ds-cover';
    document.body.appendChild(cover);
    SD.demo.watching = true;
    sv.c1 = Object.assign({ f: {} }, old || {}, { lead });
    try {
      SD.audio.music('kyusad');
      await SD.cutReveal.ending();
      U.system('[SYSTEM] ADMIN CHANGED', 'Root user: Freya.', 'red');
      await wait(900);
      U.system('[SYSTEM] BACKUPS DELETED', 'Every backup in the Cloud, from every Region. Retention: none.', 'red');
      await wait(1200);
      await SD.cutReveal.wipe();
    } finally {
      sv.c1 = old; S.persist();
      cover.remove(); SD.demo.watching = false;
      SD.main.title();
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
    .ds-done { color: #2c7a3a; font-size: 12px; font-weight: 700; }`;
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

  SD.demo = { chapters: CHAPTERS, select, watching: false, fresh: n => fresh(CHAPTERS.find(c => c.n === n)) };
})();
