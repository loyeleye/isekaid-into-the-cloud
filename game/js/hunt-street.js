// Monster Hunt's bounty board as a scene (Ladi, Nov 16: "It's still box heavy rather than showing things live in a
// scene"; "You are just making fancier versions of the same menu / text box interface"). The same painted night street
// the boards play on (SD.huntBoard.STREET), with a wooden notice board standing in it (assets/img/hunt/notice-board.webp)
// and the wanted posters pinned to its planks as paper. Bru stands full size beside it and talks in a speech bubble
// (SD.huntBoard.bruOn: she breathes, blinks and reacts). The hunt's progress is in the scene too: a string of lanterns
// under the board, one per monster, lit as each is battled, and a stamped tally of Track, Fight and Pin on each poster.
// Tap a poster to see it up close. js/hunt.js builds the posters (H.open); this file is the stage they stand on.
// API: SD.huntStreet.open({ title, onClose, posters, empty, lamps, note, foot, line }) → { root, body, bru, zoom(html, line, mood), unzoom() }
(function () {
  if (!SD.huntBoard || !SD.huntBoard.bruOn) return;
  const U = SD.ui, B = SD.huntBoard;
  const HS = SD.huntStreet = {};
  const ART = 'assets/img/hunt/notice-board.webp';
  // The board picture's plank face, in % of the picture (900×828): where the posters are pinned.
  HS.FACE = [12.25, 22.59, 86.65, 63.02];
  HS.open = function (o) {
    const f = HS.FACE;
    const body = U.panel(`<div class="hu">
        <div class="hu-view">
          <div class="hu-stand">
            <img class="hu-art" src="${ART}" alt="" aria-hidden="true" decoding="async">
            <div class="hu-face" style="left:${f[0]}%;top:${f[1]}%;width:${f[2] - f[0]}%;height:${f[3] - f[1]}%">${o.posters || o.empty || ''}</div>
            ${o.lamps || ''}
            ${o.note || ''}
          </div>
        </div>
        ${B.bruHtml()}
        <p class="hs-say hu-say" aria-live="polite" hidden></p>
        <div class="hu-foot">${o.foot || ''}</div>
        <div class="hu-zoom" hidden></div></div>`,
      { title: o.title, onClose: o.onClose, cls: 'hs-win hu-win' });
    const root = body.querySelector('.hu'), zoomEl = root.querySelector('.hu-zoom');
    const bru = B.bruOn(root);
    bru.turn('front');
    // Room for Bru on a wide screen: the board stands right of her; on a phone she stands in front of its posts.
    const fit = () => {
      if (!root.isConnected) return ro.disconnect();
      const w = root.querySelector('.hs-bru').getBoundingClientRect().width;
      root.style.setProperty('--bw', innerWidth > 700 ? Math.round(w * .92 + 16) + 'px' : '0px');
      root.style.setProperty('--bruw', Math.round(w) + 'px');
      root.style.setProperty('--fh', Math.round(root.querySelector('.hu-foot').getBoundingClientRect().height) + 'px');
    };
    const ro = new ResizeObserver(fit); ro.observe(root); fit();
    const home = { line: o.line || '' };
    bru.say(home.line);
    let back = null;
    const sc = { root, body, bru };
    sc.zoom = (html, line, mood) => {
      back = document.activeElement;
      zoomEl.innerHTML = `<div class="hu-zin" role="group" aria-label="Poster, up close">${html}</div>`;
      zoomEl.hidden = false; root.classList.add('zoomed');
      if (line) bru.say(line);
      bru.turn('three');
      if (mood) bru.react(mood, 1800);
      const first = zoomEl.querySelector('button');
      if (first) first.focus();
    };
    sc.unzoom = () => {
      if (zoomEl.hidden) return;
      zoomEl.hidden = true; zoomEl.innerHTML = ''; root.classList.remove('zoomed');
      bru.turn('front'); bru.say(home.line);
      if (back && back.isConnected) back.focus();
    };
    zoomEl.addEventListener('click', e => { if (e.target === zoomEl) sc.unzoom(); });
    root.addEventListener('keydown', e => { if (e.key === 'Escape' && !zoomEl.hidden) { e.stopPropagation(); sc.unzoom(); } });
    return sc;
  };

  const css = document.createElement('style');
  css.textContent = `
    .hu { --bw: 0px; position: relative; flex: 1; min-height: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; overflow: hidden; color: #efe6d2;
      background: linear-gradient(rgba(6, 5, 10, .3), rgba(6, 5, 10, .55)), url(${B.STREET}) 64% bottom / cover no-repeat, #0b0910; }
    /* off the full-screen stage (the Today card's link) the window has no height of its own: give the scene one */
    body:not(.in-mode) .hu { min-height: min(78vh, 660px); }
    /* the board stands on the cobbles right of Bru; the view never scrolls */
    .hu-view { position: relative; min-height: 0; container-type: size; }
    .hu-stand { position: absolute; bottom: 1.5%; left: calc(var(--bw) + (100cqw - var(--bw)) / 2); transform: translateX(-50%);
      width: min(calc((100cqw - var(--bw)) * .94), calc(90cqh * 900 / 828)); aspect-ratio: 900 / 828; container: hustand / inline-size; }
    .hu-art { position: absolute; inset: 0; width: 100%; height: 100%; display: block; user-select: none; filter: drop-shadow(0 14px 14px rgba(0, 0, 0, .6)); }
    .hu-face { position: absolute; display: flex; justify-content: center; align-items: flex-start; }
    /* the posters: paper pinned to the planks; tap one to see it up close */
    .hu-posts { list-style: none; margin: 0; padding: 0; display: flex; justify-content: center; align-items: flex-start; gap: 2cqw; margin-top: -1.2cqw; }
    .hu .hn-wp.hu-post { position: relative; width: 22.5cqw; padding: 2.6cqw 1.2cqw 1.4cqw; gap: .5cqw; justify-items: center; text-align: center; transform: rotate(var(--r, 0deg)); transition: transform .2s ease; }
    .hu-posts > :nth-child(1) { --r: -2deg; } .hu-posts > :nth-child(2) { --r: 1.2deg; margin-top: .8cqw; } .hu-posts > :nth-child(3) { --r: -.8deg; }
    .hu .hu-post::before { top: .6cqw; width: 1.8cqw; height: 1.8cqw; margin-left: -.9cqw; }
    .hu .hu-post .hn-wh { font-size: 3.1cqw; letter-spacing: .12em; }
    .hu .hu-post .hn-ws { font-size: max(7px, 1cqw); letter-spacing: .1em; padding: .3cqw 0; margin: 0; width: 100%; }
    .hu .hu-post .hn-por { width: 14cqw; height: 14cqw; margin: .3cqw; border-width: max(2px, .3cqw); }
    .hu .hu-post .hn-por img { transform: none; width: 84%; height: 84%; object-fit: contain; }
    .hu .hu-post .hn-stp { font-size: max(8px, 1.6cqw); }
    .hu .hu-post .td-pn { font: 800 clamp(10px, 1.9cqw, 16px)/1.15 var(--f-body); color: #2a1d10; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .hu .hu-post .hn-pips { justify-content: center; gap: .4cqw; }
    .hu .hu-post .hn-pipd { width: max(8px, 1.7cqw); height: max(6px, 1.1cqw); border-width: max(1px, .25cqw); border-radius: 2px; }
    .hu .hu-post .hn-rw { font-size: max(7px, 1.2cqw); }
    .hu .hn-wp.hu-post:hover { transform: rotate(0deg) scale(1.04); z-index: 2; }
    .hu .hu-post.now { box-shadow: 0 0 0 max(2px, .3cqw) #ffcf6a, 0 0 2.4cqw rgba(255, 190, 80, .8), 0 5px 12px rgba(0, 0, 0, .55); }
    .hu-tap { position: absolute; inset: 0; z-index: 3; width: 100%; height: 100%; padding: 0; margin: 0; border: 0; border-radius: 2px; background: transparent; cursor: zoom-in; }
    .hu-tap:focus-visible { outline: 3px solid #ffcf6a; outline-offset: 2px; }
    /* the stamped tally on each poster: Track, Fight, Pin it down */
    .hu-tally { display: flex; justify-content: center; gap: .5cqw; width: 100%; }
    .hu-st { display: inline-flex; align-items: center; gap: .3cqw; white-space: nowrap; min-width: 0; padding: .25cqw .5cqw; border: max(1px, .22cqw) dashed #7a5a34; border-radius: .6cqw; color: #6a4a24;
      font: 800 max(8px, 1.15cqw)/1.1 var(--f-body); letter-spacing: .02em; text-transform: uppercase; }
    .hu-st i { font-style: normal; font-size: max(9px, 1.5cqw); }
    .hu-st.ok { border-style: solid; color: #1f5e2a; border-color: #1f5e2a; transform: rotate(-6deg); background: rgba(40, 120, 60, .1); }
    .hu-st.bad { border-style: solid; color: #9b1c1c; border-color: #9b1c1c; transform: rotate(5deg); background: rgba(160, 30, 30, .08); }
    .hu-st.now { border-style: solid; color: #2a1d10; border-color: #2a1d10; background: #ffe08a; }
    .hu-st .hu-sn { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
    .hu-st::after { content: attr(data-a); }
    @container hustand (max-width: 560px) { .hu-st::after { content: attr(data-l); } .hu .hu-post .hn-ws { display: none; } }
    .hu-chalk { align-self: center; margin: 0; font: italic 700 clamp(13px, 3cqw, 26px)/1.3 var(--f-body); color: rgba(255, 244, 214, .82); text-align: center; text-shadow: 0 1px 2px rgba(0, 0, 0, .6); }
    /* Kyu's note, tacked to the right-hand post */
    .hu .hn-kyu.hu-kyu { position: absolute; left: 78%; top: 72%; width: 15cqw; margin: 0; padding: .8cqw 1cqw; border-width: max(1px, .2cqw); font-size: max(9px, 1.55cqw); line-height: 1.2; transform: rotate(4deg); box-shadow: 0 3px 6px rgba(0, 0, 0, .5); }
    .hu-kyu .hn-pin { position: absolute; top: -1.2cqw; left: 40%; font-style: normal; font-size: max(10px, 2cqw); }
    /* a lantern per monster, hanging under the board between its posts: unlit until battled, then lit by how it went */
    .hu-lamps { position: absolute; z-index: 1; top: 66.4%; left: 26%; right: 26%; display: flex; justify-content: space-between; margin: 0; padding: 0; list-style: none; }
    .hu-lamp { position: relative; display: grid; justify-items: center; }
    .hu-lamps > :nth-child(2) { margin-top: 1.4cqw; }
    .hu-lamp::before { content: ''; width: max(2px, .3cqw); height: 2.6cqw; background: repeating-linear-gradient(#8a6a3a 0 3px, #3a2814 3px 5px); }
    .hu-lamp b { position: relative; width: max(16px, 3.8cqw); height: max(22px, 5.2cqw); border: max(2px, .3cqw) solid #2a1a0c; border-radius: 22% 22% 34% 34%; background: linear-gradient(90deg, #2a2632, #4a4452 50%, #24202c); box-shadow: inset 0 3px 0 #4a3a22, 0 0 0 1px rgba(255, 220, 160, .25); }
    .hu-lamp b::before { content: ''; position: absolute; left: 12%; right: 12%; top: max(-7px, -1.3cqw); height: max(6px, 1.2cqw); border-radius: 4px 4px 0 0; background: #2a1a0c; }
    .hu-lamp small { margin-top: .4cqw; min-width: 1.2em; font: 800 max(11px, 1.9cqw)/1 var(--f-body); color: #ffe9b8; text-align: center; text-shadow: 0 1px 2px #000, 0 0 4px #000; }
    .hu-lamp.lit b { background: radial-gradient(circle at 50% 60%, #fff4c0, #ffc040 45%, #c86a10 90%); box-shadow: 0 0 2.6cqw 1cqw rgba(255, 180, 60, .6), 0 0 6cqw 2cqw rgba(255, 150, 40, .25); }
    .hu-lamp.half b { background: linear-gradient(transparent 45%, #ffb040 45%), radial-gradient(circle at 50% 70%, #c88a30, #5a3a14); box-shadow: 0 0 1.6cqw .5cqw rgba(255, 160, 50, .4); }
    .hu-lamp.out b { background: radial-gradient(circle at 50% 70%, #7a2a20, #2a1418 80%); box-shadow: 0 0 1.2cqw .3cqw rgba(200, 50, 30, .35); }
    .hu-lamp.now b { animation: huFlicker 1.6s ease-in-out infinite; background: radial-gradient(circle at 50% 60%, #ffe8a0, #f09030 60%, #8a4a10); box-shadow: 0 0 2cqw .7cqw rgba(255, 170, 60, .55); }
    @keyframes huFlicker { 0%, 100% { opacity: 1; } 40% { opacity: .78; } 55% { opacity: .95; } 70% { opacity: .82; } }
    /* Bru: full size at the left on a wide screen, her line over her head; on a phone, in front of the board's posts */
    .hu .hs-bru { height: min(80%, 640px); }
    .hu .hs-say.hu-say { left: max(12px, 2vw); bottom: calc(min(80%, 640px) * .965); width: max-content; max-width: min(360px, calc(var(--bw) + 60px)); font-size: 15px; }
    .hu .hu-say::before { left: 46%; bottom: -20px; border: 9px solid transparent; border-top: 11px solid #2a2018; }
    .hu .hu-say::after { left: calc(46% + 2px); bottom: -15px; border: 7px solid transparent; border-top: 9px solid #fbf5e3; }
    /* the foot of the scene: start or resume, and signs to the bestiary, sightings, the yard and how to play */
    .hu-foot { position: relative; z-index: 4; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px 12px; padding: 8px 16px calc(10px + env(safe-area-inset-bottom, 0px)) max(16px, var(--bw));
      background: linear-gradient(rgba(14, 10, 6, 0), rgba(14, 10, 6, .88) 35%); }
    .hu-go { order: 2; min-width: 240px; padding: 12px 22px !important; font: 800 17px/1.2 var(--f-head, serif) !important; letter-spacing: .04em; border-radius: 6px !important;
      background: linear-gradient(#e9c66a, #b8862a) !important; color: #24170a !important; border: 2px solid #3a2410 !important; box-shadow: 0 3px 0 #3a2410, 0 0 22px rgba(255, 190, 80, .35) !important; }
    .hu-signs { order: 1; flex: 1; display: flex; flex-wrap: wrap; gap: 6px 8px; margin: 0; padding: 0; list-style: none; }
    .hu-sign { display: inline-flex; align-items: center; gap: 6px; min-height: 40px; padding: 6px 12px; border: 2px solid #24170c; border-radius: 3px 8px 8px 3px; cursor: pointer;
      background: repeating-linear-gradient(90deg, rgba(0, 0, 0, .08) 0 3px, transparent 3px 11px), linear-gradient(#8a6038, #5e3e22); color: #fbe9c4; font: 700 13px/1.1 var(--f-body); text-shadow: 0 1px 1px #000;
      box-shadow: inset 0 1px 0 rgba(255, 220, 170, .3), 0 2px 0 #1a0f06; }
    .hu-sign:hover { filter: brightness(1.12); }
    .hu-sign span[aria-hidden] { font-size: 16px; }
    .hu-rest { order: 3; flex-basis: 100%; margin: 0; text-align: right; font-size: 12px; color: #c9b894; text-shadow: 0 1px 2px #000; }
    /* a poster up close */
    .hu-zoom { position: absolute; z-index: 6; inset: 0; display: grid; place-items: center; padding: 12px 12px 12px calc(var(--bw) + 12px); background: rgba(6, 5, 10, .66); overflow-y: auto; }
    .hu.zoomed .hs-bru { z-index: 7; } .hu.zoomed .hu-say { z-index: 8; }
    .hu-zoom[hidden] { display: none; }
    .hu-zin { display: grid; gap: 10px; justify-items: center; width: min(360px, 100%); }
    .hu-zin .hn-wp { width: 100%; transform: rotate(-.6deg); }
    .hu-zin .hn-wbody { grid-template-columns: 1fr; justify-items: center; text-align: center; gap: 8px; }
    .hu .hu-zin .hn-por { width: 160px; height: 160px; }
    .hu .hu-zin .hn-por img { transform: none; width: 84%; height: 84%; object-fit: contain; }
    .hu-zin .hn-track, .hu-zin .hn-pips { justify-content: center; }
    .hu-zin .hn-zn { text-align: center; font-size: 13px; color: #4a3520; }
    .hu-zin .row { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; width: 100%; }
    .hu-zin .row button { flex: 1 1 140px; }
    .hu.zoomed .hu-stand { filter: blur(1.5px); }
    @media (prefers-reduced-motion: reduce) { .hu-lamp.now b { animation: none; } .hu .hn-wp.hu-post { transition: none; } .hu .hn-wp.hu-post:hover { transform: rotate(var(--r, 0deg)); } }
    /* phones: the board at the top of the street, Bru from the knees up in front of its posts, her line beside her */
    @media (max-width: 700px) {
      .hu-stand { top: clamp(44px, 10cqh, 70px); bottom: auto; width: min(98cqw, calc(80cqh * 900 / 828)); }
      .hu .hu-posts { gap: 1.2cqw; }
      .hu .hn-wp.hu-post { width: 28cqw; padding: 3.4cqw 1.4cqw 1.8cqw; }
      .hu .hu-post .hn-wh { font-size: 4.2cqw; }
      .hu .hu-post .hn-por { width: 17cqw; height: 17cqw; }
      .hu .hu-post .td-pn { font-size: max(10px, 2.9cqw); }
      .hu .hu-post::before { width: 2.6cqw; height: 2.6cqw; margin-left: -1.3cqw; }
      .hu .hn-kyu.hu-kyu { left: auto; right: 1%; top: 76%; width: 26cqw; font-size: max(10px, 2.8cqw); }
      .hu .hs-bru { height: 46%; left: 0; bottom: 0; }
      .hu .hs-say.hu-say { left: calc(var(--bruw, 120px) * .78); right: 8px; bottom: max(calc(46% * .6), calc(var(--fh, 90px) + 12px)); width: auto; max-width: none; font-size: 13px; padding: 7px 10px; }
      .hu .hu-say::before { left: -12px; bottom: 14px; border: 8px solid transparent; border-right: 12px solid #2a2018; }
      .hu .hu-say::after { left: -8px; bottom: 16px; border: 6px solid transparent; border-right: 10px solid #fbf5e3; }
      .hu-foot { padding: 6px 10px calc(8px + env(safe-area-inset-bottom, 0px)); gap: 6px; }
      .hu-go { order: 0; flex: 1 1 100%; min-width: 0; padding: 10px 14px !important; font-size: 15px !important; }
      .hu-signs { justify-content: center; gap: 5px; }
      .hu-sign { min-height: 36px; padding: 4px 8px; font-size: 12px; }
      .hu-sign span[aria-hidden] { font-size: 14px; }
      .hu-rest { text-align: center; font-size: 11px; }
      .hu-zoom { place-items: start center; padding: 10px 10px calc(46% * .62 + 70px); background: rgba(6, 5, 10, .78); }
      .hu-zin { gap: 8px; }
      .hu .hu-zin .hn-wp { padding: 18px 10px 10px; gap: 4px; }
      .hu .hu-zin .hn-por { width: 96px; height: 96px; }
      .hu .hu-zin .hn-wh { font-size: 20px; }
    }`;
  document.head.appendChild(css);
})();
