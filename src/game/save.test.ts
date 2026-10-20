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

  it('save v3 cũ chưa có lịch sử đánh giá vẫn đọc được', () => {
    const current = createInitialState(1, SHOP);
    const { reviewLog: _log, ...old } = current;
    const file = parseSave(JSON.stringify({ state: old, savedAt: 1 }));
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
