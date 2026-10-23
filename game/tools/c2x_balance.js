// Balance runs for chapter 2, part 2's three expeditions (js/c2x-data.js), as tools/mines_balance.js does for the
// Deny Mines: each run is a solo party of four bots, your own seat included, played by js/raid.js's own bots (70% of
// questions right), with tapes off (tapes: 0, so a wipe regroups for free): a clear is every floor with no wipe, and a wipe is counted on its floor (story
// mode sends the party back to the start of the floor, so the run goes on). At the top of the stair the evidence is
// taken as found, each piece proved 70% of the time.
// Run from game/:  N=12 P=4 XP=deadletter,inqtower,greynovice NODE_PATH=$(npm root -g) node tools/c2x_balance.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const N = +process.env.N || 12, P = +process.env.P || 4, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
const XPS = (process.env.XP || 'deadletter,inqtower,greynovice').split(',');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

function step() {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null;
  const T = (SD.test || {}).raid, G = T && T.G(), W = window.__bal = window.__bal || { wipes: [], last: -1, fl: 0 };
  if (G && G.ph !== 'lobby') {
    if (W.T !== T) { W.T = T; T.pace(0.05); }
    const me = G.players[T.me()];
    if (me && !me.bot) me.bot = true;
    if (W.last < 0) W.last = G.tapeN;
    if (G.tapeN > W.last) { W.wipes.push(G.fl); W.last = G.tapeN; }
    W.fl = Math.max(W.fl, G.fl);
  }
  if (window.__done != null) return { done: true, won: window.__done, wipes: W.wipes, fl: W.fl };
  if (W.wipes.length > 8) return { done: true, won: false, wipes: W.wipes, fl: W.fl, gaveUp: true };
  if (!$('#dialog').hidden) { $('#dialog').click(); return {}; }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = b('#q-said'))) x.click();
    else if ((x = b('#q-confirm, #q-next'))) x.click();
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
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { window.SD_TEST = 1; });
  await page.goto(url);
  const lead = LEADS[i % 4];
  // ACC: how often the bots answer right (SD.raid.botAcc, default 0.7); DMG: every enemy's load (SD.raid.dmgX).
  await page.evaluate(([a, d]) => { if (a != null) SD.raid.botAcc = a; if (d != null) SD.raid.dmgX = d; }, [process.env.ACC != null ? +process.env.ACC : null, process.env.DMG != null ? +process.env.DMG : null]);
  await page.evaluate(([lead, xp]) => {
    const S = SD.state;
    S.save.c1 = { lead, f: { done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
    S.save.level = Math.max(S.save.level || 1, 6);
    S.save.c2x = { f: { start: true, f7: true, f13: true, reckon: true, ev1: true, ev2: true, ev3: true }, pos: null, letters: [], given: [], compass: true, choice: 'give' };
    const ask = SD.quiz.ask;
    SD.quiz.ask = (q, o) => (o && o.title === 'THE EVIDENCE' ? Promise.resolve({ ok: Math.random() < 0.7 }) : ask(q, o));
    SD.c2xworld.debug.raid(xp, 'solo', { tapes: 0 }).then(won => { window.__done = won; });
  }, [lead, xp]);
  const t0 = Date.now();
  let r = {};
  while (!r.done && Date.now() - t0 < 25 * 60 * 1000) { r = await page.evaluate(step); if (!r.done) await page.waitForTimeout(60); }
  await ctx.close();
  return Object.assign({ xp, lead, secs: Math.round((Date.now() - t0) / 1000), errors }, r);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2b`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const jobs = [];
  XPS.forEach(xp => { for (let i = 0; i < N; i++) jobs.push([xp, i]); });
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: P }, async () => {
    while (next < jobs.length) {
      const [xp, i] = jobs[next++];
      const r = await run(browser, url, xp, i);
      out.push(r);
      console.log(`${xp} run ${i + 1}: ${r.lead}, ${r.done ? (r.wipes.length ? `${r.wipes.length} wipe(s) on floor ${r.wipes.map(f => f + 1).join(', ')}` : 'clean clear') : 'timed out'}${r.won ? '' : ', not cleared'}, ${r.secs}s${r.errors.length ? ', errors: ' + r.errors.join('; ') : ''}`);
    }
  }));
  await browser.close(); server.close();
  XPS.forEach(xp => {
    const rs = out.filter(r => r.xp === xp), clean = rs.filter(r => r.done && r.won && !r.wipes.length).length;
    const floors = Math.max(1, ...rs.map(r => r.fl + 1));
    const per = Array.from({ length: floors }, (_, f) => `floor ${f + 1}: ${rs.filter(r => !(r.wipes || []).includes(f)).length}/${rs.length}`).join(', ');
    console.log(`\n${xp}: ${clean}/${rs.length} clean clears (${Math.round(clean / rs.length * 100)}%). Runs with no wipe on ${per}.`);
  });
  if (out.some(r => r.errors.length || !r.done)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
