// Every cutscene in the game, by chapter: each chapter names its cutscenes here when its script loads and plays them
// by name, so the 🐞 Debug menu's cutscene viewer (js/demo-select.js) can list and play every one of them, new ones
// included, without playing up to it. tools/reel_check.js fails on a cutscene that plays any other way.
//
//   const cut = SD.reel.chapter('4', { before, music });   once per chapter script. before() runs before each scene
//                                                           (closing panels); music(name) plays its song.
//   cut.def(id, title, steps, extra)    steps: a script for js/vn.js, or a function (arg) => script, built when it
//                                       plays (so per-lead lines read the lead then). extra: { music, note,
//                                       alts: [[label, arg], ...] (versions the viewer offers), run: async arg => ...
//                                       (a scene that isn't one script), leads: true (a run that changes with the
//                                       lead), ahead: id (list it before that scene, for story order) }
//   await cut.play(id, arg)             play it in the story.
//   await cut.play([id, step, id], arg) several in one go, with glue steps between (['fx', 'black']).
(function () {
  if (!SD.vn) return;
  const R = SD.reel = { list: [], playing: 0 };
  R.get = key => R.list.find(e => e.key === key);
  R.steps = (e, arg) => (typeof e.steps === 'function' ? e.steps(arg) : e.steps) || [];

  R.chapter = function (ch, opts) {
    opts = opts || {};
    const key = id => ch + '/' + id;
    const def = function (id, title, steps, extra) {
      const e = Object.assign({ ch, id, key: key(id), title, steps, opts }, extra || {});
      const at = R.list.findIndex(x => x.key === e.key), ahead = e.ahead && R.list.findIndex(x => x.key === key(e.ahead));
      if (at >= 0) R.list[at] = e;
      else if (ahead >= 0) R.list.splice(ahead, 0, e);
      else R.list.push(e);
      return e;
    };
    const play = (id, arg) => R.play(Array.isArray(id) ? id.map(x => (typeof x === 'string' ? key(x) : x)) : key(id), arg);
    return { def, play };
  };

  // Plays a scene by key ('4/cold'), or a list of keys and glue steps as one script (the first scene's music).
  R.play = async function (key, arg) {
    const parts = [].concat(Array.isArray(key) ? key : [key]);
    const scenes = parts.filter(p => typeof p === 'string').map(k => R.get(k) || missing(k));
    const e = scenes[0];
    if (e.opts.before) e.opts.before();
    if (e.music !== undefined) (e.opts.music || SD.audio.music)(e.music);
    R.playing++;
    try {
      if (e.run) return await e.run(arg);
      return await SD.vn.play(parts.flatMap(p => (typeof p === 'string' ? R.steps(R.get(p), arg) : [p])));
    } finally { R.playing--; }
  };
  function missing(k) { throw new Error('No cutscene ' + k + ' in SD.reel'); }

  // A cutscene played straight through js/vn.js wouldn't be in the viewer: say so where the checks see it.
  const raw = SD.vn.play;
  SD.vn.play = function (steps) {
    if (!R.playing) console.error('[reel] a cutscene played outside SD.reel: name it with SD.reel.chapter(...).def');
    return raw.apply(this, arguments);
  };
})();
