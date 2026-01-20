import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const encryptionKey = process.env.ENCRYPTION_KEY;

const getSupabaseClient = () => {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};

const checkConfig = (): { configured: boolean; missing: string[] } => {
  const missing: string[] = [];
  if (!supabaseUrl) missing.push('SUPABASE_URL');
  if (!supabaseServiceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!encryptionKey) missing.push('ENCRYPTION_KEY');
  return { configured: missing.length === 0, missing };
};

const verifyToken = async (token: string) => {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Check configuration first
  const config = checkConfig();
  if (!config.configured) {
    return res.status(500).json({
      error: 'Server configuration incomplete',
      missing: config.missing,
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
    return res.status(401).json({ error: 'Invalid token' });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  // GET: Fetch user's credentials (without the decrypted API key)
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('user_credentials')
      .select('id, n8n_url, created_at, updated_at')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      return res.status(500).json({ error: error.message });
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
  }

  // POST/PUT: Save or update credentials
  if (req.method === 'POST' || req.method === 'PUT') {
    const { n8nUrl, apiKey } = req.body;

    if (!n8nUrl || !apiKey) {
      return res.status(400).json({ error: 'n8nUrl and apiKey are required' });
    }

    try {
      // Import encrypt dynamically to avoid module-level errors
      const { encrypt } = await import('../lib/encryption');
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
          return res.status(500).json({ error: error.message });
        }
      } else {
        // Insert new
        const { error } = await supabase.from('user_credentials').insert({
          user_id: user.id,
          n8n_url: n8nUrl,
          encrypted_api_key: encryptedApiKey,
        });

        if (error) {
          return res.status(500).json({ error: error.message });
        }
      }

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({
        error: 'Failed to encrypt credentials',
        details: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  // DELETE: Remove credentials
  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('user_credentials')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
