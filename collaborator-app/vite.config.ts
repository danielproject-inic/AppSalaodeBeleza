import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@hooks': path.resolve(__dirname, '../hooks')
    }
  },
  server: {
    host: true, // escuta em todas as conexões de rede local
    port: 5174
  }
})
