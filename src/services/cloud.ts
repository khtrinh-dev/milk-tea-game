// Đăng nhập Google + lưu game lên Firestore.
// Firebase SDK khá nặng nên chỉ được tải (dynamic import) khi bật đăng nhập,
// để màn hình đầu game mở nhanh và chế độ khách không phải tải gì thêm.
import type { FirebaseApp } from 'firebase/app';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { parseSave, serializeSave, type SaveFile } from '../game/save';
import type { GameState } from '../game/types';
import { firebaseConfig, isCloudEnabled } from './firebaseConfig';

export interface Player {
  uid: string;
  name: string;
  email: string;
  photoURL: string | null;
}

interface Firebase {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  authLib: typeof import('firebase/auth');
  dbLib: typeof import('firebase/firestore');
}

const SAVES = 'saves';
/** Không chờ mây quá lâu khi mạng yếu – dùng save trên máy. */
const CLOUD_TIMEOUT_MS = 10_000;

let firebasePromise: Promise<Firebase> | null = null;

/**
 * Trên Firebase Hosting (*.web.app / *.firebaseapp.com) dùng chính tên miền của game làm authDomain,
 * để signInWithRedirect chạy cùng origin – cách duy nhất đăng nhập ổn định trong PWA trên iPhone
 * (Safari chặn bộ nhớ bên thứ ba, còn popup trong app ở màn hình chính thường bị treo).
 */
function resolveAuthDomain(): string {
  const host = window.location.hostname;
  if (host.endsWith('.web.app') || host.endsWith('.firebaseapp.com')) return host;
  return firebaseConfig.authDomain;
}

function loadFirebase(): Promise<Firebase> {
  firebasePromise ??= (async () => {
    const [{ initializeApp }, authLib, dbLib] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);
    const app = initializeApp({ ...firebaseConfig, authDomain: resolveAuthDomain() });
    const auth = authLib.getAuth(app);
    auth.languageCode = 'vi';
    let db: Firestore;
    try {
      // Cache IndexedDB: ghi khi mất mạng sẽ được xếp hàng và tự đồng bộ khi có mạng lại.
      db = dbLib.initializeFirestore(app, { localCache: dbLib.persistentLocalCache() });
    } catch {
      db = dbLib.getFirestore(app);
    }
    return { app, auth, db, authLib, dbLib };
  })();
  return firebasePromise;
}

function toPlayer(user: User): Player {
  return {
    uid: user.uid,
    name: user.displayName ?? user.email?.split('@')[0] ?? 'Chủ quán',
    email: user.email ?? '',
    photoURL: user.photoURL,
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([promise, new Promise<T>((resolve) => window.setTimeout(() => resolve(fallback), ms))]);
}

/**
 * Theo dõi trạng thái đăng nhập. Gọi `onChange(null)` ngay nếu chưa cấu hình Firebase.
 * Trả về hàm hủy theo dõi.
 */
export function watchPlayer(onChange: (player: Player | null) => void, onError: (message: string) => void): () => void {
  if (!isCloudEnabled) {
    onChange(null);
    return () => {};
  }
  let unsubscribe = () => {};
  let cancelled = false;
  loadFirebase()
    .then(({ auth, authLib }) => {
      if (cancelled) return;
      // Hoàn tất lượt đăng nhập bằng redirect (nếu vừa quay lại từ trang Google).
      authLib.getRedirectResult(auth).catch((e: unknown) => onError(authErrorMessage(e)));
      unsubscribe = authLib.onAuthStateChanged(auth, (user) => onChange(user ? toPlayer(user) : null));
    })
    .catch(() => {
      onError('Không tải được dịch vụ đăng nhập. Kiểm tra mạng rồi thử lại.');
      onChange(null);
    });
  return () => {
    cancelled = true;
    unsubscribe();
  };
}

export async function signInWithGoogle(): Promise<void> {
  const { auth, authLib } = await loadFirebase();
  const provider = new authLib.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  // Redirect chỉ an toàn khi authDomain trùng tên miền game; nơi khác (localhost, GitHub Pages) dùng popup.
  if (resolveAuthDomain() === window.location.hostname) {
    await authLib.signInWithRedirect(auth, provider);
  } else {
    await authLib.signInWithPopup(auth, provider);
  }
}

export async function signOutPlayer(): Promise<void> {
  const { auth, authLib } = await loadFirebase();
  await authLib.signOut(auth);
}

/**
 * Đọc save của người chơi trong Firestore.
 * - `{ ok: true, file: null }`: tài khoản chưa có quán (lần đầu chơi).
 * - `{ ok: false }`: mất mạng / quá thời gian chờ – KHÔNG được coi là "chưa có quán", tránh tạo quán mới đè lên dữ liệu thật.
 */
export type CloudLoad = { ok: true; file: SaveFile | null } | { ok: false };

export async function loadCloudSave(uid: string): Promise<CloudLoad> {
  try {
    const { db, dbLib } = await loadFirebase();
    // Đọc thẳng từ máy chủ (không lấy cache offline) để chắc chắn là dữ liệu mới nhất.
    const read = dbLib.getDocFromServer(dbLib.doc(db, SAVES, uid)).then((snap): CloudLoad => {
      const data = snap.data() as { save?: string } | undefined;
      return { ok: true, file: parseSave(data?.save) };
    });
    return await withTimeout<CloudLoad>(read, CLOUD_TIMEOUT_MS, { ok: false });
  } catch {
    return { ok: false };
  }
}

/**
 * Ghi tiến trình vào Firestore (`saves/{uid}`): bản save đầy đủ + vài cột dễ xem/tra cứu trong console.
 * Promise chỉ xong khi máy chủ xác nhận; khi offline Firestore tự xếp hàng và gửi lại lúc có mạng.
 */
export async function writeCloudSave(player: Player, state: GameState, savedAt: number): Promise<void> {
  const { db, dbLib } = await loadFirebase();
  await dbLib.setDoc(dbLib.doc(db, SAVES, player.uid), {
    save: serializeSave(state, savedAt),
    savedAt,
    playerName: player.name,
    email: player.email,
    shopName: state.shop.name,
    day: state.day,
    money: state.money,
    totalRevenue: state.totalRevenue,
    reputation: Math.round(state.reputation),
    updatedAt: dbLib.serverTimestamp(),
  });
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return 'Bạn đã đóng cửa sổ đăng nhập.';
  if (code === 'auth/popup-blocked') return 'Trình duyệt chặn cửa sổ đăng nhập. Hãy cho phép popup rồi thử lại.';
  if (code === 'auth/network-request-failed') return 'Mất kết nối mạng. Kiểm tra mạng rồi thử lại.';
  if (code === 'auth/unauthorized-domain') return 'Tên miền này chưa được phép đăng nhập (thêm vào Firebase → Authentication → Settings).';
  return 'Đăng nhập không thành công. Thử lại nhé!';
}
