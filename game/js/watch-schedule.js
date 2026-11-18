/* The Night Watch: where everyone is during the day, and how they get there (Ladi, Nov 18: a livelier town).
   Pure logic (no DOM). Browser: SD.watchSchedule. Node: module.exports (pass WW in).

   A plan is a list of [from, place]: from is how far through the day (0 at dawn's end, 1 at dusk) and place is a
   town spot id, or { at: spotId, dx } to stand a little to one side. Content: WATCH_CONTENT.schedule[who] =
   { plan, days: { n: plan }, rain: plan }. The first entry of every plan is the person's home spot, so the day opens
   with everyone where people() puts them.

   A walker is { who, scene, x, facing, go, d, ramp }. go: walking now; d: distance walked (for the feet); ramp:
   { path, d, len, to } while climbing between roads. Walkers take the forks and walk the painted ramps like you do. */
(function () {
  'use strict';
  var SPEED = 70;   // an amble: a third of Seo-yeon's pace

  function planFor(sched, who, day, wx) {
    var s = (sched || {})[who]; if (!s) return null;
    if (s.days && s.days[day]) return s.days[day];
    if ((wx === 'rain' || wx === 'mist') && s.rain) return s.rain;
    return s.plan || null;
  }
  // The place a plan puts someone at fraction t of the day.
  function placeAt(plan, t) {
    var p = null;
    for (var i = 0; i < plan.length; i++) if (t >= plan[i][0]) p = plan[i][1];
    return p || plan[0][1];
  }
  function resolve(WW, place) {
    var id = typeof place === 'string' ? place : place.at, dx = typeof place === 'string' ? 0 : place.dx || 0;
    var sp = WW.spot(null, id); if (!sp) return null;
    return { scene: sp.level, x: sp.x + 34 + dx };
  }
  function pathLen(p) { var n = 0; for (var i = 1; i < p.length; i++) n += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return n; }

  // The fork on this road that starts the way to `scene` (nearest one if there are two).
  function forkToward(WW, from, scene) {
    var route = WW.route({ scene: from.scene }, scene, {}, 'day'), next = route && route[1];
    if (!next) return null;
    var best = null;
    WW.scene(from.scene).spots.forEach(function (s) {
      if (s.kind === 'fork' && s.to && s.to.scene === next && (!best || Math.abs(s.x - from.x) < Math.abs(best.x - from.x))) best = s;
    });
    return best;
  }

  // Move a walker toward its target for dt seconds. rampPath(scene, x, to) gives the climb's path (the view's).
  function step(WW, w, target, dt, rampPath) {
    if (!target) { w.go = false; return; }
    var mv = SPEED * dt;
    if (w.ramp) {
      w.ramp.d += mv * 0.8; w.d += mv; w.go = true;
      var a = at(w.ramp.path, w.ramp.d - 2), b = at(w.ramp.path, w.ramp.d + 2);
      if (b[0] !== a[0]) w.facing = b[0] > a[0] ? 1 : -1;
      if (w.ramp.d >= w.ramp.len) { w.scene = w.ramp.to.scene; w.x = w.ramp.to.x; w.ramp = null; }
      return;
    }
    var goal = target.scene === w.scene ? target : null, fork = null;
    if (!goal) { fork = forkToward(WW, w, target.scene); if (!fork) { w.go = false; return; } goal = { scene: w.scene, x: fork.x }; }
    var dx = goal.x - w.x;
    if (Math.abs(dx) > 2) {
      var m = Math.sign(dx) * Math.min(Math.abs(dx), mv);
      w.x += m; w.d += Math.abs(m); w.go = true; w.facing = dx > 0 ? 1 : -1;
      return;
    }
    if (fork) {   // at the fork: climb (or go down) the ramp
      var path = rampPath ? rampPath(w.scene, fork.x, fork.to) : null;
      if (path) { w.ramp = { path: path, d: 0, len: pathLen(path), to: fork.to }; w.go = true; }
      else { w.scene = fork.to.scene; w.x = fork.to.x; }
      return;
    }
    w.go = false;
  }
  function at(p, d) {
    for (var i = 1; i < p.length; i++) {
      var l = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
      if (d <= l || i === p.length - 1) { var f = l ? Math.max(0, Math.min(1, d / l)) : 1; return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * f, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * f]; }
      d -= l;
    }
    return p[p.length - 1];
  }

  var api = { SPEED: SPEED, planFor: planFor, placeAt: placeAt, resolve: resolve, forkToward: forkToward, step: step, at: at, pathLen: pathLen };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') { window.SD = window.SD || {}; window.SD.watchSchedule = api; }
})();
