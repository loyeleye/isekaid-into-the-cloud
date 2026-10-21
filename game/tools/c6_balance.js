// Balance runs for chapter 6's expeditions (Ladi, Oct 21: measure each expedition's win rate with bots, tapes off).
// Each run is a solo party of four bots, your own seat included, played by js/raid.js's own bots, with the deck and
// Plot Devices a player would have at that point in the chapter (js/c6-world.js's deckFor). A clear is every floor with
// no wipe; a wipe sends the party back to the start of its floor (story mode, as with no tapes), so the run goes on and
// counts where it wiped. Prints the clear rate per expedition and the share of runs that got through each floor clean.
// Run from game/:  N=8 P=4 XP=r6stairs,r6relay,r6vault NODE_PATH=$(npm root -g) node tools/c6_balance.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const N = +process.env.N || 8, P = +process.env.P || 4, LEADS = ['mira', 'kai', 'seoyeon', 'dutch'];
const XPS = (process.env.XP || 'r6stairs,r6relay,r6vault').split(',');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
// What the player has learned by the time each expedition opens.
const STATE = {
  r6stairs: { x: {}, cards: ['r6-markdown', 'r6-failover'] },
  r6relay: { x: { heartbeat: 1, diary: 1 }, cards: ['r6-markdown', 'r6-failover', 'r6-stackset', 'r6-comply', 'r6-diary', 'r6-calc', 'r6-heartbeat', 'r6-gwend', 'r6-receipt', 'r6-crr'] }
};
STATE.r6vault = { x: Object.assign({}, STATE.r6relay.x), cards: STATE.r6relay.cards.concat('r6-copy', 'r6-vaultlock') };

function step() {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null;
  const T = (SD.test || {}).raid, G = T && T.G(), W = window.__bal = window.__bal || { wipes: [], last: -1, sla: [] };
  if (G && G.ph !== 'lobby') {
    if (!W.paced) { W.paced = 1; T.pace(0.05); }
    const me = G.players[T.me()];
    if (me && !me.bot) me.bot = true;
    if (W.last < 0) W.last = G.tapeN;
    if (G.tapeN > W.last) { W.wipes.push(G.fl); W.last = G.tapeN; }
    if (G.ph === 'map' && W.fl !== G.fl) { W.fl = G.fl; W.sla.push(G.sla); }
  }
  if (window.__done) return { done: true, won: window.__done === 'won', wipes: W.wipes, sla: W.sla.concat(G ? G.sla : 0) };
  if (W.wipes.length > 8) return { done: true, won: false, wipes: W.wipes, sla: W.sla };
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
  await page.evaluate(([lead, xp, st]) => {
    const S = SD.state;
    S.save.c1 = { lead, f: { done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
    if (S.save.level < 20) S.save.level = 20;
    S.save.c6 = { f: {}, w: { x: Object.assign({ cold: 1, arrive: 1, hinted: 1 }, st.x), pos: [40, 36], pages: [], cards: st.cards, miss: [] }, choice: null };
    SD.c6world.on = true;
    SD.c6world.debug.onAfter = (x, won) => { window.__done = won ? 'won' : 'lost'; return true; };
    SD.c6world.debug.expedition(xp);
  }, [lead, xp, STATE[xp]]);
  const t0 = Date.now();
  let r = {};
  while (!r.done && Date.now() - t0 < 20 * 60 * 1000) { r = await page.evaluate(step); if (!r.done) await page.waitForTimeout(60); }
  await ctx.close();
  return Object.assign({ xp, lead, secs: Math.round((Date.now() - t0) / 1000), errors }, r);
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch6`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const jobs = []; XPS.forEach(xp => { for (let i = 0; i < N; i++) jobs.push([xp, i]); });
  const out = [];
  let next = 0;
  await Promise.all(Array.from({ length: P }, async () => {
    while (next < jobs.length) {
      const [xp, i] = jobs[next++];
      const r = await run(browser, url, xp, i);
      out.push(r);
      console.log(`${xp} run ${i + 1}: ${r.lead}, ${r.done ? (r.wipes.length ? `${r.wipes.length} wipe(s) on floor ${r.wipes.map(f => f + 1).join(', ')}` : 'clean clear') : 'timed out'}, SLA at floor ends ${(r.sla || []).join('/')}, ${r.secs}s${r.errors.length ? ', errors: ' + r.errors.join('; ') : ''}`);
    }
  }));
  await browser.close(); server.close();
  for (const xp of XPS) {
    const rs = out.filter(r => r.xp === xp), n = rs.length, clean = rs.filter(r => r.done && r.won && !r.wipes.length).length;
    const nf = Math.max(1, ...rs.map(r => Math.max(0, (r.sla || []).length - 1)));
    const floors = Array.from({ length: nf }, (_, f) => rs.filter(r => !(r.wipes || []).includes(f)).length);
    console.log(`${xp}: ${clean}/${n} clean clears (${Math.round(clean / n * 100)}%). Runs with no wipe on floor 1..${nf}: ${floors.map(c => Math.round(c / n * 100) + '%').join(', ')}`);
  }
  if (out.some(r => r.errors.length || !r.done)) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
