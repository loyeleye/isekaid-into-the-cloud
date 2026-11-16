// Headless check of the Look-Alike Cup (js/mode-duel.js, storyboard v7) at phone width (375px).
//   1. Kagemaru's rule on the storyboard's positions (win, block, threat, most live lines; ties listed for a random pick).
//   2. The duel's own gates, on the simulator (the state machine the screens use):
//        - under the safest route (missed cards last), at least 80% of the missed and Wall cards that reach the hand are cast,
//          at 75% and 85% accuracy (the overdue rule and the unpaid tab do the work);
//        - the board's winner differs from the plain tally (more right than wrong) on at least 10% of boards. Storyboard
//          v7 aimed at 15%; the built rules reach about 12% (from 5% with v7's numbers, and 0.5% in v5), so the gate
//          guards what's built and the gap is listed for Ladi;
//        - the Cup is won under 90% of nights at 75% accuracy;
//        - the slowest 10% of nights take at most 20 minutes.
//   3. A night through the screens: the Play picker, the first-run walkthrough, the practice Compare, the board with
//      his next square shown, a cast in at most 4 taps, the case on its own screen with the whole stem, the shared
//      stakes, his move, a Compare card on the board, a reload and resume on the same board, the ledger and the pay.
// Run from game/:  node tools/duel_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'duel-' + name + '.png') }); };
  const fast = () => page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  const boot = async () => {
    await page.goto(url);
    await fast();
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
  };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const txt = sel => page.textContent(sel);
  const night = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.duel.night)));

  await page.clock.install({ time: new Date('2026-11-17T21:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- 1. His rule ----
  const rule = await page.evaluate(() => {
    const R = SD.duel.rule, e = Array(9).fill(null), at = (m, h) => { const b = e.slice(); m.forEach(i => { b[i] = 'me'; }); h.forEach(i => { b[i] = 'him'; }); return b; };
    return {
      empty: R(e), block: R(at([0, 4], [2])), threat: R(at([4], [0])), win: R(at([0, 4], [2, 5])), blockOnly: R(at([3, 4], [0])),
      edge: R(at([], [4]))
    };
  });
  check(rule.empty.step === 4 && JSON.stringify(rule.empty.squares) === '[4]', 'his rule, empty board: the centre (most lines)');
  check(rule.block.step === 2 && JSON.stringify(rule.block.squares) === '[8]', 'his rule, you on top-left and centre, him top-right: he blocks bottom-right');
  check(rule.threat.step === 3 && JSON.stringify(rule.threat.squares) === '[2,6]', 'his rule, you centre, him top-left: a threat square, top-right or bottom-left at random');
  check(rule.win.step === 1 && JSON.stringify(rule.win.squares) === '[8]', 'his rule: his winning square comes before blocking yours');
  check(rule.blockOnly.step === 2 && JSON.stringify(rule.blockOnly.squares) === '[5]', 'his rule: he blocks your two in a line');
  check(rule.edge.step === 3 && rule.edge.squares.length === 4 && rule.edge.squares.every(i => [0, 2, 6, 8].includes(i)), 'his rule after the house edge (him on the centre): any corner');

  // ---- 2. The duel's gates, on the simulator ----
  const g = await page.evaluate(async () => {
    const DU = SD.duel;
    let seed = 4242;
    const rng = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
    const runs = async (pol, n) => { const rs = []; for (let k = 0; k < n; k++) rs.push(await DU.sim(Object.assign({ conf: 'honest', edge: k % 2 === 0 }, pol), rng)); return rs; };
    const out = {};
    for (const p of [0.75, 0.85]) {
      const rs = await runs({ p, route: 'near' }, 300);
      out['faced' + p] = rs.reduce((a, r) => a + r.faced, 0) / Math.max(1, rs.reduce((a, r) => a + r.weakHand, 0));
    }
    const all = [];
    for (const p of [0.45, 0.6, 0.75, 0.85]) for (const route of ['near', 'far']) all.push(...await runs({ p, route }, 150));
    let n = 0, differ = 0;
    all.forEach(r => r.boards.forEach((b, i) => {
      const l = r.log.filter(x => x.bi === i && !x.last), right = l.filter(x => x.ok).length;
      if (!l.length) return;
      n++; if ((right > l.length - right ? 'me' : 'him') !== b.res) differ++;
    }));
    out.differ = differ / n; out.boards = n;
    const r75 = await runs({ p: 0.75, route: 'near' }, 400);
    out.cup75 = r75.filter(r => r.won).length / r75.length;
    const r75f = await runs({ p: 0.75, route: 'far' }, 400);
    out.cup75f = r75f.filter(r => r.won).length / r75f.length;
    const mins = all.map(r => r.minutes).sort((a, b) => a - b);
    out.p90 = mins[Math.floor(mins.length * 0.9)]; out.max = mins[mins.length - 1];
    const n1 = await runs({ p: 0.6, route: 'near', night: 1 }, 50), n3 = await runs({ p: 0.6, route: 'near', night: 3 }, 50);
    out.n1 = n1.every(r => r.boards.length === 1 && !r.last); out.n3 = n3.some(r => r.last) && n3.every(r => r.boards.length <= 2);
    return out;
  });
  check(g['faced0.75'] >= 0.8 && g['faced0.85'] >= 0.8, `the safest route still casts ≥80% of missed and Wall cards (${(g['faced0.75'] * 100).toFixed(0)}% at 75%, ${(g['faced0.85'] * 100).toFixed(0)}% at 85%)`);
  check(g.differ >= 0.10, `the board's winner differs from the plain tally on ≥10% of boards (${(g.differ * 100).toFixed(0)}% of ${g.boards})`);
  check(g.cup75 < 0.9 && g.cup75f < 0.9, `the Cup is won under 90% of nights at 75% accuracy (${(g.cup75 * 100).toFixed(0)}% safest first, ${(g.cup75f * 100).toFixed(0)}% missed first)`);
  check(g.p90 <= 20, `the slowest 10% of nights take at most 20 minutes (90th percentile ${g.p90.toFixed(1)}, longest ${g.max.toFixed(1)})`);
  check(g.n1 && g.n3, 'nights 1 and 2 are one board; from night 3, two boards and the Last Stand at one each');

  // ---- 3. A night through the screens ----
  const answerCase = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    await wait(10);
    const sub = p.querySelector('#q-submit'); if (sub && !sub.disabled) { sub.click(); await wait(10); }
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);
  // A Compare card: the column by name (the columns are shuffled), then the deciding row, Submit and a confidence.
  // The first Compare of all is the engine's worked example: Got it.
  const answerCmp = async (id, right, conf) => {
    if (await page.$('#panel #qf-got')) { await page.click('#panel #qf-got'); return 'worked'; }
    const item = await page.evaluate(id => { const it = SD.modes.fmtItem(id); return { cols: it.cols, a: it.a, key: it.key }; }, id);
    const want = right ? item.cols[item.a] : item.cols.find((c, i) => i !== item.a);
    const tap = sel => page.evaluate(sel => { const b = document.querySelector(sel); if (b) b.click(); return !!b; }, sel);
    const colIdx = await page.evaluate(want => { const b = [...document.querySelectorAll('#panel [data-qf-col]')].find(x => x.textContent.trim() === want); return b ? b.dataset.qfCol : null; }, want);
    if (colIdx == null) { return false; }
    await tap(`#panel [data-qf-col="${colIdx}"]`);
    await page.waitForSelector(`#panel [data-qf-row="${item.key}"]`);
    await tap(`#panel [data-qf-row="${item.key}"]`);
    await tap('#qf-submit');
    await page.waitForSelector(`#panel [data-c="${conf}"]:not([disabled])`, { timeout: 4000 }).catch(async e => { console.log('  DEBUG', id, colIdx, item.key, await page.evaluate(() => document.querySelector('#panel .qf').dataset.qfState + ' ' + document.querySelector('#panel .qf').innerText.slice(0, 600))); throw e; });
    await tap(`#panel [data-c="${conf}"]`);
    await page.waitForSelector('#panel .qf[data-qf-phase="feedback"]');
    return true;
  };
  const closeFeedback = async () => {
    const b = await page.$('#panel .qf #q-next');
    if (b) await b.click();
    else await page.evaluate(() => { const x = [...document.querySelectorAll('#panel .win button.primary')].pop(); if (x) x.click(); });
  };

  check(!!await page.$('#td-play'), 'the Today card has a Play button');
  await page.click('#td-play');
  check(/The Look-Alike Cup/.test(await txt('#panel')), 'the picker lists the Look-Alike Cup');
  await page.click('[data-mode="duel"]');
  check(/Step 1 of 3/.test(await txt('#panel')), 'the first run opens the 3-step walkthrough');
  await noHScroll('walkthrough');
  await shot('walk');
  await page.click('#md-next'); await page.click('#md-next'); await page.click('#md-next');
  await page.waitForSelector('[data-rival]');
  check(await page.$$eval('[data-rival]', e => e.length) === 2, 'night 1: pick 1 of 2 rivals');
  check(/One board tonight/.test(await txt('#panel')), 'night 1 is one board');
  await noHScroll('pick');
  await shot('pick');
  await page.click('[data-rival]');
  // The practice Compare (night 1, not scored), name first.
  await page.waitForSelector('#panel .qf');
  check(/Practice/.test(await txt('#panel')), 'night 1 opens with a practice Compare, not scored');
  check(!await page.$('#panel [data-qf-row]'), 'Compare: the column names first, the table only after a name');
  await noHScroll('practice compare');
  await shot('practice');
  const pid = await page.evaluate(() => ['fmt-compare-12', 'fmt-compare-18'].find(x => SD.modes.fmtItem(x)));
  const pr = await answerCmp(pid, true, 1);
  check(!!pr, `the practice Compare plays (${pr === 'worked' ? 'as the worked example, the first Compare ever' : 'by name, then the row'})`);
  if (pr === true) await closeFeedback();
  await page.waitForSelector('.du-grid');

  const s0 = await night();
  check(s0.b && s0.b.hand.length === 3 && s0.b.deck.length + s0.b.hand.length === 6, `a board deals 6 cards, 3 in the hand (${s0.b.hand.length} + ${s0.b.deck.length})`);
  const kinds = s0.b.hand.concat(s0.b.deck).map(c => c.k);
  check(kinds.filter(k => k === 'cmp').length >= 1, `the deck holds Compare cards (${kinds.filter(k => k === 'cmp').length})`);
  const deckIds = s0.b.hand.concat(s0.b.deck).filter(c => c.k === 'case').map(c => c.id);
  const allowed = await page.evaluate(ids => ids.every(id => { const q = SD.exam.find(id); return q && SD.exam.allowed(q); }), deckIds);
  check(allowed, 'every case card is a bank question the exam allows (no held-out forms)');
  check(s0.b.hand.filter(c => c.ret || c.tag === 'missed' || c.tag === 'wall').length <= 1, 'at most one missed or Wall card in the opening hand');
  check(/On a miss he takes/.test(await txt('.du-rule')) && (await page.$$('.du-ghost')).length >= 1, 'his rule and his next square show under the board');
  check(!!await page.$('.du-asl'), 'the board has a list view for screen readers');
  check(await page.evaluate(() => SD.audio.loopName === 'duel' && SD.audio.has('duel') && SD.audio.has('duellast')), 'the table track plays under the board (the Last Stand has its own)');
  await noHScroll('board');
  await shot('board');

  // A case: card, square, Cast (3 taps), then the question on its own screen.
  const ci = s0.b.hand.findIndex(c => c.k === 'case');
  const sq = await page.evaluate(() => SD.duel.rule(SD.state.save.duel.night.b.cells).squares[0]);
  await page.click(`[data-card="${ci}"]`);
  await page.click(`[data-sq="${sq}"]`);
  check(/Hit: .*Miss: he takes his square/.test(await txt('.du-sheet')), 'the cast sheet says what a hit and a miss do');
  await page.click('#du-cast');
  await page.waitForSelector('#panel .win.quiz');
  check(!await page.$('.du-grid'), 'the board and the question never share the screen (3 taps to a cast)');
  const stem = await page.evaluate(() => SD.modes.current().q);
  check((await txt('.q-q')) === stem, 'the whole stem shows');
  check(!await page.$('#panel .helpbox:not([hidden])'), 'no hint shows before answering');
  await noHScroll('case');
  await shot('case');
  await answerCase(true, 2);
  check(/Sure, right: \+3/.test(await txt('#panel')), 'the verdict shows the shared stakes');
  await page.click('#q-next');
  await page.waitForSelector('.du-grid');
  const s1 = await night();
  check(s1.b.cells[sq] === 'me' && s1.log.length === 1 && s1.log[0].ok, 'right: your stone on the square you chose');
  check(s1.b.cells.filter(x => x === 'him').length === (s0.b.cells.filter(x => x === 'him').length), 'a right case: he does not move');

  // A miss: he takes his square.
  const s1b = await night();
  const ci2 = s1b.b.hand.findIndex(c => c.k === 'case');
  if (ci2 >= 0) {
    const his = await page.evaluate(() => SD.duel.rule(SD.state.save.duel.night.b.cells).squares);
    const free = s1b.b.cells.findIndex((x, i) => !x && !his.includes(i));
    await page.click(`[data-card="${ci2}"]`); await page.click(`[data-sq="${free >= 0 ? free : his[0]}"]`); await page.click('#du-cast');
    await page.waitForSelector('#panel .win.quiz');
    await answerCase(false, 1);
    await page.click('#q-next');
    await page.waitForSelector('.du-grid');
    const live = await txt('#du-live');
    const s2 = await night();
    const took = s2.b.cells.findIndex((x, i) => x === 'him' && s1b.b.cells[i] !== 'him');
    check(his.includes(took), `a miss: he takes the square his rule named (${took})`);
    check(/He takes the/.test(live), 'his move is read out to screen readers (' + live + ')');
  }

  // A Compare card on the board: a right name places your stone, then he moves too.
  const s3 = await night();
  const cj = s3.b.hand.findIndex(c => c.k === 'cmp');
  if (cj >= 0 && !(await page.evaluate(() => SD.duel.forced(SD.state.save.duel.night.b)))) {
    const free = s3.b.cells.findIndex(x => !x);
    const hisN = s3.b.cells.filter(x => x === 'him').length;
    await page.click(`[data-card="${cj}"]`); await page.click(`[data-sq="${free}"]`);
    check(/then he takes his square/.test(await txt('.du-sheet')), 'a Compare cast says it is a trade');
    await page.click('#du-cast');
    await page.waitForSelector('#panel .qf');
    check(!await page.$('.du-grid'), 'the Compare card opens on its own screen');
    await noHScroll('compare');
    await shot('compare');
    await answerCmp(s3.b.hand[cj].id, true, 1);
    await closeFeedback();
    await page.waitForSelector('.du-grid, #du-next, #du-walk');
    const s4 = await night();
    if (s4.phase === 'board') check(s4.b.cells[free] === 'me' && s4.b.cells.filter(x => x === 'him').length === hisN + 1, 'a right Compare name: your stone, and then he takes his square');
  }

  // Reload and resume.
  const before = await night();
  if (before.phase === 'board') {
    await page.evaluate(() => sessionStorage.setItem('keep', '1'));
    await page.reload();
    await fast();
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
    await page.click('#td-play');
    check(/Resume · night 1/.test(await txt('[data-mode="duel"]')), 'after a reload the picker offers Resume with the night');
    await page.click('[data-mode="duel"]');
    check(/BACK AT THE TABLE/.test(await txt('#panel')), 'resume opens on "Back at the table"');
    await page.click('#du-sit');
    await page.waitForSelector('.du-grid');
    const after = await night();
    check(JSON.stringify(after.b.cells) === JSON.stringify(before.b.cells) && JSON.stringify(after.b.hand) === JSON.stringify(before.b.hand), 'resuming lands on the same board and hand');
  }

  // Play the night out: right answers, Think so.
  for (let k = 0; k < 20; k++) {
    const s = await night();
    if (!s || s.phase !== 'board') break;
    const f = await page.evaluate(() => SD.duel.forced(SD.state.save.duel.night.b));
    if (f) { await page.click('#du-cast'); }
    else {
      const i = Math.max(0, s.b.hand.findIndex(c => c.k === 'case'));
      const free = s.b.cells.findIndex(x => !x);
      await page.click(`[data-card="${i}"]`); await page.click(`[data-sq="${free}"]`); await page.click('#du-cast');
    }
    const card = f || s.b.hand[Math.max(0, s.b.hand.findIndex(c => c.k === 'case'))];
    if (card.k === 'case') { await page.waitForSelector('#panel .win.quiz'); await answerCase(true, 1); await page.click('#q-next'); }
    else { await page.waitForSelector('#panel .qf'); await answerCmp(card.id, true, 1); await closeFeedback(); }
    await page.waitForSelector('.du-grid, #du-walk, #du-next');
  }
  const end = await night();
  check(end.phase === 'done', 'night 1 ends after its one board');
  const res = (await txt('#panel')).replace(/\s+/g, ' ');
  check(/His ledger\./.test(res) && /Cases \d+ of \d+/.test(res), 'the ledger: cases right of asked');
  check(/Points [+−±]\d+/.test(res), 'the ledger: the night\'s points');
  check(/\+20 XP · \+5 shards/.test(res), 'the night pays XP and shards once a day');
  check(!!await page.$('.md-calt'), 'the ledger shows calibration');
  await noHScroll('ledger');
  await shot('ledger');
  await page.click('#du-walk');
  check(/WALKING BACK/.test(await txt('#panel')), 'Walk back opens Pip\'s question');
  await page.click('#du-done');
  check(await page.evaluate(() => SD.audio.loopName !== 'duel'), 'standing up hands the music back');

  // Night 3: two boards.
  await page.evaluate(() => { SD.state.save.duel.nights = 2; SD.state.persist(); });
  await page.click('#td-play');
  await page.click('[data-mode="duel"]');
  await page.waitForSelector('[data-rival]');
  check(/Two boards/.test(await txt('#panel')), 'night 3: two boards and the Last Stand');
  const n3 = await night();
  check(n3.n === 3 && n3.parry === 1, 'from night 2, a Parry to start');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: the Look-Alike Cup checks all pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
