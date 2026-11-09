import { CheckCircle2Icon, PowerIcon, UsersIcon } from "lucide-react";
import {
  ChangeEmailDialog,
  EmployeeActiveButton,
  EmployeeFormDialog,
  ResetPasswordDialog,
} from "@/components/forms/employee-forms";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Badge } from "@/components/ui/badge";
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
import { formatCurrency } from "@/lib/format";
import { CAN_ACCESS, ROLE_LABELS } from "@/lib/labels";
import { getEmployees } from "@/lib/queries";

export default async function NhanSuPage() {
  await requireRole(CAN_ACCESS.nhanSu);
  const employees = await getEmployees();
  const activeCount = employees.filter((employee) => employee.active).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhân viên"
        description="Quản lý hồ sơ, tài khoản đăng nhập và lương theo ngày của nhân viên."
      >
        <EmployeeFormDialog />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng nhân viên"
          value={String(employees.length)}
          icon={UsersIcon}
        />
        <StatCard
          label="Đang hoạt động"
          value={String(activeCount)}
          icon={CheckCircle2Icon}
          tone="emerald"
        />
        <StatCard
          label="Ngưng hoạt động"
          value={String(employees.length - activeCount)}
          icon={PowerIcon}
          tone="amber"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="size-4 text-primary" /> Danh sách nhân viên
          </CardTitle>
          <CardDescription>
            Sửa hồ sơ, đổi email, đặt lại mật khẩu hoặc ngưng hoạt động bằng các
            nút thao tác.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-normal">Họ tên</TableHead>
                  <TableHead>Vai trò</TableHead>
                  <TableHead>Chức danh</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead className="text-right">Lương / ngày</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có nhân viên nào. Bấm “Thêm nhân viên” để tạo tài khoản.
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{employee.full_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {employee.email ?? "—"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {ROLE_LABELS[employee.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.job_title ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {employee.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(employee.daily_wage)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            employee.active
                              ? "border-emerald-200 bg-emerald-50 font-normal text-emerald-700"
                              : "border-slate-200 bg-slate-50 font-normal text-slate-600"
                          }
                        >
                          {employee.active ? "Hoạt động" : "Ngưng"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-0.5">
                          <EmployeeFormDialog employee={employee} />
                          <ChangeEmailDialog employee={employee} />
                          <ResetPasswordDialog employee={employee} />
                          <EmployeeActiveButton employee={employee} />
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