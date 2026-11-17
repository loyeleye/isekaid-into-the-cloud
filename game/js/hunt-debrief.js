// Monster Hunt's Debrief as a scene (Ladi, Nov 16: "It's still box heavy rather than showing things live in a scene";
// "You are just making fancier versions of the same menu / text box interface"). After a board, the poster's own exam
// question is asked in the same painted street: Bru stands full size and asks it on a dialogue card pulled down over
// the scene, the monster you just caught sits in its jar beside her (or lurks, if it got away), and the answers are
// cards along the bottom, like the satchel on the boards. She reacts to the verdict: a grin, turned to you, when you
// have it; a frown, with the monster rattling its jar, when you don't. The feedback stays in the scene, on the card.
//
// The question itself is still js/quiz.js's (through SD.modes.ask), untouched: the same text, options, multi-select,
// Type it first, scoring, Wall and feedback. This file only re-homes its nodes while the Debrief is up: each time the
// quiz draws its window, the scene is moved into it and the window's nodes are sorted into the card and the satchel.
// Nothing here knows which option is right before the quiz shows its verdict.
//
// API: SD.huntDebrief.ask(m, ask) → ask()'s result. m: the hunt's monster (a board poster); ask: the call that asks
// the question (js/hunt.js's shell().ask), run inside the scene.
(function () {
  const D = SD.huntDebrief = {};
  // Staging per step (js/hunt-stage-<step>.js): D.stages[step] = { open(ctx), render(ctx), strike(ok, guess, ctx),
  // fit(ctx) }, each optional. ctx: { scene, st, win, card, inn, sat, mode, bru, wide, W, H }. strike returns true when it
  // has played the whole verdict beat itself (Bru's face and line included); otherwise the plain fight's beat plays.
  D.stages = {};
  const stage = () => st && st.bt && D.stages[st.bt];
  const U = SD.ui, esc = s => U.esc(String(s == null ? '' : s));
  const still = () => !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  let st = null;

  // o.battle: the hunt's other questions (Track, Fight, Pin it down, the retry) as a fight in the same street (Ladi,
  // Nov 16: "don't make it a box. Maybe make it like a fight with the options as attacks"): the monster squares up
  // across the street from Bru, the question is its attack, the answers are her attack cards; a right answer lands
  // a slash, a wrong one and it lunges. o.face: its sprite (js/hunt.js's poster portrait).
  D.ask = async function (m, ask, o) {
    const HB = SD.huntBoard;
    if (!HB || !HB.bruOn || !HB.bruHtml || !window.MutationObserver || !document.querySelector('#panel')) return ask();
    open(m, o || {});
    try { return await ask(); } finally { close(); }
  };

  // The monsters on the poster's board, and whether each was contained (the last run's result, or the board's).
  function mons(m) {
    const HC = SD.huntCore, b = HC && m.qs && HC.board(m.qs.board);
    if (!b) return [];
    const last = m.sim && m.sim.last, won = !!(m.res && m.res.sim && m.res.sim.ok);
    return b.mons.slice(0, 2).map(id => ({ id, name: (HC.MONSTERS[id] || {}).name || id, tile: (HC.MONSTERS[id] || {}).tile,
      caught: last && last.contained && id in last.contained ? !!last.contained[id] : won }));
  }

  function open(m, o) {
    const HB = SD.huntBoard, bt = o.battle || null, ms = bt ? [] : mons(m), caught = ms.length ? ms.every(x => x.caught) : true;
    const scene = document.createElement('div');
    scene.className = 'hd-scene';
    // A battle plays in the monster's lair (js/hunt-map.js), each step in a different part of it; a Debrief in the street.
    const HM = SD.huntMap, lair = bt && HM && SD.hunt && SD.hunt._lairOf ? SD.hunt._lairOf(m) : null;
    scene.innerHTML = `<div class="hs-view" aria-hidden="true"><div class="hs-street"><img class="hs-bg" src="${lair ? HM.bg(lair) : HB.STREET}" alt="" decoding="async"></div></div>
      <div class="hd-wash" aria-hidden="true"></div>
      ${HB.bruHtml()}
      <div class="hd-jars">${ms.map(x => `<div class="hd-mon ${x.caught ? 'jarred' : 'loose'}" role="img" aria-label="${esc(x.name)}, ${x.caught ? 'caught in its jar' : 'loose: it got away'}">
        <span class="hd-jar" aria-hidden="true"><img class="hd-spr" src="assets/img/hunt/${esc(x.id)}.webp" alt="" decoding="async"></span></div>`).join('')}${bt ? `<div class="hd-mon loose hd-foe" role="img" aria-label="${esc(m.name)}, squaring up across the street">
        <span class="hd-jar" aria-hidden="true"><img class="hd-spr" src="${esc(o.face || '')}" alt="" decoding="async"><i class="hd-slash"></i></span></div>` : ''}<div class="hd-hp"></div></div>
      <div class="hd-flash" aria-hidden="true"></div>
      <div class="hd-verdict"><div class="hd-stamp" role="status"></div>
        <button type="button" class="hd-nbk" aria-controls="hd-notes" aria-expanded="false" hidden><img src="assets/img/hunt/notebook.webp" alt="" decoding="async"><span>Bru's notes</span></button></div>
      <p class="hs-say hd-say" aria-live="polite" hidden></p>`;
    st = { m, scene, ms, caught, bt, bru: null, mode: null, cTop: 0, sTop: 0, dead: false, reacted: false };
    if (lair) { scene.classList.add('hd-lair'); scene.dataset.lair = lair; scene.style.setProperty('--hm-x', HM.shift(bt) + '%'); }
    if (bt) { scene.classList.add('hd-battle', 'hd-st-' + bt); const g = stage(); if (g && g.open) g.open({ scene, st }); }
    st.obs = new MutationObserver(wrap);
    st.obs.observe(document.querySelector('#panel'), { childList: true, subtree: true });
    st.ro = window.ResizeObserver ? new ResizeObserver(() => fit()) : null;
    st.onResize = () => fit();
    window.addEventListener('resize', st.onResize);
    wrap();
  }
  function close() {
    if (!st) return;
    st.dead = true;
    st.obs.disconnect();
    if (st.ro) st.ro.disconnect();
    window.removeEventListener('resize', st.onResize);
    st.scene.remove();
    st = null;
  }

  // What the window holds: the question ('q'), the verdict and feedback ('f'), or something else on the way ('o':
  // reading a typed answer, its rubric).
  const TOP = '.hn-hp, .q-ctx, .q-ev, .q-q, .tf-said';
  function wrap() {
    if (!st || st.dead) return;
    const p = document.querySelector('#panel'), win = p && !p.hidden ? p.querySelector(':scope > .win.quiz') : null;
    // The window closed after the question was up (Continue, Stop for now, Home): the Debrief is over, whatever its promise does next.
    // (Before the question's first window, the panel is still closed from the board.)
    if (!win) { if (st.seen && p && (p.hidden || !p.firstElementChild)) { st.dead = true; st.obs.disconnect(); } return; }
    st.seen = true;
    if (win.dataset.hd) return;
    const b = win.querySelector(':scope > .win-b');
    if (!b) return;
    win.dataset.hd = '1';
    win.classList.add('hd-win');
    win.prepend(st.scene);
    if (!st.bru) start();
    const mode = b.querySelector(':scope > .verdict-row') ? 'f' : b.querySelector(':scope > :is(.conf, .type-first, .say-first)') ? 'q' : 'o';
    const card = document.createElement('div'), inn = document.createElement('div'), sat = document.createElement('div'), gap = document.createElement('div');
    card.className = 'hd-card'; inn.className = 'hd-in'; sat.className = 'hd-sat'; gap.className = 'hd-gap';
    const BT = { track: 'On its trail', fight: 'It attacks!', pin: 'Pin it down', retry: 'Rematch!' };
    card.innerHTML = `<span class="hd-tag" aria-hidden="true">${mode === 'q' ? (st.bt ? (BT[st.bt] || 'It attacks!') : 'Bru asks') : 'Bru'}</span>`;
    win.classList.toggle('hd-bt', !!st.bt);
    card.appendChild(inn);
    // The health tag (js/hunt.js puts it in every hunt question) hangs on the jar on a wide screen; on a phone it
    // stays at the top of the card, as one small line.
    const hp = b.querySelector('.hn-hp'), slot = st.scene.querySelector('.hd-hp');
    if (hp && innerWidth > 700) { slot.innerHTML = ''; slot.appendChild(hp); }
    else if (hp) { slot.innerHTML = ''; b.prepend(hp); }
    [...b.children].forEach(k => {
      const low = mode === 'q' ? !k.matches(TOP) : k.matches('.q-foot, #q-confirm, #hn-pnext');
      (low ? sat : inn).appendChild(k);
    });
    if (!sat.children.length) sat.classList.add('empty');
    b.append(card, gap, sat);
    win.classList.toggle('hd-f', mode === 'f');
    win.classList.toggle('hd-q', mode === 'q');
    // A redraw of the same question (a tap on an option) keeps where you'd scrolled; a new step drops in from the top.
    if (mode === st.mode && mode === 'q') { inn.scrollTop = st.cTop; sat.scrollTop = st.sTop; }
    else { st.cTop = st.sTop = 0; if (!still()) card.classList.add('hd-drop'); }
    inn.addEventListener('scroll', () => { st.cTop = inn.scrollTop; }, { passive: true });
    sat.addEventListener('scroll', () => { st.sTop = sat.scrollTop; }, { passive: true });
    { const g = stage(); if (g && g.render) g.render({ scene: st.scene, st, win, card, inn, sat, mode, bru: st.bru }); }
    if (mode === 'f' && st.mode !== 'f') verdict(b);
    if (mode === 'f') beats(win, card, inn, sat);
    else { win.classList.remove('hd-notes-open'); st.scene.querySelector('.hd-stamp').innerHTML = ''; st.scene.querySelector('.hd-nbk').hidden = true; }
    // Phones: after picking an answer, bring the confidence buttons into view in the satchel.
    const conf = sat.querySelector('.conf');
    if (mode === 'q' && conf && innerWidth <= 700 && sat.querySelector('[data-o].on') && sat.scrollHeight > sat.clientHeight)
      requestAnimationFrame(() => { sat.scrollTop = Math.max(sat.scrollTop, conf.offsetTop + conf.offsetHeight - sat.clientHeight); });
    st.mode = mode;
    if (st.ro) { st.ro.disconnect(); [win, b, card, sat].forEach(x => st.ro.observe(x)); }
    fit();
  }

  // Bru comes to life the first time the scene is in the page (her blinking and breathing stop once it's gone).
  function start() {
    const HB = SD.huntBoard, ms = st.ms;
    st.bru = HB.bruOn(st.scene);
    if (st.bt) {
      // A fight: she turns side-on to face it across the street.
      st.bru.turn('side');
      const L = { track: 'Fresh tracks. Which way did it go?', fight: 'Here it comes. Pick your move.', pin: 'Pin it down. Why doesn\'t that fit?', retry: 'It hit back! Again, from a new angle.' };
      st.bru.say(`<b>Bru:</b> ${L[st.bt] || L.fight}`);
      return;
    }
    st.bru.turn('three');
    const name = ms.length ? ms.map(x => x.name).join(' and ') : 'It';
    st.bru.say(`<b>Bru:</b> ${st.caught ? `${esc(name)}, in the jar. Now tell me why that worked.` : `${esc(name)} got away. Tell me what would have held it.`}`);
    // On a phone the street pans: start with the monster's spot in view.
    const v = st.scene.querySelector('.hs-view'), t = ms[0] && HB.SPOT && HB.SPOT[ms[0].tile];
    requestAnimationFrame(() => { if (v && t && v.scrollWidth > v.clientWidth) v.scrollLeft = Math.max(0, v.scrollWidth * t[0] / 100 - v.clientWidth * .6); });
  }

  // The verdict is on screen (the answer is committed): Bru and the monster react to it.
  function verdict(b) {
    const v = b.querySelector('.verdict'), ok = !!(v && v.classList.contains('ok')), guess = ok && /GUESS/i.test(v.textContent);
    if (st.bt) return strike(ok, guess);
    const jars = st.scene.querySelectorAll('.hd-mon');
    jars.forEach(j => { j.classList.remove('rattle', 'cowed'); void j.offsetWidth; j.classList.add(ok ? 'cowed' : 'rattle'); });
    if (ok) {
      st.bru.turn('front');
      st.bru.react(guess ? 'smile' : 'grin', 1e9);
      st.bru.say(`<b>Bru:</b> ${guess ? 'Right, but that was a guess. It\'ll come back to you.' : st.caught ? 'That\'s it. That\'s why the lid stays on.' : 'That\'s it. Next time it stays in the jar.'}`);
    } else {
      st.bru.react('frown', 1e9);
      st.bru.say(`<b>Bru:</b> ${st.caught ? 'Hear that rattle? Not quite. Read why.' : 'Not quite. Read why.'}`);
    }
  }

  // In a fight: right, Bru's move lands (a slash across it, it reels); wrong, it lunges at her (the street shakes,
  // a red flash, she winces).
  function strike(ok, guess) {
    const g = stage();
    if (g && g.strike && g.strike(ok, guess, { scene: st.scene, st, bru: st.bru }) === true) return;
    const foe = st.scene.querySelector('.hd-foe'), sc = st.scene;
    const re = (el, c) => { if (!el) return; el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
    if (foe) foe.classList.remove('hit', 'lunge');
    sc.classList.remove('hd-shake', 'hd-hurt');
    if (ok) {
      if (!still()) { re(foe, 'hit'); }
      else if (foe) foe.classList.add('hit');
      st.bru.react(guess ? 'smile' : 'grin', 1e9);
      st.bru.say(`<b>Bru:</b> ${guess ? 'It landed, but that was a guess. It\'ll come back to you.' : st.bt === 'track' ? 'There it is. Good eye.' : st.bt === 'pin' ? 'Pinned. That\'s the reason.' : 'Direct hit!'}`);
    } else {
      if (!still()) { re(foe, 'lunge'); re(sc, 'hd-shake'); re(sc, 'hd-hurt'); }
      else if (foe) foe.classList.add('lunge');
      st.bru.react('wince', 800);
      setTimeout(() => { if (st && st.bru) st.bru.react('frown', 1e9); }, 820);
      st.bru.say(`<b>Bru:</b> ${st.bt === 'track' ? 'Dead end. It went the other way. Read why.' : 'Ugh! It hit back. Read why.'}`);
    }
  }

  // The verdict as a beat in the scene, not a box (Ladi, Nov 16: "Change the Correct / Not Quite text box"): the
  // verdict is an ink stamp slammed down by the jar, with its badges (Trust, From memory) under it; Bru says the why
  // herself, in a big speech bubble (the answer when you missed it, the warning when you were sure and wrong, the
  // reason); everything else the feedback had (the question, the AWS docs, Pip's almost-pick, why not the others, the
  // help buttons, the confusion compass) is in Bru's notes, a tap away, pulled down over the street.
  const TALK = ':scope > :is(.mode-note, .warn, p.muted.small, .why, .hn-oneline)';
  function beats(win, card, inn, sat) {
    const stamp = st.scene.querySelector('.hd-stamp'), say = st.scene.querySelector('.hd-say');
    const vr = inn.querySelector(':scope > .verdict-row');
    if (vr) { stamp.innerHTML = ''; stamp.appendChild(vr); if (!still()) { stamp.classList.remove('slam'); void stamp.offsetWidth; stamp.classList.add('slam'); } }
    // Only the notes that sit before the recap belong to Bru's line (a muted note further down is the notes').
    const talk = [];
    for (const k of [...inn.children]) { if (k.matches('.recap, details, .src, .nots, .help-row, .compass')) break; if (k.matches(TALK.replace(':scope > ', ''))) talk.push(k); }
    const why = inn.querySelector(':scope > .why'); if (why && !talk.includes(why)) talk.push(why);
    let box = say.querySelector('.hd-why');
    if (box) box.remove();
    box = document.createElement('div'); box.className = 'hd-why';
    talk.forEach(k => box.appendChild(k));
    say.appendChild(box); say.hidden = false; say.classList.add('hd-long');
    // Bru's notes (Ladi, Nov 16): a notebook under the verdict; tap it and it flies up and opens onto a high-tech
    // notebook screen with the rest of the feedback, sections listed along the top. Same nodes, same handlers.
    card.classList.add('hd-notes'); card.id = 'hd-notes';
    card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', 'Bru\'s notes');
    const tag = card.querySelector('.hd-tag'); if (tag) tag.remove();
    const SEC = [['.q-recap', 'The question'], ['[class^="rc-"], .recall', 'What you wrote'], ['.q-src', 'AWS docs'], ['.tiers', 'The ranking'], ['.whynot', 'Pip\'s almost-pick'], ['.nots', 'Why not the others'], ['.help-row', 'Help'], ['.compass', 'What tripped you up']];
    const secs = [];
    [...inn.children].forEach(k => { const f = SEC.find(([q]) => k.matches(q)); if (f && !secs.some(x => x[1] === f[1])) { k.dataset.sec = f[1]; secs.push([k, f[1]]); } });
    const head = document.createElement('div'); head.className = 'hd-nh';
    head.innerHTML = `<img src="assets/img/hunt/notebook.webp" alt="" class="hd-nhi"><div class="hd-nht"><b>BRU'S NOTES</b><span>${esc(st.ms.map(x => x.name).join(' · ') || 'Debrief')}</span></div>
      <button type="button" class="hd-nx" aria-label="Close Bru's notes">✕</button>
      <div class="hd-nav" role="tablist" aria-label="Sections">${secs.map(([, n], i) => `<button type="button" role="tab" id="hd-t${i}" aria-controls="hd-s${i}" data-i="${i}">${esc(n)}</button>`).join('')}</div>`;
    card.prepend(head);
    carousel(card, inn, head, secs);
    const book = st.scene.querySelector('.hd-nbk');
    book.hidden = !secs.length;
    const set = (on, anim) => {
      win.classList.toggle('hd-notes-open', on); book.setAttribute('aria-expanded', String(on)); st.notes = on;
      st.scene.classList.toggle('hd-quiet', on && innerWidth <= 700);   // now, not in fit(): fit() skips a scene the notes squeezed to nothing
      fit();   // first: on a phone the verdict hides while the notes are open, and a hidden button can't take focus
      if (on) { if (anim && !still()) openAnim(book, card); head.querySelector('.hd-nx').focus({ preventScroll: true }); }
      else if (anim) { book.focus({ preventScroll: true }); const re = () => { if (document.activeElement !== book && book.isConnected && !st.notes) book.focus({ preventScroll: true }); }; requestAnimationFrame(re); setTimeout(re, 150); }
    };
    book.onclick = () => set(!win.classList.contains('hd-notes-open'), true);
    head.querySelector('.hd-nx').onclick = () => set(false, true);
    card.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); set(false, true); } };
    set(!!st.notes, false);
    sat.classList.remove('empty');
  }

  // Each section of the notes is a slide in one horizontal carousel (Ladi, Nov 16: "Make each subsection its own
  // horizontal carousel that moves in a high tech animated way"): the tabs along the top, ‹ › and a counter along the
  // bottom, swipe on a phone, ← → on a keyboard. A move slides the track and sweeps a cyan scanline over the new
  // slide, which resolves out of a glitch. Slides out of view are inert. Nodes that aren't a section ride with the
  // section before them (or the first).
  function carousel(card, inn, head, secs) {
    if (!secs.length) return;
    const track = document.createElement('div'); track.className = 'hd-track';
    const slides = secs.map(([, n], i) => { const d = document.createElement('section'); d.className = 'hd-slide'; d.id = 'hd-s' + i; d.setAttribute('role', 'tabpanel'); d.setAttribute('aria-labelledby', 'hd-t' + i); d.setAttribute('aria-roledescription', 'slide'); d.dataset.n = `${i + 1} / ${secs.length}`; return d; });
    let cur = 0;
    [...inn.children].forEach(k => { const j = secs.findIndex(x => x[0] === k); if (j >= 0) cur = j; slides[cur].appendChild(k); });
    slides.forEach(d => track.appendChild(d));
    inn.appendChild(track); inn.classList.add('hd-car');
    const scan = document.createElement('div'); scan.className = 'hd-scan'; scan.setAttribute('aria-hidden', 'true'); inn.appendChild(scan);
    const foot = document.createElement('div'); foot.className = 'hd-cf';
    foot.innerHTML = `<button type="button" class="hd-pv" aria-label="Previous section">‹</button><span class="hd-ct" aria-live="polite"></span><span class="hd-dots" aria-hidden="true">${secs.map(() => '<i></i>').join('')}</span><button type="button" class="hd-nv" aria-label="Next section">›</button>`;
    card.appendChild(foot);
    const tabs = [...head.querySelectorAll('.hd-nav [role="tab"]')], dots = [...foot.querySelectorAll('.hd-dots i')];
    const go = (i, anim) => {
      i = Math.max(0, Math.min(secs.length - 1, i));
      const from = st.slide || 0; st.slide = i;
      track.style.transform = `translateX(${-i * 100}%)`;
      slides.forEach((d, j) => { const on = j === i; d.inert = !on; d.setAttribute('aria-hidden', String(!on)); d.classList.toggle('on', on); });
      tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      dots.forEach((d, j) => d.classList.toggle('on', j === i));
      foot.querySelector('.hd-ct').textContent = `${i + 1} / ${secs.length} · ${secs[i][1]}`;
      foot.querySelector('.hd-pv').disabled = i === 0; foot.querySelector('.hd-nv').disabled = i === secs.length - 1;
      tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (anim && !still() && i !== from) {
        inn.dataset.dir = i > from ? 'r' : 'l';
        [scan, slides[i]].forEach(x => { x.classList.remove('go'); void x.offsetWidth; x.classList.add('go'); });
      }
      if (secs[i][0].tagName === 'DETAILS' && anim) secs[i][0].open = true;
    };
    tabs.forEach((t, j) => { t.onclick = () => go(j, true); });
    foot.querySelector('.hd-pv').onclick = () => go(st.slide - 1, true);
    foot.querySelector('.hd-nv').onclick = () => go(st.slide + 1, true);
    head.querySelector('.hd-nav').onkeydown = e => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (d) { e.preventDefault(); go(st.slide + d, true); tabs[st.slide].focus(); }
    };
    card.addEventListener('keydown', e => {
      if (e.target.closest('input, textarea, .hd-nav')) return;
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); go(st.slide + (e.key === 'ArrowRight' ? 1 : -1), true); }
    });
    // Swipe: a mostly-sideways drag of 40px or more turns the page.
    let x0 = null, y0 = 0;
    inn.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } }, { passive: true });
    inn.addEventListener('pointerup', e => { if (x0 == null) return; const dx = e.clientX - x0, dy = e.clientY - y0; x0 = null; if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.4) go(st.slide + (dx < 0 ? 1 : -1), true); });
    inn.addEventListener('pointercancel', () => { x0 = null; });
    go(Math.min(st.slide || 0, secs.length - 1), false);
  }

  // The notebook flies up from under the verdict, its cover swings open, and the notes screen grows out of it.
  function openAnim(book, card) {
    const img = book.querySelector('img'), r = img.getBoundingClientRect(), c = card.getBoundingClientRect();
    if (!r.width || !c.width || !img.animate) return;
    const fly = document.createElement('div'); fly.className = 'hd-fly';
    fly.innerHTML = `<div class="hd-fly-p"></div><img class="hd-fly-c" src="${img.src}" alt="">`;
    const w = Math.min(220, c.width * .5), h = w * r.height / r.width;
    Object.assign(fly.style, { left: (c.left + c.width / 2 - w / 2) + 'px', top: (c.top + c.height / 2 - h / 2) + 'px', width: w + 'px', height: h + 'px' });
    document.body.appendChild(fly);
    const dx = r.left - (c.left + c.width / 2 - w / 2), dy = r.top - (c.top + c.height / 2 - h / 2), k = r.width / w;
    fly.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${k})` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(.3, 1.2, .5, 1)' });
    fly.querySelector('.hd-fly-c').animate([{ transform: 'perspective(900px) rotateY(0)' }, { transform: 'perspective(900px) rotateY(0)', offset: .45 }, { transform: 'perspective(900px) rotateY(-165deg)', opacity: .9 }], { duration: 620, easing: 'ease-in', fill: 'forwards' });
    card.animate([{ opacity: 0, transform: 'scale(.35)' }, { opacity: 0, transform: 'scale(.35)', offset: .55 }, { opacity: 1, transform: 'none' }], { duration: 760, easing: 'cubic-bezier(.2, 1.1, .4, 1)' });
    fly.animate([{ opacity: 1 }, { opacity: 1, offset: .7 }, { opacity: 0 }], { duration: 760 }).onfinish = () => fly.remove();
  }

  // Where Bru, her line and the jar stand: worked out from the card and the satchel, so her face stays in the gap
  // between them on a phone, and the card starts at her shoulder on a wide screen.
  function fit() {
    if (!st || !st.scene.isConnected) return;
    // Layout sizes, not boxes: the window pops in scaled, and the card drops in.
    const sc = st.scene, win = sc.parentElement;
    const card = win.querySelector('.hd-card'), sat = win.querySelector('.hd-sat');
    const W = sc.offsetWidth, H = sc.offsetHeight;
    if (!W || !H) return;
    const wide = innerWidth > 700;
    const b = card && card.parentElement, bt = b ? b.offsetTop : 0;
    const cb = card ? bt + card.offsetTop + card.offsetHeight : 0;
    const satTop = sat && !sat.classList.contains('empty') && sat.offsetHeight ? bt + sat.offsetTop : H;
    const cl = (a, x, z) => Math.max(a, Math.min(z, x));
    let bh, bl;
    if (wide) { bh = Math.min(H * .78, 620); bl = Math.max(4, Math.round(innerWidth * .02)); }
    else { bh = cl(H * .3, (H - cb) / .95, H * .72); bl = 0; }
    const bw = bh * 475 / 900, gapH = satTop - cb;
    const js = wide ? cl(80, bh * .2, 128) : cl(48, (gapH - 22) / 1.1, 92);
    const set = (el, k, v) => el.style.setProperty(k, Math.round(v) + 'px');
    set(sc, '--hd-bh', bh); set(sc, '--hd-bl', bl); set(sc, '--hd-js', js);
    set(win, '--hd-cl', wide ? bl + bw + 12 : 8); set(win, '--hd-sl', wide ? bl + bw * .62 : 0);
    const jars = sc.querySelector('.hd-jars');
    if (wide) { set(jars, '--hd-jx', bl + bw * .7); jars.style.right = 'auto'; }
    else { jars.style.removeProperty('--hd-jx'); jars.style.right = '8px'; }
    set(jars, '--hd-jb', H - satTop + 4);
    const say = sc.querySelector('.hd-say');
    if (wide) {
      // Over her head, with the tail pointing down at her.
      set(say, '--hd-sx', bl + 4); set(say, '--hd-sb', bh * .985 + 10); set(say, '--hd-sw', Math.max(160, Math.min(320, bw + 12 - 24)));
      say.style.top = 'auto';
    } else {
      // Beside her face, in the gap, left of the jar.
      const x = bw * .64;
      set(say, '--hd-sx', x); set(say, '--hd-sw', Math.max(110, W - x - js - 30));
      say.style.top = Math.round(cb + 6) + 'px'; say.style.removeProperty('--hd-sb');
      set(say, '--hd-sh', Math.max(40, gapH - 12));
    }
    if (st.bt) {
      // The fight: it stands across the street, big, and its lunge reaches Bru.
      const fs = wide ? cl(140, bh * .42, 280) : cl(70, js * 1.25, 130);
      set(jars, '--hd-fs', fs); jars.style.setProperty('--hd-fx', wide ? '6%' : '8px');
      set(jars, '--hd-lx', Math.max(60, W - (wide ? W * .06 : 8) - fs - (bl + bw * .8)));
      const g = stage(); if (g && g.fit) g.fit({ scene: sc, st, win, wide, W, H, bh, bw, bl, satTop, cardBottom: cb });
    }
    if (win.classList.contains('hd-f')) {
      // The verdict beat: Bru stands taller, her line beside her head (wide) or over it (phone), the stamp by the jar.
      const notes = win.classList.contains('hd-notes-open');
      const fbh = wide ? bh : cl(H * .34, H * .44, (satTop - 60));
      sc.style.setProperty('--hd-bh', Math.round(fbh) + 'px');
      const fbw = fbh * 475 / 900, stamp = sc.querySelector('.hd-verdict');
      if (wide) {
        const x = bl + fbw * .78;
        if (st.bt) {
          // A fight: the foe holds the right of the street, so the stamp column (stamp, badges, notebook) sits over
          // her line, under the title bar, and her line runs below it up to the foe.
          const wh = win.querySelector(':scope > .win-h'), ty = 8 + (wh && getComputedStyle(wh).position !== 'absolute' ? wh.offsetHeight : 0);
          const fs = parseFloat(jars.style.getPropertyValue('--hd-fs')) || 200, sw = Math.max(300, Math.min(640, W - x - fs - W * .06 - 40));
          set(stamp, '--hd-tx', x); set(stamp, '--hd-ty', ty);
          const sTop = Math.max(ty + (stamp.offsetHeight || 120) + 10, Math.round(H - fbh * .98));
          set(say, '--hd-sx', x); set(say, '--hd-sw', sw); say.style.top = sTop + 'px';
          set(say, '--hd-sh', Math.max(120, satTop - sTop - 16)); say.style.removeProperty('--hd-sb');
        } else {
        set(say, '--hd-sx', x); set(say, '--hd-sw', Math.min(640, W - x - js - 60)); say.style.top = Math.round(H - fbh * .98) + 'px';
        set(say, '--hd-sh', Math.max(120, satTop - (H - fbh * .98) - 16)); say.style.removeProperty('--hd-sb');
        set(jars, '--hd-jx', x + Math.min(640, W - x - js - 60) + 24);
        set(stamp, '--hd-tx', x + Math.min(640, W - x - js - 60) + 8); set(stamp, '--hd-ty', Math.max(10, H - fbh * .98 - 6));
        }
      } else {
        const wh = win.querySelector(':scope > .win-h'), ty = 8 + (wh && getComputedStyle(wh).position !== 'absolute' ? wh.offsetHeight : 0);
        set(stamp, '--hd-tx', 12); set(stamp, '--hd-ty', ty);
        // Her line starts under the stamp column (stamp, badges, notebook), wherever the title bar put it.
        set(say, '--hd-sx', 8); set(say, '--hd-sw', W - 16); const sTop = ty + (stamp.offsetHeight || 60) + 10; say.style.top = sTop + 'px';
        set(say, '--hd-sh', Math.max(60, H - fbh * .97 - sTop - 14));
        jars.style.right = '8px'; set(jars, '--hd-jb', H - satTop + 4);
      }
      sc.classList.toggle('hd-wide', wide); sc.classList.add('hd-fb'); sc.classList.toggle('hd-quiet', notes && !wide);
      sc.classList.remove('hd-tight');
      return;
    }
    sc.classList.remove('hd-fb', 'hd-quiet');
    sc.classList.toggle('hd-wide', wide);
    sc.classList.toggle('hd-tight', !wide && gapH < 64);
  }

  const css = document.createElement('style');
  css.textContent = `
    /* The window is the scene: no box, the street behind everything. */
    #panel .win.hd-win { background: #0c0a10 !important; overflow: hidden; display: flex; flex-direction: column; }
    /* Off the full-screen stage (the Today card's link), the window still gets the room a scene needs. */
    body:not(.in-mode) #panel .win.hd-win { height: min(90vh, 860px); width: min(96vw, 1100px); max-width: none; }
    #panel .win.hd-win > .win-h { position: relative; z-index: 3; background: linear-gradient(rgba(6, 5, 10, .8), rgba(6, 5, 10, 0)) !important; border: 0; }
    #panel .win.hd-win > .win-b { position: relative; z-index: 2; flex: 1; min-height: 0; padding: 0 !important; overflow: hidden !important; background: none !important; box-shadow: none !important;
      display: grid; grid-template-rows: auto minmax(0, 1fr) auto; grid-template-columns: minmax(0, 1fr); container-type: size; }
    .hd-scene { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
    .hd-scene .hs-view { position: absolute; inset: 0; overflow: hidden; }
    .hd-scene .hs-street { left: 0; width: max(100cqw, calc(100cqh * 1584 / 672)); }
    .hd-wash { position: absolute; inset: 0; background: radial-gradient(90% 70% at 30% 70%, transparent, rgba(6, 5, 10, .55)), linear-gradient(rgba(6, 5, 10, .45), rgba(6, 5, 10, .1) 40%, rgba(6, 5, 10, .55)); }
    .hd-scene .hs-bru { left: var(--hd-bl, 2vw); height: var(--hd-bh, 78%); z-index: 1; }
    /* Bru's line: over her head on a wide screen, beside her face on a phone */
    .hd-scene .hs-say.hd-say { left: var(--hd-sx, 12px); bottom: var(--hd-sb, auto); width: max-content; max-width: var(--hd-sw, 280px); max-height: var(--hd-sh, none); overflow: hidden; z-index: 4; font-size: 15px; }
    .hd-scene.hd-wide .hs-say.hd-say::before { left: 34px; bottom: -14px; border: 8px solid transparent; border-top: 14px solid #2a2018; border-bottom: 0; }
    .hd-scene.hd-wide .hs-say.hd-say::after { left: 36px; bottom: -10px; border: 6px solid transparent; border-top: 11px solid #fbf5e3; border-bottom: 0; }
    .hd-scene:not(.hd-wide) .hs-say.hd-say { font-size: 13px; padding: 6px 9px; border-radius: 12px; }
    .hd-scene:not(.hd-wide) .hs-say.hd-say::before { left: -12px; top: 12px; bottom: auto; }
    .hd-scene:not(.hd-wide) .hs-say.hd-say::after { left: -8px; top: 14px; bottom: auto; }
    .hd-scene.hd-tight .hs-say.hd-say { clip-path: inset(50%); }
    /* The jar (or the monster loose), beside her */
    .hd-jars { position: absolute; z-index: 3; left: var(--hd-jx, auto); bottom: var(--hd-jb, 30%); display: flex; align-items: flex-end; gap: 6px; flex-direction: column; }
    .hd-jars > .hd-mon + .hd-mon { margin-top: -6px; }
    .hd-mon { position: relative; display: grid; place-items: center; }
    .hd-jar { position: relative; display: grid; place-items: center; width: var(--hd-js, 96px); height: calc(var(--hd-js, 96px) * 1.1); box-sizing: border-box;
      border: 3px solid rgba(200, 230, 255, .75); border-top-width: 2px; border-radius: 16px 16px 22px 22px;
      background: linear-gradient(100deg, rgba(255, 255, 255, .22) 0 14%, transparent 15% 70%, rgba(255, 255, 255, .1) 71% 78%, transparent 79%), rgba(140, 200, 230, .12);
      box-shadow: inset 0 -10px 16px rgba(120, 190, 220, .25), 0 0 14px rgba(150, 210, 240, .3), 0 8px 10px rgba(0, 0, 0, .5); }
    .hd-jar::before { content: ''; position: absolute; top: -12px; left: 10%; right: 10%; height: 10px; border-radius: 4px; background: linear-gradient(#a07a3a, #6a4a1e); border: 2px solid #3a2a14; }
    .hd-spr { width: 78%; height: auto; image-rendering: pixelated; animation: hdLurk 2.6s ease-in-out infinite; }
    .hd-mon.jarred .hd-spr { filter: grayscale(.85) brightness(.8); }
    .hd-mon.loose .hd-jar { border: 0; background: none; box-shadow: none; }
    .hd-mon.loose .hd-jar::before { display: none; }
    .hd-mon.loose .hd-spr { width: 100%; filter: drop-shadow(0 0 10px rgba(255, 70, 40, .7)) drop-shadow(0 6px 4px rgba(0, 0, 0, .7)); }
    @keyframes hdLurk { 50% { transform: translateY(-3px) scale(1.02); } }
    /* Wrong: it rattles its jar (or lunges, loose). Right: it shrinks back. */
    .hd-mon.rattle .hd-jar { animation: hdRattle .5s ease-in-out 3; box-shadow: inset 0 -10px 16px rgba(255, 80, 60, .35), 0 0 16px rgba(255, 60, 40, .7), 0 8px 10px rgba(0, 0, 0, .5); }
    .hd-mon.rattle .hd-spr { filter: drop-shadow(0 0 10px rgba(255, 50, 30, .95)); animation: hdBang .25s ease-out 6; }
    .hd-mon.loose.rattle .hd-jar { animation: hdLunge .45s ease-out 2; box-shadow: none; }
    @keyframes hdRattle { 20% { transform: rotate(-7deg) translateX(-3px); } 50% { transform: rotate(6deg) translateX(3px); } 80% { transform: rotate(-3deg); } }
    @keyframes hdBang { 50% { transform: scale(1.12) translateY(-4px); } }
    @keyframes hdLunge { 40% { transform: translateX(-14px) scale(1.15) rotate(-6deg); } }
    .hd-mon.cowed .hd-spr { animation: none; transform: scale(.86) translateY(6%); filter: grayscale(1) brightness(.7); transition: transform .4s, filter .4s; }
    .hd-mon.jarred.cowed .hd-jar { box-shadow: inset 0 -10px 16px rgba(120, 220, 150, .3), 0 0 16px rgba(120, 230, 150, .55), 0 8px 10px rgba(0, 0, 0, .5); }
    .hd-hp:empty { display: none; }
    .hd-hp { order: -1; }
    .hd-hp .hn-hp.hn-inq { margin: 4px 0 0; padding: 3px 8px 3px 4px; gap: 6px; transform: rotate(-1.5deg); font-size: 12px; }
    .hd-hp .hn-hp .hn-por { width: 30px; height: 30px; }
    .hd-hp .hn-hp .hn-por img { width: 30px; height: 30px; }
    .hd-hp .hn-wk { display: none; }
    .hd-hp .hn-hpn > b { font-size: 12px; }
    /* The question card: Bru's dialogue, pulled down over the scene. Paper, dark ink. */
    .hd-card { position: relative; z-index: 2; min-width: 0; margin: 10px 10px 0 var(--hd-cl, 8px); max-width: 860px; min-height: 0; display: flex; flex-direction: column;
      max-height: 38cqh; border-radius: 6px; background: linear-gradient(#fbf5e3, #f0e4c6); box-shadow: 0 0 0 2px #2a2018, 0 10px 24px rgba(0, 0, 0, .6);
      --cream: #f3e9d2; --paper: #eadfc4; --bone: #f8f1df; --ink: #2a2018; --muted: #6a5a48; --line: #b9a780; --blue: #3f5f80; --blue-d: #2a4360; --sun: #b8923a; --mi-ink: #2a2018; --mi-muted: #6a5a48; color: #2a2018; text-shadow: none; }
    @media (min-width: 701px) { .hd-card { max-height: 46cqh; } }
    #panel .hd-win.hd-f .hd-card { max-height: 60cqh; }
    /* Shadows at the top and bottom edges while there's more to scroll (they scroll away at the ends). */
    .hd-in { position: relative; z-index: 1; overflow-y: auto; overscroll-behavior: contain; padding: 14px 14px 12px; min-height: 0; scrollbar-width: thin; border-radius: 6px;
      background: linear-gradient(#fbf5e3 30%, rgba(251, 245, 227, 0)) center top, linear-gradient(rgba(240, 228, 198, 0), #f0e4c6 70%) center bottom,
        radial-gradient(farthest-side at 50% 0, rgba(60, 40, 10, .28), transparent) center top, radial-gradient(farthest-side at 50% 100%, rgba(60, 40, 10, .32), transparent) center bottom,
        linear-gradient(#fbf5e3, #f0e4c6);
      background-repeat: no-repeat; background-size: 100% 36px, 100% 36px, 100% 12px, 100% 12px, 100% 100%; background-attachment: local, local, scroll, scroll, scroll; }
    .hd-tag { position: absolute; z-index: 2; top: -9px; left: 12px; padding: 2px 8px; border: 1px solid #8a6a2a; border-radius: 3px; background: linear-gradient(#3a2c14, #24190c); color: #f0d68a;
      font: 700 11px/1.3 var(--f-head, serif); letter-spacing: .1em; text-transform: uppercase; }
    /* Its tail points at Bru: left on a wide screen, down to her face on a phone. */
    .hd-card::after { content: ''; position: absolute; width: 16px; height: 16px; background: #f4e9cd; box-shadow: 2px 2px 0 #2a2018; left: 22%; bottom: -8px; transform: rotate(45deg); }
    @media (min-width: 701px) { .hd-card::after { left: -8px; top: 34px; bottom: auto; box-shadow: -2px 2px 0 #2a2018; } }
    .hd-card.hd-drop { animation: hdDrop .45s cubic-bezier(.2, 1.3, .4, 1) both; }
    @keyframes hdDrop { from { transform: translateY(-110%); opacity: 0; } to { transform: none; opacity: 1; } }
    .hd-card .q-ctx { color: #6a4a1e; }
    .hd-card .q-q { margin: 0; font-size: 17px; line-height: 1.4; text-wrap: pretty; }
    .hd-card .q-ev { font-size: 12px; }
    .hd-card :is(.opt, .ghost, .row button):not(.primary) { background: #fffaf0; color: #2a2018; border: 1.5px solid #6a5a48; box-shadow: 0 2px 0 rgba(60, 40, 20, .35); }
    .hd-card .opt.on { background: #dbe6f0; border-color: #2a4360; }
    .hd-card a { color: #2a4360; }
    .hd-card .verdict-row { margin-top: 2px; }
    .hd-gap { min-height: 0; }
    .hd-card { grid-row: 1; } .hd-gap { grid-row: 2; } .hd-sat { grid-row: 3; }
    /* The satchel: the answers as cards along the bottom, your confidence at the end. */
    .hd-sat { position: relative; z-index: 2; min-width: 0; min-height: 0; max-height: 48cqh; overflow-y: auto; overscroll-behavior: contain; padding: 18px 12px 0 max(12px, var(--hd-sl, 0px));
      background: linear-gradient(rgba(20, 13, 6, 0), rgba(20, 13, 6, .88) 22px), repeating-linear-gradient(0deg, rgba(0, 0, 0, .12) 0 2px, transparent 2px 6px); scrollbar-width: thin; }
    .hd-sat.empty { display: none; }
    .hd-sat .act-l { margin: 0 0 4px; color: #f0d68a; font-size: 14px; text-shadow: 0 1px 2px #000; }
    .hd-sat > p.muted { margin: 0 0 4px; color: #e6d3a6; text-shadow: 0 1px 2px #000; }
    .hd-sat .opts { margin: 4px 0 8px; gap: 8px; counter-reset: hdopt; }
    @media (min-width: 701px) { .hd-sat .opts { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); } }
    #panel .win.hd-win .hd-sat .opts .opt { position: relative; counter-increment: hdopt; padding: 9px 10px 9px 42px; font-size: 14px; line-height: 1.35; color: #f6ecd6; border: 2px solid #8a6a36; border-radius: 10px;
      background: radial-gradient(80% 60% at 50% 30%, rgba(255, 190, 90, .12), transparent 70%), linear-gradient(#30263a, #1c1620);
      box-shadow: inset 0 0 0 2px #1a1218, inset 0 0 0 3px rgba(255, 210, 130, .14), 0 3px 0 #0c0a10; }
    #panel .win.hd-win .hd-sat .opts .opt::before { content: counter(hdopt, upper-alpha); position: absolute; left: 9px; top: 9px; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%;
      font: 800 13px/1 var(--f-body); color: #2a1c08; background: radial-gradient(circle at 40% 35%, #ffe2a0, #c9a24a); box-shadow: 0 1px 0 #0c0a10; }
    #panel .win.hd-win .hd-sat .opts .opt:hover:not(:disabled) { transform: translateY(-2px); }
    #panel .win.hd-win .hd-sat .opts .opt:focus-visible { outline: 3px solid #ffd27a; outline-offset: 2px; }
    #panel .win.hd-win .hd-sat .opts .opt.on { border-color: #ffd27a; background: radial-gradient(80% 60% at 50% 30%, rgba(255, 210, 120, .34), transparent 75%), linear-gradient(#4a3a22, #251a12);
      box-shadow: inset 0 0 0 2px #1a1218, 0 0 0 2px rgba(255, 200, 90, .35), 0 0 14px rgba(255, 180, 60, .5), 0 3px 0 #0c0a10; }
    #panel .win.hd-win .hd-sat .conf { position: sticky; bottom: 0; margin: 0 -12px 0 calc(-1 * max(12px, var(--hd-sl, 0px))); padding: 8px 12px 10px max(12px, var(--hd-sl, 0px)); border-top: 1px solid rgba(255, 210, 130, .25);
      background: rgba(20, 13, 6, .96); color: #e6d3a6; }
    .hd-sat .conf > .muted { color: #e6d3a6; }
    .hd-sat .conf-b { margin-top: 4px; }
    /* Before an option is picked the stakes still read: dark wood, not a washed-out light button. */
    .hd-sat .conf-b button:disabled { background: rgba(28, 22, 16, .9); color: #cdbb93; border-color: rgba(255, 210, 130, .3); opacity: .8; }
    .hd-sat .conf-b button:disabled .up { color: #8fd6a0; } .hd-sat .conf-b button:disabled .dn { color: #f09a8a; }
    .hd-sat .stake-help { margin: 4px 0 0; color: #c9bca4; }
    .hd-sat :is(.type-first, .say-first, .num, .order-done) { color: #efe6d2; }
    .hd-sat .q-foot { position: static; margin: 0 -12px 0 calc(-1 * max(12px, var(--hd-sl, 0px))); padding: 8px 12px 12px max(12px, var(--hd-sl, 0px)); background: rgba(20, 13, 6, .96); border-top: 1px solid rgba(255, 210, 130, .25); }
    .hd-sat .q-foot .cred-more { color: #e6d3a6; }
    .hd-sat > #q-confirm { margin: 0 0 12px; width: 100%; }
    /* The fight: it squares up across the street; the answers are Bru's attack cards */
    .hd-scene.hd-battle .hd-jars { left: auto !important; right: var(--hd-fx, 6%) !important; bottom: var(--hd-jb, 30%); }
    .hd-foe .hd-jar { width: var(--hd-fs, 170px); height: var(--hd-fs, 170px); }
    .hd-foe .hd-spr { width: 100%; animation: hdSquare 1.8s ease-in-out infinite; filter: drop-shadow(0 0 14px rgba(255, 70, 40, .7)) drop-shadow(0 10px 6px rgba(0, 0, 0, .7)) !important; transform-origin: 50% 90%; }
    @keyframes hdSquare { 50% { transform: translateY(-5px) scale(1.03, .98); } }
    .hd-foe::after { content: ''; position: absolute; left: 10%; right: 10%; bottom: -6px; height: 14px; border-radius: 50%; background: radial-gradient(rgba(0, 0, 0, .6), transparent 70%); z-index: -1; }
    .hd-slash { position: absolute; left: -10%; top: 45%; width: 120%; height: 6px; border-radius: 4px; opacity: 0; pointer-events: none; transform: rotate(-28deg) scaleX(0);
      background: linear-gradient(90deg, transparent, #fff 30%, #bff4ff 50%, #fff 70%, transparent); box-shadow: 0 0 16px #9be9ff, 0 0 30px #5fe0ff; }
    .hd-foe.hit .hd-slash { animation: hdSlash .45s ease-out .05s; }
    @keyframes hdSlash { 0% { opacity: 1; transform: rotate(-28deg) scaleX(0); transform-origin: 0 50%; } 50% { opacity: 1; transform: rotate(-28deg) scaleX(1); } 100% { opacity: 0; transform: rotate(-28deg) scaleX(1) translateY(6px); } }
    .hd-foe.hit .hd-spr { animation: hdReel .6s ease-out .12s, hdSquare 1.8s ease-in-out .8s infinite; }
    @keyframes hdReel { 0% { filter: brightness(3) drop-shadow(0 0 20px #fff); } 30% { transform: translateX(16px) rotate(8deg) scale(.92); } 100% { transform: none; } }
    .hd-foe.lunge .hd-spr { animation: hdLungeFoe .55s cubic-bezier(.4, 0, .2, 1), hdSquare 1.8s ease-in-out .6s infinite; }
    @keyframes hdLungeFoe { 0% { transform: none; } 20% { transform: translateX(10px) scale(.95); } 55% { transform: translateX(calc(-1 * var(--hd-lx, 160px))) scale(1.3) rotate(-8deg); } 100% { transform: none; } }
    .hd-flash { position: absolute; inset: 0; z-index: 4; pointer-events: none; opacity: 0; background: radial-gradient(ellipse at 30% 60%, transparent 30%, rgba(200, 20, 10, .55)); }
    .hd-scene.hd-hurt .hd-flash { animation: hdHurt .6s ease-out .25s; }
    @keyframes hdHurt { 0%, 100% { opacity: 0; } 25% { opacity: 1; } }
    .hd-scene.hd-shake { animation: hdShake .45s ease-in-out .28s; }
    @keyframes hdShake { 15% { transform: translate(-8px, 3px); } 35% { transform: translate(7px, -4px); } 55% { transform: translate(-5px, 2px); } 75% { transform: translate(3px, -1px); } }
    /* The question: its attack, in a jagged red-trimmed bubble from its side of the street */
    #panel .win.hd-bt .hd-card { box-shadow: 0 0 0 2px #2a2018, 0 0 0 4px #8a1a10, 0 10px 24px rgba(0, 0, 0, .6), 0 0 26px rgba(220, 40, 20, .35); }
    #panel .win.hd-bt .hd-tag { background: linear-gradient(#8a1a10, #4a0c06); border-color: #ff7a66; color: #ffe0d8; }
    @media (min-width: 701px) { #panel .win.hd-bt.hd-q .hd-card::after { left: auto; right: 90px; top: auto; bottom: -8px; box-shadow: 2px 2px 0 #8a1a10; } }
    /* Bru's attack cards: an attack glyph on each, a red-gold glow when picked */
    #panel .win.hd-bt .hd-sat .act-l::before { content: '⚔ '; }
    #panel .win.hd-win.hd-bt .hd-sat .opts .opt { padding-right: 40px; }
    #panel .win.hd-win.hd-bt .hd-sat .opts .opt::after { position: absolute; right: 10px; top: 8px; font-size: 18px; filter: drop-shadow(0 0 4px rgba(255, 160, 60, .7)); }
    #panel .win.hd-win.hd-bt .hd-sat .opts .opt:nth-child(4n+1)::after { content: '⚔️'; } #panel .win.hd-win.hd-bt .hd-sat .opts .opt:nth-child(4n+2)::after { content: '🔥'; }
    #panel .win.hd-win.hd-bt .hd-sat .opts .opt:nth-child(4n+3)::after { content: '⚡'; } #panel .win.hd-win.hd-bt .hd-sat .opts .opt:nth-child(4n+4)::after { content: '🗡️'; }
    #panel .win.hd-win.hd-bt .hd-sat .opts .opt.on { border-color: #ff9a5a; background: radial-gradient(80% 60% at 50% 30%, rgba(255, 120, 60, .35), transparent 75%), linear-gradient(#4a2a22, #25140f);
      box-shadow: inset 0 0 0 2px #1a1218, 0 0 0 2px rgba(255, 120, 60, .4), 0 0 18px rgba(255, 100, 40, .6), 0 3px 0 #0c0a10; transform: translateY(-4px); }
    /* The verdict beat */
    .hd-verdict { position: absolute; z-index: 5; left: var(--hd-tx, 10px); top: var(--hd-ty, 8px); pointer-events: none; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
    .hd-scene.hd-battle.hd-wide.hd-fb .hd-verdict { flex-direction: row; align-items: center; gap: 18px; }
    .hd-stamp:empty { display: none; }
    /* The notebook under the verdict: tap it for the rest of the feedback */
    .hd-nbk { pointer-events: auto; display: flex; align-items: center; gap: 8px; margin: 2px 0 0 14px; padding: 4px 12px 4px 4px; border: 0; border-radius: 30px; background: rgba(8, 14, 24, .72); box-shadow: 0 0 0 1px rgba(95, 224, 255, .35), 0 6px 14px rgba(0, 0, 0, .5);
      color: #bfefff; font: 700 13px/1.1 var(--f-body, sans-serif); cursor: pointer; transform: rotate(-3deg); }
    .hd-nbk img { width: 52px; height: auto; filter: drop-shadow(0 4px 4px rgba(0, 0, 0, .6)) drop-shadow(0 0 8px rgba(95, 224, 255, .35)); animation: hdNbk 2.8s ease-in-out infinite; transition: transform .15s; }
    .hd-nbk:hover img, .hd-nbk:focus-visible img { transform: translateY(-3px) rotate(-6deg) scale(1.08); }
    .hd-nbk:focus-visible { outline: 3px solid #5fe0ff; outline-offset: 2px; }
    .hd-nbk[aria-expanded="true"] { opacity: .35; }
    @keyframes hdNbk { 50% { filter: drop-shadow(0 4px 4px rgba(0, 0, 0, .6)) drop-shadow(0 0 14px rgba(95, 224, 255, .75)); } }
    #panel .win.hd-win > .win-b { pointer-events: none; } #panel .win.hd-win > .win-b > :not(.hd-gap) { pointer-events: auto; }
    .hd-fly { position: fixed; z-index: 9999; pointer-events: none; transform-style: preserve-3d; }
    .hd-fly-p { position: absolute; inset: 4% 4% 4% 10%; border-radius: 4px; background: repeating-linear-gradient(#0d1522 0 13px, rgba(95, 224, 255, .25) 13px 14px), #0d1522; box-shadow: 0 0 24px rgba(95, 224, 255, .5); }
    .hd-fly-c { position: absolute; inset: 0; width: 100%; height: 100%; transform-origin: 12% 50%; backface-visibility: hidden; }
    .hd-stamp .verdict-row { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin: 0; }
    .hd-stamp .verdict { margin: 0; padding: 4px 14px 2px; border: 4px double currentColor; border-radius: 8px; transform: rotate(-7deg); background: rgba(10, 8, 6, .35);
      font: 800 clamp(24px, 4.2vw, 42px)/1.05 var(--f-head, serif); letter-spacing: .04em; text-transform: uppercase; text-shadow: 0 2px 0 rgba(0, 0, 0, .6); box-shadow: 0 0 22px rgba(0, 0, 0, .5); }
    .hd-stamp .verdict.ok { color: #7fe0a0; } .hd-stamp .verdict.bad { color: #ff7a66; }
    .hd-stamp .verdict-row > :not(.verdict) { transform: rotate(-3deg); margin-left: 10px; }
    .hd-stamp.slam .verdict { animation: hdSlam .42s cubic-bezier(.3, 1.6, .5, 1) both; }
    @keyframes hdSlam { from { transform: rotate(-16deg) scale(2.6); opacity: 0; } 60% { opacity: 1; } to { transform: rotate(-7deg) scale(1); } }
    .hd-scene.hd-fb .hs-say.hd-say { top: auto; overflow-y: auto; overscroll-behavior: contain; pointer-events: auto; scrollbar-width: thin; width: auto; max-width: var(--hd-sw, 520px); font-size: 15.5px; line-height: 1.45; padding: 12px 16px; }
    .hd-scene.hd-fb.hd-wide .hs-say.hd-say { width: var(--hd-sw); }
    .hd-scene.hd-fb.hd-wide .hs-say.hd-say::before { left: -12px; top: 34px; bottom: auto; border: 8px solid transparent; border-right: 12px solid #2a2018; border-left: 0; }
    .hd-scene.hd-fb.hd-wide .hs-say.hd-say::after { left: -8px; top: 36px; bottom: auto; border: 6px solid transparent; border-right: 10px solid #fbf5e3; border-left: 0; }
    .hd-scene.hd-fb:not(.hd-wide) .hs-say.hd-say { width: var(--hd-sw); box-sizing: border-box; font-size: 14px; padding: 10px 12px; }
    .hd-scene.hd-fb:not(.hd-wide) .hs-say.hd-say::before { left: 44px; top: auto; bottom: -14px; border: 8px solid transparent; border-top: 14px solid #2a2018; border-bottom: 0; }
    .hd-scene.hd-fb:not(.hd-wide) .hs-say.hd-say::after { left: 46px; top: auto; bottom: -10px; border: 6px solid transparent; border-top: 11px solid #fbf5e3; border-bottom: 0; }
    .hd-scene.hd-quiet .hs-say.hd-say, .hd-scene.hd-quiet .hd-verdict { visibility: hidden; }
    .hd-why { margin-top: 8px; color: #2a2018; }
    .hd-why > p, .hd-why .why p { margin: 6px 0 0; }
    .hd-why .why { margin: 0; padding: 0; border: 0; background: none; }
    .hd-why .why-a { display: grid; gap: 2px; padding: 6px 10px; border-left: 3px solid #b8923a; background: rgba(184, 146, 58, .14); border-radius: 4px; }
    .hd-why .q-ctx { color: #6a4a1e; font-size: 11px; }
    .hd-why .warn { color: #8a2a1a; font-weight: 600; }
    .hd-why .muted { color: #6a5a48; }
    #panel .win.hd-win.hd-f:not(.hd-notes-open) .hd-card { display: none; }
    /* Bru's notes: a high-tech notebook over the street. Dark glass, faint ruled grid, cyan trim; the quiz's own
       feedback nodes inside, restyled for it. */
    #panel .win.hd-win.hd-f .hd-card.hd-notes { position: absolute; z-index: 8; inset: 10px; margin: 0 auto; width: auto; max-width: 780px; max-height: none; border-radius: 16px; overflow: hidden;
      background: radial-gradient(120% 60% at 50% 0, rgba(95, 224, 255, .12), transparent 60%), repeating-linear-gradient(0deg, rgba(95, 224, 255, .045) 0 1px, transparent 1px 26px), repeating-linear-gradient(90deg, rgba(95, 224, 255, .03) 0 1px, transparent 1px 26px), linear-gradient(#0f1828, #0a0f19);
      box-shadow: 0 0 0 1px rgba(95, 224, 255, .5), 0 0 0 5px rgba(7, 12, 20, .9), 0 0 0 6px rgba(184, 146, 58, .55), 0 0 40px rgba(95, 224, 255, .18), 0 24px 50px rgba(0, 0, 0, .7);
      --cream: #142033; --paper: #111b2b; --bone: #16233a; --ink: #dbe8f5; --muted: #8fa6bd; --line: rgba(95, 224, 255, .28); --blue: #5fe0ff; --blue-d: #9be9ff; --sun: #e0b85a; --mi-ink: #dbe8f5; --mi-muted: #8fa6bd; color: #dbe8f5; }
    #panel .win.hd-win.hd-f .hd-card.hd-notes::after { display: none; }
    .hd-nh { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 4px 12px; padding: 12px 14px 8px; border-bottom: 1px solid rgba(95, 224, 255, .3); background: linear-gradient(rgba(95, 224, 255, .1), transparent); }
    .hd-nhi { width: 40px; height: auto; filter: drop-shadow(0 0 6px rgba(95, 224, 255, .5)); }
    .hd-nht { display: grid; min-width: 0; } .hd-nht b { font: 800 16px/1.1 var(--f-head, serif); letter-spacing: .16em; color: #9be9ff; text-shadow: 0 0 10px rgba(95, 224, 255, .6); }
    .hd-nht span { font-size: 12px; color: #8fa6bd; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hd-nx { width: 38px; height: 38px; border-radius: 50%; border: 1px solid rgba(95, 224, 255, .5); background: rgba(95, 224, 255, .08); color: #bfefff; font-size: 16px; cursor: pointer; }
    .hd-nx:hover, .hd-nx:focus-visible { background: rgba(95, 224, 255, .22); outline: none; box-shadow: 0 0 0 2px #5fe0ff; }
    .hd-nav { grid-column: 1 / -1; display: flex; gap: 6px; overflow-x: auto; scrollbar-width: none; padding: 2px 0; }
    .hd-nav button { flex: none; padding: 4px 10px; border-radius: 20px; border: 1px solid rgba(95, 224, 255, .35); background: rgba(95, 224, 255, .06); color: #bfefff; font: 600 12px/1.3 var(--f-body, sans-serif); letter-spacing: .02em; cursor: pointer; }
    .hd-nav button:hover, .hd-nav button:focus-visible { background: rgba(95, 224, 255, .2); outline: none; border-color: #5fe0ff; }
    #panel .hd-card.hd-notes .hd-in { flex: 1; padding: 14px 16px 18px; background: none; }
    /* The carousel */
    #panel .hd-card.hd-notes .hd-in.hd-car { position: relative; overflow: hidden; padding: 0; display: flex; touch-action: pan-y; }
    .hd-track { display: flex; width: 100%; flex: none; transition: transform .5s cubic-bezier(.7, 0, .2, 1); }
    .hd-slide { flex: 0 0 100%; min-width: 0; box-sizing: border-box; overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; padding: 16px 16px 18px; }
    .hd-slide > * { margin-top: 0; margin-bottom: 12px; }
    .hd-slide.go { animation: hdGlitch .55s steps(1, end) .12s both, hdRez .6s ease-out .12s both; }
    @keyframes hdGlitch { 0% { clip-path: inset(0 0 72% 0); transform: translateX(6px); } 12% { clip-path: inset(30% 0 40% 0); transform: translateX(-5px); } 24% { clip-path: inset(62% 0 8% 0); transform: translateX(4px); }
      36% { clip-path: inset(10% 0 55% 0); transform: translateX(-3px); } 48%, 100% { clip-path: inset(0); transform: none; } }
    @keyframes hdRez { from { filter: brightness(1.8) saturate(.2) drop-shadow(0 0 6px #5fe0ff); opacity: .4; } to { filter: none; opacity: 1; } }
    .hd-scan { position: absolute; inset: 0; pointer-events: none; opacity: 0; }
    .hd-scan.go { animation: hdScan .6s ease-out; background: linear-gradient(90deg, transparent, rgba(95, 224, 255, .08) 40%, rgba(155, 233, 255, .9) 49%, #fff 50%, rgba(155, 233, 255, .9) 51%, rgba(95, 224, 255, .08) 60%, transparent),
      repeating-linear-gradient(0deg, rgba(95, 224, 255, .07) 0 2px, transparent 2px 4px); background-size: 200% 100%, 100% 100%; }
    [data-dir="l"] > .hd-scan.go { animation-name: hdScanL; }
    @keyframes hdScan { 0% { opacity: 1; background-position: 100% 0, 0 0; } 80% { opacity: 1; } 100% { opacity: 0; background-position: -100% 0, 0 0; } }
    @keyframes hdScanL { 0% { opacity: 1; background-position: -100% 0, 0 0; } 80% { opacity: 1; } 100% { opacity: 0; background-position: 100% 0, 0 0; } }
    .hd-cf { display: grid; grid-template-columns: auto 1fr auto; grid-template-rows: auto auto; align-items: center; gap: 4px 10px; padding: 8px 12px 10px; border-top: 1px solid rgba(95, 224, 255, .3); background: linear-gradient(transparent, rgba(95, 224, 255, .08)); }
    .hd-cf > .hd-pv { grid-column: 1; } .hd-cf > .hd-nv { grid-column: 3; } .hd-cf > :is(.hd-ct, .hd-dots) { grid-column: 2; }
    .hd-cf > :is(.hd-pv, .hd-nv) { grid-row: 1 / span 2; width: 44px; height: 44px; border-radius: 12px; border: 1px solid rgba(95, 224, 255, .5); background: rgba(95, 224, 255, .08); color: #bfefff; font: 700 24px/1 var(--f-body, sans-serif); cursor: pointer; box-shadow: 0 0 12px rgba(95, 224, 255, .15) inset; }
    .hd-cf > :is(.hd-pv, .hd-nv):hover:not(:disabled), .hd-cf > :is(.hd-pv, .hd-nv):focus-visible { background: rgba(95, 224, 255, .22); outline: none; box-shadow: 0 0 0 2px #5fe0ff, 0 0 16px rgba(95, 224, 255, .5); }
    .hd-cf > :disabled { opacity: .3; cursor: default; }
    .hd-ct { text-align: center; font: 600 12px/1.2 var(--f-body, sans-serif); letter-spacing: .08em; text-transform: uppercase; color: #9be9ff; }
    .hd-dots { display: flex; justify-content: center; gap: 6px; }
    .hd-dots i { width: 18px; height: 3px; border-radius: 2px; background: rgba(95, 224, 255, .25); transition: background .3s, box-shadow .3s, width .3s; }
    .hd-dots i.on { width: 30px; background: #5fe0ff; box-shadow: 0 0 8px #5fe0ff; }
    .hd-nav [role="tab"][aria-selected="true"] { background: rgba(95, 224, 255, .28); border-color: #5fe0ff; color: #fff; box-shadow: 0 0 10px rgba(95, 224, 255, .45); }
    #panel .hd-card.hd-notes .hd-in > * { margin-top: 0; margin-bottom: 14px; }
    #panel .hd-card.hd-notes [data-sec] { position: relative; padding: 12px 14px; border: 1px solid rgba(95, 224, 255, .22); border-radius: 10px; background: rgba(13, 21, 34, .75); box-shadow: inset 3px 0 0 rgba(95, 224, 255, .55); }
    #panel .hd-card.hd-notes [data-sec]:is(.help-row, .compass, [class^="rc-"])::before { content: attr(data-sec); display: block; margin: 0 0 6px; font: 700 10.5px/1 var(--f-body, sans-serif); letter-spacing: .14em; text-transform: uppercase; color: #5fe0ff; }
    #panel .hd-card.hd-notes :is(.q-ctx, .qr-lbl) { color: #5fe0ff; }
    #panel .hd-card.hd-notes :is(summary, details) { color: #dbe8f5; }
    #panel .hd-card.hd-notes :is(.qr-peek, .muted, .small) { color: #a9bccf; }
    #panel .hd-card.hd-notes a { color: #9be9ff; }
    #panel .hd-card.hd-notes :is(.whynot, .q-src, .nots, .q-recap, .compass) { border-style: solid !important; }
    #panel .hd-card.hd-notes :is(.opt, .ghost, .row button, .help-b):not(.primary):not(.hd-nx) { background: rgba(95, 224, 255, .07); color: #dbe8f5; border: 1px solid rgba(95, 224, 255, .4); box-shadow: none; }
    #panel .hd-card.hd-notes :is(.opt, .ghost, .help-b):not(.hd-nx):hover { background: rgba(95, 224, 255, .18); }
    #panel .hd-card.hd-notes .helpbox { background: rgba(95, 224, 255, .06); color: #dbe8f5; border-color: rgba(95, 224, 255, .3); }
    #panel .hd-card.hd-notes .hn-hp, #panel .hd-card.hd-notes .hn-hp * { color: #a9bccf; }
    #panel .hd-card.hd-notes .help-row { display: flex; flex-wrap: wrap; gap: 8px; }
    #panel .hd-card.hd-notes .help-row::before { flex-basis: 100%; }
    #panel .hd-card.hd-notes .src-badge.un { background: #3a2c10; color: #f0d68a; }
    @media (prefers-reduced-motion: reduce) {
      .hd-stamp.slam .verdict, .hd-nbk img, .hd-slide.go, .hd-scan.go, .hd-foe .hd-spr, .hd-slash, .hd-flash, .hd-scene.hd-shake { animation: none !important; }
      .hd-track { transition: none; }
      .hd-spr, .hd-mon.rattle .hd-jar, .hd-mon.rattle .hd-spr, .hd-mon.loose.rattle .hd-jar, .hd-card.hd-drop { animation: none !important; }
      .hd-mon.cowed .hd-spr { transition: none; }
    }
    /* phones: the card at the top, the satchel at the bottom, Bru's face and the jar in the gap between */
    @media (max-width: 700px) {
      .hd-card { margin: 8px 8px 0; }
      #panel .hd-win.hd-f .hd-card { max-height: 54cqh; }
      .hd-in { padding: 12px 12px 10px; }
      .hd-card .q-q { font-size: 15px; }
      .hd-card .q-ctx { font-size: 11px; }
      .hd-sat { padding: 16px 10px 0; }
      #panel .win.hd-win .hd-sat .opts .opt { font-size: 13.5px; padding: 8px 9px 8px 38px; }
      #panel .win.hd-win .hd-sat .opts .opt::before { left: 7px; top: 8px; width: 22px; height: 22px; font-size: 12px; }
      #panel .win.hd-win .hd-sat .conf, .hd-sat .q-foot { margin: 0 -10px; padding: 6px 10px 8px; }
      .hd-sat .conf-b button { padding-top: 6px; padding-bottom: 6px; }
      .hd-card .hn-hp.hn-inq { display: flex; margin: 0 0 6px; padding: 0; box-shadow: none; background: none; transform: none; gap: 6px; }
      .hd-card .hn-hp .hn-por { display: none; }
      .hd-card .hn-hp .hn-wk { display: none; }
      .hd-card .hn-hp .hn-hpn { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 10px; font-size: 13px; }
      .hd-jars { flex-direction: row; }
      #panel .win.hd-win .hd-sat .conf { position: static; }
      .hd-sat .stake-help { font-size: 11.5px; }
    }`;
  document.head.appendChild(css);
})();
