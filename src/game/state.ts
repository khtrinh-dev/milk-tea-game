import {
  BOWL_CAPACITY,
  COOK_TIME_MS,
  DAY_LENGTH_MS,
  DINE_MAX_MS,
  DINE_MIN_MS,
  DIRT_SPOTS,
  FIRST_CUSTOMER_DELAY_MS,
  GRAB_PATIENCE_MUL,
  LAST_ORDER_BEFORE_CLOSE_MS,
  MAX_CUSTOMERS,
  MAX_DRINKS,
  MAX_SPICE,
  REP_GOOD_REVIEW,
  REVIEW_LOG_MAX,
  REP_LEFT,
  REP_PERFECT,
  REP_SPICE_BIG_MISS,
  REP_SPICE_SMALL_MISS,
  REP_WRONG_DISH,
  REVIEW_MAX_MS,
  REVIEW_MIN_MS,
  SAVE_VERSION,
  SHOP_NAME_MAX,
  SPAWN_BASE_MS,
  SPAWN_BUSY_MUL,
  SPAWN_BUSY_QUEUE,
  SPAWN_DAY_STEP_MS,
  SPAWN_FULL_RETRY_MS,
  SPAWN_IDLE_MAX_MS,
  SPAWN_JITTER,
  SPAWN_MIN_MS,
  SPAWN_REP_STEP_MS,
  STAFF_UNLOCK_REVENUE,
  STARTING_MONEY,
  STARTING_REPUTATION,
  STOCKER_CHECK_MS,
  STOCKER_THRESHOLD,
  TABLE_COUNT,
  WAITER_PATIENCE_BONUS,
  WRONG_DISH_PATIENCE_PENALTY,
} from './constants';
import { DIRT_TYPES } from './data/cleaning';
import { ARCHETYPES } from './data/customers';
import { INGREDIENT_IDS, INGREDIENTS } from './data/ingredients';
import { stationIngredients, unlockedDishes, unlockedDrinks } from './data/menu';
import { FEEDBACK, REACTION_STARS } from './data/reactions';
import { STAFF_TYPES } from './data/staff';
import { formatVND } from './money';
import {
  bowlContents,
  bowlCost,
  bowlDrinks,
  bowlItems,
  chiliShots,
  computeTip,
  customerTitle,
  describeOrder,
  evaluateBowl,
  generateOrder,
  payRate,
  randomCustomerLook,
  requiredRecipe,
} from './orders';
import { createRng, type Rng } from './rng';
import type {
  Bowl,
  Customer,
  DayStats,
  Diner,
  DirtKind,
  DirtSpot,
  GameEventInput,
  GameState,
  IngredientId,
  Reaction,
  Recipe,
  ReviewEntry,
  ServiceKind,
  ShopInfo,
  StaffRole,
} from './types';

export type GameAction =
  | { type: 'TICK'; dt: number }
  | { type: 'CLEAN'; id: number }
  /** Đổi tên quán – làm được bất cứ lúc nào. */
  | { type: 'RENAME_SHOP'; name: string }
  | { type: 'OPEN_SHOP' }
  | { type: 'SELECT_CUSTOMER'; id: number }
  | { type: 'ADD_INGREDIENT'; id: IngredientId }
  | { type: 'ADD_CHILI' }
  /** Bớt 1 phần nguyên liệu (hoặc 1 chai nước) đã bỏ dư – trả lại kho. */
  | { type: 'REMOVE_INGREDIENT'; id: IngredientId }
  /** Bớt 1 shot ớt. */
  | { type: 'REMOVE_CHILI' }
  | { type: 'UNDO' }
  | { type: 'DISCARD' }
  | { type: 'SERVE' }
  | { type: 'BUY_PACK'; id: IngredientId; packs?: number }
  | { type: 'HIRE'; role: StaffRole }
  | { type: 'FIRE'; role: StaffRole }
  | { type: 'NEXT_DAY' }
  | { type: 'RESET'; seed: number; shop: ShopInfo };

const MAX_EVENTS = 30;

export function emptyBowl(): Bowl {
  return { steps: [] };
}

