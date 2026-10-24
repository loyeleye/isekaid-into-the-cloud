// Multiplayer (Ladi, 2026-10-24): the raid finder, on the title screen and in the ☰ menu. It lists every expedition
// from the chapters you have beaten and the one you are on, the open parties for them, and a box for a friend's code.
// A party here is a replay on the Borderlands engine (js/raid.js) outside the story: the leader picks any expedition
// they are eligible for, friends join from the list or by code, and the leader can fill the other seats with bots.
// Nothing it does moves the story (no flags, no story cards, no chapter progress); a clear pays REWARD.win XP to each
// player on their own page, half of the 80 a first clear pays in the story, as the game's other replays pay half.
// Every clear, solo, with bots or with friends, also pays Raid Marks (js/marks.js), more for your answers right and
// double with another person still in the party at the end: the currency of the Raid shop, cosmetics only
// (Ladi, Oct 24, in place of the earlier daily party tape).
// A guest who hasn't reached the expedition the leader starts is sent back here (raid.js o.open, 'locked').
//
//   SD.mp.eligible() -> [{ ch, label, done, xps: [expedition] }], in story order: the chapters you can replay
//   SD.mp.open(from, code) -> the finder; from 'title' or 'menu' (back resumes the chapter you were in). With a
//                       code, straight into that party first. A party room's Copy link (js/party.js, #join-CODE)
//                       opens here: the title, once past PRESS START, joins it.
//
// The parties share one directory, 'raid' (the Worker's and net.js's raid prefix, r). A table's info is its
// expedition's name, which is how the list tells which parties you can join.
(function () {
  const U = SD.ui, S = SD.state, $ = U.$, esc = s => U.esc(s);
  const MP = SD.mp = {};
  const REWARD = { win: 40 };

  // Each chapter's save field (as js/demo-select.js) and its expeditions, in story order.
  const CHAPTERS = [
    { n: '1', key: 'c1', label: 'Chapter 1: The Temple of Uptime', xps: ['denymines'] },
    { n: '2', key: 'c2', label: 'Chapter 2: The Mailroom', xps: ['sortingfloors'] },
    { n: '2b', key: 'c2x', label: 'Chapter 2, part 2: The Dead Letter Office', xps: ['deadletter', 'inqtower', 'greynovice'] },
    { n: '3', key: 'c3', label: 'Chapter 3: The Granaries', xps: ['cold', 'abyss', 'cathedral', 'regent'] },
    { n: '4', key: 'c4', label: 'Chapter 4: The Sealed Floors', xps: ['k4gates', 'k4peak', 'k4house', 'k4letter'] },
    { n: '5', key: 'c5', label: 'Chapter 5: The Machine Floors', xps: ['x5shops', 'x5records', 'x5tower'] },
    { n: '6', key: 'c6', label: 'Chapter 6: The Mirror Floors', xps: ['r6stairs', 'r6relay', 'r6vault'] },
    { n: '7', key: 'c7', label: 'Chapter 7: Root', xps: ['r7root'] }
  ];
  MP.CHAPTERS = CHAPTERS;
  const sv = () => S.save || {};
  const saved = c => { const v = sv()[c.key]; return !!(v && (c.key === 'c1' ? v.lead : true)); };
  const done = c => { const v = sv()[c.key]; return !!(v && v.f && v.f.done); };
  const lead = () => (sv().c1 && sv().c1.lead) || null;
  const expOf = id => (SD.expeditions || []).find(x => x.id === id && Array.isArray(x.floors) && x.floors.length >= 2) || null;
  MP.eligible = function () {
    let cur = -1;
    CHAPTERS.forEach((c, i) => { if (saved(c)) cur = i; });
    return CHAPTERS.map((c, i) => ({ ch: c.n, label: c.label, done: done(c), now: i === cur, xps: c.xps.map(expOf).filter(Boolean) }))
      .filter((c, i) => (c.done || i === cur) && c.xps.length);
  };
  const ids = () => [].concat(...MP.eligible().map(c => c.xps.map(x => x.id)));
  MP.available = () => !!(SD.net && SD.raid && SD.raid.available() && SD.party);

  // The replay's say: the floors' lines in your party's voices, without the story's cues (a { who: 'c4' } line plays a
  // chapter's own scene and sets its flags) and with per-lead lines picked for your lead.
  function say(list) {
    const me = (SD.champions && SD.champions.mine && SD.champions.mine()) || lead(), mates = ['mira', 'kai', 'seoyeon', 'dutch'].filter(x => x !== me);
    const out = [];
    (list || []).forEach(l => {
      if (!l || /^c\d$/.test(l.who || '')) return;
      const t = l.text && typeof l.text === 'object' ? (l.text[me] || l.text.other) : l.text;
      if (!t) return;
      const who = l.who === 'lead' ? me : l.who === 'mate1' ? mates[0] : l.who === 'mate2' ? mates[1] : l.who;
      out.push({ s: who && SD.cast && SD.cast[who] ? who : 'narr', t: String(t), e: l.e });
    });
    return out.length ? U.dialog(out) : Promise.resolve();
  }

  function css() {
    if (document.getElementById('mp-css')) return;
    const st = document.createElement('style');
    st.id = 'mp-css';
    st.textContent = `.mp { display: grid; gap: 14px; max-width: 760px; margin: 0 auto; padding: 14px 16px 40px; }
.mp-card { background: var(--paper, #fff8ea); color: var(--ink); border: 3px solid var(--ink); border-radius: 16px; padding: 12px 14px; display: grid; gap: 8px; min-width: 0; }
.mp-card h2, .mp-card h3 { margin: 0; font-family: var(--f-head); }
.mp-card h2 { font-size: 26px; } .mp-card h3 { font-size: 17px; }
.mp-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.mp-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; border-top: 1px solid rgba(0,0,0,.12); padding-top: 8px; }
.mp-list li:first-child { border-top: 0; padding-top: 0; }
.mp-txt { min-width: 0; flex: 1 1 200px; }
.mp-txt small { display: block; color: var(--muted); }
.mp-btns { display: flex; gap: 6px; flex-wrap: wrap; }
.mp .mi-btn { min-height: 44px; }
.mp-chip { font: 700 11px var(--f-body); border-radius: 999px; padding: 1px 8px; border: 2px solid var(--ink); background: #fff; white-space: nowrap; }
.mp-chip.ok { background: #dff4ea; border-color: #1f8a57; color: #1f6b46; } .mp-chip.now { background: var(--sun, #ffe14d); }
.mp-code { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.mp-code input { font: 700 18px var(--f-head); letter-spacing: .18em; text-transform: uppercase; width: 8.5em; min-height: 44px; padding: 4px 10px; border: 3px solid var(--ink); border-radius: 12px; }
.mp-why { min-height: 1.2em; margin: 0; }
#screen-run .mp-card :is(.mi-tag, .muted, small) { color: #5f566e; }
#screen-run .mp-code input { background: #fff; color: var(--ink); }
#screen-run .mp-code input::placeholder { color: #a39cae; }`;
    document.head.appendChild(st);
  }

  // ---------- Raid Marks ----------
  const marksNote = () => { const P = SD.marks.PAY; return `Every clear also pays Raid Marks: ${P.clear}, plus ${P.perRight} for each of your answers right (up to ${P.rightCap}), doubled with another player in the party.`; };
  // The Raid shop: outfit recolors, effects and frames for marks (js/marks.js); a Wear button once js/wear.js is loaded.
  function shop() {
    const W = SD.wear, draw = () => {
      const worn = W && W.worn ? Object.values(W.worn()) : [];
      const body = `<p class="small" style="margin:0 0 10px">You have <b>${SD.marks.balance()} ✦</b>. Cosmetics only: they change how your lead looks, never how they play.</p>
        <ul class="mp-list">${SD.marks.ITEMS.map(it => { const own = SD.marks.owns(it.id), on = worn.includes(it.id);
          return `<li><div class="mp-txt"><b>${esc(it.name)}</b><small>${esc(SD.marks.SLOTS[it.slot] || it.slot)}${it.tier ? ' · ' + it.tier[0].toUpperCase() + it.tier.slice(1) : ''}${own ? ' · yours' : ` · ${it.cost} ✦`}</small></div>
            <div class="mp-btns">${own ? (W && W.equip ? `<button class="mi-btn sm${on ? '' : ' go'}" type="button" data-wear="${esc(it.id)}">${on ? 'Take off' : 'Wear'}</button>` : '')
              : `<button class="mi-btn go sm" type="button" data-buy="${esc(it.id)}"${SD.marks.balance() < it.cost ? ' disabled' : ''}>Buy</button>`}</div></li>`; }).join('')}</ul>`;
      const box = U.panel(body, { title: 'RAID SHOP' });
      box.querySelectorAll('[data-buy]').forEach(b => { b.onclick = () => { if (SD.marks.buy(b.dataset.buy)) draw(); }; });
      box.querySelectorAll('[data-wear]').forEach(b => { b.onclick = () => { const it = SD.marks.item(b.dataset.wear); if (worn.includes(it.id)) W.unequip(it.slot); else W.equip(it.id); draw(); }; });
    };
    draw();
  }

  // ---------- The finder ----------
  let busy = false, from = 'title';
  MP.open = async function (where, code) {
    if (busy || !MP.available()) return;
    busy = true;
    from = where || 'title';
    css();
    U.closePanel();
    if (from === 'menu') SD.main.haltWorlds();
    SD.main.show('run');
    if (SD.audio) SD.audio.music('town');
    let hub = null, dir = null, note = '';
    try {
      hub = await SD.net.open();
      dir = await hub.directory('raid');
      for (let first = true; ; first = false) {
        const pick = first && code ? { code } : await finder(dir, note);
        note = '';
        if (!pick) break;
        const why = await play(hub, dir, pick);
        const lx = /^locked:/.test(why || '') ? expOf(why.slice(7)) : null;
        note = lx ? `The leader started ${lx.name}, which you haven't reached in the story yet. Pick a party on one of yours.` : { full: 'That party is full.', kicked: 'The leader removed you from the party.' }[why] || '';
      }
    } catch (e) {
      console.warn('Multiplayer:', e);
      U.system('MULTIPLAYER', 'Couldn\'t reach the party list. Check your connection and try again.');
    } finally {
      if (dir) dir.leave();
      busy = false;
    }
    back();
  };
  function back() {
    $('#run').innerHTML = '';
    if (from !== 'menu') return SD.main.title();
    // Back to the chapter you were in, as the title's Continue would.
    const c = SD.demo && SD.demo.chapters && SD.demo.chapters.slice().reverse().find(x => (x.resume || (SD.chapterStart && SD.chapterStart[x.n])) && saved(x));
    if (c) return c.resume ? c.resume() : SD.chapterStart[c.n]();
    if (SD.ch1 && lead()) return SD.ch1.resume();
    SD.main.title();
  }

  // The list: open parties you can join, your expeditions by chapter, and a friend's code. Resolves to
  // { code, create, xp } or null for Back.
  function finder(dir, note) {
    const net = SD.net, root = $('#run');
    return new Promise(res => {
      let off = null, sig = '';
      const draw = () => {
        const ch = MP.eligible(), mine = new Set(ids()), byName = {};
        (SD.expeditions || []).forEach(x => { byName[x.name] = x; });
        const tables = dir.tables().filter(t => net.cleanCode(t.code).length >= 4);
        const xOf = t => byName[String(t.info || '').replace(/ · floor \d+$/, '')] || null;
        const ok = tables.filter(t => { const x = xOf(t); return x && mine.has(x.id); });
        const hidden = tables.length - ok.length;
        const count = id => ok.filter(t => xOf(t).id === id).length;
        // The list only redraws when what it shows changes, so it doesn't jump under a thumb on every heartbeat.
        const now = JSON.stringify([ok.map(t => [t.code, t.players, t.max, t.info]), hidden, note, SD.marks.balance()]);
        if (now === sig) return;
        sig = now;
        root.innerHTML = `<div class="mp">
          <div class="row" style="margin:0;justify-content:space-between;align-items:center"><button class="ghost" type="button" id="mp-back">‹ ${from === 'menu' ? 'Back to the story' : 'Back to the title'}</button>
            ${ok.length ? '<button class="primary" type="button" id="mp-quick">Quick join</button>' : ''}</div>
          <div class="mp-card"><span class="mi-tag">Multiplayer · Expedition raids</span><h2>Find a party</h2>
            <p class="small" style="margin:0">Replay any expedition from a chapter you've beaten or the one you're on, with friends or with bots. Replays don't move the story. A clear pays each player ${REWARD.win} XP. ${marksNote()}</p>
            <div class="row" style="margin:0;align-items:center;gap:10px"><span class="mp-chip" id="mp-marks" title="Raid Marks">${SD.marks.balance()} ✦</span><button class="mi-btn sm" type="button" id="mp-shop">Raid shop</button></div>
            ${note ? `<p class="small" role="status" style="margin:0"><b>${esc(note)}</b></p>` : ''}</div>
          <div class="mp-card"><h3>Open parties you can join</h3>
            ${ok.length ? `<ul class="mp-list">${ok.map(t => { const x = xOf(t); return `<li><div class="mp-txt"><b>${esc(x.name)}</b><small>${esc(t.nick || 'A party')} · ${t.players | 0}/${t.max | 0} players · ${esc(SD.raid.level(x))}</small></div>
              <div class="mp-btns"><button class="mi-btn go sm" type="button" data-join="${esc(net.cleanCode(t.code))}">Join</button></div></li>`; }).join('')}</ul>`
              : '<p class="muted small" style="margin:0">No open parties for your expeditions right now. Host one below, and friends can join with its code.</p>'}
            ${hidden > 0 ? `<p class="muted small" style="margin:0">${hidden} more open part${hidden === 1 ? 'y is' : 'ies are'} on expeditions you haven't reached yet.</p>` : ''}
            <div class="mp-code"><label class="small" for="mp-code"><b>A friend's code</b></label><input id="mp-code" maxlength="5" autocomplete="off" autocapitalize="characters" placeholder="Code" aria-describedby="mp-why"><button class="mi-btn sm" type="button" id="mp-go">Join</button></div>
            <p class="muted small mp-why" id="mp-why" role="status">Party codes are 5 letters and start with R.</p></div>
          ${ch.length ? ch.map(c => `<div class="mp-card"><h3>${esc(c.label)} ${c.done ? '<span class="mp-chip ok">Cleared</span>' : c.now ? '<span class="mp-chip now">You are here</span>' : ''}</h3>
            <ul class="mp-list">${c.xps.map(x => { const n = count(x.id); return `<li><div class="mp-txt"><b>${esc(x.name)}</b><small>${esc(SD.raid.level(x))}, ${x.floors.length} floors${n ? ` · ${n} open part${n === 1 ? 'y' : 'ies'}` : ''}</small></div>
              <div class="mp-btns">${n ? `<button class="mi-btn sm" type="button" data-find="${esc(x.id)}">Join a party</button>` : ''}<button class="mi-btn go sm" type="button" data-host="${esc(x.id)}">Host</button></div></li>`; }).join('')}</ul></div>`).join('')
            : '<div class="mp-card"><p style="margin:0">No expeditions yet. Start the story: chapter 1\'s Deny Mines is the first.</p></div>'}
</div>`;
        root.querySelectorAll('[data-join]').forEach(b => { b.onclick = () => end({ code: b.dataset.join }); });
        root.querySelectorAll('[data-find]').forEach(b => { b.onclick = () => { const t = ok.find(y => xOf(y).id === b.dataset.find); if (t) end({ code: net.cleanCode(t.code) }); }; });
        root.querySelectorAll('[data-host]').forEach(b => { b.onclick = () => end({ code: net.code('raid'), create: true, xp: b.dataset.host }); });
        const why = root.querySelector('#mp-why'), input = root.querySelector('#mp-code');
        const go = () => {
          const c = net.cleanCode(input.value);
          if (c.length !== 5 || net.gameOf(c) !== 'raid') { why.textContent = 'Party codes are 5 letters and start with R, like R7KQP.'; return; }
          end({ code: c });
        };
        root.querySelector('#mp-go').onclick = go;
        input.onkeydown = e => { if (e.key === 'Enter') go(); };
        root.querySelector('#mp-back').onclick = () => end(null);
        root.querySelector('#mp-shop').onclick = () => { shop(); };
        const qj = root.querySelector('#mp-quick');
        // Quick join: the open party with the most players already in it (the soonest to start), oldest first.
        if (qj) qj.onclick = () => { const t = ok.slice().sort((a, b) => (b.players | 0) - (a.players | 0))[0]; if (t) end({ code: net.cleanCode(t.code) }); };
      };
      const end = v => { if (off) off(); res(v); };
      off = dir.onTables(() => { if (!root.contains(document.activeElement) || document.activeElement.id !== 'mp-code') draw(); }) || null;
      draw();
    });
  }

  // One party: the party room, the expedition, and the reward. Resolves to how the player left (raid.js).
  async function play(hub, dir, pick) {
    const RD = SD.raid, net = SD.net, root = $('#run');
    if (lead() && SD.champions && SD.champions.setMine) SD.champions.setMine(lead());
    let status = null, last = '', hosting = false, listed = true;
    const beat = () => {
      const st = status ? status() : null;
      if (!st || !st.lead) { if (hosting) { hosting = false; last = ''; dir.unhost(); } return; }
      const info = { code: pick.code, nick: hub.me.nick, players: st.players, max: st.max, open: !!(listed && st.open), champ: st.champ || null, info: net.clean(st.info, 48) };
      const j = JSON.stringify(info);
      if (j !== last) { last = j; hosting = true; dir.host(info); }
    };
    const poll = setInterval(beat, 1000);
    const onFinish = r => {
      if (!r || !r.won || !ids().includes(r.xp)) return;
      SD.run.gainXp(REWARD.win);
      const n = SD.marks.pay(r);
      U.system('REPLAY CLEARED', `${esc((expOf(r.xp) || {}).name || 'The expedition')}: +${REWARD.win} XP and +${n} ✦ Raid Marks${(r.humans | 0) >= 2 ? ' (doubled: you played with another person)' : ''}. The story stays where you left it.`, 'gold');
    };
    try {
      const rewardNote = `A clear pays ${REWARD.win} XP each, and Raid Marks for the Raid shop: double with another player. The story stays where you left it.`;
      return await RD.play(root, hub, pick.code, { create: !!pick.create, xp: pick.xp, open: ids(), label: 'Multiplayer', champNames: true, say, onFinish, rewardNote,
        status: f => { status = f; beat(); }, vis: { get: () => listed, set: v => { listed = !!v; beat(); } } });
    } finally { clearInterval(poll); if (hosting) dir.unhost(); }
  }

  // ---------- Where it's offered ----------
  // The title: a Multiplayer button after Continue and New game. This is the outermost title patch (it loads after
  // js/demo-select.js, whose patch replaces the buttons the chapters leave), so it adds to whatever those drew.
  const boot = () => {
    const M = SD.main, title = M.title;
    M.title = function () {
      title();
      const box = $('#title-actions');
      if (!box || box.querySelector('#t-start') || box.querySelector('#t-mp') || !MP.available()) return;
      const b = document.createElement('button');
      b.className = 'ghost'; b.id = 't-mp'; b.type = 'button'; b.textContent = 'Multiplayer';
      b.onclick = () => MP.open('title');
      const help = box.querySelector('#t-help');
      box.insertBefore(b, help || null);
      // An invite link: once, straight into the party.
      const m = /^#join-([a-z0-9]{5})$/i.exec(location.hash || '');
      if (m && SD.net.gameOf(SD.net.cleanCode(m[1])) === 'raid') {
        try { history.replaceState(null, '', location.href.split('#')[0]); } catch (e) { location.hash = ''; }
        setTimeout(() => MP.open('title', SD.net.cleanCode(m[1])), 0);
      }
    };
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(() => { boot(); if (!$('#screen-title').hidden) SD.main.title(); }, 0), { once: true });
  else { boot(); if (!$('#screen-title').hidden) SD.main.title(); }
})();
