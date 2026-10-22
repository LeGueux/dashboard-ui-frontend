import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { registerHooks, stripTypeScriptTypes } from 'node:module'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import { computed, reactive, ref, createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'

const appRoot = new URL('../app/', import.meta.url)

// Le chargeur reprend les alias Nuxt et ses auto-imports Vue sans démarrer de serveur.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('~/')) return nextResolve(new URL(`${specifier.slice(2)}.ts`, appRoot).href, context)
    if (specifier.startsWith('.') && context.parentURL?.startsWith(appRoot.href)) {
      const candidate = new URL(`${specifier}.ts`, context.parentURL)
      if (existsSync(candidate)) return nextResolve(candidate.href, context)
    }
    return nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (!url.startsWith(appRoot.href) || !url.endsWith('.ts')) return nextLoad(url, context)
    let source = readFileSync(fileURLToPath(url), 'utf8')
    if (url.includes('/composables/')) {
      source = 'import { computed, ref, provide, inject, onMounted, onBeforeUnmount } from \'vue\'\n' + source
      if (url.endsWith('/useDustStation.ts')) source = 'import { useDustClock } from \'./useDustClock\'\n' + source
    }
    return { format: 'module', source: stripTypeScriptTypes(source), shortCircuit: true }
  }
})

const { orderBook, hasOnly999Asks, dedupeMarkets } = await import('../app/utils/dustMarkets.ts')
const { weatherForMarketDate } = await import('../app/utils/marketWeather.ts')
const { stationDate, marketCalendarDate } = await import('../app/utils/marketDate.ts')
const { weatherBets, buildWeatherChart } = await import('../app/utils/dustWeatherChart.ts')
const { useDustMarketGroups } = await import('../app/composables/useDustMarketGroups.ts')
const { provideDustClock } = await import('../app/composables/useDustClock.ts')
const { useDustStation } = await import('../app/composables/useDustStation.ts')

function snapshot(overrides = {}) {
  return {
    airport: 'LFPG', tz: 'Europe/Paris', unit: 'C', source: 'nws', sourceLabel: 'NWS', stale: false,
    fetchedAt: '2026-10-22T10:00:00Z', observedAt: '2026-10-22T10:00:00Z', current: { temperature: 18 },
    recentObservations: [{ timeLocal: '2026-10-22T11:00:00', temperature: 17 }, { timeLocal: '2026-10-22T12:00:00', temperature: 18 }],
    hourly: [{ timeLocal: '2026-10-22T13:00:00', temperature: 20 }, { timeLocal: '2026-10-22T14:00:00', temperature: 20 }],
    sparkline: [{ timeLocal: '2026-10-22T11:00:00', temperature: 17, kind: 'observed' }, { timeLocal: '2026-10-22T12:00:00', temperature: 18, kind: 'observed' }],
    ...overrides
  }
}

function market(overrides = {}) {
  return { id: 'today', airport: 'LFPG', city: 'Paris', date: '2026-10-22', outcome: 'Yes', groupItemTitle: '20°C', bestAsk: 0.99, airportData: { tz: 'Europe/Paris' }, ...overrides }
}

test('le carnet conserve trois niveaux, le sens de lecture et les données source', () => {
  const data = market({ asks: [{ price: 0.99, size: 4 }, { price: 0.97, size: 2 }, { price: 0.98, size: 3 }, { price: 1, size: 5 }, { price: 'invalide', size: 5 }], bids: [{ price: 0.9, size: 3 }, { price: 0.96, size: 8 }, { price: 0.95, size: 4 }, { price: 0.94, size: 2 }] })
  const original = structuredClone(data)
  const book = orderBook(data)
  assert.deepEqual(book.asks.map(level => level.price), [0.99, 0.98, 0.97])
  assert.deepEqual(book.bids.map(level => level.price), [0.96, 0.95, 0.94])
  assert.equal(book.bids[0].depth, 100)
  assert.deepEqual(data, original)
  assert.deepEqual(orderBook({}), { asks: [], bids: [] })
})

test('le filtre 99,9¢ accepte les deux formats du flux et ignore les niveaux sans quantité', () => {
  assert.equal(hasOnly999Asks({ asks: [{ price: 0.999, size: 10 }, { price: 99.9, size: 1 }, { price: 0.98, size: 0 }] }), true)
  assert.equal(hasOnly999Asks({ asks: [{ price: 0.999, size: 10 }, { price: 0.998, size: 1 }] }), false)
  assert.equal(hasOnly999Asks({ asks: [] }), false)
})

test('la déduplication conserve deux jours et deux issues du même marché', () => {
  const today = market()
  assert.equal(dedupeMarkets([today, { ...today }, market({ date: '2026-10-21' }), market({ outcome: 'No' })]).length, 3)
})

