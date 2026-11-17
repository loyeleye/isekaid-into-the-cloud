// Headless check and screenshots of claim 7, the Locked Desk (rush.html?claim=locked). Serves game/ and plays the
// claim at desktop (1366x768) and phone (390x844) size. Checks page errors, horizontal scroll and the belt fitting on
// screen; drags in every buy (badge, pad, cache, param, safe, waiter); works the badge card's stamps (and that a
// mid-wave change is refused), the cabinet sign, shredding the keyring, rotating the drawer, the dumbwaiter and the
// intern's scope; answers a spot-the-line desk letter in the office and one in the cellar, and a spot-the-line letter
// from the letters order; then plays through to the end strip.
// node tools/rush_check_office.js [outDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/rush-office-shots';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
let fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
const qClass = pg => pg.evaluate(() => document.getElementById('q').className);
const endShown = pg => pg.evaluate(() => document.getElementById('q').classList.contains('end'));
// Drag a tool from its belt slot onto its spot in the room.
async function dragTo(pg, tool) {
  const room = () => (SD_RUSH.view === 'review' ? SD_RUSH.S.review : SD_RUSH.S);
  const i = await pg.evaluate(`(${room})().belt.indexOf(${JSON.stringify(tool)})`);
  if (i < 0) return false;
  const [ax, ay] = await pg.evaluate(i => SD_RUSH.at.slot(i), i), [bx, by] = await pg.evaluate(t => SD_RUSH.at.spot(t), tool);
  await pg.mouse.move(ax, ay); await pg.mouse.down(); await pg.mouse.move(bx, by, { steps: 8 }); await pg.mouse.up();
  return pg.evaluate(`!!(${room})()[${JSON.stringify(tool)}]`);
}
const tap = async (pg, pt) => { await pg.mouse.click(pt[0], pt[1]); await pg.waitForTimeout(120); };
// The belt and the canvas fit inside the viewport.
const fits = pg => pg.evaluate(() => {
  const L = SD_RUSH.office.layout(), r = document.querySelector('canvas').getBoundingClientRect();
  const a = SD_RUSH.at.slot(0), b = SD_RUSH.at.slot(SD_RUSH.S.belt.length - 1);
  return { sw: document.documentElement.scrollWidth, w: innerWidth, h: innerHeight, a, b, ok: a[0] >= 0 && b[0] <= innerWidth && a[1] <= innerHeight && b[1] <= innerHeight && r.width <= innerWidth + 1, L: L.W + 'x' + L.H };
});
// Answer an open spot card: 'right' taps the wrong line (or the right fix), 'wrong' another one.
const spotAnswer = (pg, how) => pg.evaluate(how => {
  const q = document.getElementById('q');
  const fix = q.querySelector('.sp-fixes'), btns = [...q.querySelectorAll(fix ? '.sp-fixes button' : '.sp-code button')];
  const ans = btns.find(b => b.dataset.i === '0'), other = btns.find(b => b.dataset.i !== '0');
  (how === 'right' ? ans : other).click();
  return { fix: !!fix, n: btns.length, right: !!q.querySelector('button.right'), wrong: !!q.querySelector('button.wrong'), why: q.querySelector('.lt-why').classList.contains('on'), fixShown: !!q.querySelector('.sp-fix.on') };
}, how);
// The player: checks the intern's stamped answers rightly, answers cellar questions and desk letters after a beat, and
// answers any letter that drops. Returns whether the end strip showed.
async function tend(pg, desk, cellar = true) {
    await pg.evaluate(([desk, cellar]) => {
      const R = SD.rushCore, M = SD_RUSH.S, V = M.review;
      if (V && cellar) {
        V.tickets.filter(k => k.quiz && (k.phase === 'stamped' || k.phase === 'leak')).forEach(k => R.check(V, k.id, k.internRight ? 'ok' : 'wrong'));
        V.tickets.filter(k => k.quiz && k.phase === 'ask' && V.time - k.askAt > 2).forEach(k => R.reply(V, k.id, true));
      }
      if (desk) M.tickets.filter(k => k.quiz && k.phase === 'ask' && M.time - k.askAt > 2).forEach(k => R.reply(M, k.id, true));
    }, [desk, cellar]);
    const c = await qClass(pg);
    if (/\bletter\b/.test(c) && !/\bend\b/.test(c)) {
      if (await pg.$('.sp-code')) await spotAnswer(pg, 'right');
      else await pg.evaluate(() => { const b = [...document.querySelectorAll('#q .lt-opts button')].find(x => x.dataset.i === '0') || document.querySelector('#q .lt-opts button'); if (b && !b.disabled) b.click(); });
      await pg.waitForTimeout(80);
      const go = await pg.$('#q .lt-go.on'); if (go) await go.click(); else await pg.evaluate(() => { const g = document.querySelector('#q .lt-go'); if (g) g.click(); });
    }
}
async function playOut(pg, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { if (await endShown(pg)) return true; await tend(pg, true); await pg.waitForTimeout(200); }
  return false;
}
// Wait for a letter (not a review or office card) while tending everything else, desk included.
async function waitLetter(pg) {
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    if (await pg.evaluate(() => { const c = document.getElementById('q').className; return /\bletter\b/.test(c) && !/review|office-card|end/.test(c); })) return true;
    if (await endShown(pg)) return false;
    await pg.evaluate(() => {
      const R = SD.rushCore, M = SD_RUSH.S, V = M.review;
      V.tickets.filter(k => k.quiz && (k.phase === 'stamped' || k.phase === 'leak')).forEach(k => R.check(V, k.id, k.internRight ? 'ok' : 'wrong'));
      [M, V].forEach(S => S.tickets.filter(k => k.quiz && k.phase === 'ask' && S.time - k.askAt > 2).forEach(k => R.reply(S, k.id, true)));
    });
    await pg.waitForTimeout(150);
  }
  return false;
}
// Wait for fn() in the page while tending the cellar and the letters (not the desk).
async function waitFor(pg, fn, arg, ms, cellar = true) {
  const t0 = Date.now();
  while (Date.now() - t0 < (ms || 30000)) { if (await pg.evaluate(fn, arg)) return true; if (await endShown(pg)) return false; await tend(pg, false, cellar); await pg.waitForTimeout(150); }
  return false;
}

