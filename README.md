# 🧋 Trà Sữa Tycoon

Game giả lập mở quán trà sữa 2D – chơi ngay trên trình duyệt hoặc **cài lên iPhone không cần App Store** (PWA).

**Chơi:** https://khtrinh-dev.github.io/milk-tea-game/

## Cách chơi

1. 🔔 Khách tới quầy gọi món – có thông báo đơn mới. Chạm vào khách để chọn đơn.
2. 📋 Thẻ đơn ghi công thức, ví dụ *1 🍵 Matcha + 1 🥛 Sữa tươi + 1 ⚪ Trân châu trắng · Ít đá · Ít ngọt*.
3. 👆 Chạm từng nguyên liệu đúng số lần, chọn mức 🧊 đá và 🍬 đường, rồi bấm **✅ Giao món**.
4. 💰 Đúng món nhận tiền + tip; sai thì mất tiền và danh tiếng; để khách chờ lâu khách sẽ bỏ về.
5. 📦 Nguyên liệu dùng là hết – nhập hàng tốn tiền (VNĐ).
6. 📈 Doanh thu tích lũy mở khóa món mới; đạt **10.000.000₫** thì được **thuê nhân viên** (pha chế, phục vụ, kho).

12 món trà sữa phổ biến (truyền thống, matcha, khoai môn, ô long, trà đào, đường đen, macchiato…) và
9 loại topping (trân châu đen/trắng/hoàng kim, thạch dừa, pudding, flan, kem cheese…).

## Cài lên iPhone

Mở link bằng **Safari** → nút **Chia sẻ** → **Thêm vào MH chính**. Game chạy toàn màn hình và chơi được offline.

## Phát triển

```bash
npm install
npm run dev      # http://localhost:5173/milk-tea-game/
npm test
npm run build
```

Công nghệ: Vite + React + TypeScript + vite-plugin-pwa, deploy GitHub Pages bằng GitHub Actions.

Tài liệu: [CLAUDE.md](CLAUDE.md) · [Thiết kế game](docs/GAME_DESIGN.md) · [Kiến trúc](docs/ARCHITECTURE.md) ·
[Deploy & cài iPhone](docs/DEPLOYMENT.md)
