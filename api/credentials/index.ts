import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { createCipheriv, randomBytes } from 'crypto';

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

// Input validation
const isValidUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const isValidApiKey = (apiKey: string): boolean => {
  return typeof apiKey === 'string' && apiKey.length >= 1 && apiKey.length <= 500;
};

// Inline encryption to avoid Vercel bundling issues
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const encrypt = (plaintext: string): string => {
  if (!encryptionKey) {
    throw new Error('Encryption not configured');
  }
  const keyBuffer = Buffer.from(encryptionKey, 'base64');
  if (keyBuffer.length !== 32) {
    throw new Error('Invalid encryption configuration');
  }
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, keyBuffer, iv);
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();
  const combined = Buffer.concat([iv, authTag, ciphertext]);
  return combined.toString('base64');
};

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const isConfigured = (): boolean => {
  return Boolean(supabaseUrl && supabaseServiceKey && encryptionKey);
};

const verifyToken = async (token: string) => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin as string | undefined;

  // Set security headers
  setSecurityHeaders(res, origin);

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check configuration first
  if (!isConfigured()) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Multi-user mode is not configured.',
    });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  const user = await verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(503).json({
      error: 'Service unavailable',
      message: 'Database connection not available.',
    });
  }

  // GET: Fetch user's credentials (without the decrypted API key)
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('user_credentials')
        .select('id, n8n_url, created_at, updated_at')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        return res.status(500).json({
          error: 'Failed to fetch credentials',
          message: 'Unable to retrieve your credentials. Please try again.',
        });
      }

      return res.status(200).json({
        credentials: data
          ? {
              id: data.id,
              n8nUrl: data.n8n_url,
              hasApiKey: true,
              createdAt: data.created_at,
              updatedAt: data.updated_at,
            }
          : null,
      });
    } catch {
      return res.status(500).json({
        error: 'Internal error',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  }

  // POST/PUT: Save or update credentials
  if (req.method === 'POST' || req.method === 'PUT') {
    const { n8nUrl, apiKey } = req.body || {};

    // Validate input
    if (!n8nUrl || !apiKey) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'Both n8n URL and API key are required.',
      });
    }

    if (!isValidUrl(n8nUrl)) {
      return res.status(400).json({
        error: 'Invalid URL',
        message: 'Please provide a valid n8n URL (http:// or https://).',
      });
    }

    if (!isValidApiKey(apiKey)) {
      return res.status(400).json({
        error: 'Invalid API key',
        message: 'Please provide a valid API key.',
      });
    }

    try {
      const encryptedApiKey = encrypt(apiKey);

      // Check if credentials exist
      const { data: existing } = await supabase
        .from('user_credentials')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (existing) {
        // Update existing
        const { error } = await supabase
          .from('user_credentials')
          .update({
            n8n_url: n8nUrl,
            encrypted_api_key: encryptedApiKey,
          })
          .eq('user_id', user.id);

        if (error) {
          return res.status(500).json({
            error: 'Update failed',
            message: 'Unable to update credentials. Please try again.',
          });
        }
      } else {
        // Insert new
        const { error } = await supabase.from('user_credentials').insert({
          user_id: user.id,
          n8n_url: n8nUrl,
          encrypted_api_key: encryptedApiKey,
        });

        if (error) {
          return res.status(500).json({
            error: 'Save failed',
            message: 'Unable to save credentials. Please try again.',
          });
        }
      }

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({
        error: 'Internal error',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  }

  // DELETE: Remove credentials
  if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('user_credentials')
        .delete()
        .eq('user_id', user.id);

      if (error) {
        return res.status(500).json({
          error: 'Delete failed',
          message: 'Unable to delete credentials. Please try again.',
        });
      }

      return res.status(200).json({ success: true });
    } catch {
      return res.status(500).json({
        error: 'Internal error',
        message: 'An unexpected error occurred. Please try again.',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
