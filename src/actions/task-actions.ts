"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/config";
import { demoUpdateTaskStatus } from "@/lib/demo/store";
import { errorState, type FormState } from "@/lib/form-state";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskStatus } from "@/lib/types";

export async function updateTaskStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");

    const taskId = String(formData.get("task_id") ?? "");
    const status = String(formData.get("status") ?? "") as TaskStatus;
    if (!taskId) return { status: "error", message: "Thiếu nhiệm vụ." };
    if (!["can_lam", "hoan_thanh"].includes(status)) {
      return { status: "error", message: "Trạng thái không hợp lệ." };
    }

    if (!isSupabaseConfigured()) {
      demoUpdateTaskStatus(taskId, status, user.id);
      revalidatePath("/cong-viec");
      revalidatePath("/nhan-su/cong-viec");
      return {
        status: "success",
        message:
          status === "hoan_thanh"
            ? "Đã đánh dấu hoàn thành."
            : "Đã chuyển về cần làm.",
      };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({
        status,
        completed_at: status === "hoan_thanh" ? new Date().toISOString() : null,
      })
      .eq("id", taskId)
      .eq("employee_id", user.id)
      .select("id");
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      return { status: "error", message: "Không tìm thấy nhiệm vụ của bạn." };
    }

    revalidatePath("/cong-viec");
    revalidatePath("/nhan-su/cong-viec");
    return {
      status: "success",
      message:
        status === "hoan_thanh"
          ? "Đã đánh dấu hoàn thành."
          : "Đã chuyển về cần làm.",
    };
  } catch (error) {
    return errorState(error);
  }
}