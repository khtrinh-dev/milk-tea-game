import { useCallback, useEffect, useState } from 'react';
import { CreateShopScreen } from './components/CreateShopScreen';
import { GameScreen } from './components/GameScreen';
import { TitleScreen } from './components/TitleScreen';
import { clearSave, loadGame, newerSave } from './game/save';
import { createInitialState } from './game/state';
import type { GameState, ShopInfo } from './game/types';
import { setMuted, unlockAudio } from './hooks/sound';
import { authErrorMessage, loadCloudSave, signInWithGoogle, signOutPlayer, watchPlayer, type Player } from './services/cloud';
import { isCloudEnabled } from './services/firebaseConfig';
import { readFlag, writeFlag } from './storage';

const MUTED_KEY = 'milk-tea-game/muted';
/** Không chờ Firebase quá lâu ở màn hình đầu (mạng yếu) – cho chơi luôn. */
const AUTH_WAIT_MS = 5_000;

type Screen =
  | { kind: 'title' }
  | { kind: 'loading' }
  | { kind: 'create' }
  | { kind: 'play'; state: GameState; session: number };

export default function App() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [authReady, setAuthReady] = useState(!isCloudEnabled);
  const [authError, setAuthError] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: 'title' });
  const [muted, setMutedState] = useState(() => readFlag(MUTED_KEY));
  const uid = player?.uid ?? null;

  useEffect(() => setMuted(muted), [muted]);

  // iOS yêu cầu một thao tác chạm trước khi phát âm thanh.
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio);
    return () => window.removeEventListener('pointerdown', unlockAudio);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setAuthReady(true), AUTH_WAIT_MS);
    const stop = watchPlayer(
      (p) => {
        setPlayer(p);
        setAuthReady(true);
      },
      setAuthError,
    );
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, []);

  /** Vào quán: lấy bản lưu mới nhất (máy / mây); chưa có thì sang màn tạo quán. */
  const enterShop = useCallback(async () => {
    setScreen({ kind: 'loading' });
    let file = loadGame(uid);
    if (uid) {
      file = newerSave(file, await loadCloudSave(uid));
      // Lần đầu đăng nhập: mang tiến trình đã chơi ở chế độ khách sang tài khoản.
      file ??= loadGame(null);
    }
    setScreen(file ? { kind: 'play', state: file.state, session: Date.now() } : { kind: 'create' });
  }, [uid]);

  const createShop = (shop: ShopInfo) => {
    setScreen({ kind: 'play', state: createInitialState(Date.now(), shop), session: Date.now() });
  };

  const login = async () => {
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      setAuthError(authErrorMessage(e));
    }
  };

  const logout = async () => {
    setScreen({ kind: 'title' });
    try {
      await signOutPlayer();
    } catch {
      // bỏ qua – lần mở sau vẫn có thể đăng xuất lại
    }
  };

  const toggleMute = () => {
    writeFlag(MUTED_KEY, !muted);
    setMutedState(!muted);
  };

  // "Chơi lại từ đầu": rời màn chơi (GameScreen tự lưu khi đóng) rồi mới xóa save trên máy.
  // Save trên mây sẽ bị ghi đè khi quán mới được tạo.
  const [resetting, setResetting] = useState(false);
  useEffect(() => {
    if (!resetting || screen.kind === 'play') return;
    clearSave(uid);
    setResetting(false);
  }, [resetting, screen.kind, uid]);

  const reset = () => {
    setResetting(true);
    setScreen({ kind: 'create' });
  };

  switch (screen.kind) {
    case 'title':
    case 'loading':
      return (
        <TitleScreen
          player={player}
          cloudEnabled={isCloudEnabled}
          authReady={authReady}
          loading={screen.kind === 'loading'}
          error={authError}
          onLogin={login}
          onLogout={logout}
          onPlay={enterShop}
        />
      );
    case 'create':
      return <CreateShopScreen ownerName={player?.name ?? null} onCreate={createShop} />;
    case 'play':
      return (
        <GameScreen
          key={screen.session}
          initialState={screen.state}
          player={player}
          muted={muted}
          onToggleMute={toggleMute}
          onExit={() => setScreen({ kind: 'title' })}
          onLogout={logout}
          onReset={reset}
        />
      );
  }
}
