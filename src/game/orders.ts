import {
  ICE_LABELS,
  ICE_WEIGHTS,
  MAX_TIP_RATE,
  SUGAR_LABELS,
  SUGAR_WEIGHTS,
  TOPPING_COUNT_WEIGHTS,
} from './constants';
import { INGREDIENTS } from './data/ingredients';
import { DRINK_BY_ID, TOPPING_BY_ID, unlockedDrinks, unlockedToppings } from './data/menu';
import type { Rng } from './rng';
import type { Cup, IngredientId, Order, Recipe } from './types';

const NAMES = [
  'Lan', 'Minh', 'Hùng', 'Thảo', 'Vy', 'Nam', 'Linh', 'Tuấn', 'Trang', 'Khoa',
  'Mai', 'Phúc', 'Ngọc', 'Bảo', 'Hà', 'Quân', 'Yến', 'Đạt', 'My', 'Long',
];
const AVATARS = ['👩', '👨', '👧', '👦', '👩‍🦰', '👨‍🦱', '👱‍♀️', '🧑', '👵', '👴', '👩‍🎓', '🧑‍💻', '👮‍♀️', '🧕'];

export function randomCustomerLook(rng: Rng): { name: string; avatar: string } {
  return { name: rng.pick(NAMES), avatar: rng.pick(AVATARS) };
}

export function generateOrder(rng: Rng, totalRevenue: number): Order {
  const drink = rng.pick(unlockedDrinks(totalRevenue));
  const available = unlockedToppings(totalRevenue).filter((t) => !(t.id in drink.recipe));
  const countKey = rng.weighted({ '0': TOPPING_COUNT_WEIGHTS[0], '1': TOPPING_COUNT_WEIGHTS[1], '2': TOPPING_COUNT_WEIGHTS[2] });
  const count = Math.min(Number(countKey), available.length);

  const toppings: IngredientId[] = [];
  const pool = [...available];
  for (let i = 0; i < count; i++) {
    const idx = rng.int(0, pool.length - 1);
    toppings.push(pool[idx].id);
    pool.splice(idx, 1);
  }

  const order: Omit<Order, 'price'> = {
    drinkId: drink.id,
    toppings,
    ice: rng.weighted(ICE_WEIGHTS),
    sugar: rng.weighted(SUGAR_WEIGHTS),
  };
  return { ...order, price: orderPrice(order) };
}

export function orderPrice(order: Pick<Order, 'drinkId' | 'toppings'>): number {
  const drink = DRINK_BY_ID[order.drinkId];
  return order.toppings.reduce((sum, t) => sum + (TOPPING_BY_ID[t]?.price ?? 0), drink.price);
}

/** Công thức đầy đủ của đơn = công thức món + topping khách gọi thêm. */
export function requiredRecipe(order: Order): Recipe {
  const recipe: Recipe = { ...DRINK_BY_ID[order.drinkId].recipe };
  for (const t of order.toppings) recipe[t] = (recipe[t] ?? 0) + 1;
  return recipe;
}

export function cupCounts(cup: Cup): Recipe {
  const counts: Recipe = {};
  for (const id of cup.layers) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

export type CupResult = 'perfect' | 'wrong-option' | 'wrong-drink';

export function evaluateCup(cup: Cup, order: Order): CupResult {
  const need = requiredRecipe(order);
  const have = cupCounts(cup);
  const ids = new Set([...Object.keys(need), ...Object.keys(have)] as IngredientId[]);
  for (const id of ids) {
    if ((need[id] ?? 0) !== (have[id] ?? 0)) return 'wrong-drink';
  }
  if (cup.ice !== order.ice || cup.sugar !== order.sugar) return 'wrong-option';
  return 'perfect';
}

/** Tip tỉ lệ với thời gian chờ còn lại và danh tiếng, làm tròn tới 1.000₫. */
export function computeTip(price: number, patienceLeftRatio: number, reputation: number): number {
  const ratio = Math.max(0, Math.min(1, patienceLeftRatio));
  const repFactor = 0.5 + reputation / 100;
  return Math.round((price * MAX_TIP_RATE * ratio * repFactor) / 1000) * 1000;
}

/** Mô tả ngắn để hiện thông báo: "Trà sữa matcha + Trân châu trắng (ít đá, ít ngọt)". */
export function describeOrder(order: Order): string {
  const drink = DRINK_BY_ID[order.drinkId];
  const tops = order.toppings.map((t) => INGREDIENTS[t].name).join(', ');
  const opts = [ICE_LABELS[order.ice], SUGAR_LABELS[order.sugar]].join(', ').toLowerCase();
  return `${drink.name}${tops ? ` + ${tops}` : ''} (${opts})`;
}
