import { INGREDIENTS } from '../game/data/ingredients';
import type { IngredientId } from '../game/types';
import { DrinkArt } from './BowlView';

// Hình nguyên liệu ở quầy, thẻ đơn, kho, thực đơn. Kim chi và cải tím không có emoji đúng nên vẽ SVG riêng;
// nước uống dùng lại hình lon/hộp của khay (DrinkArt); còn lại dùng emoji.

const OL = '#1b1b1b';

function Kimchi({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      {/* miếng sau */}
      <path d="M5 19 C4 12 9 7 15 7.5 C19 8 21 11 20 15 L18 24 C14 26.5 7 25 5 19 Z" fill="#e8532f" stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M7.5 20.5 C10 22.5 14 23.2 17 22.2" stroke="#fff1d6" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* miếng trước */}
      <path d="M12.5 23.5 C11.5 16.5 16 11.5 22 11.5 C27 11.5 28.5 15.5 27.5 19.5 C26.5 24.5 21 28 17 27 C14.8 26.4 13 25.3 12.5 23.5 Z" fill="#f06a3c" stroke={OL} strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M15 24 C18 25.5 22 25 25 21.8" stroke="#fff1d6" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M16.5 15 q2 -1.8 4 0 q2 -1.8 4 0" stroke="#ffb08a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
      {[
        [9, 13],
        [13, 16],
        [11, 10.5],
        [18.5, 18],
        [22.5, 17],
        [20.5, 21],
        [24.5, 14.5],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="0.95" fill="#9e1208" />
      ))}
    </svg>
  );
}

function PurpleCabbage({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <circle cx="16" cy="17" r="11.5" fill="#7b2d8e" stroke={OL} strokeWidth="1.4" />
      {/* gân lá */}
      <g stroke="#d9a8e8" strokeWidth="1.3" fill="none" strokeLinecap="round">
        <path d="M16 6 C10.5 9 9.5 18 12.5 27.5" />
        <path d="M16 6 C21.5 9 22.5 18 19.5 27.5" />
        <path d="M5.5 15 C10.5 13 13 17.5 16 17.5 C19 17.5 21.5 13 26.5 15" />
      </g>
      {/* lá ngoài úp vào */}
      <path d="M4.8 18.5 C4.6 11.5 8.6 7 13.4 6.2 C9.4 10 8.4 15.5 9.6 23 C7 22 5 20.5 4.8 18.5 Z" fill="#9b4bb0" stroke={OL} strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M27.2 18.5 C27.4 11.5 23.4 7 18.6 6.2 C22.6 10 23.6 15.5 22.4 23 C25 22 27 20.5 27.2 18.5 Z" fill="#9b4bb0" stroke={OL} strokeWidth="1.1" strokeLinejoin="round" />
      <ellipse cx="12" cy="11.5" rx="2.2" ry="1.2" fill="#fff" opacity="0.35" transform="rotate(-25 12 11.5)" />
    </svg>
  );
}

export function IngredientIcon({ id, size = 22 }: { id: IngredientId; size?: number }) {
  if (id === 'kimchi') return <Kimchi size={size} />;
  if (id === 'purple_cabbage') return <PurpleCabbage size={size} />;
  if (INGREDIENTS[id].kind === 'drink') return <DrinkArt id={id} size={Math.round(size * 0.62)} />;
  return (
    <span className="ing-emoji-text" style={{ fontSize: Math.round(size * 0.92) }} aria-hidden="true">
      {INGREDIENTS[id].emoji}
    </span>
  );
}
