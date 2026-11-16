// Pin it down can't be won by word matching (Nov 16 review): for every bank question Monster Hunt can pin, build the
// three reasons the way the hunt does (SD.hunt._buildPin) and play the "most words in common with the option" policy.
// Ties are split evenly. Fails if that policy, or its opposite (fewest words in common), is right on more than 45% of
// pins (chance is 33%).
// Run from game/:  node tools/pin_check.js [builds per question, default 3]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const N = +process.argv[2] || 3, LIMIT = 0.45;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
(async () => {
  await new Promise(r => server.listen(0, r));
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(`http://localhost:${server.address().port}/index.html`);
  await page.click('#t-start');
  const r = await page.evaluate(N => {
    SD.state.save.examTrack = 'DVA'; SD.state.persist();
    let pins = 0, win = 0, low = 0, qs = 0;
    SD.bank.filter(q => SD.exam.allowed(q) && (q.type === 'mc' || q.type === 'multi')).forEach(q => {
      let any = false;
      for (let k = 0; k < N; k++) {
        const p = SD.hunt._buildPin(q);
        if (!p) break;
        any = true; pins++;
        const ov = p.reasons.map(x => SD.hunt._overlap(x, p.opt)), top = Math.max(...ov), best = ov.map((o, i) => i).filter(i => ov[i] === top);
        if (best.includes(p.a)) win += 1 / best.length;
        const bot = Math.min(...ov), least = ov.map((o, i) => i).filter(i => ov[i] === bot);
        if (least.includes(p.a)) low += 1 / least.length;
      }
      if (any) qs++;
    });
    const sample = ['dva-1-04', 'dva-2-07'].map(id => SD.hunt._buildPin(SD.exam.find(id)));
    return { pins, qs, rate: win / pins, low: low / pins, sample };
  }, N);
  if (process.env.SHOW) console.log(JSON.stringify(r.sample, null, 1));
  console.log(`pins built: ${r.pins} (${r.qs} questions, ${N} each)`);
  console.log(`word matching right: ${(r.rate * 100).toFixed(1)}% (limit ${LIMIT * 100}%, chance 33.3%)`);
  console.log(`fewest words in common right: ${(r.low * 100).toFixed(1)}% (limit ${LIMIT * 100}%)`);
  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  const ok = r.pins > 100 && r.rate <= LIMIT && r.low <= LIMIT && !errors.length;
  console.log(ok ? 'OK: Pin it down can\'t be won by word matching.' : 'FAIL');
  process.exit(ok ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
