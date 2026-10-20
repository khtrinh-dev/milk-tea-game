import {
  BARISTA_TIME_MS,
  DAY_LENGTH_MS,
  FIRST_CUSTOMER_DELAY_MS,
  LAST_ORDER_BEFORE_CLOSE_MS,
  MAX_CUSTOMERS,
  REP_LEFT,
  REP_PERFECT,
  REP_WRONG_DRINK,
  REP_WRONG_OPTION,
  SAVE_VERSION,
  STAFF_UNLOCK_REVENUE,
  STARTING_MONEY,
  STARTING_REPUTATION,
  STOCKER_CHECK_MS,
  STOCKER_THRESHOLD,
  WAITER_PATIENCE_BONUS,
  WRONG_OPTION_PAY_RATE,
} from './constants';
import { INGREDIENT_IDS, INGREDIENTS } from './data/ingredients';
import { DRINK_BY_ID, unlockedDrinks, unlockedIngredients, unlockedToppings } from './data/menu';
import { STAFF_TYPES } from './data/staff';
import { formatVND } from './money';
import {
  computeTip,
  describeOrder,
  evaluateCup,
  generateOrder,
  randomCustomerLook,
  requiredRecipe,
} from './orders';
import { createRng, type Rng } from './rng';
import type {
  Cup,
  Customer,
  DayStats,
  GameEventInput,
  GameState,
  IceLevel,
  IngredientId,
  StaffRole,
  SugarLevel,
} from './types';

export type GameAction =
  | { type: 'TICK'; dt: number }
  | { type: 'SELECT_CUSTOMER'; id: number }
  | { type: 'ADD_INGREDIENT'; id: IngredientId }
  | { type: 'UNDO' }
  | { type: 'DISCARD' }
  | { type: 'SET_ICE'; ice: IceLevel }
  | { type: 'SET_SUGAR'; sugar: SugarLevel }
  | { type: 'SERVE' }
  | { type: 'BUY_PACK'; id: IngredientId; packs?: number }
  | { type: 'HIRE'; role: StaffRole }
  | { type: 'FIRE'; role: StaffRole }
  | { type: 'NEXT_DAY' }
  | { type: 'RESET'; seed: number };

/** Số lớp tối đa trong một ly. */
export const CUP_CAPACITY = 8;
const MAX_EVENTS = 30;

export function emptyCup(): Cup {
  return { layers: [], ice: 'normal', sugar: 'normal' };
}

function emptyDayStats(): DayStats {
  return { revenue: 0, tips: 0, spent: 0, served: 0, lost: 0, wrong: 0 };
}

