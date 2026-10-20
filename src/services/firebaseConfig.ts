// Cấu hình Firebase của game (Firebase Console → Project settings → Your apps → Web app).
// Các giá trị này là công khai, không phải bí mật: dữ liệu được bảo vệ bởi Firestore rules
// (mẫu rules trong docs/DEPLOYMENT.md) và danh sách tên miền được phép đăng nhập trong Firebase Authentication.
// Để trống apiKey = tắt đăng nhập, game chạy ở chế độ khách (chỉ lưu trên máy).
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

export const isCloudEnabled = firebaseConfig.apiKey !== '';
