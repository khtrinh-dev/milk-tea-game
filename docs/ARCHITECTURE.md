# Kiến trúc – Trà Sữa Tycoon

## 1. Lựa chọn công nghệ

| Nhu cầu                                | Lựa chọn                                          | Lý do                                                                                                                          |
| --------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Chơi trên iPhone không qua App Store | **PWA** (web app + manifest + service worker) | Safari cho "Thêm vào MH chính", chạy toàn màn hình, chơi offline, cập nhật chỉ cần deploy lại.                     |
| UI 2D đơn giản, nhiều nút bấm     | **React 19 + DOM/CSS**                        | Game dạng bấm nút / thẻ đơn hợp với DOM hơn canvas: chữ tiếng Việt sắc nét, accessibility, layout responsive dễ. |
| Ngôn ngữ                              | **TypeScript (strict)**                       | Dữ liệu game (công thức, giá) nhiều – có kiểu giúp tránh sai sót.                                                   |
| Build                                   | **Vite 8** + **vite-plugin-pwa**        | Nhanh, sinh manifest + service worker Workbox tự động.                                                                       |
| State                                   | **`useReducer`** với reducer thuần        | Đủ cho một màn hình; reducer thuần dễ test, dễ lưu/đọc. Không cần Redux/Zustand.                                   |
| Test                                    | **Vitest**                                    | Chạy chung config Vite.                                                                                                        |
| Hình ảnh                              | **Emoji + SVG + CSS**                         | Không cần asset, nhẹ, emoji trên iOS rất đẹp.                                                                            |
| Âm thanh                               | **Web Audio** tổng hợp                      | Không cần file âm thanh, nhẹ.                                                                                               |
| Lưu game                               | **localStorage**                              | Dữ liệu nhỏ (vài KB), đồng bộ, có sẵn mọi nơi.                                                                       |
| Hosting                                 | **GitHub Pages** + GitHub Actions             | Miễn phí, HTTPS (bắt buộc cho service worker), deploy tự động khi push.                                                  |

## 2. Sơ đồ thư mục

```
├── CLAUDE.md                  # hướng dẫn cho Claude Code
├── docs/                      # tài liệu
├── index.html                 # meta iOS (apple-mobile-web-app-*, viewport-fit=cover)
├── vite.config.ts             # base path + cấu hình PWA + vitest
├── public/                    # favicon.svg, icon PNG (sinh bằng scripts/gen-icons.mjs)
├── scripts/gen-icons.mjs
├── .github/workflows/deploy.yml
└── src/
    ├── main.tsx               # mount React, đăng ký service worker, import font
    ├── App.tsx                # bố cục, modal, chuyển GameEvent → toast/âm thanh
    ├── game/                  # logic thuần (xem mục 3)
    ├── hooks/
    │   ├── useGame.ts         # useReducer + vòng lặp tick + autosave
    │   └── sound.ts           # hiệu ứng âm thanh Web Audio
    ├── components/
    │   ├── Hud.tsx            # tiền, giờ, sao, thanh doanh thu, nút menu
    │   ├── ShopScene.tsx      # khung cảnh quán + khách ở quầy
    │   ├── Workstation.tsx    # ly, thẻ công thức, đá/đường, nút nguyên liệu, giao món
    │   ├── CupView.tsx        # ly trà sữa SVG
    │   ├── StockModal.tsx     # nhập hàng
    │   ├── RecipeModal.tsx    # sổ công thức
    │   ├── StaffModal.tsx     # thuê / cho nghỉ nhân viên
    │   ├── DaySummaryModal.tsx
    │   ├── SettingsModal.tsx  # âm thanh, hướng dẫn, chơi lại
    │   ├── HelpContent.tsx    # nội dung hướng dẫn dùng chung
    │   ├── Modal.tsx, Toasts.tsx
    └── styles/global.css
```

## 3. Lớp logic (`src/game/`)

Không phụ thuộc React hay DOM → test được bằng Vitest thuần.

- **`types.ts`** – `GameState`, `Customer`, `Order`, `Cup`, `GameEvent`…
- **`data/`** – dữ liệu tĩnh (nguyên liệu, món, topping, nhân viên). Sửa cân bằng game chủ yếu ở đây.
- **`constants.ts`** – hằng số: độ dài ngày, số khách tối đa, tỉ lệ tip, xác suất đá/đường…
- **`orders.ts`** – `generateOrder`, `orderPrice`, `requiredRecipe`, `evaluateCup`, `computeTip`, `describeOrder`.
- **`state.ts`** – `createInitialState(seed)` và `gameReducer(state, action)`.
- **`rng.ts`** – mulberry32 có seed. Seed nằm trong state nên reducer cho cùng kết quả với cùng input.
- **`save.ts`** – `loadGame` / `saveGame` / `clearSave` (key `milk-tea-game/save`, kiểm tra `SAVE_VERSION`).

