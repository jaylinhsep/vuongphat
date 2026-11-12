"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import {
  FlaskConicalIcon,
  Loader2Icon,
  PlusIcon,
  SaveIcon,
  Trash2Icon,
} from "lucide-react";
import { toast } from "sonner";
import { saveBomAction } from "@/actions/san-xuat-actions";
import { ItemCombobox } from "@/components/forms/item-combobox";
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
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { BomRow, Item } from "@/lib/types";

type Line = { materialId: string; quantity: string };

export function BomForm({
  products,
  materials,
  boms,
}: {
  products: Item[];
  materials: Item[];
  boms: BomRow[];
}) {
  const [productId, setProductId] = useState("");
  const [outputQuantity, setOutputQuantity] = useState("1");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([
    { materialId: "", quantity: "" },
  ]);
  const [state, formAction, pending] = useActionState(
    saveBomAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") toast.success(state.message);
    else if (state.status === "error") toast.error(state.message);
  }, [state]);

  const materialById = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials],
  );

  const availableMaterials = useMemo(
    () => materials.filter((m) => m.id !== productId),
    [materials, productId],
  );

  const comboboxMaterials = useMemo(
    () => availableMaterials.map((m) => ({ ...m, on_hand: 0 })),
    [availableMaterials],
  );

  const batchCost = lines.reduce((total, line) => {
    const material = materialById.get(line.materialId);
    const quantity = Number(line.quantity);
    return total + (material?.unit_price ?? 0) * (Number.isFinite(quantity) ? quantity : 0);
  }, 0);
  const output = Number(outputQuantity);
  const unitCost = output > 0 ? batchCost / output : 0;

  function selectProduct(id: string) {
    setProductId(id);
    const existing = boms.find((bom) => bom.product_id === id);
    if (existing) {
      setOutputQuantity(String(existing.output_quantity));
      setNote(existing.note ?? "");
      setLines(
        existing.items.map((item) => ({
          materialId: item.material_id,
          quantity: String(item.quantity),
        })),
      );
      toast.info("Đã tải công thức hiện có của thành phẩm.");
    } else {
      setOutputQuantity("1");
      setNote("");
      setLines([{ materialId: "", quantity: "" }]);
    }
  }

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line)),
    );
  }

  const serializedLines = JSON.stringify(
    lines
      .filter((line) => line.materialId && line.quantity !== "")
      .map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
      })),
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Mặt hàng cần lập công thức</Label>
          <Select
            name="product_id"
            value={productId}
            onValueChange={selectProduct}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Chọn thành phẩm hoặc bán thành phẩm" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.type === "ban_thanh_pham" ? "[BTP] " : "[TP] "}
                  {product.code} — {product.name} ({product.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Lập công thức cho Thành phẩm hoặc Bán thành phẩm.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bom-output">Số lượng đầu ra</Label>
          <Input
            id="bom-output"
            name="output_quantity"
            type="number"
            min={0.001}
            step="0.001"
            value={outputQuantity}
            onChange={(event) => setOutputQuantity(event.target.value)}
            required
          />
          <p className="text-xs text-muted-foreground">
            Số lượng thành phẩm tạo ra từ định lượng bên dưới.
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-1.5">
            <FlaskConicalIcon className="size-3.5" /> Nguyên liệu &amp; Bán thành phẩm đầu vào
          </Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((current) => [...current, { materialId: "", quantity: "" }])}
          >
            <PlusIcon /> Thêm dòng
          </Button>
        </div>

        <div className="space-y-2">
          {lines.map((line, index) => {
            const material = materialById.get(line.materialId);
            const lineCost =
              (material?.unit_price ?? 0) *
              (Number.isFinite(Number(line.quantity)) ? Number(line.quantity) : 0);

            return (
              <div
                key={index}
                className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px_120px_36px] sm:items-center"
              >
                <div className="min-w-0">
                  <ItemCombobox
                    items={comboboxMaterials}
                    value={line.materialId}
                    onChange={(value) =>
                      updateLine(index, { materialId: value })
                    }
                    placeholder="Gõ tìm nguyên liệu hoặc BTP..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.001}
                    step="0.001"
                    placeholder="Định lượng"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(index, { quantity: event.target.value })
                    }
                  />
                  <span className="w-8 shrink-0 text-xs text-muted-foreground">
                    {material?.unit ?? ""}
                  </span>
                </div>

                <div className="text-xs text-muted-foreground sm:text-right">
                  {formatCurrency(lineCost)}
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Xoá dòng"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((current) =>
                      current.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2Icon />
                </Button>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-xs text-muted-foreground">
          <span>
            Chi phí nguyên liệu / lô:{" "}
            <strong className="text-foreground">{formatCurrency(batchCost)}</strong>
          </span>
          <span>
            Đơn giá thành phẩm ước tính:{" "}
            <strong className="text-foreground">
              {formatCurrency(unitCost)}
            </strong>
            {output > 0 && (
              <span className="ml-1">
                / {formatQuantity(output)}{" "}
                {products.find((p) => p.id === productId)?.unit ?? ""}
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bom-note">Ghi chú</Label>
        <Textarea
          id="bom-note"
          name="note"
          rows={2}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Ví dụ: công thức chuẩn cho 1 ổ bánh"
        />
      </div>

      <input type="hidden" name="lines" value={serializedLines} />

      <Button type="submit" disabled={pending || !productId}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" /> Đang lưu…
          </>
        ) : (
          <>
            <SaveIcon /> Lưu công thức
          </>
        )}
      </Button>
    </form>
  );
}
