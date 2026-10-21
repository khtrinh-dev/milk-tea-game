import type { JSX, ReactNode } from 'react';
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
      // miếng cải thảo muối ớt: lá cam đỏ, cọng trắng ngà, lấm tấm ớt bột
      return (
        <g>
          <path
            d={`M${x - 7} ${y + 3} C${x - 8} ${y - 2} ${x - 4} ${y - 5} ${x} ${y - 4} C${x + 4} ${y - 5} ${x + 8} ${y - 2} ${x + 7} ${y + 2} C${x + 4} ${y + 5} ${x - 4} ${y + 6} ${x - 7} ${y + 3} Z`}
            fill="#f06a3c"
            {...stroke}
          />
          <path d={`M${x - 5} ${y + 2.6} Q${x} ${y + 4.6} ${x + 5} ${y + 1.8}`} stroke="#fff1d6" strokeWidth={2} fill="none" strokeLinecap="round" />
          <path d={`M${x - 3} ${y - 2.5} q1.5 -1.2 3 0 q1.5 -1.2 3 0`} stroke="#ffb08a" strokeWidth={0.8} fill="none" />
          <circle cx={x - 2.5} cy={y - 0.5} r={0.8} fill="#9e1208" />
          <circle cx={x + 2.5} cy={y - 1.2} r={0.8} fill="#9e1208" />
          <circle cx={x + 0.5} cy={y + 0.8} r={0.7} fill="#9e1208" />
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
    case 'purple_cabbage': {
      // cải tím bào sợi: viền đen để nổi trên nước dùng đỏ
      const shreds = [`M${x - 7} ${y - 2} q3.5 -3 7 0 t6 -1`, `M${x - 6} ${y + 2.5} q3 -2.5 6 0 t6 0`, `M${x - 3} ${y + 0.2} q2.5 -1.8 5 0`];
      return (
        <g fill="none" strokeLinecap="round">
          {shreds.map((d) => (
            <path key={`o${d}`} d={d} stroke={OL} strokeWidth={3.8} />
          ))}
          {shreds.map((d) => (
            <path key={`p${d}`} d={d} stroke="#9b45b5" strokeWidth={2.4} />
          ))}
          {shreds.map((d) => (
            <path key={`h${d}`} d={d} stroke="#e7c2f2" strokeWidth={0.6} />
          ))}
        </g>
      );
    }
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

/** Lon nước ngọt: thân màu + nắp nhôm, `children` là logo trên thân lon. */
function Can({ color, children }: { color: string; children: ReactNode }) {
  return (
    <g>
      <rect x="5" y="4" width="20" height="38" rx="4" fill={color} stroke={OL} strokeWidth="2" />
      <rect x="7" y="2" width="16" height="4" rx="1.5" fill="#c9c9c9" stroke={OL} strokeWidth="1.5" />
      <rect x="8" y="9" width="2.2" height="28" rx="1.1" fill="#fff" opacity="0.25" />
      {children}
    </g>
  );
}

function DrinkShape({ id }: { id: IngredientId }) {
  switch (id) {
    case 'coca':
      return (
        <Can color="#d81e1e">
          <path d="M5 22 q5 -5 10 0 t10 0" stroke="#fff" strokeWidth="2.4" fill="none" />
          <text x="15" y="18" textAnchor="middle" className="drink-label">Coca</text>
        </Can>
      );
    case 'pepsi':
      return (
        <Can color="#1d4fa0">
          <text x="15" y="15.5" textAnchor="middle" className="drink-label">pepsi</text>
          {/* quả cầu đỏ – trắng – xanh */}
          <circle cx="15" cy="27" r="6.4" fill="#fff" stroke={OL} strokeWidth="1" />
          <path d="M8.6 26.4 A6.4 6.4 0 0 1 21.4 26.4 Q18 24.2 15 26 T8.6 26.4 Z" fill="#e32934" />
          <path d="M8.8 28.6 Q12 30.4 15 28.6 T21.2 28 A6.4 6.4 0 0 1 8.8 28.6 Z" fill="#1d4fa0" />
        </Can>
      );
    case 'fanta':
      return (
        <Can color="#ff8a00">
          {/* lát cam + chữ Fanta xanh */}
          <circle cx="15" cy="30" r="5.4" fill="#ffd27a" stroke={OL} strokeWidth="1" />
          <path d="M15 24.6 V35.4 M9.6 30 H20.4 M11.2 26.2 L18.8 33.8 M18.8 26.2 L11.2 33.8" stroke="#ff9d1c" strokeWidth="0.9" />
          <path d="M18 23.5 q4 -3 6 0 q-3 2 -6 0 z" fill="#3fae2a" stroke={OL} strokeWidth="0.7" />
          <text x="15" y="18" textAnchor="middle" className="drink-label fanta">Fanta</text>
        </Can>
      );
    case 'sevenup':
      return (
        <Can color="#1f9d3a">
          <rect x="8" y="12" width="14" height="20" rx="3" fill="#fff" stroke={OL} strokeWidth="1" />
          <text x="15" y="24" textAnchor="middle" className="drink-label seven">7</text>
          <text x="15" y="30.5" textAnchor="middle" className="drink-label seven-up">up</text>
          <circle cx="19" cy="17" r="1.8" fill="#e32934" />
        </Can>
      );
    default:
      return (
        <g>
          <path d="M6 12 L15 4 L24 12 V42 H6 Z" fill="#f4f6fb" stroke={OL} strokeWidth="2" strokeLinejoin="round" />
          <path d="M6 12 H24" stroke={OL} strokeWidth="1.5" />
          <rect x="6" y="22" width="18" height="10" fill="#3b82f6" />
          <text x="15" y="30" textAnchor="middle" className="drink-label light">SỮA</text>
          <rect x="17" y="0" width="2.4" height="8" fill="#e53935" stroke={OL} strokeWidth="0.8" transform="rotate(12 18 4)" />
        </g>
      );
  }
}

export function DrinkArt({ id, size = 30 }: { id: IngredientId; size?: number }) {
  return (
    <svg className="drink-art" viewBox="0 0 30 44" width={size} height={(size * 44) / 30} aria-hidden="true">
      <DrinkShape id={id} />
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
