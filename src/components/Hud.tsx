import { STAFF_UNLOCK_REVENUE } from '../game/constants';
import { formatShortVND, formatVND } from '../game/money';
import type { GameState } from '../game/types';

export type ModalName = 'stock' | 'recipes' | 'staff' | 'settings';

interface Props {
  state: GameState;
  paused: boolean;
  onTogglePause: () => void;
  onOpen: (modal: ModalName) => void;
}

/** Thanh trên cùng kiểu game: túi tiền, danh tiếng, các nút tròn và thanh "kinh nghiệm" doanh thu. */
export function Hud({ state, paused, onTogglePause, onOpen }: Props) {
  const progress = Math.min(1, state.totalRevenue / STAFF_UNLOCK_REVENUE);
  const stars = Math.round(state.reputation / 20);
  return (
    <header className="hud">
      <div className="hud-row">
        <div className={`pill money-pill ${state.money < 0 ? 'negative' : ''}`} title="Tiền mặt">
          <span className="coin" aria-hidden="true">₫</span>
          <span className="pill-value">{formatVND(state.money)}</span>
        </div>
        <div className="pill rep-pill" title={`Danh tiếng ${Math.round(state.reputation)}/100`} aria-label={`Danh tiếng ${stars} sao`}>
          {Array.from({ length: 5 }, (_, i) => (
            <span key={i} className={i < stars ? 'star on' : 'star'}>★</span>
          ))}
        </div>
        <div className="hud-actions">
          <button className="btn round small" onClick={onTogglePause} aria-label={paused ? 'Tiếp tục' : 'Tạm dừng'}>
            {paused ? '▶' : 'Ⅱ'}
          </button>
          <button className="btn round small" onClick={() => onOpen('settings')} aria-label="Cài đặt">
            ⚙️
          </button>
        </div>
      </div>
      <div className="hud-row">
        <button className="xp-bar" onClick={() => onOpen('staff')} aria-label="Doanh thu tích lũy">
          <span className="xp-icon">📈</span>
          <span className="xp-track">
            <span className="xp-fill" style={{ width: `${progress * 100}%` }} />
            <span className="xp-text">
              {progress >= 1 ? `Doanh thu ${formatShortVND(state.totalRevenue)}` : `${formatShortVND(state.totalRevenue)} / 10tr · mở thuê nhân viên`}
            </span>
          </span>
        </button>
        <nav className="hud-nav">
          <button className="nav-btn" onClick={() => onOpen('stock')}>
            <span>📦</span>
            <small>Kho</small>
          </button>
          <button className="nav-btn" onClick={() => onOpen('recipes')}>
            <span>📖</span>
            <small>Menu</small>
          </button>
          <button className="nav-btn" onClick={() => onOpen('staff')}>
            <span>👥</span>
            <small>Nhân sự</small>
          </button>
        </nav>
      </div>
    </header>
  );
}
