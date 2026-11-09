"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_LOGIN_DOMAIN, isSupabaseConfigured } from "@/lib/config";
import { errorState, type FormState } from "@/lib/form-state";
import { currentPeriod, parseNumber, todayISO } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import {
  createSupabaseAdminClient,
  isAdminConfigured,
} from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/types";

async function requireNhanSu() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Phiên đăng nhập đã hết hạn.");
  if (!CAN_ACCESS.nhanSu(user.role)) {
    throw new Error("Bạn không có quyền quản lý nhân sự.");
  }
  if (!isSupabaseConfigured()) {
    throw new Error("Tính năng nhân sự cần kết nối Supabase.");
  }
  return user;
}

function requireAdminApi() {
  if (!isAdminConfigured()) {
    throw new Error(
      "Chưa cấu hình SUPABASE_SECRET_KEY nên không thể quản lý tài khoản nhân viên.",
    );
  }
}

function refreshNhanSu() {
  revalidatePath("/nhan-su");
  revalidatePath("/nhan-su/cong-viec");
  revalidatePath("/nhan-su/cham-cong");
  revalidatePath("/nhan-su/bang-luong");
  revalidatePath("/cong-viec");
}

function normalizeEmail(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  return trimmed.includes("@") ? trimmed : `${trimmed}@${DEFAULT_LOGIN_DOMAIN}`;
}

function dateField(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function duplicateEmailMessage(message: string, email: string): string {
  return /already|registered|exists|duplicate/i.test(message)
    ? `Email "${email}" đã được đăng ký.`
    : message;
}

export async function createEmployeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();
    requireAdminApi();

    const fullName = String(formData.get("full_name") ?? "").trim();
    const rawEmail = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const role = String(formData.get("role") ?? "") as Role;
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const jobTitle = String(formData.get("job_title") ?? "").trim();
    const dob = dateField(formData.get("date_of_birth"));
    const startDate = dateField(formData.get("start_date"));
    const wage = parseNumber(formData.get("daily_wage"));

    if (!fullName) return { status: "error", message: "Nhập họ tên nhân viên." };
    if (!rawEmail) return { status: "error", message: "Nhập email hoặc tên đăng nhập." };
    if (password.length < 6) return { status: "error", message: "Mật khẩu phải từ 6 ký tự." };
    if (!ROLES.includes(role)) return { status: "error", message: "Vai trò không hợp lệ." };

    const email = normalizeEmail(rawEmail);
    const dailyWage = Number.isFinite(wage) && wage >= 0 ? wage : 0;

    const admin = createSupabaseAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });
    if (createError) {
      return { status: "error", message: duplicateEmailMessage(createError.message, email) };
    }
    const userId = created.user?.id;
    if (!userId) throw new Error("Không tạo được tài khoản nhân viên.");

    const { error: profileError } = await admin
      .from("profiles")
      .update({
        role,
        phone: phone || null,
        address: address || null,
        job_title: jobTitle || null,
        date_of_birth: dob,
        start_date: startDate,
        daily_wage: dailyWage,
        active: true,
      })
      .eq("id", userId);
    if (profileError) throw new Error(profileError.message);

    refreshNhanSu();
    return { status: "success", message: `Đã tạo nhân viên ${fullName}.` };
  } catch (error) {
    return errorState(error);
  }
}

export async function updateEmployeeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const id = String(formData.get("id") ?? "");
    const fullName = String(formData.get("full_name") ?? "").trim();
    const role = String(formData.get("role") ?? "") as Role;
    const phone = String(formData.get("phone") ?? "").trim();
    const address = String(formData.get("address") ?? "").trim();
    const jobTitle = String(formData.get("job_title") ?? "").trim();
    const dob = dateField(formData.get("date_of_birth"));
    const startDate = dateField(formData.get("start_date"));
    const wage = parseNumber(formData.get("daily_wage"));
    const active = formData.get("active") === "on" || formData.get("active") === "true";

    if (!id) return { status: "error", message: "Thiếu nhân viên cần cập nhật." };
    if (!fullName) return { status: "error", message: "Nhập họ tên nhân viên." };
    if (!ROLES.includes(role)) return { status: "error", message: "Vai trò không hợp lệ." };

    const dailyWage = Number.isFinite(wage) && wage >= 0 ? wage : 0;
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        role,
        phone: phone || null,
        address: address || null,
        job_title: jobTitle || null,
        date_of_birth: dob,
        start_date: startDate,
        daily_wage: dailyWage,
        active,
      })
      .eq("id", id);
    if (error) throw new Error(error.message);

    refreshNhanSu();
    revalidatePath("/", "layout");
    return { status: "success", message: `Đã cập nhật hồ sơ ${fullName}.` };
  } catch (error) {
    return errorState(error);
  }
}

