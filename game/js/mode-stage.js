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
//   - A mode can have a skin of its own on top of the glass, keyed on body[data-stage="<id>"] (Ladi, Nov 16: "match
//     the theme of the game"). Incident Commander's is the camp's pager board: a timber frame around cork, incidents
//     as paper pager slips pinned with brass tacks (a wax-colour edge per severity, lamp-flame clock pips), the error
//     budget as lamp oil on a brass plate, Uptima's line as a pinned note, and a question as a paper incident report.
//     Monster Hunt: Bru's bounty board, a parchment sheet nailed to planks, with each bounty a pinned notice.
//     Exam Sprint: an exam booklet on a clipboard. Architect's Draft: a blueprint sheet on the drafting table.
//     The Look-Alike Cup and the Lost and Found: the frame only (a lacquered card table with felt, a storeroom
//     shelf with a manila claim sheet), since their boards and maps are being reworked in another thread.
//     LIGHT below lists the paper surfaces: inside them the old light palette is back, with paper-coloured buttons.
// This file only wraps: no mode file changes. It loads after js/title-games.js.
// API: SD.modeStage.enter(def), .leave(), .active() the running mode's id or null.
(function () {
  const ST = SD.modeStage = {};
  const U = SD.ui, AU = SD.audio, $ = s => document.querySelector(s);
  const esc = s => U.esc(String(s == null ? '' : s));
  const LOOPS = ['duel', 'draft', 'pop', 'hunt', 'ic', 'sprint'];
  // A mode with no card loop of its own borrows a sibling's: the Sorting Floor plays in the Lost and Found's storeroom.
  const LOOP_OF = { floor: 'pop' };
  const LINGER = 450;
  // Painted plates, one id per mode once both its plates are in assets/img/stage/ (prompts: project files mode-stage/).
  // The Fire Drill's war room is a Gemini image (project files game-modes/multiplayer-real/art-and-music.md).
  const PLATES = ['drill'];
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
    } else if (LOOPS.includes(LOOP_OF[id] || id)) {
      const v = `assets/video/cards/${LOOP_OF[id] || id}`;
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

  // Paper surfaces: dark ink on a light sheet.
  const LIGHT = 'body.in-mode #panel :is(' + ['hunt', 'sprint', 'pop'].map(id => `body[data-stage="${id}"] .win-b`)
    .concat(['body[data-stage="ic"] .win.quiz .win-b', 'body[data-stage="ic"] .win-b:has(> .md-walk)']).join(', ') + ')';
  const FRAME = id => `body.in-mode[data-stage="${id}"] #panel`;
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
    /* ---- Incident Commander: the camp's pager board ---- */
    body.in-mode[data-stage="ic"] #panel .win { padding: 10px; border: 0; border-radius: 14px; -webkit-backdrop-filter: none; backdrop-filter: none;
      background: repeating-linear-gradient(92deg, rgba(0, 0, 0, .12) 0 2px, transparent 2px 9px), linear-gradient(135deg, #5b3b21, #33200f 38%, #4d3119 68%, #2a190b);
      box-shadow: 0 0 0 2px #140b05, inset 0 0 0 1px rgba(255, 220, 160, .12), 0 26px 60px rgba(0, 0, 0, .7); }
    body.in-mode[data-stage="ic"] #panel .win-h { padding: 2px 8px 10px; border: 0; background: none; color: #e9c56d; text-shadow: 0 1px 0 #140b05; letter-spacing: .12em; }
    body.in-mode[data-stage="ic"] #panel .win-b { border-radius: 8px; color: #efe6d2; box-shadow: inset 0 0 0 2px #140b05, inset 0 6px 26px rgba(0, 0, 0, .7);
      background: radial-gradient(rgba(0, 0, 0, .28) 1px, transparent 1.6px) 0 0 / 7px 7px, radial-gradient(rgba(255, 214, 150, .09) 1px, transparent 1.4px) 3px 4px / 11px 11px,
        radial-gradient(120% 90% at 50% 0, #6a4a2e, #3f2a19 70%, #2c1c10); }
    /* Uptima's line: a note pinned to the cork. */
    body.in-mode[data-stage="ic"] #panel .ic-say, body.in-mode[data-stage="ic"] #panel .ic-since { --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; position: relative; margin: 6px 2px 14px; padding: 12px 14px 10px; color: #2a2018;
      background: linear-gradient(#f8f1df, #ecdfc2); border-radius: 2px; box-shadow: 0 3px 8px rgba(0, 0, 0, .5); transform: rotate(-.5deg); }
    body.in-mode[data-stage="ic"] #panel .ic-since { border-left: 8px solid #a8322a; transform: rotate(.4deg); }
    body.in-mode[data-stage="ic"] #panel :is(.ic-say, .ic-since, .ic-card)::before { content: ''; position: absolute; top: -6px; left: 50%; width: 13px; height: 13px; margin-left: -6px;
      border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe9a8, #c9993a 45%, #6b4a14); box-shadow: 0 2px 3px rgba(0, 0, 0, .55); }
    /* The error budget: lamp oil, on a brass plate. */
    body.in-mode[data-stage="ic"] #panel .ic-hud { padding: 7px 12px; border-radius: 5px 5px 0 0; color: #2a1c08; background: linear-gradient(#dcb65e, #a67c2c);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, .4), inset 0 -1px 0 rgba(0, 0, 0, .35), 0 2px 5px rgba(0, 0, 0, .5); text-shadow: 0 1px 0 rgba(255, 240, 200, .45); }
    body.in-mode[data-stage="ic"] #panel .ic-bar { height: 14px; margin: 0 0 12px; border: 2px solid #140b05; border-radius: 0 0 5px 5px; background: #1a110a; box-shadow: 0 2px 5px rgba(0, 0, 0, .5); }
    body.in-mode[data-stage="ic"] #panel .ic-bar i { background: linear-gradient(#ffd27a, #e08a1e); box-shadow: 0 0 10px rgba(255, 170, 60, .7); }
    /* Incidents: paper pager slips, pinned. */
    body.in-mode[data-stage="ic"] #panel .ic-board { gap: 16px; padding: 8px 2px 4px; }
    body.in-mode[data-stage="ic"] #panel .win .ic-board .ic-card.opt { --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; position: relative; padding: 14px 14px 12px 16px; color: #2a2018; border: 0; border-left: 9px solid #7a8794; border-radius: 2px;
      background: repeating-linear-gradient(transparent 0 25px, rgba(90, 70, 40, .09) 25px 26px), linear-gradient(#f8f1df, #ecdfc2);
      box-shadow: 0 4px 10px rgba(0, 0, 0, .55); transition: transform .15s ease-out, box-shadow .15s ease-out; }
    body.in-mode[data-stage="ic"] #panel .ic-inc:nth-child(odd) .ic-card { transform: rotate(-.45deg); }
    body.in-mode[data-stage="ic"] #panel .ic-inc:nth-child(even) .ic-card { transform: rotate(.4deg); }
    body.in-mode[data-stage="ic"] #panel .win .ic-board .ic-card.opt:not([aria-disabled="true"]):is(:hover, :focus-visible) { transform: translateY(-3px); box-shadow: 0 10px 18px rgba(0, 0, 0, .6); background-color: #fffaf0; }
    body.in-mode[data-stage="ic"] #panel .ic-board .ic-card[aria-disabled="true"] { filter: saturate(.6) brightness(.82); }
    body.in-mode[data-stage="ic"] #panel .win .ic-board .ic-sev-2 .ic-card.opt { border-left-color: #d08a1e; }
    body.in-mode[data-stage="ic"] #panel .win .ic-board .ic-sev-1 .ic-card.opt { border-left-color: #a8322a; }
    body.in-mode[data-stage="ic"] #panel .ic-sev { font-family: ui-monospace, "Courier New", monospace; letter-spacing: .06em; color: #4a5560; }
    body.in-mode[data-stage="ic"] #panel .ic-sev-2 .ic-sev { color: #8a5608; }
    body.in-mode[data-stage="ic"] #panel .ic-sev-1 .ic-sev { color: #a8322a; }
    body.in-mode[data-stage="ic"] #panel .ic-clock { font-size: 17px; letter-spacing: 4px; color: #d9701a; text-shadow: 0 0 6px rgba(255, 150, 40, .55); }
    body.in-mode[data-stage="ic"] #panel .win .ic-board .ic-fmt .ic-card.opt { border-left-style: double; }
    /* The request path: brass plaques; a red lamp where something is open. */
    body.in-mode[data-stage="ic"] #panel .ic-node { color: #2a1c08; border: 2px solid #140b05; border-radius: 5px; background: linear-gradient(#dcb65e, #a67c2c); box-shadow: inset 0 1px 0 rgba(255, 255, 255, .4), 0 2px 5px rgba(0, 0, 0, .5); }
    body.in-mode[data-stage="ic"] #panel .ic-node.alarm { box-shadow: inset 0 1px 0 rgba(255, 255, 255, .4), 0 0 0 2px #a8322a, 0 0 14px rgba(230, 70, 50, .75); }
    body.in-mode[data-stage="ic"] #panel .ic-node.here { border: 4px double #140b05; background: linear-gradient(#f3d98a, #c99a3c); }
    body.in-mode[data-stage="ic"] #panel .ic-node:disabled:not(.here):not(.alarm) { filter: brightness(.78); }
    body.in-mode[data-stage="ic"] #panel .ic-link { color: #e9c56d; opacity: .8; }
    body.in-mode[data-stage="ic"] #panel .ic-best { --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; color: #2a2018; background: linear-gradient(#f8f1df, #ecdfc2); border: 0; border-left: 8px solid #4f7f5c; border-radius: 2px; box-shadow: 0 3px 8px rgba(0, 0, 0, .5); padding: 10px 12px; }
    /* A question, and the walkthrough: one paper incident report on the cork. */
    body.in-mode[data-stage="ic"] #panel .win.quiz .win-b, body.in-mode[data-stage="ic"] #panel .win-b:has(> .md-walk) { --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; color: #2a2018;
      background: repeating-linear-gradient(transparent 0 27px, rgba(90, 70, 40, .07) 27px 28px), linear-gradient(#f8f1df, #ecdfc2); box-shadow: inset 0 0 0 2px #140b05, inset 0 0 40px rgba(120, 90, 40, .25); }
    body.in-mode[data-stage="ic"] #panel .win-h .td-stop { background: linear-gradient(#dcb65e, #a67c2c); color: #2a1c08; border: 1px solid #140b05; }
    @media (max-width: 600px) { body.in-mode[data-stage="ic"] #panel .win { padding: 8px 6px 0; border-radius: 14px 14px 0 0; } }
    @media (prefers-reduced-motion: reduce) { body.in-mode[data-stage="ic"] #panel .ic-card { transition: none; } }
    /* ---- Paper surfaces, shared ---- */
    ${LIGHT} { --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; color: #2a2018; }
    ${LIGHT} :is(.opt, .ghost, .conf-b button, .row button, .mi-btn):not(.primary) { background: #fffaf0; color: #2a2018; border: 1.5px solid #6a5a48; box-shadow: 0 2px 0 rgba(60, 40, 20, .35); }
    ${LIGHT} :is(.opt, .ghost, .conf-b button, .row button, .mi-btn):not(.primary):not(:disabled):hover { background: #fff; }
    ${LIGHT} :is(.opt.on, button.on[aria-pressed="true"]) { background: #dbe6f0; border-color: #2a4360; }
    ${LIGHT} .conf-b button[data-c="2"]:not(:disabled) { background: #f0d68a; }
    ${LIGHT} :is(.conf, .pop-dock, .sp-tray) { border-top-color: #b9a780; }
    ${LIGHT} a { color: #2a4360; }
    /* ---- Monster Hunt: Bru's bounty board ---- */
    ${FRAME('hunt')} .win { padding: 12px; border: 0; border-radius: 10px; -webkit-backdrop-filter: none; backdrop-filter: none;
      background: repeating-linear-gradient(90deg, rgba(0, 0, 0, .28) 0 2px, transparent 2px 96px), repeating-linear-gradient(91deg, rgba(0, 0, 0, .1) 0 1px, transparent 1px 7px), linear-gradient(#4a4038, #2e2722);
      box-shadow: 0 0 0 2px #110d0a, inset 0 0 0 1px rgba(255, 230, 190, .08), 0 26px 60px rgba(0, 0, 0, .7); }
    ${FRAME('hunt')} .win-h { padding: 2px 8px 10px; border: 0; background: none; color: #e6d3a6; letter-spacing: .12em; }
    ${FRAME('hunt')} .win-b { border-radius: 3px; box-shadow: inset 0 0 46px rgba(120, 78, 22, .4), 0 4px 12px rgba(0, 0, 0, .6);
      background: radial-gradient(60% 40% at 18% 12%, rgba(140, 100, 40, .16), transparent), radial-gradient(50% 35% at 85% 80%, rgba(140, 100, 40, .18), transparent), linear-gradient(#f1e4bf, #dfcb9a); }
    ${FRAME('hunt')} .win::before, ${FRAME('hunt')} .win::after { content: ''; position: absolute; z-index: 3; top: 7px; width: 12px; height: 12px; border-radius: 50%;
      background: radial-gradient(circle at 35% 30%, #cfcfcf, #6a6a6a 50%, #2a2a2a); box-shadow: 0 2px 3px rgba(0, 0, 0, .6); }
    ${FRAME('hunt')} .win::before { left: 7px; } ${FRAME('hunt')} .win::after { right: 7px; }
    ${FRAME('hunt')} :is(.hn-bt, .hn-res) { position: relative; margin-top: 6px; border: 0; border-radius: 2px; background: linear-gradient(#fbf5e3, #f0e4c6); box-shadow: 0 3px 8px rgba(60, 40, 10, .45); }
    ${FRAME('hunt')} :is(.hn-bt, .hn-res)::before { content: ''; position: absolute; top: -6px; left: 50%; width: 13px; height: 13px; margin-left: -6px; border-radius: 50%; background: radial-gradient(circle at 35% 30%, #ffe9a8, #c9993a 45%, #6b4a14); box-shadow: 0 2px 3px rgba(0, 0, 0, .55); }
    ${FRAME('hunt')} :is(.hn-bts, .hn-results) { gap: 16px; }
    ${FRAME('hunt')} :is(.hn-bts, .hn-results) > :nth-child(odd) { transform: rotate(-.5deg); }
    ${FRAME('hunt')} :is(.hn-bts, .hn-results) > :nth-child(even) { transform: rotate(.45deg); }
    ${FRAME('hunt')} .hn-bt.done { background: #e2d6b6; box-shadow: none; outline: 2px dashed #8a7550; }
    ${FRAME('hunt')} :is(.hn-opt, .hn-since) { background: rgba(255, 250, 235, .6); border-left-color: #8a1f1f; }
    ${FRAME('hunt')} .hn-hp.hn-inq { background: #fbf5e3; border: 1.5px solid #6a5a48; }
    /* ---- Exam Sprint: an exam booklet on a clipboard ---- */
    ${FRAME('sprint')} .win { padding: 26px 10px 10px; border: 0; border-radius: 12px; -webkit-backdrop-filter: none; backdrop-filter: none;
      background: radial-gradient(rgba(0, 0, 0, .14) 1px, transparent 1.5px) 0 0 / 6px 6px, linear-gradient(#9a7448, #6f5030);
      box-shadow: 0 0 0 2px #2a1b0c, inset 0 1px 0 rgba(255, 235, 200, .25), 0 26px 60px rgba(0, 0, 0, .7); }
    ${FRAME('sprint')} .win::before { content: ''; position: absolute; z-index: 3; top: 5px; left: 50%; width: 132px; height: 24px; margin-left: -66px; border-radius: 6px 6px 3px 3px;
      background: linear-gradient(#f2f2f2, #a9a9a9 55%, #7c7c7c); box-shadow: 0 2px 4px rgba(0, 0, 0, .55), inset 0 1px 0 #fff; }
    ${FRAME('sprint')} .win-h { padding: 6px 8px 8px; border: 0; background: none; color: #2a1b0c; letter-spacing: .1em; }
    ${FRAME('sprint')} .win-b { border-radius: 2px; background: linear-gradient(#fdfaf1, #f4eedd); box-shadow: 0 3px 10px rgba(0, 0, 0, .5); }
    ${FRAME('sprint')} .win-b { --cream: #f8f3e4; }
    ${FRAME('sprint')} :is(.sp-card, .sp-host, .sp-sheet, .sp-jc, .sp-dc, .sp-rm, .sp-aside) { border-width: 1.5px; border-color: #6a5a48; border-radius: 4px; box-shadow: 0 2px 0 rgba(60, 40, 20, .2); }
    ${FRAME('sprint')} .sp-top { background: #2a2018; }
    /* ---- Architect's Draft: a blueprint on the drafting table ---- */
    ${FRAME('draft')} .win { padding: 10px; border: 0; border-radius: 8px; -webkit-backdrop-filter: none; backdrop-filter: none;
      background: repeating-linear-gradient(0deg, rgba(0, 0, 0, .08) 0 1px, transparent 1px 6px), linear-gradient(90deg, #b88a52, #d2a66a 50%, #b88a52);
      box-shadow: 0 0 0 2px #3a260f, inset 0 1px 0 rgba(255, 240, 210, .4), 0 26px 60px rgba(0, 0, 0, .7); }
    ${FRAME('draft')} .win-h { padding: 2px 8px 8px; border: 0; background: none; color: #3a260f; letter-spacing: .1em; }
    ${FRAME('draft')} .win-b { --cream: #1d3d6b; --paper: #25497c; --bone: #2b5289; --ink: #eaf2ff; --muted: #b4c9e6; --line: #5f83b8; --blue-d: #cfe6ff; --mi-ink: #eaf2ff; --mi-muted: #b4c9e6;
      color: #eaf2ff; border-radius: 2px; box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .35), inset 0 0 0 6px #1d3d6b, inset 0 0 0 7px rgba(255, 255, 255, .25), 0 3px 10px rgba(0, 0, 0, .5);
      background: linear-gradient(rgba(255, 255, 255, .13) 1px, transparent 1px) 0 0 / 120px 120px, linear-gradient(90deg, rgba(255, 255, 255, .13) 1px, transparent 1px) 0 0 / 120px 120px,
        linear-gradient(rgba(255, 255, 255, .06) 1px, transparent 1px) 0 0 / 24px 24px, linear-gradient(90deg, rgba(255, 255, 255, .06) 1px, transparent 1px) 0 0 / 24px 24px, #1d3d6b; }
    ${FRAME('draft')} .win-b :is(.opt, .ghost, .row button, .conf-b button):not(.primary):not(.ms-lt) { background: rgba(29, 61, 107, .85); border: 1.5px dashed rgba(234, 242, 255, .55); box-shadow: none; }
    ${FRAME('draft')} .win-b :is(.opt, .ghost, .row button, .conf-b button):not(.primary):not(.ms-lt):not(:disabled):hover { background: #2b5289; border-style: solid; }
    ${FRAME('draft')} .win-b .primary { background: #eaf2ff; color: #1d3d6b; border-color: #fff; }
    /* ---- The Look-Alike Cup: the frame only, a lacquered card table ---- */
    ${FRAME('duel')} .win { padding: 10px; border: 0; border-radius: 22px; -webkit-backdrop-filter: none; backdrop-filter: none;
      background: linear-gradient(135deg, #3a1d14, #1c0d09 45%, #33180f);
      box-shadow: 0 0 0 2px #0c0504, inset 0 0 0 2px rgba(214, 178, 84, .55), inset 0 0 0 3px #0c0504, 0 26px 60px rgba(0, 0, 0, .7); }
    ${FRAME('duel')} .win-h { padding: 2px 10px 8px; border: 0; background: none; color: #e9c56d; letter-spacing: .12em; }
    ${FRAME('duel')} .win-b { border-radius: 14px; box-shadow: inset 0 0 0 2px #0c0504, inset 0 8px 40px rgba(0, 0, 0, .65);
      background: radial-gradient(rgba(255, 255, 255, .035) 1px, transparent 1.4px) 0 0 / 5px 5px, radial-gradient(110% 80% at 50% 0, #4a4458, #2c2836 70%, #211e29); }
    /* ---- The Lost and Found: the frame only, a storeroom shelf with a claim sheet ---- */
    ${FRAME('pop')} .win { padding: 12px 10px 10px; border: 0; border-radius: 6px; -webkit-backdrop-filter: none; backdrop-filter: none;
      background: repeating-linear-gradient(1deg, rgba(0, 0, 0, .14) 0 2px, transparent 2px 8px), linear-gradient(#6a4a2c, #46301c);
      box-shadow: 0 0 0 2px #1a1007, inset 0 3px 0 rgba(255, 225, 170, .18), inset 0 -4px 0 rgba(0, 0, 0, .35), 0 26px 60px rgba(0, 0, 0, .7); }
    ${FRAME('pop')} .win-h { padding: 2px 8px 8px; border: 0; background: none; color: #f0d68a; letter-spacing: .1em; }
    ${FRAME('pop')} .win-b { border-radius: 3px; background: linear-gradient(#ecd9a8, #dcc68e); box-shadow: inset 0 0 0 1px rgba(120, 85, 30, .5), inset 0 0 36px rgba(120, 85, 30, .25), 0 3px 10px rgba(0, 0, 0, .5); }
    ${FRAME('pop')} .win-b { --cream: #e6d29f; }
    @media (max-width: 600px) {
      ${FRAME('hunt')} .win, ${FRAME('draft')} .win, ${FRAME('duel')} .win, ${FRAME('pop')} .win { padding: 8px 6px 0; border-radius: 14px 14px 0 0; }
      ${FRAME('sprint')} .win { padding: 24px 6px 0; border-radius: 14px 14px 0 0; }
    }
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
