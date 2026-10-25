// The code that unlocks the debug tools, as in the prequel: the 🐞 Debug menu (js/demo-select.js), the menu's Debug start
// switch (js/main.js) and the debug start itself (js/debug.js) stay hidden until it is entered, so players only see the game.
//
// On a public host (the published artifact, Cloudflare) the tools need the code, entered either way:
//   - in the link: ?debug=<code> (or #debug=<code>), where the link can change;
//   - in the game: tap the line at the foot of the title screen seven times, and type the code in the box that opens
//     (for the claude.ai artifact, whose link can't take a query).
// A right code is remembered in this browser, so later visits show the tools straight away; ?debug=off or "Hide the debug
// tools" in the 🐞 Debug menu forgets it. On localhost and file:// the tools are always open (the test scripts in tools/
// rely on that), and so is window.SD_DEBUG = true before the scripts. The code only keeps the tools out of casual reach:
// anyone reading this file can get past it.
(function () {
  const KEY = 'isekai-cloud-debug-code';
  const seal = c => { let x = 0x811c9dc5; for (const ch of 'isekai-cloud/' + c) { x ^= ch.charCodeAt(0); x = Math.imul(x, 0x01000193) >>> 0; } return x.toString(36); };
  const fits = c => /^\d{5}$/.test(c || '') && seal(c) === '2xizdu';
  const local = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  // What the link asks for: null (no debug), '' (a bare ?debug), 'off' or a code.
  const m = /[?&#]debug(?:=([^&#]*))?(?=[&#]|$)/.exec(location.search + location.hash);
  let ask = null; try { ask = m ? decodeURIComponent(m[1] || '') : null; } catch (e) { ask = ''; }
  let kept = null; try { kept = localStorage.getItem(KEY); } catch (e) { /* ignore */ }
  const forget = () => { try { localStorage.removeItem(KEY); localStorage.removeItem('isekai-cloud-debug'); } catch (e) { /* ignore */ } kept = null; };
  if (ask === 'off') forget();
  if (fits(ask) && ask !== kept) { try { localStorage.setItem(KEY, ask); } catch (e) { /* ignore */ } kept = ask; }

  const G = SD.debugGate = {
    local, ask,
    // Whether the debug tools show at all.
    open: () => !!window.SD_DEBUG || local || fits(kept),
    // The code to carry in a debug link on a public host ('' where none is needed).
    code: () => (fits(kept) && !local ? kept : ''),
    // Try a typed code; a right one is kept and the page reloads with the tools showing.
    unlock(c) {
      c = String(c || '').trim();
      if (!fits(c)) return false;
      try { localStorage.setItem(KEY, c); } catch (e) { /* ignore */ }
      kept = c;
      setTimeout(() => location.reload(), 300);
      return true;
    },
    // Hide the tools again in this browser and go back to the real save: the same link, less its debug options.
    lock() {
      forget();
      try {
        const u = new URL(location.href), q = u.searchParams;
        if (q.has('debug')) ['debug', 'ch', 'rank', 'shards', 'at', 'floor', 'quests', 'group', 'time', 'weather'].forEach(k => q.delete(k));
        u.search = q.toString().replace(/=(?=&|$)/g, '');
        if (/debug/.test(u.hash)) u.hash = '';
        location.replace(u.href);
      } catch (e) { location.reload(); }
    }
  };

  // Seven taps on the title screen's foot line within three seconds open the code box.
  let taps = [];
  document.addEventListener('click', e => {
    if (G.open() || !e.target.closest || !e.target.closest('.t-foot')) return;
    const now = Date.now();
    taps = taps.filter(t => now - t < 3000).concat(now);
    if (taps.length < 7) return;
    taps = [];
    const U = SD.ui;
    const b = U.panel(`<form id="dg-form" autocomplete="off"><label for="dg-code">Code</label>
      <input id="dg-code" type="password" inputmode="numeric" maxlength="5" style="display:block;width:100%;box-sizing:border-box;min-height:44px;margin:6px 0 10px;padding:8px 12px;font:16px Nunito,sans-serif;border:2px solid #2b2340;border-radius:10px">
      <div class="row"><button class="primary" type="submit">OK</button><button class="ghost" type="button" id="dg-n">Cancel</button></div>
      <p class="muted small" id="dg-msg" aria-live="polite"></p></form>`, { title: 'CODE' });
    const input = b.querySelector('#dg-code');
    b.querySelector('#dg-n').onclick = U.closePanel;
    b.querySelector('#dg-form').onsubmit = ev => {
      ev.preventDefault();
      if (G.unlock(input.value)) b.querySelector('#dg-msg').textContent = 'Debug tools unlocked.';
      else { b.querySelector('#dg-msg').textContent = 'That isn\'t it.'; input.value = ''; input.focus(); }
    };
    setTimeout(() => input.focus(), 50);
  });
})();
