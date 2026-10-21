// Headless two-tab party through chapter 1's Deny Mines (js/ch1-mines.js on js/raid.js): one tab forms a party, the
// other finds it on the cave's list and joins, the leader adds two bots and starts, and both tabs play both floors to
// the end card (every fight won outright through the test hook, SD.test.raid.win). The tabs share a BroadcastChannel,
// the local transport of js/net.js. Fails on any page error or console error, or if either tab never finishes.
// Run from game/:  node tools/mines_party_check.js
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// One step on a tab: answer what's open (a question, a Policy Sort, a line of dialogue), else act in the mines.
function step(lead) {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null, click = el => { el.click(); return true; };
  if (window.__done) return 'done';
  if (!$('#dialog').hidden) { $('#dialog').click(); return 'dialog'; }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = b('#q-said'))) return click(x) && 'said';
    if ((x = b('#q-confirm, #q-next'))) return click(x) && 'next';
    if ((x = b('.ps-n'))) return click(x) && 'sort-guess';
    if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-one';
    const conf = b('.conf-b button');
    if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
    if (conf) return click(conf) && 'conf';
    if ((x = b('.primary'))) return click(x) && 'primary';
    return 'panel-wait';
  }
  const root = $('#run');
  let x;
  // The join screen: the first open party on the list.
  if ((x = root.querySelector('[data-code]'))) return click(x) && 'join';
  // The party room: Ready, or (the leader) two bots, then Start.
  if ((x = root.querySelector('#pt-ready:not([disabled])')) && x.getAttribute('aria-pressed') !== 'true') return click(x) && 'ready';
  const st = root.querySelector('#pt-start');
  if (st) {
    const mem = root.querySelectorAll('.pt-mem[data-peer]').length;
    if (mem < 2) return 'lobby-wait:guest';
    if (mem < 4 && (x = root.querySelector('#pt-bot:not([disabled])'))) return click(x) && 'bot';
    if (!st.disabled) return click(st) && 'start';
    return 'lobby-wait';
  }
  const rd = root.querySelector('.rd');
  const T = (SD.test || {}).raid;
  if (!rd || !T) return 'wait:' + root.textContent.replace(/\s+/g, ' ').slice(0, 160);
  if (window.__paced !== T) { window.__paced = T; T.pace(0.05); }
  if ((x = rd.querySelector('#rd-back'))) return click(x) && 'back';
  const G = T.G(), me = T.me(), ph = rd.dataset.ph;
  if (ph === 'fight') { if (T.hosting()) T.win(); return 'fight'; }
  if (ph === 'map') {
    if (G.votes[me]) return 'map-wait';
    const n = rd.querySelector('.node.can:not([disabled])');
    return n ? click(n) && 'node:' + n.className.split(' ')[1] : 'map-wait';
  }
  if ((x = rd.querySelector('#rd-ask'))) return click(x) && 'ask';
  const send = [...rd.querySelectorAll('[data-send]')].filter(b => !b.disabled && b.offsetParent !== null);
  for (const k of ['take', 'evote', 'wvote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
    const y = send.find(b => JSON.parse(b.dataset.send).k === k);
    if (y) return click(y) && 'room:' + k;
  }
  return 'room-wait:' + ph;
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const ctx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const errors = [];
  const open = async (name, lead, how) => {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await page.addInitScript(() => { window.SD_TEST = 1; });
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    // A save standing at the cave mouth with this lead; the mountain itself isn't loaded, so leaving it is a no-op.
    await page.evaluate(([lead, how]) => {
      const S = SD.state;
      S.save.c1 = { lead, f: {}, deck: SD.starterDeck.concat('adminaccess').map(id => ({ id, up: false })), pos: [16, 30] };
      SD.ch1m.enter = () => {};
      SD.ch1m.mines(how, () => { window.__done = 'won'; });
    }, [lead, how]);
    return page;
  };
  // SOLO=1: one tab, solo with three bots (the balance runs use this too).
  const SOLO = !!process.env.SOLO;
  const host = await open('host', 'kai', SOLO ? 'solo' : 'party');
  await host.waitForTimeout(800);
  const guest = SOLO ? null : await open('guest', 'dutch', 'join');
  const tabs = [[host, 'host']].concat(SOLO ? [] : [[guest, 'guest']]), last = { host: [], guest: [] }, done = SOLO ? { guest: true } : {};
  let steps = 0;
  for (; steps < 6000 && !(done.host && done.guest); steps++) {
    for (const [page, name] of tabs) {
      if (done[name]) continue;
      const what = await page.evaluate(step);
      last[name].push(what); if (last[name].length > 10) last[name].shift();
      if (what === 'done') done[name] = true;
    }
    await host.waitForTimeout(40);
  }
  const res = await Promise.all(tabs.map(([p]) => p.evaluate(() => { const T = (SD.test || {}).raid, G = T && T.G(); return { won: window.__done || null, champ: SD.champions.mine(), ph: G && G.ph, room: G && G.room && JSON.stringify(G.room).slice(0, 600) }; })));
  await browser.close(); server.close();
  console.log('steps', steps, JSON.stringify(res));
  if (!(done.host && done.guest)) errors.push('the party never finished; host: ' + last.host.join(' ') + ' | guest: ' + last.guest.join(' '));
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('OK: two tabs and two bots cleared the Deny Mines together, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
