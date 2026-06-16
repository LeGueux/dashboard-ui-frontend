// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      ingestBackendUrl: '',
      appVersion: pkg.version
    }
  },

  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/api/**': {
      cors: true
    }
  },

  compatibilityDate: '2024-07-11',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
