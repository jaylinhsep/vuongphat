"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createMovementAction } from "@/actions/kho-actions";
import { Button } from "@/components/ui/button";
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
import { MOVEMENT_TYPE_LABELS } from "@/lib/labels";
import type { Item, Supplier } from "@/lib/types";

const TYPES = ["nhap", "xuat", "dieu_chinh"] as const;
type FormType = (typeof TYPES)[number];

export function MovementForm({
  items,
  suppliers,
}: {
  items: Item[];
  suppliers: Supplier[];
}) {
  const [state, formAction, pending] = useActionState(
    createMovementAction,
    initialFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<FormType>("nhap");
  const [itemId, setItemId] = useState("");

  const selectedItem = items.find((item) => item.id === itemId);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
      setItemId("");
      setType("nhap");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Loại phiếu</Label>
          <Select
            name="type"
            value={type}
            onValueChange={(value) => setType(value as FormType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {MOVEMENT_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="movement-item">Hàng hóa</Label>
          <Select name="item_id" value={itemId} onValueChange={setItemId}>
            <SelectTrigger id="movement-item" className="w-full">
              <SelectValue placeholder="Chọn hàng hóa" />
            </SelectTrigger>
            <SelectContent>
              {items.map((item) => (
                <SelectItem key={item.id} value={item.id}>
                  {item.code} — {item.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="movement-quantity">Số lượng</Label>
          <Input
            id="movement-quantity"
            name="quantity"
            type="number"
            step="0.001"
            min={type === "dieu_chinh" ? undefined : 0.001}
            placeholder={type === "dieu_chinh" ? "VD: -5 hoặc 5" : "VD: 10"}
            required
          />
          <p className="text-xs text-muted-foreground">
            {selectedItem
              ? `Đơn vị tính: ${selectedItem.unit}${
                  type === "dieu_chinh"
                    ? " — dùng số âm để giảm tồn."
                    : ""
                }`
              : "Chọn hàng hóa để xem đơn vị tính."}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="movement-price">Đơn giá (VNĐ)</Label>
          <Input
            key={itemId || "no-item"}
            id="movement-price"
            name="unit_price"
            type="number"
            step="100"
            min={0}
            defaultValue={selectedItem ? selectedItem.unit_price : undefined}
            placeholder={selectedItem ? String(selectedItem.unit_price) : "0"}
          />
        </div>

        {type === "nhap" && (
          <div className="space-y-2">
            <Label>Nhà cung cấp</Label>
            <Select name="supplier_id" defaultValue="none">
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không chọn</SelectItem>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="movement-note">Ghi chú</Label>
          <Textarea
            id="movement-note"
            name="note"
            rows={2}
            placeholder="Diễn giải phiếu kho (không bắt buộc)"
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" /> Đang lưu…
          </>
        ) : (
          <>
            <PlusIcon /> Ghi nhận phiếu
          </>
        )}
      </Button>
    </form>
  );
}
