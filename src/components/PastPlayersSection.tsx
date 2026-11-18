import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  supabase,
  type Game,
  type Player,
  EMAIL_REGEX,
  GAMES_PUBLIC_COLUMNS,
  normalizePhone,
  formatPhoneDisplay,
  buildSmsLink,
} from '../lib/supabase'

interface CsvPreviewRow {
  first_name: string
  last_name: string
  email: string
  phone: string | null
  status: 'new' | 'update' | 'skip'
  error?: string
}

const INVITE_TEMPLATE_KEY = 'snps-text-invite-template'
const DEFAULT_INVITE_TEMPLATE =
  'Hi {first name}! SNPS Squares is open for {game name}. Claim your squares here: {board URL}'

function parseName(raw: string): { first: string; last: string } {
  const parts = raw.trim().split(/\s+/)
  if (parts.length === 0) return { first: '', last: '' }
  if (parts.length === 1) return { first: parts[0], last: parts[0] }
  return { first: parts[0], last: parts.slice(1).join(' ') }
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s-]+/g, '_')
}

function parseCsv(text: string): { rows: CsvPreviewRow[]; parseError?: string } {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)

  if (lines.length === 0) return { rows: [], parseError: 'CSV is empty' }

  const splitLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur.trim())
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur.trim())
    return out
  }

  const headers = splitLine(lines[0]).map(normalizeHeader)
  const emailIdx = headers.findIndex((h) => ['email', 'e_mail', 'email_address'].includes(h))
  const firstIdx = headers.findIndex((h) => ['first_name', 'firstname', 'first'].includes(h))
  const lastIdx = headers.findIndex((h) => ['last_name', 'lastname', 'last'].includes(h))
  const nameIdx = headers.findIndex((h) => ['name', 'full_name', 'player', 'player_name'].includes(h))
  const phoneIdx = headers.findIndex((h) =>
    ['phone', 'mobile', 'cell', 'cellphone', 'cell_phone', 'mobile_phone', 'phone_number'].includes(h)
  )

  if (emailIdx < 0) {
    return { rows: [], parseError: 'CSV must include an email column' }
  }
  if (firstIdx < 0 && lastIdx < 0 && nameIdx < 0) {
    return { rows: [], parseError: 'CSV must include name or first_name/last_name columns' }
  }

  const rows: CsvPreviewRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i])
    const email = (cols[emailIdx] || '').trim().toLowerCase()
    let first = firstIdx >= 0 ? (cols[firstIdx] || '').trim() : ''
    let last = lastIdx >= 0 ? (cols[lastIdx] || '').trim() : ''
    if ((!first || !last) && nameIdx >= 0) {
      const parsed = parseName(cols[nameIdx] || '')
      if (!first) first = parsed.first
      if (!last) last = parsed.last
    }

    const phoneRaw = phoneIdx >= 0 ? (cols[phoneIdx] || '').trim() : ''
    let phone: string | null = null
    if (phoneRaw) {
      phone = normalizePhone(phoneRaw)
      if (!phone) {
        rows.push({
          first_name: first,
          last_name: last,
          email,
          phone: null,
          status: 'skip',
          error: 'Invalid phone',
        })
        continue
      }
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      rows.push({
        first_name: first,
        last_name: last,
        email,
        phone,
        status: 'skip',
        error: 'Invalid or missing email',
      })
      continue
    }
    if (!first || !last) {
      rows.push({
        first_name: first,
        last_name: last,
        email,
        phone,
        status: 'skip',
        error: 'Missing first or last name',
      })
      continue
    }
    rows.push({ first_name: first, last_name: last, email, phone, status: 'new' })
  }

  return { rows }
}

function renderInviteMessage(
  template: string,
  vars: { firstName: string; gameName: string; boardUrl: string }
): string {
  return template
    .replace(/\{first name\}/gi, vars.firstName)
    .replace(/\{game name\}/gi, vars.gameName)
    .replace(/\{board URL\}/gi, vars.boardUrl)
}

