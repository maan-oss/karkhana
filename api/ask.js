// Karkhana shared advisor: relays one question to a free OpenRouter model and streams the answer back.
// Set OPENROUTER_API_KEY in the Vercel project (Settings → Environment Variables). Only free models are allowed,
// so the worst case for the key owner is a used-up daily free quota, never a bill.
export const config = { runtime: 'edge' };

const FREE = [
  'stealth/space-bunny-alpha',
  'google/gemma-4-31b-it:free',
  'qwen/qwen3.8-27b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'openrouter/free'
];
const okModel = (m) => typeof m === 'string' && m.length < 80 && (m.endsWith(':free') || m.startsWith('stealth/') || m === 'openrouter/free');
const RETRY = new Set([402, 404, 408, 409, 425, 429, 500, 502, 503, 504, 524]);

// Best-effort per-IP limiter (per edge isolate): 40 questions per hour.
const hits = new Map();
function limited(ip) {
  const now = Date.now(), win = 60 * 60 * 1000;
  const arr = (hits.get(ip) || []).filter((t) => now - t < win);
  arr.push(now); hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > 40;
}
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default async function handler(req) {
  // Accept the common spellings of the variable name. Only free models are ever requested (see okModel/FREE).
  const key = (process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API || process.env.OPENROUTER_KEY || '').trim();
  if (req.method === 'GET') return json({ configured: !!key, fallback: true, models: FREE });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anon';
  if (limited(ip)) return json({ error: 'rate_limited' }, 429);

  let body;
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-4) : null;
  if (!messages || !messages.length) return json({ error: 'no_messages' }, 400);
  const size = messages.reduce((n, m) => n + String(m && m.content || '').length, 0);
  if (size > 16000) return json({ error: 'too_long' }, 413);
  const clean = messages.map((m) => ({ role: m.role === 'system' ? 'system' : m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '').slice(0, 16000) }));

  // No OpenRouter key on the server: fall back to a keyless free model (weaker; the key is strongly recommended).
  if (!key) return keyless(clean);

  const chain = [okModel(body.model) ? body.model : null, ...FREE].filter((m, i, a) => m && a.indexOf(m) === i);
  let last = 0;
  for (const model of chain) {
    let r;
    try {
      r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'HTTP-Referer': 'https://karkhana.vercel.app', 'X-Title': 'Karkhana' },
        body: JSON.stringify({ model, messages: clean, stream: true, max_tokens: 700, temperature: 0.3 })
      });
    } catch { last = 502; continue; }
    if (r.ok && r.body) {
      return new Response(r.body, { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', 'X-Model': model } });
    }
    last = r.status;
    if (r.status === 401 || r.status === 403) return json({ error: 'not_configured' }, 503);
    if (!RETRY.has(r.status)) { const t = await r.text().catch(() => ''); return json({ error: 'upstream', status: r.status, detail: t.slice(0, 300) }, 502); }
  }
  // Every free OpenRouter model refused: try the keyless model before giving up.
  const fb = await keyless(clean, true);
  if (fb) return fb;
  return json({ error: last === 429 || last === 402 ? 'rate_limited' : 'upstream', status: last }, last === 429 || last === 402 ? 429 : 502);
}

async function keyless(messages, soft) {
  let r;
  try {
    r = await fetch('https://text.pollinations.ai/openai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Referer: 'https://karkhana.vercel.app' },
      body: JSON.stringify({ model: 'openai-fast', messages, stream: true, max_tokens: 700, temperature: 0.4 })
    });
  } catch { return soft ? null : json({ error: 'upstream', status: 502 }, 502); }
  if (r.ok && r.body) return new Response(r.body, { status: 200, headers: { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', 'X-Accel-Buffering': 'no', 'X-Model': 'keyless/openai-fast' } });
  if (soft) return null;
  return json({ error: r.status === 429 ? 'rate_limited' : 'upstream', status: r.status }, r.status === 429 ? 429 : 502);
}
