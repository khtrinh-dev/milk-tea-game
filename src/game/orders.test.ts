import { describe, expect, it } from 'vitest';
import { DRINK_BY_ID } from './data/menu';
import { computeTip, describeOrder, evaluateCup, generateOrder, orderPrice, requiredRecipe } from './orders';
import { createRng } from './rng';
import type { Cup, Order } from './types';

const matchaOrder: Order = {
  drinkId: 'matcha',
  toppings: ['pearl_white'],
  ice: 'less',
  sugar: 'less',
  price: orderPrice({ drinkId: 'matcha', toppings: ['pearl_white'] }),
};

describe('orders', () => {
  it('tính giá = giá món + topping', () => {
    expect(matchaOrder.price).toBe(35_000 + 6_000);
  });

  it('công thức đơn gồm món + topping', () => {
    expect(requiredRecipe(matchaOrder)).toEqual({ matcha: 1, milk: 1, pearl_white: 1 });
  });

  it('chấm ly đúng, sai đá/đường, sai món', () => {
    const cup: Cup = { layers: ['matcha', 'pearl_white', 'milk'], ice: 'less', sugar: 'less' };
    expect(evaluateCup(cup, matchaOrder)).toBe('perfect');
    expect(evaluateCup({ ...cup, ice: 'normal' }, matchaOrder)).toBe('wrong-option');
    expect(evaluateCup({ ...cup, layers: ['matcha', 'milk'] }, matchaOrder)).toBe('wrong-drink');
    expect(evaluateCup({ ...cup, layers: [...cup.layers, 'matcha'] }, matchaOrder)).toBe('wrong-drink');
  });

  it('chỉ sinh đơn từ món đã mở khóa và topping không trùng công thức', () => {
    const rng = createRng(42);
    for (let i = 0; i < 300; i++) {
      const order = generateOrder(rng, 0);
      const drink = DRINK_BY_ID[order.drinkId];
      expect(drink.unlockRevenue).toBe(0);
      expect(order.toppings.length).toBeLessThanOrEqual(2);
      expect(new Set(order.toppings).size).toBe(order.toppings.length);
      for (const t of order.toppings) expect(t in drink.recipe).toBe(false);
    }
  });

  it('tip làm tròn nghìn và không âm', () => {
    expect(computeTip(40_000, 1, 50) % 1000).toBe(0);
    expect(computeTip(40_000, -1, 50)).toBe(0);
    expect(computeTip(40_000, 1, 100)).toBeGreaterThan(computeTip(40_000, 1, 0));
  });

  it('mô tả đơn bằng tiếng Việt', () => {
    expect(describeOrder(matchaOrder)).toBe('Trà sữa matcha + Trân châu trắng (ít đá, ít ngọt)');
  });
});
