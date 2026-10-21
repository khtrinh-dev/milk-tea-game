import { describe, expect, it } from 'vitest';
import { BOWL_PROFIT, MAX_SPICE } from './constants';
import { ARCHETYPES } from './data/customers';
import { unitCost } from './data/ingredients';
import { DISH_BY_ID, DRINK_BY_ID, recipeCost } from './data/menu';
import {
  bowlContents,
  bowlCost,
  bowlDrinks,
  chiliShots,
  computeTip,
  customerTitle,
  describeOrder,
  evaluateBowl,
  generateOrder,
  orderPrice,
  partyTitle,
  payRate,
  randomCustomerLook,
  requiredRecipe,
} from './orders';
import { createRng } from './rng';
import type { Bowl, BowlStep, Order } from './types';

const beefOrder: Order = {
  channel: 'walk-in',
  dineIn: false,
  dishId: 'beef',
  drinks: ['coca'],
  spice: 3,
  price: orderPrice({ dishId: 'beef', drinks: ['coca'] }),
};

const BEEF_BOWL: BowlStep[] = ['noodle', 'kimchi', 'purple_cabbage', 'beef', 'cauliflower', 'enoki', 'sausage', 'coca'];
const chili = (n: number): BowlStep[] => Array.from({ length: n }, () => 'chili');

describe('thực đơn', () => {
  it('giá mỗi tô = giá vốn nguyên liệu + 50k', () => {
    expect(BOWL_PROFIT).toBe(50_000);
    expect(DISH_BY_ID.kimchi.price).toBe(60_000 + 50_000);
    expect(DISH_BY_ID.beef.price).toBe(80_000 + 50_000);
    expect(DISH_BY_ID.seafood.price).toBe(85_000 + 50_000);
    expect(DISH_BY_ID.combo.price).toBe(115_000 + 50_000);
    for (const dish of Object.values(DISH_BY_ID)) expect(dish.price - recipeCost(dish.recipe)).toBe(BOWL_PROFIT);
  });

  it('món nào cũng có cải tím và kim chi', () => {
    for (const dish of Object.values(DISH_BY_ID)) expect(dish.recipe).toMatchObject({ purple_cabbage: 1, kimchi: 1 });
  });

  it('nước uống vốn 10k, bán 15k', () => {
    for (const id of ['coca', 'pepsi', 'fanta', 'sevenup', 'milk'] as const) {
      expect(unitCost(id)).toBe(10_000);
      expect(DRINK_BY_ID[id]?.price).toBe(15_000);
    }
  });
});

