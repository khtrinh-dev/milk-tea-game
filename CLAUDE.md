# CLAUDE.md

Hướng dẫn cho Claude Code (và lập trình viên) khi làm việc trong repo này.

## Dự án

**Mì Cay Tycoon** – game giả lập quán mì cay 2D (dọn quán, nấu mì theo cấp cay 0–7, 10 bàn ăn tại chỗ, nhóm bạn,
mang về, đơn Grab), chạy trên trình duyệt và cài được lên iPhone dưới dạng
**PWA** (Safari → Chia sẻ → Thêm vào MH chính), không cần App Store. Toàn bộ giao diện và nội dung game bằng
**tiếng Việt**, tiền tệ là **VNĐ**. Giao diện tông đỏ · trắng · đen. Repo GitHub: `khtrinh-dev/my-cay-gem`,
game chạy tại https://khtrinh-dev.github.io/my-cay-gem/.

Tài liệu chi tiết:

- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) – luật chơi, kinh tế, thực đơn, mở khóa, nhân viên.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) – kiến trúc code, luồng dữ liệu, vòng lặp game.
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) – deploy GitHub Pages và cài lên iPhone.

## Lệnh

```bash
npm install          # cài dependency (Node 22+)
npm run dev          # dev server (có --host để mở từ iPhone cùng mạng Wi-Fi)
npm test             # chạy unit test (Vitest) cho logic game
npm run typecheck    # kiểm tra kiểu TypeScript
npm run build        # typecheck + build production vào dist/ (kèm service worker)
npm run preview      # chạy thử bản build
npm run icons        # sinh lại icon PNG từ public/favicon.svg (chỉ khi đổi icon)
```

Trước khi báo xong một thay đổi: chạy `npm test` và `npm run build`, cả hai phải sạch.

## Tech stack

- **Vite 8 + React 19 + TypeScript 7** (strict). Không dùng thư viện state – chỉ `useReducer`.
- **vite-plugin-pwa** (Workbox `generateSW`, `autoUpdate`) cho manifest + chơi offline.
- **Vitest** cho test logic. **sharp** chỉ dùng trong `scripts/gen-icons.mjs`.
- Font **Baloo 2** qua `@fontsource` (bundle sẵn, có subset tiếng Việt, chạy offline).
- Đồ họa: DOM + CSS + emoji + SVG (tô mì `BowlView.tsx`, khách hàng `CustomerFigure.tsx`). Không có canvas/game engine.
- **Bắt buộc đăng nhập Gmail** (tạm thời bỏ qua khi `firebaseConfig.apiKey` trống – xem `GUEST_ALLOWED` trong `App.tsx`);
  tiến trình lưu trong **Firestore** `saves/{uid}` (Firebase tải động trong
  `src/services/cloud.ts`), localStorage chỉ là bản sao offline. Rules ở `firestore.rules`. Cấu hình: `docs/DEPLOYMENT.md` mục 4.
- Âm thanh: tổng hợp bằng Web Audio (`src/hooks/sound.ts`), không có file âm thanh.

## Cấu trúc

```
src/
  game/              # LOGIC THUẦN – không import React, không đụng DOM
    types.ts         # mọi kiểu dữ liệu
    constants.ts     # hằng số cân bằng game (thời gian, ngưỡng, xác suất…)
    data/            # dữ liệu tĩnh: ingredients, menu (món + nước), customers, reactions, cleaning, staff, shop
    orders.ts        # sinh đơn, tính giá, chấm tô (độ cay → Reaction), tip
    state.ts         # GameState ban đầu + gameReducer (mọi action, kể cả TICK)
    rng.ts           # RNG có seed (seed lưu trong state)
    save.ts          # lưu/đọc localStorage
    money.ts         # format VNĐ
    *.test.ts        # unit test
  hooks/             # useGame (reducer + vòng lặp tick + autosave), sound
  services/          # Firebase: đăng nhập Google, save trên Firestore
  components/        # UI React (GameScreen, ShopScene, Workstation, BowlView, CustomerFigure, CleaningPanel…)
  styles/global.css  # toàn bộ CSS (biến màu ở :root)
```

## Quy ước bắt buộc

1. **Logic nằm trong `src/game/`, UI chỉ hiển thị và dispatch action.** Component không tự tính tiền,
   không tự sửa state. Thêm hành vi mới = thêm `GameAction` + xử lý trong `gameReducer` + test.
