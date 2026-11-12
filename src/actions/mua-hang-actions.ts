"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoCancelPurchaseOrder,
  demoConfirmPurchaseOrder,
  demoCreatePurchaseOrder,
  demoPayPurchaseOrder,
} from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { parseNumber, todayISO } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isMissingTableError } from "@/lib/supabase/errors";
import type { PaymentMethod } from "@/lib/types";

async function requireMuaHang() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.muaHang(user.role)) {
    throw new Error("Bạn không có quyền truy cập phân hệ mua hàng.");
  }
  return user;
}

async function requireMuaHangWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.muaHangWrite(user.role)) {
    throw new Error("Bạn không có quyền thao tác mua hàng.");
  }
  return user;
}

function refreshMuaHang() {
  revalidatePath("/");
  revalidatePath("/mua-hang");
  revalidatePath("/kho");
  revalidatePath("/kho/nhap-xuat");
  revalidatePath("/ke-toan");
  revalidatePath("/ke-toan/cong-no");
}

export async function createPurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireMuaHangWrite();

    const supplierId = String(formData.get("supplier_id") ?? "");
    const orderDate = String(formData.get("order_date") ?? "") || todayISO();
    const deliveryDate = String(formData.get("delivery_date") ?? "") || null;
    const note = String(formData.get("note") ?? "").trim();

    let items: { itemId: string; quantity: number; unitPrice: number }[] = [];
    try {
      const raw = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
      if (Array.isArray(raw)) {
        items = raw
          .map((line) => {
            const entry = line as { itemId?: unknown; quantity?: unknown; unitPrice?: unknown };
            return {
              itemId: String(entry.itemId ?? ""),
              quantity: Number(entry.quantity),
              unitPrice: Number(entry.unitPrice),
            };
          })
          .filter(
            (line) =>
              line.itemId &&
              Number.isFinite(line.quantity) &&
              line.quantity > 0 &&
              Number.isFinite(line.unitPrice) &&
              line.unitPrice >= 0,
          );
      }
    } catch {
      return { status: "error", message: "Dữ liệu mặt hàng không hợp lệ." };
    }

    if (!supplierId) return { status: "error", message: "Vui lòng chọn nhà cung cấp." };
    if (!items.length) {
      return { status: "error", message: "Đơn mua phải có ít nhất một mặt hàng." };
    }

    const totalAmount = items.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );

    if (!isSupabaseConfigured()) {
      demoCreatePurchaseOrder({
        supplierId,
        orderDate,
        deliveryDate,
        note,
        items,
      });
    } else {
      const supabase = await createSupabaseServerClient();
      const { data: orderData, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          supplier_id: supplierId,
          order_date: orderDate,
          delivery_date: deliveryDate,
          total_amount: totalAmount,
          note: note || null,
        })
        .select("id")
        .single();

      if (orderError) {
        if (isMissingTableError(orderError)) {
          demoCreatePurchaseOrder({
            supplierId,
            orderDate,
            deliveryDate,
            note,
            items,
          });
          refreshMuaHang();
          return { status: "success", message: "Đã tạo đơn mua hàng thành công." };
        }
        throw new Error(orderError.message);
      }

      const itemsPayload = items.map((line) => ({
        order_id: orderData.id,
        item_id: line.itemId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        total_price: line.quantity * line.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(itemsPayload);

      if (itemsError) {
        if (isMissingTableError(itemsError)) {
          demoCreatePurchaseOrder({
            supplierId,
            orderDate,
            deliveryDate,
            note,
            items,
          });
          refreshMuaHang();
          return { status: "success", message: "Đã tạo đơn mua hàng thành công." };
        }
        throw new Error(itemsError.message);
      }
    }

    refreshMuaHang();
    return { status: "success", message: "Đã tạo đơn mua hàng thành công." };
  } catch (error) {
    return errorState(error);
  }
}

export async function confirmPurchaseOrderAction(
  orderId: string,
): Promise<FormState> {
  try {
    await requireMuaHang();

    if (!orderId) return { status: "error", message: "Thiếu đơn mua hàng." };

    if (!isSupabaseConfigured()) {
      demoConfirmPurchaseOrder(orderId);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("confirm_purchase_order", {
        p_order_id: orderId,
      });
      if (error) {
        if (isMissingTableError(error)) {
          demoConfirmPurchaseOrder(orderId);
        } else {
          throw new Error(error.message);
        }
      }
    }

    refreshMuaHang();
    return {
      status: "success",
      message: "Đã xác nhận nhập kho và cộng tồn kho thành công.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function payPurchaseOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireMuaHangWrite();

    const orderId = String(formData.get("order_id") ?? "");
    const amount = parseNumber(formData.get("amount"));
    const method = (String(formData.get("method") ?? "tien_mat") || "tien_mat") as PaymentMethod;
    const note = String(formData.get("note") ?? "").trim();

    if (!orderId) return { status: "error", message: "Thiếu đơn hàng." };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: "error", message: "Số tiền thanh toán phải lớn hơn 0." };
    }

    if (!isSupabaseConfigured()) {
      demoPayPurchaseOrder(orderId, amount, method, note);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("pay_purchase_order", {
        p_order_id: orderId,
        p_amount: amount,
        p_method: method,
        p_note: note || null,
      });
      if (error) {
        if (isMissingTableError(error)) {
          demoPayPurchaseOrder(orderId, amount, method, note);
        } else {
          throw new Error(error.message);
        }
      }
    }

    refreshMuaHang();
    return {
      status: "success",
      message: "Đã ghi nhận thanh toán tiền hàng và tạo phiếu chi sổ quỹ.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function cancelPurchaseOrderAction(
  orderId: string,
): Promise<FormState> {
  try {
    await requireMuaHangWrite();

    if (!orderId) return { status: "error", message: "Thiếu đơn mua hàng." };

    if (!isSupabaseConfigured()) {
      demoCancelPurchaseOrder(orderId);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase
        .from("purchase_orders")
        .update({ status: "huy" })
        .eq("id", orderId)
        .eq("status", "cho_nhap_kho");
      if (error) {
        if (isMissingTableError(error)) {
          demoCancelPurchaseOrder(orderId);
        } else {
          throw new Error(error.message);
        }
      }
    }

    refreshMuaHang();
    return { status: "success", message: "Đã hủy đơn mua hàng." };
  } catch (error) {
    return errorState(error);
  }
}
