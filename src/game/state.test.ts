import { describe, expect, it } from 'vitest';
import {
  BOWL_CAPACITY,
  DAY_LENGTH_MS,
  DIRT_SPOTS,
  GROUP_MAX_SIZE,
  GROUP_MIN_SIZE,
  MAX_CUSTOMERS,
  MAX_SPICE,
  REP_OWNER_REPLY,
  SPAWN_BUSY_MUL,
  SPAWN_IDLE_MAX_MS,
  SPAWN_MIN_MS,
  STAFF_UNLOCK_REVENUE,
  STARTING_MONEY,
  TABLE_COUNT,
  WRONG_PENALTY_RATE,
} from './constants';
import { INGREDIENTS } from './data/ingredients';
import { DISH_BY_ID } from './data/menu';
import { bowlCost, orderPrice, requiredRecipe } from './orders';
import { createRng } from './rng';
import { createInitialState, gameReducer, spawnInterval, type GameAction } from './state';
import type { Customer, Diner, GameEvent, GameState, Guest, IngredientId, Order, ShopInfo } from './types';

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

function selectedGuest(state: GameState): Guest {
  return state.customers.flatMap((c) => c.guests).find((g) => g.id === state.selectedGuestId)!;
}

/** Bỏ đúng nguyên liệu cho một đơn, với `spiceDelta` shot ớt lệch so với yêu cầu. */
function cookFor(state: GameState, order: Order, spiceDelta = 0): GameState {
  const actions: GameAction[] = [];
  for (const [id, n] of Object.entries(requiredRecipe(order)) as [IngredientId, number][]) {
    for (let i = 0; i < n; i++) actions.push({ type: 'ADD_INGREDIENT', id });
  }
  const shots = Math.max(0, Math.min(MAX_SPICE, order.spice + spiceDelta));
  for (let i = 0; i < shots; i++) actions.push({ type: 'ADD_CHILI' });
  return run(state, ...actions);
}

/** Nấu tô cho người đang được chọn. */
function cookBowl(state: GameState, spiceDelta = 0): GameState {
  return cookFor(state, selectedGuest(state).order, spiceDelta);
}

/** State có kho đầy mọi nguyên liệu (để nấu nhiều tô). */
function stocked(state: GameState, amount = 40): GameState {
  const inventory = { ...state.inventory };
  for (const id of Object.keys(inventory) as IngredientId[]) inventory[id] = amount;
  return { ...state, inventory };
}

/** Quán đã mở, có đúng 1 khách lẻ ở quầy với đơn cay cấp 3 theo kiểu phục vụ yêu cầu. */
function firstCustomer(service: Pick<Order, 'channel' | 'dineIn'> = { channel: 'walk-in', dineIn: false }, seed = 7): GameState {
  const s = tickUntil(openShop(createInitialState(seed, SHOP)), (x) => x.customers.length > 0);
  const c = s.customers[0];
  const guest = { ...c.guests[0], order: { ...c.guests[0].order, ...service, spice: 3 } };
  return { ...s, customers: [{ ...c, guests: [guest] }], selectedCustomerId: c.id, selectedGuestId: guest.id, nextCustomerInMs: 1e9 };
}

/** Quán đã mở, ở quầy là 1 nhóm bạn 3 người ăn tại chỗ gọi kim chi cấp 1, bò cấp 2, bò cấp 5. */
function partyAtCounter(seed = 7): GameState {
  const s = stocked(firstCustomer({ channel: 'walk-in', dineIn: true }, seed));
  const [c] = s.customers;
  const lead = c.guests[0];
  const order = (dishId: string, spice: number): Order => ({ channel: 'walk-in', dineIn: true, dishId, drinks: [], spice, price: orderPrice({ dishId, drinks: [] }) });
  const guests: Guest[] = [
    { ...lead, order: order('kimchi', 1) },
    { ...lead, id: 9001, name: 'Bơ', order: order('beef', 2) },
    { ...lead, id: 9002, name: 'Bin', order: order('beef', 5) },
  ];
  const party: Customer = { ...c, guests, patienceMs: 1e9 };
  return { ...s, customers: [party], selectedGuestId: lead.id };
}

function lastEvent<T extends GameEvent['type']>(s: GameState, type: T) {
  return [...s.events].reverse().find((e): e is Extract<GameEvent, { type: T }> => e.type === type);
}

