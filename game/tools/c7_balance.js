// Balance runs for chapter 7's climb (as chapter 6's: the win rate with bots, tapes off). Each run is a solo party of
// four bots, your own seat included, played by js/raid.js's own bots, with the deck a player has when the lift opens
// (js/c7-world.js's deckFor: the basket's gifts and the camp's lessons). The climb is rebuilt from the save as the
// world does it, so the scenario decides it: AS=all is the chapter 7 demo's own start (every band freed, one blessing
// left on Freya), AS=bare is every chapter played with no reckoning done (four blessings on her), and AS=none is a save
// no player can have, there only as a stress test (no band freed either: the floors at their worst). CHOICE=run adds Freya's backup floor. A clear is every floor with no wipe; a wipe sends the party back
// to the start of its floor (story mode), so the run goes on and counts where it wiped.
// Run from game/:  N=8 P=4 AS=all,bare CHOICE=least NODE_PATH=$(npm root -g) node tools/c7_balance.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const N = +process.env.N || 8, P = +process.env.P || 4, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
const XPS = (process.env.AS || 'all,bare').split(','), CHOICE = process.env.CHOICE || 'least';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
function step() {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null;
  const T = (SD.test || {}).raid, G = T && T.G(), W = window.__bal = window.__bal || { wipes: [], at: [], last: -1, sla: [] };
  if (G && G.ph !== 'lobby') {
    if (!W.paced) { W.paced = 1; T.pace(0.05); }
    const me = G.players[T.me()];
    if (me && !me.bot) me.bot = true;
    if (W.last < 0) W.last = G.tapeN;
    if (G.tapeN > W.last) { W.wipes.push(G.fl); W.at.push(W.foe); W.last = G.tapeN; }
    if (G.ph === 'fight' && G.foes && G.foes[0]) W.foe = G.foes.map(f => f.boss).join('+');
    if (G.ph === 'map' && W.fl !== G.fl) { W.fl = G.fl; W.sla.push(G.sla); }
  }
  if (window.__done) return { done: true, won: window.__done === 'won', wipes: W.wipes, at: W.at, foe: W.foe, sla: W.sla.concat(G ? G.sla : 0) };
  if (W.wipes.length > 8) return { done: true, won: false, wipes: W.wipes, at: W.at, foe: W.foe, sla: W.sla };
  const vn = $('#vn');
  if (vn && !vn.hidden) { const box = vn.querySelector('.vn-box'); if (box && !box.hidden) box.click(); return {}; }
  if (!$('#dialog').hidden) { $('#dialog').click(); return {}; }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = p.querySelector('#q-num')) && !x.value) { x.value = '1'; x.dispatchEvent(new Event('input', { bubbles: true })); }
    else if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The session issuer and the session name; recorded by default as management events.'; x.dispatchEvent(new Event('input', { bubbles: true })); }
    else if ((x = b('#q-said'))) x.click();
    else if ((x = b('#q-confirm, #q-next'))) x.click();
    else if ((x = p.querySelector('[data-d="root"]'))) x.click();
    else if ((x = b('#c7-k'))) x.click();
    else if ((x = b('.ps-n'))) x.click();
    else if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) x.querySelector('button').click();
    else if ((x = b('.conf-b button'))) x.click();
    else if ((x = b('.opts .opt:not(.on):not(.struck)'))) x.click();
    else if ((x = b('.primary'))) x.click();
    return {};
  }
  const back = $('#run #rd-back');
  if (back) back.click();
  return {};
}

async function run(browser, url, xp, i) {
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  const lead = LEADS[i % 4];
  await page.evaluate(([lead, as, choice]) => {
    const S = SD.state, s = S.save, rk = as === 'all', fr = as !== 'none';
    s.c1 = { lead, f: { done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
    if ((s.level || 1) < 24) s.level = 24;
    s.c2x = { f: { freed: fr, grey: rk } };
    s.c3 = { f: { done: fr }, w: { x: { reckard: rk } } };
    s.c4 = { f: { done: fr }, w: { x: { reckon: rk } } };
    s.c5 = { f: { done: fr }, w: { x: {} } };
    s.c6 = { f: { done: fr }, w: { x: { saved: true } }, choice };
    const W = SD.c7world, D = W.debug, gifts = D.giftsDue().map(g => g[1]);
    s.c7 = { f: {}, w: { x: { arrive: 1, hinted: 1, book: 1, whose: 1, uptima: 1, lift: 1 }, pos: [21, 7], cards: gifts.concat('r7-evalorder', 'r7-shared', 'r7-revoke'), miss: [], gifts: D.giftsDue().map(g => g[0]), pairs: [], from: 0 } };
    W.on = true;
    D.onAfter = won => { window.__done = won ? 'won' : 'lost'; return true; };
    D.expedition();
  }, [lead, xp, CHOICE]);
  const t0 = Date.now();
  let r = {};
  while (!r.done && Date.now() - t0 < 20 * 60 * 1000) { r = await page.evaluate(step); if (!r.done) await page.waitForTimeout(60); }
  await ctx.close();
  return Object.assign({ xp, lead, secs: Math.round((Date.now() - t0) / 1000), errors }, r);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch7`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const jobs = []; XPS.forEach(xp => { for (let i = 0; i < N; i++) jobs.push([xp, i]); });
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: P }, async () => {
    while (next < jobs.length) {
      const [xp, i] = jobs[next++];
      const r = await run(browser, url, xp, i);
      out.push(r);
      console.log(`${xp} run ${i + 1}: ${r.lead}, ${r.done ? `${r.wipes.length ? `${r.wipes.length} wipe(s) on floor ${r.wipes.map(f => f + 1).join(', ')}` : 'clean clear'}${r.wipes.length ? ' (to ' + r.at.join(', ') + ')' : ''}, ${r.won ? 'won' : 'lost, last to ' + r.foe}` : 'timed out'}, SLA at floor ends ${(r.sla || []).join('/')}, ${r.secs}s${r.errors.length ? ', errors: ' + r.errors.join('; ') : ''}`);
    }
  }));
  await browser.close(); server.close();
  for (const xp of XPS) {
    const rs = out.filter(r => r.xp === xp), n = rs.length, clean = rs.filter(r => r.done && r.won && !r.wipes.length).length;
    const nf = Math.max(1, ...rs.map(r => Math.max(0, (r.sla || []).length - 1)));
    const floors = Array.from({ length: nf }, (_, f) => rs.filter(r => !(r.wipes || []).includes(f)).length);
    console.log(`${xp} (${CHOICE}): ${clean}/${n} clean clears (${Math.round(clean / n * 100)}%), ${rs.filter(r => r.won).length}/${n} won with tapes. Runs with no wipe on floor 1..${nf}: ${floors.map(c => Math.round(c / n * 100) + '%').join(', ')}`);
  }
  if (out.some(r => r.errors.length || !r.done)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
