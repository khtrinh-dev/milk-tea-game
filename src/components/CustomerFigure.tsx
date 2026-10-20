import { useId, type CSSProperties, type JSX, type ReactNode } from 'react';
import type { ArchetypeId, CustomerLook } from '../game/types';
import './CustomerFigure.css';

// Nhân vật khách vẽ toàn thân bằng SVG (viewBox 80×160, chân chạm y≈158).
// Phần dùng chung (đầu, mặt, tay, chân, thân) + cấu hình trang phục và phụ kiện riêng cho từng kiểu khách.
// Tay/chân là các <g> riêng để CSS (.cf-walking) cho đung đưa khi đi.

/**
 * Biểu cảm khuôn mặt. Ngoài các mức chờ (normal → worried → angry), sau khi ăn khách có thể:
 * happy (khen ngon), hot (cay quá – mặt đỏ bừng, bốc khói), disdain (không cay – mặt khinh), sad (chê dở).
 */
export type FigureMood = 'happy' | 'normal' | 'worried' | 'angry' | 'hot' | 'disdain' | 'sad';

export type CarryItem = 'bowl' | 'bag';

export interface CustomerFigureProps {
  look: CustomerLook;
  walking?: boolean;
  mood?: FigureMood;
  /** Đồ bưng trước ngực: tô mì (ăn tại chỗ) hoặc túi mì mang về. */
  carrying?: CarryItem | null;
  facing?: 'left' | 'right';
  height?: number;
}

/** Tông da: sáng → rám nắng. */
export const SKIN_PALETTE = ['#ffe0c7', '#f7cfa8', '#e8b48a', '#c98d62'] as const;
/** Màu tóc: đen, nâu đậm, nâu, nhuộm caramel. */
export const HAIR_PALETTE = ['#1f1611', '#3b2417', '#6b4226', '#b5652d'] as const;

