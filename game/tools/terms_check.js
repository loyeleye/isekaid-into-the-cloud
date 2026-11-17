// Headless check of Terms I own (js/terms.js) and its card in the title's games carousel (js/title-games.js), at
// phone width (375px) and on a desktop (1280px):
//   - The card is in the carousel, before Multiplayer, and opens the page on the mode stage.
//   - A fresh save shows the empty state, pointing to the modes.
//   - A save with typed terms (S.save.typed / typedDue set directly): the count line, AWS spelling (from typedAs, an
//     older record's case, or the bank), groups by exam task with Other for an unmapped term, due terms first.
//   - Recalling a due term from the page (SD.typeOnce.ask) reschedules it through T.mark, and the page redraws.
//   - T.mark records the spelling it was passed (S.save.typedAs) without changing the schedule.
//   - The card picks up assets/video/cards/terms.webp and .mp4 once they exist (served here by a route).
//   - No horizontal scroll at 375px and 1280px; due terms are buttons a keyboard reaches.
// Run from game/:  node tools/terms_check.js     SHOTS=dir saves screenshots (deviceScaleFactor 2).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
const fails = [];
const check = (ok, what) => { if (!ok) fails.push(what); console.log((ok ? 'ok   ' : 'FAIL ') + what); };
const DAY = 864e5;

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const open = async (vp, route) => {
    const page = await browser.newPage({ viewport: vp, deviceScaleFactor: SHOTS ? 2 : 1 });
    page.errs = [];
    page.on('pageerror', e => page.errs.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) page.errs.push('console: ' + m.text()); });
    if (route) await route(page);
    await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
    await page.goto(url);
    await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
    await page.waitForFunction(() => window.SD && SD.main && document.querySelector('#t-start'), null, { timeout: 30000 });
    return page;
  };
  const noHScroll = async (page, where) => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win, #panel:not([hidden]) .win *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      const wb = document.querySelector('#panel:not([hidden]) .win-b');
      if (wb && wb.scrollWidth > wb.clientWidth + 1) bad.push('win-b scrolls sideways ' + wb.scrollWidth + '>' + wb.clientWidth);
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'terms-' + name + '.png') }); };

  // ---- The card, and a fresh save's empty state ----
  let page = await open({ width: 375, height: 740 });
  await page.click('#t-start');
  await page.waitForSelector('.tg-card', { timeout: 5000 }).catch(() => {});
  const games = await page.$$eval('.tg-card', cs => cs.map(c => c.dataset.game));
  check(games.includes('terms'), `the carousel has a Terms I own card (${games.join(', ')})`);
  const mp = games.indexOf('mp');
  check(mp < 0 || games.indexOf('terms') === mp - 1, 'it sits after the modes, just before Multiplayer');
  check(/Terms I own/.test(await page.textContent('.tg-card[data-game="terms"] .tg-name')) && /Every AWS term/.test(await page.textContent('.tg-card[data-game="terms"] .tg-meta')), 'the card has its name and a line for a fresh save');
  check(!!(await page.$('.tg-card[data-game="terms"] .tg-poster')), 'with no terms.webp yet, the card draws its own poster');
  // Scroll the carousel itself (scrollIntoView would also nudge the title sideways).
  await page.$eval('.tg-card[data-game="terms"]', c => { const t = c.closest('.tg-track'); t.scrollLeft = c.offsetLeft - t.querySelector('.tg-card').offsetLeft; });
  await page.waitForTimeout(400);
  await page.click('.tg-card[data-game="terms"] .tg-go');
  await page.waitForSelector('#panel .tm-win', { timeout: 3000 }).catch(() => {});
  check(!!(await page.$('#panel:not([hidden]) .tm-win')), 'the card opens the page');
  check(await page.evaluate(() => document.body.dataset.stage === 'terms' && !document.querySelector('#mode-bar').hidden && /Terms I own/.test(document.querySelector('#ms-name').textContent)), 'on the full-screen stage, with Home and its name in the bar');
  check(!!(await page.$('#panel .tm-empty')) && /No terms typed yet/.test(await page.textContent('#panel .tm-empty')) && /Fire Drill/.test(await page.textContent('#panel .tm-empty')), 'a fresh save shows the empty state, pointing to the modes');
  check(await page.evaluate(() => SD.state.save.lastGame) === 'terms', 'the card remembers it was opened last');
  await noHScroll(page, 'empty state, 375px');
  await shot(page, 'empty');
  await page.click('#tm-back');
  await page.waitForTimeout(700);
  check(await page.evaluate(() => document.querySelector('#panel').hidden && !document.body.classList.contains('in-mode')), 'Pick a game closes the page and the stage');

  // ---- A save with typed terms ----
  await page.evaluate(DAY => {
    const s = SD.state.save, now = Date.now();
    s.typed = { visibilitytimeout: now - 9 * DAY, 'kms:decrypt': now - 3 * DAY, reportbatchitemfailures: now - 2 * DAY, attribute_not_exists: now - DAY, after_sequence_number: now - 5 * DAY, zzqqwidget: now - DAY };
    s.typedDue = {
      visibilitytimeout: { n: 3, due: now + 7 * DAY + 1000 },
      'kms:decrypt': { n: 1, due: now - 1000 },            // due
      reportbatchitemfailures: { n: 1, due: now + 2 * DAY - 1000 },
      attribute_not_exists: { n: 0, due: now - 1000 },     // due
      after_sequence_number: { n: 2, due: now + 3 * DAY },
      zzqqwidget: { n: 0, due: now + DAY - 1000 }
    };
    s.typedAs = { 'kms:decrypt': 'kms:Decrypt' };
    s.renoKeep = { typed: { 'dynamodb:LeadingKeys': true } };   // an older record: typed, no time or schedule
    SD.state.persist();
  }, DAY);
  const sum = await page.evaluate(() => SD.terms.summary());
  check(sum.typed === 7 && sum.due === 2, `summary counts every typed term, older records too (due a day after this page first sees it), and the due ones (${JSON.stringify(sum)})`);
  await page.evaluate(() => SD.main.title());
  await page.waitForTimeout(500);
  check(/2 due/.test(await page.textContent('.tg-card[data-game="terms"] .tg-meta')) && /7 terms typed/.test(await page.textContent('.tg-card[data-game="terms"] .tg-meta')), 'the card says how many are typed and due: ' + (await page.textContent('.tg-card[data-game="terms"] .tg-meta')).trim());
  check(await page.$eval('.tg-card.on', c => c.dataset.game).catch(() => '') === 'terms', 'the title opens on the Terms I own card next time');
  await shot(page, 'card');
  await page.click('.tg-card[data-game="terms"] .tg-go');
  await page.waitForSelector('#panel .tm-row', { timeout: 3000 }).catch(() => {});
  const count = (await page.textContent('#panel .tm-count')).replace(/\s+/g, ' ').trim();
  check(count === '7 terms typed · 2 due', `the count at the top: "${count}"`);
  const rows = await page.$$eval('#panel .tm-row', rs => rs.map(r => ({ term: r.querySelector('.tm-term').textContent, due: r.classList.contains('tm-go'), btn: r.tagName === 'BUTTON', meta: r.querySelector('.tm-meta').textContent.replace(/\s+/g, ' ') })));
  const spells = rows.map(r => r.term);
  check(['kms:Decrypt', 'VisibilityTimeout', 'ReportBatchItemFailures', 'attribute_not_exists', 'AFTER_SEQUENCE_NUMBER', 'dynamodb:LeadingKeys', 'zzqqwidget'].every(t => spells.includes(t)),
    'AWS spelling: from typedAs, from an older record, from the bank, or as stored: ' + spells.join(', '));
  check(rows.filter(r => r.due).every(r => r.btn) && rows.filter(r => !r.due).every(r => !r.btn), 'due terms are buttons (keyboard reachable), the rest are plain rows');
  check(rows.find(r => r.term === 'kms:Decrypt').meta.includes('Due now') && /level 1/.test(rows.find(r => r.term === 'kms:Decrypt').meta), 'a due term says Due now and its recall level');
  check(/due in 7 days/.test(rows.find(r => r.term === 'VisibilityTimeout').meta) && /level 3/.test(rows.find(r => r.term === 'VisibilityTimeout').meta) && /Typed \w+ \d+/.test(rows.find(r => r.term === 'VisibilityTimeout').meta), 'a later term says its typed date, level and "due in 7 days": ' + rows.find(r => r.term === 'VisibilityTimeout').meta);
  check(/due in 1 day\b/.test(rows.find(r => r.term === 'zzqqwidget').meta), 'one day out says "due in 1 day"');
  const groups = await page.$$eval('#panel .tm-dom', ds => ds.map(d => ({ h: d.querySelector('h3').textContent, tasks: [...d.querySelectorAll('h4')].map(h => h.textContent.trim()), terms: [...d.querySelectorAll('.tm-term')].map(t => t.textContent), due: [...d.querySelectorAll('.tm-row')].map(r => r.classList.contains('tm-go')) })));
  check(groups.some(g => /^Domain \d · /.test(g.h)) && groups.some(g => g.tasks.some(t => /^\d\.\d /.test(t))), 'grouped by exam domain and task: ' + groups.map(g => g.h + ' [' + g.tasks.join('; ') + ']').join(' | '));
  const other = groups.find(g => g.h === 'Other');
  check(!!other && other.terms.includes('zzqqwidget') && groups[groups.length - 1] === other, 'a term no question mentions goes under Other, last');
  const where = t => groups.find(g => g.terms.includes(t));
  check(/^Domain 2/.test((where('kms:Decrypt') || {}).h || ''), 'kms:Decrypt maps to the Security domain: ' + ((where('kms:Decrypt') || {}).h || 'none'));
  const tasksDue = await page.$$eval('#panel .tm-list', ls => ls.map(l => [...l.querySelectorAll('.tm-row')].map(r => r.classList.contains('tm-go'))));
  const domDue = groups.map(g => g.due.includes(true)), heads = groups.map(g => g.h);
  check(rows[0].due && (domDue.indexOf(false) < 0 || domDue.lastIndexOf(true) < domDue.indexOf(false)) && new Set(heads).size === heads.length,
    'due terms first: the page starts with a due term, domains with a due term lead, each domain once');
  const taskOrder = await page.$$eval('#panel .tm-dom', ds => ds.every(d => { const t = [...d.querySelectorAll('.tm-list')].map(l => !!l.querySelector('.tm-go')); const f = t.indexOf(false); return f < 0 || t.slice(f).every(x => !x); }));
  check(taskOrder, 'inside each domain, tasks with a due term lead');
  check(tasksDue.every(d => { const f = d.indexOf(false); return f < 0 || d.slice(f).every(x => !x); }), 'inside each task, due terms come before the rest');
  check(await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('tm-go')), 'the first due term has focus when the page opens');
  await noHScroll(page, 'terms, 375px');
  await shot(page, 'page');
  if (SHOTS) {
    const h = await page.evaluate(() => { const b = document.querySelector('#panel .win-b'); return b.scrollHeight; });
    await page.setViewportSize({ width: 375, height: Math.min(2400, h + 160) });
    await page.waitForTimeout(200);
    await shot(page, 'page-full');
    await page.setViewportSize({ width: 375, height: 740 });
  }

  // ---- Recall a due term from the page ----
  const before = await page.evaluate(() => Object.assign({}, SD.state.save.typedDue['kms:decrypt']));
  await page.press('#panel .tm-go[data-term="kms:decrypt"]', 'Enter');
  await page.waitForSelector('#panel .to-in', { timeout: 3000 }).catch(() => {});
  check(/FROM MEMORY/.test(await page.textContent('#panel .win-h')) && !(await page.$('#panel .tm-w')), 'a due term opens the from-memory step over the page');
  const lineTxt = (await page.textContent('#panel .to-line')).trim();
  check(lineTxt.length > 0 && !/kms:Decrypt/.test(lineTxt), 'its line shows the context with the term blanked: ' + lineTxt.slice(0, 90));
  await shot(page, 'recall');
  await page.fill('#panel .to-in', 'kms:decrypt');
  await page.keyboard.press('Enter');
  await page.waitForSelector('#panel [data-go]', { timeout: 3000 }).catch(() => {});
  check(/Remembered\. It comes back in 4 days/.test(await page.textContent('#panel .to-note')), 'a clean recall says when it comes back: ' + (await page.textContent('#panel .to-note')).trim());
  await page.click('#panel [data-go]');
  await page.waitForSelector('#panel .tm-w', { timeout: 3000 }).catch(() => {});
  const after = await page.evaluate(() => SD.state.save.typedDue['kms:decrypt']);
  check(after.n === before.n + 1 && Math.round((after.due - Date.now()) / DAY) === 4, `recalling it reschedules it through T.mark (level ${before.n} → ${after.n}, due in ${Math.round((after.due - Date.now()) / DAY)} days)`);
  const count2 = (await page.textContent('#panel .tm-count')).replace(/\s+/g, ' ').trim();
  check(count2 === '7 terms typed · 1 due', `the page redraws with the new count: "${count2}"`);
  const k2 = await page.$eval('#panel .tm-row[data-term="kms:decrypt"]', r => [r.tagName, r.textContent.replace(/\s+/g, ' ')]).catch(() => ['', '']);
  check(k2[0] === 'DIV' && /due in 4 days/.test(k2[1]) && /level 2/.test(k2[1]), 'the recalled term is no longer due: ' + k2[1]);
  check(await page.evaluate(() => SD.state.save.typedAs['kms:decrypt'] === 'kms:Decrypt'), 'its spelling is kept');
  check(await page.evaluate(() => document.body.dataset.stage === 'terms'), 'still on the stage after the recall');
  // Two misses show it faintly, then it starts over at a day.
  await page.press('#panel .tm-go[data-term="attribute_not_exists"]', 'Enter');
  await page.waitForSelector('#panel .to-in', { timeout: 3000 }).catch(() => {});
  for (const v of ['attr_not', 'attribute_exists']) { await page.fill('#panel .to-in', v); await page.keyboard.press('Enter'); await page.waitForTimeout(80); }
  check(await page.$eval('#panel .to-in', i => i.placeholder === 'attribute_not_exists' && i.classList.contains('faint')), 'two misses show it faintly');
  await page.fill('#panel .to-in', 'attribute_not_exists'); await page.keyboard.press('Enter');
  await page.waitForSelector('#panel [data-go]', { timeout: 3000 }).catch(() => {});
  await page.click('#panel [data-go]');
  await page.waitForTimeout(200);
  const an = await page.evaluate(() => SD.state.save.typedDue.attribute_not_exists);
  check(an.n === 0 && Math.round((an.due - Date.now()) / DAY) === 1, 'a recall with misses starts over at a day');
  // Not now leaves it due.
  await page.evaluate(() => { SD.state.save.typedDue.zzqqwidget.due = Date.now() - 1000; SD.terms.open(); });
  check(/^Other$/.test(await page.textContent('#panel .tm-dom h3')), 'a due term under Other brings Other to the top');
  await page.press('#panel .tm-go', 'Enter');
  await page.waitForSelector('#panel [data-skip]', { timeout: 3000 }).catch(() => {});
  await page.click('#panel [data-skip]');
  await page.waitForTimeout(200);
  check(/1 due/.test(await page.textContent('#panel .tm-count')), 'Not now leaves it due');

  // ---- T.mark keeps the spelling, and nothing else changes ----
  const mk = await page.evaluate(() => {
    const T = SD.typeOnce, s = SD.state.save;
    T.mark('ShardIteratorType'); const a = s.typedAs.sharditeratortype, n = s.typedDue.sharditeratortype.n;
    T.mark('sharditeratortype'); const b = s.typedAs.sharditeratortype;
    return { a, b, n, sp: T.spelling('SHARDITERATORTYPE') };
  });
  check(mk.a === 'ShardIteratorType' && mk.b === 'ShardIteratorType' && mk.n === 0 && mk.sp === 'ShardIteratorType', 'T.mark records the spelling (a lower-case mark later doesn\'t overwrite it), T.spelling reads it');

  // ---- Desktop ----
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(300);
  await noHScroll(page, 'terms, 1280px');
  await shot(page, 'page-1280');
  await page.click('#ms-home');
  await page.waitForTimeout(700);
  check(await page.evaluate(() => document.querySelector('#panel').hidden && !document.body.classList.contains('in-mode')), 'Home leaves the page');
  check(!page.errs.length, 'no errors ' + page.errs.join(' | '));
  await page.close();

  // ---- The card's loop, once the files are in (served by a route here) ----
  page = await open({ width: 375, height: 740 }, async p => {
    await p.route(/assets\/video\/cards\/terms\.(webp|mp4)$/, r => r.fulfill({ path: path.join(ROOT, 'assets/video/cards/story' + path.extname(r.request().url())) }));
  });
  await page.evaluate(() => { SD.state.save.lastGame = 'terms'; SD.state.persist(); });
  await page.click('#t-start');
  await page.waitForSelector('.tg-card[data-game="terms"]', { timeout: 5000 }).catch(() => {});
  await page.waitForSelector('.tg-card[data-game="terms"] .tg-vid', { timeout: 3000 }).catch(() => {});
  const vid = await page.$eval('.tg-card[data-game="terms"] .tg-art', a => ({ poster: a.classList.contains('tg-poster'), v: a.querySelector('video') && a.querySelector('video').getAttribute('poster') })).catch(() => ({}));
  check(!vid.poster && vid.v === 'assets/video/cards/terms.webp', 'once terms.webp is there, the card switches to the loop like the others: ' + JSON.stringify(vid));
  check(!page.errs.length, 'no errors with the loop ' + page.errs.join(' | '));
  await page.close();

  await browser.close();
  server.close();
  console.log(fails.length ? `${fails.length} FAILED` : 'All terms checks passed');
  process.exit(fails.length ? 1 : 0);
})();
