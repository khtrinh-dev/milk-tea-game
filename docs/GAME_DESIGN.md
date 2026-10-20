# Thiết kế game – Mì Cay Tycoon

## 1. Ý tưởng

Người chơi **đăng nhập bằng Gmail** rồi làm chủ một **quán mì cay** nhỏ (tiến trình lưu trong database, đổi máy vẫn
chơi tiếp). Mỗi sáng phải **cầm chổi quét dọn quán** rồi mới được mở cửa. Khách vào quán
(hoặc đặt qua **Grab**) gọi một tô mì cay kèm **cấp độ cay 0–7**, có khi gọi thêm **nước uống**. Người chơi
**chạm từng nguyên liệu** để bỏ vào tô, chạm **hũ ớt** đúng số shot = cấp cay, rồi giao món. Khách **ăn tại chỗ**
(ngồi một trong **10 bàn**) hoặc **mua mang về**. Ăn xong khách nhận xét kèm biểu cảm: khen ngon 😋, cay quá đỏ
bừng mặt 🥵, không đủ cay thì mặt khinh 😒, sai món thì chê dở 😞.

Nguyên liệu phải **nhập bằng tiền**. Doanh thu tích lũy càng cao càng mở khóa món mới; vượt **10.000.000₫** thì được
**thuê nhân viên**. Giao diện tông **đỏ · trắng · đen** cho cảm giác cay.

## 2. Vòng chơi

```
Sáng: 🧹 dọn quán ─► 🔓 Mở cửa (8:00) ─► khách vào / đơn Grab ─► chọn đơn ─► bỏ nguyên liệu + shot ớt ─► Giao món
                                                                                                     │
        ┌───────────── ăn tại chỗ: vào bàn (hết bàn thì đứng chờ) ─► ăn xong: nhận xét + trả tiền ◄──┤
        │              mang về / Grab: trả tiền ngay ─► về nhà ăn ─► đánh giá (lệch cay thì hoàn tiền) ◄┘
        ▼
Tổng kết ngày ◄── hết khách & bàn trống ◄── 22:00 đóng cửa (không nhận khách mới từ ~21:15)
```

- **Dọn quán (`phase = 'prep'`)**: đầu mỗi ngày có **7 chỗ bẩn** (`DIRT_SPOTS`) rải trong quán. **Kéo cây chổi** 🧹
  quét qua chỗ bẩn: mỗi lần chổi lướt vào là 1 lượt quét (chổi đung đưa, bụi bay, chỗ bẩn rung và mờ dần). Chỗ có
  dấu • cần quét nhiều lượt – đưa chổi ra rồi quét lại vào. Đồng hồ chưa chạy, chưa có khách. Dọn sạch mới bấm được
  **🔓 Mở cửa đón khách**.

  | Chỗ bẩn | Số lượt quét | Tỉ lệ |
  |---|---|---|
  | 🧻 Rác | 1 | 30% |
  | 🥣 Chén bẩn trên bàn (mỗi bàn tối đa 1) | 2 | 25% |
  | 🟠 Vết dầu ớt | 3 | 20% |
  | 🕸️ Mạng nhện | 2 | 15% |
  | 💨 Bụi | 2 | 10% |

- Một ngày mở cửa từ **8:00 đến 22:00**, kéo dài **3 phút** thực (`DAY_LENGTH_MS`).
- Ngừng đón khách mới **10 giây** trước giờ đóng cửa; sau 22:00 phục vụ nốt khách ở quầy và chờ khách đang ngồi
  ăn xong. Trong lúc đó quán hiện **"Sắp đóng cửa"** và *"quán sẽ đóng cửa khi khách cuối cùng ăn xong (còn N khách
  đang ăn)"*; cửa treo biển CLOSED với khách mới.
- **Tổng kết ngày**: khách phục vụ / bỏ về / tô nấu sai, doanh thu, tip, nhập hàng, tiền bỏ tô nấu sai, tiền hoàn
  cho khách chê, lương, lợi nhuận. Đánh giá còn treo của khách mang về được tính luôn vào ngày đó.
- Game tự lưu; tắt app mở lại vẫn chơi tiếp được.

## 3. Đơn hàng

