import { BanknoteIcon, CalendarCheckIcon, DownloadIcon, UsersIcon } from "lucide-react";
import { deletePayrollAdjustmentAction } from "@/actions/nhan-su-actions";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { AdjustmentForm } from "@/components/forms/payroll-form";
import { PageHeader } from "@/components/page-header";
import { PeriodSelector } from "@/components/period-selector";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  currentPeriod,
  formatCurrency,
  formatQuantity,
  periodLabel,
} from "@/lib/format";
import { CAN_ACCESS, ROLE_LABELS } from "@/lib/labels";
import {
  getEmployees,
  getPayroll,
  getPayrollAdjustments,
} from "@/lib/queries";

export default async function BangLuongPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  await requireRole(CAN_ACCESS.nhanSu);
  const params = await searchParams;
  const period =
    params.period && /^\d{4}-\d{2}$/.test(params.period)
      ? params.period
      : currentPeriod();

  const [payroll, adjustments, employees] = await Promise.all([
    getPayroll(period),
    getPayrollAdjustments(period),
    getEmployees(),
  ]);
  const activeEmployees = employees.filter((employee) => employee.active);
  const totalNet = payroll.reduce((total, row) => total + row.net_salary, 0);
  const totalDays = payroll.reduce((total, row) => total + row.total_days, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bảng lương"
        description={`Lương theo ngày công: ngày công × lương/ngày, cộng điều chỉnh (${periodLabel(period)}).`}
      >
        <PeriodSelector period={period} basePath="/nhan-su/bang-luong" />
        <Button asChild variant="outline" size="sm">
          <a href={`/api/nhan-su/excel?period=${period}`}>
            <DownloadIcon /> Xuất Excel
          </a>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng thực lãnh trong kỳ"
          value={formatCurrency(totalNet)}
          icon={BanknoteIcon}
        />
        <StatCard
          label="Tổng ngày công"
          value={formatQuantity(totalDays)}
          icon={CalendarCheckIcon}
          tone="emerald"
        />
        <StatCard
          label="Nhân viên tính lương"
          value={String(payroll.length)}
          icon={UsersIcon}
          tone="amber"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BanknoteIcon className="size-4 text-primary" /> Bảng lương chi tiết
          </CardTitle>
          <CardDescription>
            Chỉ tính cho nhân viên đang hoạt động. Thực lãnh = lương theo ngày
            công + tổng điều chỉnh.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-normal">Nhân viên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead className="text-right">Ngày công</TableHead>
                  <TableHead className="text-right">Lương / ngày</TableHead>
                  <TableHead className="text-right">Lương ngày công</TableHead>
                  <TableHead className="text-right">Điều chỉnh</TableHead>
                  <TableHead className="text-right">Thực lãnh</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payroll.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có nhân viên đang hoạt động để tính lương.
                    </TableCell>
                  </TableRow>
                ) : (
                  payroll.map((row) => (
                    <TableRow key={row.employee_id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{row.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {row.job_title ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {ROLE_LABELS[row.role]}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatQuantity(row.total_days)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(row.daily_wage)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(row.base_salary)}
                      </TableCell>
                      <TableCell
                        className={
                          row.adjustments >= 0
                            ? "text-right text-emerald-600"
                            : "text-right text-rose-600"
                        }
                      >
                        {row.adjustments >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(row.adjustments))}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(row.net_salary)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thêm điều chỉnh lương — {periodLabel(period)}</CardTitle>
          <CardDescription>
            Thưởng, phụ cấp (số dương) hoặc khấu trừ, tạm ứng (số âm) cho kỳ này.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdjustmentForm employees={activeEmployees} period={period} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Điều chỉnh trong kỳ</CardTitle>
          <CardDescription>
            {adjustments.length} điều chỉnh của kỳ đã chọn.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead className="text-right">Số tiền</TableHead>
                  <TableHead>Diễn giải</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có điều chỉnh lương trong kỳ này.
                    </TableCell>
                  </TableRow>
                ) : (
                  adjustments.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        {row.employee_name}
                      </TableCell>
                      <TableCell
                        className={
                          row.amount >= 0
                            ? "text-right font-medium text-emerald-600"
                            : "text-right font-medium text-rose-600"
                        }
                      >
                        {row.amount >= 0 ? "+" : "−"}
                        {formatCurrency(Math.abs(row.amount))}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.description ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <ConfirmDeleteButton
                            action={deletePayrollAdjustmentAction}
                            id={row.id}
                            title="Xóa điều chỉnh lương?"
                            description={`Xóa điều chỉnh ${formatCurrency(row.amount)} của ${row.employee_name}.`}
                            confirmLabel="Xóa điều chỉnh"
                          />
                        </div>
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