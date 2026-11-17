// Headless balance check for claim 9, the New Sorter (js/rush-yard.js on js/rush-core.js): scripted bots play each
// build over many seeds, and it prints win rates, the tank, ship coins and the hotfix numbers (design section 12).
// node tools/rush_sim_yard.js [seeds] [table: builds | hotfix | orders | all] [crates: mixed | cracked,bent | ...]
// A build is a list of tokens:
//   rack bin ledger board wire tests manifest   pieces ticked on the blueprint before the whistle
//   card:canary|linear|all                       the departure board's timetable
//   watch:new|live                               what the alarm wire watches (bought, it watches LIVE)
//   lever@2                                      the lever bot: pulls the red lever 2 s after it sees 2 errors on the
//                                                newest version (not poison, not new forms: those show on the waybill)
//   hold4                                        with the manifest, slot 4 waits for the platform to empty
//   never                                        never deploys: sends every crate back (manifest) or never turns the dial
//   hotfix:wait|stop|force|smart                 the hotfix card (smart: wait if <= 2 s left; force if the test track is
//                                                on; otherwise stop and canary). Unset: the card runs out (wait).
//   depot:all|rolling|additional|immutable|split   the parcel depot's policy (Night Order)
//   p:solve|none                                 the cellar (review room): answer every question (6 s away from the yard
//                                                each, the default) or leave it be
// Without the board the player turns the dial straight to 100% (unless "never").
// SIM_CRATES=cracked,bent forces the two middle crates (default: each seed's own order).
const R = require('../js/rush-core.js');
const Y = require('../js/rush-yard.js');
const N = +process.argv[2] || 200, TABLE = process.argv[3] || 'builds', CRATES = process.argv[4] || process.env.SIM_CRATES || 'mixed';
const LEVN = +process.env.SIM_LEVN || 2, SOLVE = 6, NOTICE = 0.5, REACT = 1, WATCH = +process.env.SIM_WATCH || 0, POOL = Array.from({ length: 12 }, (_, i) => 'L' + i);
const LESSON = ['rack', 'bin', 'board', 'wire', 'card:canary', 'watch:new'];
const BUILDS = {
  builds: [
    ['lever@2'],
    ['rack', 'bin', 'lever@2'],
    ['rack', 'bin', 'board', 'wire', 'card:all', 'watch:new', 'lever@2'],
    ['rack', 'bin', 'board', 'wire', 'card:linear', 'watch:new', 'lever@2'],
    LESSON.concat('lever@2'),
    LESSON,
    ['rack', 'bin', 'board', 'wire', 'card:canary', 'watch:live', 'lever@2'],
    ['rack', 'bin', 'board', 'card:canary', 'lever@2'],
    LESSON.concat('tests', 'lever@2'),
    LESSON.concat('manifest', 'hold4', 'lever@2'),
    LESSON.concat('manifest', 'lever@2'),
    ['rack', 'bin', 'never'],
    ['rack', 'bin', 'board', 'manifest', 'never'],
    ['rack', 'bin', 'ledger', 'board', 'wire', 'card:canary', 'watch:new', 'lever@2']
  ],
  hotfix: [
    LESSON.concat('lever@2', 'hotfix:wait'),
    ['rack', 'bin', 'board', 'wire', 'card:linear', 'watch:new', 'lever@2', 'hotfix:wait'],
    LESSON.concat('lever@2', 'hotfix:stop'),
    LESSON.concat('tests', 'lever@2', 'hotfix:force'),
    LESSON.concat('lever@2', 'hotfix:force'),
    LESSON.concat('lever@2', 'hotfix:smart'),
    LESSON.concat('tests', 'lever@2', 'hotfix:smart'),
    ['rack', 'bin', 'board', 'card:all', 'lever@2', 'hotfix:wait']
  ]
};
function play(seed, build, crates, orders) {
  const has = t => build.includes(t), tok = p => (build.find(t => t.startsWith(p + ':')) || '').split(':')[1];
  const book = new Map(POOL.map(id => [id, { id, solved: true, right: 1, wrong: 0, by: { player: { right: 1, wrong: 0 } }, last: null }]));
  const S = R.create(seed, 'sorter', orders || [], 0, book);
  if (crates && crates !== 'mixed') Y.setCrates(S, crates.split(','));
  if (S.review) S.review.qpool = POOL.slice();
  Y.blueprint(S, ['rack', 'bin', 'ledger', 'board', 'wire', 'tests', 'manifest'].filter(has));
  if (tok('card')) Y.setCard(S, tok('card'));
  if (tok('depot')) Y.setDepot(S, tok('depot'));
  if (S.wire) S.watch = tok('watch') || 'live';
  R.start(S);
  const lev = has('lever@2') ? 2 : 0, pol = tok('p') || 'solve', hf = tok('hotfix') || (lev || has('wire') ? 'smart' : '');
  const me = { away: 0, task: null, errs: {}, pull: null, hfAt: 0 };
  const m = { form2: new Set(), incident: 0, fired: false, openShift: false, busyAtCard: false, inFlight: 0, conflict: null, firedAt: 0, beginAt: 0, wasHf: '' };
  while (!S.over && S.time < 300) {
    R.step(S, 1 / 30);
    for (const e of R.drain(S)) {
      if (e.type === 'yardError') {
        if (e.form2) m.form2.add(e.id);
        const v = S.versions[e.ver];
        if (!e.poison && !e.form2 && e.ver !== 1 && v && (S.alias.cur === e.ver || S.alias.next === e.ver)) me.errs[e.ver] = (me.errs[e.ver] || 0) + 1;
      }
      if (e.type === 'spill' && m.form2.has(e.id)) m.incident++;
      if (e.type === 'hotfix') { m.fired = true; m.firedAt = S.time; m.openShift = e.left > 0; m.busyAtCard = e.busy; m.inFlight = e.inFlight; me.hfAt = S.time + REACT; }
      // A careful player watches a new version for a few seconds before going down to the cellar.
      if (e.type === 'deployed' || e.type === 'shift') me.watch = S.time + WATCH;
      if (e.type === 'stack' && e.hotfix && !m.beginAt) { m.beginAt = S.time; m.conflict = S.time - m.firedAt; }
    }
    if (S.review) R.drain(S.review);
    const here = S.time >= me.away;
    // The cellar: go and answer a question when nothing in the yard needs a hand.
    if (S.review && pol === 'solve') {
      if (me.task && S.time >= me.task.at) { R.reply(S.review, me.task.id, true); me.task = null; }
      if (!me.task && here && !me.pull && S.time >= (me.watch || 0) && !(S.y.hf.state === 'card' && hf)) {
        const k = S.review.tickets.find(x => x.quiz && x.phase === 'ask' && S.review.time - x.askAt >= NOTICE && x.askAt + R.T.askWait - S.review.time > SOLVE);
        if (k) { me.task = { id: k.id, at: S.time + SOLVE }; me.away = S.time + SOLVE; }
      }
    }
    if (!here) continue;
    const d = S.y.dep;
    // The hand dial: straight to 100%.
    if (d && d.cfg === 'hand' && d.phase === 'shift' && S.alias.w === 0 && !has('never')) Y.dial(S, 1);
    // The office: execute (or hold slot 4 until the platform's empty, or send everything back).
    if (S.y.held && !S.y.held.when) { const c = S.y.held.crate; if (has('never')) Y.sendBack(S); else Y.execute(S, has('hold4') && c.slot === 4 ? 'empty' : 'now'); }
    // The lever bot.
    if (lev) {
      for (const v of Object.keys(me.errs)) if (me.errs[v] >= LEVN && !me.pull) { me.pull = { v: +v, at: S.time + lev }; me.errs[v] = -99; }
      if (me.pull && S.time >= me.pull.at) { const v = me.pull.v; me.pull = null; if (S.alias.cur === v || S.alias.next === v) Y.lever(S); }
    }
    // The hotfix card.
    if (hf && S.y.hf.state === 'card' && S.time >= me.hfAt) {
      let c = hf;
      if (hf === 'smart') c = Y.shiftLeft(S) <= 2 || !Y.groupBusy(S) ? 'wait' : S.tests ? 'force' : 'stop';
      Y.choose(S, c);
    }
  }
  Y.settle(S);
  return { S, m };
}
function run(build, crates, orders) {
  const a = { win: 0, spill: 0, ship: 0, fa: 0, rb: 0, rep: 0, inc: 0, busy: 0, coins: 0, open: 0, flight4: 0, conflict: 0, nConf: 0, snag: 0, cellar: 0, perSeed: [] };
  for (let s = 1; s <= N; s++) {
    const { S, m } = play(s, build, crates, orders);
    const won = S.over === 'win'; a.win += won; a.perSeed.push(won);
    a.spill += S.spill; a.ship += S.shipped; a.fa += S.falseAlarms; a.rb += S.rollbacks; a.rep += S.replaced; a.inc += m.incident; a.busy += S.busyTaps; a.coins += S.coins;
    a.open += m.fired && m.openShift; a.flight4 += m.fired && m.inFlight >= 4; if (m.conflict != null) { a.conflict += m.conflict; a.nConf++; }
    a.cellar += S.review ? S.review.lost : 0;
  }
  const f = x => (x / N).toFixed(1);
  return { build: build.join(' ') || '(nothing)', win: (100 * a.win / N).toFixed(0) + '%', tank: f(a.spill), ship: f(a.ship), falseAlarms: f(a.fa), rollbacks: f(a.rb), replaced: f(a.rep), incident: f(a.inc), coinsEnd: f(a.coins), cellarLost: f(a.cellar),
    openShift: (100 * a.open / N).toFixed(0) + '%', busy4: (100 * a.flight4 / N).toFixed(0) + '%', conflictS: a.nConf ? (a.conflict / a.nConf).toFixed(1) : '-', _wins: a.perSeed };
}
const strip = r => { const o = Object.assign({}, r); delete o._wins; return o; };
const MAIN = require.main === module;
if (MAIN && (TABLE === 'builds' || TABLE === 'all')) {
  console.log(`Builds, ${N} seeds, crates ${CRATES}`);
  console.table(BUILDS.builds.map(b => strip(run(b, CRATES))));
}
if (MAIN && (TABLE === 'hotfix' || TABLE === 'all')) {
  console.log(`Hotfix policies, ${N} seeds, crates ${CRATES}`);
  console.table(BUILDS.hotfix.map(b => strip(run(b, CRATES))));
}
if (MAIN && (TABLE === 'orders' || TABLE === 'all')) {
  console.log(`Night Orders, ${N} seeds, crates ${CRATES}`);
  console.table([[LESSON.concat('lever@2'), []], [LESSON.concat('lever@2'), ['depot']], [LESSON.concat('lever@2', 'depot:immutable'), ['depot']], [['rack', 'bin', 'lever@2'], []], [['rack', 'bin', 'lever@2'], ['express']], [LESSON.concat('lever@2'), ['express']]]
    .map(([b, o]) => Object.assign({ orders: o.join() || '-' }, strip(run(b, CRATES, o)))));
}
// Per crate order: the lesson build and the hotfix policies, so no fixed policy is best everywhere.
if (MAIN && TABLE === 'pairs') {
  for (const pair of ['cracked,bent', 'bent,cracked', 'cracked,snag', 'snag,cracked', 'bent,snag', 'snag,bent']) {
    console.log(`Crates ${pair}, ${N} seeds`);
    console.table(BUILDS.builds.slice(0, 11).concat(BUILDS.hotfix).map(b => { const r = run(b, pair); return { build: r.build, win: r.win, tank: r.tank, ship: r.ship }; }));
  }
}
module.exports = { play, run, BUILDS };
