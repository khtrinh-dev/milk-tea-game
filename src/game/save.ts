import { SAVE_VERSION } from './constants';
import type { GameState } from './types';

const GUEST_KEY = 'my-cay-gem/save';
/** Key của bản trước khi đổi tên repo – vẫn đọc để không mất tiến trình đã lưu trên máy. */
const LEGACY_KEY = 'milk-tea-game/save';

/** Một bản lưu: state + thời điểm lưu (ms, do UI cung cấp) để so bản trên máy với bản trên mây. */
export interface SaveFile {
  state: GameState;
  savedAt: number;
}

/** Mỗi tài khoản một ô lưu riêng trên máy; chế độ khách dùng key cũ để giữ save từ bản trước. */
export function saveKey(uid: string | null): string {
  return uid ? `${GUEST_KEY}/${uid}` : GUEST_KEY;
}

function legacySaveKey(uid: string | null): string {
  return uid ? `${LEGACY_KEY}/${uid}` : LEGACY_KEY;
}

/**
 * Đưa save phiên bản cũ lên phiên bản hiện tại. Trả về null nếu không chuyển được.
 * v1, v2 là cấu trúc save cũ không còn tương thích – không chuyển, người chơi mở quán mới.
 * v3 được bổ sung giá trị mặc định cho các field thêm sau.
 */
function migrate(data: GameState & { version: number }): GameState | null {
  if (data.version !== SAVE_VERSION) return null;
  // Field thêm sau khi v3 đã phát hành: lịch sử đánh giá, món + cấp cay của khách đang ăn / chờ đánh giá.
  const withOrder = <T extends { dishId?: string; spice?: number }>(x: T) => ({ ...x, dishId: x.dishId ?? 'kimchi', spice: x.spice ?? 0 });
  return {
    ...data,
    reviewLog: data.reviewLog ?? [],
    tables: data.tables.map((d) => d && withOrder(d)),
    tableQueue: data.tableQueue.map(withOrder),
    reviews: data.reviews.map(withOrder),
  };
}

/** Đọc chuỗi JSON (từ localStorage hoặc từ mây) thành SaveFile. Hỏng → null. */
export function parseSave(raw: string | null | undefined): SaveFile | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as Partial<SaveFile> & { version?: number };
    // Bản v1 lưu thẳng GameState, chưa có wrapper.
    const file: SaveFile = data.state ? (data as SaveFile) : { state: data as unknown as GameState, savedAt: 0 };
    const state = migrate(file.state);
    if (!state) return null;
    return { state: { ...state, events: [] }, savedAt: file.savedAt ?? 0 };
  } catch {
    return null;
  }
}

export function serializeSave(state: GameState, savedAt: number): string {
  // Không lưu events: chúng chỉ để UI hiện toast/âm thanh trong phiên hiện tại.
  return JSON.stringify({ state: { ...state, events: [] }, savedAt } satisfies SaveFile);
}

/** Đọc save trên máy. Không có, hỏng hoặc không chuyển được phiên bản → null. */
export function loadGame(uid: string | null = null): SaveFile | null {
  try {
    return parseSave(localStorage.getItem(saveKey(uid)) ?? localStorage.getItem(legacySaveKey(uid)));
  } catch {
    return null;
  }
}

export function saveGame(state: GameState, savedAt: number, uid: string | null = null): void {
  try {
    localStorage.setItem(saveKey(uid), serializeSave(state, savedAt));
  } catch {
    // Safari private mode hoặc hết dung lượng – bỏ qua, game vẫn chơi được.
  }
}

export function clearSave(uid: string | null = null): void {
  try {
    localStorage.removeItem(saveKey(uid));
  } catch {
    // bỏ qua
  }
}

/** Chọn bản mới hơn giữa save trên máy và trên mây. */
export function newerSave(a: SaveFile | null, b: SaveFile | null): SaveFile | null {
  if (!a) return b;
  if (!b) return a;
  return b.savedAt > a.savedAt ? b : a;
}
