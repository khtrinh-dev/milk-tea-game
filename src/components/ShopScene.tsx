import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CLOSE_HOUR, COOK_TIME_MS, DAY_LENGTH_MS, OPEN_HOUR, TABLE_COUNT } from '../game/constants';
import { DIRT_TYPES } from '../game/data/cleaning';
import { INGREDIENTS } from '../game/data/ingredients';
import { DISH_BY_ID } from '../game/data/menu';
import { STAFF_TYPES } from '../game/data/staff';
import { formatShortVND } from '../game/money';
import { customerTitle, serviceLabel } from '../game/orders';
import type { GameAction } from '../game/state';
import type { Customer, CustomerLook, Diner, DirtSpot, GameState, OrderChannel, Reaction } from '../game/types';
import { CustomerFigure, type CarryItem, type FigureMood } from './CustomerFigure';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

// Bố cục quán (theo % bề ngang, px theo chiều dọc):
// nửa trên là phòng ăn với 10 bàn (2 dãy × 5), nửa dưới là quầy gọi món với cửa ra vào bên trái.
const DOOR_X = 8;
const spotX = (index: number) => 34 + index * 25;
const TABLES_PER_ROW = 5;
const tableX = (table: number) => 24 + (table % TABLES_PER_ROW) * 17;
/** Mép trên mặt bàn của dãy bàn trong / ngoài. */
const tableTop = (table: number) => (table < TABLES_PER_ROW ? 66 : 122);
/** Chỗ khách bưng tô đứng chờ khi hết bàn. */
const TABLE_WAIT_X = 1;
const FIGURE_HEIGHT = 100;
const SEATED_HEIGHT = 62;
/** Tốc độ đi bộ: mili-giây cho mỗi 1% bề ngang. */
const WALK_MS_PER_PERCENT = 20;
const DOOR_OPEN_MS = 1_400;
/** Khách ăn xong: hiện mặt + câu nhận xét tại bàn trong khoảng này rồi rời đi. */
const REACT_MS = 2_800;
/** Khách nhận tô sai: hiện câu chê + mặt buồn trong khoảng này. */
const COMPLAIN_MS = 2_600;

const REACTION_MOOD: Record<Reaction, FigureMood> = {
  delicious: 'happy',
  spicy: 'hot',
  'very-spicy': 'hot',
  mild: 'disdain',
  'not-spicy': 'disdain',
  bad: 'sad',
};

function clock(dayTimeMs: number): string {
  const minutes = (dayTimeMs / DAY_LENGTH_MS) * (CLOSE_HOUR - OPEN_HOUR) * 60;
  const h = OPEN_HOUR + Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  return `${String(h).padStart(2, '0')}:${String(m - (m % 5)).padStart(2, '0')}`;
}

function moodFor(left: number): FigureMood {
  if (left > 0.5) return 'normal';
  if (left > 0.25) return 'worried';
  return 'angry';
}

/**
 * Di chuyển con theo trục ngang bằng CSS transition, báo `walking` trong lúc đang đi.
 * Lần đầu hiện ra ở `startX` rồi đi tới `x`.
 */
function Walker({
  x,
  startX,
  className,
  children,
}: {
  x: number;
  startX: number;
  className: string;
  children: (walking: boolean) => ReactNode;
}) {
  const [shownX, setShownX] = useState(startX);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Đợi 1 frame để trình duyệt vẽ vị trí ban đầu rồi mới bắt đầu đi.
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setDuration(Math.abs(x - shownX) * WALK_MS_PER_PERCENT);
        setShownX(x);
      }),
    );
    return () => cancelAnimationFrame(id);
    // shownX chỉ dùng để tính quãng đường, không cần chạy lại khi nó đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [x]);

  const [walking, setWalking] = useState(x !== startX);
  useEffect(() => {
    if (duration === 0) return;
    setWalking(true);
    const id = window.setTimeout(() => setWalking(false), duration);
    return () => window.clearTimeout(id);
  }, [shownX, duration]);

  return (
    <div className={className} style={{ left: `${shownX}%`, transitionDuration: `${duration}ms` }}>
      {children(walking)}
    </div>
  );
}

function SpeechBubble({ text, tone }: { text: string; tone: FigureMood }) {
  return <div className={`say-bubble say-${tone}`}>{text}</div>;
}

const SERVICE_ICON = { grab: '🛵', dine: '🪑', takeaway: '🛍️' } as const;

