# Kiến trúc – Mì Cay Tycoon

## 1. Lựa chọn công nghệ

| Nhu cầu | Lựa chọn | Lý do |
|---|---|---|
| Chơi trên iPhone không qua App Store | **PWA** (web app + manifest + service worker) | Safari cho "Thêm vào MH chính", chạy toàn màn hình, chơi offline, cập nhật chỉ cần deploy lại. |
| UI 2D đơn giản, nhiều nút bấm | **React 19 + DOM/CSS** | Game dạng bấm nút / thẻ đơn hợp với DOM hơn canvas: chữ tiếng Việt sắc nét, layout responsive dễ. |
| Ngôn ngữ | **TypeScript (strict)** | Dữ liệu game (công thức, giá) nhiều – có kiểu giúp tránh sai sót. |
| Build | **Vite 8** + **vite-plugin-pwa** | Nhanh, sinh manifest + service worker Workbox tự động. |
| State | **`useReducer`** với reducer thuần | Đủ cho một màn chơi; reducer thuần dễ test, dễ lưu/đọc. Không cần Redux/Zustand. |
| Test | **Vitest** | Chạy chung config Vite. |
| Hình ảnh | **SVG + CSS + emoji** | Tô mì, hũ ớt, khách hàng, mặt tiền quán đều vẽ bằng SVG – không cần asset. |
| Âm thanh | **Web Audio** tổng hợp | Không cần file âm thanh, nhẹ. |
| Lưu game | **Firestore** (database chính) + **localStorage** (bản sao offline) | Dữ liệu nhỏ (vài KB). Database giúp đổi máy / xóa app không mất tiến trình. |
| Đăng nhập | **Firebase Authentication** (Google) – **bắt buộc**, SDK tải động | Mỗi người chơi một quán gắn với tài khoản Gmail. |
| Hosting | **GitHub Pages** + GitHub Actions | Miễn phí, HTTPS (bắt buộc cho service worker), deploy tự động khi push. |

## 2. Sơ đồ thư mục

```
├── CLAUDE.md                  # hướng dẫn cho Claude Code
├── docs/                      # tài liệu
├── index.html                 # meta iOS (apple-mobile-web-app-*, viewport-fit=cover)
├── vite.config.ts             # base path + cấu hình PWA + vitest
├── firestore.rules            # mỗi người chỉ đọc/ghi saves/{uid} của mình
├── firebase.json              # cấu hình Firebase CLI (rules + Hosting tùy chọn)
├── public/                    # favicon.svg (tô mì cay), icon PNG (sinh bằng scripts/gen-icons.mjs)
├── scripts/gen-icons.mjs
├── .github/workflows/deploy.yml
└── src/
    ├── main.tsx               # mount React, đăng ký service worker, import font
    ├── App.tsx                # điều hướng màn hình: tiêu đề (bắt buộc đăng nhập) → tạo quán → chơi; tải save từ database
    ├── storage.ts             # cờ cài đặt nhỏ trong localStorage (âm thanh, đã xem hướng dẫn)
    ├── game/                  # logic thuần (xem mục 3)
    ├── services/
    │   ├── firebaseConfig.ts  # cấu hình Firebase (trống apiKey = chưa cấu hình → bản build không cho chơi)
    │   └── cloud.ts           # đăng nhập Google, đọc/ghi save trên Firestore
    ├── hooks/
    │   ├── useGame.ts         # useReducer + vòng lặp tick + autosave (máy + database) + trạng thái đồng bộ
    │   └── sound.ts           # hiệu ứng âm thanh Web Audio
    ├── components/
    │   ├── TitleScreen.tsx    # linh vật, đăng nhập / chơi ngay
    │   ├── CreateShopScreen.tsx + Storefront.tsx   # đặt tên quán, chọn phong cách
    │   ├── GameScreen.tsx     # màn chơi: HUD + cảnh quán + quầy nấu/dọn quán + modal; GameEvent → toast/âm thanh
    │   ├── Hud.tsx            # tiền, sao, thanh doanh thu, nút menu
    │   ├── ShopScene.tsx      # phòng ăn 10 bàn, quầy, cửa, khách đi lại, chỗ bẩn lúc dọn quán
    │   ├── CustomerFigure.tsx # nhân vật khách SVG (11 kiểu) + biểu cảm (vui, cay đỏ mặt, khinh, buồn…)
    │   ├── CleaningPanel.tsx  # tiến độ dọn quán + nút mở cửa (thay quầy nấu lúc 'prep')
    │   ├── Broom.tsx          # cây chổi kéo quét chỗ bẩn (pointer events) + hiệu ứng bụi
    │   ├── ReviewsModal.tsx   # tab Đánh giá: lịch sử nhận xét của khách + chủ quán phản hồi
    │   ├── Workstation.tsx    # tô mì, thẻ đơn, hũ ớt, 4 cụm nút nguyên liệu (có nút bớt), giao món
    │   ├── BowlView.tsx       # tô mì cay SVG + lon/hộp nước cạnh tô (DrinkArt)
    │   ├── IngredientIcon.tsx # hình nguyên liệu: SVG kim chi, cải tím, lon nước; còn lại emoji
    │   ├── StockModal.tsx, RecipeModal.tsx, StaffModal.tsx, DaySummaryModal.tsx
    │   ├── SettingsModal.tsx  # âm thanh, đổi tên quán, tài khoản + trạng thái lưu, hướng dẫn, chơi lại
    │   └── HelpContent.tsx, Modal.tsx, Toasts.tsx
    └── styles/global.css      # toàn bộ CSS; màu ở :root và theo [data-theme] (fire / ink / snow)
```

