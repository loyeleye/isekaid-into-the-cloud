// Type it first (js/quiz.js): which option do a player's own few words match? On a question you missed before, the
// options stay hidden until you've typed an answer; this finds the option your words are closest to, so the feedback
// can say whether you recalled the answer or only recognised it among the options.
//
// Two signals, both on the device: word overlap with each option, weighted by how rare each word is among that
// question's options (so "FIFO" counts for little when every option says FIFO), and the on-device sentence model
// (js/embed.js). camelCase API names are split, so "max record age" meets MaximumRecordAgeInSeconds.
// It only says it is sure when the best option leads the next by a clear margin; otherwise the player compares.
// tools/recall_check.js measures it against short typed answers.
(function () {
  const R = SD.recall = {};
  const STOP = new Set('a an the and or of to in on for with so that is it its be by as at from this each every which can not no do does dont don t s set use using'.split(' '));
  const split = t => String(t || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  const words = t => split(t).toLowerCase().replace(/[^a-z0-9:$.\-_ ]+/g, ' ').split(/\s+/)
    .map(w => w.replace(/^[.\-_]+|[.\-_]+$/g, '')).filter(w => w && !STOP.has(w));
  const stem = w => { w = w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w; return w.replace(/ll$/, 'l'); };
  const bag = t => new Set(words(t).map(stem).concat(words(String(t || '').toLowerCase()).map(stem)));
  R.LEX = 0.6;          // weight of word overlap; the model gets the rest
  R.SURE = 0.15;        // the best option must lead the next by this much...
  R.SURE_WORDS = 0.25;  // ...or by this much when the model isn't loaded and only words count

  // match(typed, opts) -> { best, scores, gap, sure, model }: best is an index into opts.
  R.match = function (typed, opts) {
    const E = SD.embed, model = !!(E && E.ready);
    const tw = bag(typed), ow = opts.map(bag), df = {};
    ow.forEach(s => s.forEach(w => { df[w] = (df[w] || 0) + 1; }));
    const lex = ow.map(s => {
      let hit = 0, all = 0;
      tw.forEach(w => { const idf = Math.max(0, Math.log((opts.length + 1) / ((df[w] || 0) + 0.5))); if (s.has(w)) hit += idf; all += idf; });
      return all ? hit / all : 0;
    });
    const tv = model ? E.vec(typed) : null;
    const scores = opts.map((o, i) => (tv ? R.LEX * lex[i] + (1 - R.LEX) * E.cos(tv, E.vec(o)) : lex[i]));
    const order = scores.map((s, i) => i).sort((a, b) => scores[b] - scores[a]);
    const gap = scores[order[0]] - (order.length > 1 ? scores[order[1]] : 0);
    return { best: order[0], scores, gap, sure: scores[order[0]] > 0 && gap >= (model ? R.SURE : R.SURE_WORDS), model };
  };
  // Options a phone keyboard shouldn't be asked to reproduce: JSON, policies, CLI commands, code.
  R.codey = opts => (opts || []).some(o => /[{}[\]]|^\s*(aws|sam|cdk|npm|git) |--[a-z]|"\w+"\s*:|=>|\(\)/.test(o));
  // Which wrong option is closest to the right one (for "Why not this one?"): the look-alike worth explaining.
  R.closest = function (opts, a, can) {
    const right = bag(opts[a]);
    let best = -1, bs = -1;
    opts.forEach((o, i) => {
      if (i === a || (can && !can(i))) return;
      const s = bag(o); let n = 0; s.forEach(w => { if (right.has(w)) n++; });
      const sc = n / Math.max(1, Math.min(s.size, right.size));
      if (sc > bs) { bs = sc; best = i; }
    });
    return best;
  };
})();
