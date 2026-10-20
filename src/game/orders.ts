import {
  DINE_IN_CHANCE,
  DRINK_ORDER_WEIGHTS,
  GRAB_ORDER_CHANCE,
  MAX_TIP_RATE,
  SPICE_BIG_MISS,
  SPICE_BIG_MISS_PAY_RATE,
  SPICE_SMALL_MISS_PAY_RATE,
  SPICE_WEIGHTS,
} from './constants';
import { ARCHETYPES, HAIR_COLORS, SKIN_TONES } from './data/customers';
import { INGREDIENTS, unitCost } from './data/ingredients';
import { DISH_BY_ID, DRINK_BY_ID, unlockedDishes, unlockedDrinks } from './data/menu';
import type { Rng } from './rng';
import type { ArchetypeId, Bowl, CustomerLook, IngredientId, Order, OrderChannel, Reaction, Recipe } from './types';

/** Khách vào quán: mọi kiểu khách trừ tài xế Grab (anh Grab chỉ tới lấy đơn đặt qua app). */
const WALK_IN_WEIGHTS = Object.fromEntries(
  Object.values(ARCHETYPES)
    .filter((a) => a.id !== 'grab')
    .map((a) => [a.id, a.weight]),
) as Record<ArchetypeId, number>;

const SPICE_LEVEL_WEIGHTS = Object.fromEntries(SPICE_WEIGHTS.map((w, level) => [String(level), w]));

export function randomCustomerLook(rng: Rng, channel: OrderChannel = 'walk-in'): { name: string; look: CustomerLook } {
  const archetype = ARCHETYPES[channel === 'grab' ? 'grab' : rng.weighted(WALK_IN_WEIGHTS)];
  return {
    name: rng.pick(archetype.names),
    look: { archetype: archetype.id, skin: rng.int(0, SKIN_TONES - 1), hair: rng.int(0, HAIR_COLORS - 1) },
  };
}

/** "Anh Grab Tuấn", "Sinh viên UEH Linh"… (đơn Grab: chính là tài xế tới lấy đơn) */
export function customerTitle(customer: { name: string; look: CustomerLook }): string {
  return `${ARCHETYPES[customer.look.archetype].title} ${customer.name}`;
}

export function generateOrder(rng: Rng, totalRevenue: number): Order {
  const channel: OrderChannel = rng.next() < GRAB_ORDER_CHANCE ? 'grab' : 'walk-in';
  const dineIn = channel === 'walk-in' && rng.next() < DINE_IN_CHANCE;
  const dish = rng.pick(unlockedDishes(totalRevenue));
  const available = new Set(unlockedDrinks(totalRevenue).map((d) => d.id as string));
  const weights = Object.fromEntries(
    Object.entries(DRINK_ORDER_WEIGHTS).filter(([id]) => id === 'none' || available.has(id)),
  );
  const drink = rng.weighted(weights);
  const order: Omit<Order, 'price'> = {
    channel,
    dineIn,
    dishId: dish.id,
    drinks: drink === 'none' ? [] : [drink as IngredientId],
    spice: Number(rng.weighted(SPICE_LEVEL_WEIGHTS)),
  };
  return { ...order, price: orderPrice(order) };
}

export function orderPrice(order: Pick<Order, 'dishId' | 'drinks'>): number {
  const dish = DISH_BY_ID[order.dishId];
  return order.drinks.reduce((sum, d) => sum + (DRINK_BY_ID[d]?.price ?? 0), dish.price);
}

/** Những thứ phải có trên khay = công thức món + nước uống khách gọi kèm (không tính ớt). */
export function requiredRecipe(order: Order): Recipe {
  const recipe: Recipe = { ...DISH_BY_ID[order.dishId].recipe };
  for (const d of order.drinks) recipe[d] = (recipe[d] ?? 0) + 1;
  return recipe;
}

