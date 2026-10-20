import { useEffect, useReducer, useRef } from 'react';
import { saveGame } from '../game/save';
import { gameReducer } from '../game/state';
import type { GameState } from '../game/types';
import { writeCloudSave } from '../services/cloud';

const TICK_MS = 100;
/** Giới hạn dt mỗi tick để tab bị treo lâu không làm game "nhảy cóc". */
const MAX_DT = 250;
const SAVE_EVERY_MS = 2_000;
/** Lưu lên mây thưa hơn để không tốn lượt ghi Firestore. */
const CLOUD_SAVE_EVERY_MS = 20_000;

/**
 * Giữ GameState, chạy vòng lặp tick và tự lưu (trên máy + lên mây nếu đã đăng nhập).
 * `paused` = true khi đang mở modal hoặc người chơi bấm tạm dừng.
 */
export function useGame(initialState: GameState, uid: string | null, paused: boolean) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Vòng lặp game: dùng setInterval + đo thời gian thực để không phụ thuộc FPS.
  useEffect(() => {
    if (paused) return;
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const dt = Math.min(MAX_DT, now - last);
      last = now;
      if (document.visibilityState === 'visible') dispatch({ type: 'TICK', dt });
    }, TICK_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  // Tự lưu định kỳ và khi ứng dụng bị ẩn (iOS có thể kill PWA bất cứ lúc nào).
  useEffect(() => {
    let lastCloudAt = 0;
    let lastCloudState: GameState | null = null;
    const save = (flush: boolean) => {
      const now = Date.now();
      saveGame(stateRef.current, now, uid);
      if (!uid || stateRef.current === lastCloudState) return;
      if (flush || now - lastCloudAt >= CLOUD_SAVE_EVERY_MS) {
        writeCloudSave(uid, stateRef.current, now);
        lastCloudAt = now;
        lastCloudState = stateRef.current;
      }
    };
    // Lưu ngay khi vào quán (quán mới tạo / save mới nhất được đẩy lên mây luôn).
    save(true);
    const id = window.setInterval(() => save(false), SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') save(true);
    };
    const onPageHide = () => save(true);
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      save(true);
    };
  }, [uid]);

  return [state, dispatch] as const;
}
