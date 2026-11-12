import Link from "next/link";
import {
  BanknoteIcon,
  ClockIcon,
  DownloadIcon,
  MapPinIcon,
  PackageCheckIcon,
  PhoneIcon,
  PrinterIcon,
  ShoppingCartIcon,
  UsersRoundIcon,
} from "lucide-react";
import {
  CancelSalesOrderButton,
  ConfirmSalesOrderButton,
  PaySalesOrderDialog,
} from "@/components/forms/confirm-sales-button";
import { CreateSalesOrderDialog } from "@/components/forms/sales-order-form";
import { EditSalesOrderDialog } from "@/components/forms/edit-sales-order-dialog";
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

  // Chỉ lấy mặt hàng là thành phẩm cho phân hệ bán hàng
  const finishedProducts = inventory.filter((item) => item.type === "thanh_pham");

  const canWrite = CAN_ACCESS.banHangWrite(user.role);
  const isAdmin = user.role === "admin";

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
    <div className="space-y-5 sm:space-y-6 max-w-full overflow-hidden">
      <PageHeader
        title="Quản lý Bán hàng"
        description="Lập đơn hàng bán, tự động xuất kho trừ tồn và ghi nhận công nợ / doanh thu vào sổ quỹ."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/ban-hang/khach-hang">
              <UsersRoundIcon className="h-4 w-4" />
              <span className="hidden xs:inline">Khách hàng</span>
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={exportHref}>
              <DownloadIcon className="h-4 w-4" />
              <span className="hidden xs:inline">Xuất Excel</span>
            </a>
          </Button>
          {canWrite && (
            <CreateSalesOrderDialog
              customers={customers}
              items={finishedProducts}
            />
          )}
        </div>
      </PageHeader>

      <div className="grid gap-3 sm:gap-4 grid-cols-2 xl:grid-cols-4">
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
          label="Đơn chờ xuất kho"
          value={formatNumber(pendingOrders)}
          hint="Cần thủ kho chuẩn bị"
          icon={PackageCheckIcon}
          tone={pendingOrders > 0 ? "amber" : undefined}
        />
      </div>

      <div className="flex gap-2 border-b pb-3 overflow-x-auto no-scrollbar">
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
              className="shrink-0"
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
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">
            Danh sách đơn bán hàng ({orders.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {orders.length === 0 ? (
            <div className="h-28 flex items-center justify-center text-center text-sm text-neutral-500">
              Không có đơn hàng bán nào.
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Cards */}
              <div className="divide-y divide-neutral-200 border-t sm:hidden">
                {orders.map((order) => {
                  const remaining = Math.max(
                    order.total_amount - order.paid_amount,
                    0,
                  );
                  return (
                    <div key={order.id} className="p-4 space-y-3 bg-white">
                      {/* Header card: Code + Badges */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono font-bold text-sm text-neutral-900">
                            {order.code}
                          </span>
                          <span className="text-xs text-neutral-500 ml-2">
                            {formatDate(order.order_date)}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <SalesOrderStatusBadge status={order.status} />
                          <PaymentStatusBadge status={order.payment_status} />
                        </div>
                      </div>

                      {/* Customer info */}
                      <div className="text-xs space-y-1 bg-neutral-50 rounded p-2.5">
                        <div className="font-semibold text-neutral-900 text-sm">
                          {order.customer_name}
                        </div>
                        {order.customer_phone && (
                          <div className="flex items-center gap-1 text-neutral-600">
                            <PhoneIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            <span>{order.customer_phone}</span>
                          </div>
                        )}
                        {order.customer_address && (
                          <div className="flex items-center gap-1 text-neutral-600">
                            <MapPinIcon className="h-3.5 w-3.5 text-neutral-400 shrink-0" />
                            <span className="line-clamp-1">{order.customer_address}</span>
                          </div>
                        )}
                      </div>

                      {/* Items */}
                      <div className="text-xs space-y-1">
                        <span className="text-neutral-500 font-medium">Mặt hàng:</span>
                        <div className="space-y-1 pl-1">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between text-neutral-700">
                              <span>
                                • {item.item_name} ({item.quantity} {item.item_unit})
                              </span>
                              <span className="font-mono text-neutral-600">
                                {formatCurrency(item.quantity * item.unit_price)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Amount & Paid */}
                      <div className="flex items-center justify-between pt-2 border-t text-xs">
                        <div>
                          <span className="text-neutral-500">Đã trả: </span>
                          <span
                            className={
                              order.paid_amount >= order.total_amount
                                ? "text-emerald-700 font-semibold"
                                : "text-neutral-800 font-medium"
                            }
                          >
                            {formatCurrency(order.paid_amount)}
                          </span>
                          {remaining > 0 && (
                            <span className="text-rose-600 ml-1">
                              (nợ {formatCurrency(remaining)})
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-neutral-500">Tổng: </span>
                          <span className="font-bold text-sm text-neutral-900">
                            {formatCurrency(order.total_amount)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-end gap-1.5 pt-2 border-t">
                        <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                          <a
                            href={`/ban-hang/in-phieu/${order.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                            In phiếu xuất
                          </a>
                        </Button>

                        {isAdmin && order.status === "cho_xac_nhan" && (
                          <EditSalesOrderDialog
                            order={order}
                            customers={customers}
                            items={finishedProducts}
                          />
                        )}

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
                    </div>
                  );
                })}
              </div>

              {/* DESKTOP VIEW: Table */}
              <div className="hidden sm:block overflow-x-auto border-t sm:border-y sm:rounded-md sm:border">
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
                      <TableHead className="w-28 text-center">In phiếu</TableHead>
                      <TableHead className="w-48 text-right">Thao tác</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order, idx) => {
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
                          <TableCell className="text-center">
                            <Button asChild size="sm" variant="outline" className="h-8 px-2 text-xs">
                              <a
                                href={`/ban-hang/in-phieu/${order.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                title="In phiếu xuất kho kiêm giao hàng (không hiện giá)"
                              >
                                <PrinterIcon className="h-3.5 w-3.5 mr-1" />
                                In phiếu
                              </a>
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isAdmin && order.status === "cho_xac_nhan" && (
                                <EditSalesOrderDialog
                                  order={order}
                                  customers={customers}
                                  items={finishedProducts}
                                />
                              )}
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
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}