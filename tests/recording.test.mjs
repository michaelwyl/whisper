import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];

function element() {
  const classes = new Set();
  return {
    value: '', disabled: false, children: [], handlers: {},
    classList: {
      add(...names) { names.forEach(name => classes.add(name)); },
      remove(...names) { names.forEach(name => classes.delete(name)); },
      toggle(name, enabled) { enabled ? classes.add(name) : classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
    addEventListener(name, callback) { this.handlers[name] = callback; },
    append(...children) { this.children.push(...children); },
    prepend(child) { this.children.unshift(child); },
    replaceChildren() { this.children = []; },
    querySelectorAll() { return this.children.flatMap(child => child.children); },
    getContext() { return {}; },
    focus() {}, scrollIntoView() {}, remove() {},
  };
}

function app({ micAllowed = true } = {}) {
  const elements = new Map();
  const storage = new Map();
  const recorders = [];
  const copied = [];
  const sentRequests = [];
  const timers = new Map();
  let nextTimer = 1;
  let pendingResponse;
  let pendingFailure;
  let requests = 0;
  class Recorder {
    constructor() {
      this.state = 'inactive';
      this.mimeType = 'audio/webm';
      recorders.push(this);
    }
    start() { this.state = 'recording'; }
    stop() { this.state = 'inactive'; }
    async finishStop() {
      this.ondataavailable?.({ data: new Blob(['audio']) });
      await this.onstop?.();
    }
  }
  const context = vm.createContext({
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, element());
        return elements.get(id);
      },
      createElement: element,
    },
    window: { addEventListener() {} },
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value),
    },
    navigator: {
      mediaDevices: { async getUserMedia() {
        if (!micAllowed) throw Error('Microphone denied');
        return { active: true };
      } },
      clipboard: { async writeText(text) { copied.push(text); } },
    },
    MediaRecorder: Recorder, Blob, FormData, AbortController,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    setTimeout(callback, delay) {
      const id = nextTimer++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    console: { error() {} },
    fetch(url, options) {
      requests++;
      sentRequests.push({ url, ...options });
      return new Promise((resolve, reject) => {
        pendingResponse = resolve;
        pendingFailure = reject;
        options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true });
      });
    },
  });
  vm.runInContext(script, context);
  // These tests exercise recording/transcription transitions, not audio decoding.
  vm.runInContext(`
    startLevelMeter = () => {};
    stopLevelMeter = () => {};
    convertToWav = async blob => new Blob([blob], { type: 'audio/wav' });
  `, context);
  const get = id => elements.get(id);
  const click = id => get(id).handlers.click();
  get('languageSelect').value = 'zh';
  get('taskSelect').value = 'transcribe';
  return {
    get, click, copied, recorders, sentRequests,
    get requests() { return requests; },
    get requestTimers() { return [...timers.values()].filter(timer => timer.delay === 120_000); },
    get statuses() { return get('statusArea').children.map(child => child.textContent); },
    get history() { return JSON.parse(storage.get('whisperTranscriptHistory') || '[]'); },
    edit(text) {
      get('transcript').value = text;
      get('transcript').handlers.input({});
    },
    async stop() {
      click('recordBtn');
      const finished = recorders.at(-1).finishStop();
      await Promise.resolve();
      return { finished };
    },
    respond(text, ok = true) {
      this.respondWith({ text }, { status: ok ? 200 : 503 });
    },
    respondWith(payload, { status = 200, jsonError = false } = {}) {
      assert.ok(pendingResponse, 'A transcription request must be pending');
      pendingResponse({ ok: status >= 200 && status < 300, status, json: async () => {
        if (jsonError) throw new SyntaxError('Invalid JSON');
        return payload;
      } });
      pendingResponse = null;
    },
    failRequest() {
      assert.ok(pendingFailure, 'A transcription request must be pending');
      pendingFailure(new TypeError('Failed to fetch'));
      pendingResponse = null;
    },
    expireRequest() {
      const timer = [...timers.entries()].find(([, timer]) => timer.delay === 120_000);
      assert.ok(timer, 'A request timeout must be scheduled');
      timers.delete(timer[0]);
      timer[1].callback();
    },
  };
}

test('Start replaces old text only on success and archives the old text', async () => {
  const a = app();
  assert.equal(a.get('continueBtn').classList.contains('hidden'), true);
  a.edit('Previous transcript');
  await a.click('recordBtn');
  assert.equal(a.get('recordBtn').textContent, 'Stop Recording');
  assert.equal(a.get('continueBtn').classList.contains('hidden'), true);
  const { finished } = await a.stop();
  assert.equal(a.get('transcript').value, 'Previous transcript');
  a.respond('First segment');
  await finished;
  assert.equal(a.get('transcript').value, 'First segment');
  assert.equal(a.get('continueBtn').classList.contains('hidden'), false);
  assert.equal(a.get('continueBtn').disabled, false);
  assert.deepEqual(a.history.map(entry => entry.text), ['First segment', 'Previous transcript']);
});

