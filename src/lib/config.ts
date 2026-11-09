export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export const DEMO_ROLE_COOKIE = "demo_role";

// Miền email của các tài khoản thử nghiệm; người dùng có thể đăng nhập bằng
// tên trần (admin, kho, …) và hệ thống tự ghép miền này.
export const DEFAULT_LOGIN_DOMAIN = "vuongphat.test";
