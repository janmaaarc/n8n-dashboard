import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createDecipheriv } from 'crypto';

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = process.env.ENCRYPTION_KEY;

// Allowed origins for CORS
const getAllowedOrigins = (): string[] => {
  const origins: string[] = [];
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    origins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
  }
  if (process.env.ALLOWED_ORIGINS) {
    origins.push(...process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()));
  }
  // Allow localhost in development
  if (process.env.NODE_ENV !== 'production') {
    origins.push('http://localhost:5173', 'http://localhost:3000');
  }
  return origins;
};

// Set security headers
const setSecurityHeaders = (res: VercelResponse, origin?: string): void => {
  const allowedOrigins = getAllowedOrigins();
  const requestOrigin = origin || '';

  if (allowedOrigins.length === 0 || allowedOrigins.includes(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
};

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
  if (!encryptionKey) throw new Error('Encryption not configured');
  const keyBuffer = Buffer.from(encryptionKey, 'base64');
  if (keyBuffer.length !== 32) throw new Error('Invalid encryption configuration');
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
      const accessToken = authHeader.substring(7);
      const user = await verifyAccessToken(accessToken);
      if (user) {
        const credentials = await getUserCredentials(user.id);
        if (credentials) {
          const apiKey = decrypt(credentials.encrypted_api_key);
          return { url: credentials.n8n_url, apiKey };
        }
      }
    } catch {
      // Log error internally, don't expose details
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
  const origin = req.headers.origin as string | undefined;

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    setSecurityHeaders(res, origin);
    return res.status(200).end();
  }

  setSecurityHeaders(res, origin);

  const credentials = await getCredentials(req);

  if (!credentials) {
    return res.status(401).json({
      error: 'Configuration required',
      message: 'Please configure your n8n connection in settings.',
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
    return res.status(response.status).json(data);
  } catch {
    return res.status(502).json({
      error: 'Connection failed',
      message: 'Unable to connect to n8n. Please check your configuration.',
    });
  }
}
