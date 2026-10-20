// Question bank batch: DVA Domain 2 gap fill (SSH keys and dev certificates, cross-account encryption, key rotation,
// data classification, Lambda environment variable encryption, log masking, multi-tenant access, and 2.1 auth items).
// Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  { id: "dva-2-301", exam: "DVA", dva: "2.2", topic: "ssm", type: "multi", hint: "Select TWO.",
    q: "Developers reach EC2 instances in private subnets through a bastion host with a shared key pair. Security wants to remove the bastion, close inbound port 22 and stop managing SSH keys, while IAM controls who gets a shell. The subnets have no route to the internet, and the instances run a recent Amazon Linux AMI with the SSM Agent. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Attach an instance profile whose role includes the AmazonSSMManagedInstanceCore policy, and start shells with Session Manager.", ok: true },
      { t: "Create interface VPC endpoints for ssm, ssmmessages and ec2messages, and allow HTTPS to them from the instances.", ok: true },
      { t: "Create a gateway VPC endpoint for Systems Manager, and add it to the route tables of the private subnets.", ok: false, no: "Gateway endpoints exist only for Amazon S3 and DynamoDB. Systems Manager is reached through interface endpoints." },
      { t: "Keep port 22 open only from the Session Manager service, and import each developer's public key to EC2.", ok: false, no: "Session Manager works over the agent's outbound HTTPS connection, so it needs no inbound port and no SSH keys." },
      { t: "Give each instance an Elastic IP address, and allow inbound SSH only from the office's public IP range.", ok: false, no: "This keeps inbound SSH and key management, which is what the team wants to remove." }
    ],
    why: "Session Manager opens shells through the SSM Agent's outbound connection, with access controlled by IAM, so no inbound ports, bastions or SSH keys are needed. The instance role needs AmazonSSMManagedInstanceCore, and subnets without internet access need interface endpoints for ssm, ssmmessages and ec2messages.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager.html", "https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html"] },

  { id: "dva-2-302", exam: "DVA", dva: "2.2", topic: "ec2", type: "mc",
    q: "Developers sometimes need SSH access to EC2 instances in a public subnet to debug them, and must keep using their standard ssh client over port 22. Security no longer allows long-lived private keys that are shared or kept on laptops, and wants IAM to decide which developer may connect to which instance. What should the developer do?",
    opts: [
      "Use EC2 Instance Connect, and grant each developer ec2-instance-connect:SendSSHPublicKey on the allowed instance ARNs.",
      "Create one key pair per developer with create-key-pair, and store each private key in Secrets Manager for retrieval.",
      "Use Session Manager port forwarding to port 22, and keep the existing shared key pair in Parameter Store for sign-in.",
      "Use IAM Roles Anywhere to give each laptop a certificate, and configure sshd to accept that certificate as the SSH key."
    ], a: 0,
    no: [null,
      "Each private key is still long-lived, and nothing stops developers from keeping copies of it on their laptops.",
      "The shared, long-lived key pair is exactly what security wants removed.",
      "Roles Anywhere issues temporary AWS credentials for API calls. sshd doesn't use it to authenticate SSH logins."],
    why: "EC2 Instance Connect pushes a one-time public key to the instance metadata, where it stays for 60 seconds, and IAM policies on SendSSHPublicKey control who can push keys to which instances. Developers then connect with their usual SSH client.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-linux-inst-eic.html", "https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-connect-prerequisites.html"] },

  { id: "dva-2-303", exam: "DVA", dva: "2.2", topic: "cloudformation", type: "mc",
    q: "A CloudFormation template creates a new key pair with an AWS::EC2::KeyPair resource that has no PublicKeyMaterial property, and launches a test instance with it. After the stack is created, a developer needs the private key to connect over SSH, but neither the stack outputs nor the EC2 console show it. Where should the developer get the private key?",
    opts: [
      "Run ssm get-parameter --with-decryption on /ec2/keypair/<key pair ID>, and save the value as a .pem file.",
      "Run ec2 describe-key-pairs with --include-public-key, and derive the private key from the public key that it returns.",
      "Add Fn::GetAtt for the KeyPair resource's PrivateKey attribute to the stack outputs, and then update the stack.",
      "Run ec2 create-key-pair again with the same key name, which returns the private key of the existing key pair."
    ], a: 0,
    no: [null,
      "A private key can't be derived from its public key; that is the point of a key pair.",
      "The resource returns only KeyPairId and KeyFingerprint through Fn::GetAtt, never the private key.",
      "The call fails because the name is already in use. EC2 returns a private key only when it creates a new pair."],
    why: "When CloudFormation creates a new key pair, it saves the private key in Systems Manager Parameter Store under /ec2/keypair/<key_pair_id>. It deletes that parameter when the stack deletes the key pair.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html", "https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-keypair.html"] },

  { id: "dva-2-304", exam: "both", dva: "2.2", saa: "1.3", topic: "ebs", type: "multi", hint: "Select TWO.",
    q: "A team in account A must share an EBS snapshot of a test database volume with a partner team in account B, which will create its own volumes from it. The snapshot is encrypted with the default AWS managed key (aws/ebs). Which steps are required? (Select TWO.)",
    items: [
      { t: "Copy the snapshot, encrypting the copy with a customer managed KMS key, and share the copy with account B.", ok: true },
      { t: "Allow account B to use that customer managed key in its key policy, so B can decrypt the shared snapshot.", ok: true },
      { t: "Edit the key policy of the aws/ebs key to allow account B, and then share the original snapshot with B.", ok: false, no: "You can't change the key policy of an AWS managed key, and snapshots encrypted with it can't be shared." },
      { t: "Make the snapshot public so account B can copy it, and make it private again once the copy is done.", ok: false, no: "Only unencrypted snapshots can be shared publicly, and public sharing would expose the data to every account." },
      { t: "Turn on EBS encryption by default in account B, so its new volumes use B's own key for the snapshot data.", ok: false, no: "Account B still needs permission on the key that encrypted the source snapshot before it can read it." }
    ],
    why: "Snapshots encrypted with the default AWS managed key can't be shared. Re-encrypt a copy under a customer managed key, share the copy, and share the key through its key policy.",
    doc: ["https://docs.aws.amazon.com/ebs/latest/userguide/ebs-modifying-snapshot-permissions.html"] },

  { id: "dva-2-305", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "A bucket in account A must hold objects encrypted with SSE-KMS under a customer managed key in account A, whose key policy lets a partner's upload role in account B use it. The partner's code sets the x-amz-server-side-encryption-aws-kms-key-id header to alias/shared-upload. Uploads succeed, but account A's readers get AccessDenied, and CloudTrail shows a key in account B was used. What should the partner change?",
    opts: [
      "Send account A's full key ARN in the header, since KMS resolves an alias name in the caller's account.",
      "Have account A's readers get kms:Decrypt on the key in account B through their own IAM identity policies.",
      "Turn on S3 Bucket Keys for the bucket, so S3 uses one bucket-level key for the uploads from every account.",
      "Set the bucket's Object Ownership to Bucket owner enforced, so account A owns and can decrypt every upload."
    ], a: 0,
    no: [null,
      "Account B's key policy would also have to allow them, and the data is meant to be under account A's key.",
      "Bucket Keys cut KMS request costs. They don't change which KMS key encrypts each object.",
      "Owning an object doesn't grant use of the KMS key in account B that encrypted it."],
    why: "When a request names a KMS key by alias, KMS resolves the alias in the requester's account, so the partner's own key was used. A full key ARN always points to account A's key.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html"] },

  { id: "dva-2-306", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A symmetric customer managed key encrypts data keys for a billing app, with automatic rotation on and a 365-day period. After an audit, security requires new key material right away, without changing the key ID or ARN that apps and grants reference, and without moving the yearly rotation schedule. What should the developer do?",
    opts: [
      "Call RotateKeyOnDemand, which adds new key material now and leaves the automatic schedule as it is.",
      "Turn automatic rotation off and on again with EnableKeyRotation, which rotates the key material at that moment.",
      "Create a new KMS key, move the alias to it, and call ReEncrypt on the stored data keys under the new key.",
      "Call EnableKeyRotation with RotationPeriodInDays set to 1, and set the period back to 365 days the next day."
    ], a: 0,
    no: [null,
      "Enabling rotation starts a new period that ends in the first rotation; it doesn't create key material at once.",
      "This changes the key ID and ARN that apps and grants reference, which the team must avoid.",
      "RotationPeriodInDays must be between 90 and 2560, so a one-day period is rejected."],
    why: "On-demand rotation creates new key material immediately for symmetric keys, whether or not automatic rotation is on, and doesn't change the automatic schedule. The key ID, ARN and policy stay the same, and older material still decrypts old ciphertexts.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/rotating-keys-on-demand.html", "https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html"] },

  { id: "dva-2-307", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc",
    q: "An app reads its PostgreSQL credentials from a Secrets Manager secret that rotates every 30 days with the single user strategy. During each rotation, some app instances get login failures for a short time before they fetch the new password. The app must keep working through rotations, and the team can provide a separate secret for an admin user. What should the developer do?",
    opts: [
      "Switch to the alternating users rotation strategy, giving the rotation function the admin secret.",
      "Lengthen the app's secret cache refresh interval, so instances fetch the password less often during the rotation.",
      "Store the password in Parameter Store as a SecureString, and rotate it with a scheduled EventBridge rule and Lambda.",
      "Shorten the rotation schedule to every 7 days, so each password change is smaller and completes more quickly."
    ], a: 0,
    no: [null,
      "Caching longer keeps the old password in use longer, which makes the failures worse.",
      "This rebuilds rotation by hand and still changes the one user's password in place, so the gap remains.",
      "Rotating more often doesn't shorten the gap; it just causes the same failures more often."],
    why: "With alternating users, rotation changes the password of a second, cloned user while the current credentials keep working, so apps always get a valid set. Creating the clone needs a superuser's credentials in a separate secret.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/rotation-strategy.html"] },

  { id: "dva-2-308", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc",
    q: "A custom rotation function for a database secret runs in the same private subnets as the RDS database. Rotation never completes, and the function's logs show it timing out on its first call to Secrets Manager. The subnets have no NAT gateway, and company policy forbids any internet path from them. What should the developer do?",
    opts: [
      "Create an interface VPC endpoint for Secrets Manager with private DNS, and allow HTTPS to it from the function.",
      "Create a gateway VPC endpoint for Secrets Manager, and add it to the route tables used by the private subnets.",
      "Move the rotation function out of the VPC, so it reaches the public Secrets Manager endpoint over AWS's network.",
      "Add secretsmanager:GetSecretValue and PutSecretValue to the rotation function's execution role, and retry."
    ], a: 0,
    no: [null,
      "Gateway endpoints exist only for Amazon S3 and DynamoDB. Secrets Manager uses interface endpoints.",
      "Outside the VPC, the function can no longer reach the private database to change the password.",
      "Missing permissions return AccessDenied right away. A timeout means there is no network path to the endpoint."],
    why: "A rotation function must reach both the database and a Secrets Manager endpoint. In a VPC without internet access, an interface endpoint with private DNS gives that path without NAT.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/troubleshoot_rotation.html", "https://docs.aws.amazon.com/secretsmanager/latest/userguide/vpc-endpoint-overview.html"] },

  { id: "dva-2-309", exam: "DVA", dva: "2.3", topic: "macie", type: "mc",
    q: "A company has about 900 S3 buckets and must keep an up-to-date view of which buckets are likely to hold personal data, such as names and passport numbers, so it can label them by data classification. It wants a managed service and the MOST cost-effective approach, without analyzing every object. Which solution meets these requirements?",
    opts: [
      "Turn on Macie automated sensitive data discovery, which samples representative objects in each bucket.",
      "Schedule a daily Amazon Macie sensitive data discovery job that analyzes every object in all 900 buckets.",
      "Turn on Amazon GuardDuty S3 Protection, and use its findings to see which buckets hold personal data.",
      "Use Amazon S3 Storage Lens advanced metrics, and filter its dashboard for buckets that contain personal data."
    ], a: 0,
    no: [null,
      "Inspecting every object every day costs far more than sampling, and the company doesn't need every object analyzed.",
      "GuardDuty S3 Protection looks for suspicious access to S3, not for sensitive data inside objects.",
      "Storage Lens reports storage and activity metrics. It doesn't inspect what objects contain."],
    why: "Macie's automated sensitive data discovery continually evaluates the bucket inventory and analyzes a sample of representative objects, so each bucket gets a sensitivity score without paying to inspect everything.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/discovery-asdd.html"] },

  { id: "dva-2-310", exam: "DVA", dva: "2.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function keeps settings such as a partner account number in environment variables. Auditors now require the variables to be encrypted at rest with a key whose policy and rotation the company controls. A support group must still be able to manage the function but must not see the values. The function's code must not change. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Set the function's KMS key for encryption at rest to a customer managed key that the company creates and rotates.", ok: true },
      { t: "Leave the support group without kms:Decrypt on that customer managed key, so it can't view the variable values.", ok: true },
      { t: "Turn on the console's encryption helpers for each variable, and keep the default key for encryption at rest.", ok: false, no: "Helpers encrypt values client-side, so the code would need to call KMS Decrypt, and the default key isn't one the company controls." },
      { t: "Keep the AWS managed key aws/lambda, and turn on its automatic rotation with a 90-day rotation period.", ok: false, no: "The company can't change the policy or rotation of an AWS managed key; AWS rotates those keys every year." },
      { t: "Move the values into Secrets Manager, and have the function read them through the Lambda extension at startup.", ok: false, no: "Reading the values from Secrets Manager means changing the function's code, which the team must avoid." }
    ],
    why: "Lambda always encrypts environment variables at rest, by default with an AWS managed key. A customer managed key gives the company control of its policy and rotation, and users without kms:Decrypt on that key can manage the function but can't view the values.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html"] },

  { id: "dva-2-311", exam: "DVA", dva: "2.3", topic: "lambda", type: "mc",
    q: "A Lambda function's environment variables are encrypted at rest with a customer managed key. During a cleanup, an engineer revoked all grants on that key. The key is still enabled, but every invocation now fails with KMSDisabledException, saying Lambda couldn't decrypt the environment variables. What should the developer do?",
    opts: [
      "Set the function to another KMS key, then back to the customer managed key so Lambda recreates its grant.",
      "Call EnableKey on the customer managed key, and wait for the change to reach the function's execution environments.",
      "Turn on automatic rotation for the key, so KMS creates new key material that the function's grant is able to use.",
      "Raise the function's timeout, so Lambda has time to retry the decryption until KMS accepts the function's request."
    ], a: 0,
    no: [null,
      "The key is already enabled. The error here comes from the revoked grant, not from a disabled key.",
      "Rotation adds key material to the same key. It doesn't create or restore grants.",
      "The failure happens before the code runs, and retrying can't succeed while the grant is missing."],
    why: "Lambda uses a grant on a customer managed key to decrypt environment variables. KMSDisabledException appears when the key is disabled or that grant is revoked, and reassigning the key makes Lambda create the grant again.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-invocation.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html"] },

  { id: "dva-2-312", exam: "DVA", dva: "2.3", topic: "cloudwatch", type: "multi", hint: "Select TWO.",
    q: "A company has hundreds of CloudWatch Logs log groups, and teams create new ones every week. AWS secret access keys and the company's employee IDs, which look like EMP-123456, must be masked in every log group, existing and future, with the LEAST operational overhead. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Create an account-level data protection policy with PutAccountPolicy, which covers all current and future log groups.", ok: true },
      { t: "Add a custom data identifier with a regular expression for the employee ID format to that data protection policy.", ok: true },
      { t: "Add an EventBridge rule on CreateLogGroup that runs a Lambda function to put a data protection policy on each group.", ok: false, no: "This works but adds code to run and maintain, while an account-level policy already covers new log groups." },
      { t: "Add a subscription filter to each log group that sends events to a Lambda function that rewrites the values.", ok: false, no: "The original events are still stored unmasked, and every group needs its own filter." },
      { t: "Run an Amazon Macie discovery job with a custom data identifier for the employee IDs against the log groups.", ok: false, no: "Macie analyzes objects in S3 buckets, not CloudWatch Logs log groups, and it doesn't mask anything." }
    ],
    why: "An account-level data protection policy applies to all existing and future log groups and masks matches as events are ingested. Custom data identifiers add your own regex patterns next to managed identifiers such as AWS secret keys.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html", "https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL-custom-data-identifiers.html"] },

  { id: "dva-2-313", exam: "DVA", dva: "2.3", topic: "apigateway", type: "mc",
    q: "A production REST API's execution logs in CloudWatch contain complete request bodies, including customers' home addresses and dates of birth. The team wants to keep execution logs of errors and request processing for troubleshooting, but stop writing payloads to the logs, without changing any code. What should the developer do?",
    opts: [
      "Turn off Data tracing in the stage's logging settings, and keep execution logging at the ERROR or INFO level.",
      "Set the stage's execution logging level to Off, and rely on the backend function's own logs for troubleshooting.",
      "Encrypt the execution log group with a customer managed KMS key, and limit which roles can use that key.",
      "Rely on API Gateway's redaction of sensitive request parameters, which also strips personal data from bodies."
    ], a: 0,
    no: [null,
      "That removes the execution logs the team wants to keep.",
      "Encryption at rest doesn't remove the payloads. Anyone allowed to read the logs still sees them.",
      "API Gateway redacts authorization headers, API keys and similar parameters, not personal data in request bodies."],
    why: "Data tracing logs full request and response data, which can include sensitive data, and AWS recommends not using it for production APIs. Execution logging at ERROR or INFO still records errors and execution traces.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-execution-logging.html"] },

  { id: "dva-2-314", exam: "DVA", dva: "2.3", topic: "dynamodb", type: "mc",
    q: "A support tool's role may read only the id, name and email attributes of a DynamoDB customer table, never ssn. Its policy allows GetItem and Query with a ForAllValues:StringEquals condition on dynamodb:Attributes that lists those three. A test shows that a GetItem call with no ProjectionExpression still returns every attribute, ssn included. What should the developer add to the policy?",
    opts: [
      "A StringEqualsIfExists condition requiring dynamodb:Select to be SPECIFIC_ATTRIBUTES on read requests.",
      "A ForAllValues:StringEquals condition on dynamodb:LeadingKeys that lists the id values the tool is allowed to read.",
      "A Deny statement for dynamodb:Scan on the table, so the tool can't read items in bulk without giving a key.",
      "A condition that requires dynamodb:ReturnValues to be NONE, so read requests can't return any item attributes."
    ], a: 0,
    no: [null,
      "LeadingKeys limits which partition key values can be read, not which attributes come back.",
      "The leak happens on GetItem, and blocking Scan doesn't stop GetItem from returning every attribute.",
      "ReturnValues controls what write operations such as PutItem and UpdateItem return, not what GetItem returns."],
    why: "A read without a ProjectionExpression returns all attributes regardless of the dynamodb:Attributes condition. Also requiring dynamodb:Select to be SPECIFIC_ATTRIBUTES forces requests to name their attributes, which the Attributes condition then limits.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html"] },

  { id: "dva-2-315", exam: "DVA", dva: "2.3", topic: "cognito", type: "mc",
    q: "A multi-tenant app uses the custom:tenant_id claim in Cognito user pool tokens to decide which tenant's data a user can reach. A penetration test shows that a signed-in user called UpdateUserAttributes with their own access token, changed custom:tenant_id, and then saw another tenant's data. Only an admin backend should set the value. What should the developer do?",
    opts: [
      "Remove custom:tenant_id from all app clients' write attributes, and set it with AdminUpdateUserAttributes.",
      "Change custom:tenant_id to an immutable attribute in the user pool schema, so nobody can change it after sign-up.",
      "Remove custom:tenant_id from the app client's read attributes, so the claim no longer appears in the user's tokens.",
      "Turn on token revocation for the app client, and revoke the user's refresh token whenever the attribute changes."
    ], a: 0,
    no: [null,
      "A custom attribute can't be changed after it is added to the pool, so it can't be switched to immutable now.",
      "The backend needs the claim from tokens, and removing read access doesn't take away the user's write access.",
      "Revocation ends sessions after the fact. It doesn't stop users from writing the attribute."],
    why: "When an app client has write permission for an attribute, users can change it themselves with UpdateUserAttributes. An attribute used for authorization should be removed from every app client's WriteAttributes and set only through admin APIs.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html"] },

  { id: "dva-2-316", exam: "DVA", dva: "2.1", topic: "waf", type: "mc",
    q: "A public Regional REST API in API Gateway already has an AWS WAF web ACL associated with its stage, with a rate-based rule that limits each IP address. Logs now show SQL injection attempts in query strings reaching the backend, from clients that stay under the rate limit. The team wants these requests blocked without changing the backend code. What should the developer do?",
    opts: [
      "Add the AWS managed SQL database rule group to the web ACL that is already associated with the stage.",
      "Add a request validator with a JSON schema model to each method, so that malformed requests are rejected.",
      "Lower the rate-based rule's limit, so that clients sending injection attempts are blocked sooner.",
      "Turn on API caching for the stage, so that repeated injection attempts are answered from the cache."
    ], a: 0,
    no: [null,
      "Validators check required parameters and body shape. They don't detect SQL injection in query strings.",
      "Rate-based rules only count requests per IP address. They don't inspect content, and these clients stay under any sensible limit.",
      "Caching returns stored responses to repeated requests. It doesn't inspect or block malicious query strings."],
    why: "The AWS managed SQL database rule group (AWSManagedRulesSQLiRuleSet) blocks request patterns associated with SQL injection, including in query parameters. Added to the web ACL on the stage, it inspects every request before API Gateway handles it, while the rate-based rule keeps limiting floods.",
    doc: ["https://docs.aws.amazon.com/waf/latest/developerguide/aws-managed-rule-groups-use-case.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html"] },

  { id: "dva-2-317", exam: "DVA", dva: "2.1", topic: "verifiedpermissions", type: "mc",
    q: "A web app keeps its authorization rules as Cedar policies in an Amazon Verified Permissions policy store, and users sign in with a Cognito user pool. Today the backend decodes each ID token itself, builds the principal and its groups, and calls IsAuthorized. The team wants Verified Permissions to validate the token and derive the principal, with less code. What should the developer do?",
    opts: [
      "Add the user pool as the policy store's identity source, and call IsAuthorizedWithToken with the ID token.",
      "Keep calling IsAuthorized, and pass the raw ID token as the principal's entity ID so that Cedar can read its claims.",
      "Replace the policy store with a Cognito user pool authorizer on API Gateway that checks each token's OAuth scopes.",
      "Call BatchIsAuthorized with the ID token placed in each request's context, so the policies can check its claims."
    ], a: 0,
    no: [null,
      "IsAuthorized doesn't validate tokens or read claims from an entity ID; the principal would just be an opaque string.",
      "A Cognito authorizer checks the token and scopes, but it can't evaluate the app's Cedar policies.",
      "BatchIsAuthorized groups IsAuthorized requests. It doesn't validate a token or map it to a principal."],
    why: "With a Cognito user pool or OIDC provider as an identity source, IsAuthorizedWithToken validates the ID or access token and maps it to the principal, with ID token claims as principal attributes, before it evaluates the policies.",
    doc: ["https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_IsAuthorizedWithToken.html", "https://docs.aws.amazon.com/verifiedpermissions/latest/userguide/identity-sources.html"] },

  { id: "dva-2-318", exam: "DVA", dva: "2.1", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "An Application Load Balancer authenticates users with an OIDC identity provider and forwards requests to a backend on EC2. The backend reads the user's identity from headers that the ALB adds, and must trust only claims it can verify came from this load balancer. Which steps should the backend take? (Select TWO.)",
    items: [
      { t: "Verify the ES256 signature of the x-amzn-oidc-data header with the ALB public key fetched by the kid in its JWT header.", ok: true },
      { t: "Check that the signer field in the x-amzn-oidc-data JWT header matches the ARN of the company's own load balancer.", ok: true },
      { t: "Read the user's subject from the x-amzn-oidc-identity header, which the ALB signs together with the user claims.", ok: false, no: "The ALB signs only x-amzn-oidc-data. The identity header is plain text and can't be verified." },
      { t: "Verify x-amzn-oidc-data with the identity provider's JWKS keys, because the provider signed the claims in it.", ok: false, no: "The ALB signs this JWT with its own Regional key, so the provider's keys won't verify it." },
      { t: "Skip verification, because the security group lets only the load balancer reach the instances anyway.", ok: false, no: "Limiting the security group helps, but AWS says to verify the signature and the signer before trusting the claims." }
    ],
    why: "The ALB passes user claims in the x-amzn-oidc-data header as a JWT signed with ES256. The backend gets the public key from the Region's ELB key endpoint by its kid, verifies the signature, and checks that signer is its own load balancer's ARN.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/listener-authenticate-users.html"] },

  { id: "dva-2-319", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A service with its own HTTP client signs Amazon S3 requests itself with Signature Version 4. It must now read objects through an S3 Multi-Region Access Point, and every request to the access point's global hostname is rejected. The role's permissions already allow the access point. What should the developer do?",
    opts: [
      "Sign the requests with SigV4A, the asymmetric signature whose credential scope isn't tied to a single Region.",
      "Keep SigV4, and put the Region of the closest underlying bucket in the credential scope of every request.",
      "Switch these requests to Signature Version 2, because a global hostname doesn't use a Region when signing.",
      "Turn on S3 Transfer Acceleration for each underlying bucket, so the global hostname accepts SigV4 requests."
    ], a: 0,
    no: [null,
      "Multi-Region Access Point requests must be signed with SigV4A; a single-Region SigV4 scope isn't accepted.",
      "SigV2 is deprecated for Amazon S3, and Multi-Region Access Point requests must be signed with SigV4A.",
      "Acceleration speeds transfers to one bucket. It doesn't change how access point requests are signed."],
    why: "Requests to a Multi-Region Access Point must be signed with SigV4A, which uses asymmetric keys and doesn't put a single Region in the credential scope. AWS SDKs that support SigV4A switch to it automatically.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/MultiRegionAccessPointRequests.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_sigv.html"] },

  { id: "dva-2-320", exam: "DVA", dva: "2.1", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "Microservices on ECS in one VPC call an internal inventory REST API. The API must not be reachable from the internet, and must accept calls only through the VPC's own interface endpoint for API Gateway. Calls are already signed with SigV4 under each service's task role. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Change the API's endpoint type to PRIVATE, and create an interface VPC endpoint for the execute-api service in the VPC.", ok: true },
      { t: "Attach a resource policy to the API that allows execute-api:Invoke only when aws:SourceVpce equals that endpoint's ID.", ok: true },
      { t: "Create a gateway VPC endpoint for API Gateway, and add it to the route tables of the services' subnets.", ok: false, no: "Gateway endpoints exist only for Amazon S3 and DynamoDB. API Gateway uses interface endpoints." },
      { t: "Keep the Regional endpoint, and add an AWS WAF rule that allows only source addresses in the VPC's CIDR range.", ok: false, no: "Calls to a public endpoint arrive from public addresses, such as a NAT gateway's, and the API stays on the internet." },
      { t: "Require an API key on every method, and give the key only to the services that run in the VPC.", ok: false, no: "API keys identify clients for usage plans. They aren't access control and don't keep the API off the internet." }
    ],
    why: "A private REST API is reachable only through interface VPC endpoints for execute-api. Its resource policy, which a private API needs before it can be deployed, can allow invoke only through a specific endpoint with aws:SourceVpce.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-create.html"] },

  { id: "dva-2-321", exam: "DVA", dva: "2.1", topic: "cognito", type: "multi", hint: "Select TWO.",
    q: "Employees must sign in to an internal web app with the company's SAML 2.0 identity provider. The app's API uses a Cognito user pool authorizer, and the backend needs each user's department, which the IdP sends as a SAML attribute, as a claim in the user pool tokens. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Add the SAML provider to the user pool as an identity provider from its metadata, and enable it for the app client.", ok: true },
      { t: "Add a mutable custom:department attribute, and map the SAML department attribute to it for that provider.", ok: true },
      { t: "Create a SAML identity provider in IAM, and have the app call AssumeRoleWithSAML with each user's assertion.", ok: false, no: "That returns temporary AWS credentials, not user pool tokens that the API's Cognito authorizer accepts." },
      { t: "Add the SAML provider to a Cognito identity pool, and send the identity pool's AWS credentials to the API.", ok: false, no: "Identity pools issue AWS credentials, not user pool JWTs, so the user pool authorizer rejects them." },
      { t: "Use a pre sign-up Lambda trigger to call the IdP's SAML endpoint and copy the department into each token.", ok: false, no: "Pre sign-up decides whether a user may sign up. Attribute mapping is how IdP attributes reach the profile and tokens." }
    ],
    why: "A user pool can federate with a SAML IdP and issue its own tokens to federated users. Attribute mapping copies IdP attributes into user pool attributes, and a custom attribute must exist in the schema, and be mutable, before you map to it.",
    doc: ["https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-saml-idp.html", "https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-specifying-attribute-mapping.html"] },

  { id: "dva-2-322", exam: "both", dva: "2.1", saa: "1.1", topic: "iam", type: "mc",
    q: "Developers run AWS CLI commands and SDK scripts on their laptops with long-term IAM user access keys in ~/.aws/credentials. The company already uses IAM Identity Center for console sign-in. Security wants no long-term keys on laptops, only short-lived credentials renewed through sign-in, with no change to the scripts' SDK calls. What should the developer do?",
    opts: [
      "Run aws configure sso to set up an Identity Center profile, and sign in with aws sso login.",
      "Rotate each developer's access keys every 30 days, and alert on any access key unused for more than 90 days.",
      "Have a script call GetSessionToken each morning with the user's keys, and write the session to the profile.",
      "Store the access keys in Secrets Manager, and have each script fetch them at startup with GetSecretValue."
    ], a: 0,
    no: [null,
      "Rotated keys are still long-term keys stored on the laptops.",
      "Calling GetSessionToken still needs long-term access keys on the laptop.",
      "The scripts would need changes, would still need AWS credentials to call Secrets Manager, and the keys stay long-term."],
    why: "An Identity Center profile lets the CLI and SDKs get short-lived role credentials after the user signs in with aws sso login. The tools read the profile, so the code doesn't change and no long-term keys are stored.",
    doc: ["https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html"] },

  { id: "dva-2-323", exam: "DVA", dva: "2.2", topic: "ec2", type: "mc",
    q: "A team will SSH into new Amazon Linux test instances. Policy says private keys must be generated on each developer's laptop and never pass through any other system, AWS included. The developers have already created ED25519 key pairs with ssh-keygen. How should the developer make these keys usable when launching instances?",
    opts: [
      "Run aws ec2 import-key-pair with each developer's public key file, and launch instances with the imported key name.",
      "Run aws ec2 create-key-pair with --key-type ed25519, and save the private key from the response on each laptop.",
      "Upload each private key to Parameter Store as a SecureString, and reference the parameter in the launch template.",
      "Convert the keys to DSA with ssh-keygen and import those, because EC2 doesn't accept ED25519 public keys."
    ], a: 0,
    no: [null,
      "EC2 generates that private key and returns it in the response, so the key isn't created only on the laptop.",
      "The private key would leave the laptop, which the policy forbids, and EC2 needs only the public key.",
      "EC2 accepts ED25519 keys for Linux instances and doesn't accept DSA keys at all."],
    why: "EC2 can import the public key of a key pair created with a third-party tool such as ssh-keygen. RSA and ED25519 are supported for Linux, and the private key never leaves the developer's machine.",
    doc: ["https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html"] },

  { id: "dva-2-324", exam: "DVA", dva: "2.2", topic: "acm", type: "mc",
    q: "A certificate from a third-party authority is imported into ACM and used by an Application Load Balancer and an API Gateway Regional custom domain in the same Region. The company must keep using that authority, which has now issued the renewed certificate. The team wants to swap in the renewed certificate without editing either resource. What should the developer do?",
    opts: [
      "Reimport the renewed certificate to the existing certificate ARN, which keeps its associations.",
      "Call RenewCertificate on the imported certificate, so ACM collects the renewed certificate from the authority.",
      "Import the renewed certificate as a new one, and let ACM move the old certificate's associations when it expires.",
      "Request a public ACM certificate with DNS validation for the same names, and delete the imported one afterward."
    ], a: 0,
    no: [null,
      "ACM doesn't provide managed renewal for imported certificates; you get the renewed certificate yourself and import it.",
      "A new import gets a new ARN, and ACM doesn't move associations, so both resources would need edits.",
      "The company must keep the authority's certificate, and both resources would need the new certificate's ARN."],
    why: "Reimporting to the same certificate ARN before it expires keeps its associations with integrated services, so the ALB and API Gateway use the renewed certificate. ACM doesn't renew imported certificates itself.",
    doc: ["https://docs.aws.amazon.com/acm/latest/userguide/import-reimport.html", "https://docs.aws.amazon.com/acm/latest/userguide/import-certificate.html"] },

  { id: "dva-2-325", exam: "DVA", dva: "2.2", topic: "elb", type: "mc",
    q: "In a development environment, an Application Load Balancer terminates HTTPS with an ACM certificate. A new rule says traffic from the ALB to its EC2 targets must also be encrypted. The team wants the cheapest and quickest certificate for the targets, which only the ALB connects to. What should the developer do?",
    opts: [
      "Install a self-signed certificate on each target, and switch the target group's protocol to HTTPS on the app's port.",
      "Keep the HTTP target group, because an ALB with an HTTPS listener encrypts its traffic to the targets automatically.",
      "Turn on mutual TLS in verify mode on the HTTPS listener, so that the ALB and the targets exchange certificates.",
      "Create an AWS Private CA in general-purpose mode, and issue private certificates to the targets through ACM."
    ], a: 0,
    no: [null,
      "With an HTTP target group, traffic from the ALB to the targets is not encrypted.",
      "Mutual TLS on a listener checks client certificates from callers. It doesn't cover the connection to targets.",
      "This works but adds a monthly CA charge and setup, which the team wants to avoid in development."],
    why: "The ALB makes TLS connections to HTTPS targets with the certificates installed on them but doesn't validate those certificates, so self-signed certificates are enough to encrypt this leg.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-target-groups.html"] },

  { id: "dva-2-326", exam: "DVA", dva: "2.2", topic: "rds", type: "multi", hint: "Select TWO.",
    q: "An app connects to an RDS for PostgreSQL DB instance that currently accepts unencrypted connections. A security rule says the database must refuse any connection that isn't encrypted, and clients must confirm that they are talking to the real database server and not an impostor. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Set rds.force_ssl to 1 in a custom DB parameter group that is associated with the DB instance.", ok: true },
      { t: "Have clients connect with sslmode=verify-full, using the RDS certificate bundle as their trusted root.", ok: true },
      { t: "Restore the DB instance from an encrypted snapshot copy, so its storage uses a customer managed KMS key.", ok: false, no: "Encryption at rest protects stored data, not the network connection." },
      { t: "Have clients connect with sslmode=require, which encrypts the connection and confirms the server's identity.", ok: false, no: "require doesn't check that the server certificate matches the host name, so it can't rule out an impostor." },
      { t: "Allow port 5432 only from the app's security group, which keeps the connection private and encrypted.", ok: false, no: "Security groups filter traffic. They don't encrypt it or prove the server's identity." }
    ],
    why: "With rds.force_ssl set to 1, RDS for PostgreSQL rejects connections that don't use SSL/TLS. Clients using verify-full with the RDS CA bundle check the server certificate and host name, which stops impersonation.",
    doc: ["https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html"] },

  { id: "dva-2-327", exam: "DVA", dva: "2.2", topic: "dynamodb", type: "mc",
    q: "An app stores customer records in DynamoDB. The ssn attribute must be encrypted before it leaves the app, so DynamoDB never sees it in plaintext, and the app must detect any tampering with stored items. The partition and sort keys must stay readable for queries. What should the developer do?",
    opts: [
      "Use the AWS Database Encryption SDK with ssn set to ENCRYPT_AND_SIGN and the key attributes to SIGN_ONLY.",
      "Switch the table's encryption at rest to a customer managed KMS key, and limit kms:Decrypt to the app's role.",
      "Call KMS Encrypt on the whole item, including its keys, and store the ciphertext in one binary attribute.",
      "Require TLS 1.2 or later on the app's DynamoDB client, so the ssn value is encrypted on its way to the table."
    ], a: 0,
    no: [null,
      "Encryption at rest is server-side, so DynamoDB still receives and handles the plaintext ssn.",
      "Encrypted key values can't be used in queries, and the item becomes one opaque value.",
      "TLS protects data only in transit. DynamoDB still receives the plaintext value."],
    why: "The AWS Database Encryption SDK encrypts chosen attributes client-side and signs the item to detect tampering. Primary key attributes are signed but not encrypted, so they stay queryable.",
    doc: ["https://docs.aws.amazon.com/database-encryption-sdk/latest/devguide/concepts.html", "https://docs.aws.amazon.com/database-encryption-sdk/latest/devguide/what-is-database-encryption-sdk.html"] },

  { id: "dva-2-328", exam: "DVA", dva: "2.2", topic: "secrets", type: "mc",
    q: "A secret in account A is encrypted with a customer managed key. The secret's resource policy and the key policy both allow an app role in account B, and the role's identity policy allows GetSecretValue on the secret's ARN and kms:Decrypt on the key. The app, in the same Region, calls GetSecretValue with SecretId set to the secret's name, prod/partner-api, and gets ResourceNotFoundException. What should the developer do?",
    opts: [
      "Pass the secret's full ARN as SecretId, because a secret in another account must be named by its ARN.",
      "Add secretsmanager:DescribeSecret to the role's identity policy, so the app can look the secret up by name.",
      "Replicate the secret with ReplicateSecretToRegions, and have the app read the replica by the same name.",
      "Re-encrypt the secret with the aws/secretsmanager key, so that account B doesn't need a key policy grant."
    ], a: 0,
    no: [null,
      "GetSecretValue alone is enough to read the value, and a missing permission returns AccessDeniedException, not ResourceNotFoundException.",
      "Replicas are created in other Regions of the same account, so account B still has no secret with that name.",
      "AWS managed keys can't be used for cross-account access, so the read would then fail at decryption."],
    why: "GetSecretValue accepts a secret's name or ARN, but to read a secret from another account you must use its ARN, and AWS recommends the complete ARN. The policies here are already right, so only the SecretId needs to change.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html", "https://docs.aws.amazon.com/secretsmanager/latest/userguide/auth-and-access_examples_cross.html"] },

  { id: "dva-2-329", exam: "DVA", dva: "2.1", topic: "verifiedpermissions", type: "mc",
    q: "A document app uses Amazon Verified Permissions to decide what each user can do. Its list page shows up to 25 documents, and the app calls IsAuthorized once per document to hide the ones the user can't view, which makes the page slow. The team wants fewer round trips while keeping the same Cedar policies. What should the developer do?",
    opts: [
      "Call BatchIsAuthorized once per page, with one request per document that shares the same principal and action.",
      "Cache each IsAuthorized decision in the browser's local storage for a day, and reuse it on later page loads.",
      "Move the view rules into a Lambda authorizer on API Gateway that caches one policy per caller for each method.",
      "Call IsAuthorized once for the first document only, and apply that decision to every document on the page."
    ], a: 0,
    no: [null,
      "Decisions cached on the client can go stale or be changed by the user, so they can't be trusted.",
      "One cached policy per caller and method can't decide which of many documents a user may see, and it drops the Cedar policies.",
      "Each document has its own owners and status, so one decision doesn't hold for the others."],
    why: "BatchIsAuthorized evaluates many authorization requests in one call. Each request is like an IsAuthorized request, and either the principal or the resource must be the same across all of them.",
    doc: ["https://docs.aws.amazon.com/verifiedpermissions/latest/apireference/API_BatchIsAuthorized.html"] },

  { id: "dva-2-330", exam: "DVA", dva: "2.3", topic: "macie", type: "mc",
    q: "Amazon Macie analyzes buckets of test fixtures and reports hundreds of credit card number findings. The numbers are well-known fake test card numbers that the team keeps in a short list, and real card numbers in the same buckets must still be reported. The team wants Macie to stop reporting only the fake numbers. What should the developer do?",
    opts: [
      "Create a Macie allow list of the fake numbers as predefined text, and use it in the jobs.",
      "Create a suppression rule that archives every credit card number finding for the test fixture buckets.",
      "Remove the credit card number managed data identifier from the jobs that analyze the test fixture buckets.",
      "Add a custom data identifier with a regex for the fake numbers, so Macie reports them as a separate type."
    ], a: 0,
    no: [null,
      "That would also archive findings for real card numbers in those buckets.",
      "Then real card numbers in those buckets would no longer be detected.",
      "A custom identifier adds detections. It doesn't stop the credit card identifier from reporting the same numbers."],
    why: "A Macie allow list names text or patterns to ignore, and Macie doesn't report matching data even when a managed or custom data identifier detects it. Other sensitive data in the same objects is still reported.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/allow-lists.html"] }
);
