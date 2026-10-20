# 🌶️ Mì Cay Tycoon

Game giả lập mở quán mì cay 2D – chơi ngay trên trình duyệt hoặc **cài lên iPhone không cần App Store** (PWA).

**Chơi:** https://khtrinh-dev.github.io/milk-tea-game/

## Cách chơi

1. 🧹 Mỗi sáng **dọn dẹp quán** (rác, vết dầu ớt, mạng nhện, chén bẩn trên bàn) rồi mới được **mở cửa**.
2. 🔔 Khách vào quán hoặc 🛵 tài xế **Grab** tới lấy đơn. Khách gọi mì cay kèm **cấp cay 0–7**, có khi thêm Coca / Sữa,
   và chọn **ăn tại chỗ** hay **mang về**. Chạm vào khách để chọn đơn.
3. 👆 Chạm từng nguyên liệu để bỏ vào tô, chạm **🌶️ hũ ớt** đúng số shot = cấp cay, rồi bấm **🍜 Giao món**.
4. 🪑 Khách ăn tại chỗ ngồi một trong **10 bàn** (hết bàn thì đứng chờ). Ăn xong nhận xét kèm biểu cảm:
   khen ngon 😋, cay quá đỏ bừng mặt 🥵, không cay thì mặt khinh 😒. Khách mang về / Grab đánh giá qua app sau đó.
5. ❌ Sai món thì khách chê dở 😞, **tô bị bỏ và bạn bị trừ tiền** theo giá nguyên liệu.
6. 📦 Nguyên liệu dùng là hết – nhập hàng tốn tiền (VNĐ). 📈 Doanh thu mở khóa món mới; đạt **10.000.000₫** thì
   **thuê nhân viên** (đầu bếp, phục vụ, kho).

Thực đơn: mì cay **kim chi** (75k), **bò** (95k), **hải sản** (100k), **thập cẩm** (130k) – mỗi tô lời 20k;
nước uống Coca Cola / Sữa 15k.

## Cài lên iPhone

Mở link bằng **Safari** → nút **Chia sẻ** → **Thêm vào MH chính**. Game chạy toàn màn hình và chơi được offline.

## Phát triển

```bash
npm install
npm run dev      # http://localhost:5173/milk-tea-game/
npm test
npm run build
```

Công nghệ: Vite + React + TypeScript + vite-plugin-pwa (+ Firebase tùy chọn cho đăng nhập Google), deploy GitHub
Pages bằng GitHub Actions.

Tài liệu: [CLAUDE.md](CLAUDE.md) · [Thiết kế game](docs/GAME_DESIGN.md) · [Kiến trúc](docs/ARCHITECTURE.md) ·
[Deploy & cài iPhone](docs/DEPLOYMENT.md)
