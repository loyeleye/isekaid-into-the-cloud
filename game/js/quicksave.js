// Quick save: pause anywhere and come back to that moment, even if the phone closes the page while you're away.
//
// The game already saves as you go (js/state.js): where you stand in a chapter's world, the dungeon map, your deck and
// SLA. What a reload loses is the fight in progress, so a quick save keeps that too (js/run.js keeps the fight as it
// last stood waiting for you). One quick save at a time, and it's deleted once you're back:
//   - The pause button in a fight or on the dungeon map, or Menu > Quick save and pause: saves and shows a pause screen. Resume
//     carries on (and deletes it). If the page was closed instead, the title's Continue becomes Resume quick save.
//   - Auto quick save (Menu, on by default): the same save, silently, whenever the game goes out of sight (a phone
//     call, switching apps, locking the screen). Coming straight back deletes it; it only matters if the phone closed
//     the page in the meantime.
// Coming back from a quick save outside a fight is the same as Continue: the save already has where you were. A
// conversation or cutscene you were partway through starts again from its first line.
(function () {
  const U = SD.ui, S = SD.state, $ = U.$;
  const key = () => SD.debug ? 'isekai-cloud-quick-debug' : window.SD_VECTOR ? 'isekai-cloud-quick-vector-v1' : 'isekai-cloud-quick-v1';
  const AUTO = 'isekai-cloud-quick-auto';
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };
  const Q = SD.quick = {};
  // A pause sign drawn in code (the title font has no ⏸).
  Q.icon = '<svg class="qs-ico" viewBox="0 0 10 12" aria-hidden="true"><rect x="1" y="1" width="3" height="10" rx="1"/><rect x="6" y="1" width="3" height="10" rx="1"/></svg>';
  // And a play sign for Resume, which does the opposite of pausing.
  Q.play = '<svg class="qs-ico" viewBox="0 0 10 12" aria-hidden="true"><path d="M2 1.2v9.6c0 .6.6.9 1.1.6l6.4-4.8c.4-.3.4-.9 0-1.2L3.1.6C2.6.3 2 .6 2 1.2z"/></svg>';
  let paused = false;

  Q.saved = function () {
    try { const q = JSON.parse(store.get(key())); return q && q.v === 1 ? q : null; } catch (e) { return null; }
  };
  Q.clear = () => store.del(key());
  Q.auto = () => store.get(AUTO) !== '0';
  Q.setAuto = on => store.set(AUTO, on ? '1' : '0');
  // Nothing to keep on the title screen, or in a multiplayer raid, which a quick save can't hold still.
  const playing = () => $('#screen-title').hidden && !(SD.mp && SD.mp.inRaid && SD.mp.inRaid());

  function capture(how) {
    if (!playing()) return null;
    S.persist();
    const run = S.save.run;
    // runAt ties a dungeon fight to its run, so a run started since (or none at all) drops it at the title.
    const q = { v: 1, at: Date.now(), how, runAt: run ? run.startedAt : null, fight: SD.run && SD.run.quickFight ? SD.run.quickFight() : null };
    return store.set(key(), JSON.stringify(q)) ? q : null;
  }

  // ---------- The pause screen ----------
  Q.pause = function () {
    if (paused) return;
    const q = capture('pause');
    // Storage full or blocked: say so, rather than a button that seems to do nothing.
    if (!q) { if (playing()) U.system('COULDN\'T QUICK SAVE', 'This browser won\'t store it right now. Everything up to this fight is still saved as usual.', 'red'); return; }
    paused = true;
    const el = document.createElement('div');
    el.id = 'qs-pause';
    el.innerHTML = `<div class="win" role="dialog" aria-modal="true" aria-labelledby="qs-h" aria-describedby="qs-d">
      <div class="win-h"><span id="qs-h">QUICK SAVED</span></div>
      <div class="win-b" id="qs-d"><p><b>Paused right here${q.fight ? ', mid-fight' : ''}.</b></p>
        <p>Safe to close the app. <b>Resume quick save</b> on the title screen brings you back to this moment, once.</p>
        ${q.fight ? '' : '<p class="muted small">Mid-conversation? That scene restarts from its first line.</p>'}
        <button class="primary" id="qs-go">${Q.play} Resume</button></div></div>`;
    document.body.appendChild(el);
    document.body.classList.add('qs-paused');
    // Everything behind the pause screen is out of reach, for taps, Tab and screen readers alike.
    document.querySelectorAll('body > *').forEach(n => { if (n !== el && n.tagName !== 'SCRIPT') n.inert = true; });
    el.querySelector('#qs-go').onclick = Q.resumeHere;
    setTimeout(() => { const b = el.querySelector('#qs-go'); if (b) b.focus(); }, 50);
  };
  // Still on the same page: nothing to load, so just drop the save and carry on.
  Q.resumeHere = function () {
    paused = false;
    Q.clear();
    const el = $('#qs-pause'); if (el) el.remove();
    document.body.classList.remove('qs-paused');
    document.querySelectorAll('body > *').forEach(n => { n.inert = false; });
  };
  // While paused, keys don't reach the game underneath (the pause screen's own button still works).
  // Escape resumes.
  window.addEventListener('keydown', e => {
    if (!paused) return;
    if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); return Q.resumeHere(); }
    if (e.target && e.target.closest && e.target.closest('#qs-pause')) return;
    e.stopPropagation(); e.preventDefault();
  }, true);

  // ---------- Auto quick save ----------
  let autoSaved = false;
  function hidden() { if (!paused && Q.auto() && capture('auto')) autoSaved = true; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return hidden();
    // Back on the same page: it never closed, so the save isn't needed.
    if (autoSaved && !paused) { autoSaved = false; Q.clear(); }
  });
  window.addEventListener('pagehide', hidden);

  // ---------- The title: Continue becomes Resume quick save ----------
  const CONTINUE = '#ds-go, #t-go, #dbg-go, [id^="t-c"][id$="go"]';
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' hr ago' : Math.round(m / 1440) + (m < 2880 ? ' day ago' : ' days ago');
  }
  function patchTitle() {
    const box = $('#title-actions'), q = Q.saved();
    if (!box || !q || box.querySelector('#t-start')) return;
    const go = box.querySelector(CONTINUE), run = S.save.run;
    // No save to continue (it was erased since), or the dungeon run it was in has ended or been replaced (New game):
    // the quick save has nothing to return to.
    if (!go || (q.fight && !q.fight.story && (!run || run.startedAt !== q.runAt))) { Q.clear(); return; }
    const was = go.onclick;
    go.classList.add('qs-resume');
    const when = 'saved ' + ago(q.at);
    go.innerHTML = `${Q.play} Resume quick save<small>${q.fight ? 'Mid-fight · ' + when : when[0].toUpperCase() + when.slice(1)}</small>`;
    go.onclick = ev => {
      Q.clear();
      if (q.fight && SD.run.armQuick) SD.run.armQuick(q.fight);
      if (was) was.call(go, ev);
    };
    // Other title buttons leave it alone (How to play, a New game you cancel): a new game's run no longer matches
    // runAt, so the next title drops it then.
  }
  const boot = () => {
    const M = SD.main, title = M.title;
    M.title = function () { title.apply(this, arguments); patchTitle(); };
    patchTitle();
  };
  // After every other title patch (js/demo-select.js boots the same way, and its script loads before this one).
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(boot, 0), { once: true });
  else setTimeout(boot, 0);
})();
