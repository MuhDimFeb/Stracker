import { useEffect, useState } from 'react'
import { SignInButton, useAuth } from "@clerk/react"
import Account from './Account'
import { EMPTY, levelOf, xpOf, type Game, type State } from './data'
import { CurrencyCtx, format, toIdr, useRates, type Cur } from './lib/currency'
import { fetchLows, refreshPrices, searchGames, cover } from './lib/steam'
import { useSupabase } from './lib/supabase'
import { btn, card, empty, ph, search } from './styles'
import { BellButton, Checkbox, CurrencyTabs, Gauge, Price } from './ui'

// Merge an all-time low into a game; otherwise keep the lowest price we have seen.
const withLow = (g: Game, all?: number): Game =>
  all ? { ...g, low: Math.min(all, g.price), lowAll: true } : { ...g, low: Math.min(g.low, g.price) }
const clean = (x: State): State => ({ ...EMPTY, ...x, tracked: (x.tracked ?? []).filter((t) => typeof t === 'object') })

export default function App() {
  const rates = useRates()
  const [cur, setCur] = useState<Cur>('IDR')
  const [s, setS] = useState<State>(EMPTY)
  const [loaded, setLoaded] = useState<string | null>(null)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [view, setView] = useState<'home' | 'account'>('home')
  const [searching, setSearching] = useState(false)
  const [amount, setAmount] = useState('')
  const { isLoaded, isSignedIn, userId } = useAuth()
  const sb = useSupabase()

  // Each owner (a Clerk user id, or 'guest') has its own data. Guest data is never copied into an account.
  const key = isSignedIn && userId ? userId : 'guest'
  const cloud = !!(isSignedIn && userId && sb)

  // Load. `loaded` records whose data is currently in state, so we never save one owner's data as another's.
  useEffect(() => {
    if (!isLoaded) return
    let stale = false
    setLoaded(null)
    setSyncError(null)
    if (cloud) {
      sb!.from('user_state').select('data').eq('user_id', userId!).maybeSingle().then(({ data, error }) => {
        if (stale) return
        if (error) {
          setS(EMPTY)
          setSyncError(`Could not load your saved data: ${error.message}. Changes will not be saved.`)
          return
        }
        setS(data ? clean(data.data as State) : EMPTY)
        setLoaded(key)
      })
    } else {
      const raw = localStorage.getItem(`stracker:${key}`)
      setS(raw ? clean(JSON.parse(raw)) : EMPTY)
      setLoaded(key)
    }
    return () => { stale = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, key, cloud])

  // Refresh live Steam prices once per load and keep the lowest price seen.
  useEffect(() => {
    if (!loaded || !s.tracked.length) return
    const ids = s.tracked.map((g) => g.id)
    Promise.all([refreshPrices(ids), fetchLows(ids)]).then(([p, lows]) =>
      setS((x) => ({ ...x, tracked: x.tracked.map((g) => withLow(p[g.id] ? { ...g, price: p[g.id].price, regular: p[g.id].regular } : g, lows[g.id])) })),
    ).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded])

  // Save (debounced): signed in -> Supabase only; otherwise localStorage for this owner only.
  useEffect(() => {
    if (loaded !== key) return
    if (cloud) {
      const t = setTimeout(() => {
        sb!.from('user_state').upsert({ user_id: userId!, data: s, updated_at: new Date().toISOString() })
          .then(({ error }) => setSyncError(error ? `Not saved to the database: ${error.message}` : null))
      }, 600)
      return () => clearTimeout(t)
    }
    localStorage.setItem(`stracker:${key}`, JSON.stringify(s))
  }, [s, loaded, key, cloud, sb, userId])

  const tracked = s.tracked
  const chosen = tracked.filter((g) => s.selected.includes(g.id))
  const total = chosen.reduce((a, g) => a + g.price, 0)
  const { level, into } = levelOf(xpOf(s))
  const toggle = (id: string) =>
    setS((x) => ({ ...x, selected: x.selected.includes(id) ? x.selected.filter((i) => i !== id) : [...x.selected, id] }))
  // Bell: on = the game is tracked and shows on the homepage; off = it is removed.
  const bell = (g: Game) =>
    setS((x) =>
      x.tracked.some((t) => t.id === g.id)
        ? { ...x, tracked: x.tracked.filter((t) => t.id !== g.id), selected: x.selected.filter((i) => i !== g.id) }
        : { ...x, tracked: [g, ...x.tracked] },
    )
  // Bell turned on from search: fetch the all-time low for it in the background.
  const bellOn = (g: Game) => {
    bell(g)
    if (!s.tracked.some((t) => t.id === g.id)) fetchLows([g.id]).then((l) => l[g.id] && setS((x) => ({ ...x, tracked: x.tracked.map((t) => (t.id === g.id ? withLow(t, l[g.id]) : t)) })))
  }
  const addFund = () => {
    const n = parseFloat(amount.replace(',', '.'))
    if (!(n > 0)) return
    setS((x) => ({ ...x, fund: x.fund + toIdr(n, cur, rates) }))
    setAmount('')
  }
  const buy = () => {
    if (!chosen.length || total > s.fund) return
    const at = new Date().toISOString()
    setS((x) => ({
      ...x,
      fund: x.fund - total,
      purchases: [...x.purchases, ...chosen.map((g) => ({ gameId: g.id, name: g.name, paid: g.price, regular: g.regular, at }))],
      tracked: x.tracked.filter((g) => !x.selected.includes(g.id)),
      selected: [],
    }))
  }

  const Magnifier = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="#a6adba" strokeWidth="1.5" /><path d="M10 10l4 4" stroke="#a6adba" strokeWidth="1.5" /></svg>
  )

  return (
    <CurrencyCtx.Provider value={{ cur, rates }}>
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-[5] flex flex-wrap items-center gap-6 bg-bar px-4 py-3 lg:h-[76px] lg:flex-nowrap lg:px-[30px] lg:py-0">
          <button className="flex min-w-[120px] items-center gap-2 text-left font-plex" onClick={() => setView('home')} aria-label="STRACKER home">
            <svg width="27" height="27" viewBox="0 0 27 27" aria-hidden><circle cx="13.5" cy="13.5" r="13.5" fill="#2f6fa8" /><circle cx="10" cy="13.5" r="3.5" fill="none" stroke="#e6e8eb" strokeWidth="2" /><path d="M13 13.5h8M18 13.5v3" stroke="#e6e8eb" strokeWidth="2" /></svg>
            <span>
              <b className="block text-[11px] font-semibold tracking-[.06em]">STRACKER</b>
              <small className="block text-[7.8px] font-medium tracking-[.08em] text-mut">MONEY AND<br />SALE TRACKER</small>
            </span>
          </button>
          <button className={`${search} min-w-[200px] max-w-[739px] flex-1 text-left`} onClick={() => setSearching(true)}>
            <Magnifier />
            Search...
          </button>
          <CurrencyTabs value={cur} onChange={setCur} />
          {isSignedIn ? (
            <button className="flex w-[226px] items-center gap-2.5 text-left" onClick={() => setView('account')} aria-label="Open account">
              <span className="grid size-10 flex-none place-items-center rounded-full bg-[#3a404a]"><svg width="22" height="22" viewBox="0 0 22 22" aria-hidden><circle cx="11" cy="8" r="4" fill="#8b919b" /><path d="M3 20c0-4 4-6 8-6s8 2 8 6z" fill="#8b919b" /></svg></span>
              <div>
                <div className="font-plex text-[13px] font-semibold">XP Lv. {level}</div>
                <div className="mt-[5px] h-1 w-[162px] overflow-hidden rounded-sm bg-[#2c3037]"><div className="h-full bg-gold" style={{ width: `${into}%` }} /></div>
              </div>
            </button>
          ) : (
            <SignInButton mode="modal"><button className={btn}>Sign in</button></SignInButton>
          )}
        </header>

        {syncError && <p role="alert" className="bg-[#3a2a1b] px-4 py-2 font-inter text-[13px] text-gold lg:px-[30px]">{syncError}</p>}

        {view === 'account' && isSignedIn ? (
          <Account s={s} onSignOut={() => setView('home')} />
        ) : (
          <div className="grid flex-1 gap-[26px] px-4 py-[22px] lg:grid-cols-[1fr_355px] lg:px-[30px]">
            <section className="bg-bg px-5 py-8 shadow-well" aria-label="Tracked games">
              {tracked.length === 0 ? (
                <p className={empty}>No games tracked yet. Search for a game and turn on its bell to show it here.</p>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(min(380px,100%),1fr))] gap-[21px]">
                  {tracked.map((g) => (
                    <article className={`${card} px-[19px] pt-[22px] pb-6`} key={g.id}>
                      <div className={`${ph} h-[182px]`}><img className="size-full object-cover" src={cover(g.id)} alt="" loading="lazy" /></div>
                      <h3 className="mt-[18px] font-display text-2xl font-semibold">{g.name}</h3>
                      <div className="mt-[26px] mb-2 ml-0.5 text-sm font-semibold">
                        <span className="text-mut">Current :</span> <Price idr={g.price} />
                        {g.price < g.regular && <span className="ml-2 rounded-[3px] bg-lowbg px-1.5 py-0.5 font-nunito text-xs font-bold text-low">-{Math.round((1 - g.price / g.regular) * 100)}%</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex h-8 max-w-[336px] flex-1 items-center bg-lowbg px-3.5 font-nunito text-sm font-semibold text-low">
                          {g.price <= g.low ? (g.lowAll ? 'At historical low' : 'At lowest seen') : <>{g.lowAll ? 'Historical Low' : 'Lowest seen'}: <Price idr={g.low} /></>}
                        </div>
                        <BellButton on label={`Stop tracking ${g.name}`} onClick={() => bell(g)} />
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <aside className="flex min-h-[640px] flex-col overflow-hidden rounded-[5px] bg-card shadow-panel lg:sticky lg:top-[98px] lg:h-[calc(100vh-120px)]" aria-label="Balance">
              <Gauge p={s.fund ? total / s.fund : 0} over={total > s.fund}>
                <b className="block text-[30px] font-semibold">{format(total, cur, rates)}</b>
                <small className="text-[13px] text-mut">/ {format(s.fund, cur, rates)} used</small>
              </Gauge>
              <label className="mb-[7px] flex items-center gap-2.5 px-[21px] font-nunito text-[13px] font-bold text-mut">
                <Checkbox label="Select all" on={tracked.length > 0 && chosen.length === tracked.length} onClick={() => setS((x) => ({ ...x, selected: chosen.length === tracked.length ? [] : tracked.map((g) => g.id) }))} />
                Select all
              </label>
              <div className="mx-[21px] flex min-h-[120px] flex-1 flex-col gap-2.5 overflow-auto bg-bg px-[9px] py-2.5 shadow-inset">
                {tracked.length === 0 && <p className={empty}>Games you track show up here.</p>}
                {tracked.map((g) => (
                  <div className={`${card} flex h-10 w-full flex-none items-center gap-3 rounded-[3px] pr-2.5 pl-[19px] text-left`} key={g.id}>
                    <Checkbox label={`Select ${g.name}`} on={s.selected.includes(g.id)} onClick={() => toggle(g.id)} />
                    <span className={`${ph} h-[30px] w-10 flex-none`}><img src={cover(g.id)} alt="" className="size-full object-cover" /></span>
                    <span className="min-w-0"><b className="block truncate text-[13px]">{g.name}</b><small className="text-[10px] text-mut"><Price idr={g.price} /></small></span>
                  </div>
                ))}
              </div>
              <div className="mt-3.5 flex flex-col gap-3 bg-bg px-[18px] pt-3.5 pb-[22px]">
                <button className={btn} disabled={!chosen.length || total > s.fund} onClick={buy}>
                  {total > s.fund ? 'Not enough balance' : `Buy selected (${chosen.length})`}
                </button>
                <div className="flex items-center gap-5">
                  <input className="h-[30px] min-w-0 flex-1 bg-card px-3 text-center font-display text-sm font-bold text-tx shadow-inset placeholder:text-mut" inputMode="decimal" placeholder="Add your balance..." value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addFund()} aria-label={`Balance to add in ${cur}`} />
                  <button className={btn} onClick={addFund}>Add</button>
                </div>
              </div>
            </aside>
          </div>
        )}

        {searching && <SearchOverlay onClose={() => setSearching(false)} onBell={bellOn} tracked={s.tracked.map((g) => g.id)} />}
      </div>
    </CurrencyCtx.Provider>
  )
}

function SearchOverlay({ onClose, onBell, tracked }: { onClose: () => void; onBell: (g: Game) => void; tracked: string[] }) {
  const [q, setQ] = useState('')
  const [found, setFound] = useState<Game[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'done'>('idle')
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  useEffect(() => {
    const term = q.trim()
    if (!term) { setFound([]); setStatus('idle'); return }
    setStatus('loading')
    const ctl = new AbortController()
    const t = setTimeout(() => {
      searchGames(term, ctl.signal).then((g) => { setFound(g); setStatus('done') }).catch((e) => e.name !== 'AbortError' && setStatus('error'))
    }, 350)
    return () => { clearTimeout(t); ctl.abort() }
  }, [q])
  return (
    <div className="fixed inset-0 z-10 overflow-auto bg-bar pt-[157px] pb-[60px]" role="dialog" aria-label="Search games">
      <div className="mx-auto flex w-[min(706px,90vw)] items-center gap-5">
        <label className={`${search} flex-1 focus-within:outline-2 focus-within:outline-blue`}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden><circle cx="6.5" cy="6.5" r="4.5" fill="none" stroke="#a6adba" strokeWidth="1.5" /><path d="M10 10l4 4" stroke="#a6adba" strokeWidth="1.5" /></svg>
          <input className="flex-1 bg-transparent font-inter text-[13px] text-tx outline-0 focus-visible:outline-0" autoFocus placeholder="Search Steam games..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="text-mut" onClick={onClose} aria-label="Close search (Esc)">
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 5v9H6m5-5l-5 5 5 5" /></svg>
        </button>
      </div>
      <div className="mx-auto mt-10 w-[min(911px,92vw)]">
        {status === 'idle' && <p className={empty}>Type a game name, then turn on its bell to track it.</p>}
        {status === 'loading' && <p className={empty}>Searching Steam...</p>}
        {status === 'error' && <p className={empty}>Couldn't reach Steam. Check your connection and try again.</p>}
        {status === 'done' && found.length === 0 && <p className={empty}>No game matches "{q}". Try another name.</p>}
        {status === 'done' && found.map((g) => (
          <div className="flex items-center gap-[25px] rounded-[3px] border-b-[3px] border-line px-5 py-4 hover:bg-[#2a2e38]" key={g.id}>
            <span className={`${ph} h-[107px] w-[158px] flex-none`}><img className="size-full object-cover" src={cover(g.id)} alt="" loading="lazy" /></span>
            <span className="min-w-0 flex-1"><h4 className="mb-[30px] truncate text-4xl font-normal">{g.name}</h4><p className="text-xl text-mut"><Price idr={g.price} /></p></span>
            <BellButton on={tracked.includes(g.id)} label={`Track ${g.name}`} onClick={() => onBell(g)} />
          </div>
        ))}
      </div>
    </div>
  )
}
