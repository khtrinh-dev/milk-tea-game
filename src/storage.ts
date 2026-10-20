// Cờ cài đặt nhỏ lưu trong localStorage (âm thanh, đã xem hướng dẫn…).
// localStorage có thể ném lỗi (Safari private mode) nên mọi truy cập đều bọc try/catch.

export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // bỏ qua
  }
}
