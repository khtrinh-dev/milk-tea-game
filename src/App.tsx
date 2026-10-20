import { useCallback, useEffect, useRef, useState } from 'react';
import { DaySummaryModal } from './components/DaySummaryModal';
import { HowToPlay } from './components/HelpContent';
import { Hud, type ModalName } from './components/Hud';
import { Modal } from './components/Modal';
import { RecipeModal } from './components/RecipeModal';
import { SettingsModal } from './components/SettingsModal';
import { ShopScene } from './components/ShopScene';
import { StaffModal } from './components/StaffModal';
import { StockModal } from './components/StockModal';
import { Toasts, type Toast } from './components/Toasts';
import { Workstation } from './components/Workstation';
import { clearSave } from './game/save';
import type { GameAction } from './game/state';
import type { GameEvent } from './game/types';
import { playSound, setMuted, unlockAudio } from './hooks/sound';
import { useGame } from './hooks/useGame';

const TOAST_MS = 3_200;
const MAX_TOASTS = 3;
const MUTED_KEY = 'milk-tea-game/muted';
const TUTORIAL_KEY = 'milk-tea-game/tutorial-seen';

const SOUND_FOR: Partial<Record<GameEvent['type'], Parameters<typeof playSound>[0]>> = {
  'new-order': 'order',
  served: 'coin',
  wrong: 'wrong',
  left: 'left',
  unlock: 'unlock',
  error: 'wrong',
};

function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    // bỏ qua
  }
}

export default function App() {
  const [modal, setModal] = useState<ModalName | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !readFlag(TUTORIAL_KEY));
  const [muted, setMutedState] = useState(() => readFlag(MUTED_KEY));
  const [toasts, setToasts] = useState<Toast[]>([]);

  const paused = userPaused || modal !== null || showTutorial;
  const [state, rawDispatch] = useGame(paused);

  useEffect(() => setMuted(muted), [muted]);

  // iOS yêu cầu một thao tác chạm trước khi phát âm thanh.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio);
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  const dispatch = useCallback(
    (action: GameAction) => {
      if (action.type === 'ADD_INGREDIENT' || action.type === 'SET_ICE' || action.type === 'SET_SUGAR') playSound('pop');
      rawDispatch(action);
    },
    [rawDispatch],
  );

  // Biến GameEvent mới thành toast + âm thanh.
  const lastEventId = useRef(state.nextEventId - 1);
  useEffect(() => {
    const fresh = state.events.filter((e) => e.id > lastEventId.current);
    if (fresh.length === 0) return;
    lastEventId.current = fresh[fresh.length - 1].id;
    const sound = fresh.map((e) => SOUND_FOR[e.type]).find(Boolean);
    if (sound) playSound(sound);
    setToasts((prev) => [...prev, ...fresh.map((e) => ({ id: e.id, type: e.type, text: e.text }))].slice(-MAX_TOASTS));
    const ids = new Set(fresh.map((e) => e.id));
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => !ids.has(t.id))), TOAST_MS);
  }, [state.events]);

  const closeTutorial = () => {
    writeFlag(TUTORIAL_KEY, true);
    setShowTutorial(false);
  };

  const toggleMute = () => {
    writeFlag(MUTED_KEY, !muted);
    setMutedState(!muted);
  };

  const reset = () => {
    clearSave();
    lastEventId.current = 0;
    setToasts([]);
    rawDispatch({ type: 'RESET', seed: Date.now() });
    setModal(null);
  };

  return (
    <div className="app">
      <Hud state={state} paused={userPaused} onTogglePause={() => setUserPaused((p) => !p)} onOpen={setModal} />
      <ShopScene state={state} onSelect={(id) => dispatch({ type: 'SELECT_CUSTOMER', id })} />
      <Workstation state={state} dispatch={dispatch} />
      <Toasts toasts={toasts} />

      {userPaused && modal === null && (
        <button className="pause-overlay" onClick={() => setUserPaused(false)}>
          <span>⏸️ Đang tạm dừng</span>
          <small>Chạm để chơi tiếp</small>
        </button>
      )}

      {modal === 'stock' && <StockModal state={state} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'recipes' && <RecipeModal state={state} onClose={() => setModal(null)} />}
      {modal === 'staff' && <StaffModal state={state} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'settings' && <SettingsModal muted={muted} onToggleMute={toggleMute} onReset={reset} onClose={() => setModal(null)} />}

      {state.phase === 'summary' && state.lastSummary && modal === null && (
        <DaySummaryModal summary={state.lastSummary} onNext={() => dispatch({ type: 'NEXT_DAY' })} />
      )}

      {showTutorial && (
        <Modal
          title="🧋 Chào mừng tới Trà Sữa Tycoon!"
          footer={
            <button className="btn primary wide" onClick={closeTutorial}>
              Mở cửa quán!
            </button>
          }
        >
          <p className="modal-note">Bạn vừa mở một quán trà sữa nhỏ với 1.000.000₫ vốn và ít nguyên liệu ban đầu.</p>
          <HowToPlay />
        </Modal>
      )}
    </div>
  );
}
