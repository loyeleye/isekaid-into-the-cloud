import json, os, sys, base64, urllib.request
model, out, prompt = sys.argv[1], sys.argv[2], sys.argv[3]
body = {'contents': [{'parts': [{'text': prompt}]}], 'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '21:9'}}}
req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(),
                             headers={'Content-Type': 'application/json', 'x-goog-api-key': os.environ['GEMINI_API_KEY']})
d = json.load(urllib.request.urlopen(req, timeout=110))
for p in d['candidates'][0]['content']['parts']:
    if 'inlineData' in p: open(out, 'wb').write(base64.b64decode(p['inlineData']['data'])); print('saved', out); break
else: print(json.dumps(d)[:500])
