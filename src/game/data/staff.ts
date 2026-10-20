import { COOK_TIME_MS, STOCKER_THRESHOLD, WAITER_PATIENCE_BONUS } from '../constants';
import type { StaffRole, StaffType } from '../types';

export const STAFF_TYPES: Record<StaffRole, StaffType> = {
  cook: {
    role: 'cook',
    name: 'Đầu bếp',
    emoji: '👨‍🍳',
    description: `Tự động nấu đơn cũ nhất (trừ đơn bạn đang nấu dở), đúng món đúng độ cay, mỗi tô mất ${COOK_TIME_MS / 1000} giây.`,
    salary: 300_000,
    max: 3,
  },
  waiter: {
    role: 'waiter',
    name: 'Nhân viên phục vụ',
    emoji: '🧑‍💼',
    description: `Tiếp khách, dọn bàn, rót nước, giúp khách kiên nhẫn chờ lâu hơn ${WAITER_PATIENCE_BONUS * 100}% mỗi người.`,
    salary: 180_000,
    max: 2,
  },
  stocker: {
    role: 'stocker',
    name: 'Nhân viên kho',
    emoji: '📦',
    description: `Tự nhập thêm 1 gói khi nguyên liệu nào đó còn dưới ${STOCKER_THRESHOLD} phần.`,
    salary: 200_000,
    max: 1,
  },
};

export const STAFF_ROLES = Object.keys(STAFF_TYPES) as StaffRole[];