Mỗi đơn là **1 tô mì cay**:

| Thành phần | Giá trị | Xác suất |
|---|---|---|
| Nguồn đơn | Khách vào quán / Đơn **Grab** (tài xế Grab tới quầy lấy) | 70% / 30% (`GRAB_ORDER_CHANCE`) |
| Kiểu phục vụ (khách vào quán) | Ăn tại chỗ / Mang về | 60% / 40% (`DINE_IN_CHANCE`); Grab luôn mang về |
| Món | một món đã mở khóa | đều nhau |
| Cấp cay | 0 → 7 | 6 / 10 / 15 / 18 / 17 / 14 / 11 / 9 (%) |
| Nước uống | Không / 🥤 Coca Cola / 🥛 Sữa | 50% / 28% / 22% |

- **Giá đơn = giá món + giá nước.**
- Khách mới: toast 🔔 "Anh dev IT Minh gọi Mì cay bò cấp 3 + Coca Cola (ăn tại chỗ)"; đơn Grab: 🛵 "Đơn Grab: …".
- Bong bóng trên đầu khách: 🪑 ăn tại chỗ / 🛍️ mang về / 🛵 Grab · món · 🌶️cấp cay · nước.

### Nấu một tô

Công thức của đơn = công thức món + nước khách gọi (nước đặt cạnh tô). Ví dụ *Mì cay bò cấp 3 + Coca*:

```
🍜 Mì · 🥬 Kim chi · 🥩 Bò · 🥦 Súp lơ · 🍄 Nấm kim châm · 🌭 Xúc xích   (mỗi thứ 1 phần)
🥤 Coca Cola
🌶️ Hũ ớt × 3 shot
```

- Quầy chia **4 cụm có màu riêng**: 🍜 Mì · 🥩 Thịt · Hải sản (mực, tôm, cá viên chiên, bò, xúc xích) ·
  🥬 Rau · Nấm · Kim chi (kim chi, nấm kim châm, cải tím, súp lơ) · 🥤 Nước uống (Coca, Sữa).
- Mỗi lần chạm nguyên liệu = bỏ 1 phần vào tô (tô SVG hiện thêm miếng tương ứng). Nước thì đặt cạnh tô.
- **Bỏ dư thì bớt được**: nguyên liệu nào đang có trong tô sẽ hiện nút **−N** ở góc (đỏ nếu đang thừa so với đơn);
  chạm để bớt 1 phần, phần đó được trả lại kho. "Hoàn tác" bỏ thao tác gần nhất.
- **Hũ ớt**: mỗi lần chạm thêm 1 shot ớt (miễn phí), tối đa 7; nút **−🌶️** cạnh hũ để bớt 1 shot. Cấp 0 = không cho
  ớt. Nước dùng đỏ dần theo số shot.
- Tô chứa tối đa 12 phần, khay tối đa 2 chai nước.
- Thẻ đơn hiện tiến độ `0/1 → 1/1` từng dòng, phần thừa tô đỏ; nút nguyên liệu cần cho đơn đang chọn được viền đỏ.
  Thứ tự bỏ không quan trọng.
- **Cải tím** có ở quầy nhưng không thuộc công thức món nào – bỏ nhầm là hỏng tô.

### Chấm tô khi giao

| Kết quả | Điều kiện | Khách trả | Danh tiếng | Biểu cảm |
|---|---|---|---|---|
| 😋 Ngon | đúng nguyên liệu + nước, đúng số shot ớt | giá + **tip** | +2 | vui |
| 🥵 Cay quá | dư 1–2 shot | **80%** giá | −1 | mặt đỏ bừng, bốc khói, lè lưỡi |
| 🥵 Cay xé lưỡi | dư ≥ 3 shot | **50%** giá | −3 | như trên |
| 😒 Chưa đủ cay | thiếu 1–2 shot | 80% giá | −1 | mặt khinh, liếc ngang, nhếch mép |
| 😒 Không cay chút nào | thiếu ≥ 3 shot | 50% giá | −3 | như trên |
| 😞 Sai món | thiếu/thừa nguyên liệu hoặc nước | 0₫; **tô bị bỏ và bị trừ tiền = giá vốn nguyên liệu trên khay**; khách **vẫn chờ** nhưng mất 15% kiên nhẫn | −5 | buồn, rơi nước mắt |
| 😤 Bỏ về | hết thời gian chờ | 0₫ | −4 | giận |

