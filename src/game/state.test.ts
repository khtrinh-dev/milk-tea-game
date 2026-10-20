import { describe, expect, it } from 'vitest';
import { DAY_LENGTH_MS, STAFF_UNLOCK_REVENUE, STARTING_MONEY } from './constants';
import { INGREDIENTS } from './data/ingredients';
import { requiredRecipe } from './orders';
import { createInitialState, gameReducer, type GameAction } from './state';
import type { GameState, IngredientId } from './types';

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function tickUntil(state: GameState, pred: (s: GameState) => boolean, max = 10_000): GameState {
  let s = state;
  for (let i = 0; i < max && !pred(s); i++) s = gameReducer(s, { type: 'TICK', dt: 100 });
  return s;
}

/** Pha đúng ly cho khách đang được chọn. */
function makeCorrectCup(state: GameState): GameState {
  const c = state.customers.find((x) => x.id === state.selectedCustomerId)!;
  const actions: GameAction[] = [];
  for (const [id, n] of Object.entries(requiredRecipe(c.order)) as [IngredientId, number][]) {
    for (let i = 0; i < n; i++) actions.push({ type: 'ADD_INGREDIENT', id });
  }
  actions.push({ type: 'SET_ICE', ice: c.order.ice }, { type: 'SET_SUGAR', sugar: c.order.sugar });
  return run(state, ...actions);
}

/** State đã đủ doanh thu thuê nhân viên và kho đầy mọi nguyên liệu. */
function richState(seed: number): GameState {
  const s = createInitialState(seed);
  const inventory = { ...s.inventory };
  for (const id of Object.keys(inventory) as IngredientId[]) inventory[id] = 40;
  return { ...s, totalRevenue: STAFF_UNLOCK_REVENUE, inventory };
}

