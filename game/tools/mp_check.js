// Headless check of Multiplayer (js/raid-finder.js): a save that has beaten chapter 1 and is on chapter 2 sees
// Multiplayer on the title, and the finder lists the Deny Mines and the Sorting Floors and nothing later. One tab hosts
// the Deny Mines from the finder, the other finds the party on the list and joins, the leader adds two bots and
// starts, and both tabs clear both floors (fights won through SD.test.raid.win). Each player gets the replay's XP and
// doubled Raid Marks (another person was in the party), no tape, and no story flag or chapter save changes. The Raid
// shop sells its cheapest item once, and the finder's shop button lists it as yours. Back leaves to the title. Fails on any page or console error.
// Run from game/:  node tools/mp_check.js
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
function step(who) {
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
  // The finder: the host hosts the Deny Mines, the guest joins the first open party on the list.
  if (root.querySelector('.mp')) {
    if (who === 'host' && (x = root.querySelector('[data-host="denymines"]'))) return click(x) && 'host';
    if (who === 'guest' && (x = root.querySelector('[data-join]'))) return click(x) && 'join';
    return 'finder-wait';
  }
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
  const G = T.G(), me = T.me(), ph = rd.dataset.ph;
  if (ph === 'done' || ph === 'over') { window.__done = ph; return 'done'; }
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
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2&demo`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const open = async (name, lead) => {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await page.addInitScript(() => { window.SD_TEST = 1; });
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.waitForSelector('#t-start', { timeout: 30000 });
    // Each tab is its own player: the tabs share localStorage, so the save lives in memory only.
    const before = await page.evaluate(lead => {
      const S = SD.state;
      S.persist = () => {};
      S.save.flags.prologue = true; S.save.flags.ch1 = true;
      S.save.c1 = { lead, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
      S.save.c2 = { f: { act1: true } };
      return { xp: S.save.xp, level: S.save.level, tapes: SD.tapes.count(), marks: SD.marks.balance(), story: JSON.stringify([S.save.flags, S.save.c1, S.save.c2, S.save.c3 || null]) };
    }, lead);
    await page.click('#t-start');
    await page.waitForSelector('#t-mp', { timeout: 10000 });
    const elig = await page.evaluate(() => SD.mp.eligible().map(c => c.ch + ':' + c.xps.map(x => x.id).join(',')).join(' '));
    if (elig !== '1:denymines 2:sortingfloors') errors.push(name + ': eligible expeditions were ' + elig);
    await page.click('#t-mp');
    await page.waitForSelector('.mp', { timeout: 10000 });
    const listed = await page.evaluate(() => [...document.querySelectorAll('[data-host]')].map(b => b.dataset.host).join(','));
    if (listed !== 'denymines,sortingfloors') errors.push(name + ': the finder listed ' + listed);
    return { page, before };
  };
  const host = await open('host', 'kai');
  const guest = await open('guest', 'dutch');
  const tabs = [[host.page, 'host'], [guest.page, 'guest']], last = { host: [], guest: [] }, done = {};
  let steps = 0;
  for (; steps < 6000 && !(done.host && done.guest); steps++) {
    for (const [page, name] of tabs) {
      if (done[name]) continue;
      const what = await page.evaluate(step, name);
      last[name].push(what); if (last[name].length > 10) last[name].shift();
      if (what === 'done') done[name] = true;
    }
    await host.page.waitForTimeout(40);
  }
  if (!(done.host && done.guest)) errors.push('the party never finished; host: ' + last.host.join(' ') + ' | guest: ' + last.guest.join(' '));
  for (const [t, name] of [[host, 'host'], [guest, 'guest']]) {
    await t.page.waitForTimeout(500);
    const r = await t.page.evaluate(() => { const S = SD.state, G = SD.test.raid.G(); return { ph: G.ph, xp: S.save.xp, level: S.save.level, tapes: SD.tapes.count(), marks: SD.marks.balance(), story: JSON.stringify([S.save.flags, S.save.c1, S.save.c2, S.save.c3 || null]) }; });
    console.log(name, JSON.stringify({ ph: r.ph, xp: [t.before.level, t.before.xp, '->', r.level, r.xp], tapes: [t.before.tapes, r.tapes], marks: [t.before.marks, r.marks] }));
    if (r.ph !== 'done') errors.push(name + ': the expedition ended ' + r.ph);
    const gained = r.level === t.before.level ? r.xp - t.before.xp : null;
    if (r.level === t.before.level && gained !== 40) errors.push(name + ': gained ' + gained + ' XP, not 40');
    if (r.tapes !== t.before.tapes) errors.push(name + ': tapes went ' + t.before.tapes + ' -> ' + r.tapes + '; a replay pays marks, not tapes');
    // Two people in the party: the clear's marks are doubled, so 2 x (10 + 2 per right answer, up to 5).
    const marks = r.marks - t.before.marks;
    if (!(marks >= 20 && marks <= 40 && marks % 4 === 0)) errors.push(name + ': got ' + marks + ' Raid Marks, not a doubled clear (20 to 40)');
    // The Raid shop: top up past the cheapest item, buy it once, and it's owned; the dearest stays out of reach.
    const shop = await t.page.evaluate(() => {
      const M = SD.marks, by = M.ITEMS.slice().sort((a, b) => a.cost - b.cost), lo = by[0], hi = by[by.length - 1];
      while (M.balance() < lo.cost + 10) M.pay({ right: 0 });
      const b = M.balance(), ok = M.buy(lo.id), again = M.buy(lo.id), poor = M.buy(hi.id);
      return { n: M.ITEMS.length, item: lo.id, cost: lo.cost, ok, again, poor, spent: b - M.balance(), owns: M.owns(lo.id) };
    });
    if (!shop.ok || shop.again || shop.spent !== shop.cost || !shop.owns || shop.poor) errors.push(name + ': the Raid shop went ' + JSON.stringify(shop));
    if (r.story !== t.before.story) errors.push(name + ': the story changed: ' + r.story);
    // Leave the party, then Back from the finder goes to the title.
    await t.page.click('#rd-leave');
    await t.page.waitForSelector('#mp-back', { timeout: 10000 });
    await t.page.click('#mp-shop');
    await t.page.waitForSelector('#panel [data-buy]', { timeout: 10000 });
    const row = await t.page.evaluate(id => { const li = [...document.querySelectorAll('#panel .mp-list li')], i = SD.marks.ITEMS.findIndex(x => x.id === id); return { n: li.length, yours: !!li[i] && li[i].textContent.includes('yours') }; }, shop.item);
    if (row.n !== shop.n || !row.yours) errors.push(name + ': the Raid shop panel showed ' + JSON.stringify(row));
    await t.page.evaluate(() => SD.ui.closePanel());
    await t.page.click('#mp-back');
    await t.page.waitForSelector('#t-mp', { timeout: 10000 });
  }
  await browser.close(); server.close();
  console.log('steps', steps);
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log('OK: two players found each other in Multiplayer, replayed the Deny Mines with two bots, and got 40 XP and doubled Raid Marks each, bought from the Raid shop, and left the story untouched.');
})().catch(e => { console.error(e); process.exit(1); });
