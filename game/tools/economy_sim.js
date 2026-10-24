#!/usr/bin/env node
// Economy sim for the FullGame profile: loads js/tapes.js (tape prices) and js/economy.js (SD.econ) under
// SD.profile = 'full' and plays 60 nights through chapters 1-7 for players at several accuracies and confidence
// habits, then checks the plan's targets (FullGame plan, Economy and Addendum A):
//   1. the first Seymour tape is affordable by night 2 for 90% or more of the players in every habit that tries;
//   2. always saying Sure never out-earns saying it honestly, at 60% accuracy or lower;
//   3. skipping never out-earns trying (per answer and over the game);
//   4. no balance runs away: at each chapter's end the balance is at most 2x that chapter's sink total
//      (what was spent there plus what was still on offer), the game design review's pass line.
// Prints a compact table and exits 1 on a failed target. No dependencies.
//
//   node tools/economy_sim.js            (from game/)
//   R=500 SEED=7 node tools/economy_sim.js
//   RIGHT=3 WRONG=1 SURE_RIGHT=5 node tools/economy_sim.js   try other set payouts (this run only; SURE_WRONG too)
//
// Player model: each question's chance of being right is drawn from Beta(mean = accuracy, concentration 4). Honest
// says Sure when that chance is 0.75 or more; overconfident from 0.45; always-Sure on everything; always-skip skips
// every question (it still sits mocks and buys what it can). Every night is the full 15: the set, then the map's
// glimmers (2 in ch1, 4 after), one in four of which is a concept already answered tonight.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');

const R = +process.env.R || 300, SEED = +process.env.SEED || 1, CONC = +process.env.CONC || 4;
const NIGHTS = [5, 8, 9, 9, 9, 10, 10];             // nights per chapter, 60 in all
const ACC = [0.5, 0.6, 0.7, 0.9];
const HABITS = { honest: 0.75, overconfident: 0.45, alwaysSure: -1, alwaysSkip: 2 };
const STARTER = 9;                                    // js/ch1.js's starting deck
const SET_PIECES = 3, HARDEST = 1, TAKE = 0.7;        // card finds per chapter, and the share a player takes
const FORMS = 4;                                      // held-out mock forms per track
const TAPE_WANT = 4, EXPEDITION_EVERY = 2, TAPE_USE = 0.5; // tapes kept on hand; an expedition every 2 nights uses one half the time
const RESERVE = 100;                                  // cosmetics only from what's left above this

function load() {
  const ctx = { console, Date, Math, JSON, Object, Array, isFinite };
  ctx.window = ctx;
  ctx.SD = { profile: 'full', state: { save: { shards: 0 } }, ui: {} };
  vm.createContext(ctx);
  for (const f of ['tapes.js', 'economy.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', f), 'utf8'), ctx, { filename: f });
  if (!ctx.SD.econ) throw new Error('economy.js did not define SD.econ under the full profile');
  // And it must stay out of every other profile.
  const off = { console, SD: { profile: 'demo', state: { save: {} }, ui: {} } };
  vm.createContext(off);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'js', 'economy.js'), 'utf8'), off);
  if (off.SD.econ) throw new Error('economy.js defined SD.econ outside the full profile');
  return ctx.SD;
}
const SD = load(), E = SD.econ;
// Overrides for tuning: RIGHT, WRONG, SURE_RIGHT, SURE_WRONG replace tonight's-set payouts for this run only.
const OV = { right: 'RIGHT', wrong: 'WRONG', sureRight: 'SURE_RIGHT', sureWrong: 'SURE_WRONG' };
if (Object.values(OV).some(k => process.env[k] != null)) {
  const t = Object.assign({}, E.SET);
  Object.keys(OV).forEach(k => { if (process.env[OV[k]] != null) t[k] = +process.env[OV[k]]; });
  E.SET = E.GLIMMER = Object.freeze(t);
}

