// Headless check and screenshots of the Rush prototype (rush.html). Serves game/ and plays all six claims in a row
// at desktop and phone size: the drag and the lever, the end-of-claim strip and its "Next claim" button, the Night
// Orders pick before every claim (Dutch's explanation, stacking, no repeats), the letters once pinned (all
// three formats, a wrong answer tearing an option off the next one, a bet, a letter whose clock runs out), each claim's
// own piece (the bell, the ledger, the Slow Courier's hourglass and stopwatch, the Picky Bell's filter card, the Hot Shelf's
// suffix stamp), batching, and the room's orders (cold stools, the stampede, shelf life). Claim 6 runs two rooms: it
// switches between them (the inset, Tab), places pieces in each, and checks the intern's answers on review cards; on
// their own, a hot cabinet throttles without the stamp, and an intern left alone leaks while a checked one doesn't.
// The extra buys too: one dragged in per claim (memory, the hand-off, TTL, the ledger at the dock, the failure crate
// and the retry dial), upkeep and its debt, and short runs for the warm stools and the jitter dial, the hand-off and
// the crate's replay. Checks for page errors and horizontal scroll, and that the belt fits on screen, and saves
// screenshots.
// node tools/rush_check.js [outDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/rush-shots';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
let fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
// A review card (claim 6's cellar) wears the letter's look too, but isn't one.
const letterOpen = pg => pg.evaluate(() => { const c = document.getElementById('q').classList; return c.contains('letter') && !c.contains('review'); });
// The player in the cellar: checks every answer the intern stamps (rightly), and answers what's left on the wall.
const tendCellar = pg => pg.evaluate(() => {
  const R = SD.rushCore, V = SD_RUSH.S.review; if (!V) return;
  V.tickets.filter(k => k.quiz && (k.phase === 'stamped' || k.phase === 'leak')).forEach(k => R.check(V, k.id, k.internRight ? 'ok' : 'wrong'));
  V.tickets.filter(k => k.quiz && k.phase === 'ask' && V.time - k.askAt > 3).forEach(k => R.reply(V, k.id, true));
});
const endShown = pg => pg.evaluate(() => document.getElementById('q').classList.contains('end'));
// Answer the open letter: 'right' clicks the answer, 'wrong' a wrong option. Returns what the letter looked like.
async function answer(pg, how) {
  const info = await pg.evaluate(how => {
    const q = document.getElementById('q'), btns = [...q.querySelectorAll('.lt-opts button')];
    const fmt = (q.className.match(/fmt-(\w)/) || [])[1], torn = !!q.querySelector('.lt-torn-tag');
    // The answer is data-i 0, or "none of these" (-1) when the torn strip held it.
    const ans = btns.find(b => b.dataset.i === '0') || btns.find(b => b.dataset.i === '-1');
    const pick = how === 'right' ? ans : btns.find(b => b !== ans);
    pick.click();
    const ok = how === 'right' ? !!q.querySelector('button.right') && !q.querySelector('button.wrong') : !!q.querySelector('button.wrong');
    return { fmt, torn, n: btns.length, hasNone: btns.some(b => b.dataset.i === '-1'), ok };
  }, how);
  return info;
}
async function closeLetter(pg) { await pg.click('.lt-go'); }
// Drag a tool from its belt slot onto its spot in the room.
async function dragTo(pg, tool) {
  const i = await pg.evaluate(t => SD_RUSH.S.belt.indexOf(t), tool);
  const [ax, ay] = await pg.evaluate(i => SD_RUSH.at.slot(i), i), [bx, by] = await pg.evaluate(t => SD_RUSH.at.spot(t), tool);
  await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(bx, by, { steps: 8 }); await pg.mouse.up();
  return pg.evaluate(t => !!SD_RUSH.S[t], tool);
}
// Play until the end strip shows, answering every letter with the given policy (a function of the letter's index).
async function playOut(pg, policy, seen, each) {
  const t0 = Date.now(); let n = 0;
  while (Date.now() - t0 < 160000) {
    if (await endShown(pg)) return true;
    if (each) await each(pg);
    if (await letterOpen(pg)) { const info = await answer(pg, policy(n)); seen.push(info); n++; await closeLetter(pg); }
    await pg.waitForTimeout(200);
  }
  return false;
}
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, browser = await chromium.launch();
  for (const [name, vp] of [['desktop', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
    const pg = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=7`);
    await pg.waitForTimeout(700);
    // The pick before claim 1 always offers letters, and never stakes or the timeout (they need letters). Pin letters.
    const off1 = await pg.evaluate(() => [...document.querySelectorAll('.no-card')].map(b => b.dataset.o));
    if (off1.length !== 2 || !off1.includes('letters') || off1.some(o => o === 'stakes' || o === 'timeout')) bad(name, 'claim 1 offer', off1);
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-0a-pick.png` });
    await pg.click('.no-card[data-o="letters"]');
    if (!/Post Office/.test(await pg.textContent('.no-dutch'))) bad(name, 'no Dutch explanation for letters');
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-0b-explain.png` });
    await pg.click('.no-go');
    if ((await pg.evaluate(() => SD_RUSH.run.orders.join() + ':' + document.getElementById('q').className)) !== 'letters:') bad(name, 'pinning letters did not start the Rush');
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: `${OUT}/${name}-1-build.png` });
    // Hands: dragging the bin onto its spot places it, the bell stays locked, and clicking the lever starts the claim.
    const [sx, sy] = await pg.evaluate(() => SD_RUSH.at.slot(2)), [tx, ty] = await pg.evaluate(() => SD_RUSH.at.spot('bin'));
    await pg.mouse.move(sx, sy); await pg.mouse.down(); await pg.mouse.move((sx + tx) / 2, (sy + ty) / 2, { steps: 5 }); await pg.mouse.move(tx, ty, { steps: 5 }); await pg.screenshot({ path: `${OUT}/${name}-0-drag.png` }); await pg.mouse.up();
    const [bx, by] = await pg.evaluate(() => SD_RUSH.at.slot(3)); await pg.mouse.click(bx, by);
    const hands = await pg.evaluate(() => ({ bin: SD_RUSH.S.bin, bell: !!SD_RUSH.S.bell, coins: SD_RUSH.S.coins }));
    if (!hands.bin || hands.bell || hands.coins !== 1) bad(name, 'drag/lock', JSON.stringify(hands));
    await pg.evaluate(() => SD_RUSH.reset(7));
    // An extra buy: memory on Mira's desk (2 coins at the Rush). It bills a coin a wave from wave 2, and the belt says so.
    await pg.evaluate(() => { SD_RUSH.S.coins += 2; });
    if (!(await dragTo(pg, 'memory')) || (await pg.evaluate(() => SD_RUSH.S.coins)) !== 2) bad(name, 'memory did not place');
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: `${OUT}/${name}-1b-memory.png` });
    // Claim 1: wave 1 with nothing placed (bounces), then the rack and the bolted stools.
    const [lx, ly] = await pg.evaluate(() => SD_RUSH.at.lever()); await pg.mouse.click(lx, ly);
    if (!(await pg.evaluate(() => SD_RUSH.S.started))) bad(name, 'lever click did not start');
    await pg.waitForTimeout(5200);
    await pg.screenshot({ path: `${OUT}/${name}-2-bounces.png` });
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.place('reserve'); });
    // The first letter comes down at wave 2, and the room waits while it's open. Answer it wrong: the next one is torn.
    const seen = [];
    await pg.waitForFunction(() => document.getElementById('q').classList.contains('letter'), null, { timeout: 30000 }).catch(() => bad(name, 'no letter at wave 2'));
    const tA = await pg.evaluate(() => SD_RUSH.S.time); await pg.waitForTimeout(800);
    if ((await pg.evaluate(() => SD_RUSH.S.time)) !== tA) bad(name, 'the room kept running under a letter');
    if (await pg.$('.lt-bet')) bad(name, 'no bets without the stakes order');
    await pg.screenshot({ path: `${OUT}/${name}-3-letter.png` });
    seen.push(await answer(pg, 'wrong'));
    await pg.screenshot({ path: `${OUT}/${name}-3b-letter-wrong.png` });
    await closeLetter(pg);
    await pg.waitForFunction(() => document.getElementById('q').classList.contains('letter'), null, { timeout: 30000 }).catch(() => bad(name, 'no second letter'));
    await pg.screenshot({ path: `${OUT}/${name}-3c-letter-torn.png` });
    const c1 = await pg.evaluate(() => SD_RUSH.S.coins);
    const t1 = await answer(pg, 'right'); seen.push(t1);
    if (!t1.torn || !t1.hasNone || t1.n !== 4) bad(name, 'second letter not torn', JSON.stringify(t1));
    if ((await pg.evaluate(() => SD_RUSH.S.coins)) !== c1 + 1) bad(name, 'right answer paid no coin');
    await closeLetter(pg);
    if (!(await playOut(pg, () => 'right', seen))) bad(name, 'claim 1 never ended');
    await pg.screenshot({ path: `${OUT}/${name}-4-end.png` });
    const st = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, handled: SD_RUSH.S.handled, upkeep: SD_RUSH.S.upkeepPaid, sw: document.documentElement.scrollWidth, w: innerWidth, next: document.querySelector('.end-go').textContent }));
    console.log(name, 'rush', JSON.stringify(st));
    if (st.upkeep < 3) bad(name, 'memory should bill a coin at each of waves 2 to 4', st.upkeep);
    if (st.sw > st.w) bad(name, 'horizontal scroll');
    if (!/Next claim: the Bell/.test(st.next)) bad(name, 'no next-claim button:', st.next);
    // The pick before claim 2: two notices, never letters again. Read one, switch to the other, pin it.
    const left1 = await pg.evaluate(() => SD_RUSH.S.coins);
    await pg.click('.end-go');
    const offered = await pg.evaluate(() => [...document.querySelectorAll('.no-card')].map(b => b.dataset.o));
    if (offered.length !== 2 || offered[0] === offered[1] || offered.includes('letters')) bad(name, 'claim 2 offer:', offered);
    await pg.evaluate(() => SD_RUSH.showPick('bell', ['cold', 'stakes']));
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-5-pick.png` });
    await pg.click('.no-card[data-o="cold"]');
    if (!/cold start/.test(await pg.textContent('.no-dutch'))) bad(name, 'no Dutch explanation for cold stools');
    await pg.click('.no-back');
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-5b-explain.png` });
    await pg.click('.no-go');
    const r2 = await pg.evaluate(() => ({ claim: SD_RUSH.S.claim, orders: SD_RUSH.run.orders.slice(), q: document.getElementById('q').className }));
    if (r2.claim !== 'bell' || r2.orders.join() !== 'letters,stakes' || r2.q) bad(name, 'pinning did not start the Bell with stakes', JSON.stringify(r2));
    // Leftovers carry; a debt from upkeep is written off.
    if ((await pg.evaluate(() => SD_RUSH.S.coins)) !== 2 + Math.max(0, left1)) bad(name, 'leftover coins should carry into the Bell', left1);
    // Claim 2, the Bell.
    await pg.evaluate(() => SD_RUSH.reset(7, 'bell'));
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-6-bell-build.png` });
    const [b1x, b1y] = await pg.evaluate(() => SD_RUSH.at.slot(3)), [b2x, b2y] = await pg.evaluate(() => SD_RUSH.at.spot('bell'));
    await pg.mouse.move(b1x, b1y); await pg.mouse.down(); await pg.mouse.move(b2x, b2y, { steps: 8 }); await pg.mouse.up();
    if (!(await pg.evaluate(() => SD_RUSH.S.bell))) bad(name, 'bell drag failed');
    await pg.evaluate(() => { SD_RUSH.S.coins = Math.max(SD_RUSH.S.coins, 2); });
    if (!(await dragTo(pg, 'handoff'))) bad(name, 'the hand-off did not place');
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.start(); });
    await pg.waitForTimeout(6000);
    await pg.screenshot({ path: `${OUT}/${name}-7-bell.png` });
    // High stakes: bet 1 and get it wrong (the coin goes), then bet 1 and get it right (a coin plus the bet).
    await pg.waitForFunction(() => document.getElementById('q').classList.contains('letter'), null, { timeout: 40000 }).catch(() => bad(name, 'no letter in the Bell'));
    await pg.evaluate(() => { SD_RUSH.S.coins = 2; document.querySelectorAll('.lt-bet button').forEach(b => { b.disabled = false; }); document.querySelector('.lt-bet small').textContent = 'Right pays it back double.'; });
    if (!(await pg.$('.lt-bet'))) bad(name, 'stakes should add a bet row');
    await pg.click('.lt-bet button[data-bet="1"]');
    await pg.screenshot({ path: `${OUT}/${name}-8-bet.png` });
    seen.push(await answer(pg, 'wrong'));
    if ((await pg.evaluate(() => SD_RUSH.S.coins)) !== 1) bad(name, 'a lost bet should cost the coin');
    await closeLetter(pg);
    await pg.waitForFunction(() => document.getElementById('q').classList.contains('letter'), null, { timeout: 40000 }).catch(() => bad(name, 'no second letter in the Bell'));
    const coins0 = await pg.evaluate(() => SD_RUSH.S.coins);
    if (coins0 >= 1) await pg.click('.lt-bet button[data-bet="1"]');
    const t2 = await answer(pg, 'right'); seen.push(t2);
    if (!t2.torn) bad(name, 'a wrong answer should tear the next letter', JSON.stringify(t2));
    if ((await pg.evaluate(() => SD_RUSH.S.coins)) !== coins0 + 1 + (coins0 >= 1 ? 1 : 0)) bad(name, 'a right answer should pay a coin and the bet');
    await closeLetter(pg);
    if (!(await playOut(pg, () => 'right', seen))) bad(name, 'the Bell never ended');
    const bs = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, reports: SD_RUSH.S.reports, rings: SD_RUSH.S.rings, next: document.querySelector('.end-go').textContent }));
    console.log(name, 'bell', JSON.stringify(bs));
    if (bs.over !== 'win' || !bs.rings) bad(name, 'the Bell did not play through');
    if (!/Next claim: the Double-claimer/.test(bs.next)) bad(name, 'no claim 3 button:', bs.next);
    // The pick before claim 3 never offers what's already pinned. Pin the timeout.
    await pg.click('.end-go');
    const off3 = await pg.evaluate(() => [...document.querySelectorAll('.no-card')].map(b => b.dataset.o));
    if (off3.includes('stakes') || off3.includes('letters') || off3.length !== 2) bad(name, 'claim 3 offer', off3);
    await pg.evaluate(() => SD_RUSH.showPick('double', ['timeout', 'shelf']));
    await pg.keyboard.press('1'); await pg.click('.no-go');
    if ((await pg.evaluate(() => SD_RUSH.run.orders.join())) !== 'letters,stakes,timeout') bad(name, 'orders should stack');
    // Claim 3, the Double-claimer.
    await pg.evaluate(() => SD_RUSH.reset(7, 'double'));
    await pg.waitForTimeout(400);
    const [l1x, l1y] = await pg.evaluate(() => SD_RUSH.at.slot(3)), [l2x, l2y] = await pg.evaluate(() => SD_RUSH.at.spot('ledger'));
    await pg.mouse.move(l1x, l1y); await pg.mouse.down(); await pg.mouse.move(l2x, l2y, { steps: 8 }); await pg.mouse.up();
    if (!(await pg.evaluate(() => SD_RUSH.S.ledger))) bad(name, 'ledger drag failed');
    await pg.evaluate(() => { SD_RUSH.S.coins = Math.max(SD_RUSH.S.coins, 2); });
    if (!(await dragTo(pg, 'ttl'))) bad(name, 'TTL did not place');
    await pg.evaluate(() => { SD_RUSH.place('reserve'); SD_RUSH.start(); });
    await pg.waitForTimeout(6000);
    await pg.screenshot({ path: `${OUT}/${name}-10-double.png` });
    // Let the first letter's clock run out: it counts as wrong.
    await pg.waitForFunction(() => document.getElementById('q').classList.contains('letter'), null, { timeout: 40000 }).catch(() => bad(name, 'no letter in claim 3'));
    await pg.waitForTimeout(9000); await pg.screenshot({ path: `${OUT}/${name}-10b-clock.png` });
    await pg.waitForFunction(() => /Time's up/.test(document.querySelector('.lt-why').textContent), null, { timeout: 15000 }).catch(() => bad(name, 'the letter clock never ran out'));
    seen.push({ fmt: await pg.evaluate(() => (document.getElementById('q').className.match(/fmt-(\w)/) || [])[1]), ok: true });
    await closeLetter(pg);
    if (!(await playOut(pg, () => 'right', seen))) bad(name, 'the Double-claimer never ended');
    await pg.screenshot({ path: `${OUT}/${name}-11-double-end.png` });
    const ds = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, dropped: SD_RUSH.S.dropped, twice: SD_RUSH.S.paidTwice, ttlGone: SD_RUSH.S.ttlGone, upkeep: SD_RUSH.S.upkeepPaid, next: document.querySelector('.end-go').textContent }));
    console.log(name, 'double', JSON.stringify(ds));
    // With TTL the ledger clears old keys (and never bills); a repeat after its key expired may still pay twice.
    if (ds.over !== 'win' || !ds.dropped || !ds.ttlGone || ds.upkeep) bad(name, 'the Double-claimer did not play through');
    if (!/Next claim: the Slow Courier/.test(ds.next)) bad(name, 'no claim 4 button:', ds.next);
    // The pick before claim 4: Batching.
    await pg.click('.end-go');
    await pg.evaluate(() => SD_RUSH.showPick('slow', ['batch', 'shelf']));
    await pg.click('.no-card[data-o="batch"]');
    if (!/batch/.test(await pg.textContent('.no-dutch'))) bad(name, 'no Dutch explanation for batching');
    await pg.click('.no-go');
    // Claim 4, the Slow Courier: the rack is already up. Drag the hourglass onto the rack and the stopwatch onto the desk.
    await pg.evaluate(() => { SD_RUSH.reset(7, 'slow'); SD_RUSH.S.coins = Math.max(SD_RUSH.S.coins, 3); });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-13-slow-build.png` });
    for (const [slot, where] of [[2, 'hourglass'], [3, 'stopwatch']]) {
      const [ax, ay] = await pg.evaluate(i => SD_RUSH.at.slot(i), slot), [bx2, by2] = await pg.evaluate(t => SD_RUSH.at.spot(t), where);
      await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(bx2, by2, { steps: 8 }); await pg.mouse.up();
    }
    if (!(await pg.evaluate(() => SD_RUSH.S.rack && SD_RUSH.S.hourglass && SD_RUSH.S.stopwatch))) bad(name, 'slow courier pieces did not place');
    await pg.evaluate(() => { SD_RUSH.S.coins = 3; });
    if (!(await dragTo(pg, 'ledger')) || (await pg.evaluate(() => SD_RUSH.S.coins)) !== 1) bad(name, 'the ledger should cost 2 at the dock');
    await pg.evaluate(() => { SD_RUSH.place('bin'); SD_RUSH.start(); });
    await pg.waitForTimeout(12000);
    await pg.screenshot({ path: `${OUT}/${name}-14-slow.png` });
    if (!(await playOut(pg, () => 'right', seen))) bad(name, 'the Slow Courier never ended');
    await pg.screenshot({ path: `${OUT}/${name}-15-slow-end.png` });
    const ss = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, re: SD_RUSH.S.reappeared, cut: SD_RUSH.S.timedOut, batches: SD_RUSH.S.batches, next: document.querySelector('.end-go').textContent }));
    console.log(name, 'slow', JSON.stringify(ss));
    if (ss.over !== 'win' || !ss.cut || !ss.batches) bad(name, 'the Slow Courier did not play through');
    if (await pg.evaluate(() => SD_RUSH.S.paidTwice)) bad(name, 'the ledger should stop the dock paying twice');
    if (!/Next claim: the Picky Bell/.test(ss.next)) bad(name, 'no claim 5 button:', ss.next);
    // The pick before claim 5: First in, first out.
    await pg.click('.end-go');
    await pg.evaluate(() => SD_RUSH.showPick('picky', ['fifo', 'shelf']));
    await pg.click('.no-card[data-o="fifo"]');
    if (!/FIFO/.test(await pg.textContent('.no-dutch'))) bad(name, 'no Dutch explanation for FIFO');
    await pg.click('.no-go');
    // Claim 5, the Picky Bell: the bell is already up. Drag the filter card onto Reports' tray, and put the rack up.
    await pg.evaluate(() => { SD_RUSH.reset(7, 'picky'); SD_RUSH.S.coins = Math.max(SD_RUSH.S.coins, 3); });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-17-picky-build.png` });
    {
      const [ax, ay] = await pg.evaluate(() => SD_RUSH.at.slot(3)), [bx2, by2] = await pg.evaluate(() => SD_RUSH.at.spot('filter'));
      await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(bx2, by2, { steps: 8 }); await pg.mouse.up();
    }
    if (!(await pg.evaluate(() => SD_RUSH.S.bell && SD_RUSH.S.filter))) bad(name, 'filter card did not place');
    await pg.evaluate(() => { SD_RUSH.S.coins = Math.max(SD_RUSH.S.coins, 3); });
    if (!(await dragTo(pg, 'dest')) || !(await dragTo(pg, 'retries'))) bad(name, 'the crate or the retry dial did not place');
    // Tapping the placed dial turns it: 1, then 0.
    { const i = await pg.evaluate(() => SD_RUSH.S.belt.indexOf('retries')), [ax, ay] = await pg.evaluate(i => SD_RUSH.at.slot(i), i); await pg.mouse.click(ax, ay); }
    const pk = await pg.evaluate(() => ({ n: SD_RUSH.S.retryN, belt: SD_RUSH.S.belt.join(), last: SD_RUSH.at.slot(SD_RUSH.S.belt.length - 1)[0], first: SD_RUSH.at.slot(0)[0], w: innerWidth }));
    if (pk.n !== 0) bad(name, 'tapping the retry dial should turn it to 0', JSON.stringify(pk));
    if (!/partial/.test(pk.belt)) bad(name, 'partial batch should be on the belt with batching pinned', pk.belt);
    if (pk.first < 0 || pk.last > pk.w) bad(name, 'the belt runs off the screen', JSON.stringify(pk));
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.start(); });
    await pg.waitForTimeout(12000);
    await pg.screenshot({ path: `${OUT}/${name}-18-picky.png` });
    if (!(await playOut(pg, () => 'right', seen))) bad(name, 'the Picky Bell never ended');
    await pg.screenshot({ path: `${OUT}/${name}-19-picky-end.png` });
    const ps = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, reports: SD_RUSH.S.reports, filtered: SD_RUSH.S.filtered, tossed: SD_RUSH.S.tossed, next: document.querySelector('.end-go').textContent }));
    console.log(name, 'picky', JSON.stringify(ps));
    if (ps.over !== 'win' || !ps.reports || !ps.filtered || ps.tossed) bad(name, 'the Picky Bell did not play through');
    await pg.screenshot({ path: `${OUT}/${name}-19b-picky-extras.png` });
    if (!/Next claim: the Hot Shelf/.test(ps.next)) bad(name, 'no claim 6 button:', ps.next);
    // The pick before claim 6: Eventually consistent.
    await pg.click('.end-go');
    await pg.evaluate(() => SD_RUSH.showPick('hot', ['eventual', 'shelf']));
    await pg.click('.no-card[data-o="eventual"]');
    if (!/consistent/.test(await pg.textContent('.no-dutch'))) bad(name, 'no Dutch explanation for eventual consistency');
    await pg.click('.no-go');
    // Claim 6, the Hot Shelf: two rooms. The letters answered so far are in the run's answer book, so the intern has
    // questions it can take. Drag the suffix stamp onto Mira's desk in the vault.
    await pg.evaluate(() => { SD_RUSH.reset(7, 'hot'); SD_RUSH.S.coins = Math.max(SD_RUSH.S.coins, 6); });
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-21-hot-build.png` });
    const book = await pg.evaluate(() => ({ solved: SD.rushCore.solved(SD_RUSH.S).length, pool: SD_RUSH.S.review.qpool.length, eventual: SD_RUSH.S.orders.has('eventual') }));
    if (!book.solved || !book.pool || !book.eventual) bad(name, 'the answer book or the eventual order did not carry into claim 6', JSON.stringify(book));
    {
      const [ax, ay] = await pg.evaluate(() => SD_RUSH.at.slot(0)), [bx2, by2] = await pg.evaluate(() => SD_RUSH.at.spot('shard'));
      await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(bx2, by2, { steps: 8 }); await pg.mouse.up();
    }
    if (!(await pg.evaluate(() => SD_RUSH.S.shard && !SD_RUSH.S.review.shard))) bad(name, 'the suffix stamp did not place in the vault');
    // Tap the window to go down to the cellar; the cellar's pieces go in the cellar.
    { const [ix, iy] = await pg.evaluate(() => SD_RUSH.at.inset()); await pg.mouse.click(ix, iy); }
    if ((await pg.evaluate(() => SD_RUSH.view)) !== 'review') bad(name, 'tapping the window did not switch to the cellar');
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.place('intern'); SD_RUSH.place('bin'); });
    const placed = await pg.evaluate(() => ({ v: [!!SD_RUSH.S.review.rack, !!SD_RUSH.S.review.intern, !!SD_RUSH.S.review.bin], m: !!SD_RUSH.S.rack }));
    if (placed.v.some(x => !x) || placed.m) bad(name, 'cellar pieces went to the wrong room', JSON.stringify(placed));
    await pg.waitForTimeout(300);
    await pg.screenshot({ path: `${OUT}/${name}-22-cellar-build.png` });
    { const [lx2, ly2] = await pg.evaluate(() => SD_RUSH.at.lever()); await pg.mouse.click(lx2, ly2); }
    if (!(await pg.evaluate(() => SD_RUSH.S.started && SD_RUSH.S.review.started))) bad(name, 'the lever did not start both rooms');
    // The intern stamps an answer; tap it on the wall and judge it on the card.
    // (A letter can come down meanwhile: answer it, the rooms wait for it.)
    for (const t0 = Date.now(); ;) {
      if (await letterOpen(pg)) { seen.push(await answer(pg, 'right')); await closeLetter(pg); }
      if (await pg.evaluate(() => SD_RUSH.S.review.tickets.some(k => k.quiz && k.phase === 'stamped'))) break;
      if (Date.now() - t0 > 30000) { bad(name, 'the intern never answered'); break; }
      await pg.waitForTimeout(150);
    }
    {
      const k = await pg.evaluate(() => { const k = SD_RUSH.S.review.tickets.find(x => x.quiz && x.phase === 'stamped'); return k && { id: k.id, right: k.internRight }; });
      const at = k && await pg.evaluate(id => SD_RUSH.at.ask(id), k.id);
      if (at) {
        await pg.mouse.click(at[0], at[1]);
        const card = await pg.evaluate(() => { const q = document.getElementById('q'); return { review: q.classList.contains('review'), pick: !!q.querySelector('.lt-opts button.pick .lt-intern'), verdict: q.querySelectorAll('.lt-verdict button').length }; });
        if (!card.review || !card.pick || card.verdict !== 2) bad(name, 'the check card', JSON.stringify(card));
        await pg.waitForTimeout(200);
        await pg.screenshot({ path: `${OUT}/${name}-23-check.png` });
        if (card.verdict) {
          await pg.click(`.lt-verdict button[data-v="${k.right ? 'ok' : 'wrong'}"]`);
          if (!/Filed|Caught/.test(await pg.textContent('.lt-why'))) bad(name, 'checking the intern', await pg.textContent('.lt-why'));
          await pg.click('.lt-go');
        }
      } else bad(name, 'no stamped answer on the wall to tap');
    }
    await pg.waitForTimeout(4000);
    await tendCellar(pg);
    await pg.screenshot({ path: `${OUT}/${name}-24-cellar-run.png` });
    // Tab goes back up to the vault.
    if (await letterOpen(pg)) { seen.push(await answer(pg, 'right')); await closeLetter(pg); }
    await pg.keyboard.press('Tab');
    if ((await pg.evaluate(() => SD_RUSH.view)) !== 'main') bad(name, 'Tab did not switch back to the vault');
    await pg.waitForTimeout(3000);
    await pg.screenshot({ path: `${OUT}/${name}-25-vault-run.png` });
    if (!(await playOut(pg, () => 'right', seen, tendCellar))) bad(name, 'the Hot Shelf never ended');
    await pg.screenshot({ path: `${OUT}/${name}-26-hot-end.png` });
    const hs = await pg.evaluate(() => { const S = SD_RUSH.S, V = S.review; return { over: S.over, spill: S.spill, filed: S.cabs.map(c => c.filed), hotThrottles: S.hotThrottles, stale: S.stale, asked: V.asked, byYou: V.byYou, byIntern: V.byIntern, caught: V.caught, missed: V.missed, next: document.querySelector('.end-go').textContent }; });
    console.log(name, 'hot', JSON.stringify(hs));
    if (hs.over !== 'win' || hs.filed.some(n => !n) || !hs.stale || !hs.asked || !hs.byIntern || hs.missed) bad(name, 'the Hot Shelf did not play through');
    if (!/Play again from the Rush/.test(hs.next)) bad(name, 'last claim should offer the Rush again:', hs.next);
    await pg.click('.end-go');
    const again = await pg.evaluate(() => ({ orders: SD_RUSH.run.orders.length, q: document.getElementById('q').className, offer: [...document.querySelectorAll('.no-card')].map(b => b.dataset.o) }));
    if (again.orders || !/orders/.test(again.q) || !again.offer.includes('letters')) bad(name, 'starting over should take the orders down and open the pick', JSON.stringify(again));
    // Every claim sent three letters, and all three formats showed up.
    const fmts = new Set(seen.map(x => x.fmt));
    console.log(name, 'letters', seen.length, [...fmts].join(''));
    if (seen.length !== 18 || fmts.size !== 3 || seen.some(x => !x.ok)) bad(name, 'letters', JSON.stringify(seen));
    // Without the hourglass, a heavy parcel reappears on the rack mid-job.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=3&claim=slow&orders=cold`);
    await pg.waitForTimeout(400);
    await pg.evaluate(() => SD_RUSH.start());
    await pg.waitForFunction(() => SD_RUSH.S.reappeared > 0, null, { timeout: 30000 }).catch(() => bad(name, 'nothing reappeared without the hourglass'));
    await pg.screenshot({ path: `${OUT}/${name}-16-reappear.png` });
    // Without the filter card, Reports opens every copy and throws most away.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=3&claim=picky&orders=cold`);
    await pg.waitForTimeout(400);
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.start(); });
    await pg.waitForFunction(() => SD_RUSH.S.tossed >= 3, null, { timeout: 30000 }).catch(() => bad(name, 'Reports never threw a copy away without the filter'));
    await pg.screenshot({ path: `${OUT}/${name}-20-picky-nofilter.png` });
    // Without the bell, the hand-off passes ribboned copies to Reports' tray.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=3&claim=bell&orders=cold`);
    await pg.waitForTimeout(400);
    await pg.evaluate(() => { SD_RUSH.S.coins = 3; SD_RUSH.place('rack'); SD_RUSH.place('reserve'); });
    if (!(await dragTo(pg, 'handoff'))) bad(name, 'the hand-off did not place without the bell');
    await pg.evaluate(() => SD_RUSH.start());
    await pg.waitForFunction(() => SD_RUSH.S.handed >= 3, null, { timeout: 30000 }).catch(() => bad(name, 'nothing was handed off'));
    await pg.screenshot({ path: `${OUT}/${name}-29-handoff.png` });
    // Without the filter, refunds age out of Reports' tray into the crate; a tap on the crate replays one for a coin.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=3&claim=picky&orders=cold`);
    await pg.waitForTimeout(400);
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.place('dest'); SD_RUSH.start(); });
    await pg.waitForFunction(() => SD_RUSH.S.crate.length > 0, null, { timeout: 40000 }).catch(() => bad(name, 'nothing went into the crate'));
    await pg.evaluate(() => { SD_RUSH.S.coins = 1; SD_RUSH.place('dest'); });
    const rp = await pg.evaluate(() => ({ replayed: SD_RUSH.S.replayed, coins: SD_RUSH.S.coins }));
    if (rp.replayed !== 1 || rp.coins !== 0) bad(name, 'the crate should replay a refund for a coin', JSON.stringify(rp));
    await pg.screenshot({ path: `${OUT}/${name}-30-crate.png` });
    // Cold stools and the stampede bring the warm stools and the jitter dial onto the Rush's belt.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=7&claim=rush&orders=cold,herd`);
    await pg.waitForTimeout(400);
    await pg.evaluate(() => { SD_RUSH.S.coins = 4; SD_RUSH.place('reserve'); });
    if (!(await dragTo(pg, 'warm')) || !(await dragTo(pg, 'jitter'))) bad(name, 'warm stools or the jitter dial did not place');
    if ((await pg.evaluate(() => SD_RUSH.S.maxThrottles + ':' + SD_RUSH.S.coins)) !== '3:0') bad(name, 'the jitter dial should cost 2 and take back the 4th try');
    await pg.evaluate(() => SD_RUSH.start());
    await pg.waitForTimeout(9000);
    await pg.screenshot({ path: `${OUT}/${name}-31-warm-jitter.png` });
    const wj = await pg.evaluate(() => ({ herds: SD_RUSH.S.herds, storm: SD_RUSH.S.storm, upkeep: SD_RUSH.S.upkeepPaid, wave: SD_RUSH.S.wave }));
    console.log(name, 'warm+jitter', JSON.stringify(wj));
    if (wj.wave >= 2 && !wj.upkeep) bad(name, 'the warm stools should bill each wave', JSON.stringify(wj));
    // Jitter thins the herd out (it doesn't end it): over 40 seeds of bolted stools, far fewer storm callers than without.
    const jst = await pg.evaluate(() => { const R = SD.rushCore, n = [0, 0];
      for (const j of [0, 1]) for (let s = 1; s <= 40; s++) { const S = R.create(s, 'rush', ['herd'], 2); R.place(S, 'reserve'); if (j) R.place(S, 'jitter'); R.start(S);
        while (!S.over && S.time < 300) { R.step(S, 1 / 30); R.drain(S); } n[j] += S.storm; }
      return n; });
    if (!(jst[1] < jst[0] / 3)) bad(name, "jitter should cut the retry storms", JSON.stringify(jst));
    // Without the suffix stamp, the hot caller's tickets all go to cabinet C, and it throttles.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=3&claim=hot&orders=cold`);
    await pg.waitForTimeout(400);
    await pg.evaluate(() => SD_RUSH.start());
    await pg.waitForFunction(() => SD_RUSH.S.hotThrottles >= 3, null, { timeout: 30000 }).catch(() => bad(name, 'the hot cabinet never throttled without the stamp'));
    await pg.screenshot({ path: `${OUT}/${name}-27-hot-throttle.png` });
    const ht = await pg.evaluate(() => SD_RUSH.S.cabs.map(c => c.throttled)), hotCab = await pg.evaluate(() => SD.rushCore.HOT_CAB);
    console.log(name, 'hot throttles by cabinet', JSON.stringify(ht));
    if (ht.indexOf(Math.max(...ht)) !== hotCab) bad(name, 'the hot cabinet should throttle most', JSON.stringify(ht));
    // The intern: left alone, its wrong answers go into the files and leak; checked, they're caught.
    for (const tend of [false, true]) {
      await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=5&claim=hot&orders=cold`);
      await pg.waitForTimeout(400);
      await pg.evaluate(() => { const S = SD_RUSH.S; S.review.qpool.forEach(id => SD.rushCore.answer(S, id, true, 'player')); S.coins = 6; SD_RUSH.place('shard'); SD_RUSH.switchRoom(); SD_RUSH.place('rack'); SD_RUSH.place('intern'); SD_RUSH.place('bin'); SD_RUSH.start(); });
      const t0 = Date.now();
      while (Date.now() - t0 < 30000) { if (tend) await tendCellar(pg); else if (await pg.evaluate(() => SD_RUSH.S.review.leaked > 0)) break; await pg.waitForTimeout(200); }
      await pg.screenshot({ path: `${OUT}/${name}-28-intern-${tend ? 'checked' : 'alone'}.png` });
      const iv = await pg.evaluate(() => { const S = SD_RUSH.S, V = S.review; return { byIntern: V.byIntern, caught: V.caught, missed: V.missed, leaked: V.leaked, spill: S.spill, over: S.over }; });
      console.log(name, 'intern', tend ? 'checked' : 'alone', JSON.stringify(iv));
      if (!iv.byIntern) bad(name, 'the intern answered nothing');
      if (tend ? iv.missed || iv.leaked : !iv.missed || !iv.leaked || !iv.spill) bad(name, 'intern', tend ? 'checked' : 'alone', JSON.stringify(iv));
    }
    // The room's three orders together: frost on idle stools, the stampede and shelf life.
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=7&claim=bell&orders=cold,herd,shelf`);
    await pg.waitForTimeout(600);
    if (await pg.evaluate(() => document.getElementById('q').className)) bad(name, '?orders should skip the pick');
    // Shelf life makes the rack free; cold stools pay a coin a wave from wave 2; the stampede allows 4 tries.
    await pg.evaluate(() => SD_RUSH.place('rack'));
    if ((await pg.evaluate(() => SD_RUSH.S.coins + ':' + SD_RUSH.S.maxThrottles)) !== '2:4') bad(name, 'shelf life should make the rack free, and the stampede allow 4 tries');
    await pg.evaluate(() => SD_RUSH.start());
    await pg.waitForTimeout(9000);
    await pg.screenshot({ path: `${OUT}/${name}-12-orders.png` });
    const os = await pg.evaluate(() => ({ colds: SD_RUSH.S.colds, saved: SD_RUSH.S.saved, herds: SD_RUSH.S.herds, orders: [...SD_RUSH.S.orders].join() }));
    console.log(name, 'orders', JSON.stringify(os));
    if (!os.colds || !os.saved || os.orders !== 'cold,herd,shelf') bad(name, 'room orders', JSON.stringify(os));
    if (errs.length) bad(name, 'errors:', errs);
    await pg.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? `FAIL (${fail})` : 'ok');
  process.exit(fail ? 1 : 0);
})();
