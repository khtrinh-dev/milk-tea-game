import type { Dispatch } from 'react';
import { ICE_LABELS, ICE_LEVELS, SUGAR_LABELS, SUGAR_LEVELS } from '../game/constants';
import { INGREDIENTS } from '../game/data/ingredients';
import { DRINK_BY_ID, unlockedIngredients } from '../game/data/menu';
import { formatVND } from '../game/money';
import { cupCounts, requiredRecipe } from '../game/orders';
import type { GameAction } from '../game/state';
import type { Customer, GameState, IngredientId } from '../game/types';
import { CupView } from './CupView';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

function OrderCard({ customer, state }: { customer: Customer | undefined; state: GameState }) {
  if (!customer) {
    return (
      <div className="order-card empty">
        <p>Chưa chọn đơn nào.</p>
        <p className="hint">Khi khách tới, chạm vào khách để xem công thức.</p>
      </div>
    );
  }
  const { order } = customer;
  const need = requiredRecipe(order);
  const have = cupCounts(state.cup);
  const extras = (Object.keys(have) as IngredientId[]).filter((id) => !(id in need));
  const iceOk = state.cup.ice === order.ice;
  const sugarOk = state.cup.sugar === order.sugar;

  return (
    <div className="order-card">
      <div className="order-title">
        <span>{customer.avatar} {customer.name}</span>
        <span className="price">{formatVND(order.price)}</span>
      </div>
      <div className="order-drink">{DRINK_BY_ID[order.drinkId].name}</div>
      <ul className="checklist">
        {(Object.entries(need) as [IngredientId, number][]).map(([id, n]) => {
          const h = have[id] ?? 0;
          return (
            <li key={id} className={h === n ? 'ok' : h > n ? 'bad' : ''}>
              <span>{INGREDIENTS[id].emoji} {INGREDIENTS[id].name}</span>
              <span className="count">{h}/{n}</span>
            </li>
          );
        })}
        {extras.map((id) => (
          <li key={id} className="bad">
            <span>{INGREDIENTS[id].emoji} {INGREDIENTS[id].name}</span>
            <span className="count">thừa {have[id]}</span>
          </li>
        ))}
        <li className={iceOk ? 'ok' : order.ice !== 'normal' ? 'attention' : ''}>
          <span>🧊 {ICE_LABELS[order.ice]}</span>
          <span className="count">{iceOk ? '✓' : '✗'}</span>
        </li>
        <li className={sugarOk ? 'ok' : order.sugar !== 'normal' ? 'attention' : ''}>
          <span>🍬 {SUGAR_LABELS[order.sugar]}</span>
          <span className="count">{sugarOk ? '✓' : '✗'}</span>
        </li>
      </ul>
    </div>
  );
}

export function Workstation({ state, dispatch }: Props) {
  const customer = state.customers.find((c) => c.id === state.selectedCustomerId);
  const need = customer ? requiredRecipe(customer.order) : {};
  const ingredients = unlockedIngredients(state.totalRevenue);
  const bases = ingredients.filter((id) => INGREDIENTS[id].kind !== 'topping');
  const toppings = ingredients.filter((id) => INGREDIENTS[id].kind === 'topping');

  const renderButton = (id: IngredientId) => {
    const ing = INGREDIENTS[id];
    const stock = state.inventory[id];
    const out = stock < 1;
    return (
      <button
        key={id}
        className={`ing-btn ${id in need ? 'needed' : ''} ${out ? 'out' : ''}`}
        onClick={() => dispatch(out ? { type: 'BUY_PACK', id } : { type: 'ADD_INGREDIENT', id })}
        aria-label={out ? `Hết ${ing.name}, chạm để nhập 1 gói` : `Thêm ${ing.name}`}
      >
        <span className="ing-emoji">{ing.emoji}</span>
        <span className="ing-name">{ing.name}</span>
        <span className="ing-stock">{out ? `Hết · nhập ${formatVND(ing.packPrice)}` : stock}</span>
      </button>
    );
  };

  return (
    <section className="station">
      <div className="station-top">
        <div className="cup-wrap">
          <CupView cup={state.cup} />
          <div className="cup-stock">🥤 còn {state.inventory.cup} ly</div>
        </div>
        <OrderCard customer={customer} state={state} />
      </div>

      <div className="options">
        <div className="option-row" role="radiogroup" aria-label="Đá">
          <span className="option-label">🧊</span>
          {ICE_LEVELS.map((lv) => (
            <button key={lv} role="radio" aria-checked={state.cup.ice === lv} className={`chip ${state.cup.ice === lv ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_ICE', ice: lv })}>
              {ICE_LABELS[lv].replace('Đá bình thường', 'Bình thường')}
            </button>
          ))}
        </div>
        <div className="option-row" role="radiogroup" aria-label="Đường">
          <span className="option-label">🍬</span>
          {SUGAR_LEVELS.map((lv) => (
            <button key={lv} role="radio" aria-checked={state.cup.sugar === lv} className={`chip ${state.cup.sugar === lv ? 'active' : ''}`} onClick={() => dispatch({ type: 'SET_SUGAR', sugar: lv })}>
              {SUGAR_LABELS[lv].replace('Ngọt bình thường', 'Bình thường')}
            </button>
          ))}
        </div>
      </div>

      <div className="ingredients">
        <h3>Trà · Sữa · Hương vị</h3>
        <div className="ing-grid">{bases.map(renderButton)}</div>
        <h3>Topping</h3>
        <div className="ing-grid">{toppings.map(renderButton)}</div>
      </div>

      <div className="actions">
        <button className="btn secondary" onClick={() => dispatch({ type: 'UNDO' })} disabled={state.cup.layers.length === 0}>
          ↶ Hoàn tác
        </button>
        <button className="btn secondary" onClick={() => dispatch({ type: 'DISCARD' })} disabled={state.cup.layers.length === 0}>
          🗑️ Đổ bỏ
        </button>
        <button className="btn primary" onClick={() => dispatch({ type: 'SERVE' })} disabled={!customer || state.cup.layers.length === 0}>
          ✅ Giao món
        </button>
      </div>
    </section>
  );
}
