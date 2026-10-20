// Các hằng số cân bằng game. Chỉnh ở đây thay vì rải số trong code.

/** Phiên bản dữ liệu save. Tăng khi đổi cấu trúc GameState không tương thích. */
export const SAVE_VERSION = 3;

export const STARTING_MONEY = 1_000_000;
export const STARTING_REPUTATION = 50;

/** Doanh thu tích lũy để được thuê nhân viên. */
export const STAFF_UNLOCK_REVENUE = 10_000_000;

/** Một ngày mở cửa 8:00 → 22:00 kéo dài 3 phút thực. */
export const DAY_LENGTH_MS = 180_000;
export const OPEN_HOUR = 8;
export const CLOSE_HOUR = 22;
/** Ngừng đón khách mới trước giờ đóng cửa một chút. */
export const LAST_ORDER_BEFORE_CLOSE_MS = 10_000;

/** Số khách tối đa đứng chờ ở quầy (tính cả đơn Grab). */
export const MAX_CUSTOMERS = 3;
export const FIRST_CUSTOMER_DELAY_MS = 2_500;

// Nhịp khách: đủ đông để không ế nhưng không dồn dập tới mức làm không kịp.
/** Khoảng cách giữa 2 lượt khách lúc mới mở quán; giảm dần theo danh tiếng và số ngày. */
export const SPAWN_BASE_MS = 18_000;
export const SPAWN_MIN_MS = 10_000;
export const SPAWN_REP_STEP_MS = 60;
export const SPAWN_DAY_STEP_MS = 500;
/** Ngẫu nhiên ±20% quanh khoảng cách cơ bản. */
export const SPAWN_JITTER = 0.2;
/** Quầy đang có ≥ ngần này đơn chờ thì khách sau tới chậm hơn (×SPAWN_BUSY_MUL). */
export const SPAWN_BUSY_QUEUE = 2;
export const SPAWN_BUSY_MUL = 1.5;
/** Quầy trống thì khách tiếp theo tới trong tối đa ngần này – tránh cảnh ế. */
export const SPAWN_IDLE_MAX_MS = 4_000;
/** Quầy đầy thì kiểm tra lại sau ngần này. */
export const SPAWN_FULL_RETRY_MS = 1_500;

/** Tỉ lệ đơn đặt qua Grab (tài xế tới lấy, luôn mang về). */
export const GRAB_ORDER_CHANCE = 0.3;
/** Tỉ lệ khách vào quán chọn ăn tại chỗ (còn lại mua mang về). */
export const DINE_IN_CHANCE = 0.6;
/** Đơn Grab: tài xế chịu chờ lâu hơn một chút vì đơn đã đặt trước. */
export const GRAB_PATIENCE_MUL = 1.2;

/** Số bàn ăn trong quán. */
export const TABLE_COUNT = 10;
/** Thời gian một khách ngồi ăn hết tô. */
export const DINE_MIN_MS = 25_000;
export const DINE_MAX_MS = 45_000;
/** Khách mang về / Grab gửi đánh giá sau khi về nhà ăn. */
export const REVIEW_MIN_MS = 8_000;
export const REVIEW_MAX_MS = 15_000;

/** Số chỗ bẩn phải dọn mỗi sáng trước khi mở cửa. */
export const DIRT_SPOTS = 7;

export const COOK_TIME_MS = 12_000;
export const STOCKER_CHECK_MS = 3_000;
export const STOCKER_THRESHOLD = 3;
export const WAITER_PATIENCE_BONUS = 0.25;

/** Tiền lời cố định trên mỗi tô mì: giá bán = giá vốn nguyên liệu + 20k. */
export const BOWL_PROFIT = 20_000;
/** Số phần nguyên liệu tối đa trong một tô (không tính ớt, nước uống). */
export const BOWL_CAPACITY = 12;
/** Số chai/hộp nước tối đa trên khay. */
export const MAX_DRINKS = 2;

/** Cấp độ cay: 0 = không ớt, mỗi cấp thêm 1 shot ớt, tối đa cấp 7. */
export const MAX_SPICE = 7;
/** Xác suất khách gọi từng cấp cay 0..7. */
export const SPICE_WEIGHTS = [6, 10, 15, 18, 17, 14, 11, 9];
/** Xác suất khách gọi kèm nước: không gọi / coca / sữa. */
export const DRINK_ORDER_WEIGHTS = { none: 50, coca: 28, milk: 22 };

/** Lệch độ cay từ mức này trở lên là "lệch nhiều" (cay xé lưỡi / không cay chút nào). */
export const SPICE_BIG_MISS = 3;
/** Phần trăm giá khách trả khi lệch độ cay ít / nhiều. */
export const SPICE_SMALL_MISS_PAY_RATE = 0.8;
export const SPICE_BIG_MISS_PAY_RATE = 0.5;

/** Phần trăm giá trả cho tip tối đa khi phục vụ nhanh. */
export const MAX_TIP_RATE = 0.2;

export const REP_PERFECT = 2;
export const REP_SPICE_SMALL_MISS = -1;
export const REP_SPICE_BIG_MISS = -3;
export const REP_WRONG_DISH = -5;
export const REP_LEFT = -4;
/** Khách mang về / Grab khen ngon trong đánh giá. */
export const REP_GOOD_REVIEW = 1;
/** Khách còn chờ sau khi nhận tô sai bị giảm thêm % kiên nhẫn. */
export const WRONG_DISH_PATIENCE_PENALTY = 0.15;

/** Độ dài tối đa tên quán. */
export const SHOP_NAME_MAX = 24;
export const DEFAULT_SHOP_NAME = 'Mì Cay Lửa Đỏ';
