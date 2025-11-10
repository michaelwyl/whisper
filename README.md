# Whisper Web - Browser-based Speech to Text

A production-ready, browser-based speech-to-text application powered by [Transformers.js](https://huggingface.co/docs/transformers.js) and OpenAI's Whisper model. Process audio and video files entirely in your browser with 100% privacy - no server required!

[中文文档](./使用指南.md)

## Features

- **100% Local Processing** - All transcription happens in your browser, ensuring complete privacy
- **Multiple Model Sizes** - Choose between tiny, base, and small Whisper models
- **Audio Recording** - Record directly from your microphone
- **File Upload** - Support for audio and video files
- **Smart Caching** - Models are cached in your browser for faster loading
- **Beautiful UI** - Modern, responsive design with Tailwind CSS
- **Progress Tracking** - Real-time progress bars for downloads and transcription
- **Copy to Clipboard** - Easily copy transcription results
- **Bilingual Interface** - Full support for English and Chinese

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Modern browser (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)

### Installation

1. Clone or download this repository:
```bash
git clone <your-repo-url>
cd whisper-web-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

Or use the convenience scripts:
- **macOS/Linux**: `./start.sh`
- **Windows**: `start.bat`

The application will open automatically at `http://localhost:3000`

## Usage Guide

### 1. Select a Model

Choose from three available models:
- **Tiny** - Smallest and fastest, good for quick transcriptions
- **Base** - Recommended for most use cases, good balance of speed and accuracy
- **Small** - Most accurate, better for complex audio or multiple speakers

The model will download automatically when first selected. Subsequent uses will load from cache.

### 2. Record Audio

1. Click **"Start Recording"** button
2. Allow microphone access when prompted
3. Speak into your microphone
4. Click **"Stop Recording"** when finished
5. Preview your recording in the audio player

### 3. Upload Files

1. Click **"Choose File"** and select an audio or video file
2. Supported formats: MP3, WAV, M4A, OGG, WebM, MP4, etc.
3. Click **"Load File"** to load the file
4. Preview will appear in the audio player

### 4. Transcribe

1. Ensure you have either recorded or uploaded audio
2. Click **"Start Transcription"** button
3. Wait for processing (time depends on audio length and model size)
4. Results will appear in the transcript box

### 5. Copy and Export

- Click **"Copy Text"** to copy the transcript to clipboard
- Edit the transcript directly in the text box if needed
- Click **"Clear All"** to reset and start over

## Building for Production

Build the application for deployment:

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

Preview the production build:

```bash
npm run preview
```

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

### Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Drag the `dist` folder to [Netlify Drop](https://app.netlify.com/drop)

Or use Netlify CLI:
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Deploy to GitHub Pages

1. Update `vite.config.js` to set the base path:
```javascript
export default defineConfig({
  base: '/your-repo-name/',
  // ... rest of config
});
```

2. Build and deploy:
```bash
npm run build
# Then push the dist folder to gh-pages branch
```

### Important Deployment Notes

The application works on all modern static hosting platforms:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages
- Any static file server

No special server configuration required!

## Browser Requirements

This application requires a modern browser with:
- Web Audio API
- MediaRecorder API
- IndexedDB (for model caching)

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

**Note:** HTTPS is required for microphone access. Use `npm run dev` for local testing or deploy to a secure server.

## Performance Tips

1. **Model Selection**
   - Start with the base model for testing
   - Use tiny for real-time or quick transcriptions
   - Use small only when accuracy is critical

2. **Audio Length**
   - Shorter audio files process faster
   - Consider splitting long recordings

3. **Browser Cache**
   - Models are cached after first download
   - Clear cache to download fresh models

4. **Memory Usage**
   - Close other tabs for better performance
   - The small model requires more memory

## Troubleshooting

### Model Download Fails

1. Check your internet connection
2. Try a different model size
3. Clear browser cache and retry
4. Check browser console for specific error messages

### Microphone Access Denied

1. Grant microphone permissions in browser settings
2. Ensure you're on HTTPS or localhost
3. Check that no other application is using the microphone

### Transcription Not Working

1. Verify audio is playing in the preview player
2. Try a different audio file format
3. Check browser console for errors
4. Try reloading the page and reinitializing

### Poor Transcription Quality

1. Try a larger model (base or small)
2. Ensure audio quality is good (clear speech, minimal background noise)
3. Check that audio is in a supported language
4. Try rerecording with better microphone positioning

## Technical Architecture

- **Frontend Framework**: Vanilla JavaScript (ES Modules)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN)
- **Speech Recognition**: Transformers.js (@xenova/transformers)
- **ML Backend**: ONNX Runtime Web
- **Model Storage**: IndexedDB (automatic caching)
- **Audio Processing**: Web Audio API

## Privacy & Security

- **100% Local Processing**: All audio processing happens in your browser
- **No Data Transmission**: Audio files never leave your device
- **No Server Required**: Static hosting is sufficient
- **Model Caching**: Models stored locally in browser cache
- **No Analytics**: No tracking or analytics included

## File Structure

```
whisper-web-app/
├── index.html          # Main HTML file with UI
├── main.js             # Application logic
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration with CORS headers
├── README.md           # English documentation (this file)
├── 使用指南.md         # Chinese documentation
├── start.sh            # macOS/Linux start script
└── start.bat           # Windows start script
```

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

- [Transformers.js](https://huggingface.co/docs/transformers.js) - Run ML models in the browser
- [Hugging Face](https://huggingface.co/) - Model hosting and distribution
- [OpenAI Whisper](https://github.com/openai/whisper) - Original Whisper model
- [ONNX Runtime](https://onnxruntime.ai/) - Cross-platform ML inference

## Support

For issues and questions:
1. Check this README and troubleshooting section
2. Review browser console for error messages
3. Open an issue on GitHub with details

---

Made with ❤️ using Transformers.js and OpenAI Whisper
