// Chapter 7's overlays on its painted stills (js/vn.js, V.over): the words on screens, cards and notes, set crisply by
// the game over surfaces painted blank (pixel art can't spell); the blessings still on Freya, the lanterns the night
// before has lit and the gifts in the basket, by the save; and your lead, standing in a shot painted without them.
// Shot ids follow the chapter's cutscene sheets (the pipeline's ch7 specs, cut-<cutscene>-<n>). Positions are in % of
// the shot; set them against the drawn still. A sprite that isn't drawn yet doesn't show.
(function () {
  const V = SD.vn;
  if (!V || !V.over) return;
  const W = () => SD.c7world && SD.c7world.now;
  const left = k => () => !!W() && W().blessings().includes(k);
  const gift = b => () => !!W() && W().gifts().includes(b);
  const lit = n => () => !!W() && W().pairs() >= n;
  const img = n => 'assets/img/cut/c7-o-' + n + '.webp';
  // Freya's remaining blessings as motifs over her halo (centre x, top y, height, spacing, in % of the shot): one per
  // reckoning not done, the middle two a little higher, so they ring it.
  const halo = (cx, y, h, d) => [['envelope', 'hale', -1.5], ['bowl', 'selvaria', -0.5], ['seal', 'namgung', 0.5], ['clock', 'iris', 1.5]]
    .map(([n, k, i]) => ({ src: img(n), x: cx + i * d, y: Math.max(0, y - (Math.abs(i) < 1 ? h * 0.35 : 0)), h, float: 1, if: left(k) }));
  const MONO = { mono: 1, color: '#b8f0b0', size: 3.6 };
  Object.assign(V.over, {
    // The fine print on the hatch lid.
    'cut-c7-roof-2': [{ text: 'Member account.', x: 3, y: 58, w: 40, size: 3.2, color: '#f0cf6a', align: 'center', rot: -7 }],
    // The policy list: the default allow, and Gary's Deny, never attached.
    'cut-c7-console-2': [Object.assign({ text: 'FullAWSAccess          attached\nGARY\'S DENY · 1984     not attached', x: 30, y: 38, w: 44 }, MONO)],
    // Attached, and scoped to root.
    'cut-c7-attach-1': [Object.assign({ text: 'GARY\'S DENY            ATTACHED\n"Effect": "Deny", "Action": "*"\n"aws:PrincipalArn": "arn:aws:iam::*:root"\nTarget: the Cloud (member account)', x: 24, y: 30, w: 52, size: 3.2 }, { mono: 1, color: '#b8f0b0' })],
    // Kyu's note, pinned over Seymour's terminal.
    'cut-c7-kyu-3': [{ text: 'Two copies.\nTest them.\n— K.', x: 30, y: 34, w: 14, size: 3.4, color: '#2a2030', align: 'center', rot: -3 }],
    // Kyu and your lead: the lead stands in front.
    'cut-c7-kyu-6': [{ lead: 1, x: 28, y: 4, h: 96 }],
    // Freya's survey card, filed among the prayers.
    'cut-c7-epifire-3': [{ text: 'How likely are you to recommend the Free Tier to a friend? 0 to 10', x: 41, y: 43, w: 18, size: 2.2, color: '#4a2a3a', align: 'center', rot: -16 }],
    // The blessings still on her, as motifs in her halo: one per reckoning not done.
    'cut-c7-top-2': halo(38, 27.5, 4.5, 3),
    // The gifts in the basket at her feet: each band that was freed put one in.
    'cut-c7-top-5': [['letter', 'thornwick'], ['loaf', 'halcyon'], ['gseal', 'sealed'], ['lantern', 'arcanum'], ['stone', 'twinwater']]
      .map(([n, b], i) => ({ src: img(n), x: 61 + i * 3, y: 66, h: 6, if: gift(b) })),
    // The camp at night, with a lantern lit for each of the five nights before.
    'cut-c7-vote-1': [[12, 47], [25, 50], [40, 47], [64, 47], [80, 46]].map(([x, y], i) => ({ src: img('lit'), x, y, h: 6, if: lit(i + 1) })),
    // Your lead, in the shots painted without them: under Kagemaru's price (both versions), when nobody takes root, and
    // after the sale.
    'cut-c7-hatch-10': [{ lead: 1, x: 26, y: 4, h: 96 }],
    'cut-c7-hatch-vault-10': [{ lead: 1, x: 26, y: 4, h: 96 }],
    'cut-c7-top-6': [{ lead: 1, x: 26, y: 4, h: 96 }],
    'cut-c7-sale-3': [{ lead: 1, x: 26, y: 4, h: 96 }]
  });
  // The same blessings on every other still of her on the throne, round her halo in each.
  Object.assign(V.over, { 'cut-c7-top-3': halo(45, 26, 4.5, 3.2), 'cut-c7-top-4': halo(57, 3, 7, 6), 'cut-c7-attach-2': halo(37, 25.5, 4.5, 3) });
})();