/** Nguyên liệu và nước đã bỏ lên khay theo thứ tự (bỏ qua shot ớt). */
export function bowlItems(bowl: Bowl): IngredientId[] {
  return bowl.steps.filter((s): s is IngredientId => s !== 'chili');
}

/** Phần bỏ vào tô (không tính nước uống để bên cạnh). */
export function bowlContents(bowl: Bowl): IngredientId[] {
  return bowlItems(bowl).filter((id) => INGREDIENTS[id].kind !== 'drink');
}

export function bowlDrinks(bowl: Bowl): IngredientId[] {
  return bowlItems(bowl).filter((id) => INGREDIENTS[id].kind === 'drink');
}

/** Số shot ớt đã cho vào tô = cấp độ cay của tô. */
export function chiliShots(bowl: Bowl): number {
  return bowl.steps.filter((s) => s === 'chili').length;
}

export function bowlCounts(bowl: Bowl): Recipe {
  const counts: Recipe = {};
  for (const id of bowlItems(bowl)) counts[id] = (counts[id] ?? 0) + 1;
  return counts;
}

/** Giá vốn nguyên liệu đang có trên khay – số tiền bị trừ khi phải bỏ tô. */
export function bowlCost(bowl: Bowl): number {
  return bowlItems(bowl).reduce((sum, id) => sum + unitCost(id), 0);
}

/** Chấm tô: sai nguyên liệu/nước → 'bad'; đúng món thì cảm nhận theo độ lệch cay. */
export function evaluateBowl(bowl: Bowl, order: Order): Reaction {
  const need = requiredRecipe(order);
  const have = bowlCounts(bowl);
  const ids = new Set([...Object.keys(need), ...Object.keys(have)] as IngredientId[]);
  for (const id of ids) {
    if ((need[id] ?? 0) !== (have[id] ?? 0)) return 'bad';
  }
  const diff = chiliShots(bowl) - order.spice;
  if (diff === 0) return 'delicious';
  if (diff > 0) return diff >= SPICE_BIG_MISS ? 'very-spicy' : 'spicy';
  return -diff >= SPICE_BIG_MISS ? 'not-spicy' : 'mild';
}

/** Tỉ lệ giá khách chịu trả theo cảm nhận (sai món thì không trả). */
export function payRate(reaction: Reaction): number {
  switch (reaction) {
    case 'delicious':
      return 1;
    case 'spicy':
    case 'mild':
      return SPICE_SMALL_MISS_PAY_RATE;
    case 'very-spicy':
    case 'not-spicy':
      return SPICE_BIG_MISS_PAY_RATE;
    case 'bad':
      return 0;
  }
}

/** Tip tỉ lệ với thời gian chờ còn lại, danh tiếng và độ hào phóng của khách, làm tròn tới 1.000₫. */
export function computeTip(price: number, patienceLeftRatio: number, reputation: number, tipMul = 1): number {
  const ratio = Math.max(0, Math.min(1, patienceLeftRatio));
  const repFactor = 0.5 + reputation / 100;
  return Math.round((price * MAX_TIP_RATE * ratio * repFactor * tipMul) / 1000) * 1000;
}

export function spiceLabel(level: number): string {
  return level === 0 ? 'Không cay' : `Cay cấp ${level}`;
}

export function serviceLabel(order: Pick<Order, 'channel' | 'dineIn'>): string {
  if (order.channel === 'grab') return 'Grab';
  return order.dineIn ? 'Ăn tại chỗ' : 'Mang về';
}

/** Mô tả ngắn để hiện thông báo: "Mì cay bò cấp 3 + Coca Cola (mang về)". */
export function describeOrder(order: Order): string {
  const dish = DISH_BY_ID[order.dishId];
  const drinks = order.drinks.map((d) => INGREDIENTS[d].name).join(', ');
  const spice = order.spice === 0 ? 'không cay' : `cấp ${order.spice}`;
  return `${dish.name} ${spice}${drinks ? ` + ${drinks}` : ''} (${serviceLabel(order).toLowerCase()})`;
}
