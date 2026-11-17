// Type it once (Ladi, Nov 17: "have us write out, or type out, the policy ourselves the first time we see it"). The
// same rule as the Renovation's: the first time a term or a piece of syntax appears in a save, at the mode's next
// natural pause (a debrief, a bill, a rematch, a permit), you type the key token yourself into its line. After two
// misses the answer shows faintly in the blank, to copy. Never during timed or shared play.
//   - Keyed by the token, not the mode: VisibilityTimeout typed in the Fire Drill counts in Monster Hunt too.
//   - Only the token, never a whole policy: the part the exam tests, a few seconds of typing.
//   - "Not now" skips without marking it typed, so it comes back next time.
// API:
//   SD.typeOnce.token(text, prefer)    the key token in a line of AWS text: prefer (if it's in the text), else the first
//                                      condition key or action (kms:Decrypt), CamelCase setting (VisibilityTimeout),
//                                      CONSTANT (AFTER_SEQUENCE_NUMBER), function (attribute_not_exists), --flag or
//                                      snake_case setting (retry_mode)
//   SD.typeOnce.need(token)            true when this save hasn't typed it yet
//   SD.typeOnce.ask({ line, ans, title, who, say, why })   one typing panel: line is the whole line, ans the token
//                                      blanked in it. Resolves { typed, misses, skipped }.
//   SD.typeOnce.maybe(line, opts)      token + need + ask in one: resolves null when there's nothing new to type
//   SD.typeOnce.off = true             maybe() asks nothing (for headless checks of other things; window.SD_NO_TYPING = 1
//                                      before load sets it)
//   SD.typeOnce.match(typed, ans)      the matcher: case, whitespace and surrounding quotes ignored
//   SD.typeOnce.learned(term)          true once this save has typed it (also reads the Renovation's renoKeep.typed and
//                                      the Incident Commander's icTyped, so older saves keep their progress)
//   SD.typeOnce.mark(term)             marks it typed (for a mode that checks its own blanks)
//   SD.typeOnce.bind(input, ans, { onOk, onMiss })   the same two-miss rule on an input a mode draws itself (a blank
//                                      mid-line in a template card): Enter or blur checks it; onOk(misses) after it's
//                                      marked, onMiss(misses) after each miss (the faint placeholder is set at two)
//   ask/maybe opts.choices: [strings]  3 or 4 buttons instead of the text box (the Rush on a phone); a right pick marks it
//   SD.typeOnce.due(term)              true when a typed term is due again (spaced recall, below)
// Stored in the save: S.save.typed[term in lower case] = time typed.
// Spaced recall (Ladi, Nov 17: "exponential spaced recall starting with 24 hours, then 2 days, etc."): once typed, a term
// comes back, from memory, 1 day later, then 2, 4, 8, 16 days; a recall with any miss starts it over at 1 day. need()
// is true for a due term too, so every mode's typing step does recall without changes. Three days before the exam
// (the date set on the main page, S.save.examDate, so a retake's date moves it), every term typed before then comes
// due again for one full pass (Ladi: "reset the typing 3 days before the exam"); the doubling carries on after it.
// S.save.typedDue[term] = { n, due }.
// Spelling: mark() also keeps the term as it was passed (AWS's own case, VisibilityTimeout) in S.save.typedAs[term in
// lower case], for the Terms I own page (js/terms.js). SD.typeOnce.spelling(term) reads it back (else null).
(function () {
  const T = SD.typeOnce = {};
  T.off = !!window.SD_NO_TYPING;   // a headless check of something else sets this before load
  const U = SD.ui, S = SD.state;
  const esc = s => U.esc(String(s == null ? '' : s));
  const store = () => (S.save.typed && typeof S.save.typed === 'object' ? S.save.typed : (S.save.typed = {}));
  const key = s => String(s || '').trim().toLowerCase();
  // Product and language names are terms, but not the syntax worth typing.
  const STOP = /^(CloudWatch|CloudTrail|DynamoDB|CloudFormation|EventBridge|ElastiCache|CodeDeploy|CodePipeline|CodeBuild|CodeCommit|CodeArtifact|CodeGuru|AppSync|AppConfig|OpenSearch|GuardDuty|SageMaker|JavaScript|TypeScript|GitHub|PostgreSQL|MySQL|NoSQL|JSON|YAML|HTTPS?|IPv\d|FastAPI|NodeJS)$/;
  const PATS = [
    /\b(?:aws|kms|sts|s3|iam|dynamodb|sqs|sns|lambda|execute-api|apigateway|logs|cloudwatch|xray|ssm|secretsmanager|cognito-idp|events|states|kinesis|ec2|ecr|ecs|codedeploy|elasticbeanstalk):[A-Za-z*][A-Za-z0-9*]*/,
    /--[a-z][a-z-]{2,}/,
    /\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b/,
    /\b(?:attribute|begins|size)_[a-z_]+\b/,
    /\$LATEST|\$\.[A-Za-z]+/,
    /\b[A-Za-z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b/g,
    /\b[a-z]{3,}_[a-z][a-z_]{2,}\b/
  ];
  T.token = function (text, prefer) {
    const t = String(text || '');
    if (prefer && t.includes(prefer)) return prefer;
    for (const p of PATS) {
      if (p.global) {
        const all = t.match(p) || [];
        const ok = all.find(w => w.length >= 6 && !STOP.test(w));
        if (ok) return ok;
      } else {
        const m = t.match(p);
        if (m) return m[0];
      }
    }
    return '';
  };
  T.learned = tok => {
    if (!tok) return false;
    const k = key(tok), sv = S.save || {};
    if (store()[k]) return true;
    const old = Object.keys((sv.renoKeep && sv.renoKeep.typed) || {}).concat(Object.keys(sv.icTyped || {}));
    if (old.some(t => key(t) === k)) { store()[k] = Date.now(); return true; }
    return false;
  };
  const DAY = 864e5;
  const sched = () => (S.save.typedDue = S.save.typedDue || {});
  // Three days before the exam, from local midnight: every term typed before then is due again.
  const resetAt = () => { const d = S.save && S.save.examDate && new Date(S.save.examDate + 'T00:00:00'); return d && !isNaN(d) ? d.getTime() - 3 * DAY : 0; };
  const nextDue = (from, n) => from + DAY * Math.pow(2, n);
  // A term's place in the schedule; an older save's typed terms start from the time they were typed.
  const slot = tok => {
    const k = key(tok), sc = sched();
    if (!sc[k] && T.learned(tok)) { const t = +store()[k] || Date.now(); sc[k] = { n: 0, due: nextDue(t, 0) }; }
    return sc[k];
  };
  T.due = tok => {
    if (!tok || !T.learned(tok)) return false;
    const now = Date.now(), r = resetAt();
    return now >= slot(tok).due || (!!r && now >= r && (+store()[key(tok)] || 0) < r);
  };
  // Typed (the first time, or a recall): the next recall doubles after a clean recall, and starts over after a miss.
  T.mark = (tok, misses) => {
    if (!tok) return;
    const k = key(tok), now = Date.now(), was = sched()[k], wasDue = was && T.due(tok);
    const n = !was ? 0 : !wasDue ? was.n : misses ? 0 : was.n + 1;
    store()[k] = now; sched()[k] = { n, due: nextDue(now, n) };
    const as = String(tok).trim();
    if (as !== k || !(S.save.typedAs || {})[k]) (S.save.typedAs = S.save.typedAs || {})[k] = as;
    S.persist();
  };
  T.spelling = tok => ((S.save && S.save.typedAs) || {})[key(tok)] || null;
  T.inDays = tok => { const d = Math.max(1, Math.round(((sched()[key(tok)] || {}).due - Date.now()) / DAY) || 1); return d === 1 ? 'a day' : d + ' days'; };
  T.need = tok => !!tok && (!T.learned(tok) || T.due(tok));
  const norm = s => String(s || '').trim().replace(/^[`'"]+|[`'",]+$/g, '').replace(/\s+/g, '').toLowerCase();
  T.match = (typed, ans) => !!norm(typed) && norm(typed) === norm(ans);

  T.ask = function (o) {
    const ans = o.ans, line = String(o.line || ans);
    const at = line.indexOf(ans), pre = at >= 0 ? line.slice(0, at) : '';
    // A trailing comment (# … or // …) goes on its own row under the code, so it never wraps under the blank.
    let post = at >= 0 ? line.slice(at + ans.length) : '', cmt = '';
    const cm = post.match(/\s+(#|\/\/)\s.*$/);
    if (cm) { cmt = cm[0].trim(); post = post.slice(0, cm.index); }
    const cmtHtml = cmt ? `<span class="to-cmt">${esc(cmt)}</span>` : '';
    let misses = 0;
    const recall = T.learned(ans);   // a spaced recall rather than the first time
    // Whatever the panel held (a fight, a map, a drill) is kept aside and put back after, so the typing step can sit on
    // top of any screen and leave it as it was.
    const P = document.getElementById('panel'), keep = P ? [...P.childNodes] : [], hid = P ? P.hidden : true;
    return new Promise(done => {
      const b = U.panel(`<div class="to-w">
          ${o.who ? `<p class="to-say"><b>${esc(o.who)}:</b> ${esc(recall ? 'This one again, from memory this time.' : o.say || 'First time this one\'s come up. Write it in yourself.')}</p>` : `<p class="to-say">${esc(recall ? 'You\'ve typed this before. From memory this time.' : o.say || 'First time this one\'s come up. Type the missing part yourself.')}</p>`}
          <form class="to-card" autocomplete="off">
            <code class="to-line"><span>${esc(pre)}</span>${o.choices ? '<b class="to-gap">____</b>' : `<input class="to-in" type="text" spellcheck="false" autocapitalize="off" autocorrect="off" aria-label="Type the missing part" size="${Math.max(6, Math.min(32, ans.length + 1))}">`}<span>${esc(post)}</span>${cmtHtml}</code>
            ${o.choices ? `<div class="to-ch">${o.choices.map(c => `<button type="button" class="ghost" data-ch="${esc(c)}">${esc(c)}</button>`).join('')}</div>` : ''}
            <p class="small to-note" aria-live="polite">${o.why ? esc(o.why) : 'Type it once, the way AWS spells it. Two misses and it shows faintly to copy.'}</p>
            <div class="row"><button class="primary" type="submit">Check</button><button class="ghost" type="button" data-skip>Not now</button></div>
          </form></div>`, { title: recall ? 'FROM MEMORY' : o.title || 'TYPE IT ONCE', cls: 'to-win', noClose: true });
      const f = b.querySelector('form'), inp = b.querySelector('.to-in') || { value: '', classList: { add() {}, remove() {} }, focus() {} }, note = b.querySelector('.to-note');
      if (o.choices) {
        f.querySelector('[type="submit"]').hidden = true;
        b.querySelectorAll('[data-ch]').forEach(el => el.onclick = () => { inp.value = el.dataset.ch; if (!T.match(inp.value, ans)) el.disabled = true; f.onsubmit({ preventDefault() {} }); });
      }
      setTimeout(() => { try { inp.focus(); } catch (e) { /* no focus on some phones */ } }, 60);
      const finish = r => {
        if (P && keep.length) { P.innerHTML = ''; keep.forEach(n => P.appendChild(n)); P.hidden = hid; } else U.closePanel();
        done(r);
      };
      b.querySelector('[data-skip]').onclick = () => finish({ typed: false, misses, skipped: true });
      f.onsubmit = e => {
        e.preventDefault();
        if (T.match(inp.value, ans)) {
          T.mark(ans, misses);
          if (SD.audio && SD.audio.sfx) try { SD.audio.sfx('good'); } catch (er) { /* sound is optional */ }
          b.querySelector('.to-card').innerHTML = `<code class="to-line done">${esc(pre)}<b>${esc(ans)}</b>${esc(post)}${cmtHtml}</code>
            <p class="small to-note">✓ Typed. ${recall ? (misses ? 'It comes back tomorrow.' : `Remembered. It comes back in ${T.inDays(ans)}.`) : misses ? 'It\'s yours now.' : 'First try.'}</p><div class="row"><button class="primary" type="button" data-go>Continue</button></div>`;
          b.querySelector('[data-go]').onclick = () => finish({ typed: true, misses, skipped: false });
          b.querySelector('[data-go]').focus();
          return;
        }
        misses++;
        inp.classList.add('miss');
        setTimeout(() => inp.classList.remove('miss'), 400);
        if (misses >= 2) { inp.value = ''; inp.placeholder = ans; inp.classList.add('faint'); note.textContent = 'Here it is, faintly. Copy it in.'; }
        else note.textContent = 'Not quite. One more try, then it shows faintly.';
        inp.focus();
      };
    });
  };
  T.bind = function (inp, ans, o) {
    o = o || {};
    let misses = 0, done = !T.need(ans);
    const check = () => {
      if (done || !inp.value.trim()) return;
      if (T.match(inp.value, ans)) { done = true; T.mark(ans, misses); inp.classList.add('ok'); if (o.onOk) o.onOk(misses); return; }
      misses++;
      if (misses >= 2) { inp.value = ''; inp.placeholder = ans; inp.classList.add('faint'); }
      if (o.onMiss) o.onMiss(misses);
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); check(); } });
    inp.addEventListener('blur', check);
    return { check, get done() { return done; }, get misses() { return misses; } };
  };
  T.maybe = function (line, o) {
    o = o || {};
    if (T.off) return Promise.resolve(null);   // headless checks that aren't about typing turn it off
    const ans = o.ans || T.token(line, o.prefer);
    if (!ans || !T.need(ans) || !String(line).includes(ans)) return Promise.resolve(null);
    return T.ask(Object.assign({}, o, { line, ans }));
  };

  const css = document.createElement('style');
  css.textContent = `
    .to-win .to-say { margin: 0 0 8px; }
    .to-card { display: flex; flex-direction: column; gap: 8px; }
    .to-line { display: block; padding: 10px; border-radius: 8px; background: #1c1a24; color: #f3ead6; font: 600 13px/1.6 ui-monospace, Menlo, Consolas, monospace; overflow-wrap: anywhere; white-space: pre-wrap; }
    .to-line b { color: #ffe58a; }
    .to-cmt { display: block; margin-top: 8px; color: #9a93ad; font-weight: 400; }
    .to-in { font: inherit; color: #ffe58a; background: #2c2838; border: 0; border-bottom: 2px solid #ffe58a; border-radius: 3px; padding: 0 4px; margin: 0 .6ch; min-width: 6ch; max-width: calc(100% - 1.2ch); }
    .to-in.faint::placeholder { color: rgba(255, 229, 138, .38); }
    .to-gap { color: #ffe58a; } .to-ch { display: flex; flex-wrap: wrap; gap: 6px; } .to-ch button { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 13px; }
    .to-in.miss { animation: tomiss .35s; }
    @keyframes tomiss { 25% { transform: translateX(-4px); } 75% { transform: translateX(4px); } }
    @media (prefers-reduced-motion: reduce) { .to-in.miss { animation: none; outline: 2px solid #e0607e; } }`;
  document.head.appendChild(css);
})();
