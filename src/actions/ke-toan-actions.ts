"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { demoCreateCash } from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { parseNumber, todayISO } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CashType, PaymentMethod } from "@/lib/types";

async function requireKeToanWrite() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.keToan(user.role)) {
    throw new Error("Bạn không có quyền ghi sổ quỹ.");
  }
  return user;
}

export async function createCashAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireKeToanWrite();

    const type = String(formData.get("type") ?? "") as CashType;
    const amount = parseNumber(formData.get("amount"));
    const method = (String(formData.get("method") ?? "tien_mat") || "tien_mat") as PaymentMethod;
    const category = String(formData.get("category") ?? "").trim() || "Khác";
    const description = String(formData.get("description") ?? "").trim();
    const transactionDate = String(formData.get("transaction_date") ?? "") || todayISO();

    if (!["thu", "chi"].includes(type)) {
      return { status: "error", message: "Loại giao dịch không hợp lệ." };
    }
    if (!["tien_mat", "ngan_hang"].includes(method)) {
      return { status: "error", message: "Hình thức thanh toán không hợp lệ." };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: "error", message: "Số tiền phải lớn hơn 0." };
    }

    if (!isSupabaseConfigured()) {
      demoCreateCash({
        type,
        amount,
        method,
        category,
        description,
        transactionDate,
      });
    } else {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("cash_transactions").insert({
        type,
        amount,
        method,
        category,
        description: description || null,
        transaction_date: transactionDate,
      });
      if (error) throw new Error(error.message);
    }

    revalidatePath("/");
    revalidatePath("/ke-toan");
    return {
      status: "success",
      message: `Đã ghi nhận phiếu ${type === "thu" ? "thu" : "chi"}.`,
    };
  } catch (error) {
    return errorState(error);
  }
}
