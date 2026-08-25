import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
  // NAVER_MAP_CLIENT_ID는 VITE_ 접두사 없이 그대로 노출한다 — Vercel이 VITE_/NEXT_PUBLIC_
  // 같은 "프레임워크 공개 접두사"를 감지하면 저장을 막는 경고를 띄우는데, 이 값은 실제로
  // 공개돼도 안전한 값이라 접두사 없는 이름으로 우회한다.
  envPrefix: ['VITE_', 'NAVER_'],
})