function emptyDayStats(): DayStats {
  return { revenue: 0, tips: 0, spent: 0, wasted: 0, refunds: 0, served: 0, lost: 0, wrong: 0 };
}

const DIRT_WEIGHTS = Object.fromEntries(Object.entries(DIRT_TYPES).map(([k, t]) => [k, t.weight])) as Record<DirtKind, number>;

/** Rải chỗ bẩn cho buổi sáng: rác, vết dầu ớt, mạng nhện, bụi khắp quán và chén bẩn trên bàn. */
function generateDirt(rng: Rng): DirtSpot[] {
  const spots: DirtSpot[] = [];
  const usedTables = new Set<number>();
  for (let i = 0; i < DIRT_SPOTS; i++) {
    let kind = rng.weighted(DIRT_WEIGHTS);
    let table: number | null = null;
    if (kind === 'dishes') {
      table = rng.int(0, TABLE_COUNT - 1);
      if (usedTables.has(table)) {
        kind = 'trash';
        table = null;
      } else {
        usedTables.add(table);
      }
    }
    spots.push({ id: i + 1, kind, hp: DIRT_TYPES[kind].hp, x: rng.int(8, 92), y: rng.int(12, 90), table });
  }
  return spots;
}

export function createInitialState(seed: number, shop: ShopInfo): GameState {
  const rng = createRng(seed);
  const inventory = Object.fromEntries(INGREDIENT_IDS.map((id) => [id, 0])) as Record<IngredientId, number>;
  // Vốn khởi đầu: mỗi nguyên liệu ở quầy được tặng 1 gói.
  for (const id of stationIngredients(0)) inventory[id] = INGREDIENTS[id].packSize;
  return {
    version: SAVE_VERSION,
    shop: { ...shop },
    money: STARTING_MONEY,
    totalRevenue: 0,
    reputation: STARTING_REPUTATION,
    day: 1,
    dayTimeMs: 0,
    phase: 'prep',
    inventory,
    customers: [],
    selectedCustomerId: null,
    nextCustomerInMs: FIRST_CUSTOMER_DELAY_MS,
    nextId: 1,
    bowl: emptyBowl(),
    tables: Array.from({ length: TABLE_COUNT }, () => null),
    tableQueue: [],
    reviews: [],
    reviewLog: [],
    dirt: generateDirt(rng),
    staff: { cook: 0, waiter: 0, stocker: 0 },
    cooks: [],
    stockerCooldownMs: STOCKER_CHECK_MS,
    cookWarnCooldownMs: 0,
    dayStats: emptyDayStats(),
    lastSummary: null,
    events: [],
    nextEventId: 1,
    rngSeed: rng.seed,
  };
}

export function staffUnlocked(state: Pick<GameState, 'totalRevenue'>): boolean {
  return state.totalRevenue >= STAFF_UNLOCK_REVENUE;
}

// ---------------------------------------------------------------------------
// Reducer. Mỗi action sao chép nông các phần có thể thay đổi rồi mutate bản sao,
// nên hàm vẫn thuần với input (state cũ không bị đụng tới).
// ---------------------------------------------------------------------------

function draft(state: GameState): GameState {
  return {
    ...state,
    inventory: { ...state.inventory },
    customers: state.customers.map((c) => ({ ...c })),
    bowl: { steps: [...state.bowl.steps] },
    tables: state.tables.map((d) => d && { ...d }),
    tableQueue: state.tableQueue.map((d) => ({ ...d })),
    reviews: state.reviews.map((r) => ({ ...r })),
    reviewLog: [...state.reviewLog],
    dirt: state.dirt.map((d) => ({ ...d })),
    staff: { ...state.staff },
    cooks: state.cooks.map((b) => ({ ...b })),
    dayStats: { ...state.dayStats },
    events: [...state.events],
  };
}

function emit(s: GameState, event: GameEventInput) {
  s.events.push({ ...event, id: s.nextEventId++ } as GameState['events'][number]);
  if (s.events.length > MAX_EVENTS) s.events.splice(0, s.events.length - MAX_EVENTS);
}

function changeReputation(s: GameState, delta: number) {
  s.reputation = Math.max(0, Math.min(100, s.reputation + delta));
}

