"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createProductionOrderAction } from "@/actions/san-xuat-actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/form-state";
import { todayISO } from "@/lib/format";
import type { Item } from "@/lib/types";

export function ProductionOrderDialog({ products }: { products: Item[] }) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createProductionOrderAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
      setProductId("");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Tạo lệnh sản xuất
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tạo lệnh sản xuất</DialogTitle>
          <DialogDescription>
            Lệnh sẽ ở trạng thái chờ xác nhận cho đến khi bạn bấm hoàn thành.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Mặt hàng sản xuất</Label>
            <Select
              name="product_id"
              value={productId}
              onValueChange={setProductId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn thành phẩm / bán thành phẩm" />
              </SelectTrigger>
              <SelectContent>
                {products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.type === "ban_thanh_pham" ? "[BTP] " : "[TP] "}
                    {product.code} — {product.name} ({product.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {products.length === 0 && (
              <p className="text-xs text-rose-600">
                Chưa có mặt hàng sản xuất. Hãy thêm trong Danh mục hàng hóa.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="order-quantity">Số lượng</Label>
              <Input
                id="order-quantity"
                name="quantity"
                type="number"
                min={0.001}
                step="0.001"
                placeholder="VD: 20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order-date">Ngày kế hoạch</Label>
              <Input
                id="order-date"
                name="planned_date"
                type="date"
                defaultValue={todayISO()}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="order-note">Ghi chú</Label>
            <Textarea id="order-note" name="note" rows={2} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending || !productId}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang tạo…
                </>
              ) : (
                "Tạo lệnh"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
