// Headless check of The Lost and Found's nights 2, 3 and 4 (js/mode-pop-rooms.js, storyboard v7 frames 12, 14, 15
// and 17) at phone width (375px), played through the real UI: each night's light and a bigger Hunch, the wider map,
// the Hunch's intent from SD.pop.rules, keys from cleared claims, the Vault (a relic sealed by one room check), the
// Shortcut (skip a row), the Records vault and the Blameless Postmortem (played, never staked), Halcyon and the
// Arcanum with their claims and Lost items, the Big Claim and its truth, the marsh cat (caught with one room check),
// room modifiers and home turf, and the night's deflate line. No horizontal scroll, no page errors.
// Domain stamps and preparing (Nov 16): every door wears its domain stamp, a Lost item or break room's "check it first"
// earns a Prepared tag (first-use line once), and the tag hangs on the next matching claim's door. The rule freeze:
// nights 2 and 3 play on Nov 17, night 4 on Dec 1 (its cat and modifiers); a night 4 on Nov 17 has neither.
// Run from game/:  node tools/pop_rooms_check.js     SHOTS=dir saves screenshots.
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
  const shot = async name => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'pop-rooms-' + name + '.png'), fullPage: true }); };
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
  const answer = (right, conf) => page.evaluate(async ([right, conf]) => {
    const p = document.querySelector('#panel'), q = SD.modes.current();
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const said = p.querySelector('#q-said'); if (said) { said.click(); await wait(10); }
    const tf = p.querySelector('#tf-idk'); if (tf) { tf.click(); await wait(10); }
    if (q.type === 'mc') p.querySelector(`[data-o="${right ? q.a : q.opts.findIndex((o, i) => i !== q.a)}"]`).click();
    else if (q.type === 'multi') q.items.forEach((it, i) => { if (right ? it.ok : !it.ok) p.querySelector(`[data-m="${i}"]`).click(); });
    else if (q.type === 'num') { const inp = p.querySelector('#q-num'); inp.value = right ? q.lo : q.hi + 1e6; inp.dispatchEvent(new Event('input')); }
    else if (q.type === 'order') for (let i = 0; i < q.items.length; i++) { p.querySelector(`[data-ord="${right ? i : q.items.length - 1 - i}"]`).click(); await wait(5); }
    await wait(10);
    p.querySelector(`[data-c="${conf}"]`).click();
    await wait(10);
    return q.id;
  }, [right, conf]);
  const pop = () => page.evaluate(() => JSON.parse(JSON.stringify(SD.state.save.pop)));
  const txt = sel => page.textContent(sel);
  // Answers a format item (js/qformats.js) on screen, right or wrong, then a confidence and Continue.
  const answerFmt = (id, right, conf) => page.evaluate(async ([id, right, conf]) => {
    const it = SD.modes.fmtItem(id), p = document.querySelector('#panel');
    const w = ms => new Promise(r => setTimeout(r, ms));
    const click = async sel => { const el = p.querySelector(sel); if (!el) throw new Error('missing ' + sel); el.click(); await w(10); };
    if (it.type === 'spot') {
      await click(`[data-qf-line="${right ? it.bad : (it.bad + 1) % it.lines.length}"]`);
      await click(`[data-qf-reason="${right ? it.a : (it.a + 1) % it.reasons.length}"]`);
    } else if (it.type === 'compare') {
      for (let k = 0; k < 4 && !p.querySelector(`[data-qf-col="${it.a}"]`); k++) await click('#qf-next');
      await click(`[data-qf-col="${right ? it.a : (it.a + 1) % it.cols.length}"]`);
      await click(`[data-qf-row="${it.key}"]`);
    } else if (it.type === 'predict') {
      await click(`[data-qf-opt="${right ? it.a : (it.a + 1) % it.opts.length}"]`);
    } else if (it.type === 'seq') {
      const order = it.steps.map((_, i) => 's' + i);
      if (!right) order.reverse();
      for (const k of order) await click(`[data-qf-pool="${k}"]`);
    }
    await click('#qf-submit');
    if (conf != null) await click(`[data-c="${conf}"]`);
    await click('#q-next');
  }, [id, right, conf]);
  const ask = async (right, conf) => {
    await page.waitForSelector('#panel .win.quiz, #panel .qf');
    const fid = await page.evaluate(() => { const f = SD.state.save.pop.fight; return f && f.check && f.check.fmt ? f.check.fmt.id : null; });
    if (fid && await page.$('#panel .qf')) await answerFmt(fid, right, conf);
    else { await answer(right, conf); await page.click('#q-next'); }
    await page.waitForSelector('.pop');
  };
  // A Lost item that teaches a format: the worked item, then the practice one (unscored).
  const teach = async () => {
    const T = await page.evaluate(() => { const T = SD.state.save.pop.fx.teach; return { step: T.step, cur: T.list[Math.floor(T.step / 2)] }; });
    await page.click('#pop-teach');
    if (T.step % 2 === 0) { await page.waitForSelector('#qf-got'); await page.click('#qf-got'); }
    else { await page.waitForSelector('#panel .qf-hint'); await answerFmt(T.cur.practice, true, 1); }
    await page.waitForSelector('.pop');
  };

  await page.clock.install({ time: new Date('2026-11-17T20:00:00') });
  await page.addInitScript(() => { try { localStorage.clear(); } catch (e) { /* ignore */ } });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });
  await page.click('#t-start');
  await page.waitForSelector('#today-card:not([hidden])');
  await page.evaluate(() => { const s = SD.state.save; s.examTrack = 'DVA'; s.examDate = '2026-11-30'; s.todaySkip = true; s.modes = s.modes || { seen: {}, cal: SD.modes.newTally() }; s.modes.seen = Object.assign(s.modes.seen || {}, { pop: 1 }); SD.state.persist(); SD.today.render(); });

  const SAYS = { 2: 'I can always tell', 3: 'Gut says so', 4: 'Gut says so' };
  const DEFLATE = { 2: '…It\'s been wrong before.', 3: 'Twenty-five years, and nobody ever made it show its working. Me included.', 4: 'Smaller every night.' };
  const WIDTHS = { 2: '1,3,3,3,3', 3: '1,3,3,3,3', 4: '1,3,3,3,3' };
  for (const N of [2, 3, 4]) {
    console.log(`-- night ${N}`);
    if (N === 4) await page.clock.setSystemTime(new Date('2026-12-01T20:00:00'));
    await page.evaluate(n => { const s = SD.state.save; s.modes.popNights = n - 1; delete s.pop; s.popCarry = []; SD.state.persist(); SD.ui.closePanel && SD.ui.closePanel(); }, N);
    await page.evaluate(() => SD.modes.open());
    await page.click('[data-mode="pop"]');
    await page.waitForSelector('#pop-in');
    let s = await pop();
    check(s.night === N, `the night is night ${N}`);
    check(!!await page.$(`.pop.pop-n${N}`), `night ${N} has its own light (pop-n${N})`);
    const hw = await page.$eval('.pop-sky .pop-hunch', el => parseFloat(getComputedStyle(el).width));
    check(hw > 120, `the Hunch is bigger than on night 1 (${Math.round(hw)}px wide, night 1 is 120)`);
    check(new RegExp('Night ' + N).test(await txt('.pop-night')), 'the arrival names the night: ' + (await txt('.pop-night')).trim());
    await noHScroll(`night ${N} arrive`);
    await shot(N + '-arrive');
    await page.click('#pop-in');

    // ---- The map ----
    s = await pop();
    const widths = s.map.rows.map(r => r.length).join(',');
    check(widths === WIDTHS[N], `night ${N}'s map is wider than night 1's: rows of ${widths}`);
    const nodes = s.map.rows.flat();
    const types = new Set(nodes.map(n => n.type));
    check(types.has('vault') && types.has('shortcut'), `night ${N} has a Vault and a Shortcut`);
    check(/Keys \d/.test(await txt('.pop-hud')), 'the HUD counts keys');
    if (N === 2) check(!types.has('records') && !nodes.some(n => n.big), 'night 2 has no Records vault and no Big Claim yet');
    if (N >= 3) {
      const homes = new Set(nodes.map(n => n.home).filter(Boolean));
      check(homes.has('halcyon') && homes.has('arcanum'), `Halcyon and the Arcanum are in the heap (${[...homes].join(', ')})`);
      check(nodes.filter(n => n.big).length === 1 && types.has('records'), 'one Big Claim and a Records vault');
    }
    if (N === 4) {
      check(!!s.cat, 'the marsh cat is in the heap');
      check(/marsh cat is by the .* Next it goes: /.test(await txt('#panel')), 'the map says where the cat is and where it goes next');
      check(!!await page.$('.pop-door .pop-cat'), 'the cat sits by its door');
      check(nodes.filter(n => n.mod).length === 2, 'two claims carry a room modifier');
    } else check(!s.cat, 'no cat before night 4');
    const stamps = await page.$$eval('.pop-door', els => els.filter(e => e.querySelector('.pop-dom svg') && /\w/.test(e.querySelector('.pop-dom').textContent)).length);
    check(stamps === nodes.length && nodes.every(n => n.d >= 1 && n.d <= 4), `every door wears Dutch's domain stamp, an icon and a word (${stamps} of ${nodes.length})`);
    await noHScroll(`night ${N} map`);
    await shot(N + '-map');

    // ---- Play the night ----
    const seen = new Set(), did = new Set();
    let right = 0;
    for (let k = 0; k < 160; k++) {
      s = await pop();
      if (s.phase === 'sheet') break;
      const key = s.phase + (s.fight ? ':' + s.fight.kind : '');
      if (!seen.has(key)) { seen.add(key); await noHScroll(`night ${N} ${key}`); await shot(N + '-' + key.replace(':', '-')); }
      if (s.phase === 'map') {
        // Test aid: the Big Claim needs room checks left to fight it. Some random maps spend them all first; top up to 3.
        if (N >= 3 && !did.has('big') && s.rooms.length < 3 && (s.map.rows[s.map.row + 1] || []).some(n => n.big)) {
          await page.evaluate(() => { const s = SD.state.save.pop; const more = SD.pop.pickChecks(true).rooms.filter(c => !s.rooms.some(r => r.q === c.q)); s.rooms.push(...more.slice(0, 3 - s.rooms.length)); SD.pop.draw(); });
          s = await pop();
        }
        const climb = await page.$('#pop-climb');
        if (climb) { await climb.click(); continue; }
        const row = s.map.rows[s.map.row + 1];
        const doors = row.map((n, i) => i);
        const keysLeft = s.rooms.length;
        const cat = s.cat && !s.cat.done && !s.cat.gone && s.cat.r === s.map.row + 1 ? s.cat.c : -1;
        const pri = i => {
          const n = row[i];
          if (i === cat && keysLeft > 4) return 9;
          if (n.big) return 8;
          if (n.type === 'records' && !did.has('records')) return 7;
          if (n.type === 'vault' && !did.has('vault')) return N <= 3 || keysLeft >= 6 ? 6 : 0;
          if (n.type === 'shortcut' && N === 2 && !did.has('shortcut')) return 5;
          if (n.type === 'lost' && n.home === 'halcyon' && !did.has('halcyon')) return 5;
          if (n.type === 'lost' && n.home === 'arcanum' && !did.has('arcanum')) return 5;
          if (n.type === 'claim') return N >= 3 && s.map.row + 1 > 0 && s.map.rows.slice(s.map.row + 2).flat().some(x => x.big) ? 1 : 4;
          return 2;
        };
        const best = doors.sort((a, b) => pri(b) - pri(a))[0];
        // Keys for the rooms this check walks into (cleared claims drop them; the check doesn't wait for enough).
        if (['vault', 'records', 'shortcut'].includes(row[best].type)) await page.evaluate(() => { SD.state.save.pop.keys = Math.max(SD.state.save.pop.keys, 2); });
        await page.click(`[data-door="${best}"]`);
        continue;
      }
      if (s.phase === 'vault') {
        check(/ARCANUM LOCK/.test(await txt('#panel')) && /relic/.test(await txt('#panel')), 'the Vault: an Arcanum lock, a relic inside');
        did.add('vault');
        const k0 = s.keys;
        await page.click('#pop-vopen');
        check((await pop()).keys === k0 - 1 && (await pop()).phase === 'seal', 'opening it takes 1 key and seals one room check');
        continue;
      }
      if (s.phase === 'seal') {
        check(/no stake/.test(await txt('.pop-stamp')), 'a sealed check takes no stake');
        const r0 = s.rooms.length, a0 = s.asked;
        await page.click('#pop-sopen');
        await ask(true, 1); right++;
        const t = await pop();
        check(t.asked === a0 + 1 && t.rooms.length === r0, 'it spends one room check');
        continue;
      }
      if (s.phase === 'sealout') {
        const body = await txt('#panel');
        if (s.seal.why === 'cat') {
          check(/Come here, love\./.test(body) && /Everyone flinches\. The cat doesn't\./.test(body), 'caught: "Kai: Come here, love." Everyone flinches. The cat doesn\'t.');
          check(/Relic:/.test(body) && s.relics.length >= 1, 'the cat drops a relic');
          did.add('cat');
        } else check(/SEAL BROKEN/.test(body) && /Relic:/.test(body), 'right: the seal breaks and a relic is yours');
        await page.click('#pop-son');
        continue;
      }
      if (s.phase === 'shortcut') {
        did.add('shortcut');
        if (N === 2) {
          const r0 = s.map.row, rc = s.rooms.length;
          await page.click('#pop-stake');
          const t = await pop();
          check(t.map.row === r0 + 1 && t.map.rows[r0 + 1].every(n => n.skipped), 'the Shortcut skips the next row');
          check(t.rooms.length === rc, 'the skipped row\'s checks stay unspent (loose proofs at the Hunch)');
        } else await page.click('#pop-spass');
        continue;
      }
      if (s.phase === 'records') {
        did.add('records');
        check(/Blameless Postmortem/.test(await txt('#panel')), 'the Records vault holds the Blameless Postmortem');
        await page.click('#pop-ropen');
        const t = await pop();
        check(t.deck.some(e => e.id === 'postmortem') && t.keys === s.keys - 2, 'it takes 2 keys and puts the Postmortem in the deck');
        continue;
      }
      if (s.phase === 'cat') {
        const body = await txt('#panel');
        check(/Patient\./.test(body) && /Chef\./.test(body) && /Honoured Guest\./.test(body) && /Suspect\./.test(body), 'the four leads name the cat: Patient. Chef. Honoured Guest. Suspect.');
        await page.click('#pop-catch');
        continue;
      }
      if ((s.phase === 'lost' || s.phase === 'break') && !did.has('prep') && await page.$('[data-popx="prep"]:not([disabled])')) {
        did.add('prep');
        const d = s.map.rows[s.map.row][s.map.col].d, r0 = s.rooms.length;
        const seen = await page.evaluate(() => !!SD.state.save.popPrepSeen);
        await page.click('[data-popx="prep"]');
        const t = await pop();
        check(t.phase === 'seal' && t.seal.why === 'prep' && t.seal.ck.d === d && t.rooms.length === r0 - 1, 'check it first: one room check in the room\'s domain, no stake');
        await page.click('#pop-sopen');
        await ask(true, 1);
        const b = await txt('#panel'), u = await pop();
        check(/PREPARED/.test(b) && u.prep.includes(d), 'right: a Prepared token in that domain');
        check(seen ? !/ties the tag to the next/.test(b) : /ties the tag to the next/.test(b), `the first token ever earned says what it does, once (${seen ? 'not the first' : 'the first'})`);
        await noHScroll(`night ${N} prepared`);
        await page.click('#pop-son');
        check((await pop()).phase === s.phase && !await page.$('[data-popx="prep"]'), 'back in the room, its usual choice still to make');
        const ahead = u.map.rows.slice(u.map.row + 1).flat().some(x => x.type === 'claim' && x.d === d && !x.visited);
        if (ahead) { await page.click(s.phase === 'lost' ? '#pop-leave' : '#pop-rest'); check(!!await page.$('.pop-door .pop-ptag'), 'the Prepared tag hangs on the next matching claim\'s door'); }
        continue;
      }
      if (s.phase === 'lost') {
        const n = s.map.rows[s.map.row][s.map.col];
        if (n.home === 'halcyon') { did.add('halcyon'); const b = await txt('#panel'); check(/grain scale, cracked/.test(b) && /I'll fix it\./.test(b) && /You won't\./.test(b) && /Yes, chef\./.test(b) && /counterweight/.test(b), 'Halcyon\'s Lost item: the cracked grain scale, Kai, Dutch and "Yes, chef"'); }
        if (n.home === 'arcanum') { did.add('arcanum'); check(/mop head/.test(await txt('#panel')), 'the Arcanum\'s Lost item: the mop head'); }
        await page.click('#pop-leave');
        continue;
      }
      if (s.phase === 'teach') { did.add('teach'); await teach(); continue; }
      if (s.phase === 'break') { await page.click('#pop-rest'); continue; }
      if (s.phase === 'reward') {
        const b = await txt('#panel');
        if (s.reward.key) check(/in the rubble\. Keys: \d/.test(b), `a cleared claim drops ${s.reward.key === 1 ? 'a key' : s.reward.key + ' keys'}`);
        if (s.reward.big) {
          const truth = await page.evaluate(h => SD.pop.BIG[h].truth, s.reward.big);
          check(b.includes(truth), 'the Big Claim\'s clear screen shows its truth: ' + truth);
          did.add('big');
        }
        if (['halcyon', 'arcanum'].includes(s.reward.home)) check(await page.$$eval('[data-take]', (els, h) => els.length === 3, s.reward.home), `${s.reward.home}'s cards on offer`);
        await page.click('[data-take]');
        continue;
      }
      if (s.phase === 'zero') { await page.click('#pop-esc'); continue; }
      if (s.phase === 'land') {
        const pm = await page.$('[data-popx="pm"]');
        if (pm) {
          const g0 = s.fight.guard, want = await page.evaluate(() => SD.pop.pmGuard(SD.state.save.pop));
          await pm.click();
          const t = await pop();
          check(t.fight.guard === g0 + want && t.fight.capLeft === 0, `the Postmortem plays for Guard ${want} (3 per first try proven tonight), all 3 Capacity`);
          did.add('pm');
        }
        await page.click('#pop-end');
        continue;
      }
      if (s.phase === 'stake' || s.phase === 'locked') {
        const f = s.fight;
        if (s.phase === 'stake') {
          const stage = await txt('.pop-stage');
          if (f.kind === 'hunch' && !did.has('hunch')) { did.add('hunch'); check(stage.includes(`"${SAYS[N]}"`), `the Hunch says "${SAYS[N]}" (from SD.pop.rules)`); }
          if (f.big && !did.has('bigstage')) {
            did.add('bigstage');
            check(/BIG CLAIM/.test(stage) && f.max === 48 && /hits 11/.test(stage), 'the Big Claim: severity 48, hits 11');
            const spr = await page.evaluate(h => SD.pop.BIG[h].sprite, f.home);
            check(['mailleviathan', 'hotshard', 'vaultgolem', 'crystalhead'].includes(spr), `its sprite is its homeland's (${f.home}: ${spr})`);
            // Test aid: a quarter of its severity, so the clear screen is reached whatever the night's checks were spent on.
            await page.evaluate(() => { const f = SD.state.save.pop.fight; f.sev = Math.min(f.sev, 12); SD.pop.draw(); });
          }
          if (N === 4 && f.kind === 'claim' && !did.has('turf')) { did.add('turf'); check(/Home turf: \w+/.test(stage), 'home turf shows on a night 4 claim'); }
          if (f.mod && !did.has('mod')) { did.add('mod'); check(new RegExp(f.mod === 'loud' ? 'Loud: hits \\+2' : 'Cramped: a hand of 3').test(stage), `the room modifier shows (${f.mod})`); if (f.mod === 'cramped') check(f.hand.length <= 3, 'Cramped: a hand of 3'); }
          // Test aid: once the Postmortem is in the deck, deal it into the Hunch's hand so it gets played.
          if (f.kind === 'hunch' && !did.has('pm') && s.deck.some(e => e.id === 'postmortem') && !f.hand.some(x => s.deck[x].id === 'postmortem')) {
            await page.evaluate(() => { const s = SD.state.save.pop, f = s.fight; f.hand[0] = s.deck.findIndex(e => e.id === 'postmortem'); f.sel = SD.pop.stakeAll(s); SD.pop.draw(); });
            s = await pop();
          }
          const pmh = s.fight.hand.findIndex(x => s.deck[x].id === 'postmortem');
          if (pmh >= 0) {
            check(!!await page.$(`[data-card="${pmh}"][disabled]`), 'the Postmortem can\'t be staked');
            if (!did.has('pm') && !f.big) await page.click('#pop-none');
          }
        }
        await page.click('#pop-open');
        await ask(true, 2); right++;
        continue;
      }
    }
    s = await pop();
    check(s.phase === 'sheet', `night ${N} ends on the proof sheet (${s.how})`);
    const sheet = (await txt('#panel')).replace(/\s+/g, ' ');
    if (s.how === 'won') check(sheet.includes(DEFLATE[N]), `the deflate line: "${DEFLATE[N]}"`);
    if (N <= 3) check(did.has('vault'), `night ${N}: the Vault was opened`);
    if (N === 2) check(did.has('shortcut'), 'night 2: the Shortcut was taken');
    if (N >= 3) check(did.has('records') && did.has('big'), `night ${N}: the Records vault was opened and the Big Claim cleared (${[...did].join(", ")}; fled ${s.fled}, ${s.cleared} cleared)`);
    if (N === 3) check(did.has('pm'), 'night 3: the Postmortem was played');
    if (N === 4) check(did.has('cat'), 'night 4: the cat was caught');
    await noHScroll(`night ${N} sheet`);
    await shot(N + '-sheet');
    if (N === 4) {
      await page.click('#pop-ledger');
      check(/The marsh cat/.test(await txt('#panel')), 'the ledger has a row for the marsh cat');
      await noHScroll('ledger');
      await page.click('#pop-lback');
    }
    await page.click('#pop-done');
  }

  // ---- The rule freeze: a night 4 on Nov 17 plays night 3's rules (state machine) ----
  const fz = await page.evaluate(() => { const s = SD.pop.newNight({ sim: true, night: 3, day: '2026-11-17' }); return { night: s.night, cat: !!s.cat, mods: s.map.rows.flat().filter(n => n.mod).length, arrive: SD.pop.xtra(s, 'arrive') }; });
  check(fz.night === 4 && !fz.cat && !fz.mods && /Nothing new/.test(fz.arrive) && !/cat/.test(fz.arrive), 'before Dec 1, night 4 has no cat and no modifiers, and says nothing new is in the heap');

  // ---- The cat, wrong: only its silhouette goes in the ledger (state machine) ----
  const sil = await page.evaluate(() => {
    const s = SD.pop.newNight({ sim: true, night: 3, day: '2026-12-01' }); s.phase = 'map';
    s.cat.r = 0; s.cat.c = 0;
    const r = SD.pop.go(s, 0);
    SD.pop.catchCat(s);
    SD.pop.sealDone(s, { ok: false, conf: 1, pts: -1 });
    return [r, s.cat.done, s.relics.length, s.phase];
  });
  check(sil[0] === 'cat' && sil[1] === 'seen' && sil[2] === 0, 'a wrong catch: no relic, the cat is only seen (its silhouette)');

  await browser.close(); server.close();
  errors.forEach(e => console.log(e));
  if (errors.length) fails.push(errors.length + ' page or console errors');
  if (fails.length) { console.error(`${fails.length} failed:\n` + fails.join('\n')); process.exit(1); }
  console.log('OK: The Lost and Found nights 2 to 4 pass, no errors.');
})().catch(e => { console.error(e); process.exit(1); });
