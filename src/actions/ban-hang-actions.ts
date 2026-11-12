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
import { createSupabaseAdminClient, isAdminConfigured } from "@/lib/supabase/admin";
import { isMissingTableError } from "@/lib/supabase/errors";
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
      const supabase = isAdminConfigured()
        ? createSupabaseAdminClient()
        : await createSupabaseServerClient();
      const payload: Record<string, unknown> = {
        name,
        phone: phone || null,
        address: address || null,
        note: note || null,
      };
      if (code) payload.code = code;

      const { error } = await supabase.from("customers").insert(payload);
      if (error) {
        if (isMissingTableError(error)) {
          return {
            status: "error",
            message: "Bảng dữ liệu 'customers' chưa được tạo trên Supabase. Vui lòng chạy lệnh SQL trong Supabase SQL Editor để lưu dữ liệu vĩnh viễn.",
          };
        }
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
      const supabase = isAdminConfigured()
        ? createSupabaseAdminClient()
        : await createSupabaseServerClient();
      const { error } = await supabase
        .from("customers")
        .update({
          name,
          phone: phone || null,
          address: address || null,
          note: note || null,
        })
        .eq("id", id);
      if (error) {
        if (isMissingTableError(error)) {
          return {
            status: "error",
            message: "Bảng dữ liệu 'customers' chưa được tạo trên Supabase.",
          };
        }
        throw new Error(error.message);
      }
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
      const supabase = isAdminConfigured()
        ? createSupabaseAdminClient()
        : await createSupabaseServerClient();
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) {
        if (isMissingTableError(error)) {
          return {
            status: "error",
            message: "Bảng dữ liệu 'customers' chưa được tạo trên Supabase.",
          };
        }
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

    let items: { itemId: string; quantity: number; unitPrice: number; commercialName?: string; packingSpec?: string }[] = [];
    try {
      const raw = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
      if (Array.isArray(raw)) {
        items = raw
          .map((line) => {
            const entry = line as {
              itemId?: unknown;
              quantity?: unknown;
              unitPrice?: unknown;
              commercialName?: unknown;
              packingSpec?: unknown;
            };
            return {
              itemId: String(entry.itemId ?? ""),
              quantity: Number(entry.quantity),
              unitPrice: Number(entry.unitPrice),
              commercialName: String(entry.commercialName ?? "").trim() || undefined,
              packingSpec: String(entry.packingSpec ?? "").trim() || undefined,
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
      const supabase = isAdminConfigured()
        ? createSupabaseAdminClient()
        : await createSupabaseServerClient();
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

      if (orderError) {
        if (isMissingTableError(orderError)) {
          demoCreateSalesOrder({
            customerId,
            orderDate,
            deliveryDate,
            note,
            items,
          });
          refreshBanHang();
          return { status: "success", message: "Đã tạo đơn bán hàng thành công." };
        }
        throw new Error(orderError.message);
      }

      const itemsPayload = items.map((line) => ({
        order_id: orderData.id,
        item_id: line.itemId,
        commercial_name: line.commercialName || null,
        packing_spec: line.packingSpec || null,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        total_price: line.quantity * line.unitPrice,
      }));

      let { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError && (itemsError.message.includes("packing_spec") || itemsError.message.includes("commercial_name") || itemsError.message.includes("column"))) {
        const fallbackPayload = itemsPayload.map((row) => {
          const r: Record<string, unknown> = { ...row };
          if (itemsError?.message.includes("packing_spec")) delete r.packing_spec;
          if (itemsError?.message.includes("commercial_name")) delete r.commercial_name;
          return r;
        });
        const retry = await supabase.from("sales_order_items").insert(fallbackPayload);
        itemsError = retry.error;
      }

      if (itemsError) {
        if (isMissingTableError(itemsError)) {
          demoCreateSalesOrder({
            customerId,
            orderDate,
            deliveryDate,
            note,
            items,
          });
          refreshBanHang();
          return { status: "success", message: "Đã tạo đơn bán hàng thành công." };
        }
        throw new Error(itemsError.message);
      }
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

    let items: { itemId: string; quantity: number; unitPrice: number; commercialName?: string; packingSpec?: string }[] = [];
    try {
      const raw = JSON.parse(String(formData.get("items") ?? "[]")) as unknown;
      if (Array.isArray(raw)) {
        items = raw
          .map((line) => {
            const entry = line as {
              itemId?: unknown;
              quantity?: unknown;
              unitPrice?: unknown;
              commercialName?: unknown;
              packingSpec?: unknown;
            };
            return {
              itemId: String(entry.itemId ?? ""),
              quantity: Number(entry.quantity),
              unitPrice: Number(entry.unitPrice),
              commercialName: String(entry.commercialName ?? "").trim() || undefined,
              packingSpec: String(entry.packingSpec ?? "").trim() || undefined,
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

      if (orderError) {
        if (isMissingTableError(orderError)) {
          demoUpdateSalesOrder({
            id,
            customerId,
            orderDate,
            deliveryDate,
            note,
            items,
          });
          refreshBanHang();
          return { status: "success", message: "Đã cập nhật đơn bán hàng thành công." };
        }
        throw new Error(orderError.message);
      }

      // Xóa items cũ và chèn items mới
      await supabase.from("sales_order_items").delete().eq("order_id", id);

      const itemsPayload = items.map((line) => ({
        order_id: id,
        item_id: line.itemId,
        commercial_name: line.commercialName || null,
        packing_spec: line.packingSpec || null,
        quantity: line.quantity,
        unit_price: line.unitPrice,
        total_price: line.quantity * line.unitPrice,
      }));

      let { error: itemsError } = await supabase
        .from("sales_order_items")
        .insert(itemsPayload);

      if (itemsError && (itemsError.message.includes("packing_spec") || itemsError.message.includes("commercial_name") || itemsError.message.includes("column"))) {
        const fallbackPayload = itemsPayload.map((row) => {
          const r: Record<string, unknown> = { ...row };
          if (itemsError?.message.includes("packing_spec")) delete r.packing_spec;
          if (itemsError?.message.includes("commercial_name")) delete r.commercial_name;
          return r;
        });
        const retry = await supabase.from("sales_order_items").insert(fallbackPayload);
        itemsError = retry.error;
      }

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
      refreshBanHang();
      return {
        status: "success",
        message: "Đã xác nhận xuất kho và giao hàng thành công.",
      };
    }

    const supabase = isAdminConfigured()
      ? createSupabaseAdminClient()
      : await createSupabaseServerClient();

    // 1. Thử gọi RPC confirm_sales_order nếu đã được tạo trong SQL
    let rpcSuccess = false;
    try {
      const { error: rpcError } = await supabase.rpc("confirm_sales_order", {
        p_order_id: orderId,
      });
      if (!rpcError) {
        rpcSuccess = true;
      } else if (
        !rpcError.message.includes("Could not find") &&
        !rpcError.message.includes("does not exist") &&
        rpcError.code !== "PGRST202"
      ) {
        // Lỗi logic từ SQL RPC
        if (rpcError.message.includes("không đủ tồn kho") || rpcError.message.includes("không ở trạng thái")) {
          return { status: "error", message: rpcError.message };
        }
      }
    } catch {
      // RPC không tồn tại, tiếp tục xử lý trực tiếp
    }

    // 2. Xử lý trực tiếp trên database nếu RPC chưa có
    if (!rpcSuccess) {
      const { data: order, error: orderError } = await supabase
        .from("sales_orders")
        .select(`id, code, status, total_amount, items:sales_order_items(id, item_id, quantity, unit_price)`)
        .eq("id", orderId)
        .maybeSingle();

      if (orderError && !isMissingTableError(orderError)) {
        throw new Error(orderError.message);
      }

      if (!order) {
        try {
          demoConfirmSalesOrder(orderId);
          refreshBanHang();
          return {
            status: "success",
            message: "Đã xác nhận xuất kho và giao hàng thành công.",
          };
        } catch {
          return { status: "error", message: "Không tìm thấy đơn hàng trên hệ thống." };
        }
      }

      if (order.status !== "cho_xac_nhan") {
        return {
          status: "error",
          message: `Đơn hàng đang ở trạng thái "${order.status === "da_giao" ? "Đã giao hàng" : order.status}", không thể xuất kho lần nữa.`,
        };
      }

      // Ghi nhận xuất kho vào bảng stock_movements
      const itemsList = (order.items as Array<{ item_id: string; quantity: number; unit_price: number }>) ?? [];
      for (const it of itemsList) {
        const qty = parseFloat(String(it.quantity)) || 0;
        if (qty > 0 && it.item_id) {
          try {
            await supabase.from("stock_movements").insert({
              item_id: it.item_id,
              type: "xuat",
              quantity: -qty,
              unit_price: it.unit_price || 0,
              note: `Xuất bán theo đơn ${order.code}`,
              reference_type: "sales_order",
              reference_id: order.id,
            });
          } catch {
            // Không chặn nếu bảng stock_movements có khác biệt
          }
        }
      }

      // Cập nhật trạng thái đơn hàng sang 'da_giao'
      const { error: updateError } = await supabase
        .from("sales_orders")
        .update({ status: "da_giao" })
        .eq("id", orderId);

      if (updateError) throw new Error(updateError.message);
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
      const supabase = isAdminConfigured()
        ? createSupabaseAdminClient()
        : await createSupabaseServerClient();

      let rpcSuccess = false;
      try {
        const { error: rpcError } = await supabase.rpc("pay_sales_order", {
          p_order_id: orderId,
          p_amount: amount,
          p_method: method,
          p_note: note || null,
        });
        if (!rpcError) {
          rpcSuccess = true;
        }
      } catch {
        // RPC không tồn tại, tiếp tục xử lý trực tiếp
      }

      if (!rpcSuccess) {
        const { data: order, error: orderErr } = await supabase
          .from("sales_orders")
          .select("id, code, total_amount, paid_amount")
          .eq("id", orderId)
          .maybeSingle();

        if (orderErr && !isMissingTableError(orderErr)) {
          throw new Error(orderErr.message);
        }

        if (order) {
          const currentTotal = parseFloat(String(order.total_amount)) || 0;
          const currentPaid = parseFloat(String(order.paid_amount)) || 0;
          const newPaid = Math.min(currentTotal, currentPaid + amount);
          const newStatus =
            newPaid >= currentTotal
              ? "da_thanh_toan"
              : newPaid > 0
              ? "thanh_toan_mot_phan"
              : "chua_thanh_toan";

          const { error: updateErr } = await supabase
            .from("sales_orders")
            .update({
              paid_amount: newPaid,
              payment_status: newStatus,
            })
            .eq("id", orderId);

          if (updateErr) throw new Error(updateErr.message);

          // Tạo phiếu thu vào sổ quỹ cash_ledger nếu có
          try {
            await supabase.from("cash_ledger").insert({
              type: "thu",
              amount,
              payment_method: method,
              note: note || `Thu tiền đơn bán ${order.code}`,
              date: todayISO(),
              reference_type: "sales_order",
              reference_id: order.id,
            });
          } catch {
            // Không chặn nếu sổ quỹ chưa tạo
          }
        } else {
          try {
            demoPaySalesOrder(orderId, amount, method, note);
          } catch {
            return { status: "error", message: "Không tìm thấy đơn hàng." };
          }
        }
      }
    }

    refreshBanHang();
    return {
      status: "success",
      message: "Đã ghi nhận thanh toán thành công.",
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
      const supabase = isAdminConfigured()
        ? createSupabaseAdminClient()
        : await createSupabaseServerClient();

      const { data: order, error: orderErr } = await supabase
        .from("sales_orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle();

      if (orderErr && !isMissingTableError(orderErr)) {
        throw new Error(orderErr.message);
      }

      if (order) {
        if (order.status !== "cho_xac_nhan") {
          return { status: "error", message: "Chỉ có thể hủy đơn hàng ở trạng thái chờ xác nhận." };
        }
        const { error: updateErr } = await supabase
          .from("sales_orders")
          .update({ status: "huy" })
          .eq("id", orderId);

        if (updateErr) throw new Error(updateErr.message);
      } else {
        try {
          demoCancelSalesOrder(orderId);
        } catch {
          return { status: "error", message: "Không tìm thấy đơn hàng." };
        }
      }
    }

    refreshBanHang();
    return { status: "success", message: "Đã hủy đơn bán hàng." };
  } catch (error) {
    return errorState(error);
  }
}
