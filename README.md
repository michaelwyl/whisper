# Whisper Web — Speech to Text

A static browser app that records microphone audio and transcribes it using a
self-hosted Whisper server. The server runs `whisper.cpp` behind Caddy and is
exposed through Tailscale Funnel. No API key or browser model download is needed.

## Features

- Record from your microphone with a live audio level meter.
- Choose a language or use automatic language detection.
- Join server output lines into one paragraph and remove extra spaces between
  Chinese characters, preserving spaces around English words.
- Select Translate to translate speech into English using Whisper.
- Start a new transcript or continue recording to append another segment on a
  new line, preserving your edits.
- Edit the transcript and copy it to the clipboard. Results are copied
  automatically; edits are copied after a 500 ms pause or when leaving the
  textbox, with support for Chinese input methods. Use Copy if auto-copy is
  blocked by your browser.
- Restore the last five transcripts saved in this browser, including after a
  refresh. Clear keeps history, and failed requests preserve the current text.
- Play back the latest recording segment.
- Recording controls wait for the current request to finish before accepting
  another segment.

## Use the app

Open <https://michaelwyl.github.io>, allow microphone access, select a language,
and click **Start Recording**. Click **Stop Recording** to send the audio for
transcription. Use **Continue Recording** to add to the current text.

The server processes one request at a time. A 30-second clip typically takes
about 5–8 seconds to process; longer clips take proportionally longer. The app
shows a transcribing state while waiting and times requests out after 120
seconds. Failures show a message and keep the previous transcript so you can
try again.

## Transcription backend

The endpoint is configured once, in `TRANSCRIBE_URL` near the top of the inline
script in `index.html`:

```text
POST https://yilins-mac-mini.tail73950a.ts.net/v1/audio/transcriptions
```

The browser sends `multipart/form-data` containing:

- `file`: the recording, converted by the existing audio pipeline to a mono,
  16 kHz WAV named `audio.wav`.
- `response_format`: `json`.
- `language`: the selected language code, omitted when Auto is selected.
- `translate`: `true` when Translate is selected, using whisper.cpp's translation
  option on the same endpoint.

The response is JSON, for example `{"text":"Recognized speech."}`. Requests
send no authentication header and no model field. The browser supplies the
multipart boundary and Origin header automatically.

**The server only allows the origin `https://michaelwyl.github.io`.** Requests
from localhost, preview hosts, or other origins are rejected with HTTP 403.
Test real transcription from the deployed GitHub Pages site. To support another
origin, update the server's CORS allowlist.

## Local development and checks

The app uses plain HTML and JavaScript, with Tailwind CSS loaded from a CDN.
There is no frontend framework, application backend, or credential configuration.
Vite is available for local development and optional production builds:

```bash
npm install
npm run dev
```

The development server opens at <http://localhost:3000>. The UI can be exercised
locally, but real transcription is blocked by the server's origin restriction.
The convenience scripts `./start.sh` and `start.bat` also start the dev server.

```bash
npm test
npm run build
npm run preview
```

Tests use mocked browser APIs and network requests, so they do not require the
live transcription server. Build output goes to `dist/`.

## GitHub Pages deployment

The root `index.html` is ready to serve as a static page; no build step,
environment variables, or secrets are required. Publish it through the existing
GitHub Pages deployment. The optional Vite build also produces a standalone
`dist/index.html`.

After deployment, record a short clip at <https://michaelwyl.github.io> and check
that the browser Network tab shows a POST to the configured transcription
endpoint returning HTTP 200, and that its text appears in the transcript box.

## Storage, privacy, and browser requirements

Audio is sent to the self-hosted server for transcription. The latest recording
is held in memory for playback. Recent transcript text is saved in this
browser's `localStorage`; if storage is unavailable, history lasts only for the
current session.

Use a modern browser supporting MediaRecorder, Web Audio, and clipboard access.
Microphone access requires HTTPS or localhost. If microphone access fails,
check browser permissions. If transcription fails, check that the server is
reachable and that you are using the allowed GitHub Pages origin.
If the browser reports multiple `Access-Control-Allow-Origin` values, configure
Caddy to remove the upstream server's header before setting the allowed origin.

## Files

```text
index.html               UI and browser application logic
tests/recording.test.mjs  Recording and transcription regression tests
package.json             Development scripts and Vite dependency
vite.config.js           Development server and build configuration
start.sh / start.bat      Convenience launch scripts
```

## License and credits

MIT. Built with [Whisper](https://github.com/openai/whisper),
[whisper.cpp](https://github.com/ggml-org/whisper.cpp),
[Tailwind CSS](https://tailwindcss.com/), and [Vite](https://vite.dev/).
