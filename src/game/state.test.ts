import { describe, expect, it } from 'vitest';
import {
  BOWL_CAPACITY,
  DAY_LENGTH_MS,
  DIRT_SPOTS,
  MAX_SPICE,
  SPAWN_BUSY_MUL,
  SPAWN_IDLE_MAX_MS,
  SPAWN_MIN_MS,
  STAFF_UNLOCK_REVENUE,
  STARTING_MONEY,
  TABLE_COUNT,
} from './constants';
import { INGREDIENTS } from './data/ingredients';
import { bowlCost, requiredRecipe } from './orders';
import { createRng } from './rng';
import { createInitialState, gameReducer, spawnInterval, type GameAction } from './state';
import type { Customer, Diner, GameEvent, GameState, IngredientId, Order, ShopInfo } from './types';

const SHOP: ShopInfo = { name: 'Quán Test', theme: 'fire' };

function run(state: GameState, ...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, state);
}

function tickUntil(state: GameState, pred: (s: GameState) => boolean, max = 10_000): GameState {
  let s = state;
  for (let i = 0; i < max && !pred(s); i++) s = gameReducer(s, { type: 'TICK', dt: 100 });
  return s;
}

/** Dọn sạch mọi chỗ bẩn rồi mở cửa. */
function openShop(state: GameState): GameState {
  let s = state;
  while (s.dirt.length > 0) s = run(s, { type: 'CLEAN', id: s.dirt[0].id });
  return run(s, { type: 'OPEN_SHOP' });
}

function selected(state: GameState) {
  return state.customers.find((x) => x.id === state.selectedCustomerId)!;
}

/** Nấu tô cho khách đang được chọn với `spiceDelta` shot ớt lệch so với yêu cầu. */
function cookBowl(state: GameState, spiceDelta = 0): GameState {
  const c = selected(state);
  const actions: GameAction[] = [];
  for (const [id, n] of Object.entries(requiredRecipe(c.order)) as [IngredientId, number][]) {
    for (let i = 0; i < n; i++) actions.push({ type: 'ADD_INGREDIENT', id });
  }
  const shots = Math.max(0, Math.min(MAX_SPICE, c.order.spice + spiceDelta));
  for (let i = 0; i < shots; i++) actions.push({ type: 'ADD_CHILI' });
  return run(state, ...actions);
}

/** Quán đã mở, có đúng 1 khách ở quầy với đơn cay cấp 3 theo kiểu phục vụ yêu cầu. */
function firstCustomer(service: Pick<Order, 'channel' | 'dineIn'> = { channel: 'walk-in', dineIn: false }, seed = 7): GameState {
  const s = tickUntil(openShop(createInitialState(seed, SHOP)), (x) => x.customers.length > 0);
  const c = s.customers[0];
  return { ...s, customers: [{ ...c, order: { ...c.order, ...service, spice: 3 } }] };
}