export default function PastPlayersSection() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<Player | null>(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '' })
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[] | null>(null)
  const [csvBusy, setCsvBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [activeGame, setActiveGame] = useState<Game | null>(null)
  const [inviteTemplate, setInviteTemplate] = useState(() => {
    try {
      return localStorage.getItem(INVITE_TEMPLATE_KEY) || DEFAULT_INVITE_TEMPLATE
    } catch {
      return DEFAULT_INVITE_TEMPLATE
    }
  })

  const boardUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : '/'
  const gameName = activeGame
    ? `${activeGame.afc_team} vs ${activeGame.nfc_team} (${activeGame.season})`
    : 'SNPS Squares'

  const loadPlayers = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data, error: err } = await supabase
      .from('players')
      .select('*')
      .order('last_name')
      .order('first_name')

    if (err) {
      setError(
        err.message.includes('relation') || err.code === '42P01'
          ? 'Players table not found — apply the Past Players migration first.'
          : err.message
      )
      setPlayers([])
    } else {
      setPlayers((data as Player[]) || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    loadPlayers()
  }, [loadPlayers])

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('games')
        .select(GAMES_PUBLIC_COLUMNS)
        .eq('status', 'active')
        .maybeSingle()
      if (data) setActiveGame(data as Game)
    })()
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(INVITE_TEMPLATE_KEY, inviteTemplate)
    } catch {
      /* ignore */
    }
  }, [inviteTemplate])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return players
    return players.filter(
      (p) =>
        p.first_name.toLowerCase().includes(q) ||
        p.last_name.toLowerCase().includes(q) ||
        p.email.toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        formatPhoneDisplay(p.phone).toLowerCase().includes(q) ||
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(q)
    )
  }, [players, search])

  const selectedWithPhone = useMemo(
    () => filtered.filter((p) => selectedIds.has(p.id) && p.phone),
    [filtered, selectedIds]
  )

  const startAdd = () => {
    setEditing(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '' })
  }

  const startEdit = (p: Player) => {
    setEditing(p)
    setForm({
      first_name: p.first_name,
      last_name: p.last_name,
      email: p.email,
      phone: p.phone || '',
    })
  }

  const savePlayer = async () => {
    setMessage('')
    const first_name = form.first_name.trim()
    const last_name = form.last_name.trim()
    const email = form.email.trim().toLowerCase()
    const phoneRaw = form.phone.trim()
    let phone: string | null = null
    if (phoneRaw) {
      phone = normalizePhone(phoneRaw)
      if (!phone) {
        setError('Please enter a valid phone number')
        return
      }
    }
    if (!first_name || !last_name) {
      setError('First and last name are required')
      return
    }
    if (!EMAIL_REGEX.test(email)) {
      setError('Please enter a valid email address')
      return
    }
    setError('')

    if (editing) {
      const { error: err } = await supabase
        .from('players')
        .update({
          first_name,
          last_name,
          email,
          phone,
          source: editing.source === 'claim' ? 'manual' : editing.source,
        })
        .eq('id', editing.id)
      if (err) {
        setError(err.message)
        return
      }
      setMessage('Player updated')
    } else {
      const { error: err } = await supabase
        .from('players')
        .insert({ first_name, last_name, email, phone, source: 'manual' })
      if (err) {
        setError(err.message)
        return
      }
      setMessage('Player added')
    }
    setForm({ first_name: '', last_name: '', email: '', phone: '' })
    setEditing(null)
    await loadPlayers()
  }

  const deletePlayer = async (p: Player) => {
    if (!window.confirm(`Delete ${p.first_name} ${p.last_name}?`)) return
    const { error: err } = await supabase.from('players').delete().eq('id', p.id)
    if (err) {
      setError(err.message)
      return
    }
    setMessage('Player deleted')
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(p.id)
      return next
    })
    await loadPlayers()
  }

  const onCsvFile = async (file: File) => {
    setMessage('')
    setError('')
    const text = await file.text()
    const { rows, parseError } = parseCsv(text)
    if (parseError) {
      setError(parseError)
      setCsvPreview(null)
      return
    }

    const emailSet = new Map(players.map((p) => [p.email.toLowerCase(), p]))
    const annotated = rows.map((r) => {
      if (r.status === 'skip') return r
      return { ...r, status: emailSet.has(r.email) ? ('update' as const) : ('new' as const) }
    })
    setCsvPreview(annotated)
  }

  const confirmCsvImport = async () => {
    if (!csvPreview) return
    setCsvBusy(true)
    setError('')
    const payload = csvPreview
      .filter((r) => r.status === 'new' || r.status === 'update')
      .map((r) => ({
        first_name: r.first_name,
        last_name: r.last_name,
        email: r.email,
        phone: r.phone,
      }))

    const { data, error: err } = await supabase.rpc('admin_upsert_players', { p_rows: payload })
    setCsvBusy(false)
    if (err) {
      setError(err.message)
      return
    }
    const result = data as { new_count: number; updated_count: number; skipped_count: number }
    setMessage(
      `Import complete: ${result.new_count} new, ${result.updated_count} updated, ${result.skipped_count} skipped.`
    )
    setCsvPreview(null)
    await loadPlayers()
  }

  const exportCsv = () => {
    const header = 'first_name,last_name,email,phone,source,last_claimed_at\n'
    const body = players
      .map(
        (p) =>
          `"${p.first_name.replace(/"/g, '""')}","${p.last_name.replace(/"/g, '""')}","${p.email}","${p.phone || ''}",${p.source},${p.last_claimed_at || ''}`
      )
      .join('\n')
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `snps-past-players-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const previewCounts = useMemo(() => {
    if (!csvPreview) return null
    return {
      new: csvPreview.filter((r) => r.status === 'new').length,
      update: csvPreview.filter((r) => r.status === 'update').length,
      skip: csvPreview.filter((r) => r.status === 'skip').length,
    }
  }, [csvPreview])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    const withPhone = filtered.filter((p) => p.phone)
    if (withPhone.length === 0) return
    const allSelected = withPhone.every((p) => selectedIds.has(p.id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allSelected) {
        withPhone.forEach((p) => next.delete(p.id))
      } else {
        withPhone.forEach((p) => next.add(p.id))
      }
      return next
    })
  }

  const inviteBodyFor = (firstName: string) =>
    renderInviteMessage(inviteTemplate, { firstName, gameName, boardUrl })

  const copyText = async (text: string, okMsg: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setMessage(okMsg)
    } catch {
      setError('Could not copy to clipboard')
    }
  }

  const copySelectedNumbers = () => {
    if (selectedWithPhone.length === 0) return
    copyText(
      selectedWithPhone.map((p) => p.phone!).join(','),
      `Copied ${selectedWithPhone.length} number(s)`
    )
  }

  const copySelectedMessage = () => {
    if (selectedWithPhone.length === 0) return
    const first = selectedWithPhone[0].first_name
    copyText(inviteBodyFor(first), 'Copied invite message')
  }

  const textSelectedHref =
    selectedWithPhone.length > 0
      ? buildSmsLink(
          selectedWithPhone.map((p) => p.phone!),
          inviteBodyFor(selectedWithPhone[0].first_name)
        )
      : undefined

  const formOpen = editing !== null || form.first_name || form.last_name || form.email || form.phone

  return (
    <section className="bg-white rounded-xl border border-[var(--color-border)] shadow-md overflow-hidden mb-10">
      <div className="px-6 py-5 border-b border-[var(--color-border)] bg-slate-50 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-text)]">Past Players</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Returning players for claim autocomplete ({players.length} total)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="px-4 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm font-semibold cursor-pointer hover:bg-slate-50">
            Upload CSV
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) onCsvFile(f)
                e.target.value = ''
              }}
            />
          </label>
          <button
            type="button"
            onClick={exportCsv}
            disabled={players.length === 0}
            className="px-4 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={startAdd}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold hover:bg-opacity-90"
          >
            Add Player
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}
        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>
        )}

        <div className="bg-slate-50 border border-[var(--color-border-light)] rounded-lg p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-[var(--color-text)]">Text invite message</h3>
              <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                Placeholders: {'{first name}'}, {'{game name}'}, {'{board URL}'}. Saved in this browser.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInviteTemplate(DEFAULT_INVITE_TEMPLATE)}
              className="text-xs font-semibold text-[var(--color-primary)] hover:underline"
            >
              Reset default
            </button>
          </div>
          <textarea
            value={inviteTemplate}
            onChange={(e) => setInviteTemplate(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm resize-y"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={selectedWithPhone.length === 0}
              onClick={copySelectedNumbers}
              className="px-3 py-1.5 text-xs font-semibold border border-[var(--color-border)] rounded-lg hover:bg-white disabled:opacity-40"
            >
              Copy numbers
            </button>
            <button
              type="button"
              disabled={selectedWithPhone.length === 0}
              onClick={copySelectedMessage}
              className="px-3 py-1.5 text-xs font-semibold border border-[var(--color-border)] rounded-lg hover:bg-white disabled:opacity-40"
            >
              Copy message
            </button>
            {textSelectedHref ? (
              <a
                href={textSelectedHref}
                className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-primary)] text-white rounded-lg hover:bg-opacity-90"
              >
                Text selected ({selectedWithPhone.length})
              </a>
            ) : (
              <span className="px-3 py-1.5 text-xs font-semibold bg-[var(--color-primary)] text-white rounded-lg opacity-40">
                Text selected
              </span>
            )}
          </div>
        </div>

        {formOpen && (
          <div className="bg-slate-50 border border-[var(--color-border-light)] rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-[var(--color-text)]">{editing ? 'Edit Player' : 'Add Player'}</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                className="px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
                placeholder="First name"
                value={form.first_name}
                onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
              />
              <input
                className="px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
                placeholder="Last name"
                value={form.last_name}
                onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
              />
              <input
                className="px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <input
                className="px-3 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm"
                placeholder="Phone (optional)"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={savePlayer}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(null)
                  setForm({ first_name: '', last_name: '', email: '', phone: '' })
                }}
                className="px-4 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {csvPreview && previewCounts && (
          <div className="border-2 border-[var(--color-primary)]/30 rounded-lg p-4 space-y-3 bg-[var(--color-cream)]">
            <h3 className="font-semibold text-[var(--color-text)]">CSV Import Preview</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">
              {previewCounts.new} new · {previewCounts.update} update · {previewCounts.skip} skipped
            </p>
            <div className="max-h-48 overflow-y-auto text-sm">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs uppercase text-[var(--color-text-muted)]">
                    <th className="py-1 pr-2">Name</th>
                    <th className="py-1 pr-2">Email</th>
                    <th className="py-1 pr-2">Phone</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {csvPreview.slice(0, 50).map((r, i) => (
                    <tr key={i} className="border-t border-[var(--color-border-light)]">
                      <td className="py-1.5 pr-2">
                        {r.first_name} {r.last_name}
                      </td>
                      <td className="py-1.5 pr-2">{r.email || '—'}</td>
                      <td className="py-1.5 pr-2">{formatPhoneDisplay(r.phone)}</td>
                      <td className="py-1.5">
                        {r.status}
                        {r.error ? ` (${r.error})` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {csvPreview.length > 50 && (
                <p className="text-xs text-[var(--color-text-muted)] mt-2">Showing first 50 of {csvPreview.length}</p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={csvBusy || previewCounts.new + previewCounts.update === 0}
                onClick={confirmCsvImport}
                className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg text-sm font-semibold disabled:opacity-50"
              >
                {csvBusy ? 'Importing…' : 'Confirm Import'}
              </button>
              <button
                type="button"
                onClick={() => setCsvPreview(null)}
                className="px-4 py-2 border-2 border-[var(--color-border)] rounded-lg text-sm font-semibold"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <input
          type="search"
          placeholder="Search name, email, or phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2.5 border-2 border-[var(--color-border)] rounded-lg text-sm"
        />

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[var(--color-primary)]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 px-3 text-left">
                    <input
                      type="checkbox"
                      aria-label="Select all with phone"
                      checked={
                        filtered.some((p) => p.phone) &&
                        filtered.filter((p) => p.phone).every((p) => selectedIds.has(p.id))
                      }
                      onChange={toggleSelectAllVisible}
                    />
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Name</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Email</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Phone</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Source</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Last Claim</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[var(--color-text-muted)] uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border-light)]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[var(--color-text-muted)]">
                      No players yet
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const smsHref = p.phone
                      ? buildSmsLink([p.phone], inviteBodyFor(p.first_name))
                      : undefined
                    return (
                      <tr key={p.id} className="hover:bg-slate-50">
                        <td className="py-3 px-3">
                          <input
                            type="checkbox"
                            aria-label={`Select ${p.first_name} ${p.last_name}`}
                            disabled={!p.phone}
                            checked={selectedIds.has(p.id)}
                            onChange={() => toggleSelect(p.id)}
                          />
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-[var(--color-text)]">
                          {p.first_name} {p.last_name}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">{p.email}</td>
                        <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)] whitespace-nowrap">
                          {formatPhoneDisplay(p.phone)}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold uppercase text-[var(--color-text-muted)]">
                          {p.source}
                        </td>
                        <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">
                          {p.last_claimed_at ? new Date(p.last_claimed_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-2">
                            {smsHref ? (
                              <a
                                href={smsHref}
                                className="px-3 py-1.5 text-xs font-semibold border border-[var(--color-primary)] text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-cream)]"
                              >
                                Text invite
                              </a>
                            ) : (
                              <span className="px-3 py-1.5 text-xs font-semibold border border-[var(--color-border)] text-[var(--color-text-muted)] rounded-lg opacity-50">
                                Text invite
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => startEdit(p)}
                              className="px-3 py-1.5 text-xs font-semibold border border-[var(--color-border)] rounded-lg hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deletePlayer(p)}
                              className="px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-700 rounded-lg hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
