# Deploy & cài lên iPhone

## 1. Deploy lên GitHub Pages (tự động)

Repo đã có workflow `.github/workflows/deploy.yml`: mỗi lần push lên `main` sẽ chạy `npm ci → npm test → npm run build`
rồi đưa thư mục `dist/` lên GitHub Pages.

**Bật lần đầu (chỉ làm một lần):**

1. Vào repo trên GitHub → **Settings → Pages**.
2. Mục **Build and deployment → Source**, chọn **GitHub Actions**.
3. Push code lên `main` (hoặc vào tab **Actions → Deploy to GitHub Pages → Run workflow**).
4. Khi workflow xanh, game có tại: **https://khtrinh-dev.github.io/my-cay-gem/**

> `base` trong `vite.config.ts` mặc định là `/my-cay-gem/` (tên repo GitHub). Workflow tự đặt `BASE_PATH` theo tên repo, nên đổi
> tên repo vẫn chạy. Nếu deploy ở tên miền riêng / thư mục gốc, build với `BASE_PATH=/ npm run build`.

### Deploy chỗ khác

`dist/` là web tĩnh, có thể đưa lên Netlify, Vercel, Cloudflare Pages… (cần **HTTPS** để service worker hoạt động):

```bash
BASE_PATH=/ npm run build   # rồi upload thư mục dist/
```

## 2. Cài lên iPhone (không cần App Store)

1. Mở **Safari** trên iPhone, vào https://khtrinh-dev.github.io/my-cay-gem/
2. Bấm nút **Chia sẻ** (ô vuông có mũi tên ↑).
3. Chọn **Thêm vào MH chính** (Add to Home Screen) → **Thêm**.
4. Mở game từ biểu tượng 🍜 **Mì Cay** – chạy toàn màn hình như app thật, chơi được cả khi offline.

Ghi chú:

- Tiến trình lưu trong database theo tài khoản Gmail (mục 4); trên máy chỉ giữ bản sao để chơi khi mất mạng. Xóa app
  hay đổi máy, đăng nhập lại là chơi tiếp.
- Có bản mới: mỗi lần mở app (kể cả khi app được đánh thức từ nền) mà có mạng, service worker kiểm tra bản mới,
  tải về rồi tự tải lại game (tiến trình đã được autosave nên không mất). GitHub Pages cache file khoảng 10 phút,
  nên bản vừa deploy có thể cần vài phút mới tới máy.
- Nếu không nghe âm thanh: tắt chế độ im lặng của iPhone và kiểm tra ⚙️ Cài đặt → Âm thanh.

## 3. Chơi thử trên iPhone khi đang phát triển

```bash
npm run dev    # Vite chạy với --host, in ra địa chỉ dạng http://192.168.x.x:5173/my-cay-gem/
```

iPhone và máy tính cùng mạng Wi-Fi → mở địa chỉ đó bằng Safari. (Service worker chỉ chạy trên HTTPS/localhost
nên chế độ offline chỉ kiểm tra được trên bản deploy.)

> Dùng WSL2: địa chỉ in ra là IP nội bộ của WSL, iPhone không vào được trực tiếp. Hãy dùng
> `npm run build && npm run preview` rồi port-forward từ Windows (`netsh interface portproxy …`) hoặc test bằng bản deploy.

## 4. Cấu hình đăng nhập Gmail + database (bắt buộc)

Game **bắt buộc đăng nhập Gmail** và lưu tiến trình vào **Firestore** khi đã cấu hình Firebase.

> **Tạm thời** (đến khi điền config): `src/services/firebaseConfig.ts` còn trống `apiKey` nên game cho chơi ngay không
> cần đăng nhập, tiến trình chỉ lưu trên máy (`GUEST_ALLOWED` trong `src/App.tsx`). Điền config xong là tự bắt buộc
> đăng nhập lại, không cần sửa code.

Cấu hình một lần:

1. Tạo project tại [Firebase Console](https://console.firebase.google.com) → **Add app → Web** → copy cấu hình
   (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) vào `firebaseConfig.ts`.
   Các giá trị này công khai, commit lên repo được; dữ liệu được bảo vệ bằng Firestore rules.
2. **Authentication → Sign-in method → Google → Enable.**
3. **Authentication → Settings → Authorized domains**: thêm `localhost` (dev) và `khtrinh-dev.github.io`.
   Thiếu bước này sẽ báo lỗi `auth/unauthorized-domain`.
4. **Firestore Database → Create database** (chế độ production), rồi dán nội dung file `firestore.rules` của repo vào
   tab **Rules** (hoặc `npx firebase-tools deploy --only firestore:rules`): mỗi người chỉ đọc/ghi `saves/{uid}` của mình.
5. Commit + push → workflow deploy lại.

Dữ liệu người chơi xem ở **Firestore → saves**: mỗi document là một tài khoản (uid) với tên, email, tên quán, ngày,
tiền, doanh thu, danh tiếng và bản save đầy đủ.

> Đăng nhập trên GitHub Pages dùng **popup**. App mở từ màn hình chính iPhone (PWA) đôi khi chặn popup; cách ổn định
> nhất là host thêm trên **Firebase Hosting** (`*.web.app`) – khi đó code tự chuyển sang **redirect** cùng tên miền:
> `BASE_PATH=/ npm run build && npx firebase-tools deploy --only hosting` (cấu hình sẵn trong `firebase.json`).

## 5. Checklist trước khi release

- [ ] `npm test` và `npm run build` sạch.
- [ ] Mở ở khung 390×844 (DevTools → iPhone 14): không có thanh cuộn ngang, nút "Giao món" không bị che.
- [ ] Màn hình đầu chỉ có nút đăng nhập Gmail; đăng nhập xong vào quán được, dữ liệu hiện trong Firestore → saves.
- [ ] Đầu ngày: kéo chổi quét hết chỗ bẩn mới bấm được "Mở cửa đón khách".
- [ ] Chơi hết một ngày: khách vào quán + đơn Grab, ăn tại chỗ (ngồi bàn, ăn xong nhận xét), mang về (đánh giá sau),
      giao sai món (bỏ tô, trừ tiền), lệch độ cay (mặt đỏ / mặt khinh), khách bỏ về, màn tổng kết hiện đúng.
- [ ] Nhập hàng, hết nguyên liệu → nút "Nhập …" ở quầy hoạt động.
- [ ] Tải lại trang / đăng nhập ở máy khác: tiến trình còn nguyên.
- [ ] Bỏ dư nguyên liệu → nút "−" bớt được; tab ⭐ Đánh giá hiện nhận xét; đổi tên quán trong ⚙️ Cài đặt.
- [ ] Trên iPhone: "Thêm vào MH chính" → mở toàn màn hình, không bị tai thỏ/thanh home che nội dung.
