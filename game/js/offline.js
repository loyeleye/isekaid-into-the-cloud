// Ported from the first game, Isekai'd Into Prod (loyeleye/system-design-study, game/js/offline.js, PR #221), with its
// credit line in CREDITS.md. Changed here: its own storage keys, a Back button in place of the panel's back link,
// voice lines saved with the music, and no checker or Guild Hall lines (this game has neither).
// Offline play (Ladi, 2026-10-27): registers the service worker (sw.js), which saves the game on this device so single
// player opens and plays with no connection, and asks it to sync on each launch and whenever the connection returns.
// Music and voice lines are saved too, after the rest, unless the browser says to save data or is on cellular; then
// Menu > Offline play has a button for them. Multiplayer and cloud saves need the network and say so.
//
//   SD.offline.supported()   -> true when this copy can be saved for offline (served over http(s), not in a frame)
//   SD.offline.state()       -> { phase: 'off' | 'none' | 'idle' | 'core' | 'ready' | 'music', core: { got, total },
//                               music: { got, total }, error }   (bytes; 'none' = this copy has no offline-files.json)
//   SD.offline.onState(fn)   -> unsubscribe
//   SD.offline.ready()       -> true when single player is saved
//   SD.offline.label()       -> a few words for the menu
//   SD.offline.open()        -> the Menu > Offline play panel
(function () {
  const O = SD.offline = {};
  const MUSIC_KEY = 'isekai-cloud-offline-music', TOLD_KEY = 'isekai-cloud-offline-told';
  const store = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };
  let st = { phase: 'off', core: { got: 0, total: 0 }, music: { got: 0, total: 0 }, error: '' };
  const fns = new Set();
  const emit = () => fns.forEach(f => { try { f(st); } catch (e) { /* a closed panel */ } });

  const framed = () => { try { return window.top !== window; } catch (e) { return true; } };
  // Browser tests (navigator.webdriver) skip it, so they don't each download the game; a test opts in with
  // isekai-cloud-sw.
  const ok = 'serviceWorker' in navigator && /^https?:$/.test(location.protocol) && window.isSecureContext && !framed()
    && (!navigator.webdriver || store.get('isekai-cloud-sw') === '1');
  O.supported = () => ok;
  O.state = () => st;
  O.onState = f => { fns.add(f); return () => fns.delete(f); };
  O.ready = () => st.phase === 'ready' || st.phase === 'music';
  const pct = t => (t.total ? Math.floor(100 * t.got / t.total) : 0);
  const musicDone = () => st.music.total > 0 && st.music.got >= st.music.total;
  O.label = () => !ok ? 'Not here' : st.phase === 'core' ? `Saving ${pct(st.core)}%` : O.ready() ? (musicDone() ? 'Ready' : 'Ready, no music') : st.phase === 'none' ? 'Not on this copy' : 'Not saved yet';

  // Music and voices on their own: about 160 MB, so not on a metered connection unless the player asks.
  const metered = () => { const c = navigator.connection; return !!(c && (c.saveData || c.type === 'cellular')); };
  const wantMusic = () => store.get(MUSIC_KEY) === '1' || (store.get(MUSIC_KEY) !== '0' && !metered());
  const ask = extra => {
    const sw = navigator.serviceWorker.controller || (reg && reg.active);
    if (sw) sw.postMessage(Object.assign({ k: 'sd-sync', music: wantMusic() }, extra));
  };
  O.saveMusic = () => { store.set(MUSIC_KEY, '1'); ask({ music: true }); };

  let reg = null;
  if (ok) {
    navigator.serviceWorker.addEventListener('message', e => {
      const m = e.data || {};
      if (m.k !== 'sd-offline' || !m.state) return;
      const was = O.ready();
      st = m.state; emit();
      // The first time the game is saved: say so once, and ask the browser to keep it under storage pressure.
      if (!was && O.ready() && store.get(TOLD_KEY) !== '1') {
        store.set(TOLD_KEY, '1');
        try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (err) { /* not offered */ }
        if (SD.ui && SD.ui.system) SD.ui.system('Ready to play offline', 'The game is saved on this device. Single player works with no connection.');
      }
    });
    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(r => { reg = r; return navigator.serviceWorker.ready; }).then(r => { reg = r; ask(); })
        .catch(() => { st = Object.assign({}, st, { phase: 'off' }); emit(); });
    });
    addEventListener('online', () => ask());
    // A long music download can outlive the worker's time limit: nudge it on until it's done.
    setInterval(() => { if (navigator.onLine !== false && O.ready() && wantMusic() && !musicDone()) ask(); }, 120000);
  }

  // ---------- Menu > Offline play ----------
  const MB = n => Math.round(n / 1e6);
  O.open = function () {
    const U = SD.ui;
    const b = U.panel(`<p class="small">Single player is saved on this device, so the game opens and plays with no connection: the story, battles, the dungeons, typed answers and your save.</p>
      <p class="small muted">Needs a connection: multiplayer raids with other players. Solo raids and story fights with bots play offline.</p>
      <p id="of-st" aria-live="polite"></p>
      <div class="row"><button class="ghost" id="of-music" hidden>Save music too</button><button class="ghost" id="of-back">Back</button></div>`, { title: 'OFFLINE PLAY' });
    const out = b.querySelector('#of-st'), btn = b.querySelector('#of-music');
    b.querySelector('#of-back').onclick = () => SD.main.menu();
    const paint = () => {
      const s = st;
      let t;
      if (!ok) t = 'This copy of the game can\'t be saved for offline play (it runs inside another page, or the browser doesn\'t allow it).';
      else if (s.phase === 'none') t = 'This copy of the game has no offline list, so it plays online only.';
      else if (s.phase === 'core') t = `Saving the game: ${MB(s.core.got)} of ${MB(s.core.total)} MB (${pct(s.core)}%). Keep playing; it finishes in the background.`;
      else if (O.ready()) t = '✓ Single player is saved on this device. ' + (musicDone() ? 'Music and voices too.'
        : s.phase === 'music' ? `Saving music and voices: ${MB(s.music.got)} of ${MB(s.music.total)} MB.`
        : `Music and voices aren't saved yet (${MB(s.music.total - s.music.got)} MB), so offline you'll hear the game's simpler synth tunes and read the scenes without voices.`);
      else t = navigator.onLine === false ? 'Not saved yet. Open the game once with a connection to save it.' : 'Getting ready to save the game…';
      if (s.error && s.phase !== 'core') t += ' ' + s.error;
      out.textContent = t;
      btn.hidden = !(ok && O.ready() && !musicDone() && s.phase !== 'music' && s.music.total > 0 && navigator.onLine !== false);
      btn.textContent = `Save music and voices too (${MB(s.music.total - s.music.got)} MB)`;
    };
    paint();
    btn.onclick = () => { O.saveMusic(); btn.hidden = true; };
    const off = O.onState(() => { if (!b.isConnected) return off(); paint(); });
    if (ok) { const sw = navigator.serviceWorker.controller; if (sw) sw.postMessage({ k: 'sd-state' }); }
  };
})();
