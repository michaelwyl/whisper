# Whisper Web - Speech to Text

A browser-based speech-to-text application with **hybrid processing**: choose between fast API transcription (Whisper Large v3 via Groq) or private local WASM processing (Transformers.js). Features automatic fallback from API to WASM when rate limits are hit.

## Features

- **🔀 Hybrid Processing** - Choose your preferred mode:
  - **⚡ API Mode**: Fast & accurate (3-8 seconds) using Whisper Large v3
  - **🔒 WASM Mode**: 100% private local processing (15-30 seconds)
- **🛡️ Automatic Fallback** - Seamlessly switch to WASM if API rate limit is exceeded
- **🎤 Audio Recording** - Record directly from your microphone
- **🌍 Multilingual Support** - Excellent for code-switching (e.g., Chinese + English)
- **💾 Smart Caching** - WASM models cached in browser after first download
- **🎨 Beautiful UI** - Modern, responsive design with Tailwind CSS
- **📋 Copy to Clipboard** - Easy result sharing

## Quick Start

### Prerequisites

- Modern browser (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- (Optional) Groq API key for API mode - get free at https://console.groq.com

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

### 1. Choose Your Processing Mode

Click **⚙️ Settings** to select your preferred mode:

#### 🔒 Local WASM Processing (Default)
- **100% Private** - All processing in your browser
- **No API Key Required** - Completely free
- **Offline Capable** - Works without internet (after model download)
- **Model Options**: Tiny (39MB), Base (74MB), Small (244MB)
- **Speed**: 15-30 seconds per transcription
- **Best for**: Privacy-conscious users, offline use

#### ⚡ API Mode (Recommended for Speed)
- **5-10x Faster** - Typical transcription in 3-8 seconds
- **Most Accurate** - Uses Whisper Large v3 model
- **Multilingual Excellence** - Best for code-switching
- **Requires API Key** - Free tier: 20 requests/minute
- **Best for**: Fast results, multilingual audio

### 2. Enable Auto-Fallback (Recommended)

Check the "Automatically fall back to WASM if API rate limit is exceeded" option in Settings. This ensures uninterrupted service:
- Start with fast API processing
- Automatically switch to WASM if rate limit hit
- No manual intervention needed

### 3. Record and Transcribe

1. Click **"Start Recording"** button
2. Allow microphone access when prompted
3. Speak into your microphone
4. Click **"Stop Recording"** when finished
5. Transcription starts automatically
6. Results appear in the transcript box

### 4. Copy and Use

- Click **"Copy Text"** to copy transcription to clipboard
- Click **"Clear All"** to reset and start over

## Processing Modes Comparison

| Feature | API Mode | WASM Mode |
|---------|----------|-----------|
| Speed | ⚡ 3-8 seconds | 🐢 15-30 seconds |
| Accuracy | ⭐⭐⭐⭐⭐ Large v3 | ⭐⭐⭐⭐ Base/Small |
| Privacy | Audio sent to Groq | 100% local |
| Cost | Free (20 RPM) | Free |
| Setup | API key required | None |
| Internet | Required | After model download |
| Multilingual | Excellent | Good |

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

3. That's it! No environment variables needed.

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

### Important: No Server Configuration Needed!

This app works perfectly on any static hosting platform:
- ✅ Vercel
- ✅ Netlify
- ✅ Cloudflare Pages
- ✅ GitHub Pages
- ✅ Any static file server

**No backend required** - users bring their own API keys or use WASM mode!

## Building for Production

Build the application:

```bash
npm run build
```

This creates an optimized production build in the `dist` folder.

Preview the production build:

```bash
npm run preview
```

## Browser Requirements

This application requires a modern browser with:
- **MediaRecorder API** (for audio recording)
- **Web Audio API** (for audio processing)
- **IndexedDB** (for WASM model caching)
- **ES Modules** (for Transformers.js)

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

**Note:** HTTPS is required for microphone access. Use `npm run dev` for local testing or deploy to a secure server.

## API Details

### Groq API (API Mode)

- **Model**: whisper-large-v3
- **Speed**: Typically 3-8 seconds
- **Accuracy**: Best-in-class multilingual
- **Free Tier**: 20 requests per minute
- **Get Key**: https://console.groq.com
- **Cost**: Very affordable paid tiers available

### Transformers.js (WASM Mode)

- **Models**: Xenova/whisper-tiny, base, small
- **Speed**: 15-30 seconds (depends on model & device)
- **Processing**: 100% local in browser
- **Caching**: Models cached in IndexedDB
- **Privacy**: Audio never leaves your device

## Technical Architecture

- **Frontend**: Vanilla JavaScript (ES Modules)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN)
- **API Processing**: Groq API (Whisper Large v3)
- **WASM Processing**: Transformers.js via CDN
- **Storage**: LocalStorage (settings), IndexedDB (models)
- **Audio**: MediaRecorder API

## File Structure

```
whisper-web-app/
├── index.html          # Single-page app with inline JS
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── README.md           # Documentation (this file)
├── start.sh            # macOS/Linux start script
└── start.bat           # Windows start script
```

## Security & Privacy

### API Mode
- API key stored in browser LocalStorage only
- Never sent to any server except Groq
- Direct browser-to-Groq communication
- Audio transmitted to Groq for processing

### WASM Mode
- **100% Private** - All processing in browser
- Audio never leaves your device
- Models cached locally
- No external API calls after model download

### Best Practices
- Use API mode for speed with your own key
- Use WASM mode for maximum privacy
- Enable auto-fallback for best of both worlds

## Troubleshooting

### Microphone Access Denied

1. Grant microphone permissions in browser settings
2. Ensure you're on HTTPS or localhost
3. Check no other app is using the microphone

### API Mode Issues

**"API rate limit exceeded"**
- Wait for rate limit to reset (1 minute)
- Enable auto-fallback to use WASM automatically
- Or get a paid Groq plan for higher limits

**"Invalid API key"**
- Verify key at console.groq.com
- Check for extra spaces when pasting
- Regenerate key if needed

### WASM Mode Issues

**Model download fails**
- Check internet connection
- Try a smaller model (tiny instead of small)
- Clear browser cache and retry

**Slow transcription**
- Use tiny model for faster results
- Close other browser tabs
- Try API mode instead

**Out of memory**
- Close other browser tabs
- Use smaller model (tiny or base)
- Restart browser

### General Issues

**No transcription results**
- Check audio is playing in preview
- Try recording again
- Check browser console for errors
- Try switching processing modes

## Performance Tips

1. **For Speed**: Use API mode with your own key (20 RPM free)
2. **For Privacy**: Use WASM mode with tiny or base model
3. **For Balance**: Enable auto-fallback (API → WASM)
4. **Model Selection** (WASM):
   - Tiny: Fastest, good for clear speech
   - Base: Best balance
   - Small: Most accurate, slower
5. **Audio Length**: Shorter recordings process faster in both modes

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

- [OpenAI Whisper](https://github.com/openai/whisper) - Original Whisper model
- [Groq](https://groq.com/) - Fast inference API
- [Transformers.js](https://huggingface.co/docs/transformers.js) - Browser ML runtime
- [Hugging Face](https://huggingface.co/) - Model hosting
- [Tailwind CSS](https://tailwindcss.com/) - UI styling

## Support

For issues and questions:
1. Check this README and troubleshooting section
2. Review browser console for error messages
3. Try switching between API and WASM modes
4. Open an issue on GitHub with details

---

Made with ❤️ - Choose your own path: Speed (API) or Privacy (WASM)
