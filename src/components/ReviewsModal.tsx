import { useState, type Dispatch } from 'react';
import { REPLY_MAX } from '../game/constants';
import { DISH_BY_ID } from '../game/data/menu';
import { OWNER_REPLIES } from '../game/data/reactions';
import { partyTitle } from '../game/orders';
import type { GameAction } from '../game/state';
import type { GameState, Reaction, ReviewEntry, ServiceKind } from '../game/types';
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

/** Chủ quán phản hồi: chọn câu gợi ý hoặc tự viết. */
function ReplyBox({ entry, dispatch }: { entry: ReviewEntry; dispatch: Dispatch<GameAction> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const tone = entry.stars >= 4 ? 'good' : 'bad';
  if (!open) {
    return (
      <button className="btn small reply-open" onClick={() => setOpen(true)}>
        💬 Phản hồi
      </button>
    );
  }
  const send = () => dispatch({ type: 'REPLY_REVIEW', id: entry.id, text });
  return (
    <div className="reply-box">
      <div className="reply-presets">
        {OWNER_REPLIES[tone].map((t) => (
          <button key={t} className={`reply-preset ${text === t ? 'active' : ''}`} onClick={() => setText(t)}>
            {t}
          </button>
        ))}
      </div>
      <form
        className="reply-form"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        <input
          className="reply-input"
          value={text}
          maxLength={REPLY_MAX}
          placeholder="Hoặc tự viết phản hồi…"
          aria-label="Phản hồi của chủ quán"
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="btn small primary" disabled={!text.trim()}>
          Gửi
        </button>
      </form>
    </div>
  );
}

/** Tab Đánh giá: các lượt nhận xét gần đây của khách (ăn tại chỗ, mang về, Grab), mới nhất lên đầu. Chủ quán phản hồi được. */
export function ReviewsModal({ state, dispatch, onClose }: { state: GameState; dispatch: Dispatch<GameAction>; onClose: () => void }) {
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
      <p className="modal-note small">💡 Rep khéo một lời chê là khách nguôi giận, quán gỡ lại chút danh tiếng ⭐</p>
      {list.length === 0 ? (
        <p className="modal-note">Chưa có đánh giá nào. Phục vụ khách xong, nhận xét của họ sẽ hiện ở đây.</p>
      ) : (
        <ul className="review-list">
          {list.map((r) => (
            <li key={r.id} className={`review-item stars-${r.stars}`}>
              <div className="review-face">
                <CustomerFigure look={r.look} mood={REACTION_MOOD[r.reaction]} height={64} />
              </div>
              <div className="review-body">
                <div className="review-head">
                  <b>{partyTitle(r)}</b>
                  <Stars n={r.stars} />
                </div>
                <p className="review-text">“{r.feedback}”</p>
                <small>
                  Ngày {r.day} · {SERVICE_LABEL[r.service]} · {r.partySize > 1 ? `${r.partySize} tô` : `${DISH_BY_ID[r.dishId]?.name ?? 'Mì cay'} cấp ${r.spice}`}
                </small>
                {r.reply ? (
                  <div className="review-thread">
                    <p className="review-reply">
                      <b>🧑‍🍳 Chủ quán:</b> {r.reply}
                    </p>
                    {r.replyBack && (
                      <p className="review-reply-back">
                        <b>{r.name}:</b> {r.replyBack}
                      </p>
                    )}
                  </div>
                ) : (
                  <ReplyBox entry={r} dispatch={dispatch} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
