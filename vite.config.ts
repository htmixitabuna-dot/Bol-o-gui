import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { BOLAO_ELITE_ICON_DATA_URL } from './src/pwaIconDataUrl'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const rawUrl =
    env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://slaqxbccectdgmlokjos.supabase.co'
  const normalizedHost = rawUrl
    .replace(/slaq[a-z]*lokjos\.supabase\.co/i, 'slaqxbccectdgmlokjos.supabase.co')
    .replace(/\/rest\/v1\/?.*$/i, '')
    .replace(/\/+$/, '')
    .trim()
  const supabaseUrl = /^https?:\/\//i.test(normalizedHost) ? normalizedHost : `https://${normalizedHost}`
  const rawAnonKey = (
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y'
  ).trim()
  const supabaseAnonKey = rawAnonKey.startsWith('sb_secret_')
    ? 'sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y'
    : rawAnonKey || 'sb_publishable_Tqbx1xWWObM_PYo9A8Lwzg_HP4Q5M1Y'
  const supabaseSecretKey =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'sb_secret_eoy7344Q4e7XqhFDPf5ayg_DI1D2iT2'

  return {
    envPrefix: ['NEXT_PUBLIC_', 'SUPABASE_'],
    define: {
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'process.env.SUPABASE_REST_URL': JSON.stringify(`${supabaseUrl}/rest/v1/`),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(supabaseSecretKey),
    },
    plugins: [
      react(),
      VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'apple-touch-icon.png',
        'apple-touch-icon-precomposed.png',
        'apple-touch-icon-180x180.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'pwa-maskable-512x512.png',
      ],
      manifest: {
        id: '/',
        name: 'Bolões Elite - Palpites Esportivos',
        short_name: 'Bolões Elite',
        description: 'Plataforma de bolões esportivos recreativos com palpites, ranking em tempo real e premiações via PIX.',
        theme_color: '#0A0A0A',
        background_color: '#0A0A0A',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: BOLAO_ELITE_ICON_DATA_URL,
            sizes: '180x180',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-192x192.png?v=5',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png?v=5',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-maskable-512x512.png?v=5',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/site\.api\.espn\.com\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  }
})


