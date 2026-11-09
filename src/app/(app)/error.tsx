"use client";

import { AlertTriangleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto grid size-12 place-items-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangleIcon className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold">Không tải được dữ liệu</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {error.message ||
          "Đã xảy ra lỗi khi truy vấn Supabase. Kiểm tra lại cấu hình và bảng dữ liệu."}
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset}>Thử lại</Button>
      </div>
    </div>
  );
}
