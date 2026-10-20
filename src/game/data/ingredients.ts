import type { Ingredient, IngredientId, IngredientKind } from '../types';

/** Mỗi gói nhập hàng có 10 phần. */
const PACK_SIZE = 10;

/** Khai báo nguyên liệu theo giá vốn một phần; giá gói = giá phần × số phần. */
function ingredient(id: IngredientId, name: string, emoji: string, kind: IngredientKind, color: string, unitPrice: number): Ingredient {
  return { id, name, emoji, kind, color, packSize: PACK_SIZE, packPrice: unitPrice * PACK_SIZE };
}

export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  noodle: ingredient('noodle', 'Mì', '🍜', 'noodle', '#f3c64f', 15_000),

  squid: ingredient('squid', 'Mực', '🦑', 'topping', '#f7ece0', 10_000),
  shrimp: ingredient('shrimp', 'Tôm', '🦐', 'topping', '#ff8a4c', 15_000),
  fishball: ingredient('fishball', 'Cá viên chiên', '🍢', 'topping', '#c98a45', 10_000),
  beef: ingredient('beef', 'Bò', '🥩', 'topping', '#a8433a', 30_000),
  sausage: ingredient('sausage', 'Xúc xích', '🌭', 'topping', '#e0584a', 10_000),

  kimchi: ingredient('kimchi', 'Kim chi', '🥬', 'veggie', '#e2452f', 5_000),
  enoki: ingredient('enoki', 'Nấm kim châm', '🍄', 'veggie', '#f6f0dc', 10_000),
  purple_cabbage: ingredient('purple_cabbage', 'Cải tím', '🟣', 'veggie', '#8e3fa0', 5_000),
  cauliflower: ingredient('cauliflower', 'Súp lơ', '🥦', 'veggie', '#5fa83f', 5_000),

  coca: ingredient('coca', 'Coca Cola', '🥤', 'drink', '#d81e1e', 10_000),
  milk: ingredient('milk', 'Sữa', '🥛', 'drink', '#f4f6fb', 10_000),
};

export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

/** Giá vốn một phần. */
export function unitCost(id: IngredientId): number {
  const ing = INGREDIENTS[id];
  return Math.round(ing.packPrice / ing.packSize);
}
