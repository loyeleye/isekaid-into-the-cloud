// Chapter 4, the Sealed Floors (floors 41 to 60): everything the raid engine (js/raid.js) plays, as data. The concepts
// with their links, the new cards (what the overworld's minigames hand you, and the floors' rewards), the curses of
// these floors and the Plot Devices that lift them, the enemies (their art is in js/c4-art.js), the Field Notes and
// Policy Sorts, the events, and four expeditions:
//   The Gate Passes (Easy, 2 floors)       the Outer Wall (Gatekeeper of Nine Passes), the Hidden Valley (Valley Warden)
//   The Ruins of Burning Peak (Medium, 3)  the Training Yard (Sect Master's Ghost), the Burned Hall (Cross-Mountain
//                                          Envoy), the Master's Room (Jin's Echo)
//   Namgung's House (Hard, 4)              the Outer Court (the Steward), the Hall of Records (the Record Keeper), the
//                                          Study (the Knife Not Used), the Succession Hall (Namgung Hyeon)
//   The Last Letter (Hard, 2)              the reckoning: the High Passes (the Unsent Letter), the Summer House
// One floor per boss the Story Bible names (Ladi, Oct 21). The overworld and story are js/c4-world.js; the Huh??? and
// ELI5 lines js/c4-help.js. AWS facts follow the current AWS documentation (VPC, IAM, STS, KMS, Cognito, S3, ACM,
// GuardDuty, WAF, Shield). Every explanation is written fresh.
(function () {
  const K = SD.vec;
  if (!K || !K.on) return;
  const D = SD.c4data = {};

  // ---------- Concepts ----------
  const C = (name, gist, page) => ({ name, zone: 4, gist, page });
  Object.assign(SD.concepts, {
    sgnacl: C('Security Groups vs Network ACLs', 'A security group sits on each network interface and is stateful: if a request is allowed in, its reply is allowed out, whatever the outbound rules say. It has allow rules only, all checked together. A network ACL sits on a subnet and is stateless: requests and replies are each checked, in and out, so the reply\'s ephemeral ports (1024-65535) must be allowed too. Its rules can allow or deny and are read in number order; the first match wins. Traffic must pass both.', 'A security group remembers you. A network ACL checks you at the door both ways and forgets you between. — Kyu, page 6'),
    subnets: C('Subnets, Route Tables and NAT', 'A subnet lives in one Availability Zone and takes a slice of the VPC\'s CIDR range. It is public when its route table sends 0.0.0.0/0 to an internet gateway; otherwise it is private. Private instances reach out (never in) through a NAT gateway in a public subnet, which is managed and per AZ (a NAT instance is one you run yourself). One NAT gateway is a single point of failure for its AZ, so production puts one in each.', 'The map decides where a cart can go. No road on the map, no road. — Lexi'),
    endpoints: C('VPC Endpoints and PrivateLink', 'A gateway endpoint (Amazon S3 and DynamoDB only, no charge) is a route table target that keeps traffic to those services inside AWS. An interface endpoint (AWS PrivateLink) puts a network interface with a private IP in your subnet for most other services, or for another account\'s endpoint service behind a Network Load Balancer, and is billed by the hour and the gigabyte. Endpoint policies limit what can be reached through them.', 'The back door goes straight to the storehouse, and never leaves the mountain. — Lexi'),
    hybrid: C('Site-to-Site VPN, Client VPN and Direct Connect', 'A Site-to-Site VPN is two encrypted IPsec tunnels over the internet between your network and a virtual private gateway or transit gateway: quick to set up, variable latency. Client VPN lets people\'s laptops connect with TLS, with authorization rules per group. Direct Connect is a dedicated private line with consistent bandwidth and latency, which takes weeks to arrange and isn\'t encrypted by itself; run a VPN over it, or use MACsec, when traffic must be encrypted.', 'Three ways up the mountain: a hidden path (VPN), a lantern for each traveller (Client VPN), and your own road (Direct Connect). — Lexi'),
    iampol: C('IAM Policies, Boundaries and Resource Policies', 'Every request starts implicitly denied. An explicit Deny anywhere wins. Inside one account, an Allow in either the principal\'s identity policy or the resource\'s own policy is enough; across accounts both sides must allow. A permissions boundary and an SCP never grant anything: the action must also fall inside them. Least privilege means naming exactly the actions and resources the job uses; IAM Access Analyzer can generate a policy from the activity CloudTrail recorded.', 'Allowed twice is allowed. Denied once is denied. — Old Gu, scratched into the yard gate'),
    stschain: C('STS, Role Chaining and Cross-Account Access', 'AssumeRole returns temporary credentials (an access key, a secret key and a session token) for 15 minutes up to the role\'s maximum session duration (1 to 12 hours). Using one role\'s session to assume another is role chaining, and that session is capped at one hour. Cross-account access needs the role\'s trust policy to name the other account and the caller\'s own policy to allow sts:AssumeRole; a vendor should be made to pass an external ID.', 'Borrowed robes come off at the hour. — the Burned Hall\'s door'),
    sigv4: C('SigV4 and Presigned URLs', 'Every AWS API request is signed with Signature Version 4: an HMAC of the request made with the caller\'s secret key, scoped to a date, Region and service, with a timestamp, so a request with a clock far off is refused. A presigned URL puts that signature in the query string: anyone holding it can make that one request, as the signer, until it expires, and never longer than the credentials that signed it.', 'A note anyone can carry, until the ink fades. — the Presigned Note'),
    progaccess: C('Programmatic Access Without Long-Term Keys', 'Code should get short-lived credentials from a role: an instance profile, a Lambda execution role, an ECS task role, IAM Roles Anywhere for servers outside AWS, or OIDC federation for a CI pipeline. Long-term access keys in code or images leak and never expire on their own. Session Manager gives a shell controlled by IAM with no open port 22 and no SSH keys to manage; a self-signed certificate is fine for local testing only.', 'A role beats a key in code, because a role forgets you when you leave. — Kyu, page 7'),
    cognito: C('Cognito User Pools, Identity Pools and JWTs', 'A user pool signs people in and issues three JSON Web Tokens: an ID token (who they are), an access token (what scopes they have) and a refresh token (to get new ones). Before trusting one, check its signature against the pool\'s public keys (JWKS), its expiry, its issuer and its audience or client ID. An identity pool swaps a token for temporary AWS credentials from a role. An API Gateway Cognito or JWT authorizer does the checking; a Lambda authorizer runs your own logic.', 'A guild card is only as good as the seal on it, the date on it, and the guild named on it. — Lexi'),
    federation: C('Federation and IAM Identity Center', 'Federation lets people sign in with an identity provider you already have (SAML 2.0, OIDC, a social login, or an Active Directory) instead of creating IAM users. A Cognito user pool can federate an app\'s users; IAM Identity Center gives a workforce one sign-in to many accounts, with permission sets assigned per account and users provisioned from the directory.', 'A stranger vouched for by another house is welcome, if you trust that house. — the Steward'),
    kmsenv: C('KMS Envelope Encryption', 'KMS Encrypt takes at most 4 KB of plaintext, so data is sealed in an envelope: GenerateDataKey returns a data key in plaintext and encrypted under the KMS key; you encrypt the data locally with the plaintext key, throw that copy away and store the encrypted data key beside the data. To read it, send the encrypted data key to Decrypt and use what comes back. The KMS key itself never leaves KMS. An encryption context must match on Decrypt.', 'The letter is sealed with a small key, and the small key is sealed with the big one. — Namgung Ryu'),
    kmskeys: C('Key Policies, Grants, Rotation and Deletion', 'Every KMS key has a key policy, and nobody can use the key unless the key policy allows it, directly or by letting the account\'s IAM policies count. Grants give temporary permission without editing policies. Cross-account use needs the key policy to allow the other account and that account\'s IAM policy to allow the call. Automatic rotation (yearly by default, 90 to 2,560 days) adds new key material but keeps the old, so old ciphertext still decrypts. Deletion waits 7 to 30 days. Customer managed keys let you write the policy, rotate and share; CloudHSM gives single-tenant hardware.', 'Whoever writes the key policy decides who reads. — Seo-yeon'),
    secrets: C('Secrets Manager vs Parameter Store', 'Secrets Manager stores secrets encrypted with KMS, rotates them automatically with a Lambda function (built in for RDS and others), shares them across accounts with a resource policy, and costs per secret. Parameter Store holds configuration as String, StringList or SecureString (KMS-encrypted) parameters, free in the standard tier, with no built-in rotation. Read secrets at runtime, with caching (the Lambda extension, or the client caches), never from the package or plain environment variables.', 'Never keep the key under the mat. — Madam Ok'),
    macie: C('Macie, Data Classification and Masking', 'Amazon Macie scans S3 for sensitive data such as names, card numbers and passport numbers with managed data identifiers, and your own formats with custom data identifiers, and reports findings; automated discovery samples every bucket. Classify data (public, internal, confidential, PII, PHI) and protect it accordingly. Mask sensitive values before they reach logs, for example with CloudWatch Logs data protection policies.', 'Know what is in the books before you lock them. — Madam Ok'),
    sse: C('Encryption at Rest and in Transit', 'At rest in S3: SSE-S3 (S3 manages the keys, the default), SSE-KMS (a KMS key you can control and audit), DSSE-KMS (two layers), SSE-C (you send the key with every request; S3 never stores it), or client-side encryption before upload, so AWS never sees plaintext. In transit: TLS; a bucket policy can deny any request where aws:SecureTransport is false.', 'Sealed in the vault, and sealed on the road. — the Record Keeper'),
    acm: C('ACM and AWS Private CA', 'AWS Certificate Manager issues free public TLS certificates for load balancers, CloudFront and API Gateway, and renews DNS-validated ones automatically while the validation record stays in place. Imported certificates are never renewed by ACM; you reimport them. AWS Private CA issues private certificates for internal services, which ACM can renew. CloudFront needs its certificate in us-east-1.', 'A seal the whole road trusts, renewed before anyone notices. — the Record Keeper'),
    detect: C('GuardDuty, Inspector, Detective and Security Hub', 'GuardDuty watches CloudTrail, VPC flow logs and DNS logs for threats (strange callers, crypto mining, known bad addresses) without agents, and can scan S3 uploads for malware. Inspector finds software vulnerabilities in EC2, container images and Lambda functions. Detective helps investigate a finding by graphing related activity over time. Security Hub gathers every finding in one place and checks accounts against standards.', 'One watches, one checks the walls, one asks what happened, one keeps the ledger. — the Watcher in the Rafters'),
    edge: C('WAF, Shield, Network Firewall and Firewall Manager', 'AWS WAF filters HTTP requests to CloudFront, load balancers and API Gateway with rules: managed rule groups against SQL injection and cross-site scripting, and rate-based rules against floods. Shield Standard protects every account from common network DDoS for free; Shield Advanced adds response experts, attack visibility and cost protection. AWS Network Firewall filters VPC traffic (domains, stateful IPS). Firewall Manager applies these rules across every account in an organization.', 'His guards: one reads every letter at the door, one holds the gate against the crowd. — Ryu')
  });
  SD.links.push(
    { id: 'sgnacl-subnets', a: 'sgnacl', b: 'subnets', text: 'A network ACL guards a whole subnet; a security group guards one network interface in it.' },
    { id: 'subnets-endpoints', a: 'subnets', b: 'endpoints', text: 'A gateway endpoint is just another target in a private subnet\'s route table, so S3 traffic stops going through the NAT.' },
    { id: 'endpoints-hybrid', a: 'endpoints', b: 'hybrid', text: 'From your own data center, over a VPN or Direct Connect, an interface endpoint is how you reach a service privately.' },
    { id: 'iampol-stschain', a: 'iampol', b: 'stschain', text: 'A role\'s trust policy says who may become it; its permissions policy says what they may then do.' },
    { id: 'stschain-sigv4', a: 'stschain', b: 'sigv4', text: 'A presigned URL dies with the temporary credentials that signed it.' },
    { id: 'sigv4-progaccess', a: 'sigv4', b: 'progaccess', text: 'The SDK signs every request with SigV4 using the first credentials the chain finds, so let it find a role.' },
    { id: 'cognito-federation', a: 'cognito', b: 'federation', text: 'A user pool can federate another house\'s directory, and still hand out its own tokens.' },
    { id: 'kmsenv-kmskeys', a: 'kmsenv', b: 'kmskeys', text: 'To read an envelope you need kms:Decrypt on its data key, and only the key policy can give you that.' },
    { id: 'kmskeys-secrets', a: 'kmskeys', b: 'secrets', text: 'A secret shared with another account must be encrypted with a customer managed key whose policy lets that account decrypt.' },
    { id: 'secrets-macie', a: 'secrets', b: 'macie', text: 'Macie finds the secrets and PII that ended up in buckets; Secrets Manager is where the secrets should have gone.' },
    { id: 'sse-kmskeys', a: 'sse', b: 'kmskeys', text: 'SSE-KMS with a customer managed key means the key policy decides who can read the object, not just the bucket policy.' },
    { id: 'sse-acm', a: 'sse', b: 'acm', text: 'Encryption in transit is TLS, and TLS needs a certificate: ACM issues and renews them.' },
    { id: 'detect-edge', a: 'detect', b: 'edge', text: 'GuardDuty notices the strange caller; WAF and Network Firewall are what stop it at the gate.' },
    { id: 'kmskeys-cloudtrail', a: 'kmskeys', b: 'cloudtrail', text: 'Every Decrypt with a KMS key is a management event in CloudTrail, recorded by default: who, which key and when.' },
    { id: 'iampol-iam', a: 'iampol', b: 'iam', text: 'The same evaluation as the temple\'s: explicit deny, then allow, then the implicit deny.' }
  );

  // ---------- Cards ----------
  // ch: 4 keeps them in this chapter's rewards. What the overworld teaches turns up in your deck (js/c4-world.js).
  const card = (name, cost, o) => Object.assign({ name, cost, kind: 'action', ch: 4, rarity: 'common', tags: [] }, o);
  Object.assign(SD.cards, {
    'k4-sgrule':    card('Stateful Rule', 1, { pow: 8, tags: ['sg'], art: 'gate', concept: 'sgnacl', text: 'Allow it in once in the security group, and its reply goes out by itself. A security group remembers.' }),
    'k4-bothways':  card('Both Ways', 1, { pow: 7, abs: { any: 3 }, tags: ['nacl'], art: 'gate', concept: 'sgnacl', text: 'Absorb {any}. A network ACL rule for the request and another for the reply: it checks both directions.' }),
    'k4-ephemeral': card('Open the Ephemeral Range', 1, { pow: 9, tags: ['ephemeral', 'nacl'], art: 'open', rarity: 'uncommon', concept: 'sgnacl', text: 'Allow outbound TCP 1024-65535 in the network ACL, so replies can get back to the client.' }),
    'k4-ruleorder': card('Lowest Number First', 1, { pow: 7, draw: 1, tags: ['order', 'nacl'], art: 'note', concept: 'sgnacl', text: 'Draw 1. Network ACL rules are read from the lowest number, and the first match decides.' }),
    'k4-route':     card('Write the Route', 1, { pow: 8, tags: ['route'], art: 'trace', concept: 'subnets', text: 'A route table entry: 0.0.0.0/0 to the internet gateway for a public subnet, to a NAT for a private one.' }),
    'k4-natgw':     card('NAT Gateway', 2, { kind: 'infra', each: { any: 3 }, pow: 6, tags: ['nat'], art: 'globe', concept: 'subnets', text: 'Infra. Each turn absorb 3 load. Private instances go out; nothing comes in.' }),
    'k4-natperaz':  card('One NAT per AZ', 2, { pow: 11, mit: 3, tags: ['nat', 'multiaz'], art: 'globe', rarity: 'uncommon', concept: 'subnets', text: 'Mitigate {mit}. A NAT gateway in every Availability Zone, so one dark zone takes nothing else with it.' }),
    'k4-gwend':     card('Gateway Endpoint', 1, { pow: 9, tags: ['endpoint'], art: 'key', concept: 'endpoints', text: 'S3 and DynamoDB through a route table target, off the internet and with no NAT charge.' }),
    'k4-privlink':  card('Interface Endpoint', 2, { pow: 12, tags: ['endpoint', 'privatelink'], art: 'key', rarity: 'uncommon', concept: 'endpoints', text: 'A private IP for the service in your own subnet: AWS PrivateLink.' }),
    'k4-vpn':       card('Site-to-Site VPN', 1, { pow: 7, abs: { any: 4 }, tags: ['vpn'], art: 'lock', concept: 'hybrid', text: 'Absorb {any}. Two IPsec tunnels over the internet, up in an afternoon.' }),
    'k4-scoped':    card('Scope It Down', 1, { pow: 9, tags: ['leastpriv'], art: 'eraser', concept: 'iampol', text: 'Name the actions and the resources the job uses. Nothing else.' }),
    'k4-respol':    card('Resource Policy', 1, { pow: 8, tags: ['resource'], art: 'lock', concept: 'iampol', text: 'The resource\'s own policy says who may touch it. Across accounts, both sides must say yes.' }),
    'k4-capped':    card('Inside the Boundary', 1, { pow: 8, tags: ['boundary'], art: 'gate', concept: 'iampol', text: 'Ask only for what the permissions boundary allows. It never grants; it only caps.' }),
    'k4-fresh':     card('Fresh Session', 1, { pow: 9, tags: ['fresh', 'assume'], art: 'undo', concept: 'stschain', text: 'AssumeRole again for new temporary credentials, before the old ones expire.' }),
    'k4-extid':     card('External ID', 2, { pow: 12, tags: ['externalid', 'trust'], art: 'lock', rarity: 'uncommon', concept: 'stschain', text: 'The trust policy requires sts:ExternalId, so only the right deputy gets in.' }),
    'k4-sign':      card('Sign It (SigV4)', 1, { pow: 8, tags: ['sigv4'], art: 'note', concept: 'sigv4', text: 'An HMAC of the request with your secret key, scoped to the day, Region and service.' }),
    'k4-presign':   card('Presigned Note', 0, { pow: 6, exhaust: true, tags: ['presign'], art: 'note', rarity: 'uncommon', concept: 'sigv4', text: 'Exhaust. A URL anyone can carry for one request, until it expires.' }),
    'k4-rolekey':   card('A Role, Not a Key', 1, { pow: 9, tags: ['role', 'chain'], art: 'key', concept: 'progaccess', text: 'Take the access key out of the code and let the SDK find the role\'s short-lived credentials.' }),
    'k4-session':   card('Session Manager', 1, { mit: 6, reveal: true, tags: ['ssm'], art: 'eye', concept: 'progaccess', text: 'Mitigate {mit} and reveal weaknesses. A shell through IAM: no port 22, no keys under the stone.' }),
    'k4-verify':    card('Check the Token', 1, { pow: 9, tags: ['jwt'], art: 'eye', concept: 'cognito', text: 'Signature against the JWKS, then expiry, issuer and audience. In that order, every time.' }),
    'k4-refresh':   card('Refresh Token', 1, { pow: 6, draw: 1, tags: ['jwt', 'fresh'], art: 'undo', concept: 'cognito', text: 'Draw 1. New ID and access tokens, without asking for the password again.' }),
    'k4-federate':  card('Trust the Other House', 2, { pow: 12, tags: ['federate'], art: 'globe', rarity: 'uncommon', concept: 'federation', text: 'Federate their directory through SAML or OIDC, and hand out your own tokens.' }),
    'k4-envelope':  card('Envelope Seal', 1, { pow: 9, tags: ['envelope'], art: 'lock', concept: 'kmsenv', text: 'GenerateDataKey: seal the data with the data key, and the data key with the KMS key.' }),
    'k4-keypol':    card('Write the Key Policy', 1, { pow: 9, tags: ['keypolicy', 'cmk'], art: 'key', rarity: 'uncommon', concept: 'kmskeys', text: 'A customer managed key: you write who may use it, and who may manage it.' }),
    'k4-rotate':    card('Automatic Rotation', 2, { kind: 'infra', each: { any: 2 }, pow: 7, tags: ['rotate'], art: 'clock', concept: 'kmskeys', text: 'Infra. Each turn absorb 2 load. New key material every year; the old stays, to read what it sealed.' }),
    'k4-grant':     card('A Grant for Tonight', 0, { pow: 7, exhaust: true, tags: ['grant', 'cmk'], art: 'key', concept: 'kmskeys', text: 'Exhaust. CreateGrant for one job, then retire it. No policy edited.' }),
    'k4-vault':     card('Secrets Manager', 1, { pow: 8, tags: ['secret'], art: 'lock', concept: 'secrets', text: 'Read the password at runtime, rotated on schedule, never baked into the package.' }),
    'k4-macie':     card('Macie Scan', 1, { mit: 5, reveal: true, tags: ['macie'], art: 'eye', concept: 'macie', text: 'Mitigate {mit} and reveal weaknesses. Every page of PII, found and labelled.' }),
    'k4-ssekms':    card('SSE-KMS', 1, { pow: 9, tags: ['sse', 'cmk'], art: 'lock', concept: 'sse', text: 'S3 encrypts it at rest under a KMS key whose policy and logs you control.' }),
    'k4-tls':       card('Deny Without TLS', 1, { pow: 8, tags: ['tls'], art: 'globe', concept: 'sse', text: 'A bucket policy that denies any request where aws:SecureTransport is false.' }),
    'k4-acm':       card('ACM Certificate', 1, { pow: 7, abs: { any: 3 }, tags: ['tls', 'acm'], art: 'note', concept: 'acm', text: 'Absorb {any}. Issued free, renewed by itself while its DNS record stays.' }),
    'k4-guardduty': card('GuardDuty', 2, { kind: 'infra', each: { any: 2 }, pow: 7, tags: ['detect'], art: 'eye', rarity: 'uncommon', concept: 'detect', text: 'Infra. Each turn absorb 2 load. Watches the trails and the logs for strange callers, with no agents.' }),
    'k4-waf':       card('WAF Rule', 1, { pow: 9, tags: ['waf'], art: 'gate', concept: 'edge', text: 'Managed rules against injected SQL and scripts, and a rate-based rule against floods.' }),
    'k4-shield':    card('Shield Advanced', 2, { mit: 8, abs: { any: 6 }, tags: ['shield'], art: 'gate', rarity: 'uncommon', concept: 'edge', text: 'Mitigate {mit}, absorb {any}. DDoS experts on call, and the bill protected.' }),
    // The Plot Devices and the boon (quests, js/c4-world.js), and Seo-yeon's upgrade.
    'k4-ryuseal':   card('Ryu\'s Seal', 0, { pow: 8, draw: 1, tags: ['envelope', 'keypolicy'], art: 'lock', rarity: 'rare', quest: true, concept: 'kmsenv', text: 'Draw 1. Sealed Hands is lifted. "Someone in that house remembers him."' }),
    'k4-abacus':    card('Ok\'s Abacus', 1, { mit: 6, abs: { any: 6 }, tags: ['secret', 'rotate'], art: 'box', rarity: 'rare', quest: true, concept: 'secrets', text: 'Mitigate {mit}, absorb {any}. Leaked Keys is lifted. "Count the keys, child. Then count them again."' }),
    'k4-index':     card('Lexi\'s Forbidden Index', 0, { reveal: true, draw: 2, exhaust: true, tags: [], art: 'eye', rarity: 'rare', quest: true, concept: 'cognito', text: 'Exhaust. Read the enemy\'s whole policy: reveal every weakness, and draw 2.' }),
    'k4-ownkey':    card('My Own Key', 1, { pow: 13, mit: 4, tags: ['envelope', 'cmk', 'keypolicy'], art: 'key', rarity: 'rare', quest: true, champ: 'seoyeon', concept: 'kmskeys', text: 'Mitigate {mit}. A customer managed key with her own name on the policy. What she seals, she seals for all of you.' }),
    'k4-lastletter': card('The Last Letter', 1, { pow: 14, mit: 6, draw: 1, tags: ['envelope', 'cmk', 'fresh'], art: 'note', rarity: 'rare', quest: true, champ: 'seoyeon', concept: 'kmskeys', text: 'Mitigate {mit}, draw 1. Read aloud, in his own words.' })
  });
  // The curses of these floors (the Story Bible): each turn one card in every hand is sealed until someone unseals
  // it, and enemies steal from an Exposed player. Here each is a card that costs the team while it sits in a hand,
  // and it comes back every fight until its Plot Device lifts it.
  const curse = (name, cost, held, text) => ({ name, cost, kind: 'action', exhaust: true, rarity: 'basic', quest: true, curse: true, tags: [], art: 'lock', held, text, ch: 4 });
  SD.cards['k4-sealed'] = curse('Sealed Hand', 1, { stale: 2 }, 'A seal on your hand. Unseal it for 1 Capacity (exhaust). Each end of turn it\'s still sealed, +2 Stale. Ryu\'s Seal lifts it.');
  SD.cards['k4-leaked'] = curse('Leaked Key', 1, { sla: 3, then: 3 }, 'An access key left in the open. Rotate it for 1 Capacity (exhaust). Each end of turn it\'s still in your hand, the team loses 3 SLA. Ok\'s Abacus lifts it.');
  D.CARDS = { gates: ['k4-sgrule', 'k4-bothways', 'k4-ephemeral', 'k4-ruleorder', 'k4-route', 'k4-natgw', 'k4-natperaz', 'k4-gwend', 'k4-privlink', 'k4-vpn'],
    ruins: ['k4-scoped', 'k4-respol', 'k4-capped', 'k4-fresh', 'k4-extid', 'k4-sign', 'k4-presign', 'k4-rolekey', 'k4-session'],
    house: ['k4-verify', 'k4-refresh', 'k4-federate', 'k4-envelope', 'k4-keypol', 'k4-rotate', 'k4-grant', 'k4-vault', 'k4-macie', 'k4-ssekms', 'k4-tls', 'k4-acm', 'k4-guardduty', 'k4-waf', 'k4-shield'] };

  // ---------- Enemies ----------
  // F(id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more)
  const P = (...s) => s.map(x => (typeof x === 'number' ? { t: 'read', n: x } : x));
  const r = n => ({ t: 'read', n }), w = n => ({ t: 'write', n }), b = n => ({ t: 'burst', n }), up = (u) => (u ? { t: 'escalate', up: u } : { t: 'escalate' });
  const E = {};
  const F = (id, name, short, cause, sev, concept, tier, flavor, symptom, weak, resist, pattern, more) => {
    E[id] = Object.assign({ name, short, cause, sev, concept, tier, sprite: 'k4-' + id, flavor, symptom, weak, resist, pattern, ch: 4, raid: true }, tier === 2 ? { elite: true } : tier === 3 ? { boss: true } : {}, more);
  };
  // Floor 1, the Outer Wall
  F('stateless', 'The Stateless Guard', 'Stateless Guard', 'A network ACL checks the request and the reply, and remembers neither', 28, 'sgnacl', 1, 'He checks you on the way in. He checks you on the way out. He has never seen you before.',
    'The ACL allows TCP 443 in. The replies go out from the server on the client\'s ephemeral port, and no outbound rule allows it.',
    { nacl: 'A network ACL is stateless: write a rule for the reply\'s direction too.', ephemeral: 'Replies go to the client\'s ephemeral port. Allow 1024-65535 outbound.' },
    { sg: 'The security group already let it through. The ACL is the one that forgot.' }, [r(6), w(6), b(7)]);
  F('ephemeral', 'The Ephemeral Gate', 'Ephemeral Gate', 'The reply leaves on a high port the ACL blocks', 26, 'sgnacl', 1, 'It lets you in. It just won\'t let you answer.',
    'Clients connect fine, then wait forever: the server\'s replies to ports 49152-65535 are dropped at the subnet.',
    { ephemeral: 'Open the ephemeral range outbound, 1024-65535, and the answers get home.', nacl: 'The subnet\'s ACL needs the reply rule as well as the request rule.' },
    { allow: 'An IAM Allow has nothing to do with packets.' }, [r(6), r(7), b(7)]);
  F('stateful', 'The Stateful Sentry', 'Stateful Sentry', 'A security group with no inbound rule for the port', 28, 'sgnacl', 1, 'He remembers everyone he has let in. He hasn\'t let you in.',
    'The instance\'s security group has no inbound rule for TCP 443. Its outbound rules are wide open, which doesn\'t help.',
    { sg: 'Add an inbound rule; the reply is allowed out automatically, because a security group is stateful.' },
    { ephemeral: 'A security group needs no reply rule. It remembers.', nacl: 'The subnet\'s ACL already allows it. The sentry is the one saying no.' }, [w(6), r(7), up()]);
  F('rule100', 'Rule 100', 'Rule 100', 'An ACL\'s rules are read in number order, and a deny comes first', 46, 'sgnacl', 2, 'He was here first. Literally.',
    'Rule 100 denies 10.0.0.0/16. Rule 200 allows the one address you need from it. Rule 200 never gets a turn.',
    { order: 'Lowest number first: renumber the allow below 100, or narrow the deny.', nacl: 'Network ACL rules can deny. Read them in order.' },
    { sg: 'A security group has no deny rules to reorder.' }, [r(9), w(10), up(), b(11)]);
  F('gatekeeper', 'The Gatekeeper of Nine Passes', 'Gatekeeper', 'A security group and an ACL disagree about the reply', 80, 'sgnacl', 3, 'Two wards on one gate. A hit allowed in but not out comes back on you.',
    'The security group allows the request, so its reply is fine there. The subnet\'s ACL allows it in, and blocks it on the way out.',
    { ephemeral: 'The ACL needs the outbound ephemeral range for the reply.', nacl: 'Both directions, in the ACL. The security group was never the problem.', order: 'Check the ACL rules in order: the deny before your allow wins.' },
    { sg: 'The security group already remembers the reply. The ACL doesn\'t.', allow: 'IAM can\'t open a network gate.' }, [r(10), w(11), b(13), up(3), w(12)]);
  // Floor 2, the Hidden Valley
  F('noroute', 'No Route Home', 'No Route', 'A subnet whose route table goes nowhere', 28, 'subnets', 1, 'A village with no roads out. It has stopped expecting visitors.',
    'The instances have public IPs, but the subnet\'s route table has only the local route. Nothing in, nothing out.',
    { route: 'A route to the internet gateway makes the subnet public; a route to a NAT lets a private one reach out.' },
    { sg: 'The security group isn\'t the problem. There\'s no road for the packets at all.' }, [r(6), w(7), b(7)]);
  F('tollroad', 'The Toll Road', 'Toll Road', 'All S3 traffic pays NAT processing charges', 28, 'endpoints', 1, 'Every cart, every crossing, every gigabyte. Pay up.',
    'Private instances copy terabytes to S3 in the same Region through a NAT gateway, and the processing bill keeps growing.',
    { endpoint: 'A gateway endpoint for S3: a route table target, off the internet, with no NAT charge.' },
    { nat: 'Another NAT gateway is another toll booth.' }, [w(6), w(7), up()]);
  F('backdoor', 'The Back Door', 'Back Door', 'A gateway endpoint with no endpoint policy reaches every bucket', 26, 'endpoints', 1, 'It goes straight to the storehouse. Anyone\'s storehouse.',
    'The endpoint lets private instances reach S3 without the internet, and also lets them copy data to buckets in other accounts.',
    { endpoint: 'An endpoint policy that allows only the company\'s buckets closes the back door.', resource: 'And a bucket policy can insist on aws:SourceVpce.' },
    { route: 'The route is fine. It\'s what the route reaches.' }, [r(7), b(7), r(6)]);
  F('singlenat', 'The Single NAT', 'Single NAT', 'One NAT gateway in one AZ serves every private subnet', 48, 'subnets', 2, 'When its zone goes dark, so does everyone downhill.',
    'One NAT gateway in AZ A carries the outbound traffic of all three AZs. AZ A has an outage.',
    { multiaz: 'One NAT gateway per AZ, and each private subnet routes to its own.', nat: 'A NAT gateway is zonal: build one where each subnet lives.' },
    { route: 'Pointing every route at the same NAT is the problem.' }, [w(9), r(10), up(), b(11)]);
  F('warden', 'The Valley Warden', 'Valley Warden', 'Keeps the private villages private, and strikes only from the public subnet', 82, 'subnets', 3, 'He guards the valley\'s inner villages. He attacks only from the public road.',
    'Private instances must reach S3, Secrets Manager and the internet for updates, with nothing able to reach them from outside.',
    { nat: 'A NAT gateway in the public subnet: out, never in.', endpoint: 'Endpoints for S3 and Secrets Manager keep those calls inside.', privatelink: 'An interface endpoint gives Secrets Manager a private address in your subnet.', vpn: 'From the data center, a VPN or Direct Connect brings you in privately.' },
    { sg: 'Opening the security group to the world makes the village public.' }, [r(11), w(12), b(13), up(3), r(13)]);
  // Floor 3, the Training Yard
  F('wildcard', 'The Wildcard', 'Wildcard', 'A policy that allows everything', 30, 'iampol', 1, 'It fits every lock in the yard.',
    'A training script\'s role has "Action": "*", "Resource": "*". It just deleted the sparring records.',
    { leastpriv: 'Name exactly what the job calls, on exactly what it touches.' },
    { allow: 'More Allow on top of * changes nothing.', admin: 'That\'s the Wildcard\'s own policy.' }, [w(7), r(7), up(), w(8)], { denies: ['adminaccess'] });
  F('boundary', 'The Boundary', 'Boundary', 'His policy allows it; his permissions boundary doesn\'t', 30, 'iampol', 1, 'He could do anything. He can\'t do that.',
    'The role\'s policy allows s3:* and dynamodb:*. Its permissions boundary allows only s3:GetObject. The DynamoDB write fails.',
    { boundary: 'What he can do is the overlap. Ask for what the boundary allows, or change the boundary.' },
    { allow: 'Another Allow is still capped by the boundary.' }, [r(7), w(7), b(8)]);
  F('gatepol', 'The Gate\'s Own Policy', 'Gate\'s Policy', 'A resource policy that lets a stranger in', 28, 'iampol', 1, 'The gate decided you were welcome. Nobody asked the yard.',
    'A bucket policy allows "Principal": "*" to read the yard\'s scrolls. No identity policy was ever needed.',
    { resource: 'Fix the resource\'s own policy: name the principals it should allow, nobody else.', leastpriv: 'A resource policy needs least privilege too.' },
    { boundary: 'A boundary caps identities in your account. It doesn\'t touch a stranger let in by the resource.' }, [r(7), r(7), b(8)]);
  F('inline', 'The Inline Elder', 'Inline Elder', 'An inline policy nobody reviews, stuck to one user', 48, 'iampol', 2, 'He\'s been here longer than the yard. Nobody remembers writing him.',
    'An old IAM user has an inline policy granting iam:PassRole on every role. It doesn\'t show up in the managed policy reviews.',
    { leastpriv: 'Replace it with a managed policy scoped to the roles it needs.', boundary: 'A boundary caps whatever he says he can pass.' },
    { allow: 'He has plenty of Allow already.' }, [w(9), r(10), up(), b(11)], { denies: ['adminaccess'] });
  F('ghost', 'The Sect Master\'s Ghost', 'Sect Master', 'Every move must be allowed twice: by the player\'s policy and by the resource\'s', 84, 'iampol', 3, 'He taught the old rules. He still marks your form.',
    'Across accounts, a role\'s identity policy allows reading the yard\'s bucket, but the bucket policy names nobody from outside. AccessDenied.',
    { resource: 'Across accounts, the resource\'s policy has to say yes as well.', leastpriv: 'Both policies, scoped to exactly the move.', boundary: 'And inside the boundary, or it\'s still no.' },
    { allow: 'Your side said yes. His side didn\'t.', admin: 'AdministratorAccess in your account means nothing in his.' }, [r(11), w(12), b(13), up(3), w(13)], { denies: ['adminaccess'] });
  // Floor 4, the Burned Hall
  F('tempcreds', 'Temporary Credentials', 'Temp Creds', 'A session that expires mid-job', 30, 'stschain', 1, 'It hits hard, and then it doesn\'t. Two turns, and it\'s gone, unless refreshed.',
    'A job assumed a role with the default one-hour session and runs for three. At the hour it fails with ExpiredToken.',
    { fresh: 'Assume the role again before the credentials expire, or ask for a longer DurationSeconds.', assume: 'Short-lived credentials are the point. Refresh them.' },
    { allow: 'An expired token isn\'t a permissions problem.' }, [w(7), r(8), b(8)]);
  F('chained', 'The Chained Role', 'Chained Role', 'Role chaining caps the session at one hour', 30, 'stschain', 1, 'He holds a robe borrowed from a robe. It comes off at the hour.',
    'RoleA\'s session assumes RoleB with DurationSeconds 7200. The call fails: chained sessions last one hour at most.',
    { fresh: 'Refresh within the hour, or assume RoleB directly from long-lived identity.', assume: 'Ask for 3600 seconds or less when you chain.' },
    { boundary: 'The boundary isn\'t what\'s capping him. The chain is.' }, [r(7), w(7), up()]);
  F('stranger', 'The External Stranger', 'Stranger', 'A vendor\'s cross-account role with no external ID', 30, 'stschain', 1, 'He has keys to every sect. He does whatever the last one asked.',
    'A vendor assumes roles in its customers\' accounts. Any customer can hand it your role\'s ARN.',
    { externalid: 'Require sts:ExternalId in the trust policy: he gets in only with your ID.', trust: 'The trust policy decides who, and on what condition.' },
    { assume: 'He can already assume it. That\'s the trouble.' }, [r(8), b(8), r(7)]);
  F('unsigned', 'The Unsigned', 'Unsigned', 'A request with no signature, or a signature from a skewed clock', 48, 'sigv4', 2, 'It has no name and no time. The hall refuses it.',
    'A service builds its own requests to an IAM-authorized API. They fail with 403: missing authentication token, then signature expired.',
    { sigv4: 'Sign with SigV4, with credentials from the role and a clock in sync.', role: 'Let the SDK sign it with the role\'s credentials.' },
    { allow: 'An unsigned request has no principal for an Allow to match.' }, [w(9), r(10), up(), b(11)]);
  F('envoy', 'The Cross-Mountain Envoy', 'Envoy', 'Acts in another sect\'s account through an assumed role', 84, 'stschain', 3, 'He crosses into another sect\'s account and wears its robes there.',
    'A role in account B must write to a bucket in account A. It assumes a role in A whose trust policy names B, with an external ID, and an hour\'s session.',
    { trust: 'The role in A trusts account B, and B\'s policy allows sts:AssumeRole on it.', externalid: 'An external ID stops anyone else sending him.', fresh: 'Short sessions, refreshed: a stolen one dies soon.', presign: 'For one object, a presigned URL is a lighter envoy.' },
    { allow: 'B\'s own Allow doesn\'t reach into A.', admin: 'Your AdministratorAccess stops at your border.' }, [r(11), w(12), b(13), up(3), w(13)], { denies: ['adminaccess'] });
  // Floor 5, the Master's Room
  F('longkey', 'The Long-Lived Key', 'Long-Lived Key', 'An access key baked into old code', 50, 'progaccess', 2, 'Written into a script in 2019. It has never expired. It never will.',
    'An image contains ~/.aws/credentials with an IAM user\'s keys. The SDK finds them before the task role.',
    { role: 'Delete the key, and let the SDK find the role\'s short-lived credentials.', chain: 'The chain takes the first keys it finds: leave none lying about.', fresh: 'Temporary credentials expire. That\'s what you want.' },
    { allow: 'The key already has every Allow it needs.' }, [w(10), r(10), up(), b(12)]);
  F('jinecho', 'Jin\'s Echo', 'Jin\'s Echo', 'The redeploy\'s copy of Jin: his style and his lines, without him', 88, 'progaccess', 3, 'It says his lines out of order, like a log replayed without its timestamps.',
    'It fights in Burning Peak style. Its guard rejects anything stale: only cards played under a fresh assumed role land.',
    { fresh: 'A fresh session, just assumed: it lands.', assume: 'Assume the role again. Only new credentials get through his guard.', role: 'A role, never a key: his guard knows the difference.' },
    { chain: 'Old keys found first in the chain are exactly what his guard rejects.', allow: 'Allow means nothing to an echo.' }, [r(12), w(12), b(14), up(3), w(14)]);
  // Floor 6, the Outer Court
  F('forged', 'The Forged Token', 'Forged Token', 'A JWT that looks valid, with a bad signature', 32, 'cognito', 1, 'Every claim is perfect. The seal is wrong.',
    'A service trusts the claims in a token without checking its signature. Someone edited the groups claim and signed it with their own key.',
    { jwt: 'Verify the signature with the user pool\'s public key (the kid in the JWKS) before reading any claim.' },
    { fresh: 'Refreshing a forged token gets you nothing.' }, [r(8), w(8), b(9)]);
  F('expired', 'The Expired Pass', 'Expired Pass', 'A token past its exp time, still accepted', 30, 'cognito', 1, 'It was good an hour ago. It\'s still here.',
    'The backend checks the token\'s signature but not exp. Tokens from users who left yesterday still work.',
    { jwt: 'Check exp every time. Then refresh, if you\'re the one it belongs to.', fresh: 'The real owner swaps a refresh token for a new one.' },
    { federate: 'Which house issued it doesn\'t matter. It\'s expired.' }, [w(8), r(8), up()]);
  F('wrongaud', 'The Wrong Audience', 'Wrong Audience', 'A token issued for some other app', 30, 'cognito', 1, 'A real token. For a different house.',
    'An access token from the same user pool, but its client_id is another app\'s. The API accepts it.',
    { jwt: 'Check aud (ID tokens) or client_id (access tokens) and token_use, as well as iss.' },
    { sigv4: 'It isn\'t an AWS request to sign. It\'s a token to check.' }, [r(8), b(8), r(8)]);
  F('fedstranger', 'The Federated Stranger', 'Federated Stranger', 'Signed in through another house\'s directory, and never mapped', 50, 'federation', 2, 'Another house vouches for him. Nobody here said what he may do.',
    'Users sign in through a SAML identity provider, but their department attribute isn\'t mapped, so every one of them gets the default role.',
    { federate: 'Map the IdP\'s attributes to the user pool\'s, and assign roles or permission sets from them.', jwt: 'Then check the claims you mapped.' },
    { allow: 'An Allow for everyone is how he got in.' }, [w(10), r(10), up(), b(12)]);
  F('steward', 'The Steward', 'Steward', 'The house\'s sign-in: every token checked, every stranger mapped', 86, 'cognito', 3, 'He keeps the door of Namgung\'s house, and he has never once been rude.',
    'Every visitor shows a token. Some are forged, some expired, some meant for another house, some from another directory.',
    { jwt: 'Signature, expiry, issuer, audience: he respects all four.', federate: 'A trusted directory, mapped properly.', fresh: 'A refresh token, from the one it belongs to.' },
    { allow: 'He doesn\'t care what you\'re allowed. He cares who you are.', admin: 'AdministratorAccess isn\'t a token.' }, [r(12), w(12), b(14), up(3), r(14)]);
  // Floor 7, the Hall of Records
  F('plaintext', 'Plaintext', 'Plaintext', 'Records stored unencrypted', 32, 'sse', 1, 'Every page readable. By anyone who looks.',
    'A bucket of family records has no default encryption policy anyone checked, and an old export was written with encryption turned off on the client side.',
    { sse: 'Server-side encryption at rest: SSE-S3 at least, SSE-KMS for a key you control.', cmk: 'A customer managed key, so the key policy decides who reads.' },
    { tls: 'TLS protects it on the road, not in the vault.' }, [r(8), w(9), b(9)]);
  F('openroad', 'The Open Road', 'Open Road', 'Data sent without TLS', 32, 'sse', 1, 'Anyone on the road can read the cart.',
    'A script uploads records over plain HTTP to an S3 website-style endpoint, and nothing stops it.',
    { tls: 'Deny any request where aws:SecureTransport is false, and send everything over HTTPS.', acm: 'Put an ACM certificate on the endpoint people actually use.' },
    { sse: 'Encrypted at rest, read on the road.' }, [w(8), r(9), up()]);
  F('byok', 'The Bring-Your-Own-Key', 'Bring-Your-Own-Key', 'Encrypts with a key the house never sees', 30, 'sse', 1, 'His records are sealed. Nobody else has ever seen his key.',
    'A team uses SSE-C and keeps the keys on one laptop. The laptop is gone, and S3 never stored the keys.',
    { clientside: 'If AWS must never see plaintext, encrypt client-side, with the wrapping key in KMS where you can\'t lose it.', cmk: 'Or let a KMS key you control hold it.' },
    { sse: 'S3 can\'t decrypt SSE-C without the key you no longer have.' }, [r(8), b(9), r(8)]);
  F('spy', 'The Spy', 'Spy', 'Reads every unclassified page of PII until Macie finds them', 50, 'macie', 2, 'He reads what nobody labelled. Which is everything.',
    'Thousands of buckets, nobody sure which hold passport numbers. The Spy has been reading them for months.',
    { macie: 'Macie finds the PII, so it can be classified and locked away.', sse: 'Then encrypt what\'s confidential under a key he can\'t use.' },
    { tls: 'He isn\'t on the road. He\'s in the vault.' }, [w(10), r(11), up(), b(12)]);
  F('keeper', 'The Record Keeper', 'Record Keeper', 'Only hits sealed with server-side or client-side encryption land', 88, 'sse', 3, 'She keeps every record in the house, and she reads none of them unsealed.',
    'Her guard takes only sealed hits: SSE-KMS, client-side encryption, TLS on the road, certificates that renew themselves.',
    { sse: 'Sealed at rest.', clientside: 'Sealed before it leaves your hand.', tls: 'Sealed on the road.', cmk: 'Sealed with a key whose policy you wrote.' },
    { allow: 'Permission isn\'t encryption.' }, [r(12), w(13), b(14), up(3), w(14)]);
  // Floor 8, the Study
  F('rotlock', 'The Rotating Lock', 'Rotating Lock', 'A key that rotates every three turns', 32, 'kmskeys', 1, 'Every three turns its key turns. The old key still opens what it locked.',
    'Automatic rotation is on. The team panics, sure that last year\'s data keys no longer decrypt. They do.',
    { rotate: 'Rotation keeps the old key material: old ciphertext still decrypts, new encryption uses the new.', keypolicy: 'Same key ID, same policy, same aliases.' },
    { envelope: 'Re-encrypting every envelope by hand isn\'t needed.' }, [r(8), w(9), up()]);
  F('foreign', 'The Foreign Key', 'Foreign Key', 'Data encrypted under a key in another sect\'s account', 32, 'kmskeys', 1, 'His seal belongs to another house.',
    'A role in account B is allowed to read the bucket, but the objects are SSE-KMS under a key in account A whose policy names only A.',
    { keypolicy: 'The key policy in A must allow account B; B\'s IAM policy must allow kms:Decrypt on it.', grant: 'Or a grant, for just this job.' },
    { resource: 'The bucket policy already allows it. The key is the second lock.' }, [r(9), b(9), r(8)]);
  F('countdown', 'The Scheduled Deletion', 'Scheduled Deletion', 'A key counting down to deletion', 30, 'kmskeys', 1, 'Seven days. Six. Nobody can read with it while it waits.',
    'Someone scheduled the old records key for deletion. It\'s pending: every Decrypt fails, and in a week the key material is gone forever.',
    { keypolicy: 'Cancel the deletion, and disable the key instead if you only might need it.', grant: 'Then a grant for the readers who still need it.' },
    { rotate: 'Rotation doesn\'t stop a deletion.' }, [w(9), r(8), b(9)]);
  F('watcher', 'The Watcher in the Rafters', 'Watcher', 'A threat-detection sentry that spots strange callers', 52, 'detect', 2, 'He sees who calls from where. He has seen you.',
    'A role calls KMS from an IP address it has never used, at three in the morning, on her birthday.',
    { detect: 'GuardDuty raises it; Detective shows what else that role did; Security Hub keeps the ledger.', macie: 'And what the caller touched, if it was PII.' },
    { allow: 'He isn\'t blocking. He\'s watching.' }, [r(10), w(11), up(), b(12)]);
  F('knife', 'The Knife Not Used', 'The Knife', 'The study where she stood with the knife', 88, 'kmskeys', 3, 'She stood here at seventeen with the knife. She didn\'t use it.',
    'Every key in the study rotates, belongs to another account, or waits for deletion. And every decrypt is in the log.',
    { keypolicy: 'Read the key policy: it says who.', rotate: 'Rotation keeps the past readable.', grant: 'A grant for one night, then retired.', detect: 'The log already says when.' },
    { allow: 'An Allow is not a key.' }, [r(12), w(13), b(15), up(3), r(14)]);
  // Floor 9, the Succession Hall
  F('injector', 'The Injected Script', 'Injected Script', 'Requests carrying SQL and scripts', 34, 'edge', 1, 'It speaks politely, and every sentence ends in a semicolon.',
    'Query strings full of \' OR 1=1 -- and <script> tags reach the backend.',
    { waf: 'A WAF web ACL with the managed SQL injection and cross-site scripting rule groups.' },
    { shield: 'Shield stops floods, not clever sentences.' }, [w(9), r(9), b(10)]);
  F('flood', 'The Flood', 'Flood', 'A crowd of requests at the gate', 34, 'edge', 1, 'Ten thousand callers. Every one of them, rude.',
    'Credential stuffing: thousands of login attempts a minute from many addresses, and a volumetric attack under it.',
    { waf: 'A rate-based rule blocks each address that floods.', shield: 'Shield Advanced for the big ones, with experts on call.' },
    { sg: 'A security group can\'t count requests.' }, [b(9), r(9), b(10)]);
  F('hsm', 'The HSM Vault', 'HSM Vault', 'Keys that must live in single-tenant hardware', 32, 'kmskeys', 1, 'Nobody shares this vault. Not even with KMS, unless he says so.',
    'Regulators require key material in single-tenant HSMs the house controls, but the house still wants KMS for its records.',
    { keypolicy: 'A KMS custom key store backed by a CloudHSM cluster: KMS keys, his hardware.', cmk: 'Customer managed keys, created in that key store.' },
    { rotate: 'Rotation isn\'t the requirement. Tenancy is.' }, [r(9), w(9), up()]);
  F('namgung', 'Namgung Hyeon', 'Namgung', 'His guard is sealed: only a hit sealed with a data key from the right KMS key lands', 96, 'kmskeys', 3, 'The most honoured man in the Alliance, and the best father she had.',
    'Every three turns his key rotates. Those who expect their old data keys to stop working find they still work: rotation keeps the old key material for decrypting.',
    { envelope: 'A hit sealed with a data key from his KMS key: it lands.', cmk: 'A customer managed key, with the right name on the policy.', keypolicy: 'The key policy decides who can hurt him.', rotate: 'Rotation never locks out what it sealed before.' },
    { allow: 'Permissions don\'t pierce a sealed guard.', admin: 'Freya\'s keys would name Freya. He knows it.', waf: 'His guards are WAF and Shield. He is something else.' }, [r(13), w(14), b(16), up(3), w(15), r(15)], { denies: ['adminaccess'] });
  F('waf', 'The House Guard (WAF)', 'WAF Guard', 'Namgung\'s first guard: rules against injected scripts and floods', 30, 'edge', 1, 'He reads every letter at the door.', 'He blocks the obvious; he lets through anything that looks polite.',
    { waf: 'His rules are yours to read: managed rule groups and a rate limit.' }, { shield: 'He isn\'t the shield.' }, [r(9), w(9)]);
  F('shield', 'The House Guard (Shield)', 'Shield Guard', 'Namgung\'s second guard: Shield against the crowd', 30, 'edge', 1, 'He holds the gate against the crowd.', 'Volumetric attacks die against him. A single clever request doesn\'t.',
    { shield: 'Shield Advanced: the team on call, and the bill protected.' }, { waf: 'He isn\'t reading requests.' }, [b(9), r(9)]);
  // The reckoning
  F('unsent', 'The Unsent Letter', 'Unsent Letter', 'This year\'s birthday letter, sealed and never sent', 86, 'kmsenv', 3, 'Sealed under his key, addressed to her, in a drawer.',
    'An envelope: a data key encrypted under his KMS key, beside the letter it sealed. The key policy names her.',
    { envelope: 'Decrypt the data key with KMS, then the letter locally.', keypolicy: 'His key policy names her: she can.', fresh: 'Fresh credentials, her own.' },
    { allow: 'Nobody else\'s Allow opens it.' }, [r(12), w(13), b(15), up(3), r(14)]);
  F('summer', 'Namgung at the Summer House', 'Namgung', 'He is read, in his own words', 96, 'kmskeys', 3, 'He bows to her the way he did across the breakfast table.',
    'She uses her key to open his account in front of the Alliance.',
    { envelope: 'Her key opens his account.', cmk: 'Her name on the policy.', keypolicy: 'The key policy he wrote, for her alone.', detect: 'Every read he made is in the log.' },
    { allow: 'No grant from Freya. Not this time.', admin: 'Not with Freya\'s keys.' }, [r(14), w(14), b(16), up(3), w(16)], { denies: ['adminaccess'] });
  Object.assign(SD.enemies, E);

  // ---------- Field Notes and Policy Sorts ----------
  Object.assign(SD.fieldNotes, {
    k4page6: { title: 'Kyu\'s page 6: security groups and network ACLs', c: 'sgnacl',
      ev: 'Client 203.0.113.9:51544  ->  web server 10.0.1.20:443\nSecurity group: inbound TCP 443 from 0.0.0.0/0\nNetwork ACL:   inbound 100 TCP 443 allow;  outbound 100 TCP 443 allow',
      steps: [
        'The request comes in on port 443. The ACL\'s inbound rule 100 allows it; the security group allows it.',
        'The server answers from port 443 to the client\'s port 51544, an ephemeral port.',
        'The security group is stateful: it remembers the request, so the reply goes out whatever its outbound rules say.',
        'The ACL is stateless: it checks the reply on its own, against its outbound rules.',
        'Outbound allows only port 443, and the reply is going to 51544. Dropped.',
        'Fix: an outbound ACL rule allowing TCP 1024-65535. In ACLs you write both directions.'] },
    k4order: { title: 'Rule 100 goes first', c: 'sgnacl',
      ev: 'Inbound network ACL:\n 90  allow TCP 22   from 10.0.9.4/32\n100  deny  ALL      from 10.0.0.0/16\n200  allow TCP 443  from 0.0.0.0/0\n  *  deny  ALL',
      steps: [
        'Rules are read from the lowest number up, and the first that matches decides.',
        'SSH from 10.0.9.4 matches rule 90 first: allowed.',
        'HTTPS from 10.0.3.3 matches rule 100 before 200: denied.',
        'HTTPS from 198.51.100.7 skips 90 and 100 and matches 200: allowed.',
        'Anything else falls to *, the deny that\'s always last.'] },
    k4subnets: { title: 'What makes a subnet public', c: 'subnets',
      ev: 'Public route table:   10.0.0.0/16 local;  0.0.0.0/0 -> igw-0a1\nPrivate route table:  10.0.0.0/16 local;  0.0.0.0/0 -> nat-0b2 (in the public subnet)',
      steps: [
        'Every route table has the local route: the whole VPC can reach itself.',
        'A route to an internet gateway makes the subnet public; its instances still need public IPs.',
        'A private subnet\'s default route goes to a NAT gateway that lives in a public subnet.',
        'The NAT lets private instances start connections out, and lets nothing start one in.',
        'A NAT gateway is zonal: for resilience, one in each AZ, and each private subnet routes to its own.'] },
    k4endpoint: { title: 'The back door and the side door', c: 'endpoints', steps: [
      'A gateway endpoint exists for S3 and DynamoDB only. It\'s a target in the route table, and it\'s free.',
      'An interface endpoint is a network interface with a private IP in your subnet, for almost any other service. It\'s AWS PrivateLink, billed by the hour.',
      'With private DNS on, the service\'s usual name resolves to the interface endpoint.',
      'An endpoint policy limits what can be reached through it: only your own buckets, say.',
      'From your data center over a VPN, use an interface endpoint: gateway endpoints only serve the VPC\'s own route tables.'] },
    k4wayin: { title: 'Three ways up the mountain', c: 'hybrid', steps: [
      'Site-to-Site VPN: two IPsec tunnels over the internet to a virtual private gateway or transit gateway. Hours to set up, latency that varies.',
      'Client VPN: each person\'s laptop connects with TLS, with authorization rules per group and split tunnel if you want it.',
      'Direct Connect: a private line with steady bandwidth and latency. It takes weeks, and it isn\'t encrypted by itself.',
      'Need both? A VPN over Direct Connect encrypts the private line; a VPN on the side is its backup.'] },
    k4review: { title: 'The temple\'s rules, again', c: 'iampol', steps: [
      'Every request starts implicitly denied.',
      'An explicit Deny in any policy that applies ends it.',
      'Boundaries and SCPs must allow it too; they never grant.',
      'In one account, an Allow in the identity policy or in the resource\'s own policy is enough.',
      'Across accounts, both have to allow it.',
      'No Allow anywhere: the implicit deny stands.'] },
    k4sigv4: { title: 'A signed request', c: 'sigv4',
      ev: 'Authorization: AWS4-HMAC-SHA256 Credential=ASIA.../20261021/us-east-1/s3/aws4_request,\n  SignedHeaders=host;x-amz-date, Signature=9f2c...\nX-Amz-Date: 20261021T061500Z\nX-Amz-Security-Token: (the session token)',
      steps: [
        'The access key ID says whose secret key signed it. ASIA means temporary credentials.',
        'The scope pins the signature to one day, one Region and one service.',
        'The signature is an HMAC of the request, made with the secret key, which never travels.',
        'The timestamp must be within a few minutes of AWS\'s clock, or it\'s refused.',
        'Temporary credentials also send their session token.'] },
    k4presign: { title: 'The Presigned Note', c: 'sigv4', steps: [
      'A presigned URL carries the signature in its query string instead of a header.',
      'Anyone who has the URL can make that one request, as the signer.',
      'It works until its expiry, and never past the credentials that signed it.',
      'Signed with a role\'s temporary credentials, it dies when they do.',
      'Treat it like a secret, and keep its life short.'] },
    k4page7: { title: 'Kyu\'s page 7: why a role beats a key', c: 'progaccess', steps: [
      'An access key in code is a password that never expires and travels with every copy.',
      'A role hands the SDK temporary credentials that expire on their own.',
      'On EC2 that\'s an instance profile; on Lambda the execution role; on ECS the task role.',
      'Outside AWS, IAM Roles Anywhere; in a CI pipeline, OIDC federation.',
      'So the last step: delete the key, and let the credential chain find the role.'] },
    k4stone: { title: 'The Key Under the Stone', c: 'progaccess', steps: [
      'An SSH key pair is one more secret to share, rotate and lose, and port 22 has to be open.',
      'Session Manager gives a shell through IAM: no open inbound port, no keys, every session logged.',
      'In private subnets it needs endpoints for ssm, ssmmessages and ec2messages, or a NAT.',
      'For local testing, a self-signed certificate is fine. Never in front of real users: nobody else trusts it.'] },
    k4jwt: { title: 'Checking a guild card', c: 'cognito',
      ev: '{ "kid": "a1b2" , "alg": "RS256" }\n{ "iss": "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_Peak41",\n  "client_id": "6hall2rec", "token_use": "access", "scope": "records/read",\n  "exp": 1792555200, "cognito:groups": ["alliance"] }',
      steps: [
        'Find the public key whose kid matches in the user pool\'s JWKS, and verify the signature. A bad seal ends it.',
        'Check exp: an expired token is refused.',
        'Check iss: it must be this user pool.',
        'Check client_id and token_use (or aud, on an ID token): it must be meant for this app.',
        'Only then read the claims, such as scope and groups. A valid token that lacks the scope is a 403, not a 401.'] },
    k4fed: { title: 'Another house vouches', c: 'federation', steps: [
      'Federation trusts another identity provider to say who someone is: SAML 2.0, OIDC, or a social sign-in.',
      'A Cognito user pool can federate it for an app, map its attributes and still issue its own tokens.',
      'For a workforce across many accounts, IAM Identity Center: one sign-in, permission sets per account.',
      'Either way, no IAM users, and no long-term keys for people.'] },
    k4sse: { title: 'Four ways to seal a record', c: 'sse', steps: [
      'SSE-S3: S3 owns and manages the keys. The default for every bucket.',
      'SSE-KMS: a KMS key, so a key policy decides who can read, and CloudTrail logs every use.',
      'SSE-C: you send the key with every request, over HTTPS. S3 uses it and forgets it.',
      'Client-side: you encrypt before upload, so AWS never sees plaintext.',
      'And on the road: TLS, with a bucket policy that denies aws:SecureTransport false.'] },
    k4acm: { title: 'Seals that renew themselves', c: 'acm', steps: [
      'ACM issues public certificates for free, for load balancers, CloudFront and API Gateway.',
      'A DNS-validated ACM certificate renews itself, as long as its CNAME record stays in DNS.',
      'An imported certificate is never renewed by ACM. You reimport the new one to the same ARN.',
      'AWS Private CA issues certificates only your own systems trust, for internal services.'] },
    k4rotate: { title: 'What rotation keeps', c: 'kmskeys', steps: [
      'Automatic rotation adds new key material on a schedule: yearly by default, 90 to 2,560 days.',
      'The key ID, ARN, aliases and policy stay the same.',
      'New encryption uses the newest material.',
      'Old ciphertext still decrypts: KMS keeps every older version and picks the right one.',
      'So nothing has to be re-encrypted, and nothing locks you out.'] },
    k4detect: { title: 'Four who watch', c: 'detect', steps: [
      'GuardDuty: reads CloudTrail, VPC flow logs and DNS logs for threats. No agents.',
      'Inspector: scans EC2, container images and Lambda for known vulnerabilities, again as new ones appear.',
      'Detective: when a finding lands, shows what else that caller did, over time.',
      'Security Hub: every finding in one place, and the accounts checked against standards.',
      'And KMS? Every Decrypt is already in CloudTrail, as a management event, by default.'] },
    k4edge: { title: 'His guards', c: 'edge', steps: [
      'AWS WAF reads each HTTP request at CloudFront, a load balancer or API Gateway.',
      'Managed rule groups stop SQL injection and cross-site scripting; a rate-based rule stops a flood from one address.',
      'Shield Standard is on for everyone, free. Shield Advanced adds the response team and cost protection.',
      'Network Firewall filters traffic inside the VPC: domains, stateful IPS.',
      'Firewall Manager puts the same rules on every account in the organization.',
      'And when the keys must live in single-tenant hardware: CloudHSM, or a KMS key store backed by it.'] }
  });
  Object.assign(SD.policySorts, {
    k4wall: { title: 'The Outer Wall\'s wards', c: 'sgnacl',
      ev: 'Web server 10.0.1.20 in a public subnet.\nSecurity group: inbound TCP 443 from 0.0.0.0/0 (outbound: none)\nNetwork ACL:   inbound 100 allow TCP 443;  outbound 100 allow TCP 1024-65535;  then * deny',
      reqs: [
        { t: 'A client\'s HTTPS request, and the server\'s reply', ok: true, why: 'The ACL allows 443 in and the ephemeral reply out; the security group remembers the request.' },
        { t: 'An SSH connection to port 22', ok: false, why: 'Nothing allows 22, in the ACL or the security group.' },
        { t: 'The server starting its own HTTPS call to the internet', ok: false, why: 'The security group has no outbound rules, and this isn\'t a reply to anything.' },
        { t: 'A reply that would go to the client\'s port 443', ok: false, why: 'Outbound allows only 1024-65535, so a reply to 443 matches no allow before *.' },
        { t: 'A second client\'s HTTPS request, and its reply', ok: true, why: 'Same as the first: allowed both ways.' }] },
    k4routes: { title: 'Where does the cart go?', c: 'subnets',
      ev: 'Private subnet route table:\n10.0.0.0/16  local\npl-s3 (S3 prefix list)  vpce-gw (gateway endpoint)\n0.0.0.0/0    nat-a (NAT gateway in public subnet A)',
      reqs: [
        { t: 'An instance reads from S3 in the same Region, without crossing the NAT', ok: true, why: 'The prefix list route is more specific than 0.0.0.0/0, so S3 goes through the gateway endpoint.' },
        { t: 'An instance downloads updates from the internet', ok: true, why: '0.0.0.0/0 goes to the NAT gateway.' },
        { t: 'Someone on the internet opens a connection to the instance', ok: false, why: 'A NAT gateway only carries connections that start inside.' },
        { t: 'An instance talks to another instance in the VPC', ok: true, why: 'The local route.' },
        { t: 'An instance calls Secrets Manager without crossing the NAT', ok: false, why: 'Gateway endpoints are only for S3 and DynamoDB. Secrets Manager needs an interface endpoint.' }] },
    k4yard: { title: 'Allowed twice', c: 'iampol',
      ev: 'Role yard-reader (account 111122223333): Allow s3:GetObject on arn:aws:s3:::yard-scrolls/*\nBucket yard-scrolls (same account), bucket policy: Deny s3:DeleteObject to everyone\nRole visitor (account 444455556666): Allow s3:GetObject on arn:aws:s3:::yard-scrolls/*',
      reqs: [
        { t: 'yard-reader reads yard-scrolls/forms.txt', ok: true, why: 'Same account: its identity policy\'s Allow is enough.' },
        { t: 'yard-reader deletes yard-scrolls/forms.txt', ok: false, why: 'Nothing allows it, and the bucket policy denies it anyway.' },
        { t: 'visitor, from the other account, reads yard-scrolls/forms.txt', ok: false, why: 'Across accounts the bucket policy must allow it too, and it doesn\'t.' },
        { t: 'yard-reader reads another bucket, ash-records', ok: false, why: 'Its policy names only yard-scrolls.' },
        { t: 'yard-reader reads yard-scrolls/old/1984.txt', ok: true, why: 'The * matches any key, slashes included.' }] },
    k4tokens: { title: 'Guild cards at the Outer Court', c: 'cognito',
      ev: 'The route requires a valid access token from user pool Peak41, client 6hall2rec, with scope records/read.',
      reqs: [
        { t: 'A current token from Peak41 for 6hall2rec, scope records/read', ok: true, why: 'Signature, expiry, issuer, client and scope all check out.' },
        { t: 'The same token, an hour after exp', ok: false, why: 'Expired: 401. The owner should refresh it.' },
        { t: 'A token from Peak41 for another client, scope records/read', ok: false, why: 'Wrong audience: it was issued for another app.' },
        { t: 'A token whose groups claim was edited and re-signed with another key', ok: false, why: 'The signature doesn\'t verify against the pool\'s JWKS.' },
        { t: 'A current token from Peak41 for 6hall2rec, scope records/write only', ok: false, why: 'A valid token without the scope: 403 Forbidden.' }] },
    k4keypol: { title: 'Who can read the sealed account?', c: 'kmskeys',
      ev: 'KMS key policy (account 111122223333), and no other statements:\n{ "Sid": "Admins", "Principal": { "AWS": "arn:aws:iam::111122223333:role/HouseAdmin" }, "Action": ["kms:Create*", "kms:Describe*", "kms:Enable*", "kms:Put*", "kms:Disable*", "kms:ScheduleKeyDeletion"] }\n{ "Sid": "Reader", "Principal": { "AWS": "arn:aws:iam::111122223333:role/SeoYeon" }, "Action": "kms:Decrypt" }',
      reqs: [
        { t: 'The role SeoYeon decrypts the account\'s data key', ok: true, why: 'The key policy allows SeoYeon kms:Decrypt directly.' },
        { t: 'HouseAdmin decrypts it', ok: false, why: 'HouseAdmin can manage the key, but nothing gives it kms:Decrypt.' },
        { t: 'A role with AdministratorAccess in the same account decrypts it', ok: false, why: 'The key policy doesn\'t let IAM policies count, so AdministratorAccess doesn\'t reach the key.' },
        { t: 'HouseAdmin schedules the key for deletion', ok: true, why: 'The Admins statement allows ScheduleKeyDeletion. It would still wait 7 to 30 days.' },
        { t: 'SeoYeon decrypts it after the key\'s automatic rotation', ok: true, why: 'Rotation keeps the old key material, and the policy hasn\'t changed.' }] }
  });

  // ---------- Events ----------
  Object.assign(SD.expeditionEvents, {
    k4toll: { id: 'k4toll', title: 'The Toll Booth', who: null, text: 'A booth across the pass with a sign: "Every cart to the storehouse: 4.5 bits per gigabyte. Cash only."',
      choices: [
        { label: 'Find the road around it', out: 'Right: each of you takes a Gateway Endpoint from the old road. Wrong: the booth fines the team 6 SLA.', fx: { ask: { c: 'endpoints', right: { card: 'k4-gwend' }, wrong: { sla: -6 } } } },
        { label: 'Pay the toll (15 bits each)', out: 'Each of you pays, and rests at the booth: the team recovers 10 SLA.', fx: { cost: 15, sla: 10 } },
        { label: 'Walk on', out: 'You walk on. The booth keeps counting.', fx: {} }] },
    k4ward: { id: 'k4ward', title: 'A Ward Stone', who: null, text: 'A stone carved with the rules of the pass: some for travellers going up, some for going down. Half are worn away.',
      choices: [
        { label: 'Read which way each rule faces', out: 'Right: one of you refactors a card. Wrong: the stone throws the team back for 6 SLA.', fx: { ask: { c: 'sgnacl', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Rest in its lee', out: 'The wind drops. The team recovers 8 SLA.', fx: { sla: 8 } }] },
    k4tea: { id: 'k4tea', title: 'Madam Ok\'s Courier', who: null, per: true, text: 'A boy from the Cult with a flask and a note: "For my heir. Drink it while it\'s hot. — Ok"',
      choices: [
        { label: 'Drink it', out: 'Ginseng and something you can\'t name. The team recovers 12 SLA.', fx: { sla: 12 } },
        { label: 'Ask the boy what he carries', out: 'A pocketful of cards from the Cult\'s treasury. Each of you picks an uncommon one.', fx: { card: 'uncommon' } }] },
    k4review: { id: 'k4review', title: 'The Old Rules', who: null, text: 'The yard\'s rule board, from before the fire: DENY. ALLOW. AND IF NOBODY SAID ANYTHING, NO.',
      choices: [
        { label: 'Say them in order', out: 'Right: each of you takes Scope It Down. Wrong: the board falls on the team for 6 SLA.', fx: { ask: { c: 'iampol', right: { card: 'k4-scoped' }, wrong: { sla: -6 } } } },
        { label: 'Leave it standing', out: 'You leave it. It\'s still right.', fx: {} }] },
    k4presign: { id: 'k4presign', title: 'The Presigned Note', who: null, text: 'A note pinned to a burned door: a long link, and "valid until dawn". Anyone could use it.',
      choices: [
        { label: 'Work out what it lets you do', out: 'Right: each of you takes a Presigned Note. Wrong: someone else used it first, and the team loses 6 SLA.', fx: { ask: { c: 'sigv4', right: { card: 'k4-presign' }, wrong: { sla: -6 } } } },
        { label: 'Burn it, so nobody can', out: 'Good instinct. Each of you gains 15 bits from the door\'s strongbox.', fx: { bits: 15 } }] },
    k4stone: { id: 'k4stone', title: 'The Key Under the Stone', who: null, text: 'Under a flagstone: a private key file, chmod 777, and a note in Old Gu\'s hand: "for emergencies".',
      choices: [
        { label: 'Work out what should replace it', out: 'Right: one of you refactors a card. Wrong: the key gets used, and the team loses 6 SLA.', fx: { ask: { c: 'progaccess', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Pocket it', out: 'A key that never expires. Each of you gains 20 bits, and a Leaked Key goes in every deck.', fx: { bits: 20, curse: 'k4-leaked' } }] },
    k4order: { id: 'k4order', title: 'The Raid Order', who: null, text: 'A shelf of the Alliance\'s audit records. One of them is the order to burn Burning Peak. It\'s signed by a role, not a person.',
      choices: [
        { label: 'Find who was behind the session', out: 'Right: the session\'s name is his. Each of you gains 20 bits and the team 8 SLA. Wrong: the team loses 6 SLA.', fx: { ask: { c: 'stschain', right: { bits: 20, sla: 8 }, wrong: { sla: -6 } } } },
        { label: 'Leave it for the confrontation', out: 'Seo-yeon memorises the shelf number.', fx: {} }] },
    k4reads: { id: 'k4reads', title: 'Namgung\'s Reads', who: null, text: 'A ledger in the study: the KMS log, one Decrypt every year, on the same day. Her birthday.',
      choices: [
        { label: 'Work out whether anyone had to turn this on', out: 'Right: one of you refactors a card. Wrong: the team loses 6 SLA.', fx: { ask: { c: 'kmskeys', right: { upgrade: 1, who: 'one' }, wrong: { sla: -6 } } } },
        { label: 'Close the ledger', out: 'Seo-yeon closes it very gently.', fx: { sla: 6 } }] },
    k4freya: { id: 'k4freya', title: 'Every Key in the Band', who: 'freya', per: true, text: 'Freya, from a mirror in the corridor: "Still free, love. Every key on these floors. You choose what to unseal."',
      choices: [
        { label: 'Take her AdministratorAccess off your hands', out: 'AdministratorAccess goes into the mirror. Back come Write the Key Policy and Envelope Seal. "Least privilege. I\'m so proud."', fx: { trade: { give: 'adminaccess', get: ['k4-keypol', 'k4-envelope'] } } },
        { label: 'Thank her politely', out: '"Filed in the fire, I suppose." She smiles anyway.', fx: {} }] }
  });

  // ---------- Questions ----------
  // The bank questions each concept asks (js/qpick.js picks one at random), the chapter's ELI5 lines in js/c4-help.js.
  D.Q = {
    sgnacl: ['saa-1-124', 'saa-1-750', 'saa-1-751', 'saa-1-04', 'saa-3-228'],
    subnets: ['saa-1-752', 'saa-1-123', 'saa-4-126', 'saa-4-440', 'saa-4-06', 'saa-4-442', 'dva-1-754'],
    endpoints: ['saa-1-753', 'saa-1-113', 'saa-1-03', 'saa-4-122', 'saa-1-114', 'saa-3-461'],
    hybrid: ['saa-1-125', 'saa-1-128', 'saa-3-121', 'saa-4-228', 'saa-1-471', 'saa-1-217'],
    iampol: ['dva-2-102', 'dva-2-601', 'dva-2-608', 'saa-1-108', 'saa-1-208', 'dva-2-136', 'dva-2-105', 'saa-1-106'],
    stschain: ['dva-2-755', 'dva-2-108', 'dva-2-127', 'dva-4-761', 'dva-2-406', 'dva-4-601'],
    sigv4: ['dva-2-110', 'dva-2-111', 'dva-2-128', 'dva-2-114', 'dva-2-757'],
    progaccess: ['dva-2-133', 'dva-2-139', 'dva-2-301', 'dva-2-322'],
    cognito: ['dva-2-119', 'dva-2-756', 'dva-2-120', 'dva-2-122', 'dva-2-123', 'dva-2-129', 'dva-2-315', 'dva-2-117', 'dva-2-118', 'dva-2-232'],
    federation: ['dva-2-321', 'saa-1-08', 'saa-1-206', 'saa-1-126', 'dva-2-121'],
    kmsenv: ['dva-2-07', 'dva-2-08', 'dva-2-202', 'dva-2-209', 'dva-2-203'],
    kmskeys: ['dva-2-116', 'dva-2-204', 'dva-2-206', 'dva-2-208', 'dva-2-306', 'saa-1-140', 'saa-1-228', 'dva-2-759', 'dva-4-760', 'saa-1-131', 'saa-1-223', 'dva-2-201', 'saa-1-130'],
    secrets: ['dva-2-11', 'dva-2-224', 'dva-2-226', 'dva-2-227', 'dva-2-307', 'saa-1-122', 'saa-1-219'],
    macie: ['saa-1-07', 'dva-2-309', 'dva-2-230', 'dva-2-330', 'saa-1-221'],
    sse: ['dva-2-758', 'dva-2-215', 'dva-2-10', 'dva-2-605'],
    acm: ['dva-2-211', 'dva-2-220', 'dva-2-324', 'saa-1-133'],
    detect: ['saa-1-118', 'saa-1-210', 'saa-1-119', 'saa-1-213', 'saa-1-121', 'saa-1-120'],
    edge: ['dva-2-316', 'saa-1-06', 'saa-1-115', 'saa-1-216', 'saa-1-116', 'saa-1-215', 'saa-1-117', 'saa-1-214', 'saa-1-466']
  };
  Object.keys(D.Q).forEach(c => D.Q[c].forEach(id => {
    const q = (SD.bank || []).find(x => x.id === id);
    if (q && !SD.questions.some(x => x.id === id)) SD.questions.push(Object.assign({}, q, { c }));
  }));
  // One of a concept's questions (or, for an earlier chapter's concept, one of its own), at random.
  D.pickQ = c => (D.Q[c] ? SD.qpick(D.Q[c], { c }) : SD.qpick(SD.questions.filter(q => q.c === c && q.id && !q.lp && q.type !== 'explain')));

  // ---------- The expeditions ----------
  const intro = (...l) => l.map(([who, text]) => ({ who, text }));
  const XP = (id, name, blurb, back, floors, more) => Object.assign({ id, name, who: ['mira', 'kai', 'seoyeon', 'dutch'], opens: () => !!(SD.c4world && SD.c4world.active), sev: 0.85, dmg: 0.85, blurb, back,
    cafe: { title: 'A Pass Tea House', who: null, name: 'The tea house', text: 'A tea house that has served every traveller on this pass for a hundred years, and asks none of them where they were born.' },
    camp: { title: 'A Shrine on the Path', text: 'A small shrine, swept clean. Sit for a minute, or use the whetstone on one of your cards. Each of you chooses one.' },
    regroup: [{ who: 'seoyeon', text: 'Up. Forms. We go again from the start of the floor.' }], floors }, more);
  const fl = (o) => Object.assign({ map: '4' }, o);
  SD.expeditions = (SD.expeditions || []).concat([
    XP('k4gates', 'The Gate Passes', 'The Alliance\'s mountain passes, every one with a gate: the Outer Wall, then the Hidden Valley.', 'Out into the Hidden Valley', [
      fl({ name: 'The Outer Wall', gate: 'THE GATE PASSES · THE OUTER WALL', beat: 'Guards who remember you, and guards who don\'t.', boss: 'gatekeeper', bossTitle: 'The Gatekeeper of Nine Passes', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['notes', 'fight', 'event'], ['fight', 'sort', 'notes'], ['elite', 'cafe', 'fight'], ['camp', 'fight', 'notes'], ['fight', 'sort', 'event'], ['notes', 'elite', 'fight'], ['event', 'fight', 'board'], ['camp', 'cafe', 'camp']],
        fights: ['stateless', 'ephemeral', 'stateful', { ids: ['stateless', 'stateful'] }, { ids: ['ephemeral', 'stateful'] }], elites: ['rule100'],
        notes: ['k4page6', 'k4order'], sorts: ['k4wall'], events: ['k4ward', 'k4tea', 'k4toll'],
        intro: intro([null, 'The Outer Wall: a wall across the pass with a gate every hundred paces, and a guard at every gate.'], ['lead', { seoyeon: 'Kyu\'s page six. Read it before you argue with anyone.', other: 'Kyu left us a page for this. Page six.' }], ['seoyeon', 'Some of them remember you. Some don\'t. Learn which.']),
        outro: intro([null, 'The Gatekeeper lowers both his wards at once, and for the first time all day, lets a reply out.'], ['mate1', 'In and out. Both ways. Who builds a gate like that?'], ['seoyeon', 'Someone who wants to know who\'s leaving.']) }),
      fl({ name: 'The Hidden Valley', gate: 'THE GATE PASSES · THE HIDDEN VALLEY', beat: 'Private villages, toll roads, and back doors to the storehouse.', boss: 'warden', bossTitle: 'The Valley Warden', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'notes', 'event'], ['fight', 'elite', 'sort'], ['notes', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['noroute', 'tollroad', 'backdoor', { ids: ['noroute', 'tollroad'] }, { ids: ['backdoor', 'noroute'] }], elites: ['singlenat'],
        notes: ['k4subnets', 'k4endpoint', 'k4wayin'], sorts: ['k4routes'], events: ['k4toll', 'k4tea', 'k4ward'],
        intro: intro([null, 'Below the wall, a valley the maps don\'t show: villages with no road out, a toll road, and somewhere, a door straight into the storehouse.'], ['mate2', 'Private villages. Nobody in, and they still need the post.'], ['lead', 'Then we find the roads.']),
        outro: intro([null, 'The Valley Warden steps back into the public road and bows. The villages behind him stay private, and their carts still get out.'], ['seoyeon', 'There\'s a vault down there. Sealed. Someone is reading in it.']) })
    ]),
    XP('k4peak', 'The Ruins of Burning Peak', 'The Peak, rebuilt from the Alliance\'s records: the training yard, the burned hall, the master\'s room.', 'Back to the ruins', [
      fl({ name: 'The Training Yard', gate: 'BURNING PEAK · THE TRAINING YARD', beat: 'The old rules, back again: deny, then allow, then no.', boss: 'ghost', bossTitle: 'The Sect Master\'s Ghost', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'event', 'notes'], ['elite', 'cafe', 'fight'], ['camp', 'sort', 'fight'], ['fight', 'notes', 'board'], ['event', 'elite', 'fight'], ['fight', 'board', 'sort'], ['camp', 'cafe', 'camp']],
        fights: ['wildcard', 'boundary', 'gatepol', { ids: ['wildcard', 'boundary'] }, { ids: ['gatepol', 'wildcard'] }], elites: ['inline'],
        notes: ['k4review', 'evalorder', 'boundary'], sorts: ['k4yard', 'boundary'], events: ['k4review', 'k4tea', 'k4freya'],
        intro: intro([null, 'Burning Peak\'s training yard, rebuilt from the Alliance\'s records: every post where it was, and nobody in it.'], ['seoyeon', '...We did forms there. Every dawn.'], ['mate1', 'Then we do them again. Properly, this time.']),
        outro: intro([null, 'The Sect Master\'s Ghost nods once, the way old masters nod: not praise, just not disappointed.'], ['seoyeon', 'He used to do that to Jin. Jin never noticed.']) }),
      fl({ name: 'The Burned Hall', gate: 'BURNING PEAK · THE BURNED HALL', beat: 'Borrowed robes, borrowed hours, and strangers with keys.', boss: 'envoy', bossTitle: 'The Cross-Mountain Envoy', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'notes'], ['fight', 'sort', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['notes', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['tempcreds', 'chained', 'stranger', { ids: ['tempcreds', 'chained'] }, { ids: ['stranger', 'tempcreds'] }], elites: ['unsigned'],
        notes: ['k4sigv4', 'k4presign', 'chain'], sorts: ['trust', 'revoke'], events: ['k4presign', 'k4tea', 'k4stone'],
        intro: intro([null, 'The hall where the fire started. Its beams are black, and someone has left notes pinned to the doors.'], ['mate2', 'These robes all come off at the hour.'], ['lead', 'Then we keep getting new ones.']),
        outro: intro([null, 'The Envoy takes off another sect\'s robe and folds it neatly. He has nowhere left to wear it.'], ['seoyeon', 'The master\'s room is through there.']) }),
      fl({ name: 'The Master\'s Room', gate: 'BURNING PEAK · THE MASTER\'S ROOM', beat: 'Echoes, an old key in old code, and something wearing Jin.', boss: 'jinecho', bossTitle: 'Jin\'s Echo', fade: 3,
        plan: [['fight', 'notes', 'fight'], ['notes', 'event', 'fight'], ['fight', 'board', 'notes'], ['elite', 'fight', 'cafe'], ['camp', 'notes', 'fight'], ['fight', 'event', 'board'], ['fight', 'elite', 'notes'], ['event', 'fight', 'board'], ['camp', 'cafe', 'camp']],
        fights: [{ ids: ['stateless', 'noroute'] }, { ids: ['wildcard', 'tempcreds'] }, 'chained', 'boundary', { ids: ['ephemeral', 'gatepol'] }], elites: ['longkey'],
        notes: ['k4page7', 'k4stone', 'chain'], sorts: ['trust'], events: ['k4stone', 'k4presign', 'k4tea'],
        intro: intro(['c4', 'gu'], [null, 'The master\'s room. Echoes of everything you\'ve fought on these floors wait in it, and something else, further in, that knows the forms.'], ['seoyeon', 'Kyu\'s page seven. Finish it yourselves.']),
        outro: intro([null, '"Up, Minnow. Forms." The Echo says it in his voice, and goes.'], ['seoyeon', '...'], ['mate1', 'Seo-yeon.'], ['seoyeon', 'That wasn\'t him. It said everything right. That\'s how I know.']) })
    ], { sev: 0.85, dmg: 0.88 }),
    XP('k4house', 'Namgung\'s House', 'The house she grew up in: the Outer Court, the Hall of Records, the Study, and the Succession Hall.', 'Out of the house', [
      fl({ name: 'The Outer Court', gate: 'NAMGUNG\'S HOUSE · THE OUTER COURT', beat: 'Every visitor shows a token, and the Steward reads them all.', boss: 'steward', bossTitle: 'The Steward', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['sort', 'fight', 'event'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'event', 'fight'], ['fight', 'elite', 'sort'], ['notes', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['forged', 'expired', 'wrongaud', { ids: ['forged', 'expired'] }, { ids: ['wrongaud', 'forged'] }], elites: ['fedstranger'],
        notes: ['k4jwt', 'k4fed'], sorts: ['k4tokens'], events: ['k4order', 'k4tea', 'k4freya'],
        intro: intro([null, 'Namgung\'s house. The Outer Court is swept, and the Steward at its door bows to Seo-yeon as if she\'d been out for an hour.'], ['seoyeon', 'Good evening, Steward.'], ['mate1', 'He knows you.'], ['seoyeon', 'He taught me to bow.']),
        outro: intro([null, 'The Steward steps aside. "Miss." Nothing else.'], ['mate2', 'The Hall of Records is next.']) }),
      fl({ name: 'The Hall of Records', gate: 'NAMGUNG\'S HOUSE · THE HALL OF RECORDS', beat: 'Every record in the band, sealed or not.', boss: 'keeper', bossTitle: 'The Record Keeper', fade: 5,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'notes'], ['fight', 'board', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['notes', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['plaintext', 'openroad', 'byok', { ids: ['plaintext', 'openroad'] }, { ids: ['byok', 'plaintext'] }], elites: ['spy'],
        notes: ['k4sse', 'k4acm'], sorts: ['k4keypol'], events: ['k4order', 'k4tea', 'k4ward'],
        intro: intro([null, 'Shelves to the ceiling. Some records sealed, some lying open where anyone could read them, and someone has.'], ['lead', 'Sealed in the vault, sealed on the road.']),
        outro: intro([null, 'The Record Keeper files the last open page away, sealed, and nods.'], ['seoyeon', 'The study. He\'ll have kept the study as it was.']) }),
      fl({ name: 'The Study', gate: 'NAMGUNG\'S HOUSE · THE STUDY', beat: 'Keys that turn, keys from other houses, keys counting down, and the log of every read.', boss: 'knife', bossTitle: 'The Knife Not Used', fade: 4,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'sort'], ['fight', 'notes', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'event', 'fight'], ['fight', 'elite', 'notes'], ['sort', 'fight', 'board'], ['fight', 'event', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['rotlock', 'foreign', 'countdown', { ids: ['rotlock', 'foreign'] }, { ids: ['countdown', 'rotlock'] }], elites: ['watcher'],
        notes: ['k4rotate', 'k4detect'], sorts: ['k4keypol', 'keyvault'], events: ['k4reads', 'k4tea', 'k4freya'],
        intro: intro([null, 'The study, exactly as it was: the desk, the lamp, the place on the floor where she stood at seventeen.'], ['seoyeon', 'Every year, on my birthday, he came in here.']),
        outro: intro([null, 'The knife is still on the desk, in its sheath. Seo-yeon picks it up, and doesn\'t draw it.'], ['seoyeon', 'The Succession Hall. He\'s waiting.']) }),
      fl({ name: 'The Succession Hall', gate: 'NAMGUNG\'S HOUSE · THE SUCCESSION HALL', beat: 'The whole Alliance watching, and Namgung behind his guards.', boss: 'namgung', bossTitle: 'Namgung Hyeon', bossPack: { ids: ['namgung', 'waf', 'shield'] }, fade: 3,
        plan: [['fight', 'notes', 'fight'], ['fight', 'event', 'notes'], ['board', 'fight', 'cafe'], ['elite', 'fight', 'board'], ['camp', 'notes', 'fight'], ['fight', 'elite', 'board'], ['event', 'fight', 'notes'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: ['injector', 'flood', 'hsm', { ids: ['injector', 'flood'] }, { ids: ['hsm', 'injector'] }], elites: ['watcher', 'spy'],
        notes: ['k4edge', 'k4rotate'], sorts: ['k4keypol'], events: ['k4freya', 'k4tea', 'k4reads'],
        intro: intro(['c4', 'confront'], [null, 'Namgung withdraws behind his guards: one reads every letter at the door, one holds the gate against the crowd. The whole Alliance watches.'], ['seoyeon', 'Only someone holding the right key can hurt him. I hold it.']),
        outro: intro([null, 'Namgung bows to her, the way he did across the breakfast table.'], [null, 'Then Freya\'s blessing takes him: a ring of gold light, and he goes up the tower.'], ['seoyeon', 'Father.']) })
    ], { sev: 0.88, dmg: 0.9 }),
    XP('k4letter', 'The Last Letter', 'The reckoning: up to Namgung\'s summer house in the high passes, where this year\'s birthday letter waits unsent.', 'Back down to the town', [
      fl({ name: 'The High Passes', gate: 'THE LAST LETTER · THE HIGH PASSES', beat: 'Every gate she\'s learned, all at once.', boss: 'unsent', bossTitle: 'The Unsent Letter', fade: 3,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'board'], ['fight', 'sort', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['sort', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: [{ ids: ['stateless', 'singlenat'] }, { ids: ['chained', 'forged'] }, { ids: ['plaintext', 'foreign'] }, 'rotlock', 'stranger'], elites: ['rule100', 'longkey'],
        notes: ['k4page6', 'k4jwt', 'k4rotate'], sorts: ['k4wall', 'k4tokens'], events: ['k4tea', 'k4stone', 'k4ward'],
        intro: intro([null, 'The high passes, in snow. Namgung\'s summer house is at the top. He went up alone.'], ['seoyeon', 'I have the knife I didn\'t use. That\'s all I\'m bringing.']),
        outro: intro([null, 'The letter is in her hand, still sealed. Addressed in his writing, the way every year\'s was.']) }),
      fl({ name: 'The Summer House', gate: 'THE LAST LETTER · THE SUMMER HOUSE', beat: 'He is not killed. He is read.', boss: 'summer', bossTitle: 'Namgung, at the Summer House', fade: 3,
        plan: [['fight', 'notes', 'fight'], ['event', 'fight', 'board'], ['fight', 'sort', 'cafe'], ['elite', 'fight', 'notes'], ['camp', 'event', 'fight'], ['fight', 'elite', 'board'], ['sort', 'fight', 'event'], ['fight', 'board', 'fight'], ['camp', 'cafe', 'camp']],
        fights: [{ ids: ['injector', 'flood'] }, { ids: ['countdown', 'expired'] }, 'byok', 'wrongaud', { ids: ['rotlock', 'gatepol'] }], elites: ['watcher', 'fedstranger'],
        notes: ['k4sse', 'k4detect', 'k4edge'], sorts: ['k4keypol', 'k4routes'], events: ['k4tea', 'k4reads', 'k4order'],
        intro: intro([null, 'The summer house. Ryu has come, and half the Alliance behind him. Namgung waits on the veranda.'], ['seoyeon', 'You wrote it for me. I\'ll read it to them.']),
        outro: intro(['c4', 'reckon']) })
    ], { sev: 0.88, dmg: 0.9 })
  ]);
  // A { who: 'c4' } line is a cue for js/c4-world.js, not a line: 'gu' plays Old Gu's letter before the Master's Room,
  // 'confront' the evidence before the Succession Hall, and 'reckon' the reckoning's end.
})();