function dummyDiner(id: number): Diner {
  return { id, partyId: id, partySize: 1, name: 'Test', look: { archetype: 'dev', skin: 0, hair: 0 }, dishId: 'kimchi', spice: 2, paid: 75_000, tip: 0, eatMs: 1e9 };
}

/** State đã đủ doanh thu thuê nhân viên và kho đầy mọi nguyên liệu. */
function richState(seed: number): GameState {
  return { ...stocked(openShop(createInitialState(seed, SHOP))), totalRevenue: STAFF_UNLOCK_REVENUE };
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
    const busy = { ...calm, customers: [{} as Customer, {} as Customer, {} as Customer] };
    const a = spawnInterval(calm, createRng(5));
    const b = spawnInterval(busy, createRng(5));
    expect(Math.abs(b - a * SPAWN_BUSY_MUL)).toBeLessThanOrEqual(1);
  });

  it('quầy trống thì khách kế tiếp tới sớm, không để quán ế', () => {
    let s = { ...firstCustomer(), nextCustomerInMs: 30_000 };
    s = run(cookBowl(s), { type: 'SERVE' }, { type: 'TICK', dt: 100 });
    expect(s.customers).toHaveLength(0);
    expect(s.nextCustomerInMs).toBeLessThanOrEqual(SPAWN_IDLE_MAX_MS);
  });

  it('người chơi nấu ~12 giây/tô: quán đông khách cả ngày mà gần như không ai bỏ về', () => {
    let s = stocked(openShop(createInitialState(9, SHOP)), 999);
    let busy = 0;
    let maxQueue = 0;
    while (s.phase !== 'summary') {
      s = gameReducer(s, { type: 'TICK', dt: 100 });
      maxQueue = Math.max(maxQueue, s.customers.length);
      busy -= 100;
      if (busy <= 0 && s.selectedGuestId !== null) {
        s = run(cookBowl(s), { type: 'SERVE' });
        busy = 12_000;
      }
    }
    expect(s.lastSummary!.served).toBeGreaterThanOrEqual(25);
    expect(s.lastSummary!.lost).toBeLessThanOrEqual(5);
    expect(maxQueue).toBeLessThanOrEqual(MAX_CUSTOMERS);
  });

  it('không ai phục vụ thì quầy đầy tối đa 4 lượt khách, khách lần lượt bỏ về', () => {
    let s = openShop(createInitialState(9, SHOP));
    let maxQueue = 0;
    while (s.phase !== 'summary') {
      s = gameReducer(s, { type: 'TICK', dt: 100 });
      maxQueue = Math.max(maxQueue, s.customers.length);
    }
    expect(maxQueue).toBe(MAX_CUSTOMERS);
    expect(s.lastSummary!.lost).toBeGreaterThanOrEqual(15);
  });

  it('có nhóm bạn 2–4 người, luôn ăn tại chỗ, không trùng tên nhau', () => {
    const groups: Customer[] = [];
    for (const seed of [1, 2, 3]) {
      let s = openShop(createInitialState(seed, SHOP));
      const seen = new Set<number>();
      while (s.phase !== 'summary') {
        s = gameReducer(s, { type: 'TICK', dt: 100 });
        for (const c of s.customers) {
          if (seen.has(c.id)) continue;
          seen.add(c.id);
          if (c.guests.length > 1) groups.push(c);
        }
      }
    }
    expect(groups.length).toBeGreaterThan(3);
    for (const c of groups) {
      expect(c.guests.length).toBeGreaterThanOrEqual(GROUP_MIN_SIZE);
      expect(c.guests.length).toBeLessThanOrEqual(GROUP_MAX_SIZE);
      for (const g of c.guests) expect(g.order).toMatchObject({ channel: 'walk-in', dineIn: true });
      expect(new Set(c.guests.map((g) => g.name)).size).toBe(c.guests.length);
    }
  });
});

