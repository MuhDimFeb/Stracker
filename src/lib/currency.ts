import { createContext, useContext, useEffect, useState } from 'react'

export type Cur = 'IDR' | 'USD' | 'EUR'
export type Rates = Record<Cur, number>
export const CURS: Cur[] = ['IDR', 'USD', 'EUR']
// All money is stored in IDR; 1 IDR = rates[cur] units of cur.
export const FALLBACK: Rates = { IDR: 1, USD: 1 / 16500, EUR: 1 / 19000 }

export const CurrencyCtx = createContext<{ cur: Cur; rates: Rates }>({ cur: 'IDR', rates: FALLBACK })
export const useCurrency = () => useContext(CurrencyCtx)

export function format(idr: number, cur: Cur, rates: Rates) {
  if (cur === 'IDR') return 'Rp' + Math.round(idr).toLocaleString('id-ID')
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency: cur }).format(idr * rates[cur])
}
// "100K IDR" style label for quest copy; other currencies use the normal format.
export function short(idr: number, cur: Cur, rates: Rates) {
  return cur === 'IDR' ? `${Math.round(idr / 1000)}K IDR` : format(idr, cur, rates)
}
// Parse what the user typed in the active currency back to IDR.
export const toIdr = (amount: number, cur: Cur, rates: Rates) => Math.round(amount / rates[cur])

export function useRates(): Rates {
  const [rates, setRates] = useState<Rates>(FALLBACK)
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/IDR')
      .then((r) => r.json())
      .then((d) => d?.rates && setRates({ IDR: 1, USD: d.rates.USD, EUR: d.rates.EUR }))
      .catch(() => {})
  }, [])
  return rates
}
