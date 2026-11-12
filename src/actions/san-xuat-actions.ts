"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoConfirmOrder,
  demoCreateItem,
  demoCreateOrder,
  demoDeleteBom,
  demoSaveBom,
} from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { parseNumber, todayISO } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/errors";
import type { ItemType } from "@/lib/types";

async function requireProductionWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.sanXuat(user.role)) {
    throw new Error("Bạn không có quyền thực hiện thao tác sản xuất.");
  }
  return user;
}

async function requireBomWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.sanXuatBom(user.role)) {
    throw new Error("Bạn không có quyền thiết lập công thức (chỉ dành cho Quản trị viên).");
  }
  return user;
}

function refreshSanXuat() {
  revalidatePath("/");
  revalidatePath("/san-xuat");
  revalidatePath("/san-xuat/cong-thuc");
  revalidatePath("/san-xuat/gia-thanh");
  revalidatePath("/kho");
  revalidatePath("/kho/nhap-xuat");
  revalidatePath("/kho/danh-muc");
}

export async function saveBomAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBomWrite();

    let productId = String(formData.get("product_id") ?? "");
    const createNewProduct = formData.get("create_new_product") === "true";
    const outputQuantity = parseNumber(formData.get("output_quantity"));
    const note = String(formData.get("note") ?? "").trim();

    if (createNewProduct) {
      const newName = String(formData.get("new_product_name") ?? "").trim();
      const newCode = String(formData.get("new_product_code") ?? "").trim().toUpperCase();
      const newUnit = String(formData.get("new_product_unit") ?? "").trim() || "kg";
      const newType = (String(formData.get("new_product_type") ?? "") || "thanh_pham") as ItemType;

      if (!newName) {
        return { status: "error", message: "Vui lòng nhập tên thành phẩm mới." };
      }
      if (!newCode) {
        return { status: "error", message: "Vui lòng nhập mã thành phẩm mới." };
      }

      if (!isSupabaseConfigured()) {
        productId = demoCreateItem({
          name: newName,
          code: newCode,
          unit: newUnit,
          type: newType,
          unitPrice: 0,
          minStock: 0,
        });
      } else {
        const supabase = await createSupabaseServerClient();
        const { data: itemData, error: itemError } = await supabase
          .from("items")
          .insert({
            name: newName,
            code: newCode,
            unit: newUnit,
            type: newType,
            unit_price: 0,
            min_stock: 0,
          })
          .select("id")
          .single();

        if (itemError) {
          if (itemError.message.includes("unique") || itemError.code === "23505") {
            throw new Error(`Mã hàng "${newCode}" đã tồn tại. Vui lòng chọn mã khác.`);
          }
          throw new Error(itemError.message);
        }
        productId = itemData.id;
      }
    }

    let lines: { materialId: string; quantity: number }[] = [];
    try {
      const raw = JSON.parse(String(formData.get("lines") ?? "[]")) as unknown;
      if (Array.isArray(raw)) {
        lines = raw
          .map((line) => {
            const entry = line as { materialId?: unknown; quantity?: unknown };
            return {
              materialId: String(entry.materialId ?? ""),
              quantity: Number(entry.quantity),
            };
          })
          .filter((line) => line.materialId && Number.isFinite(line.quantity));
      }
    } catch {
      return { status: "error", message: "Dữ liệu công thức không hợp lệ." };
    }

    if (!productId) return { status: "error", message: "Vui lòng chọn hoặc tạo thành phẩm." };
    if (!Number.isFinite(outputQuantity) || outputQuantity <= 0) {
      return { status: "error", message: "Số lượng đầu ra phải lớn hơn 0." };
    }
    if (!lines.length) {
      return { status: "error", message: "Công thức phải có ít nhất một nguyên liệu." };
    }

    if (!isSupabaseConfigured()) {
      demoSaveBom({ productId, outputQuantity, note, lines });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("save_bom", {
        p_product_id: productId,
        p_output_quantity: outputQuantity,
        p_note: note || null,
        p_items: lines.map((line) => ({
          material_id: line.materialId,
          quantity: line.quantity,
        })),
      });
      if (error) throw new Error(error.message);
    }

    refreshSanXuat();
    return {
      status: "success",
      message: createNewProduct
        ? "Đã tạo thành phẩm mới và lưu công thức BOM thành công."
        : "Đã lưu công thức định lượng.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteBomAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBomWrite();

    const bomId = String(formData.get("bom_id") ?? "");
    if (!bomId) return { status: "error", message: "Thiếu mã công thức cần xóa." };

    if (!isSupabaseConfigured()) {
      demoDeleteBom(bomId);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("boms").delete().eq("id", bomId);
      if (error) {
        if (isMissingTableError(error)) {
          demoDeleteBom(bomId);
        } else {
          throw new Error(error.message);
        }
      }
    }

    refreshSanXuat();
    return { status: "success", message: "Đã xóa công thức thành công." };
  } catch (error) {
    return errorState(error);
  }
}