describe('gameReducer', () => {
  it('khởi tạo với vốn, 10 bàn trống và mỗi nguyên liệu ở quầy 1 gói', () => {
    const s = createInitialState(1, SHOP);
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.tables).toHaveLength(TABLE_COUNT);
    expect(s.tables.every((t) => t === null)).toBe(true);
    for (const id of ['noodle', 'beef', 'purple_cabbage', 'coca', 'pepsi', 'fanta', 'sevenup', 'milk'] as IngredientId[]) {
      expect(s.inventory[id]).toBe(INGREDIENTS[id].packSize);
    }
  });

  it('không làm thay đổi state cũ', () => {
    const s = partyAtCounter();
    const snapshot = JSON.stringify(s);
    run(cookBowl(s), { type: 'SERVE' }, { type: 'TICK', dt: 5000 });
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  it('khách đến, có thông báo đơn và được tự chọn', () => {
    const s = tickUntil(openShop(createInitialState(7, SHOP)), (x) => x.customers.length > 0);
    expect(s.customers).toHaveLength(1);
    expect(s.selectedCustomerId).toBe(s.customers[0].id);
    expect(s.selectedGuestId).toBe(s.customers[0].guests[0].id);
    expect(s.events.some((e) => e.type === 'new-order')).toBe(true);
  });

  it('mang về đúng món: trả đủ tiền ngay, về nhà đánh giá khen ngon', () => {
    let s = firstCustomer();
    const price = s.customers[0].guests[0].order.price;
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

  it('mang về nhưng cay quá: khách về nhà mới biết, đánh giá cay và quán hoàn bớt tiền', () => {
    let s = firstCustomer();
    const price = s.customers[0].guests[0].order.price;
    s = run(cookBowl(s, +1), { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY + price);
    s = tickUntil(s, (x) => x.reviews.length === 0);
    const review = lastEvent(s, 'review');
    expect(review?.reaction).toBe('spicy');
    expect(review?.refund).toBeGreaterThan(0);
    expect(s.money).toBe(STARTING_MONEY + price - review!.refund);
    expect(s.dayStats.refunds).toBe(review!.refund);
  });

  it('ăn tại chỗ đúng món: khách vào bàn ngồi ăn, ăn xong mới khen và trả tiền', () => {
    let s = firstCustomer({ channel: 'walk-in', dineIn: true });
    const { id: customerId } = s.customers[0];
    const guestId = s.customers[0].guests[0].id;
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY);
    expect(s.tables[0]?.id).toBe(guestId);
    expect(lastEvent(s, 'served')).toMatchObject({ dineIn: true, done: true });
    s = tickUntil(s, (x) => x.tables[0] === null);
    const finished = lastEvent(s, 'finished');
    expect(finished?.customerId).toBe(customerId);
    expect(finished?.tables).toEqual([0]);
    expect(finished?.feedback.length).toBeGreaterThan(0);
    expect(s.money).toBe(STARTING_MONEY + finished!.amount);
    expect(s.reviewLog.at(-1)).toMatchObject({ service: 'dine-in', stars: 5, partySize: 1 });
  });

  it('ăn tại chỗ sai độ cay: khách trả tô ngay ở quầy, làm lại đúng mới vào bàn', () => {
    let s = firstCustomer({ channel: 'walk-in', dineIn: true });
    const guestId = s.customers[0].guests[0].id;
    s = cookBowl(s, +4);
    const cost = bowlCost(s.bowl);
    s = run(s, { type: 'SERVE' });
    expect(s.customers).toHaveLength(1);
    expect(s.tables.every((t) => t === null)).toBe(true);
    expect(lastEvent(s, 'wrong')).toMatchObject({ reaction: 'very-spicy', penalty: cost * WRONG_PENALTY_RATE });
    expect(s.money).toBe(STARTING_MONEY - cost * WRONG_PENALTY_RATE);
    expect(s.dayStats.wrong).toBe(1);

    s = run(cookBowl(s, -1), { type: 'SERVE' });
    expect(lastEvent(s, 'wrong')?.reaction).toBe('mild');
    expect(s.customers).toHaveLength(1);

    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.customers).toHaveLength(0);
    expect(s.tables[0]?.id).toBe(guestId);
  });

  it('hết bàn thì khách bưng tô đứng chờ, có bàn trống mới vào ngồi', () => {
    let s = firstCustomer({ channel: 'walk-in', dineIn: true });
    const tables = s.tables.map((_, i) => dummyDiner(1000 + i));
    tables[4] = { ...tables[4], eatMs: 3_000 };
    s = { ...s, tables };
    const guestId = s.customers[0].guests[0].id;
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.tableQueue.map((p) => p.map((d) => d.id))).toEqual([[guestId]]);
    expect(lastEvent(s, 'served')?.text).toContain('Hết bàn');
    s = tickUntil(s, (x) => x.tableQueue.length === 0);
    expect(s.tables[4]?.id).toBe(guestId);
  });

  it('đơn Grab: tài xế tới lấy, trả tiền ngay', () => {
    let s = firstCustomer({ channel: 'grab', dineIn: false });
    s = run(cookBowl(s), { type: 'SERVE' });
    const served = lastEvent(s, 'served');
    expect(served?.channel).toBe('grab');
    expect(served?.amount).toBeGreaterThan(0);
    expect(s.tables.every((t) => t === null)).toBe(true);
  });

  it('nấu sai món: khách trả tô, chỉ bị trừ nửa giá vốn nguyên liệu, khách chê và vẫn chờ', () => {
    let s = firstCustomer();
    s = run(s, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'ADD_INGREDIENT', id: 'beef' }, { type: 'ADD_CHILI' });
    const cost = bowlCost(s.bowl);
    expect(cost).toBe(15_000 + 30_000);
    const rep = s.reputation;
    const stock = s.inventory.noodle;
    s = run(s, { type: 'SERVE' });
    expect(s.money).toBe(STARTING_MONEY - 22_500);
    expect(s.inventory.noodle).toBe(stock);
    expect(s.bowl.steps).toHaveLength(0);
    expect(s.customers).toHaveLength(1);
    expect(s.reputation).toBeLessThan(rep);
    expect(s.dayStats.wrong).toBe(1);
    expect(s.dayStats.wasted).toBe(22_500);
    expect(lastEvent(s, 'wrong')).toMatchObject({ reaction: 'bad', penalty: 22_500 });
  });

  it('hoàn tác trả lại nguyên liệu vào kho, shot ớt không đụng tới kho', () => {
    const s0 = createInitialState(1, SHOP);
    const s = run(s0, { type: 'ADD_INGREDIENT', id: 'beef' }, { type: 'ADD_CHILI' }, { type: 'UNDO' }, { type: 'UNDO' });
    expect(s.inventory).toEqual(s0.inventory);
    expect(s.bowl.steps).toHaveLength(0);
  });

  it('bỏ dư thì bớt được từng phần (trả lại kho) và bớt được shot ớt', () => {
    const s0 = createInitialState(1, SHOP);
    let s = run(
      s0,
      { type: 'ADD_INGREDIENT', id: 'beef' },
      { type: 'ADD_INGREDIENT', id: 'noodle' },
      { type: 'ADD_INGREDIENT', id: 'beef' },
      { type: 'ADD_CHILI' },
      { type: 'ADD_CHILI' },
    );
    s = run(s, { type: 'REMOVE_INGREDIENT', id: 'beef' }, { type: 'REMOVE_CHILI' });
    expect(s.bowl.steps).toEqual(['beef', 'noodle', 'chili']);
    expect(s.inventory.beef).toBe(s0.inventory.beef - 1);
    // bớt thứ không có trong tô thì không đổi gì
    expect(run(s, { type: 'REMOVE_INGREDIENT', id: 'shrimp' }).bowl).toEqual(s.bowl);
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
      { type: 'ADD_INGREDIENT', id: 'pepsi' },
    );
    expect(s.bowl.steps.filter((x) => x === 'noodle')).toHaveLength(BOWL_CAPACITY);
    expect(s.bowl.steps.at(-1)).toBe('pepsi');
  });

  it('đổ bỏ tô: nguyên liệu mất, nước được cất lại', () => {
    const s0 = createInitialState(1, SHOP);
    const s = run(s0, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'ADD_INGREDIENT', id: 'fanta' }, { type: 'DISCARD' });
    expect(s.bowl.steps).toHaveLength(0);
    expect(s.inventory.noodle).toBe(s0.inventory.noodle - 1);
    expect(s.inventory.fanta).toBe(s0.inventory.fanta);
    expect(s.money).toBe(STARTING_MONEY);
  });

  it('lưu tên quán khi tạo game mới', () => {
    expect(createInitialState(1, SHOP).shop).toEqual(SHOP);
  });

  it('đổi tên quán bất cứ lúc nào, bỏ khoảng trắng thừa, không cho tên trống', () => {
    const s0 = openShop(createInitialState(1, SHOP));
    const s = run(s0, { type: 'RENAME_SHOP', name: '  Mì Cay Cấp 7  ' });
    expect(s.shop).toEqual({ ...SHOP, name: 'Mì Cay Cấp 7' });
    const blank = run(s, { type: 'RENAME_SHOP', name: '   ' });
    expect(blank.shop.name).toBe('Mì Cay Cấp 7');
    expect(blank.events.at(-1)?.type).toBe('error');
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
    expect(s.lastSummary?.salaries).toBe(90_000);
    expect(s.money).toBe(money + 75_000 - 90_000);
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
    const guest = s.customers[0].guests[0];
    s = run(s, { type: 'TICK', dt: 100 });
    expect(s.customers[0].guests.find((g) => g.id === guest.id)?.takenBy).toBe(0);
    expect(s.selectedGuestId).not.toBe(guest.id);
  });

  it('đầu bếp không giành tô người chơi đang nấu dở', () => {
    let s = richState(11);
    s = tickUntil(s, (x) => x.customers.length >= 1);
    const guestId = s.selectedGuestId;
    s = run(s, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'HIRE', role: 'cook' }, { type: 'TICK', dt: 100 });
    expect(s.customers[0].guests[0].takenBy).toBeNull();
    expect(s.selectedGuestId).toBe(guestId);
  });

  it('đầu bếp tự nấu xong đơn đúng món', () => {
    let s = richState(11);
    s = run(s, { type: 'HIRE', role: 'cook' });
    s = tickUntil(s, (x) => x.dayStats.served >= 1);
    expect(s.dayStats.served).toBe(1);
    expect(lastEvent(s, 'served')).toBeDefined();
    expect(s.reviews.every((p) => p.reaction === 'delicious')).toBe(true);
  });

  it('lương nhân viên giảm một nửa', () => {
    let s = { ...createInitialState(1, SHOP), totalRevenue: STAFF_UNLOCK_REVENUE };
    s = run(s, { type: 'HIRE', role: 'cook' }, { type: 'HIRE', role: 'stocker' });
    expect(s.events.at(-2)?.text).toContain('150.000');
    expect(s.events.at(-1)?.text).toContain('100.000');
  });

  it('vượt ngưỡng doanh thu thì báo mở khóa món', () => {
    let s = firstCustomer();
    s = { ...s, totalRevenue: 999_000 };
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.events.some((e) => e.type === 'unlock' && e.text.includes('hải sản'))).toBe(true);
  });
});

