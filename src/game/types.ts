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
  | 'pepsi'
  | 'fanta'
  | 'sevenup'
  | 'milk';

/** noodle = mì, meat = thịt · hải sản · viên, veggie = rau · nấm · kim chi, drink = nước uống kèm. */
export type IngredientKind = 'noodle' | 'meat' | 'veggie' | 'drink';

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
  /** Tên ngắn hiện trong bong bóng đơn của nhóm bạn, ví dụ "Bò". */
  short: string;
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

/** Đơn của một người: 1 tô mì + nước kèm. */
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

/** Một người trong lượt khách: mỗi người gọi 1 tô. */
export interface Guest {
  id: number;
  /** Tên khách vào quán, hoặc tên tài xế Grab tới lấy đơn. */
  name: string;
  look: CustomerLook;
  order: Order;
  /** Đã nhận đúng tô. */
  served: boolean;
  /** Index đầu bếp đang nấu tô của người này (nếu có). */
  takenBy: number | null;
  /** Tiền món + tip chốt lúc giao tô – khách ăn tại chỗ trả khi ăn xong. */
  paid: number;
  tip: number;
}

/**
 * Một lượt khách ở quầy: khách lẻ (1 người) hoặc nhóm bạn (2–4 người, luôn ăn tại chỗ, đủ tô mới cùng vào bàn).
 * Cả nhóm dùng chung một thanh kiên nhẫn.
 */
export interface Customer {
  id: number;
  guests: Guest[];
  /** Tổng thời gian khách chịu chờ. */
  patienceMs: number;
  waitedMs: number;
}

/** Một thao tác với tô: bỏ 1 phần nguyên liệu (hoặc 1 chai nước lên khay), hoặc 1 shot ớt. */
export type BowlStep = IngredientId | 'chili';

export interface Bowl {
  /** Các thao tác theo thứ tự (để vẽ tô và để hoàn tác). */
  steps: BowlStep[];
}

/**
 * Cảm nhận của khách về tô mì:
 * - delicious: đúng món, đúng độ cay
 * - spicy / very-spicy: cay hơn yêu cầu (lệch ít / nhiều)
 * - mild / not-spicy: ít cay hơn yêu cầu (lệch ít / nhiều)
 * - bad: sai món – tô bị trả lại
 */
export type Reaction = 'delicious' | 'spicy' | 'very-spicy' | 'mild' | 'not-spicy' | 'bad';

/**
 * Khách đã nhận đúng tô, ngồi ăn tại bàn (hoặc đứng chờ bàn trống). Trả tiền khi ăn xong.
 * Nhóm bạn ngồi các bàn cạnh nhau và ăn xong cùng lúc.
 */
export interface Diner {
  /** Id người khách (Guest.id). */
  id: number;
  /** Id lượt khách (Customer.id) – các bạn cùng nhóm chung partyId. */
  partyId: number;
  partySize: number;
  name: string;
  look: CustomerLook;
  dishId: string;
  spice: number;
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
  dishId: string;
  spice: number;
  channel: OrderChannel;
  reaction: Exclude<Reaction, 'bad'>;
  feedback: string;
  refund: number;
  inMs: number;
}

export type ServiceKind = 'dine-in' | 'takeaway' | 'grab';

/** Một lượt đánh giá của khách – lưu lại để xem ở tab Đánh giá. */
export interface ReviewEntry {
  /** Id riêng của lượt đánh giá (một khách có thể vừa chê tô sai vừa khen sau khi ăn). */
  id: number;
  day: number;
  name: string;
  look: CustomerLook;
  service: ServiceKind;
  dishId: string;
  /** Cấp cay khách gọi. */
  spice: number;
  reaction: Reaction;
  feedback: string;
  /** 1–5 sao. */
  stars: number;
  /** Số người trong nhóm (1 = khách lẻ). */
  partySize: number;
  /** Chủ quán phản hồi. */
  reply?: string;
  /** Khách đáp lại phản hồi của chủ quán. */
  replyBack?: string;
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
  /** Guest.id của tô đang nấu. */
  guestId: number | null;
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
  /** Số tô giao đúng. */
  served: number;
  /** Số người bỏ về. */
  lost: number;
  wrong: number;
}

export interface DaySummary extends DayStats {
  day: number;
  salaries: number;
}

export type GameEvent =
  | { id: number; type: 'new-order'; customerId: number; text: string }
  /**
   * Giao 1 tô cho một người trong lượt khách `customerId`. `amount` = tiền nhận ngay (ăn tại chỗ trả sau nên = 0).
   * `done` = cả lượt khách đã nhận đủ tô và rời quầy.
   */
  | {
      id: number;
      type: 'served';
      customerId: number;
      dineIn: boolean;
      channel: OrderChannel;
      amount: number;
      done: boolean;
      text: string;
    }
  /** Khách ăn tại chỗ (lẻ hoặc cả nhóm) ăn xong ở các bàn `tables`: nhận xét + trả tiền. */
  | {
      id: number;
      type: 'finished';
      customerId: number;
      tables: number[];
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
  /** Tô bị trả lại ngay ở quầy (sai món, hoặc khách ăn tại chỗ thấy sai độ cay) – phải làm lại. */
  | {
      id: number;
      type: 'wrong';
      customerId: number;
      reaction: Exclude<Reaction, 'delicious'>;
      feedback: string;
      text: string;
      penalty: number;
    }
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
  /** Người trong lượt khách đang chọn mà người chơi đang nấu tô cho. */
  selectedGuestId: number | null;
  nextCustomerInMs: number;
  nextId: number;
  bowl: Bowl;
  /** Bàn ăn: mỗi phần tử là khách đang ngồi ăn hoặc null nếu bàn trống. */
  tables: (Diner | null)[];
  /** Lượt khách ăn tại chỗ đã nhận đủ tô nhưng chưa có bàn, đang đứng chờ (mỗi phần tử là 1 lượt: lẻ hoặc nhóm). */
  tableQueue: Diner[][];
  reviews: PendingReview[];
  /** Lịch sử đánh giá gần đây (mới nhất ở cuối). */
  reviewLog: ReviewEntry[];
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
