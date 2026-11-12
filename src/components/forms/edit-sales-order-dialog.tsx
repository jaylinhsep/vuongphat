"use client";

import { useActionState, useState } from "react";
import { PlusIcon, Trash2Icon, PencilIcon } from "lucide-react";
import { updateSalesOrderAction } from "@/actions/ban-hang-actions";
import { ItemCombobox } from "@/components/forms/item-combobox";
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
import type { Customer, InventoryItem, SalesOrderRow } from "@/lib/types";

type OrderLine = {
  id: string;
  itemId: string;
  quantity: string;
  unitPrice: string;
};

export function EditSalesOrderDialog({
  order,
  customers,
  items,
}: {
  order: SalesOrderRow;
  customers: Customer[];
  items: InventoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const [customerId, setCustomerId] = useState(order.customer_id);
  const [orderDate, setOrderDate] = useState(order.order_date || todayISO());
  const [deliveryDate, setDeliveryDate] = useState(order.delivery_date || "");
  const [note, setNote] = useState(order.note || "");
  const [lines, setLines] = useState<OrderLine[]>(
    order.items.length > 0
      ? order.items.map((item, idx) => ({
          id: `line-${item.id || idx}`,
          itemId: item.item_id,
          quantity: String(item.quantity),
          unitPrice: String(item.unit_price),
        }))
      : [{ id: "line-1", itemId: "", quantity: "1", unitPrice: "0" }],
  );

  const resetForm = () => {
    setCustomerId(order.customer_id);
    setOrderDate(order.order_date || todayISO());
    setDeliveryDate(order.delivery_date || "");
    setNote(order.note || "");
    setLines(
      order.items.length > 0
        ? order.items.map((item, idx) => ({
            id: `line-${item.id || idx}`,
            itemId: item.item_id,
            quantity: String(item.quantity),
            unitPrice: String(item.unit_price),
          }))
        : [{ id: "line-1", itemId: "", quantity: "1", unitPrice: "0" }],
    );
  };

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
      const res = await updateSalesOrderAction(prev, data);
      if (res.status === "success") {
        setOpen(false);
      }
      return res;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) resetForm();
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-50 h-7.5 px-2 text-xs font-medium">
          <PencilIcon className="size-3 mr-1" /> Sửa
        </Button>
      </DialogTrigger>
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-none sm:max-w-3xl lg:max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <PencilIcon className="size-5 text-amber-600 shrink-0" />
            <span>Sửa đơn bán hàng {order.code}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Quyền Quản trị viên: cập nhật thông tin khách hàng, ngày giao và danh sách mặt hàng.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={order.id} />

          {/* Thông tin chung */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label htmlFor={`edit_cust_${order.id}`} className="text-xs sm:text-sm">
                Khách hàng *
              </Label>
              <Select
                name="customer_id"
                value={customerId}
                onValueChange={setCustomerId}
                required
              >
                <SelectTrigger id={`edit_cust_${order.id}`} className="w-full text-xs sm:text-sm">
                  <SelectValue placeholder="Chọn khách hàng" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs sm:text-sm">
                      {c.name} {c.phone ? `(${c.phone})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`edit_date_${order.id}`} className="text-xs sm:text-sm">
                Ngày đặt *
              </Label>
              <Input
                id={`edit_date_${order.id}`}
                name="order_date"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                required
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`edit_del_${order.id}`} className="text-xs sm:text-sm">
                Ngày giao dự kiến
              </Label>
              <Input
                id={`edit_del_${order.id}`}
                name="delivery_date"
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Danh sách mặt hàng */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs sm:text-sm">
                Danh sách mặt hàng bán *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-7 sm:h-8 text-xs"
              >
                <PlusIcon className="size-3.5" /> Thêm mặt hàng
              </Button>
            </div>

            {/* Giao diện Mobile: dạng thẻ */}
            <div className="space-y-2.5 sm:hidden">
              {lines.map((line, idx) => {
                const selectedItem = items.find((i) => i.id === line.itemId);
                const numQty = parseFloat(line.quantity) || 0;
                const numPrice = parseFloat(line.unitPrice) || 0;
                const lineTotal = numQty * numPrice;

                return (
                  <div
                    key={line.id}
                    className="rounded-lg border bg-muted/20 p-3 space-y-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex size-5 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <ItemCombobox
                          items={items}
                          value={line.itemId}
                          onChange={(val) => updateItem(line.id, val)}
                          placeholder="Gõ tìm hoặc chọn mặt hàng..."
                        />
                      </div>
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-rose-600 shrink-0"
                          onClick={() => removeLine(line.id)}
                          title="Xóa dòng"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Số lượng ({selectedItem?.unit ?? "—"})
                        </span>
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
                      <div className="space-y-1">
                        <span className="text-[11px] font-medium text-muted-foreground">
                          Đơn giá (đ)
                        </span>
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
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t text-xs">
                      <span className="text-muted-foreground">Thành tiền:</span>
                      <span className="font-bold text-neutral-900">
                        {formatCurrency(lineTotal)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Giao diện Desktop */}
            <div className="hidden sm:block rounded-lg border bg-card overflow-hidden">
              <div className="flex items-center gap-2 border-b bg-muted/60 px-3 py-2 text-xs font-semibold text-muted-foreground">
                <span className="w-8 text-center">STT</span>
                <span className="flex-1">Mặt hàng</span>
                <span className="w-24 text-right">Số lượng</span>
                <span className="w-16 text-center">ĐVT</span>
                <span className="w-32 text-right">Đơn giá (đ)</span>
                <span className="w-32 text-right">Thành tiền</span>
                <span className="w-9 text-center"></span>
              </div>

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
                        <ItemCombobox
                          items={items}
                          value={line.itemId}
                          onChange={(val) => updateItem(line.id, val)}
                          placeholder="Gõ tìm hoặc chọn mặt hàng..."
                        />
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

            {/* Tổng cộng đơn hàng */}
            <div className="flex justify-between items-center rounded-lg border bg-neutral-100/70 px-3.5 py-2.5 sm:px-4 sm:py-3">
              <span className="font-semibold text-xs sm:text-sm">Tổng cộng đơn hàng mới:</span>
              <span className="text-lg sm:text-xl font-bold text-amber-700">
                {formatCurrency(totalAmount)}
              </span>
            </div>
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <Label htmlFor={`edit_note_${order.id}`} className="text-xs sm:text-sm">
              Ghi chú đơn hàng
            </Label>
            <Textarea
              id={`edit_note_${order.id}`}
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Địa chỉ giao cụ thể, ghi chú giờ giao..."
              className="h-16 resize-none text-xs sm:text-sm"
            />
          </div>

          {state.message && (
            <p
              className={`text-xs sm:text-sm ${
                state.status === "error" ? "text-rose-600" : "text-emerald-600"
              }`}
            >
              {state.message}
            </p>
          )}

          <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              className="w-full sm:w-auto text-xs sm:text-sm"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="w-full sm:w-auto text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isPending ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
