import type { Ingredient, IngredientId } from '../types';

// Giá nhập tính theo gói. Giá vốn một phần = packPrice / packSize.
export const INGREDIENTS: Record<IngredientId, Ingredient> = {
  cup: { id: 'cup', name: 'Ly + nắp + ống hút', emoji: '🥤', kind: 'supply', color: '#ffffff', packSize: 50, packPrice: 150_000 },

  black_tea: { id: 'black_tea', name: 'Hồng trà', emoji: '🫖', kind: 'tea', color: '#9a4a1f', packSize: 30, packPrice: 90_000 },
  green_tea: { id: 'green_tea', name: 'Trà xanh nhài', emoji: '🍃', kind: 'tea', color: '#b5c96a', packSize: 30, packPrice: 90_000 },
  oolong: { id: 'oolong', name: 'Trà ô long', emoji: '🍂', kind: 'tea', color: '#c58b3c', packSize: 30, packPrice: 120_000 },
  matcha: { id: 'matcha', name: 'Bột matcha', emoji: '🍵', kind: 'flavor', color: '#6f9a3a', packSize: 20, packPrice: 140_000 },
  taro: { id: 'taro', name: 'Bột khoai môn', emoji: '🍠', kind: 'flavor', color: '#a77fc7', packSize: 20, packPrice: 100_000 },
  cocoa: { id: 'cocoa', name: 'Bột cacao', emoji: '🍫', kind: 'flavor', color: '#5b3a24', packSize: 20, packPrice: 100_000 },
  milk: { id: 'milk', name: 'Sữa tươi', emoji: '🥛', kind: 'milk', color: '#f7f3ea', packSize: 20, packPrice: 100_000 },
  creamer: { id: 'creamer', name: 'Bột kem béo', emoji: '🍶', kind: 'milk', color: '#eadcc0', packSize: 40, packPrice: 120_000 },
  brown_sugar: { id: 'brown_sugar', name: 'Đường đen', emoji: '🍯', kind: 'flavor', color: '#6b3415', packSize: 30, packPrice: 90_000 },
  passion: { id: 'passion', name: 'Chanh dây', emoji: '🍋', kind: 'flavor', color: '#f2c230', packSize: 20, packPrice: 80_000 },
  strawberry: { id: 'strawberry', name: 'Mứt dâu', emoji: '🍓', kind: 'flavor', color: '#e8506a', packSize: 20, packPrice: 100_000 },
  peach: { id: 'peach', name: 'Đào miếng', emoji: '🍑', kind: 'flavor', color: '#f8a46a', packSize: 20, packPrice: 120_000 },
  cheese_foam: { id: 'cheese_foam', name: 'Kem cheese', emoji: '🧀', kind: 'topping', color: '#fff4cf', packSize: 20, packPrice: 140_000 },

  pearl_black: { id: 'pearl_black', name: 'Trân châu đen', emoji: '⚫', kind: 'topping', color: '#2a1a12', packSize: 40, packPrice: 80_000 },
  pearl_white: { id: 'pearl_white', name: 'Trân châu trắng', emoji: '⚪', kind: 'topping', color: '#f4f1ea', packSize: 40, packPrice: 100_000 },
  pearl_golden: { id: 'pearl_golden', name: 'Trân châu hoàng kim', emoji: '🟡', kind: 'topping', color: '#e6a821', packSize: 40, packPrice: 120_000 },
  coconut_jelly: { id: 'coconut_jelly', name: 'Thạch dừa', emoji: '🥥', kind: 'topping', color: '#f2f7f2', packSize: 40, packPrice: 80_000 },
  coffee_jelly: { id: 'coffee_jelly', name: 'Thạch cà phê', emoji: '☕', kind: 'topping', color: '#3d2416', packSize: 40, packPrice: 80_000 },
  aloe: { id: 'aloe', name: 'Nha đam', emoji: '🌿', kind: 'topping', color: '#d8f0c8', packSize: 40, packPrice: 80_000 },
  pudding: { id: 'pudding', name: 'Pudding trứng', emoji: '🥚', kind: 'topping', color: '#f6d36b', packSize: 20, packPrice: 100_000 },
  flan: { id: 'flan', name: 'Bánh flan', emoji: '🍮', kind: 'topping', color: '#e9b24a', packSize: 20, packPrice: 120_000 },
};

export const INGREDIENT_IDS = Object.keys(INGREDIENTS) as IngredientId[];

export function unitCost(id: IngredientId): number {
  const ing = INGREDIENTS[id];
  return Math.round(ing.packPrice / ing.packSize);
}
