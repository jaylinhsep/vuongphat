import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { DEMO_ROLE_COOKIE, isSupabaseConfigured } from "@/lib/config";
import { HOME_PATH } from "@/lib/labels";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLES, type AppUser, type Role } from "@/lib/types";

const DEFAULT_DEMO_ROLE: Role = "admin";

export async function getCurrentUser(): Promise<AppUser | null> {
  if (!isSupabaseConfigured()) {
    const cookieStore = await cookies();
    const raw = cookieStore.get(DEMO_ROLE_COOKIE)?.value as Role | undefined;
    const role = raw && ROLES.includes(raw) ? raw : DEFAULT_DEMO_ROLE;
    return {
      id: "demo",
      name: "Quản trị viên (demo)",
      email: null,
      role,
      isDemo: true,
    };
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  const role = (profile?.role as Role | undefined) ?? "kho";

  return {
    id: user.id,
    name: profile?.full_name || user.email?.split("@")[0] || "Người dùng",
    email: user.email ?? null,
    role: ROLES.includes(role) ? role : "kho",
    isDemo: false,
  };
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  check: (role: Role) => boolean,
): Promise<AppUser> {
  const user = await requireUser();
  if (!check(user.role)) redirect(HOME_PATH[user.role]);
  return user;
}
