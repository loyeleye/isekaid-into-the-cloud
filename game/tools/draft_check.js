// Headless check of Architect's Draft (js/draft.js, js/draft-art.js) at phone width (375px), on the shared modes shell
// (js/modes.js), against Build spec v4: it's in the Play picker; the first run's walkthrough; a session of
// multiple-response contracts plus a single-answer job, verified-only with the fallback; a board of three clients you
// choose the order of; the whole stem free to read, with no hint of any kind before the seal; per-slot stakes as
// floors; a wrong slot puts the question on the Wall and its building under scaffolding, which comes off when the
// poster comes down; the inspection's "why not" lines; placement after the verdict on its own screen (at most four map
// actions, Map as list, saved after every action); stop and resume; results; Pingsby's Quarter; and the rules that
// open on later nights (materials and the twin retry, reputation and the second tier of clients), plus the foreman.
// Build orders (Nov 16 formats plan): two of the six clients bring a Sequence item from js/qformats.js, worked and
// practice the first two times, then scored with the same stakes; a miss scaffolds without going on the Wall.
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
  const txt = () => page.evaluate(() => document.querySelector('#panel .win-b').textContent);
  // Place the building just sealed: tap the first free plot (or `plot`), then build.
  const placeAt = async plot => {
    if (plot == null) plot = await page.evaluate(() => SD.draft.freePlots()[0]);
    await page.click(`#panel [data-p="${plot}"]`); await wait(10);
    await page.click('#dr-build'); await wait(20);
    return plot;
  };
  // Seal (from inspection) then place, for contracts the check doesn't look at closely.
  // A build order (the formats engine's Sequence): worked shows "Got it"; otherwise tap the steps in order (or with
  // the first two swapped), submit, rate, continue. Returns the engine's mode and the item.
  const playSeq = async (right, conf) => {
    const x = await page.evaluate(() => { const r = SD.draft.run(), it = r ? r.items[r.open] : null; return it ? { id: it.q, n: SD.draft.seqFind(it.q).steps.length } : null; });
    await page.waitForSelector('#panel .qf');
    if (await page.$('#qf-got')) { await page.click('#qf-got'); await wait(20); return { mode: 'worked', x }; }
    const order = Array.from({ length: x.n }, (_, i) => i);
    if (!right) [order[0], order[1]] = [order[1], order[0]];
    for (const i of order) await page.click(`#panel [data-qf-pool="s${i}"]`);
    await page.click('#qf-submit'); await wait(10);
    await page.click(`#panel .qf [data-c="${conf}"]`); await wait(10);
    await page.click('#q-next'); await wait(20);
    return { mode: 'played', x };
  };
  const isSeqOpen = () => page.evaluate(() => { const r = SD.draft.run(); return !!(r && r.open != null && r.items[r.open].seq); });
  // Build orders to the back of the board, so the blueprint checks below meet blueprints first.
  const seqLast = () => page.evaluate(() => { const r = SD.draft.run(); r.items.sort((a, b) => (a.seq | 0) - (b.seq | 0)); SD.state.persist(); SD.draft.open(); });
  const sealAndPlace = async (wrong, conf) => { const i = await draftAndSeal(wrong, conf); await page.click('#dr-next'); await wait(20); if (await title() === 'PINGSBY\'S QUARTER · PLACE IT') await placeAt(); return i; };

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
  check(/Postmaster Coo/.test(w1) && /Pingsby/.test(w1), 'before chapter 5, Coo runs the yard in Pingsby\'s Quarter');
  await noHScroll('walkthrough');
  await shot('walk1');
  for (let i = 0; i < 3; i++) { await page.click('#md-next'); await wait(20); }
  check(await title() === 'ARCHITECT\'S DRAFT', 'after the walkthrough, the client board opens');

  // ---- The session ----
  let r = await run();
  const kinds = await page.evaluate(() => SD.draft.run().items.map(it => (it.seq ? 'seq' : SD.exam.find(it.q).type)));
  check(r.items.length === 6, `a session is 6 clients (${r.items.length})`);
  check(kinds.filter(k => k === 'multi').length === 3 && kinds.filter(k => k === 'mc').length === 1 && kinds.filter(k => k === 'seq').length === 2, `3 multiple-response contracts, 1 single-answer job and 2 build orders (${kinds.join(',')})`);
  check(await page.evaluate(() => SD.draft.seqItems().length === 25 && SD.draft.run().items.filter(i => i.seq).every(i => /^fmt-seq-/.test(i.q))), 'the build orders come from the 25 Sequence items');
  check(await page.evaluate(() => !SD.qf.has('seq') && !SD.qf.enabled()), 'the formats engine stays off outside the mode (has() is false in this profile)');
  await seqLast(); await wait(20);
  const unverified = await page.evaluate(() => SD.draft.run().items.filter(it => !it.seq && !SD.topicDrill.isVerified(SD.exam.find(it.q))).length);
  check(unverified === 0, 'every contract is verified (verified-only, enough verified questions)');
  check(r.tokens === undefined && !await page.$('#dr-tok'), 'no inspector\'s tokens: nothing helps before the seal');
  const shown = await page.$$eval('#panel [data-k]', els => els.length);
  check(shown === 3, `the board shows 3 clients (${shown})`);
  const boardClients = await page.evaluate(() => [...document.querySelectorAll('#panel [data-k]')].map(el => SD.draft.run().items[+el.dataset.k].client));
  check(new Set(boardClients).size === 3, `three different clients on the board (${boardClients.join(', ')})`);
  check(r.items.every(it => ['mira', 'seoyeon', 'dutch', 'kai'].includes(it.client)), 'on night 1 only the first tier of clients comes');
  check(await page.evaluate(() => !Object.values(SD.draft.CLIENTS).some(c => /Seymour/.test(c.name))), 'Seymour is the inspector, never a client');
  const boardTxt = await txt();
  check(/choose the order, not whether/.test(boardTxt), 'the board says you choose the order, not whether');
  check(/choose (2|3)|one card/.test(boardTxt) && /Verified/.test(boardTxt) && /D[1-4]/.test(boardTxt), 'each client card shows its slots, its domain and its verified mark');
  check(!/🧱|⭐/.test(boardTxt), 'night 1 shows no materials or reputation yet');
  check(await page.$$eval('#panel .dr-bark', els => els.length) === 3, 'each client\'s line is on the board, not on the question');
  await noHScroll('board');
  await shot('board');

  // ---- Every stem shows whole ----
  const lost = await page.evaluate(() => {
    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    return SD.topicDrill.base().filter(q => q.type === 'multi' || q.type === 'mc').filter(q => { const x = SD.draft.stem(q); return norm(x.text + (x.pick ? ' (' + x.pick + ')' : '')) !== norm(q.q); }).map(q => q.id);
  });
  check(!lost.length, 'every question shows its whole stem, word for word' + (lost.length ? ': ' + lost.slice(0, 5).join(', ') : ''));

  // ---- A contract: the whole scroll, draft, take back, back out, stop and resume, seal ----
  const k0 = await page.evaluate(() => +document.querySelector('#panel [data-k]').dataset.k);
  await openFirst();
  check(await title() === 'ARCHITECT\'S DRAFT · CONTRACT', 'tapping a client opens their contract');
  const c0 = await page.evaluate(() => { const r = SD.draft.run(), q = SD.exam.find(r.items[r.open].q); return { n: SD.draft.slotsOf(q), cards: SD.draft.cards(q).length, stem: SD.draft.stem(q).text, ev: q.ev || '' }; });
  const shownStem = await page.evaluate(() => document.querySelector('#panel .dr-q').textContent);
  check(shownStem.startsWith(c0.stem), 'the contract shows the whole stem, free to read');
  check(!await page.$('#panel [data-clue]') && !await page.$('#panel .dr-map'), 'no closed clues, and no map beside the question');
  check(await page.evaluate(() => { const r = SD.draft.run(), c = SD.draft.CLIENTS[r.items[r.open].client]; return !document.querySelector('#panel .win-b').textContent.includes(c.arrive) && document.querySelector('#panel .dr-for').textContent.includes(c.name); }), 'only the client\'s name sits above the scroll');
  check(await page.$$eval('#panel .dr-slot', els => els.length) === c0.n, 'one slot per answer the question needs');
  check(await page.$$eval('#panel [data-i]', els => els.length) === c0.cards, 'the question\'s options are dealt as cards');
  await wait(60);   // let the panel's opening transition finish before measuring
  check(await page.$$eval('#panel .dr-card', els => els.every(el => el.getBoundingClientRect().width > 280)), 'option cards are full-width rows');
  check(!/Not here|why not/i.test(await txt()), 'no "why not" line before the seal');
  check(await page.$eval('#panel [data-c="0"]', el => el.disabled), 'sealing waits until every slot is filled');
  await noHScroll('contract');
  await shot('contract');
  const item = () => page.evaluate(k => JSON.parse(JSON.stringify(SD.draft.run().items[k])), k0);
  await page.click('#panel [data-i="0"]');
  check((await item()).pick[0] === 0, 'tapping a card drafts it into the next slot');
  await page.click('#panel [data-s="0"]');
  check((await item()).pick.length === 0, 'tapping a slot takes its card back');
  await page.click('#panel [data-i="1"]');
  await page.click('#dr-back');
  r = await run();
  check(r.open === null && !r.items[k0].done && r.items[k0].pick.length === 1 && await page.$$eval('#panel [data-k]', els => els.length) === 3, 'passing on a client leaves them on the board, cards and all');
  await page.click(`#panel [data-k="${k0}"]`);
  await page.click('#dr-stop');
  check(await page.evaluate(() => document.querySelector('#panel').hidden), 'Stop for now closes the window');
  await page.evaluate(() => SD.draft.open());
  await wait(20);
  check(await title() === 'ARCHITECT\'S DRAFT · CONTRACT' && (await run()).open === k0, 'resuming lands on the same contract');
  await page.evaluate(k => { SD.draft.run().items[k].pick = []; }, k0);
  const info0 = await page.evaluate(() => { const r = SD.draft.run(), q = SD.exam.find(r.items[r.open].q); return { q: q.id, n: SD.draft.slotsOf(q), right: SD.draft.cards(q).map((t, i) => i).filter(i => SD.draft.cardOk(q, i)) }; });
  await page.click('#panel [data-i="0"]'); await page.click('#panel [data-s="0"]');   // re-render with an empty pick
  for (const i of info0.right.slice(0, info0.n)) await page.click(`#panel [data-i="${i}"]`);
  check(!await page.$eval('#panel [data-c="2"]', el => el.disabled), 'with every slot filled, all three confidences are open');
  const xp0 = await page.evaluate(() => SD.state.save.shards | 0);
  await page.click('#panel [data-c="1"]');
  await wait(20);
  check(await title() === 'INSPECTION', 'sealing opens the inspection');
  r = await run();
  check(r.items[k0].done && r.items[k0].ok && r.floors === 2, `all right at Think so: +2 floors for the whole blueprint (${r.floors})`);
  const insp = await txt();
  check(/IT HOLDS/.test(insp) && /Seymour:/.test(insp), 'a fully right blueprint holds, and Seymour says so');
  check(/Inspection: the cards left on the table/.test(insp) && /Not here, because/.test(insp), 'after the verdict, every card left on the table shows its "why not" line');
  check(/Verified|Not verified yet/.test(insp) && /AWS docs/.test(insp), 'inspection shows the verified record and AWS docs');
  check(await page.evaluate(() => { const c = document.querySelector('#panel .dr-cv'); return !!c && c.width > 0; }), 'the building is drawn');
  check(await page.evaluate(id => { const b = SD.draft.save().town[id]; return b && !b.scaf && b.floors > 0 && b.plot == null; }, info0.q), 'the building is built, standing, and not placed yet');
  check(/Place the building/.test(await page.$eval('#dr-next', el => el.textContent)), 'the verdict leads to placement');
  await noHScroll('inspection');
  await shot('inspect-right');
  await page.click('#dr-next');
  await wait(20);

  // ---- Placement: its own screen, four map actions, Map as list, saved after each ----
  check(await title() === 'PINGSBY\'S QUARTER · PLACE IT', 'placement opens on its own screen');
  check(!await page.$('#panel .dr-q') && !await page.$('#panel [data-c]'), 'the map never shares the screen with a question');
  check(await page.$$eval('#panel .dr-plot', els => els.length) === 30 && await page.$$eval('#panel .dr-plot.ghost', els => els.length) === 6 && await page.$$eval('#panel .dr-plot.lockd', els => els.length) === 24, 'night 1 opens six plots, ghosts under delete markers; the rest open on later nights');
  check(await page.$$eval('#panel .dr-plot.riv', els => els.length) === 3 && !!await page.$('#panel .dr-river'), 'three of them are by the river, with the river drawn beside them');
  check(await page.$$eval('#panel .dr-pcv', els => els.every(c => c.width > 0)), 'every plot is drawn');
  await noHScroll('placement map');
  await shot('place-map');
  await page.click('#panel [data-p="11"]'); await wait(10);
  let P = await page.evaluate(() => JSON.parse(JSON.stringify(SD.draft.save().placing)));
  check(P.sel === 11 && P.acts === 1, 'tapping a plot is a map action, and it saves');
  check(/Chosen:/.test(await txt()) && /B3/.test(await txt()), 'a chosen plot says what it is in words');
  check(/From tomorrow: \+\d 🧱 here/.test(await txt()), 'on night 1 the preview says what the plot pays from tomorrow');
  await page.click('#dr-vlist'); await wait(10);
  check(await page.$$eval('#panel .dr-prow', els => els.length) === 6 && !await page.$('#panel .dr-map') && /24 open on later nights/.test(await txt()), 'Map as list is one tap away, every open plot in words');
  check(/by the river/.test(await txt()), 'the list says which plots are by the river');
  await noHScroll('placement list');
  await shot('place-list');
  await page.click('#panel .dr-prow[data-p="12"]'); await wait(10);
  await page.click('#dr-vmap'); await wait(10);
  await page.click('#panel [data-p="13"]'); await wait(10);
  P = await page.evaluate(() => JSON.parse(JSON.stringify(SD.draft.save().placing)));
  check(P.acts === 3 && P.sel === 13, `three looks (${P.acts})`);
  check(await page.$$eval('#panel .dr-plot.ghost:disabled', els => els.length) === 5, 'after three looks, only the chosen plot can be built on');
  // Stop mid-placement and resume: same plot, same count.
  await page.click('#dr-stop');
  await page.evaluate(() => SD.draft.open()); await wait(20);
  P = await page.evaluate(() => JSON.parse(JSON.stringify(SD.draft.save().placing)));
  check(await title() === 'PINGSBY\'S QUARTER · PLACE IT' && P.acts === 3 && P.sel === 13, 'resuming lands back on the placement, with its looks kept');
  await page.click('#dr-build'); await wait(20);
  const placed = await page.evaluate(id => SD.draft.save().town[id].plot, info0.q);
  const log = await page.evaluate(() => SD.draft.save().mapLog.slice(-1)[0]);
  check(placed === 13 && log.acts === 4 && log.acts <= 4, `building is the fourth and last map action (${log.acts})`);
  check(typeof log.ms === 'number', 'map time is logged');
  check(await title() === 'ARCHITECT\'S DRAFT' && /Since your last move: .* went up on D3/.test(await txt()), 'back on the board, one line says what happened since your last move');

  // ---- A wrong slot at Sure: crack, Wall, scaffolding ----
  await openFirst();
  r = await run();
  const k1 = r.open, f1 = r.floors;
  const info1 = await draftAndSeal(1, 2);
  r = await run();
  check(!r.items[k1].ok, 'one wrong slot means the blueprint isn\'t right');
  check(r.floors - f1 === -3, `Sure with one wrong slot: −3 for the whole blueprint (${r.floors - f1})`);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id), info1.q), 'a Sure miss goes on the Wall');
  check(await page.evaluate(id => { const b = SD.draft.save().town[id]; return b.scaf && b.cracks === 1; }, info1.q), 'its building stands under scaffolding, with a crack');
  check(await page.evaluate(id => !!SD.draft.scaffoldFor(id), info1.q), 'scaffoldFor reports it (for Monster Hunt\'s cards)');
  const insp1 = await txt();
  check(/SCAFFOLDING/.test(insp1) && /Why your card doesn't fit/.test(insp1) && /The scroll needed/.test(insp1), 'inspection shows the wrong card\'s "why not" line and what the scroll needed');
  check(/Monster Hunt/.test(insp1), 'inspection says how to finish it');
  check(!/materials buy a retry/.test(insp1), 'night 1 doesn\'t offer the retry yet');
  await shot('inspect-wrong');
  await page.click('#dr-next'); await wait(20);
  await placeAt();

  // A wrong slot at Guess also goes up (every miss leaves scaffolding), and gets a free retry on its twin.
  await page.evaluate(() => {
    const r = SD.draft.run(), it = r.items.find(i => !i.done), used = r.items.map(i => i.q), town = SD.draft.save().town;
    const q = SD.topicDrill.base().find(x => x.type === 'multi' && SD.draft.twinFor(x.id) && !used.includes(x.id) && !town[x.id]);
    it.q = q.id; it.pick = []; SD.state.persist(); SD.draft.open();
  });
  await wait(20);
  await openFirst();
  const info2 = await draftAndSeal(1, 0);
  check(await page.evaluate(id => SD.state.save.wall.some(w => w.id === id) && SD.draft.save().town[id].scaf, info2.q), 'a Guess miss also goes on the Wall, under scaffolding');
  check(!!await page.$('#dr-twin') && /free/.test(await txt()), 'a miss offers a free retry on its twin, right away');
  await shot('free-retry');
  const fl2 = (await run()).floors;
  await page.click('#dr-twin'); await wait(20);
  const rt2 = await page.evaluate(() => JSON.parse(JSON.stringify(SD.draft.save().retry)));
  check(await title() === 'ARCHITECT\'S DRAFT · RETRY' && rt2.q !== info2.q && rt2.retry.poster === info2.q && !rt2.paid, 'the free retry asks its twin, not the same question');
  check(await page.evaluate(() => SD.draft.save().mat) === 0, 'the free retry costs nothing');
  const tw2 = await page.evaluate(() => { const q = SD.exam.find(SD.draft.save().retry.q); return { n: SD.draft.slotsOf(q), right: SD.draft.cards(q).map((t, i) => i).filter(i => SD.draft.cardOk(q, i)) }; });
  for (const i of tw2.right.slice(0, tw2.n)) await page.click(`#panel [data-i="${i}"]`);
  await page.click('#panel [data-c="0"]'); await wait(20);
  check(await title() === 'INSPECTION' && !await page.$('#dr-twin'), 'the retry has its own inspection, with no retry of its own');
  check((await run()).floors === fl2 + 1, 'a right retry at Guess adds its floor to the building');
  await page.click('#dr-next'); await wait(20);
  check(await title() === 'PINGSBY\'S QUARTER · PLACE IT', 'after the retry, the building goes to placement');
  await placeAt();
  await page.evaluate(id => { const w = SD.state.save.wall; w.splice(w.findIndex(x => x.id === id), 1); }, info2.q);
  check(await page.evaluate(id => { SD.draft.town(); const b = SD.draft.save().town[id]; return !b.scaf && b.fin === 1; }, info2.q), 'when its poster comes down, the scaffolding comes off for good');
  check(await page.evaluate(id => SD.draft.scaffoldFor(id) === null, info2.q), 'scaffoldFor is null once finished');

  // ---- The rest of the session (one blueprint, then the two build orders), then results ----
  const seqModes = [];
  for (let i = 0; i < 10; i++) {
    if (await title() !== 'ARCHITECT\'S DRAFT') break;
    await openFirst();
    if (await isSeqOpen()) {
      if (!seqModes.length) {
        await page.waitForSelector('#panel .qf');
        check(/New format: Sequence/.test(await txt()) && /ARCHITECT'S DRAFT · BUILD ORDER/.test(await title()), 'the first build order is worked through, in the Draft\'s own panel');
        await noHScroll('build order, worked');
        await shot('seq-worked');
      } else if (seqModes.length === 1) {
        await page.waitForSelector('#panel .qf');
        check(/Practice/.test(await txt()) && /Hint:/.test(await txt()), 'the second build order is practice, with a hint');
        await shot('seq-practice');
      }
      const m = await playSeq(true, 1);
      seqModes.push(m.mode);
      const after = await title();
      check(after === 'ARCHITECT\'S DRAFT · RESULTS' || (/not scored/.test(await txt()) && after === 'ARCHITECT\'S DRAFT'), `an unscored build order (${m.mode}) goes back to the board, saying so (or on to results)`);
      check(await page.evaluate(id => !SD.draft.save().town[id], m.x.id), 'an unscored build order puts up no building');
      continue;
    }
    await sealAndPlace(0, 1);
    await wait(10);
  }
  check(seqModes.length === 2 && seqModes[0] === 'worked', `both build orders were played (${seqModes.join(', ')})`);
  check(await title() === 'ARCHITECT\'S DRAFT · RESULTS', 'after the last client, the results screen');
  const res = await txt();
  check(/Standing: 2/.test(res) && /Scaffolding: 2/.test(res), 'results count standing and scaffolding (unscored build orders in neither)');
  check(/Misses to the Wall: 2/.test(res), 'results count every miss that went on the Wall');
  check(/Twin retries: 1/.test(res), 'results count the twin retries');
  check(/Tonight in Pingsby's Quarter/.test(res) && await page.$$eval('#panel .dr-plot.tonight', els => els.length) === 4, 'results open on the Quarter, with tonight\'s four buildings outlined');
  check(/How sure you were/.test(res) && /blueprint by blueprint/.test(res), 'results show calibration per blueprint');
  check(await page.evaluate(() => { const t = SD.draft.run().tally; return [0, 1, 2].reduce((a, c) => a + t[c][1], 0); }) === 5, 'calibration counts one entry per scored question (four blueprints and one retry)');
  check(/Ideas touched/.test(res) && /Why did that work/.test(res), 'results list the ideas touched, and Pip asks his question');
  check(await page.evaluate(() => SD.state.save.shards | 0) === xp0 + 5, 'the session pays 5 shards');
  const share = await page.evaluate(() => { const r = SD.draft.run(); return r.mapMs / Math.max(1, r.mapMs + r.qMs); });
  check(share >= 0 && share < 1, `the run logs map time and question time (map share ${share.toFixed(2)} in this scripted run)`);
  await noHScroll('results');
  await shot('results');
  await page.click('#dr-q');
  await wait(20);

  // ---- Pingsby's Quarter ----
  check(await title() === 'PINGSBY\'S QUARTER', 'the results open Pingsby\'s Quarter');
  check(await page.$$eval('#panel .dr-plot.built', els => els.length) === 4, 'four buildings on the map');
  check(await page.$$eval('#panel .dr-ptag', els => els.some(e => /[▲■●◆][1-4] 🚧/.test(e.textContent))), 'a building\'s tag shows its domain as a shape and a number, and scaffolding as an icon');
  await noHScroll('quarter');
  await shot('quarter');
  await page.click('#dr-vlist'); await wait(10);
  const ql = await txt();
  check(/🚧 Scaffolding/.test(ql) && /🏛 Standing/.test(ql) && /empty plots? under delete markers/.test(ql), 'Map as list reads without colour: Standing or Scaffolding in words');
  await page.click('#panel .dr-prow[data-bq]'); await wait(10);
  check(/Plaque/.test(await txt()), 'a building opens its plaque');
  await shot('plaque');
  check(await page.evaluate(() => SD.draft.run() === null), 'a finished session clears the run');
  check(/standing/.test(await page.evaluate(() => SD.draft.status() || '')), 'the picker line shows the Quarter\'s count');

  // ---- Night 2: materials and the twin retry ----
  await page.evaluate(() => { SD.state.save.draft.nights = [new Date('2026-11-15T12:00:00').toDateString()]; });
  await page.evaluate(() => { SD.draft.open(); }); await wait(30);
  check(await title() === 'NEW TONIGHT: MATERIALS', 'night 2 opens one new rule: materials');
  await shot('night2');
  await page.click('#dr-rule'); await wait(20);
  await seqLast(); await wait(20);
  check(await page.evaluate(() => SD.draft.level()) === 2 && /🧱 Materials/.test(await txt()) && !/⭐/.test(await txt()), 'night 2 shows materials, not reputation yet');
  // The neighbour rule, then a real placement beside a building of the same domain.
  check(await page.evaluate(() => { const R = SD.draft.rules; const g = { 0: 1, 2: 1, 6: 2 }; const a = R.gains(g, 1, 1, 2), b = R.gains(g, 1, 1, 1), c = R.gains(g, 11, 2, 3), e = R.gains(g, 11, 2, 3, false); return a.mat === 2 && a.rep === 0 && b.mat === 0 && c.rep === 1 && c.mat === 1 && e.rep === 0; }), 'materials come from same-domain neighbours (night 2 on), reputation from standing riverside buildings (night 3 on)');
  const m0 = await page.evaluate(() => SD.draft.save().mat);
  await openFirst();
  const info3 = await draftAndSeal(0, 0);
  await page.click('#dr-next'); await wait(20);
  const target = await page.evaluate(id => {
    const d = SD.draft.save().town[id].d, g = SD.draft.grid(), R = SD.draft.rules;
    const dg = {}; Object.keys(g).forEach(p => { dg[p] = g[p].d; });
    return SD.draft.freePlots().map(p => [p, R.gains(dg, p, d, 2).mat]).sort((a, b) => b[1] - a[1])[0];
  }, info3.q);
  await placeAt(target[0]);
  check(await page.evaluate(() => SD.draft.save().mat) === m0 + target[1], `placing earns one material per same-domain neighbour (+${target[1]})`);
  // A scaffolded building and materials to spend: retry its twin.
  const rq = await page.evaluate(() => {
    const d = SD.draft.save(); d.mat = 3;
    let twinned = Object.values(d.town).find(b => b.scaf && SD.draft.twinFor(b.q));
    if (!twinned) {
      // Most multiple-response questions have no twin yet, so stand one up the way a miss would.
      const q = SD.topicDrill.base().find(x => x.type === 'multi' && SD.draft.twinFor(x.id) && !d.town[x.id]);
      if (!q) return null;
      SD.today.wallAdd(q.id);
      twinned = d.town[q.id] = { q: q.id, d: SD.exam.domainOf(q) || 1, client: 'kai', floors: 1, cracks: 0, scaf: true, t: Date.now(), plot: SD.draft.freePlots()[0] };
    }
    return twinned.q;
  });
  if (rq) {
    check(await page.evaluate(id => SD.draft.canRetry(id), rq), 'a scaffolded building with a twin and enough materials can be retried');
    await page.evaluate(id => SD.draft.retry(id, null), rq); await wait(20);
    const rt = await page.evaluate(() => JSON.parse(JSON.stringify(SD.draft.save().retry)));
    check(await title() === 'ARCHITECT\'S DRAFT · RETRY' && rt.q !== rq && rt.retry.poster === rq, 'the retry asks its twin, never the same question');
    check(await page.evaluate(() => SD.draft.save().mat) === 2, 'the retry costs one material');
    check(!await page.$('#dr-back'), 'a paid retry can\'t be backed out of');
    const tw = await page.evaluate(() => { const q = SD.exam.find(SD.draft.save().retry.q); return { n: SD.draft.slotsOf(q), right: SD.draft.cards(q).map((t, i) => i).filter(i => SD.draft.cardOk(q, i)) }; });
    for (const i of tw.right.slice(0, tw.n)) await page.click(`#panel [data-i="${i}"]`);
    await page.click('#panel [data-c="1"]'); await wait(20);
    check(await title() === 'INSPECTION' && /Seymour:/.test(await txt()), 'the retry has its own inspection');
    await page.click('#dr-next'); await wait(20);
    check(await page.evaluate(() => SD.draft.save().retry === null), 'the retry is cleared once sealed');
    check(/Since your last move: the twin held/.test(await txt()), 'after the retry, one line says how it went');
  } else check(false, 'a scaffolded building with a twin to retry');

  // ---- Night 2's build orders: scored now ----
  // Finish night 2's blueprints, then a build order missed at Sure, then its comeback.
  await page.evaluate(() => SD.draft.open()); await wait(20);
  for (let i = 0; i < 10; i++) {
    if (await title() !== 'ARCHITECT\'S DRAFT') break;
    if (await page.evaluate(() => { const r = SD.draft.run(); return r.items.filter(it => !it.done)[0].seq; })) break;
    await openFirst();
    await sealAndPlace(0, 1);
  }
  await openFirst();
  check(await isSeqOpen(), 'night 2 brings its build orders after the blueprints');
  await page.waitForSelector('#panel .qf');
  check(!/Practice/.test(await txt()) && await page.$$eval('#panel .qf-chip', els => els.length) > 2, 'after the first two, a build order is scored: steps and decoys to place');
  const fr = (await run()).floors, wall0 = await page.evaluate(() => SD.state.save.wall.length);
  const sq = await page.evaluate(() => { const r = SD.draft.run(); return r.items[r.open].q; });
  for (const i of await page.evaluate(id => SD.draft.seqFind(id).steps.map((_, k) => k), sq)) await page.click(`#panel [data-qf-pool="s${i}"]`);
  await page.click('#qf-submit'); await wait(10);
  check(/\+3/.test(await txt()) && /−3/.test(await txt()), 'the build order\'s confidence buttons show the Draft\'s stakes');
  await noHScroll('build order, scored');
  await shot('seq-scored');
  // Change answer: send every step back, then place them with the first two swapped.
  await page.click('#qf-change'); await wait(10);
  const n2 = await page.evaluate(id => SD.draft.seqFind(id).steps.length, sq);
  for (let k = 0; k < n2; k++) await page.click('#panel .qf-slot[data-qf-slot="0"]');
  for (const i of [1, 0].concat(Array.from({ length: n2 - 2 }, (_, k) => k + 2))) await page.click(`#panel [data-qf-pool="s${i}"]`);
  await page.click('#qf-submit'); await wait(10);
  await page.click('#panel .qf [data-c="2"]'); await wait(10);
  check(/NOT QUITE|PARTLY RIGHT/.test(await txt()), 'the engine shows its own feedback first');
  await page.click('#q-next'); await wait(20);
  r = await run();
  check(await title() === 'INSPECTION' && /SCAFFOLDING/.test(await txt()) && /comes back first/.test(await txt()), 'a missed build order: Seymour\'s inspection, scaffolding, and it comes back');
  check(r.floors - fr === -3, `a Sure miss on a build order costs −3 floors (${r.floors - fr})`);
  check(await page.evaluate(id => { const b = SD.draft.save().town[id]; return b.seq && b.scaf && b.cracks === 1; }, sq), 'its building stands under scaffolding, with a crack');
  check(await page.evaluate(n => SD.state.save.wall.length === n, wall0), 'a build order is not an exam question, so nothing goes on the Wall');
  check(await page.evaluate(id => SD.draft.seqLog()[id].miss === 1 && SD.draft.pickSeq(null, 2)[0].id === id, sq), 'the missed build order comes back first');
  await shot('seq-inspect');
  await page.click('#dr-next'); await wait(20);
  check(await title() === 'PINGSBY\'S QUARTER · PLACE IT', 'a scored build order goes to placement');
  await placeAt();
  // Its comeback: the next build order is the same one, played right.
  await page.evaluate(id => { const r = SD.draft.run(), it = r.items.find(i => !i.done && i.seq); it.q = id; it.client = SD.draft.save().town[id].client; SD.state.persist(); SD.draft.open(); }, sq);
  await wait(20);
  await openFirst();
  await playSeq(true, 1);
  check(await title() === 'INSPECTION' && /IT HOLDS/.test(await txt()), 'got right on its comeback, the build order holds');
  check(await page.evaluate(id => { SD.draft.town(); const b = SD.draft.save().town[id]; return !b.scaf && b.fin === 1 && SD.draft.seqLog()[id].miss === 0; }, sq), 'and the scaffolding comes off for good');
  await page.click('#dr-next'); await wait(20);
  await page.evaluate(() => SD.draft.quarter()); await wait(20);
  await page.click(`#panel [data-bq="${sq}"]`); await wait(10);
  check(/Plaque · build order/.test(await txt()) && /scaffolding came off when its build order held/.test(await txt()), 'its plaque says it is a build order and how it was finished');

  // ---- Night 3: reputation, the second tier, and Ayo ----
  check(await page.evaluate(() => { const d = SD.draft.save(); d.nights = ['a', 'b', 'c']; d.rep = 0; const a = SD.draft.clientsOpen().length; d.rep = 3; const b = SD.draft.clientsOpen(); return a === 4 && b.includes('marrow') && b.includes('pip') && !b.includes('coo'); }), 'reputation brings a second tier of clients (Coo stays foreman)');
  check(await page.evaluate(() => { SD.state.save.flags.ch5 = true; const ok = SD.draft.foreman().name === 'Ayo' && SD.draft.clientsOpen().includes('coo'); SD.state.save.flags.ch5 = false; return ok; }), 'after chapter 5, Ayo is the foreman and Coo becomes a client');

  // ---- A preset with few multiple-response questions still fills ----
  const pre = await page.evaluate(() => SD.draft.pickSession('pair-cognito').map(it => (it.seq ? { t: 'seq', topic: SD.draft.seqFind(it.q).topic } : { t: SD.exam.find(it.q).type, v: SD.topicDrill.isVerified(SD.exam.find(it.q)) })));
  check(pre.filter(x => x.t === 'seq').every(x => x.topic === 'cognito'), 'a topic preset brings build orders on its own topic when it has them');
  check(pre.length >= 5, `a narrow preset still fills a session (${pre.length})`);

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} failed` : '\nall passed');
  process.exit(fails.length ? 1 : 0);
})();
