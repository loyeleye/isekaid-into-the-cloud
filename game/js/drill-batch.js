// The Fire Drill's batch desk for The Poison Batch (Ladi's audit, Nov 17: gestures that mirror how the AWS concept
// works, the real term beside the action and its result). At the Function, Kai holds one batch the SQS trigger handed
// the function: event.Records, each with its messageId and body, and what the handler logged for it. One body is
// broken and always fails. You tap that message to return it in batchItemFailures. With ReportBatchItemFailures in
// the trigger's FunctionResponseTypes, Lambda deletes the rest of the batch and only the listed message turns visible
// in the queue again after its visibility timeout. Without it, the handler's error sends the whole batch back,
// the orders it already wrote included. The real response shape and the trigger's setting rewrite beside it.
//   - The poison message is the same change as the ReportBatchItemFailures card (partial in js/drill-core.js),
//     placed by mode-drill.js's [data-card] handler, so costs, refusals and the sim don't change. A good message
//     isn't a change: tapping it says why it doesn't belong in the list.
//   - The batch is as big as the Batch size dial (BatchSize 3 here; 1 shows the bad message alone).
//   - The slips move to their side of the slate only when the response changes; prefers-reduced-motion shows them in
//     place. Buttons, so Tab and Enter work.
// SD.drillBatch.html(f) → the desk's markup; .wire(root, f) handles taps on the good messages.
(function () {
  const D = SD.drill, U = SD.ui;
  if (!D || !U) return;
  const C = D.CARDS, esc = s => U.esc(String(s == null ? '' : s));
  // SQS messageIds look like UUIDs. These are made up from the drill's seed, the same every time for one drill.
  function msgId(k, i) {
    let x = (k * 7919 + i * 104729 + 12345) >>> 0;
    const hex = n => { let s = ''; for (let j = 0; j < n; j++) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; s += ((x >>> 16) & 15).toString(16); } return s; };
    return `${hex(8)}-${hex(4)}-4${hex(3)}-${'89ab'[x % 4]}${hex(3)}-${hex(12)}`;
  }
  const short = id => id.slice(0, 8) + '…' + id.slice(-4);
  // The batch that held the bad message: the bad one in the middle of 3, or alone in a batch of 1.
  function batch(f) {
    const n = Math.max(1, Math.min(3, f.cfg.fn.batch || 1)), bad = n === 1 ? 0 : 1, k = (f.v && f.v.k) | 0;
    return Array.from({ length: n }, (_, i) => {
      const ord = 'ord-' + (2207 + i + 3 * (k % 3));
      return { i, id: msgId(k, i), ord, bad: i === bad,
        body: i === bad ? `{"orderId":"${ord}","qty":` : `{"orderId":"${ord}","qty":${1 + ((i + k) % 3)}}` };
    });
  }
  // What happened to each message in the last call, with and without the partial batch response.
  function fate(r, on, bad) {
    if (r.bad) return { log: '[ERROR] JSONDecodeError: Expecting value: line 1 column 29', back: true };
    if (on) return { log: 'written to orders', back: false };
    return r.i < bad ? { log: 'written to orders, but the batch failed', back: true } : { log: 'not reached: the handler raised first', back: true };
  }
  let seen = {};   // drill -> whether the response was on when last drawn, so the slips move only when it changes
  function html(f) {
    const on = C.partial.on(f.cfg), placed = f.changes.includes('partial'), why = on ? '' : D.why(f, 'partial');
    const recs = batch(f), bad = recs.find(r => r.bad), vis = f.cfg.queue.vis, dlq = !!f.cfg.queue.dlq;
    const move = seen[f.drill] !== undefined && seen[f.drill] !== on;
    seen = { [f.drill]: on };
    const fates = recs.map(r => fate(r, on, bad.i));
    const cards = recs.map((r, j) => {
      const ft = fates[j], cls = `pb-rec${r.bad ? ' bad' : ''}${r.bad && on ? ' on' : ''}${r.bad && placed ? ' new' : ''}${r.bad && why && !on ? ' no' : ''}`;
      const tag = r.bad && on ? '<em class="pb-tag">in batchItemFailures</em>' : '';
      const attrs = r.bad ? `data-card="partial" aria-pressed="${on}" data-tip="${esc(C.partial.text)} · FunctionResponseTypes: [ReportBatchItemFailures]"`
        : `data-pb-ok="${esc(r.ord)}" data-pb-reached="${ft.log.startsWith('not') ? 0 : 1}" data-tip="${esc(r.ord + ' went through. Only the messages that failed belong in the list.')}"`;
      return `<button class="${cls}" ${attrs} aria-label="${esc(`Records[${r.i}], messageId ${r.id}, ${ft.log}${r.bad && on ? ', returned in batchItemFailures' : ''}`)}">
        <span class="pb-rh"><code>Records[${r.i}]</code>${tag}</span>
        <span class="pb-kv"><code>messageId</code><span title="${esc(r.id)}">${esc(short(r.id))}</span></span>
        <span class="pb-kv"><code>body</code><span>${esc(r.body)}</span></span>
        <i class="pb-log${r.bad ? ' err' : ''}">${esc(ft.log)}</i></button>`;
    }).join('');
    const resp = on
      ? `<span class="pb-c">return</span> {\n  "batchItemFailures": [\n    { "itemIdentifier": "${esc(bad.id)}" }\n  ]\n}`
      : '<span class="pb-c">raise</span> JSONDecodeError\n<span class="pb-c"># function error: no batchItemFailures</span>';
    const esm = on ? 'FunctionResponseTypes: [ReportBatchItemFailures]' : '# FunctionResponseTypes: not set';
    const slip = (r, j) => {
      const back = fates[j].back, note = !back ? 'DeleteMessage' : r.bad && dlq ? 'receive 3 → orders-dlq' : `visible again in ${vis}\u00a0s`;
      return `<span class="pb-slip${r.bad ? ' bad' : ''}${back ? ' back' : ' gone'}" style="--d:${j}"><b>${esc(r.ord)}</b><small>${esc(note)}</small></span>`;
    };
    const backN = fates.filter(x => x.back).length, goneN = recs.length - backN;
    const head = on ? (goneN ? `Only ${bad.ord} goes back. Lambda deletes the other ${goneN === 1 ? 'one' : goneN}.` : `Only ${bad.ord} goes back.`)
      : `A function error: the whole batch goes back${recs.length > 1 ? ', the good orders too' : ''}.`;
    return `<div class="pb${move ? ' move' : ''}" role="group" aria-label="One batch from orders-queue: tap the message that failed">
      <span class="dr-dl">${(SD.icons && SD.icons.mailbox) ? `<svg class="dr-gi" viewBox="0 0 512 512" aria-hidden="true">${SD.icons.mailbox}</svg>` : ''}One batch from orders-queue<span class="pb-hint">tap the one that failed</span></span>
      <div class="pb-ev" role="group" aria-label="event.Records, as the function received them"><p class="pb-eh"><code>event.Records</code> · BatchSize ${esc(f.cfg.fn.batch)}</p>${cards}</div>
      <div class="pb-out">
        <div class="pb-box"><p class="pb-lb">The handler returns</p><pre class="pb-resp" aria-live="polite" title="The response as Lambda reads it">${resp}</pre></div>
        <div class="pb-box"><p class="pb-lb">The SQS trigger (event source mapping)</p><code class="pb-esm${on ? ' on' : ''}" aria-live="polite" title="The setting as AWS spells it">${esc(esm)}</code></div>
      </div>
      <div class="pb-chalk" aria-live="polite"><p class="pb-ch${on ? ' ok' : ''}">${esc(head)}</p>
        <div class="pb-cols"><div class="pb-col" role="list" aria-label="${esc(`Back in orders-queue: ${backN}`)}"><p class="pb-ct">↩ Back in orders-queue</p>${recs.map((r, j) => (fates[j].back ? `<span role="listitem">${slip(r, j)}</span>` : '')).join('')}</div>
          <div class="pb-col" role="list" aria-label="${esc(`Deleted: ${goneN}`)}"><p class="pb-ct">✓ Deleted</p>${recs.map((r, j) => (fates[j].back ? '' : `<span role="listitem">${slip(r, j)}</span>`)).join('') || '<span class="pb-none">none</span>'}</div></div>
        <p class="pb-rule">${on ? 'An empty list would mean the whole batch worked. An itemIdentifier that isn\'t in the batch fails all of it.' : 'Lambda only reads batchItemFailures when the trigger\'s FunctionResponseTypes includes ReportBatchItemFailures.'}</p></div></div>`;
  }
  // A good message: not a change, just why it stays out of the list.
  function wire(root) {
    root.querySelectorAll('[data-pb-ok]').forEach(el => el.onclick = () => {
      const ord = el.dataset.pbOk;
      if (U.float) U.float(el, el.dataset.pbReached === '1' ? `${ord} went through. List it and Lambda puts it back, to be written twice.` : `${ord} didn't fail: the handler stopped at the bad message before reaching it.`);
    });
  }
  SD.drillBatch = { html, wire, batch, msgId };

  const P = ':is(body.in-mode #panel .win, #panel) .pb';
  const css = document.createElement('style');
  css.textContent = `
    .pb { display: flex; flex-direction: column; gap: 6px; }
    .pb .dr-dl { flex-wrap: wrap; } .pb-hint { margin-left: 6px; font-size: 12px; font-weight: 400; font-style: italic; opacity: .85; }
    .pb-ev { display: flex; flex-direction: column; gap: 5px; padding: 8px 8px 9px; border-radius: 2px; transform: rotate(.4deg);
      background: repeating-linear-gradient(180deg, #fbf6e6 0 17px, #d9e3ee 17px 18px); color: #2a2018; box-shadow: 1px 3px 5px rgba(0, 0, 0, .5); }
    .pb-eh { margin: 0; font-size: 12px; font-weight: 700; color: #5a4a3a; } .pb-eh code { font: 700 12px ui-monospace, Menlo, Consolas, monospace; color: #3f5f80; }
    ${P} .pb-rec { display: flex; flex-direction: column; align-items: stretch; gap: 1px; min-width: 0; min-height: 44px; width: 100%; margin: 0; padding: 4px 7px 5px;
      text-align: left; font: inherit; font-size: 12px; line-height: 1.25; color: #2a1a08; cursor: pointer;
      background: rgba(255, 252, 240, .85); border: 2px dashed #7a6a52; border-radius: 6px; box-shadow: none; }
    ${P} .pb-rec code { font: 700 11.5px/1.25 ui-monospace, Menlo, Consolas, monospace; color: #3f5f80; flex: none; }
    ${P} .pb-rec .pb-kv { display: flex; gap: 6px; min-width: 0; } ${P} .pb-rec .pb-kv > span { font-family: ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; min-width: 0; }
    ${P} .pb-rec .pb-rh { display: flex; justify-content: space-between; align-items: center; gap: 6px; }
    ${P} .pb-rec .pb-log { font: italic 11px/1.25 ui-monospace, Menlo, Consolas, monospace; color: #4f6f4f; overflow-wrap: anywhere; }
    ${P} .pb-rec .pb-log.err { color: #a02a22; font-style: normal; font-weight: 700; }
    ${P} .pb-rec.bad { border-color: #a02a22; }
    ${P} .pb-rec.on { border: 2px solid #2a1a08; background: #3b2413; color: #ffe7a0; box-shadow: inset 0 2px 4px rgba(0, 0, 0, .6); }
    ${P} .pb-rec.on code { color: #ffe7a0; } ${P} .pb-rec.on .pb-log.err { color: #ffb0a6; }
    ${P} .pb-rec .pb-tag { font: 800 10.5px/1.2 ui-monospace, Menlo, Consolas, monospace; font-style: normal; padding: 1px 5px; border-radius: 3px; background: #d6a63a; color: #2a1a08; }
    ${P} .pb-rec.new { outline: 3px solid #d6a63a; outline-offset: 1px; }
    ${P} .pb-rec.no:not(.on) { opacity: .8; }
    ${P} .pb-rec:focus-visible { outline: 3px solid #f3d36b; outline-offset: 2px; }
    .pb-out { display: flex; flex-direction: column; gap: 5px; }
    .pb-box { min-width: 0; padding: 5px 7px 6px; border-radius: 5px; background: #1f2a24; border: 2px solid #3b2413; box-shadow: inset 0 1px 4px rgba(0, 0, 0, .6); }
    .pb-lb { margin: 0 0 2px; font-size: 11.5px; color: #c9b88e; }
    .pb-resp, .pb-esm { display: block; margin: 0; font: 600 11.5px/1.35 ui-monospace, Menlo, Consolas, monospace; color: #f3e6c4; white-space: pre-wrap; overflow-wrap: anywhere; }
    .pb-resp .pb-c { color: #9fc7a8; } .pb-esm.on { color: #ffe7a0; }
    .pb-chalk { padding: 6px 7px 8px; border: 6px solid #6b4a2a; border-radius: 4px; background: #24382c; box-shadow: inset 0 0 18px rgba(0, 0, 0, .5);
      color: #f2f2e6; font-family: 'Patrick Hand', 'Comic Sans MS', 'Segoe Print', cursive, var(--f-body); }
    .pb-ch { margin: 0 0 5px; font-size: 15px; line-height: 1.2; color: #ff9d93; } .pb-ch.ok { color: #b8f0c0; }
    .pb-cols { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 8px; }
    .pb-col { display: flex; flex-direction: column; gap: 3px; min-width: 0; padding: 3px 4px 5px; border: 2px dashed rgba(242, 242, 230, .55); border-radius: 6px; }
    .pb-col > span { display: block; min-width: 0; }
    .pb-ct { margin: 0; font-size: 13.5px; line-height: 1.15; }
    .pb-slip { display: flex; flex-direction: column; min-width: 0; padding: 1px 5px 2px; border-radius: 3px; background: #f6efdc; color: #2a2018; }
    .pb-slip b { font: 700 11px/16px ui-monospace, Menlo, Consolas, monospace; } .pb-slip small { font: 10.5px/1.2 ui-monospace, Menlo, Consolas, monospace; color: #5a4a3a; overflow-wrap: anywhere; }
    .pb-slip.bad { background: #b0302a; color: #fff; transform: rotate(-2deg); } .pb-slip.bad small { color: #ffe0da; }
    .pb-slip.gone b { text-decoration: line-through; text-decoration-thickness: 2px; }
    .pb-none { font-size: 13px; opacity: .7; }
    .pb-rule { margin: 6px 0 0; font-size: 13px; line-height: 1.25; opacity: .9; }
    .pb.move .pb-slip.back { animation: pbback .5s cubic-bezier(.3, .1, .4, 1.3) both; animation-delay: calc(var(--d) * 110ms); }
    .pb.move .pb-slip.gone { animation: pbgone .5s ease-out both; animation-delay: calc(var(--d) * 110ms); }
    @keyframes pbback { from { transform: translateY(-40px); opacity: 0; } to { opacity: 1; } }
    @keyframes pbgone { from { transform: translateX(-30px); opacity: 0; } to { transform: none; opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .pb.move .pb-slip.back, .pb.move .pb-slip.gone { animation: none; } }`;
  document.head.appendChild(css);
})();
