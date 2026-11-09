"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  KeyRoundIcon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  PlusIcon,
  PowerIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  changeEmployeeEmailAction,
  createEmployeeAction,
  resetEmployeePasswordAction,
  setEmployeeActiveAction,
  updateEmployeeAction,
} from "@/actions/nhan-su-actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/form-state";
import { ROLE_LABELS } from "@/lib/labels";
import { ROLES, type Employee, type Role } from "@/lib/types";

export function EmployeeFormDialog({ employee }: { employee?: Employee }) {
  const editing = Boolean(employee);
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<Role>(employee?.role ?? "kho");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    editing ? updateEmployeeAction : createEmployeeAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      if (!editing) {
        formRef.current?.reset();
        setRole("kho");
      }
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state, editing]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {editing ? (
          <Button size="icon-sm" variant="ghost" aria-label="Sửa hồ sơ">
            <PencilIcon />
          </Button>
        ) : (
          <Button size="sm">
            <PlusIcon /> Thêm nhân viên
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Sửa hồ sơ nhân viên" : "Thêm nhân viên"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Cập nhật thông tin cá nhân, vai trò và lương theo ngày."
              : "Tạo tài khoản đăng nhập và hồ sơ cho nhân viên mới."}
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          {editing && <input type="hidden" name="id" value={employee!.id} />}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emp-name">Họ tên</Label>
              <Input
                id="emp-name"
                name="full_name"
                defaultValue={employee?.full_name}
                placeholder="VD: Nguyễn Văn A"
                required
              />
            </div>

            {!editing && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="emp-email">Email / tên đăng nhập</Label>
                  <Input
                    id="emp-email"
                    name="email"
                    placeholder="VD: anhnv hoặc anhnv@vuongphat.test"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emp-password">Mật khẩu</Label>
                  <Input
                    id="emp-password"
                    name="password"
                    type="password"
                    minLength={6}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Vai trò</Label>
              <Select
                name="role"
                value={role}
                onValueChange={(value) => setRole(value as Role)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {ROLE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-title">Chức danh</Label>
              <Input
                id="emp-title"
                name="job_title"
                defaultValue={employee?.job_title ?? ""}
                placeholder="VD: Thợ làm bánh"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">Số điện thoại</Label>
              <Input
                id="emp-phone"
                name="phone"
                defaultValue={employee?.phone ?? ""}
                placeholder="VD: 0909 123 456"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-wage">Lương / ngày (VNĐ)</Label>
              <Input
                id="emp-wage"
                name="daily_wage"
                type="number"
                min={0}
                step={1000}
                defaultValue={employee?.daily_wage ?? 0}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-dob">Ngày sinh</Label>
              <Input
                id="emp-dob"
                name="date_of_birth"
                type="date"
                defaultValue={employee?.date_of_birth ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-start">Ngày vào làm</Label>
              <Input
                id="emp-start"
                name="start_date"
                type="date"
                defaultValue={employee?.start_date ?? ""}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emp-address">Địa chỉ</Label>
              <Textarea
                id="emp-address"
                name="address"
                rows={2}
                defaultValue={employee?.address ?? ""}
              />
            </div>

            {editing && (
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={employee!.active}
                  className="size-4 accent-primary"
                />
                Đang hoạt động
              </label>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang lưu…
                </>
              ) : editing ? (
                "Lưu hồ sơ"
              ) : (
                "Tạo nhân viên"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ChangeEmailDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    changeEmployeeEmailAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Đổi email">
          <MailIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đổi email đăng nhập</DialogTitle>
          <DialogDescription>
            Đổi email dùng để đăng nhập của {employee.full_name}.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={employee.id} />
          <div className="space-y-2">
            <Label htmlFor="email-new">Email mới</Label>
            <Input
              id="email-new"
              name="email"
              defaultValue={employee.email ?? ""}
              placeholder="VD: anhnv@vuongphat.test"
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang lưu…
                </>
              ) : (
                "Đổi email"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ResetPasswordDialog({ employee }: { employee: Employee }) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    resetEmployeePasswordAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon-sm" variant="ghost" aria-label="Đặt lại mật khẩu">
          <KeyRoundIcon />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Đặt lại mật khẩu</DialogTitle>
          <DialogDescription>
            Tạo mật khẩu mới cho {employee.full_name}. Báo lại mật khẩu cho nhân
            viên sau khi đổi.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={employee.id} />
          <div className="space-y-2">
            <Label htmlFor="pw-new">Mật khẩu mới</Label>
            <Input
              id="pw-new"
              name="password"
              type="password"
              minLength={6}
              placeholder="Tối thiểu 6 ký tự"
              required
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Huỷ
              </Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? (
                <>
                  <Loader2Icon className="animate-spin" /> Đang lưu…
                </>
              ) : (
                "Đặt lại mật khẩu"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function EmployeeActiveButton({ employee }: { employee: Employee }) {
  const [pending, startTransition] = useTransition();

  function handleToggle() {
    const formData = new FormData();
    formData.set("id", employee.id);
    formData.set("active", String(!employee.active));
    startTransition(async () => {
      const result = await setEmployeeActiveAction(initialFormState, formData);
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message ?? "Không thể cập nhật trạng thái.");
    });
  }

  return (
    <Button
      size="icon-sm"
      variant="ghost"
      disabled={pending}
      onClick={handleToggle}
      aria-label={employee.active ? "Ngưng hoạt động" : "Kích hoạt lại"}
      title={employee.active ? "Ngưng hoạt động" : "Kích hoạt lại"}
    >
      {pending ? (
        <Loader2Icon className="animate-spin" />
      ) : (
        <PowerIcon
          className={employee.active ? "text-emerald-600" : "text-muted-foreground"}
        />
      )}
    </Button>
  );
}