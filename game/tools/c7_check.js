// Headless playthrough of the chapter 7 demo (index.html?vector&ch7): the title button, a lead pick, the camp the night
// before (every gift, Bru's board, Elder Wren, Uptima, all five pair scenes, Lexi's review, Kagemaru's stall), the lift
// (walked into with the arrow keys, its minigame played), the climb in the raid engine (every node clicked; with --win
// each fight is won through the test hook) with the roof, the vote, Freya and her last words, then the morning after,
// the Design Board, the epilogue and the end card. Fails on page or console errors, raster images, someone you can't
// walk up to, a card never earned, or a story flag never set.
// Run from game/:  NODE_PATH=$(npm root -g) node tools/c7_check.js [mira|kai|seoyeon|dutch] [--win]
//   SHOTS=dir saves screenshots; W and H set the viewport (default 390x844); CHOICE=vault|least|run sets chapter 6's
//   choice (default least).
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');

const ROOT = path.resolve(__dirname, '..');
const LEAD = ['mira', 'kai', 'seoyeon', 'dutch'].find(l => process.argv.includes(l)) || 'mira';
const WIN = process.argv.includes('--win');
// drawfirst: at the morning after, draw the Design Board before hearing Uptima's plan.
const DRAW = process.argv.includes('drawfirst');
// The chapter's storyboards (the painted pass), to list any boarded line the game never plays. Skipped if missing.
const BOARDS = process.env.BOARDS || '/mnt/project-files/storyboard/ch7';
const SHOTS = process.env.SHOTS, CHOICE = process.env.CHOICE || 'least';
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg', '.txt': 'text/plain', '.i8': 'application/octet-stream', '.md': 'text/plain' };
const server = http.createServer((req, res) => {
  const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!file.startsWith(ROOT) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

// Everyone and everything you can talk to must have a tile beside it you can walk to.
function reach() {
  const D = SD.c7world.debug, sc = D.scene();
  const m = D.BASE.map(r => r.split(''));
  const solid = 'TG#XV', H = m.length, Wd = m[0].length, seen = new Set(), q = [[21, 9]];
  const ok = (x, y) => y >= 0 && y < H && x >= 0 && x < Wd && !solid.includes(m[y][x]);
  while (q.length) {
    const [x, y] = q.pop(), k = x + ',' + y; if (seen.has(k)) continue; seen.add(k);
    if (m[y][x] === 'L') continue;
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { if (ok(x + dx, y + dy)) q.push([x + dx, y + dy]); });
  }
  const bad = [];
  Object.values(sc.actors).forEach(a => {
    if (a.id === 'ctl' || a.id === 'you' || SD.ch1story.order.includes(a.id)) return;
    if (/^pair/.test(a.id)) { if (!seen.has(a.x + ',' + a.y)) bad.push(a.id); return; }
    if (![[0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => seen.has((a.x + dx) + ',' + (a.y + dy)))) bad.push(a.id + '@' + a.x + ',' + a.y);
  });
  if (!seen.has('21,5') && !seen.has('22,5')) bad.push('the lift');
  return bad;
}

// One step: answer whatever is open, else play the raid, else walk the world to the next thing.
function step([WIN, LEAD]) {
  const $ = s => document.querySelector(s), vis = el => el && !el.hidden && el.offsetParent !== null, click = el => { el.click(); return true; };
  const once = k => { window.__once = window.__once || {}; if (window.__once[k]) return false; return (window.__once[k] = 1); };
  const W = SD.c7world;
  // The visual-novel scenes.
  const vn = $('#vn');
  if (vn && !vn.hidden) {
    const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
    if (btn) return click(btn) && 'vn-act';
    const box = vn.querySelector('.vn-box');
    if (!box || box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
    const k = (vn.classList.contains('vn-incg') ? vn.dataset.cg : vn.dataset.bg);
    if (once('vn-' + k)) return 'shot:vn-' + k;
    box.click(); return 'vn-line';
  }
  if (!$('#dialog').hidden) { $('#dialog').click(); return 'dialog:' + ($('#dialog').dataset.who || ''); }
  const p = $('#panel');
  if (!p.hidden) {
    const b = s => [...p.querySelectorAll(s)].find(x => !x.disabled && vis(x));
    let x;
    if ((x = p.querySelector(`[data-lead="${LEAD}"]`))) { if (once('lead')) return 'shot:lead-select'; return click(x) && 'lead'; }
    if (p.querySelector('#c7-end')) { if (once('end-shot')) return 'shot:c7-end-card'; return 'end'; }
    if ((x = b('#c7-go'))) return click(x) && 'go-up';
    if ((x = b('#c7-q'))) return click(x) && 'pair-q';
    if ((x = b('#c7-k'))) return click(x) && 'kyu-take';
    if ((x = b(window.__drawFirst ? '#c7-df' : '#c7-hf'))) return click(x) && (window.__drawFirst ? 'draw-first' : 'hear-first');
    // The roof's three drafts of Gary's Deny: the two wrong ones first, to play their scenes, then the right one.
    if (p.querySelector('[data-d]')) {
      if (once('drafts')) return 'shot:roof-drafts';
      window.__dr = (window.__dr || 0) + 1;
      return click(p.querySelector(`[data-d="${['roles', 'mgmt', 'root'][Math.min(window.__dr - 1, 2)]}"]`)) && 'draft:' + window.__dr;
    }
    // This chapter's minigames, played right (the answers are the games' own data).
    const g = SD.c6games && SD.c6games.cur, gp = p.querySelector('.g6');
    if (gp) {
      const title = g ? g.o.title : 'done';
      if (once('mg-' + title)) return 'shot:mg-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40);
      if ((x = b('#g6-cont'))) return click(x) && 'mg:continue';
      const pr = gp.querySelector('.g6-predict');
      if (g && pr && (x = [...pr.querySelectorAll('[data-p]')].find(el => !el.disabled && g.o.predict.opts[+el.dataset.p].ok))) return click(x) && 'mg:predict';
      if (g && pr && [...pr.querySelectorAll('[data-p]')].some(el => !el.disabled)) return 'mg-wait';
      if (g && g.kind === 'door') {
        if (!gp.querySelector('[data-f]')) return 'mg-wait';
        // The first try goes in with one chip wrong, to play the "why it fails" path too.
        const f0 = g.o.fields[1], wrongV = f0.opts.find(([v]) => v !== g.o.answer[f0.k])[0];
        if (once('door-wrong-' + title)) { const c = gp.querySelector(`[data-f="${f0.k}"][data-v="${wrongV}"]`); window.__doorWrong = 1; return click(c) && 'mg:chip-wrong'; }
        for (const f of g.o.fields) {
          if (window.__doorWrong && f === f0 && gp.querySelector('.g6-note.bad')) { window.__doorWrong = 0; }
          if (window.__doorWrong && f === f0) continue;
          const c = gp.querySelector(`[data-f="${f.k}"][data-v="${g.o.answer[f.k]}"]`); if (c && !c.classList.contains('on') && !c.disabled) return click(c) && 'mg:chip';
        }
        if ((x = b('#g6-try'))) return click(x) && 'mg:try';
      }
      if (g && g.kind === 'sort') {
        // The first check goes in with one row wrong, to play the "fix the red ones" path too.
        const rows = [...gp.querySelectorAll('.g6-row')].filter(r => !r.classList.contains('done'));
        for (const r of rows) {
          const i = +r.dataset.r, it = g.o.items[i];
          const wrong = once('wrong-' + title) ? (it.bin + 1) % g.o.bins.length : it.bin;
          if (!r.querySelector('button.on')) return click(r.querySelector(`[data-v="${wrong}"]`)) && 'mg:sort';
        }
        if ((x = b('#g6-go'))) return click(x) && 'mg:check';
      }
      if (g && g.kind === 'order') {
        // One step out of order first, then the right order.
        const left = [...gp.querySelectorAll('[data-s]')].map(el => +el.dataset.s);
        if (left.length > 1 && once('order-wrong-' + title)) return click(gp.querySelector(`[data-s="${Math.max(...left)}"]`)) && 'mg:step-wrong';
        if (left.length) return click(gp.querySelector(`[data-s="${Math.min(...left)}"]`)) && 'mg:step';
      }
      if (g && g.kind === 'pick') {
        // One line that should stay goes in on the first check, then only the ones that shouldn't be there.
        const st = window.__pk = window.__pk || {};
        const lines = [...gp.querySelectorAll('[data-l]')], isBad = el => !!g.o.lines[+el.dataset.l].bad;
        const marked = lines.filter(el => el.classList.contains('on') || el.classList.contains('gone')).length;
        if (marked < g.o.need) {
          const good = lines.find(el => !isBad(el) && !el.classList.contains('on'));
          if (!st[title] && good && !lines.some(el => el.classList.contains('on') && !isBad(el))) return click(good) && 'mg:pick-wrong';
          const bad = lines.find(el => isBad(el) && !el.classList.contains('on') && !el.classList.contains('gone'));
          if (bad) return click(bad) && 'mg:pick';
        }
        if ((x = b('#g6-go'))) { st[title] = 1; return click(x) && 'mg:check'; }
      }
      return 'mg-wait';
    }
    // Questions: the typed ones get the right number, or an answer that covers their points.
    if ((x = b('#q-said'))) return click(x) && 'said';
    if ((x = p.querySelector('#q-num')) && !x.value) {
      const t = p.textContent;
      x.value = /RPO this gives/.test(t) ? '190' : /RTO this gives/.test(t) ? '60' : /Replication Time Control/.test(t) ? '15' : /dollars a day/.test(t) ? '90' : /longest one KMS allows/.test(t) ? '30' : /in days/.test(t) ? '7' : '1';
      x.dispatchEvent(new Event('input', { bubbles: true })); return 'num';
    }
    if ((x = p.querySelector('#q-text')) && !x.value) {
      const t = p.textContent;
      x.value = /four prayers/.test(t) ? 'CloudTrail data events on Bru\'s prayer logs, the S3 object reads the Mailroom turned on, show the Champion\'s role, Kagemaru, read them an hour after Freya.'
        : 'The trust policy says who can assume the role, and the permissions policy says what it can do.';
      x.dispatchEvent(new Event('input', { bubbles: true })); return 'text';
    }
    if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
    if ((x = b('.ps-n'))) return click(x) && 'sort-guess';
    if ((x = [...p.querySelectorAll('.ps-tg')].find(g2 => !g2.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-one';
    const conf = b('.conf-b button');
    if (!conf && (x = b('.opts .opt:not(.on):not(.struck)'))) return click(x) && 'opt';
    if (conf) return click(conf) && 'conf';
    if ((x = b('.primary'))) return click(x) && 'primary';
    if ((x = b('#skip, .ghost, #panel-x'))) return click(x) && 'ghost';
    return 'panel-wait';
  }
  // The raid engine.
  const root = $('#run');
  if (vis(root)) {
    const rd = root.querySelector('.rd'), T = (SD.test || {}).raid;
    if (!rd || !T) return 'raid-wait';
    if (!window.__paced) { window.__paced = 1; T.pace(0.05); }
    let x;
    if ((x = rd.querySelector('#rd-back'))) { if (once('rdend-' + W.set + rd.textContent.slice(0, 30))) return 'shot:raid-end'; window.__paced = 0; return click(x) && 'raid:back'; }
    const G = T.G(), me = T.me(), ph = rd.dataset.ph;
    if (ph === 'fight') {
      const boss = rd.querySelector('.bossfight');
      if (boss && once('boss-' + G.boss)) return 'shot:boss-' + G.boss;
      if (!boss && once('fight-' + (G.foes && G.foes[0] && G.foes[0].boss))) return 'shot:foe-' + (G.foes && G.foes[0] && G.foes[0].boss);
      if (WIN) { if (T.hosting()) T.win(); return 'fight'; }
      const c = [...rd.querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
      if (c) return click(c) && 'play';
      if ((x = rd.querySelector('#rd-ready, [data-send*="ready"]'))) return click(x) && 'ready';
      return 'fight-wait';
    }
    if (ph === 'map') {
      if (once('map-' + W.set + G.fl)) return 'shot:raid-map-' + W.set + '-' + G.fl;
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
  // The world.
  if (!W || !W.active || !vis($('#screen-world')) || W.debug.busy()) return 'wait';
  const D = W.debug, sc = D.scene(), f = D.w().x, pairs = D.w().pairs, gifts = D.w().gifts;
  if (once('reach')) return 'reach';
  // Stand beside someone (not on a lantern) and talk to them.
  const go = id => {
    const a = sc.actors[id], spots = Object.values(D.PAIRS).map(p => p[0] + ',' + p[1]);
    const t = [[0, 1], [1, 0], [-1, 0], [0, -1]].map(([dx, dy]) => [a.x + dx, a.y + dy]).find(([x, y]) => !'TG#XVL'.includes(sc.tile(x, y)) && !spots.includes(x + ',' + y)) || [a.x, a.y + 1];
    D.place(t[0], t[1]); if (once('view-' + id)) return 'shot:view-' + id; sc.onTalk(id); return 'story:' + id;
  };
  const push = (id, x, y, key) => { D.place(x, y); return `key:${key}:${id}:0:${x}:${y}`; };
  if (!f.won) {
    const g = D.GIFTS.find(g2 => D.giftsDue().includes(g2) && !gifts.includes(g2[0]));
    if (g) return go(g[2]);
    if (!f.book) return go('bruP');
    if (!f.whose) return go('wren');
    const p = Object.keys(D.PAIRS).find(k => !pairs.includes(k));
    if (p) { D.place(D.PAIRS[p][0], D.PAIRS[p][1]); return 'pair:' + p; }
    // Lexi's review and Kagemaru's stall, once each.
    const did = window.__did = window.__did || {};
    for (const id of ['lexi', 'kage']) if (!did[id] && !sc.actors[id].hidden) { const r = go(id); if (r.startsWith('story')) did[id] = 1; return r; }
    if (!f.uptima) return go('uptima');
    return push('lift', 21, 6, 'ArrowUp');
  }
  if (!f.fireside) return 'fireside-wait';
  if (!f.restoreq) return go('seymour');
  if (!f.board) return go('dboard');
  return 'world-idle';
}

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html?vector&ch7`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const page = await browser.newPage({ viewport: { width: Number(process.env.W || 390), height: Number(process.env.H || 844) } });
  page.setDefaultTimeout(180000);
  const errors = [];
  page.on('pageerror', e => { errors.push('pageerror: ' + e.message); console.log('pageerror', e.stack); });
  page.on('request', r => { if (/\.(webp|png|jpe?g|gif)(\?|$)/i.test(r.url()) && !/\/assets\/img\/(opening|portraits|vn|cut|lead)\//.test(r.url())) errors.push('raster image requested: ' + r.url().replace(/^.*?\/assets\//, 'assets/')); });
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); if (m.type() === 'warning' && /qpick: no question/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(d => { window.SD_TEST = 1; window.__drawFirst = d; }, DRAW);
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  const btn = await page.textContent('#t-c7new');
  if (!/Play Chapter 7: Root/.test(btn)) errors.push('title button reads "' + btn + '"');
  const foot = await page.textContent('.t-foot');
  if (!/Chapter 7 demo: Root/.test(foot)) errors.push('title footer reads "' + foot + '"');
  // Chapter 6's choice, as if it had been made there.
  if (CHOICE !== 'least') await page.evaluate(c => { SD.state.save.c6 = Object.assign({}, SD.state.save.c6, { choice: c }); SD.state.persist(); }, CHOICE);
  await page.click('#t-c7new');
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const seen = new Set(), last = [];
  let steps = 0, ended = false;
  const T0 = Date.now();
  let same = 0, prev = '';
  for (; steps < 40000; steps++) {
    const what = await page.evaluate(step, [WIN, LEAD]);
    last.push(what); if (last.length > 20) last.shift();
    same = what === prev ? same + 1 : 0; prev = what;
    if (same >= 400) { errors.push('stuck on ' + what); break; }
    if (process.env.LOG && steps % 250 === 0) console.log(steps, Math.round((Date.now() - T0) / 1000) + 's', what);
    seen.add(what.replace(/:.*/, ''));
    if (/^(story|node|raid|mg|choice|end):/.test(what)) seen.add(what);
    if (what === 'reach') { const bad = await page.evaluate(reach); if (bad.length) errors.push('nobody can walk up to: ' + bad.join(', ')); await shot('area-near'); continue; }
    if (what.startsWith('shot:')) { if (SHOTS) { await page.waitForTimeout(900); await shot(what.slice(5)); } continue; }
    if (what.startsWith('key:')) {
      const [, key, id, thru, x, y] = what.split(':');
      const where = () => page.evaluate(() => { const s = SD.c7world.debug.scene(); return s ? [s.P.x, s.P.y] : null; });
      const past = P => P && ({ ArrowUp: P[1] < +y - 1, ArrowDown: P[1] > +y + 1, ArrowRight: P[0] > +x + 1, ArrowLeft: P[0] < +x - 1 })[key];
      // Hold the key (longer on a slow machine) until you're through, or a few seconds have gone by.
      await page.keyboard.down(key); await page.waitForTimeout(thru === '1' ? 700 : 350);
      for (let i = 0; thru === '1' && i < 16 && !past(await where()); i++) await page.waitForTimeout(250);
      await page.keyboard.up(key);
      await page.waitForTimeout(250);
      seen.add('door:' + id);
      continue;
    }
    if (what === 'end') { ended = true; break; }
    await page.waitForTimeout(/^room-wait|^map-wait|^raid-wait/.test(what) ? 40 : /wait/.test(what) ? 120 : 25);
  }
  if (!ended) await page.screenshot({ path: path.join(SHOTS || '/tmp', 'c7-check-stuck.png') });
  const sv = await page.evaluate(() => ({ lead: SD.state.save.c1 && SD.state.save.c1.lead, level: SD.state.save.level, c7: SD.state.save.c7, choice: (SD.state.save.c6 || {}).choice,
    start: typeof (SD.chapterStart || {})[7], card: (document.querySelector('#c7-end') || {}).textContent || '' }));
  // Every line chapter 7's cutscenes can play, for every lead, chapter 6 choice and version.
  const lines = await page.evaluate(() => {
    const sv = SD.state.save, cards = sv.c7.w.cards, keep = { lead: sv.c1.lead, c6: sv.c6, cards: cards.slice() }, out = new Set();
    for (const lead of ['mira', 'kai', 'seoyeon', 'dutch']) for (const choice of ['least', 'vault', 'run']) for (const kyu of [true, false]) {
      sv.c1.lead = lead; sv.c6 = Object.assign({}, keep.c6, { choice });
      cards.splice(0, cards.length, ...keep.cards.filter(c => kyu || c !== 'r7-kyu'));
      SD.reel.list.filter(e => e.ch === '7').forEach(e => [undefined].concat((e.alts || []).map(a => a[1])).forEach(arg =>
        SD.reel.steps(e, arg).forEach(st => { if (Array.isArray(st) && typeof st[1] === 'string') out.add(st[1]); })));
    }
    sv.c1.lead = keep.lead; sv.c6 = keep.c6; cards.splice(0, cards.length, ...keep.cards);
    return [...out];
  });
  await browser.close(); server.close();
  // A boarded line the game never plays can't get its still: list them (a warning, not a failure). Board 01 is world
  // dialogue, not a cutscene, so it's left out; [brackets] in a line stand for words the game fills in.
  if (fs.existsSync(BOARDS)) {
    const norm = t => t.replace(/[“”"]/g, '"').replace(/[‘’]/g, "'").replace(/\*/g, '').replace(/\s+/g, ' ').trim();
    const all = lines.map(norm), missing = [];
    for (const f of fs.readdirSync(BOARDS).filter(f => /^0[2-8].*\.md$/.test(f)).sort()) {
      for (const row of fs.readFileSync(path.join(BOARDS, f), 'utf8').split('\n').filter(r => /^\| \d+[a-z]? \|/.test(r))) {
        const c = row.split('|').map(x => x.trim()), shot = c[1], line = c[6] || '';
        line.split(' / ').map(t => norm(t.replace(/^\([^)]*\)\s*/, '').replace(/\s*\[[^\]]*\].*$/, ''))).filter(t => t && t !== '—' && !/^\(.*\)$/.test(t))
          .forEach(t => { if (!all.some(l => l.includes(t))) missing.push(`${f} · ${shot}: ${t}`); });
      }
    }
    console.log(missing.length ? 'boarded lines the game never plays:\n  ' + missing.join('\n  ') : 'every boarded line plays');
  }
  console.log('steps', steps, 'lead', sv.lead, 'level', sv.level, 'choice', sv.choice, Math.round((Date.now() - T0) / 1000) + 's');
  console.log('c7', JSON.stringify(sv.c7 && { f: sv.c7.f, gifts: sv.c7.w.gifts, pairs: sv.c7.w.pairs, cards: sv.c7.w.cards, x: Object.keys(sv.c7.w.x).join(' ') }));
  console.log('saw', [...seen].sort().join(' '));
  if (!ended) errors.push('the chapter never reached its end card; last actions: ' + last.join(' '));
  const x = (sv.c7 && sv.c7.w.x) || {};
  const need = ['arrive', 'book', 'whose', 'uptima', 'lift', 'climb', 'hatch', 'roof', 'kyu', 'vote', 'top', 'last', 'won', 'fireside', 'restoreq', 'board', 'epilogue']
    .concat(CHOICE === 'run' ? ['sale'] : []).filter(k => !x[k]);
  if (need.length) errors.push('flags never set: ' + need.join(', '));
  if (!sv.c7 || sv.c7.w.pairs.length !== 5) errors.push('not every pair scene played: ' + JSON.stringify(sv.c7 && sv.c7.w.pairs));
  if (!sv.c7 || sv.c7.w.gifts.length !== 5) errors.push('not every gift went in the basket: ' + JSON.stringify(sv.c7 && sv.c7.w.gifts));
  if (!sv.c7 || !sv.c7.f.done) errors.push('chapter 7 never marked done');
  if (sv.start !== 'function') errors.push('SD.chapterStart[7] is not registered');
  if (!/The End\./.test(sv.card)) errors.push('the end card does not say "The End."');
  ['r7-letter', 'r7-loaf', 'r7-seal', 'r7-lantern', 'r6-stone', 'r7-evalorder', 'r7-shared', 'r7-revoke', 'r7-scp', 'r7-kyu', 'r7-tower']
    .forEach(id => { if (!sv.c7 || !sv.c7.w.cards.includes(id)) errors.push('card never earned: ' + id); });
  if (errors.length) { console.log('FAIL\n' + [...new Set(errors)].join('\n')); process.exit(1); }
  console.log('OK');
})();
