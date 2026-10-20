import { useState } from 'react';
import { HowToPlay, InstallGuide } from './HelpContent';
import { Modal } from './Modal';

interface Props {
  muted: boolean;
  onToggleMute: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function SettingsModal({ muted, onToggleMute, onReset, onClose }: Props) {
  const [confirming, setConfirming] = useState(false);
  return (
    <Modal title="⚙️ Cài đặt" onClose={onClose}>
      <button className="btn wide" onClick={onToggleMute}>
        {muted ? '🔇 Âm thanh: Tắt' : '🔊 Âm thanh: Bật'}
      </button>

      <h3>Cách chơi</h3>
      <HowToPlay />

      <h3>Cài lên iPhone</h3>
      <InstallGuide />

      <h3>Dữ liệu</h3>
      <p className="modal-note">Game tự lưu trên máy này mỗi 2 giây.</p>
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
