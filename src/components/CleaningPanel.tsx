import type { Dispatch } from 'react';
import { DIRT_SPOTS } from '../game/constants';
import { DIRT_TYPES } from '../game/data/cleaning';
import type { GameAction } from '../game/state';
import type { DirtKind, GameState } from '../game/types';

/** Thay cho quầy nấu trong lúc dọn quán buổi sáng: tiến độ dọn + nút mở cửa. */
export function CleaningPanel({ state, dispatch }: { state: GameState; dispatch: Dispatch<GameAction> }) {
  const left = state.dirt.length;
  const done = Math.max(0, DIRT_SPOTS - left);
  const kinds = [...new Set(state.dirt.map((d) => d.kind))] as DirtKind[];

  return (
    <section className="station cleaning">
      <div className="cleaning-card">
        <div className="cleaning-icon" aria-hidden="true">🧹</div>
        <h2>Dọn quán trước giờ mở cửa</h2>
        <p className="hint">
          Ngày {state.day}: kéo cây chổi 🧹 quét qua từng chỗ bẩn trong quán. Chỗ có dấu • phải quét nhiều lượt
          (đưa chổi ra rồi quét lại).
        </p>
        <div className="progress big" aria-label={`Đã dọn ${done}/${DIRT_SPOTS}`}>
          <div style={{ width: `${(done / DIRT_SPOTS) * 100}%` }} />
        </div>
        <p className="cleaning-count">
          {left === 0 ? '✨ Quán sạch bong!' : `Đã dọn ${done}/${DIRT_SPOTS} · còn: ${kinds.map((k) => `${DIRT_TYPES[k].emoji} ${DIRT_TYPES[k].name}`).join(', ')}`}
        </p>
      </div>
      <div className="actions">
        <button className="btn primary wide big" disabled={left > 0} onClick={() => dispatch({ type: 'OPEN_SHOP' })}>
          {left > 0 ? `🔒 Còn ${left} chỗ bẩn` : '🔓 Mở cửa đón khách'}
        </button>
      </div>
    </section>
  );
}
