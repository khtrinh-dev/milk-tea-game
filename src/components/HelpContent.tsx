import { MAX_SPICE } from '../game/constants';

export function HowToPlay() {
  return (
    <ol className="howto">
      <li>🧹 Mỗi sáng phải <b>dọn quán</b>: kéo cây chổi quét qua rác, vết dầu ớt, mạng nhện, chén bẩn… dọn sạch mới bấm được <b>Mở cửa</b>.</li>
      <li>🔔 Khách vào quán hoặc 🛵 tài xế Grab tới lấy đơn, gọi món + cấp độ cay (🌶️0 → 🌶️{MAX_SPICE}), có khi thêm 🥤 Coca hoặc 🥛 Sữa. <b>Chạm vào khách</b> để chọn đơn.</li>
      <li>🪑 Khách <b>ăn tại chỗ</b> ngồi 1 trong 10 bàn (hết bàn thì đứng chờ), ăn xong mới nhận xét và trả tiền. 🛍️ Khách <b>mang về</b> / Grab trả tiền ngay, về nhà ăn rồi đánh giá – chê độ cay thì quán phải hoàn bớt tiền.</li>
      <li>📋 Thẻ đơn hiện công thức, ví dụ <i>🍜 Mì + 🥬 Kim chi + 🥩 Bò + 🥦 Súp lơ + 🍄 Nấm kim châm + 🌭 Xúc xích</i>.</li>
      <li>👆 <b>Chạm từng nguyên liệu</b> để bỏ vào tô, rồi chạm <b>Hũ ớt</b> đúng số shot = cấp cay (cấp 0 thì không cho ớt). Lỡ bỏ dư thì bấm nút <b>−</b> ở góc nguyên liệu / cạnh hũ ớt để bớt.</li>
      <li>🍜 Bấm <b>Giao món</b>. Khách ăn xong sẽ nhận xét: đúng độ cay thì khen ngon + tip 😋; cay quá thì đỏ bừng mặt 🥵, không đủ cay thì mặt khinh 😒 – cả hai đều trả ít tiền hơn.</li>
      <li>❌ Bỏ thiếu/thừa nguyên liệu hay quên nước: khách chê dở 😞, <b>tô bị bỏ và bạn bị trừ tiền</b> bằng giá vốn nguyên liệu trong tô.</li>
      <li>⏳ Khách chờ lâu sẽ bỏ về và quán mất danh tiếng ⭐. Xem lại mọi lời khen chê ở tab <b>⭐ Đánh giá</b>.</li>
      <li>📦 Nguyên liệu dùng là hết – vào <b>Kho</b> để nhập hàng. Doanh thu cao sẽ mở khóa món mới; đạt <b>10 triệu</b> thuê được nhân viên 👥.</li>
    </ol>
  );
}

export function InstallGuide() {
  return (
    <ol className="howto">
      <li>Mở game bằng <b>Safari</b> trên iPhone.</li>
      <li>Bấm nút <b>Chia sẻ</b> (ô vuông có mũi tên ↑).</li>
      <li>Chọn <b>“Thêm vào MH chính”</b> (Add to Home Screen).</li>
      <li>Mở game từ biểu tượng 🍜 trên màn hình chính – chơi toàn màn hình, cả khi offline.</li>
    </ol>
  );
}
