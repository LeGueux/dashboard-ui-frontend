const clockFormatters = new Map<string, Intl.DateTimeFormat>()

export function tzParts(tz: string, date: Date) {
  let formatter = clockFormatters.get(tz)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: tz,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
    clockFormatters.set(tz, formatter)
  }
  const parts = formatter.formatToParts(date)

  const get = (t: string) => Number(parts.find(p => p.type === t)?.value || 0)
  let h = get('hour')
  if (h === 24) h = 0
  return { h, m: get('minute'), s: get('second') }
}

export function remainingSecondsForTimezone(tz: string | null | undefined, now: Date | null) {
  if (!tz || !now) return Number.POSITIVE_INFINITY
  const { h, m, s } = tzParts(tz, now)
  return 86400 - (h * 3600 + m * 60 + s)
}