function lastEvent<T extends GameEvent['type']>(s: GameState, type: T) {
  return [...s.events].reverse().find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

function dummyDiner(id: number): Diner {
  return { id, name: 'Test', look: { archetype: 'dev', skin: 0, hair: 0 }, reaction: 'delicious', feedback: 'Ngon', paid: 75_000, tip: 0, eatMs: 1e9 };
}

/** State đã đủ doanh thu thuê nhân viên và kho đầy mọi nguyên liệu. */
function richState(seed: number): GameState {
  const s = openShop(createInitialState(seed, SHOP));
  const inventory = { ...s.inventory };
  for (const id of Object.keys(inventory) as IngredientId[]) inventory[id] = 40;
  return { ...s, totalRevenue: STAFF_UNLOCK_REVENUE, inventory };
}

describe('dọn dẹp đầu ngày', () => {
  it('ngày mới bắt đầu bằng dọn quán: chưa chạy giờ, chưa có khách', () => {
    const s0 = createInitialState(1, SHOP);
    expect(s0.phase).toBe('prep');
    expect(s0.dirt).toHaveLength(DIRT_SPOTS);
    const s = run(s0, { type: 'TICK', dt: 60_000 });
    expect(s.dayTimeMs).toBe(0);
    expect(s.customers).toHaveLength(0);
  });

  it('chưa dọn sạch thì không mở cửa được', () => {
    const s = run(createInitialState(1, SHOP), { type: 'OPEN_SHOP' });
    expect(s.phase).toBe('prep');
    expect(s.events.at(-1)?.type).toBe('error');
  });

  it('mỗi chỗ bẩn cần đủ số lần chạm; dọn hết thì báo và mở cửa được', () => {
    let s = createInitialState(1, SHOP);
    const spot = s.dirt[0];
    for (let i = 0; i < spot.hp - 1; i++) s = run(s, { type: 'CLEAN', id: spot.id });
    expect(s.dirt.some((d) => d.id === spot.id)).toBe(true);
    s = openShop(s);
    expect(s.events.some((e) => e.type === 'clean')).toBe(true);
    expect(s.phase).toBe('open');
  });

  it('chén bẩn nằm trên bàn, mỗi bàn tối đa 1 chồng', () => {
    for (let seed = 1; seed < 30; seed++) {
      const dishes = createInitialState(seed, SHOP).dirt.filter((d) => d.kind === 'dishes');
      for (const d of dishes) expect(d.table).not.toBeNull();
      expect(new Set(dishes.map((d) => d.table)).size).toBe(dishes.length);
    }
  });
});

describe('nhịp khách', () => {
  it('khoảng cách giữa các khách nằm trong giới hạn, chậm lại khi quầy dồn đơn', () => {
    const rng = createRng(1);
    const calm = { reputation: 100, day: 30, customers: [] as Customer[] };
    for (let i = 0; i < 50; i++) expect(spawnInterval(calm, rng)).toBeGreaterThanOrEqual(SPAWN_MIN_MS * 0.8);
    const busy = { ...calm, customers: [{} as Customer, {} as Customer] };
    const a = spawnInterval(calm, createRng(5));
    const b = spawnInterval(busy, createRng(5));
    expect(b).toBe(Math.round(a * SPAWN_BUSY_MUL));
  });

  it('quầy trống thì khách kế tiếp tới sớm, không để quán ế', () => {
    let s = firstCustomer();
    s = run(cookBowl(s), { type: 'SERVE' }, { type: 'TICK', dt: 100 });
    expect(s.customers).toHaveLength(0);
    expect(s.nextCustomerInMs).toBeLessThanOrEqual(SPAWN_IDLE_MAX_MS);
  });

  it('một ngày có lượng khách vừa phải và quầy không bao giờ quá 3 người', () => {
    let s = openShop(createInitialState(9, SHOP));
    let maxQueue = 0;
    while (s.phase !== 'summary') {
      s = gameReducer(s, { type: 'TICK', dt: 100 });
      maxQueue = Math.max(maxQueue, s.customers.length);
    }
    const total = s.lastSummary!.served + s.lastSummary!.lost;
    expect(total).toBeGreaterThanOrEqual(8);
    expect(total).toBeLessThanOrEqual(22);
    expect(maxQueue).toBeLessThanOrEqual(3);
  });
});

describe('gameReducer', () => {
  it('khởi tạo với vốn, 10 bàn trống và mỗi nguyên liệu ở quầy 1 gói', () => {
    const s = createInitialState(1, SHOP);
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.tables).toHaveLength(TABLE_COUNT);
    expect(s.tables.every((t) => t === null)).toBe(true);
    for (const id of ['noodle', 'beef', 'purple_cabbage', 'coca', 'milk'] as IngredientId[]) {
      expect(s.inventory[id]).toBe(INGREDIENTS[id].packSize);
    }
  });

  it('không làm thay đổi state cũ', () => {
    const s = openShop(createInitialState(1, SHOP));
    const snapshot = JSON.stringify(s);
    run(s, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'ADD_CHILI' }, { type: 'TICK', dt: 5000 });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('khách đến, có thông báo đơn và được tự chọn', () => {
    const s = tickUntil(openShop(createInitialState(7, SHOP)), (x) => x.customers.length > 0);
    expect(s.customers).toHaveLength(1);
    expect(s.selectedCustomerId).toBe(s.customers[0].id);
    expect(s.events.some((e) => e.type === 'new-order')).toBe(true);
  });

  it('mang về đúng món: trả đủ tiền ngay, về nhà đánh giá khen ngon', () => {
    let s = firstCustomer();
    const price = s.customers[0].order.price;
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.customers).toHaveLength(0);
    expect(s.money).toBeGreaterThanOrEqual(STARTING_MONEY + price);
    expect(s.dayStats.served).toBe(1);
    expect(s.bowl.steps).toHaveLength(0);
    expect(s.reviews).toHaveLength(1);
    s = tickUntil(s, (x) => x.reviews.length === 0);
    expect(lastEvent(s, 'review')?.reaction).toBe('delicious');
    expect(lastEvent(s, 'review')?.refund).toBe(0);
  });

  it('mang về nhưng cay quá: khách đánh giá cay, quán hoàn bớt tiền', () => {
    let s = firstCustomer();
    const price = s.customers[0].order.price;
    s = run(cookBowl(s, +1), { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY + price);
    s = tickUntil(s, (x) => x.reviews.length === 0);
    const review = lastEvent(s, 'review');
    expect(review?.reaction).toBe('spicy');
    expect(review?.refund).toBeGreaterThan(0);
    expect(s.money).toBe(STARTING_MONEY + price - review!.refund);
    expect(s.dayStats.refunds).toBe(review!.refund);
  });

  it('ăn tại chỗ: khách vào bàn ngồi ăn, ăn xong mới nhận xét và trả tiền', () => {
    let s = firstCustomer({ channel: 'walk-in', dineIn: true });
    const id = s.customers[0].id;
    s = run(cookBowl(s, +4), { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.tables[0]?.id).toBe(id);
    expect(lastEvent(s, 'served')?.dineIn).toBe(true);
    s = tickUntil(s, (x) => x.tables[0] === null);
    const finished = lastEvent(s, 'finished');
    expect(finished?.customerId).toBe(id);
    expect(finished?.reaction).toBe('very-spicy');
    expect(finished?.feedback.length).toBeGreaterThan(0);
    expect(s.money).toBe(STARTING_MONEY + finished!.amount);
  });

  it('ít cay hơn yêu cầu: khách chê không cay', () => {
    let s = run(cookBowl(firstCustomer({ channel: 'walk-in', dineIn: true }), -3), { type: 'SERVE' });
    s = tickUntil(s, (x) => x.tables[0] === null);
    expect(lastEvent(s, 'finished')?.reaction).toBe('not-spicy');
  });

  it('hết bàn thì khách bưng tô đứng chờ, có bàn trống mới vào ngồi', () => {
    let s = firstCustomer({ channel: 'walk-in', dineIn: true });
    const tables = s.tables.map((_, i) => dummyDiner(1000 + i));
    tables[4] = { ...tables[4], eatMs: 3_000 };
    s = { ...s, tables };
    const id = s.customers[0].id;
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.tableQueue.map((d) => d.id)).toEqual([id]);
    expect(lastEvent(s, 'served')?.text).toContain('Hết bàn');
    s = tickUntil(s, (x) => x.tableQueue.length === 0);
    expect(s.tables[4]?.id).toBe(id);
  });

  it('đơn Grab: tài xế tới lấy, trả tiền ngay', () => {
    let s = firstCustomer({ channel: 'grab', dineIn: false });
    s = run(cookBowl(s), { type: 'SERVE' });
    const served = lastEvent(s, 'served');
    expect(served?.channel).toBe('grab');
    expect(served?.amount).toBeGreaterThan(0);
    expect(s.tables.every((t) => t === null)).toBe(true);
  });

  it('nấu sai món: bỏ tô, trừ tiền theo giá vốn nguyên liệu, khách chê dở và vẫn chờ', () => {
    let s = firstCustomer();
    s = run(s, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'ADD_INGREDIENT', id: 'purple_cabbage' }, { type: 'ADD_CHILI' });
    const cost = bowlCost(s.bowl);
    expect(cost).toBe(15_000 + 5_000);
    const rep = s.reputation;
    const stock = s.inventory.noodle;
    s = run(s, { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY - cost);
    expect(s.inventory.noodle).toBe(stock);
    expect(s.bowl.steps).toHaveLength(0);
    expect(s.customers).toHaveLength(1);
    expect(s.reputation).toBeLessThan(rep);
    expect(s.dayStats.wrong).toBe(1);
    expect(s.dayStats.wasted).toBe(cost);
    expect(lastEvent(s, 'wrong')?.penalty).toBe(cost);
  });

  it('hoàn tác trả lại nguyên liệu vào kho, shot ớt không đụng tới kho', () => {
    const s0 = createInitialState(1, SHOP);
    const s = run(s0, { type: 'ADD_INGREDIENT', id: 'beef' }, { type: 'ADD_CHILI' }, { type: 'UNDO' }, { type: 'UNDO' });
    expect(s.inventory).toEqual(s0.inventory);
    expect(s.bowl.steps).toHaveLength(0);
  });

  it('hũ ớt tối đa 7 shot', () => {
    const s = run(createInitialState(1, SHOP), ...Array.from({ length: MAX_SPICE + 1 }, () => ({ type: 'ADD_CHILI' }) as GameAction));
    expect(s.bowl.steps.filter((x) => x === 'chili')).toHaveLength(MAX_SPICE);
    expect(s.events.at(-1)?.type).toBe('error');
  });

  it('tô có sức chứa giới hạn, nước để riêng trên khay', () => {
    const s = run(
      richState(1),
      ...Array.from({ length: BOWL_CAPACITY + 1 }, () => ({ type: 'ADD_INGREDIENT', id: 'noodle' }) as GameAction),
      { type: 'ADD_INGREDIENT', id: 'milk' },
    );
    expect(s.bowl.steps.filter((x) => x === 'noodle')).toHaveLength(BOWL_CAPACITY);
    expect(s.bowl.steps.at(-1)).toBe('milk');
  });

  it('đổ bỏ tô: nguyên liệu mất, nước được cất lại', () => {
    const s0 = createInitialState(1, SHOP);
    const s = run(s0, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'ADD_INGREDIENT', id: 'coca' }, { type: 'DISCARD' });
    expect(s.bowl.steps).toHaveLength(0);
    expect(s.inventory.noodle).toBe(s0.inventory.noodle - 1);
    expect(s.inventory.coca).toBe(s0.inventory.coca);
    expect(s.money).toBe(STARTING_MONEY);
  });

  it('lưu tên quán khi tạo game mới', () => {
    expect(createInitialState(1, SHOP).shop).toEqual(SHOP);
  });

  it('nhập hàng trừ tiền và cộng kho, thiếu tiền thì báo lỗi', () => {
    const s0 = createInitialState(1, SHOP);
    const s = run(s0, { type: 'BUY_PACK', id: 'beef' });
    expect(s.money).toBe(STARTING_MONEY - INGREDIENTS.beef.packPrice);
    expect(INGREDIENTS.beef.packPrice).toBe(300_000);
    expect(s.inventory.beef).toBe(s0.inventory.beef + INGREDIENTS.beef.packSize);

    const broke = run({ ...s0, money: 0 }, { type: 'BUY_PACK', id: 'beef' });
    expect(broke.inventory.beef).toBe(s0.inventory.beef);
    expect(broke.events.at(-1)?.type).toBe('error');
  });

  it('khách bỏ về khi hết kiên nhẫn', () => {
    let s = tickUntil(openShop(createInitialState(3, SHOP)), (x) => x.customers.length > 0);
    const id = s.customers[0].id;
    s = tickUntil(s, (x) => !x.customers.some((c) => c.id === id));
    expect(s.dayStats.lost).toBeGreaterThanOrEqual(1);
    expect(s.events.some((e) => e.type === 'left')).toBe(true);
  });

  it('hết giờ vẫn chờ khách đang ăn xong mới tổng kết; sang ngày mới phải dọn quán lại', () => {
    let s = openShop(createInitialState(5, SHOP));
    s = { ...s, totalRevenue: STAFF_UNLOCK_REVENUE };
    s = run(s, { type: 'HIRE', role: 'waiter' });
    const money = s.money;
    const tables = s.tables.map(() => null as Diner | null);
    tables[2] = { ...dummyDiner(99), eatMs: 1_000 };
    s = run({ ...s, tables, dayTimeMs: DAY_LENGTH_MS - 100, customers: [], nextCustomerInMs: 1e9 }, { type: 'TICK', dt: 200 });
    expect(s.phase).toBe('closing');
    s = tickUntil(s, (x) => x.phase === 'summary');
    expect(s.lastSummary?.salaries).toBe(180_000);
    expect(s.money).toBe(money + 75_000 - 180_000);
    s = run(s, { type: 'NEXT_DAY' });
    expect(s.day).toBe(2);
    expect(s.phase).toBe('prep');
    expect(s.dirt.length).toBeGreaterThan(0);
    expect(s.dayTimeMs).toBe(0);
  });

  it('chỉ thuê được nhân viên khi doanh thu ≥ 10 triệu', () => {
    const s = run(createInitialState(1, SHOP), { type: 'HIRE', role: 'cook' });
    expect(s.staff.cook).toBe(0);
  });

  it('đầu bếp nhận cả đơn đang chọn khi người chơi rảnh tay', () => {
    let s = richState(11);
    s = run(s, { type: 'HIRE', role: 'cook' });
    s = tickUntil(s, (x) => x.customers.length >= 1);
    const id = s.customers[0].id;
    s = run(s, { type: 'TICK', dt: 100 });
    expect(s.customers.find((c) => c.id === id)?.takenBy).toBe(0);
    expect(s.selectedCustomerId).not.toBe(id);
  });

  it('đầu bếp không giành đơn người chơi đang nấu dở', () => {
    let s = richState(11);
    s = tickUntil(s, (x) => x.customers.length >= 1);
    s = run(s, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'HIRE', role: 'cook' }, { type: 'TICK', dt: 100 });
    expect(s.customers[0].takenBy).toBeNull();
    expect(s.selectedCustomerId).toBe(s.customers[0].id);
  });

  it('đầu bếp tự nấu xong đơn đúng món', () => {
    let s = richState(11);
    s = run(s, { type: 'HIRE', role: 'cook' });
    s = tickUntil(s, (x) => x.dayStats.served >= 1);
    expect(s.dayStats.served).toBe(1);
    expect(lastEvent(s, 'served')).toBeDefined();
    const pending = [...s.reviews, ...s.tableQueue, ...s.tables.filter((t): t is Diner => t !== null)];
    expect(pending.every((p) => p.reaction === 'delicious')).toBe(true);
  });

  it('vượt ngưỡng doanh thu thì báo mở khóa món', () => {
    let s = firstCustomer();
    s = { ...s, totalRevenue: 999_000 };
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.events.some((e) => e.type === 'unlock' && e.text.includes('hải sản'))).toBe(true);
  });
});
