"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircleIcon, DollarSignIcon, XCircleIcon } from "lucide-react";
import {
  cancelSalesOrderAction,
  confirmSalesOrderAction,
  paySalesOrderAction,
} from "@/actions/ban-hang-actions";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/format";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { SalesOrderRow } from "@/lib/types";

export function ConfirmSalesOrderButton({ order }: { order: SalesOrderRow }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await confirmSalesOrderAction(order.id);
      if (res.status === "error") {
        setError(res.message ?? "Có lỗi xảy ra khi xuất kho.");
      } else {
        setOpen(false);
      }
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-7.5 px-2.5 text-xs font-medium">
          <CheckCircleIcon className="size-3.5 mr-1" /> Xuất kho
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận xuất kho giao hàng?</AlertDialogTitle>
          <AlertDialogDescription>
            Hệ thống sẽ tự động kiểm tra tồn kho và trừ các mặt hàng trong đơn{" "}
            <strong>{order.code}</strong>. Thao tác này sẽ chuyển đơn sang trạng thái{" "}
            <strong>Đã giao hàng</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <Button onClick={handleConfirm} disabled={isPending}>
            {isPending ? "Đang xuất kho..." : "Xác nhận xuất kho"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function PaySalesOrderDialog({ order }: { order: SalesOrderRow }) {
  const [open, setOpen] = useState(false);
  const remaining = Math.max(order.total_amount - order.paid_amount, 0);

  const [state, formAction, isPending] = useActionState(
    async (prev: typeof INITIAL_FORM_STATE, data: FormData) => {
      const res = await paySalesOrderAction(prev, data);
      if (res.status === "success") setOpen(false);
      return res;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-50 h-7.5 px-2 text-xs font-medium">
          <DollarSignIcon className="size-3.5 mr-1" /> Thu tiền
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thu tiền đơn bán hàng {order.code}</DialogTitle>
          <DialogDescription>
            Khách hàng: <strong>{order.customer_name}</strong>
            <br />
            Tổng đơn: {formatCurrency(order.total_amount)} — Còn nợ:{" "}
            <strong className="text-rose-600">{formatCurrency(remaining)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="order_id" value={order.id} />

          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền thu (VNĐ) *</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              defaultValue={remaining}
              max={remaining}
              min={1000}
              step={1000}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Hình thức thanh toán</Label>
            <Select name="method" defaultValue="tien_mat">
              <SelectTrigger>
                <SelectValue placeholder="Chọn hình thức" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tien_mat">Tiền mặt</SelectItem>
                <SelectItem value="ngan_hang">Chuyển khoản ngân hàng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú phiếu thu</Label>
            <Input
              id="note"
              name="note"
              placeholder={`Thu tiền đơn bán ${order.code}`}
            />
          </div>

          {state.message && (
            <p
              className={`text-sm ${
                state.status === "error" ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {state.message}
            </p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Đang xử lý..." : "Xác nhận thu tiền"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelSalesOrderButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleCancel = () => {
    startTransition(async () => {
      await cancelSalesOrderAction(orderId);
      setOpen(false);
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-7.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50" title="Hủy đơn hàng">
          <XCircleIcon className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hủy đơn bán hàng?</AlertDialogTitle>
          <AlertDialogDescription>
            Đơn hàng sẽ chuyển sang trạng thái <strong>Đã hủy</strong>. Thao tác này không thể hoàn tác.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Bỏ qua</AlertDialogCancel>
          <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
            {isPending ? "Đang hủy..." : "Hủy đơn hàng"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