(async () => {
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port, browser = await chromium.launch();
  for (const [name, vp] of [['wide', { width: 1366, height: 768 }], ['phone', { width: 390, height: 844 }]]) {
    const pg = await browser.newPage({ viewport: vp, deviceScaleFactor: 2 });
    const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error' && !/fonts|ERR_FAILED/.test(m.text())) errs.push(m.text()); });
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    const shot = async n => { await pg.waitForTimeout(250); await pg.screenshot({ path: `${OUT}/${name}-${n}.png` }); };

    // ---- 1. The build: the office, Dutch's intro, all six buys on the belt. ----
    await pg.goto(`http://127.0.0.1:${port}/rush.html?claim=locked&orders=letters&seed=7`);
    await pg.waitForTimeout(900);
    const b0 = await pg.evaluate(() => ({ office: !!SD_RUSH.S.office, belt: SD_RUSH.S.belt.join(), coins: SD_RUSH.S.coins, review: !!SD_RUSH.S.review, intern: !!(SD_RUSH.S.review && SD_RUSH.S.review.intern) }));
    console.log(name, 'build', JSON.stringify(b0));
    if (!b0.intern) bad(name, 'no intern on a direct link');
    if (!b0.office || b0.belt !== 'badge,pad,cache,param,safe,waiter' || !b0.review) bad(name, 'not the office', JSON.stringify(b0));
    let f = await fits(pg); if (!f.ok || f.sw > f.w) bad(name, 'belt or page does not fit', JSON.stringify(f));
    await shot('1-build');

    // ---- 2. The badge card: stamps, the policy preview. Tighten to seal+file+read. ----
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.mira()));
    if (!/office-card/.test(await qClass(pg))) {
      // The keyring opens first when there's no badge; its stamps button leads to the same card.
      await tap(pg, await pg.evaluate(() => SD_RUSH.office.keyring()));
    }
    if (!/office-card/.test(await qClass(pg))) bad(name, 'no card from Mira or the keyring');
    if (await pg.$('.of-btns button[data-k="stamps"]')) await pg.click('.of-btns button[data-k="stamps"]');
    if (!(await pg.$('.of-stamps'))) bad(name, 'no stamp card');
    else {
      const before = await pg.textContent('.of-policy');
      for (const s of ['star', 'seal', 'file', 'read']) {
        const on = await pg.evaluate(s => { const b = document.querySelector(`.of-stamp[data-s="${s}"]`); return b && b.classList.contains('on'); }, s);
        if ((s === 'star') === on) await pg.click(`.of-stamp[data-s="${s}"]`);
      }
      const st = await pg.evaluate(() => [...SD_RUSH.S.stamps].sort().join());
      if (st !== 'file,read,seal') bad(name, 'stamps', st);
      if ((await pg.textContent('.of-policy')) === before) bad(name, 'policy preview did not change');
      await shot('2-stamps');
      await pg.click('.lt-go');
    }

    // ---- 3. Every buy: drag each one in (coins topped up so all six fit). ----
    await pg.evaluate(() => { SD_RUSH.S.coins += 10; });
    for (const t of ['badge', 'pad', 'cache', 'param']) if (!(await dragTo(pg, t))) bad(name, 'buy did not place:', t);
    // The drawer with the parameter in it: tap it to rotate the combination by hand.
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.secret()));
    if ((await pg.evaluate(() => SD_RUSH.S.rotations)) !== 1) bad(name, 'drawer tap did not rotate the parameter');
    for (const t of ['safe', 'waiter']) if (!(await dragTo(pg, t))) bad(name, 'buy did not place:', t);
    if ((await pg.evaluate(() => SD_RUSH.S.secret)) !== 'safe') bad(name, 'the safe did not take the combination');
    // The cellar's own belt: the rack and the dead-letter bin (the intern came up from claim 6).
    await pg.evaluate(() => SD_RUSH.switchRoom()); await pg.waitForTimeout(500);
    for (const t of ['rack', 'bin']) if (!(await dragTo(pg, t))) bad(name, 'cellar buy did not place:', t);
    await shot('3c-cellar-build');
    await pg.evaluate(() => SD_RUSH.switchRoom()); await pg.waitForTimeout(500);
    // The badge starts on the star again (a new role), so stamp it down from Mira's card.
    if ((await pg.evaluate(() => [...SD_RUSH.S.stamps].join())) !== 'star') bad(name, 'the badge did not start on the star');
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.mira()));
    if (!(await pg.$('.of-stamps'))) bad(name, 'no badge card from Mira');
    else {
      if (!/badge/.test(await pg.textContent('.lt-kind'))) bad(name, 'the card is not the badge');
      for (const t of ['star', 'seal', 'file', 'read']) await pg.click(`.of-stamp[data-s="${t}"]`);
      if ((await pg.evaluate(() => [...SD_RUSH.S.stamps].sort().join())) !== 'file,read,seal') bad(name, 'badge stamps');
      await shot('3a-badge');
      await pg.click('.lt-go');
    }
    await shot('3-built');
    // The keyring: shred it now the badge is on.
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.keyring()));
    if (await pg.$('.of-btns button[data-k="shred"]:not([disabled])')) { await pg.click('.of-btns button[data-k="shred"]'); }
    else bad(name, 'no shred button with the badge on');
    await pg.waitForTimeout(150);
    if (!(await pg.evaluate(() => !SD_RUSH.S.keyringLive))) bad(name, 'keyring still live');
    // The cabinet sign: cycle it and leave it on the riverside setting.
    const signs = [];
    for (let i = 0; i < 3; i++) { await tap(pg, await pg.evaluate(() => SD_RUSH.office.sign())); signs.push(await pg.evaluate(() => SD_RUSH.S.sign)); if (/office-card/.test(await qClass(pg))) await pg.click('.lt-go'); }
    console.log(name, 'signs', signs.join('>'));
    if (new Set(signs).size < 2) bad(name, 'sign did not change', signs.join());
    for (let i = 0; i < 3 && (await pg.evaluate(() => SD_RUSH.S.sign)) !== 'riverside'; i++) await tap(pg, await pg.evaluate(() => SD_RUSH.office.sign()));
    if ((await pg.evaluate(() => SD_RUSH.S.sign)) !== 'riverside') bad(name, 'could not set riverside');
    // The secret: the param or safe on the drawer now.
    console.log(name, 'secret', await pg.evaluate(() => SD_RUSH.S.secret));

    // ---- 4. Start: turn the key in the desk lock. Mid-run, a stamp change is refused. ----
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.lock()));
    if (!(await pg.evaluate(() => SD_RUSH.S.started))) bad(name, 'the lock did not start the night');
    await pg.waitForTimeout(2500);
    await shot('4-mid');
    const editMid = await pg.evaluate(() => SD.rushOffice.canEdit(SD_RUSH.S));
    if (editMid) bad(name, 'stamps editable mid-wave');
    // ---- 5. A spot-the-line desk letter in the office. ----
    const deskOk = await waitFor(pg, () => SD_RUSH.S.tickets.some(k => k.quiz && k.phase === 'ask'), null, 40000);
    if (!deskOk) bad(name, 'no desk letter');
    else {
      const id = await pg.evaluate(() => SD_RUSH.S.tickets.find(k => k.quiz && k.phase === 'ask').id);
      if (await pg.evaluate(() => SD_RUSH.view) !== 'main') await pg.evaluate(() => SD_RUSH.switchRoom());
      const at = await pg.evaluate(id => SD_RUSH.office.deskAsk(id), id);
      if (at) await tap(pg, at);
      if (!(await pg.$('.sp-code'))) bad(name, 'the desk letter is not a spot card', await qClass(pg));
      else {
        await shot('5-spot');
        const r = await spotAnswer(pg, 'right');
        if (!r.right || r.wrong || !r.why) bad(name, 'desk spot answer', JSON.stringify(r));
        await shot('5b-spot-answer');
        await pg.click('.lt-go');
      }
    }

    // ---- 6. The cellar: the review room, with the intern. Check one, set the scope, use the dumbwaiter. ----
    await pg.evaluate(() => { if (SD_RUSH.view !== 'review') SD_RUSH.switchRoom(); });
    await pg.waitForTimeout(600);
    if ((await pg.evaluate(() => SD_RUSH.view)) !== 'review') bad(name, 'no switch to the cellar');
    await shot('6-review');
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.intern()));
    if (await pg.$('.of-btns button[data-v="topics"]')) {
      await pg.click('.of-btns button[data-v="topics"]');
      if ((await pg.evaluate(() => SD_RUSH.S.internScope)) !== 'topics') bad(name, 'scope did not change');
      // Left on topics: with one desk letter solved, the intern may take the other desk letters too (by the dumbwaiter).
    } else bad(name, 'no scope card from the intern');
    await pg.evaluate(() => { if (SD_RUSH.view !== 'main') SD_RUSH.switchRoom(); });
    // The dumbwaiter: from the office, check an answer the intern stamped downstairs.
    const stamped = () => SD_RUSH.S.review.tickets.some(k => k.quiz && k.phase === 'stamped');
    if (await waitFor(pg, stamped, null, 30000, false)) {
      await tap(pg, await pg.evaluate(() => SD_RUSH.office.hatch()));
      if (!(await pg.$('#q .lt-verdict'))) bad(name, 'the dumbwaiter did not bring up a check card', await qClass(pg));
      else {
        await shot('6c-dumbwaiter');
        const ok = await pg.evaluate(() => { const k = SD_RUSH.S.review.tickets.filter(x => x.quiz && x.phase === 'stamped'); return true; });
        await pg.click('#q .lt-verdict button[data-v="ok"]'); await pg.waitForTimeout(100);
        const g = await pg.$('#q .lt-go'); if (g) await g.click();
      }
    } else console.log(name, 'note: the intern stamped nothing in 30 s');
    // With the dumbwaiter and the topics scope the intern also takes desk letters: check one on the spot card.
    const deskStamped = () => SD_RUSH.S.tickets.some(k => k.quiz && k.phase === 'stamped');
    if (await waitFor(pg, deskStamped, null, 40000, true)) {
      const id = await pg.evaluate(() => SD_RUSH.S.tickets.find(k => k.quiz && k.phase === 'stamped').id);
      const at = await pg.evaluate(id => SD_RUSH.office.deskAsk(id), id);
      if (at) await tap(pg, at);
      if (!(await pg.$('.sp-code')) || !(await pg.$('#q .lt-verdict'))) bad(name, 'the intern\'s desk letter did not open a spot check card', await qClass(pg));
      else {
        await shot('6d-desk-check');
        const v = await pg.evaluate(id => SD_RUSH.S.tickets.find(k => k.id === id).internRight ? 'ok' : 'wrong', id);
        await pg.click(`#q .lt-verdict button[data-v="${v}"]`); await pg.waitForTimeout(120);
        if (!(await pg.$('#q .sp-code button.right'))) bad(name, 'the check card did not show the wrong line');
        await shot('6e-desk-check-done');
        const g = await pg.$('#q .lt-go'); if (g) await g.click();
      }
    } else bad(name, 'the intern never took a desk letter with the dumbwaiter');

    // ---- 7. Play to the end. ----
    if (!(await playOut(pg, 170000))) bad(name, 'claim 7 never ended');
    await shot('7-end');
    const st = await pg.evaluate(() => ({ over: SD_RUSH.S.over, spill: SD_RUSH.S.spill, handled: SD_RUSH.S.handled, sw: document.documentElement.scrollWidth, w: innerWidth, end: document.querySelector('#q').innerText.slice(0, 300) }));
    console.log(name, 'end', JSON.stringify(st));
    if (st.sw > st.w) bad(name, 'horizontal scroll at the end');
    if (errs.length) bad(name, 'page errors:', errs.slice(0, 5).join(' | '));
    await pg.close();
  }

  // ---- 8. A spot-the-line letter from the letters order (claim 7's letters pool), on the phone. ----
  {
    const pg = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const errs = []; pg.on('pageerror', e => errs.push(e.message));
    await pg.route(/fonts\.(googleapis|gstatic)/, r => r.abort());
    await pg.goto(`http://127.0.0.1:${port}/rush.html?claim=locked&orders=letters&seed=11`);
    await pg.waitForTimeout(800);
    await pg.evaluate(() => { SD_RUSH.S.coins += 6; ['badge', 'pad', 'cache', 'param'].forEach(t => SD_RUSH.place(t)); });
    await tap(pg, await pg.evaluate(() => SD_RUSH.office.lock()));
    let got = false;
    await pg.evaluate(() => { SD_RUSH.S.stamps = new Set(['seal', 'file', 'read']); SD.rushOffice.shred(SD_RUSH.S); SD_RUSH.S.coins += 3; SD.rushCore.place(SD_RUSH.S.review, 'rack'); SD.rushCore.place(SD_RUSH.S.review, 'bin'); });
    for (let i = 0; i < 3 && !got; i++) {
      const open = await waitLetter(pg);
      if (!open) break;
      if (await pg.$('.sp-code')) {
        got = true;
        await pg.screenshot({ path: `${OUT}/phone-8-letter-spot.png` });
        const r = await spotAnswer(pg, 'wrong');
        if (!r.wrong || !r.right) bad('letters', 'a wrong tap did not show both lines', JSON.stringify(r));
        await pg.screenshot({ path: `${OUT}/phone-8b-letter-spot-wrong.png` });
      } else await pg.evaluate(() => { const b = [...document.querySelectorAll('#q .lt-opts button')].find(x => x.dataset.i === '0'); if (b) b.click(); });
      await pg.waitForTimeout(80); await pg.click('#q .lt-go');
    }
    if (!got) bad('letters', 'no spot-the-line letter among the night\'s three');
    if (errs.length) bad('letters', 'page errors:', errs.join(' | '));
    await pg.close();
  }
  await browser.close(); srv.close();
  console.log(fail ? `${fail} failure(s)` : 'all good', '· shots in', OUT);
  process.exit(fail ? 1 : 0);
})();
