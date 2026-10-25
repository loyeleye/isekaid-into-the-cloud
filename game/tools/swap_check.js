// Headless check of champion swaps in the party room (js/party.js, Ladi 2026-10-25): in a party where every champion
// is held, a player taps another player's champion to ask for a swap. The other page shows "<name> wants to swap with
// you. Play as <champion>?"; No thanks leaves both as they were, Swap trades the two, and the trade sticks. Then the
// leader adds two bots and, picking for one, taps the other bot's champion: the two bots trade. Last, the guest and then
// the leader tap a bot's champion, and each swaps with that bot at once. Fails on any page or
// console error.
// Run from game/:  node tools/swap_check.js [dialog.png]
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

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2&demo`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const errors = [];
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const open = async (name, lead) => {
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' pageerror: ' + e.stack));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push(name + ' console: ' + m.text()); });
    await page.addInitScript(() => { window.SD_TEST = 1; });
    await page.goto(url);
    await page.waitForSelector('#t-start', { timeout: 30000 });
    await page.evaluate(lead => {
      const S = SD.state;
      S.persist = () => {};
      S.save.flags.prologue = true; S.save.flags.ch1 = true;
      S.save.c1 = { lead, f: { intro: true, cart: true, brief: true, done: true }, deck: SD.starterDeck.map(id => ({ id, up: false })), pos: null };
      S.save.c2 = { f: { act1: true } };
    }, lead);
    await page.click('#t-start');
    await page.waitForSelector('#t-mp', { timeout: 10000 });
    await page.click('#t-mp');
    await page.waitForSelector('.mp', { timeout: 10000 });
    return page;
  };
  const host = await open('host', 'kai'), guest = await open('guest', 'dutch');
  await host.click('[data-host="denymines"]');
  await guest.waitForSelector('[data-join]', { timeout: 20000 }).catch(e => { console.error(errors.join('\n')); throw e; });
  await guest.click('[data-join]');
  const two = p => p.waitForFunction(() => document.querySelectorAll('.pt-mem[data-peer]').length === 2, null, { timeout: 20000 });
  await two(host); await two(guest);
  await host.waitForTimeout(1200);
  const mine = p => p.evaluate(() => { const b = document.querySelector('.pt-champ.sel'); return b && b.dataset.ch; });
  const seats = p => p.evaluate(() => [...document.querySelectorAll('.pt-mem[data-peer]')].map(m => (m.querySelector('b, input') || {}).value || m.querySelector('b').textContent).join(','));
  const h0 = await mine(host), g0 = await mine(guest);
  if (!h0 || !g0 || h0 === g0) errors.push('the two players should start on different champions: ' + h0 + ', ' + g0);
  const askFor = async () => {
    await guest.click(`.pt-champ[data-ch="${h0}"][data-swap]`);
    await host.waitForSelector('[data-swap-yes]', { timeout: 10000 });
  };
  // The ask is a dialog: titled, focused on its yes, and Escape is a no.
  await askFor();
  // node tools/swap_check.js <png>: a picture of the dialog on the leader's page.
  if (process.argv[2]) { await host.waitForTimeout(400); await host.screenshot({ path: process.argv[2] }); }
  const dlg = await host.evaluate(() => { const d = document.querySelector('.pt-sw[role="alertdialog"]'); return d && { modal: d.getAttribute('aria-modal'), title: d.querySelector('#pt-sw-h').textContent, focus: document.activeElement && document.activeElement.id, yes: d.querySelector('#pt-swap-yes').textContent, no: d.querySelector('#pt-swap-no').textContent }; });
  const names = await host.evaluate(([a, b]) => [SD.champions.get(a).name, SD.champions.get(b).name], [h0, g0]);
  if (!dlg || dlg.modal !== 'true' || dlg.title !== 'Swap champions?' || dlg.focus !== 'pt-swap-yes' || dlg.yes !== 'Play as ' + names[1] || dlg.no !== 'Keep ' + names[0]) errors.push('the swap dialog was ' + JSON.stringify(dlg));
  await host.keyboard.press('Tab');
  if (await host.evaluate(() => document.activeElement && document.activeElement.id) !== 'pt-swap-no') errors.push('Tab left the dialog');
  await host.keyboard.press('Escape');
  await guest.waitForFunction(() => /would rather keep/.test((document.querySelector('.pt-swap') || {}).textContent || ''), null, { timeout: 10000 });
  if (await host.$('.pt-sw') || await mine(host) !== h0 || await mine(guest) !== g0) errors.push('Escape should close the dialog and change nothing');
  // No thanks: nothing changes, and the asker hears so.
  await askFor();
  const prompt = await host.evaluate(() => document.querySelector('#pt-sw-d').textContent.replace(/\s+/g, ' ').trim());
  const gName = await guest.evaluate(() => document.querySelector('#pt-nick').value);
  const want = await host.evaluate(id => SD.champions.get(id).name, g0);
  if (!prompt.startsWith(`${gName} wants to swap with you. Play as ${want}?`)) errors.push('the swap prompt read: ' + prompt);
  await host.click('[data-swap-no]');
  await guest.waitForFunction(() => /would rather keep/.test((document.querySelector('.pt-swap') || {}).textContent || ''), null, { timeout: 10000 });
  if (await mine(host) !== h0 || await mine(guest) !== g0) errors.push('No thanks changed a champion');
  // Swap: both trade, and it sticks.
  await askFor();
  await host.click('[data-swap-yes]');
  await host.waitForTimeout(2500);
  const h1 = await mine(host), g1 = await mine(guest);
  if (h1 !== g0 || g1 !== h0) errors.push(`after Swap the host is ${h1} (want ${g0}) and the guest ${g1} (want ${h0})`);
  if (await host.$('[data-swap-yes]') || await guest.$('#pt-swap-x')) errors.push('a swap prompt stayed up after the swap');
  // Bots: the leader picks for one bot and taps the other's champion; they trade.
  for (let i = 0; i < 2; i++) { await host.click('#pt-bot'); await host.waitForTimeout(700); }
  const bots = () => host.evaluate(() => [...document.querySelectorAll('.pt-mem[data-peer]')].filter(m => m.querySelector('.pt-badge.bot')).map(m => ({ peer: m.dataset.peer, as: m.querySelector('.as').textContent })));
  const b0 = await bots();
  if (b0.length !== 2) errors.push('the leader should have two bots: ' + JSON.stringify(b0));
  else {
    await host.click(`[data-edit="${b0[0].peer}"]`);
    const other = await host.evaluate(as => { const n = as.replace(/^as /, ''); const c = SD.champions.list.find(x => x.name === n); return c && c.id; }, b0[1].as);
    await host.click(`.pt-champ[data-ch="${other}"]`);
    await host.waitForTimeout(1200);
    const b1 = await bots();
    const at = k => (b1.find(b => b.peer === k) || {}).as;
    if (at(b0[0].peer) !== b0[1].as || at(b0[1].peer) !== b0[0].as) errors.push('the bots did not trade: ' + JSON.stringify([b0, b1]));
  }
  if (await mine(host) !== g0 || await mine(guest) !== h0) errors.push('adding bots moved a player');
  // A player who taps a bot's champion swaps with that bot at once: first the guest, then the leader.
  const idOf = as => host.evaluate(as => { const n = as.replace(/^as /, ''); const c = SD.champions.list.find(x => x.name === n); return c && c.id; }, as);
  for (const [page, who] of [[guest, 'guest'], [host, 'leader']]) {
    const before = await bots(), was = await mine(page);
    if (before.length !== 2) break;
    const target = await idOf(before[0].as);
    await page.click(`.pt-champ[data-ch="${target}"]`);
    await host.waitForTimeout(1500);
    const after = await bots(), now = await mine(page), bot = after.find(b => b.peer === before[0].peer);
    if (now !== target || !bot || await idOf(bot.as) !== was) errors.push(`${who} tapped ${target} (a bot's): now ${now}, and the bot is ${bot && bot.as}, not ${was}`);
  }
  await browser.close(); server.close();
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: the guest asked for ${h0}; No thanks kept both, Swap traded them (host ${g0}, guest ${h0}), two bots traded when the leader picked for one, and the guest and the leader each swapped with a bot by tapping its champion.`);
})().catch(e => { console.error(String(e).split("\n")[0]); process.exit(1); });
