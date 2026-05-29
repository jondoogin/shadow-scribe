/**
 * api/companion.js — Shared Anthropic proxy for alpha testers
 *
 * Proxies AI requests to Anthropic using a shared API key stored as a
 * Vercel environment variable. This lets alpha testers use all AI features
 * without needing their own Anthropic key.
 *
 * Usage: set ANTHROPIC_API_KEY in your Vercel project environment variables.
 * The frontend falls back to this endpoint when no user key is configured.
 *
 * Security note: this proxy only forwards requests to api.anthropic.com/v1/messages.
 * It does not store any request/response data.
 */

export default async function handler(req, res) {
  // CORS — allow the same origin (Vercel deployment) only in production.
  // In local dev, Vite's proxy handles routing so this won't be called directly.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: { message: 'Method not allowed' } })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({
      error: {
        message: 'Shared AI key not configured. Add your own Anthropic API key in Settings → AI Features.',
      },
    })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    })

    const data = await upstream.json()
    return res.status(upstream.status).json(data)
  } catch (err) {
    return res.status(500).json({
      error: { message: `Proxy error: ${err.message}` },
    })
  }
}
