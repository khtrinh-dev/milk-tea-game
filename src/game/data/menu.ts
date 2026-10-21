import { BOWL_PROFIT } from '../constants';
import type { Dish, DrinkItem, IngredientId, Recipe } from '../types';
import { INGREDIENT_IDS, INGREDIENTS, unitCost } from './ingredients';

/** Giá vốn nguyên liệu của một công thức. */
export function recipeCost(recipe: Recipe): number {
  return (Object.entries(recipe) as [IngredientId, number][]).reduce((sum, [id, n]) => sum + unitCost(id) * n, 0);
}

function dish(id: string, name: string, short: string, emoji: string, recipe: Recipe, unlockRevenue: number): Dish {
  return { id, name, short, emoji, recipe, price: recipeCost(recipe) + BOWL_PROFIT, unlockRevenue };
}

/** Phần nền món nào cũng có: mì, kim chi, cải tím, súp lơ, nấm kim châm, xúc xích. */
const BASE: Recipe = { noodle: 1, kimchi: 1, purple_cabbage: 1, cauliflower: 1, enoki: 1, sausage: 1 };

// Thực đơn. `recipe` là số phần mỗi nguyên liệu cho vào tô; độ cay khách chọn riêng (shot ớt).
export const DISHES: Dish[] = [
  dish('kimchi', 'Mì cay kim chi', 'Kim chi', '🌶️', { ...BASE, fishball: 1 }, 0),
  dish('beef', 'Mì cay bò', 'Bò', '🥩', { ...BASE, beef: 1 }, 0),
  dish('seafood', 'Mì cay hải sản', 'Hải sản', '🦐', { ...BASE, fishball: 1, shrimp: 1, squid: 1 }, 1_000_000),
  dish('combo', 'Mì cay thập cẩm', 'Thập cẩm', '🔥', { ...BASE, fishball: 1, shrimp: 1, squid: 1, beef: 1 }, 3_000_000),
];

/** Nước uống: vốn 10k, bán 15k. */
export const DRINKS: DrinkItem[] = [
  { id: 'coca', price: 15_000, unlockRevenue: 0 },
  { id: 'pepsi', price: 15_000, unlockRevenue: 0 },
  { id: 'fanta', price: 15_000, unlockRevenue: 0 },
  { id: 'sevenup', price: 15_000, unlockRevenue: 0 },
  { id: 'milk', price: 15_000, unlockRevenue: 0 },
];

export const DISH_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

export const DRINK_BY_ID = Object.fromEntries(DRINKS.map((d) => [d.id, d])) as Partial<Record<IngredientId, DrinkItem>>;

export function unlockedDishes(totalRevenue: number): Dish[] {
  return DISHES.filter((d) => totalRevenue >= d.unlockRevenue);
}

export function unlockedDrinks(totalRevenue: number): DrinkItem[] {
  return DRINKS.filter((d) => totalRevenue >= d.unlockRevenue);
}

/** Nguyên liệu xuất hiện ở quầy, theo thứ tự hiển thị: mọi nguyên liệu nấu + nước uống đã mở khóa. */
export function stationIngredients(totalRevenue: number): IngredientId[] {
  const drinks = new Set(unlockedDrinks(totalRevenue).map((d) => d.id));
  return INGREDIENT_IDS.filter((id) => INGREDIENTS[id].kind !== 'drink' || drinks.has(id));
}
