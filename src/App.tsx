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

const MUTED_KEY = 'my-cay-gem/muted';
/** Không chờ Firebase quá lâu ở màn hình đầu (mạng yếu) – hiện nút đăng nhập luôn. */
const AUTH_WAIT_MS = 5_000;
/**
 * Bắt buộc đăng nhập Google để chơi (tiến trình lưu trong database Firestore) – khi đã cấu hình Firebase.
 * TẠM THỜI: chưa cấu hình Firebase thì cho chơi không đăng nhập (chỉ lưu trên máy), kể cả bản deploy.
 * Điền firebaseConfig là tự bắt buộc đăng nhập lại. Muốn chặn hẳn khi thiếu config thì đổi thành:
 *   const GUEST_ALLOWED = !isCloudEnabled && import.meta.env.DEV;
 */
const GUEST_ALLOWED = !isCloudEnabled;

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

  // Bị đăng xuất (hết phiên, đăng xuất ở tab khác…) thì quay về màn hình đầu để đăng nhập lại.
  useEffect(() => {
    if (isCloudEnabled && authReady && !player && screen.kind !== 'title') setScreen({ kind: 'title' });
  }, [player, authReady, screen.kind]);

  /**
   * Vào quán: lấy tiến trình trong database (so với bản sao trên máy, lấy bản mới hơn); chưa có thì sang màn tạo quán.
   * Không đọc được database mà máy cũng không có bản sao → báo lỗi, KHÔNG tạo quán mới (tránh ghi đè dữ liệu thật).
   */
  const enterShop = useCallback(async () => {
    if (!uid && !GUEST_ALLOWED) return;
    setAuthError(null);
    setScreen({ kind: 'loading' });
    let file = loadGame(uid);
    if (uid) {
      const cloud = await loadCloudSave(uid);
      if (cloud.ok) {
        // Lần đầu đăng nhập: mang tiến trình đã chơi thử (không đăng nhập) trên máy này sang tài khoản.
        file = newerSave(file, cloud.file) ?? loadGame(null);
      } else if (!file) {
        setAuthError('Không tải được dữ liệu quán từ máy chủ. Kiểm tra mạng rồi thử lại nhé!');
        setScreen({ kind: 'title' });
        return;
      }
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
          guestAllowed={GUEST_ALLOWED}
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