describe('gameReducer', () => {
  it('khởi tạo với vốn và nguyên liệu ban đầu', () => {
    const s = createInitialState(1);
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.inventory.cup).toBe(INGREDIENTS.cup.packSize);
    expect(s.inventory.matcha).toBeGreaterThan(0);
    expect(s.inventory.flan).toBe(0);
  });

  it('không làm thay đổi state cũ', () => {
    const s = createInitialState(1);
    const snapshot = JSON.stringify(s);
    run(s, { type: 'ADD_INGREDIENT', id: 'matcha' }, { type: 'TICK', dt: 5000 });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('khách đến, có thông báo đơn và được tự chọn', () => {
    const s = tickUntil(createInitialState(7), (x) => x.customers.length > 0);
    expect(s.customers).toHaveLength(1);
    expect(s.selectedCustomerId).toBe(s.customers[0].id);
    expect(s.events.some((e) => e.type === 'new-order')).toBe(true);
  });

  it('giao đúng món: nhận tiền, tăng doanh thu, khách rời đi', () => {
    let s = tickUntil(createInitialState(7), (x) => x.customers.length > 0);
    const price = s.customers[0].order.price;
    s = makeCorrectCup(s);
    s = run(s, { type: 'SERVE' });
    expect(s.customers).toHaveLength(0);
    expect(s.money).toBeGreaterThanOrEqual(STARTING_MONEY + price);
    expect(s.totalRevenue).toBeGreaterThanOrEqual(price);
    expect(s.dayStats.served).toBe(1);
    expect(s.cup.layers).toHaveLength(0);
  });

  it('giao sai món: khách không trả tiền và vẫn chờ', () => {
    let s = tickUntil(createInitialState(7), (x) => x.customers.length > 0);
    s = run(s, { type: 'ADD_INGREDIENT', id: 'pearl_black' }, { type: 'ADD_INGREDIENT', id: 'pearl_black' }, { type: 'ADD_INGREDIENT', id: 'pearl_black' });
    const rep = s.reputation;
    s = run(s, { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.customers).toHaveLength(1);
    expect(s.reputation).toBeLessThan(rep);
    expect(s.dayStats.wrong).toBe(1);
  });

  it('hoàn tác trả lại nguyên liệu vào kho', () => {
    const s0 = createInitialState(1);
    const s = run(s0, { type: 'ADD_INGREDIENT', id: 'matcha' }, { type: 'UNDO' });
    expect(s.inventory.matcha).toBe(s0.inventory.matcha);
    expect(s.cup.layers).toHaveLength(0);
  });

  it('nhập hàng trừ tiền và cộng kho, thiếu tiền thì báo lỗi', () => {
    const s0 = createInitialState(1);
    const s = run(s0, { type: 'BUY_PACK', id: 'flan' });
    expect(s.money).toBe(STARTING_MONEY - INGREDIENTS.flan.packPrice);
    expect(s.inventory.flan).toBe(INGREDIENTS.flan.packSize);

    const broke = run({ ...s0, money: 0 }, { type: 'BUY_PACK', id: 'flan' });
    expect(broke.inventory.flan).toBe(0);
    expect(broke.events.at(-1)?.type).toBe('error');
  });

  it('khách bỏ về khi hết kiên nhẫn', () => {
    let s = tickUntil(createInitialState(3), (x) => x.customers.length > 0);
    const id = s.customers[0].id;
    s = tickUntil(s, (x) => !x.customers.some((c) => c.id === id));
    expect(s.dayStats.lost).toBeGreaterThanOrEqual(1);
    expect(s.events.some((e) => e.type === 'left')).toBe(true);
  });

  it('hết ngày thì hiện tổng kết, trừ lương và sang ngày mới', () => {
    let s = createInitialState(5);
    s = { ...s, totalRevenue: STAFF_UNLOCK_REVENUE };
    s = run(s, { type: 'HIRE', role: 'waiter' });
    expect(s.staff.waiter).toBe(1);
    const money = s.money;
    // Giả lập hết giờ, không còn khách
    s = run({ ...s, dayTimeMs: DAY_LENGTH_MS - 100, customers: [], nextCustomerInMs: 1e9 }, { type: 'TICK', dt: 200 });
    expect(s.phase).toBe('summary');
    expect(s.lastSummary?.salaries).toBe(180_000);
    expect(s.money).toBe(money - 180_000);
    s = run(s, { type: 'NEXT_DAY' });
    expect(s.day).toBe(2);
    expect(s.phase).toBe('open');
    expect(s.dayTimeMs).toBe(0);
  });

  it('chỉ thuê được nhân viên khi doanh thu ≥ 10 triệu', () => {
    const s = run(createInitialState(1), { type: 'HIRE', role: 'barista' });
    expect(s.staff.barista).toBe(0);
  });

  it('nhân viên pha chế nhận cả đơn đang chọn khi người chơi rảnh tay', () => {
    let s = richState(11);
    s = run(s, { type: 'HIRE', role: 'barista' });
    s = tickUntil(s, (x) => x.customers.length >= 1);
    const id = s.customers[0].id;
    s = run(s, { type: 'TICK', dt: 100 });
    expect(s.customers.find((c) => c.id === id)?.takenBy).toBe(0);
    expect(s.selectedCustomerId).not.toBe(id);
  });

  it('nhân viên pha chế không giành đơn người chơi đang pha dở', () => {
    let s = richState(11);
    s = tickUntil(s, (x) => x.customers.length >= 1);
    s = run(s, { type: 'ADD_INGREDIENT', id: 'milk' }, { type: 'HIRE', role: 'barista' }, { type: 'TICK', dt: 100 });
    expect(s.customers[0].takenBy).toBeNull();
    expect(s.selectedCustomerId).toBe(s.customers[0].id);
  });

  it('nhân viên pha chế tự hoàn thành đơn và thu tiền', () => {
    let s = richState(11);
    s = run(s, { type: 'HIRE', role: 'barista' });
    const revenue = s.totalRevenue;
    s = tickUntil(s, (x) => x.dayStats.served >= 1);
    expect(s.dayStats.served).toBe(1);
    expect(s.totalRevenue).toBeGreaterThan(revenue);
    expect(s.baristas[0].customerId === null || s.customers.some((c) => c.takenBy === 0)).toBe(true);
  });

  it('vượt ngưỡng doanh thu thì báo mở khóa món', () => {
    let s = tickUntil(createInitialState(7), (x) => x.customers.length > 0);
    s = { ...s, totalRevenue: 299_000 };
    s = makeCorrectCup(s);
    s = run(s, { type: 'SERVE' });
    expect(s.events.some((e) => e.type === 'unlock' && e.text.includes('ô long'))).toBe(true);
  });
});
