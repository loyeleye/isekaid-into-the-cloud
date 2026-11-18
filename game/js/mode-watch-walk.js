// The Night Watch, version 3: the walkable loop (storyboard "The Night Watch", Ladi Nov 17: "we're good to start
// building everything"). Days in the town, nights patrolling the castle, nine of each.
//   Morning: Mira's review (from day 2), then the day walk. Talk to people for gossip and quests; the clock stops
//            while you talk. The relationship engine (js/watch-bonds.js) sets how helpful people are on referrals.
//   Dusk:    you're put at Pell's gate on the West Road. Pell's briefing, then through the gate to the castle.
//   Night:   walk the four floors, find each breach marker and pick the narrow fix (one retry; a second miss locks
//            it until dawn). A bell every minute; when time runs out, dawn comes.
//   Dawn:    pay: base 20, +10 a fix, -10 a missed breach (night 1 has no fines).
// Content comes from window.WATCH_CONTENT (js/watch-content.js, the content thread); until it's there, the night's
// breaches come from the v2 locks in js/watch-data.js and three placeholder shortcut quests stand in.
// Still to come in this file: hiring watchers and ward levels, the Long Night's town raid, endings.
// Save: S.save.watch3 = { v: 3, day, silver, unlocks, quests: { id: { step, done } }, hearts, fixed, missed, bonds }.
(function () {
  const M = SD.modes, U = SD.ui, S = SD.state, W = SD.watchData, WW = SD.watchWorld, WV = SD.watchView, B = SD.watchBonds;
  if (!M || !U || !WW || !WV || !B) return;
  const esc = s => U.esc(String(s == null ? '' : s));
  const content = () => window.WATCH_CONTENT || {};
  const PAY = { base: 20, fix: 10, miss: -10, review: 10, each: 3 };
  const DAY_S = 600, nightS = n => (n === 9 ? 900 : n >= 5 ? 600 : 480);
  const NAME = Object.assign({ seoyeon: 'Seo-yeon', kevin: 'Hooded Stranger', captain: 'The Captain' }, (W && W.WHO) || {});
  const nm = who => NAME[who] || who.charAt(0).toUpperCase() + who.slice(1);
  const PEOPLE = ['mira', 'coo', 'bru', 'kagemaru', 'lexi', 'kai', 'dutch', 'hobb', 'pell', 'wen', 'ayo', 'aigerim', 'doug', 'tess', 'hollis', 'odu', 'fennel', 'seymour', 'captain'];
  const OLD_ROOM = { tower: 'watchtower', bridge: 'bridge-tower', post: 'post-room', strong: 'strongroom' };
  const FIX_OF = { lock: 'door', key: 'badge-desk' };

  const sv = () => {
    const s = S.save;
    if (!(s.watch3 && s.watch3.v === 3)) s.watch3 = { v: 3, day: 1, silver: 0, unlocks: {}, quests: {}, hearts: {}, fixed: {}, missed: {}, bonds: B.create(1) };
    return s.watch3;
  };

  // ---- Breaches for a night ----
  function roomX(floor, room, salt) {
    const r = WW.CASTLE[floor] && WW.CASTLE[floor].rooms.find(x => x[0] === room);
    if (!r) return 800;
    const span = r[2] - r[1];
    return Math.round(r[1] + span * (0.3 + 0.4 * ((salt * 37) % 10) / 10));
  }
  function fallbackBreaches(n) {
    const night = W && W.NIGHTS[n - 1];
    if (!night) return [];
    return night.set.map(([slot], i) => {
      const s = W.SLOTS[slot], room = OLD_ROOM[s.room] || s.room, floor = (W.ROOMS[s.room] || {}).floor || 'ground';
      return { id: 'v2-' + n + '-' + slot, night: n, skill: s.task, fix: FIX_OF[s.kind] || 'door', where: { floor, room },
        title: s.name, story: s.ask, raid: 'Thieves',
        choices: Object.keys(s.tiles).map(k => ({ text: s.tiles[k].label, best: s.tiles[k].res === 'ok', why: s.tiles[k].line })), _i: i };
    });
  }
  function breaches(n) {
    const c = content().breaches;
    let list = c && c.length ? c.filter(b => b.night === n) : fallbackBreaches(n);
    if (n === 1) list = list.slice(0, 1);   // night 1: one breach, on the ground floor (doc: Night 1)
    return list.map((b, i) => {
      const scene = b.where && b.where.level ? b.where.level : 'castle:' + ((b.where && b.where.floor) || 'ground');
      const sc = WW.scene(scene);
      const x = b.where && b.where.x != null ? b.where.x : b.where && b.where.room ? roomX(b.where.floor, b.where.room, i + 1) : Math.round((sc.from + sc.to) / 2);
      return Object.assign({ scene, x }, b);
    });
  }

  // ---- Quests ----
  const FALLBACK_QUESTS = [
    { id: 'dutch-own-pass', giver: 'dutch', kind: 'shortcut', opens: 2, closes: 4, skill: '2.1', reward: { silver: 20, heart: true, unlock: 'cellar-stair' },
      steps: [
        { at: { who: 'dutch' }, say: [['dutch', 'All four of my crews share one pass, and it opens every door in the cellars.'], ['seoyeon', 'Let me think about how it should work.']] },
        { at: { who: 'dutch' }, ask: { q: 'Four Lambda functions share one execution role that can read and write every table. What should change?',
          choices: ['Give each function its own execution role that allows only the actions and tables it uses',
            'Put an IAM user\'s access keys in each function\'s environment variables',
            'Attach AdministratorAccess so no function ever fails'], answer: 0,
          why: 'An execution role per function keeps each one to least privilege. Lambda gets the role\'s temporary credentials for you, so long-term keys aren\'t needed, and admin access is far wider than any function needs.' } },
        { at: { who: 'dutch' }, say: [['dutch', 'Own passes all round. Here, take the key to the old cellar stair by the gate.']] }
      ] },
    { id: 'kai-night-cloak', giver: 'kai', kind: 'shortcut', opens: 3, closes: 5, skill: '2.1', reward: { silver: 20, heart: true, unlock: 'back-stair' },
      steps: [
        { at: { who: 'kai' }, say: [['kai', 'The night clerk needs the ledger only during the shift. Right now they carry a copy of the key home.']] },
        { at: { who: 'hobb' }, say: [['hobb', 'Kai sent you? Then here is how cloaks work: you wear one for a while, then it goes back on the hook.']] },
        { at: { who: 'kai' }, ask: { q: 'A worker needs to read an S3 bucket only during the night shift. How should they get access?',
          choices: ['Let them assume a role whose trust policy names them, so STS gives temporary credentials that expire',
            'Create a long-term access key for them and delete it each morning', 'Make the bucket public at night'], answer: 0,
          why: 'Assuming a role returns temporary security credentials from AWS STS that expire on their own. A long-term key lasts until someone deletes it, and a public bucket lets anyone read it.' } },
        { at: { who: 'kai' }, say: [['kai', 'A cloak on a hook. Take the back stair key: it runs from the upper floor to the towers.']] }
      ] },
    { id: 'captain-hoist-key', giver: 'captain', kind: 'big', opens: 5, closes: 7, skill: '2.1', reward: { silver: 30, heart: false, unlock: 'hoist' },
      steps: [
        { at: { who: 'captain' }, say: [['captain', 'The hoist reaches every floor, so its key is the most dangerous one in the keep.']] },
        { at: { who: 'captain' }, ask: { q: 'One permission can reach every floor. What keeps it safest?',
          choices: ['Give it to a role the watch assumes only while on patrol, and record each use in CloudTrail',
            'Copy it to every worker so nobody is stuck', 'Leave it in the gatehouse so it never goes missing'], answer: 0,
          why: 'Granting wide access through a role that is assumed only when needed limits how long anyone holds it, and CloudTrail records each AssumeRole call. Copies for everyone, or a key left where anyone can take it, defeat the point.' } },
        { at: { who: 'captain' }, say: [['captain', 'Good. The hoist is yours. Pull the cord for the floor you want.']] }
      ] }
  ];
  const quests = () => (content().quests && content().quests.length ? content().quests : FALLBACK_QUESTS);
  const qstate = id => (sv().quests[id] = sv().quests[id] || { step: -1, done: false });
  const openOn = (q, d) => d >= q.opens && d <= q.closes;

  // ---- People in a scene ----
  function people(phase, day) {
    const out = {}, wx = WW.weather(day, phase === 'night' ? 'night' : 'day');
    const put = (scene, who, x) => { (out[scene] = out[scene] || []).push({ who, x }); };
    if (phase === 'day' || phase === 'dusk') {
      WW.LEVELS.forEach(l => WW.TOWN[l].spots.forEach(s => {
        if (!s.who) return;
        if (s.who === 'pell' && phase !== 'dusk') return;
        if (s.who === 'fennel' && wx === 'mist') return;                 // doc: day 7 mist, Fennel stays in
        if (s.who === 'kagemaru' && wx === 'rain') { put('main-street', 'kagemaru', 1960); return; }  // under the café awning
        put(l, s.who, s.x + 34);
        (s.also || []).forEach((w, i) => put(l, w, s.x - 40 - i * 40));
      }));
    } else {
      put('castle:towers', 'captain', 1150);
      if (day === 1) put('castle:ground', 'pell', 230);
    }
    return out;
  }

  // ---- Screens over the view ----
  let view = null, wrap = null, busy = false, clock = 0, run = null;
  function overlay(html) {
    busy = true;
    let o = wrap.querySelector('.ww-o');
    if (!o) { o = document.createElement('div'); o.className = 'ww-o'; wrap.appendChild(o); }
    o.innerHTML = `<div class="ww-card" role="dialog" aria-modal="true">${html}</div>`;
    o.hidden = false;
    const f = o.querySelector('button'); if (f) setTimeout(() => f.focus(), 0);
    return o;
  }
  function close() { const o = wrap && wrap.querySelector('.ww-o'); if (o) { o.hidden = true; o.innerHTML = ''; } setTimeout(() => { const o2 = wrap && wrap.querySelector('.ww-o'); if (!o2 || o2.hidden) busy = false; }, 80); }
  const line = (who, text) => `<p class="ww-say"><b>${esc(nm(who))}:</b> ${esc(text)}</p>`;
  const bars = r => `<div class="ww-bars"><span>Trusts you <i style="--v:${r.you}"></i></span><span>Trusts the sender <i style="--v:${r.tie === 'cool' ? 0 : r.sender}"></i></span></div>`;
  function sayAll(lines, then) {
    let i = 0;
    const next = () => {
      if (i >= lines.length) { close(); if (then) then(); return; }
      const [who, text] = lines[i++];
      const o = overlay(line(who, text) + '<div class="row"><button class="primary" data-a="n">Next</button></div>');
      o.querySelector('[data-a=n]').onclick = next;
    };
    next();
  }
  // A choice question: { q, choices, answer, why }. done(ok). tries: how many misses allowed before it locks.
  function choose(title, q, tries, done) {
    let miss = 0;
    const draw = (msg) => {
      const o = overlay(`<p class="ww-t">${esc(title)}</p><p class="ww-q">${esc(q.q)}</p>${msg || ''}
        <div class="ww-ch">${q.choices.map((c, i) => `<button data-i="${i}">${esc(c)}</button>`).join('')}</div>`);
      o.querySelectorAll('[data-i]').forEach(b => b.onclick = () => {
        const i = +b.dataset.i;
        if (i === q.answer) {
          const o2 = overlay(`<p class="ww-ok">✓ ${esc(q.choices[i])}</p><p class="ww-why">${esc(q.why || '')}</p><div class="row"><button class="primary" data-a="d">Done</button></div>`);
          o2.querySelector('[data-a=d]').onclick = () => { close(); done(true); };
        } else if (++miss > tries) {
          const o2 = overlay(`<p class="ww-no">✗ Not quite.</p><p class="ww-why">${esc(q.why || '')}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
          o2.querySelector('[data-a=d]').onclick = () => { close(); done(false); };
        } else draw(`<p class="ww-no">✗ That isn't the narrow fix. One more try.</p>`);
      });
    };
    draw();
  }

  // ---- Talking ----
  function gossipFor(who, day, wx) {
    const g = (content().gossip || []).filter(x => x.who === who && x.day === day && (!x.weather || x.weather === wx));
    return g[0] || null;
  }
  function talk(who) {
    const w = sv(), day = w.day, b = w.bonds, ties = content().ties || {};
    B.chat(b, who);
    // A quest step at this person?
    for (const q of quests()) {
      const s = qstate(q.id);
      if (s.done) continue;
      if (s.step < 0) {
        if (q.giver === who && openOn(q, day)) {
          const o = overlay(`${line(who, 'Have you got a minute? I could use the watch\'s help.')}<p class="ww-meta">${esc(q.kind)} quest · pays ${q.reward.silver} silver${q.reward.unlock ? ' and a shortcut' : ''}</p>
            <div class="row"><button class="ghost" data-a="no">Not now</button><button class="primary" data-a="yes">Help</button></div>`);
          o.querySelector('[data-a=no]').onclick = close;
          o.querySelector('[data-a=yes]').onclick = () => { s.step = 0; close(); setTimeout(() => step(q), 90); };
          return;
        }
        continue;
      }
      const st = q.steps[s.step];
      if (st && st.at && st.at.who === who) { step(q); return; }
    }
    const wx = WW.weather(day, run && run.phase === 'night' ? 'night' : 'day');
    const g = gossipFor(who, day, wx);
    if (g && g.tie) B.shift(b, g.tie.a, g.tie.b, g.tie.to);
    sayAll([[who, g ? g.line : who === 'pell' ? 'Mind the locks.' : 'Evening soon. Be careful up at the castle.']]);
  }
  function step(q) {
    const w = sv(), s = qstate(q.id), st = q.steps[s.step], ties = content().ties || {};
    if (!st) return finish(q);
    const who = st.at && st.at.who;
    const go = () => {
      s.step++; S.persist();
      if (s.step >= q.steps.length) return finish(q);
      const n = q.steps[s.step];
      if (n.at && n.at.who === who) step(q);   // the same person carries on
    };
    const body = () => {
      if (st.ask) {
        const tries = B.trust(w.bonds, q.giver) >= 80 ? 1 : 0;   // trust 80 perk: a second try after the explanation
        choose(nm(q.giver) + '\'s question', st.ask, tries, ok => { if (ok) go(); else { B.add(w.bonds, q.giver, 'wrong'); S.persist(); } });
      } else sayAll(st.say || [], go);
    };
    if (who && who !== q.giver) {
      const r = B.refer(w.bonds, ties, who, q.giver), help = st.help || {};
      if (r.band === 'deny') {
        const v = B.vouchers(w.bonds, ties, who, q.giver, PEOPLE);
        const o = overlay(`${line(who, help.deny || `${nm(q.giver)} sent you? Then no.`)}${bars(r)}<p class="ww-meta">A cool tie works like an explicit deny: it beats any trust you've earned.${v.length ? ' ' + esc(v.map(nm).join(' or ')) + ' could vouch for you.' : ' Try again another day.'}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
        o.querySelector('[data-a=d]').onclick = close;
        return;
      }
      const first = !w.seenReferral; w.seenReferral = true;
      const o = overlay(`${line(who, r.band === 'high' ? `Anyone ${nm(q.giver)} sends is welcome. ${help.high || ''}` : r.band === 'low' ? 'I don\'t know you well. Prove you know your stuff first.' : `${nm(q.giver)} sent you? All right.`)}${bars(r)}
        ${first ? line('pell', 'Same as the castle locks: both doors have to open, and one bolt shuts it.') : ''}<div class="row"><button class="primary" data-a="d">Go on</button></div>`);
      const proof = () => {   // low band: one review question first (doc: Relationships)
        const pool = content().reviews || [], rv = pool.find(x => x.id === help.low) || pool.find(x => x.day <= w.day);
        if (r.band !== 'low' || !rv) return body();
        choose(nm(who) + ' wants proof', rv, 0, ok => { if (ok) { B.add(w.bonds, who, 'chat'); setTimeout(body, 90); } });
      };
      o.querySelector('[data-a=d]').onclick = () => { close(); setTimeout(proof, 90); };
      return;
    }
    body();
  }
  function finish(q) {
    const w = sv(), s = qstate(q.id), r = q.reward || {};
    s.done = true;
    w.silver += r.silver || 0;
    if (r.heart) w.hearts[q.giver] = 1;
    if (r.unlock) { w.unlocks[r.unlock] = 1; if (run) run.st.unlocks[r.unlock] = 1; }
    B.add(w.bonds, q.giver, q.kind === 'small' ? 'small' : 'trust');
    S.persist();
    const o = overlay(`<p class="ww-ok">Quest done</p><p>🪙 +${r.silver || 0} silver${r.heart ? ' · ❤ ' + esc(nm(q.giver)) + '\'s trust' : ''}${r.unlock ? ' · new shortcut: ' + esc(r.unlock.replace('-', ' ')) : ''}</p><div class="row"><button class="primary" data-a="d">OK</button></div>`);
    o.querySelector('[data-a=d]').onclick = close;
  }

  // ---- The day ----
  async function morning() {
    const w = sv();
    B.newDay(w.bonds, w.day);
    if (w.day >= 2) await review();
    walk('day');
  }
  async function review() {
    const w = sv(), pool = (content().reviews || []).filter(r => r.day <= w.day && !(w.asked || {})[r.id]);
    const n = w.day === 2 ? 1 : 2;
    let right = 0, asked = 0;
    if (pool.length) {
      for (const r of pool.slice(0, n)) {
        asked++; (w.asked = w.asked || {})[r.id] = 1;
        const ok = await new Promise(res => {
          const b = U.panel(`<p class="ww-top">Day ${w.day} · Mira's review</p><p>${esc(r.q)}</p><div class="ww-ch">${r.choices.map((c, i) => `<button data-i="${i}">${esc(c)}</button>`).join('')}</div>`, { title: 'THE NIGHT WATCH' });
          b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
            const good = +el.dataset.i === r.answer;
            const b2 = U.panel(`<p class="${good ? 'ww-ok' : 'ww-no'}">${good ? '✓ Right' : '✗ Not quite'}: ${esc(r.choices[r.answer])}</p><p class="ww-why">${esc(r.why)}</p><div class="row"><button class="primary" id="ww-n">Next</button></div>`, { title: 'THE NIGHT WATCH' });
            b2.querySelector('#ww-n').onclick = () => res(good);
          });
        });
        if (ok) right++;
      }
    } else {
      const r = M.pick({ match: q => SD.exam && SD.exam.domainOf(q) === 2, n, verifiedOnly: true, mix: 0 });
      for (const it of r.items || []) {
        const q = SD.exam.find(it.q); if (!q) continue;
        asked++;
        const a = await M.ask(q, { tally: M.newTally(), title: 'MIRA\'S REVIEW' });
        if (a && a.ok) right++;
      }
    }
    if (asked) w.silver += PAY.review + PAY.each * right;
    S.persist();
  }

  // ---- Walking (day, dusk and night share this) ----
  function walk(phase, opts) {
    opts = opts || {};
    const w = sv();
    if (view) view.stop();
    const st = WW.create({ scene: opts.scene || (phase === 'night' ? 'castle:ground' : phase === 'dusk' ? 'west-road' : 'main-street'),
      x: opts.x != null ? opts.x : phase === 'night' ? 160 : phase === 'dusk' ? 3180 : 600, unlocks: w.unlocks, phase, night: w.day });
    run = { phase, st, list: phase === 'night' ? breaches(w.day) : [], tries: {}, locked: {}, fixed: {}, bell: 0 };
    clock = phase === 'night' ? nightS(w.day) : phase === 'day' ? DAY_S : 0;
    const b = U.panel(`<p class="ww-top" id="ww-top"></p><div class="ww-wrap"><div class="ww-view"></div></div>
      <div class="row"><button class="ghost" id="ww-quit">Save and leave</button><button class="ghost" id="ww-end">${phase === 'night' ? 'End the night' : phase === 'day' ? 'End the day' : ''}</button></div>`, { title: 'THE NIGHT WATCH' });
    wrap = b.querySelector('.ww-wrap');
    const top = b.querySelector('#ww-top'), endB = b.querySelector('#ww-end');
    if (phase === 'dusk') endB.hidden = true;
    b.querySelector('#ww-quit').onclick = () => { if (view) view.stop(); view = null; S.persist(); M.open && M.open(); };
    endB.onclick = () => (phase === 'night' ? dawn() : dusk());
    const marks = () => run.list.filter(x => !run.fixed[x.id]).map(x => ({ scene: x.scene, x: x.x, text: run.locked[x.id] ? 'Locked till dawn' : x.title, color: run.locked[x.id] ? '#8a93b8' : '#e9c56d' }));
    const wx = WW.weather(w.day, phase === 'night' ? 'night' : 'day');
    view = WV.mount(b.querySelector('.ww-view'), {
      st, people: people(phase, w.day), marks: marks(), weather: wx,
      hint: phase === 'night' ? '' : phase === 'dusk' ? 'Walk to Pell at the gate' : '',
      onUse(spot) {
        if (busy) return;
        if (phase === 'night') {
          const x = run.list.find(v => !run.fixed[v.id] && v.scene === st.scene && Math.abs(v.x - st.x) <= WW.REACH);
          if (x) return fix(x, () => view.set('marks', marks()));
        }
        const p = (people(phase, w.day)[st.scene] || []).find(v => Math.abs(v.x - st.x) <= WW.REACH);
        if (p) return talk(p.who);
        const q = quests().find(q => { const s = qstate(q.id), t = q.steps[s.step]; return !s.done && s.step >= 0 && t && t.at && t.at.spot && spot && t.at.spot === spot.id; });
        if (q) return step(q);
      },
      onMove(m) {
        if (busy) return false;
        if (m.via === 'pell-gate') { setTimeout(() => walk('night'), 0); return false; }
        if (m.via === 'castle-exit' && phase === 'night') return false;
        return true;
      },
      onLift(moves) {
        if (busy) return;
        const o = overlay(`<p class="ww-t">Supply hoist</p><div class="ww-ch">${moves.map(m => `<button data-k="${m.key}">${esc(m.label)}</button>`).join('')}</div><div class="row"><button class="ghost" data-a="x">Stay</button></div>`);
        o.querySelectorAll('[data-k]').forEach(el => el.onclick = () => { WW.go(st, el.dataset.k); if (phase === 'night') clock -= 60; close(); });
        o.querySelector('[data-a=x]').onclick = close;
      },
      onTick(s, dt) {
        if (!busy && clock > 0) {
          clock -= dt;
          if (phase === 'night') { const bell = Math.floor((nightS(w.day) - clock) / 60); if (bell > run.bell) { run.bell = bell; } }
          if (clock <= 0) { clock = 0; setTimeout(() => (phase === 'night' ? dawn() : dusk()), 0); }
        }
        const left = run.list.filter(x => !run.fixed[x.id]).length;
        const t = phase === 'dusk' ? `Day ${w.day} · Dusk · 🪙 ${w.silver}` : `${phase === 'night' ? 'Night' : 'Day'} ${w.day} · ${Math.floor(clock / 60)}:${String(Math.floor(clock % 60)).padStart(2, '0')}${busy ? ' (paused)' : ''} · 🪙 ${w.silver}${phase === 'night' ? ` · ${left} breach${left === 1 ? '' : 'es'} left · 🔔 ${run.bell}` : ''}`;
        if (top.textContent !== t) top.textContent = t;
      }
    });
    if (phase === 'dusk') {
      const d = (content().dusk || []).find(x => x.night === w.day);
      sayAll((d ? d.lines.map(l => [d.who || 'pell', l]) : [['pell', 'Night\'s coming. Walk with me to the gate, and keep your lantern low.']]));
    }
    if (phase === 'night' && w.day === 1) sayAll([['pell', 'One problem tonight, at the main gate. Walk to the glowing marker and press use.']]);
  }
  function dusk() { walk('dusk'); }

  // ---- Fix screens ----
  function fix(x, after) {
    if (run.locked[x.id]) { sayAll([['seoyeon', 'I\'ve tried this one twice. It has to wait for morning.']]); return; }
    const best = x.choices.findIndex(c => c.best), q = { q: x.story, choices: x.choices.map(c => c.text), answer: best, why: x.choices[best].why };
    const tries = sv().day === 1 ? 99 : 1;
    choose(x.title, q, tries, ok => {
      if (ok) { run.fixed[x.id] = 1; sv().fixed[x.id] = 1; } else run.locked[x.id] = 1;
      S.persist(); after();
      if (run.list.every(v => run.fixed[v.id] || run.locked[v.id])) sayAll([['seoyeon', 'That\'s everything I can do tonight. Time to report at dawn.']], () => dawn());
    });
  }

  // ---- Dawn ----
  function dawn() {
    if (!run || run.phase !== 'night') return;
    const w = sv(), fixed = run.list.filter(x => run.fixed[x.id]), missed = run.list.filter(x => !run.fixed[x.id]);
    const fines = w.day === 1 ? 0 : missed.length * PAY.miss;
    const pay = PAY.base + fixed.length * PAY.fix + fines;
    missed.forEach(x => { w.missed[x.id] = x.raid || 'Thieves'; });
    w.silver += pay;
    const night = w.day;
    w.day = Math.min(10, w.day + 1);
    w.bonds.day = w.day;
    const xp = M.pay('watch');
    S.persist();
    if (view) view.stop(); view = null; run = null;
    const b = U.panel(`<p class="ww-top">Night ${night} · Dawn</p>
      <ul class="nw-rows">${fixed.map(x => `<li class="nw-r ok"><span class="nw-rr">✓</span><span>${esc(x.title)}</span></li>`).join('')}${missed.map(x => `<li class="nw-r leak"><span class="nw-rr">✗</span><span>${esc(x.title)}${night < 9 ? ' · comes back on the Long Night' : ''}</span></li>`).join('')}</ul>
      <p class="ww-pay">🪙 Pay: ${PAY.base} base + ${fixed.length * PAY.fix} for fixes${fines ? ` ${fines} in fines` : ''} = ${pay} · ${w.silver} saved</p>
      ${xp ? `<p class="small muted">${esc(xp)}</p>` : ''}
      <div class="row"><button class="primary" id="ww-next">${w.day > 9 ? 'The end' : 'Day ' + w.day}</button></div>`, { title: 'THE NIGHT WATCH' });
    b.querySelector('#ww-next').onclick = () => (w.day > 9 ? ending() : morning());
  }
  function ending() {
    const w = sv();
    U.panel(`<p>The nine nights are over. You fixed ${Object.keys(w.fixed).length} breaches and saved ${w.silver} silver.</p><p class="small muted">Endings and the Long Night's raid are still being built.</p>`, { title: 'THE NIGHT WATCH' });
  }

  M.register({
    id: 'watch-walk', name: 'The Night Watch (walkable preview)', host: 'Seo-yeon', minutes: 'about 20 a day and night',
    blurb: 'Walk the town by day for gossip and quests, then patrol the castle at night and fix each breach. Security only.',
    start: () => morning(),
    status: () => { const w = S.save && S.save.watch3; return w && w.v === 3 ? `Day ${Math.min(9, w.day)} of 9 · ${w.silver} silver` : ''; }
  });
  SD.watchWalk = { sv, breaches, quests, people, morning, walk, dawn, talk, fix: x => fix(x, () => {}), get run() { return run; }, get view() { return view; }, get busy() { return busy; } };

  const css = document.createElement('style');
  css.textContent = `
    .ww-wrap { position: relative; }
    .ww-pay { font-weight: 700; color: #7a5410; }
    .ww-top { margin: 0 0 6px; font-size: 13px; font-weight: 700; color: #2c3566; }
    .ww-o { position: absolute; top: 0; left: 0; right: 0; min-height: 100%; display: grid; align-items: start; padding: 8px; background: rgba(4,6,20,.35); border-radius: 10px; }
    .ww-o[hidden] { display: none; }
    .ww-card { width: 100%; box-sizing: border-box; padding: 10px; border-radius: 10px; background: rgba(14,20,56,.97); color: #eef1ff; border: 1px solid #e9c56d; font-size: 14px; }
    .ww-say { margin: 4px 0; line-height: 1.4; } .ww-meta { font-size: 12.5px; color: #c9d0ee; margin: 6px 0; }
    .ww-t { margin: 0 0 4px; font-weight: 700; color: #e9c56d; } .ww-q { margin: 0 0 8px; }
    .ww-ch { display: grid; gap: 6px; margin: 6px 0; }
    .ww-ch button { text-align: left; padding: 9px 10px; min-height: 44px; border-radius: 8px; border: 1px solid rgba(185,196,255,.4); background: rgba(255,255,255,.06); color: inherit; font: inherit; cursor: pointer; }
    .ww-ok { color: #6fcf8a; font-weight: 700; } .ww-no { color: #ff9a9a; font-weight: 700; } .ww-why { font-size: 13px; color: #d6dbf3; }
    .ww-bars { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 6px 0; font-size: 12px; color: #c9d0ee; }
    .ww-bars i { display: block; height: 6px; margin-top: 3px; border-radius: 3px; background: linear-gradient(90deg, #e9c56d calc(var(--v) * 1%), rgba(255,255,255,.12) 0); }
  `;
  document.head.appendChild(css);
})();
