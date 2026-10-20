import type { JSX } from 'react';
import { MAX_SPICE } from '../game/constants';
import { bowlContents, bowlDrinks, chiliShots } from '../game/orders';
import type { Bowl, IngredientId } from '../game/types';

// Tô mì cay vẽ bằng SVG: nước dùng đỏ dần theo số shot ớt, mỗi phần nguyên liệu bỏ vào hiện thêm
// một miếng tương ứng nổi trên mặt tô (miếng mới "rơi" vào bằng CSS). Nước uống đặt cạnh tô.

const OL = '#1b1b1b';
/** Chỗ đặt từng miếng nguyên liệu trên mặt tô (theo thứ tự bỏ vào). */
const SLOTS: [number, number][] = [
  [48, 39],
  [92, 39],
  [70, 47],
  [70, 33],
  [38, 46],
  [102, 46],
  [57, 51],
  [84, 51],
  [30, 39],
  [110, 39],
  [60, 31],
  [81, 31],
];

/** Màu nước dùng: cấp 0 cam nhạt → cấp 7 đỏ thẫm. */
function brothColor(shots: number): string {
  const t = Math.min(1, shots / MAX_SPICE);
  const from = [242, 165, 65];
  const to = [165, 15, 10];
  const rgb = from.map((f, i) => Math.round(f + (to[i] - f) * t));
  return `rgb(${rgb.join(',')})`;
}

