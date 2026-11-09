"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCurrency } from "@/lib/format";
import type { DashboardData } from "@/lib/types";

const chartConfig = {
  thu: { label: "Thu", color: "var(--chart-2)" },
  chi: { label: "Chi", color: "var(--chart-1)" },
} satisfies ChartConfig;

function compact(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function MonthlyCashChart({
  data,
}: {
  data: DashboardData["monthly"];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[320px] w-full">
      <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={64}
          tickFormatter={(value: number) => compact(value)}
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => formatCurrency(Number(value))}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="thu" fill="var(--color-thu)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="chi" fill="var(--color-chi)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