function CustomerActor({
  customer,
  index,
  selected,
  complaint,
  state,
  onSelect,
}: {
  customer: Customer;
  index: number;
  selected: boolean;
  complaint: string | undefined;
  state: GameState;
  onSelect: (id: number) => void;
}) {
  const { order } = customer;
  const dish = DISH_BY_ID[order.dishId];
  const cook = customer.takenBy !== null ? state.cooks[customer.takenBy] : null;
  const left = 1 - customer.waitedMs / customer.patienceMs;
  const ratio = cook ? cook.progressMs / COOK_TIME_MS : left;
  const barColor = cook ? 'var(--accent)' : left > 0.5 ? 'var(--ok)' : left > 0.25 ? 'var(--warn)' : 'var(--bad)';
  const mood = complaint ? 'sad' : cook ? 'happy' : moodFor(left);
  const service = order.channel === 'grab' ? 'grab' : order.dineIn ? 'dine' : 'takeaway';

  return (
    <Walker x={spotX(index)} startX={DOOR_X} className={`actor ${selected ? 'selected' : ''} ${cook ? 'taken' : ''}`}>
      {(walking) => (
        <button
          className="actor-hit"
          onClick={() => onSelect(customer.id)}
          disabled={!!cook}
          aria-label={`Đơn của ${customerTitle(customer)}: ${dish.name}, cay cấp ${order.spice}, ${serviceLabel(order)}`}
        >
          {!walking &&
            (complaint ? (
              <SpeechBubble text={complaint} tone="sad" />
            ) : (
              <div className={`bubble ${service}`}>
                <div className="bubble-items">
                  <span className="bubble-service">{SERVICE_ICON[service]}</span>
                  <span className="bubble-dish">{dish.emoji}</span>
                  <span className="bubble-spice">🌶️{order.spice}</span>
                  {order.drinks.map((d) => (
                    <span key={d} className="bubble-top">{INGREDIENTS[d].emoji}</span>
                  ))}
                  {cook && <span className="bubble-top">👨‍🍳</span>}
                </div>
                <div className="patience">
                  <div style={{ width: `${Math.max(0, ratio) * 100}%`, background: barColor }} />
                </div>
              </div>
            ))}
          {selected && !walking && !complaint && <span className="select-arrow">▼</span>}
          <span className="actor-shadow" />
          <CustomerFigure look={customer.look} walking={walking} mood={mood} height={FIGURE_HEIGHT} />
          <span className="actor-name">{order.channel === 'grab' ? `🛵 ${customer.name}` : customer.name}</span>
        </button>
      )}
    </Walker>
  );
}

interface Departure {
  id: number;
  look: CustomerLook;
  fromX: number;
  /** null = bỏ về vì chờ lâu. */
  carrying: CarryItem | null;
  channel: OrderChannel;
  amount: number;
}

/** Khách rời quầy đi ra cửa: mang về / tài xế Grab xách túi, hoặc bỏ về vì chờ lâu. */
function DepartureActor({ d }: { d: Departure }) {
  const angry = d.carrying === null;
  return (
    <Walker x={DOOR_X} startX={d.fromX} className="actor leaving">
      {(walking) => (
        <>
          {d.amount > 0 && <span className="coin-float">+{formatShortVND(d.amount)}</span>}
          {angry && <span className="anger-float">💢</span>}
          {!angry && d.channel === 'grab' && <span className="anger-float">🛵</span>}
          <span className="actor-shadow" />
          <CustomerFigure look={d.look} walking={walking} mood={angry ? 'angry' : 'happy'} carrying={d.carrying} facing="left" height={FIGURE_HEIGHT} />
        </>
      )}
    </Walker>
  );
}

/** Khách vừa rời quầy – giữ lại một lúc để vẽ cảnh đi ra cửa. Khách ăn tại chỗ thì vào bàn (không đi ra). */
function useDepartures(state: GameState): Departure[] {
  const prev = useRef<Customer[]>(state.customers);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const ids = new Set(state.customers.map((c) => c.id));
    const gone = prev.current.map((c, index) => ({ c, index })).filter(({ c }) => !ids.has(c.id));
    prev.current = state.customers;
    if (gone.length === 0) return;

    const fresh: Departure[] = [];
    for (const { c, index } of gone) {
      const event = [...state.events].reverse().find((e) => 'customerId' in e && e.customerId === c.id);
      const served = event?.type === 'served' ? event : null;
      if (served?.dineIn) continue;
      fresh.push({
        id: c.id,
        look: c.look,
        fromX: spotX(index),
        carrying: served ? 'bag' : null,
        channel: c.order.channel,
        amount: served ? served.amount : 0,
      });
    }
    if (fresh.length === 0) return;
    setDepartures((list) => [...list, ...fresh]);
    for (const d of fresh) {
      const total = (d.fromX - DOOR_X) * WALK_MS_PER_PERCENT + 400;
      timers.current.push(window.setTimeout(() => setDepartures((list) => list.filter((x) => x.id !== d.id)), total));
    }
  }, [state.customers, state.events]);

  return departures;
}

