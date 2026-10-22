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
  // G to I are the virus after she settles; H2 is the promoter in H's pose, for one frame.
  const PAINTED = { B: 'promoter', D: 'goddess', F: 'virus', G: 'hands folded', H: 'one finger raised', H2: 'promoter, finger raised', I: 'the basket' };
  SD.vn.addScenes(Object.fromEntries([
    ...[1, 2, 3, 4, 5].map(n => still('reveal-' + n)),
    ...['mira', 'kai', 'seoyeon', 'dutch'].flatMap(l => [1, 2, 3, 4].map(n => still('reveal-' + l + '-' + n))),
    ...['A', 'C', 'E'].map((k, i) => ['cut-reveal-glitch-' + (i + 1), { sheet: IMG + 'reveal-glitch.webp', frame: i, frames: 3, label: 'reveal ' + k }]),
    ...Object.entries(PAINTED).map(([k, label]) => ['rv-' + k, { src: IMG + 'reveal-' + k + '.webp', label: 'reveal ' + k + ': ' + label }])
  ]));
  const A = 'cut-reveal-glitch-1', C = 'cut-reveal-glitch-2', E = 'cut-reveal-glitch-3';
  const [B, D, F, G, H, H2, I] = ['B', 'D', 'F', 'G', 'H', 'H2', 'I'].map(k => 'rv-' + k);
  const calm = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const me = () => (SD.state.save.c1 && SD.state.save.c1.lead) || 'mira';
  const say = ([who, text]) => [who === 'lead' ? me() : who, typeof text === 'object' ? text[me()] : text];

  SD.cutReveal = {
    ending: () => {
      const L = 'cut-reveal-' + me() + '-', e = T.ending;
      const [gold, scales] = e[5][1].split(/ (?=Its scales)/);
      return SD.vn.play([
        ['music', null],
        ['cg', 'cut-reveal-1', 'slow'], say(e[0]),
        ['cg', 'cut-reveal-2', 'slow'], say(e[1]),
        ['music', 'freya'], ['cg', 'cut-reveal-3', 'in'], say(e[2]),
        // The walk: no music, slow cold steps, one step missing while her hand rests on your shoulder. With reduced
        // motion it holds on the hand.
        ['music', null], ...(calm() ? [['cg', L + '2', 'still'], ['narr', 'Freya steps past you...']] : [
          ['cg', L + '1', 'still'], ['sfx', 'coldsteps'], ['narr', 'Freya steps past you...'],
          ['cg', L + '2', 'still', 'cut'], ['wait', 1700],
          ['cg', L + '3', 'slow'], ['sfx', 'coldsteps'], ['wait', 2300], ['sfx', 'coldsteps'], ['wait', 1600]]),
        ['cg', 'cut-reveal-4', 'still'], ['sfx', 'sparkle'], ['narr', '...' + e[3][1].replace(/^Freya steps past you /, '')],
        // She turns: D, with one flicker to C, easy to miss.
        ['cg', D, 'still'], ['wait', 500], ['flick', [[C, 80], [D, 0]]], say(e[4]),
        // The masks run through each other, speeding up, and stop on the pixel virus; then the real one.
        ['flick', [[A, 230], [B, 200], [C, 170], [A, 140], [D, 110], [E, 0]], [B, E], 'hiss'], ['narr', gold],
        ['flick', [[F, 0]], [F]], ['narr', scales],
        ['cg', G, 'slow'], say(e[6])
      ]);
    },
    wipe: () => {
      const w = T.wipe;
      return SD.vn.play([
        ['cg', 'cut-reveal-' + me() + '-4', 'in'], say(w[0]),
        ['cg', G, 'still'], say(w[1]),
        ['cg', 'cut-reveal-5', 'slow'], say(w[2]), say(w[3]),
        // One finger, and Uptima turns to static; for one frame, the friendly camp face.
        ['cg', H, 'still'], ['sfx', 'static'], ['flick', [[H2, 70], [H, 0]]], say(w[4]),
        ['cg', I, 'in'], say(w[5]), say(w[6])
      ]);
    }
  };
})();
