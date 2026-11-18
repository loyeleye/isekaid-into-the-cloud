// Headless check of Mira's Kitchen (js/mode-kitchen.js on js/kitchen-core.js) at phone width (375px): its title card
// with the Development line, the bench with the order, knobs and the card as code, a knob changing the code, firing,
// the plates (502s on the starting card, then served), Mira's first-use lines, the debrief on the plain exam screen with
// the stakes, stopping and resuming after a reload, and a whole night to the end screen.
// Run from game/:  node tools/kitchen_check.js     SHOTS=dir saves screenshots. W=1280 H=800 runs it at desktop width.
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
  const page = await browser.newPage({ viewport: { width: +(process.env.W || 375), height: +(process.env.H || 667) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'kitchen-' + name + '.png'), fullPage: false }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
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
    check(!r.length, `no horizontal scroll (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.kitchen)));
  const txt = sel => page.textContent(sel);
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
    return q.id;
  }, [right, conf]);
  const knob = (k, v) => page.click(`[data-k="${k}"][data-v='${JSON.stringify(v)}']`);
  const ask = async (right, conf) => {
    await page.click('#kt-ask');
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'), null, { timeout: 5000 });
    const qid = await answer(right, conf);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    await page.waitForFunction(() => ['bench', 'end'].includes(SD.state.save.kitchen.phase));
    return qid;
  };

  await page.clock.install({ time: new Date('2026-11-18T20:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  check(await page.evaluate(() => !!SD.modes.get('kitchen') && !!SD.kitchen), "Mira's Kitchen is registered and its rules load");
  const card = await page.evaluate(() => { const c = [...document.querySelectorAll('#title-actions .tg-card')].find(x => /Mira's Kitchen/.test(x.textContent)); return c ? c.textContent : ''; });
  check(/Development/.test(card) && !/Security|Deployment|Troubleshooting/.test(card), 'its title card says it asks Development only');
  await page.evaluate(() => SD.modes.open());
  check(/Host: Mira/.test(await txt('[data-mode="kitchen"]')), 'the picker lists it, hosted by Mira');
  await page.click('[data-mode="kitchen"]');

  // ---- The first order's bench ----
  let t = await txt('#panel');
  check(/Night 1/.test(t) && /Breakfast at the counter/.test(t) && /Bram/.test(t), 'it opens on the bench: night 1, the first order and Mira\'s welcome');
  check(await page.$$eval('.kt-route li', x => x.length) === 5, 'the night\'s five orders show as a route');
  check(/return dish;/.test(await txt('.kt-code')) && /openPantry/.test(await txt('.kt-code')), 'the card shows as code: the handler returns just the dish');
  check(await page.$$eval('.kt-knob', x => x.length) === 2, 'the first order opens two knobs');
  await noHScroll('bench'); await shot('bench');
  await page.click('#kt-fire');
  t = await txt('#panel');
  check((await st()).phase === 'plates' && await page.$$eval('.kt-plate.bad', x => x.length) === 6, 'firing the starting card: six bad plates');
  check(/502/.test(t) && /statusCode and a body/.test(t), 'every plate is a 502 and Mira says why, once');
  await noHScroll('plates'); await shot('502');
  await page.click('#kt-again');
  await knob('ret', 'proxy');
  check(/statusCode: 200/.test(await txt('.kt-code')) && !!(await page.$('.kt-ln.hot')), 'turning a knob rewrites that line of the code, highlighted');
  await page.click('#kt-fire');
  check(await page.$$eval('.kt-plate.warn', x => x.length) === 6, 'proxy shape, pantry opened inside: six late plates');
  check(/third star/i.test(await txt('#panel')), 'a 2-star firing says what the third star needs');
  await page.click('#kt-again');
  await knob('prep', 'outside');
  check(/once per cook/.test(await txt('.kt-code')), 'the pantry connection moves outside the handler');
  await page.click('#kt-fire');
  t = await txt('#panel');
  check(await page.$$eval('.kt-plate.good', x => x.length) === 5 && /cold start/.test(t), 'five served, one cold start, and Mira names it');
  check(!(await page.$('#kt-again')), 'no more firings after 3');
  await shot('served');
  await page.click('#kt-serve');
  check((await st()).phase === 'debrief' && (await st()).stars.breakfast === 3, 'served at 3 stars, on to the debrief');
  // ---- The debrief ----
  await page.click('#kt-ask');
  await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'));
  const q1 = await page.evaluate(() => SD.modes.current());
  check(q1.exam !== 'SAA' && (q1.dva || '').startsWith('1') && /Lambda/i.test(JSON.stringify(q1)), `the debrief is a Development Lambda question (${q1.id}, task ${q1.dva})`);
  check(!!(await page.$('#panel [data-c="2"]')) && /\+3/.test(await txt('#panel')), 'on the plain exam screen with the stakes');
  await shot('debrief');
  await answer(false, 1);
  await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
  if (await page.$('#q-next')) await page.click('#q-next');
  await page.waitForFunction(() => SD.state.save.kitchen.phase === 'bench');
  check((await st()).step === 1 && /The photo pantry/.test(await txt('#panel')), 'then the next order');
  check(await page.evaluate(() => (SD.state.save.kitchenKeep.carry || []).length === 1), 'a miss carries a twin to next night');

  // ---- Stop and resume ----
  await page.click('#kt-stop');
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await boot();
  await page.evaluate(() => SD.modes.open());
  check(/Resume · Night 1 · The photo pantry/.test(await txt('[data-mode="kitchen"]')), 'after a reload the picker offers Resume on the photo pantry');
  await page.click('[data-mode="kitchen"]');
  check(/The photo pantry/.test(await txt('#panel')) && await page.$$eval('.kt-knob', x => x.length) === 3, 'it resumes on the pantry\'s bench with its three knobs');

  // ---- The rest of the night on the taught recipes ----
  const PLAN = {
    pantry: [['mem', 1024], ['timeout', 10], ['dest', true]], kitchens: [['env', true]], banquet: [['pc', 'alias5']],
    rush: [['mem', 1024], ['timeout', 10], ['prep', 'outside'], ['ret', 'proxy'], ['dest', true], ['env', true], ['pc', 'alias5']]
  };
  for (const id of ['pantry', 'kitchens', 'banquet', 'rush']) {
    for (const [k, v] of PLAN[id]) await knob(k, v);
    await page.click('#kt-fire');
    const s = await st();
    check(s.stars[id] === 3, `${id}: the taught recipe gets 3 stars`);
    if (id === 'pantry') { check(!!(await page.$('.kt-plate.keep.stuck')), 'the corrupt photo is kept by the on-failure destination'); await shot('pantry'); }
    if (id === 'banquet') check(/standing by/.test(await txt('.kt-bill')), 'the bill counts the provisioned cooks standing by');
    if (id === 'rush') { await noHScroll('rush plates'); await shot('rush'); }
    await page.click('#kt-serve');
    await ask(true, 2);
  }
  t = await txt('#panel');
  check((await st()).phase === 'end' && /15\/15/.test(t), 'the end screen: 15 of 15 stars');
  check(/How sure you were/.test(t), 'with the calibration readout');
  await noHScroll('end'); await shot('end');
  await page.click('#kt-done');
  check((await st()).phase === 'done', 'Done closes the night');

  // ---- The banquet's refusal ----
  await page.evaluate(() => { const K = SD.kitchen, s = K.newNight({}); s.step = 3; s.cfg = K.cfg('banquet'); SD.state.save.kitchen = s; SD.kitchenUi.draw(); });
  await knob('pc', 'latest5');
  check(/\$LATEST/.test(await txt('.kt-conf')), 'provisioned concurrency on $LATEST shows in the config');
  await page.click('#kt-fire');
  check(/won't light/.test(await txt('#panel')) && /Publish a version/.test(await txt('#panel')), 'the stove won\'t light, and Mira says to publish a version and use an alias');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll kitchen page checks passed.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
