import { FormEvent, useEffect, useState } from 'react'
import { supabase, type Game, type Player, EMAIL_REGEX, normalizePhone } from '../lib/supabase'
import { parseDisplaySquareNumber } from '../lib/displaySquareNumber'
import PaymentMethodToggle, { type PaymentMethod } from './PaymentMethodToggle'
import { formatClaimError } from '../lib/claimErrors'

interface AdminClaimOnBehalfProps {
  game: Game | null
  onDone: () => void
}

export default function AdminClaimOnBehalf({ game, onDone }: AdminClaimOnBehalfProps) {
  const [positionsRaw, setPositionsRaw] = useState('')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Player[]>([])
  const [selected, setSelected] = useState<Player | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('venmo')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (selected) return
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      return
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('players')
        .select('*')
        .or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%`)
        .order('last_name')
        .limit(8)
      setSuggestions((data as Player[]) || [])
    }, 200)
    return () => clearTimeout(t)
  }, [query, selected])

  const pickPlayer = (p: Player) => {
    setSelected(p)
    setQuery(`${p.first_name} ${p.last_name}`)
    setFirstName(p.first_name)
    setLastName(p.last_name)
    setEmail(p.email)
    setPhone(p.phone || '')
    setSuggestions([])
  }

  /** Accept display square numbers 1–100; convert to storage positions 0–99 for RPC. */
  const parsePositions = (): number[] | null => {
    const parts = positionsRaw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return null
    const nums: number[] = []
    for (const p of parts) {
      const n = Number(p)
      const storage = parseDisplaySquareNumber(n)
      if (storage === null) return null
      nums.push(storage)
    }
    return [...new Set(nums)]
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setMessage('')
    if (!game) {
      setError('No active game')
      return
    }
    const positions = parsePositions()
    if (!positions) {
      setError('Enter valid square numbers (1–100), comma or space separated')
      return
    }
    const fn = firstName.trim()
    const ln = lastName.trim()
    const em = email.trim().toLowerCase()
    if (!fn || !ln) {
      setError('Name is required')
      return
    }
    if (!EMAIL_REGEX.test(em)) {
      setError('Please enter a valid email address')
      return
    }
    let normalizedPhone: string | undefined
    if (phone.trim()) {
      const n = normalizePhone(phone)
      if (!n) {
        setError('Please enter a valid phone number')
        return
      }
      normalizedPhone = n
    }

    setBusy(true)
    try {
      if (selected) {
        const args: {
          p_player_id: string
          p_game_id: string
          p_positions: number[]
          p_payment_method: string
          p_phone?: string
        } = {
          p_player_id: selected.id,
          p_game_id: game.id,
          p_positions: positions,
          p_payment_method: paymentMethod,
        }
        if (normalizedPhone) args.p_phone = normalizedPhone
        const { data, error: err } = await supabase.rpc('claim_squares_for_player', args)
        if (err) throw err
        const claimed = (data as { claimed?: number })?.claimed ?? 0
        setMessage(`Claimed ${claimed} square(s) for ${fn} ${ln}`)
      } else {
        // Guest path via RPC so phone lands on players only
        const args: {
          p_game_id: string
          p_positions: number[]
          p_first: string
          p_last: string
          p_email: string
          p_payment_method: string
          p_phone?: string
        } = {
          p_game_id: game.id,
          p_positions: positions,
          p_first: fn,
          p_last: ln,
          p_email: em,
          p_payment_method: paymentMethod,
        }
        if (normalizedPhone) args.p_phone = normalizedPhone
        const { data, error: err } = await supabase.rpc('claim_squares_as_guest', args)
        if (err) throw err
        const claimed = (data as { claimed?: number })?.claimed ?? 0
        if (claimed === 0) throw new Error('Those squares are no longer available')
        setMessage(`Claimed ${claimed} square(s) for ${fn} ${ln}`)
      }
      setPositionsRaw('')
      setQuery('')
      setSelected(null)
      setFirstName('')
      setLastName('')
      setEmail('')
      setPhone('')
      onDone()
    } catch (err) {
      setError(formatClaimError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden mb-10">
      <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50">
        <h2 className="text-xl font-bold text-[var(--color-text)]">Claim on Behalf</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mt-1">
          Type a returning player name to autocomplete, or enter a new name and email
        </p>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>
        )}

        <div>
          <label
            htmlFor="admin-claim-positions"
            className="block text-sm font-semibold text-[var(--color-text)] mb-1"
          >
            Square numbers (1–100)
          </label>
          <input
            id="admin-claim-positions"
            value={positionsRaw}
            onChange={(e) => setPositionsRaw(e.target.value)}
            placeholder="e.g. 13, 14, 25"
            className="w-full px-3 py-3 border-2 border-[var(--color-border)] rounded-lg text-base"
          />
        </div>

        <div className="relative">
          <label
            htmlFor="admin-claim-find-player"
            className="block text-sm font-semibold text-[var(--color-text)] mb-1"
          >
            Find player
          </label>
          <input
            id="admin-claim-find-player"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            placeholder="Start typing a name…"
            className="w-full px-3 py-3 border-2 border-[var(--color-border)] rounded-lg text-base"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full min-h-[44px] touch-manipulation text-left px-3 py-3 text-base hover:bg-slate-50"
                    onClick={() => pickPlayer(p)}
                  >
                    <span className="font-semibold text-[var(--color-text)]">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="text-[var(--color-text-secondary)] ml-2">{p.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="admin-claim-first" className="block text-sm font-semibold mb-1">
              First name
            </label>
            <input
              id="admin-claim-first"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-3 border-2 border-[var(--color-border)] rounded-lg text-base"
            />
          </div>
          <div>
            <label htmlFor="admin-claim-last" className="block text-sm font-semibold mb-1">
              Last name
            </label>
            <input
              id="admin-claim-last"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-3 border-2 border-[var(--color-border)] rounded-lg text-base"
            />
          </div>
          <div>
            <label htmlFor="admin-claim-email" className="block text-sm font-semibold mb-1">
              Email
            </label>
            <input
              id="admin-claim-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-3 border-2 border-[var(--color-border)] rounded-lg text-base"
            />
          </div>
          <div>
            <label htmlFor="admin-claim-phone" className="block text-sm font-semibold mb-1">
              Phone <span className="text-[var(--color-text-secondary)] font-normal">(optional)</span>
            </label>
            <input
              id="admin-claim-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-3 border-2 border-[var(--color-border)] rounded-lg text-base"
            />
          </div>
        </div>

        <PaymentMethodToggle
          value={paymentMethod}
          onChange={setPaymentMethod}
          disabled={busy}
        />

        <button
          type="submit"
          disabled={busy || !game}
          className="min-h-[44px] touch-manipulation px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-base font-semibold"
        >
          {busy ? 'Claiming…' : 'Claim Squares'}
        </button>
      </form>
    </section>
  )
}
