import { describe, expect, it } from 'vitest';
import { SAVE_VERSION } from './constants';
import { newerSave, parseSave, saveKey, serializeSave } from './save';
import { createInitialState } from './state';

const SHOP = { name: 'Quán Test', theme: 'ink' } as const;

describe('save', () => {
  it('ghi rồi đọc lại giữ nguyên state, bỏ events', () => {
    const state = { ...createInitialState(1, SHOP), money: 123_000 };
    state.events = [{ id: 1, type: 'info', text: 'x' }];
    const file = parseSave(serializeSave(state, 999));
    expect(file?.savedAt).toBe(999);
    expect(file?.state.money).toBe(123_000);
    expect(file?.state.shop).toEqual(SHOP);
    expect(file?.state.events).toEqual([]);
  });

  it('bỏ qua save phiên bản cũ (v1 chưa có wrapper, v2) để mở quán mì cay mới', () => {
    const current = createInitialState(1, SHOP);
    expect(parseSave(JSON.stringify({ ...current, version: 1 }))).toBeNull();
    expect(parseSave(serializeSave({ ...current, version: 2 }, 5))).toBeNull();
    expect(parseSave(serializeSave(current, 5))?.state.version).toBe(SAVE_VERSION);
  });

  it('save v3 (trước nhóm bạn) được chuyển lên: giữ tiền, kho, đánh giá; ngày đang mở dở thì mở cửa lại', () => {
    const { selectedGuestId: _sel, ...current } = { ...createInitialState(1, SHOP), money: 777_000, day: 4, phase: 'open' as const, dayTimeMs: 50_000 };
    const { pepsi: _p, fanta: _f, sevenup: _s, ...inventory } = { ...current.inventory, beef: 3 };
    const look = { archetype: 'dev', skin: 0, hair: 0 };
    const v3 = {
      ...current,
      version: 3,
      inventory,
      customers: [{ id: 5, name: 'Minh', look, order: {}, patienceMs: 1, waitedMs: 0, takenBy: 0 }],
      tables: [{ id: 6, name: 'An', look, dishId: 'beef', spice: 2, reaction: 'delicious', feedback: 'x', paid: 1, tip: 0, eatMs: 1 }, ...current.tables.slice(1)],
      tableQueue: [{ id: 7 }],
      cooks: [{ customerId: 5, progressMs: 100 }],
      reviewLog: [
        { id: 6, day: 3, name: 'An', look, service: 'dine-in', reaction: 'delicious', feedback: 'Ngon', stars: 5 },
        { id: 6, day: 3, name: 'An', look, service: 'dine-in', dishId: 'beef', spice: 2, reaction: 'bad', feedback: 'Dở', stars: 1 },
      ],
    };
    const state = parseSave(JSON.stringify({ state: v3, savedAt: 1 }))!.state;
    expect(state.version).toBe(SAVE_VERSION);
    expect(state).toMatchObject({ money: 777_000, day: 4, phase: 'prep', dayTimeMs: 0, dirt: [], customers: [], tableQueue: [], selectedGuestId: null });
    expect(state.tables.every((t) => t === null)).toBe(true);
    expect(state.cooks).toEqual([{ guestId: null, progressMs: 0 }]);
    expect(state.inventory).toMatchObject({ beef: 3, pepsi: 10, fanta: 10, sevenup: 10 });
    expect(state.reviewLog.map((r) => r.partySize)).toEqual([1, 1]);
    expect(state.reviewLog[0].dishId).toBe('kimchi');
    expect(new Set(state.reviewLog.map((r) => r.id)).size).toBe(2);
  });

  it('save v3 cũ chưa có lịch sử đánh giá vẫn đọc được', () => {
    const { reviewLog: _log, selectedGuestId: _sel, ...old } = createInitialState(1, SHOP);
    const file = parseSave(JSON.stringify({ state: { ...old, version: 3 }, savedAt: 1 }));
    expect(file?.state.reviewLog).toEqual([]);
  });

  it('bỏ qua save hỏng hoặc phiên bản lạ', () => {
    expect(parseSave('{oops')).toBeNull();
    expect(parseSave(JSON.stringify({ version: 99 }))).toBeNull();
    expect(parseSave(null)).toBeNull();
  });

  it('chọn bản lưu mới hơn', () => {
    const a = { state: createInitialState(1, SHOP), savedAt: 10 };
    const b = { state: createInitialState(2, SHOP), savedAt: 20 };
    expect(newerSave(a, b)).toBe(b);
    expect(newerSave(b, a)).toBe(b);
    expect(newerSave(null, a)).toBe(a);
    expect(newerSave(a, null)).toBe(a);
  });

  it('mỗi tài khoản một ô lưu, khách dùng key cũ', () => {
    expect(saveKey(null)).toBe('my-cay-gem/save');
    expect(saveKey('abc')).toBe('my-cay-gem/save/abc');
  });
});
