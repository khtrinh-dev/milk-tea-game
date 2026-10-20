import type { ArchetypeId, CustomerArchetype } from '../types';

// Các kiểu khách tới quán. Mỗi kiểu có ngoại hình riêng (vẽ trong CustomerFigure.tsx)
// và tính cách riêng: độ kiên nhẫn, độ hào phóng khi tip, tần suất xuất hiện.
export const ARCHETYPES: Record<ArchetypeId, CustomerArchetype> = {
  grab: {
    id: 'grab',
    title: 'Anh Grab',
    gender: 'male',
    names: ['Tuấn', 'Hùng', 'Dũng', 'Phong', 'Toàn'],
    patienceMul: 0.8, // đang chạy đơn, vội
    tipMul: 0.8,
    weight: 12,
  },
  engineer: {
    id: 'engineer',
    title: 'Anh kỹ sư',
    gender: 'male',
    names: ['Khoa', 'Thắng', 'Lực', 'Quang', 'Vinh'],
    patienceMul: 1,
    tipMul: 1.1,
    weight: 9,
  },
  dev: {
    id: 'dev',
    title: 'Anh dev IT',
    gender: 'male',
    names: ['Minh', 'Đạt', 'Huy', 'Nam', 'Bảo'],
    patienceMul: 1.15,
    tipMul: 1,
    weight: 9,
  },
  lady: {
    id: 'lady',
    title: 'Chị đẹp',
    gender: 'female',
    names: ['Vy', 'Ngọc', 'Trang', 'Hà', 'Quỳnh'],
    patienceMul: 0.9,
    tipMul: 1.3,
    weight: 10,
  },
  director: {
    id: 'director',
    title: 'Anh giám đốc',
    gender: 'male',
    names: ['Long', 'Thành', 'Phát', 'Hải', 'Sơn'],
    patienceMul: 0.85,
    tipMul: 1.8,
    weight: 5,
  },
  ueh: {
    id: 'ueh',
    title: 'Sinh viên UEH',
    gender: 'female',
    names: ['Linh', 'Thảo', 'My', 'Yến', 'Nhi'],
    patienceMul: 1.1,
    tipMul: 0.7,
    weight: 11,
  },
  fpt: {
    id: 'fpt',
    title: 'Sinh viên FPT',
    gender: 'male',
    names: ['Khang', 'Phúc', 'Duy', 'Tài', 'Kiệt'],
    patienceMul: 1.1,
    tipMul: 0.7,
    weight: 11,
  },
  pupil: {
    id: 'pupil',
    title: 'Học sinh',
    gender: 'female',
    names: ['Chi', 'An', 'Mai', 'Hân', 'Thư'],
    patienceMul: 1.2,
    tipMul: 0.5,
    weight: 9,
  },
  teacher: {
    id: 'teacher',
    title: 'Cô giáo',
    gender: 'female',
    names: ['Lan', 'Hương', 'Hạnh', 'Dung', 'Loan'],
    patienceMul: 1.25,
    tipMul: 1,
    weight: 6,
  },
  office: {
    id: 'office',
    title: 'Chị văn phòng',
    gender: 'female',
    names: ['Thu', 'Diệp', 'Uyên', 'Trâm', 'Giang'],
    patienceMul: 0.95,
    tipMul: 1.1,
    weight: 10,
  },
  gymer: {
    id: 'gymer',
    title: 'Anh gymer',
    gender: 'male',
    names: ['Cường', 'Mạnh', 'Tùng', 'Khải', 'Lâm'],
    patienceMul: 1,
    tipMul: 1,
    weight: 6,
  },
};

export const ARCHETYPE_IDS = Object.keys(ARCHETYPES) as ArchetypeId[];

/** Số tông da / màu tóc có thể chọn ngẫu nhiên (CustomerFigure khai báo bảng màu tương ứng). */
export const SKIN_TONES = 4;
export const HAIR_COLORS = 4;
