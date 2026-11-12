"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  FlaskConicalIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { saveBomAction } from "@/actions/san-xuat-actions";
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
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { BomRow, Item } from "@/lib/types";

type Line = { materialId: string; quantity: string };

export function EditBomDialog({
  bom,
  materials,
}: {
  bom: BomRow;
  materials: Item[];
}) {
  const [open, setOpen] = useState(false);
  const [outputQuantity, setOutputQuantity] = useState(String(bom.output_quantity));
  const [note, setNote] = useState(bom.note ?? "");
  const [lines, setLines] = useState<Line[]>(
    bom.items.map((item) => ({
      materialId: item.material_id,
      quantity: String(item.quantity),
    })),
  );

  const [state, formAction, pending] = useActionState(
    saveBomAction,
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

  const resetForm = () => {
    setOutputQuantity(String(bom.output_quantity));
    setNote(bom.note ?? "");
    setLines(
      bom.items.map((item) => ({
        materialId: item.material_id,
        quantity: String(item.quantity),
      })),
    );
  };

  const materialById = useMemo(
    () => new Map(materials.map((m) => [m.id, m])),
    [materials],
  );

  const availableMaterials = useMemo(
    () => materials.filter((m) => m.id !== bom.product_id),
    [materials, bom.product_id],
  );

  // Map sang kiểu InventoryItem để dùng cho ItemCombobox
  const comboboxItems = useMemo(
    () =>
      availableMaterials.map((m) => ({
        ...m,
        on_hand: 0,
      })),
    [availableMaterials],
  );

  const batchCost = lines.reduce((total, line) => {
    const mat = materialById.get(line.materialId);
    const qty = Number(line.quantity);
    return total + (mat?.unit_price ?? 0) * (Number.isFinite(qty) ? qty : 0);
  }, 0);

  const output = Number(outputQuantity);
  const unitCost = output > 0 ? batchCost / output : 0;

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((curr) =>
      curr.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  }

  function addLine() {
    setLines((curr) => [...curr, { materialId: "", quantity: "1" }]);
  }

  function removeLine(index: number) {
    setLines((curr) => (curr.length > 1 ? curr.filter((_, i) => i !== index) : curr));
  }

  const serializedLines = JSON.stringify(
    lines
      .filter((l) => l.materialId && l.quantity !== "")
      .map((l) => ({
        materialId: l.materialId,
        quantity: Number(l.quantity),
      })),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        setOpen(val);
        if (val) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="h-8 gap-1 text-xs">
          <PencilIcon className="size-3.5" />
          <span>Sửa</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-none sm:max-w-2xl lg:max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <FlaskConicalIcon className="size-5 text-primary shrink-0" />
            <span>Sửa công thức: {bom.product_name}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Mã: <span className="font-mono font-semibold">{bom.product_code}</span> · Đơn vị tính: {bom.product_unit}
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="product_id" value={bom.product_id} />
          <input type="hidden" name="lines" value={serializedLines} />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`output-${bom.id}`} className="text-xs sm:text-sm">
                Số lượng đầu ra ({bom.product_unit}) *
              </Label>
              <Input
                id={`output-${bom.id}`}
                name="output_quantity"
                type="number"
                min={0.001}
                step="any"
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value)}
                required
                className="text-xs sm:text-sm font-semibold"
              />
              <p className="text-[11px] text-muted-foreground">
                Quy mô một mẻ sản xuất (batch size)
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`note-${bom.id}`} className="text-xs sm:text-sm">
                Ghi chú công thức
              </Label>
              <Input
                id={`note-${bom.id}`}
                name="note"
                placeholder="VD: Nhiệt độ phối trộn, lưu ý an toàn..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Danh sách định lượng nguyên liệu */}
          <div className="space-y-2.5 rounded-lg border bg-neutral-50/60 p-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 text-neutral-900">
                <FlaskConicalIcon className="size-3.5 text-primary" />
                Nguyên liệu &amp; Bán thành phẩm định lượng *
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-7 sm:h-8 text-xs"
              >
                <PlusIcon className="size-3.5" /> Thêm dòng
              </Button>
            </div>

            <div className="space-y-2">
              {lines.map((line, index) => {
                const mat = materialById.get(line.materialId);
                const lineCost =
                  (mat?.unit_price ?? 0) * (Number(line.quantity) || 0);

                return (
                  <div
                    key={index}
                    className="grid grid-cols-1 gap-2 rounded-md border bg-white p-2.5 sm:grid-cols-[1fr_130px_100px_32px] sm:items-center sm:p-2"
                  >
                    <div className="min-w-0">
                      <ItemCombobox
                        items={comboboxItems}
                        value={line.materialId}
                        onChange={(val) => updateLine(index, { materialId: val })}
                        placeholder="Gõ tìm nguyên liệu hoặc BTP..."
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={0.001}
                        step="any"
                        placeholder="Số lượng"
                        value={line.quantity}
                        onChange={(e) => updateLine(index, { quantity: e.target.value })}
                        className="h-8 text-xs text-right font-medium"
                        required
                      />
                      <span className="w-12 text-center text-xs text-muted-foreground truncate font-medium">
                        {mat?.unit ?? "—"}
                      </span>
                    </div>

                    <div className="text-right text-xs font-mono text-muted-foreground hidden sm:block">
                      {formatCurrency(lineCost)}
                    </div>

                    <div className="flex justify-end">
                      {lines.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-rose-600"
                          onClick={() => removeLine(index)}
                          title="Xóa dòng"
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chi phí tạm tính */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 text-xs">
              <span className="text-muted-foreground">
                Tổng cộng {lines.filter((l) => l.materialId).length} thành phần
              </span>
              <div className="text-right space-x-3">
                <span>
                  Chi phí / lô:{" "}
                  <strong className="text-neutral-900 font-bold">
                    {formatCurrency(batchCost)}
                  </strong>
                </span>
                <span>
                  Đơn giá / {bom.product_unit}:{" "}
                  <strong className="text-primary font-bold">
                    {formatCurrency(unitCost)}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="outline" size="sm">
                Đóng
              </Button>
            </DialogClose>
            <Button
              type="submit"
              size="sm"
              disabled={pending || lines.every((l) => !l.materialId)}
              className="gap-1.5"
            >
              {pending ? (
                <Loader2Icon className="size-3.5 animate-spin" />
              ) : (
                <SaveIcon className="size-3.5" />
              )}
              <span>Lưu công thức</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