2. **Reducer phải thuần.** Không dùng `Math.random()`, `Date.now()` trong `src/game/` – dùng `createRng(state.rngSeed)`
   và ghi lại `rng.seed`. Thời gian chỉ đến từ `dt` của action `TICK`.
3. **Tiền là số nguyên VNĐ, thời gian là mili-giây.** Hiển thị qua `formatVND` / `formatShortVND`.
4. **Số cân bằng game để trong `constants.ts` hoặc `data/`**, không viết số "ma thuật" trong logic/UI.
5. **Thông báo cho người chơi đi qua `GameEvent`** (`emit()` trong `state.ts`). `GameScreen.tsx` biến event thành toast + âm thanh;
   `ShopScene.tsx` dùng event để dựng hoạt cảnh (khách ăn xong, xách túi ra về…).
6. **Đổi cấu trúc `GameState` không tương thích → tăng `SAVE_VERSION`** trong `constants.ts` (save cũ sẽ bị bỏ qua
   và người chơi bắt đầu lại). Thêm field mới có giá trị mặc định thì cân nhắc migrate trong `save.ts` thay vì tăng version.
7. **Mobile-first cho iPhone dọc** (~375–430px). Nút bấm tối thiểu ~40px, dùng `env(safe-area-inset-*)`,
   `touch-action: manipulation`. Kiểm tra layout ở 390×844 sau khi đổi UI.
8. Văn bản hiển thị viết **tiếng Việt có dấu**; tên biến/hàm bằng tiếng Anh; comment tiếng Việt.

## Công thức thường gặp

- **Thêm món mới**: thêm `dish(...)` vào `DISHES` trong `src/game/data/menu.ts` (`recipe` = số phần từng nguyên liệu,
  `unlockRevenue` = doanh thu tích lũy để mở khóa). Giá bán tự tính = giá vốn + `BOWL_PROFIT` (50k). Nếu cần nguyên
  liệu mới, thêm `IngredientId` trong `types.ts`, khai báo trong `data/ingredients.ts` (giá vốn/phần) và thêm cách vẽ
  miếng nguyên liệu trong `BowlView.tsx` (`Piece`); không có emoji đúng hình thì vẽ icon SVG trong `IngredientIcon.tsx`. Cập nhật bảng trong `docs/GAME_DESIGN.md`.
- **Thêm nước uống**: khai báo nguyên liệu `kind: 'drink'`, thêm vào `DRINKS` và `DRINK_ORDER_WEIGHTS`, vẽ lon/hộp trong `DrinkShape` (`BowlView.tsx`).
- **Thêm câu nhận xét / loại chỗ bẩn**: `data/reactions.ts` / `data/cleaning.ts`.
- **Thêm loại nhân viên**: thêm `StaffRole` + `STAFF_TYPES`, xử lý hành vi trong `tick()` của `state.ts`,
  thêm field vào `staff` của `createInitialState` và tăng `SAVE_VERSION`.
- **Chỉnh độ khó / nhịp game**: `constants.ts` (`SPAWN_*` nhịp khách, số bàn, thời gian ăn, tỉ lệ Grab/ăn tại chỗ,
  cấp cay…) và `spawnInterval` / `patienceFor` trong `state.ts`. Có test mô phỏng cả ngày trong `state.test.ts`
  để giữ nhịp "không ế, không dồn dập".

## Lưu ý kỹ thuật

- `vite.config.ts` đặt `base` = `/my-cay-gem/` (GitHub Pages). Deploy chỗ khác thì set `BASE_PATH`.
- iOS chỉ phát âm thanh sau lần chạm đầu tiên → `unlockAudio()` gắn vào `pointerdown`.
- Game tạm dừng khi mở modal, khi bấm ⏸️ và khi tab bị ẩn; `dt` mỗi tick bị giới hạn 250ms.
- Autosave: bản sao trên máy mỗi 2 giây, database mỗi 10 giây + ngay khi đổi ngày/giai đoạn, khi
  `visibilitychange`/`pagehide` (iOS có thể kill PWA bất kỳ lúc nào) và trước khi thoát/đăng xuất (`flush()`).
- Thêm field mới vào `GameState` mà không tăng `SAVE_VERSION` thì bổ sung giá trị mặc định trong `migrate()` (`save.ts`).
- `events` không được lưu vào save; `nextEventId` thì có, để toast không bị lặp sau khi tải lại.
- Deploy tự động bằng `.github/workflows/deploy.yml` khi push lên `main`.
