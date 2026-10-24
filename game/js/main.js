// Boot, title, menu and the town between runs.
// Chapter 1's overworld (js/ch1-world.js) is the game's home now: New game and Continue go there. The placeholder
// town menu stays for runs that end outside chapter 1.
(function () {
  const M = SD.main = {};
  const U = SD.ui, S = SD.state, Q = SD.quiz, AU = SD.audio;
  const $ = U.$;

  M.show = function (screen, keepMusic) {
    ['title', 'hub', 'run', 'world'].forEach(s => { $('#screen-' + s).hidden = s !== screen; });
    if (screen !== 'world' && SD.ch1) SD.ch1.halt();
    if (screen === 'hub') { M.hud(); town(); if (!keepMusic) AU.music('town'); }
  };

  const sndIcon = () => AU.muted() ? '🔇' : '🔊';
  function toggleSound(btn) { AU.toggleAll(); btn.textContent = sndIcon(); }

  M.hud = function () {
    const sv = S.save;
    const need = S.xpFor(sv.level);
    const due = S.dueCount();
    $('#hud').innerHTML = `
      <div class="rank"><b>${S.rank()}</b><span>RANK</span></div>
      <div class="hud-mid"><div class="hud-name">${U.esc(sv.name)} <span class="muted">Lv ${sv.level} · Loop ${sv.loop}</span></div>
        <div class="bar xp"><i style="width:${sv.xp / need * 100}%"></i></div></div>
      <span class="hud-chip">Shards <b>${sv.shards}</b></span>
      ${due ? `<span class="hud-chip due">${due} review${due > 1 ? 's' : ''} due</span>` : ''}
      <button class="ghost" id="hud-codex">Cheat sheet</button>
      <button class="ghost" id="hud-snd" aria-label="Sound on or off">${sndIcon()}</button>
      <button class="ghost" id="hud-menu" aria-label="Menu">☰</button>`;
    $('#hud-codex').onclick = () => U.codex();
    $('#hud-snd').onclick = e => toggleSound(e.currentTarget);
    $('#hud-menu').onclick = menu;
  };
  const today = () => new Date().toDateString();

  // V (for volume) is the mute key, everywhere, quizzes and dialogue included: it mutes everything and brings back
  // what was on before (js/audio.js). Not while you type in a text field.
  const typing = t => t && t.closest && (t.isContentEditable || t.closest('textarea, select') ||
    (t.closest('input') && !/^(checkbox|radio|button|submit|reset|range|color|file|image)$/.test(t.closest('input').type)));
  window.addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'v' || e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || typing(e.target)) return;
    e.preventDefault();
    const on = AU.toggleMute();
    ['#t-snd', '#hud-snd', '#w-snd'].forEach(id => { const b = $(id); if (b) b.textContent = sndIcon(); });
    if (!$('#panel').hidden && $('#panel .win-h span').textContent === 'MENU') menu();
    if (on && AU.prefs.sfx) AU.sfx('ok');
  });

  M.menu = menu;
  // Stop every chapter's walkable scene before a fresh save, so none keeps running (or holding the controls) underneath.
  M.haltWorlds = function () {
    ['ch1m', 'ch1', 'c2world', 'c2xworld', 'c3world', 'c4world', 'c5world', 'c6world', 'c7world'].forEach(k => { if (SD[k] && SD[k].reset) SD[k].reset(); });
    const d = $('#dialog'); if (d) d.hidden = true;
  };
  function menu() {
    const p = AU.prefs;
    const b = U.panel(`<div class="opts">
      <button class="opt" id="m-help">How to play</button>
      <button class="opt" id="m-music">Music: <b>${p.music ? 'On' : 'Off'}</b></button>
      <button class="opt" id="m-sfx">Sound effects: <b>${p.sfx ? 'On' : 'Off'}</b></button>
      <button class="opt" id="m-say">Say it first: <b>${{ boss: 'Boss questions', all: 'Every question', off: 'Off' }[SD.quiz.sayMode()]}</b></button>
      <button class="opt" id="m-typed">Typed answers: <b>${S.save && S.save.typed === false ? 'Off' : 'On'}</b></button>
      ${SD.lens ? `<button class="opt" id="m-lens">Version Lens: <b>${SD.lens.unlimited() ? 'Unlimited' : 'Limited looks'}</b></button>` : ''}
      <button class="opt" id="m-name">Change name</button>
      <button class="opt" id="m-credits">Credits</button>
      <button class="opt" id="m-reset">Erase save and start over</button>
      <button class="opt" id="m-debug">Debug start (testing): <b>${SD.debug ? 'On' : 'Off'}</b></button></div>
      <p class="muted small">Progress saves automatically${S.db ? ' to your claude.ai account, so it follows you across devices' : ' in this browser'}.</p>`, { title: 'MENU' });
    b.querySelector('#m-help').onclick = help;
    b.querySelector('#m-music').onclick = () => { AU.set('music', !p.music); menu(); M.hud(); };
    b.querySelector('#m-sfx').onclick = () => { AU.set('sfx', !p.sfx); menu(); M.hud(); };
    b.querySelector('#m-credits').onclick = credits;
    // Say it first (js/quiz.js): hide multiple choice options until you've answered in your own words.
    b.querySelector('#m-say').onclick = () => {
      if (!S.save) return;
      const m = SD.quiz.SAY_MODES; S.save.sayFirst = m[(m.indexOf(SD.quiz.sayMode()) + 1) % m.length]; S.persist(); menu();
    };
    // Typed answers (js/explain-data.js, checked on-device by js/embed.js): sometimes explain a concept instead of picking.
    b.querySelector('#m-typed').onclick = () => { if (!S.save) return; S.save.typed = S.save.typed === false; S.persist(); menu(); };
    // Testing only (js/debug.js; remove with it before release): a separate save that starts on any chapter or rank.
    b.querySelector('#m-debug').onclick = () => {
      try { if (SD.debug) localStorage.removeItem('isekai-cloud-debug'); else localStorage.setItem('isekai-cloud-debug', '1'); } catch (e) { /* ignore */ }
      location.reload();
    };
    // Version Lens (js/lens.js): an accessibility option, for anyone the looks and their timer get in the way of.
    const ml = b.querySelector('#m-lens');
    if (ml) ml.onclick = () => { if (!S.save) return; S.save.lensFree = !SD.lens.unlimited(); S.persist(); menu(); M.hud(); };
    b.querySelector('#m-name').onclick = () => askName(() => { U.closePanel(); M.hud(); });
    b.querySelector('#m-reset').onclick = () => {
      const c = U.panel('<p>Erase everything: levels, shards and cheat sheet pages? This cannot be undone.</p><div class="row"><button class="danger" id="r-y">Erase</button><button class="ghost" id="r-n">Cancel</button></div>', { title: 'ARE YOU SURE?' });
      c.querySelector('#r-y').onclick = () => { M.haltWorlds(); S.reset(); U.closePanel(); M.title(); };
      c.querySelector('#r-n').onclick = U.closePanel;
    };
  }
  // Keep this list in step with CREDITS.md: every asset the game ships needs its line here too.
  function credits() {
    U.panel(`<p class="small">Free art and music, used with thanks. Full details are in CREDITS.md in the game's repository.</p>
      <ul class="links small">
        <li><b>Portraits:</b> "Character Portrait ~ Maid" by Jupiter's Daughter (CC BY 3.0, OpenGameArt) for Uptima. The hero's portraits, the monsters, the dungeon map and the battle backdrops were generated for this game with PixelLab on Ladi's subscription, as were Mira's, Kai's, Seo-yeon's, Dutch's and Freya's concept portraits and Kyu's portraits and sprite (first made for Isekai'd Into Prod). Chapter 1's overworld, its people and props, and the incidents without a painting are drawn in code.</li>
        <li><b>Music:</b> "Kokoro no Yume", "Kaze no Kioku" and "Shadow of the Ancient Forest" by Paul Winter (kaazoom), "Under The Moon Sad Cinematic Loop" by Emmraan and "Final Battle Epic Orchestral Action Background Music" by Mohd Umar (mumarmds), via Pixabay. "Orchestral: Our Journey Awaits" by Techspired Minds (CC BY 4.0). "Enchanted Festival" by Matthew Pablo (www.matthewpablo.com), CC BY 3.0. "Hot Springs Town" by Kistol, "Cozy Puzzle In-Game 1" by MintoDog, "Emotional Piano" by Centurion_of_war, "JRPG Epic Rock Battle Theme #1" by HydroGene, "Epic Boss Battle" by Juhani Junkala, "Bossa" by SpringySpringo and an untitled goddess theme (see CREDITS.md), all CC0.</li>
        <li><b>Jingles, particles, emotes and sound effects:</b> Kenney (www.kenney.nl), CC0. Weather sounds via Pixabay. Places and night sounds: "Slow Clock Ticking" Sound Effect By Nicole Marie T (CC BY 4.0); waves and doorbell by qubodup, seagulls by Rango Mango, fire by AntumDeluge, anvils by themightyglider and vishwajai, chimes by pwl, weights by bmaczero and crickets by wolfgang (CC0, OpenGameArt).</li>
        <li><b>Icons:</b> Game-icons.net by Lorc, Delapouite and contributors (CC BY 3.0).</li>
        <li><b>Typed-answer model:</b> potion-base-8M by MinishLab (MIT).</li>
        <li><b>Fonts:</b> Fredoka and Nunito (SIL Open Font License).</li></ul>`, { title: 'CREDITS', cls: 'wide' });
  }
  function help() {
    U.panel(`<ul class="links">
      <li><b>Walking.</b> Arrow keys or WASD to walk, E or Enter to talk, or tap where you want to go. V mutes or unmutes the sound. Someone with a "!" has something for you.</li>
      <li><b>Runs.</b> The temple gate takes you down a branching path of incidents and side rooms, ending at a boss.</li>
      <li><b>Combat.</b> Each turn you get 3 Capacity. Cards absorb load or mitigate the incident's Severity. The incident shows its next move: read it and answer with the right service or setting.</li>
      <li><b>Matchups.</b> Cards that fit the incident are EFFECTIVE and mitigate hard. Wrong ones are RESISTED, and the game tells you why. That reason is the lesson.</li>
      <li><b>Questions.</b> Answer first, then rate how sure you are. Confident misses come back soonest. Cheat sheet pages return when you get a concept right twice in a row.</li>
      <li><b>Loops.</b> If SLA hits zero, you respawn in town. You keep XP, shards, cards unlocked and everything you learned.</li></ul>`, { title: 'HOW TO PLAY', cls: 'wide' });
  }
  function askName(done) {
    const b = U.panel(`<p class="small">Name, please.</p><label class="num">Hero name <input id="nm" maxlength="16" value="${U.esc(S.save.name)}"></label><button class="primary" id="nm-ok">Sign here</button>`, { title: 'HERO REGISTRATION FORM', noClose: true });
    const go = () => { const v = b.querySelector('#nm').value.trim(); S.save.name = v || 'Ash'; S.persist(); AU.sfx('ok'); done(); };
    b.querySelector('#nm-ok').onclick = go;
    b.querySelector('#nm').onkeydown = e => { if (e.key === 'Enter') go(); };
    setTimeout(() => b.querySelector('#nm').focus(), 50);
  }

  // ---------- Title ----------
  let started = false;
  M.title = function () {
    M.show('title');
    $('#t-snd').textContent = sndIcon();
    $('#t-snd').onclick = e => toggleSound(e.currentTarget);
    // The Today card (js/today.js): exam practice above Continue and New game, after PRESS START.
    if (SD.today) SD.today.mount(started);
    if (!started) {
      // A press-start screen is also what lets the browser play music.
      $('#title-actions').innerHTML = '<button class="primary press" id="t-start">PRESS START</button>';
      $('#t-start').onclick = () => { started = true; AU.unlock(); AU.music('title'); AU.sfx('ok'); M.title(); };
      return;
    }
    AU.music('title');
    AU.weather('gloom');
    storm();
    const sv = S.save;
    const has = sv.flags.prologue;
    $('#title-actions').innerHTML = has
      ? `<button class="primary" id="t-go">Continue${sv.c1 && sv.c1.lead && SD.ch1story ? ' · ' + U.esc(SD.ch1story.leads[sv.c1.lead].name) : ''}</button><button class="ghost" id="t-new2">New game</button><button class="ghost" id="t-help">How to play</button>`
      : `<button class="primary" id="t-new">New game</button><button class="ghost" id="t-help">How to play</button>`;
    $('#t-help').onclick = help;
    if (has && $('#t-new2')) $('#t-new2').onclick = () => {
      const c = U.panel('<p>Start again from the prologue? Your level, cheat sheet and everything you learned stay.</p><div class="row"><button class="primary" id="n-y">Start again</button><button class="ghost" id="n-n">Cancel</button></div>', { title: 'NEW GAME' });
      c.querySelector('#n-y').onclick = () => { U.closePanel(); S.save.c1 = null; S.save.run = null; S.persist(); SD.ch1 ? SD.ch1.newGame() : newGame(); };
      c.querySelector('#n-n').onclick = U.closePanel;
    };
    if (has) $('#t-go').onclick = () => SD.ch1 ? SD.ch1.resume() : M.toHub(false);
    else $('#t-new').onclick = () => SD.ch1 ? SD.ch1.newGame() : newGame();
  };

  // No cold open yet (the first game's is in its js/intro.js): ask the hero's name and go to town.
  function newGame() {
    askName(() => {
      U.closePanel();
      S.save.flags.prologue = true; S.persist();
      M.toHub(false);
    });
  }

  M.toHub = function (afterRun) {
    M.show('hub');
    if (afterRun) U.system('[SYSTEM] BACK IN TOWN', `Loop ${S.save.loop}.`);
  };

  // ---------- Town ----------
  const waitClose = () => new Promise(res => {
    const p = $('#panel');
    const obs = new MutationObserver(() => { if (p.hidden) { obs.disconnect(); res(); } });
    obs.observe(p, { attributes: true, attributeFilter: ['hidden'] });
  });

  function town() {
    const sv = S.save;
    const due = S.dueCount();
    $('#town').innerHTML = `<div class="win town-win"><div class="win-h">TOWN</div><div class="win-b">
      <p class="muted small">A placeholder town. The walkable one arrives with the story.</p>
      <div class="opts">
        <button class="opt" data-go="gate"><b>Dungeon gate</b>${sv.run ? ' · Run in progress' : ''}<br><span class="small">Go down into a dungeon run.</span></button>
        <button class="opt" data-go="board"><b>Quest board</b>${sv.flags.dailyDate === today() ? ' · Done today' : ''}<br><span class="small">Five review questions${due ? `, ${due} due` : ''}. Once a day for a bonus.</span></button>
        <button class="opt" data-go="codex"><b>Cheat sheet</b><br><span class="small">Every concept you have met, and how they connect.</span></button>
      </div></div></div>`;
    $('#town').querySelectorAll('[data-go]').forEach(el => el.onclick = () => {
      AU.sfx('door');
      ({ gate, board, codex: () => U.codex() })[el.dataset.go]();
    });
  }

  async function board() {
    const sv = S.save;
    const done = sv.flags.dailyDate === today();
    const r = await Q.session(5, { title: '[DAILY QUEST] REVIEW' });
    const right = r.filter(x => x.ok).length;
    if (!done) { sv.flags.dailyDate = today(); sv.shards += 100; SD.run.gainXp(40); U.system('DAILY QUEST COMPLETE!', `${right}/5 correct. +40 XP, +100 shards.`, 'gold'); }
    else { SD.run.gainXp(right * 6); U.system('PRACTICE COMPLETE', `${right}/5 correct. +${right * 6} XP.`); }
    S.persist(); M.show('hub', true);
  }

  async function gate() {
    const sv = S.save;
    if (sv.run) {
      const b = U.panel('<p>Your run is still open.</p><div class="row"><button class="primary" id="g-r">Resume run</button><button class="ghost" id="g-x">Not yet</button></div>', { title: 'DUNGEON GATE' });
      b.querySelector('#g-x').onclick = U.closePanel;
      b.querySelector('#g-r').onclick = () => { U.closePanel(); SD.run.resume(); };
      return waitClose();
    }
    // Each cleared chapter opens the next dungeon; earlier ones stay open for practice.
    const open = Object.keys(SD.chapters).map(Number).filter(ch => S.chapterOpen(ch));
    const latest = open[open.length - 1];
    const dungeons = open.slice().reverse().map(ch => {
      const c = SD.chapters[ch];
      return `<button class="opt${ch === latest ? ' on' : ''}" data-ch="${ch}"><b>${c.rank}-Rank Dungeon: ${U.esc(c.name.replace(/^the /, 'The '))}</b>${sv.flags['ch' + ch] ? ' · Cleared' : ''}<br><span class="small">${U.esc(c.blurb)}</span></button>`;
    }).join('');
    const b = U.panel(`<div class="opts">${dungeons}</div>
      <p class="muted small">Max SLA ${S.maxSla()}</p>
      <div class="row"><button class="ghost" id="g-x">Not yet</button></div>`, { title: 'DUNGEON GATE' });
    b.querySelector('#g-x').onclick = U.closePanel;
    b.querySelectorAll('[data-ch]').forEach(el => el.onclick = () => { U.closePanel(); SD.run.start(+el.dataset.ch); });
    await waitClose();
  }

  SD.onCloudLoad = function () {
    if (!$('#screen-title').hidden) M.title(); else if (!$('#screen-hub').hidden) M.show('hub', true); else if (!$('#screen-world').hidden && SD.ch1) SD.ch1.hud();
  };

  // The title's storm: lightning every so often, with its thunder once the sound is on, and the cloud layers leaning
  // apart as the pointer moves (index.html's .pcl layers read --px).
  let bolt = null;
  function storm() {
    clearTimeout(bolt);
    const strike = () => {
      if ($('#screen-title').hidden) return;
      const b = $('.t-bolt'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
      if (started) setTimeout(() => AU.sfx('thunder'), 300 + Math.random() * 700);
      bolt = setTimeout(strike, 9000 + Math.random() * 12000);
    };
    bolt = setTimeout(strike, 2500 + Math.random() * 3000);
  }

  // ---------- Boot ----------
  function boot() {
    S.load();
    U.initDialog();
    const t = $('#title-clouds');
    for (let i = 0; i < 6; i++) {
      const c = document.createElement('div');
      c.className = 'cloud';
      c.style.top = (6 + i * 9) + '%';
      c.style.animationDuration = (40 + Math.random() * 30) + 's';
      c.style.animationDelay = (-Math.random() * 60) + 's';
      c.style.transform = `scale(${0.5 + Math.random() * 0.8})`;
      t.appendChild(c);
    }
    const ts = $('#screen-title');
    ts.addEventListener('pointermove', e => ts.style.setProperty('--px', ((e.clientX / innerWidth) * 2 - 1).toFixed(2)));
    storm();
    M.title();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
