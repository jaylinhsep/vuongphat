import { BoxesIcon, TruckIcon } from "lucide-react";
import {
  ItemFormDialog,
  SupplierFormDialog,
} from "@/components/forms/master-data-forms";
import { PageHeader } from "@/components/page-header";
import { ItemTypeBadge } from "@/components/status-badges";
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
import { formatCurrency, formatQuantity } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getInventory, getSuppliers } from "@/lib/queries";

export default async function DanhMucPage() {
  const user = await requireRole(CAN_ACCESS.kho);
  const canWrite = CAN_ACCESS.khoWrite(user.role);

  const [items, suppliers] = await Promise.all([
    getInventory(),
    getSuppliers(),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục hàng hóa"
        description="Khai báo nguyên liệu, thành phẩm và nhà cung cấp dùng trong hệ thống."
      >
        {canWrite && (
          <>
            <SupplierFormDialog />
            <ItemFormDialog />
          </>
        )}
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BoxesIcon className="size-4 text-primary" /> Hàng hóa
          </CardTitle>
          <CardDescription>
            {items.length} mặt hàng đang được quản lý.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã</TableHead>
                  <TableHead className="whitespace-normal">Tên hàng hóa</TableHead>
                  <TableHead>Loại</TableHead>
                  <TableHead>ĐVT</TableHead>
                  <TableHead className="text-right">Đơn giá</TableHead>
                  <TableHead className="text-right">Tồn hiện tại</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có hàng hóa nào. Bấm “Thêm hàng hóa” để bắt đầu.
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">
                        {item.code}
                      </TableCell>
                      <TableCell className="whitespace-normal font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <ItemTypeBadge type={item.type} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {item.unit}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(item.unit_price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatQuantity(item.on_hand)} {item.unit}
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
          <CardTitle className="flex items-center gap-2">
            <TruckIcon className="size-4 text-primary" /> Nhà cung cấp
          </CardTitle>
          <CardDescription>
            {suppliers.length} nhà cung cấp đã đăng ký.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tên nhà cung cấp</TableHead>
                  <TableHead>Số điện thoại</TableHead>
                  <TableHead>Ghi chú</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có nhà cung cấp nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">
                        {supplier.name}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.phone ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {supplier.note ?? "—"}
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
