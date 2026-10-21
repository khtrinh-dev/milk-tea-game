import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CLOSE_HOUR, COOK_TIME_MS, DAY_LENGTH_MS, OPEN_HOUR, TABLE_COUNT, TABLES_PER_ROW } from '../game/constants';
import { DIRT_TYPES } from '../game/data/cleaning';
import { INGREDIENTS } from '../game/data/ingredients';
import { DISH_BY_ID } from '../game/data/menu';
import { STAFF_TYPES } from '../game/data/staff';
import { formatShortVND } from '../game/money';
import { openGuests, partyTitle, serviceLabel, spiceShort } from '../game/orders';
import type { GameAction } from '../game/state';
import type { Customer, CustomerLook, Diner, DirtSpot, GameState, OrderChannel } from '../game/types';
import { BroomLayer } from './Broom';
import { CustomerFigure, type CarryItem, type FigureMood } from './CustomerFigure';

interface Props {
  state: GameState;
  dispatch: (action: GameAction) => void;
}

// Bố cục quán (theo % bề ngang, px theo chiều dọc):
// nửa trên là phòng ăn với 10 bàn (2 dãy × 5), nửa dưới là quầy gọi món (4 chỗ đứng) với cửa ra vào bên trái.
const DOOR_X = 8;
const spotX = (index: number) => 29 + index * 20;
const tableX = (table: number) => 24 + (table % TABLES_PER_ROW) * 17;
/** Mép trên mặt bàn của dãy bàn trong / ngoài. */
const tableTop = (table: number) => (table < TABLES_PER_ROW ? 66 : 122);
/** Chỗ khách bưng tô đứng chờ khi hết bàn. */
const TABLE_WAIT_X = 1;
const FIGURE_HEIGHT = 100;
/** Nhóm bạn đứng chen nhau ở một chỗ nên vẽ nhỏ hơn chút. */
const PARTY_FIGURE_HEIGHT = 84;
const SEATED_HEIGHT = 62;
/** Tốc độ đi bộ: mili-giây cho mỗi 1% bề ngang. */
const WALK_MS_PER_PERCENT = 20;
const DOOR_OPEN_MS = 1_400;
/** Khách ăn xong: hiện mặt + câu nhận xét tại bàn trong khoảng này rồi rời đi. */
const REACT_MS = 2_800;
/** Khách nhận tô sai: hiện câu chê + mặt buồn trong khoảng này. */
const COMPLAIN_MS = 2_600;

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

const SERVICE_TEXT = { grab: 'Grab · mang về', dine: 'Ăn tại chỗ', takeaway: 'Mang về' } as const;

