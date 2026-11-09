import { CalendarCheckIcon, ClipboardListIcon, UsersIcon } from "lucide-react";
import { deleteAttendanceAction } from "@/actions/nhan-su-actions";
import { AttendanceForm } from "@/components/forms/attendance-form";
import { ConfirmDeleteButton } from "@/components/forms/confirm-delete-button";
import { PageHeader } from "@/components/page-header";
import { PeriodSelector } from "@/components/period-selector";
import { StatCard } from "@/components/stat-card";
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
  formatDate,
  formatQuantity,
  periodLabel,
} from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import {
  getAttendance,
  getAttendanceSummary,
  getEmployees,
} from "@/lib/queries";

export default async function ChamCongPage({
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

  const [attendance, summary, employees] = await Promise.all([
    getAttendance(period),
    getAttendanceSummary(period),
    getEmployees(),
  ]);
  const activeEmployees = employees.filter((employee) => employee.active);
  const totalDays = summary.reduce((total, row) => total + row.total_days, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chấm công"
        description={`Ghi nhận ngày công theo tháng làm cơ sở tính lương (${periodLabel(period)}).`}
      >
        <PeriodSelector period={period} basePath="/nhan-su/cham-cong" />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng ngày công trong kỳ"
          value={formatQuantity(totalDays)}
          icon={CalendarCheckIcon}
        />
        <StatCard
          label="Nhân viên có ngày công"
          value={String(summary.length)}
          icon={UsersIcon}
          tone="emerald"
        />
        <StatCard
          label="Bản ghi chấm công"
          value={String(attendance.length)}
          icon={ClipboardListIcon}
          tone="amber"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheckIcon className="size-4 text-primary" /> Ghi chấm công
          </CardTitle>
          <CardDescription>
            Mỗi nhân viên chỉ có một bản ghi cho mỗi ngày; ghi lại sẽ cập nhật bản
            ghi cũ.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AttendanceForm employees={activeEmployees} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tổng hợp ngày công — {periodLabel(period)}</CardTitle>
          <CardDescription>
            Tổng ngày công của từng nhân viên trong kỳ đã chọn.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Chức danh</TableHead>
                  <TableHead className="text-right">Tổng ngày công</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có ngày công nào trong kỳ này.
                    </TableCell>
                  </TableRow>
                ) : (
                  summary.map((row) => (
                    <TableRow key={row.employee_id}>
                      <TableCell className="font-medium">{row.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.job_title ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatQuantity(row.total_days)}
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
          <CardTitle>Chi tiết chấm công</CardTitle>
          <CardDescription>
            {attendance.length} bản ghi trong kỳ đã chọn.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ngày</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead className="text-right">Ngày công</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {attendance.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có bản ghi chấm công trong kỳ này.
                    </TableCell>
                  </TableRow>
                ) : (
                  attendance.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(row.work_date)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {row.employee_name}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuantity(row.days)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.note ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <ConfirmDeleteButton
                            action={deleteAttendanceAction}
                            id={row.id}
                            title="Xóa chấm công?"
                            description={`Xóa bản ghi ngày công của ${row.employee_name} (${formatDate(row.work_date)}).`}
                            confirmLabel="Xóa chấm công"
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