export function createInitialState(seed: number): GameState {
  const inventory = Object.fromEntries(INGREDIENT_IDS.map((id) => [id, 0])) as Record<IngredientId, number>;
  // Vốn khởi đầu: mỗi nguyên liệu của món mở sẵn được tặng 1 gói.
  for (const id of ['cup', ...unlockedIngredients(0)] as IngredientId[]) {
    inventory[id] = INGREDIENTS[id].packSize;
  }
  return {
    version: SAVE_VERSION,
    money: STARTING_MONEY,
    totalRevenue: 0,
    reputation: STARTING_REPUTATION,
    day: 1,
    dayTimeMs: 0,
    phase: 'open',
    inventory,
    customers: [],
    selectedCustomerId: null,
    nextCustomerInMs: FIRST_CUSTOMER_DELAY_MS,
    nextId: 1,
    cup: emptyCup(),
    staff: { barista: 0, waiter: 0, stocker: 0 },
    baristas: [],
    stockerCooldownMs: STOCKER_CHECK_MS,
    baristaWarnCooldownMs: 0,
    dayStats: emptyDayStats(),
    lastSummary: null,
    events: [],
    nextEventId: 1,
    rngSeed: seed,
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
    cup: { ...state.cup, layers: [...state.cup.layers] },
    staff: { ...state.staff },
    baristas: state.baristas.map((b) => ({ ...b })),
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
  for (const d of unlockedDrinks(after)) {
    if (d.unlockRevenue > before) emit(s, { type: 'unlock', text: `🎉 Mở khóa món mới: ${d.name}!` });
  }
  for (const t of unlockedToppings(after)) {
    if (t.unlockRevenue > before) emit(s, { type: 'unlock', text: `🎉 Mở khóa topping: ${INGREDIENTS[t.id].name}!` });
  }
  if (before < STAFF_UNLOCK_REVENUE && after >= STAFF_UNLOCK_REVENUE) {
    emit(s, { type: 'unlock', text: '🎉 Doanh thu vượt 10 triệu – bạn đã có thể thuê nhân viên!' });
  }
}

function patienceFor(s: GameState, customer: Pick<Customer, 'order'>): number {
  const steps = Object.values(requiredRecipe(customer.order)).reduce((a, b) => a + (b ?? 0), 0);
  const base = 30_000 + steps * 5_000;
  return Math.round(base * (1 + s.staff.waiter * WAITER_PATIENCE_BONUS));
}

function spawnInterval(s: GameState, rng: Rng): number {
  const base = Math.max(5_000, Math.min(15_000, 15_000 - s.reputation * 80 - (s.day - 1) * 400));
  return Math.round(base * (0.7 + rng.next() * 0.6));
}

function spawnCustomer(s: GameState, rng: Rng) {
  const order = generateOrder(rng, s.totalRevenue);
  const look = randomCustomerLook(rng);
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
    text: `🔔 ${customer.name} gọi ${describeOrder(order)}`,
  });
}

/** Chọn đơn cũ nhất mà nhân viên chưa nhận. */
function autoSelect(s: GameState) {
  const next = s.customers.find((c) => c.takenBy === null);
  s.selectedCustomerId = next ? next.id : null;
}

function removeCustomer(s: GameState, id: number) {
  s.customers = s.customers.filter((c) => c.id !== id);
  if (s.selectedCustomerId === id) autoSelect(s);
}

function hasStockFor(s: GameState, recipe: ReturnType<typeof requiredRecipe>): boolean {
  if (s.inventory.cup < 1) return false;
  return (Object.entries(recipe) as [IngredientId, number][]).every(([id, n]) => s.inventory[id] >= n);
}

