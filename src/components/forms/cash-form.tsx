"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { createCashAction } from "@/actions/ke-toan-actions";
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
import { Textarea } from "@/components/ui/textarea";
import { initialFormState } from "@/lib/form-state";
import { todayISO } from "@/lib/format";
import { CASH_CATEGORIES, CASH_TYPE_LABELS, PAYMENT_METHOD_LABELS } from "@/lib/labels";
import type { CashType, PaymentMethod } from "@/lib/types";

export function CashForm() {
  const [type, setType] = useState<CashType>("thu");
  const [method, setMethod] = useState<PaymentMethod>("tien_mat");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    createCashAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") {
      toast.success(state.message);
      formRef.current?.reset();
      setType("thu");
      setMethod("tien_mat");
    } else if (state.status === "error") {
      toast.error(state.message);
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Loại giao dịch</Label>
          <Select
            name="type"
            value={type}
            onValueChange={(value) => setType(value as CashType)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["thu", "chi"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {CASH_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cash-amount">Số tiền (VNĐ)</Label>
          <Input
            id="cash-amount"
            name="amount"
            type="number"
            min={0}
            step={1000}
            placeholder="VD: 1500000"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Hình thức</Label>
          <Select
            name="method"
            value={method}
            onValueChange={(value) => setMethod(value as PaymentMethod)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["tien_mat", "ngan_hang"] as const).map((value) => (
                <SelectItem key={value} value={value}>
                  {PAYMENT_METHOD_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cash-date">Ngày giao dịch</Label>
          <Input
            id="cash-date"
            name="transaction_date"
            type="date"
            defaultValue={todayISO()}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cash-category">Danh mục</Label>
          <Input
            id="cash-category"
            name="category"
            list="cash-categories"
            placeholder="Chọn hoặc nhập danh mục"
            defaultValue="Bán hàng"
            required
          />
          <datalist id="cash-categories">
            {CASH_CATEGORIES.map((category) => (
              <option key={category} value={category} />
            ))}
          </datalist>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cash-description">Diễn giải</Label>
          <Textarea
            id="cash-description"
            name="description"
            rows={1}
            placeholder="Nội dung thu/chi"
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
            <PlusIcon /> Ghi nhận giao dịch
          </>
        )}
      </Button>
    </form>
  );
}
