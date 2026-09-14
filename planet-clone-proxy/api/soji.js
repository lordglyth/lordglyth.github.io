const ALLOWED_ORIGINS = new Set([
  'https://lordglyth.github.io',
  'http://127.0.0.1:8765',
  'http://localhost:8765'
]);

const SOJI_URL = 'https://mars.chub.ai/soji/v1/chat/completions';
const SOJI_USER_AGENT = 'starlablood/1.0';

function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
}

export default async function handler(req, res) {
  setCors(req, res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const origin = req.headers.origin || '';
  if (!ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  const authorization = String(req.headers.authorization || '').trim();
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ error: 'Visitor Soji API key required' });
  }

  try {
    const body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
    const upstream = await fetch(SOJI_URL, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'User-Agent': SOJI_USER_AGENT
      },
      body
    });

    const data = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.send(data);
  } catch (error) {
    return res.status(502).json({ error: `Soji upstream failed: ${error?.message || error}` });
  }
}
