# EcoBadminton First Anniversary RSVP - Design Specification

## 1. Mục tiêu

Xây dựng một landing page bằng Next.js, React và Tailwind CSS để:

- giới thiệu CLB EcoBadminton và dấu mốc một năm hoạt động;
- mời 20 đồng nghiệp tham dự tiệc sinh nhật CLB;
- cho khách chọn ảnh của mình, nhập đúng họ tên để xác minh nhẹ, rồi phản hồi tham dự hoặc không tham dự;
- cho khách để lại lời nhắn hoặc cảm nhận không bắt buộc;
- cung cấp trang quản trị có mật khẩu để xem trạng thái mới nhất và toàn bộ lịch sử phản hồi của từng người.

Website được deploy trên Vercel. Danh sách khách mời và ảnh nằm tĩnh trong project. Supabase chỉ lưu các lần gửi RSVP.

## 2. Thông tin sự kiện

- Tên sự kiện: Sinh nhật một năm EcoBadminton
- Thời gian: 19:00, ngày 17/09/2026
- Địa điểm: Nhậu Tự Do Mega Grand World
- Bản đồ: https://maps.app.goo.gl/RuNCYdPkAf9K5uS58
- Di chuyển: tự do
- Dress code: tự do

Thông tin này nằm trong một file cấu hình tĩnh để có thể sửa tập trung và deploy lại khi cần.

## 3. Phạm vi phiên bản đầu

### Trong phạm vi

- Landing page responsive cho desktop và mobile.
- Guest gallery gồm 20 ảnh có cùng tỉ lệ dọc 4:5.
- Mỗi guest card có ảnh, tên che một phần và radio chọn duy nhất.
- Xác minh tên phía server.
- RSVP gồm hai lựa chọn: tham dự hoặc không tham dự.
- Lời nhắn/cảm nhận không bắt buộc, tối đa 1.000 ký tự.
- Mỗi lần gửi tạo một bản ghi lịch sử mới; lần mới nhất quyết định trạng thái hiện tại.
- Trang `/admin` được bảo vệ bằng một mật khẩu dùng chung.
- Dashboard tổng quan và lịch sử RSVP theo từng người.

### Ngoài phạm vi

- Admin thêm, sửa hoặc xóa khách mời và ảnh.
- Khách tự tải ảnh lên.
- Supabase Auth hoặc tài khoản riêng cho admin.
- Xuất Excel/CSV, gửi email, gửi thông báo hoặc QR check-in.
- Tìm kiếm và phân trang guest gallery; 20 ảnh đủ nhỏ để dùng một grid cuộn.
- Xóa hoặc sửa các lần gửi RSVP trong admin.

## 4. Hướng hình ảnh

Phong cách được chọn là "Blue x Warm Ivory": tinh tế như thiệp mời sự kiện, có nhiều khoảng thở và vẫn giữ tinh thần thể thao hiện đại.

- Primary: `#012DCC`.
- Nền chính: ivory ấm, không dùng nền trắng phẳng toàn trang.
- Màu chữ phụ: xanh navy dịu để đảm bảo độ tương phản.
- Typography: serif có cá tính cho tiêu đề sự kiện, sans-serif rõ ràng cho nội dung và điều khiển.
- Hình khối: đường tròn/vòng cung gợi quả cầu và chuyển động của đường cầu.
- Motion: hiệu ứng tải trang và reveal theo section; tránh animation trang trí dày đặc.
- Ảnh khách: crop thống nhất 4:5 bằng `object-cover` và focal point có thể cấu hình theo từng ảnh nếu cần.

Thiết kế phải đảm bảo focus state, keyboard navigation, nhãn form, thông báo lỗi và độ tương phản đáp ứng accessibility cơ bản.

## 5. Cấu trúc trang công khai

Route `/` là một landing page cuộn ngắn gồm:

1. Hero: tên CLB, dấu mốc một năm, ngày giờ, địa điểm và CTA dẫn tới RSVP.
2. Câu chuyện CLB: đoạn giới thiệu ngắn về một năm hoạt động và tinh thần đồng đội.
3. Thông tin buổi tiệc: thời gian, địa điểm, di chuyển, dress code và nút mở Google Maps ở tab mới.
4. Dấu mốc một năm: typography lớn với số `01`, các hình khối gợi cầu lông và thông điệp ngắn về tinh thần đồng đội; không phụ thuộc vào bộ ảnh hoạt động riêng.
5. RSVP gallery: grid 20 khách mời và form xác nhận.
6. Footer: EcoBadminton và thông tin sự kiện tối giản.

Trên desktop, gallery ưu tiên 4-5 cột tùy chiều rộng. Trên mobile, gallery dùng 2 cột để ảnh vẫn đủ lớn. Toàn bộ gallery là một radio group có nhãn rõ ràng và chỉ cho chọn một khách.

## 6. Quy tắc tên che một phần

