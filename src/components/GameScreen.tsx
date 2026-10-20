import { useCallback, useEffect, useRef, useState } from 'react';
import { STARTING_MONEY } from '../game/constants';
import { formatVND } from '../game/money';
import type { GameAction } from '../game/state';
import type { GameEvent, GameState } from '../game/types';
import { playSound } from '../hooks/sound';
import { useGame } from '../hooks/useGame';
import type { Player } from '../services/cloud';
import { readFlag, writeFlag } from '../storage';
import { CleaningPanel } from './CleaningPanel';
import { DaySummaryModal } from './DaySummaryModal';
import { HowToPlay } from './HelpContent';
import { Hud, type ModalName } from './Hud';
import { Modal } from './Modal';
import { RecipeModal } from './RecipeModal';
import { SettingsModal } from './SettingsModal';
import { ShopScene } from './ShopScene';
import { StaffModal } from './StaffModal';
import { StockModal } from './StockModal';
import { Toasts, type Toast } from './Toasts';
import { Workstation } from './Workstation';

const TOAST_MS = 2_800;
const MAX_TOASTS = 2;
const TUTORIAL_KEY = 'milk-tea-game/tutorial-spicy-v1-seen';

const SOUND_FOR: Partial<Record<GameEvent['type'], Parameters<typeof playSound>[0]>> = {
  'new-order': 'order',
  served: 'coin',
  finished: 'coin',
  review: 'pop',
  clean: 'unlock',
  wrong: 'wrong',
  left: 'left',
  unlock: 'unlock',
  error: 'wrong',
};

const SOUND_FOR_ACTION: Partial<Record<GameAction['type'], Parameters<typeof playSound>[0]>> = {
  ADD_INGREDIENT: 'plop',
  ADD_CHILI: 'chili',
  CLEAN: 'scrub',
  UNDO: 'pop',
  DISCARD: 'trash',
};

interface Props {
  initialState: GameState;
  player: Player | null;
  muted: boolean;
  onToggleMute: () => void;
  onExit: () => void;
  onLogout: () => void;
  onReset: () => void;
}

export function GameScreen({ initialState, player, muted, onToggleMute, onExit, onLogout, onReset }: Props) {
  const [modal, setModal] = useState<ModalName | null>(null);
  const [userPaused, setUserPaused] = useState(false);
  const [showTutorial, setShowTutorial] = useState(() => !readFlag(TUTORIAL_KEY));
  const [toasts, setToasts] = useState<Toast[]>([]);

  const paused = userPaused || modal !== null || showTutorial;
  const [state, rawDispatch] = useGame(initialState, player?.uid ?? null, paused);

  const dispatch = useCallback(
    (action: GameAction) => {
      const sound = SOUND_FOR_ACTION[action.type];
      if (sound) playSound(sound);
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

  return (
    <div className="app game" data-theme={state.shop.theme}>
      <Hud state={state} paused={userPaused} onTogglePause={() => setUserPaused((p) => !p)} onOpen={setModal} />
      <ShopScene state={state} dispatch={dispatch} />
      {state.phase === 'prep' ? <CleaningPanel state={state} dispatch={dispatch} /> : <Workstation state={state} dispatch={dispatch} />}
      <Toasts toasts={toasts} />

      {userPaused && modal === null && (
        <button className="pause-overlay" onClick={() => setUserPaused(false)}>
          <span className="pause-title">Tạm dừng</span>
          <span className="btn primary big">▶ Chơi tiếp</span>
        </button>
      )}

      {modal === 'stock' && <StockModal state={state} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'recipes' && <RecipeModal state={state} onClose={() => setModal(null)} />}
      {modal === 'staff' && <StaffModal state={state} dispatch={dispatch} onClose={() => setModal(null)} />}
      {modal === 'settings' && (
        <SettingsModal
          player={player}
          muted={muted}
          onToggleMute={onToggleMute}
          onExit={onExit}
          onLogout={onLogout}
          onReset={onReset}
          onClose={() => setModal(null)}
        />
      )}

      {state.phase === 'summary' && state.lastSummary && modal === null && (
        <DaySummaryModal summary={state.lastSummary} onNext={() => dispatch({ type: 'NEXT_DAY' })} />
      )}

      {showTutorial && (
        <Modal
          title="Cách nấu mì cay"
          footer={
            <button className="btn primary wide big" onClick={closeTutorial}>
              🧹 Bắt đầu dọn quán!
            </button>
          }
        >
          <p className="modal-note">
            Chào mừng tới <b>{state.shop.name}</b>! Bạn có {formatVND(STARTING_MONEY)} vốn và mỗi nguyên liệu 1 gói. Việc đầu tiên: dọn dẹp quán cho sạch rồi mới mở cửa nhé!
          </p>
          <HowToPlay />
        </Modal>
      )}
    </div>
  );
}
