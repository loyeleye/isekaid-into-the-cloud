// Typed answers: explain a concept in your own words, then check it against a rubric (js/quiz.js, type 'explain').
// S.pickQuestion serves one of these about a third of the time once you've answered the concept right before.
//
// { id, c, type: 'explain', q, points: [{ t, keys, ex }], model, why }
//   q       an open question, the way an interviewer would ask it
//   points  3 to 5 things a strong answer covers; you need 60% of them (2 of 3, 3 of 4 or 5)
//     t     the point, in a few plain words (shown on the rubric)
//     keys  regex fragments; any match counts the point as found. Matched from a word start, case-insensitive,
//           so 'expir' matches expire, expires and expiry. Keep them specific to the point.
//     ex    2 to 4 other ways people say it, casual ones included. A clause of the answer that means about the
//           same (on-device embeddings, js/embed.js) also counts as found.
//   model   a model answer of two to four sentences
//   why     optional: one line on why this matters in the interview
// An example entry; real ones arrive with each chapter's concepts.
SD.explain = [
  { id: 'x-sqs1', c: 'sqs', type: 'explain', q: 'A Lambda function reads orders from an SQS queue, and some orders are processed twice. Explain what the visibility timeout does and how you would fix this.',
    points: [
      { t: 'A received message is hidden, not deleted', keys: ['hidden', 'hides?', 'invisible', 'not deleted', 'still in the queue'], ex: ['the message stays in the queue but nobody else can see it', 'receiving it just hides it for a while'] },
      { t: 'If it is not deleted in time, it is delivered again', keys: ['visible again', 'reappear', 'redeliver', 'delivered again', 'comes back', 'another consumer'], ex: ['after the timeout another consumer gets the same message', 'it shows up in the queue again'] },
      { t: 'Set the timeout longer than processing takes', keys: ['longer than', 'six times', '6 ?x', 'raise the (visibility )?timeout', 'increase the (visibility )?timeout'], ex: ['make the timeout bigger than how long the function runs', 'give it more time than the work needs'] },
      { t: 'Make processing idempotent', keys: ['idempoten', 'dedup', 'process(ed)? once', 'safe to repeat'], ex: ['handling the same order twice should do nothing the second time', 'keep track of which orders are already done'] }
    ],
    model: 'Receiving a message hides it for the visibility timeout; it is only gone once the consumer deletes it. If processing outlasts the timeout, the message becomes visible and is delivered again, so the order runs twice. Set the queue\'s visibility timeout well above the function timeout (AWS suggests six times it for a Lambda trigger), and make processing idempotent, because standard queues can still deliver a message more than once.',
    why: 'Repeat deliveries are normal with standard queues, so the fix is both a setting and a design habit.' }
];
