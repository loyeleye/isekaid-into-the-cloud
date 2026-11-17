// Monster Hunt's hunting grounds (Ladi, Nov 16: "use some of the other scenes to make it seem like Bru is traversing
// through different areas ... an overworld map at the beginning and a list of areas where big monsters live").
// A hand-drawn map of the town and its outskirts (assets/img/hunt/lairs/map.webp, Ladi's Sogni art). Each big monster
// has a lair on it: the SQS Poison in the Sunken Docks, the API Gateway gatekeeper at the Toll Gate, the DynamoDB Hydra
// in the Partition Catacombs, the IAM Warden in the Warden's Keep. Every other monster roams the Outskirts. Tonight's
// monsters stand on the map at their lair as tokens; tap one to battle it, and Bru walks there first. Each battle plays
// in its lair's backdrop, and each step of it in a different part of that place (the backdrop pans: Track on the
// approach, Fight in the den, Pin it down further in).
// API: SD.huntMap.LAIRS, lairOf(topic), bg(key) → backdrop url for this screen, shift(step) → backdrop x position (%),
//      walk(key) → Promise (Bru walks to the lair; tap to skip).
(function () {
  const M = SD.huntMap = {};
  const DIR = 'assets/img/hunt/lairs/';
  M.MAP = DIR + 'map.webp';
  // at: the lair on the map, in % of the picture (left, top).
  M.LAIRS = {
    docks: { name: 'The Sunken Docks', at: [19, 19], topics: ['sqs'], line: 'The docks. It\'s in the queue somewhere, under the water.' },
    gate: { name: 'The Toll Gate', at: [79, 21], topics: ['apigateway'], line: 'The toll gate. Everything comes through here first.' },
    catacombs: { name: 'The Partition Catacombs', at: [17, 75], topics: ['dynamodb'], line: 'The catacombs. Every tunnel holds a different piece of it.' },
    keep: { name: 'The Warden\'s Keep', at: [84, 71], topics: ['iam', 'sts'], line: 'The keep. Nothing gets past the Warden without the right key.' },
    outskirts: { name: 'The Outskirts', at: [50, 64], topics: [], line: 'Out past the fence. Small ones roam out here.' }
  };
  M.lairOf = topic => Object.keys(M.LAIRS).find(k => M.LAIRS[k].topics.includes(String(topic || ''))) || 'outskirts';
  M.bg = key => DIR + (M.LAIRS[key] ? key : 'outskirts') + (innerWidth > 700 || innerWidth > innerHeight ? '-wide' : '-tall') + '.webp';
  // Each step of a battle stands somewhere else in the same place.
  // Where a place's ground is, per lair: at the docks only the pier on the left of the picture holds Bru up, so the
  // steps move along it instead of out over the water.
  const SHIFT = { track: 18, fight: 50, retry: 62, pin: 82 }, GROUND = { docks: { track: 0, fight: 6, retry: 10, pin: 14 } };
  M.shift = (step, key) => ((GROUND[key] || SHIFT)[step] ?? SHIFT[step] ?? 50);
  // How far up the scene her feet stand on a wide screen (% of its height): at the docks the pier's planks are above
  // the water line at the bottom of the picture, so she stands up on them, feet showing.
  const LIFT = { docks: 15 };
  M.lift = key => LIFT[key] || 0;
  // Warm the map so it's there the moment the hunting grounds open.
  M.warm = () => { const i = new Image(); i.src = M.MAP; };
  const still = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Bru walks to the lair: the place's backdrop slides by, she walks side-on, and its name comes up. Tap to skip.
  M.walk = function (key) {
    const L = M.LAIRS[key] || M.LAIRS.outskirts;
    return new Promise(done => {
      const el = document.createElement('div');
      el.className = 'hm-walk' + (still() ? ' still' : '');
      el.setAttribute('role', 'status');
      el.innerHTML = `<img class="hm-wbg" src="${M.bg(key)}" alt="" aria-hidden="true">
        <img class="hm-wbru" src="assets/img/hunt/bru/body-side.webp" alt="" aria-hidden="true">
        <p class="hm-wname"><small>Bru heads to</small>${L.name}</p>`;
      document.body.appendChild(el);
      let over = false;
      const end = () => { if (over) return; over = true; el.classList.add('out'); setTimeout(() => { el.remove(); done(); }, still() ? 0 : 260); removeEventListener('keydown', key2); };
      const key2 = e => { if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); end(); } };
      el.addEventListener('click', end);
      addEventListener('keydown', key2);
      setTimeout(end, still() ? 700 : 1900);
    });
  };

  const css = document.createElement('style');
  css.textContent = `
    .hm { display: grid; gap: 10px; }
    .hm-map { position: relative; width: min(100%, 78vh, 760px); margin: 0 auto; aspect-ratio: 1; border-radius: 6px; overflow: hidden;
      box-shadow: 0 0 0 2px #5a4426, 0 10px 30px rgba(0, 0, 0, .6); background: #120e0a; }
    .hm-map > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; display: block; }
    .hm-map::after { content: ''; position: absolute; inset: 0; pointer-events: none; box-shadow: inset 0 0 60px rgba(0, 0, 0, .55); }
    .hm-lair { position: absolute; z-index: 1; transform: translate(var(--ax, -50%), -50%); display: flex; flex-direction: column; align-items: center; gap: 2px; pointer-events: none; }
    .hm-lair > b { font: 700 11px/1.1 var(--font-head, Georgia, serif); letter-spacing: .06em; text-transform: uppercase; color: #f4e3bd; text-shadow: 0 1px 2px #000, 0 0 6px #000;
      background: rgba(20, 14, 8, .62); padding: 2px 7px; border-radius: 3px; white-space: nowrap; }
    .hm-lair.quiet > b { opacity: .65; }
    .hm-toks { list-style: none; margin: 0; padding: 0; display: flex; gap: 6px; pointer-events: auto; }
    .hm-tok { position: relative; display: flex; flex-direction: column; align-items: center; width: 74px; }
    .hm-tok .hn-por { width: 60px; height: 60px; border-radius: 50%; overflow: hidden; display: block; position: relative; background: radial-gradient(#3a2416, #120a06);
      box-shadow: 0 0 0 2px #d9b46a, 0 0 14px rgba(255, 110, 60, .7); animation: hmPulse 2.4s ease-in-out infinite; }
    .hm-tok .hn-por img { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; }
    .hm-tok.done .hn-por { box-shadow: 0 0 0 2px #7d6a52; filter: grayscale(.7) brightness(.8); animation: none; }
    .hm-tok .hn-stp { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%) rotate(-14deg); font: 800 9px/1 sans-serif; color: #ffd9c9; background: rgba(120, 20, 10, .85); padding: 2px 3px; border-radius: 2px; white-space: nowrap; }
    .hm-tok .hm-tn { margin-top: 3px; max-width: 74px; font: 700 10px/1.15 sans-serif; text-align: center; color: #fff1d6; text-shadow: 0 1px 2px #000, 0 0 4px #000; overflow-wrap: anywhere; }
    .hm-tok .hn-pips { display: flex; gap: 2px; margin-top: 2px; }
    .hm-tok .hn-pips .hn-rw, .hm-tok .hn-pips .small { display: none; }
    .hm-tok .hn-pipd { width: 9px; height: 6px; border-radius: 2px; background: rgba(0, 0, 0, .55); box-shadow: 0 0 0 1px #d9b46a; }
    .hm-tok .hn-pipd.on { background: #d33d2b; }
    .hm-tok > button { position: absolute; inset: -4px; border: 0; margin: 0; padding: 0; background: transparent; border-radius: 12px; cursor: pointer; min-height: 44px; }
    .hm-tok:has(> button:hover) .hn-por, .hm-tok:has(> button:focus-visible) .hn-por { transform: scale(1.08); }
    .hm-tok > button { z-index: 2; }
    .hm-tok > button:focus-visible { outline: 3px solid #ffd27a; outline-offset: 2px; }
    .hm-tok > button > b { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
    @keyframes hmPulse { 50% { box-shadow: 0 0 0 2px #ffd27a, 0 0 22px rgba(255, 110, 60, .95); } }
    .hm-cap { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: center; gap: 4px 12px; margin: 0; text-align: center; }
    .hm-cap .hm-bru { flex-basis: 100%; margin: 0; font-style: italic; }
    .hm-walk { position: fixed; inset: 0; z-index: 9999; overflow: hidden; background: #07060a; cursor: pointer; animation: hmIn .25s ease-out; }
    .hm-walk.out { opacity: 0; transition: opacity .25s; }
    .hm-wbg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 0% 50%; filter: brightness(.75); animation: hmPan 1.9s ease-in-out forwards; }
    .hm-wbru { position: absolute; bottom: 0; left: -20%; height: min(70%, 620px); filter: drop-shadow(0 6px 10px rgba(0, 0, 0, .7)); animation: hmStride 1.9s linear forwards, hmBob .38s ease-in-out infinite; }
    .hm-wname { position: absolute; left: 0; right: 0; top: 16%; margin: 0; text-align: center; font: 700 clamp(26px, 5vw, 54px)/1.1 var(--font-head, Georgia, serif); color: #f6e6c2; letter-spacing: .04em;
      text-shadow: 0 2px 4px #000, 0 0 18px rgba(0, 0, 0, .9); animation: hmName 1.9s ease-out forwards; }
    .hm-wname small { display: block; font-size: .42em; letter-spacing: .2em; text-transform: uppercase; opacity: .8; }
    @keyframes hmIn { from { opacity: 0; } }
    @keyframes hmPan { to { object-position: 100% 50%; transform: scale(1.06); } }
    @keyframes hmStride { to { left: 46%; } }
    @keyframes hmBob { 50% { translate: 0 -6px; } }
    @keyframes hmName { 0%, 15% { opacity: 0; transform: translateY(10px); } 35%, 100% { opacity: 1; transform: none; } }
    .hm-walk.still .hm-wbg, .hm-walk.still .hm-wbru, .hm-walk.still .hm-wname { animation: none; }
    .hm-walk.still .hm-wbru { left: 30%; }
    /* The battle's backdrop: a lair, panned to where this step stands. */
    .hd-scene.hd-lair .hs-bru { bottom: var(--hm-lift, 0px); }
    .hd-scene.hd-lair.hm-up .hs-bru::after { content: ''; position: absolute; left: 12%; right: 12%; bottom: -3%; height: 5%; border-radius: 50%; background: radial-gradient(rgba(0, 0, 0, .65), transparent 70%); z-index: -1; }
    .hd-scene.hd-lair .hs-street { inset: 0; left: 0; width: 100%; height: 100%; aspect-ratio: auto; transform: none; }
    .hd-scene.hd-lair .hs-bg { object-fit: cover; object-position: var(--hm-x, 50%) 60%; transition: object-position .9s ease-in-out; }
    @media (max-width: 700px) {
      .hm-tok { width: 58px; } .hm-tok .hn-por { width: 44px; height: 44px; } .hm-tok .hm-tn { font-size: 9px; max-width: 64px; }
      .hm-lair > b { font-size: 9px; padding: 1px 5px; }
    }
    @media (prefers-reduced-motion: reduce) { .hm-tok .hn-por { animation: none; } .hd-scene.hd-lair .hs-bg { transition: none; } }
  `;
  document.head.appendChild(css);
})();
