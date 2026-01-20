import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = process.env.ENCRYPTION_KEY;

// Inline Supabase client to avoid bundling issues
const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) return null;
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

// Inline decrypt function to avoid bundling issues
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

const decrypt = (encryptedData: string): string => {
  if (!encryptionKey) throw new Error('ENCRYPTION_KEY not configured');
  const keyBuffer = Buffer.from(encryptionKey, 'base64');
  if (keyBuffer.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes');
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, keyBuffer, iv);
  decipher.setAuthTag(authTag);
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  return plaintext.toString('utf8');
};

// Inline Supabase functions
const verifyAccessToken = async (accessToken: string) => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return data.user;
};

const getUserCredentials = async (userId: string) => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client
    .from('user_credentials')
    .select('n8n_url, encrypted_api_key')
    .eq('user_id', userId)
    .single();
  if (error || !data) return null;
  return data;
};

interface N8nCredentials {
  url: string;
  apiKey: string;
}

interface CredentialsResult {
  credentials: N8nCredentials | null;
  debug: {
    hasAuthHeader: boolean;
    userVerified: boolean;
    hasStoredCredentials: boolean;
    hasEnvCredentials: boolean;
    error?: string;
  };
}

/**
 * Get n8n credentials from either:
 * 1. User's stored credentials (if authenticated with Supabase)
 * 2. Environment variables (fallback for single-user mode)
 */
async function getCredentials(req: VercelRequest): Promise<CredentialsResult> {
  const debug = {
    hasAuthHeader: false,
    userVerified: false,
    hasStoredCredentials: false,
    hasEnvCredentials: false,
  };

  // Check for Authorization header (multi-user mode)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    debug.hasAuthHeader = true;
    try {
      const accessToken = authHeader.substring(7);
      const user = await verifyAccessToken(accessToken);

      if (user) {
        debug.userVerified = true;
        const credentials = await getUserCredentials(user.id);
        if (credentials) {
          debug.hasStoredCredentials = true;
          const apiKey = decrypt(credentials.encrypted_api_key);
          return {
            credentials: { url: credentials.n8n_url, apiKey },
            debug,
          };
        }
      }
    } catch (err) {
      console.error('Failed to get user credentials:', err);
      return {
        credentials: null,
        debug: { ...debug, error: err instanceof Error ? err.message : 'Unknown error' },
      };
    }
  }

  // Fallback to environment variables (single-user mode)
  const n8nUrl = process.env.N8N_URL;
  const n8nApiKey = process.env.N8N_API_KEY;

  if (n8nUrl && n8nApiKey) {
    debug.hasEnvCredentials = true;
    return {
      credentials: { url: n8nUrl, apiKey: n8nApiKey },
      debug,
    };
  }

  return { credentials: null, debug };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  const { credentials, debug } = await getCredentials(req);

  if (!credentials) {
    return res.status(401).json({
      error: 'n8n credentials not configured',
      message: 'Please configure your n8n URL and API key in settings.',
      debug,
    });
  }

  // Extract the path from Vercel rewrite query parameter
  // Vercel rewrites /api/n8n/:path* to /api/n8n/proxy?path=:path*
  const pathParam = req.query.path;
  const pathSegments = Array.isArray(pathParam) ? pathParam : pathParam ? [pathParam] : [];
  const pathString = pathSegments.join('/');

  // Get any additional query params (excluding 'path' which is from rewrite)
  const url = new URL(req.url || '', `https://${req.headers.host}`);
  url.searchParams.delete('path');
  const queryString = url.searchParams.toString();

  // Build the target URL
  const targetUrl = `${credentials.url}/${pathString}${queryString ? `?${queryString}` : ''}`;

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

    // Add debug info for non-2xx responses
    if (!response.ok) {
      return res.status(response.status).json({
        ...data,
        _debug: {
          targetUrl,
          n8nStatus: response.status,
        },
      });
    }

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: 'Failed to proxy request to n8n',
      details: error instanceof Error ? error.message : 'Unknown error',
      _debug: { targetUrl },
    });
  }
}
