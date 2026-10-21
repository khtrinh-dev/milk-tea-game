import { FIRST_CUSTOMER_DELAY_MS, SAVE_VERSION } from './constants';
import { INGREDIENT_IDS, INGREDIENTS } from './data/ingredients';
import type { GameState, ReviewEntry } from './types';

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

/** Save v3: khách ở quầy là 1 người, bàn chỉ có khách lẻ, chưa có Pepsi/Fanta/7Up. */
interface SaveV3 extends Omit<GameState, 'customers' | 'tables' | 'tableQueue' | 'cooks' | 'reviewLog' | 'selectedGuestId'> {
  tables: unknown[];
  cooks: unknown[];
  reviewLog?: (Omit<ReviewEntry, 'partySize' | 'dishId' | 'spice'> & { dishId?: string; spice?: number })[];
}

/**
 * v3 → v4 (thêm nhóm bạn, nước ngọt): giữ tiền, doanh thu, danh tiếng, kho, nhân viên, lịch sử đánh giá.
 * Khách đang ở quầy / đang ăn theo cấu trúc cũ thì bỏ; ngày đang mở dở quay về lúc vừa dọn xong quán (mở cửa lại ngay).
 */
function migrateV3(data: SaveV3): GameState {
  const inventory = { ...data.inventory };
  // Nước mới thêm: tặng 1 gói như lúc mở quán.
  for (const id of INGREDIENT_IDS) inventory[id] ??= INGREDIENTS[id].packSize;
  const midDay = data.phase === 'open' || data.phase === 'closing';
  return {
    ...data,
    version: SAVE_VERSION,
    inventory,
    customers: [],
    selectedCustomerId: null,
    selectedGuestId: null,
    tables: data.tables.map(() => null),
    tableQueue: [],
    reviews: [],
    cooks: data.cooks.map(() => ({ guestId: null, progressMs: 0 })),
    phase: midDay ? 'prep' : data.phase,
    dayTimeMs: midDay ? 0 : data.dayTimeMs,
    dirt: midDay ? [] : data.dirt,
    nextCustomerInMs: FIRST_CUSTOMER_DELAY_MS,
    // Id đánh giá cũ là id khách (có thể trùng nhau) – đánh lại bằng số âm để không đụng id mới.
    reviewLog: (data.reviewLog ?? []).map((r, i) => ({ ...r, id: -(i + 1), dishId: r.dishId ?? 'kimchi', spice: r.spice ?? 0, partySize: 1 })),
  };
}

/**
 * Đưa save phiên bản cũ lên phiên bản hiện tại. Trả về null nếu không chuyển được.
 * v1, v2 là cấu trúc save cũ không còn tương thích – không chuyển, người chơi mở quán mới.
 */
function migrate(data: { version: number }): GameState | null {
  if (data.version === 3) return migrateV3(data as SaveV3);
  if (data.version !== SAVE_VERSION) return null;
  return data as GameState;
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