/** Ghi nhận tiền khách trả và phát thông báo khi vượt ngưỡng mở khóa. */
function earn(s: GameState, amount: number, tip: number) {
  const before = s.totalRevenue;
  const total = amount + tip;
  s.money += total;
  s.totalRevenue += total;
  s.dayStats.revenue += total;
  s.dayStats.tips += tip;

  const after = s.totalRevenue;
  for (const d of unlockedDishes(after)) {
    if (d.unlockRevenue > before) emit(s, { type: 'unlock', text: `🎉 Mở khóa món mới: ${d.name}!` });
  }
  for (const d of unlockedDrinks(after)) {
    if (d.unlockRevenue > before) emit(s, { type: 'unlock', text: `🎉 Mở khóa nước uống: ${INGREDIENTS[d.id].name}!` });
  }
  if (before < STAFF_UNLOCK_REVENUE && after >= STAFF_UNLOCK_REVENUE) {
    emit(s, { type: 'unlock', text: '🎉 Doanh thu vượt 10 triệu – bạn đã có thể thuê nhân viên!' });
  }
}

function patienceFor(s: GameState, customer: Pick<Customer, 'order' | 'look'>): number {
  const items = Object.values(requiredRecipe(customer.order)).reduce((a, b) => a + (b ?? 0), 0);
  const base = 30_000 + items * 4_000 + customer.order.spice * 600;
  const archetype = ARCHETYPES[customer.look.archetype];
  const channelMul = customer.order.channel === 'grab' ? GRAB_PATIENCE_MUL : 1;
  return Math.round(base * archetype.patienceMul * channelMul * (1 + s.staff.waiter * WAITER_PATIENCE_BONUS));
}

/** Khoảng chờ tới khách kế tiếp: nhanh dần theo danh tiếng/ngày, chậm lại khi quầy đang dồn đơn. */
export function spawnInterval(s: Pick<GameState, 'reputation' | 'day' | 'customers'>, rng: Rng): number {
  const base = Math.max(
    SPAWN_MIN_MS,
    SPAWN_BASE_MS - s.reputation * SPAWN_REP_STEP_MS - (s.day - 1) * SPAWN_DAY_STEP_MS,
  );
  const busy = s.customers.length >= SPAWN_BUSY_QUEUE ? SPAWN_BUSY_MUL : 1;
  return Math.round(base * busy * (1 - SPAWN_JITTER + rng.next() * 2 * SPAWN_JITTER));
}

function spawnCustomer(s: GameState, rng: Rng) {
  const order = generateOrder(rng, s.totalRevenue);
  const look = randomCustomerLook(rng, order.channel);
  const customer: Customer = {
    id: s.nextId++,
    ...look,
    order,
    patienceMs: 0,
    waitedMs: 0,
    takenBy: null,
  };
  customer.patienceMs = patienceFor(s, customer);
  s.customers.push(customer);
  if (s.selectedCustomerId === null) s.selectedCustomerId = customer.id;
  emit(s, {
    type: 'new-order',
    customerId: customer.id,
    text:
      order.channel === 'grab'
        ? `🛵 Đơn Grab: ${describeOrder(order)} – ${customerTitle(customer)} tới lấy`
        : `🔔 ${customerTitle(customer)} gọi ${describeOrder(order)}`,
  });
}

/** Chọn đơn cũ nhất mà đầu bếp chưa nhận. */
function autoSelect(s: GameState) {
  const next = s.customers.find((c) => c.takenBy === null);
  s.selectedCustomerId = next ? next.id : null;
}

function removeCustomer(s: GameState, id: number) {
  s.customers = s.customers.filter((c) => c.id !== id);
  if (s.selectedCustomerId === id) autoSelect(s);
}

function hasStockFor(s: GameState, recipe: Recipe): boolean {
  return (Object.entries(recipe) as [IngredientId, number][]).every(([id, n]) => s.inventory[id] >= n);
}

function consume(s: GameState, recipe: Recipe) {
  for (const [id, n] of Object.entries(recipe) as [IngredientId, number][]) s.inventory[id] -= n;
}

