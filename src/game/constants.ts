import type { IceLevel, SugarLevel } from './types';

// Các hằng số cân bằng game. Chỉnh ở đây thay vì rải số trong code.

/** Phiên bản dữ liệu save. Tăng khi đổi cấu trúc GameState không tương thích. */
export const SAVE_VERSION = 1;

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

/** Số khách tối đa đứng chờ ở quầy. */
export const MAX_CUSTOMERS = 4;
export const FIRST_CUSTOMER_DELAY_MS = 2_500;

export const BARISTA_TIME_MS = 10_000;
export const STOCKER_CHECK_MS = 3_000;
export const STOCKER_THRESHOLD = 5;
export const WAITER_PATIENCE_BONUS = 0.25;

/** Phần trăm giá trả cho tip tối đa khi phục vụ nhanh. */
export const MAX_TIP_RATE = 0.2;
/** Khách trả % giá nếu đúng món nhưng sai đá/đường. */
export const WRONG_OPTION_PAY_RATE = 0.7;

export const REP_PERFECT = 2;
export const REP_WRONG_OPTION = -1;
export const REP_WRONG_DRINK = -5;
export const REP_LEFT = -4;

export const ICE_LABELS: Record<IceLevel, string> = {
  none: 'Không đá',
  less: 'Ít đá',
  normal: 'Đá bình thường',
};

export const SUGAR_LABELS: Record<SugarLevel, string> = {
  none: 'Không đường',
  less: 'Ít ngọt',
  normal: 'Ngọt bình thường',
  more: 'Nhiều ngọt',
};

export const ICE_LEVELS: IceLevel[] = ['none', 'less', 'normal'];
export const SUGAR_LEVELS: SugarLevel[] = ['none', 'less', 'normal', 'more'];

export const ICE_WEIGHTS: Record<IceLevel, number> = { normal: 55, less: 30, none: 15 };
export const SUGAR_WEIGHTS: Record<SugarLevel, number> = { normal: 50, less: 30, none: 10, more: 10 };
/** Xác suất khách gọi 0 / 1 / 2 topping. */
export const TOPPING_COUNT_WEIGHTS = [35, 45, 20];
