import type { Dispatch } from 'react';
import { STAFF_UNLOCK_REVENUE } from '../game/constants';
import { STAFF_ROLES, STAFF_TYPES } from '../game/data/staff';
import { formatVND } from '../game/money';
import { staffUnlocked, type GameAction } from '../game/state';
import type { GameState } from '../game/types';
import { Modal } from './Modal';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onClose: () => void;
}

export function StaffModal({ state, dispatch, onClose }: Props) {
  const unlocked = staffUnlocked(state);
  const progress = Math.min(1, state.totalRevenue / STAFF_UNLOCK_REVENUE);

  return (
    <Modal title="👥 Nhân viên" onClose={onClose}>
      {!unlocked && (
        <div className="locked-box">
          <p>
            🔒 Cần <b>doanh thu tích lũy {formatVND(STAFF_UNLOCK_REVENUE)}</b> để thuê nhân viên.
          </p>
          <div className="progress">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
          <p className="hint">
            Hiện tại: {formatVND(state.totalRevenue)} ({Math.floor(progress * 100)}%)
          </p>
        </div>
      )}
      <p className="modal-note">Lương được trừ vào cuối mỗi ngày.</p>
      <ul className="staff-list">
        {STAFF_ROLES.map((role) => {
          const t = STAFF_TYPES[role];
          const count = state.staff[role];
          return (
            <li key={role}>
              <span className="staff-emoji">{t.emoji}</span>
              <div className="staff-info">
                <b>{t.name}</b> <small>({count}/{t.max})</small>
                <p>{t.description}</p>
                <small>Lương {formatVND(t.salary)}/ngày</small>
              </div>
              <div className="staff-actions">
                <button className="btn small primary" disabled={!unlocked || count >= t.max} onClick={() => dispatch({ type: 'HIRE', role })}>
                  Thuê
                </button>
                <button className="btn small" disabled={count === 0} onClick={() => dispatch({ type: 'FIRE', role })}>
                  Cho nghỉ
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
