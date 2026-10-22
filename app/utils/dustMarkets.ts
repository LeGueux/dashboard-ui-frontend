import type { DustLevel, DustMarket } from '~/types/dust'

const MAX_LEVELS = 3

interface BookLevel {
  price: number
  size: number
  depth: number
}

interface OrderBook {
  asks: BookLevel[]
  bids: BookLevel[]
}

export function isYes(outcome?: string | null) {
  return String(outcome || '').trim().toLowerCase() === 'yes'
}

export function thresholdValue(title?: string | null) {
  const match = String(title || '').match(/-?\d+(?:\.\d+)?/)
  return match ? Number(match[0]) : Number.POSITIVE_INFINITY
}

export function bestAskCents(market: DustMarket) {
  const ask = Number(market.bestAsk ?? market.asks?.[0]?.price ?? Number.POSITIVE_INFINITY)
  return Number.isFinite(ask) ? ask * 100 : Number.POSITIVE_INFINITY
}

export function hasOnly999Asks(market: DustMarket) {
  const activeAskPrices = (market.asks || [])
    .filter(ask => Number.isFinite(Number(ask.price)) && Number(ask.size) > 0)
    .map((ask) => {
      const price = Number(ask.price)
      return price <= 1 ? price * 100 : price
    })

  return activeAskPrices.length > 0
    && activeAskPrices.every(price => Number(price.toFixed(3)) === 99.9)
}

export function dedupeMarkets(markets: DustMarket[] = []) {
  const unique = new Map<string, DustMarket>()

  for (const market of markets) {
    const key = [market.id ?? '', market.slug ?? '', market.airport ?? '', market.city ?? '', market.outcome ?? '', market.date ?? '', market.groupItemTitle ?? '']
      .filter(Boolean)
      .join('::')

    if (!unique.has(key)) {
      unique.set(key, market)
    }
  }

  return Array.from(unique.values())
}

export function orderBook(market: DustMarket): OrderBook {
  const clean = (levels?: DustLevel[]) => (levels || [])
    .map(l => ({ price: Number(l.price ?? 0), size: Number(l.size ?? 0) }))
    .filter(l => Number.isFinite(l.price) && l.price > 0 && l.size > 0)

  // Asks : on garde les 3 meilleurs (prix les plus bas), affichés du + haut au + bas
  const asks = clean(market.asks)
    .sort((a, b) => a.price - b.price)
    .slice(0, MAX_LEVELS)
    .reverse()

  // Bids : on garde les 3 meilleurs (prix les plus hauts), affichés du + haut au + bas
  const bids = clean(market.bids)
    .sort((a, b) => b.price - a.price)
    .slice(0, MAX_LEVELS)

  const maxSize = [...asks, ...bids].reduce((m, l) => Math.max(m, l.size), 0) || 1
  const withDepth = (l: { price: number, size: number }) => ({
    ...l,
    depth: Math.max(6, Math.round((l.size / maxSize) * 100))
  })

  return { asks: asks.map(withDepth), bids: bids.map(withDepth) }
}
