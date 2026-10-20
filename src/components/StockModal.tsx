import type { Dispatch } from 'react';
import { INGREDIENT_IDS, INGREDIENTS, unitCost } from '../game/data/ingredients';
import { stationIngredients } from '../game/data/menu';
import { formatVND } from '../game/money';
import type { GameAction } from '../game/state';
import type { GameState, IngredientId } from '../game/types';
import { Modal } from './Modal';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  onClose: () => void;
}

export function StockModal({ state, dispatch, onClose }: Props) {
  const inUse = new Set<IngredientId>(stationIngredients(state.totalRevenue));
  const sorted = [...INGREDIENT_IDS].sort((a, b) => Number(inUse.has(b)) - Number(inUse.has(a)));

  return (
    <Modal title="📦 Kho · Nhập nguyên liệu" onClose={onClose}>
      <p className="modal-note">
        Tiền mặt: <b>{formatVND(state.money)}</b>. Mỗi lần chạm nguyên liệu ở quầy dùng 1 phần. Ớt thì miễn phí.
      </p>
      <ul className="stock-list">
        {sorted.map((id) => {
          const ing = INGREDIENTS[id];
          const stock = state.inventory[id];
          return (
            <li key={id} className={inUse.has(id) ? '' : 'unused'}>
              <span className="stock-emoji">{ing.emoji}</span>
              <div className="stock-info">
                <b>{ing.name}</b>
                <small>
                  Gói {ing.packSize} phần · {formatVND(ing.packPrice)} ({formatVND(unitCost(id))}/phần)
                  {!inUse.has(id) && ' · chưa dùng tới'}
                </small>
              </div>
              <span className={`stock-count ${stock < 5 ? 'low' : ''}`}>{stock}</span>
              <div className="stock-buy">
                <button className="btn small" disabled={state.money < ing.packPrice} onClick={() => dispatch({ type: 'BUY_PACK', id })}>
                  +1 gói
                </button>
                <button className="btn small" disabled={state.money < ing.packPrice * 5} onClick={() => dispatch({ type: 'BUY_PACK', id, packs: 5 })}>
                  +5
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </Modal>
  );
}
