"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createItemAction, createSupplierAction } from "@/actions/kho-actions";
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
import { ITEM_TYPE_LABELS } from "@/lib/labels";
import type { ItemType } from "@/lib/types";

export function ItemFormDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ItemType>("nguyen_lieu");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createItemAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
      setType("nguyen_lieu");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Thêm hàng hóa
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Thêm hàng hóa</DialogTitle>
          <DialogDescription>
            Khai báo nguyên liệu hoặc thành phẩm dùng trong kho và sản xuất.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-code">Mã hàng</Label>
              <Input
                id="item-code"
                name="code"
                placeholder="VD: NL006"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-unit">Đơn vị tính</Label>
              <Input
                id="item-unit"
                name="unit"
                placeholder="kg, lít, cái…"
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="item-name">Tên hàng hóa</Label>
              <Input
                id="item-name"
                name="name"
                placeholder="VD: Bột mì đa dụng"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Loại hàng</Label>
              <Select
                name="type"
                value={type}
                onValueChange={(value) => setType(value as ItemType)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(["nguyen_lieu", "thanh_pham"] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {ITEM_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-price">Đơn giá (VNĐ)</Label>
              <Input
                id="item-price"
                name="unit_price"
                type="number"
                min={0}
                step={100}
                defaultValue={0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-min-stock">Tồn tối thiểu</Label>
              <Input
                id="item-min-stock"
                name="min_stock"
                type="number"
                min={0}
                step="0.001"
                defaultValue={0}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang lưu…
                </>
              ) : (
                "Lưu hàng hóa"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function SupplierFormDialog() {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createSupplierAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon /> Thêm nhà cung cấp
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm nhà cung cấp</DialogTitle>
          <DialogDescription>
            Thông tin nhà cung cấp dùng khi tạo phiếu nhập kho.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplier-name">Tên nhà cung cấp</Label>
            <Input id="supplier-name" name="name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-phone">Số điện thoại</Label>
            <Input id="supplier-phone" name="phone" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supplier-note">Ghi chú</Label>
            <Textarea id="supplier-note" name="note" rows={2} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang lưu…
                </>
              ) : (
                "Lưu nhà cung cấp"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
