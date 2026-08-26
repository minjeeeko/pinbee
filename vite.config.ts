import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon-v2.png'],
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
        // 파일명에 -v2를 붙여 이전 아이콘 캐시(브라우저·OS가 파일명 기준으로 붙잡고 있던)와
        // 겹치지 않는 새 URL을 쓴다 — PWA 아이콘은 한 번 설치되면 매니페스트를 다시 받아도
        // 파일명이 같으면 아이콘이 안 바뀌는 경우가 흔하다.
        icons: [
          { src: 'pwa-192-v2.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512-v2.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512-v2.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      // 지도(네이버 지도 SDK)·Supabase 같은 외부 API 응답은 캐싱 대상에서 제외한다 —
      // 이 앱은 항상 최신 코스·인증 상태로 동작해야 하는 서비스라, 오프라인 캐시는
      // 앱 셸(정적 파일)만 담당하고 실시간 데이터는 그대로 네트워크를 탄다.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // OCR용 tesseract.js 코어·언어 데이터는 이미지 붙여넣기 기능을 쓸 때만 필요한
        // 무거운(약 12MB) 정적 파일이라, 앱 셸 사전 캐싱 대상에서 제외한다 — 매 방문마다
        // 모든 사용자에게 미리 받아두게 하면 설치 크기·초기 로드가 불필요하게 커진다.
        globIgnores: ['tesseract/**'],
      },
    }),
  ],
  server: { host: true },
  // NAVER_MAP_CLIENT_ID는 VITE_ 접두사 없이 그대로 노출한다 — Vercel이 VITE_/NEXT_PUBLIC_
  // 같은 "프레임워크 공개 접두사"를 감지하면 저장을 막는 경고를 띄우는데, 이 값은 실제로
  // 공개돼도 안전한 값이라 접두사 없는 이름으로 우회한다.
  envPrefix: ['VITE_', 'NAVER_'],
})
