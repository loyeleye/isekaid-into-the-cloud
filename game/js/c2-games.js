// The minigames of chapter 2's explorable act 1 (js/c2-world.js). Each one opens with a prediction or a choice you
// make before you see the answer, then lets you play it out, the learning design's "predict, then play":
//   notes     the edge: four notes in Freya's basket, and the one thing they share
//   restore   the scrap field: read an S3 version list and bring something back (delete markers, overwrites,
//             versions deleted for good, a lifecycle rule counting down)
//   hatch     Seymour's bunker: which protections can a root user still get past?
//   postbox   Thornwick's post box: run the village's queue, and watch letters hide, come back and arrive twice
//   bells     Thornwick's bell tower: Marrow's events, and the EventBridge pattern that rings the right bells
//   letter    a lost letter: one quick recall question on what you've just learned
// AWS facts follow the current AWS documentation (S3 versioning, delete markers, restoring versions, Object Lock,
// MFA delete, lifecycle rules; SQS visibility timeout; EventBridge event patterns). Every question is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const U = SD.ui, S = SD.state, AU = SD.audio, Q = SD.quiz;
  const G = SD.c2games = {};
  const esc = s => U.esc(s);
  const wait = ms => new Promise(r => setTimeout(r, ms));

  // ---------- Concepts ----------
  Object.assign(SD.concepts, {
    s3ver: { name: 'S3 Versioning and Delete Markers', zone: 2,
      gist: 'With versioning on, every write keeps the old version. A DELETE without a version ID only adds a delete marker on top, so a plain GET returns 404 while every version stays underneath. Delete the marker, or copy an old version back into place, and it returns. A DELETE that names a version ID removes that version for good. Versioning can be suspended but never turned off again.',
      page: 'Deleted, in a versioned bucket, means "hidden under a marker". Unless she named the version. — Seymour' },
    s3lock: { name: 'Object Lock, MFA Delete and Offline Copies', zone: 2,
      gist: 'Object Lock keeps a version from being deleted or overwritten until its retain-until date. In governance mode, users with s3:BypassGovernanceRetention can still remove it; in compliance mode nobody can, the root user included. MFA delete makes permanent deletes need the root user\'s MFA code, so it doesn\'t stop the root user. A bucket policy can always be changed by the root user. A copy nobody can reach is the only other kind nobody can delete.',
      page: 'A copy anyone can delete is not a copy. — Seymour' },
    s3life: { name: 'Lifecycle Rules on Versioned Buckets', zone: 2,
      gist: 'A lifecycle rule can expire noncurrent versions a set number of days after they stop being current (NoncurrentVersionExpiration), and that delete is permanent. To save an old version from such a rule, copy it back into place: the copy is a new current version, which a noncurrent rule doesn\'t touch.',
      page: 'The fine print counts down. — Coo' }
  });
  SD.links.push(
    { id: 's3ver-s3lock', a: 's3ver', b: 's3lock', text: 'Versioning keeps what a plain delete hides; Object Lock (which needs versioning) stops the deletes that name a version.' },
    { id: 's3ver-s3life', a: 's3ver', b: 's3life', text: 'Every overwrite in a versioned bucket makes a noncurrent version, and lifecycle rules decide how long noncurrent versions live.' }
  );

  const css = document.createElement('style');
  css.textContent = `
.g2 { text-align: left; }
.g2-h { font: 600 12px/1.5 ui-monospace, monospace; color: #b7b0cc; margin-bottom: 8px; word-break: break-all; }
.g2-h b { color: #7fd0ff; } .g2-h span { float: right; color: #7fe0a0; }
.g2-rule { font: 12px/1.4 ui-monospace, monospace; color: #ffd28a; background: #2a2236; border-radius: 6px; padding: 6px 8px; margin: 0 0 8px; }
.g2-t { width: 100%; border-collapse: collapse; font: 12px ui-monospace, monospace; color: #e9e6f2; margin-bottom: 10px; }
.g2-t td { padding: 5px 4px; border-top: 1px solid rgba(255,255,255,.12); vertical-align: top; }
.g2-t tr.dm td { color: #ff8a9a; } .g2-t tr.gone td { text-decoration: line-through; opacity: .45; }
.g2-t tr.fade td { color: #ffcf7a; } .g2-t tr.new td { color: #7fe0a0; }
.g2-t tr.cur td:first-child::after { content: " ← current"; color: #7fe0a0; }
.g2-t td.empty { color: #8a84a0; font-style: italic; text-align: center; }
.g2 .opts.col { display: flex; flex-direction: column; gap: 8px; } .g2 .opts.col .opt { text-align: left; }
.g2 .opt[disabled] { opacity: .45; }
.g2-note { min-height: 1.4em; margin: 8px 0 0; } .g2-note.ok { color: #7fe0a0; } .g2-note.bad { color: #ff9aa8; }
.g2-predict { border-left: 3px solid #ffd24a; padding-left: 10px; margin-bottom: 10px; }
.g2-predict b { color: #ffd24a; font-size: 12px; letter-spacing: .06em; }
.g2-notes { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; }
.g2-paper { background: #f6efd8; color: #2b2340; border-radius: 6px; padding: 8px 9px 6px; font: 13px/1.35 Georgia, serif; position: relative; transform: rotate(var(--r)); box-shadow: 0 2px 6px rgba(0,0,0,.35); }
.g2-paper .to { font-weight: 700; display: block; margin-bottom: 3px; }
.g2-paper .bit { cursor: pointer; border-radius: 4px; padding: 0 2px; outline: 1px dashed rgba(43,35,64,.0); }
.g2-paper .bit:hover, .g2-paper .bit:focus { outline-color: rgba(43,35,64,.4); }
.g2-paper .bit.hit { background: #ffe28a; } .g2-paper .bit.miss { background: #ffc6cf; }
.g2-paper .doodle { position: absolute; right: 6px; bottom: 4px; width: 22px; height: 22px; padding: 0; }
.g2-paper .sign { display: block; text-align: right; margin-right: 26px; font-style: italic; }
.g2-sort .row2 { display: flex; align-items: center; gap: 8px; margin: 6px 0; flex-wrap: wrap; }
.g2-sort .row2 > span { flex: 1 1 180px; }
.g2-sort .row2 button { padding: 6px 10px; font-size: 13px; }
.g2-sort .row2 button.on { background: var(--blue); color: #fff; }
.g2-sort .why2 { flex-basis: 100%; font-size: 12px; margin: 0 0 4px; }
.g2-sort .why2.ok { color: #7fe0a0; } .g2-sort .why2.bad { color: #ff9aa8; }
.g2-set { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; margin: 6px 0; font-size: 13px; }
.g2-set button { padding: 5px 9px; font-size: 13px; } .g2-set button.on { background: var(--blue); color: #fff; }
.g2-clock { font: 700 13px ui-monospace, monospace; color: #ffd28a; }
.g2-tray { display: flex; gap: 6px; flex-wrap: wrap; margin: 8px 0; min-height: 54px; }
.g2-ltr { width: 74px; padding: 5px 4px; border-radius: 6px; background: #f6efd8; color: #2b2340; font: 11px/1.25 ui-monospace, monospace; text-align: center; transition: opacity .2s; }
.g2-ltr.hid { opacity: .35; outline: 2px dashed #7fd0ff; } .g2-ltr.gone { background: #3a3448; color: #8a84a0; }
.g2-ltr .n { font-weight: 700; display: block; } .g2-ltr .d.twice { color: #d63a3a; font-weight: 700; }
.g2-lane { display: flex; align-items: center; gap: 8px; font-size: 12px; margin: 4px 0; }
.g2-lane > b { width: 90px; } .g2-lane .bar { flex: 1; height: 10px; background: #2a2a40; border-radius: 5px; overflow: hidden; }
.g2-lane .bar i { display: block; height: 100%; background: #7fe0a0; width: 0; }
.g2-log { font: 11px/1.4 ui-monospace, monospace; background: #1d1b2a; color: #d9e6ff; padding: 6px 8px; border-radius: 8px; height: 92px; overflow-y: auto; white-space: pre-wrap; }
.g2-ev { font: 11px/1.35 ui-monospace, monospace; background: #1d1b2a; color: #d9e6ff; padding: 5px 8px; border-radius: 6px; margin: 4px 0; display: flex; gap: 8px; align-items: center; }
.g2-ev .bell { font-size: 16px; opacity: .25; } .g2-ev.ring .bell { opacity: 1; animation: g2ring .4s ease-in-out 3; }
.g2-ev.ring { box-shadow: inset 0 0 0 2px #ffd24a; } .g2-ev.missed { box-shadow: inset 0 0 0 2px #ff6a7a; }
@keyframes g2ring { 0%,100% { transform: rotate(0); } 25% { transform: rotate(-20deg); } 75% { transform: rotate(20deg); } }
.g2-pat { font: 12px/1.4 ui-monospace, monospace; color: #ffd28a; background: #2a2236; border-radius: 6px; padding: 6px 8px; white-space: pre-wrap; margin: 6px 0; }
.g2-chips { display: flex; gap: 6px; flex-wrap: wrap; margin: 4px 0 8px; } .g2-chips button { padding: 4px 8px; font: 12px ui-monospace, monospace; }
.g2-chips button.on { background: var(--blue); color: #fff; }
`;
  document.head.appendChild(css);

  // A note under the question, and a Continue button that resolves.
  function note(b, text, ok) { const n = b.querySelector('.g2-note'); n.textContent = text; n.className = 'g2-note ' + (ok ? 'ok' : 'bad'); }
  const cont = (b, label) => new Promise(res => {
    const go = document.createElement('button'); go.className = 'primary'; go.textContent = label || 'Continue';
    b.appendChild(go); go.focus(); go.onclick = () => { U.closePanel(); res(); };
  });
  // A prediction: pick one, see whether it was right and why. Resolves true if it was.
  function predict(b, p, concept) {
    return new Promise(res => {
      const box = document.createElement('div'); box.className = 'g2-predict';
      box.innerHTML = `<b>PREDICT FIRST</b><p>${esc(p.q)}</p><div class="opts col">${p.opts.map((o, i) => `<button class="opt" data-p="${i}">${esc(o.t)}</button>`).join('')}</div><p class="g2-note"></p>`;
      b.appendChild(box);
      box.querySelectorAll('[data-p]').forEach(el => el.onclick = () => {
        const o = p.opts[+el.dataset.p];
        box.querySelectorAll('[data-p]').forEach(x => { x.disabled = true; if (p.opts[+x.dataset.p].ok) x.classList.add('on'); });
        S.recordAnswer(concept, !!o.ok, 1, 15000);
        AU.sfx(o.ok ? 'right' : 'wrong');
        const n = box.querySelector('.g2-note');
        n.textContent = (o.ok ? 'Right. ' : (o.no || 'Not quite.') + ' ') + p.why; n.className = 'g2-note ' + (o.ok ? 'ok' : 'bad');
        res(!!o.ok);
      });
    });
  }

  // ---------- The edge: four notes, one hand ----------
  // leads: [{ id, name, prayer, sign, ink }] for all four. The shared thing is the little ring each is signed with.
  G.notes = function (leads) {
    return new Promise(res => {
      const ring = '<svg viewBox="0 0 22 22" aria-hidden="true"><circle cx="11" cy="11" r="7" fill="none" stroke="#2c8a4b" stroke-width="2"/><circle cx="15.5" cy="6.8" r="1.6" fill="#2c8a4b"/></svg>';
      const tilt = ['-1.5deg', '1.2deg', '0.8deg', '-1deg'];
      const b = U.panel(`<div class="g2"><p>Freya's gift basket, tipped out on the ground. A note with every gift, and each one quotes a prayer back to the person who prayed it. <b>Tap the one thing all four notes share.</b></p>
        <div class="g2-notes">${leads.map((l, i) => `<div class="g2-paper" style="--r:${tilt[i]};color:${l.ink}">
          <span class="to bit" data-k="to" data-i="${i}" tabindex="0">${esc(l.name)},</span>
          <span class="bit" data-k="quote" data-i="${i}" tabindex="0">You prayed, "${esc(l.prayer)}" Here's your answer.</span>
          <span class="sign bit" data-k="sign" data-i="${i}" tabindex="0">${esc(l.sign)}</span>
          <span class="doodle bit" data-k="ring" data-i="${i}" tabindex="0" aria-label="A little drawing in the corner">${ring}</span></div>`).join('')}</div>
        <p class="g2-note"></p></div>`, { title: 'FOUR NOTES', noClose: true, cls: 'wide' });
      const no = {
        to: 'A name each, and each in a different ink. That only says she had four pens.',
        quote: 'Each quotes a different prayer. That\'s what she wants them to notice, not what gives her away.',
        sign: 'Each is signed differently: ' + leads.map(l => '"' + l.sign + '"').join(', ') + '. She was careful about that.'
      };
      let tries = 0;
      b.querySelectorAll('.bit').forEach(el => {
        const go = () => {
          tries++;
          if (el.dataset.k !== 'ring') { el.classList.add('miss'); note(b, no[el.dataset.k], false); AU.sfx('wrong'); return; }
          b.querySelectorAll('[data-k="ring"]').forEach(x => x.classList.add('hit'));
          b.querySelectorAll('.bit').forEach(x => { x.onclick = null; x.onkeydown = null; });
          note(b, 'The same little ring in every corner, drawn the same way, its tail in its mouth. Four inks, four sign-offs, one hand.', true);
          AU.sfx('right');
          cont(b.querySelector('.g2')).then(() => res(tries === 1));
        };
        el.onclick = go; el.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
      });
    });
  };

  // ---------- The scrap field: restoring from a version list ----------
  // o: { title, bucket, key, rule, rows: [[label, when, size, cls]], predict, q, opts: [{ t, ok, no, out, rows }] }
  //   ok: true (right), 'works' (works, with a cost the out line explains) or false (wrong; the no line says why).
  // Resolves { first, pick }: first is whether the first answer was right.
  G.restore = function (o) {
    const c = o.concept || 's3ver';
    S.seeConcept(c);
    return new Promise(async res => {
      const table = rows => `<table class="g2-t">${rows.length ? rows.map(r => `<tr class="${r[3] || ''}"><td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('') : '<tr><td class="empty" colspan="3">(no versions of this key)</td></tr>'}</table>`;
      const b = U.panel(`<div class="g2"><div class="g2-h"><b>s3://${esc(o.bucket)}/</b>${esc(o.key)} <span>Versioning: Enabled</span></div>
        ${o.rule ? `<div class="g2-rule">${esc(o.rule)}</div>` : ''}${o.log ? `<pre class="g2-log" style="height:auto">${esc(o.log)}</pre>` : ''}<div class="g2-tbl">${table(o.rows)}</div></div>`, { title: o.title, noClose: true, cls: 'wide' });
      const g = b.querySelector('.g2');
      if (o.predict) await predict(g, o.predict, c);
      const box = document.createElement('div');
      box.innerHTML = `<p class="vn-q"><b>${esc(o.q)}</b></p><div class="opts col">${o.opts.map((x, i) => `<button class="opt" data-o="${i}">${esc(x.t)}</button>`).join('')}</div><p class="g2-note"></p>`;
      g.appendChild(box);
      let first = null;
      box.querySelectorAll('[data-o]').forEach(el => el.onclick = async () => {
        const x = o.opts[+el.dataset.o];
        if (first === null) { first = x.ok === true; S.recordAnswer(c, first, 1, 15000); }
        if (!x.ok) { el.disabled = true; note(box, x.no, false); AU.sfx('wrong'); return; }
        box.querySelectorAll('[data-o]').forEach(y => { y.disabled = true; });
        if (x.rows) g.querySelector('.g2-tbl').innerHTML = table(x.rows);
        note(box, x.out, true);
        AU.sfx(o.sfx || 'heal');
        await wait(500);
        await cont(g, o.done || 'Continue');
        res({ first, pick: +el.dataset.o });
      });
    });
  };

  // ---------- Seymour's bunker: a copy anyone can delete ----------
  G.hatch = function () {
    S.seeConcept('s3lock');
    const items = [
      { t: 'A bucket policy that denies s3:DeleteObject to everyone', can: true, why: 'The root user can always delete or rewrite a bucket policy, even one that locks everyone out. She\'d take it off first.' },
      { t: 'MFA delete on the bucket', can: true, why: 'MFA delete asks for the root user\'s MFA code before a permanent delete. She is the root user.' },
      { t: 'Object Lock in governance mode', can: true, why: 'Anyone with s3:BypassGovernanceRetention can lift a governance lock, and the root user has every permission.' },
      { t: 'Object Lock in compliance mode, set before she took root', can: false, why: 'In compliance mode nobody, root included, can delete or overwrite a locked version until its retain-until date.' },
      { t: 'A tape in a bunker with no network', can: false, why: 'She can\'t delete what she can\'t reach. That\'s an offline copy.' }
    ];
    const order = Q.shuffle(items.map((x, i) => i));
    return new Promise(res => {
      const pick = {};
      const b = U.panel(`<div class="g2 g2-sort"><p>Seymour, through the slot: "Freya holds root. Kyu is on one tape. Tell me which of these would keep a copy safe from <i>her</i>."</p>
        ${order.map(i => `<div class="row2" data-r="${i}"><span>${esc(items[i].t)}</span><button class="ghost" data-i="${i}" data-v="1">She can delete it</button><button class="ghost" data-i="${i}" data-v="0">She can't</button><p class="why2"></p></div>`).join('')}
        <button class="primary" id="hx-go" disabled>Tell Seymour</button><p class="g2-note"></p></div>`, { title: 'A COPY ANYONE CAN DELETE', noClose: true, cls: 'wide' });
      const go = b.querySelector('#hx-go');
      b.querySelectorAll('[data-i]').forEach(el => el.onclick = () => {
        const i = el.dataset.i; pick[i] = el.dataset.v === '1';
        b.querySelectorAll(`[data-i="${i}"]`).forEach(x => x.classList.toggle('on', x === el));
        go.disabled = Object.keys(pick).length < items.length;
      });
      go.onclick = async () => {
        let right = 0;
        items.forEach((x, i) => {
          const ok = pick[i] === x.can; if (ok) right++;
          const w = b.querySelector(`[data-r="${i}"] .why2`); w.textContent = (ok ? '✓ ' : '✗ ') + x.why; w.className = 'why2 ' + (ok ? 'ok' : 'bad');
        });
        b.querySelectorAll('[data-i]').forEach(x => { x.disabled = true; });
        go.remove();
        const ok = right === items.length;
        S.recordAnswer('s3lock', ok, 1, 20000);
        AU.sfx(ok ? 'right' : 'wrong');
        note(b.querySelector('.g2'), ok ? 'All five. Seymour grunts, which from Seymour is applause.' : `${right} of 5. Seymour reads you the ones you missed, slowly.`, ok);
        await cont(b.querySelector('.g2'));
        res(ok);
      };
    });
  };

  // ---------- Thornwick's post box: be the queue ----------
  // A standard queue, two postmen, letters that take 45 seconds to deliver. Each round runs at ten seconds a tick
  // of the clock per real second. Resolves when the third round is played right.
  const WORK = 45;
  function runQueue(b, setup) {
    return new Promise(res => {
      const st = { t: 0, letters: setup.letters.map((n, i) => ({ n, i, vis: true, until: 0, gone: false, got: 0, handle: 0 })), men: [{ n: 'Postman Arn' }, { n: 'Postwoman Bea' }], log: [] };
      const vt = setup.vt, del = setup.del, stop = setup.stop || 240;
      const el = b.querySelector('.g2-run');
      const log = s => { st.log.push(`t=${String(Math.round(st.t)).padStart(3)}s  ${s}`); };
      function draw() {
        el.innerHTML = `<div class="g2-clock">t = ${Math.round(st.t)} s</div>
          <div class="g2-tray">${st.letters.map(l => `<div class="g2-ltr${l.gone ? ' gone' : l.vis ? '' : ' hid'}"><span class="n">✉ ${esc(l.n)}</span>${l.gone ? 'deleted' : l.vis ? 'visible' : 'hidden ' + Math.max(0, Math.ceil(l.until - st.t)) + 's'}<br><span class="d${l.got > 1 ? ' twice' : ''}">delivered ×${l.got}</span></div>`).join('')}</div>
          ${st.men.map(m => `<div class="g2-lane"><b>${esc(m.n)}</b><span style="width:70px">${m.l ? '✉ ' + esc(m.l.n) : 'waiting'}</span><span class="bar"><i style="width:${m.l ? Math.min(100, (st.t - m.from) / WORK * 100) : 0}%"></i></span></div>`).join('')}
          <div class="g2-log">${esc(st.log.slice(-40).join('\n'))}</div>`;
        const lg = el.querySelector('.g2-log'); lg.scrollTop = lg.scrollHeight;
      }
      const step = () => {
        // Hidden letters whose timeout has run out come back.
        st.letters.forEach(l => { if (!l.gone && !l.vis && st.t >= l.until) { l.vis = true; log(`${l.n}'s letter is visible again: nobody deleted it in time.`); } });
        st.men.forEach(m => {
          if (m.l && st.t - m.from >= WORK) {
            const l = m.l; l.got++;
            log(`${m.n} delivers ${l.n}'s letter${l.got > 1 ? ` (that's ×${l.got})` : ''}.`);
            if (del) {
              if (l.handle === m.handle && !l.gone) { l.gone = true; log(`${m.n} deletes it. Gone from the queue.`); }
              else if (!l.gone) log(`${m.n} deletes with an old receipt handle; the letter was received again since, so it may not be removed.`);
            } else log(`${m.n} doesn't delete it.`);
            m.l = null;
          }
          if (!m.l) {
            const l = st.letters.find(x => !x.gone && x.vis);
            if (l) { l.vis = false; l.until = st.t + vt; l.handle++; m.l = l; m.from = st.t; m.handle = l.handle; log(`${m.n} receives ${l.n}'s letter. Hidden for ${vt}s.`); }
          }
        });
      };
      log(`Visibility timeout ${vt}s. Delivering takes ${WORK}s. ${del ? 'Postmen delete after delivering.' : 'Nobody deletes.'}`);
      step(); draw();
      const iv = setInterval(() => {
        st.t += 1; step();
        const done = st.letters.every(l => l.gone) && st.men.every(m => !m.l);
        if (done || st.t >= stop) {
          clearInterval(iv);
          if (!done) log(del ? '...and so on.' : '...and so on, every minute or so, until the queue\'s retention period ends (4 days by default).');
          draw(); res(st);
        } else draw();
      }, 100);
    });
  }
  G.postbox = function () {
    S.seeConcept('sqs');
    const head = (r, text) => `<div class="g2"><div class="g2-h"><b>thornwick-letters</b> (standard queue) <span>Round ${r} of 3</span></div><p>${text}</p>`;
    const settings = (vt, del, lock) => `<div class="g2-set">Visibility timeout: ${[20, 30, 60, 90].map(v => `<button class="ghost${v === vt ? ' on' : ''}" data-vt="${v}"${lock ? ' disabled' : ''}>${v}s</button>`).join('')}</div>
      <div class="g2-set">Delete after delivering: <button class="ghost${del ? ' on' : ''}" data-del="1"${lock ? ' disabled' : ''}>On</button><button class="ghost${!del ? ' on' : ''}" data-del="0"${lock ? ' disabled' : ''}>Off</button></div>`;
    return (async () => {
      // Round 1: the timeout is shorter than the work.
      let b = U.panel(head(1, 'You run Thornwick\'s post for a minute. One letter for Goodwife Marrow. Two postmen. Delivering takes 45 seconds.') + settings(30, true, true) + '<div class="g2-run"></div></div>', { title: 'THE POST THAT NEVER COMES', noClose: true, cls: 'wide' });
      await predict(b.querySelector('.g2'), { q: 'The visibility timeout is 30 seconds. How many times does Marrow get her letter?',
        opts: [{ t: 'Once: the first postman has it, so nobody else can take it', no: 'Hidden isn\'t taken. After 30 seconds it\'s visible again, and the other postman is waiting.' }, { t: 'More than once: it comes back before the first postman is done', ok: true }, { t: 'Never: it comes back before anyone can deliver it', no: 'The first postman still finishes and delivers it. It just isn\'t deleted in time to stop the second.' }],
        why: 'A received message isn\'t removed, only hidden for the visibility timeout. Work that takes longer than the timeout lets a second consumer receive it too.' }, 'sqs');
      await runQueue(b, { letters: ['Marrow'], vt: 30, del: true, stop: 160 });
      await cont(b.querySelector('.g2'), 'Next round');
      // Round 2: long enough, but nobody deletes.
      b = U.panel(head(2, 'Arn says the fix is a longer timeout. He sets it to 60 seconds, and forgets the rest.') + settings(60, false, true) + '<div class="g2-run"></div></div>', { title: 'THE POST THAT NEVER COMES', noClose: true, cls: 'wide' });
      await predict(b.querySelector('.g2'), { q: 'Delivering takes 45 seconds and the timeout is 60. Nobody calls DeleteMessage. What happens?',
        opts: [{ t: 'Delivered once; a delivered letter leaves the queue by itself', no: 'Nothing leaves an SQS queue because it was received or handled. It leaves when someone deletes it, or when its retention period runs out.' }, { t: 'Delivered, then back a minute later, again and again', ok: true }, { t: 'Never delivered: the timeout hides it for good', no: 'The timeout only hides it for 60 seconds at a time.' }],
        why: 'The consumer has to delete a message once it\'s handled. If it doesn\'t, the message becomes visible again after every timeout and is received over and over.' }, 'sqs');
      await runQueue(b, { letters: ['Wren'], vt: 60, del: false, stop: 200 });
      await cont(b.querySelector('.g2'), 'Your turn');
      // Round 3: you set it.
      let vt = 30, del = false, firstTry = null;
      for (;;) {
        b = U.panel(head(3, 'Four letters, two postmen. Set the queue so every letter arrives exactly once, then run it.') + settings(vt, del, false) + '<button class="primary" id="pb-run">Run the post</button><div class="g2-run"></div><p class="g2-note"></p></div>', { title: 'THE POST THAT NEVER COMES', noClose: true, cls: 'wide' });
        b.querySelectorAll('[data-vt]').forEach(el => el.onclick = () => { vt = +el.dataset.vt; b.querySelectorAll('[data-vt]').forEach(x => x.classList.toggle('on', x === el)); });
        b.querySelectorAll('[data-del]').forEach(el => el.onclick = () => { del = el.dataset.del === '1'; b.querySelectorAll('[data-del]').forEach(x => x.classList.toggle('on', x === el)); });
        await new Promise(r => { b.querySelector('#pb-run').onclick = r; });
        b.querySelector('#pb-run').remove(); b.querySelectorAll('[data-vt], [data-del]').forEach(x => { x.disabled = true; });
        const st = await runQueue(b, { letters: ['Marrow', 'Tilly', 'Wren', 'Hale'], vt, del });
        const ok = st.letters.every(l => l.got === 1 && l.gone);
        if (firstTry === null) { firstTry = ok; S.recordAnswer('sqs', ok, 1, 20000); }
        AU.sfx(ok ? 'right' : 'wrong');
        const g = b.querySelector('.g2');
        if (ok) {
          note(g, 'Every letter once, and the queue empty. The timeout outlasts the work, and each postman deletes what he\'s delivered. Even set right, a standard queue promises at least once, not exactly once, so now and then a letter comes twice anyway: a good postman checks his book before he knocks.', true);
          await cont(g);
          return firstTry;
        }
        note(g, !del ? 'Nobody deletes, so every letter keeps coming back.' : 'The timeout runs out before the 45 seconds of work are done, so letters come back mid-delivery and go out twice.', false);
        await cont(g, 'Try again');
      }
    })();
  };

  // ---------- Thornwick's bell tower: Bell Rules ----------
  const EVENTS = [
    { source: 'thornwick.post', type: 'LetterArrived', detail: '{"house": "Marrow"}' },
    { source: 'thornwick.post', type: 'LetterSent', detail: '{"house": "Tilly"}' },
    { source: 'thornwick.watch', type: 'BeastSighted', detail: '{"where": "marsh"}' },
    { source: 'thornwick.post', type: 'LetterArrived', detail: '{"house": "Wren"}' },
    { source: 'thornwick.chapel', type: 'ServiceBegins', detail: '{"hour": "dawn"}' },
    { source: 'thornwick.post', type: 'LetterReturned', detail: '{"house": "Hale"}' }
  ];
  const evHtml = (e, i) => `<div class="g2-ev" data-e="${i}"><span class="bell">🔔</span><span>{"source": "${e.source}", "detail-type": "${e.type}", "detail": ${esc(e.detail)}}</span></div>`;
  // A pattern here is { source: [...], type: [...] }; an empty list means the field is left out of the pattern.
  const matches = (pat, e) => (!pat.source.length || pat.source.includes(e.source)) && (!pat.type.length || pat.type.includes(e.type));
  const patText = pat => {
    const f = [];
    if (pat.source.length) f.push(`  "source": [${pat.source.map(s => `"${s}"`).join(', ')}]`);
    if (pat.type.length) f.push(`  "detail-type": [${pat.type.map(s => `"${s}"`).join(', ')}]`);
    return '{\n' + f.join(',\n') + '\n}';
  };
  async function ring(b, set, want) {
    for (const [i] of EVENTS.entries()) {
      const el = b.querySelector(`[data-e="${i}"]`);
      el.classList.remove('ring', 'missed');
      await wait(220);
      if (set.has(i)) { el.classList.add('ring'); AU.sfx('coin'); }
      else if (want && want.has(i)) el.classList.add('missed');
    }
  }
  G.bells = function () {
    S.seeConcept('eventbridge');
    return (async () => {
      // Round 1: Marrow's old rule.
      const old = { source: ['thornwick.post'], type: ['Letter Arrived'] };
      let b = U.panel(`<div class="g2"><p>Goodwife Marrow's bell is rung by a rule on Thornwick's event bus. It is meant to ring whenever a letter arrives. Here is the rule, and here is today's bus.</p>
        <div class="g2-pat">${esc(patText(old))}</div>${EVENTS.map(evHtml).join('')}</div>`, { title: 'BELL RULES', noClose: true, cls: 'wide' });
      const g = b.querySelector('.g2');
      await predict(g, { q: 'How many of today\'s six events ring the bell?',
        opts: [{ t: 'None of them', ok: true }, { t: 'Two: the letters that arrived', no: 'Look at the spelling. The pattern says "Letter Arrived", with a space; the events say "LetterArrived".' }, { t: 'Four: everything from thornwick.post', no: 'Every field in a pattern has to match, so the source alone isn\'t enough.' }],
        why: 'A pattern\'s values are matched exactly, character for character. "Letter Arrived" isn\'t "LetterArrived", so this rule has never matched an event, and the bell has never rung.' }, 'eventbridge');
      await ring(g, new Set());
      await cont(g, 'Rewrite the rule');
      // Round 2: build the pattern.
      const want = new Set([0, 2, 3]);
      const pat = { source: [], type: [] };
      let firstTry = null;
      const sources = [...new Set(EVENTS.map(e => e.source))], types = [...new Set(EVENTS.map(e => e.type))];
      b = U.panel(`<div class="g2"><p>Marrow: "Ring it when a letter arrives at any house. And when the watch sees the beast, for Tilly's sake. Nothing else." Tap values to add them to the pattern. A field with nothing picked is left out.</p>
        <div class="muted small">source</div><div class="g2-chips">${sources.map(s => `<button class="ghost" data-f="source" data-v="${s}">${s}</button>`).join('')}</div>
        <div class="muted small">detail-type</div><div class="g2-chips">${types.map(s => `<button class="ghost" data-f="type" data-v="${s}">${s}</button>`).join('')}</div>
        <div class="g2-pat" id="br-pat"></div>${EVENTS.map(evHtml).join('')}
        <button class="primary" id="br-go">Pull the rope</button><p class="g2-note"></p></div>`, { title: 'BELL RULES', noClose: true, cls: 'wide' });
      const g2 = b.querySelector('.g2');
      const show = () => { b.querySelector('#br-pat').textContent = patText(pat); };
      show();
      b.querySelectorAll('[data-f]').forEach(el => el.onclick = () => {
        const list = pat[el.dataset.f], v = el.dataset.v, i = list.indexOf(v);
        if (i >= 0) list.splice(i, 1); else list.push(v);
        el.classList.toggle('on', i < 0); show();
      });
      for (;;) {
        await new Promise(r => { b.querySelector('#br-go').onclick = r; });
        const set = new Set(EVENTS.map((e, i) => matches(pat, e) ? i : -1).filter(i => i >= 0));
        await ring(g2, set, want);
        const ok = set.size === want.size && [...want].every(i => set.has(i));
        if (firstTry === null) { firstTry = ok; S.recordAnswer('eventbridge', ok, 1, 20000); }
        AU.sfx(ok ? 'right' : 'wrong');
        if (ok) { note(g2, 'Three rings, the right three. A list of values matches any one of them; separate fields must all match. A field the pattern leaves out isn\'t checked.', true); break; }
        const extra = [...set].filter(i => !want.has(i)).map(i => EVENTS[i].type), miss = [...want].filter(i => !set.has(i)).map(i => EVENTS[i].type);
        note(g2, (extra.length ? `It also rang for ${extra.join(', ')}. ` : '') + (miss.length ? `It stayed silent for ${miss.join(', ')}. ` : '') + 'Change the pattern and pull again.', false);
      }
      b.querySelector('#br-go').remove();
      await cont(g2);
      // Round 3: letters of kinds that don't exist yet.
      await Q.ask({ c: 'eventbridge', type: 'mc', q: 'Next week the post adds new letter events: LetterLost, LetterForwarded, and more after that. Marrow wants a second bell for every letter event of any kind, without rewriting the rule each time. Which detail-type does it?',
        opts: ['"detail-type": [{"prefix": "Letter"}]', '"detail-type": ["LetterArrived", "LetterSent", "LetterReturned"]', '"detail-type": [{"anything-but": ["BeastSighted"]}]', '"detail-type": ["Letter*"]'], a: 0,
        no: [null, 'That rings for today\'s three, and misses every kind added next week.', 'That rings for anything that isn\'t a beast: the chapel\'s services too.', 'A plain string is matched exactly, star and all. EventBridge has a separate wildcard operator for that.'],
        why: 'A prefix match ({"prefix": "Letter"}) matches any string value that starts with "Letter", so new kinds of letter event ring the bell without a change to the rule.' }, { title: 'BELL RULES', context: 'Marrow\'s second bell' });
      return firstTry;
    })();
  };

  // ---------- Lost letters: a quick recall question each ----------
  // Questions written for these letters, where the bank had nothing on the exact point.
  const F = {};
  [
    { id: 'c2-ver-delete', c: 's3ver', type: 'mc', q: 'A versioned bucket gets a DELETE that names no version ID. What happens to the object\'s versions?',
      opts: ['They all stay; a delete marker becomes the current version', 'The newest version is removed, and the one before becomes current', 'They all move to a noncurrent storage class for 30 days', 'They\'re all removed, unless MFA delete is turned on'], a: 0,
      no: [null, 'That\'s what a DELETE naming the newest version\'s ID does. With no ID, nothing is removed.', 'Storage classes change only through lifecycle rules or a copy, not a delete.', 'MFA delete guards deletes that name a version. A plain DELETE only adds a marker.'],
      why: 'A simple DELETE in a versioned bucket inserts a delete marker as the current version. A plain GET then returns 404, and every version stays underneath.' },
    { id: 'c2-ver-undelete', c: 's3ver', type: 'mc', q: 'An object is hidden under a delete marker. Which request makes its newest real version current again?',
      opts: ['DeleteObject with the delete marker\'s version ID', 'PutObject with an empty body on the same key', 'GetObject with the newest real version\'s ID', 'RestoreObject on the key, as for Glacier'], a: 0,
      no: [null, 'That adds a new, empty current version on top.', 'That reads the old version, but the key still shows as deleted to a plain GET.', 'RestoreObject brings back an archived object from a Glacier storage class; it doesn\'t touch delete markers.'],
      why: 'Deleting the delete marker itself (DeleteObject naming the marker\'s version ID) removes it, and the version under it becomes current again.' },
    { id: 'c2-ver-suspend', c: 's3ver', type: 'mc', q: 'Pingsby turned versioning on years ago. Can a bucket\'s owner now turn it off, so the bucket stops keeping versions?',
      opts: ['No: it can only be suspended, and the versions already there stay', 'Yes: turning it off deletes every noncurrent version', 'Yes: turning it off keeps only each object\'s current version', 'No: versioning, once on, can only be changed by AWS Support'], a: 0,
      no: [null, 'A bucket that has had versioning on never goes back to unversioned.', 'There is no "off" once it\'s been on, and suspending deletes nothing.', 'The owner can suspend it any time; it just can\'t go back to never-versioned.'],
      why: 'Once versioning is enabled, a bucket can be suspended but never returned to unversioned. Suspending stops new versions being kept; existing versions stay.' },
    { id: 'c2-life-noncurrent', c: 's3life', type: 'mc', q: 'A lifecycle rule says NoncurrentDays: 30, NoncurrentVersionExpiration. What does it do to an old version?',
      opts: ['Deletes it for good 30 days after it stops being current', 'Moves it to S3 Glacier 30 days after it\'s written', 'Adds a delete marker over it after 30 days', 'Deletes the current version once it\'s 30 days old'], a: 0,
      no: [null, 'A transition moves versions between storage classes. Expiration deletes them.', 'Noncurrent versions are already under something; expiring them removes them permanently.', 'That\'s the Expiration action for current versions, which in a versioned bucket only adds a delete marker.'],
      why: 'NoncurrentVersionExpiration permanently deletes noncurrent versions a set number of days after they become noncurrent.' }
  ].forEach(q => { F[q.id] = q; });
  // Lost letters: a recall question each, picked at random from a pool (js/qpick.js) of bank questions
  // (js/bank-*.js, by id) and the ones above, so the five come out differently on each playthrough.
  G.LETTERS = [
    { to: 'Pingsby Bakery', c: 's3ver', pool: ['dva-1-244', F['c2-ver-delete'], F['c2-ver-suspend']] },
    { to: 'Coo\'s mother', c: 's3ver', pool: [F['c2-ver-undelete'], 'dva-1-244', F['c2-ver-delete']] },
    { to: 'The Pingsby Brass Band', c: 's3lock', pool: ['saa-1-134', 'saa-1-227'] },
    { to: 'Brookfall Shrine', c: 's3life', pool: ['saa-4-104', F['c2-life-noncurrent'], 'saa-4-01'] },
    { to: 'Kyu (care of Seymour)', c: 's3lock', pool: ['saa-1-05', 'saa-1-227'] }
  ];
  G.letter = function (i) {
    const L = G.LETTERS[i];
    return Q.ask(SD.qpick(L.pool, { c: L.c }), { title: 'A LOST LETTER', context: 'To: ' + L.to });
  };
})();
