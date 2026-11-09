"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoConfirmOrder,
  demoCreateOrder,
  demoSaveBom,
} from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { parseNumber, todayISO } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function requireProductionWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.sanXuat(user.role)) {
    throw new Error("Bạn không có quyền thực hiện thao tác sản xuất.");
  }
  return user;
}

function refreshSanXuat() {
  revalidatePath("/");
  revalidatePath("/san-xuat");
  revalidatePath("/san-xuat/cong-thuc");
  revalidatePath("/kho");
  revalidatePath("/kho/nhap-xuat");
}

export async function saveBomAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireProductionWrite();

    const productId = String(formData.get("product_id") ?? "");
    const outputQuantity = parseNumber(formData.get("output_quantity"));
    const note = String(formData.get("note") ?? "").trim();

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

    if (!productId) return { status: "error", message: "Vui lòng chọn thành phẩm." };
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
    return { status: "success", message: "Đã lưu công thức định lượng." };
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
    const quantity = parseNumber(formData.get("quantity"));
    const plannedDate = String(formData.get("planned_date") ?? "") || todayISO();
    const note = String(formData.get("note") ?? "").trim();

    if (!productId) return { status: "error", message: "Vui lòng chọn thành phẩm." };
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { status: "error", message: "Số lượng phải lớn hơn 0." };
    }

    if (!isSupabaseConfigured()) {
      demoCreateOrder({ productId, quantity, plannedDate, note });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("production_orders").insert({
        product_id: productId,
        quantity,
        planned_date: plannedDate,
        note: note || null,
      });
      if (error) throw new Error(error.message);
    }

    refreshSanXuat();
    return { status: "success", message: "Đã tạo lệnh sản xuất." };
  } catch (error) {
    return errorState(error);
  }
}

export async function confirmProductionAction(
  orderId: string,
): Promise<FormState> {
  try {
    await requireProductionWrite();

    if (!orderId) return { status: "error", message: "Lệnh sản xuất không hợp lệ." };

    if (!isSupabaseConfigured()) {
      demoConfirmOrder(orderId);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("confirm_production", {
        p_order_id: orderId,
      });
      if (error) throw new Error(error.message);
    }

    refreshSanXuat();
    return {
      status: "success",
      message: "Đã xác nhận hoàn thành và cập nhật tồn kho.",
    };
  } catch (error) {
    return errorState(error);
  }
}
