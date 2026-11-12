"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import {
  CheckIcon,
  ChevronDownIcon,
  LogOutIcon,
  MenuIcon,
  SparklesIcon,
} from "lucide-react";
import { signOutAction, setDemoRoleAction } from "@/actions/auth-actions";
import { NAV_SECTIONS } from "@/components/app-nav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ROLE_LABELS } from "@/lib/labels";
import { ROLES, type AppUser, type Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<Role, string> = {
  admin: "bg-violet-100 text-violet-700 border-violet-200",
  kho: "bg-blue-100 text-blue-700 border-blue-200",
  san_xuat: "bg-amber-100 text-amber-700 border-amber-200",
  ke_toan: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

function initials(name: string): string {
  const words = name
    .replace(/[^\p{L}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "";
  if (words.length === 1) return words[0][0]?.toUpperCase() ?? "";
  return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
}

function SidebarBody({
  user,
  onNavigate,
}: {
  user: AppUser;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const sections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.allowed(user.role)),
  })).filter((section) => section.items.length > 0);

  return (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        onClick={onNavigate}
        className="flex items-center gap-2.5 border-b px-4 py-4"
      >
        <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm">
          VP
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-semibold">VƯỢNG PHÁT INK</span>
          <span className="block text-[11px] text-muted-foreground">
            Kho · Sản xuất · Kế toán
          </span>
        </span>
      </Link>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
        {sections.map((section) => (
          <div key={section.title}>
            <p className="px-2 pb-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                      active
                        ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <item.icon
                      className={cn("size-4", active && "text-primary")}
                    />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="flex items-center gap-2 rounded-lg px-1 py-1.5">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
              {initials(user.name) || "VP"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">
              {user.isDemo ? "Tài khoản demo" : user.email}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Tuỳ chọn tài khoản">
                <ChevronDownIcon />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-60">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs font-normal text-muted-foreground">
                  Vai trò: {ROLE_LABELS[user.role]}
                </p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user.isDemo ? (
                <>
                  <DropdownMenuLabel className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <SparklesIcon className="size-3" /> Xem theo vai trò
                  </DropdownMenuLabel>
                  {ROLES.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      disabled={isPending}
                      onSelect={() => {
                        startTransition(async () => {
                          await setDemoRoleAction(role);
                        });
                      }}
                    >
                      <span className="flex-1">{ROLE_LABELS[role]}</span>
                      {user.role === role && <CheckIcon className="size-4" />}
                    </DropdownMenuItem>
                  ))}
                </>
              ) : (
                <form action={signOutAction}>
                  <DropdownMenuItem asChild>
                    <button
                      type="submit"
                      className="flex w-full cursor-pointer items-center gap-2"
                    >
                      <LogOutIcon className="size-4" /> Đăng xuất
                    </button>
                  </DropdownMenuItem>
                </form>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

export function AppShell({
  user,
  children,
}: {
  user: AppUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const current = NAV_SECTIONS.flatMap((section) => section.items).find(
    (item) => item.href === pathname,
  );

  return (
    <div className="min-h-screen bg-muted/40">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r bg-sidebar lg:block">
        <SidebarBody user={user} />
      </aside>

      <div className="min-w-0 max-w-full overflow-x-hidden lg:pl-64">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/90 px-4 backdrop-blur lg:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                aria-label="Mở menu"
              >
                <MenuIcon />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Menu điều hướng</SheetTitle>
              <SidebarBody user={user} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {current?.label ?? "VƯỢNG PHÁT INK"}
            </p>
          </div>

          {user.isDemo && (
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700"
            >
              Demo
            </Badge>
          )}
          <Badge variant="outline" className={ROLE_BADGE[user.role]}>
            {ROLE_LABELS[user.role]}
          </Badge>
        </header>

        {user.isDemo && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 lg:px-6">
            Chế độ demo: dữ liệu mẫu lưu trong bộ nhớ máy chủ. Điền{" "}
            <code className="rounded bg-amber-100 px-1">
              NEXT_PUBLIC_SUPABASE_URL
            </code>{" "}
            và{" "}
            <code className="rounded bg-amber-100 px-1">
              NEXT_PUBLIC_SUPABASE_ANON_KEY
            </code>{" "}
            vào <code className="rounded bg-amber-100 px-1">.env.local</code> để
            dùng Supabase.
          </div>
        )}

        <main className="mx-auto w-full max-w-7xl min-w-0 p-3 sm:p-4 lg:p-6 overflow-hidden">{children}</main>
      </div>
    </div>
  );
}