Thời điểm trả tiền / nhận xét theo kiểu phục vụ:

- **Ăn tại chỗ**: nhận tô xong vào bàn trống đầu tiên, ngồi ăn **25–45 giây**, ăn xong mới nhận xét (bong bóng
  + biểu cảm ngay tại bàn) và **trả tiền theo bảng trên**. **Hết cả 10 bàn** thì khách bưng tô **đứng chờ** ở góc
  phòng ăn, có bàn trống mới vào ngồi.
- **Mang về / Grab**: trả **đủ giá** (+ tip nếu đúng độ cay) ngay khi nhận, về nhà ăn rồi **8–15 giây** sau gửi
  đánh giá 📱. Lệch độ cay thì quán **hoàn lại phần chênh** (20% hoặc 50% giá) và mất danh tiếng như bảng trên;
  khen ngon thì +1 danh tiếng.

Công thức phụ:

- **Tip** = giá × 20% × (tỉ lệ thời gian chờ còn lại) × (0,5 + danh tiếng/100) × độ hào phóng của kiểu khách,
  làm tròn nghìn. Chỉ có khi đúng độ cay.
- **Kiên nhẫn** = 30s + 4s × (số phần nguyên liệu + nước) + 0,6s × cấp cay; × tính cách kiểu khách; ×1,2 với tài
  xế Grab; +25% cho mỗi nhân viên phục vụ.
- Thanh dưới bong bóng: xanh → vàng (≤50%) → đỏ (≤25%); mặt khách lo lắng rồi giận dần.

## 4. Khách hàng & nhịp đơn

- Tối đa **3 đơn** chờ ở quầy (tính cả tài xế Grab).
- Kiểu khách vào quán: anh kỹ sư, anh dev IT, chị đẹp, anh giám đốc, sinh viên UEH, sinh viên FPT, học sinh,
  cô giáo, chị văn phòng, anh gymer – mỗi kiểu có ngoại hình, độ kiên nhẫn và độ hào phóng riêng
  (`data/customers.ts`). **Anh Grab** chỉ xuất hiện khi tới lấy đơn Grab.
- **Nhịp đơn vừa phải** – không ế mà cũng không dồn dập (`constants.ts`):
  - Khoảng cách giữa 2 lượt khách = `max(10s, 18s − danh tiếng × 0,06s − (ngày − 1) × 0,5s)` × ngẫu nhiên ±20%.
  - Quầy đang có ≥ 2 đơn chờ → lượt sau tới chậm hơn ×1,5.
  - Quầy trống trơn → khách kế tiếp tới trong tối đa **4 giây** (tránh ế).
  - Mô phỏng người chơi mất ~15 giây/tô: khoảng **11–12 khách/ngày**, quầy tối đa 2 người chờ, không ai bỏ về.
- Đơn được tự chọn khi khách đầu tiên tới hoặc khi giao xong đơn đang chọn (đơn cũ nhất còn trống).

## 5. Kinh tế (VNĐ)

- Vốn ban đầu: **1.000.000₫**, kèm **1 gói (10 phần)** mỗi nguyên liệu ở quầy.
- Chạm nguyên liệu = dùng 1 phần. "Hoàn tác" trả lại phần vừa bỏ; "Đổ bỏ" thì nguyên liệu mất (nước chưa mở được
  cất lại) nhưng không bị phạt tiền.
- Hết nguyên liệu: nút hiện "Nhập …", chạm để nhập ngay 1 gói. Hoặc vào **📦 Kho** để nhập 1 hoặc 5 gói.

### Nguyên liệu (gói 10 phần, giá gói = giá phần × 10)

