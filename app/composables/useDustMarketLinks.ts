import type { DropdownMenuItem } from '@nuxt/ui'
import type { MarketLink } from '~/types/dust'

export function useDustMarketLinks() {
  const toast = useToast()

  async function copyLinkToClipboard(link: MarketLink) {
    try {
      await navigator.clipboard.writeText(link.url)
      toast.add({
        title: 'Lien copie',
        description: `${link.label} ajoute au presse-papiers.`
      })
    } catch {
      toast.add({
        title: 'Copie impossible',
        description: 'Le navigateur a bloque l\'acces au presse-papiers.',
        color: 'error'
      })
    }
  }

  function buildLinkMenuItems(links: MarketLink[]): DropdownMenuItem[] {
    if (!links.length) {
      return [{
        label: 'Aucun lien disponible'
      }]
    }

    const sorted = [...links].sort((a, b) => a.label.localeCompare(b.label))

    return sorted.map(link => ({
      label: link.label,
      icon: link.source === 'betmoar' ? 'i-lucide-chart-line' : link.source === 'polymarket' ? 'i-lucide-store' : 'i-lucide-cloud',
      children: [{
        label: 'Ouvrir dans un nouvel onglet',
        icon: 'i-lucide-external-link',
        href: link.url,
        target: '_blank',
        rel: 'noopener noreferrer'
      }, {
        label: 'Copier le lien',
        icon: 'i-lucide-copy',
        onSelect() {
          void copyLinkToClipboard(link)
        }
      }],
      trailingIcon: 'i-lucide-chevron-right'
    }))
  }

  return { buildLinkMenuItems }
}
