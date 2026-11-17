// Headless check of the Deny Mines' real calls (js/ch1-mines.js on js/raid.js): every IAM foe's move names a real
// action and resource and its intent shows it; Revoke Older Sessions strips what a foe gained on earlier turns and
// keeps this turn's (and hits when there's nothing older); a Deny, Boundary or least-privilege card that lands logs the
// call it blocked and what stopped it, with an implicit deny for a boundary or a key policy and an explicit Deny only
// for the Asterisk's SCP. Fails on any page error or console error.
// Run from game/:  node tools/raid_real_check.js     (SHOTS=dir also saves 375px screenshots at 2x there)
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
const SHOTS = process.env.SHOTS || '';

(async () => {
  await new Promise(r => server.listen(0, r));
  const url = `http://localhost:${server.address().port}/index.html`;
  const browser = await chromium.launch(fs.existsSync('/opt/pw-browsers/chromium') ? { executablePath: '/opt/pw-browsers/chromium' } : {});
  const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [], fails = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|AudioContext/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.addInitScript(() => { window.SD_NO_TYPING = 1; window.SD_TEST = 1; });
  await page.goto(url);
  await page.addStyleTag({ content: '*, *::before, *::after { animation-duration: 1ms !important; transition-duration: 1ms !important; }' });

  // 1. The data: every move of every foe in the mines names a real action and a resource ARN.
  fails.push(...await page.evaluate(() => {
    const out = [], X = SD.expeditions.find(x => x.id === 'denymines'), ids = new Set();
    X.floors.forEach(f => { f.fights.concat(f.elites || [], [f.boss]).forEach(s => (typeof s === 'string' ? [s] : s.ids).forEach(id => ids.add(id))); });
    const ACT = /^(s3|iam|sts|kms|ec2|dynamodb|sqs|secretsmanager):[A-Z][A-Za-z]+$/, ARN = /^arn:aws:[a-z0-9-]+:[a-z0-9-]*:(\d{12})?:\S+$/;
    ids.forEach(id => {
      const e = SD.enemies[id];
      if (!e) return out.push(`no enemy ${id}`);
      e.pattern.forEach((s, i) => {
        const c = s.call;
        if (!Array.isArray(c) || !ACT.test(c[0]) || !ARN.test(c[1])) out.push(`${id} step ${i} (${s.t}) has no real call: ${JSON.stringify(c)}`);
        if (c && c[1].startsWith('arn:aws:s3:::') && /^s3:(ListBucket|DeleteBucket|PutBucketPolicy)$/.test(c[0]) && c[1].includes('/')) out.push(`${id} step ${i}: ${c[0]} acts on the bucket ARN, not its objects`);
        if (c && c[1].startsWith('arn:aws:s3:::') && /^s3:(GetObject|PutObject|DeleteObject)$/.test(c[0]) && !c[1].includes('/')) out.push(`${id} step ${i}: ${c[0]} acts on objects, bucket/*`);
      });
    });
    if (ids.size < 13) out.push(`only ${ids.size} foes found in the mines`);
    return out;
  }));

  // Into the mines, solo as Kai, with the bots slowed right down so the check plays every card itself.
  await page.evaluate(() => {
    const S = SD.state;
    S.save.c1 = { lead: 'kai', f: {}, deck: SD.starterDeck.concat('adminaccess').map(id => ({ id, up: false })), pos: [16, 30] };
    SD.ch1m.enter = () => {};
    SD.ch1m.mines('solo', () => { window.__done = 'won'; });
  });
  await page.waitForFunction(() => { const T = (SD.test || {}).raid; return T && T.G().ph && T.G().ph !== 'lobby'; }, null, { timeout: 20000 });
  await page.evaluate(() => SD.test.raid.pace(1e4));
  const closeDialogs = async () => { for (let i = 0; i < 40; i++) { const open = await page.evaluate(() => !document.querySelector('#dialog').hidden); if (!open) return; await page.click('#dialog'); await page.waitForTimeout(30); } };
  // A fight against ids, with Kai's hand holding the given cards first and Capacity to play them.
  const fight = (ids, hand) => page.evaluate(([ids, hand]) => {
    const T = SD.test.raid; T.fight(ids);
    const G = T.G(), p = G.players[T.me()];
    hand.slice().reverse().forEach(id => p.hand.unshift(id)); p.hand.length = Math.min(p.hand.length, 10); p.cap = 9;
    T.push();
  }, [ids, hand]);
  const play = (i, t) => page.evaluate(([i, t]) => { const T = SD.test.raid, G = T.G(); const sev = G.foes[t].sev; T.act(T.me(), { k: 'play', i, t }); return { log: G.log, sev0: sev, sev: G.foes[t].sev, rage: G.foes[t].rage }; }, [i, t]);

  // 2. The intent shows the real call, with the load after it; two fronts show two calls.
  await fight(['wildslime'], ['sig-kai-revoke', 'sig-kai-revoke', 'leastpriv']);
  await closeDialogs();
  const shown = await page.evaluate(() => {
    const el = document.querySelector('.rd .intent.rd-real'), G = SD.test.raid.G(), st = SD.enemies.wildslime.pattern[G.foes[0].ii % 4];
    return { call: el && el.querySelector('.rd-call') && el.querySelector('.rd-call').textContent, arn: el && el.querySelector('.rd-arn') && el.querySelector('.rd-arn').textContent, load: el && el.querySelector('.rd-load') && el.querySelector('.rd-load').textContent, want: st.call, text: el && el.textContent };
  });
  if (!shown.call || shown.call !== shown.want[0] || shown.arn !== shown.want[1] || !/load \d+|escalates/i.test(shown.load || '')) fails.push('the intent doesn\'t show the real call and its load: ' + JSON.stringify(shown));
  if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, 'raid-real-intent.png') }); }
  const front = await page.evaluate(() => { const T = SD.test.raid, G = T.G(), t0 = G.turn; G.turn = 3; T.push(); const el = document.querySelector('.rd .intent.rd-front'), n = el ? el.querySelectorAll('.rd-call').length : 0, tx = el ? el.textContent : ''; G.turn = t0; T.push(); return { n, tx }; });
  if (front.n !== 2 || !/Read load \d+ \+ write load \d+/i.test(front.tx)) fails.push('two fronts don\'t show a read and a write call: ' + JSON.stringify(front));

  // 3. Revoke Older Sessions: +3 gained on an earlier turn goes, +3 gained this turn stays, and no hit.
  const r1 = await page.evaluate(() => { const G = SD.test.raid.G(), f = G.foes[0]; f.rage = 6; f.rn = 3; f.rt = G.turn; return G.turn; });
  const a = await play(0, 0);
  if (a.rage !== 3 || a.sev !== a.sev0 || !/Its \+3 from this turn stays/.test(a.log) || !/aws:TokenIssueTime/.test(a.log) || !/loses the \+3 load it gained on earlier turns/.test(a.log)) fails.push('Revoke didn\'t strip only the earlier turn\'s gain: ' + JSON.stringify(a) + ' turn ' + r1);
  await closeDialogs();
  if (SHOTS) { await page.evaluate(() => document.querySelector('.rd .clog').scrollIntoView({ block: 'center' })); await page.screenshot({ path: path.join(SHOTS, 'raid-real-revoke.png') }); }
  // Nothing older (only this turn's): it hits instead, and the gain stays.
  const b = await play(0, 0);
  if (b.rage !== 3 || !(b.sev < b.sev0) || !/Nothing gained before the cutoff/.test(b.log)) fails.push('Revoke with nothing older didn\'t fall back to its hit: ' + JSON.stringify(b));

  // 4. A real escalation, on the foes' turn: stamped with that turn, so it's older on the next one.
  const esc = await page.evaluate(() => {
    const T = SD.test.raid, G = T.G(), f = G.foes[0];
    f.rage = 0; f.rn = 0; f.rt = 0; f.ii = 2; if (G.turn % 3 === 0) G.turn++;
    const t0 = G.turn;
    Object.keys(G.players).forEach(k => { if (!G.players[k].ready) T.act(k, { k: 'ready' }); });
    const p = G.players[T.me()]; p.hand.unshift('sig-kai-revoke'); p.cap = 9;
    return { t0, turn: G.turn, rage: f.rage, rt: f.rt, log: G.log, ph: G.ph };
  });
  if (esc.ph !== 'fight' || esc.rage !== 3 || esc.rt !== esc.t0 || esc.turn !== esc.t0 + 1 || !/iam:AttachRolePolicy on arn:aws:iam::\d{12}:role\/log-reader went through/.test(esc.log)) fails.push('the foe\'s escalation wasn\'t stamped with its own turn: ' + JSON.stringify(esc));
  else { const c = await play(0, 0); if (c.rage !== 0 || !/loses the \+3/.test(c.log)) fails.push('Revoke didn\'t strip last turn\'s escalation: ' + JSON.stringify(c)); }

  // A pair at 375px: both intents show their calls, and nothing scrolls sideways.
  await fight(['mimic', 'denybat'], []);
  const pack = await page.evaluate(() => ({ n: document.querySelectorAll('.rd .foe-card .intent.rd-real').length, wide: document.documentElement.scrollWidth > window.innerWidth }));
  if (pack.n !== 2 || pack.wide) fails.push('a pair\'s intents don\'t both show their calls at 375px: ' + JSON.stringify(pack));
  if (SHOTS) { await page.evaluate(() => document.querySelector('.rd .foe-info').scrollIntoView({ block: 'center' })); await page.screenshot({ path: path.join(SHOTS, 'raid-real-pack.png') }); }

  // 5. Blocked calls name the call and what stopped it.
  const block = async (id, cardId, want, not) => {
    await fight([id], [cardId]);
    const r = await play(0, 0); if (process.env.V) console.log(r.log);
    const c = await page.evaluate(id => { const G = SD.test.raid.G(); return SD.enemies[id].pattern[G.foes[0].ii % SD.enemies[id].pattern.length].call; }, id);
    if (!r.log.includes(`Blocked: ${c[0]} on ${c[1]}.`) || !want.test(r.log) || (not && not.test(r.log))) fails.push(`${cardId} on ${id} didn't log the block and its reason: ${r.log}`);
    // A guest's page keeps 400 characters of the log; leave room for a longer player name and a pack's foe name.
    if (r.log.length > 370) fails.push(`${cardId} on ${id}: the log runs to ${r.log.length} characters: ${r.log}`);
    return r.log;
  };
  await block('wildslime', 'leastpriv', /No statement in the scoped role allows it, so the implicit deny stands/);
  await block('boundarywall', 'finddeny', /permissions boundary stopped it, not a Deny: .*implicit deny/, /explicit "Effect": "Deny"/);
  await block('boundarywall', 'readbound', /permissions boundary stopped it, not a Deny/);
  await block('asterisk', 'finddeny', /SCP's explicit Deny stopped it/);
  await block('keykeeper', 'finddeny', /key policy stopped it: .*implicit deny, not a Deny/);
  await block('mimic', 'finddeny', /explicit "Effect": "Deny" matched it/);
  // A resisted card blocks nothing (the Deny Bat has no Deny to find), and a refusal still gives the foe's own reason.
  await fight(['denybat'], ['finddeny']);
  const res = await play(0, 0);
  if (!/RESISTED/.test(res.log) || /Blocked:/.test(res.log)) fails.push('a resisted Deny still logged a block: ' + res.log);
  await fight(['boundarywall'], ['adminaccess']);
  const den = await play(0, 0);
  if (!/refuses it\. Its permissions boundary caps the role/.test(den.log) || /explicit Deny beats/.test(den.log)) fails.push('the Boundary Wall\'s refusal lost its implicit-deny reason: ' + den.log);

  await browser.close(); server.close();
  if (errors.length || fails.length) { console.error(errors.concat(fails).join('\n')); process.exit(1); }
  console.log('OK: every Deny Mines move names a real call, Revoke strips only earlier turns\' gains, and blocked calls say what stopped them.');
})().catch(e => { console.error(e); process.exit(1); });
