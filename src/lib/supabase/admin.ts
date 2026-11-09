import { createClient } from "@supabase/supabase-js";

// Client dùng secret key (service-role) cho Supabase Admin API: tạo/sửa tài khoản
// nhân viên, đặt lại mật khẩu. CHỈ import từ mã phía server ("use server" actions,
// route handlers). Không bao giờ import vào client component vì sẽ lộ secret key.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secretKey) {
    throw new Error(
      "Chưa cấu hình SUPABASE_SECRET_KEY nên không thể quản lý tài khoản nhân viên.",
    );
  }

  return createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
  );
}