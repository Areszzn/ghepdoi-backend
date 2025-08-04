# Admin Panel - Hệ thống quản lý Nạp/Rút tiền

## Mô tả
Trang web admin để quản lý dữ liệu trong hệ thống nạp/rút tiền, bao gồm:
- Quản lý Users
- Quản lý Tài khoản Ngân hàng
- Quản lý Giao dịch
- Quản lý Cài đặt hệ thống

## Cấu trúc thư mục
```
admin/
├── index.html          # Trang dashboard chính
├── login.html          # Trang đăng nhập
├── users.html          # Quản lý users
├── banks.html          # Quản lý tài khoản ngân hàng
├── transactions.html   # Quản lý giao dịch
├── settings.html       # Quản lý cài đặt
├── css/
│   └── style.css       # CSS chính
├── js/
│   ├── config.js       # Cấu hình API
│   ├── auth.js         # Xác thực
│   ├── dashboard.js    # Dashboard
│   ├── users.js        # Quản lý users
│   ├── banks.js        # Quản lý banks
│   ├── transactions.js # Quản lý transactions
│   └── settings.js     # Quản lý settings
└── README.md           # File này
```

## Cài đặt và chạy

### 1. Khởi động Backend
Trước tiên, đảm bảo backend đang chạy:
```bash
cd backend
npm install
npm run dev
```
Backend sẽ chạy trên port 5000.

### 2. Mở Admin Panel
Có nhiều cách để mở admin panel:

#### Cách 1: Mở trực tiếp file HTML
- Mở file `admin/index.html` bằng trình duyệt
- Hoặc mở `admin/login.html` để đăng nhập

#### Cách 2: Sử dụng Live Server (khuyến nghị)
Nếu bạn sử dụng VS Code:
1. Cài đặt extension "Live Server"
2. Click chuột phải vào file `admin/index.html`
3. Chọn "Open with Live Server"

#### Cách 3: Sử dụng HTTP Server
```bash
# Cài đặt http-server globally
npm install -g http-server

# Chạy từ thư mục admin
cd admin
http-server -p 8080

# Truy cập http://localhost:8080
```

## Đăng nhập
- Username: `admin`
- Password: `admin` (hoặc password bạn đã tạo trong database)

## Tính năng

### Dashboard
- Hiển thị thống kê tổng quan
- Danh sách giao dịch gần đây
- Danh sách users mới

### Quản lý Users
- Xem danh sách tất cả users
- Thêm user mới
- Sửa thông tin user
- Xóa user
- Quản lý số dư, VIP level, trust score

### Quản lý Tài khoản Ngân hàng
- Xem danh sách tất cả tài khoản ngân hàng
- Thêm tài khoản ngân hàng mới
- Sửa thông tin tài khoản
- Xóa tài khoản

### Quản lý Giao dịch
- Xem danh sách tất cả giao dịch
- Lọc theo trạng thái, loại giao dịch, user
- Thêm giao dịch mới
- Sửa thông tin giao dịch
- Xóa giao dịch
- Cập nhật trạng thái giao dịch

### Quản lý Cài đặt
- Xem danh sách cài đặt hệ thống
- Thêm cài đặt mới
- Sửa giá trị cài đặt
- Xóa cài đặt
- Cài đặt nhanh cho các giá trị thường dùng

## API Endpoints
Admin panel sử dụng các API endpoints sau:

### Authentication
- `POST /api/auth/login` - Đăng nhập

### Users
- `GET /api/users` - Lấy danh sách users
- `GET /api/users/:id` - Lấy thông tin user
- `POST /api/users` - Tạo user mới
- `PUT /api/users/:id` - Cập nhật user
- `DELETE /api/users/:id` - Xóa user

### Bank Accounts
- `GET /api/bank-accounts?admin=true` - Lấy danh sách tài khoản
- `GET /api/bank-accounts/:id` - Lấy thông tin tài khoản
- `POST /api/bank-accounts/admin` - Tạo tài khoản mới
- `PUT /api/bank-accounts/:id` - Cập nhật tài khoản
- `DELETE /api/bank-accounts/:id` - Xóa tài khoản

### Transactions
- `GET /api/transactions?admin=true` - Lấy danh sách giao dịch
- `GET /api/transactions/:id` - Lấy thông tin giao dịch
- `POST /api/transactions/admin` - Tạo giao dịch mới
- `PUT /api/transactions/:id` - Cập nhật giao dịch
- `DELETE /api/transactions/:id` - Xóa giao dịch

### Settings
- `GET /api/settings` - Lấy danh sách cài đặt
- `GET /api/settings/:name` - Lấy cài đặt theo tên
- `POST /api/settings` - Tạo cài đặt mới
- `PUT /api/settings/:name` - Cập nhật cài đặt
- `DELETE /api/settings/:name` - Xóa cài đặt

## Lưu ý
1. Đảm bảo backend đang chạy trước khi sử dụng admin panel
2. Token xác thực được lưu trong localStorage
3. Admin panel sử dụng CORS, đảm bảo backend đã cấu hình đúng
4. Tất cả các thao tác đều yêu cầu xác thực

## Troubleshooting

### Lỗi CORS
Nếu gặp lỗi CORS, kiểm tra:
1. Backend có đang chạy không
2. URL trong `admin/js/config.js` có đúng không
3. Backend đã cấu hình CORS cho admin panel chưa

### Lỗi 401 Unauthorized
- Kiểm tra token có hợp lệ không
- Thử đăng nhập lại

### Không load được dữ liệu
- Kiểm tra console browser để xem lỗi
- Kiểm tra network tab để xem API calls
- Đảm bảo database có dữ liệu
