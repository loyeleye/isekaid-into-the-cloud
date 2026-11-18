# The Night Watch: data shapes shared by the engine, art and content

Design source: the Claude Doc "The Night Watch" storyboard (https://claude.ai/artifact/UyY6CZAPy7g7eyQf1FbAys).
Three workstreams build in parallel, each in its own files, so their PRs never touch the same lines:

| Workstream | Owns | Never edits |
|---|---|---|
| Engine | `js/mode-watch*.js`, `js/watch-data.js`, `tools/watch_check.js`, `index.html` script tags | `watch-art.js`, `watch-content.js`, `assets/img/watch/` |
| Art | `assets/img/watch/**`, `js/watch-art.js`, `CREDITS.md` lines for those files | engine and content files |
| Content | `js/watch-content.js` | engine and art files |

The engine runs with placeholder shapes when `WATCH_ART` or `WATCH_CONTENT` is missing or partial, so nothing blocks on anything else.
Ids are lowercase kebab-case and never change once merged (saves and cross-references use them).

## Shared ids

- Days and nights: `1`..`9`. Night 9 is the Long Night.
- Town levels: `west-road`, `hill-road`, `main-street`, `far-lane`.
- Castle floors: `towers`, `upper`, `ground`, `cellars`. Outside: `bridge`, `neighbour-castle`.
- Rooms: `watchtower`, `lookout`, `captain`, `wardrobe`, `ledger`, `bridge-tower`, `gate`, `hall`, `post-room`, `tavern`, `archive`, `strongroom`, `barracks`.
- People: `seoyeon`, `mira`, `coo`, `bru`, `kagemaru`, `lexi`, `kai`, `dutch`, `hobb`, `pell`, `wen`, `ayo`, `aigerim`, `doug`, `tess`, `hollis`, `odu`, `fennel`, `seymour`, `chad`, `kevin` (the Hooded Stranger), `captain`.
- Fix types: `door`, `badge-desk`, `sealing-bench`, `hiding-spot`.
- Skills: exam-guide numbers as strings, `"2.1.1"`..`"2.3.6"`.
- Weather: `clear`, `wind`, `fog`, `rain`, `storm`, `mist`.

## `window.WATCH_ART` (art thread, `js/watch-art.js`)

```js
window.WATCH_ART = {
  version: 1,
  // Every sprite is strict 2D side view, facing right; the engine mirrors for left.
  // anchor = the pixel where the feet touch the ground (x from left, y from top of the frame).
  people: {
    seoyeon: { sheet: 'assets/img/watch/people/seoyeon.png', w: 64, h: 96, anchor: [32, 94],
               anims: { idle: [0, 1], walk: [2, 3, 4, 5], talk: [6, 7], lantern: [8, 9] }, fps: 8 },
    // ...one entry per person id; at least idle and walk; talk for anyone who gives quests.
  },
  animals: {
    pigeon: { sheet: '...', w: 24, h: 24, anchor: [12, 23],
              anims: { idle: [...], walk: [...], fly: [...], perch: [...], sleep: [...] }, fps: 8 },
    // states the engine asks for: idle, walk, run, fly, perch, sleep (missing ones fall back to idle)
  },
  skies: { day: 'assets/img/watch/sky/day.png', night: '...' },   // dusk and dawn are tints the engine applies
  levels: {
    // five parallax layers per town level, back to front; widths are the full level width in px
    'west-road': { width: 3200, ground: 300, layers: [
      { img: '...far.png', speed: 0.2 }, { img: '...back.png', speed: 0.5 },
      { img: '...street.png', speed: 1 }, { img: '...front.png', speed: 1.3 } ] },
    // hill-road, main-street, far-lane the same; the sky is layer 1 and comes from `skies`
  },
  floors: {
    // castle floors: same shape; layer 1 is the window/sky strip
    towers: { width: 1600, ground: 300, layers: [ ... ] },
    // upper, ground, cellars, bridge, 'neighbour-castle'
  },
  weather: { rain: '...', fog: '...', mist: '...', storm: '...', wind: '...' },  // looping overlay strips
  props: { 'hoist-door': '...', 'hoist-platform': '...', 'stair-left': '...', 'stair-right': '...',
           'cellar-stair': '...', 'back-stair': '...', sparkle: '...', lantern: '...' }
};
```

Rules from the doc: one ground line per level, a soft shadow under every figure, doors sized to a person, sun from the upper left by day, moon from the upper right by night. Night versions can be a tinted day image unless lighting differs.

## `window.WATCH_CONTENT` (content thread, `js/watch-content.js`)

```js
window.WATCH_CONTENT = {
  version: 1,
  breaches: [{
    id: 'gate-shared-password',          // unique
    night: 1,                             // first night it can appear
    skill: '2.1.2',
    fix: 'badge-desk',                    // door | badge-desk | sealing-bench | hiding-spot
    where: { floor: 'ground', room: 'gate' },     // or { level: 'main-street' } for night 9 town breaches
    title: 'The gate takes one shared password',  // shown on the breach marker
    story: 'One or two sentences of what Seo-yeon sees.',
    choices: [                            // the fix screen: 3-4 options, exactly one best
      { text: 'Check each visitor\'s signed wristband token', best: true, why: 'Plain explanation of why this is right.' },
      { text: '...', best: false, why: 'Why it is wrong or too wide.' }
    ],
    raid: 'Forgers'                       // the intruder this breach spawns on night 9 if missed
  }],
  reviews: [{                             // Mira's morning review pool
    id: 'r-2-1-2-a', skill: '2.1.2', day: 2,          // first day it can be asked
    q: 'Question text', choices: ['A', 'B', 'C', 'D'], answer: 1,
    why: 'Fresh explanation; facts checked against current AWS docs.'
  }],
  quests: [{
    id: 'mira-recipes',                   // ids for every quest named in the doc
    giver: 'mira',
    kind: 'trust',                        // small | trust | big | capstone | fast-travel | shortcut
    opens: 2, closes: 4,                  // nights, inclusive (matches the doc's tables)
    skill: '2.3.3',
    reward: { silver: 20, heart: true, unlock: null },   // unlock: 'tunnel' | 'chute' | 'cellar-stair' | 'back-stair' | 'hoist' | 'seal-floor' | null
    steps: [                              // walk to a person or spot, talk, then a choice
      { at: { level: 'main-street', who: 'mira' }, say: [['mira', 'line'], ['seoyeon', 'line']] },
      { at: { level: 'main-street', spot: 'base-camp' }, ask: {
          q: 'What should the cook do?', choices: ['...', '...', '...'], answer: 0, why: '...' } },
      { at: { level: 'main-street', who: 'mira' }, say: [['mira', 'thanks line']] }
    ],
    clue: null                            // big quests: the mystery clue text, if any
  }],
  gossip: [{                              // shown at dawn and around town
    id: 'g-3-wind-1', day: 3, who: 'tess', where: 'main-street',
    line: 'What they say.', weather: 'wind',   // weather optional: only shown on that weather
    clue: false, herring: false            // clue lines count toward the mystery notebook
  }],
  dusk: [{ night: 1, who: 'pell', lines: ['Pell\'s dusk briefing lines'] }]
};
```

Content rules: AWS facts match current AWS docs; every question and explanation is written fresh (never copied from practice exams); names come from the story bible in `/mnt/project-files/story-bible/` (Bram is Mira's late husband: never reuse it). One best choice per fix and per question.