Trình duyệt không nhận tên đầy đủ. Server tạo tên hiển thị theo quy tắc cố định:

- giữ nguyên từ đầu tiên của họ tên;
- với mỗi từ còn lại, giữ ký tự đầu và thay mỗi ký tự còn lại bằng `*`;
- ví dụ `Nguyễn Văn An` trở thành `Nguyễn V** A*`.

Quy tắc này đủ để khách nhận diện kết hợp với ảnh nhưng không công khai toàn bộ tên.

## 7. Luồng RSVP

### Bước 1: chọn khách

- Khách chọn đúng một guest card bằng radio.
- CTA tiếp tục bị vô hiệu hóa khi chưa chọn ảnh.

### Bước 2: xác minh tên

- Form hiển thị lại ảnh và tên đã che của người được chọn.
- Khách nhập họ tên đầy đủ.
- Server chuẩn hóa hai giá trị bằng cách trim, gộp khoảng trắng liên tiếp và chuyển về lowercase theo Unicode.
- Dấu tiếng Việt vẫn phải khớp; hệ thống không loại bỏ dấu.
- Nếu khớp, server cấp một verification token có chữ ký, thời hạn 15 phút và gắn với `guest_id`.
- Nếu không khớp, trả thông báo chung: "Thông tin chưa khớp với ảnh đã chọn." Không trả lại tên đúng hoặc chi tiết phần sai.

### Bước 3: phản hồi

- Khách chọn `Tham dự` hoặc `Không tham dự`.
- Khách có thể nhập lời nhắn/cảm nhận không bắt buộc, tối đa 1.000 ký tự.
- Client gửi verification token, lựa chọn, lời nhắn và một `client_submission_id` UUID.
- Server validate payload và ghi một bản ghi mới vào Supabase.
- `client_submission_id` là duy nhất để retry do lỗi mạng không tạo bản ghi trùng ngoài ý muốn.

### Hoàn tất

- Nếu tham dự, màn hình cảm ơn nhắc lại thời gian, địa điểm và nút Google Maps.
- Nếu không tham dự, màn hình cảm ơn ghi nhận phản hồi một cách thân thiện.
- Cả hai trường hợp đều nói rõ rằng khách có thể gửi lại nếu kế hoạch thay đổi; lần gửi tiếp theo được lưu thành lịch sử mới.

## 8. Kiến trúc

Ứng dụng dùng Next.js App Router, React và Tailwind CSS.

### Dữ liệu tĩnh phía server

Guest records được lưu trong project, ví dụ `src/data/guests.ts`, và được đánh dấu server-only. Mỗi record gồm:

- `id`: định danh ổn định, không chứa họ tên;
- `fullName`: họ tên dùng để xác minh;
- `imagePath`: đường dẫn ảnh trong `public/guests`;
- `imagePosition`: tùy chọn để điều chỉnh focal point khi crop 4:5.

Public guest endpoint chỉ trả `id`, `maskedName`, `imagePath` và `imagePosition`.

### Next.js server

Next.js Route Handlers hoặc Server Actions đảm nhiệm:

- đọc guest data tĩnh;
- tạo tên đã che;
- xác minh họ tên;
- ký và kiểm tra verification token;
- validate và ghi RSVP bằng Supabase server credentials;
- đăng nhập/đăng xuất admin;
- kiểm tra admin session;
- tổng hợp trạng thái mới nhất và lịch sử RSVP.

Tên đầy đủ, mật khẩu admin, session secret và Supabase service credentials không được đưa vào client bundle.

### Supabase

Supabase không lưu danh sách khách hoặc ảnh. Bảng `rsvp_submissions` gồm:

| Cột | Kiểu | Quy tắc |
| --- | --- | --- |
| `id` | UUID | primary key, database tự tạo |
| `guest_id` | text | bắt buộc, phải tồn tại trong guest data tĩnh khi server ghi |
| `attending` | boolean | bắt buộc |
| `message` | text | nullable, tối đa 1.000 ký tự qua server validation |
| `client_submission_id` | UUID | bắt buộc, unique |
| `created_at` | timestamptz | database tự tạo |

Trạng thái hiện tại của khách là bản ghi có `created_at` mới nhất; nếu trùng thời gian hiếm gặp thì dùng `id` làm tie-breaker ổn định.

## 9. API và ranh giới dữ liệu

Các endpoint được chốt như sau:

- `GET /api/guests`: trả danh sách ảnh và tên che.
- `POST /api/rsvp/verify`: nhận `guest_id` và tên nhập, trả verification token khi khớp.
- `POST /api/rsvp`: nhận token, trạng thái, lời nhắn và submission ID; tạo lịch sử mới.
- `POST /api/admin/login`: kiểm tra mật khẩu và cấp session cookie.
- `POST /api/admin/logout`: hủy session cookie.
- `GET /api/admin/dashboard`: chỉ trả dữ liệu khi session hợp lệ.

