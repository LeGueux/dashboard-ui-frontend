// https://nuxt.com/docs/api/configuration/nuxt-config
import pkg from './package.json'

export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    '@vueuse/nuxt'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    public: {
      ingestBackendUrl: '',
      appVersion: pkg.version
    }
  },

  buildDir: '.nuxt',

  routeRules: {
    '/api/**': {
      cors: true
    }
  },
  devServer: { port: 3005 },

  compatibilityDate: '2024-07-11',
  vite: {
    cacheDir: '.nuxt/vite-cache'
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