function buyPack(s: GameState, id: IngredientId, packs: number): boolean {
  const ing = INGREDIENTS[id];
  const cost = ing.packPrice * packs;
  if (s.money < cost) return false;
  s.money -= cost;
  s.dayStats.spent += cost;
  s.inventory[id] += ing.packSize * packs;
  return true;
}

function feedbackFor(rng: Rng, reaction: Reaction): string {
  return rng.pick(FEEDBACK[reaction]);
}

function reputationFor(reaction: Reaction): number {
  switch (reaction) {
    case 'delicious':
      return REP_PERFECT;
    case 'spicy':
    case 'mild':
      return REP_SPICE_SMALL_MISS;
    case 'very-spicy':
    case 'not-spicy':
      return REP_SPICE_BIG_MISS;
    case 'bad':
      return REP_WRONG_DISH;
  }
}

const REACTION_ICON: Record<Exclude<Reaction, 'bad'>, string> = {
  delicious: '😋',
  spicy: '🥵',
  'very-spicy': '🥵',
  mild: '😒',
  'not-spicy': '😒',
};

function serviceOf(order: Pick<Customer['order'], 'channel' | 'dineIn'>): ServiceKind {
  if (order.channel === 'grab') return 'grab';
  return order.dineIn ? 'dine-in' : 'takeaway';
}

/** Ghi một lượt đánh giá vào lịch sử (giữ REVIEW_LOG_MAX lượt gần nhất). */
function logReview(s: GameState, entry: Omit<ReviewEntry, 'day' | 'stars'>) {
  s.reviewLog.push({ ...entry, day: s.day, stars: REACTION_STARS[entry.reaction] });
  if (s.reviewLog.length > REVIEW_LOG_MAX) s.reviewLog.splice(0, s.reviewLog.length - REVIEW_LOG_MAX);
}

function seatDiners(s: GameState) {
  for (let t = 0; t < s.tables.length && s.tableQueue.length > 0; t++) {
    if (s.tables[t] === null) s.tables[t] = s.tableQueue.shift()!;
  }
}

/**
 * Giao tô đúng món cho khách (người chơi tự nấu hoặc đầu bếp nấu).
 * - Ăn tại chỗ: khách vào bàn (hết bàn thì đứng chờ), ăn xong mới nhận xét và trả tiền theo độ cay.
 * - Mang về / Grab: trả đủ tiền ngay, về nhà ăn rồi đánh giá; lệch độ cay thì quán hoàn bớt tiền.
 */
function deliver(s: GameState, customer: Customer, reaction: Exclude<Reaction, 'bad'>, rng: Rng, tipFactor = 1) {
  const { order } = customer;
  const title = customerTitle(customer);
  const feedback = feedbackFor(rng, reaction);
  const paid = Math.round((order.price * payRate(reaction)) / 1000) * 1000;
  const left = 1 - customer.waitedMs / customer.patienceMs;
  const tipMul = ARCHETYPES[customer.look.archetype].tipMul * tipFactor;
  const tip = reaction === 'delicious' ? Math.round(computeTip(order.price, left, s.reputation, tipMul) / 1000) * 1000 : 0;

  s.dayStats.served += 1;
  removeCustomer(s, customer.id);

  if (order.dineIn) {
    const diner: Diner = {
      id: customer.id,
      name: customer.name,
      look: customer.look,
      dishId: order.dishId,
      spice: order.spice,
      reaction,
      feedback,
      paid,
      tip,
      eatMs: rng.int(DINE_MIN_MS, DINE_MAX_MS),
    };
    s.tableQueue.push(diner);
    seatDiners(s);
    const table = s.tables.findIndex((d) => d?.id === diner.id);
    emit(s, {
      type: 'served',
      customerId: customer.id,
      dineIn: true,
      channel: order.channel,
      amount: 0,
      text:
        table >= 0
          ? `🍜 ${title} nhận tô, mời vào bàn ${table + 1}`
          : `🪑 Hết bàn! ${title} bưng tô đứng chờ bàn trống`,
    });
    return;
  }

  earn(s, order.price, tip);
  s.reviews.push({
    id: customer.id,
    name: customer.name,
    look: customer.look,
    dishId: order.dishId,
    spice: order.spice,
    channel: order.channel,
    reaction,
    feedback,
    refund: order.price - paid,
    inMs: rng.int(REVIEW_MIN_MS, REVIEW_MAX_MS),
  });
  const money = `+${formatVND(order.price)}${tip ? ` (tip ${formatVND(tip)})` : ''}`;
  emit(s, {
    type: 'served',
    customerId: customer.id,
    dineIn: false,
    channel: order.channel,
    amount: order.price + tip,
    text: order.channel === 'grab' ? `🛵 ${title} đã lấy đơn Grab ${money}` : `🛍️ ${title} nhận mì mang về ${money}`,
  });
}

