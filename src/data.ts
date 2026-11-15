export interface Game { id: string; name: string; price: number; regular: number; low: number; lowAll?: boolean }
export interface Purchase { gameId: string; name: string; paid: number; regular: number; at: string }
// tracked = games whose bell is on (they show on the homepage). Prices in IDR; low = lowest price seen so far.
export interface State { fund: number; tracked: Game[]; selected: string[]; purchases: Purchase[] }
export interface Quest { id: string; title: string; progress: number; goal: number; reward: number; done: boolean; unit: 'idr' | 'count' }

export const EMPTY: State = { fund: 0, tracked: [], selected: [], purchases: [] }

const SAVE_GOAL = 100000
export function quests(s: State, selectedSaved: number): Quest[] {
  const qs: Quest[] = s.purchases.map((p, i) => {
    const saved = p.regular - p.paid
    return { id: `p${i}`, title: `You've saved {{${Math.round(saved)}}} on ${p.name}`, progress: Math.min(saved, SAVE_GOAL), goal: SAVE_GOAL, reward: 25, done: saved >= SAVE_GOAL, unit: 'idr' }
  })
  const total = s.purchases.reduce((a, p) => a + p.regular - p.paid, 0)
  qs.push(
    { id: 'next', title: 'Save {{100000}} on your next purchase', progress: Math.min(selectedSaved, SAVE_GOAL), goal: SAVE_GOAL, reward: 25, done: false, unit: 'idr' },
    { id: 'total', title: 'Save {{500000}} in total', progress: Math.min(total, 500000), goal: 500000, reward: 100, done: total >= 500000, unit: 'idr' },
    { id: 'buy3', title: 'Buy 3 games on sale', progress: Math.min(s.purchases.length, 3), goal: 3, reward: 50, done: s.purchases.length >= 3, unit: 'count' },
    { id: 'track5', title: 'Track 5 games', progress: Math.min(s.tracked.length, 5), goal: 5, reward: 20, done: s.tracked.length >= 5, unit: 'count' },
  )
  return qs
}

export function xpOf(s: State) {
  const buy = s.purchases.reduce((a, p) => a + 10 + Math.floor((p.regular - p.paid) / 10000), 0)
  const q = quests(s, 0).filter((x) => x.done).reduce((a, x) => a + x.reward, 0)
  return buy + q
}
export const levelOf = (xp: number) => ({ level: Math.floor(xp / 100) + 1, into: xp % 100 })
