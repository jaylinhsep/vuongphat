import Link from "next/link";
import {
  BanknoteIcon,
  ClockIcon,
  DownloadIcon,
  PackageCheckIcon,
  Settings2Icon,
  TruckIcon,
} from "lucide-react";
import {
  CancelPurchaseOrderButton,
  ConfirmPurchaseOrderButton,
  PayPurchaseOrderDialog,
} from "@/components/forms/confirm-purchase-button";
import { CreatePurchaseOrderDialog } from "@/components/forms/purchase-order-form";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  PaymentStatusBadge,
  PurchaseOrderStatusBadge,
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
import {
  getInventory,
  getPurchaseOrders,
  getSuppliers,
} from "@/lib/queries";
import type { PurchaseOrderStatus } from "@/lib/types";

export default async function MuaHangPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole(CAN_ACCESS.muaHang);
  const params = await searchParams;
  const statusFilter = (params.status ?? "all") as PurchaseOrderStatus | "all";

  const [orders, suppliers, inventory] = await Promise.all([
    getPurchaseOrders(statusFilter),
    getSuppliers(),
    getInventory(),
  ]);

  const canWrite = CAN_ACCESS.muaHangWrite(user.role);

  // Stats calculation
  const allOrders =
    statusFilter === "all" ? orders : await getPurchaseOrders("all");
  const totalAmount = allOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalPaid = allOrders.reduce((sum, o) => sum + o.paid_amount, 0);
  const totalDebt = Math.max(totalAmount - totalPaid, 0);
  const pendingOrders = allOrders.filter(
    (o) => o.status === "cho_nhap_kho",
  ).length;

  const exportHref = `/api/mua-hang/excel${
    statusFilter !== "all" ? `?status=${statusFilter}` : ""
  }`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý Mua hàng"
        description="Lập đơn mua nguyên vật liệu từ nhà cung cấp, duyệt nhập kho cộng tồn và theo dõi thanh toán / công nợ."
      >
        <Button asChild variant="outline" size="sm">
          <Link href="/kho/danh-muc">
            <Settings2Icon /> Nhà cung cấp
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={exportHref}>
            <DownloadIcon /> Xuất Excel
          </a>
        </Button>
        {canWrite && (
          <CreatePurchaseOrderDialog
            suppliers={suppliers}
            items={inventory}
          />
        )}
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng tiền đặt mua"
          value={formatCurrency(totalAmount)}
          hint="Từ toàn bộ đơn mua hàng"
          icon={TruckIcon}
          tone="primary"
        />
        <StatCard
          label="Đã thanh toán NCC"
          value={formatCurrency(totalPaid)}
          hint="Đã ghi sổ quỹ chi"
          icon={BanknoteIcon}
          tone="emerald"
        />
        <StatCard
          label="Công nợ phải trả"
          value={formatCurrency(totalDebt)}
          hint="Còn nợ nhà cung cấp"
          icon={ClockIcon}
          tone={totalDebt > 0 ? "rose" : "emerald"}
        />
        <StatCard
          label="Đơn chờ nhập kho"
          value={formatNumber(pendingOrders)}
          hint="Đang chờ nhà cung cấp giao"
          icon={PackageCheckIcon}
          tone={pendingOrders > 0 ? "amber" : undefined}
        />
      </div>

      <div className="flex gap-2 border-b pb-3">
        {[
          { key: "all", label: "Tất cả đơn" },
          { key: "cho_nhap_kho", label: "Chờ nhập kho" },
          { key: "da_nhap_kho", label: "Đã nhập kho" },
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
                  tab.key === "all" ? "/mua-hang" : `/mua-hang?status=${tab.key}`
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
          <CardTitle>Danh sách đơn mua hàng ({orders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto border-y sm:rounded-md sm:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">STT</TableHead>
                  <TableHead className="w-32 font-mono">Mã đơn</TableHead>
                  <TableHead className="w-28">Ngày đặt</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead>Mặt hàng mua</TableHead>
                  <TableHead className="text-right">Tổng tiền</TableHead>
                  <TableHead className="text-right">Đã trả</TableHead>
                  <TableHead className="w-36 text-center">Trạng thái kho</TableHead>
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
                      Không có đơn mua hàng nào.
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
                            {order.supplier_name}
                          </p>
                          {order.supplier_phone && (
                            <p className="text-xs text-neutral-500">
                              {order.supplier_phone}
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
                          <PurchaseOrderStatusBadge status={order.status} />
                        </TableCell>
                        <TableCell className="text-center">
                          <PaymentStatusBadge status={order.payment_status} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {order.status === "cho_nhap_kho" && (
                              <ConfirmPurchaseOrderButton order={order} />
                            )}
                            {order.status !== "huy" && remaining > 0 && canWrite && (
                              <PayPurchaseOrderDialog order={order} />
                            )}
                            {order.status === "cho_nhap_kho" && canWrite && (
                              <CancelPurchaseOrderButton orderId={order.id} />
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
