# Deploy & cài lên iPhone

## 1. Deploy lên GitHub Pages (tự động)

Repo đã có workflow `.github/workflows/deploy.yml`: mỗi lần push lên `main` sẽ chạy `npm ci → npm test → npm run build`
rồi đưa thư mục `dist/` lên GitHub Pages.

**Bật lần đầu (chỉ làm một lần):**

1. Vào repo trên GitHub → **Settings → Pages**.
2. Mục **Build and deployment → Source**, chọn **GitHub Actions**.
3. Push code lên `main` (hoặc vào tab **Actions → Deploy to GitHub Pages → Run workflow**).
4. Khi workflow xanh, game có tại: **https://khtrinh-dev.github.io/milk-tea-game/**

> `base` trong `vite.config.ts` mặc định là `/milk-tea-game/`. Workflow tự đặt `BASE_PATH` theo tên repo, nên đổi
> tên repo vẫn chạy. Nếu deploy ở tên miền riêng / thư mục gốc, build với `BASE_PATH=/ npm run build`.

### Deploy chỗ khác

`dist/` là web tĩnh, có thể đưa lên Netlify, Vercel, Cloudflare Pages… (cần **HTTPS** để service worker hoạt động):

```bash
BASE_PATH=/ npm run build   # rồi upload thư mục dist/
```

## 2. Cài lên iPhone (không cần App Store)

1. Mở **Safari** trên iPhone, vào https://khtrinh-dev.github.io/milk-tea-game/
2. Bấm nút **Chia sẻ** (ô vuông có mũi tên ↑).
3. Chọn **Thêm vào MH chính** (Add to Home Screen) → **Thêm**.
4. Mở game từ biểu tượng 🧋 **Trà Sữa** – chạy toàn màn hình như app thật, chơi được cả khi offline.

Ghi chú:

- Tiến trình lưu trong bộ nhớ của app trên máy đó (localStorage). Xóa app khỏi màn hình chính sẽ xóa luôn save.
- Có bản mới: mỗi lần mở app (kể cả khi app được đánh thức từ nền) mà có mạng, service worker kiểm tra bản mới,
  tải về rồi tự tải lại game (tiến trình đã được autosave nên không mất). GitHub Pages cache file khoảng 10 phút,
  nên bản vừa deploy có thể cần vài phút mới tới máy.
- Nếu không nghe âm thanh: tắt chế độ im lặng của iPhone và kiểm tra ⚙️ Cài đặt → Âm thanh.

## 3. Chơi thử trên iPhone khi đang phát triển

```bash
npm run dev    # Vite chạy với --host, in ra địa chỉ dạng http://192.168.x.x:5173/milk-tea-game/
```

iPhone và máy tính cùng mạng Wi-Fi → mở địa chỉ đó bằng Safari. (Service worker chỉ chạy trên HTTPS/localhost
nên chế độ offline chỉ kiểm tra được trên bản deploy.)

> Dùng WSL2: địa chỉ in ra là IP nội bộ của WSL, iPhone không vào được trực tiếp. Hãy dùng
> `npm run build && npm run preview` rồi port-forward từ Windows (`netsh interface portproxy …`) hoặc test bằng bản deploy.

## 4. Checklist trước khi release

- [ ] `npm test` và `npm run build` sạch.
- [ ] Mở ở khung 390×844 (DevTools → iPhone 14): không có thanh cuộn ngang, nút "Giao món" không bị che.
- [ ] Chơi hết một ngày: khách tới, giao đúng/sai, khách bỏ về, màn tổng kết hiện đúng.
- [ ] Nhập hàng, hết nguyên liệu → nút "Hết · nhập" hoạt động.
- [ ] Tải lại trang: tiến trình còn nguyên.
- [ ] Trên iPhone: "Thêm vào MH chính" → mở toàn màn hình, không bị tai thỏ/thanh home che nội dung.
