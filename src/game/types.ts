// Kiểu dữ liệu dùng chung cho toàn bộ logic game.
// Mọi số tiền là số nguyên VNĐ, mọi thời gian là mili-giây.

export type IngredientId =
  | 'noodle'
  | 'squid'
  | 'shrimp'
  | 'fishball'
  | 'kimchi'
  | 'beef'
  | 'enoki'
  | 'purple_cabbage'
  | 'cauliflower'
  | 'sausage'
  | 'coca'
  | 'milk';

/** noodle = mì, topping = đồ nhúng (hải sản, thịt, viên), veggie = rau/nấm/kim chi, drink = nước uống kèm. */
export type IngredientKind = 'noodle' | 'topping' | 'veggie' | 'drink';

export interface Ingredient {
  id: IngredientId;
  name: string;
  emoji: string;
  kind: IngredientKind;
  /** Màu chủ đạo khi vẽ nguyên liệu trong tô. */
  color: string;
  /** Số phần trong một gói khi nhập hàng. */
  packSize: number;
  /** Giá nhập một gói (VNĐ) = giá vốn một phần × packSize. */
  packPrice: number;
}

export type Recipe = Partial<Record<IngredientId, number>>;

/** Một món mì cay trong thực đơn. Giá bán = giá vốn công thức + lời cố định mỗi tô. */
export interface Dish {
  id: string;
  name: string;
  emoji: string;
  recipe: Recipe;
  price: number;
  unlockRevenue: number;
}

/** Nước uống khách gọi kèm. */
export interface DrinkItem {
  id: IngredientId;
  price: number;
  unlockRevenue: number;
}

/** Đơn đến từ khách vào quán trực tiếp hay đặt qua Grab (tài xế tới lấy). */
export type OrderChannel = 'walk-in' | 'grab';

export interface Order {
  channel: OrderChannel;
  /** Ăn tại chỗ (cần bàn) hay mua mang về. Đơn Grab luôn mang về. */
  dineIn: boolean;
  dishId: string;
  /** Nước uống gọi kèm (0 hoặc 1 món). */
  drinks: IngredientId[];
  /** Cấp độ cay 0..MAX_SPICE = số shot ớt cần cho vào tô. */
  spice: number;
  /** Giá bán = giá món + giá nước. */
  price: number;
}

export type ArchetypeId =
  | 'grab'
  | 'engineer'
  | 'dev'
  | 'lady'
  | 'director'
  | 'ueh'
  | 'fpt'
  | 'pupil'
  | 'teacher'
  | 'office'
  | 'gymer';

export interface CustomerArchetype {
  id: ArchetypeId;
  /** Cách gọi hiển thị, ví dụ "Anh Grab". */
  title: string;
  gender: 'male' | 'female';
  names: string[];
  /** Hệ số nhân thời gian chờ. */
  patienceMul: number;
  /** Hệ số nhân tiền tip. */
  tipMul: number;
  /** Trọng số xuất hiện. */
  weight: number;
}

/** Ngoại hình một khách: kiểu khách + biến thể màu da/tóc (index vào bảng màu của UI). */
export interface CustomerLook {
  archetype: ArchetypeId;
  skin: number;
  hair: number;
}

export interface Customer {
  id: number;
  /** Tên khách vào quán, hoặc tên tài xế Grab tới lấy đơn. */
  name: string;
  look: CustomerLook;
  order: Order;
  /** Tổng thời gian khách chịu chờ. */
  patienceMs: number;
  waitedMs: number;
  /** Index đầu bếp đang nấu đơn này (nếu có). */
  takenBy: number | null;
}

/** Một thao tác với tô: bỏ 1 phần nguyên liệu (hoặc 1 chai nước lên khay), hoặc 1 shot ớt. */
export type BowlStep = IngredientId | 'chili';

export interface Bowl {
  /** Các thao tác theo thứ tự (để vẽ tô và để hoàn tác). */
  steps: BowlStep[];
}

/**
 * Cảm nhận của khách sau khi ăn:
 * - delicious: đúng món, đúng độ cay
 * - spicy / very-spicy: cay hơn yêu cầu (lệch ít / nhiều)
 * - mild / not-spicy: ít cay hơn yêu cầu (lệch ít / nhiều)
 * - bad: sai món – tô bị bỏ
 */
export type Reaction = 'delicious' | 'spicy' | 'very-spicy' | 'mild' | 'not-spicy' | 'bad';

