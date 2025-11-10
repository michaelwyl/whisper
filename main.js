import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js to use CDN for ONNX Runtime WASM files
env.allowLocalModels = false;
env.useBrowserCache = true;

// Set ONNX Runtime WASM paths to CDN
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.17.0/dist/';

// State
let transcriber = null;
let mediaRecorder = null;
let audioChunks = [];
let currentAudioBlob = null;
let isRecording = false;
let isModelLoading = false;

// DOM Elements
const modelSelect = document.getElementById('modelSelect');
const downloadProgress = document.getElementById('downloadProgress');
const downloadBar = document.getElementById('downloadBar');
const downloadPercent = document.getElementById('downloadPercent');
const downloadSize = document.getElementById('downloadSize');

const recordBtn = document.getElementById('recordBtn');
const stopBtn = document.getElementById('stopBtn');

const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');

const mediaPreview = document.getElementById('mediaPreview');
const audioPlayer = document.getElementById('audioPlayer');

const transcribeBtn = document.getElementById('transcribeBtn');
const transcribeProgress = document.getElementById('transcribeProgress');

const transcript = document.getElementById('transcript');
const copyBtn = document.getElementById('copyBtn');
const clearBtn = document.getElementById('clearBtn');

const statusArea = document.getElementById('statusArea');

// Model mapping
const MODEL_NAMES = {
  tiny: 'Xenova/whisper-tiny',
  base: 'Xenova/whisper-base',
  small: 'Xenova/whisper-small',
};

// Status message helper
function showStatus(message, type = 'info') {
  const statusDiv = document.createElement('div');
  const colors = {
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    success: 'bg-green-100 text-green-800 border-green-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };

  statusDiv.className = `px-4 py-3 rounded-lg border ${colors[type]} text-sm`;
  statusDiv.textContent = message;
  statusArea.prepend(statusDiv);

  // Auto-remove after 5 seconds
  setTimeout(() => {
    statusDiv.remove();
  }, 5000);
}

// Initialize transcriber with progress tracking
async function initTranscriber(modelName) {
  if (isModelLoading) {
    showStatus('模型正在加载中，请稍候 | Model is loading, please wait', 'warning');
    return;
  }

  try {
    isModelLoading = true;
    const modelId = MODEL_NAMES[modelName];

    showStatus(`正在加载${modelName}模型... | Loading ${modelName} model...`, 'info');
    downloadProgress.classList.remove('hidden');

    // Create pipeline with progress callback
    transcriber = await pipeline('automatic-speech-recognition', modelId, {
      progress_callback: (progress) => {
        if (progress.status === 'downloading') {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          const loadedMB = (progress.loaded / 1024 / 1024).toFixed(1);
          const totalMB = (progress.total / 1024 / 1024).toFixed(1);

          downloadBar.style.width = `${percent}%`;
          downloadPercent.textContent = `${percent}%`;
          downloadSize.textContent = `${loadedMB} MB / ${totalMB} MB`;
        } else if (progress.status === 'progress') {
          const percent = Math.round(progress.progress);
          downloadBar.style.width = `${percent}%`;
          downloadPercent.textContent = `${percent}%`;
        }
      },
    });

    downloadProgress.classList.add('hidden');
    isModelLoading = false;
    showStatus(`${modelName}模型已就绪 | ${modelName} model ready`, 'success');
  } catch (error) {
    downloadProgress.classList.add('hidden');
    isModelLoading = false;
    showStatus(`初始化失败: ${error.message} | Initialization failed: ${error.message}`, 'error');
    console.error('Model initialization error:', error);
  }
}

// Model selection change
modelSelect.addEventListener('change', async () => {
  const modelName = modelSelect.value;
  transcriber = null;
  await initTranscriber(modelName);
});

// Recording functionality
recordBtn.addEventListener('click', async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = () => {
      currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const audioUrl = URL.createObjectURL(currentAudioBlob);
      audioPlayer.src = audioUrl;
      mediaPreview.classList.remove('hidden');
      transcribeBtn.disabled = false;

      // Stop all tracks
      stream.getTracks().forEach(track => track.stop());
    };

    mediaRecorder.start();
    isRecording = true;

    recordBtn.disabled = true;
    recordBtn.classList.add('recording');
    stopBtn.disabled = false;

    showStatus('录音中... | Recording...', 'info');
  } catch (error) {
    showStatus(`录音失败: ${error.message} | Recording failed: ${error.message}`, 'error');
    console.error('Recording error:', error);
  }
});

