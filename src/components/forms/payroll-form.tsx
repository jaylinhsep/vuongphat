"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { addPayrollAdjustmentAction } from "@/actions/nhan-su-actions";
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
import type { Employee } from "@/lib/types";

export function AdjustmentForm({
  employees,
  period,
}: {
  employees: Employee[];
  period: string;
}) {
  const [employeeId, setEmployeeId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    addPayrollAdjustmentAction,
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
      <input type="hidden" name="period" value={period} />
      <div className="grid gap-4 sm:grid-cols-3">
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
          <Label htmlFor="adj-amount">Số tiền (VNĐ)</Label>
          <Input
            id="adj-amount"
            name="amount"
            type="number"
            step={1000}
            placeholder="VD: 500000 hoặc -200000"
            required
          />
          <p className="text-xs text-muted-foreground">
            Dương: thưởng/phụ cấp. Âm: khấu trừ/tạm ứng.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="adj-desc">Diễn giải</Label>
          <Input
            id="adj-desc"
            name="description"
            placeholder="VD: Thưởng chuyên cần"
          />
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? (
          <>
            <Loader2Icon className="animate-spin" /> Đang lưu…
          </>
        ) : (
          <>
            <PlusIcon /> Thêm điều chỉnh
          </>
        )}
      </Button>
    </form>
  );
}