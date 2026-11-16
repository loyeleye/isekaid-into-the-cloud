// The Proving Road (Exam Sprint, js/mode-sprint.js): its reserved questions, daemon families and landmarks.
// Reserved Nov 16 for the two timed runs (design v6, "Rules that keep it honest"): each run's 10 questions plus 2
// spares, verified against AWS docs, DVA-C02 only, never the Exam Hall's held-out forms. SD.exam.isHeld (js/exam.js)
// keeps a reserved id out of every other picker until its run is finished, so no other mode, Today's set or twin pick
// serves one first. Picked and audited by hand: domain mix, at most two per family, one contrast pair per run, and
// no item whose own "why not" says a wrong option also works without a qualifier in the stem.
//   decide    the deciding phrase from the stem, shown on the jar card (quoted from the stem; "…" joins two parts)
//   pair      the run's contrast pair, two questions whose answers are often confused; pairLine says each one plainly
window.SD = window.SD || {};
SD.sprintData = {
  runs: {
    r1: {
      name: 'Route 1', date: '2026-11-24', exam: false,
      // Development 3 · Security 3 · Deployment 2 · Troubleshooting 2
      ids: ['dva-1-222', 'dva-1-101', 'dva-1-203', 'dva-2-306', 'dva-2-105', 'dva-2-10', 'dva-3-01', 'dva-3-10', 'dva-4-12', 'dva-4-104'],
      spares: ['dva-1-117', 'dva-3-101'],
      pair: ['dva-4-12', 'dva-4-104'],
      landmarks: ['Lexi\'s gate post', 'Old milestone', 'Windmill', 'Stone bridge', 'Hollow oak', 'Scarecrow', 'Reed pond', 'Fallen-log arch', 'Hilltop shrine', 'Lamp House fence'],
      // zenith, horizon, grass for patches 1 to 10, then Looking back and the Lamp House after dark
      sky: [['#8fcdf5', '#fff1c9', '#8fd07a'], ['#98c8ee', '#ffe8b4', '#8bcb74'], ['#a6c2e2', '#ffdc9a', '#86c46d'], ['#b4bcd5', '#ffcd86', '#82bb66'],
        ['#bfb1c8', '#ffbd77', '#7eb062'], ['#b8a0c2', '#ffab6b', '#78a45d'], ['#a58bbd', '#ff9a61', '#6f9858'], ['#8a72ad', '#f98a5c', '#648b55'],
        ['#705d9d', '#ef7d5a', '#5a7f52'], ['#5b4b8c', '#e5715a', '#52744f'], ['#463d78', '#f39a5b', '#47664a'], ['#262650', '#5b4a7a', '#33463c']]
    },
    r2: {
      name: 'Proctor\'s Pass', date: '2026-11-28', exam: true,
      // Development 3 · Security 2 · Deployment 3 · Troubleshooting 2
      ids: ['dva-1-601', 'dva-1-318', 'dva-1-113', 'dva-2-122', 'dva-2-119', 'dva-3-02', 'dva-3-214', 'dva-3-12', 'dva-4-102', 'dva-4-405'],
      spares: ['dva-3-221', 'dva-4-919'],
      pair: ['dva-2-122', 'dva-2-119'],
      landmarks: ['Pass gate', 'Stone cairn', 'Rope bridge', 'Waterfall', 'Pine stand', 'Split boulder', 'Snowmelt tarn', 'Shepherd\'s hut', 'Summit lookout', 'Lantern hut'],
      // The same value steps in a cooler alpine set: slate zenith, rose alpenglow, blue-green pines.
      sky: [['#9cc4dc', '#f4ecee', '#7fb59c'], ['#9fbfd6', '#f1e1e6', '#7bb098'], ['#a3b8cf', '#efd3dc', '#77a993'], ['#a8b0c6', '#edc5d2', '#72a18d'],
        ['#a7a5bd', '#ebb6c7', '#6d9888'], ['#a197b5', '#e7a7bb', '#678e82'], ['#9187ac', '#e298ae', '#61847b'], ['#7c74a0', '#da89a2', '#5a7973'],
        ['#676390', '#d07c97', '#536f6b'], ['#565580', '#c5708c', '#4c6563'], ['#433f6e', '#dd8c9c', '#455c58'], ['#262650', '#5b4a7a', '#33463c']]
    }
  },
  // The first visit's practice patch (drop 0): a typical Select TWO from outside the reserve.
  practice: 'dva-1-05',
  decide: {
    'dva-1-222': 'single-threaded Scan loop takes 9 hours … plenty of unused read capacity',
    'dva-1-101': 'Each message takes about 2 minutes to process … uses the default settings',
    'dva-1-203': 'failed events must not be retried, and they must be kept for review',
    'dva-2-306': 'new key material right away, without changing the key ID or ARN … without moving the yearly rotation schedule',
    'dva-2-105': 'it should use its own execution role directly',
    'dva-2-10': 'reject every request that isn\'t sent over HTTPS',
    'dva-3-01': '10% of traffic to the new version for 5 minutes, then shift the rest',
    'dva-3-10': 'once the app has started, and fail the deployment if the check fails',
    'dva-4-12': 'who made the change and when',
    'dva-4-104': 'without changing the application … LEAST operational overhead',
    'dva-1-117': 'at most 5 concurrent calls … run in parallel within that limit',
    'dva-3-101': 'zips only app.py',
    'dva-1-601': 'versioning enabled … without a version ID',
    'dva-1-318': 'continue right after the last record it processed, with no gaps and no rereading',
    'dva-1-113': 'Other rules on the bus must not see the events again',
    'dva-2-122': 'browse public images … without signing in … must not embed any access keys',
    'dva-2-119': 'validate each token in the service\'s code before trusting any claim',
    'dva-3-02': 'Each stage must call its matching alias, with the least configuration',
    'dva-3-214': '10% of client traffic for 15 minutes … The environment and its URL must stay the same',
    'dva-3-12': 'gradually over an hour … without redeploying the Lambda functions',
    'dva-4-102': 'Task timed out after 3.00 seconds … sometimes takes 5 seconds',
    'dva-4-405': 'Evictions metric rises steadily, while its CPU use stays low',
    'dva-3-221': 'push a new image to ECR under the same tag',
    'dva-4-919': 'Users who ask for ?category=shoes sometimes get the list of hats'
  },
  pairLine: {
    'dva-4-12': 'CloudTrail: who called which API, and when',
    'dva-4-104': 'CloudWatch: logs, metrics and alarms on how things run',
    'dva-2-122': 'an identity pool: it hands out temporary AWS credentials, to guests too',
    'dva-2-119': 'a user pool: it signs people in and issues the tokens your code checks'
  },
  // 20 families plus Wildcard cover every bank topic (L6: the species comes from the question's concept, never a roll).
  // hue: one per family, for the placeholder art until the PixelLab sprites land.
  families: [
    { id: 'lambda', topics: ['lambda'], name: 'Sparklet', next: 'Invokindle', hue: '#f08a3c', pet: 'Isn\'t there until you reach for it.' },
    { id: 'dynamodb', topics: ['dynamodb', 'dax'], name: 'Partikit', next: 'Indexote', hue: '#4f7bd9', pet: 'Sorts your fingers before letting you pet it.' },
    { id: 'sqs', topics: ['sqs'], name: 'Queuepup', next: 'Fifoguin', hue: '#d9a13a', pet: 'Waits its turn to be petted.' },
    { id: 'sns', topics: ['sns'], name: 'Fanfinch', next: 'Fanfare', hue: '#e0607e', pet: 'Its chirp answers from every bush at once.' },
    { id: 'apigw', topics: ['apigateway', 'appsync'], name: 'Gatecrab', next: 'Throttlecrab', hue: '#c8543f', pet: 'Lets you pet it, but slowly.' },
    { id: 's3', topics: ['s3'], name: 'Bucketoad', next: 'Versiotoad', hue: '#5aa05a', pet: 'Keeps a copy of the pat.' },
    { id: 'iam', topics: ['iam', 'sts', 'verifiedpermissions'], name: 'Policypossum', next: 'Leastpossum', hue: '#8f7f6a', pet: 'Plays dead until you ask properly.' },
    { id: 'kms', topics: ['kms'], name: 'Keyvern', next: 'Envelowyrm', hue: '#2f9e9a', pet: 'Hands you a key, then takes it back.' },
    { id: 'cognito', topics: ['cognito'], name: 'Maskit', next: 'Federelk', hue: '#9b6bd1', pet: 'Asks who you are, then lets you in.' },
    { id: 'cfn', topics: ['cloudformation', 'sam', 'cdk'], name: 'Stackling', next: 'Changesetter', hue: '#b78a4a', pet: 'Topples, then rebuilds itself exactly as it was.' },
    { id: 'cicd', topics: ['codedeploy', 'codepipeline', 'codebuild', 'codeartifact', 'codeguru'], name: 'Canaryling', next: 'Rollbackraven', hue: '#e3c23a', pet: 'Lets one finger in first, then the whole hand.' },
    { id: 'cw', topics: ['cloudwatch', 'cloudtrail', 'observability'], name: 'Watchowl', next: 'Alarmowl', hue: '#6b7fa8', pet: 'Watches you walk past, then draws a little chart of it.' },
    { id: 'xray', topics: ['xray'], name: 'Tracewisp', next: 'Segwraith', hue: '#7fc4c9', pet: 'Leaves a faint trail where your hand went.' },
    { id: 'secrets', topics: ['secrets', 'ssm', 'appconfig'], name: 'Paramouse', next: 'Rototter', hue: '#a3a3b8', pet: 'Swaps its whiskers for new ones while you watch.' },
    { id: 'kinesis', topics: ['kinesis', 'firehose'], name: 'Shardfin', next: 'Reshardfin', hue: '#3f8fc9', pet: 'Splits into two when you pet it, then joins back.' },
    { id: 'sfn', topics: ['stepfunctions'], name: 'Stepcrane', next: 'Choicecrane', hue: '#d77fb0', pet: 'Waits, then steps closer.' },
    { id: 'eb', topics: ['eventbridge'], name: 'Busbee', next: 'Rulebee', hue: '#e8a23a', pet: 'Only comes if the pat matches its rule.' },
    { id: 'ctr', topics: ['ecs', 'ecr', 'eks'], name: 'Tasklet', next: 'Fargator', hue: '#4aa38a', pet: 'Brings its own little box to sit in.' },
    { id: 'bean', topics: ['beanstalk'], name: 'Sproutstalk', next: 'Swapstalk', hue: '#7cbf3f', pet: 'Grows a new leaf and drops the old one.' },
    { id: 'cache', topics: ['elasticache', 'caching', 'cloudfront'], name: 'Cachelot', next: 'Lazelot', hue: '#c96a5a', pet: 'Remembers the last pat and asks for it again.' },
    { id: 'wild', topics: [], name: 'Oddling', next: 'Oddmund', hue: '#8a8a8a', pet: 'Does something different every time.' }
  ]
};
