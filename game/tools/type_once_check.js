// Headless check of Type it once (js/type-once.js) at phone width (375px): the shared typing step the Fire Drill,
// Look-Alike Cup, Monster Hunt, Exam Sprint, Policy Sorts and Architect's Draft use at their pauses. The token picked
// from a line of AWS text, the panel (the token blanked in its line, two misses show it faintly, case and quotes
// ignored), "Not now" (comes back), the phone buttons, older saves' typed terms, the panel underneath put back after,
// bind() on a mode's own blank, and every hand-picked answer actually sitting in its line. The Fire Drill's runbook is
// typed for real in tools/drill_check.js.
// Run from game/:  node tools/type_once_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
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
  const page = await browser.newPage({ viewport: { width: 375, height: 667 }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'type-once-' + name + '.png'), fullPage: false }); };
  const txt = sel => page.textContent(sel);
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => { const b = el.getBoundingClientRect(); if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right)); });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const submit = async v => { await page.fill('#panel .to-in', v); await page.click('#panel .to-card [type="submit"]'); };

  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');

  // ---- The token in a line ----
  const toks = await page.evaluate(() => [
    '"Condition": { "StringEquals": { "kms:ViaService": "s3.us-east-1.amazonaws.com" } }',
    'VisibilityTimeout: 60', 'ShardIteratorType: AFTER_SEQUENCE_NUMBER', 'ConditionExpression: attribute_not_exists(orderId)',
    'aws lambda update-function-configuration --memory-size 1024', 'retry_mode = standard', 'Turn on DynamoDB Streams in CloudWatch', 'A plain sentence.'
  ].map(l => SD.typeOnce.token(l)));
  check(JSON.stringify(toks) === JSON.stringify(['kms:ViaService', 'VisibilityTimeout', 'AFTER_SEQUENCE_NUMBER', 'attribute_not_exists', '--memory-size', 'retry_mode', '', '']),
    'token() picks the condition key, setting, constant, function, flag or snake_case key, and skips product names: ' + toks.join(' | '));
  check(await page.evaluate(() => SD.typeOnce.token('ShardIteratorType: AFTER_SEQUENCE_NUMBER', 'ShardIteratorType')) === 'ShardIteratorType', 'prefer wins when it is in the line');
  check(await page.evaluate(() => SD.typeOnce.match('  "VisibilityTimeout", ', 'visibilitytimeout') && !SD.typeOnce.match('Visibility', 'VisibilityTimeout') && !SD.typeOnce.match('', '')), 'match() ignores case, spaces and quotes, and nothing typed is never right');

  // ---- Every hand-picked answer sits in its line ----
  const bad = await page.evaluate(() => {
    const out = [];
    Object.entries(SD.policySorts || {}).forEach(([k, P]) => { if (P.type && !P.type.line.includes(P.type.ans)) out.push('sort ' + k); });
    Object.entries((SD.table && SD.table.PINS) || {}).forEach(([k, p]) => { if (p.type ? !p.term.includes(p.type) : p.term && !SD.typeOnce.token(p.term) && !/^(pss|xmeta)$/.test(k)) out.push('pin ' + k + ' ("' + p.term + '")'); });
    return out;
  });
  check(!bad.length, 'every Policy Sort\'s typed part is in its line, and every Look-Alike Cup pin\'s term has a part to type (its type: in its term), but the two with nothing worth it' + (bad.length ? ': ' + bad.join(', ') : ''));

  // ---- The panel: blanked in its line, on top of what was open, put back after ----
  await page.evaluate(() => { SD.ui.panel('<p id="under">The bill underneath.</p>', { title: 'THE BILL' }); window.__r = null;
    SD.typeOnce.maybe('VisibilityTimeout: 60', { who: 'Kagemaru', say: 'Sign for it.', title: 'HIS LEDGER' }).then(r => { window.__r = r; }); });
  await page.waitForSelector('#panel .to-win .to-in');
  check(/HIS LEDGER/.test(await txt('#panel .win-h')) && /Kagemaru:/.test(await txt('#panel .to-say')) && (await txt('#panel .to-line')).trim() === ': 60', 'the panel blanks the token in its line, with who says it');
  await noHScroll('panel'); await shot('panel');
  await submit('VisibilityTime');
  check(/One more try/.test(await txt('#panel .to-note')) && !await page.getAttribute('#panel .to-in', 'placeholder'), 'one miss: one more try, nothing shown yet');
  await submit('visibility timeout x');
  check(await page.getAttribute('#panel .to-in', 'placeholder') === 'VisibilityTimeout' && await page.$('#panel .to-in.faint') && /faintly/.test(await txt('#panel .to-note')), 'two misses: it shows faintly in the blank, to copy');
  await shot('faint');
  await submit('visibilitytimeout');
  check(/Typed\. It's yours now/.test(await txt('#panel .to-note')) && /VisibilityTimeout: 60/.test(await txt('#panel .to-line.done')), 'typed: the whole line, filled in');
  await shot('typed');
  await page.click('#panel [data-go]');
  await page.waitForFunction(() => window.__r);
  const r1 = await page.evaluate(() => window.__r);
  check(r1.typed && r1.misses === 2 && !r1.skipped && await page.evaluate(() => !!SD.state.save.typed.visibilitytimeout), 'it resolves typed, with its misses, and the save keeps it');
  check(!!await page.$('#panel #under') && /THE BILL/.test(await txt('#panel .win-h')), 'what was open underneath is put back as it was');
  check(await page.evaluate(() => SD.typeOnce.maybe('VisibilityTimeout: 360', {})) === null, 'once typed, it is never asked again, in any mode');

  // ---- Not now comes back ----
  await page.evaluate(() => { window.__r = null; SD.typeOnce.maybe('MaximumBatchingWindowInSeconds: 5').then(r => { window.__r = r; }); });
  await page.waitForSelector('#panel .to-win [data-skip]');
  await page.click('#panel [data-skip]');
  await page.waitForFunction(() => window.__r);
  check(await page.evaluate(() => window.__r.skipped && SD.typeOnce.need('MaximumBatchingWindowInSeconds')), '"Not now" skips without marking it, so it comes back next time');

  // ---- Phone buttons ----
  await page.evaluate(() => { window.__r = null; SD.typeOnce.maybe('"Action": "kms:GenerateDataKey"', { choices: ['kms:Encrypt', 'kms:GenerateDataKey', 'kms:Decrypt'] }).then(r => { window.__r = r; }); });
  await page.waitForSelector('#panel .to-ch button');
  check(await page.$('#panel .to-in') === null && await page.$$eval('#panel .to-ch button', b => b.length) === 3, 'with choices: buttons in place of the text box');
  await shot('choices');
  await page.click('#panel [data-ch="kms:Encrypt"]');
  check(await page.$eval('#panel [data-ch="kms:Encrypt"]', b => b.disabled), 'a wrong pick is crossed off');
  await page.click('#panel [data-ch="kms:GenerateDataKey"]');
  await page.click('#panel [data-go]');
  await page.waitForFunction(() => window.__r);
  check(await page.evaluate(() => window.__r.typed && SD.typeOnce.learned('kms:GenerateDataKey')), 'a right pick marks it');

  // ---- Older saves and switches ----
  check(await page.evaluate(() => { SD.state.save.renoKeep = { typed: { 'dynamodb:LeadingKeys': 1 } }; SD.state.save.icTyped = { ReportBatchItemFailures: 1 }; return SD.typeOnce.learned('dynamodb:leadingkeys') && !SD.typeOnce.need('ReportBatchItemFailures'); }), 'terms typed in the Renovation or the Incident Commander count here too');
  check(await page.evaluate(async () => { SD.typeOnce.off = true; const r = await SD.typeOnce.maybe('BisectBatchOnFunctionError: true'); SD.typeOnce.off = false; return r === null && !document.querySelector('#panel .to-win'); }), 'off: maybe() asks nothing');

  // ---- bind(): a blank a mode draws itself ----
  const bd = await page.evaluate(() => {
    const i = document.createElement('input'); document.body.appendChild(i); const log = [];
    const h = SD.typeOnce.bind(i, 'FunctionResponseTypes', { onOk: m => log.push('ok' + m), onMiss: m => log.push('miss' + m) });
    i.value = 'Function'; h.check(); i.value = 'Responses'; h.check(); const ph = i.placeholder; i.value = 'functionresponsetypes'; h.check(); i.remove();
    return { log, ph, done: h.done, learned: SD.typeOnce.learned('FunctionResponseTypes') };
  });
  check(bd.log.join() === 'miss1,miss2,ok2' && bd.ph === 'FunctionResponseTypes' && bd.done && bd.learned, 'bind(): the same two-miss rule on a mode\'s own blank');

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  if (fails.length) { console.log(`\n${fails.length} FAILED`); process.exit(1); }
  console.log('\nAll Type it once checks pass.');
})().catch(e => { console.error(e); process.exit(1); });
