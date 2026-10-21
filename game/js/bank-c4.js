// Question bank batch: points chapter 4 (the Sealed Floors) teaches that the bank had no question on: network ACL rule
// order, what a security group can't do, what makes a subnet public, gateway vs interface endpoints, a function in a
// VPC with no NAT, role chaining's one-hour cap, 401 vs 403 from a JWT authorizer, presigned URLs, SSE-C, the KMS key
// deletion window, CloudTrail logging of KMS calls, and the assumed-role identity in a CloudTrail record. First written
// for the chapter's minigames, then reworded here without the story. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // SAA task 1.2: Design secure workloads and applications
  { id: "saa-1-750", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "A subnet's custom network ACL has two inbound rules: rule 100 denies all traffic from 10.0.5.7/32, and rule 200 allows TCP 443 from 10.0.0.0/16. The instance at 10.0.5.7 sends an HTTPS request to a server in the subnet, and the server's security group allows TCP 443 from 10.0.0.0/16. What happens?",
    opts: [
      "It is allowed, because rule 200 is the more specific match for a TCP 443 request and so it overrides rule 100.",
      "It is denied, because the ACL evaluates rules in number order and rule 100 is the first rule that matches it.",
      "It is allowed, because the security group allows the request and a security group's allow overrides the ACL.",
      "It is denied only until the server answers, because network ACLs remember the reply and then let the flow in."
    ], a: 1,
    no: [
      "Network ACLs don't look for the most specific rule. They check rules from the lowest number up and stop at the first match.",
      null,
      "Traffic must pass both the network ACL and the security group. Neither one overrides the other.",
      "Network ACLs are stateless: they remember nothing about earlier traffic, in either direction."],
    why: "A network ACL's rules are evaluated in order, starting with the lowest rule number, and the first rule that matches decides. Rule 100 denies the source before rule 200 is reached. Traffic has to get through both the subnet's ACL and the instance's security group.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html", "https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html"] },

  { id: "saa-1-751", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "Web servers in a public subnet allow inbound TCP 443 from 0.0.0.0/0 in their security group. The security team sees abusive traffic from one IP address range and must block only that range while every other client keeps working. What should a solutions architect do?",
    opts: [
      "Add a deny rule for the range to the security group, placed above the rule that allows TCP 443 from everyone.",
      "Remove the 0.0.0.0/0 rule from the security group, and add one allow rule for each known good client address.",
      "Add a network ACL rule that denies the range, with a lower rule number than the subnet's rule that allows 443.",
      "Detach the security group from the servers, and rely on the subnet's default network ACL to filter the traffic."
    ], a: 2,
    no: [
      "Security groups have allow rules only. There's no deny rule to add, and their rules have no order.",
      "That blocks every client the team hasn't listed, which is nearly all of them.",
      null,
      "The default network ACL allows all traffic in and out, so it would filter nothing, and an instance always has a security group."],
    why: "Security groups support allow rules only, so they can't carve one range out of 0.0.0.0/0. A network ACL supports both allow and deny rules, evaluated in number order, so a deny rule numbered below the allow rule blocks just that range at the subnet.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html", "https://docs.aws.amazon.com/vpc/latest/userguide/nacl-rules.html"] },

  { id: "saa-1-752", exam: "SAA", saa: "1.2", topic: "vpc", type: "mc",
    q: "A VPC has an internet gateway attached. A new subnet's instances have public IPv4 addresses but can't be reached from the internet, and they can't reach it either. Their security group and network ACL allow the traffic. What is the most likely cause?",
    opts: [
      "The subnet's route table has no route that sends 0.0.0.0/0 to the internet gateway, so the subnet isn't public.",
      "The instances need Elastic IP addresses, because an automatically assigned public IP address doesn't route.",
      "The subnet needs a NAT gateway of its own before any instance in it can be reached from the internet at all.",
      "The internet gateway has to be attached to the subnet as well as to the VPC before the subnet can use it."
    ], a: 0,
    no: [
      null,
      "An automatically assigned public IPv4 address works for internet traffic just as an Elastic IP address does, if the routes are there.",
      "A NAT gateway lets private instances start connections out. It never lets the internet reach in, and a public subnet doesn't need one.",
      "Internet gateways attach to a VPC only. A subnet uses one through a route in its route table."],
    why: "What makes a subnet public is its route table: a route that sends internet-bound traffic (0.0.0.0/0) to an internet gateway. Without it, instances with public addresses still can't send or receive internet traffic.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html", "https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html"] },

  { id: "saa-1-753", exam: "SAA", saa: "1.2", topic: "privatelink", type: "mc",
    q: "Instances in private subnets call Amazon S3, AWS Secrets Manager and Amazon SQS in the same Region through a NAT gateway. The company wants all three to stay off the internet path. Which design meets this requirement?",
    opts: [
      "Create gateway endpoints for all three services, and add each endpoint to the route tables of the private subnets.",
      "Create one interface endpoint for S3, and let Secrets Manager and SQS traffic reach those services through it too.",
      "Move the instances to public subnets with public IP addresses, so that their calls stop passing through the NAT.",
      "Create a gateway endpoint for S3, and create interface endpoints with private DNS for Secrets Manager and SQS."
    ], a: 3,
    no: [
      "Gateway endpoints exist only for Amazon S3 and DynamoDB. Other services are reached privately through interface endpoints.",
      "Each interface endpoint serves one service. An S3 endpoint doesn't carry Secrets Manager or SQS traffic.",
      "That puts the calls on the internet directly, which is the opposite of the requirement.",
      null],
    why: "A gateway endpoint is a route table target that exists for S3 and DynamoDB only. Other AWS services are reached privately through interface endpoints (AWS PrivateLink), which put network interfaces in your subnets; with private DNS on, the services' usual names resolve to them.",
    doc: ["https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html", "https://docs.aws.amazon.com/vpc/latest/privatelink/create-interface-endpoint.html"] },

  // DVA task 1.2: Lambda reaching private resources in a VPC
  { id: "dva-1-754", exam: "DVA", dva: "1.2", topic: "lambda", type: "mc",
    q: "A Lambda function is attached to a VPC's private subnets so it can query an RDS database. Since then, its calls to a third-party payment API on the internet time out, although the database queries work. The VPC has an internet gateway and no NAT gateway. What should the developer do?",
    opts: [
      "Attach the function to the VPC's public subnets instead, so that its network interfaces get public IP addresses.",
      "Add a NAT gateway in a public subnet, and route the private subnets' 0.0.0.0/0 traffic through the NAT gateway.",
      "Add an interface VPC endpoint for the payment API, so the function can reach the third party without the NAT.",
      "Raise the function's timeout to 15 minutes, so the calls have enough time to find their own way to the internet."
    ], a: 1,
    no: [
      "A function's network interfaces in a VPC never get public IP addresses, even in a public subnet, so that doesn't give it internet access.",
      null,
      "Interface endpoints reach AWS services and PrivateLink endpoint services, not an arbitrary website on the internet.",
      "There's no route to the internet, so more time doesn't help: the calls will wait until they time out."],
    why: "A function connected to a VPC only reaches what the VPC's routes reach. To call the internet from private subnets it needs a NAT gateway in a public subnet and a default route to it. Attaching it to public subnets doesn't work, because Lambda doesn't give its network interfaces public IP addresses.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html", "https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html"] },

  // DVA task 2.1: Implement authentication and/or authorization
  { id: "dva-2-755", exam: "DVA", dva: "2.1", topic: "sts", type: "mc",
    q: "A script assumes RoleA, then uses RoleA's temporary credentials to assume RoleB, asking for a DurationSeconds of 7200. RoleB's maximum session duration is set to 12 hours. The second AssumeRole call fails. Why?",
    opts: [
      "RoleB's trust policy has to name the script's original IAM user, not RoleA, before a chained call can succeed.",
      "Temporary credentials can't call AssumeRole at all, so the script has to use long-term keys for the second call.",
      "Role chaining limits the new role session to one hour, whatever the role's own maximum session duration says.",
      "DurationSeconds has to be at least the role's maximum session duration, so the script must ask for 12 hours."
    ], a: 2,
    no: [
      "In role chaining the caller is RoleA's session, so RoleB's trust policy names RoleA. That isn't what failed here.",
      "Assuming a role with another role's temporary credentials is allowed. That is what role chaining is.",
      null,
      "DurationSeconds may be anything from 900 seconds up to the maximum. Asking for less is fine."],
    why: "Using one role's credentials to assume another is role chaining, and AWS caps a chained role session at one hour. A DurationSeconds over 3600 fails, even when the role's maximum session duration is longer.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_terms-and-concepts.html", "https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html"] },

  { id: "dva-2-756", exam: "DVA", dva: "2.1", topic: "apigateway", type: "mc",
    q: "An HTTP API in API Gateway uses a JWT authorizer for an Amazon Cognito user pool, and the route requires the scope orders/write. Which request does API Gateway reject with 403 Forbidden rather than 401 Unauthorized?",
    opts: [
      "A request whose access token is correctly signed and current but carries only the scope orders/read.",
      "A request whose access token was signed by another user pool that uses a different signing key pair.",
      "A request whose access token expired ten minutes ago, though it was once correctly signed and scoped.",
      "A request that has no Authorization header at all, sent by a client that hasn't signed in to the pool."
    ], a: 0,
    no: [
      null,
      "A token whose signature doesn't verify against the user pool's keys isn't a valid token, so the request is unauthorized (401).",
      "An expired token fails validation, so the request is unauthorized (401). The client should refresh it and try again.",
      "With no token there's nobody to authorize, so API Gateway answers 401."],
    why: "The JWT authorizer first validates the token: signature, issuer, audience and expiry. A missing or invalid token gets 401 Unauthorized. A valid token that doesn't carry any of the route's required scopes gets 403 Forbidden: the caller is known, but not allowed.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html"] },

  { id: "dva-2-757", exam: "DVA", dva: "2.1", topic: "s3", type: "mc",
    q: "A developer generates a presigned GET URL for a private S3 object with an IAM user's long-term credentials and a 3-day expiration, then pastes it into a team chat. Which statement about the URL is true?",
    opts: [
      "Only people who are signed in to the same AWS account as the IAM user can open the URL during those 3 days.",
      "Anyone who has the URL can download the object until it expires, with the permissions of the user who signed it.",
      "The URL works only from the IP address of the computer it was generated on, so the chat is no risk at all.",
      "The URL lets anyone list and download every object in the bucket until it expires, not only the one object."
    ], a: 1,
    no: [
      "A presigned URL needs no sign-in. Whoever holds it can use it.",
      null,
      "A presigned URL isn't tied to an IP address unless a policy adds such a condition.",
      "A presigned URL is signed for one request: one operation on one object."],
    why: "A presigned URL carries the signer's authorization in its query string. Anyone who has it can make that one request, as the signer and within the signer's permissions, until it expires. Share them like secrets, with short expirations.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-presigned-url.html"] },

  // DVA task 2.2: Implement encryption by using AWS services
  { id: "dva-2-758", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "A company uploads objects to Amazon S3 with server-side encryption with customer-provided keys (SSE-C), and keeps the keys in its own vault. Which statement is true?",
    opts: [
      "S3 keeps a copy of each key in AWS KMS, so later GET requests for the objects don't need to include the key.",
      "S3 encrypts each object on the client before upload, so the plaintext never leaves the company's own network.",
      "S3 can't encrypt objects with a key it doesn't hold, so SSE-C objects are stored unencrypted in the bucket.",
      "Every GET request must send the same key over HTTPS, and an object whose key is lost can't be decrypted."
    ], a: 3,
    no: [
      "With SSE-C, S3 doesn't store the key, in KMS or anywhere else. It keeps only a salted HMAC to check the key it's given.",
      "SSE-C is server-side encryption: S3 encrypts the object as it's written. Encrypting before upload is client-side encryption.",
      "S3 encrypts the object with the key you send, then discards the key.",
      null],
    why: "With SSE-C you send your key with each request, over HTTPS. S3 uses it to encrypt or decrypt the object, then discards it, keeping only a salted HMAC to validate later requests. Lose the key and the object can't be decrypted.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerSideEncryptionCustomerKeys.html"] },

  { id: "dva-2-759", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A developer no longer needs a customer managed KMS key and calls ScheduleKeyDeletion on it. A week later, another team says it still has data encrypted under that key. Which statement is true?",
    opts: [
      "The key was deleted the moment the call returned, so the other team's data can no longer be decrypted.",
      "While the key is pending deletion it can't be used, but the deletion can be canceled before the wait ends.",
      "The key can still encrypt and decrypt normally until the waiting period ends, after which it is deleted.",
      "Scheduled deletion keeps the key's material for a year, so the key can be restored from backup later on."
    ], a: 1,
    no: [
      "KMS never deletes a key at once. It makes you wait 7 to 30 days, 30 by default.",
      null,
      "A key pending deletion can't be used in any cryptographic operation.",
      "Once the waiting period ends, the key material is gone for good. There's no backup to restore."],
    why: "Deleting a KMS key is destructive, so KMS enforces a waiting period of 7 to 30 days (30 by default). During it the key's state is Pending deletion and it can't be used, and CancelKeyDeletion brings it back. If you only might need it again, disable it instead.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/deleting-keys.html"] },

  { id: "dva-4-760", exam: "DVA", dva: "4.2", topic: "cloudtrail", type: "mc",
    q: "An auditor asks whether anyone decrypted data with a particular customer managed KMS key over the past month. Nobody in the account set up any special logging for AWS KMS. Where can a developer find the answer?",
    opts: [
      "Nowhere, because KMS Decrypt calls are data events, which CloudTrail records only after they're turned on.",
      "In the key's own audit log in the KMS console, which keeps every Decrypt call made in the past 365 days.",
      "In CloudTrail, because KMS operations such as Decrypt are management events that it records by default.",
      "In Amazon CloudWatch Logs, where AWS KMS writes one log line for each operation in a key's log group."
    ], a: 2,
    no: [
      "KMS cryptographic operations are management events, not data events, so CloudTrail records them by default.",
      "KMS has no per-key audit log of its own. CloudTrail is where its calls are recorded.",
      null,
      "KMS doesn't write its calls to CloudWatch Logs unless you deliver a trail there yourself."],
    why: "AWS KMS operations, Decrypt included, are management events. CloudTrail records them by default, and the last 90 days appear in Event history with no trail at all, each with the caller, the key and the time.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/logging-using-cloudtrail.html", "https://docs.aws.amazon.com/awscloudtrail/latest/userguide/view-cloudtrail-events.html"] },

  { id: "dva-4-761", exam: "DVA", dva: "4.2", topic: "cloudtrail", type: "mc",
    q: "A CloudTrail record shows an S3 DeleteObject call made with temporary credentials from AssumeRole. Its userIdentity type is AssumedRole. Where in userIdentity does the record show the role behind the session and the session's name?",
    opts: [
      "The role is in the accessKeyId field, and the session's name is in the invokedBy field.",
      "The role is in sessionContext.sessionIssuer, and the session's name ends the arn field.",
      "The role is in the userName field, and the session's name is in the principalId field.",
      "The role is in sourceIPAddress, and the session's name is in the eventSource field."
    ], a: 1,
    no: [
      "accessKeyId is the temporary access key, and invokedBy names an AWS service that made a call for you.",
      null,
      "For an assumed-role session, userIdentity has no top-level userName. The role is in sessionIssuer.",
      "Those are top-level fields of the record, not userIdentity, and they hold the caller's IP address and the service called."],
    why: "For an assumed role, userIdentity.arn is arn:aws:sts::account:assumed-role/RoleName/SessionName, so it ends with the session name the caller chose, and sessionContext.sessionIssuer names the role the session came from. A session name or source identity is how you tell who was behind a shared role.",
    doc: ["https://docs.aws.amazon.com/awscloudtrail/latest/userguide/cloudtrail-event-reference-user-identity.html"] }
);
