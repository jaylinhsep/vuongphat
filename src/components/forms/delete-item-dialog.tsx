"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteItemAction } from "@/actions/kho-actions";
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
import { initialFormState } from "@/lib/form-state";
import type { InventoryItem } from "@/lib/types";

export function DeleteItemDialog({ item }: { item: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [state, formAction, pending] = useActionState(
    deleteItemAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      setConfirmText("");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  const isConfirmed = confirmText.trim().toLowerCase() === "ok";

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (!val) setConfirmText("");
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="icon-sm"
          variant="ghost"
          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50"
          aria-label="Xóa hàng hóa"
          title="Xóa hàng hóa"
        >
          <Trash2Icon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangleIcon className="size-5 shrink-0" />
            <span>Xác nhận xóa hàng hóa</span>
          </DialogTitle>
          <DialogDescription>
            Hành động này sẽ xóa hàng hóa khỏi danh mục và không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={item.id} />

          {/* Thông tin hàng hóa cần xóa */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1">
            <div className="font-semibold text-neutral-900 text-sm">
              {item.name}
            </div>
            <div className="flex gap-4 text-neutral-600 font-mono">
              <span>Mã: {item.code}</span>
              <span>ĐVT: {item.unit}</span>
              <span>Tồn kho: {item.on_hand}</span>
            </div>
            {item.packing_spec && (
              <div className="text-neutral-600">
                Quy cách: {item.packing_spec}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor={`confirm-${item.id}`} className="text-xs font-medium">
              Vui lòng gõ{" "}
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                ok
              </span>{" "}
              vào ô bên dưới để xác nhận xóa:
            </Label>
            <Input
              id={`confirm-${item.id}`}
              name="confirmation"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="gõ: ok"
              autoFocus
              className="font-mono text-center text-sm font-bold tracking-widest uppercase focus-visible:ring-rose-500"
              autoComplete="off"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Hủy bỏ
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={!isConfirmed || pending}
              className="gap-1.5"
            >
              {pending && <Loader2Icon className="size-3.5 animate-spin" />}
              <span>Xác nhận xóa</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
