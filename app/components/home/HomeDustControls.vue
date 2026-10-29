<script setup lang="ts">
const hideOnly999Asks = defineModel<boolean>({ required: true })
const hideFahrenheit = defineModel<boolean>('hideFahrenheit', { required: true })

const cInput = ref('')
const fInput = ref('')

const fFromC = computed(() => {
  const raw = String(cInput.value ?? '').trim()
  if (!raw) return ''
  const c = Number(raw)
  if (!Number.isFinite(c)) return ''
  return ((c * 9) / 5 + 32).toFixed(1)
})

const cFromF = computed(() => {
  const raw = String(fInput.value ?? '').trim()
  if (!raw) return ''
  const f = Number(raw)
  if (!Number.isFinite(f)) return ''
  return (((f - 32) * 5) / 9).toFixed(1)
})
</script>

<template>
  <div class="board-controls">
    <div class="flex flex-col gap-2 border-b border-slate-200 pb-2">
      <div class="flex flex-wrap items-center gap-1.5 text-xs">
        <span class="mr-1 inline-flex items-center gap-1 font-semibold text-slate-600">
          <UIcon name="i-lucide-list-filter" class="size-3.5" />
          Marchés
        </span>
        <UButton
          size="xs"
          :color="!hideOnly999Asks && !hideFahrenheit ? 'primary' : 'neutral'"
          :variant="!hideOnly999Asks && !hideFahrenheit ? 'solid' : 'soft'"
          title="Affiche tous les marchés disponibles, sans filtre."
          aria-label="Filtre Tous: affiche tous les marchés"
          :aria-pressed="!hideOnly999Asks && !hideFahrenheit"
          @click="hideOnly999Asks = false; hideFahrenheit = false"
        >
          Tous
        </UButton>
        <UButton
          size="xs"
          :color="hideOnly999Asks ? 'error' : 'neutral'"
          :variant="hideOnly999Asks ? 'solid' : 'soft'"
          title="Masque les températures dont tous les asks disponibles sont à 99.9 cents."
          :aria-pressed="hideOnly999Asks"
          aria-label="Masquer les températures avec uniquement des asks à 99.9 cents"
          @click="hideOnly999Asks = !hideOnly999Asks"
        >
          Masquer les asks à 99,9¢
        </UButton>
        <UButton
          size="xs"
          :color="hideFahrenheit ? 'primary' : 'neutral'"
          :variant="hideFahrenheit ? 'solid' : 'soft'"
          title="Masque les villes dont les marchés utilisent les degrés Fahrenheit. Choix mémorisé sur cet appareil."
          :aria-pressed="hideFahrenheit"
          @click="hideFahrenheit = !hideFahrenheit"
        >
          Masquer les villes en °F
        </UButton>
      </div>

      <details class="group mt-2 rounded-sm border border-slate-200 bg-slate-50">
        <summary class="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs text-slate-700">
          <span class="inline-flex items-center gap-1">
            <UIcon name="i-lucide-sliders-horizontal" class="size-3.5" />
            Aide & outils
          </span>
          <UIcon name="i-lucide-chevron-down" class="size-4 transition-transform group-open:rotate-180" />
        </summary>

        <div class="border-t border-slate-200 p-3 text-xs text-slate-600">
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
            <div class="rounded-md border border-slate-200 bg-slate-50 p-2.5">
              <p class="font-semibold text-slate-700">
                Affichage
              </p>
              <div class="mt-2 space-y-1">
                <p class="text-slate-600">
                  <span class="rounded bg-primary/15 px-1 py-0.5 text-primary">Tous</span>:
                  affiche tous les marchés sans filtre.
                </p>
                <p class="text-slate-600">
                  <span class="rounded bg-rose-400/15 px-1 py-0.5 text-rose-700">Masquer les asks à 99,9¢</span>:
                  masque les marchés dont tous les asks sont à 99.9¢.
                </p>
                <p class="text-slate-600">
                  <span class="rounded bg-primary/15 px-1 py-0.5 text-primary">Masquer les villes en °F</span>:
                  masque les villes dont les marchés sont en Fahrenheit. Ce choix est mémorisé sur cet appareil et peut se combiner avec le filtre des asks.
                </p>
                <p class="text-slate-600">
                  <span
                    class="rounded bg-violet-400/15 px-1 py-0.5 text-violet-700"
                  >Tri</span>: Yes/No, puis temps
                  restant avant minuit, puis meilleur ask.
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <div class="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <p class="mb-1 text-slate-700">
                  °C → °F
                </p>
                <UInput
                  v-model="cInput"
                  size="xs"
                  type="number"
                  placeholder="°C"
                />
                <p class="mt-1 text-slate-500">
                  Résultat: <span class="font-semibold text-slate-900">{{ fFromC ? `${fFromC}
                      °F` : '—' }}</span>
                </p>
              </div>

              <div class="rounded-md border border-slate-200 bg-slate-50 p-2.5">
                <p class="mb-1 text-slate-700">
                  °F → °C
                </p>
                <UInput
                  v-model="fInput"
                  size="xs"
                  type="number"
                  placeholder="°F"
                />
                <p class="mt-1 text-slate-500">
                  Résultat: <span class="font-semibold text-slate-900">{{ cFromF ? `${cFromF}
                      °C` : '—' }}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
