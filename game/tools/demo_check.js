// Headless check of the combined demo's Debug menu (index.html?vector&ch2&demo, js/demo-select.js): the title has New
// game, the 🐞 Debug button and the demo foot line, the menu lists every loaded chapter, and Start on each one opens
// that chapter on a fresh save with no page or console errors. Erasing the save mid-chapter and starting again still
// walks. Then the title offers Continue for the chapter played, and watching the Chapter 1 reveal from the menu's
// cutscene viewer (every cutscene's own check is tools/reel_check.js) plays
// it through and leaves the save as it was.
// Run from game/:  node tools/demo_check.js   SHOTS=dir saves a screenshot per chapter. Phone viewport (390 x 844).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.css': 'text/css', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fail = [];

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch2&demo`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await page.addInitScript(() => { window.SD_TEST = 1; });
  let errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext|ERR_/.test(m.text())) errors.push('console: ' + m.text()); });
  const vis = sel => page.evaluate(s => { const el = document.querySelector(s); return !!(el && !el.hidden && el.offsetParent !== null); }, sel);
  const toTitle = async () => {
    await page.goto(url);
    await page.waitForSelector('#t-start, #ds-new', { timeout: 30000 });
    if (await page.$('#t-start')) await page.click('#t-start');
    await page.waitForSelector('#ds-new', { timeout: 10000 });
  };

  await toTitle();
  const foot = await page.evaluate(() => (document.querySelector('.t-foot') || {}).textContent || '');
  if (foot !== 'Built on the AWS documentation · Saves automatically') fail.push('title foot line: ' + foot);
  if (await vis('#ds-go')) fail.push('Continue shown with no save');
  if (!(await vis('#t-help'))) fail.push('How to play missing from the title');
  if (!(await page.evaluate(() => { const b = document.querySelector('#ds-dbg'); return !!b && getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().width > 0; }))) fail.push('no Debug button on the title');
  const dbgH = await page.evaluate(() => document.querySelector('#ds-dbg').offsetHeight);
  if (dbgH < 44) fail.push('Debug button ' + dbgH + 'px tall');
  await page.click('#ds-dbg');
  const rows = await page.evaluate(() => [...document.querySelectorAll('.ds-row [data-how="fresh"]')].map(b => b.dataset.go));
  console.log('chapters listed:', rows.join(' '));
  for (const n of ['1', '2', '3', '4', '5', '6']) if (!rows.includes(n)) fail.push('chapter ' + n + ' not listed');
  const small = await page.evaluate(() => [...document.querySelectorAll('.ds-row button')].filter(b => b.offsetHeight < 44).map(b => b.textContent + ' ' + b.offsetHeight));
  console.log('small:', small);
  if (small.length) fail.push(small.length + ' chapter select buttons under 44px tall');

  // What's on screen: the visible screen, the panel's title, whether a scene is playing.
  const look = () => page.evaluate(() => {
    const shown = el => !!el && !el.hidden && getComputedStyle(el).display !== 'none';
    const p = document.querySelector('#panel');
    return { screen: [...document.querySelectorAll('[id^=screen-]')].filter(shown).map(e => e.id).join(','),
      panel: shown(p) ? ((p.querySelector('h2, .panel-title, .p-title') || p).textContent || '').trim().slice(0, 40) : '',
      lead: !!(shown(p) && p.querySelector('[data-lead]')), vn: shown(document.querySelector('#vn')) };
  });
  for (const n of rows) {
    if (n !== rows[0]) { await toTitle(); await page.click('#ds-dbg'); }
    errors = [];
    await page.click(`.ds-row [data-go="${n}"][data-how="fresh"]`);
    if (await page.$('#ds-y')) await page.click('#ds-y');
    // Off the lead cards, which lift on hover: a pointer resting on an edge makes one bob and never settle.
    await page.mouse.move(0, 0);
    // Every chapter's fresh start asks whose story it is (chapter 1's after its opening scene).
    let st, picked = false;
    for (let i = 0; i < 40 && !picked; i++) {
      await page.waitForTimeout(250);
      st = await look();
      if (st.lead) { await page.click('#panel [data-lead="mira"]'); picked = true; }
      else if (st.vn) await page.keyboard.press('Space');
    }
    // Chapter 1 opens on its scene of the files (vector_check plays it through); that it plays is enough here.
    if (!picked && !(n === '1' && st.vn)) fail.push('chapter ' + n + ': no lead picker after Start ' + JSON.stringify(st));
    await page.waitForTimeout(2500);
    st = await look();
    const key = { '1': 'c1', '2': 'c2', '2b': 'c2x', '3': 'c3', '4': 'c4', '5': 'c5', '6': 'c6' }[n];
    const sv = await page.evaluate(k => { const s = SD.state.save; return { lead: s.c1 && s.c1.lead, has: !!s[k], level: s.level }; }, key);
    if (st.screen === 'screen-title' && !st.vn) fail.push('chapter ' + n + ': still on the title after picking a lead');
    if (picked && sv.lead !== 'mira') fail.push('chapter ' + n + ': lead not saved');
    if (errors.length) fail.push('chapter ' + n + ': ' + errors.slice(0, 3).join(' | '));
    console.log('chapter', n, '→', JSON.stringify(st), JSON.stringify(sv));
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'demo-ch' + n + '.png') });
  }

  // Erase the save from the menu in the middle of chapter 2, then start it again from the chapter select: the walk
  // must still answer the arrow keys (the old scene used to keep running underneath and hold the controls).
  const walk = async label => {
    // The opening cutscenes cross-fade between pixel stills, so give them up to 30 s to reach the walk.
    for (let i = 0; i < 120; i++) {
      await page.waitForTimeout(250);
      const st = await look();
      if (st.lead) await page.click('#panel [data-lead="kai"]');
      else if (st.vn) await page.keyboard.press('Space');
      else if (await page.evaluate(() => !!(SD.c2world.debug.pos() && !SD.c2world.debug.busy()))) break;
    }
    const at = () => page.evaluate(() => SD.c2world.debug.pos().slice(0, 2).join(','));
    const a = await at();
    await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
    const b = await at();
    if (a === b) fail.push(label + ': the arrow keys did not move the lead (' + a + ')');
    console.log(label + ': walked ' + a + ' → ' + b);
  };
  await toTitle(); await page.click('#ds-dbg');
  errors = [];
  await page.click('.ds-row [data-go="2"][data-how="fresh"]');
  if (await page.$('#ds-y')) await page.click('#ds-y');
  await walk('chapter 2');
  await page.click('#w-menu'); await page.click('#m-reset'); await page.click('#r-y');
  await page.waitForSelector('#t-start, #ds-new');
  if (await page.$('#t-start')) await page.click('#t-start');
  await page.click('#ds-dbg');
  await page.click('.ds-row [data-go="2"][data-how="fresh"]');
  if (await page.$('#ds-y')) await page.click('#ds-y');
  await walk('chapter 2 after Erase save');
  if (errors.length) fail.push('erase and restart: ' + errors.slice(0, 3).join(' | '));

  // The last chapter started has a save now, so the title offers Continue.
  await toTitle();
  if (!(await vis('#ds-go'))) fail.push('no Continue button after starting a chapter');
  else console.log('continue:', await page.textContent('#ds-go'));

  // The Debug menu's Raid Marks box sets the balance (whole numbers, never below 0).
  await page.click('#ds-dbg');
  if (!(await page.$('#ds-mk'))) fail.push('no Raid Marks box in the Debug Wardrobe section');
  else {
    await page.fill('#ds-mk', '5000'); await page.click('#ds-mk-set');
    const m1 = await page.evaluate(() => [SD.marks.balance(), document.querySelector('#ds-mk-n').textContent]);
    await page.fill('#ds-mk', '-3'); await page.press('#ds-mk', 'Enter');
    const m2 = await page.evaluate(() => SD.marks.balance());
    if (m1[0] !== 5000 || m1[1] !== '5000' || m2 !== 0) fail.push('Raid Marks box: ' + JSON.stringify([m1, m2]));
  }
  await page.evaluate(() => SD.ui.closePanel());

  // The Chapter 1 reveal from the Debug menu, as Dutch: it plays to the end and the save comes back as it was.
  const before = await page.evaluate(() => JSON.stringify(SD.state.save.c1 || null));
  await page.click('#ds-dbg');
  await page.click('#ds-reel');
  const watch = await page.evaluate(() => [...document.querySelectorAll('#panel [data-lead]')].map(b => b.dataset.lead));
  if (watch.length !== 4) fail.push('cutscenes: ' + watch.length + ' leads to watch as');
  await page.click('#panel [data-lead="dutch"]');
  await page.evaluate(() => { document.querySelector('.rv-ch[data-ch="1"]').open = true; });
  errors = [];
  await page.click('[data-play="1/reveal"]');
  const cgs = new Set();
  let back = false;
  for (let i = 0; i < 600 && !back; i++) {
    await page.waitForTimeout(150);
    const st = await page.evaluate(() => { const vn = document.querySelector('#vn'); return { vn: !!vn && !vn.hidden, cg: vn && vn.dataset.cg, ready: !!vn && vn.classList.contains('vn-ready'), title: !document.querySelector('#screen-title').hidden && !!document.querySelector('#rv-list'), watching: SD.demo.watching }; });
    if (st.cg) cgs.add(st.cg);
    if (st.ready) await page.keyboard.press('Space');
    back = !st.watching && !st.vn && st.title && cgs.size > 0;
  }
  console.log('reveal stills:', [...cgs].join(' '));
  if (!back) fail.push('watching the reveal did not come back to the cutscene viewer');
  for (const id of ['cut-reveal-dutch-w2', 'rv-R', 'cut-reveal-5b', 'rv-F', 'rv-I']) if (!cgs.has(id)) fail.push('the reveal never showed ' + id);
  const after = await page.evaluate(() => JSON.stringify(SD.state.save.c1 || null));
  if (before !== after) fail.push('watching the reveal changed the save: ' + before + ' → ' + after);
  if (errors.length) fail.push('the reveal: ' + errors.slice(0, 3).join(' | '));

  await browser.close(); server.close();
  if (fail.length) { console.log('FAIL:\n  ' + fail.join('\n  ')); process.exit(1); }
  console.log('OK: the demo title, chapter select and every chapter\'s fresh start work, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
