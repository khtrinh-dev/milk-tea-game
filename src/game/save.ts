import { SAVE_VERSION } from './constants';
import type { GameState } from './types';

const KEY = 'milk-tea-game/save';

/** Đọc save từ localStorage. Trả về null nếu không có, hỏng hoặc khác phiên bản. */
export function loadGame(): GameState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as GameState;
    if (data.version !== SAVE_VERSION) return null;
    return { ...data, events: [] };
  } catch {
    return null;
  }
}

export function saveGame(state: GameState): void {
  try {
    // Không lưu events: chúng chỉ để UI hiện toast/âm thanh trong phiên hiện tại.
    localStorage.setItem(KEY, JSON.stringify({ ...state, events: [] }));
  } catch {
    // Safari private mode hoặc hết dung lượng – bỏ qua, game vẫn chơi được.
  }
}

export function clearSave(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // bỏ qua
  }
}
