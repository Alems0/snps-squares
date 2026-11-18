import { FormEvent, useEffect, useState } from 'react'
import { supabase, type Game, type Player, EMAIL_REGEX, normalizePhone } from '../lib/supabase'

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
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'venmo'>('venmo')
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

  const parsePositions = (): number[] | null => {
    const parts = positionsRaw
      .split(/[\s,]+/)
      .map((s) => s.trim())
      .filter(Boolean)
    if (parts.length === 0) return null
    const nums: number[] = []
    for (const p of parts) {
      const n = Number(p)
      if (!Number.isInteger(n) || n < 0 || n > 99) return null
      nums.push(n)
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
      setError('Enter valid square numbers (0–99), comma or space separated')
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
      setError(err instanceof Error ? err.message : 'Claim failed')
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
          <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Square positions</label>
          <input
            value={positionsRaw}
            onChange={(e) => setPositionsRaw(e.target.value)}
            placeholder="e.g. 12, 13, 24"
            className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
          />
        </div>

        <div className="relative">
          <label className="block text-xs font-semibold text-[var(--color-text)] mb-1">Find player</label>
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setSelected(null)
            }}
            placeholder="Start typing a name…"
            className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
            autoComplete="off"
          />
          {suggestions.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
              {suggestions.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50"
                    onClick={() => pickPlayer(p)}
                  >
                    <span className="font-semibold text-[var(--color-text)]">
                      {p.first_name} {p.last_name}
                    </span>
                    <span className="text-[var(--color-text-muted)] ml-2">{p.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold mb-1">First name</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Last name</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold mb-1">
              Phone <span className="text-[var(--color-text-muted)] font-normal">(optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="flex gap-4 items-center">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === 'venmo'}
              onChange={() => setPaymentMethod('venmo')}
            />
            Venmo
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              checked={paymentMethod === 'cash'}
              onChange={() => setPaymentMethod('cash')}
            />
            Cash
          </label>
        </div>

        <button
          type="submit"
          disabled={busy || !game}
          className="px-5 py-2.5 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
        >
          {busy ? 'Claiming…' : 'Claim Squares'}
        </button>
      </form>
    </section>
  )
}
