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
  const MONO = { mono: 1, color: '#b8f0b0', size: 3.6 };
  Object.assign(V.over, {
    // The fine print on the hatch lid.
    'cut-c7-roof-2': [{ text: 'Member account.', x: 30, y: 46, w: 26, size: 3.2, color: '#f0cf6a', align: 'center' }],
    // The policy list: the default allow, and Gary's Deny, never attached.
    'cut-c7-console-2': [Object.assign({ text: 'FullAWSAccess          attached\nGARY\'S DENY · 1984     not attached', x: 30, y: 38, w: 44 }, MONO)],
    // Attached, and scoped to root.
    'cut-c7-attach-1': [Object.assign({ text: 'GARY\'S DENY            ATTACHED\n"Effect": "Deny", "Action": "*"\n"aws:PrincipalArn": "arn:aws:iam::*:root"\nTarget: the Cloud (member account)', x: 24, y: 30, w: 52, size: 3.2 }, { mono: 1, color: '#b8f0b0' })],
    // Kyu's note, pinned over Seymour's terminal.
    'cut-c7-kyu-3': [{ text: 'Two copies.\nTest them.\n— K.', x: 40, y: 34, w: 20, size: 4, color: '#2a2030', align: 'center', rot: -3 }],
    // Kyu and your lead: the lead stands in front.
    'cut-c7-kyu-6': [{ lead: 1, face: 'sad', x: 28, y: 22, h: 78 }],
    // Freya's survey card, filed among the prayers.
    'cut-c7-epifire-3': [{ text: 'How likely are you to recommend the Free Tier to a friend?\n0   1   2   3   4   5   6   7   8   9   10', x: 28, y: 38, w: 44, size: 3.2, color: '#4a2a3a', align: 'center' }],
    // The blessings still on her, as motifs in her halo: one per reckoning not done.
    'cut-c7-top-2': [{ src: img('envelope'), x: 44, y: 6, h: 9, float: 1, if: left('hale') }, { src: img('bowl'), x: 50, y: 3, h: 9, float: 1, if: left('selvaria') },
      { src: img('seal'), x: 56, y: 6, h: 9, float: 1, if: left('namgung') }, { src: img('clock'), x: 62, y: 11, h: 9, float: 1, if: left('iris') }],
    // The gifts in the basket at her feet: each band that was freed put one in.
    'cut-c7-top-5': [{ src: img('letter'), x: 40, y: 70, h: 10, if: gift('thornwick') }, { src: img('loaf'), x: 46, y: 70, h: 10, if: gift('halcyon') },
      { src: img('gseal'), x: 52, y: 70, h: 10, if: gift('sealed') }, { src: img('lantern'), x: 58, y: 70, h: 10, if: gift('arcanum') }, { src: img('stone'), x: 64, y: 70, h: 10, if: gift('twinwater') }],
    // The camp at night, with a lantern lit for each of the five nights before.
    'cut-c7-vote-1': [1, 2, 3, 4, 5].map(n => ({ src: img('lit'), x: 14 + n * 12, y: 58, h: 8, if: lit(n) }))
  });
  // The same blessings on every other still of her on the throne.
  ['cut-c7-top-3', 'cut-c7-top-4', 'cut-c7-attach-2'].forEach(id => { V.over[id] = V.over['cut-c7-top-2']; });
})();
