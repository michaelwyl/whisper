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

function app({ apiKey = 'test-key', micAllowed = true } = {}) {
  const elements = new Map();
  const storage = new Map([['groqApiKey', apiKey]]);
  const recorders = [];
  const copied = [];
  let pendingResponse;
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
    MediaRecorder: Recorder, Blob, FormData,
    URL: { createObjectURL: () => 'blob:test', revokeObjectURL() {} },
    setTimeout() { return 1; }, clearTimeout() {},
    console: { error() {} },
    fetch() {
      requests++;
      return new Promise(resolve => { pendingResponse = resolve; });
    },
  });
  vm.runInContext(script, context);
  // These tests exercise recording/transcription transitions, not audio decoding.
  vm.runInContext(`
    startLevelMeter = () => {};
    stopLevelMeter = () => {};
    convertToWav = async blob => blob;
  `, context);
  const get = id => elements.get(id);
  const click = id => get(id).handlers.click();
  return {
    get, click, copied, recorders,
    get requests() { return requests; },
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
      assert.ok(pendingResponse, 'A transcription request must be pending');
      pendingResponse({ ok, json: async () => ok ? { text } : { error: { message: 'API unavailable' } } });
      pendingResponse = null;
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

test('Missing API key and denied microphone leave controls usable', async () => {
  const noKey = app({ apiKey: '' });
  noKey.edit('Keep');
  await noKey.click('continueBtn');
  const { finished } = await noKey.stop();
  await finished;
  assert.equal(noKey.requests, 0);
  assert.equal(noKey.get('continueBtn').disabled, false);
  assert.equal(noKey.get('transcript').value, 'Keep');
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
