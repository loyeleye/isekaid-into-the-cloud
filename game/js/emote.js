// Emotes (Ladi, 2026-10-24): a bubble over your seat in the party room and over your fighter in a raid, seen by
// everyone in the party. Six are free; the rest come in packs from the Raid shop (js/marks.js sells them as the
// 'emote' slot). Drawn here as small SVGs, so they look the same in the painted game and the vector build.
//
//   SD.emote.EMOTES          { id: { name, pack, svg } }   pack null: free for everyone
//   SD.emote.PACKS           { packId: name }
//   SD.emote.mine()          the ids this player can use
//   SD.emote.attach(room, me) listen to a party's room (js/party.js calls it on join); returns a detach function
//   SD.emote.button()        the Emote button's html, for a bar or a HUD; SD.emote.wire(root) binds it
//   SD.emote.send(id)        show it over your own seat and send it to the party (at most one every 1.5 s)
//   SD.emote.show(peer, id)  a bubble over [data-peer="peer"] for 2.4 s, following it through redraws
//   SD.emote.mapButton()     the story map HUD's Emote button (every chapter's world); with no party, send() puts the
//                            bubble over your lead on the walkable map (js/scene.js SC.current), drawn by paint()
//
// What a room hears is another player's data: only an id from EMOTES is ever shown, and one a second per player.
(function () {
  const E = SD.emote = {};
  const INK = '#2b2340';
  const svg = body => `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">${body}</svg>`;
  const txt = (t, size, fill, y) => `<text x="16" y="${y || 20.5}" text-anchor="middle" font-family="Fredoka, system-ui, sans-serif" font-weight="700" font-size="${size}" fill="${fill || INK}">${t}</text>`;
  const face = '<circle cx="16" cy="16" r="11" fill="#ffd25a" stroke="' + INK + '" stroke-width="2"/>';
  E.PACKS = Object.freeze({ 'emo-tavern': 'Tavern pack', 'emo-cloud': 'Cloud jokes pack', 'emo-season': 'Seasonal pack' });
  E.EMOTES = Object.freeze({
    heart: { name: 'Heart', svg: svg(`<path d="M16 26 C5 18 5 9 11 8 C14 7.5 16 10 16 12 C16 10 18 7.5 21 8 C27 9 27 18 16 26Z" fill="#e04a6a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`) },
    laugh: { name: 'Ha!', svg: svg(face + `<path d="M10.5 14 Q12 12 13.5 14 M18.5 14 Q20 12 21.5 14" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/><path d="M10 18 H22 Q21 24 16 24 Q11 24 10 18Z" fill="${INK}"/>`) },
    alert: { name: 'Look!', svg: svg(`<rect x="13.5" y="5" width="5" height="15" rx="2.5" fill="#ff5a5a" stroke="${INK}" stroke-width="2"/><circle cx="16" cy="25.5" r="2.8" fill="#ff5a5a" stroke="${INK}" stroke-width="2"/>`) },
    what: { name: 'Huh?', svg: svg(txt('?', 26, '#2a62c9', 25)) },
    nice: { name: 'Nice', svg: svg(`<path d="M7 15 H11 V26 H7Z M12 15 L16 7 Q19 7 18.5 11 L18 14 H24 Q26.5 14 26 17 L24.5 24 Q24 26 21.5 26 H12Z" fill="#ffd25a" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`) },
    gg: { name: 'GG', svg: svg(txt('GG', 15, '#1f8a57')) },
    coffee: { name: 'Coffee break', pack: 'emo-tavern', svg: svg(`<path d="M8 13 H21 V22 Q21 26 17 26 H12 Q8 26 8 22Z" fill="#fff" stroke="${INK}" stroke-width="2"/><path d="M21 15 Q26 15 25 19 Q24 22 21 21" fill="none" stroke="${INK}" stroke-width="2"/><path d="M12 10 Q11 8 12.5 6 M16 10 Q15 8 16.5 6" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/><rect x="9.5" y="15" width="10" height="3" fill="#8a5a3a"/>`) },
    cheers: { name: 'Cheers', pack: 'emo-tavern', svg: svg(`<path d="M5 12 L13 10 L15 22 L9 24Z" fill="#ffc93c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M27 12 L19 10 L17 22 L23 24Z" fill="#ffc93c" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M6 11 Q9 8 13 9.5 M26 11 Q23 8 19 9.5" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="M16 4 V7 M12.5 5 L14 7.5 M19.5 5 L18 7.5" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`) },
    song: { name: 'Tavern song', pack: 'emo-tavern', svg: svg(`<path d="M12 22 V8 L24 5 V19" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><ellipse cx="9.5" cy="22.5" rx="3.6" ry="2.8" fill="${INK}"/><ellipse cx="21.5" cy="19.5" rx="3.6" ry="2.8" fill="${INK}"/>`) },
    idea: { name: 'Idea', pack: 'emo-tavern', svg: svg(`<path d="M16 4 Q24 4 24 12 Q24 16 20 19 V22 H12 V19 Q8 16 8 12 Q8 4 16 4Z" fill="#ffd25a" stroke="${INK}" stroke-width="2"/><rect x="12" y="23.5" width="8" height="3.5" rx="1" fill="${INK}"/>`) },
    ok200: { name: '200 OK', pack: 'emo-cloud', svg: svg(`<rect x="3" y="8" width="26" height="16" rx="5" fill="#dff4ea" stroke="#1f8a57" stroke-width="2"/>${txt('200', 11, '#1f6b46', 20)}`) },
    nf404: { name: '404?', pack: 'emo-cloud', svg: svg(`<rect x="3" y="8" width="26" height="16" rx="5" fill="#ffe9e9" stroke="#c43a3a" stroke-width="2"/>${txt('404', 11, '#a02a2a', 20)}`) },
    pager: { name: 'Paged', pack: 'emo-cloud', svg: svg(`<rect x="8" y="9" width="16" height="15" rx="3" fill="#cfe2ff" stroke="${INK}" stroke-width="2"/><rect x="11" y="12" width="10" height="5" rx="1" fill="${INK}"/><path d="M4 12 Q2.5 16.5 4 21 M28 12 Q29.5 16.5 28 21" fill="none" stroke="#ff5a5a" stroke-width="2" stroke-linecap="round"/>`) },
    lgtm: { name: 'LGTM', pack: 'emo-cloud', svg: svg(`<rect x="3" y="9" width="26" height="14" rx="2" fill="none" stroke="#2a62c9" stroke-width="2.2" transform="rotate(-8 16 16)"/><g transform="rotate(-8 16 16)">${txt('LGTM', 9.5, '#2a62c9', 19.5)}</g>`) },
    pumpkin: { name: 'Pumpkin', pack: 'emo-season', svg: svg(`<path d="M16 9 Q14 5 17 3.5" fill="none" stroke="#3f7a3a" stroke-width="2.2" stroke-linecap="round"/><ellipse cx="16" cy="18" rx="12" ry="9.5" fill="#ff8a2a" stroke="${INK}" stroke-width="2"/><path d="M16 9 V27 M10 10 Q7 18 10 27 M22 10 Q25 18 22 27" fill="none" stroke="${INK}" stroke-width="1.4" opacity=".55"/><path d="M10 16 L12.5 14 L13.5 17Z M22 16 L19.5 14 L18.5 17Z M11 21 Q16 24.5 21 21" fill="${INK}" stroke="${INK}" stroke-width="1.2"/>`) },
    snowflake: { name: 'Snowflake', pack: 'emo-season', svg: svg(`<g stroke="#2a62c9" stroke-width="2.2" stroke-linecap="round">${[0, 60, 120].map(a => `<g transform="rotate(${a} 16 16)"><path d="M16 4 V28 M12.5 7 L16 10 L19.5 7 M12.5 25 L16 22 L19.5 25"/></g>`).join('')}</g>`) },
    lantern: { name: 'Lantern', pack: 'emo-season', svg: svg(`<path d="M16 3 V7" stroke="${INK}" stroke-width="2"/><rect x="11" y="6.5" width="10" height="3" rx="1" fill="#ffd25a" stroke="${INK}" stroke-width="1.6"/><ellipse cx="16" cy="16.5" rx="10" ry="8" fill="#e0402a" stroke="${INK}" stroke-width="2"/><path d="M16 8.5 V24.5 M11 9.8 Q8.5 16.5 11 23.2 M21 9.8 Q23.5 16.5 21 23.2" fill="none" stroke="#ffd25a" stroke-width="1.3"/><rect x="11" y="23.5" width="10" height="3" rx="1" fill="#ffd25a" stroke="${INK}" stroke-width="1.6"/><path d="M16 26.5 V30" stroke="#ffd25a" stroke-width="2"/>`) },
    blossom: { name: 'Blossom', pack: 'emo-season', svg: svg(`${[0, 72, 144, 216, 288].map(a => `<ellipse cx="16" cy="9" rx="5" ry="6.5" fill="#ffb3cf" stroke="${INK}" stroke-width="1.6" transform="rotate(${a} 16 16)"/>`).join('')}<circle cx="16" cy="16" r="3.5" fill="#ffd25a" stroke="${INK}" stroke-width="1.6"/>`) }
  });
  const ids = Object.keys(E.EMOTES);
  const owns = pack => !pack || !!(SD.marks && SD.marks.owns(pack));
  E.mine = () => ids.filter(id => owns(E.EMOTES[id].pack));
  E.valid = id => typeof id === 'string' && Object.prototype.hasOwnProperty.call(E.EMOTES, id);

  function css() {
    if (document.getElementById('emo-css')) return;
    const st = document.createElement('style');
    st.id = 'emo-css';
    st.textContent = `
.emo-bub { position: fixed; z-index: 60; width: 46px; height: 42px; margin: -50px 0 0 -23px; pointer-events: none; background: #fff; border: 2.5px solid ${INK}; border-radius: 12px; display: grid; place-items: center; box-shadow: 0 3px 0 rgba(43,35,64,.25); animation: emo-pop 2.4s ease-out forwards; }
.emo-bub::after { content: ''; position: absolute; left: 50%; bottom: -8px; margin-left: -6px; border: 6px solid transparent; border-top: 7px solid ${INK}; border-bottom: 0; }
.emo-bub svg { width: 32px; height: 32px; display: block; }
@keyframes emo-pop { 0% { transform: translateY(8px) scale(.4); opacity: 0; } 10% { transform: translateY(-2px) scale(1.1); opacity: 1; } 18% { transform: none; } 82% { transform: translateY(-6px); opacity: 1; } 100% { transform: translateY(-12px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .emo-bub { animation: emo-fade 2.4s linear forwards; } @keyframes emo-fade { 0%, 85% { opacity: 1; } 100% { opacity: 0; } } }
.emo-btn svg { width: 18px; height: 18px; vertical-align: -4px; }
.emo-pick { position: fixed; z-index: 61; background: var(--mi-cream, #fff8ec); border: 2.5px solid ${INK}; border-radius: 14px; padding: 8px; box-shadow: 0 4px 0 rgba(43,35,64,.25); display: grid; gap: 6px; max-width: calc(100vw - 32px); }
.emo-pick .emo-grid { display: grid; grid-template-columns: repeat(5, 44px); gap: 6px; }
.emo-pick button { width: 44px; height: 44px; padding: 0; border: 2px solid ${INK}; border-radius: 10px; background: #fff; cursor: pointer; display: grid; place-items: center; }
.emo-pick button:hover, .emo-pick button:focus-visible { background: var(--mi-sun, #ffc93c); }
.emo-pick button svg { width: 30px; height: 30px; }
.emo-pick small { font: 600 12px var(--f-body, system-ui); color: var(--mi-muted, #6b6480); }
`;
    document.head.appendChild(st);
  }

  // ---------- Bubbles ----------
  const live = {};                      // peer -> { el, until, raf }
  const heard = {};                     // peer -> when their last emote was shown, for the once-a-second limit
  // Where a peer is drawn right now: their raid fighter, else their party seat's stage, else anything marked theirs.
  function spot(peer) {
    const q = CSS.escape(peer), vis = el => el && el.getClientRects().length;
    return [`.rd-fighter[data-peer="${q}"] .rd-spr`, `.pt-mem[data-peer="${q}"] .pt-stage`, `[data-peer="${q}"]`]
      .map(s => document.querySelector(s)).find(vis) || null;
  }
  E.show = function (peer, id) {
    if (!E.valid(id) || typeof peer !== 'string') return false;
    css();
    const old = live[peer];
    if (old) { cancelAnimationFrame(old.raf); old.el.remove(); }
    const el = document.createElement('div');
    el.className = 'emo-bub'; el.dataset.emo = id; el.dataset.for = peer;
    el.setAttribute('role', 'img'); el.setAttribute('aria-label', E.EMOTES[id].name);
    el.innerHTML = E.EMOTES[id].svg;
    const b = { el, until: performance.now() + 2400, raf: 0 };
    live[peer] = b;
    // The party room and the raid redraw often, so the bubble looks for its seat again every frame.
    const follow = () => {
      const t = spot(peer);
      if (performance.now() > b.until) { el.remove(); if (live[peer] === b) delete live[peer]; return; }
      if (t) { const r = t.getBoundingClientRect(); el.style.left = (r.left + r.width / 2) + 'px'; el.style.top = (r.top + 6) + 'px'; el.style.visibility = ''; }
      else el.style.visibility = 'hidden';
      b.raf = requestAnimationFrame(follow);
    };
    document.body.appendChild(el);
    follow();
    return true;
  };

  // ---------- The room ----------
  let room = null, me = null, last = 0;
  E.attach = function (r, who) {
    room = r; me = who;
    const off = r.on('emote', msg => {
      if (msg.isMe || !msg.peer || (me && msg.peer === me.peer)) return;
      const id = msg.data && msg.data.e, now = Date.now();
      if (!E.valid(id) || now - (heard[msg.peer] || 0) < 1000) return;
      heard[msg.peer] = now;
      E.show(msg.peer, id);
    });
    return () => { off(); if (room === r) { room = null; me = null; } close(); };
  };
  E.send = function (id) {
    if (!E.valid(id) || !E.mine().includes(id)) return false;
    const map = !room && SD.scene && SD.scene.current;
    if (!map && (!room || !me)) return false;
    const now = Date.now();
    if (now - last < 1500) return false;
    last = now;
    if (map) { map.emote('you', id, 2.4); return true; }
    E.show(me.peer, id);
    room.emit('emote', { e: id });
    return true;
  };

  // ---------- On the story map ----------
  // Drawn into the map's canvas like its own emotes (js/scene.js), at the same size: a white bubble, the mark inside.
  const pics = {};
  E.paint = function (ctx, id, px, py, S) {
    const im = pics[id] || (pics[id] = Object.assign(new Image(), { src: 'data:image/svg+xml,' + encodeURIComponent(E.EMOTES[id].svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" ')) }));
    ctx.save();
    ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px - S * 0.62, py - S * 1.1, S * 1.24, S * 1.12, 6) : ctx.rect(px - S * 0.62, py - S * 1.1, S * 1.24, S * 1.12); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(px - 4, py); ctx.lineTo(px, py + 6); ctx.lineTo(px + 4, py); ctx.closePath(); ctx.fill();
    if (im.complete && im.naturalWidth) ctx.drawImage(im, px - S / 2, py - S * 1.04, S, S);
    ctx.restore();
  };
  E.mapButton = () => `<button class="ghost emo-btn" type="button" id="w-emote" data-emo-open aria-haspopup="true" aria-expanded="false" aria-label="Emote" title="Emote">${E.EMOTES.laugh.svg}</button>`;

  // ---------- The button and its picker ----------
  E.button = () => `<button class="mi-btn sm emo-btn" type="button" data-emo-open aria-haspopup="true" aria-expanded="false" title="Emote">${E.EMOTES.laugh.svg} Emote</button>`;
  let pick = null;
  function close() { if (!pick) return; pick.box.remove(); pick.btn.setAttribute('aria-expanded', 'false'); document.removeEventListener('pointerdown', pick.out, true); pick = null; }
  function open(btn) {
    css(); close();
    const mine = E.mine(), more = Object.keys(E.PACKS).filter(p => !owns(p)).length;
    const box = document.createElement('div');
    box.className = 'emo-pick'; box.setAttribute('role', 'menu'); box.setAttribute('aria-label', 'Emotes');
    box.innerHTML = `<div class="emo-grid">${mine.map(id => `<button type="button" role="menuitem" data-emo="${id}" aria-label="${E.EMOTES[id].name}" title="${E.EMOTES[id].name}">${E.EMOTES[id].svg}</button>`).join('')}</div>`
      + (more ? `<small>${more} more emote pack${more > 1 ? 's' : ''} at the Raid shop.</small>` : '');
    document.body.appendChild(box);
    const r = btn.getBoundingClientRect(), w = box.offsetWidth, h = box.offsetHeight;
    box.style.left = Math.max(16, Math.min(innerWidth - w - 16, r.left)) + 'px';
    box.style.top = (r.top - h - 8 >= 8 ? r.top - h - 8 : r.bottom + 8) + 'px';
    const out = e => { if (!box.contains(e.target) && e.target !== btn && !btn.contains(e.target)) close(); };
    pick = { box, btn, out };
    btn.setAttribute('aria-expanded', 'true');
    document.addEventListener('pointerdown', out, true);
    box.querySelectorAll('[data-emo]').forEach(b => { b.onclick = () => { E.send(b.dataset.emo); close(); btn.focus(); }; });
    box.onkeydown = e => {
      const bs = [...box.querySelectorAll('[data-emo]')], i = bs.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.stopPropagation(); close(); btn.focus(); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = bs[(i + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length]; if (n) n.focus(); }
    };
    const first = box.querySelector('[data-emo]'); if (first) first.focus();
  }
  E.wire = function (root) {
    css();
    root.querySelectorAll('[data-emo-open]').forEach(b => { b.onclick = () => (pick && pick.btn === b ? close() : open(b)); });
  };
})();
