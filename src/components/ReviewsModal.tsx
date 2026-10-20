import { useState } from 'react';
import { DISH_BY_ID } from '../game/data/menu';
import { customerTitle } from '../game/orders';
import type { GameState, Reaction, ServiceKind } from '../game/types';
import { CustomerFigure, type FigureMood } from './CustomerFigure';
import { Modal } from './Modal';

const SERVICE_LABEL: Record<ServiceKind, string> = {
  'dine-in': '🪑 Ăn tại chỗ',
  takeaway: '🛍️ Mang về',
  grab: '🛵 Grab',
};

const REACTION_MOOD: Record<Reaction, FigureMood> = {
  delicious: 'happy',
  spicy: 'hot',
  'very-spicy': 'hot',
  mild: 'disdain',
  'not-spicy': 'disdain',
  bad: 'sad',
};

type Filter = 'all' | 'good' | 'bad';

function Stars({ n }: { n: number }) {
  return (
    <span className="review-stars" aria-label={`${n} sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < n ? 'on' : ''}>★</span>
      ))}
    </span>
  );
}

/** Tab Đánh giá: các lượt nhận xét gần đây của khách (ăn tại chỗ, mang về, Grab), mới nhất lên đầu. */
export function ReviewsModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  const [filter, setFilter] = useState<Filter>('all');
  const all = [...state.reviewLog].reverse();
  const list = all.filter((r) => (filter === 'all' ? true : filter === 'good' ? r.stars >= 4 : r.stars <= 3));
  const avg = all.length ? all.reduce((sum, r) => sum + r.stars, 0) / all.length : 0;

  return (
    <Modal title="⭐ Đánh giá của khách" onClose={onClose}>
      <div className="review-summary">
        <b className="review-avg">{all.length ? avg.toFixed(1).replace('.', ',') : '–'}</b>
        <div>
          <Stars n={Math.round(avg)} />
          <small>{all.length} lượt đánh giá gần đây</small>
        </div>
      </div>
      <div className="review-filter" role="radiogroup" aria-label="Lọc đánh giá">
        {(
          [
            ['all', 'Tất cả'],
            ['good', '😋 Khen'],
            ['bad', '😞 Chê'],
          ] as [Filter, string][]
        ).map(([id, label]) => (
          <button key={id} role="radio" aria-checked={filter === id} className={`chip ${filter === id ? 'active' : ''}`} onClick={() => setFilter(id)}>
            {label}
          </button>
        ))}
      </div>
      {list.length === 0 ? (
        <p className="modal-note">Chưa có đánh giá nào. Phục vụ khách xong, nhận xét của họ sẽ hiện ở đây.</p>
      ) : (
        <ul className="review-list">
          {list.map((r) => (
            <li key={`${r.day}-${r.id}`} className={`review-item stars-${r.stars}`}>
              <div className="review-face">
                <CustomerFigure look={r.look} mood={REACTION_MOOD[r.reaction]} height={64} />
              </div>
              <div className="review-body">
                <div className="review-head">
                  <b>{customerTitle(r)}</b>
                  <Stars n={r.stars} />
                </div>
                <p className="review-text">“{r.feedback}”</p>
                <small>
                  Ngày {r.day} · {SERVICE_LABEL[r.service]} · {DISH_BY_ID[r.dishId]?.name ?? 'Mì cay'} cấp {r.spice}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
