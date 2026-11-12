"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { EditIcon, FlaskConicalIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { updateProductionOrderAction } from "@/actions/san-xuat-actions";
import { ItemCombobox } from "@/components/forms/item-combobox";
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
import { initialFormState } from "@/lib/form-state";
import { formatQuantity } from "@/lib/format";
import type { BomRow, Item, ProductionRow } from "@/lib/types";

export function EditProductionOrderDialog({
  order,
  products,
  boms = [],
}: {
  order: ProductionRow;
  products: Item[];
  boms?: BomRow[];
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState(order.product_id);
  const [quantity, setQuantity] = useState(String(order.quantity));
  const [plannedDate, setPlannedDate] = useState(
    order.planned_date ? order.planned_date.slice(0, 10) : "",
  );
  const [note, setNote] = useState(order.note || "");

  const [state, formAction, pending] = useActionState(
    updateProductionOrderAction,
    initialFormState,
  );

  useEffect(() => {
    if (open) {
      setProductId(order.product_id);
      setQuantity(String(order.quantity));
      setPlannedDate(order.planned_date ? order.planned_date.slice(0, 10) : "");
      setNote(order.note || "");
    }
  }, [open, order]);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  const isPendingOrder = order.status === "cho_xac_nhan";

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  const currentBom = useMemo(
    () => boms.find((b) => b.product_id === productId),
    [boms, productId],
  );

  const bomBatchSize = currentBom ? currentBom.output_quantity : null;
  const unitLabel = selectedProduct?.unit || order.product_unit || "kg";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 h-8 w-8"
          aria-label="Sửa lệnh sản xuất"
          title="Sửa lệnh sản xuất (Admin)"
        >
          <EditIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EditIcon className="size-5 text-primary" />
            <span>Sửa lệnh sản xuất {order.code}</span>
          </DialogTitle>
          <DialogDescription>
            {isPendingOrder
              ? "Cập nhật thành phẩm, số lượng, ngày kế hoạch và ghi chú lệnh."
              : "Lệnh đã hoàn thành: chỉ cho phép chỉnh sửa ngày kế hoạch và ghi chú."}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={order.id} />
          <input type="hidden" name="product_id" value={productId} />

          {/* Chọn thành phẩm */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mặt hàng sản xuất *</Label>
            {isPendingOrder ? (
              <ItemCombobox
                items={products}
                value={productId}
                onChange={setProductId}
                placeholder="Gõ tên hoặc mã thành phẩm..."
              />
            ) : (
              <div className="rounded border bg-neutral-100 px-3 py-2 text-xs font-medium text-neutral-800">
                {order.product_name} ({order.product_code})
              </div>
            )}
            {bomBatchSize && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <FlaskConicalIcon className="size-3.5 shrink-0" />
                <span>
                  Công thức BOM: <strong>{formatQuantity(bomBatchSize)} {unitLabel}/mẻ</strong>
                </span>
              </div>
            )}
          </div>

          {/* Số lượng */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`edit-qty-${order.id}`} className="text-xs font-semibold">
                Số lượng cần sản xuất ({unitLabel}) *
              </Label>
              {isPendingOrder && bomBatchSize && (
                <div className="flex items-center gap-1 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setQuantity(String(bomBatchSize))}
                    className="text-primary hover:underline font-mono"
                  >
                    1 mẻ ({bomBatchSize})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity(String(bomBatchSize * 2))}
                    className="text-primary hover:underline font-mono"
                  >
                    2 mẻ ({bomBatchSize * 2})
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuantity(String(bomBatchSize * 3))}
                    className="text-primary hover:underline font-mono"
                  >
                    3 mẻ ({bomBatchSize * 3})
                  </button>
                </div>
              )}
            </div>
            {isPendingOrder ? (
              <div className="relative">
                <Input
                  id={`edit-qty-${order.id}`}
                  name="quantity"
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="pr-12 font-mono font-semibold"
                />
                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs font-mono text-muted-foreground uppercase">
                  {unitLabel}
                </span>
              </div>
            ) : (
              <div className="rounded border bg-neutral-100 px-3 py-2 text-xs font-mono font-semibold text-neutral-800">
                {formatQuantity(order.quantity)} {unitLabel} (Đã hoàn thành - không thể đổi)
              </div>
            )}
          </div>

          {/* Ngày kế hoạch */}
          <div className="space-y-1.5">
            <Label htmlFor={`edit-date-${order.id}`} className="text-xs font-semibold">
              Ngày kế hoạch *
            </Label>
            <Input
              id={`edit-date-${order.id}`}
              name="planned_date"
              type="date"
              required
              value={plannedDate}
              onChange={(e) => setPlannedDate(e.target.value)}
            />
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor={`edit-note-${order.id}`} className="text-xs font-semibold">
                Ghi chú lệnh
              </Label>
              {quantity && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  {bomBatchSize && (
                    <button
                      type="button"
                      onClick={() =>
                        setNote(
                          `${formatQuantity(bomBatchSize)}${unitLabel.toLowerCase()} X ${
                            Math.ceil(parseFloat(quantity) / bomBatchSize) || 1
                          } mẻ`
                        )
                      }
                      className="text-primary hover:underline font-semibold"
                    >
                      + {formatQuantity(bomBatchSize)}{unitLabel.toLowerCase()} X {Math.ceil(parseFloat(quantity) / bomBatchSize) || 1} mẻ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNote(`${quantity}${unitLabel.toLowerCase()} X 1 mẻ`)}
                    className="text-neutral-500 hover:underline"
                  >
                    + {quantity}{unitLabel.toLowerCase()} X 1 mẻ
                  </button>
                </div>
              )}
            </div>
            <Textarea
              id={`edit-note-${order.id}`}
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="VD: 170kg X 3 mẻ, Ưu tiên giao sớm..."
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Huỷ
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={pending || (isPendingOrder && (!productId || !quantity))}
            >
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin size-3.5 mr-1" /> Đang lưu…
                </>
              ) : (
                "Lưu thay đổi"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
