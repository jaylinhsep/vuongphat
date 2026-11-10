"use client";

import { useActionState, useState } from "react";
import { PlusIcon, Trash2Icon, TruckIcon } from "lucide-react";
import { createPurchaseOrderAction } from "@/actions/mua-hang-actions";
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
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, todayISO } from "@/lib/format";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { InventoryItem, Supplier } from "@/lib/types";

type OrderLine = {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number;
};

export function CreatePurchaseOrderDialog({
  suppliers,
  items,
}: {
  suppliers: Supplier[];
  items: InventoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([
    { id: "line-1", itemId: "", quantity: 1, unitPrice: 0 },
  ]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: `line-${Date.now()}`, itemId: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((prev) => (prev.length > 1 ? prev.filter((l) => l.id !== id) : prev));
  };

  const updateItem = (id: string, itemId: string) => {
    const selected = items.find((i) => i.id === itemId);
    setLines((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              itemId,
              unitPrice: selected ? selected.unit_price : 0,
            }
          : l,
      ),
    );
  };

  const updateQuantity = (id: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: Math.max(quantity, 0.1) } : l)),
    );
  };

  const updateUnitPrice = (id: string, unitPrice: number) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, unitPrice: Math.max(unitPrice, 0) } : l)),
    );
  };

  const totalAmount = lines.reduce(
    (sum, l) => sum + (l.quantity || 0) * (l.unitPrice || 0),
    0,
  );

  const [state, formAction, isPending] = useActionState(
    async (prev: typeof INITIAL_FORM_STATE, data: FormData) => {
      data.set(
        "items",
        JSON.stringify(
          lines
            .filter((l) => l.itemId && l.quantity > 0)
            .map((l) => ({
              itemId: l.itemId,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
            })),
        ),
      );
      const res = await createPurchaseOrderAction(prev, data);
      if (res.status === "success") {
        setOpen(false);
        setLines([{ id: "line-1", itemId: "", quantity: 1, unitPrice: 0 }]);
      }
      return res;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Tạo đơn mua hàng
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TruckIcon className="size-5 text-primary" /> Lập đơn đặt mua hàng mới
          </DialogTitle>
          <DialogDescription>
            Tạo đơn đặt mua nguyên vật liệu, hàng hóa từ nhà cung cấp.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="supplier_id">Nhà cung cấp *</Label>
              <Select name="supplier_id" required>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn nhà cung cấp" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name} {s.phone ? `(${s.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_date">Ngày đặt *</Label>
              <Input
                id="order_date"
                name="order_date"
                type="date"
                defaultValue={todayISO()}
                required
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Danh sách nguyên vật liệu / hàng mua *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-7 text-xs"
              >
                <PlusIcon className="size-3" /> Thêm mặt hàng
              </Button>
            </div>

            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {lines.map((line, idx) => {
                const selectedItem = items.find((i) => i.id === line.itemId);
                return (
                  <div
                    key={line.id}
                    className="flex items-center gap-2 rounded-md border p-2 bg-neutral-50/50"
                  >
                    <span className="w-5 text-center text-xs text-neutral-500 font-mono">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <Select
                        value={line.itemId}
                        onValueChange={(val) => updateItem(line.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Chọn nguyên liệu" />
                        </SelectTrigger>
                        <SelectContent>
                          {items.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                              {item.name} ({item.code}) — Tồn: {item.on_hand} {item.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="w-24">
                      <Input
                        type="number"
                        placeholder="SL"
                        value={line.quantity}
                        min={0.1}
                        step={0.1}
                        onChange={(e) =>
                          updateQuantity(line.id, parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right font-medium"
                      />
                    </div>

                    <span className="w-10 text-xs text-neutral-600 text-center">
                      {selectedItem?.unit ?? "—"}
                    </span>

                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="Đơn giá"
                        value={line.unitPrice}
                        min={0}
                        step={1000}
                        onChange={(e) =>
                          updateUnitPrice(line.id, parseFloat(e.target.value) || 0)
                        }
                        className="h-8 text-xs text-right"
                      />
                    </div>

                    <div className="w-28 text-right font-semibold text-xs text-neutral-900">
                      {formatCurrency(line.quantity * line.unitPrice)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 text-neutral-400 hover:text-rose-600"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center rounded-lg border bg-neutral-100/70 p-3">
              <span className="font-semibold text-sm">Tổng cộng đơn mua:</span>
              <span className="text-xl font-bold text-blue-700">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú đơn mua</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Thời gian nhà cung cấp giao, điều khoản thanh toán..."
              className="h-16"
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
              {isPending ? "Đang tạo..." : "Tạo đơn mua hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