function consume(s: GameState, recipe: ReturnType<typeof requiredRecipe>) {
  s.inventory.cup -= 1;
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

function endDay(s: GameState) {
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
  if (s.phase === 'summary') return;

  s.dayTimeMs = Math.min(DAY_LENGTH_MS, s.dayTimeMs + dt);
  if (s.phase === 'open' && s.dayTimeMs >= DAY_LENGTH_MS) {
    s.phase = 'closing';
    emit(s, { type: 'info', text: '🌙 Đã tới giờ đóng cửa – phục vụ nốt khách còn lại nhé!' });
  }

  // Khách mới
  if (s.phase === 'open' && s.dayTimeMs < DAY_LENGTH_MS - LAST_ORDER_BEFORE_CLOSE_MS) {
    s.nextCustomerInMs -= dt;
    if (s.nextCustomerInMs <= 0) {
      if (s.customers.length < MAX_CUSTOMERS) {
        spawnCustomer(s, rng);
        s.nextCustomerInMs = spawnInterval(s, rng);
      } else {
        s.nextCustomerInMs = 1_500;
      }
    }
  }

  // Khách chờ lâu quá sẽ bỏ về
  for (const c of [...s.customers]) {
    if (c.takenBy !== null) continue;
    c.waitedMs += dt;
    if (c.waitedMs >= c.patienceMs) {
      removeCustomer(s, c.id);
      changeReputation(s, REP_LEFT);
      s.dayStats.lost += 1;
      emit(s, { type: 'left', text: `😤 ${c.name} chờ lâu quá nên bỏ về!` });
    }
  }

  tickBaristas(s, dt);
  tickStocker(s, dt);

  if (s.phase === 'closing' && s.customers.length === 0) endDay(s);
}

function tickBaristas(s: GameState, dt: number) {
  s.baristaWarnCooldownMs = Math.max(0, s.baristaWarnCooldownMs - dt);
  s.baristas.forEach((b, index) => {
    if (b.customerId === null) {
      // Chỉ nhường đơn đang chọn cho người chơi khi họ đã bắt đầu pha ly đó.
      const playerBusy = s.cup.layers.length > 0;
      const candidates = s.customers.filter(
        (c) => c.takenBy === null && !(playerBusy && c.id === s.selectedCustomerId),
      );
      const target = candidates.find((c) => hasStockFor(s, requiredRecipe(c.order)));
      if (!target) {
        if (candidates.length > 0 && s.baristaWarnCooldownMs === 0) {
          emit(s, { type: 'staff', text: '👩‍🍳 Nhân viên pha chế đang thiếu nguyên liệu!' });
          s.baristaWarnCooldownMs = 15_000;
        }
        return;
      }
      consume(s, requiredRecipe(target.order));
      target.takenBy = index;
      b.customerId = target.id;
      b.progressMs = 0;
      if (s.selectedCustomerId === target.id) autoSelect(s);
      return;
    }

    b.progressMs += dt;
    if (b.progressMs < BARISTA_TIME_MS) return;

    const customer = s.customers.find((c) => c.id === b.customerId);
    b.customerId = null;
    b.progressMs = 0;
    if (!customer) return;
    const left = 1 - customer.waitedMs / customer.patienceMs;
    // Nhân viên pha luôn đúng nhưng khách tip ít hơn một nửa so với tự tay chủ quán làm.
    const tip = Math.round(computeTip(customer.order.price, left, s.reputation) / 2000) * 1000;
    earn(s, customer.order.price, tip);
    changeReputation(s, REP_PERFECT / 2);
    s.dayStats.served += 1;
    removeCustomer(s, customer.id);
    emit(s, {
      type: 'served',
      amount: customer.order.price + tip,
      text: `👩‍🍳 Nhân viên đã giao ${DRINK_BY_ID[customer.order.drinkId].name} cho ${customer.name}`,
    });
  });
}

function tickStocker(s: GameState, dt: number) {
  if (s.staff.stocker === 0) return;
  s.stockerCooldownMs -= dt;
  if (s.stockerCooldownMs > 0) return;
  s.stockerCooldownMs = STOCKER_CHECK_MS;
  for (const id of ['cup', ...unlockedIngredients(s.totalRevenue)] as IngredientId[]) {
    if (s.inventory[id] >= STOCKER_THRESHOLD) continue;
    if (buyPack(s, id, 1)) {
      emit(s, {
        type: 'staff',
        text: `📦 Nhân viên kho đã nhập ${INGREDIENTS[id].name} (-${formatVND(INGREDIENTS[id].packPrice)})`,
      });
    }
  }
}

function serve(s: GameState) {
  const customer = s.customers.find((c) => c.id === s.selectedCustomerId);
  if (!customer) {
    emit(s, { type: 'error', text: 'Hãy chạm vào một khách để chọn đơn trước.' });
    return;
  }
  if (s.cup.layers.length === 0) {
    emit(s, { type: 'error', text: 'Ly đang trống – hãy cho nguyên liệu vào trước.' });
    return;
  }
  if (s.inventory.cup < 1) {
    emit(s, { type: 'error', text: 'Hết ly nhựa! Vào Kho để nhập thêm.' });
    return;
  }

  s.inventory.cup -= 1;
  const result = evaluateCup(s.cup, customer.order);
  const price = customer.order.price;
  s.cup = emptyCup();

  if (result === 'wrong-drink') {
    changeReputation(s, REP_WRONG_DRINK);
    s.dayStats.wrong += 1;
    customer.waitedMs = Math.min(customer.patienceMs - 1, customer.waitedMs + customer.patienceMs * 0.15);
    emit(s, { type: 'wrong', text: `❌ ${customer.name}: "Không đúng món tôi gọi!" – làm lại ly khác nhé.` });
    return;
  }

  if (result === 'wrong-option') {
    const paid = Math.round((price * WRONG_OPTION_PAY_RATE) / 1000) * 1000;
    earn(s, paid, 0);
    changeReputation(s, REP_WRONG_OPTION);
    s.dayStats.served += 1;
    removeCustomer(s, customer.id);
    emit(s, {
      type: 'served',
      amount: paid,
      text: `😕 ${customer.name} nhận ly nhưng chê sai đá/đường, chỉ trả ${formatVND(paid)}`,
    });
    return;
  }

  const left = 1 - customer.waitedMs / customer.patienceMs;
  const tip = computeTip(price, left, s.reputation);
  earn(s, price, tip);
  changeReputation(s, REP_PERFECT);
  s.dayStats.served += 1;
  removeCustomer(s, customer.id);
  emit(s, {
    type: 'served',
    amount: price + tip,
    text: `😋 ${customer.name} rất hài lòng! +${formatVND(price)}${tip ? ` (tip ${formatVND(tip)})` : ''}`,
  });
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'RESET') return createInitialState(action.seed);

  const s = draft(state);
  const rng = createRng(s.rngSeed);

  switch (action.type) {
    case 'TICK':
      tick(s, action.dt, rng);
      break;

    case 'SELECT_CUSTOMER': {
      const c = s.customers.find((x) => x.id === action.id);
      if (c && c.takenBy === null) s.selectedCustomerId = c.id;
      break;
    }

    case 'ADD_INGREDIENT': {
      const ing = INGREDIENTS[action.id];
      if (s.cup.layers.length >= CUP_CAPACITY) {
        emit(s, { type: 'error', text: 'Ly đầy rồi! Giao món hoặc đổ bỏ.' });
      } else if (s.inventory[action.id] < 1) {
        emit(s, { type: 'error', text: `Hết ${ing.name}! Vào Kho để nhập thêm.` });
      } else {
        s.inventory[action.id] -= 1;
        s.cup.layers.push(action.id);
      }
      break;
    }

    case 'UNDO': {
      const last = s.cup.layers.pop();
      if (last) s.inventory[last] += 1;
      break;
    }

    case 'DISCARD':
      s.cup = emptyCup();
      break;

    case 'SET_ICE':
      s.cup.ice = action.ice;
      break;

    case 'SET_SUGAR':
      s.cup.sugar = action.sugar;
      break;

    case 'SERVE':
      serve(s);
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
        if (action.role === 'barista') s.baristas.push({ customerId: null, progressMs: 0 });
        emit(s, { type: 'staff', text: `${type.emoji} Đã thuê 1 ${type.name.toLowerCase()} (lương ${formatVND(type.salary)}/ngày)` });
      }
      break;
    }

    case 'FIRE': {
      if (s.staff[action.role] === 0) break;
      s.staff[action.role] -= 1;
      if (action.role === 'barista') {
        s.baristas.pop();
        const index = s.baristas.length;
        // Đơn đang pha dở trả lại hàng chờ (nguyên liệu đã dùng thì mất).
        for (const c of s.customers) if (c.takenBy === index) c.takenBy = null;
      }
      break;
    }

    case 'NEXT_DAY':
      if (s.phase !== 'summary') break;
      s.day += 1;
      s.dayTimeMs = 0;
      s.phase = 'open';
      s.dayStats = emptyDayStats();
      s.nextCustomerInMs = FIRST_CUSTOMER_DELAY_MS;
      s.customers = [];
      s.selectedCustomerId = null;
      break;
  }

  s.rngSeed = rng.seed;
  return s;
}