## 3. Lớp logic (`src/game/`)

Không phụ thuộc React hay DOM → test được bằng Vitest thuần.

- **`types.ts`** – `GameState`, `Customer` (một lượt khách: lẻ hoặc nhóm bạn) gồm các `Guest` (mỗi người 1 `Order`),
  `Bowl`, `Diner`, `PendingReview`, `ReviewEntry`, `DirtSpot`, `GameEvent`…
- **`data/`** – dữ liệu tĩnh: `ingredients.ts` (giá vốn từng phần), `menu.ts` (món, nước; giá bán tự tính = vốn +
  `BOWL_PROFIT`), `customers.ts` (kiểu khách), `reactions.ts` (câu nhận xét), `cleaning.ts` (loại chỗ bẩn),
  `staff.ts`, `shop.ts` (phong cách quán, gợi ý tên). `reactions.ts` còn có câu khách trả tô (`COMPLAINTS`), nhận xét
  của nhóm bạn, câu gợi ý cho chủ quán phản hồi và câu khách đáp lại.
- **`constants.ts`** – hằng số cân bằng: độ dài ngày, nhịp khách, số bàn, thời gian ăn, tỉ lệ Grab/ăn tại chỗ,
  cấp cay, tỉ lệ trả tiền khi lệch cay, danh tiếng…
- **`orders.ts`** – `rollService`, `generateOrder`, `orderPrice`, `requiredRecipe`, `evaluateBowl` (→ `Reaction`),
  `payRate`, `bowlCost`, `computeTip`, `describeOrder`, `serviceLabel`, `openGuests` (người còn chờ tô, chưa có đầu
  bếp nhận), `partyTitle`.
- **`state.ts`** – `createInitialState(seed, shop)` và `gameReducer(state, action)`; `spawnInterval` (nhịp khách).
- **`rng.ts`** – mulberry32 có seed. Seed nằm trong state nên reducer cho cùng kết quả với cùng input.
- **`save.ts`** – `parseSave` / `serializeSave` / `loadGame` / `saveGame` / `clearSave` / `newerSave`
  (key `my-cay-gem/save[/uid]`, vẫn đọc key cũ `milk-tea-game/...` của bản trước khi đổi tên repo; kiểm tra
  `SAVE_VERSION`; save v1/v2 bị bỏ qua, save v3 được chuyển lên v4: giữ tiền/kho/nhân viên/đánh giá, bỏ khách đang
  dở theo cấu trúc cũ, ngày đang mở thì quay về lúc vừa dọn quán xong).

### GameState (rút gọn)

