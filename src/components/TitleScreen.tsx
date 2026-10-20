import type { Player } from '../services/cloud';

interface Props {
  player: Player | null;
  cloudEnabled: boolean;
  authReady: boolean;
  loading: boolean;
  error: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onPlay: () => void;
}

/** Linh vật: tô mì cay có mặt cười, đôi đũa và ngọn lửa, nhún nhảy ở màn hình đầu. */
function Mascot() {
  return (
    <svg className="mascot" viewBox="0 0 160 150" aria-hidden="true">
      {/* ngọn lửa phía sau */}
      <path className="mascot-flame" d="M40 70 Q30 40 52 22 Q50 42 64 44 Q60 20 82 4 Q84 30 98 36 Q102 22 112 18 Q108 40 124 52 Q132 64 120 74 Z" fill="#ff5a1f" stroke="#1b1b1b" strokeWidth="4" strokeLinejoin="round" />
      <path d="M58 70 Q54 52 68 44 Q70 56 80 56 Q80 42 92 34 Q94 52 106 58 Q110 66 104 72 Z" fill="#ffc531" />
      {/* đũa */}
      <rect x="104" y="6" width="7" height="74" rx="3.5" fill="#f2d3a0" stroke="#1b1b1b" strokeWidth="3" transform="rotate(24 108 44)" />
      <rect x="116" y="10" width="7" height="72" rx="3.5" fill="#f2d3a0" stroke="#1b1b1b" strokeWidth="3" transform="rotate(30 120 46)" />
      {/* tô */}
      <path d="M12 72 Q14 140 80 144 Q146 140 148 72 Z" fill="#1d1d1d" stroke="#1b1b1b" strokeWidth="5" strokeLinejoin="round" />
      <path d="M20 96 Q80 116 140 96" stroke="#e53935" strokeWidth="7" fill="none" />
      <ellipse cx="80" cy="72" rx="70" ry="18" fill="#c8261c" stroke="#1b1b1b" strokeWidth="5" />
      <path d="M28 70 q6 -5 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0" stroke="#f3c64f" strokeWidth="4" fill="none" strokeLinecap="round" />
      <circle cx="48" cy="76" r="5" fill="#e0584a" stroke="#1b1b1b" strokeWidth="2" />
      <circle cx="112" cy="76" r="5" fill="#5fa83f" stroke="#1b1b1b" strokeWidth="2" />
      {/* mặt */}
      <circle cx="60" cy="112" r="6" fill="#fff" />
      <circle cx="100" cy="112" r="6" fill="#fff" />
      <circle cx="61" cy="113" r="3" fill="#1b1b1b" />
      <circle cx="101" cy="113" r="3" fill="#1b1b1b" />
      <path d="M68 124 q12 12 24 0" fill="#ff6f7d" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="46" cy="124" rx="7" ry="4" fill="#ff5a5a" opacity="0.8" />
      <ellipse cx="114" cy="124" rx="7" ry="4" fill="#ff5a5a" opacity="0.8" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 48 48" width="22" height="22" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

export function TitleScreen({ player, cloudEnabled, authReady, loading, error, onLogin, onLogout, onPlay }: Props) {
  return (
    <div className="app screen title-screen">
      <div className="title-bubbles" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <span key={i} style={{ left: `${(i * 83) % 100}%`, animationDelay: `${(i * 0.7) % 6}s` }}>
            🌶️
          </span>
        ))}
      </div>

      <div className="title-logo">
        <Mascot />
        <h1>
          <span className="logo-main">Mì Cay</span>
          <span className="logo-sub">TYCOON</span>
        </h1>
      </div>

      <div className="title-card panel">
        {!authReady || loading ? (
          <div className="title-wait">
            <span className="spinner" />
            {loading ? 'Đang mở cửa quán…' : 'Đang kết nối…'}
          </div>
        ) : player ? (
          <>
            <div className="player-chip">
              {player.photoURL ? <img src={player.photoURL} alt="" referrerPolicy="no-referrer" /> : <span>🧑‍🍳</span>}
              <div>
                <small>Xin chào chủ quán</small>
                <b>{player.name}</b>
              </div>
            </div>
            <button className="btn primary wide big pulse" onClick={onPlay}>
              ▶ Vào quán
            </button>
            <button className="btn link" onClick={onLogout}>
              Đăng xuất
            </button>
          </>
        ) : (
          <>
            {cloudEnabled && (
              <>
                <button className="btn google wide big" onClick={onLogin}>
                  <GoogleLogo /> Đăng nhập bằng Google
                </button>
                <p className="title-note">Đăng nhập để lưu tiến trình lên mây – đổi máy hay xóa app vẫn không mất.</p>
              </>
            )}
            <button className={`btn wide big ${cloudEnabled ? 'secondary' : 'primary pulse'}`} onClick={onPlay}>
              ▶ {cloudEnabled ? 'Chơi không cần đăng nhập' : 'Chơi ngay'}
            </button>
          </>
        )}
        {error && <p className="title-error">{error}</p>}
      </div>
    </div>
  );
}