| Nguyên liệu | Giá vốn / phần |
|---|---|
| 🍜 Mì | 15.000₫ |
| 🦑 Mực | 10.000₫ |
| 🦐 Tôm | 15.000₫ |
| 🍢 Cá viên chiên | 10.000₫ |
| 🥬 Kim chi | 5.000₫ |
| 🥩 Bò | 30.000₫ |
| 🍄 Nấm kim châm | 10.000₫ |
| 🟣 Cải tím | 5.000₫ |
| 🥦 Súp lơ | 5.000₫ |
| 🌭 Xúc xích | 10.000₫ |
| 🥤 Coca Cola | 10.000₫ |
| 🥛 Sữa | 10.000₫ |
| 🌶️ Ớt (hũ ớt) | miễn phí |

### Thực đơn – giá bán = giá vốn nguyên liệu + **20.000₫ lời mỗi tô** (`BOWL_PROFIT`)

| Món | Công thức (mỗi thứ 1 phần) | Vốn | Giá bán | Mở khóa khi doanh thu đạt |
|---|---|---|---|---|
| 🥬 Mì cay kim chi | Mì, Kim chi, Cá viên chiên, Súp lơ, Nấm kim châm, Xúc xích | 55.000₫ | **75.000₫** | có sẵn |
| 🥩 Mì cay bò | Mì, Kim chi, Bò, Súp lơ, Nấm kim châm, Xúc xích | 75.000₫ | **95.000₫** | có sẵn |
| 🦐 Mì cay hải sản | Mì, Kim chi, Cá viên chiên, Tôm, Mực, Súp lơ, Nấm kim châm, Xúc xích | 80.000₫ | **100.000₫** | 1.000.000₫ |
| 🔥 Mì cay thập cẩm | Mì, Kim chi, Cá viên chiên, Tôm, Mực, Bò, Súp lơ, Nấm kim châm, Xúc xích | 110.000₫ | **130.000₫** | 3.000.000₫ |

### Nước uống

| Nước | Vốn | Giá bán |
|---|---|---|
| 🥤 Coca Cola | 10.000₫ | 15.000₫ |
| 🥛 Sữa | 10.000₫ | 15.000₫ |

## 6. Đánh giá & danh tiếng ⭐

### Tab Đánh giá

Mỗi lượt nhận xét của khách được lưu lại (60 lượt gần nhất, nằm trong save nên cũng lưu trong database) và xem ở nút
**⭐ Đánh giá** trên HUD: điểm trung bình, lọc *Tất cả / Khen / Chê*, mỗi dòng có chân dung khách với biểu cảm, số sao,
câu nhận xét, ngày, kiểu phục vụ (🪑 / 🛍️ / 🛵), món và cấp cay khách gọi.

| Cảm nhận | Sao |
|---|---|
| 😋 Ngon | ★★★★★ |
| 🥵 Cay quá / 😒 Chưa đủ cay | ★★★ |
| 🥵 Cay xé lưỡi / 😒 Không cay chút nào | ★★ |
| 😞 Sai món | ★ |

Khách ăn tại chỗ được ghi khi ăn xong, khách mang về / Grab khi gửi đánh giá, sai món thì ghi ngay lúc trả tô.

### Danh tiếng

- Thang 0–100, bắt đầu 50, hiện thành 0–5 sao.
- Ảnh hưởng: tần suất khách tới và tiền tip.

## 7. Nhân viên (mở khi doanh thu tích lũy ≥ 10.000.000₫)

| Nhân viên | Lương/ngày | Tối đa | Tác dụng |
|---|---|---|---|
| 👨‍🍳 Đầu bếp | 300.000₫ | 3 | Tự nhận đơn cũ nhất (trừ đơn người chơi đang nấu dở), dùng nguyên liệu trong kho, 12 giây/tô, luôn đúng món đúng độ cay. Khách tip bằng một nửa. Khách đang được nấu không mất kiên nhẫn. |
| 🧑‍💼 Phục vụ | 180.000₫ | 2 | Mỗi người tăng 25% thời gian chờ của khách mới. |
| 📦 Kho | 200.000₫ | 1 | Mỗi 3 giây kiểm tra: nguyên liệu nào còn < 3 phần thì tự nhập 1 gói (nếu đủ tiền). |

- Lương trừ vào cuối mỗi ngày (có thể khiến tiền âm – khi đó không nhập hàng được).
- Có thể cho nghỉ bất kỳ lúc nào; đơn đang nấu dở trả lại hàng chờ, nguyên liệu đã dùng thì mất.