test('Continue preserves edits during recording and processing; copies and saves the full result', async () => {
  const a = app();
  a.edit('原文');
  await a.click('continueBtn');
  a.edit('录音期间的修改');
  const first = await a.stop();
  a.edit('转写期间的最终修改');
  a.respond('Additional English text.');
  await first.finished;
  const combined = '转写期间的最终修改\nAdditional English text.';
  assert.equal(a.get('transcript').value, combined);
  assert.equal(a.copied.at(-1), combined);
  assert.equal(a.history[0].text, combined);
  await a.click('continueBtn');
  const second = await a.stop();
  a.respond('第三段。');
  await second.finished;
  assert.equal(a.get('transcript').value, combined + '\n第三段。');
  assert.equal(a.requests, 2);
});

test('Pending transcription blocks new recordings, clear and history restore', async () => {
  const a = app();
  a.edit('Keep this');
  const starting = a.click('continueBtn');
  await a.click('recordBtn');
  await starting;
  assert.equal(a.recorders.length, 1);
  a.click('recordBtn');
  assert.equal(a.get('recordBtn').disabled, true);
  assert.equal(a.get('continueBtn').disabled, true);
  await a.click('continueBtn');
  await a.click('recordBtn');
  a.click('clearBtn');
  assert.equal(a.recorders.length, 1);
  assert.equal(a.get('transcript').value, 'Keep this');
  assert.equal(a.get('historyList').children[0].children[0].disabled, true);
  const finished = a.recorders[0].finishStop();
  await Promise.resolve();
  a.respond('Added');
  await finished;
  assert.equal(a.get('clearBtn').disabled, false);
  assert.equal(a.get('historyList').children[0].children[0].disabled, false);
});

test('API errors and empty recognition preserve text and allow the next recording', async () => {
  for (const ok of [false, true]) {
    const a = app();
    a.edit('Keep me');
    await a.click('continueBtn');
    const { finished } = await a.stop();
    a.respond('   ', ok);
    await finished;
    assert.equal(a.get('transcript').value, 'Keep me');
    assert.equal(a.get('continueBtn').disabled, false);
    assert.equal(a.get('recordBtn').disabled, false);
    assert.equal(a.copied.length, 0);
    await a.click('continueBtn');
    assert.equal(a.recorders.length, 2);
  }
});

test('Clear during recording discards the segment without sending it for transcription', async () => {
  const a = app();
  a.edit('Archived');
  await a.click('continueBtn');
  a.click('clearBtn');
  await a.recorders[0].finishStop();
  assert.equal(a.requests, 0);
  assert.equal(a.get('transcript').value, '');
  assert.equal(a.history[0].text, 'Archived');
  assert.equal(a.get('continueBtn').classList.contains('hidden'), true);
  assert.equal(a.get('recordBtn').textContent, 'Start Recording');
});

test('Denied microphone leaves controls usable', async () => {
  const noMic = app({ micAllowed: false });
  noMic.edit('Keep');
  await noMic.click('continueBtn');
  assert.equal(noMic.get('recordBtn').disabled, false);
  assert.equal(noMic.get('continueBtn').disabled, false);
  assert.equal(noMic.recorders.length, 0);
});

test('Restored history can be continued and an existing newline is preserved', async () => {
  const a = app();
  a.edit('Restored text\n');
  a.click('clearBtn');
  a.get('historyList').children[0].children[0].handlers.click();
  assert.equal(a.get('continueBtn').classList.contains('hidden'), false);
  await a.click('continueBtn');
  const { finished } = await a.stop();
  a.respond('New paragraph');
  await finished;
  assert.equal(a.get('transcript').value, 'Restored text\nNew paragraph');
});

