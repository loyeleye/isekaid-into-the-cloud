// Headless check and screenshots of claim 8, the Night Audit (rush.html?claim=audit), at desktop (1366x768) and
// phone (390x844) size. It pins a Night Order from the claim's own pick, taps every buy on (the tracer, pins, the EMF
// stamp, a tally, klaxons and their settings, the 1-second dial, the rule card, the lens and a query), winds the
// clock, reads the evidence on cards (a log line, a trace and its segments), goes down to the cellar to answer a
// review question and hire the intern, and plays the night to dawn. Checks for page errors, horizontal scroll, that
// the belt and the cards fit on screen, and saves screenshots.
// The night runs fast-forwarded between screenshots (the rules stepped in the page), with a stand-in player sending
// the porter to each fault a few seconds after it starts, so the night reaches its overlaps and its end.
// node tools/rush_check_audit.js [outDir]
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), OUT = process.argv[2] || '/tmp/rush-audit-shots';
fs.mkdirSync(OUT, { recursive: true });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.css': 'text/css', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const srv = http.createServer((q, r) => {
  const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r);
});
let fail = 0;
const bad = (...a) => { fail++; console.log('FAIL', ...a); };
const ok = (c, ...a) => { if (!c) bad(...a); };
const wait = ms => new Promise(r => setTimeout(r, ms));
const api = (pg, f, ...a) => pg.evaluate(([f, a]) => { const x = SD_RUSH.audit[f]; return typeof x === 'function' ? x(...a) : x; }, [f, a]);
async function tap(pg, f, ...a) { const p = await api(pg, f, ...a); await pg.mouse.click(p[0], p[1]); await wait(120); }
const card = pg => api(pg, 'card');
const slotOf = (pg, t) => pg.evaluate(t => (SD_RUSH.audit.room === 'down' ? ['intern'] : SD_RUSH.S.belt).indexOf(t), t);
async function tapSlot(pg, t) { const i = await slotOf(pg, t); if (i < 0) return false; await tap(pg, 'slot', i); return true; }
// Cards re-render as the night moves, so each click finds its button afresh.
async function clickCard(pg, sel) { const l = pg.locator('#aud.on ' + sel).first(); if (!(await l.count())) return false; try { await l.click({ timeout: 3000 }); } catch (e) { return false; } await wait(120); return true; }
// Fast-forward the night: the rules stepped in the page, and a stand-in player who sends the porter to each live
// fault once it's a few seconds old. until: stop early when it returns true.
const ff = (pg, secs, until, nobot) => pg.evaluate(([secs, until, nobot]) => {
  const R = SD.rushCore, A = SD.rushAudit, M = SD_RUSH.S; let t = 0;
  const stop = until ? new Function('M', 'A', 'return ' + until) : () => false;
  while (t < secs && !M.over) {
    R.step(M, 1 / 30); t += 1 / 30;
    if (!nobot) for (const f of A.live(M)) if (M.time - f.since > 5 && !f.transient) A.queueJob(M, f.station, f.kind === 'slow' ? 'oil' : 'patch', 'player');
    if (stop(M, A)) break;
  }
  return { time: M.time, live: A.live(M).length, over: M.over, spill: M.spill };
}, [secs, until || '', !!nobot]);
// Text size on the phone: every canvas fillText is logged with its size in CSS px (font px x the context's scale x
// the canvas's CSS-per-backing-pixel), and the card's DOM text and tap rows are measured. Nothing below MIN_PX.
const MIN_PX = 11, MIN_TAP = 40;
const TEXT_PROBE = () => {
  window.__txt = [];
  const P = CanvasRenderingContext2D.prototype;
  for (const fn of ['fillText', 'strokeText']) {
    const o = P[fn];
    P[fn] = function (t, ...a) {
      if (window.__txt && String(t).trim() && this.globalAlpha > 0.3) {
        const m = /(\d+(?:\.\d+)?)px/.exec(this.font), tr = this.getTransform(), c = this.canvas;
        const k = Math.hypot(tr.a, tr.b) * (c.clientWidth ? c.clientWidth / c.width : 1);
        if (m && c.clientWidth) window.__txt.push([+m[1] * k, String(t).slice(0, 40)]);
      }
      return o.call(this, t, ...a);
    };
  }
};
async function legible(pg, what) {
  await pg.evaluate(() => { window.__txt = []; }); await wait(300);
  const r = await pg.evaluate(([MIN_PX, MIN_TAP]) => {
    const small = {}; for (const [s, t] of window.__txt) if (s < MIN_PX - 0.25) small[t] = Math.min(small[t] || 99, Math.round(s * 10) / 10);
    const p = document.getElementById('aud'), dom = [], taps = [];
    if (p && p.classList.contains('on')) {
      for (const el of p.querySelectorAll('*')) {
        const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own || !el.offsetParent) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < MIN_PX - 0.25) dom.push(el.className + ':' + fs + ':' + el.textContent.trim().slice(0, 24));
      }
      for (const el of p.querySelectorAll('.ln, .seg, .opt, button, .b')) { const h = el.getBoundingClientRect().height; if (el.offsetParent && h < MIN_TAP - 0.5) taps.push(el.className + ':' + Math.round(h) + ':' + el.textContent.trim().slice(0, 20)); }
    }
    return { small, dom: dom.slice(0, 8), taps: taps.slice(0, 8) };
  }, [MIN_PX, MIN_TAP]);
  const sm = Object.entries(r.small);
  ok(!sm.length, what, 'canvas text under ' + MIN_PX + 'px', JSON.stringify(sm.slice(0, 12)));
  ok(!r.dom.length, what, 'card text under ' + MIN_PX + 'px', JSON.stringify(r.dom));
  ok(!r.taps.length, what, 'card rows under ' + MIN_TAP + 'px tall', JSON.stringify(r.taps));
}
async function shot(pg, name) { if (!/-(gauge-card|build)$/.test(name)) await api(pg, 'skipSay'); await wait(250); await pg.screenshot({ path: path.join(OUT, name + '.png') }); console.log('  shot', name); }
async function fits(pg, what) {
  if (/^phone/.test(what)) await legible(pg, what);
  const r = await pg.evaluate(() => {
    const b = SD_RUSH.audit.belt(), p = document.getElementById('aud'), pr = p && p.classList.contains('on') ? p.getBoundingClientRect() : null;
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, bx: b.x[0], br: b.right, pr: pr && { l: pr.left, r: pr.right, t: pr.top, b: pr.bottom }, ih: innerHeight };
  });
  ok(r.sw <= r.iw, what, 'horizontal scroll', r.sw, r.iw);
  ok(r.bx >= -1 && r.br <= r.iw + 1, what, 'belt off screen', r.bx, r.br, r.iw);
  if (r.pr) ok(r.pr.l >= 0 && r.pr.r <= r.iw + 1 && r.pr.t >= 0 && r.pr.b <= r.ih + 1, what, 'card off screen', JSON.stringify(r.pr));
}
async function run(browser, tag, vp) {
  console.log(tag, vp.width + 'x' + vp.height);
  const pg = await browser.newPage({ viewport: vp, deviceScaleFactor: 1 });
  if (tag === 'phone') await pg.addInitScript(TEXT_PROBE);
  const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push(m.text()); });
  await pg.goto(`http://localhost:${srv.address().port}/rush.html?claim=audit&seed=11${tag === 'phone' ? '&tall' : ''}`);
  await pg.waitForFunction(() => window.SD_RUSH && document.querySelector('#q.orders'));
  // The claim's own pick: Default sampling and One bell. Wide pins One bell; the phone pins Default sampling.
  const offered = await pg.evaluate(() => [...document.querySelectorAll('.no-card')].map(b => b.dataset.o).sort().join(','));
  ok(offered === 'composite,sampling', tag, 'orders offered', offered);
  await pg.click(`.no-card[data-o="${tag === 'phone' ? 'sampling' : 'composite'}"]`); await pg.click('.no-go'); await wait(300);
  ok(await pg.evaluate(() => !!SD_RUSH.S.audit), tag, 'not the audit');
  await fits(pg, tag + ' start');
  // The build. Coins for the check, so every buy can go on.
  await pg.evaluate(() => { SD_RUSH.S.coins = 30; });
  await tapSlot(pg, 'tracer'); ok(await pg.evaluate(() => SD_RUSH.S.audit.tracer), tag, 'tracer');
  await tapSlot(pg, 'pins'); ok(await pg.evaluate(() => SD_RUSH.S.audit.pins), tag, 'pins');
  await tapSlot(pg, 'stamp'); ok(await card(pg) === 'stamp', tag, 'stamp card'); await clickCard(pg, '[data-act="stamp:station"]');
  ok(await pg.evaluate(() => SD_RUSH.S.audit.stamp && SD_RUSH.S.audit.stamp.dim === 'station'), tag, 'stamp');
  await tapSlot(pg, 'tally'); await tap(pg, 'station', 'engine'); ok(await pg.evaluate(() => SD_RUSH.S.audit.tallies.includes('engine')), tag, 'tally');
  const gid = (src, st) => pg.evaluate(([src, st]) => SD_RUSH.S.audit.gauges.find(g => g.src === src && g.station === st).id, [src, st]);
  // A klaxon on the Engine tally's heartbeat, with missing data as breaching.
  await tapSlot(pg, 'alarm'); await tap(pg, 'gauge', await gid('tally', 'engine')); ok(await card(pg) === 'gauge', tag, 'gauge card after klaxon');
  await clickCard(pg, '[data-act$=":missing=breaching"]');
  ok(await pg.evaluate(() => { const a = SD_RUSH.S.audit.alarms[0]; return a && a.missing === 'breaching'; }), tag, 'klaxon missing data');
  await clickCard(pg, '[data-act$=":m=1"]'); await clickCard(pg, '[data-act$=":n=3"]'); await clickCard(pg, '[data-act$=":m=2"]');
  ok(await pg.evaluate(() => { const a = SD_RUSH.S.audit.alarms[0]; return a.m === 2 && a.n === 3; }), tag, 'klaxon M of N');
  await shot(pg, `${tag}-gauge-card`); await fits(pg, tag + ' gauge card');
  // A second klaxon from the gauge card, on the stamp's Engine gauge; then the 1-second dial on it.
  await clickCard(pg, '.x'); await tap(pg, 'gauge', await gid('stamp', 'engine')); await clickCard(pg, '[data-act^="addal:"]');
  ok(await pg.evaluate(() => SD_RUSH.S.audit.alarms.length === 2), tag, 'second klaxon');
  await clickCard(pg, '[data-act="buy:hires:g"]'); ok(await pg.evaluate(() => SD_RUSH.S.audit.gauges.some(g => g.hires)), tag, '1s dial');
  // The 1-second dial on a built-in gauge is refused.
  await clickCard(pg, '.x'); await tapSlot(pg, 'hires'); await tap(pg, 'gauge', await gid('builtin', 'desk'));
  ok(await pg.evaluate(() => !SD_RUSH.S.audit.gauges.find(g => g.src === 'builtin' && g.hires)), tag, 'hires on built-in should be refused');
  await clickCard(pg, '.x'); await pg.keyboard.press('Escape');
  if (tag !== 'phone') { // the rule card (not sold under Default sampling)
    await tapSlot(pg, 'rule'); ok(await card(pg) === 'rule', tag, 'rule card'); await clickCard(pg, '[data-act="rule:refund"]');
    ok(await pg.evaluate(() => SD_RUSH.S.audit.rule === 'refund'), tag, 'rule');
  } else ok(await slotOf(pg, 'rule') < 0, tag, 'rule card should be off the belt under Default sampling');
  await shot(pg, `${tag}-build`); await fits(pg, tag + ' build');
  // Wind the clock.
  await tap(pg, 'clock'); ok(await pg.evaluate(() => SD_RUSH.S.started), tag, 'clock did not start the night');
  // Dutch's intro has had its say: clear his queue so the later screenshots show the room, not his bubble.
  await api(pg, 'skipSay');
  // To the first overlap (two faults live) after 01:00.
  const r1 = await ff(pg, 130, 'M.time > 36 && A.live(M).length >= 2', true);
  ok(r1.live >= 2, tag, 'no overlap reached', JSON.stringify(r1));
  // The lens: a query, and a row read.
  await tapSlot(pg, 'lens'); ok(await card(pg) === 'lens', tag, 'lens card'); await clickCard(pg, '[data-act="q:errors"]');
  ok(await pg.evaluate(() => SD_RUSH.S.audit.queries === 1), tag, 'query');
  await clickCard(pg, '.x');
  await shot(pg, `${tag}-midnight-overlap`); await fits(pg, tag + ' mid-night');
  // Evidence: Mira's log, a line tapped; then a trace and one of its segments.
  await tap(pg, 'log', 'desk'); ok(await card(pg) === 'log', tag, 'log card');
  const line = (await pg.$('#aud .ln.err')) || (await pg.$('#aud .ln')); if (line) { await line.click(); await wait(150); }
  ok(!!(await pg.$('#aud .note')), tag, 'log line note'); await shot(pg, `${tag}-evidence-log`); await fits(pg, tag + ' log card');
  await clickCard(pg, '.x'); await tap(pg, 'board'); ok(await card(pg) === 'trace', tag, 'trace card');
  // A trace that reached Mira (it has her segments and her calls), a faulty one if there is one.
  const trId = await pg.evaluate(() => { const t = SD_RUSH.S.audit.traces.slice().reverse().filter(x => x.rows.length >= 4); return (t.find(x => x.rows.some(r => r.points)) || t[0] || {}).id; });
  const tr = (trId && await pg.$(`#aud .ln[data-act="tr:${trId}"]`)) || (await pg.$('#aud .ln')); if (tr) { await tr.click(); await wait(150); }
  const seg = (await pg.$$('#aud .seg')); if (seg.length) { await seg[Math.min(seg.length - 1, 3)].click(); await wait(150); }
  ok(seg.length >= 3, tag, 'trace segments', seg.length); await shot(pg, `${tag}-evidence-trace`); await fits(pg, tag + ' trace card');
  // A job from the evidence (or any): the porter's list.
  const jb = await pg.$('#aud .note [data-act^="job:"]'); if (jb) { await jb.click(); await wait(120); }
  await clickCard(pg, '.x');
  await tap(pg, 'jobs'); ok(await card(pg) === 'jobs', tag, 'jobs card'); await clickCard(pg, '.x');
  // Downstairs: a review question for a coin, and the intern.
  await tap(pg, 'door'); ok(await api(pg, 'room') === 'down', tag, 'cellar');
  await pg.evaluate(() => { SD_RUSH.S.audit.cellar.ready = 0; }); await wait(150);
  await tap(pg, 'pile'); ok(await card(pg) === 'ask', tag, 'review card');
  const c0 = await pg.evaluate(() => SD_RUSH.S.coins);
  await clickCard(pg, '.opt[data-i="0"]'); ok(await pg.evaluate(c0 => SD_RUSH.S.coins === c0 + 1, c0), tag, 'review answer paid');
  await shot(pg, `${tag}-review-room`); await fits(pg, tag + ' review card');
  await clickCard(pg, '[data-act="go"]');
  await tapSlot(pg, 'intern'); ok(await pg.evaluate(() => SD_RUSH.S.audit.cellar.intern), tag, 'intern');
  await pg.keyboard.press('Tab'); ok(await api(pg, 'room') === 'up', tag, 'Tab back up');
  // On to dawn.
  for (let i = 0; i < 30; i++) { const r = await ff(pg, 10); if (r.over) break; await wait(30); }
  await pg.waitForFunction(() => document.querySelector('#q.end'), null, { timeout: 8000 }).catch(() => bad(tag, 'no end strip'));
  await shot(pg, `${tag}-end`); await fits(pg, tag + ' end');
  const over = await pg.evaluate(() => SD_RUSH.S.over); console.log('  night ended:', over, 'lost', await pg.evaluate(() => SD_RUSH.S.spill));
  await pg.click('.end-go'); await wait(200); ok(await pg.evaluate(() => !!document.querySelector('#q.orders') || !!SD_RUSH.S.audit), tag, 'again');
  if (errs.length) bad(tag, 'page errors', errs.slice(0, 5).join(' | '));
  await pg.close();
}
srv.listen(0, async () => {
  const browser = await chromium.launch();
  try {
    await run(browser, 'wide', { width: 1366, height: 768 });
    await run(browser, 'phone', { width: 390, height: 844 });
  } catch (e) { bad('crash', e.stack || e); }
  await browser.close(); srv.close();
  console.log(fail ? `${fail} failed` : 'all good', '· screenshots in', OUT);
  process.exit(fail ? 1 : 0);
});
