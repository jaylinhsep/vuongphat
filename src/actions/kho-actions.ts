"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoCreateItem,
  demoCreateMovement,
  demoCreateSupplier,
  demoUpdateItem,
} from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { parseNumber } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ItemType, MovementType } from "@/lib/types";

async function requireKhoWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.khoWrite(user.role)) {
    throw new Error("Bạn không có quyền thực hiện thao tác kho.");
  }
  return user;
}

function refreshKho() {
  revalidatePath("/");
  revalidatePath("/kho");
  revalidatePath("/kho/nhap-xuat");
  revalidatePath("/kho/danh-muc");
}

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

// Đưa tồn kho về đúng giá trị mong muốn bằng phiếu điều chỉnh phần chênh lệch.
async function setItemStock(
  supabase: SupabaseServerClient,
  itemId: string,
  target: number,
  unitPrice: number,
  note: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("item_stock")
    .select("on_hand")
    .eq("id", itemId)
    .single();
  if (error) throw new Error(error.message);
  const current = Number(data?.on_hand ?? 0);
  const delta = Math.round((target - current) * 1000) / 1000;
  if (delta === 0) return;
  const { error: movementError } = await supabase.rpc("create_stock_movement", {
    p_item_id: itemId,
    p_type: "dieu_chinh",
    p_quantity: delta,
    p_unit_price: unitPrice,
    p_supplier_id: null,
    p_note: note,
  });
  if (movementError) throw new Error(movementError.message);
}

function parseStockTarget(formData: FormData): { value: number } | { error: string } {
  const raw = parseNumber(formData.get("on_hand"));
  if (!Number.isFinite(raw)) return { value: 0 };
  if (raw < 0) return { error: "Tồn kho hiện tại không được âm." };
  return { value: raw };
}

