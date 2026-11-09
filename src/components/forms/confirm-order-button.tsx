"use client";

import { useState, useTransition } from "react";
import { CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { confirmProductionAction } from "@/actions/san-xuat-actions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

export function ConfirmOrderButton({
  orderId,
  orderCode,
}: {
  orderId: string;
  orderCode: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await confirmProductionAction(orderId);
      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message ?? "Không thể xác nhận lệnh sản xuất.");
      }
    });
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline">
          <CheckCircle2Icon /> Xác nhận
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận hoàn thành {orderCode}?</AlertDialogTitle>
          <AlertDialogDescription>
            Hệ thống sẽ kiểm tra tồn nguyên liệu, tự động trừ kho theo công thức
            BOM và nhập thành phẩm vào kho. Thao tác này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Huỷ</AlertDialogCancel>
          <Button
            type="button"
            disabled={pending}
            onClick={handleConfirm}
          >
            {pending ? (
              <>
                <Loader2Icon className="animate-spin" /> Đang xử lý…
              </>
            ) : (
              "Xác nhận hoàn thành"
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
