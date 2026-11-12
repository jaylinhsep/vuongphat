"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Loader2Icon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  createItemAction,
  createSupplierAction,
  updateItemAction,
} from "@/actions/kho-actions";
import {
  buildSpecDescription,
  parsePackingSpecs,
  type PackingSpecOption,
} from "@/lib/packing-specs";
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
import type { InventoryItem, ItemType } from "@/lib/types";

export function ItemFormDialog({ item }: { item?: InventoryItem }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ItemType>(item?.type ?? "nguyen_lieu");
  const [unit, setUnit] = useState<string>(item?.unit ?? "kg");
  const formRef = useRef<HTMLFormElement>(null);

  const getInitialSpecs = useCallback(() => {
    const parsed = parsePackingSpecs(
      item?.packing_spec,
      item?.pack_size,
      item?.pack_unit,
      item?.unit || "kg",
    );
    return parsed.length > 0 ? parsed : [{ pack_size: 0, pack_unit: "thùng", spec: "" }];
  }, [item?.packing_spec, item?.pack_size, item?.pack_unit, item?.unit]);

  const [packingSpecs, setPackingSpecs] = useState<PackingSpecOption[]>(getInitialSpecs);

  const [state, formAction, pending] = useActionState(
    item ? updateItemAction : createItemAction,
    initialFormState,
  );

  useEffect(() => {
    if (open) {
      setType(item?.type ?? "nguyen_lieu");
      setUnit(item?.unit ?? "kg");
      setPackingSpecs(getInitialSpecs());
    }
  }, [open, item, getInitialSpecs]);

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
      setType(item?.type ?? "nguyen_lieu");
      setPackingSpecs(getInitialSpecs());
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, item, getInitialSpecs]);

  const updateSpecField = (idx: number, field: keyof PackingSpecOption, val: string | number) => {
    setPackingSpecs((prev) => {
      const next = [...prev];
      const cur = { ...next[idx], [field]: val };
      if (field === "pack_size" || field === "pack_unit") {
        const sizeNum = field === "pack_size" ? (parseFloat(String(val)) || 0) : cur.pack_size;
        const unitStr = field === "pack_unit" ? String(val) : cur.pack_unit;
        cur.spec = buildSpecDescription(sizeNum, unitStr, unit || "kg");
      }
      next[idx] = cur;
      return next;
    });
  };

  const addSpecRow = () => {
    if (packingSpecs.length >= 3) return;
    setPackingSpecs((prev) => [
      ...prev,
      { pack_size: 0, pack_unit: prev[0]?.pack_unit || "thùng", spec: "" },
    ]);
  };

  const removeSpecRow = (idx: number) => {
    if (packingSpecs.length <= 1) return;
    setPackingSpecs((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {item ? (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label="Sửa hàng hóa"
            title="Sửa hàng hóa"
          >
            <PencilIcon />
          </Button>
        ) : (
          <Button size="sm">
            <PlusIcon /> Thêm hàng hóa
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Sửa hàng hóa" : "Thêm hàng hóa"}</DialogTitle>
          <DialogDescription>
            {item
              ? "Cập nhật thông tin hàng hóa và số lượng tồn kho hiện tại."
              : "Khai báo nguyên liệu hoặc thành phẩm dùng trong kho và sản xuất."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          {item && <input type="hidden" name="id" value={item.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="item-code">Mã hàng</Label>
              <Input
                id="item-code"
                name="code"
                placeholder="VD: NL006"
                defaultValue={item?.code}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-unit">Đơn vị tính</Label>
              <Input
                id="item-unit"
                name="unit"
                placeholder="kg, lít, cái…"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="item-name">Tên hàng hóa</Label>
              <Input
                id="item-name"
                name="name"
                placeholder="VD: Bột mì đa dụng"
                defaultValue={item?.name}
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
                  {(["nguyen_lieu", "ban_thanh_pham", "thanh_pham"] as const).map((value) => (
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
                defaultValue={item?.unit_price ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-on-hand">Tồn kho hiện tại</Label>
              <Input
                id="item-on-hand"
                name="on_hand"
                type="number"
                min={0}
                step="0.001"
                defaultValue={item?.on_hand ?? 0}
              />
              <p className="text-xs text-muted-foreground">
                Số lượng thực tế đang có trong kho.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-min-stock">Tồn tối thiểu</Label>
              <Input
                id="item-min-stock"
                name="min_stock"
                type="number"
                min={0}
                step="0.001"
                defaultValue={item?.min_stock ?? 0}
              />
              <p className="text-xs text-muted-foreground">
                Ngưỡng cảnh báo khi tồn xuống thấp.
              </p>
            </div>

            {/* Tên thương mại */}
            <div className="space-y-1.5 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="item-commercial-name" className="text-xs font-semibold text-neutral-900">
                  Tên thương mại mặc định (Áp dụng khi xuất bán)
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Ví dụ: MỰC IN BAO BÌ TRẮNG CHỊU NHIỆT
                </span>
              </div>
              <Input
                id="item-commercial-name"
                name="commercial_name"
                defaultValue={item?.commercial_name ?? ""}
                placeholder="Để trống nếu trùng tên hàng nội bộ"
                className="h-8 text-xs bg-white"
              />
            </div>

            {/* Quy cách đóng gói đa lựa chọn (1 đến 3 lựa chọn) */}
            <div className="space-y-3 sm:col-span-2 rounded-lg border border-neutral-200 bg-neutral-50/80 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <Label className="text-xs font-semibold text-neutral-900 block">
                    Quy cách đóng gói ({packingSpecs.length}/3 lựa chọn)
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Có thể thêm 2-3 quy cách để linh hoạt chọn khi lên đơn bán hàng (VD: 170kg/phuy, 20kg/thùng, 15kg/thùng)
                  </p>
                </div>
                {packingSpecs.length < 3 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSpecRow}
                    className="h-7 text-xs bg-white text-blue-700 hover:text-blue-800 border-blue-200 hover:bg-blue-50 shrink-0"
                  >
                    <PlusIcon className="size-3.5 mr-1" /> Thêm quy cách
                  </Button>
                )}
              </div>

              {/* Dữ liệu gửi lên server */}
              <input
                type="hidden"
                name="packing_specs_json"
                value={JSON.stringify(packingSpecs)}
              />
              <input
                type="hidden"
                name="pack_size"
                value={packingSpecs[0]?.pack_size || ""}
              />
              <input
                type="hidden"
                name="pack_unit"
                value={packingSpecs[0]?.pack_unit || ""}
              />
              <input
                type="hidden"
                name="packing_spec"
                value={packingSpecs[0]?.spec || ""}
              />

              <div className="space-y-2.5">
                {packingSpecs.map((spec, idx) => (
                  <div
                    key={idx}
                    className="rounded-md border border-neutral-200 bg-white p-2.5 space-y-1.5 shadow-2xs"
                  >
                    <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-700">
                      <span className="flex items-center gap-1.5">
                        <span className="inline-flex size-4 items-center justify-center rounded-full bg-blue-100 text-blue-700 text-[10px]">
                          {idx + 1}
                        </span>
                        {idx === 0 ? "Quy cách chính (Mặc định)" : `Quy cách phụ ${idx + 1}`}
                      </span>
                      {packingSpecs.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSpecRow(idx)}
                          className="text-neutral-400 hover:text-rose-600 p-0.5 rounded transition-colors"
                          title="Xóa quy cách này"
                        >
                          <Trash2Icon className="size-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Số lượng / kiện ({unit || "kg"})
                        </Label>
                        <Input
                          type="number"
                          step="any"
                          min={0.001}
                          placeholder="VD: 170"
                          value={spec.pack_size || ""}
                          onChange={(e) => updateSpecField(idx, "pack_size", e.target.value)}
                          className="h-8 text-xs bg-neutral-50/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Đơn vị bao bì
                        </Label>
                        <Input
                          placeholder="VD: phuy, thùng, can"
                          value={spec.pack_unit}
                          onChange={(e) => updateSpecField(idx, "pack_unit", e.target.value)}
                          className="h-8 text-xs bg-neutral-50/50"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[10px] text-muted-foreground">
                          Mô tả quy cách hiển thị
                        </Label>
                        <Input
                          placeholder="VD: 170KG/phuy"
                          value={spec.spec}
                          onChange={(e) => updateSpecField(idx, "spec", e.target.value)}
                          className="h-8 text-xs bg-neutral-50/50"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-[11px] text-neutral-500 italic">
                * Khi xuất phiếu bán hàng, hệ thống sẽ tự động hiển thị các lựa chọn quy cách trên và tính đúng số lượng kiện theo quy cách đã chọn.
              </p>
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
                item ? "Lưu thay đổi" : "Lưu hàng hóa"
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
