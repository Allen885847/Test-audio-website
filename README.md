# VoiceNote

A small browser-based voice-to-text website built with HTML, CSS, and JavaScript.

## Run locally

Microphone access requires a secure context. `localhost` counts as secure, so start a local server instead of double-clicking `index.html`:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in Google Chrome or Microsoft Edge and allow microphone access.

## Speech recognition

This version uses the browser's built-in Web Speech API. No SDK, npm package, or API key is required. Chrome or Edge is recommended because browser support for live speech recognition varies. Depending on the browser, speech recognition may use the browser vendor's online recognition service; the site itself does not save an audio file.

The default **中文 + English** mode uses the Simplified Chinese recognizer, which also supports common English words spoken within Chinese sentences. The language menu also provides dedicated Mandarin, Cantonese, and English modes. Browser speech engines do not guarantee perfect automatic language detection, so selecting the main spoken language gives the best accuracy.

To change the recognition language, edit `recognition.lang` in `script.js`. For example:

- English: `en-US`
- Mandarin Chinese: `zh-CN`
- Cantonese: `yue-Hant-HK`

## Files

- `index.html` — page structure
- `styles.css` — responsive visual design
- `script.js` — microphone, waveform, timer, and transcription logic