export async function createMovementAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireKhoWrite();

    const itemId = String(formData.get("item_id") ?? "");
    const type = String(formData.get("type") ?? "") as MovementType;
    const quantity = parseNumber(formData.get("quantity"));
    const unitPrice = parseNumber(formData.get("unit_price"));
    const supplierRaw = String(formData.get("supplier_id") ?? "");
    const supplierId = supplierRaw && supplierRaw !== "none" ? supplierRaw : "";
    const note = String(formData.get("note") ?? "").trim();

    if (!itemId) return { status: "error", message: "Vui lòng chọn hàng hóa." };
    if (!["nhap", "xuat", "dieu_chinh"].includes(type)) {
      return { status: "error", message: "Loại phiếu không hợp lệ." };
    }
    if (!Number.isFinite(quantity) || quantity === 0) {
      return { status: "error", message: "Số lượng phải khác 0." };
    }
    if (Number.isFinite(unitPrice) && unitPrice < 0) {
      return { status: "error", message: "Đơn giá không hợp lệ." };
    }

    const payload = {
      itemId,
      type: type as "nhap" | "xuat" | "dieu_chinh",
      quantity,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      supplierId: supplierId || null,
      note: note || null,
    };

    if (!isSupabaseConfigured()) {
      demoCreateMovement(payload);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("create_stock_movement", {
        p_item_id: itemId,
        p_type: type,
        p_quantity: quantity,
        p_unit_price: payload.unitPrice,
        p_supplier_id: payload.supplierId,
        p_note: payload.note,
      });
      if (error) throw new Error(error.message);
    }

    refreshKho();
    return { status: "success", message: "Đã ghi nhận phiếu kho." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireKhoWrite();

    const code = String(formData.get("code") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const unit = String(formData.get("unit") ?? "").trim();
    const type = String(formData.get("type") ?? "") as ItemType;
    const unitPrice = parseNumber(formData.get("unit_price"));
    const minStock = parseNumber(formData.get("min_stock"));
    const rawPackingSpec = String(formData.get("packing_spec") ?? "").trim();
    const packSize = parseNumber(formData.get("pack_size"));
    const packUnit = String(formData.get("pack_unit") ?? "").trim() || "thùng";
    const packingSpec =
      rawPackingSpec ||
      (Number.isFinite(packSize) && packSize > 0
        ? `${packSize}${unit}/${packUnit}`
        : null);

    if (!code || !name || !unit) {
      return { status: "error", message: "Nhập đầy đủ mã, tên và đơn vị tính." };
    }
    if (!["nguyen_lieu", "ban_thanh_pham", "thanh_pham"].includes(type)) {
      return { status: "error", message: "Loại hàng hóa không hợp lệ." };
    }

    const stock = parseStockTarget(formData);
    if ("error" in stock) return { status: "error", message: stock.error };

    const payload = {
      code,
      name,
      unit,
      type,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      minStock: Number.isFinite(minStock) ? minStock : 0,
      packingSpec,
      packSize: Number.isFinite(packSize) && packSize > 0 ? packSize : null,
      packUnit: Number.isFinite(packSize) && packSize > 0 ? packUnit : null,
      onHand: stock.value,
    };

    if (!isSupabaseConfigured()) {
      demoCreateItem(payload);
    } else {
      const supabase = await createSupabaseServerClient();
      const dbPayload: Record<string, unknown> = {
        code: payload.code,
        name: payload.name,
        unit: payload.unit,
        type: payload.type,
        unit_price: payload.unitPrice,
        min_stock: payload.minStock,
        packing_spec: payload.packingSpec,
        pack_size: payload.packSize,
        pack_unit: payload.packUnit,
      };

      let { data, error } = await supabase
        .from("items")
        .insert(dbPayload)
        .select("id")
        .single();

      if (error && (error.message.includes("packing_spec") || error.message.includes("column"))) {
        delete dbPayload.packing_spec;
        delete dbPayload.pack_size;
        delete dbPayload.pack_unit;
        const retry = await supabase.from("items").insert(dbPayload).select("id").single();
        data = retry.data;
        error = retry.error;
      }

      if (error) {
        if (error.code === "23505") {
          return { status: "error", message: `Mã hàng "${code}" đã tồn tại.` };
        }
        throw new Error(error.message);
      }
      if (data && payload.onHand !== 0) {
        await setItemStock(
          supabase,
          data.id,
          payload.onHand,
          payload.unitPrice,
          "Nhập tồn kho đầu kỳ",
        );
      }
    }

    refreshKho();
    revalidatePath("/san-xuat");
    revalidatePath("/san-xuat/cong-thuc");
    return { status: "success", message: `Đã thêm hàng hóa ${name}.` };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateItemAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireKhoWrite();

    const id = String(formData.get("id") ?? "");
    const code = String(formData.get("code") ?? "").trim();
    const name = String(formData.get("name") ?? "").trim();
    const unit = String(formData.get("unit") ?? "").trim();
    const type = String(formData.get("type") ?? "") as ItemType;
    const unitPrice = parseNumber(formData.get("unit_price"));
    const minStock = parseNumber(formData.get("min_stock"));
    const rawPackingSpec = String(formData.get("packing_spec") ?? "").trim();
    const packSize = parseNumber(formData.get("pack_size"));
    const packUnit = String(formData.get("pack_unit") ?? "").trim() || "thùng";
    const packingSpec =
      rawPackingSpec ||
      (Number.isFinite(packSize) && packSize > 0
        ? `${packSize}${unit}/${packUnit}`
        : null);

    if (!id) return { status: "error", message: "Thiếu mã hàng hóa cần sửa." };
    if (!code || !name || !unit) {
      return { status: "error", message: "Nhập đầy đủ mã, tên và đơn vị tính." };
    }
    if (!["nguyen_lieu", "ban_thanh_pham", "thanh_pham"].includes(type)) {
      return { status: "error", message: "Loại hàng hóa không hợp lệ." };
    }

    const stock = parseStockTarget(formData);
    if ("error" in stock) return { status: "error", message: stock.error };

    const payload = {
      id,
      code,
      name,
      unit,
      type,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      minStock: Number.isFinite(minStock) ? minStock : 0,
      packingSpec,
      packSize: Number.isFinite(packSize) && packSize > 0 ? packSize : null,
      packUnit: Number.isFinite(packSize) && packSize > 0 ? packUnit : null,
      onHand: stock.value,
    };

    if (!isSupabaseConfigured()) {
      demoUpdateItem(payload);
    } else {
      const supabase = await createSupabaseServerClient();
      const dbPayload: Record<string, unknown> = {
        code: payload.code,
        name: payload.name,
        unit: payload.unit,
        type: payload.type,
        unit_price: payload.unitPrice,
        min_stock: payload.minStock,
        packing_spec: payload.packingSpec,
        pack_size: payload.packSize,
        pack_unit: payload.packUnit,
      };

      let { error } = await supabase
        .from("items")
        .update(dbPayload)
        .eq("id", id);

      if (error && (error.message.includes("packing_spec") || error.message.includes("column"))) {
        delete dbPayload.packing_spec;
        delete dbPayload.pack_size;
        delete dbPayload.pack_unit;
        const retry = await supabase.from("items").update(dbPayload).eq("id", id);
        error = retry.error;
      }

      if (error) {
        if (error.code === "23505") {
          return { status: "error", message: `Mã hàng "${code}" đã tồn tại.` };
        }
        throw new Error(error.message);
      }
      await setItemStock(
        supabase,
        id,
        payload.onHand,
        payload.unitPrice,
        "Điều chỉnh tồn kho",
      );
    }

    refreshKho();
    revalidatePath("/san-xuat");
    revalidatePath("/san-xuat/cong-thuc");
    return { status: "success", message: `Đã cập nhật hàng hóa ${name}.` };
  } catch (error) {
    return errorState(error);
  }
}

export async function createSupplierAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireKhoWrite();

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!name) return { status: "error", message: "Nhập tên nhà cung cấp." };

    if (!isSupabaseConfigured()) {
      demoCreateSupplier({ name, phone, note });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("suppliers").insert({
        name,
        phone: phone || null,
        note: note || null,
      });
      if (error) {
        if (error.code === "23505") {
          return { status: "error", message: `Nhà cung cấp "${name}" đã tồn tại.` };
        }
        throw new Error(error.message);
      }
    }

    refreshKho();
    return { status: "success", message: `Đã thêm nhà cung cấp ${name}.` };
  } catch (error) {
    return errorState(error);
  }
}
