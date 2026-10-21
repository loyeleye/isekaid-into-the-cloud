// Headless playthrough of the vector proof of concept (index.html?vector): the opening ("the files") and choosing a
// file, then chapter 1 as tools/ch1_check.js plays it, then the chapter 2 slice to its "to be continued" card.
// Fails on any page error or console error, and on any request for a painted or generated image (.webp, .png,
// .jpg, .gif): every picture in this build is drawn in code, except the opening's painted stills (assets/img/opening).
// Chapter 2 starts from chapter 1's #c1-next with its act 1 world marked done (tools/c2_check.js walks the world), so
// this plays the stair, Expedition I on the raid engine, and the camp.
// Run from game/:  node tools/vector_check.js [mira|kai|seoyeon|dutch] [--win]   SHOTS=dir saves screenshots.
const { chromium } = require('playwright');
const ch1Step = require('./ch1_step');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const WIN = process.argv.includes('--win');
const SHOTS = process.env.SHOTS;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 420), height: Number(process.env.H || 860) } });
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  // Chapter 1 plays as tools/ch1_check.js plays it (tools/ch1_step.js); SD_TEST opens the mines' test hook.
  await page.addInitScript(`window.SD_TEST = 1; window.__ch1step = ${ch1Step.toString()};`);
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.click('#t-new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };

  const seen = new Set(), last = [], shotsTaken = new Set();
  let steps = 0;
  for (; steps < 30000; steps++) {
    const what = await page.evaluate(([WIN, LEAD]) => {
      const vis = el => el && !el.hidden && el.offsetParent !== null;
      const $ = s => document.querySelector(s);
      const click = el => { el.click(); return true; };
      const sv = SD.state.save, c1 = sv.c1;
      if (($('#v2-end') && vis($('#v2-end'))) || (SD.c2xworld && SD.c2xworld.active)) return 'end2';   // or part 2 (js/c2x-world.js) took over at the lift
      if (!window.__c2 && $('#c1-next') && vis($('#c1-next'))) return 'done';
      // The visual-novel prologue (js/vn.js): play each moment as it appears, then read on.
      const vn = $('#vn');
      if (vn && !vn.hidden) {
        window.__vnShots = window.__vnShots || {};
        const keep = vn.querySelector(`[data-keep="${LEAD}"]`);
        if (keep && vis(keep)) { if (!window.__vnShots.files) { window.__vnShots.files = 1; return 'scene:opening-files'; } return click(keep) && 'vn-keep'; }
        const file = vn.querySelector(`.vf-file[data-lead="${LEAD}"]`);
        if (file) return click(file) && 'vn-file';
        const card = vn.querySelector('.vc-card');
        if (card) { const k = 'card-' + card.querySelector('b').textContent.split(' ')[0].toLowerCase(); if (!window.__vnShots[k] && !card.querySelector('.vc-go').disabled) { window.__vnShots[k] = 1; return 'scene:opening-' + k; } }
        const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
        if (btn) { const k = 'act-' + vn.querySelector('.vn-panel').className.split(' ')[1]; if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:prologue-' + k; } return click(btn) && 'vn-act'; }
        const box = vn.querySelector('.vn-box');
        if (box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
        const k = (vn.classList.contains('vn-incg') ? vn.dataset.cg : vn.dataset.bg) + '-' + box.dataset.who;
        if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:vn-' + k; }
        box.click(); return 'vn-line';
      }
      if (!window.__c2) return window.__ch1step([WIN, LEAD]);
      if (!$('#dialog').hidden) {
        // The first line of each cutscene backdrop is left to finish typing for its screenshot.
        const st = $('#stage'), sc = !st.hidden && st.dataset.scene;
        window.__scenes = window.__scenes || {};
        if (sc && !window.__scenes[sc]) { window.__scenes[sc] = 1; return 'scene:' + sc; }
        const who = $('#dialog').dataset.who;
        if (sc && who !== 'narr' && !window.__scenes[sc + '-' + who]) { window.__scenes[sc + '-' + who] = 1; return 'scene:' + sc + '-' + who; }
        $('#dialog').click(); return 'dialog:' + ($('#dialog').dataset.who || '');
      }
      const p = $('#panel');
      if (!p.hidden) {
        const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
        let x;
        if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (!window.__leadSeen) { window.__leadSeen = 1; return 'lead-wait'; } return click(x) && 'lead'; }
        if ((x = b('#tm-y'))) return click(x) && 'enter-temple';
        if ((x = b('#q-said'))) return click(x) && 'said';
        window.__p2 = window.__p2 || {};
        const once = k => !window.__p2[k] && (window.__p2[k] = 1);
        if (b('#sd-go') && once('sd')) return 'scene:c2-sorting-desk';
        if (b('#v2-ship, #v2-quest, #v2-up') && once('camp' + p.querySelectorAll('button[disabled]').length)) return 'scene:c2-camp-' + p.querySelectorAll('button[disabled]').length;
        if ((x = b('#sd-go'))) { p.querySelectorAll('[data-i="3"], [data-i="8"]').forEach(click); return click(x) && 'sorting-desk'; }
        if ((x = b('#v2-ship, #v2-quest, #v2-up'))) return click(x) && 'camp:' + x.id;
        if ((x = p.querySelector('#q-num')) && !x.value) { x.value = /function.s timeout/.test(p.textContent) ? '180' : '10800'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
        if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The trust policy says who can assume the role, and the permissions say what it can do.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
        if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
        if (p.querySelector('[data-p]') && !p.querySelector('[data-p].on')) return click(p.querySelector('[data-p]')) && 'compass';
        const conf = b('.conf-b button');
        if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
        if (conf) return click(conf) && 'conf';
        if (p.querySelector('#skip') && (x = b('.card'))) return click(x) && 'card';
        if ((x = b('.primary'))) return click(x) && 'primary';
        if ((x = b('.opts .opt'))) return click(x) && 'opt2';
        if ((x = b('#skip, .ghost, #panel-x'))) return click(x) && 'ghost';
        return 'panel-wait';
      }
      // Chapter 2's Expedition I runs on the raid engine (js/raid.js): your seat plays as a bot, fast; --win wins each fight.
      const rd = vis($('#run')) && $('#run').querySelector('.rd'), RT = (SD.test || {}).raid;
      if (rd && RT && RT.G()) {
        const G = RT.G();
        if (!window.__paced) { window.__paced = 1; RT.pace(0.05); }
        const bk = rd.querySelector('#rd-back'); if (bk) return click(bk) && 'raid:back';
        const me = G.players[RT.me()]; if (me && !me.bot) me.bot = true;
        if (G.ph === 'fight' && G.tier === 'boss' && G.main && !(window.__boss = window.__boss || {})[G.main]) { window.__boss[G.main] = 1; return 'boss:' + G.main; }
        if (WIN && G.ph === 'fight' && !G.qs.length) { RT.win(); return 'raid:win'; }
        return 'raid-wait';
      }
      // Between chapter 2's scenes there's no run: the last fight's screen is left behind and mustn't be played.
      if (window.__c2 && !sv.run) return 'c2-wait';
      if (vis($('#run'))) {
        const end = $('#end-turn');
        if (end) {
          const C = SD.run.api.combat();
          if (C.busy) return 'combat-wait';
          if (window.__c2 && SD.enemies[C.eid].ch !== 2) return 'c2-wait';   // the last chapter 1 fight, still on screen under the gate
          // Chapter 2's bosses play one card first, for their screenshot.
          if (window.__c2 && C.boss && !(window.__boss = window.__boss || {})[C.eid]) { window.__boss[C.eid] = 1; return 'boss:' + C.eid; }
          if (WIN && C && !C.over && C.eid !== 'kyu' && C.eid !== 'lockeddoor') { C.sev = 0; SD.run.api.win(); return 'win'; }
          const c = [...$('#run').querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
          if (c) return click(c) && 'play:' + C.eid;
          return click(end) && 'end-turn';
        }
        const n = $('#run').querySelector('.node.can');
        if (n) return click(n) && 'node:' + n.className.split(' ')[1];
        return 'run-wait';
      }
      if (vis($('#screen-world')) && SD.ch1 && !SD.ch1.debug.busy()) {
        const f = c1.f, D = SD.ch1.debug, sc = D.scene();
        if (!f.intro) return 'world-wait';
        if (!f.cart) { sc.onTalk('cart'); return 'story:cart'; }
        if (!f.brief) {
          const pend = ['mira', 'kai', 'seoyeon', 'dutch'].filter(i => i !== c1.lead).find(i => sc.actors[i].marker);
          if (pend) { sc.onTalk(pend); return 'story:talk-' + pend; }
          sc.onTalk('freya'); return 'story:freya';
        }
        if (!f.board) { sc.onTalk('board'); return 'story:board'; }
        if (!f.tavern) { sc.onDoor('tavern'); return 'story:tavern'; }
        if (!f.kyu) { D.place(29, 9); return 'story:kyu'; }
        if (!f.shrine) { D.place(36, 9); return 'story:wren'; }
        if (!f.gate) { sc.onTalk('gate'); return 'story:gate'; }
        if (!sv.run) { D.place(59, 7); sc.onDoor('temple'); return 'story:temple'; }
        return 'world-wait';
      }
      return 'wait';
    }, [WIN, LEAD]);
    last.push(what); if (last.length > 16) last.shift();
    seen.add(what.replace(/^(node|dialog|play|scene):.*/, '$1'));
    if (/^story:|^node:|^play:/.test(what)) seen.add(what);
    // Screenshots of the main moments, once each.
    // (Typing runs on a timer, so each shot waits for the line to finish and the portraits to load.)
    const key = { 'lead-wait': 'lead-select', 'boss:postmistress': 'c2-postmistress', 'boss:belfry': 'c2-belfry', 'story:cart': 'camp', 'story:kyu': 'road', 'story:wren': 'brookfall', 'story:gate': 'temple' }[what]
      || (/^scene:/.test(what) && what.replace(':', '-'));
    if (key && !shotsTaken.has(key)) { shotsTaken.add(key); await page.waitForTimeout(1500); await shot(key); }
    if (/^play:(lockeddoor|uptimaboss|kyu)$/.test(what) && !shotsTaken.has(what)) { shotsTaken.add(what); await page.waitForTimeout(600); await shot(what.replace(':', '-')); }
    if (what === 'done') { await page.waitForTimeout(600); await shot('end'); await page.evaluate(() => { window.__c2 = 1; SD.state.save.c2 = { f: { act1: true, cold: true }, dev: {}, bonus: {} }; document.querySelector('#c1-next').click(); }); continue; }
    if (what === 'end2') { await page.waitForTimeout(800); await shot('c2-to-be-continued'); break; }
    await page.waitForTimeout(/wait$/.test(what) ? 120 : 30);
  }
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, flags: SD.state.save.c1 && SD.state.save.c1.f, level: SD.state.save.level, deck: SD.state.save.c1 && SD.state.save.c1.deck.length, c2: SD.state.save.c2 }));
  await browser.close(); server.close();
  console.log('steps', steps, JSON.stringify(sv));
  console.log('saw', [...seen].sort().join(' '));
  if (steps >= 30000) errors.push('the demo never finished; last actions: ' + last.join(' '));
  const need = ['m_board', 'm_locker', 'm_toll', 'm_ledge', 'm_mines', 'm_lift', 'm_op', 'm_log', 'm_rest1', 'm_rest2', 'm_rest3', 'summit', 'intro', 'cart', 'brief', 'board', 'tavern', 'kyu', 'shrine', 'guilty', 'gate', 'done'];
  const missing = need.filter(k => !sv.flags || !sv.flags[k]);
  if (missing.length) errors.push('story flags never set: ' + missing.join(', '));
  const scenes = ['wrongchair', 'notshopping', 'stew', 'salt', 'getup', 'suspect'].filter(k => !sv.flags || !sv.flags['s_' + k]);
  if (scenes.length) errors.push('camp scenes never played: ' + scenes.join(', '));
  const c2 = ['act1', 'won', 'ship', 'quest', 'done'].filter(k => !sv.c2 || !sv.c2.f[k]);
  if (c2.length) errors.push('chapter 2 flags never set: ' + c2.join(', '));
  if (!sv.c2 || !sv.c2.dev.redrive) errors.push('Coo\'s Redrive Stamp was never given');
  if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
  console.log(`OK: played the vector demo as ${LEAD} from the title through chapter 1 and the chapter 2 slice to "to be continued", no raster images, no errors.`);
})().catch(e => { console.error(e); process.exit(1); });
