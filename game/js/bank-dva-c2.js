// Question bank batch: points chapter 2 teaches that the bank had no question on (S3 delete markers, undeleting,
// suspending versioning, noncurrent version expiration, EventBridge prefix matching). First written for the chapter's
// minigames, then reworded here without the story. Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Task 1.3: Use data stores in application development
  { id: "dva-1-601", exam: "DVA", dva: "1.3", topic: "s3", type: "mc",
    q: "An application stores reports in an S3 bucket that has versioning enabled. A cleanup job sends a DeleteObject request for one report's key without a version ID. Afterward, a plain GetObject request for that key returns 404 Not Found. What happened to the report's versions?",
    opts: [
      "Only the newest version was removed, and the version before it is now stored as the noncurrent copy of the key.",
      "Every version was moved to a cheaper noncurrent storage class, where each will be kept for 30 days and then expire.",
      "Every version is still stored, and a new delete marker is now the current version of the key in the bucket.",
      "Every version was permanently removed, because MFA Delete was not turned on for the bucket when the job ran."
    ], a: 2,
    no: [
      "Removing one specific version takes a request that names its version ID. A request with no version ID removes nothing.",
      "Only lifecycle rules or a copy change an object's storage class. A delete never does.",
      null,
      "MFA Delete guards requests that permanently delete a version. A request with no version ID only adds a marker, with or without it."],
    why: "In a versioned bucket, a DeleteObject request without a version ID permanently removes nothing. S3 inserts a delete marker, which becomes the key's current version, so a plain GET returns 404 while every earlier version stays stored.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeleteMarker.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/DeletingObjectVersions.html"] },

  { id: "dva-1-602", exam: "DVA", dva: "1.3", topic: "s3", type: "mc",
    q: "A developer accidentally deleted an object in a versioned S3 bucket with a request that named no version ID, so the key now returns 404. The developer wants the newest real version to be current again, without uploading anything or creating a new version. Which request does that?",
    opts: [
      "A PutObject request on the same key with an empty body, which replaces the delete marker as the current version.",
      "A DeleteObject request that names the delete marker's version ID, which removes the delete marker from the key.",
      "A GetObject request that names the newest real version's ID, which marks that version as the current one again.",
      "A RestoreObject request on the same key, which brings the object back from behind its delete marker in place."
    ], a: 1,
    no: [
      "That creates a new, empty version and makes it current, so the key returns an empty object.",
      null,
      "That reads the old version, but changes nothing. A plain GET of the key still returns 404.",
      "RestoreObject makes a temporary copy of an object in an archive storage class, such as S3 Glacier Deep Archive. It doesn't touch delete markers."],
    why: "Permanently deleting the delete marker, with a DeleteObject request that names the marker's version ID, removes it. The version beneath it then becomes current again, and no new version is created.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/ManagingDelMarkers.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/RestoringPreviousVersions.html"] },

  { id: "dva-1-603", exam: "DVA", dva: "1.3", topic: "s3", type: "mc",
    q: "A team enabled versioning on an S3 bucket two years ago. Storage costs have grown, and a manager asks a developer to turn versioning off so that the bucket stops keeping new versions of objects. What can the developer do?",
    opts: [
      "Disable versioning on the bucket. S3 then deletes every noncurrent version and keeps only each object's current version.",
      "Disable versioning on the bucket. S3 then returns the bucket to unversioned, the state it was in before it was enabled.",
      "Nothing directly. Once versioning is on, only AWS Support can change the bucket's versioning state for the account.",
      "Suspend versioning on the bucket. New writes stop adding versions, and existing versions stay until they're deleted."
    ], a: 3,
    no: [
      "A bucket that has had versioning enabled can't be returned to unversioned, and suspending it deletes nothing.",
      "A bucket can be unversioned, enabled, or suspended. Once enabled, it can never go back to unversioned.",
      "The bucket owner can suspend versioning at any time with PutBucketVersioning. No support case is needed.",
      null],
    why: "After versioning is enabled, the bucket owner can suspend it but never return the bucket to unversioned. While suspended, new writes get the null version ID instead of adding versions, and existing versions stay until they are deleted, for example by a lifecycle rule.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/VersionSuspendedBehavior.html"] },

  { id: "dva-1-604", exam: "both", dva: "1.3", saa: "4.1", topic: "s3", type: "mc",
    q: "A versioned S3 bucket has a lifecycle rule with a NoncurrentVersionExpiration action and NoncurrentDays set to 30. An object is overwritten today, so its previous version becomes noncurrent. What will the rule do to that previous version?",
    opts: [
      "It permanently deletes the version 30 days after the version became noncurrent.",
      "It moves the version to S3 Glacier Flexible Retrieval 30 days after it was written.",
      "It places a delete marker over the version once the version is 30 days old.",
      "It deletes the object's current version 30 days after the current version was written."
    ], a: 0,
    no: [null,
      "Moving versions between storage classes is a transition action. An expiration action deletes them.",
      "Delete markers apply to a key's current version. Expiring a noncurrent version removes it permanently.",
      "That describes the Expiration action for current versions, which in a versioned bucket adds a delete marker instead."],
    why: "NoncurrentVersionExpiration permanently deletes noncurrent versions a set number of days after they become noncurrent. It is the usual way to cap the storage cost of keeping versions.",
    doc: ["https://docs.aws.amazon.com/AmazonS3/latest/userguide/intro-lifecycle-rules.html", "https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-configuration-examples.html"] },

  // Task 1.1: Develop code for applications hosted on AWS
  { id: "dva-1-605", exam: "DVA", dva: "1.1", topic: "eventbridge", type: "mc",
    q: "An order service sends events to EventBridge with detail-types OrderPlaced, OrderShipped, and OrderCancelled, and the team will add more Order event types later. A developer needs one rule that matches every current and future Order event type without editing the rule each time. Which part of the event pattern does that?",
    opts: [
      "\"detail-type\": [\"OrderPlaced\", \"OrderShipped\", \"OrderCancelled\"]",
      "\"detail-type\": [{\"anything-but\": [\"PaymentFailed\"]}]",
      "\"detail-type\": [\"Order*\"]",
      "\"detail-type\": [{\"prefix\": \"Order\"}]"
    ], a: 3,
    no: [
      "A list of values matches only those values, so every Order event type added later is missed.",
      "That matches every event type except PaymentFailed, including events that have nothing to do with orders.",
      "A plain string is an exact match, asterisk included. Wildcards need the separate wildcard operator.",
      null],
    why: "Prefix matching ({\"prefix\": \"Order\"}) matches any string value that starts with the given characters, so new Order event types match without a change to the rule.",
    doc: ["https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-pattern-operators.html", "https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-event-patterns.html"] }
);
