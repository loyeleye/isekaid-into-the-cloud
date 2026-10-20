// Question bank batch: SAA AI and media services, second round (Comprehend, Polly, Rekognition, SageMaker AI, Textract,
// Lex, Transcribe, Translate, Kinesis Video Streams). Same schema and rules as js/bank-dva.js.
window.SD = window.SD || {};
SD.bank = SD.bank || [];

SD.bank.push(
  // Domain 1: Design Secure Architectures
  { id: "saa-1-501", exam: "SAA", saa: "1.3", topic: "transcribe", type: "mc",
    q: "A company records customer support calls in English and stores the audio in Amazon S3. Analysts will read text transcripts of the calls, but the credit card numbers, bank account numbers and addresses that callers speak must never appear in the text the analysts see. Which solution meets these requirements with the LEAST operational overhead?",
    opts: [
      "Run Amazon Transcribe batch jobs with PII redaction turned on, and have the jobs write only the redacted transcripts.",
      "Run Amazon Transcribe batch jobs, then run an Amazon Comprehend PII redaction job on the transcripts before analysts read them.",
      "Run Amazon Transcribe batch jobs with a custom vocabulary filter that masks card numbers, account numbers and addresses.",
      "Run Amazon Transcribe batch jobs, and scan the transcripts with Amazon Macie to find card numbers, account numbers and addresses."
    ], a: 0,
    no: [null,
      "It works, but it adds a second service and job for every transcript when Transcribe can redact the PII in the same job.",
      "A vocabulary filter only changes exact words that you list in advance. It can't recognize the card numbers or addresses that callers say.",
      "Macie discovers and reports sensitive data in S3. It doesn't remove that data from the transcripts the analysts read."],
    why: "Transcribe can redact PII such as credit card numbers, bank account numbers and addresses during a batch job, replacing each instance with [PII]. You choose whether the job writes only the redacted transcript or both versions.",
    doc: ["https://docs.aws.amazon.com/transcribe/latest/dg/pii-redaction.html", "https://docs.aws.amazon.com/transcribe/latest/dg/pii-redaction-batch.html"] },

  // Domain 2: Design Resilient Architectures
  { id: "saa-2-501", exam: "SAA", saa: "2.1", topic: "comprehend", type: "mc",
    q: "A company receives about 20,000 customer emails a day. Each email must be sorted into one of 14 categories that the company defined, such as billing dispute or warranty claim, and placed on that team's SQS queue within seconds of arrival. The company has two years of past emails already labeled with these categories and has no data scientists. Which solution meets these requirements?",
    opts: [
      "Train an Amazon Comprehend custom classifier on the labeled emails, create an endpoint, and call it for each email to pick the queue.",
      "Train an Amazon Comprehend custom classifier, and run an asynchronous classification job each night on the day's emails to pick queues.",
      "Call Amazon Comprehend DetectSentiment on each email as it arrives, and send it to the queue that matches its sentiment and score.",
      "Write a classification model in Python, train it with Amazon SageMaker AI on the labeled emails, and host it on a SageMaker AI endpoint."
    ], a: 0,
    no: [null,
      "Asynchronous jobs classify sets of documents in batches, so emails would wait for the next run instead of being routed within seconds.",
      "Sentiment says whether an email is positive, negative, neutral or mixed. It can't sort emails into the company's own 14 categories.",
      "It could work, but writing and tuning a model needs the data science skills the company doesn't have."],
    why: "Comprehend custom classification trains a model on your labeled documents to recognize classes you define, such as types of support request. An endpoint for the classifier classifies a single document in real time, so each email can be routed as it arrives.",
    doc: ["https://docs.aws.amazon.com/comprehend/latest/dg/how-document-classification.html", "https://docs.aws.amazon.com/comprehend/latest/dg/manage-endpoints.html"] },

  { id: "saa-2-502", exam: "SAA", saa: "2.1", topic: "lex", type: "mc",
    q: "A utility company's phone line uses a touch-tone menu that callers find slow. Callers must be able to say what they need in their own words, such as reporting an outage, and be asked follow-up questions for any missing details, but they must also be able to key in account numbers on the keypad. Calls the system can't resolve must go to a human agent. Which solution meets these requirements?",
    opts: [
      "Add an Amazon Lex V2 bot to an Amazon Connect Customer flow, and route the call to an agent queue when the bot can't resolve it.",
      "Stream each call to Amazon Transcribe, and have a Lambda function route the call by the keywords it finds in the transcript text.",
      "Replace the recorded menu prompts with Amazon Polly voices, and keep collecting each caller's choice as keypad menu digits.",
      "Analyze each call in real time with Amazon Transcribe Call Analytics, and use the issues it detects to answer the caller's request."
    ], a: 0,
    no: [null,
      "Transcribe only turns speech into text. Keyword matching doesn't understand the request or ask the caller for missing details.",
      "Polly only makes the prompts sound natural. Callers still have to work through the same touch-tone menu.",
      "Call Analytics gives insights such as sentiment and issues for analysis. It doesn't hold a conversation with the caller."],
    why: "Amazon Connect Customer (previously named Amazon Connect) is a cloud contact center whose flows can hand a call to an Amazon Lex V2 bot. Lex understands spoken requests and prompts for missing slot values, and in a Connect Customer flow it can also take input as keypad digits.",
    doc: ["https://docs.aws.amazon.com/connect/latest/adminguide/amazon-lex.html", "https://docs.aws.amazon.com/lexv2/latest/dg/what-is.html"] },

  { id: "saa-2-503", exam: "SAA", saa: "2.1", topic: "lex", type: "multi", hint: "Select TWO.",
    q: "A retailer's website chat bot is an Amazon Lex V2 bot with an English (US) language. The retailer must add Spanish for its US customers, using sample utterances and prompts written by its own staff. Chats in which a customer sounds upset must be handed to a human agent while the chat is still going on. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Add a Spanish (US) language to the same Lex V2 bot, with its own intents, sample utterances, slots and prompts.", ok: true },
      { t: "Turn on sentiment analysis for the bot alias, and hand the chat to an agent when an utterance comes back negative.", ok: true },
      { t: "Turn on Amazon Comprehend language detection for the bot so that Lex maps Spanish utterances onto the English intents.", ok: false, no: "Lex doesn't map utterances from one language onto another. Each language needs its own intents, utterances and prompts in the bot." },
      { t: "Select a Spanish Amazon Polly voice for the English language so that the bot answers Spanish speakers in Spanish.", ok: false, no: "A Polly voice only speaks the bot's prompts aloud. The English language still can't understand Spanish or reply in it." },
      { t: "Run an Amazon Comprehend sentiment job each night on the conversation logs, and call back the customers who were upset.", ok: false, no: "A nightly job finds upset customers after their chats have ended, not while the chat is going on." }
    ],
    why: "A Lex V2 bot can hold several languages and locales, each with its own intents, sample utterances, slots and prompts. With sentiment analysis turned on for an alias, Lex calls Amazon Comprehend on each utterance and returns the sentiment, so the flow can hand a negative conversation to a human agent.",
    doc: ["https://docs.aws.amazon.com/lexv2/latest/dg/add-language.html", "https://docs.aws.amazon.com/lexv2/latest/dg/sentiment.html"] },

  { id: "saa-2-504", exam: "SAA", saa: "2.1", topic: "rekognition", type: "mc",
    q: "A construction company's gate cameras save a still image to an S3 bucket each time a worker enters a site. Within a minute, the site manager must get an alert about any person in the image who isn't wearing a hard hat. The company wants no servers to run and no model to train. Which solution meets these requirements?",
    opts: [
      "Have S3 events invoke a Lambda function that calls Amazon Rekognition DetectProtectiveEquipment and alerts through SNS.",
      "Have S3 events invoke a Lambda function that calls Amazon Rekognition DetectFaces and alerts when no head cover is reported.",
      "Train an Amazon Rekognition Custom Labels model on images of hard hats, and run it on each image from a scheduled EC2 job.",
      "Have S3 events invoke a Lambda function that calls Amazon Rekognition SearchFacesByImage on a collection of workers' photos."
    ], a: 0,
    no: [null,
      "DetectFaces returns face details such as eyeglasses, emotions and pose. It doesn't report hard hats or other head covers.",
      "Training a custom model and running an EC2 job breaks both the no-training and the no-servers requirements.",
      "Searching a face collection identifies who a worker is. It says nothing about whether the worker wears a hard hat."],
    why: "DetectProtectiveEquipment uses a pre-trained model to find the persons in an image and whether each wears a face, hand or head cover, and head covers include hard hats. Its optional summary lists the persons without the required equipment, so a Lambda function triggered by the upload can alert through SNS.",
    doc: ["https://docs.aws.amazon.com/rekognition/latest/dg/ppe-detection.html"] },

  // Domain 3: Design High-Performing Architectures
  { id: "saa-3-501", exam: "SAA", saa: "3.5", topic: "transcribe", type: "multi", hint: "Select TWO.",
    q: "A company streams its conference keynotes live. Remote viewers need live captions in English, the speakers' language, and in German and Japanese, each appearing a few seconds after the words are spoken. The company wants managed AWS services and no models to train. Which services should a solutions architect use to produce the captions? (Select TWO.)",
    items: [
      { t: "Amazon Transcribe streaming transcription on the live keynote audio to produce the English caption text.", ok: true },
      { t: "Amazon Translate real-time TranslateText calls on each English caption segment for German and Japanese.", ok: true },
      { t: "Amazon Transcribe batch transcription jobs on the keynote recording to produce the English caption text.", ok: false, no: "Batch jobs transcribe media files after they're recorded, so the captions couldn't keep up with the live talk." },
      { t: "Amazon Translate batch translation jobs on the English caption files, started every few seconds.", ok: false, no: "Batch translation suits collections of documents when instant translation isn't required, not live captions." },
      { t: "Amazon Polly to convert the keynote speech into English, German and Japanese caption text.", ok: false, no: "Polly converts text into speech, not speech into text, and it doesn't translate." }
    ],
    why: "Transcribe streaming returns a transcript in real time as the audio arrives, and live closed captioning is one of its common uses. TranslateText translates each caption segment as soon as it is called, unlike Translate's batch jobs.",
    doc: ["https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html", "https://docs.aws.amazon.com/translate/latest/dg/sync.html"] },

  { id: "saa-3-502", exam: "SAA", saa: "3.5", topic: "kinesisvideo", type: "mc",
    q: "A company makes smart video doorbells that sit behind customers' home routers. From a phone app, a homeowner must see the visitor and talk with them both ways with less than one second of delay. The company doesn't want to build or run any signaling, STUN or TURN servers. Which solution meets these requirements?",
    opts: [
      "Give each doorbell an Amazon Kinesis Video Streams signaling channel, and connect the doorbell and app peer to peer with WebRTC.",
      "Stream each doorbell to an Amazon Kinesis video stream, and play the video in the phone app with an HLS streaming session URL.",
      "Send each doorbell's video to an AWS Elemental MediaLive channel, and deliver it to the phone app through Amazon CloudFront.",
      "Run WebRTC signaling and TURN relay servers on EC2 instances in an Auto Scaling group, and connect both sides through them."
    ], a: 0,
    no: [null,
      "HLS playback is one-way and typically lags 3 to 5 seconds, so it can't carry a two-way conversation in under a second.",
      "MediaLive encodes one-way live video for broadcast to viewers. It doesn't carry a two-way conversation between a doorbell and a phone.",
      "It works, but it means building and running exactly the signaling and relay servers the company wants to avoid."],
    why: "Kinesis Video Streams with WebRTC is a fully managed WebRTC capability that provides signaling channels and the STUN and TURN servers that peers behind NAT need. It supports real-time two-way audio and video between camera devices and mobile or web apps, and video doorbells are one of its named uses.",
    doc: ["https://docs.aws.amazon.com/kinesisvideostreams-webrtc-dg/latest/devguide/what-is-kvswebrtc.html", "https://docs.aws.amazon.com/kinesisvideostreams-webrtc-dg/latest/devguide/kvswebrtc-how-it-works.html"] },

  { id: "saa-3-503", exam: "SAA", saa: "3.5", topic: "kinesisvideo", type: "mc",
    q: "A warehouse streams its security cameras to Amazon Kinesis Video Streams with 90-day data retention. When an incident is reported, the security team must hand investigators a single MP4 file that covers the exact 20-minute window from one camera, without running any video-processing servers. Which solution meets these requirements?",
    opts: [
      "Call the Kinesis Video Streams GetClip API for the camera's stream with the window's start and end timestamps, and save the MP4.",
      "Call GetHLSStreamingSessionURL in ON_DEMAND mode for the incident's time range, and give investigators the playback URL.",
      "Call the Kinesis Video Streams GetImages API for the incident's time range, and give investigators the extracted image files.",
      "Set up Amazon Data Firehose to read the camera's video stream and deliver it to S3, and download the objects for the window."
    ], a: 0,
    no: [null,
      "An HLS session URL plays the archived video in a player and expires. It isn't a single MP4 file that investigators can keep.",
      "GetImages returns still images taken from the video, not a video file.",
      "Firehose can't use a Kinesis video stream as its source, so it can't deliver the stored video to S3."],
    why: "GetClip downloads an MP4 file containing the archived media from a video stream over the time range you specify. It requires the stream's data retention to be greater than zero, which this stream has.",
    doc: ["https://docs.aws.amazon.com/kinesisvideostreams/latest/APIReference/API_reader_GetClip.html", "https://docs.aws.amazon.com/kinesisvideostreams/latest/dg/hls-playback.html"] },

  { id: "saa-3-504", exam: "SAA", saa: "3.5", topic: "textract", type: "mc",
    q: "An expense app lets employees photograph receipts from thousands of different shops. For each receipt, the app must store the vendor name, date, total, tax and each line item in the same standard fields, even when the vendor name appears only in the shop's logo. The company doesn't want to build templates or train models. Which solution meets these requirements?",
    opts: [
      "Call Amazon Textract AnalyzeExpense on each receipt image, and store the standard fields and line items that it returns.",
      "Call Amazon Textract AnalyzeDocument with the FORMS feature on each receipt image, and store the key-value pairs it finds.",
      "Call Amazon Textract AnalyzeID on each receipt image, and store the vendor, date and total fields that it normalizes.",
      "Call Amazon Rekognition DetectText on each receipt image, and store the lines of text that it finds in the database."
    ], a: 0,
    no: [null,
      "Forms analysis returns keys as each receipt prints them, so the same field gets different names, and a logo isn't a key-value pair.",
      "AnalyzeID extracts fields from identity documents such as driver's licenses and passports, not from receipts.",
      "DetectText returns words and lines with no idea which one is the vendor, the tax or a line item."],
    why: "AnalyzeExpense extracts invoice and receipt data without templates and maps the different labels that documents use onto standard fields such as VENDOR_NAME, TOTAL and TAX, plus line items. It can find the vendor name even when it appears only in a logo.",
    doc: ["https://docs.aws.amazon.com/textract/latest/dg/invoices-receipts.html", "https://docs.aws.amazon.com/textract/latest/dg/analyzing-document-expense.html"] },

  { id: "saa-3-505", exam: "SAA", saa: "3.5", topic: "polly", type: "multi", hint: "Select TWO.",
    q: "An education company is building a children's reading app. The app must read each story aloud in a natural voice and highlight each word on screen at the moment it is spoken. Several made-up character names must also be pronounced the way the authors intended. Which steps meet these requirements? (Select TWO.)",
    items: [
      { t: "Request Amazon Polly word speech marks for each story in addition to the audio, and use their times to highlight words.", ok: true },
      { t: "Upload an Amazon Polly pronunciation lexicon for the character names, and apply it when synthesizing each story.", ok: true },
      { t: "Run Amazon Comprehend syntax analysis on each story, and use the word offsets it returns to time the highlighting.", ok: false, no: "Syntax analysis gives each word's position in the text, not when the word is spoken in the audio." },
      { t: "Add the character names to an Amazon Transcribe custom vocabulary so that the synthesized speech says them correctly.", ok: false, no: "Custom vocabularies improve speech-to-text accuracy. They don't change how synthesized speech pronounces a word." },
      { t: "Add the character names to an Amazon Translate custom terminology so that the synthesized speech says them correctly.", ok: false, no: "Custom terminology controls how terms are translated between languages, not how they sound when spoken." }
    ],
    why: "Polly speech marks are metadata that say where each word or sentence starts and ends in the synthesized audio, so an app can highlight words as they are spoken. A pronunciation lexicon applied in the synthesis request changes how Polly pronounces specific words, such as invented names.",
    doc: ["https://docs.aws.amazon.com/polly/latest/dg/speechmarks.html", "https://docs.aws.amazon.com/polly/latest/dg/managing-lexicons.html"] },

  { id: "saa-3-506", exam: "SAA", saa: "3.5", topic: "translate", type: "mc",
    q: "A law firm must translate about 5,000 English contracts into French each week. It has a large set of sentence pairs from past contracts that its human translators wrote, and the machine output must follow their style and word choices. Translations can be delivered the next day, and the firm has no ML staff to train models. Which solution meets these requirements?",
    opts: [
      "Import the past sentence pairs into Amazon Translate as parallel data, and run batch translation jobs that use it.",
      "Import the past sentence pairs into Amazon Translate as a custom terminology, and translate each contract with TranslateText.",
      "Run Amazon Translate batch translation jobs with the formality setting set to formal for every one of the French contracts.",
      "Train a custom translation model with Amazon SageMaker AI on the past sentence pairs, and run it with a batch transform job."
    ], a: 0,
    no: [null,
      "Custom terminology fixes how specific terms such as names are translated. It doesn't adapt the style and phrasing of whole sentences.",
      "Formality only switches between formal and informal register. It doesn't reflect the firm's own style and word choices.",
      "It could work, but building and training a translation model needs the ML skills the firm doesn't have."],
    why: "Adding parallel data to a batch translation job makes it an Active Custom Translation job, which adapts the output to the style, tone and word choices in your example translations without training a custom model. Batch jobs suit large sets of documents when instant translation isn't needed.",
    doc: ["https://docs.aws.amazon.com/translate/latest/dg/customizing-translations-parallel-data.html", "https://docs.aws.amazon.com/translate/latest/dg/async.html"] },

  // Domain 4: Design Cost-Optimized Architectures
  { id: "saa-4-501", exam: "SAA", saa: "4.2", topic: "sagemaker", type: "mc",
    q: "A data science team has trained a churn model in Amazon SageMaker AI. Once a night it must score all 30 million customer records that an export job writes to Amazon S3, and the scores must be in S3 by morning. No application calls the model at any other time. Which solution is the MOST cost-effective?",
    opts: [
      "Run a SageMaker AI batch transform job each night on the S3 export, and have it write the scores to an S3 output location.",
      "Deploy the model to a SageMaker AI real-time endpoint that runs all day, and have a nightly script send it every record.",
      "Deploy the model to a SageMaker AI Serverless Inference endpoint, and have a Lambda function send it each record one at a time.",
      "Copy the model to an EC2 On-Demand instance that runs all the time, and score the S3 export with a cron job each night."
    ], a: 0,
    no: [null,
      "The endpoint's instances are billed around the clock although the model is used for only a few hours a night.",
      "Serverless Inference suits intermittent traffic. Sending 30 million records one request at a time is slow and pays for every call.",
      "The instance is billed all day for a nightly job, and the team has to manage the server and the scoring code itself."],
    why: "Batch transform gets inferences from large datasets in S3 when you don't need a persistent endpoint. SageMaker AI starts the compute for the job, splits the input across instances and writes the results to S3, so you pay only while the job runs.",
    doc: ["https://docs.aws.amazon.com/sagemaker/latest/dg/batch-transform.html", "https://docs.aws.amazon.com/sagemaker/latest/dg/serverless-endpoints.html"] }
);
