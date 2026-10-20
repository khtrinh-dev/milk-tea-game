import { useEffect, useReducer, useRef } from 'react';
import { loadGame, saveGame } from '../game/save';
import { createInitialState, gameReducer } from '../game/state';

const TICK_MS = 100;
/** Giới hạn dt mỗi tick để tab bị treo lâu không làm game "nhảy cóc". */
const MAX_DT = 250;
const SAVE_EVERY_MS = 2_000;

function init() {
  return loadGame() ?? createInitialState(Date.now());
}

/**
 * Giữ GameState, chạy vòng lặp tick và tự lưu.
 * `paused` = true khi đang mở modal hoặc người chơi bấm tạm dừng.
 */
export function useGame(paused: boolean) {
  const [state, dispatch] = useReducer(gameReducer, undefined, init);
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
    const save = () => saveGame(stateRef.current);
    const id = window.setInterval(save, SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') save();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', save);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', save);
    };
  }, []);

  return [state, dispatch] as const;
}