/** Bong bóng đơn trên đầu khách: tên món + cấp cay + ăn tại chỗ hay mang về (nhóm bạn: từng tô của từng bạn). */
function OrderBubble({ customer, state, service }: { customer: Customer; state: GameState; service: keyof typeof SERVICE_TEXT }) {
  const { guests } = customer;
  const [lead] = guests;
  const cook = guests.length === 1 && lead.takenBy !== null ? state.cooks[lead.takenBy] : null;
  const left = 1 - customer.waitedMs / customer.patienceMs;
  const ratio = cook ? cook.progressMs / COOK_TIME_MS : left;
  const barColor = cook ? 'var(--accent)' : left > 0.5 ? 'var(--ok)' : left > 0.25 ? 'var(--warn)' : 'var(--bad)';
  const selected = customer.id === state.selectedCustomerId;

  return (
    <div className={`bubble ${service}`}>
      {guests.length > 1 ? (
        <>
          <div className="bubble-head">Nhóm {guests.length} người</div>
          <ul className="bubble-list">
            {guests.map((g) => (
              <li
                key={g.id}
                className={g.served ? 'done' : g.takenBy !== null ? 'cooking' : selected && g.id === state.selectedGuestId ? 'current' : ''}
              >
                {g.served ? '✓ ' : g.takenBy !== null ? '👨‍🍳 ' : ''}
                {DISH_BY_ID[g.order.dishId].short} · {g.order.spice === 0 ? 'ko cay' : `cay ${g.order.spice}`}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <div className="bubble-dish">
            {cook && '👨‍🍳 '}
            {DISH_BY_ID[lead.order.dishId].name}
          </div>
          <div className="bubble-sub">
            {spiceShort(lead.order.spice)}
            {lead.order.drinks.map((d) => ` + ${INGREDIENTS[d].name}`).join('')}
          </div>
        </>
      )}
      <div className={`bubble-service ${service}`}>{SERVICE_TEXT[service]}</div>
      <div className="patience">
        <div style={{ width: `${Math.max(0, ratio) * 100}%`, background: barColor }} />
      </div>
    </div>
  );
}

/** Một hoặc nhiều nhân vật đứng chen nhau (nhóm bạn). */
function Crowd({
  looks,
  walking,
  mood,
  carrying,
  facing,
}: {
  looks: { look: CustomerLook; carrying?: CarryItem | null }[];
  walking: boolean;
  mood: FigureMood;
  carrying?: CarryItem | null;
  facing?: 'left' | 'right';
}) {
  const height = looks.length > 1 ? PARTY_FIGURE_HEIGHT : FIGURE_HEIGHT;
  return (
    <span className={`crowd ${looks.length > 1 ? 'party' : ''}`}>
      {looks.map((l, i) => (
        <CustomerFigure key={i} look={l.look} walking={walking} mood={mood} carrying={l.carrying ?? carrying} facing={facing} height={height} />
      ))}
    </span>
  );
}

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
  const { guests } = customer;
  const [lead] = guests;
  const busy = openGuests(customer).length === 0;
  const left = 1 - customer.waitedMs / customer.patienceMs;
  const mood = complaint ? 'sad' : busy ? 'happy' : moodFor(left);
  const service = lead.order.channel === 'grab' ? 'grab' : lead.order.dineIn ? 'dine' : 'takeaway';
  const group = guests.length > 1;

  return (
    <Walker x={spotX(index)} startX={DOOR_X} className={`actor ${selected ? 'selected' : ''} ${busy ? 'taken' : ''}`}>
      {(walking) => (
        <button
          className="actor-hit"
          onClick={() => onSelect(customer.id)}
          disabled={busy}
          aria-label={`Đơn của ${partyTitle(customer)}: ${guests.map((g) => `${DISH_BY_ID[g.order.dishId].name} ${spiceShort(g.order.spice)}`).join(', ')}, ${serviceLabel(lead.order)}`}
        >
          {!walking && (complaint ? <SpeechBubble text={complaint} tone="sad" /> : <OrderBubble customer={customer} state={state} service={service} />)}
          {selected && !walking && !complaint && <span className="select-arrow">▼</span>}
          <span className="actor-shadow" />
          <Crowd looks={guests.map((g) => ({ look: g.look, carrying: g.served ? 'bowl' : null }))} walking={walking} mood={mood} />
          <span className="actor-name">{group ? `Nhóm ${guests.length}` : lead.order.channel === 'grab' ? `🛵 ${lead.name}` : lead.name}</span>
        </button>
      )}
    </Walker>
  );
}

interface Departure {
  id: number;
  looks: CustomerLook[];
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
          <Crowd looks={d.looks.map((look) => ({ look }))} walking={walking} mood={angry ? 'angry' : 'happy'} carrying={d.carrying} facing="left" />
        </>
      )}
    </Walker>
  );
}

/**
 * Khách vừa rời quầy – giữ lại một lúc để vẽ cảnh đi ra cửa. Khách ăn tại chỗ thì vào bàn (không đi ra).
 * `exits` tăng mỗi khi có người ra tới cửa – dùng để mở cửa đúng lúc.
 */
function useDepartures(state: GameState): { departures: Departure[]; exits: number } {
  const prev = useRef<Customer[]>(state.customers);
  const [departures, setDepartures] = useState<Departure[]>([]);
  const [exits, setExits] = useState(0);
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
        looks: c.guests.map((g) => g.look),
        fromX: spotX(index),
        carrying: served ? 'bag' : null,
        channel: c.guests[0].order.channel,
        amount: served ? served.amount : 0,
      });
    }
    if (fresh.length === 0) return;
    setDepartures((list) => [...list, ...fresh]);
    for (const d of fresh) {
      const total = (d.fromX - DOOR_X) * WALK_MS_PER_PERCENT + 400;
      timers.current.push(
        window.setTimeout(() => {
          setDepartures((list) => list.filter((x) => x.id !== d.id));
          setExits((n) => n + 1);
        }, total),
      );
    }
  }, [state.customers, state.events]);

  return { departures, exits };
}

