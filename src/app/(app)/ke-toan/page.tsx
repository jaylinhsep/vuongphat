import Link from "next/link";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  DownloadIcon,
  FilterIcon,
  PlusIcon,
  ScaleIcon,
  WalletIcon,
} from "lucide-react";
import { CashForm } from "@/components/forms/cash-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { CashTypeBadge } from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import {
  formatCurrency,
  formatDate,
  startOfMonthISO,
  todayISO,
} from "@/lib/format";
import {
  CAN_ACCESS,
  CASH_TYPE_LABELS,
  PAYMENT_METHOD_LABELS,
} from "@/lib/labels";
import { getCashTransactions } from "@/lib/queries";
import type { CashType } from "@/lib/types";

export default async function KeToanPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; type?: string }>;
}) {
  await requireRole(CAN_ACCESS.keToan);
  const params = await searchParams;

  const from = params.from || startOfMonthISO();
  const to = params.to || todayISO();
  const type: CashType | "all" =
    params.type === "thu" || params.type === "chi" ? params.type : "all";

  const rows = await getCashTransactions({ from, to, type });
  const totalThu = rows
    .filter((row) => row.type === "thu")
    .reduce((total, row) => total + row.amount, 0);
  const totalChi = rows
    .filter((row) => row.type === "chi")
    .reduce((total, row) => total + row.amount, 0);
  const balance = totalThu - totalChi;

  const exportParams = new URLSearchParams();
  if (from) exportParams.set("from", from);
  if (to) exportParams.set("to", to);
  if (type !== "all") exportParams.set("type", type);
  const exportHref = `/api/ke-toan/excel?${exportParams.toString()}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sổ quỹ thu chi"
        description="Theo dõi mọi dòng tiền vào/ra và xuất báo cáo Excel cho nội bộ hoặc cơ quan thuế."
      >
        <Button asChild>
          <a href={exportHref}>
            <DownloadIcon /> Xuất Excel
          </a>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng thu trong kỳ"
          value={formatCurrency(totalThu)}
          icon={ArrowDownLeftIcon}
          tone="emerald"
        />
        <StatCard
          label="Tổng chi trong kỳ"
          value={formatCurrency(totalChi)}
          icon={ArrowUpRightIcon}
          tone="rose"
        />
        <StatCard
          label="Số dư trong kỳ"
          value={formatCurrency(balance)}
          hint={`${formatDate(from)} — ${formatDate(to)}`}
          icon={ScaleIcon}
          tone={balance >= 0 ? "primary" : "amber"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlusIcon className="size-4 text-primary" /> Ghi nhận giao dịch
          </CardTitle>
          <CardDescription>
            Nhập khoản thu hoặc chi tiền mặt / ngân hàng vào sổ quỹ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <WalletIcon className="size-4 text-primary" /> Sổ quỹ chi tiết
            </CardTitle>
            <CardDescription>
              {rows.length} giao dịch trong kỳ đã chọn.
            </CardDescription>
          </div>
          <form
            action="/ke-toan"
            className="flex flex-wrap items-end gap-3 border-t pt-3"
          >
            <div className="space-y-1.5">
              <Label htmlFor="filter-from" className="text-xs">
                Từ ngày
              </Label>
              <Input
                id="filter-from"
                name="from"
                type="date"
                defaultValue={from}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-to" className="text-xs">
                Đến ngày
              </Label>
              <Input
                id="filter-to"
                name="to"
                type="date"
                defaultValue={to}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Loại</Label>
              <Select name="type" defaultValue={type}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  {(["thu", "chi"] as const).map((value) => (
                    <SelectItem key={value} value={value}>
                      {CASH_TYPE_LABELS[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" variant="outline">
              <FilterIcon /> Lọc
            </Button>
            <Button asChild variant="ghost">
              <Link href="/ke-toan">Đặt lại</Link>
            </Button>
          </form>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Danh mục / Diễn giải</TableHead>
                  <TableHead>Hình thức</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Người tạo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Không có giao dịch trong khoảng thời gian đã chọn.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.transaction_date)}
                      </TableCell>
                      <TableCell>
                        <CashTypeBadge type={row.type} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{row.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.description ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[row.method]}
                      </TableCell>
                      <TableCell
                        className={
                          row.type === "thu"
                            ? "text-right font-semibold text-emerald-600"
                            : "text-right font-semibold text-rose-600"
                        }
                      >
                        {row.type === "thu" ? "+" : "−"}
                        {formatCurrency(row.amount)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.created_by_name ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
