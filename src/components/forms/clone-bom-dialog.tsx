"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { CopyIcon, FlaskConicalIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
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
import { initialFormState } from "@/lib/form-state";
import { formatCurrency } from "@/lib/format";
import type { BomRow, Item } from "@/lib/types";

type Line = { materialId: string; quantity: string };

export function CloneBomDialog({
  bom,
  products,
  materials,
}: {
  bom: BomRow;
  products: Item[];
  materials: Item[];
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [newProductName, setNewProductName] = useState(`${bom.product_name} (Bản mới)`);
  const [newProductCode, setNewProductCode] = useState(`${bom.product_code}-02`);
  const [newProductUnit, setNewProductUnit] = useState(bom.product_unit || "kg");
  const [outputQuantity, setOutputQuantity] = useState(String(bom.output_quantity));
  const [note, setNote] = useState(`Nhân bản từ ${bom.product_name}`);
  const [lines, setLines] = useState<Line[]>(() =>
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
    setMode("new");
    setSelectedProductId("");
    setNewProductName(`${bom.product_name} (Bản mới)`);
    setNewProductCode(`${bom.product_code}-02`);
    setNewProductUnit(bom.product_unit || "kg");
    setOutputQuantity(String(bom.output_quantity));
    setNote(`Nhân bản từ ${bom.product_name}`);
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
      .map((l) => ({ materialId: l.materialId, quantity: Number(l.quantity) }))
      .filter((l) => l.materialId && Number.isFinite(l.quantity) && l.quantity > 0),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="h-8 gap-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
          title="Nhân bản công thức này"
        >
          <CopyIcon className="size-3.5" />
          <span className="hidden sm:inline">Nhân bản</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-blue-700">
            <CopyIcon className="size-5" />
            <span>Nhân bản công thức BOM</span>
          </DialogTitle>
          <DialogDescription>
            Sao chép toàn bộ nguyên liệu từ <strong>{bom.product_name}</strong> để tạo nhanh công thức mới mà không cần nhập lại.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="lines" value={serializedLines} />
          <input
            type="hidden"
            name="create_new_product"
            value={mode === "new" ? "true" : "false"}
          />
          <input
            type="hidden"
            name="product_id"
            value={mode === "existing" ? selectedProductId : ""}
          />
          <input
            type="hidden"
            name="new_product_name"
            value={mode === "new" ? newProductName : ""}
          />
          <input
            type="hidden"
            name="new_product_code"
            value={mode === "new" ? newProductCode : ""}
          />
          <input
            type="hidden"
            name="new_product_unit"
            value={mode === "new" ? newProductUnit : ""}
          />

          {/* Chọn cách thức áp dụng công thức mới */}
          <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-3 space-y-3">
            <Label className="text-xs font-semibold text-neutral-800">
              Mặt hàng nhận công thức mới:
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("new")}
                className={`py-2 px-3 rounded-md border text-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === "new"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                + Tạo luôn thành phẩm mới
              </button>
              <button
                type="button"
                onClick={() => setMode("existing")}
                className={`py-2 px-3 rounded-md border text-xs font-semibold text-center transition-colors cursor-pointer ${
                  mode === "existing"
                    ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                    : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50"
                }`}
              >
                Chọn thành phẩm đã có
              </button>
            </div>

            {mode === "new" ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="sm:col-span-1 space-y-1">
                  <Label htmlFor="clone-code" className="text-[11px] font-medium text-neutral-600">
                    Mã hàng mới *
                  </Label>
                  <Input
                    id="clone-code"
                    value={newProductCode}
                    onChange={(e) => setNewProductCode(e.target.value)}
                    placeholder="VD: SLV-0177"
                    required
                    className="h-8 text-xs font-mono uppercase bg-white"
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label htmlFor="clone-name" className="text-[11px] font-medium text-neutral-600">
                    Tên mặt hàng mới *
                  </Label>
                  <Input
                    id="clone-name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="VD: DUNG MÔI NEH 02"
                    required
                    className="h-8 text-xs bg-white font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-1 pt-1">
                <Label className="text-[11px] font-medium text-neutral-600">
                  Chọn thành phẩm trong danh mục *
                </Label>
                <ItemCombobox
                  items={products}
                  value={selectedProductId}
                  onChange={setSelectedProductId}
                  placeholder="Gõ tên hoặc mã thành phẩm..."
                />
              </div>
            )}
          </div>

          {/* Đầu ra & Ghi chú */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="clone-output-quantity" className="text-xs font-medium">
                Sản lượng đầu ra 1 mẻ ({mode === "new" ? newProductUnit : bom.product_unit}) *
              </Label>
              <Input
                id="clone-output-quantity"
                name="output_quantity"
                type="number"
                min={0.001}
                step="0.001"
                value={outputQuantity}
                onChange={(e) => setOutputQuantity(e.target.value)}
                required
                className="h-8 text-xs font-semibold"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="clone-note" className="text-xs font-medium">
                Ghi chú công thức
              </Label>
              <Input
                id="clone-note"
                name="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Công thức cải tiến, độ phủ cao..."
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Danh sách nguyên liệu */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConicalIcon className="size-4 text-primary" />
                <span className="text-xs font-semibold text-neutral-800">
                  Thành phần nguyên liệu ({lines.length})
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLine}
                className="h-7 text-xs gap-1"
              >
                <PlusIcon className="size-3" /> Thêm nguyên liệu
              </Button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {lines.map((line, index) => {
                const mat = materialById.get(line.materialId);
                const cost =
                  (mat?.unit_price ?? 0) * (Number(line.quantity) || 0);

                return (
                  <div
                    key={index}
                    className="flex items-center gap-2 rounded-lg border bg-neutral-50/50 p-2 text-xs"
                  >
                    <span className="w-5 text-center font-bold text-neutral-400 text-[11px] shrink-0">
                      {index + 1}
                    </span>

                    <div className="flex-1 min-w-0">
                      <ItemCombobox
                        items={materials}
                        value={line.materialId}
                        onChange={(val) => updateLine(index, { materialId: val })}
                        placeholder="Chọn nguyên liệu..."
                      />
                    </div>

                    <div className="w-24 shrink-0 flex items-center gap-1">
                      <Input
                        type="number"
                        min={0.001}
                        step="0.001"
                        value={line.quantity}
                        onChange={(e) =>
                          updateLine(index, { quantity: e.target.value })
                        }
                        className="h-8 text-xs text-right font-medium"
                      />
                      <span className="w-7 text-[11px] text-neutral-500 truncate">
                        {mat?.unit || "kg"}
                      </span>
                    </div>

                    <div className="w-24 text-right font-mono text-[11px] text-neutral-600 hidden sm:block shrink-0">
                      {formatCurrency(cost)}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeLine(index)}
                      disabled={lines.length <= 1}
                      className="text-muted-foreground hover:text-rose-600 hover:bg-rose-50 size-7 shrink-0"
                    >
                      <Trash2Icon className="size-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* Tổng chi phí */}
            <div className="flex items-center justify-between rounded-md bg-neutral-100 p-2.5 text-xs">
              <span className="text-neutral-600">
                Chi phí 1 mẻ:{" "}
                <strong className="text-neutral-900 font-mono">
                  {formatCurrency(batchCost)}
                </strong>
              </span>
              <span className="text-neutral-600">
                Giá vốn / {mode === "new" ? newProductUnit : bom.product_unit}:{" "}
                <strong className="text-primary font-mono font-bold">
                  {formatCurrency(unitCost)}
                </strong>
              </span>
            </div>
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
              disabled={
                pending ||
                (mode === "new" ? !newProductName || !newProductCode : !selectedProductId) ||
                !outputQuantity ||
                lines.length === 0
              }
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin size-3.5" /> Đang lưu…
                </>
              ) : (
                "Lưu công thức mới"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
