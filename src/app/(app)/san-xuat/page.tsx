import Link from "next/link";
import {
  CheckCircle2Icon,
  ClockIcon,
  FactoryIcon,
  FlaskConicalIcon,
} from "lucide-react";
import { ConfirmOrderButton } from "@/components/forms/confirm-order-button";
import { ProductionOrderDialog } from "@/components/forms/production-order-form";
import { PageHeader } from "@/components/page-header";
import { ProductionStatusBadge } from "@/components/status-badges";
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
  formatDate,
  formatDateTime,
  formatNumber,
  formatQuantity,
} from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getBoms, getItems, getProductionOrders } from "@/lib/queries";

export default async function SanXuatPage() {
  await requireRole(CAN_ACCESS.sanXuat);

  const [orders, products, boms] = await Promise.all([
    getProductionOrders(),
    getItems("thanh_pham"),
    getBoms(),
  ]);

  const bomProductIds = new Set(boms.map((bom) => bom.product_id));
  const pending = orders.filter((order) => order.status === "cho_xac_nhan");
  const completed = orders.filter((order) => order.status === "hoan_thanh");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lệnh sản xuất"
        description="Tạo lệnh và xác nhận hoàn thành để hệ thống tự động trừ nguyên liệu, nhập thành phẩm."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/san-xuat/cong-thuc">
            <FlaskConicalIcon /> Công thức BOM
          </Link>
        </Button>
        <ProductionOrderDialog products={products} />
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Tổng lệnh sản xuất"
          value={formatNumber(orders.length)}
          icon={FactoryIcon}
        />
        <StatCard
          label="Chờ xác nhận"
          value={formatNumber(pending.length)}
          hint="Chưa trừ nguyên liệu"
          icon={ClockIcon}
          tone="amber"
        />
        <StatCard
          label="Đã hoàn thành"
          value={formatNumber(completed.length)}
          icon={CheckCircle2Icon}
          tone="emerald"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách lệnh sản xuất</CardTitle>
          <CardDescription>
            Bấm “Xác nhận” trên lệnh đang chờ để trừ kho theo định lượng BOM.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã lệnh</TableHead>
                  <TableHead>Thành phẩm</TableHead>
                  <TableHead className="text-right">Số lượng</TableHead>
                  <TableHead>Ngày kế hoạch</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Hoàn thành lúc</TableHead>
                  <TableHead>Ghi chú</TableHead>
                  <TableHead className="text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="py-10 text-center text-sm text-muted-foreground"
                    >
                      Chưa có lệnh sản xuất nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order) => {
                    const missingBom =
                      order.status === "cho_xac_nhan" &&
                      !bomProductIds.has(order.product_id);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">
                          {order.code}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{order.product_name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">
                            {order.product_code}
                          </p>
                          {missingBom && (
                            <p className="mt-0.5 text-[11px] text-rose-600">
                              Thiếu công thức BOM
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatQuantity(order.quantity)}{" "}
                          <span className="text-xs font-normal text-muted-foreground">
                            {order.product_unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(order.planned_date)}
                        </TableCell>
                        <TableCell>
                          <ProductionStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDateTime(order.completed_at)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {order.note ?? "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {order.status === "cho_xac_nhan" ? (
                            <ConfirmOrderButton
                              orderId={order.id}
                              orderCode={order.code}
                            />
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              —
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
