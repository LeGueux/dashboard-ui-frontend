<script setup lang="ts">
const colorMode = useColorMode()
// La veille utilise un thème clair constant pour comparer les stations.
colorMode.preference = 'light'

const color = computed(() => colorMode.value === 'dark' ? '#1b1718' : 'white')

useHead({
  meta: [
    { charset: 'utf-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1' },
    { key: 'theme-color', name: 'theme-color', content: color }
  ],
  link: [
    { rel: 'icon', href: '/favicon.ico' }
  ],
  htmlAttrs: {
    lang: 'fr'
  }
})

const title = 'Dust — Veille météo & marchés'
const description = 'Suivez la météo, les prévisions et les marchés de températures Polymarket. Comparez les villes, les relevés et les carnets d’ordres.'
const siteUrl = 'https://dust-dashboard.vercel.app'
const socialImage = `${siteUrl}/social/dust-weather-markets-v1.png`
const route = useRoute()

useSeoMeta({
  title,
  description,
  ogTitle: title,
  ogDescription: description,
  ogType: 'website',
  ogSiteName: 'Dust',
  ogLocale: 'fr_FR',
  ogUrl: () => `${siteUrl}${route.path}`,
  ogImage: socialImage,
  ogImageType: 'image/png',
  ogImageWidth: 1731,
  ogImageHeight: 909,
  ogImageAlt: 'Dust, veille météo et marchés : villes, observations et prévisions de températures.',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: socialImage,
  twitterImageAlt: 'Dust — Veille météo & marchés',
  twitterCard: 'summary_large_image'
})
</script>

<template>
  <UApp>
    <NuxtLoadingIndicator />

    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
