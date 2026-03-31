import { fileURLToPath, URL } from 'node:url'

import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
// import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/', //process.env.NODE_ENV === 'production' ? '/fcim/' : '/', //'/fcim/', //
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5500,
    host: '0.0.0.0',
    cors: true,
    proxy: {
      '/mobile': {
        target: loadEnv('development', './').VITE_APP_DEV_WEB_URL,
        changeOrigin: true,
      },
    },
  },
})
