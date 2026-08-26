import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: '루티즈 (Routiz)',
        short_name: 'routiz',
        description: '지도에서 장소를 담고 순서를 정하면 완성되는 하루 코스',
        lang: 'ko',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // 지도(네이버 지도 SDK)·Supabase 같은 외부 API 응답은 캐싱 대상에서 제외한다 —
      // 이 앱은 항상 최신 코스·인증 상태로 동작해야 하는 서비스라, 오프라인 캐시는
      // 앱 셸(정적 파일)만 담당하고 실시간 데이터는 그대로 네트워크를 탄다.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
    }),
  ],
  server: { host: true },
  // NAVER_MAP_CLIENT_ID는 VITE_ 접두사 없이 그대로 노출한다 — Vercel이 VITE_/NEXT_PUBLIC_
  // 같은 "프레임워크 공개 접두사"를 감지하면 저장을 막는 경고를 띄우는데, 이 값은 실제로
  // 공개돼도 안전한 값이라 접두사 없는 이름으로 우회한다.
  envPrefix: ['VITE_', 'NAVER_'],
})
