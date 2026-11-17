// Terms I own (Ladi, Nov 17: is the AWS spelling sticking?). One page, opened from its own card in the title's games
// carousel (js/title-games.js), that lists every term this save has typed in the "type it once" step (js/type-once.js),
// in any mode: its AWS spelling in code font, when it was last typed, its recall level and when it comes back.
//   - Grouped by the chosen exam's domain and task (SD.exam: DVA-C02 or SAA-C03). A term's task is the one most bank
//     questions that mention it are tagged with (q.dva / q.saa); a term no bank question mentions goes under Other.
//   - Spelling: what T.mark recorded (S.save.typedAs, kept from now on), else the older saves' own records
//     (renoKeep.typed, icTyped keep the case), else the first place the bank spells it, else as stored (lower case).
//   - Due terms come first: a domain with a due term leads, then its tasks with a due term, and inside each task the
//     due terms, then the soonest due.
//   - A due term is a button: it asks for it from memory right there (SD.typeOnce.ask, two misses show it faintly),
//     which reschedules it through T.mark, and the page redraws.
//   - Opens on the full-screen mode stage (js/mode-stage.js), so it has the modes' dark glass and Home.
// API: SD.terms.open()  the page.  SD.terms.rows()  [{ key, spell, at, n, due, isDue, days, task, label }] (for checks).
//      SD.terms.summary()  { typed, due }, for the carousel card's line.
(function () {
  const TM = SD.terms = {};
  const U = SD.ui, S = SD.state;
  const esc = s => U.esc(String(s == null ? '' : s));
  const DAY = 864e5;
  const sv = () => S.save || {};
  const key = s => String(s || '').trim().toLowerCase();
  const obj = o => (o && typeof o === 'object' ? o : {});   // older saves stored the Explain questions setting here as a boolean

  // Every typed term's key, with any original spelling an older record kept.
  function keys() {
    const out = new Map();
    Object.keys(obj(sv().typed)).forEach(k => out.set(key(k), null));
    [obj(sv().renoKeep && sv().renoKeep.typed), obj(sv().icTyped)].forEach(o => Object.keys(o).forEach(t => {
      const k = key(t);
      if (!out.get(k) && t !== k) out.set(k, t); else if (!out.has(k)) out.set(k, null);
    }));
    out.delete('');
    return out;
  }

  // The bank as searchable text, once: [{ text, task }] for the chosen exam's tagged questions, plus the rest for
  // spelling only. Every string field of a question is in its text.
  let bankText = null, bankFor = '';
  const flat = v => (typeof v === 'string' ? v : Array.isArray(v) ? v.map(flat).join('\n') : v && typeof v === 'object' ? Object.keys(v).filter(k => k !== 'doc' && k !== 'id').map(k => flat(v[k])).join('\n') : '');
  function bank() {
    const E = SD.exam, tk = E ? E.cfg().key : 'dva';
    if (bankText && bankFor === tk) return bankText;
    bankFor = tk;
    return (bankText = (SD.bank || []).concat(SD.questions || []).map(q => ({ text: flat(q), task: q[tk] || '' })));
  }
  const word = /[A-Za-z0-9_]/;
  // Where the term sits in a text, whole (not inside a longer name): the index, or -1.
  function find(text, k) {
    const low = text.toLowerCase();
    let i = low.indexOf(k);
    while (i >= 0) {
      const a = text[i - 1], b = text[i + k.length];
      if ((!a || !word.test(a) || !word.test(k[0])) && (!b || !word.test(b) || !word.test(k[k.length - 1]))) return i;
      i = low.indexOf(k, i + 1);
    }
    return -1;
  }
  // The sentence around the term, for the recall's line (so you know which term it asks for).
  function around(text, at, len) {
    const st = Math.max(text.lastIndexOf('. ', at) + 2, text.lastIndexOf('\n', at) + 1, 0);
    let en = text.length;
    ['. ', '\n'].forEach(s => { const j = text.indexOf(s, at + len); if (j >= 0 && j + 1 < en) en = j + 1; });
    let line = text.slice(st, en).trim();
    if (line.length > 150) { const a = Math.max(0, at - st - 60); line = (a ? '…' : '') + line.slice(a, a + 150).trim() + '…'; }
    return line;
  }
  const meta = {};   // key -> { spell, task, line }
  function look(k, known) {
    if (meta[k] && meta[k].for === bankFor) return meta[k];
    const tally = {};
    let spell = known || '', line = '';
    bank().forEach(b => {
      const i = find(b.text, k);
      if (i < 0) return;
      const exact = b.text.slice(i, i + k.length);
      if (!spell) spell = exact;
      if (!line && (!known || exact === known)) line = around(b.text, i, k.length);
      if (b.task) tally[b.task] = (tally[b.task] || 0) + 1;
    });
    const task = Object.keys(tally).sort((a, b) => tally[b] - tally[a] || (a < b ? -1 : 1))[0] || '';
    return (meta[k] = { for: bankFor, spell, task, line });
  }

  TM.rows = function () {
    const T = SD.typeOnce, typedAs = obj(sv().typedAs), now = Date.now(), out = [];
    keys().forEach((old, k) => {
      if (!T.learned(k)) return;
      const isDue = T.due(k);                         // also gives an older save's term its place in the schedule
      const m = look(k, typedAs[k] || old);
      const spell = typedAs[k] || old || m.spell || k;
      const sl = obj(sv().typedDue)[k] || {};
      const at = +obj(sv().typed)[k] || 0;
      const due = +sl.due || now;
      out.push({ key: k, spell, at, n: sl.n | 0, due, isDue, days: isDue ? 0 : Math.max(1, Math.round((due - now) / DAY)),
        task: m.task, line: m.line && m.line.toLowerCase().includes(k) ? m.line : '' });
    });
    return out;
  };
  TM.summary = () => { let r = []; try { r = TM.rows(); } catch (e) { r = []; } return { typed: r.length, due: r.filter(x => x.isDue).length }; };

  const date = t => (t ? new Date(t).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'before this page');
  const pips = n => { const k = Math.min(5, n); return `<span class="tm-pips" aria-hidden="true">${'<i class="on"></i>'.repeat(k)}${'<i></i>'.repeat(5 - k)}</span>`; };
  const when = r => (r.isDue ? '<span class="tm-due">Due now</span>' : `due in ${r.days === 1 ? '1 day' : r.days + ' days'}`);

  function groups(rows) {
    const E = SD.exam, tasks = E ? E.TASKS : {}, doms = E ? E.DOMAINS : {};
    const by = {};
    rows.forEach(r => { const t = tasks[r.task] ? r.task : ''; (by[t] = by[t] || []).push(r); });
    const order = (a, b) => (b.isDue - a.isDue) || (a.due - b.due) || (a.spell.toLowerCase() < b.spell.toLowerCase() ? -1 : 1);
    const list = Object.keys(by).map(t => ({ task: t, name: t ? tasks[t] : 'Other', dom: t ? +t[0] : 9, domName: t ? doms[+t[0]] : '', rows: by[t].sort(order) }));
    // Domains with a due term first, then exam order; inside a domain, tasks with a due term first, then task order.
    // Other (no task) is its own last domain unless it holds a due term.
    const dueIn = rs => +rs.some(r => r.isDue);
    const domDue = {};
    list.forEach(g => { domDue[g.dom] = (domDue[g.dom] | 0) || dueIn(g.rows); });
    return list.sort((a, b) => (domDue[b.dom] - domDue[a.dom]) || (a.dom - b.dom) || (dueIn(b.rows) - dueIn(a.rows)) || (a.task < b.task ? -1 : a.task > b.task ? 1 : 0));
  }

  function rowHtml(r) {
    const info = `<span class="tm-meta">Typed ${esc(date(r.at))} · ${pips(r.n)}<span class="tm-lv">level ${r.n}</span> · ${when(r)}</span>`;
    const code = `<code class="tm-term">${esc(r.spell)}</code>`;
    return r.isDue
      ? `<li><button type="button" class="tm-row tm-go" data-term="${esc(r.key)}" aria-label="Recall ${esc(r.spell)} from memory, due now">${code}${info}<span class="tm-cta" aria-hidden="true">Recall ›</span></button></li>`
      : `<li><div class="tm-row" data-term="${esc(r.key)}">${code}${info}</div></li>`;
  }

  function render() {
    const rows = TM.rows(), due = rows.filter(r => r.isDue).length;
    const E = SD.exam, exam = E ? E.NAME : 'the exam';
    let h;
    if (!rows.length) {
      h = `<div class="tm-empty"><p class="tm-big">No terms typed yet.</p>
        <p>The first time an AWS term comes up in a game mode (the Fire Drill, Monster Hunt, the Exam Sprint, the Look-Alike Cup), you type it in yourself, the way AWS spells it. Every one you type lands here, with when it comes back.</p>
        <div class="row"><button type="button" class="primary" id="tm-back">Pick a game</button></div></div>`;
    } else {
      h = `<p class="tm-count" tabindex="-1"><b>${rows.length}</b> term${rows.length === 1 ? '' : 's'} typed · <b>${due}</b> due</p>
        <p class="small tm-help">${due ? 'Tap a due term to recall it from memory now. ' : ''}Each clean recall doubles the gap: 1, 2, 4, 8, 16 days. A miss starts it over. Grouped by ${esc(exam)} task.</p>`;
      let dom = -1;
      groups(rows).forEach(g => {
        if (g.dom !== dom) { if (dom !== -1) h += '</section>'; dom = g.dom; h += `<section class="tm-dom"><h3>${g.task ? `Domain ${g.dom} · ${esc(g.domName)}` : 'Other'}</h3>`; }
        const nd = g.rows.filter(r => r.isDue).length;
        h += `${g.task ? `<h4><span class="tm-tk">${esc(g.task)}</span> ${esc(g.name)}</h4>` : ''}
          <p class="tm-sub">${g.rows.length} typed${nd ? ` · ${nd} due` : ''}</p><ul class="tm-list">${g.rows.map(rowHtml).join('')}</ul>`;
      });
      h += '</section>';
    }
    const b = U.panel(`<div class="tm-w">${h}</div>`, { title: 'TERMS I OWN', cls: 'tm-win' });
    const back = b.querySelector('#tm-back');
    if (back) back.onclick = () => U.closePanel();
    b.querySelectorAll('.tm-go').forEach(el => el.onclick = () => recall(el.dataset.term));
    return b;
  }

  async function recall(k) {
    const r = TM.rows().find(x => x.key === k);
    if (!r || !r.isDue) return render();
    const line = r.line ? r.line.replace(new RegExp(r.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), r.spell) : r.spell;
    const res = await SD.typeOnce.ask({ line: line.includes(r.spell) ? line : r.spell, ans: r.spell, title: 'FROM MEMORY' });
    render();
    const b = document.querySelector('#panel .tm-w');
    const row = b && b.querySelector(`[data-term="${CSS.escape(k)}"]`);
    if (row) row.classList.add('tm-just');
    // Focus the next due term, else the count, so a keyboard player carries on from here.
    const f = b && (b.querySelector('.tm-go') || b.querySelector('.tm-count'));
    try { if (f) f.focus(); } catch (e) { /* fine */ }
    return res;
  }

  TM.open = function () {
    if (SD.modeStage && SD.modeStage.enter) SD.modeStage.enter({ id: 'terms', name: 'Terms I own' });
    const b = render();
    const f = b.querySelector('.tm-go, #tm-back');
    setTimeout(() => { try { (f || b).focus(); } catch (e) { /* fine */ } }, 60);
    return b;
  };

  const css = document.createElement('style');
  css.textContent = `
    .tm-win .tm-w { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
    .tm-count { margin: 0; font: 800 20px/1.25 var(--f-body, Nunito), system-ui, sans-serif; color: var(--ink); }
    .tm-count b { color: var(--sun); }
    .tm-help { margin: 0 0 6px; color: var(--muted); }
    .tm-dom { margin-top: 10px; min-width: 0; }
    .tm-dom h3 { margin: 6px 0 2px; font: 700 15px/1.3 var(--f-head, Cinzel), serif; color: var(--sun); letter-spacing: .02em; }
    .tm-dom h4 { margin: 8px 0 0; font: 800 14px/1.3 var(--f-body, Nunito), system-ui, sans-serif; color: var(--ink); }
    .tm-tk { display: inline-block; min-width: 2.4em; padding: 0 5px; margin-right: 4px; border-radius: 5px; background: rgba(214, 178, 84, .2); color: var(--sun); text-align: center; }
    .tm-sub { margin: 0 0 4px; color: var(--muted); font-size: 12px; }
    .tm-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .tm-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 2px 10px; width: 100%; min-height: 44px; box-sizing: border-box;
      padding: 8px 10px; border-radius: 10px; text-align: left; border: 1px solid var(--line); background: rgba(0, 0, 0, .14); color: var(--ink); font: inherit; }
    .win .tm-row.tm-go { cursor: pointer; border-color: rgba(214, 178, 84, .7); background: rgba(214, 178, 84, .1); box-shadow: none; }
    .win .tm-row.tm-go:hover, .win .tm-row.tm-go:focus-visible { background: rgba(214, 178, 84, .2); }
    .tm-row:focus-visible { outline: 3px solid #ffe58a; outline-offset: 2px; }
    .tm-term { grid-column: 1; justify-self: start; max-width: 100%; padding: 2px 7px; border-radius: 6px; background: #1c1a24; color: #ffe58a;
      font: 600 14px/1.5 ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
    .tm-meta { grid-column: 1; color: var(--muted); font-size: 12px; line-height: 1.5; }
    .tm-cta { grid-column: 2; grid-row: 1 / span 2; color: var(--sun); font-weight: 800; font-size: 13px; white-space: nowrap; }
    .tm-due { display: inline-block; padding: 0 6px; border-radius: 6px; background: #d6b254; color: #1d1a26; font-weight: 800; font-size: 11px; }
    .tm-pips { display: inline-flex; gap: 2px; vertical-align: 1px; margin-right: 3px; }
    .tm-pips i { width: 6px; height: 6px; border-radius: 50%; border: 1px solid var(--muted); }
    .tm-pips i.on { background: var(--sun); border-color: var(--sun); }
    .tm-just { animation: tmjust 1.2s ease-out; }
    @keyframes tmjust { from { box-shadow: 0 0 0 3px rgba(255, 229, 138, .8); } to { box-shadow: 0 0 0 3px rgba(255, 229, 138, 0); } }
    .tm-empty { padding: 8px 0; }
    .tm-empty .tm-big { font: 700 18px/1.3 var(--f-head, Cinzel), serif; color: var(--sun); margin: 0 0 6px; }
    body.in-mode[data-stage="terms"] #mode-stage .ms-bg { background: radial-gradient(90% 70% at 50% 30%, #2a2536, #0c0a10); }
    @media (prefers-reduced-motion: reduce) { .tm-just { animation: none; outline: 2px solid #ffe58a; } }`;
  document.head.appendChild(css);
})();
