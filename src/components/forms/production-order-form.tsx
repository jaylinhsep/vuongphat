"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { FlaskConicalIcon, LayersIcon, Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createProductionOrderAction } from "@/actions/san-xuat-actions";
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
import { formatQuantity, todayISO } from "@/lib/format";
import type { BomRow, Item } from "@/lib/types";

export function ProductionOrderDialog({
  products,
  boms = [],
}: {
  products: Item[];
  boms?: BomRow[];
}) {
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState("");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [note, setNote] = useState("");
  const [isSplit, setIsSplit] = useState(false);
  const [splitMode, setSplitMode] = useState<"bom" | "count" | "size">("bom");
  const [customBatchCount, setCustomBatchCount] = useState<number>(2);
  const [customBatchSize, setCustomBatchSize] = useState<string>("");

  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createProductionOrderAction,
    initialFormState,
  );

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId),
    [products, productId],
  );

  const currentBom = useMemo(
    () => boms.find((b) => b.product_id === productId),
    [boms, productId],
  );

  const bomBatchSize = currentBom ? currentBom.output_quantity : null;
  const unitLabel = selectedProduct?.unit || "kg";

  // Khi đổi sản phẩm, nếu có BOM thì mặc định đặt customBatchSize theo BOM
  useEffect(() => {
    if (bomBatchSize && bomBatchSize > 0) {
      setCustomBatchSize(String(bomBatchSize));
      setSplitMode("bom");
    } else {
      setSplitMode("count");
    }
  }, [productId, bomBatchSize]);

  // Tính toán danh sách các mẻ lệnh sẽ tạo
  const batches = useMemo(() => {
    const total = parseFloat(totalQuantity);
    if (!Number.isFinite(total) || total <= 0) return [];

    const u = unitLabel.toLowerCase();

    if (!isSplit) {
      return [{ quantity: total, noteSuffix: "" }];
    }

    if (splitMode === "bom" && bomBatchSize && bomBatchSize > 0) {
      const fullCount = Math.floor(total / bomBatchSize);
      const remainder = Math.round((total - fullCount * bomBatchSize) * 1000) / 1000;
      const list: Array<{ quantity: number; noteSuffix: string }> = [];
      const totalCount = fullCount + (remainder > 0 ? 1 : 0);

      for (let i = 0; i < fullCount; i++) {
        list.push({
          quantity: bomBatchSize,
          noteSuffix: `${formatQuantity(bomBatchSize)}${u} X ${totalCount} mẻ (Mẻ ${i + 1}/${totalCount})`,
        });
      }
      if (remainder > 0) {
        list.push({
          quantity: remainder,
          noteSuffix: `${formatQuantity(remainder)}${u} X ${totalCount} mẻ (Mẻ ${totalCount}/${totalCount})`,
        });
      }
      return list;
    }

    if (splitMode === "size") {
      const size = parseFloat(customBatchSize);
      if (!Number.isFinite(size) || size <= 0) return [{ quantity: total, noteSuffix: "" }];

      const fullCount = Math.floor(total / size);
      const remainder = Math.round((total - fullCount * size) * 1000) / 1000;
      const list: Array<{ quantity: number; noteSuffix: string }> = [];
      const totalCount = fullCount + (remainder > 0 ? 1 : 0);

      for (let i = 0; i < fullCount; i++) {
        list.push({
          quantity: size,
          noteSuffix: `${formatQuantity(size)}${u} X ${totalCount} mẻ (Mẻ ${i + 1}/${totalCount})`,
        });
      }
      if (remainder > 0) {
        list.push({
          quantity: remainder,
          noteSuffix: `${formatQuantity(remainder)}${u} X ${totalCount} mẻ (Mẻ ${totalCount}/${totalCount})`,
        });
      }
      return list;
    }

    if (splitMode === "count") {
      const count = Math.max(2, Math.floor(customBatchCount || 2));
      const equalSize = Math.floor((total / count) * 1000) / 1000;
      const list: Array<{ quantity: number; noteSuffix: string }> = [];

      let runningTotal = 0;
      for (let i = 0; i < count - 1; i++) {
        list.push({
          quantity: equalSize,
          noteSuffix: `${formatQuantity(equalSize)}${u} X ${count} mẻ (Mẻ ${i + 1}/${count})`,
        });
        runningTotal += equalSize;
      }
      const lastSize = Math.round((total - runningTotal) * 1000) / 1000;
      list.push({
        quantity: lastSize,
        noteSuffix: `${formatQuantity(lastSize)}${u} X ${count} mẻ (Mẻ ${count}/${count})`,
      });
      return list;
    }

    return [{ quantity: total, noteSuffix: "" }];
  }, [totalQuantity, isSplit, splitMode, bomBatchSize, customBatchSize, customBatchCount, unitLabel]);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
      setProductId("");
      setTotalQuantity("");
      setNote("");
      setIsSplit(false);
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Tạo lệnh sản xuất
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayersIcon className="size-5 text-primary" />
            <span>Tạo lệnh sản xuất</span>
          </DialogTitle>
          <DialogDescription>
            Tạo lệnh sản xuất đơn lẻ hoặc tự động tách thành nhiều mẻ bồn khuấy độc lập.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="product_id" value={productId} />
          <input type="hidden" name="is_split" value={isSplit ? "true" : "false"} />
          <input
            type="hidden"
            name="split_batches"
            value={isSplit && batches.length > 0 ? JSON.stringify(batches) : ""}
          />

          {/* Chọn thành phẩm */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Mặt hàng sản xuất *</Label>
            <ItemCombobox
              items={products}
              value={productId}
              onChange={setProductId}
              placeholder="Gõ tên hoặc mã thành phẩm..."
            />
            {products.length === 0 && (
              <p className="text-xs text-rose-600">
                Chưa có mặt hàng sản xuất. Hãy thêm trong Danh mục hàng hóa.
              </p>
            )}
            {bomBatchSize && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                <FlaskConicalIcon className="size-3.5 shrink-0" />
                <span>
                  Công thức chuẩn BOM: <strong>{formatQuantity(bomBatchSize)} {unitLabel}/mẻ</strong>
                </span>
              </div>
            )}
          </div>

          {/* Số lượng tổng & Ngày kế hoạch */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="order-quantity" className="text-xs font-semibold">
                {isSplit ? "Tổng số lượng cần SX *" : "Số lượng sản xuất *"}
              </Label>
              <Input
                id="order-quantity"
                name="quantity"
                type="number"
                min={0.001}
                step="0.001"
                placeholder={bomBatchSize ? `VD: ${bomBatchSize * 2}` : "VD: 340"}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(e.target.value)}
                required
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="order-date" className="text-xs font-semibold">
                Ngày kế hoạch *
              </Label>
              <Input
                id="order-date"
                name="planned_date"
                type="date"
                defaultValue={todayISO()}
                required
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Khối tùy chọn tách lệnh theo mẻ bồn */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/70 p-3 space-y-3">
            <div className="flex items-center justify-between">
              <label
                htmlFor="is-split-order"
                className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-neutral-900"
              >
                <input
                  id="is-split-order"
                  type="checkbox"
                  checked={isSplit}
                  onChange={(e) => setIsSplit(e.target.checked)}
                  className="size-4 rounded border-neutral-300 text-primary focus:ring-primary cursor-pointer"
                />
                <span>Tách thành nhiều lệnh (chia theo mẻ/bồn)</span>
              </label>
              {isSplit && batches.length > 1 && (
                <span className="text-[11px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {batches.length} lệnh riêng biệt
                </span>
              )}
            </div>

            {isSplit && (
              <div className="space-y-3 pt-2 border-t border-neutral-200 text-xs">
                {/* Lựa chọn cách chia */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-medium text-neutral-600">
                    Cách thức chia mẻ:
                  </Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {bomBatchSize && (
                      <button
                        type="button"
                        onClick={() => setSplitMode("bom")}
                        className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-colors ${
                          splitMode === "bom"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                        }`}
                      >
                        Theo BOM ({bomBatchSize} {unitLabel})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSplitMode("count")}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-colors ${
                        splitMode === "count"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                      }`}
                    >
                      Chia theo số lệnh
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitMode("size")}
                      className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-colors ${
                        splitMode === "size"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                      }`}
                    >
                      Dung tích bồn ({unitLabel})
                    </button>
                  </div>
                </div>

                {/* Tham số chi tiết theo cách chia */}
                {splitMode === "count" && (
                  <div className="flex items-center gap-3">
                    <Label htmlFor="custom-count" className="text-xs shrink-0">
                      Số lệnh muốn chia:
                    </Label>
                    <div className="flex items-center gap-1.5">
                      {[2, 3, 4, 5].map((cnt) => (
                        <button
                          key={cnt}
                          type="button"
                          onClick={() => setCustomBatchCount(cnt)}
                          className={`size-7 rounded text-xs font-semibold border ${
                            customBatchCount === cnt
                              ? "bg-neutral-900 text-white border-neutral-900"
                              : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                          }`}
                        >
                          {cnt}
                        </button>
                      ))}
                      <Input
                        id="custom-count"
                        type="number"
                        min={2}
                        max={20}
                        value={customBatchCount}
                        onChange={(e) => setCustomBatchCount(parseInt(e.target.value) || 2)}
                        className="h-7 w-16 text-xs text-center"
                      />
                    </div>
                  </div>
                )}

                {splitMode === "size" && (
                  <div className="flex items-center gap-3">
                    <Label htmlFor="custom-size" className="text-xs shrink-0">
                      Dung tích 1 bồn / mẻ:
                    </Label>
                    <div className="flex items-center gap-1.5 flex-1">
                      <Input
                        id="custom-size"
                        type="number"
                        min={1}
                        step="0.001"
                        placeholder="VD: 170"
                        value={customBatchSize}
                        onChange={(e) => setCustomBatchSize(e.target.value)}
                        className="h-7 text-xs"
                      />
                      <span className="text-neutral-500 font-mono">{unitLabel}</span>
                    </div>
                  </div>
                )}

                {/* Danh sách xem trước lệnh sẽ tạo */}
                {batches.length > 0 && (
                  <div className="rounded-md border border-neutral-200 bg-white p-2.5 space-y-1.5">
                    <div className="flex items-center justify-between font-semibold text-neutral-800 text-[11px]">
                      <span>Xem trước {batches.length} lệnh sẽ tạo:</span>
                      <span className="font-mono text-emerald-700 font-bold">
                        Tổng: {formatQuantity(batches.reduce((s, b) => s + b.quantity, 0))} {unitLabel}
                      </span>
                    </div>
                    <div className="max-h-32 overflow-y-auto divide-y divide-neutral-100">
                      {batches.map((b, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-1 text-xs"
                        >
                          <span className="font-medium text-neutral-700">
                            • Lệnh {idx + 1}{" "}
                            <span className="text-[11px] text-neutral-500 font-mono">
                              ({b.noteSuffix})
                            </span>
                          </span>
                          <span className="font-mono font-bold text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded text-[11px]">
                            {formatQuantity(b.quantity)} {unitLabel}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ghi chú */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="order-note" className="text-xs font-semibold">
                Ghi chú lệnh
              </Label>
              {totalQuantity && (
                <div className="flex items-center gap-1.5 text-[11px]">
                  {bomBatchSize && (
                    <button
                      type="button"
                      onClick={() =>
                        setNote(
                          `${formatQuantity(bomBatchSize)}${unitLabel.toLowerCase()} X ${
                            Math.ceil(parseFloat(totalQuantity) / bomBatchSize) || 1
                          } mẻ`
                        )
                      }
                      className="text-primary hover:underline font-semibold"
                    >
                      + {formatQuantity(bomBatchSize)}{unitLabel.toLowerCase()} X {Math.ceil(parseFloat(totalQuantity) / bomBatchSize) || 1} mẻ
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setNote(`${totalQuantity}${unitLabel.toLowerCase()} X 1 mẻ`)}
                    className="text-neutral-500 hover:underline"
                  >
                    + {totalQuantity}{unitLabel.toLowerCase()} X 1 mẻ
                  </button>
                </div>
              )}
            </div>
            <Textarea
              id="order-note"
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="VD: 170kg X 3 mẻ, Sản xuất theo đơn khách hàng..."
              className="text-xs"
            />
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
              disabled={pending || !productId || !totalQuantity || (isSplit && batches.length === 0)}
            >
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin size-3.5" /> Đang tạo…
                </>
              ) : isSplit && batches.length > 1 ? (
                `Tạo ${batches.length} lệnh sản xuất`
              ) : (
                "Tạo lệnh"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
