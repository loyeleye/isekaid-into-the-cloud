// One step of the chapter 1 playthrough, run in the page: the prologue, the climb up Mount Quota, the Deny Mines,
// the summit and the temple, each through its own handlers. Returns what it did ('done' at the end card).
// tools/ch1_check.js runs it with page.evaluate; tools/vector_check.js installs it as window.__ch1step.
module.exports = function ch1Step([WIN, LEAD]) {
  const vis = el => el && !el.hidden && el.offsetParent !== null;
  const $ = s => document.querySelector(s);
  const click = el => { el.click(); return true; };
  const sv = SD.state.save, c1 = sv.c1;
  if ($('#c1-again') && vis($('#c1-again'))) return 'done';
  // The visual-novel prologue (js/vn.js): play each moment as it appears, then read on.
  const vn = $('#vn');
  if (vn && !vn.hidden) {
    window.__vnShots = window.__vnShots || {};
    const btn = [...vn.querySelectorAll('.vn-act button')].find(x => !x.disabled);
    if (btn) { const k = 'act-' + vn.querySelector('.vn-panel').className.split(' ')[1]; if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:prologue-' + k; } return click(btn) && 'vn-act'; }
    const box = vn.querySelector('.vn-box');
    if (box.hidden || !vn.classList.contains('vn-ready')) return 'vn-wait';
    const k = (vn.classList.contains('vn-incg') ? 'cg-' : '') + box.dataset.who;
    if (!window.__vnShots[k]) { window.__vnShots[k] = 1; return 'scene:prologue-' + k; }
    box.click(); return 'vn-line';
  }
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
    if ((x = p.querySelector('#q-num')) && !x.value) { x.value = '10800'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'num'; }
    if ((x = p.querySelector('#q-text')) && !x.value) { x.value = 'The trust policy says who can assume the role, and the permissions say what it can do.'; x.dispatchEvent(new Event('input', { bubbles: true })); return 'text'; }
    if ((x = b('#q-confirm, #q-next, #pm-ok'))) return click(x) && 'next';
    // The Deny Mines' Policy Sort: a guess, then each request sorted (all Allowed, so some are wrong).
    if ((x = b('.ps-n'))) return click(x) && 'sort-guess';
    if ((x = [...p.querySelectorAll('.ps-tg')].find(g => !g.querySelector('.on')))) return click(x.querySelector('button')) && 'sort-one';
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
  // The Deny Mines (js/ch1-mines.js on js/raid.js): a story dungeon with three bots.
  const rd = $('#run .rd');
  if (vis($('#run')) && rd) {
    const T = ((SD.debug || {}).raid) || ((SD.test || {}).raid);
    if (!T) return 'mines-wait';
    if (window.__paced !== T) { window.__paced = T; T.pace(0.05); }
    let x;
    if ((x = rd.querySelector('#rd-back'))) { const G = T.G(); return click(x) && 'mines:back:' + G.ph + ':' + JSON.stringify(G.end); }
    const G = T.G(), mine = G.players[T.me()], ph = rd.dataset.ph;
    if (ph === 'fight') {
      if (WIN) { T.win(); return 'mines:win'; }
      if (!mine || mine.ready) return 'mines-wait';
      if ((x = rd.querySelector('[data-mate]'))) return click(x) && 'mines:mate';
      const c = [...rd.querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
      if (c) return click(c) && 'mines:play:' + G.main;
      return click(rd.querySelector('#rd-ready')) && 'mines:ready';
    }
    if (ph === 'map') {
      if (G.votes[T.me()]) return 'mines-wait';
      const n = rd.querySelector('.node.can:not([disabled])');
      return n ? click(n) && 'mines:node:' + n.className.split(' ')[1] : 'mines-wait';
    }
    if ((x = rd.querySelector('#rd-ask'))) return click(x) && 'mines:ask';
    const send = [...rd.querySelectorAll('[data-send]')].filter(b => !b.disabled && b.offsetParent !== null);
    for (const k of ['take', 'evote', 'wvote', 'one', 'rest', 'up', 'rm', 'done', 'skip']) {
      const y = send.find(b => JSON.parse(b.dataset.send).k === k);
      if (y) return click(y) && 'mines:' + k;
    }
    const r = G.room || {};
    return 'mines-wait:' + ph + ':' + (r.t || '') + ':fl' + G.fl + ':sla' + G.sla + ':' + JSON.stringify([r.wait && r.wait[T.me()], r.todo && r.todo[T.me()], r.res && r.res[T.me()], send.map(b => b.dataset.send), !!document.querySelector('#panel:not([hidden])'), !document.querySelector('#dialog').hidden]);
  }
  if (vis($('#run'))) {
    const end = $('#end-turn');
    if (end) {
      const C = SD.run.api.combat();
      if (C.busy) return 'combat-wait';
      if (WIN && C && !C.over && C.eid !== 'kyu' && C.eid !== 'lockeddoor') { C.sev = 0; SD.run.api.win(); return 'win'; }
      const c = [...$('#run').querySelectorAll('.hand .card')].find(c => !c.classList.contains('dim'));
      if (c) return click(c) && 'play:' + C.eid;
      return click(end) && 'end-turn';
    }
    const n = $('#run').querySelector('.node.can');
    if (n) return click(n) && 'node:' + n.className.split(' ')[1];
    return 'run-wait';
  }
  // The climb up Mount Quota (js/ch1-mountain.js), each step through its own handlers.
  if (vis($('#screen-world')) && SD.ch1m && SD.ch1m.active()) {
    const f = c1.f, M = SD.ch1m.debug, sc = M.scene();
    if (M.busy() || !sc) return 'mountain-wait';
    if (!f.m_wake) return 'mountain-wait';
    const talk = id => { sc.onTalk(id); return 'climb:' + id; };
    const go = (x, y, k) => { M.place(x, y); return 'climb:' + k; };
    if (!f.cart) return talk('cart');
    if (!f.m_board) return talk('board');
    if (!f.m_map) return talk('trailmap');
    if (!f.m_go) return talk('freya');
    if (!f.m_locker) return talk('locker');
    if (!f.m_rest1) return go(4, 44, 'rest1');
    if (!f.m_toll) return talk('keeper');
    if (!f.m_rest2) return go(29, 39, 'rest2');
    if (!f.m_ledge) return talk('ledge');
    if (!f.m_rock) return go(16, 30, 'rockfall');
    if (!f.m_mines) { sc.onDoor('cave'); return 'climb:mines'; }
    if (!f.m_lift) return talk('lift');
    if (!f.m_op) return talk('motor');
    if (!f.m_log) return talk('logbook');
    if (!f.m_rest3) return go(18, 7, 'rest3');
    M.place(16, 2); sc.onDoor('summit'); return 'climb:summit';
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
};
