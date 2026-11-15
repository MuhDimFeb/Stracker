import type { ReactNode } from 'react'
import { CURS, format as fmt, useCurrency, type Cur } from './lib/currency'

export const ImgIcon = ({ s = 44 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 44 44" aria-hidden>
    <rect width="44" height="44" rx="8" fill="#000" />
    <circle cx="31" cy="14" r="3.5" fill="#3b3b3f" />
    <path d="M6 36l11-16 8 10 5-6 8 12z" fill="#3b3b3f" />
  </svg>
)

export const BellButton = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => (
  <button
    aria-pressed={on}
    aria-label={label}
    onClick={onClick}
    className={`ml-auto grid h-8 w-[69px] place-items-center rounded-[5px] border border-blue ${on ? 'bg-blue text-navy' : 'text-blue'}`}
  >
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 9a6 6 0 0112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0" />
    </svg>
  </button>
)

export const Checkbox = ({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) => (
  <button
    role="checkbox"
    aria-checked={on}
    aria-label={label}
    onClick={onClick}
    className={`grid size-4 flex-none place-items-center rounded-[3px] border-[1.5px] ${on ? 'border-blue bg-blue' : 'border-[#4a505a]'}`}
  >
    {on && (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden>
        <path d="M1.5 5.5l2.5 2.5 4.5-5" fill="none" stroke="#223244" strokeWidth="1.8" />
      </svg>
    )}
  </button>
)

export function Gauge({ p, over, children }: { p: number; over: boolean; children: ReactNode }) {
  const r = 108, C = 2 * Math.PI * r, arc = 0.75 * C
  const common = { cx: 120, cy: 120, r, fill: 'none', strokeWidth: 12, transform: 'rotate(135 120 120)' }
  return (
    <div className="relative mx-auto mt-[57px] mb-7 h-[210px] w-[240px] flex-none">
      <svg width="240" height="240" aria-hidden className="absolute top-0">
        <circle {...common} stroke="#2c3037" strokeDasharray={`${arc} ${C}`} />
        <circle {...common} stroke={over ? '#d9a441' : '#5e9bcb'} strokeDasharray={`${arc * Math.min(p, 1)} ${C}`} />
      </svg>
      <div className="absolute inset-x-0 top-[85px] text-center font-plex">{children}</div>
    </div>
  )
}

export function CurrencyTabs({ value, onChange }: { value: Cur; onChange: (c: Cur) => void }) {
  return (
    <div className="flex gap-1 rounded-md border border-[#4a4f5c] bg-[#262a34] p-1 lg:ml-auto" role="group" aria-label="Currency">
      {CURS.map((c) => (
        <button
          key={c}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={`h-9 w-[70px] rounded-[4px] font-inter text-sm font-semibold ${value === c ? 'bg-[#5c667d] text-white' : 'text-[#bac2d1]'}`}
        >
          {c}
        </button>
      ))}
    </div>
  )
}

export function Price({ idr }: { idr: number }) {
  const { cur, rates } = useCurrency()
  return <>{fmt(idr, cur, rates)}</>
}