interface FinishedMeal {
  id: number;
  table: number;
  look: CustomerLook;
  reaction: Exclude<Reaction, 'bad'>;
  feedback: string;
  amount: number;
}

/** Khách ăn tại chỗ vừa ăn xong: giữ lại ở bàn để hiện biểu cảm + câu nhận xét. */
function useFinishedMeals(state: GameState): FinishedMeal[] {
  const prev = useRef<(Diner | null)[]>(state.tables);
  const [meals, setMeals] = useState<FinishedMeal[]>([]);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  useEffect(() => {
    const before = prev.current;
    prev.current = state.tables;
    const fresh: FinishedMeal[] = [];
    before.forEach((d, table) => {
      if (!d || state.tables[table]?.id === d.id) return;
      const event = [...state.events].reverse().find((e) => e.type === 'finished' && e.customerId === d.id);
      if (event?.type !== 'finished') return;
      fresh.push({ id: d.id, table, look: d.look, reaction: event.reaction, feedback: event.feedback, amount: event.amount });
    });
    if (fresh.length === 0) return;
    setMeals((list) => [...list, ...fresh]);
    const ids = new Set(fresh.map((m) => m.id));
    timers.current.push(window.setTimeout(() => setMeals((list) => list.filter((m) => !ids.has(m.id))), REACT_MS));
  }, [state.tables, state.events]);

  return meals;
}

/** Câu chê của khách vừa nhận tô sai (khách vẫn đứng chờ tô mới). */
function useComplaints(state: GameState): Map<number, string> {
  const lastSeen = useRef(state.nextEventId - 1);
  const [complaints, setComplaints] = useState<Map<number, string>>(() => new Map());

  useEffect(() => {
    const fresh = state.events.filter((e) => e.id > lastSeen.current);
    if (fresh.length === 0) return;
    lastSeen.current = fresh[fresh.length - 1].id;
    for (const e of fresh) {
      if (e.type !== 'wrong') continue;
      setComplaints((m) => new Map(m).set(e.customerId, e.feedback));
      window.setTimeout(
        () =>
          setComplaints((m) => {
            if (m.get(e.customerId) !== e.feedback) return m;
            const next = new Map(m);
            next.delete(e.customerId);
            return next;
          }),
        COMPLAIN_MS,
      );
    }
  }, [state.events]);

  return complaints;
}

/** Một bàn ăn: khăn trải bàn đỏ, khách ngồi phía sau (chỉ thấy nửa trên), tô mì bốc khói trên bàn. */
function Table({
  table,
  diner,
  meal,
  dirty,
}: {
  table: number;
  diner: Diner | null;
  meal: FinishedMeal | undefined;
  dirty: boolean;
}) {
  const top = tableTop(table);
  const mood = meal ? REACTION_MOOD[meal.reaction] : 'normal';
  const look = diner?.look ?? meal?.look;
  return (
    <div className={`table-spot ${meal ? 'reacting' : ''}`} style={{ left: `${tableX(table)}%`, top }}>
      {look && (
        <div className={`seated ${diner ? 'eating' : ''}`}>
          {meal && <SpeechBubble text={meal.feedback} tone={mood} />}
          {meal && meal.amount > 0 && <span className="coin-float">+{formatShortVND(meal.amount)}</span>}
          <CustomerFigure look={look} mood={mood} height={SEATED_HEIGHT} />
        </div>
      )}
      <div className="table-top">
        {diner && <span className="table-bowl">🍜</span>}
        {diner && <span className="table-steam" />}
        {!diner && !dirty && <span className="table-no">{table + 1}</span>}
      </div>
    </div>
  );
}

