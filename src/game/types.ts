// Kiểu dữ liệu dùng chung cho toàn bộ logic game.
// Mọi số tiền là số nguyên VNĐ, mọi thời gian là mili-giây.

export type IngredientId =
  | 'cup'
  | 'black_tea'
  | 'green_tea'
  | 'oolong'
  | 'matcha'
  | 'taro'
  | 'cocoa'
  | 'milk'
  | 'creamer'
  | 'brown_sugar'
  | 'passion'
  | 'strawberry'
  | 'peach'
  | 'cheese_foam'
  | 'pearl_black'
  | 'pearl_white'
  | 'pearl_golden'
  | 'coconut_jelly'
  | 'coffee_jelly'
  | 'aloe'
  | 'pudding'
  | 'flan';

export type IngredientKind = 'tea' | 'milk' | 'flavor' | 'topping' | 'supply';

export interface Ingredient {
  id: IngredientId;
  name: string;
  emoji: string;
  kind: IngredientKind;
  /** Màu vẽ lớp nguyên liệu trong ly. */
  color: string;
  /** Số phần trong một gói khi nhập hàng. */
  packSize: number;
  /** Giá nhập một gói (VNĐ). */
  packPrice: number;
}

export interface Topping {
  id: IngredientId;
  /** Giá cộng thêm vào ly khi khách gọi topping này. */
  price: number;
  /** Doanh thu tích lũy cần đạt để mở khóa. */
  unlockRevenue: number;
}

export type Recipe = Partial<Record<IngredientId, number>>;

export interface Drink {
  id: string;
  name: string;
  emoji: string;
  price: number;
  recipe: Recipe;
  unlockRevenue: number;
}

export type IceLevel = 'none' | 'less' | 'normal';
export type SugarLevel = 'none' | 'less' | 'normal' | 'more';

export interface Order {
  drinkId: string;
  toppings: IngredientId[];
  ice: IceLevel;
  sugar: SugarLevel;
  /** Giá bán của ly này = giá món + giá topping. */
  price: number;
}

export interface Customer {
  id: number;
  name: string;
  avatar: string;
  order: Order;
  /** Tổng thời gian khách chịu chờ. */
  patienceMs: number;
  waitedMs: number;
  /** Index nhân viên pha chế đang làm đơn này (nếu có). */
  takenBy: number | null;
}

export interface Cup {
  /** Nguyên liệu theo thứ tự đã cho vào (để vẽ các lớp trong ly). */
  layers: IngredientId[];
  ice: IceLevel;
  sugar: SugarLevel;
}

export type StaffRole = 'barista' | 'waiter' | 'stocker';

export interface StaffType {
  role: StaffRole;
  name: string;
  emoji: string;
  description: string;
  /** Lương mỗi ngày (VNĐ), trừ khi kết thúc ngày. */
  salary: number;
  max: number;
}

export interface Barista {
  customerId: number | null;
  progressMs: number;
}

export interface DayStats {
  revenue: number;
  tips: number;
  spent: number;
  served: number;
  lost: number;
  wrong: number;
}

export interface DaySummary extends DayStats {
  day: number;
  salaries: number;
}

export type GameEvent =
  | { id: number; type: 'new-order'; customerId: number; text: string }
  | { id: number; type: 'served'; text: string; amount: number }
  | { id: number; type: 'wrong'; text: string }
  | { id: number; type: 'left'; text: string }
  | { id: number; type: 'unlock'; text: string }
  | { id: number; type: 'staff'; text: string }
  | { id: number; type: 'info'; text: string }
  | { id: number; type: 'error'; text: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type GameEventInput = DistributiveOmit<GameEvent, 'id'>;

export type Phase = 'open' | 'closing' | 'summary';

export interface GameState {
  version: number;
  money: number;
  /** Doanh thu tích lũy từ đầu game – dùng để mở khóa món & nhân viên. */
  totalRevenue: number;
  /** Danh tiếng 0..100, ảnh hưởng tần suất khách và tiền tip. */
  reputation: number;
  day: number;
  dayTimeMs: number;
  phase: Phase;
  inventory: Record<IngredientId, number>;
  customers: Customer[];
  selectedCustomerId: number | null;
  nextCustomerInMs: number;
  nextId: number;
  cup: Cup;
  staff: Record<StaffRole, number>;
  baristas: Barista[];
  stockerCooldownMs: number;
  /** Chống spam thông báo "nhân viên thiếu nguyên liệu". */
  baristaWarnCooldownMs: number;
  dayStats: DayStats;
  lastSummary: DaySummary | null;
  events: GameEvent[];
  nextEventId: number;
  rngSeed: number;
}
