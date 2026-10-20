import { CLOSE_HOUR, DAY_LENGTH_MS, OPEN_HOUR, STAFF_UNLOCK_REVENUE } from '../game/constants';
import { formatShortVND, formatVND } from '../game/money';
import type { GameState } from '../game/types';

export type ModalName = 'stock' | 'recipes' | 'staff' | 'settings';

function clock(dayTimeMs: number): string {
  const minutes = (dayTimeMs / DAY_LENGTH_MS) * (CLOSE_HOUR - OPEN_HOUR) * 60;
  const h = OPEN_HOUR + Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`;
}

function stars(reputation: number): string {
  const n = Math.round(reputation / 20);
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}

interface Props {
  state: GameState;
  paused: boolean;
  onTogglePause: () => void;
  onOpen: (modal: ModalName) => void;
}

export function Hud({ state, paused, onTogglePause, onOpen }: Props) {
  const progress = Math.min(1, state.totalRevenue / STAFF_UNLOCK_REVENUE);
  const unlocked = progress >= 1;
  return (
    <header className="hud">
      <div className="hud-row">
        <div className={`hud-money ${state.money < 0 ? 'negative' : ''}`} title="Tiền mặt">
          💰 {formatVND(state.money)}
        </div>
        <div className="hud-day">
          Ngày {state.day} · <span className={state.phase !== 'open' ? 'closing' : ''}>{state.phase === 'open' ? clock(state.dayTimeMs) : 'Đóng cửa'}</span>
        </div>
        <div className="hud-rep" title={`Danh tiếng ${Math.round(state.reputation)}/100`}>
          {stars(state.reputation)}
        </div>
      </div>
      <div className="hud-row">
        <button className="revenue" onClick={() => onOpen('staff')} title="Doanh thu tích lũy">
          <div className="revenue-bar" style={{ width: `${progress * 100}%` }} />
          <span>
            {unlocked
              ? `📈 Doanh thu ${formatShortVND(state.totalRevenue)} · 👥 Thuê nhân viên`
              : `📈 ${formatShortVND(state.totalRevenue)} / 10tr → mở thuê nhân viên`}
          </span>
        </button>
        <nav className="hud-nav">
          <button className="icon-btn" onClick={() => onOpen('stock')} aria-label="Kho – nhập hàng">📦</button>
          <button className="icon-btn" onClick={() => onOpen('recipes')} aria-label="Công thức">📖</button>
          <button className="icon-btn" onClick={() => onOpen('staff')} aria-label="Nhân viên">👥</button>
          <button className="icon-btn" onClick={onTogglePause} aria-label={paused ? 'Tiếp tục' : 'Tạm dừng'}>{paused ? '▶️' : '⏸️'}</button>
          <button className="icon-btn" onClick={() => onOpen('settings')} aria-label="Cài đặt">⚙️</button>
        </nav>
      </div>
    </header>
  );
}