```ts
{
  shop: { name, theme },
  money, totalRevenue, reputation,             // kinh tế
  day, dayTimeMs, phase,                       // 'prep' | 'open' | 'closing' | 'summary'
  dirt: DirtSpot[],                            // chỗ bẩn còn phải dọn (phase 'prep')
  inventory: Record<IngredientId, number>,
  customers: Customer[],                       // lượt khách ở quầy: { guests: Guest[], patienceMs, waitedMs }
  selectedCustomerId, selectedGuestId,         // lượt khách + người đang được nấu tô cho
  bowl: { steps: (IngredientId | 'chili')[] }, // tô đang nấu
  tables: (Diner | null)[],                    // 10 bàn (nhóm bạn ngồi nhiều bàn, chung partyId)
  tableQueue: Diner[][],                       // các lượt khách bưng tô chờ bàn
  reviews: PendingReview[],                    // khách mang về / Grab sắp gửi đánh giá
  reviewLog: ReviewEntry[],                    // lịch sử đánh giá (60 lượt gần nhất) cho tab Đánh giá
  staff: { cook, waiter, stocker }, cooks: { guestId, progressMs }[],
  dayStats, lastSummary,
  events: GameEvent[], nextEventId,            // hàng đợi thông báo cho UI
  rngSeed, nextId, nextCustomerInMs, ...
}
```

### Actions

| Action | Tác dụng |
|---|---|
| `TICK { dt }` | Chạy thời gian (bỏ qua khi `prep`/`summary`): giờ trong ngày, khách tới theo nhịp, giảm kiên nhẫn, đầu bếp, nhân viên kho, khách ăn ở bàn, đánh giá mang về, đóng cửa, tổng kết. |
| `CLEAN { id }` | Chạm 1 lần vào chỗ bẩn; hết "máu" thì biến mất. Sạch hết → event `clean`. |
| `OPEN_SHOP` | Mở cửa khi đã dọn sạch (`prep` → `open`). |
| `SELECT_CUSTOMER { id }` | Chọn lượt khách để nấu (tự chọn người đầu tiên còn chờ tô). |
| `SELECT_GUEST { id }` | Chọn một bạn trong nhóm để nấu tô cho bạn đó. |
| `ADD_INGREDIENT { id }` | Trừ 1 phần trong kho, bỏ vào tô (nước thì đặt lên khay). |
| `ADD_CHILI` | Thêm 1 shot ớt (tối đa 7). |
| `REMOVE_INGREDIENT { id }` / `REMOVE_CHILI` | Bớt 1 phần nguyên liệu đã bỏ (trả kho) / bớt 1 shot ớt. |
| `RENAME_SHOP { name }` | Đổi tên quán (bất cứ lúc nào). |
| `UNDO` / `DISCARD` | Bỏ thao tác cuối (trả kho) / đổ cả tô (mất nguyên liệu, nước được cất lại). |
| `SERVE` | Chấm tô cho người đang chọn (tô khớp y đơn một bạn khác trong nhóm thì giao cho bạn đó). Sai món, hoặc khách ăn tại chỗ bị sai độ cay → `rejectBowl()`: trả tô, phạt nửa giá vốn, khách vẫn chờ. Còn lại → `deliver()` (nhóm đủ tô thì vào bàn / chờ bàn; mang về trả tiền ngay). |
| `REPLY_REVIEW { id, text }` | Chủ quán phản hồi một đánh giá (1 lần); khách đáp lại; phản hồi lời chê +1 danh tiếng. |
| `BUY_PACK { id, packs }` | Nhập hàng. |
| `HIRE` / `FIRE { role }` | Thuê / cho nghỉ nhân viên. |
| `NEXT_DAY` | Sang ngày mới từ màn tổng kết → `prep` với chỗ bẩn mới. |
| `RESET { seed, shop }` | Chơi lại từ đầu. |

Reducer sao chép nông các phần có thể đổi (`draft()`), mutate bản sao rồi trả về – state cũ không bao giờ bị sửa
(có test kiểm tra).

## 4. Vòng lặp game & lưu dữ liệu

```
useGame(initialState, player, paused) → [state, dispatch, sync, flush]
 ├─ setInterval 100ms ──► dispatch(TICK, dt = min(250, now − last))   (bỏ qua khi tab ẩn / paused)
 ├─ setInterval 2s ─────► saveGame(state)                 (bản sao localStorage)
 ├─ setInterval 10s ────► writeCloudSave(player, state)   (Firestore, chỉ khi state đổi)
 ├─ đổi day/phase ──────► writeCloudSave ngay              (mở cửa, hết giờ, tổng kết, sang ngày)
 ├─ visibilitychange / pagehide / unmount ─► lưu cả hai
 └─ flush() ────────────► GameScreen gọi trước khi thoát / đăng xuất (chờ database xác nhận)
```

- Document Firestore `saves/{uid}`: `save` (JSON đầy đủ của GameState), `savedAt`, cùng các cột dễ xem trong
  console: `playerName`, `email`, `shopName`, `day`, `money`, `totalRevenue`, `reputation`, `updatedAt`.
