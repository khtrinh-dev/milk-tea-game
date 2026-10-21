import {
  BOWL_CAPACITY,
  COOK_TIME_MS,
  DAY_LENGTH_MS,
  DINE_MAX_MS,
  DINE_MIN_MS,
  DIRT_SPOTS,
  FIRST_CUSTOMER_DELAY_MS,
  GRAB_PATIENCE_MUL,
  GROUP_CHANCE,
  GROUP_EXTRA_PATIENCE,
  GROUP_MAX_SIZE,
  GROUP_MIN_SIZE,
  LAST_ORDER_BEFORE_CLOSE_MS,
  MAX_CUSTOMERS,
  MAX_DRINKS,
  MAX_SPICE,
  REP_GOOD_REVIEW,
  REP_LEFT,
  REP_OWNER_REPLY,
  REP_PERFECT,
  REP_SPICE_BIG_MISS,
  REP_SPICE_SMALL_MISS,
  REP_WRONG_DISH,
  REPLY_MAX,
  REVIEW_LOG_MAX,
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
  TABLES_PER_ROW,
  WAITER_PATIENCE_BONUS,
  WRONG_DISH_PATIENCE_PENALTY,
  WRONG_PENALTY_RATE,
} from './constants';
import { DIRT_TYPES } from './data/cleaning';
import { ARCHETYPES } from './data/customers';
import { INGREDIENT_IDS, INGREDIENTS } from './data/ingredients';
import { stationIngredients, unlockedDishes, unlockedDrinks } from './data/menu';
import { COMPLAINTS, CUSTOMER_REPLY_BACK, FEEDBACK, GROUP_FEEDBACK, REACTION_STARS } from './data/reactions';
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
  openGuests,
  partyTitle,
  payRate,
  randomCustomerLook,
  requiredRecipe,
  rollService,
} from './orders';
import { createRng, type Rng } from './rng';
import type {
  Bowl,
  Customer,
  CustomerLook,
  DayStats,
  DirtKind,
  DirtSpot,
  GameEventInput,
  GameState,
  Guest,
  IngredientId,
  Order,
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
  /** Chọn một người trong nhóm bạn để nấu tô cho người đó. */
  | { type: 'SELECT_GUEST'; id: number }
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
  /** Chủ quán phản hồi một lượt đánh giá (mỗi lượt 1 lần). */
  | { type: 'REPLY_REVIEW'; id: number; text: string }
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
    selectedGuestId: null,
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
    customers: state.customers.map((c) => ({ ...c, guests: c.guests.map((g) => ({ ...g })) })),
    bowl: { steps: [...state.bowl.steps] },
    tables: state.tables.map((d) => d && { ...d }),
    tableQueue: state.tableQueue.map((party) => party.map((d) => ({ ...d }))),
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

/** Thời gian chờ cho 1 tô, theo độ phức tạp của đơn và tính cách khách. */
function bowlPatience(order: Order, look: CustomerLook): number {
  const items = Object.values(requiredRecipe(order)).reduce((a, b) => a + (b ?? 0), 0);
  const base = 30_000 + items * 4_000 + order.spice * 600;
  const channelMul = order.channel === 'grab' ? GRAB_PATIENCE_MUL : 1;
  return base * ARCHETYPES[look.archetype].patienceMul * channelMul;
}

/** Kiên nhẫn của cả lượt khách: tô đầu tính đủ, mỗi tô thêm của nhóm cộng GROUP_EXTRA_PATIENCE. */
function patienceFor(s: GameState, guests: Pick<Guest, 'order' | 'look'>[]): number {
  const [first, ...rest] = guests.map((g) => bowlPatience(g.order, g.look));
  const total = rest.reduce((sum, ms) => sum + ms * GROUP_EXTRA_PATIENCE, first);
  return Math.round(total * (1 + s.staff.waiter * WAITER_PATIENCE_BONUS));
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

function newGuest(s: GameState, rng: Rng, service: Pick<Order, 'channel' | 'dineIn'>, taken: Set<string>): Guest {
  // Nhóm bạn không trùng tên nhau (thử lại vài lần).
  let look = randomCustomerLook(rng, service.channel);
  for (let i = 0; i < 5 && taken.has(look.name); i++) look = randomCustomerLook(rng, service.channel);
  taken.add(look.name);
  return {
    id: s.nextId++,
    ...look,
    order: generateOrder(rng, s.totalRevenue, service),
    served: false,
    takenBy: null,
    paid: 0,
    tip: 0,
  };
}

function spawnCustomer(s: GameState, rng: Rng) {
  let service = rollService(rng);
  let size = 1;
  if (service.channel === 'walk-in' && rng.next() < GROUP_CHANCE) {
    // Nhóm bạn: luôn ăn tại chỗ, mỗi người gọi 1 tô riêng.
    size = rng.int(GROUP_MIN_SIZE, GROUP_MAX_SIZE);
    service = { channel: 'walk-in', dineIn: true };
  }
  const id = s.nextId++;
  const names = new Set<string>();
  const guests = Array.from({ length: size }, () => newGuest(s, rng, service, names));
  const customer: Customer = { id, guests, patienceMs: patienceFor(s, guests), waitedMs: 0 };
  s.customers.push(customer);
  autoSelect(s);

  const [lead] = guests;
  emit(s, {
    type: 'new-order',
    customerId: id,
    text:
      size > 1
        ? `👯 ${partyTitle(customer)} vào quán, gọi ${size} tô ăn tại chỗ`
        : lead.order.channel === 'grab'
          ? `🛵 Đơn Grab: ${describeOrder(lead.order)} – ${customerTitle(lead)} tới lấy`
          : `🔔 ${customerTitle(lead)} gọi ${describeOrder(lead.order)}`,
  });
}

/**
 * Giữ lượt khách đang chọn nếu còn tô người chơi nấu được, không thì chọn lượt cũ nhất còn tô.
 * Trong lượt khách thì giữ người đang chọn, không được nữa thì chọn người đầu tiên còn chờ.
 */
function autoSelect(s: GameState) {
  const current = s.customers.find((c) => c.id === s.selectedCustomerId);
  const target = current && openGuests(current).length > 0 ? current : s.customers.find((c) => openGuests(c).length > 0);
  if (!target) {
    s.selectedCustomerId = null;
    s.selectedGuestId = null;
    return;
  }
  const guests = openGuests(target);
  s.selectedCustomerId = target.id;
  if (!guests.some((g) => g.id === s.selectedGuestId)) s.selectedGuestId = guests[0].id;
}

function removeCustomer(s: GameState, id: number) {
  s.customers = s.customers.filter((c) => c.id !== id);
  autoSelect(s);
}

function findGuest(s: GameState, guestId: number | null): { customer: Customer; guest: Guest } | null {
  for (const customer of s.customers) {
    const guest = customer.guests.find((g) => g.id === guestId);
    if (guest) return { customer, guest };
  }
  return null;
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

function serviceOf(order: Pick<Order, 'channel' | 'dineIn'>): ServiceKind {
  if (order.channel === 'grab') return 'grab';
  return order.dineIn ? 'dine-in' : 'takeaway';
}

/** Ghi một lượt đánh giá vào lịch sử (giữ REVIEW_LOG_MAX lượt gần nhất). */
function logReview(s: GameState, entry: Omit<ReviewEntry, 'id' | 'day' | 'stars'>) {
  s.reviewLog.push({ ...entry, id: s.nextId++, day: s.day, stars: REACTION_STARS[entry.reaction] });
  if (s.reviewLog.length > REVIEW_LOG_MAX) s.reviewLog.splice(0, s.reviewLog.length - REVIEW_LOG_MAX);
}

/** Tìm `size` bàn trống: ưu tiên các bàn liền nhau cùng dãy, không có thì ghép các bàn trống bất kỳ. */
function freeTables(s: GameState, size: number): number[] | null {
  for (let row = 0; row < s.tables.length; row += TABLES_PER_ROW) {
    const end = Math.min(row + TABLES_PER_ROW, s.tables.length);
    for (let start = row; start + size <= end; start++) {
      const run = Array.from({ length: size }, (_, k) => start + k);
      if (run.every((t) => s.tables[t] === null)) return run;
    }
  }
  const free = s.tables.flatMap((d, t) => (d === null ? [t] : []));
  return free.length >= size ? free.slice(0, size) : null;
}

/** Xếp các lượt khách đang chờ vào bàn (lượt nào vừa chỗ thì vào trước). */
function seatDiners(s: GameState) {
  for (let i = 0; i < s.tableQueue.length; ) {
    const party = s.tableQueue[i];
    const tables = freeTables(s, party.length);
    if (!tables) {
      i++;
      continue;
    }
    tables.forEach((t, k) => (s.tables[t] = party[k]));
    s.tableQueue.splice(i, 1);
  }
}

function tablesOf(s: GameState, partyId: number): number[] {
  return s.tables.flatMap((d, t) => (d?.partyId === partyId ? [t] : []));
}

/**
 * Giao đúng tô cho một người trong lượt khách (người chơi tự nấu hoặc đầu bếp nấu).
 * - Ăn tại chỗ: chốt tiền + tip; đủ tô cho cả nhóm thì cùng vào bàn (hết bàn thì đứng chờ), ăn xong mới trả tiền.
 * - Mang về / Grab: trả đủ tiền ngay, về nhà ăn rồi đánh giá; lệch độ cay thì quán hoàn bớt tiền.
 */
function deliver(s: GameState, customer: Customer, guest: Guest, reaction: Exclude<Reaction, 'bad'>, rng: Rng, tipFactor = 1) {
  const { order } = guest;
  const paid = Math.round((order.price * payRate(reaction)) / 1000) * 1000;
  const left = 1 - customer.waitedMs / customer.patienceMs;
  const tipMul = ARCHETYPES[guest.look.archetype].tipMul * tipFactor;
  const tip = reaction === 'delicious' ? Math.round(computeTip(order.price, left, s.reputation, tipMul) / 1000) * 1000 : 0;

  guest.served = true;
  guest.takenBy = null;
  s.dayStats.served += 1;

  if (order.dineIn) {
    guest.paid = paid;
    guest.tip = tip;
    const waiting = customer.guests.filter((g) => !g.served).length;
    if (waiting > 0) {
      emit(s, {
        type: 'served',
        customerId: customer.id,
        dineIn: true,
        channel: order.channel,
        amount: 0,
        done: false,
        text: `🍜 ${customerTitle(guest)} đã có tô – nhóm còn chờ ${waiting} tô`,
      });
      autoSelect(s);
      return;
    }

    removeCustomer(s, customer.id);
    const eatMs = rng.int(DINE_MIN_MS, DINE_MAX_MS);
    s.tableQueue.push(
      customer.guests.map((g) => ({
        id: g.id,
        partyId: customer.id,
        partySize: customer.guests.length,
        name: g.name,
        look: g.look,
        dishId: g.order.dishId,
        spice: g.order.spice,
        paid: g.paid,
        tip: g.tip,
        eatMs,
      })),
    );
    seatDiners(s);
    const tables = tablesOf(s, customer.id);
    const who = partyTitle(customer);
    emit(s, {
      type: 'served',
      customerId: customer.id,
      dineIn: true,
      channel: order.channel,
      amount: 0,
      done: true,
      text:
        tables.length > 0
          ? `🍜 ${who} ${customer.guests.length > 1 ? 'đủ tô, kéo nhau vào' : 'nhận tô, mời vào'} bàn ${tables.map((t) => t + 1).join(', ')}`
          : `🪑 Hết bàn! ${who} bưng tô đứng chờ bàn trống`,
    });
    return;
  }

  removeCustomer(s, customer.id);
  earn(s, order.price, tip);
  s.reviews.push({
    id: guest.id,
    name: guest.name,
    look: guest.look,
    dishId: order.dishId,
    spice: order.spice,
    channel: order.channel,
    reaction,
    feedback: rng.pick(FEEDBACK[reaction]),
    refund: order.price - paid,
    inMs: rng.int(REVIEW_MIN_MS, REVIEW_MAX_MS),
  });
  const title = customerTitle(guest);
  const money = `+${formatVND(order.price)}${tip ? ` (tip ${formatVND(tip)})` : ''}`;
  emit(s, {
    type: 'served',
    customerId: customer.id,
    dineIn: false,
    channel: order.channel,
    amount: order.price + tip,
    done: true,
    text: order.channel === 'grab' ? `🛵 ${title} đã lấy đơn Grab ${money}` : `🛍️ ${title} nhận mì mang về ${money}`,
  });
}

/** Lượt khách ăn tại chỗ (lẻ hoặc cả nhóm) ăn xong: trả tiền, nhận xét, trả bàn. */
function finishMeal(s: GameState, partyId: number, rng: Rng) {
  const tables = tablesOf(s, partyId);
  const diners = tables.map((t) => s.tables[t]!);
  for (const t of tables) s.tables[t] = null;
  const paid = diners.reduce((sum, d) => sum + d.paid, 0);
  const tip = diners.reduce((sum, d) => sum + d.tip, 0);
  earn(s, paid, tip);
  changeReputation(s, REP_PERFECT);

  const [lead] = diners;
  const partySize = diners.length;
  const feedback = rng.pick(partySize > 1 ? GROUP_FEEDBACK : FEEDBACK.delicious);
  logReview(s, {
    name: lead.name,
    look: lead.look,
    service: 'dine-in',
    dishId: lead.dishId,
    spice: lead.spice,
    reaction: 'delicious',
    feedback,
    partySize,
  });
  emit(s, {
    type: 'finished',
    customerId: partyId,
    tables,
    feedback,
    amount: paid + tip,
    text: `😋 ${partyTitle({ ...lead, partySize })} ăn xong: "${feedback}" +${formatVND(paid)}${tip ? ` (tip ${formatVND(tip)})` : ''}`,
  });
}

function deliverReview(s: GameState, index: number) {
  const [r] = s.reviews.splice(index, 1);
  changeReputation(s, r.reaction === 'delicious' ? REP_GOOD_REVIEW : reputationFor(r.reaction));
  logReview(s, {
    name: r.name,
    look: r.look,
    service: r.channel === 'grab' ? 'grab' : 'takeaway',
    dishId: r.dishId,
    spice: r.spice,
    reaction: r.reaction,
    feedback: r.feedback,
    partySize: 1,
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

function tickTables(s: GameState, dt: number, rng: Rng) {
  const done = new Set<number>();
  for (const d of s.tables) {
    if (!d) continue;
    d.eatMs -= dt;
    if (d.eatMs <= 0) done.add(d.partyId);
  }
  for (const partyId of done) finishMeal(s, partyId, rng);
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
  s.selectedGuestId = null;
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

  // Khách chờ lâu quá sẽ bỏ về (cả nhóm cùng về). Tô nào còn lại cũng đang được đầu bếp nấu thì khách vẫn vui vẻ chờ.
  for (const c of [...s.customers]) {
    if (openGuests(c).length === 0) continue;
    c.waitedMs += dt;
    if (c.waitedMs >= c.patienceMs) {
      removeCustomer(s, c.id);
      changeReputation(s, REP_LEFT);
      s.dayStats.lost += c.guests.length;
      emit(s, { type: 'left', customerId: c.id, text: `😤 ${partyTitle(c)} chờ lâu quá nên bỏ về!` });
    }
  }

  tickCooks(s, dt, rng);
  tickStocker(s, dt);
  tickTables(s, dt, rng);
  tickReviews(s, dt);

  const diningEmpty = s.tableQueue.length === 0 && s.tables.every((d) => d === null);
  if (s.phase === 'closing' && s.customers.length === 0 && diningEmpty) endDay(s);
}

function tickCooks(s: GameState, dt: number, rng: Rng) {
  s.cookWarnCooldownMs = Math.max(0, s.cookWarnCooldownMs - dt);
  s.cooks.forEach((cook, index) => {
    if (cook.guestId === null) {
      // Chỉ nhường tô đang chọn cho người chơi khi họ đã bắt đầu nấu tô đó.
      const playerBusy = s.bowl.steps.length > 0;
      const candidates = s.customers.flatMap(openGuests).filter((g) => !(playerBusy && g.id === s.selectedGuestId));
      const target = candidates.find((g) => hasStockFor(s, requiredRecipe(g.order)));
      if (!target) {
        if (candidates.length > 0 && s.cookWarnCooldownMs === 0) {
          emit(s, { type: 'staff', text: '👨‍🍳 Đầu bếp đang thiếu nguyên liệu!' });
          s.cookWarnCooldownMs = 15_000;
        }
        return;
      }
      consume(s, requiredRecipe(target.order));
      target.takenBy = index;
      cook.guestId = target.id;
      cook.progressMs = 0;
      autoSelect(s);
      return;
    }

    cook.progressMs += dt;
    if (cook.progressMs < COOK_TIME_MS) return;

    const found = findGuest(s, cook.guestId);
    cook.guestId = null;
    cook.progressMs = 0;
    if (!found) return;
    // Đầu bếp nấu luôn đúng nhưng khách tip ít hơn một nửa so với chủ quán tự tay nấu.
    deliver(s, found.customer, found.guest, 'delicious', rng, 0.5);
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

/**
 * Khách trả tô ngay tại quầy và đòi làm lại: bỏ cả tô, quán chịu phạt một nửa giá vốn nguyên liệu trên khay,
 * mất danh tiếng, khách mất thêm chút kiên nhẫn nhưng vẫn đứng chờ tô mới.
 */
function rejectBowl(s: GameState, customer: Customer, guest: Guest, reaction: Exclude<Reaction, 'delicious'>, rng: Rng) {
  const feedback = rng.pick(COMPLAINTS[reaction]);
  const penalty = Math.round(bowlCost(s.bowl) * WRONG_PENALTY_RATE);
  s.bowl = emptyBowl();
  s.money -= penalty;
  s.dayStats.wasted += penalty;
  s.dayStats.wrong += 1;
  changeReputation(s, reputationFor(reaction));
  logReview(s, {
    name: guest.name,
    look: guest.look,
    service: serviceOf(guest.order),
    dishId: guest.order.dishId,
    spice: guest.order.spice,
    reaction,
    feedback,
    partySize: 1,
  });
  customer.waitedMs = Math.min(customer.patienceMs - 1, customer.waitedMs + customer.patienceMs * WRONG_DISH_PATIENCE_PENALTY);
  emit(s, {
    type: 'wrong',
    customerId: customer.id,
    reaction,
    feedback,
    penalty,
    text: `😞 ${customerTitle(guest)}: "${feedback}" – làm lại tô khác, -${formatVND(penalty)}`,
  });
}

function serve(s: GameState, rng: Rng) {
  const customer = s.customers.find((c) => c.id === s.selectedCustomerId);
  let guest = customer && openGuests(customer).find((g) => g.id === s.selectedGuestId);
  if (!customer || !guest) {
    emit(s, { type: 'error', text: 'Hãy chạm vào một khách để chọn đơn trước.' });
    return;
  }
  if (bowlContents(s.bowl).length === 0) {
    emit(s, { type: 'error', text: 'Tô đang trống – hãy bỏ mì và nguyên liệu vào trước.' });
    return;
  }

  let reaction = evaluateBowl(s.bowl, guest.order);
  if (reaction !== 'delicious') {
    // Nhóm bạn: tô đúng y đơn của một bạn khác trong nhóm thì giao luôn cho bạn đó.
    const match = openGuests(customer).find((g) => evaluateBowl(s.bowl, g.order) === 'delicious');
    if (match) {
      guest = match;
      reaction = 'delicious';
    }
  }

  // Sai món thì ai cũng trả lại. Khách ăn tại chỗ nhìn màu nước dùng là biết sai độ cay nên cũng đòi làm lại;
  // khách mang về / Grab thì về nhà ăn mới biết.
  if (reaction === 'bad' || (guest.order.dineIn && reaction !== 'delicious')) {
    rejectBowl(s, customer, guest, reaction, rng);
    return;
  }

  s.bowl = emptyBowl();
  deliver(s, customer, guest, reaction, rng);
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
      const guests = c ? openGuests(c) : [];
      if (!c || guests.length === 0) break;
      s.selectedCustomerId = c.id;
      if (!guests.some((g) => g.id === s.selectedGuestId)) s.selectedGuestId = guests[0].id;
      break;
    }

    case 'SELECT_GUEST': {
      const found = findGuest(s, action.id);
      if (!found || found.guest.served || found.guest.takenBy !== null) break;
      s.selectedCustomerId = found.customer.id;
      s.selectedGuestId = found.guest.id;
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
        if (action.role === 'cook') s.cooks.push({ guestId: null, progressMs: 0 });
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
        // Tô đang nấu dở trả lại hàng chờ (nguyên liệu đã dùng thì mất).
        for (const c of s.customers) for (const g of c.guests) if (g.takenBy === index) g.takenBy = null;
        autoSelect(s);
      }
      break;
    }

    case 'REPLY_REVIEW': {
      const index = s.reviewLog.findIndex((r) => r.id === action.id);
      const entry = s.reviewLog[index];
      if (!entry || entry.reply) break;
      const text = action.text.trim().slice(0, REPLY_MAX);
      if (!text) {
        emit(s, { type: 'error', text: 'Viết gì đó rồi hãy gửi nha!' });
        break;
      }
      const tone = entry.stars >= 4 ? 'good' : 'bad';
      s.reviewLog[index] = { ...entry, reply: text, replyBack: rng.pick(CUSTOMER_REPLY_BACK[tone]) };
      if (tone === 'bad') changeReputation(s, REP_OWNER_REPLY);
      emit(s, {
        type: 'info',
        text: `💬 Đã phản hồi ${partyTitle(entry)}${tone === 'bad' ? ' – khách nguôi giận, danh tiếng tăng nhẹ' : ''}`,
      });
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
      s.selectedGuestId = null;
      s.tables = s.tables.map(() => null);
      s.tableQueue = [];
      s.reviews = [];
      s.dirt = generateDirt(rng);
      break;
  }

  s.rngSeed = rng.seed;
  return s;
}
