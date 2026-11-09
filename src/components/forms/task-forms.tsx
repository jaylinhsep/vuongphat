"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  Loader2Icon,
  PlusIcon,
  Undo2Icon,
} from "lucide-react";
import { toast } from "sonner";
import {
  assignTaskAction,
  deleteTaskAction,
} from "@/actions/nhan-su-actions";
import { updateTaskStatusAction } from "@/actions/task-actions";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
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
import { todayISO } from "@/lib/format";
import type { Employee, TaskRow } from "@/lib/types";

export function TaskFormDialog({ employees }: { employees: Employee[] }) {
  const [open, setOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    assignTaskAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      setOpen(false);
      formRef.current?.reset();
      setEmployeeId("");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <PlusIcon /> Giao việc
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Giao việc cho nhân viên</DialogTitle>
          <DialogDescription>
            Nhiệm vụ sẽ hiện trong mục “Việc của tôi” của nhân viên được giao.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Nhân viên nhận việc</Label>
            <Select
              name="employee_id"
              value={employeeId}
              onValueChange={setEmployeeId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn nhân viên" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-title">Tiêu đề công việc</Label>
            <Input
              id="task-title"
              name="title"
              placeholder="VD: Vệ sinh khu bếp cuối ca"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-due">Hạn hoàn thành</Label>
            <Input
              id="task-due"
              name="due_date"
              type="date"
              defaultValue={todayISO()}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-desc">Mô tả</Label>
            <Textarea
              id="task-desc"
              name="description"
              rows={3}
              placeholder="Hướng dẫn chi tiết (không bắt buộc)"
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
                "Giao việc"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteTaskButton({
  taskId,
  title,
}: {
  taskId: string;
  title: string;
}) {
  return (
    <ConfirmDeleteButton
      action={deleteTaskAction}
      id={taskId}
      title="Xóa nhiệm vụ?"
      description={`Nhiệm vụ “${title}” sẽ bị xóa vĩnh viễn khỏi hệ thống.`}
      confirmLabel="Xóa nhiệm vụ"
    />
  );
}

export function TaskStatusButton({ task }: { task: TaskRow }) {
  const [pending, startTransition] = useTransition();
  const done = task.status === "hoan_thanh";

  function handleToggle() {
    const formData = new FormData();
    formData.set("task_id", task.id);
    formData.set("status", done ? "can_lam" : "hoan_thanh");
    startTransition(async () => {
      const result = await updateTaskStatusAction(initialFormState, formData);
      if (result.status === "success") toast.success(result.message);
      else toast.error(result.message ?? "Không thể cập nhật nhiệm vụ.");
    });
  }

  return (
    <Button
      size="sm"
      variant={done ? "outline" : "default"}
      disabled={pending}
      onClick={handleToggle}
    >
      {pending ? (
        <Loader2Icon className="animate-spin" />
      ) : done ? (
        <Undo2Icon />
      ) : (
        <CheckIcon />
      )}
      {done ? "Làm lại" : "Hoàn thành"}
    </Button>
  );
}