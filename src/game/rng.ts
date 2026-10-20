// RNG có seed (mulberry32) để reducer thuần và test được.
// Seed được lưu trong GameState và cập nhật sau mỗi action dùng ngẫu nhiên.

export interface Rng {
  next(): number;
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<K extends string>(weights: Record<K, number>): K;
  seed: number;
}

export function createRng(seed: number): Rng {
  const rng: Rng = {
    seed: seed >>> 0,
    next() {
      rng.seed = (rng.seed + 0x6d2b79f5) >>> 0;
      let t = rng.seed;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(min, max) {
      return min + Math.floor(rng.next() * (max - min + 1));
    },
    pick(items) {
      return items[Math.floor(rng.next() * items.length)];
    },
    weighted(weights) {
      const entries = Object.entries(weights) as [keyof typeof weights, number][];
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = rng.next() * total;
      for (const [k, w] of entries) {
        r -= w;
        if (r < 0) return k;
      }
      return entries[entries.length - 1][0];
    },
  };
  return rng;
}
