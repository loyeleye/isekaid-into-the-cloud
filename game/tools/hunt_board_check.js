// Headless check of Monster Hunt's boards on screen (js/hunt-board.js, in js/hunt.js's hunt, on the full-screen stage) at phone width (375px; W=1280 H=800 for wide):
// an SQS poster battles on a board (plan, deploy, the run, what each card really did), a fix that didn't hold leaves
// the oil burned and offers a re-plan, the real fix catches it, the Debrief is the poster's twin, asked by Bru in the
// street with the monster in its jar (js/hunt-debrief.js), and counts on the Wall, Stop for now mid-board resumes on the same board, a catch moves the monster up its ladder,
// and Bru's yard starts narrow (teach boards first), refuses a FIFO-only card on a standard queue for AWS's reason,
// and records stars. No horizontal scroll on any of these screens.
// Run from game/:  node tools/hunt_board_check.js     SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain', '.mp4': 'video/mp4' };
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
  const W = +process.env.W || 375, H = +process.env.H || 667;   // W=1280 H=800 for a wide screen
  const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SHOTS ? 2 : 1 });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  const shot = async name => { if (!SHOTS) return; await page.waitForTimeout(300); await page.evaluate(() => document.querySelectorAll('.sysnote').forEach(e => e.remove())); await page.screenshot({ path: path.join(SHOTS, 'board-' + name + '.png'), fullPage: false }); };
  const noHScroll = async where => {
    const r = await page.evaluate(() => {
      const w = innerWidth, bad = [];
      if (document.documentElement.scrollWidth > w) bad.push('document ' + document.documentElement.scrollWidth);
      // The street inside .hs-view is a painted panorama that pans sideways on a phone: the view itself must fit.
      document.querySelectorAll('#panel:not([hidden]) .win *').forEach(el => {
        // So does the hand under it, which scrolls sideways as one strip of cards.
        if ((el.closest('.hs-view') && !el.classList.contains('hs-view')) || (el.closest('.hb-hand') && !el.classList.contains('hb-hand'))) return;
        const b = el.getBoundingClientRect();
        if (b.width && (b.right > w + 1 || b.left < -1)) bad.push((el.id || el.className || el.tagName) + ' ' + Math.round(b.left) + '..' + Math.round(b.right));
      });
      return bad.slice(0, 5);
    });
    check(!r.length, `no horizontal scroll at ${W}px (${where})${r.length ? ': ' + r.join(', ') : ''}`);
  };
  const text = () => page.textContent('#panel');
  const shotAt = async (name, sel) => { if (!SHOTS) return; await page.evaluate(q => { const e = document.querySelector(q); if (e) e.scrollIntoView({ block: 'start' }); }, sel); await shot(name); };
  const card = id => page.click(`#panel [data-card="${id}"]`);
  const deploy = async () => { await page.click('#hb-deploy'); await page.waitForSelector('#hb-next', { timeout: 20000 }); };

  await page.clock.install({ time: new Date('2026-11-16T12:00:00') });
  await page.addInitScript(() => { try { if (!sessionStorage.getItem('hb-check')) { localStorage.clear(); sessionStorage.setItem('hb-check', '1'); } } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  check(await page.evaluate(() => !!(SD.huntCore && SD.huntBoard && SD.awsSim && SD.awsSim.bucket)), 'the boards and their rules load');
  // In the page, with every other mode's rules loaded too (js/aws-sim-ops.js has its own AS.partitionOf): sharding
  // still spreads the hydra's writes, so its boards stay winnable.
  check(await page.evaluate(() => { const HC = SD.huntCore, b = HC.board('h-teach'); return [1, 2, 3].every(seed => { const r = HC.run(b, seed, ['shard'], b.lamp); return r.won && r.frames.every(f => !f.load || f.load.every(n => Number.isFinite(n))); }); }),
    'in the page, Write sharding still catches the Hot Key Hydra (no NaN partitions)');

  // One SQS poster with a twin.
  const poster = await page.evaluate(() => {
    const s = SD.state.save;
    s.examTrack = 'DVA'; s.examDate = '2026-11-30'; s.todaySkip = true;
    SD.huntBoard.STEP_MS = 1;
    const ok = q => q && SD.exam.allowed(q) && !SD.exam.offTrack(q) && (q.type === 'mc' || q.type === 'multi');
    const id = Object.keys(SD.twins).find(k => { const q = SD.exam.find(k); return ok(q) && q.topic === 'sqs' && SD.twins[k].map(SD.exam.find).some(ok); });
    s.wall = [{ id, t: Date.now() - 5 * 86400000, rights: [] }]; s.huntMon = {}; s.hunt = null; s.sightings = [];
    SD.state.persist();
    return id;
  });
  check(!!poster, 'an SQS poster with a twin (' + poster + ')');
  check(await page.evaluate(() => { const h = SD.hunt._newHunt(); const m = h.mons[0]; SD.state.save.hunt = null; return m.steps.join() === 'sim,fight' && m.qs.board === 'p-teach'; }), 'its battle is a board (the Poison Pill\'s teach board), then the Debrief');
  // On the full-screen stage, as the game's Monster Hunt card opens it.
  const stage = () => page.evaluate(() => SD.modeStage.enter(SD.modes.get('hunt')));
  await stage();
  await page.evaluate(() => SD.hunt.open());
  check(/Board/.test(await text()) && /Debrief/.test(await text()), 'the bounty board lists Board and Debrief for it');
  await shot('posters');
  await page.evaluate(() => { SD.hunt.start(); });
  for (let k = 0; k < 6 && !(await page.$('[data-mon]')); k++) { const nx = await page.$('#md-next, #hn-wnext'); if (nx) await nx.click(); await page.waitForTimeout(60); }
  await page.waitForSelector('[data-mon]'); await page.click('[data-mon]');
  await page.waitForSelector('#hb-deploy');
  const plan = await text();
  check(/One bad order/.test(plan) && /Poison Pill/.test(plan) && /Your hand/.test(plan) && /Deploy 1 of 3/.test(plan), 'the plan screen: the scenario, the monster on its tile, the hand, deploy 1 of 3');
  check(!/maxReceiveCount 3\.[^]*right|correct/i.test(plan), 'no card says whether it helps');
  await noHScroll('plan');
  await page.waitForTimeout(400);
  const fill = await page.evaluate(() => { const w = document.querySelector('#panel .win').getBoundingClientRect(), b = document.querySelector('#mode-bar').getBoundingClientRect();
    return { stage: document.body.dataset.stage, w: w.width / innerWidth, top: w.top - b.bottom, bottom: innerHeight - w.bottom }; });
  check(fill.stage === 'hunt' && fill.w > .99 && Math.abs(fill.top) < 2 && fill.bottom < 2, `no window box: the hunt fills the screen under the bar (${Math.round(fill.w * 100)}% wide)`);
  await shot('plan');
  // The hand reads as items: each card has a drawn icon (or its tile's emoji until one exists), its name, its AWS
  // setting on one small line, its cost in coins and its tile's marker.
  await page.waitForFunction(() => document.querySelector('#panel [data-card="dlq"] .hb-ic.img'), null, { timeout: 3000 }).catch(() => {});
  const hand = await page.evaluate(() => [...document.querySelectorAll('#panel [data-card]')].map(b => ({ id: b.dataset.card, img: b.querySelector('.hb-ic.img img') ? 1 : 0,
    rune: !b.querySelector('.hb-ic img') && getComputedStyle(b.querySelector('.hb-icf')).visibility === 'visible' ? 1 : 0,
    cfg: (b.querySelector('.hb-cfg') || {}).textContent || '', cost: !!b.querySelector('.hb-cost'), where: !!b.querySelector('.hb-where') })));
  check(hand.every(h => (h.img || h.rune) && h.cfg && h.cost && h.where), 'each card shows an icon (or its tile\'s emoji), its AWS setting, its cost and where it goes');
  check(hand.find(h => h.id === 'dlq').img && /maxReceiveCount 3/.test(hand.find(h => h.id === 'dlq').cfg), 'the DLQ card has its drawn icon, and its setting stays visible');
  await shotAt('hand', '#panel .hb-r');
  const scene = await page.evaluate(() => {
    const spots = [...document.querySelectorAll('#panel .hs-layer .hs-spot')];
    return { n: spots.length, bg: !!document.querySelector('#panel .hs-street img.hs-bg[src*="street"]'), bru: !!document.querySelector('#panel .hs-bru[data-pose="front"] img.hs-body[src*="body-front"]'),
      mon: !!document.querySelector('#panel .hs-spot[data-tile="queue"] .hs-mon .hb-spr.hb-stand'), road: !!document.querySelector('#panel .hs-road'),
      arrows: /↓/.test(document.querySelector('#panel .hs-row').textContent) };
  });
  check(scene.n === 3 && scene.bg && scene.bru && scene.mon && scene.road && !scene.arrows, 'the board is a live street: one painted street, Bru standing in it facing you, the monster at the queue, a road, no arrows');

  // A look-alike first: the longer visibility timeout.
  await card('vislong');
  check(/Longer visibility timeout ✕/.test(await text()), 'a placed card shows on its tile and can be taken back');
  await deploy();
  const a1 = await text();
  check(/THE FIX DIDN'T HOLD/.test(a1) && /not contained/.test(a1) && /still comes back, just less often/.test(a1), 'it didn\'t hold: the monster isn\'t contained, and the card says what it really does');
  check(/Change the plan/.test(a1) && /2 deploys left/.test(a1), 'a re-plan is offered, with the deploys left');
  await noHScroll('after');
  check(!!(await page.$('#panel .hb-back.miss .hb-badge')) && !(await page.$('#panel .hb-back.fix')), 'the card strip marks the look-alike ✗: not part of the fix');
  check(!!(await page.$('#panel .hb-res.bad .hb-escf .hb-spr')), 'the monster that got away is drawn escaping');
  await shot('after-miss');
  await shotAt('after-miss-cards', '#panel .hb-results');
  const oil1 = await page.evaluate(() => SD.state.save.hunt.mons[0].sim.oil);
  check(oil1 < 10, 'the oil it burned stays burned (' + oil1 + ' of 10 left)');

  // Stop for now mid-board, and resume on the same board.
  await page.click('#hb-next');
  await page.waitForSelector('#hb-deploy');
  check(/Deploy 2 of 3/.test(await text()), 'deploy 2 of 3');
  await page.evaluate(() => SD.hunt.stop());
  await stage();
  await page.evaluate(() => { SD.hunt.start(); });
  await page.waitForSelector('#hb-deploy');
  check(/Deploy 2 of 3/.test(await text()) && /Longer visibility timeout ✕/.test(await text()), 'Stop for now, then resume: the same board, deploy and plan');

  // The real fix.
  await page.click('#panel [data-un="vislong"]');
  await card('dlq');
  check(!!(await page.$('#panel .hb-jar')), 'the dead-letter jar shows on the queue once the DLQ is placed');
  await deploy();
  const a2 = await text();
  check(/CAUGHT ★☆☆/.test(a2) && /dead-letter jar after its 3rd failed receive/.test(a2), 'the DLQ holds: caught, 1 star on a second deploy');
  check(/Debrief: why did that work\?/.test(a2), 'then the Debrief');
  check(!!(await page.$('#panel .hb-back.fix .hb-badge')) && !!(await page.$('#panel .hb-res.ok .hb-jarf .hb-spr')), 'caught: the monster is in a jar, and the DLQ card is marked ✓');
  await shot('caught');
  await shotAt('caught-cards', '#panel .hb-results');
  await page.click('#hb-next');
  await page.waitForSelector('#panel .win.quiz');
  check(/Debrief: why did that work/.test(await page.textContent('#panel .q-ctx')), 'the Debrief is on the exam screen, and says so');
  await noHScroll('Debrief');
  // The Debrief is a scene in the same street, not a box: Bru full size asking it on a card over the scene, the
  // monster she just caught in its jar beside her, the answers as cards along the bottom, her line still aria-live.
  const deb = await page.evaluate(() => {
    const w = document.querySelector('#panel .win.quiz'), sc = w && w.querySelector('.hd-scene');
    return { street: !!(sc && sc.querySelector('.hs-street img.hs-bg[src*="street"]')), bru: !!(sc && sc.querySelector('.hs-bru img.hs-body[src*="body-"]')),
      jar: !!(sc && sc.querySelector('.hd-mon.jarred .hd-jar img.hd-spr[src*="poison"]')), live: !!(sc && sc.querySelector('.hs-say[aria-live="polite"]:not([hidden])')),
      card: !!w.querySelector('.hd-card .q-q'), sat: w.querySelectorAll('.hd-sat .opts button.opt').length, conf: w.querySelectorAll('.hd-sat .conf [data-c]').length,
      hp: !!(innerWidth > 700 ? sc && sc.querySelector('.hd-hp .hn-hp') : w.querySelector('.hd-card .hn-hp')), mood: sc && sc.querySelector('.hs-bru').dataset.mood };
  });
  check(deb.street && deb.bru && deb.jar && deb.live && deb.card && deb.sat >= 2 && deb.conf === 3 && deb.hp,
    'the Debrief is in the street: Bru asks it on a card, the caught monster sits in its jar beside her, the answers are cards along the bottom ' + JSON.stringify(deb));
  check(!['grin', 'smile', 'frown'].includes(deb.mood), 'Bru doesn\'t react before you answer (' + deb.mood + ')');
  await shot('debrief');
  const dq = await page.evaluate(() => { const m = SD.state.save.hunt.mons[0]; return { q: SD.hunt.live().q.id, fight: m.qs.fight }; });
  check(dq.q === dq.fight && dq.q !== poster, 'it asks the poster\'s twin');
  await page.evaluate(async () => {
    const q = SD.hunt.live().q, wait = ms => new Promise(r => setTimeout(r, ms));
    if (q.type === 'mc') document.querySelector(`#panel [data-o="${q.a}"]`).click();
    else q.items.forEach((it, i) => { if (it.ok) document.querySelector(`#panel [data-m="${i}"]`).click(); });
    await wait(10); document.querySelector('#panel [data-c="1"]').click(); await wait(10);
  });
  const react = await page.evaluate(() => { const sc = document.querySelector('#panel .hd-scene'); return sc && { mood: sc.querySelector('.hs-bru').dataset.mood, pose: sc.querySelector('.hs-bru').dataset.pose, card: !!document.querySelector('#panel .hd-card .verdict.ok') }; });
  check(react && react.card && ['grin', 'smile'].includes(react.mood) && react.pose === 'front', 'right: the verdict and feedback stay in the scene, and Bru grins, turned to you ' + JSON.stringify(react));
  await shot('debrief-right');
  await page.click('#q-next');
  await page.waitForTimeout(80);
  check(!(await page.$('.hd-scene')), 'the Debrief scene is gone once you continue');
  const out = await page.evaluate(id => ({ m: SD.state.save.hunt && SD.state.save.hunt.mons[0], rec: SD.state.save.huntMon[id], w: SD.state.save.wall.find(x => x.id === id) }), poster);
  check(out.m && out.m.out === 'wounded', 'right today but not two days yet: wounded, as the Wall\'s rule says (' + (out.m && out.m.out) + ')');
  check(out.w && out.w.rights && out.w.rights.length === 1, 'the Debrief answer counted on the Wall');
  check(out.rec && out.rec.simWins === 1, 'a caught board moves the monster up its ladder');
  check(await page.evaluate(id => SD.hunt._boardOf(id, SD.state.save.huntMon[id]) !== 'p-teach', poster), 'next time it gets a tighter board');
  check(await page.evaluate(() => (SD.state.save.huntYard['p-teach'] || {}).stars === 1), 'the catch is recorded in the yard too');

  // Bru's yard.
  await page.evaluate(() => { SD.ui.closePanel(); SD.huntBoard.yard(); });
  await page.waitForSelector('[data-yb]');
  const yard = await page.evaluate(() => [...document.querySelectorAll('[data-yb]')].map(b => b.dataset.yb + ':' + (b.getAttribute('aria-disabled') ? 'locked' : 'open')));
  check(yard.includes('p-teach:open') && yard.includes('h-teach:open') && yard.includes('h-tight:locked') && yard.includes('boss:locked'), 'the yard starts narrow: first boards open, the rest locked');
  check(yard.includes('p-fifo:open'), 'catching the Poison Pill\'s first board opens its tighter boards');
  await noHScroll('yard');
  await shot('yard');
  await page.click('[data-yb="p-fifo"]');
  await page.waitForSelector('#hb-deploy');
  await card('dlq');
  check(/A FIFO queue can only use a FIFO dead-letter queue/.test(await text()) && /Refused here/.test(await text()), 'a standard DLQ on a FIFO queue is refused, with AWS\'s reason');
  await shot('refused');
  await card('dlqfifo');
  await deploy();
  check(/CAUGHT ★★/.test(await text()), 'the FIFO DLQ holds on the first deploy: 2 or 3 stars');
  await page.click('#hb-next');
  await page.waitForSelector('[data-yb]');
  check(await page.evaluate(() => (SD.state.save.huntYard['p-fifo'] || {}).stars >= 2), 'the yard records the stars');
  // A board with a gate: the bucket and the 429 stamp show during the run.
  await page.evaluate(() => { SD.huntBoard.STEP_MS = 60; });
  await page.click('[data-yb="g-teach"]');
  await page.waitForSelector('#hb-deploy');
  await shotAt('hand-gate', '#panel .hb-r');
  await page.click('#hb-deploy');
  // Read the stamp and the bucket on the same frame: the run keeps redrawing.
  const gate = await page.waitForFunction(() => { const p = document.querySelector('#panel'); return /429 ×/.test(p.textContent) && !!p.querySelector('.hb-bucket') && !!p.querySelector('.hs-road .hs-mv.back') && !!p.querySelector('.hb-say[aria-live]') && !p.querySelector('.hb-log') && !!p.querySelector('.hs-bru[data-pose="side"]'); }, null, { timeout: 5000 }).then(() => true, () => false);
  check(gate, 'the gate: marbles in the bucket, a 429 stamp, crates bouncing back up the road, one Bru line instead of a log, and Bru turned to watch');
  await shot('gate-run');
  await noHScroll('run');
  await page.evaluate(() => { const k = document.querySelector('#hb-skip'); if (k) k.click(); });   // the run may have ended already
  await page.waitForSelector('#hb-next', { timeout: 20000 });

  check(!errors.length, 'no page errors' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close(); server.close();
  console.log(fails.length ? `\n${fails.length} failed:\n${fails.join('\n')}` : '\nOK: the Monster Hunt board checks all pass, no errors.');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