export async function createProductionOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireProductionWrite();

    const productId = String(formData.get("product_id") ?? "");
    const plannedDate = String(formData.get("planned_date") ?? "") || todayISO();
    const note = String(formData.get("note") ?? "").trim();
    const isSplit = formData.get("is_split") === "true";
    const splitBatchesRaw = String(formData.get("split_batches") ?? "");

    if (!productId) return { status: "error", message: "Vui lòng chọn thành phẩm." };

    let batches: Array<{ quantity: number; noteSuffix?: string }> = [];

    if (isSplit && splitBatchesRaw) {
      try {
        batches = JSON.parse(splitBatchesRaw);
      } catch {
        batches = [];
      }
    }

    if (batches.length === 0) {
      const quantity = parseNumber(formData.get("quantity"));
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return { status: "error", message: "Số lượng phải lớn hơn 0." };
      }
      batches = [{ quantity }];
    }

    for (const b of batches) {
      if (!Number.isFinite(b.quantity) || b.quantity <= 0) {
        return { status: "error", message: "Số lượng từng mẻ lệnh phải lớn hơn 0." };
      }
    }

    if (!isSupabaseConfigured()) {
      for (const b of batches) {
        const orderNote = [note, b.noteSuffix].filter(Boolean).join(" — ");
        demoCreateOrder({
          productId,
          quantity: b.quantity,
          plannedDate,
          note: orderNote || null,
        });
      }
    } else {
      const supabase = await createSupabaseServerClient();
      const rows = batches.map((b) => {
        const orderNote = [note, b.noteSuffix].filter(Boolean).join(" — ");
        return {
          product_id: productId,
          quantity: b.quantity,
          planned_date: plannedDate,
          note: orderNote || null,
        };
      });

      const { error } = await supabase.from("production_orders").insert(rows);
      if (error) throw new Error(error.message);
    }

    refreshSanXuat();
    return {
      status: "success",
      message:
        batches.length > 1
          ? `Đã tạo thành công ${batches.length} lệnh sản xuất riêng biệt.`
          : "Đã tạo lệnh sản xuất thành công.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function confirmProductionAction(
  orderId: string,
  payload?: {
    actualQuantity?: number;
    wasteQuantity?: number;
    laborCost?: number;
    otherCost?: number;
    note?: string;
  },
): Promise<FormState> {
  try {
    await requireProductionWrite();

    if (!orderId) return { status: "error", message: "Lệnh sản xuất không hợp lệ." };

    const actualQty =
      payload?.actualQuantity && payload.actualQuantity > 0
        ? payload.actualQuantity
        : undefined;
    const wasteQty =
      payload?.wasteQuantity != null ? Math.max(payload.wasteQuantity, 0) : 0;
    const laborCost =
      payload?.laborCost != null ? Math.max(payload.laborCost, 0) : 0;
    const otherCost =
      payload?.otherCost != null ? Math.max(payload.otherCost, 0) : 0;
    const note = payload?.note?.trim() || undefined;

    if (!isSupabaseConfigured()) {
      demoConfirmOrder({
        orderId,
        actualQuantity: actualQty,
        wasteQuantity: wasteQty,
        laborCost,
        otherCost,
        note,
      });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("confirm_production", {
        p_order_id: orderId,
        p_actual_quantity: actualQty ?? null,
        p_waste_quantity: wasteQty,
        p_labor_cost: laborCost,
        p_other_cost: otherCost,
        p_note: note ?? null,
      });
      if (error) throw new Error(error.message);
    }

    refreshSanXuat();
    return {
      status: "success",
      message: "Đã nghiệm thu hoàn thành lệnh sản xuất và cập nhật tồn kho.",
    };
  } catch (error) {
    return errorState(error);
  }
}
