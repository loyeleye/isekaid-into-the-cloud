// Headless check and screenshots of the Sorting Floor's hall screens (js/rush-hall.js) in rush.html, at desktop and
// phone size: the hall opens first, a locked door does nothing, the glowing door walks the lantern and opens the
// claim's Night Orders pick; after a win, the debrief's stamps (a drag onto the ticket, a wrong answer coming back
// first next time), the parts cart (the stencil typing, the gift placed when the next claim starts), the other
// wings, and the morning ledger after the last claim. Fails on page errors and horizontal scroll.
// node tools/rush_hall_check.js [outDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/rush-hall-shots';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
let fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
const ok = (c, ...a) => { if (!c) bad(...a); };
const wait = ms => new Promise(r => setTimeout(r, ms));

async function run(browser, port, tag, view) {
  const ctx = await browser.newContext(Object.assign({ deviceScaleFactor: 1 }, view));
  const pg = await ctx.newPage();
  const errs = [];
  pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const shot = n => pg.screenshot({ path: path.join(OUT, `${tag}-${n}.png`) });
  const noScroll = async where => { const w = await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth); ok(w <= 1, tag, where, 'horizontal scroll', w); };
  await pg.goto(`http://127.0.0.1:${port}/rush.html?seed=7`);
  await pg.evaluate(() => SD.rushHall.debugReset());
  await pg.reload();
  await pg.waitForSelector('#hall.on .hl-door');
  await wait(700);
  // 1. The hall: the Rush's door glows; the Bell's is locked.
  ok(await pg.$('.hl-door.next[data-c="rush"]'), tag, 'the Rush door glows');
  ok(await pg.$eval('.hl-door[data-c="bell"]', b => b.disabled), tag, 'the Bell door is locked');
  ok(!(await pg.evaluate(() => document.getElementById('q').classList.contains('on'))), tag, 'no pick behind the hall');
  await noScroll('hall'); await shot('1-hall');
  await pg.click('.hl-door[data-c="rush"]');
  await pg.waitForSelector('#q.orders', { timeout: 5000 });
  ok(!(await pg.evaluate(() => document.getElementById('hall').classList.contains('on'))), tag, 'hall closes on entering');
  // 2. A win on the Rush (as the end card's button would report it): the debrief.
  await pg.evaluate(() => { document.getElementById('q').className = ''; SD.rushHall.won({ claim: 'rush', next: 'bell', go: () => SD_RUSH.showPick('bell') }); });
  await pg.waitForSelector('.hl-st');
  ok((await pg.$$('.hl-st')).length >= 3, tag, 'debrief has stamps');
  await wait(300); await noScroll('debrief'); await shot('2-debrief');
  // Answer wrong by dragging a wrong stamp onto the ticket.
  const wrong = await pg.$('.hl-st:not([data-i="0"])'), tk = await pg.$('#hl-tk');
  const a = await wrong.boundingBox(), b = await tk.boundingBox();
  await pg.mouse.move(a.x + a.width / 2, a.y + a.height / 3); await pg.mouse.down();
  await pg.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 }); await pg.mouse.up();
  await pg.waitForSelector('.hl-ink.no');
  const missed = await pg.evaluate(() => SD.rushHall.state.missed);
  ok(missed, tag, 'a wrong stamp records the miss');
  await wait(300); await shot('3-debrief-wrong');
  // 3. The parts cart: two crates from the Rush's belt that the Bell also uses.
  await pg.click('.hl-go');
  await pg.waitForSelector('.hl-crate');
  const crates = await pg.$$eval('.hl-crate', bs => bs.map(b => b.dataset.t));
  ok(crates.length === 2 && crates.every(t => ['rack', 'reserve', 'bin'].includes(t)), tag, 'cart pieces', crates);
  await wait(300); await noScroll('cart'); await shot('4-cart');
  const cr = await (await pg.$('.hl-crate')).boundingBox(), belt = await (await pg.$('#hl-belt')).boundingBox();
  await pg.mouse.move(cr.x + cr.width / 2, cr.y + cr.height / 2); await pg.mouse.down();
  await pg.mouse.move(belt.x + belt.width / 2, belt.y + belt.height / 2, { steps: 8 }); await pg.mouse.up();
  await pg.waitForSelector('.hl-sten');
  ok(await pg.$eval('.hl-ok', b => b.disabled), tag, 'stencil starts disabled');
  await pg.keyboard.type('aws sqs'); await wait(200); await shot('5-stencil');
  const line = await pg.evaluate(t => document.querySelector('#hl-in').getAttribute('aria-label').replace(/^Type: /, ''), crates[0]);
  await pg.fill('#hl-in', ''); await pg.keyboard.type(line);
  ok(!(await pg.$eval('.hl-ok', b => b.disabled)), tag, 'typing the line enables it');
  await pg.click('.hl-ok');
  await pg.waitForSelector('.hl-go');
  const st = await pg.evaluate(() => SD.rushHall.state);
  ok(st.typed[crates[0]] && st.gift && st.gift.tool === crates[0] && st.gift.claim === 'bell', tag, 'gift and typed saved', JSON.stringify(st.gift));
  await shot('6-cart-taken');
  // 4. Back to the hall: the Rush is stamped, the Bell glows. Enter it: the pick, then the gift is placed.
  await pg.click('.hl-go');
  await pg.waitForSelector('.hl-door.next[data-c="bell"]');
  ok(await pg.$('.hl-door[data-c="rush"] .hl-stamp'), tag, 'the Rush is stamped closed');
  await wait(700); await shot('7-hall-after');
  await pg.click('.hl-door[data-c="bell"]');
  await pg.waitForSelector('#q.orders .no-card');
  await pg.click('#q.orders .no-card'); await pg.waitForSelector('.no-go'); await pg.click('.no-go');
  await wait(300);
  const placed = await pg.evaluate(t => !!SD_RUSH.S[t] && SD_RUSH.S.claim === 'bell', crates[0]);
  ok(placed, tag, 'the gift starts placed in the Bell', crates[0]);
  ok(!(await pg.evaluate(() => SD.rushHall.state.gift)), tag, 'the gift is used up');
  // 5. The next debrief asks the missed question first.
  await pg.evaluate(() => SD.rushHall.won({ claim: 'bell', next: 'double', go: () => SD_RUSH.showPick('double') }));
  await pg.waitForSelector('.hl-st');
  ok(await pg.$eval('.hl-kind', e => /back again/.test(e.textContent)), tag, 'the missed question comes back');
  await pg.click('.hl-st[data-i="0"]');
  await pg.waitForSelector('.hl-ink.ok');
  ok(!(await pg.evaluate(() => SD.rushHall.state.missed)), tag, 'answering it clears the miss');
  // 6. Another wing, then the morning after the last claim.
  await pg.evaluate(() => { const s = SD.rushHall.state; ['rush', 'bell', 'double', 'slow', 'picky', 'hot', 'locked', 'audit'].forEach(c => { s.closed[c] = true; }); });
  await pg.click('.hl-go'); // to the cart
  await pg.waitForSelector('.hl-crate'); await pg.click('.hl-crate');
  await wait(200);
  if (await pg.$('.hl-sten')) await pg.click('.hl-skip');
  await pg.waitForSelector('.hl-go'); await pg.click('.hl-go');
  await pg.waitForSelector('#hall.on .hl-door'); await wait(700);
  ok(await pg.$('.hl-door.next[data-c="sorter"]'), tag, 'the New Sorter glows upstairs');
  await noScroll('upstairs'); await shot('8-upstairs');
  await pg.click('.hl-arrow.l'); await wait(800); await shot('9-dock');
  await pg.evaluate(() => SD.rushHall.won({ claim: 'sorter', next: null, go: () => SD_RUSH.showPick('rush') }));
  await pg.waitForSelector('.hl-st'); await pg.click('.hl-st[data-i="0"]');
  await pg.waitForSelector('.hl-go'); await pg.click('.hl-go');
  await pg.waitForSelector('.hl-ledger'); await wait(700);
  ok((await pg.$$('.hl-ledger li')).length === 9, tag, 'the ledger lists nine claims');
  await noScroll('morning'); await shot('10-morning');
  await pg.click('.hl-ledger .hl-go');
  await pg.waitForSelector('#q.orders');
  ok(!errs.length, tag, 'page errors', errs.slice(0, 3));
  await ctx.close();
}

(async () => {
  await new Promise(r => srv.listen(0, r));
  const port = srv.address().port;
  const browser = await chromium.launch();
  try {
    await run(browser, port, 'desktop', { viewport: { width: 1280, height: 800 } });
    await run(browser, port, 'phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  } catch (e) { bad('threw', e.message); }
  await browser.close(); srv.close();
  console.log(fail ? `${fail} failed` : 'rush_hall_check: all passed', '· shots in', OUT);
  process.exit(fail ? 1 : 0);
})();
