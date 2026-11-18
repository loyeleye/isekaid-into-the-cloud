// Contrast audit hook (Ladi, Nov 17: "I can't see the text on some of them because the contrast is too low").
// Preload it into any Playwright check:   CONTRAST_OUT=dir node -r ./tools/contrast_hook.js tools/ic_check.js
// After each click, key press, evaluate and screenshot the check makes, it measures every visible piece of text against
// what is really behind it (a screenshot with all text made transparent, so painted backgrounds and gradients count)
// and appends anything under WCAG AA (4.5:1, or 3:1 for large text) to CONTRAST_OUT/flags.jsonl, with a screenshot of
// each new screen. CONTRAST_VW=1280x800 forces the viewport, so a phone-only check also runs at desktop size.
// tools/contrast_report.js summarises the flags.
const fs = require('fs'), path = require('path');
const pw = require('playwright');
const OUT = process.env.CONTRAST_OUT || 'contrast-out';
fs.mkdirSync(OUT, { recursive: true });
const TAG = process.env.CONTRAST_TAG || path.basename(process.argv[1] || 'check', '.js');
const VW = process.env.CONTRAST_VW && process.env.CONTRAST_VW.split('x').map(Number);
const seen = new Set();
let shot = 0;

// In the page: every visible element with its own text, its colour (alpha times every ancestor's opacity) and box.
const COLLECT = () => {
  const parse = c => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const out = [], W = innerWidth, H = innerHeight; window.__ca = [];
  const path = e => { const a = []; for (let n = e; n && n !== document.body && a.length < 4; n = n.parentElement) a.unshift(n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.classList.length ? '.' + [...n.classList].slice(0, 3).join('.') : '')); return a.join(' > '); };
  for (const e of document.body.querySelectorAll('*')) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|SVG|PATH|CANVAS|OPTION|TEMPLATE)$/i.test(e.tagName)) continue;
    const texts = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim());
    if (!texts.length) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility !== 'visible' || cs.display === 'none') continue;
    let op = 1, hidden = false;
    for (let n = e; n; n = n.parentElement) { const s = getComputedStyle(n); op *= +s.opacity; if (s.display === 'none' || (n.hidden && n !== document.body)) hidden = true; }
    if (hidden || op < 0.06) continue;
    if (e.closest('.sr, .sr-only, [aria-hidden="true"] .sr')) continue;
    const shut = e.closest('details:not([open])'); if (shut && !e.closest('summary')) continue;   // folded away
    const r = document.createRange(); let box = null;
    for (const t of texts) { r.selectNodeContents(t); for (const b of r.getClientRects()) { if (!b.width || !b.height) continue; box = box ? { l: Math.min(box.l, b.left), t: Math.min(box.t, b.top), r: Math.max(box.r, b.right), b: Math.max(box.b, b.bottom) } : { l: b.left, t: b.top, r: b.right, b: b.bottom }; } }
    if (!box) continue;
    // Clip to the viewport and to every scrolling or overflow-hidden box it sits in: text scrolled out of view isn't seen.
    let l = Math.max(0, box.l), t = Math.max(0, box.t), rr = Math.min(W, box.r), bb = Math.min(H, box.b);
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      const o = getComputedStyle(a); if (o.overflowX === 'visible' && o.overflowY === 'visible') continue;
      const q = a.getBoundingClientRect(); l = Math.max(l, q.left); t = Math.max(t, q.top); rr = Math.min(rr, q.right); bb = Math.min(bb, q.bottom);
    }
    if (rr - l < 3 || bb - t < 3) continue;
    // Skip text under something else (a modal over it, a scrolled-away panel).
    const top = document.elementFromPoint((l + rr) / 2, (t + bb) / 2);
    if (top && !(e.contains(top) || top.contains(e))) { const tc = getComputedStyle(top); if (tc.pointerEvents !== 'none') continue; }
    const fill = cs.webkitTextFillColor && cs.webkitTextFillColor !== cs.color ? cs.webkitTextFillColor : cs.color;
    const c = parse(fill); if (!c || c[3] < 0.05) continue;   // transparent fill: text painted by background-clip, not by its colour
    const size = parseFloat(cs.fontSize), weight = parseInt(cs.fontWeight, 10) || 400;
    window.__ca.push(e);
    out.push({ i: window.__ca.length - 1, path: path(e), text: texts.map(n => n.textContent.trim()).join(' ').replace(/\s+/g, ' ').slice(0, 60), fg: c, op, box: [l, t, rr, bb].map(Math.round),
      large: size >= 24 || (size >= 18.66 && weight >= 700), size, weight, shadow: cs.textShadow !== 'none', stroke: parseFloat(cs.webkitTextStrokeWidth) || 0, disabled: !!e.closest('button[disabled], [aria-disabled="true"], .disabled') });
  }
  return out;
};