export async function setEmployeeActiveAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const id = String(formData.get("id") ?? "");
    const active = formData.get("active") === "true";
    if (!id) return { status: "error", message: "Thiếu nhân viên." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({ active })
      .eq("id", id);
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return {
      status: "success",
      message: active ? "Đã kích hoạt lại nhân viên." : "Đã ngưng hoạt động nhân viên.",
    };
  } catch (error) {
    return errorState(error);
  }
}

export async function changeEmployeeEmailAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();
    requireAdminApi();

    const id = String(formData.get("id") ?? "");
    const rawEmail = String(formData.get("email") ?? "").trim();
    if (!id) return { status: "error", message: "Thiếu nhân viên." };
    if (!rawEmail) return { status: "error", message: "Nhập email mới." };

    const email = normalizeEmail(rawEmail);
    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, {
      email,
      email_confirm: true,
    });
    if (error) {
      return { status: "error", message: duplicateEmailMessage(error.message, email) };
    }

    const { error: profileError } = await admin
      .from("profiles")
      .update({ email })
      .eq("id", id);
    if (profileError) throw new Error(profileError.message);

    refreshNhanSu();
    revalidatePath("/", "layout");
    return { status: "success", message: `Đã đổi email thành ${email}.` };
  } catch (error) {
    return errorState(error);
  }
}

export async function resetEmployeePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();
    requireAdminApi();

    const id = String(formData.get("id") ?? "");
    const password = String(formData.get("password") ?? "");
    if (!id) return { status: "error", message: "Thiếu nhân viên." };
    if (password.length < 6) return { status: "error", message: "Mật khẩu phải từ 6 ký tự." };

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: "Đã đặt lại mật khẩu cho nhân viên." };
  } catch (error) {
    return errorState(error);
  }
}

export async function assignTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const employeeId = String(formData.get("employee_id") ?? "");
    const title = String(formData.get("title") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
    const dueDate = String(formData.get("due_date") ?? "") || todayISO();

    if (!employeeId) return { status: "error", message: "Chọn nhân viên nhận việc." };
    if (!title) return { status: "error", message: "Nhập tiêu đề công việc." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("tasks").insert({
      employee_id: employeeId,
      title,
      description: description || null,
      due_date: dueDate,
      status: "can_lam",
    });
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: `Đã giao việc "${title}".` };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const id = String(formData.get("id") ?? "");
    if (!id) return { status: "error", message: "Thiếu nhiệm vụ." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: "Đã xóa nhiệm vụ." };
  } catch (error) {
    return errorState(error);
  }
}

export async function recordAttendanceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const employeeId = String(formData.get("employee_id") ?? "");
    const workDate = String(formData.get("work_date") ?? "") || todayISO();
    const days = parseNumber(formData.get("days"));
    const note = String(formData.get("note") ?? "").trim();

    if (!employeeId) return { status: "error", message: "Chọn nhân viên." };
    if (!Number.isFinite(days) || days < 0 || days > 2) {
      return { status: "error", message: "Ngày công phải từ 0 đến 2." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("attendance").upsert(
      {
        employee_id: employeeId,
        work_date: workDate,
        days,
        note: note || null,
      },
      { onConflict: "employee_id,work_date" },
    );
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: "Đã ghi chấm công." };
  } catch (error) {
    return errorState(error);
  }
}

export async function deleteAttendanceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const id = String(formData.get("id") ?? "");
    if (!id) return { status: "error", message: "Thiếu bản ghi chấm công." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("attendance").delete().eq("id", id);
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: "Đã xóa chấm công." };
  } catch (error) {
    return errorState(error);
  }
}

export async function addPayrollAdjustmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const employeeId = String(formData.get("employee_id") ?? "");
    const period = String(formData.get("period") ?? "") || currentPeriod();
    const amount = parseNumber(formData.get("amount"));
    const description = String(formData.get("description") ?? "").trim();

    if (!employeeId) return { status: "error", message: "Chọn nhân viên." };
    if (!/^\d{4}-\d{2}$/.test(period)) {
      return { status: "error", message: "Kỳ lương không hợp lệ (YYYY-MM)." };
    }
    if (!Number.isFinite(amount) || amount === 0) {
      return { status: "error", message: "Số tiền điều chỉnh phải khác 0." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("payroll_adjustments").insert({
      employee_id: employeeId,
      period,
      amount,
      description: description || null,
    });
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: "Đã thêm điều chỉnh lương." };
  } catch (error) {
    return errorState(error);
  }
}

export async function deletePayrollAdjustmentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  try {
    await requireNhanSu();

    const id = String(formData.get("id") ?? "");
    if (!id) return { status: "error", message: "Thiếu điều chỉnh lương." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
      .from("payroll_adjustments")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);

    refreshNhanSu();
    return { status: "success", message: "Đã xóa điều chỉnh lương." };
  } catch (error) {
    return errorState(error);
  }
}