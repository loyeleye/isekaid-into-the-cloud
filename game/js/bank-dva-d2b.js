// Question bank batch: DVA task 2.2 (encryption with KMS, S3, DynamoDB, ACM and TLS) and task 2.3 (secrets, parameters, sensitive data and tenant isolation). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 2.2: Encryption
  { id: "dva-2-201", exam: "both", dva: "2.2", saa: "1.3", topic: "kms", type: "mc",
    q: "A company stores contracts in S3. Its auditors require that the company itself writes the policy that controls who can use the encryption key, can disable the key at any time, and can see every use of the key in CloudTrail. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Use SSE-KMS with a customer managed key, and write the key policy that lists the principals allowed to use it.",
      "Use SSE-KMS with the AWS managed key aws/s3, and restrict access to the bucket with a bucket policy instead.",
      "Use SSE-S3 default encryption on the bucket, and turn on S3 server access logging to record every object request.",
      "Encrypt each object client-side with keys kept in an AWS CloudHSM cluster that the company runs and patches."
    ], a: 0,
    no: [null,
      "An AWS managed key's policy is controlled by the service. The company can view it but can't edit it or disable the key.",
      "SSE-S3 uses keys that S3 owns. The company can't write their policy, disable them or audit their use in CloudTrail.",
      "It gives full control, but running an HSM cluster and client-side encryption is far more work than a KMS key."],
    why: "Only a customer managed key lets the company write the key policy, enable and disable the key, and see its use in CloudTrail. AWS managed keys are controlled by the service, and AWS owned keys can't be seen or audited at all.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/concepts.html"] },

  { id: "dva-2-202", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A provisioning service creates a record for each new customer and stores an encrypted data key with it. Days later, a separate worker service encrypts that customer's files with the key. Security requires that the provisioning service never holds a plaintext data key. Which KMS operation should the provisioning service call?",
    opts: [
      "GenerateDataKeyWithoutPlaintext, storing the CiphertextBlob it returns with the customer's new record.",
      "GenerateDataKey, storing the CiphertextBlob and deleting the Plaintext field from memory right after the call.",
      "GenerateRandom, and then call Encrypt on the random bytes before storing them with the customer's record.",
      "CreateKey, creating one new KMS key for each customer and storing the new key's ARN with the record."
    ], a: 0,
    no: [null,
      "GenerateDataKey always returns the plaintext key, so the service would hold it, however briefly.",
      "The service would hold the plaintext random bytes before encrypting them, which the rule forbids.",
      "A KMS key per customer adds key costs and quota use, and the worker would still need data keys for files."],
    why: "GenerateDataKeyWithoutPlaintext returns only the data key encrypted under the KMS key. The component that later encrypts the data calls Decrypt on it, so the component that creates the key never sees it in plaintext.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_GenerateDataKeyWithoutPlaintext.html"] },

  { id: "dva-2-203", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "An order service encrypts small payment tokens with the KMS Encrypt API and passes the encryption context {\"orderId\": \"<id>\"}. A new reporting service calls Decrypt on the same ciphertexts with the right key and permissions, but every call fails with InvalidCiphertextException. What should the developer change?",
    opts: [
      "Pass the same encryption context, with the matching orderId, in each Decrypt request.",
      "Pass the key ARN in the KeyId parameter of each Decrypt request, so KMS uses the right key.",
      "Grant the reporting service's role kms:ReEncryptFrom on the key, then call ReEncrypt first.",
      "Base64-decode the stored ciphertexts twice before sending them in the Decrypt request."
    ], a: 0,
    no: [null,
      "KMS reads the key from a symmetric ciphertext's metadata, and the stem says the key and permissions are right.",
      "ReEncrypt also has to decrypt first, so it fails the same way without the encryption context.",
      "Nothing in the stem points to an encoding problem. A missing encryption context explains every failure."],
    why: "The encryption context is additional authenticated data that is bound to the ciphertext. Decrypt succeeds only when the request carries exactly the same context, otherwise KMS returns InvalidCiphertextException.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html", "https://docs.aws.amazon.com/kms/latest/APIReference/API_Decrypt.html"] },

  { id: "dva-2-204", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A nightly job runs under a role that normally has no access to a customer managed key. Each run, an orchestrator must give the role Decrypt permission on the key for the run only, without editing the key policy or IAM policies, and the job must be able to use the permission straight away. What should the developer do?",
    opts: [
      "Call CreateGrant for the role, pass the returned grant token in the job's Decrypt calls, and retire the grant after the run.",
      "Call PutKeyPolicy to add the role before each run, then call PutKeyPolicy again to remove it once the run finishes.",
      "Attach an inline policy that allows kms:Decrypt to the role before the run, and delete the inline policy after it.",
      "Create an alias for the key for each run, and allow kms:Decrypt on the alias name only while the run is in progress."
    ], a: 0,
    no: [null,
      "That edits the key policy twice a night, which the requirement rules out, and a mistake could lock others out.",
      "That edits IAM policies, which the requirement rules out.",
      "Aliases don't carry permissions of their own. Access still comes from the key policy, IAM policies or grants."],
    why: "Grants give temporary permissions on one KMS key without changing policies. Because grants are eventually consistent, a grant token lets the grantee use the permission at once, and RetireGrant or RevokeGrant removes it afterwards.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/grants.html"] },

  { id: "dva-2-205", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "An app stores millions of data keys that were encrypted under an old customer managed key. The team must move them under a new KMS key, and the plaintext data keys must never be exposed outside KMS during the move. Which approach should the developer use?",
    opts: [
      "Call ReEncrypt on each encrypted data key with the new key as the destination, with kms:ReEncryptFrom on the old key and kms:ReEncryptTo on the new key.",
      "Call Decrypt on each encrypted data key with the old key, then call Encrypt on the plaintext result with the new key, and overwrite the stored copy.",
      "Turn on automatic key rotation for the old key, so KMS moves every existing encrypted data key under new key material at the next rotation.",
      "Update the old key's alias to point to the new key, so every later Decrypt request that names the alias uses the new key on the stored data keys."
    ], a: 0,
    no: [null,
      "It works, but the plaintext data keys pass through the app's memory, which the requirement forbids.",
      "Rotation adds new key material to the same key. It doesn't re-encrypt existing ciphertexts or move them to another key.",
      "The stored ciphertexts were made under the old key, so the new key can't decrypt them, whatever the alias points to."],
    why: "ReEncrypt decrypts and re-encrypts a ciphertext entirely inside KMS, so the plaintext never leaves the service. The caller needs kms:ReEncryptFrom on the source key and kms:ReEncryptTo on the destination key.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_ReEncrypt.html"] },

  { id: "dva-2-206", exam: "DVA", dva: "2.2", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "A developer turns on automatic key rotation for a symmetric customer managed key that encrypts data keys for an app, with the default rotation period. Which statements about the result are true? (Select TWO.)",
    items: [
      { t: "Ciphertexts made before the rotation still decrypt, because KMS keeps the older key material and picks the right one.", ok: true },
      { t: "The key ID, key ARN, aliases and key policy stay the same, so the app needs no code or configuration changes.", ok: true },
      { t: "The app must re-encrypt its stored data keys within 30 days, or they can no longer be decrypted after the rotation.", ok: false, no: "Rotation never retires old key material for KMS-generated keys. Old ciphertexts keep decrypting with no action." },
      { t: "Each rotation creates a new KMS key with a new key ID, so the app has to be pointed at the new key's ARN after it.", ok: false, no: "Rotation changes only the key material. The KMS key stays the same logical resource with the same ID." },
      { t: "Rotation also rotates the data keys the KMS key generated, so files encrypted with them are re-encrypted in place.", ok: false, no: "Rotation has no effect on data keys or on the data they protect. Nothing is re-encrypted." }
    ],
    why: "Automatic rotation (every 365 days by default) adds new key material to the same KMS key and keeps all older material. Encrypt uses the current material, and Decrypt automatically uses the material that made the ciphertext.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/rotate-keys.html"] },

  { id: "dva-2-207", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "An app in us-east-1 encrypts records with a KMS key and replicates them to eu-west-1. If us-east-1 is down, the eu-west-1 copy of the app must decrypt the records without calling KMS in us-east-1 and without re-encrypting them. What should the developer do?",
    opts: [
      "Create a multi-Region primary key in us-east-1 and a replica key in eu-west-1, and encrypt the records with the primary key.",
      "Create a separate customer managed key in eu-west-1, and copy the us-east-1 key's ARN into the eu-west-1 app's configuration.",
      "Create a grant on the us-east-1 key for the eu-west-1 app's role, so the app can use the key from either Region at any time.",
      "Call ReEncrypt in eu-west-1 on each record as it arrives, with a key in eu-west-1 as the destination key for the call."
    ], a: 0,
    no: [null,
      "Single-Region keys have different key material, so the eu-west-1 key can't decrypt us-east-1 ciphertexts.",
      "A grant gives permission, but every call still goes to KMS in us-east-1, which is down.",
      "ReEncrypt needs the source key in us-east-1, and it re-encrypts every record, which the requirement rules out."],
    why: "Related multi-Region keys share key material and key ID, so ciphertext made by one can be decrypted by another in a different Region with no cross-Region call to KMS.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/multi-region-keys-overview.html"] },

  { id: "dva-2-208", exam: "DVA", dva: "2.2", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "A Lambda function in account B must decrypt data that was encrypted with a customer managed KMS key in account A. Which changes are required? (Select TWO.)",
    items: [
      { t: "In account A, add a key policy statement that allows account B, or the function's role, to call kms:Decrypt.", ok: true },
      { t: "In account B, give the function's role an IAM policy that allows kms:Decrypt on the key's full key ARN.", ok: true },
      { t: "In account B, refer to the key by its alias name only, such as alias/orders-key, in every Decrypt call.", ok: false, no: "A bare alias name or key ID is looked up in the caller's own account. Cross-account calls use the key ARN or alias ARN." },
      { t: "In account A, re-encrypt the data under the AWS managed key aws/lambda, which other accounts can use.", ok: false, no: "AWS managed keys can only be used by principals in their own account, and only through their service." },
      { t: "In account A, attach an IAM policy that allows kms:Decrypt to a role that lives in account B.", ok: false, no: "An account can't attach IAM policies to another account's roles. Account A grants access in the key policy." }
    ],
    why: "Cross-account use of a KMS key needs both sides: the key policy in the owning account must allow the external account or principal, and an IAM policy in the external account must delegate that permission to the caller.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/key-policy-modifying-external-accounts.html"] },

  { id: "dva-2-209", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A telemetry service uses the AWS Encryption SDK to encrypt thousands of small messages a second, each under a new data key from KMS. The KMS bill has grown sharply and the service sees occasional ThrottlingException errors. The team accepts reusing each data key for a short, bounded time. What should the developer do?",
    opts: [
      "Use the Encryption SDK's data key caching, with limits on each cached key's age and number of messages.",
      "Switch the service to call the KMS Encrypt API directly on each message, since the messages are small.",
      "Create several more customer managed keys, and spread the messages evenly across them to share the load.",
      "Retry every throttled request at once in a loop until KMS accepts it, so that no message is ever dropped."
    ], a: 0,
    no: [null,
      "That is still one KMS request per message, so cost and throttling stay the same.",
      "The request quota for cryptographic operations is shared by all symmetric keys in the account and Region.",
      "Immediate retries add even more requests and make throttling worse. Retries need backoff with jitter."],
    why: "Data key caching lets the Encryption SDK reuse a data key for many messages within security thresholds you set, which cuts KMS requests, cost and throttling.",
    doc: ["https://docs.aws.amazon.com/encryption-sdk/latest/developer-guide/data-key-caching.html", "https://docs.aws.amazon.com/kms/latest/developerguide/requests-per-second.html"] },

  { id: "dva-2-210", exam: "DVA", dva: "2.2", topic: "kms", type: "mc",
    q: "A service signs software update manifests with an asymmetric KMS key that has the SIGN_VERIFY key usage. Devices in the field must verify the signatures offline and have no AWS credentials. How should the developer give the devices what they need?",
    opts: [
      "Call GetPublicKey on the KMS key, and ship the public key with the device firmware for local verification.",
      "Have each device call the KMS Verify API with the key's ARN each time a new update manifest arrives.",
      "Export the private key from KMS once, and install it on every device so that it can check signatures.",
      "Create a symmetric KMS key instead, and have the devices use GenerateMac and VerifyMac to check updates."
    ], a: 0,
    no: [null,
      "Verify is a KMS API call, which needs AWS credentials and a network connection that the devices don't have.",
      "KMS never exports private keys, and putting a signing key on devices would let anyone forge updates.",
      "Those operations need an HMAC KMS key and calls to KMS, and devices have no access to KMS."],
    why: "The private key of an asymmetric KMS key never leaves KMS, but GetPublicKey returns the public key so others can verify signatures outside KMS without AWS credentials.",
    doc: ["https://docs.aws.amazon.com/kms/latest/APIReference/API_GetPublicKey.html"] },

  { id: "dva-2-211", exam: "DVA", dva: "2.2", topic: "acm", type: "mc",
    q: "An Application Load Balancer uses a public ACM certificate that was validated by DNS when it was issued. The certificate expires in three weeks, and ACM shows its renewal as pending validation. Last month an engineer cleaned up old records in the domain's DNS zone. What should the developer do?",
    opts: [
      "Add the CNAME record that ACM gives for the certificate's DNS validation back into the domain's DNS zone.",
      "Import a copy of the current certificate into ACM again, so that ACM restarts managed renewal for the copy.",
      "Request a new certificate for the domain with email validation, since that kind needs no DNS records to renew.",
      "Remove the certificate from the ALB listener and add it back, so ACM retries validation with the zone's records."
    ], a: 0,
    no: [null,
      "ACM doesn't renew imported certificates, so the copy would expire with no renewal at all.",
      "Email-validated renewals wait for someone to approve emails, and it means deploying a new certificate.",
      "The validation record is still missing, so ACM can't validate the domain however often the certificate is attached."],
    why: "ACM renews a DNS-validated certificate automatically as long as the certificate is in use and its validation CNAME record stays in place. Deleting the record stops automatic renewal.",
    doc: ["https://docs.aws.amazon.com/acm/latest/userguide/dns-validation.html", "https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html"] },

  { id: "dva-2-212", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "Every object in a bucket must be encrypted with one specific customer managed KMS key. Default encryption already uses that key, but some uploads explicitly request SSE-S3 or name a different KMS key. Those uploads must be rejected. What should the developer add to the bucket policy?",
    opts: [
      "A Deny on s3:PutObject when s3:x-amz-server-side-encryption-aws-kms-key-id doesn't equal the required key's ARN.",
      "An Allow on s3:PutObject when s3:x-amz-server-side-encryption equals aws:kms, for all principals in the account.",
      "A Deny on s3:PutObject when aws:SecureTransport is false, so that only encrypted connections can upload objects.",
      "A Deny on s3:GetObject when the object wasn't encrypted with the required key, so that those objects can't be read."
    ], a: 0,
    no: [null,
      "An Allow blocks nothing, and checking only for aws:kms would still accept any other KMS key.",
      "That enforces encryption in transit. It says nothing about which key encrypts objects at rest.",
      "The wrongly encrypted objects would still be written. The requirement is to reject the uploads."],
    why: "The s3:x-amz-server-side-encryption-aws-kms-key-id condition key lets a bucket policy deny uploads unless S3 will encrypt them with a specific KMS key. Default encryption alone doesn't stop a request from asking for different settings.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html"] },

  { id: "dva-2-213", exam: "both", dva: "2.2", saa: "1.3", topic: "s3", type: "mc",
    q: "A defense contractor must store files in S3 under a compliance standard that requires two independent layers of encryption at rest. The company wants to keep using KMS keys it controls and to avoid writing any encryption code. Which solution meets these requirements?",
    opts: [
      "Use dual-layer server-side encryption with AWS KMS keys (DSSE-KMS) as the bucket's default encryption.",
      "Use SSE-KMS with a customer managed key, and turn on S3 Bucket Keys as well to add a second encryption layer.",
      "Use SSE-S3 as default encryption, and also require HTTPS for every request with a bucket policy.",
      "Use the Amazon S3 Encryption Client in the app, and then upload the objects to a bucket with SSE-KMS."
    ], a: 0,
    no: [null,
      "Bucket Keys reduce KMS requests. It's still a single layer of encryption.",
      "HTTPS protects data in transit. At rest there is still only one layer.",
      "It gives two layers, but it means client-side encryption code, which the company wants to avoid."],
    why: "DSSE-KMS applies two independent layers of AES-256 encryption on the server side, using KMS keys, to meet standards that require multilayer encryption at rest.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingDSSEncryption.html"] },

  { id: "dva-2-214", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "A role's policy allows s3:GetObject on a bucket's objects. Objects uploaded last month download fine, but newer objects, uploaded after the bucket switched to SSE-KMS with a customer managed key, return AccessDenied. What should the developer do?",
    opts: [
      "Allow kms:Decrypt on the customer managed key for the role, in the role's IAM policy and the key policy as needed.",
      "Allow s3:GetObjectVersion on the bucket's objects for the role, because the newer objects are new object versions.",
      "Turn on S3 Bucket Keys for the bucket, so that the role no longer needs any KMS permission to read the objects.",
      "Re-upload the newer objects with SSE-S3, then switch the bucket back to SSE-KMS for objects uploaded later on."
    ], a: 0,
    no: [null,
      "GetObject without a version ID reads the current version, and the older objects already work.",
      "Bucket Keys cut the number of KMS calls, but readers still need kms:Decrypt on the key.",
      "That abandons the customer managed key for those objects and doesn't fix future reads."],
    why: "Reading an SSE-KMS object makes S3 call KMS Decrypt on the caller's behalf, so the caller needs kms:Decrypt on the key as well as s3:GetObject. Uploads need kms:GenerateDataKey.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingKMSEncryption.html"] },

  { id: "dva-2-215", exam: "DVA", dva: "2.2", topic: "s3", type: "mc",
    q: "A health app uploads patient documents to S3. A new policy says the documents must be encrypted before they leave the app's servers, so that AWS never receives them in plaintext. The keys may stay in KMS. What should the developer do?",
    opts: [
      "Use the Amazon S3 Encryption Client with a KMS key as the wrapping key, so objects are encrypted before upload.",
      "Upload the documents with SSE-C, sending a 256-bit key that the app generates with each upload request.",
      "Set the bucket's default encryption to SSE-KMS with a customer managed key that only the app can use.",
      "Set the bucket's default encryption to DSSE-KMS, so each object gets two layers of encryption in S3."
    ], a: 0,
    no: [null,
      "With SSE-C, S3 receives the plaintext and the key and does the encryption itself.",
      "Server-side encryption means S3 receives the plaintext and encrypts it at rest.",
      "Both layers are applied by S3 after it receives the plaintext object."],
    why: "Client-side encryption encrypts data locally before it is sent, so S3 only ever receives ciphertext. The S3 Encryption Client does this with a unique data key per object, wrapped by a KMS key.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/UsingClientSideEncryption.html"] },

  { id: "dva-2-216", exam: "DVA", dva: "2.2", topic: "dynamodb", type: "mc",
    q: "A busy DynamoDB table uses the default encryption at rest. A new rule says the company must control the key's policy and see each use of the key in CloudTrail. The table can't be taken offline or recreated. Which solution needs the LEAST effort?",
    opts: [
      "Update the table's encryption settings to use a customer managed KMS key that the company creates.",
      "Update the table's encryption settings to use the AWS managed key aws/dynamodb in the company's account.",
      "Create a new table that uses a customer managed key, copy the items into it, and point the app at it.",
      "Encrypt the sensitive attributes in the app with the AWS Database Encryption SDK before each write."
    ], a: 0,
    no: [null,
      "Its use shows in CloudTrail, but the company can't write or change an AWS managed key's policy.",
      "It meets the key rule, but recreating the table is more work and is ruled out.",
      "It means code changes on every write and read, and the table's other data still uses the default key."],
    why: "DynamoDB encrypts every table at rest and lets you switch an existing table between an AWS owned key, an AWS managed key and a customer managed key at any time. Only a customer managed key lets the company control its key policy.",
    doc: ["https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html"] },

  { id: "dva-2-217", exam: "DVA", dva: "2.2", topic: "elb", type: "multi", hint: "Select TWO.",
    q: "A web app runs on EC2 instances behind an Application Load Balancer that has only an HTTP listener on port 80. The app must be served over HTTPS for www.example.com with a certificate that renews automatically, and users who type http:// must still reach the site. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Add an HTTPS listener on port 443 that uses a public ACM certificate for www.example.com, validated by DNS.", ok: true },
      { t: "Change the port 80 listener's default action to a redirect to HTTPS on port 443 with status code HTTP_301.", ok: true },
      { t: "Remove the port 80 listener, and block port 80 in the load balancer's security group so that no plain HTTP gets in.", ok: false, no: "Users who type http:// would then get no response at all instead of being sent to HTTPS." },
      { t: "Generate a self-signed certificate on each instance, and import a copy of it into ACM for the HTTPS listener.", ok: false, no: "Browsers don't trust self-signed certificates, and ACM doesn't renew imported certificates." },
      { t: "Put a Network Load Balancer in front of the ALB, with a TLS listener that uses a certificate created by ACM.", ok: false, no: "It adds a load balancer the app doesn't need, and plain HTTP visitors still aren't sent to HTTPS." }
    ],
    why: "An ALB terminates TLS on an HTTPS listener with an ACM certificate, which ACM renews automatically when it is DNS-validated and in use. A redirect action on the HTTP listener sends http:// visitors to HTTPS.",
    doc: ["https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html", "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/rule-action-types.html"] },

  { id: "dva-2-218", exam: "both", dva: "2.2", saa: "1.3", topic: "cloudfront", type: "multi", hint: "Select TWO.",
    q: "A CloudFront distribution serves a site from a custom origin on an Application Load Balancer. Data must be encrypted in transit on both legs, from viewers to CloudFront and from CloudFront to the origin, and visitors who use http:// links must still reach the site. Which settings meet these requirements? (Select TWO.)",
    items: [
      { t: "Set the cache behavior's viewer protocol policy to Redirect HTTP to HTTPS.", ok: true },
      { t: "Set the origin's protocol policy to HTTPS Only, with a valid certificate on the ALB.", ok: true },
      { t: "Set the cache behavior's viewer protocol policy to HTTP and HTTPS for all requests.", ok: false, no: "That lets viewers keep using plain HTTP between their browsers and CloudFront." },
      { t: "Set the origin's protocol policy to HTTP Only, since traffic to the ALB stays inside AWS.", ok: false, no: "CloudFront would then send requests to the origin unencrypted, which breaks the second leg." },
      { t: "Turn on origin access control for the distribution, so its origin requests are signed.", ok: false, no: "OAC signs requests to S3 and certain other AWS origins. It doesn't make the connection to an ALB use TLS." }
    ],
    why: "The viewer protocol policy controls the viewer-to-CloudFront leg, and Redirect HTTP to HTTPS sends HTTP users to HTTPS. The origin protocol policy controls the CloudFront-to-origin leg, and HTTPS Only always uses TLS there.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-viewers-to-cloudfront.html", "https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-https-cloudfront-to-custom-origin.html"] },

  { id: "dva-2-219", exam: "DVA", dva: "2.2", topic: "apigateway", type: "multi", hint: "Select TWO.",
    q: "A partner-facing REST API must accept calls only from clients that present a certificate issued by the company's own certificate authority. Clients must not be able to skip this check by calling the API another way. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Set up a Regional custom domain name with mutual TLS, with a truststore of the CA's certificates in S3.", ok: true },
      { t: "Disable the API's default execute-api endpoint, so that clients can only reach the API through the custom domain.", ok: true },
      { t: "Create a usage plan with an API key for each partner, and require that key on every method of the API.", ok: false, no: "API keys meter and throttle callers. They are not client certificates and don't authenticate anyone." },
      { t: "Generate a client certificate in API Gateway for the stage, and give a copy of it to each of the partners.", ok: false, no: "A stage client certificate lets backends verify that calls come from API Gateway. It doesn't check callers." },
      { t: "Attach a resource policy to the API that allows calls only when the aws:SecureTransport key is true.", ok: false, no: "API Gateway endpoints already use HTTPS. That says nothing about whether the client holds a certificate." }
    ],
    why: "Mutual TLS on a custom domain makes API Gateway require a client certificate that chains to a CA in the truststore. Clients can still use the default execute-api endpoint until it is disabled.",
    doc: ["https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-mutual-tls.html", "https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-api-disable-default-endpoint.html"] },

  { id: "dva-2-220", exam: "both", dva: "2.2", saa: "1.3", topic: "acm", type: "mc",
    q: "A company runs dozens of internal microservices that must talk to each other over TLS using certificates that only the company's own systems trust. The team doesn't want to run its own certificate authority servers, and wants certificates to renew automatically. Which solution meets these requirements?",
    opts: [
      "Create a CA in AWS Private CA, and request private certificates from it through ACM for the services.",
      "Request public ACM certificates for each internal hostname, and attach them to the services' load balancers.",
      "Run an open-source CA on an EC2 instance, and issue certificates from it with a scheduled renewal script.",
      "Generate self-signed certificates on each service, and add every one of them to each service's trust store."
    ], a: 0,
    no: [null,
      "Public certificates need publicly resolvable domains and are trusted by everyone, not only by the company.",
      "That works, but it means running and securing CA servers, which the team wants to avoid.",
      "Renewing and redistributing dozens of self-signed certificates by hand is error-prone and not automatic."],
    why: "AWS Private CA runs a private CA hierarchy for you. Private certificates requested through ACM are trusted only where you install the CA's certificate, and ACM renews them automatically.",
    doc: ["https://docs.aws.amazon.com/privateca/latest/userguide/PcaWelcome.html", "https://docs.aws.amazon.com/acm/latest/userguide/managed-renewal.html"] },

  // Task 2.3: Sensitive data in application code
  { id: "dva-2-221", exam: "DVA", dva: "2.3", topic: "ssm", type: "mc",
    q: "At startup, an app calls GetParametersByPath for /shop/prod/ with Recursive set to true. There are 40 parameters under the path, but the app only ever gets the first 10, and no error is returned. What should the developer change?",
    opts: [
      "Keep calling GetParametersByPath, passing the NextToken from each response, until no NextToken comes back.",
      "Set MaxResults to 100 on the request, so that all 40 parameters come back in one GetParametersByPath response.",
      "Move the parameters to the advanced tier, which raises the number of parameters returned for each request.",
      "Set WithDecryption to true on the request, so that SecureString parameters are no longer left out of the results."
    ], a: 0,
    no: [null,
      "MaxResults for GetParametersByPath accepts at most 10, so the call is rejected.",
      "Tiers change storage limits, value size and policies, not how many results a call returns.",
      "Without decryption, SecureString parameters are still returned, with their values encrypted."],
    why: "GetParametersByPath returns at most 10 parameters per call. When more remain, the response includes a NextToken to pass in the next call. The SDKs' paginators do this loop for you.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html"] },

  { id: "dva-2-222", exam: "DVA", dva: "2.3", topic: "ssm", type: "multi", hint: "Select TWO.",
    q: "A Lambda function must load all of its settings from Parameter Store under /billing/prod/, including nested paths such as /billing/prod/db/ and SecureString values encrypted with a customer managed KMS key, and use the plaintext values. Which steps are needed? (Select TWO.)",
    items: [
      { t: "Call GetParametersByPath with Path /billing/prod, Recursive set to true and WithDecryption set to true.", ok: true },
      { t: "Allow the role ssm:GetParametersByPath on the path and kms:Decrypt on the parameters' customer managed key.", ok: true },
      { t: "Call GetParameters with the name /billing/prod/*, so that one call returns every parameter under the path.", ok: false, no: "GetParameters takes exact parameter names. It doesn't accept wildcards or paths." },
      { t: "Move every parameter to the advanced tier, because SecureString values can only be read in the advanced tier.", ok: false, no: "Both tiers support SecureString parameters. The advanced tier is for size, count and policies." },
      { t: "Give the role permission to call ssm:DescribeParameters, which returns each parameter's plaintext value.", ok: false, no: "DescribeParameters returns metadata about parameters, not their values." }
    ],
    why: "GetParametersByPath with Recursive returns every level under the path, and WithDecryption returns SecureString values in plaintext, which works only if the caller can use the KMS key with kms:Decrypt.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/APIReference/API_GetParametersByPath.html", "https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-hierarchies.html"] },

  { id: "dva-2-223", exam: "DVA", dva: "2.3", topic: "ssm", type: "mc",
    q: "An app reads its feature settings from the parameter /app/settings using the selector /app/settings:live. A bad value was just saved as version 8, and version 7 was the last good one. The team must roll back in seconds without changing the app's code or configuration. What should the developer do?",
    opts: [
      "Move the live label from version 8 to version 7 of the parameter, so the selector resolves to the good value.",
      "Delete version 8 of the parameter, so that Parameter Store falls back to returning version 7 for the selector.",
      "Change the app's configuration to read /app/settings:7, so that it always reads the last good version.",
      "Attach an Expiration parameter policy to version 8 that expires it right away, so version 7 is returned."
    ], a: 0,
    no: [null,
      "Parameter Store doesn't delete single versions, and a missing version makes the call fail rather than fall back.",
      "That changes the app's configuration, which the requirement rules out.",
      "Expiration policies delete the whole parameter on a date, and they need the advanced tier."],
    why: "Parameter labels are aliases for parameter versions, and a label can be moved from one version to another. Apps that read name:label get whichever version holds the label.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-paramstore-labels.html"] },

  { id: "dva-2-224", exam: "both", dva: "2.3", saa: "1.2", topic: "ssm", type: "mc",
    q: "A team keeps about 200 settings for its apps, including a few license keys that must be stored encrypted. Each value is under 1 KB, none needs automatic rotation, and the apps read them through the AWS SDK at startup. Which solution is MOST cost-effective?",
    opts: [
      "Store them as standard-tier Parameter Store parameters, with the license keys as SecureString parameters.",
      "Store every value as a separate secret in AWS Secrets Manager, and read the secrets at startup with the SDK.",
      "Store them as advanced-tier Parameter Store parameters, with the license keys as SecureString parameters.",
      "Store them in an encrypted DynamoDB table, with a provisioned-capacity read for each value at startup."
    ], a: 0,
    no: [null,
      "Secrets Manager charges per secret per month, and its rotation features aren't needed here.",
      "Advanced parameters carry a monthly charge each, and these values need nothing from that tier.",
      "It works, but it means building a config store, and provisioned capacity costs money even when idle."],
    why: "Standard-tier Parameter Store parameters have no extra storage charge, hold values up to 4 KB, and support SecureString encryption with KMS. Secrets Manager is worth its price when you need rotation or its other secret features.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html"] },

  { id: "dva-2-225", exam: "DVA", dva: "2.3", topic: "ssm", type: "multi", hint: "Select TWO.",
    q: "A platform account keeps a standard-tier String parameter, /shared/vpc-config, in Parameter Store. Apps in several other AWS accounts must read it with the SDK, and the platform team wants to keep one copy that it updates in place. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Change the parameter to the advanced tier, and share it with the other accounts through AWS Resource Access Manager.", ok: true },
      { t: "In the other accounts, call GetParameter with the parameter's full ARN as the Name instead of its bare name.", ok: true },
      { t: "Keep the parameter in the standard tier, and share it with the other accounts through AWS Resource Access Manager.", ok: false, no: "Only advanced-tier parameters can be shared. A standard parameter has to be changed to advanced first." },
      { t: "In the other accounts, call GetParameter with the bare name /shared/vpc-config, just as the platform account does.", ok: false, no: "A bare name is looked up in the caller's own account. A shared parameter must be named by its full ARN." },
      { t: "Run a nightly script that copies the parameter into each of the other accounts under the same parameter name.", ok: false, no: "That keeps a copy in every account that can drift until the next run, which the team wants to avoid." }
    ],
    why: "Parameter Store shares parameters with other accounts through AWS RAM, and only advanced-tier parameters can be shared. Consumers read a shared parameter by its full ARN. A shared SecureString also needs a customer managed key that is shared through KMS.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-shared-parameters.html"] },

  { id: "dva-2-226", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc",
    q: "A Lambda function written in Go calls GetSecretValue for an API key on every invocation. At peak it runs thousands of times a minute, and the Secrets Manager API bill keeps climbing. The team wants caching without adding code dependencies to the function. What should the developer do?",
    opts: [
      "Add the AWS Parameters and Secrets Lambda Extension as a layer, and read the secret from it over localhost.",
      "Copy the API key into an environment variable on the function, and stop calling Secrets Manager from the code.",
      "Raise the function's reserved concurrency, so that fewer execution environments need to fetch the secret.",
      "Turn on provisioned concurrency for the function, so its environments start up with the secret preloaded."
    ], a: 0,
    no: [null,
      "That puts the secret in the function's configuration, and rotations would no longer reach the function.",
      "Reserved concurrency caps or guarantees concurrency. The code still calls the API on every invocation.",
      "Provisioned concurrency keeps environments warm. It doesn't cache anything the code fetches per invocation."],
    why: "The extension runs as a layer, works with any runtime through a local HTTP endpoint on port 2773, and caches secrets and parameters (300 seconds by default), so most invocations make no API call.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/with-secrets-manager.html"] },

  { id: "dva-2-227", exam: "DVA", dva: "2.3", topic: "secrets", type: "mc",
    q: "A service reads its database password by calling GetSecretValue with a VersionId that the developer copied from the console. After the secret's first automatic rotation, the service's database logins start failing. What should the developer do so that the service keeps working after future rotations?",
    opts: [
      "Call GetSecretValue with no VersionId or VersionStage, so that it returns the version labeled AWSCURRENT.",
      "Call GetSecretValue with VersionStage set to AWSPREVIOUS, so that the service keeps the password it last used.",
      "Turn off automatic rotation, and change the password by hand when the service's code is next deployed.",
      "Call GetSecretValue with VersionStage set to AWSPENDING, so the service always gets the newest password."
    ], a: 0,
    no: [null,
      "AWSPREVIOUS is the old password that rotation just replaced, which the database no longer accepts.",
      "That gives up automatic rotation, which is why the secret is in Secrets Manager in the first place.",
      "AWSPENDING exists only while a rotation is in progress, so most of the time there is no such version."],
    why: "A secret always has one version labeled AWSCURRENT, and GetSecretValue returns it by default. Rotation moves the label to the new version, so apps that don't pin a version always get the working password.",
    doc: ["https://docs.aws.amazon.com/secretsmanager/latest/userguide/whats-in-a-secret.html"] },

  { id: "dva-2-228", exam: "DVA", dva: "2.3", topic: "ecs", type: "mc",
    q: "An ECS service injects a database password into its containers as an environment variable with the secrets section of the task definition, referencing a Secrets Manager secret. After the secret rotates, the running tasks keep using the old password. What should the developer do?",
    opts: [
      "Update the service with the Force new deployment option after each rotation, so new tasks get the new value.",
      "Raise the task definition's memory, so that the container agent has room to refresh environment variables.",
      "Add secretsmanager:GetSecretValue to the task role, so that the containers can refresh the variable at once.",
      "Reference the secret's AWSPREVIOUS version in valueFrom, so that tasks always hold the most recent value."
    ], a: 0,
    no: [null,
      "Memory has nothing to do with it. Injected values are never refreshed in a running container.",
      "The value is injected once at start-up with the execution role. Granting the task role doesn't refresh it.",
      "AWSPREVIOUS is the old value, which is the opposite of what the tasks need."],
    why: "ECS injects secrets into a container only when the container starts. After a rotation, new tasks must be launched, for example with Force new deployment, or the app must read the secret itself at runtime.",
    doc: ["https://docs.aws.amazon.com/AmazonECS/latest/developerguide/secrets-envvar-secrets-manager.html"] },

  { id: "dva-2-229", exam: "DVA", dva: "2.3", topic: "lambda", type: "multi", hint: "Select TWO.",
    q: "A Lambda function keeps a partner API token in an environment variable. Many engineers can view the function's configuration in the console, and the token must not be readable there. The team wants to keep the value in an environment variable for now. Which steps meet the requirement? (Select TWO.)",
    items: [
      { t: "Enable the console's encryption helpers with a customer managed key, and decrypt the value in code with KMS Decrypt.", ok: true },
      { t: "Give the function's execution role kms:Decrypt on that customer managed key, and keep it from the engineers.", ok: true },
      { t: "Rely on Lambda's default encryption at rest with the AWS managed key, which hides values from console users.", ok: false, no: "At-rest encryption with the default key is transparent. Console users with access still see the plaintext value." },
      { t: "Mark the environment variable as sensitive in the function's configuration, so the console masks its value.", ok: false, no: "Lambda has no such flag for environment variables. Encryption helpers or KMS permissions control visibility." },
      { t: "Base64-encode the token before saving it, and decode it in the function's handler on each invocation.", ok: false, no: "Base64 is an encoding, not encryption. Anyone can decode it in seconds." }
    ],
    why: "Encryption helpers encrypt the value client-side with a KMS key before it is saved, so the console shows ciphertext. The function decrypts it at runtime, which needs kms:Decrypt on the key in its execution role.",
    doc: ["https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars-encryption.html"] },

  { id: "dva-2-230", exam: "both", dva: "2.3", saa: "1.2", topic: "macie", type: "multi", hint: "Select TWO.",
    q: "A hospital stores exports in S3 and must find any objects that contain its internal patient record numbers, which follow a format such as PRN-123-45678 that no standard detector knows. Results must come from a managed service, not custom scanning code. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "In Amazon Macie, create a custom data identifier with a regular expression for the record number format.", ok: true },
      { t: "Run a Macie sensitive data discovery job on the buckets that includes the new custom data identifier.", ok: true },
      { t: "Turn on Amazon GuardDuty S3 Protection, so that it flags objects that contain patient record numbers.", ok: false, no: "GuardDuty S3 Protection looks for suspicious access and threats, not for sensitive data inside objects." },
      { t: "Use Amazon Inspector to scan the buckets, and filter its findings for the record number format.", ok: false, no: "Inspector scans workloads such as EC2 instances and container images for vulnerabilities, not S3 data." },
      { t: "Turn on S3 Inventory reports, and search the reports for the record number pattern in object names.", ok: false, no: "Inventory lists object metadata. It never looks inside objects, where the numbers are." }
    ],
    why: "Macie finds sensitive data in S3 with managed data identifiers, and custom data identifiers add your own patterns as a regex with optional keywords. A discovery job analyzes objects with the identifiers you choose.",
    doc: ["https://docs.aws.amazon.com/macie/latest/user/custom-data-identifiers.html", "https://docs.aws.amazon.com/macie/latest/user/discovery-jobs.html"] },

  { id: "dva-2-231", exam: "DVA", dva: "2.3", topic: "cloudwatch", type: "mc",
    q: "A CloudWatch Logs data protection policy masks credit card numbers in an app's log group. The fraud team must be able to see the original numbers when they investigate, while all other engineers keep seeing masked values. What should the developer do?",
    opts: [
      "Grant the fraud team's role the logs:Unmask permission on the log group, alongside its read permissions.",
      "Grant the fraud team's role kms:Decrypt on the KMS key that encrypts the log group's data at rest.",
      "Remove the data protection policy, and then give only the fraud team's role read access to the log group.",
      "Create a subscription filter that copies the log group's events to an S3 bucket for the fraud team."
    ], a: 0,
    no: [null,
      "KMS encryption at rest is separate from masking. Decrypt permission doesn't unmask anything.",
      "Other engineers who need the logs for their work would lose all access to them.",
      "Subscription filters deliver masked data too, so the bucket would hold masked numbers."],
    why: "Masked data stays masked in every view unless the reader's principal has logs:Unmask, so access to originals can be granted to a few roles while everyone else sees masked values.",
    doc: ["https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/mask-sensitive-log-data.html"] },

  { id: "dva-2-232", exam: "DVA", dva: "2.3", topic: "iam", type: "multi", hint: "Select TWO.",
    q: "A SaaS backend stores each tenant's files under a tenant prefix in one S3 bucket. A broker assumes a single shared role on behalf of each request. A bug in one tenant's request must never expose another tenant's files, and adding tenants must not mean new roles or policies. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Have the broker pass the tenant ID as a session tag in AssumeRole, and allow sts:TagSession in the role's trust policy.", ok: true },
      { t: "Allow S3 object actions in the role's policy only on arn:aws:s3:::bucket/${aws:PrincipalTag/tenant}/* resources.", ok: true },
      { t: "Create an IAM role for each tenant whose policy lists that tenant's prefix, and add a role when a tenant joins.", ok: false, no: "It isolates tenants, but every new tenant means a new role and policy, which the requirement rules out." },
      { t: "Have the backend code check the tenant ID before each S3 call, and keep the role's access to the whole bucket.", ok: false, no: "Isolation would rest on app code alone, so the bug the requirement worries about could expose other tenants." },
      { t: "Turn on S3 Object Ownership for the bucket, so each tenant's uploads are owned by that tenant's account.", ok: false, no: "Tenants don't have their own AWS accounts here, and Object Ownership controls ACLs, not tenant isolation." }
    ],
    why: "Session tags put the tenant ID into the role session, and the aws:PrincipalTag policy variable scopes access to that tenant's prefix. One role and one policy then isolate every tenant, enforced by IAM.",
    doc: ["https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html", "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html"] },

  { id: "dva-2-233", exam: "DVA", dva: "2.3", topic: "kms", type: "multi", hint: "Select TWO.",
    q: "A multi-tenant service encrypts each tenant's records with one shared KMS key. Its sessions carry a tenant session tag. The team wants KMS itself to refuse to decrypt one tenant's records in a session for another tenant, and to see the tenant on each Decrypt in CloudTrail. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Pass the tenant ID as encryption context, such as {\"tenant\": \"t-42\"}, on every encrypt and matching Decrypt call.", ok: true },
      { t: "Allow kms:Decrypt only when kms:EncryptionContext:tenant equals ${aws:PrincipalTag/tenant} in the role's policy.", ok: true },
      { t: "Put the tenant ID in the alias name of the key, such as alias/tenant-t-42, and use that alias in Decrypt calls.", ok: false, no: "Several aliases can point to the same key, so an alias in the request doesn't tie a ciphertext to a tenant." },
      { t: "Store the tenant ID inside the plaintext before encrypting, and check it in app code after each Decrypt call.", ok: false, no: "KMS would decrypt any tenant's data, and the check happens in app code after the data is exposed." },
      { t: "Turn on automatic key rotation, so that each tenant's records are encrypted under their own key material.", ok: false, no: "Rotation changes key material by date, not by tenant, and any caller with the key can decrypt every version." }
    ],
    why: "Encryption context is bound to the ciphertext, so Decrypt must name the same tenant, and it appears in CloudTrail. The kms:EncryptionContext condition key with a principal tag variable makes KMS refuse requests for other tenants.",
    doc: ["https://docs.aws.amazon.com/kms/latest/developerguide/encrypt_context.html", "https://docs.aws.amazon.com/kms/latest/developerguide/conditions-kms.html"] },

  { id: "dva-2-234", exam: "DVA", dva: "2.3", topic: "cloudformation", type: "multi", hint: "Select TWO.",
    q: "A CloudFormation template creates an RDS DB instance whose master password is passed as a template parameter in the deploy pipeline's command line. A review asks that the password never appear in the template, parameters or pipeline logs, and that it be rotatable later. Which steps should the developer take? (Select TWO.)",
    items: [
      { t: "Store the password in a Secrets Manager secret, created outside the template or with a generated password in it.", ok: true },
      { t: "Set MasterUserPassword with a {{resolve:secretsmanager:...}} dynamic reference instead of a template parameter.", ok: true },
      { t: "Keep the parameter, and set NoEcho to true on it, so that the deploy pipeline can keep passing the password in.", ok: false, no: "NoEcho masks the value in CloudFormation output, but the pipeline still handles and can log the plaintext." },
      { t: "Put the password in a Mappings section of the template, so that it is no longer one of the template's parameters.", ok: false, no: "Mappings are part of the template, so the password would sit in plain text in source control." },
      { t: "Base64-encode the password with Fn::Base64 in the template, so it never appears in plain text in the parameters.", ok: false, no: "Fn::Base64 encodes a value. It doesn't hide where the password comes from or keep it out of logs." }
    ],
    why: "A secretsmanager dynamic reference makes CloudFormation fetch the value from Secrets Manager at deploy time, so it never appears in the template, parameters or logs, and the secret can be rotated in Secrets Manager.",
    doc: ["https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html"] },

  { id: "dva-2-235", exam: "DVA", dva: "2.3", topic: "ssm", type: "mc",
    q: "An app must store a 6 KB TLS certificate chain in Parameter Store as a SecureString. The team also wants an EventBridge notification 15 days before the chain should be replaced. Saving it in the standard tier fails because the value is too large. What should the developer do?",
    opts: [
      "Store it as an advanced-tier SecureString parameter with Expiration and ExpirationNotification policies.",
      "Split the chain across two standard-tier SecureString parameters, with a NoChangeNotification policy each.",
      "Store it as a standard-tier String parameter instead, since String values can be larger than SecureString.",
      "Compress the chain into a standard-tier parameter, and have a Lambda function check its age daily."
    ], a: 0,
    no: [null,
      "Standard-tier parameters don't support parameter policies, and splitting the value adds code for no gain.",
      "Standard-tier values are limited to 4 KB whatever the type, and String would store the chain unencrypted.",
      "Compression may not get under 4 KB, and a custom checker is code the advanced tier's policies make unneeded."],
    why: "Advanced-tier parameters hold values up to 8 KB, against 4 KB in the standard tier, and only they support parameter policies such as Expiration and ExpirationNotification, which send events through EventBridge.",
    doc: ["https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-advanced-parameters.html", "https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-policies.html"] }
);