const OL = '#3b2416';
const line = { stroke: OL, strokeWidth: 1.6, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;
const thin = { ...line, strokeWidth: 1.1 } as const;

type Hair = 'short' | 'messy' | 'slick' | 'buzz' | 'long' | 'ponytail' | 'bun' | 'bob' | 'braids';
type Sleeve = 'long' | 'short' | 'none';
type Bottom = 'pants' | 'shorts' | 'skirt' | 'pencil' | 'dress' | 'aodai';
type Shoe = 'sneaker' | 'shoe' | 'boot' | 'heel';

interface Outfit {
  top: string;
  sleeve: Sleeve;
  bottom: Bottom;
  bottomColor: string;
  shoe: Shoe;
  shoeColor: string;
  hair: Hair;
  /** Các index trong HAIR_PALETTE hợp với kiểu khách này. */
  hairColors: number[];
  socks?: string;
  /** Vai rộng, tay to (anh gymer). */
  wide?: boolean;
  /** Bụng hơi to (anh giám đốc). */
  belly?: boolean;
  /** Son môi đỏ. */
  lips?: boolean;
}

interface Ctx {
  o: Outfit;
  skin: string;
  hair: string;
  clip: string;
  /** Tâm x của bàn tay trái – nơi cầm đồ. */
  hx: number;
  flip: boolean;
}

interface Art {
  outfit: Outfit;
  /** Sau lưng: balo, mũ áo hoodie. */
  back?: (c: Ctx) => ReactNode;
  /** Vẽ đè lên áo, bị cắt theo dáng thân (sọc, áo gile). */
  torso?: (c: Ctx) => ReactNode;
  /** Vẽ đè lên áo, không cắt (cổ áo, cà vạt, thẻ đeo). */
  chest?: (c: Ctx) => ReactNode;
  /** Mũ, kính, băng đô. */
  head?: (c: Ctx) => ReactNode;
  /** Đồ cầm ở tay trái, đung đưa theo tay. */
  hand?: (c: Ctx) => ReactNode;
}

const mod = (n: number, m: number) => ((Math.trunc(n) % m) + m) % m;

// ---------------------------------------------------------------------------
// Hình học dùng chung
// ---------------------------------------------------------------------------

function torsoPath(o: Outfit): string {
  if (o.wide) return 'M21 55 Q22 49 31 48 L49 48 Q58 49 59 55 L53 96 L27 96 Z';
  if (o.belly) return 'M26 53 Q27 49 33 48 L47 48 Q53 49 54 53 Q60 76 55 96 L25 96 Q20 76 26 53 Z';
  return 'M26 53 Q27 49 33 48 L47 48 Q53 49 54 53 L55 96 L25 96 Z';
}

function armRect(o: Outfit, side: 'l' | 'r') {
  const w = o.wide ? 10 : 8;
  const x = side === 'l' ? (o.wide ? 14.5 : 20) : o.wide ? 55.5 : 52;
  return { x, w, cx: x + w / 2 };
}

/** Chữ trên áo: lật ngược lại khi nhân vật quay trái để không bị ngược chữ. */
function unflip(c: Ctx, cx: number): string | undefined {
  return c.flip ? `translate(${cx * 2} 0) scale(-1 1)` : undefined;
}

function Clip({ c, children }: { c: Ctx; children: ReactNode }) {
  return <g clipPath={`url(#${c.clip})`}>{children}</g>;
}

// ---------------------------------------------------------------------------
// Bộ phận cơ thể
// ---------------------------------------------------------------------------

function Leg({ c, side }: { c: Ctx; side: 'l' | 'r' }) {
  const { o } = c;
  const x = side === 'l' ? 29.5 : 41.5;
  const bare = o.bottom === 'skirt' || o.bottom === 'pencil' || o.bottom === 'dress' || o.bottom === 'shorts';
  const legColor = o.bottom === 'aodai' ? '#fbfaf5' : bare ? c.skin : o.bottomColor;
  const sx = side === 'l' ? x - 3 : x - 0.5; // mũi giày chĩa ra ngoài
  return (
    <g className={`cf-leg cf-leg-${side}`}>
      <rect x={x} y={92} width={9} height={60} rx={3.5} fill={legColor} {...line} />
      {o.bottom === 'shorts' && <rect x={x - 0.5} y={92} width={10} height={24} rx={2} fill={o.bottomColor} {...line} />}
      {o.socks && <rect x={x} y={128} width={9} height={22} rx={2} fill={o.socks} {...thin} />}
      {o.shoe === 'boot' && <rect x={x - 0.8} y={134} width={10.6} height={18} rx={2.5} fill={o.shoeColor} {...line} />}
      {o.shoe === 'heel' ? (
        <>
          <path d={`M${x + (side === 'l' ? 1.5 : 7.5)} 156 l0 2.6`} stroke={OL} strokeWidth={2.2} strokeLinecap="round" />
          <rect x={sx + 1.5} y={150.5} width={10} height={6} rx={3} fill={o.shoeColor} {...line} />
        </>
      ) : (
        <>
          <rect x={sx} y={149.5} width={12.5} height={8} rx={4} fill={o.shoe === 'sneaker' ? '#fafafa' : o.shoeColor} {...line} />
          {o.shoe === 'sneaker' && <path d={`M${sx + 1.2} 155 L${sx + 11.3} 155`} stroke={o.shoeColor} strokeWidth={1.6} strokeLinecap="round" />}
          {o.shoe === 'shoe' && <ellipse cx={sx + 4.5} cy={152} rx={2} ry={0.9} fill="#fff" opacity={0.45} />}
        </>
      )}
    </g>
  );
}

function Arm({ c, side, children }: { c: Ctx; side: 'l' | 'r'; children?: ReactNode }) {
  const { o } = c;
  const { x, w, cx } = armRect(o, side);
  return (
    <g className={`cf-arm cf-arm-${side}`}>
      <rect x={x} y={51} width={w} height={37} rx={w / 2} fill={c.skin} {...line} />
      {o.wide && <path d={`M${x + 2} 66 Q${cx} 61.5 ${x + w - 2} 66`} fill="none" {...thin} opacity={0.55} />}
      {o.sleeve !== 'none' && (
        <rect x={x} y={51} width={w} height={o.sleeve === 'long' ? 33 : 13} rx={w / 2} fill={o.top} {...line} />
      )}
      <circle cx={cx} cy={89} r={4.3} fill={c.skin} {...line} />
      {children}
    </g>
  );
}

/** Tô mì cay nhỏ có đôi đũa: (x, y) = tâm miệng tô. */
function NoodleBowl({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x + 1} ${y + 1} L${x + 9} ${y - 12} M${x + 3} ${y + 1.5} L${x + 11.5} ${y - 10.5}`} stroke={OL} strokeWidth={2.4} strokeLinecap="round" />
      <path d={`M${x + 1} ${y + 1} L${x + 9} ${y - 12} M${x + 3} ${y + 1.5} L${x + 11.5} ${y - 10.5}`} stroke="#d9a777" strokeWidth={1.1} strokeLinecap="round" />
      <ellipse cx={x} cy={y} rx={9} ry={2.6} fill="#c8261c" {...thin} />
      <path d={`M${x - 5} ${y - 0.4} q2 -1.6 4 0 t4 0`} stroke="#f3c64f" strokeWidth={1.1} fill="none" />
      <path d={`M${x - 9} ${y} Q${x - 8} ${y + 9} ${x} ${y + 9} Q${x + 8} ${y + 9} ${x + 9} ${y} Z`} fill="#1d1d1d" {...thin} />
      <path d={`M${x - 8} ${y + 2.6} Q${x} ${y + 4.6} ${x + 8} ${y + 2.6}`} stroke="#e53935" strokeWidth={1.2} fill="none" />
    </g>
  );
}

/** Túi nilon mì mang về có in hình quả ớt: (x, y) = tâm miệng túi. */
function TakeawayBag({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <path d={`M${x - 4} ${y} Q${x} ${y - 7} ${x + 4} ${y}`} stroke={OL} strokeWidth={1.4} fill="none" />
      <path d={`M${x - 8} ${y} L${x + 8} ${y} L${x + 9} ${y + 15} Q${x} ${y + 17} ${x - 9} ${y + 15} Z`} fill="#fff" {...thin} />
      <path d={`M${x - 1.5} ${y + 5} q4 1 3.5 7 q-4.5 -1.5 -3.5 -7 z`} fill="#e53935" />
      <path d={`M${x - 1.5} ${y + 5} l-1 -1.6`} stroke="#3f7a26" strokeWidth={1} />
    </g>
  );
}

/** Tay phải co lên bưng tô mì / xách túi mang về trước ngực – không đung đưa. */
function CarryArm({ c, item }: { c: Ctx; item: CarryItem }) {
  const { o } = c;
  const { x, w } = armRect(o, 'r');
  const upper = o.sleeve === 'none' ? c.skin : o.top;
  const fore = o.sleeve === 'long' ? o.top : c.skin;
  return (
    <g className="cf-arm cf-arm-r cf-arm-carry">
      <rect x={x} y={51} width={w} height={22} rx={w / 2} fill={upper} {...line} />
      {item === 'bowl' ? <NoodleBowl x={44} y={62} /> : <TakeawayBag x={44} y={60} />}
      <rect x={44} y={65} width={x + w - 44} height={8} rx={4} fill={fore} {...line} />
      <circle cx={45.5} cy={69} r={4.3} fill={c.skin} {...line} />
    </g>
  );
}

function Torso({ c, art }: { c: Ctx; art: Art }) {
  const { o } = c;
  const path = torsoPath(o);
  const hip = o.bottom === 'pants' || o.bottom === 'shorts' || o.bottom === 'aodai';
  return (
    <g>
      {hip && <path d="M27 86 L53 86 L52.5 100 L27.5 100 Z" fill={o.bottom === 'aodai' ? '#fbfaf5' : o.bottomColor} {...line} />}
      <path d={path} fill={o.top} />
      <Clip c={c}>
        <rect x={42} y={44} width={20} height={56} fill="#000" opacity={0.08} />
        {art.torso?.(c)}
      </Clip>
      <path d={path} fill="none" {...line} />
      {art.chest?.(c)}
      {o.bottom === 'skirt' && <path d="M26.5 89 L53.5 89 L58 122 Q40 125 22 122 Z" fill={o.bottomColor} {...line} />}
      {o.bottom === 'pencil' && <path d="M26.5 89 L53.5 89 L52.5 123 L27.5 123 Z" fill={o.bottomColor} {...line} />}
      {o.bottom === 'dress' && (
        <>
          <path d="M26.5 88 L20 124 Q40 128 60 124 L53.5 88" fill={o.top} {...line} />
          <path d="M26 88.5 L54 88.5" stroke="#f2c94c" strokeWidth={2} />
        </>
      )}
      {o.bottom === 'aodai' && (
        <>
          <path d="M29.5 86 L26.5 137 Q40 139 53.5 137 L50.5 86" fill={o.top} {...line} />
          <path d="M44 92 L45.5 135" stroke="#000" strokeWidth={1} opacity={0.08} />
        </>
      )}
    </g>
  );
}

function HairBack({ c }: { c: Ctx }) {
  const f = { fill: c.hair, ...line };
  switch (c.o.hair) {
    case 'long':
      return <path d="M22 28 Q16 48 20 60 Q18 68 25 70 Q30 74 34 69 L46 69 Q50 74 55 70 Q62 68 60 60 Q64 48 58 28 Z" {...f} />;
    case 'bob':
      return <path d="M21.5 27 Q19 44 23 51 Q40 54 57 51 Q61 44 58.5 27 Z" {...f} />;
    case 'ponytail':
      return <path d="M53 21 Q67 25 64 43 Q62 55 56 60 Q57 46 51 33 Z" {...f} />;
    case 'bun':
      return <circle cx={40} cy={10} r={6.8} {...f} />;
    default:
      return null;
  }
}

function HairFront({ c }: { c: Ctx }) {
  const f = { fill: c.hair, ...line };
  const cap = 'M23.5 31 Q22 12 40 12 Q58 12 56.5 31 Q55 22 48 20 Q40 25 30 21 Q25 24 23.5 31 Z';
  switch (c.o.hair) {
    case 'messy':
      return (
        <>
          <path d="M25 21 L26 9 L32 14 L35.5 6 L40 12 L45.5 5.5 L48 13.5 L54 9 L55 21 Z" {...f} />
          <path d={cap} {...f} />
        </>
      );
    case 'slick':
      return (
        <>
          <path d="M23.5 30 Q22 11 40 11 Q58 11 56.5 30 Q54 19 45 17.5 Q32 18 26 24 Q24.5 27 23.5 30 Z" {...f} />
          <path d="M30 15.5 Q38 12.5 47 14" stroke="#fff" strokeWidth={1.2} opacity={0.35} fill="none" strokeLinecap="round" />
        </>
      );
    case 'buzz':
      return <path d="M24 26 Q25 13 40 13 Q55 13 56 26 Q48 18.5 40 18.5 Q32 18.5 24 26 Z" {...f} />;
    case 'long':
      return <path d="M23 34 Q21 11 40 11 Q59 11 57 34 Q56 22 46 18 Q36 24 27 22 Q24 27 23 34 Z" {...f} />;
    case 'bob':
      return <path d="M23 32 Q21 11 40 11 Q59 11 57 32 L56 23.5 Q40 26.5 24 23.5 Z" {...f} />;
    case 'braids':
      return (
        <>
          {[24.5, 55.5].map((bx) => (
            <g key={bx}>
              {[40, 46.5, 53, 59.5].map((by) => (
                <ellipse key={by} cx={bx} cy={by} rx={3.4} ry={3.9} {...f} />
              ))}
              <circle cx={bx} cy={64.5} r={2} fill="#e53935" {...thin} />
            </g>
          ))}
          <path d={cap} {...f} />
        </>
      );
    case 'ponytail':
      return (
        <>
          <path d={cap} {...f} />
          <circle cx={54} cy={22.5} r={2.3} fill="#f06292" {...thin} />
        </>
      );
    default:
      return <path d={cap} {...f} />;
  }
}

function Face({ mood, lips }: { mood: FigureMood; lips: boolean }) {
  const mouth = lips ? '#d62d50' : OL;
  const dotEyes = (
    <>
      {[34, 46].map((ex) => (
        <g key={ex}>
          <ellipse cx={ex} cy={31.5} rx={1.7} ry={mood === 'angry' ? 1.9 : 2.3} fill={OL} />
          <circle cx={ex + 0.6} cy={30.6} r={0.55} fill="#fff" />
        </g>
      ))}
    </>
  );
  const blush = (color: string, opacity: number) => (
    <>
      <ellipse cx={30.5} cy={36.5} rx={3} ry={1.8} fill={color} opacity={opacity} />
      <ellipse cx={49.5} cy={36.5} rx={3} ry={1.8} fill={color} opacity={opacity} />
    </>
  );
  const brow = { stroke: OL, strokeWidth: 1.8, strokeLinecap: 'round', fill: 'none' } as const;

  switch (mood) {
    case 'happy':
      return (
        <g>
          {blush('#ff8a8a', 0.55)}
          <path d="M31.5 32 Q34 28.5 36.5 32 M43.5 32 Q46 28.5 48.5 32" {...brow} />
          <path d="M35.5 36.5 Q40 43.5 44.5 36.5 Z" fill="#b23a3a" stroke={mouth} strokeWidth={1.3} strokeLinejoin="round" />
        </g>
      );
    case 'worried':
      return (
        <g>
          {blush('#ff8a8a', 0.25)}
          {dotEyes}
          <path d="M31 26.5 L36.5 25.3 M49 26.5 L43.5 25.3" {...brow} strokeWidth={1.4} />
          <path d="M36.5 38.5 Q38.2 37.3 40 38.5 Q41.8 39.7 43.5 38.5" stroke={mouth} strokeWidth={1.4} fill="none" strokeLinecap="round" />
          <path d="M56 18 Q53.3 23 56 24.6 Q58.7 23 56 18 Z" fill="#8fd3ff" stroke="#4a90c2" strokeWidth={0.8} />
        </g>
      );
    case 'angry':
      return (
        <g>
          {blush('#ff5a5a', 0.5)}
          {dotEyes}
          <path d="M31 25.3 L36.8 27.8 M49 25.3 L43.2 27.8" {...brow} strokeWidth={2} />
          <path d="M36.5 39.5 Q40 36.5 43.5 39.5" stroke={mouth} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {/* dấu 💢 */}
          <g transform="translate(58 12)" stroke="#e53935" strokeWidth={1.5} fill="none" strokeLinecap="round">
            <path d="M-4 -1.5 Q-1.5 -1.5 -1.5 -4 M1.5 -4 Q1.5 -1.5 4 -1.5 M4 1.5 Q1.5 1.5 1.5 4 M-1.5 4 Q-1.5 1.5 -4 1.5" />
          </g>
        </g>
      );
    case 'hot':
      return (
        <g>
          {/* mắt nhắm tịt > < */}
          <path d="M31.5 29.5 L36 31.5 L31.5 33.5 M48.5 29.5 L44 31.5 L48.5 33.5" {...brow} strokeWidth={1.6} />
          <path d="M30.5 25.5 L36.5 27 M49.5 25.5 L43.5 27" {...brow} strokeWidth={1.5} />
          {/* há miệng thè lưỡi */}
          <path d="M35 36 Q40 35 45 36 Q44.5 42.5 40 42.5 Q35.5 42.5 35 36 Z" fill="#7a1010" stroke={OL} strokeWidth={1.3} strokeLinejoin="round" />
          <path d="M37.2 39.5 Q40 38 42.8 39.5 L42.4 44.5 Q40 47 37.6 44.5 Z" fill="#ff6f7d" stroke={OL} strokeWidth={1} />
          {/* mồ hôi + khói bốc trên đầu */}
          <path d="M23 21 Q20.5 26 23 27.6 Q25.5 26 23 21 Z" fill="#8fd3ff" stroke="#4a90c2" strokeWidth={0.8} />
          <path d="M57 23 Q54.5 28 57 29.6 Q59.5 28 57 23 Z" fill="#8fd3ff" stroke="#4a90c2" strokeWidth={0.8} />
          <g className="cf-steam" stroke="#9e9e9e" strokeWidth={1.6} fill="none" strokeLinecap="round" opacity={0.85}>
            <path d="M30 6 q-3 -3 0 -6 t0 -6" />
            <path d="M40 4 q-3 -3 0 -6 t0 -6" />
            <path d="M50 6 q-3 -3 0 -6 t0 -6" />
          </g>
        </g>
      );
    case 'disdain':
      return (
        <g>
          {/* mắt lim dim liếc ngang, một bên mày nhướn */}
          {[34, 46].map((ex) => (
            <g key={ex}>
              <ellipse cx={ex + 1} cy={32} rx={1.6} ry={1.5} fill={OL} />
              <path d={`M${ex - 3} 31 L${ex + 3} 31`} stroke={OL} strokeWidth={1.6} strokeLinecap="round" />
            </g>
          ))}
          <path d="M31 27.5 L36.8 27.8" {...brow} strokeWidth={1.6} />
          <path d="M43.2 26.2 Q46 23.5 49 25.2" {...brow} strokeWidth={1.6} />
          {/* nhếch mép */}
          <path d="M36 39 Q39.5 39.6 41.5 38.6 Q43.5 37.6 45 36" stroke={mouth} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </g>
      );
    case 'sad':
      return (
        <g>
          {blush('#8fb8ff', 0.25)}
          {dotEyes}
          <path d="M31 27 L36.5 25.3 M49 27 L43.5 25.3" {...brow} strokeWidth={1.6} />
          <path d="M36 40.5 Q40 36.5 44 40.5" stroke={mouth} strokeWidth={1.6} fill="none" strokeLinecap="round" />
          {/* giọt nước mắt */}
          <path d="M33.5 34 Q31.8 37.6 33.5 38.8 Q35.2 37.6 33.5 34 Z" fill="#8fd3ff" stroke="#4a90c2" strokeWidth={0.7} />
        </g>
      );
    default:
      return (
        <g>
          {blush('#ff8a8a', 0.3)}
          {dotEyes}
          <path d="M37 37.5 Q40 40 43 37.5" stroke={mouth} strokeWidth={1.5} fill="none" strokeLinecap="round" />
        </g>
      );
  }
}

function Head({ c, art, mood }: { c: Ctx; art: Art; mood: FigureMood }) {
  return (
    <g>
      <circle cx={24} cy={31.5} r={3} fill={c.skin} {...line} />
      <circle cx={56} cy={31.5} r={3} fill={c.skin} {...line} />
      <circle cx={40} cy={30} r={16} fill={c.skin} {...line} />
      {mood === 'hot' && (
        <g className="cf-flush">
          <circle cx={24} cy={31.5} r={2.2} fill="#ff2d1a" opacity={0.55} />
          <circle cx={56} cy={31.5} r={2.2} fill="#ff2d1a" opacity={0.55} />
          <circle cx={40} cy={30} r={15.2} fill="#ff2d1a" opacity={0.5} />
        </g>
      )}
      <HairFront c={c} />
      <Face mood={mood} lips={!!c.o.lips} />
      {art.head?.(c)}
    </g>
  );
}

// ---------------------------------------------------------------------------
// Phụ kiện dùng lại
// ---------------------------------------------------------------------------

function Backpack({ color }: { color: string }) {
  return <rect x={22.5} y={52} width={35} height={38} rx={8} fill={color} {...line} />;
}

function Straps({ color }: { color: string }) {
  return <path d="M31.5 49 L30 82 M48.5 49 L50 82" stroke={color} strokeWidth={3} strokeLinecap="round" />;
}

function CrewNeck() {
  return <path d="M35 48.5 Q40 53.5 45 48.5" fill="none" {...thin} />;
}

/** Túi xách treo ở tay: quai + thân túi. */
function HandBag({ x, color, w = 12, h = 10 }: { x: number; color: string; w?: number; h?: number }) {
  return (
    <g>
      <path d={`M${x - w / 2 + 2.5} 93 Q${x} 84 ${x + w / 2 - 2.5} 93`} fill="none" {...line} />
      <rect x={x - w / 2} y={92} width={w} height={h} rx={2.5} fill={color} {...line} />
    </g>
  );
}

// ---------------------------------------------------------------------------
// Cấu hình từng kiểu khách
// ---------------------------------------------------------------------------

const ART: Record<ArchetypeId, Art> = {
  grab: {
    outfit: { top: '#00b14f', sleeve: 'long', bottom: 'pants', bottomColor: '#2f3e5c', shoe: 'sneaker', shoeColor: '#5d6d7e', hair: 'short', hairColors: [0, 1, 2] },
    torso: () => <rect x={18} y={63} width={44} height={5} fill="#00873c" />,
    chest: () => (
      <>
        <path d="M40 53 L40 95" stroke="#006b30" strokeWidth={1.2} />
        <path d="M33.5 48 L40 54 L46.5 48 L46 52 L40 58 L34 52 Z" fill="#00873c" {...thin} />
      </>
    ),
    head: () => (
      <g>
        <path d="M22.5 26 Q22 8.5 40 8.5 Q58 8.5 57.5 26 Z" fill="#00b14f" {...line} />
        <path d="M37 9 L43 9 L43.5 25.5 L36.5 25.5 Z" fill="#fff" opacity={0.85} />
        <path d="M21 25 L59 25 Q59.5 28.5 56 28.5 L24 28.5 Q20.5 28.5 21 25 Z" fill="#00873c" {...line} />
        <path d="M23.5 28.5 L31 44 M56.5 28.5 L49 44" stroke={OL} strokeWidth={1} opacity={0.6} />
      </g>
    ),
    hand: (c) => <rect x={c.hx - 2.6} y={89} width={5.2} height={9} rx={1.2} fill="#263238" {...thin} />,
  },
  engineer: {
    outfit: { top: '#4a7bd0', sleeve: 'long', bottom: 'pants', bottomColor: '#c2a878', shoe: 'boot', shoeColor: '#7a4a2b', hair: 'short', hairColors: [0, 1, 2] },
    torso: () => (
      <>
        <path d="M18 44 L37 44 L37 100 L18 100 Z M43 44 L62 44 L62 100 L43 100 Z" fill="#ff8a1f" />
        <path d="M18 73 L37 73 L37 77 L18 77 Z M43 73 L62 73 L62 77 L43 77 Z M18 84 L37 84 L37 88 L18 88 Z M43 84 L62 84 L62 88 L43 88 Z" fill="#e8eef2" />
        <path d="M37 44 L37 100 M43 44 L43 100" stroke={OL} strokeWidth={1.2} />
      </>
    ),
    chest: () => <path d="M35 48 L40 53 L45 48" fill="none" {...thin} />,
    head: () => (
      <g>
        <path d="M25.5 22 Q25 8 40 8 Q55 8 54.5 22 Z" fill="#f6c026" {...line} />
        <path d="M40 8.5 L40 21.5" stroke={OL} strokeWidth={1.2} />
        <path d="M20 21 L60 21 Q61 25 57 25 L23 25 Q19 25 20 21 Z" fill="#f6c026" {...line} />
      </g>
    ),
    hand: (c) => (
      <g>
        <rect x={c.hx - 2.8} y={84} width={5.6} height={24} rx={2.4} fill="#cfe6ff" {...thin} />
        <path d={`M${c.hx - 2.8} 90 L${c.hx + 2.8} 90 M${c.hx - 2.8} 101 L${c.hx + 2.8} 101`} stroke="#4a7bd0" strokeWidth={0.9} />
        <circle cx={c.hx} cy={89} r={4.3} fill={c.skin} {...line} />
      </g>
    ),
  },
  dev: {
    outfit: { top: '#4b5a6e', sleeve: 'long', bottom: 'pants', bottomColor: '#3d5a80', shoe: 'sneaker', shoeColor: '#e74c3c', hair: 'messy', hairColors: [0, 1, 2] },
    back: () => <path d="M28 55 Q23 44 33 43.5 L47 43.5 Q57 44 52 55 Z" fill="#3e4b5c" {...line} />,
    torso: () => <path d="M30.5 79 L49.5 79 L51.5 92 L28.5 92 Z" fill="#3e4b5c" stroke={OL} strokeWidth={1} />,
    chest: () => (
      <>
        <path d="M37 50 L36.5 60 M43 50 L43.5 61" stroke="#e0e0e0" strokeWidth={1} strokeLinecap="round" />
        <path d="M31 50 Q40 60.5 49 50" fill="none" stroke="#212121" strokeWidth={2.2} />
        <ellipse cx={30.5} cy={50.5} rx={3} ry={3.6} fill="#212121" />
        <ellipse cx={49.5} cy={50.5} rx={3} ry={3.6} fill="#212121" />
      </>
    ),
    head: () => (
      <g fill="#ffffff" fillOpacity={0.25} stroke="#1b1b1b" strokeWidth={1.3}>
        <rect x={29.3} y={27.6} width={9.4} height={7.6} rx={2.6} />
        <rect x={41.3} y={27.6} width={9.4} height={7.6} rx={2.6} />
        <path d="M38.7 30.5 L41.3 30.5" fill="none" />
      </g>
    ),
    hand: (c) => (
      <g>
        <rect x={c.hx - 2.2} y={82} width={4.4} height={22} rx={1} fill="#b0bec5" {...thin} />
        <circle cx={c.hx} cy={89} r={4.3} fill={c.skin} {...line} />
      </g>
    ),
  },
  lady: {
    outfit: { top: '#e63950', sleeve: 'none', bottom: 'dress', bottomColor: '#e63950', shoe: 'heel', shoeColor: '#c2185b', hair: 'long', hairColors: [0, 1, 2, 3], lips: true },
    chest: (c) => <path d="M33 48 Q40 58 47 48 Z" fill={c.skin} {...thin} />,
    head: () => (
      <g>
        <circle cx={24.5} cy={37} r={1.6} fill="#f2c94c" stroke={OL} strokeWidth={0.6} />
        <circle cx={55.5} cy={37} r={1.6} fill="#f2c94c" stroke={OL} strokeWidth={0.6} />
        <path d="M38.6 15 L41.4 15" stroke="#222" strokeWidth={1.2} />
        <ellipse cx={34} cy={15} rx={4.6} ry={3} fill="#222" stroke={OL} strokeWidth={0.8} />
        <ellipse cx={46} cy={15} rx={4.6} ry={3} fill="#222" stroke={OL} strokeWidth={0.8} />
        <path d="M32 14 L34.5 13 M44 14 L46.5 13" stroke="#fff" strokeWidth={0.8} opacity={0.7} />
      </g>
    ),
    hand: (c) => <HandBag x={c.hx} color="#f48fb1" />,
  },
  director: {
    outfit: { top: '#2c3e50', sleeve: 'long', bottom: 'pants', bottomColor: '#2c3e50', shoe: 'shoe', shoeColor: '#1b1b1b', hair: 'slick', hairColors: [0, 1], belly: true },
    chest: () => (
      <>
        <path d="M34 48 L40 66 L46 48 Z" fill="#fafafa" {...thin} />
        <path d="M38.7 50.5 L41.3 50.5 L42.7 62.5 L40 66 L37.3 62.5 Z" fill="#d32f2f" {...thin} />
        <path d="M33.5 48.5 L38.5 69 M46.5 48.5 L41.5 69" stroke="#1a252f" strokeWidth={1.4} />
        <circle cx={40} cy={76} r={1.1} fill="#f2c94c" />
        <circle cx={40} cy={84} r={1.1} fill="#f2c94c" />
      </>
    ),
    hand: (c) => (
      <g>
        <path d={`M${c.hx - 3} 92 L${c.hx - 3} 89.5 L${c.hx + 3} 89.5 L${c.hx + 3} 92`} fill="none" {...thin} />
        <rect x={c.hx - 8} y={92} width={16} height={11} rx={1.8} fill="#6d4c41" {...line} />
        <path d={`M${c.hx - 8} 96 L${c.hx + 8} 96`} stroke="#4e342e" strokeWidth={1} />
      </g>
    ),
  },
  ueh: {
    outfit: { top: '#fdfdfd', sleeve: 'short', bottom: 'skirt', bottomColor: '#22314f', shoe: 'sneaker', shoeColor: '#00626f', hair: 'ponytail', hairColors: [0, 1, 2, 3], socks: '#ffffff' },
    back: () => <Backpack color="#f5b041" />,
    chest: (c) => (
      <>
        <Straps color="#d68910" />
        <path d="M34 48 L40 53 L46 48 L45.5 51.5 L40 56 L34.5 51.5 Z" fill="#00626f" {...thin} />
        <rect x={39.5} y={59} width={13} height={7} rx={1.5} fill="#00626f" {...thin} />
        <text x={46} y={64.6} textAnchor="middle" fontSize={5} fontWeight={800} fill="#fff" fontFamily="'Baloo 2', sans-serif" transform={unflip(c, 46)}>
          UEH
        </text>
      </>
    ),
  },
  fpt: {
    outfit: { top: '#f37021', sleeve: 'short', bottom: 'pants', bottomColor: '#3d5a80', shoe: 'sneaker', shoeColor: '#333333', hair: 'messy', hairColors: [0, 1, 2, 3] },
    back: () => <Backpack color="#34495e" />,
    torso: () => (
      <>
        <rect x={18} y={88} width={44} height={2} fill="#1a5dab" />
        <rect x={18} y={91} width={44} height={2} fill="#2ab24b" />
      </>
    ),
    chest: (c) => (
      <>
        <CrewNeck />
        <rect x={33} y={60} width={14} height={7.5} rx={2} fill="#fff" {...thin} />
        <text x={40} y={66} textAnchor="middle" fontSize={5.6} fontWeight={800} fontFamily="'Baloo 2', sans-serif" transform={unflip(c, 40)}>
          <tspan fill="#1a5dab">F</tspan>
          <tspan fill="#f37021">P</tspan>
          <tspan fill="#2ab24b">T</tspan>
        </text>
        <Straps color="#2c3e50" />
      </>
    ),
  },
  pupil: {
    outfit: { top: '#ffffff', sleeve: 'short', bottom: 'skirt', bottomColor: '#1f3a68', shoe: 'shoe', shoeColor: '#222222', hair: 'braids', hairColors: [0, 1], socks: '#ffffff' },
    chest: () => (
      <>
        <path d="M34 48 L40 54 L46 48 M34 48 L33 52 L38 53 M46 48 L47 52 L42 53" fill="#fff" {...thin} />
        <path d="M44 58 L50 58 L50 62.5 Q47 66 44 62.5 Z" fill="#1565c0" {...thin} />
        <path d="M44.3 60.5 L49.7 60.5" stroke="#e53935" strokeWidth={1.4} />
      </>
    ),
    hand: (c) => (
      <g>
        <HandBag x={c.hx} color="#2e86c1" w={13} h={11} />
        <path d={`M${c.hx - 6.5} 96 L${c.hx + 6.5} 96`} stroke="#1b4f72" strokeWidth={1.2} />
      </g>
    ),
  },
  teacher: {
    outfit: { top: '#b39ddb', sleeve: 'long', bottom: 'aodai', bottomColor: '#fbfaf5', shoe: 'heel', shoeColor: '#9575cd', hair: 'bun', hairColors: [0, 1] },
    chest: () => (
      <>
        <path d="M35 46.5 L45 46.5 L45 51 Q40 53 35 51 Z" fill="#9c86c9" {...thin} />
        <path d="M45 51 Q50 54 53 59" fill="none" stroke="#7e67b0" strokeWidth={1.1} strokeDasharray="1.5 1.8" />
      </>
    ),
    hand: (c) => (
      <g>
        <rect x={c.hx - 7} y={83} width={14} height={5.5} rx={1} fill="#e57373" {...thin} />
        <rect x={c.hx - 6} y={88.5} width={12} height={5.5} rx={1} fill="#64b5f6" {...thin} />
        <circle cx={c.hx} cy={89} r={4.3} fill={c.skin} {...line} />
      </g>
    ),
  },
  office: {
    outfit: { top: '#fce4ec', sleeve: 'long', bottom: 'pencil', bottomColor: '#546e7a', shoe: 'heel', shoeColor: '#37474f', hair: 'bob', hairColors: [0, 1, 2, 3] },
    chest: () => (
      <>
        <path d="M34.5 48 L40 52.5 L45.5 48" fill="none" {...thin} />
        <path d="M36 49 L40 65 L44 49" fill="none" stroke="#1e88e5" strokeWidth={1.2} />
        <rect x={36.5} y={65} width={7} height={9} rx={1} fill="#fff" {...thin} />
        <rect x={36.5} y={65} width={7} height={2.5} rx={1} fill="#1e88e5" />
      </>
    ),
    hand: (c) => (
      <g>
        <path d={`M${c.hx - 4} 95 Q${c.hx} 82 ${c.hx + 4} 95`} fill="none" {...line} />
        <path d={`M${c.hx - 6} 94 L${c.hx + 6} 94 L${c.hx + 7.5} 108 L${c.hx - 7.5} 108 Z`} fill="#d7b98e" {...line} />
      </g>
    ),
  },
  gymer: {
    outfit: { top: '#263238', sleeve: 'none', bottom: 'shorts', bottomColor: '#e53935', shoe: 'sneaker', shoeColor: '#e53935', hair: 'buzz', hairColors: [0, 1, 2], wide: true },
    chest: (c) => (
      <>
        <path d="M33 48 Q40 60 47 48 Z" fill={c.skin} {...thin} />
        <path d="M21 55 Q22 49 31 48 L33 48 Q31.5 57 26 61 Z M59 55 Q58 49 49 48 L47 48 Q48.5 57 54 61 Z" fill={c.skin} {...thin} />
        <path d="M34 70 Q40 73 46 70" fill="none" stroke="#e53935" strokeWidth={1.4} />
      </>
    ),
    head: () => <path d="M24 21 Q40 16 56 21 L56.5 25.2 Q40 20.2 23.5 25.2 Z" fill="#e53935" {...line} />,
    hand: (c) => (
      <g>
        <rect x={c.hx - 3.6} y={84} width={7.2} height={19} rx={2} fill="#e3f2fd" fillOpacity={0.9} {...thin} />
        <rect x={c.hx - 3.6} y={81} width={7.2} height={4} rx={1} fill="#212121" />
        <circle cx={c.hx} cy={89} r={4.3} fill={c.skin} {...line} />
      </g>
    ),
  },
};

// ---------------------------------------------------------------------------

export function CustomerFigure({ look, walking = false, mood = 'normal', carrying = null, facing = 'right', height = 120 }: CustomerFigureProps): JSX.Element {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const art = ART[look.archetype] ?? ART.fpt;
  const o = art.outfit;
  const flip = facing === 'left';
  const c: Ctx = {
    o,
    skin: SKIN_PALETTE[mod(look.skin, SKIN_PALETTE.length)],
    hair: HAIR_PALETTE[o.hairColors[mod(look.hair, o.hairColors.length)]],
    clip: `cf-torso-${uid}`,
    hx: armRect(o, 'l').cx,
    flip,
  };
  // Lệch pha nhịp thở để nhiều khách đứng cạnh nhau không nhún cùng lúc.
  const style = { '--cf-delay': `${-(mod(look.skin, 4) * 0.6 + mod(look.hair, 4) * 0.35)}s` } as CSSProperties;

  return (
    <svg
      className={`cf${walking ? ' cf-walking' : ''}`}
      viewBox="0 0 80 160"
      width={height / 2}
      height={height}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={c.clip}>
          <path d={torsoPath(o)} />
        </clipPath>
      </defs>
      <g transform={flip ? 'translate(80 0) scale(-1 1)' : undefined}>
        <ellipse cx={40} cy={157.5} rx={19} ry={2.6} fill="#000" opacity={0.15} />
        <g className="cf-body">
          <Leg c={c} side="l" />
          <Leg c={c} side="r" />
          <g className="cf-upper">
            <HairBack c={c} />
            {art.back?.(c)}
            <rect x={36} y={42} width={8} height={9} fill={c.skin} {...line} />
            <Torso c={c} art={art} />
            <Arm c={c} side="l">{art.hand?.(c)}</Arm>
            {carrying ? <CarryArm c={c} item={carrying} /> : <Arm c={c} side="r" />}
            <Head c={c} art={art} mood={mood} />
          </g>
        </g>
      </g>
    </svg>
  );
}