test('les dates respectent les fuseaux, les années et le passage décembre/janvier', () => {
  assert.equal(stationDate(new Date('2026-10-22T23:30:00Z'), 'Europe/Paris'), '2026-10-23')
  assert.equal(stationDate(new Date(), 'invalide'), null)
  assert.equal(marketCalendarDate('January 1', '2026-12-31'), '2027-01-01')
  assert.equal(marketCalendarDate('2026-02-30', ''), null)
})

test('un pari de la veille ne récupère ni la température ni les prévisions du jour', () => {
  const data = snapshot()
  assert.equal(weatherForMarketDate(data, '2026-10-21', 'Europe/Paris'), null)
  data.recentObservations.unshift({ timeLocal: '2026-10-21T23:00:00', temperature: 9 })
  const yesterday = weatherForMarketDate(data, '2026-10-21', 'Europe/Paris')
  assert.equal(yesterday.current.temperature, 9)
  assert.equal(yesterday.hourly.length, 0)
  assert.equal(yesterday.recentObservations.length, 1)
})

test('les seuils conservent les plages, les températures négatives et les conversions °F/°C', () => {
  const bets = weatherBets(snapshot(), [market({ groupItemTitle: '68-70°F' }), market({ groupItemTitle: '-5°C' })], [])
  assert.deepEqual(bets[0].temperatures, [-5])
  assert.equal(bets[1].temperatures.length, 2)
  assert.equal(bets[1].temperatures[0], 20)
  assert.ok(Math.abs(bets[1].temperatures[1] - 21.111111) < 0.00001)
})

test('les courbes restent finies à température constante, se redimensionnent et gardent les seuils visibles', () => {
  const data = weatherForMarketDate(snapshot(), '2026-10-22', 'Europe/Paris')
  const desktop = buildWeatherChart(data, [market({ groupItemTitle: '40°C' })], [], 800)
  const mobile = buildWeatherChart(data, [market({ groupItemTitle: '40°C' })], [], 320)
  assert.equal(desktop.primaryMax, 20)
  assert.ok(desktop.max >= 40)
  assert.ok(desktop.chartRight > mobile.chartRight)
  assert.ok(desktop.points.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)))
  assert.equal(JSON.stringify(desktop).includes('NaN'), false)
  assert.equal(buildWeatherChart({ ...data, hourly: [], sparkline: [] }, [], [], 320).points.length, 0)
})

test('les ticks conservent les objets groupes et n’invalident pas la météo ; un filtre et un flux restent réactifs', () => {
  const props = reactive({ markets: [market(), market({ id: 'yesterday', date: '2026-10-21', asks: [{ price: 0.999, size: 1 }] })], weatherSnapshots: { LFPG: snapshot() } })
  const hidden = ref(false)
  const now = ref(new Date('2026-10-22T10:00:00Z'))
  const { groups } = useDustMarketGroups(props, hidden, now)
  const original = groups.value
  let calculations = 0
  const geometry = computed(() => {
    calculations++
    return groups.value.map(group => buildWeatherChart(weatherForMarketDate(props.weatherSnapshots.LFPG, '2026-10-22', group.tz), group.markets, [], 420))
  })
  void geometry.value
  now.value = new Date('2026-10-22T10:00:30Z')
  assert.equal(groups.value, original)
  void geometry.value
  assert.equal(calculations, 1)
  hidden.value = true
  assert.equal(groups.value.length, 1)
  hidden.value = false
  assert.equal(groups.value.length, 2)
  props.markets = [market({ id: 'updated', bestAsk: 0.97 })]
  assert.equal(groups.value[0].markets[0].id, 'updated')
})

test('les alertes attendent le client, couvrent les fuseaux manquants et suivent minuit', async () => {
  let clock
  let station
  const props = reactive({ group: { key: 'paris', city: 'Paris', airport: 'LFPG', date: '2026-10-22', dateLabel: '22/10/2026', localTime: null, tz: 'Europe/Paris', markets: [market()] }, snapshot: snapshot(), forecasts: [] })
  const child = {
    setup() {
      station = useDustStation(props)
      return () => null
    }
  }
  await renderToString(createSSRApp({
    setup() {
      clock = provideDustClock()
      return () => h(child)
    }
  }))
  assert.equal(station.dateGuard.value, null)
  clock.now.value = new Date('2026-10-22T21:59:59Z')
  assert.equal(station.dateGuard.value.marketMatchesToday, true)
  clock.now.value = new Date('2026-10-22T22:00:00Z')
  assert.equal(station.dateGuard.value.marketMatchesToday, false)
  props.group.tz = null
  assert.equal(station.dateGuard.value.warning.title, 'Date du pari non vérifiable')
})