// Seeded random numbers.
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function gamma(r, k) {
  if (k < 1) return gamma(r, k + 1) * Math.pow(r(), 1 / k);
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    let x, v;
    do { const u1 = r(), u2 = r(); x = Math.sqrt(-2 * Math.log(u1 || 1e-12)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x; } while (v <= 0);
    v = v * v * v; const u = r();
    if (u < 1 - 0.0331 * x * x * x * x || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
  }
}
const beta = (r, mean, conc) => { const m = Math.min(0.98, Math.max(0.02, mean)); const a = gamma(r, m * conc), b = gamma(r, (1 - m) * conc); return a / (a + b); };

const SINKS = ['tapes', 'doors', 'removal', 'forge', 'shop', 'cosmetics'];
function play(acc, habit, seed) {
  // Two streams: questions (the same for every habit, so habits differ only in how they answer) and everything else.
  const rq = rng(seed), r = rng(seed ^ 0x9E3779B9), sureAt = HABITS[habit];
  const st = E.fresh();
  let bal = 0, income = 0, tapes = 0, night = 0, firstTape = null, shopBought = 0, lastMock = null;
  const spent = Object.fromEntries(SINKS.map(k => [k, 0])), chEnd = [], chSink = [];
  const owned = Array.from({ length: STARTER }, (_, i) => 'st' + i);
  const buy = (sink, cost, chSpent) => { if (!E.canAfford(bal, cost)) return false; bal -= cost; spent[sink] += cost; chSpent.v += cost; return true; };
  const ask = q => (sureAt === 2 ? { skip: true } : { conf: sureAt < 0 || q >= sureAt ? 2 : 1 });
  for (let ch = 1; ch <= 7; ch++) {
    const chSpent = { v: 0 }, doors = Array.from({ length: E.DOOR.perChapter }, (_, k) => `d${ch}-${k}`);
    const finds = SET_PIECES + HARDEST;
    if (ch === E.TAPES.opens.seymour) tapes = 3;     // Seymour's first gift (js/tapes.js STARTER)
    for (let n = 0; n < NIGHTS[ch - 1]; n++) {
      night++;
      const day = 'n' + night;
      // Tonight's 15: the set, then the map's glimmers.
      const glim = ch === 1 ? 2 : 4;
      for (let i = 0; i < E.NIGHT_CAP; i++) {
        const g = i >= E.NIGHT_CAP - glim, q = beta(rq, acc, CONC), ok = rq() < q, rep = rq() < 0.25;
        const res = Object.assign(ask(q), { ok, glimmer: g, concept: g && rep ? 'q0' : 'q' + i });
        const p = E.answer(st, res, day);
        bal += p; income += p;
      }
      // A mock on an unseen form, once a week, from ch2.
      if (ch >= 2 && st.mocks.used.length < FORMS) {
        const form = 'form' + st.mocks.used.length, p = E.mockPayout({ form, used: st.mocks.used, daysSince: lastMock == null ? null : night - lastMock, rose: 1 });
        if (p) { st.mocks.used.push(form); lastMock = night; bal += p; income += p; }
      }
      if (firstTape == null && E.canAfford(bal, E.tapePrice('seymour'))) firstTape = night;
      // Card finds through the chapter: set pieces and the hardest find, some skipped.
      if (n % Math.max(1, Math.floor(NIGHTS[ch - 1] / finds)) === 0 && owned.length < STARTER + 4 * 7 * 2) {
        if (r() < TAKE) owned.push(`c${ch}-${n}`); else { bal += E.CARD_SKIP; income += E.CARD_SKIP; }
      }
      // Expeditions use tapes.
      if (ch >= 2 && night % EXPEDITION_EVERY === 0 && tapes > 0 && r() < TAPE_USE) tapes--;
      // Spending, in priority order.
      const seller = ch >= E.TAPES.opens.kagemaru ? 'kagemaru' : 'seymour', tp = E.tapePrice(seller, ch), rev = E.tapeReview();
      if (tp != null && tapes < TAPE_WANT && E.canAfford(bal, tp)) {
        let right = 0; for (let i = 0; i < rev.n; i++) if (r() < beta(r, acc, 4)) right++;
        if (right >= rev.pass && buy('tapes', tp, chSpent)) tapes++;
      }
      const dp = E.doorPrice(ch), target = owned.find(id => E.canUpgrade(st, id));
      const door = doors.find(id => E.doorReady(st, id, day));
      if (typeof dp === 'number' && door && target && E.canAfford(bal, dp)) {
        const res = E.doorAttempt(st, door, r() < beta(r, acc - 0.1, 4), dp, day);
        if (res.opened && buy('doors', res.charge, chSpent)) E.upgrade(st, target);
      }
      if (ch >= E.DOOR.favourCh && door && target) { const res = E.doorAttempt(st, door, r() < beta(r, acc - 0.1, 4), dp, day); if (res.opened) E.upgrade(st, target); }
      const rc = E.removeCost(ch, st.removals), starter = owned.filter(id => id.startsWith('st'));
      if (rc != null && starter.length > E.CARDS.deckMin && buy('removal', rc, chSpent)) { st.removals++; owned.splice(owned.indexOf(starter[0]), 1); }
      const uc = E.upgradeCost(ch);
      for (let k = 0; uc != null && k < E.FORGE.perVisit; k++) {
        const t = owned.find(id => E.canUpgrade(st, id));
        if (t && buy('forge', uc, chSpent)) E.upgrade(st, t); else break;
      }
      const sp = E.shopPrice('uncommon', ch);
      if (sp != null && shopBought < E.SHOP.perChapter * (ch - E.SHOP.opens + 1) && buy('shop', sp, chSpent)) { shopBought++; owned.push('shop' + shopBought); }
      if (E.isOpen(E.COSMETICS.opens, ch)) {
        const c = E.COSMETICS.items.find(x => !st.cosmetics.includes(x.id));
        if (c && bal - c.cost >= RESERVE && buy('cosmetics', c.cost, chSpent)) st.cosmetics.push(c.id);
      }
    }
    // What was still on offer at the chapter's end.
    const left = (typeof E.doorPrice(ch) === 'number' ? doors.filter(id => E.doorReady(st, id, 'next')).length * E.doorPrice(ch) : 0)
      + (E.removeCost(ch, st.removals) != null ? Math.max(0, owned.filter(id => id.startsWith('st')).length - E.CARDS.deckMin) * E.removeCost(ch, st.removals) : 0)
      + (E.upgradeCost(ch) != null ? owned.filter(id => E.canUpgrade(st, id)).length * E.upgradeCost(ch) : 0)
      + (E.shopPrice('uncommon', ch) != null ? Math.max(0, E.SHOP.perChapter * (ch - E.SHOP.opens + 1) - shopBought) * E.shopPrice('uncommon', ch) : 0)
      + (E.isOpen(E.COSMETICS.opens, ch) ? E.COSMETICS.items.filter(x => !st.cosmetics.includes(x.id)).reduce((a, x) => a + x.cost, 0) : 0);
    chEnd.push(bal); chSink.push(chSpent.v + left);
  }
  return { income, bal, firstTape, spent, chEnd, chSink };
}

// Run every cell with common random numbers (the same seeds across habits).
const out = {};
for (const a of ACC) for (const h of Object.keys(HABITS)) {
  const runs = Array.from({ length: R }, (_, i) => play(a, h, SEED * 100003 + i * 7919 + Math.round(a * 1000)));
  const avg = f => runs.reduce((s, x) => s + f(x), 0) / R;
  out[a + h] = {
    a, h, income: avg(x => x.income), bal: avg(x => x.bal),
    firstTape: runs.map(x => x.firstTape == null ? 99 : x.firstTape).sort((p, q) => p - q)[Math.floor(R / 2)],
    byNight2: runs.filter(x => x.firstTape != null && x.firstTape <= 2).length / R,
    spent: Object.fromEntries(SINKS.map(k => [k, avg(x => x.spent[k])])),
    chEnd: [0, 1, 2, 3, 4, 5, 6].map(i => avg(x => x.chEnd[i])),
    ratio: [0, 1, 2, 3, 4, 5, 6].map(i => Math.max.apply(null, runs.map(x => x.chSink[i] ? x.chEnd[i] / x.chSink[i] : 0))),
    noCosmetic: avg(x => x.bal + x.spent.cosmetics)
  };
}

const pad = (s, n) => String(s).padStart(n), lpad = (s, n) => String(s).padEnd(n);
console.log(`Economy sim: ${R} players a cell, 60 nights (${NIGHTS.join('/')} by chapter), seed ${SEED}`);
console.log(`Tonight's set: right ${E.SET.right}, wrong ${E.SET.wrong}, Sure-right ${E.SET.sureRight}, Sure-wrong ${E.SET.sureWrong}, skip ${E.SET.skip}; cap ${E.NIGHT_CAP}. Tapes ${E.tapePrice('seymour')}/${E.tapePrice('kagemaru')} (js/tapes.js).`);
console.log('\nacc  habit          /night  income  tape n2  ch-end balance (ch1..ch7)                 final  w/o cosm  max bal/sink');
for (const k of Object.keys(out)) {
  const o = out[k];
  console.log(`${pad(Math.round(o.a * 100) + '%', 3)}  ${lpad(o.h, 13)} ${pad((o.income / 60).toFixed(1), 6)} ${pad(Math.round(o.income), 7)}  ${pad(Math.round(o.byNight2 * 100) + '%', 7)}  ${o.chEnd.map(x => pad(Math.round(x), 5)).join(' ')}  ${pad(Math.round(o.bal), 6)}  ${pad(Math.round(o.noCosmetic), 8)}  ${pad(Math.max.apply(null, o.ratio.slice(1)).toFixed(2), 6)}`);
}
console.log('\nWhere the shards went (mean over the game, honest players):');
console.log('acc   ' + SINKS.map(s => pad(s, 10)).join(''));
for (const a of ACC) { const o = out[a + 'honest'], t = SINKS.reduce((s, k) => s + o.spent[k], 0) || 1; console.log(`${pad(Math.round(a * 100) + '%', 3)}   ` + SINKS.map(s => pad(`${Math.round(o.spent[s])} ${Math.round(100 * o.spent[s] / t)}%`, 10)).join('')); }

// Targets.
const fails = [];
const tp = E.tapePrice('seymour');
for (const a of ACC) for (const h of ['honest', 'overconfident', 'alwaysSure']) if (out[a + h].byNight2 < 0.9) fails.push(`first tape (${tp}) affordable by night 2 for only ${Math.round(out[a + h].byNight2 * 100)}% of ${a * 100}% ${h} players (target 90%)`);
for (const a of ACC.filter(x => x <= 0.6)) if (out[a + 'alwaysSure'].income > out[a + 'honest'].income) fails.push(`always-Sure out-earns honest at ${a * 100}%: ${Math.round(out[a + 'alwaysSure'].income)} > ${Math.round(out[a + 'honest'].income)}`);
for (const a of ACC) for (const h of ['honest', 'overconfident', 'alwaysSure']) if (out[a + 'alwaysSkip'].income >= out[a + h].income) fails.push(`skipping out-earns ${h} at ${a * 100}%`);
const S = E.SET;
if (S.skip > Math.min(S.wrong, S.sureWrong)) fails.push('a skip pays more than a wrong answer');
if (E.CARD_SKIP > S.wrong) fails.push('skipping a card offer pays more than a wrong answer');
if (E.doorCharge(E.DOOR.tiers[1], false) !== 0) fails.push('a wrong answer at Kagemaru\'s door costs shards');
for (const k of Object.keys(out)) { const o = out[k]; o.ratio.forEach((x, i) => { if (i > 0 && x > 2) fails.push(`balance ran away: ${o.a * 100}% ${o.h}, end of ch${i + 1}, ${x.toFixed(2)}x that chapter's sinks`); }); }
const be = S.wrong - S.sureWrong, brk = be / (S.sureRight - S.right + be);
console.log(`\nSure pays off on an item you get right more than ${Math.round(brk * 100)}% of the time.`);
if (fails.length) { console.log('\nFAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('All targets met.');
