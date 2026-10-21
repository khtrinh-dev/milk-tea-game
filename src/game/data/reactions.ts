import type { Reaction } from '../types';

/** Số sao khách chấm theo cảm nhận. */
export const REACTION_STARS: Record<Reaction, number> = {
  delicious: 5,
  spicy: 3,
  mild: 3,
  'very-spicy': 2,
  'not-spicy': 2,
  bad: 1,
};

// Câu nhận xét của khách sau khi ăn (ăn tại chỗ, hoặc mang về ăn ở nhà), chọn ngẫu nhiên theo cảm nhận.
export const FEEDBACK: Record<Reaction, string[]> = {
  delicious: [
    'Đỉnh nóc, kịch trần, bay phấp phới! 🚀',
    'Mlem mlem, ăn xong muốn lên story liền 📸',
    'Ngon xỉu ngang, 10 điểm không có nhưng 💯',
    'Cay chuẩn gu, out trình mấy quán khác 😎',
    'Ăn xong thấy cuộc đời nở hoa 🌸',
    'Real ngon nha, không phải seeding đâu 🤭',
    'Slay quá shop ơi, mai dắt cả hội tới 🔥',
    'Nước dùng đậm đà như mối tình đầu 🥹',
    'Ăn xong quên luôn deadline, chill phết 🫠',
  ],
  spicy: [
    'Cay nhẹ thôi mà nước mắt rơi như phim Hàn 😭',
    'Hơi cay quá rồi á, môi tui dày thêm 2 phân 🫦',
    'Ăn xong nói chuyện ra khói luôn 🐉',
    'Cay hơn cả lúc crush seen không rep 🥵',
  ],
  'very-spicy': [
    'Ét o ét!! Lưỡi tui đi luôn rồi 🚒',
    'Cay tới mức thấy ông bà tổ tiên vẫy tay 👋🔥',
    'Phun lửa được rồi, đi diễn xiếc kiếm tiền thôi 🐲',
    'U là trời, cay xé lưỡi, cứu tui 1 ly trà đá gấp!',
  ],
  mild: [
    'Cay gì mà hiền như bé mèo vậy shop 🐱',
    'Chưa đã lắm, cho thêm chút drama… à chút ớt 🌶️',
    'Độ cay hơi khiêm tốn quá nha shop 😗',
    'Ăn cũng được, mà cay chưa tới nóc 🙂',
  ],
  'not-spicy': [
    'Mì cay mà hiền như nước lọc, alo? 🤨',
    'Ớt đi đâu rồi, ớt có đang ổn không? 🕵️',
    'Không cay miếng nào, tui buồn tui khóc 🥲',
    'Gọi cấp cay mà ra cấp chill, khum hiểu luôn 😑',
  ],
  bad: [
    'Ủa alo? Tô này hông phải của tui nha 🤨',
    'Tô này lạc trôi từ vũ trụ nào vậy shop? 🛸',
    'Sai sai sao á, làm lại giùm tui nha 🙏',
    'Khum, tui hông có order cái này 🙅',
  ],
};

/**
 * Câu khách trả tô ngay tại quầy rồi đòi làm lại: sai món (mọi khách), hoặc sai độ cay (khách ăn tại chỗ
 * nhìn màu nước dùng là biết).
 */
export const COMPLAINTS: Record<Exclude<Reaction, 'delicious'>, string[]> = {
  bad: FEEDBACK.bad,
  spicy: ['Đỏ lòm vậy là cay quá rồi, làm lại nha shop 🥵', 'Tui gọi cấp thấp hơn mà, đổi giùm tô khác 😵'],
  'very-spicy': ['Màu này là cấp địa ngục rồi, tui chưa muốn lên đường 😱', 'Cay vầy ăn xong khỏi nói chuyện luôn, làm lại!'],
  mild: ['Nhạt màu quá nha, thêm cay cho tui đi 🌶️', 'Cay chưa tới đâu shop ơi, làm lại xíu 🙂'],
  'not-spicy': ['Mì cay mà trắng trẻo vậy hả? Làm lại đi shop 🤨', 'Ớt đâu ớt đâu? Đổi tô khác giùm 🕵️'],
};

/** Nhận xét chung của cả nhóm bạn sau khi ăn xong. */
export const GROUP_FEEDBACK = [
  'Cả hội phê lòi, hẹn tuần sau quẩy tiếp! 🎉',
  'Team tụi mình chấm 10/10, đi ăn chung là phải ghé đây 👯',
  'Ăn xong cả nhóm im lặng vì quá ngon 🤐',
  'Ngon tới mức quên chụp hình check-in luôn 📵',
  'Chia bill hơi đau ví nhưng mì ngon nên bỏ qua 💸',
  'Hội bạn thân đã tìm ra quán ruột mới 🫶',
];

/** Câu trả lời nhanh cho chủ quán khi phản hồi đánh giá: khen (≥ 4 sao) / chê. */
export const OWNER_REPLIES: Record<'good' | 'bad', string[]> = {
  good: [
    'Iu khách nhiều lắm luôn á 🫶',
    'Khen vậy shop ngại quá trời 🙈',
    'Lần sau nhớ dẫn crush theo nha 😎',
    'Ghé hoài nha bestie, có ớt chờ sẵn 🌶️',
  ],
  bad: [
    'Xin lỗi bạn nhiều, lần sau shop làm chuẩn chỉnh ạ 🙏',
    'Đầu bếp đã bị phạt rửa 100 cái tô rồi 😭',
    'Toang rồi… cho shop xin cơ hội chuộc lỗi nha 🥺',
    'Ghi nhận góp ý, lần sau shop tặng thêm nụ cười 😅',
  ],
};

/** Khách đáp lại khi được chủ quán phản hồi. */
export const CUSTOMER_REPLY_BACK: Record<'good' | 'bad', string[]> = {
  good: ['Shop dễ thương xỉu 🥰', 'Oke chốt, tuần sau quay lại!', 'Rep có tâm ghê, follow liền 🫡', 'Hihi iu shop 💖'],
  bad: ['Thôi được, cho shop thêm 1 cơ hội 😤', 'Rep cute vậy giận sao nổi 😆', 'Ok lần sau làm đúng nha, ghi sổ rồi đó 📒', 'Nể cái tâm, tha lần này 🙂'],
};
