"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteProductionOrderAction } from "@/actions/san-xuat-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/lib/form-state";
import { formatDate, formatQuantity } from "@/lib/format";
import { PRODUCTION_STATUS_LABELS } from "@/lib/labels";
import type { ProductionRow } from "@/lib/types";

export function DeleteProductionOrderDialog({
  order,
}: {
  order: ProductionRow;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, pending] = useActionState(
    deleteProductionOrderAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      setConfirmText("");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  const isConfirmed = confirmText.trim().toLowerCase() === "ok";
  const isCompleted = order.status === "hoan_thanh";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 h-8 w-8"
          aria-label="Xóa lệnh sản xuất"
          title="Xóa lệnh sản xuất (Admin)"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangleIcon className="size-5 shrink-0" />
            <span>Xác nhận xóa lệnh sản xuất</span>
          </DialogTitle>
          <DialogDescription>
            Thao tác này dành cho Quản trị viên (Admin) và không thể hoàn tác sau khi thực hiện.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={order.id} />

          {/* Chi tiết lệnh sản xuất */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-neutral-900 text-sm">
                {order.code}
              </span>
              <span className="font-medium text-neutral-600">
                {PRODUCTION_STATUS_LABELS[order.status]}
              </span>
            </div>
            <div className="font-semibold text-neutral-800">
              {order.product_name}{" "}
              <span className="font-mono text-neutral-500 text-[11px]">
                ({order.product_code})
              </span>
            </div>
            <div className="flex gap-4 text-neutral-600 font-mono">
              <span>
                Số lượng: <strong>{formatQuantity(order.quantity)} {order.product_unit}</strong>
              </span>
              <span>Ngày: {formatDate(order.planned_date)}</span>
            </div>
            {order.note && (
              <div className="text-neutral-700 italic border-t pt-1">
                Ghi chú: {order.note}
              </div>
            )}
          </div>

          {isCompleted && (
            <div className="rounded border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-800 space-y-1">
              <p className="font-semibold">⚠️ Cảnh báo: Lệnh này đã hoàn thành!</p>
              <p>
                Xóa lệnh sẽ tự động hủy các bút toán xuất kho nguyên liệu và nhập kho thành phẩm liên quan để hoàn tác lại tồn kho.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor={`confirm-order-${order.id}`} className="text-xs font-medium">
              Vui lòng gõ{" "}
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                ok
              </span>{" "}
              vào ô bên dưới để xác nhận xóa:
            </Label>
            <Input
              id={`confirm-order-${order.id}`}
              name="confirm_text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Gõ ok để xác nhận"
              autoComplete="off"
              className="text-sm font-mono"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Huỷ
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!isConfirmed || pending}
            >
              {pending ? (
                <>
                  <Loader2Icon className="size-3.5 animate-spin mr-1" />
                  Đang xóa…
                </>
              ) : (
                "Xác nhận xóa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
