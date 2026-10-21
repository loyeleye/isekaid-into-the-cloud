// Chapter select for the combined demo (Chapters 1 to 6 in one page): for testing and reviewing, like the prequel's
// debug start (js/debug.js). Inert unless the page sets window.SD_DEMO (or the URL has ?demo). The demo page also sets
// window.SD_CH2, so chapter 2's explorable world is the one chapter 1's end card hands over to.
// The title screen gets a Continue button (the latest chapter with a save) and a Chapter select panel. Starting a
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

  function select() {
    const rows = CHAPTERS.filter(loaded).map(c => `<div class="ds-row">
        <div class="ds-txt"><b>${esc(label(c))}</b>${done(c) ? ' <span class="ds-done">✓ cleared</span>' : ''}<br><span class="muted small">${esc(c.sub)}</span></div>
        <div class="ds-btns">${saved(c) ? `<button class="ghost" type="button" data-go="${c.n}" data-how="resume">Continue</button>` : ''}<button class="primary" type="button" data-go="${c.n}" data-how="fresh">Start</button></div>
      </div>`).join('');
    const b = U.panel(`<p class="small">Pick a chapter to test. <b>Start</b> begins a fresh save at that chapter, with the level and deck its demo assumes, and replaces the save in this browser. From there each chapter's end card carries on into the next.</p>
      <div class="ds-list">${rows}</div>`, { title: 'CHAPTER SELECT' });
    b.querySelectorAll('[data-go]').forEach(el => {
      el.onclick = () => {
        const c = CHAPTERS.find(x => x.n === el.dataset.go);
        if (el.dataset.how === 'resume') { U.closePanel(); return resume(c); }
        if (!latest()) return fresh(c);
        const k = U.panel(`<p>Start ${esc(label(c))} with a fresh save? The save in this browser is replaced.</p><div class="row"><button class="primary" id="ds-y">Start</button><button class="ghost" id="ds-n">Cancel</button></div>`, { title: 'START FRESH' });
        k.querySelector('#ds-y').onclick = () => fresh(c);
        k.querySelector('#ds-n').onclick = select;
      };
    });
  }

  const css = document.createElement('style');
  css.textContent = `.ds-list { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
    .ds-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid rgba(0,0,0,.12); }
    .ds-txt { min-width: 0; }
    .ds-btns { display: flex; gap: 6px; flex-shrink: 0; }
    #panel .ds-btns button { min-height: 44px; }
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
        + `<button class="${c ? 'ghost' : 'primary'}" id="ds-pick">Chapter select</button>`;
      if (help) box.appendChild(help);
      if (c) $('#ds-go').onclick = () => resume(c);
      $('#ds-pick').onclick = select;
      const foot = $('.t-foot');
      if (foot) foot.textContent = 'Demo: Chapters 1 to 6 · Built on the AWS documentation · Saves automatically';
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); SD.main.title(); }, 0), { once: true });
  else { boot(); SD.main.title(); }

  SD.demo = { chapters: CHAPTERS, select, fresh: n => fresh(CHAPTERS.find(c => c.n === n)) };
})();
