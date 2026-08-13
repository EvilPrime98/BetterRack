import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const root = import.meta.dirname

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
  },
  resolve: {
    alias: {
      '@': path.resolve(root, './src'),
      '@/hooks': path.resolve(root, './src/hooks'),
      '@/icons': path.resolve(root, './src/icons'),
      '@/components': path.resolve(root, './src/components'),
      '@/pages': path.resolve(root, './src/pages'),
      '@/context': path.resolve(root, './src/context'),
      '@/stores': path.resolve(root, './src/stores'),
      '@/services': path.resolve(root, './src/services'),
    },
  },
})