stopBtn.addEventListener('click', () => {
  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;

    recordBtn.disabled = false;
    recordBtn.classList.remove('recording');
    stopBtn.disabled = true;

    showStatus('录音已停止 | Recording stopped', 'success');
  }
});

// File upload
fileInput.addEventListener('change', () => {
  uploadBtn.disabled = !fileInput.files.length;
});

uploadBtn.addEventListener('click', () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Validate file type
  if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
    showStatus('请选择音频或视频文件 | Please select an audio or video file', 'error');
    return;
  }

  currentAudioBlob = file;
  const audioUrl = URL.createObjectURL(file);
  audioPlayer.src = audioUrl;
  mediaPreview.classList.remove('hidden');
  transcribeBtn.disabled = false;

  showStatus(`已加载文件: ${file.name} | File loaded: ${file.name}`, 'success');
});

// Convert blob to readable format for Transformers.js
async function blobToBase64DataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Transcription
transcribeBtn.addEventListener('click', async () => {
  if (!currentAudioBlob) {
    showStatus('请先录音或上传文件 | Please record or upload a file first', 'error');
    return;
  }

  if (!transcriber) {
    await initTranscriber(modelSelect.value);
    if (!transcriber) {
      showStatus('模型未就绪，请重试 | Model not ready, please try again', 'error');
      return;
    }
  }

  try {
    transcribeBtn.disabled = true;
    transcribeProgress.classList.remove('hidden');
    transcript.value = '';

    showStatus('正在转写... | Transcribing...', 'info');

    // Convert blob to data URL for Transformers.js
    const audioData = await blobToBase64DataUrl(currentAudioBlob);

    // Transcribe with Transformers.js
    const result = await transcriber(audioData, {
      chunk_length_s: 30,
      stride_length_s: 5,
    });

    transcript.value = result.text;
    copyBtn.disabled = false;

    transcribeProgress.classList.add('hidden');
    transcribeBtn.disabled = false;

    showStatus('转写完成 | Transcription completed', 'success');
  } catch (error) {
    transcribeProgress.classList.add('hidden');
    transcribeBtn.disabled = false;
    showStatus(`转写失败: ${error.message} | Transcription failed: ${error.message}`, 'error');
    console.error('Transcription error:', error);
  }
});

// Copy to clipboard
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(transcript.value);
    showStatus('已复制到剪贴板 | Copied to clipboard', 'success');
  } catch (error) {
    showStatus('复制失败 | Copy failed', 'error');
  }
});

// Clear all
clearBtn.addEventListener('click', () => {
  currentAudioBlob = null;
  audioChunks = [];
  transcript.value = '';
  audioPlayer.src = '';
  mediaPreview.classList.add('hidden');
  fileInput.value = '';
  uploadBtn.disabled = true;
  transcribeBtn.disabled = true;
  copyBtn.disabled = true;

  if (mediaRecorder && isRecording) {
    mediaRecorder.stop();
    isRecording = false;
    recordBtn.disabled = false;
    recordBtn.classList.remove('recording');
    stopBtn.disabled = true;
  }

  showStatus('已清空 | Cleared', 'info');
});

// Initialize on load
window.addEventListener('load', async () => {
  showStatus('欢迎使用 Whisper Web！| Welcome to Whisper Web!', 'success');
  showStatus('首次使用会下载模型，请耐心等待 | First time will download model, please be patient', 'info');
  await initTranscriber('base');
});