Mọi endpoint thay đổi dữ liệu chỉ nhận JSON, validate phía server và trả mã lỗi có cấu trúc để UI hiển thị đúng vị trí.

## 10. Trang quản trị

Route `/admin` có hai trạng thái:

### Chưa đăng nhập

- Form một trường mật khẩu.
- Lỗi đăng nhập dùng thông báo chung.
- Không tải dữ liệu RSVP trước khi xác thực thành công.

### Đã đăng nhập

- Bốn số tổng quan: tổng khách, tham dự, không tham dự và chưa phản hồi.
- Bảng mỗi khách một dòng gồm họ tên đầy đủ, trạng thái mới nhất và thời gian gửi gần nhất.
- Khách chưa gửi vẫn xuất hiện nhờ đối chiếu guest data tĩnh.
- Mỗi dòng có thể mở rộng để hiển thị mọi lần gửi theo thứ tự mới nhất trước, gồm trạng thái, thời gian và cảm nhận.
- Có nút đăng xuất.

Dashboard desktop dùng table. Trên mobile, mỗi hàng chuyển thành card để không cần cuộn ngang khó đọc.

## 11. Bảo mật và quyền riêng tư

- Đây là xác minh nhẹ cho sự kiện nội bộ, không phải cơ chế định danh bảo mật cao.
- Tên đầy đủ không xuất hiện trong payload công khai hoặc client bundle.
- Supabase service credentials chỉ dùng trên server.
- `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `RSVP_VERIFICATION_SECRET`, `SUPABASE_URL` và `SUPABASE_SERVICE_ROLE_KEY` nằm trong biến môi trường Vercel.
- Admin session dùng cookie `httpOnly`, `secure`, `sameSite=lax`, có thời hạn 8 giờ và chữ ký chống sửa đổi.
- Verification token có thời hạn 15 phút, chỉ hợp lệ cho một `guest_id`.
- Input được trim, giới hạn độ dài và validate kiểu dữ liệu phía server.
- Thông báo xác minh không tiết lộ tên đúng.
- Không ghi họ tên nhập hoặc mật khẩu vào log.

## 12. Trạng thái lỗi

- Không chọn ảnh: hiển thị lỗi tại guest gallery và đưa focus về radio group.
- Tên trống hoặc không khớp: hiển thị lỗi ngay dưới trường tên.
- Chưa chọn trạng thái: hiển thị lỗi dưới nhóm lựa chọn RSVP.
- Message quá dài: hiển thị bộ đếm và chặn gửi.
- Verification token hết hạn: yêu cầu xác minh lại nhưng giữ lựa chọn ảnh.
- Network/Supabase lỗi: giữ nguyên nội dung form và cung cấp nút thử lại.
- RSVP thành công nhưng response bị mất: retry cùng `client_submission_id` trả kết quả thành công hiện có thay vì tạo bản ghi mới.
- Admin session hết hạn: chuyển về form đăng nhập mà không hiển thị dữ liệu cũ.

## 13. Testing

### Unit tests

- Chuẩn hóa tên với hoa/thường, khoảng trắng và dấu tiếng Việt.
- Tạo tên che theo quy tắc đã định.
- Ký, hết hạn và kiểm tra verification token.
- Chọn bản ghi mới nhất cho trạng thái hiện tại.
- Tổng hợp bốn số dashboard.

### Integration tests

- Public guest response không chứa `fullName`.
- Verify endpoint chấp nhận tên đúng và từ chối tên sai bằng thông báo chung.
- RSVP endpoint từ chối token sai/hết hạn và payload không hợp lệ.
- Retry cùng `client_submission_id` không tạo duplicate.
- Admin endpoints từ chối request không có session.
- Login, logout và session expiry hoạt động đúng.

### End-to-end tests

- Luồng đồng ý tham dự từ chọn ảnh tới màn hình cảm ơn.
- Luồng không tham dự với lời nhắn trống.
- Gửi lại cho cùng một guest tạo lịch sử mới và cập nhật trạng thái hiện tại.
- Admin nhìn thấy tổng quan, trạng thái mới nhất và lịch sử.
- Kiểm tra keyboard navigation, focus lỗi và layout ở desktop/mobile.

## 14. Tiêu chí hoàn thành

- Website chạy ổn trên Vercel bằng Next.js và Tailwind CSS.
- 20 guest cards hiển thị ảnh 4:5 nhất quán và chỉ tên che.
- Tên đúng được xác minh theo quy tắc; tên sai không làm lộ dữ liệu.
- Cả hai lựa chọn RSVP và lời nhắn không bắt buộc được lưu vào Supabase.
- Mỗi lần gửi hợp lệ tạo lịch sử mới, còn retry kỹ thuật không tạo duplicate.
- `/admin` được bảo vệ bằng mật khẩu và hiển thị đúng trạng thái mới nhất cùng lịch sử.
- Giao diện bám hướng Blue x Warm Ivory với primary `#012DCC`, responsive và có accessibility cơ bản.
