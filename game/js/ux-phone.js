// The phone pass over Chapters 1 to 6 (vector mode only, so the prequel's look is unchanged): small fixes a phone
// player would otherwise trip on, in the parts every chapter shares (the quiz, the dialogue, the world HUD, the toasts
// and the raid engine). Each chapter's own screens are fixed in its own files. Inert unless window.SD_VECTOR is set.
(function () {
  if (!window.SD_VECTOR) return;
  const css = document.createElement('style');
  css.textContent = `
/* 44px to tap: the quiz's Huh/ELI5 buttons, the world HUD's buttons, and the skip links (bigger hit area, same look). */
html.vector .help-b { min-height: 44px; display: inline-flex; align-items: center; vertical-align: top; }
html.vector .compass .q-ctx { color: #7a5000; }
html.vector #w-hud button, html.vector #rd-deck { min-height: 44px; min-width: 44px; }
html.vector .ps-tg button { min-height: 44px; }
html.vector .win-h .x { min-width: 44px; min-height: 44px; margin: -8px -8px -8px 6px; }
html.vector #dlg-skip { padding: 15px 12px; margin: -15px -12px; }
html.vector .dlg-foot, html.vector #dlg-skip { font-size: 12px; }
html.vector #vn .vn-skip { padding: 14px 12px; margin: -12px -10px; color: rgba(255, 255, 255, .72); }
/* The dungeons: the run screen's text is pale for its dark backdrop, and its light chips, notes and teammates' cards
   inherited it. Ink them so they can be read. */
html.vector #screen-run :is(.rd-note, .rd-chip, .rd-inc, .rd-mate, .loot span) { color: var(--ink); }
html.vector #screen-run :is(.me-zone, .foe-zone, .rd-mate) .muted, html.vector #screen-run .rd-mate .rd-played { color: var(--muted); }
html.vector #screen-run .slot { color: #5f5878; }
html.vector #screen-run .row button:not(.primary):not(.danger) { color: var(--ink); }
/* A phone keeps :hover on the last button tapped, and the hover colour turned a chosen (blue, white-text) chip pale. */
html.vector #panel :is(.g2, .g3, .g4, .g5, .g6) .ghost.on:hover:not(:disabled) { background: var(--blue); color: #fff; }
/* Pip's name tag: white on bright teal was 2.5:1. */
html.vector #dialog[data-who="pip"] .dlg-nm { background: #0f6f80; }
/* A story dungeon's end screen has one way on (#rd-back, which tells the chapter how it went); the engine's own
   "Leave the dungeon" under it skipped that, so it is hidden there. */
html.vector .rd:is([data-ph="done"], [data-ph="over"]):has(#rd-back) #rd-leave { display: none; }
/* Card battles (js/raid.js, js/run.js) were one long column, so a phone showed the enemy or the hand, never both.
   Portrait: a shorter stage, and the enemy panel sticks to the top while the hand scrolls up under it. */
@media (max-width: 600px) {
  html.vector #screen-run .combat .foe-zone { position: sticky; top: 0; z-index: 3; box-shadow: 0 4px 0 var(--ink), 0 10px 18px rgba(0, 0, 0, .45); }
  html.vector #screen-run .combat .stage { aspect-ratio: auto; height: 104px; max-height: none; }
  html.vector #screen-run .combat .stage:not(.group) .foe { width: 92px; height: 92px; right: 6%; }
  html.vector #screen-run .combat .foe-zone:has(.stage) { gap: 6px; padding-bottom: 8px; }
  html.vector #screen-run .combat .foe-info { gap: 4px; }
  html.vector #screen-run .combat .foe-name { font-size: 17px; }
}
/* Landscape: two columns. The enemy, the log and the defences stay put on the left; the hand scrolls on the right. */
@media (orientation: landscape) and (max-height: 520px) and (min-width: 600px) {
  html.vector #screen-run .combat { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); align-items: start; gap: 12px; }
  html.vector #screen-run .combat > :is(.cb-l, .cb-r) { display: grid; gap: 10px; }
  html.vector #screen-run .cb-l { gap: 8px; position: sticky; top: 0; max-height: 100dvh; overflow-y: auto; padding-bottom: 8px; scrollbar-width: thin; }
  html.vector #screen-run .cb-r .hand-zone { order: -1; }
  html.vector #screen-run .combat .stage { aspect-ratio: auto; height: 132px; max-height: none; }
  html.vector #screen-run .combat .stage:not(.group) .foe { width: 104px; height: 104px; }
  html.vector #screen-run .cb-r .hand { flex-wrap: wrap; justify-content: center; overflow: visible; gap: 14px 8px; padding-top: 12px; scroll-snap-type: none; }
  html.vector #screen-run .cb-r .hand .card { width: calc((100% - 16px) / 3); min-height: 0; }
}
`;
  document.head.appendChild(css);

  // A toast in the overworld drops just below the HUD, so it never covers the objective chip (js/ui.js places it
  // under the town and dungeon HUDs already). Chapter 2 sets its own place.
  const hudBottom = () => { const h = document.getElementById('w-hud'); return h && h.offsetParent ? h.getBoundingClientRect().bottom : 0; };
  const place = () => {
    const n = document.getElementById('notes'), p = document.getElementById('panel');
    if (!n || !n.children.length || (p && !p.hidden)) return;
    const b = hudBottom(); if (b) n.style.top = Math.round(b + 8) + 'px';
  };
  const start = () => { const n = document.getElementById('notes'); if (n && typeof MutationObserver === 'function') new MutationObserver(place).observe(n, { childList: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
