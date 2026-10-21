import { Fragment } from 'react';
import { MAX_SPICE } from '../game/constants';
import { INGREDIENTS } from '../game/data/ingredients';
import { DISHES, DRINKS, recipeCost } from '../game/data/menu';
import { formatShortVND, formatVND } from '../game/money';
import type { GameState, IngredientId } from '../game/types';
import { IngredientIcon } from './IngredientIcon';
import { Modal } from './Modal';

export function RecipeModal({ state, onClose }: { state: GameState; onClose: () => void }) {
  return (
    <Modal title="📖 Thực đơn & Công thức" onClose={onClose}>
      <p className="modal-note">
        Bỏ mỗi nguyên liệu 1 phần theo công thức, rồi chạm <b>Hũ ớt</b> đúng số shot = cấp cay khách gọi (0 → {MAX_SPICE}).
      </p>
      <ul className="recipe-list">
        {DISHES.map((d) => {
          const locked = state.totalRevenue < d.unlockRevenue;
          return (
            <li key={d.id} className={locked ? 'locked' : ''}>
              <span className="recipe-emoji">{locked ? '🔒' : d.emoji}</span>
              <div>
                <b>{d.name}</b> <span className="price">{formatVND(d.price)}</span>
                <div className="recipe-steps">
                  {locked
                    ? `Mở khóa khi doanh thu đạt ${formatShortVND(d.unlockRevenue)}`
                    : (Object.keys(d.recipe) as IngredientId[]).map((id, i) => (
                        <Fragment key={id}>
                          {i > 0 && ' + '}
                          <span className="recipe-ing">
                            <IngredientIcon id={id} size={15} /> {INGREDIENTS[id].name}
                          </span>
                        </Fragment>
                      ))}
                </div>
                {!locked && <small className="recipe-cost">Vốn {formatVND(recipeCost(d.recipe))} · lời {formatVND(d.price - recipeCost(d.recipe))}</small>}
              </div>
            </li>
          );
        })}
      </ul>
      <h3>Nước uống</h3>
      <ul className="recipe-list">
        {DRINKS.map((d) => {
          const locked = state.totalRevenue < d.unlockRevenue;
          const ing = INGREDIENTS[d.id];
          return (
            <li key={d.id} className={locked ? 'locked' : ''}>
              <span className="recipe-emoji">{locked ? '🔒' : <IngredientIcon id={d.id} size={30} />}</span>
              <div>
                <b>{ing.name}</b> <span className="price">+{formatVND(d.price)}</span>
                {locked && <div className="recipe-steps">Mở khóa khi doanh thu đạt {formatShortVND(d.unlockRevenue)}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
