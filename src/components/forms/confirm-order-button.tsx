"use client";

import { useState, useTransition } from "react";
import { AlertCircleIcon, CheckCircle2Icon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { confirmProductionAction } from "@/actions/san-xuat-actions";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatQuantity } from "@/lib/format";

export function ConfirmOrderButton({
  orderId,
  orderCode,
  productName,
  plannedQuantity = 0,
  productUnit = "cái",
  canInputCost = false,
}: {
  orderId: string;
  orderCode: string;
  productName?: string;
  plannedQuantity?: number;
  productUnit?: string;
  canInputCost?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [actualQty, setActualQty] = useState(plannedQuantity > 0 ? plannedQuantity : 1);
  const [wasteQty, setWasteQty] = useState(0);
  const [laborCost, setLaborCost] = useState(0);
  const [otherCost, setOtherCost] = useState(0);
  const [note, setNote] = useState("");

  const totalProduced = actualQty + wasteQty;
  const wasteRate = totalProduced > 0 ? Math.round((wasteQty / totalProduced) * 1000) / 10 : 0;

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setActualQty(plannedQuantity > 0 ? plannedQuantity : 1);
      setWasteQty(0);
      setLaborCost(0);
      setOtherCost(0);
      setNote("");
    }
    setOpen(nextOpen);
  }

  function handleConfirm(e: React.FormEvent) {
    e.preventDefault();
    if (actualQty <= 0) {
      toast.error("Số lượng thực tế nhập kho phải lớn hơn 0.");
      return;
    }

    startTransition(async () => {
      const result = await confirmProductionAction(orderId, {
        actualQuantity: actualQty,
        wasteQuantity: wasteQty,
        laborCost,
        otherCost,
        note,
      });

      if (result.status === "success") {
        toast.success(result.message);
        setOpen(false);
      } else {
        toast.error(result.message ?? "Không thể nghiệm thu lệnh sản xuất.");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-emerald-700 hover:text-emerald-800">
          <CheckCircle2Icon className="text-emerald-600" /> Nghiệm thu
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleConfirm}>
          <DialogHeader>
            <DialogTitle>Nghiệm thu hoàn thành lệnh {orderCode}</DialogTitle>
            <DialogDescription>
              {productName ? `Thành phẩm: ${productName}. ` : ""}
              Kế hoạch ban đầu: {formatQuantity(plannedQuantity)} {productUnit}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`actual-${orderId}`}>
                  Sản lượng đạt ({productUnit}) <span className="text-rose-500">*</span>
                </Label>
                <Input
                  id={`actual-${orderId}`}
                  type="number"
                  min="0.001"
                  step="any"
                  value={actualQty}
                  onChange={(e) => setActualQty(parseFloat(e.target.value) || 0)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor={`waste-${orderId}`}>Hao hụt / Phế phẩm ({productUnit})</Label>
                <Input
                  id={`waste-${orderId}`}
                  type="number"
                  min="0"
                  step="any"
                  value={wasteQty}
                  onChange={(e) => setWasteQty(Math.max(0, parseFloat(e.target.value) || 0))}
                />
              </div>
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tỷ lệ hao hụt thực tế:</span>
                <Badge
                  variant={wasteRate > 5 ? "destructive" : wasteRate > 0 ? "outline" : "secondary"}
                >
                  {wasteRate}%
                </Badge>
              </div>
              {wasteRate > 5 && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-rose-600">
                  <AlertCircleIcon className="size-4 shrink-0" />
                  <span>Tỷ lệ hao hụt vượt định mức cho phép (&gt; 5%). Hãy kiểm tra kỹ nguyên nhân.</span>
                </div>
              )}
            </div>

            {canInputCost && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor={`labor-${orderId}`}>Chi phí nhân công (VNĐ)</Label>
                  <Input
                    id={`labor-${orderId}`}
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={laborCost || ""}
                    onChange={(e) => setLaborCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <p className="text-[11px] text-muted-foreground">Phân bổ lương công nhật/khoán</p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor={`other-${orderId}`}>Chi phí chung / khác (VNĐ)</Label>
                  <Input
                    id={`other-${orderId}`}
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="0"
                    value={otherCost || ""}
                    onChange={(e) => setOtherCost(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  />
                  <p className="text-[11px] text-muted-foreground">Điện nước, bao bì đóng gói</p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor={`note-${orderId}`}>Ghi chú nghiệm thu</Label>
              <Textarea
                id={`note-${orderId}`}
                rows={2}
                placeholder="Ghi nhận chất lượng mẻ sản xuất, lý do phế phẩm (nếu có)..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Đóng
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang nghiệm thu…
                </>
              ) : (
                "Xác nhận & Nhập kho"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
