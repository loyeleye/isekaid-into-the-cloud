// Headless check of the Night Watch (js/mode-watch.js, js/watch-data.js) at phone width (375px), build step 1: it's
// registered with its own save and stage, the carousel marks it Security, the first-run walkthrough, the moon
// calendar, the day's gossip (with Mira at the camp) and the floor plan, each night's pins and tiles, the dawn report
// with candles and pay, and a verified Domain 2 debrief on the night's task statement. Plays every night: a perfect
// plan lights 3 candles; leaving the plan as it starts leaves breaches.
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
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.watch)));
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return { id: q.id, dom: SD.exam.domainOf(q), verified: SD.topicDrill.isVerified(q) };
  }, [right, conf]);

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
  await page.click('[data-mode="watch"]');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.body.dataset.stage === 'watch'), 'it opens on its own stage');
  for (let i = 0; i < 3; i++) { await page.click('#md-next'); await page.waitForTimeout(30); }
  check(await page.$$eval('.nw-moon', m => m.length) === 9 && await page.$$eval('.nw-moon.locked', m => m.length) === 8, 'the moon calendar shows nine nights, only the first open');
  await noHScroll('calendar'); await shot('calendar');

  const nights = await page.evaluate(() => SD.watchData.NIGHTS.map(n => ({ id: n.id, set: n.set.map(([id]) => [id, Object.keys(SD.watchData.SLOTS[id].tiles).find(k => SD.watchData.SLOTS[id].tiles[k].res === 'ok')]) })));
  for (let i = 0; i < nights.length; i++) {
    const n = nights[i];
    await page.click(`.nw-moon[data-n="${i}"]`);
    let t = await txt('#panel');
    if (i === 0) {
      check(/Mira:/.test(t) && /Tess the lamplighter:/.test(t), 'the day opens with the gossip, and Mira at the camp says where to start');
      check(await page.$$eval('.nw-room', r => r.length) === 13 && await page.$$eval('.nw-floor', f => f.length) === 4 && await page.$$eval('.nw-room.lit', r => r.length) === 3, 'the floor plan has thirteen rooms on four floors, three lit on night 1');
      await noHScroll('day'); await shot('day');
    }
    check(await page.$$eval('.nw-pin', p => p.length) === n.set.length, `${n.id}: one pin for each thing to set (${n.set.length})`);
    // Night 2 is left as it starts, to see breaches; every other night gets the narrow fix.
    if (i !== 1) for (const [slot, tile] of n.set) {
      await page.click(`.nw-pin[data-slot="${slot}"]`);
      if (i === 0) { await noHScroll('tray'); await shot('tray'); }
      await page.click(`.nw-tile[data-tile="${tile}"]`);
    }
    if (i === 3) { await noHScroll('day night 4'); await shot('day-4'); }
    await page.click('#nw-seal');
    t = await txt('#panel');
    const lit = await page.$$eval('.nw-c.on', c => c.length);
    if (i === 1) check(lit < 3 && /breach/.test(t), `${n.id}: the plan as it starts leaves breaches (${lit} candles)`);
    else check(lit === 3, `${n.id}: the narrow fixes light all three candles`);
    if (i === 0 || i === 1) { await noHScroll('dawn'); await shot(i ? 'dawn-breaches' : 'dawn'); }
    await page.click('#nw-q');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'));
    if (i === 0) await shot('question');
    await answer(true, 1);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForSelector('#nw-cal');
    if (i === 0) await shot('paid');
    await page.click('#nw-cal');
  }
  const s = await st();
  check(s.night === 8 && Object.keys(s.best).length === 9 && s.silver > 0 && s.missed.badge === 1, `the save keeps nights, candles, silver and the missed breaches (night ${s.night + 1}, ${s.silver} silver, missed ${JSON.stringify(s.missed)})`);
  await shot('calendar-end');
  check(await page.evaluate(() => !SD.state.save.drill), 'the Fire Drill\'s save is untouched');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
