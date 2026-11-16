// The games carousel on the title (Ladi, Nov 16; start menu review by the UX design, art director and UX motion seats,
// project files start-menu/). After PRESS START, under the Today card: one swipeable row of big cards, the story first
// (Continue, or New game on a fresh save), then every game mode (SD.modes.list()), then Multiplayer. It replaces the
// old Continue bar, the button grid and the Today card's small Play link. New game (when there is a save) and How to
// play move to the ☰ button, top left (a fresh save keeps How to play under the cards).
//   - Every card reuses art already in the game: a battle backdrop band and its host's portrait (ART below, keyed by
//     mode id, so a new mode adds one line; a mode without an entry gets the plain card and its icon).
//   - The story card and Multiplayer keep the title's own buttons (#ds-go, #t-go, #ds-new, #t-new, #t-mp), moved into
//     their cards, so js/quicksave.js (Resume quick save) and the chapters' title patches keep working.
//   - Opens on the last card played (S.save.lastGame), with the next card peeking in. CSS scroll-snap; dots under the
//     row; chevrons only with a mouse; Tab walks the cards. Reduced motion: no smooth scroll, no scale.
// This is the outermost title patch: it loads after js/quicksave.js and boots one tick after it.
// API: SD.titleGames.newGame()  the hidden New game button when the story card shows Continue (the ☰ menu offers it
//      as "Start the story over"), else null.  SD.titleGames.help()  the title's How to play button, if any.
(function () {
  const TG = SD.titleGames = {};
  const S = SD.state, U = SD.ui, $ = s => document.querySelector(s);
  const esc = s => U.esc(String(s == null ? '' : s));
  // The vector build draws its own stages (SD.run.stageArt, as js/run.js and js/raid.js use), so no raster is fetched.
  const BG = n => (SD.run && SD.run.stageArt ? SD.run.stageArt(n) : `assets/img/battle/bg-${n}.webp`), FACE = w => `assets/img/portraits/${w}-neutral.webp`;
  // Mode id: backdrop number and host portrait. A fresh save's story card shows Freya as a silhouette (Ladi, Nov 16).
  const ART = {
    ic: { bg: 1, face: 'uptima' },
    pop: { bg: 2, face: 'dutch' },
    sprint: { bg: 7, face: 'lexi' },
    hunt: { bg: 8, face: 'bru' },
    duel: { bg: 5, face: 'kagemaru' },
    draft: { bg: 10, face: () => (SD.draft && SD.draft.foremanId ? SD.draft.foremanId() : 'ayo') },
    mp: { bg: 9 }
  };
  const SPARE = [6, 4, 5];
  // Looping card videos (Ladi, Nov 16; prompts in project files title-loop/story-craft.md): a card id listed here plays
  // assets/video/cards/<id>.mp4 in its picture, with <id>.webp (the clip's first frame) as the still, in place of the
  // backdrop and portrait. Only the centred card plays. Reduced motion and Save-Data keep the still. The vector build
  // plays them too: the published page serves the clips as files beside it (tools/artifact_page.py packs only assets/img).
  const LOOPS = ['story', 'duel', 'draft', 'pop', 'hunt', 'ic', 'sprint'];
  const VID = id => 'assets/video/cards/' + id;
  const hasLoop = id => LOOPS.includes(id);
  const still = () => reduced() || !!(navigator.connection && navigator.connection.saveData);
  const CONTINUE = '#ds-go, #t-go, #dbg-go, [id^="t-c"][id$="go"]';
  let hidden = null;

  const mins = m => (SD.modes && SD.modes.mins ? SD.modes.mins(m) : '');
  const host = h => String(h || '').split(',')[0];
  const latest = () => (SD.demo && SD.demo.latest ? SD.demo.latest() : null);
  const chapterOf = () => { const c = latest(); return c ? parseInt(c.n, 10) || 1 : 1; };
  const storyLine = () => { const c = latest(); return c ? `Chapter ${c.n === '2b' ? '2, part 2' : c.n}: ${c.name}` : 'Pick up where you left off'; };
  const leadFace = () => { const l = S.save && S.save.c1 && S.save.c1.lead; return l || 'you'; };
  const faceHtml = w => w ? `<img class="tg-face${w === 'freya' ? ' tg-sil' : ''}" src="${FACE(w)}" alt="" draggable="false" onerror="this.remove()">` : '';
  const band = (n, face, id) => hasLoop(id)
    ? `<div class="tg-art tg-hasvid" style="background-image:url(${VID(id)}.webp)" aria-hidden="true"><video class="tg-vid" muted loop playsinline preload="none" poster="${VID(id)}.webp" data-src="${VID(id)}.mp4" disablepictureinpicture></video></div>`
    : `<div class="tg-art" style="background-image:url(${BG(n)})" aria-hidden="true">${faceHtml(face)}</div>`;
  // Play the centred card's loop and pause the rest. The source is set on first play, so unseen cards fetch nothing.
  function playOnly(on) {
    document.querySelectorAll('#title-actions .tg-vid').forEach(v => {
      const go = v.closest('.tg-card') === on && !still() && !$('#screen-title').hidden && !document.hidden;
      if (go) { if (!v.src) v.src = v.dataset.src; const p = v.play(); if (p && p.catch) p.catch(() => { /* autoplay refused: the still stays */ }); }
      else if (!v.paused) v.pause();
    });
  }
  document.addEventListener('visibilitychange', () => playOnly($('#title-actions .tg-card.on')));

  function card(id, html) {
    const li = document.createElement('li');
    li.className = 'tg-card'; li.dataset.game = id;
    li.innerHTML = html;
    return li;
  }
  // The title's own button, restyled as the card's button.
  function adopt(li, btn, primary) {
    btn.className = (primary ? 'primary' : 'ghost') + ' tg-go' + (btn.classList.contains('qs-resume') ? ' qs-resume' : '');
    li.querySelector('.tg-body').appendChild(btn);
    const was = btn.onclick;
    btn.onclick = ev => { remember(li.dataset.game); if (was) return was.call(btn, ev); };
  }
  function remember(id) { try { if (S.save) { S.save.lastGame = id; S.persist(); } } catch (e) { /* fine */ } }

  function build() {
    const box = $('#title-actions');
    if (!box || box.querySelector('#t-start') || box.querySelector('.tg-track')) return;
    const go = box.querySelector(CONTINUE), neu = box.querySelector('#ds-new, #t-new, #t-new2'), mp = box.querySelector('#t-mp');
    const help = box.querySelector('#t-help'), old = box.querySelector('#t-modes');
    if (old) old.remove();
    const list = document.createElement('ul');
    list.className = 'tg-list';
    // Story.
    const ch = go ? chapterOf() : 1, used = [ch];
    const story = card('story', `${band(ch, go ? leadFace() : 'freya', 'story')}<div class="tg-body"><p class="tg-name">${go ? 'The story' : 'Keys to the Cloud'}</p>
      <p class="tg-meta">${go ? esc(storyLine()) : 'The story, from the opening'}</p></div>`);
    list.appendChild(story);
    if (go) { if (!go.classList.contains('qs-resume')) go.textContent = 'Continue'; adopt(story, go, false); }
    else if (neu) adopt(story, neu, true);
    // Modes.
    (SD.modes ? SD.modes.list() : []).forEach(m => {
      const a = ART[m.id] || {}; let bg = a.bg;
      if (bg && used.includes(bg)) bg = SPARE.find(n => !used.includes(n));
      if (bg) used.push(bg);
      let st = ''; try { st = m.status ? m.status() || '' : ''; } catch (e) { st = ''; }
      const face = typeof a.face === 'function' ? a.face() : a.face;
      const li = card(m.id, `${bg || hasLoop(m.id) ? band(bg, face, m.id) : `<div class="tg-art tg-plain" aria-hidden="true"><span class="tg-icon">${esc(m.icon || '🎴')}</span></div>`}
        <div class="tg-body"><p class="tg-name">${esc(m.name)}</p>
        <p class="tg-meta">${st ? `<span class="tg-tag">In progress</span> ${esc(st)}` : esc([mins(m), host(m.host) && 'with ' + host(m.host)].filter(Boolean).join(' · '))}</p>
        <button class="ghost tg-go" type="button">${st ? 'Resume' : 'Play'}<span class="sr"> ${esc(m.name)}</span></button></div>`);
      li.querySelector('.tg-go').onclick = () => { remember(m.id); U.closePanel(); m.start({}); };
      list.appendChild(li);
    });
    // Multiplayer.
    if (mp) {
      const li = card('mp', `${band(ART.mp.bg, null, 'mp')}<div class="tg-body"><p class="tg-name">Multiplayer</p><p class="tg-meta">Expedition raids, solo, with bots or friends</p></div>`);
      mp.textContent = 'Join';
      adopt(li, mp, false);
      list.appendChild(li);
    }
    // What's left (New game when there's a save, How to play) waits off screen for the ☰ menu.
    hidden = document.createElement('div');
    hidden.className = 'tg-hidden'; hidden.hidden = true;
    [go && neu, go && help].forEach(b => { if (b) hidden.appendChild(b); });
    // A fresh save keeps How to play on the title, under the cards (UX design seat); with a save it moves to ☰.
    const extra = document.createElement('div');
    extra.className = 'tg-extra';
    if (!go && help) extra.appendChild(help);
    box.innerHTML = '';
    const track = document.createElement('div');
    track.className = 'tg-track';
    track.setAttribute('role', 'region'); track.setAttribute('aria-label', 'Games');
    track.appendChild(list);
    const n = list.children.length;
    const dots = document.createElement('div');
    dots.className = 'tg-dots'; dots.setAttribute('aria-hidden', 'true');
    dots.innerHTML = Array.from({ length: n }, () => '<i></i>').join('');
    const prev = document.createElement('button'), next = document.createElement('button');
    prev.className = 'tg-arrow tg-prev'; next.className = 'tg-arrow tg-next';
    prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Previous game'); next.setAttribute('aria-label', 'Next game');
    prev.textContent = '‹'; next.textContent = '›';
    box.append(track, dots, prev, next, extra, hidden);
    box.classList.add('tg-on');
    menuButton();

    const cards = [...list.children];
    const step = () => (cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
    const at = () => Math.max(0, Math.min(n - 1, Math.round(track.scrollLeft / step())));
    const mark = () => {
      const i = at();
      cards.forEach((c, k) => c.classList.toggle('on', k === i));
      [...dots.children].forEach((d, k) => d.classList.toggle('on', k === i));
      prev.disabled = i === 0; next.disabled = i === n - 1;
      playOnly(cards[i]);
    };
    const go2 = (i, smooth) => track.scrollTo({ left: cards[Math.max(0, Math.min(n - 1, i))].offsetLeft - cards[0].offsetLeft, behavior: smooth && !reduced() ? 'smooth' : 'auto' });
    track.addEventListener('scroll', () => requestAnimationFrame(mark), { passive: true });
    prev.onclick = () => go2(at() - 1, true); next.onclick = () => go2(at() + 1, true);
    // Tapping a card that isn't the centred one brings it in first; Tab brings each card in.
    cards.forEach((c, k) => {
      c.addEventListener('click', ev => { if (k !== at() && !ev.target.closest('.tg-go')) go2(k, true); });
      c.addEventListener('focusin', () => { if (k !== at()) go2(k, false); });
    });
    const last = S.save && S.save.lastGame, start = Math.max(0, cards.findIndex(c => c.dataset.game === last));
    requestAnimationFrame(() => { go2(start, false); mark(); });
    mark();
  }
  const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // The ☰ button, top left of the title (the hub has its own). Only after PRESS START.
  function menuButton() {
    let b = $('#t-menu');
    if (!b) {
      b = document.createElement('button');
      b.id = 't-menu'; b.type = 'button'; b.className = 'ghost tg-menu'; b.textContent = '☰';
      b.setAttribute('aria-label', 'Menu');
      b.onclick = () => SD.main.menu();
      $('#screen-title').appendChild(b);
    }
    b.hidden = false;
  }

  TG.newGame = () => (hidden && hidden.isConnected && hidden.querySelector('#ds-new, #t-new, #t-new2')) || null;
  TG.help = () => (hidden && hidden.isConnected && hidden.querySelector('#t-help')) || $('#title-actions #t-help');
  TG.build = build;

  const css = document.createElement('style');
  css.textContent = `
    #screen-title.has-today:has(.tg-menu:not([hidden])) { padding-top: calc(54px + env(safe-area-inset-top, 0px)); padding-bottom: 12px; }
    #screen-title.has-today:has(.tg-menu:not([hidden])) .t-foot { position: static; margin-top: 8px; }
    #title-actions.tg-on { display: block; position: relative; width: min(100%, 520px); margin-inline: auto; }
    .tg-track { overflow-x: auto; overflow-y: hidden; scroll-snap-type: x mandatory; scroll-padding-inline: 16px;
      scrollbar-width: none; -webkit-overflow-scrolling: touch; overscroll-behavior-x: contain; }
    .tg-track::-webkit-scrollbar { display: none; }
    .tg-list { display: flex; gap: 12px; list-style: none; margin: 0; padding: 4px 16px 6px; }
    .tg-card { flex: 0 0 calc(100% - 64px); max-width: 320px; scroll-snap-align: start; display: flex; flex-direction: column;
      background: linear-gradient(#2a2536, #1d1a26); border: 2px solid #0c0a10; border-radius: 14px; overflow: hidden;
      box-shadow: 0 4px 0 #0c0a10; transform: scale(.94); filter: brightness(.72) saturate(.85);
      transition: transform .2s ease-out, filter .2s ease-out, border-color .2s ease-out; text-align: left; }
    .tg-card.on { transform: none; filter: none; border-color: #d6b254; }
    .tg-art { position: relative; height: 84px; background: #14121b center / cover no-repeat; image-rendering: pixelated; }
    .tg-art::after { content: ''; position: absolute; inset: 0; background: linear-gradient(transparent 45%, #2a2536); }
    .tg-art.tg-hasvid { height: auto; aspect-ratio: 16 / 9; max-height: clamp(84px, 19vh, 140px); image-rendering: auto; }
    .tg-vid { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    .tg-plain { display: grid; place-items: center; }
    .tg-icon { position: relative; z-index: 1; font-size: 40px; }
    .tg-face { position: absolute; z-index: 1; right: 8px; bottom: -4px; width: 54px; height: auto; image-rendering: pixelated; }
    .tg-sil { filter: brightness(0) drop-shadow(0 0 3px rgba(214, 178, 84, .85)); }
    .tg-body { display: flex; flex-direction: column; gap: 2px; padding: 4px 12px 10px; flex: 1; }
    .tg-name { margin: 0; color: var(--bone, #efe6d2); font-family: Cinzel, serif; font-weight: 700; font-size: 17px; line-height: 1.2; }
    .tg-meta { margin: 0 0 8px; flex: 1; color: #cfc6b4; font: 600 13px/1.35 Nunito, system-ui, sans-serif; }
    .tg-tag { display: inline-block; padding: 0 6px; border-radius: 6px; background: #d6b254; color: #1d1a26; font-weight: 800; font-size: 11px; }
    #title-actions .tg-go { width: 100%; min-height: 44px; margin: 0; font-size: 16px; }
    #title-actions .tg-go small { display: block; font-size: 11px; }
    .tg-dots { display: flex; justify-content: center; gap: 8px; height: 20px; align-items: center; }
    .tg-dots i { width: 6px; height: 6px; border-radius: 3px; background: #6f6787; transition: width .2s ease-out, background .2s; }
    .tg-dots i.on { width: 16px; background: #d6b254; }
    .tg-arrow { display: none; }
    .tg-extra { display: flex; justify-content: center; margin-top: 6px; }
    .tg-extra:empty { display: none; }
    #title-actions .tg-extra button { min-height: 44px; }
    @media (hover: hover) and (pointer: fine) {
      .tg-arrow { display: block; position: absolute; top: 56px; width: 34px; height: 34px; padding: 0; border-radius: 50%;
        border: 2px solid #0c0a10; background: #3a3448; color: #efe6d2; font-size: 22px; line-height: 1; cursor: pointer; z-index: 2; }
      .tg-prev { left: 0; } .tg-next { right: 0; }
      .tg-arrow:disabled { opacity: .3; cursor: default; }
    }
    .tg-menu { position: absolute; top: calc(12px + env(safe-area-inset-top, 0px)); left: max(16px, env(safe-area-inset-left, 0px));
      z-index: 3; background: #2e2a3a; color: var(--bone, #efe6d2); min-width: 44px; min-height: 44px; font-size: 20px; }
    #screen-title:not(.has-today) .tg-menu { display: none; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @media (orientation: landscape) and (max-height: 420px) {
      #screen-title.has-today #title-actions.tg-on { display: block; width: 100%; max-width: 400px; }
      .tg-card { flex-basis: 168px; }
      #screen-title.has-today:has(.tg-menu:not([hidden])) { padding-top: calc(8px + env(safe-area-inset-top, 0px)); }
      .tg-art, .tg-art.tg-hasvid { height: 56px; aspect-ratio: auto; }
      .tg-face { width: 38px; }
      .tg-name { font-size: 14px; }
      .tg-meta { font-size: 11.5px; }
      #screen-title.has-today #title-actions .tg-go { min-height: 36px; font-size: 14px; white-space: normal; padding-inline: 8px; }
      .tg-dots, .tg-arrow { display: none; }
    }
    @media (prefers-reduced-motion: reduce) {
      .tg-card, .tg-dots i { transition: none; }
      .tg-card { transform: none; }
    }`;
  document.head.appendChild(css);

  const boot = () => {
    const M = SD.main, title = M.title;
    M.title = function () { title.apply(this, arguments); build(); };
    if (!$('#screen-title').hidden) build();
  };
  // After every other title patch, js/quicksave.js included (it boots one tick after DOMContentLoaded too).
  const later = () => setTimeout(() => setTimeout(boot, 0), 0);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', later, { once: true });
  else later();
})();
