const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2
})

export function formatCents(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  const rounded = Math.round(n * 1000) / 10
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}¢`
}

export function formatSpread(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '—'
  return `${(n * 100).toFixed(1)}¢`
}

export function formatShares(value?: number | string | null) {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return '0'

  if (Number.isInteger(n)) {
    return n.toLocaleString('fr-FR')
  }

  return n.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

export function formatUsd(price?: number | string | null, size?: number | string | null) {
  const value = Number(price ?? 0) * Number(size ?? 0)
  if (!Number.isFinite(value)) return '$0.00'

  return usdFormatter.format(value)
}

export function netYieldAfterFeesValue(price?: number | string | null, size?: number | string | null) {
  const p = Number(price ?? 0)
  const shares = Number(size ?? 0)

  if (!Number.isFinite(p) || !Number.isFinite(shares) || shares <= 0 || p <= 0 || p >= 1) {
    return null
  }

  const feeRate = 0.05
  return shares * (1 - p) - shares * feeRate * p * (1 - p)
}

export function formatNetYieldAfterFees(price?: number | string | null, size?: number | string | null) {
  const netYield = netYieldAfterFeesValue(price, size)
  if (netYield === null) return ''

  const formatter = usdFormatter

  return `${netYield >= 0 ? '+' : '-'}${formatter.format(Math.abs(netYield))}`
}

export function formatFrDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

export function formatBetDateLabel(value?: string | null) {
  if (!value) return null

  const raw = String(value).trim()
  if (!raw) return null

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('fr-FR', {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit'
    }).format(parsed)
  }

  const fallback = raw.replace(/\s+/g, ' ').trim()
  return fallback || null
}
