import { UserButton, useClerk, useUser } from "@clerk/react"
import { levelOf, quests, xpOf, type State } from './data'
import { format, short, useCurrency } from './lib/currency'
import { bar, card, empty, h2, ph } from './styles'
import { ImgIcon, Price } from './ui'

export default function Account({ s, onSignOut }: { s: State; onSignOut: () => void }) {
  const { cur, rates } = useCurrency()
  const { user } = useUser()
  const { signOut } = useClerk()
  const { level, into } = levelOf(xpOf(s))
  const saved = s.purchases.reduce((a, p) => a + p.regular - p.paid, 0)
  const spent = s.purchases.reduce((a, p) => a + p.paid, 0)
  const qs = quests(s, 0).filter((q) => q.id !== 'next')
  const text = (t: string) => t.replace(/\{\{(\d+)\}\}/g, (_, n) => short(Number(n), cur, rates))
  const stats = [
    [String(s.purchases.length), 'Games owned'],
    [format(saved, cur, rates), 'Total saved'],
    [format(spent, cur, rates), 'Total spent'],
  ]
  return (
    <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 lg:px-[30px]">
      <div className={`${card} flex flex-wrap items-center gap-6 p-6`}>
        <UserButton />
        <div>
          <div className="font-display text-xl font-semibold">{user?.username ?? user?.firstName ?? 'Player'}</div>
          <div className="my-1.5 font-plex text-[13px] font-semibold">XP Lv. {level} · {into}/100</div>
          <div className={`${bar} h-2 w-[260px] max-w-full rounded`}><div className="h-full bg-gold" style={{ width: `${into}%` }} /></div>
        </div>
        <div className="ml-auto flex gap-9">
          {stats.map(([v, l]) => (
            <div key={l}><b className="block font-plex text-[22px] font-semibold">{v}</b><small className="text-[13px] text-mut">{l}</small></div>
          ))}
        </div>
        <button className="h-[31px] rounded-[5px] border border-blue px-[18px] font-display text-sm font-bold text-blue" onClick={() => signOut().then(onSignOut)}>Sign out</button>
      </div>

      <h2 className={h2}>My games</h2>
      {s.purchases.length === 0 ? (
        <p className={empty}>You haven't bought anything yet. Track a game, select it and press Buy selected.</p>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(min(260px,100%),1fr))] gap-[21px]">
          {s.purchases.map((p, i) => (
            <div className={`${card} p-3.5`} key={i}>
              <div className={`${ph} h-[110px]`}><ImgIcon s={36} /></div>
              <h3 className="mt-3 text-lg font-semibold">{p.name}</h3>
              <p className="mt-2 text-[13px] text-low">Paid <Price idr={p.paid} /> · saved <Price idr={p.regular - p.paid} /></p>
            </div>
          ))}
        </div>
      )}

      <h2 className={h2}>Quests</h2>
      {qs.map((q) => (
        <div className={`${card} mb-2.5 flex items-center gap-4 rounded-[3px] px-[18px] py-3.5 ${q.done ? 'border-l-4 border-low' : ''}`} key={q.id}>
          <div className="flex-1">
            <div className="mb-2 text-[15px]">{text(q.title)}</div>
            <div className={`${bar} h-1.5 w-full`}><div className={`h-full ${q.done ? 'bg-low' : 'bg-blue'}`} style={{ width: `${(q.progress / q.goal) * 100}%` }} /></div>
          </div>
          <div className="min-w-16 text-right font-plex text-[13px] font-semibold text-gold">{q.done ? 'Done' : `+${q.reward} XP`}</div>
        </div>
      ))}
    </main>
  )
}
