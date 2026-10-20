import { INGREDIENTS } from '../game/data/ingredients';
import { CUP_CAPACITY } from '../game/state';
import type { Cup } from '../game/types';

// Ly vẽ bằng SVG: mỗi lần bấm nguyên liệu thêm một lớp màu từ dưới lên.
const TOP = 22;
const BOTTOM = 132;
const LAYER_H = (BOTTOM - TOP - 6) / CUP_CAPACITY;
const ICE_CUBES = { none: 0, less: 2, normal: 4 } as const;

export function CupView({ cup, size = 96 }: { cup: Cup; size?: number }) {
  const fillTop = BOTTOM - cup.layers.length * LAYER_H;
  return (
    <svg className="cup" viewBox="0 0 100 140" width={size} height={size * 1.4} aria-label="Ly đang pha">
      <defs>
        <clipPath id="cup-clip">
          <polygon points={`16,${TOP} 84,${TOP} 74,${BOTTOM} 26,${BOTTOM}`} />
        </clipPath>
      </defs>
      {/* ống hút */}
      <rect x="56" y="2" width="7" height="60" rx="3" fill="#e8798a" transform="rotate(12 60 30)" />
      <g clipPath="url(#cup-clip)">
        <rect x="0" y={TOP} width="100" height={BOTTOM - TOP} fill="#fffaf2" />
        {cup.layers.map((id, i) => {
          const ing = INGREDIENTS[id];
          const y = BOTTOM - (i + 1) * LAYER_H;
          if (ing.kind === 'topping' && id !== 'cheese_foam') {
            return (
              <g key={i}>
                <rect x="0" y={y} width="100" height={LAYER_H + 0.5} fill="#e9d8bd" opacity="0.6" />
                {[20, 32, 44, 56, 68, 80].map((cx, j) => (
                  <circle key={j} cx={cx + (i % 2) * 5} cy={y + LAYER_H / 2} r={LAYER_H / 2.6} fill={ing.color} stroke="#0002" strokeWidth="0.6" />
                ))}
              </g>
            );
          }
          return <rect key={i} x="0" y={y} width="100" height={LAYER_H + 0.5} fill={ing.color} />;
        })}
        {cup.layers.length > 0 &&
          Array.from({ length: ICE_CUBES[cup.ice] }, (_, i) => (
            <rect
              key={i}
              x={24 + (i % 2) * 26 + (i > 1 ? 8 : 0)}
              y={Math.max(fillTop, TOP) + 4 + Math.floor(i / 2) * 14}
              width="14"
              height="12"
              rx="3"
              fill="#ffffff"
              opacity="0.55"
              stroke="#cfe8ff"
            />
          ))}
      </g>
      <polygon points={`16,${TOP} 84,${TOP} 74,${BOTTOM} 26,${BOTTOM}`} fill="none" stroke="#7a4a2b" strokeWidth="3" strokeLinejoin="round" />
      <rect x="12" y={TOP - 6} width="76" height="7" rx="3" fill="#ffffff" stroke="#7a4a2b" strokeWidth="2.5" />
    </svg>
  );
}