describe('nhóm bạn', () => {
  it('giao từng tô cho từng bạn; đủ tô cả nhóm mới vào các bàn liền nhau, ăn xong trả tiền một lần', () => {
    let s = partyAtCounter();
    const party = s.customers[0];
    const total = party.guests.reduce((sum, g) => sum + g.order.price, 0);

    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.customers).toHaveLength(1);
    expect(s.customers[0].guests.filter((g) => g.served)).toHaveLength(1);
    expect(lastEvent(s, 'served')).toMatchObject({ done: false, amount: 0 });
    // tự chuyển sang bạn tiếp theo trong nhóm
    expect(s.selectedCustomerId).toBe(party.id);
    expect(s.selectedGuestId).toBe(9001);

    s = run(cookBowl(s), { type: 'SERVE' }, { type: 'SELECT_GUEST', id: 9002 });
    s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.customers).toHaveLength(0);
    expect(lastEvent(s, 'served')?.done).toBe(true);
    expect(s.tables.slice(0, 3).map((d) => d?.partyId)).toEqual([party.id, party.id, party.id]);
    expect(s.money).toBe(STARTING_MONEY);

    s = tickUntil(s, (x) => x.tables.every((t) => t === null));
    const finished = lastEvent(s, 'finished');
    expect(finished?.tables).toEqual([0, 1, 2]);
    expect(finished!.amount).toBeGreaterThanOrEqual(total);
    expect(s.money).toBe(STARTING_MONEY + finished!.amount);
    expect(s.events.filter((e) => e.type === 'finished')).toHaveLength(1);
    expect(s.reviewLog.at(-1)).toMatchObject({ partySize: 3, stars: 5 });
  });

  it('nấu đúng y đơn của một bạn khác trong nhóm thì giao luôn cho bạn đó', () => {
    let s = partyAtCounter();
    const bin = s.customers[0].guests[2];
    s = run(cookFor(s, bin.order), { type: 'SERVE' });
    expect(s.dayStats.wrong).toBe(0);
    expect(s.customers[0].guests.find((g) => g.id === bin.id)?.served).toBe(true);
  });

  it('một bạn bị sai độ cay thì trả tô làm lại, cả nhóm vẫn chờ', () => {
    let s = partyAtCounter();
    s = run(cookBowl(s, +2), { type: 'SERVE' });
    expect(lastEvent(s, 'wrong')?.reaction).toBe('spicy');
    expect(s.customers[0].guests.every((g) => !g.served)).toBe(true);
  });

  it('hết bàn liền nhau thì nhóm ngồi ghép các bàn trống còn lại', () => {
    let s = partyAtCounter();
    const partyId = s.customers[0].id;
    // bàn chẵn có người ngồi → không còn 3 bàn liền nhau
    s = { ...s, tables: s.tables.map((_, i) => (i % 2 === 0 ? dummyDiner(2000 + i) : null)) };
    for (let i = 0; i < 3; i++) s = run(cookBowl(s), { type: 'SERVE' });
    expect(s.tables.flatMap((d, t) => (d?.partyId === partyId ? [t] : []))).toEqual([1, 3, 5]);
  });

  it('cả nhóm chờ lâu quá thì cùng bỏ về', () => {
    let s = partyAtCounter();
    s = { ...s, customers: [{ ...s.customers[0], patienceMs: 5_000 }] };
    s = tickUntil(s, (x) => x.customers.length === 0);
    expect(s.dayStats.lost).toBe(3);
    expect(lastEvent(s, 'left')?.text).toContain('Nhóm 3 bạn');
  });
});

