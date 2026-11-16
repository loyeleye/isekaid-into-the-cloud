// Headless check and screenshots of the Rush prototype (rush.html). Serves game/, plays a claim at desktop and phone
// size with the rack and the bolted stools placed, checks for page errors, no horizontal scroll and a finished
// claim with its question, and saves screenshots. node tools/rush_check.js [outDir]
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
(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, browser = await chromium.launch();
  let fail = 0;
  for (const [name, vp] of [['desktop', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
    const pg = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=7`);
    await pg.waitForTimeout(700);
    await pg.screenshot({ path: `${OUT}/${name}-1-build.png` });
    // Hands: dragging the bin onto its spot places it, the bell stays locked, and clicking the lever starts the claim.
    const [sx, sy] = await pg.evaluate(() => SD_RUSH.at.slot(2)), [tx, ty] = await pg.evaluate(() => SD_RUSH.at.spot('bin'));
    await pg.mouse.move(sx, sy); await pg.mouse.down(); await pg.mouse.move((sx + tx) / 2, (sy + ty) / 2, { steps: 5 }); await pg.mouse.move(tx, ty, { steps: 5 }); await pg.screenshot({ path: `${OUT}/${name}-0-drag.png` }); await pg.mouse.up();
    const [bx, by] = await pg.evaluate(() => SD_RUSH.at.slot(3)); await pg.mouse.click(bx, by);
    const hands = await pg.evaluate(() => ({ bin: SD_RUSH.S.bin, bell: !!SD_RUSH.S.bell, coins: SD_RUSH.S.coins }));
    if (!hands.bin || hands.bell || hands.coins !== 1) { fail++; console.log(name, 'drag/lock failed', JSON.stringify(hands)); }
    await pg.evaluate(() => SD_RUSH.reset(7));
    // Wave 1 with nothing placed: bounces. Started by clicking the lever.
    const [lx, ly] = await pg.evaluate(() => SD_RUSH.at.lever()); await pg.mouse.click(lx, ly);
    if (!(await pg.evaluate(() => SD_RUSH.S.started))) { fail++; console.log(name, 'lever click did not start'); }
    await pg.waitForTimeout(5200);
    await pg.screenshot({ path: `${OUT}/${name}-2-bounces.png` });
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.place('reserve'); });
    await pg.waitForTimeout(9000);
    await pg.screenshot({ path: `${OUT}/${name}-3-rack.png` });
    await pg.waitForFunction(() => SD_RUSH.S.over, null, { timeout: 120000 }).catch(() => {}); await pg.waitForTimeout(600);
    await pg.screenshot({ path: `${OUT}/${name}-4-stamp.png` });
    const done = await pg.waitForFunction(() => document.getElementById('q').classList.contains('on'), null, { timeout: 120000 }).then(() => true, () => false);
    await pg.screenshot({ path: `${OUT}/${name}-5-question.png` });
    const st = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, handled: SD_RUSH.S.handled, sw: document.documentElement.scrollWidth, w: innerWidth }));
    // Claim 1 won: the end screen offers claim 2, and taking it starts the Bell.
    const nextTxt = await pg.evaluate(() => { document.querySelector('.q-opts button').click(); return document.querySelector('.q-again').textContent; });
    if (!/Next claim: the Bell/.test(nextTxt)) { fail++; console.log(name, 'no next-claim button:', nextTxt); }
    await pg.click('.q-again');
    if ((await pg.evaluate(() => SD_RUSH.S.claim)) !== 'bell') { fail++; console.log(name, 'next claim did not start the Bell'); }
    // Claim 2, the Bell: a few seconds without the bell (Mira copies ribboned tickets by hand), then the bell and the rack.
    await pg.evaluate(() => SD_RUSH.reset(7, 'bell'));
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-6-bell-build.png` });
    const [b1x, b1y] = await pg.evaluate(() => SD_RUSH.at.slot(3)), [b2x, b2y] = await pg.evaluate(() => SD_RUSH.at.spot('bell'));
    await pg.mouse.move(b1x, b1y); await pg.mouse.down(); await pg.mouse.move(b2x, b2y, { steps: 8 }); await pg.mouse.up();
    if (!(await pg.evaluate(() => SD_RUSH.S.bell))) { fail++; console.log(name, 'bell drag failed'); }
    await pg.evaluate(() => { SD_RUSH.place('rack'); SD_RUSH.start(); });
    await pg.waitForTimeout(11000);
    await pg.screenshot({ path: `${OUT}/${name}-7-bell.png` });
    const bellDone = await pg.waitForFunction(() => document.getElementById('q').classList.contains('on'), null, { timeout: 120000 }).then(() => true, () => false);
    await pg.screenshot({ path: `${OUT}/${name}-8-bell-question.png` });
    const bs = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, reports: SD_RUSH.S.reports, rings: SD_RUSH.S.rings, q: document.querySelector('.q-text').textContent.slice(0, 40) }));
    console.log(name, 'bell', JSON.stringify(bs));
    if (!bellDone || bs.over !== 'win' || !bs.rings || !/order is placed/.test(bs.q)) { fail++; console.log(name, 'bell claim did not play through'); }
    // The Bell won: on to claim 3, the Double-claimer.
    const next3 = await pg.evaluate(() => { document.querySelector('.q-opts button').click(); return document.querySelector('.q-again').textContent; });
    if (!/Next claim: the Double-claimer/.test(next3)) { fail++; console.log(name, 'no claim 3 button:', next3); }
    await pg.click('.q-again');
    await pg.evaluate(() => SD_RUSH.reset(7, 'double'));
    await pg.waitForTimeout(400);
    await pg.screenshot({ path: `${OUT}/${name}-9-double-build.png` });
    const [l1x, l1y] = await pg.evaluate(() => SD_RUSH.at.slot(3)), [l2x, l2y] = await pg.evaluate(() => SD_RUSH.at.spot('ledger'));
    await pg.mouse.move(l1x, l1y); await pg.mouse.down(); await pg.mouse.move(l2x, l2y, { steps: 8 }); await pg.mouse.up();
    if (!(await pg.evaluate(() => SD_RUSH.S.ledger))) { fail++; console.log(name, 'ledger drag failed'); }
    await pg.evaluate(() => { SD_RUSH.place('reserve'); SD_RUSH.start(); });
    await pg.waitForTimeout(9000);
    await pg.screenshot({ path: `${OUT}/${name}-10-double.png` });
    const dDone = await pg.waitForFunction(() => document.getElementById('q').classList.contains('on'), null, { timeout: 120000 }).then(() => true, () => false);
    await pg.screenshot({ path: `${OUT}/${name}-11-double-question.png` });
    const ds = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, dropped: SD_RUSH.S.dropped, twice: SD_RUSH.S.paidTwice, q: document.querySelector('.q-text').textContent.slice(0, 50), again: document.querySelector('.q-again').textContent }));
    console.log(name, 'double', JSON.stringify(ds));
    if (!dDone || ds.over !== 'win' || !ds.dropped || ds.twice || !/payment function/.test(ds.q)) { fail++; console.log(name, 'double claim did not play through'); }
    if (errs.length) { fail++; console.log(name, 'errors:', errs); }
    if (!done) { fail++; console.log(name, 'claim never finished'); }
    if (st.sw > st.w) { fail++; console.log(name, 'horizontal scroll'); }
    console.log(name, JSON.stringify(st));
    await pg.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? `FAIL (${fail})` : 'ok');
  process.exit(fail ? 1 : 0);
})();
