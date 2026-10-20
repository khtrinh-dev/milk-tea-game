# Thiết kế game – Trà Sữa Tycoon

## 1. Ý tưởng

Người chơi là chủ một quán trà sữa nhỏ. Khách tới gọi món, người chơi **chạm vào từng nguyên liệu** theo công thức
để pha từng ly, chọn mức **đá** và **đường**, rồi giao cho khách. Nguyên liệu phải **nhập bằng tiền**, bán được thì
có **doanh thu**. Doanh thu tích lũy càng cao càng mở khóa món mới; vượt **10.000.000₫** thì được **thuê nhân viên**.

## 2. Vòng chơi

```
Mở cửa (8:00) ──► khách tới & gọi món ──► chọn đơn ──► bấm nguyên liệu + chọn đá/đường ──► Giao món
     ▲                                                                                     │
     │                         nhập hàng khi thiếu (📦 Kho)                              tiền + danh tiếng
     │                                                                                     ▼
Tổng kết ngày ◄── hết khách ◄── 22:00 đóng cửa (không nhận khách mới từ ~21:15)
```

- Một ngày mở cửa từ **8:00 đến 22:00**, kéo dài **3 phút** thực (`DAY_LENGTH_MS`).
- Ngừng đón khách mới **10 giây** trước giờ đóng cửa; sau 22:00 phải phục vụ nốt khách còn lại.
- Hết khách → màn hình **Tổng kết ngày**: số khách phục vụ/bỏ về/làm sai, doanh thu, tip, tiền nhập hàng,
  lương nhân viên, lợi nhuận. Bấm "Mở cửa ngày tiếp theo" để chơi tiếp.
- Game tự lưu; tắt app mở lại vẫn chơi tiếp được.

## 3. Đơn hàng

Mỗi khách gọi **1 ly** gồm:

| Thành phần | Giá trị | Xác suất |
|---|---|---|
| Món | một món đã mở khóa | đều nhau |
| Topping | 0 / 1 / 2 topping khác nhau (không trùng nguyên liệu có sẵn trong món) | 35% / 45% / 20% |
| Đá | Không đá / Ít đá / Đá bình thường | 15% / 30% / 55% |
| Đường | Không đường / Ít ngọt / Ngọt bình thường / Nhiều ngọt | 10% / 30% / 50% / 10% |

- **Giá ly = giá món + tổng giá topping.**
- Khi có khách mới: toast 🔔 "Lan gọi Trà sữa matcha + Trân châu trắng (ít đá, ít ngọt)" và âm báo.
- Ly mới mặc định *đá bình thường / ngọt bình thường*. Thẻ đơn tô đỏ yêu cầu khác mặc định để người chơi để ý.

### Công thức

Công thức của đơn = công thức món + mỗi topping 1 lần. Ví dụ *Trà sữa matcha + trân châu trắng, ít đá, ít ngọt*:

```
1 × 🍵 Bột matcha
1 × 🥛 Sữa tươi
1 × ⚪ Trân châu trắng
🧊 Ít đá · 🍬 Ít ngọt
```

Thẻ đơn hiển thị tiến độ `0/1 → 1/1` từng dòng; bấm thừa sẽ hiện màu đỏ. Nút nguyên liệu cần cho đơn đang chọn
được viền hồng để gợi ý. Thứ tự bấm không quan trọng, chỉ cần đúng số lượng.

### Chấm ly khi giao

| Kết quả | Điều kiện | Khách trả | Danh tiếng |
|---|---|---|---|
| 😋 Hoàn hảo | đúng nguyên liệu, đúng số lượng, đúng đá & đường | giá ly + **tip** | +2 |
| 😕 Sai đá/đường | đúng nguyên liệu nhưng sai đá hoặc đường | **70%** giá (làm tròn nghìn) | −1 |
| ❌ Sai món | thiếu/thừa nguyên liệu | 0₫, ly bỏ đi, khách **vẫn chờ** nhưng mất 15% kiên nhẫn | −5 |
| 😤 Bỏ về | hết thời gian chờ | 0₫ | −4 |

- **Tip** = giá × 20% × (tỉ lệ thời gian chờ còn lại) × (0,5 + danh tiếng/100), làm tròn nghìn.
- **Kiên nhẫn** = 30s + 5s × (số lần bấm nguyên liệu của đơn), +25% cho mỗi nhân viên phục vụ.
- Thanh dưới mỗi khách: xanh → vàng (≤50%) → đỏ (≤25%), mặt khách đổi 😐 / 😠.

