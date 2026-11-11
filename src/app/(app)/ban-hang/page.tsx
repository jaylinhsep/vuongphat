import Link from "next/link";
import {
  BanknoteIcon,
  ClockIcon,
  DownloadIcon,
  PackageCheckIcon,
  PlusIcon,
  ShoppingCartIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  CancelSalesOrderButton,
  ConfirmSalesOrderButton,
  PaySalesOrderDialog,
} from "@/components/forms/confirm-sales-button";
import { CreateSalesOrderDialog } from "@/components/forms/sales-order-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  PaymentStatusBadge,
  SalesOrderStatusBadge,
} from "@/components/status-badges";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import { CAN_ACCESS } from "@/lib/labels";
import { getCustomers, getInventory, getSalesOrders } from "@/lib/queries";
import type { SalesOrderStatus } from "@/lib/types";

export default async function BanHangPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.banHang);
  const params = await searchParams;
  const statusFilter = (params.status ?? "all") as SalesOrderStatus | "all";

  const [orders, customers, inventory] = await Promise.all([
    getSalesOrders(statusFilter),
    getCustomers(),
    getInventory(),
  ]);

  const canWrite = CAN_ACCESS.banHangWrite(user.role);

  // Stats calculation
  const allOrders = statusFilter === "all" ? orders : await getSalesOrders("all");
  const totalAmount = allOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalPaid = allOrders.reduce((sum, o) => sum + o.paid_amount, 0);
  const totalDebt = Math.max(totalAmount - totalPaid, 0);
  const pendingOrders = allOrders.filter((o) => o.status === "cho_xac_nhan").length;

  const exportHref = `/api/ban-hang/excel${
    statusFilter !== "all" ? `?status=${statusFilter}` : ""
  }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Bán hàng"
        description="Lập đơn hàng bán, tự động xuất kho trừ tồn và ghi nhận công nợ / doanh thu vào sổ quỹ."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/ban-hang/khach-hang">
            <UsersRoundIcon /> Danh mục khách hàng
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={exportHref}>
            <DownloadIcon /> Xuất Excel
          </a>
        </Button>
        {canWrite && (
          <CreateSalesOrderDialog
            customers={customers}
            items={inventory}
          />
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng doanh số bán"
          value={formatCurrency(totalAmount)}
          hint="Từ toàn bộ đơn hàng"
          icon={ShoppingCartIcon}
          tone="primary"
        />
        <StatCard
          label="Đã thu tiền"
          value={formatCurrency(totalPaid)}
          hint="Đã ghi sổ quỹ thu"
          icon={BanknoteIcon}
          tone="emerald"
        />
        <StatCard
          label="Công nợ phải thu"
          value={formatCurrency(totalDebt)}
          hint="Khách hàng còn nợ"
          icon={ClockIcon}
          tone={totalDebt > 0 ? "rose" : "emerald"}
        />
        <StatCard
          label="Đơn chờ xuất kho giao"
          value={formatNumber(pendingOrders)}
          hint="Cần thủ kho chuẩn bị hàng"
          icon={PackageCheckIcon}
          tone={pendingOrders > 0 ? "amber" : undefined}
        />
      </div>

      <div className="flex gap-2 border-b pb-3">
        {[
          { key: "all", label: "Tất cả đơn" },
          { key: "cho_xac_nhan", label: "Chờ xuất kho" },
          { key: "da_giao", label: "Đã giao hàng" },
          { key: "huy", label: "Đã hủy" },
        ].map((tab) => {
          const isActive = statusFilter === tab.key;
          return (
            <Button
              key={tab.key}
              asChild
              variant={isActive ? "default" : "outline"}
              size="sm"
            >
              <Link
                href={
                  tab.key === "all" ? "/ban-hang" : `/ban-hang?status=${tab.key}`
                }
              >
                {tab.label}
              </Link>
            </Button>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách đơn bán hàng ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto border-y sm:rounded-md sm:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">STT</TableHead>
                  <TableHead className="w-32 font-mono">Mã đơn</TableHead>
                  <TableHead className="w-28">Ngày đặt</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Mặt hàng bán</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-right">Đã trả</TableHead>
                  <TableHead className="w-32 text-center">Trạng thái giao</TableHead>
                  <TableHead className="w-36 text-center">Thanh toán</TableHead>
                  <TableHead className="w-48 text-right">Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-28 text-center text-neutral-500"
                    >
                      Không có đơn hàng bán nào.
                    </TableCell>
                  </TableRow>
                ) : (
                  orders.map((order, idx) => {
                    const remaining = Math.max(
                      order.total_amount - order.paid_amount,
                      0,
                    );
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="text-center font-mono text-xs text-neutral-500">
                          {idx + 1}
                        </TableCell>
                        <TableCell className="font-mono text-xs font-semibold">
                          {order.code}
                        </TableCell>
                        <TableCell className="text-xs">
                          {formatDate(order.order_date)}
                        </TableCell>
                        <TableCell>
                          <p className="font-medium text-sm">
                            {order.customer_name}
                          </p>
                          {order.customer_phone && (
                            <p className="text-xs text-neutral-500">
                              {order.customer_phone}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {order.items.map((item) => (
                            <div key={item.id} className="leading-tight">
                              • {item.item_name}:{" "}
                              <span className="font-semibold">
                                {item.quantity} {item.item_unit}
                              </span>{" "}
                              × {formatCurrency(item.unit_price)}
                            </div>
                          ))}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-sm">
                          {formatCurrency(order.total_amount)}
                        </TableCell>
                        <TableCell className="text-right text-xs">
                          <span
                            className={
                              order.paid_amount >= order.total_amount
                                ? "text-emerald-700 font-semibold"
                                : "text-neutral-700"
                            }
                          >
                            {formatCurrency(order.paid_amount)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <SalesOrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <PaymentStatusBadge status={order.payment_status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status === "cho_xac_nhan" && (
                              <ConfirmSalesOrderButton order={order} />
                            )}
                            {order.status !== "huy" && remaining > 0 && canWrite && (
                              <PaySalesOrderDialog order={order} />
                            )}
                            {order.status === "cho_xac_nhan" && canWrite && (
                              <CancelSalesOrderButton orderId={order.id} />
                            )}
                          </div>
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
