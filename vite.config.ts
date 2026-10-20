/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// GitHub Pages phục vụ game tại https://<user>.github.io/milk-tea-game/
// nên base phải khớp tên repo. Đổi biến môi trường BASE_PATH nếu deploy chỗ khác.
const base = process.env.BASE_PATH ?? '/milk-tea-game/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Trà Sữa Tycoon',
        short_name: 'Trà Sữa',
        description: 'Game giả lập mở quán trà sữa',
        lang: 'vi',
        theme_color: '#7a4a2b',
        background_color: '#fdf3e4',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});