- `sync` (`off` / `saving` / `saved` / `error`) hiện thành chấm màu trên nút ⚙️ và dòng chữ trong Cài đặt.
- Vào quán (`App.enterShop`): `loadCloudSave` đọc thẳng từ máy chủ (`getDocFromServer`, timeout 10s) → `{ ok, file }`.
  Lỗi mạng (`ok: false`) khác với "chưa có quán" (`file: null`) để không tạo quán mới đè lên dữ liệu thật.
- Đăng nhập là bắt buộc: `GUEST_ALLOWED` chỉ bật khi chạy `npm run dev` mà chưa cấu hình Firebase (để code UI).

- `paused` = người chơi bấm ⏸️ **hoặc** đang mở modal **hoặc** đang xem hướng dẫn.
- Giới hạn `dt` 250ms để khi iOS treo tab rồi mở lại, game không "nhảy" cả phút.

## 5. Thông báo (GameEvent) và hoạt cảnh

Reducer không thể gọi UI, nên mọi thông báo được đẩy vào `state.events` (giữ tối đa 30 event gần nhất, `id` tăng
dần). `GameScreen` nhớ `id` cuối đã xử lý; mỗi event mới → toast (tự ẩn sau 2,8s, tối đa 2) + âm thanh.

`ShopScene` dùng event để dựng hoạt cảnh mà không cần thêm state trong logic:

| Event | Hoạt cảnh |
|---|---|
| `served` (mang về / Grab) | khách xách túi đi ra cửa, tiền bay lên |
| `served` (ăn tại chỗ) | `done = false`: bạn vừa nhận tô bưng tô đứng chờ cả nhóm; `done = true`: cả lượt xuất hiện ở bàn (đọc từ `state.tables`) hoặc đứng chờ bàn (`state.tableQueue`) |
| `finished` | cả lượt khách tại các bàn `tables` vui vẻ, bong bóng nhận xét + tiền trả ở bàn đầu, rồi rời bàn |
| `review` | chỉ toast 📱 (khách ăn ở nhà); nội dung vào `reviewLog` xem ở tab Đánh giá |
| `wrong` | khách ở quầy mặt buồn + bong bóng chê đòi làm lại, vẫn đứng chờ |
| `left` | khách giận dữ đi ra cửa |

## 6. PWA & iPhone

- `index.html`: `apple-mobile-web-app-capable`, `status-bar-style=black-translucent`, `apple-touch-icon`,
  `viewport-fit=cover` + `user-scalable=no`.
- CSS dùng `100dvh`, `env(safe-area-inset-top/bottom)`, `touch-action: manipulation`, `overscroll-behavior: none`,
  tắt chọn chữ trong vùng chơi.
- Service worker (Workbox) precache toàn bộ JS/CSS/font/icon → chơi offline sau lần mở đầu tiên.
  `registerType: 'autoUpdate'`; `main.tsx` gọi `registration.update()` mỗi khi app hiện lại.
- Âm thanh: `AudioContext` được tạo/resume ở `pointerdown` đầu tiên (chính sách autoplay của iOS).

## 7. Kiểm thử

- `src/game/orders.test.ts` – giá món = vốn + 20k, giá nước, chấm tô theo độ lệch cay, sai món (thiếu/thừa, quên
  nước, cải tím), sinh đơn hợp lệ (Grab luôn mang về, cấp cay 0–7), tip, mô tả đơn.
- `src/game/state.test.ts` – dọn quán trước khi mở cửa, nhịp khách (giới hạn, chậm lại khi dồn, không để ế, mô
  phỏng cả ngày), mang về + đánh giá + hoàn tiền, ăn tại chỗ + trả tiền khi ăn xong, hết bàn phải chờ, đơn Grab,
  sai món trừ tiền, hũ ớt, hoàn tác/đổ bỏ, nhập hàng, khách bỏ về, kết thúc ngày chờ khách ăn xong, nhân viên.
- `src/game/save.test.ts` – ghi/đọc save, bỏ qua save phiên bản cũ, bổ sung field mới cho save v3, chọn bản mới hơn
  giữa máy và database.
- `state.test.ts` còn có: bớt nguyên liệu / ớt, đổi tên quán.
- UI kiểm tra thủ công ở khung 390×844 (iPhone 14/15) – xem checklist trong `docs/DEPLOYMENT.md`.