function finishMeal(s: GameState, table: number) {
  const d = s.tables[table]!;
  s.tables[table] = null;
  earn(s, d.paid, d.tip);
  changeReputation(s, reputationFor(d.reaction));
  logReview(s, { id: d.id, name: d.name, look: d.look, service: 'dine-in', dishId: d.dishId, spice: d.spice, reaction: d.reaction, feedback: d.feedback });
  const money = d.reaction === 'delicious' ? `+${formatVND(d.paid)}${d.tip ? ` (tip ${formatVND(d.tip)})` : ''}` : `chỉ trả ${formatVND(d.paid)}`;
  emit(s, {
    type: 'finished',
    customerId: d.id,
    table,
    reaction: d.reaction,
    feedback: d.feedback,
    amount: d.paid + d.tip,
    text: `${REACTION_ICON[d.reaction]} ${customerTitle(d)} ăn xong: "${d.feedback}" ${money}`,
  });
}

function deliverReview(s: GameState, index: number) {
  const [r] = s.reviews.splice(index, 1);
  changeReputation(s, r.reaction === 'delicious' ? REP_GOOD_REVIEW : reputationFor(r.reaction));
  logReview(s, {
    id: r.id,
    name: r.name,
    look: r.look,
    service: r.channel === 'grab' ? 'grab' : 'takeaway',
    dishId: r.dishId,
    spice: r.spice,
    reaction: r.reaction,
    feedback: r.feedback,
  });
  if (r.refund > 0) {
    s.money -= r.refund;
    s.dayStats.refunds += r.refund;
  }
  const who = r.channel === 'grab' ? `Khách Grab (đơn của ${customerTitle(r)})` : `${customerTitle(r)} (mang về)`;
  emit(s, {
    type: 'review',
    customerId: r.id,
    reaction: r.reaction,
    feedback: r.feedback,
    refund: r.refund,
    text: `📱 ${who}: "${r.feedback}" ${REACTION_ICON[r.reaction]}${r.refund > 0 ? ` – hoàn ${formatVND(r.refund)}` : ''}`,
  });
}

function tickTables(s: GameState, dt: number) {
  s.tables.forEach((d, table) => {
    if (!d) return;
    d.eatMs -= dt;
    if (d.eatMs <= 0) finishMeal(s, table);
  });
  seatDiners(s);
}

function tickReviews(s: GameState, dt: number) {
  for (let i = s.reviews.length - 1; i >= 0; i--) {
    s.reviews[i].inMs -= dt;
    if (s.reviews[i].inMs <= 0) deliverReview(s, i);
  }
}

function endDay(s: GameState) {
  // Đánh giá còn treo của khách mang về được tính luôn trong ngày.
  while (s.reviews.length > 0) deliverReview(s, s.reviews.length - 1);
  const salaries = (Object.keys(s.staff) as StaffRole[]).reduce(
    (sum, role) => sum + s.staff[role] * STAFF_TYPES[role].salary,
    0,
  );
  s.money -= salaries;
  s.lastSummary = { ...s.dayStats, day: s.day, salaries };
  s.phase = 'summary';
  s.selectedCustomerId = null;
}

