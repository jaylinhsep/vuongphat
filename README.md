# Vương Phát ERP

Webapp quản trị nội bộ gồm 5 phân hệ: **Tổng quan**, **Kho**, **Sản xuất**, **Kế toán**,
**Nhân sự** (kèm trang **Việc của tôi** cho mọi nhân viên).
Xây dựng bằng Next.js 15 (App Router) + Server Actions, Tailwind CSS v4 + shadcn/ui,
Supabase (Auth, Postgres + RLS, RPC) và xuất báo cáo Excel.

## Chạy nhanh (chế độ demo)

```bash
npm install
npm run dev
```

Mở http://localhost:3000. Khi chưa cấu hình biến môi trường Supabase, ứng dụng chạy ở
**chế độ demo**: dữ liệu mẫu (hàng hóa, tồn kho, BOM, lệnh sản xuất, sổ quỹ) lưu trong
bộ nhớ máy chủ và có thể đổi vai trò ngay trong menu tài khoản để xem phân quyền.

> Dữ liệu demo được reset khi khởi động lại máy chủ.

## Kết nối Supabase

1. Tạo dự án tại [supabase.com](https://supabase.com).
2. Mở **SQL Editor**, dán toàn bộ nội dung [`sql/schema.sql`](sql/schema.sql) và chạy.
   File này tạo enum, bảng, view, trigger, RLS policy và các RPC:
   - `create_stock_movement` — ghi phiếu nhập/xuất/điều chỉnh (chặn xuất quá tồn).
   - `save_bom` — lưu công thức định lượng (BOM).
   - `confirm_production` — xác nhận lệnh sản xuất: trừ nguyên liệu theo BOM và
     nhập thành phẩm trong một transaction, có khoá dòng để tránh tranh chấp.
   - `calculate_payroll` — tính lương theo kỳ (tháng): ngày công × lương ngày + phụ cấp.
3. Tạo người dùng trong **Authentication → Users** (hoặc bật đăng ký). Trigger
   `handle_new_user` tự tạo hồ sơ trong `profiles` với vai trò mặc định `kho`.
4. Gán vai trò quản trị (chạy trong SQL Editor):

   ```sql
   update public.profiles set role = 'admin' where id = '<UUID người dùng>';
   ```

   Vai trò hợp lệ: `admin`, `kho`, `san_xuat`, `ke_toan`.
5. Sao chép `.env.example` thành `.env.local` và điền:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   # Tuỳ chọn — chỉ cần cho phân hệ Nhân sự (tạo/sửa tài khoản, đặt lại mật khẩu):
   SUPABASE_SECRET_KEY=<secret-key>
   ```

   `SUPABASE_SECRET_KEY` (service-role) chỉ dùng phía server trong Server Actions của
   phân hệ Nhân sự, không bao giờ gửi xuống trình duyệt. Thiếu key này, các chức năng
   quản lý tài khoản nhân viên sẽ báo lỗi cấu hình; phần còn lại của ứng dụng vẫn chạy
   bình thường.

6. Khởi động lại `npm run dev`. Ứng dụng tự chuyển sang Supabase và yêu cầu đăng nhập.

## Phân quyền

| Phân hệ | Admin | Kho | Sản xuất | Kế toán |
| --- | --- | --- | --- | --- |
| Tổng quan (dashboard) | ✓ | | | |
| Tồn kho, lịch sử phiếu | ✓ | ✓ | | ✓ (chỉ xem) |
| Tạo phiếu kho, danh mục | ✓ | ✓ | | |
| Lệnh sản xuất, công thức BOM | ✓ | | ✓ | |
| Sổ quỹ thu chi, xuất Excel | ✓ | | | ✓ |
| Việc của tôi (nhiệm vụ được giao) | ✓ | ✓ | ✓ | ✓ |
| Nhân sự: hồ sơ, giao việc, chấm công, bảng lương | ✓ | | | |

Phân quyền được áp dụng ở 3 lớp: điều hướng/ẩn nút trên UI, kiểm tra vai trò trong
Server Action (`requireRole`), và RLS policy trong Postgres.

## Nghiệp vụ chính

- **Tồn kho** = `SUM(quantity)` trên `stock_movements`; `quantity` có dấu
  (nhập dương, xuất âm), view `item_stock` tính tồn theo thời gian thực.
- **Định mức tồn**: mặt hàng có tồn ≤ `min_stock` được đánh dấu "dưới định mức".
- **Xác nhận lệnh sản xuất**: hệ thống tính lượng nguyên liệu cần
  `định lượng × số lượng lệnh / số lượng đầu ra của BOM`, kiểm tra đủ tồn, ghi phiếu
  `san_xuat_tieu_hao` (âm) và `san_xuat_nhap` (dương, đơn giá = tổng chi phí nguyên liệu
  / số lượng thành phẩm).
- **Sổ quỹ**: lọc theo khoảng ngày và loại thu/chi; xuất Excel theo đúng bộ lọc
  (`/api/ke-toan/excel`).
- **Nhân sự** (chỉ Admin): quản lý hồ sơ nhân viên (email, mật khẩu, điện thoại, địa chỉ,
  lương ngày), giao nhiệm vụ hằng ngày, chấm công và tính lương. Lương theo kỳ
  `YYYY-MM` = `tổng ngày công × lương ngày + tổng phụ cấp/điều chỉnh` (RPC
  `calculate_payroll`). Nhân viên tự đánh dấu hoàn thành nhiệm vụ tại **Việc của tôi**;
  RLS chỉ cho sửa nhiệm vụ của chính mình.

## Cấu trúc chính

```
src/
├─ app/
│  ├─ (app)/            # layout yêu cầu đăng nhập + shell điều hướng
│  │  ├─ page.tsx       # Tổng quan (admin)
│  │  ├─ kho/           # Tồn kho, Nhập/xuất, Danh mục
│  │  ├─ san-xuat/      # Lệnh sản xuất, Công thức BOM
│  │  ├─ ke-toan/       # Sổ quỹ + xuất Excel
│  │  ├─ nhan-su/       # Hồ sơ NV, Giao việc, Chấm công, Bảng lương (admin)
│  │  └─ cong-viec/     # Việc của tôi (mọi nhân viên)
│  ├─ api/ke-toan/excel # Route handler xuất .xlsx
│  └─ login/
├─ actions/             # Server Actions theo phân hệ
├─ components/          # UI kit, shell, form nghiệp vụ
└─ lib/
   ├─ queries.ts        # Lớp đọc dữ liệu (Supabase hoặc demo)
   ├─ demo/store.ts     # Dữ liệu demo trong bộ nhớ
   ├─ labels.ts         # Nhãn tiếng Việt + phân quyền
   └─ supabase/         # Client/Server client, admin client (secret key) + middleware
sql/schema.sql          # Toàn bộ migration Supabase
```

## Triển khai Vercel

1. Push mã nguồn lên GitHub, import vào Vercel.
2. Khai báo `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong
   **Project Settings → Environment Variables**. Thêm `SUPABASE_SECRET_KEY` (server-only,
   không có tiền tố `NEXT_PUBLIC_`) nếu dùng phân hệ Nhân sự.
3. Trong Supabase **Authentication → URL Configuration**, đặt Site URL về tên miền Vercel.
4. Deploy. Middleware sẽ tự refresh session và chuyển người chưa đăng nhập về `/login`.

## Ghi chú

- Mọi thao tác nghiệp vụ (kho, sản xuất, kế toán, chấm công, tính lương) đều qua
  RLS/RPC với phiên đăng nhập của người dùng. Riêng quản lý tài khoản nhân viên
  (tạo/sửa email, đặt lại mật khẩu) dùng `SUPABASE_SECRET_KEY` (service-role) **chỉ phía
  server** trong Server Actions của phân hệ Nhân sự; key không có tiền tố `NEXT_PUBLIC_`
  nên không bao giờ bị đóng gói xuống trình duyệt.
- `sql/schema.sql` đã được chạy thành công trên dự án Supabase thật ngày 2026-11-09
  (11 bảng, 4 RPC, RLS đầy đủ). Khi nâng cấp schema, chạy lại file này: các câu lệnh
  đều idempotent (`create if not exists`, `drop ... if exists` trước khi tạo lại).