test('Transcription sends the WAV and selected language to the configured server without credentials', async () => {
  const a = app();
  a.get('languageSelect').value = 'en';
  await a.click('recordBtn');
  const { finished } = await a.stop();
  const request = a.sentRequests[0];
  assert.equal(request.url, 'https://yilins-mac-mini.tail73950a.ts.net/v1/audio/transcriptions');
  assert.equal(request.method, 'POST');
  assert.equal(request.headers, undefined);
  assert.equal(request.signal.aborted, false);
  assert.deepEqual([...request.body.keys()], ['file', 'response_format', 'language']);
  assert.equal(request.body.get('response_format'), 'json');
  assert.equal(request.body.get('language'), 'en');
  const file = request.body.get('file');
  assert.equal(file.name, 'audio.wav');
  assert.equal(file.type, 'audio/wav');
  assert.equal(await file.text(), 'audio');
  assert.equal(a.requestTimers.length, 1);
  assert.equal(a.get('transcribeProgress').classList.contains('hidden'), false);
  assert.ok(a.statuses.includes('Transcribing...'));
  a.respond('  Recognized speech.\n');
  await finished;
  assert.equal(a.get('transcript').value, 'Recognized speech.');
  assert.equal(a.copied.at(-1), 'Recognized speech.');
  assert.equal(a.requestTimers.length, 0);
  assert.equal(a.get('transcribeProgress').classList.contains('hidden'), true);
});

test('Auto language detection omits the language field', async () => {
  const a = app();
  a.get('languageSelect').value = 'auto';
  await a.click('recordBtn');
  const { finished } = await a.stop();
  assert.deepEqual([...a.sentRequests[0].body.keys()], ['file', 'response_format']);
  a.respond('Detected language');
  await finished;
});

test('Translate uses the same endpoint with the whisper.cpp translation option', async () => {
  const a = app();
  a.get('taskSelect').value = 'translate';
  await a.click('recordBtn');
  const { finished } = await a.stop();
  const request = a.sentRequests[0];
  assert.equal(request.url, 'https://yilins-mac-mini.tail73950a.ts.net/v1/audio/transcriptions');
  assert.equal(request.body.get('translate'), 'true');
  assert.equal(request.body.get('response_format'), 'json');
  assert.ok(a.statuses.includes('Translating...'));
  a.respond('Translated into English.');
  await finished;
  assert.equal(a.get('transcript').value, 'Translated into English.');
});

test('A network failure shows a retry message and preserves text and usable controls', async () => {
  const a = app();
  a.edit('Keep this text');
  await a.click('continueBtn');
  const { finished } = await a.stop();
  a.failRequest();
  await finished;
  assert.equal(a.get('transcript').value, 'Keep this text');
  assert.ok(a.statuses.some(message => message.includes('Transcription server unavailable. Please try again.')));
  assert.equal(a.get('recordBtn').disabled, false);
  assert.equal(a.get('continueBtn').disabled, false);
  assert.equal(a.get('transcribeProgress').classList.contains('hidden'), true);
  assert.equal(a.requestTimers.length, 0);
  assert.equal(a.copied.length, 0);
  await a.click('continueBtn');
  assert.equal(a.recorders.length, 2);
});

test('The 120-second timeout aborts the request, preserves text, and permits a retry', async () => {
  const a = app();
  a.edit('Keep this text');
  await a.click('continueBtn');
  const { finished } = await a.stop();
  assert.equal(a.sentRequests[0].signal.aborted, false);
  a.expireRequest();
  await finished;
  assert.equal(a.sentRequests[0].signal.aborted, true);
  assert.equal(a.get('transcript').value, 'Keep this text');
  assert.ok(a.statuses.some(message => message.includes('Transcription timed out after 120 seconds. Please try again.')));
  assert.equal(a.get('recordBtn').disabled, false);
  assert.equal(a.get('continueBtn').disabled, false);
  assert.equal(a.get('transcribeProgress').classList.contains('hidden'), true);
  assert.equal(a.requestTimers.length, 0);
  await a.click('continueBtn');
  const retry = await a.stop();
  assert.equal(a.sentRequests[1].signal.aborted, false);
  a.respond('Retry succeeded');
  await retry.finished;
  assert.equal(a.get('transcript').value, 'Keep this text\nRetry succeeded');
});

test('HTTP errors and invalid responses show a retry message and keep the previous transcript', async () => {
  const cases = [
    { payload: null, options: { status: 403, jsonError: true } },
    { payload: null, options: { status: 500, jsonError: true } },
    { payload: null, options: { jsonError: true } },
    { payload: null },
    { payload: {} },
    { payload: { text: 42 } },
  ];
  for (const { payload, options } of cases) {
    const a = app();
    a.edit('Previous transcript');
    await a.click('recordBtn');
    const { finished } = await a.stop();
    a.respondWith(payload, options);
    await finished;
    assert.equal(a.get('transcript').value, 'Previous transcript');
    assert.ok(a.statuses.some(message => message.includes('Transcription server unavailable. Please try again.')));
    assert.equal(a.get('recordBtn').disabled, false);
    assert.equal(a.requestTimers.length, 0);
    assert.equal(a.copied.length, 0);
  }
});
