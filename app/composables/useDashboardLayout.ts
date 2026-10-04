export const dashboardLayouts = [
  { value: 'weather', label: 'Veille météo', description: 'Vue globale par ville' },
  { value: 'comparatif', label: 'Comparatif', description: 'Comparer les villes côte à côte' },
  { value: 'dossiers', label: 'Dossiers', description: 'Lire une ville en détail' },
  { value: 'parcours', label: 'Parcours', description: 'Météo puis marchés' }
] as const

export type DashboardLayout = typeof dashboardLayouts[number]['value']

export function useDashboardLayout() {
  const savedLayout = useCookie<string>('dust-layout', {
    default: () => 'weather',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
    path: '/'
  })
  // L'état partagé conserve le choix entre les pages ; le cookie permet le même rendu en SSR.
  const currentLayout = useState<DashboardLayout>('dust-layout', () =>
    dashboardLayouts.find(option => option.value === savedLayout.value)?.value ?? 'weather'
  )
  const dashboardLayout = computed({
    get: () => currentLayout.value,
    set: (value: DashboardLayout) => {
      if (!dashboardLayouts.some(option => option.value === value)) return
      currentLayout.value = value
      savedLayout.value = value
    }
  })

  return { dashboardLayout, dashboardLayouts }
}
