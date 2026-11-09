"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lastMonths, periodLabel } from "@/lib/format";

export function PeriodSelector({
  period,
  basePath,
}: {
  period: string;
  basePath: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const options = lastMonths(12);
  if (!options.some((option) => option.key === period)) {
    options.unshift({ key: period, label: periodLabel(period) });
  }

  return (
    <Select
      value={period}
      disabled={pending}
      onValueChange={(value) =>
        startTransition(() => router.push(`${basePath}?period=${value}`))
      }
    >
      <SelectTrigger className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.key} value={option.key}>
            {periodLabel(option.key)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}