// In the page: given the text-free screenshot, the background colour behind each item and its contrast.
const MEASURE = async ([png, shown, items]) => {
  const load = async src => { const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
    const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0); return [img, g]; };
  const [img, g] = await load(png), [, g2] = await load(shown);
  const sx = img.width / innerWidth;
  const lin = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = ([r, gg, b]) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  return items.map(it => {
    const [l, t, r, b] = it.box.map(v => Math.round(v * sx));
    const d = g.getImageData(l, t, Math.max(1, r - l), Math.max(1, b - t)).data;
    // Text that paints nothing (covered by a toast or overlay) leaves the box the same with and without it: skip it.
    const d2 = g2.getImageData(l, t, Math.max(1, r - l), Math.max(1, b - t)).data;
    let diff = 0; for (let i = 0; i < d.length; i += 4) diff = Math.max(diff, Math.abs(d[i] - d2[i]) + Math.abs(d[i + 1] - d2[i + 1]) + Math.abs(d[i + 2] - d2[i + 2]));
    if (diff < 6) return null;
    const a = it.fg[3] * it.op, rs = [];
    const step = Math.max(1, Math.floor(d.length / 4 / 600));
    for (let i = 0; i < d.length; i += 4 * step) {
      const bg = [d[i], d[i + 1], d[i + 2]], fg = [0, 1, 2].map(k => it.fg[k] * a + bg[k] * (1 - a));
      rs.push({ r: ratio(fg, bg), bg });
    }
    rs.sort((x, y) => x.r - y.r);
    const med = rs[Math.floor(rs.length / 2)], lo = rs[Math.floor(rs.length * 0.1)];
    return { ...it, diff, ratio: +med.r.toFixed(2), low: +lo.r.toFixed(2), bg: med.bg };
  }).filter(Boolean);
};

