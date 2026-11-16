// Does placement matter in the Look-Alike Cup (js/mode-duel.js)? Hard squares, his next square shown, Nov 16.
// On the simulator (the state machine the screens use), honest confidence, NIGHTS nights a cell (default 2000, at
// least 200), a seeded mulberry32 RNG (the 31-bit LCG the older checks use gave gaps of up to 8 points between
// square policies that vanished with a better generator, so this check doesn't use it). It fails unless:
//   - greedy placement, or 'hard' (hard squares when sure), wins the Cup at least 8 points more often than random
//     placement at p = 0.6 and at p = 0.7;
//   - the Cup is won on at least 55% of nights at p = 0.7 under greedy and under 'hard';
//   - every hard square is chalked with a set from DU.SETS, edges are plain, and a card only settles on a hard
//     square of its own set (or on any empty square when none fits);
//   - his shown square (b.next) is the square he takes on a miss, every time.
// Run from game/:  node tools/duel_squares_check.js [nights per cell]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const NIGHTS = Math.max(200, +process.argv[2] || 2000);
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
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.click('#t-start');
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.persist(); });

  const out = await page.evaluate(async N => {
    const DU = SD.duel;
    const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    // Watch every cast: the square shown before it, where he moved, and whether the stone fitted its square.
    const audit = { misses: 0, shownTaken: 0, badFit: 0, casts: 0, badChalk: 0 };
    const settle = DU.settle;
    DU.settle = function (s, card, sq, r, parried) {
      const b = s.b, shown = DU.nextSq(s, b), forced = DU.forced(b) === card;
      if (!forced && !DU.legal(b, card).includes(sq)) audit.badFit++;
      if (b.hard && (b.hard.some((x, i) => (DU.HARD.includes(i) ? !DU.SETS[x] : x !== null)))) audit.badChalk++;
      audit.casts++;
      const ev = settle.apply(this, arguments);
      if (!r.ok && !parried) { audit.misses++; if (ev.some(e => e.who === 'him' && e.sq === shown)) audit.shownTaken++; }
      return ev;
    };
    const res = {};
    for (const p of [0.6, 0.7, 0.8]) for (const square of ['greedy', 'hard', 'centre', 'random']) {
      const rng = mulberry(1);
      let won = 0;
      for (let k = 0; k < N; k++) won += (await DU.sim({ p, conf: 'honest', square }, rng)).won ? 1 : 0;
      res[p + ' ' + square] = won / N;
    }
    DU.settle = settle;
    return { res, audit };
  }, NIGHTS);

  console.log(`Cup won by square policy (${NIGHTS} nights a cell, honest confidence)`);
  console.log('  p     greedy    hard  centre  random');
  for (const p of [0.6, 0.7, 0.8]) console.log(`  ${p.toFixed(2)}` + ['greedy', 'hard', 'centre', 'random'].map(k => (out.res[p + ' ' + k] * 100).toFixed(1).padStart(8)).join(''));
  for (const p of [0.6, 0.7]) {
    const best = Math.max(out.res[p + ' greedy'], out.res[p + ' hard']), gap = (best - out.res[p + ' random']) * 100;
    check(gap >= 8, `p = ${p}: greedy or hard squares when sure beats random placement by at least 8 points (${gap.toFixed(1)})`);
  }
  const c7 = Math.min(out.res['0.7 greedy'], out.res['0.7 hard']) * 100;
  check(c7 >= 55, `p = 0.7: the Cup is won on at least 55% of nights by greedy and by hard squares when sure (${c7.toFixed(1)}%)`);
  const a = out.audit;
  check(!a.badChalk, `every hard square is chalked with a set and every edge is plain (${a.casts} casts)`);
  check(!a.badFit, `every chosen stone fits its square: hard squares take their own set only (${a.badFit} misfits)`);
  check(a.misses > 0 && a.shownTaken === a.misses, `on every unparried miss he takes the square shown before the cast (${a.shownTaken} of ${a.misses})`);

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page errors');
  if (fails.length) { console.error(`\n${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('\nOK: placement matters, and the shown square is the square he takes.');
})().catch(e => { console.error(e); process.exit(1); });
