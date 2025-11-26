import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server:{
    host:'0.0.0.0',
    port:8080,
    open:true,
    proxy:{
      '/api':{
        target:'http://localhost:4000',
        changeOrigin:true,
        // 不要重写路径，保持 /api 前缀
      },
      '/copilotkit':{
        target:'http://localhost:4000',
        changeOrigin:true,
        ws: true, // 支持 WebSocket/SSE
      },
    },
  }
})
