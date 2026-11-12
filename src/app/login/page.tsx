import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightIcon, InfoIcon, ShieldCheckIcon } from "lucide-react";
import { LoginForm } from "@/components/login-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { HOME_PATH } from "@/lib/labels";

export default async function LoginPage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    const user = await getCurrentUser();
    if (user) redirect(HOME_PATH[user.role]);
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="absolute -top-24 -right-24 size-80 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-white/10" />

        <div className="relative flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-white/15 text-base font-bold backdrop-blur">
            VP
          </span>
          <div>
            <p className="text-sm font-semibold">VƯỢNG PHÁT INK</p>
            <p className="text-xs text-primary-foreground/70">
              Hệ thống quản trị nội bộ
            </p>
          </div>
        </div>

        <div className="relative max-w-md space-y-4">
          <h1 className="text-3xl font-semibold leading-tight">
            Quản trị kho, sản xuất và dòng tiền trong một hệ thống.
          </h1>
          <p className="text-sm leading-relaxed text-primary-foreground/80">
            Kiểm soát tồn kho theo thời gian thực, tự động trừ nguyên liệu theo
            công thức định lượng và theo dõi sổ quỹ thu chi minh bạch.
          </p>
          <ul className="space-y-2 text-sm text-primary-foreground/90">
            <li className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4" /> Phân quyền theo vai trò
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4" /> Dữ liệu bảo vệ bởi Supabase RLS
            </li>
            <li className="flex items-center gap-2">
              <ShieldCheckIcon className="size-4" /> Xuất báo cáo Excel cho kế toán
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} VƯỢNG PHÁT INK. Bản quyền nội bộ.
        </p>
      </div>

      <div className="flex items-center justify-center bg-muted/40 p-6">
        <Card className="w-full max-w-md shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">
              {configured ? "Đăng nhập hệ thống" : "Chế độ demo"}
            </CardTitle>
            <CardDescription>
              {configured
                ? "Sử dụng tài khoản được cấp bởi quản trị viên."
                : "Ứng dụng chưa kết nối Supabase nên đang chạy bằng dữ liệu mẫu trong bộ nhớ."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {configured ? (
              <LoginForm />
            ) : (
              <>
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  <InfoIcon className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Dữ liệu demo chỉ lưu tạm trong bộ nhớ máy chủ. Bạn có thể
                    chuyển vai trò Quản trị / Kho / Sản xuất / Kế toán ngay
                    trong menu tài khoản để xem giao diện phân quyền.
                  </p>
                </div>
                <Button asChild className="w-full">
                  <Link href="/">
                    Vào giao diện demo <ArrowRightIcon />
                  </Link>
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Điền biến môi trường Supabase trong{" "}
                  <code className="rounded bg-muted px-1">.env.local</code> để
                  bật đăng nhập thật.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
