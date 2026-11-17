// Headless check of the Fire Drill (js/mode-drill.js on js/drill-core.js and js/aws-sim-ops.js) at phone width
// (375px): the picker, no walkthrough, the map with two bosses, the warm-up run, the trace map and its grey nodes, a
// station's metrics and settings, a refused setting, observing, a look-alike, the fix, the postmortem on a plain exam
// screen, resume after a reload, an escalation, a whole night and night 2's forks.
// Short Fuse's visibility timeline is dragged by mouse, by touch and by the keyboard.
// Run from game/:  node tools/drill_check.js     SHOTS=dir saves screenshots (DSF=2 at twice the pixels).
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
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: +process.env.DSF || 1 });   // DSF=2 for sharp screenshots
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'drill-' + name + '.png'), fullPage: false }); };
  const boot = async () => {
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.click('#t-start');
    await page.waitForSelector('#today-card:not([hidden])');
    await page.evaluate(() => { if (SD.drillBoard) SD.drillBoard.STEP_MS = 5; if (SD.drillRoom) SD.drillRoom.STEP_MS = 5; });
  };
  // sel: the elements to measure (the zoomed room's camera pans past the edges on purpose, inside a clipped frame).
  const noHScroll = async (where, sel) => {
    const r = await page.evaluate(sel => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll(sel || '#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    }, sel);
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const st = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.drill)));
  const txt = sel => page.textContent(sel);
  // Answers the open question: right or wrong, with a confidence (as tools/pop_check.js does).
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

  // On a code desk (js/drill-code.js) a setting is an edit inside a block: open its block first.
  const place = async id => { await page.evaluate(id => { const s = SD.state.save.drill, at = SD.drill.CARDS[id].at; s.at = at; s.zoom = true;
    const i = SD.drillCode ? SD.drillCode.blockOf(s.drill.drill, at, id) : -1; s.blk = i >= 0 ? { k: at, d: s.drill.drill, i } : null;
    if (i < 0) { const m = document.querySelector('.dr-more'); if (m) m.open = true; }
    SD.state.persist(); SD.drillUi.draw(); const m2 = document.querySelector('.dr-more'); if (m2 && i < 0) m2.open = true; }, id); await page.click(`[data-card="${id}"]`); };
  // The Short Fuse's timeline: drag the window's edge to sec seconds, by mouse or (touch) by touch through CDP.
  // mid() runs while it's still held.
  let cdp = null;
  const dragVis = async (sec, mid, touch) => {
    await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; s.zoom = true; SD.drillUi.draw(); document.querySelector('.dr-vl-board').scrollIntoView({ block: 'center' }); });
    const g = await page.evaluate(() => { const ln = document.querySelector('.dr-vl-lanes').getBoundingClientRect(), h = document.querySelector('.dr-vl-h').getBoundingClientRect();
      return { l: ln.left, w: ln.width, y: ln.top + ln.height / 2, hx: h.left + h.width / 2, max: SD.drill.visLine(SD.state.save.drill.drill).max }; });
    const x = g.l + g.w * sec / g.max, steps = 8;
    if (touch) {
      cdp = cdp || await page.context().newCDPSession(page);
      const tp = (type, px) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: px, y: g.y }] });
      await tp('touchStart', g.hx);
      for (let i = 1; i <= steps; i++) await tp('touchMove', g.hx + (x - g.hx) * i / steps);
      if (mid) await mid();
      await tp('touchEnd');
    } else {
      await page.mouse.move(g.hx, g.y); await page.mouse.down();
      await page.mouse.move(x, g.y, { steps });
      if (mid) await mid();
      await page.mouse.up();
    }
    await page.waitForTimeout(40);
  };
  // A run plays out on the board (js/drill-board.js); the checks run it fast and wait for the result.
  const settle = () => page.waitForFunction(() => !document.querySelector('#panel .db.playing, #panel .rm.playing') && !document.querySelector('#dr-skip'), null, { timeout: 15000 });
  // Uptima's cutscenes (her lines): one tap each.
  const cut = async () => {   // tap through Uptima's lines; the last tap floats her back to her cloud first
    for (let i = 0; i < 4 && await page.$('#dr-cut-next:not([disabled])'); i++) { await page.click('#dr-cut-next:not([disabled])'); await page.waitForTimeout(60); }
    await page.waitForFunction(() => !document.querySelector('#dr-cut-next[disabled]'), null, { timeout: 5000 });
  };
  const deploy = async () => { await page.click('#dr-deploy'); await settle(); };
  const postmortem = async (right, conf, typing) => {
    await page.click('#dr-next');
    await page.click('#dr-ask');
    check(!!await page.$('#dr-cut-next .dr-cut-box, #dr-cut-next') && /Postmortem time/.test(await txt('#panel')), 'Uptima calls the postmortem in a cutscene');
    await cut();
    await page.waitForFunction(() => !!SD.modes.current() && document.querySelector('#panel [data-c]'));
    const plain = await page.evaluate(() => !document.querySelector('#panel .dr-trace, #panel .dr-pager, #panel .dr-station, #panel .db, #panel .db-chat, #panel .rm'));
    const qid = await answer(right, conf);
    await page.waitForSelector('#q-next', { timeout: 5000 }).catch(() => {});
    if (await page.$('#q-next')) await page.click('#q-next');
    if (typing) await typing();
    await page.waitForFunction(() => ['map', 'end'].includes(SD.state.save.drill.phase));
    await cut();
    return { qid, plain };
  };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { window.SD_NO_TYPING = 1; });   // the typing step has its own check
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('keep')) localStorage.clear(); } catch (e) { /* ignore */ } });
  await boot();
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  check(await page.evaluate(() => !!SD.modes.get('drill')), 'the Fire Drill is registered');
  check(await page.evaluate(() => typeof SD.awsSim.tick === 'function' && typeof SD.awsSim.kmsAllows === 'function'), 'the shared rules and the operations rules share one module');
  check(await page.evaluate(() => !!SD.raid && typeof SD.raid.play === 'function'), 'Multiplayer (the raid) is still there, untouched');
  await page.evaluate(() => SD.modes.open());
  check(/The Fire Drill/.test(await txt('#panel')) && /Host: Uptima/.test(await txt('[data-mode="drill"]')), 'the picker lists it, hosted by Uptima');
  await page.click('[data-mode="drill"]');
  check(/Behold, mortals/.test(await txt('#panel')) && !!await page.$('.dr-cut .up-fig'), 'Uptima opens the night in a cutscene, full size');
  await shot('cutscene');
  await cut();
  check(!/Step 1 of/.test(await txt('#panel')), 'no walkthrough screens: it opens on the map');
  check(/Night 1/.test(await txt('#panel')) && await page.$$eval('.dr-row', r => r.every(x => x.querySelectorAll('.dr-door').length === 1)), 'night 1 is one path');
  check(await page.$$eval('.dr-door.boss', x => x.length) === 2, 'two bosses on the map');
  await noHScroll('map'); await shot('map');

  // ---- Retry Storm: the warm-up shows the fault ----
  await page.click('.dr-door.reach'); await settle();
  let s = await st();
  check(s.phase === 'drill' && s.drill.drill === 'storm' && s.drill.log.length === 1, 'the first door opens Retry Storm with its warm-up run');
  let t = await txt('#panel');
  check(/Warm-up run/.test(t) && !await page.$('.rm-chat') && !!await page.$('.rm-col[data-col="gate"] .rm-pip.bad'), 'the warm-up run plays out, then a "!" bubble over Seo-yeon, with no text boxes under the room');
  check(await page.$$eval('.rm-st', x => x.length) === 4 && await page.$$eval('.rm-st.st-dark', x => x.length) === 3 && await page.$$eval('.rm-st.st-off', x => x.length) === 1, 'the room: Gate, Function and Store untraced (grey), the Queue off this path');
  check(!!await page.$('.rm-plate') && !!await page.$('.rm-up .up-fig') && await page.$$eval('.rm-g .db-pips i', x => x.length) > 0, 'the leads stand in the painted room, Uptima sits on the counter, and the Gate shows its token bucket');
  check(/bucket only refills/.test(t), 'the 429 is taught by its first use, in one line');
  await page.click('.rm-st[data-at="gate"]');
  check(await page.$$eval('.rm.zoom', x => x.length) === 1 && /4XXError/.test(await txt('.dr-tray')) && /Count/.test(await txt('.dr-tray')) && /429 Too Many Requests/.test(await txt('.dr-tray .dr-said')), 'tapping Seo-yeon pushes in on her: she tells you about the 429s, and her desk shows the Gate\'s real CloudWatch metrics');
  await shot('pushin');
  await page.click('#dr-back'); await page.waitForTimeout(700);
  await noHScroll('warm-up'); await shot('warmup');
  await page.click('.rm-st[data-at="fn"]');
  check(/The Function/.test(await txt('.dr-station')) && /ConcurrentExecutions/.test(await txt('.dr-station')), 'tapping a node opens that station\'s metrics and settings');
  // A refused setting teaches by refusal.
  await place('burst');
  check((await st()).drill.changes.length === 0 && /AWS won't take that one/.test(await txt('#panel')), 'raising the account burst is refused, and the refusal is the lesson');
  // Observe, then a look-alike: not contained, it costs budget.
  await place('gtrace'); await place('reserved');
  check(/2 changes/.test(await txt('#dr-deploy')), 'the deploy button counts the changes');
  await deploy();
  s = await st();
  check(s.drill.deploys === 1 && s.drill.state === 'read' && s.budget < 100, `a look-alike doesn't contain it, and the run costs budget (${s.budget}%)`);
  check(await page.$$eval('.rm-st[data-at="gate"]', x => x[0].classList.contains('st-throttle')), 'with stage tracing on, the Gate shows purple: Throttle 429');
  await shot('traced');
  await place('backoff');
  await deploy();
  s = await st();
  check(s.drill.state === 'contained' && /Contained/.test(await txt('.dr-stamp')), 'backoff and jitter contains it, and the board is stamped Contained');
  await noHScroll('contained'); await shot('contained');
  // Type it once (js/type-once.js), switched on for this one postmortem: the lead has you write the fix into the
  // runbook, its key setting blanked, two misses show it faintly, and it's asked only the first time.
  await page.evaluate(() => { SD.typeOnce.off = false; });
  const pm = await postmortem(true, 2, async () => {
    await page.waitForSelector('#panel .to-win .to-in', { timeout: 5000 });
    check(/THE RUNBOOK/.test(await txt('#panel .win-h')) && (await txt('#panel .to-line')).startsWith(' = standard# backoff') && await page.$eval('#panel .to-cmt', e => getComputedStyle(e).display === 'block' && e.getBoundingClientRect().top > document.querySelector('#panel .to-in').getBoundingClientRect().bottom - 1) && !/retry_mode/.test(await txt('#panel .to-line')), 'after the postmortem the lead has you type the fix\'s setting into the runbook, blanked in its line, its comment on its own row under it');
    await noHScroll('runbook'); await shot('runbook');
    for (const w of ['retry', 'retrymode']) { await page.fill('#panel .to-in', w); await page.click('#panel .to-card [type="submit"]'); }
    check(await page.getAttribute('#panel .to-in', 'placeholder') === 'retry_mode', 'two misses show it faintly to copy');
    await shot('runbook-faint');
    await page.fill('#panel .to-in', 'RETRY_MODE'); await page.click('#panel .to-card [type="submit"]');
    check(/Typed/.test(await txt('#panel .to-note')) && await page.evaluate(() => SD.typeOnce.learned('retry_mode')), 'typed (case ignored), it\'s marked in the save');
    await page.click('#panel [data-go]');
  });
  check(await page.evaluate(() => !!SD.typeOnce.learned('retry_mode') && !document.querySelector('#panel .to-win')), 'the night goes on after the runbook');
  await page.evaluate(() => { SD.typeOnce.off = true; });
  check(pm.plain, 'the postmortem is a plain exam screen: no map, pager or station while the stem is open');
  const okq = await page.evaluate(id => { const q = SD.exam.find(id); return SD.drill.DRILLS.storm.q.test([q.q].concat(q.opts || []).join(' ')); }, pm.qid);
  check(okq, 'the postmortem question is on the drill\'s cause');
  s = await st();
  check(s.phase === 'map' && s.row === 1 && s.done[0].state === 'contained', 'back on the map, one row up');

  // ---- Stop and resume ----
  await page.click('.dr-door.reach'); await settle();
  const before = await st();
  await page.click('#dr-stop');
  await page.evaluate(() => sessionStorage.setItem('keep', '1'));
  await boot();
  await page.evaluate(() => SD.modes.open());
  check(/Resume · Night 1/.test(await txt('[data-mode="drill"]')), 'the picker offers Resume');
  await page.click('[data-mode="drill"]');
  const after = await st();
  check(after.phase === 'drill' && after.drill.drill === before.drill.drill && after.budget === before.budget, 'resuming opens the same drill');

  // ---- The rest of the night: an escalation, then the intended fixes ----
  for (let i = 0; i < 3; i++) await deploy();
  s = await st();
  check(s.drill.state === 'escalated' && /What was broken/.test(await txt('#panel')), 'three deploys without the fix escalate, and the cause is revealed');
  await postmortem(false, 1);
  check((await page.evaluate(() => SD.state.save.drillKeep.carry.slice())).length >= 1, 'a missed postmortem carries a twin to next night');
  for (let guard = 0; guard < 6; guard++) {
    s = await st();
    if (s.phase === 'end' || s.phase === 'zero') break;
    await page.click('.dr-door.reach'); await settle();
    const id = (await st()).drill.drill;
    if (id === 'fuse') await dragVis(await page.evaluate(() => SD.drill.visLine(SD.state.save.drill.drill).six));   // its timeline, not a card
    else for (const c of await page.evaluate(id => SD.drill.DRILLS[id].fix[0], id)) await place(c);
    if (id === 'midnight') await shot('boss');
    await deploy();
    check((await st()).drill.state === 'contained', `${id}: the intended fix contains it on the first deploy`);
    await postmortem(true, 1);
  }
  await cut();
  s = await st();
  check(s.phase === 'end', `the night ends (${s.phase}, budget ${s.budget}%)`);
  const et = await txt('#panel');
  check(/Night 1:/.test(et) && /Why did that work\?/.test(et) && /Stop here/.test(et) && /How sure you were/.test(et), 'the end screen: the night, calibration, Pip\'s question and a clean stop');
  await noHScroll('end'); await shot('end');
  await page.click('#dr-done');
  await page.evaluate(() => SD.modes.open());
  await page.click('[data-mode="drill"]');
  await cut();
  check(/Night 2/.test(await txt('#panel')) && await page.$$eval('.dr-row', r => r.some(x => x.querySelectorAll('.dr-door').length >= 2)), 'night 2 opens with forks');

  // ---- Every drill has a verified bank question on its cause, for its postmortem ----
  const noQ = await page.evaluate(() => Object.keys(SD.drill.DRILLS).filter(id => { const d = SD.drill.DRILLS[id]; return !SD.modes.pick({ match: q => d.q.test([q.q].concat(q.opts || []).join(' ')), n: 1, verifiedOnly: true, mix: 0 }).items.length; }));
  check(!noQ.length, 'every drill has a verified postmortem question on its cause' + (noQ.length ? ': ' + noQ.join(', ') : ''));

  // ---- The release's settings show only where a release goes out (The Bad Canary) ----
  const open = async id => { await page.evaluate(id => { const s = SD.state.save.drill; SD.drill.startDrill(s, id, 7); s.at = 'fn'; s.zoom = true; s.cutAt = null; SD.state.persist(); SD.drillUi.draw(); }, id); await cut(); await settle(); await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'fn'; s.zoom = true; SD.drillUi.draw(); }); };
  await open('badge');
  check(!await page.$('[data-card="canary"]') && /dynamodb:Scan/.test(await txt('.dr-code')) && /AccessDeniedException/.test(await txt('.dr-tray .dr-said')), 'The Wrong Badge: AccessDenied in the pager, the role\'s settings at the Function, no release settings');
  await shot('badge'); await page.click('#dr-back'); await noHScroll('badge');
  await open('canary');
  check(!!await page.$('[data-card="canary"]') && !!await page.$('[data-card="hook"]') && /version 2/.test(await txt('#panel')), 'The Bad Canary: the deployment settings show at the Function, and Kai names version 2');
  await shot('canary'); await page.click('#dr-back'); await noHScroll('canary');
  await place('canary'); await place('alarm'); await deploy();
  check((await st()).drill.state === 'contained' && /rolled live back/.test(await txt('#panel')), 'a canary with an Errors alarm rolls back and contains it');

  // ---- The Locked Vault and The Stampede Stream ----
  await open('vault');
  check(/app\.py/.test(await txt('.dr-code')) && /get_secret_value/.test(await txt('.dr-code')) && !await page.$('[data-card="canary"]') && /password authentication failed/.test(await txt('.dr-tray .dr-said')), 'The Locked Vault: Kai reports the failed logins, and his desk shows the function\'s code');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('vault');
  await place('rotalt');
  check(/PostgreSQLMultiUser/.test(await txt('.dr-code')), 'Dutch\'s desk shows the rotation schedule, now alternating users');
  await deploy();
  check((await st()).drill.state === 'contained', 'alternating-users rotation contains The Locked Vault');
  await open('stampede');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; SD.drillUi.draw(); });
  check(/The Stream/.test(await txt('.dr-station')) && /Kinesis/.test(await txt('.dr-station')) && /Type: Kinesis/.test(await txt('.dr-code')) && !await page.$('[data-card="vis30"]') && /IteratorAge/.test(await txt('.dr-tray')), 'The Stampede Stream: Mira\'s desk is the stream, with the trigger\'s settings and no SQS ones');
  await shot('stream');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('stream');
  await place('bisect'); await place('retry2'); await place('onfail'); await deploy();
  check((await st()).drill.state === 'contained' && /orders-failed/.test(await txt('#panel')), 'bisect, 2 retries and an on-failure destination contain it, with the bad record in orders-failed');

  // ---- The Forged Pass and The Stale Shelf ----
  await open('pass');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'gate'; SD.drillUi.draw(); });
  check(!!await page.$('[data-card="authwild"]') && /403 Forbidden/.test(await txt('.dr-tray .dr-said')) && /401 Unauthorized/.test(await txt('.dr-tray .dr-said')), 'The Forged Pass: Seo-yeon tells 403s from 401s, and the authorizer settings are at her desk');
  await shot('pass');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('pass');
  await place('authwild'); await deploy();
  check((await st()).drill.state === 'contained', 'a whole-API authorizer policy contains The Forged Pass');
  await open('shelf');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'store'; SD.drillUi.draw(); });
  await place('gsiread');
  check((await st()).drill.changes.length === 0, 'a strongly consistent read on a global secondary index is refused');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('shelf');
  await place('consread'); await deploy();
  check((await st()).drill.state === 'contained', 'ConsistentRead contains The Stale Shelf');

  // ---- The Old Price (ElastiCache) and The Half Upload (S3 presigned URLs) ----
  await open('cache');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'store'; SD.drillUi.draw(); });
  check(/ElastiCache/.test(await txt('.dr-station')) && !!await page.$('[data-card="cachewt"]') && !!await page.$('[data-card="cttl60"]') && /CacheHits/.test(await txt('.dr-station')) && /old price/i.test(await txt('#panel')), 'The Old Price: Dutch\'s desk is the cache, with its strategy, TTL and CacheHits, and callers got old prices');
  await shot('cache');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('cache');
  await place('cachewt'); await deploy();
  check((await st()).drill.state !== 'contained' && /Evictions/.test(await txt('#panel')), 'write-through with no TTL churns the cache: evictions, not contained');
  await place('cttl60'); await deploy();
  check((await st()).drill.state === 'contained', 'write-through with a 60 s TTL contains The Old Price');
  await open('upload');
  check(/The Bucket/.test(await txt('#panel')) && !!await page.$('[data-card="demand"]') && /ExpiredToken/.test(await txt('#panel')) && /Request has expired/.test(await txt('#panel')), 'The Half Upload: both clocks show (URL expired, ExpiredToken), and the signing settings are at Kai\'s desk');
  await place('exp30d');
  check((await st()).drill.changes.length === 0, 'a 30-day presigned URL is refused (7 days is the most)');
  await place('single');
  check((await st()).drill.changes.length === 0, 'one PUT for an 8 GB video is refused (5 GB is the most)');
  await shot('upload');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('upload');
  await place('exp900'); await deploy();
  check((await st()).drill.state !== 'contained' && /ExpiredToken/.test(await txt('#panel')), 'a longer ExpiresIn still dies with the role\'s credentials');
  await place('demand'); await deploy();
  check((await st()).drill.state === 'contained', 'presigning each part as it\'s sent contains The Half Upload');

  // ---- The Quiet Subscriber and The Dropped Catch ----
  await open('quiet');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; SD.drillUi.draw(); });
  check(/The Topic/.test(await txt('.dr-station')) && /SNS/.test(await txt('.dr-station')) && /FilterPolicyScope: MessageAttributes/.test(await txt('.dr-code')) && !await page.$('[data-card="vis30"]') && /NoMessageAttributes/.test(await txt('.dr-tray')), 'The Quiet Subscriber: Mira\'s desk is the topic, with the filter settings, no SQS ones, and the NoMessageAttributes count');
  await shot('quiet');
  await place('rawon');
  check((await st()).drill.changes.length === 0, 'raw message delivery on a Lambda subscription is refused');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('quiet');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'gate'; s.zoom = true; SD.drillUi.draw(); });
  await place('snsattr'); await deploy();
  check((await st()).drill.state === 'contained', 'sending order_type as a message attribute contains The Quiet Subscriber');
  await open('catch');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; SD.drillUi.draw(); });
  check(/The Workflow/.test(await txt('.dr-station')) && /"Charge"/.test(await txt('.dr-code')) && /TooManyRequestsException/.test(await txt('.dr-tray')), 'The Dropped Catch: Mira\'s desk is the state machine, with its definition');
  await shot('catch');
  await place('catchfirst');
  check((await st()).drill.changes.length === 0, 'a States.ALL catcher ahead of others is refused');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('catch');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; s.zoom = true; SD.drillUi.draw(); });
  check(!!await page.$('.dr-code [data-blk]') && /orders\.asl\.json/.test(await txt('.dr-code')) && /"ReleaseStock"/.test(await txt('.dr-code')), 'The Dropped Catch: Mira\'s desk shows the state machine\'s definition');
  await page.click('.dr-code [data-blk="0"]');
  check(/Nothing to change/.test(await txt('.dr-code')), 'a block with no edits says so');
  await page.click('.dr-code [data-blk="1"]');
  check(!!await page.$('.dr-edit[data-card="catchrp"] .dr-dl-add') && /"ResultPath": "\$\.error"/.test(await txt('.dr-edit[data-card="catchrp"]')), 'opening Charge shows its edits as diffs, ResultPath included');
  await shot('code-catch');
  await place('rtrans'); await place('catchrp');
  check(/"Lambda\.TooManyRequestsException"/.test(await txt('.dr-code')) && /"ResultPath"/.test(await txt('.dr-code')), 'the edits show in the file');
  await deploy();
  check((await st()).drill.state === 'contained' && /ReleaseStock/.test(await txt('#panel')), 'retrying Lambda errors and catching CardDeclined with a ResultPath contains The Dropped Catch');

  // ---- The Shared Key and The Wrong Receipt ----
  await open('quota');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'gate'; SD.drillUi.draw(); });
  check(!!await page.$('[data-card="keysplit"]') && !await page.$('[data-card="ckey"]') && /QUOTA_EXCEEDED/.test(await txt('.dr-tray .dr-said')) && /app-key/.test(await txt('.dr-tray .dr-said')), 'The Shared Key: Seo-yeon reads QUOTA_EXCEEDED on one shared key, and the usage plan settings are at her desk');
  await shot('quota');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('quota');
  await place('keysplit'); await deploy();
  check((await st()).drill.state === 'contained', 'a key of its own for the partner contains The Shared Key');
  await open('receipt');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'gate'; SD.drillUi.draw(); });
  check(!!await page.$('[data-card="ckey"]') && !!await page.$('[data-card="gttl0"]') && !await page.$('[data-card="cachewt"]') && /someone else's orders/.test(await txt('.dr-tray .dr-said')) && /CacheHitCount/.test(await txt('.dr-tray')), 'The Wrong Receipt: Seo-yeon reports the wrong orders, her desk shows CacheHitCount and the stage cache settings (not ElastiCache\'s)');
  await shot('receipt');
  await page.click('#dr-back'); await page.waitForTimeout(700); await noHScroll('receipt');
  await place('ckey'); await deploy();
  check((await st()).drill.state === 'contained', 'customerId in the cache key contains The Wrong Receipt');

  // ---- Short Fuse: the visibility window is a timeline at the Queue (audit, Nov 17). Drag it short and the
  // messages pop back and the run isn't contained; past the work but short of 6x it still isn't (AWS's rule); past
  // 6x it holds. By mouse, by touch, and by the keyboard. ----
  await open('fuse');
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; s.zoom = true; SD.drillUi.draw(); });
  const L0 = await page.evaluate(() => SD.drill.visLine(SD.state.save.drill.drill));
  check(!!await page.$('.dr-vl .dr-vl-h[role="slider"]') && !await page.$('[data-card="vis30"]') && /^VisibilityTimeout: 30$/.test(await txt('.dr-vl .dr-cfg'))
    && await page.$$eval('.dr-vl-lane', x => x.length) === 3 && await page.$$eval('.dr-vl-lane.pop', x => x.length) === 3 && !!await page.$('.dr-vl-six'),
  'Short Fuse: the Queue shows the window over the Duration bars with a 6x mark, not the dial; at 30 s every message pops back');
  await noHScroll('short fuse timeline', '#panel .dr-tray *');
  await page.$eval('.dr-vl-board', e => e.scrollIntoView({ block: 'center' })); await shot('fuse-before');
  await dragVis(L0.work - 10, async () => {
    check(/^VisibilityTimeout: \d+$/.test(await txt('.dr-vl .dr-cfg')) && await page.$$eval('.dr-vl-lane.pop .dr-vl-pop', x => x.length === 3 && x.every(e => getComputedStyle(e).display !== 'none'))
      && (await st()).drill.changes.length === 0, 'mid-drag the setting rewrites live and each message pops back, before anything is saved');
    await shot('fuse-mid');
  });
  let fs1 = await st();
  check(fs1.drill.cfg.queue.vis === L0.work - 10 && fs1.drill.changes.join() === 'visline' && (await txt('.dr-vl .dr-cfg')) === `VisibilityTimeout: ${L0.work - 10}`, `letting go sets VisibilityTimeout ${L0.work - 10}, one change`);
  await deploy();
  fs1 = await st();
  check(fs1.drill.state === 'read' && fs1.drill.log[1].m.dupes > 0, `a window shorter than the ${L0.work} s work: messages come back and are written twice, not contained`);
  // Past the bars but short of 6x: nothing pops back, and it still isn't signed off.
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; s.zoom = true; SD.drillUi.draw(); });
  await dragVis(100);
  await dragVis(120);
  check((await st()).drill.changes.length === 1 && !await page.$('.dr-vl-lane.pop') && /short of 6x/.test(await txt('.dr-vl-say')), 'dragging twice in one deploy is still one change; past the bars nothing pops back, and the slate says it is short of 6x');
  await page.focus('.dr-vl-h'); await page.keyboard.press('ArrowRight');
  check((await st()).drill.cfg.queue.vis === 130 && /VisibilityTimeout: 130/.test(await txt('.dr-vl .dr-cfg')), 'the arrow keys move the window 10 s');
  await page.keyboard.press('ArrowLeft');
  await deploy();
  fs1 = await st();
  check(fs1.drill.state === 'read' && fs1.drill.log[2].m.dupes === 0 && /under 6x/.test(await txt('#panel')), 'VisibilityTimeout 120 stops the duplicates but is under 6x the 60 s timeout: not contained, and Mira says why');
  // Past 6x, by touch.
  await page.evaluate(() => { const s = SD.state.save.drill; s.at = 'queue'; s.zoom = true; SD.drillUi.draw(); });
  await dragVis(L0.six + 40, null, true);
  check((await st()).drill.cfg.queue.vis === L0.six + 40 && !await page.$('.dr-vl-lane.pop') && /At least 6x/.test(await txt('.dr-vl-say')), `a touch drag past the 6x mark sets VisibilityTimeout ${L0.six + 40}`);
  await noHScroll('short fuse past 6x', '#panel .dr-tray *'); await shot('fuse-after');
  await deploy();
  check((await st()).drill.state === 'contained', 'past 6x the function timeout contains Short Fuse');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll Fire Drill checks pass.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
