import { ArrowLeftRightIcon, HistoryIcon } from "lucide-react";
import { MovementForm } from "@/components/forms/movement-form";
import { PageHeader } from "@/components/page-header";
import { MovementTypeBadge } from "@/components/status-badges";
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
import { formatCurrency, formatDateTime, formatQuantity } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getItems, getMovements, getSuppliers } from "@/lib/queries";

export default async function NhapXuatPage() {
  const user = await requireRole(CAN_ACCESS.kho);
  const canWrite = CAN_ACCESS.khoWrite(user.role);

  const [items, suppliers, movements] = await Promise.all([
    getItems(),
    getSuppliers(),
    getMovements(150),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nhập / xuất kho"
        description="Ghi nhận phiếu nhập, xuất hoặc điều chỉnh tồn kho. Hệ thống chặn xuất quá số lượng đang có."
      />

      {canWrite ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowLeftRightIcon className="size-4 text-primary" />
              Tạo phiếu kho
            </CardTitle>
            <CardDescription>
              Với phiếu điều chỉnh, nhập số dương để tăng tồn và số âm để giảm
              tồn.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MovementForm items={items} suppliers={suppliers} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-4 text-sm text-muted-foreground">
            Vai trò Kế toán chỉ được xem lịch sử kho. Việc tạo phiếu nhập/xuất
            thuộc quyền của Quản trị hoặc Kho.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HistoryIcon className="size-4 text-primary" />
            Lịch sử phiếu kho
          </CardTitle>
          <CardDescription>
            150 giao dịch gần nhất, mới nhất ở trên cùng.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Thời gian</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>Hàng hóa</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Thành tiền</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có giao dịch kho nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatDateTime(movement.created_at)}
                      </TableCell>
                      <TableCell>
                        <MovementTypeBadge type={movement.type} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{movement.item_name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {movement.item_code}
                        </p>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={
                            movement.quantity > 0
                              ? "font-semibold text-emerald-600"
                              : "font-semibold text-rose-600"
                          }
                        >
                          {movement.quantity > 0 ? "+" : ""}
                          {formatQuantity(movement.quantity)}
                        </span>{" "}
                        <span className="text-xs text-muted-foreground">
                          {movement.item_unit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(movement.unit_price)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(
                          Math.abs(movement.quantity) * movement.unit_price,
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {movement.supplier_name ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {movement.note ?? "—"}
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
