import { CheckCircle2Icon, ClipboardListIcon, ListTodoIcon } from "lucide-react";
import { TaskStatusButton } from "@/components/forms/task-forms";
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
import { requireUser } from "@/lib/auth";
import { formatDate, formatDateTime } from "@/lib/format";
import { getTasks } from "@/lib/queries";

export default async function CongViecPage() {
  const user = await requireUser();
  const tasks = await getTasks(user.id);
  const todoCount = tasks.filter((task) => task.status === "can_lam").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Việc của tôi"
        description="Các nhiệm vụ được giao cho bạn. Tự đánh dấu hoàn thành khi làm xong."
      />

      <div className="grid gap-4 sm:grid-cols-3">
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
        <StatCard
          label="Tổng nhiệm vụ"
          value={String(tasks.length)}
          icon={ClipboardListIcon}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodoIcon className="size-4 text-primary" /> Nhiệm vụ của bạn
          </CardTitle>
          <CardDescription>
            Xin chào {user.name} — bạn có {todoCount} việc cần làm.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-normal">Công việc</TableHead>
                  <TableHead>Hạn</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hoàn thành lúc</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có nhiệm vụ nào được giao cho bạn.
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
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {formatDate(task.due_date)}
                      </TableCell>
                      <TableCell>
                        <TaskStatusBadge status={task.status} />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {task.completed_at ? formatDateTime(task.completed_at) : "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <TaskStatusButton task={task} />
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