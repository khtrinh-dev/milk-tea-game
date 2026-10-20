import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/baloo-2/vietnamese-500.css';
import '@fontsource/baloo-2/vietnamese-700.css';
import '@fontsource/baloo-2/latin-500.css';
import '@fontsource/baloo-2/latin-700.css';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles/global.css';

registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return;
    // iOS thường chỉ "đánh thức" PWA từ nền chứ không tải lại trang, nên service worker không tự kiểm tra
    // bản mới. Kiểm tra mỗi lần app hiện lại để bản deploy mới tới máy ngay lần mở kế tiếp.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update().catch(() => {});
    });
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
