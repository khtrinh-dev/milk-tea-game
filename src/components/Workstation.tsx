import type { Dispatch } from 'react';
import { MAX_SPICE } from '../game/constants';
import { INGREDIENTS } from '../game/data/ingredients';
import { DISH_BY_ID, stationIngredients } from '../game/data/menu';
import { formatShortVND, formatVND } from '../game/money';
import { bowlCounts, bowlItems, chiliShots, customerTitle, requiredRecipe, serviceLabel, spiceLabel } from '../game/orders';
import type { GameAction } from '../game/state';
import type { Customer, GameState, IngredientId, IngredientKind } from '../game/types';
import { BowlView } from './BowlView';

interface Props {
  state: GameState;
  dispatch: Dispatch<GameAction>;
}

/** Các cụm nút ở quầy, theo thứ tự: mì → thịt & hải sản → rau → nước uống. */
const GROUPS: { kind: IngredientKind; title: string }[] = [
  { kind: 'noodle', title: 'Mì' },
  { kind: 'meat', title: '🥩 Thịt · Hải sản' },
  { kind: 'veggie', title: '🥬 Rau · Nấm · Kim chi' },
  { kind: 'drink', title: '🥤 Nước uống' },
];
const KIND_ORDER = GROUPS.map((g) => g.kind);

function byKind(a: IngredientId, b: IngredientId): number {
  return KIND_ORDER.indexOf(INGREDIENTS[a].kind) - KIND_ORDER.indexOf(INGREDIENTS[b].kind);
}

