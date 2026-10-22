import type { InjectionKey, Ref } from 'vue'

interface DustClock {
  now: Ref<Date | null>
  coarseNow: Ref<Date | null>
}

const dustClockKey: InjectionKey<DustClock> = Symbol('dust-clock')

export function provideDustClock() {
  // Une horloge par tableau ; seuls les petits composants qui la lisent se mettent à jour.
  const now = ref<Date | null>(null)
  const coarseNow = ref<Date | null>(null)
  let clock: ReturnType<typeof setInterval> | null = null
  let coarseClock: ReturnType<typeof setInterval> | null = null

  onMounted(() => {
    now.value = new Date()
    coarseNow.value = now.value
    clock = setInterval(() => {
      now.value = new Date()
    }, 1000)
    coarseClock = setInterval(() => {
      coarseNow.value = new Date()
    }, 30_000)
  })

  onBeforeUnmount(() => {
    if (clock) clearInterval(clock)
    if (coarseClock) clearInterval(coarseClock)
  })

  const state = { now, coarseNow }
  provide(dustClockKey, state)
  return state
}

export function useDustClock() {
  const clock = inject(dustClockKey)
  if (!clock) throw new Error('Dust clock provider is missing')
  return clock
}
