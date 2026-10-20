import type { Reaction } from '../types';

/** Số sao khách chấm theo cảm nhận. */
export const REACTION_STARS: Record<Reaction, number> = {
  delicious: 5,
  spicy: 3,
  mild: 3,
  'very-spicy': 2,
  'not-spicy': 2,
  bad: 1,
};

// Câu nhận xét của khách sau khi ăn, chọn ngẫu nhiên theo cảm nhận.
export const FEEDBACK: Record<Reaction, string[]> = {
  delicious: ['Ngon xuất sắc! 😋', 'Cay vừa chuẩn, mai ghé tiếp!', 'Đỉnh của chóp luôn!', 'Ngon dữ thần, 10 điểm!'],
  spicy: ['Cay quá trời!', 'Hơi bị cay đó nha 🥵', 'Cay quá, cho xin ly nước!'],
  'very-spicy': ['Cay xốn lè luôn! 🔥', 'Cay xé lưỡi, phun lửa rồi!', 'Trời ơi cay muốn xỉu!'],
  mild: ['Chưa đủ cay nha…', 'Hơi nhạt, cay chút nữa mới đã.', 'Cay kiểu gì mà hiền vậy?'],
  'not-spicy': ['Không cay chút nào!', 'Mì cay mà như canh vậy?', 'Ủa, ớt đâu hết rồi?'],
  bad: ['Dở quá, không đúng món tôi gọi!', 'Ủa sao lại có cái này? Làm lại đi!', 'Món gì kỳ vậy… làm lại giùm!'],
};