function tick(s: GameState, dt: number, rng: Rng) {
  if (s.phase === 'summary' || s.phase === 'prep') return;

  s.dayTimeMs = Math.min(DAY_LENGTH_MS, s.dayTimeMs + dt);
  if (s.phase === 'open' && s.dayTimeMs >= DAY_LENGTH_MS) {
    s.phase = 'closing';
    emit(s, { type: 'info', text: '🌙 Hết giờ nhận khách – phục vụ nốt khách ở quầy, quán đóng cửa khi khách cuối cùng ăn xong.' });
  }

  // Khách mới
  if (s.phase === 'open' && s.dayTimeMs < DAY_LENGTH_MS - LAST_ORDER_BEFORE_CLOSE_MS) {
    s.nextCustomerInMs -= dt;
    if (s.nextCustomerInMs <= 0) {
      if (s.customers.length < MAX_CUSTOMERS) {
        spawnCustomer(s, rng);
        s.nextCustomerInMs = spawnInterval(s, rng);
      } else {
        s.nextCustomerInMs = SPAWN_FULL_RETRY_MS;
      }
    }
    // Quầy trống trơn thì gọi khách tới sớm, tránh cảnh ế.
    if (s.customers.length === 0) s.nextCustomerInMs = Math.min(s.nextCustomerInMs, SPAWN_IDLE_MAX_MS);
  }

  // Khách chờ lâu quá sẽ bỏ về
  for (const c of [...s.customers]) {
    if (c.takenBy !== null) continue;
    c.waitedMs += dt;
    if (c.waitedMs >= c.patienceMs) {
      removeCustomer(s, c.id);
      changeReputation(s, REP_LEFT);
      s.dayStats.lost += 1;
      emit(s, { type: 'left', customerId: c.id, text: `😤 ${customerTitle(c)} chờ lâu quá nên bỏ về!` });
    }
  }

  tickCooks(s, dt, rng);
  tickStocker(s, dt);
  tickTables(s, dt);
  tickReviews(s, dt);

  const diningEmpty = s.tableQueue.length === 0 && s.tables.every((d) => d === null);
  if (s.phase === 'closing' && s.customers.length === 0 && diningEmpty) endDay(s);
}

function tickCooks(s: GameState, dt: number, rng: Rng) {
  s.cookWarnCooldownMs = Math.max(0, s.cookWarnCooldownMs - dt);
  s.cooks.forEach((cook, index) => {
    if (cook.customerId === null) {
      // Chỉ nhường đơn đang chọn cho người chơi khi họ đã bắt đầu nấu tô đó.
      const playerBusy = s.bowl.steps.length > 0;
      const candidates = s.customers.filter(
        (c) => c.takenBy === null && !(playerBusy && c.id === s.selectedCustomerId),
      );
      const target = candidates.find((c) => hasStockFor(s, requiredRecipe(c.order)));
      if (!target) {
        if (candidates.length > 0 && s.cookWarnCooldownMs === 0) {
          emit(s, { type: 'staff', text: '👨‍🍳 Đầu bếp đang thiếu nguyên liệu!' });
          s.cookWarnCooldownMs = 15_000;
        }
        return;
      }
      consume(s, requiredRecipe(target.order));
      target.takenBy = index;
      cook.customerId = target.id;
      cook.progressMs = 0;
      if (s.selectedCustomerId === target.id) autoSelect(s);
      return;
    }

    cook.progressMs += dt;
    if (cook.progressMs < COOK_TIME_MS) return;

    const customer = s.customers.find((c) => c.id === cook.customerId);
    cook.customerId = null;
    cook.progressMs = 0;
    if (!customer) return;
    // Đầu bếp nấu luôn đúng nhưng khách tip ít hơn một nửa so với chủ quán tự tay nấu.
    deliver(s, customer, 'delicious', rng, 0.5);
  });
}

function tickStocker(s: GameState, dt: number) {
  if (s.staff.stocker === 0) return;
  s.stockerCooldownMs -= dt;
  if (s.stockerCooldownMs > 0) return;
  s.stockerCooldownMs = STOCKER_CHECK_MS;
  for (const id of stationIngredients(s.totalRevenue)) {
    if (s.inventory[id] >= STOCKER_THRESHOLD) continue;
    if (buyPack(s, id, 1)) {
      emit(s, {
        type: 'staff',
        text: `📦 Nhân viên kho đã nhập ${INGREDIENTS[id].name} (-${formatVND(INGREDIENTS[id].packPrice)})`,
      });
    }
  }
}

