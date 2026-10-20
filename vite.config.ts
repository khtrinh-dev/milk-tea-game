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
        name: 'Mì Cay Tycoon',
        short_name: 'Mì Cay',
        description: 'Game giả lập mở quán mì cay',
        lang: 'vi',
        theme_color: '#e0241b',
        background_color: '#1b1b1b',
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
