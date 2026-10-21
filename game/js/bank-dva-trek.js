// Question bank batch: Chapter 1's mountain trail (js/ch1-trek.js adopts these for its puzzles and for Freya's
// AdministratorAccess card): reading a policy statement, S3 ARNs, same- and cross-account access, conditions, role
// trust, Lambda execution roles, CloudTrail records, and least privilege. ev is an exhibit shown above the question
// (a policy or an error message). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  { id: "dva-2-601", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    ev: "{\n  \"Effect\": \"Allow\",\n  \"Action\": \"s3:GetObject\",\n  \"Resource\": \"arn:aws:s3:::trail-maps/*\",\n  \"Condition\": { \"Bool\": { \"aws:SecureTransport\": \"true\" } }\n}",
    q: "A bucket's only applicable policy is this one statement. A user downloads arn:aws:s3:::trail-maps/summit.png over plain HTTP. What happens?",
    opts: [
      "Denied, because the Condition is false over plain HTTP",
      "Allowed, because the Action and Resource both match",
      "Allowed, because a Condition only adds request logging",
      "Denied, because GetObject also needs s3:ListBucket"
    ], a: 0,
    no: [null,
      "They match, but a statement applies only when every element matches, the Condition included.",
      "A Condition decides whether the statement applies at all. Logging API calls is CloudTrail's job.",
      "s3:ListBucket is for listing keys. Downloading a key you name needs only s3:GetObject."],
    why: "A statement applies only when every element matches: Action, Resource and Condition. Over plain HTTP aws:SecureTransport is false, so this Allow never applies and the request falls back to the implicit deny.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition.html","https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html"] },

  { id: "dva-2-602", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A statement allows s3:GetObject on arn:aws:s3:::trail-maps/*. Which request does it allow?",
    opts: [
      "Getting trail-maps/routes/north.png",
      "Getting an object in trail-maps-backup",
      "Listing the keys in the trail-maps bucket",
      "Deleting trail-maps/routes/north.png"
    ], a: 0,
    no: [null,
      "The ARN names the trail-maps bucket followed by a slash, so a different bucket never matches.",
      "Listing is s3:ListBucket on the bucket ARN, a different action on a different resource.",
      "The statement names only s3:GetObject. Deleting is s3:DeleteObject."],
    why: "In an ARN, * matches any run of characters, slashes included, so bucket/* covers every key at any depth. It doesn't widen the action, and it doesn't match another bucket or the bucket itself.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_resource.html"] },

  { id: "dva-2-603", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A role has s3:GetObject on arn:aws:s3:::trail-locker/* but no s3:ListBucket. It requests trail-locker/rope.txt, which doesn't exist. What does S3 return?",
    opts: [
      "403 Access Denied, without saying if it exists",
      "404 Not Found, the same answer as with ListBucket",
      "400 Bad Request, because the key is invalid",
      "200 OK with an empty object body"
    ], a: 0,
    no: [null,
      "S3 answers 404 for a missing key only to a caller who has s3:ListBucket on the bucket.",
      "400 is for a malformed request. A key that doesn't exist is still a well-formed one.",
      "S3 never makes up an empty object. A missing key is an error."],
    why: "Without s3:ListBucket, S3 won't tell you whether a key exists, so a missing key comes back 403 Access Denied. With ListBucket it comes back 404 Not Found.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/API/API_GetObject.html"] },

  { id: "dva-2-604", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A bucket and a role are in the same account. The bucket policy allows the role s3:GetObject, and the role's own policies don't mention the bucket. Nothing denies it. What happens when the role reads an object?",
    opts: [
      "Allowed: in one account, either policy's Allow is enough",
      "Denied: the role's identity policy must allow it too",
      "Denied: a bucket policy can only name whole accounts, not roles",
      "Allowed, but only once the role is assumed with MFA"
    ], a: 0,
    no: [null,
      "That rule is for requests across accounts. Within one account the bucket policy's Allow is enough here.",
      "A bucket policy can name a single role or user as its Principal, not only an account.",
      "Nothing here asks for MFA. That would take a Condition on aws:MultiFactorAuthPresent."],
    why: "Within one account, an Allow in either the identity policy or the resource policy is usually enough, as long as nothing explicitly denies it.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html"] },

  { id: "dva-2-605", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    ev: "{\n  \"Effect\": \"Deny\",\n  \"Principal\": \"*\",\n  \"Action\": \"s3:*\",\n  \"Resource\": [\"arn:aws:s3:::ledge\", \"arn:aws:s3:::ledge/*\"],\n  \"Condition\": { \"Bool\": { \"aws:SecureTransport\": \"false\" } }\n}",
    q: "A bucket named ledge has this statement in its bucket policy. Which request gets through?",
    opts: [
      "An HTTPS GetObject from a role that's allowed it",
      "An HTTP GetObject from a role that's allowed s3:*",
      "An HTTP GetObject signed by the account root user",
      "An HTTPS GetObject from a role with no Allow at all"
    ], a: 0,
    no: [null,
      "Over HTTP aws:SecureTransport is false, so the Deny applies, and an explicit Deny beats any Allow.",
      "An explicit Deny in a bucket policy applies to the root user too. Root can only get past it by deleting the policy.",
      "HTTPS avoids the Deny, but nothing allows the request, so the implicit deny stands."],
    why: "Two things must be true: no explicit Deny applies (HTTPS makes aws:SecureTransport true, so this one doesn't), and some policy allows the action.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html","https://docs.aws.amazon.com/AmazonS3/latest/userguide/security-best-practices.html"] },

  { id: "dva-2-606", exam: "DVA", dva: "2.1", topic: "sts", type: "mc",
    ev: "An error occurred (AccessDenied) when calling the AssumeRole operation: User: arn:aws:sts::111122223333:assumed-role/hiker/kai is not authorized to perform: sts:AssumeRole on resource: arn:aws:iam::111122223333:role/cable-lift",
    q: "The cable-lift role's permissions policy has everything the job needs, and its trust policy names only the ranger role. A developer working as the hiker role gets this error. What should change?",
    opts: [
      "Add your role as a Principal in the lift role's trust policy",
      "Add sts:AssumeRole to the lift role's own permissions policy",
      "Attach the lift role's permissions policy to your role",
      "Call GetSessionToken first, then retry the AssumeRole"
    ], a: 0,
    no: [null,
      "The lift's permissions say what the lift can do once worn. Who may put it on is the trust policy's job.",
      "That gives your own role the lift's powers instead of letting you assume it, the opposite of least privilege.",
      "GetSessionToken returns temporary credentials for yourself. It doesn't change who a role trusts."],
    why: "The trust policy decides who may assume a role, and its permissions policies decide what the role can do. Here the trust policy doesn't name you, so AssumeRole is denied however much the role allows.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html","https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html"] },

  { id: "dva-2-607", exam: "DVA", dva: "2.1", topic: "lambda", type: "mc",
    ev: "AccessDeniedException: User: arn:aws:sts::111122223333:assumed-role/lift-motor-role/lift-motor is not authorized to perform: dynamodb:PutItem on resource: arn:aws:dynamodb:us-east-1:111122223333:table/lift-log",
    q: "A Lambda function named lift-motor writes to the lift-log DynamoDB table and fails with this error. Where does the missing permission go?",
    opts: [
      "An Allow for dynamodb:PutItem in its execution role",
      "An Allow in the function's resource-based policy",
      "An environment variable holding the ranger's access keys",
      "A trust policy on the table naming the function"
    ], a: 0,
    no: [null,
      "That policy decides who may invoke the function, not what the function may call.",
      "Keys in environment variables are long-term secrets in config, and the execution role already gives the code temporary credentials.",
      "Trust policies belong to roles and say who may assume them. A table has none."],
    why: "The function runs with its execution role's temporary credentials, so what it may call (here dynamodb:PutItem on that table) belongs in the execution role's permissions.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html"] },

  { id: "dva-4-601", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc",
    q: "In a CloudTrail record of an AssumeRole call, which field tells you who made the call?",
    opts: [
      "userIdentity",
      "eventSource",
      "requestParameters",
      "responseElements"
    ], a: 0,
    no: [null,
      "eventSource is the service that was called, such as sts.amazonaws.com.",
      "requestParameters holds what was asked for, such as the role ARN and session name.",
      "responseElements holds what came back, such as the new credentials' expiry."],
    why: "userIdentity names the caller: its type, ARN, account and, for a role session, the role behind it.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html"] },

  { id: "dva-2-608", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "You used AdministratorAccess to read one object, trail-maps/summit.png. Which statement would have been enough?",
    opts: [
      "Allow s3:GetObject on arn:aws:s3:::trail-maps/summit.png",
      "Allow s3:* on arn:aws:s3:::trail-maps/summit.png",
      "Allow s3:GetObject on arn:aws:s3:::*",
      "Allow s3:GetObject on the bucket, arn:aws:s3:::trail-maps"
    ], a: 0,
    no: [null,
      "The right resource, but every S3 action on it, deletes included.",
      "The right action, but on every bucket and object in every account it can reach.",
      "That is the bucket's ARN. GetObject acts on objects, bucket/key."],
    why: "Least privilege: the one action you used, on the one resource you used it on.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html"] },

  { id: "dva-2-609", exam: "DVA", dva: "2.1", topic: "dynamodb", type: "mc",
    q: "AdministratorAccess let your Lambda function write one item to the camp-roster table. What is the least privilege it needs?",
    opts: [
      "Allow dynamodb:PutItem on that table's ARN",
      "Allow dynamodb:* on that table's ARN",
      "Allow dynamodb:PutItem with Resource \"*\"",
      "Attach AmazonDynamoDBFullAccess to the role"
    ], a: 0,
    no: [null,
      "Every DynamoDB action on the table, including deleting it.",
      "PutItem on every table the account has.",
      "An AWS managed policy for all of DynamoDB: convenient, and far wider than one write."],
    why: "One action, dynamodb:PutItem, on one table's ARN, in the function's execution role.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/using-identity-based-policies.html"] },

  { id: "dva-2-610", exam: "DVA", dva: "2.1", topic: "sts", type: "mc",
    q: "Your code used AdministratorAccess only to assume the lift role. What is the narrowest Allow?",
    opts: [
      "sts:AssumeRole on the lift role's ARN",
      "sts:AssumeRole with Resource \"*\"",
      "iam:PassRole on the lift role's ARN",
      "sts:GetSessionToken on the lift role's ARN"
    ], a: 0,
    no: [null,
      "The right action, but it would let you try every role whose trust policy names you.",
      "PassRole lets you hand a role to a service, such as a Lambda function. It doesn't let you assume it.",
      "GetSessionToken returns credentials for yourself and takes no role."],
    why: "Assuming a role is sts:AssumeRole, and the Resource is that role's ARN. The role's trust policy still has to name you.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_permissions-to-switch.html"] },

  { id: "dva-2-611", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "You used AdministratorAccess to list the keys in trail-locker. What is the narrowest Allow?",
    opts: [
      "s3:ListBucket on arn:aws:s3:::trail-locker",
      "s3:ListBucket on arn:aws:s3:::trail-locker/*",
      "s3:GetObject on arn:aws:s3:::trail-locker/*",
      "s3:ListAllMyBuckets with Resource \"*\""
    ], a: 0,
    no: [null,
      "ListBucket acts on the bucket ARN, so an object ARN never matches it.",
      "That reads objects. It doesn't list them.",
      "That lists your buckets, not the keys inside one."],
    why: "Listing a bucket's keys is s3:ListBucket on the bucket ARN, without /*.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/API/API_ListObjectsV2.html"] },

  { id: "dva-4-602", exam: "DVA", dva: "4.1", topic: "cloudtrail", type: "mc",
    q: "AdministratorAccess let you search CloudTrail event history (LookupEvents). What is the narrowest Allow?",
    opts: [
      "cloudtrail:LookupEvents with Resource \"*\"",
      "cloudtrail:* with Resource \"*\"",
      "cloudtrail:GetTrail on the trail's ARN",
      "logs:GetLogEvents on the trail's log group"
    ], a: 0,
    no: [null,
      "Every CloudTrail action, including deleting and stopping trails.",
      "GetTrail describes one trail's settings. It doesn't search events.",
      "That reads CloudWatch Logs, which a trail may also send to. Event history isn't there."],
    why: "LookupEvents doesn't support resource-level permissions, so its Resource is \"*\". Narrow the action instead.",
    doc: ["https://docs.aws.amazon.com/service-authorization/latest/reference/list_awscloudtrail.html"] },

  { id: "dva-2-612", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A role should delete trail-maps objects only when the session was signed in with MFA. Which statement does that?",
    opts: [
      "Allow s3:DeleteObject on trail-maps/* if aws:MultiFactorAuthPresent is true",
      "Allow s3:DeleteObject on trail-maps/* if aws:SecureTransport is true",
      "Allow s3:* on trail-maps/* if aws:MultiFactorAuthPresent is true",
      "Deny s3:DeleteObject on trail-maps/* if aws:MultiFactorAuthPresent is true"
    ], a: 0,
    no: [null,
      "That checks for HTTPS, not MFA.",
      "MFA is checked, but every S3 action is allowed, not only deletes.",
      "That refuses exactly the sessions you wanted to allow."],
    why: "Allow only the action you need, with a Condition that is true only for sessions whose credentials were obtained with MFA.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  { id: "dva-2-613", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "AdministratorAccess in your account let you read a bucket in the Ranger account. What else made the read work?",
    opts: [
      "The Ranger bucket's policy allowing your role",
      "Nothing else: Action \"*\" covers other accounts",
      "Your role's trust policy naming the Ranger account",
      "A Ranger SCP that allows your account's calls"
    ], a: 0,
    no: [null,
      "Your policies speak only for your account. The Ranger account has to allow you too.",
      "A trust policy says who may assume your role. It doesn't open another account's bucket.",
      "SCPs only cap what accounts in an organization can do. They never grant anything."],
    why: "Across accounts both sides must allow: your identity policy (here AdministratorAccess) and the bucket policy in the other account.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies-cross-account-resource-access.html"] },

  { id: "dva-2-614", exam: "DVA", dva: "2.1", topic: "ssm", type: "mc",
    q: "The lift function's execution role had AdministratorAccess, and the function only reads /lift/speed from Parameter Store. What is the narrowest Allow?",
    opts: [
      "ssm:GetParameter on that parameter's ARN",
      "ssm:* on that parameter's ARN",
      "ssm:GetParameter with Resource \"*\"",
      "secretsmanager:GetSecretValue on its ARN"
    ], a: 0,
    no: [null,
      "Every Systems Manager action on it, including overwriting it.",
      "The right action, on every parameter in the account.",
      "That reads Secrets Manager secrets. Parameter Store is part of Systems Manager."],
    why: "Reading one parameter is ssm:GetParameter on arn:aws:ssm:region:account:parameter/lift/speed. A SecureString encrypted with a customer managed key also needs kms:Decrypt on that key.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-access.html"] }
);
