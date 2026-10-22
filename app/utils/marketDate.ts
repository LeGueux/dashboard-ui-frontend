const dateFormatters = new Map<string, Intl.DateTimeFormat>()
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']

export function stationDate(date: Date, timeZone?: string | null): string | null {
  if (!timeZone || !Number.isFinite(date.getTime())) return null
  try {
    let formatter = dateFormatters.get(timeZone)
    if (!formatter) {
      formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' })
      dateFormatters.set(timeZone, formatter)
    }
    const parts = formatter.formatToParts(date)
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value
    return `${part('year')}-${part('month')}-${part('day')}`
  } catch {
    // Un fuseau inconnu ne doit jamais faire valider la date dans celui du navigateur.
    return null
  }
}

function calendarDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return date.toISOString().slice(0, 10)
}

export function marketCalendarDate(value: string | null | undefined, localDate: string, slug?: string | null): string | null {
  const raw = String(value || '').trim()
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/)
  // La date du pari désigne un jour civil, même lorsqu'elle arrive sous forme ISO.
  if (iso) return calendarDate(Number(iso[1]), Number(iso[2]), Number(iso[3]))

  const text = raw.match(/^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i)
  if (!text) return null
  const month = months.indexOf(text[1]!.toLowerCase()) + 1
  const day = Number(text[2])
  if (!month) return null
  const explicitYear = text[3] || slug?.match(/(?:^|-)((?:19|20)\d{2})(?:-|$)/)?.[1]
  if (explicitYear) return calendarDate(Number(explicitYear), month, day)

  // Polymarket fournit aussi « October 18 » : le jour le plus proche gère le passage décembre/janvier.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return null
  const year = Number(localDate.slice(0, 4))
  return [year - 1, year, year + 1]
    .map(candidate => calendarDate(candidate, month, day))
    .filter((candidate): candidate is string => candidate !== null)
    .sort((a, b) => Math.abs(Date.parse(a) - Date.parse(localDate)) - Math.abs(Date.parse(b) - Date.parse(localDate)))[0] || null
}

export function calendarDateLabel(value: string) {
  return value.split('-').reverse().join('/')
}
