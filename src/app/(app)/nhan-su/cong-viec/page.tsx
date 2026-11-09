import { CheckCircle2Icon, ClipboardListIcon, ListTodoIcon } from "lucide-react";
import { DeleteTaskButton, TaskFormDialog } from "@/components/forms/task-forms";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TaskStatusBadge } from "@/components/status-badges";
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
import { formatDate } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getEmployees, getTasks } from "@/lib/queries";

export default async function GiaoViecPage() {
  await requireRole(CAN_ACCESS.nhanSu);
  const [tasks, employees] = await Promise.all([getTasks(), getEmployees()]);
  const activeEmployees = employees.filter((employee) => employee.active);
  const todoCount = tasks.filter((task) => task.status === "can_lam").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Giao việc"
        description="Giao nhiệm vụ hằng ngày cho nhân viên và theo dõi tiến độ hoàn thành."
      >
        <TaskFormDialog employees={activeEmployees} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng nhiệm vụ"
          value={String(tasks.length)}
          icon={ClipboardListIcon}
        />
        <StatCard
          label="Cần làm"
          value={String(todoCount)}
          icon={ListTodoIcon}
          tone="amber"
        />
        <StatCard
          label="Hoàn thành"
          value={String(tasks.length - todoCount)}
          icon={CheckCircle2Icon}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardListIcon className="size-4 text-primary" /> Nhiệm vụ đã giao
          </CardTitle>
          <CardDescription>
            Nhân viên tự đánh dấu hoàn thành trong mục “Việc của tôi”.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-normal">Công việc</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Người giao</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có nhiệm vụ nào. Bấm “Giao việc” để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  tasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell className="whitespace-normal">
                        <p className="font-medium">{task.title}</p>
                        {task.description && (
                          <p className="text-xs text-muted-foreground">
                            {task.description}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {task.employee_name}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(task.due_date)}
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {task.created_by_name ?? "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DeleteTaskButton taskId={task.id} title={task.title} />
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