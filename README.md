# Whisper Web — Speech to Text

A static browser app that records microphone audio and transcribes it using a
self-hosted Whisper server. The server runs `whisper.cpp` behind Caddy and is
served from `api.tinkwhisper.com` via Cloudflare Tunnel. No API key or browser
model download is needed.

The frontend is hosted on Cloudflare at <https://tinkwhisper.com>. This GitHub
repository stores the source code.

## Features

- Record from your microphone with a live audio level meter.
- Transcribe long recordings in chunks while you speak, so only the last few
  seconds are left to process after you stop.
- The default language, 中文 / English, handles Chinese, English, and mixed
  speech. Choose another language, or Auto for automatic detection.
- Join server output lines into one paragraph and remove extra spaces between
  Chinese characters, preserving spaces around English words and restoring
  missing spaces after English punctuation.
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
and click **Start Recording**. Click **Stop Recording** to finish; the text
appears once the last chunk is transcribed. Use **Continue Recording** to add
to the current text.

While recording, the app sends audio in chunks of up to 28 seconds, each under
Whisper's 30-second window. A chunk is cut at the next half-second pause after
18 seconds, at any pause of 1.2 seconds or more after 8 seconds, or at 28
seconds at the best pause found so far. Chunks are transcribed one at a time in
order, and the combined text is applied to the transcript when you stop, so
edits made while recording are kept. The server takes under a second for a
28-second chunk, so the wait after Stop is about that long however long you
recorded. The server processes one request at a time across all users; because
chunks are short, another person's recording delays yours by about a second at
most. Running a second server instance does not help: both share one GPU, so
two simultaneous requests then finish together but no sooner.

Network failures are retried up to twice per chunk, with an 800 ms pause
between attempts and a fresh 120-second timeout for each attempt. HTTP errors,
response-reading errors, and timeouts fail immediately without retrying. If
every chunk fails, a message appears and the previous transcript is kept so you
can try again. If only some chunks fail, the rest of the text is used and each
failed chunk is marked `[…]`.

## Transcription backend

The endpoint is configured once, in `TRANSCRIBE_URL` near the top of the inline
script in `index.html`:

```text
POST https://api.tinkwhisper.com/v1/audio/transcriptions
```

For each chunk, the browser sends `multipart/form-data` containing:

- `file`: the chunk as a mono, 16 kHz, 8-bit μ-law WAV named `audio.wav`. This
  is half the size of 16-bit PCM, and the transcripts of the test clips were
  identical either way. The playback preview stays 16-bit PCM.
- `response_format`: `json`.
- `prompt`: a short bilingual hint (`TRANSCRIBE_PROMPT`) that makes Whisper add
  punctuation. Keep it short and in both languages, opening in English: a long
  Chinese prompt makes Whisper turn English speech into garbled Chinese, even
  with `language=en`, and opening in English kept English sentences intact more
  often than opening in Chinese.
- `no_timestamps`: `true`. The app does not use timestamps, and skipping them
  is about 20% faster on long audio.
- `language`: the selected language code, or `auto` for Auto. The default `zh`
  keeps English sentences in English when the prompt above is used; `auto`
  costs about 1 second per chunk and tends to drop the minority language in a
  mixed chunk.
- `translate`: `true` when Translate is selected, using whisper.cpp's translation
  option on the same endpoint.

The server runs `whisper-server` with `--vad --vad-model
models/ggml-silero-v6.2.0.bin`, so silent chunks return empty text in a few
milliseconds instead of being transcribed as stray words. It is built with
`-DWHISPER_COREML=1` and loads `models/ggml-large-v3-turbo-encoder.mlmodelc`, so
the encoder, which is most of each request's time, runs through Core ML. This
halves the time per chunk compared with Metal alone, with identical output.

Known limitation: when one chunk holds a Chinese sentence followed by English
sentences, Whisper sometimes drops the English. Chinese with English words
mixed in, and chunks in a single language, are transcribed reliably.

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

Use a modern browser supporting Web Audio (AudioWorklet, with a ScriptProcessor
fallback) and clipboard access.
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
