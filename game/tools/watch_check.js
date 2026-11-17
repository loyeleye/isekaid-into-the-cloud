// Headless check of the Night Watch (js/mode-watch.js on js/mode-drill.js and js/drill-core.js) at phone width (375px):
// it's registered with its own save, the picker and the title carousel list it under Security, Seo-yeon opens the
// night, night 1's five drills (three of its own, The Wrong Badge and the boss) each warm up with their fault, a desk
// shows the drill's dials, every fix contains it, every postmortem is a verified Domain 2 question, the end screen,
// and the Fire Drill's own save is untouched. Night 2 forks.
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
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => { if (el.closest('.rm-cam, .rm')) return; const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const settle = () => page.waitForFunction(() => !document.querySelector('#panel .db.playing, #panel .rm.playing') && !document.querySelector('#dr-skip'), null, { timeout: 15000 });
  const cut = async () => {
    for (let i = 0; i < 4 && await page.$('#dr-cut-next:not([disabled])'); i++) { await page.click('#dr-cut-next:not([disabled])'); await page.waitForTimeout(60); }
    await page.waitForFunction(() => !document.querySelector('#dr-cut-next[disabled]'), null, { timeout: 5000 });
  };
  const place = async id => { await page.evaluate(id => { const s = SD.state.save.watch, at = SD.drill.CARDS[id].at; s.at = at; s.zoom = true;
    const i = SD.drillCode ? SD.drillCode.blockOf(s.drill.drill, at, id) : -1; s.blk = i >= 0 ? { k: at, d: s.drill.drill, i } : null;
    SD.state.persist(); SD.watchUi.draw(); const m = document.querySelector('.dr-more'); if (m && i < 0) m.open = true; }, id); await page.click(`[data-card="${id}"]`); };
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
  await page.evaluate(() => { if (SD.drillBoard) SD.drillBoard.STEP_MS = 5; if (SD.drillRoom) SD.drillRoom.STEP_MS = 5; if (SD.typeOnce) SD.typeOnce.off = true;
    SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  check(await page.evaluate(() => !!SD.modes.get('watch') && !!SD.modes.get('drill') && SD.watchUi && SD.drillUi && SD.watchUi !== SD.drillUi), 'the Night Watch and the Fire Drill are both registered, each with its own screen');
  check(await page.evaluate(() => SD.modes.domainLine([2]) === 'Security'), 'its domain line reads Security');
  const card = await page.evaluate(() => { const c = document.querySelector('[data-game="watch"], [data-mode="watch"]'); return c ? c.textContent : ''; });
  check(/Night Watch/.test(card) && /Security/.test(card), `the title's carousel has its card, marked Security (${card.replace(/\s+/g, ' ').trim().slice(0, 80)})`);
  await page.evaluate(() => SD.modes.open());
  check(/Host: Seo-yeon/.test(await txt('[data-mode="watch"]')), 'the picker lists it, hosted by Seo-yeon');
  await page.click('[data-mode="watch"]');
  await page.waitForTimeout(200);
  check(await page.evaluate(() => document.body.dataset.stage === 'watch' && /Night Watch/i.test(document.querySelector('#ms-name').textContent)), 'it opens on its own stage, named in the top bar');
  check(/locked things/.test(await txt('#panel')), 'Uptima opens the night with the Night Watch\'s own line');
  await shot('cutscene');
  await cut();
  let t = await txt('#panel');
  check(/Night 1/.test(t) && /Possibly both/.test(t), 'the map opens on Night 1, with Seo-yeon\'s bell line');
  const rows = await page.$$eval('.dr-row', r => r.map(x => [...x.querySelectorAll('.dr-door')].map(d => d.dataset.drill)));
  check(rows.length === 5 && rows.every(r => r.length === 1) && rows[0][0] === 'night', `night 1 is one path of five, the boss on top (${rows.map(r => r.join('/')).join(' < ')})`);
  await noHScroll('map'); await shot('map');

  const night1 = ['cloak', 'badge', 'letter', 'lips', 'night'];
  const asked = [];
  for (const id of night1) {
    await page.click('.dr-door.reach'); await settle();
    let s = await st();
    check(s.phase === 'drill' && s.drill.drill === id && s.drill.log.length === 1 && !s.drill.log[0].ok, `${id}: the warm-up run shows the fault`);
    await cut().catch(() => {});
    if (['cloak', 'letter', 'lips'].includes(id)) { await noHScroll(id + ' warm-up'); await shot(id + '-warmup'); }
    const fix = await page.evaluate(id => SD.drill.DRILLS[id].fix[0], id);
    for (const c of fix) await place(c);
    if (id === 'letter') { await noHScroll('letter desk'); await shot('letter-desk'); }
    if (id === 'lips') { await shot('lips-desk'); }
    await page.click('#dr-deploy'); await settle();
    s = await st();
    check(s.drill.state === 'contained', `${id}: ${fix.join(' + ')} contains it on the first deploy`);
    if (id === 'cloak') await shot('cloak-contained');
    await page.click('#dr-next');
    if (id === 'cloak') { await noHScroll('debrief'); await shot('debrief'); }
    await page.click('#dr-ask');
    await cut();
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'));
    if (id === 'cloak') await shot('postmortem');
    const a = await answer(true, 1);
    asked.push(a);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForFunction(() => ['map', 'end'].includes(SD.state.save.watch.phase));
    await cut().catch(() => {});
  }
  check(asked.length === 5 && asked.every(a => a.dom === 2 && a.verified), `every postmortem was a verified Domain 2 question (${asked.map(a => a.id + ':' + a.dom).join(', ')})`);
  let s = await st();
  check(s.phase === 'end' && s.budget > 90, `the night ends with budget to spare (${s.budget}%)`);
  await cut().catch(() => {});
  t = await txt('#panel');
  check(/all drills closed/.test(t) && /5/.test(t), 'the end screen reports the night');
  await noHScroll('end'); await shot('end');
  check(await page.evaluate(() => !SD.state.save.drill && !!SD.state.save.watchKeep && SD.state.save.watchKeep.night === 1), 'the Fire Drill\'s save is untouched; the Night Watch keeps its own');
  await page.click('#dr-done');
  // Night 2 forks: two choices a row.
  await page.evaluate(() => SD.watchUi.start());
  await page.waitForTimeout(100); await cut();
  const rows2 = await page.$$eval('.dr-row', r => r.map(x => x.querySelectorAll('.dr-door').length));
  check(/Night 2/.test(await txt('#panel')) && rows2.slice(1).every(n => n === 2), `night 2 forks: two drills a row (${rows2.join(', ')})`);
  await shot('night2');
  // The Fire Drill still opens on its own night 1.
  await page.evaluate(() => { SD.ui.closePanel(); SD.drillUi.start(); });
  await page.waitForTimeout(100); await cut();
  check(await page.evaluate(() => SD.state.save.drill && SD.state.save.drill.night === 1) && await page.$$eval('.dr-door.boss', x => x.length) >= 1, 'the Fire Drill still starts its own night');

  check(!errors.length, `no page errors${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`);
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nall ok');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
