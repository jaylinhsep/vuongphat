"use client";

import { useActionState } from "react";
import { Loader2Icon, LockKeyholeIcon } from "lucide-react";
import { signInAction } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialFormState } from "@/lib/form-state";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="ten@congty.vn"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Mật khẩu</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      {state.status === "error" && (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.message}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" /> Đang đăng nhập…
          </>
        ) : (
          <>
            <LockKeyholeIcon /> Đăng nhập
          </>
        )}
      </Button>
    </form>
  );
}
