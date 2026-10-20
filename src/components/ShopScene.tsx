import { BARISTA_TIME_MS, MAX_CUSTOMERS } from '../game/constants';
import { INGREDIENTS } from '../game/data/ingredients';
import { DRINK_BY_ID } from '../game/data/menu';
import { STAFF_TYPES } from '../game/data/staff';
import type { Customer, GameState } from '../game/types';

interface Props {
  state: GameState;
  onSelect: (id: number) => void;
}

function patienceColor(ratio: number): string {
  if (ratio > 0.5) return 'var(--ok)';
  if (ratio > 0.25) return 'var(--warn)';
  return 'var(--bad)';
}

function CustomerSpot({ customer, selected, state, onSelect }: { customer: Customer; selected: boolean; state: GameState; onSelect: (id: number) => void }) {
  const drink = DRINK_BY_ID[customer.order.drinkId];
  const barista = customer.takenBy !== null ? state.baristas[customer.takenBy] : null;
  const left = 1 - customer.waitedMs / customer.patienceMs;
  const ratio = barista ? barista.progressMs / BARISTA_TIME_MS : left;
  const mood = left > 0.5 ? '' : left > 0.25 ? '😐' : '😠';

  return (
    <button
      className={`customer ${selected ? 'selected' : ''} ${barista ? 'taken' : ''}`}
      onClick={() => onSelect(customer.id)}
      disabled={!!barista}
      aria-label={`Đơn của ${customer.name}: ${drink.name}`}
    >
      <div className="bubble">
        <span className="bubble-drink">{drink.emoji}</span>
        {customer.order.toppings.map((t) => (
          <span key={t} className="bubble-top">{INGREDIENTS[t].emoji}</span>
        ))}
        {barista && <span className="bubble-top">👩‍🍳</span>}
      </div>
      <div className="avatar">
        {customer.avatar}
        {mood && <span className="mood">{mood}</span>}
      </div>
      <div className="customer-name">{customer.name}</div>
      <div className="patience">
        <div style={{ width: `${Math.max(0, ratio) * 100}%`, background: barista ? 'var(--accent)' : patienceColor(left) }} />
      </div>
    </button>
  );
}

export function ShopScene({ state, onSelect }: Props) {
  const staffIcons = (Object.keys(state.staff) as (keyof typeof state.staff)[]).flatMap((role) =>
    Array.from({ length: state.staff[role] }, (_, i) => <span key={`${role}-${i}`} title={STAFF_TYPES[role].name}>{STAFF_TYPES[role].emoji}</span>),
  );

  return (
    <section className="scene" aria-label="Quầy quán trà sữa">
      <div className="wall">
        <div className="shop-sign">🧋 Trà Sữa Tycoon</div>
        <div className="window">
          <span>☁️</span>
          <span className="sun">{state.phase === 'open' ? '☀️' : '🌙'}</span>
        </div>
        <div className="plant">🪴</div>
        <div className="staff-row">{staffIcons}</div>
      </div>
      <div className="queue">
        {state.customers.map((c) => (
          <CustomerSpot key={c.id} customer={c} state={state} selected={c.id === state.selectedCustomerId} onSelect={onSelect} />
        ))}
        {state.customers.length === 0 && (
          <div className="queue-empty">{state.phase === 'open' ? 'Đang chờ khách…' : 'Quán đã đóng cửa'}</div>
        )}
        {Array.from({ length: Math.max(0, MAX_CUSTOMERS - state.customers.length - (state.customers.length === 0 ? MAX_CUSTOMERS : 0)) }, (_, i) => (
          <div key={`empty-${i}`} className="customer placeholder" />
        ))}
      </div>
      <div className="counter" />
    </section>
  );
}
