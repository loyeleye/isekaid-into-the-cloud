// The Lost and Found's pixel art (storyboard v7, "Art to make"): the Hunch inflated, hit and deflated, the Crown
// enforcer's badge, the neutral door and the ash-dirt map tile, all PixelLab (assets/img/pop, see CREDITS.md).
// Loaded right after js/mode-pop.js. It swaps the silhouette guides SD.pop.HUNCH_SVG and HUNCH_FLAT for the pixel
// images (same role="img" and aria-labels) and adds SD.pop.HUNCH_HIT, the hit frame. mode-pop.js reads these strings
// each time it draws, so nothing else there changes.
//   - The deflate (HUNCH_FLAT, on the proof sheet after a win): the hit frame sags and shrinks over 2.4 s while the
//     badge pops off and rolls to the right, then the empty coat lies flat. A tap skips to the end. Under
//     prefers-reduced-motion it's two stills side by side, hit then flat.
//   - The map: the heap's floor is the ash-dirt tile, and each door is the neutral stone door with its homeland icon.
(function () {
  const P = window.SD && SD.pop;
  if (!P) return;
  const IMG = 'assets/img/pop/';
  const LABEL = 'The Hunch: a navy sack with one brow, a shouting mouth, a blank clipboard and a crooked badge';
  const FLAT = 'The Hunch, deflated: an empty coat, a clipboard and the badge';
  const img = (f, cls) => `<img class="${cls}" src="${IMG}${f}.webp" alt="" aria-hidden="true" draggable="false">`;
  P.ART = { hunch: IMG + 'hunch.webp', hit: IMG + 'hunch-hit.webp', flat: IMG + 'hunch-flat.webp', badge: IMG + 'badge.webp', door: IMG + 'door.webp', ash: IMG + 'ash.webp' };
  P.HUNCH_SVG = `<span class="pop-hunch pxh" role="img" aria-label="${LABEL}">${img('hunch', 'pxh-i')}</span>`;
  P.HUNCH_HIT = `<span class="pop-hunch pxh" role="img" aria-label="The Hunch, hit: eyes squeezed shut, dented, losing thread">${img('hunch-hit', 'pxh-i')}</span>`;
  P.HUNCH_FLAT = `<span class="pop-hunch pxh pop-deflate" role="img" aria-label="${FLAT}" title="Tap to skip">${img('hunch-hit', 'pxh-i d-hit')}${img('badge', 'd-badge')}${img('hunch-flat', 'pxh-i d-flat')}</span>`;

  // A tap anywhere on the deflating Hunch (or its sky) skips to the empty coat.
  document.addEventListener('click', e => {
    const sky = e.target.closest && e.target.closest('.pop-sky.flat, .pop-deflate');
    const d = sky && (sky.classList.contains('pop-deflate') ? sky : sky.querySelector('.pop-deflate'));
    if (d) d.classList.add('done');
  });
  // The shrink finishes on its own too, so a later reflow never restarts it.
  document.addEventListener('animationend', e => {
    if (e.animationName === 'pxh-flat-in' && e.target.parentNode) e.target.parentNode.classList.add('done');
  });

  const css = document.createElement('style');
  css.textContent = `
    .pop-hunch.pxh { position: relative; display: inline-block; width: 100%; height: 100%; }
    .pxh-i, .d-badge { display: block; image-rendering: pixelated; image-rendering: crisp-edges; }
    .pxh .pxh-i { position: absolute; inset: 0; width: 100%; height: 100%; }
    .pop-sky .pop-hunch.pxh { width: 128px; height: 128px; }
    .pop-hunchdoor .pop-hunch.pxh { width: 52px; height: 52px; flex: 0 0 52px; }
    .pop-foe .pop-hunch.pxh { width: 84px; height: 84px; }

    /* The deflate: 2.4 s, the caption is already showing when it starts. */
    .pop-deflate .d-hit { transform-origin: 50% 88%; animation: pxh-sag 2.4s cubic-bezier(.5, 0, .9, .6) forwards; }
    .pop-deflate .d-flat { opacity: 0; animation: pxh-flat-in 2.4s linear forwards; }
    .pop-deflate .d-badge { position: absolute; width: 11%; height: 11%; left: 53%; top: 60%; opacity: 0; animation: pxh-roll 2.4s linear forwards; }
    @keyframes pxh-sag {
      0% { transform: scale(1, 1); }
      10% { transform: scale(1.06, .95); }
      35% { transform: scale(.92, .8) rotate(-3deg); }
      60% { transform: scale(.8, .5) rotate(2deg); }
      85% { transform: scale(.75, .22); opacity: 1; }
      100% { transform: scale(.7, .12); opacity: 0; }
    }
    @keyframes pxh-flat-in { 0%, 78% { opacity: 0; } 100% { opacity: 1; } }
    @keyframes pxh-roll {
      0%, 30% { opacity: 0; transform: translate(0, 0) rotate(0); }
      34% { opacity: 1; transform: translate(0, -40%) rotate(-40deg); }
      55% { transform: translate(100%, 80%) rotate(200deg); }
      90% { opacity: 1; transform: translate(280%, 230%) rotate(720deg); }
      100% { opacity: 0; transform: translate(280%, 230%) rotate(720deg); }
    }
    .pop-deflate.done .d-hit, .pop-deflate.done .d-badge { animation: none; opacity: 0; }
    .pop-deflate.done .d-flat { animation: none; opacity: 1; }
    .pop-sky.flat { cursor: pointer; }

    /* Reduced motion: two stills, hit then flat. */
    @media (prefers-reduced-motion: reduce) {
      .pop-sky .pop-hunch.pop-deflate { display: flex; gap: 6px; width: 236px; height: 115px; }
      .pop-deflate .pxh-i { position: static; width: 115px; height: 115px; flex: 0 0 115px; animation: none !important; opacity: 1 !important; transform: none !important; }
      .pop-deflate .d-badge { display: none; }
      .pop-sky.flat { cursor: default; }
    }

    /* The heap: ash-dirt floor and neutral stone doors (the homeland icon on the door). */
    .pop .pop-map { background: #6f6a60 url(${IMG}ash.webp) 0 0 / 96px 96px repeat; image-rendering: pixelated; }
    .pop .pop-door { padding-top: 34px; background-image: url(${IMG}door.webp); background-repeat: no-repeat; background-position: 50% 4px; background-size: 22px 30px; image-rendering: pixelated; }
    .pop .pop-door > .pop-gi:first-child { position: absolute; top: 8px; left: 50%; width: 14px; height: 14px; margin-left: -7px; color: #e2dbcb; fill: #e2dbcb; filter: drop-shadow(0 1px 0 #17131f); }
    .pop .pop-door.fog { background-image: none; padding-top: 4px; }
    .pop .pop-door.fog > .pop-gi:first-child { position: static; width: 22px; height: 22px; margin: 0; filter: none; }
  `;
  document.head.appendChild(css);
})();