describe('phản hồi đánh giá', () => {
  function withBadReview(): GameState {
    const s = firstCustomer();
    return run(s, { type: 'ADD_INGREDIENT', id: 'noodle' }, { type: 'SERVE' });
  }

  it('chủ quán phản hồi lời chê: lưu phản hồi, khách đáp lại, danh tiếng tăng nhẹ', () => {
    const s0 = withBadReview();
    const review = s0.reviewLog.at(-1)!;
    expect(review.stars).toBe(1);
    const s = run(s0, { type: 'REPLY_REVIEW', id: review.id, text: '  Xin lỗi bạn nha 🙏  ' });
    const after = s.reviewLog.at(-1)!;
    expect(after.reply).toBe('Xin lỗi bạn nha 🙏');
    expect(after.replyBack?.length).toBeGreaterThan(0);
    expect(s.reputation).toBe(s0.reputation + REP_OWNER_REPLY);
  });

  it('mỗi đánh giá chỉ phản hồi 1 lần, không gửi câu trống', () => {
    const s0 = withBadReview();
    const { id } = s0.reviewLog.at(-1)!;
    const blank = run(s0, { type: 'REPLY_REVIEW', id, text: '   ' });
    expect(blank.reviewLog.at(-1)?.reply).toBeUndefined();
    expect(blank.events.at(-1)?.type).toBe('error');
    const once = run(s0, { type: 'REPLY_REVIEW', id, text: 'A' }, { type: 'REPLY_REVIEW', id, text: 'B' });
    expect(once.reviewLog.at(-1)?.reply).toBe('A');
    expect(once.reputation).toBe(s0.reputation + REP_OWNER_REPLY);
  });

  it('mỗi lượt đánh giá có id riêng kể cả khi cùng một khách chê rồi khen', () => {
    let s = firstCustomer({ channel: 'walk-in', dineIn: true });
    s = run(cookBowl(s, +1), { type: 'SERVE' });
    s = run(cookBowl(s), { type: 'SERVE' });
    s = tickUntil(s, (x) => x.tables.every((t) => t === null));
    expect(s.reviewLog).toHaveLength(2);
    expect(new Set(s.reviewLog.map((r) => r.id)).size).toBe(2);
    expect(DISH_BY_ID[s.reviewLog[0].dishId]).toBeDefined();
  });
});
