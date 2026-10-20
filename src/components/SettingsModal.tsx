import { useState, type FormEvent } from 'react';
import { SHOP_NAME_MAX } from '../game/constants';
import type { SyncStatus } from '../hooks/useGame';
import type { Player } from '../services/cloud';
import { HowToPlay, InstallGuide } from './HelpContent';
import { Modal } from './Modal';

interface Props {
  player: Player | null;
  shopName: string;
  onRename: (name: string) => void;
  sync: SyncStatus;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  onLogout: () => void;
  onReset: () => void;
  onClose: () => void;
}

function syncText(sync: SyncStatus): string {
  const at = 'lastSavedAt' in sync && sync.lastSavedAt ? new Date(sync.lastSavedAt).toLocaleTimeString('vi-VN') : null;
  switch (sync.kind) {
    case 'off':
      return 'Chưa đăng nhập – tiến trình chỉ lưu trên máy này.';
    case 'saving':
      return `☁️ Đang lưu vào database…${at ? ` (lần trước: ${at})` : ''}`;
    case 'saved':
      return `✅ Đã lưu vào database lúc ${at}.`;
    case 'error':
      return `⚠️ Chưa lưu được vào database (mất mạng?) – game sẽ tự thử lại.${at ? ` Lần lưu gần nhất: ${at}.` : ''}`;
  }
}

export function SettingsModal({ player, shopName, onRename, sync, muted, onToggleMute, onExit, onLogout, onReset, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [name, setName] = useState(shopName);
  const trimmed = name.trim();

  const rename = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed && trimmed !== shopName) onRename(trimmed);
  };

  return (
    <Modal title="⚙️ Cài đặt" onClose={onClose}>
      <button className="btn wide" onClick={onToggleMute}>
        {muted ? '🔇 Âm thanh: Tắt' : '🔊 Âm thanh: Bật'}
      </button>

      <h3>Tên quán</h3>
      <form className="name-row" onSubmit={rename}>
        <input
          className="text-input"
          value={name}
          maxLength={SHOP_NAME_MAX}
          onChange={(e) => setName(e.target.value)}
          aria-label="Tên quán"
          autoComplete="off"
          enterKeyHint="done"
        />
        <button type="submit" className="btn primary" disabled={!trimmed || trimmed === shopName}>
          Lưu
        </button>
      </form>

      <h3>Tài khoản</h3>
      {player ? (
        <>
          <p className="modal-note">
            Đăng nhập: <b>{player.name}</b>
            {player.email && ` (${player.email})`}.
          </p>
          <p className={`sync-text sync-${sync.kind}`}>{syncText(sync)}</p>
          <div className="confirm-row">
            <button className="btn small" onClick={onExit}>🏠 Về màn hình chính</button>
            <button className="btn small" onClick={onLogout}>🚪 Đăng xuất</button>
          </div>
        </>
      ) : (
        <>
          <p className="modal-note">{syncText(sync)}</p>
          <button className="btn small" onClick={onExit}>🏠 Về màn hình chính</button>
        </>
      )}

      <h3>Cách chơi</h3>
      <HowToPlay />

      <h3>Cài lên iPhone</h3>
      <InstallGuide />

      <h3>Dữ liệu</h3>
      <p className="modal-note">
        Tiến trình được lưu vào database mỗi 10 giây và ngay khi mở cửa / hết ngày / thoát game; trên máy cũng có bản sao để chơi khi mất mạng.
      </p>
      {confirming ? (
        <div className="confirm-row">
          <span>Xóa toàn bộ tiến trình?</span>
          <button className="btn small danger" onClick={onReset}>Xóa & chơi lại</button>
          <button className="btn small" onClick={() => setConfirming(false)}>Hủy</button>
        </div>
      ) : (
        <button className="btn wide danger" onClick={() => setConfirming(true)}>
          🔄 Chơi lại từ đầu
        </button>
      )}
    </Modal>
  );
}
