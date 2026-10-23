import type { DustMarket, MarketLink, CityGroup } from '~/types/dust'

const QUICK_LINK_LABELS = ['NWS', 'AW', 'WU', 'WETHR', 'BM EVENT']

export function parseMarkdownLinks(raw: string, source: MarketLink['source']): MarketLink[] {
  const links: MarketLink[] = []
  const regex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let match: RegExpExecArray | null = regex.exec(raw)

  while (match) {
    const label = match[1]
    const url = match[2]

    if (label && url) {
      links.push({
        label,
        url,
        source
      })
    }

    match = regex.exec(raw)
  }

  return links
}

export function getMarketLinks(market: DustMarket): MarketLink[] {
  const marketUrl = typeof market.link === 'string' && market.link.trim() ? market.link.trim() : ''

  if (Array.isArray(market.links) && market.links.length > 0) {
    const baseLinks: MarketLink[] = marketUrl
      ? [{ label: 'POLYMARKET', url: marketUrl, source: 'polymarket' }]
      : []

    const sanitized = market.links
      .filter(link => !!link?.label && !!link?.url)
      .map(link => ({
        label: link.label,
        url: link.url,
        source: link.source || 'airport'
      }))

    const uniqueStructured = new Map<string, MarketLink>()
    for (const link of [...baseLinks, ...sanitized]) {
      if (!uniqueStructured.has(link.url)) {
        uniqueStructured.set(link.url, link)
      }
    }

    return Array.from(uniqueStructured.values())
  }

  const all = [
    ...(marketUrl ? [{ label: 'POLYMARKET', url: marketUrl, source: 'polymarket' as const }] : []),
    ...parseMarkdownLinks(market.betmoardLinks || '', 'betmoar'),
    ...parseMarkdownLinks(market.airportLinks || '', 'airport')
  ]

  const unique = new Map<string, MarketLink>()
  for (const link of all) {
    if (!unique.has(link.url)) {
      unique.set(link.url, link)
    }
  }

  return Array.from(unique.values())
}

export function getGroupLinks(group: CityGroup) {
  const unique = new Map<string, MarketLink>()

  for (const market of group.markets) {
    for (const link of getMarketLinks(market)) {
      if (!unique.has(link.url)) {
        unique.set(link.url, link)
      }
    }
  }

  return Array.from(unique.values())
}

export function normalizeLinkLabel(label?: string | null) {
  return String(label || '').trim().toUpperCase()
}

export function getQuickLinksForGroup(group: CityGroup) {
  const links = getGroupLinks(group)
  const quick: MarketLink[] = []

  for (const targetLabel of QUICK_LINK_LABELS) {
    const target = normalizeLinkLabel(targetLabel)
    const match = links.find(link => normalizeLinkLabel(link.label) === target)
    if (match) quick.push(match)
  }

  return quick
}

export function getResolutionBadgeForGroup(group: CityGroup) {
  const market = group.markets.find(item => item.resolutionSource)
  if (!market?.resolutionSource) return null

  let provider = market.resolutionProvider?.toLowerCase() || ''
  if (!provider) {
    try {
      provider = new URL(market.resolutionSource).hostname.toLowerCase()
    } catch {
      provider = ''
    }
  }

  const label = provider.includes('wunderground')
    ? 'WU'
    : provider.includes('aviationweather')
      ? 'AW'
      : provider.includes('weather.gov')
        ? 'NWS'
        : 'SOURCE'

  return {
    label,
    matchesAirportCode: market.resolutionSourceMatchesAirport
  }
}
