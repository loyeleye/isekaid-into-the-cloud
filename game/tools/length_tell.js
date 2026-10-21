// Length tell: does a question's right answer give itself away by being clearly longer (more qualified, more specific)
// than every wrong option? Shared by tools/question_lint.js (chapter questions) and tools/bank_check.js (the bank).
//
// "Longest" alone is a weak signal: a 1-character win counts the same as a 40-character one. What a test-taker notices
// is a right answer that stands out from the longest wrong option by a visible margin, so the rule is:
//
//   clear   the right answer is at least 15% AND at least 10 characters longer than the longest wrong option,
//           or, for short options where 10 characters is a lot, at least 40% and 6 characters longer.
//
// The same margin the other way round ("clearly shortest") is reported too, so a fix doesn't swing too far and teach
// "pick the short one" instead. For Select TWO, the right items are flagged when they are clearly longer than the
// wrong ones on average (the same margin), when each right item clearly beats the longest wrong one, or when the
// right items are exactly the longest ones and 10% (and 10 characters) longer on average. The check also counts how
// often the two right items are the two longest (chance is 1 in 10 for five items).
const RATIO = 1.15, DIFF = 10, SHORT_RATIO = 1.4, SHORT_DIFF = 6;

// Is a clearly longer than b by the margin above?
const clearlyLonger = (a, b) => (a >= b * RATIO && a - b >= DIFF) || (a >= b * SHORT_RATIO && a - b >= SHORT_DIFF);

// Single answer: opts (strings) and a (index of the right one).
function mc(opts, a) {
  const L = opts.map(o => o.length), right = L[a], wrong = L.filter((_, i) => i !== a);
  const maxWrong = Math.max(...wrong), minWrong = Math.min(...wrong);
  return {
    right, maxWrong, minWrong,
    longest: right >= maxWrong, shortest: right <= minWrong,
    clear: clearlyLonger(right, maxWrong), clearShort: clearlyLonger(minWrong, right),
    note: `right ${right} chars vs longest wrong ${maxWrong}`
  };
}

// Select TWO (or any multi): items [{t, ok}].
function multi(items) {
  const L = items.map(i => i.t.length), ok = items.map(i => !!i.ok);
  const r = L.filter((_, i) => ok[i]), w = L.filter((_, i) => !ok[i]);
  const mean = x => x.reduce((s, v) => s + v, 0) / x.length;
  const mr = mean(r), mw = mean(w);
  const sorted = L.map((l, i) => [l, ok[i]]).sort((x, y) => y[0] - x[0]);
  const topK = sorted.slice(0, r.length).every(x => x[1]);
  const bottomK = sorted.slice(-r.length).every(x => x[1]);
  return {
    meanRight: Math.round(mr), meanWrong: Math.round(mw),
    longest: sorted[0][1], topK, bottomK,
    // Right items stand out on average, or every right item clearly beats the longest wrong one, or the right items
    // are exactly the longest ones and longer on average by 10%: "pick the two longest" would then win.
    clear: clearlyLonger(mr, mw) || clearlyLonger(Math.min(...r), Math.max(...w)) || (topK && mr >= mw * 1.1 && mr - mw >= DIFF),
    clearShort: clearlyLonger(mw, mr) || clearlyLonger(Math.min(...w), Math.max(...r)) || (bottomK && mw >= mr * 1.1 && mw - mr >= DIFF),
    note: `right items average ${Math.round(mr)} chars vs wrong ${Math.round(mw)}`
  };
}

// Tally a list of results from mc() or multi().
function tally(rs) {
  const t = { n: rs.length, longest: 0, shortest: 0, clear: 0, clearShort: 0, topK: 0, bottomK: 0 };
  for (const r of rs) for (const k of ['longest', 'shortest', 'clear', 'clearShort', 'topK', 'bottomK']) if (r[k]) t[k]++;
  return t;
}
const pct = (a, n) => (n ? Math.round(100 * a / n) : 0) + '%';
const mcLine = t => `${t.n} single-answer: right is longest ${t.longest} (${pct(t.longest, t.n)}), clearly longest ${t.clear}, shortest ${t.shortest} (${pct(t.shortest, t.n)}), clearly shortest ${t.clearShort}`;
const multiLine = t => `${t.n} select-two: right items clearly longer ${t.clear}, both right are the two longest ${t.topK} (${pct(t.topK, t.n)}), clearly shorter ${t.clearShort}, both right are the two shortest ${t.bottomK} (${pct(t.bottomK, t.n)})`;

module.exports = { mc, multi, tally, pct, mcLine, multiLine, clearlyLonger, RATIO, DIFF };