describe('orders', () => {
  it('tính giá = giá món + nước', () => {
    expect(beefOrder.price).toBe(130_000 + 15_000);
  });

  it('khay cần có món + nước khách gọi', () => {
    expect(requiredRecipe(beefOrder)).toEqual({ noodle: 1, kimchi: 1, purple_cabbage: 1, beef: 1, cauliflower: 1, enoki: 1, sausage: 1, coca: 1 });
  });

  it('chấm tô theo độ lệch cay; thứ tự bỏ nguyên liệu không quan trọng', () => {
    const bowl = (steps: BowlStep[]): Bowl => ({ steps });
    expect(evaluateBowl(bowl([...chili(3), ...BEEF_BOWL].reverse()), beefOrder)).toBe('delicious');
    expect(evaluateBowl(bowl([...BEEF_BOWL, ...chili(4)]), beefOrder)).toBe('spicy');
    expect(evaluateBowl(bowl([...BEEF_BOWL, ...chili(7)]), beefOrder)).toBe('very-spicy');
    expect(evaluateBowl(bowl([...BEEF_BOWL, ...chili(1)]), beefOrder)).toBe('mild');
    expect(evaluateBowl(bowl(BEEF_BOWL), beefOrder)).toBe('not-spicy');
  });

  it('thiếu/thừa nguyên liệu, quên nước, quên cải tím hay nhầm nước đều là sai món', () => {
    const ok = [...BEEF_BOWL, ...chili(3)];
    expect(evaluateBowl({ steps: ok.filter((s) => s !== 'coca') }, beefOrder)).toBe('bad');
    expect(evaluateBowl({ steps: ok.map((s) => (s === 'coca' ? 'pepsi' : s)) }, beefOrder)).toBe('bad');
    expect(evaluateBowl({ steps: ok.filter((s) => s !== 'purple_cabbage') }, beefOrder)).toBe('bad');
    expect(evaluateBowl({ steps: ok.filter((s) => s !== 'enoki') }, beefOrder)).toBe('bad');
    expect(evaluateBowl({ steps: [...ok, 'purple_cabbage'] }, beefOrder)).toBe('bad');
    expect(evaluateBowl({ steps: [...ok, 'beef'] }, beefOrder)).toBe('bad');
  });

  it('tách tô, nước và shot ớt; giá vốn khay tính cả nước', () => {
    const bowl: Bowl = { steps: ['chili', 'noodle', 'milk', 'chili', 'beef'] };
    expect(bowlContents(bowl)).toEqual(['noodle', 'beef']);
    expect(bowlDrinks(bowl)).toEqual(['milk']);
    expect(chiliShots(bowl)).toBe(2);
    expect(bowlCost(bowl)).toBe(15_000 + 10_000 + 30_000);
  });

  it('lệch cay càng nhiều khách trả càng ít, sai món không trả', () => {
    expect(payRate('delicious')).toBe(1);
    expect(payRate('spicy')).toBeLessThan(1);
    expect(payRate('very-spicy')).toBeLessThan(payRate('spicy'));
    expect(payRate('not-spicy')).toBeLessThan(payRate('mild'));
    expect(payRate('bad')).toBe(0);
  });

  it('sinh khách đa dạng với tên đúng kiểu khách; anh Grab chỉ tới lấy đơn Grab', () => {
    const rng = createRng(7);
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const c = randomCustomerLook(rng);
      const archetype = ARCHETYPES[c.look.archetype];
      expect(archetype.names).toContain(c.name);
      expect(customerTitle(c)).toBe(`${archetype.title} ${c.name}`);
      seen.add(c.look.archetype);
    }
    expect(seen.has('grab')).toBe(false);
    expect(seen.size).toBe(Object.keys(ARCHETYPES).length - 1);
    expect(randomCustomerLook(rng, 'grab').look.archetype).toBe('grab');
  });

  it('đơn đến từ Grab (luôn mang về) hoặc khách vào quán (ăn tại chỗ / mang về)', () => {
    const rng = createRng(3);
    const kinds = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const order = generateOrder(rng, 0);
      if (order.channel === 'grab') expect(order.dineIn).toBe(false);
      kinds.add(`${order.channel}-${order.dineIn}`);
    }
    expect(kinds).toEqual(new Set(['grab-false', 'walk-in-true', 'walk-in-false']));
  });

  it('nhóm bạn: truyền sẵn kiểu phục vụ thì mọi đơn theo đúng kiểu đó', () => {
    const rng = createRng(5);
    for (let i = 0; i < 50; i++) expect(generateOrder(rng, 0, { channel: 'walk-in', dineIn: true })).toMatchObject({ channel: 'walk-in', dineIn: true });
  });

  it('chỉ sinh đơn từ món đã mở khóa, cấp cay 0..7, tối đa 1 nước', () => {
    const rng = createRng(42);
    const spices = new Set<number>();
    const drinks = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const order = generateOrder(rng, 0);
      expect(DISH_BY_ID[order.dishId].unlockRevenue).toBe(0);
      expect(order.spice).toBeGreaterThanOrEqual(0);
      expect(order.spice).toBeLessThanOrEqual(MAX_SPICE);
      expect(order.drinks.length).toBeLessThanOrEqual(1);
      expect(order.price).toBe(orderPrice(order));
      spices.add(order.spice);
      drinks.add(order.drinks[0] ?? 'none');
    }
    expect(spices.size).toBe(MAX_SPICE + 1);
    expect(drinks).toEqual(new Set(['none', 'coca', 'pepsi', 'fanta', 'sevenup', 'milk']));
  });

  it('tip làm tròn nghìn và không âm', () => {
    expect(computeTip(100_000, 1, 50) % 1000).toBe(0);
    expect(computeTip(100_000, -1, 50)).toBe(0);
    expect(computeTip(100_000, 1, 100)).toBeGreaterThan(computeTip(100_000, 1, 0));
    expect(computeTip(100_000, 1, 50, 1.8)).toBeGreaterThan(computeTip(100_000, 1, 50));
  });

  it('mô tả đơn bằng tiếng Việt', () => {
    expect(describeOrder(beefOrder)).toBe('Mì cay bò cấp 3 + Coca Cola (mang về)');
    expect(describeOrder({ ...beefOrder, drinks: [], spice: 0, dineIn: true })).toBe('Mì cay bò không cay (ăn tại chỗ)');
    expect(describeOrder({ ...beefOrder, channel: 'grab' })).toBe('Mì cay bò cấp 3 + Coca Cola (grab)');
    expect(describeOrder({ ...beefOrder, drinks: ['sevenup'] })).toBe('Mì cay bò cấp 3 + 7Up (mang về)');
  });

  it('tên lượt khách: khách lẻ theo kiểu khách, nhóm bạn theo người dẫn đầu', () => {
    const look = { archetype: 'ueh', skin: 0, hair: 0 } as const;
    expect(partyTitle({ name: 'Linh', look, partySize: 1 })).toBe('Sinh viên UEH Linh');
    expect(partyTitle({ name: 'Linh', look, partySize: 3 })).toBe('Nhóm 3 bạn của Linh');
  });
});