/** Khách đã nhận tô, ngồi ăn tại bàn (hoặc đứng chờ bàn trống). Trả tiền khi ăn xong. */
export interface Diner {
  id: number;
  name: string;
  look: CustomerLook;
  reaction: Exclude<Reaction, 'bad'>;
  feedback: string;
  /** Tiền món và tip khách sẽ trả khi ăn xong. */
  paid: number;
  tip: number;
  /** Thời gian ăn còn lại. */
  eatMs: number;
}

/** Khách mang về / đơn Grab: ăn ở nhà rồi mới đánh giá – nếu lệch độ cay thì quán hoàn bớt tiền. */
export interface PendingReview {
  id: number;
  name: string;
  look: CustomerLook;
  channel: OrderChannel;
  reaction: Exclude<Reaction, 'bad'>;
  feedback: string;
  refund: number;
  inMs: number;
}

export type DirtKind = 'trash' | 'stain' | 'web' | 'dishes' | 'dust';

/** Một chỗ bẩn cần dọn trước giờ mở cửa. */
export interface DirtSpot {
  id: number;
  kind: DirtKind;
  /** Số lần chạm còn lại để dọn sạch. */
  hp: number;
  /** Vị trí trong khung cảnh quán (% ngang / dọc); chén bẩn thì nằm trên bàn `table`. */
  x: number;
  y: number;
  table: number | null;
}

export type StaffRole = 'cook' | 'waiter' | 'stocker';

export interface StaffType {
  role: StaffRole;
  name: string;
  emoji: string;
  description: string;
  /** Lương mỗi ngày (VNĐ), trừ khi kết thúc ngày. */
  salary: number;
  max: number;
}

export interface Cook {
  customerId: number | null;
  progressMs: number;
}

export interface DayStats {
  revenue: number;
  tips: number;
  spent: number;
  /** Tiền bị trừ vì nấu sai phải bỏ tô. */
  wasted: number;
  /** Tiền hoàn cho khách mang về / Grab chê độ cay. */
  refunds: number;
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
  /** Giao tô cho khách ở quầy. `amount` = tiền nhận ngay (khách ăn tại chỗ trả sau khi ăn xong nên = 0). */
  | { id: number; type: 'served'; customerId: number; dineIn: boolean; channel: OrderChannel; amount: number; text: string }
  /** Khách ăn tại chỗ ăn xong ở bàn `table`: nhận xét + trả tiền. */
  | {
      id: number;
      type: 'finished';
      customerId: number;
      table: number;
      reaction: Exclude<Reaction, 'bad'>;
      feedback: string;
      amount: number;
      text: string;
    }
  /** Khách mang về / Grab đánh giá sau khi ăn ở nhà. */
  | {
      id: number;
      type: 'review';
      customerId: number;
      reaction: Exclude<Reaction, 'bad'>;
      feedback: string;
      refund: number;
      text: string;
    }
  | { id: number; type: 'wrong'; customerId: number; reaction: 'bad'; feedback: string; text: string; penalty: number }
  | { id: number; type: 'left'; customerId: number; text: string }
  | { id: number; type: 'clean'; text: string }
  | { id: number; type: 'unlock'; text: string }
  | { id: number; type: 'staff'; text: string }
  | { id: number; type: 'info'; text: string }
  | { id: number; type: 'error'; text: string };

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
export type GameEventInput = DistributiveOmit<GameEvent, 'id'>;

/** prep = dọn dẹp trước giờ mở cửa (đồng hồ chưa chạy). */
export type Phase = 'prep' | 'open' | 'closing' | 'summary';

export type ShopTheme = 'fire' | 'ink' | 'snow';

export interface ShopInfo {
  name: string;
  theme: ShopTheme;
}

export interface GameState {
  version: number;
  shop: ShopInfo;
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
  bowl: Bowl;
  /** Bàn ăn: mỗi phần tử là khách đang ngồi ăn hoặc null nếu bàn trống. */
  tables: (Diner | null)[];
  /** Khách ăn tại chỗ đã nhận tô nhưng hết bàn, đang đứng chờ. */
  tableQueue: Diner[];
  reviews: PendingReview[];
  dirt: DirtSpot[];
  staff: Record<StaffRole, number>;
  cooks: Cook[];
  stockerCooldownMs: number;
  /** Chống spam thông báo "đầu bếp thiếu nguyên liệu". */
  cookWarnCooldownMs: number;
  dayStats: DayStats;
  lastSummary: DaySummary | null;
  events: GameEvent[];
  nextEventId: number;
  rngSeed: number;
}