async function audit(page, why) {
  if (page.__auditing || page.isClosed()) return;
  // A check that drives the page with a burst of calls gets one look per second of its time, not one per call.
  const now = Date.now(); if (!/screenshot|click|press|tap/.test(why) && now - (page.__last || 0) < 1000) return;
  page.__last = now;
  page.__auditing = true;
  try {
    // Let pop-ins and fades finish first, or a card caught mid-fade reads as faint.
    await page.__orig.evaluate(() => Promise.race([new Promise(r => setTimeout(r, 400)), Promise.all(document.getAnimations().filter(a => a.playState === 'running' && a.effect && a.effect.getComputedTiming().iterations !== Infinity).map(a => a.finished.catch(() => {})))])).catch(() => {});
    const items = await page.__orig.evaluate(COLLECT).catch(() => null);
    if (!items || !items.length) return;
    const vp = page.viewportSize() || { width: 0 };
    const sig = vp.width + '|' + items.map(i => i.path + ':' + i.fg.join(',') + ':' + i.op.toFixed(2)).sort().join('\n');
    if (seen.has(sig)) return;
    seen.add(sig);
    const shown = await page.__orig.screenshot({ type: 'png' }).catch(() => null);
    if (!shown) return;
    await page.__orig.addStyleTag({ content: '*,*::before,*::after{color:transparent!important;-webkit-text-fill-color:transparent!important;text-shadow:none!important;-webkit-text-stroke:0!important;transition:none!important;caret-color:transparent!important}' }).then(h => page.__style = h).catch(() => {});
    const png = await page.__orig.screenshot({ type: 'png' }).catch(() => null);
    if (page.__style) { await page.__style.evaluate(n => n.remove()).catch(() => {}); page.__style = null; }
    if (!png) return;
    const measured = await page.__orig.evaluate(MEASURE, [png.toString('base64'), shown.toString('base64'), items]).catch(() => null);
    if (!measured) return;
    const bad = measured.filter(m => m.ratio < (m.large ? 3 : 4.5));
    if (!bad.length) return;
    // Where each flagged colour comes from: the rules that set it on the element, or on the nearest ancestor it inherits from.
    const src = await page.__orig.evaluate(ids => ids.map(i => {
      const rules = []; for (const ss of document.styleSheets) { let rs; try { rs = ss.cssRules; } catch (x) { continue; } for (const r of rs) if (r.selectorText && (r.style.color || r.style.getPropertyValue('--ink'))) rules.push(r); }
      for (let e = window.__ca[i], up = 0; e && up < 8; e = e.parentElement, up++) {
        const hit = rules.filter(r => { try { return e.matches(r.selectorText); } catch (x) { return false; } });
        const inl = e.style && e.style.color;
        if (hit.length || inl) return (up ? `(inherited ${up} up) ` : '') + (inl ? 'inline ' + inl + ' ; ' : '') + hit.slice(-3).map(r => r.selectorText.slice(0, 140) + ' { ' + (r.style.color ? 'color: ' + r.style.color : '') + (r.style.getPropertyValue('--ink') ? ' --ink: ' + r.style.getPropertyValue('--ink') : '') + ' }').join(' ; ');
      }
      return '';
    }), bad.map(m => m.i)).catch(() => []);
    bad.forEach((m, k) => { m.src = src[k] || ''; });
    const id = `${TAG}-${vp.width}-${String(++shot).padStart(3, '0')}`;
    fs.writeFileSync(path.join(OUT, id + '.png'), shown);
    for (const m of bad) fs.appendFileSync(path.join(OUT, 'flags.jsonl'), JSON.stringify({ shot: id, why, width: vp.width, ...m }) + '\n');
  } finally { page.__auditing = false; }
}

function wrapPage(page) {
  if (page.__orig) return page;
  page.__orig = { evaluate: page.evaluate.bind(page), screenshot: page.screenshot.bind(page), addStyleTag: page.addStyleTag.bind(page) };
  for (const fn of ['click', 'tap', 'fill', 'press', 'evaluate', 'screenshot', 'waitForTimeout', 'goto']) {
    const o = page[fn].bind(page);
    page[fn] = async (...a) => { const r = await o(...a); if (fn !== 'screenshot' || !page.__auditing) await audit(page, fn + ' ' + String(typeof a[0] === 'function' ? 'fn' : a[0]).slice(0, 40)).catch(() => {}); return r; };
  }
  for (const k of ['mouse', 'keyboard']) for (const fn of ['click', 'press', 'type']) if (page[k][fn]) { const o = page[k][fn].bind(page[k]); page[k][fn] = async (...a) => { const r = await o(...a); await audit(page, k + '.' + fn).catch(() => {}); return r; }; }
  return page;
}
const opts = o => VW ? { ...(o || {}), viewport: { width: VW[0], height: VW[1] }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 } : o;
function wrapContext(ctx) { const np = ctx.newPage.bind(ctx); ctx.newPage = async () => wrapPage(await np()); return ctx; }
for (const bt of [pw.chromium]) {
  const launch = bt.launch.bind(bt);
  bt.launch = async (...a) => {
    const b = await launch(...a);
    const np = b.newPage.bind(b), nc = b.newContext.bind(b);
    b.newPage = async o => wrapPage(await np(opts(o)));
    b.newContext = async o => wrapContext(await nc(opts(o)));
    return b;
  };
}
