import type { Game } from '../data'

// Requests go through our own /api/steam function because store.steampowered.com does not
// allow browser CORS. cc=id returns prices in IDR.
interface Item { id: number; name: string; price?: { initial?: number; final?: number } }

export const cover = (id: string) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`

// Steam reports prices in hundredths of the currency unit.
const toGame = (i: Item): Game => {
  const price = (i.price?.final ?? 0) / 100
  const regular = Math.max((i.price?.initial ?? i.price?.final ?? 0) / 100, price)
  return { id: String(i.id), name: i.name, price, regular, low: price }
}

export async function searchGames(term: string, signal?: AbortSignal): Promise<Game[]> {
  const r = await fetch(`/api/steam?r=search&term=${encodeURIComponent(term)}&l=english&cc=id`, { signal })
  if (!r.ok) throw new Error(((await r.json().catch(() => null)) as { error?: string } | null)?.error ?? `Request failed (${r.status})`)
  const d = await r.json()
  return ((d.items ?? []) as Item[]).map(toGame)
}

export async function refreshPrices(ids: string[]) {
  const out: Record<string, { price: number; regular: number }> = {}
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50)
    const r = await fetch(`/api/steam?r=details&appids=${chunk.join(',')}&filters=price_overview&cc=id`)
    if (!r.ok) continue
    const d = await r.json()
    for (const id of chunk) {
      const p = d?.[id]?.data?.price_overview
      if (p) out[id] = { price: p.final / 100, regular: p.initial / 100 }
    }
  }
  return out
}

// All-time lows (IDR) from IsThereAnyDeal via our /api/lows function. Returns {} when unavailable.
export async function fetchLows(ids: string[]): Promise<Record<string, number>> {
  if (!ids.length) return {}
  try {
    const r = await fetch(`/api/lows?appids=${ids.slice(0, 50).join(',')}`)
    return r.ok ? await r.json() : {}
  } catch {
    return {}
  }
}