function DirtButton({ spot, onClean }: { spot: DirtSpot; onClean: () => void }) {
  const type = DIRT_TYPES[spot.kind];
  const style =
    spot.table !== null
      ? { left: `${tableX(spot.table)}%`, top: tableTop(spot.table) - 14 }
      : { left: `${spot.x}%`, top: `${spot.y}%` };
  return (
    <button className={`dirt dirt-${spot.kind}`} style={style} onClick={onClean} aria-label={`Dọn ${type.name}`}>
      <span className="dirt-emoji">{type.emoji}</span>
      {spot.hp > 1 && <span className="dirt-hp">{'•'.repeat(spot.hp)}</span>}
    </button>
  );
}

export function ShopScene({ state, dispatch }: Props) {
  const departures = useDepartures(state);
  const meals = useFinishedMeals(state);
  const complaints = useComplaints(state);
  const prep = state.phase === 'prep';
  const closed = state.phase !== 'open';
  const busyTables = state.tables.filter((d) => d !== null).length;

  // Cửa mở ra mỗi khi có khách vào hoặc ra.
  const [doorOpen, setDoorOpen] = useState(false);
  const traffic = state.customers.length + departures.length * 100 + state.nextId;
  useEffect(() => {
    setDoorOpen(true);
    const id = window.setTimeout(() => setDoorOpen(false), DOOR_OPEN_MS);
    return () => window.clearTimeout(id);
  }, [traffic]);

  const staff = (Object.keys(state.staff) as (keyof typeof state.staff)[]).filter((role) => state.staff[role] > 0);
  const dirtyTables = new Set(state.dirt.map((d) => d.table).filter((t): t is number => t !== null));

  return (
    <section className={`scene ${prep ? 'prep' : ''}`} aria-label="Quán mì cay">
      <div className="dining-wall">
        <div className="lantern" style={{ left: '30%' }} />
        <div className="lantern" style={{ left: '70%' }} />
        <div className="shop-sign">
          <span>🌶️ {state.shop.name}</span>
        </div>
      </div>
      <div className="dining-floor" />
      <div className="counter-floor" />

      <div className="scene-hud">
        <span className="pill small">
          Ngày {state.day} ·{' '}
          <b className={closed ? 'closing' : ''}>{prep ? 'Dọn quán' : closed ? 'Đóng cửa' : clock(state.dayTimeMs)}</b>
        </span>
        {staff.length > 0 && (
          <span className="pill small staff-pill">
            {staff.map((role) => (
              <span key={role} title={STAFF_TYPES[role].name}>
                {STAFF_TYPES[role].emoji}×{state.staff[role]}
              </span>
            ))}
          </span>
        )}
      </div>
      <span className={`pill small tables-pill ${busyTables === TABLE_COUNT ? 'full' : ''}`}>
        🪑 {busyTables}/{TABLE_COUNT} bàn
      </span>

      {state.tables.map((diner, table) => (
        <Table key={table} table={table} diner={diner} meal={meals.find((m) => m.table === table)} dirty={dirtyTables.has(table)} />
      ))}

      {state.tableQueue.length > 0 && (
        <div className="table-wait" style={{ left: `${TABLE_WAIT_X}%` }}>
          <span className="pill small full">⏳ {state.tableQueue.length}</span>
          <div className="table-wait-people">
            {state.tableQueue.slice(0, 3).map((d) => (
              <CustomerFigure key={d.id} look={d.look} mood="worried" carrying="bowl" height={SEATED_HEIGHT + 6} />
            ))}
          </div>
        </div>
      )}

      <div className={`door ${doorOpen ? 'open' : ''}`} aria-hidden="true">
        <div className="door-panel">
          <span className={`door-sign ${closed ? 'closed' : ''}`}>{closed ? 'CLOSED' : 'OPEN'}</span>
        </div>
      </div>

      {departures.map((d) => (
        <DepartureActor key={`out-${d.id}`} d={d} />
      ))}

      {state.customers.map((c, i) => (
        <CustomerActor
          key={c.id}
          customer={c}
          index={i}
          state={state}
          selected={c.id === state.selectedCustomerId}
          complaint={complaints.get(c.id)}
          onSelect={(id) => dispatch({ type: 'SELECT_CUSTOMER', id })}
        />
      ))}
      <div className="counter-bar" aria-hidden="true" />

      {!prep && state.customers.length === 0 && departures.length === 0 && (
        <div className="queue-empty">{closed ? 'Quán đã đóng cửa 🌙' : 'Đang chờ khách…'}</div>
      )}

      {prep &&
        state.dirt.map((spot) => <DirtButton key={spot.id} spot={spot} onClean={() => dispatch({ type: 'CLEAN', id: spot.id })} />)}
    </section>
  );
}