function serve(s: GameState, rng: Rng) {
  const customer = s.customers.find((c) => c.id === s.selectedCustomerId);
  if (!customer) {
    emit(s, { type: 'error', text: 'Hãy chạm vào một khách để chọn đơn trước.' });
    return;
  }
  if (bowlContents(s.bowl).length === 0) {
    emit(s, { type: 'error', text: 'Tô đang trống – hãy bỏ mì và nguyên liệu vào trước.' });
    return;
  }

  const reaction = evaluateBowl(s.bowl, customer.order);

  if (reaction === 'bad') {
    const title = customerTitle(customer);
    const feedback = feedbackFor(rng, reaction);
    // Sai món: bỏ cả tô (nguyên liệu đã dùng là mất) và bị trừ tiền bằng giá vốn nguyên liệu trên khay.
    const penalty = bowlCost(s.bowl);
    s.bowl = emptyBowl();
    s.money -= penalty;
    s.dayStats.wasted += penalty;
    s.dayStats.wrong += 1;
    changeReputation(s, REP_WRONG_DISH);
    logReview(s, {
      id: customer.id,
      name: customer.name,
      look: customer.look,
      service: serviceOf(customer.order),
      dishId: customer.order.dishId,
      spice: customer.order.spice,
      reaction,
      feedback,
    });
    customer.waitedMs = Math.min(
      customer.patienceMs - 1,
      customer.waitedMs + customer.patienceMs * WRONG_DISH_PATIENCE_PENALTY,
    );
    emit(s, {
      type: 'wrong',
      customerId: customer.id,
      reaction,
      feedback,
      penalty,
      text: `😞 ${title}: "${feedback}" – bỏ tô, -${formatVND(penalty)} nguyên liệu`,
    });
    return;
  }

  s.bowl = emptyBowl();
  deliver(s, customer, reaction, rng);
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET') return createInitialState(action.seed, action.shop);

  const s = draft(state);
  const rng = createRng(s.rngSeed);

  switch (action.type) {
    case 'TICK':
      tick(s, action.dt, rng);
      break;

    case 'CLEAN': {
      if (s.phase !== 'prep') break;
      const spot = s.dirt.find((d) => d.id === action.id);
      if (!spot) break;
      spot.hp -= 1;
      if (spot.hp <= 0) {
        s.dirt = s.dirt.filter((d) => d.id !== spot.id);
        if (s.dirt.length === 0) emit(s, { type: 'clean', text: '✨ Quán sạch bong! Bấm "Mở cửa" để đón khách.' });
      }
      break;
    }

    case 'RENAME_SHOP': {
      const name = action.name.trim().slice(0, SHOP_NAME_MAX);
      if (!name) {
        emit(s, { type: 'error', text: 'Tên quán không được để trống.' });
      } else if (name !== s.shop.name) {
        s.shop = { ...s.shop, name };
        emit(s, { type: 'info', text: `🪧 Đã đổi tên quán thành "${name}"` });
      }
      break;
    }

    case 'OPEN_SHOP':
      if (s.phase !== 'prep') break;
      if (s.dirt.length > 0) {
        emit(s, { type: 'error', text: `Còn ${s.dirt.length} chỗ bẩn – dọn sạch quán rồi mới mở cửa nhé!` });
        break;
      }
      s.phase = 'open';
      s.dayTimeMs = 0;
      s.nextCustomerInMs = FIRST_CUSTOMER_DELAY_MS;
      emit(s, { type: 'info', text: `🔓 Mở cửa ngày ${s.day}! Chúc quán đông khách 🌶️` });
      break;

    case 'SELECT_CUSTOMER': {
      const c = s.customers.find((x) => x.id === action.id);
      if (c && c.takenBy === null) s.selectedCustomerId = c.id;
      break;
    }

    case 'ADD_INGREDIENT': {
      const ing = INGREDIENTS[action.id];
      const isDrink = ing.kind === 'drink';
      if (isDrink && bowlDrinks(s.bowl).length >= MAX_DRINKS) {
        emit(s, { type: 'error', text: `Khay chỉ để được ${MAX_DRINKS} chai nước thôi.` });
      } else if (!isDrink && bowlContents(s.bowl).length >= BOWL_CAPACITY) {
        emit(s, { type: 'error', text: 'Tô đầy rồi! Giao món hoặc đổ bỏ.' });
      } else if (s.inventory[action.id] < 1) {
        emit(s, { type: 'error', text: `Hết ${ing.name}! Vào Kho để nhập thêm.` });
      } else {
        s.inventory[action.id] -= 1;
        s.bowl.steps.push(action.id);
      }
      break;
    }

    case 'ADD_CHILI':
      if (chiliShots(s.bowl) >= MAX_SPICE) {
        emit(s, { type: 'error', text: `Cay tối đa cấp ${MAX_SPICE} (${MAX_SPICE} shot ớt) thôi!` });
      } else {
        s.bowl.steps.push('chili');
      }
      break;

    case 'REMOVE_INGREDIENT': {
      const index = s.bowl.steps.lastIndexOf(action.id);
      if (index >= 0) {
        s.bowl.steps.splice(index, 1);
        s.inventory[action.id] += 1;
      }
      break;
    }

    case 'REMOVE_CHILI': {
      const index = s.bowl.steps.lastIndexOf('chili');
      if (index >= 0) s.bowl.steps.splice(index, 1);
      break;
    }

    case 'UNDO': {
      // Ớt không tính vào kho; nguyên liệu và nước thì được hoàn lại.
      const last = s.bowl.steps.pop();
      if (last && last !== 'chili') s.inventory[last] += 1;
      break;
    }

    case 'DISCARD':
      // Đổ bỏ tô: nguyên liệu đã dùng thì mất, riêng nước chưa mở được cất lại vào kho.
      for (const id of bowlItems(s.bowl)) if (INGREDIENTS[id].kind === 'drink') s.inventory[id] += 1;
      s.bowl = emptyBowl();
      break;

    case 'SERVE':
      serve(s, rng);
      break;

    case 'BUY_PACK': {
      const packs = action.packs ?? 1;
      const ing = INGREDIENTS[action.id];
      if (buyPack(s, action.id, packs)) {
        emit(s, { type: 'info', text: `📦 Đã nhập ${packs} gói ${ing.name} (-${formatVND(ing.packPrice * packs)})` });
      } else {
        emit(s, { type: 'error', text: `Không đủ tiền để nhập ${ing.name}.` });
      }
      break;
    }

    case 'HIRE': {
      const type = STAFF_TYPES[action.role];
      if (!staffUnlocked(s)) {
        emit(s, { type: 'error', text: 'Cần doanh thu tích lũy 10.000.000₫ để thuê nhân viên.' });
      } else if (s.staff[action.role] >= type.max) {
        emit(s, { type: 'error', text: `Đã đủ số ${type.name.toLowerCase()} tối đa.` });
      } else {
        s.staff[action.role] += 1;
        if (action.role === 'cook') s.cooks.push({ customerId: null, progressMs: 0 });
        emit(s, { type: 'staff', text: `${type.emoji} Đã thuê 1 ${type.name.toLowerCase()} (lương ${formatVND(type.salary)}/ngày)` });
      }
      break;
    }

    case 'FIRE': {
      if (s.staff[action.role] === 0) break;
      s.staff[action.role] -= 1;
      if (action.role === 'cook') {
        s.cooks.pop();
        const index = s.cooks.length;
        // Đơn đang nấu dở trả lại hàng chờ (nguyên liệu đã dùng thì mất).
        for (const c of s.customers) if (c.takenBy === index) c.takenBy = null;
      }
      break;
    }

    case 'NEXT_DAY':
      if (s.phase !== 'summary') break;
      s.day += 1;
      s.dayTimeMs = 0;
      s.phase = 'prep';
      s.dayStats = emptyDayStats();
      s.nextCustomerInMs = FIRST_CUSTOMER_DELAY_MS;
      s.customers = [];
      s.selectedCustomerId = null;
      s.tables = s.tables.map(() => null);
      s.tableQueue = [];
      s.reviews = [];
      s.dirt = generateDirt(rng);
      break;
  }

  s.rngSeed = rng.seed;
  return s;
}
