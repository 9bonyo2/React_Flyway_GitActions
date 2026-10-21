// Vite 설정
// - 개발 서버(npm run dev)에서 /api 로 시작하는 요청을 Spring Boot 로 전달 (프록시)
//   브라우저 → http://localhost:5173/api/memos → (Vite) → http://localhost:8080/memos
// - 브라우저 입장에서는 같은 주소(5173)로 요청하므로 CORS 설정이 필요 없음
//   (08-3 Spring Boot 앱에는 CORS 설정이 없음)
// - 백엔드 주소는 .env.development 의 VITE_API_TARGET 으로 바꿀 수 있음
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  // .env.development 등에서 VITE_ 로 시작하는 값 읽기
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target,
          changeOrigin: true,
          // /api/memos → /memos (Spring Boot 경로에는 /api 가 없음)
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
      },
    },
  }
})
