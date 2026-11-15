// GET /api/lows?appids=1,2  ->  { "1": 437000, ... }  all-time lows in IDR from IsThereAnyDeal.
// Needs ITAD_API_KEY (server-side only). Runs as a Vercel function and, in dev, via the Vite plugin.
import type { IncomingMessage, ServerResponse } from 'node:http'

const BASE = 'https://api.isthereanydeal.com'

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const send = (code: number, body: unknown) => {
    res.statusCode = code
    res.setHeader('content-type', 'application/json')
    res.setHeader('cache-control', 'public, s-maxage=3600')
    res.end(JSON.stringify(body))
  }
  const key = process.env.ITAD_API_KEY
  if (!key) return send(501, { error: 'ITAD_API_KEY not set' })
  try {
    const appids = (new URL(req.url ?? '', 'http://x').searchParams.get('appids') ?? '').split(',').filter((x) => /^\d+$/.test(x)).slice(0, 50)
    // 1) Steam appid -> ITAD game id
    const ids: Record<string, string> = {}
    await Promise.all(appids.map(async (a) => {
      const r = await fetch(`${BASE}/games/lookup/v1?key=${key}&appid=${a}`)
      const d = await r.json()
      if (d?.found && d.game?.id) ids[d.game.id] = a
    }))
    if (!Object.keys(ids).length) return send(200, {})
    // 2) ITAD game ids -> prices (includes historyLow.all) for Indonesia
    const r = await fetch(`${BASE}/games/prices/v3?key=${key}&country=ID`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.keys(ids)),
    })
    const list = (await r.json()) as { id: string; historyLow?: { all?: { amount: number; currency: string } } }[]
    const out: Record<string, number> = {}
    for (const g of list) {
      const low = g.historyLow?.all
      if (low && low.currency === 'IDR') out[ids[g.id]] = low.amount
    }
    send(200, out)
  } catch {
    send(502, { error: 'upstream failed' })
  }
}
