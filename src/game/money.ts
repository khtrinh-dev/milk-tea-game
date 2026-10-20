const formatter = new Intl.NumberFormat('vi-VN');

/** 1250000 → "1.250.000₫" */
export function formatVND(amount: number): string {
  return `${formatter.format(Math.round(amount))}₫`;
}

/** 1250000 → "1,25tr", 35000 → "35k" – dùng cho chỗ hẹp. */
export function formatShortVND(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    const v = abs / 1_000_000;
    return `${sign}${v.toFixed(v >= 100 ? 0 : 2).replace(/\.?0+$/, '').replace('.', ',')}tr`;
  }
  if (abs >= 1_000) return `${sign}${Math.round(abs / 1_000)}k`;
  return `${sign}${abs}₫`;
}
