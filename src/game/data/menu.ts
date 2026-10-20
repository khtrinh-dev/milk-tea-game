import type { Drink, IngredientId, Topping } from '../types';

// Thực đơn. `recipe` là số lần bấm mỗi nguyên liệu để pha một ly.
// Topping khách gọi thêm sẽ được cộng vào công thức khi tạo đơn.
export const DRINKS: Drink[] = [
  { id: 'classic', name: 'Trà sữa truyền thống', emoji: '🧋', price: 25_000, recipe: { black_tea: 1, creamer: 1 }, unlockRevenue: 0 },
  { id: 'jasmine', name: 'Trà sữa nhài', emoji: '🧋', price: 25_000, recipe: { green_tea: 1, creamer: 1 }, unlockRevenue: 0 },
  { id: 'matcha', name: 'Trà sữa matcha', emoji: '🍵', price: 35_000, recipe: { matcha: 1, milk: 1 }, unlockRevenue: 0 },
  { id: 'taro', name: 'Trà sữa khoai môn', emoji: '💜', price: 30_000, recipe: { taro: 1, creamer: 1 }, unlockRevenue: 0 },
  { id: 'passion', name: 'Trà chanh dây', emoji: '🍋', price: 25_000, recipe: { green_tea: 1, passion: 1 }, unlockRevenue: 0 },
  { id: 'oolong', name: 'Trà sữa ô long', emoji: '🍂', price: 32_000, recipe: { oolong: 1, milk: 1 }, unlockRevenue: 300_000 },
  { id: 'peach', name: 'Trà đào', emoji: '🍑', price: 30_000, recipe: { black_tea: 1, peach: 1 }, unlockRevenue: 600_000 },
  { id: 'cocoa', name: 'Socola sữa', emoji: '🍫', price: 32_000, recipe: { cocoa: 1, milk: 1 }, unlockRevenue: 1_000_000 },
  { id: 'brown_sugar', name: 'Sữa tươi trân châu đường đen', emoji: '🐯', price: 38_000, recipe: { milk: 1, brown_sugar: 1, pearl_black: 1 }, unlockRevenue: 1_500_000 },
  { id: 'strawberry', name: 'Trà sữa dâu', emoji: '🍓', price: 32_000, recipe: { green_tea: 1, strawberry: 1, milk: 1 }, unlockRevenue: 2_500_000 },
  { id: 'macchiato', name: 'Hồng trà macchiato', emoji: '🧀', price: 35_000, recipe: { black_tea: 1, cheese_foam: 1 }, unlockRevenue: 4_000_000 },
  { id: 'matcha_cheese', name: 'Matcha đậm kem cheese', emoji: '💚', price: 49_000, recipe: { matcha: 2, milk: 1, cheese_foam: 1 }, unlockRevenue: 6_000_000 },
];

export const TOPPINGS: Topping[] = [
  { id: 'pearl_black', price: 5_000, unlockRevenue: 0 },
  { id: 'pearl_white', price: 6_000, unlockRevenue: 0 },
  { id: 'coconut_jelly', price: 5_000, unlockRevenue: 0 },
  { id: 'pudding', price: 8_000, unlockRevenue: 800_000 },
  { id: 'aloe', price: 5_000, unlockRevenue: 1_200_000 },
  { id: 'coffee_jelly', price: 5_000, unlockRevenue: 2_000_000 },
  { id: 'pearl_golden', price: 7_000, unlockRevenue: 3_000_000 },
  { id: 'cheese_foam', price: 10_000, unlockRevenue: 4_000_000 },
  { id: 'flan', price: 10_000, unlockRevenue: 5_000_000 },
];

export const DRINK_BY_ID: Record<string, Drink> = Object.fromEntries(DRINKS.map((d) => [d.id, d]));

export const TOPPING_BY_ID = Object.fromEntries(TOPPINGS.map((t) => [t.id, t])) as Partial<
  Record<IngredientId, Topping>
>;

export function unlockedDrinks(totalRevenue: number): Drink[] {
  return DRINKS.filter((d) => totalRevenue >= d.unlockRevenue);
}

export function unlockedToppings(totalRevenue: number): Topping[] {
  return TOPPINGS.filter((t) => totalRevenue >= t.unlockRevenue);
}

/** Nguyên liệu xuất hiện ở quầy pha chế (thuộc món/topping đã mở khóa), theo thứ tự hiển thị. */
export function unlockedIngredients(totalRevenue: number): IngredientId[] {
  const set = new Set<IngredientId>();
  for (const d of unlockedDrinks(totalRevenue)) {
    for (const id of Object.keys(d.recipe) as IngredientId[]) set.add(id);
  }
  for (const t of unlockedToppings(totalRevenue)) set.add(t.id);
  return [...set];
}