## 4. Khách hàng

- Tối đa **4 khách** đứng chờ ở quầy.
- Khoảng cách giữa 2 khách: `clamp(15s − danh tiếng × 0,08s − (ngày − 1) × 0,4s, 5s, 15s)` × ngẫu nhiên 0,7–1,3.
  → danh tiếng cao và càng về sau càng đông khách.
- Đơn được tự chọn khi khách đầu tiên tới hoặc khi giao xong đơn đang chọn (chọn đơn cũ nhất còn trống).

## 5. Kinh tế (VNĐ)

- Vốn ban đầu: **1.000.000₫**, kèm **1 gói** mỗi nguyên liệu của các món mở sẵn và 50 ly nhựa.
- Bấm nguyên liệu = dùng 1 phần (nút "Hoàn tác" trả lại phần vừa bấm, "Đổ bỏ" thì mất).
- Mỗi ly giao (kể cả sai) dùng 1 **ly + nắp + ống hút**.
- Hết nguyên liệu: nút hiện "Hết · nhập …₫", chạm để nhập ngay 1 gói. Hoặc vào **📦 Kho** để nhập 1 hoặc 5 gói.

### Nguyên liệu

| Nguyên liệu | Gói | Giá gói | Giá/phần |
|---|---|---|---|
| 🥤 Ly + nắp + ống hút | 50 | 150.000₫ | 3.000₫ |
| 🫖 Hồng trà | 30 | 90.000₫ | 3.000₫ |
| 🍃 Trà xanh nhài | 30 | 90.000₫ | 3.000₫ |
| 🍂 Trà ô long | 30 | 120.000₫ | 4.000₫ |
| 🍵 Bột matcha | 20 | 140.000₫ | 7.000₫ |
| 🍠 Bột khoai môn | 20 | 100.000₫ | 5.000₫ |
| 🍫 Bột cacao | 20 | 100.000₫ | 5.000₫ |
| 🥛 Sữa tươi | 20 | 100.000₫ | 5.000₫ |
| 🍶 Bột kem béo | 40 | 120.000₫ | 3.000₫ |
| 🍯 Đường đen | 30 | 90.000₫ | 3.000₫ |
| 🍋 Chanh dây | 20 | 80.000₫ | 4.000₫ |
| 🍓 Mứt dâu | 20 | 100.000₫ | 5.000₫ |
| 🍑 Đào miếng | 20 | 120.000₫ | 6.000₫ |
| 🧀 Kem cheese | 20 | 140.000₫ | 7.000₫ |
| ⚫ Trân châu đen | 40 | 80.000₫ | 2.000₫ |
| ⚪ Trân châu trắng | 40 | 100.000₫ | 2.500₫ |
| 🟡 Trân châu hoàng kim | 40 | 120.000₫ | 3.000₫ |
| 🥥 Thạch dừa | 40 | 80.000₫ | 2.000₫ |
| ☕ Thạch cà phê | 40 | 80.000₫ | 2.000₫ |
| 🌿 Nha đam | 40 | 80.000₫ | 2.000₫ |
| 🥚 Pudding trứng | 20 | 100.000₫ | 5.000₫ |
| 🍮 Bánh flan | 20 | 120.000₫ | 6.000₫ |

### Thực đơn

| Món | Công thức | Giá bán | Mở khóa khi doanh thu đạt |
|---|---|---|---|
| Trà sữa truyền thống | 1 Hồng trà + 1 Bột kem béo | 25.000₫ | có sẵn |
| Trà sữa nhài | 1 Trà xanh nhài + 1 Bột kem béo | 25.000₫ | có sẵn |
| Trà sữa matcha | 1 Matcha + 1 Sữa tươi | 35.000₫ | có sẵn |
| Trà sữa khoai môn | 1 Khoai môn + 1 Bột kem béo | 30.000₫ | có sẵn |
| Trà chanh dây | 1 Trà xanh nhài + 1 Chanh dây | 25.000₫ | có sẵn |
| Trà sữa ô long | 1 Ô long + 1 Sữa tươi | 32.000₫ | 300.000₫ |
| Trà đào | 1 Hồng trà + 1 Đào miếng | 30.000₫ | 600.000₫ |
| Socola sữa | 1 Cacao + 1 Sữa tươi | 32.000₫ | 1.000.000₫ |
| Sữa tươi trân châu đường đen | 1 Sữa tươi + 1 Đường đen + 1 Trân châu đen | 38.000₫ | 1.500.000₫ |
| Trà sữa dâu | 1 Trà xanh nhài + 1 Mứt dâu + 1 Sữa tươi | 32.000₫ | 2.500.000₫ |
| Hồng trà macchiato | 1 Hồng trà + 1 Kem cheese | 35.000₫ | 4.000.000₫ |
| Matcha đậm kem cheese | 2 Matcha + 1 Sữa tươi + 1 Kem cheese | 49.000₫ | 6.000.000₫ |

