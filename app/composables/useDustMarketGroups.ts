import type { Ref } from 'vue'
import type { CityGroup, DustMarket, WeatherSnapshot } from '~/types/dust'
import { calendarDateLabel, marketCalendarDate, stationDate } from '~/utils/marketDate'
import { formatBetDateLabel } from '~/utils/dustFormatters'
import { dedupeMarkets, hasOnly999Asks, isYes, bestAskCents, thresholdValue } from '~/utils/dustMarkets'
import { remainingSecondsForTimezone } from '~/utils/dustTime'

function marketSort(a: DustMarket, b: DustMarket, now: Date | null) {
  const yesA = isYes(a.outcome) ? 0 : 1
  const yesB = isYes(b.outcome) ? 0 : 1
  if (yesA !== yesB) return yesA - yesB

  const remainingA = remainingSecondsForTimezone(a.airportData?.tz, now)
  const remainingB = remainingSecondsForTimezone(b.airportData?.tz, now)
  if (remainingA !== remainingB) return remainingA - remainingB

  const askA = bestAskCents(a)
  const askB = bestAskCents(b)
  if (askA !== askB) return askA - askB

  return thresholdValue(a.groupItemTitle) - thresholdValue(b.groupItemTitle)
}

export function useDustMarketGroups(
  props: { markets: DustMarket[], weatherSnapshots: Record<string, WeatherSnapshot> },
  hideOnly999Asks: Ref<boolean>,
  coarseNow: Ref<Date | null>,
  hideFahrenheit?: Ref<boolean>
) {
  // La date de secours ne change qu'à minuit, sans invalider le regroupement toutes les 30 secondes.
  const fallbackDateKey = computed(() => JSON.stringify(Object.fromEntries(props.markets.map((market) => {
    const tz = market.airportData?.tz || props.weatherSnapshots[market.airport || '']?.tz || ''
    return [tz, coarseNow.value ? stationDate(coarseNow.value, tz) : null]
  }))))

  const grouped = computed(() => {
    const fallbackDates = JSON.parse(fallbackDateKey.value) as Record<string, string | null>
    const cards = dedupeMarkets(props.markets)
    const filteredCards = cards.filter((market) => {
      if (hideOnly999Asks.value && hasOnly999Asks(market)) return false
      // L'unité du pari prime ; les métadonnées météo servent de secours si elle manque.
      const unit = market.groupItemTitle?.match(/°\s*([CF])/i)?.[1]?.toUpperCase()
        || market.airportData?.unit || props.weatherSnapshots[market.airport || '']?.unit
      if (hideFahrenheit?.value && unit === 'F') return false
      return true
    })
    const map = new Map<string, CityGroup>()

    for (const market of filteredCards) {
      const city = market.city || 'Ville inconnue'
      const airport = market.airport || ''
      const snapshot = props.weatherSnapshots[airport]
      const tz = market.airportData?.tz || snapshot?.tz || null
      // La collecte fournit une année stable au SSR pour les dates courtes de Polymarket.
      const collectionDate = snapshot ? stationDate(new Date(snapshot.fetchedAt), tz) : null
      const referenceDate = collectionDate || fallbackDates[tz || '']
      const date = marketCalendarDate(market.date, referenceDate || '', market.slug)
      const key = JSON.stringify([city, airport, date || market.date || 'date-inconnue'])
      if (!map.has(key)) {
        map.set(key, {
          key,
          city,
          airport,
          date,
          localTime: market.localTime || null,
          dateLabel: date ? calendarDateLabel(date) : formatBetDateLabel(market.date),
          tz,
          markets: []
        })
      }

      const group = map.get(key)!
      group.markets.push(market)

      if (!group.dateLabel && market.date) {
        group.dateLabel = formatBetDateLabel(market.date)
      }
    }
    return [...map.values()]
  })

  const groups = computed<CityGroup[]>((previous) => {
    const now = coarseNow.value
    const previousByKey = new Map(previous?.map(group => [group.key, group]))
    const ranked = grouped.value.map((group) => {
      const markets = [...group.markets].sort((a, b) => marketSort(a, b, now))
      const old = previousByKey.get(group.key)
      const same = old && old.city === group.city && old.airport === group.airport
        && old.date === group.date && old.dateLabel === group.dateLabel && old.tz === group.tz
        && old.localTime === group.localTime && old.markets.length === markets.length
        && old.markets.every((market, index) => market === markets[index])
      return {
        group: same ? old : { ...group, markets },
        remaining: Math.min(...markets.map(market => remainingSecondsForTimezone(market.airportData?.tz, now))),
        bestAsk: Math.min(...markets.map(bestAskCents))
      }
    })
    ranked.sort((a, b) => a.remaining - b.remaining || a.bestAsk - b.bestAsk
      || a.group.city.localeCompare(b.group.city) || (a.group.date || '').localeCompare(b.group.date || ''))
    const next = ranked.map(item => item.group)
    return previous && previous.length === next.length && previous.every((group, index) => group === next[index]) ? previous : next
  })

  return { groups }
}
