"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { CalendarCheckIcon, Loader2Icon } from "lucide-react";
import { toast } from "sonner";
import { recordAttendanceAction } from "@/actions/nhan-su-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initialFormState } from "@/lib/form-state";
import { todayISO } from "@/lib/format";
import type { Employee } from "@/lib/types";

export function AttendanceForm({ employees }: { employees: Employee[] }) {
  const [employeeId, setEmployeeId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    recordAttendanceAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
      setEmployeeId("");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2">
          <Label>Nhân viên</Label>
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
          <Label htmlFor="att-date">Ngày làm việc</Label>
          <Input
            id="att-date"
            name="work_date"
            type="date"
            defaultValue={todayISO()}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="att-days">Ngày công</Label>
          <Input
            id="att-days"
            name="days"
            type="number"
            min={0}
            max={2}
            step={0.5}
            defaultValue={1}
            required
          />
          <p className="text-xs text-muted-foreground">0 – 2 (hỗ trợ nửa ngày).</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="att-note">Ghi chú</Label>
          <Input id="att-note" name="note" placeholder="Không bắt buộc" />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" /> Đang lưu…
          </>
        ) : (
          <>
            <CalendarCheckIcon /> Ghi chấm công
          </>
        )}
      </Button>
    </form>
  );
}