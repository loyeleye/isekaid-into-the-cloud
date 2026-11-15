// Headless check of Architect's Draft (js/draft.js, js/draft-art.js) at phone width (375px), on the shared modes shell
// (js/modes.js): it's in the Play picker; the first run's walkthrough; a session of multiple-response contracts plus a
// single-answer job, verified-only with the fallback; the board shows three and nothing can be dodged; drafting,
// taking back and swapping cards; per-slot stakes as floors; an Inspector's token caps the seal at Think so; a wrong
// slot puts the question on the Wall and its building under scaffolding, which comes off when the poster comes down;
// the inspection shows every card left on the table with its "why not" line; stop and resume on the same contract;
// the results screen (calibration, pay once a day, Pip); the Quarter's streets and a landmark at five standing.
// Run from game/:  node tools/draft_check.js     SHOTS=dir saves screenshots.
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
  const page = await browser.newPage({ viewport: { width: 375, height: 667 } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  let shotN = 0;
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `draft-${String(++shotN).padStart(2, '0')}-${name}.png`), fullPage: false }); };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at 375px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const title = () => page.evaluate(() => { const h = document.querySelector('#panel:not([hidden]) .win-h span'); return h ? h.textContent : ''; });
  const run = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.draft.run())));
  const wait = ms => page.waitForTimeout(ms);
  // Fill the open contract's slots: right (every right card) or with `wrong` wrong cards, then seal with conf.
  const draftAndSeal = async (wrong, conf) => {
    const info = await page.evaluate(() => {
      const r = SD.draft.run(), it = r.items[r.open], q = SD.exam.find(it.q);
      const cards = SD.draft.cards(q).map((t, i) => i);
      return { q: q.id, n: SD.draft.slotsOf(q), right: cards.filter(i => SD.draft.cardOk(q, i)), bad: cards.filter(i => !SD.draft.cardOk(q, i)) };
    });
    const pick = info.right.slice(0, info.n - wrong).concat(info.bad.slice(0, wrong));
    for (const i of pick) { await page.click(`#panel [data-i="${i}"]`); }
    await page.click(`#panel [data-c="${conf}"]`);
    await wait(20);
    return info;
  };
  const openFirst = async () => { await page.click('#panel [data-k]'); await wait(20); };

  await page.clock.install({ time: new Date('2026-11-16T12:00:00') });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => { SD.state.save.examTrack = 'DVA'; SD.state.save.examDate = '2026-11-30'; SD.state.save.todaySkip = true; SD.state.persist(); SD.today.render(); });

  // ---- In the picker ----
  check(await page.evaluate(() => !!SD.modes.get('draft')), 'Architect\'s Draft registers with the mode picker');
  check(!!await page.$('#td-play'), 'the Today card has a Play button');
  await page.click('#td-play');
  check(!!await page.$('#panel [data-mode="draft"]'), 'the picker lists Architect\'s Draft');
  await shot('picker');
  await page.click('#panel [data-mode="draft"]');
  await wait(30);

  // ---- First run: the walkthrough ----
  check(await title() === 'HOW TO PLAY', 'the first run opens with the walkthrough');
  const w1 = await page.evaluate(() => document.querySelector('#panel .md-walk').textContent);
  check(/choose 2/.test(w1) && /Select TWO/.test(w1), 'walkthrough screen 1 shows a real Select TWO question');
  await noHScroll('walkthrough');
  await shot('walk1');
  for (let i = 0; i < 3; i++) { await page.click('#md-next'); await wait(20); }
  check(await title() === 'ARCHITECT\'S DRAFT', 'after the walkthrough, the contract board opens');

  // ---- The session ----
  let r = await run();
  const kinds = await page.evaluate(() => SD.draft.run().items.map(it => SD.exam.find(it.q).type));
  check(r.items.length === 7, `a session is 7 contracts (${r.items.length})`);
  check(kinds.filter(k => k === 'multi').length === 6 && kinds.filter(k => k === 'mc').length === 1, `6 multiple-response contracts and 1 single-answer job (${kinds.join(',')})`);
  const unverified = await page.evaluate(() => SD.draft.run().items.filter(it => !SD.topicDrill.isVerified(SD.exam.find(it.q))).length);
  check(unverified === 0, 'every contract is verified (verified-only, enough verified questions)');
  check(r.tokens === 2, 'two Inspector\'s tokens a session');
  const shown = await page.$$eval('#panel [data-k]', els => els.length);
  check(shown === 3, `the board shows 3 contracts (${shown})`);
  const boardTxt = await page.evaluate(() => document.querySelector('#panel .win-b').textContent);
  check(/choose the order, not whether/.test(boardTxt), 'the board says you choose the order, not whether');
  check(/slots · choose (2|3)|1 slot/.test(boardTxt) && /Verified/.test(boardTxt), 'each contract card shows its slots and its verified mark');
  await noHScroll('board');
  await shot('board');

  // ---- A contract: draft, take back, swap, token, seal ----
  const k0 = await page.evaluate(() => +document.querySelector('#panel [data-k]').dataset.k);
  await openFirst();
  check(await title() === 'ARCHITECT\'S DRAFT · CONTRACT', 'tapping a contract opens it');
  const c0 = await page.evaluate(() => { const r = SD.draft.run(), q = SD.exam.find(r.items[r.open].q); return { n: SD.draft.slotsOf(q), cards: SD.draft.cards(q).length, type: q.type }; });
  check(await page.$$eval('#panel .dr-slot', els => els.length) === c0.n, 'one slot per answer the question needs');
  check(await page.$$eval('#panel [data-i]', els => els.length) === c0.cards, 'the question\'s options are dealt as cards');
  check(await page.$eval('#panel [data-c="0"]', el => el.disabled), 'sealing waits until every slot is filled');
  await noHScroll('contract');
  await shot('contract');
  await page.click('#panel [data-i="0"]');
  check((await run()).slots[0] === 0, 'tapping a card drafts it into the next slot');
  await page.click('#panel [data-s="0"]');
  check((await run()).slots.length === 0, 'tapping a slot takes its card back');
  // Leave the contract: it stays on the board, cards and all.
  await page.click('#panel [data-i="1"]');
  await page.click('#dr-back');
  r = await run();
  check(r.open === null && !r.items[k0].done && await page.$$eval('#panel [data-k]', els => els.length) === 3, 'backing out leaves the contract on the board, undone');
  // Stop and resume: lands back on the board with the contract still there.
  await page.click(`#panel [data-k="${k0}"]`);
  await page.click('#dr-stop');
  check(await page.evaluate(() => document.querySelector('#panel').hidden), 'Stop for now closes the window');
  await page.evaluate(() => SD.draft.open());
  await wait(20);
  check(await title() === 'ARCHITECT\'S DRAFT · CONTRACT' && (await run()).open === k0, 'resuming lands on the same contract');
  // An Inspector's token: flip a card, then Sure is off.
  await page.evaluate(() => { SD.draft.run().slots = []; });
  await page.click('#dr-tok');
  const badCard = await page.evaluate(() => { const r = SD.draft.run(), q = SD.exam.find(r.items[r.open].q); return SD.draft.cards(q).findIndex((t, i) => !SD.draft.cardOk(q, i)); });
  await page.click(`#panel [data-i="${badCard}"]`);
  await wait(10);
  r = await run();
  check(r.tokens === 1 && r.flips.includes(badCard), 'a token flips one card and is spent');
  const back = await page.evaluate(i => document.querySelector(`#panel [data-i="${i}"] .dr-back`).textContent, badCard);
  check(/Not here/.test(back), `a flipped wrong card shows its no line ("${back.slice(0, 60)}…")`);
  check(await page.evaluate(() => /pays at most Think so/.test(document.querySelector('#panel .win-b').textContent)), 'the contract says an inspected blueprint pays at most Think so');
  await shot('token');
  const info0 = await page.evaluate(() => { const r = SD.draft.run(), q = SD.exam.find(r.items[r.open].q); return { n: SD.draft.slotsOf(q), right: SD.draft.cards(q).map((t, i) => i).filter(i => SD.draft.cardOk(q, i)) }; });
  for (const i of info0.right.slice(0, info0.n)) await page.click(`#panel [data-i="${i}"]`);
  check(await page.$eval('#panel [data-c="2"]', el => el.disabled) && !await page.$eval('#panel [data-c="1"]', el => el.disabled), 'after a token, Sure is disabled and Think so is open');
  const xp0 = await page.evaluate(() => SD.state.save.shards | 0);
  await page.click('#panel [data-c="1"]');
  await wait(20);
  check(await title() === 'INSPECTION', 'sealing opens the inspection');
  r = await run();
  check(r.items[k0].done && r.items[k0].ok && r.floors === 2 * info0.n, `all right at Think so: +2 floors a slot (${r.floors})`);
  const insp = await page.evaluate(() => document.querySelector('#panel .win-b').textContent);
  check(/IT STANDS/.test(insp), 'a fully right blueprint stands');
  check(/Inspection: the cards left on the table/.test(insp) && /Not here, because/.test(insp), 'inspection flips every card left on the table to its no line');
  check(/Verified|Not verified yet/.test(insp) && /AWS docs/.test(insp), 'inspection shows the verified record and AWS docs');
  check(await page.evaluate(() => { const c = document.querySelector('#panel .dr-cv'); return !!c && c.width > 0; }), 'the building is drawn');
  const qid0 = r.items[k0].q;
  check(await page.evaluate(id => { const b = SD.draft.save().town[id]; return b && !b.scaf && b.floors > 0; }, qid0), 'the building joins the Quarter, standing');
  await noHScroll('inspection');
  await shot('inspect-right');
  await page.click('#dr-next');

  // ---- A wrong slot at Sure: crack, Wall, scaffolding ----
  await openFirst();
  r = await run();
  const k1 = r.open;
  const f1 = r.floors;
  const info1 = await draftAndSeal(1, 2);
  r = await run();
  check(!r.items[k1].ok, 'one wrong slot means the blueprint isn\'t right');
  check(r.floors - f1 === 3 * (info1.n - 1) - 3, `Sure: +3 a right slot, −3 the wrong one (${r.floors - f1})`);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id), info1.q), 'a Sure miss goes on the Wall');
  check(await page.evaluate(id => { const b = SD.draft.save().town[id]; return b.scaf && b.cracks === 1; }, info1.q), 'its building stands under scaffolding, with a crack');
  check(await page.evaluate(id => !!SD.draft.scaffoldFor(id), info1.q), 'scaffoldFor reports it (for Monster Hunt\'s cards)');
  const insp1 = await page.evaluate(() => document.querySelector('#panel .win-b').textContent);
  check(/SCAFFOLDING/.test(insp1) && /Why your card doesn't fit/.test(insp1) && /The scroll needed/.test(insp1), 'inspection shows the wrong card\'s no line and what the scroll needed');
  check(/Monster Hunt/.test(insp1), 'inspection says how to finish it');
  await shot('inspect-wrong');
  await page.click('#dr-next');

  // A wrong slot at Guess also goes up (every miss leaves scaffolding).
  await openFirst();
  const info2 = await draftAndSeal(1, 0);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id) && SD.draft.save().town[id].scaf, info2.q), 'a Guess miss also goes on the Wall, under scaffolding');
  await page.click('#dr-next');
  // The poster comes down (two right answers on two days, as the Wall's rule): the scaffolding comes off.
  await page.evaluate(id => { const w = SD.state.save.wall; w.splice(w.findIndex(x => x.id === id), 1); }, info2.q);
  check(await page.evaluate(id => { SD.draft.town(); const b = SD.draft.save().town[id]; return !b.scaf && b.fin === 1; }, info2.q), 'when its poster comes down, the scaffolding comes off for good');
  check(await page.evaluate(id => SD.draft.scaffoldFor(id) === null, info2.q), 'scaffoldFor is null once finished');

  // ---- The rest of the session, then results ----
  for (let i = 0; i < 10; i++) {
    if (await title() !== 'ARCHITECT\'S DRAFT') break;
    await openFirst();
    await draftAndSeal(0, 1);
    await page.click('#dr-next');
    await wait(10);
  }
  check(await title() === 'ARCHITECT\'S DRAFT · RESULTS', 'after the last contract, the results screen');
  const res = await page.evaluate(() => document.querySelector('#panel .win-b').textContent);
  check(/Standing: 5/.test(res) && /Scaffolding: 2/.test(res), 'results count standing and scaffolding');
  check(/Sure misses to the Wall: 1/.test(res), 'results count Sure misses added to the Wall');
  check(/How sure you were/.test(res) && /Think so/.test(res), 'results show calibration');
  check(/Ideas touched/.test(res), 'results list the ideas touched');
  check(/Why did that work/.test(res), 'Pip asks his question');
  check(await page.evaluate(() => SD.state.save.shards | 0) === xp0 + 5, 'the session pays 5 shards');
  await noHScroll('results');
  await shot('results');
  await page.click('#dr-q');
  await wait(20);

  // ---- The Quarter ----
  check(await title() === 'THE ARCHITECTS\' QUARTER', 'the results open the Quarter');
  const qt = await page.evaluate(() => document.querySelector('#panel .win-b').textContent);
  check(/Dispatch Row/.test(qt) && /Lockside/.test(qt) && /Pipeline Lane/.test(qt) && /Lantern Street/.test(qt), 'four streets, one per domain');
  check(/Development with AWS Services/.test(qt) && /Troubleshooting and Optimization/.test(qt), 'each street names its exam domain');
  check(await page.$$eval('#panel .dr-lot[data-q]', els => els.length) === 7, 'seven buildings in the Quarter');
  check(/🚧 Scaffolding/.test(qt) && /🏛 Standing/.test(qt), 'tiles read without colour: Standing or Scaffolding in words');
  await noHScroll('quarter');
  await shot('quarter');
  await page.click('#panel .dr-lot[data-q]');
  check(/Plaque/.test(await page.evaluate(() => document.querySelector('#panel .win-b').textContent)), 'a building opens its plaque');
  await shot('plaque');
  // A landmark at five standing buildings on one street.
  const lm = await page.evaluate(() => {
    const town = SD.draft.save().town;
    for (let i = 0; i < 5; i++) town['fake-' + i] = { q: 'fake-' + i, d: 3, client: 'dutch', floors: 3, cracks: 0, scaf: false, t: Date.now() + i };
    return SD.draft.district(3).landmark;
  });
  check(lm, 'five standing buildings on a street unlock its landmark');
  await page.evaluate(() => { const town = SD.draft.save().town; Object.keys(town).filter(k => /^fake-/.test(k)).forEach(k => delete town[k]); });
  check(await page.evaluate(() => SD.draft.run() === null), 'a finished session clears the run');
  check(/Resume|standing/.test(await page.evaluate(() => SD.draft.status() || '')), 'the picker line shows the Quarter\'s count');

  // ---- A preset with few multiple-response questions still fills, marked ----
  const pre = await page.evaluate(() => SD.draft.pickSession('pair-cognito').map(it => SD.exam.find(it.q)).map(q => ({ t: q.type, v: SD.topicDrill.isVerified(q) })));
  check(pre.length >= 5, `a narrow preset still fills a session (${pre.length})`);

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} failed` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
