import type { DirtKind } from '../types';

/** Các loại chỗ bẩn cần dọn trước giờ mở cửa: số lần chạm để dọn sạch và trọng số xuất hiện. */
export const DIRT_TYPES: Record<DirtKind, { name: string; emoji: string; hp: number; weight: number }> = {
  trash: { name: 'Rác', emoji: '🧻', hp: 1, weight: 30 },
  stain: { name: 'Vết dầu ớt', emoji: '🟠', hp: 3, weight: 20 },
  web: { name: 'Mạng nhện', emoji: '🕸️', hp: 2, weight: 15 },
  dishes: { name: 'Chén bẩn trên bàn', emoji: '🥣', hp: 2, weight: 25 },
  dust: { name: 'Bụi', emoji: '💨', hp: 2, weight: 10 },
};