### GameState (rút gọn)

```ts
{
  money, totalRevenue, reputation,        // kinh tế
  day, dayTimeMs, phase,                  // 'open' | 'closing' | 'summary'
  inventory: Record<IngredientId, number>,
  customers: Customer[], selectedCustomerId,
  cup: { layers: IngredientId[], ice, sugar },
  staff: { barista, waiter, stocker }, baristas: { customerId, progressMs }[],
  dayStats, lastSummary,
  events: GameEvent[], nextEventId,       // hàng đợi thông báo cho UI
  rngSeed, nextId, nextCustomerInMs, ...
}
```

### Actions

| Action                       | Tác dụng                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `TICK { dt }`              | Chạy thời gian: giờ trong ngày, khách tới, giảm kiên nhẫn, nhân viên làm việc, đóng cửa, tổng kết. |
| `SELECT_CUSTOMER { id }`   | Chọn đơn để pha.                                                                                                |
| `ADD_INGREDIENT { id }`    | Trừ 1 phần trong kho, thêm 1 lớp vào ly.                                                                        |
| `UNDO` / `DISCARD`       | Bỏ lớp cuối (trả kho) / đổ cả ly (mất).                                                                      |
| `SET_ICE` / `SET_SUGAR`  | Chọn mức đá / đường cho ly.                                                                                   |
| `SERVE`                    | Chấm ly với đơn đang chọn, trả tiền/tip/danh tiếng.                                                         |
| `BUY_PACK { id, packs }`   | Nhập hàng.                                                                                                         |
| `HIRE` / `FIRE { role }` | Thuê / cho nghỉ nhân viên.                                                                                       |
| `NEXT_DAY`                 | Sang ngày mới từ màn tổng kết.                                                                                 |
| `RESET { seed }`           | Chơi lại từ đầu.                                                                                                |

Reducer sao chép nông các phần có thể đổi (`draft()`), mutate bản sao rồi trả về – state cũ không bao giờ bị sửa
(có test kiểm tra).

## 4. Vòng lặp game

```
useGame(paused)
 ├─ setInterval 100ms ──► dispatch(TICK, dt = min(250, now − last))   (bỏ qua khi tab ẩn / paused)
 ├─ setInterval 2s ─────► saveGame(state)
 └─ visibilitychange / pagehide ─► saveGame(state)
```

- `paused` = người chơi bấm ⏸️ **hoặc** đang mở modal **hoặc** đang xem hướng dẫn.
- Giới hạn `dt` 250ms để khi iOS treo tab rồi mở lại, game không "nhảy" cả phút.

## 5. Thông báo (GameEvent)

Reducer không thể gọi UI, nên mọi thông báo được đẩy vào `state.events` (giữ tối đa 30 event gần nhất, mỗi event
có `id` tăng dần). `App.tsx` nhớ `id` cuối đã xử lý; với mỗi event mới → tạo toast (tự ẩn sau 3,2s, tối đa 3) và
phát âm thanh tương ứng (`order`, `coin`, `wrong`, `left`, `unlock`). Âm "pop" khi bấm nguyên liệu phát trực tiếp
trong `dispatch` bọc ở `App.tsx`.

## 6. PWA & iPhone

- `index.html`: `apple-mobile-web-app-capable`, `status-bar-style=black-translucent`, `apple-touch-icon`,
  `viewport-fit=cover` + `user-scalable=no`.
- CSS dùng `100dvh`, `env(safe-area-inset-top/bottom)`, `touch-action: manipulation`, `overscroll-behavior: none`,
  tắt chọn chữ trong vùng chơi.
- Service worker (Workbox) precache toàn bộ JS/CSS/font/icon → chơi offline sau lần mở đầu tiên.
  `registerType: 'autoUpdate'`: có bản mới thì service worker mới kích hoạt và trang tự tải lại. Vì iOS thường chỉ
  đánh thức PWA từ nền (không tải lại trang), `main.tsx` gọi `registration.update()` mỗi khi app hiện lại.
- Âm thanh: `AudioContext` được tạo/resume ở `pointerdown` đầu tiên (chính sách autoplay của iOS).

## 7. Kiểm thử

- `src/game/orders.test.ts` – giá, công thức, chấm ly, sinh đơn hợp lệ, tip, mô tả đơn.
- `src/game/state.test.ts` – khởi tạo, tính bất biến, khách tới, giao đúng/sai, hoàn tác, nhập hàng, khách bỏ về,
  kết thúc ngày + trừ lương, khóa/mở thuê nhân viên, nhân viên pha chế, thông báo mở khóa món.
- UI kiểm tra thủ công ở khung 390×844 (iPhone 14/15) – xem checklist trong `docs/DEPLOYMENT.md`.
