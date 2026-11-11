"use client";

import { useActionState, useState } from "react";
import { PlusIcon, Trash2Icon, ShoppingCartIcon } from "lucide-react";
import { createSalesOrderAction } from "@/actions/ban-hang-actions";
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
import { INITIAL_FORM_STATE, type FormState } from "@/lib/form-state";
import type { Customer, InventoryItem } from "@/lib/types";

type OrderLine = {
  id: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
};

export function CreateSalesOrderDialog({
  customers,
  items,
}: {
  customers: Customer[];
  items: InventoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<OrderLine[]>([
    { id: "line-1", itemId: "", quantity: "1", unitPrice: "0" },
  ]);

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { id: `line-${Date.now()}`, itemId: "", quantity: "1", unitPrice: "0" },
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
              unitPrice: selected ? String(selected.unit_price) : l.unitPrice,
            }
          : l,
      ),
    );
  };

  const updateQuantity = (id: string, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, quantity: value } : l)),
    );
  };

  const updateUnitPrice = (id: string, value: string) => {
    setLines((prev) =>
      prev.map((l) => (l.id === id ? { ...l, unitPrice: value } : l)),
    );
  };

  const totalAmount = lines.reduce((sum, l) => {
    const q = parseFloat(l.quantity) || 0;
    const p = parseFloat(l.unitPrice) || 0;
    return sum + q * p;
  }, 0);

  const [state, formAction, isPending] = useActionState(
    async (prev: FormState, data: FormData): Promise<FormState> => {
      const validLines = lines
        .filter((l) => l.itemId && (parseFloat(l.quantity) || 0) > 0)
        .map((l) => ({
          itemId: l.itemId,
          quantity: parseFloat(l.quantity) || 0,
          unitPrice: Math.max(parseFloat(l.unitPrice) || 0, 0),
        }));

      if (validLines.length === 0) {
        return {
          status: "error",
          message: "Vui lòng chọn ít nhất một mặt hàng và nhập số lượng lớn hơn 0.",
        };
      }

      data.set("items", JSON.stringify(validLines));
      const res = await createSalesOrderAction(prev, data);
      if (res.status === "success") {
        setOpen(false);
        setLines([{ id: "line-1", itemId: "", quantity: "1", unitPrice: "0" }]);
      }
      return res;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon className="size-4" /> Tạo đơn bán hàng
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-w-4xl w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShoppingCartIcon className="size-5 text-primary" /> Tạo đơn bán hàng mới
          </DialogTitle>
          <DialogDescription>
            Lập đơn hàng bán thành phẩm / hàng hóa cho khách hàng.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="customer_id">Khách hàng *</Label>
              <Select name="customer_id" required>
                <SelectTrigger id="customer_id" className="w-full">
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ""}
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

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-sm">
                Danh sách mặt hàng bán *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-8 text-xs"
              >
                <PlusIcon className="size-3.5" /> Thêm mặt hàng
              </Button>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-card">
              <div className="min-w-[640px]">
                {/* Header hàng */}
                <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                  <span className="w-8 text-center">STT</span>
                  <span className="flex-1">Mặt hàng</span>
                  <span className="w-24 text-right">Số lượng</span>
                  <span className="w-16 text-center">ĐVT</span>
                  <span className="w-32 text-right">Đơn giá (đ)</span>
                  <span className="w-32 text-right">Thành tiền</span>
                  <span className="w-9 text-center"></span>
                </div>

                {/* Danh sách các dòng mặt hàng */}
                <div className="max-h-72 divide-y overflow-y-auto">
                  {lines.map((line, idx) => {
                    const selectedItem = items.find((i) => i.id === line.itemId);
                    const numQty = parseFloat(line.quantity) || 0;
                    const numPrice = parseFloat(line.unitPrice) || 0;
                    const lineTotal = numQty * numPrice;

                    return (
                      <div
                        key={line.id}
                        className="flex items-center gap-2 px-3 py-2 hover:bg-muted/20 transition-colors"
                      >
                        <span className="w-8 text-center text-xs font-mono text-muted-foreground">
                          {idx + 1}
                        </span>

                        <div className="flex-1">
                          <Select
                            value={line.itemId}
                            onValueChange={(val) => updateItem(line.id, val)}
                          >
                            <SelectTrigger className="h-8 text-xs w-full">
                              <SelectValue placeholder="Chọn mặt hàng bán..." />
                            </SelectTrigger>
                            <SelectContent>
                              {items.map((item) => {
                                const typeBadge =
                                  item.type === "thanh_pham"
                                    ? "[TP] "
                                    : item.type === "ban_thanh_pham"
                                      ? "[BTP] "
                                      : "[NL] ";
                                return (
                                  <SelectItem key={item.id} value={item.id}>
                                    {typeBadge}
                                    {item.name} ({item.code}) — Tồn: {item.on_hand}{" "}
                                    {item.unit}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-24">
                          <Input
                            type="number"
                            placeholder="0"
                            value={line.quantity}
                            min={0.001}
                            step="any"
                            onChange={(e) => updateQuantity(line.id, e.target.value)}
                            className="h-8 text-xs text-right font-medium"
                          />
                        </div>

                        <span className="w-16 text-center text-xs font-medium text-muted-foreground truncate">
                          {selectedItem?.unit ?? "—"}
                        </span>

                        <div className="w-32">
                          <Input
                            type="number"
                            placeholder="0"
                            value={line.unitPrice}
                            min={0}
                            step="1000"
                            onChange={(e) => updateUnitPrice(line.id, e.target.value)}
                            className="h-8 text-xs text-right"
                          />
                        </div>

                        <div className="w-32 text-right font-semibold text-xs text-neutral-900">
                          {formatCurrency(lineTotal)}
                        </div>

                        <div className="w-9 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-rose-600"
                            onClick={() => removeLine(line.id)}
                            disabled={lines.length === 1}
                            title="Xóa dòng"
                          >
                            <Trash2Icon className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tổng cộng */}
            <div className="flex justify-between items-center rounded-lg border bg-neutral-100/70 px-4 py-3">
              <span className="font-semibold text-sm">Tổng cộng đơn hàng:</span>
              <span className="text-xl font-bold text-emerald-700">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú đơn hàng</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Địa chỉ giao cụ thể, ghi chú giờ giao..."
              className="h-16 resize-none"
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
              {isPending ? "Đang tạo..." : "Tạo đơn hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
