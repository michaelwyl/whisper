# Whisper Web — Speech to Text

A static browser app that records microphone audio and transcribes it using a
self-hosted Whisper server. The server runs `whisper.cpp` behind Caddy and is
served from `api.tinkwhisper.com` via Cloudflare Tunnel. No API key or browser
model download is needed.

The frontend is hosted on Cloudflare at <https://tinkwhisper.com>. This GitHub
repository stores the source code.

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

Open <https://tinkwhisper.com>, allow microphone access, select a language,
and click **Start Recording**. Click **Stop Recording** to send the audio for
transcription. Use **Continue Recording** to add to the current text.

The server processes one request at a time. A 30-second clip typically takes
about 5–8 seconds to process; longer clips take proportionally longer. The app
shows a transcribing state while waiting. Network failures are retried up to
twice, with an 800 ms pause between attempts and a fresh 120-second timeout for
each attempt. HTTP errors, response-reading errors, and timeouts fail immediately
without retrying. If a request ultimately fails, a message appears and the
previous transcript is kept so you can try again.

## Transcription backend

The endpoint is configured once, in `TRANSCRIBE_URL` near the top of the inline
script in `index.html`:

```text
POST https://api.tinkwhisper.com/v1/audio/transcriptions
```

The browser sends `multipart/form-data` containing:

- `file`: the recording, converted by the existing audio pipeline to a mono,
  16 kHz WAV named `audio.wav`.
- `response_format`: `json`.
- `prompt`: a fixed hint for mixed Chinese and English speech about computer
  networks, software engineering, and data analysis.
- `language`: the selected language code, omitted when Auto is selected.
- `translate`: `true` when Translate is selected, using whisper.cpp's translation
  option on the same endpoint.

The response is JSON, for example `{"text":"Recognized speech."}`. Requests
send no authentication header and no model field. The browser supplies the
multipart boundary and Origin header automatically.

**The API allows the production origin `https://tinkwhisper.com`.** Test real
transcription from the Cloudflare-hosted site. To support localhost, preview
hosts, or other origins, update the server's CORS allowlist. The browser sets
the Origin header automatically.

## Local development and checks

The app uses plain HTML and JavaScript, with Tailwind CSS loaded from a CDN.
There is no frontend framework, application backend, or credential configuration.
Vite is available for local development and optional production builds:

```bash
npm install
npm run dev
```

The development server opens at <http://localhost:3000>. The UI can be exercised
locally; real transcription also requires the development origin to be allowed
by the server's CORS configuration.
The convenience scripts `./start.sh` and `start.bat` also start the dev server.

```bash
npm test
npm run build
npm run preview
```

Tests use mocked browser APIs and network requests, so they do not require the
live transcription server. Build output goes to `dist/`.

## Cloudflare deployment

Cloudflare serves the frontend at <https://tinkwhisper.com>. Manage the frontend
deployment and custom domain in Cloudflare, and keep the source code in this
GitHub repository.

The root `index.html` is ready to serve as a static page. It requires no build
step, environment variables, or secrets. If Cloudflare builds the site, use
`npm run build` as the build command and `dist/` as the output directory.

After deployment, record a short clip at <https://tinkwhisper.com> and check that
the browser Network tab shows a POST to `api.tinkwhisper.com` returning HTTP 200,
and that its text appears in the transcript box.

## Storage, privacy, and browser requirements

Audio is sent to the self-hosted server for transcription. The latest recording
is held in memory for playback. Recent transcript text is saved in this
browser's `localStorage`; if storage is unavailable, history lasts only for the
current session.

Use a modern browser supporting MediaRecorder, Web Audio, and clipboard access.
Microphone access requires HTTPS or localhost. If microphone access fails,
check browser permissions. If transcription fails, check that the server is
reachable and that you are using the production origin `https://tinkwhisper.com`.
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