## 8. Tài khoản & dữ liệu

- **Bắt buộc đăng nhập Gmail** (Google qua Firebase Authentication) mới vào được quán. Màn hình đầu chỉ có nút
  "Đăng nhập bằng Gmail"; đăng nhập xong hiện tên + ảnh và nút "Vào quán".
- Tiến trình lưu trong **database Firestore** (`saves/{uid}`): ghi mỗi 10 giây khi có thay đổi, ghi ngay khi mở cửa /
  hết giờ / tổng kết / sang ngày, khi ẩn app và trước khi thoát hoặc đăng xuất. Trên máy giữ thêm một bản sao để chơi
  tiếp khi mất mạng (Firestore tự gửi bù khi có mạng lại).
- Vào quán: lấy bản mới hơn giữa database và bản sao trên máy. Không đọc được database mà máy cũng không có bản sao
  → báo lỗi mạng chứ **không tạo quán mới** (tránh ghi đè dữ liệu thật).
- Chấm nhỏ trên nút ⚙️ cho biết trạng thái lưu: xanh = đã lưu, vàng = đang lưu, đỏ = chưa lưu được (sẽ thử lại).
  ⚙️ Cài đặt ghi rõ thời điểm lưu gần nhất.
- Bị đăng xuất (hết phiên, đăng xuất nơi khác) thì quay về màn hình đầu.
- **Đổi tên quán bất cứ lúc nào** trong ⚙️ Cài đặt (tối đa 24 ký tự, không để trống).

## 9. Điều khiển & giao diện

- **Màn hình đầu**: linh vật tô mì cay bốc lửa, nút đăng nhập Gmail.
- **Tạo quán**: đặt tên quán, chọn phong cách **Đỏ lửa / Đen than / Trắng ớt** (đều tông đỏ · trắng · đen).
- **HUD trên cùng**: tiền mặt · ⭐ danh tiếng · ⏸️ · ⚙️ (kèm chấm trạng thái lưu) · thanh doanh thu tới 10 triệu ·
  📦 Kho, 📖 Menu, 👥 Nhân sự, ⭐ Đánh giá.
- **Khung cảnh quán** (cửa hàng đồ ăn):
  - Phòng ăn phía trên: **10 bàn** (2 dãy × 5) khăn trải đỏ; khách ngồi ăn có tô mì bốc khói; ăn xong hiện biểu
    cảm + câu nhận xét + tiền trả. Góc trái hiện khách đang **chờ bàn**. Góc phải: số bàn đang có khách.
  - Quầy gọi món phía dưới: sàn caro đen trắng, cửa ra vào, mặt quầy in tên quán, khách xếp hàng ở quầy; khách mang
    về / tài xế Grab xách túi đi ra cửa. Cửa chỉ mở khi có người bước vào hoặc ra tới cửa (khách ăn tại chỗ đi vào
    bàn thì không).
  - Lúc dọn quán: các chỗ bẩn lắc lư trên cảnh, cây chổi dựng ở góc phải – kéo để quét.
- **Quầy nấu**: tô mì SVG (nguyên liệu nổi trên mặt, nước dùng đỏ dần theo ớt, nước uống đặt cạnh tô), thẻ đơn
  (kiểu phục vụ, cấp cay, checklist 2 cột theo thứ tự mì → thịt → rau → nước, nước tô xanh), **hũ ớt** với thước
  7 quả ớt (quả ớt mục tiêu có viền vàng) + nút bớt ớt, 4 cụm nút nguyên liệu có nút **−** để bớt.
- **Thanh hành động**: ↶ Hoàn tác · 🗑️ Đổ bỏ · 🍜 Giao món.
- Modal mở ra thì game tạm dừng.

## 10. Ý tưởng mở rộng

- Topping thêm (thêm mì, thêm bò…), size tô.
- Bàn bẩn sau khi khách ăn xong phải lau mới cho khách mới ngồi.
- Nâng cấp quán (thêm bàn, bếp nấu nhanh hơn, trang trí tăng danh tiếng).
- Sự kiện theo ngày (mưa đông đơn Grab, cuối tuần đông khách, thử thách "cấp 7").
- Thành tựu, bảng xếp hạng lợi nhuận.
