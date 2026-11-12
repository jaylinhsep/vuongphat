"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangleIcon, Loader2Icon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import { deleteBomAction } from "@/actions/san-xuat-actions";
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
import { initialFormState } from "@/lib/form-state";
import type { BomRow } from "@/lib/types";

export function DeleteBomDialog({ bom }: { bom: BomRow }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    deleteBomAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50"
          title="Xóa công thức"
          aria-label="Xóa công thức"
        >
          <Trash2Icon className="size-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-600">
            <AlertTriangleIcon className="size-5 shrink-0" />
            <span>Xác nhận xóa công thức BOM</span>
          </DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa công thức định lượng của thành phẩm{" "}
            <strong className="text-neutral-900">{bom.product_name}</strong> (Mã: {bom.product_code}) không?
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="bom_id" value={bom.id} />

          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs space-y-1">
            <div className="text-neutral-700">
              Số lượng đầu ra: <strong>{bom.output_quantity} {bom.product_unit}</strong>
            </div>
            <div className="text-neutral-700">
              Số lượng nguyên liệu: <strong>{bom.items.length} thành phần</strong>
            </div>
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
              disabled={pending}
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
