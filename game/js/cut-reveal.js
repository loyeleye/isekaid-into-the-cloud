// Chapter 1's reveal as a cutscene (/mnt/project-files/storyboard/ch1/12-the-reveal.md): Freya walks past your lead,
// lifts the keys, and as she turns her faces glitch through each other (promoter, goddess) until she settles on the
// virus. Every shot is painted and staged from one wide picture of the vault, so nobody moves unless the story moves
// them and the camera stays on one side; only the glitch frames A, C and E are pixel art, what she made.
// Her voice never glitches, only the picture. js/ch1-world.js plays SD.cutReveal.ending() and .wipe() in place of
// the dialogue, with the system messages between them; the words stay in js/ch1-story.js (T.ending, T.wipe).
(function () {
  const T = SD.ch1story;
  const IMG = 'assets/img/cut/';
  const still = (id, label) => ['cut-' + id, { src: IMG + id + '.webp', label: id.replace(/-/g, ' ') + (label ? ': ' + label : '') }];
  // The locked pose: A, C and E are the pixel twins of B, D and F (the same frame, converted), so they line up.
  // G to I are the virus after she settles; G2 is G with a closed-mouth grimace; H2 is the promoter in H's pose, flashed twice.
  const PAINTED = { B: 'promoter', D: 'goddess', F: 'virus', G: 'hands folded', G2: 'hands folded, a closed-mouth grimace', H: 'one finger raised', H2: 'promoter, finger raised', I: 'the basket' };
  // Each lead's walk frames and the one with her hand on their shoulder (Ladi, Oct 24): Kai's stops on her hand and Mira's
  // goes from her first step to the hand, as the wide carries her on; Dutch is first in line, so his hand comes second.
  const STEPS = { mira: 3, kai: 3, seoyeon: 4, dutch: 4 }, HANDS = { mira: 2, kai: 3, seoyeon: 3, dutch: 2 };
  const WALK = l => Array.from({ length: STEPS[l] }, (_, i) => 'w' + (i + 1));
  const HAND = l => 'w' + HANDS[l];
  SD.vn.addScenes(Object.fromEntries([
    ...[1, 2, 3, '3b', 'door', 'spot', 'steps', '4d', 4, 5].map(n => still('reveal-' + n)),
    // Each lead's walk in one framing (w1 on: Freya coming up, her hand on their shoulder, past them; the empty-spot wide
    // carries her on, Ladi, Oct 24), and their close-up (4).
    ...['mira', 'kai', 'seoyeon', 'dutch'].flatMap(l => [...WALK(l), 4].map(n => still('reveal-' + l + '-' + n))),
    ...['A', 'C', 'E'].map((k, i) => ['cut-reveal-glitch-' + (i + 1), { sheet: IMG + 'reveal-glitch.webp', frame: i, frames: 3, label: 'reveal ' + k }]),
    ...Object.entries(PAINTED).map(([k, label]) => ['rv-' + k, { src: IMG + 'reveal-' + k + '.webp', label: 'reveal ' + k + ': ' + label }])
  ]));
  const A = 'cut-reveal-glitch-1', C = 'cut-reveal-glitch-2', E = 'cut-reveal-glitch-3';
  const [B, D, F, G, G2, H, H2, I] = ['B', 'D', 'F', 'G', 'G2', 'H', 'H2', 'I'].map(k => 'rv-' + k);
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const me = () => (SD.state.save.c1 && SD.state.save.c1.lead) || 'mira';
  // Ways to try the last cut, from the pixel virus to the real one, and the green glitch tiles over the breaks, picked
  // in the 🐞 Debug menu (js/demo-select.js) and kept in this browser. morph: 'head' sharpens out of a mosaic from the
  // serpent's head, 'mosaic' sharpens all at once, 'fade' fades in from the head.
  const OPTS_KEY = 'sd-reveal-opts';
  const opts = Object.assign({ morph: 'head', tiles: true }, (() => { try { return JSON.parse(localStorage.getItem(OPTS_KEY)) || {}; } catch (e) { return {}; } })());
  const HEAD = [0.52, 0.23];
  const toReal = () => opts.morph === 'fade' ? ['reveal', F, ...HEAD, 3500] : opts.morph === 'mosaic' ? ['morph', F, null, null, 3200] : ['morph', F, ...HEAD, 3600];
  const tiles = n => ['tiles', opts.tiles ? n : 0];
  const say = ([who, text]) => [who === 'lead' ? me() : who, typeof text === 'object' ? text[me()] : text];

  SD.cutReveal = {
    opts,
    setOpt: (k, v) => { opts[k] = v; try { localStorage.setItem(OPTS_KEY, JSON.stringify(opts)); } catch (e) { /* kept for this visit only */ } },
    // The scene's two halves, as scripts: the faces, then the wipe.
    ending: () => {
      const L = 'cut-reveal-' + me() + '-', e = T.ending;
      const [gold, scales] = e[5][1].split(/ (?=Its scales)/);
      return [
        ['music', null],
        ['cg', 'cut-reveal-1', 'slow'], say(e[0]),
        ['cg', 'cut-reveal-2', 'slow'], say(e[1]),
        // "We did it!" while they still face the altar; then, for a beat, their faces over her clapping shoulder (Ladi, Oct 22).
        ['music', 'freya'], ['cg', 'cut-reveal-3', 'in'], say(e[2]),
        ['cg', 'cut-reveal-3b', 'still', 'cut'], ['wait', 1600],
        // The walk (Ladi, Oct 24: more stills so the motion reads): she leaves the doorway, comes up behind your lead,
        // rests a hand on their shoulder (one step missing), slips past them, walks straight across where Kyu stood and up
        // the steps, and her hand closes on the keys. Her waltz plays on under slow cold steps. With reduced motion it
        // holds on the hand.
        ...(calm() ? [['cg', L + HAND(me()), 'still'], ['narr', 'Freya steps past you...']] : [
          // Each still holds the 0.9 s a cg step takes; the hand holds a little longer (Ladi, Oct 24: brisk, not dragging).
          ['cg', 'cut-reveal-door', 'still', 'cut'], ['sfx', 'coldsteps'],
          ...WALK(me()).flatMap((w, i) => [['cg', L + w, 'still', ...(i ? [] : ['cut'])],
            ...(w === HAND(me()) ? [['wait', 400]] : [['sfx', 'coldsteps'], ...(i ? [] : [['narr', 'Freya steps past you...']])])]),
          ['cg', 'cut-reveal-spot', 'still', 'cut'], ['sfx', 'coldsteps'], ['wait', 200],
          ['cg', 'cut-reveal-steps', 'still', 'cut'], ['sfx', 'coldsteps'], ['wait', 200],
          ['cg', 'cut-reveal-4d', 'still', 'cut'], ['wait', 200]]),
        ['cg', 'cut-reveal-4', 'still'], ['sfx', 'sparkle'], ['narr', '...' + e[3][1].replace(/^Freya steps past you /, '')],
        // She turns: D, with one flicker to C, easy to miss.
        ['cg', D, 'still'], ['wait', 700], ['flick', [[C, 90], [D, 0]]], say(e[4]),
        // The masks break through, each time a little longer, and each time she comes back to the goddess and holds,
        // smiling, as if nothing happened (Ladi, Oct 22: slow enough to see, uncanny). Then they run together, faster,
        // under the hiss, and stop on the pixel virus; then the real one. With reduced motion: B, then E.
        // The whole picture flickers like a broken neon sign from the first break until she settles on the real one.
        // Her theme rots with it (Ladi, Oct 22): each break the waltz skips and sags lower, like a dying tape, and on
        // the fast run it winds down to nothing. Then dead silence, even the ring, while the real one fades in from
        // the serpent's head.
        ['fx', 'neon'],
        // And the game itself starts to break up in green blocks, more with each break (Ladi, Oct 22).
        ['warp', 0.92, 0.6, 120], tiles(1), ['flick', [[A, 360], [D, 1100]], []],
        ['warp', 0.8, 0.6, 160], tiles(2), ['flick', [[B, 320], [D, 800]], []],
        ['warp', 0.66, 0.6, 200], tiles(3), ['flick', [[C, 280], [A, 240], [D, 520]], []],
        ['warp', 0, 2.2], tiles(4), ['flick', [[B, 170], [C, 140], [A, 120], [B, 100], [C, 80], [A, 65], [E, 0]], [B, E], 'hiss'],
        ['narr', gold],
        ['fx', 'unneon'], tiles(0), ['ring', false, 3], toReal(), ['narr', scales],
        ['cg', G, 'slow'], say(e[6])
      ];
    },
    wipe: () => {
      const w = T.wipe;
      return [
        ['cg', 'cut-reveal-' + me() + '-4', 'in'], say(w[0]),
        // "I never said I'd leave them there": the smile gone, a closed-mouth grimace (Ladi, Oct 22).
        ['cg', G2, 'still'], say(w[1]),
        ['cg', 'cut-reveal-5', 'slow'], say(w[2]), say(w[3]),
        // One finger, and Uptima turns to static; the friendly camp face flashes through twice (Ladi, Oct 22: once was
        // too quick to catch).
        ['cg', H, 'still'], ['sfx', 'static'], ['flick', [[H2, 100], [H, 160], [H2, 100], [H, 0]]], say(w[4]),
        ['cg', I, 'in'], say(w[5]), say(w[6])
      ];
    }
  };
  // In the story, chapter 1's ending (js/ch1-world.js), with its system messages between the two halves.
  SD.reel.chapter('1').def('reveal', 'The reveal', null, {
    music: 'kyusad', leads: true, note: 'Freya in the vault, as each lead sees it.',
    // No weather in the vault (the temple's rain stops at its door): only a faint ring, until the wipe is over.
    run: async () => {
      SD.audio.hush(true);
      try {
        await SD.vn.play(SD.cutReveal.ending());
        await SD.ch1.wiped();
        await SD.vn.play(SD.cutReveal.wipe());
      } finally { SD.audio.hush(false); }
    }
  });
})();
