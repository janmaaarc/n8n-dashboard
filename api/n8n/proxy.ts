import type { VercelRequest, VercelResponse } from '@vercel/node';

interface N8nCredentials {
  url: string;
  apiKey: string;
}

/**
 * Get n8n credentials from either:
 * 1. User's stored credentials (if authenticated with Supabase)
 * 2. Environment variables (fallback for single-user mode)
 */
async function getCredentials(req: VercelRequest): Promise<N8nCredentials | null> {
  // Check for Authorization header (multi-user mode)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    try {
      // Dynamic imports to avoid module-level errors
      const { verifyAccessToken, getUserCredentials } = await import('../lib/supabase-server');
      const { decrypt } = await import('../lib/encryption');

      const accessToken = authHeader.substring(7);
      const user = await verifyAccessToken(accessToken);

      if (user) {
        const credentials = await getUserCredentials(user.id);
        if (credentials) {
          const apiKey = decrypt(credentials.encrypted_api_key);
          return {
            url: credentials.n8n_url,
            apiKey,
          };
        }
      }
    } catch (err) {
      console.error('Failed to get user credentials:', err);
    }
  }

  // Fallback to environment variables (single-user mode)
  const n8nUrl = process.env.N8N_URL;
  const n8nApiKey = process.env.N8N_API_KEY;

  if (n8nUrl && n8nApiKey) {
    return { url: n8nUrl, apiKey: n8nApiKey };
  }

  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const credentials = await getCredentials(req);

  if (!credentials) {
    return res.status(401).json({
      error: 'n8n credentials not configured',
      message: 'Please configure your n8n URL and API key in settings.',
    });
  }

  // Extract the path from the URL (after /api/n8n/)
  const url = req.url || '';
  const pathMatch = url.match(/^\/api\/n8n\/(.*)$/);
  const pathWithQuery = pathMatch ? pathMatch[1] : '';

  // Build the target URL
  const targetUrl = `${credentials.url}/${pathWithQuery}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': credentials.apiKey,
      },
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to proxy request to n8n',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
