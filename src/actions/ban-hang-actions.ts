"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import {
  demoCancelSalesOrder,
  demoConfirmSalesOrder,
  demoCreateCustomer,
  demoCreateSalesOrder,
  demoDeleteCustomer,
  demoPaySalesOrder,
  demoUpdateCustomer,
  demoUpdateSalesOrder,
} from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { parseNumber, todayISO } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { PaymentMethod } from "@/lib/types";

async function requireBanHang() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.banHang(user.role)) {
    throw new Error("Bạn không có quyền truy cập phân hệ bán hàng.");
  }
  return user;
}

async function requireBanHangWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.banHangWrite(user.role)) {
    throw new Error("Bạn không có quyền thao tác bán hàng.");
  }
  return user;
}

function refreshBanHang() {
  revalidatePath("/");
  revalidatePath("/ban-hang");
  revalidatePath("/ban-hang/khach-hang");
  revalidatePath("/kho");
  revalidatePath("/ke-toan");
}

// --- Khách hàng ------------------------------------------------------------

export async function createCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBanHangWrite();

    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!name) return { status: "error", message: "Vui lòng nhập tên khách hàng." };

    if (!isSupabaseConfigured()) {
      demoCreateCustomer({ code, name, phone, address, note });
    } else {
      const supabase = await createSupabaseServerClient();
      const payload: Record<string, unknown> = {
        name,
        phone: phone || null,
        address: address || null,
        note: note || null,
      };
      if (code) payload.code = code;

      const { error } = await supabase.from("customers").insert(payload);
      if (error) {
        if (error.message.includes("unique")) {
          return { status: "error", message: `Mã khách hàng "${code}" đã tồn tại.` };
        }
        throw new Error(error.message);
      }
    }

    refreshBanHang();
    return { status: "success", message: `Đã thêm khách hàng "${name}".` };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBanHangWrite();

    const id = String(formData.get("id") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const note = String(formData.get("note") ?? "").trim();

    if (!id) return { status: "error", message: "Thiếu khách hàng." };
    if (!name) return { status: "error", message: "Vui lòng nhập tên khách hàng." };

    if (!isSupabaseConfigured()) {
      demoUpdateCustomer(id, { name, phone, address, note });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase
        .from("customers")
        .update({
          name,
          phone: phone || null,
          address: address || null,
          note: note || null,
        })
        .eq("id", id);
      if (error) throw new Error(error.message);
    }

    refreshBanHang();
    return { status: "success", message: `Đã cập nhật khách hàng "${name}".` };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBanHangWrite();

    const id = String(formData.get("id") ?? "");
    if (!id) return { status: "error", message: "Thiếu khách hàng." };

    if (!isSupabaseConfigured()) {
      demoDeleteCustomer(id);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) {
        if (error.message.includes("foreign key") || error.message.includes("sales_orders")) {
          return { status: "error", message: "Không thể xóa khách hàng đã có đơn bán hàng." };
        }
        throw new Error(error.message);
      }
    }

    refreshBanHang();
    return { status: "success", message: "Đã xóa khách hàng." };
  } catch (error) {
    return errorState(error);
  }
}

// --- Đơn bán hàng ----------------------------------------------------------