function OrderCard({ customer, state }: { customer: Customer | undefined; state: GameState }) {
  if (!customer) {
    return (
      <div className="order-card empty">
        <p>Chưa chọn đơn nào.</p>
        <p className="hint">Khi khách tới, chạm vào khách để xem món.</p>
      </div>
    );
  }
  const { order } = customer;
  const need = requiredRecipe(order);
  const have = bowlCounts(state.bowl);
  const extras = (Object.keys(have) as IngredientId[]).filter((id) => !(id in need));
  const shots = chiliShots(state.bowl);

  return (
    <div className="order-card">
      <div className="order-title">
        <span className="order-who">{customerTitle(customer)}</span>
        <span className="price">{formatVND(order.price)}</span>
      </div>
      <div className="order-dish">
        {DISH_BY_ID[order.dishId].name}
        <span className={`service-tag ${order.channel === 'grab' ? 'grab' : order.dineIn ? 'dine' : 'takeaway'}`}>
          {order.channel === 'grab' ? '🛵' : order.dineIn ? '🪑' : '🛍️'} {serviceLabel(order)}
        </span>
      </div>
      <ul className="checklist">
        <li className={`spice-line ${shots === order.spice ? 'ok' : shots > order.spice ? 'bad' : ''}`}>
          <span>🌶️ {spiceLabel(order.spice)}</span>
          <span className="count">{shots}/{order.spice} shot</span>
        </li>
        {(Object.entries(need) as [IngredientId, number][]).sort(([a], [b]) => byKind(a, b)).map(([id, n]) => {
          const h = have[id] ?? 0;
          return (
            <li key={id} className={`kind-${INGREDIENTS[id].kind} ${h === n ? 'ok' : h > n ? 'bad' : ''}`}>
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
      </ul>
    </div>
  );
}

/** Hũ ớt: mỗi lần chạm thêm 1 shot ớt = tăng 1 cấp cay. */
function ChiliJar({ shots, target, onAdd }: { shots: number; target: number | null; onAdd: () => void }) {
  return (
    <button className="chili-jar" onClick={onAdd} disabled={shots >= MAX_SPICE} aria-label={`Hũ ớt: thêm 1 shot (đang ${shots}/${MAX_SPICE})`}>
      <svg viewBox="0 0 60 64" width="54" height="58" aria-hidden="true">
        <rect x="9" y="4" width="42" height="11" rx="4" fill="#1d1d1d" stroke="#000" strokeWidth="2.5" />
        <path d="M8 16 h44 v38 a7 7 0 0 1 -7 7 h-30 a7 7 0 0 1 -7 -7 z" fill="#fff6f2" stroke="#1d1d1d" strokeWidth="3" />
        <path d="M9.5 30 q10 -4 20 0 t21 0 v24 a6 6 0 0 1 -6 6 h-29 a6 6 0 0 1 -6 -6 z" fill="#d4180c" />
        {[16, 25, 34, 43, 20, 30, 39].map((cx, i) => (
          <circle key={i} cx={cx} cy={i < 4 ? 50 : 41} r="1.8" fill="#ffb199" />
        ))}
        <rect x="13" y="20" width="4" height="8" rx="2" fill="#fff" opacity="0.8" />
        <rect x="14" y="33" width="32" height="12" rx="3" fill="#fff" stroke="#1d1d1d" strokeWidth="1.5" />
        <text x="30" y="42.5" textAnchor="middle" className="jar-label">HŨ ỚT</text>
      </svg>
      <span className="chili-info">
        <span className="chili-meter" aria-hidden="true">
          {Array.from({ length: MAX_SPICE }, (_, i) => (
            <span key={i} className={`chili-dot ${i < shots ? 'on' : ''} ${target !== null && i === target - 1 ? 'target' : ''}`}>
              🌶️
            </span>
          ))}
        </span>
        <span className="chili-text">
          {shots === 0 ? 'Chạm để thêm ớt' : `Cấp ${shots}/${MAX_SPICE}`}
          {target !== null && <b> · khách gọi cấp {target}</b>}
        </span>
      </span>
    </button>
  );
}

export function Workstation({ state, dispatch }: Props) {
  const customer = state.customers.find((c) => c.id === state.selectedCustomerId);
  const need = customer ? requiredRecipe(customer.order) : {};
  const ingredients = stationIngredients(state.totalRevenue);
  const empty = state.bowl.steps.length === 0;
  const hasFood = bowlItems(state.bowl).some((id) => INGREDIENTS[id].kind !== 'drink');

  const inBowl = bowlCounts(state.bowl);

  const renderButton = (id: IngredientId) => {
    const ing = INGREDIENTS[id];
    const stock = state.inventory[id];
    const out = stock < 1;
    const count = inBowl[id] ?? 0;
    const over = count > (need[id] ?? 0);
    return (
      <div key={id} className="ing-cell">
        <button
          className={`ing-btn kind-${ing.kind} ${id in need ? 'needed' : ''} ${out ? 'out' : ''}`}
          onClick={() => dispatch(out ? { type: 'BUY_PACK', id } : { type: 'ADD_INGREDIENT', id })}
          aria-label={out ? `Hết ${ing.name}, chạm để nhập 1 gói` : `Thêm ${ing.name}`}
        >
          <span className="ing-emoji">{ing.emoji}</span>
          <span className="ing-name">{ing.name}</span>
          <span className="ing-stock">{out ? `Nhập ${formatShortVND(ing.packPrice)}` : stock}</span>
        </button>
        {count > 0 && (
          <button
            className={`ing-minus ${over ? 'over' : ''}`}
            onClick={() => dispatch({ type: 'REMOVE_INGREDIENT', id })}
            aria-label={`Bớt 1 ${ing.name} (trong tô đang có ${count})`}
          >
            −{count}
          </button>
        )}
      </div>
    );
  };

  return (
    <section className="station">
      <div className="station-top">
        <BowlView bowl={state.bowl} size={118} />
        <OrderCard customer={customer} state={state} />
      </div>

      <div className="ingredients">
        <div className="chili-row">
          <ChiliJar shots={chiliShots(state.bowl)} target={customer ? customer.order.spice : null} onAdd={() => dispatch({ type: 'ADD_CHILI' })} />
          <button
            className="btn chili-minus"
            onClick={() => dispatch({ type: 'REMOVE_CHILI' })}
            disabled={chiliShots(state.bowl) === 0}
            aria-label="Bớt 1 shot ớt"
          >
            −🌶️
          </button>
        </div>
        <div className="ing-groups">
          {GROUPS.map((g) => {
            const ids = ingredients.filter((id) => INGREDIENTS[id].kind === g.kind);
            if (ids.length === 0) return null;
            return (
              <div key={g.kind} className={`ing-group group-${g.kind}`} style={{ gridColumn: `span ${ids.length}` }}>
                <span className="ing-group-title">{g.title}</span>
                <div className="ing-grid" style={{ gridTemplateColumns: `repeat(${ids.length}, 1fr)` }}>
                  {ids.map(renderButton)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="actions">
        <button className="btn secondary" onClick={() => dispatch({ type: 'UNDO' })} disabled={empty}>
          ↶ Hoàn tác
        </button>
        <button className="btn secondary" onClick={() => dispatch({ type: 'DISCARD' })} disabled={empty}>
          🗑️ Đổ bỏ
        </button>
        <button className="btn primary" onClick={() => dispatch({ type: 'SERVE' })} disabled={!customer || !hasFood}>
          🍜 Giao món
        </button>
      </div>
    </section>
  );
}
