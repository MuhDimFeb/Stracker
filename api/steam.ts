// GET /api/steam?r=search|details&...steam params  ->  Steam store JSON.
// Browsers can't call Steam directly (CORS), so this runs on the server (Vercel function; in dev via the Vite plugin).
import type { IncomingMessage, ServerResponse } from 'node:http'

const ROUTES: Record<string, string> = { search: '/api/storesearch/', details: '/api/appdetails' }

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const send = (code: number, body: string, cache = 'no-store') => {
    res.statusCode = code
    res.setHeader('content-type', 'application/json')
    res.setHeader('cache-control', cache)
    res.end(body)
  }
  const q = new URL(req.url ?? '', 'http://x').searchParams
  const route = ROUTES[q.get('r') ?? '']
  if (!route) return send(400, JSON.stringify({ error: 'Unknown Steam route' }))
  q.delete('r')
  try {
    const r = await fetch(`https://store.steampowered.com${route}?${q}`, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; STRACKER/1.0)', accept: 'application/json', 'accept-language': 'en-US,en;q=0.9' },
    })
    if (!r.ok) return send(502, JSON.stringify({ error: `Steam responded with status ${r.status}` }))
    const text = await r.text()
    JSON.parse(text) // make sure Steam really returned JSON, not an HTML block page
    send(200, text, 'public, s-maxage=300')
  } catch {
    send(502, JSON.stringify({ error: 'Steam did not return valid data to the server' }))
  }
}
