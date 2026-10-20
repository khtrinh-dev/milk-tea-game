import type { ShopTheme } from '../types';

/** Tông màu quán (mái hiên, biển hiệu, giao diện) – đều là đỏ · trắng · đen. Màu cụ thể khai báo trong CSS theo [data-theme]. */
export const SHOP_THEMES: { id: ShopTheme; label: string }[] = [
  { id: 'fire', label: 'Đỏ lửa' },
  { id: 'ink', label: 'Đen than' },
  { id: 'snow', label: 'Trắng ớt' },
];

export const SHOP_NAME_SUGGESTIONS = [
  'Mì Cay Lửa Đỏ',
  'Mì Cay Cấp 7',
  'Mì Cay Sài Gòn',
  'Mì Cay Cô Ba',
  'Tiệm Mì Phun Lửa',
  'Hủ Ớt Quán',
  'Mì Cay Xé Lưỡi',
  'Hẻm Mì Cay',
  'Mì Cay Seoul',
  'Mì Cay Bùng Cháy',
];