function Piece({ id, x, y }: { id: IngredientId; x: number; y: number }): JSX.Element | null {
  const stroke = { stroke: OL, strokeWidth: 1, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
  switch (id) {
    case 'squid':
      return (
        <g>
          <circle cx={x - 3} cy={y} r={4.2} fill="none" stroke="#f7ece0" strokeWidth={2.6} />
          <circle cx={x + 4} cy={y + 1} r={3.6} fill="none" stroke="#f7ece0" strokeWidth={2.4} />
        </g>
      );
    case 'shrimp':
      return (
        <g>
          <path d={`M${x - 6} ${y - 1} Q${x - 4} ${y + 6} ${x + 3} ${y + 4} Q${x + 7} ${y + 2} ${x + 5} ${y - 3}`} fill="none" stroke={OL} strokeWidth={5.4} strokeLinecap="round" />
          <path d={`M${x - 6} ${y - 1} Q${x - 4} ${y + 6} ${x + 3} ${y + 4} Q${x + 7} ${y + 2} ${x + 5} ${y - 3}`} fill="none" stroke="#ff8a4c" strokeWidth={3.6} strokeLinecap="round" />
          <path d={`M${x - 3} ${y + 1.5} l1.5 -2 M${x} ${y + 3} l1 -2.2 M${x + 3} ${y + 2.5} l0.4 -2.4`} stroke="#fff3e6" strokeWidth={0.9} />
        </g>
      );
    case 'fishball':
      return (
        <g>
          <circle cx={x - 3.5} cy={y} r={4} fill="#c98a45" {...stroke} />
          <circle cx={x + 4} cy={y + 1.2} r={4} fill="#b8783a" {...stroke} />
          <circle cx={x - 4.6} cy={y - 1.4} r={1.1} fill="#fff" opacity={0.6} />
        </g>
      );
    case 'beef':
      return (
        <g>
          <path d={`M${x - 8} ${y} Q${x - 4} ${y - 5} ${x + 1} ${y - 3} Q${x + 7} ${y - 5} ${x + 8} ${y + 1} Q${x + 2} ${y + 5} ${x - 8} ${y} Z`} fill="#a8433a" {...stroke} />
          <path d={`M${x - 4} ${y - 1} q3 -1 6 0 M${x + 2} ${y + 1.5} q2 -0.8 4 0`} stroke="#f1b7a8" strokeWidth={0.9} fill="none" />
        </g>
      );
    case 'sausage':
      return (
        <g>
          <ellipse cx={x - 3} cy={y} rx={4.4} ry={3.4} fill="#e0584a" {...stroke} />
          <ellipse cx={x - 3} cy={y} rx={2.6} ry={1.9} fill="#f6a99a" />
          <ellipse cx={x + 4} cy={y + 1.5} rx={4.2} ry={3.2} fill="#e0584a" {...stroke} />
          <ellipse cx={x + 4} cy={y + 1.5} rx={2.4} ry={1.7} fill="#f6a99a" />
        </g>
      );
    case 'kimchi':
      return (
        <g>
          <path d={`M${x - 7} ${y + 2} L${x - 4} ${y - 4} L${x} ${y - 1} L${x + 3} ${y - 5} L${x + 7} ${y + 1} L${x + 2} ${y + 4} Z`} fill="#e2452f" {...stroke} />
          <path d={`M${x - 4} ${y + 1} L${x + 3} ${y - 1}`} stroke="#ffd2b8" strokeWidth={1} />
        </g>
      );
    case 'enoki':
      return (
        <g stroke="#f6f0dc" strokeWidth={1.3} strokeLinecap="round">
          {[-5, -2.5, 0, 2.5, 5].map((dx) => (
            <path key={dx} d={`M${x + dx * 0.4} ${y + 4} L${x + dx} ${y - 4}`} />
          ))}
          {[-5, -2.5, 0, 2.5, 5].map((dx) => (
            <circle key={`c${dx}`} cx={x + dx} cy={y - 4.6} r={1.2} fill="#fffbe9" stroke={OL} strokeWidth={0.5} />
          ))}
        </g>
      );
    case 'purple_cabbage':
      return (
        <g stroke="#8e3fa0" strokeWidth={1.8} strokeLinecap="round" fill="none">
          <path d={`M${x - 7} ${y - 2} q3 -2 6 0 t6 0`} />
          <path d={`M${x - 5} ${y + 2} q3 -2 6 0 t5 0`} />
        </g>
      );
    case 'cauliflower':
      return (
        <g>
          <path d={`M${x} ${y + 5} L${x} ${y}`} stroke="#3f7a26" strokeWidth={2.4} strokeLinecap="round" />
          {[
            [-3.5, -1],
            [3.5, -1],
            [0, -3.5],
            [0, 0.5],
          ].map(([dx, dy], i) => (
            <circle key={i} cx={x + dx} cy={y + dy} r={3.2} fill="#5fa83f" {...stroke} />
          ))}
        </g>
      );
    default:
      return null;
  }
}

function Noodles({ count, color }: { count: number; color: string }) {
  const rows = Math.min(3, count) * 3;
  return (
    <g stroke="#f3c64f" strokeWidth={1.8} fill="none" strokeLinecap="round">
      {Array.from({ length: rows }, (_, i) => {
        const y = 33 + (i * 18) / Math.max(1, rows - 1);
        const x0 = 26 + Math.abs(y - 42) * 1.2;
        const x1 = 114 - Math.abs(y - 42) * 1.2;
        const w = (x1 - x0) / 6;
        return <path key={i} className="bowl-item" d={`M${x0} ${y} q${w / 2} -3 ${w} 0 t${w} 0 t${w} 0 t${w} 0 t${w} 0 t${w} 0`} />;
      })}
      {/* lớp nước dùng mỏng phủ chân sợi mì */}
      <ellipse cx={70} cy={50} rx={40} ry={4} fill={color} stroke="none" opacity={0.45} />
    </g>
  );
}

export function DrinkArt({ id, size = 30 }: { id: IngredientId; size?: number }) {
  return (
    <svg className="drink-art" viewBox="0 0 30 44" width={size} height={(size * 44) / 30} aria-hidden="true">
      {id === 'coca' ? (
        <g>
          <rect x="5" y="4" width="20" height="38" rx="4" fill="#d81e1e" stroke={OL} strokeWidth="2" />
          <rect x="7" y="2" width="16" height="4" rx="1.5" fill="#c9c9c9" stroke={OL} strokeWidth="1.5" />
          <path d="M5 22 q5 -5 10 0 t10 0" stroke="#fff" strokeWidth="2.4" fill="none" />
          <text x="15" y="18" textAnchor="middle" className="drink-label">Coca</text>
        </g>
      ) : (
        <g>
          <path d="M6 12 L15 4 L24 12 V42 H6 Z" fill="#f4f6fb" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 12 H24" stroke={OL} strokeWidth="1.5" />
          <rect x="6" y="22" width="18" height="10" fill="#3b82f6" />
          <text x="15" y="30" textAnchor="middle" className="drink-label light">SỮA</text>
          <rect x="17" y="0" width="2.4" height="8" fill="#e53935" stroke={OL} strokeWidth="0.8" transform="rotate(12 18 4)" />
        </g>
      )}
    </svg>
  );
}

export function BowlView({ bowl, size = 132 }: { bowl: Bowl; size?: number }) {
  const contents = bowlContents(bowl);
  const drinks = bowlDrinks(bowl);
  const shots = chiliShots(bowl);
  const filled = contents.length > 0 || shots > 0;
  const broth = brothColor(shots);
  const noodles = contents.filter((id) => id === 'noodle').length;
  const pieces = contents.filter((id) => id !== 'noodle');

  return (
    <div className="bowl-view">
      <svg className="bowl" viewBox="0 0 140 108" width={size} height={(size * 108) / 140} aria-label="Tô mì đang nấu">
        {filled && (
          <g className="bowl-steam" stroke="#bdbdbd" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8">
            <path d="M52 22 q-4 -5 0 -10 t0 -10" />
            <path d="M70 18 q-4 -5 0 -10 t0 -8" />
            <path d="M88 22 q-4 -5 0 -10 t0 -10" />
          </g>
        )}
        {/* thân tô đen, viền đỏ */}
        <path d="M8 40 Q10 96 70 100 Q130 96 132 40 Z" fill="#1d1d1d" stroke={OL} strokeWidth="3" strokeLinejoin="round" />
        <path d="M14 58 Q70 74 126 58" stroke="#e53935" strokeWidth="4" fill="none" />
        <path d="M24 74 Q70 86 116 74" stroke="#ffffff" strokeWidth="1.6" fill="none" opacity="0.35" />
        <rect x="50" y="98" width="40" height="7" rx="3" fill="#1d1d1d" stroke={OL} strokeWidth="2" />
        <ellipse cx="70" cy="40" rx="62" ry="17" fill="#2a2a2a" stroke={OL} strokeWidth="3" />
        <ellipse cx="70" cy="40" rx="62" ry="17" fill="none" stroke="#e53935" strokeWidth="2" />
        {filled && <ellipse cx="70" cy="42" rx="55" ry="13.5" fill={broth} />}
        {noodles > 0 && <Noodles count={noodles} color={broth} />}
        {pieces.map((id, i) => {
          const [x, y] = SLOTS[i % SLOTS.length];
          return (
            <g key={i} className="bowl-item">
              <Piece id={id} x={x} y={y} />
            </g>
          );
        })}
        {/* vụn ớt: mỗi shot thêm vài đốm đỏ */}
        {Array.from({ length: shots * 4 }, (_, i) => (
          <circle
            key={`c${i}`}
            className="bowl-item"
            cx={30 + ((i * 37) % 80)}
            cy={34 + ((i * 13) % 16)}
            r={1.3}
            fill="#ff1f0f"
            stroke="#5a0000"
            strokeWidth="0.4"
          />
        ))}
      </svg>
      {drinks.length > 0 && (
        <div className="bowl-drinks">
          {drinks.map((id, i) => (
            <DrinkArt key={i} id={id} />
          ))}
        </div>
      )}
    </div>
  );
}
