import { INGREDIENTS } from '../game/data/ingredients';
import { DRINKS, TOPPINGS } from '../game/data/menu';
import { formatShortVND, formatVND } from '../game/money';
import type { GameState, IngredientId } from '../game/types';
import { Modal } from './Modal';

export function RecipeModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <Modal title="📖 Công thức & Thực đơn" onClose={onClose}>
      <p className="modal-note">Bấm mỗi nguyên liệu đúng số lần ghi bên dưới, cộng thêm topping khách gọi, chọn đá/đường rồi giao món.</p>
      <ul className="recipe-list">
        {DRINKS.map((d) => {
          const locked = state.totalRevenue < d.unlockRevenue;
          return (
            <li key={d.id} className={locked ? 'locked' : ''}>
              <span className="recipe-emoji">{locked ? '🔒' : d.emoji}</span>
              <div>
                <b>{d.name}</b> <span className="price">{formatVND(d.price)}</span>
                <div className="recipe-steps">
                  {locked
                    ? `Mở khóa khi doanh thu đạt ${formatShortVND(d.unlockRevenue)}`
                    : (Object.entries(d.recipe) as [IngredientId, number][])
                        .map(([id, n]) => `${n} ${INGREDIENTS[id].emoji} ${INGREDIENTS[id].name}`)
                        .join(' + ')}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
      <h3>Topping</h3>
      <ul className="recipe-list">
        {TOPPINGS.map((t) => {
          const locked = state.totalRevenue < t.unlockRevenue;
          return (
            <li key={t.id} className={locked ? 'locked' : ''}>
              <span className="recipe-emoji">{locked ? '🔒' : INGREDIENTS[t.id].emoji}</span>
              <div>
                <b>{INGREDIENTS[t.id].name}</b> <span className="price">+{formatVND(t.price)}</span>
                {locked && <div className="recipe-steps">Mở khóa khi doanh thu đạt {formatShortVND(t.unlockRevenue)}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
