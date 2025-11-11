# Whisper Web - Speech to Text

A browser-based speech-to-text application powered by OpenAI's Whisper Large v3 model via the Groq API. Record audio directly in your browser and get fast, accurate transcriptions with support for multiple languages and code-switching.

## Features

- **Fast & Accurate** - Powered by Whisper Large v3 via Groq API (typically 3-8 seconds)
- **Multilingual Support** - Excellent support for multiple languages including code-switching (e.g., Chinese + English technical terms)
- **Audio Recording** - Record directly from your microphone
- **Hybrid API Mode** - Use your own API key or shared backend with rate limiting
- **Beautiful UI** - Modern, responsive design with Tailwind CSS
- **Copy to Clipboard** - Easily copy transcription results
- **Privacy Options** - Bring your own API key for unlimited access

## Quick Start

### Prerequisites

- Node.js 16+ and npm (for local development)
- Modern browser (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+)
- Groq API key (get free at https://console.groq.com) - optional if using shared backend

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

3. (Optional) Set up shared backend:
   - Copy `.env.example` to `.env`
   - Add your Groq API key: `GROQ_API_KEY=your_key_here`

4. Start the development server:
```bash
npm run dev
```

Or use the convenience scripts:
- **macOS/Linux**: `./start.sh`
- **Windows**: `start.bat`

The application will open automatically at `http://localhost:3000`

## Usage Guide

### 1. Configure API Settings

Click the **Settings** button to configure your API mode:

**Option 1: Use Your Own API Key (Recommended)**
- Get a free Groq API key at https://console.groq.com
- 20 requests per minute on free tier
- Enter your API key in Settings
- Your key is stored locally in your browser only

**Option 2: Use Shared Backend**
- Limited to 5 requests per hour per IP
- No API key required
- Requires server-side `GROQ_API_KEY` environment variable

### 2. Record Audio

1. Click **"Start Recording"** button
2. Allow microphone access when prompted
3. Speak into your microphone
4. Click **"Stop Recording"** when finished
5. Transcription will start automatically

### 3. View Results

- Results appear in the transcript box
- Click **"Copy Text"** to copy to clipboard
- Click **"Clear All"** to reset and start over

## Deployment to Vercel

### Method 1: Vercel CLI

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Deploy:
```bash
vercel
```

3. Add environment variable in Vercel dashboard:
   - Go to Settings → Environment Variables
   - Add `GROQ_API_KEY` with your Groq API key
   - Redeploy to apply changes

### Method 2: GitHub Integration

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add `GROQ_API_KEY` environment variable
4. Deploy

### Environment Variables

For the shared backend to work, set this environment variable in Vercel:

```
GROQ_API_KEY=your_groq_api_key_here
```

Get your free API key at: https://console.groq.com

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

## Browser Requirements

This application requires a modern browser with:
- MediaRecorder API (for audio recording)
- Fetch API (for API requests)
- LocalStorage (for settings persistence)

**Supported Browsers:**
- Chrome/Edge 90+
- Firefox 90+
- Safari 15+

**Note:** HTTPS is required for microphone access. Use `npm run dev` for local testing or deploy to a secure server like Vercel.

## API Details

### Groq API (Whisper Large v3)

- **Model**: whisper-large-v3
- **Speed**: Typically 3-8 seconds for transcription
- **Accuracy**: Best-in-class for multilingual transcription
- **Code-switching**: Excellent support for mixed language speech
- **Free Tier**: 20 requests per minute
- **Pricing**: Very affordable for paid tiers

### Rate Limiting (Shared Backend)

When using the shared backend mode:
- 5 requests per hour per IP address
- Rate limit headers included in response
- In-memory tracking with automatic cleanup

## Technical Architecture

- **Frontend**: Vanilla JavaScript (ES Modules)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (CDN)
- **Speech Recognition**: Groq API (Whisper Large v3)
- **Backend**: Vercel Serverless Functions
- **Storage**: LocalStorage (for user settings)
- **Audio Recording**: MediaRecorder API

## File Structure

```
whisper-web-app/
├── index.html          # Main HTML file with UI and inline JS
├── api/
│   └── transcribe.js   # Vercel serverless function for shared backend
├── package.json        # Dependencies and scripts
├── vite.config.js      # Vite configuration
├── .env.example        # Environment variable template
├── README.md           # Documentation (this file)
├── start.sh            # macOS/Linux start script
└── start.bat           # Windows start script
```

## Security & Privacy

### Using Your Own API Key
- API key stored in browser LocalStorage only
- Never transmitted to the application server
- Direct communication with Groq API from browser
- Complete privacy for your audio data

### Using Shared Backend
- Audio transmitted through your Vercel serverless function
- Rate limited to prevent abuse
- API key secured in server environment variables
- Audio not stored or logged

## Troubleshooting

### Microphone Access Denied

1. Grant microphone permissions in browser settings
2. Ensure you're on HTTPS or localhost
3. Check that no other application is using the microphone

### Transcription Not Working

1. Verify audio is playing in the preview player
2. Check API key is entered correctly (if using own key)
3. Check rate limit hasn't been exceeded (if using shared backend)
4. Check browser console for errors
5. Verify internet connection

### Rate Limit Exceeded

If using shared backend:
1. Wait for the rate limit window to reset (1 hour)
2. Consider using your own API key for unlimited access
3. Get free API key at https://console.groq.com

### API Errors

1. Verify API key is valid (test at console.groq.com)
2. Check Groq API status
3. Ensure environment variables are set correctly in Vercel
4. Check browser console for detailed error messages

## Performance

- **Transcription Speed**: 3-8 seconds for typical recordings
- **Model Quality**: Whisper Large v3 (most accurate)
- **Network Requirements**: Stable internet connection required
- **Audio Length**: No strict limit, but shorter audio processes faster

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Credits

- [OpenAI Whisper](https://github.com/openai/whisper) - Original Whisper model
- [Groq](https://groq.com/) - Fast inference API
- [Vercel](https://vercel.com/) - Hosting and serverless functions
- [Tailwind CSS](https://tailwindcss.com/) - UI styling

## Support

For issues and questions:
1. Check this README and troubleshooting section
2. Review browser console for error messages
3. Check Groq API status at https://status.groq.com
4. Open an issue on GitHub with details

---

Made with ❤️ using Whisper Large v3 and Groq API
