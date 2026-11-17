// The Sorting Floor's hall, debrief, parts cart and morning (storyboard approved by Ladi, Nov 17: project files
// sogni/ic-storyboard/sorting-floor-storyboard.png). The four screens around the Rush's claims (js/rush.js), each a
// painted scene you act on, never a menu:
//   - The claims hall: three corridors (the cellar, the dock, upstairs), one door per claim. A claimant's shadow waits
//     behind each frosted window; a door you've closed wears Dutch's green stamp, and the next one glows. Tap a door:
//     your lantern walks to it, it swings open, and that claim's Night Orders pick comes up.
//   - The debrief (one bank question after each claim won): in the room you just played, Dutch holds up a claim ticket
//     with the question on it. The answers are rubber stamps on his desk: drag one onto the ticket (or tap it, or press
//     1 to 4). The ink says right or wrong, and the ticket's back gives the AWS rule. A missed question comes back
//     as the first debrief of a later claim.
//   - The parts cart: Dutch wheels in up to two pieces you've used before that the next claim also uses. Drag one onto
//     the toolbelt and it starts the next claim already placed, free. The first time you take a piece, you stencil
//     its AWS config onto the crate by typing it out (Ladi, Nov 17: "type out the policy ourselves the first time").
//     Claims that run on their own engines (the Locked Desk, the Night Audit, the New Sorter) get a coin instead.
//   - Morning: after the last claim, every door is stamped and the night ledger on the wall pairs each claim with the
//     AWS piece that closed it.
// Learning (Ladi, Nov 17: "build better associations"): every gesture shows the real AWS term next to its result
// (the plaques name the services behind each door; the ticket's back names the rule; the crate wears its config).
// Saves in localStorage (rush-hall-v1): doors closed, configs typed, the missed question, the gift.
// ?nohall turns all four off. Hooks in js/rush.js: the start (open the hall), the end cards' "next" button (SD.rushHall.won), reset() (afterReset).
(function () {
  // ?nohall plays the claims back to back as before (tools/rush_check.js relies on that).
  if (new URLSearchParams(location.search).has('nohall')) return;
  const R = SD.rushCore;
  const H = SD.rushHall = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ART = 'assets/img/rush/hall/';
  const KEY = 'rush-hall-v1';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  const st = Object.assign({ closed: {}, typed: {}, missed: null, gift: null, asked: [], ledger: {} }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };

  // ---- The hall: three corridors, three doors each, in the order the claims are played ----
  // Door rects in the plate's pixels (1344 x 768): centre x, top, bottom, width. Floor: where the lantern walks.
  const WINGS = [
    { id: 'cellar', name: 'The cellar', plate: 'wing-cellar', doors: [270, 680, 1086], top: 230, bottom: 600, w: 184, floor: 690 },
    { id: 'dock', name: 'The dock corridor', plate: 'wing-dock', doors: [330, 680, 1026], top: 192, bottom: 562, w: 206, floor: 640 },
    { id: 'upstairs', name: 'Upstairs', plate: 'wing-upstairs', doors: [330, 680, 970], top: 184, bottom: 584, w: 188, floor: 690 }
  ];
  const ORDER = ['rush', 'bell', 'double', 'slow', 'picky', 'hot', 'locked', 'audit', 'sorter'];
  // What's behind each door: the claimant (a shadow in the window) and the AWS services the claim is about.
  const DOOR = {
    rush: { who: 'rush', aws: 'Lambda throttling · SQS · reserved concurrency · DLQ' },
    bell: { who: 'bell', aws: 'SNS fan-out · async invocation' },
    double: { who: 'double', aws: 'Idempotency · DynamoDB conditional writes' },
    slow: { who: 'alibi', aws: 'SQS visibility timeout · Lambda timeout' },
    picky: { who: 'crowd', aws: 'SNS subscription filter policies' },
    hot: { who: 'ledger', aws: 'DynamoDB partitions · write sharding' },
    locked: { who: 'poison', aws: 'IAM · KMS · S3 bucket policies · secrets' },
    audit: { who: 'crowd', aws: 'X-Ray traces · CloudWatch metrics and alarms' },
    sorter: { who: 'double', aws: 'SAM · CloudFormation · safe deployments' }
  };
  const title = c => (R.CLAIMS[c] && R.CLAIMS[c].title) || c;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const wingOf = c => Math.floor(ORDER.indexOf(c) / 3);
  const nextOpen = () => ORDER.find(c => !st.closed[c]) || null;
  const reachable = c => !!st.closed[c] || c === nextOpen();

  // ---- AWS config the player types the first time they take a piece off the cart ----
  // Each is real syntax (CLI or the attribute itself), kept short. Docs: SQS CreateQueue and RedrivePolicy, Lambda
  // PutFunctionConcurrency and UpdateFunctionConfiguration, SNS Subscribe and FilterPolicy, DynamoDB condition
  // expressions and UpdateTable --billing-mode.
  const CONFIG = {
    rack: { aws: 'SQS standard queue', line: 'aws sqs create-queue --queue-name tickets', note: 'A standard queue: messages wait until a consumer polls them.' },
    reserve: { aws: 'Reserved concurrency', line: 'aws lambda put-function-concurrency --function-name mira --reserved-concurrent-executions 4', note: 'Four executions set aside for this function, and a cap at four.' },
    bin: { aws: 'Dead-letter queue (redrive policy)', line: '{"deadLetterTargetArn": "arn:aws:sqs:us-east-1:111122223333:tickets-dlq", "maxReceiveCount": 3}', note: 'The RedrivePolicy attribute on the source queue: after 3 receives, the message moves to the DLQ.' },
    bell: { aws: 'SNS topic (fan-out)', line: 'aws sns subscribe --topic-arn $TOPIC --protocol lambda --notification-endpoint $REPORTS_FN', note: 'Each subscriber gets its own copy of every message published to the topic.' },
    ledger: { aws: 'DynamoDB conditional write', line: 'ConditionExpression="attribute_not_exists(ticketId)"', note: 'The PutItem fails with ConditionalCheckFailedException if the ticket was already written.' },
    hourglass: { aws: 'Visibility timeout', line: 'aws sqs set-queue-attributes --queue-url $QUEUE --attributes VisibilityTimeout=180', note: 'For a Lambda event source, AWS advises at least six times the function timeout.' },
    stopwatch: { aws: 'Function timeout', line: 'aws lambda update-function-configuration --function-name mira --timeout 30', note: 'The default is 3 seconds; the maximum is 900 (15 minutes).' },
    filter: { aws: 'SNS subscription filter policy', line: '{"type": ["refund"]}', note: 'Set as the subscription\'s FilterPolicy: SNS only delivers messages whose type attribute is refund.' },
    shard: { aws: 'Write sharding', line: 'pk = f"{caller}#{ticket_no % 4}"', note: 'A calculated suffix spreads one hot caller\'s writes across several partition key values.' },
    ondemand: { aws: 'On-demand capacity mode', line: 'aws dynamodb update-table --table-name files --billing-mode PAY_PER_REQUEST', note: 'No capacity to provision. Each partition still has its own per-second ceiling.' }
  };
  // The cart only brings pieces to claims that run on the cellar's rules (the others have their own engines).
  const GIFT_CLAIMS = ['bell', 'double', 'slow', 'picky', 'hot'];

  // ---- DOM ----
  const css = document.createElement('style');
  css.textContent = `
#hall { position: fixed; inset: 0; z-index: 20; display: none; overflow: hidden; background: #0d0a12; font-family: var(--f-body); color: #2b2340; }
#hall.on { display: block; }
#hall.over { background: rgba(14, 10, 18, .78); backdrop-filter: blur(3px); -webkit-backdrop-filter: blur(3px); }
.hl-cam { position: absolute; left: 0; top: 0; transform-origin: 0 0; transition: transform .7s cubic-bezier(.4,.1,.2,1); }
.hl-plate { position: absolute; inset: 0; background-size: 100% 100%; }
.hl-fade { position: absolute; inset: 0; background: #0d0a12; opacity: 0; pointer-events: none; transition: opacity .35s; }
.hl-fade.on { opacity: 1; }
.hl-door { position: absolute; padding: 0; border: 0; background: transparent; cursor: pointer; border-radius: 6px; }
.hl-door:disabled { cursor: default; }
.hl-door .hl-win { position: absolute; left: 18%; right: 18%; top: 6%; height: 34%; overflow: hidden; display: grid; place-items: end center; }
.hl-door .hl-win img { height: 92%; filter: brightness(0) blur(1.5px); opacity: .5; animation: hl-sway 3.4s ease-in-out infinite alternate; }
@keyframes hl-sway { from { transform: translateX(-6%); } to { transform: translateX(6%); } }
.hl-door.next { box-shadow: 0 0 0 4px rgba(255, 214, 120, .75), 0 0 46px 10px rgba(255, 190, 90, .55); animation: hl-glow 1.6s ease-in-out infinite alternate; }
@keyframes hl-glow { to { box-shadow: 0 0 0 4px rgba(255, 214, 120, .95), 0 0 70px 18px rgba(255, 190, 90, .75); } }
.hl-door.shut::after { content: ''; position: absolute; inset: 0; background: rgba(10, 8, 20, .45); border-radius: 6px; }
.hl-lock { position: absolute; left: 50%; top: 52%; transform: translate(-50%, -50%); font: 700 40px var(--f-head); color: #e8d6a8; text-shadow: 0 2px 6px #000; z-index: 1; }
.hl-stamp { position: absolute; left: 50%; top: 58%; transform: translate(-50%, -50%) rotate(-14deg); padding: 2px 12px; border: 6px solid #2fbf7f; border-radius: 8px;
  color: #2fbf7f; font: 700 34px var(--f-head); letter-spacing: .06em; background: rgba(10, 30, 18, .35); white-space: nowrap; z-index: 1; }
.hl-door.opening { transition: transform .5s ease-in; transform: perspective(500px) rotateY(-70deg); transform-origin: 0 50%; }
.hl-plaque { position: absolute; transform: translateX(-50%); width: 250px; padding: 8px 10px 9px; box-sizing: border-box; text-align: center; pointer-events: none;
  background: linear-gradient(#f1d68b, #c99a3e); border: 3px solid #6a4512; border-radius: 6px; box-shadow: 0 6px 14px rgba(0,0,0,.5); color: #2a1a06; }
.hl-plaque b { display: block; font: 700 21px/1.1 var(--f-head); }
.hl-plaque small { display: block; margin-top: 3px; font: 800 13px/1.25 var(--f-body); color: #4a3008; }
.hl-dutch { position: absolute; pointer-events: none; filter: drop-shadow(0 10px 18px rgba(0,0,0,.55)); }
.hl-lantern { position: absolute; width: 74px; transform: translate(-50%, -100%); transition: left .8s ease-in-out; pointer-events: none; filter: drop-shadow(0 0 22px rgba(255, 200, 90, .9)); }
.hl-ui { position: absolute; inset: 0; pointer-events: none; }
.hl-ui > * { pointer-events: auto; }
.hl-top { position: absolute; left: 14px; right: 14px; top: calc(10px + env(safe-area-inset-top, 0px)); display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; pointer-events: none; }
.hl-title { pointer-events: none; color: #fbe7b5; font: 700 22px var(--f-head); text-shadow: 0 2px 6px #000; letter-spacing: .03em; }
.hl-title small { display: block; font: 700 14px var(--f-body); color: #e8d9bb; }
.hl-say { max-width: 520px; display: flex; gap: 10px; align-items: center; padding: 8px 12px; background: #fbf3e2; border: 2px solid #6b4e24; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,.45); pointer-events: none; font-weight: 700; font-size: 15px; }
.hl-say img { width: 46px; height: 46px; border-radius: 8px; object-fit: cover; object-position: top; flex: none; }
.hl-say b { color: #8a4a12; }
.hl-arrow { position: absolute; top: 50%; transform: translateY(-50%); min-width: 54px; min-height: 64px; padding: 8px 12px; border: 2px solid #6b4e24; border-radius: 12px; cursor: pointer;
  background: rgba(251, 243, 226, .92); font: 700 16px var(--f-head); color: #3a2410; box-shadow: 0 6px 16px rgba(0,0,0,.5); }
.hl-arrow.l { left: 10px; } .hl-arrow.r { right: 10px; }
.hl-arrow small { display: block; font: 700 12px var(--f-body); }
/* The debrief and the cart: over the room you just played. */
.hl-scene { position: absolute; inset: 0; }
.hl-scene .hl-dutch { right: 2%; bottom: 0; height: 88%; }
.hl-card { position: absolute; left: 4%; top: 13%; width: min(640px, 62vw); display: flex; flex-direction: column; gap: 14px; }
.hl-ticket { position: relative; box-sizing: border-box; transform: rotate(-1.2deg); border-style: solid; border-width: 26px 150px 30px 26px;
  border-image: url(${ART}ticket.webp) 24 160 30 24 fill / 26px 150px 30px 26px stretch; padding: 22px 30px 22px 26px; min-height: 200px; display: flex; flex-direction: column; justify-content: center; transition: transform .25s; }
.hl-ticket.flip { transform: rotate(.8deg) scale(1.01); }
.hl-ticket.hot { filter: drop-shadow(0 0 16px rgba(255, 210, 110, .95)); }
.hl-ticket p { margin: 0; font: 800 18px/1.4 var(--f-body); color: #2a1d10; }
.hl-ticket .hl-kind { font: 700 13px var(--f-head); letter-spacing: .1em; text-transform: uppercase; color: #8a5f1c; margin-bottom: 8px; }
.hl-ink { align-self: flex-start; margin: 14px 0 2px 6px; transform: rotate(-4deg); max-width: 88%; padding: 4px 10px; border: 4px solid; border-radius: 8px; font: 700 16px/1.2 var(--f-head); text-align: center; opacity: .88; animation: hl-thump .25s cubic-bezier(.3,1.6,.5,1); background: rgba(255,255,255,.25); }
.hl-ink.ok { color: #1f8a55; border-color: #1f8a55; } .hl-ink.no { color: #b23a2f; border-color: #b23a2f; }
@keyframes hl-thump { from { transform: rotate(-5deg) scale(1.8); opacity: 0; } }
.hl-why { margin: 0 150px 0 10px; transform: rotate(.6deg); box-sizing: border-box; padding: 12px 16px; background: #fff7d8; border: 2px solid #b08a3c; border-radius: 4px; box-shadow: 0 8px 20px rgba(0,0,0,.45); font: 700 15px/1.4 var(--f-body); }
.hl-why b { display: block; margin-bottom: 2px; font: 700 13px var(--f-head); letter-spacing: .08em; text-transform: uppercase; color: #8a5f1c; }
.hl-stamps { position: absolute; left: 3%; right: 26%; bottom: 3%; display: flex; gap: 10px; justify-content: center; align-items: flex-end; }
.hl-st { position: relative; flex: 1 1 0; max-width: 200px; min-height: 196px; padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; display: flex; flex-direction: column; align-items: center; font-family: var(--f-body); }
.hl-st img { width: 74%; pointer-events: none; filter: drop-shadow(0 8px 10px rgba(0,0,0,.5)); }
.hl-st span { margin-top: -10px; width: 100%; box-sizing: border-box; padding: 6px 6px 7px; background: #fbf3e2; border: 2px solid #6b4e24; border-radius: 6px; font: 800 13.5px/1.25 var(--f-body); color: #2a1d10; }
.hl-st kbd { position: absolute; left: 4px; top: 4px; width: 22px; height: 22px; display: grid; place-items: center; border-radius: 6px; background: #6b4e24; color: #fbf2db; font: 700 12px var(--f-head); }
.hl-st.lift { cursor: grabbing; z-index: 3; transition: none; }
.hl-st.used { opacity: .35; } .hl-st.right span { background: #d9f5e4; border-color: #1f8a55; } .hl-st.wrong span { background: #fde0dc; border-color: #b23a2f; }
.hl-st:disabled { cursor: default; }
/* Once stamped, the stamps go back in the drawer: the ink on the ticket and the note say which was right. */
.settled .hl-stamps { display: none; }
.hl-go { position: absolute; right: 3%; bottom: 4%; z-index: 4; min-height: 52px; padding: 10px 22px; border: 0; border-radius: 12px; background: linear-gradient(#ffd977, #e5a93a); box-shadow: 0 4px 0 #8a5a14, 0 10px 20px rgba(0,0,0,.4); font: 700 18px var(--f-head); color: #3a2208; cursor: pointer; }
/* The parts cart */
.hl-cart { position: absolute; left: 50%; top: 30%; width: min(560px, 56vw); transform: translateX(-62%); }
.hl-cart > img { width: 100%; display: block; pointer-events: none; filter: drop-shadow(0 14px 20px rgba(0,0,0,.55)); }
.hl-crates { position: absolute; left: 22%; right: 10%; top: -16%; display: flex; gap: 6%; justify-content: center; }
.hl-crate { position: relative; width: 44%; padding: 0; border: 0; background: transparent; cursor: grab; touch-action: none; font-family: var(--f-body); }
.hl-crate > img.c { width: 100%; display: block; pointer-events: none; filter: drop-shadow(0 6px 8px rgba(0,0,0,.5)); }
.hl-crate > img.t { position: absolute; left: 50%; top: -38%; height: 96%; transform: translateX(-50%); pointer-events: none; filter: drop-shadow(0 4px 6px rgba(0,0,0,.6)); }
.hl-crate > span { position: absolute; left: -8%; right: -8%; bottom: -40%; padding: 5px 6px; background: #fbf3e2; border: 2px solid #6b4e24; border-radius: 6px; font: 800 15px/1.2 var(--f-body); color: #2a1d10; }
.hl-crate > span small { display: block; font-weight: 700; color: #6b5530; }
.hl-crate.lift { z-index: 5; cursor: grabbing; }
.hl-belt { position: absolute; left: 50%; bottom: 3%; transform: translateX(-62%); width: min(600px, 70vw); min-height: 86px; display: flex; gap: 8px; align-items: center; justify-content: center; padding: 10px 14px; box-sizing: border-box;
  background: rgba(40, 32, 44, .92); border: 3px solid #c8a24a; border-radius: 14px; color: #f5e6c8; font: 700 15px var(--f-head); }
.hl-belt.hot { box-shadow: 0 0 0 4px #ffe08a, 0 0 30px #ffd36a; }
.hl-belt img { height: 58px; }
/* Stencil: type the config onto the crate */
.hl-sten { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(720px, 94vw); box-sizing: border-box; padding: 18px 20px 16px; z-index: 6;
  background: radial-gradient(120% 90% at 30% 20%, #f3dfb1, #d9b878); border: 4px solid #6b4e24; border-radius: 10px; box-shadow: 0 20px 50px rgba(0,0,0,.6); }
.hl-sten h3 { margin: 0 0 4px; font: 700 20px var(--f-head); color: #3a2410; }
.hl-sten p { margin: 0 0 10px; font: 700 14px/1.4 var(--f-body); color: #4a3418; }
.hl-guide { position: relative; padding: 12px; background: #4a3218; border-radius: 6px; font: 600 16px/1.5 ui-monospace, Menlo, Consolas, monospace; color: rgba(255, 236, 200, .35); word-break: break-all; white-space: pre-wrap; }
.hl-guide i { font-style: normal; color: #ffe7a8; } .hl-guide u { text-decoration: none; color: #ff8a7a; background: rgba(255, 90, 70, .25); }
.hl-guide em { font-style: normal; border-left: 2px solid #ffe7a8; margin-left: -1px; animation: hl-blink 1s steps(1) infinite; }
@keyframes hl-blink { 50% { border-color: transparent; } }
.hl-sten input { position: absolute; left: 0; top: 0; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
.hl-sten .hl-row { display: flex; gap: 10px; align-items: center; margin-top: 12px; flex-wrap: wrap; }
.hl-sten .hl-row button { min-height: 44px; padding: 8px 16px; border-radius: 10px; font: 700 15px var(--f-head); cursor: pointer; }
.hl-sten .hl-ok { border: 0; background: linear-gradient(#ffd977, #e5a93a); color: #3a2208; }
.hl-sten .hl-ok:disabled { opacity: .45; cursor: default; }
.hl-sten .hl-skip { border: 2px solid #6b4e24; background: transparent; color: #4a3418; }
.hl-sten .hl-count { margin-left: auto; font: 700 13px var(--f-body); color: #5a4020; }
/* Morning */
#hall.morning .hl-plate::after { content: ''; position: absolute; inset: 0; background: linear-gradient(110deg, rgba(255, 190, 140, .35), rgba(255, 230, 170, .1) 50%, rgba(255, 170, 120, .3)); mix-blend-mode: screen; }
.hl-ledger { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(560px, 92vw); max-height: 80vh; overflow-y: auto; box-sizing: border-box; padding: 18px 20px; background: #fbf3e2; border: 3px solid #6b4e24; border-radius: 8px; box-shadow: 0 20px 50px rgba(0,0,0,.6); z-index: 4; }
.hl-ledger h3 { margin: 0 0 8px; font: 700 22px var(--f-head); color: #3a2410; }
.hl-ledger ol { margin: 0 0 12px; padding-left: 22px; font: 700 14.5px/1.45 var(--f-body); }
.hl-ledger ol small { color: #6b5530; }
.hl-ledger .hl-go { position: static; }
@media (max-width: 700px), (orientation: portrait) {
  .hl-scene .hl-dutch { height: 46%; right: -6%; opacity: .95; }
  .hl-card { left: 4%; right: 4%; width: auto; top: 11%; gap: 10px; }
  .hl-ticket { border-width: 18px 96px 22px 18px; border-image-width: 18px 96px 22px 18px; padding: 16px 16px 16px 16px; min-height: 0; }
  .hl-ticket.flip { transform: rotate(.8deg); }
  .hl-ticket .hl-kind { margin-bottom: 4px; }
  .hl-ticket p { font-size: 15px; line-height: 1.35; }
  .hl-ink { max-width: 100%; }
  .hl-why { margin: 0 4px; transform: none; font-size: 14px; }
  .hl-stamps { left: 2%; right: 2%; bottom: 82px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .hl-st { min-height: 0; max-width: none; flex-direction: row; gap: 6px; }
  .hl-st img { width: 46px; }
  .hl-st span { margin: 0; text-align: left; }
  .hl-go { left: 4%; right: 4%; bottom: 14px; }
  .hl-cart { width: 84vw; transform: translateX(-50%); top: 24%; }
  .hl-belt { width: 92vw; transform: translateX(-50%); bottom: 84px; }
  .hl-say { max-width: 70vw; font-size: 14px; }
  .hl-plaque { width: 210px; }
}
`;
  document.head.appendChild(css);
  const el = document.createElement('div');
  el.id = 'hall';
  el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  document.body.appendChild(el);
  const NAMES = { dutch: 'Dutch', pip: 'Pip' };
  const say = (who, line) => `<div class="hl-say"><img src="${who === 'pip' ? 'assets/img/portraits-painted/pip.webp' : 'assets/img/portraits/dutch-neutral.webp'}" alt=""><span><b>${NAMES[who]}:</b> ${esc(line)}</span></div>`;

  // ---- The hall ----
  let wing = 0, cam = { s: 1, x: 0 }, walking = false, done = null;
  function layout() {
    const vw = innerWidth, vh = innerHeight;
    const s = Math.max(vh / 768, vw / 1344); // cover
    const cv = el.querySelector('.hl-cam'); if (!cv) return;
    cam.s = s;
    cv.style.width = '1344px'; cv.style.height = '768px';
    focus(cam.fx == null ? 680 : cam.fx, true);
  }
  // Keep the plate covering the screen, centred on x (plate pixels) as far as the edges allow.
  function focus(x, now) {
    cam.fx = x;
    const cv = el.querySelector('.hl-cam'); if (!cv) return;
    const vw = innerWidth, vh = innerHeight, s = cam.s;
    const tx = Math.min(0, Math.max(vw - 1344 * s, vw / 2 - x * s));
    const ty = Math.min(0, (vh - 768 * s) / 2);
    if (now) { cv.style.transition = 'none'; requestAnimationFrame(() => { cv.style.transition = ''; }); }
    cv.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  }
  function hall(o) {
    o = o || {};
    done = o.start || done;
    const nx = nextOpen();
    if (o.wing != null) wing = o.wing; else wing = nx ? wingOf(nx) : 2;
    const W = WINGS[wing], claims = ORDER.slice(wing * 3, wing * 3 + 3);
    el.className = 'on' + (o.morning ? ' morning' : '');
    const lanternX = (nx && wingOf(nx) === wing) ? W.doors[claims.indexOf(nx)] - 150 : 150;
    el.innerHTML = `<div class="hl-cam"><div class="hl-plate" style="background-image:url(${ART}${W.plate}.webp)"></div>
      ${claims.map((c, i) => {
        const x = W.doors[i], open = reachable(c), shut = !open;
        const cls = ['hl-door', c === nx && !o.morning ? 'next' : '', shut ? 'shut' : ''].join(' ');
        return `<button type="button" class="${cls}" data-c="${c}" ${shut || o.morning ? 'disabled' : ''} aria-label="${esc(cap(title(c)))}${st.closed[c] ? ', closed' : shut ? ', locked' : ''}"
          style="left:${x - W.w / 2}px;top:${W.top}px;width:${W.w}px;height:${W.bottom - W.top}px">
          <span class="hl-win"><img src="assets/img/monsters/floor-${DOOR[c].who}.webp" alt=""></span>
          ${st.closed[c] ? '<span class="hl-stamp">CLOSED</span>' : shut ? '<span class="hl-lock">🔒</span>' : ''}</button>
          <div class="hl-plaque" style="left:${x}px;top:${W.top - 92}px"><b>${esc(cap(title(c)))}</b><small>${esc(DOOR[c].aws)}</small></div>`;
      }).join('')}
      <img class="hl-dutch" src="${ART}dutch.webp" alt="" style="left:${wing === 1 ? 1130 : 1150}px;top:${W.floor - 470}px;height:470px">
      <img class="hl-lantern" src="${ART}lantern.webp" alt="" style="left:${lanternX}px;top:${W.floor}px">
      <div class="hl-fade"></div></div>
      <div class="hl-ui"><div class="hl-top"><div class="hl-title">${o.morning ? 'Morning' : 'The Sorting Floor'}<small>${esc(W.name)} · ${ORDER.filter(c => st.closed[c]).length} of ${ORDER.length} claims closed</small></div>
      ${say('dutch', o.line || hallLine(nx, claims))}</div>
      ${wing > 0 ? `<button type="button" class="hl-arrow l" data-w="${wing - 1}">‹<small>${esc(WINGS[wing - 1].name)}</small></button>` : ''}
      ${wing < 2 && !o.morning ? `<button type="button" class="hl-arrow r" data-w="${wing + 1}">›<small>${esc(WINGS[wing + 1].name)}</small></button>` : ''}</div>`;
    layout();
    focus(nx && wingOf(nx) === wing ? W.doors[claims.indexOf(nx)] : 680, true);
    el.querySelectorAll('.hl-door').forEach(b => b.addEventListener('click', () => enter(b.dataset.c)));
    el.querySelectorAll('.hl-arrow').forEach(b => b.addEventListener('click', () => turnWing(+b.dataset.w, o)));
    if (o.morning) ledger();
    const f = el.querySelector('.hl-door.next') || el.querySelector('.hl-door:not(:disabled)') || el.querySelector('.hl-arrow'); if (f && !o.morning) f.focus({ preventScroll: true });
  }
  function hallLine(nx, claims) {
    if (!nx) return 'Every claim\'s closed. Walk any door again if you want the practice.';
    if (!claims.includes(nx)) return `Next claim's ${wingOf(nx) > wing ? 'further on' : 'back that way'}: ${title(nx)}.`;
    if (nx === 'rush') return 'First claim of the night. Pick up the lantern and try the glowing door.';
    return `${cap(title(nx))} is waiting. The plaque says what's behind it.`;
  }
  function turnWing(w, o) {
    const fade = el.querySelector('.hl-fade'); fade.classList.add('on');
    setTimeout(() => hall(Object.assign({}, o, { wing: w, line: null })), 330);
  }
  function enter(c) {
    if (walking) return; walking = true;
    const W = WINGS[wing], i = ORDER.indexOf(c) % 3, x = W.doors[i];
    const lan = el.querySelector('.hl-lantern'), door = el.querySelector(`.hl-door[data-c="${c}"]`);
    focus(x);
    lan.style.left = (x - 40) + 'px';
    setTimeout(() => {
      door.classList.remove('next'); door.classList.add('opening');
      setTimeout(() => {
        el.querySelector('.hl-fade').classList.add('on');
        setTimeout(() => { walking = false; close(); (done || (() => { }))(c); }, 340);
      }, 480);
    }, 820);
  }
  function close() { el.className = ''; el.innerHTML = ''; }
  addEventListener('resize', () => { if (el.classList.contains('on') && el.querySelector('.hl-cam')) layout(); });

  // ---- The debrief: one question, answered with Dutch's rubber stamps ----
  function letterById(id) {
    const L = SD_RUSH.letters;
    for (const c of Object.keys(L)) for (const Lt of (L[c].a || [])) if (Lt.id === id || letterKey(c, Lt) === id) return Object.assign({ _c: c }, Lt);
    return null;
  }
  const letterKey = (c, Lt) => Lt.id || (c + ':' + Lt.q.slice(0, 60));
  function pickQuestion(claim) {
    if (st.missed) { const m = letterById(st.missed); if (m) return Object.assign(m, { twin: true }); }
    const L = SD_RUSH.letters, pool = ((L[claim] || L.rush).a || []).filter(Lt => Lt.opts && Lt.opts.length);
    const fresh = pool.filter(Lt => !st.asked.includes(letterKey(claim, Lt)));
    const from = fresh.length ? fresh : pool;
    return Object.assign({ _c: claim }, from[Math.floor(Math.random() * from.length)]);
  }
  function debrief(info, then) {
    const Q = pickQuestion(info.claim);
    if (!Q || !Q.opts) { then(); return; }
    const key = letterKey(Q._c, Q);
    const order = Q.opts.map((t, i) => ({ t, i })).sort(() => Math.random() - .5);
    el.className = 'on over';
    el.innerHTML = `<div class="hl-scene">
      <img class="hl-dutch" src="${ART}dutch.webp" alt="Dutch">
      <div class="hl-ui"><div class="hl-top"><div class="hl-title">Debrief<small>${esc(cap(title(info.claim)))} · closed</small></div>
      ${say('dutch', Q.twin ? 'This one got away from you last time. Again, properly.' : 'You built it. Now tell me why it worked. Stamp the ticket.')}</div></div>
      <div class="hl-card"><div class="hl-ticket" id="hl-tk"><div class="hl-kind">Claim ticket${Q.twin ? ' · back again' : ''}</div><p>${esc(Q.q)}</p></div></div>
      <div class="hl-stamps">${order.map((o, n) => `<button type="button" class="hl-st" data-i="${o.i}"><kbd>${n + 1}</kbd><img src="${ART}stamp.webp" alt=""><span>${esc(o.t)}</span></button>`).join('')}</div></div>`;
    const tk = el.querySelector('#hl-tk');
    let settled = false;
    function settle(btn) {
      if (settled) return; settled = true;
      const i = +btn.dataset.i, right = i === 0;
      el.querySelectorAll('.hl-st').forEach(b => { b.disabled = true; if (+b.dataset.i === 0) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); else b.classList.add('used'); });
      tk.insertAdjacentHTML('beforeend', `<div class="hl-ink ${right ? 'ok' : 'no'}">${right ? 'APPROVED' : 'RETURNED'}<br><small>${esc(Q.opts[i])}</small></div>`);
      tk.classList.add('flip'); el.querySelector('.hl-scene').classList.add('settled');
      st.asked = st.asked.filter(k => k !== key).concat(key).slice(-40);
      if (right) { if (st.missed === key) st.missed = null; } else st.missed = key;
      if (right) st.ledger[info.claim] = Q.opts[0];
      save();
      el.querySelector('.hl-card').insertAdjacentHTML('beforeend', `<div class="hl-why"><b>${right ? 'Why it worked' : 'The right stamp: ' + esc(Q.opts[0])}</b>${esc(Q.why || '')}</div>`);
      el.querySelector('.hl-scene').insertAdjacentHTML('beforeend', `<button type="button" class="hl-go">${then.label || 'On to the parts cart'}</button>`);
      const say1 = el.querySelector('.hl-say span');
      if (say1) say1.innerHTML = `<b>Dutch:</b> ${esc(right ? 'Good. That\'s the rule you just ran.' : 'Not that one. That ticket comes back to you later.')}`;
      const go = el.querySelector('.hl-go'); go.addEventListener('click', then); go.focus();
    }
    // Drag a stamp onto the ticket, or tap it, or press its number.
    el.querySelectorAll('.hl-st').forEach(b => dragTo(b, tk, () => settle(b)));
    el.onkeydown = e => { const n = +e.key; if (n >= 1 && n <= order.length && !settled) settle(el.querySelectorAll('.hl-st')[n - 1]); };
    const f = el.querySelector('.hl-st'); if (f) f.focus();
  }
  // Pointer drag with a drop target; a tap (no movement) counts as a drop too.
  function dragTo(src, target, onDrop, onHover) {
    src.addEventListener('pointerdown', e => {
      if (src.disabled) return;
      const sx = e.clientX, sy = e.clientY; let moved = false;
      src.setPointerCapture(e.pointerId); src.classList.add('lift');
      const over = (x, y) => { const r = target.getBoundingClientRect(); return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom; };
      const move = ev => {
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        if (Math.abs(dx) + Math.abs(dy) > 6) moved = true;
        src.style.transform = `translate(${dx}px, ${dy}px)`;
        target.classList.toggle('hot', over(ev.clientX, ev.clientY));
      };
      const up = ev => {
        src.removeEventListener('pointermove', move); src.removeEventListener('pointerup', up); src.removeEventListener('pointercancel', up);
        src.classList.remove('lift'); src.style.transform = ''; target.classList.remove('hot');
        if (!moved || over(ev.clientX, ev.clientY)) onDrop();
      };
      src.addEventListener('pointermove', move); src.addEventListener('pointerup', up); src.addEventListener('pointercancel', up);
    });
    src.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDrop(); } });
  }

  // ---- The parts cart ----
  function giftsFor(info) {
    const next = info.next, C = next && R.CLAIMS[next];
    if (!C || !GIFT_CLAIMS.includes(next)) return [];
    const now = (R.CLAIMS[info.claim] && R.CLAIMS[info.claim].belt) || ['rack', 'reserve', 'bin', 'bell'];
    const nb = C.belt || ['rack', 'reserve', 'bin', 'bell'];
    const pre = { rack: C.rackUp, bell: C.bellUp };
    const was = (R.CLAIMS[info.claim] && R.CLAIMS[info.claim].locked) || []; // shown on the belt as "next claim", never used
    return nb.filter(t => CONFIG[t] && now.includes(t) && !was.includes(t) && !pre[t] && !(C.locked || []).includes(t)).sort(() => Math.random() - .5).slice(0, 2);
  }
  function cart(info, then) {
    const two = giftsFor(info), purse = !two.length;
    const items = purse ? ['purse'] : two;
    const img = t => t === 'purse' ? 'assets/img/rush/desk.webp' : SD_RUSH.toolSrc(t);
    el.className = 'on over';
    el.innerHTML = `<div class="hl-scene">
      <img class="hl-dutch" src="${ART}dutch.webp" alt="Dutch">
      <div class="hl-ui"><div class="hl-top"><div class="hl-title">Dutch's parts cart<small>Before ${esc(title(info.next))}</small></div>
      ${say('dutch', purse ? 'Nothing on the cart fits that room. Have a coin for it instead.' : 'Two pieces you\'ve used before. Take one; it\'s set up and waiting when you walk in.')}</div></div>
      <div class="hl-cart"><img src="${ART}cart.webp" alt=""><div class="hl-crates">${items.map(t => `<button type="button" class="hl-crate" data-t="${t}">
        <img class="c" src="${ART}crate.webp" alt="">${t === 'purse' ? '<span><b>A coin</b><small>Into the next claim\'s purse</small></span>' : `<img class="t" src="${img(t)}" alt=""><span><b>${esc(R.TOOLS[t].name)}</b><small>${esc(CONFIG[t].aws)}</small></span>`}</button>`).join('')}</div></div>
      <div class="hl-belt" id="hl-belt">Drag one onto your toolbelt</div></div>`;
    const belt = el.querySelector('#hl-belt');
    let taken = false;
    el.querySelectorAll('.hl-crate').forEach(b => dragTo(b, belt, () => {
      if (taken) return;
      taken = true; // one crate, and one stencil, per cart
      const t = b.dataset.t;
      const finish = () => {
        if (t === 'purse') { SD_RUSH.run.bank = (SD_RUSH.run.bank || 0) + 1; belt.innerHTML = '+1 coin for ' + esc(title(info.next)); }
        else { st.gift = { tool: t, claim: info.next }; save(); belt.innerHTML = `<img src="${img(t)}" alt=""> ${esc(R.TOOLS[t].name)}: placed when you walk in`; }
        el.querySelectorAll('.hl-crate').forEach(x => { x.disabled = true; if (x !== b) x.style.opacity = '.35'; else x.style.visibility = 'hidden'; });
        el.querySelector('.hl-scene').insertAdjacentHTML('beforeend', `<button type="button" class="hl-go">Back to the hall</button>`);
        const go = el.querySelector('.hl-go'); go.addEventListener('click', then); go.focus();
      };
      if (t !== 'purse' && !st.typed[t]) stencil(t, finish); else finish();
    }));
    const f = el.querySelector('.hl-crate'); if (f) f.focus();
  }
  // The first time a piece comes off the cart, you stencil its config onto the crate by typing it.
  function stencil(t, finish) {
    const C = CONFIG[t], line = C.line;
    const box = document.createElement('div');
    box.className = 'hl-sten';
    box.innerHTML = `<h3>Stencil the crate: ${esc(R.TOOLS[t].name)} = ${esc(C.aws)}</h3>
      <p>First time this piece leaves the cellar, it gets its label. Type it out. ${esc(C.note)}</p>
      <label class="hl-guide" id="hl-guide"></label><input id="hl-in" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Type: ${esc(line)}">
      <div class="hl-row"><button type="button" class="hl-ok" disabled>Stencil it on</button><button type="button" class="hl-skip">Skip this time</button><span class="hl-count"></span></div>`;
    el.querySelector('.hl-scene').appendChild(box);
    const inp = box.querySelector('#hl-in'), guide = box.querySelector('#hl-guide'), ok = box.querySelector('.hl-ok'), count = box.querySelector('.hl-count');
    // Spacing is forgiven: runs of spaces count as one; every other character must match.
    const norm = s => s.replace(/\s+/g, ' ');
    function paint() {
      const v = norm(inp.value), L = norm(line);
      let html = '', good = 0;
      for (let i = 0; i < L.length; i++) {
        const ch = esc(L[i]);
        if (i < v.length) { if (v[i] === L[i]) { html += `<i>${ch}</i>`; good++; } else html += `<u>${ch}</u>`; }
        else html += (i === v.length ? '<em></em>' : '') + ch;
      }
      if (v.length >= L.length) html += '<em></em>';
      guide.innerHTML = html;
      const match = v.trim() === L.trim();
      ok.disabled = !match;
      count.textContent = `${Math.min(good, L.length)} of ${L.length}`;
    }
    inp.addEventListener('input', paint);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !ok.disabled) ok.click(); });
    guide.addEventListener('click', () => inp.focus({ preventScroll: true }));
    ok.addEventListener('click', () => { st.typed[t] = true; save(); box.remove(); finish(); });
    box.querySelector('.hl-skip').addEventListener('click', () => { box.remove(); finish(); });
    paint(); setTimeout(() => inp.focus({ preventScroll: true }), 50);
  }

  // ---- Morning: the night ledger ----
  const PIECE = { rush: 'SQS queue in front of a throttled function', bell: 'SNS topic fan-out', double: 'DynamoDB conditional write (idempotency key)', slow: 'Visibility timeout longer than the function timeout', picky: 'SNS subscription filter policy', hot: 'Write sharding across partitions', locked: 'Least-privilege IAM and bucket policies', audit: 'X-Ray traces and CloudWatch alarms', sorter: 'Gradual deployments with automatic rollback' };
  function ledger() {
    const box = document.createElement('div');
    box.className = 'hl-ledger';
    box.innerHTML = `<h3>The night ledger</h3>
      <ol>${ORDER.map(c => `<li>${esc(cap(title(c)))}: ${st.closed[c] ? esc(PIECE[c]) : '<small>not closed</small>'}${st.ledger[c] ? `<br><small>Debrief stamp: ${esc(st.ledger[c])}</small>` : ''}</li>`).join('')}</ol>
      ${say('pip', 'Wait. The rack stopped the bouncing, but the ledger stopped the double payments? Different jobs?')}
      <p style="margin:8px 0 12px;font-weight:700">${'Dutch: Different jobs. A queue absorbs a burst. A conditional write refuses a repeat. Know which one the room needs.'}</p>
      <button type="button" class="hl-go">Start a new night from the Rush</button>`;
    el.querySelector('.hl-ui').appendChild(box);
    const go = box.querySelector('.hl-go'); go.addEventListener('click', () => { close(); morningThen && morningThen(); }); go.focus();
  }
  let morningThen = null;

  // ---- Hooks from js/rush.js ----
  // The start of the page: the hall instead of the first pick.
  // Only a night that started in the hall comes back to it: ?claim=... plays its claims back to back as before.
  let opened = false;
  H.open = start => { opened = true; hall({ start }); };
  // A claim's end card, "next" pressed after a win: debrief, then the parts cart, then the hall (or morning).
  H.won = info => {
    if (!opened) { info.go(); return; }
    st.closed[info.claim] = true; save();
    const back = () => {
      if (!info.next) { morningThen = info.go; hall({ morning: true, wing: 2, line: 'Sun\'s up. Every claim on the floor is closed.' }); return; }
      hall({ line: `${cap(title(info.claim))}: closed. ${cap(title(info.next))} next.`, start: c => c === info.next ? info.go() : SD_RUSH.showPick(c) });
    };
    const toCart = () => info.next ? cart(info, back) : back();
    toCart.label = info.next ? 'On to the parts cart' : 'Back to the hall';
    debrief(info, toCart);
  };
  // After every reset: a piece from the cart starts placed, paid for by Dutch.
  H.afterReset = () => {
    const g = st.gift, M = window.SD_RUSH && SD_RUSH.S;
    if (!g || !M || M.claim !== g.claim) return;
    st.gift = null; save();
    if (M[g.tool]) return;
    M.coins += (R.TOOLS[g.tool] && R.TOOLS[g.tool].cost) || 1;
    SD_RUSH.place(g.tool);
  };
  H.up = () => el.classList.contains("on");
  H.state = st; // for tools/rush_hall_check.js
  H.debugReset = () => { Object.assign(st, { closed: {}, typed: {}, missed: null, gift: null, asked: [], ledger: {} }); save(); };
})();
