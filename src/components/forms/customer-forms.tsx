"use client";

import { useActionState, useState } from "react";
import { PlusIcon, EditIcon } from "lucide-react";
import {
  createCustomerAction,
  updateCustomerAction,
} from "@/actions/ban-hang-actions";
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
import { Textarea } from "@/components/ui/textarea";
import { INITIAL_FORM_STATE } from "@/lib/form-state";
import type { Customer } from "@/lib/types";

export function CreateCustomerDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: typeof INITIAL_FORM_STATE, data: FormData) => {
      const res = await createCustomerAction(prev, data);
      if (res.status === "success") setOpen(false);
      return res;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Thêm khách hàng
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Thêm khách hàng mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin đối tác, khách sỉ hoặc chuỗi cửa hàng bán lẻ.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Mã khách hàng</Label>
              <Input
                id="code"
                name="code"
                placeholder="Tự sinh nếu để trống"
                className="font-mono uppercase"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Số điện thoại</Label>
              <Input id="phone" name="phone" placeholder="0909 xxx xxx" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Tên khách hàng / Cửa hàng *</Label>
            <Input id="name" name="name" required placeholder="Tên khách hàng" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input id="address" name="address" placeholder="Địa chỉ giao hàng" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              name="note"
              placeholder="Yêu cầu giao nhận, chính sách chiết khấu..."
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
              {isPending ? "Đang lưu..." : "Lưu khách hàng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EditCustomerDialog({ customer }: { customer: Customer }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(
    async (prev: typeof INITIAL_FORM_STATE, data: FormData) => {
      const res = await updateCustomerAction(prev, data);
      if (res.status === "success") setOpen(false);
      return res;
    },
    INITIAL_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="size-8">
          <EditIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cập nhật khách hàng</DialogTitle>
          <DialogDescription>Mã khách hàng: {customer.code}</DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={customer.id} />

          <div className="space-y-2">
            <Label htmlFor="name">Tên khách hàng / Cửa hàng *</Label>
            <Input
              id="name"
              name="name"
              defaultValue={customer.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Số điện thoại</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={customer.phone ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Địa chỉ</Label>
            <Input
              id="address"
              name="address"
              defaultValue={customer.address ?? ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú</Label>
            <Textarea
              id="note"
              name="note"
              defaultValue={customer.note ?? ""}
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
              {isPending ? "Đang lưu..." : "Cập nhật"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
