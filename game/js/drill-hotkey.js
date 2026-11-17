// The Fire Drill's partition key desk (Ladi's audit, Nov 17: gestures that mirror how the AWS concept works). At the
// Store, the table's partition key isn't a dial: a key schema is set when a table is created and can't be changed, so
// you create orders-v2 by tapping the attribute on a sample order item that becomes its partition key. Under it, one
// tick of writes falls into the table's partitions by a hash of the chosen key: a key with few values (status, nearly
// every order PENDING) piles them into one partition, which takes only so many writes and throws ThrottlingException
// at the rest; a key with many values (orderId, or status plus a calculated suffix) spreads them. The real syntax sits
// beside it, KeySchema rewritten as you choose.
//   - Each attribute is the same change as the key cards it stands for (kstatus, korder, kshard in js/drill-core.js),
//     placed by mode-drill.js's [data-card] handler, so costs, refusals and the sim don't change.
//   - The partitions use the sim's own placement (SD.awsSim.partitionOf) and caps (D.PARTS, D.PER_PART).
//   - Items fall only when the key changes; prefers-reduced-motion shows them in place. Buttons, so Tab and Enter work.
// SD.drillHotKey.html(f) → the desk's markup; mode-drill.js draws it in place of the old key dial.
(function () {
  const D = SD.drill, AS = SD.awsSim, U = SD.ui;
  if (!D || !AS || !U) return;
  const C = D.CARDS, esc = s => U.esc(String(s == null ? '' : s));
  // The sample item, an order as the shop writes it. key: the card that makes that attribute the partition key.
  const ITEM = [
    { attr: 'orderId', val: '"ord-1041"', key: 'korder', note: 'one per order' },
    { attr: 'status', val: '"PENDING"', key: 'kstatus', note: 'almost always PENDING' },
    { attr: 'statusShard', val: '"PENDING#4"', key: 'kshard', note: 'status + a suffix 1-9' },
    { attr: 'total', val: '38.50' }
  ];
  const KEY = { korder: 'orderId', kstatus: 'status', kshard: 'statusShard' };
  const TABLE = { korder: 'orders-v2', kstatus: 'orders', kshard: 'orders-v2' };
  const WRITES = 6;   // one tick of the shop's orders, for the picture
  const SUFFIX = [4, 7, 2, 9, 5, 1];
  const val = (id, i) => (id === 'korder' ? 'ord-' + (1041 + i) : id === 'kshard' ? 'PENDING#' + SUFFIX[i % SUFFIX.length] : 'PENDING');
  // One tick's writes, each into the partition the sim would put it in; past a partition's cap it's throttled.
  function buckets(id) {
    const parts = Array.from({ length: D.PARTS }, () => ({ ok: [], hot: [] }));
    for (let i = 0; i < WRITES; i++) {
      const p = parts[AS.partitionOf(id === 'kstatus' ? 'status' : 'spread', i, D.PARTS)];
      (p.ok.length < D.PER_PART ? p.ok : p.hot).push({ i, v: val(id, i) });
    }
    return parts;
  }
  let seen = {};   // drill -> key last drawn, so items fall only when the key changes
  function html(f) {
    const onId = Object.keys(KEY).find(id => C[id].on(f.cfg)) || 'korder';
    const fall = seen[f.drill] !== onId;
    seen = { [f.drill]: onId };
    const attrs = ITEM.map(a => {
      if (!a.key) return `<span class="hk-at plain"><code>${esc(a.attr)}</code><span>${esc(a.val)}</span></span>`;
      const on = C[a.key].on(f.cfg), why = on ? '' : D.why(f, a.key), placed = f.changes.includes(a.key);
      return `<button class="hk-at${on ? ' on' : ''}${why && !on ? ' no' : ''}${placed ? ' new' : ''}" data-card="${a.key}" aria-pressed="${on}"
        title="${esc(C[a.key].name + ': ' + C[a.key].text)}" data-tip="${esc(C[a.key].text)}"><code>${esc(a.attr)}</code><span>${esc(a.val)}</span>
        <i>${on ? 'partition key' : esc(a.note)}</i></button>`;
    }).join('');
    const parts = buckets(onId), thr = parts.reduce((n, p) => n + p.hot.length, 0);
    const bins = parts.map((p, k) => `<div class="hk-bin${p.hot.length ? ' hot' : ''}" role="listitem" aria-label="Partition ${k + 1}: ${p.ok.length + p.hot.length} writes${p.hot.length ? `, ${p.hot.length} throttled` : ''}">
        <div class="hk-spill">${p.hot.map(x => `<span class="hk-slip bad" style="--d:${x.i}">${esc(x.v)}</span>`).join('')}${p.hot.length ? '<b>Throttling<wbr>Exception</b>' : ''}</div>
        <div class="hk-box">${p.ok.map(x => `<span class="hk-slip" style="--d:${x.i}">${esc(x.v)}</span>`).join('')}</div>
        <span class="hk-pn">Partition ${k + 1} · ${p.ok.length}/${D.PER_PART}</span></div>`).join('');
    return `<div class="hk" role="group" aria-label="${esc('Table and its partition key (set at creation)')}">
      <span class="dr-dl">${(SD.icons && SD.icons.key) ? `<svg class="dr-gi" viewBox="0 0 512 512" aria-hidden="true">${SD.icons.key}</svg>` : ''}Create orders-v2: tap its partition key</span>
      <div class="hk-item" role="group" aria-label="A sample item from orders"><p class="hk-ih">A sample item from <code>orders</code></p>${attrs}</div>
      <code class="dr-cfg hk-cfg" aria-live="polite" title="The table as AWS spells it">TableName: ${esc(TABLE[onId])}<br>KeySchema: [{ AttributeName: ${esc(KEY[onId])}, KeyType: HASH }]</code>
      <div class="hk-chalk${fall ? ' fall' : ''}"><p class="hk-ch">One tick of writes, by hash(${esc(KEY[onId])})${thr ? `: <b>${thr} throttled</b>` : ': spread out'}</p>
        <div class="hk-bins" role="list">${bins}</div></div></div>`;
  }
  SD.drillHotKey = { html, buckets, ITEM };

  const css = document.createElement('style');
  css.textContent = `
    .hk { display: flex; flex-direction: column; gap: 6px; }
    .hk-item { position: relative; display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 8px 9px; border-radius: 2px; transform: rotate(-.5deg);
      background: repeating-linear-gradient(180deg, #fbf6e6 0 17px, #d9e3ee 17px 18px); color: #2a2018; box-shadow: 1px 3px 5px rgba(0, 0, 0, .5); }
    .hk-ih { width: 100%; margin: 0; font-size: 12px; font-weight: 700; color: #5a4a3a; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at { flex: 1 1 calc(50% - 5px); min-width: 0; min-height: 44px; display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
      padding: 4px 7px; margin: 0; text-align: left; font: inherit; font-size: 12.5px; line-height: 1.2; color: #2a1a08; cursor: pointer;
      background: rgba(255, 252, 240, .8); border: 2px dashed #7a6a52; border-radius: 6px; box-shadow: none; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at code { font: 700 12.5px/1.2 ui-monospace, Menlo, Consolas, monospace; color: #3f5f80; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at span { font-family: ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at i { font-size: 11px; color: #6a5a48; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at.on { border: 2px solid #2a1a08; background: #3b2413; color: #ffe7a0; box-shadow: inset 0 2px 4px rgba(0, 0, 0, .6); }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at.on code { color: #ffe7a0; } :is(body.in-mode #panel .win, #panel) .hk .hk-at.on i { color: #f0dcb0; font-weight: 800; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at.new { outline: 3px solid #d6a63a; outline-offset: 1px; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at.no:not(.on) { opacity: .8; }
    :is(body.in-mode #panel .win, #panel) .hk .hk-at:focus-visible { outline: 3px solid #f3d36b; outline-offset: 2px; }
    .hk-at.plain { flex: 1 1 calc(50% - 5px); display: flex; flex-direction: column; gap: 1px; padding: 4px 7px; font: 12.5px/1.2 ui-monospace, Menlo, Consolas, monospace; color: #6a5a48; }
    .hk-at.plain code { font-weight: 700; }
    .hk-cfg { white-space: normal; }
    .hk-chalk { padding: 6px 6px 8px; border: 6px solid #6b4a2a; border-radius: 4px; background: #24382c; box-shadow: inset 0 0 18px rgba(0, 0, 0, .5);
      color: #f2f2e6; font-family: 'Patrick Hand', 'Comic Sans MS', 'Segoe Print', cursive, var(--f-body); }
    .hk-ch { margin: 0 0 4px; font-size: 15px; line-height: 1.2; } .hk-ch b { color: #ff9d93; }
    .hk-bins { display: grid; grid-template-columns: repeat(${D.PARTS}, minmax(0, 1fr)); gap: 6px; align-items: end; }
    .hk-bin { display: flex; flex-direction: column; align-items: stretch; gap: 2px; min-width: 0; }
    .hk-spill { display: flex; flex-direction: column; align-items: center; gap: 2px; min-height: 4px; }
    .hk-spill b { font: 700 10px/1.1 ui-monospace, Menlo, Consolas, monospace; color: #ff9d93; overflow-wrap: anywhere; text-align: center; }
    .hk-box { display: flex; flex-direction: column-reverse; gap: 2px; height: ${D.PER_PART * 21 + 8}px; padding: 3px; border: 2px solid rgba(242, 242, 230, .8); border-top: 0;
      border-radius: 0 0 8px 8px; }
    .hk-bin.hot .hk-box { border-color: #ff9d93; }
    .hk-slip { display: block; min-width: 0; padding: 1px 3px; border-radius: 3px; background: #f6efdc; color: #2a2018; text-align: center;
      font: 700 10.5px/17px ui-monospace, Menlo, Consolas, monospace; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .hk-slip.bad { background: #b0302a; color: #fff; transform: rotate(-4deg); width: 100%; }
    .hk-slip.bad:nth-child(2n) { transform: rotate(3deg); }
    .hk-pn { font-size: 13px; text-align: center; opacity: .9; }
    .hk-chalk.fall .hk-slip { animation: hkfall .45s cubic-bezier(.3, .1, .4, 1.3) both; animation-delay: calc(var(--d) * 110ms); }
    .hk-chalk.fall .hk-slip.bad { animation-name: hkspill; animation-delay: calc(var(--d) * 110ms + 120ms); }
    @keyframes hkfall { from { transform: translateY(-60px); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes hkspill { 0% { transform: translateY(-60px); opacity: 0; } 60% { transform: translateY(4px) rotate(-4deg); opacity: 1; } 80% { transform: translateY(-6px) rotate(6deg); } 100% { transform: rotate(-4deg); } }
    @media (prefers-reduced-motion: reduce) { .hk-chalk.fall .hk-slip, .hk-chalk.fall .hk-slip.bad { animation: none; } }`;
  document.head.appendChild(css);
})();
