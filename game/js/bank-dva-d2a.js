// Question bank batch: DVA task 2.1 (authentication and authorization): IAM policy evaluation, STS, credentials and
// SigV4, resource policies, Cognito user and identity pools, API Gateway authorizers and API keys, service-to-service
// and application-level authorization. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  { id: "dva-2-101", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A role used by a build tool has the AdministratorAccess managed policy attached. The role also has a permissions boundary that allows only s3:* and dynamodb:*. A new build step calls sqs:SendMessage and gets AccessDenied. There is no SCP or resource policy involved. What should the developer change so the call succeeds?",
    opts: [
      "Add the sqs:SendMessage action to the permissions boundary policy, because the role's effective permissions are only what both policies allow.",
      "Attach a second identity-based policy to the role that allows sqs:SendMessage on the queue, so that two policies grant the action.",
      "Add an explicit Allow for sqs:SendMessage to the role's trust policy, so the build tool can use the action after it assumes the role.",
      "Detach and reattach AdministratorAccess so the role picks up the newest version of the managed policy, which covers newer SQS actions."
    ], a: 0,
    no: [null,
      "AdministratorAccess already allows the action. The boundary caps the role, and any number of identity policies can't go past it.",
      "A trust policy only says who can assume the role. It doesn't grant actions to the role's sessions.",
      "AdministratorAccess allows every action already. The boundary is what blocks SQS, not the managed policy version."],
    why: "A permissions boundary sets the most an identity-based policy can grant. The role's effective permissions are the intersection of the two, so the action must be allowed by both.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  { id: "dva-2-102", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A developer wants a role to do anything in Amazon S3 except delete objects, and writes one statement: Effect Allow, NotAction s3:DeleteObject, Resource *. A security review flags the policy as far too broad. Why?",
    opts: [
      "With Allow, NotAction matches every action in every AWS service except the one listed, so the role can also use EC2, IAM and the rest.",
      "NotAction with Allow is ignored by IAM, so the statement grants nothing and the role falls back to whatever the default role policy allows.",
      "Resource * makes the statement apply to buckets in every AWS account, so the role can read and write other companies' buckets too.",
      "NotAction turns the statement into a deny for s3:DeleteObject only, which leaves every other S3 action open to anonymous callers."
    ], a: 0,
    no: [null,
      "IAM does evaluate NotAction with Allow. It allows everything not listed, which is the problem.",
      "An identity policy can't reach another account's bucket on its own. That bucket's own policy must allow it too.",
      "The effect is still Allow, and an identity policy grants nothing to anonymous callers. The issue is how many actions it allows."],
    why: "NotAction with Allow grants every action that isn't listed, across all services. To limit it to S3, the statement needs Action s3:* plus a separate Deny for s3:DeleteObject, or a list of the S3 actions wanted.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notaction.html"] },

  { id: "dva-2-103", exam: "DVA", dva: "2.1", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "A mobile app gets AWS credentials from a Cognito identity pool's authenticated role. Each user must be able to list, read and write only objects under their own prefix in one S3 bucket, and the team doesn't want a policy per user. Which policy changes meet these requirements? (Select TWO.)",
    items: [
      { t: "Allow s3:GetObject and s3:PutObject on arn:aws:s3:::app-bucket/${cognito-identity.amazonaws.com:sub}/* in the role's policy.", ok: true },
      { t: "Allow s3:ListBucket on the bucket ARN with a condition that s3:prefix starts with ${cognito-identity.amazonaws.com:sub}/.", ok: true },
      { t: "Allow s3:GetObject and s3:PutObject on arn:aws:s3:::app-bucket/${aws:username}/* in the role's policy.", ok: false, no: "aws:username is set only for IAM users. App users come through the identity pool, so the variable doesn't resolve for them." },
      { t: "Create one IAM role per user and add each role to the identity pool's list of authenticated roles.", ok: false, no: "It doesn't scale, and the team wants to avoid per-user policies. One role with a policy variable does the job." },
      { t: "Set the bucket's ACL so that each object grants READ and WRITE to the identity pool's ID as grantee.", ok: false, no: "ACLs grant to AWS accounts or groups, not to identity pool users, and they can't scope access by prefix." }
    ],
    why: "The identity pool puts each user's identity ID in the cognito-identity.amazonaws.com:sub key, which a policy can use as a variable. Object actions use it in the resource ARN, and ListBucket, which acts on the bucket, scopes it with the s3:prefix condition.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html"] },

  { id: "dva-2-104", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A bucket policy denies all S3 actions unless aws:SourceIp is in the company's public address range. Office laptops can read the bucket. An app on EC2 in a private subnet reaches S3 through a gateway VPC endpoint, and its calls are denied even though its role allows them. What should the developer change in the bucket policy?",
    opts: [
      "Add a condition so the deny also does not apply when aws:SourceVpce equals the gateway endpoint's ID.",
      "Add the private subnet's CIDR range to the aws:SourceIp list, so the instance's private address matches the condition.",
      "Add the NAT gateway's Elastic IP address to the aws:SourceIp list, so traffic from the private subnet is treated as company traffic.",
      "Replace the Deny statement with an Allow statement for the IP range, so that the role's own policy can grant the EC2 app access."
    ], a: 0,
    no: [null,
      "aws:SourceIp isn't in the request when it comes through a VPC endpoint, and it only works with public address ranges anyway.",
      "The traffic goes through the gateway endpoint, not the NAT gateway, so S3 never sees that Elastic IP address.",
      "It would let the role in, but it also drops the IP restriction for every other principal whose policy allows S3, which weakens the control."],
    why: "Requests through a VPC endpoint don't carry aws:SourceIp. Bucket policies identify that traffic with aws:SourceVpce (the endpoint ID) or aws:SourceVpc instead.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/example-bucket-policies-vpc-endpoint.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  { id: "dva-2-105", exam: "DVA", dva: "2.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A Lambda function in account A must read objects from a bucket in account B. The team doesn't want the function to assume a role in account B; it should use its own execution role directly. Objects are encrypted with SSE-S3. Which changes are required? (Select TWO.)",
    items: [
      { t: "In account B, add a bucket policy statement that allows the function's execution role ARN to call s3:GetObject on the bucket's objects.", ok: true },
      { t: "In account A, add s3:GetObject on the account B bucket's objects to the function's execution role policy.", ok: true },
      { t: "In account B, create a role that trusts account A, and set it as the function's execution role in account A.", ok: false, no: "It adds a role in account B, which the team ruled out. Cross-account reads need only the two policies." },
      { t: "In account A, add a resource-based policy to the function that allows account B to call lambda:InvokeFunction.", ok: false, no: "That lets account B invoke the function. It does nothing for the function's reads from the bucket." },
      { t: "In account B, turn on S3 Transfer Acceleration for the bucket so it accepts requests from other accounts.", ok: false, no: "Transfer Acceleration speeds up long-distance transfers. It has nothing to do with permissions." }
    ],
    why: "A cross-account request is allowed only when both accounts allow it: the identity policy in the caller's account and the resource-based policy in the resource's account.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html"] },

  { id: "dva-2-106", exam: "DVA", dva: "2.1", topic: "sts", type: "multi", hint: "Select TWO.",
    q: "A developer's IAM user has a virtual MFA device. A new policy allows certain API calls only when aws:MultiFactorAuthPresent is true. The developer's CLI calls with the user's access keys are now denied. How can the developer run these calls from the CLI? (Select TWO.)",
    items: [
      { t: "Call aws sts get-session-token with --serial-number set to the MFA device ARN and --token-code set to the current code.", ok: true },
      { t: "Put the returned access key ID, secret access key and session token in a profile or environment variables for the calls.", ok: true },
      { t: "Add the MFA device's ARN to the default profile's credentials file next to the user's long-term access keys.", ok: false, no: "The CLI doesn't send MFA data with long-term keys on its own. The MFA code must go into an STS call that returns temporary credentials." },
      { t: "Call aws sts get-caller-identity with the MFA code, so later calls with the same keys are marked as MFA-authenticated.", ok: false, no: "GetCallerIdentity only reports who the caller is. It takes no MFA code and changes nothing about later calls." },
      { t: "Rotate the user's access keys after signing in to the console with MFA, so the new keys carry the MFA flag.", ok: false, no: "Access keys never carry MFA context, however they were created. Only temporary credentials from an MFA call do." }
    ],
    why: "GetSessionToken (or AssumeRole) accepts an MFA serial number and code and returns temporary credentials whose requests include MFA context. Long-term access keys alone never satisfy an MFA condition.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_mfa_configure-api-require.html"] },

  { id: "dva-2-107", exam: "both", dva: "2.1", saa: "1.1", topic: "sts", type: "mc",
    q: "A company signs up for a third-party SaaS cost tool that reads its billing data by assuming a role in the company's account. The vendor serves many customers from one AWS account. The company wants to make sure another customer of the vendor can't trick the tool into using the company's role. What should the company do?",
    opts: [
      "Require the vendor's unique external ID for this customer with an sts:ExternalId condition in the role's trust policy.",
      "Create an IAM user for the vendor with read-only billing access, and send its access keys to the vendor over an encrypted channel.",
      "Trust the vendor's whole AWS account in the role's trust policy, and set the role's maximum session duration to one hour.",
      "Add an aws:SourceIp condition to the role's permissions policy that lists the addresses the vendor's support staff use."
    ], a: 0,
    no: [null,
      "Long-term keys for a third party are harder to rotate and audit than a role, and they don't stop misuse inside the vendor's tool.",
      "Every customer of the vendor would share that trust, which is exactly the confused deputy problem. A shorter session doesn't change who can assume the role.",
      "The tool calls AWS from the vendor's servers, not staff addresses, and an IP check doesn't separate one customer's requests from another's."],
    why: "An external ID in the trust policy ties the role to this one customer's configuration in the vendor's tool. It prevents the confused deputy problem when a vendor assumes roles for many customers.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_common-scenarios_third-party.html"] },

  { id: "dva-2-108", exam: "DVA", dva: "2.1", topic: "sts", type: "mc",
    q: "A nightly script uses an IAM user's keys to call AssumeRole with DurationSeconds set to 14400, because its job takes about three hours. The call fails with a validation error saying the duration exceeds the maximum session duration set for the role. The role was created with default settings. What should the developer do?",
    opts: [
      "Raise the role's maximum session duration setting to at least 4 hours, which can be up to 12 hours.",
      "Call GetSessionToken instead, with DurationSeconds set to 14400, and use those credentials for the job.",
      "Remove DurationSeconds from the call, so STS gives the role session the longest duration that it allows.",
      "Assume a second role from inside the first role's session, so the two one-hour sessions run back to back."
    ], a: 0,
    no: [null,
      "Those credentials carry the user's permissions, not the role's, so the job would lose the access it assumes the role for.",
      "Without DurationSeconds, the session lasts one hour, not the maximum, so the job would still fail partway.",
      "Role chaining caps a session at one hour, and the first session still expires on its own schedule."],
    why: "AssumeRole can request up to the role's MaxSessionDuration, which defaults to 1 hour and can be set from 1 to 12 hours. Requesting more fails.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_update-role-settings.html", "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html"] },

  { id: "dva-2-109", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A Java app on EC2 uses the SDK's default credential provider chain. The instance profile role allows dynamodb:PutItem on the table, but the app's writes fail with AccessDenied, and the error names an IAM user instead of the role. An old startup script on the instance exports AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY. What should the developer do?",
    opts: [
      "Remove the exported keys from the startup script and restart the app, so the chain falls through to the instance profile.",
      "Add dynamodb:PutItem to the instance profile role's trust policy, so the SDK prefers the role over the environment keys.",
      "Detach and reattach the instance profile, so the instance metadata service sends fresh role credentials ahead of the keys.",
      "Set the AWS_REGION environment variable to the table's Region, so the SDK signs requests with the instance profile role."
    ], a: 0,
    no: [null,
      "A trust policy only controls who can assume the role, and it doesn't change the order the SDK checks for credentials.",
      "The SDK checks environment variables before the instance metadata service, so fresh role credentials are never reached.",
      "The Region only picks the endpoint. It doesn't change which credentials the chain picks."],
    why: "The default credential provider chain checks environment variables before the instance profile. Whenever access keys are in the environment, the SDK uses them and never reaches the role.",
    doc: ["https://docs.aws.amazon.com/sdk-for-java/latest/developer-guide/credentials-chain.html"] },

  { id: "dva-2-110", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A service written in Go calls an API Gateway REST API that uses IAM authorization. The service builds its own SigV4 signatures. Requests usually work, but from one container they all fail with 403 and the message Signature expired: date is now earlier than date. What is the most likely cause?",
    opts: [
      "The container's clock is several minutes off, so the timestamp in each signed request is outside the window AWS accepts.",
      "The signature uses the service name s3 instead of execute-api in the credential scope, so API Gateway rejects every signature.",
      "The container's role lacks execute-api:Invoke on the method, so API Gateway reports the denied request as an expired signature.",
      "The temporary credentials' session token is missing from the request, so API Gateway treats the access key as expired."
    ], a: 0,
    no: [null,
      "A wrong service in the scope gives a signature mismatch error, and it would fail from every container, not just one.",
      "A missing permission gives a 403 saying the caller isn't authorized to access the resource, not a signature timing error.",
      "A missing session token gives a security token error, not a date comparison."],
    why: "A SigV4 request must reach AWS within about five minutes of its timestamp. A skewed clock produces Signature expired (or Signature not yet current), so sync the clock, for example with NTP.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv-troubleshooting.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html"] },

  { id: "dva-2-111", exam: "DVA", dva: "2.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "An orders service on Lambda must call GET /inventory on a REST API in the same account. The API method uses AWS_IAM authorization and has no resource policy. Only the orders function should be able to call it, and no long-lived secrets may be used. Which steps are required? (Select TWO.)",
    items: [
      { t: "Allow execute-api:Invoke on the GET /inventory method's ARN in the orders function's execution role policy.", ok: true },
      { t: "Sign each request with SigV4 for the execute-api service, using the execution role's temporary credentials.", ok: true },
      { t: "Create an API key for the orders function, store it in an environment variable, and send it in the x-api-key header.", ok: false, no: "API keys identify callers for usage plans. They don't satisfy AWS_IAM authorization, and a key in an environment variable is a long-lived secret." },
      { t: "Add lambda:InvokeFunction for the inventory function to the orders function's role, and call it through the API URL.", ok: false, no: "That permission is for invoking the function directly. API Gateway checks execute-api:Invoke for an IAM-authorized method." },
      { t: "Sign the user in to a Cognito user pool, and send the ID token in the Authorization header with each request.", ok: false, no: "A Cognito token is for a Cognito authorizer. An AWS_IAM method expects a SigV4 signature." }
    ],
    why: "With IAM authorization, API Gateway checks the SigV4 signature and then whether the caller's identity is allowed execute-api:Invoke on that method. In the same account, an identity policy alone can grant it.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-control-access-using-iam-policies-to-invoke-api.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-authorization-flow.html"] },

  { id: "dva-2-112", exam: "DVA", dva: "2.1", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "An app running under a role in account B must invoke a Lambda function in account A directly with the SDK's Invoke call. Neither team wants to create extra roles for this. Which changes are required? (Select TWO.)",
    items: [
      { t: "In account A, add a statement to the function's resource-based policy that allows account B's role to call lambda:InvokeFunction.", ok: true },
      { t: "In account B, allow lambda:InvokeFunction on the account A function's ARN in the app role's identity-based policy.", ok: true },
      { t: "In account A, add account B's role as a trusted principal in the trust policy of the function's execution role.", ok: false, no: "The execution role is what the function uses when it runs. Trusting account B there lets B act as the function, not invoke it." },
      { t: "In account A, put the function behind an API Gateway API key and share the key value with account B's team.", ok: false, no: "It adds an API the teams didn't ask for, and API keys don't authorize callers. A resource policy grants the invoke directly." },
      { t: "In account B, create a VPC peering connection to account A's VPC so that the Invoke call can reach the function.", ok: false, no: "Invoke goes to the Lambda service endpoint, not into a VPC, so peering is irrelevant. The problem is permissions." }
    ],
    why: "A function's resource-based policy can grant another account permission to invoke it. As with any cross-account call, the caller's own identity policy in account B must also allow the action.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-cross-account.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html"] },

  { id: "dva-2-113", exam: "DVA", dva: "2.1", topic: "lambda", type: "mc",
    q: "A developer adds an S3 event notification to a bucket with a CloudFormation template, pointing at an existing Lambda function in the same account. Triggers the developer set up in the Lambda console have always worked, but now uploads never invoke the function. The function's execution role has full S3 read access. What is missing?",
    opts: [
      "A statement in the function's resource-based policy that lets s3.amazonaws.com invoke it, scoped to the bucket.",
      "A statement in the function's execution role policy that allows s3:PutBucketNotificationConfiguration on the source bucket.",
      "A bucket policy statement that allows the function's execution role to call s3:GetBucketNotification on the source bucket.",
      "An SQS queue between the bucket and the function, because S3 can deliver event notifications only to queues and topics."
    ], a: 0,
    no: [null,
      "That permission is needed by whoever sets up the notification, not by the function, and the stack already created it.",
      "Reading the notification setting doesn't let S3 call the function. S3 needs permission to invoke it.",
      "S3 can send event notifications straight to a Lambda function. A queue isn't required."],
    why: "S3 invokes the function asynchronously, so the function's resource-based policy must allow the S3 service principal. The Lambda console adds this for you; CloudFormation and the CLI need an explicit permission.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-s3.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/grant-destinations-permissions-to-s3.html"] },

  { id: "dva-2-114", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A Lambda function generates presigned GET URLs for reports, with an expiration of 12 hours. Customers say the links often stop working with 403 errors after only an hour or so. The URLs are not altered. What is the most likely cause?",
    opts: [
      "The URLs are signed with the function's temporary role credentials, and they stop working when those expire.",
      "Presigned URLs created through an SDK can last at most one hour, and S3 silently shortens any longer expiration to that limit.",
      "The bucket has versioning turned on, so a presigned URL stops working whenever a newer version of the report is written.",
      "The bucket's default encryption uses SSE-S3, which requires the caller to send encryption headers that a browser link can't add."
    ], a: 0,
    no: [null,
      "SDKs can set an expiration of up to 7 days with SigV4. The real limit here is the signing credentials.",
      "A URL for a key without a version ID fetches the current version. New versions don't invalidate it.",
      "SSE-S3 needs no request headers for a GET, so a browser can download such objects through a presigned URL."],
    why: "A presigned URL is only as valid as the credentials that signed it. Signed with temporary role credentials, it expires when the role session does, even if a longer expiration was set.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html"] },

  { id: "dva-2-115", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A bucket's Object Ownership setting is Bucket owner enforced, and access is controlled by the bucket policy. An old upload client still sends the header x-amz-acl: public-read, and its uploads now fail with 400 AccessControlListNotSupported. The objects must stay private. What should the developer do?",
    opts: [
      "Remove the ACL header from the client's PutObject requests, and keep relying on the bucket policy for access.",
      "Change Object Ownership to Bucket owner preferred, so the bucket accepts the public-read ACL on uploads.",
      "Turn off Block Public Access on the bucket, so S3 accepts uploads that request a public-read canned ACL.",
      "Grant the client's role s3:PutObjectAcl in the bucket policy, so the client is allowed to set the object ACL."
    ], a: 0,
    no: [null,
      "Uploads would succeed, but the objects would be public, which breaks the requirement.",
      "ACLs are disabled by the ownership setting. Block Public Access changes nothing about that, and the objects must stay private anyway.",
      "With ACLs disabled, no permission makes S3 accept the ACL, and the objects shouldn't be public."],
    why: "With ACLs disabled, S3 accepts only uploads with no ACL or with bucket-owner-full-control. Other ACLs fail with AccessControlListNotSupported, so the client should stop sending one.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/about-object-ownership.html"] },

  { id: "dva-2-116", exam: "DVA", dva: "2.1", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "A role's identity policy allows kms:Decrypt on a customer managed key in the same account, but its Decrypt calls fail with AccessDeniedException. The key was created with a custom key policy that lists only key administrators. Which key policy changes would let the role decrypt? (Select TWO.)",
    items: [
      { t: "Add a key policy statement that allows the role's ARN to call kms:Decrypt on the key.", ok: true },
      { t: "Add a key policy statement that gives the account principal, arn:aws:iam::<account-id>:root, kms:* so IAM policies take effect.", ok: true },
      { t: "Add a key policy statement that allows the kms.amazonaws.com service principal to call kms:Decrypt for the role.", ok: false, no: "The caller is the role, not the KMS service. Granting a service principal doesn't let the role decrypt." },
      { t: "Add a key policy statement that allows the role kms:GenerateDataKey only, since that permission also covers Decrypt calls.", ok: false, no: "Each KMS operation needs its own permission. GenerateDataKey doesn't include kms:Decrypt." },
      { t: "Turn on automatic key rotation for the key, so the new key material picks up the role's current identity policy.", ok: false, no: "Rotation changes key material, not access. Who can use a key is set by its key policy." }
    ],
    why: "A KMS key policy is the primary access control. IAM policies count only if the key policy allows the account principal; otherwise the key policy must name the role itself.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-default.html"] },

  { id: "dva-2-117", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc",
    q: "A Cognito user pool is for employees only. Sign-up must be refused for any email address outside the company's domain, and employees who do sign up should skip the confirmation code step. The developer wants the least custom code. What should the developer do?",
    opts: [
      "Add a pre sign-up Lambda trigger that throws an error for other domains and sets autoConfirmUser and autoVerifyEmail to true.",
      "Add a post confirmation Lambda trigger that deletes users from other domains and marks the remaining ones as verified.",
      "Add a pre authentication Lambda trigger that blocks sign-in for other domains and confirms the remaining users on first sign-in.",
      "Add a custom message Lambda trigger that leaves out the confirmation code for company addresses and sends an error to others."
    ], a: 0,
    no: [null,
      "Post confirmation runs after the user is confirmed, so outside users are created and confirmed before the cleanup, and employees still get a code.",
      "Pre authentication runs at sign-in, after the account already exists, so outside sign-ups are still accepted.",
      "Custom message only changes the text of messages. It can't refuse a sign-up or confirm a user."],
    why: "The pre sign-up trigger runs before a user is created: an error rejects the sign-up, and autoConfirmUser and autoVerifyEmail in the response confirm the user and email without a code.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html"] },

  { id: "dva-2-118", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc",
    q: "A multi-tenant app uses a Cognito user pool. Each user's tenant ID and plan level live in a DynamoDB table owned by the billing team and change often. The backend reads them from the ID token, and they must be current each time tokens are issued, without copying them into user attributes. What should the developer do?",
    opts: [
      "Add a pre token generation Lambda trigger that reads the table and adds the values to the ID token with claimsToAddOrOverride.",
      "Add custom attributes for tenant ID and plan level, and have the billing team update them with AdminUpdateUserAttributes.",
      "Add a post authentication Lambda trigger that reads the table and returns the values in its response to add them to the token.",
      "Add a resource server with custom scopes named after each tenant and plan, and ask for the matching scopes at sign-in."
    ], a: 0,
    no: [null,
      "It works, but it copies the data into user attributes and depends on another team keeping them in sync, which the stem rules out.",
      "Post authentication runs after sign-in for logging or analytics. Its response can't change token claims.",
      "Scopes describe what a client may access on a resource server, and the client picks them, so they can't carry per-user data reliably."],
    why: "The pre token generation trigger runs before Cognito issues tokens, so the function can look up current values and add them as claims.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-token-generation.html"] },

  { id: "dva-2-119", exam: "DVA", dva: "2.1", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "A container service on ECS receives Cognito user pool access tokens in the Authorization header from a web app, with no API Gateway in front. The developer must validate each token in the service's code before trusting any claim. Which checks are required? (Select TWO.)",
    items: [
      { t: "Verify the token's signature with the public key whose kid matches, from the user pool's /.well-known/jwks.json URL.", ok: true },
      { t: "Check that iss is the user pool's URL, token_use is access, client_id is the web app's client, and exp hasn't passed.", ok: true },
      { t: "Base64-decode the payload and accept the claims if the sub value matches a user who exists in the user pool.", ok: false, no: "Anyone can build a token with a real sub. Without checking the signature, the claims can't be trusted." },
      { t: "Verify the signature with an HMAC of the app client's secret, since Cognito signs tokens with the client secret.", ok: false, no: "Cognito signs tokens with RSA keys published at the JWKS URL, not with the app client secret." },
      { t: "Call the identity pool's GetId operation with the token and treat any identity ID that comes back as a valid user.", ok: false, no: "GetId is for getting AWS credentials through an identity pool. It isn't a token validation step for an API." }
    ],
    why: "Validating a Cognito JWT means checking its RS256 signature against the pool's JWKS by kid, then checking the claims: issuer, token use, audience or client ID, and expiry.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html"] },

  { id: "dva-2-120", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc",
    q: "A mobile app signs users in to a Cognito user pool. Users complain that they must enter their password every hour. The product team wants users to stay signed in for 30 days unless they sign out, and the app must not store passwords. What should the developer do?",
    opts: [
      "Store the refresh token securely, set its lifetime to 30 days, and use it to get new ID and access tokens.",
      "Set the ID token and access token expiration to 30 days on the app client, so the tokens from the first sign-in last a month.",
      "Store the user's password in the device keychain, and call InitiateAuth with it whenever the access token is about to expire.",
      "Exchange the ID token for identity pool credentials, and reuse those AWS credentials as the app's sign-in proof for 30 days."
    ], a: 0,
    no: [null,
      "ID and access tokens can last at most one day, so 30 days isn't allowed, and long-lived access tokens are riskier anyway.",
      "It keeps users signed in, but it stores the password on the device, which the team ruled out.",
      "Identity pool credentials are temporary AWS credentials that expire within hours, and they don't prove a user pool sign-in to the app."],
    why: "Refresh tokens get new ID and access tokens without the password. Their lifetime is set per app client, from 60 minutes up to 10 years (30 days by default).",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-refresh-token.html", "https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html"] },

  { id: "dva-2-121", exam: "DVA", dva: "2.1", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "An app signs users in with a Cognito user pool and gets AWS credentials from an identity pool. Users in the pool's admins group need an AdminRole with broader S3 access; everyone else should get the default authenticated role. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Assign AdminRole to the admins group in the user pool, so the group's role goes into the users' tokens.", ok: true },
      { t: "Set the identity pool's authenticated role selection to choose the role from the token, with the default role as fallback.", ok: true },
      { t: "Attach AdminRole's permissions policy directly to the admins group, the way an IAM group policy works for IAM users.", ok: false, no: "User pool groups aren't IAM groups and can't hold policies. A group can only reference an IAM role." },
      { t: "Turn on guest access in the identity pool and give the unauthenticated role the admin permissions for admin users.", ok: false, no: "Guest access is for users who aren't signed in, so every anonymous user would get admin permissions." },
      { t: "Set the identity pool to use the default authenticated role, and let the admins call AssumeRole on AdminRole from the app.", ok: false, no: "The app would need extra trust and code for every admin, when role selection from the token does this for you." }
    ],
    why: "A user pool group can carry an IAM role, which Cognito puts in the cognito:roles and cognito:preferred_role claims. An identity pool set to choose the role from the token uses it.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/role-based-access-control.html"] },

  { id: "dva-2-122", exam: "both", dva: "2.1", saa: "1.2", topic: "cognito", type: "mc",
    q: "A recipe app lets anyone browse public images in an S3 bucket without signing in. Signed-in users, managed in a Cognito user pool, can also upload images. The app calls S3 directly from the device and must not embed any access keys. Which solution meets these requirements?",
    opts: [
      "Use a Cognito identity pool with guest access on, a read-only unauthenticated role, and an authenticated role that also allows uploads.",
      "Make the bucket public for reads, and give signed-in users an IAM user each with upload rights, created by a post confirmation trigger.",
      "Use a Cognito identity pool with guest access off, and give the authenticated role read access so the app can sign users in before browsing.",
      "Use only the user pool, and send its ID token with S3 requests so that S3 checks it against the bucket policy for uploads."
    ], a: 0,
    no: [null,
      "An IAM user per app user means long-term keys on devices and an IAM user count limit. Identity pools hand out temporary credentials instead.",
      "With guest access off, people who aren't signed in get no credentials, so they couldn't browse as required.",
      "S3 doesn't accept user pool tokens. The app needs AWS credentials, which an identity pool provides."],
    why: "Identity pools give temporary AWS credentials to both guests (unauthenticated role) and signed-in users (authenticated role), so each group gets only its own permissions.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/identity-pools.html"] },

  { id: "dva-2-123", exam: "DVA", dva: "2.1", topic: "cognito", type: "mc",
    q: "A single-page app running only in the browser will sign users in through the Cognito managed login pages and then call an API with the access token. The app can't keep a secret, and the team wants refresh tokens. Which app client setup is MOST secure?",
    opts: [
      "A public app client with no client secret, using the authorization code grant with PKCE.",
      "A confidential app client with a client secret embedded in the app's JavaScript bundle.",
      "A public app client with no client secret, using the implicit grant to get tokens in the URL.",
      "A confidential app client with the client credentials grant, using the secret from the app."
    ], a: 0,
    no: [null,
      "A secret shipped to every browser isn't a secret. Anyone can read it from the bundle.",
      "The implicit grant puts tokens in the redirect URL, can't use PKCE and returns no refresh token.",
      "Client credentials is for machine-to-machine access with no user, and it puts the secret in the browser."],
    why: "Browser apps are public clients with no secret. The authorization code grant with PKCE is the recommended flow for them: tokens come from the token endpoint, and a refresh token is included.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-client-apps.html", "https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html"] },

  { id: "dva-2-124", exam: "DVA", dva: "2.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A REST API uses a TOKEN Lambda authorizer with result caching set to 300 seconds. The authorizer returns a policy that allows execute-api:Invoke only on the exact method ARN in the request. A user who calls GET /orders and then, a minute later, GET /profile with the same token gets 403 on the second call. Which changes fix this? (Select TWO.)",
    items: [
      { t: "Have the authorizer return a policy that covers every method the user may call, for example with wildcards in the ARN.", ok: true },
      { t: "Set the authorizer's result TTL to 0, so API Gateway calls the authorizer for every request instead of caching.", ok: true },
      { t: "Change the authorizer from TOKEN to REQUEST, and keep the token header as its only identity source.", ok: false, no: "The cache key would still be just the token, so the same narrow cached policy would be reused." },
      { t: "Turn on stage caching for the API, so the response to GET /profile is cached separately from GET /orders.", ok: false, no: "Stage caching stores responses from the backend. The 403 comes from the cached authorizer policy." },
      { t: "Add a usage plan with a higher throttle for the user's API key, so the second request isn't rejected.", ok: false, no: "Throttling returns 429, not 403, and usage plans don't change the authorizer's policy." }
    ],
    why: "With caching on, API Gateway reuses the policy cached for a token on every method. A policy naming one method denies the rest, so return a policy that covers the whole API for that user or turn caching off.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html"] },

  { id: "dva-2-125", exam: "DVA", dva: "2.1", topic: "apigateway", type: "mc",
    q: "A Lambda authorizer on a REST API already looks up each caller's tenant ID while validating the token. The backend Lambda function uses proxy integration and also needs the tenant ID. The team wants to avoid a second lookup in the backend. What should the developer do?",
    opts: [
      "Return the tenant ID in the authorizer's context map, and read it in the backend from event.requestContext.authorizer.",
      "Return the tenant ID as the principalId in a usage plan, and read it in the backend from the request's x-api-key header.",
      "Write the tenant ID into the request's Authorization header from the authorizer, and parse it in the backend function.",
      "Store the tenant ID in a stage variable from the authorizer, and read it in the backend from event.stageVariables."
    ], a: 0,
    no: [null,
      "principalId isn't part of a usage plan, and the x-api-key header carries an API key, not authorizer output.",
      "An authorizer returns a policy and context. It can't rewrite the client's request headers.",
      "Stage variables are fixed per stage. An authorizer can't set them for each request."],
    why: "An authorizer can return a context map of string, number and boolean values. With proxy integration, API Gateway passes it to the backend in requestContext.authorizer.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html"] },

  { id: "dva-2-126", exam: "DVA", dva: "2.1", topic: "apigateway", type: "mc",
    q: "A team is building an HTTP API in API Gateway. Clients sign in with an external OpenID Connect provider and send its access tokens as bearer tokens. Each route must check the token's signature, issuer, audience and a required scope, with the LEAST development effort. What should the developer do?",
    opts: [
      "Attach a JWT authorizer with the provider's issuer URL and audience, and set the required scopes on each route.",
      "Attach a Lambda authorizer that downloads the provider's keys and validates each token, then returns allow or deny.",
      "Attach a COGNITO_USER_POOLS authorizer that points at the external provider's issuer URL instead of a user pool.",
      "Turn on IAM authorization for each route, and have clients exchange their token for AWS credentials before calling."
    ], a: 0,
    no: [null,
      "It works, but it means writing and maintaining validation code that a JWT authorizer does for you.",
      "That authorizer type exists only for REST APIs, and it accepts only Amazon Cognito user pools.",
      "It needs a federation step and SigV4 signing in every client, which is far more work than validating the token."],
    why: "An HTTP API JWT authorizer validates a JWT from any OIDC or OAuth 2.0 issuer: it checks the signature against the issuer's JWKS, plus iss, aud or client_id, exp, and the route's scopes.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html"] },

  { id: "dva-2-127", exam: "DVA", dva: "2.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A developer's IAM user lives in a central account. To test against a dev account, the developer must use DevTestRole there, whose trust policy requires MFA. The developer wants CLI and SDK calls on a laptop to switch to the role automatically, without copying temporary keys by hand. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Add a profile to ~/.aws/config with role_arn set to DevTestRole, source_profile set to the user's profile, and mfa_serial set to the device.", ok: true },
      { t: "Run commands with --profile set to that role profile, or export AWS_PROFILE with its name for the whole shell session.", ok: true },
      { t: "Add the role's ARN as aws_access_key_id in the user's profile in ~/.aws/credentials, so the CLI signs requests as the role.", ok: false, no: "aws_access_key_id holds an access key ID, not a role ARN. Role settings go in a role profile in the config file." },
      { t: "Create access keys for DevTestRole in the dev account, and add them to a new profile in the ~/.aws/credentials file.", ok: false, no: "Roles don't have access keys. They provide only temporary credentials when assumed." },
      { t: "Set credential_source to Ec2InstanceMetadata in the role profile, so the CLI takes the source credentials from the laptop.", ok: false, no: "Ec2InstanceMetadata reads an EC2 instance's role. A laptop has no instance metadata, so the user's profile is the source." }
    ],
    why: "A role profile names the role, the profile whose credentials assume it, and the MFA device. The CLI and SDKs then call AssumeRole, prompt for the MFA code and cache the temporary credentials.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html"] },

  { id: "dva-2-128", exam: "both", dva: "2.1", saa: "1.1", topic: "apigateway", type: "mc",
    q: "A REST API in account A must be callable by backend jobs that run under IAM roles in a partner's account B, and by no one else. The partner's jobs can sign requests with SigV4. Which solution is MOST secure?",
    opts: [
      "Use AWS_IAM authorization, with an API resource policy that allows execute-api:Invoke to the partner's roles.",
      "Require an API key on the methods, give the partner a key, and add a usage plan that limits the partner's request rate.",
      "Add a Lambda authorizer that allows requests whose source IP address is in a list of addresses the partner provided.",
      "Set AWS_IAM authorization on the methods, and create IAM users in account A for the partner's jobs to sign requests with."
    ], a: 0,
    no: [null,
      "An API key is a shared string that identifies a caller for metering. It isn't authorization, and anyone holding it can call.",
      "Source IP addresses can change and be shared, and nothing checks the caller's identity.",
      "It works, but it gives the partner long-term keys to manage and rotate when its own roles can be allowed directly."],
    why: "For cross-account IAM access to a REST API, the API's resource policy must allow the caller, and the caller's own IAM policy must allow execute-api:Invoke. Requests are signed with the roles' temporary credentials.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-authorization-flow.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies.html"] },

  { id: "dva-2-129", exam: "DVA", dva: "2.1", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "A nightly reporting service with no user must call a REST API that uses a Cognito user pool authorizer. The service should get only read access, and the API should check that access per method. Which steps are required? (Select TWO.)",
    items: [
      { t: "Create a resource server with a reports/read scope, and an app client with a client secret allowed that scope for client credentials.", ok: true },
      { t: "Set reports/read as an OAuth scope on the API methods, so the authorizer checks the access token's scopes.", ok: true },
      { t: "Create a user in the pool for the service, and have it send its ID token with the scope in the Authorization header.", ok: false, no: "A user account for a machine is a workaround, and an ID token carries no OAuth scopes for the authorizer to check." },
      { t: "Turn on the client credentials grant in the web app's existing authorization code app client, and share its secret.", ok: false, no: "Cognito doesn't allow client credentials on the same app client as authorization code or implicit grants." },
      { t: "Give the service's role execute-api:Invoke on the methods, and keep the Cognito user pool authorizer unchanged.", ok: false, no: "A Cognito authorizer checks tokens, not IAM permissions, so the request still needs a valid token." }
    ],
    why: "Machine-to-machine access with Cognito uses the client credentials grant: a confidential app client gets an access token with custom scopes from a resource server, and the authorizer checks those scopes per method.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html", "https://docs.aws.amazon.com/cognito/latest/developerguide/federation-endpoints-oauth-grants.html"] },

  { id: "dva-2-130", exam: "DVA", dva: "2.1", topic: "verifiedpermissions", type: "mc",
    q: "A document app signs users in with Cognito. Rules such as owners can edit, team members can view, and nobody can open documents marked archived keep changing, and the security team wants to manage them as policies outside the app's code. Which solution meets these requirements?",
    opts: [
      "Write the rules as Cedar policies in an Amazon Verified Permissions policy store, and ask it for an authorization decision on each request.",
      "Create an IAM policy per user with a document ARN for each document they may open, and attach it to the user pool's authenticated role.",
      "Create a Cognito user pool group per document, add each allowed user to it, and check the cognito:groups claim in the app.",
      "Put the rules in the API's Lambda authorizer code, and redeploy the authorizer whenever the security team changes a rule."
    ], a: 0,
    no: [null,
      "App documents aren't AWS resources with ARNs, and per-user IAM policies don't scale or express rules like team membership.",
      "A group per document grows without limit and still leaves the rules in app code.",
      "It keeps the rules inside code, which is what the security team wants to get away from."],
    why: "Verified Permissions is a managed authorization service for your own apps. Policies are written in Cedar and kept outside the code, and the app asks for an allow or deny decision.",
    doc: ["https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/what-is-avp.html"] },

  { id: "dva-2-131", exam: "DVA", dva: "2.1", topic: "ec2", type: "mc",
    q: "A developer creates a role with the CLI using a trust policy for ec2.amazonaws.com, then runs aws ec2 associate-iam-instance-profile with the role's name. The command fails because no instance profile with that name exists. Roles created in the console never had this problem. What should the developer do?",
    opts: [
      "Create an instance profile with create-instance-profile, add the role with add-role-to-instance-profile, then associate it.",
      "Add the instance's ARN to the role's trust policy as a principal, then rerun the command with the role's ARN instead of its name.",
      "Attach the role directly to the instance with aws iam attach-role-policy, giving the instance ID as the policy target.",
      "Recreate the role with a trust policy for ssm.amazonaws.com, because the console uses Systems Manager to deliver role credentials."
    ], a: 0,
    no: [null,
      "EC2 takes an instance profile, not a role, and instances aren't valid principals in a trust policy.",
      "attach-role-policy attaches a managed policy to a role. It can't target an instance.",
      "EC2 delivers role credentials through the instance metadata service, and the trust policy must name ec2.amazonaws.com."],
    why: "An EC2 instance gets a role through an instance profile. The console creates a profile with the same name as the role for you; with the CLI or API you create it and add the role yourself.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_switch-role-ec2_instance-profiles.html"] },

  { id: "dva-2-132", exam: "DVA", dva: "2.1", topic: "ecs", type: "multi", hint: "Select TWO.",
    q: "An ECS task on Fargate gets a database password through the secrets section of its task definition, which references a Secrets Manager secret. The app's code also reads and writes a DynamoDB table with the SDK. Tasks fail to start because the secret can't be retrieved. Which permissions should the developer set? (Select TWO.)",
    items: [
      { t: "Grant secretsmanager:GetSecretValue on the secret to the task execution role.", ok: true },
      { t: "Grant the DynamoDB read and write actions on the table to the task role.", ok: true },
      { t: "Grant secretsmanager:GetSecretValue on the secret to the task role only.", ok: false, no: "Secrets in the task definition are fetched by the ECS agent before the containers start, using the execution role." },
      { t: "Grant the DynamoDB read and write actions on the table to the task execution role.", ok: false, no: "The execution role is for ECS itself (pulling images, logs, secrets). The app's SDK calls use the task role." },
      { t: "Grant both permissions to the instance role of the container instances in the cluster.", ok: false, no: "Fargate tasks have no container instances you manage, and roles should be scoped to the task anyway." }
    ],
    why: "The task execution role is used by ECS to pull images, send logs and inject secrets before the app starts. The task role supplies credentials to the app's own AWS calls.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html"] },

  { id: "dva-2-133", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "mc",
    q: "Batch servers in a company's own data center call S3 and SQS with IAM user access keys that are rarely rotated. The company already issues X.509 certificates to these servers from its own certificate authority. It wants the servers to use short-lived AWS credentials without storing access keys. What should a developer do?",
    opts: [
      "Register the CA as an IAM Roles Anywhere trust anchor, add a profile with a role, and run the credential helper.",
      "Create an IAM OIDC identity provider for the CA, and have each server call AssumeRoleWithWebIdentity with its certificate.",
      "Install the CloudWatch agent on the servers with an on-premises configuration, so it supplies credentials to the SDKs on each host.",
      "Store the access keys in Secrets Manager with automatic rotation, and have the servers read the current keys before each job."
    ], a: 0,
    no: [null,
      "An OIDC provider trusts tokens from an OpenID Connect issuer, not X.509 certificates from a CA.",
      "The CloudWatch agent collects metrics and logs. It doesn't hand out credentials, and it needs credentials itself on premises.",
      "The servers would still need long-term credentials to read the secret, and they would still use access keys."],
    why: "IAM Roles Anywhere exchanges X.509 certificates from a trusted CA (the trust anchor) for temporary credentials of a role named in a profile, so workloads outside AWS need no long-term keys.",
    doc: ["https://docs.aws.amazon.com/rolesanywhere/latest/userguide/introduction.html"] },

  { id: "dva-2-134", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A developer runs aws lambda create-function with --role set to an existing execution role. The call fails with an AccessDenied error saying the developer is not authorized to perform iam:PassRole on that role. The developer's policy already allows lambda:CreateFunction. What should be added to the developer's policy?",
    opts: [
      "Allow iam:PassRole on the execution role's ARN, with an iam:PassedToService condition of lambda.amazonaws.com.",
      "Allow sts:AssumeRole on the execution role's ARN, so the developer can act as the role while creating the function.",
      "Allow iam:CreateRole on all resources, so the developer can create a new execution role during the same call.",
      "Allow lambda:AddPermission on the new function's ARN, so the developer can attach the role to the function."
    ], a: 0,
    no: [null,
      "Assuming the role isn't needed. Giving a role to a service is a separate permission, iam:PassRole.",
      "A new role would still have to be passed to Lambda, so the same PassRole check fails, and it grants far more.",
      "AddPermission edits the function's resource-based policy. It has nothing to do with the execution role."],
    why: "Handing a role to an AWS service when you configure it needs iam:PassRole on that role. Scoping it to the role's ARN and iam:PassedToService keeps users from passing more powerful roles.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_use_passrole.html"] },

  { id: "dva-2-135", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "Developers need to create execution roles for their own Lambda functions without an administrator's help. The security team requires that no role they create can have more access than a policy named DevBoundary, and that developers can't get around this. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Allow developers iam:CreateRole and iam:PutRolePolicy only when the iam:PermissionsBoundary condition equals the DevBoundary ARN.", ok: true },
      { t: "Deny developers changes to the DevBoundary policy and the removal of permissions boundaries from roles.", ok: true },
      { t: "Set DevBoundary as the permissions boundary on the developers' own IAM roles, and grant them iam:CreateRole.", ok: false, no: "A boundary on the developer limits the developer only. Roles they create don't inherit it." },
      { t: "Allow developers iam:CreateRole on all resources, and review new roles each week using IAM Access Analyzer.", ok: false, no: "A weekly review finds problems after the fact. It doesn't stop a developer from creating a powerful role." },
      { t: "Allow developers iam:PassRole on all roles, so Lambda checks the DevBoundary policy when the role is passed.", ok: false, no: "Lambda doesn't check boundaries when a role is passed, and broad PassRole makes escalation easier." }
    ],
    why: "Requiring the iam:PermissionsBoundary condition on role creation forces every new role to carry the boundary. Denying edits to the boundary and its removal closes the way around it.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html"] },

  { id: "dva-2-136", exam: "DVA", dva: "2.1", topic: "iam", type: "mc",
    q: "A policy is meant to block every action for IAM users who didn't sign in with MFA. It has a Deny statement with the condition Bool aws:MultiFactorAuthPresent false. Users still run any command from the CLI with their long-term access keys and no MFA. What should the developer change?",
    opts: [
      "Change the operator to BoolIfExists, because the key is missing from requests signed with long-term keys.",
      "Change the value to true, because the condition is evaluated in reverse when it appears in a statement with the Deny effect.",
      "Move the condition into the users' trust policy, because MFA conditions are checked only when credentials are issued.",
      "Change the operator to Null with the value false, because Null checks whether the user has an MFA device registered."
    ], a: 0,
    no: [null,
      "Conditions aren't reversed under Deny. Value true would deny MFA users instead.",
      "IAM users don't have trust policies. Trust policies belong to roles.",
      "Null tests whether the key is in the request, not whether a device is registered, and Null false would match only requests that include the key."],
    why: "aws:MultiFactorAuthPresent is absent from requests signed with long-term keys, and a Bool test on a missing key doesn't match, so the Deny is skipped. Deny with BoolIfExists false also covers requests where the key is missing.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] },

  { id: "dva-2-137", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "mc",
    q: "A company has dozens of project teams. Each team's developers must manage only their own team's EC2 instances and Secrets Manager secrets. New teams and resources appear every week, and the cloud team wants to stop editing policies each time. Which approach has the LEAST operational overhead?",
    opts: [
      "Tag principals and resources with a team key, and use one policy whose condition requires aws:ResourceTag/team to match aws:PrincipalTag/team.",
      "Write a policy per team that lists the ARNs of that team's instances and secrets, and update it whenever the team adds a resource.",
      "Put each team in its own IAM group with a policy listing its resource ARNs, and add new developers to the matching group.",
      "Create a permissions boundary per team that lists the team's resource ARNs, and attach it to each developer's role."
    ], a: 0,
    no: [null,
      "This is what the cloud team does now: every new resource means a policy edit.",
      "Groups help with people, but the policies still list resource ARNs and still need editing for every new resource.",
      "Boundaries limit permissions but don't grant any, and listing ARNs per team still needs constant edits."],
    why: "Attribute-based access control compares tags on the caller and the resource, so one policy covers new teams and resources as long as they are tagged.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/introduction_attribute-based-access-control.html"] },

  { id: "dva-2-138", exam: "DVA", dva: "2.1", topic: "sqs", type: "mc",
    q: "A developer subscribes an SQS queue to an SNS topic in the same account. Messages published to the topic never arrive in the queue. The subscription is confirmed, and the queue's access policy is the default one that allows only the account owner. What should the developer do?",
    opts: [
      "Add a queue policy statement allowing sns.amazonaws.com sqs:SendMessage, with aws:SourceArn set to the topic.",
      "Add sqs:SendMessage on the queue to the execution role of the topic, which SNS uses when it delivers messages.",
      "Add a topic policy statement allowing the queue's ARN to call sns:Subscribe, so it can receive the published messages.",
      "Turn on raw message delivery for the subscription, so SNS sends the message without the envelope the queue rejects."
    ], a: 0,
    no: [null,
      "SNS topics don't have execution roles. The queue's resource policy has to allow the SNS service.",
      "The subscription already exists and is confirmed. The missing piece is permission to send to the queue.",
      "Raw delivery changes the message format only. The queue accepts either format once SNS is allowed to send."],
    why: "SNS delivers to SQS as the sns.amazonaws.com service principal, so the queue policy must allow it to send. aws:SourceArn limits that to the one topic, which avoids a confused deputy.",
    doc: ["https://docs.aws.amazon.com/sns/latest/dg/subscribe-sqs-queue-to-sns-topic.html"] },

  { id: "dva-2-139", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A GitHub Actions workflow deploys to AWS with IAM user access keys stored as repository secrets. The company wants to remove the keys and let only the main branch of one repository deploy. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Add an IAM OIDC identity provider for token.actions.githubusercontent.com, with sts.amazonaws.com as the audience.", ok: true },
      { t: "Create a role that trusts the provider for sts:AssumeRoleWithWebIdentity, with a sub condition for the repository's main branch.", ok: true },
      { t: "Create a role that trusts the provider, with no conditions, and limit the deploy permissions in its permissions policy instead.", ok: false, no: "Without a sub condition, any GitHub repository could assume the role. IAM requires the sub condition for this provider." },
      { t: "Rotate the IAM user's access keys every day with a scheduled Lambda function, and update the repository secrets each time.", ok: false, no: "The workflow still uses long-term keys, which the company wants removed, and the rotation adds moving parts." },
      { t: "Create an IAM SAML identity provider using GitHub's metadata, and have the workflow call AssumeRoleWithSAML.", ok: false, no: "GitHub Actions issues OIDC tokens, not SAML assertions, so the workflow federates with web identity." }
    ],
    why: "The workflow trades its GitHub OIDC token for temporary credentials with AssumeRoleWithWebIdentity. The role's trust policy checks the token's sub claim, so only the named repository and branch can assume it.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html"] },

  { id: "dva-2-140", exam: "both", dva: "2.1", saa: "1.1", topic: "s3", type: "mc",
    q: "A shared artifacts bucket must allow s3:GetObject to principals in any of the company's AWS accounts. The company is in AWS Organizations and adds accounts often. The team doesn't want to edit the bucket policy whenever an account joins or leaves. What should the developer put in the bucket policy?",
    opts: [
      "An Allow statement for Principal * with a condition that aws:PrincipalOrgID equals the organization's ID.",
      "An Allow statement that lists each member account's root ARN as a principal, generated by a nightly script.",
      "An Allow statement for Principal * with a condition that aws:SourceIp is in the company's office range.",
      "An Allow statement for Principal * with no condition, plus Block Public Access left on to stop outsiders."
    ], a: 0,
    no: [null,
      "It works, but it means edits whenever an account joins or leaves, which the team wants to avoid.",
      "Office IP addresses don't match calls from workloads in AWS accounts, and they say nothing about the caller's account.",
      "Block Public Access would reject a policy that grants everyone, and without it the bucket would be public."],
    why: "aws:PrincipalOrgID matches any principal from an account in the organization, so membership changes are picked up without editing the policy.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html"] }
);