### Topping

| Topping | Giá thêm | Mở khóa |
|---|---|---|
| Trân châu đen | +5.000₫ | có sẵn |
| Trân châu trắng | +6.000₫ | có sẵn |
| Thạch dừa | +5.000₫ | có sẵn |
| Pudding trứng | +8.000₫ | 800.000₫ |
| Nha đam | +5.000₫ | 1.200.000₫ |
| Thạch cà phê | +5.000₫ | 2.000.000₫ |
| Trân châu hoàng kim | +7.000₫ | 3.000.000₫ |
| Kem cheese | +10.000₫ | 4.000.000₫ |
| Bánh flan | +10.000₫ | 5.000.000₫ |

Biên lợi nhuận mỗi ly khoảng 60–75%. Mô phỏng một người chơi không sai ly nào, mất ~6 giây/ly: ngày 1 bán 17 ly
(≈ 680k doanh thu), từ ngày 3 khoảng 28–32 ly/ngày (≈ 1,3–1,5 triệu), đạt mốc 10 triệu vào **ngày 8 (~24 phút chơi)**.
Người chơi bình thường (chậm hơn, có sai sót) dự kiến mất khoảng 10–15 ngày.

## 6. Danh tiếng ⭐

- Thang 0–100, bắt đầu 50, hiện thành 0–5 sao.
- Ảnh hưởng: tần suất khách tới và tiền tip.

## 7. Nhân viên (mở khi doanh thu tích lũy ≥ 10.000.000₫)

| Nhân viên | Lương/ngày | Tối đa | Tác dụng |
|---|---|---|---|
| 👩‍🍳 Pha chế | 250.000₫ | 3 | Tự nhận đơn cũ nhất (trừ đơn người chơi đang pha dở – tức đơn đang chọn khi ly đã có nguyên liệu), dùng nguyên liệu trong kho, 10 giây/ly, luôn pha đúng. Khách tip bằng một nửa và +1 danh tiếng. Khách đang được pha không mất kiên nhẫn. |
| 🧑‍💼 Phục vụ | 180.000₫ | 2 | Mỗi người tăng 25% thời gian chờ của khách mới. |
| 📦 Kho | 200.000₫ | 1 | Mỗi 3 giây kiểm tra: nguyên liệu nào đang dùng còn < 5 phần thì tự nhập 1 gói (nếu đủ tiền). |

- Lương trừ vào cuối mỗi ngày (có thể khiến tiền âm – khi đó không nhập hàng được).
- Có thể cho nghỉ bất kỳ lúc nào; đơn pha dở trả lại hàng chờ, nguyên liệu đã dùng thì mất.

## 8. Điều khiển & giao diện

- **HUD trên cùng**: 💰 tiền mặt · ngày & giờ · ⭐ danh tiếng · thanh doanh thu tích lũy tới 10 triệu ·
  nút 📦 Kho, 📖 Công thức, 👥 Nhân viên, ⏸️ Tạm dừng, ⚙️ Cài đặt.
- **Khung cảnh quán**: tường sọc, cửa sổ, biển hiệu, quầy gỗ; khách đứng ở quầy với bong bóng gọi món và thanh chờ.
- **Quầy pha chế**: ly SVG đầy dần theo từng lớp nguyên liệu (topping vẽ thành hạt, có đá viên), thẻ công thức,
  chọn đá/đường, lưới nút nguyên liệu (Trà · Sữa · Hương vị / Topping).
- **Thanh hành động**: ↶ Hoàn tác · 🗑️ Đổ bỏ · ✅ Giao món.
- Modal mở ra thì game tạm dừng.

## 9. Ý tưởng mở rộng

- Size ly M/L, combo nhiều ly cho một khách.
- Nâng cấp quán (thêm chỗ đứng, máy pha nhanh hơn, trang trí tăng danh tiếng).
- Sự kiện theo ngày (mưa vắng khách, cuối tuần đông khách, khách VIP).
- Thành tựu, bảng xếp hạng lợi nhuận.
