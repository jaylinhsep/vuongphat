"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { DEMO_ROLE_COOKIE, DEFAULT_LOGIN_DOMAIN, isSupabaseConfigured } from "@/lib/config";
import { getCurrentUser } from "@/lib/auth";
import { HOME_PATH } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLES, type Role } from "@/lib/types";
import type { FormState } from "@/lib/form-state";

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const identifier = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const email = identifier.includes("@")
    ? identifier
    : `${identifier}@${DEFAULT_LOGIN_DOMAIN}`;

  if (!identifier || !password) {
    return { status: "error", message: "Vui lòng nhập tài khoản và mật khẩu." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      status: "error",
      message:
        error.message === "Invalid login credentials"
          ? "Tài khoản hoặc mật khẩu không đúng."
          : error.message,
    };
  }

  revalidatePath("/", "layout");
  const user = await getCurrentUser();
  redirect(HOME_PATH[user?.role ?? "kho"]);
}

export async function signOutAction(): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function setDemoRoleAction(role: Role): Promise<void> {
  if (isSupabaseConfigured()) return;
  if (!ROLES.includes(role)) return;

  const cookieStore = await cookies();
  cookieStore.set(DEMO_ROLE_COOKIE, role, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  revalidatePath("/", "layout");
}
