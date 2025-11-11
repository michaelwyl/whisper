// Serverless function for Vercel
// Handles transcription requests with rate limiting

// Simple in-memory rate limiter
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_HOUR = 5; // Limit per IP per hour

function checkRateLimit(ip) {
  const now = Date.now();
  const userRequests = rateLimitMap.get(ip) || [];

  // Remove old requests outside the time window
  const recentRequests = userRequests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);

  if (recentRequests.length >= MAX_REQUESTS_PER_HOUR) {
    return false; // Rate limit exceeded
  }

  // Add current request
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);

  // Clean up old entries periodically
  if (rateLimitMap.size > 1000) {
    const cutoff = now - RATE_LIMIT_WINDOW;
    for (const [key, timestamps] of rateLimitMap.entries()) {
      const recent = timestamps.filter(t => t > cutoff);
      if (recent.length === 0) {
        rateLimitMap.delete(key);
      } else {
        rateLimitMap.set(key, recent);
      }
    }
  }

  return true;
}

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle multipart form data
  },
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client IP for rate limiting
    const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
               req.headers['x-real-ip'] ||
               'unknown';

    // Check rate limit
    if (!checkRateLimit(ip)) {
      return res.status(429).json({
        error: 'Rate limit exceeded. Maximum 5 requests per hour. Please use your own API key for unlimited access.'
      });
    }

    // Get API key from environment variable
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      console.error('GROQ_API_KEY not configured');
      return res.status(500).json({
        error: 'Server configuration error. Please use your own API key.'
      });
    }

    // Get the raw body as buffer
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Forward the request to Groq API with the same content type
    const groqResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': req.headers['content-type'],
      },
      body: buffer,
    });

    if (!groqResponse.ok) {
      const errorData = await groqResponse.json();
      console.error('Groq API error:', errorData);
      return res.status(groqResponse.status).json({
        error: errorData.error?.message || 'Transcription failed'
      });
    }

    const result = await groqResponse.json();

    // Add remaining requests info
    const userRequests = rateLimitMap.get(ip) || [];
    const remaining = MAX_REQUESTS_PER_HOUR - userRequests.length;

    res.setHeader('X-RateLimit-Limit', MAX_REQUESTS_PER_HOUR.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());

    return res.status(200).json(result);

  } catch (error) {
    console.error('Transcription error:', error);
    return res.status(500).json({
      error: error.message || 'Internal server error'
    });
  }
}
