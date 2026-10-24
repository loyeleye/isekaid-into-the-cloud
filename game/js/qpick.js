// Semi-random questions: where several questions fit a spot, ask one of them at random, so a player reads the
// question instead of remembering a sequence of answers. Shared by every chapter.
//   SD.qpick(pool, { c })  -> a copy of one question from pool, or null if none of it exists
//     pool  ids from the exam bank (js/bank-*.js) or SD.questions, and/or whole question objects (with an id)
//     c     the concept to file the copy under (bank questions carry none of their own)
// It skips the questions asked most recently (the last 40, kept in S.save.qseen) while the pool has others, and
// records the one it picks.
(function () {
  const KEEP = 40;
  const find = id => (SD.bank || []).find(q => q.id === id) || (SD.questions || []).find(q => q.id === id);
  SD.qpick = function (pool, opts) {
    opts = opts || {};
    const qs = pool.map(p => {
      const q = typeof p === 'string' ? find(p) : p;
      if (!q) console.warn('qpick: no question ' + p);
      return q;
    }).filter(Boolean);
    if (!qs.length) return null;
    // Exam mode (js/exam.js): never a held-out question, and no SAA-only one while the pool has others.
    const E = SD.exam;
    if (E) {
      const ok = qs.filter(E.allowed);
      if (ok.length) qs.splice(0, qs.length, ...ok);
    }
    const S = SD.state, save = S && S.save;
    const seen = (save && save.qseen) || [];
    const fresh = qs.filter(q => !seen.includes(q.id));
    const from = fresh.length ? fresh : qs;
    const q = from[Math.floor(Math.random() * from.length)];
    if (save && q.id) {
      save.qseen = seen.filter(id => id !== q.id).concat(q.id).slice(-KEEP);
      if (S.persist) S.persist();
    }
    return opts.c ? Object.assign({}, q, { c: opts.c }) : Object.assign({}, q);
  };
})();