interface FinishedMeal {
  /** Id người khách (Diner.id). */
  id: number;
  table: number;
  look: CustomerLook;
  /** Câu nhận xét + tiền chỉ hiện ở bàn đầu tiên của nhóm. */
  feedback: string | null;
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
      const event = [...state.events].reverse().find((e) => e.type === 'finished' && e.customerId === d.partyId);
      if (event?.type !== 'finished') return;
      const first = event.tables[0] === table;
      fresh.push({ id: d.id, table, look: d.look, feedback: first ? event.feedback : null, amount: first ? event.amount : 0 });
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
  const mood: FigureMood = meal ? 'happy' : 'normal';
  const look = diner?.look ?? meal?.look;
  const party = (diner?.partySize ?? 1) > 1;
  return (
    <div className={`table-spot ${meal ? 'reacting' : ''} ${party ? 'party' : ''}`} style={{ left: `${tableX(table)}%`, top }}>
      {look && (
        <div className={`seated ${diner ? 'eating' : ''}`}>
          {meal?.feedback && <SpeechBubble text={meal.feedback} tone={mood} />}
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

/** Một chỗ bẩn; mỗi lần bị chổi quét thì lắc + mờ dần theo số lần còn lại. */
function Dirt({ spot }: { spot: DirtSpot }) {
  const type = DIRT_TYPES[spot.kind];
  const style =
    spot.table !== null
      ? { left: `${tableX(spot.table)}%`, top: tableTop(spot.table) - 14 }
      : { left: `${spot.x}%`, top: `${spot.y}%` };
  return (
    <div
      data-dirt-id={spot.id}
      className={`dirt dirt-${spot.kind} ${spot.hp < type.hp ? 'hit' : ''}`}
      style={{ ...style, opacity: 0.45 + (0.55 * spot.hp) / type.hp }}
      aria-label={type.name}
    >
      <span className="dirt-emoji">{type.emoji}</span>
      {spot.hp > 1 && <span className="dirt-hp">{'•'.repeat(spot.hp)}</span>}
    </div>
  );
}

export function ShopScene({ state, dispatch }: Props) {
  const { departures, exits } = useDepartures(state);
  const meals = useFinishedMeals(state);
  const complaints = useComplaints(state);
  const prep = state.phase === 'prep';
  const closed = state.phase !== 'open';
  // Hết giờ nhưng còn khách ở quầy / đang ngồi ăn / chờ bàn: quán chỉ đóng hẳn khi khách cuối cùng ăn xong.
  const waitingForTable = state.tableQueue.flat();
  const stillEating = state.tables.filter((d) => d !== null).length + waitingForTable.length;
  const closingSoon = state.phase === 'closing' && (stillEating > 0 || state.customers.length > 0);
  const busyTables = state.tables.filter((d) => d !== null).length;

  // Cửa chỉ mở khi có khách bước vào (khách mới) hoặc ra tới cửa – khách ăn tại chỗ đi vào bàn thì không.
  const [doorOpen, setDoorOpen] = useState(false);
  const traffic = `${state.nextId}-${exits}`;
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
      </div>
      <div className="dining-floor" />
      <div className="counter-floor" />

      <div className="scene-hud">
        <span className="pill small">
          Ngày {state.day} ·{' '}
          <b className={closed ? 'closing' : ''}>{prep ? 'Dọn quán' : closingSoon ? 'Sắp đóng cửa' : closed ? 'Đóng cửa' : clock(state.dayTimeMs)}</b>
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

      {waitingForTable.length > 0 && (
        <div className="table-wait" style={{ left: `${TABLE_WAIT_X}%` }}>
          <span className="pill small full">⏳ {waitingForTable.length}</span>
          <div className="table-wait-people">
            {waitingForTable.slice(0, 3).map((d) => (
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
      <div className="counter-bar">
        <span className="counter-name">🌶️ {state.shop.name}</span>
      </div>

      {!prep && state.customers.length === 0 && departures.length === 0 && (
        <div className="queue-empty">
          {closingSoon
            ? `🌙 Hết giờ nhận khách – quán sẽ đóng cửa khi khách cuối cùng ăn xong (còn ${stillEating} khách đang ăn)`
            : closed
              ? 'Quán đã đóng cửa 🌙'
              : 'Đang chờ khách…'}
        </div>
      )}

      {prep && state.dirt.map((spot) => <Dirt key={`${spot.id}-${spot.hp}`} spot={spot} />)}
      {prep && <BroomLayer dirt={state.dirt} onSweep={(id) => dispatch({ type: 'CLEAN', id })} />}
    </section>
  );
}
