// Full-screen mode stage (Ladi, Nov 16: "make the minigame take up the full screen", with a Roblox builder screenshot
// as the reference). Starting any game mode (SD.modes.register's start, from the title's carousel or the ☰ picker)
// leaves the title for the mode's own setting:
//   - The backdrop is the mode's own place: a painted plate when the mode has one (PLATES below: Sogni stills,
//     assets/img/stage/<id>-wide.webp for landscape and <id>-tall.webp for portrait), else its carousel card loop
//     (assets/video/cards/<id>.mp4, the .webp still under reduced motion or Save-Data), under a dark wash.
//   - Its own music: a mode with no music of its own (MUSIC below: Mureka loops) gets its loop while the stage is up,
//     and what played before comes back on Home. A mode that plays its own music still wins. Win and lose stings:
//     SD.modeStage.sting(id, 'win' | 'lose') plays the mode's sting from STINGS, or nothing.
//   - A top bar: ‹ Home on the left, the mode's name in the middle (with the window's own title under it), sound on
//     the right. Home does what the window's own way out does, in this order: Stop for now (saves, as js/modes.js
//     has it), the mode's own stop button (#<x>-stop, #sp-later), ✕ Leave, ✕ Close. A step with no way out says so.
//   - The mode's windows (U.panel) expand into the stage: full height under the bar, a centred column on wide screens
//     with the setting showing either side, a sheet over the bottom on a phone. Their ✕ moves to Home.
//   - The window is dark glass over the scene, not the beige box (Ladi, Nov 16: "remove the ugly text box"): the
//     palette's variables are swapped inside it, so the modes' own CSS follows. A box a mode paints light itself
//     (a hard-coded pale background, now with pale text on it) gets .ms-lt, which puts the old palette back inside it, so its text stays dark.
//   - The stage ends when the mode's last window closes (none opens again within LINGER ms), or another screen shows.
// This file only wraps: no mode file changes. It loads after js/title-games.js.
// API: SD.modeStage.enter(def), .leave(), .active() the running mode's id or null.
(function () {
  const ST = SD.modeStage = {};
  const U = SD.ui, AU = SD.audio, $ = s => document.querySelector(s);
  const esc = s => U.esc(String(s == null ? '' : s));
  const LOOPS = ['duel', 'draft', 'pop', 'hunt', 'ic', 'sprint'];
  const LINGER = 450;
  // Painted plates, one id per mode once both its plates are in assets/img/stage/ (prompts: project files mode-stage/).
  const PLATES = [];
  // Mode id: the song file in assets/audio/ (no extension), for modes without their own music. Duel and Sprint have theirs.
  const MUSIC = {};
  // Mode id: { win, lose } jingle files in assets/audio/.
  const STINGS = {};
  const still = () => (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) || !!(navigator.connection && navigator.connection.saveData);
  let cur = null, el = null, bar = null, timer = null;

  function make() {
    if (el) return;
    el = document.createElement('div');
    el.id = 'mode-stage'; el.hidden = true; el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<div class="ms-bg"></div><div class="ms-wash"></div>';
    bar = document.createElement('header');
    bar.id = 'mode-bar'; bar.hidden = true;
    bar.innerHTML = `<button type="button" class="ms-home" id="ms-home"><span aria-hidden="true">‹</span> Home</button>
      <div class="ms-title"><b id="ms-name"></b><span id="ms-sub"></span></div>
      <button type="button" class="ms-snd" id="ms-snd" aria-label="Sound on or off"></button>`;
    document.body.append(el, bar);
    bar.querySelector('#ms-home').onclick = home;
    bar.querySelector('#ms-snd').onclick = e => { AU.toggleAll(); e.currentTarget.textContent = snd(); };
    new MutationObserver(watch).observe($('#panel'), { attributes: true, attributeFilter: ['hidden'], childList: true });
    new MutationObserver(() => { if (cur) adaptSoon(); }).observe($('#panel'), { childList: true, subtree: true });
  }
  const snd = () => (AU && AU.muted && AU.muted() ? '🔇' : '🔊');

  ST.active = () => (cur ? cur.id : null);
  ST.enter = function (def) {
    make();
    clearTimeout(timer);
    if (cur && cur.id === def.id) return;
    cur = def;
    const bg = el.querySelector('.ms-bg'), id = def.id;
    if (PLATES.includes(id)) {
      bg.style.backgroundImage = ''; bg.innerHTML = `<picture><source media="(orientation: portrait)" srcset="assets/img/stage/${id}-tall.webp">
        <img src="assets/img/stage/${id}-wide.webp" alt="" draggable="false"></picture>`;
    } else if (LOOPS.includes(id)) {
      const v = `assets/video/cards/${id}`;
      bg.style.backgroundImage = `url(${v}.webp)`;
      bg.innerHTML = still() ? '' : `<video muted loop playsinline autoplay preload="auto" poster="${v}.webp" src="${v}.mp4" disablepictureinpicture></video>`;
      const vid = bg.querySelector('video');
      if (vid) { const p = vid.play(); if (p && p.catch) p.catch(() => { /* autoplay refused: the still stays */ }); }
    } else { bg.style.backgroundImage = ''; bg.innerHTML = ''; }
    tune(id);
    bar.querySelector('#ms-name').textContent = def.name || '';
    bar.querySelector('#ms-snd').textContent = snd();
    el.hidden = bar.hidden = false;
    document.body.classList.add('in-mode');
    document.body.dataset.stage = id;
    // Title loops keep playing underneath otherwise.
    document.querySelectorAll('#title-actions .tg-vid').forEach(v => { if (!v.paused) v.pause(); });
    sub(); adaptSoon();
  };
  ST.leave = function () {
    clearTimeout(timer);
    if (!cur) return;
    cur = null;
    untune();
    const v = el.querySelector('video'); if (v) v.pause();
    el.querySelector('.ms-bg').innerHTML = '';
    el.hidden = bar.hidden = true;
    document.body.classList.remove('in-mode');
    delete document.body.dataset.stage;
    // Back on the title: let the carousel play its centred card again.
    document.dispatchEvent(new Event('visibilitychange'));
  };

  // The stage's loop, and what to bring back after. Only while that loop is still the one playing.
  let before = null, mine = null;
  function tune(id) {
    if (!AU || !AU.music || !MUSIC[id]) return;
    mine = 'stage-' + id;
    AU.add({ songs: { [mine]: MUSIC[id] } });
    before = AU.loopName || null;
    AU.music(mine);
  }
  function untune() {
    if (!mine) return;
    if (AU.loopName === mine) { if (before) AU.music(before); else AU.stop(); }
    mine = before = null;
  }
  ST.sting = function (id, kind) {
    const f = STINGS[id] && STINGS[id][kind];
    if (!f || !AU || !AU.jingle) return false;
    const name = `stage-${id}-${kind}`;
    AU.add({ jingles: { [name]: f } });
    AU.jingle(name);
    return true;
  };

  // The window's own title under the mode's name ("How to play", "Results"), unless it just repeats the name.
  function sub() {
    const s = bar && bar.querySelector('#ms-sub'), h = $('#panel:not([hidden]) .win-h > span');
    if (!s) return;
    const t = h ? h.textContent.trim() : '';
    s.textContent = t && cur && !String(cur.name).toLowerCase().includes(t.toLowerCase()) ? t : '';
  }
  // Pale boxes a mode painted itself, whose text has turned pale too, keep the light palette (dark text). Checked after every redraw of the window.
  const pale = c => { const m = /rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?/.exec(c); if (!m || (m[4] !== undefined && +m[4] < .5)) return false;
    return (0.2126 * m[1] + 0.7152 * m[2] + 0.0722 * m[3]) / 255 > .6; };
  let adaptQ = 0;
  function adapt() {
    adaptQ = 0;
    if (!cur) return;
    document.querySelectorAll('#panel .win *').forEach(e => {
      if (e.classList.contains('ms-lt') || e.closest('.ms-lt') !== null && e.closest('.ms-lt') !== e) return;
      const c = getComputedStyle(e);
      if (!(pale(c.backgroundColor) && pale(c.color))) return;   // light on light only
      e.classList.add('ms-lt');   // the old palette inside: a bar painted with ink behind white text is dark again
      const d = getComputedStyle(e);
      if (pale(d.backgroundColor) && pale(d.color)) e.classList.add('ms-lt-c');   // a pale box whose text it inherited
    });
  }
  const adaptSoon = () => { if (!adaptQ) adaptQ = requestAnimationFrame(adapt); };
  function watch() {
    if (!cur) return;
    const p = $('#panel');
    clearTimeout(timer);
    if (p.hidden) timer = setTimeout(() => { if ($('#panel').hidden) ST.leave(); }, LINGER);
    else { sub(); adaptSoon(); }
  }

  // Home leaves the mode, not just this window: the walkthrough's ✕ starts the mode, and a mode's first screen may
  // follow, so it keeps taking each window's way out (a few times, a tick apart) until no window is left.
  function home() {
    let n = 0;
    const out = () => {
      const p = $('#panel');
      if (p.hidden) return ST.leave();
      const b = p.querySelector('#md-stop, [id$="-stop"]:not([disabled]), #sp-later, #panel-quit, #panel-x');
      if (!b) return n ? null : U.system('Finish this step first', 'This step has no way out yet. Answer it, and Home works again.', '', 2600);
      b.click();
      if (++n < 5) setTimeout(out, 80);
    };
    out();
  }

  // Every mode's start enters the stage first. Modes that register later (js/hunt.js does, lazily) are wrapped too.
  function wrap(def) {
    if (!def || def.__staged || typeof def.start !== 'function') return def;
    const start = def.start;
    def.start = function () {
      ST.enter(def);
      let r;
      try { r = start.apply(this, arguments); }
      finally { if ($('#panel').hidden) watch(); }   // a start that opened nothing (or failed) ends the stage
      return r;
    };
    def.__staged = true;
    return def;
  }

  const boot = () => {
    const MO = SD.modes, MA = SD.main;
    if (!MO) return;
    MO.list().forEach(wrap);
    const reg = MO.register;
    MO.register = function (def) { return reg.call(this, wrap(def)); };
    // Another screen (a chapter, the hub, a run) ends the stage.
    if (MA && MA.show) {
      const show = MA.show;
      MA.show = function (screen) { if (screen !== 'title') ST.leave(); return show.apply(this, arguments); };
    }
    make();
  };

  const css = document.createElement('style');
  css.textContent = `
    #mode-stage { position: fixed; inset: 0; z-index: 19; background: #0c0a10; overflow: hidden; }
    #mode-stage .ms-bg { position: absolute; inset: 0; background: center / cover no-repeat; }
    #mode-stage .ms-bg img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    #mode-stage video { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    #mode-stage .ms-wash { position: absolute; inset: 0;
      background: linear-gradient(rgba(12, 10, 16, .78), rgba(12, 10, 16, .25) 28%, rgba(12, 10, 16, .35) 70%, rgba(12, 10, 16, .8)); }
    #mode-bar { position: fixed; top: 0; left: 0; right: 0; z-index: 22; display: grid; grid-template-columns: 1fr auto 1fr;
      align-items: center; gap: 8px; height: calc(56px + env(safe-area-inset-top, 0px));
      padding: env(safe-area-inset-top, 0px) max(12px, env(safe-area-inset-right, 0px)) 0 max(12px, env(safe-area-inset-left, 0px));
      background: rgba(20, 17, 28, .92); border-bottom: 2px solid #0c0a10; box-shadow: 0 2px 12px rgba(0, 0, 0, .45); }
    #mode-bar[hidden], #mode-stage[hidden] { display: none; }
    #mode-bar .ms-home { justify-self: start; min-height: 44px; padding: 0 12px; border: 0; background: none; box-shadow: none;
      color: #d6b254; font: 800 16px/1 Nunito, system-ui, sans-serif; cursor: pointer; white-space: nowrap; }
    #mode-bar .ms-home span { font-size: 22px; vertical-align: -1px; margin-right: 2px; }
    #mode-bar .ms-home:hover, #mode-bar .ms-home:focus-visible { color: #efe6d2; }
    #mode-bar .ms-title { display: flex; flex-direction: column; align-items: center; min-width: 0; text-align: center; }
    #mode-bar .ms-title b { color: var(--bone, #efe6d2); font: 700 18px/1.15 Cinzel, serif; white-space: nowrap; overflow: hidden;
      text-overflow: ellipsis; max-width: 100%; }
    #mode-bar .ms-title span { color: #b9b0c9; font: 700 11px/1.2 Nunito, system-ui, sans-serif; letter-spacing: .06em;
      text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    #mode-bar .ms-title span:empty { display: none; }
    #mode-bar .ms-snd { justify-self: end; min-width: 44px; min-height: 44px; padding: 0; border-radius: 10px;
      border: 2px solid #0c0a10; background: #2e2a3a; color: #efe6d2; font-size: 18px; box-shadow: none; }
    body.in-mode #panel { background: transparent;
      padding: calc(68px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px)); }
    body.in-mode #panel { align-items: end; }
    body.in-mode #panel .win { width: min(760px, 100%); min-height: min(560px, 72%); max-height: 100%; align-self: center; }
    body.in-mode #panel .win.wide { width: min(1040px, 100%); }
    body.in-mode #panel .win-b { flex: 1; }
    /* Dark glass: the palette swapped inside the window, so every mode's own CSS follows it. */
    body.in-mode #panel .win {
      --cream: #1c1926; --paper: #272233; --bone: #2f2a3d; --ink: #ece4d4; --muted: #aaa2bb; --line: #4a4358;
      --blue: #4b6f96; --blue-d: #9dbbdc; --sun: #d6b254;
      --mi-ink: var(--ink); --mi-muted: var(--muted); --mi-paper: var(--paper); --mi-cream: var(--cream); --mi-blue: var(--blue); --mi-sun: var(--sun);
      --pop: none;
      color: var(--ink); background: rgba(22, 19, 30, .84); -webkit-backdrop-filter: blur(14px) saturate(1.2); backdrop-filter: blur(14px) saturate(1.2);
      border: 1px solid rgba(214, 178, 84, .5); border-radius: 18px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, .6), 0 24px 60px rgba(0, 0, 0, .6), inset 0 1px 0 rgba(255, 255, 255, .06); }
    body.in-mode #panel .win-h { background: transparent; color: #d6b254; border-bottom: 1px solid rgba(236, 228, 212, .1); }
    body.in-mode #panel .win :is(.primary, .ghost, .danger, .row button, .conf-b button, .opt, .mi-btn) {
      border: 1px solid rgba(236, 228, 212, .18); box-shadow: 0 2px 0 rgba(0, 0, 0, .35); }
    body.in-mode #panel .win :is(.ghost, .row button, .conf-b button, .opt, .mi-btn):not(.primary):not(.ms-lt) { background: rgba(255, 255, 255, .06); color: var(--ink); }
    body.in-mode #panel .win :is(.ghost, .row button, .conf-b button, .opt, .mi-btn):not(.primary):not(:disabled):hover { background: rgba(255, 255, 255, .12); }
    body.in-mode #panel .win :is(.opt.on, button.on[aria-pressed="true"]) { background: rgba(75, 111, 150, .5); border-color: #9dbbdc; }
    body.in-mode #panel .win :is(.primary, .row button.primary, .mi-btn.go) { background: linear-gradient(#e2c26a, #c99f3e); color: #1d1a26; border-color: #f0d68a; }
    body.in-mode #panel .win .primary:hover:not(:disabled) { background: linear-gradient(#ecd07e, #d6ad4c); }
    body.in-mode #panel .win .conf-b button[data-c="2"]:not(:disabled) { background: rgba(214, 178, 84, .3); }
    body.in-mode #panel .win :is(.primary, .ghost, .danger, .row button, .conf-b button):active:not(:disabled) { box-shadow: none; }
    body.in-mode #panel .win a { color: #9dbbdc; }
    body.in-mode #panel .win :is(.pop-dock, .sp-tray, .conf) { border-top-color: rgba(236, 228, 212, .14); }
    /* A pale box a mode painted itself: the old palette back inside it. */
    body.in-mode #panel .win .ms-lt { --cream: #d6cdb9; --paper: #c7bca4; --bone: #e2dbcb; --ink: #17131f; --muted: #554c5e; --line: #9a8f78;
      --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #17131f; --mi-muted: #554c5e; }
    body.in-mode #panel .win .ms-lt-c { color: #17131f; }
    body.in-mode #panel #panel-x, body.in-mode #panel #panel-quit { display: none; }
    body.in-mode #panel .win-h:not(:has(> :not(span:first-child, .x))) { display: none; }
    body.in-mode #screen-title .tg-menu { visibility: hidden; }
    @media (max-width: 600px) {
      body.in-mode #panel { padding: calc(56px + env(safe-area-inset-top, 0px)) 0 0; }
      body.in-mode #panel .win, body.in-mode #panel .win.wide { width: 100%; min-height: 62%; align-self: end; border-radius: 16px 16px 0 0;
        border-left: 0; border-right: 0; border-bottom: 0; box-shadow: 0 -6px 24px rgba(0, 0, 0, .5); }
      #mode-bar { grid-template-columns: auto 1fr auto; }
      #mode-bar .ms-home { padding: 0 6px; }
      #mode-bar .ms-title b { font-size: 15px; }
    }
    @media (orientation: landscape) and (max-height: 460px) {
      #mode-bar { height: calc(44px + env(safe-area-inset-top, 0px)); }
      body.in-mode #panel { padding-top: calc(48px + env(safe-area-inset-top, 0px)); padding-bottom: 4px; }
      #mode-bar .ms-title span { display: none; }
    }`;
  document.head.appendChild(css);

  // After js/title-games.js (which boots two ticks after DOMContentLoaded) and every mode's register.
  const later = () => setTimeout(() => setTimeout(() => setTimeout(boot, 0), 0), 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later, { once: true });
  else later();
})();
