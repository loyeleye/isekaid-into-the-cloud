// Headless check of the Night Watch's data and menu entry (js/watch-data.js) at phone width (375px): every night's
// slots hold together, each night has a verified Domain 2 question, the carousel marks it Security, and the menu's
// Night Watch opens the walkable mode (js/mode-watch-walk.js; the old text calendar was retired Nov 19). The walkable
// loop itself is played by tools/watch_walk_check.js.
// Run from game/:  node tools/watch_check.js     SHOTS=dir saves screenshots (DSF=2 at twice the pixels).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4' };
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
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: +process.env.DSF || 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'watch-' + name + '.png'), fullPage: false }); };
  const txt = sel => page.textContent(sel);
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };

  await page.clock.install({ time: new Date('2026-11-17T23:00:00') });
  await page.addInitScript(() => { window.SD_NO_TYPING = 1; });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => { if (SD.typeOnce) SD.typeOnce.off = true;
    SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // The data holds together: every night's slots exist, start on a real tile, and have a narrow fix.
  const data = await page.evaluate(() => { const W = SD.watchData, bad = [];
    W.NIGHTS.forEach(n => n.set.forEach(([id, t]) => { const s = W.SLOTS[id];
      if (!s) bad.push(n.id + ':' + id); else { if (!s.tiles[t]) bad.push(n.id + ':' + id + '=' + t); if (!Object.values(s.tiles).some(x => x.res === 'ok')) bad.push(id + ' has no ok tile'); if (!n.open.includes(s.room)) bad.push(n.id + ':' + id + ' in a dark room'); } }));
    const tasks = new Set(W.NIGHTS.flatMap(n => n.set.map(([id]) => W.SLOTS[id].task)));
    return { bad, tasks: [...tasks].sort(), n: W.NIGHTS.length };
  });
  check(!data.bad.length, `every night's slots are real, start on a real tile, have a narrow fix and sit in a lit room${data.bad.length ? ': ' + data.bad.join(', ') : ''}`);
  check(data.tasks.join() === '2.1,2.2,2.3' && data.n === 9, `nine nights cover tasks ${data.tasks.join(', ')}`);
  const qs = await page.evaluate(() => SD.watchData.NIGHTS.map(n => { const q = SD.watch.question(n); return q ? [n.id, SD.exam.domainOf(q), String(SD.exam.taskOf(q)), SD.topicDrill.isVerified(q)] : [n.id, 0]; }));
  check(qs.every(x => x[1] === 2 && x[3]), `every night has a verified Domain 2 debrief (${qs.map(x => x[0] + ':' + x[2]).join(', ')})`);

  check(await page.evaluate(() => SD.modes.domainLine([2]) === 'Security'), 'its domain line reads Security');
  const card = await page.evaluate(() => { const c = document.querySelector('[data-game="watch"], [data-mode="watch"]'); return c ? c.textContent : ''; });
  check(/Night Watch/.test(card) && /Security/.test(card), `the title's carousel has its card, marked Security`);
  await page.evaluate(() => SD.modes.open());
  check(/Host: Seo-yeon/.test(await txt('[data-mode="watch"]')), 'the picker lists it, hosted by Seo-yeon');
  check(await page.$$eval('[data-mode="watch-walk"]', b => b.length) === 0, 'the picker has no separate walkable preview');
  await page.click('[data-mode="watch"]');
  await page.waitForFunction(() => SD.watchWalk && SD.watchWalk.run, null, { timeout: 8000 }).catch(() => {});
  check(await page.evaluate(() => document.body.dataset.stage === 'watch' && !!(SD.watchWalk && SD.watchWalk.run)), 'it opens the walkable Night Watch on its own stage');
  check(await page.$$eval('.nw-moon', m => m.length) === 0, 'the old moon calendar is gone');
  await noHScroll('walkable start'); await shot('walk-start');
  check(await page.evaluate(() => !!(SD.state.save.watch3 && SD.state.save.watch3.v === 3)), 'it keeps its save in watch3');
  check(await page.evaluate(() => !SD.state.save.drill), 'the Fire Drill\'s save is untouched');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
