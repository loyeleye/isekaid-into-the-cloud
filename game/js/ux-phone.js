// The phone pass over Chapters 1 to 6 (vector mode only, so the prequel's look is unchanged): small fixes a phone
// player would otherwise trip on, in the parts every chapter shares (the quiz, the dialogue, the world HUD, the toasts
// and the raid engine). Each chapter's own screens are fixed in its own files. Inert unless window.SD_VECTOR is set.
(function () {
  if (!window.SD_VECTOR) return;
  const css = document.createElement('style');
  css.textContent = `
/* 44px to tap: the quiz's Huh/ELI5 buttons, the world HUD's buttons, and the skip links (bigger hit area, same look). */
html.vector .help-b { min-height: 44px; }
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
/* Pip's name tag: white on bright teal was 2.5:1. */
html.vector #dialog[data-who="pip"] .dlg-nm { background: #0f6f80; }
/* A story dungeon's end screen has one way on (#rd-back, which tells the chapter how it went); the engine's own
   "Leave the dungeon" under it skipped that, so it is hidden there. */
html.vector .rd:is([data-ph="done"], [data-ph="over"]):has(#rd-back) #rd-leave { display: none; }
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
  const start = () => { const n = document.getElementById('notes'); if (n) new MutationObserver(place).observe(n, { childList: true }); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
