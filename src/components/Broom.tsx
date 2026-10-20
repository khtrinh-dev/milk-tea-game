import { useRef, useState, type PointerEvent } from 'react';
import type { DirtSpot } from '../game/types';

// Lúc dọn quán: kéo cây chổi quét qua chỗ bẩn. Mỗi lần chổi lướt vào một chỗ bẩn = 1 lần quét (CLEAN);
// chỗ cần quét nhiều lần thì phải đưa chổi ra rồi quét lại vào.

/** Bán kính (px) quanh tâm chỗ bẩn tính là chổi đang chạm. */
const HIT_RADIUS = 30;
/** Phải ra xa hơn ngần này mới tính là nhấc chổi ra (tránh rung tay quét nhiều lần). */
const LEAVE_RADIUS = 42;
const PUFF_MS = 600;

interface Puff {
  id: number;
  x: number;
  y: number;
}

function BroomArt() {
  return (
    <svg viewBox="0 0 60 90" width="54" height="81" aria-hidden="true">
      <rect x="27" y="0" width="6" height="52" rx="3" fill="#b07a4f" stroke="#1b1b1b" strokeWidth="2" />
      <rect x="22" y="48" width="16" height="8" rx="2" fill="#e0241b" stroke="#1b1b1b" strokeWidth="2" />
      <path d="M20 56 h20 l10 30 q-20 6 -40 0 z" fill="#f2c64f" stroke="#1b1b1b" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M24 60 l-5 24 M30 60 v26 M36 60 l5 24" stroke="#c99a2e" strokeWidth="1.6" />
    </svg>
  );
}

export function BroomLayer({ dirt, onSweep }: { dirt: DirtSpot[]; onSweep: (id: number) => void }) {
  const layer = useRef<HTMLDivElement>(null);
  /** Vị trí đầu chổi (px trong khung cảnh); null = chổi đang dựng ở góc. */
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [puffs, setPuffs] = useState<Puff[]>([]);
  const touching = useRef(new Set<number>());
  const dragging = useRef(false);
  const puffId = useRef(0);

  const sweepAt = (clientX: number, clientY: number) => {
    const box = layer.current?.getBoundingClientRect();
    if (!box) return;
    setPos({ x: clientX - box.left, y: clientY - box.top });
    for (const spot of dirt) {
      const el = document.querySelector<HTMLElement>(`[data-dirt-id="${spot.id}"]`);
      if (!el) continue;
      const r = el.getBoundingClientRect();
      const dist = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2));
      if (dist <= HIT_RADIUS && !touching.current.has(spot.id)) {
        touching.current.add(spot.id);
        onSweep(spot.id);
        const id = ++puffId.current;
        setPuffs((list) => [...list, { id, x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }]);
        window.setTimeout(() => setPuffs((list) => list.filter((p) => p.id !== id)), PUFF_MS);
      } else if (dist > LEAVE_RADIUS) {
        touching.current.delete(spot.id);
      }
    }
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    touching.current.clear();
    sweepAt(e.clientX, e.clientY);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (dragging.current) sweepAt(e.clientX, e.clientY);
  };
  const onUp = () => {
    dragging.current = false;
    touching.current.clear();
  };

  return (
    <div
      ref={layer}
      className="broom-layer"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      aria-label="Kéo cây chổi quét qua chỗ bẩn để dọn"
    >
      {puffs.map((p) => (
        <span key={p.id} className="sweep-puff" style={{ left: p.x, top: p.y }}>
          <i />
          <i />
          <i />
        </span>
      ))}
      <div
        className={`broom ${pos ? 'held' : 'idle'}`}
        style={pos ? { left: pos.x, top: pos.y } : undefined}
      >
        <BroomArt />
      </div>
      {!pos && <span className="broom-hint">👆 Kéo chổi quét rác</span>}
    </div>
  );
}
