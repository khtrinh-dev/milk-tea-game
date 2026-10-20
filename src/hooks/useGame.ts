import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { saveGame } from '../game/save';
import { gameReducer } from '../game/state';
import type { GameState } from '../game/types';
import { writeCloudSave, type Player } from '../services/cloud';

const TICK_MS = 100;
/** Giới hạn dt mỗi tick để tab bị treo lâu không làm game "nhảy cóc". */
const MAX_DT = 250;
/** Lưu bản sao trên máy (cache offline). */
const SAVE_EVERY_MS = 2_000;
/** Ghi vào database định kỳ khi có thay đổi; mốc quan trọng (mở cửa, hết ngày…) thì ghi ngay. */
const CLOUD_SAVE_EVERY_MS = 10_000;

export type SyncStatus =
  | { kind: 'off' }
  | { kind: 'saving'; lastSavedAt: number | null }
  | { kind: 'saved'; lastSavedAt: number }
  | { kind: 'error'; lastSavedAt: number | null };

/** Mốc cần ghi database ngay: đổi giai đoạn trong ngày hoặc sang ngày mới. */
function milestone(s: GameState): string {
  return `${s.day}-${s.phase}`;
}

/**
 * Giữ GameState, chạy vòng lặp tick và tự lưu: bản sao trên máy + database Firestore của người chơi.
 * `paused` = true khi đang mở modal hoặc người chơi bấm tạm dừng.
 * Trả về thêm `sync` (trạng thái lưu database) và `flush()` để ghi ngay (vd. trước khi đăng xuất).
 */
export function useGame(initialState: GameState, player: Player | null, paused: boolean) {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const uid = player?.uid ?? null;
  const playerRef = useRef(player);
  useEffect(() => {
    playerRef.current = player;
  }, [player]);

  const [sync, setSync] = useState<SyncStatus>(uid ? { kind: 'saving', lastSavedAt: null } : { kind: 'off' });
  const lastCloudState = useRef<GameState | null>(null);
  const lastSavedAt = useRef<number | null>(null);

  /** Ghi state hiện tại vào database (bỏ qua nếu không đổi gì từ lần ghi trước). */
  const pushCloud = useCallback(async () => {
    const p = playerRef.current;
    const current = stateRef.current;
    if (!p || current === lastCloudState.current) return;
    lastCloudState.current = current;
    setSync({ kind: 'saving', lastSavedAt: lastSavedAt.current });
    try {
      await writeCloudSave(p, current, Date.now());
      lastSavedAt.current = Date.now();
      setSync({ kind: 'saved', lastSavedAt: lastSavedAt.current });
    } catch {
      // Lần sau sẽ thử lại vì state chưa được đánh dấu là đã lưu.
      lastCloudState.current = null;
      setSync({ kind: 'error', lastSavedAt: lastSavedAt.current });
    }
  }, []);

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
    const saveLocal = () => saveGame(stateRef.current, Date.now(), uid);
    const flushAll = () => {
      saveLocal();
      void pushCloud();
    };
    // Lưu ngay khi vào quán (quán mới tạo / save mới nhất được ghi vào database luôn).
    flushAll();
    const local = window.setInterval(saveLocal, SAVE_EVERY_MS);
    const cloud = window.setInterval(() => void pushCloud(), CLOUD_SAVE_EVERY_MS);
    const onHide = () => {
      if (document.visibilityState === 'hidden') flushAll();
    };
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', flushAll);
    return () => {
      window.clearInterval(local);
      window.clearInterval(cloud);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', flushAll);
      flushAll();
    };
  }, [uid, pushCloud]);

  // Mốc quan trọng (mở cửa, hết giờ, tổng kết, sang ngày) → ghi database ngay.
  const mark = milestone(state);
  useEffect(() => {
    void pushCloud();
  }, [mark, pushCloud]);

  const flush = useCallback(async () => {
    saveGame(stateRef.current, Date.now(), uid);
    await pushCloud();
  }, [uid, pushCloud]);

  return [state, dispatch, sync, flush] as const;
}
