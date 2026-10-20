import type { StaffRole, StaffType } from '../types';

export const STAFF_TYPES: Record<StaffRole, StaffType> = {
  barista: {
    role: 'barista',
    name: 'Nhân viên pha chế',
    emoji: '👩‍🍳',
    description: 'Tự động pha đơn cũ nhất (trừ đơn bạn đang pha dở), mỗi ly mất 10 giây.',
    salary: 250_000,
    max: 3,
  },
  waiter: {
    role: 'waiter',
    name: 'Nhân viên phục vụ',
    emoji: '🧑‍💼',
    description: 'Tiếp khách, giúp khách kiên nhẫn chờ lâu hơn 25% mỗi người.',
    salary: 180_000,
    max: 2,
  },
  stocker: {
    role: 'stocker',
    name: 'Nhân viên kho',
    emoji: '📦',
    description: 'Tự nhập thêm 1 gói khi nguyên liệu nào đó còn dưới 5 phần.',
    salary: 200_000,
    max: 1,
  },
};

export const STAFF_ROLES = Object.keys(STAFF_TYPES) as StaffRole[];