export async function createSalesOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBanHangWrite();

    const customerId = String(formData.get("customer_id") ?? "");
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

    if (!customerId) return { status: "error", message: "Vui lòng chọn khách hàng." };
    if (!items.length) {
      return { status: "error", message: "Đơn hàng phải có ít nhất một mặt hàng." };
    }

    const totalAmount = items.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );

    if (!isSupabaseConfigured()) {
      demoCreateSalesOrder({
        customerId,
        orderDate,
        deliveryDate,
        note,
        items,
      });
    } else {
      const supabase = await createSupabaseServerClient();
      const { data: orderData, error: orderError } = await supabase
        .from("sales_orders")
        .insert({
          customer_id: customerId,
          order_date: orderDate,
          delivery_date: deliveryDate,
          total_amount: totalAmount,
          note: note || null,
        })
        .select("id")
        .single();

      if (orderError) throw new Error(orderError.message);

      const itemsPayload = items.map((line) => ({
        order_id: orderData.id,
        item_id: line.itemId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        total_price: line.quantity * line.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError) throw new Error(itemsError.message);
    }

    refreshBanHang();
    return { status: "success", message: "Đã tạo đơn bán hàng thành công." };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateSalesOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
    if (user.role !== "admin") {
      throw new Error("Chỉ Quản trị viên (Admin) mới có quyền chỉnh sửa đơn bán hàng.");
    }

    const id = String(formData.get("id") ?? "");
    const customerId = String(formData.get("customer_id") ?? "");
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

    if (!id) return { status: "error", message: "Thiếu mã đơn hàng." };
    if (!customerId) return { status: "error", message: "Vui lòng chọn khách hàng." };
    if (!items.length) {
      return { status: "error", message: "Đơn hàng phải có ít nhất một mặt hàng." };
    }

    const totalAmount = items.reduce(
      (sum, line) => sum + line.quantity * line.unitPrice,
      0,
    );

    if (!isSupabaseConfigured()) {
      demoUpdateSalesOrder({
        id,
        customerId,
        orderDate,
        deliveryDate,
        note,
        items,
      });
    } else {
      const supabase = await createSupabaseServerClient();

      const { error: orderError } = await supabase
        .from("sales_orders")
        .update({
          customer_id: customerId,
          order_date: orderDate,
          delivery_date: deliveryDate,
          total_amount: totalAmount,
          note: note || null,
        })
        .eq("id", id);

      if (orderError) throw new Error(orderError.message);

      // Xóa items cũ và chèn items mới
      await supabase.from("sales_order_items").delete().eq("order_id", id);

      const itemsPayload = items.map((line) => ({
        order_id: id,
        item_id: line.itemId,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        total_price: line.quantity * line.unitPrice,
      }));

      const { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError) throw new Error(itemsError.message);
    }

    refreshBanHang();
    return { status: "success", message: "Đã cập nhật đơn bán hàng thành công." };
  } catch (error) {
    return errorState(error);
  }
}

export async function confirmSalesOrderAction(
  orderId: string,
): Promise<FormState> {
  try {
    await requireBanHang();

    if (!orderId) return { status: "error", message: "Thiếu đơn hàng." };

    if (!isSupabaseConfigured()) {
      demoConfirmSalesOrder(orderId);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("confirm_sales_order", {
        p_order_id: orderId,
      });
      if (error) throw new Error(error.message);
    }

    refreshBanHang();
    return {
      status: "success",
      message: "Đã xác nhận xuất kho và giao hàng thành công.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function paySalesOrderAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireBanHangWrite();

    const orderId = String(formData.get("order_id") ?? "");
    const amount = parseNumber(formData.get("amount"));
    const method = (String(formData.get("method") ?? "tien_mat") || "tien_mat") as PaymentMethod;
    const note = String(formData.get("note") ?? "").trim();

    if (!orderId) return { status: "error", message: "Thiếu đơn hàng." };
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: "error", message: "Số tiền thanh toán phải lớn hơn 0." };
    }

    if (!isSupabaseConfigured()) {
      demoPaySalesOrder(orderId, amount, method, note);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.rpc("pay_sales_order", {
        p_order_id: orderId,
        p_amount: amount,
        p_method: method,
        p_note: note || null,
      });
      if (error) throw new Error(error.message);
    }

    refreshBanHang();
    return {
      status: "success",
      message: "Đã ghi nhận thanh toán và tạo phiếu thu vào sổ quỹ.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function cancelSalesOrderAction(
  orderId: string,
): Promise<FormState> {
  try {
    await requireBanHangWrite();

    if (!orderId) return { status: "error", message: "Thiếu đơn hàng." };

    if (!isSupabaseConfigured()) {
      demoCancelSalesOrder(orderId);
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase
        .from("sales_orders")
        .update({ status: "huy" })
        .eq("id", orderId)
        .eq("status", "cho_xac_nhan");
      if (error) throw new Error(error.message);
    }

    refreshBanHang();
    return { status: "success", message: "Đã hủy đơn bán hàng." };
  } catch (error) {
    return errorState(error);
  }
}
