import { MAX_SPICE } from '../game/constants';

export function HowToPlay() {
  return (
    <ol className="howto">
      <li>🧹 Mỗi sáng phải <b>dọn quán</b>: kéo cây chổi quét qua rác, vết dầu ớt, mạng nhện, chén bẩn… dọn sạch mới bấm được <b>Mở cửa</b>.</li>
      <li>🔔 Khách vào quán hoặc 🛵 tài xế Grab tới lấy đơn. Bong bóng trên đầu ghi <b>tên món, cấp cay (0 → {MAX_SPICE})</b>, nước kèm (Coca, Pepsi, Fanta, 7Up, Sữa) và <b>ăn tại chỗ hay mang về</b>. <b>Chạm vào khách</b> để chọn đơn.</li>
      <li>👯 Có khi cả <b>nhóm bạn</b> kéo vào, mỗi người gọi 1 tô. Chạm tên từng bạn trên thẻ đơn để nấu cho bạn đó – đủ tô thì cả nhóm mới cùng vào các bàn cạnh nhau.</li>
      <li>📋 Thẻ đơn hiện công thức. Món nào cũng có <i>Mì + Kim chi + Cải tím + Súp lơ + Nấm kim châm + Xúc xích</i>, thêm bò / cá viên / hải sản tùy món.</li>
      <li>👆 <b>Chạm từng nguyên liệu</b> để bỏ vào tô, rồi chạm <b>Hũ ớt</b> đúng số shot = cấp cay (cấp 0 thì không cho ớt). Lỡ bỏ dư thì bấm nút <b>−</b> ở góc nguyên liệu / cạnh hũ ớt để bớt.</li>
      <li>🍜 Bấm <b>Giao món</b>. Khách <b>ăn tại chỗ</b> nhìn là biết: sai món hay sai độ cay đều <b>trả tô bắt làm lại</b>, đúng mới vào bàn ăn, ăn xong khen + trả tiền + tip 😋.</li>
      <li>🛍️ Khách <b>mang về</b> / Grab trả tiền ngay, về nhà ăn rồi đánh giá – lệch độ cay thì quán hoàn bớt tiền. Sai món thì họ trả lại ngay tại quầy.</li>
      <li>❌ Mỗi tô bị trả lại: quán bị <b>trừ nửa giá vốn</b> nguyên liệu trong tô, khách mất chút kiên nhẫn.</li>
      <li>⏳ Khách chờ lâu sẽ bỏ về và quán mất danh tiếng ⭐. Vào tab <b>⭐ Đánh giá</b> đọc khách khen chê và <b>phản hồi</b> – rep khéo lời chê là gỡ lại chút danh tiếng.</li>
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
